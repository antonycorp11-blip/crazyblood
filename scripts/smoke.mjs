import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const root=join(dirname(fileURLToPath(import.meta.url)),'..')
const memory=new Map()
globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}
const build=await esbuild.build({entryPoints:[join(root,'src/incremental/game.ts')],bundle:true,platform:'node',format:'esm',write:false})
const moduleUrl='data:text/javascript;base64,'+Buffer.from(build.outputFiles[0].contents).toString('base64')
const {Night,available,buy,hibernate,load,level}=await import(moduleUrl)

const save=load()
const night=new Night(save)
const human=night.humans[0]
night.humans=[human]
for(let i=0;i<human.maxHp;i++)assert.equal(night.click(human.x,human.y-16,1),true)
assert.equal(night.captures,1)
assert.ok(save.blood>0)
assert.equal(save.progress[0],1)
night.elapsed=night.duration
night.update(.01)
assert.equal(night.endReason,'dawn')
assert.equal(night.qualified,false)
assert.equal(save.unlocked,0,'uma noite incompleta não abre a próxima cidade')
assert.equal(save.bestByCity[0],1)

assert.equal(available(save,'moon'),true)
assert.equal(available(save,'thrall'),false)
save.blood=1000
assert.equal(buy(save,'moon'),true)
assert.equal(level(save,'moon'),1)
assert.equal(available(save,'thrall'),true)
assert.equal(available(save,'mist'),true)
assert.equal(available(save,'pulse'),false)
assert.equal(buy(save,'thrall'),true)
assert.equal(available(save,'pulse'),true)

const escaped=new Night(save)
escaped.humans=[]
escaped.spawn(true)
escaped.missionSpawned=true
escaped.humans[0].life=21
escaped.update(.01)
assert.equal(escaped.targetEscaped,true)
assert.equal(escaped.mission,false)

const alarmed=new Night(save)
alarmed.alarm=99.9
alarmed.click(-100,-100,1)
alarmed.update(.01)
assert.equal(alarmed.endReason,'lockdown')
assert.equal(save.unlocked,0)

const winning=new Night(save)
winning.humans=[]
winning.spawn(true)
const named=winning.humans[0]
winning.hit(named,named.hp,false)
assert.equal(winning.missionThisNight,true)
winning.captures=winning.district.quota
winning.elapsed=winning.duration
winning.update(.01)
assert.equal(winning.qualified,true)
assert.equal(save.cleared[0],true)
assert.equal(save.unlocked,1)

save.cleared[4]=true
assert.equal(hibernate(save),true)
assert.equal(save.era,1)
assert.equal(save.district,5)
assert.equal(save.relics,1)
assert.equal(level(save,'moon'),0)
console.log('Smoke: captura, árvore, prazo do alvo, alerta, cota por noite e hibernação OK')
