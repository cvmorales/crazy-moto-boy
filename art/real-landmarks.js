import * as THREE from '../vendor/three.module.js';
import {createCordobaArchitecture} from './cordoba-architecture.js?v=0.39';
import {project} from '../real-network.js?v=0.39';

// Original landmark interpretations fitted into the mapped Córdoba district.
export function addRealLandmarks(root,world,maps={}){
  const block=new THREE.BoxGeometry(1,1,1), cream=new THREE.MeshStandardMaterial({color:'#e5d2af',roughness:.8}),stone=new THREE.MeshStandardMaterial({color:'#c5ae89',roughness:.9}),glass=new THREE.MeshStandardMaterial({color:'#304d5b',roughness:.25,metalness:.3,emissive:'#000000'});glass.name='Ventana_Patio_Real';
  function box(parent,w,h,d,x,y,z,mat){const m=new THREE.Mesh(block,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  // Patio Olmos follows the actual mapped perimeter, with an original classical
  // arcade treatment rather than a generic repeating apartment texture.
  const patio=world.buildings.find(b=>b.osmId==='1126847036');
  if(patio){
    const g=new THREE.Group();g.name='Patio_Olmos_Real';root.add(g);
    const pts=patio.points.slice(0,-1),shape=new THREE.Shape();shape.moveTo(pts[0].x,-pts[0].z);for(const p of pts.slice(1))shape.lineTo(p.x,-p.z);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:patio.height,bevelEnabled:false});geo.rotateX(-Math.PI/2);const base=new THREE.Mesh(geo,cream);base.castShadow=true;base.receiveShadow=true;g.add(base);
    const archGeometry=new THREE.TorusGeometry(.95,.12,5,12,Math.PI);
    let signMaterial=null;
    if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=512;c.height=128;const p=c.getContext('2d');p.fillStyle='#244e72';p.fillRect(0,0,512,128);p.fillStyle='#fff2d0';p.textAlign='center';p.textBaseline='middle';p.font='bold 67px Georgia';p.fillText('PATIO OLMOS',256,64,480);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;signMaterial=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});}

    for(let i=1;i<patio.points.length;i++){
      const a=patio.points[i-1],b=patio.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<3.2)continue;
      const face=new THREE.Group();face.position.set((a.x+b.x)/2,0,(a.z+b.z)/2);face.rotation.y=-Math.atan2(dz,dx);g.add(face);
      if(signMaterial&&length>25)for(const side of [-1,1]){const label=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(16,length-2),3.5),signMaterial);label.position.set(0,patio.height-1.9,side*.55);if(side<0)label.rotation.y=Math.PI;face.add(label);}
      for(const side of [-1,1]){
        box(face,length,.28,.5,0,patio.height-.2,side*.2,stone);
        box(face,length,.2,.35,0,7.5,side*.18,stone);
        for(let x=-length/2+1.7;x<length/2-1.2;x+=5.8){
          box(face,2.6,4,.08,x,2.7,side*.12,glass);box(face,.22,5,.35,x-1.5,3,side*.22,stone);box(face,.22,5,.35,x+1.5,3,side*.22,stone);
          const arch=new THREE.Mesh(archGeometry,stone);arch.scale.set(1.42,1.15,1);arch.position.set(x,4.7,side*.24);face.add(arch);
          box(face,2.5,2.9,.08,x,10,side*.13,glass);box(face,.14,3.3,.28,x-1.35,10,side*.2,stone);box(face,.14,3.3,.28,x+1.35,10,side*.2,stone);
          box(face,2.9,.2,.35,x,8.45,side*.2,stone);box(face,2.9,.2,.35,x,11.6,side*.2,stone);
        }
      }
    }

  }
  // Reuse the more detailed original Córdoba landmark models. The placements
  // follow OSM coordinates; proportions are adapted within their mapped plots.
  const legacy=createCordobaArchitecture({roads:[],buildings:[],restaurants:[],galleries:[],colliders:[],limit:325,canalX:-120},maps);
  for(const [name,lat,lon,scale] of [
    ['Paseo_Buen_Pastor',-31.42384393333333,-64.18665391666667,[.76,1,.76]],
    ['Iglesia_Capuchinos',-31.424288637142855,-64.18571264857142,[.76,1,1.05]]
  ]){
    const model=legacy.root.getObjectByName(name);if(!model)continue;model.removeFromParent();const p=project(lat,lon);model.position.set(p.x,0,p.z);model.scale.set(...scale);model.name=name+'_Real';root.add(model);
  }
  // Surface interpretation of Plaza España, above the underground museum.
  const p=project(-31.428586006666666,-64.18491475111111),plaza=new THREE.Group();plaza.name='Plaza_Espana_Real';plaza.position.set(p.x,0,p.z);root.add(plaza);
  const lawn=new THREE.Mesh(new THREE.CylinderGeometry(21,21,.18,32),new THREE.MeshStandardMaterial({color:'#6d9254',roughness:1}));lawn.position.y=.08;plaza.add(lawn);
  const paving=new THREE.Mesh(new THREE.CylinderGeometry(9,9,.22,24),stone);paving.position.y=.17;plaza.add(paving);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;for(const offset of [-2,0,2])box(plaza,.8,4.4,.8,Math.cos(a)*13-Math.sin(a)*offset,2.2,Math.sin(a)*13+Math.cos(a)*offset,cream);}
  const fountain=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4,.45,20),stone);fountain.position.y=.4;plaza.add(fountain);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,.08,20),new THREE.MeshStandardMaterial({color:'#66b6c6',roughness:.25,metalness:.15}));water.position.y=.67;plaza.add(water);
  for(const [x,z] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]])box(plaza,.12,1.7,.12,x,1.45,z,new THREE.MeshStandardMaterial({color:'#b6e4e9',emissive:'#468e9d',emissiveIntensity:.3}));
  return {patio:!!patio,pastor:true,plaza:true};
}
