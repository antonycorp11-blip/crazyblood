# Hemofarm — Colheita da Lua Rubra

Jogo incremental manual de fazenda de sangue, feito em TypeScript e Vite. A arte usa pixel art cartunizada de inspiração 32-bit e a interface se adapta a PC e celular.

## Jogar

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. No PC, clique no fruto ou pressione Espaço. No celular, toque no fruto e use a navegação inferior.

## Objetivo

Restaure a Lua Rubra completando sete rituais. Cada ritual exige uma quantidade de sangue colhida **naquela rodada**, reinicia o sangue e as melhorias, e aumenta permanentemente a força dos toques em 1,8×. O sétimo ritual conclui a história; a colheita pode continuar depois.

Não existe produção automática ou progresso offline. As melhorias aumentam o sangue por toque, a chance e potência de críticos e o bônus de combo. Trinta colheitas carregam o Surto da Lua, ativado manualmente para multiplicar a colheita por 12 segundos.

O jogo salva automaticamente no navegador. O save antigo da versão de gerenciamento usa outra chave e permanece intacto.

## Estrutura

- `src/incremental/data.ts`: melhorias, rituais e formatação.
- `src/incremental/game.ts`: regras e persistência.
- `src/main.ts`: interface e interação.
- `src/style.css`: HUD responsivo e efeitos visuais.
- `public/assets/eclipse/`: arte nova da fazenda e do fruto.

## Build

```bash
npm run typecheck
npm run build
```
