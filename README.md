# Sistema de Gestão Industrial — Tubonord

Sistema de PCM: apontamento de produção, paradas, manutenção (OS), PCP/pedidos, RH e cadastros. Front-end estático (HTML/JS puro) + uma Netlify Function como backend compartilhado.

## Banco de dados compartilhado (Netlify Blobs)

O sistema não depende mais só do navegador de cada um. Existe uma Netlify Function (`netlify/functions/db-store.mjs`) que guarda a base inteira num **Netlify Blob** — um key/value store embutido no próprio Netlify, incluído no plano Free, sem precisar criar conta em Supabase nem em nenhum outro serviço.

Como funciona na prática:
- Ao abrir o app, ele busca a base mais recente no servidor (`GET /api/db`).
- A cada alteração salva (apontamento, pedido, cadastro etc.), o app manda a base inteira pro servidor (`POST /api/db`) — a versão mais recente sempre vence (last-write-wins).
- A cada 25 segundos, o app confere se alguém mais salvou algo novo e atualiza a tela sozinho.
- Se o servidor não responder (por exemplo, se você abrir o `index.html` direto do computador, fora do Netlify), o sistema cai de volta pro modo local (`localStorage`) sem travar — só não fica mais sincronizado até reconectar. O rodapé da barra lateral e a tela de login mostram esse status ("🔄 Sincronizado" ou "⚠ Sem servidor").

**Isso só funciona depois do deploy no Netlify** (precisa das Functions rodando) — não funciona abrindo o arquivo local no navegador nem em outro host de arquivo estático genérico.

### O que isso NÃO resolve (limitações que continuam)
- **Concorrência simples**: se duas pessoas salvarem ao mesmo tempo, quem salvar por último sobrescreve o que o outro salvou (não há mesclagem/lock). Para o tamanho de equipe atual isso tende a ser raro, mas é bom saber.
- **Sem histórico/versionamento**: só existe a versão mais recente salva. Não dá pra "desfazer" uma sobrescrita.
- **Banda**: a base inteira (alguns MB) trafega a cada salvamento e a cada sincronização periódica. Para o volume de dados e de usuários de hoje isso cabe tranquilo no plano Free do Netlify, mas é algo a observar se a base crescer muito mais.

### Deploy
1. Publique a pasta raiz no Netlify (contém `index.html`, `data.js`, `support.js`, `assets/`, `netlify.toml`, `package.json`, `netlify/functions/`).
2. O Netlify detecta o `netlify.toml`, instala `@netlify/blobs` (via `package.json`) e publica a function automaticamente — não precisa configurar nada manualmente no painel.
3. Depois do primeiro deploy, teste abrindo o site e checando o rodapé da barra lateral: deve aparecer "🔄 Sincronizado".

## Dados
`data.js` foi alimentado com dados **reais** extraídos de:
- `F-23_Controle_de_Produção_Diária.xlsx` (abas "F-23" e "F-23 (2)") — apontamentos de produção e paradas, ago/2025 até hoje
- `PCP_Tubonord_2025.xlsx` (abas Tub3/Tub7/Tub8/Cone) — produtos/pedidos, cruzados com o F-23 pela chave composta **máquina + NRO CONTROLE PEDIDO** (o mesmo código de pedido se repete entre as abas Tub7 e Tub8 na planilha original, então a chave precisa incluir a máquina para não misturar pedidos diferentes)
- `Metas_abr_2026_-_Tubonord_.xlsx` — scorecard mensal 2026

Sistema exclusivo da Tubonord — não há dados da Tubocone.

O **status de cada pedido** (Em Aberto / Em Produção / Pronto e Entregue / etc.) é recalculado cruzando a produção real apontada contra a quantidade solicitada, respeitando a unidade do pedido (kg ou peças) — pedidos com ≥90% da quantidade produzida são tratados como finalizados.

OS de manutenção e Ausências (RH) começam **vazias de propósito** — não havia arquivo real para essas áreas; o sistema está pronto para receber esses registros a partir de agora.

### Importar planilhas atualizadas
Usuários Administrador podem subir uma F-23 e/ou PCP atualizadas direto pela aba **Cadastros** → "Importar planilhas reais". O processamento roda no navegador (usa a biblioteca SheetJS via CDN) e substitui produção/pedidos pelos dados do arquivo enviado.

## Login
Tela de login com dois perfis: **Administrador** (acesso a Cadastros e gestão de usuários) e **Usuário** (operacional, sem Cadastros). Contas iniciais em `data.js` (`usuarios`) — troque as senhas em produção pela aba Cadastros → Usuários.

⚠️ Autenticação é client-side (checagem de usuário/senha roda no navegador, sem sessão de servidor) — mesmo nível de proteção que o cadeado de "valores" já existente. Não é adequado para dados verdadeiramente sigilosos.

## Agente IA (Google Gemini)

A aba "Agente IA" usa uma Netlify Function (`netlify/functions/ai-chat.mjs`) que chama a API do Google Gemini — a chave fica só no servidor, nunca aparece no navegador.

**Para ativar, é obrigatório configurar a chave:**
1. Crie uma chave gratuita em https://aistudio.google.com/apikey (conta Google).
2. No Netlify: **Site configuration → Environment variables → Add a variable**.
3. Nome: `GEMINI_API_KEY` · Valor: a chave gerada.
4. Faça um novo deploy ("Trigger deploy") para a variável entrar em vigor.

Sem essa variável configurada, o chat mostra uma mensagem de erro clara em vez de travar — o "Diagnóstico Automático" ao lado (baseado em regras, sem IA nenhuma) continua funcionando normalmente.

## Ordens de Serviço geradas automaticamente (MTTR/MTBF)

`osList` não começa mais vazia: 318 OS foram geradas a partir dos eventos reais de "Manutenção Mecânica/Elétrica Programada/Não Programada" já apontados no F-23 (mesma parada real, só reclassificada como OS — nada foi inventado). Essas OS ficam marcadas com `origem:'f23-auto'` e são regeneradas automaticamente sempre que uma F-23 nova é importada pela aba Cadastros, sem apagar OS lançadas manualmente pela equipe de manutenção.

## Pendências conhecidas
- ~173 produtos de Conicaleira não tinham "Velocidade Alvo" no PCP; foi estimada pela mediana real de produção e marcada com `velAlvoEstimado:true`.
- Sem histórico/auditoria de quem alterou o quê — o backend guarda só a foto mais recente da base.

## Estrutura de arquivos
```
index.html                     app inteiro (template + lógica)
data.js                        base inicial (seed) com dados reais
support.js                     runtime genérico do framework de template (não editar)
assets/                        logos
netlify.toml                   aponta o diretório de functions
package.json                   dependência @netlify/blobs
netlify/functions/db-store.mjs  Function do backend compartilhado (GET/POST /api/db)
netlify/functions/ai-chat.mjs   Function do Agente IA (proxy seguro para o Gemini)
```
