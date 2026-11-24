/* roofs block bullets and the camera, but you can walk under them */
for(const b of BLD)if(b.roof)addCol({t:'b',x0:b.x0,x1:b.x1,z0:b.z0,z1:b.z1,y0:b.y0,y1:b.y1});
/* ---------- match state ---------- */
const MODES={easy:{n:'Dễ',bots:19,acc:.12,react:1,view:90,zone:1.25,d:'19 bot, bắn chậm, bo co từ từ'},normal:{n:'Thường',bots:29,acc:.2,react:.7,view:130,zone:1,d:'29 bot, cân bằng'},hard:{n:'Khó',bots:39,acc:.3,react:.45,view:170,zone:.85,d:'39 bot, ngắm tốt hơn, bo nhanh'},nightmare:{n:'Ác mộng',bots:49,acc:.42,react:.28,view:220,zone:.7,armed:true,d:'49 bot có súng ngay khi đáp, bo rất nhanh'}};
const BOT_NAMES=['SóiĐêm','MèoMập','RồngXanh','TiaChớp','BăngGiá','ĐạiBàng','HổLốn','CáMập','GióLốc','ThỏNgọc','Bão','KhỉCon','SấmSét','NinjaVàng','Gấu','RắnHổ','PhượngHoàng','LửaĐỏ','BóngMa','ChimSẻ','CọpTrắng','Sói','TômHùm','MèoĐen','KiếnLửa','BọCạp','Ưng','CuồngPhong','ĐáTảng','NgựaÔ'];
let running=false,phase='lobby',time=0,mode=MODES[save.mode]||MODES.normal,matchT=0;
const P={x:0,y:300,z:0,vy:0,vx:0,vz:0,h:0,hp:100,vest:0,vestHp:0,helm:0,helmHp:0,slots:[null,null,null],cur:-1,ammo:{light:0,medium:0,heavy:0,shell:0},heals:{bandage:0,medkit:0},state:'plane',crouch:false,car:null,fireCD:0,reloadT:0,healT:0,healK:null,kills:0,dmg:0,H:null,recoil:0,moving:0,stepT:0,rank:0,deadT:0,place:0,hitT:0};
const cam={yaw:0,pitch:.15,aim:false,dist:3.7,shake:0,fov:70};
const bots=[];const feed=[];let aliveCount=0;
const plane={a:0,x0:0,z0:0,x1:0,z1:0,t:0,dur:30,y:260,g:null,on:false};
const zone={cx:0,cz:0,r:ISLE+60,tcx:0,tcz:0,tr:ISLE+60,phase:-1,t:0,shrinking:false,startR:0,startCx:0,startCz:0,dps:0};
const ZPH=[{w:70,s:45,r:240,d:1},{w:55,s:40,r:150,d:2},{w:45,s:35,r:92,d:4},{w:40,s:30,r:52,d:6},{w:35,s:25,r:26,d:9},{w:30,s:20,r:10,d:12},{w:25,s:20,r:0,d:16}];
/* plane model */
{const g=buildVC([{geo:new T.CylinderGeometry(2.2,1.6,26,14).rotateX(Math.PI/2),color:'#d9dde2'},{geo:new T.ConeGeometry(2.2,5,14).rotateX(Math.PI/2),pos:[0,0,15.5],color:'#c9cfd6'},{geo:new T.BoxGeometry(34,.5,5),pos:[0,-.4,1],color:'#b9c0c8'},{geo:new T.BoxGeometry(11,.4,3),pos:[0,1,-11],color:'#b9c0c8'},{geo:new T.BoxGeometry(.4,5,3.5),pos:[0,3,-11.5],color:'#c1f354'},
  {geo:new T.CylinderGeometry(1,1,3.4,12).rotateX(Math.PI/2),pos:[-8,-1.4,2],color:'#5a6068'},{geo:new T.CylinderGeometry(1,1,3.4,12).rotateX(Math.PI/2),pos:[8,-1.4,2],color:'#5a6068'},{geo:new T.BoxGeometry(4.6,.6,.2),pos:[0,.6,13],color:'#1b2a3a'}]);
  plane.g=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:ENV_OK?.5:.1}));plane.g.castShadow=false;plane.g.visible=false;scene.add(plane.g);}
const zoneMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{t:{value:0}},
  vertexShader:'varying vec2 vU;varying float vY;void main(){vU=uv;vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float t;varying vec2 vU;varying float vY;void main(){float l=.5+.5*sin(vU.x*600.+t*2.)*sin(vY*.6-t*3.);float a=(.18+.12*l)*(1.-smoothstep(120.,260.,vY));gl_FragColor=vec4(.35,.55,1.,a);}'});
const zoneWall=new T.Mesh(new T.CylinderGeometry(1,1,300,96,1,true),zoneMat);zoneWall.geometry.translate(0,140,0);zoneWall.visible=false;zoneWall.renderOrder=3;scene.add(zoneWall);
function inZone(x,z,r){return hyp(x-zone.cx,z-zone.cz)<(r===undefined?zone.r:r);}
function pickInCircle(cx,cz,r){for(let k=0;k<60;k++){const a=rnd(0,6.28),d=Math.sqrt(Math.random())*r,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;if(heightAt(x,z)>1.5)return[x,z];}return[cx,cz];}
function zoneUpdate(dt){if(zone.phase<0){zone.t+=dt;if(zone.t>8){zone.phase=0;zone.t=0;nextZone();}return;}
  const ph=ZPH[Math.min(zone.phase,ZPH.length-1)];zone.t+=dt;const W=ph.w*mode.zone,S=ph.s*mode.zone;
  if(!zone.shrinking){if(zone.t>=W){zone.shrinking=true;zone.t=0;zone.startR=zone.r;zone.startCx=zone.cx;zone.startCz=zone.cz;feedMsg('Bo đang thu hẹp!');sfx('zone');}}
  else{const k=Math.min(1,zone.t/S);zone.r=lerp(zone.startR,zone.tr,k);zone.cx=lerp(zone.startCx,zone.tcx,k);zone.cz=lerp(zone.startCz,zone.tcz,k);zone.dps=ph.d;if(k>=1){zone.shrinking=false;zone.t=0;zone.phase++;if(zone.phase<ZPH.length)nextZone();}}
  zoneWall.visible=true;zoneWall.position.set(zone.cx,-20,zone.cz);zoneWall.scale.set(Math.max(.1,zone.r),1,Math.max(.1,zone.r));}
function nextZone(){const ph=ZPH[zone.phase];const[x,z]=pickInCircle(zone.cx,zone.cz,Math.max(0,zone.r-ph.r));zone.tcx=x;zone.tcz=z;zone.tr=ph.r;zone.dps=zone.phase?ZPH[zone.phase-1].d:.6;}
function feedMsg(t,col){feed.unshift({t,col,ttl:6});if(feed.length>6)feed.pop();hudDirty=true;}
/* ---------- match setup ---------- */
function resetPlayer(){hitDirs.length=0;Object.assign(P,{hp:100,vest:0,vestHp:0,helm:0,helmHp:0,slots:[null,null,null],cur:-1,ammo:{light:0,medium:0,heavy:0,shell:0},heals:{bandage:0,medkit:0},state:'plane',crouch:false,car:null,fireCD:0,reloadT:0,healT:0,healK:null,kills:0,dmg:0,recoil:0,vy:0,place:0,deadT:0});
  if(!P.H){P.H=makeHuman({skin:'#d6a17a',hair:'#15110e',top:'#2f6f8f',pants:'#2b3440',vest:'#1d2b36'});}if(P.H.root.parent!==scene)scene.add(P.H.root);P.H.root.visible=false;equipGun(P.H,null);P.H.vestM.visible=P.H.helmM.visible=false;if(P.H.chute){P.H.root.remove(P.H.chute);P.H.chute=null;}}
