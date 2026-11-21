
from pathlib import Path

from pytest_bdd import scenarios, given, when, then


FEATURE = Path(__file__).parent / "features" / "rf03_configurar_demanda.feature"

scenarios(str(FEATURE))


# Dados de exemplo utilizados nos cenários
def criar_configuracao():
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


# CENÁRIO 1 - Configurar uma demanda válida

@given("que o gestor deseja configurar a demanda contratada")
def preparar_configuracao():
    pass


@when(
    "cadastrar uma demanda de 80 kW com tolerância de 5%",
    target_fixture="resposta_configuracao",
)
def cadastrar_demanda(cliente):
    configuracao = criar_configuracao()

    return cliente.put("/configuracao", json=configuracao)


@then("o sistema deve calcular o limite de 84 kW")
def verificar_limite(resposta_configuracao):
    assert resposta_configuracao.status_code == 200

    dados = resposta_configuracao.json()
    assert dados["limite_multa_kw"] == 84.0


@then("salvar a configuração com sucesso")
def verificar_salvamento(cliente):
    resposta = cliente.get("/configuracao")

    assert resposta.status_code == 200

    dados = resposta.json()
    assert dados["demanda_contratada_kw"] == 80.0
    assert dados["tolerancia"] == 0.05


# CENÁRIO 2 - Consultar uma configuração cadastrada

@given("que existe uma demanda contratada de 80 kW com tolerância de 5%")
def preparar_demanda_cadastrada(cliente):
    resposta = cliente.put(
        "/configuracao",
        json=criar_configuracao(),
    )

    assert resposta.status_code == 200


@when(
    "consultar a configuração da demanda",
    target_fixture="resposta_consulta",
)
def consultar_demanda(cliente):
    return cliente.get("/configuracao")


@then("o sistema deve retornar a demanda contratada de 80 kW")
def verificar_demanda_consultada(resposta_consulta):
    assert resposta_consulta.status_code == 200

    dados = resposta_consulta.json()
    assert dados["demanda_contratada_kw"] == 80.0


@then("retornar a tolerância de 5%")
def verificar_tolerancia(resposta_consulta):
    dados = resposta_consulta.json()

    assert dados["tolerancia"] == 0.05


# CENÁRIO 3 - Rejeitar uma configuração inválida

@when(
    "cadastrar uma demanda contratada inválida",
    target_fixture="resposta_invalida",
)
def cadastrar_demanda_invalida(cliente):
    configuracao = criar_configuracao()

    # Demanda igual a zero e tarifa negativa são inválidas
    configuracao["demanda_contratada_kw"] = 0
    configuracao["tarifa_demanda_rs_kw"] = -1

    return cliente.put("/configuracao", json=configuracao)


@then("o sistema deve rejeitar a configuração")
def verificar_rejeicao(resposta_invalida):
    assert resposta_invalida.status_code == 422


@then("informar que os dados são inválidos")
def verificar_mensagem_erro(resposta_invalida):
    detalhes = resposta_invalida.json()["detail"]

    assert isinstance(detalhes, list)

    campos = [item["campo"] for item in detalhes]

    assert "demanda_contratada_kw" in campos
    assert "tarifa_demanda_rs_kw" in campos

    for item in detalhes:
        assert item["mensagem"]
