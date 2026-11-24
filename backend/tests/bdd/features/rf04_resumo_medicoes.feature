
# language: pt
@RF04
Funcionalidade: Resumo das medições importadas

  Cenário: Consultar resumo das medições
    Dado que existe um arquivo CSV importado com sucesso
    Quando o usuário consultar o resumo das medições
    Então o sistema deve apresentar o período das medições
    E apresentar a quantidade correta de registros
    E apresentar as informações do arquivo importado
