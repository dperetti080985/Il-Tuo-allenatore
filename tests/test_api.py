import uuid

from fastapi.testclient import TestClient

from app.main import app


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
