import {realMapData} from './real-map-data.js?v=0.42';
import {createRealWorld,offRoad,sidewalkTop,width} from './real-world.js?v=0.42';
import {project,nearestRoadNode,nearestSegment,shortestRoute} from './real-network.js?v=0.42';
import {actorFactory} from './actors.js?v=0.42';
import {addRealLandmarks} from './art/real-landmarks.js?v=0.42';
import {addRealStreetLife} from './art/real-street-life.js?v=0.42';
import {addRealFacades} from './art/real-facades.js?v=0.42';
import {addBuildingFronts} from './art/building-fronts.js?v=0.42';

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
  function person(x,z,waiting=false,police=false){const model=actors.pedestrian({shirt:police?'#263e59':['#bd3427','#286fb4','#ece5cb','#e0ad2d','#7b4c93'][people.length%5],female:people.length%3===1,cap:police||people.length%4===0,pants:police?'#202c3e':'#3d4c5a'});model.mesh.position.set(x,sidewalkTop,z);model.mesh.visible=!waiting;city.add(model.mesh);const p={...model,baseZ:z,waiting:false,walk:!waiting&&!police,police,phase:people.length*1.7};people.push(p);return p;}
  const clearSidewalk=(x,z,margin)=>offRoad(network,x,z,margin)&&!real.blocked(x,z);
  function kioskSpot(p){
    const roads=network.segments.filter(s=>s.length>12&&s.bridge!=='yes'&&s.tunnel!=='yes')
      .sort((a,b)=>Math.hypot(a.a.x-p.x,a.a.z-p.z)-Math.hypot(b.a.x-p.x,b.a.z-p.z));
    for(const road of roads){
      const dx=(road.b.x-road.a.x)/road.length,dz=(road.b.z-road.a.z)/road.length;
      for(const t of [.28,.5,.72])for(const side of [-1,1]){
        const offset=width(road)/2+2;
        const x=road.a.x+dx*road.length*t-dz*offset*side;
        const z=road.a.z+dz*road.length*t+dx*offset*side;
        if(Math.hypot(x-p.x,z-p.z)>28||!clearSidewalk(x,z,1.93))continue;
        if([-1,1].every(u=>[-1,1].every(v=>clearSidewalk(x+u*dx*1.8-v*dz*1.3,z+u*dz*1.8+v*dx*1.3,.12))))
          return {x,z,angle:-Math.atan2(dz,dx)+(side<0?Math.PI:0)};
      }
    }
    return null;
  }
  const shopNames=['CAFÉ DE BARRIO','LOMITERÍA','PIZZERÍA','PANADERÍA','BODEGÓN','PARRILLA'];
  for(let i=0;i<6;i++){
    const p=network.nodes.get(nodeAt(i,6));
    const kiosk=new THREE.Group(),spot=kioskSpot(p);
    const clerk=person(spot?.x??p.x,spot?.z??p.z);clerk.walk=false;
    if(!spot)clerk.mesh.visible=false;
    if(spot){
      kiosk.position.set(spot.x,sidewalkTop,spot.z);kiosk.rotation.y=spot.angle;const frame=new THREE.Mesh(new THREE.BoxGeometry(3,2.5,2),new THREE.MeshStandardMaterial({color:'#8f4d38',roughness:.9}));frame.position.y=1.25;kiosk.add(frame);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(3.6,.22,2.6),new THREE.MeshStandardMaterial({color:'#efd69a'}));roof.position.y=2.6;kiosk.add(roof);
      const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.fillStyle='#21594d';q.fillRect(0,0,512,128);q.fillStyle='#fff1c2';q.textAlign='center';q.textBaseline='middle';q.font='bold 48px sans-serif';q.fillText(shopNames[i],256,64,480);
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.8),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));sign.position.set(0,2.25,-1.02);kiosk.add(sign);scene.add(kiosk);
    }
    restaurants.push({name:shopNames[i],pickup:[p.x,p.z],clerk,mesh:kiosk});
  }
  const homeCandidates=connected.filter(id=>{const p=network.nodes.get(id);return restaurants.every(shop=>Math.hypot(p.x-shop.pickup[0],p.z-shop.pickup[1])>35);});
  if(homeCandidates.length<6)throw new Error('No hay destinos separados de los comercios');
  for(let i=0;i<6;i++){const h=network.nodes.get(homeCandidates[Math.floor((i+.5)*homeCandidates.length/6)]),recipient=person(h.x+2,h.z+2,true);homes.push({name:'Entrega en Córdoba',drop:[h.x,h.z],recipient,address:'Nueva Córdoba',personName:['Sofi','Nico','Mica','Lauti','Flor','Juan'][i]});}

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
  real.populateCommerce(starts,restaurants.filter(s=>s.mesh.parent).map(s=>s.mesh.position));
  real.populateParks();
  for(const park of real.parkSites)for(const [dx,dz] of (park.paved?[[4,6]]:[[-6,5],[4,6],[6,-5],[-6,-5]])){
    const visitor=person(park.x+dx,park.z+dz);
    visitor.mesh.position.y=.1;visitor.walk=false;
    visitor.mesh.rotation.y=Math.atan2(dx,dz);
  }
  const checkpoints=[];
  const avenues=network.segments.filter(s=>width(s)>=11&&s.length>31&&s.bridge!=='yes'&&s.tunnel!=='yes');
  for(const anchor of [...starts,{x:-63,z:28},{x:357,z:-341},{x:-36,z:139},project(-31.4238439,-64.1866539),project(-31.428586,-64.1849148)]){
    const nearby=avenues.map(s=>({s,x:(s.a.x+s.b.x)/2,z:(s.a.z+s.b.z)/2}))
      .sort((a,b)=>Math.hypot(a.x-anchor.x,a.z-anchor.z)-Math.hypot(b.x-anchor.x,b.z-anchor.z));
    for(const {s,x,z} of nearby){
      if(checkpoints.some(p=>Math.hypot(p.x-x,p.z-z)<95))continue;
      const dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length,edge=width(s)/2;
      const side=[-1,1].find(side=>[-3,0,3].every(d=>clearSidewalk(x+dx*d-dz*side*(edge+1.5),z+dz*d+dx*side*(edge+1.5),.65)));
      if(!side)continue;
      const nx=-dz*side,nz=dx*side,angle=Math.atan2(-dx,-dz);
      const cx=x+nx*(edge-1.12),cz=z+nz*(edge-1.12);
      if(real.blocked(cx,cz))continue;
      checkpoints.push({x,z,dx,dz,nx,nz,edge,car:{x:cx,z:cz,angle}});
      for(const d of [-3,3]){
        const officer=person(x+dx*d+nx*(edge+1.5),z+dz*d+nz*(edge+1.5),false,true);
        officer.mesh.rotation.y=Math.atan2(-nx,-nz);
      }
      break;
    }
  }

  const streets=network.segments.filter(s=>s.length>16&&s.tunnel!=='yes').map(s=>{
    const x=(s.a.x+s.b.x)/2,z=(s.a.z+s.b.z)/2;
    return {s,distance:Math.min(...starts.map(p=>Math.hypot(p.x-x,p.z-z)))};
  });
  const prioritized=[...streets.filter(s=>s.distance<130),...streets.filter((s,i)=>s.distance>=130&&i%3===0)];
  let walkers=0;
  for(const {s,distance} of prioritized){
    if(walkers>=360)break;
    const dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length,offset=width(s)/2+1.8;
    for(const t of distance<130?[.3,.65]:[.5])for(const side of [-1,1]){
      const x=s.a.x+dx*s.length*t-dz*side*offset,z=s.a.z+dz*s.length*t+dx*side*offset;
      if(people.some(p=>Math.hypot(p.mesh.position.x-x,p.mesh.position.z-z)<4))continue;
      if(![-3,-1.5,0,1.5,3].every(d=>clearSidewalk(x+dx*d,z+dz*d,.65)))continue;
      const p=person(x,z);p.baseX=x;p.walkDx=dx;p.walkDz=dz;walkers++;
    }
  }
  for(const row of real.commercialRows){
    for(const along of [-2.4,2.4]){
      const x=row.x+row.dx*along-row.nx*.95,z=row.z+row.dz*along-row.nz*.95;
      if(!clearSidewalk(x,z,.7)||people.some(p=>Math.hypot(p.mesh.position.x-x,p.mesh.position.z-z)<4.5))continue;
      const customer=person(x,z);customer.walk=false;
      customer.mesh.rotation.y=Math.atan2(row.nx,row.nz);
    }
  }
  const actorGroups=new Map();
  for(const p of people)p.mesh.traverse(m=>{if(!m.isMesh)return;const key=m.geometry.uuid+':'+m.material.uuid;if(!actorGroups.has(key))actorGroups.set(key,[]);actorGroups.get(key).push({mesh:m,root:p.mesh});m.visible=false;});
  const batches=[],visibleCrowd=new Set();
  for(const items of actorGroups.values()){
    const batch=new THREE.InstancedMesh(items[0].mesh.geometry,items[0].mesh.material,items.length);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.frustumCulled=false;batch.count=0;
    scene.add(batch);batches.push({batch,items});
  }
  function updateCrowds(camera,range=740){
    visibleCrowd.clear();
    for(const p of people){
      const root=p.mesh;
      if(!root.visible||root.userData.highDetail)continue;
      const dx=root.position.x-camera.x,dz=root.position.z-camera.z;
      if(dx*dx+dz*dz>range*range)continue;
      visibleCrowd.add(root);root.updateMatrixWorld(true);
    }
    for(const {batch,items} of batches){
      let count=0;
      for(const {root,mesh} of items)if(visibleCrowd.has(root))batch.setMatrixAt(count++,mesh.matrixWorld);
      batch.count=count;batch.instanceMatrix.needsUpdate=true;
    }
  }

  const realRoot=real.createScene();addRealLandmarks(realRoot,real);addBuildingFronts(realRoot,real);addRealFacades(realRoot,real);addRealStreetLife(realRoot,{network,realWorld:real});const realMaterials=new Map();realRoot.traverse(m=>{if(m.isMesh&&m.material?.name)realMaterials.set(m.material.name,m.material);});
  return {real:true,realWorld:real,network,galleries:real.galleries,realArt:{root:realRoot,materials:realMaterials,streetLamps:realRoot.userData.streetLamps},starts,checkpoints,city,colliders,roads:[-400,-300,-200,-100,0,100,200,300,400],limit:1600,canalX:99999,restaurants,homes,breakables,people,buildings:[],label:()=>{},updateCrowds};
}
