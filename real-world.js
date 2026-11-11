import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
import {buildNetwork,project} from './real-network.js?v=0.32';

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
    const points=b.node_ids.map(id=>network.nodes.get(id)).filter(Boolean);if(points.length<4)continue;
    const xs=points.map(p=>p.x),zs=points.map(p=>p.z),bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
    const levels=parseFloat(b.levels),height=parseFloat(b.height),h=Number.isFinite(height)?height:Number.isFinite(levels)?levels*3.2:11;
    buildings.push({name:b.name,osmId:b.osm_id,points,bounds,height:Math.max(3,Math.min(100,h)),heightEstimated:!Number.isFinite(height)&&!Number.isFinite(levels)});
  }
  // Where OSM has no footprint, add clearly estimated infill alongside streets.
  // Every corner must clear mapped roads, water and surveyed building footprints.
  let generated=0;
  for(let x=Math.ceil(nw.x/23)*23;x<se.x;x+=23)for(let z=Math.ceil(nw.z/23)*23;z<se.z;z+=23){
    const p={x,z}, corners=[{x:x-6,z:z-6},{x:x+6,z:z-6},{x:x+6,z:z+6},{x:x-6,z:z+6}];
    let nearest=Infinity,clear=true;
    for(const segment of network.segments){
      if(Math.abs((segment.a.x+segment.b.x)/2-x)>segment.length/2+30||Math.abs((segment.a.z+segment.b.z)/2-z)>segment.length/2+30)continue;
      const d=distance(p,segment.a,segment.b);nearest=Math.min(nearest,d);
      if(corners.some(c=>distance(c,segment.a,segment.b)<width(segment)/2+2)){clear=false;break;}
    }
    if(!clear||nearest>30||nearest<10||network.water.some(s=>distance(p,s.a,s.b)<20))continue;
    if(buildings.some(b=>x+8>=b.bounds.minX&&x-8<=b.bounds.maxX&&z+8>=b.bounds.minZ&&z-8<=b.bounds.maxZ))continue;
    const pts=[...corners,corners[0]],seed=Math.abs(Math.round(x*17+z*31)),h=9+(seed%8)*3;
    buildings.push({name:'',osmId:String(1000000000+generated),points:pts,bounds:{minX:x-6,maxX:x+6,minZ:z-6,maxZ:z+6},height:h,heightEstimated:true,infill:true});generated++;
  }
  const bridges=network.segments.filter(s=>s.bridge==='yes');
  function blocked(x,z){
    if(x<nw.x||x>se.x||z<nw.z||z>se.z)return true;
    const p={x,z};
    for(const b of buildings){const q=b.bounds;if(x>=q.minX&&x<=q.maxX&&z>=q.minZ&&z<=q.maxZ&&inside(p,b.points))return true;}
    if(network.water.some(s=>distance(p,s.a,s.b)<5)&&!bridges.some(s=>distance(p,s.a,s.b)<width(s)/2+2))return true;
    return false;
  }
  function createScene(){
    const root=new THREE.Group();root.name='Cordoba_OSM_escala_metros';
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(se.x-nw.x+100,se.z-nw.z+100),new THREE.MeshStandardMaterial({color:'#b5aa94',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set((nw.x+se.x)/2,-.12,(nw.z+se.z)/2);root.add(ground);
    function roadMesh(segments,color,y,getWidth){
      const vertices=[];
      for(const s of segments){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);if(!len)continue;const w=getWidth(s)/2,nx=-dz/len*w,nz=dx/len*w;
        const a=[s.a.x+nx,y,s.a.z+nz],b=[s.a.x-nx,y,s.a.z-nz],c=[s.b.x+nx,y,s.b.z+nz],d=[s.b.x-nx,y,s.b.z-nz];vertices.push(...a,...b,...c,...b,...d,...c);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.95,side:THREE.DoubleSide}));root.add(mesh);return mesh;
    }
    roadMesh(network.water,'#59939b',-.02,()=>10).name='Arroyo_La_Canada';
    roadMesh(network.segments,'#646769',.01,width).name='Calzadas_OSM';
    const palette=['#e7cfaa','#d0b199','#ded7c4','#dfb8a1','#c5c0ae','#e2cda6'],groups=palette.map(()=>[]);
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
      const points=b.points.slice(0,-1);if(points.length<3)continue;const shape=new THREE.Shape();shape.moveTo(points[0].x,-points[0].z);for(const p of points.slice(1))shape.lineTo(p.x,-p.z);shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:b.height,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);if(geometry.index){const non=geometry.toNonIndexed();geometry.dispose();groups[Number(b.osmId)%groups.length].push(non);}else groups[Number(b.osmId)%groups.length].push(geometry);
    }
    groups.forEach((geometries,i)=>{if(!geometries.length)return;const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(geometry){const buildingMaterial=new THREE.MeshStandardMaterial({color:palette[i],roughness:.9,...(facade?{map:facade,emissive:'#000000',emissiveMap:litWindows,emissiveIntensity:0}:{})});buildingMaterial.name='Fachada_Lod_Real_'+i;const m=new THREE.Mesh(geometry,buildingMaterial);m.name='Edificios_OSM_'+i;m.receiveShadow=true;root.add(m);}});
    const posts=[],lamps=[];
    for(const seg of network.segments){if(seg.length<30||posts.length>=100)continue;const x=(seg.a.x+seg.b.x)/2-((seg.b.z-seg.a.z)/seg.length)*7,z=(seg.a.z+seg.b.z)/2+((seg.b.x-seg.a.x)/seg.length)*7;if(blocked(x,z)||posts.some(p=>Math.hypot(p.x-x,p.z-z)<38))continue;posts.push({x,z});}
    const poleGeo=new THREE.CylinderGeometry(.1,.13,6,6),bulbGeo=new THREE.SphereGeometry(.22,6,4),poleMaterial=new THREE.MeshStandardMaterial({color:'#394647',roughness:.7}),bulbMaterial=new THREE.MeshStandardMaterial({color:'#fff1cb',emissive:'#000000',emissiveIntensity:0});bulbMaterial.name='Farola_Luz_Real';
    const poles=new THREE.InstancedMesh(poleGeo,poleMaterial,posts.length),bulbs=new THREE.InstancedMesh(bulbGeo,bulbMaterial,posts.length),dummy=new THREE.Object3D();
    posts.forEach((p,i)=>{dummy.position.set(p.x,3,p.z);dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix);dummy.position.y=6;dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);lamps.push({x:p.x,y:6,z:p.z});});root.add(poles,bulbs);root.userData.streetLamps=lamps;
    return root;
  }
  return {network,buildings,bridges,blocked,createScene};
}
