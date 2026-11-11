// Host contract shared by the Android wrapper and the browser build.
export function installGameHost({host, pause, snapshot, back}) {
  const send=(type,detail={})=>{
    const message={source:'crazy-moto',version:1,type,...detail};
    host.RapiboyNative?.postMessage(JSON.stringify(message));
    return message;
  };
  const api=Object.freeze({
    pause(){pause();},
    resume(){/* Returning to the app keeps the turn paused until the player continues. */},
    back(){if(!back())send('exit');},
    getSnapshot(){return snapshot();},
    exit(){pause();send('exit');}
  });
  host.RapiboyGame=api;
  return {send,api};
}
