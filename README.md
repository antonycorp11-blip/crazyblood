# Hemofarm

Jogo incremental/idle de gerenciamento vampírico. **TypeScript + Phaser 3 + Vite.** Web, desktop e mobile a partir de um único projeto responsivo (landscape é o alvo principal).

Arte e áudio reaproveitados do jogo irmão (`../hemofarmclaude`). Inventário completo e lista do que falta em [ASSETS.md](ASSETS.md).

---

## Instalar, rodar, buildar

```bash
npm install
npm run dev          # http://localhost:5180 (também exposto na rede local para testar no celular)
npm run build        # typecheck + build de produção em dist/
npm run preview      # serve o dist/
npm run assets:sync  # recopia os assets do jogo irmão para public/
```

O build usa caminhos relativos (`base: './'`), então `dist/` funciona em sub-pastas e iframes de portais (CrazyGames, Poki, ATHG).

---

## Arquitetura

```
src/
  core/        Game (boot + loop), GameState, Store, EventBus, Constants, GameConfig, Analytics
  systems/     Economy, Production, Upgrade, Human, Contract, Mission, Tutorial, Prestige,
               OfflineProgress, Save, AudioManager
  data/        TUDO que é balanceamento/conteúdo: progression, upgrades, contracts (NPCs/itens),
               missions, tutorial, prestige, farmLayout, assets, localization
  scenes/      BootScene → PreloadScene → FarmScene (Phaser só renderiza o mundo)
  world/       FarmMap (camada estática), FarmVisuals (camada que cresce), FarmVisualState,
               TankView, CameraController, Ambience, FloatingText, iso
  entities/    Human, VampireWorker
  ui/          UI em DOM sobre o canvas: UIRoot, components/, screens/, layouts/, styles.css
  platform/    PlatformAdapter (+ LocalPlatformAdapter)
```

Princípios:

- **Estado único e serializável** (`core/GameState.ts`). Sistemas mutam o estado; nada visual é salvo. O visual da fazenda é **derivado** do progresso (`world/FarmVisualState.ts → getFarmVisualState()`).
- **Sistemas desacoplados** via `EventBus` tipado. A cena e a UI escutam eventos; não importam uma à outra.
- **Economia por tempo real, nunca por frame.** `Game.loop()` avança por `dt` de relógio; lacunas > 5 s (aba oculta, aparelho dormindo) vão pelo caminho offline (`OfflineProgressSystem`), que usa fórmula fechada.
- **UI em DOM, mundo em Phaser.** Texto nítido em qualquer DPI, layout por CSS Grid, safe-area do iPhone e acessibilidade nativa. Os dois modos (landscape/portrait) usam o **mesmo DOM**; só o CSS muda (`ui/layouts/ResponsiveLayout.ts` + `styles.css`).
- **Data-driven.** Upgrades, contratos, NPCs, missões, tutorial, árvore de Legacy, layout da fazenda e assets vêm de `src/data/`.

### Loop do jogo

Humanos → produzem sangue no **tanque** → coleta (toque no tanque; depois **Auto Collect** com vampiros coletores) → estoque de sangue → **vender** (ouro) ou **contratos** no Market (ouro + essência) → comprar humanos/upgrades → fazenda cresce visualmente → (0.4) New Lineage.

---

## Como adicionar…

### Um upgrade
1. Adicione uma entrada em `src/data/upgrades.ts` (`id`, `nameKey`, `descKey`, `icon`, `category`, `maxLevel`, `baseCost`, `costGrowth`, `effectType`, `effectValue`).
2. Adicione as chaves de texto em `src/data/localization.ts` (en-US e pt-BR).
3. Se for um `effectType` novo, trate-o em `UpgradeSystem.getEffect()` e use-o em `ProductionSystem`.
4. A tela Upgrades lista por `category` automaticamente. Para aparecer nos cards rápidos da Farm, adicione o id em `QUICK` (`ui/UIRoot.ts`).

### Um NPC
1. Retrato em `public/assets/portraits/npc_<id>.webp` e chave em `src/data/assets.ts`.
2. Entrada em `NPCS` (`src/data/contracts.ts`): `titleKey`, `dialogueKeys`, `contractPreferences`, `unlockAfterContracts`.
3. Textos em `localization.ts`.

### Um contrato / item
Contratos são gerados a partir das preferências do NPC (tamanho em "segundos de produção", prazo, raridade). Para um item novo (ex.: Garlic), adicione em `ITEMS` com `available: true` quando o jogo souber produzi-lo e trate `ContractSystem.have()/deliver()`.

### Um Farm Stage / elemento visual
1. Slot/posição em `src/data/farmLayout.ts` (grid isométrico; `iso(i, j)`).
2. Regra em `getFarmVisualState()` (`world/FarmVisualState.ts`) dizendo **quando** aparece.
3. Se for um tipo novo de objeto, desenhe-o em `FarmVisuals.sync()`. Tudo que aparece ganha pop-in automático.
4. Limiares de estágio por população: `Progression.stageHumanThresholds`.

### Um asset
1. Coloque o arquivo em `public/assets/<categoria>/<id>.<ext>`.
2. Registre em `ASSETS` (`src/data/assets.ts`) com o bundle (`boot`, `farm`, `market`). Código só referencia **chaves**, nunca caminhos.
3. Para trocar um placeholder pela arte final: substitua o arquivo no mesmo caminho e remova `placeholder`/`generated` da entrada. Nenhuma lógica muda.

---

## Testar

**Mobile:** `npm run dev` já expõe a rede local (`--host`); abra o IP mostrado no celular. No navegador desktop use o modo dispositivo (DevTools) em 390×844 (portrait) e 844×390 (landscape compacto).

**Offline:** jogue, feche a aba, volte depois de 1+ min → modal *While You Were Away*. Ou no Debug: **Simulate 1h offline**. Eficiência 50%, teto 8 h (`Progression.offlineEfficiency / offlineCapSec`). Sem Auto Collect, só o tanque enche.

**Save:** autosave a cada 15 s, ao trocar de tela, ao perder foco e ao fechar. Export/Import/Reset em Configurações. O save é versionado (`SAVE_VERSION` + `MIGRATIONS` em `SaveSystem.ts`) e passa por `StorageAdapter` — trocar `LocalStorageAdapter` por cloud/ATHG/Supabase não mexe no resto.

### Debug menu (só em `npm run dev`)
Botão **DEV** (canto superior direito) ou tecla <kbd>`</kbd>: +Gold, +Blood, +10 Humans, encher tanque, desbloquear Market/Legacy, pular tutorial, simular 1 h offline, resetar save, forçar Farm Stage (0–5). O **Dev HUD** no rodapé mostra FPS, resolução, layout, humanos, produção/s, estágio e status do save. Nada disso entra no build de produção.

---

## Balanceamento
Todos os números estão em `src/data/progression.ts` e `src/data/upgrades.ts`. Metas atuais da 0.1: 1ª compra < 30 s, Auto Collect 2–4 min, Market 3–5 min, 1º contrato 5–7 min.
