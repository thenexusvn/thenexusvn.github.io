/* ---------- input ---------- */
const keys=new Set();let active=false,locked=false,mouseL=false;const K=k=>keys.has(k);
const cv=renderer.domElement;cv.style.touchAction='none';
function onKey(e){if(!active)return;const k=e.key.toLowerCase();if([' ','tab'].includes(k))e.preventDefault();sfxInit();if(e.repeat){keys.add(k);return;}keys.add(k);if(phase!=='match')return;
  if(k===' '&&P.state==='plane')jump();else if(k===' '&&P.state==='fall')openChute();
  if(k==='e')tryPick();if(k==='f'){if(P.car)exitCar();else if(nearCar)enterCar(nearCar);else if(P.state==='plane')jump();}
  if(k==='r')startReload();if(k==='h')useHeal();if(k==='c'||k==='control')P.crouch=!P.crouch;if(k==='m')toggleBigMap();
  if(k==='1'||k==='2'||k==='3')switchSlot(+k-1);if(k==='x'){P.cur=-1;equipGun(P.H,null);hudDirty=true;}}
const offKey=e=>{keys.delete(e.key.toLowerCase());};
addEventListener('keydown',onKey);addEventListener('keyup',offKey);
function switchSlot(i){if(!P.slots[i]||P.cur===i)return;P.cur=i;P.reloadT=0;equipGun(P.H,P.slots[i].w);hudDirty=true;}
function tryPick(){if(nearItem)playerPick(nearItem);}
cv.addEventListener('mousedown',e=>{sfxInit();if(!active||phase!=='match')return;if(!locked&&!MOBILE){try{cv.requestPointerLock();}catch(_){}}if(e.button===0)mouseL=true;if(e.button===2)cam.aim=true;});
addEventListener('mouseup',e=>{if(e.button===0)mouseL=false;if(e.button===2)cam.aim=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cv;});
addEventListener('mousemove',e=>{if(!active||phase!=='match'||!locked)return;const s=.0022*save.sens*(cam.aim?(P.slots[P.cur]&&P.slots[P.cur].w==='sniper'?.3:.6):1);cam.yaw-=e.movementX*s;cam.pitch=clamp(cam.pitch+e.movementY*s,-1.2,1.35);});
cv.addEventListener('wheel',e=>{if(phase!=='match')return;const own=[0,1,2].filter(i=>P.slots[i]);if(!own.length)return;const i=own.indexOf(P.cur);switchSlot(own[(i+(e.deltaY>0?1:-1)+own.length)%own.length]);},{passive:true});
/* touch: left joystick, right side drag to look, buttons */
const joy={x:0,y:0,id:null},look={id:null,x:0,y:0},tb={fire:false,jump:false};
/* ---------- player update ---------- */
function playerUpdate(dt){if(P.state==='dead'){animHuman(P.H,dt,{dead:true});return;}
  if(P.state==='plane'){const k=plane.t/plane.dur;P.x=lerp(plane.x0,plane.x1,k);P.z=lerp(plane.z0,plane.z1,k);P.y=plane.y;if(k>.95)jump();return;}
  const fwd=clamp((K('w')||K('arrowup')?1:0)-(K('s')||K('arrowdown')?1:0)+joy.y,-1,1),side=clamp((K('d')||K('arrowright')?1:0)-(K('a')||K('arrowleft')?1:0)+joy.x,-1,1);
  const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),rx=-Math.cos(cam.yaw),rz=Math.sin(cam.yaw);
  if(P.state==='car'){const c=P.car;carUpdate(c,dt,fwd,side,K(' '));P.x=c.x;P.y=c.y;P.z=c.z;if(c.hp<=0&&c.spd<1){exitCar();}return;}
  if(P.state==='fall'||P.state==='para'){const gh=heightAt(P.x,P.z),hs=P.state==='fall'?(fwd>0?26:14):11;P.x+=(fx*fwd+rx*side)*hs*dt;P.z+=(fz*fwd+rz*side)*hs*dt;
    P.vy=P.state==='fall'?Math.max(P.vy-30*dt,fwd>0?-62:-48):lerp(P.vy,-5.5,Math.min(1,dt*3));P.y+=P.vy*dt;P.h=lerpA(P.h,cam.yaw,Math.min(1,dt*4));
    if(P.state==='fall'&&P.y-gh<110)openChute();if(P.y<=Math.max(gh,-1)){P.y=Math.max(gh,-1);P.state='ground';P.vy=0;if(P.H.chute){P.H.root.remove(P.H.chute);P.H.chute=null;}cam.pitch=.12;hudDirty=true;}
    P.x=clamp(P.x,-HM+5,HM-5);P.z=clamp(P.z,-HM+5,HM-5);P.H.root.position.set(P.x,P.y,P.z);P.H.root.rotation.y=P.h;animHuman(P.H,dt,{spd:0,air:P.state});return;}
  // ground
  P.fireCD-=dt;P.recoil=Math.max(0,P.recoil-dt*3);if(P.hitT>0)P.hitT-=dt;
  if(P.reloadT>0){P.reloadT-=dt;if(P.reloadT<=0)finishReload();}
  if(P.healT>0){P.healT-=dt;if(P.healT<=0){if(P.healK==='medkit'){P.hp=Math.min(100,P.hp+75);P.heals.medkit--;}else{P.hp=Math.min(75,Math.max(P.hp,P.hp+15));P.heals.bandage--;}P.healK=null;hudDirty=true;}}
  const swim=heightAt(P.x,P.z)<-.9,sprint=(K('shift')||joy.y>.92)&&fwd>0&&!cam.aim&&P.healT<=0&&!P.crouch&&!swim;
  let spd=swim?2.6:P.crouch?2.4:cam.aim?3:sprint?7.4:5;if(P.healT>0)spd=Math.min(spd,2);
  let mx=fx*fwd+rx*side,mz=fz*fwd+rz*side;const ml=hyp(mx,mz);if(ml>1){mx/=ml;mz/=ml;}
  P.x+=mx*spd*dt;P.z+=mz*spd*dt;P.moving=ml>.05?spd:0;
  const p=resolve(P.x,P.z,.38,P.y);if(p){P.x+=p[0];P.z+=p[1];}P.x=clamp(P.x,-HM+5,HM-5);P.z=clamp(P.z,-HM+5,HM-5);
  const floor=Math.max(heightAt(P.x,P.z),swim?-1.1:-9);if(K(' ')&&P.y<=floor+.01&&!swim){P.vy=5.6;P.crouch=false;}P.vy-=22*dt;P.y+=P.vy*dt;if(P.y<floor){P.y=floor;P.vy=0;}
  const armed=P.cur>=0&&P.slots[P.cur];if(armed||cam.aim||ml>.05)P.h=lerpA(P.h,cam.yaw,1-Math.exp(-(armed||cam.aim?20:10)*dt));
  if((mouseL||tb.fire)&&armed&&P.fireCD<=0&&P.reloadT<=0&&P.healT<=0&&!swim&&!sprint){const W=WEAP[armed.w];playerFire();if(!W.auto){mouseL=false;tb.fire=false;}}
  if(ml>.05&&P.y<=floor+.01){P.stepT-=dt*spd;if(P.stepT<=0){P.stepT=2.6;sfx('step');}}
  // zone damage
  if(zone.phase>=0&&!inZone(P.x,P.z)){P.hp-=zone.dps*dt;P.hitT=Math.max(P.hitT,.15);if(P.hp<=0)playerOut('Bo');}
  // nearest item / car
  nearItem=null;let bd=2.3;for(const it of items){const d=hyp(it.x-P.x,it.z-P.z);if(d<bd&&Math.abs(it.y-P.y)<2){bd=d;nearItem=it;}}
  if(nearItem){const k=ITEM_DEF[nearItem.t].k;if(k==='ammo'||k==='heal')playerPick(nearItem),nearItem=null;}
  nearCar=null;for(const c of cars){if(c.hp>0&&hyp(c.x-P.x,c.z-P.z)<3.2){nearCar=c;break;}}
  P.H.root.position.set(P.x,P.y,P.z);P.H.root.rotation.y=P.h;animHuman(P.H,dt,{spd:P.moving,aim:!!armed&&(cam.aim||mouseL||P.fireCD>-.6),crouch:P.crouch,pitch:clamp(cam.pitch-.12,-1,1),recoil:P.recoil,heal:P.healT>0});}
