import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {HDRLoader} from './vendor/addons/loaders/HDRLoader.js';
import {clone as cloneRig} from './vendor/addons/utils/SkeletonUtils.js';
import {poseCourierDriver} from './art/courier-pose.js?v=0.41';
import {Sky} from './vendor/addons/Sky.js';
import {createCourierMotorcycle} from './art/courier-motorcycle.js?v=0.41';
import {createCordobaArchitecture,batchStaticArchitecture} from './art/cordoba-architecture.js?v=0.41';
import {createCanopyStreet} from './art/cordoba-landscape.js?v=0.41';

export async function loadDistrict({renderer,scene,camera,cityWorld,cars,vehicleBatches,bike,lean,riderModel,passengerModel,material,getState,mobile=false}) {
  const gltf=new GLTFLoader(),textures=new THREE.TextureLoader();
  const loadModel=name=>gltf.loadAsync(`./assets/models/${name}.glb`);
  const textureJobs=[
    ...['calicanto','stucco','paving'].map(name=>cityWorld.real&&name!=='calicanto'?null:textures.loadAsync('./assets/textures/'+name+'-color.jpg')),
    ...['brick','tile'].map(name=>cityWorld.real?null:textures.loadAsync('./assets/textures/facade-'+name+'.jpg'))
  ];
  const [hoodie,casual,woman,punk,man,man2,car,suv,bus,sport,modern,environment,roadColor,roadNormal,roadRough,
    calicanto,stucco,paving,facadeBrick,facadeTile]=await Promise.all([
    ...['hoodie','casual','woman','punk','man','man2','car','suv','bus','sport','modern-sedan'].map(loadModel),
    new HDRLoader().loadAsync('./assets/textures/daylight.hdr'),
    textures.loadAsync('./assets/textures/asphalt-color.jpg'),textures.loadAsync('./assets/textures/asphalt-normal.jpg'),textures.loadAsync('./assets/textures/asphalt-rough.jpg'),
    ...textureJobs
  ]);
  const pmrem=new THREE.PMREMGenerator(renderer);const lightmap=pmrem.fromEquirectangular(environment).texture;
  scene.environment=lightmap;scene.environmentIntensity=.48;environment.dispose();pmrem.dispose();
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const maxPixelRatio=mobile?.92:1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,maxPixelRatio));
  renderer.shadowMap.autoUpdate=false;
  for(const l of scene.children)if(l.isDirectionalLight){
    const shadowSize=mobile?512:1024;l.shadow.mapSize.set(shadowSize,shadowSize);
    Object.assign(l.shadow.camera,{left:-75,right:75,top:75,bottom:-75});l.shadow.camera.updateProjectionMatrix();
  }
  scene.fog=new THREE.Fog('#d8c9b0',mobile?155:190,mobile?410:720);
  scene.background=new THREE.Color('#70bce9');
  roadColor.colorSpace=THREE.SRGBColorSpace;
  for(const t of [roadColor,roadNormal,roadRough]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}
  for(const t of [calicanto,stucco,paving]){if(!t)continue;t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=mobile?2:8;}
  const architecture=cityWorld.real?cityWorld.realArt:createCordobaArchitecture(cityWorld,{calicanto,stucco,paving,facadeBrick,facadeTile,road:roadColor,roadNormal,roadRough});
  const landscape=cityWorld.real?{root:new THREE.Group(),leafMeshes:[]}:createCanopyStreet(cityWorld,{});
  if(cityWorld.real){
    const road=architecture.root.getObjectByName('Calzadas_OSM');if(road){road.material.map=roadColor;road.material.color.set('#c4c7c7');road.material.normalMap=roadNormal;road.material.roughnessMap=roadRough;road.material.normalScale=new THREE.Vector2(.3,.3);road.material.needsUpdate=true;}
    const canalWall=architecture.root.getObjectByName('Muros_La_Canada');if(canalWall){canalWall.material.map=calicanto;canalWall.material.bumpMap=calicanto;canalWall.material.bumpScale=.07;canalWall.material.color.set('#d3d0bd');canalWall.material.needsUpdate=true;}
    const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle='#d8d8d2';q.fillRect(0,0,256,256);q.strokeStyle='#abaea9';q.lineWidth=2;for(let n=0;n<=256;n+=64){q.beginPath();q.moveTo(n,0);q.lineTo(n,256);q.stroke();q.beginPath();q.moveTo(0,n);q.lineTo(256,n);q.stroke();}
    let seed=173;for(let i=0;i<1400;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;const y=seed%256;q.fillStyle=i%2?'rgba(70,70,65,.09)':'rgba(255,255,255,.18)';q.fillRect(x,y,1,1);}
    const concrete=new THREE.CanvasTexture(c);concrete.colorSpace=THREE.SRGBColorSpace;concrete.wrapS=concrete.wrapT=THREE.RepeatWrapping;
    const ground=architecture.root.getObjectByName('Suelo_Real');if(ground){const t=concrete.clone();t.repeat.set(260,260);t.needsUpdate=true;ground.material.map=t;ground.material.color.set('#8b8e83');ground.material.needsUpdate=true;}
    // Preserve the tiled sidewalk texture and keep it distinct from open ground.
    const sidewalks=architecture.root.getObjectByName('Veredas_Reales');if(sidewalks){sidewalks.material.color.set('#ded6c8');sidewalks.material.needsUpdate=true;}
  }
  cityWorld.city.visible=false;
  for(const p of cityWorld.people){scene.add(p.mesh);if(cityWorld.real)continue;if(Math.abs(p.mesh.position.x+84)<.1)p.mesh.position.x=-89.5;else{const n=cityWorld.roads.reduce((a,b)=>Math.abs(b-p.mesh.position.x)<Math.abs(a-p.mesh.position.x)?b:a);if(Math.abs(p.mesh.position.x-n)>13&&Math.abs(p.mesh.position.x-n)<17)p.mesh.position.x=n+Math.sign(p.mesh.position.x-n)*10.5;}}
  for(const p of cityWorld.breakables){if(p.carried||p.instanced)continue;scene.add(p.mesh);if(!p.parts&&p.x< -108&&p.x> -113){p.x=-106.5;p.mesh.position.x=p.x;}}
  // Detach the superseded district so Three.js stops updating its hidden hierarchy.
  cityWorld.city.removeFromParent();
  if(!cityWorld.real)for(let i=cityWorld.colliders.length-1;i>=0;i--){const c=cityWorld.colliders[i];if(!c.originalArt&&((c.x===50&&c.z===-150)||(c.x===150&&(c.z===48||c.z===150))))cityWorld.colliders.splice(i,1);}
  batchStaticArchitecture(landscape.root);landscape.leafMeshes.forEach(m=>m.castShadow=false);
  batchStaticArchitecture(architecture.root);scene.add(architecture.root,landscape.root);
  for(const object of [...scene.children]){if(object.isMesh&&object.geometry.parameters?.width===230&&object.geometry.parameters?.height===110)object.visible=false;}
  const sky=new Sky();sky.scale.setScalar(10000);sky.material.uniforms.turbidity.value=5;sky.material.uniforms.rayleigh.value=1.35;sky.material.uniforms.mieCoefficient.value=.005;sky.material.uniforms.mieDirectionalG.value=.8;sky.material.uniforms.sunPosition.value.set(-.65,.4,.64);scene.add(sky);
  for(const light of scene.children){if(light.isDirectionalLight){light.color.set('#ffe2ad');light.intensity=2.7;light.shadow.normalBias=.035;}if(light.isHemisphereLight){light.color.set('#dbe5eb');light.groundColor.set('#a89674');light.intensity=.65;}}

  function fitted(source,height,clothingColor=null,variation=0){
    const clone=cloneRig(source.scene);clone.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const scale=height/size.y;const root=new THREE.Group();clone.scale.multiplyScalar(scale);clone.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);root.add(clone);
    clone.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=true;if(m.material){m.material=m.material.clone();m.material.roughness=.78;if(clothingColor&&/^(Purple|Red_Dark|Red|LimeGreen|Shirt|Shirt2)$/i.test(m.material.name))m.material.color.set(clothingColor);if(clothingColor&&/^Skin$/i.test(m.material.name))m.material.color.set(['#f1c3a2','#d79a72','#b87553','#875138','#ecc2a1','#a96749'][variation%6]);if(clothingColor&&/^Hair2?$/i.test(m.material.name))m.material.color.set(['#34231b','#272224','#68452d','#201b1a','#a07043','#3b2723'][variation%6]);if(clothingColor&&/^(LightBlue|LightBrown|Brown|Pants)$/i.test(m.material.name))m.material.color.set(['#33485c','#665448','#252c3a','#798084','#4b4a49','#596b78'][variation%6]);}}});
    return {root,clone,scale,source};
  }
  // Details are shared by every traffic template and collected into the existing
  // instanced batches; they are placed in vehicle metres, after model fitting.
  const carDetailBox=new THREE.BoxGeometry(1,1,1);
  const carDetailMaterials={dark:new THREE.MeshStandardMaterial({color:'#242c30',roughness:.65}),chrome:new THREE.MeshStandardMaterial({color:'#b5bec0',metalness:.75,roughness:.3}),plate:new THREE.MeshStandardMaterial({color:'#e9e8da',roughness:.65})};
  const frontLens=new THREE.MeshStandardMaterial({color:'#fff2cd',emissive:'#e9c788',emissiveIntensity:.32,roughness:.27});
  const rearLens=new THREE.MeshStandardMaterial({color:'#cf282c',emissive:'#86141a',emissiveIntensity:.48,roughness:.31});
  function fitVehicle(source,length,paint){
    const model=source.scene.clone(true);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const scale=length/Math.max(size.z,size.x),root=new THREE.Group();
    model.scale.multiplyScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    if(size.x>size.z)model.rotation.y=Math.PI/2;
    else model.rotation.y=Math.PI;
    root.add(model);model.traverse(m=>{if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;
      const original=m.material;m.material=original.clone();m.material.roughness=.4;m.material.metalness=.12;m.material.envMapIntensity=.8;
      if(paint&&/^(White|LightBlue|Red_Dark|paint)$/i.test(original.name)){m.material.color.set(paint);m.material.metalness=.3;m.material.roughness=.34;}
      if(/Window|^glass/i.test(original.name)){m.material.color.set('#29475a');m.material.metalness=.35;m.material.roughness=.18;}
      if(/Headlights|^clearlens/i.test(original.name)){m.material.emissive=new THREE.Color('#e2c988');m.material.emissiveIntensity=.24;}
      if(/TailLights|^redlens/i.test(original.name)){m.material.emissive=new THREE.Color('#a3190f');m.material.emissiveIntensity=.22;}
    });
    if(paint){
      const width=Math.min(size.x,size.z)*scale, end=length*.5;
      function detail(w,h,d,x,y,z,mat){const m=new THREE.Mesh(carDetailBox,mat);m.scale.set(w,h,d);m.position.set(x,y,z);root.add(m);}
      for(const side of [-1,1]){
        const x=side*(width*.5+.015);
        detail(.055,.12,.32,x,.8,-.38,carDetailMaterials.dark);
        detail(.035,.055,.23,x,.81,.38,carDetailMaterials.chrome);
        detail(.025,.7,.035,x,.55,.12,carDetailMaterials.dark);
        detail(.15,.075,.18,x+side*.06,.97,-.78,carDetailMaterials.dark);
        detail(.20,.14,.26,x+side*.12,.98,-.83,carDetailMaterials.chrome);
        detail(width*.17,.10,.055,side*width*.33,.55,-end+.08,frontLens);
        detail(width*.16,.09,.055,side*width*.33,.53,end-.06,rearLens);
      }
      detail(width*.43,.18,.06,0,.5,-end+.025,carDetailMaterials.dark);
      for(const y of [.46,.53])detail(width*.38,.023,.055,0,y,-end-.009,carDetailMaterials.chrome);
      detail(width*.68,.065,.065,0,.26,end-.045,carDetailMaterials.dark);
      detail(.53,.15,.035,0,.4,end-.05,carDetailMaterials.plate);
      detail(.53,.15,.035,0,.4,-end+.05,carDetailMaterials.plate);
      detail(width*.58,.09,.04,0,.25,end-.03,carDetailMaterials.dark);
    }
    return root;
  }
  // Shared pieces and materials keep the richer delivery trucks batchable.
  const truckBox=new THREE.BoxGeometry(1,1,1);
  const truckWheel=new THREE.CylinderGeometry(.52,.52,.34,16);truckWheel.rotateZ(Math.PI/2);
  const truckHub=new THREE.CylinderGeometry(.26,.26,.36,12);truckHub.rotateZ(Math.PI/2);
  const truckMaterials={
    cargo:new THREE.MeshStandardMaterial({color:'#e5e3d9',roughness:.7}),
    trim:new THREE.MeshStandardMaterial({color:'#aeb6b5',roughness:.6,metalness:.22}),
    dark:new THREE.MeshStandardMaterial({color:'#252d30',roughness:.8}),
    rubber:new THREE.MeshStandardMaterial({color:'#171c1e',roughness:.95}),
    glass:new THREE.MeshStandardMaterial({color:'#547385',roughness:.18,metalness:.35}),
    lamp:new THREE.MeshStandardMaterial({color:'#fff1be',emissive:'#edc36c',emissiveIntensity:.38}),
    tail:new THREE.MeshStandardMaterial({color:'#9c3024',emissive:'#65110b',emissiveIntensity:.3}),
    hub:new THREE.MeshStandardMaterial({color:'#abb3b2',roughness:.4,metalness:.65})
  };
  function makeDeliveryTruck(paint){
    const root=new THREE.Group(),body=new THREE.MeshStandardMaterial({color:paint,roughness:.36,metalness:.24});
    const {cargo,trim,dark,rubber,glass,lamp,tail,hub}=truckMaterials;
    function part(w,h,d,x,y,z,mat){const m=new THREE.Mesh(truckBox,mat);m.scale.set(w,h,d);m.position.set(x,y,z);root.add(m);return m;}
    part(2.35,2.25,3.65,0,2.1,1.03,cargo);part(2.3,.12,3.72,0,3.25,1.03,trim);
    part(2.2,1.55,2.05,0,1.65,-1.91,body);part(2.04,.78,.045,0,2.04,-2.958,glass);
    part(.075,.78,.065,0,2.04,-2.99,dark);part(2.15,.11,.12,0,1.61,-2.99,dark);
    part(2.27,.22,.18,0,.87,-2.99,dark);part(1.2,.25,.06,0,1.2,-2.99,dark);
    for(let i=0;i<3;i++)part(1.02,.025,.025,0,1.12+i*.07,-3.035,trim);
    for(const x of [-.86,.86]){part(.32,.21,.08,x,1.24,-3.02,lamp);part(.1,.32,.36,x*1.34,2.02,-2.45,dark);}
    for(const side of [-1,1]){
      part(.035,.64,1.12,side*1.115,2.03,-1.9,glass);part(.06,.1,.44,side*1.15,1.45,-1.49,dark);
      part(.035,.07,3.4,side*1.19,1.17,1.02,trim);part(.035,.07,3.4,side*1.19,3.04,1.02,trim);
      part(.035,.12,2.95,side*1.19,2.1,1.04,body);
      part(.12,.25,.09,side*.93,1.11,2.9,tail);
    }
    part(.055,2.05,.045,0,2.08,2.88,trim);
    for(const x of [-.98,.98])part(.055,2.05,.045,x,2.08,2.88,trim);
    part(2.3,.16,.14,0,.87,2.9,dark);part(2.3,.22,5.65,0,.72,0,dark);
    for(const x of [-1.17,1.17])for(const z of [-1.85,1.65]){
      for(const [geo,mat] of [[truckWheel,rubber],[truckHub,hub]]){const m=new THREE.Mesh(geo,mat);m.position.set(x,.53,z);root.add(m);}
    }
    return root;
  }
  // Replace the primitive motorcycle, while keeping its controller and lean.
  const oldBikeMeshes=[];
  bike.traverse(m=>{if(!m.isMesh)return;for(let p=m;p&&p!==bike;p=p.parent)if(p===riderModel.mesh||p===passengerModel.mesh)return;oldBikeMeshes.push(m);});
  oldBikeMeshes.forEach(m=>m.visible=false);
  const courierMoto=createCourierMotorcycle();
  const wheelParents=courierMoto.wheelPivots.map(w=>w.parent);courierMoto.wheelPivots.forEach(w=>w.removeFromParent());batchStaticArchitecture(courierMoto.root);courierMoto.wheelPivots.forEach((w,i)=>{batchStaticArchitecture(w);wheelParents[i].add(w);});
  lean.add(courierMoto.root);
  // The source motorcycle's forward axis is -Z after fitting.
  const driver=fitted(hoodie,2.0);lean.add(driver.root);driver.root.updateMatrixWorld(true);
  poseCourierDriver(driver,lean);
  for(const child of riderModel.mesh.children)if(child!==riderModel.head&&child!==riderModel.backpack)child.visible=false;
  driver.clone.traverse(m=>{if(m.isMesh&&/Head/i.test(m.name))m.visible=false;});
  const head=driver.clone.getObjectByName('Head');if(head){driver.root.updateWorldMatrix(true,true);const p=lean.worldToLocal(head.getWorldPosition(new THREE.Vector3()));riderModel.head.position.copy(p).add(new THREE.Vector3(0,.16,0));}
  riderModel.backpack.position.y=1.82;

  // A bounded pool gives nearby citizens full skeletal animation. Farther people
  // keep a lightweight rig, preserving a busy city without hundreds of mixers.
  const crowdSources=[casual,woman,hoodie,punk,man,man2],pool=[];
  for(let i=0;i<18;i++){
    const palette=['#a54c36','#417c76','#365d91','#9b6b42','#86739e','#4d8060'];
    const source=crowdSources[i%crowdSources.length],model=fitted(source,1.68+(i%3)*.045,palette[(i*5+Math.floor(i/3))%palette.length],i);const mixer=new THREE.AnimationMixer(model.clone),actions={};
    for(const name of ['Walk','Idle','Wave']){const clip=source.animations.find(c=>c.name.endsWith('|'+name)||c.name.endsWith('_'+name));if(clip)actions[name]=mixer.clipAction(clip);}
    pool.push({...model,mixer,actions,person:null,current:null});
  }
  let lodTimer=2;
  function assignCrowd(){
    const s=getState(),candidates=cityWorld.people.filter(p=>p.mesh.visible&&!p.police).sort((a,b)=>{
      const score=p=>(p.waiting?-100000:0)+Math.hypot(p.mesh.position.x-s.x,p.mesh.position.z-s.z);
      return score(a)-score(b);
    }).slice(0,pool.length);
    cityWorld.people.forEach(p=>p.mesh.userData.highDetail=false);
    pool.forEach((slot,i)=>{
      const person=candidates[i];if(!person){slot.root.visible=false;slot.person=null;return;}
      if(slot.person!==person){person.mesh.add(slot.root);slot.root.position.set(0,0,0);slot.root.scale.setScalar(1);slot.person=person;}
      slot.root.visible=true;person.mesh.userData.highDetail=true;
      const action=person.waiting?'Wave':person.walk?'Walk':'Idle';
      if(slot.current!==action){Object.values(slot.actions).forEach(a=>a.fadeOut(.2));(slot.actions[action]||slot.actions.Idle)?.reset().fadeIn(.2).play();slot.current=action;}
    });
  }
  assignCrowd();

  // Shared imported vehicle meshes replace every primitive car, including parked
  // cars. Batching keeps this detailed traffic in a small number of draw calls.
  vehicleBatches.forEach(({batch})=>batch.visible=false);
  const templates=new Map(),premiumCars=[],vehicleGroups=new Map();
  cars.forEach((c,i)=>{
    const kind=c.patrol?'patrol':c.bus?'bus':i%11===0?'truck':i%9===0?'modern':i%5===0?'suv':i%7===0?'sport':'car';
    const paint=c.patrol?'#f4f6ef':['#f7c82e','#ed653b','#4a9a8c','#cbdce2','#3486b4','#e8e1c9','#f4f1e8','#9d5e53'][i%8],key=kind+paint;
    if(!templates.has(key)){
      const model=kind==='truck'?makeDeliveryTruck(paint):fitVehicle({car,suv,bus,sport,modern,patrol:modern}[kind],c.bus?8.1:4.5,c.bus?null:paint);
      if(c.patrol){
        const bounds=new THREE.Box3().setFromObject(model),top=bounds.max.y;
        const size=bounds.getSize(new THREE.Vector3());
        const block=(color,x,y,z,w,h,d,glow=false)=>{
          const mat=new THREE.MeshStandardMaterial({color,emissive:glow?color:'#000000',emissiveIntensity:glow?.85:0});
          const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
          mesh.position.set(x,y,z);model.add(mesh);
        };
        block('#283d53',0,top+.06,0,.95,.12,.28);
        block('#57a9ff',-.27,top+.15,0,.43,.13,.24,true);
        block('#436cda',.27,top+.15,0,.43,.13,.24,true);
        for(const side of [-1,1])block('#214f86',side*size.x*.48,top*.48,0,.065,.23,2);
      }
      templates.set(key,model);
    }
    const root=templates.get(key);root.updateMatrixWorld(true);
    c.mesh.matrixAutoUpdate=false;
    c.mesh.removeFromParent();
    premiumCars.push(c);
    root.traverse(m=>{
      if(!m.isMesh)return;
      const groupKey=m.geometry.uuid+':'+m.material.uuid;
      if(!vehicleGroups.has(groupKey))vehicleGroups.set(groupKey,[]);
      vehicleGroups.get(groupKey).push({mesh:m,car:c,local:m.matrixWorld.clone()});
    });
  });
  const batches=[];
  for(const items of vehicleGroups.values()){
    const {geometry,material}=items[0].mesh;
    const batch=new THREE.InstancedMesh(geometry,material,items.length);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.castShadow=true;batch.receiveShadow=true;batch.frustumCulled=false;
    scene.add(batch);batches.push({batch,items});
  }
  const vehicleMatrix=new THREE.Matrix4();
  const visibleCars=new Set();
  const viewProjection=new THREE.Matrix4(),viewFrustum=new THREE.Frustum();
  const vehicleBounds=new THREE.Sphere(new THREE.Vector3(),5);
  // One instanced, soft contact-shadow layer grounds traffic without a
  // separate light or draw call per vehicle. It follows each moving car.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const shadowContext=shadowCanvas.getContext('2d'),gradient=shadowContext.createRadialGradient(64,64,12,64,64,62);
  gradient.addColorStop(0,'rgba(8,15,18,.55)');gradient.addColorStop(.6,'rgba(8,15,18,.32)');gradient.addColorStop(1,'rgba(8,15,18,0)');
  shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.72,polygonOffset:true,polygonOffsetFactor:-1});
  const shadowGeometry=new THREE.PlaneGeometry(1,1);shadowGeometry.rotateX(-Math.PI/2);
  const carShadows=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,premiumCars.length);carShadows.frustumCulled=false;carShadows.renderOrder=2;scene.add(carShadows);
  const shadowObject=new THREE.Object3D();
  let frame=0,period=-1,slowTime=0,quality=Math.min(window.devicePixelRatio,maxPixelRatio),lastFrame=performance.now(),frames=0,sampleStart=lastFrame,fps=0;
  // Only nearby posts use point lights; the visible bulbs remain batched.
  const streetLights=Array.from({length:3},()=>{const light=new THREE.PointLight('#ffe3aa',0,35,2);scene.add(light);return light;});
  function updateStreetLights(){
    const state=getState(),night=state.dayPeriod===3;
    const nearest=architecture.streetLamps.map(p=>({p,d:(p.x-state.x)**2+(p.z-state.z)**2})).sort((a,b)=>a.d-b.d).slice(0,streetLights.length);
    streetLights.forEach((light,i)=>{const spot=nearest[i];light.intensity=night&&spot&&spot.d<3600?100:0;if(spot)light.position.set(spot.p.x,spot.p.y,spot.p.z);});
  }
  const headlight=new THREE.SpotLight('#ffe5b0',0,60,.55,.6,1);headlight.position.set(0,1.4,-1);headlight.target.position.set(0,.3,-32);bike.add(headlight,headlight.target);
  const lighting=[
    {sky:'#91c9ec',fog:'#c3d6de',sun:'#fff0c5',power:2.1,fill:.8,position:[-.7,.35,.6]},
    {sky:'#6abcf0',fog:'#d6e1dc',sun:'#fff8e5',power:2.7,fill:.8,position:[-.3,.95,.3]},
    {sky:'#eab08b',fog:'#d6a78e',sun:'#ffb572',power:2.1,fill:.65,position:[-.8,.12,.5]},
    {sky:'#101b36',fog:'#17253e',sun:'#8baaff',power:.3,fill:.65,position:[-.6,-.3,.6]}
  ];
  function updateLighting(){const index=getState().dayPeriod??0;if(index===period)return;period=index;const p=lighting[index];sky.visible=index!==3;sky.material.uniforms.sunPosition.value.set(...p.position);scene.background.set(p.sky);scene.fog.color.set(p.fog);scene.environmentIntensity=index===3?.12:.62;headlight.intensity=index===3?70:0;shadowMaterial.opacity=index===3?.42:.72;
    for(const l of scene.children){if(l.isDirectionalLight){l.color.set(p.sun);l.intensity=p.power;}if(l.isHemisphereLight){l.color.set(p.sky);l.intensity=p.fill;}}
    for(const m of architecture.materials.values())if(/Vidrio|Cristal|Ventana|Fachada_Lod|Farola_Luz/i.test(m.name)){m.emissive.set(index===3?'#ffc768':'#000000');m.emissiveIntensity=index===3?(/Farola_Luz/.test(m.name)?2:.7):0;}
    updateStreetLights();
    renderer.shadowMap.needsUpdate=true;
  }
  return {
    update(dt){
      updateLighting();
      if(cityWorld.real){const phase=(performance.now()/1000)%14;for(const [name,on] of [['Semaforo_Rojo_Real',phase<6],['Semaforo_Ambar_Real',phase>=12],['Semaforo_Verde_Real',phase>=6&&phase<12]]){const lamp=architecture.materials.get(name);if(lamp)lamp.emissiveIntensity=on?1.1:.04;}}
      const speed=getState().speed;for(const w of courierMoto.wheelPivots)w.rotation.x-=speed*dt/.44;
      lodTimer+=dt;if(lodTimer>.7){assignCrowd();updateStreetLights();lodTimer=0;}
      for(const slot of pool)if(slot.person)slot.mixer.update(dt*(slot.person.walk?.8:1));
      visibleCars.clear();
      camera.updateMatrixWorld();
      viewFrustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      let shadowCount=0;
      premiumCars.forEach(car=>{
        const dx=car.mesh.position.x-camera.position.x,dz=car.mesh.position.z-camera.position.z;
        if(dx*dx+dz*dz>(mobile?425:740)**2)return;
        vehicleBounds.center.copy(car.mesh.position);vehicleBounds.center.y=1;
        if(!viewFrustum.intersectsSphere(vehicleBounds))return;
        visibleCars.add(car);
        car.mesh.updateMatrix();
        shadowObject.position.set(car.mesh.position.x,.055,car.mesh.position.z);
        shadowObject.rotation.set(0,car.mesh.rotation.y,0);
        shadowObject.scale.set(car.bus?3.6:2.7,1,car.bus?8.8:5.2);
        shadowObject.updateMatrix();carShadows.setMatrixAt(shadowCount++,shadowObject.matrix);
      });carShadows.count=shadowCount;carShadows.instanceMatrix.needsUpdate=true;
      for(const {batch,items} of batches){
        let count=0;
        for(const {car,local} of items)if(visibleCars.has(car)){
          batch.setMatrixAt(count++,vehicleMatrix.multiplyMatrices(car.mesh.matrix,local));
        }
        batch.count=count;
        batch.instanceMatrix.needsUpdate=true;
      }
    },
    render(dt){
      const now=performance.now(),elapsed=(now-lastFrame)/1000;lastFrame=now;frames++;if(now-sampleStart>1000){fps=Math.round(frames*1000/(now-sampleStart));frames=0;sampleStart=now;}
      if(getState().phase==='playing'&&document.visibilityState!=='hidden'&&elapsed>.028&&elapsed<5)slowTime+=elapsed;else slowTime=Math.max(0,slowTime-elapsed*.5);
      if(slowTime>2&&quality>.65){quality=Math.max(.65,quality-.15);renderer.setPixelRatio(Math.min(window.devicePixelRatio,quality));slowTime=0;}
      renderer.shadowMap.needsUpdate=(frame++%(mobile?8:4)===0);renderer.render(scene,camera);
    },
    getMetrics(){return {fps,pixelRatio:quality,animatedPeople:pool.length,postprocessing:false};
    }
  };
}

