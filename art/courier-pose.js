import * as THREE from '../vendor/three.module.js';

// Resolve the sanitized bone names produced by GLTFLoader, then pose the seated rider.
export function poseCourierDriver(driver,lean){
  driver.root.rotation.y=Math.PI;driver.root.updateWorldMatrix(true,true);
  const hips=driver.clone.getObjectByName('Hips');
  if(hips){const hp=lean.worldToLocal(hips.getWorldPosition(new THREE.Vector3()));driver.root.position.y+=1.23-hp.y;driver.root.position.z+=.22-hp.z;}
  driver.root.rotation.y=Math.PI;
  driver.root.updateWorldMatrix(true,true);
  const abdomen=driver.clone.getObjectByName('Abdomen');if(abdomen){const axis=new THREE.Vector3(1,0,0).applyQuaternion(lean.getWorldQuaternion(new THREE.Quaternion())),delta=new THREE.Quaternion().setFromAxisAngle(axis,-.55),worldQ=abdomen.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta),parentQ=abdomen.parent.getWorldQuaternion(new THREE.Quaternion());abdomen.quaternion.copy(parentQ.invert().multiply(worldQ));driver.root.updateWorldMatrix(true,true);}
  // Imported anatomical limbs are posed with two-bone IK, so hands meet the grips
  // and knees/feet remain connected to the seated body.
  function solveLimb(root,upperName,lowerName,endName,target,pole){
    const bone=name=>root.getObjectByName(name.replaceAll('.',''));
    const upper=bone(upperName),lower=bone(lowerName),end=bone(endName);if(!upper||!lower||!end)throw new Error('Falta un hueso del conductor: '+upperName);
    root.updateWorldMatrix(true,true);
    const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=end.getWorldPosition(new THREE.Vector3());
    const destination=lean.localToWorld(new THREE.Vector3(...target)),poleWorld=lean.localToWorld(new THREE.Vector3(...pole));
    const l1=a.distanceTo(b),l2=b.distanceTo(c),axis=destination.clone().sub(a),distance=THREE.MathUtils.clamp(axis.length(),Math.abs(l1-l2)+.001,l1+l2-.001);axis.normalize();
    const ortho=poleWorld.sub(a);ortho.addScaledVector(axis,-ortho.dot(axis)).normalize();
    const cosine=THREE.MathUtils.clamp((l1*l1+distance*distance-l2*l2)/(2*l1*distance),-1,1);
    const elbow=a.clone().addScaledVector(axis,l1*cosine).addScaledVector(ortho,l1*Math.sqrt(1-cosine*cosine));
    function aim(bone,current,to){
      const position=bone.getWorldPosition(new THREE.Vector3());
      const rotation=new THREE.Quaternion().setFromUnitVectors(current.clone().sub(position).normalize(),to.clone().sub(position).normalize());
      const world=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(rotation),parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.copy(parent.invert().multiply(world));bone.updateWorldMatrix(false,true);
    }
    aim(upper,b,elbow);root.updateWorldMatrix(true,true);aim(lower,end.getWorldPosition(new THREE.Vector3()),destination);
  }
  for(const [side,name] of [[-1,'L'],[1,'R']]){
    solveLimb(driver.clone,`UpperLeg.${name}`,`LowerLeg.${name}`,`LowerLeg.${name}_end`,[side*.38,.72,.25],[side*.7,1.1,-.65]);
    solveLimb(driver.clone,`UpperArm.${name}`,`LowerArm.${name}`,`Wrist.${name}`,[side*.40,1.58,-.42],[side*.60,1.65,-.12]);
  }
  for(const [side,name] of [[-1,'L'],[1,'R']]){const foot=driver.clone.getObjectByName('Foot'+name);if(foot){foot.position.copy(foot.parent.worldToLocal(lean.localToWorld(new THREE.Vector3(side*.38,.72,.25))));}}

  driver.root.updateWorldMatrix(true,true);
}