function jump(){if(P.state!=='plane')return;P.state='fall';P.vy=-5;P.y=plane.y-4;P.H.root.visible=true;cam.pitch=.5;feedMsg('Đã nhảy! Bấm Space để bung dù sớm.');hudDirty=true;}
function openChute(){if(P.state!=='fall')return;P.state='para';P.H.chute=makeChute('#c1f354');P.H.root.add(P.H.chute);sfx('chute');hudDirty=true;}
/* ---------- camera ---------- */
const camPos=new T.Vector3(),camTgt=new T.Vector3();
function camUpdate(dt){let tx,ty,tz,dist,up=.35,side=.75;const sniperAim=cam.aim&&P.cur>=0&&P.slots[P.cur]&&P.slots[P.cur].w==='sniper'&&P.state==='ground';
  if(phase!=='match'&&phase!=='result')return;
  if(P.state==='plane'){const k=plane.t/plane.dur;tx=lerp(plane.x0,plane.x1,k);tz=lerp(plane.z0,plane.z1,k);ty=plane.y;dist=42;up=8;side=0;}
  else if(P.state==='car'){tx=P.car.x;ty=P.car.y+1.8;tz=P.car.z;dist=8.5;up=1.2;side=0;}
  else if(P.state==='fall'||P.state==='para'){tx=P.x;ty=P.y+1.5;tz=P.z;dist=P.state==='fall'?7:9;side=0;}
  else{tx=P.x;ty=P.y+(P.crouch?1.15:1.58);tz=P.z;dist=cam.aim?1.9:3.4;}
  const fov=sniperAim?18:cam.aim&&P.state==='ground'?52:P.state==='fall'?82:70;if(Math.abs(camera.fov-fov)>.1){camera.fov=lerp(camera.fov,fov,Math.min(1,dt*14));camera.updateProjectionMatrix();}
  const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch),fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),rx=-Math.cos(cam.yaw),rz=Math.sin(cam.yaw);
  camTgt.set(tx+rx*side,ty+up*.3,tz+rz*side);
  if(sniperAim){camPos.set(tx+fx*.3,ty+.05,tz+fz*.3);P.H.root.visible=false;}
  else{let d=dist;const dir=_v1.set(-fx*cp,sp,-fz*cp);const o={x:camTgt.x,y:camTgt.y,z:camTgt.z};const hitT=P.state==='ground'?rayWorld(o,dir,d+.3):d+1;d=Math.max(.6,Math.min(d,hitT-.3));camPos.set(camTgt.x+dir.x*d,camTgt.y+dir.y*d+up*.2,camTgt.z+dir.z*d);
    const gh=heightAt(camPos.x,camPos.z)+.4;if(camPos.y<gh)camPos.y=gh;if(P.state==='ground'||P.state==='fall'||P.state==='para')P.H.root.visible=d>.9;}
  camera.position.copy(camPos);if(cam.shake>0){cam.shake-=dt;camera.position.x+=rnd(-1,1)*cam.shake*.3;camera.position.y+=rnd(-1,1)*cam.shake*.3;}
  const lx=camTgt.x+fx*cp*50,ly=camTgt.y-sp*50,lz=camTgt.z+fz*cp*50;camera.lookAt(lx,ly,lz);
  sky.position.copy(camera.position);sun.position.set(camera.position.x+sunDir.x*200,camera.position.y+sunDir.y*200,camera.position.z+sunDir.z*200);sun.target.position.set(camera.position.x+fx*30,camera.position.y-10,camera.position.z+fz*30);sun.target.updateMatrixWorld();}
