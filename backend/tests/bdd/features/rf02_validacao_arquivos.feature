
# language: pt
@RF02
Funcionalidade: Validação dos arquivos CSV

  Cenário: Tentar importar um arquivo vazio
    Dado que o usuário possui um arquivo CSV vazio
    Quando tentar importar o arquivo
    Então o sistema deve rejeitar a importação
    E informar que o arquivo está vazio

  Cenário: Tentar importar um arquivo com formato incorreto
    Dado que o usuário possui um arquivo em formato inválido
    Quando tentar importar o arquivo
    Então o sistema deve rejeitar a importação

  Cenário: Tentar importar um CSV sem colunas obrigatórias
    Dado que o usuário possui um CSV com colunas ausentes
    Quando tentar importar o arquivo
    Então o sistema deve rejeitar a importação
    E informar as colunas inválidas

  Cenário: Tentar importar um CSV com valores inválidos
    Dado que o usuário possui um CSV com valores inválidos
    Quando tentar importar o arquivo
    Então o sistema deve rejeitar os registros inválidos
