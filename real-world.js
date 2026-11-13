import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {buildNetwork,project,nearestSegment} from './real-network.js?v=0.35';

// OSM positions are projected at approximately one world unit per metre.
// Building heights are estimated only where the source has no height/levels.
function distance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
function width(segment){return ['primary','secondary','trunk'].includes(segment.highway)?13:['tertiary','primary_link','secondary_link'].includes(segment.highway)?11:8;}
export function createRealWorld(data){
  const network=buildNetwork(data),buildings=[];
  const nw=project(data.bbox[3],data.bbox[0]),se=project(data.bbox[1],data.bbox[2]);
  const inBounds=p=>p.x>=nw.x&&p.x<=se.x&&p.z>=nw.z&&p.z<=se.z;
  network.segments=network.segments.filter(s=>inBounds(s.a)&&inBounds(s.b));
  network.water=network.water.filter(s=>inBounds(s.a)&&inBounds(s.b));
  for(const id of network.adj.keys())network.adj.set(id,[]);
  for(const s of network.segments){if(s.oneway!=='-1')network.adj.get(s.from).push({to:s.to,length:s.length});if(!['yes','1','true'].includes(s.oneway))network.adj.get(s.to).push({to:s.from,length:s.length});}

  for(const b of data.buildings){
    if(b.osm_id==='753327795'||(Number(b.osm_id)>=1094996312&&Number(b.osm_id)<=1094996343))continue; // museum is underground; plaza sculptures are modelled separately
    const points=b.node_ids.map(id=>network.nodes.get(id)).filter(Boolean);if(points.length<4)continue;
    const xs=points.map(p=>p.x),zs=points.map(p=>p.z),bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
    const levels=parseFloat(b.levels),height=parseFloat(b.height);let h=Number.isFinite(height)?height:Number.isFinite(levels)?levels*3.2:11;if(!b.name&&Math.min(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ)<5.5)h=Math.min(h,12);
    // Some OSM footprints overlap a mapped road: never put a solid building
    // over the centre of a street the player and traffic have to use.
    const overlapsRoad=network.segments.some(s=>{
      const margin=width(s)/2;if(Math.max(s.a.x,s.b.x)+margin<bounds.minX||Math.min(s.a.x,s.b.x)-margin>bounds.maxX||Math.max(s.a.z,s.b.z)+margin<bounds.minZ||Math.min(s.a.z,s.b.z)-margin>bounds.maxZ)return false;
      const steps=Math.max(1,Math.ceil(s.length/2)),nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length;
      for(let i=0;i<=steps;i++){const t=i/steps;for(const offset of [-margin,0,margin])if(inside({x:s.a.x+(s.b.x-s.a.x)*t+nx*offset,z:s.a.z+(s.b.z-s.a.z)*t+nz*offset},points))return true;}return false;
    });
    if(!overlapsRoad)buildings.push({name:b.name,osmId:b.osm_id,points,bounds,height:Math.max(3,Math.min(100,h)),heightEstimated:!Number.isFinite(height)&&!Number.isFinite(levels)});
  }
  // Where OSM has no footprint, add clearly estimated infill alongside streets.
  // Every corner must clear mapped roads, water and surveyed building footprints.
  const pastor=project(-31.42384393333333,-64.18665391666667),plaza=project(-31.428586006666666,-64.18491475111111);
  const greenPolygons=(data.greens||[]).map(area=>area.node_ids.map(id=>network.nodes.get(id)).filter(Boolean)).filter(points=>points.length>=4);
  let generated=0;
  for(let x=Math.ceil(nw.x/23)*23;x<se.x;x+=23)for(let z=Math.ceil(nw.z/23)*23;z<se.z;z+=23){
    if(Math.hypot(x-pastor.x,z-pastor.z)<42||Math.hypot(x-plaza.x,z-plaza.z)<55||greenPolygons.some(poly=>inside({x,z},poly)))continue;
    const p={x,z}, corners=[{x:x-6,z:z-6},{x:x+6,z:z-6},{x:x+6,z:z+6},{x:x-6,z:z+6}];
    let nearest=Infinity,clear=true;
    for(const segment of network.segments){
      if(Math.abs((segment.a.x+segment.b.x)/2-x)>segment.length/2+62||Math.abs((segment.a.z+segment.b.z)/2-z)>segment.length/2+62)continue;
      const d=distance(p,segment.a,segment.b);nearest=Math.min(nearest,d);
      if(corners.some(c=>distance(c,segment.a,segment.b)<width(segment)/2+2)){clear=false;break;}
    }
    if(!clear||nearest>60||nearest<10||network.water.some(s=>distance(p,s.a,s.b)<20))continue;
    if(buildings.some(b=>x+8>=b.bounds.minX&&x-8<=b.bounds.maxX&&z+8>=b.bounds.minZ&&z-8<=b.bounds.maxZ))continue;
    const pts=[...corners,corners[0]],seed=Math.abs(Math.round(x*17+z*31)),h=9+(seed%8)*3;
    buildings.push({name:'',osmId:String(1000000000+generated),points:pts,bounds:{minX:x-6,maxX:x+6,minZ:z-6,maxZ:z+6},height:h,heightEstimated:true,infill:true});generated++;
  }
  // Carve small passages only from estimated buildings, never mapped landmarks.
  // The two wings are the actual collision footprint, leaving the arcade open.
  const galleries=[];
  for(const target of [project(-31.41978,-64.18805),pastor]){
    const candidates=buildings.filter(b=>b.infill).sort((a,b)=>Math.hypot((a.bounds.minX+a.bounds.maxX)/2-target.x,(a.bounds.minZ+a.bounds.maxZ)/2-target.z)-Math.hypot((b.bounds.minX+b.bounds.maxX)/2-target.x,(b.bounds.minZ+b.bounds.maxZ)/2-target.z));
    for(const b of candidates){const x=(b.bounds.minX+b.bounds.maxX)/2,z=(b.bounds.minZ+b.bounds.maxZ)/2;if(galleries.some(g=>Math.hypot(g.x-x,g.z-z)<100))continue;
      const snap=nearestSegment(network,{x,z});if(!snap||snap.distance>28)continue;const axis=Math.abs(snap.point.x-x)>Math.abs(snap.point.z-z)?'x':'z';
      const otherBlocked=(px,pz)=>buildings.some(o=>o!==b&&px>=o.bounds.minX&&px<=o.bounds.maxX&&pz>=o.bounds.minZ&&pz<=o.bounds.maxZ&&inside({x:px,z:pz},o.points));
      let clear=true;for(let t=0;t<=1;t+=.1)if(otherBlocked(x+(snap.point.x-x)*t,z+(snap.point.z-z)*t)){clear=false;break;}if(!clear)continue;
      const wing=(minX,maxX,minZ,maxZ,n)=>{const pts=[{x:minX,z:minZ},{x:maxX,z:minZ},{x:maxX,z:maxZ},{x:minX,z:maxZ},{x:minX,z:minZ}];return {...b,osmId:String(Number(b.osmId)+n),points:pts,bounds:{minX,maxX,minZ,maxZ},galleryWing:true};};
      buildings.splice(buildings.indexOf(b),1);if(axis==='x')buildings.push(wing(x-6,x+6,z-6,z-3.2,1),wing(x-6,x+6,z+3.2,z+6,2));else buildings.push(wing(x-6,x-3.2,z-6,z+6,1),wing(x+3.2,x+6,z-6,z+6,2));
      galleries.push({x,z,axis,name:galleries.length?'GALERÍA NUEVA CÓRDOBA':'GALERÍA DEL CENTRO'});break;
    }
  }
  const bridges=network.segments.filter(s=>s.bridge==='yes');
  // Only test nearby footprints on every movement frame.
  const cellSize=50,buildingGrid=new Map();
  for(const building of buildings){const b=building.bounds;for(let x=Math.floor(b.minX/cellSize);x<=Math.floor(b.maxX/cellSize);x++)for(let z=Math.floor(b.minZ/cellSize);z<=Math.floor(b.maxZ/cellSize);z++){const key=x+':'+z;if(!buildingGrid.has(key))buildingGrid.set(key,[]);buildingGrid.get(key).push(building);}}
  function blocked(x,z){
    if(x<nw.x||x>se.x||z<nw.z||z>se.z)return true;
    const p={x,z};
    if(Math.abs(x-pastor.x)<11&&z>pastor.z-14&&z<pastor.z+7)return true;
    for(const b of buildingGrid.get(Math.floor(x/cellSize)+':'+Math.floor(z/cellSize))||[]){const q=b.bounds;if(x>=q.minX&&x<=q.maxX&&z>=q.minZ&&z<=q.maxZ&&inside(p,b.points))return true;}
    if(network.water.some(s=>distance(p,s.a,s.b)<5)&&!bridges.some(s=>distance(p,s.a,s.b)<width(s)/2+2))return true;
    return false;
  }
  // Fill some genuinely open gaps with walk-through, roofed shopping passages.
  // Their entire footprint must clear the buildings, water and road carriageway.
  for(const target of [project(-31.41978,-64.18805),project(-31.4218,-64.1891),pastor,project(-31.4260,-64.1860),plaza]){
    const options=network.segments.filter(s=>s.length>=24&&s.tunnel!=='yes'&&s.bridge!=='yes').sort((a,b)=>Math.hypot((a.a.x+a.b.x)/2-target.x,(a.a.z+a.b.z)/2-target.z)-Math.hypot((b.a.x+b.b.x)/2-target.x,(b.a.z+b.b.z)/2-target.z));
    let chosen=null;
    for(const s of options){if(Math.hypot((s.a.x+s.b.x)/2-target.x,(s.a.z+s.b.z)/2-target.z)>260)break;const dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length;
      for(const side of [-1,1]){const offset=width(s)/2+8,x=(s.a.x+s.b.x)/2-side*dz*offset,z=(s.a.z+s.b.z)/2+side*dx*offset;
        if(galleries.some(g=>Math.hypot(g.x-x,g.z-z)<60))continue;let clear=true;
        for(let along=-12;along<=12&&clear;along+=3)for(const across of [-3,0,3]){const px=x+dx*along-dz*across,pz=z+dz*along+dx*across,snap=nearestSegment(network,{x:px,z:pz});if(blocked(px,pz)||snap.distance<width(snap.segment)/2+1){clear=false;break;}}
        if(clear){chosen={x,z,axis:'path',dx,dz,length:24,name:'PASEO COMERCIAL'};break;}
      }if(chosen)break;
    }if(chosen)galleries.push(chosen);
  }
  function createScene(){
    const root=new THREE.Group();root.name='Cordoba_OSM_escala_metros';
    // The terrain has a real opening following the mapped creek so the water
    // sits below the street rather than being painted over it.
    const outer=[new THREE.Vector2(nw.x-50,-nw.z+50),new THREE.Vector2(se.x+50,-nw.z+50),new THREE.Vector2(se.x+50,-se.z-50),new THREE.Vector2(nw.x-50,-se.z-50)];
    if(!THREE.ShapeUtils.isClockWise(outer))outer.reverse();const groundShape=new THREE.Shape(outer),chains=[];let chain=[];
    for(const segment of network.water){if(chain.length&&chain[chain.length-1].to!==segment.from){chains.push(chain);chain=[];}chain.push(segment);}if(chain.length)chains.push(chain);
    for(const segments of chains){const points=[segments[0].a,...segments.map(s=>s.b)],left=[],right=[];for(let i=0;i<points.length;i++){const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],dx=after.x-before.x,dz=after.z-before.z,len=Math.hypot(dx,dz)||1;left.push(new THREE.Vector2(points[i].x-dz/len*6.3,-(points[i].z+dx/len*6.3)));right.push(new THREE.Vector2(points[i].x+dz/len*6.3,-(points[i].z-dx/len*6.3)));}
      const hole=[...left,...right.reverse()];if(THREE.ShapeUtils.isClockWise(hole))hole.reverse();groundShape.holes.push(new THREE.Path(hole));}
    const groundGeometry=new THREE.ShapeGeometry(groundShape),pos=groundGeometry.attributes.position,uv=groundGeometry.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)-nw.x)/(se.x-nw.x),(-pos.getY(i)-nw.z)/(se.z-nw.z));groundGeometry.rotateX(-Math.PI/2);
    const ground=new THREE.Mesh(groundGeometry,new THREE.MeshStandardMaterial({color:'#b9b6ad',roughness:1,side:THREE.DoubleSide}));ground.position.y=-.12;ground.name='Suelo_Real';root.add(ground);
    // Mapped green areas sit above terrain and below roads.
    const greenAreas=[];for(const area of data.greens||[]){const points=area.node_ids.map(id=>network.nodes.get(id)).filter(Boolean);if(points.length<4)continue;const shape=new THREE.Shape();shape.moveTo(points[0].x,-points[0].z);for(const p of points.slice(1))shape.lineTo(p.x,-p.z);shape.closePath();const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);greenAreas.push(g);}
    if(greenAreas.length){const g=mergeGeometries(greenAreas,false);greenAreas.forEach(x=>x.dispose());if(g){const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#739659',roughness:1,side:THREE.DoubleSide}));m.position.y=-.075;m.name='Areas_Verdes_OSM';root.add(m);}}
    function roadMesh(segments,color,y,getWidth){
      const vertices=[],uv=[];
      for(const s of segments){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);if(!len)continue;const w=getWidth(s)/2,nx=-dz/len*w,nz=dx/len*w;
        const a=[s.a.x+nx,y,s.a.z+nz],b=[s.a.x-nx,y,s.a.z-nz],c=[s.b.x+nx,y,s.b.z+nz],d=[s.b.x-nx,y,s.b.z-nz];vertices.push(...a,...b,...c,...b,...d,...c);for(const v of [a,b,c,b,d,c])uv.push(v[0]*.045,v[2]*.045);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.95,side:THREE.DoubleSide}));root.add(mesh);return mesh;
    }
    roadMesh(network.water,'#5b9ba3',-1.75,()=>10.7).name='Arroyo_La_Canada';
    roadMesh(network.segments,'#646769',.01,width).name='Calzadas_OSM';
    // Low stone retaining walls follow both banks and leave actual bridge gaps.
    const wallParts=[];
    for(const segment of network.water){const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z,n=Math.max(1,Math.ceil(segment.length/2.5)),ux=dx/segment.length,uz=dz/segment.length;
      for(let i=0;i<n;i++){const t=(i+.5)/n,c={x:segment.a.x+dx*t,z:segment.a.z+dz*t};if(bridges.some(b=>distance(c,b.a,b.b)<width(b)/2+1.5))continue;
        for(const side of [-1,1])wallParts.push({x:c.x-side*uz*5.65,z:c.z+side*ux*5.65,angle:Math.atan2(dx,dz),length:segment.length/n+.08});
      }
    }
    const wallGeo=new THREE.BoxGeometry(1,1,1),wallMat=new THREE.MeshStandardMaterial({color:'#9b9b88',roughness:.95}),capMat=new THREE.MeshStandardMaterial({color:'#c4bea9',roughness:.9}),wall=new THREE.InstancedMesh(wallGeo,wallMat,wallParts.length),cap=new THREE.InstancedMesh(wallGeo,capMat,wallParts.length),wallDummy=new THREE.Object3D();wall.name='Muros_La_Canada';cap.name='Bordes_La_Canada';
    wallParts.forEach((p,i)=>{wallDummy.position.set(p.x,-.84,p.z);wallDummy.rotation.set(0,p.angle,0);wallDummy.scale.set(1.3,2,p.length);wallDummy.updateMatrix();wall.setMatrixAt(i,wallDummy.matrix);wallDummy.position.y=.17;wallDummy.scale.set(1.5,.17,p.length);wallDummy.updateMatrix();cap.setMatrixAt(i,wallDummy.matrix);});root.add(wall,cap);root.userData.canalWalls=wallParts;

    // Pavement is drawn alongside mapped road segments. Segments are shortened
    // at their ends so the raised edges do not cross the actual intersections.
    const sidewalks=[],curbs=[];
    for(const seg of network.segments){if(seg.length<10||seg.tunnel==='yes')continue;const dx=(seg.b.x-seg.a.x)/seg.length,dz=(seg.b.z-seg.a.z)/seg.length,off=width(seg)/2+1.6;
      for(const side of [-1,1])for(let d=3;d<seg.length-3;d+=5){const end=Math.min(d+5,seg.length-3),a={x:seg.a.x+dx*d-side*dz*off,z:seg.a.z+dz*d+side*dx*off},b={x:seg.a.x+dx*end-side*dz*off,z:seg.a.z+dz*end+side*dx*off},mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
        if(blocked(a.x,a.z)||blocked(b.x,b.z)||blocked(mid.x,mid.z))continue;
        if(network.segments.some(other=>other!==seg&&Math.abs((other.a.x+other.b.x)/2-mid.x)<other.length/2+12&&Math.abs((other.a.z+other.b.z)/2-mid.z)<other.length/2+12&&distance(mid,other.a,other.b)<width(other)/2+1))continue;
        sidewalks.push({a,b});curbs.push({a:{x:a.x+side*dz*1.48,z:a.z-side*dx*1.48},b:{x:b.x+side*dz*1.48,z:b.z-side*dx*1.48}});}
    }
    const sidewalk=roadMesh(sidewalks,'#d0c6b5',.055,()=>3.1);sidewalk.name='Veredas_Reales';
    if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#dfd9cc';ctx.fillRect(0,0,256,256);ctx.fillStyle='#a9a69f';for(let i=0;i<256;i+=16){ctx.fillRect(i,0,1,256);ctx.fillRect(0,i,256,1);}const tiles=new THREE.CanvasTexture(c);tiles.wrapS=tiles.wrapT=THREE.RepeatWrapping;tiles.colorSpace=THREE.SRGBColorSpace;sidewalk.material.map=tiles;sidewalk.material.needsUpdate=true;}
    roadMesh(curbs,'#f1eadb',.075,()=>.16).name='Cordones_De_Vereda';
    // Segmented centre lines keep the streets legible without blocking crossings.
    const markings=[];
    for(const seg of network.segments){if(seg.length<25||seg.tunnel==='yes')continue;const dx=(seg.b.x-seg.a.x)/seg.length,dz=(seg.b.z-seg.a.z)/seg.length;
      for(let d=9;d<seg.length-9;d+=11)markings.push({a:{x:seg.a.x+dx*d,z:seg.a.z+dz*d},b:{x:seg.a.x+dx*(d+3),z:seg.a.z+dz*(d+3)}});
    }
    roadMesh(markings,'#eee7d5',.075,()=>.18).name='Marcas_Viales_Reales';

    const palette=['#e7cfaa','#d0b199','#ded7c4','#dfb8a1','#c5c0ae','#e2cda6'],groups=palette.map(()=>[]),roofs=[];
    let facade=null,litWindows=null;
    if(typeof document!=='undefined'){
      const c=document.createElement('canvas');c.width=c.height=256;const p=c.getContext('2d');p.fillStyle='#f2e5d1';p.fillRect(0,0,256,256);
      for(let y=12;y<256;y+=64)for(let x=10;x<256;x+=64){p.fillStyle='#938a7c';p.fillRect(x-3,y-3,44,51);p.fillStyle='#4b7482';p.fillRect(x,y,38,45);p.fillStyle='#91b7bc';p.fillRect(x+2,y+2,13,20);p.fillStyle='#ddd8c9';p.fillRect(x+18,y,2,45);p.fillRect(x,y+22,38,2);p.fillRect(x-4,y+45,46,4);}
      facade=new THREE.CanvasTexture(c);facade.wrapS=facade.wrapT=THREE.RepeatWrapping;facade.repeat.set(.075,.075);facade.colorSpace=THREE.SRGBColorSpace;
      const nc=document.createElement('canvas');nc.width=nc.height=256;const q=nc.getContext('2d');q.fillStyle='#000';q.fillRect(0,0,256,256);
      for(let y=12;y<256;y+=64)for(let x=10;x<256;x+=64)if((x*7+y*3)%5!==0){q.fillStyle='#ffc876';q.fillRect(x+1,y+1,36,43);}
      litWindows=new THREE.CanvasTexture(nc);litWindows.wrapS=litWindows.wrapT=THREE.RepeatWrapping;litWindows.repeat.set(.075,.075);litWindows.colorSpace=THREE.SRGBColorSpace;
    }
    for(const b of buildings){
      if(b.osmId==='1126847036'||b.osmId==='1356799523')continue;
      const points=b.points.slice(0,-1);if(points.length<3)continue;const shape=new THREE.Shape();shape.moveTo(points[0].x,-points[0].z);for(const p of points.slice(1))shape.lineTo(p.x,-p.z);shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:b.height,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);
      const non=geometry.index?geometry.toNonIndexed():geometry;
      for(const part of non.groups){const piece=new THREE.BufferGeometry();for(const [name,attribute] of Object.entries(non.attributes)){const start=part.start*attribute.itemSize,end=(part.start+part.count)*attribute.itemSize;piece.setAttribute(name,new THREE.BufferAttribute(attribute.array.slice(start,end),attribute.itemSize,attribute.normalized));}(part.materialIndex===0?roofs:groups[Number(b.osmId)%groups.length]).push(piece);}
      if(non!==geometry)non.dispose();geometry.dispose();
    }
    if(roofs.length){const roofGeometry=mergeGeometries(roofs,false);roofs.forEach(g=>g.dispose());if(roofGeometry){const roofMesh=new THREE.Mesh(roofGeometry,new THREE.MeshStandardMaterial({color:'#b5ab99',roughness:.95}));roofMesh.name='Techos_Cordoba';roofMesh.receiveShadow=true;root.add(roofMesh);}}
    groups.forEach((geometries,i)=>{if(!geometries.length)return;const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(geometry){const buildingMaterial=new THREE.MeshStandardMaterial({color:palette[i],roughness:.9,...(facade?{map:facade,emissive:'#000000',emissiveMap:litWindows,emissiveIntensity:0}:{})});buildingMaterial.name='Fachada_Lod_Real_'+i;const m=new THREE.Mesh(geometry,buildingMaterial);m.name='Edificios_OSM_'+i;m.receiveShadow=true;root.add(m);}});
    root.userData.landmarkPositions={pastor,plaza};
    const posts=[],lamps=[];
    for(const seg of network.segments){if(seg.length<30||posts.length>=100)continue;const x=(seg.a.x+seg.b.x)/2-((seg.b.z-seg.a.z)/seg.length)*7,z=(seg.a.z+seg.b.z)/2+((seg.b.x-seg.a.x)/seg.length)*7;if(blocked(x,z)||posts.some(p=>Math.hypot(p.x-x,p.z-z)<38))continue;posts.push({x,z});}
    const poleGeo=new THREE.CylinderGeometry(.1,.13,6,6),bulbGeo=new THREE.SphereGeometry(.22,6,4),poleMaterial=new THREE.MeshStandardMaterial({color:'#394647',roughness:.7}),bulbMaterial=new THREE.MeshStandardMaterial({color:'#fff1cb',emissive:'#000000',emissiveIntensity:0});bulbMaterial.name='Farola_Luz_Real';
    const poles=new THREE.InstancedMesh(poleGeo,poleMaterial,posts.length),bulbs=new THREE.InstancedMesh(bulbGeo,bulbMaterial,posts.length),dummy=new THREE.Object3D();
    posts.forEach((p,i)=>{dummy.position.set(p.x,3,p.z);dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix);dummy.position.y=6;dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);lamps.push({x:p.x,y:6,z:p.z});});root.add(poles,bulbs);root.userData.streetLamps=lamps;
    return root;
  }
  return {network,buildings,bridges,galleries,blocked,createScene};
}