/* ---------- HUD ---------- */
const css=document.createElement('style');css.textContent=`
.lz{position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif;color:#fff;user-select:none}.lz *{box-sizing:border-box}.lz [hidden]{display:none!important}
.lz-top{position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;gap:10px;align-items:center}
.lz-pill{background:rgba(8,10,14,.62);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:6px 12px;font:600 14px Inter,sans-serif;display:flex;gap:6px;align-items:center;backdrop-filter:blur(4px)}
.lz-pill b{font:700 17px "Space Grotesk",Inter,sans-serif}.lz-pill.zone{color:#9fc3ff}
.lz-comp{position:absolute;top:58px;left:50%;transform:translateX(-50%);width:min(420px,60vw);height:22px;overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 20%,#000 80%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 20%,#000 80%,transparent)}
.lz-comp div{position:absolute;top:0;height:22px;white-space:nowrap;font:600 12px Inter,sans-serif;color:#dfe6ee}.lz-comp i{position:absolute;left:50%;top:18px;width:2px;height:6px;background:#c1f354}
.lz-mini{position:absolute;top:14px;right:14px;width:190px;height:190px;border-radius:14px;overflow:hidden;border:2px solid rgba(0,0,0,.5);box-shadow:0 6px 20px rgba(0,0,0,.35)}.lz-mini canvas{width:100%;height:100%;display:block}
.lz-feed{position:absolute;top:214px;right:14px;display:grid;gap:4px;justify-items:end;font:600 13px Inter,sans-serif}.lz-feed span{background:rgba(8,10,14,.55);padding:3px 9px;border-radius:6px}
.lz-bl{position:absolute;left:16px;bottom:16px;width:min(330px,44vw);display:grid;gap:6px}
.lz-bar{height:14px;border-radius:7px;background:rgba(0,0,0,.55);overflow:hidden;position:relative}.lz-bar i{position:absolute;inset:0;transform-origin:left;background:#e9edf2;transition:transform .15s}.lz-bar.hp i{background:linear-gradient(90deg,#eaf6d8,#c1f354)}.lz-bar.low i{background:#ff6b6b}
.lz-bar span{position:absolute;right:8px;top:-1px;font:700 12px Inter,sans-serif;color:#0b0d10}
.lz-arm{display:flex;gap:6px}.lz-arm span{background:rgba(8,10,14,.62);border-radius:8px;padding:3px 8px;font:600 12px Inter,sans-serif}.lz-arm span.on{border:1px solid rgba(255,255,255,.25)}
.lz-heals{display:flex;gap:6px;font:600 12px Inter,sans-serif}.lz-heals span{background:rgba(8,10,14,.62);border-radius:8px;padding:3px 8px}
.lz-slots{position:absolute;right:16px;bottom:16px;display:grid;gap:6px;justify-items:end}
.lz-slot{min-width:210px;background:rgba(8,10,14,.62);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 12px;display:grid;grid-template-columns:20px 1fr auto;gap:8px;align-items:center;font:600 13px Inter,sans-serif;opacity:.65}
.lz-slot.on{opacity:1;border-color:#c1f354;box-shadow:0 0 0 1px rgba(193,243,84,.3)}.lz-slot .k{width:20px;height:20px;border-radius:5px;background:#fff;color:#111;display:grid;place-items:center;font-size:11px}.lz-slot b{font:700 20px "Space Grotesk",Inter,sans-serif}.lz-slot small{color:#aab}
.lz-cross{position:absolute;left:50%;top:50%;width:0;height:0}.lz-cross i{position:absolute;background:#fff;box-shadow:0 0 2px #000}.lz-cross .h{width:8px;height:2px;top:-1px}.lz-cross .v{width:2px;height:8px;left:-1px}
.lz-hit{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px;opacity:0;transition:opacity .2s}.lz-hit.on{opacity:1;transition:none}.lz-hit::before,.lz-hit::after{content:"";position:absolute;left:12px;top:0;width:2px;height:26px;background:#fff;transform:rotate(45deg)}.lz-hit::after{transform:rotate(-45deg)}.lz-hit.head::before,.lz-hit.head::after{background:#ffcf3d}.lz-hit.kill::before,.lz-hit.kill::after{background:#ff4d5e}
.lz-prompt{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);background:rgba(8,10,14,.72);padding:8px 14px;border-radius:10px;font:600 14px Inter,sans-serif;white-space:nowrap}.lz-prompt:empty{display:none}
.lz-prompt kbd{display:inline-block;min-width:22px;padding:1px 6px;margin-right:8px;border-radius:5px;background:#fff;color:#111;font:700 12px Inter,sans-serif;text-align:center}
.lz-center{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);text-align:center;font:700 22px "Space Grotesk",Inter,sans-serif;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.lz-prog{position:absolute;left:50%;top:62%;transform:translateX(-50%);width:220px;text-align:center;font:600 13px Inter,sans-serif}.lz-prog div{height:6px;border-radius:3px;background:rgba(0,0,0,.5);margin-top:5px;overflow:hidden}.lz-prog i{display:block;height:100%;background:#c1f354}
.lz-vig{position:absolute;inset:0;box-shadow:inset 0 0 160px rgba(255,40,40,.0);transition:box-shadow .15s}
.lz-scope{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 0,transparent 33vmin,rgba(0,0,0,.96) 33.3vmin)}.lz-scope::before,.lz-scope::after{content:"";position:absolute;left:50%;top:50%;background:#000}.lz-scope::before{width:66vmin;height:1px;margin-left:-33vmin}.lz-scope::after{height:66vmin;width:1px;margin-top:-33vmin}
.lz-dirs{position:absolute;left:50%;top:50%}.lz-dirs i{position:absolute;width:60px;height:8px;margin:-4px -30px;border-radius:4px;background:rgba(255,60,60,.8)}
.lz-big{position:absolute;inset:0;background:rgba(5,7,10,.85);display:grid;place-items:center;pointer-events:auto}.lz-big canvas{width:min(84vh,92vw);height:min(84vh,92vw);border-radius:14px}
.lz-res{position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(193,243,84,.18),rgba(5,7,10,.92) 60%);display:grid;place-items:center;pointer-events:auto;text-align:center}
.lz-res h1{margin:0;font:800 clamp(44px,9vw,96px) "Space Grotesk",sans-serif;letter-spacing:-.03em}.lz-res .sub{font:600 16px Inter,sans-serif;color:#c9cdd6;margin-top:4px}
.lz-res .st{display:flex;gap:28px;justify-content:center;margin:26px 0}.lz-res .st b{display:block;font:700 30px "Space Grotesk",sans-serif}.lz-res .st span{font-size:12px;color:#9aa0ab;text-transform:uppercase;letter-spacing:.08em}
.lz-btn{pointer-events:auto;cursor:pointer;border:0;border-radius:12px;padding:12px 22px;font:700 15px Inter,sans-serif;background:#c1f354;color:#0b0d10}.lz-btn.ghost{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.14)}.lz-btn.pro{background:#ad8dff;color:#140a2b}
.lz-touch{position:absolute;inset:0}.lz-joy{position:absolute;left:22px;bottom:120px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.25);pointer-events:auto;touch-action:none}.lz-joy i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px;border-radius:50%;background:rgba(255,255,255,.6)}
.lz-look{position:absolute;right:0;top:0;width:55%;height:100%;pointer-events:auto;touch-action:none}
.lz-tb{position:absolute;right:16px;bottom:140px;display:grid;grid-template-columns:repeat(3,58px);gap:8px;pointer-events:auto}.lz-tb button{width:58px;height:58px;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:rgba(0,0,0,.45);color:#fff;font:700 11px Inter,sans-serif;touch-action:none}.lz-tb .fire{grid-column:3;grid-row:1/3;height:124px;border-radius:30px;background:rgba(255,77,94,.4)}
@media (max-width:760px){.lz-mini{width:120px;height:120px}.lz-feed{top:140px}.lz-slots{bottom:auto;top:270px}.lz-slot{min-width:150px;padding:5px 8px}.lz-bl{bottom:260px}}
/* lobby */
.lzl{position:absolute;inset:0;pointer-events:auto;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto 1fr auto;padding:18px max(18px,env(safe-area-inset-right,0px)) 18px max(18px,env(safe-area-inset-left,0px));gap:12px;background:linear-gradient(90deg,rgba(5,7,10,.78),transparent 40%,transparent 60%,rgba(5,7,10,.7))}
.lzl-top{grid-column:1/-1;padding-left:74px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.lzl-logo{font:800 28px "Space Grotesk",sans-serif;letter-spacing:-.03em;margin-right:auto}.lzl-logo span{color:#c1f354}
.lzl-cur{display:flex;gap:8px}.lzl-cur .lz-pill{cursor:pointer;pointer-events:auto}
.lzl-left{display:grid;gap:10px;align-content:start;max-width:340px}
.lzl-card{background:rgba(12,15,20,.72);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px;display:grid;gap:8px;backdrop-filter:blur(6px)}
.lzl-card h3{margin:0;font:700 15px "Space Grotesk",sans-serif;letter-spacing:.02em}
.lzl-modes{display:grid;gap:6px}.lzl-modes button{display:grid;grid-template-columns:1fr auto;gap:2px 8px;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:10px;padding:9px 12px;cursor:pointer;font:600 14px Inter,sans-serif}
.lzl-modes button small{grid-column:1/-1;color:#9aa0ab;font-weight:500;font-size:12px}.lzl-modes button[aria-pressed=true]{border-color:#c1f354;background:rgba(193,243,84,.1)}.lzl-modes .tag{font-size:11px;color:#c1f354}
.lzl-right{display:grid;gap:8px;align-content:start;justify-items:end}.lzl-right .lz-btn{width:170px}
.lzl-bottom{grid-column:1/-1;display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap}
.lzl-stats{display:flex;gap:18px;font:600 12px Inter,sans-serif;color:#aab}.lzl-stats b{display:block;font:700 22px "Space Grotesk",sans-serif;color:#fff}
.lzl-start{font:800 22px "Space Grotesk",sans-serif;padding:18px 54px;border-radius:16px;letter-spacing:.04em;box-shadow:0 10px 30px rgba(193,243,84,.25)}
.lzl-panel{position:absolute;inset:0;background:rgba(5,7,10,.82);display:grid;place-items:center;pointer-events:auto;padding:16px}
.lzl-box{width:min(860px,100%);max-height:88vh;overflow:auto;background:#0f1217;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:18px;display:grid;gap:12px}
.lzl-box h2{margin:0;font:700 22px "Space Grotesk",sans-serif}.lzl-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
.lzl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.sk{border-radius:14px;padding:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);display:grid;gap:6px}.sk .sw{height:74px;border-radius:10px;background:#222 center/cover}.sk b{font-size:14px}.sk small{font-size:12px}.sk .lz-btn{padding:8px 12px;font-size:13px}
.tp{border-radius:14px;padding:14px;background:linear-gradient(160deg,rgba(77,168,255,.12),rgba(173,141,255,.12));border:1px solid rgba(255,255,255,.12);display:grid;gap:6px;text-align:center}.tp b{font:700 22px "Space Grotesk",sans-serif}
.lzl-load{position:absolute;inset:0;background:rgba(5,7,10,.7);display:grid;place-items:center;font:700 22px "Space Grotesk",sans-serif;pointer-events:auto}
.lzl-set{display:grid;gap:10px}.lzl-set label{display:grid;gap:4px;font:600 13px Inter,sans-serif}
@media (max-width:760px){.lzl{grid-template-columns:1fr;grid-template-rows:auto auto 1fr auto}.lzl-right{justify-items:start;grid-auto-flow:column;overflow-x:auto}.lzl-right .lz-btn{width:auto}.lzl-left{max-width:none}}`;
root.appendChild(css);
const hud=document.createElement('div');hud.className='lz';root.appendChild(hud);
hud.innerHTML=`<div class="lz-vig"></div><div class="lz-scope" hidden></div>
<div class="lz-game" hidden>
 <div class="lz-top"><span class="lz-pill"><span>Còn sống</span><b class="alive">0</b></span><span class="lz-pill"><span>Hạ</span><b class="kills">0</b></span><span class="lz-pill zone"><span class="ztxt"></span></span></div>
 <div class="lz-comp"><div></div><i></i></div>
 <div class="lz-mini"><canvas width="380" height="380"></canvas></div>
 <div class="lz-feed"></div>
 <div class="lz-bl"><div class="lz-arm"></div><div class="lz-bar hp"><i></i><span class="hpn"></span></div><div class="lz-heals"></div></div>
 <div class="lz-slots"></div>
 <div class="lz-cross"><i class="h" style="left:6px"></i><i class="h" style="left:-14px"></i><i class="v" style="top:6px"></i><i class="v" style="top:-14px"></i></div><div class="lz-hit"></div><div class="lz-dirs"></div>
 <div class="lz-prompt"></div><div class="lz-center"></div><div class="lz-prog" hidden><span></span><div><i></i></div></div>
 <div class="lz-touch" hidden><div class="lz-look"></div><div class="lz-joy"><i></i></div><div class="lz-tb"><button data-t="aim">Ngắm</button><button data-t="jump">Nhảy</button><button class="fire" data-t="fire">Bắn</button><button data-t="crouch">Ngồi</button><button data-t="reload">Nạp</button><button data-t="pick">Nhặt</button><button data-t="heal">Hồi</button><button data-t="car">Xe</button><button data-t="map">Bản đồ</button></div></div>
</div>
<div class="lz-big" hidden><canvas width="900" height="900"></canvas></div>
<div class="lz-res" hidden></div>
<div class="lzl" hidden></div>
<div class="lzl-panel" hidden></div>
<div class="lzl-load" hidden>Đang tìm trận...</div>`;
const $=s=>hud.querySelector(s);
let toastT=0;function toast(t){$('.lz-center').textContent=t;toastT=1.8;}
function hitMark(kill,head){const h=$('.lz-hit');h.className='lz-hit on'+(kill?' kill':head?' head':'');clearTimeout(h._t);h._t=setTimeout(()=>h.classList.remove('on'),120);}
function hudShow(w){$('.lz-game').hidden=w!=='match';$('.lzl').hidden=w!=='lobby';$('.lz-res').hidden=w!=='result';$('.lzl-panel').hidden=true;$('.lz-big').hidden=true;$('.lz-touch').hidden=!(MOBILE&&w==='match');}
/* minimap background */
const mapBg=document.createElement('canvas');mapBg.width=mapBg.height=600;{const g=mapBg.getContext('2d'),id=g.createImageData(600,600);for(let j=0;j<600;j++)for(let i=0;i<600;i++){const x=-HM+i/600*MAP,z=-HM+j/600*MAP,h=heightAt(x,z),k=(j*600+i)*4;let r,gg,b;
    if(h<0){const d=clamp(-h/20,0,1);r=40-20*d;gg=110-50*d;b=140-40*d;}else if(h<2.4){r=214;gg=196;b=150;}else{const t=clamp(h/60,0,1);r=95+60*t;gg=135+20*t;b=70+40*t;}const n=normalAt(x,z);const sh=.75+.5*clamp(n.x*.5-n.z*.5+.5,0,1);id.data[k]=r*sh;id.data[k+1]=gg*sh;id.data[k+2]=b*sh;id.data[k+3]=255;}
  g.putImageData(id,0,0);g.fillStyle='rgba(60,50,40,.85)';for(const b of BLD){if(b.roof)continue;g.fillRect((b.x0+HM)/MAP*600,(b.z0+HM)/MAP*600,Math.max(1,(b.x1-b.x0)/MAP*600),Math.max(1,(b.z1-b.z0)/MAP*600));}}
