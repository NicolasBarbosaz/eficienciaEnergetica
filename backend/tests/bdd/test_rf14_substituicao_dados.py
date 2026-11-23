
from pytest_bdd import scenarios, given, when, then

scenarios("features/rf14_substituicao_dados.feature")


@given("que existem medições cadastradas para o primeiro prédio")
def cadastrar_primeiro_predio():
    # TODO: importar dados do primeiro prédio
    pass


@when("importar os dados de um segundo prédio")
def importar_segundo_predio():
    # TODO: importar dados do segundo prédio
    pass


@then("o sistema deve substituir os dados anteriores")
def verificar_substituicao():
    # TODO: verificar se os dados anteriores foram substituídos
    pass


@then("manter somente as medições do segundo prédio")
def verificar_dados_segundo_predio():
    # TODO: verificar quantidade e conteúdo dos registros
    pass
