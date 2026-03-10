from __future__ import annotations

import hashlib

from .models import TrainingMethodStep

ZONE_FACTOR = {
    1: 0.5,
    2: 0.65,
    3: 0.8,
    4: 1.0,
    5: 1.15,
    6: 1.3,
    7: 1.5,
}


def compute_stress(steps: list[TrainingMethodStep]) -> float:
    total = 0.0
    for step in steps:
        load_time = step.reps * (step.duration_sec + step.recovery_sec)
        total += (load_time / 60) * ZONE_FACTOR.get(step.zone, 1)
    return round(total, 2)


def week_type(week_num: int) -> str:
    return "deload" if week_num % 4 == 0 else "load"


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()
