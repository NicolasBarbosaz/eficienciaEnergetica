from pathlib import Path

from pytest_bdd import scenarios, given, when, then, parsers

FEATURE = Path(__file__).parent / "features" / "rf08_graficos_historiso.feature"
scenarios(str(FEATURE))

MESES = {"janeiro": "2026-01", "fevereiro": "2026-02", "março": "2026-03"}


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

@given("que existem medições de janeiro a março com contratada de 80 kW")
def _(cliente, anteve_data_dir):
    assert cliente.put("/configuracao", json=configuracao()).status_code == 200
    linhas = [
        "data_hora,demanda_kw",
        "2026-01-01T00:00:00,60.0",
        "2026-01-02T00:00:00,70.0",
        "2026-01-03T00:00:00,65.0",
        "2026-02-01T00:00:00,75.0",
        "2026-02-02T00:00:00,90.0",
        "2026-02-03T00:00:00,80.0",
        "2026-03-01T00:00:00,80.0",
        "2026-03-02T00:00:00,82.0",
        "2026-03-03T00:00:00,78.0",
    ]
    (anteve_data_dir / "medicoes.csv").write_text("\n".join(linhas), encoding="utf-8")


@when("consultar os picos mensais", target_fixture="picos")
def _(cliente):
    resposta = cliente.get("/analise/picos-mensais")
    assert resposta.status_code == 200
    return resposta.json()


@then(parsers.parse("o pico de {mes_nome} deve ser {pico:d} kW e a situação {situacao}"))
def _(picos, mes_nome, pico, situacao):
    mes = MESES[mes_nome]
    item = next(i for i in picos if i["mes"] == mes)
    assert item["pico_kw"] == pico
    assert item["situacao"] == situacao


# Cenário 2

@given("que existem medições em janeiro e março, sem nenhuma em fevereiro")
def _(cliente, anteve_data_dir):
    assert cliente.put("/configuracao", json=configuracao()).status_code == 200
    linhas = [
        "data_hora,demanda_kw",
        "2026-01-01T00:00:00,60.0",
        "2026-01-02T00:00:00,70.0",
        "2026-03-01T00:00:00,80.0",
        "2026-03-02T00:00:00,82.0",
    ]
    (anteve_data_dir / "medicoes.csv").write_text("\n".join(linhas), encoding="utf-8")


@then(parsers.parse("a lista deve ter {quantidade:d} meses"))
def _(picos, quantidade):
    assert len(picos) == quantidade


@then("o mês de fevereiro deve aparecer como sem_dados")
def _(picos):
    item = next(i for i in picos if i["mes"] == "2026-02")
    assert item["situacao"] == "sem_dados"
    assert item["pico_kw"] is None