function clearBots(){for(const b of bots){scene.remove(b.H.root);b.H.root.traverse(o=>{if(o.geometry&&o.material===HUMAT)o.geometry.dispose();});}bots.length=0;}
function startMatch(){mode=MODES[save.mode]||MODES.normal;clearBots();populateLoot();placeCars();resetPlayer();time=0;matchT=0;feed.length=0;
  Object.assign(zone,{cx:0,cz:0,r:ISLE+60,tr:ISLE+60,phase:-1,t:0,shrinking:false,dps:0});zoneWall.visible=false;
  plane.a=rnd(0,6.28);const R=560,off=rnd(-140,140);plane.x0=-Math.cos(plane.a)*R-Math.sin(plane.a)*off;plane.z0=-Math.sin(plane.a)*R+Math.cos(plane.a)*off;plane.x1=Math.cos(plane.a)*R-Math.sin(plane.a)*off;plane.z1=Math.sin(plane.a)*R+Math.cos(plane.a)*off;plane.t=0;plane.on=true;plane.g.visible=true;
  for(let i=0;i<mode.bots;i++){const look=randomLook();const H=makeHuman(look);H.root.visible=false;const dropAt=rnd(.12,.86);const nm=pick(BOT_NAMES)+(10+Math.floor(Math.random()*89));
    const lp=pick(lootPts);const b={id:i,name:nm,H,x:0,y:plane.y,z:0,h:0,vy:0,hp:100,vest:0,vestHp:0,helm:0,helmHp:0,w:null,state:'plane',dropAt,lx:lp.x+rnd(-8,8),lz:lp.z+rnd(-8,8),tx:0,tz:0,target:null,tSeen:0,react:0,fireCD:0,mag:0,strafe:1,strafeT:0,crouch:false,think:0,kills:0,stuckT:0,lastX:0,lastZ:0,dead:false,deadT:0,simT:0,spd:0};
    if(mode.armed){b.w=pick(['ar','k47','smg','shotgun','ar']);equipGun(H,b.w);b.vest=1;b.vestHp=60;}bots.push(b);}
  aliveCount=bots.length+1;phase='match';cam.yaw=Math.atan2(plane.x1-plane.x0,plane.z1-plane.z0);cam.pitch=.25;hudShow('match');feedMsg('Máy bay đang bay qua đảo. Bấm Space để nhảy.');}
/* ---------- damage ---------- */
const ARMOR=[0,.3,.42,.55];
function applyDamage(t,amount,head,src,srcName){if(t.dead||t.state==='dead')return 0;let d=amount;
  if(head){if(t.helm&&t.helmHp>0){const a=d*ARMOR[t.helm];t.helmHp-=a;d-=a;if(t.helmHp<=0)t.helm=0;}}else if(t.vest&&t.vestHp>0){const a=d*ARMOR[t.vest];t.vestHp-=a;d-=a;if(t.vestHp<=0)t.vest=0;}
  t.hp-=d;if(t===P){P.hitT=.35;if(src){hitDirs.push({a:Math.atan2(src.x-P.x,src.z-P.z),t:1});}if(P.healT>0){P.healT=0;P.healK=null;}if(P.hp<=0)playerOut(srcName);}
  else if(t.hp<=0)botOut(t,src,srcName);else if(src&&!t.target){t.target=src;t.tSeen=time;}return d;}
function botOut(b,src,srcName){b.dead=true;b.state='dead';b.deadT=0;aliveCount--;equipGun(b.H,null);
  const killer=src===P?save.name||'Bạn':srcName||'Bo';feedMsg(`${killer} hạ ${b.name}${src===P&&P.lastHead?' · headshot':''}`,src===P?'#c1f354':null);if(src===P){P.kills++;hitMark(true);sfx('ko');}else if(src&&src.kills!==undefined)src.kills++;
  if(b.w){spawnItem(b.w,b.x+rnd(-1,1),b.z+rnd(-1,1));spawnItem(WEAP[b.w].ammo,b.x+rnd(-1,1),b.z+rnd(-1,1),undefined,30);}if(b.vest)spawnItem('vest'+b.vest,b.x+rnd(-1,1),b.z+rnd(-1,1));if(Math.random()<.6)spawnItem(Math.random()<.3?'medkit':'bandage',b.x+rnd(-1,1),b.z+rnd(-1,1));
  checkWin();}
