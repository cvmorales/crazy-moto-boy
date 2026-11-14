import * as THREE from '../vendor/three.module.js';
import {createCordobaArchitecture} from './cordoba-architecture.js?v=0.43';
import {nearestSegment,project} from '../real-network.js?v=0.43';
import {offRoad} from '../real-world.js?v=0.43';

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
    if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=512;c.height=128;const p=c.getContext('2d');p.fillStyle='#24354b';p.fillRect(0,0,512,128);p.strokeStyle='#c8a35a';p.lineWidth=4;p.strokeRect(7,7,498,114);p.fillStyle='#fff2d0';p.textAlign='center';p.textBaseline='middle';p.font='bold 58px Georgia';p.fillText('PATIO OLMOS',256,51,476);p.font='bold 23px sans-serif';p.fillText('S H O P P I N G',256,99);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;signMaterial=new THREE.MeshBasicMaterial({map:t});}
    const entryGlass=new THREE.MeshStandardMaterial({color:'#345975',roughness:.28});
    const brass=new THREE.MeshStandardMaterial({color:'#b79250',metalness:.58,roughness:.36});
    const glow=new THREE.MeshStandardMaterial({color:'#ffe1a1',emissive:'#d78e38',emissiveIntensity:.65});
    const bannerMaterials=['#a13243','#263e73'].map(color=>{
      if(typeof document==='undefined')return new THREE.MeshStandardMaterial({color});
      const canvas=document.createElement('canvas');canvas.width=96;canvas.height=256;
      const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,96,256);
      ctx.fillStyle='#fff1d1';ctx.textAlign='center';ctx.font='bold 52px Georgia';ctx.fillText('¡O!',48,78);
      ctx.font='bold 21px Georgia';ctx.fillText('PATIO',48,135);ctx.fillText('OLMOS',48,164);
      const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({map});
    });

    for(let i=1;i<patio.points.length;i++){
      const a=patio.points[i-1],b=patio.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<3.2)continue;
      const face=new THREE.Group();face.position.set((a.x+b.x)/2,0,(a.z+b.z)/2);face.rotation.y=-Math.atan2(dz,dx);g.add(face);
      const street=nearestSegment(world.network,face.position);
      const cornerFront=face.position.x<0&&face.position.z>24&&length>=5&&street.distance<19;
      const entrance=cornerFront||(length>18&&street.distance<20&&/Vélez Sarsfield|San Juan/.test(street.segment.name));
      const normalX=-dz/length,normalZ=dx/length;
      const frontSide=(street.point.x-face.position.x)*normalX+(street.point.z-face.position.z)*normalZ>0?1:-1;
      for(const side of [-1,1]){
        box(face,length,.28,.5,0,patio.height-.2,side*.2,stone);
        box(face,length,.2,.35,0,7.5,side*.18,stone);
        for(let x=-length/2+1.7;x<length/2-1.2;x+=5.8){
          if(entrance&&side===frontSide&&Math.abs(x)<5.6)continue;
          box(face,2.6,4,.08,x,2.7,side*.12,glass);box(face,.22,5,.35,x-1.5,3,side*.22,stone);box(face,.22,5,.35,x+1.5,3,side*.22,stone);
          const arch=new THREE.Mesh(archGeometry,stone);arch.scale.set(1.42,1.15,1);arch.position.set(x,4.7,side*.24);face.add(arch);
          box(face,2.5,2.9,.08,x,10,side*.13,glass);box(face,.14,3.3,.28,x-1.35,10,side*.2,stone);box(face,.14,3.3,.28,x+1.35,10,side*.2,stone);
          box(face,2.9,.2,.35,x,8.45,side*.2,stone);box(face,2.9,.2,.35,x,11.6,side*.2,stone);
        }
      }
      if(entrance){
        const s=frontSide;
        const portal=new THREE.Group();portal.name='Portico_Patio_Olmos';face.add(portal);
        if(s<0)portal.rotation.y=Math.PI;
        portal.scale.x=Math.min(1,(length-.25)/10.7);
        box(portal,10.6,.43,.58,0,11.9,.23,cream);
        box(portal,10.6,1.24,.30,0,12.9,.06,stone);
        box(portal,10.7,.16,.47,0,13.57,.11,cream);
        box(portal,10.7,.17,.36,0,8.13,.18,brass);
        for(const x of [-4.7,4.7]){
          box(portal,.75,7.06,.57,x,8.36,.29,cream);
          box(portal,1.0,.29,.63,x,11.83,.32,stone);
        }
        for(const x of [-2.6,0,2.6]){
          box(portal,1.85,2.63,.15,x,9.87,.20,stone);
          box(portal,1.58,2.26,.13,x,9.87,.29,glass);
          box(portal,.065,2.28,.07,x,9.86,.37,brass);
          box(portal,2.02,.13,.31,x,8.68,.28,cream);
        }
        box(portal,10.2,5.4,.18,0,2.98,.24,stone);
        box(portal,8.65,3.42,.21,0,2.05,.36,entryGlass);
        const fan=new THREE.Mesh(new THREE.CircleGeometry(1,24,0,Math.PI),entryGlass);
        fan.scale.set(4.32,2.1,1);fan.position.set(0,3.66,.535);portal.add(fan);
        const entranceArch=new THREE.Mesh(archGeometry,cream);
        entranceArch.scale.set(4.65,2.4,2.1);entranceArch.position.set(0,3.67,.55);portal.add(entranceArch);
        for(let i=1;i<8;i++){
          const angle=i*Math.PI/8,len=1.94;
          const spoke=box(portal,.045,len,.055,Math.cos(angle)*1.96,3.67+Math.sin(angle)*.97,.565,brass);
          spoke.rotation.z=Math.atan2(Math.sin(angle)*2.05,Math.cos(angle)*4.22)-Math.PI/2;
          spoke.scale.y=Math.hypot(Math.sin(angle)*2.05,Math.cos(angle)*4.22);
        }
        for(const x of [-4.65,4.65]){
          box(portal,.65,5.3,.60,x,2.82,.5,cream);
          for(const y of [.36,5.2])box(portal,.88,.33,.78,x,y,.55,stone);
        }
        for(const x of [-3.9,-2.55,-1.28,0,1.28,2.55,3.9]){
          box(portal,.055,4.04,.09,x,2.48,.49,brass);
        }
        for(const x of [-3.18,-2.94,2.94,3.18])box(portal,.045,.48,.10,x,1.32,.56,brass);
        box(portal,10.4,.27,1.30,0,6.00,.77,brass);
        box(portal,9.8,.095,.10,0,5.98,1.45,glow);
        box(portal,10.1,.21,1.4,0,.14,.66,stone);
        if(signMaterial){
          const label=new THREE.Mesh(new THREE.PlaneGeometry(9.5,2.38),signMaterial);
          label.scale.set(.72,.68,1);label.position.set(0,7.06,.62);portal.add(label);
        }
        if(length>18)for(const [i,x] of [-7.2,7.2].entries()){
          const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.65,4.7),bannerMaterials[i]);
          flag.position.set(x,7.75,.71);portal.add(flag);
          box(portal,1.9,.075,.17,x,10.16,.71,brass);
        }
        for(const x of [-8.45,8.45]){
          const corner=portal.localToWorld(new THREE.Vector3(x,0,.85));
          if(!offRoad(world.network,corner.x,corner.z,.65))continue;
          box(portal,1.25,.50,.72,x,.32,.85,stone);
          for(const leaf of [-.33,0,.33])box(portal,.32,.42,.48,x+leaf,.67,.85,new THREE.MeshStandardMaterial({color:'#527848'}));
        }
      }
    }
    // Fit the fountain and paved seating area into an open pocket by the mall.
    const candidates=[];
    for(let x=-61;x<=23;x+=2)for(let z=13;z<=79;z+=2){
      if([-3.8,0,3.8].every(dx=>[-3.8,0,3.8].every(dz=>!world.blocked(x+dx,z+dz)&&offRoad(world.network,x+dx,z+dz,.6))))candidates.push({x,z});
    }
    candidates.sort((a,b)=>Math.hypot(a.x+47,a.z-29)-Math.hypot(b.x+47,b.z-29));
    const plaza=candidates[0];
    if(plaza){
      const court=new THREE.Group();court.name='Fuente_Patio_Olmos';court.position.set(plaza.x,0,plaza.z);g.add(court);
      const water=new THREE.MeshStandardMaterial({color:'#4bafc5',roughness:.25,metalness:.2});
      const stoneCircle=(radius,h,y,mat)=>{
        const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,h,24),mat);
        mesh.position.y=y;court.add(mesh);
      };
      stoneCircle(3.75,.13,.015,cream);stoneCircle(3.12,.59,.35,stone);
      stoneCircle(2.85,.09,.655,water);stoneCircle(.69,.85,1.01,cream);
      stoneCircle(1.10,.15,1.43,stone);stoneCircle(.96,.04,1.53,water);
      const spray=new THREE.MeshBasicMaterial({color:'#bce8ec'});
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4,points=[];
        for(let j=0;j<=8;j++){
          const t=j/8,r=.35+2.24*t;
          points.push(new THREE.Vector3(Math.cos(angle)*r,1.53-.85*t+Math.sin(Math.PI*t)*1.48,Math.sin(angle)*r));
        }
        court.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.060,5,false),spray));
      }
      box(court,.048,1.08,.048,0,2.04,0,spray);
      for(const z of [-3.39,3.39]){
        box(court,2.1,.11,.52,0,.48,z,brass);
        for(const x of [-.77,.77])box(court,.13,.45,.38,x,.23,z,stone);
      }
      const palmLeaf=new THREE.MeshStandardMaterial({color:'#467843',side:THREE.DoubleSide});
      const palmTrunk=new THREE.MeshStandardMaterial({color:'#86705a'});
      for(const [dx,dz] of [[-4.6,-2],[4.6,2],[-3,4.8],[4.9,-3.5]]){
        if(world.blocked(plaza.x+dx,plaza.z+dz)||!offRoad(world.network,plaza.x+dx,plaza.z+dz,.7))continue;
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.15,.29,5.5,7),palmTrunk);
        trunk.position.set(dx,2.75,dz);court.add(trunk);
        for(let i=0;i<8;i++){
          const angle=i*Math.PI/4;
          const leaf=box(court,.44,.09,2.4,dx+Math.sin(angle),5.52,dz+Math.cos(angle),palmLeaf);
          leaf.rotation.set(.26,angle,0);
        }
      }
    }
  }
  // Reuse the more detailed original Córdoba landmark models. The placements
  // follow OSM coordinates; proportions are adapted within their mapped plots.
  const legacy=createCordobaArchitecture({roads:[],buildings:[],restaurants:[],galleries:[],colliders:[],limit:325,canalX:-120},maps);
  const cathedralFootprint=world.buildings.find(b=>b.osmId==='1149552632');
  const cathedral=legacy.root.getObjectByName('Catedral_Cordoba');
  if(cathedralFootprint&&cathedral){
    const {minX,maxX,minZ,maxZ}=cathedralFootprint.bounds;
    cathedral.position.set((minX+maxX)/2,.12,(minZ+maxZ)/2);
    cathedral.rotation.y=Math.PI/2;
    cathedral.scale.set(.94,.92,1.04);
    cathedral.name='Catedral_Cordoba_Real';root.add(cathedral);
    const clockFace=new THREE.MeshBasicMaterial({color:'#eae0c4'});
    const hands=new THREE.MeshBasicMaterial({color:'#30312b'});
    for(const x of [-20,20]){
      const plate=new THREE.Mesh(new THREE.CircleGeometry(1.18,24),clockFace);
      plate.position.set(x,25.2,28.63);cathedral.add(plate);
      box(cathedral,.08,.83,.045,x,25.49,28.67,hands);
      box(cathedral,.59,.08,.045,x+.19,25.22,28.67,hands);
    }
  }
  for(const [name,lat,lon,scale] of [
    ['Paseo_Buen_Pastor',-31.42384393333333,-64.18665391666667,[.76,1,.76]],
    ['Iglesia_Capuchinos',-31.424288637142855,-64.18571264857142,[.76,1,1.05]]
  ]){
    const model=legacy.root.getObjectByName(name);if(!model)continue;model.removeFromParent();const p=project(lat,lon);model.position.set(p.x,0,p.z);model.scale.set(...scale);model.name=name+'_Real';root.add(model);
    if(name==='Iglesia_Capuchinos'){
      const amber=new THREE.MeshBasicMaterial({color:'#bc6545'}),blue=new THREE.MeshBasicMaterial({color:'#396d9e'});
      const pane=new THREE.CircleGeometry(.72,16);
      for(let i=0;i<12;i++){
        const angle=i*Math.PI/6;
        const petal=new THREE.Mesh(pane,i%2?blue:amber);
        petal.position.set(Math.cos(angle)*2.63,19+Math.sin(angle)*2.63,22.68);model.add(petal);
      }
      for(const x of [-21.7,-16.3,16.3,21.7]){
        const tip=new THREE.Mesh(new THREE.ConeGeometry(.48,2.4,5),stone);
        tip.position.set(x,x<0?28.25:32.15,21.9);model.add(tip);
      }
    }else{
      const nozzle=new THREE.MeshStandardMaterial({color:'#d8f2f4',emissive:'#73b4c9',emissiveIntensity:.48});
      for(let i=0;i<23;i++){
        const x=-26+i*2.35,h=1.7+Math.sin(i*Math.PI/22)*2.45;
        box(model,.075,h,.075,x,.65+h/2,29.8,nozzle);
      }
      for(const z of [23.4,34.6])box(model,62,.19,.38,0,.55,z,stone);
    }
  }
  // The address is documented. The frontage is interpreted within the
  // game's simplified parcels on Hipólito Yrigoyen.
  const seminarStreet=world.network.segments.find(s=>s.a.z<105&&s.b.z>180&&/Yrigoyen/.test(s.name));
  if(seminarStreet){
    const dx=(seminarStreet.b.x-seminarStreet.a.x)/seminarStreet.length;
    const dz=(seminarStreet.b.z-seminarStreet.a.z)/seminarStreet.length;
    for(const along of [34,20,48])for(const side of [1,-1]){
      if(root.getObjectByName('Seminario_Mayor_Real'))continue;
      const x=seminarStreet.a.x+dx*along-dz*side*16,z=seminarStreet.a.z+dz*along+dx*side*16;
      if(![-7,0,7].every(a=>[-3,0,3].every(d=>{
        const px=x+a*dx-d*dz,pz=z+a*dz+d*dx;
        return !world.blocked(px,pz)&&offRoad(world.network,px,pz,1);
      })))continue;
      const seminar=new THREE.Group();seminar.name='Seminario_Mayor_Real';
      seminar.position.set(x,0,z);seminar.rotation.y=-Math.atan2(dz,dx)+(side>0?Math.PI:0);root.add(seminar);
      const brick=new THREE.MeshStandardMaterial({color:'#9e624d',roughness:.93});
      box(seminar,14,9,5,0,4.5,0,brick);
      for(const y of [.40,4.6,8.78])box(seminar,14.25,.23,5.25,0,y,0,stone);
      for(const x of [-5,-2.5,0,2.5,5]){
        box(seminar,1.27,2.12,.14,x,6.30,2.53,glass);
        const arch=new THREE.Mesh(new THREE.TorusGeometry(.73,.085,5,12,Math.PI),cream);
        arch.position.set(x,7.35,2.62);seminar.add(arch);
      }
      box(seminar,2.55,3.55,.2,0,1.89,2.62,cream);
      box(seminar,1.97,3.1,.14,0,1.77,2.79,glass);
      box(seminar,3.15,.18,.65,0,.18,2.87,stone);
      if(typeof document!=='undefined'){
        const c=document.createElement('canvas');c.width=384;c.height=96;
        const ctx=c.getContext('2d');ctx.fillStyle='#403534';ctx.fillRect(0,0,384,96);
        ctx.fillStyle='#fff1cf';ctx.textAlign='center';ctx.font='bold 30px Georgia';ctx.fillText('SEMINARIO MAYOR',192,39);
        ctx.font='18px Georgia';ctx.fillText('Nuestra Señora de Loreto',192,71);
        const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
        const plaque=new THREE.Mesh(new THREE.PlaneGeometry(6.8,1.46),new THREE.MeshBasicMaterial({map}));
        plaque.position.set(0,3.95,2.83);seminar.add(plaque);
      }
    }
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
