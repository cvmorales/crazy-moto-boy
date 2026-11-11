import {actorFactory} from './actors.js?v=0.27';
// Córdoba arcade: original textured geometry, modelled from photographic references.
// The street layout is adapted for driving, rather than a navigation map.
export function buildCity({THREE,scene,box,cylinder,sphere,material,random,pilot=false}) {
  const city=new THREE.Group();scene.add(city);
  const colliders=[],breakables=[],people=[],restaurants=[],homes=[],buildings=[];
  const actors=actorFactory(THREE,material);
  const roads=Array.from({length:pilot?7:11},(_,i)=>(i-(pilot?3:5))*100);
  const limit=pilot?325:525,canalX=pilot?-120:-150,span=pilot?670:1070;
  function texture(size,paint,rx=1,ry=1) {
    const c=document.createElement('canvas');c.width=c.height=size;
    const ctx=c.getContext('2d');paint(ctx,size);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.magFilter=THREE.NearestFilter;t.anisotropy=4;return t;
  }
  function grain(ctx,n,count=5000,opacity=.16) {
    for(let i=0;i<count;i++){const v=Math.floor(random()*255);ctx.fillStyle=`rgba(${v},${v},${v},${opacity})`;ctx.fillRect(random()*n,random()*n,1+random()*2,1+random()*2);}
  }
  const asphalt=texture(256,(c,n)=>{
    c.fillStyle='#8a8c91';c.fillRect(0,0,n,n);grain(c,n,10000,.10);
    for(let i=0;i<14;i++){c.strokeStyle='rgba(20,23,29,.18)';c.lineWidth=.7;c.beginPath();let x=random()*n,y=random()*n;c.moveTo(x,y);for(let k=0;k<4;k++){x+=random()*30-15;y+=random()*25;c.lineTo(x,y);}c.stroke();}
  });
  const paving=texture(256,(c,n)=>{
    c.fillStyle='#ccad87';c.fillRect(0,0,n,n);
    for(let y=0;y<n;y+=32)for(let x=0;x<n;x+=32){const v=177+Math.floor(random()*40);c.fillStyle=`rgb(${v+17},${v+4},${v-24})`;c.fillRect(x+1,y+1,30,30);c.fillStyle='#f1ddbc';c.fillRect(x+1,y+1,30,1);}
    grain(c,n,5000,.1);
  },5,5);
  const stone=texture(256,(c,n)=>{
    c.fillStyle='#82775e';c.fillRect(0,0,n,n);
    for(let y=0;y<n;y+=32)for(let x=-32;x<n;x+=64){const xx=x+(y/32%2)*32,v=135+random()*55;c.fillStyle=`rgb(${v+15},${v+8},${v-18})`;c.fillRect(xx+2,y+2,60,28);c.fillStyle='#b8b297';c.fillRect(xx+2,y+2,60,2);}
    grain(c,n,9000,.22);
  },2,2);
  const brick=texture(256,(c,n)=>{
    c.fillStyle='#716855';c.fillRect(0,0,n,n);
    for(let y=0;y<n;y+=16)for(let x=-32;x<n;x+=48){const v=115+random()*42;c.fillStyle=`rgb(${v+32},${v*.64},${v*.47})`;c.fillRect(x+(y/16%2)*24+1,y+1,46,14);}grain(c,n,4000,.1);
  },3,5);
  const wall=texture(128,(c,n)=>{c.fillStyle='#e7d9bf';c.fillRect(0,0,n,n);grain(c,n,7000,.1);for(let y=0;y<n;y+=22){c.fillStyle='#b7a99155';c.fillRect(0,y,n,1);}},2,3);
  const leaf=texture(256,(c,n)=>{
    c.clearRect(0,0,n,n);
    for(let i=0;i<2600;i++){const x=random()*n,y=random()*n,dx=(x-128)/120,dy=(y-128)/115;if(dx*dx+dy*dy>1)continue;
      const v=50+random()*80;c.fillStyle=`rgba(${v*.75},${v+58},${v*.24},.93)`;c.beginPath();c.ellipse(x,y,3+random()*7,2+random()*4,random()*3,0,Math.PI*2);c.fill();}
  });
  const leafMat=new THREE.MeshLambertMaterial({map:leaf,transparent:true,alphaTest:.45,side:THREE.DoubleSide,depthWrite:true});
  const asphaltMat=(horizontal)=>{const t=asphalt.clone();t.repeat.set(horizontal?70:3,horizontal?3:70);const m=new THREE.MeshLambertMaterial({map:t});m.userData={road:true,horizontal};return m;};
  const sidewalkMat=new THREE.MeshLambertMaterial({map:paving});
  const stoneMat=new THREE.MeshLambertMaterial({map:stone});
  const plasterMat=new THREE.MeshLambertMaterial({map:wall,color:'#eee0bf'});
  box(city,1600,.5,1600,'#69a82e',0,-.55,0,false);
  const vertical=asphaltMat(false),horizontal=asphaltMat(true);
  for(const n of roads) {
    box(city,24,.12,span,vertical,n,-.04,0,false);box(city,span,.13,24,horizontal,0,-.035,n,false);
    for(let k=-limit+3;k<limit;k+=13){if(roads.some(r=>Math.abs(r-k)<17))continue;
      box(city,.18,.025,4,'#e6e3bd',n,.045,k,false);box(city,4,.025,.18,'#e6e3bd',k,.05,n,false);
      for(const side of [-1,1]){box(city,.17,.02,11,'#e2e0d4',n+side*10.8,.04,k,false);box(city,11,.02,.17,'#e2e0d4',k,.05,n+side*10.8,false);}
    }
  }
  for(const x of roads)for(const z of roads)for(let s=-4;s<=4;s++){
    box(city,1.2,.025,3.5,'#e4e1d1',x+s*2,.06,z-14.5,false);box(city,3.5,.025,1.2,'#e4e1d1',x+14.5,.07,z+s*2,false);
  }
  function label(text,x,y,z,width=13,bg='#245739',fg='#fff5cf',rotation=0,parent=city) {
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
    ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.strokeStyle=fg;ctx.lineWidth=4;ctx.strokeRect(5,5,502,118);
    ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 40px Arial';ctx.fillText(text,256,65,470);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;parent.add(m);return m;
  }
  function tree(x,z,s=1) {
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);city.add(g);
    cylinder(g,.25,.55,7,'#64503b',0,3.5,0,7);
    for(const side of [-1,1]){const b=cylinder(g,.13,.24,3.6,'#6e563a',side*.9,6,0,5);b.rotation.z=-side*.55;}
    for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(12,9),leafMat);m.position.set(i===1?1:0,9,0);m.rotation.y=i*Math.PI/3;g.add(m);}
    const crown=new THREE.Mesh(new THREE.PlaneGeometry(11,11),leafMat);crown.rotation.x=-Math.PI/2;crown.position.y=9;g.add(crown);
  }
  const facadeCache=new Map();
  function facade(color,w,h,brickwork=false) {
    const cacheKey=color+':'+Math.ceil(h/12)+':'+Math.round(w/12);
    if(facadeCache.has(cacheKey))return facadeCache.get(cacheKey);
    const t=texture(256,(c,n)=>{
      c.fillStyle=color;c.fillRect(0,0,n,n);grain(c,n,5000,.075);
      if(brickwork){for(let y=0;y<n;y+=8){c.fillStyle='#603d283a';c.fillRect(0,y,n,1);}}
      for(let row=0;row<4;row++)for(let col=0;col<3;col++){
        const x=col*85+17,y=row*64+12;
        c.fillStyle='#5c5649';c.fillRect(x-3,y-3,54,42);c.fillStyle='#e8ded0';c.fillRect(x-1,y-1,51,39);
        c.fillStyle=['#31566d','#294d60','#54788b','#bdc4ad'][Math.floor(random()*4)];c.fillRect(x+2,y+2,45,33);
        c.fillStyle='#101f2b66';c.fillRect(x+2,y+2,45,8);c.fillStyle='#9fc7d8aa';c.fillRect(x+4,y+12,17,18);
        c.fillStyle='#b8b5a1';c.fillRect(x+23,y+2,2,33);c.fillRect(x+2,y+18,45,2);c.fillStyle='#eee8d8';c.fillRect(x-4,y+38,57,4);
      }
      c.fillStyle='#b9af9944';for(let i=0;i<8;i++)c.fillRect(random()*256,random()*256,2,20+random()*70);
    },Math.max(1,w/13),Math.max(1,h/17));
    const result=new THREE.MeshLambertMaterial({map:t});facadeCache.set(cacheKey,result);return result;
  }
  const colors=['#f1c64d','#ef824b','#d95d4d','#4cbca3','#549fd6','#f3d095','#ca7958','#d694af'];
  function building(x,z,w,d,h,color,balconies=true) {
    const face=facade(color,w,h,color==='#be7859');
    box(city,w,h,d,face,x,h/2+.22,z);
    box(city,w+1,.65,d+1,'#d4cfbc',x,h+.5,z);box(city,w,.5,d,'#8a8578',x,.6,z);
    colliders.push({x,z,w:w/2+.8,d:d/2+.8});
    buildings.push({x,z,w,d,h,color});
    if(balconies&&h>17)for(let y=7;y<h-2;y+=5.5){
      box(city,w-.6,.27,1.8,'#c2b7a2',x,y,z+d/2+.6);box(city,w-.6,.55,.1,'#555f60',x,y+.5,z+d/2+1.4);
      box(city,1.8,.27,d-.6,'#c2b7a2',x-w/2-.6,y,z);box(city,.1,.55,d-.6,'#555f60',x-w/2-1.4,y+.5,z);
    }
    if(h<17){box(city,w*.9,.25,2,'#a74734',x,4,z+d/2+.6);box(city,2.5,3,.12,'#253a43',x,1.8,z+d/2+.1);}
  }
  const special=new Set(['50,-150','50,-50','-50,50','150,50','150,150','-50,150','-250,-50','250,250','-350,-250','450,-350','350,150','-350,350','50,450','250,-250',...(pilot?['250,-150','150,250','-250,250','50,250','-250,-250']:[])]);
  for(let i=0;i<10;i++)for(let j=0;j<10;j++){
    const x=-450+i*100,z=-450+j*100;
    if(pilot&&(Math.abs(x)>250||Math.abs(z)>250))continue;
    if(x===canalX)continue;
    box(city,76,.35,76,sidewalkMat,x,.1,z,false);
    if(special.has(`${x},${z}`))continue;
    for(let a=0;a<2;a++)for(let b=0;b<2;b++){
      const h=(z<100&&x>0?16:7)+random()*(z<100?35:19);
      building(x+(a-.5)*36,z+(b-.5)*36,32,32,h,colors[Math.floor(random()*colors.length)],(i+j)%3===0);
    }
    if((i+j)%2===0){tree(x-39,z-29,.65);tree(x+39,z+28,.7);}
  }
  // Stone-lined La Cañada with lowered water, retaining walls, walkways and tipas.
  const waterTex=texture(128,(c,n)=>{c.fillStyle='#456943';c.fillRect(0,0,n,n);for(let i=0;i<550;i++){c.fillStyle=random()>.5?'#92b18c66':'#b6c8a444';c.fillRect(random()*128,random()*128,3+random()*18,1);}},1,65);
  box(city,16,.1,span-10,new THREE.MeshPhongMaterial({map:waterTex,shininess:85,color:'#91b6a2'}),canalX,-2,0,false);
  for(const side of [-1,1]){
    const t=stone.clone();t.repeat.set(1,130);const m=new THREE.MeshLambertMaterial({map:t});
    box(city,2,3.2,span-10,m,canalX+side*9,-.9,0);box(city,13,.3,span-10,sidewalkMat,canalX+side*17,.1,0,false);
    box(city,2.5,.35,span-10,'#b9b49b',canalX+side*9,.9,0);
    for(let z=-limit+15;z<limit;z+=27){if(roads.some(r=>Math.abs(z-r)<17))continue;tree(canalX+side*17,z,1.1);}
  }
  for(const z of roads){box(city,47,.5,24,asphaltMat(true),canalX,.05,z,false);for(const side of [-1,1]){
    box(city,43,.9,.9,stoneMat,canalX,.7,z+side*13);box(city,44,.22,1.2,'#c2b593',canalX,1.28,z+side*13);
  }}
  // Classical details: arches are actual geometry, rather than painted rectangles.
  function arch(parent,x,y,z,r,h,color,depth=.3){
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
    box(g,r*2,h,depth,'#293a38',0,h/2,0,false);
    const fill=new THREE.Mesh(new THREE.CircleGeometry(r,16,0,Math.PI),material('#293a38'));fill.position.set(0,h,.01);g.add(fill);
    for(const side of [-1,1])box(g,.45,h+.15,depth+.25,color,side*(r+.2),h/2,.1);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(r+.22,.24,4,18,Math.PI),material(color));rim.position.set(0,h,.18);g.add(rim);
    return g;
  }
  function dome(parent,x,y,z,r,color){
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,8,0,Math.PI*2,0,Math.PI/2),material(color));m.position.set(x,y,z);m.scale.y=1.3;parent.add(m);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const rib=new THREE.Mesh(new THREE.TorusGeometry(r,.09,3,16,Math.PI/2),material('#c5b387'));rib.rotation.y=a;rib.rotation.x=Math.PI/2;rib.position.set(x,y,z);parent.add(rib);}
  }
  const church=new THREE.Group();church.position.set(50,.3,-150);city.add(church);
  box(church,54,14,51,plasterMat,0,7,0);box(church,57,.8,53,'#e3d1a4',0,14.6,0);
  box(church,34,5,4,plasterMat,0,16,26);
  const ped=new THREE.Mesh(new THREE.ConeGeometry(20,7,3),material('#ead4a7'));ped.rotation.y=Math.PI;ped.scale.z=.12;ped.position.set(0,20,28);church.add(ped);
  for(const x of [-11,0,11])arch(church,x,.2,26,3.3,5.4,'#e6d0a0',1);
  for(const x of [-17,-6,6,17]){cylinder(church,.7,.9,11,'#eed8ad',x,6,27,10);box(church,2.4,.7,2,'#e5cda2',x,11.6,27);}
  for(const side of [-1,1]){
    const x=side*23;box(church,10,29,11,plasterMat,x,14.5,24);
    for(const y of [4,13,22,29])box(church,11,.7,12,'#e8d0a0',x,y,24);
    for(const xx of [-2.2,2.2])arch(church,x+xx,20,29.6,1.35,3.7,'#f1dbb0');
    arch(church,x,8,29.7,1.8,3.5,'#f0d7a5');
    cylinder(church,4,4.6,3,'#e6cda0',x,30,24,8);dome(church,x,31.5,24,3.7,'#d9ba7c');
    cylinder(church,.7,1.1,4,'#e4cc97',x,38,24,8);box(church,.16,2.3,.18,'#6f6450',x,41,24);box(church,1.3,.15,.18,'#6f6450',x,41.4,24);
    for(const dx of [-4.5,4.5])box(church,.6,19,.7,'#f0dcaf',x+dx,13,29.9);
  }
  cylinder(church,9,10,6,'#dec398',0,18,-4,16);dome(church,0,21,-4,9,'#c4ae78');
  cylinder(church,1.8,2.4,5,'#dfc68e',0,35,-4,12);dome(church,0,37.5,-4,2,'#d8ba7b');
  box(church,.2,3,.2,'#6b644e',0,42,-4);box(church,1.7,.2,.2,'#6b644e',0,42.5,-4);
  for(let i=0;i<4;i++)box(church,59+i*1.2,.22,7,'#bdb9a7',0,.2-i*.15,31+i*.8);
  colliders.push({x:50,z:-150,w:29,d:29});label('CATEDRAL DE CÓRDOBA',50,3,-117,26,'#ceb888','#544c39');
  // Plaza San Martín and adjacent Cabildo-style arcade.
  box(city,72,.2,72,'#6c953c',50,.4,-50,false);
  box(city,9,.15,72,sidewalkMat,50,.6,-50,false);box(city,72,.15,9,sidewalkMat,50,.6,-50,false);
  box(city,4,5,4,stoneMat,50,3,-50);sphere(city,1.9,'#526b4b',50,6.4,-50,[1.8,1,.55]);cylinder(city,.6,.7,2.4,'#526b4b',50,8,-50);
  for(const x of [22,78])for(const z of [-78,-22])tree(x,z,1);
  label('PLAZA SAN MARTÍN',50,2,-10,22);
  // Patio Olmos: low, wide classical facade, pilasters, pediment and red/blue banners.
  const olmos=new THREE.Group();olmos.position.set(-50,.3,50);city.add(olmos);
  box(olmos,65,14,48,plasterMat,0,7,0);box(olmos,67,.8,50,'#d1bc8e',0,14.5,0);
  for(let i=-3;i<=3;i++){arch(olmos,i*8.5,1,24.3,2.2,3,'#e4d2ad');arch(olmos,i*8.5,8,24.4,2.1,2.5,'#e6d5ad');}
  for(let i=-4;i<=4;i++){const x=i*8.4+4.2;box(olmos,.8,12,1,'#f0debc',x,7,25);box(olmos,1.9,.6,1.7,'#dfc89f',x,13.5,25);}
  box(olmos,67,.5,51,'#b3a182',0,7.1,0);
  const peak=new THREE.Mesh(new THREE.ConeGeometry(14,5,3),material('#e0ccaa'));peak.rotation.y=Math.PI;peak.scale.z=.12;peak.position.set(0,17,25);olmos.add(peak);
  for(const x of [-18,18])label('PATIO OLMOS',x,8,26,7,x<0?'#ba292b':'#21478d','#ffffff',0,olmos);
  label('PATIO OLMOS',-50,4,76,32,'#164d73','#ffffff');
  for(let i=0;i<5;i++)box(olmos,70+i*1.3,.18,3,'#bbb4a0',0,.2-i*.1,26+i*.65);
  colliders.push({x:-50,z:50,w:34,d:25});
  // Buen Pastor and the red-brick, Gothic Capuchinos silhouette.
  box(city,73,.2,73,sidewalkMat,150,.3,50,false);
  box(city,28,11,34,plasterMat,150,5.8,48);cylinder(city,4,4.5,5,'#d5b994',150,14,48,12);dome(city,150,16.5,48,4,'#b4967a');
  for(let x=125;x<=175;x+=10)cylinder(city,2.8,2.8,.6,'#72b5cd',x,.8,78,16);
  label('PASEO DEL BUEN PASTOR',150,3,90,32);colliders.push({x:150,z:48,w:15,d:18});
  const cap=new THREE.Group();cap.position.set(150,.3,150);city.add(cap);
  const brickMat=new THREE.MeshLambertMaterial({map:brick});
  box(cap,43,24,42,brickMat,0,12,0);
  for(const side of [-1,1]){box(cap,8,39,10,brickMat,side*19,19.5,20);arch(cap,side*19,26,25.1,2,5,'#d6c4a3');}
  const spire=new THREE.Mesh(new THREE.ConeGeometry(6,24,4),material('#5a867e'));spire.rotation.y=Math.PI/4;spire.position.set(19,51,20);cap.add(spire);
  for(const x of [-10,0,10])arch(cap,x,1,22,3,8,'#d6c5a7');
  const rose=new THREE.Mesh(new THREE.RingGeometry(3.2,4,16),material('#cbb69b'));rose.position.set(0,18,21.1);cap.add(rose);
  label('LOS CAPUCHINOS',150,2,177,25);colliders.push({x:150,z:150,w:25,d:24});
  // Food shops and apartment entrances share the same physical coordinates as missions.
  function person(x,z,color='#c44b31'){
    const model=actors.pedestrian({shirt:color,female:people.length%3===1,cap:people.length%4===0,pants:people.length%2?'#2e456f':'#484d4c'});
    model.mesh.position.set(x,.25,z);model.mesh.rotation.y=-Math.PI/2;city.add(model.mesh);
    people.push({...model,baseZ:z,waiting:false,walk:false});return people[people.length-1];
  }
  function foodShop(name,x,z,point,color,kind){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=-Math.PI/2;city.add(g);
    box(g,31,9,27,material('#e9cfa0',{map:wall}),0,4.7,0);box(g,33,.6,29,'#b35b39',0,9.5,0);
    box(g,27,4,.2,'#24494f',0,2.4,13.6);for(const xx of [-9,0,9])box(g,.35,4,.5,'#d4d5bd',xx,2.4,13.8);
    box(g,30,.35,4.3,color,0,5,15);for(let xx=-14;xx<=14;xx+=2)box(g,.8,.36,4.31,'#f3e4bc',xx,5.01,15);
    label(name,0,7,13.8,29,color,'#fff4d0',0,g);
    label(kind,0,3.1,13.9,15,'#151d25','#ffdb36',0,g);
    label(name,-15.7,7,0,26,color,'#fff4d0',-Math.PI/2,g);
    label(kind,-15.75,2.7,0,19,'#192e39','#ffe332',-Math.PI/2,g);
    box(g,2.4,.3,27,color,-16.3,5.1,0);
    for(let zz=-12;zz<13;zz+=2)box(g,2.41,.32,.8,'#eee1c5',-16.3,5.1,zz);
    box(g,3.7,1.4,1,'#72613e',10,1,16.4);box(g,3.7,.17,1,'#ae8b54',10,1.8,16.4);
    colliders.push({x,z,w:14.3,d:16.3});
    const clerk=person(point[0]+5,point[1]+2,'#f0c533');
    const shop={name,pickup:point,clerk,mesh:g};restaurants.push(shop);return shop;
  }
  foodShop('PIZZERÍA DE GÜEMES',-65,125,[-95,125],'#bc2929','PIZZA AL MOLDE');
  foodShop('LOMITOS LA CAÑADA',-265,-65,[-295,-65],'#efb62b','LOMITO COMPLETO');
  foodShop('EMPANADAS DE ALBERDI',pilot?-265:-365,-265,[pilot?-295:-395,-265],'#40774b','CRIOLLAS · AL HORNO');
  foodShop('CAFÉ DEL BUEN PASTOR',235,265,[205,265],'#2b658a','CAFÉ · MEDIALUNAS');
  // Contiguous neighbours make these food shops part of a city block, rather than empty lots.
  for(const [x,z] of [[-65,125],[-265,-65],[pilot?-265:-365,-265]]){
    building(x+33,z,29,29,16,'#ef8951',false);building(x+17,z+42,62,26,12,'#55bdb0',false);
  }
  building(267,265,28,29,17,'#f0c650',false);building(250,230,65,25,12,'#dc7350',false);
  function apartment(name,x,z,point,color,address){
    building(x,z,47,47,52,color,true);
    box(city,.25,5,6,'#213e45',x-23.7,2.8,z);box(city,.4,5.6,.25,'#b8baae',x-23.8,3,z-3.3);box(city,.4,5.6,.25,'#b8baae',x-23.8,3,z+3.3);
    label(address,x-24,6.7,z,20,'#243242','#ffffff',-Math.PI/2);
    const recipient=person(point[0]+5,point[1],'#ec6340');recipient.mesh.visible=false;
    const home={name,drop:point,recipient,address,personName:['Sofi','Nico','Mica','Lauti','Flor'][homes.length]};homes.push(home);return home;
  }
  apartment('Torre del Centro',pilot?250:450,pilot?-150:-350,[pilot?215:415,pilot?-150:-350],'#e1ac5c','CENTRO · 1248');
  apartment('Edificio Nueva Córdoba',pilot?150:350,pilot?250:150,[pilot?115:315,pilot?250:150],'#dd804c','NVA. CÓRDOBA · 850');
  apartment('Residencias Alberdi',pilot?-250:-350,pilot?250:350,[pilot?-285:-385,pilot?250:350],'#75bda5','ALBERDI · 620');
  apartment('Torre Parque Sarmiento',50,pilot?250:450,[15,pilot?250:450],'#6ba7d3','PARQUE · 1020');
  apartment('Edificio General Paz',250,-250,[215,-250],'#e6ba63','GENERAL PAZ · 370');
  for(let i=0;i<150;i++){
    const x=i<18?-84:roads[1+i%(roads.length-2)]+(i%2?15:-15),z=i<18?32+i*11:pilot?-245+(i*67%490):-445+(i*79%890);
    const p=person(x,z,['#bd3427','#286fb4','#ece5cb','#e0ad2d','#7b4c93'][i%5]);p.walk=true;p.phase=i*1.7;
  }
  // Breakable street furniture. These are not solid buildings: an impact sends pieces flying.
  function prop(type,x,z){
    const g=new THREE.Group();g.position.set(x,.2,z);g.userData.arcadeDynamic=true;city.add(g);
    if(type==='cajones'){
      for(let i=0;i<3;i++){box(g,1.1,.8,.9,'#b57a36',(i%2)*1.2,Math.floor(i/2)*.85+.4,0);for(const zz of [-.48,.48])box(g,1.2,.1,.06,'#e0b45b',(i%2)*1.2,Math.floor(i/2)*.85+.5,zz);}
    }else if(type==='valla'){
      for(const dx of [-1.2,1.2])box(g,.18,1.5,.7,'#d8d8d0',dx,.75,0);
      for(const y of [.6,1.1])box(g,3.1,.3,.15,'#ed7823',0,y,0);
      for(const dx of [-1,0,1])box(g,.35,.31,.17,'#fff1c5',dx,1.1,0);
    }else if(type==='mesas'){
      box(g,2.1,.18,2.1,'#c68d49',0,1.2,0);box(g,.2,1.1,.2,'#514538',0,.6,0);
      for(const dx of [-1.6,1.6]){box(g,.8,.12,.8,'#537c8d',dx,.65,0);box(g,.8,.8,.12,'#537c8d',dx,1,-.4);box(g,.14,.6,.14,'#314956',dx,.3,0);}
    }else if(type==='tacho'){
      cylinder(g,.65,.55,1.5,'#25844a',0,.8,0,8);cylinder(g,.72,.72,.12,'#174e30',0,1.6,0,8);
    }else {
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.45,1.3,8),material('#fa761b'));cone.position.y=.75;g.add(cone);box(g,1,.12,1,'#3b3c39',0,.1,0);cylinder(g,.25,.36,.2,'#fff8df',0,.7,0,8);
    }
    const colors=type==='cajones'?['#b57a36','#dfaf58']:type==='tacho'?['#25844a','#95a88b']:['#ff8c24','#fff0b1','#7b6850'];
    breakables.push({mesh:g,type,x,z,r:type==='valla'?2:type==='mesas'?2.2:1.3,broken:false,colors});
  }
  for(const n of roads)for(let z=pilot?-260:-460;z<(pilot?280:480);z+=100){
    if(Math.abs(n-canalX)<25)continue;
    prop('tacho',n+12.8,z+12);prop('cajones',n-12.5,z+27);prop('cono',n+7.5,z+35);
    if((n+z)%200===40)prop('valla',n-6,z+45);
  }
  // A few immediately reachable objects let the player discover destruction in the first seconds.
  prop('cajones',-94,158);prop('valla',-106,148);prop('cono',-100,167);prop('mesas',-87,145);
  for(const shop of restaurants){prop('mesas',shop.pickup[0]+7,shop.pickup[1]+8);prop('cajones',shop.pickup[0]+6,shop.pickup[1]-8);}
  for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++){
    const x=i*100-14,z=j*100+19;cylinder(city,.12,.17,8,'#3a4950',x,4,z,6);box(city,3,.15,.2,'#43515a',x+1.2,8,z);box(city,1.1,.2,.5,'#e6e5c7',x+2.4,7.9,z);
    if((i+j)%3===0){box(city,.2,6,.2,'#414946',x,3,z-7);box(city,.8,1.9,.5,'#2b3032',x,5.7,z-7);sphere(city,.17,'#d83b2d',x,6.25,z-6.7);sphere(city,.17,'#53c64b',x,5.15,z-6.7);}
  }
  label('BV. SAN JUAN',-114,4.5,4,12);label('MARCELO T. DE ALVEAR',-115,4.3,108,15);
  label('LA CAÑADA',-170,4.5,104,14);label('AV. HIPÓLITO YRIGOYEN',114,4,4,16);
  // Cloud planes use a painted sky sprite, as on turn-of-the-century arcade hardware.
  const cloudTex=texture(256,(c,n)=>{c.clearRect(0,0,n,n);for(let i=0;i<30;i++){c.fillStyle='#ffffffbf';c.beginPath();c.ellipse(35+random()*185,90+random()*65,15+random()*36,12+random()*18,0,0,Math.PI*2);c.fill();}});
  const cm=new THREE.MeshBasicMaterial({map:cloudTex,transparent:true,depthWrite:false,fog:false});
  for(let i=0;i<13;i++){const a=i/13*Math.PI*2;const m=new THREE.Mesh(new THREE.PlaneGeometry(230,110),cm);m.position.set(Math.cos(a)*700,160+random()*70,Math.sin(a)*700);m.lookAt(0,100,0);scene.add(m);}
  // Instance repeated static boxes to keep the detailed city practical on laptop GPUs.
  city.updateMatrixWorld(true);
  const batches=new Map();
  city.traverse(m=>{
    if(!m.isMesh||m.geometry.type!=='BoxGeometry')return;
    for(let p=m.parent;p&&p!==city;p=p.parent)if(p.userData.arcadeDynamic)return;
    const key=m.material.uuid+':'+m.castShadow;
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);
  });
  for(const meshes of batches.values()){
    if(meshes.length<4)continue;
    const batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);
    batch.castShadow=meshes[0].castShadow;batch.receiveShadow=true;
    meshes.forEach((m,i)=>{batch.setMatrixAt(i,m.matrixWorld);m.parent.remove(m);});city.add(batch);
  }
  // Animated crowds share geometry and draw batches; retain the individual rig
  // transforms for gait animation and customer visibility.
  const actorGroups=new Map();
  for(const p of people)p.mesh.traverse(m=>{if(!m.isMesh)return;const key=m.geometry.uuid+':'+m.material.uuid;if(!actorGroups.has(key))actorGroups.set(key,[]);actorGroups.get(key).push({mesh:m,root:p.mesh});m.visible=false;});
  const actorBatches=[];
  for(const items of actorGroups.values()){
    const batch=new THREE.InstancedMesh(items[0].mesh.geometry,items[0].mesh.material,items.length);batch.castShadow=true;batch.receiveShadow=true;scene.add(batch);actorBatches.push({batch,items});
  }
  const zero=new THREE.Matrix4().makeScale(0,0,0);
  function updateCrowds(){
    for(const p of people)p.mesh.updateMatrixWorld(true);
    for(const {batch,items} of actorBatches){items.forEach((item,i)=>batch.setMatrixAt(i,item.root.visible&&!item.root.userData.highDetail?item.mesh.matrixWorld:zero));batch.instanceMatrix.needsUpdate=true;}
  }
  updateCrowds();
  return {city,colliders,roads,limit,canalX,restaurants,homes,breakables,people,buildings,label,updateCrowds};
}
