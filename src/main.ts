import './style.css'
import { BRANCHES, DISTRICTS, ERAS, SKILLS, skillCost } from './incremental/data'
import { Night, available, buy, hibernate, level, load, persist } from './incremental/game'
import { drawCity, H, W } from './city'

const app=document.querySelector<HTMLDivElement>('#app')!
let save=load()
let mode:'tree'|'city'|'hunt'='tree'
let night:Night|null=null
let preview:Night|null=null
let selected='moon'
let lastFrame=performance.now()
let lastPaint=0
let lastHud=0
let tipUntil=0
let audioCtx:AudioContext|null=null
const fmt=(n:number)=>new Intl.NumberFormat('pt-BR').format(Math.floor(n))
const pct=(n:number,d:number)=>Math.min(100,Math.round(n/d*100))
const selectedDistrict=()=>DISTRICTS[save.district]

function sound(name:string){
  if(save.muted||!name)return
  try{
    audioCtx??=new AudioContext()
    if(audioCtx.state==='suspended')audioCtx.resume()
    const at=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain()
    const tones:Record<string,[number,number,number]>={
      hit:[240,145,.09],capture:[470,760,.16],servant:[350,520,.08],hurt:[130,60,.25],
      mission:[420,620,.35],missionComplete:[540,980,.5],pulse:[160,520,.4],buy:[420,850,.25],
    }
    const [from,to,duration]=tones[name]||tones.capture
    osc.type=name==='hurt'?'sawtooth':'triangle'
    osc.frequency.setValueAtTime(from,at);osc.frequency.exponentialRampToValueAtTime(Math.max(1,to),at+duration)
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(name==='hurt'?.1:.055,at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+duration)
    osc.connect(gain);gain.connect(audioCtx.destination);osc.start(at);osc.stop(at+duration+.01)
  }catch{}
}
function header(){
  const era=ERAS[save.era]
  return '<header class="topbar"><div class="brand"><span class="brand-mark">◈</span><div><strong>CRAZYBLOOD</strong><small>AS ERAS DA CAÇADA</small></div></div>'+
    '<div class="top-info"><span class="era-chip" style="--era:'+era.color+'">'+era.icon+' '+era.name+' <small>'+era.years+'</small></span>'+
    '<span class="blood-chip">♦ <strong>'+fmt(save.blood)+'</strong> <small>sangue</small></span>'+
    '<span class="relic-chip">✦ '+save.relics+' <small>ecos</small></span></div>'+
    '<button class="sound-button" data-action="mute" aria-label="Alternar som">'+(save.muted?'SOM OFF':'♫ SOM ON')+'</button></header>'
}
function nav(){
  return '<nav class="nav-tabs"><button data-action="tree" class="'+(mode==='tree'?'active':'')+'">✦ Árvore de habilidades</button>'+
    '<button data-action="city" class="'+(mode==='city'?'active':'')+'">◈ Mapa das eras</button>'+
    (mode==='hunt'?'<span class="live-dot">● NOITE EM CURSO</span>':'')+'</nav>'
}
function skillTree(){
  const skill=SKILLS.find(x=>x.id===selected)||SKILLS[0]
  const lv=level(save,skill.id),max=lv>=skill.max,cost=skillCost(skill,lv),unlocked=available(save,skill.id)
  const branch=BRANCHES[skill.branch]
  const visible=SKILLS.filter(x=>!x.requires||level(save,x.requires)>0)
  const boardHeight=Math.max(440,Math.max(...visible.map(x=>x.y))+125)
  const paths=visible.map(x=>{
    const a=x.requires?SKILLS.find(v=>v.id===x.requires):null
    const x1=a?a.x:565,y1=a?a.y:31
    const acquired=level(save,x.id)>0
    return '<path d="M '+x1+' '+y1+' C '+x1+' '+(y1+54)+' '+x.x+' '+(x.y-55)+' '+x.x+' '+x.y+'" class="'+(acquired?'lit':'')+'" style="--branch:'+BRANCHES[x.branch].color+'"/>'
  }).join('')
  const labels=Object.entries(BRANCHES).filter(([key])=>visible.filter(x=>x.branch===key).length>1).map(([key,b])=>'<div class="branch-label" style="left:'+({'night':125,'fang':345,'servants':565,'blood':785,'eclipse':1005} as Record<string,number>)[key]+'px;--branch:'+b.color+'"><b>'+b.label+'</b><small>'+b.subtitle+'</small></div>').join('')
  const nodes=visible.map(x=>{
    const l=level(save,x.id),can=available(save,x.id),afford=can&&save.blood>=skillCost(x,l)
    return '<button class="skill-node '+(l?'owned ':'')+(can?'unlocked ':'locked ')+(afford?'affordable ':'')+(selected===x.id?'selected':'')+'" style="left:'+x.x+'px;top:'+x.y+'px;--branch:'+BRANCHES[x.branch].color+'" data-skill="'+x.id+'" aria-label="'+x.name+'">'+
      '<span class="node-orbit"></span><span class="node-icon">'+x.icon+'</span><strong>'+x.name+'</strong><small>'+l+'/'+x.max+'</small></button>'
  }).join('')
  const lockText=!unlocked&&!max?'Requer '+SKILLS.find(x=>x.id===skill.requires)?.name:save.blood<cost?'Sangue insuficiente':'Disponível'
  return '<section class="tree-page"><div class="section-heading"><div><span class="eyebrow">SANTUÁRIO DAS RAÍZES</span><h1>A árvore da noite</h1><p>Comece por duas raízes. Cada poder desperto revela novas ramificações.</p></div><div class="tree-stat"><b>'+SKILLS.reduce((n,x)=>n+level(save,x.id),0)+'</b><span>poderes<br>despertos</span></div></div>'+
    '<div class="swipe-hint">← DESLIZE PARA EXPLORAR OS RAMOS →</div><div class="tree-layout"><div class="tree-scroll"><div class="tree-board" style="height:'+boardHeight+'px"><div class="tree-backdrop"></div><div class="tree-top-glow">✦ RAIZ PRIMORDIAL ✦</div>'+labels+
    '<svg class="tree-lines" viewBox="0 0 1130 '+boardHeight+'" aria-hidden="true">'+paths+'</svg>'+nodes+'</div></div>'+
    '<aside class="skill-detail" style="--branch:'+branch.color+'"><div class="detail-branch">'+branch.label+' / NÍVEL '+lv+' DE '+skill.max+'</div><div class="detail-glyph">'+skill.icon+'</div>'+
    '<h2>'+skill.name+'</h2><p>'+skill.description+'</p><div class="effect-box"><span>EFEITO POR NÍVEL</span><strong>'+skill.effect+'</strong></div>'+
    '<div class="detail-status">'+(max?'Poder maximizado':lockText)+'</div>'+
    '<button class="buy-button" data-action="buy" data-id="'+skill.id+'" '+(!unlocked||save.blood<cost?'disabled':'')+'>'+(max?'MAXIMIZADO':'DESPERTAR · ♦ '+fmt(cost))+'</button>'+
    '<div class="detail-tip">As raízes iluminadas mostram o caminho já conquistado. Poderes mais profundos exigem o nível anterior.</div></aside></div></section>'
}
function eraTimeline(){
  return '<div class="era-timeline">'+ERAS.map((era,i)=>'<div class="era-step '+(i===save.era?'current':i<save.era?'past':'future')+'" style="--era:'+era.color+'"><span>'+era.icon+'</span><b>'+era.name+'</b><small>'+era.years+'</small></div>').join('')+'</div>'
}
function cityPage(){
  const era=ERAS[save.era],d=selectedDistrict(),p=save.progress[save.district]||0
  const cards=era.cities.map((_,i)=>{
    const id=save.era*5+i,city=DISTRICTS[id],locked=id>save.unlocked,clear=save.cleared[id]
    return '<button class="city-card '+(id===save.district?'selected ':'')+(locked?'locked':'')+'" data-city="'+id+'" '+(locked?'disabled':'')+'>'+
      '<span class="city-number">0'+(i+1)+'</span><span class="city-copy"><strong>'+city.name+'</strong><small>'+city.target+'</small></span>'+
      '<span class="city-badge">'+(clear?'✓':locked?'♜':id===save.district?'◈':'→')+'</span></button>'
  }).join('')
  const canHibernate=save.era<3&&save.cleared[save.era*5+4]
  preview=new Night(save)
  return '<section class="city-page"><div class="section-heading"><div><span class="eyebrow">A LONGA CAÇADA</span><h1>Quatro eras. Vinte cidades.</h1><p>Capture humanos, conclua o contrato de cada cidade e avance até a próxima hibernação.</p></div><div class="era-counter">ERA 0'+(save.era+1)+' / 04</div></div>'+
    eraTimeline()+'<div class="city-layout"><div class="city-main"><div class="stage-frame preview-frame"><canvas id="game-canvas" width="'+W+'" height="'+H+'"></canvas><div class="stage-caption"><span>◈ '+d.name+'</span><small>Cidade 2D isométrica · '+era.biome+'</small></div></div>'+
    '<div class="city-objective"><div><span class="eyebrow">CONTRATO DA NOITE</span><h2>'+d.target+'</h2><p>'+d.intro+'</p></div><div class="quota"><b>'+fmt(Math.min(p,d.quota))+' / '+fmt(d.quota)+'</b><small>capturas nesta cidade</small><div class="progress"><i style="width:'+pct(p,d.quota)+'%"></i></div><span>'+((save.missions[save.district]?'✓ Alvo capturado':'◇ Alvo pendente'))+'</span></div></div>'+
    '<button class="launch-button" data-action="start">☾ INICIAR NOITE <span>→</span></button></div><aside class="city-side"><h2>Cidades de '+era.name+'</h2><p>Encontre o alvo nomeado e encha a reserva de cada cidade ao longo de quantas noites precisar.</p>'+cards+
    (canHibernate?'<button class="hibernate-button" data-action="hibernate">✦ HIBERNAR PARA A PRÓXIMA ERA</button>':'<div class="hibernate-hint">✦ Termine a quinta cidade para hibernar. O eco adquirido dá dano e tempo permanentes. A árvore recomeça na era seguinte.</div>')+
    '</aside></div></section>'
}
function resultCard(){
  if(!night||!night.ended)return ''
  const cleared=save.cleared[save.district],dead=night.health<=0
  const final=save.victory
  return '<div class="result-overlay"><div class="result-card"><span class="eyebrow">'+(final?'O ECLIPSE É SEU':dead?'A CAÇADA TERMINOU':'A LUA SE PÔS')+'</span><h2>'+(final?'A história pertence aos vampiros':dead?'Você recuou antes do amanhecer':'Mais uma noite conquistada')+'</h2>'+
    '<div class="result-stats"><div><b>'+fmt(night.captures)+'</b><small>CAPTURAS</small></div><div><b>♦ '+fmt(night.blood)+'</b><small>SANGUE</small></div><div><b>'+(night.mission?'✓':'—')+'</b><small>ALVO</small></div></div>'+
    '<p>'+(cleared?'Cidade concluída! A próxima está disponível.':final?'Você capturou a Regente e 1.000 humanos em uma única noite.':'O sangue e o progresso ficam no banco. Prepare a próxima caçada na árvore.')+'</p>'+
    '<div class="result-actions"><button data-action="tree">ÁRVORE DE HABILIDADES</button><button data-action="city">MAPA DAS ERAS →</button></div></div></div>'
}
function huntPage(){
  const d=selectedDistrict(),era=ERAS[d.era]
  return '<section class="hunt-page"><div class="hunt-hud"><div class="hud-place"><span>'+era.icon+' '+era.name+'</span><strong>'+d.name+'</strong></div>'+
    '<div class="hud-metric"><small>AMANHECER</small><b id="timer">00:00</b><div class="hud-progress"><i id="timebar"></i></div></div>'+
    '<div class="hud-metric"><small>VIDA</small><b id="health">♥ ♥ ♥ ♥ ♥</b></div>'+
    '<div class="hud-metric"><small>CAPTURAS</small><b id="captures">0</b></div>'+
    '<div class="hud-metric"><small>SANGUE</small><b id="blood-earned">♦ 0</b></div></div>'+
    '<div class="stage-frame live-stage"><canvas id="game-canvas" width="'+W+'" height="'+H+'"></canvas><div class="stage-top"><span id="mission-state">✦ '+d.target+'</span><span id="combo-state">COMBO 0</span></div>'+
    '<div class="stage-bottom"><span id="tap-tip">Toque nos humanos • evite os guardas • encontre o alvo dourado</span><button data-action="retreat">RECUAR ↗</button></div></div>'+
    '<div class="hunt-footer"><div><b>CONTRATO</b><span id="quota-state">'+fmt(save.progress[save.district]||0)+' / '+fmt(d.quota)+' capturas</span></div><div><b>SERVOS</b><span>'+night?.servants+' em campo</span></div><div><b>ECOS</b><span>'+save.relics+' bônus permanentes</span></div></div>'+resultCard()+'</section>'
}
function render(){
  document.body.className='mode-'+mode
  app.innerHTML=header()+nav()+'<main>'+(mode==='tree'?skillTree():mode==='city'?cityPage():huntPage())+'</main>'
  if(mode==='tree')centerTree()
  if(mode==='city'||mode==='hunt')paint()
  updateHUD()
}
function centerTree(){
  const scroll=app.querySelector<HTMLElement>('.tree-scroll'),focus=SKILLS.find(x=>x.id===selected)
  if(scroll&&focus)scroll.scrollLeft=Math.max(0,focus.x-scroll.clientWidth/2)
}
window.addEventListener('resize',()=>{if(mode==='tree')centerTree()})
function paint(){
  const canvas=document.querySelector<HTMLCanvasElement>('#game-canvas')
  if(!canvas)return
  const context=canvas.getContext('2d')!
  drawCity(context,mode==='hunt'&&night?night:preview||new Night(save),performance.now()/1000)
}
function updateHUD(){
  if(mode!=='hunt'||!night)return
  const rem=night.remaining,mm=String(Math.floor(rem/60)).padStart(2,'0'),ss=String(Math.ceil(rem%60)).padStart(2,'0')
  const set=(id:string,text:string)=>{const e=document.getElementById(id);if(e)e.textContent=text}
  set('timer',mm+':'+ss);set('health','♥ '.repeat(night.health)+'♡ '.repeat(night.maxHealth-night.health))
  set('captures',fmt(night.captures));set('blood-earned','♦ '+fmt(night.blood))
  set('combo-state','COMBO '+night.combo);set('mission-state',night.mission?'✓ ALVO CAPTURADO':'✦ '+selectedDistrict().target)
  set('quota-state',fmt(save.progress[save.district]||0)+' / '+fmt(selectedDistrict().quota)+' capturas')
  const bar=document.getElementById('timebar');if(bar)bar.style.width=pct(rem,night.duration)+'%'
}
function frame(now:number){
  const dt=(now-lastFrame)/1000;lastFrame=now
  if(mode==='hunt'&&night&&!night.ended){
    night.update(dt)
    if(night.lastSound){sound(night.lastSound);night.lastSound=''}
    if(now-lastPaint>33){paint();lastPaint=now}
    if(now-lastHud>90){updateHUD();lastHud=now}
    if(tipUntil&&now>tipUntil){const tip=document.getElementById('tap-tip');if(tip)tip.textContent='Toque nos humanos • evite os guardas • encontre o alvo dourado';tipUntil=0}
    if(night.ended)render()
  }else if(mode==='city'&&now-lastPaint>33){paint();lastPaint=now}
  requestAnimationFrame(frame)
}
app.addEventListener('click',event=>{
  const target=event.target as HTMLElement
  const skillButton=target.closest<HTMLElement>('[data-skill]')
  if(skillButton){selected=skillButton.dataset.skill!;render();return}
  const cityButton=target.closest<HTMLElement>('[data-city]')
  if(cityButton){const id=Number(cityButton.dataset.city);if(id<=save.unlocked&&Math.floor(id/5)===save.era){save.district=id;persist(save);render()}return}
  const button=target.closest<HTMLElement>('[data-action]')
  if(!button)return
  const action=button.dataset.action
  if(action==='mute'){save.muted=!save.muted;persist(save);render()}
  if(action==='tree'){if(mode==='hunt'&&night&&!night.ended)night.finish();mode='tree';render()}
  if(action==='city'){if(mode==='hunt'&&night&&!night.ended)night.finish();mode='city';render()}
  if(action==='start'){night=new Night(save);mode='hunt';sound('mission');render()}
  if(action==='retreat'&&night){night.finish();render()}
  if(action==='buy'&&buy(save,button.dataset.id!)){sound('buy');render()}
  if(action==='hibernate'&&hibernate(save)){selected='moon';night=null;mode='tree';sound('missionComplete');render()}
})
app.addEventListener('pointerdown',event=>{
  const canvas=(event.target as HTMLElement).closest<HTMLCanvasElement>('canvas')
  if(!canvas||mode!=='hunt'||!night||night.ended)return
  event.preventDefault()
  const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*W/rect.width,y=(event.clientY-rect.top)*H/rect.height
  const hit=night.click(x,y,rect.width<600?62:46)
  const tip=document.getElementById('tap-tip');if(tip)tip.textContent=hit?'✦ ALVO ATINGIDO':'◇ NENHUM ALVO'
  tipUntil=performance.now()+850
  if(night.lastSound){sound(night.lastSound);night.lastSound=''}
  paint();updateHUD()
})
render()
requestAnimationFrame(frame)
