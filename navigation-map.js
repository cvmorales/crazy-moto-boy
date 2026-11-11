const SIZE=280,CENTER=SIZE/2,RADIUS=136;

// Heading-up projection: the rider is always in the exact center, facing up.
export function navigationPoint(x,z,player,scale=.7){
  const dx=(x-player.x)*scale,dz=(z-player.z)*scale,c=Math.cos(player.angle),s=Math.sin(player.angle);
  return {x:CENTER+dx*c-dz*s,y:CENTER+dx*s+dz*c};
}
export function drawNavigationMap({ctx,player,roads,limit,canalX,target,route,pickups=[]}){
  const scale=.9-Math.min(45,Math.abs(player.speed))*.007;
  const p=(x,z)=>navigationPoint(x,z,player,scale);
  const line=(points)=>{ctx.beginPath();points.forEach(([x,z],i)=>{const v=p(x,z);if(i)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y);});};
  function block(x,z,w,d,color){ctx.fillStyle=color;line([[x,z],[x+w,z],[x+w,z+d],[x,z+d]]);ctx.closePath();ctx.fill();}
  ctx.clearRect(0,0,SIZE,SIZE);ctx.save();ctx.beginPath();ctx.arc(CENTER,CENTER,RADIUS,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#152a30';ctx.fillRect(0,0,SIZE,SIZE);
  for(let i=0;i<roads.length-1;i++)for(let j=0;j<roads.length-1;j++)block(roads[i]+12,roads[j]+12,76,76,'#294146');
  block(14,-86,72,72,'#355d4a');block(114,14,72,72,'#355d4a');block(canalX-6,-limit,12,limit*2,'#458ba0');
  ctx.strokeStyle='#67818a';ctx.lineWidth=15*scale;ctx.lineCap='round';
  for(const n of roads){line([[n,-limit],[n,limit]]);ctx.stroke();line([[-limit,n],[limit,n]]);ctx.stroke();}
  for(const pos of pickups){const v=p(...pos);ctx.beginPath();ctx.arc(v.x,v.y,4,0,Math.PI*2);ctx.fillStyle='#61e3ba';ctx.fill();}
  line(route);ctx.strokeStyle='#14211f';ctx.lineWidth=11;ctx.lineJoin='round';ctx.stroke();
  line(route);ctx.strokeStyle='#e7f26c';ctx.lineWidth=6;ctx.stroke();
  // Small arrows on the route make its direction readable through intersections.
  for(let i=1;i<route.length;i++){
    const a=p(...route[i-1]),b=p(...route[i]),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<30)continue;
    for(let d=28;d<length;d+=38){const x=a.x+dx*d/length,y=a.y+dy*d/length,r=Math.hypot(x-CENTER,y-CENTER);if(r<31||r>RADIUS-18)continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx)+Math.PI/2);ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();ctx.fillStyle='#fffce0';ctx.fill();ctx.restore();
    }
  }
  const goal=p(...target),dx=goal.x-CENTER,dy=goal.y-CENTER,d=Math.hypot(dx,dy);
  if(d>RADIUS-19){
    const x=CENTER+dx/d*(RADIUS-16),y=CENTER+dy/d*(RADIUS-16);
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx)+Math.PI/2);ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(-8,6);ctx.lineTo(0,2);ctx.lineTo(8,6);ctx.closePath();ctx.fillStyle='#ffcb5a';ctx.strokeStyle='#142a30';ctx.lineWidth=3;ctx.stroke();ctx.fill();ctx.restore();
  }else{ctx.beginPath();ctx.arc(goal.x,goal.y,8,0,Math.PI*2);ctx.fillStyle='#f5c857';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff2b3';ctx.stroke();}
  ctx.restore();
  // Fixed, top-down motorcycle icon: front wheel and handlebars point upwards.
  ctx.save();ctx.translate(CENTER,CENTER);ctx.fillStyle='#1e92b744';ctx.beginPath();ctx.arc(0,0,23,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#fffbe2';ctx.lineWidth=2;ctx.fillStyle='#17292e';ctx.fillRect(-3,-19,6,11);ctx.strokeRect(-3,-19,6,11);ctx.fillRect(-3,9,6,12);ctx.strokeRect(-3,9,6,12);
  ctx.strokeStyle='#d5f2ee';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-11,-9);ctx.lineTo(11,-9);ctx.stroke();
  ctx.fillStyle='#44b9db';ctx.fillRect(-7,-7,14,19);ctx.fillStyle='#ff8c44';ctx.fillRect(-6,5,12,9);
  ctx.fillStyle='#fffde8';ctx.beginPath();ctx.arc(0,-3,6,0,Math.PI*2);ctx.fill();ctx.restore();
}
