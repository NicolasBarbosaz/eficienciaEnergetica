# Antevê

> Veja o pico antes da multa.

Ajuda empresas do Grupo A a não pagar multa por ultrapassagem de demanda:
leia o arquivo de memória de massa, mostre quanto se perdeu com multas, quais
os meses e horários com pico, qual contrato custa menos e qual o risco do
próximo mês.

## Organização

```
eficienciaEnergetica/
  backend/   FastAPI (Nicolas) + nossos módulos de configuração, análise, previsão e alertas
  frontend/  Next.js (App Router + TypeScript + Tailwind + Recharts + TanStack Query)
```

A especificação completa está em [`frontend/docs/frontend-spec.md`](frontend/docs/frontend-spec.md).
Os `.dc.html` em `frontend/docs/prototipo/` são a referência visual do design
(não abrem diretamente no navegador — veja o [LEIA-ME](frontend/docs/prototipo/LEIA-ME.md)).

## Como rodar

### Pré-requisitos

- **Python 3.13** (os `.pyc` do Nicolas são cp313; os modelos LightGBM só abrem
  com versões compatíveis — `backend/requirements.txt` fixa).
- **Node.js 20+** com npm.

### Backend

```bash
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\activate         # PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest -q                        # confere a suíte (40 testes)
```

Para subir o servidor sozinho:

```bash
uvicorn app.main:app --reload    # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                      # Next em http://localhost:3000
```

Variáveis em `frontend/.env.local` (o `.env.example` traz o modelo):

- `API_URL` — endereço do backend. Padrão: `http://localhost:8000`.
- `NEXT_PUBLIC_DEMO=true` — liga a barra de demonstração no painel.

### Os dois juntos

Com o ambiente do backend ativado:

```bash
cd frontend
npm run dev:tudo          # sobe FastAPI --reload e Next dev em paralelo
```

Para zerar o estado de demonstração (apaga `configuracao.json`, `medicoes.csv`
e `medicoes_info.json`):

```bash
npm run demo:zerar
```

Para a apresentação (sem `--reload`, com build pronto):

```bash
npm run build             # roda uma vez antes (o next/font baixa a fonte)
npm run apresentacao      # na hora: sobe FastAPI e Next start
```

## Roteiro da apresentação

1. `npm run demo:zerar` e `npm run apresentacao`; abra `http://localhost:3000`.
   O app abre no modo do sistema; escolha claro/escuro pelo botão do cabeçalho
   antes de começar (em projetor, o claro costuma ler melhor).
2. **Configurações**: digite 80 kW e R$ 12,89. O limite de 84 kW aparece
   enquanto digita. Mostre o IoT como "Em breve".
3. **Envio**: arraste `backend/exemplos/memoria_massa_bobcat.csv` (formato da
   distribuidora, como o cliente baixaria). Para mostrar que aceita os dois
   formatos, arraste também `memoria_massa_bobcat_importacao.csv`: os números
   não mudam. Se arrastar der problema, use o botão **Usar arquivo de exemplo**.
4. **Painel**:
   - Quanto o prédio perdeu com multas e em quantos meses.
   - Picos por mês.
   - Previsão do próximo mês (pico típico pelo modelo LightGBM, risco pelo
     histórico).
   - Mapa dos horários de pico.
   - Recomendações.
   - Alternar modo claro/escuro pelo botão do cabeçalho.
5. **Contrato ideal**: brinque com o simulador; mostre o recomendado e quanto
   custa zerar as multas.
6. **Ao vivo**: mude a contratada para 90 kW em Configurações e volte ao
   painel — o limite e os valores atualizam em toda a UI.
7. **Alertas**: abra o alerta de risco do próximo mês.
8. **Parte teórica**: o modo IoT, com o protótipo. Contra o pico súbito, o que
   funciona é reagir em minutos, cortando carga antes de o intervalo de 15
   minutos fechar. Nessa fase, o aviso chegaria na hora, como notificação.

## Testes

- Backend: `cd backend && pytest -q` (40 testes — rotas existentes, configuração,
  medições, análise, previsão, alertas e os dois formatos de importação).
- Frontend: `cd frontend && npm run lint && npm run build && npm test`.
