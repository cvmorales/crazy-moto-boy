import * as THREE from '../vendor/three.module.js';
import {sidewalkTop} from '../real-world.js?v=0.39';

// Repeated street-level details share geometry and materials for mobile devices.
export function addRealFacades(root,world){
  const group=new THREE.Group();group.name='Comercios_y_Galerias_Reales';root.add(group);
  const box=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const materials=[new THREE.MeshStandardMaterial({color:'#305766',roughness:.5}),new THREE.MeshStandardMaterial({color:'#f5ead0'}),...['#b34835','#367c6e','#d49b32','#475d89','#baa48b','#a66754','#d7c8a4','#607274','#353e3e','#a39e8d'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}))];
  const parts=materials.map(()=>[]);
  function add(k,x,y,z,w,h,d,angle){parts[k].push({x,y,z,w,h,d,angle});}
  const labels=['CAFÉ','MODA','PANADERÍA','ALMACÉN','LOMITOS','LIBRERÍA','FLORERÍA','HELADOS'];const signs=labels.map(()=>[]),displays=Array.from({length:4},()=>[]);
  let streetShops=0;
  for(const [i,row] of world.commercialRows.entries()){
    const {x,z,dx,dz,nx,nz,length,depth,side}=row,angle=-Math.atan2(dz,dx)+(side>0?Math.PI:0),count=Math.round(length/5.1);
    const part=(mat,a,y,b,w,h,d)=>add(mat,x+dx*a+nx*b,y+sidewalkTop,z+dz*a+nz*b,w,h,d,angle);
    const shell=6+i%4,upper=i%4!==0,top=upper?6.7:3.95;
    part(shell,0,top/2,depth/2,length,top,depth);part(11,0,top+.05,depth/2,length+.15,.18,depth+.15);
    part(1,0,3.61,0,length,.21,.19);part(10,0,.28,0,length,.54,.14);
    for(let j=0;j<count;j++){
      const a=(j-(count-1)/2)*5.1,k=(i*3+j)%labels.length,accent=2+k%4;
      part(10,a,1.57,-.055,4.63,2.74,.19);part(0,a-.62,1.6,-.16,2.87,2.3,.05);part(0,a+1.37,1.30,-.16,.94,2.58,.05);
      part(1,a+1.37,.03,-.18,1.07,.06,.54);
      displays[k%4].push({x:x+dx*(a-.62)-nx*.193,z:z+dz*(a-.62)-nz*.193,angle});
      for(const t of [-2.09,-.61,.82,1.91])part(1,a+t,1.59,-.20,.07,2.45,.07);
      part(1,a-.61,2.21,-.20,2.95,.065,.09);part(1,a+1.62,1.16,-.23,.06,.28,.08);
      part(accent,a,3.15,-.64,4.76,.13,1.22);part(accent,a,3.04,-1.2,4.76,.2,.09);
      for(let stripe=-1.9;stripe<=1.91;stripe+=.95)part(1,a+stripe,3.23,-.64,.32,.021,1.22);
      part(1,a,3.65,-.16,3.65,.75,.12);signs[k].push({x:x+dx*a-nx*.24,z:z+dz*a-nz*.24,angle,y:3.65+sidewalkTop});
      if(upper){for(const t of [-1.18,1.18]){part(1,a+t,5.28,-.05,1.12,1.61,.12);part(0,a+t,5.28,-.125,.92,1.37,.06);part(1,a+t,4.53,-.19,1.31,.12,.37);}
        if(i%3!==0){part(1,a,4.47,-.38,3.6,.16,.92);part(10,a,5.26,-.83,3.6,.08,.08);for(const t of [-1.7,-1.1,-.55,0,.55,1.1,1.7])part(10,a+t,4.9,-.83,.06,.72,.07);}
      }
      streetShops++;
    }
  }
  parts.forEach((items,i)=>{if(!items.length)return;const mesh=new THREE.InstancedMesh(box,materials[i],items.length);mesh.name='Frentes_Comerciales_'+i;mesh.castShadow=i>=6&&i<=9;mesh.receiveShadow=true;items.forEach((p,n)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);});group.add(mesh);});
  displays.forEach((items,k)=>{
    if(!items.length)return;
    const c=document.createElement('canvas');c.width=128;c.height=96;const q=c.getContext('2d');q.fillStyle='#3b3735';q.fillRect(0,0,128,96);q.fillStyle='#a08462';q.fillRect(7,7,114,80);
    if(k===1){q.fillStyle='#e5d7b5';q.fillRect(16,21,96,3);for(let x=21,i=0;x<109;x+=20,i++){q.fillStyle=['#b35442','#3a6269','#ebca8b','#6c514d'][i%4];q.fillRect(x,28,16,27+i%2*13);}}
    else for(let shelf=0;shelf<2;shelf++){q.fillStyle='#392b28';q.fillRect(10,53+shelf*26,108,4);for(let x=15,i=0;x<113;x+=13,i++){q.fillStyle=['#e3ad65','#795440','#a1aa7a','#ead3a0'][(i+k+shelf)%4];q.fillRect(x,37+shelf*26+i%3*2,9,16-i%3*2);}}
    q.fillStyle='rgba(92,166,184,.27)';q.fillRect(0,0,128,96);q.fillStyle='rgba(218,237,235,.23)';q.beginPath();q.moveTo(8,0);q.lineTo(46,0);q.lineTo(18,96);q.lineTo(0,96);q.fill();
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(2.84,2.25),new THREE.MeshStandardMaterial({map,roughness:.48,emissiveMap:map,emissive:'#a89473',emissiveIntensity:.32}),items.length);mesh.name='Vidrieras_Con_Exhibicion';
    items.forEach((p,i)=>{dummy.position.set(p.x,1.6+sidewalkTop,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});group.add(mesh);
  });
  labels.forEach((name,index)=>{if(!signs[index].length)return;const c=document.createElement('canvas');c.width=256;c.height=64;const q=c.getContext('2d');q.fillStyle=['#69382f','#384969','#865833','#2d5b4c'][index%4];q.fillRect(0,0,256,64);q.strokeStyle='#e5c887';q.strokeRect(4,4,248,56);q.fillStyle='#fff1cc';q.textAlign='center';q.textBaseline='middle';q.font='bold 32px sans-serif';q.fillText(name,128,32,245);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4,.65),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),signs[index].length);m.name='Carteles_De_Locales';signs[index].forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});group.add(m);
  });
  const roof=new THREE.MeshStandardMaterial({color:'#d4c5a1',roughness:.9}),glass=new THREE.MeshStandardMaterial({color:'#75b6c1',transparent:true,opacity:.6,side:THREE.DoubleSide}),accent=new THREE.MeshStandardMaterial({color:'#b04f39'});
  for(const gallery of world.galleries){
    const arcade=new THREE.Group();arcade.name='Galeria_Entrable_Real';arcade.position.set(gallery.x,0,gallery.z);if(gallery.axis==='z')arcade.rotation.y=Math.PI/2;else if(gallery.axis==='path')arcade.rotation.y=-Math.atan2(gallery.dz,gallery.dx);group.add(arcade);const length=gallery.length||12;
    const place=(w,h,d,x,y,z,mat)=>{const m=new THREE.Mesh(box,mat);m.scale.set(w,h,d);m.position.set(x,y,z);arcade.add(m);};
    place(length,.06,6.2,0,.03,0,materials[11]);place(length,.18,6.3,0,4.1,0,glass);for(let x=-length/2+.3;x<length/2;x+=5.7)place(.16,.2,6.4,x,4.15,0,roof);
    for(const z of [-3.1,3.1]){place(length,.35,.22,0,3.6,z,roof);for(let x=-length/2+2;x<length/2;x+=4){place(.16,3.8,.16,x-1.9,1.9,z,materials[10]);place(2.7,2.3,.10,x,1.4,z,materials[0]);place(3,.22,.5,x,2.8,z,accent);place(2.9,.09,.65,x,3.88,z*.68,materials[1]);}}
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d');c.fillStyle='#245c56';c.fillRect(0,0,512,96);c.fillStyle='#fff3ca';c.textAlign='center';c.textBaseline='middle';c.font='bold 35px sans-serif';c.fillText(gallery.name,256,48,490);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.2,1),new THREE.MeshBasicMaterial({map:tex}));sign.rotation.y=Math.PI/2;sign.position.set(length/2-.1,4.65,0);arcade.add(sign);const sign2=sign.clone();sign2.position.x=-length/2+.1;sign2.rotation.y=-Math.PI/2;arcade.add(sign2);
  }
  group.userData.streetShops=streetShops;group.userData.galleries=world.galleries.length;
}
