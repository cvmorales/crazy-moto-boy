import * as THREE from '../vendor/three.module.js';
import {nearestSegment} from '../real-network.js?v=0.41';
import {sidewalkTop} from '../real-world.js?v=0.41';

// All vertical measurements start at the sidewalk instead of repeating
// a world-space window texture through the plinth and onto the ground.
export function addBuildingFronts(root, world) {
  const group = new THREE.Group();
  group.name = 'Fachadas_Edificios_Reales';
  root.add(group);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const batches = new Map();
  const upperWalls = [[],[],[]];
  const material = (color, options={}) => new THREE.MeshStandardMaterial({color, roughness:.84, ...options});
  const stone = material('#e0d0b6');
  const plinth = material('#918370');
  const iron = material('#353b3d', {metalness:.24});
  const wood = material('#674137');
  const terracotta = material('#aa6249');
  const leaves = material('#4c743b');
  const trim = [stone, material('#c18b69'), material('#bac2ab')];
  const glass = [material('#466675', {roughness:.31}), material('#425a64', {roughness:.26}), material('#626967', {roughness:.35})];
  const litGlass = material('#51616a', {roughness:.33});
  litGlass.name = 'Ventana_Interiores_Reales';

  function emit(mat, x, y, z, width, height, depth, angle) {
    const key = mat.uuid + ':' + Math.floor(x/180) + ':' + Math.floor(z/180);
    if (!batches.has(key)) batches.set(key, {mat,items:[]});
    batches.get(key).items.push([x, y, z, width, height, depth, angle]);
  }

  const counts = {buildings:0, entrances:0, balconies:0, windows:0, storefronts:0};
  for (const building of world.buildings) {
    if (['1126847036', '1356799523'].includes(building.osmId)) continue;
    const points = building.points.slice(0,-1);
    if (points.length < 3) continue;
    const seed = Number(building.osmId) || 0;
    const winding = Math.sign(points.reduce((area,a,i) => {
      const b = points[(i+1)%points.length];
      return area + a.x*b.z-b.x*a.z;
    },0));
    if (!winding) continue;
    const height = building.height;
    const base = sidewalkTop;
    const ground = Math.min(3.75, height-.2);
    const details = [];
    for (const [i,a] of points.entries()) {
      const b = points[(i+1)%points.length];
      const length = Math.hypot(b.x-a.x,b.z-a.z);
      if (length < .4) continue;
      const tx = (b.x-a.x)*winding/length, tz = (b.z-a.z)*winding/length;
      const nx = tz, nz = -tx;
      const x = (a.x+b.x)/2, z = (a.z+b.z)/2;
      const angle = Math.atan2(nx,nz);
      const clear = !world.blocked(x+nx*.48,z+nz*.48);
      const street = clear && length >= 1 ? nearestSegment(world.network,{x,z}) : null;
      const facing = street ? (street.point.x-x)*nx + (street.point.z-z)*nz : -1;
      const rank = (clear?0:120)+(facing>0?0:45)+(street?.distance ?? 65)-Math.min(length,18)*.36;
      details.push({x,z,tx,tz,nx,nz,length,angle,clear,rank,street,facing});
    }
    const candidates = details.filter(face => face.length >= 1);
    const front = (candidates.length ? candidates : details).reduce((best,face) => !best || face.rank<best.rank ? face : best,null);
    if (!front) continue;
    counts.buildings++;
    const frame = trim[seed%trim.length];
    const shop = building.infill && !building.galleryWing && seed%3===0 && front.length>=8 && front.facing>0 && front.street.distance<28;
    for (const face of details) {
      const {x,z,tx,tz,nx,nz,length,angle,clear} = face;
      const main = face === front;
      if (!clear && !main) continue;
      const part = (mat,along,y,out,w,h,d) => emit(mat,x+tx*along+nx*out,y,z+tz*along+nz*out,w,h,d,angle);
      part(plinth,0,base+.23,.018,length,.46,.12);
      part(frame,0,height-.12,.048,length+.06,.19,.19);
      if (height>ground+.6) part(frame,0,ground,.065,length,.15,.24);
      if (main) {
        const doorWidth = Math.min(2.25,length*.76);
        const doorHeight = Math.min(2.75,ground-base-.2);
        const doorX = shop ? length*.30 : 0;
        const y = base+doorHeight/2;
        part(frame,doorX,y,.055,doorWidth+.18,doorHeight+.16,.16);
        part(wood,doorX,y,.13,doorWidth,doorHeight,.09);
        part(glass[seed%3],doorX,y+.25,.184,doorWidth*.72,doorHeight*.58,.045);
        part(frame,doorX+doorWidth*.32,y-.08,.20,.10,.23,.07);
        const stepDepth = !face.street || face.street.distance>9 ? .7 : .32;
        part(stone,doorX,base-.07,stepDepth/2,doorWidth+.22,.14,stepDepth);
        part(iron,doorX+doorWidth*.46,y+.68,.21,.10,.20,.11);
        counts.entrances++;
        if (shop) {
          const width = Math.min(length*.57,7);
          const center = -length*.13;
          const accent = seed%2 ? terracotta : trim[2];
          part(iron,center,base+1.48,.055,width,2.65,.13);
          part(litGlass,center,base+1.48,.13,width-.20,2.41,.055);
          for (const offset of [-.33,0,.33]) part(frame,center+width*offset,base+1.48,.17,.075,2.42,.08);
          part(accent,center,base+2.99,.44,width+.2,.13,.91);
          part(accent,center,base+2.90,.89,width+.2,.20,.10);
          counts.storefronts++;
        }
      }
      if (length<1.65) continue;
      const bays = Math.max(1,Math.round(length/3.15));
      const bay = length/bays;
      if (!shop && ground>2.45) {
        for(let j=0;j<bays;j++){
          const along=(j-(bays-1)/2)*bay;
          if(main && Math.abs(along)<1.75)continue;
          const width=Math.min(bay*.56,1.36);
          part(frame,along,base+1.78,.035,width+.15,1.33,.10);
          part(glass[seed%3],along,base+1.78,.096,width,1.14,.04);
          part(frame,along,base+1.15,.08,width+.23,.12,.22);
        }
      }
      const floors = Math.floor((height-ground-.3)/2.62);
      const pitch = (height-ground-.24)/Math.max(1,floors);
      if (floors<=0) continue;
      const solidFloors=Math.min(main?3:1,floors);
      if (solidFloors<floors) {
        const low=ground+solidFloors*pitch, high=height-.24;
        const ax=x-tx*length/2+nx*.015, az=z-tz*length/2+nz*.015;
        const bx=x+tx*length/2+nx*.015, bz=z+tz*length/2+nz*.015;
        upperWalls[seed%3].push({positions:[ax,low,az,bx,low,bz,ax,high,az,bx,high,bz], bays, floors:floors-solidFloors});
        counts.windows+=bays*(floors-solidFloors);
      }
      for (let floor=0;floor<solidFloors;floor++) {
        const slab = ground+floor*pitch+.28;
        for (let j=0;j<bays;j++) {
          const along = (j-(bays-1)/2)*bay;
          const balcony = main && height>6.5 && bay>1.95 && (bays===1||((j+seed+Math.floor(floor/2))%2===0));
          const w = Math.min(bay*.62,1.94), h = balcony?2.02:1.52;
          const y = slab+(balcony?1.07:1.28);
          const pane = (seed+j+floor*3)%9<2 ? litGlass : glass[(seed+j)%glass.length];
          part(frame,along,y,.031,w+.16,h+.16,.09);
          part(pane,along,y,.082,w,h,.035);
          part(iron,along,y,.108,.047,h,.035);
          if (!balcony) part(frame,along,y-h/2-.08,.091,w+.26,.11,.25);
          counts.windows++;
          if (!balcony) continue;
          const width = Math.min(bay-.18,w+.65);
          part(frame,along,slab,.48,width,.18,1.05);
          part(iron,along,slab+1.01,.99,width,.07,.065);
          part(iron,along,slab+.28,.99,width,.055,.055);
          for (const edge of [-1,1]) {
            part(iron,along+edge*(width/2-.065),slab+.57,.98,.055,.88,.06);
            part(iron,along+edge*(width/2-.065),slab+1.01,.54,.065,.07,.91);
          }
          if ((seed+j+floor)%4===0) {
            part(terracotta,along+width*.26,slab+.22,.72,.48,.26,.32);
            part(leaves,along+width*.26,slab+.43,.72,.42,.25,.30);
          }
          counts.balconies++;
        }
      }
    }
  }
  if (typeof document!=='undefined') {
    for (const [index,walls] of upperWalls.entries()) {
      const c=document.createElement('canvas');c.width=128;c.height=128;
      const p=c.getContext('2d');
      p.fillStyle=['#d8b789','#b98570','#dcd3bc'][index];p.fillRect(0,0,128,128);
      p.fillStyle='#61564e';p.fillRect(24,23,80,76);
      p.fillStyle='#b8aa90';p.fillRect(28,25,72,70);
      p.fillStyle='#405962';p.fillRect(32,29,64,62);
      p.fillStyle='#88a0a0';p.fillRect(35,32,18,37);
      p.fillStyle='#b9b4a2';p.fillRect(62,29,4,62);p.fillRect(32,60,64,3);
      p.fillStyle='#e1cbb0';p.fillRect(21,96,86,5);
      const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
      const positions=[],uv=[];
      for (const wall of walls) {
        for(const i of [0,2,1,1,2,3])positions.push(...wall.positions.slice(i*3,i*3+3));
        uv.push(0,0,0,wall.floors,wall.bays,0,wall.bays,0,0,wall.floors,wall.bays,wall.floors);
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,material('#ffffff',{map:texture}));
      mesh.name='Ventanas_Altas_Alineadas';mesh.receiveShadow=true;group.add(mesh);
    }
  }
  for (const {mat,items} of batches.values()) {
    const mesh = new THREE.InstancedMesh(box,mat,items.length);
    mesh.name = 'Piezas_De_Fachada';
    mesh.receiveShadow = true;
    items.forEach(([x,y,z,w,h,d,angle],i) => {
      dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.y=angle;
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });
    group.add(mesh);
  }
  root.userData.buildingFronts = counts;
}
