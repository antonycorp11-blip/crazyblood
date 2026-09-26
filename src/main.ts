import './style.css'
import { BRANCHES, DISTRICTS, ERAS, SKILLS, skillCost } from './incremental/data'
import { Night, available, buy, hibernate, level, load, persist } from './incremental/game'
import { drawCity, H, W } from './city'

const app=document.querySelector<HTMLDivElement>('#app')!
let save=load()
let mode:'tree'|'city'|'hunt'='city'
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
const requiredCaptures=()=>save.district===19?1000:selectedDistrict().quota

function sound(name:string){
  if(save.muted||!name)return
  try{
    audioCtx??=new AudioContext()
    if(audioCtx.state==='suspended')audioCtx.resume()
    const at=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain()
    const tones:Record<string,[number,number,number]>={
      hit:[240,145,.09],capture:[470,760,.16],servant:[350,520,.08],hurt:[130,60,.25],
      mission:[420,620,.35],missionComplete:[540,980,.5],pulse:[160,520,.4],buy:[420,850,.25],escape:[500,150,.35],
    }
    const [from,to,duration]=tones[name]||tones.capture
    osc.type=name==='hurt'?'sawtooth':'triangle'
    osc.frequency.setValueAtTime(from,at);osc.frequency.exponentialRampToValueAtTime(Math.max(1,to),at+duration)
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(name==='hurt'?.1:.055,at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+duration)
    osc.connect(gain);gain.connect(audioCtx.destination);osc.start(at);osc.stop(at+duration+.01)
  }catch{}
}
function header(){
  return '<header class="topbar"><button class="brand" data-action="city"><span class="brand-mark">☾</span><span><strong>CRAZYBLOOD</strong><small>AS ERAS DA CAÇADA</small></span></button>'+
    '<nav class="game-menu"><button data-action="city" class="'+(mode==='city'?'active':'')+'">MAPA</button><button data-action="tree" class="'+(mode==='tree'?'active':'')+'">RAÍZES</button></nav>'+
    '<div class="top-info"><span class="blood-chip"><i class="mini-drop"></i><strong>'+fmt(save.blood)+'</strong></span><span class="relic-chip">✦ '+save.relics+'</span></div>'+
    '<button class="sound-button" data-action="mute" aria-label="Alternar som">'+(save.muted?'♪̸':'♫')+'</button></header>'
}
function skillTree(){
  const skill=SKILLS.find(x=>x.id===selected)||SKILLS[0]
  const lv=level(save,skill.id),max=lv>=skill.max,cost=skillCost(skill,lv),unlocked=available(save,skill.id)
  const branch=BRANCHES[skill.branch]
  const revealed=(x:typeof SKILLS[number])=>!x.requires||level(save,x.requires)>0
  // Five fixed columns (one chain per branch) that always fit the screen — no scrolling anywhere.
  const columns=(Object.keys(BRANCHES) as (keyof typeof BRANCHES)[]).map(key=>{
    const b=BRANCHES[key],chain=SKILLS.filter(x=>x.branch===key)
    const owned=chain.reduce((n,x)=>n+level(save,x.id),0)
    const tiles=chain.map(x=>{
      const index=SKILLS.indexOf(x)
      if(!revealed(x))return '<div class="skill-tile hidden" aria-hidden="true"><span class="tile-mystery">?</span></div>'
      const l=level(save,x.id),can=available(save,x.id),afford=can&&save.blood>=skillCost(x,l)
      return '<button class="skill-tile '+(l?'owned ':'')+(afford?'affordable ':'')+(l>=x.max?'maxed ':'')+(selected===x.id?'selected':'')+'" data-skill="'+x.id+'" aria-label="'+x.name+'" style="--ix:'+(index%6)+';--iy:'+Math.floor(index/6)+'">'+
        '<span class="tile-icon"></span><span class="tile-name">'+x.name+'</span><span class="tile-level">'+l+'/'+x.max+'</span></button>'
    }).join('')
    const any=chain.some(revealed)
    return '<div class="skill-column '+(any?'':'dormant')+'" style="--branch:'+b.color+'"><div class="column-head"><b>'+b.label+'</b><small>'+(any?owned+' níveis':'adormecido')+'</small></div><div class="column-tiles">'+tiles+'</div></div>'
  }).join('')
  const lockText=!unlocked&&!max?'Requer '+SKILLS.find(x=>x.id===skill.requires)?.name:save.blood<cost?'Sangue insuficiente':'Disponível'
  const detailIndex=SKILLS.indexOf(skill)
  return '<section class="tree-page"><div class="section-heading"><div><span class="eyebrow">SANTUÁRIO DAS RAÍZES</span><h1>A árvore da noite</h1></div><div class="tree-stat"><b>'+SKILLS.reduce((n,x)=>n+level(save,x.id),0)+'</b><span>poderes<br>despertos</span></div></div>'+
    '<div class="tree-layout"><div class="skill-columns">'+columns+'</div>'+
    '<aside class="skill-detail" style="--branch:'+branch.color+'"><div class="detail-glyph" style="--ix:'+(detailIndex%6)+';--iy:'+Math.floor(detailIndex/6)+'"></div>'+
    '<div class="detail-text"><div class="detail-branch">'+branch.label+' · NÍVEL '+lv+'/'+skill.max+'</div><h2>'+skill.name+'</h2><p>'+skill.description+'</p></div>'+
    '<div class="effect-box"><span>POR NÍVEL</span><strong>'+skill.effect+'</strong></div>'+
    '<button class="buy-button" data-action="buy" data-id="'+skill.id+'" '+(!unlocked||save.blood<cost?'disabled':'')+'>'+(max?'MAXIMIZADO':unlocked?'DESPERTAR · ♦ '+fmt(cost):lockText)+'</button></aside></div></section>'
}
function eraTimeline(){
  return '<div class="era-timeline">'+ERAS.map((era,i)=>'<span class="era-step '+(i===save.era?'current':i<save.era?'past':'future')+'" style="--era:'+era.color+'">'+era.icon+'</span>').join('')+'</div>'
}
function cityPage(){
  const era=ERAS[save.era],d=selectedDistrict(),best=save.bestByCity[save.district]||0,required=requiredCaptures()
  const nodes=era.cities.map((_,i)=>{
    const id=save.era*5+i,city=DISTRICTS[id],locked=id>save.unlocked,clear=save.cleared[id]
    return '<button class="city-node '+(id===save.district?'selected ':'')+(locked?'locked':'')+'" data-city="'+id+'" '+(locked?'disabled':'')+'>'+
      '<span class="city-node-seal">'+(clear?'✓':locked?'⌁':'0'+(i+1))+'</span><span class="city-node-name">'+city.name+'</span></button>'
  }).join('')
  const canHibernate=save.era<3&&save.cleared[save.era*5+4]
  preview=new Night(save)
  return '<section class="city-page"><div class="city-scene"><canvas id="game-canvas" width="'+W+'" height="'+H+'"></canvas><div class="scene-vignette"></div></div>'+
    '<div class="city-ui"><div class="chapter-line"><span>CRÔNICA 0'+(save.era+1)+' / 04</span>'+eraTimeline()+'<span>'+era.years+'</span></div>'+
    '<div class="city-hero"><div class="city-story"><span class="eyebrow">'+era.name+' · CIDADE '+(d.city+1)+' DE 5</span><h1>'+d.name+'</h1><p>'+era.biome+'</p>'+
    '<div class="vampire-portrait" style="background-position:0 '+(-save.era*168)+'px" aria-hidden="true"></div></div>'+
    '<div class="mission-scroll"><span class="eyebrow">CONTRATO DE CAÇA</span><h2>'+d.target+'</h2><p>'+d.intro+'</p>'+
    '<div class="mission-rule"><strong>'+fmt(best)+' <small>/ '+fmt(required)+'</small></strong><span>MELHOR NOITE NESTA CIDADE</span></div>'+
    '<div class="mission-meter"><i style="width:'+pct(best,required)+'%"></i></div>'+
    '<div class="mission-note">'+(save.cleared[save.district]?'✦ CIDADE DOMINADA':'☾ Alvo, cota e amanhecer na mesma noite')+'</div>'+
    '<button class="launch-button" data-action="start">INICIAR CAÇADA <span>➜</span></button></div></div>'+
    '<div class="city-bottom"><div class="city-route"><span class="route-title">CAMINHO DA ERA</span><div class="route-nodes">'+nodes+'</div></div>'+
    (canHibernate?'<button class="hibernate-button" data-action="hibernate">✦ HIBERNAR · PRÓXIMA ERA</button>':'<span class="era-hint">Conquiste as cinco cidades para hibernar</span>')+
    '</div></div></section>'
}
function resultCard(){
  if(!night||!night.ended)return ''
  const cleared=night.qualified,final=night.won
  const reason=night.endReason==='defeat'?'Você caiu em combate':night.endReason==='lockdown'?'A cidade entrou em alerta':night.endReason==='retreat'?'Você recuou':night.targetEscaped?'O alvo escapou':night.captures<night.requiredCaptures?'A cota ainda não foi alcançada':'A lua se pôs'
  return '<div class="result-overlay"><div class="result-card"><span class="eyebrow">'+(final?'ECLIPSE TOTAL':cleared?'CIDADE CONQUISTADA':'NOITE ENCERRADA')+'</span><h2>'+(final?'A história pertence aos vampiros':cleared?'A cidade é sua':reason)+'</h2>'+
    '<div class="result-stats"><div><b>'+fmt(night.captures)+'</b><small>CAPTURAS</small></div><div><b>♦ '+fmt(night.blood)+'</b><small>SANGUE</small></div><div><b>'+(night.mission?'✓':'—')+'</b><small>ALVO</small></div></div>'+
    '<p>'+(final?'Imperatriz capturada e 1.000 humanos em uma única noite.':cleared?'Contrato, cota e amanhecer concluídos. A próxima cidade foi aberta.':'Sua melhor noite aqui: '+fmt(save.bestByCity[save.district]||0)+' / '+fmt(night.requiredCaptures)+'. O sangue foi guardado para a próxima tentativa.')+'</p>'+
    '<div class="result-actions"><button data-action="tree">DESPERTAR PODERES</button><button data-action="city">VOLTAR AO MAPA →</button></div></div></div>'
}
function huntPage(){
  const d=selectedDistrict(),era=ERAS[d.era]
  return '<section class="hunt-page"><div class="hunt-hud"><div class="hud-place"><span>'+era.icon+' '+era.name+'</span><strong>'+d.name+'</strong></div>'+
    '<div class="hud-metric"><small>AMANHECER</small><b id="timer">00:00</b><div class="hud-progress"><i id="timebar"></i></div></div>'+
    '<div class="hud-metric"><small>VIDA</small><b id="health">♥ ♥ ♥ ♥ ♥</b></div>'+
    '<div class="hud-metric"><small>CAPTURAS</small><b id="captures">0</b></div>'+
    '<div class="hud-metric"><small>ALERTA</small><b id="alarm">0%</b><div class="alarm-progress"><i id="alarmbar"></i></div></div></div>'+
    '<div class="stage-frame live-stage"><canvas id="game-canvas" width="'+W+'" height="'+H+'"></canvas><div class="stage-top"><span id="mission-state">✦ '+d.target+'</span><span id="combo-state">COMBO 0</span></div>'+
    '<div class="stage-bottom"><span id="tap-tip">Toque nos humanos • evite os guardas • encontre o alvo dourado</span><button data-action="retreat">RECUAR ↗</button></div></div>'+
    '<div class="hunt-footer"><div><b>COTA DA NOITE</b><span id="quota-state">0 / '+fmt(requiredCaptures())+'</span></div><div><b>SANGUE</b><span id="blood-earned">♦ 0</span></div><div><b>SERVOS</b><span>'+night?.servants+' em campo</span></div></div>'+resultCard()+'</section>'
}
function render(){
  document.body.className='mode-'+mode
  app.innerHTML=header()+'<main>'+(mode==='tree'?skillTree():mode==='city'?cityPage():huntPage())+'</main>'
  if(mode==='city'||mode==='hunt')paint()
  updateHUD()
}
function paint(){
  const canvas=document.querySelector<HTMLCanvasElement>('#game-canvas')
  if(!canvas)return
  const dpr=Math.min(2,window.devicePixelRatio||1)
  const width=Math.max(1,Math.round(canvas.clientWidth*dpr)),height=Math.max(1,Math.round(canvas.clientHeight*dpr))
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
  const context=canvas.getContext('2d')!
  drawCity(context,mode==='hunt'&&night?night:preview||new Night(save),performance.now()/1000,mode==='city')
}
function updateHUD(){
  if(mode!=='hunt'||!night)return
  const rem=night.remaining,mm=String(Math.floor(rem/60)).padStart(2,'0'),ss=String(Math.ceil(rem%60)).padStart(2,'0')
  const set=(id:string,text:string)=>{const e=document.getElementById(id);if(e)e.textContent=text}
  set('timer',mm+':'+ss);set('health','♥ '.repeat(night.health)+'♡ '.repeat(night.maxHealth-night.health))
  set('captures',fmt(night.captures));set('blood-earned','♦ '+fmt(night.blood));set('alarm',Math.floor(night.alarm)+'%')
  set('combo-state','COMBO '+night.combo);set('mission-state',night.mission?'✓ ALVO CAPTURADO':night.targetEscaped?'✕ ALVO ESCAPOU':'✦ '+selectedDistrict().target)
  set('quota-state',fmt(night.captures)+' / '+fmt(night.requiredCaptures))
  const bar=document.getElementById('timebar');if(bar)bar.style.width=pct(rem,night.duration)+'%'
  const alarmbar=document.getElementById('alarmbar');if(alarmbar)alarmbar.style.width=Math.floor(night.alarm)+'%'
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
  const rect=canvas.getBoundingClientRect(),scale=rect.height/H
  const x=W/2+(event.clientX-rect.left-rect.width/2)/scale,y=(event.clientY-rect.top)/scale
  const hit=night.click(x,y,rect.width<600?62:46)
  const tip=document.getElementById('tap-tip');if(tip)tip.textContent=hit?'✦ ALVO ATINGIDO':'◇ NENHUM ALVO'
  tipUntil=performance.now()+850
  if(night.lastSound){sound(night.lastSound);night.lastSound=''}
  paint();updateHUD()
})
render()
requestAnimationFrame(frame)
