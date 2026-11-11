import * as THREE from '../vendor/three.module.js';

// Original arcade-scale interpretations, following photographic silhouettes.
// Geography is compressed to keep the pilot district driveable.
export function buildCordobaLandmarks({world,root,mat,box,column,beam,add,faceGroup,archFrame,roundArch,cornice,window}){
  const stone=mat('Patrimonio_Arenisca','#c8af83'),cream=mat('Patrimonio_Cornisas','#e6d4ae');
  const red=mat('Capuchinos_Terracota','#b96e53'),ochre=mat('Capuchinos_Ocre','#d6af72'),slate=mat('Capuchinos_Gris','#596b6a');
  const dark=mat('Patrimonio_Aberturas','#273d45'),roof=mat('Patrimonio_Teja','#92513c');
  const glass=mat('Vidrio_Vitral','#526f87',{emissive:'#c29b60',emissiveIntensity:.18});
  function cross(x,y,z,g,size=1){box(.16*size,2.4*size,.16*size,slate,x,y,z,g);box(1.3*size,.16*size,.16*size,slate,x,y+.35*size,z,g);}
  function dome(x,y,z,r,height,m,g){const pts=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI/2;pts.push(new THREE.Vector2(r*Math.cos(a),height*Math.sin(a)));}add(new THREE.LatheGeometry(pts,24),m,x,y,z,g);}
  function pointed(x,y,z,w,h,m,g){const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h*.53);shape.quadraticCurveTo(w*.35,h*.83,0,h);shape.quadraticCurveTo(-w*.35,h*.83,-w/2,h*.53);shape.closePath();return add(new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false,curveSegments:8}),m,x,y,z,g);}
  function lancet(x,y,z,w,h,g){pointed(x,y,z,w+.48,h+.45,cream,g);pointed(x,y+.12,z+.2,w,h,glass,g);box(.08,h*.66,.15,ochre,x,y+h*.36,z+.42,g);}
  function spire(x,y,z,r,h,g){add(new THREE.ConeGeometry(r,h,8),slate,x,y+h/2,z,g);cross(x,y+h+1.1,z,g,.7);}
  function solid(x,z,w,d){world.colliders.push({x,z,w:w/2,d:d/2,originalArt:true});}

  // Capuchinos: polychrome pointed arches, rose window, one truncated tower
  // and one tall spire. The asymmetry is essential to its Córdoba silhouette.
  const cap=faceGroup(150,0,150,Math.PI);cap.name='Iglesia_Capuchinos';
  box(38,17,43,red,0,8.5,0,cap);box(22,7,43,ochre,0,19.5,-2,cap);
  const gable=new THREE.Shape();gable.moveTo(-13,0);gable.lineTo(13,0);gable.lineTo(0,12);gable.closePath();add(new THREE.ExtrudeGeometry(gable,{depth:2,bevelEnabled:false}),red,0,22,20,cap);
  for(const x of [-14,0,14]){pointed(x,.2,21.65,x?6.2:7.8,x?9:11,ochre,cap);pointed(x,.35,21.9,x?5:6.6,x?8:10,dark,cap);}
  const rose=add(new THREE.CircleGeometry(4,32),glass,0,19,22.3,cap);
  add(new THREE.TorusGeometry(4.2,.28,6,32),cream,0,19,22.5,cap);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;beam([0,19,22.6],[Math.cos(a)*4,19+Math.sin(a)*4,22.6],.07,ochre,cap);}
  add(new THREE.TorusGeometry(1.5,.13,6,24),ochre,0,19,22.65,cap);
  for(const x of [-19,19]){
    const height=x<0?27:31;box(7.5,height,8,ochre,x,height/2,19,cap);
    for(let y=4;y<height;y+=4){box(7.8,.3,8.3,slate,x,y,19,cap);}
    for(const y of [7,16,23])lancet(x,y,23.15,2.5,4.5,cap);
    for(const side of [-1,1]){box(.7,height+1,1.3,red,x+side*3.45,height/2,23.15,cap);column(.35,2,cream,x+side*3.45,height+1,23.15,cap);}
    box(8.3,.5,8.8,cream,x,height+.25,19,cap);
    if(x>0)spire(x,height+.5,19,4.7,17,cap);
  }
  for(const x of [-10,-5,5,10]){column(.19,12,cream,x,6.5,22.3,cap);pointed(x,11.5,22,2,4,ochre,cap);pointed(x,11.7,22.2,1.2,3,dark,cap);}
  for(const x of [-19,19])for(const z of [-16,-5,6])box(1.2,18,2.5,ochre,x,9,z,cap);
  cross(0,35,21,cap,1);solid(150,150,47,46);

  // Buen Pastor: low ochre chapel, dome, side galleries and a long reflecting pool.
  const pastor=faceGroup(150,0,50,0);pastor.name='Paseo_Buen_Pastor';
  const salmon=mat('Buen_Pastor_Revoque','#d5a07b'),pool=mat('Buen_Pastor_Fuente','#4a9caa',{roughness:.25,metalness:.25});
  box(27,12,29,salmon,0,6,-3,pastor);box(55,7.5,15,salmon,0,3.75,-15,pastor);
  for(const x of [-23,-16,16,23]){archFrame(x,.3,-7.3,4.4,5.7,pastor,cream);roundArch(x,.4,-7.2,4.1,5.4,dark,pastor);}
  archFrame(0,.3,11.7,4.6,7,pastor,cream);roundArch(0,.4,11.8,4.2,6.7,dark,pastor);
  for(const x of [-10,-6,6,10])column(.28,11,cream,x,5.8,12,pastor);
  cornice(28,12,11.7,pastor);column(4.8,3.4,cream,0,14,-2,pastor);dome(0,15.7,-2,5,4,stone,pastor);column(.6,1.5,cream,0,20,-2,pastor);cross(0,22,-2,pastor,.6);
  for(const x of [-7,7])window(x,8.7,11.85,2,3,pastor,{arched:true});
  box(62,.35,11,cream,0,.4,29,pastor);box(59,.10,8,pool,0,.65,29,pastor);
  const jet=mat('Agua_Fuente','#a3dae5',{transparent:true,opacity:.55,roughness:.2});
  for(let x=-25;x<=25;x+=5)column(.08,2.2,jet,x,1.8,29,pastor);
  solid(150,47,29,30);

  // Cathedral: paired bell towers, deep classical portico and ribbed central dome.
  const cathedral=faceGroup(50,0,-150,0);cathedral.name='Catedral_Cordoba';
  box(45,18,56,stone,0,9,0,cathedral);
  box(30,14,8,cream,0,7,29,cathedral);
  for(const x of [-10,0,10]){archFrame(x,.3,33.15,7.5,10,cathedral,stone);roundArch(x,.4,33.25,7,9.6,dark,cathedral);}
  for(const x of [-15,-5,5,15]){column(.48,12,stone,x,6.4,34,cathedral);box(1.6,.6,1.8,cream,x,12.7,34,cathedral);}
  cornice(33,13.1,33.6,cathedral);
  const pediment=new THREE.Shape();pediment.moveTo(-17,0);pediment.lineTo(17,0);pediment.lineTo(0,7);pediment.closePath();add(new THREE.ExtrudeGeometry(pediment,{depth:1,bevelEnabled:false}),stone,0,13.8,33,cathedral);
  for(const x of [-20,20]){
    box(9,27,11,stone,x,13.5,23,cathedral);
    for(const y of [8,17,26]){box(10,.5,12,cream,x,y,23,cathedral);}
    archFrame(x,18,28.6,4.8,6.5,cathedral,cream);roundArch(x,18.1,28.8,4.3,6.1,dark,cathedral);
    column(4.7,2,cream,x,28,23,cathedral);dome(x,29,23,4.9,5,stone,cathedral);cross(x,35.5,23,cathedral,.7);
  }
  column(8,5,cream,0,22,-5,cathedral);dome(0,24.5,-5,8.8,12,stone,cathedral);
  for(let i=0;i<12;i++){const a=i*Math.PI/6,pts=[];for(let j=0;j<=12;j++){const q=j/12*Math.PI/2;pts.push(new THREE.Vector3(Math.cos(a)*8.9*Math.cos(q),24.5+12*Math.sin(q),-5+Math.sin(a)*8.9*Math.cos(q)));}add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.12,5,false),cream,0,0,0,cathedral);}
  column(1.9,4,cream,0,38,-5,cathedral);dome(0,40,-5,2.1,2.3,stone,cathedral);cross(0,44,-5,cathedral,.7);
  for(let i=0;i<4;i++)box(49+i*1.3,.2,5+i*.7,cream,0,.35-i*.10,31+i*.7,cathedral);
  solid(50,-150,55,60);

  const plaza=faceGroup(50,0,-50,0);plaza.name='Plaza_San_Martin';
  const lawn=mat('Plaza_Cesped','#65834a'),paving=mat('Plaza_Granito','#c7bdab'),bronze=mat('Monumento_Bronce','#475e4b',{metalness:.5});
  box(80,.2,80,paving,0,.1,0,plaza);
  for(const x of [-22,22])for(const z of [-22,22])box(29,.12,29,lawn,x,.24,z,plaza);
  box(7,.5,7,stone,0,.5,0,plaza);box(3,5,3,stone,0,3,0,plaza);
  // Low-poly equestrian silhouette instead of a featureless pillar.
  const horse=add(new THREE.SphereGeometry(1,10,6),bronze,0,6.4,0,plaza);horse.scale.set(2.1,.7,.65);
  for(const x of [-1.3,1.3])for(const z of [-.5,.5])beam([x,6.3,z],[x+.15,5.2,z],.16,bronze,plaza);
  beam([1.4,6.5,0],[2,7.8,0],.4,bronze,plaza);column(.33,1.5,bronze,0,7.8,0,plaza);add(new THREE.SphereGeometry(.32,8,6),bronze,0,8.8,0,plaza);
  // Plaza furniture is supplied by street-props so every bench can break.
  root.userData.landmarks=['La Cañada','Patio Olmos','Iglesia de los Capuchinos','Paseo del Buen Pastor','Catedral de Córdoba','Plaza San Martín'];
}
