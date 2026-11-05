# Antevê: especificação para o Claude Code (v5.2)

Leia tudo antes de começar. Esta versão substitui as anteriores: o app passa a ser só o fluxo de memória de massa, e o modo IoT fica apenas na apresentação teórica.

## Decisões que valem para tudo

- **Escopo:** o app mostra, de ponta a ponta e de verdade, o fluxo de memória de massa:
  1. o cliente informa a demanda contratada;
  2. envia o arquivo de medição;
  3. o backend lê, valida e salva o arquivo;
  4. o backend calcula os picos, as multas, o contrato ideal e os horários de pico;
  5. o backend prevê o próximo mês com o modelo LightGBM;
  6. o front mostra tudo.

  O modo IoT (tempo real) **não será implementado**: fica na apresentação como proposta, com o protótipo como referência visual.
- **O backend é do Nicolas.** O código novo entra em arquivos novos, no mesmo padrão dele (`controllers → services → repositories`). Nos arquivos dele mudam só as linhas listadas na seção 4.1, incluindo a regra dos 5%, já confirmada. Os módulos novos **usam** as funções dele em vez de alterá-las: a classificação de cada mês usa `verificar_risco`.
- **Divisão combinada com o Nicolas:** a importação da memória de massa é dele (`POST /importacao/memoria-massa`: ler, validar e salvar as leituras). A nossa parte é a análise, a previsão, os alertas e o front, lendo o que a importação salva. O formato salvo é o contrato entre as duas partes (seção 5.2). Não mexa nos arquivos de importação dele, nem para corrigir erro: me avise.
- **O "algoritmo" fica todo no backend:**
  - **Cálculos:** pico de cada mês, multa pela regra da ANEEL, contrato ideal e mapa de picos. São contas exatas e testadas.
  - **Previsão:** o modelo LightGBM prevê o próximo mês.

  O front só exibe. A única conta no front é a prévia do limite enquanto a pessoa digita, em Configurações.
- **A previsão é honesta.** O modelo acerta o consumo típico (erro de cerca de 6% hora a hora), mas não antecipa picos súbitos (erro de cerca de 8 kW nos picos). Por isso, na previsão do próximo mês:
  - o modelo entra com o consumo e o pico típico;
  - o risco de multa vem do histórico do mesmo mês no arquivo.

  Os textos da tela dizem isso.
- **Arquivos do notebook:** eu coloco no repositório, a partir do zip gerado no Colab:
  - `backend/model/`: `modelo_lgbm.txt`, `modelo_p10.txt`, `modelo_p90.txt`, `README.md` e `referencia.py`;
  - `backend/exemplos/memoria_massa_bobcat.csv`.

  O `referencia.py` é a especificação executável da leitura do arquivo, das contas e da previsão. O `README.md` traz os valores de conferência dos testes. Se esses arquivos não estiverem lá quando chegar o commit 5, me peça.
- **Ordem do trabalho:** primeiro o backend, com commits por partes; depois o front inteiro, num commit só (seção 4.2).
- **Organização do repositório:** a raiz fica só com as pastas `backend/` e `frontend/`. Esta documentação fica em `frontend/docs/`.

## 1. Produto

**Antevê: "Veja o pico antes da multa."** Ajuda empresas do Grupo A (média e alta tensão) a não pagar multa por ultrapassagem de demanda.

**Usuário:** gestor de facilities ou do financeiro, sem formação técnica. Ele precisa responder em segundos: "quanto estou perdendo?", "qual contrato devo ter?" e "quando e onde estão meus picos?".

| Termo | Definição |
|---|---|
| Demanda contratada | Valor em kW do contrato com a distribuidora. **O cliente informa.** Não vem no arquivo de medição. |
| Tolerância | 5% acima da contratada sem multa (regra da ANEEL para o Grupo A). |
| Limite de multa | Contratada × 1,05 (exemplo: 80 → 84,0 kW). |
| Pico do mês | A maior medição do mês. É ele que define a demanda faturada e a multa. |
| Ultrapassagem | Se o pico passa do limite: (pico − contratada) × 2 × tarifa de demanda. |
| Folga | Limite de multa − pico. |
| Memória de massa | Arquivo da distribuidora com a demanda medida em intervalos fixos (normalmente 15 minutos). |

**Memória de massa (o que o app faz):** o cliente envia o arquivo; o sistema mostra quanto ele perdeu com multas, em quais meses e horários os picos aconteceram, qual contrato custa menos e qual o risco do próximo mês.

**IoT (só na apresentação):** um medidor enviaria leituras a cada minuto, e o sistema cortaria o pico enquanto ele sobe. Não entra no app. O ramo IoT do `Main.dc.html` serve de referência visual para essa parte da apresentação.

**Dados da demonstração:** prédio real do BDG2 (`Bobcat_office_Melody`, 2016 e 2017, de hora em hora), com o contrato de 80 kW e a tarifa de R$ 12,89 da fatura da Nazaria.

## 2. Organização do repositório e arquitetura

```
eficienciaEnergetica/
  backend/      FastAPI do Nicolas + módulos novos (seção 5)
    model/      modelos LightGBM, README.md com os valores de conferência e referencia.py
    exemplos/   memoria_massa_bobcat.csv (arquivo de exemplo da demonstração)
  frontend/     Next.js (seção 7)
    docs/       esta especificação e o protótipo
```

```
Front (Next.js)                                    Backend (FastAPI)
───────────────                                    ─────────────────
Configurações ── PUT /api/configuracao ─────────▶ configuracao_controller → service → repository → data/configuracao.json
Envio ────────── POST /api/importacao/memoria-massa ▶ importacao_controller → service → repository (do Nicolas)
                                                     → salva data/medicoes.csv + data/medicoes_info.json (contrato, seção 5.2)
Exemplo ──────── POST /api/medicoes/exemplo ─────▶ memoria_massa_controller → medicoes_service → medicoes_repository
                                                     → salva no mesmo contrato
Painel, Contrato ideal, Histórico
                 GET /api/analise/... ──────────▶ analise_service (picos, multas, mapa, contrato ideal)
                                                     → verificar_risco() do Nicolas para cada mês
Previsão ─────── GET /api/previsao/proximo-mes ─▶ previsao_service (LightGBM) + histórico do mesmo mês
Alertas ──────── GET /api/alertas ──────────────▶ alertas_mensais_service (risco do próximo mês + meses com multa)
```

- **Proxy:** os `rewrites` do Next mandam `/api/:path*` para `http://localhost:8000/:path*`. O backend não ganha prefixo `/api` nem CORS.
- **A demanda contratada vem do cliente.** O modelo não recebe a contratada. A comparação com o limite acontece depois, nas contas.

## 3. Stack

### 3.1 Recomendação

**Front:** Next.js (App Router, TypeScript, pasta `src/`) + Tailwind CSS, com:

- **Recharts** para os gráficos.
- **TanStack Query** para buscar dados, guardar em cache e atualizar.
- **lucide-react** para os ícones.
- **IBM Plex Sans** via `next/font/google`: a fonte é baixada no build e servida pelo próprio app, sem depender de internet na apresentação.
- **Vitest** para testes.

**Backend:** o FastAPI do Nicolas, mais:

- `python-multipart` para receber o arquivo;
- `pandas` e `numpy` para as contas;
- `lightgbm` para o modelo;
- `pytest` e `httpx` para os testes.

**Por que Next.js:**

- **Organização por convenção.** Cada tela é uma pasta em `app/`, o menu lateral fica num layout compartilhado, e carregamento e erro têm arquivos próprios por tela (`loading.tsx`, `error.tsx`).
- **O time já conhece.**
- **Proxy embutido.** Os `rewrites` mandam `/api/*` para o FastAPI sem mexer no backend.

### 3.2 Cuidados do Next.js neste projeto

