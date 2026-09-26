// The (very silly) story. Chapter 0 plays on the first visit to the lair; chapter k plays after the k-th boss falls.
// Premise: Count Vlado hibernates for centuries between eras and must fill his cellar before each long sleep.
// The Pack of werewolves keeps stealing the stock — and wakes up with him in every era.

export type Speaker = 'conde' | 'barto' | 'lobo'
export type Line = [Speaker, string]

export const SPEAKERS: Record<Speaker, string> = { conde: 'Conde Vlado', barto: 'Bartô, o morcego mordomo', lobo: '' }

export const CHAPTERS: Line[][] = [
  // 0 — intro
  [['barto', 'Mestre, acorda! Você dormiu 400 anos. De novo.'],
    ['conde', 'Hmm... que fome. Cadê o meu estoque de sangue?'],
    ['barto', 'Os lobisomens roubaram a adega inteira. Sobrou um sachê de ketchup.'],
    ['conde', 'Isso é... humilhante.'],
    ['barto', 'Temos que encher a adega antes da próxima hibernação. Tem uma vila de humanos logo ali.'],
    ['conde', 'Então vamos às compras.']],
  // 1 — Garra Cinzenta
  [['barto', 'Um lobisomem! Na NOSSA vila!'],
    ['conde', 'Eles farejam sangue estocado. Vão tentar roubar de novo.'],
    ['barto', 'Anotado: comprar desodorante anti-lobo.']],
  // 2 — Uivo Rubro
  [['conde', 'Por que eles uivam tanto?'],
    ['barto', 'Eles chamam de canto. Eu chamo de barulho.'],
    ['conde', 'Mais estoque, menos uivo.']],
  // 3 — Presa de Pedra
  [['barto', 'A adega já está com um bom estoque, mestre!'],
    ['conde', 'Não basta. Eu durmo 800 anos. Preciso de lanchinho no meio.']],
  // 4 — Salto Negro
  [['lobo', 'O Alfa Fenrik... vai vingar a matilha...'],
    ['conde', 'Quem é esse tal de Fenrik?'],
    ['barto', 'O chefe da matilha. Mora na Grande Caverna. Cheira a cachorro molhado.']],
  // 5 — Alfa Fenrik (end of era 1)
  [['lobo', 'A Mãe da Matilha... vai te encontrar... em qualquer tempo...'],
    ['conde', 'Que dramático.'],
    ['barto', 'ADEGA CHEIA! Hora de hibernar, mestre!'],
    ['conde', 'Me acorda quando inventarem travesseiro.'],
    ['barto', '💤 ... 800 anos depois ... 💤']],
  // 6 — Lobo da Bruma
  [['barto', 'Mestre! Inventaram travesseiro! E castelos!'],
    ['conde', 'E os lobisomens?'],
    ['barto', 'Também acordaram. Agora com névoa roxa. Que moda.']],
  // 7 — Cavador de Tumbas
  [['barto', 'Ele estava cavando um túnel até a nossa adega!'],
    ['conde', 'Coloca alho no porão.'],
    ['barto', 'Mestre... alho é ruim pra NÓS.'],
    ['conde', '...coloca cebola então.']],
  // 8 — Xamã Ulric
  [['lobo', 'A lua de sangue... está chegando...'],
    ['conde', 'Todo lobisomem tem uma profecia.'],
    ['barto', 'E nenhum tem fio dental.']],
  // 9 — Lorde Couraça
  [['conde', 'Armadura de lata. Que fofo.'],
    ['barto', 'Dizem que o Alfa Varg quer a nossa adega inteira pra ele.'],
    ['conde', 'Ele que traga o próprio copo.']],
  // 10 — Alfa Varg (end of era 2)
  [['lobo', 'Você só adia o inevitável, sanguessuga.'],
    ['conde', 'Adiar é a minha especialidade. Boa noite.'],
    ['barto', 'ADEGA CHEIA! Hibernação número dois!'],
    ['barto', '💤 ... 846 anos depois ... 💤']],
  // 11 — Caçador Neon
  [['barto', 'Mestre, acordamos em 2026! Tem wi-fi!'],
    ['conde', 'E sangue?'],
    ['barto', 'Tem delivery de tudo, menos de sangue. Ainda.']],
  // 12 — Uivador da Tempestade
  [['conde', 'Esse lobo tinha um podcast.'],
    ['barto', 'Três ouvintes. Todos lobos.']],
  // 13 — Brutamontes de Aço
  [['barto', 'Descobri! A Mãe da Matilha também hiberna. Ela acorda sempre junto com a gente.'],
    ['conde', 'Uma rival de soneca. Clássico.']],
  // 14 — Couraça Blindada
  [['conde', 'Os humanos daqui fogem de patinete.'],
    ['barto', 'E postam tudo. Você está viralizando, mestre.'],
    ['conde', 'Mas eu nem apareço em foto!']],
  // 15 — Mãe da Matilha (end of era 3)
  [['lobo', 'Nos veremos no futuro... e eu estarei mais forte.'],
    ['conde', 'Eu também. Eu tenho uma árvore de habilidades.'],
    ['barto', 'ADEGA CHEIA! Última hibernação... eu acho.'],
    ['barto', '💤 ... 254 anos depois ... 💤']],
  // 16 — Saltador Prisma
  [['barto', 'Ano 2280! Os humanos moram em domos.'],
    ['conde', 'Comida embalada a vácuo. Prático.']],
  // 17 — Xamã Sintético
  [['conde', 'Um lobisomem com implantes?'],
    ['barto', 'Ele atualizou o uivo pra versão 2.0.']],
  // 18 — Tempestade Quântica
  [['barto', 'Os sensores detectaram um eclipse vindo. A Mãe do Eclipse está acordando.'],
    ['conde', 'Então o estoque tem que estar perfeito.']],
  // 19 — Alfa Zero
  [['lobo', 'Ela é a mãe de todos nós. Você não tem chance.'],
    ['conde', 'Todo mundo diz isso. Aí eu ganho.']],
  // 20 — Mãe do Eclipse (the end)
  [['lobo', 'Impossível... a matilha... acabou...'],
    ['conde', 'Nada pessoal. Era só uma questão de estoque.'],
    ['barto', 'Mestre... a adega está cheia pra sempre. Podemos dormir tranquilos.'],
    ['conde', 'Me acorda se inventarem sangue em pó.'],
    ['barto', '🦇 FIM 🦇 (mas a caçada continua...)']],
]

