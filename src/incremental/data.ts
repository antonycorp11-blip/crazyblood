export type Branch = 'night' | 'fang' | 'servants' | 'blood' | 'eclipse'
export type Skill = { id:string; name:string; branch:Branch; icon:string; description:string; effect:string; max:number; cost:number; scale:number; requires?:string; x:number; y:number }
export const BRANCHES: Record<Branch,{label:string;subtitle:string;color:string}> = {
  night:{label:'NOITE',subtitle:'Dobre o tempo a seu favor',color:'#a99dff'},
  fang:{label:'PRESA',subtitle:'Cada toque vira uma caçada',color:'#ff6885'},
  servants:{label:'CORTE',subtitle:'Nunca cace sozinho',color:'#6be7d5'},
  blood:{label:'BANCO',subtitle:'Faça cada captura valer',color:'#ffc36c'},
  eclipse:{label:'ECLIPSE',subtitle:'Domine a multidão',color:'#e99bff'},
}
const X=[125,345,565,785,1005], Y=[142,270,398,526,654,782]
const s=(id:string,name:string,branch:Branch,icon:string,description:string,effect:string,max:number,cost:number,scale:number,col:number,row:number,requires?:string):Skill=>({id,name,branch,icon,description,effect,max,cost,scale,requires,x:X[col],y:Y[row]})
export const SKILLS:Skill[]=[
  s('moon','Lua tardia','night','☾','O amanhecer demora a chegar.','+6 s de noite',10,45,1.55,0,0),
  s('mist','Passos na névoa','night','◈','A névoa atrasa a fuga dos humanos.','Humanos 8% mais lentos',5,55,1.95,0,1,'moon'),
  s('stalk','Sombra paciente','night','✧','O alvo do contrato demora mais a escapar.','+6 s para o alvo',4,110,2.1,0,2,'mist'),
  s('vigor','Sangue antigo','night','♥','Seu corpo aguenta mais contra-ataques.','+2 de vida',6,155,1.95,0,3,'stalk'),
  s('dusk','Crepúsculo eterno','night','☀','Estenda o último instante da noite.','+12 s de noite',4,700,2.1,0,4,'vigor'),
  s('immortal','Noite sem fim','night','✺','A lua resiste ao amanhecer.','+30 s de noite',3,5500,2.5,0,5,'dusk'),
  s('fang','Presas afiadas','fang','◆','Cada toque causa mais dano.','+1 força de captura',18,55,1.48,1,0),
  s('reach','Garras longas','fang','⌁','Atinge alvos próximos do toque.','+10 px de alcance',5,65,1.9,1,1,'fang'),
  s('drain','Sede de caça','fang','◉','Capturas restauram sua vida.','Cura 1 a cada 5 capturas',4,125,2.1,1,2,'reach'),
  s('cleave','Garra carmesim','fang','✣','Seu golpe alcança humanos próximos.','+1 alvo por toque',4,280,2,1,3,'drain'),
  s('frenzy','Frenesi','fang','✹','Combos aumentam seu dano.','+2 dano por combo; captura mais rápida',3,680,2.4,1,4,'cleave'),
  s('reaper','Ceifador noturno','fang','✦','Capturas explodem na multidão.','+2 alvos na explosão',2,4200,3,1,5,'frenzy'),
  s('thrall','Primeiro servo','servants','♟','Um servo captura humanos por você.','+1 servo',10,130,1.75,2,0,'moon'),
  s('training','Treino da corte','servants','⚔','Servos dominam humanos resistentes.','+2 força dos servos',12,150,1.6,2,1,'thrall'),
  s('haste','Ordem de caça','servants','➤','Servos atacam mais vezes.','13% mais velocidade',6,170,2,2,2,'training'),
  s('pack','Matilha de sombras','servants','♜','Sua corte cresce a cada noite.','+2 servos',5,420,2,2,3,'haste'),
  s('elite','Guarda rubra','servants','♛','Servos priorizam alvos de missão.','+2 dano em alvos nomeados',3,900,2.3,2,4,'pack'),
  s('legion','Legião da noite','servants','♚','Uma legião invade a cidade.','+12 servos',2,4900,3,2,5,'elite'),
  s('bank','Reserva de sangue','blood','◕','Cada captura enche mais o banco.','+25% sangue',7,25,1.8,3,0,'fang'),
  s('combo','Colheita em série','blood','◇','Capturas rápidas valem mais.','+1% por combo',5,65,1.9,3,1,'bank'),
  s('contract','Pacto de sangue','blood','✉','Alvos nomeados rendem sangue extra.','+60% recompensa de missão',4,160,2,3,2,'combo'),
  s('interest','Cofre pulsante','blood','▣','O banco recompensa cada noite.','+5% sangue ao terminar',5,360,2.1,3,3,'contract'),
  s('feast','Banquete real','blood','♧','Multidões rendem ainda mais.','+15% com 30+ alvos',4,760,2.3,3,4,'interest'),
  s('treasury','Tesouro eterno','blood','✤','Cada noite rende uma fortuna.','Dobra sangue de capturas',2,5000,3,3,5,'feast'),
  s('pulse','Pulso sombrio','eclipse','◌','Uma onda captura os mais fracos.','Pulso a cada 16 s',1,150,1,4,0,'thrall'),
  s('shock','Eco do pulso','eclipse','◎','Cada onda alcança mais humanos.','+3 alvos por pulso',6,210,1.85,4,1,'pulse'),
  s('surge','Lua faminta','eclipse','☽','Mais humanos entram na cidade.','+20% surgimento',7,320,1.85,4,2,'shock'),
  s('chain','Corrente rubra','eclipse','∞','Uma captura pode arrastar outra.','+8% chance de corrente',6,670,2.1,4,3,'surge'),
  s('storm','Tempestade de presas','eclipse','✻','O pulso gera uma captura em cascata.','Pulso a cada 8 s e +8 alvos',2,1600,2.5,4,4,'chain'),
  s('totality','Eclipse total','eclipse','◉','A cidade cai sob sua sombra.','Servos +50%, pulso +20',1,9000,1,4,5,'storm'),
]
for(const skill of SKILLS){
  if(skill.id==='moon'){skill.x=420;skill.y=160}
  if(skill.id==='fang'){skill.x=710;skill.y=160}
  if(['mist','reach','thrall','bank','pulse'].includes(skill.id))skill.y=290
  if(skill.branch==='eclipse'&&skill.id!=='pulse')skill.y+=128
}
export const ERAS=[
  {name:'Pré-história',years:'30.000 a.C.',icon:'◆',color:'#e4a66a',biome:'cavernas, fogueiras e tribos',cities:[
    ['Clã da Lua','Nara, a batedora','runner'],['Vale das Cinzas','Grom, o caçador','hunter'],['Rio dos Ossos','Uma, a curandeira','rare'],['Colinas de Fogo','Kara, a guerreira','hunter'],['Grande Caverna','Tarek, o chefe','hunter']]},
  {name:'Era Medieval',years:'ano 1180',icon:'♜',color:'#c289db',biome:'vilas, mercados e fortalezas',cities:[
    ['Vila das Lanternas','Mara, a mensageira','runner'],['Mercado de Bruma','Dario, o vigia','hunter'],['Cidade Velha','Iris, a alquimista','rare'],['Fortaleza Rubra','Capitão Solano','hunter'],['Capital do Sol','Regente Aurora','hunter']]},
  {name:'Era Contemporânea',years:'ano 2026',icon:'▣',color:'#71ccef',biome:'ruas, metrôs e arranha-céus',cities:[
    ['Bairro Neon','Lia, a entregadora','runner'],['Terminal Central','Raul, o policial','hunter'],['Distrito Industrial','Dra. Vega','rare'],['Centro Financeiro','Chefe Atlas','hunter'],['Metrópole Solar','Prefeita Helia','hunter']]},
  {name:'Era Futura',years:'ano 2280',icon:'✧',color:'#8ce7e4',biome:'cúpulas, drones e cidades de luz',cities:[
    ['Colônia Prisma','AX-7, a exploradora','runner'],['Porto Orbital','Sentinela Voss','hunter'],['Núcleo Sintético','Dra. Nyx','rare'],['Bastião Quântico','Comandante Zero','hunter'],['Nova Aurora','Imperatriz Solaris','hunter']]},
] as const
export type District={name:string;tag:string;era:number;city:number;population:number;rate:number;baseHp:number;blood:number;target:string;targetType:'runner'|'hunter'|'rare';targetHp:number;targetReward:number;quota:number;domination:number;seals:number;intro:string}
export const DISTRICTS:District[]=ERAS.flatMap((era,eraIndex)=>era.cities.map((city,cityIndex)=>({
  name:city[0],tag:era.name,era:eraIndex,city:cityIndex,
  population:[55,100,160,230,300][cityIndex],
  rate:[1.8,4.2,9,18,30][cityIndex]*(1+eraIndex*.13),
  baseHp:[4,9,17,28,45][cityIndex]+eraIndex*3,
  blood:Math.round([3,5,8,12,18][cityIndex]*(1+eraIndex*.28)),
  target:city[1],targetType:city[2],
  targetHp:[28,65,130,260,500][cityIndex]+eraIndex*20,
  targetReward:Math.round([25,65,150,320,750][cityIndex]*(1+eraIndex*.3)),
  quota:[70,180,450,900,1800][cityIndex],
  domination:Math.round([350,1400,4200,12000,35000][cityIndex]*(1+eraIndex*.35)),
  seals:[4,4,5,6,7][cityIndex],
  intro:'Acumule domínio e contratos. Complete a cota em uma noite e sobreviva ao amanhecer.',
})))
export const skillCost=(skill:Skill,level:number)=>Math.round(skill.cost*Math.pow(skill.scale,level))