function buildStreetDetails(scene,world,material){
  const cube=new THREE.BoxGeometry(1,1,1),groups=new Map();
  const cream=new THREE.MeshStandardMaterial({color:'#f3e2bb',roughness:.82});
  const trim=new THREE.MeshStandardMaterial({color:'#c9b391',roughness:.86});
  const metal=new THREE.MeshStandardMaterial({color:'#364c50',roughness:.4,metalness:.55});
  const glass=new THREE.MeshStandardMaterial({color:'#32546c',roughness:.16,metalness:.42,envMapIntensity:1});
  const dark=new THREE.MeshStandardMaterial({color:'#18242b',roughness:.9});
  const wood=new THREE.MeshStandardMaterial({color:'#a16637',roughness:.83});
  function detail(w,h,d,x,y,z,mat){
    if(!groups.has(mat.uuid))groups.set(mat.uuid,{mat,matrices:[]});const o=new THREE.Object3D();o.position.set(x,y,z);o.scale.set(w,h,d);o.updateMatrix();groups.get(mat.uuid).matrices.push(o.matrix.clone());
  }
  for(const b of world.buildings){
    if(Math.hypot(b.x+80,b.z-50)>285)continue;
    // Real depth at ground-floor shop doors and regular upper windows.
    for(const side of [-1,1]){
      const z=b.z+side*(b.d/2+.14);
      for(let x=b.x-b.w/2+3;x<b.x+b.w/2-2;x+=5.2)for(let y=6;y<b.h-2;y+=4.9){
        detail(2.1,2.5,.17,x,y,z,dark);detail(1.85,2.2,.19,x,y+.04,z+side*.02,glass);
        detail(2.6,.18,.45,x,y-1.3,z,cream);detail(.15,2.55,.25,x-1.1,y,z,cream);detail(.15,2.55,.25,x+1.1,y,z,cream);
        detail(.065,2.2,.22,x,y,z+side*.15,metal);
        if(Math.round(x+y)%3===0){detail(3,.22,1.3,x,y-1.5,z+side*.55,trim);detail(3,.07,.07,x,y-.5,z+side*1.18,metal);for(let k=-1;k<=1;k+=.5)detail(.04,1,.04,x+k,y-1,z+side*1.18,metal);}
      }
      for(let x=b.x-b.w/2+3;x<b.x+b.w/2-2;x+=7){detail(4,3,.12,x,2,z,dark);detail(4,.14,.4,x,3.65,z,cream);}
    }
    detail(b.w+1.2,.3,b.d+1.2,b.x,b.h+.85,b.z,cream);
    detail(b.w+1.6,.22,b.d+1.6,b.x,b.h+.55,b.z,trim);
    // Rooftop water tanks, antennas and small air conditioning units.
    detail(2.8,2.8,2.8,b.x+4,b.h+1.8,b.z-4,material('#36464b'));
    detail(.07,5,.07,b.x-3,b.h+3,b.z,metal);detail(2.7,.06,.06,b.x-3,b.h+5,b.z,metal);
  }
  for(const shop of world.restaurants){
    const [x,z]=shop.pickup;
    for(const dz of [-7,8]){
      detail(1.8,.15,1.8,x+7,1,z+dz,wood);detail(.12,.95,.12,x+7,.48,z+dz,metal);
      detail(.8,.1,.8,x+5.5,.55,z+dz,wood);detail(.8,.65,.1,x+5.5,.9,z+dz-.4,wood);
    }
    detail(.12,1.5,1.1,x+6,.8,z+4,metal);
    detail(.13,1.2,.85,x+5.98,.94,z+4,material('#d8ae48'));
    detail(1.2,.6,.8,x+6,.5,z-6,material('#bb693b'));
  }
  // Bins, benches and thin railings along the calicanto walk.
  for(let z=-285;z<300;z+=30){
    if(world.roads.some(r=>Math.abs(r-z)<18))continue;
    for(const side of [-1,1]){
      const x=world.canalX+side*9;
      detail(.05,1,.05,x,1.5,z,metal);detail(.06,1,.06,x,1.5,z+5,metal);detail(.06,.06,5,x,2,z+2.5,metal);
      detail(2.8,.14,.65,x+side*8,.65,z,wood);detail(2.8,.65,.12,x+side*8,1,z-.33,wood);
      for(const dx of [-1,1])detail(.12,.6,.5,x+side*8+dx,.3,z,metal);
    }
  }
  for(const {mat,matrices} of groups.values()){
    const batch=new THREE.InstancedMesh(cube,mat,matrices.length);matrices.forEach((m,i)=>batch.setMatrixAt(i,m));batch.castShadow=true;batch.receiveShadow=true;scene.add(batch);
  }
}
