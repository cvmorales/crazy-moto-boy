import {nearestSegment} from '../real-network.js?v=0.39';
import {offRoad,sidewalkTop,width} from '../real-world.js?v=0.39';

// Shared, instanced street furniture. Objects keep independent destruction state.
export function createStreetProps({THREE,scene,world}){
  const props=[],groups=new Map(),materials=new Map(),geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,8),sphere:new THREE.SphereGeometry(1,8,6)};
  const wood='#b68046',metal='#354f53',cream='#f3dca6',red='#e35b3b',green='#358c71';
  let dirty=true;
  function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.8}));return materials.get(color);}
  function piece(prop,shape,color,x,y,z,w,h,d,rz=0){
    const m=new THREE.Mesh(geometries[shape],material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.z=rz;m.visible=false;prop.mesh.add(m);prop.parts.push(m);
    const key=shape+color;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({prop,mesh:m});return m;
  }
  function make(type,x,z,angle=0,parent=scene){
    const mesh=new THREE.Group();mesh.position.set(x,0,z);mesh.rotation.y=angle;mesh.userData.arcadeDynamic=true;parent.add(mesh);
    const p={type,mesh,x,z,r:1,broken:false,colors:[wood,cream,metal],parts:[],carried:parent!==scene,instanced:true,onBreak:()=>{dirty=true;}};props.push(p);world.breakables.push(p);
    const b=(color,x,y,z,w,h,d,rz=0)=>piece(p,'box',color,x,y,z,w,h,d,rz);
    const c=(color,x,y,z,r,h)=>piece(p,'cylinder',color,x,y,z,r,h,r);
    if(type==='mesa'){
      p.r=1.25;b(wood,0,1.05,0,2.1,.16,1.6);c(metal,0,.5,0,.12,1);b(metal,0,.08,0,1.2,.1,.7);
      c(cream,-.45,1.25,0,.12,.28);c(red,.4,1.23,.25,.15,.24);b(cream,.2,1.15,-.35,.4,.05,.35);
    }else if(type==='silla'){
      p.r=.6;b(green,0,.6,0,.65,.12,.65);b(green,0,.99,.29,.65,.7,.12);for(const x of [-.26,.26])for(const z of [-.26,.26])b(metal,x,.3,z,.08,.6,.08);
    }else if(type==='parasol'){
      p.r=.65;c(cream,0,1.7,0,.06,3.4);b(metal,0,.1,0,.75,.14,.75);
      for(const side of [-1,1])b(side<0?red:cream,side*.75,3.25,0,1.6,.13,2.7,side*.18);
    }else if(type==='banco'){
      p.r=1.8;for(let z=-.36;z<.4;z+=.25)b(wood,0,.65,z,3,.13,.2);
      for(const y of [1,1.3])b(wood,0,y,.44,3,.22,.1);
      for(const x of [-1.15,1.15]){b(metal,x,.35,0,.18,.7,.75);b(metal,x,.95,.43,.12,.9,.12);b(metal,x,1,-.1,.1,.1,.7);}
    }else if(type==='reja'){
      p.r=1.65;for(const x of [-1.5,1.5]){c(metal,x,.9,0,.08,1.8);b(metal,x,.1,0,.5,.13,.7);}
      for(const y of [.4,1.5])b(green,0,y,0,3,.09,.1);
      for(let x=-1.2;x<=1.2;x+=.4)b(green,x,.95,0,.06,1.15,.08);
    }else if(type==='cartel'){
      p.r=.9;b(green,0,1.1,0,1.2,1.5,.13);for(const side of [-1,1])b(wood,side*.66,.85,0,.09,1.7,.6,side*-.06);
      for(const y of [.85,1.1,1.4])b(cream,0,y,-.08,.83,.055,.03);
      b(red,0,1.7,-.09,.85,.15,.03);b(wood,0,.12,0,1.6,.1,.9);
    }else if(type==='maceta'){
      p.r=.65;c(red,0,.4,0,.48,.8);c(wood,0,.82,0,.5,.08);
      for(const [x,y,z] of [[0,1.4,0],[-.3,1.1,.1],[.3,1.2,-.1]])piece(p,'sphere',green,x,y,z,.4,.65,.4);
    }else if(type==='puesto'){
      p.r=1.9;b(wood,0,1,0,2.6,.2,1.4);for(const x of [-1.1,1.1]){b(metal,x,.5,0,.13,1,.8);b(metal,x,2,0,.09,2,.09);}
      b(red,0,2.95,0,3,.12,2);b(cream,0,2.83,-1,3,.23,.08);
      for(const x of [-.85,0,.85])for(const z of [-.4,.3])piece(p,'sphere',x===0?'#e9bd43':red,x,1.28,z,.25,.25,.25);
    }else if(type==='flores'){
      p.r=1.7;b(green,0,.9,0,2.8,.18,1.3);for(const x of [-1.1,1.1]){b(metal,x,.45,0,.12,.9,1);b(metal,x,1.9,.45,.07,2.9,.07);}
      for(const x of [-.9,0,.9])for(const z of [-.35,.35]){
        c(cream,x,1.17,z,.24,.45);
        for(const k of [-1,1]){const xx=x+k*.12;c(green,xx,1.67,z,.025,.75);for(const [dx,dy] of [[-.1,0],[.1,0],[0,.1],[0,-.1]])piece(p,'sphere',x===0?cream:red,xx+dx,2+dy,z,.12,.12,.1);}
      }
      b(green,0,3.3,0,3.1,.13,1.9);b(cream,0,3.15,-.95,2.8,.24,.07);
    }else if(type==='ropa'||type==='perchero'){
      p.r=1.7;for(const x of [-1.3,1.3]){b(metal,x,1.2,0,.09,2.4,.09);b(metal,x,.1,0,.55,.13,.9);}b(metal,0,2.4,0,2.8,.08,.08);
      for(let i=0;i<5;i++){const x=-1+i*.5,color=[red,green,cream,red,green][i];
        b(wood,x,2.18,0,.45,.055,.07);b(color,x,1.65,0,.38,.85,.10);b(color,x-.26,1.97,0,.24,.28,.11,-.45);b(color,x+.26,1.97,0,.24,.28,.11,.45);
      }
      if(type==='ropa'){b(wood,0,.65,1,2.8,.14,1);for(const x of [-1,0,1])for(let y=.8;y<1.15;y+=.12)b(x===0?cream:green,x,y,1,.7,.11,.65);}
    }else if(type==='revistas'){
      p.r=1.4;b(green,0,.9,0,2.4,1.6,1.1);b(cream,0,1.75,0,2.7,.17,1.4);
      for(const x of [-.8,0,.8])for(const y of [1.95,2.35]){b(wood,x,y,.35,.7,.45,.1);b(x===0?red:cream,x,y,.29,.6,.38,.04);b(green,x,y-.05,.26,.43,.035,.02);}
      for(const x of [-1.1,1.1])b(metal,x,2.1,.5,.07,2.3,.07);b(red,0,2.85,0,2.8,.15,1.7);
    }else if(type==='carrito'){
      p.r=1.5;b(cream,0,.95,0,2.3,1.2,1.2);b(red,0,1.6,0,2.5,.18,1.4);
      for(const x of [-.9,.9])for(const z of [-.55,.55]){const wheel=c(metal,x,.32,z,.27,.12);wheel.rotation.x=Math.PI/2;}
      c(cream,0,2.4,0,.055,1.6);for(const side of [-1,1])b(side<0?green:cream,side*.7,3.2,0,1.5,.12,2.2,side*.16);
      for(const x of [-.7,0,.7])c(x===0?red:green,x,1.82,0,.13,.3);
    }else if(type==='papelera'){
      p.r=.65;c(green,0,.7,0,.52,1.4);c(metal,0,1.42,0,.56,.12);b(metal,0,1.15,-.51,.6,.25,.04);
    }else if(type==='bolardo'){
      p.r=.45;c(metal,0,.6,0,.15,1.2);c(cream,0,.95,0,.17,.15);c(metal,0,.08,0,.3,.13);
    }else if(type==='conoobra'){
      p.r=.6;b(metal,0,.08,0,1,.12,1);c(red,0,.65,0,.4,1.15);c(cream,0,.72,0,.34,.16);
    }else if(type==='vallaobra'){
      p.r=1.6;for(const x of [-1.2,1.2]){b(metal,x,.55,0,.12,1.1,.6);b(metal,x,.08,0,.5,.12,.7);}
      for(const y of [.65,1.1]){b(red,0,y,0,2.9,.32,.12);for(const x of [-.8,0,.8])b(cream,x,y,-.07,.27,.32,.04,.45);}
    }else if(type==='barrilobra'){
      p.r=.7;c(red,0,.65,0,.5,1.3);for(const y of [.3,1])c(cream,0,y,0,.52,.16);c(metal,0,1.33,0,.48,.08);
    }else if(type==='cartelobra'){
      p.r=.8;b(metal,0,.85,0,.09,1.7,.1);b(metal,0,.08,0,.9,.12,.8);b(cream,0,1.7,0,1.5,1.25,.12);b(red,0,1.72,-.07,1.28,.22,.03,-.65);b(red,0,2.08,-.07,1.28,.22,.03,-.65);
    }else if(type==='cajonobra'){
      p.r=.8;b(wood,0,.5,0,1.3,1,1);for(const x of [-.45,.45])b(cream,x,.5,-.51,.1,.95,.05);b(cream,0,.5,-.53,1.2,.1,.05);
    }else if(type==='vallaPolicial'){
      p.r=1.35;
      for(const x of [-1.08,1.08]){
        b(metal,x,.54,0,.09,1.08,.09);b(metal,x,.07,0,.34,.13,.72);
      }
      b('#34577f',0,.89,0,2.4,.39,.13);
      for(const x of [-.88,-.44,0,.44,.88])b('#e4eef3',x,.89,.08,.21,.23,.04,-.35);
    }else if(type==='cartelPolicial'){
      p.r=.65;b(metal,0,.72,0,.09,1.44,.09);b(metal,0,.08,0,.76,.11,.54);
      b('#34577f',0,1.52,0,1.03,.66,.12);
      b('#edf4f1',0,1.52,.071,.79,.22,.03);
      b('#34577f',0,1.52,.094,.57,.07,.02);
      b('#75a6d6',0,1.88,0,.38,.11,.15);
    }else if(type==='bolsa'){
      p.r=.65;p.mesh.position.y=1.1;b('#d5ab68',0,0,0,.55,.65,.38);for(const x of [-.14,.14])b(cream,x,.4,0,.045,.25,.045);b(cream,0,.53,0,.32,.045,.045);
    }else if(type==='bandeja'){
      p.r=.7;p.mesh.position.y=1.1;b(wood,0,0,0,.85,.06,.55);for(const x of [-.25,.25]){c(cream,x,.18,0,.12,.28);c(red,x,.33,0,.135,.045);}
    }
    p.fragments=p.parts;return p;
  }
  function cafe(x,z){
    for(const dz of [-22,-15,-8,8,15,22]){make('mesa',x+4.5,z+dz);make('silla',x+3,z+dz,Math.PI/2);make('silla',x+6,z+dz,-Math.PI/2);if(Math.abs(dz)===15)make('parasol',x+4.5,z+dz);}
    make('cartel',x+2,z-4);make('maceta',x+5,z+27);make('papelera',x+3,z-27);
  }
  if(world.real){
    const free = (x,z,r=.6) => !world.realWorld.blocked(x,z) &&
      props.every(p=>Math.hypot(p.x-x,p.z-z)>Math.min(2.3,p.r+r));
    const place = (type,x,z,angle=0,y=0) => {
      const prop=make(type,x,z,angle);
      prop.mesh.position.y=y;
      return prop;
    };
    const sidewalk=(x,z,r=1.65)=>offRoad(world.network,x,z,r)&&!world.realWorld.blocked(x,z);
    for(const check of world.checkpoints??[]){
      const {x,z,dx,dz,nx,nz,edge}=check;
      for(const [type,a,b] of [['vallaPolicial',0,edge+2],['cartelPolicial',5,edge+1.6],['conoobra',-6,edge-.28],['conoobra',6,edge-.28]]){
        const px=x+dx*a+nx*b,pz=z+dz*a+nz*b;
        if(free(px,pz)){const p=place(type,px,pz,Math.atan2(dx,dz),b>edge?sidewalkTop:.01);p.policeCheckpoint=true;}
      }
    }
    const avenueView = segment => width(segment)>=11 && segment.length>42 && segment.bridge!=='yes' && segment.tunnel!=='yes';
    const usedScenes=[];
    for(const anchor of [...world.starts,world.realArt.root.userData.landmarkPositions.plaza]){
      const options=world.network.segments.filter(avenueView).map(segment=>({
        segment,x:(segment.a.x+segment.b.x)/2,z:(segment.a.z+segment.b.z)/2
      })).sort((a,b)=>Math.hypot(a.x-anchor.x,a.z-anchor.z)-Math.hypot(b.x-anchor.x,b.z-anchor.z));
      {
        for(const {segment:s,x,z} of options){
          if(usedScenes.some(p=>Math.hypot(p.x-x,p.z-z)<62)||world.checkpoints?.some(p=>Math.hypot(p.x-x,p.z-z)<35))continue;
          const dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length,edge=width(s)/2;
          const layout=[['vallaobra',0,edge+.23],['cartelobra',-10,edge-.32],['barrilobra',3,edge+.12],
            ['cajonobra',6,edge+1.1],['conoobra',-6,edge-.62],['conoobra',-3,edge-.56],['conoobra',7,edge-.43],['conoobra',10,edge-.25]];
          const items=[-1,1].map(side=>layout.map(([type,a,b])=>({type,b,x:x+dx*a-dz*b*side,z:z+dz*a+dx*b*side}))).find(group=>group.every(p=>{
            return free(p.x,p.z,.75)&&nearestSegment(world.network,p).segment===s;
          }));
          if(!items)continue;
          for(const p of items){const object=place(p.type,p.x,p.z,-Math.atan2(dz,dx),p.b>edge+.4?sidewalkTop:.01);object.roadwork=true;}
          usedScenes.push({x,z});break;
        }
      }
    }
    const {pastor,plaza}=world.realArt.root.userData.landmarkPositions;
    for(const {x,z} of world.realWorld.parkSites??[]){
      for(const [type,dx,dz,angle] of [['banco',-4.8,5,0],['banco',4.8,5,0],['banco',-6,0,Math.PI/2],['papelera',6.6,5,0],
        ['maceta',-6.1,-5,0],['maceta',6.1,-5,0],['cartel',6.5,3.1,0]]){
        if(sidewalk(x+dx,z+dz,1.25)&&free(x+dx,z+dz,1.1))place(type,x+dx,z+dz,angle,.09);
      }
    }
    // Small markets use the clear perimeter of the existing green areas.
    for(const [i,{x,z}] of (world.realWorld.parkSites??[]).entries()){
      if(i%3===1)continue;
      for(const [type,dx,dz] of [['puesto',-5,-6.4],['flores',-.4,-6.4],['ropa',4.5,-6.4],
        ['cajonobra',-2.7,-7.4],['revistas',-6.4,1.8],['cartel',6.1,2.7]]){
        const px=x+dx,pz=z+dz;
        if(sidewalk(px,pz,2)&&free(px,pz,1.4))place(type,px,pz,Math.PI,.08);
      }
    }
    for(const center of [pastor,plaza])for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,r=i%2?17:13;
      const x=center.x+Math.cos(angle)*r,z=center.z+Math.sin(angle)*r,road=nearestSegment(world.network,{x,z});
      if(road.distance<width(road.segment)/2+1.7||!sidewalk(x,z,1.85)||!free(x,z,1.2))continue;
      place(['banco','papelera','maceta','flores','puesto','cartel'][i%6],x,z,Math.PI/2-angle,.16);
    }
    // Place small breakables along the actual road segments instead of the old grid.
    const types=['cartel','maceta','papelera','conoobra','cajonobra','silla','mesa','banco','flores','carrito','puesto','parasol','revistas'];let placed=0;
    for(const segment of world.network.segments){if(segment.length<20||placed>=800)continue;
      const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z,len=segment.length;
      for(const side of [-1,1]){if(placed>=800)break;
        const offset=width(segment)/2+2.15;
        const x=(segment.a.x+segment.b.x)/2-side*dz/len*offset,z=(segment.a.z+segment.b.z)/2+side*dx/len*offset;
        if(!sidewalk(x,z,2)||!free(x,z,1.3))continue;place(types[placed%types.length],x,z,Math.atan2(dx,dz),sidewalkTop);placed++;
      }
    }
    // Reinforce street activity around starting points and recognizable places.
    const anchors=[...world.starts,{x:0,z:0},world.realArt.root.userData.landmarkPositions.pastor,world.realArt.root.userData.landmarkPositions.plaza];
    for(const anchor of anchors){let local=0;
      for(const segment of world.network.segments){if(local>=12||segment.length<18)continue;const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z,len=segment.length,mx=(segment.a.x+segment.b.x)/2,mz=(segment.a.z+segment.b.z)/2;if(Math.hypot(mx-anchor.x,mz-anchor.z)>85)continue;
        for(const side of [-1,1]){const offset=width(segment)/2+2.05,x=mx-side*dz/len*offset,z=mz+side*dx/len*offset;if(!sidewalk(x,z,1.85)||!free(x,z))continue;place(['banco','cartel','maceta','flores','carrito','papelera'][local%6],x,z,Math.atan2(dx,dz),sidewalkTop);local++;if(local>=12)break;}
      }
    }
    // Cafe furniture near actual game pickup kiosks, kept off solid buildings.
    for(const shop of world.restaurants){if(!shop.mesh.parent)continue;const x=shop.mesh.position.x,z=shop.mesh.position.z;
      for(const [type,dx,dz] of [['mesa',4,0],['silla',3,-1.4],['silla',5,1.4],['parasol',4,0],['cartel',-3,0]])if(sidewalk(x+dx,z+dz,1.35))place(type,x+dx,z+dz,0,sidewalkTop);
    }
    for(const [i,row] of world.realWorld.commercialRows.entries()){
      const position=(a,b)=>[row.x+row.dx*a-row.nx*b,row.z+row.dz*a-row.nz*b];
      const cafeRow=i%3!==1;
      const furniture=cafeRow?[['mesa',-3.1,1.65],['silla',-4.8,1.65],['silla',-1.4,1.65],
        ['mesa',2.8,1.65],['silla',1.1,1.65],['silla',4.5,1.65],['cartel',0,.52]]:
        [[['flores','ropa','revistas','banco'][i%4],-2.55,1.22],['maceta',2.2,.65],['cartel',0,.55]];
      for(const [type,a,b] of furniture){
        const [x,z]=position(a,b);if(!sidewalk(x,z,type==='mesa'||type==='banco'?1.35:.8)||props.some(p=>Math.hypot(p.x-x,p.z-z)<1.65))continue;
        place(type,x,z,-Math.atan2(row.dz,row.dx),sidewalkTop);
        if(type==='mesa'&&i%2===0)place('parasol',x,z,-Math.atan2(row.dz,row.dx),sidewalkTop);
      }
    }
    for(const gallery of world.galleries||[])for(let along=-(gallery.length||12)/2+2;along<(gallery.length||12)/2;along+=4)for(const side of [-1,1]){
      const dx=gallery.axis==='path'?gallery.dx:gallery.axis==='x'?1:0,dz=gallery.axis==='path'?gallery.dz:gallery.axis==='x'?0:1;
      const x=gallery.x+dx*along-dz*side*2.3,z=gallery.z+dz*along+dx*side*2.3;
      const type=['ropa','revistas','flores','perchero','cartel','carrito'][Math.round((along+(gallery.length||12)/2-2)/4+ (side>0?2:0))%6];
      if(sidewalk(x,z,1.4)){const prop=make(type,x,z,-Math.atan2(dz,dx));prop.gallery=gallery.name;}
    }
  }else{
  world.restaurants.forEach(s=>cafe(...s.pickup));
  // Breakable commercial displays, outdoor-style tables and seating inside
  // the gallery. The through route has no invisible building collider.
  for(const gallery of world.galleries||[]){
    for(let x=gallery.x-27;x<=gallery.x+27;x+=9){
      for(const side of [-1,1]){
        const type=side<0?['flores','ropa','puesto','revistas'][Math.round((x-gallery.x+27)/9)%4]:['mesa','cartel','carrito','perchero'][Math.round((x-gallery.x+27)/9)%4];
        const prop=make(type,x,gallery.z+side*5.5,side<0?0:Math.PI);prop.gallery=gallery.name;
        if(type==='mesa'){const chair=make('silla',x+2,gallery.z+side*6.1);chair.gallery=gallery.name;}
      }
    }
  }
  // Street markets on both sides of the grid, with clear crossings and entrances.
  const marketTypes=['flores','ropa','revistas','carrito','puesto','perchero'];
  let market=0;
  const usable=(x,z,padding=1)=>!world.colliders.some(c=>Math.abs(c.x-x)<c.w+padding&&Math.abs(c.z-z)<c.d+padding)&&!world.restaurants.some(s=>Math.hypot(s.pickup[0]-x,s.pickup[1]-z)<6)&&!world.homes.some(h=>Math.hypot(h.drop[0]-x,h.drop[1]-z)<6);
  for(const n of world.roads)for(let t=-270;t<=270;t+=30){
    if(world.roads.some(r=>Math.abs(r-t)<15))continue;
    for(const side of [-1,1])for(const axis of ['x','z']){
      const x=axis==='x'?t:n+side*10.5,z=axis==='x'?n+side*10.5:t;
      if(Math.abs(x-world.canalX)<10||!usable(x,z,1.8))continue;
      make(marketTypes[market++%marketTypes.length],x,z,axis==='x'?0:Math.PI/2);
    }
  }
  // Furniture sits beside every street and near corners, leaving junctions clear.
  for(const n of world.roads)for(let z=-260;z<280;z+=45){
    if(world.roads.some(r=>Math.abs(r-z)<16)||Math.abs(n-world.canalX)<15)continue;
    const x=n+(Math.round(z/45)%2?9.7:-9.7);
    if(world.colliders.some(c=>Math.abs(c.x-x)<c.w+1&&Math.abs(c.z-z)<c.d+1))continue;
    make(Math.abs(Math.round((n+z)/5))%3===0?'banco':'cartel',x,z,Math.PI/2);
    make('maceta',x,z+4);
  }
  // Signposted work sites on several streets. Every visible barrier, cone,
  // barrel and crate is a normal smashable prop; a lane remains open.
  for(const road of [-200,0,100,200])for(const along of [-250,-50,150]){
    const entries=[['cartelobra',-4,-18],['conoobra',-4,-12],['conoobra',-4,-6],['vallaobra',-3,0],['barrilobra',1,4],['cajonobra',-3,8],['conoobra',-4,14]];
    for(const [type,dx,dz] of entries){const x=road+dx,z=along+dz;if(!usable(x,z,.4))continue;const p=make(type,x,z);p.roadwork=true;}
  }
  // Both banks of each La Cañada bridge have breakable objects near the
  // edges of the approach. The middle of the carriageway remains clear.
  const bridgeProps=[['bolardo',14,5.4],['cartel',20,-5.4],['maceta',26,5.4],['papelera',31,-5.4]];
  for(const bridgeZ of world.roads)for(const bank of [-1,1]){
    for(const [type,offset,dz] of bridgeProps){
      const x=world.canalX+bank*offset,z=bridgeZ+dz;
      if(Math.abs(x)>world.limit-3||Math.abs(z)>world.limit-3||!usable(x,z,1.6))continue;
      const prop=make(type,x,z,bank*Math.PI/2);
      prop.bridgeApproach=bridgeZ;prop.bridgeBank=bank;
    }
  }
  // Plaza San Martín, Buen Pastor and the church forecourts.
  for(const [cx,cz] of [[50,-50],[150,75],[150,112]]){
    for(const dx of [-28,-14,0,14,28])for(const dz of [-17,17])make('banco',cx+dx,cz+dz);
    for(const dx of [-15,-10,10,15])make('reja',cx+dx,cz-21);
    make('puesto',cx+26,cz);make('cartel',cx-25,cz+5);
    for(const [type,dx,dz] of [['flores',-26,-5],['ropa',25,8],['carrito',-22,8],['revistas',12,-24]])if(usable(cx+dx,cz+dz))make(type,cx+dx,cz+dz);
    for(const dx of [-26,0,26])make('papelera',cx+dx,cz+22);
  }
  for(let z=-270;z<300;z+=18)if(!world.roads.some(n=>Math.abs(n-z)<15)){make('banco',world.canalX+10.5,z,Math.PI/2);make('papelera',world.canalX+10.5,z+4);}
  for(const [x,z] of [[-89,176],[38,-88],[162,90]]){make('flores',x,z);make('ropa',x,z+7);make('carrito',x,z-7);for(const dx of [-4,4])make('bolardo',x+dx,z+11);}
  // Immediately visible, reachable props beside all three starting locations.
  cafe(-97,175);
  for(const [x,z] of [[50,-108],[150,113]]){make('cartel',x-5,z);make('reja',x+5,z);make('maceta',x+8,z+1);}
  }
  for(const [i,person] of world.people.filter(p=>p.walk).filter((_,i)=>i%9===0).entries()){
    const p=make(i%2?'bandeja':'bolsa',.7,.15,0,person.mesh);p.owner=person;
  }
  const batches=[];const zero=new THREE.Matrix4().makeScale(0,0,0);
  for(const items of groups.values()){
    const batch=new THREE.InstancedMesh(items[0].mesh.geometry,items[0].mesh.material,items.length);batch.castShadow=false;batch.receiveShadow=true;batch.frustumCulled=false;scene.add(batch);batches.push({batch,items});
  }
  function update(){
    if(dirty)for(const p of props)if(!p.carried)p.mesh.updateWorldMatrix(true,true);
    for(const p of props)if(p.carried){p.mesh.updateWorldMatrix(true,true);const v=p.mesh.getWorldPosition(new THREE.Vector3());p.x=v.x;p.z=v.z;}
    for(const {batch,items} of batches){let changed=false;items.forEach(({prop,mesh},i)=>{
      if(!dirty&&!prop.carried)return;
      batch.setMatrixAt(i,!prop.broken&&prop.mesh.visible&&(!prop.owner||prop.owner.mesh.visible)?mesh.matrixWorld:zero);changed=true;
    });if(changed)batch.instanceMatrix.needsUpdate=true;}
    dirty=false;
  }
  function reset(){for(const p of props){p.broken=false;p.mesh.visible=true;}dirty=true;update();}
  update();for(const p of props)if(!p.carried)p.mesh.removeFromParent();
  return {props,update,reset,drawCalls:batches.length};
}
