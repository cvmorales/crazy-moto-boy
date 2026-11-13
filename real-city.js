import {realMapData} from './real-map-data.js?v=0.36';
import {createRealWorld} from './real-world.js?v=0.36';
import {project,nearestRoadNode,nearestSegment,shortestRoute} from './real-network.js?v=0.36';
import {actorFactory} from './actors.js?v=0.36';
import {addRealLandmarks} from './art/real-landmarks.js?v=0.36';
import {addRealStreetLife} from './art/real-street-life.js?v=0.36';
import {addRealFacades} from './art/real-facades.js?v=0.36';

// Construct gameplay objects on a connected part of the real street graph.
export function buildRealCity({THREE,scene,material,random}){
  const real=createRealWorld(realMapData),network=real.network,city=new THREE.Group();scene.add(city);
  const actors=actorFactory(THREE,material),people=[],restaurants=[],homes=[],breakables=[],colliders=[];
  const anchor=nearestRoadNode(network,project(-31.41978,-64.18805)).id;
  const candidates=[];
  for(const [id,edges] of network.adj){if(!edges.length)continue;const p=network.nodes.get(id);if(p.z< -200||p.z>1000||p.x< -750||p.x>650||real.blocked(p.x,p.z))continue;candidates.push(id);}
  const connected=[];
  for(const id of candidates.filter((_,i)=>i%9===0)){
    const a=shortestRoute(network,anchor,id),b=shortestRoute(network,id,anchor);if(a&&b)connected.push(id);
  }
  if(connected.length<12)throw new Error('Red vial insuficiente para entregas');
  connected.sort((a,b)=>network.nodes.get(a).z-network.nodes.get(b).z);
  const nodeAt=(i,n)=>connected[Math.min(connected.length-1,Math.floor((i+.3)*connected.length/n))];
  function person(x,z,waiting=false){const model=actors.pedestrian({shirt:['#bd3427','#286fb4','#ece5cb','#e0ad2d','#7b4c93'][people.length%5],female:people.length%3===1,cap:people.length%4===0,pants:'#3d4c5a'});model.mesh.position.set(x,.05,z);model.mesh.visible=!waiting;city.add(model.mesh);const p={...model,baseZ:z,waiting:false,walk:!waiting,phase:people.length*1.7};people.push(p);return p;}
  const shopNames=['CAFÉ DE BARRIO','LOMITERÍA','PIZZERÍA','PANADERÍA','BODEGÓN','PARRILLA'];
  for(let i=0;i<6;i++){
    const p=network.nodes.get(nodeAt(i,6));
    const clerk=person(p.x+2,p.z+2);clerk.walk=false;
    const kiosk=new THREE.Group(),seg=nearestSegment(network,p).segment,dx=(seg.b.x-seg.a.x)/seg.length,dz=(seg.b.z-seg.a.z)/seg.length;
    let spot=null;for(const side of [-1,1])for(const offset of [7,10,13]){const x=p.x-side*dz*offset,z=p.z+side*dx*offset;if(!real.blocked(x,z)&&!spot)spot={x,z};}
    if(spot){
      kiosk.position.set(spot.x,0,spot.z);const frame=new THREE.Mesh(new THREE.BoxGeometry(3,2.5,2),new THREE.MeshStandardMaterial({color:'#8f4d38',roughness:.9}));frame.position.y=1.25;kiosk.add(frame);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(3.6,.22,2.6),new THREE.MeshStandardMaterial({color:'#efd69a'}));roof.position.y=2.6;kiosk.add(roof);
      const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.fillStyle='#21594d';q.fillRect(0,0,512,128);q.fillStyle='#fff1c2';q.textAlign='center';q.textBaseline='middle';q.font='bold 48px sans-serif';q.fillText(shopNames[i],256,64,480);
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.8),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));sign.position.set(0,2.25,-1.02);kiosk.add(sign);scene.add(kiosk);
    }
    restaurants.push({name:shopNames[i],pickup:[p.x,p.z],clerk,mesh:kiosk});
  }
  const homeCandidates=connected.filter(id=>{const p=network.nodes.get(id);return restaurants.every(shop=>Math.hypot(p.x-shop.pickup[0],p.z-shop.pickup[1])>35);});
  if(homeCandidates.length<6)throw new Error('No hay destinos separados de los comercios');
  for(let i=0;i<6;i++){const h=network.nodes.get(homeCandidates[Math.floor((i+.5)*homeCandidates.length/6)]),recipient=person(h.x+2,h.z+2,true);homes.push({name:'Entrega en Córdoba',drop:[h.x,h.z],recipient,address:'Nueva Córdoba',personName:['Sofi','Nico','Mica','Lauti','Flor','Juan'][i]});}

  for(let i=0;i<150;i++){
    const id=connected[(i*13)%connected.length],p=network.nodes.get(id),seg=nearestSegment(network,p).segment,dx=(seg.b.x-seg.a.x)/seg.length,dz=(seg.b.z-seg.a.z)/seg.length;
    let side=i%2?1:-1,x=p.x-side*dz*7,z=p.z+side*dx*7;if(real.blocked(x,z)){side=-side;x=p.x-side*dz*7;z=p.z+side*dx*7;}if(real.blocked(x,z)){x=p.x;z=p.z;}
    const pedestrian=person(x,z);pedestrian.baseX=x;pedestrian.walkDx=dx;pedestrian.walkDz=dz;
  }
  const startCandidates=[];
  for(const id of connected){const p=network.nodes.get(id);if(restaurants.some(shop=>Math.hypot(p.x-shop.pickup[0],p.z-shop.pickup[1])<60))continue;
    for(const edge of network.adj.get(id)||[]){if(edge.length<35)continue;const target=network.nodes.get(edge.to),dx=(target.x-p.x)/edge.length,dz=(target.z-p.z)/edge.length;
      let clear=true;for(let d=0;d<=30;d+=2)if(real.blocked(p.x+dx*d,p.z+dz*d)){clear=false;break;}if(!clear)continue;
      const x=p.x+dx*5,z=p.z+dz*5,angle=Math.atan2(-dx,-dz);startCandidates.push({x,z,angle,look:[x+dx*30,3,z+dz*30],preview:[x-dx*25,20,z-dz*25]});break;
    }
  }
  if(startCandidates.length<3)throw new Error('No hay suficientes inicios transitables');
  startCandidates.sort((a,b)=>a.z-b.z);
  const starts=[0,1,2].map(i=>startCandidates[Math.floor((i+.5)*startCandidates.length/3)]);
  real.populateCommerce(starts);

  // Populate the streets the player actually sees, not just distant nodes.
  for(const start of starts)for(const seg of network.segments){if(seg.length<16)continue;const dx=(seg.b.x-seg.a.x)/seg.length,dz=(seg.b.z-seg.a.z)/seg.length;
    for(const side of [-1,1]){const x=(seg.a.x+seg.b.x)/2-side*dz*7,z=(seg.a.z+seg.b.z)/2+side*dx*7,d=Math.hypot(x-start.x,z-start.z);if(d<14||d>65||real.blocked(x,z))continue;if(people.some(p=>Math.hypot(p.mesh.position.x-x,p.mesh.position.z-z)<5))continue;const p=person(x,z);p.baseX=x;p.walkDx=dx;p.walkDz=dz;}
  }
  for(const row of real.commercialRows){if(!starts.some(s=>Math.hypot(s.x-row.x,s.z-row.z)<115))continue;
    const x=row.x-row.nx*1.4,z=row.z-row.nz*1.4;if(real.blocked(x,z)||people.some(p=>Math.hypot(p.mesh.position.x-x,p.mesh.position.z-z)<4))continue;
    const p=person(x,z);p.baseX=x;p.walkDx=row.dx;p.walkDz=row.dz;
  }
  const actorGroups=new Map();
  for(const p of people)p.mesh.traverse(m=>{if(!m.isMesh)return;const key=m.geometry.uuid+':'+m.material.uuid;if(!actorGroups.has(key))actorGroups.set(key,[]);actorGroups.get(key).push({mesh:m,root:p.mesh});m.visible=false;});
  const batches=[],zero=new THREE.Matrix4().makeScale(0,0,0);
  for(const items of actorGroups.values()){const batch=new THREE.InstancedMesh(items[0].mesh.geometry,items[0].mesh.material,items.length);scene.add(batch);batches.push({batch,items});}
  function updateCrowds(){for(const p of people)p.mesh.updateMatrixWorld(true);for(const {batch,items} of batches){items.forEach((o,i)=>batch.setMatrixAt(i,o.root.visible&&!o.root.userData.highDetail?o.mesh.matrixWorld:zero));batch.instanceMatrix.needsUpdate=true;}}

  const realRoot=real.createScene();addRealLandmarks(realRoot,real);addRealFacades(realRoot,real);addRealStreetLife(realRoot,{network,realWorld:real});const realMaterials=new Map();realRoot.traverse(m=>{if(m.isMesh&&m.material?.name)realMaterials.set(m.material.name,m.material);});
  return {real:true,realWorld:real,network,galleries:real.galleries,realArt:{root:realRoot,materials:realMaterials,streetLamps:realRoot.userData.streetLamps},starts,city,colliders,roads:[-400,-300,-200,-100,0,100,200,300,400],limit:1600,canalX:99999,restaurants,homes,breakables,people,buildings:[],label:()=>{},updateCrowds};
}