function playerOut(by){if(P.state==='dead')return;if(P.car){exitCar();}P.state='dead';P.hp=0;P.place=aliveCount;aliveCount--;feedMsg(`${by||'Bo'} hạ ${save.name||'Bạn'}`,'#ff6b6b');equipGun(P.H,null);setTimeout(()=>endMatch(false),2600);}
function checkWin(){if(P.state!=='dead'&&aliveCount<=1){P.place=1;setTimeout(()=>endMatch(true),1200);}}
let ended=false;
function endMatch(win){if(phase!=='match'||ended)return;ended=true;const place=win?1:P.place||aliveCount+1;const top10=place<=10;
  const reward=(win?100:top10?20:5)+P.kills*5;save.diamonds+=reward;save.xp+=P.kills*20+(win?200:top10?60:15);save.stats.matches++;save.stats.kills+=P.kills;if(win)save.stats.wins++;if(top10)save.stats.top10++;save.stats.best=Math.max(save.stats.best,P.kills);writeSave();
  if(win)sfx('win');showResult({win,place,kills:P.kills,dmg:Math.round(P.dmg),time:matchT,reward,total:mode.bots+1});phase='result';}
/* ---------- shooting ---------- */
const _o=new T.Vector3(),_d=new T.Vector3(),_t=new T.Vector3();
function muzzleOf(H,out){if(H.gun){H.gun.updateWorldMatrix(true,false);return out.set(0,-.3-WEAP[H.gun.userData.w].len,.06).applyMatrix4(H.gun.matrixWorld);}return out.set(H.root.position.x,H.root.position.y+1.4,H.root.position.z);}
function bodyHit(o,d,max,skip){let best=max,hit=null,head=false;const test=(e,x,y,z,crouch)=>{if(e===skip)return;const top=y+(crouch?1.25:1.78);const dx=x-o.x,dz=z-o.z,hh=d.x*d.x+d.z*d.z;if(hh<1e-6)return;const t=(dx*d.x+dz*d.z)/hh;if(t<0||t>best)return;
    const px=o.x+d.x*t-x,pz=o.z+d.z*t-z,yy=o.y+d.y*t;if(px*px+pz*pz<.2&&yy>y+.05&&yy<top){best=t;hit=e;head=yy>top-.3;}};
  for(const b of bots)if(!b.dead&&b.state!=='plane'&&b.H.root.visible!==false||(!b.dead&&b.state==='ground'))test(b,b.x,b.y,b.z,b.crouch);
  if(P.state!=='dead'&&P.state!=='plane'&&!P.car)test(P,P.x,P.y,P.z,P.crouch);return{t:best,hit,head};}
function playerFire(){const s=P.slots[P.cur];if(!s)return;const W=WEAP[s.w];if(s.mag<=0){sfx('empty');if(P.ammo[W.ammo]>0)startReload();P.fireCD=.25;return;}
  s.mag--;P.fireCD=W.rate;sfx(s.w);P.recoil=Math.min(1.5,P.recoil+(W.pellets?.6:s.w==='sniper'?1.2:.22));cam.pitch=clamp(cam.pitch-(s.w==='sniper'?.035:W.pellets?.03:.012),-1.2,1.2);cam.yaw+=rnd(-.006,.006);cam.shake=Math.max(cam.shake,W.pellets||s.w==='sniper'?.08:.03);
  muzzleOf(P.H,_o);fx(_o.x,_o.y,_o.z,'flash');flashLight.position.copy(_o);flashLight.intensity=6;
  const spread=W.spread*(cam.aim?.45:1)*(P.moving>.5?1.6:1)*(P.crouch?.75:1)*(P.state!=='ground'?3:1)+P.recoil*.012*(W.pellets?0:1);
  camera.getWorldDirection(_t);const aimPt=_v2.copy(camera.position).addScaledVector(_t,2);const camT=rayWorld(camera.position,_t,W.range);
  // find what the crosshair points at, then fire from the muzzle toward it
  const bh=bodyHit(camera.position,_t,camT,P);const goal=camera.position.clone().addScaledVector(_t,Math.max(3,bh.hit?bh.t:camT));
  const n=W.pellets||1;let hitAny=false,headAny=false;
  for(let k=0;k<n;k++){_d.copy(goal).sub(_o).normalize();_d.x+=rnd(-1,1)*spread;_d.y+=rnd(-1,1)*spread;_d.z+=rnd(-1,1)*spread;_d.normalize();
    const wt=rayWorld(_o,_d,W.range),r=bodyHit(_o,_d,wt,P);const end=_o.clone().addScaledVector(_d,r.hit?r.t:wt);if(k<3)addTracer(_o,end);
    if(r.hit){const fall=clamp(1-(r.t-W.range*.5)/(W.range),.5,1);const dmg=W.dmg*fall*(r.head?(s.w==='sniper'?2.2:1.8):1);P.lastHead=r.head;P.dmg+=applyDamage(r.hit,dmg,r.head,P,save.name);hitAny=true;headAny=headAny||r.head;fx(end.x,end.y,end.z,'hit');}
    else if(wt<W.range){fx(end.x,end.y,end.z,k%2?'dust':'spark');}}
  if(hitAny){hitMark(false,headAny);sfx(headAny?'head':'hit');}
  for(const b of bots)if(!b.dead&&!b.target&&hyp(b.x-P.x,b.z-P.z)<120){b.target=P;b.tSeen=time;}
  if(s.mag===0&&P.ammo[W.ammo]>0)setTimeout(()=>{if(P.slots[P.cur]===s&&s.mag===0)startReload();},200);}