- **Regras de negócio no backend.** No front, `src/lib/` tem só formatação e a prévia do limite.
- **Padrão de página:** um `page.tsx` fino que renderiza a tela com `'use client'` (exemplo: `PainelTela.tsx`). Gráficos, envio de arquivo e `window` só dentro de client components.
- **Hidratação:** valores que dependem do relógio são calculados depois de montar no cliente.
- **Sem `output: 'export'`:** a exportação estática desliga os `rewrites`. Rode o Next como servidor.
- **Dois processos:** um script sobe o backend e o Next juntos (seção 7.1).

## 4. Regras do trabalho

- **Branch:** crie `feat/front-e-previsao` antes de começar, se ainda não existir. No fim, abra um PR para o grupo revisar; não faça merge direto no `main`. Mantenha a branch atualizada com o `origin/main`, porque o Nicolas continua mexendo no backend. Enquanto a branch não tiver sido enviada, use rebase.
- **Antes de escrever código:** leia este arquivo, os protótipos, o backend e os arquivos de `backend/model/`. Depois me mostre um plano curto seguindo a seção 11 e espere meu ok.
- **Uma etapa por vez.** Ao fim de cada uma, rode os testes (`pytest` no backend; `npm run lint`, `npm run build` e `npm test` no front) e me diga o que mudou. Faça commit só quando eu pedir, seguindo a seção 4.2.
- **Não invente métricas nem textos.** Os números vêm do backend; os textos, desta especificação.

### 4.1 Código do Nicolas: o que pode mudar

O código que já existe em `backend/` é do Nicolas, e é ele quem vai apresentar o backend. **Só estas mudanças são permitidas nos arquivos dele:**

1. `backend/app/main.py`: trocar `title = 'Eficiência Energetica API',` por `title = 'Antevê API',`.
2. `backend/app/main.py`: acrescentar 2 imports, `configuracao_router` e `memoria_massa_router`, logo depois dos imports dele. Acrescentar também 2 `app.include_router(...)` logo depois dos dele, no mesmo estilo.
3. `backend/app/repositories/demanda_repository.py`: a função `buscar_demanda_contratada()` passa a ler a configuração, com 80.0 como padrão quando ainda não houver configuração, mais 1 import logo depois dos imports dele (seção 5.1).
4. `backend/app/services/demanda_service.py`: a regra dos 5% (seção 5.6).

**Estilo:** não reordene imports, não troque aspas nem formatação (nem espaços no fim das linhas), não apague comentários e não renomeie nada. Nenhum outro arquivo dele muda: controllers, os outros services, os arquivos de importação (`importacao_controller.py`, `importacao_service.py` e `importacao_repository.py`) e `data/consumo.csv` ficam intactos. Não crie `__init__.py`: o projeto dele funciona sem eles, e os módulos novos seguem o mesmo padrão.

**`.pyc` versionados:** os arquivos `backend/app/**/__pycache__/*.pyc` (Python 3.13) estão no repositório, e rodar o backend ou os testes regrava esses arquivos. Eles nunca entram nos commits:

- use `git add` só com os arquivos da etapa (nada de `git add -A` ou `git add .`);
- antes de mostrar o diff ou commitar, rode `git restore -- "*.pyc"`.

Tirar os `.pyc` do repositório é decisão do Nicolas; a sugestão vai na descrição do PR (seção 4.2).

### 4.2 Commits

Primeiro o backend, em commits por partes; depois o front inteiro, num commit só.

**Backend.** Faça uma parte por vez, na ordem abaixo. Em cada parte: implemente, rode o `pytest`, me mostre o diff e, com o meu ok, faça o commit antes de começar a próxima. O `main.py` muda nos commits 1, 4 e 5, então não adiante partes. Cada commit leva os próprios testes e deixa o backend rodando.

1. `chore: renomeia a API para Antevê`: só a linha do `title` em `main.py`.
2. `chore: dependências e configuração dos testes`:
   - `requirements.txt` com `fastapi`, `uvicorn`, `python-multipart`, `pandas`, `pytest` e `httpx`. O código do Nicolas já usa `pandas` e upload;
   - `.gitignore`, `pytest.ini` e `tests/conftest.py`;
   - um teste das rotas que já existem (`/consumos` e `/demanda/indicadores`). A rota `/status` não existe mais.
3. `fix: tolerância de 5% na demanda`: as 3 linhas em `demanda_service.py` (seção 5.6), com testes.
4. `feat: configuração da demanda contratada`:
   - os módulos de configuração e `data/configuracao.exemplo.json`;
   - em `main.py`, o import e o `include_router` do `configuracao_router`;
   - a mudança em `buscar_demanda_contratada()`;
   - testes.
5. `feat: medições salvas e arquivo de exemplo`:
   - medições: repository e service que leem o que a importação do Nicolas salva (seção 5.2), e o `memoria_massa_controller` com `POST /medicoes/exemplo` e `GET /medicoes/resumo`;
   - em `main.py`, o import e o `include_router` do `memoria_massa_router`;
   - `backend/exemplos/memoria_massa_bobcat.csv`;
   - testes.
6. `feat: análise e contrato ideal`:
   - `analise_service.py` e as rotas `/analise/...` no `memoria_massa_controller`;
   - testes com os valores de conferência.
7. `feat: previsão do próximo mês e alertas`:
   - `backend/model/` (os 3 modelos, `README.md` e `referencia.py`);
   - `previsao_service.py` e `alertas_mensais_service.py`, com as rotas de previsão e alertas;
   - `lightgbm` no `requirements.txt`;
   - testes.

Antes de cada commit do backend, siga a regra dos `.pyc` (seção 4.1) e mostre `git status` e o diff dos arquivos do Nicolas.

**Front.** Um commit só, depois do F9 e com tudo passando: `feat: front-end do Antevê`, com a pasta `frontend/` inteira (incluindo `frontend/docs/`) e o `README.md` da raiz.

**Descrição do PR.** Escreva para o Nicolas, que vai revisar e apresentar o backend:

- o que mudou nos arquivos dele (seção 4.1), um commit por vez;
- a regra dos 5%:
  - a regra da ANEEL, com a fonte: https://www.copel.com/site/copel-distribuicao/para-sua-empresa/demanda/;
  - as 3 linhas;
  - o efeito: com 80 kW, `/alerta/risco` com 82 passa de `critico` para `normal`, e o formato das respostas não muda;
- os módulos e as rotas novas (seção 6.2), e que a análise usa a `verificar_risco` dele para classificar cada mês;
- que a análise lê o que a importação dele salva, no formato combinado (seção 5.2);
- como instalar as dependências e rodar o `pytest`;
- a sugestão de tirar os `.pyc` do repositório com `git rm --cached -- "*.pyc"`, num commit à parte, se ele concordar.

Se o `gh` não estiver disponível, me passe o texto para eu colar no GitHub.

## 5. Backend: módulos novos

**Caminhos.** Todos os caminhos saem do próprio arquivo, como o Nicolas faz em `listar_consumos` (`Path(__file__).resolve().parents[2]` é a pasta `backend/`), e não da pasta de onde o comando roda:

- **pasta de dados:** variável `ANTEVE_DATA_DIR`, com padrão `backend/data`;
- **pasta dos modelos:** variável `ANTEVE_MODEL_DIR`, com padrão `backend/model`;
- **exemplo:** `backend/exemplos`.

Leia as variáveis a cada chamada, e não na importação, para os testes poderem trocar as pastas.

**Controllers.** Para o `main.py` ganhar só 2 routers, todas as nossas rotas da memória de massa (medições, análise, previsão e alertas) ficam num único `app/controllers/memoria_massa_controller.py`, fino, chamando os services.

### 5.1 Configuração (entrada da demanda contratada)

