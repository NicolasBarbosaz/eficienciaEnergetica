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


# Mostra o cenário antes de executar seus passos
def pytest_bdd_before_scenario(request, feature, scenario):
    print(f"\n{'=' * 60}")
    print(f"CENÁRIO: {scenario.name}")
    print(f"{'=' * 60}")


# Mostra cada passo Dado, Quando, Então e E
def pytest_bdd_before_step(request, feature, scenario, step, step_func):
    print(f"  {step.keyword.strip().upper()} {step.name}")


# Mostra a falha de um passo, caso aconteça
def pytest_bdd_step_error(request, feature, scenario, step, step_func, step_func_args, exception):
    print(f"  ERRO NO PASSO: {step.name}")
    print(f"  MOTIVO: {exception}")
