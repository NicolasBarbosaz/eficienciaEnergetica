# Protótipo do Antevê

Fontes das telas do protótipo de alta fidelidade, exportadas do canvas de design. São a referência visual e de conteúdo do front. A especificação completa está em `frontend/docs/frontend-spec.md`: a seção 7.2 explica este formato, e a 7.4, cada tela.

- `Main.dc.html`: Painel. O ramo de memória de massa (`isMassa`) é a tela do app. O ramo IoT (`isIot`) não será implementado: serve só de referência para a parte teórica da apresentação.
- `Painel-Memoria.dc.html`: abre o Painel no modo memória de massa.
- `Contrato.dc.html`: Contrato ideal (simulador).
- `Configuracoes.dc.html`: Configurações / onboarding. No app, o card do IoT fica desabilitado, com "Em breve".
- `Celular-Alerta.dc.html`: detalhe do alerta no celular. No app, o alerta é mensal: risco do próximo mês ou multa registrada.
- `Celular-Notificacao.dc.html`: notificação do sistema. Não entra no app; serve de referência para a fase IoT, na parte teórica.

Formato: HTML com estilos inline, `<sc-if>` (condicional), `<sc-for>` (repetição) e `{{variavel}}`. A lógica e os dados de exemplo ficam no `<script>` no fim de cada arquivo. Os arquivos dependem do runtime da ferramenta de design e não abrem sozinhos no navegador.

**Quando o protótipo e a especificação divergem, vale a especificação:**

- **Números:** todos os valores do protótipo (kW, R$, meses) são ilustrativos. No app, vêm do backend, calculados a partir do arquivo enviado.
- **Envio de arquivo:** funciona de verdade, com o botão "Usar arquivo de exemplo".
- **IoT:** não entra no app.
- **Alertas:** são mensais, com os textos da seção 5.5. A notificação do sistema não entra no app (seção 8).