- **`app/repositories/configuracao_repository.py`:** `buscar_configuracao()` (devolve `None` se o arquivo não existir) e `salvar_configuracao(dados)`. Lê e grava `configuracao.json` na pasta de dados.
- **`app/services/configuracao_service.py`:**
  - `obter_configuracao()` acrescenta `limite_multa_kw` (contratada × (1 + tolerância), com 2 casas) e `atualizado_em`.
  - `atualizar_configuracao(dados)` valida e salva.
  - Validação por campo, em português: demanda > 0; tolerância entre 0 e 0,2; tarifa > 0; horários `HH:MM` com fim diferente do início; `fonte_dados` em `memoria_massa` ou `iot`; margem ≥ 0.
- **`app/controllers/configuracao_controller.py`:**
  - `GET /configuracao`. Sem configuração: 404 `{"detail": "Contrato ainda não cadastrado"}`.
  - `PUT /configuracao`, com corpo Pydantic (seção 6.2). Erros do service viram 422 `{"detail": [{"campo": "...", "mensagem": "..."}]}`, com `campo` igual ao nome no JSON (exemplos: `demanda_contratada_kw`, `empresa.razao_social`).
- **Edição no arquivo do Nicolas** (`demanda_repository.py`):

  ```python
  from app.repositories.configuracao_repository import buscar_configuracao

  def buscar_demanda_contratada():
      configuracao = buscar_configuracao()
      return configuracao['demanda_contratada_kw'] if configuracao else 80.0
  ```

  Sem configuração, as rotas dele funcionam exatamente como hoje.

### 5.2 Medições: contrato com a importação do Nicolas

A importação é do Nicolas (`POST /importacao/memoria-massa`). A nossa parte só lê o que ela salva. O formato salvo é o **contrato** entre as duas partes:

- **`data/medicoes.csv`**, na pasta de dados:
  - cabeçalho `data_hora,demanda_kw`, uma linha por leitura;
  - `data_hora` em ISO (`2017-12-31T23:00:00`) e `demanda_kw` em kW, com ponto decimal;
  - em ordem e sem duplicadas;
  - cada importação substitui a anterior.
- **`data/medicoes_info.json`** (opcional): `{"arquivo": "nome.csv", "importado_em": "2026-11-05T15:30:00", "origem": "upload"}`. Sem ele, use "arquivo enviado" como nome e a data de modificação do CSV.

Enquanto a importação dele não salvar nesse formato, a nossa parte funciona com o arquivo de exemplo e com os testes, que gravam o contrato direto.

**Módulos:**

- **`app/repositories/medicoes_repository.py`:**
  - `listar_medicoes()` lê `data/medicoes.csv` e devolve a série (kW por `data_hora`) ou `None`;
  - `buscar_info()` lê o JSON, se existir;
  - `salvar_medicoes(serie, info)` grava os dois arquivos no formato do contrato. Só o arquivo de exemplo usa.
- **`app/services/medicoes_service.py`:**
  - `importar_exemplo()` lê `backend/exemplos/memoria_massa_bobcat.csv` com `ler_memoria_massa` (copiada de `backend/model/referencia.py`) e salva no contrato, com `origem: "exemplo"`;
  - `resumo()` calcula, a partir do CSV salvo, o período, o intervalo (`intervalo_min` da referência), o total de leituras e os meses sem dados, e junta o que houver no JSON.
- **Rotas no `memoria_massa_controller`:**
  - `POST /medicoes/exemplo`;
  - `GET /medicoes/resumo`. Sem medições: 404 `{"detail": "Nenhuma memória de massa enviada"}`.

  As duas devolvem `MedicoesResumo` (seção 6.2).

**Combinado com o Nicolas,** para o envio do arquivo funcionar na apresentação:

- a importação dele salva no contrato acima;
- ela aceita o formato do arquivo de exemplo: `Data;Hora;Demanda ativa (kW)`, separador `;`, data `dd/mm/aaaa`, decimal com vírgula. Ele pode usar a `ler_memoria_massa` de `backend/model/referencia.py`, que também aceita `data_hora,demanda_kw` e devolve os erros em português. Se ele preferir outro formato, eu gero o arquivo de exemplo nele;
- o front manda no formulário dele `nome_predio` (a razão social de Configurações), `demanda_contratada` (de Configurações) e `unidade` = `kW`. A demanda que vale para as contas continua sendo a de Configurações.

### 5.3 Análise (cálculos)

`app/services/analise_service.py` copia de `referencia.py` as funções `arred`, `limite_multa`, `situacao`, `custo_mes`, `picos_mensais`, `consumo_mensal_kwh` e `simular_contrato`. Elas usam a configuração (contratada, tolerância, tarifa, margem) e as medições salvas.

- **Regra da ANEEL:** a demanda faturada é o maior valor entre contratada e pico, vezes a tarifa. Se o pico passar do limite, soma-se a ultrapassagem: (pico − contratada) × 2 × tarifa. Cada parcela mensal vai para centavos com `arred` e depois soma. Valores sem impostos. Outras penalidades da fatura ficam fora.
- **Uso do código do Nicolas:** a situação de cada mês, no contrato configurado, sai da `verificar_risco(pico)` dele, que já tem a regra dos 5%:
  - `risco` verdadeiro → `multa`;
  - senão, `diferenca_kw > 0` → `acima_contratado`;
  - senão → `dentro`.

  A simulação de outros valores de contrato usa a `situacao()` da referência. Um teste garante que as duas concordam com tolerância de 5%. Em Configurações, a tolerância aparece fixa em 5%.
- **Funções do service:**
  - `picos_mensais()`: todos os meses do primeiro ao último do arquivo, com os meses sem leitura marcados como `sem_dados`.
  - `resumo_analise()`: os números do destaque do painel.
  - `mapa_picos()`: leituras acima da contratada, por dia da semana × hora. Inclui o maior bloco, que é a janela de 3 dias úteis seguidos × 2 horas seguidas com mais leituras acima.
  - `contrato_ideal()`: `simular_contrato` com a faixa automática da referência, mais o mês a mês do contrato atual × o recomendado.
  - `recomendacoes()`, com estas regras:
    - **contrato:** se o recomendado for diferente do atual e tiver economia, título "Ajustar a demanda contratada para X kW", com a economia e os meses com multa antes e depois. Ação: Simular contrato, levando a `/contrato-ideal`. Se não for o caso: "Seu contrato já está no ponto de menor custo".
    - **horário:** se houver maior bloco, "Evitar cargas pesadas juntas de terça a quinta, 14h–16h", com quantas leituras acima ficaram nesse bloco.
    - **sazonal:** meses do calendário que passaram do limite em todos os anos do arquivo (e em pelo menos 2 anos), como "Dezembro e janeiro passaram do limite em todos os anos do arquivo".
- **Rotas no `memoria_massa_controller`:**
  - `GET /analise/resumo`;
  - `GET /analise/picos-mensais`;
  - `GET /analise/mapa-picos`;
  - `GET /analise/contrato-ideal`;
  - `GET /analise/recomendacoes`.

  Respostas de erro:
  - sem medições: 404 "Nenhuma memória de massa enviada";
  - sem configuração: 409 "Cadastre o contrato em Configurações".

### 5.4 Previsão do próximo mês (LightGBM)

`app/services/previsao_service.py` copia de `referencia.py` as funções `serie_horaria`, `prever` e `prever_proximo_mes`, sem mudar a lógica:

- **Preparação:** média de cada hora; buracos de até 3 horas preenchidos por interpolação. Os últimos 8 dias precisam estar completos; se não estiverem, responda 422 com a mensagem da referência.
- **Features por horário,** na ordem do `model/README.md`.
- **Previsão passo a passo:** só o valor central volta como entrada.
- **Faixa** do p10 ao p90.
- **Horizonte:** do fim do arquivo até o fim do mês seguinte ao da última leitura.
- **Risco:**
  - **alto:** o mesmo mês passou do limite em mais da metade dos anos do arquivo, ou o p90 passa do limite;
  - **médio:** o mesmo mês passou do limite em algum ano, ou o p90 passa da contratada;
  - **baixo:** nos outros casos.

