from __future__ import annotations

import math
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload

from .database import Base, SessionLocal, engine
from .models import (
    AthleteProfile,
    AthleteSnapshot,
    PlanWorkout,
    Role,
    TrainingGoal,
    TrainingMethod,
    TrainingMethodStep,
    TrainingPlan,
    User,
    ZoneRange,
)
from .schemas import AthleteCreate, GoalIn, MethodIn, PlanIn, SnapshotIn, UserCreate
from .services import compute_stress, hash_password, week_type

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Il Tuo Allenatore API")

WEB_DIR = Path(__file__).parent / "web"
if WEB_DIR.exists():
    app.mount("/web", StaticFiles(directory=WEB_DIR), name="web")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def format_user(u: User):
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "phone": u.phone,
        "role": u.role.value,
        "is_active": u.is_active,
    }


@app.get("/")
def index():
    index_file = WEB_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Il Tuo Allenatore API online", "docs": "/docs", "web": "Interfaccia non disponibile"}


@app.get("/api/status")
def root(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {"message": "Il Tuo Allenatore API online", "docs": "/docs", "db_connected": db_ok}


@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.created_at.asc())).all()
    return [format_user(u) for u in users]


@app.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(status_code=400, detail="username già esistente")
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=400, detail="email già esistente")

    user = User(
        username=payload.username,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=Role(payload.role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return format_user(user)


@app.put("/users/{user_id}")
def update_user(user_id: int, payload: UserCreate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user non trovato")
    if db.scalar(select(User).where(User.username == payload.username, User.id != user_id)):
        raise HTTPException(status_code=400, detail="username già esistente")
    if db.scalar(select(User).where(User.email == payload.email.lower(), User.id != user_id)):
        raise HTTPException(status_code=400, detail="email già esistente")

    user.username = payload.username
    user.email = payload.email.lower()
    user.password_hash = hash_password(payload.password)
    user.full_name = payload.full_name
    user.phone = payload.phone
    user.role = Role(payload.role)
    db.commit()
    return format_user(user)


@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user non trovato")
    db.delete(user)
    db.commit()
    return {"deleted": True}


@app.get("/athletes")
def list_athletes(db: Session = Depends(get_db)):
    athletes = db.scalars(select(AthleteProfile).options(joinedload(AthleteProfile.user)).order_by(AthleteProfile.id.asc())).all()
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "first_name": a.first_name,
            "last_name": a.last_name,
            "birth_date": a.birth_date,
            "gender": a.gender,
            "username": a.user.username,
            "email": a.user.email,
        }
        for a in athletes
    ]


@app.post("/athletes")
def create_athlete(payload: AthleteCreate, db: Session = Depends(get_db)):
    user = db.get(User, payload.user_id)
    if not user or user.role != Role.athlete:
        raise HTTPException(status_code=400, detail="user atleta non valido")
    athlete = AthleteProfile(**payload.model_dump())
    db.add(athlete)
    db.commit()
    db.refresh(athlete)
    return {"athlete_id": athlete.id}


@app.put("/athletes/{athlete_id}")
def update_athlete(athlete_id: int, payload: AthleteCreate, db: Session = Depends(get_db)):
    athlete = db.get(AthleteProfile, athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="atleta non trovato")
    user = db.get(User, payload.user_id)
    if not user or user.role != Role.athlete:
        raise HTTPException(status_code=400, detail="user atleta non valido")
    for key, value in payload.model_dump().items():
        setattr(athlete, key, value)
    db.commit()
    return {"athlete_id": athlete.id}


@app.delete("/athletes/{athlete_id}")
def delete_athlete(athlete_id: int, db: Session = Depends(get_db)):
    athlete = db.get(AthleteProfile, athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="atleta non trovato")
    db.delete(athlete)
    db.commit()
    return {"deleted": True}


SNAPSHOT_FIELDS = ["ftp", "cp_2m", "cp_5m", "cp_20m", "vo2max", "p_vo2max", "weight", "height", "lean_mass", "muscle_mass"]


@app.post("/athletes/{athlete_id}/snapshots")
def add_snapshot(athlete_id: int, payload: SnapshotIn, db: Session = Depends(get_db)):
    athlete = db.get(AthleteProfile, athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="atleta non trovato")

    previous = db.scalar(select(AthleteSnapshot).where(AthleteSnapshot.athlete_id == athlete_id).order_by(AthleteSnapshot.ref_date.desc()))
    values = payload.model_dump(exclude={"zones"})
    for field in SNAPSHOT_FIELDS:
        if values[field] is None:
            if previous is None:
                raise HTTPException(status_code=400, detail=f"campo obbligatorio al primo inserimento: {field}")
            values[field] = getattr(previous, field)

    snapshot = AthleteSnapshot(athlete_id=athlete_id, **values)
    db.add(snapshot)
    db.flush()

    zone_payload = payload.zones
    if zone_payload is None and previous:
        zone_payload = [{"zone": z.zone, "watt_min": z.watt_min, "watt_max": z.watt_max, "hr_min": z.hr_min, "hr_max": z.hr_max} for z in previous.zones]
    if zone_payload is None:
        raise HTTPException(status_code=400, detail="servono le zone al primo inserimento")

    for zone in zone_payload:
        data = zone.model_dump() if hasattr(zone, "model_dump") else zone
        db.add(ZoneRange(snapshot_id=snapshot.id, **data))

    db.commit()
    return {"snapshot_id": snapshot.id}


@app.get("/athletes/{athlete_id}/snapshots")
def list_snapshots(athlete_id: int, db: Session = Depends(get_db)):
    snapshots = db.scalars(select(AthleteSnapshot).options(joinedload(AthleteSnapshot.zones)).where(AthleteSnapshot.athlete_id == athlete_id).order_by(AthleteSnapshot.ref_date.desc())).unique().all()
    return [
        {
            "id": s.id,
            "athlete_id": s.athlete_id,
            "ref_date": s.ref_date,
            **{field: getattr(s, field) for field in SNAPSHOT_FIELDS},
            "zones": [
                {"zone": z.zone, "watt_min": z.watt_min, "watt_max": z.watt_max, "hr_min": z.hr_min, "hr_max": z.hr_max}
                for z in sorted(s.zones, key=lambda item: item.zone)
            ],
        }
        for s in snapshots
    ]


@app.get("/athletes/{athlete_id}/dashboard")
def athlete_dashboard(athlete_id: int, db: Session = Depends(get_db)):
    athlete = db.scalar(select(AthleteProfile).options(joinedload(AthleteProfile.user)).where(AthleteProfile.id == athlete_id))
    if not athlete:
        raise HTTPException(status_code=404, detail="atleta non trovato")
    snapshots = list_snapshots(athlete_id, db)
    plans = [p for p in list_plans(db) if p["athlete_id"] == athlete_id]
    return {
        "athlete": {
            "id": athlete.id,
            "name": f"{athlete.first_name} {athlete.last_name}",
            "email": athlete.user.email,
            "birth_date": athlete.birth_date,
        },
        "snapshots": snapshots,
        "plans": plans,
    }


@app.delete("/snapshots/{snapshot_id}")
def delete_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    snapshot = db.get(AthleteSnapshot, snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="snapshot non trovato")
    db.delete(snapshot)
    db.commit()
    return {"deleted": True}


@app.get("/goals")
def list_goals(db: Session = Depends(get_db)):
    goals = db.scalars(select(TrainingGoal).order_by(TrainingGoal.name.asc())).all()
    return [{"id": g.id, "name": g.name, "description": g.description} for g in goals]


@app.post("/goals")
def create_goal(payload: GoalIn, db: Session = Depends(get_db)):
    goal = TrainingGoal(**payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"goal_id": goal.id}


@app.put("/goals/{goal_id}")
def update_goal(goal_id: int, payload: GoalIn, db: Session = Depends(get_db)):
    goal = db.get(TrainingGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="goal non trovato")
    goal.name = payload.name
    goal.description = payload.description
    db.commit()
    return {"goal_id": goal.id}


@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.get(TrainingGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="goal non trovato")
    db.delete(goal)
    db.commit()
    return {"deleted": True}


@app.get("/methods")
def list_methods(db: Session = Depends(get_db)):
    methods = db.scalars(select(TrainingMethod).options(joinedload(TrainingMethod.goals), joinedload(TrainingMethod.steps)).order_by(TrainingMethod.name.asc())).unique().all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "stress_score": m.stress_score,
            "goal_ids": [g.id for g in m.goals],
            "steps": [
                {
                    "id": s.id,
                    "week_num": s.week_num,
                    "order_num": s.order_num,
                    "reps": s.reps,
                    "duration_sec": s.duration_sec,
                    "zone": s.zone,
                    "recovery_sec": s.recovery_sec,
                    "notes": s.notes,
                }
                for s in sorted(m.steps, key=lambda step: (step.week_num, step.order_num))
            ],
        }
        for m in methods
    ]


