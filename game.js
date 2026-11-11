import * as THREE from './vendor/three.module.js';
import {buildCity} from './city.js?v=0.32';
import {buildRealCity} from './real-city.js?v=0.32';
import {nearestSegment,routeBetween} from './real-network.js?v=0.32';
import {createTraffic,advanceTraffic} from './real-traffic.js?v=0.32';
import {createArcadeEffects} from './effects.js?v=0.32';
import {actorFactory} from './actors.js?v=0.32';
import {createStreetProps} from './art/street-props.js?v=0.32';
import {createTouchDrive} from './touch-drive.js?v=0.32';
import {drawNavigationMap} from './navigation-map.js?v=0.32';
import {installGameHost} from './android-host.js?v=0.32';

const $ = (id) => document.getElementById(id);
const isPilot=document.body.dataset.pilot==='true';
const viewOptions=new URLSearchParams(window.location?.search||'');
const mobileDrive=viewOptions.get('mobile')==='1'||!!window.matchMedia?.('(pointer: coarse)').matches||!!window.navigator?.maxTouchPoints;
const embedded=viewOptions.get('embed')==='rapiboy';
const realMode=isPilot&&viewOptions.get('map')==='real';
document.body.classList.toggle('touch-driving',mobileDrive);document.body.classList.toggle('embedded',embedded);document.body.classList.toggle('real-map',realMode);if(realMode)document.querySelector?.('.brand')?.setAttribute('href','./pilot.html?map=real');
const touchDrive=createTouchDrive();let touchSteering=0;
let controlMode=mobileDrive?'touch':'keyboard';
document.body.classList.toggle('keyboard-driving',controlMode==='keyboard');
function useControlMode(mode){
  if(controlMode===mode)return;
  controlMode=mode;touchDrive.cancelAll();touchSteering=0;keys.clear();
  document.body.classList.toggle('touch-driving',mode==='touch');
  document.body.classList.toggle('keyboard-driving',mode==='keyboard');
  resize();
}
let premiumLayer=null;
const clamp = THREE.MathUtils.clamp;
const points = (v) => Math.round(v).toLocaleString('es-AR') + ' pts';
const keys = new Set();
const state = { combo:0,comboTime:0,smashed:0, phase: 'menu', mode: 'delivery', time: 180, cash: 0, completed: 0, speed: 0, angle: 0, boost: 100, x: -100, z: 190, hit: 0, stage: 'pickup', jobIndex: 0, stopTime: 0, elapsed: 0, audio: false, best: 0 };
try { state.best = Number(localStorage.getItem('crazy-moto-best-points')) || 0; } catch {}
$('best').textContent = points(state.best);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch {
  $('loading').innerHTML = '<span>Tu navegador necesita WebGL para jugar. Probá con Chrome o Edge y la aceleración gráfica activada.</span>';
  throw new Error('WebGL no disponible');
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;
$('world').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#58b9f4');
scene.fog = new THREE.Fog('#b3dbed', 250, 950);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 950);
const hemi = new THREE.HemisphereLight('#e6f2ff', '#7a866b', .9);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d5', 1.45);
sun.position.set(-90, 130, 65);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -110; sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110; sun.shadow.camera.bottom = -110;
sun.shadow.camera.far = 360; sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.2;
scene.add(sun, sun.target);

// A deterministic handcrafted-feeling city. All art is original geometry.
let seed = 4628;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const mats = new Map();
function material(color, extra = {}) {
  const key = color + Object.entries(extra).map(([k,v])=>k+':'+(v?.uuid||String(v))).join('|');
  if (!mats.has(key)) mats.set(key, new THREE.MeshPhongMaterial({ color, shininess: 12, ...extra }));
  return mats.get(key);
}
const unitBox = new THREE.BoxGeometry(1, 1, 1);
function box(parent, w, h, d, color, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(unitBox, typeof color === 'string' ? material(color) : color);
  mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
  mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent, r1, r2, h, color, x, y, z, sides = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, sides), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent, r, color, x, y, z, scale = [1,1,1]) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), material(color));
  mesh.position.set(x,y,z); mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh); return mesh;
}
const cityWorld=realMode?buildRealCity({THREE,scene,material,random}):buildCity({THREE,scene,box,cylinder,sphere,material,random,pilot:isPilot});
const {city,colliders,roads,limit,canalX,restaurants,homes,breakables,people}=cityWorld;
const streetProps=createStreetProps({THREE,scene,world:cityWorld});
const effects=createArcadeEffects({THREE,scene,material,unitBox,random});

