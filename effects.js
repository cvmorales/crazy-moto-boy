export function createArcadeEffects({THREE,scene,material,unitBox,random}) {
  const debris=[];
  function smash(prop,vx,vz,speed) {
    if(prop.broken)return false;
    prop.broken=true;prop.mesh.visible=false;
    prop.onBreak?.();prop.mesh.updateWorldMatrix(true,true);
    const parts=prop.fragments,fragments=parts?.length?Array.from({length:Math.min(12,parts.length)},(_,i)=>parts[Math.floor(i*parts.length/Math.min(12,parts.length))]):undefined;
    for(let i=0;i<(fragments?.length||12);i++){
      const part=fragments?.[i];
      const mesh=new THREE.Mesh(part?.geometry||unitBox,part?.material||material(prop.colors[i%prop.colors.length]));
      if(part){part.matrixWorld.decompose(mesh.position,mesh.quaternion,mesh.scale);}
      else{mesh.scale.set(.18+random()*.6,.12+random()*.5,.15+random()*.55);mesh.position.set(prop.x+(random()-.5)*2,.6+random(),prop.z+(random()-.5)*2);mesh.rotation.set(random()*3,random()*3,random()*3);}
      mesh.castShadow=false;scene.add(mesh);
      debris.push({mesh,vx:vx*.45+(random()-.5)*12,vy:4+random()*6+speed*.07,vz:vz*.45+(random()-.5)*12,life:4+random()*2,spin:(random()-.5)*12});
    }
    while(debris.length>180){const d=debris.shift();scene.remove(d.mesh);}
    return true;
  }
  function tick(dt) {
    for(let i=debris.length-1;i>=0;i--){const d=debris[i];d.life-=dt;d.vy-=22*dt;d.mesh.position.x+=d.vx*dt;d.mesh.position.y+=d.vy*dt;d.mesh.position.z+=d.vz*dt;d.mesh.rotation.x+=d.spin*dt;d.mesh.rotation.z+=d.spin*.7*dt;
      if(d.mesh.position.y<.15){d.mesh.position.y=.15;d.vy=Math.abs(d.vy)*.28;d.vx*=.8;d.vz*=.8;d.spin*=.7;}
      if(d.life<1)d.mesh.scale.multiplyScalar(Math.exp(-dt*2));
      if(d.life<=0){scene.remove(d.mesh);debris.splice(i,1);}
    }
  }
  function reset(){for(const d of debris)scene.remove(d.mesh);debris.length=0;}
  return {smash,tick,reset,count:()=>debris.length};
}