@app.post("/methods")
def create_method(payload: MethodIn, db: Session = Depends(get_db)):
    goals = db.scalars(select(TrainingGoal).where(TrainingGoal.id.in_(payload.goal_ids))).all() if payload.goal_ids else []
    method = TrainingMethod(name=payload.name, description=payload.description, goals=goals)
    db.add(method)
    db.flush()

    steps = []
    for step in payload.steps:
        record = TrainingMethodStep(method_id=method.id, **step.model_dump())
        db.add(record)
        steps.append(record)

    method.stress_score = compute_stress(steps)
    db.commit()
    db.refresh(method)
    return {"method_id": method.id, "stress_score": method.stress_score}


@app.put("/methods/{method_id}")
def update_method(method_id: int, payload: MethodIn, db: Session = Depends(get_db)):
    method = db.scalar(select(TrainingMethod).options(joinedload(TrainingMethod.steps)).where(TrainingMethod.id == method_id))
    if not method:
        raise HTTPException(status_code=404, detail="metodo non trovato")
    goals = db.scalars(select(TrainingGoal).where(TrainingGoal.id.in_(payload.goal_ids))).all() if payload.goal_ids else []

    method.name = payload.name
    method.description = payload.description
    method.goals = goals
    for step in list(method.steps):
        db.delete(step)
    db.flush()

    steps = []
    for step in payload.steps:
        record = TrainingMethodStep(method_id=method.id, **step.model_dump())
        db.add(record)
        steps.append(record)
    method.stress_score = compute_stress(steps)
    db.commit()
    return {"method_id": method.id, "stress_score": method.stress_score}


