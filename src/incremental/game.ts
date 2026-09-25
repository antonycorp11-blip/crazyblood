import { DISTRICTS, SKILLS, skillCost } from './data'

export type HumanKind='common'|'runner'|'hunter'|'rare'|'named'
export type Human={id:number;x:number;y:number;vx:number;vy:number;hp:number;maxHp:number;kind:HumanKind;named:boolean;flash:number;attack:number;life:number;shade:number;panic:number}
export type Particle={x:number;y:number;vx:number;vy:number;life:number;color:string;size:number;text?:string}
export type Save={blood:number;district:number;unlocked:number;era:number;relics:number;progress:Record<number,number>;missions:Record<number,boolean>;cleared:Record<number,boolean>;levels:Record<string,number>;nights:number;total:number;best:number;victory:boolean;muted:boolean}
const KEY='hemofarm-cacada-v3'
const defaultSave=():Save=>({blood:0,district:0,unlocked:0,era:0,relics:0,progress:{},missions:{},cleared:{},levels:{},nights:0,total:0,best:0,victory:false,muted:false})
export const load=():Save=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&typeof x.blood==='number')return {...defaultSave(),...x,levels:x.levels||{},progress:x.progress||{},missions:x.missions||{},cleared:x.cleared||{}}}catch{}return defaultSave()}
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
  missionTimer=5
  spawnClock=0
  servantClock=0
  pulseClock=0
  ended=false
  won=false
  shakes=0
  lastSound=''
  vampireX=500
  vampireY=475
  vampireTargetX=500
  vampireTargetY=475
  constructor(save:Save){
    this.save=save
    this.duration=28+7*level(save,'moon')+15*level(save,'dusk')+35*level(save,'immortal')+save.relics*4
    this.maxHealth=5+2*level(save,'vigor')
    this.health=this.maxHealth
    this.mission=save.district===19&&!save.victory?false:!!save.missions[save.district]
    this.missionSpawned=this.mission
    for(let i=0;i<11+save.district*6;i++)this.spawn()
  }
  get district(){return DISTRICTS[this.save.district]}
  get servants(){return level(this.save,'thrall')+2*level(this.save,'pack')+12*level(this.save,'legion')}
  get remaining(){return Math.max(0,this.duration-this.elapsed)}
  spawn(named=false){
    if(this.humans.length>=Math.min(280,this.district.population+level(this.save,'surge')*12))return
    const d=this.district
    const r=Math.random()
    let kind:HumanKind=named?'named':r<.075+this.save.district*.015?'hunter':r<.2?'runner':r<.27?'rare':'common'
    if(this.save.district===0&&!named&&kind==='hunter')kind='common'
    const hp=named?d.targetHp:kind==='common'?d.baseHp:kind==='runner'?d.baseHp+1:kind==='rare'?d.baseHp+3:d.baseHp+4
    const x=rand(160,840),y=rand(165,470)
    this.humans.push({id:NEXT_ID++,x,y,vx:rand(-16,16),vy:rand(-9,9),hp,maxHp:hp,kind,named,flash:0,attack:0,life:0,shade:Math.floor(rand(0,5)),panic:0})
  }
  update(dt:number){
    if(this.ended)return
    dt=Math.min(.06,dt)
    this.elapsed+=dt
    this.vampireX+=clamp(this.vampireTargetX-this.vampireX,-dt*480,dt*480)
    this.vampireY+=clamp(this.vampireTargetY-this.vampireY,-dt*480,dt*480)
    this.spawnClock+=dt
    this.servantClock+=dt
    this.pulseClock+=dt
    this.comboClock-=dt
    this.shakes=Math.max(0,this.shakes-dt*20)
    if(this.comboClock<=0)this.combo=0
    const rate=this.district.rate*(1+level(this.save,'surge')*.2)*(this.elapsed>this.duration*.55?1.45:1)
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
      if(target){this.hit(target,1+level(this.save,'training')+(target.named?2*level(this.save,'elite'):0),true);this.burst(target.x,target.y,'#68e7d0',3)}
    }
    const pulseGap=level(this.save,'storm')?8:16
    if(level(this.save,'pulse')&&this.pulseClock>=pulseGap){
      this.pulseClock=0
      const n=5+3*level(this.save,'shock')+8*level(this.save,'storm')+20*level(this.save,'totality')
      const targets=this.humans.filter(h=>!h.named).sort((a,b)=>a.hp-b.hp).slice(0,n)
      targets.forEach(h=>this.hit(h,Math.max(2,this.district.baseHp),true))
      for(let i=0;i<40;i++)this.burst(rand(170,830),rand(170,470),'#ce7bfa',1)
      this.lastSound='pulse'
    }
    for(const h of this.humans){
      h.life+=dt;h.flash=Math.max(0,h.flash-dt);h.attack=Math.max(0,h.attack-dt);h.panic=Math.max(0,h.panic-dt)
      const speed=(h.kind==='runner'||(h.named&&this.district.targetType==='runner')?1.8:1)*(1-level(this.save,'mist')*.08)*(h.panic>0?2.4:1)
      h.x+=h.vx*speed*dt;h.y+=h.vy*speed*dt
      if(h.x<140||h.x>860)h.vx*=-1
      if(h.y<153||h.y>480)h.vy*=-1
      h.x=clamp(h.x,140,860);h.y=clamp(h.y,153,480)
      if(Math.random()<dt*.75){h.vx=clamp(h.vx+rand(-8,8),-24,24);h.vy=clamp(h.vy+rand(-5,5),-13,13)}
    }
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=22*dt;p.life-=dt}
    this.particles=this.particles.filter(p=>p.life>0)
    if(this.elapsed>=this.duration||this.health<=0)this.finish()
  }
  click(x:number,y:number,radius=28){
    if(this.ended)return false
    let target:Human|undefined,dist=Infinity
    for(const h of this.humans){
      const d=Math.hypot(h.x-x,h.y-16-y)
      if(d<radius+level(this.save,'reach')*10&&d<dist){target=h;dist=d}
    }
    if(!target)return false
    this.vampireTargetX=target.x
    this.vampireTargetY=target.y+12
    const damage=1+this.save.relics+level(this.save,'fang')+Math.min(level(this.save,'frenzy'),Math.floor(this.combo/12))
    this.hit(target,damage,false)
    const nearby=this.humans.filter(h=>h!==target&&Math.hypot(h.x-x,h.y-y)<65).slice(0,level(this.save,'cleave'))
    nearby.forEach(h=>this.hit(h,Math.max(1,damage-1),true))
    return true
  }
  hit(h:Human,damage:number,helper:boolean){
    if(!this.humans.includes(h))return
    h.hp-=damage;h.flash=.16
    if(!helper){this.burst(h.x,h.y-23,'#ff718d',4);this.lastSound='hit'}
    if(h.hp<=0){this.capture(h,helper);return}
    if(!helper&&(h.kind==='hunter'||h.named&&this.district.targetType==='hunter')&&h.attack<=0){
      this.health=Math.max(0,this.health-1);h.attack=2.3;this.shakes=6;this.burst(h.x,h.y-26,'#ffd174',8,'-1 ♥');this.lastSound='hurt'
    }
    h.panic=1.4;h.vx=rand(-48,48);h.vy=rand(-30,30)
  }
  capture(h:Human,helper:boolean){
    const index=this.humans.indexOf(h)
    if(index<0)return
    this.humans.splice(index,1)
    this.captures++
    this.save.progress[this.save.district]=(this.save.progress[this.save.district]||0)+1
    this.combo++;this.comboClock=3
    let reward=this.district.blood*(h.kind==='rare'?2:h.kind==='hunter'?1.5:1)*(1+.25*level(this.save,'bank'))*(1+this.combo*.01*level(this.save,'combo'))
    if(this.humans.length>=30)reward*=1+.15*level(this.save,'feast')
    reward*=Math.pow(2,level(this.save,'treasury'))
    if(h.named){
      reward=this.district.targetReward*(1+.6*level(this.save,'contract'))
      this.mission=true
      this.missionThisNight=true
      this.save.missions[this.save.district]=true
      this.lastSound='missionComplete'
    } else this.lastSound=helper?'servant':'capture'
    const earned=Math.max(1,Math.round(reward))
    this.blood+=earned;this.save.blood+=earned;this.save.total++
    if(level(this.save,'drain')&&this.captures%(6-level(this.save,'drain'))===0)this.health=Math.min(this.maxHealth,this.health+1)
    this.burst(h.x,h.y-22,h.named?'#ffe38a':helper?'#6be7d5':'#fa526f',h.named?20:9,'+'+earned)
    if(!h.named&&level(this.save,'chain')&&Math.random()<.08*level(this.save,'chain')){
      const next=this.humans.filter(x=>!x.named).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0]
      if(next)this.hit(next,next.hp,true)
    }
    if(level(this.save,'reaper')&&this.captures%4===0){
      this.humans.filter(x=>!x.named).slice(0,2*level(this.save,'reaper')).forEach(x=>this.hit(x,x.hp,true))
    }
    if(this.mission&&this.save.progress[this.save.district]>=this.district.quota){
      this.save.cleared[this.save.district]=true
      if(this.save.district===this.save.unlocked&&this.district.city<4)this.save.unlocked++
    }
    if(this.save.district===19&&this.missionThisNight&&this.captures>=1000)this.won=true
    persist(this.save)
  }
  burst(x:number,y:number,color:string,count:number,text?:string){
    if(text)this.particles.push({x,y,vx:0,vy:-38,life:.9,color,size:13,text})
    for(let i=0;i<count&&this.particles.length<280;i++)this.particles.push({x,y,vx:rand(-75,75),vy:rand(-85,5),life:rand(.3,.7),color,size:rand(2,5)})
  }
  finish(){
    if(this.ended)return
    this.ended=true
    this.save.nights++
    this.save.best=Math.max(this.save.best,this.captures)
    this.save.blood+=Math.round(this.blood*.05*level(this.save,'interest'))
    if(this.won&&this.health>0)this.save.victory=true
    persist(this.save)
  }
}
