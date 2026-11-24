
from pytest_bdd import scenarios, given, when, then

scenarios("features/rf04_resumo_medicoes.feature")


@given("que existe um arquivo CSV importado com sucesso")
def arquivo_importado():
    # TODO: preparar/importar um CSV de teste
    pass


@when("o usuário consultar o resumo das medições")
def consultar_resumo():
    # TODO: chamar a funcionalidade de resumo
    pass


@then("o sistema deve apresentar o período das medições")
def verificar_periodo():
    # TODO: conferir data inicial e final
    pass


@then("apresentar a quantidade correta de registros")
def verificar_quantidade():
    # TODO: comparar quantidade retornada com quantidade esperada
    pass


@then("apresentar as informações do arquivo importado")
def verificar_informacoes():
    # TODO: conferir os metadados do arquivo
    pass
