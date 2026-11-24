from pathlib import Path

from pytest_bdd import scenarios, given, when, then, parsers

FEATURE = Path(__file__).parent / "features" / "rf012_dashboards.feature"
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


@when("consultar o resumo do painel", target_fixture="resumo")
def _(cliente):
    resposta = cliente.get("/analise/resumo")
    assert resposta.status_code == 200
    return resposta.json()


@then(parsers.parse("o limite de multa deve ser {limite:d} kW"))
def _(resumo, limite):
    assert resumo["limite_multa_kw"] == limite


@then(parsers.parse("o painel deve mostrar {quantidade:d} mês com multa"))
def _(resumo, quantidade):
    assert resumo["meses_com_multa"] == quantidade


@then(parsers.parse("o maior pico deve ser {pico:d} kW em {mes_nome}"))
def _(resumo, pico, mes_nome):
    maior = resumo["maior_pico"]
    assert maior["pico_kw"] == pico
    assert maior["mes"] == MESES[mes_nome]