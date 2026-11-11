// Original low-polygon character models: articulated limbs, shaped torsos,
// facial features and clothing, inspired by turn-of-the-century arcade modelling.
export function actorFactory(THREE,material) {
  const clothCache=new Map(),boneCache=new Map(),torsoCache=new Map();
  function cloth(color){
    if(clothCache.has(color))return clothCache.get(color);
    const c=document.createElement('canvas');c.width=c.height=64;const p=c.getContext('2d');
    p.fillStyle=color;p.fillRect(0,0,64,64);p.strokeStyle='#ffffff24';p.lineWidth=1;
    for(let i=3;i<64;i+=7){p.beginPath();p.moveTo(i,0);p.lineTo(i-2,64);p.stroke();}
    p.fillStyle='#00000028';p.fillRect(0,53,64,5);p.fillStyle='#ffffff30';p.fillRect(1,1,62,2);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;
    const m=new THREE.MeshLambertMaterial({map:t});clothCache.set(color,m);return m;
  }
  const geo={sphere:new THREE.SphereGeometry(1,12,8),hand:new THREE.SphereGeometry(1,8,6),box:new THREE.BoxGeometry(1,1,1)};
  const skinMat=material('#c78b62'),shoeMat=material('#e8e4d7'),darkMat=material('#1f2738');
  function ellipsoid(parent,x,y,z,sx,sy,sz,mat){const m=new THREE.Mesh(geo.sphere,typeof mat==='string'?material(mat):mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
  function cube(parent,x,y,z,sx,sy,sz,mat){const m=new THREE.Mesh(geo.box,typeof mat==='string'?material(mat):mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
  function bone(parent,a,b,r1,r2,mat,sides=8){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);
    const key=[r1,r2,d.length().toFixed(3),sides].join(':');
    if(!boneCache.has(key))boneCache.set(key,new THREE.CylinderGeometry(r2,r1,d.length(),sides));
    const m=new THREE.Mesh(boneCache.get(key),typeof mat==='string'?material(mat):mat);
    m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m;
  }
  function torso(parent,y,mat,scale=1){
    const key=y+':'+scale;
    if(torsoCache.has(key)){const m=new THREE.Mesh(torsoCache.get(key),mat);m.castShadow=true;parent.add(m);return m;}
    // Four body rings produce a waist, chest, shoulders and sloped neckline.
    const rings=[[0,.26,.16],[.25,.30,.18],[.63,.39,.18],[.76,.18,.14]],verts=[],indices=[];
    for(const [yy,w,d] of rings)for(const [x,z] of [[-w,-d],[w,-d],[w,d],[-w,d]])verts.push(x*scale,y+yy*scale,z*scale);
    for(let r=0;r<3;r++)for(let j=0;j<4;j++){const a=r*4+j,b=r*4+(j+1)%4,c=(r+1)*4+j,d=(r+1)*4+(j+1)%4;indices.push(a,b,c,b,d,c);}
    indices.push(0,2,1,0,3,2,12,13,14,12,14,15);
    for(let i=0;i<indices.length;i+=3){const swap=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=swap;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();
    const uv=[];for(let i=0;i<16;i++)uv.push((i%4)/3,Math.floor(i/4)/3);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    torsoCache.set(key,g);
    const m=new THREE.Mesh(g,mat);m.castShadow=true;parent.add(m);return m;
  }
  function face(parent,x,y,z,{hair='#422a20',skin=skinMat,cap=false}={}){
    const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);
    ellipsoid(group,0,0,0,.19,.25,.18,skin);
    ellipsoid(group,0,.15,-.04,.2,.14,.19,hair);
    ellipsoid(group,0,-.015,.175,.05,.065,.055,skin);
    for(const dx of [-.072,.072]){
      cube(group,dx,.045,.16,.065,.026,.018,'#f0e7dc');cube(group,dx,.045,.175,.025,.03,.012,'#263033');
      cube(group,dx,.085,.16,.067,.014,.018,hair);
      ellipsoid(group,dx<0?-.185:.185,-.015,0,.035,.065,.04,skin);
    }
    cube(group,0,-.11,.155,.075,.018,.018,'#82473b');
    if(cap){ellipsoid(group,0,.14,0,.207,.15,.2,'#e83c2a');cube(group,0,.13,.18,.35,.035,.2,'#d02a1e');}
    return group;
  }
  function pedestrian({shirt='#d7472c',pants='#2e527b',hair='#402a20',female=false,cap=false}={}){
    const root=new THREE.Group();root.userData.arcadeDynamic=true;
    const top=cloth(shirt),bottom=cloth(pants);
    torso(root,.93,top,.92);bone(root,[0,1.58,0],[0,1.72,0],.1,.095,skinMat);
    const head=face(root,0,1.91,0,{hair,cap});
    if(female)ellipsoid(head,0,.02,-.14,.21,.31,.12,hair);
    cube(root,0,.94,0,.48,.08,.31,'#28282e');cube(root,.03,.94,.17,.09,.07,.025,'#bdad7d');
    const legs=[];
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*.16,.94,0);root.add(leg);
      bone(leg,[0,0,0],[side*.02,-.42,.015],.13,.11,bottom);
      bone(leg,[side*.02,-.42,.015],[side*.025,-.82,.005],.105,.085,bottom);
      ellipsoid(leg,side*.025,-.84,.07,.12,.08,.22,shoeMat);
      cube(leg,side*.025,-.90,.07,.23,.035,.39,'#424748');legs.push(leg);
    }
    const arms=[];
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.34,1.51,0);root.add(arm);
      bone(arm,[0,0,0],[side*.075,-.3,0],.13,.105,top);
      bone(arm,[side*.075,-.3,0],[side*.09,-.59,.05],.085,.06,skinMat);
      ellipsoid(arm,side*.09,-.62,.05,.072,.1,.065,skinMat);arms.push(arm);
    }
    root.scale.setScalar(1.25);
    return {mesh:root,head,arm:arms[1],leftArm:arms[0],leftLeg:legs[0],rightLeg:legs[1]};
  }
  function rider({jacket='#184eae',helmet='#f5f2e5'}={}){
    const root=new THREE.Group(),top=cloth(jacket),jeans=cloth('#314b71');
    torso(root,1.42,top,1.05);
    bone(root,[0,2.2,0],[0,2.35,-.03],.12,.12,skinMat);
    const head=new THREE.Group();head.position.set(0,2.6,-.06);root.add(head);
    ellipsoid(head,0,0,0,.32,.36,.33,material(helmet,{shininess:75}));
    // Curved full-face visor and lower chin guard.
    const visor=new THREE.Mesh(new THREE.SphereGeometry(.335,12,5,Math.PI*1.2,Math.PI*.6,.85,1),material('#182e42',{shininess:100}));head.add(visor);
    cube(head,0,-.19,-.23,.44,.12,.26,'#e9e9e1');cube(head,0,.29,-.04,.045,.045,.48,'#f0a91b');
    for(const side of [-1,1]){
      const shoulder=[side*.39,2.1,-.01],elbow=[side*.51,1.86,-.35],hand=[side*.52,1.66,-.76];
      bone(root,shoulder,elbow,.15,.12,top);bone(root,elbow,hand,.115,.085,top);ellipsoid(root,...hand,.10,.085,.13,'#252d3a');
      const hip=[side*.23,1.44,.15],knee=[side*.48,1.05,-.25],ankle=[side*.44,.64,.15];
      bone(root,hip,knee,.18,.145,jeans);bone(root,knee,ankle,.14,.10,jeans);ellipsoid(root,side*.44,.64,.04,.14,.1,.27,shoeMat);
      // White jacket stripe and backpack straps sit on the shoulder geometry.
      bone(root,[side*.23,2.13,-.19],[side*.23,1.48,-.19],.027,.027,'#ff9f28',5);
      bone(root,[side*.42,2.09,-.03],[side*.51,1.91,-.27],.04,.035,'#e9e9df',5);
    }
    const backpack=new THREE.Group();backpack.position.set(0,1.92,.48);root.add(backpack);
    backpack.name='Mochila_Reparto';
    const bagCloth=cloth('#ffda34');bagCloth.emissive.set('#ffda34');bagCloth.emissiveIntensity=.16;
    cube(backpack,0,0,0,.91,.88,.64,bagCloth);
    cube(backpack,0,.39,.01,.97,.14,.69,material('#fbdb6e',{emissive:'#fbdb6e',emissiveIntensity:.12}));
    cube(backpack,0,.31,.35,.92,.035,.025,'#2c2b67');
    cube(backpack,0,-.31,.34,.80,.065,.035,'#f5f4e9');
    for(const x of [-.40,.40]){cube(backpack,x,-.035,.335,.035,.68,.025,'#2c2b67');cube(backpack,x,-.08,.36,.065,.09,.05,'#25233f');}
    cube(backpack,0,.49,0,.30,.055,.06,'#2c2b67');
    return {mesh:root,head,backpack};
  }
  return {pedestrian,rider,ellipsoid,bone};
}
