from app.models import TrainingMethodStep
from app.services import compute_stress, hash_password, week_type


def test_compute_stress():
    steps = [
        TrainingMethodStep(order_num=1, week_num=1, reps=2, duration_sec=300, zone=4, recovery_sec=120),
        TrainingMethodStep(order_num=2, week_num=2, reps=3, duration_sec=60, zone=6, recovery_sec=0),
    ]
    assert compute_stress(steps) == 17.9


def test_week_type_pattern():
    assert week_type(1) == "load"
    assert week_type(3) == "load"
    assert week_type(4) == "deload"


def test_hash_password_is_deterministic():
    assert hash_password("Password123") == hash_password("Password123")
