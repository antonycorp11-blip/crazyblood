import esbuild from 'esbuild'
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}
let seed=12;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const build=await esbuild.build({stdin:{contents:"export * from './src/incremental/game.ts'; export * from './src/incremental/data.ts'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false})
const {Night,load,buy,available,SKILLS,skillCost}=await import('data:text/javascript;base64,'+Buffer.from(build.outputFiles[0].contents).toString('base64'))
function run(save){const n=new Night(save,{width:390,height:488});while(!n.ended){const named=n.humans.find(h=>h.named);let target=n.humans.filter(h=>h.windup<=0&&h.kind!=='hunter').sort((a,b)=>a.hp-b.hp)[0];if(named&&named.windup<=0)target=named;if(target)n.click(target.x,target.y-30,1);if(n.charge>=100)n.usePower();n.update(.05)}return n}
const save=load();let totalSeconds=0
for(let city=0;city<2;city++){
  save.district=city;let nights=0
  while(!save.cleared[city]&&nights<50){
    const n=run(save);nights++;totalSeconds+=n.elapsed
    const priorities=['fang','moon','thrall','training','bank','mist','reach','pulse','haste','stalk','drain','shock','surge','vigor','cleave','pack','dusk','frenzy']
    for(let purchase=0;purchase<6;purchase++){
      const candidates=SKILLS.filter(s=>priorities.includes(s.id)&&available(save,s.id)&&save.blood>=skillCost(s,save.levels[s.id]||0))
      candidates.sort((a,b)=>skillCost(a,save.levels[a.id]||0)-skillCost(b,save.levels[b.id]||0));if(!candidates.length)break;buy(save,candidates[0].id)
    }
    if(nights<=2||n.qualified)console.log(JSON.stringify({city:city+1,night:nights,captures:n.captures,domination:save.progress[city],contracts:save.contracts[city]||0,cleared:n.qualified}))
  }
  console.log('Cidade',city+1,'noites',nights,'tempo ideal acumulado',Math.round(totalSeconds),'s','níveis',Object.values(save.levels).reduce((a,b)=>a+b,0))
  if(!save.cleared[city])throw new Error('Progressão travada')
}
const late={...save,district:19,era:3,relics:3,levels:Object.fromEntries(SKILLS.map(s=>[s.id,s.max])),contracts:{19:7},progress:{19:100000}}
const finale=run(late);console.log('Build máxima:',finale.captures,'capturas; vitória:',finale.won)
if(!finale.won)throw new Error('Objetivo final não alcançável com build máxima')
