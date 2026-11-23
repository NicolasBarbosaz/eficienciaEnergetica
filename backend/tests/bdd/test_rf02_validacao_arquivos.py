
import pytest
from pytest_bdd import scenarios, given, when, then

scenarios("features/rf02_validacao_arquivos.feature")


@pytest.fixture
def contexto():
    return {}


@given("que o usuário possui um arquivo CSV vazio")
def arquivo_vazio(contexto):
    contexto["arquivo"] = b""


@given("que o usuário possui um arquivo em formato inválido")
def formato_invalido(contexto):
    contexto["arquivo"] = b"conteudo que nao e CSV"


@given("que o usuário possui um CSV com colunas ausentes")
def colunas_ausentes(contexto):
    contexto["arquivo"] = b"data,temperatura\n2026-01-01,25"


@given("que o usuário possui um CSV com valores inválidos")
def valores_invalidos(contexto):
    contexto["arquivo"] = b"data,consumo\n2026-01-01,abc"


@when("tentar importar o arquivo")
def tentar_importar(contexto):
    # TODO: chamar a função ou endpoint real de importação
    pass


@then("o sistema deve rejeitar a importação")
def verificar_rejeicao(contexto):
    # TODO: verificar a resposta de erro
    pass


@then("informar que o arquivo está vazio")
def verificar_arquivo_vazio(contexto):
    # TODO: verificar a mensagem de validação
    pass


@then("informar as colunas inválidas")
def verificar_colunas(contexto):
    # TODO: verificar quais colunas estão ausentes
    pass


@then("rejeitar os registros inválidos")
def verificar_registros(contexto):
    # TODO: verificar a rejeição dos valores inválidos
    pass

@then("o sistema deve rejeitar os registros inválidos")
def verificar_registros():
    pass