const MX=x=>(x+HM)/MAP,mctx=$('.lz-mini canvas').getContext('2d');
function drawMini(){const c=mctx,W=380,s=2.6,px=P.car?P.car.x:P.x,pz=P.car?P.car.z:P.z;c.save();c.fillStyle='#163c4a';c.fillRect(0,0,W,W);c.translate(W/2,W/2);c.rotate(-cam.yaw+Math.PI);c.scale(s,s);c.drawImage(mapBg,-(MX(px))*600*MAP/600,-(MX(pz))*600*MAP/600,MAP,MAP);
  // map pixels are 1.5 m; draw in world metres
  c.restore();c.save();c.translate(W/2,W/2);c.rotate(-cam.yaw+Math.PI);c.scale(s,s);c.translate(-px,-pz);
  if(zone.phase>=0){c.lineWidth=2/s;c.strokeStyle='rgba(120,170,255,.95)';c.beginPath();c.arc(zone.cx,zone.cz,zone.r,0,7);c.stroke();c.strokeStyle='#fff';c.setLineDash([4/s,4/s]);c.beginPath();c.arc(zone.tcx,zone.tcz,zone.tr,0,7);c.stroke();c.setLineDash([]);}
  if(plane.on&&P.state==='plane'){c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.5/s;c.beginPath();c.moveTo(plane.x0,plane.z0);c.lineTo(plane.x1,plane.z1);c.stroke();}
  for(const v of cars)if(v.hp>0){c.fillStyle='#ffd166';c.fillRect(v.x-1.5,v.z-1.5,3,3);}
  if(marker){c.fillStyle='#ffcf3d';c.beginPath();c.arc(marker.x,marker.z,4/s*2,0,7);c.fill();}
  c.restore();c.fillStyle='#c1f354';c.strokeStyle='#000';c.lineWidth=2;c.save();c.translate(W/2,W/2);c.rotate(Math.PI-(P.state==='car'?P.car.h:P.h)+cam.yaw-Math.PI);c.beginPath();c.moveTo(0,-11);c.lineTo(8,9);c.lineTo(0,4);c.lineTo(-8,9);c.closePath();c.fill();c.stroke();c.restore();}
