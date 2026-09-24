# Changelog

## 0.1.1 — Loop incremental de verdade

### Added
- Marcos de população (10/25/50/100/200…): produção ×2 cada, com banner, brilho no mapa e barra de progresso no card.
- Nova Linhagem jogável: árvore de Legado com 18 nós (3 ramos × 6) com níveis e efeitos reais; confirmação e transição.
- Carroça de Entrega: venda automática do sangue coletado, reservando o que os contratos aceitos precisam (toggle AUTO).
- Tanque como gargalo: coleta automática limitada pela capacidade; aviso de sangue derramado e card "PRÓXIMO".
- Compra de humanos ×1 / ×10 / MÁX.
- Fazenda continua crescendo: 12 cercados, multidão além de 40 humanos, paliçada + portão, canos com fluxo, tanques extras.
- Dicas do Mordecai em momentos-chave; cadeia de objetivos estendida (inclui linhagens).
- `npm run sim`: simulador de balanceamento que roda os sistemas reais com um bot.
- Modo enxuto no celular (em pé e deitado): menos texto, objetivo em pílula, Mordecai compacto, toque duplo para recentralizar; ferramentas de debug só com `?dev` em telas de toque.

### Changed
- Curvas rebalanceadas pelo simulador (1º New Lineage ~30–45 min; cada linhagem rende ~3× a anterior).

## 0.1.0 — Foundation + Vertical Slice

### Added
- Projeto TypeScript (strict) + Phaser 3 + Vite, arquitetura modular (core / systems / data / scenes / world / entities / ui / platform).
- GameState único e serializável; EventBus tipado; Analytics interno (eventos prontos para um serviço futuro).
- Economia por tempo real: produção → tanque → coleta manual/automática → estoque → venda.
- Humanos com custo exponencial (25 × 1.12ⁿ), capacidade por Expand Estate.
- Upgrades data-driven: Auto Collect, Expand Estate, Blood Processing, Bigger Tank, Merchant Relations, Delivery Cart.
- Market com 3 slots de contrato (AVAILABLE → ACTIVE → COMPLETED/EXPIRED), 6 NPCs (3 iniciais + 3 desbloqueáveis), raridades, refresh grátis com timer e refresh pago.
- Cadeia de objetivos (missões) com recompensa manual (CLAIM).
- Tutorial com Mordecai (balões curtos, destaque no controle certo, seta no tanque, pular).
- Legacy visível e selado (árvore de 3 ramos, progresso de desbloqueio, prévia de essência). PrestigeSystem pronto.
- Fazenda isométrica viva: humanos com comportamentos (andar, conversar, trabalhar, dormir, balões), vampiros coletores, Mordecai, tochas com brilho, morcegos, vaga-lumes.
- Progressão visual derivada do estado: cercados, estradas, construções, carroças e câmera que se afasta conforme a fazenda cresce.
- UI DOM responsiva: landscape (desktop/tablet), landscape compacto (celular deitado) e portrait (celular em pé), safe areas.
- Save em localStorage versionado, autosave, export/import/reset; progresso offline (50%, até 8 h) com modal.
- Localização en-US / pt-BR.
- AudioManager (música/SFX/UI, preferências salvas); PlatformAdapter (LocalPlatformAdapter).
- Debug menu e Dev HUD (somente em desenvolvimento).
- 147 assets reaproveitados do jogo irmão via `npm run assets:sync`.

### Placeholders conhecidos
`small_blood_tank` (procedural), `vampire_collector`, `button_green` (CSS), `logo_hemofarm` (tipográfico), `nav_farm`, `nav_market`, ícones de Legacy. Ver [ASSETS.md](ASSETS.md).