function startReload(){const s=P.slots[P.cur];if(!s||P.reloadT>0)return;const W=WEAP[s.w];if(s.mag>=W.mag||P.ammo[W.ammo]<=0)return;P.reloadT=W.reload;sfx('reload');}
function finishReload(){const s=P.slots[P.cur];if(!s)return;const W=WEAP[s.w],need=W.mag-s.mag,take=Math.min(need,P.ammo[W.ammo]);s.mag+=take;P.ammo[W.ammo]-=take;}
/* bots shoot with a hit chance instead of a real spread */
function botFire(b,tg){const W=WEAP[b.w];if(!W)return;if(b.mag<=0){b.mag=W.mag;b.fireCD=W.reload;return;}b.mag--;b.fireCD=W.rate*(W.auto?rnd(1,2.2):rnd(1.1,1.8));
  const tx=tg.x,ty=tg.y+(tg.crouch?.9:1.3),tz=tg.z,dist=hyp(tx-b.x,tz-b.z);const near=hyp(b.x-P.x,b.z-P.z)<160;
  const tMove=tg===P?(P.moving>.5||P.car):tg.spd>.5;let pHit=mode.acc*clamp(1-dist/W.range*.7,.15,1)*(tMove?.7:1)*(tg.crouch?.8:1)*(tg===P&&P.car?.55:1)*(W.pellets?(dist<12?2.2:.4):1)*(tg===P&&cam.aim?.9:1);
  if(time-b.react<0)pHit*=.3;if(tg!==P)pHit*=.4;const hit=Math.random()<pHit,head=hit&&Math.random()<mode.acc*.5;
  if(near){muzzleOf(b.H,_o);fx(_o.x,_o.y,_o.z,'flash');const end=_t.set(tx+(hit?0:rnd(-1.5,1.5)),ty+(hit?0:rnd(-.6,1.2)),tz+(hit?0:rnd(-1.5,1.5)));addTracer(_o,end);const dP=hyp(b.x-P.x,b.z-P.z);sfx(dP<60?b.w:'far',clamp(1.2-dP/120,.15,1));if(!hit&&tg===P&&dist<40)fx(end.x,end.y-.4,end.z,'dust');}
  if(hit){const dmg=W.dmg*(W.pellets?rnd(2.5,5):1)*(head?1.8:1)*rnd(.85,1.1);if(tg===P&&P.car){P.car.hp-=dmg*.4;if(Math.random()<.5)applyDamage(P,dmg*.5,false,b,b.name);}else applyDamage(tg,dmg,head,b,b.name);}}
