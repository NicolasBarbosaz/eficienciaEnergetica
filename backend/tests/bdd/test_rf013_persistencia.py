

from pathlib import Path

from fastapi.testclient import TestClient
from pytest_bdd import scenarios, given, when, then

from app.main import app

FEATURE = Path(__file__).parent / "features" / "rf_013_persistencia_dos_dados.feature"
scenarios(str(FEATURE))


def configuracao():
    return {
        "empresa": {"razao_social": "Empresa X", "cidade_uf": "Recife/PE", "modalidade": "verde"},
        "demanda_contratada_kw": 80.0,
        "tolerancia": 0.05,
        "tarifa_demanda_rs_kw": 12.89,
        "ponta_inicio": "17:30",
        "ponta_fim": "20:30",
        "fonte_dados": "memoria_massa",
        "margem_seguranca_kw": 1.0,
    }


# Cenário 1

@given("que a configuração foi salva com demanda de 80 kW")
def _(cliente):
    resposta = cliente.put("/configuracao", json=configuracao())
    assert resposta.status_code == 200


@when("a API for reiniciada", target_fixture="cliente_novo")
def _(anteve_data_dir):
    return TestClient(app)


@then("a configuração consultada deve ter demanda de 80 kW")
def _(cliente_novo):
    resposta = cliente_novo.get("/configuracao")
    assert resposta.status_code == 200
    assert resposta.json()["demanda_contratada_kw"] == 80.0


# Cenário 2

@given("que nenhuma configuração foi salva")
def _(anteve_data_dir):
    pass


@when("consultar a configuração", target_fixture="resposta_consulta")
def _(cliente):
    return cliente.get("/configuracao")


@then("o sistema deve informar que não existe configuração")
def _(resposta_consulta):
    assert resposta_consulta.status_code == 404