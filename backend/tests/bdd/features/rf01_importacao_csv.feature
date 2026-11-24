
# language: pt

Funcionalidade: Importação de arquivos CSV

  Cenário: Importar um arquivo CSV válido
    Dado que o usuário possui um arquivo CSV válido com medições
    Quando importar o arquivo para o sistema
    Então o sistema deve processar o arquivo com sucesso
    E carregar as medições corretamente
