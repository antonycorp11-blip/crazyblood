import { ERAS } from './incremental/data'
import type { Human, Night } from './incremental/game'

export const W=1000,H=560
const cache=new Map<number,HTMLCanvasElement>()
const spriteFiles={humans:'humans.png',humansPre:'humans-prehistoric.png',humansNow:'humans-contemporary.png',humansFuture:'humans-future.png',vampires:'vampires.png',props:'city-props.png',terrain:'terrain.png',effects:'effects.png',sky:'day-night.png'} as const
const sprites={} as Record<keyof typeof spriteFiles,HTMLImageElement>
for(const key of Object.keys(spriteFiles) as Array<keyof typeof spriteFiles>){
  const img=new Image()
  img.onload=()=>cache.clear()
  img.src='/assets/sprites/'+spriteFiles[key]
  sprites[key]=img
}
const ready=(img:HTMLImageElement)=>img.complete&&img.naturalWidth>0
const humanAtlas=(era:number)=>[sprites.humansPre,sprites.humans,sprites.humansNow,sprites.humansFuture][era]
const effect=(c:CanvasRenderingContext2D,row:number,frame:number,x:number,y:number,size:number)=>{
  if(!ready(sprites.effects))return
  c.drawImage(sprites.effects,Math.floor(frame)%8*64,row*64,64,64,x-size/2,y-size/2,size,size)
}
const prop=(c:CanvasRenderingContext2D,era:number,variant:number,x:number,y:number,size:number)=>{
  if(!ready(sprites.props))return false
  const height=size*.9
  c.drawImage(sprites.props,variant*160,era*144,160,144,x-size/2,y-height,size,height)
  return true
}
const poly=(c:CanvasRenderingContext2D,points:number[][],color:string)=>{c.fillStyle=color;c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);c.closePath();c.fill()}
const rect=(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
const diamond=(c:CanvasRenderingContext2D,x:number,y:number,color:string)=>poly(c,[[x,y-18],[x+36,y],[x,y+18],[x-36,y]],color)
function building(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,era:number,variant:number){
  const p=[['#755c50','#493c4a','#b28b65'],['#6b5167','#352b49','#aa6e71'],['#436077','#263b56','#5a9db0'],['#294565','#18233f','#56bed1']][era]
  const left=p[0],side=p[1],trim=p[2]
  if(era===0){
    poly(c,[[x-w*.55,y],[x-w*.45,y-h*.65],[x,y-h],[x+w*.45,y-h*.65],[x+w*.55,y]],side)
    poly(c,[[x-w*.55,y],[x,y-h*.65],[x+w*.55,y]],left)
    rect(c,x-8,y-22,16,22,'#201e2d')
    rect(c,x-5,y-16,10,16,'#e38d52')
    for(let i=0;i<4;i++)rect(c,x-w*.35+i*w*.2,y-h*.48+(i%2)*5,4,4,trim)
  }else if(era===1){
    poly(c,[[x-w/2,y-h],[x+w/2,y-h],[x+w/2,y],[x-w/2,y]],left)
    poly(c,[[x+w/2,y-h],[x+w/2+15,y-h-8],[x+w/2+15,y-9],[x+w/2,y]],side)
    poly(c,[[x-w/2-8,y-h],[x,y-h-w*.38],[x+w/2+8,y-h]],'#33283e')
    poly(c,[[x-w/2,y-h-2],[x,y-h-w*.34],[x+w/2,y-h-2]],'#8c405b')
    rect(c,x-9,y-25,18,25,'#2e2638')
    rect(c,x-6,y-20,12,20,'#c78461')
    for(const dx of [-w*.3,w*.2])rect(c,x+dx,y-h+18,9,13,'#f6bd71')
    rect(c,x-w*.48,y-5,w*.96,5,trim)
  }else if(era===2){
    poly(c,[[x-w/2,y-h],[x+w/2,y-h],[x+w/2,y],[x-w/2,y]],left)
    poly(c,[[x+w/2,y-h],[x+w/2+13,y-h-9],[x+w/2+13,y-10],[x+w/2,y]],side)
    rect(c,x-w/2-4,y-h-7,w+8,9,'#243249')
    for(let xx=x-w/2+8;xx<x+w/2-6;xx+=17)for(let yy=y-h+15;yy<y-12;yy+=21)rect(c,xx,yy,9,12,(xx+yy+variant)%3?'#91c6d1':'#f0a66e')
    rect(c,x-w*.28,y-9,w*.56,7,'#f3547c')
  }else{
    poly(c,[[x-w/2,y-h],[x+w/2,y-h],[x+w/2,y],[x-w/2,y]],left)
    poly(c,[[x+w/2,y-h],[x+w/2+19,y-h-15],[x+w/2+19,y-12],[x+w/2,y]],side)
    poly(c,[[x-w/2,y-h],[x,y-h-28],[x+w/2,y-h]],'#527f99')
    for(let xx=x-w/2+10;xx<x+w/2-4;xx+=20)for(let yy=y-h+14;yy<y-8;yy+=24)rect(c,xx,yy,11,14,(xx+yy+variant)%3?'#69e7e3':'#e287df')
    rect(c,x-w*.4,y-7,w*.8,4,'#60d9e9')
  }
  rect(c,x-w*.52,y+1,w+12,5,'#191a31')
}
function scenery(index:number){
  if(cache.has(index))return cache.get(index)!
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H
  const c=canvas.getContext('2d')!;const era=Math.floor(index/5),city=index%5
  for(let i=0;i<13;i++){
    const x=i*88-25,h=38+(i*37+city*19)%70
    poly(c,[[x,210],[x+45,205-h],[x+100,210]],era===0?'#332f43':era===1?'#27263c':era===2?'#1a3149':'#142e51')
  }
  rect(c,0,168,W,H-168,['#51433f','#4d4057','#344a5c','#2b4562'][era])
  for(let i=-20;i<25;i++)for(let j=-15;j<22;j++){
    const x=500+(i-j)*36,y=222+(i+j)*18
    if(x<-40||x>1040||y<145||y>570)continue
    const noise=(i*71+j*43+index*17)%9
    const colors=era===0?['#67544b','#6a574c','#725c4f']:era===1?['#5c4c5b','#625160','#675467']:era===2?['#455667','#4b5d6c','#506170']:['#405774','#455e7b','#4c6784']
    if(ready(sprites.terrain))c.drawImage(sprites.terrain,Math.abs(noise)%4*72,era*36,72,36,x-36,y-18,72,36)
    else diamond(c,x,y,colors[Math.abs(noise)%3])
    if(noise===0&&y>240&&y<520)rect(c,x-1,y-1,3,3,era===3?'#8ce7eb':'#998578')
  }
  const accent=ERAS[era].color
  if(city===0){
    for(const x of [125,257,740,865]){
      rect(c,x-4,206,8,29,era===0?'#45383a':era===1?'#4b3949':era===2?'#364d61':'#336173')
      if(era<2){poly(c,[[x-22,211],[x,178],[x+22,211]],era===0?'#3c5749':'#315565');poly(c,[[x-17,197],[x,170],[x+17,197]],era===0?'#4e6a50':'#3d6870')}
      else{rect(c,x-13,183,26,5,accent);rect(c,x-8,191,16,4,'#b9f2e8')}
    }
  }else if(city===1){
    for(const x of [235,450,650,830]){
      rect(c,x-29,206,58,25,era===0?'#5f4a42':'#3b3d53')
      poly(c,[[x-34,206],[x,185],[x+34,206]],era===0?'#ad6c55':accent)
      rect(c,x-18,215,36,4,era>=2?'#77e7ed':'#e6ae79')
    }
  }else if(city===2){
    poly(c,[[0,197],[1000,197],[1000,237],[0,237]],era===0?'#3d7081':era===1?'#356b86':era===2?'#356987':'#4c88aa')
    for(let x=0;x<1000;x+=73){rect(c,x,211+(x%3),37,2,era>=2?'#7cd7e9':'#9ec5bd')}
    poly(c,[[405,199],[595,199],[620,237],[380,237]],era>=2?'#617c8b':'#817269')
    rect(c,398,194,203,7,era>=2?'#a7d8e2':'#af9480')
  }else if(city===3){
    rect(c,0,193,1000,38,era===0?'#6d554c':era===1?'#655266':era===2?'#465b6f':'#344c70')
    for(let x=0;x<1000;x+=42)rect(c,x,181,28,13,era>=2?'#55768b':'#775b69')
    rect(c,440,195,120,36,'#241e30')
    poly(c,[[425,195],[500,170],[575,195]],era>=2?'#7695a2':'#94616d')
    rect(c,476,203,48,28,'#b07d70')
  }else{
    poly(c,[[346,228],[369,172],[630,172],[654,228]],era===0?'#493c45':era===1?'#55435d':era===2?'#3c5872':'#294464')
    rect(c,374,159,252,15,era>=2?'#4c7895':'#856778')
    for(const x of [374,604]){rect(c,x,119,22,62,era>=2?'#436687':'#685168');poly(c,[[x-7,120],[x+11,92],[x+29,120]],accent)}
    rect(c,479,182,42,46,'#242139');rect(c,487,194,26,34,era>=2?'#78d9de':'#df977b')
  }
  const houseCount=6+city*2
  for(let i=0;i<houseCount;i++){
    const top=i<houseCount/2
    const row=top?i:houseCount-1-i
    const x=35+row*(900/(Math.ceil(houseCount/2)-1))
    const y=top?180+(row%2)*14:535-(row%2)*10
    if(!prop(c,era,i%4===1?1:0,x,y,era===0?125:era>=2?135:140))
      building(c,x,y,era===0?75:era>=2?78:83,era===0?60:era>=2?85:72,era,i)
  }
  // traversable streets and landmarks share the same city coordinates as the characters
  for(let i=0;i<10;i++){
    const x=88+i*91,y=i%2?220:465
    rect(c,x-2,y-28,4,29,era===0?'#442e32':'#27253b')
    rect(c,x-6,y-31,12,6,accent)
    if(!prop(c,era,3,x,y,era===0?45:52))rect(c,x-3,y-38,6,7,era===0?'#ffad5f':era===1?'#ffd38b':era===2?'#79d9ef':'#c3f5ff')
  }
  for(let i=0;i<4+city*3;i++){
    const x=116+(i*191+city*43)%770,y=i%2?238:477
    if(era===0){poly(c,[[x-14,y],[x,y-13],[x+17,y]],'#75655b');rect(c,x-3,y-8,6,4,'#a18b70')}
    else if(era===1){rect(c,x-13,y-12,26,12,'#63495a');rect(c,x-17,y-17,34,6,i%3?'#a95b66':'#d4a674')}
    else if(era===2){rect(c,x-11,y-14,22,14,'#34465b');rect(c,x-7,y-11,14,3,'#719db2')}
    else{poly(c,[[x-12,y],[x,y-19],[x+12,y]],'#304e6d');rect(c,x-4,y-13,8,4,'#72e6ed')}
  }
  cache.set(index,canvas);return canvas
}
function activity(c:CanvasRenderingContext2D,era:number,t:number,city:number){
  if(era===0){
    for(let i=0;i<5;i++){
      const x=97+i*196,y=i%2?227:465,flicker=Math.sin(t*11+i*3)*4
      if(ready(sprites.effects))effect(c,0,Math.floor(t*9+i),x,y-21,44)
      else{poly(c,[[x-5,y-18],[x,y-34-flicker],[x+6,y-18]],'#ff924d');poly(c,[[x-2,y-18],[x,y-28-flicker*.5],[x+3,y-18]],'#ffe391')}
      for(let j=0;j<3;j++)rect(c,x+Math.sin(t+j*3+i)*8,y-44-(t*12+j*13)%20,2,2,'#ffc477')
    }
    const animalX=100+(t*12+city*67)%850
    rect(c,animalX,478,25,12,'#493544');rect(c,animalX+18,472,10,10,'#493544');rect(c,animalX+2,488,3,7,'#392c3b');rect(c,animalX+18,488,3,7,'#392c3b')
  }else if(era===1){
    for(let i=0;i<6;i++){
      const x=84+i*165,y=i%2?230:466
      poly(c,[[x,y-45],[x+17+Math.sin(t*3+i)*4,y-41],[x,y-34]],i%2?'#bf536b':'#dda16e')
    }
    const cartX=100+(t*18+city*101)%840
    rect(c,cartX,474,27,11,'#8d5b52');rect(c,cartX+2,485,5,5,'#292739');rect(c,cartX+21,485,5,5,'#292739')
  }else if(era===2){
    for(let lane=0;lane<2;lane++){
      const x=lane?950-(t*65+city*49)%1050:(t*57+city*79)%1050-50,y=lane?445:335
      if(!prop(c,2,2,x+18,y+17,67)){rect(c,x,y,34,13,lane?'#bc4d71':'#4f9abb');rect(c,x+5,y-4,20,5,'#9dd3e1')}
    }
  }else{
    for(let i=0;i<4;i++){
      const x=(t*(i%2?35:-29)+i*273+4000)%1100-50,y=195+i*66+Math.sin(t*3+i)*9
      poly(c,[[x-13,y],[x,y-7],[x+13,y],[x,y+4]],'#58bcc8')
      rect(c,x-3,y-3,6,3,'#e3a5ff')
      rect(c,x-7,y+5,14,2,'#a1f5f3')
    }
    const hoverX=(t*59+city*77)%1070-50
    prop(c,3,2,hoverX,429+Math.sin(t*4)*6,78)
  }
}
function human(c:CanvasRenderingContext2D,h:Human,era:number,t:number){
  const x=Math.round(h.x),y=Math.round(h.y),walk=Math.sin(t*10+h.id)*2
  const named=h.named,guard=h.kind==='hunter'||named&&h.maxHp>15
  const outfit=era===0?['#ad865d','#ad755e','#987358','#bd9b69','#9c644f'][h.shade]:era===1?['#5e86a5','#bd7a64','#8b779e','#6b9c8c','#b99e73'][h.shade]:era===2?['#5b8eaa','#ad6185','#628d73','#a98d61','#786aa6'][h.shade]:['#6de0d9','#d179ca','#7a9eee','#b3a4d6','#d199a5'][h.shade]
  c.fillStyle='#11152277';c.beginPath();c.ellipse(x,y+1,13,5,0,0,Math.PI*2);c.fill()
  if(named){c.fillStyle='#ffd979';c.beginPath();c.arc(x,y-17,23+Math.sin(t*4)*2,0,Math.PI*2);c.globalAlpha=.18;c.fill();c.globalAlpha=1}
  const atlas=humanAtlas(era)
  if(ready(atlas)){
    const row=named?4:h.kind==='runner'?1:h.kind==='hunter'?2:h.kind==='rare'?3:0
    const frame=h.flash>0?4:h.panic>0?3:Math.floor(t*5+h.id)%3
    c.drawImage(atlas,frame*96,row*96,96,96,x-26,y-60,52,62)
    if(named||h.hp<h.maxHp){rect(c,x-19,y-68,38,5,'#1c1729');rect(c,x-18,y-67,36*h.hp/h.maxHp,3,named?'#ffd77b':'#f36783')}
    if(named){rect(c,x-3,y-77,6,6,'#ffe7a1');rect(c,x-1,y-81,2,4,'#ffe7a1')}
    if(h.kind==='hunter'&&h.attack<=.25)rect(c,x-3,y-75,6,5,'#ff6e6e')
    return
  }
  rect(c,x-5,y-10,4,10+walk,'#282438');rect(c,x+2,y-10,4,10-walk,'#282438')
  rect(c,x-7,y-25,14,17,guard?era>=2?'#486d8a':'#766370':outfit)
  rect(c,x-10,y-23,3,12,guard?'#b1becd':outfit);rect(c,x+7,y-23,3,12,guard?'#b1becd':outfit)
  rect(c,x-6,y-35,12,11,era===0?'#c68f6a':'#dbac89')
  rect(c,x-6,y-36,12,4,guard?'#303d54':named?'#f6d27e':'#493849')
  rect(c,x-3,y-30,2,2,'#29253a');rect(c,x+2,y-30,2,2,'#29253a')
  if(era===0){rect(c,x-8,y-25,16,3,'#e2bd87')}else if(era===3){rect(c,x-6,y-22,12,3,'#72ecf1')}
  if(h.kind==='runner')rect(c,x-5,y-39,10,2,'#ffca7b')
  if(h.kind==='rare')rect(c,x-7,y-42,14,3,'#e1a0ff')
  if(guard){rect(c,x+10,y-23,3,18,'#e3b36b');rect(c,x+8,y-25,7,4,'#f9d78d')}
  if(h.flash>0){c.globalAlpha=h.flash*3;c.fillStyle='#fff1df';c.fillRect(x-10,y-39,21,39);c.globalAlpha=1}
  if(named||h.hp<h.maxHp){rect(c,x-14,y-48,28,4,'#1c1729');rect(c,x-13,y-47,26*h.hp/h.maxHp,2,named?'#ffd77b':'#f36783')}
  if(named){rect(c,x-3,y-58,6,6,'#ffe7a1');rect(c,x-1,y-62,2,4,'#ffe7a1')}
  if(h.kind==='hunter'&&h.attack<=.25){rect(c,x-3,y-55,6,5,'#ff6e6e')}
}
function vampire(c:CanvasRenderingContext2D,night:Night,t:number){
  const x=Math.round(night.vampireX),y=Math.round(night.vampireY),flap=Math.sin(t*13)*5
  c.fillStyle='#090b19aa';c.beginPath();c.ellipse(x,y+2,18,6,0,0,Math.PI*2);c.fill()
  if(ready(sprites.vampires)){
    const moving=Math.hypot(night.vampireTargetX-night.vampireX,night.vampireTargetY-night.vampireY)>18
    const frame=night.vampireHurt>0?5:night.vampireAttack>0?4:moving?3:Math.floor(t*4)%3
    c.drawImage(sprites.vampires,frame*112,night.district.era*112,112,112,x-42,y-86,84,89)
    return
  }
  poly(c,[[x-8,y-27],[x-23,y-35-flap],[x-31,y-23],[x-18,y-18],[x-11,y-13]],'#4d203e')
  poly(c,[[x+8,y-27],[x+23,y-35-flap],[x+31,y-23],[x+18,y-18],[x+11,y-13]],'#4d203e')
  poly(c,[[x-11,y-31],[x,y-37],[x+11,y-31],[x+14,y-2],[x,y-7],[x-14,y-2]],'#281629')
  rect(c,x-9,y-31,18,14,'#caafaa');rect(c,x-11,y-37,22,9,'#151326')
  rect(c,x-7,y-26,4,3,'#ff6683');rect(c,x+3,y-26,4,3,'#ff6683')
  rect(c,x-4,y-17,2,4,'#fff1dd');rect(c,x+3,y-17,2,4,'#fff1dd')
  rect(c,x-10,y-7,6,10,'#221526');rect(c,x+4,y-7,6,10,'#221526')
  c.strokeStyle='#f36b83';c.lineWidth=1;c.globalAlpha=.4;c.beginPath();c.arc(x,y-21,23+Math.sin(t*4)*2,0,Math.PI*2);c.stroke();c.globalAlpha=1
}
export function drawCity(c:CanvasRenderingContext2D,night:Night,t:number,preview=false){
  const scale=c.canvas.height/H,offset=(c.canvas.width-W*scale)/2
  c.setTransform(1,0,0,1,0,0)
  c.clearRect(0,0,c.canvas.width,c.canvas.height)
  c.setTransform(scale,0,0,scale,offset,0)
  const progress=Math.min(1,preview ? .12+.025*Math.sin(t*.25) : night.elapsed/night.duration)
  if(ready(sprites.sky)){
    const position=progress*7,frame=Math.min(7,Math.floor(position)),next=Math.min(7,frame+1)
    c.drawImage(sprites.sky,frame*512,0,512,160,0,0,W,210)
    if(next!==frame){c.globalAlpha=position-frame;c.drawImage(sprites.sky,next*512,0,512,160,0,0,W,210);c.globalAlpha=1}
  }else{rect(c,0,0,W,210,'#261d39')}
  c.drawImage(scenery(night.save.district),0,0)
  if(progress>.55){c.fillStyle='rgba(255,157,115,'+((progress-.55)*.5)+')';c.fillRect(0,165,W,H-165)}
  const era=night.district.era
  // animated light pools and spatial effects
  for(let i=0;i<10;i++){const x=88+i*91,y=i%2?220:465;c.globalAlpha=.13+Math.sin(t*5+i)*.04;c.fillStyle=era>=2?'#76daef':'#ffb56d';c.beginPath();c.ellipse(x,y+7,20,9,0,0,Math.PI*2);c.fill()}
  c.globalAlpha=1
  activity(c,era,t,night.district.city)
  const people=[...night.humans].sort((a,b)=>a.y-b.y)
  for(const h of people)human(c,h,era,t)
  vampire(c,night,t)
  for(const a of night.animations){
    if(a.row<5)effect(c,a.row,Math.floor(a.age/a.duration*8),a.x,a.y,a.size)
    else{
      const atlas=humanAtlas(era)
      if(ready(atlas)){
        c.globalAlpha=1-a.age/a.duration
        c.drawImage(atlas,5*96,(a.row-5)*96,96,96,a.x-a.size/2,a.y-a.size,a.size,a.size)
        c.globalAlpha=1
      }
    }
  }
  const servants=Math.min(night.servants,24)
  for(let i=0;i<servants;i++){
    const x=150+(i*79)%720+Math.sin(t*1.8+i)*28,y=170+(i*53)%290+Math.cos(t*2+i)*16
    if(ready(sprites.effects))effect(c,4,Math.floor(t*12+i),x,y,36)
    else{rect(c,x-7,y-2,5,4,'#4fe4d8');rect(c,x-2,y-5,4,6,'#9dfbf0');rect(c,x+2,y-2,5,4,'#4fe4d8')}
  }
  for(const p of night.particles){
    c.globalAlpha=Math.min(1,p.life*2)
    if(p.text){c.font='bold 13px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#1c1728';c.strokeText(p.text,p.x,p.y);c.fillStyle=p.color;c.fillText(p.text,p.x,p.y)}
    else rect(c,p.x,p.y,p.size,p.size,p.color)
  }
  c.globalAlpha=1
  if(night.shakes>0){c.fillStyle='rgba(255,82,111,.08)';c.fillRect(0,0,W,H)}
  c.setTransform(1,0,0,1,0,0)
}
