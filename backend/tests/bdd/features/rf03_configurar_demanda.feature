
# language: pt

@RF03
Funcionalidade: RF03 - Configurar demanda contratada
  Como gestor de uma empresa
  Quero configurar a demanda contratada e a tolerância
  Para acompanhar os limites de demanda de energia

  Cenário: Configurar uma demanda contratada válida
    Dado que o gestor deseja configurar a demanda contratada
    Quando cadastrar uma demanda de 80 kW com tolerância de 5%
    Então o sistema deve calcular o limite de 84 kW
    E salvar a configuração com sucesso

  Cenário: Consultar configuração cadastrada
    Dado que existe uma demanda contratada de 80 kW com tolerância de 5%
    Quando consultar a configuração da demanda
    Então o sistema deve retornar a demanda contratada de 80 kW
    E retornar a tolerância de 5%

  Cenário: Tentar configurar uma demanda inválida
    Dado que o gestor deseja configurar a demanda contratada
    Quando cadastrar uma demanda contratada inválida
    Então o sistema deve rejeitar a configuração
    E informar que os dados são inválidos
