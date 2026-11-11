// Each button pointer owns its action, so pedal and steering work simultaneously.
export function createTouchDrive(){
  const pointers=new Map(),actions=new Set(['gas','brake','left','right','turbo']);
  function down(id,action){if(actions.has(action))pointers.set(id,action);}
  function up(id){pointers.delete(id);}
  function cancelAll(){pointers.clear();}
  function sample(){
    const pressed=new Set(pointers.values()),brake=pressed.has('brake');
    return {turn:Number(pressed.has('left'))-Number(pressed.has('right')),brake,accelerate:!brake&&(pressed.has('gas')||pressed.has('turbo')),turbo:!brake&&pressed.has('turbo'),touching:pointers.size>0,pressed:[...pressed]};
  }
  return {down,up,cancelAll,sample};
}