/** What Bartô says in the lair: the current goal in story terms. */
export function lairTip(era: number, clearedInEra: number, bossName: string, clearedHere: boolean) {
  const left = 5 - clearedInEra
  if (clearedHere) return `A adega agradece. Ainda faltam ${left} ${left === 1 ? 'cidade' : 'cidades'} nesta era antes de hibernar.`
  const tips = [
    `${bossName} está rondando a cidade. Encha o terror e ele aparece!`,
    `Estoque para hibernar: ${clearedInEra}/5 cidades desta era.`,
    `Dica de mordomo: desvie das marcas vermelhas do lobisomem e ele fica tonto.`,
  ]
  return tips[(clearedInEra + era) % tips.length]
}

// ───────── in-hunt chatter (speech bubbles)
export const HUMAN_PANIC = ['Socorro!', 'Um vampiro!', 'Corre!!', 'Mãe!!', 'Hoje não!', 'Aaaah!']
export const HUMAN_ERA: string[][] = [
  ['Morcego gigante!', 'Chama o xamã!', 'Cadê o fogo?!', 'Uga uga!!', 'Pega a lança!'],
  ['Pelas barbas do rei!', 'Alho! Quem tem alho?', 'Guardas!!', 'É o Conde!', 'Fujam pro castelo!'],
  ['Isso vai pro story!', 'Liga pra polícia!', 'Tô sem bateria!', 'É cosplay??', 'Chama um Uber!'],
  ['Alerta biológico!', 'Ativar escudo!', 'Não tá no manual!', 'Chama o androide!', 'Erro 404: coragem'],
]
export const HUMAN_CALM: string[][] = [
  ['Que noite fria...', 'Ouvi uivos ontem.', 'Viu aquele morcego?'],
  ['Que lua bonita.', 'Dizem que o Conde voltou.', 'Tranquei a porta?'],
  ['Alguém viu meu fone?', 'Vou pedir uma pizza.', 'Que blecaute estranho.'],
  ['Domo 7 sem energia?', 'Meu drone sumiu.', 'Sensor de lobo: ok.'],
]
export const HUMAN_SHINY = ['Meu ouro não!', 'Sou rico demais pra isso!', 'Pega outro!']
export const HUMAN_WOLF = ['LOBISOMEM!!', 'Os lobos voltaram!', 'Salve-se quem puder!']

export const BOSS_INTRO = [
  'Esse estoque é da matilha!', 'AUUUUU! (isso é um aviso)', 'Presa de lobo quebra dente de vampiro!', 'Me pega se for capaz!', 'Você está no território do Alfa.',
  'Você nem vai me ver chegando.', 'Cavei três quilômetros por isso!', 'Os ossos previram sua derrota.', 'Minha armadura é à prova de presas!', 'Ajoelhe-se diante do rei da matilha.',
  'Vou te seguir em todas as redes.', 'Senti um trovão... era a sua derrota.', 'Treino perna todo dia. E você?', 'Colete nível 5, sanguessuga.', 'Você machucou meus filhotes.',
  'Refração total!', 'Carregando profecia... 100%.', 'Estou em todo lugar ao mesmo tempo.', 'Protocolo: caçar vampiro.', 'Finalmente. Só você e eu, Conde.',
]
export const BOSS_HIT = ['Hah!', 'Sentiu essa?', 'Fraco!', 'Volta aqui!']
export const BOSS_EXPOSED = ['Ai, minhas costas!', 'Tô tonto...', 'Pausa, pausa!']
export const BOSS_HOWL = ['AUUUUU!', 'Humanos, venham!', 'Hora do lanche!']
export const BOSS_ESCAPE = ['Até a próxima lua!', 'Isso não acabou!']
export const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
