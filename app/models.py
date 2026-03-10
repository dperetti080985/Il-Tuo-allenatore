from __future__ import annotations

import datetime as dt
from enum import Enum

from sqlalchemy import JSON, Date, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Role(str, Enum):
    coach = "coach"
    athlete = "athlete"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    role: Mapped[Role] = mapped_column(SAEnum(Role), index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    athlete_profile: Mapped[AthleteProfile | None] = relationship(back_populates="user", uselist=False)


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    birth_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)

    user: Mapped[User] = relationship(back_populates="athlete_profile")
    snapshots: Mapped[list[AthleteSnapshot]] = relationship(back_populates="athlete", cascade="all, delete-orphan")


class AthleteSnapshot(Base):
    __tablename__ = "athlete_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    athlete_id: Mapped[int] = mapped_column(ForeignKey("athlete_profiles.id"), index=True)
    ref_date: Mapped[dt.date] = mapped_column(Date, index=True)

    ftp: Mapped[float] = mapped_column(Float)
    cp_2m: Mapped[float] = mapped_column(Float)
    cp_5m: Mapped[float] = mapped_column(Float)
    cp_20m: Mapped[float] = mapped_column(Float)
    vo2max: Mapped[float] = mapped_column(Float)
    p_vo2max: Mapped[float] = mapped_column(Float)

    weight: Mapped[float] = mapped_column(Float)
    height: Mapped[float] = mapped_column(Float)
    lean_mass: Mapped[float] = mapped_column(Float)
    muscle_mass: Mapped[float] = mapped_column(Float)

    athlete: Mapped[AthleteProfile] = relationship(back_populates="snapshots")
    zones: Mapped[list[ZoneRange]] = relationship(back_populates="snapshot", cascade="all, delete-orphan")


class ZoneRange(Base):
    __tablename__ = "zone_ranges"

    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("athlete_snapshots.id"), index=True)
    zone: Mapped[int] = mapped_column(Integer)
    watt_min: Mapped[int] = mapped_column(Integer)
    watt_max: Mapped[int] = mapped_column(Integer)
    hr_min: Mapped[int] = mapped_column(Integer)
    hr_max: Mapped[int] = mapped_column(Integer)

    snapshot: Mapped[AthleteSnapshot] = relationship(back_populates="zones")


class TrainingGoal(Base):
    __tablename__ = "training_goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class TrainingMethodGoal(Base):
    __tablename__ = "training_method_goals"

    method_id: Mapped[int] = mapped_column(ForeignKey("training_methods.id"), primary_key=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("training_goals.id"), primary_key=True)


class TrainingMethod(Base):
    __tablename__ = "training_methods"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    description: Mapped[str] = mapped_column(Text)
    stress_score: Mapped[float] = mapped_column(Float, default=0)

    goals: Mapped[list[TrainingGoal]] = relationship(secondary="training_method_goals")
    steps: Mapped[list[TrainingMethodStep]] = relationship(back_populates="method", cascade="all, delete-orphan")


class TrainingMethodStep(Base):
    __tablename__ = "training_method_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    method_id: Mapped[int] = mapped_column(ForeignKey("training_methods.id"), index=True)
    order_num: Mapped[int] = mapped_column(Integer)
    reps: Mapped[int] = mapped_column(Integer, default=1)
    duration_sec: Mapped[int] = mapped_column(Integer)
    zone: Mapped[int] = mapped_column(Integer)
    recovery_sec: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    method: Mapped[TrainingMethod] = relationship(back_populates="steps")


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    athlete_id: Mapped[int] = mapped_column(ForeignKey("athlete_profiles.id"), index=True)
    start_date: Mapped[dt.date] = mapped_column(Date)
    weeks: Mapped[int] = mapped_column(Integer)
    weekly_hours: Mapped[float] = mapped_column(Float)
    available_days: Mapped[list[str]] = mapped_column(JSON)
    race_model: Mapped[str] = mapped_column(Text)
    main_goals: Mapped[list[str]] = mapped_column(JSON)

    workouts: Mapped[list[PlanWorkout]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class PlanWorkout(Base):
    __tablename__ = "plan_workouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("training_plans.id"), index=True)
    week_num: Mapped[int] = mapped_column(Integer)
    week_type: Mapped[str] = mapped_column(String(20))
    day_name: Mapped[str] = mapped_column(String(20))
    method_id: Mapped[int | None] = mapped_column(ForeignKey("training_methods.id"), nullable=True)

    plan: Mapped[TrainingPlan] = relationship(back_populates="workouts")
