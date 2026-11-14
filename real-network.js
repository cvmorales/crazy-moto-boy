// Geographical foundation for a future playable district. Positions are metres.
// Input: OpenStreetMap-derived data in cordoba_centro_osm.json (ODbL-1.0).
const R=6371008.8, RAD=Math.PI/180;
export const ORIGIN={lat:-31.419781846938776,lon:-64.18804622040817};
export function project(lat,lon){
  return {x:(lon-ORIGIN.lon)*RAD*R*Math.cos(ORIGIN.lat*RAD),z:-(lat-ORIGIN.lat)*RAD*R};
}
export function unproject(x,z){
  return {lat:ORIGIN.lat-z/(R*RAD),lon:ORIGIN.lon+x/(R*RAD*Math.cos(ORIGIN.lat*RAD))};
}
export function buildNetwork(data){
  const nodes=new Map(),adj=new Map(),segments=[],water=[];
  for(const [id,[lat,lon]] of Object.entries(data.nodes)){nodes.set(id,project(lat,lon));adj.set(id,[]);}
  for(const way of data.ways){
    const ids=way.node_ids;
    for(let i=1;i<ids.length;i++){
      const from=ids[i-1],to=ids[i],a=nodes.get(from),b=nodes.get(to);if(!a||!b)continue;
      const length=Math.hypot(a.x-b.x,a.z-b.z);if(length<.01)continue;
      const segment={from,to,a,b,length,name:way.name,highway:way.highway,bridge:way.bridge,tunnel:way.tunnel,oneway:way.oneway};
      if(way.waterway){water.push(segment);continue;}
      segments.push(segment);
      if(way.oneway!=='-1')adj.get(from).push({to,length});
      if(!['yes','1','true'].includes(way.oneway))adj.get(to).push({to:from,length});
    }
  }
  return {nodes,adj,segments,water};
}
export function nearestRoadNode(network,point){
  let best=null,distance=Infinity;
  for(const [id,edges] of network.adj){if(!edges.length)continue;const p=network.nodes.get(id),d=Math.hypot(p.x-point.x,p.z-point.z);if(d<distance){best=id;distance=d;}}
  return {id:best,distance};
}
export function shortestRoute(network,start,end){
  const queue=[[0,start]],distance=new Map([[start,0]]),parent=new Map();
  while(queue.length){
    queue.sort((a,b)=>b[0]-a[0]);const [d,id]=queue.pop();if(d!==distance.get(id))continue;if(id===end)break;
    for(const edge of network.adj.get(id)||[]){const n=d+edge.length;if(n<(distance.get(edge.to)??Infinity)){distance.set(edge.to,n);parent.set(edge.to,id);queue.push([n,edge.to]);}}
  }
  if(!distance.has(end))return null;
  const ids=[];for(let id=end;id!=null;id=parent.get(id))ids.push(id);ids.reverse();return {distance:distance.get(end),ids,points:ids.map(id=>network.nodes.get(id))};
}
const roadCells=new WeakMap();
const cellSize=64;
export function nearbySegments(network,x,z,radius){
  const segments=network.segments;
  let cells=roadCells.get(segments);
  if(!cells){
    cells=new Map();
    segments.forEach((s,index)=>{
      for(let a=Math.floor(Math.min(s.a.x,s.b.x)/cellSize);a<=Math.floor(Math.max(s.a.x,s.b.x)/cellSize);a++)
        for(let b=Math.floor(Math.min(s.a.z,s.b.z)/cellSize);b<=Math.floor(Math.max(s.a.z,s.b.z)/cellSize);b++){
          const key=a+':'+b;
          if(!cells.has(key))cells.set(key,[]);
          cells.get(key).push(index);
        }
    });
    roadCells.set(segments,cells);
  }
  const indices=new Set();
  for(let a=Math.floor((x-radius)/cellSize);a<=Math.floor((x+radius)/cellSize);a++)
    for(let b=Math.floor((z-radius)/cellSize);b<=Math.floor((z+radius)/cellSize);b++)
      for(const i of cells.get(a+':'+b)??[])indices.add(i);
  // Preserve the road order at junctions where two segments tie.
  return [...indices].sort((a,b)=>a-b).map(i=>segments[i]);
}
function nearestSegment(network,point){
  function closest(segments){
    let segment=null,t=0,x=0,z=0,distanceSquared=Infinity;
    for(const s of segments){
      const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z;
      const progress=Math.max(0,Math.min(1,((point.x-s.a.x)*dx+(point.z-s.a.z)*dz)/(s.length*s.length)));
      const px=s.a.x+dx*progress,pz=s.a.z+dz*progress;
      const d=(point.x-px)**2+(point.z-pz)**2;
      if(d<distanceSquared){segment=s;t=progress;x=px;z=pz;distanceSquared=d;}
    }
    return segment?{segment,t,point:{x,z},distance:Math.sqrt(distanceSquared)}:null;
  }
  const local=closest(nearbySegments(network,point.x,point.z,64));
  return local&&local.distance<64?local:closest(network.segments);
}
// Project to road segments, respecting one-way directions when joining/leaving.
export function routeBetween(network,start,end){
  const a=nearestSegment(network,start),b=nearestSegment(network,end);if(!a||!b)return null;
  const forward=s=>s.oneway!=='-1',reverse=s=>!['yes','1','true'].includes(s.oneway);
  const starts=[],ends=[];
  if(forward(a.segment))starts.push({id:a.segment.to,cost:(1-a.t)*a.segment.length});
  if(reverse(a.segment))starts.push({id:a.segment.from,cost:a.t*a.segment.length});
  if(forward(b.segment))ends.push({id:b.segment.from,cost:b.t*b.segment.length});
  if(reverse(b.segment))ends.push({id:b.segment.to,cost:(1-b.t)*b.segment.length});
  let best=null;
  if(a.segment===b.segment&&((b.t>=a.t&&forward(a.segment))||(b.t<=a.t&&reverse(a.segment))))best={distance:Math.abs(a.t-b.t)*a.segment.length,points:[a.point,b.point]};
  for(const s of starts)for(const e of ends){const path=shortestRoute(network,s.id,e.id);if(!path)continue;const distance=s.cost+path.distance+e.cost;if(!best||distance<best.distance)best={distance,points:[a.point,...path.points,b.point]};}
  return best?{...best,startSnap:a.distance,endSnap:b.distance}:null;
}
export {nearestSegment};
