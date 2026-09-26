# Crazyblood — As Eras da Caçada

Incremental de captura com duas telas: **Mapa** e **Upgrades**. A caçada e o resumo da noite acontecem no próprio mapa. A interface ocupa a janela sem rolagem, com disposição própria para celular em pé, paisagem e PC.

## Jogar

```bash
npm install
npm run dev
```

Segure sobre os humanos e arraste para acompanhar a fuga. A captura tem cadência própria: clicar mais depressa não aumenta o dano. Guardas anunciam o contra-ataque com um círculo vermelho; solte ou troque de alvo antes do golpe. Capturas carregam o Éclipse, uma explosão que também recupera vida e reduz o alerta. Ative pelo botão ou pela barra de espaço.

Cada cidade exige três conquistas: domínio acumulado, vários contratos e uma cota de capturas em uma única noite. Na noite decisiva é preciso capturar o alvo e sobreviver até o amanhecer. O sangue de tentativas incompletas fica disponível para upgrades. A primeira cidade exige 350 capturas acumuladas, quatro contratos e uma noite de 70 capturas.

Cada uma das quatro eras tem cinco cidades. Depois da quinta, a hibernação reinicia sangue e poderes, concedendo um eco permanente de força e tempo. A última cidade exige a Imperatriz, domínio completo e 3.000 capturas em uma noite.

## Upgrades e arte

A árvore começa com dois poderes. A compra revela novas habilidades e ramos. Cada ramo cabe na tela e mostra somente os nós já descobertos. Os poderes ampliam duração, dano, cura, captura em área, servos, rendimento e reações em cadeia.

O atlas detalhado `public/assets/sprites/humans.png` é usado em todas as eras, com cinco arquétipos e poses de movimento, corrida, dano e captura. Os humanos simplificados das versões anteriores não são carregados. Vampiros, edifícios, ícones, fogo, morcegos, pulsos e o amanhecer também usam atlas. Cenários e personagens são compostos em canvas; não há uma fotografia de cidade por baixo da jogatina.

As fontes geradas ficam em `art/source/`. O pipeline local normaliza e exporta os atlas:

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/build_assets.py
```

Esta campanha usa `crazyblood-hunt-v5`. Saves anteriores ficam preservados em suas chaves antigas.

## Verificar

```bash
npm run test:smoke
node scripts/balance.mjs
npm run build
```

O smoke cobre cadência, evasão de contra-ataques, contratos, objetivos combinados, câmera, poder e hibernação. A simulação de balanceamento usa mira perfeita e compras automáticas para estabelecer um limite inferior de tempo; não representa o tempo de uma pessoa jogando. Efeitos simultâneos e resolução de renderização são limitados para reduzir o custo em celulares.

O push para `main` dispara o deploy Cloudflare configurado em `wrangler.jsonc`.
