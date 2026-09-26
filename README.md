# CrazyBlood — As Eras da Caçada

Incremental **ativo** de noites curtas, inspirado em *Maktala: Slime Lootfest* e *Fill Up The Hole*: cada noite é uma rodada de 12–40 s cheia de loot; entre as noites você gasta o que colheu na Árvore de Sangue e a próxima noite fica visivelmente mais explosiva.

## Loop
1. **Covil** (tela inicial) — cresce com o seu progresso: velas, estandartes, fonte de sangue, caixões, troféus, morcegos.
2. **Caçada** — a aura de presas causa dano contínuo onde está o mouse (ou o dedo); clique/toque = mordida forte. Humanos soltam loot físico com raridade (frascos de sangue, dentes de ouro, fragmentos, Sangue Puro) que precisa ser recolhido. Humanos **shiny** raros valem ×10. A cidade enche em ondas; capturas enchem a barra de **Terror** até o **chefe** aparecer. Derrotar o chefe conquista a cidade.
3. **Amanhecer** — contagem do loot, **Dados de Sangue** (pares, trincas e jackpot) e escolha de um **Pacto** para a próxima noite.
4. **Árvore de Sangue** — ~100 nós em teia (arraste para navegar, pinça/scroll para zoom). Comprar um nó revela os vizinhos. Quatro recursos, poderes únicos (explosões em cadeia, morcegos, escrivão de dados…) e nós infinitos para o fim de jogo.

20 cidades em 4 eras (Pré-história → Futura). Cada era concluída dá um **Eco** permanente (×1,3 dano e sangue).

## Desenvolvimento
```bash
npm install
npm run dev
npm run test:smoke          # regras do jogo
node scripts/balance.mjs    # simula um jogador perfeito até a vitória (ritmo por cidade)
npm run build
```
- Código: `src/game/` (regras, sem DOM), `src/render/` (canvas), `src/main.ts` (telas), `src/sound.ts` (efeitos sintetizados).
- Balanceamento: `CITY_BALANCE` em `src/game/data.ts` e `TREE_BALANCE` + tabela de nós em `src/game/tree.ts`.
- `?reset` na URL apaga o save. Em `npm run dev`, `window.__cb.save` dá acesso ao save no console.
- Arte: atlas em `public/assets/sprites/` (fontes em `art/source/`, `python3 scripts/build_assets.py`). Novas artes: `python3 scripts/gen_image.py` (OpenAI; chave em `.env.local`).
- Deploy: push na `main` → Cloudflare (`wrangler.jsonc`).