let marker=null;
function drawBig(){const cvs=$('.lz-big canvas'),c=cvs.getContext('2d'),W=900,s=W/MAP,tr=(x,z)=>[(x+HM)*s,(z+HM)*s];c.drawImage(mapBg,0,0,W,W);
  c.font='700 18px Inter';c.textAlign='center';for(const t of TOWNS){const[x,y]=tr(t.x,t.z);c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.8)';c.strokeText(t.n,x,y);c.fillStyle='#fff';c.fillText(t.n,x,y);}
  if(zone.phase>=0){c.lineWidth=3;c.strokeStyle='rgba(120,170,255,.95)';c.beginPath();c.arc(...tr(zone.cx,zone.cz),zone.r*s,0,7);c.stroke();c.strokeStyle='#fff';c.setLineDash([8,6]);c.beginPath();c.arc(...tr(zone.tcx,zone.tcz),zone.tr*s,0,7);c.stroke();c.setLineDash([]);}
  if(P.state==='plane'||P.state==='fall'){c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2;c.beginPath();c.moveTo(...tr(plane.x0,plane.z0));c.lineTo(...tr(plane.x1,plane.z1));c.stroke();}
  if(marker){c.fillStyle='#ffcf3d';c.beginPath();c.arc(...tr(marker.x,marker.z),9,0,7);c.fill();}
  const[px,py]=tr(P.car?P.car.x:P.x,P.car?P.car.z:P.z);c.fillStyle='#c1f354';c.strokeStyle='#000';c.lineWidth=3;c.beginPath();c.arc(px,py,8,0,7);c.fill();c.stroke();
  c.fillStyle='#fff';c.font='600 15px Inter';c.textAlign='left';c.fillText('Bấm vào bản đồ để đánh dấu · M để đóng',16,W-18);}
function toggleBigMap(){const b=$('.lz-big');b.hidden=!b.hidden;if(!b.hidden){drawBig();if(locked)document.exitPointerLock();}}
$('.lz-big canvas').addEventListener('click',e=>{const r=e.target.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*MAP-HM,z=(e.clientY-r.top)/r.height*MAP-HM;marker=marker&&hyp(marker.x-x,marker.z-z)<15?null:{x,z};drawBig();});
const COMP_VI=['B','ĐB','Đ','ĐN','N','TN','T','TB'],COMP_EN=['N','NE','E','SE','S','SW','W','NW'];
function hudUpdate(dt){if(phase!=='match')return;
  if(toastT>0){toastT-=dt;if(toastT<=0)$('.lz-center').textContent='';}
  $('.alive').textContent=aliveCount;$('.kills').textContent=P.kills;
  const zt=zone.phase<0?'Bo sắp xuất hiện':zone.shrinking?`Bo đang thu hẹp · ${Math.ceil(ZPH[Math.min(zone.phase,ZPH.length-1)].s*mode.zone-zone.t)}s`:`Bo thu hẹp sau ${Math.ceil(ZPH[Math.min(zone.phase,ZPH.length-1)].w*mode.zone-zone.t)}s`;$('.ztxt').textContent=zt+(zone.phase>=0&&!inZone(P.x,P.z)?' · Bạn ở ngoài bo!':'');
  // compass
  const deg=((-cam.yaw*180/Math.PI)%360+360)%360;let s='';for(let k=-2;k<=2;k++){for(let i=0;i<8;i++){const d=i*45+k*360;s+=`<span style="position:absolute;left:${(d-deg)*2.2+200}px;transform:translateX(-50%)">${(window.NexusI18n&&NexusI18n.lang==='en'?COMP_EN:COMP_VI)[i]}</span>`;}}$('.lz-comp div').innerHTML=s;$('.lz-comp div').style.width='420px';
  // health & armor
  const hpb=$('.lz-bar.hp');hpb.querySelector('i').style.transform=`scaleX(${Math.max(0,P.hp)/100})`;hpb.classList.toggle('low',P.hp<30);$('.hpn').textContent=Math.max(0,Math.ceil(P.hp));
  $('.lz-arm').innerHTML=`<span class="${P.vest?'on':''}">Giáp ${P.vest?'C'+P.vest+' · '+Math.ceil(P.vestHp):'–'}</span><span class="${P.helm?'on':''}">Mũ ${P.helm?'C'+P.helm+' · '+Math.ceil(P.helmHp):'–'}</span>`;
  $('.lz-heals').innerHTML=`<span>Băng gạc ${P.heals.bandage}</span><span>Cứu thương ${P.heals.medkit}</span><span>H để hồi máu</span>`;
  $('.lz-slots').innerHTML=P.slots.map((s,i)=>s?`<div class="lz-slot${P.cur===i?' on':''}"><span class="k">${i+1}</span><span>${WEAP[s.w].n}<br><small>${AMMO_N[WEAP[s.w].ammo]} · còn ${P.ammo[WEAP[s.w].ammo]}</small></span><b class="num">${s.mag}</b></div>`:'').join('')||'<div class="lz-slot"><span class="k">–</span><span>Tay không<br><small>Tìm súng trong nhà, kho, container</small></span><b></b></div>';
  // prompts
  let pr='';if(P.state==='plane')pr='<kbd>Space</kbd>Nhảy khỏi máy bay';else if(P.state==='fall')pr='<kbd>Space</kbd>Bung dù sớm · W để lao nhanh';else if(P.car)pr='<kbd>F</kbd>Xuống xe · W/S lái · Space phanh';
  else if(nearItem){const d=ITEM_DEF[nearItem.t];pr=`<kbd>E</kbd>Nhặt ${d.n}`;}else if(nearCar)pr='<kbd>F</kbd>Lên xe';else if(!locked&&!MOBILE)pr='Click vào màn hình để điều khiển bằng chuột';
  if($('.lz-prompt').innerHTML!==pr)$('.lz-prompt').innerHTML=pr;
  const busy=P.reloadT>0?['Đang nạp đạn',1-P.reloadT/WEAP[P.slots[P.cur].w].reload]:P.healT>0?[P.healK==='medkit'?'Đang dùng hộp cứu thương':'Đang băng bó',1-P.healT/(P.healK==='medkit'?6:3)]:null;
  $('.lz-prog').hidden=!busy;if(busy){$('.lz-prog span').textContent=busy[0];$('.lz-prog i').style.width=Math.round(busy[1]*100)+'%';}
  $('.lz-feed').innerHTML=feed.filter(f=>(f.ttl-=dt)>0).map(f=>`<span style="${f.col?'color:'+f.col:''}">${f.t.replace(/[<>&]/g,'')}</span>`).join('');
  const sn=cam.aim&&P.cur>=0&&P.slots[P.cur]&&P.slots[P.cur].w==='sniper'&&P.state==='ground';$('.lz-scope').hidden=!sn;$('.lz-cross').style.display=sn||P.state!=='ground'?'none':'';
  const sp=P.cur>=0&&P.slots[P.cur]?(WEAP[P.slots[P.cur].w].spread*(cam.aim?.45:1)*(P.moving>.5?1.6:1)+P.recoil*.012)*600:6;hud.querySelectorAll('.lz-cross .h')[0].style.left=(4+sp)+'px';hud.querySelectorAll('.lz-cross .h')[1].style.left=(-12-sp)+'px';hud.querySelectorAll('.lz-cross .v')[0].style.top=(4+sp)+'px';hud.querySelectorAll('.lz-cross .v')[1].style.top=(-12-sp)+'px';
  $('.lz-vig').style.boxShadow=`inset 0 0 160px rgba(255,40,40,${P.hitT>0?.55:P.hp<30?.25+Math.sin(time*6)*.1:0})`;
  for(const d of hitDirs)d.t-=dt;while(hitDirs.length&&hitDirs[0].t<=0)hitDirs.shift();$('.lz-dirs').innerHTML=hitDirs.map(d=>{const a=d.a-cam.yaw;return`<i style="transform:rotate(${-a*180/Math.PI+180}deg) translateY(-110px);opacity:${d.t}"></i>`;}).join('');
  if(!$('.lz-big').hidden&&Math.random()<.1)drawBig();}