**Funcionamento:**

- **Modelos:** `carregar_modelos()` carrega os 3 `.txt` com `lightgbm.Booster(model_file=...)` uma vez só.
- **Sem os arquivos dos modelos,** use um baseline e responda `modelo: 'baseline'`. O baseline é a média por dia da semana e hora das últimas 4 semanas, repetida no mês seguinte, com faixa de ± o desvio padrão dessas 4 semanas. O risco segue a mesma regra.
- **Cache:** guarde o resultado em memória, com chave `importado_em` + contratada. Uma previsão leva poucos segundos.
- **Rota:** `GET /previsao/proximo-mes`, que devolve `PrevisaoProximoMes` (seção 6.2). Erros iguais aos da análise.

### 5.5 Alertas do próximo mês e do histórico

`app/services/alertas_mensais_service.py`. O nome evita confusão com o `alerta_service.py` do Nicolas.

- `listar_alertas()` monta os alertas a partir da análise e da previsão, nesta ordem:
  1. **Risco do próximo mês,** se o risco for médio ou alto. Id `proximo-mes`.
     - Título: "Risco alto de multa em janeiro de 2018" (ou "Atenção em ...", se médio).
     - Mensagem: o aviso sazonal, seguido de "Veja as recomendações."
  2. **Uma multa registrada por mês com multa,** do mais recente ao mais antigo. Id `multa-AAAA-MM`.
     - Título: "Multa em dezembro de 2017".
     - Mensagem: "Pico de 115,1 kW, 31,1 kW acima do limite de 84 kW: R$ 905,65 de ultrapassagem."
- `buscar_alerta(id)`: o alerta com detalhe. No risco, o detalhe traz a previsão e as recomendações; na multa, pico, limite e valor.
- **Rotas:**
  - `GET /alertas`;
  - `GET /alertas/{id}`, com 404 "Alerta não encontrado".

### 5.6 Regra dos 5%

A mudança no arquivo do Nicolas (`demanda_service.py`) são 3 linhas. Em `verificar_risco`:

```python
def verificar_risco(demanda_prevista):
    demanda_contratada = buscar_demanda_contratada()
    limite = demanda_contratada * 1.05  # tolerância de 5% (ANEEL)

    diferenca = demanda_prevista - demanda_contratada

    if demanda_prevista > limite:
```

E em `verificar_ultrapassagens`:

```python
        if consumo['demanda_medida_kw'] > consumo['demanda_contratada_kw'] * 1.05:
```

- O alerta dele acompanha sozinho: `gerar_alerta_risco` usa o `risco` devolvido por `verificar_risco`, então `alerta_service.py` não muda.
- `diferenca_kw` e `ultrapassagem_kw` continuam como medida − contratada, que é a base da cobrança na ANEEL.
- O formato das respostas não muda. Com o CSV atual, `/demanda/ultrapassagens` continua igual (85 e 95 kW passam de 84).
- Testes (commit 3), com 80 kW:
  - `/alerta/risco` dá `normal` para 82 e para 84 (no limite ainda não há multa) e `critico` para 86,3;
  - `/demanda/ultrapassagens` continua com fevereiro e março.

### 5.7 Infra e testes

- **`backend/requirements.txt`:** versões fixas.
  - **Commit 2:** `fastapi`, `uvicorn`, `python-multipart`, `pandas`, `pytest` e `httpx`. O código do Nicolas já usa `pandas` e upload: sem eles, o app nem sobe.
  - **Commit 7:** acrescenta `lightgbm` 4.x.

  Os `.pyc` do repositório indicam Python 3.13: pergunte qual Python vamos usar e escolha versões com pacote pronto para ele. No Windows, sem pacote pronto, o `pip` tenta compilar e falha. As versões do Colab estão no `model/README.md`.
- **`backend/.gitignore`:** `__pycache__/`, `.venv/`, `.pytest_cache/`, `data/configuracao.json`, `data/medicoes.csv` e `data/medicoes_info.json`. Ele não vale para os `.pyc` que já estão versionados (seção 4.1).
- **`backend/pytest.ini`:** `[pytest]` com `pythonpath = .` e `testpaths = tests`.
- **Configuração de exemplo:** `data/configuracao.exemplo.json` vai para o repositório com os valores da seção 9.3. O `configuracao.json` real não vai.
- **Testes (`backend/tests/`).** O `conftest.py` aponta `ANTEVE_DATA_DIR` para um `tmp_path`; os testes nunca tocam os dados reais. Use o arquivo de exemplo pela rota `/medicoes/exemplo`. Casos por commit:
  - **Commit 4:**
    - `GET /configuracao` sem configuração → 404;
    - `PUT` válido → `limite_multa_kw` 84,0 com 80 kW;
    - `PUT` inválido → 422 com campo e mensagem;
    - `buscar_demanda_contratada()` → 80.0 sem configuração e o valor salvo com configuração;
    - `/alerta/risco?demanda_prevista=86.3` usa a contratada salva.
  - **Commit 5:**
    - `/medicoes/exemplo` → resumo igual ao do `model/README.md` (leituras, período, intervalo, meses sem dados);
    - sem `medicoes.csv` → `GET /medicoes/resumo` dá 404;
    - um `medicoes.csv` gravado à mão no formato do contrato, como a importação do Nicolas vai gravar, e sem o JSON → o resumo lê certo e usa "arquivo enviado".
  - **Commit 6:**
    - com o exemplo e a configuração de 80 kW, R$ 12,89 e margem de 1 kW: meses com multa, ultrapassagem total, custo com 80 kW, ótimo, recomendado e sem multa iguais aos do `model/README.md`;
    - `simular_contrato` com os picos do protótipo (seção 9.2) → a tabela de lá;
    - `verificar_risco` e `situacao()` concordam em todos os meses do exemplo;
    - sem configuração → 409; sem medições → 404.
  - **Commit 7:**
    - com o exemplo, a previsão do próximo mês bate com o `model/README.md`: mês, consumo, pico típico e faixa (tolerância de ±0,1), risco e aviso;
    - sem modelos (`ANTEVE_MODEL_DIR` vazio) → `modelo: 'baseline'` com `kw_min ≤ kw ≤ kw_max`;
    - `GET /alertas` → o primeiro é o de `proximo-mes`, seguido de uma multa por mês com multa.

## 6. Rotas e dados

O front chama `/api/...`, e o proxy repassa ao backend sem o prefixo.

### 6.1 Rotas do Nicolas (intactas)

As rotas dele continuam funcionando com o CSV dele (`/consumos`, `/consumos/total`, `/consumos/media`, `/consumo/maior`, `/consumo/menor`, `/consumo/indicadores`, `/demanda/ultrapassagens`, `/demanda/indicadores` e `/alerta/risco`). A rota `/status` não existe mais. O front usa:

- `POST /importacao/memoria-massa`, dele, para o envio do arquivo. Em multipart, com `arquivo`, `nome_predio`, `demanda_contratada` e `unidade`. Responde `{ mensagem, Nome_predio, Demanda_contratada_kw, Unidade, total_registros, primeiros_registros }`; os erros vêm como `{ detail: string }` (status 400 ou 422);
- `GET /openapi.json`, que o FastAPI sempre tem, para mostrar se a API está no ar.

### 6.2 Rotas novas

