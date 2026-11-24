
from pathlib import Path

from pytest_bdd import scenarios, given, when, then


FEATURE = Path(__file__).parent / "features" / "rf06_ultrapassagem_demanda.feature"

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


# CENÁRIO 1 - Identificar meses com ultrapassagem

@given("que existem medições e uma demanda contratada configurada")
def preparar_dados(cliente):
    resposta = cliente.put(
        "/configuracao",
        json=configuracao_exemplo(),
    )
    assert resposta.status_code == 200

    resposta = cliente.post("/medicoes/exemplo")
    assert resposta.status_code == 200


@when(
    "consultar os picos mensais de demanda",
    target_fixture="resposta_picos",
)
def consultar_picos(cliente):
    return cliente.get("/analise/picos-mensais")


@then("o sistema deve retornar os picos mensais")
def verificar_retorno(resposta_picos):
    assert resposta_picos.status_code == 200

    dados = resposta_picos.json()
    assert len(dados) == 24


@then("identificar meses com multa por ultrapassagem")
def verificar_ultrapassagens(resposta_picos):
    dados = resposta_picos.json()

    meses_com_multa = [
        mes for mes in dados
        if mes["situacao"] == "multa"
    ]

    assert len(meses_com_multa) == 8

    for mes in meses_com_multa:
        assert mes["pico_kw"] > 84.0


# CENÁRIO 2 - Identificar meses dentro do limite

@then("o sistema deve identificar meses dentro do limite")
def verificar_meses_dentro(resposta_picos):
    assert resposta_picos.status_code == 200

    dados = resposta_picos.json()

    meses_dentro = [
        mes for mes in dados
        if mes["situacao"] == "dentro"
    ]

    assert len(meses_dentro) > 0

    for mes in meses_dentro:
        assert mes["pico_kw"] <= 80.0


# CENÁRIO 3 - Consultar ultrapassagens sem medições

@given("que existe uma demanda configurada sem medições")
def preparar_sem_medicoes(cliente):
    resposta = cliente.put(
        "/configuracao",
        json=configuracao_exemplo(),
    )
    assert resposta.status_code == 200


@then("o sistema deve informar a ausência de medições")
def verificar_sem_medicoes(resposta_picos):
    assert resposta_picos.status_code == 404

    dados = resposta_picos.json()
    assert dados["detail"] == "Nenhuma memória de massa enviada"