/* ---------- results ---------- */
function showResult(r){const box=$('.lz-res');hudShow('result');if(locked)document.exitPointerLock();const m=Math.floor(r.time/60),s=Math.floor(r.time%60);
  box.innerHTML=`<div><h1 style="color:${r.win?'#c1f354':'#fff'}">${r.win?'TOP 1':'#'+r.place}</h1><div class="sub">${r.win?'Chiến thắng! Bạn là người cuối cùng còn trụ lại.':`Bạn bị loại ở hạng ${r.place}/${r.total}`}</div>
  <div class="st"><span><b>${r.kills}</b>Hạ gục</span><span><b>${r.dmg}</b>Sát thương</span><span><b>${m}:${String(s).padStart(2,'0')}</b>Sống sót</span><span><b style="color:#7fd8ff">+${r.reward}</b>Kim cương</span></div>
  <div style="display:flex;gap:10px;justify-content:center"><button class="lz-btn" data-a="again">Chơi tiếp</button><button class="lz-btn ghost" data-a="lobby">Về sảnh</button></div></div>`;}
$('.lz-res').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;if(b.dataset.a==='again')beginMatch();else toLobby();});
/* ---------- lobby: 3D showroom + menus ---------- */
const lobby={scene:new T.Scene(),cam:new T.PerspectiveCamera(40,1,.1,100),H:null,t:0,gunW:'ar'};
{const L=lobby.scene;L.background=new T.Color(lin('#07090d'));L.fog=new T.Fog(lin('#07090d'),8,22);L.environment=ENV;
  const floor=new T.Mesh(new T.CircleGeometry(9,64).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:lin('#14181f'),roughness:.35,metalness:ENV_OK?.5:.1}));floor.receiveShadow=true;L.add(floor);
  const ring=new T.Mesh(new T.RingGeometry(1.35,1.45,64).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:lin('#c1f354'),toneMapped:false}));ring.position.y=.02;L.add(ring);
  const ring2=new T.Mesh(new T.RingGeometry(2.4,2.43,64).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:lin('#ad8dff'),toneMapped:false,transparent:true,opacity:.6}));ring2.position.y=.02;L.add(ring2);lobby.ring2=ring2;
  const ped=new T.Mesh(new T.CylinderGeometry(1.4,1.5,.18,48),new T.MeshStandardMaterial({color:lin('#1d232c'),roughness:.4,metalness:ENV_OK?.6:.2}));ped.position.y=.09;ped.receiveShadow=true;L.add(ped);
  L.add(new T.HemisphereLight(lin('#9fb6d6'),lin('#20160f'),.55));const key=new T.SpotLight(lin('#ffffff'),3,20,.5,.5,1);key.position.set(3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);L.add(key,key.target);key.target.position.set(0,1,0);
  const rimA=new T.PointLight(lin('#c1f354'),4,8);rimA.position.set(-2.5,2.2,-1.5);const rimB=new T.PointLight(lin('#ad8dff'),5,8);rimB.position.set(2.5,1.8,-2);L.add(rimA,rimB);
  const pp=[];for(let i=0;i<260;i++)pp.push(rnd(-8,8),rnd(0,6),rnd(-8,4));const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(pp,3));lobby.dust=new T.Points(pg,new T.PointsMaterial({color:lin('#c9d6ff'),size:.035,transparent:true,opacity:.6}));L.add(lobby.dust);
  for(let i=0;i<7;i++){const b=new T.Mesh(new T.BoxGeometry(.06,rnd(2,5),.06),new T.MeshBasicMaterial({color:lin(i%2?'#c1f354':'#ad8dff'),toneMapped:false}));b.position.set(rnd(-7,7),rnd(1,3),rnd(-7,-4));L.add(b);}}
function lobbyHero(){if(!lobby.H){lobby.H=makeHuman({skin:'#d6a17a',hair:'#15110e',top:'#2f6f8f',pants:'#2b3440',vest:'#1d2b36'});lobby.H.vestM.visible=true;lobby.H.helmM.visible=false;}lobby.scene.add(lobby.H.root);lobby.H.root.position.set(0,.18,0);equipGun(lobby.H,lobby.gunW);}
const fmtD=n=>Math.round(n).toLocaleString('vi-VN');
function renderLobby(){const box=$('.lzl'),lv=1+Math.floor(save.xp/500),md=save.mode;
  box.innerHTML=`<div class="lzl-top"><div class="lzl-logo">LAST<span> ZONE</span></div><div class="lzl-cur"><span class="lz-pill" data-a="topup" title="Nạp kim cương"><span style="color:#7fd8ff">◆</span><b>${fmtD(save.diamonds)}</b><span style="color:#c1f354">+</span></span><span class="lz-pill">Cấp <b>${lv}</b></span></div></div>
  <div class="lzl-left"><div class="lzl-card"><h3>Chế độ</h3><div class="lzl-modes">${Object.keys(MODES).map(k=>`<button type="button" data-mode="${k}" aria-pressed="${k===md}"><span>${MODES[k].n}</span><span class="tag">${MODES[k].bots+1} người</span><small>${MODES[k].d}</small></button>`).join('')}</div></div>
   <div class="lzl-card"><h3>Đảo Ngọc Lam</h3><span style="font-size:13px;color:#aab">7 khu vực, rừng, đồi, bãi biển và bo thu hẹp 7 lần. Nhảy dù, nhặt đồ, sống sót tới cuối.</span></div></div>
  <div class="lzl-right"><button class="lz-btn ghost" data-a="locker">Kho súng</button><button class="lz-btn pro" data-a="shop">Cửa hàng skin</button><button class="lz-btn ghost" data-a="topup">Nạp kim cương</button><button class="lz-btn ghost" data-a="settings">Cài đặt</button><button class="lz-btn ghost" data-a="help">Cách chơi</button></div>
  <div class="lzl-bottom"><div class="lzl-stats"><span><b>${save.stats.matches}</b>Trận</span><span><b>${save.stats.wins}</b>Top 1</span><span><b>${save.stats.top10}</b>Top 10</span><span><b>${save.stats.kills}</b>Hạ gục</span></div><button class="lz-btn lzl-start" data-a="start">BẮT ĐẦU</button></div>`;}
function panel(html){const p=$('.lzl-panel');p.innerHTML=`<div class="lzl-box">${html}</div>`;p.hidden=false;}
function skinSwatch(sk){const m=skinMats[sk.id]||(skinMats[sk.id]=new T.MeshStandardMaterial(Object.assign({roughness:.5,metalness:.3},sk.mk())));if(m.map&&m.map.image&&m.map.image.toDataURL)return`background-image:url(${m.map.image.toDataURL()})`;return`background:#${m.color.clone().convertLinearToSRGB().getHexString()}`;}
function openShop(owned){const list=SKINS.filter(s=>owned?save.owned.includes(s.id):true);const rarOrder=['myth','legend','epic','rare'];
  const byW={};for(const s of list)(byW[s.w]=byW[s.w]||[]).push(s);
  panel(`<div class="lzl-head"><h2>${owned?'Kho súng':'Cửa hàng skin'}</h2><span class="lz-pill" data-a="topup" style="cursor:pointer"><span style="color:#7fd8ff">◆</span><b>${fmtD(save.diamonds)}</b></span><button class="lz-btn ghost" data-a="close">Đóng</button></div>
  ${owned&&!list.length?'<p style="color:#aab">Bạn chưa có skin nào. Mua ở Cửa hàng skin, hoặc dùng súng mặc định.</p>':''}
  ${Object.keys(WEAP).filter(w=>byW[w]||owned).map(w=>`<h3 style="margin:6px 0 0;font:700 16px 'Space Grotesk',sans-serif">${WEAP[w].n}</h3><div class="lzl-grid">
    ${owned?`<div class="sk"><div class="sw" style="background:${WEAP[w].col}"></div><b>Mặc định</b><button class="lz-btn ${!save.equipped[w]?'ghost':''}" data-eq="${w}|">${!save.equipped[w]?'Đang dùng':'Dùng'}</button></div>`:''}
    ${(byW[w]||[]).sort((a,b)=>rarOrder.indexOf(a.r)-rarOrder.indexOf(b.r)).map(s=>{const own=save.owned.includes(s.id),eq=save.equipped[w]===s.id;return`<div class="sk" style="border-color:${RAR[s.r].c}55"><div class="sw" style="${skinSwatch(s)}"></div><b>${s.n}</b><small style="color:${RAR[s.r].c}">${RAR[s.r].n}</small>
      ${own?`<button class="lz-btn ${eq?'ghost':''}" data-eq="${w}|${s.id}">${eq?'Đang dùng':'Dùng'}</button>`:`<button class="lz-btn pro" data-buy="${s.id}">◆ ${fmtD(s.p)}</button>`}</div>`;}).join('')}</div>`).join('')}`);}
