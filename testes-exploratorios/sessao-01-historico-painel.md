# Sessão 1: Histórico e Painel

- Data: 22/11/2026
- Missão: comparar painel e histórico com a resposta da API (valor, mês, cor, unidade, texto)
- Duração: 30 min
- Dados: contrato 80 kW, tolerância 5%, tarifa 12,89, arquivo de exemplo (Bobcat)

## O que testei
- [ ] Histórico: passei o mouse nas barras e comparei com /analise/picos-mensais
- [ ] Meses sem dados (abr a jun/2016)
- [ ] Cards do painel contra o gabarito (8 meses com multa, R$ 3.402,96, 87 kW)
- [ ] F5, botão voltar, cliques repetidos, janela pequena
- [ ] Sem contrato / sem medições / API parada

## Achados
### 1. Página 404 em inglês e sem navegação
- Tela: qualquer rota inexistente (ex.: /configuracoes/painel)
- O que fiz: digitei um endereço que não existe
- O que esperava: mensagem em português e um jeito de voltar ao painel
- O que aconteceu: tela preta com "404 This page could not be found."
- Tipo: sugestão
- Print: no relatorio