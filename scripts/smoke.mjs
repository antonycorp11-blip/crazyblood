import assert from 'node:assert/strict'
import { dirname,join } from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),memory=new Map()
globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}
const build=await esbuild.build({entryPoints:[join(root,'src/incremental/game.ts')],bundle:true,platform:'node',format:'esm',write:false})
const {Night,available,buy,hibernate,load,level}=await import('data:text/javascript;base64,'+Buffer.from(build.outputFiles[0].contents).toString('base64'))
const fresh=()=>{memory.clear();return load()}
let seed=9327;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const save=fresh(),night=new Night(save)
const human=night.humans.find(h=>h.kind==='common');night.humans=[human]
assert.equal(night.click(human.x,human.y-30,1),true)
assert.equal(night.click(human.x,human.y-30,1),false,'spam não ignora cadência')
while(night.humans.includes(human)){night.elapsed+=night.strikeGap;night.click(human.x,human.y-30,1)}
assert.equal(night.captures,1);assert.ok(save.blood>0)
assert.equal(available(save,'moon'),true);assert.equal(available(save,'thrall'),false)
save.blood=1000;assert.ok(buy(save,'moon'));assert.equal(level(save,'moon'),1);assert.ok(available(save,'thrall'));assert.ok(buy(save,'thrall'));assert.ok(available(save,'pulse'))
const opening=fresh(),first=new Night(opening)
while(!first.ended){const target=first.humans.find(h=>h.named)||first.humans.filter(h=>h.kind!=='hunter').sort((a,b)=>a.hp-b.hp)[0];if(target)first.click(target.x,target.y-30,1);first.update(.05)}
assert.ok(first.captures<first.requiredCaptures);assert.equal(opening.unlocked,0)
console.log('Primeira noite com mira perfeita:',first.captures,'/',first.requiredCaptures,'capturas; cidade bloqueada')
for(const dodge of [false,true]){
  const s=fresh();s.district=1;const n=new Night(s);n.humans=[];n.spawn();const h=n.humans[0];h.kind='hunter';h.hp=100;n.click(h.x,h.y-30,1)
  assert.ok(h.windup>0);const before=n.health
  for(let i=0;i<20;i++){n.focusUntil=dodge?0:1;n.update(.05)}
  assert.equal(n.health,before-(dodge?0:1),'contra-ataque pode ser evitado ao soltar/trocar alvo')
}
const crowded=new Night(fresh());while(crowded.humans.length<crowded.district.population)crowded.spawn();crowded.spawn(true);assert.ok(crowded.humans.some(h=>h.named),'contrato aparece mesmo com cidade cheia')
const escaped=new Night(fresh());escaped.humans=[];escaped.spawn(true);escaped.missionSpawned=true;escaped.humans[0].life=20;escaped.update(.01);assert.ok(escaped.targetEscaped)
const gate=fresh();const tooSoon=new Night(gate);tooSoon.humans=[];tooSoon.spawn(true);tooSoon.hit(tooSoon.humans[0],1000,true);tooSoon.captures=tooSoon.requiredCaptures;tooSoon.finish('dawn');assert.equal(gate.unlocked,0,'cota não substitui domínio e contratos')
gate.progress[0]=tooSoon.district.domination;gate.contracts[0]=tooSoon.district.seals-1
const winning=new Night(gate);winning.humans=[];winning.spawn(true);winning.hit(winning.humans[0],1000,true);winning.captures=winning.requiredCaptures;winning.finish('dawn');assert.ok(winning.qualified);assert.equal(gate.unlocked,1)
const power=new Night(fresh());assert.equal(power.usePower(),false);power.charge=100;assert.ok(power.usePower());assert.ok(power.charge<100);assert.equal(power.powerCount,1)
for(const [width,height] of [[390,488],[320,310],[844,180],[1440,470]]){const n=new Night(fresh(),{width,height});const [a,b]=n.horizontalBounds,[c,d]=n.verticalBounds;assert.ok(a<b&&c<d);assert.ok(n.humans.every(h=>h.x>=a&&h.x<=b&&h.y>=c&&h.y<=d))}
gate.cleared[4]=true;assert.ok(hibernate(gate));assert.equal(gate.era,1);assert.equal(gate.district,5);assert.equal(gate.relics,1);assert.equal(level(gate,'moon'),0)
console.log('Smoke OK: cadência, primeira noite, ramificações, contra-ataques, lotação, fuga, progressão, poder, câmera e hibernação')
