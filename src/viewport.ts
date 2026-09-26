export const W=1000,H=560
export function camera(width:number,height:number){
  const scale=Math.max(width/W,height/H)
  const x=(width-W*scale)/2,y=(height-H*scale)/2
  return {scale,x,y,left:-x/scale,right:(width-x)/scale,top:-y/scale,bottom:(height-y)/scale}
}