function makeCar(color,bus=false) {
  const g=new THREE.Group();
  box(g,bus?2.8:2.25,bus?2.8:1.05,bus?8:4.5,color,0,bus?2:1,0);
  box(g,bus?2.65:1.95,bus?1.05:.85,bus?7.2:2.6,'#586d68',0,bus?2.7:1.85,-.2);
  box(g,bus?2.8:2.15,.2,bus?8:4.4,bus?'#d7d7bb':color,0,bus?3.5:2.32,0);
  for(const x of [-1.13,1.13]) for(const z of bus?[-2.7,2.7]:[-1.45,1.45]) {
    const wheel=cylinder(g,.45,.45,.22,'#303d34',x,.55,z,10);wheel.rotation.z=Math.PI/2;
  }
  for(const x of [-.7,.7]) {
    box(g,.4,.25,.05,'#eee1b6',x,1,-(bus?4.02:2.27));
    box(g,.4,.25,.05,'#bb4b35',x,1,bus?4.02:2.27);
  }
  if(bus) box(g,2.82,.65,8.02,'#d9cfb4',0,1.25,0);
  city.add(g); return g;
}
const cars=[],vehicleTemplates=new Map();
for(let i=0;i<190;i++) {
  const axis=i<28?'z':i%2===0?'x':'z',lane=i<28?-100:roads[1+Math.floor(random()*(roads.length-2))];
  const dir=i%3===0?-1:1;
  const bus=i%23===0,parked=i<12||i>160,color=bus?'#e83024':['#ffdc19','#119d64','#f74428','#fffbea','#187bd6','#8c47b5'][i%6],key=color+bus;
  let mesh;
  if(vehicleTemplates.has(key)){mesh=vehicleTemplates.get(key).clone(true);city.add(mesh);}
  else{mesh=makeCar(color,bus);vehicleTemplates.set(key,mesh);if(bus)cityWorld.label('LÍNEA 20',0,2.6,-4.03,2,'#161b1c','#ffdd20',Math.PI,mesh);}
  const car={mesh,axis,lane,dir,pos:i<28?-170+i*18:random()*(limit*2-50)-limit+25,speed:parked?0:12+random()*12,near:false,bus,parked};
  if(realMode){const seg=cityWorld.network.segments[(i*17)%cityWorld.network.segments.length];car.realState=createTraffic(cityWorld.network,seg.a,random);if(parked)car.realState.speed=0;}
  cars.push(car);
}
const vehicleGroups=new Map();
for(const car of cars)car.mesh.traverse(m=>{if(!m.isMesh)return;const key=m.geometry.uuid+':'+m.material.uuid;if(!vehicleGroups.has(key))vehicleGroups.set(key,[]);vehicleGroups.get(key).push(m);m.visible=false;});
const vehicleBatches=[];
for(const items of vehicleGroups.values()){const batch=new THREE.InstancedMesh(items[0].geometry,items[0].material,items.length);batch.castShadow=true;batch.receiveShadow=true;scene.add(batch);vehicleBatches.push({batch,items});}
function updateVehicleBatches(){for(const c of cars)c.mesh.updateMatrixWorld(true);for(const {batch,items} of vehicleBatches){items.forEach((m,i)=>batch.setMatrixAt(i,m.matrixWorld));batch.instanceMatrix.needsUpdate=true;}}
// Bike uses -Z as forward. The lean group moves without tilting the wheels into the ground.
const bike=new THREE.Group();scene.add(bike);const lean=new THREE.Group();bike.add(lean);
const wheels=[];
for(const z of [-1.05,1.05]) {
  const w=cylinder(bike,.52,.52,.29,'#283730',0,.54,z,14);w.rotation.z=Math.PI/2;wheels.push(w);
  const hub=cylinder(bike,.25,.25,.32,'#b7b79f',0,.54,z,10);hub.rotation.z=Math.PI/2;
}
box(lean,.72,.6,1.6,'#ffcf12',0,.98,0);
box(lean,.7,.18,1.35,'#35463a',0,1.4,.3);
box(lean,.58,.65,.46,'#ffc915',0,1.18,-.85);
box(lean,.38,.3,.12,material('#fff5cb',{emissive:'#d1ba75',emissiveIntensity:.3}),0,1.38,-1.13);
box(lean,.44,.18,.12,'#c85f43',0,.98,1.14);
box(lean,.35,.18,.08,'#e7dfc5',0,.64,1.26);
for(const x of [-.22,.22]) {
  const fork=box(lean,.08,1.1,.08,'#9ba894',x,.92,-.91);fork.rotation.x=-.2;
}
box(lean,1.15,.07,.1,'#3d4d40',0,1.65,-.78);
const actorModels=actorFactory(THREE,material);
const riderModel=actorModels.rider();lean.add(riderModel.mesh);const backpack=riderModel.backpack;
const passengerModel=actorModels.rider({jacket:'#8db438',helmet:'#ed5e29'});
passengerModel.backpack.visible=false;
const passenger=passengerModel.mesh;passenger.position.set(0,.08,.85);passenger.scale.setScalar(.92);lean.add(passenger);passenger.visible=false;
// Rounded tank, exposed engine, exhaust and chromed mirror stalks finish the motorcycle.
actorModels.ellipsoid(lean,0,1.18,-.35,.38,.26,.65,material('#ffcf12',{shininess:65}));
actorModels.ellipsoid(lean,0,.76,.12,.31,.31,.42,material('#707a83',{shininess:80}));
for(const side of [-1,1]){
  actorModels.bone(lean,[side*.5,1.65,-.78],[side*.7,2,-.91],.022,.022,'#bcc9d2',6);
  actorModels.ellipsoid(lean,side*.74,2.02,-.93,.15,.095,.05,material('#263749',{shininess:80}));
}
const exhaust=cylinder(lean,.11,.11,1.3,'#969f9d',.43,.62,.65,10);exhaust.rotation.x=Math.PI/2;
// Target beacon and hovering chevron.
const marker=new THREE.Group();scene.add(marker);
const ring=new THREE.Mesh(new THREE.RingGeometry(4.8,5.2,48),new THREE.MeshBasicMaterial({color:'#e4f073',side:THREE.DoubleSide}));
ring.rotation.x=-Math.PI/2;ring.position.y=.14;marker.add(ring);
const beam=new THREE.Mesh(new THREE.CylinderGeometry(4.9,4.9,8,32,1,true),new THREE.MeshBasicMaterial({color:'#e4f073',transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=4;marker.add(beam);
const chevron=new THREE.Group();marker.add(chevron);
for(const side of [-1,1]) {const bar=box(chevron,2.5,.55,.55,material('#e4f073',{emissive:'#e4f073',emissiveIntensity:.5}),side*.8,0,0,false);bar.rotation.z=side*.65;}
marker.visible=false;

const deliveryJobs=restaurants.map((shop,i)=>{
  const home=homes[[0,3,1,2][i%4]];
  return {from:shop.name,to:home.name,pickup:shop.pickup,drop:home.drop,reward:4800+i*650,shop,home};
});
const jobs=()=>deliveryJobs;
const dayPeriods=[
  {name:'MAÑANA · 08:30',sky:'#91c9ec',fog:'#c3d6de',sun:'#fff0c5',power:2.1,fill:.8,height:65},
  {name:'MEDIODÍA · 13:00',sky:'#6abcf0',fog:'#d6e1dc',sun:'#fff8e5',power:2.7,fill:.8,height:150},
  {name:'TARDE · 18:30',sky:'#eab08b',fog:'#d6a78e',sun:'#ffb572',power:2.1,fill:.65,height:32},
  {name:'NOCHE · 22:00',sky:'#101b36',fog:'#17253e',sun:'#8baaff',power:.3,fill:.65,height:85}
];
state.dayPeriod=0;
function applyDayPeriod(){
  const p=dayPeriods[state.dayPeriod];scene.background.set(p.sky);scene.fog.color.set(p.fog);
  sun.color.set(p.sun);sun.intensity=p.power;hemi.color.set(p.sky);hemi.intensity=p.fill;
  $('day-period').textContent=p.name;
}
function randomJob(exclude=-1){const choices=jobs().map((_,i)=>i).filter(i=>i!==exclude);return choices[Math.floor(Math.random()*choices.length)];}
function chooseOtherJob(){if(state.phase!=='playing'||state.stage!=='pickup')return;state.jobIndex=(state.jobIndex+1)%jobs().length;setTarget();}
$('other-job').onclick=chooseOtherJob;
const availableMarkers=deliveryJobs.map(j=>{const m=new THREE.Mesh(new THREE.RingGeometry(3.8,4.15,24),new THREE.MeshBasicMaterial({color:'#62edc4',side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(j.pickup[0],.18,j.pickup[1]);m.visible=false;scene.add(m);return m;});
const job=()=>jobs()[state.jobIndex%jobs().length];
const target=()=>job()[state.stage==='pickup'?'pickup':'drop'];
function setTarget() {
  availableMarkers.forEach((m,i)=>m.visible=state.mode==='delivery'&&state.stage==='pickup'&&i!==state.jobIndex);
  $('other-job').classList.toggle('hidden',state.stage!=='pickup');
  const p=target();marker.position.set(p[0],0,p[1]);marker.visible=true;state.stopTime=0;
  for(const h of homes){h.recipient.mesh.visible=false;h.recipient.waiting=false;}
  if(state.stage==='drop'&&job().home){job().home.recipient.mesh.visible=true;job().home.recipient.waiting=true;}
  updateHUD();
}
function distanceToTarget() {const p=target();return Math.hypot(p[0]-state.x,p[1]-state.z);}
function updateHUD() {
  $('other-job').textContent=(mobileDrive?'':'E · ')+'OTRO LOCAL ↗';
  $('money').textContent=points(state.cash);
  $('deliveries').textContent=`${state.completed} entregas`;
  $('job-type').textContent='DELIVERY';
  $('job-step').textContent=state.stage==='pickup'?'01 / RECOGER':'02 / DESTINO';
  $('job-title').textContent=state.stage==='pickup'?'Buscá el pedido':'¡Que llegue calentito!';
  $('job-place').textContent=state.stage==='pickup'?job().from:job().to;
  $('job-address').textContent=state.stage==='pickup'?'PODÉS RETIRAR EN CUALQUIER LOCAL VERDE':`${job().home?.personName||'Tu cliente'} te espera · ${job().home?.address||''}`;
  $('job-reward').textContent='+'+points(job().reward);
}
let toastUntil=0;
function toast(message,duration=2.3) {$('toast').textContent=message;$('toast').classList.remove('hidden');toastUntil=performance.now()+duration*1000;}

let audioContext,oscillator,engineGain;
function initAudio() {
  if(audioContext)return;
  const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
  audioContext=new AudioCtx();oscillator=audioContext.createOscillator();engineGain=audioContext.createGain();
  oscillator.type='sawtooth';oscillator.frequency.value=45;
  const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=240;
  oscillator.connect(filter);filter.connect(engineGain);engineGain.connect(audioContext.destination);engineGain.gain.value=0;oscillator.start();
}
function beep(success=true) {
  if(!state.audio||!audioContext)return;
  const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.connect(g);g.connect(audioContext.destination);
  const t=audioContext.currentTime;o.frequency.setValueAtTime(success?660:110,t);o.frequency.exponentialRampToValueAtTime(success?990:60,t+.18);
  g.gain.setValueAtTime(.09,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.31);
}
function playMode(mode) {
  state.mode='delivery';document.querySelectorAll('.mode').forEach(el=>{const yes=el.dataset.mode===mode;el.classList.toggle('selected',yes);el.setAttribute('aria-pressed',String(yes));});
}
document.querySelectorAll('.mode').forEach(el=>el.addEventListener('click',()=>playMode(el.dataset.mode)));
function hideModal() {$('overlay').classList.add('hidden');}
const arcadeStartZones={guemes:{x:-100,z:190,angle:0,look:[-100,4,100],preview:[-100,22,225]},centro:{x:50,z:-98,angle:-Math.PI/2,look:[50,15,-150],preview:[0,35,-100]},nueva:{x:150,z:102,angle:Math.PI/2,look:[150,19,150],preview:[100,35,200]}};
const startZones=realMode?{guemes:cityWorld.starts[0],centro:cityWorld.starts[1],nueva:cityWorld.starts[2]}:arcadeStartZones;
const randomStart=()=>Object.keys(startZones)[Math.floor(Math.random()*3)];
let selectedStart=isPilot?randomStart():'guemes';
const startZone=()=>startZones[selectedStart];
function startGame() {
  touchDrive.cancelAll();touchSteering=0;
  Object.assign(state,{mode:'delivery',phase:'playing',time:180,cash:0,completed:0,speed:0,angle:0,boost:100,x:-100,z:190,hit:1,combo:0,comboTime:0,smashed:0,stage:'pickup',jobIndex:0,stopTime:0,elapsed:0});
  selectedStart=isPilot?randomStart():'guemes';
  const start=startZone();Object.assign(state,{x:start.x,z:start.z,angle:start.angle});
  state.jobIndex=randomJob();if(realMode){const distant=deliveryJobs.map((j,i)=>({i,d:Math.hypot(j.pickup[0]-state.x,j.pickup[1]-state.z)})).filter(j=>j.d>100);if(distant.length)state.jobIndex=distant[Math.floor(Math.random()*distant.length)].i;}state.dayPeriod=Math.floor(Math.random()*dayPeriods.length);applyDayPeriod();
  keys.clear();hideModal();effects.reset();for(const p of breakables){p.broken=false;p.mesh.visible=true;}streetProps.reset();document.body.classList.add('playing');
  ['intro','city-caption','scene-label'].forEach(id=>$(id).classList.add('hidden'));
  $('hud').classList.remove('hidden');$('touch-controls').classList.remove('hidden');
  backpack.visible=state.mode==='delivery';passenger.visible=false;setTarget();
  camera.position.set(state.x+Math.sin(state.angle)*13,7,state.z+Math.cos(state.angle)*13);toast('¡DALE, QUE EL RELOJ CORRE!',2.3);initAudio();
  audioContext?.resume();gameHost.send('started',{mode:state.mode});
}
$('start').addEventListener('click',startGame);
function goMenu() {
  touchDrive.cancelAll();
  availableMarkers.forEach(m=>m.visible=false);
  state.phase='menu';state.speed=0;keys.clear();hideModal();marker.visible=false;passenger.visible=false;backpack.visible=true;
  document.body.classList.remove('playing');['intro','city-caption','scene-label'].forEach(id=>$(id).classList.remove('hidden'));
  ['hud','touch-controls','pickup-prompt','toast'].forEach(id=>$(id).classList.add('hidden'));
  state.x=-100;state.z=190;state.angle=0;for(const h of homes)h.recipient.mesh.visible=false;$('district').textContent='NUEVA CÓRDOBA';
}
let modalReturn='menu';
function modal(content) {
  modalReturn=state.phase==='playing'?'playing':state.phase==='paused'?'playing':'menu';
  if(state.phase==='playing')state.phase='paused';keys.clear();touchDrive.cancelAll();touchSteering=0;
  $('modal').innerHTML=content;$('overlay').classList.remove('hidden');
  $('modal').querySelector('button')?.focus();
}
function closeInfo() {hideModal();if(modalReturn==='playing'){state.phase='playing';audioContext?.resume();}}
function showHelp() {
  if(controlMode==='touch'){modal('<div class="eyebrow">CÓRDOBA · ARCADE</div><h2 id="modal-title">DOS PULGARES. A LA CALLE.</h2><p>Mantené GAS del lado izquierdo para avanzar. Con el otro dedo usá las flechas de la derecha para doblar. Podés presionar ambos a la vez.</p><div class="control-row">Ir recto <span>GAS sin flechas</span></div><div class="control-row">Frenar <span>Soltá GAS o usá FRENO</span></div><div class="control-row">Turbo <span>Botón ⚡, también acelera</span></div><p>El teclado de PC sigue funcionando: WASD o flechas, espacio y Shift.</p><button class="start-button" id="close-info">DALE, A JUGAR ↗</button>');$('close-info').onclick=closeInfo;return;}
  modal('<div class="eyebrow">MANUAL DE CALLE / 02</div><h2 id="modal-title">AGARRALE LA MANO.</h2><p>Seguí la flecha y el GPS hasta el círculo amarillo. Frená adentro para recoger y después llegar al destino. Cada trabajo suma puntos y 15 segundos al turno.</p><div class="control-row">Acelerar / retroceder <span>W / S &nbsp; o &nbsp; ↑ / ↓</span></div><div class="control-row">Doblar <span>A / D &nbsp; o &nbsp; ← / →</span></div><div class="control-row">Frenar y derrapar <span>ESPACIO</span></div><div class="control-row">Turbo <span>SHIFT</span></div><div class="control-row">Volver a la calle <span>R</span></div><div class="control-row">Pausa <span>ESC</span></div><p>Pasá cerquita del tránsito para ganar propinas. Podés romper cajones, vallas, tachos y mesas: encadená golpes para sumar combos. Los choques no cortan la marcha ni descuentan tiempo. En el celular, usá los botones en pantalla.</p><button class="start-button" id="close-info">LISTO, VAMOS <span>↗</span></button>');
  $('close-info').onclick=closeInfo;
}
function showCity() {
  modal('<div class="eyebrow">CÓRDOBA CAPITAL / 03</div><h2 id="modal-title">UNA CIUDAD.<br>MIL VUELTAS.</h2><p>Recorré una interpretación arcade de Córdoba: La Cañada y sus puentes, las torres de la Catedral, Plaza San Martín, Patio Olmos, Plaza España, el Buen Pastor y las esquinas de Güemes.</p><p>Las calles y los puntos de interés están representados en versión de juego. Toda la ciudad y la moto están hechas con geometría 3D original.</p><div class="control-row">Delivery <span>Recogé morfi y entregalo</span></div><p>Referencias de lugares: <a href="https://cordobaturismo.gov.ar/experiencias/centro-historico/" target="_blank" rel="noopener">Córdoba Turismo ↗</a></p><button class="start-button" id="close-info">SALIMOS A LA CALLE <span>↗</span></button>');
  $('close-info').onclick=closeInfo;
}
$('help-open').onclick=showHelp;$('help-inline').onclick=showHelp;$('city-open').onclick=showCity;
$('nav-play').onclick=()=>{if(state.phase==='menu')$('start').focus();else if(state.phase==='playing')pauseGame();};
function pauseGame() {
  touchDrive.cancelAll();touchSteering=0;
  if(state.phase==='paused') {state.phase='playing';keys.clear();hideModal();audioContext?.resume();return;}
  if(state.phase!=='playing')return;
  modal('<div class="eyebrow">UN RESPIRO EN LA ESQUINA</div><h2 id="modal-title">BAJÁ UN CAMBIO.</h2><p>El reloj está pausado. Tu pedido puede esperar un ratito.</p><button class="start-button" id="resume">SEGUIR EL TURNO <span>↗</span></button><button class="secondary" id="restart">Empezar otro turno</button><button class="secondary" id="menu">Volver al inicio</button>');
  $('resume').onclick=()=>{state.phase='playing';hideModal();keys.clear();audioContext?.resume();};$('restart').onclick=startGame;$('menu').onclick=goMenu;
}
$('pause-button').onclick=pauseGame;
function finishGame() {
  state.phase='results';state.speed=0;keys.clear();$('pickup-prompt').classList.add('hidden');
  const record=state.cash>state.best;
  if(record) {state.best=state.cash;try{localStorage.setItem('crazy-moto-best-points',String(state.best));}catch{}}
  $('best').textContent=points(state.best);
  modal(`<div class="eyebrow">${record?'★ NUEVO RÉCORD PERSONAL':'TURNO TERMINADO'}</div><h2 id="modal-title">${state.completed>=3?'¡UNA LOCURA!':state.completed?'BIEN AHÍ, CHE.':'LA CALLE TE ESPERA.'}</h2><p>${state.completed?'Se terminó el turno. La moto descansa y tus puntos quedan registrados.':'El reloj te ganó esta vez. Seguí el GPS y frená dentro de la marca amarilla.'}</p><div class="stat-row"><div><small>PUNTOS</small><strong>${points(state.cash)}</strong></div><div><small>ENTREGAS</small><strong>${state.completed}</strong></div><div><small>RANGO</small><strong>${state.completed>=5?'S':state.completed>=3?'A':state.completed?'B':'C'}</strong></div></div><button class="start-button" id="again">OTRA VUELTA <span>↗</span></button><button class="secondary" id="menu">Volver al inicio</button>`);
  $('again').onclick=startGame;$('menu').onclick=goMenu;
  gameHost.send('finished',{mode:state.mode,score:state.cash,completed:state.completed});
}
$('sound').onclick=()=>{initAudio();state.audio=!state.audio;audioContext?.resume();$('sound').setAttribute('aria-label',state.audio?'Silenciar sonido':'Activar sonido');$('sound').querySelector('.off-mark').style.display=state.audio?'none':'';if(state.audio)beep();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Usá F11 para ampliar la pantalla');}};
function resetOnRoad() {
  if(realMode){const snap=nearestSegment(cityWorld.network,state);state.x=snap.point.x;state.z=snap.point.z;state.speed=0;state.hit=1;toast('DE VUELTA AL ASFALTO',1.2);return;}
  const closestX=roads.reduce((a,b)=>Math.abs(b-state.x)<Math.abs(a-state.x)?b:a);
  const closestZ=roads.reduce((a,b)=>Math.abs(b-state.z)<Math.abs(a-state.z)?b:a);
  if(Math.abs(closestX-state.x)<Math.abs(closestZ-state.z))state.x=closestX;
  else state.z=closestZ;
  state.x=clamp(state.x,-limit+10,limit-10);state.z=clamp(state.z,-limit+10,limit-10);state.speed=0;state.hit=1;
  toast('DE VUELTA AL ASFALTO',1.2);
}
window.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))useControlMode('keyboard');
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)&&state.phase==='playing'&&e.code!=='Tab')e.preventDefault();
  if(e.code==='Escape'&&!e.repeat){if(!$('overlay').classList.contains('hidden')&&state.phase!=='results'){closeInfo();}else pauseGame();return;}
  if(e.code==='KeyR'&&!e.repeat&&state.phase==='playing')resetOnRoad();
  if(e.code==='KeyE'&&!e.repeat)chooseOtherJob();
  keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
function suspendGame(){
  keys.clear();touchDrive.cancelAll();touchSteering=0;
  if(state.phase==='playing')pauseGame();
  audioContext?.suspend();
}
window.addEventListener('blur',suspendGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendGame();});
window.addEventListener('blur',()=>touchDrive.cancelAll());
$('mobile-pause').onclick=pauseGame;
const driveButtons=[...document.querySelectorAll('[data-drive]')];
$('world').addEventListener('pointerdown',e=>{if(mobileDrive&&e.pointerType==='touch')useControlMode('touch');});
for(const button of driveButtons){
  button.addEventListener('pointerdown',e=>{if(state.phase!=='playing')return;e.preventDefault();useControlMode('touch');button.setPointerCapture(e.pointerId);touchDrive.down(e.pointerId,button.dataset.drive);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>touchDrive.up(e.pointerId));
  button.addEventListener('contextmenu',e=>e.preventDefault());
}

function collide() {
  if(state.hit>0)return;
  state.hit=.35;state.speed*=.82;beep(false);
}
function blocked(x,z) {
  if(realMode)return cityWorld.realWorld.blocked(x,z);
  if(Math.abs(x)>limit||Math.abs(z)>limit)return true;
  // Canal is impassable except on bridges.
  if(Math.abs(x-canalX)<10&&!roads.some(n=>Math.abs(z-n)<12))return true;
  return colliders.some(b=>Math.abs(x-b.x)<b.w&&Math.abs(z-b.z)<b.d);
}
function resolveArcadeCollision(nx,nz,dt) {
  // The player always owns the steering. A glancing contact slides along the
  // wall; a frontal contact slows at the wall. No automatic yaw or rebound.
  if(Math.abs(state.speed)>5)collide();
  let moved=false;
  if(!blocked(nx,state.z)){state.x=nx;moved=true;}
  if(!blocked(state.x,nz)){state.z=nz;moved=true;}
  if(!moved)state.speed*=Math.exp(-dt*3.5);
}
function tickPlayer(dt) {
  const touchControl=controlMode==='touch';
  state.elapsed+=dt;state.time=Math.max(0,state.time-dt);state.hit=Math.max(0,state.hit-dt);
  const touch=touchDrive.sample(performance.now());
  const approach=touchControl?distanceToTarget():Infinity;
  const assistedStop=touchControl&&approach<12&&Math.abs(touch.turn)<.15;
  const brake=keys.has('Space')||(touchControl&&(touch.brake||!touch.accelerate||assistedStop));
  const up=keys.has('KeyW')||keys.has('ArrowUp')||(touchControl&&touch.accelerate), down=keys.has('KeyS')||keys.has('ArrowDown');
  const boost=(keys.has('ShiftLeft')||keys.has('ShiftRight')||(touchControl&&touch.turbo))&&state.boost>0&&up&&!brake;
  const maxSpeed=boost?76:51;
  if(up&&!brake)state.speed+=dt*(boost?52:33);
  else if(down)state.speed-=dt*31;
  else state.speed*=Math.exp(-dt*.65);
  if(brake)state.speed*=Math.exp(-dt*(touchControl?7.5:5.8));
  if(state.speed>maxSpeed)state.speed=Math.max(maxSpeed,state.speed-dt*22);
  if(touchControl)state.speed=Math.min(state.speed,maxSpeed);
  state.speed=clamp(state.speed,-13,78);
  if(boost)state.boost=Math.max(0,state.boost-dt*27);else state.boost=Math.min(100,state.boost+dt*17);
  let turn=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
  if(touchControl){touchSteering=THREE.MathUtils.damp(touchSteering,touch.accelerate?touch.turn:0,11,dt);turn=clamp(turn+touchSteering,-1,1);}
  state.angle+=turn*dt*(touchControl?2.1:brake?3.7:2.35)*(touchControl?clamp(Math.abs(state.speed)/5,.3,1):clamp(Math.abs(state.speed)/7,0,1))*(state.speed<0?-1:1);
  const px=state.x,pz=state.z;
  const nx=state.x-Math.sin(state.angle)*state.speed*dt,nz=state.z-Math.cos(state.angle)*state.speed*dt;
  if(blocked(nx,nz)) {
    resolveArcadeCollision(nx,nz,dt);
  } else {state.x=nx;state.z=nz;}
  tickDestruction(px,pz,state.x,state.z);
  state.comboTime=Math.max(0,state.comboTime-dt);if(!state.comboTime)state.combo=0;
  document.body.classList.toggle('turbo-active',boost&&state.speed>30);
  lean.rotation.z=THREE.MathUtils.damp(lean.rotation.z,turn*clamp(state.speed/40,-1,1)*.43,7,dt);
  bike.position.set(state.x,Math.sin(state.elapsed*20)*.012*Math.abs(state.speed)/20,state.z);bike.rotation.y=state.angle;
  for(const w of wheels)w.rotation.x-=state.speed*dt/.52;
  lean.visible=true;
  if(state.stage==='pickup'&&state.mode==='delivery'){
    const nearby=Math.abs(state.speed)<4?deliveryJobs.findIndex(j=>Math.hypot(j.pickup[0]-state.x,j.pickup[1]-state.z)<(touchControl?12:7)):-1;
    if(nearby>=0&&nearby!==state.jobIndex){state.jobIndex=nearby;setTarget();}
  }
  const dist=distanceToTarget();
  $('pickup-prompt').classList.toggle('hidden',dist>15);
  if(dist<15) $('pickup-prompt').textContent=Math.abs(state.speed)>4?'Frená junto a la puerta':state.stage==='pickup'?'Retirando el pedido del local…':`${job().home?.personName||'Tu cliente'} está recibiendo el pedido…`;
  if(dist<(touchControl?12:7)&&Math.abs(state.speed)<4) {
    state.stopTime+=dt;
    if(state.stopTime>.65) {
      state.stopTime=0;beep();
      if(state.stage==='pickup') {
        state.stage='drop';passenger.visible=false;setTarget();toast('PEDIDO A BORDO. ¡METELE!',1.8);
      } else {
        const tip=Math.round(Math.max(0,150-state.elapsed)*2);
        state.cash+=job().reward+tip;state.completed++;state.time=Math.min(240,state.time+15);
        const earned=job().reward+tip;state.jobIndex=randomJob(state.jobIndex);state.stage='pickup';passenger.visible=false;
        toast(`¡ENTREGADO! +${points(earned)} · +15 SEG`,2.8);
        setTarget();
      }
    }
  } else state.stopTime=0;
  const camDist=touchControl?6.2+Math.abs(state.speed)*.025:8.7+Math.abs(state.speed)*.055;
  const desired=new THREE.Vector3(state.x+Math.sin(state.angle)*camDist,(touchControl?3.6:4.9)+Math.abs(state.speed)*(touchControl?.012:.025),state.z+Math.cos(state.angle)*camDist);
  camera.position.lerp(desired,1-Math.exp(-dt*6));
  camera.lookAt(state.x-Math.sin(state.angle)*10,2.2,state.z-Math.cos(state.angle)*10);
  camera.fov=THREE.MathUtils.damp(camera.fov,boost?83:touchControl&&camera.aspect<1?75:64,3,dt);camera.updateProjectionMatrix();
  sun.position.set(state.x-110,dayPeriods[state.dayPeriod].height,state.z+100);sun.target.position.set(state.x,0,state.z);
  if(state.time<=0)finishGame();
}
function tickDestruction(px,pz,nx,nz) {
  if(Math.abs(state.speed)<6)return;
  const dx=nx-px,dz=nz-pz,len=dx*dx+dz*dz;
  for(const prop of breakables){
    if(prop.broken||Math.abs(prop.x-nx)>8||Math.abs(prop.z-nz)>8)continue;
    const t=len?clamp(((prop.x-px)*dx+(prop.z-pz)*dz)/len,0,1):0;
    if(Math.hypot(prop.x-px-dx*t,prop.z-pz-dz*t)>prop.r+.65)continue;
    if(effects.smash(prop,-Math.sin(state.angle)*state.speed,-Math.cos(state.angle)*state.speed,Math.abs(state.speed))){
      state.combo=Math.min(10,state.combo+1);state.comboTime=3;state.smashed++;
      const bonus=100*state.combo;state.cash+=bonus;state.boost=Math.min(100,state.boost+7);
      $('combo').textContent=`CRAZY SMASH! ×${state.combo}`;$('combo').classList.remove('hidden');
      $('money').textContent=points(state.cash);beep();
    }
  }
}
function tickTraffic(dt) {
  for(const car of cars) {
    if(realMode){
      advanceTraffic(cityWorld.network,car.realState,dt,random);car.mesh.rotation.y=car.realState.angle;const laneOffset=2.2;car.mesh.position.set(car.realState.position.x+Math.cos(car.realState.angle)*laneOffset,0,car.realState.position.z-Math.sin(car.realState.angle)*laneOffset);
    }else{
    car.pos+=car.dir*car.speed*dt;if(car.pos>limit+10)car.pos=-limit-10;if(car.pos<-limit-10)car.pos=limit+10;
    const lane=car.lane+car.dir*(car.parked?(isPilot?6.1:9.4):4.4);
    if(car.axis==='z') {car.mesh.position.set(lane,0,car.pos);car.mesh.rotation.y=car.dir>0?Math.PI:0;}
    else {car.mesh.position.set(car.pos,0,lane);car.mesh.rotation.y=car.dir>0?-Math.PI/2:Math.PI/2;}
    }
    if(state.phase!=='playing')continue;
    const dx=Math.abs(state.x-car.mesh.position.x),dz=Math.abs(state.z-car.mesh.position.z);
    const hit=realMode?Math.hypot(dx,dz)<(car.bus?3.5:2.5):car.axis==='z'?dx<1.65&&dz<(car.bus?4.8:2.9):dz<1.65&&dx<(car.bus?4.8:2.9);
    if(hit&&state.hit<=0)collide();
    const near=Math.hypot(dx,dz)<5.4;
    if(near&&!car.near&&!hit&&state.speed>17) {state.cash+=100;updateHUD();toast('FINITO, FINITO +100 pts',.85);}
    car.near=near;
  }
}
const mapCtx=$('minimap').getContext('2d');
let routeCache=null;
function routePoints() {
  if(realMode){const goal=target(),now=performance.now();if(!routeCache||now-routeCache.time>1200||routeCache.goal!==goal){const route=routeBetween(cityWorld.network,state,{x:goal[0],z:goal[1]});routeCache={time:now,goal,points:route?[[state.x,state.z],...route.points.map(p=>[p.x,p.z]),goal]:[[state.x,state.z]]};}const out=routeCache.points.slice();out[0]=[state.x,state.z];return out;}
  const t=target(),nearest=v=>roads.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a);
  const sx=nearest(state.x),sz=nearest(state.z),tx=nearest(t[0]),tz=nearest(t[1]);
  const startVertical=Math.abs(state.x-sx)<Math.abs(state.z-sz);
  const endVertical=Math.abs(t[0]-tx)<Math.abs(t[1]-tz);
  const source=startVertical?[sx,state.z]:[state.x,sz];
  const dest=endVertical?[tx,t[1]]:[t[0],tz];
  if(startVertical&&endVertical&&sx===tx)return [[state.x,state.z],source,dest,t];
  if(!startVertical&&!endVertical&&sz===tz)return [[state.x,state.z],source,dest,t];
  const path=[[state.x,state.z],source,[sx,sz]];
  if(startVertical){path.push([sx,tz],[tx,tz]);}else{path.push([tx,sz],[tx,tz]);}
  path.push(dest,t);return path;
}
function routeDistance(){const p=routePoints();let d=0;for(let i=1;i<p.length;i++)d+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return d;}
function formatDistance(d){return d>=1000?(d/1000).toFixed(1).replace('.',',')+' km':Math.round(d)+' m';}
function drawMap() {
  drawNavigationMap({ctx:mapCtx,player:state,roads,limit,canalX,realNetwork:realMode?cityWorld.network:null,target:target(),route:routePoints(),pickups:state.stage==='pickup'&&state.mode==='delivery'?deliveryJobs.map(j=>j.pickup):[]});
}

let hudElapsed=0;
function tickHUD(dt) {
  hudElapsed+=dt;if(hudElapsed<.08)return;hudElapsed=0;
  document.body.classList.toggle('touch-hints-done',state.elapsed>10);
  if(controlMode==='touch'){const pressed=touchDrive.sample().pressed;for(const button of driveButtons)button.classList.toggle('pressed',pressed.includes(button.dataset.drive));}
  if(premiumLayer?.getMetrics){const m=premiumLayer.getMetrics();$('world').dataset.fps=String(m.fps);$('world').dataset.renderScale=String(m.pixelRatio);}
  const seconds=Math.ceil(state.time);$('time').textContent=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
  $('time-bar').style.width=`${Math.min(100,state.time/180*100)}%`;$('time').parentElement.classList.toggle('urgent',state.time<30);
  $('speed').textContent=Math.round(Math.abs(state.speed)*3.6);$('boost-bar').style.width=state.boost+'%';$('boost-label').textContent=state.boost>95?'LISTO':Math.round(state.boost)+'%';
  const t=target(),dx=t[0]-state.x,dz=t[1]-state.z;
  const dist=routeDistance();$('job-distance').textContent=formatDistance(dist);
  $('direction-distance').textContent=dist<12?'FRENÁ EN LA MARCA':`${formatDistance(dist)} · ${state.stage==='pickup'?'RECOGER':'DESTINO'}`;
  const a=Math.atan2(dx,-dz)+state.angle;
  $('direction-arrow').style.transform=`rotate(${a}rad)`;
  let district=state.x<-250?'ALBERDI':state.x<-120?'LA CAÑADA':state.z<-75?'CENTRO HISTÓRICO':state.z>300&&state.x>0?'PARQUE SARMIENTO':state.x<0?'BARRIO GÜEMES':'NUEVA CÓRDOBA';
  $('district').textContent=district;drawMap();
}
function resize() {const w=$('game-shell').clientWidth,h=$('game-shell').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
let last=performance.now(),clock=0;
function animate(now) {
  const dt=Math.min((now-last)/1000,.05);last=now;clock+=dt;
  if(state.phase==='playing')tickPlayer(dt);
  if(state.phase==='playing'||state.phase==='menu')tickTraffic(dt);
  if(!premiumLayer)updateVehicleBatches();
  if(state.phase==='playing')effects.tick(dt);
  if(state.comboTime<=0)$('combo').classList.add('hidden');
  for(const p of people){
    if(p.waiting){p.arm.rotation.z=-2.5+Math.sin(clock*7)*.4;p.mesh.rotation.y=Math.atan2(state.x-p.mesh.position.x,state.z-p.mesh.position.z);}
    else if(p.walk){const stride=clock*3+p.phase;p.leftLeg.rotation.x=Math.sin(stride)*.32;p.rightLeg.rotation.x=-Math.sin(stride)*.32;p.leftArm.rotation.x=-Math.sin(stride)*.25;p.arm.rotation.x=Math.sin(stride)*.25;p.mesh.position.z=p.baseZ+Math.sin(clock*.2+p.phase)*7;p.mesh.rotation.y=Math.cos(clock*.2+p.phase)>0?0:Math.PI;}
    else p.arm.rotation.z=-.12;
  }
  if(premiumLayer)premiumLayer.update(state.phase==='paused'?0:dt);
  cityWorld.updateCrowds();
  streetProps.update();
  if(state.phase==='menu') {
    const start=startZone();bike.position.set(start.x,0,start.z);bike.rotation.y=start.angle;lean.visible=true;lean.rotation.z=0;
    $('district').textContent=start===startZones.centro?'CATEDRAL · PLAZA SAN MARTÍN':start===startZones.nueva?'CAPUCHINOS · BUEN PASTOR':'LA CAÑADA · GÜEMES';
    // The wide preview shows the road, the rider and Córdoba's skyline together.
    const p=new THREE.Vector3(...start.preview);
    p.x+=Math.sin(clock*.055)*5;
    camera.position.lerp(p,1-Math.exp(-dt*2));camera.lookAt(...start.look);
    camera.fov=55;camera.updateProjectionMatrix();sun.position.set(-110,isPilot?70:130,100);sun.target.position.set(0,0,0);
  }
  if(state.phase==='playing'||state.phase==='paused')tickHUD(dt);
  chevron.position.y=8+Math.sin(clock*2.5)*.6;chevron.rotation.y=clock*.6;
  ring.scale.setScalar((controlMode==='touch'?1.8:1)*(1+Math.sin(clock*3)*.025));
  if(now>toastUntil)$('toast').classList.add('hidden');
  if(engineGain&&audioContext) {
    const active=state.audio&&state.phase==='playing';engineGain.gain.setTargetAtTime(active ? .025 : 0,audioContext.currentTime,.1);
    oscillator.frequency.setTargetAtTime(43+Math.abs(state.speed)*3,audioContext.currentTime,.1);
  }
  if(premiumLayer)premiumLayer.render(dt);else renderer.render(scene,camera);requestAnimationFrame(animate);
}
camera.position.set(...startZone().preview);camera.lookAt(...startZone().look);
renderer.render(scene,camera);requestAnimationFrame(animate);
if(isPilot){
  $('loading').innerHTML='<span class="loader"></span> Cargando';
  import('./premium.js?v=0.32').then(({loadDistrict})=>loadDistrict({renderer,scene,camera,cityWorld,cars,vehicleBatches,bike,lean,riderModel,passengerModel,material,getState:()=>state})).then(layer=>{premiumLayer=layer;$('loading').classList.add('hidden');gameHost.send('ready');}).catch(error=>{
    console.error('No se pudo cargar la zona piloto',error);
    $('loading').innerHTML='<div style="max-width:330px;line-height:1.8;text-align:center">No se pudieron cargar los modelos de la zona piloto. <br><button id="retry-assets" class="start-button">REINTENTAR ↗</button></div>';
    $('retry-assets').onclick=()=>window.location.reload();
  });
}else $('loading').classList.add('hidden');
// Read-only diagnostics to verify real simulation behaviour without changing game state.
window.crazyMoto={getSnapshot:()=>({phase:state.phase,mode:state.mode,time:state.time,cash:state.cash,completed:state.completed,x:state.x,z:state.z,speed:state.speed,boost:state.boost,stage:state.stage,jobIndex:state.jobIndex,dayPeriod:dayPeriods[state.dayPeriod].name,performance:premiumLayer?.getMetrics(),target:[...target()],renderer:renderer.info.render})};
const gameHost=installGameHost({host:window,pause:suspendGame,snapshot:window.crazyMoto.getSnapshot,back:()=>{
  if(state.phase==='playing'){suspendGame();return true;}
  return false;
}});
document.body.classList.toggle('native-app',!!window.RapiboyNative);
$('exit-game').onclick=()=>gameHost.api.exit();
