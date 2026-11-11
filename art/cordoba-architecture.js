import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/addons/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {buildCordobaLandmarks} from './cordoba-landmarks.js?v=0.29';

/** Original, editable architectural set for the La Cañada / Bv. San Juan pilot.
 * Real landmarks are interpreted at arcade scale. Units are metres. */
export function createCordobaArchitecture(world,maps={}){
  const districtLimit=world.limit||325, districtSpan=districtLimit*2+10;
  const root=new THREE.Group();root.name='Cordoba_La_Canada_Bv_San_Juan';
  let seed=7182;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const unit=new THREE.BoxGeometry(1,1,1),cache=new Map(),geometryCache=new Map(),foliage=[],streetLamps=[],canalWallSegments=[];
  function mat(name,color,opts={}){
    if(cache.has(name))return cache.get(name);
    const m=new THREE.MeshStandardMaterial({color,roughness:.82,...opts});m.name=name;cache.set(name,m);return m;
  }
  function tileMap(source,x,y){if(!source)return null;const t=source.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);t.anisotropy=8;return t;}
  const limestone=mat('Calicanto','#c1b99c',{map:maps.calicanto,roughness:.98,bumpMap:maps.calicanto,bumpScale:.07});
  const stoneCap=mat('Calicanto_Albarda','#a79f87');
  const cream=mat('Molduras_Marfil','#e9d2ad',{roughness:.75});
  const ivory=mat('Patio_Olmos_Estuco','#dfc9a1',{map:maps.stucco,bumpMap:maps.stucco,bumpScale:.025});
  const trim=mat('Cornisa_Caliza','#cbb693');
  const iron=mat('Hierro_Forjado','#273b39',{metalness:.65,roughness:.45});
  const glass=mat('Vidrio_Azul','#2b5264',{metalness:.5,roughness:.16,envMapIntensity:.75});
  const shadow=mat('Interiores_Oscuros','#172f30',{roughness:.98});
  const wood=mat('Carpinteria_Cedro','#75513a',{roughness:.73});
  const teak=mat('Madera_Banco','#a07c4d');
  const roofMat=mat('Teja_Colonial','#a66445',{roughness:.92});
  const concrete=mat('Vereda_Cordoba','#c3b9a5',{map:maps.paving,bumpMap:maps.paving,bumpScale:.035});
  const green=mat('Vegetacion_Baja','#597e42');
  const facadeLods=new Map();
  function distantFacade(color,height,variant=0){
    if(typeof document==='undefined')return mat('Fachada_Lod_'+color,color);
    const floors=Math.ceil(height/3.6),key=color+':'+floors+':'+variant;if(facadeLods.has(key))return facadeLods.get(key);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;const p=canvas.getContext('2d');
    p.fillStyle=color;p.fillRect(0,0,512,1024);
    // Local CC0 photographic masonry adds material detail without extra meshes.
    const surface=(variant%2?maps.facadeBrick:maps.facadeTile)?.image;
    if(surface){p.save();p.globalAlpha=variant%2?.18:.12;for(let yy=0;yy<1024;yy+=256)p.drawImage(surface,0,yy,512,256);p.restore();}
    const sunlight=p.createLinearGradient(0,0,512,0);sunlight.addColorStop(0,'rgba(255,244,213,.19)');sunlight.addColorStop(.55,'rgba(255,248,231,.04)');sunlight.addColorStop(1,'rgba(46,38,29,.18)');p.fillStyle=sunlight;p.fillRect(0,0,512,1024);
    // Plaster grain, seams, window recesses and balcony bands give the broad
    // city blocks texture without adding individual meshes to every building.
    let noise=(floors*719+variant*3571)>>>0;const random=()=>{noise=(noise*1664525+1013904223)>>>0;return noise/4294967296;};
    for(let i=0;i<3800;i++){const v=random()>.5?'255,250,235':'28,25,20';p.fillStyle=`rgba(${v},${.015+random()*.035})`;p.fillRect(random()*512,random()*1024,.7+random()*2,1+random()*4);}
    const sh=1024/floors;
    p.fillStyle='rgba(48,40,30,.12)';for(let row=1;row<floors;row++)p.fillRect(0,row*sh,512,3);
    const night=document.createElement('canvas');night.width=512;night.height=1024;const q=night.getContext('2d');q.fillStyle='#000000';q.fillRect(0,0,512,1024);
    const shades=['#29485a','#385e6f','#476b79','#28434e','#526d72'];
    for(let row=0;row<floors;row++)for(let col=0;col<6;col++){
      const x=col*85+20,y=row*sh+sh*.17,w=44,h=sh*.61;
      p.fillStyle='rgba(31,31,29,.38)';p.fillRect(x-5,y-4,w+11,h+9);
      p.fillStyle='#d7c8ae';p.fillRect(x-3,y-3,w+6,h+6);p.fillStyle='rgba(255,247,225,.55)';p.fillRect(x-3,y-3,w+6,2);p.fillRect(x-3,y-3,2,h+6);p.fillStyle='rgba(49,41,33,.32)';p.fillRect(x+w+1,y,2,h+2);
      p.fillStyle=shades[(row*3+col+variant)%shades.length];p.fillRect(x,y,w,h);
      const reflection=p.createLinearGradient(x,y,x+w,y+h);reflection.addColorStop(0,'rgba(190,225,233,.48)');reflection.addColorStop(.42,'rgba(147,191,207,.06)');reflection.addColorStop(1,'rgba(8,25,35,.30)');p.fillStyle=reflection;p.fillRect(x+2,y+2,w-4,h-4);
      p.fillStyle='rgba(221,236,228,.22)';p.beginPath();p.moveTo(x+4,y+3);p.lineTo(x+15,y+3);p.lineTo(x+w*.65,y+h-3);p.lineTo(x+w*.4,y+h-3);p.closePath();p.fill();
      p.fillStyle='rgba(16,31,39,.45)';p.fillRect(x,y,w,Math.max(2,h*.12));
      p.fillStyle='#c5b9a4';p.fillRect(x+w*.49,y,2,h);p.fillRect(x,y+h*.52,w,2);
      p.fillStyle='#e4d4ba';p.fillRect(x-6,y+h+1,w+12,4);
      if((row+col+variant)%3===0&&row<floors-1){
        p.fillStyle='#b6a893';p.fillRect(x-8,y+h+4,w+16,4);p.fillStyle='#535a57';p.fillRect(x-5,y+h-7,w+10,2);
        for(let k=0;k<5;k++)p.fillRect(x+k*w/4,y+h-7,1,11);
      }
      if(row===floors-1){
        // Shopfronts and striped awnings animate the ground floor silhouette.
        p.fillStyle='#243d42';p.fillRect(x-5,y,w+10,h);p.fillStyle='rgba(162,207,214,.35)';p.fillRect(x,y+3,w*.45,h*.8);
        p.fillStyle=variant%2?'#a94430':'#317569';p.fillRect(x-9,y-9,w+18,8);
        p.fillStyle='rgba(255,240,201,.8)';for(let stripe=0;stripe<5;stripe++)p.fillRect(x-7+stripe*12,y-9,5,7);
        p.fillStyle='#eadbbb';p.fillRect(x-3,y+h-3,w+6,3);
      }
      if((row*7+col*3+variant)%5!==0){q.fillStyle=(row+col+variant)%3===0?'#c9b083':'#fff0c4';q.fillRect(x+2,y+2,w-4,Math.max(1,h-4));}
    }
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    const nightMap=new THREE.CanvasTexture(night);nightMap.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.MeshStandardMaterial({map:t,roughness:.9,emissive:'#000000',emissiveMap:nightMap,emissiveIntensity:0});
    m.name='Fachada_Lod_'+key;cache.set(m.name,m);facadeLods.set(key,m);return m;
  }
  function add(geo,m,x=0,y=0,z=0,parent=root){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,m,x,y,z,parent=root,bevel=0){
    const key=[w,h,d,bevel].join(':');if(bevel&&!geometryCache.has(key))geometryCache.set(key,new RoundedBoxGeometry(w,h,d,2,bevel));
    const g=bevel?geometryCache.get(key):unit;
    const o=add(g,m,x,y,z,parent);if(!bevel)o.scale.set(w,h,d);return o;
  }
  function column(r,h,m,x,y,z,parent=root,rTop=r){const k=['cylinder',r,rTop,h].join(':');if(!geometryCache.has(k))geometryCache.set(k,new THREE.CylinderGeometry(rTop,r,h,12));return add(geometryCache.get(k),m,x,y,z,parent);}
  function beam(a,b,r,m,parent=root){const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),d=w.clone().sub(v),o=add(new THREE.CylinderGeometry(r,r,d.length(),8),m,0,0,0,parent);o.position.copy(v.add(w).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
  function faceGroup(x,y,z,rotation,parent=root){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);return g;}
  function cornice(width,y,z,parent=root){box(width,.24,.58,trim,0,y,z,parent);box(width+.35,.18,.83,cream,0,y+.2,z+.08,parent);box(width+.7,.12,1.02,ivory,0,y+.35,z+.12,parent);}
  function roundArch(x,y,z,w,h,m,parent,depth=.24){
    const r=w/2,stem=h-r,shape=new THREE.Shape();shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,stem);shape.absarc(0,stem,r,0,Math.PI,false);shape.lineTo(-r,0);
    const o=add(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:20}),m,x,y,z,parent);return o;
  }
  function archFrame(x,y,z,w,h,parent,frame=cream){
    const r=w/2,stem=h-r;roundArch(x,y,z,w,h,shadow,parent,.08);
    for(const s of [-1,1])box(.22,stem+.1,.28,frame,x+s*(r+.11),y+stem/2,z+.12,parent,.03);
    const rim=add(new THREE.TorusGeometry(r+.1,.13,6,24,Math.PI),frame,x,y+stem,z+.15,parent);
    return rim;
  }
  function window(x,y,z,w,h,parent,{arched=false,balcony=false}={}){
    if(arched)archFrame(x,y-h/2,z,w,h,parent);
    else{
      box(w+.25,h+.25,.09,shadow,x,y,z,parent);
      box(w,h,.10,glass,x,y,z+.04,parent);
      for(const s of [-1,1])box(.12,h+.3,.27,cream,x+s*(w/2+.1),y,z+.14,parent);
      box(w+.55,.18,.4,cream,x,y+h/2+.1,z+.14,parent);
    }
    box(.065,h,.15,wood,x,y,z+.18,parent);box(w,.07,.15,wood,x,y+.1,z+.18,parent);
    box(w+.6,.20,.62,trim,x,y-h/2-.16,z+.22,parent,.035);
    if(balcony){
      box(w+.95,.22,1.25,cream,x,y-h/2-.3,z+.56,parent,.035);
      beam([x-w/2-.3,y-h/2+.75,z+1.1],[x+w/2+.3,y-h/2+.75,z+1.1],.035,iron,parent);
      for(let t=-w/2-.25;t<=w/2+.3;t+=.32){beam([x+t,y-h/2-.15,z+1.1],[x+t,y-h/2+.72,z+1.1],.018,iron,parent);}
      for(const s of [-1,1])beam([x+s*(w/2+.3),y-h/2+.75,z+.16],[x+s*(w/2+.3),y-h/2+.75,z+1.1],.028,iron,parent);
    }
  }
  function sign(text,x,y,z,width,background='#264b40',color='#f4e8c8',rotation=0,parent=root){
    if(typeof document==='undefined')return;
    const c=document.createElement('canvas');c.width=1024;c.height=192;const p=c.getContext('2d');p.fillStyle=background;p.fillRect(0,0,c.width,c.height);p.fillStyle=color;p.textAlign='center';p.textBaseline='middle';p.font='700 64px Georgia';p.fillText(text,512,99,950);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
    const m=new THREE.MeshBasicMaterial({map:t});m.name='Rotulo_'+text;const o=add(new THREE.PlaneGeometry(width,width*.1875),m,x,y,z,parent);o.rotation.y=rotation;return o;
  }
  // Signs use shared, locally drawn textures. They keep the neighbourhood
  // legible from the motorcycle without importing artwork from the reference.
  const localSigns=new Map();
  function shopSign(label,width,x,y,z,parent){
    if(typeof document==='undefined')return;
    if(!localSigns.has(label)){
      const c=document.createElement('canvas');c.width=512;c.height=128;const p=c.getContext('2d');
      const palette={'CAFÉ DE BARRIO':['#8c322c','#fff1bd'],'ALMACÉN':['#1c5960','#f8e3a3'],'PANADERÍA':['#b77530','#fff4cf'],'KIOSCO':['#233c62','#f9df58']};
      const [background,foreground]=palette[label];p.fillStyle=background;p.fillRect(0,0,512,128);
      p.strokeStyle=foreground;p.lineWidth=5;p.strokeRect(6,6,500,116);p.fillStyle=foreground;
      p.textAlign='center';p.textBaseline='middle';p.font='bold 57px sans-serif';p.fillText(label,256,64,480);
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
      const m=new THREE.MeshStandardMaterial({map:t,roughness:.8});m.name='Cartel_'+label;localSigns.set(label,m);
    }
    const panel=add(new THREE.PlaneGeometry(1,1),localSigns.get(label),x,y,z,parent);panel.scale.set(width,width*.25,1);panel.castShadow=false;
  }
  // Ground is predominantly paving and masonry; no oversized neon grass strips.
  box(950,.4,950,mat('Suelo_Urbano','#9e9a86'),0,-.43,0);
  const roadBase=maps.road?new THREE.MeshStandardMaterial({map:maps.road,normalMap:maps.roadNormal,roughnessMap:maps.roadRough,roughness:.95,normalScale:new THREE.Vector2(.3,.3)}):mat('Asfalto','#747574');
  for(const n of world.roads){
    for(const horizontal of [false,true]){
      const m=roadBase.clone();if(m.map)m.map=tileMap(m.map,horizontal?21.7:.5,horizontal?.5:21.7);
      if(m.normalMap)m.normalMap=tileMap(m.normalMap,horizontal?21.7:.5,horizontal?.5:21.7);
      if(m.roughnessMap)m.roughnessMap=tileMap(m.roughnessMap,horizontal?21.7:.5,horizontal?.5:21.7);
      box(horizontal?districtSpan:15,.1,horizontal?15:districtSpan,m,horizontal?0:n,-.06,horizontal?n:0);
    }
    for(let p=-districtLimit+5;p<districtLimit;p+=12){if(world.roads.some(r=>Math.abs(r-p)<14))continue;
      box(.12,.015,4,cream,n,.012,p);box(4,.015,.12,cream,p,.018,n);
    }
  }
  for(const x of world.roads)for(const z of world.roads){
    for(let k=-3;k<=3;k++){box(1,.025,3,cream,x+k*1.8,.045,z+10.5);box(3,.025,1,cream,x-10.5,.05,z+k*1.8);}
  }
  // Traffic lights and stop lines make the junctions readable from the road.
  const signalPost=mat('Semaforo_Poste','#27383b',{metalness:.45,roughness:.55});
  const signalBody=mat('Semaforo_Caja','#222c2b',{roughness:.6});
  const redLight=mat('Semaforo_Rojo','#d53025',{emissive:'#a51610',emissiveIntensity:.65});
  const amberLight=mat('Semaforo_Ambar','#f5b526',{emissive:'#dc8709',emissiveIntensity:.35});
  const greenLight=mat('Semaforo_Verde','#36a663',{emissive:'#15874a',emissiveIntensity:.45});
  const roadPaint=mat('Pintura_Calle','#ece3c9',{roughness:.95});
  for(const x of world.roads)for(const z of world.roads){
    for(const side of [-1,1]){
      box(14,.025,.28,roadPaint,x,.065,z+side*14);
      box(.28,.025,14,roadPaint,x+side*14,.065,z);
      const px=x+side*10.1,pz=z+side*10.1;
      column(.11,4.4,signalPost,px,2.2,pz);
      box(.55,1.25,.45,signalBody,px,4.05,pz);
      for(const [dy,light] of [[.4,redLight],[0,amberLight],[-.4,greenLight]]){
        box(.28,.25,.06,light,px,4.05+dy,pz-side*.25);
        box(.06,.25,.28,light,px-side*.3,4.05+dy,pz);
      }
    }
  }
  // Parcel outlines, curbs and close-set building frontage establish a real street scale.
  for(let x=-districtLimit+75;x<=districtLimit-75;x+=100)for(let z=-districtLimit+75;z<=districtLimit-75;z+=100){
    if(x===-150)continue;
    box(84,.25,84,concrete,x,.06,z);
    for(const s of [-1,1]){box(84,.24,.35,stoneCap,x,.12,z+s*42);box(.35,.24,84,stoneCap,x+s*42,.12,z);}
  }
  // Readable street furniture and asphalt details along the selected corridor.
  const asphaltPatch=mat('Asfalto_Reparacion','#444a49',{roughness:.98});
  const drain=mat('Sumidero_Hierro','#303b3b',{metalness:.25,roughness:.82});
  const curbPaint=mat('Cordon_Amarillo','#d5a63d',{roughness:.9});
  for(let z=35;z<=275;z+=30){
    if(world.roads.some(r=>Math.abs(r-z)<18))continue;
    for(const side of [-1,1]){
      box(.22,.035,10,curbPaint,-100+side*7.45,.08,z);
      box(.52,.025,1.25,drain,-100+side*6.75,.045,z+7);
      for(let k=-2;k<=2;k++)box(.39,.01,.05,cream,-100+side*6.75,.062,z+7+k*.2);
    }
    box(1.6,.015,2.6,asphaltPatch,-100+(Math.round(z/30)%2?2.7:-2.7),.017,z+1);
  }
  // Repeated poles share materials and are merged with the architecture.
  // A small moving pool of real lights in premium.js illuminates the closest lamps.
  const lampMetal=mat('Farola_Poste','#37454a',{metalness:.5,roughness:.55});
  const lampBulb=mat('Farola_Luz','#f4dfad',{emissive:'#000000',emissiveIntensity:0});
  for(const road of world.roads)for(let z=-districtLimit+75;z<=districtLimit-75;z+=100)for(const side of [-1,1]){
    const x=road+side*10.5;
    column(.12,6.4,lampMetal,x,3.2,z);
    box(2.25,.14,.14,lampMetal,x-side*1.05,6.35,z);
    box(.9,.18,.52,lampMetal,x-side*2,6.28,z);
    box(.68,.07,.38,lampBulb,x-side*2,6.16,z);
    streetLamps.push({x:x-side*2,y:6,z});
  }
  // Calicanto walls with visible depth, capped edges, water and short street bridges.
  const cx=world.canalX;
  const water=mat('Agua_La_Canada','#587c70',{roughness:.22,metalness:.35,envMapIntensity:1.1});
  const waterMesh=box(12,.06,districtSpan,water,cx,-2.3,0);waterMesh.name='Arroyo_La_Canada';
  for(const s of [-1,1]){
    const m=limestone.clone();if(m.map)m.map=tileMap(m.map,130,1);if(m.bumpMap)m.bumpMap=m.map;
    // Leave visible openings aligned with the actual crossing at every road.
    let edge=-districtLimit-5;
    for(const road of [...world.roads].sort((a,b)=>a-b)){
      const end=Math.min(districtLimit+5,road-7.7);
      if(end>edge){
        const length=end-edge,mid=(edge+end)/2;
        box(1.6,3.6,length,m,cx+s*7.1,-.9,mid);
        box(2,.30,length,stoneCap,cx+s*7.1,1.03,mid);
        box(s<0?13:3,.28,length,concrete,cx+s*(s<0?15:9.5),.05,mid);
        canalWallSegments.push({side:s,from:edge,to:end});
      }
      edge=Math.max(edge,road+7.7);
    }
    if(edge<districtLimit+5){const length=districtLimit+5-edge,mid=(edge+districtLimit+5)/2;
      box(1.6,3.6,length,m,cx+s*7.1,-.9,mid);box(2,.30,length,stoneCap,cx+s*7.1,1.03,mid);
      box(s<0?13:3,.28,length,concrete,cx+s*(s<0?15:9.5),.05,mid);canalWallSegments.push({side:s,from:edge,to:districtLimit+5});
    }
  }
  for(const z of world.roads){
    box(23,.45,15,roadBase,cx,-.09,z);
    for(const s of [-1,1]){
      const rail=faceGroup(cx,.1,z+s*8,0);
      for(let k=-10;k<=10;k+=5){box(.65,1.12,.7,limestone,k,.55,0,rail,.03);box(.85,.16,.9,stoneCap,k,1.18,0,rail,.03);}
      beam([-10,1.02,0],[10,1.02,0],.045,iron,rail);
      for(let k=-9.4;k<10;k+=.55)beam([k,.18,0],[k,1.02,0],.022,iron,rail);
    }
  }
  function apartment(b){
    if(Math.abs(b.x-cx)<36){
      // The original city is detached in the pilot; discarded buildings must
      // not leave invisible solid boxes on the banks of La Cañada.
      for(let i=world.colliders.length-1;i>=0;i--){const c=world.colliders[i];if(!c.originalArt&&c.x===b.x&&c.z===b.z)world.colliders.splice(i,1);}
      return;
    }
    const w=b.w<40?b.w+6:b.w,d=b.d<40?b.d+6:b.d,h=Math.max(9,b.h),g=faceGroup(b.x,0,b.z,0);
    g.name='Edificio_'+b.x+'_'+b.z;
    const paints=['#d6b081','#d6c6a5','#bd775a','#71a798','#bfad8e','#b8b7a2'];
    const color=paints[Math.abs(Math.round(b.x+b.z))%paints.length],detailed=Math.hypot(b.x+100,b.z-130)<115;
    const painted=detailed?mat('Revoque_'+color,color,{map:maps.stucco,bumpMap:maps.stucco,bumpScale:.018}):distantFacade(color,h,(Math.abs(Math.round(b.x*3+b.z))%4));
    box(w,h,d,painted,0,h/2,0,g);
    box(w+.45,.3,d+.45,trim,0,3.65,0,g);box(w+.6,.30,d+.6,cream,0,h+.15,0,g);
      const faces=[[Math.PI,w,0,-d/2-.05],[0,w,0,d/2+.05],[-Math.PI/2,d,-w/2-.05,0],[Math.PI/2,d,w/2+.05,0]];
    for(const [rot,width,xx,zz] of faces){
      const face=faceGroup(xx,0,zz,rot,g);
      if(!detailed){
        // Projecting slabs and railings break up the flat skyline while the
        // facade texture keeps windows and interiors inexpensive to render.
        if(h>16&&Math.abs(Math.round(b.x/36)+Math.round(b.z/36))%3===0){
          const balconyWidth=width*.72;
          for(let y=7.2;y<h-2;y+=7.2){
            box(balconyWidth,.17,1.1,cream,0,y,.56,face);
            box(balconyWidth,.08,.08,iron,0,y+1.05,1.08,face);
            for(let x=-balconyWidth/2;x<=balconyWidth/2;x+=2.5)box(.07,1.0,.07,iron,x,y+.55,1.08,face);
          }
        }
        cornice(width,h,.1,face);continue;
      }
      const count=Math.max(2,Math.floor(width/5)),bay=width/count;
      for(let i=0;i<count;i++){
        const x=(i-(count-1)/2)*bay;
        if(i===Math.floor(count/2)){box(2.2,3,.12,shadow,x,1.6,.08,face);for(const s of [-1,1])box(.1,3,.20,wood,x+s*1.05,1.6,.2,face);box(2.5,.2,.6,cream,x,3.25,.2,face);}
        else{box(bay-.8,2.6,.12,glass,x,1.65,.10,face);box(.1,2.6,.2,iron,x,1.65,.18,face);}
        for(let y=5.4;y<h-1;y+=3.6){
          const hasBalcony=h>15&&(i%2===0);window(x,y,.08,Math.min(2.25,bay-1.3),2.15,face,{balcony:hasBalcony});
          if(hasBalcony&&((i+Math.round(y))%3===0)){
            box(1.0,.25,.3,roofMat,x,y-.92,1.05,face);
            for(const dx of [-.3,0,.3])box(.2,.32,.2,green,x+dx,y-.68,1.05,face);
          }
          if(!hasBalcony&&((i+Math.round(y))%4===0)){
            box(.75,.48,.35,cream,x+1.3,y-.7,.34,face);box(.52,.3,.02,iron,x+1.3,y-.7,.53,face);
          }
        }
      }
      // A lived-in ground floor: recessed entrances, shop fronts and awnings.
      // The detail is limited to the walkable Güemes / La Cañada blocks.
      const shopNames=['CAFÉ DE BARRIO','ALMACÉN','PANADERÍA','KIOSCO'];
      for(let i=0;i<count;i++){
        if(i===Math.floor(count/2))continue;
        const x=(i-(count-1)/2)*bay,sw=Math.max(2,bay-1.15);
        box(sw,2.5,.05,shadow,x,1.7,.23,face);
        box(sw-.2,2.25,.08,glass,x,1.72,.28,face);
        for(const side of [-1,1])box(.09,2.5,.18,iron,x+side*(sw/2-.06),1.7,.34,face);
        box(.08,2.25,.19,iron,x,1.72,.35,face);
        box(sw,.12,.3,wood,x,2.9,.36,face);
        const color=i%2?mat('Toldo_Verde_Guemes','#356f64'):mat('Toldo_Rojo_Guemes','#ad5142');
        const awning=box(sw,.10,1.35,color,x,3.38,.9,face);awning.rotation.x=-.16;
        for(let stripe=-sw/2+.25;stripe<sw/2;stripe+=.9){const strip=box(.3,.115,1.36,cream,x+stripe,3.4,.9,face);strip.rotation.x=-.16;}
        shopSign(shopNames[(i+Math.abs(Math.round(b.x+b.z)))%shopNames.length],sw,x,3.93,.3,face);
        box(sw,.18,.24,trim,x,.4,.38,face);
      }
      cornice(width,h,.1,face);
    }
    // Rooftop tanks, concrete service rooms and antenna silhouettes.
    box(3.2,2.2,3.8,painted,w*.2,h+1.2,-d*.2,g);column(1.1,2,mat('Tanque_Agua','#313b3e'),-w*.2,h+1.1,d*.18,g);beam([-w*.25,h,-d*.2],[-w*.25,h+5,-d*.2],.025,iron,g);
    const collider=world.colliders.find(c=>c.x===b.x&&c.z===b.z);if(collider){collider.w=w/2+.4;collider.d=d/2+.4;}
  }
  world.buildings.forEach(apartment);
  // Roofed commercial gallery: both ends open directly to the street. Stores,
  // lights and flooring remain static; the market furniture can be smashed.
  for(const gallery of world.galleries||[]){
    const g=faceGroup(gallery.x,0,gallery.z,0);g.name='Galeria_Transitable';
    const length=gallery.length;
    box(length,.1,20,concrete,0,.08,0,g);
    box(length,.5,22,cream,0,7.3,0,g);
    for(const side of [-1,1]){
      box(length,7,1.2,ivory,0,3.5,side*10,g);
      for(let x=-30;x<=30;x+=12){
        box(10,3.5,.1,glass,x,2.2,side*9.36,g);
        box(.15,3.6,.2,iron,x,2.2,side*9.25,g);
        box(10,.18,.25,wood,x,4.1,side*9.22,g);
        const face=faceGroup(x,0,side*9.2,side<0?0:Math.PI,g);
        shopSign(['CAFÉ DE BARRIO','PANADERÍA','ALMACÉN','KIOSCO'][(Math.round((x+30)/12)+(side>0?1:0))%4],9,0,5.25,0,face);
      }
    }
    for(let x=-31;x<=31;x+=12)box(2,.08,1.2,mat('Galeria_Luz','#fff1c9',{emissive:'#ffe3a0',emissiveIntensity:.7}),x,7,0,g);
    for(const side of [-1,1]){
      box(.5,7,1.2,trim,side*length/2,3.5,-10,g);box(.5,7,1.2,trim,side*length/2,3.5,10,g);
      const face=faceGroup(side*(length/2+.3),0,0,side*Math.PI/2,g);
      sign(gallery.name,0,6.1,0,17,'#215b55','#fff0b9',0,face);
    }
  }

  function foodShop(shop,index){
    const [px,pz]=shop.pickup,front=px+7.7,g=faceGroup(front+12,0,pz,-Math.PI/2);g.name='Local_'+shop.name;
    const paint=mat('Local_Color_'+index,['#c8a26f','#497e72','#ad6a4f','#dbbc84'][index]);
    box(27,7.5,24,paint,0,3.75,0,g);box(27.6,.45,24.5,cream,0,7.5,0,g);
    const face=faceGroup(0,0,12.04,0,g);
    for(const x of [-8,0,8]){
      archFrame(x,.3,.05,5.4,4.8,face);
      roundArch(x,.4,.12,5.05,4.45,glass,face,.08);
      box(.1,3.8,.14,wood,x,2.4,.3,face);box(5.2,.1,.15,wood,x,2.1,.3,face);
    }
    sign(shop.name,0,6.3,.26,25,'#643c2b','#ffe8b0',0,face);
    // Fabric awnings have rounded front edges and restrained cream stripes.
    const canvas=mat('Toldo_Burdeos','#963e35',{roughness:.95}),clothCream=mat('Toldo_Crema','#ecdbb3',{roughness:.95});
    for(let x=-12;x<13;x+=1.1){const a=box(1.05,.07,2.8,Math.round((x+12)/1.1)%3?canvas:clothCream,x,4.9,1.5,face);a.rotation.x=.12;box(1.05,.3,.08,canvas,x,4.58,2.87,face);}
    // Spanish roof tiles, AC grilles and lit display windows add real silhouettes.
    const roof=box(28,.25,25,roofMat,0,7.8,0,g);roof.rotation.z=.035;
    for(let x=-13;x<=13;x+=.55){const t=add(new THREE.CylinderGeometry(.18,.18,24,8,1,true,0,Math.PI),roofMat,x,8,0,g);t.rotation.x=Math.PI/2;}
    box(23,1,1.1,wood,0,1.2,10.8,g);
    for(const x of [-8,0,8]){box(2.6,.25,1.4,cream,x,1.8,10.6,g);column(.18,.55,cream,x,2.2,10.5,g);}
    const lampMat=mat('Luz_Interior','#f8d389',{emissive:'#f4c775',emissiveIntensity:1.2});for(const x of [-8,8])column(.4,.08,lampMat,x,4.1,9.8,g);
    const collider=world.colliders.find(c=>c.x===shop.mesh.position.x&&c.z===shop.mesh.position.z);if(collider){collider.x=front+12;collider.w=12.4;collider.d=14;}
    shop.clerk.mesh.position.x=front-1.8;
    // A small painted wall sign on the return is readable from the road.
    sign('PIZZA · LOMITOS · CAFÉ',-13.62,4,0,21,'#46665b','#f4dfb0',-Math.PI/2,g);
  }
  world.restaurants.forEach(foodShop);
  // Plaza España and the fountain by Patio Olmos are adapted to the grid;
  // paths remain open to traffic, with a narrow solid fountain median.
  const plaza=faceGroup(50,0,350,0);plaza.name='Plaza_Espana';
  column(29,.22,concrete,0,.08,0,plaza);column(23,.14,green,0,.2,0,plaza);
  for(let a=0;a<Math.PI*2;a+=Math.PI/6){const x=Math.cos(a)*25,z=Math.sin(a)*25;box(3,.2,.8,trim,x,.35,z,plaza);}
  column(2.8,2.2,cream,0,1.25,0,plaza);column(1.5,3,trim,0,3.5,0,plaza);
  sign('PLAZA ESPAÑA',0,2,-29,22,'#2d6055','#fff0bc',Math.PI,plaza);
  const fountain=faceGroup(0,0,45,0);fountain.name='Fuente_Patio_Olmos';
  const waterMat=mat('Fuente_Agua','#74b7cd',{roughness:.22,metalness:.18});
  box(4,.48,14,trim,0,.25,0,fountain);box(3.5,.1,13.4,waterMat,0,.52,0,fountain);
  for(const z of [-5,-2.5,0,2.5,5]){column(.13,2.3,waterMat,0,1.7,z,fountain);column(.35,.13,cream,0,.62,z,fountain);}
  sign('AV. VÉLEZ SARSFIELD',-7,3,46,12,'#285447','#f4edcb',Math.PI/2);
  sign('BV. SAN JUAN',-12,3,-8,12,'#285447','#f4edcb',0);
  sign('AV. GENERAL PAZ',-8,3,-120,14,'#285447','#f4edcb',Math.PI/2);
  sign('AV. HIPÓLITO YRIGOYEN',-8,3,275,18,'#285447','#f4edcb',Math.PI/2);
  // Patio Olmos is modelled as a landmark, including the chamfered entrance,
  // paired columns, arched windows, red/blue banners and balustrade.
  const olmos=faceGroup(-50,0,50,0);olmos.name='Patio_Olmos';
  box(61,13.6,45,ivory,0,6.8,0,olmos);
  for(const [rot,w,x,z] of [[0,61,0,22.6],[-Math.PI/2,45,-30.6,0]]){
    const face=faceGroup(x,0,z,rot,olmos);
    for(let xx=-w/2+4;xx<w/2-1;xx+=7.6){
      archFrame(xx,.35,.06,4.6,5.4,face);roundArch(xx,.45,.13,4.25,5.1,glass,face,.06);
      archFrame(xx,7.5,.06,4.2,4.5,face);roundArch(xx,7.6,.13,3.9,4.2,glass,face,.05);
      for(const s of [-1,1]){column(.25,5.8,cream,xx+s*3.2,9.9,.4,face,.22);box(.85,.25,.85,cream,xx+s*3.2,12.8,.4,face);}
    }
    cornice(w,6.8,.15,face);cornice(w,13.55,.16,face);
    for(let xx=-w/2+.8;xx<w/2;xx+=1.8){column(.10,.9,cream,xx,14.7,.3,face,.07);box(.3,.12,.38,cream,xx,15.2,.3,face);}
    box(w+1,.2,.75,cream,0,15.4,.3,face);
  }
  const entrance=faceGroup(-26,0,18,-Math.PI/4,olmos);
  box(14,15,4,ivory,0,7.5,0,entrance);
  archFrame(0,.35,2.06,5.3,7,entrance);roundArch(0,.45,2.15,4.9,6.6,glass,entrance,.08);
  for(const x of [-5.3,-3.7,3.7,5.3]){column(.36,9.3,cream,x,5.1,2.5,entrance,.29);box(1.05,.35,1.1,cream,x,9.9,2.5,entrance);}
  cornice(15,10.3,2.4,entrance);
  const pediment=new THREE.Shape();pediment.moveTo(-8,0);pediment.lineTo(8,0);pediment.lineTo(0,4);pediment.closePath();add(new THREE.ExtrudeGeometry(pediment,{depth:.7,bevelEnabled:true,bevelSize:.12,bevelThickness:.1,bevelSegments:2}),ivory,0,11.7,2.1,entrance);
  for(let i=0;i<4;i++)box(17+i*.6,.18,2.2,stoneCap,0,.15-i*.08,3+i*.45,entrance);
  for(const x of [-18,18]){
    sign('PATIO',x,9.7,23.04,5.2,x<0?'#a93137':'#285e81','#fff0d1',0,olmos);
    sign('OLMOS',x,8.5,23.04,5.2,x<0?'#a93137':'#285e81','#fff0d1',0,olmos);
  }
  // Small street plates replace giant floating billboards.
  for(const [text,x,z,rot] of [['BV. SAN JUAN',-91,7,0],['MARCELO T. DE ALVEAR',-109,110,-Math.PI/2],['LA CAÑADA',cx-7,8,0]]){
    column(.045,3.4,iron,x,1.7,z);sign(text,x,3.1,z+.03,3.3,'#244b38','#f6e9cb',rot);
  }
  // Contemporary Córdoba skyline: no empty horizon beyond the pilot boundary.
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,r=390+rand()*90,x=Math.cos(a)*r,z=Math.sin(a)*r,h=30+rand()*55;
    box(22+rand()*14,h,24+rand()*14,mat('Fondo_'+i%3,['#baac95','#a0afa8','#c0b4a1'][i%3]),x,h/2,z);
  }
  buildCordobaLandmarks({world,root,mat,box,column,beam,add,faceGroup,archFrame,roundArch,cornice,window});
  root.userData={...root.userData,originalArchitecture:true,arcadeScale:true};
  return {root,foliage,materials:cache,waterMesh,streetLamps,canalWallSegments};
}

export function batchStaticArchitecture(root){
  root.updateWorldMatrix(true,true);const groups=new Map(),inverse=root.matrixWorld.clone().invert();
  root.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||Array.isArray(m.material))return;const key=m.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);});
  for(const meshes of groups.values()){if(meshes.length<2)continue;
    const geos=meshes.map(m=>{let g=m.geometry.clone();if(g.index){const n=g.toNonIndexed();g.dispose();g=n;}g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));return g;});
    const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!geometry)continue;
    const batch=new THREE.Mesh(geometry,meshes[0].material);batch.castShadow=true;batch.receiveShadow=true;meshes.forEach(m=>m.parent.remove(m));root.add(batch);
  }
}
