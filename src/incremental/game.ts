import { DISTRICTS, SKILLS, skillCost } from './data'
import { camera } from '../viewport'

export type HumanKind='common'|'runner'|'hunter'|'rare'|'named'
export type Human={id:number;x:number;y:number;vx:number;vy:number;hp:number;maxHp:number;kind:HumanKind;named:boolean;flash:number;attack:number;life:number;shade:number;panic:number;windup:number}
export type Particle={x:number;y:number;vx:number;vy:number;life:number;color:string;size:number;text?:string}
export type AnimatedEffect={x:number;y:number;row:number;age:number;duration:number;size:number}
export type Save={blood:number;district:number;unlocked:number;era:number;relics:number;progress:Record<number,number>;bestByCity:Record<number,number>;contracts:Record<number,number>;missions:Record<number,boolean>;cleared:Record<number,boolean>;levels:Record<string,number>;nights:number;total:number;best:number;victory:boolean;muted:boolean}
const KEY='crazyblood-hunt-v5'
const defaultSave=():Save=>({blood:0,district:0,unlocked:0,era:0,relics:0,progress:{},bestByCity:{},contracts:{},missions:{},cleared:{},levels:{},nights:0,total:0,best:0,victory:false,muted:false})
export const load=():Save=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&typeof x.blood==='number')return {...defaultSave(),...x,levels:x.levels||{},progress:x.progress||{},bestByCity:x.bestByCity||{},contracts:x.contracts||{},missions:x.missions||{},cleared:x.cleared||{}}}catch{}return defaultSave()}
export const persist=(s:Save)=>localStorage.setItem(KEY,JSON.stringify(s))
export const level=(s:Save,id:string)=>s.levels[id]||0
export const available=(s:Save,id:string)=>{const skill=SKILLS.find(x=>x.id===id)!;return level(s,id)<skill.max&&(!skill.requires||level(s,skill.requires)>0)}
export const buy=(s:Save,id:string)=>{const skill=SKILLS.find(x=>x.id===id);if(!skill||!available(s,id))return false;const cost=skillCost(skill,level(s,id));if(s.blood<cost)return false;s.blood-=cost;s.levels[id]=level(s,id)+1;persist(s);return true}
export const hibernate=(s:Save)=>{if(s.era>=3||!s.cleared[s.era*5+4])return false;s.era++;s.relics++;s.district=s.era*5;s.unlocked=s.district;s.blood=0;s.levels={};persist(s);return true}
const rand=(a:number,b:number)=>a+Math.random()*(b-a)
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))
let NEXT_ID=1

