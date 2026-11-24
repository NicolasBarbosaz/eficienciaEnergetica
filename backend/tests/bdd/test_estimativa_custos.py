
from pathlib import Path

from pytest_bdd import scenarios, given, when, then


FEATURE = Path(__file__).parent / "features" / "rf07_estimativa_custos.feature"

scenarios(str(FEATURE))


# DADOS DE EXEMPLO UTILIZADOS NOS CENÁRIOS

def configuracao_exemplo():
    return {
        "empresa": {
            "razao_social": "Distribuidora Exemplo Ltda.",
            "cidade_uf": "Recife/PE",
            "modalidade": "verde",
        },
        "demanda_contratada_kw": 80.0,
        "tolerancia": 0.05,
        "tarifa_demanda_rs_kw": 12.89,
        "ponta_inicio": "17:30",
        "ponta_fim": "20:30",
        "fonte_dados": "memoria_massa",
        "margem_seguranca_kw": 1.0,
    }


# CENÁRIO 1 - Consultar o custo total das ultrapassagens

@given("que existem medições e uma configuração para calcular custos")
def preparar_dados(cliente):
    resposta = cliente.put(
        "/configuracao",
        json=configuracao_exemplo(),
    )
    assert resposta.status_code == 200

    resposta = cliente.post("/medicoes/exemplo")
    assert resposta.status_code == 200


@when(
    "consultar o resumo dos custos de demanda",
    target_fixture="resposta_resumo",
)
def consultar_resumo(cliente):
    return cliente.get("/analise/resumo")


@then("o sistema deve retornar o resumo financeiro")
def verificar_resumo(resposta_resumo):
    assert resposta_resumo.status_code == 200

    dados = resposta_resumo.json()

    assert dados["tarifa_rs_kw"] == 12.89
    assert dados["custo_demanda_rs"] == 26894.99


@then("informar custo total de ultrapassagem de 3402,96 reais")
def verificar_custo_total(resposta_resumo):
    dados = resposta_resumo.json()

    assert dados["ultrapassagem_total_rs"] == 3402.96
    assert dados["meses_com_multa"] == 8


# CENÁRIO 2 - Consultar os custos mensais das ultrapassagens

@when(
    "consultar os custos mensais da demanda",
    target_fixture="resposta_mensal",
)
def consultar_custos_mensais(cliente):
    return cliente.get("/analise/picos-mensais")


@then("os meses com multa devem apresentar custo de ultrapassagem positivo")
def verificar_custos_com_multa(resposta_mensal):
    assert resposta_mensal.status_code == 200

    dados = resposta_mensal.json()

    meses_com_multa = [
        mes for mes in dados
        if mes["situacao"] == "multa"
    ]

    assert len(meses_com_multa) == 8

    for mes in meses_com_multa:
        assert mes["ultrapassagem_rs"] > 0


@then("os meses sem multa devem apresentar custo de ultrapassagem igual a zero")
def verificar_custos_sem_multa(resposta_mensal):
    dados = resposta_mensal.json()

    meses_sem_multa = [
        mes for mes in dados
        if mes["situacao"] in ("dentro", "acima_contratado")
    ]

    assert len(meses_sem_multa) > 0

    for mes in meses_sem_multa:
        assert mes["ultrapassagem_rs"] == 0.0


# CENÁRIO 3 - Consultar custos sem medições

@given("que existe uma configuração para calcular custos sem medições")
def preparar_sem_medicoes(cliente):
    resposta = cliente.put(
        "/configuracao",
        json=configuracao_exemplo(),
    )
    assert resposta.status_code == 200


@then("o sistema deve informar que não existem medições para calcular custos")
def verificar_sem_medicoes(resposta_resumo):
    assert resposta_resumo.status_code == 404

    dados = resposta_resumo.json()

    assert dados["detail"] == "Nenhuma memória de massa enviada"

@then('retornar o código HTTP 404')
def verificar_codigo_sem_medicoes(resposta_resumo):
    assert resposta_resumo.status_code == 404
