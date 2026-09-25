# Crazyblood — As Eras da Caçada

Incremental de captura em uma cidade 2D isométrica. Vampiros caçam humanos durante noites curtas, investem o sangue entre as caçadas e avançam por quatro eras: pré-história, medieval, contemporânea e futura.

## Jogar

```bash
npm install
npm run dev
```

No PC, clique nos humanos. No celular, toque neles. Cada humano precisa de vários golpes. Corredores fogem com mais velocidade; guardas contra-atacam e reduzem a vida. O alvo dourado é o contrato da cidade. Quando a noite termina, sangue, capturas e contratos ficam salvos no navegador.

Cada era contém cinco cidades. Capture o alvo nomeado e atinja a cota de cada cidade para avançar. Ao concluir a quinta, hiberne para a próxima era: a árvore e o sangue recomeçam, mas um eco permanente aumenta dano e duração das noites. O objetivo final é capturar a Imperatriz Solaris e 1.000 humanos em uma única noite na última cidade, sobrevivendo até o amanhecer.

## Progressão

A árvore começa com dois poderes visíveis. Comprar um nó revela somente seus descendentes. Seus cinco caminhos ampliam a noite, a captura manual, os servos, o banco de sangue e os pulsos do eclipse. Servos e pulsos tornam as caçadas de multidões viáveis sem exigir milhares de cliques.

O cenário é desenhado como um mapa de losangos, edifícios e objetos por código; humanos, servos, luzes e atividade da cidade são animados no canvas. A arte gerada da catedral serve de fundo para a árvore. O jogo separa o save desta versão das versões anteriores.

## Desenvolvimento

```bash
npm run typecheck
npm run test:smoke
npm run build
```

O push para `main` dispara o deploy configurado em `wrangler.jsonc`.