/* ---------- bots ---------- */
const PREF={pistol:14,smg:14,shotgun:7,ar:32,k47:28,sniper:70};
function botThink(b){const dP=hyp(b.x-P.x,b.z-P.z);
  // enemies: player + nearby bots, keep the visible nearest
  let best=null,bd=mode.view;const eye=_v1.set(b.x,b.y+1.6,b.z);
  const cands=[];if(P.state==='ground'||P.state==='para'||P.state==='car')cands.push([P,dP]);for(const o of bots)if(o!==b&&!o.dead&&o.state==='ground'){const d=hyp(o.x-b.x,o.z-b.z);if(d<Math.min(bd,65))cands.push([o,d*1.6]);}
  cands.sort((a,c)=>a[1]-c[1]);for(const[e,d]of cands.slice(0,3)){if(d>bd)break;const ex=e===P&&P.car?P.car:e;if(losClear({x:eye.x,y:eye.y,z:eye.z},{x:ex.x,y:(ex.y||0)+1.4,z:ex.z})){best=e;bd=d;break;}}
  if(best&&best!==b.target){b.target=best;b.react=time+mode.react*rnd(.7,1.4);}b.tSeen=best?time:b.tSeen;if(!best&&b.target&&time-b.tSeen>5)b.target=null;
  // goals: loot when unarmed, otherwise stay inside the safe zone
  if(!b.target||!b.w){let goal=null;if(!b.w||!b.vest){let id=40;for(const it of items){const d=ITEM_DEF[it.t];if(!b.w&&d.k!=='gun'||b.w&&d.k!=='vest')continue;const dd=hyp(it.x-b.x,it.z-b.z);if(dd<id){id=dd;goal=it;}}}
    if(goal){b.tx=goal.x;b.tz=goal.z;b.goalItem=goal;}
    else{const zr=zone.shrinking?zone.tr:zone.r*.85;if(!inZone(b.x,b.z,zone.phase<0?1e9:zr)||hyp(b.tx-b.x,b.tz-b.z)<3||!b.tx){const[x,z]=zone.phase<0?pickInCircle(b.x,b.z,60):pickInCircle(zone.shrinking?zone.tcx:zone.cx,zone.shrinking?zone.tcz:zone.cz,Math.max(4,(zone.shrinking?zone.tr:zone.r)*.8));b.tx=x;b.tz=z;}b.goalItem=null;}}}