```ts
type Situacao = 'dentro' | 'acima_contratado' | 'multa'

type Configuracao = {
  empresa: { razao_social: string; cnpj?: string; cidade_uf: string; modalidade: 'verde' | 'azul' }
  demanda_contratada_kw: number; tolerancia: number; tarifa_demanda_rs_kw: number
  ponta_inicio: string; ponta_fim: string            // "17:30", "20:30"
  fonte_dados: 'memoria_massa' | 'iot'; margem_seguranca_kw: number
}
GET /configuracao → Configuracao & { limite_multa_kw: number; atualizado_em: string }   // 404 sem configuração
PUT /configuracao   body: Configuracao → igual ao GET
                    // 422: { detail: { campo: string; mensagem: string }[] }

type MedicoesResumo = {
  arquivo: string; origem: 'upload' | 'exemplo'; importado_em: string
  inicio: string; fim: string; intervalo_min: number; total_leituras: number
  meses_sem_dados: string[]                           // 'AAAA-MM'
}
POST /medicoes/exemplo → MedicoesResumo
GET  /medicoes/resumo  → MedicoesResumo                                // 404 sem medições

type PicoMensal = {
  mes: string; rotulo: string                          // '2017-12', 'dez/17'
  pico_kw: number | null; pico_em: string | null; consumo_kwh: number | null; leituras: number
  situacao: Situacao | 'sem_dados'; faturada_rs: number | null; ultrapassagem_rs: number | null
}
type AnaliseResumo = {
  inicio: string; fim: string; meses_no_arquivo: number; meses_com_dados: number
  meses_com_multa: number; ultrapassagem_total_rs: number; custo_demanda_rs: number
  contratada_kw: number; limite_multa_kw: number; tarifa_rs_kw: number
  maior_pico: { mes: string; pico_kw: number; pico_em: string }
  contrato_recomendado: { contratada_kw: number; economia_rs: number; meses_com_multa: number }
}
type MapaPicos = {
  limiar_kw: number; total_acima: number
  contagens: number[][]                               // [dia 0=seg..6=dom][hora 0..23]
  maior_bloco: { dia_inicio: number; dia_fim: number; hora_inicio: number; hora_fim: number; contagem: number } | null
}
type PontoContrato = {
  contratada_kw: number; custo_rs: number; ultrapassagem_rs: number; economia_rs: number
  meses_com_multa: number; folga_pior_mes_kw: number; folga_minima_kw: number | null
}
type ContratoIdeal = {
  tarifa_rs_kw: number; margem_kw: number; meses_analisados: number
  atual: PontoContrato; otimo: PontoContrato; recomendado: PontoContrato; sem_multa: PontoContrato | null
  curva: PontoContrato[]                              // um ponto por kW, na faixa automática
  mes_a_mes: { mes: string; rotulo: string; pico_kw: number | null
               atual: { situacao: Situacao | 'sem_dados'; custo_rs: number | null }
               recomendado: { situacao: Situacao | 'sem_dados'; custo_rs: number | null } }[]
}
type Recomendacao = { tipo: 'contrato' | 'horario' | 'sazonal'; titulo: string; detalhe: string
                      acao?: { rotulo: string; rota: string } }
GET /analise/resumo         → AnaliseResumo
GET /analise/picos-mensais  → PicoMensal[]
GET /analise/mapa-picos     → MapaPicos
GET /analise/contrato-ideal → ContratoIdeal
GET /analise/recomendacoes  → Recomendacao[]
// sem medições: 404; sem configuração: 409 { detail: "Cadastre o contrato em Configurações" }

type PrevisaoProximoMes = {
  mes: string; consumo_previsto_kwh: number
  pico_tipico_kw: number; pico_tipico_min_kw: number; pico_tipico_max_kw: number; pico_tipico_em: string
  risco: 'baixo' | 'medio' | 'alto'; aviso_sazonal: string
  meses_historico: { mes: string; pico_kw: number; situacao: Situacao }[]
  modelo: 'lightgbm' | 'baseline'
}
GET /previsao/proximo-mes → PrevisaoProximoMes

type Alerta = {
  id: string; tipo: 'risco_proximo_mes' | 'multa_registrada'; nivel: 'alto' | 'medio' | 'multa'
  titulo: string; mensagem: string; mes: string
  detalhe?: { pico_kw?: number; limite_kw: number; ultrapassagem_rs?: number
              previsao?: PrevisaoProximoMes; recomendacoes?: Recomendacao[] }
}
GET /alertas       → Alerta[]          // sem detalhe
GET /alertas/{id}  → Alerta            // com detalhe; 404 se não existir
```

**Tipos no front:** em `src/api/tipos.ts`, fiéis a esses formatos.

## 7. Front-end

### 7.1 Base

A pasta `frontend/` já existe, com `docs/` dentro. Crie o app nela mesma:

```bash
cd frontend
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
npm i @tanstack/react-query recharts lucide-react
npm i -D vitest concurrently
```

O `--yes` aceita o padrão nas perguntas que faltarem, para o comando não ficar esperando resposta. Se o `create-next-app` reclamar da pasta `docs/`, mova-a para fora temporariamente, crie o app e traga de volta.

- **`next.config.ts`:** `rewrites` de `/api/:path*` para `${process.env.API_URL ?? 'http://localhost:8000'}/:path*` (sem o `/api` no destino), com `API_URL` no `.env.local` e um `.env.example`.
- **`.gitignore`:** o do `create-next-app` ignora `.env*`; acrescente `!.env.example`.
- **Cliente:** `src/api/cliente.ts` com `fetch` em `/api` e erro tratado. Timeout de cerca de 3 s nas leituras e de 60 s no envio de arquivo. Hooks do TanStack Query em `src/api/hooks/`. O `QueryClientProvider` fica num `providers.tsx` com `'use client'`, usado no layout raiz.
- **Depois de salvar a configuração ou enviar um arquivo,** invalide as consultas de medições, análise, previsão e alertas.
- **Fonte:** `IBM_Plex_Sans` de `next/font/google` (pesos 400, 500, 600 e 700), aplicada no layout raiz.
- **Demonstração:** a variável `NEXT_PUBLIC_DEMO=true` liga a barra de demonstração (seção 7.4).
- **Testes desde o F1:** script `"test": "vitest run"` e um primeiro teste já no F1.
- **Scripts**, a partir de `frontend/`:

  ```json
  "scripts": {
    "dev:tudo": "concurrently -n api,web \"cd ../backend && uvicorn app.main:app --reload\" \"next dev\"",
    "apresentacao": "concurrently -n api,web \"cd ../backend && uvicorn app.main:app\" \"next start\"",
    "demo:zerar": "node scripts/zerar-demo.mjs"
  }
  ```

  O `scripts/zerar-demo.mjs` apaga `backend/data/configuracao.json`, `medicoes.csv` e `medicoes_info.json`, ignorando os que não existirem, e avisa no terminal. Assim a apresentação começa do primeiro acesso. Na véspera, rode `npm run build`, porque o `next/font` baixa a fonte nessa hora. No dia, com o ambiente Python do backend ativado, rode `npm run demo:zerar` e depois `npm run apresentacao`.

```
frontend/
  docs/                 especificação e protótipo
  scripts/zerar-demo.mjs
  src/
    app/
      layout.tsx                      fonte e providers
      page.tsx                        primeiro acesso: /configuracoes ou /painel
      (app)/layout.tsx                menu lateral + cabeçalho
      (app)/painel/page.tsx
      (app)/contrato-ideal/page.tsx
      (app)/configuracoes/page.tsx
      (app)/alertas/page.tsx
      (app)/alertas/[id]/page.tsx
      (app)/historico/page.tsx
    telas/                PainelTela, ContratoIdealTela, ConfiguracoesTela... (client components)
    api/                  tipos.ts, cliente.ts, hooks/
    components/ui/        Card, ChipStatus, Botao, Segmentado, Tooltip, Medidor, EnvioArquivo...
    components/graficos/  PicosMensais, MapaPicos, EconomiaContrato
    lib/                  regras.ts, format.ts (pt-BR)
```

