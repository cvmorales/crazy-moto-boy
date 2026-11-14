import * as THREE from '../vendor/three.module.js';

export const jesuitChurchId='219439829';
export const jesuitChapelId='219439830';
export const jesuitPedestrianStreets=[
  {a:{x:120,z:-84},b:{x:170,z:-220},width:8.4},
  {a:{x:35,z:-257},b:{x:170,z:-220},width:8.2}
];

// Keep the historic block and its pedestrian frontage clear of generated infill.
export function jesuitPrecinct(x,z){
  const trejoX=120+(-84-z)*50/136;
  return z>-265&&z<-82&&x>36&&x<trejoX+14&&z> -268+(x-35)*.274;
}

export function addJesuitBlock(root,world){
  const church=world.buildings.find(b=>b.osmId===jesuitChurchId);
  if(!church)return;
  const group=new THREE.Group();group.name='Manzana_Jesuitica';root.add(group);
  const material=color=>new THREE.MeshStandardMaterial({color,roughness:.87});
  const sand=material('#a79176'),trim=material('#c5b29a'),lime=material('#e4dcc4');
  const tile=material('#87513e'),wood=material('#45302c'),iron=material('#303738');
  const pale=material('#eee1bf'),glass=material('#3e5860');
  const cube=new THREE.BoxGeometry(1,1,1);
  function mesh(parent,geometry,mat,x,y,z){
    const part=new THREE.Mesh(geometry,mat);part.position.set(x,y,z);
    part.receiveShadow=true;parent.add(part);return part;
  }
  function box(parent,mat,x,y,z,w,h,d){
    const part=mesh(parent,cube,mat,x,y,z);part.scale.set(w,h,d);return part;
  }
  function arch(parent,x,y,z,w,h,frame,inside=wood){
    for(const [extra,depth,mat] of [[.21,0,frame],[0,.045,inside]]){
      const r=w/2+extra,top=h-r;
      const contour=new THREE.Shape();
      contour.moveTo(-r,0);contour.lineTo(r,0);contour.lineTo(r,top);
      contour.absarc(0,top,r,0,Math.PI,false);contour.lineTo(-r,0);
      mesh(parent,new THREE.ShapeGeometry(contour,12),mat,x,y,z+depth);
    }
  }
  function sign(parent,x,y,z,w,label){
    if(typeof document==='undefined')return;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
    const ink=canvas.getContext('2d');
    ink.fillStyle='#40332a';ink.fillRect(0,0,512,96);
    ink.strokeStyle='#ad8a50';ink.lineWidth=3;ink.strokeRect(6,6,500,84);
    ink.fillStyle='#f0dfbb';ink.font='bold 38px Georgia';ink.textAlign='center';
    ink.textBaseline='middle';ink.fillText(label,256,49,480);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    mesh(parent,new THREE.PlaneGeometry(w,w*.185),new THREE.MeshBasicMaterial({map}),x,y,z);
  }
  // Original masonry texture, drawn to match the irregular courses in the reference.
  let masonry;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#8a7769';ctx.fillRect(0,0,512,256);
    for(let row=0;row<16;row++){
      let x=-(row%2)*21;
      for(let i=0;x<512;i++){
        const seed=(row*103+i*47)%31,w=25+seed%22,y=row*16;
        ctx.fillStyle=`rgb(${155+seed},${133+seed},${112+seed})`;
        ctx.fillRect(x+1,y+1,w-2,14);
        ctx.fillStyle='rgba(255,235,208,.16)';ctx.fillRect(x+2,y+1,w-4,1);
        x+=w;
      }
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    masonry=new THREE.MeshStandardMaterial({map,roughness:.96});
  }
  const front=church.points.slice(0,-1).sort((a,b)=>b.x-a.x).slice(0,2).sort((a,b)=>b.z-a.z);
  const [a,b]=front;
  const span=Math.hypot(b.x-a.x,b.z-a.z),tx=(b.x-a.x)/span,tz=(b.z-a.z)/span;
  const nx=-tz,nz=tx,fx=(a.x+b.x)/2,fz=(a.z+b.z)/2;
  function frontage(name,x,z){
    const face=new THREE.Group();face.name=name;face.position.set(x,0,z);
    face.rotation.y=Math.atan2(nx,nz);group.add(face);return face;
  }
  const temple=frontage('Compania_De_Jesus',fx,fz);
  const outline=new THREE.Shape();
  church.points.forEach((p,i)=>i?outline.lineTo(p.x,-p.z):outline.moveTo(p.x,-p.z));
  const body=new THREE.ExtrudeGeometry(outline,{depth:12.2,bevelEnabled:false});body.rotateX(-Math.PI/2);
  mesh(group,body,sand,0,0,0);
  if(masonry)mesh(temple,new THREE.PlaneGeometry(span,12.17),masonry,0,6.085,.031);
  box(temple,trim,0,.55,.16,span,1.10,.49);
  box(temple,trim,0,10.95,.14,span,.34,.56);
  box(temple,trim,0,12.14,.16,span,.24,.70);
  arch(temple,0,.25,.43,4.1,6.65,trim);
  arch(temple,0,7.48,.40,1.65,2.75,trim,glass);
  for(const x of [-5.25,5.25]){
    box(temple,trim,x,5.72,.3,.60,11.1,.7);
    arch(temple,x*1.33,.45,.38,1.55,3.4,trim);
    arch(temple,x*1.33,6.55,.38,1.15,2.7,trim,glass);
  }
  const gable=new THREE.Shape();gable.moveTo(-7,0);gable.lineTo(7,0);
  gable.quadraticCurveTo(4,1.1,0,3.9);gable.quadraticCurveTo(-4,1.1,-7,0);gable.closePath();
  mesh(temple,new THREE.ExtrudeGeometry(gable,{depth:.55,bevelEnabled:false}),sand,0,12.1,-.08);
  box(temple,iron,0,16.4,.1,.09,1.7,.10);box(temple,iron,0,16.57,.1,.89,.09,.1);
  for(const x of [-span/2+2.8,span/2-2.8]){
    box(temple,sand,x,8.65,-2.0,5.6,17.3,4.4);
    box(temple,trim,x,17.32,-2,5.9,.29,4.8);
    box(temple,trim,x,13.3,-2,5.8,.22,4.7);
    arch(temple,x,13.62,.27,2.15,3.02,trim,iron);
    box(temple,wood,x,14.93,.36,.88,.88,.07);
    for(const dx of [-2.33,2.33])box(temple,trim,x+dx,17.74,-.06,.46,.64,.46);
  }
  sign(temple,0,7.13,.44,3.35,'COMPAÑÍA DE JESÚS');
  const chapel=world.buildings.find(b=>b.osmId===jesuitChapelId);
  if(chapel){
    const shape=new THREE.Shape();
    chapel.points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));
    const volume=new THREE.ExtrudeGeometry(shape,{depth:8.2,bevelEnabled:false});volume.rotateX(-Math.PI/2);
    mesh(group,volume,sand,0,0,0);
  }
  function wing(name,along,width,height){
    const face=frontage(name,fx+tx*along,fz+tz*along);
    const corners=[[-width/2,0],[width/2,0],[width/2,-8.2],[-width/2,-8.2]].map(([a,d])=>({
      x:face.position.x+tx*a+nx*d,z:face.position.z+tz*a+nz*d
    }));
    world.registerFootprint({points:[...corners,corners[0]],bounds:{
      minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),
      minZ:Math.min(...corners.map(p=>p.z)),maxZ:Math.max(...corners.map(p=>p.z))
    }});
    box(face,lime,0,height/2,-4.1,width,height,8.2);
    for(const y of [.36,height-.17])box(face,trim,0,y,.06,width+.12,.34,.40);
    box(face,tile,0,height+.13,-4.1,width+.54,.27,8.65);
    for(let x=-width/2+2.45;x<width/2-1.2;x+=4.65){
      if(Math.abs(x)<3.3)continue;
      for(const y of [1.28,height-3.25]){
        box(face,pale,x,y+1.03,.043,1.75,2.35,.13);
        box(face,wood,x,y+1.04,.115,1.32,1.93,.06);
        for(const offset of [-.38,0,.38])box(face,iron,x+offset,y+1.03,.16,.041,1.94,.04);
        box(face,trim,x,y,.20,1.92,.16,.42);
      }
    }
    return face;
  }
  const rectorado=wing('Rectorado_Historico_UNC',-32,34,8.8);
  arch(rectorado,0,.22,.31,3.15,4.60,trim);
  sign(rectorado,0,5.55,.34,6.4,'RECTORADO · UNC');
  for(const x of [-9,9])box(rectorado,trim,x,4.35,.18,.34,8.2,.35);
  const school=wing('Colegio_Nacional_De_Monserrat',-67,35,9.6);
  arch(school,0,.22,.33,3.62,5.45,trim);
  for(const x of [-2.27,2.27]){
    const fluted=new THREE.CylinderGeometry(.16,.23,4.7,9);
    mesh(school,fluted,trim,x,2.7,.54);
    for(const y of [.43,4.99])box(school,pale,x,y,.55,.57,.30,.52);
  }
  box(school,trim,0,5.75,.57,5.6,.30,1.16);
  arch(school,0,5.94,.30,2.04,2.82,pale,glass);
  for(let x=-1.87;x<=1.9;x+=.31)box(school,iron,x,6.23,1.04,.052,.91,.06);
  box(school,iron,0,6.68,1.04,3.82,.07,.09);
  sign(school,0,9.19,.34,8.5,'COLEGIO NACIONAL DE MONSERRAT');
  const tower=box(school,lime,-12,7.5,-2.5,5.8,15,5.2);tower.name='Torre_Reloj_Monserrat';
  box(school,trim,-12,12.0,.12,6,.31,.65);
  const clock=mesh(school,new THREE.CircleGeometry(1.05,24),pale,-12,13.05,.22);
  clock.name='Reloj_Monserrat';
  box(school,iron,-12,13.27,.25,.073,.59,.05);box(school,iron,-11.80,13.05,.25,.49,.072,.049);
  mesh(school,new THREE.ConeGeometry(4.12,3.24,8),tile,-12,16.55,-2.5);

  const paving=material('#b7a899'),border=material('#8d8074');
  box(temple,paving,0,.047,4.62,span+.35,.11,8.85);
  for(let x=-span/2+.8;x<span/2;x+=2.4)box(temple,border,x,.108,4.62,.045,.009,8.7);
  for(const street of jesuitPedestrianStreets){
    const dx=street.b.x-street.a.x,dz=street.b.z-street.a.z,length=Math.hypot(dx,dz);
    const walk=new THREE.Group();walk.name='Peatonal_Jesuitica';walk.rotation.y=Math.atan2(dx,dz);
    walk.position.set((street.a.x+street.b.x)/2,0,(street.a.z+street.b.z)/2);group.add(walk);
    box(walk,paving,0,.035,0,street.width,.09,length+.15);
    for(const side of [-1,1])box(walk,border,side*(street.width/2-.15),.09,0,.22,.08,length);
    for(let z=-length/2+2;z<length/2;z+=3.6)box(walk,border,0,.083,z,street.width-.48,.009,.055);
    for(let z=-length/2+9;z<length/2-6;z+=22){
      const x=street.width/2-.60;
      box(walk,iron,x,1.77,z,.075,3.45,.075);
      box(walk,pale,x,3.47,z,.25,.27,.25);
      box(walk,iron,x,3.66,z,.32,.09,.32);
    }
  }
  root.userData.jesuitFront={x:fx,z:fz,nx,nz};
}
