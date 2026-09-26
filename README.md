# Crazyblood — As Eras da Caçada

Incremental de captura em uma cidade 2D isométrica. Vampiros caçam humanos durante noites curtas, investem o sangue entre as caçadas e avançam por quatro eras: pré-história, medieval, contemporânea e futura.

## Jogar

```bash
npm install
npm run dev
```

No PC, clique nos humanos. No celular, toque neles. Cada humano precisa de vários golpes. Corredores fogem com mais velocidade; guardas contra-atacam e reduzem a vida. O alvo dourado é o contrato da cidade e escapa se demorar demais. Errar toques ou enfrentar guardas aumenta o alerta da cidade. Quando a noite termina, o sangue fica salvo no navegador.

Cada era contém cinco cidades. Capture o alvo nomeado, atinja a cota **na mesma noite** e sobreviva até o amanhecer para avançar. O alvo, as capturas de noites anteriores e o sangue acumulado não abrem cidades por si só. Ao concluir a quinta, hiberne para a próxima era: a árvore e o sangue recomeçam, mas um eco permanente aumenta dano e duração das noites. O objetivo final é capturar a Imperatriz Solaris e 1.000 humanos em uma única noite na última cidade, sobrevivendo até o amanhecer.

## Progressão

A árvore começa com dois poderes visíveis. Comprar um nó revela somente seus descendentes. Seus cinco caminhos ampliam a noite, a captura manual, os servos, o banco de sangue e os pulsos do eclipse. Servos e pulsos tornam as caçadas de multidões viáveis sem exigir milhares de cliques.

As quatro eras usam mapas isométricos com atlas PNG de construções, terreno e personagens. Vampiros, humanos e ícones da árvore têm arte própria; as poses dos personagens, capturas, morcegos, fogo, tráfego e a transição de noite para dia são animadas no canvas. A arte gerada da catedral serve de fundo para a árvore. O jogo separa o save desta versão das versões anteriores.

## Assets

As fontes de arte ficam em `art/source/` e os atlas carregados pelo jogo em `public/assets/sprites/`. Os atlas de humanos medievais, vampiros, cidades e habilidades foram gerados como arte original; os humanos das outras três eras foram desenhados em pixel art pelo pipeline local. Para reconstruir as folhas de sprites:

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/build_assets.py
```

## Desenvolvimento

```bash
npm run typecheck
npm run test:smoke
npm run build
```

O push para `main` dispara o deploy configurado em `wrangler.jsonc`.