### 7.2 Referência visual: `frontend/docs/prototipo/`

São fontes de uma ferramenta de design (`.dc.html`): HTML com estilos inline, `<sc-if>` (condicional), `<sc-for>` (repetição), `{{variavel}}` e um `<script>` com os dados de exemplo. Use como especificação de cores, tamanhos, espaçamentos, textos e estados. **Não copie o formato**: reescreva em React + Tailwind. Esses arquivos não abrem sozinhos no navegador. **Os números do protótipo são ilustrativos:** na tela, todos vêm do backend.

| Arquivo | Tela | Rota |
|---|---|---|
| `Main.dc.html`, ramo `isMassa` | Painel (memória de massa) | `/painel` |
| `Main.dc.html`, ramo `isIot` | não implementar: só referência da parte teórica | — |
| `Painel-Memoria.dc.html` | só abre o Painel no modo memória de massa | — |
| `Contrato.dc.html` | Contrato ideal | `/contrato-ideal` |
| `Configuracoes.dc.html` | Configurações / onboarding | `/configuracoes` |
| `Celular-Notificacao.dc.html` | não implementar: a notificação do sistema ficou de fora (seção 8) | — |
| `Celular-Alerta.dc.html` | detalhe do alerta, primeiro no celular (adapte ao alerta mensal) | `/alertas/[id]` |

### 7.3 Design (tokens do protótipo)

**Direção:** ferramenta B2B séria e sóbria, com espaço para os números respirarem. **Cor só com significado.** Sem gradientes, sem estética neon de IA, sem emoji, sem excesso de ícones e sem logos de empresas reais. Registre os tokens no tema do Tailwind, via `@theme` no CSS: `bg-pagina`, `text-tinta`, `bg-multa-fundo` etc.

| Token | Hex | Uso |
|---|---|---|
| `pagina` | `#F2F2EE` | fundo da página |
| `superficie` | `#FFFFFF` | cards |
| `menu` / `menu-ativo` | `#F8F8F5` / `#E8E8E2` | menu lateral / item ativo |
| `borda` / `divisoria` / `eixo` | `#E2E2DC` / `#ECECE7` / `#C9C9C2` | bordas, divisórias e grade, linha base dos gráficos |
| `tinta` / `tinta-2` / `tinta-3` | `#16181B` / `#4C5157` / `#686D73` | texto principal / secundário / de apoio (o mais claro permitido) |

| Situação | Preenchimento | Linha | Texto | Fundo | Borda |
|---|---|---|---|---|---|
| Dentro do contratado | `#8A948D` | | `#1F6B43` | `#E8F2EB` | `#C2DDCB` |
| Acima do contratado / risco médio | `#E3A21F` | `#B9760C` | `#8A5300` | `#FBF0DA` | `#F0D9A8` |
| Multa / risco alto | `#C9372C` | `#C9372C` | `#B42318` | `#FBEAE7` | `#F2C3BC` |

**Outras cores**

- Verde de economia positiva: `#4E9A6E`.
- Mapa dos picos, 6 classes: 0 `#F1F1EE` · até 20% do máximo `#F4D99F` · até 40% `#EDC277` · até 60% `#DD9F3E` · até 80% `#BD7D1C` · acima `#8C5207`. As classes são relativas ao maior valor da grade, porque o total de leituras muda com o arquivo.
- Sem dados: hachurado com `#ECECE7`.

**Tipografia e forma**

- IBM Plex Sans em tudo, com `font-variant-numeric: tabular-nums`.
- Tamanhos: título de página 28px/600, título de card 16px/600, rótulos 13–14px/500, número herói 52–64px/600 com `letter-spacing: -0.02em`.
- Cards com raio de 12px, borda de 1px e padding de 24px. Botões com pelo menos 40px de altura (44px no celular).
- Status sempre com ícone + texto, nunca só cor.
- Formato brasileiro com `Intl.NumberFormat('pt-BR')`: 79,2 kW · R$ 3.402,96 · 31/12/2017 · 13h · dez/17.

### 7.4 Telas

**Layout comum**

- **Menu lateral:** Painel, Histórico, Contrato ideal, Alertas e relatórios e Configurações. "Alertas e relatórios" mostra um contador vermelho com a quantidade de alertas.
- **Rodapé do menu:** empresa, cidade, grupo e modalidade, vindos da configuração.
- **Cabeçalho:** título, selo da fonte e "Contratado X kW · Limite de multa Y kW · Editar contrato".
  - O selo diz "Memória de massa · dados até 31/12/2017", com a data de `GET /medicoes/resumo`, ou "Nenhum arquivo enviado".
- **No celular:** o menu vira uma barra superior recolhível.
- **API fora do ar:** cada bloco mostra "API indisponível" com o botão "Tentar de novo". Não há dados de exemplo no front.

**Primeiro acesso.** O `app/page.tsx` (server component) busca `${API_URL}/configuracao` direto no FastAPI. Com 404, faz `redirect('/configuracoes')`; com 200, `redirect('/painel')`; se o FastAPI estiver fora, vai para `/painel`.

- **Renderização dinâmica:** use `fetch` com `cache: 'no-store'` e/ou `export const dynamic = 'force-dynamic'`, conforme a versão instalada. Confira no `next build` que a página não foi pré-renderizada.
- **`redirect()` fora do `try/catch`:** ele funciona lançando uma exceção, que o `catch` engoliria.

**Barra de demonstração** (só com `NEXT_PUBLIC_DEMO=true`): uma faixa de borda tracejada no topo do painel com:

- o status da API ("API conectada" ou "API offline", via `GET /api/openapi.json`);
- qual previsão está em uso ("modelo LightGBM" ou "previsão simples").

**`/configuracoes`** (`Configuracoes.dc.html`)

- **Carregamento** com `GET /configuracao`:
  - **404 é primeiro acesso:** o formulário vem com os valores da seção 9.3 como sugestão.
  - **API fora do ar:** aviso "API indisponível" e botão Salvar desabilitado. Não salve em lugar nenhum fingindo que deu certo.
- **Seções numeradas:** 1 Dados da empresa, 2 Contrato de demanda, 3 Fonte de dados.
- **Prévia ao vivo** "Limite de multa: 84,0 kW" enquanto a pessoa digita a demanda (`limiteMulta` de `regras.ts`). Aceita vírgula decimal e mostra até 2 casas, como em 85,05.
- **Barra de zonas:** acompanha a digitação, com segmentos sólidos `#8A948D` (dentro), `#E3A21F` (tolerância) e `#C9372C` (multa), rótulos embaixo e sem marcas.
- **Campos:**
  - tarifa de demanda;
  - horário de ponta, com a duração calculada;
  - margem de segurança do contrato recomendado (pode ficar em "Opções avançadas");
  - tolerância como texto fixo: "Tolerância: 5% (regra da ANEEL)". O front envia 0,05.
- **Validação** no front antes de enviar, e a do backend (422) embaixo de cada campo, usando o `campo` da resposta. Se o 422 vier no formato padrão do FastAPI (`loc`, `msg`), monte o campo juntando com ponto os itens de `loc` depois de `body` (exemplo: `empresa.razao_social`).
- **Fonte de dados:** cards de rádio.
  - "Memória de massa (envio de arquivo)": selecionado.
  - "Medidor IoT (tempo real)": desabilitado, com o selo "Em breve" e a nota "Proposta apresentada na parte teórica".
- **"Salvar e ir para o painel":** faz `PUT /configuracao`. Com sucesso, invalida as consultas (o cabeçalho e o painel mostram o novo limite na hora) e vai para `/painel`.

**`/painel`, sem arquivo** (`GET /medicoes/resumo` responde 404). No lugar dos blocos, um card grande "Envie a memória de massa" com:

