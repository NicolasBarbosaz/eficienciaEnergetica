import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def anteve_data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("ANTEVE_DATA_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture
def cliente(anteve_data_dir):
    from app.main import app
    return TestClient(app)
