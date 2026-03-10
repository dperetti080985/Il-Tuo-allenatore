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
from .services import compute_stress, week_type

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


@app.get("/")
def index():
    index_file = WEB_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {
        "message": "Il Tuo Allenatore API online",
        "docs": "/docs",
        "web": "Interfaccia non disponibile",
    }


@app.get("/api/status")
def root(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {
        "message": "Il Tuo Allenatore API online",
        "docs": "/docs",
        "db_connected": db_ok,
    }


@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.created_at.asc())).all()
    return [{"id": u.id, "username": u.username, "role": u.role.value} for u in users]


@app.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.username == payload.username))
    if existing:
        raise HTTPException(status_code=400, detail="username già esistente")
    user = User(username=payload.username, role=Role(payload.role))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role.value}


@app.get("/athletes")
def list_athletes(db: Session = Depends(get_db)):
    athletes = db.scalars(select(AthleteProfile).options(joinedload(AthleteProfile.user)).order_by(AthleteProfile.id.asc())).all()
    return [
        {
            "id": athlete.id,
            "user_id": athlete.user_id,
            "first_name": athlete.first_name,
            "last_name": athlete.last_name,
            "birth_date": athlete.birth_date,
            "gender": athlete.gender,
            "username": athlete.user.username,
        }
        for athlete in athletes
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


SNAPSHOT_FIELDS = [
    "ftp",
    "cp_2m",
    "cp_5m",
    "cp_20m",
    "vo2max",
    "p_vo2max",
    "weight",
    "height",
    "lean_mass",
    "muscle_mass",
]


@app.post("/athletes/{athlete_id}/snapshots")
def add_snapshot(athlete_id: int, payload: SnapshotIn, db: Session = Depends(get_db)):
    athlete = db.get(AthleteProfile, athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="atleta non trovato")

    previous = db.scalar(
        select(AthleteSnapshot)
        .where(AthleteSnapshot.athlete_id == athlete_id)
        .order_by(AthleteSnapshot.ref_date.desc())
    )

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
        zone_payload = [
            {
                "zone": z.zone,
                "watt_min": z.watt_min,
                "watt_max": z.watt_max,
                "hr_min": z.hr_min,
                "hr_max": z.hr_max,
            }
            for z in previous.zones
        ]
    if zone_payload is None:
        raise HTTPException(status_code=400, detail="servono le zone al primo inserimento")

    for zone in zone_payload:
        data = zone.model_dump() if hasattr(zone, "model_dump") else zone
        db.add(ZoneRange(snapshot_id=snapshot.id, **data))

    db.commit()
    return {"snapshot_id": snapshot.id}


@app.get("/athletes/{athlete_id}/progress/{field_name}")
def get_progress(athlete_id: int, field_name: str, db: Session = Depends(get_db)):
    if field_name not in SNAPSHOT_FIELDS:
        raise HTTPException(status_code=400, detail="campo non supportato")
    snapshots = db.scalars(
        select(AthleteSnapshot)
        .where(AthleteSnapshot.athlete_id == athlete_id)
        .order_by(AthleteSnapshot.ref_date.asc())
    ).all()
    return [{"date": s.ref_date, "value": getattr(s, field_name)} for s in snapshots]


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


@app.get("/methods")
def list_methods(db: Session = Depends(get_db)):
    methods = db.scalars(
        select(TrainingMethod)
        .options(joinedload(TrainingMethod.goals), joinedload(TrainingMethod.steps))
        .order_by(TrainingMethod.name.asc())
    ).unique().all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "stress_score": m.stress_score,
            "goal_ids": [g.id for g in m.goals],
            "steps": [
                {
                    "order_num": s.order_num,
                    "reps": s.reps,
                    "duration_sec": s.duration_sec,
                    "zone": s.zone,
                    "recovery_sec": s.recovery_sec,
                    "notes": s.notes,
                }
                for s in sorted(m.steps, key=lambda step: step.order_num)
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


@app.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    plans = db.scalars(
        select(TrainingPlan)
        .options(joinedload(TrainingPlan.workouts))
        .order_by(TrainingPlan.id.desc())
    ).unique().all()
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
                    "method_id": w.method_id,
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

    methods = db.scalars(select(TrainingMethod).where(TrainingMethod.id.in_(payload.preferred_method_ids))).all()
    for week in range(1, weeks + 1):
        kind = week_type(week)
        for idx, day in enumerate(payload.available_days):
            method = methods[(week + idx) % len(methods)] if methods else None
            if kind == "deload" and idx > 1:
                method = None
            db.add(PlanWorkout(plan_id=plan.id, week_num=week, week_type=kind, day_name=day, method_id=method.id if method else None))

    db.commit()
    return {"plan_id": plan.id, "weeks": weeks}
