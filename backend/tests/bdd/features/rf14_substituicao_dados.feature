
# language: pt

Funcionalidade: Substituição dos dados importados

  Cenário: Substituir os dados de um prédio por outro
    Dado que existem medições cadastradas para o primeiro prédio
    Quando importar os dados de um segundo prédio
    Então o sistema deve substituir os dados anteriores
    E manter somente as medições do segundo prédio
