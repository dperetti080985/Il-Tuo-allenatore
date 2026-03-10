from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_list_users_endpoint_available():
    response = client.get("/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_index_serves_web_app():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
