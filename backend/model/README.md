# Modelo e dados do Antevê (memória de massa)

## Arquivos

- `modelo_lgbm.txt`: previsão central. `modelo_p10.txt` e `modelo_p90.txt`: quantis de 10% e 90% (faixa da previsão). Formato texto do LightGBM; carregar com `lightgbm.Booster(model_file=...)`.
- `referencia.py`: implementação de referência da leitura do arquivo, dos cálculos e da previsão. Os services do backend seguem estas funções, e os testes comparam com os valores abaixo.
- `../exemplos/memoria_massa_bobcat.csv`: memória de massa de exemplo, com dados reais, no formato de distribuidora.

## Dados e treino

- Building Data Genome 2 (BDG2), prédio `Bobcat_office_Melody`: leituras reais de medidor, em kW, de hora em hora. O BDG2 não tem dados de 15 minutos; uma memória de massa de distribuidora costuma vir de 15 em 15 minutos, e a leitura aceita os dois.
- Treino: 08/01/2016 a 30/06/2017. Teste: 01/07/2017 a 31/12/2017 (os modelos não viram esse período).
- Parâmetros: n_estimators=500, learning_rate=0.05, num_leaves=31, random_state=42. Os de quantil usam os mesmos, com `objective='quantile'` e `alpha` 0.1 e 0.9.
- Versões no Colab: Python 3.13.18, lightgbm 4.6.0, scikit-learn 1.6.1, numpy 2.4.6, pandas 2.2.3.

## Features, nesta ordem

| # | Feature | Valor para a hora prevista |
|---|---|---|
| 1 | `hora` | hora do dia (0 a 23) |
| 2 | `dia_semana` | 0 = segunda ... 6 = domingo |
| 3 | `mes` | 1 a 12 |
| 4 | `fim_de_semana` | 1 se sábado ou domingo, senão 0 |
| 5 | `lag_1h` | consumo 1 hora antes |
| 6 | `lag_24h` | consumo 24 horas antes |
| 7 | `lag_168h` | consumo 168 horas (1 semana) antes |
| 8 | `media_24h` | média das 24 horas anteriores, sem a hora prevista |

- Antes de prever: média de cada hora (`serie_horaria`); buracos de até 3 horas seguidas são preenchidos por interpolação; os últimos 8 dias precisam estar completos.
- Lags por horário (o valor de 1 h, 24 h e 168 h antes), não por linha.
- Previsão hora a hora (`prever`): a cada passo, monta as features, roda os 3 modelos e usa só o valor central como entrada dos passos seguintes. Faixa de cada hora: `kw_min` = menor entre p10 e central; `kw_max` = maior entre p90 e central.

## Erro no período de teste (previsão da próxima hora)

- Erro médio: 2,76 kW (MAPE de 6,0%). Nos picos acima de 70 kW: 8,1 kW, em 114 horas.
- O valor real ficou entre o p10 e o p90 em 73% das horas do teste.
- **Limite conhecido:** os picos do prédio são súbitos. Num teste com previsões de 6 horas em jul–dez/2017, nos momentos em que o mês ainda não tinha multa, a maior previsão central foi 77,3 kW e o maior p90, 78,9 kW, enquanto os picos reais chegaram a 97,9, 102,9 e 115,1 kW. Por isso, na previsão do próximo mês, o modelo entra com consumo e pico típico, e o risco de multa vem do histórico do mesmo mês (`prever_proximo_mes`).

**Texto do tooltip "Previsão por IA":** Modelo LightGBM treinado com dados reais de um prédio (BDG2). Prevê bem o consumo típico (erro médio de 2,8 kW, 6%, na próxima hora), mas não antecipa picos súbitos: por isso o risco de multa vem do histórico do mesmo mês.

## Valores de conferência

Arquivo `exemplos/memoria_massa_bobcat.csv`, contratada de 80 kW, tarifa de R$ 12,89 (fatura da Nazaria), margem de 1,0 kW.

- Leitura: 13932 leituras, de 01/01/2016 00:00 a 31/12/2017 23:00, intervalo de 60 min.
- Meses no arquivo: 24; com dados: 21; sem dados: abr/16, mai/16, jun/16.
- Meses com multa: 8: jan/16 (96,5 kW), ago/16 (100,1 kW), dez/16 (89,5 kW), jan/17 (85,0 kW), fev/17 (85,0 kW), ago/17 (97,9 kW), nov/17 (102,9 kW), dez/17 (115,1 kW).
- Ultrapassagem no período: R$ 3.402,96. O notebook calcula R$ 3.402,96: confere.
- Custo de demanda no período com 80 kW (faturada + ultrapassagem): R$ 26.894,99.
- Faixa simulada: 57 a 116 kW.
- Ótimo: 86 kW: custo de R$ 26.514,74, economia de R$ 380,25, 5 meses com multa, folga mínima de 0,80 kW.
- Recomendado: 87 kW: custo de R$ 26.579,19, economia de R$ 315,80, 5 meses com multa, folga mínima de 1,85 kW.
- Sem multa: 111 kW: custo de R$ 30.099,83, economia de R$ -3.204,84, 0 meses com multa, folga mínima de 1,42 kW.
- Próximo mês (2018-01): consumo previsto de 42.561,7 kWh; pico típico de 65,3 kW em 2018-01-29T10:00:00, faixa de 63,2 a 67,7 kW; risco alto. Aviso: "Janeiro passou do limite em 2 de 2 anos do histórico (96,5 kW em 2016, 85,0 kW em 2017)."
