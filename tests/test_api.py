import uuid

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import Role, User
from app.services import hash_password


client = TestClient(app)


def test_list_users_endpoint_available():
    response = client.get("/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_user_requires_new_email_and_password():
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "username": f"athlete_{suffix}",
        "email": f"athlete_{suffix}@example.com",
        "password": "Password123",
        "full_name": "Mario Rossi",
        "phone": "+393331234567",
        "role": "athlete",
    }
    response = client.post("/users", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == payload["email"]
    assert body["role"] == "athlete"


def test_index_serves_web_app():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_login_with_default_admin():
    response = client.post("/auth/login", json={"username": "admin", "password": "admin"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "coach"


def test_recover_password_requires_username():
    response = client.post("/auth/recover-password", json={"username": ""})
    assert response.status_code == 400


def test_create_user_with_invalid_role_returns_400():
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "username": f"invalid_role_{suffix}",
        "email": f"invalid_role_{suffix}@example.com",
        "password": "Password123",
        "full_name": "Ruolo Errato",
        "phone": "+393331234567",
        "role": "manager",
    }
    response = client.post("/users", json=payload)
    assert response.status_code == 400


def test_login_default_admin_works_even_with_taken_default_email():
    db = SessionLocal()
    existing_admin = db.query(User).filter(User.username == "admin").first()
    if existing_admin:
        db.delete(existing_admin)
        db.commit()

    conflict_user = db.query(User).filter(User.username != "admin").first()
    if conflict_user is None:
        conflict_user = User(
            username="email_conflict",
            email="coach_conflict@example.com",
            password_hash=hash_password("Password123"),
            full_name="Conflitto Email",
            role=Role.coach,
            is_active=True,
        )
        db.add(conflict_user)
        db.commit()

    if db.query(User).filter(User.email == "admin@iltuoallenatore.local").first() is None:
        conflict_user.email = "admin@iltuoallenatore.local"
        db.commit()
    db.close()

    response = client.post("/auth/login", json={"username": "admin", "password": "admin"})
    assert response.status_code == 200
    assert response.json()["user"]["username"] == "admin"
