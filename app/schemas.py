from __future__ import annotations

import datetime as dt
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str
    role: str


class AthleteCreate(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    birth_date: dt.date | None = None
    gender: str | None = None


class ZoneIn(BaseModel):
    zone: int = Field(ge=1, le=7)
    watt_min: int
    watt_max: int
    hr_min: int
    hr_max: int


class SnapshotIn(BaseModel):
    ref_date: dt.date
    ftp: float | None = None
    cp_2m: float | None = None
    cp_5m: float | None = None
    cp_20m: float | None = None
    vo2max: float | None = None
    p_vo2max: float | None = None
    weight: float | None = None
    height: float | None = None
    lean_mass: float | None = None
    muscle_mass: float | None = None
    zones: list[ZoneIn] | None = None


class GoalIn(BaseModel):
    name: str
    description: str | None = None


class MethodStepIn(BaseModel):
    order_num: int
    reps: int = 1
    duration_sec: int
    zone: int = Field(ge=1, le=7)
    recovery_sec: int = 0
    notes: str | None = None


class MethodIn(BaseModel):
    name: str
    description: str
    goal_ids: list[int] = []
    steps: list[MethodStepIn]


class PlanIn(BaseModel):
    athlete_id: int
    start_date: dt.date
    months: int = Field(gt=0)
    weekly_hours: float
    available_days: list[str]
    race_model: str
    main_goals: list[str]
    preferred_method_ids: list[int] = []
