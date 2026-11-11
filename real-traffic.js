import {nearestSegment} from './real-network.js?v=0.33';
// Traffic selects a permitted outgoing graph edge; no arbitrary grid lanes.
export function createTraffic(network,point,random=Math.random){
 const snap=nearestSegment(network,point);if(!snap)return null;const s=snap.segment,reverse=s.oneway==='-1';
 const from=reverse?s.to:s.from,to=reverse?s.from:s.to,progress=reverse?1-snap.t:snap.t;
 return {from,to,progress,speed:8+random()*7,position:snap.point,angle:0};
}
export function advanceTraffic(network,car,dt,random=Math.random){
 if(car.stopped)return true;
 let remaining=Math.max(0,dt)*car.speed,guard=0;
 while(remaining>0&&guard++<100){const a=network.nodes.get(car.from),b=network.nodes.get(car.to);if(!a||!b)return false;const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),left=(1-car.progress)*length;
  if(remaining<left){car.progress+=remaining/length;remaining=0;}else{remaining-=left;car.from=car.to;const options=network.adj.get(car.from)||[];if(!options.length){const segment=network.segments[Math.floor(random()*network.segments.length)],next=createTraffic(network,segment.a,random);Object.assign(car,next);return true;}const chosen=options[Math.min(options.length-1,Math.floor(random()*options.length))];car.to=chosen.to;car.progress=0;}}
 const a=network.nodes.get(car.from),b=network.nodes.get(car.to);car.position={x:a.x+(b.x-a.x)*car.progress,z:a.z+(b.z-a.z)*car.progress};car.angle=Math.atan2(-(b.x-a.x),-(b.z-a.z));return true;
}
