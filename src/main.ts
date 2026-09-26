import './style.css'
import { BRANCHES, DISTRICTS, ERAS, SKILLS, skillCost, type Branch } from './incremental/data'
import { Night, available, buy, hibernate, level, load, persist } from './incremental/game'
import { drawCity } from './city'
import { camera } from './viewport'

const app=document.querySelector<HTMLDivElement>('#app')!
const save=load()
let screen:'map'|'upgrades'='map'
let night:Night|null=null
let ambient=new Night(save)
let selected='moon'
let branch:Branch|'roots'='roots'
let lastFrame=performance.now(),lastPaint=0,lastHud=0
let held=false,aim={x:0,y:0},pointerId:number|null=null
let audio:AudioContext|null=null
const fmt=(n:number)=>new Intl.NumberFormat('pt-BR',{notation:n>=10000?'compact':'standard',maximumFractionDigits:1}).format(Math.floor(n))
const d=()=>DISTRICTS[save.district]
const quota=()=>save.district===19?3000:d().quota
const active=()=>!!night&&!night.ended
const visible=(skill:typeof SKILLS[number])=>!skill.requires||level(save,skill.requires)>0
const affordable=()=>SKILLS.filter(s=>available(save,s.id)&&save.blood>=skillCost(s,level(save,s.id))).length
const icon=(index:number,cls='')=>`<span class="art-icon ${cls}" style="--ix:${index%6};--iy:${Math.floor(index/6)}" aria-hidden="true"></span>`
function sound(name:string){
  if(save.muted)return
  try{
    audio??=new AudioContext();if(audio.state==='suspended')void audio.resume()
    const notes:Record<string,[number,number,number]>={hit:[210,130,.06],capture:[420,740,.13],hurt:[140,50,.2],buy:[420,920,.23],pulse:[130,740,.3],missionComplete:[620,1100,.35]}
    const [from,to,len]=notes[name]||[350,510,.09],at=audio.currentTime,o=audio.createOscillator(),g=audio.createGain()
    o.type=name==='hurt'?'sawtooth':'triangle';o.frequency.setValueAtTime(from,at);o.frequency.exponentialRampToValueAtTime(to,at+len)
    g.gain.setValueAtTime(.04,at);g.gain.exponentialRampToValueAtTime(.0001,at+len);o.connect(g);g.connect(audio.destination);o.start();o.stop(at+len)
  }catch{}
}
function top(){return `<header class="game-top"><span class="wordmark">☾ CRAZYBLOOD</span><span class="wallet">${icon(8)}<b id="wallet">${fmt(save.blood)}</b></span><span class="echo">✦ ${save.relics}</span><button class="sound" data-action="mute" aria-label="Alternar som">${save.muted?'♫̸':'♫'}</button></header>`}
function nav(){return `<nav class="screen-tabs" aria-label="Telas do jogo"><button data-screen="map" class="${screen==='map'?'current':''}"><span>⌖</span> MAPA</button><button data-screen="upgrades" ${active()?'disabled':''} class="${screen==='upgrades'?'current':''}"><span>✦</span> UPGRADES <i id="affordable">${affordable()||''}</i></button></nav>`}
function objectives(){
  const progress=save.progress[save.district]||0,seals=save.contracts[save.district]||0,best=active()?night!.captures:save.bestByCity[save.district]||0
  return `<div class="objectives" aria-label="Requisitos para conquistar a cidade">${[['Domínio',progress,d().domination],['Contratos',seals,d().seals],['Na mesma noite',best,quota()]].map(([label,n,total],i)=>`<div class="objective"><span>${label}</span><b id="objective-${i}">${fmt(Number(n))}<em>/${fmt(Number(total))}</em></b><div class="meter"><i id="meter-${i}" style="width:${Math.min(100,Number(n)/Number(total)*100)}%"></i></div></div>`).join('')}</div>`
}
function dock(){
  if(active())return `<div class="hunt-controls"><button data-action="power" id="power" class="power-button" disabled>${icon(24)}<span id="power-label">ÉCLIPSE · 0%</span></button><span class="control-tip">Segure e arraste para capturar.<br><b>Vermelho? Troque de alvo.</b></span><button class="retreat" data-action="retreat" aria-label="Encerrar caçada">↩</button></div>`
  const ready=save.era<3&&save.cleared[save.era*5+4]
  const result=night?.ended?`${night.won?'✦ Eclipse total: as quatro eras são suas':night.qualified?'✦ Cidade conquistada':night.endReason==='defeat'?'Você foi repelido':night.endReason==='lockdown'?'Alerta máximo':night.targetEscaped?'O alvo escapou':'A noite terminou'} · ${night.captures} capturas · +${fmt(night.blood)} sangue`:'Conquiste os 3 objetivos e sobreviva ao amanhecer.'
  return `<div class="run-summary" role="status">${result}</div><div class="launch-row"><div class="next-night"><b>${22+6*level(save,'moon')+12*level(save,'dusk')+30*level(save,'immortal')+save.relics*4}s</b><span>de noite</span><b>${1+save.relics+level(save,'fang')}</b><span>força</span></div><button class="primary" data-action="${ready?'hibernate':'start'}">${ready?'HIBERNAR →':night?.ended?'CAÇAR NOVAMENTE':'INICIAR CAÇADA'} <span>➜</span></button></div>`
}
function mapScreen(){
  return `<section class="map-screen" aria-label="Mapa e caçada"><div class="map-heading"><div><span class="era-label">${ERAS[save.era].name} · ERA ${save.era+1}/4</span><h1>${d().name}</h1></div><div class="city-path" aria-label="Cidades desta era">${ERAS[save.era].cities.map((c,i)=>{const id=save.era*5+i;return `<button data-city="${id}" aria-label="${c[0]}" ${id>save.unlocked||active()?'disabled':''} class="${id===save.district?'selected':''} ${save.cleared[id]?'complete':''}">${save.cleared[id]?'✓':id>save.unlocked?'·':i+1}</button>`}).join('')}</div></div>${objectives()}<div class="arena"><canvas id="world" aria-label="Cidade: segure sobre humanos para capturar"></canvas><div class="arena-shade"></div><div class="night-hud ${active()?'':'quiet'}"><div class="clock"><span id="timer">${active()?Math.ceil(night!.remaining)+'s':'☾'}</span><i id="timebar"></i></div><span id="health">${active()?'♥'.repeat(night!.health):'A LONGA CAÇADA'}</span><span id="combo">${active()?'COMBO 0':'20 cidades · 4 eras'}</span></div><div class="target-banner" id="target">${active()?'Encontre o alvo dourado':d().target+' · alvo do contrato'}</div><div class="field-hint" id="field-hint">${active()?'Segure sobre um humano para capturar':'Capture, evolua e conquiste a era'}</div><div class="alarm-track"><i id="alarm"></i></div></div><footer class="map-dock">${dock()}</footer></section>`
}
function upgradesScreen(){
  const skill=SKILLS.find(s=>s.id===selected)!,lv=level(save,selected),b=BRANCHES[skill.branch]
  const branches=(Object.keys(BRANCHES) as Branch[]).filter(key=>SKILLS.some(s=>s.branch===key&&visible(s)))
  const nodes=SKILLS.filter(s=>visible(s)&&(branch==='roots'?!s.requires:s.branch===branch))
  const horizontal=innerWidth>650&&innerHeight<500
  const positions=nodes.map((_,i)=>horizontal?{x:(i+.5)*100/nodes.length,y:47}:nodes.length<=2?{x:nodes.length===1?50:30+i*40,y:47}:{x:27+(i%2)*46,y:18+Math.floor(i/2)*30})
  const links=nodes.map((s,i)=>{const parent=nodes.findIndex(n=>n.id===s.requires);if(parent<0)return '';return `<path d="M ${positions[parent].x} ${positions[parent].y} Q 50 ${(positions[parent].y+positions[i].y)/2} ${positions[i].x} ${positions[i].y}"/>`}).join('')
  const can=available(save,selected),cost=skillCost(skill,lv)
  return `<section class="upgrade-screen" aria-label="Upgrades"><div class="upgrade-heading"><span class="era-label">SANGUE TRANSFORMADO EM PODER</span><h1>Raízes da noite</h1><p>Cada despertar revela a próxima ramificação.</p></div><div class="branch-tabs" aria-label="Ramos de habilidades"><button data-branch="roots" class="${branch==='roots'?'current':''}">RAIZ</button>${branches.map(key=>`<button data-branch="${key}" class="${branch===key?'current':''}" style="--branch:${BRANCHES[key].color}">${BRANCHES[key].label}</button>`).join('')}</div><div class="constellation" style="--branch:${branch==='roots'?'#ee91b7':BRANCHES[branch].color}"><div class="root-halo"></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links}</svg>${nodes.map((s,i)=>{const l=level(save,s.id),index=SKILLS.indexOf(s);return `<button class="skill-orb ${selected===s.id?'selected':''} ${l?'owned':''} ${available(save,s.id)&&save.blood>=skillCost(s,l)?'affordable':''}" style="left:${positions[i].x}%;top:${positions[i].y}%;--branch:${BRANCHES[s.branch].color}" data-skill="${s.id}" aria-label="${s.name}">${icon(index)}<b>${s.name}</b><small>${l}/${s.max}</small></button>`}).join('')}<span class="tree-caption">${nodes.length<2?'Um novo poder está ao seu alcance':'Siga o sangue. Desperte o próximo poder.'}</span></div><footer class="upgrade-dock" style="--branch:${b.color}">${icon(SKILLS.indexOf(skill),'detail-icon')}<div class="skill-description"><span>${b.label} · NÍVEL ${lv}/${skill.max}</span><h2>${skill.name}</h2><p>${skill.effect}</p></div><button class="primary buy" data-action="buy" ${!can||save.blood<cost?'disabled':''}>${lv>=skill.max?'MAXIMIZADO':'EVOLUIR · '+fmt(cost)+' ♦'}</button><p class="skill-flavor">${skill.description}</p></footer></section>`
}
function render(){
  held=false;pointerId=null
  app.innerHTML=`<div class="game-shell">${top()}<main>${screen==='map'?mapScreen():upgradesScreen()}</main>${nav()}</div>`
  if(screen==='map'){paint();updateHUD()}
}
function paint(){
  const canvas=document.querySelector<HTMLCanvasElement>('#world');if(!canvas)return
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(1.5,devicePixelRatio||1)
  const width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio)
  if(!width||!height)return
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
  const world=active()?night!:ambient
  world.setViewport(rect.width,rect.height)
  drawCity(canvas.getContext('2d')!,world,performance.now()/1000,!active())
}
function updateHUD(){
  const set=(id:string,value:string)=>{const el=document.getElementById(id);if(el)el.textContent=value}
  set('wallet',fmt(save.blood));set('affordable',String(affordable()||''))
  if(!active())return
  const n=night!
  set('timer',Math.ceil(n.remaining)+'s');set('health',n.health>7?`♥ ${n.health}/${n.maxHealth}`:'♥'.repeat(n.health)+'♡'.repeat(n.maxHealth-n.health));set('combo',n.combo>1?`×${n.combo} COMBO`:`${n.captures} capturas`)
  const named=n.humans.find(h=>h.named)
  set('target',n.mission?'✦ Contrato capturado':n.targetEscaped?'Alvo escapou · continue colhendo sangue':named?`${d().target} · foge em ${Math.max(0,Math.ceil(14+level(save,'stalk')*6-named.life))}s`:`${d().target} chega em ${Math.ceil(n.missionTimer)}s`)
  const current=n.humans.find(h=>h.id===n.focusId)
  set('field-hint',current?.windup?'⚠ CONTRA-ATAQUE! TROQUE DE ALVO':n.charge>=100&&n.powerCooldown<=0?'ÉCLIPSE PRONTO · use o poder abaixo':`+${fmt(n.blood)} sangue · ${n.servants} servos`)
  for(const [i,value,total] of [[0,save.progress[save.district]||0,d().domination],[1,save.contracts[save.district]||0,d().seals],[2,n.captures,quota()]]){
    const el=document.getElementById('objective-'+i);if(el)el.innerHTML=`${fmt(value)}<em>/${fmt(total)}</em>`
    const meter=document.getElementById('meter-'+i);if(meter)meter.style.width=Math.min(100,value/total*100)+'%'
  }
  const time=document.getElementById('timebar');if(time)time.style.width=n.remaining/n.duration*100+'%'
  const alarm=document.getElementById('alarm');if(alarm)alarm.style.width=n.alarm+'%'
  const power=document.getElementById('power') as HTMLButtonElement|null;if(power){power.disabled=n.charge<100||n.powerCooldown>0;power.style.setProperty('--charge',n.charge+'%')}
  set('power-label',n.powerCooldown>0?`ÉCLIPSE · ${Math.ceil(n.powerCooldown)}s`:n.charge>=100?'SOLTAR ÉCLIPSE':`ÉCLIPSE · ${Math.floor(n.charge)}%`)
}
function strike(){
  if(!active())return
  const canvas=document.querySelector<HTMLCanvasElement>('#world');if(!canvas)return
  const rect=canvas.getBoundingClientRect(),cam=camera(rect.width,rect.height)
  night!.click((aim.x-rect.left-cam.x)/cam.scale,(aim.y-rect.top-cam.y)/cam.scale,Math.min(40,24/cam.scale))
}
function frame(now:number){
  const dt=Math.min(.06,(now-lastFrame)/1000);lastFrame=now
  if(screen==='map'){
    if(active()){
      if(held)strike()
      night!.update(dt)
      if(night!.lastSound){sound(night!.lastSound);night!.lastSound=''}
      if(night!.ended){ambient=new Night(save);render()}
    }else{
      const [left,right]=ambient.horizontalBounds,[top,bottom]=ambient.verticalBounds
      for(const h of ambient.humans){h.x+=h.vx*dt;h.y+=h.vy*dt;if(h.x<left||h.x>right)h.vx*=-1;if(h.y<top||h.y>bottom)h.vy*=-1;h.x=Math.max(left,Math.min(right,h.x));h.y=Math.max(top,Math.min(bottom,h.y))}
    }
    if(now-lastPaint>33){paint();lastPaint=now}
    if(now-lastHud>100){updateHUD();lastHud=now}
  }
  requestAnimationFrame(frame)
}
app.addEventListener('click',event=>{
  const target=event.target as HTMLElement,button=target.closest<HTMLButtonElement>('button');if(!button||button.disabled)return
  if(button.dataset.screen){if(active())return;screen=button.dataset.screen as typeof screen;render();return}
  if(button.dataset.branch){branch=button.dataset.branch as typeof branch;const first=SKILLS.find(s=>visible(s)&&(branch==='roots'?!s.requires:s.branch===branch));if(first)selected=first.id;render();return}
  if(button.dataset.skill){selected=button.dataset.skill;render();return}
  if(button.dataset.city){const id=Number(button.dataset.city);if(!active()&&id<=save.unlocked&&Math.floor(id/5)===save.era){save.district=id;night=null;ambient=new Night(save);persist(save);render()}return}
  switch(button.dataset.action){
    case 'start':{const rect=document.querySelector('#world')!.getBoundingClientRect();night=new Night(save,{width:rect.width,height:rect.height});render();sound('mission');break}
    case 'retreat':night?.finish();ambient=new Night(save);render();break
    case 'power':if(night?.usePower())sound('pulse');updateHUD();break
    case 'buy':if(buy(save,selected)){sound('buy');branch=SKILLS.find(s=>s.id===selected)!.branch;render()}break
    case 'hibernate':if(hibernate(save)){night=null;ambient=new Night(save);screen='upgrades';branch='roots';selected='moon';render()}break
    case 'mute':save.muted=!save.muted;persist(save);button.textContent=save.muted?'♫̸':'♫';break
  }
})
app.addEventListener('pointerdown',event=>{
  if(!(event.target instanceof HTMLCanvasElement)||!active())return
  event.preventDefault();held=true;pointerId=event.pointerId;aim={x:event.clientX,y:event.clientY};event.target.setPointerCapture(event.pointerId);strike()
})
app.addEventListener('pointermove',event=>{if(held&&event.pointerId===pointerId)aim={x:event.clientX,y:event.clientY}})
const release=()=>{held=false;pointerId=null;if(night)night.focusUntil=0}
window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release)
document.addEventListener('visibilitychange',()=>{release();persist(save)})
window.addEventListener('resize',()=>{release();if(screen==='upgrades')render()})
window.addEventListener('keydown',event=>{if(event.code==='Space'&&active()){event.preventDefault();if(night!.usePower())sound('pulse')}})
render();requestAnimationFrame(frame)
