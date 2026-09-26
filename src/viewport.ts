export const W=1000,H=560
export function camera(width:number,height:number){
  const scale=Math.max(width/W,height/H)
  const x=(width-W*scale)/2,y=(height-H*scale)/2
  return {scale,x,y,left:-x/scale,right:(width-x)/scale,top:-y/scale,bottom:(height-y)/scale}
}
/** Touch screens get a virtual joystick and bite button, so the hunt zooms out to keep the action clear of thumbs. */
export const touchUI=()=>typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches
export function huntZoom(width:number,height:number){ return touchUI()?(height>width?0.7:0.84):1 }
/** Screen px (CSS) reserved at the bottom for the touch controls. */
export function controlsReserve(width:number,height:number){ return touchUI()?(height>width?150:95):0 }
export function huntCamera(width:number,height:number){
  const z=huntZoom(width,height), scale=Math.max(width/W,height/H)*z
  const cy=z<1?300:H/2
  const x=width/2-(W/2)*scale,y=height/2-cy*scale
  return {scale,x,y,left:-x/scale,right:(width-x)/scale,top:-y/scale,bottom:(height-y)/scale}
}