function botUpdate(b,dt){if(b.dead){b.deadT+=dt;animHuman(b.H,dt,{dead:true});if(b.deadT>12&&b.H.root.visible){b.H.root.visible=false;}return;}
  const dP=hyp(b.x-P.x,b.z-P.z),near=dP<240;
  if(b.state==='plane'){if(plane.t/plane.dur>=b.dropAt){b.state='fall';b.x=lerp(plane.x0,plane.x1,plane.t/plane.dur);b.z=lerp(plane.z0,plane.z1,plane.t/plane.dur);b.y=plane.y-4;b.vy=0;}return;}
  if(b.state==='fall'||b.state==='para'){const gh=heightAt(b.x,b.z);const dx=b.lx-b.x,dz=b.lz-b.z,dl=hyp(dx,dz)||1,hs=b.state==='fall'?20:9;
    b.x+=dx/dl*Math.min(hs,dl)*dt;b.z+=dz/dl*Math.min(hs,dl)*dt;b.vy=b.state==='fall'?Math.max(b.vy-30*dt,-50):-5.5;b.y+=b.vy*dt;b.h=Math.atan2(dx,dz);
    if(b.state==='fall'&&b.y-gh<120){b.state='para';if(near&&!b.H.chute){b.H.chute=makeChute(pick(['#e94e3c','#3c8de9','#e9c13c','#6c3ce9','#3ce98a']));b.H.root.add(b.H.chute);}}
    if(b.y<=gh){b.y=gh;b.state='ground';if(b.H.chute){b.H.root.remove(b.H.chute);b.H.chute=null;}b.tx=b.lx;b.tz=b.lz;}
    b.H.root.visible=near||dP<500;b.H.root.position.set(b.x,b.y,b.z);b.H.root.rotation.y=b.h;if(b.H.root.visible)animHuman(b.H,dt,{spd:0,air:b.state});return;}
  // zone damage
  if(zone.phase>=0&&!inZone(b.x,b.z)){b.hp-=zone.dps*dt;if(b.hp<=0){botOut(b,null,'Bo');return;}}
  if(!near){// cheap simulation far from the player: walk to goal, occasional off-screen fights
    b.H.root.visible=false;b.simT-=dt;if(b.simT<=0){b.simT=.5;botThink(b);if(b.goalItem&&hyp(b.goalItem.x-b.x,b.goalItem.z-b.z)<2)botPick(b,b.goalItem);
      const late=zone.phase>=3?2.2:zone.phase>=1?1.3:.8;if(b.w&&Math.random()<.011*late){for(const o of bots){if(o===b||o.dead||o.state!=='ground'||hyp(o.x-b.x,o.z-b.z)>55||hyp(o.x-P.x,o.z-P.z)<240)continue;const win=Math.random()<(b.hp+(b.vest*20))/(b.hp+o.hp+(b.vest+o.vest)*20+1);if(win){botOut(o,b,b.name);}else{botOut(b,o,o.name);}break;}}}
    if(b.dead)return;const dx=b.tx-b.x,dz=b.tz-b.z,dl=hyp(dx,dz);if(dl>1){const s=Math.min(dl,5.5*dt);b.x+=dx/dl*s;b.z+=dz/dl*s;b.h=Math.atan2(dx,dz);}b.y=Math.max(heightAt(b.x,b.z),-1);return;}
  b.H.root.visible=true;b.think-=dt;if(b.think<=0){b.think=.25+Math.random()*.1;botThink(b);}
  let mx=0,mz=0,spd=0,aim=false;const tg=b.target&&(b.target===P?P.state!=='dead':!b.target.dead)?b.target:null;if(!tg)b.target=null;
  if(tg&&b.w){const tx=tg===P&&P.car?P.car.x:tg.x,tz=tg===P&&P.car?P.car.z:tg.z,d=hyp(tx-b.x,tz-b.z),want=PREF[b.w]||25;const face=Math.atan2(tx-b.x,tz-b.z);b.h=lerpA(b.h,face,Math.min(1,dt*8));aim=true;
    b.strafeT-=dt;if(b.strafeT<=0){b.strafeT=rnd(.6,1.8);b.strafe=Math.random()<.5?-1:1;b.crouch=Math.random()<.25&&d>15;}
    const fwd=d>want*1.25?1:d<want*.6?-1:0;mx=Math.sin(face)*fwd+Math.cos(face)*b.strafe*.8;mz=Math.cos(face)*fwd-Math.sin(face)*b.strafe*.8;spd=b.crouch?2.2:3.6;
    b.fireCD-=dt;if(b.fireCD<=0&&time>=b.react&&d<WEAP[b.w].range&&time-b.tSeen<1.2)botFire(b,tg);}
  else if(tg&&!b.w){const away=Math.atan2(b.x-tg.x,b.z-tg.z);mx=Math.sin(away);mz=Math.cos(away);spd=6.2;b.h=away;}
  else{const dx=b.tx-b.x,dz=b.tz-b.z,dl=hyp(dx,dz);if(dl>1.2){mx=dx/dl;mz=dz/dl;spd=dl>25?6.3:4.6;b.h=lerpA(b.h,Math.atan2(dx,dz),Math.min(1,dt*6));}b.crouch=false;
    if(b.goalItem&&hyp(b.goalItem.x-b.x,b.goalItem.z-b.z)<1.6){botPick(b,b.goalItem);b.goalItem=null;b.think=0;}}
  const ml=hyp(mx,mz);if(ml>.01){b.x+=mx/ml*spd*dt;b.z+=mz/ml*spd*dt;}b.spd=ml>.01?spd:0;
  const p=resolve(b.x,b.z,.38,b.y);if(p){b.x+=p[0];b.z+=p[1];}
  if(P.state==='ground'&&!P.car){const dx=b.x-P.x,dz=b.z-P.z,d=hyp(dx,dz);if(d<.7&&d>0){b.x+=dx/d*(.7-d);b.z+=dz/d*(.7-d);}}
  b.stuckT+=dt;if(b.stuckT>1.2){if(hyp(b.x-b.lastX,b.z-b.lastZ)<.4&&spd>0&&!tg){const[x,z]=pickInCircle(b.x,b.z,25);b.tx=x;b.tz=z;b.goalItem=null;}b.stuckT=0;b.lastX=b.x;b.lastZ=b.z;}
  b.x=clamp(b.x,-HM+5,HM-5);b.z=clamp(b.z,-HM+5,HM-5);b.y=Math.max(heightAt(b.x,b.z),-1);
  // run-overs
  if(P.car&&Math.abs(P.car.spd)>7&&hyp(P.car.x-b.x,P.car.z-b.z)<2.3){applyDamage(b,40+Math.abs(P.car.spd)*3,false,P,save.name);P.car.spd*=.8;}
  b.H.root.position.set(b.x,b.y,b.z);b.H.root.rotation.y=b.h;animHuman(b.H,dt,{spd:b.spd,aim,crouch:b.crouch,pitch:0});}
