from __future__ import annotations

import math

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


@app.post("/goals")
def create_goal(payload: GoalIn, db: Session = Depends(get_db)):
    goal = TrainingGoal(**payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"goal_id": goal.id}


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
