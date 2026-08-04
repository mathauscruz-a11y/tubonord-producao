# Sistema de Gestão Industrial — Tubonord & Tubocone

Sistema single-page (HTML/JS puro, sem backend) de PCM: apontamento de produção, paradas, manutenção (OS), PCP/pedidos, RH e cadastros.

## Dados
`data.js` foi alimentado com dados **reais** extraídos de:
- `F-23_Controle_de_Produção_Diária.xlsx` (abas "F-23" e "F-23 (2)") — 4.172 apontamentos, ago/2025 a hoje
- `PCP_Tubonord_2025.xlsx` (abas Tub3/Tub7/Tub8/Cone) — 1.650 produtos/pedidos, cruzados com o F-23 pela chave NRO CONTROLE PEDIDO
- `Metas_abr_2026_-_Tubonord_.xlsx` — scorecard mensal 2026

OS de manutenção e Ausências (RH) começam **vazias de propósito** — não havia arquivo real para essas áreas; o sistema está pronto para receber esses registros a partir de agora.

## Login
Tela de login real com dois perfis: **Administrador** (acesso a Cadastros e gestão de usuários) e **Usuário** (operacional, sem Cadastros). Contas iniciais em `data.js` (usuarios) — troque as senhas em produção pela aba Cadastros > Usuários.

⚠️ Autenticação é 100% client-side (sem backend) — mesmo nível de proteção que o cadeado de "valores" já existente. Não é adequado para dados verdadeiramente sigilosos.

## Pendências conhecidas
- Faltam os arquivos de logo (`assets/logo-tubonord.png`, `assets/logo-tubocone.png`) — não foram enviados nesta rodada.
- ~176 produtos de Conicaleira não tinham "Velocidade Alvo" no PCP; foi estimada pela mediana real de produção e marcada com `velAlvoEstimado:true`.

## Deploy
Publique a pasta raiz (contém `index.html`, `data.js`, `support.js`, `assets/`) direto no Netlify.
