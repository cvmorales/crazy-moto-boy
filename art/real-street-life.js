import * as THREE from '../vendor/three.module.js';
import {nearestSegment,project} from '../real-network.js?v=0.34';

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
    if(n<3||used.length>=85)continue;const c=net.nodes.get(id);if(used.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<40))continue;
    let point=null;for(const dx of [-11,11])for(const dz of [-11,11]){const p={x:c.x+dx,z:c.z+dz};const near=nearestSegment(net,p);if(!point&&near.distance>7.5&&!real.blocked(p.x,p.z))point=p;}
    if(!point)continue;used.push(c);
    const incoming=net.segments.find(s=>(s.from===id||s.to===id)&&s.length>17);
    if(incoming){const other=incoming.from===id?incoming.b:incoming.a,dx=other.x-c.x,dz=other.z-c.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
      const crossing=new THREE.Group();crossing.position.set(c.x+ux*8,0,c.z+uz*8);crossing.rotation.y=-Math.atan2(uz,ux);crossings.add(crossing);
      for(let k=-2;k<=2;k++)part(crossing,2,.025,.8,0,.09,k*1.25,paint);
    }
    const g=new THREE.Group();g.position.set(point.x,0,point.z);signal.add(g);
    const stem=new THREE.Mesh(pole,lampPost);stem.position.y=2.4;g.add(stem);part(g,.65,1.45,.55,0,4.4,0,signalBody);
    const sign=streetSign(incoming?.name);if(sign){const plate=new THREE.Mesh(new THREE.PlaneGeometry(3.3,.82),sign);plate.position.set(1.6,3.4,0);g.add(plate);}
    for(const [y,mat] of [[4.85,red],[4.4,amber],[3.95,green]]){part(g,.26,.25,.06,0,y,-.3,mat);part(g,.06,.25,.26,-.35,y,0,mat);}
  }
  // Trees are placed on the two banks and in selected parks, avoiding roads.
  const sites=[];function treeAt(x,z){if(real.blocked(x,z)||nearestSegment(net,{x,z}).distance<8||sites.some(p=>Math.hypot(p.x-x,p.z-z)<14))return;sites.push({x,z});}
  for(const s of net.water){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,n=Math.max(1,Math.floor(s.length/18));for(let i=0;i<=n;i++)for(const side of [-1,1]){const x=s.a.x+dx*i/n-side*dz/s.length*12,z=s.a.z+dz*i/n+side*dx/s.length*12;treeAt(x,z);}}
  for(const seg of net.segments){if(sites.length>=220||seg.length<30)continue;const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z;for(const side of [-1,1])treeAt((seg.a.x+seg.b.x)/2-side*dz/seg.length*10,(seg.a.z+seg.b.z)/2+side*dx/seg.length*10);}
  for(const [lat,lon] of [[-31.42384393333333,-64.18665391666667],[-31.428586006666666,-64.18491475111111]]){const p=project(lat,lon);for(let i=0;i<12;i++){const a=i*Math.PI/6;treeAt(p.x+Math.cos(a)*18,p.z+Math.sin(a)*18);}}
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.23,.34,5,7),new THREE.MeshStandardMaterial({color:'#796048',roughness:1}),sites.length);
  const crown=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.9,1),new THREE.MeshStandardMaterial({color:'#5d8b42',roughness:1}),sites.length);trunk.name='Arboles_Troncos';crown.name='Arboles_Copas';const dummy=new THREE.Object3D();
  sites.forEach((p,i)=>{dummy.position.set(p.x,2.5,p.z);dummy.scale.set(1,1,1);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);dummy.position.y=6;dummy.scale.set(1.2,.85,1.2);dummy.updateMatrix();crown.setMatrixAt(i,dummy.matrix);crown.setColorAt(i,new THREE.Color().setHSL(.26,.33,.29+(i%4)*.035));});root.add(trunk,crown);
  root.userData.streetLife={signals:used.length,trees:sites.length};return root.userData.streetLife;
}