@app.delete("/methods/{method_id}")
def delete_method(method_id: int, db: Session = Depends(get_db)):
    method = db.get(TrainingMethod, method_id)
    if not method:
        raise HTTPException(status_code=404, detail="metodo non trovato")
    db.delete(method)
    db.commit()
    return {"deleted": True}


@app.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    plans = db.scalars(select(TrainingPlan).options(joinedload(TrainingPlan.workouts)).order_by(TrainingPlan.id.desc())).unique().all()
    return [
        {
            "id": p.id,
            "athlete_id": p.athlete_id,
            "start_date": p.start_date,
            "weeks": p.weeks,
            "weekly_hours": p.weekly_hours,
            "available_days": p.available_days,
            "race_model": p.race_model,
            "main_goals": p.main_goals,
            "workouts": [
                {
                    "week_num": w.week_num,
                    "week_type": w.week_type,
                    "day_name": w.day_name,
                    "day_goal": w.day_goal,
                    "planned_hours": w.planned_hours,
                    "method_ids": w.method_ids,
                }
                for w in sorted(p.workouts, key=lambda workout: (workout.week_num, workout.day_name))
            ],
        }
        for p in plans
    ]


@app.post("/plans")
def create_plan(payload: PlanIn, db: Session = Depends(get_db)):
    weeks = max(1, math.ceil(payload.months * 4.345))
    plan = TrainingPlan(
        athlete_id=payload.athlete_id,
        start_date=payload.start_date,
        weeks=weeks,
        weekly_hours=payload.weekly_hours,
        available_days=payload.available_days,
        race_model=payload.race_model,
        main_goals=payload.main_goals,
    )
    db.add(plan)
    db.flush()

    for week in range(1, weeks + 1):
        kind = week_type(week)
        for day in payload.available_days:
            template = next((d for d in payload.day_templates if d.day_name == day), None)
            selected_methods = template.selected_method_ids if template else []
            planned_hours = template.planned_hours if template else round(payload.weekly_hours / max(len(payload.available_days), 1), 2)
            if kind == "deload":
                planned_hours = round(planned_hours * 0.7, 2)
            db.add(
                PlanWorkout(
                    plan_id=plan.id,
                    week_num=week,
                    week_type=kind,
                    day_name=day,
                    day_goal=template.day_goal if template else None,
                    planned_hours=planned_hours,
                    method_ids=selected_methods,
                )
            )

    db.commit()
    return {"plan_id": plan.id, "weeks": weeks}


@app.delete("/plans/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(TrainingPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="piano non trovato")
    db.delete(plan)
    db.commit()
    return {"deleted": True}