const TOPUP=[{d:100,p:'20.000đ'},{d:310,p:'60.000đ'},{d:520,p:'100.000đ'},{d:1060,p:'200.000đ'},{d:2180,p:'400.000đ'},{d:5600,p:'1.000.000đ',b:'Tặng thêm 10%'}];
function openTopup(){panel(`<div class="lzl-head"><h2>Nạp kim cương</h2><button class="lz-btn ghost" data-a="close">Đóng</button></div><p style="margin:0;color:#aab;font-size:13px">Kim cương dùng để mua skin súng. Bạn cũng nhận kim cương miễn phí khi chơi: Top 1 được 100, mỗi lần hạ gục được 5.</p>
  <div class="lzl-grid">${TOPUP.map(t=>`<div class="tp"><span style="color:#7fd8ff;font-size:26px">◆</span><b>${fmtD(t.d)}</b>${t.b?`<small style="color:#c1f354">${t.b}</small>`:''}<button class="lz-btn" data-pay="${t.d}">${t.p}</button></div>`).join('')}</div>`);}
function openSettings(){panel(`<div class="lzl-head"><h2>Cài đặt</h2><button class="lz-btn ghost" data-a="close">Đóng</button></div><div class="lzl-set">
  <label>Tên trong trận<input class="input" id="lzName" maxlength="16" value="${(save.name||'').replace(/"/g,'')}" style="background:#1a1f27;border:1px solid #2a313b;color:#fff;border-radius:8px;padding:8px"></label>
  <label>Độ nhạy chuột: <span id="lzSensV">${save.sens.toFixed(1)}</span><input type="range" id="lzSens" min="0.3" max="2.5" step="0.1" value="${save.sens}"></label>
  <label>Đồ hoạ<select id="lzQ" style="background:#1a1f27;border:1px solid #2a313b;color:#fff;border-radius:8px;padding:8px"><option value="low">Thấp (máy yếu, điện thoại)</option><option value="mid">Vừa</option><option value="high">Cao (bóng đổ, cỏ dày)</option></select></label>
  <small style="color:#aab">Đổi mức đồ hoạ cần mở lại game để áp dụng hết.</small><button class="lz-btn" data-a="saveset">Lưu</button></div>`);$('#lzQ').value=save.quality;$('#lzSens').oninput=e=>$('#lzSensV').textContent=(+e.target.value).toFixed(1);}
function openHelp(){panel(`<div class="lzl-head"><h2>Cách chơi</h2><button class="lz-btn ghost" data-a="close">Đóng</button></div><div style="display:grid;gap:6px;font-size:14px;line-height:1.5;color:#d5d9e0">
  <b>Mục tiêu:</b><span>Nhảy khỏi máy bay, nhặt súng và giáp, ở trong bo và là người cuối cùng còn trụ lại.</span>
  <b>Điều khiển:</b><span>WASD di chuyển · Chuột nhìn · Click trái bắn · Click phải ngắm · Shift chạy · Space nhảy, bung dù · C ngồi · R nạp đạn · E nhặt đồ · F lên xe, xuống xe · H hồi máu · 1 2 3 đổi súng · M bản đồ</span>
  <b>Mẹo:</b><span>Bo xanh co lại theo thời gian, ở ngoài sẽ mất máu. Nhà, nhà kho và container có nhiều đồ. Áo giáp và mũ giảm sát thương tới khi hỏng.</span></div>`);}
$('.lzl').addEventListener('click',e=>{const m=e.target.closest('[data-mode]');if(m){save.mode=m.dataset.mode;writeSave();renderLobby();return;}const a=e.target.closest('[data-a]');if(!a)return;sfxInit();const k=a.dataset.a;
  if(k==='start')beginMatch();else if(k==='shop')openShop(false);else if(k==='locker')openShop(true);else if(k==='topup')openTopup();else if(k==='settings')openSettings();else if(k==='help')openHelp();});
$('.lzl-panel').addEventListener('click',e=>{const t=e.target;if(t.classList.contains('lzl-panel')||t.closest('[data-a="close"]')){$('.lzl-panel').hidden=true;renderLobby();return;}
  if(t.closest('[data-a="topup"]')){openTopup();return;}
  const pay=t.closest('[data-pay]');if(pay){const msg=opt.onPay?opt.onPay(+pay.dataset.pay):null;if(msg!==false)toastLobby('Cổng thanh toán chưa được kết nối. Chơi để nhận kim cương miễn phí.');return;}
  const buy=t.closest('[data-buy]');if(buy){const s=SKINS.find(x=>x.id===buy.dataset.buy);if(!s)return;if(save.diamonds<s.p){toastLobby('Không đủ kim cương');openTopup();return;}save.diamonds-=s.p;save.owned.push(s.id);save.equipped[s.w]=s.id;writeSave();lobby.gunW=s.w;equipGun(lobby.H,s.w);openShop(false);toastLobby('Đã mua skin '+s.n);sfx('pick');return;}
  const eq=t.closest('[data-eq]');if(eq){const[w,id]=eq.dataset.eq.split('|');if(id)save.equipped[w]=id;else delete save.equipped[w];writeSave();lobby.gunW=w;equipGun(lobby.H,w);openShop(true);return;}
  if(t.closest('[data-a="saveset"]')){save.name=($('#lzName').value||'').trim().slice(0,16);save.sens=+$('#lzSens').value;const q=$('#lzQ').value;const changed=q!==save.quality;save.quality=q;writeSave();$('.lzl-panel').hidden=true;renderLobby();if(changed)toastLobby('Đã lưu. Thoát và mở lại game để đổi đồ hoạ.');}});
function toastLobby(t){let el=$('.lzl-toast');if(!el){el=document.createElement('div');el.className='lzl-toast';el.style.cssText='position:absolute;left:50%;bottom:110px;transform:translateX(-50%);background:rgba(10,12,16,.9);border:1px solid rgba(255,255,255,.15);padding:10px 16px;border-radius:10px;font:600 14px Inter,sans-serif;pointer-events:none;z-index:5';hud.appendChild(el);}el.textContent=t;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,2600);}
function toLobby(){phase='lobby';ended=false;if(locked)document.exitPointerLock();clearBots();for(const it of items.slice())removeItem(it);zoneWall.visible=false;plane.g.visible=false;if(P.H)P.H.root.visible=false;lobbyHero();renderLobby();hudShow('lobby');}
function beginMatch(){$('.lzl-load').hidden=false;$('.lzl-load').textContent='Đang tìm trận...';hudShow('none');setTimeout(()=>{$('.lzl-load').textContent='Đã tìm thấy '+(MODES[save.mode]||MODES.normal).bots+' đối thủ';},500);
  setTimeout(()=>{$('.lzl-load').hidden=true;ended=false;startMatch();if(!MOBILE)try{cv.requestPointerLock();}catch(_){}},1200);}
