import * as THREE from '../vendor/three.module.js';
import {nearestSegment,project} from '../real-network.js?v=0.43';
import {offRoad,sidewalkTop,width} from '../real-world.js?v=0.43';

// Lightweight visual details: positions are checked against real streets and
// building collisions; gameplay blockers remain in the mapped world.
export function addRealStreetLife(root,world){
  const net=world.network,real=world.realWorld;
  const lampPost=new THREE.MeshStandardMaterial({color:'#36454a',roughness:.65,metalness:.3});
  const signalBody=new THREE.MeshStandardMaterial({color:'#202b2e',roughness:.6});
  const red=new THREE.MeshStandardMaterial({color:'#f53d28',emissive:'#c10d0d',emissiveIntensity:.75});
  red.name='Semaforo_Rojo_Real';
  const amber=new THREE.MeshStandardMaterial({color:'#f3bc35',emissive:'#d78b05',emissiveIntensity:0});amber.name='Semaforo_Ambar_Real';
  const green=new THREE.MeshStandardMaterial({color:'#45cf70',emissive:'#15942b',emissiveIntensity:0});green.name='Semaforo_Verde_Real';
  const unit=new THREE.BoxGeometry(1,1,1),pole=new THREE.CylinderGeometry(.11,.12,4.8,6),signal=new THREE.Group();signal.name='Semaforos_Reales';root.add(signal);
  const paint=new THREE.MeshStandardMaterial({color:'#eee8dc',roughness:.92});const crossings=new THREE.Group();crossings.name='Sendas_Peatonales_Reales';root.add(crossings);
  function part(parent,w,h,d,x,y,z,mat){const m=new THREE.Mesh(unit,mat);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;}
  const degrees=new Map();for(const s of net.segments){degrees.set(s.from,(degrees.get(s.from)||0)+1);degrees.set(s.to,(degrees.get(s.to)||0)+1);}
  const signMaterials=new Map();
  function streetSign(label){
    if(!label||typeof document==='undefined')return null;const names=['Vélez Sarsfield','Hipólito Yrigoyen','Boulevard San Juan','Boulevard Chacabuco','Marcelo T. de Alvear','Obispo Oro','San Lorenzo','Pueyrredón'];const match=names.find(n=>label.includes(n));if(!match)return null;
    if(!signMaterials.has(match)){const c=document.createElement('canvas');c.width=512;c.height=128;const p=c.getContext('2d');p.fillStyle='#21554a';p.fillRect(0,0,512,128);p.strokeStyle='#f3ead2';p.lineWidth=4;p.strokeRect(3,3,506,122);p.fillStyle='#fff6d8';p.textAlign='center';p.textBaseline='middle';p.font='bold 39px sans-serif';p.fillText(match.toUpperCase(),256,65,488);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;signMaterials.set(match,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));}
    return signMaterials.get(match);
  }
  const used=[];for(const [id,n] of degrees){
    if(n<3||used.length>=135)continue;const c=net.nodes.get(id);if(used.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<27))continue;
    let point=null;for(const offset of [6,8,11])for(const dx of [-offset,offset])for(const dz of [-offset,offset]){
      const p={x:c.x+dx,z:c.z+dz};
      if(!point&&offRoad(net,p.x,p.z,.65)&&!real.blocked(p.x,p.z))point=p;
    }
    if(!point)continue;used.push(c);
    const incoming=net.segments.find(s=>(s.from===id||s.to===id)&&s.length>17);
    if(incoming){const other=incoming.from===id?incoming.b:incoming.a,dx=other.x-c.x,dz=other.z-c.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
      const crossing=new THREE.Group();crossing.position.set(c.x+ux*8,0,c.z+uz*8);crossing.rotation.y=-Math.atan2(uz,ux);crossings.add(crossing);
      for(let k=-2;k<=2;k++)part(crossing,2,.025,.8,0,.09,k*1.25,paint);
    }
    const g=new THREE.Group();g.position.set(point.x,0,point.z);
    g.rotation.y=Math.atan2(point.x-c.x,point.z-c.z);signal.add(g);
    const stem=new THREE.Mesh(pole,lampPost);stem.position.y=2.4;g.add(stem);part(g,.65,1.45,.55,0,4.4,0,signalBody);
    const sign=streetSign(incoming?.name);if(sign){const plate=new THREE.Mesh(new THREE.PlaneGeometry(3.3,.82),sign);plate.position.set(1.6,3.4,0);g.add(plate);}
    for(const [y,mat] of [[4.85,red],[4.4,amber],[3.95,green]]){part(g,.26,.25,.06,0,y,-.3,mat);part(g,.06,.25,.26,-.35,y,0,mat);}
  }
  const bridges=new THREE.Group();bridges.name='Accesos_La_Canada';root.add(bridges);
  const masonry=new THREE.MeshStandardMaterial({color:'#a4937b',roughness:.93});
  const capstone=new THREE.MeshStandardMaterial({color:'#d8c3a0',roughness:.88});
  const bridgeLamp=new THREE.MeshStandardMaterial({color:'#eecf8c',emissive:'#b78b46',emissiveIntensity:.35});
  for(const bridge of real.bridges){
    const length=bridge.length;
    const cx=(bridge.a.x+bridge.b.x)/2,cz=(bridge.a.z+bridge.b.z)/2;
    if(length<2)continue;
    const dx=(bridge.b.x-bridge.a.x)/length,dz=(bridge.b.z-bridge.a.z)/length;
    const deck=new THREE.Group();deck.position.set(cx,0,cz);
    deck.rotation.y=Math.atan2(dx,dz);bridges.add(deck);
    for(const side of [-1,1]){
      const edge=side*(width(bridge)/2+.84);
      const rail=edge+side*.54;
      const approaches={segments:net.segments.filter(s=>s!==bridge)};
      const steps=Math.ceil(length/.5),step=length/steps;
      let start=null;
      for(let i=0;i<=steps;i++){
        const z=-length/2+i*step;
        const clear=i<steps&&[z,z+step/2,z+step].every(along=>[edge,rail].every(across=>
          offRoad(approaches,cx+dz*across+dx*along,cz-dx*across+dz*along,.77)));
        if(clear){start??=z;continue;}
        if(start===null)continue;
        const span=z-start,center=(start+z)/2;
        if(span>=1.5){
          part(deck,1.35,.19,span,edge,sidewalkTop-.105,center,masonry);
          part(deck,1.3,.028,span,edge,sidewalkTop-.012,center,capstone);
          part(deck,.23,.14,span,rail,sidewalkTop+.10,center,masonry);
          part(deck,.10,.10,span,rail,sidewalkTop+.99,center,lampPost);
          for(let post=start+.65;post<z-.4;post+=1.25)part(deck,.055,.8,.065,rail,sidewalkTop+.53,post,lampPost);
          for(const end of [start+.31,z-.31]){
            part(deck,.49,1.18,.49,rail,sidewalkTop+.59,end,masonry);
            part(deck,.59,.15,.59,rail,sidewalkTop+1.25,end,capstone);
            part(deck,.19,.25,.19,rail,sidewalkTop+1.45,end,bridgeLamp);
          }
        }
        start=null;
      }
    }
  }
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
    const brush=canvas.getContext('2d');brush.fillStyle='#234f52';brush.fillRect(0,0,256,64);
    brush.strokeStyle='#d5cba4';brush.lineWidth=3;brush.strokeRect(4,4,248,56);
    brush.fillStyle='#f4ebd5';brush.font='bold 30px sans-serif';brush.textAlign='center';
    brush.textBaseline='middle';brush.fillText('LA CAÑADA',128,32);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const plate=new THREE.PlaneGeometry(2.7,.68);
    const front=new THREE.MeshBasicMaterial({map});
    const positions=[];
    for(const bridge of real.bridges){
      const a=(bridge.a.x+bridge.b.x)/2,b=(bridge.a.z+bridge.b.z)/2;

      const dx=(bridge.b.x-bridge.a.x)/bridge.length,dz=(bridge.b.z-bridge.a.z)/bridge.length;
      for(const side of [-1,1]){
        const offset=width(bridge)/2+1.2,x=a-dz*side*offset,z=b+dx*side*offset;
        if(real.blocked(x,z)||positions.some(p=>Math.hypot(p.x-x,p.z-z)<7))continue;
        positions.push({x,z});part(root,.075,2.05,.075,x,1.02,z,lampPost);
        const sign=new THREE.Mesh(plate,front);sign.position.set(x,2.1,z);
        sign.rotation.y=Math.atan2(dx,dz);root.add(sign);
        const back=sign.clone();back.rotation.y+=Math.PI;root.add(back);
      }
    }
  }
  const stone=new THREE.MeshStandardMaterial({color:'#bfb4a2',roughness:.82});
  const path=new THREE.MeshStandardMaterial({color:'#d9baa0',roughness:.96});
  const pool=new THREE.MeshStandardMaterial({color:'#4ca5b6',metalness:.18,roughness:.24});
  const jet=new THREE.MeshStandardMaterial({color:'#c1eafa',emissive:'#25575c',emissiveIntensity:.45});
  const redPlay=new THREE.MeshStandardMaterial({color:'#c94f3b'}),bluePlay=new THREE.MeshStandardMaterial({color:'#286487'});
  const plantedSoil=new THREE.MeshStandardMaterial({color:'#75834f'});
  const basin=new THREE.CylinderGeometry(2.25,2.45,.46,18),water=new THREE.CylinderGeometry(1.97,1.97,.06,18);
  const parks=new THREE.Group();parks.name='Plazas_Equipadas';root.add(parks);
  for(const {x,z,paved} of real.parkSites){
    const group=new THREE.Group();group.position.set(x,0,z);parks.add(group);
    if(paved){
      part(group,15.8,.15,15.8,0,.01,0,stone);
      for(const side of [-1,1]){
        part(group,3.1,.27,2.7,side*5.9,.17,5.3,capstone);
        part(group,2.85,.05,2.45,side*5.9,.325,5.3,plantedSoil);
      }
    }
    part(group,15,.12,2.3,0,.015,4,path);
    part(group,2.4,.12,15,0,.018,0,path);
    const base=new THREE.Mesh(basin,stone);base.position.set(-3,.26,-2);group.add(base);
    const surface=new THREE.Mesh(water,pool);surface.position.set(-3,.50,-2);group.add(surface);
    part(group,.47,.78,.47,-3,.73,-2,stone);
    part(group,.045,1.18,.045,-3,1.51,-2,jet);
    for(const offset of [-.64,-.35,.35,.64]){
      const stream=part(group,.034,.75,.035,-3+offset,1.11,-2,jet);
      stream.rotation.z=-offset*.52;
    }
    part(group,5,.09,5,4,.047,-2,path);
    for(const dx of [2.2,5.8])for(const dz of [-3.72,-.28]){
      const support=part(group,.10,2.48,.10,dx,1.21,dz,redPlay);
      support.rotation.x=(dz<-2?1:-1)*.20;
    }
    part(group,4,.13,.14,4,2.4,-2,bluePlay);
    for(const sx of [3.08,4.9]){
      for(const dx of [-.23,.23])part(group,.027,1.76,.035,sx+dx,1.46,-2,stone);
      part(group,.63,.10,.34,sx,.58,-2,bluePlay);
    }
  }
  // Trees are placed on the two banks and in selected parks, avoiding roads.
  const sites=[];
  function treeAt(x,z,bank=false){
    if(real.blocked(x,z)||sites.some(p=>Math.hypot(p.x-x,p.z-z)<(bank?9:12)))return;
    const road=nearestSegment(net,{x,z});
    if(!road||road.distance<width(road.segment)/2+1.55)return;
    sites.push({x,z,bank});
  }
  for(const s of net.water){
    const dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length;
    for(let d=2;d<s.length;d+=10)for(const side of [-1,1]){
      treeAt(s.a.x+dx*d-side*dz*7.6,s.a.z+dz*d+side*dx*7.6,true);
    }
  }
  for(const [lat,lon] of [[-31.42384393333333,-64.18665391666667],[-31.428586006666666,-64.18491475111111]]){const p=project(lat,lon);for(let i=0;i<12;i++){const a=i*Math.PI/6;treeAt(p.x+Math.cos(a)*18,p.z+Math.sin(a)*18);}}
  for(const p of real.parkSites){
    treeAt(p.x-6.5,p.z-6.5,true);
    treeAt(p.x+6.5,p.z+6.5,true);
  }
  for(const seg of net.segments){
    if(sites.length>=720||seg.length<18||seg.bridge==='yes'||seg.tunnel==='yes')continue;
    const dx=(seg.b.x-seg.a.x)/seg.length,dz=(seg.b.z-seg.a.z)/seg.length;
    const offset=width(seg)/2+2.4;
    for(let d=8;d<seg.length-7;d+=17)for(const side of [-1,1]){
      treeAt(seg.a.x+dx*d-side*dz*offset,seg.a.z+dz*d+side*dx*offset);
    }
  }
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.23,.34,5,7),new THREE.MeshStandardMaterial({color:'#796048',roughness:1}),sites.length);
  const crown=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),sites.length*3);
  const pits=new THREE.InstancedMesh(unit,new THREE.MeshStandardMaterial({color:'#73624c',roughness:1}),sites.length);
  trunk.name='Arboles_Troncos';crown.name='Arboles_Copas';pits.name='Cazuelas_Arboles';
  const dummy=new THREE.Object3D();
  const hiddenMatrix=new THREE.Matrix4().makeScale(0,0,0);
  const originalTrunk=new THREE.Matrix4(),originalCrown=new THREE.Matrix4();
  const hiddenTrees=new Set();
  sites.forEach((p,i)=>{
    const size=(p.bank?1.22:1)*(.86+(i%6)*.065);
    p.size=size;
    dummy.position.set(p.x,sidewalkTop+2.5*size,p.z);dummy.scale.set(size,size,size);
    dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);
    dummy.position.y=sidewalkTop+.01;dummy.scale.set(1.5,.035,1.5);
    dummy.updateMatrix();pits.setMatrixAt(i,dummy.matrix);
    for(const [j,[x,y,z,r]] of [[0,[0,6.8,0,2.55]],[1,[-1.5,5.95,.45,2.25]],[2,[1.5,6.05,-.45,2.2]]]){
      dummy.position.set(p.x+x*size,sidewalkTop+y*size,p.z+z*size);
      dummy.scale.set(r*size,r*.74*size,r*size);dummy.rotation.y=i*.7;
      dummy.updateMatrix();crown.setMatrixAt(i*3+j,dummy.matrix);
      crown.setColorAt(i*3+j,new THREE.Color().setHSL(.23+(i%5)*.012,.33,.32+(i%4)*.035+j*.021));
    }
  });
  trunk.receiveShadow=crown.receiveShadow=true;root.add(trunk,crown,pits);
  // Cache the final bounds before any instances are temporarily hidden.
  trunk.computeBoundingSphere();crown.computeBoundingSphere();
  const trunkTransforms=trunk.instanceMatrix.array.slice();
  const crownTransforms=crown.instanceMatrix.array.slice();
  root.userData.updateTreeVisibility=(camera,rider,active)=>{
    const dx=rider.x-camera.x, dz=rider.z-camera.z;
    const lengthSquared=dx*dx+dz*dz;
    let changed=false;
    for(const [i,tree] of sites.entries()){
      const x=tree.x-camera.x,z=tree.z-camera.z;
      const t=Math.max(0,Math.min(1,lengthSquared ? (x*dx+z*dz)/lengthSquared : 0));
      const clearance=tree.size*3.9+(hiddenTrees.has(i)?.55:0);
      const cameraLineHeight=camera.y+(1.85-camera.y)*t;
      const hide=active&&cameraLineHeight<sidewalkTop+tree.size*9.2&&
        (x-dx*t)**2+(z-dz*t)**2<clearance**2;
      if(hide===hiddenTrees.has(i))continue;
      if(hide)hiddenTrees.add(i);else hiddenTrees.delete(i);
      trunk.setMatrixAt(i,hide?hiddenMatrix:originalTrunk.fromArray(trunkTransforms,i*16));
      for(let j=i*3;j<i*3+3;j++){
        crown.setMatrixAt(j,hide?hiddenMatrix:originalCrown.fromArray(crownTransforms,j*16));
      }
      changed=true;
    }
    if(changed)trunk.instanceMatrix.needsUpdate=crown.instanceMatrix.needsUpdate=true;
  };
  root.userData.streetLife={signals:used.length,trees:sites.length};return root.userData.streetLife;
}