- a área de arrastar e soltar ou clicar, que aceita `.csv` e envia para a importação do Nicolas (`POST /api/importacao/memoria-massa`, seção 6.1), com `nome_predio`, `demanda_contratada` e `unidade` = `kW` tirados de Configurações;
- a linha de formato: "CSV da distribuidora (Data;Hora;kW) ou data_hora,demanda_kw";
- o botão secundário "Usar arquivo de exemplo", com a nota "prédio real do BDG2, 2016–2017", que chama `POST /medicoes/exemplo`;
- durante o envio, o estado "Lendo o arquivo..." com progresso indeterminado;
- erros do backend mostrados com o `detail` que vier, com o botão "Tentar outro arquivo";
- depois de um envio aceito, o front busca o resumo de novo. Se o resumo não mudou, porque a importação ainda não salvou no contrato da seção 5.2, mostra "Arquivo lido, mas a importação ainda não salvou as leituras" no lugar dos blocos.

**`/painel`, com arquivo** (`Main.dc.html`, ramo `isMassa`). Tudo vem do backend.

1. **Destaque** (`/analise/resumo`):
   - "R$ X em multas de ultrapassagem nos últimos N meses", com a nota "Regra da ANEEL com a tarifa cadastrada; sem impostos";
   - chip "Multa em X de N meses";
   - bloco "Contrato recomendado: Y kW (hoje: 80 kW) · economia estimada de R$ Z no período", com o botão "Simular contrato". Se o recomendado for o atual: "Seu contrato já está no ponto de menor custo".
2. **Arquivo de medição** (`/medicoes/resumo`):
   - nome, origem (enviado ou exemplo), período, intervalo e total de leituras;
   - aviso âmbar com os meses sem dados;
   - botões "Enviar outro arquivo" e "Usar arquivo de exemplo".
3. **Pico de demanda por mês** (`/analise/picos-mensais`, `BarChart`):
   - barras coloridas pela `situacao`;
   - meses sem dados como lacuna hachurada "sem dados";
   - linhas na contratada e no limite, com rótulos à direita;
   - valor escrito só no maior pico e no último mês; os outros aparecem no tooltip, com data e hora do pico;
   - alternador "Gráfico | Tabela";
   - com 24 meses, as barras afinam. No celular, rolagem horizontal dentro do card.
4. **Previsão para o próximo mês** (`/previsao/proximo-mes`):
   - chip de risco (baixo, médio ou alto);
   - "Consumo previsto: X MWh";
   - "Pico típico previsto: A a B kW";
   - o aviso sazonal e a lista dos mesmos meses nos anos anteriores, com pico e situação;
   - tag "Previsão por IA" com tooltip, que abre também com foco do teclado. O texto do tooltip está no `backend/model/README.md`. Se a resposta vier com `baseline`: "Previsão simples: modelo indisponível";
   - link "Simular contrato".
5. **Mapa dos picos** (`/analise/mapa-picos`):
   - grade CSS de 7 × 24 com a escala da seção 7.3;
   - faixa do horário de ponta marcada;
   - contorno no maior bloco;
   - linha de leitura ao passar o mouse: "Quinta, 15h–16h: 12 leituras acima de 80 kW".
6. **Recomendações** (`/analise/recomendacoes`): cards com título, detalhe e ação.

**`/contrato-ideal`** (`Contrato.dc.html`, com `/analise/contrato-ideal`).

- **Recomendação:** comparativo "Hoje X kW: R$ … · N meses com multa" contra "Recomendado Y kW: R$ … · M meses com multa · folga mínima Z kW".
- **Card "Por que Y kW e não W kW?":** quando o recomendado for diferente do ótimo, mostra a diferença de custo e a folga mínima de cada um. Quando forem iguais: "O contrato de menor custo já tem folga".
- **Card "Para zerar as multas":** "S kW, R$ … a mais no período", a partir de `sem_multa`. Se `sem_multa` vier nulo: "Nenhum contrato da faixa zera as multas".
- **Simulador:**
  - controle deslizante com a faixa da `curva`, com atalhos para o atual, o ótimo, o recomendado e o sem multa;
  - indicadores do ponto escolhido: custo no período, economia contra o atual, meses com multa e folga no pior mês;
  - gráfico de economia por valor de contrato: área verde acima de zero e vermelha abaixo, marcadores do atual, do ótimo e do recomendado, linha vertical no valor simulado e clique para simular.
- **Tabela mês a mês, atual × recomendado** (`mes_a_mes`): situação e custo, linha de total e meses sem dados marcados.
- **Premissas:**
  - tolerância de 5% (ANEEL);
  - tarifa cadastrada;
  - período e meses sem dados;
  - valores sem impostos;
  - outras penalidades fora da conta.

**`/alertas`:** a lista de `GET /alertas`, com nível (ícone + texto), título, mensagem e link para o detalhe. Sem alertas: "Nenhum alerta: sem risco previsto e sem multas no período".

**`/alertas/[id]`** (`Celular-Alerta.dc.html`, adaptado): detalhe, primeiro no celular. No desktop vira uma coluna central de cerca de 640px.

- **Risco do próximo mês:**
  - chip e título;
  - o aviso sazonal;
  - os mesmos meses nos anos anteriores, num minigráfico de barras com a linha do limite;
  - o pico típico previsto pelo modelo, com a nota "o modelo prevê o consumo típico; o risco vem do histórico";
  - "O que fazer", com as recomendações;
  - botão "Ver no painel".
- **Multa registrada:**
  - mês, pico com data e hora, limite e excedente;
  - valor da ultrapassagem;
  - botão "Simular contrato".

**`/historico`:** tabela de todos os meses (`/analise/picos-mensais`) com mês, pico, quando, situação, consumo (kWh), demanda faturada e ultrapassagem. Tem linha de total e meses sem dados marcados. Use o mesmo vocabulário visual.

### 7.5 Regras no front (`src/lib/`)

- **`regras.ts`:**
  - `limiteMulta(contratada, tolerancia = 0.05)`, para a prévia de Configurações;
  - o mapa de rótulos, ícones e cores por `Situacao` e por risco.
- **`format.ts`:** kW, R$, kWh e MWh, datas, mês abreviado e hora, todos em pt-BR.
- **Testes (Vitest):**
  - `limiteMulta(80)` = 84;
  - `limiteMulta(85)` = 89,25;
  - formatação de 3402.96 → "R$ 3.402,96";
  - `'2017-12'` → "dez/17";
  - 79.25 → "79,3 kW".

## 8. Notificação do sistema: fora do escopo

Com a memória de massa, os avisos são mensais (risco do próximo mês e multas registradas) e ficam na tela "Alertas e relatórios" (seções 5.5 e 7.4). Não implemente a notificação do sistema operacional (Notifications API) nem um botão de alerta de teste. O aviso imediato faz parte da fase IoT, apresentada só na parte teórica.

## 9. Dados de referência

### 9.1 Arquivo de exemplo (Bobcat)

`backend/exemplos/memoria_massa_bobcat.csv` traz dados reais do BDG2, prédio `Bobcat_office_Melody`, de 2016 a 2017, de hora em hora. Tem meses sem dados, como abr–jun/2016. Com 80 kW, tarifa de R$ 12,89 e margem de 1 kW, todos os valores esperados estão em `backend/model/README.md`, na seção "Valores de conferência":

- leituras e meses;
- meses com multa;
- ultrapassagem total, que confere com a conta do notebook;
- custo com 80 kW;
- ótimo, recomendado e sem multa;
- previsão do próximo mês.

Os testes do backend usam esses números.

### 9.2 Teste unitário da simulação (picos do protótipo)

