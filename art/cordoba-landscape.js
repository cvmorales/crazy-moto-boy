import * as THREE from '../vendor/three.module.js';

export function createCanopyStreet(world,maps={}){
  const root=new THREE.Group();root.name='Tipas_La_Canada';let seed=1107;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const bark=new THREE.MeshStandardMaterial({color:'#72604c',map:maps.bark,roughness:.96,bumpMap:maps.bark,bumpScale:.04});
  let leafMap=null;
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=c.height=256;const p=c.getContext('2d');p.clearRect(0,0,256,256);
    p.strokeStyle='#6e7738';p.lineWidth=3;p.beginPath();p.moveTo(127,245);p.bezierCurveTo(116,155,139,89,127,15);p.stroke();
    for(let i=0;i<7;i++)for(const side of [-1,1]){
      const y=40+i*28,x=127+side*(30+i*.5);p.save();p.translate(x,y);p.rotate(-side*.4);p.fillStyle=['#50732f','#66843b','#759546','#4b7134'][i%4];
      p.beginPath();p.moveTo(0,-12);p.bezierCurveTo(side*25,-35,side*38,6,0,18);p.bezierCurveTo(-side*13,4,-side*12,-6,0,-12);p.fill();p.strokeStyle='#c1c88366';p.lineWidth=1;p.beginPath();p.moveTo(0,15);p.lineTo(side*12,-11);p.stroke();p.restore();
    }
    leafMap=new THREE.CanvasTexture(c);leafMap.colorSpace=THREE.SRGBColorSpace;
  }
  const leaves=new THREE.MeshStandardMaterial({map:leafMap,color:'#e2edbd',side:THREE.DoubleSide,alphaTest:.45,roughness:.9,transparent:false});
  leaves.name='Tipa_Hojas_Compuestas';
  const geo=new THREE.PlaneGeometry(1.7,1.7),matrices=[],colors=[];
  function branch(points,r){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,16,r,7,false),bark);m.castShadow=true;m.receiveShadow=true;root.add(m);}
  function tree(x,z,size=1){
    const lean=(rand()-.5)*1.2;
    branch([[x,0,z],[x+.2,2.7*size,z+.1],[x+lean,5.5*size,z-.1],[x+lean+.4,7.6*size,z]],.23*size);
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7,r=2.4+rand()*2;
      branch([[x+lean,4.5*size,z],[x+Math.cos(a)*r*.5,6.5*size,z+Math.sin(a)*r*.5],[x+Math.cos(a)*r,8*size,z+Math.sin(a)*r]],.10*size);
    }
    for(let i=0;i<360;i++){
      const a=rand()*Math.PI*2,r=Math.sqrt(rand())*6.3*size,y=8.2*size+(rand()-.5)*4*size;
      const o=new THREE.Object3D();o.position.set(x+Math.cos(a)*r,y,z+Math.sin(a)*r);
      o.rotation.set((rand()-.5)*2.8,rand()*Math.PI*2,(rand()-.5)*2);o.scale.setScalar((.8+rand()*.7)*size);o.updateMatrix();matrices.push(o.matrix.clone());colors.push(new THREE.Color().setHSL(.24+rand()*.045,.32+rand()*.16,.32+rand()*.19));
    }
  }
  for(let z=-285;z<310;z+=28){if(world.roads.some(n=>Math.abs(z-n)<17))continue;
    tree(world.canalX-12,z,1.0+rand()*.2);
    if(z%3)tree(world.canalX+9.1,z+4,.85+rand()*.15);
  }
  // Scattered smaller trees in side streets and the pedestrian square.
  for(const [x,z] of [[-14,90],[15,90],[83,85],[110,15],[115,85],[-285,112],[-12,-87],[86,-85]])tree(x,z,.72);
  const batch=new THREE.InstancedMesh(geo,leaves,matrices.length);matrices.forEach((m,i)=>{batch.setMatrixAt(i,m);batch.setColorAt(i,colors[i]);});batch.castShadow=true;batch.receiveShadow=true;batch.name='Follaje_Tipas';root.add(batch);
  return {root,leafMeshes:[batch],treeCount:Math.round(matrices.length/360)};
}
