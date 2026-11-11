import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/addons/RoundedBoxGeometry.js';

/** Original 150cc courier motorcycle. Metres, +Y up, -Z forward.
 * Separate wheel pivots, steering, springs, engine fins, disc brakes and bodywork
 * remain editable for export and animation. No borrowed vehicle mesh. */
export function createCourierMotorcycle(){
  const root=new THREE.Group();root.name='Moto_Cordoba_150';
  const paint=new THREE.MeshPhysicalMaterial({color:'#f1bd28',metalness:.42,roughness:.28,clearcoat:1,clearcoatRoughness:.22});paint.name='Pintura_Amarilla';
  const black=new THREE.MeshStandardMaterial({color:'#171c23',roughness:.72});black.name='Plastico_Negro';
  const rubber=new THREE.MeshStandardMaterial({color:'#171b20',roughness:.96});rubber.name='Goma';
  const chrome=new THREE.MeshStandardMaterial({color:'#bbc3c9',metalness:.95,roughness:.21});chrome.name='Cromo';
  const steel=new THREE.MeshStandardMaterial({color:'#6d757b',metalness:.8,roughness:.43});steel.name='Aluminio';
  const seatMat=new THREE.MeshStandardMaterial({color:'#282d34',roughness:.86});seatMat.name='Asiento';
  const red=new THREE.MeshPhysicalMaterial({color:'#db3325',roughness:.22,metalness:.1,emissive:'#5c0a02',emissiveIntensity:.45});
  const amber=new THREE.MeshPhysicalMaterial({color:'#ff971b',roughness:.24,emissive:'#9a4200',emissiveIntensity:.25});
  const lamp=new THREE.MeshPhysicalMaterial({color:'#fcf6d9',roughness:.12,metalness:.1,emissive:'#f2d891',emissiveIntensity:.65});
  function mesh(geo,mat,x=0,y=0,z=0,parent=root,name=''){
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.name=name;parent.add(m);return m;
  }
  function rounded(w,h,d,r,mat,x,y,z,parent=root,name=''){
    return mesh(new RoundedBoxGeometry(w,h,d,3,r),mat,x,y,z,parent,name);
  }
  function tube(points,r,mat,parent=root,segments=24){
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,8,false),mat,0,0,0,parent);
  }
  function strut(a,b,r,mat,parent=root){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),mat,0,0,0,parent);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  function sideDisc(r,depth,mat,x,y,z,parent=root,holes=false){
    let geo;
    if(holes){const shape=new THREE.Shape();shape.absarc(0,0,r,0,Math.PI*2,false);
      for(let i=0;i<14;i++){const a=i*Math.PI*2/14,h=new THREE.Path();h.absarc(Math.cos(a)*r*.72,Math.sin(a)*r*.72,.013,0,Math.PI*2,true);shape.holes.push(h);}
      geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:32});
    }else geo=new THREE.CylinderGeometry(r,r,depth,36);
    const m=mesh(geo,mat,x,y,z,parent);m.rotation[holes?'y':'z']=Math.PI/2;return m;
  }
  const wheelPivots=[];
  for(const z of [-1.05,1.05]){
    const wheel=new THREE.Group();wheel.position.set(0,.445,z);wheel.name=z<0?'Rueda_Delantera':'Rueda_Trasera';root.add(wheel);wheelPivots.push(wheel);
    const tire=mesh(new THREE.TorusGeometry(.335,.105,16,64),rubber,0,0,0,wheel);tire.rotation.y=Math.PI/2;
    for(const side of [-1,1]){
      const rim=mesh(new THREE.TorusGeometry(.275,.024,10,48),chrome,side*.082,0,0,wheel);rim.rotation.y=Math.PI/2;
      for(let i=0;i<18;i++){const a=i*Math.PI*2/18;strut([side*.025,0,0],[side*.079,Math.cos(a)*.27,Math.sin(a)*.27],.006,chrome,wheel);}
    }
    sideDisc(.075,.22,steel,0,0,0,wheel);
    sideDisc(.205,.014,steel,-.113,0,0,wheel,true);
    rounded(.08,.14,.07,.02,black,-.14,.055,-.16,wheel);
    // Tread blocks are shallow, rounded and individually aligned to the tire.
    for(let i=0;i<44;i++){const a=i*Math.PI*2/44;for(const side of [-1,1]){
      const block=rounded(.09,.018,.035,.006,rubber,side*.052,Math.cos(a)*.437,Math.sin(a)*.437,wheel);block.rotation.x=a;block.rotation.y=side*.3;
    }}
  }
  // Tubular cradle and rear swingarm.
  for(const side of [-1,1]){
    const x=side*.18;
    tube([[x,.78,.75],[x,.66,-.16],[x,1.2,-.65],[x,1.33,-.4],[x,1.02,.45],[x,.78,.75]],.032,black);
    strut([x,.75,.15],[side*.13,.445,1.05],.032,steel);
    strut([side*.155,.445,-1.05],[side*.155,1.47,-.77],.037,chrome);
    strut([side*.155,.445,-1.05],[side*.155,.85,-.94],.053,steel);
    const a=new THREE.Vector3(side*.18,.55,.91),b=new THREE.Vector3(side*.21,1.03,.51),axis=b.clone().sub(a).normalize();
    const n=new THREE.Vector3(1,0,0),u=new THREE.Vector3().crossVectors(axis,n).normalize(),coil=[];
    for(let i=0;i<=100;i++){const t=i/100,p=a.clone().lerp(b,t),angle=t*Math.PI*18;p.addScaledVector(n,Math.cos(angle)*.055).addScaledVector(u,Math.sin(angle)*.055);coil.push(p);}
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil),100,.012,6,false),chrome);
    strut(a.toArray(),b.toArray(),.018,black);
  }
  // Sculpted tank with a flattened underside.
  const tankGeo=new THREE.SphereGeometry(1,32,20),pos=tankGeo.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);pos.setXYZ(i,x*.29*(1-.13*z),Math.max(-.55,y)*.22,z*.47);}
  tankGeo.computeVertexNormals();mesh(tankGeo,paint,0,1.13,-.31,root,'Tanque');
  mesh(new THREE.CylinderGeometry(.075,.075,.018,24),chrome,0,1.35,-.3);
  const seat=rounded(.43,.16,.88,.065,seatMat,0,1.14,.44,root,'Asiento');seat.rotation.x=-.035;
  for(const side of [-1,1]){
    const panel=rounded(.035,.27,.66,.013,paint,side*.23,.94,.41);panel.rotation.z=side*.13;
    tube([[side*.215,1.27,.62],[side*.28,1.27,1.05],[side*.18,1.21,1.2]],.018,chrome);
    strut([side*.2,.68,.25],[side*.37,.68,.25],.022,steel);
    rounded(.20,.045,.10,.018,rubber,side*.38,.68,.25);
  }
  // Engine cases, cooling fins, fasteners, intake and curved exhaust.
  mesh(new THREE.SphereGeometry(.24,20,12),steel,0,.74,-.02).scale.set(1.05,.85,1.15);
  sideDisc(.18,.045,chrome,-.21,.74,.02);sideDisc(.15,.045,steel,.21,.72,-.02);
  const block=rounded(.34,.29,.32,.035,steel,0,.88,-.25);block.rotation.x=.18;
  for(let y=.77;y<1.03;y+=.032)rounded(.40,.013,.38,.008,steel,0,y,-.25);
  for(const x of [-.12,.12])for(const z of [-.37,-.13])mesh(new THREE.CylinderGeometry(.014,.014,.018,6),chrome,x,1.055,z);
  tube([[.11,.93,-.38],[.2,.73,-.5],[.29,.47,-.34],[.35,.48,.3],[.36,.61,.93]],.033,chrome);
  const silencer=mesh(new THREE.CylinderGeometry(.083,.072,.62,24),chrome,.36,.61,.85);silencer.rotation.x=Math.PI/2;
  mesh(new THREE.CylinderGeometry(.037,.037,.025,20),black,.36,.61,1.17).rotation.x=Math.PI/2;
  // Fenders follow the tire curvature rather than rectangular blocks.
  function fender(z,from,to,mat){
    const path=[];for(let i=0;i<=24;i++){const a=from+(to-from)*i/24;path.push(new THREE.Vector3(0,.445+Math.cos(a)*.50,z+Math.sin(a)*.50));}
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),36,.12,12,false);
    const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)*.8);geo.computeVertexNormals();mesh(geo,mat);
  }
  fender(-1.05,-.75,.8,paint);fender(1.05,-.65,.8,black);
  const headHousing=mesh(new THREE.CylinderGeometry(.18,.18,.18,32),black,0,1.35,-.94);headHousing.rotation.x=Math.PI/2;
  const headlight=mesh(new THREE.CylinderGeometry(.155,.155,.015,32),lamp,0,1.35,-1.04);headlight.rotation.x=Math.PI/2;
  const bezel=mesh(new THREE.TorusGeometry(.163,.018,10,32),chrome,0,1.35,-1.05);
  rounded(.30,.12,.07,.025,red,0,1.01,1.16);
  rounded(.22,.14,.025,.008,materialPlate(),0,.82,1.23);
  // Handlebar, grips, brake levers, cables and mirrors.
  tube([[-.48,1.58,-.42],[-.29,1.57,-.49],[-.16,1.53,-.77],[.16,1.53,-.77],[.29,1.57,-.49],[.48,1.58,-.42]],.024,chrome);
  for(const side of [-1,1]){
    strut([side*.31,1.58,-.42],[side*.49,1.58,-.42],.039,rubber);
    strut([side*.32,1.57,-.48],[side*.49,1.55,-.54],.012,chrome);
    tube([[side*.35,1.44,-.76],[side*.43,1.73,-.79],[side*.55,1.78,-.8]],.012,chrome);
    const mirror=rounded(.23,.13,.035,.045,black,side*.57,1.79,-.8);mirror.rotation.y=-side*.24;
    const reflective=rounded(.19,.09,.012,.028,new THREE.MeshPhysicalMaterial({color:'#bed6df',metalness:1,roughness:.08}),side*.57,1.79,-.78);reflective.rotation.y=-side*.24;
    rounded(.075,.065,.11,.025,amber,side*.25,1.23,-.98);
    rounded(.075,.065,.11,.025,amber,side*.26,1.00,1.06);
    tube([[side*.27,1.43,-.78],[side*.19,1.27,-.7],[side*.1,1.05,-.3]],.008,black);
  }
  const dash=rounded(.23,.06,.13,.02,black,0,1.55,-.72);dash.rotation.x=.3;
  rounded(.15,.008,.07,.008,new THREE.MeshStandardMaterial({color:'#8fcac8',roughness:.4,emissive:'#265c51',emissiveIntensity:.3}),0,1.587,-.72);
  root.userData={asset:'Moto Córdoba 150',original:true,units:'metres',forward:'-Z'};
  return {root,wheelPivots,grips:[[-.40,1.58,-.42],[.40,1.58,-.42]],seat:[0,1.23,.35],footrests:[[-.38,.68,.25],[.38,.68,.25]]};
}
function materialPlate(){return new THREE.MeshStandardMaterial({color:'#eceee7',roughness:.6});}
