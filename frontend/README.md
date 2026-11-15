# frontend — Antevê

Next.js (App Router + TypeScript + Tailwind) + Recharts + TanStack Query +
next-themes.

Como rodar, estrutura do repositório e roteiro da apresentação estão no
[`README.md` da raiz](../README.md). A especificação está em
[`docs/frontend-spec.md`](docs/frontend-spec.md).

## Scripts

```bash
npm install              # primeira vez
npm run dev              # só o Next em http://localhost:3000
npm run dev:tudo         # Next + uvicorn do backend (ambiente .venv ativado)
npm run lint
npm test                 # Vitest (regras, formato, arquivo, globals.css)
npm run build
npm run apresentacao     # Next start + uvicorn para a apresentação
npm run demo:zerar       # apaga backend/data/{configuracao.json,medicoes.csv,medicoes_info.json}
```

## Estrutura

```
src/
  app/
    layout.tsx                      fonte (IBM Plex) + ThemeProvider + TanStack Query
    globals.css                     tokens :root + .dark + @theme inline
    page.tsx                        redirect de primeiro acesso
    (app)/
      layout.tsx                    menu + cabeçalho + BotaoTema
      painel/ contrato-ideal/ configuracoes/ alertas/ historico/
  telas/                            uma tela por rota, em client components
  api/
    cliente.ts                      fetch com timeouts 3 s / 60 s
    tipos.ts                        espelha a seção 6.2 da spec
    hooks/                          TanStack Query por recurso
  components/
    ui/ BotaoTema, EnvioArquivo
    painel/ CardDestaque, CardArquivo, CardPrevisao, CardRecomendacoes
    graficos/ PicosMensais, MapaPicos, EconomiaContrato, TooltipRecharts
    BarraDemonstracao.tsx
  lib/
    regras.ts arquivo.ts format.ts
scripts/zerar-demo.mjs
```