function botPick(b,it){if(!items.includes(it))return;const d=ITEM_DEF[it.t];if(d.k==='gun'&&!b.w){b.w=d.w;b.mag=WEAP[d.w].mag;equipGun(b.H,b.w);removeItem(it);}else if(d.k==='vest'&&d.lv>b.vest){b.vest=d.lv;b.vestHp=40+d.lv*20;b.H.vestM.visible=true;removeItem(it);}else if(d.k==='helm'&&d.lv>b.helm){b.helm=d.lv;b.helmHp=30+d.lv*15;b.H.helmM.visible=true;removeItem(it);}}
/* ---------- player: items, inventory, healing, cars ---------- */
let nearItem=null,nearCar=null;
function playerPick(it){const d=ITEM_DEF[it.t];
  if(d.k==='gun'){const w=d.w,slot=WEAP[w].slot===2?2:(P.slots[0]?(P.slots[1]?P.cur===1?1:0:1):0);const old=P.slots[slot];if(old){spawnItem(old.w,P.x+rnd(-.6,.6),P.z+rnd(-.6,.6));}P.slots[slot]={w,mag:Math.min(WEAP[w].mag,Math.round(WEAP[w].mag*.5))};P.cur=slot;equipGun(P.H,w);}
  else if(d.k==='vest'){if(P.vest)spawnItem('vest'+P.vest,P.x+.5,P.z);P.vest=d.lv;P.vestHp=40+d.lv*20;P.H.vestM.visible=true;}
  else if(d.k==='helm'){if(P.helm)spawnItem('helm'+P.helm,P.x+.5,P.z);P.helm=d.lv;P.helmHp=30+d.lv*15;P.H.helmM.visible=true;}
  else if(d.k==='heal')P.heals[it.t]+=it.q;else if(d.k==='ammo')P.ammo[it.t]+=it.q;
  removeItem(it);sfx('pick');hudDirty=true;}
function useHeal(){if(P.healT>0||P.state!=='ground')return;if(P.hp>=100){toast('Máu đã đầy');return;}const k=P.heals.medkit>0&&(P.hp<60||P.heals.bandage===0)?'medkit':P.heals.bandage>0&&P.hp<75?'bandage':P.heals.medkit>0?'medkit':null;if(!k){toast(P.heals.bandage>0?'Băng gạc chỉ hồi tới 75 máu':'Không có đồ hồi máu');return;}P.healK=k;P.healT=k==='medkit'?6:3;P.reloadT=0;}
function enterCar(c){if(!c||P.car)return;P.car=c;P.state='car';P.H.root.visible=false;P.reloadT=0;P.healT=0;hudDirty=true;}
function exitCar(){const c=P.car;if(!c)return;P.car=null;P.state='ground';const sx=Math.cos(c.h)*1.8,sz=-Math.sin(c.h)*1.8;P.x=c.x+sx;P.z=c.z+sz;const p=resolve(P.x,P.z,.4);if(p){P.x=c.x-sx;P.z=c.z-sz;}P.y=heightAt(P.x,P.z);P.H.root.visible=true;hudDirty=true;}
let hudDirty=true;const hitDirs=[];