Picos (kW): set/25 76,1 · out/25 78,8 · nov/25 88,7 · dez/25 89,9 · jan/26 sem dados · fev/26 86,7 · mar/26 87,5 · abr/26 90,89 · mai/26 77,3 · jun/26 77,5 · jul/26 74,9.

Com contratada de 80 kW, tarifa de R$ 14,43, margem de 1 kW e faixa fixa de 75 a 95, `simular_contrato` deve produzir:

| Contratada | Custo (R$) | Economia (R$) | Meses com multa | Folga no pior mês (kW) |
|---|---|---|---|---|
| 75 | 14.045,73 | −610,39 | 6 | −12,14 |
| 76 | 13.806,19 | −370,85 | 5 | −11,09 |
| 77 | 13.689,31 | −253,97 | 5 | −10,04 |
| 78 | 13.591,18 | −155,84 | 5 | −8,99 |
| 79 | 13.507,49 | −72,15 | 5 | −7,94 |
| **80 (atual)** | 13.435,34 | 0,00 | 5 | −6,89 |
| 81 | 13.363,19 | 72,15 | 5 | −5,84 |
| 82 | 13.291,04 | 144,30 | 5 | −4,79 |
| 83 | 13.112,11 | 323,23 | 4 | −3,74 |
| 84 | 12.967,81 | 467,53 | 3 | −2,69 |
| 85 | 12.846,60 | 588,74 | 2 | −1,64 |
| 86 | 12.748,48 | 686,86 | 1 | −0,59 |
| **87 (ótimo)** | 12.683,83 | 751,51 | 0 | 0,46 |
| **88 (recomendado e sem multa)** | 12.777,62 | 657,72 | 0 | 1,51 |
| 89 | 12.882,96 | 552,38 | 0 | 2,56 |
| 90 | 12.999,84 | 435,50 | 0 | 3,61 |
| 91 | 13.131,30 | 304,04 | 0 | 4,66 |
| 92 | 13.275,60 | 159,74 | 0 | 5,71 |
| 93 | 13.419,90 | 15,44 | 0 | 6,76 |
| 94 | 13.564,20 | −128,86 | 0 | 7,81 |
| 95 | 13.708,50 | −273,16 | 0 | 8,86 |

Outros casos:

- ultrapassagem com 80 kW: R$ 1.260,89;
- nov/25 com 80 kW: R$ 1.279,94 de faturada + R$ 251,08 de ultrapassagem;
- `custo_mes(80, 86.3, 14.43)`: ultrapassagem de R$ 181,82.

### 9.3 Sugestão do primeiro acesso (`configuracao.exemplo.json`)

| Campo | Valor |
|---|---|
| Empresa | Distribuidora Exemplo Ltda., Recife/PE, Grupo A, tarifa verde |
| Demanda contratada | 80 kW |
| Tolerância | 0,05 |
| Tarifa de demanda | R$ 12,89/kW (fatura da Nazaria) |
| Horário de ponta | 17:30 a 20:30 |
| Fonte de dados | memoria_massa |
| Margem de segurança | 1,0 kW |

## 10. Responsividade e acessibilidade

- Desktop em 1440px é o principal, mas tudo funciona em 390px: menu no topo, grids em uma coluna, e gráficos e tabelas largos com rolagem horizontal dentro do card.
- Use elementos reais (`<button>`, `<a>`, `<label>` + `<input>`), `aria-label` em botões só com ícone e foco visível. A área de envio de arquivo funciona com o teclado (Enter abre o seletor).
- Texto com contraste de 4,5:1; os tokens já passam.
- Status sempre com ícone + texto. Cada gráfico tem `aria-label` com um resumo, e o de picos mensais tem a alternativa em tabela.

## 11. Etapas

Primeiro o backend inteiro, depois o front. Os commits seguem a seção 4.2.

**Backend**

1. **B1, base do backend** (commits 1 a 4):
   - o título da API;
   - dependências e testes;
   - a regra dos 5%;
   - a configuração.
2. **B2, memória de massa** (commit 5): envio, exemplo e resumo.
3. **B3, análise e contrato ideal** (commit 6).
4. **B4, previsão do próximo mês e alertas** (commit 7).

**Front** (um commit só, no fim)

5. **F1, base:** tokens no Tailwind, fonte, layouts e rotas, proxy, TanStack Query, tipos, cliente, scripts e primeiro teste.
6. **F2, `regras.ts` e `format.ts`,** com os testes da seção 7.5.
7. **F3, Configurações e primeiro acesso.**
8. **F4, painel sem arquivo:** envio do arquivo e botão de exemplo.
9. **F5, painel com arquivo:** os 6 blocos.
10. **F6, contrato ideal.**
11. **F7, alertas.**
12. **F8, histórico.**
13. **F9, fechamento:**
    - revisão em 390px e acessibilidade;
    - `lint`, `build`, `test` e `pytest`;
    - `README.md` na raiz explicando `backend/` e `frontend/`, como instalar e rodar, o `demo:zerar` e o roteiro da seção 13.

## 12. Pronto quando

- **Testes:** `pytest` passa no backend; `npm run lint`, `npm run build` e `npm test` passam no front.
- **Organização:** a raiz tem só as pastas `backend/` e `frontend/`.
- **Código do Nicolas:** o diff dos arquivos dele mostra só o que está na seção 4.1, e nenhum `.pyc` entrou nos commits.
- **Commits:** os do backend na ordem da seção 4.2, cada um com o `pytest` passando; o front num commit só.
- **Fluxo completo:**
  1. Depois do `npm run demo:zerar`, o primeiro acesso leva às Configurações.
  2. Salvar 80 kW e R$ 12,89 leva ao painel vazio.
  3. Enviar o arquivo do Bobcat faz o painel mostrar os números do `model/README.md`: multas, meses com multa, picos e previsão do próximo mês. Pelo botão de exemplo, isso já funciona com a nossa parte. Arrastando o arquivo, funciona quando a importação do Nicolas salvar no contrato da seção 5.2.
- **Mudar a contratada** em Configurações (exemplo: 90 kW) muda os meses com multa e os valores em todas as telas, batendo com a curva do contrato ideal.
- **Contrato ideal:** atual, ótimo, recomendado e sem multa iguais ao `model/README.md`.
- **Arquivo inválido** mostra a mensagem que a importação devolver.
- **Alertas:** a lista mostra o risco do próximo mês e as multas registradas, e cada um abre o detalhe.
- **Backend parado:** os blocos mostram "API indisponível" sem quebrar a página.
- **Modo apresentação:** com o build feito na véspera, `npm run apresentacao` sobe backend e front, e tudo abre em `http://localhost:3000`.

## 13. Roteiro da apresentação (para o README da raiz)

1. `npm run demo:zerar` e `npm run apresentacao`; abrir `http://localhost:3000`.
2. **Configurações:** digitar 80 kW e R$ 12,89. O limite de 84 kW aparece enquanto digita. Mostrar o IoT como "Em breve".
3. **Envio:** arrastar `backend/exemplos/memoria_massa_bobcat.csv`. Se arrastar der problema, usar o botão de exemplo.
4. **Painel:**
   - quanto o prédio perdeu com multas e em quantos meses;
   - os picos por mês;
   - a previsão do próximo mês (consumo pelo modelo, risco pelo histórico);
   - o mapa dos horários de pico;
   - as recomendações.
5. **Contrato ideal:** mexer no simulador; mostrar o recomendado e quanto custaria zerar as multas.
6. **Ao vivo:** mudar a contratada para 90 kW em Configurações e voltar ao painel.
7. **Alertas:** abrir o alerta de risco do próximo mês.
8. **Parte teórica:** o modo IoT com o protótipo. Contra o pico súbito, o que funciona é reagir em minutos, cortando carga antes de o intervalo de 15 minutos fechar. Nessa fase, o aviso chegaria na hora, como notificação.