export class Night{
  save:Save
  humans:Human[]=[]
  particles:Particle[]=[]
  animations:AnimatedEffect[]=[]
  elapsed=0
  duration:number
  health:number
  maxHealth:number
  captures=0
  blood=0
  combo=0
  comboClock=0
  mission=false
  missionThisNight=false
  missionSpawned=false
  missionTimer=7
  nextStrike=0
  focusId=0
  focusUntil=0
  charge=0
  powerCount=0
  powerCooldown=0
  viewportWidth=1000
  viewportHeight=560
  saveClock=0
  targetEscaped=false
  alarm=0
  spawnClock=0
  servantClock=0
  pulseClock=0
  ended=false
  qualified=false
  endReason:'dawn'|'defeat'|'lockdown'|'retreat'|null=null
  won=false
  shakes=0
  lastSound=''
  vampireX=500
  vampireY=350
  vampireTargetX=500
  vampireTargetY=350
  vampireAttack=0
  vampireHurt=0
  constructor(save:Save,viewport?:{width:number;height:number}){
    this.save=save
    if(viewport)this.setViewport(viewport.width,viewport.height)
    this.duration=22+6*level(save,'moon')+12*level(save,'dusk')+30*level(save,'immortal')+save.relics*4
    this.maxHealth=5+2*level(save,'vigor')
    this.health=this.maxHealth
    this.mission=false
    this.missionSpawned=false
    for(let i=0;i<12+this.district.city*12+this.district.era*4;i++)this.spawn()
  }
  get district(){return DISTRICTS[this.save.district]}
  get requiredCaptures(){return this.save.district===19?3000:this.district.quota}
  get horizontalBounds():[number,number]{
    const view=camera(this.viewportWidth,this.viewportHeight)
    return [Math.max(125,view.left+28),Math.min(875,view.right-28)]
  }
  get verticalBounds():[number,number]{
    const view=camera(this.viewportWidth,this.viewportHeight)
    return [Math.max(170,view.top+90),Math.min(478,view.bottom-25)]
  }
  setViewport(width:number,height:number){this.viewportWidth=width;this.viewportHeight=Math.max(1,height)}
  get strikeGap(){return Math.max(.12,.26-level(this.save,'frenzy')*.025)}
  get damage(){return 1+this.save.relics+level(this.save,'fang')+Math.min(level(this.save,'frenzy')*2,Math.floor(this.combo/10))}
  get servants(){return level(this.save,'thrall')+2*level(this.save,'pack')+12*level(this.save,'legion')}
  get remaining(){return Math.max(0,this.duration-this.elapsed)}
  spawn(named=false){
    if(!named&&this.humans.length>=Math.min(300,this.district.population+level(this.save,'surge')*16))return
    const d=this.district
    const r=Math.random()
    let kind:HumanKind=named?'named':r<.035+d.city*.035+d.era*.025+(this.alarm>65?.13:0)?'hunter':r<.23?'runner':r<.31?'rare':'common'
    if(this.save.district===0&&!named&&kind==='hunter')kind='common'
    const hp=named?d.targetHp:kind==='common'?d.baseHp:kind==='runner'?d.baseHp+1:kind==='rare'?d.baseHp+3:d.baseHp+4
    const [minX,maxX]=this.horizontalBounds
    const [minY,maxY]=this.verticalBounds
    const x=rand(minX+10,maxX-10),y=rand(minY,maxY)
    this.humans.push({id:NEXT_ID++,x,y,vx:rand(-16,16),vy:rand(-9,9),hp,maxHp:hp,kind,named,flash:0,attack:0,life:0,shade:Math.floor(rand(0,5)),panic:0,windup:0})
  }
  update(dt:number){
    if(this.ended)return
    dt=Math.min(.06,dt)
    this.elapsed+=dt
    this.focusUntil=Math.max(0,this.focusUntil-dt)
    this.powerCooldown=Math.max(0,this.powerCooldown-dt)
    this.alarm=Math.max(0,this.alarm-dt*1.4)
    this.saveClock+=dt
    if(this.saveClock>2){persist(this.save);this.saveClock=0}
    this.vampireAttack=Math.max(0,this.vampireAttack-dt)
    this.vampireHurt=Math.max(0,this.vampireHurt-dt)
    this.vampireX+=clamp(this.vampireTargetX-this.vampireX,-dt*480,dt*480)
    this.vampireY+=clamp(this.vampireTargetY-this.vampireY,-dt*480,dt*480)
    this.spawnClock+=dt
    this.servantClock+=dt
    this.pulseClock+=dt
    this.comboClock-=dt
    this.shakes=Math.max(0,this.shakes-dt*20)
    if(this.comboClock<=0)this.combo=0
    const rate=this.district.rate*(1+level(this.save,'surge')*.2)*(this.elapsed>this.duration*.55?1.25:1)
    while(this.spawnClock>1/rate){this.spawnClock-=1/rate;this.spawn()}
    if(!this.mission&&!this.missionSpawned){
      this.missionTimer-=dt
      if(this.missionTimer<=0){this.spawn(true);this.missionSpawned=true;this.lastSound='mission'}
    }
    const servantGap=.85*Math.pow(.87,level(this.save,'haste'))/(level(this.save,'totality')?1.5:1)
    while(this.servants>0&&this.servantClock>servantGap/Math.min(this.servants,20)){
      this.servantClock-=servantGap/Math.min(this.servants,20)
      const named=this.humans.find(h=>h.named)
      const candidates=named&&level(this.save,'elite')?[named]:this.humans.filter(h=>!h.named)
      const target=candidates[Math.floor(Math.random()*candidates.length)]
      if(target){this.hit(target,2+2*level(this.save,'training')+(target.named?4*level(this.save,'elite'):0),true);this.burst(target.x,target.y,'#68e7d0',3)}
    }
    const pulseGap=level(this.save,'storm')?8:16
    if(level(this.save,'pulse')&&this.pulseClock>=pulseGap){
      this.pulseClock=0
      const n=5+3*level(this.save,'shock')+8*level(this.save,'storm')+20*level(this.save,'totality')
      const targets=this.humans.filter(h=>!h.named).sort((a,b)=>a.hp-b.hp).slice(0,n)
      targets.forEach(h=>this.hit(h,3+this.damage*2+level(this.save,'shock')*2,true))
      for(let i=0;i<40;i++)this.burst(rand(170,830),rand(170,470),'#ce7bfa',1)
      this.lastSound='pulse'
    }
    const [minX,maxX]=this.horizontalBounds,[minY,maxY]=this.verticalBounds
    for(const h of this.humans){
      if(h.windup>0){
        h.windup=Math.max(0,h.windup-dt)
        if(h.windup===0){
          if(this.focusId===h.id&&this.focusUntil>0){
            this.health=Math.max(0,this.health-1);this.vampireHurt=.45;this.shakes=5;this.alarm+=9
            this.burst(h.x,h.y-35,'#ffba7c',8,'−1 ♥');this.lastSound='hurt'
          }
          h.attack=2.2
        }
      }
      h.life+=dt;h.flash=Math.max(0,h.flash-dt);h.attack=Math.max(0,h.attack-dt);h.panic=Math.max(0,h.panic-dt)
      const speed=(h.kind==='runner'||(h.named&&this.district.targetType==='runner')?1.8:1)*(1-level(this.save,'mist')*.08)*(h.panic>0?2.4:1)
      h.x+=h.vx*speed*dt;h.y+=h.vy*speed*dt
      if(h.x<minX||h.x>maxX)h.vx*=-1
      if(h.y<minY||h.y>maxY)h.vy*=-1
      h.x=clamp(h.x,minX,maxX);h.y=clamp(h.y,minY,maxY)
      if(Math.random()<dt*.75){h.vx=clamp(h.vx+rand(-8,8),-24,24);h.vy=clamp(h.vy+rand(-5,5),-13,13)}
    }
    const named=this.humans.find(h=>h.named)
    if(named&&named.life>14+level(this.save,'stalk')*6){
      this.humans.splice(this.humans.indexOf(named),1)
      this.targetEscaped=true
      this.lastSound='escape'
      this.animations.push({x:named.x,y:named.y-28,row:2,age:0,duration:.8,size:74})
    }
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=22*dt;p.life-=dt}
    this.particles=this.particles.filter(p=>p.life>0)
    for(const a of this.animations)a.age+=dt
    this.animations=this.animations.filter(a=>a.age<a.duration).slice(-96)
    if(this.health<=0)this.finish('defeat')
    else if(this.alarm>=100)this.finish('lockdown')
    else if(this.elapsed>=this.duration)this.finish('dawn')
  }
  click(x:number,y:number,radius=28){
    if(this.ended||this.elapsed<this.nextStrike)return false
    this.nextStrike=this.elapsed+this.strikeGap
    let target:Human|undefined,dist=Infinity
    for(const h of this.humans){
      const d=Math.hypot(h.x-x,h.y-30-y)
      if(d<radius+level(this.save,'reach')*10&&d<dist){target=h;dist=d}
    }
    if(!target){this.focusId=0;return false}
    this.focusId=target.id;this.focusUntil=.38
    this.vampireTargetX=target.x
    this.vampireTargetY=target.y+12
    this.vampireAttack=.3
    const damage=this.damage
    this.hit(target,damage,false)
    const nearby=this.humans.filter(h=>h!==target&&Math.hypot(h.x-x,h.y-y)<65).slice(0,level(this.save,'cleave'))
    nearby.forEach(h=>this.hit(h,Math.max(1,damage-1),true))
    return true
  }
  hit(h:Human,damage:number,helper:boolean){
    if(!this.humans.includes(h))return
    h.hp-=damage;h.flash=.16
    if(!helper){
      this.burst(h.x,h.y-23,'#ff718d',4);this.lastSound='hit'
      this.alarm=Math.min(100,this.alarm+(h.kind==='hunter'||h.named?2.5:1)*(1-level(this.save,'mist')*.08))
      this.animations.push({x:h.x,y:h.y-28,row:1,age:0,duration:.45,size:62})
    }
    if(h.hp<=0){this.capture(h,helper);return}
    if(!helper&&(h.kind==='hunter'||h.named&&this.district.targetType==='hunter')&&h.attack<=0&&h.windup<=0){
      h.windup=.8
    }
    h.panic=1.4;h.vx=rand(-48,48);h.vy=rand(-30,30)
  }
  capture(h:Human,helper:boolean){
    const index=this.humans.indexOf(h)
    if(index<0)return
    this.humans.splice(index,1)
    this.captures++
    this.charge=Math.min(100,this.charge+5)
    this.alarm=Math.max(0,this.alarm-1.2)
    this.save.progress[this.save.district]=(this.save.progress[this.save.district]||0)+1
    this.combo++;this.comboClock=3
    let reward=this.district.blood*(h.kind==='rare'?2:h.kind==='hunter'?1.5:1)*(1+.25*level(this.save,'bank'))*(1+this.combo*.01*level(this.save,'combo'))
    if(this.humans.length>=30)reward*=1+.15*level(this.save,'feast')
    reward*=Math.pow(2,level(this.save,'treasury'))
    if(h.named){
      reward=this.district.targetReward*(this.save.missions[this.save.district]?.15:1)*(1+.6*level(this.save,'contract'))
      this.mission=true
      this.missionThisNight=true
      this.save.missions[this.save.district]=true
      this.save.contracts[this.save.district]=(this.save.contracts[this.save.district]||0)+1
      this.lastSound='missionComplete'
    } else this.lastSound=helper?'servant':'capture'
    const earned=Math.max(1,Math.round(reward))
    this.blood+=earned;this.save.blood+=earned;this.save.total++
    if(level(this.save,'drain')&&this.captures%(6-level(this.save,'drain'))===0)this.health=Math.min(this.maxHealth,this.health+1)
    this.burst(h.x,h.y-22,h.named?'#ffe38a':helper?'#6be7d5':'#fa526f',h.named?20:9,'+'+earned)
    this.animations.push({x:h.x,y:h.y-30,row:1,age:0,duration:.65,size:h.named?100:70})
    this.animations.push({x:h.x,y:h.y,row:5+(h.named?4:h.kind==='runner'?1:h.kind==='hunter'?2:h.kind==='rare'?3:0),age:0,duration:.85,size:82})
    if(!h.named&&level(this.save,'chain')&&Math.random()<.08*level(this.save,'chain')){
      const next=this.humans.filter(x=>!x.named).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0]
      if(next)this.hit(next,next.hp,true)
    }
    if(level(this.save,'reaper')&&this.captures%4===0){
      this.humans.filter(x=>!x.named).slice(0,2*level(this.save,'reaper')).forEach(x=>this.hit(x,x.hp,true))
    }
  }
  usePower(){
    if(this.ended||this.charge<100||this.powerCooldown>0)return false
    this.charge=0;this.powerCooldown=7;this.powerCount++;this.health=Math.min(this.maxHealth,this.health+1);this.alarm=Math.max(0,this.alarm-25)
    const targets=this.humans.filter(h=>Math.hypot(h.x-this.vampireX,h.y-this.vampireY)<170+level(this.save,'reach')*12)
    targets.forEach(h=>this.hit(h,this.damage*5+level(this.save,'shock')*4,true))
    this.animations.push({x:this.vampireX,y:this.vampireY-20,row:3,age:0,duration:.8,size:350})
    this.lastSound='pulse';return true
  }
  burst(x:number,y:number,color:string,count:number,text?:string){
    if(text&&this.particles.length<360)this.particles.push({x,y,vx:0,vy:-38,life:.9,color,size:13,text})
    for(let i=0;i<count&&this.particles.length<280;i++)this.particles.push({x,y,vx:rand(-75,75),vy:rand(-85,5),life:rand(.3,.7),color,size:rand(2,5)})
  }
  finish(reason:'dawn'|'defeat'|'lockdown'|'retreat'='retreat'){
    if(this.ended)return
    this.ended=true
    this.endReason=reason
    this.save.nights++
    this.save.best=Math.max(this.save.best,this.captures)
    this.save.bestByCity[this.save.district]=Math.max(this.save.bestByCity[this.save.district]||0,this.captures)
    if(reason==='dawn'&&this.health>0&&this.missionThisNight&&this.captures>=this.requiredCaptures&&(this.save.progress[this.save.district]||0)>=this.district.domination&&(this.save.contracts[this.save.district]||0)>=this.district.seals){
      this.qualified=true
      this.save.cleared[this.save.district]=true
      if(this.save.district===this.save.unlocked&&this.district.city<4)this.save.unlocked++
      if(this.save.district===19){this.won=true;this.save.victory=true}
    }
    this.save.blood+=Math.round(this.blood*.05*level(this.save,'interest'))
    persist(this.save)
  }
}
