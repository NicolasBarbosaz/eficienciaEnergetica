
from pathlib import Path

from pytest_bdd import scenarios, given, when, then


FEATURE = Path(__file__).parent / "features" / "rf05_indicadores_energeticos.feature"

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


# CENÁRIO 1 - Consultar indicadores com dados disponíveis

@given("que existem medições energéticas e uma configuração cadastrada")
def preparar_dados(cliente):
    resposta = cliente.put(
        "/configuracao",
        json=configuracao_exemplo(),
    )
    assert resposta.status_code == 200

    resposta = cliente.post("/medicoes/exemplo")
    assert resposta.status_code == 200


@when(
    "consultar o resumo dos indicadores energéticos",
    target_fixture="resposta_indicadores",
)
def consultar_indicadores(cliente):
    return cliente.get("/analise/resumo")


@then("o sistema deve retornar os indicadores com sucesso")
def verificar_sucesso(resposta_indicadores):
    assert resposta_indicadores.status_code == 200


@then("informar 24 meses no histórico e 21 meses com dados")
def verificar_historico(resposta_indicadores):
    dados = resposta_indicadores.json()

    assert dados["meses_no_arquivo"] == 24
    assert dados["meses_com_dados"] == 21


# CENÁRIO 2 - Verificar os indicadores de demanda

@then("o sistema deve informar demanda contratada de 80 kW")
def verificar_demanda(resposta_indicadores):
    assert resposta_indicadores.status_code == 200

    dados = resposta_indicadores.json()
    assert dados["contratada_kw"] == 80.0


@then("informar limite de ultrapassagem de 84 kW")
def verificar_limite(resposta_indicadores):
    dados = resposta_indicadores.json()

    assert dados["limite_multa_kw"] == 84.0


# CENÁRIO 3 - Consultar indicadores sem medições

@given("que existe uma configuração sem medições cadastradas")
def preparar_sem_medicoes(cliente):
    resposta = cliente.put(
        "/configuracao",
        json=configuracao_exemplo(),
    )
    assert resposta.status_code == 200


@then("o sistema deve informar que não existem medições")
def verificar_sem_medicoes(resposta_indicadores):
    assert resposta_indicadores.status_code == 404

    dados = resposta_indicadores.json()
    assert dados["detail"] == "Nenhuma memória de massa enviada"