/* touch controls */
if(MOBILE){const jEl=$('.lz-joy'),kn=$('.lz-joy i');const mv=e=>{const r=jEl.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const m=hyp(dx,dy),R=50;if(m>R){dx*=R/m;dy*=R/m;}joy.x=dx/R;joy.y=-dy/R;kn.style.transform=`translate(${dx}px,${dy}px)`;};
  jEl.addEventListener('pointerdown',e=>{joy.id=e.pointerId;jEl.setPointerCapture(e.pointerId);mv(e);});jEl.addEventListener('pointermove',e=>{if(joy.id===e.pointerId)mv(e);});const je=()=>{joy.id=null;joy.x=joy.y=0;kn.style.transform='';};jEl.addEventListener('pointerup',je);jEl.addEventListener('pointercancel',je);
  const lk=$('.lz-look');lk.addEventListener('pointerdown',e=>{look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;lk.setPointerCapture(e.pointerId);});lk.addEventListener('pointermove',e=>{if(look.id!==e.pointerId)return;const s=.005*save.sens*(cam.aim?.5:1);cam.yaw-=(e.clientX-look.x)*s;cam.pitch=clamp(cam.pitch+(e.clientY-look.y)*s,-1.2,1.35);look.x=e.clientX;look.y=e.clientY;});lk.addEventListener('pointerup',()=>look.id=null);
  hud.querySelectorAll('.lz-tb button').forEach(b=>{const t=b.dataset.t;b.addEventListener('pointerdown',e=>{e.preventDefault();sfxInit();if(t==='fire')tb.fire=true;if(t==='aim')cam.aim=!cam.aim;if(t==='jump'){if(P.state==='plane')jump();else if(P.state==='fall')openChute();else keys.add(' ');}if(t==='crouch')P.crouch=!P.crouch;if(t==='reload')startReload();if(t==='pick')tryPick();if(t==='heal')useHeal();if(t==='car'){if(P.car)exitCar();else if(nearCar)enterCar(nearCar);}if(t==='map')toggleBigMap();});
    const up=()=>{if(t==='fire')tb.fire=false;if(t==='jump')keys.delete(' ');};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);});}
/* ---------- main loop ---------- */
let raf=0,last=0,perfT=0,perfN=0,lowered=false;
function step(dt){time+=dt;matchT+=dt;
  if(plane.on){plane.t+=dt;const k=plane.t/plane.dur;plane.g.position.set(lerp(plane.x0,plane.x1,k),plane.y,lerp(plane.z0,plane.z1,k));plane.g.rotation.y=Math.atan2(plane.x1-plane.x0,plane.z1-plane.z0);if(k>1.15){plane.on=false;plane.g.visible=false;}}
  playerUpdate(dt);for(const b of bots)botUpdate(b,dt);zoneUpdate(dt);if(phase==='match'&&P.state!=='dead'&&aliveCount<=1)checkWin();
  for(const c of cars)if(c!==P.car){if(Math.abs(c.spd)>.1)carUpdate(c,dt,0,0,true);}
  // items: show only nearby ones, spin them
  if(Math.floor(time*4)!==Math.floor((time-dt)*4)){for(const it of items){const d=hyp(it.x-P.x,it.z-P.z);it.g.visible=d<70;}}for(const it of items)if(it.g.visible)it.g.children[0].rotation.y+=dt*.8;
  grassUpdate(P.x,P.z);grassU.uTime.value=time;skyMat.uniforms.ct.value=time;zoneMat.uniforms.t.value=time;fxUpdate(dt);audioUpdate();}
function audioUpdate(){if(!AC)return;loopsInit();const t=AC.currentTime,on=running&&phase==='match';LP.wind.g.gain.setTargetAtTime(on&&(P.state==='fall')?.35:on&&P.state==='para'?.12:0,t,.2);
  const pd=plane.on?hyp(plane.g.position.x-camera.position.x,plane.g.position.z-camera.position.z):1e9;LP.plane.g.gain.setTargetAtTime(on&&plane.on?clamp(1-pd/600,0,1)*.4:0,t,.3);LP.amb.g.gain.setTargetAtTime(on&&P.state==='ground'?.03:0,t,.5);
  const c=P.car;LP.eo.frequency.setTargetAtTime(c?45+Math.abs(c.spd)*4:40,t,.1);LP.eg.gain.setTargetAtTime(on&&c?.07:0,t,.1);}
function frame(now){raf=requestAnimationFrame(frame);const raw=(now-last)/1000||0;const dt=Math.min(.05,raw);last=now;
  if(running){if(phase==='match'||phase==='result'){if(phase==='match')step(dt);else{for(const b of bots)if(b.dead)animHuman(b.H,dt,{dead:true});fxUpdate(dt);}camUpdate(dt);hudUpdate(dt);if(Math.random()<.25&&phase==='match')drawMini();renderer.render(scene,camera);}
    else{lobby.t+=dt;const L=lobby;if(L.H){L.H.root.rotation.y=Math.sin(L.t*.35)*.5+.3;animHuman(L.H,dt,{spd:0,aim:true,pitch:-.05});}L.ring2.rotation.z+=dt*.2;L.dust.rotation.y+=dt*.02;
      const a=L.t*.08;L.cam.position.set(Math.sin(a)*.6+.8,1.55,4.6);L.cam.lookAt(.2,1.15,0);renderer.render(L.scene,L.cam);}
    if(raw>0&&raw<.5&&!lowered){perfT+=raw;perfN++;if(perfN>=180){const avg=perfT/perfN;perfT=0;perfN=0;if(avg>.034&&save.quality!=='low'){lowered=true;renderer.setPixelRatio(1);if(grass){grass.visible=false;}if(avg>.045&&renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);});}resize();}}}}}
function resize(){const w=view.clientWidth||innerWidth,h=view.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lobby.cam.aspect=w/h;lobby.cam.updateProjectionMatrix();}
addEventListener('resize',()=>{if(!view.closest('[hidden]'))resize();});
lobbyHero();renderLobby();hudShow('lobby');
const api={start(){running=true;active=true;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);resize();},
  stop(){running=false;active=false;keys.clear();mouseL=false;cancelAnimationFrame(raf);if(locked)document.exitPointerLock();if(phase==='match'&&!ended){/* leaving mid-match counts as a loss without reward */phase='lobby';toLobby();}writeSave();},
  setPaused(p){running=!p;active=!p;keys.clear();mouseL=false;if(p&&locked)document.exitPointerLock();if(!p){last=performance.now();}},
  resize,get save(){return save;},
  _dbg:{P,bots,items,cars,zone,plane,cam,keys,step,startMatch,beginMatch,toLobby,jump,openChute,playerFire,playerPick,heightAt,info:()=>renderer.info.render,render:()=>renderer.render(phase==='lobby'?lobby.scene:scene,phase==='lobby'?lobby.cam:camera),camUpdate,scene,camera,get phase(){return phase;},get alive(){return aliveCount;},MODES,SKINS,save,TOWNS,lootPts,openShop,openTopup,renderer}};
return api;}
window.LastZone={create};
})();
