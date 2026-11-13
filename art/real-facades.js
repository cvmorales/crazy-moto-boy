import * as THREE from '../vendor/three.module.js';
import {nearestSegment} from '../real-network.js?v=0.35';

// Repeated street-level details share geometry and materials for mobile devices.
export function addRealFacades(root,world){
  const group=new THREE.Group();group.name='Comercios_y_Galerias_Reales';root.add(group);
  const box=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const materials=[new THREE.MeshStandardMaterial({color:'#305766',roughness:.5}),new THREE.MeshStandardMaterial({color:'#f5ead0'}),...['#b34835','#367c6e','#d49b32','#475d89'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}))];
  const parts=materials.map(()=>[]);
  function add(k,x,y,z,w,h,d,angle){parts[k].push({x,y,z,w,h,d,angle});}
  let storefronts=0;const signs=[[],[],[],[]];
  for(const b of world.buildings){
    if(b.galleryWing||b.name||!b.infill)continue;
    const x=(b.bounds.minX+b.bounds.maxX)/2,z=(b.bounds.minZ+b.bounds.maxZ)/2,s=nearestSegment(world.network,{x,z});if(!s||s.distance>48)continue;
    const dx=s.point.x-x,dz=s.point.z-z,alongX=Math.abs(dx)>Math.abs(dz),side=Math.sign(alongX?dx:dz)||1;
    const fx=x+(alongX?side*6.04:0),fz=z+(!alongX?side*6.04:0),angle=alongX?Math.PI/2:0;
    add(0,fx,1.55,fz,8.4,2.8,.10,angle);add(1,fx,3.12,fz,9,.23,.15,angle);
    for(const t of [-4,-1.4,1.4,4]){const px=fx+(alongX?0:t),pz=fz+(alongX?t:0);add(1,px,1.55,pz,.10,2.8,.16,angle);}
    const ox=alongX?side*.46:0,oz=alongX?0:side*.46;
    add(2+storefronts%4,fx+ox,3.35,fz+oz,9,.20,1,angle);
    signs[storefronts%4].push({x:fx+(alongX?side*.12:0),z:fz+(!alongX?side*.12:0),angle});
    // Cream stripes make the awning read at a distance.
    for(let j=-3;j<=3;j+=2){const tx=alongX?0:j,tz=alongX?j:0;add(1,fx+ox+tx,3.47,fz+oz+tz,.72,.025,1,angle);}
    // Projecting balconies, slab edges and railings give the upper storeys
    // real depth rather than painting every detail into one flat texture.
    for(let floor=1;floor<Math.min(5,Math.floor((b.height-2)/3.2));floor++){
      const y=3.8+floor*3.1,bx=fx+(alongX?side*.42:0),bz=fz+(!alongX?side*.42:0);
      add(1,bx,y,bz,8,.18,.95,angle);
      const rx=fx+(alongX?side*.83:0),rz=fz+(!alongX?side*.83:0);add(0,rx,y+.9,rz,8,.10,.10,angle);
      for(let j=-3;j<=3;j++)add(0,rx+(alongX?0:j),y+.48,rz+(alongX?j:0),.065,.8,.08,angle);
    }
    storefronts++;
  }
  parts.forEach((items,i)=>{if(!items.length)return;const mesh=new THREE.InstancedMesh(box,materials[i],items.length);mesh.name='Frentes_Comerciales_'+i;items.forEach((p,n)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);});group.add(mesh);});
  ['CAFÉ','MODA','PANADERÍA','ALMACÉN'].forEach((name,index)=>{const c=document.createElement('canvas');c.width=256;c.height=64;const q=c.getContext('2d');q.fillStyle=['#69382f','#384969','#865833','#2d5b4c'][index];q.fillRect(0,0,256,64);q.fillStyle='#fff1cc';q.textAlign='center';q.textBaseline='middle';q.font='bold 32px sans-serif';q.fillText(name,128,32,245);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4,.65),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),signs[index].length);m.name='Carteles_De_Locales';signs[index].forEach((p,i)=>{dummy.position.set(p.x,3.85,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});group.add(m);
  });
  for(const gallery of world.galleries){
    const arcade=new THREE.Group();arcade.name='Galeria_Entrable_Real';arcade.position.set(gallery.x,0,gallery.z);if(gallery.axis==='z')arcade.rotation.y=Math.PI/2;else if(gallery.axis==='path')arcade.rotation.y=-Math.atan2(gallery.dz,gallery.dx);group.add(arcade);const length=gallery.length||12;
    const place=(w,h,d,x,y,z,mat)=>{const m=new THREE.Mesh(box,mat);m.scale.set(w,h,d);m.position.set(x,y,z);arcade.add(m);};
    const roof=new THREE.MeshStandardMaterial({color:'#d4c5a1',roughness:.9}),glass=new THREE.MeshStandardMaterial({color:'#75b6c1',transparent:true,opacity:.6,side:THREE.DoubleSide}),accent=new THREE.MeshStandardMaterial({color:'#b04f39'});
    place(length,.18,6.3,0,4.1,0,glass);for(let x=-length/2+.3;x<length/2;x+=5.7)place(.16,.2,6.4,x,4.15,0,roof);
    for(const z of [-3.1,3.1]){place(length,.35,.22,0,3.6,z,roof);for(let x=-length/2+2;x<length/2;x+=4){place(2.7,2.3,.10,x,1.4,z,materials[0]);place(3,.22,.5,x,2.8,z,accent);}}
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d');c.fillStyle='#245c56';c.fillRect(0,0,512,96);c.fillStyle='#fff3ca';c.textAlign='center';c.textBaseline='middle';c.font='bold 35px sans-serif';c.fillText(gallery.name,256,48,490);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.2,1),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));sign.rotation.y=Math.PI/2;sign.position.set(length/2-.1,4.65,0);arcade.add(sign);const sign2=sign.clone();sign2.position.x=-length/2+.1;arcade.add(sign2);
  }
  group.userData.storefronts=storefronts;group.userData.galleries=world.galleries.length;
}
