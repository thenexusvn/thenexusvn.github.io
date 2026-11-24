/* ---------- characters ---------- */
const HGEO={torso:new T.CylinderGeometry(.21,.17,.56,12),vest:new T.BoxGeometry(.46,.42,.3),pack:new T.BoxGeometry(.34,.4,.18),pelvis:new T.BoxGeometry(.36,.18,.24),neck:new T.CylinderGeometry(.06,.065,.12,8),
  head:new T.SphereGeometry(.135,16,12),hair:new T.SphereGeometry(.142,16,10,0,Math.PI*2,0,Math.PI*.55),helm:new T.SphereGeometry(.165,16,10,0,Math.PI*2,0,Math.PI*.58),visor:new T.BoxGeometry(.22,.05,.06),
  upper:new T.CylinderGeometry(.068,.058,.3,8),fore:new T.CylinderGeometry(.056,.047,.27,8),hand:new T.SphereGeometry(.052,8,6),thigh:new T.CylinderGeometry(.095,.075,.46,8),shin:new T.CylinderGeometry(.075,.06,.43,8),boot:new T.BoxGeometry(.12,.11,.28),eye:new T.SphereGeometry(.019,6,4),
  pad:new T.BoxGeometry(.14,.1,.16)};
HGEO.upper.translate(0,-.15,0);HGEO.fore.translate(0,-.135,0);HGEO.thigh.translate(0,-.23,0);HGEO.shin.translate(0,-.215,0);
const HUMAT=new T.MeshStandardMaterial({vertexColors:true,roughness:.8});
const SKIN=['#f1cfb3','#e0b08a','#c8936a','#a2724f','#7d5539'],HAIR=['#16110d','#2b1d14','#4a3020','#6e4b2c','#151515'];
const OUTFITS=[{top:'#4b5a3a',pants:'#3a4030',vest:'#2e3527'},{top:'#2f3b4d',pants:'#252c38',vest:'#1b2230'},{top:'#7a6a4f',pants:'#5c5240',vest:'#4a4232'},{top:'#5b2f2f',pants:'#2a2a2a',vest:'#3a2222'},{top:'#d8d4c8',pants:'#4c5560',vest:'#3a3f46'},{top:'#3d5c6b',pants:'#2b3a42',vest:'#22313a'},{top:'#6b4f7a',pants:'#2e2838',vest:'#2a2233'}];
function makeHuman(look){const mk=(parts,parent,pos)=>{const me=new T.Mesh(buildVC(parts),HUMAT);me.castShadow=!!Q.shadow;if(pos)me.position.set(...pos);parent.add(me);return me;};
  const rootG=new T.Group();rootG.rotation.order='YXZ';const hips=new T.Group();hips.position.y=.95;rootG.add(hips);
  mk([{geo:HGEO.pelvis,color:look.pants}],hips);const spine=new T.Group();spine.position.y=.06;hips.add(spine);
  const torso=[{geo:HGEO.torso,color:look.top,pos:[0,.32,0],scale:[1,1,.7]},{geo:HGEO.neck,color:look.skin,pos:[0,.66,0]}];
  const vestM=mk([{geo:HGEO.vest,color:look.vest,pos:[0,.34,.01]},{geo:HGEO.pack,color:'#3b3328',pos:[0,.36,-.22]}],spine);vestM.visible=false;
  mk(torso,spine);const head=new T.Group();head.position.y=.82;spine.add(head);
  mk([{geo:HGEO.head,color:look.skin,scale:[1,1.12,1.05]},{geo:HGEO.hair,color:look.hair,pos:[0,.022,0],scale:[1.03,1.04,1.1]},{geo:HGEO.eye,color:'#151515',pos:[-.048,.02,.133]},{geo:HGEO.eye,color:'#151515',pos:[.048,.02,.133]}],head);
  const helmM=mk([{geo:HGEO.helm,color:'#3e4a36',pos:[0,.03,0],scale:[1.05,1.05,1.1]},{geo:HGEO.visor,color:'#222',pos:[0,.07,.15]}],head);helmM.visible=false;
  const arm={},el={};for(const s of[-1,1]){const sh=new T.Group();sh.position.set(s*.26,.56,0);spine.add(sh);mk([{geo:HGEO.upper,color:look.top},{geo:HGEO.pad,color:look.vest,pos:[0,-.02,0]}],sh);const e=new T.Group();e.position.y=-.3;sh.add(e);mk([{geo:HGEO.fore,color:look.top},{geo:HGEO.hand,color:'#2a2a2a',pos:[0,-.29,0]}],e);arm[s]=sh;el[s]=e;}
  const leg={},kn={};for(const s of[-1,1]){const hp=new T.Group();hp.position.set(s*.1,-.04,0);hips.add(hp);mk([{geo:HGEO.thigh,color:look.pants}],hp);const k=new T.Group();k.position.y=-.46;hp.add(k);mk([{geo:HGEO.shin,color:look.pants},{geo:HGEO.boot,color:'#1f1b17',pos:[0,-.44,.05]}],k);leg[s]=hp;kn[s]=k;}
  scene.add(rootG);
  return{root:rootG,hips,spine,head,armL:arm[-1],armR:arm[1],elL:el[-1],elR:el[1],legL:leg[-1],legR:leg[1],knL:kn[-1],knR:kn[1],vestM,helmM,ph:Math.random()*6,gun:null,chute:null};}
function randomLook(){return Object.assign({skin:pick(SKIN),hair:pick(HAIR)},pick(OUTFITS));}
/* pose: st = {spd, aim, crouch, air (fall|para|plane), dead, pitch, recoil} */
function animHuman(H,dt,st){const r=H.root;
  if(st.dead){r.rotation.x=lerp(r.rotation.x,-Math.PI/2,Math.min(1,dt*6));H.hips.position.y=lerp(H.hips.position.y,.2,Math.min(1,dt*6));return;}r.rotation.x=0;r.rotation.z=0;
  const amp=Math.min(1,st.spd/5),run=st.spd>6.2;H.ph+=dt*(st.spd>.2?3.4+st.spd*.72:0);const s=Math.sin(H.ph),c=Math.cos(H.ph);
  let lL=s*.75*amp,lR=-s*.75*amp,kL=Math.max(0,-s)*1.2*amp+.05,kR=Math.max(0,s)*1.2*amp+.05,aL=-s*.6*amp,aR=s*.6*amp,eL=-.3-.4*amp,eR=-.3-.4*amp,lean=run?.22:.05,hy=.95+Math.abs(c)*.05*amp,twist=0;
  if(st.air==='fall'){lL=.5;lR=.3;kL=.9;kR=.7;aL=-2.6;aR=-2.6;eL=-.3;eR=-.3;lean=1.3;hy=.95;}
  else if(st.air==='para'){lL=.25;lR=.2;kL=.3;kR=.35;aL=-2.9;aR=-2.9;eL=-.5;eR=-.5;lean=0;}
  else if(st.crouch){hy=.62+Math.abs(c)*.03*amp;lL=-.9+s*.4*amp;lR=-.9-s*.4*amp;kL=1.7;kR=1.7;lean=.35;}
  if(H.gun&&!st.air){const p=st.pitch||0,rc=st.recoil||0;if(st.aim){aR=-1.45-p+rc*.3;eR=-.15;aL=-1.25-p+rc*.3;eL=-.65;twist=.25;}else{aR=-.45;eR=-1.1;aL=-.75;eL=-1.0;twist=.35;}}
  if(st.heal){aL=-1.1;eL=-1.4;aR=-1.0;eR=-1.5;}
  H.legL.rotation.x=lL;H.legR.rotation.x=lR;H.knL.rotation.x=kL;H.knR.rotation.x=kR;H.armL.rotation.x=aL;H.armR.rotation.x=aR;H.elL.rotation.x=eL;H.elR.rotation.x=eR;
  H.armL.rotation.z=H.gun&&st.aim?.35:-.05;H.armR.rotation.z=H.gun&&st.aim?-.1:.05;H.spine.rotation.x=lean;H.spine.rotation.y=twist;H.hips.position.y=hy;H.head.rotation.y=-twist*.8;H.head.rotation.x=st.aim?-(st.pitch||0)*.5:0;}
function makeChute(col){const g=new T.Group();const can=new T.Mesh(new T.SphereGeometry(3.2,20,8,0,Math.PI*2,0,Math.PI*.42),new T.MeshStandardMaterial({color:lin(col),roughness:.7,side:T.DoubleSide}));can.scale.set(1,.55,.8);can.position.y=5.4;g.add(can);
  const lp=[];for(const a of[0,1,2,3,4,5,6,7]){const an=a/8*Math.PI*2;lp.push(0,1.4,0,Math.cos(an)*2.4,5.1,Math.sin(an)*1.9);}const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(lp,3));g.add(new T.LineSegments(lg,new T.LineBasicMaterial({color:0x333333})));return g;}
/* ---------- weapons & skins ---------- */
const WEAP={
  pistol:{n:'Súng lục G9',slot:2,dmg:24,rate:.26,mag:12,reload:1.3,spread:.022,range:70,ammo:'light',auto:false,len:.24,col:'#2b2d30'},
  smg:{n:'Tiểu liên V10',slot:0,dmg:17,rate:.072,mag:30,reload:1.9,spread:.045,range:85,ammo:'light',auto:true,len:.5,col:'#2a2c2f'},
  ar:{n:'Súng trường AR-7',slot:0,dmg:25,rate:.105,mag:30,reload:2.2,spread:.026,range:210,ammo:'medium',auto:true,len:.78,col:'#33363a'},
  k47:{n:'Súng trường K47',slot:0,dmg:31,rate:.135,mag:30,reload:2.4,spread:.036,range:190,ammo:'medium',auto:true,len:.8,col:'#3a3026'},
  shotgun:{n:'Shotgun S12',slot:0,dmg:13,pellets:8,rate:.85,mag:6,reload:2.8,spread:.085,range:38,ammo:'shell',auto:false,len:.85,col:'#2c2a28'},
  sniper:{n:'Bắn tỉa L96',slot:0,dmg:92,rate:1.35,mag:5,reload:3,spread:.002,range:600,ammo:'heavy',auto:false,len:1.05,col:'#2d3330',scope:true}};
const AMMO_N={light:'Đạn nhẹ',medium:'Đạn vừa',heavy:'Đạn nặng',shell:'Đạn shotgun'};
const RAR={common:{n:'Thường',c:'#9aa3ad'},rare:{n:'Hiếm',c:'#4ea8ff'},epic:{n:'Sử thi',c:'#b07cff'},legend:{n:'Huyền thoại',c:'#ffb02e'},myth:{n:'Thần thoại',c:'#ff4d5e'}};
function camoTex(cols){return makeTex(256,256,(g,w,h)=>{g.fillStyle=cols[0];g.fillRect(0,0,w,h);for(let k=1;k<cols.length;k++)for(let i=0;i<26;i++){g.fillStyle=cols[k];g.beginPath();const x=Math.random()*w,y=Math.random()*h;for(let a=0;a<7;a++){const an=a/7*Math.PI*2,r=14+Math.random()*26;g.lineTo(x+Math.cos(an)*r,y+Math.sin(an)*r*.7);}g.fill();}});}
const SKINS=[
  {id:'ar-jungle',w:'ar',n:'Rừng Rậm',r:'rare',p:199,mk:()=>({map:camoTex(['#4a5a32','#2e3a1e','#6f7a45','#1c2414']),roughness:.7})},
  {id:'ar-frost',w:'ar',n:'Băng Giá',r:'epic',p:499,mk:()=>({map:camoTex(['#e9f1f6','#a9c8de','#6b93b5','#ffffff']),roughness:.4,metalness:.2})},
  {id:'ar-dragon',w:'ar',n:'Rồng Lửa',r:'myth',p:2999,mk:()=>({map:makeTex(256,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#5a0a0a');gr.addColorStop(1,'#b3200f');g.fillStyle=gr;g.fillRect(0,0,w,h);g.strokeStyle='#f6c453';g.lineWidth=4;for(let i=0;i<10;i++){g.beginPath();g.moveTo(0,i*28);for(let x=0;x<=w;x+=16)g.lineTo(x,i*28+Math.sin(x/18+i)*10);g.stroke();}}),emissive:lin('#ff5a1f'),emissiveIntensity:.35,roughness:.35,metalness:.5})},
  {id:'k47-desert',w:'k47',n:'Sa Mạc',r:'rare',p:199,mk:()=>({map:camoTex(['#c8a974','#a2845a','#7d6644','#e0c99a']),roughness:.75})},
  {id:'k47-neon',w:'k47',n:'Neon Đêm',r:'epic',p:599,mk:()=>({map:makeTex(256,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#1a0b3d');gr.addColorStop(.5,'#5b1b9e');gr.addColorStop(1,'#0b3d5c');g.fillStyle=gr;g.fillRect(0,0,w,h);g.fillStyle='#c1f354';for(let x=0;x<w;x+=24)g.fillRect(x,h/2-2,12,4);}),emissive:lin('#7a3cff'),emissiveIntensity:.5,roughness:.3})},
  {id:'k47-gold',w:'k47',n:'Hoàng Kim',r:'legend',p:1299,mk:()=>({color:lin('#d9a93a'),roughness:.22,metalness:1})},
  {id:'smg-candy',w:'smg',n:'Kẹo Ngọt',r:'rare',p:199,mk:()=>({map:makeTex(128,128,(g,w,h)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ff8fc4':'#8ff0d4';g.fillRect(0,i*16,w,16);}}),roughness:.5})},
  {id:'smg-carbon',w:'smg',n:'Sợi Carbon',r:'epic',p:499,mk:()=>({map:makeTex(64,64,(g,w,h)=>{for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=8){g.fillStyle=((x+y)/8)%2?'#1b1d20':'#2f3338';g.fillRect(x,y,8,8);}}),roughness:.3,metalness:.4})},
  {id:'sg-wood',w:'shotgun',n:'Gỗ Cổ',r:'rare',p:199,mk:()=>({map:makeTex(256,64,(g,w,h)=>{g.fillStyle='#6b4423';g.fillRect(0,0,w,h);g.strokeStyle='rgba(30,15,5,.35)';for(let i=0;i<14;i++){g.beginPath();g.moveTo(0,Math.random()*h);g.bezierCurveTo(w/3,Math.random()*h,w*2/3,Math.random()*h,w,Math.random()*h);g.stroke();}}),roughness:.6})},
  {id:'sg-lava',w:'shotgun',n:'Dung Nham',r:'legend',p:1499,mk:()=>({map:makeTex(256,256,(g,w,h)=>{g.fillStyle='#1a0d08';g.fillRect(0,0,w,h);g.strokeStyle='#ff6a1a';g.lineWidth=3;for(let i=0;i<30;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<5;k++){x+=rnd(-30,30);y+=rnd(-30,30);g.lineTo(x,y);}g.stroke();}}),emissive:lin('#ff3a0a'),emissiveIntensity:.6,roughness:.5})},
  {id:'sn-shadow',w:'sniper',n:'Bóng Đêm',r:'epic',p:699,mk:()=>({map:camoTex(['#141018','#2a1f3d','#3d2a5c','#0a080c']),roughness:.45,metalness:.3})},
  {id:'sn-galaxy',w:'sniper',n:'Ngân Hà',r:'myth',p:3499,mk:()=>({map:makeTex(256,256,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.7);gr.addColorStop(0,'#7b5cff');gr.addColorStop(.5,'#22145c');gr.addColorStop(1,'#05030f');g.fillStyle=gr;g.fillRect(0,0,w,h);for(let i=0;i<260;i++){g.fillStyle=`rgba(255,255,255,${Math.random()})`;g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5);}}),emissive:lin('#4b2cff'),emissiveIntensity:.45,roughness:.25,metalness:.5})},
  {id:'pi-silver',w:'pistol',n:'Bạc',r:'rare',p:149,mk:()=>({color:lin('#c9ced4'),roughness:.25,metalness:.95})},
  {id:'pi-gold',w:'pistol',n:'Hoàng Kim',r:'legend',p:999,mk:()=>({color:lin('#d9a93a'),roughness:.2,metalness:1})}];
const skinMats={};function skinMat(w){const id=save.equipped[w];const sk=id&&SKINS.find(s=>s.id===id);const key=sk?sk.id:'def-'+w;if(!skinMats[key])skinMats[key]=sk?new T.MeshStandardMaterial(Object.assign({roughness:.5,metalness:.3},sk.mk())):new T.MeshStandardMaterial({color:lin(WEAP[w].col),roughness:.45,metalness:ENV_OK?.6:.2});return skinMats[key];}
const DARKM=new T.MeshStandardMaterial({color:lin('#151618'),roughness:.4,metalness:ENV_OK?.7:.3});
function gunGeos(w){const W=WEAP[w],L=W.len;// barrel along local -y when attached to the forearm (arm points forward when aiming)
  const body=[{geo:new T.BoxGeometry(.065,L*.55,.12),pos:[0,-.3-L*.3,.03]},{geo:new T.BoxGeometry(.06,.18,.13),pos:[0,-.22,-.06]}];
  const dark=[{geo:new T.CylinderGeometry(.018,.018,L*.5,8),pos:[0,-.3-L*.75,.06]},{geo:new T.BoxGeometry(.05,.1,.16),pos:[0,-.3-L*.2,-.08]},{geo:new T.BoxGeometry(.05,.12,.04),pos:[0,-.3-L*.45,.11]}];
  if(w==='sniper')dark.push({geo:new T.CylinderGeometry(.035,.035,.28,10),pos:[0,-.3-L*.35,.14]});
  if(w==='shotgun')dark.push({geo:new T.CylinderGeometry(.024,.024,L*.45,8),pos:[0,-.3-L*.7,.0]});
  if(w!=='pistol')body.push({geo:new T.BoxGeometry(.06,.24,.1),pos:[0,-.12,.02]});
  return{body:buildVC(body),dark:buildVC(dark)};}
const GG={};function gunMesh(w){const g=GG[w]||(GG[w]=gunGeos(w));const grp=new T.Group();const b=new T.Mesh(g.body,skinMat(w)),d=new T.Mesh(g.dark,DARKM);b.castShadow=d.castShadow=!!Q.shadow;grp.add(b,d);grp.userData.w=w;return grp;}
function equipGun(H,w){if(H.gun){H.gun.parent&&H.gun.parent.remove(H.gun);H.gun=null;}if(!w)return;H.gun=gunMesh(w);H.elR.add(H.gun);}
/* ---------- items on the ground ---------- */
const ITEM_DEF={vest1:{n:'Áo giáp cấp 1',k:'vest',lv:1,c:'#9aa3ad'},vest2:{n:'Áo giáp cấp 2',k:'vest',lv:2,c:'#4ea8ff'},vest3:{n:'Áo giáp cấp 3',k:'vest',lv:3,c:'#b07cff'},
  helm1:{n:'Mũ cấp 1',k:'helm',lv:1,c:'#9aa3ad'},helm2:{n:'Mũ cấp 2',k:'helm',lv:2,c:'#4ea8ff'},helm3:{n:'Mũ cấp 3',k:'helm',lv:3,c:'#b07cff'},
  bandage:{n:'Băng gạc',k:'heal',c:'#e9e3d4'},medkit:{n:'Hộp cứu thương',k:'heal',c:'#e84a4a'},light:{n:'Đạn nhẹ',k:'ammo',c:'#e3c34b'},medium:{n:'Đạn vừa',k:'ammo',c:'#6fbf4a'},heavy:{n:'Đạn nặng',k:'ammo',c:'#4a86bf'},shell:{n:'Đạn shotgun',k:'ammo',c:'#c94a4a'}};
for(const w in WEAP)ITEM_DEF[w]={n:WEAP[w].n,k:'gun',w,c:w==='sniper'||w==='k47'?'#b07cff':w==='ar'||w==='shotgun'?'#4ea8ff':'#9aa3ad'};
const items=[];const IG={};
function itemGeo(t){if(IG[t])return IG[t];const d=ITEM_DEF[t];let g;
  if(d.k==='gun'){const gg=gunGeos(d.w);g=buildVC([{geo:new T.BoxGeometry(.12,WEAP[d.w].len+.2,.16),color:WEAP[d.w].col}]);}
  else if(d.k==='vest')g=buildVC([{geo:new T.BoxGeometry(.5,.12,.42),color:d.c},{geo:new T.BoxGeometry(.4,.06,.3),pos:[0,.08,0],color:'#2e3527'}]);
  else if(d.k==='helm')g=buildVC([{geo:new T.SphereGeometry(.2,12,8,0,Math.PI*2,0,Math.PI*.55),color:d.c}]);
  else if(d.k==='heal')g=buildVC([{geo:new T.BoxGeometry(.32,.16,.24),color:d.c},{geo:new T.BoxGeometry(.06,.17,.16),color:'#ffffff'},{geo:new T.BoxGeometry(.16,.17,.06),color:'#ffffff'}]);
  else g=buildVC([{geo:new T.BoxGeometry(.3,.18,.22),color:'#3b3a2f'},{geo:new T.BoxGeometry(.26,.04,.18),pos:[0,.11,0],color:d.c}]);
  return IG[t]=g;}
const beamGeo=new T.CylinderGeometry(.06,.06,2.2,6,1,true);beamGeo.translate(0,1.1,0);const beamMats={};
function spawnItem(t,x,z,y,q){const d=ITEM_DEF[t];const g=new T.Group();const m=new T.Mesh(itemGeo(t),VCM);m.castShadow=!!Q.shadow;if(d.k==='gun')m.rotation.z=Math.PI/2;m.position.y=.12;g.add(m);
  const bm=beamMats[d.c]||(beamMats[d.c]=new T.MeshBasicMaterial({color:lin(d.c),transparent:true,opacity:.28,depthWrite:false,blending:T.AdditiveBlending}));g.add(new T.Mesh(beamGeo,bm));
  const yy=y!==undefined?y:heightAt(x,z);g.position.set(x,yy,z);g.rotation.y=rnd(0,6.28);g.visible=false;scene.add(g);
  const it={t,x,z,y:yy,g,q:q||(d.k==='ammo'?(t==='shell'?12:t==='heavy'?10:30):d.k==='heal'?(t==='bandage'?3:1):1)};items.push(it);return it;}
function removeItem(it){scene.remove(it.g);const i=items.indexOf(it);if(i>=0)items.splice(i,1);}
const LOOT_TABLE=[['ar',6],['k47',4],['smg',7],['shotgun',5],['sniper',2],['pistol',6],['vest1',6],['vest2',3],['vest3',1],['helm1',6],['helm2',3],['helm3',1],['bandage',10],['medkit',4],['light',9],['medium',9],['heavy',3],['shell',5]];
const LT_SUM=LOOT_TABLE.reduce((a,b)=>a+b[1],0);function rollLoot(){let r=Math.random()*LT_SUM;for(const[t,w]of LOOT_TABLE){if((r-=w)<0)return t;}return'bandage';}
function populateLoot(){for(const it of items.slice())removeItem(it);for(const p of lootPts){const n=p.inside?(Math.random()<.7?2:1):1;for(let k=0;k<n;k++){const t=rollLoot();const x=p.x+rnd(-1,1),z=p.z+rnd(-1,1);spawnItem(t,x,z);if(ITEM_DEF[t].k==='gun')spawnItem(WEAP[t].ammo,x+rnd(-.8,.8),z+rnd(-.8,.8));}}}
/* ---------- vehicles: open-top off-road buggies ---------- */
const cars=[];
const CARG=buildVC([{geo:new T.BoxGeometry(1.9,.5,3.8),pos:[0,.75,0],color:'#5d6b3c'},{geo:new T.BoxGeometry(1.8,.35,1.2),pos:[0,1.15,1.15],color:'#55633a'},{geo:new T.BoxGeometry(1.7,.06,.9),pos:[0,1.55,.45],color:'#9fc3d6'},{geo:new T.BoxGeometry(.08,.9,.08),pos:[-.8,1.45,-.4],color:'#222'},{geo:new T.BoxGeometry(.08,.9,.08),pos:[.8,1.45,-.4],color:'#222'},{geo:new T.BoxGeometry(1.7,.08,.08),pos:[0,1.9,-.4],color:'#222'},
  {geo:new T.BoxGeometry(.5,.35,.5),pos:[-.45,1.15,-.3],color:'#2a2a2a'},{geo:new T.BoxGeometry(.5,.35,.5),pos:[.45,1.15,-.3],color:'#2a2a2a'},{geo:new T.BoxGeometry(.3,.12,.05),pos:[-.6,.85,1.91],color:'#fff4cf'},{geo:new T.BoxGeometry(.3,.12,.05),pos:[.6,.85,1.91],color:'#fff4cf'}]);
const WHG=buildVC([{geo:new T.CylinderGeometry(.42,.42,.32,16).rotateZ(Math.PI/2),color:'#1b1b1b'},{geo:new T.CylinderGeometry(.24,.24,.33,10).rotateZ(Math.PI/2),color:'#8a8f96'}]);
function spawnCar(x,z,h){const g=new T.Group(),body=new T.Group();g.add(body);const m=new T.Mesh(CARG,VCM);m.castShadow=!!Q.shadow;body.add(m);const wheels=[];for(const[a,b]of[[-1,1],[1,1],[-1,-1],[1,-1]]){const w=new T.Mesh(WHG,VCM);w.position.set(a*.98,.42,b*1.3);w.castShadow=!!Q.shadow;g.add(w);wheels.push(w);}
  scene.add(g);const c={x,z,h,y:heightAt(x,z),spd:0,steer:0,g,body,wheels,hp:100,pitch:0,roll:0,vy:0};cars.push(c);return c;}
function placeCars(){for(const c of cars.slice()){scene.remove(c.g);}cars.length=0;for(const t of TOWNS){for(let k=0;k<2;k++){const a=rnd(0,6.28),x=t.x+Math.cos(a)*(t.r+6),z=t.z+Math.sin(a)*(t.r+6);if(heightAt(x,z)>2&&!resolve(x,z,2.2))spawnCar(x,z,rnd(0,6.28));}}}
function carUpdate(c,dt,thr,str,brk){const fx=Math.sin(c.h),fz=Math.cos(c.h),maxS=26;
  if(thr>0)c.spd+=(c.spd<0?22:9.5*(1-c.spd/maxS))*thr*dt;else if(thr<0)c.spd-=(c.spd>0?22:6)*-thr*dt*(c.spd<-8?0:1);else c.spd-=Math.sign(c.spd)*Math.min(Math.abs(c.spd),3*dt);
  if(brk)c.spd-=Math.sign(c.spd)*Math.min(Math.abs(c.spd),28*dt);if(c.hp<=0)c.spd*=.9;
  c.steer=lerp(c.steer,str*.55/(1+Math.abs(c.spd)/18),Math.min(1,dt*6));c.h-=c.spd*Math.tan(c.steer)/2.6*dt;
  const nx=c.x+Math.sin(c.h)*c.spd*dt,nz=c.z+Math.cos(c.h)*c.spd*dt;c.x=nx;c.z=nz;
  for(const o of[1.2,-1.2]){const px=c.x+Math.sin(c.h)*o,pz=c.z+Math.cos(c.h)*o,p=resolve(px,pz,1.1,c.y);if(p){c.x+=p[0];c.z+=p[1];if(Math.abs(c.spd)>9){c.hp-=Math.abs(c.spd)*.6;sfx('crash');}c.spd*=-.25;}}
  if(heightAt(c.x,c.z)<-.6){c.spd*=.9;}c.x=clamp(c.x,-HM+5,HM-5);c.z=clamp(c.z,-HM+5,HM-5);
  const hf=heightAt(c.x+fx*1.3,c.z+fz*1.3),hb=heightAt(c.x-fx*1.3,c.z-fz*1.3),hl=heightAt(c.x+fz,c.z-fx),hr=heightAt(c.x-fz,c.z+fx),ty=Math.max(-.3,(hf+hb+hl+hr)/4);
  c.vy-=22*dt;c.y+=c.vy*dt;if(c.y<ty){c.y=ty;c.vy=0;}c.pitch=lerp(c.pitch,Math.atan2(hb-hf,2.6),Math.min(1,dt*8));c.roll=lerp(c.roll,Math.atan2(hl-hr,2)*.8,Math.min(1,dt*8));
  c.g.position.set(c.x,c.y,c.z);c.g.rotation.set(0,c.h,0);c.body.rotation.set(c.pitch,0,c.roll);for(const w of c.wheels)w.rotation.x+=c.spd*dt/.42;}
/* ---------- effects: tracers, flashes, impacts ---------- */
const TRN=24,trPos=new Float32Array(TRN*6),trGeo=new T.BufferGeometry();trGeo.setAttribute('position',new T.BufferAttribute(trPos,3));const tracers=new T.LineSegments(trGeo,new T.LineBasicMaterial({color:0xffe6a6,transparent:true,opacity:.85,toneMapped:false}));tracers.frustumCulled=false;scene.add(tracers);let trI=0;const trT=new Float32Array(TRN);
function addTracer(a,b){const k=trI++%TRN;trPos.set([a.x,a.y,a.z,b.x,b.y,b.z],k*6);trT[k]=.05;trGeo.attributes.position.needsUpdate=true;}
const fxTex=makeTex(64,64,(g)=>{g.translate(32,32);const r=g.createRadialGradient(0,0,0,0,0,30);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,220,150,.8)');r.addColorStop(1,'rgba(255,160,60,0)');g.fillStyle=r;g.beginPath();for(let k=0;k<12;k++){const a=k/12*Math.PI*2,rr=k%2?10:30;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();},{repeat:false});
const dustTex=makeTex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,30);r.addColorStop(0,'rgba(200,190,170,.9)');r.addColorStop(1,'rgba(200,190,170,0)');g.fillStyle=r;g.fillRect(0,0,64,64);},{repeat:false});
const FXP=[];for(let k=0;k<28;k++){const s=new T.Sprite(new T.SpriteMaterial({map:fxTex,transparent:true,depthWrite:false,toneMapped:false}));s.visible=false;scene.add(s);FXP.push({s,t:0,d:.1,grow:1,rise:0});}
function fx(x,y,z,kind){const f=FXP.find(f=>f.t<=0)||FXP[0];const m=f.s.material;f.s.position.set(x,y,z);f.s.visible=true;
  if(kind==='flash'){m.map=fxTex;m.blending=T.AdditiveBlending;m.color.set('#ffd9a0');f.t=f.d=.05;f.grow=.5;f.base=.45;f.rise=0;}
  else if(kind==='spark'){m.map=fxTex;m.blending=T.AdditiveBlending;m.color.set('#fff2c8');f.t=f.d=.12;f.grow=.6;f.base=.25;f.rise=0;}
  else if(kind==='hit'){m.map=fxTex;m.blending=T.AdditiveBlending;m.color.set('#bfe3ff');f.t=f.d=.14;f.grow=.5;f.base=.3;f.rise=0;}
  else{m.map=dustTex;m.blending=T.NormalBlending;m.color.set('#ffffff');f.t=f.d=.7;f.grow=1.6;f.base=.3;f.rise=.6;}m.needsUpdate=true;}
function fxUpdate(dt){for(const f of FXP){if(f.t<=0)continue;f.t-=dt;const k=1-f.t/f.d;f.s.scale.setScalar(f.base+k*f.grow);f.s.material.opacity=Math.max(0,1-k);f.s.position.y+=f.rise*dt;if(f.t<=0)f.s.visible=false;}
  let ch=false;for(let k=0;k<TRN;k++)if(trT[k]>0){trT[k]-=dt;if(trT[k]<=0){trPos.fill(0,k*6,k*6+6);ch=true;}}if(ch)trGeo.attributes.position.needsUpdate=true;
  if(flashLight.intensity>0)flashLight.intensity=Math.max(0,flashLight.intensity-dt*60);}
/* ---------- sound (synthesized, no files) ---------- */
let AC=null;function sfxInit(){if(AC)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{AC=new C();const b=AC.createBuffer(1,AC.sampleRate*.5,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AC.nb=b;AC.out=AC.createGain();AC.out.gain.value=.35;AC.out.connect(AC.destination);}catch(_){AC=null;}}
function sfx(k,vol){const a=AC;if(!a||!running)return;if(a.state==='suspended')a.resume();const t=a.currentTime,v=vol===undefined?1:vol;
  const nz=(dur,f,type,g0)=>{const s=a.createBufferSource();s.buffer=a.nb;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;const g=a.createGain();g.gain.setValueAtTime(g0*v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(fl);fl.connect(g);g.connect(a.out);s.start(t,Math.random()*.2);s.stop(t+dur+.02);};
  const th=(f0,f1,dur,g0,type)=>{const o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(g0*v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(a.out);o.start(t);o.stop(t+dur+.02);};
  if(k==='pistol'){nz(.14,2600,'lowpass',1.1);th(200,60,.12,.8);}else if(k==='smg'){nz(.08,3000,'lowpass',.9);th(240,80,.07,.5);}else if(k==='ar'||k==='k47'){nz(.16,2200,'lowpass',1.2);th(150,50,.14,.9);nz(.35,500,'lowpass',.35);}
  else if(k==='shotgun'){nz(.3,1500,'lowpass',1.5);th(110,35,.25,1);}else if(k==='sniper'){nz(.5,1800,'lowpass',1.6);th(90,30,.4,1.1);nz(.9,300,'lowpass',.4);}
  else if(k==='far'){nz(.25,700,'lowpass',.35);}else if(k==='hit'){th(1800,1400,.05,.25,'square');}else if(k==='head'){th(2400,2000,.07,.3,'square');th(1200,900,.07,.2,'square');}
  else if(k==='pick'){th(700,1100,.08,.18,'triangle');}else if(k==='reload'){nz(.05,3000,'bandpass',.3);setTimeout(()=>sfx('click'),220);}else if(k==='click'){nz(.03,4000,'bandpass',.35);}
  else if(k==='empty'){th(900,850,.03,.2,'square');}else if(k==='step'){nz(.06,500,'lowpass',.12);}else if(k==='crash'){nz(.4,700,'lowpass',1.2);th(80,30,.3,.8);}
  else if(k==='ko'){th(500,120,.35,.3,'sawtooth');}else if(k==='zone'){th(880,880,.12,.15,'square');}else if(k==='win'){[523,659,784,1046].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,t+i*.14);g.gain.exponentialRampToValueAtTime(.25,t+i*.14+.02);g.gain.exponentialRampToValueAtTime(.001,t+i*.14+.5);o.connect(g);g.connect(a.out);o.start(t+i*.14);o.stop(t+i*.14+.55);});}
  else if(k==='chute'){nz(.6,900,'bandpass',.5);}}
let LP=null;function loopsInit(){if(!AC||LP)return;const mk=(type,f)=>{const s=AC.createBufferSource();s.buffer=AC.nb;s.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;const g=AC.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(AC.out);s.start();return{g,fl};};
  const eo=AC.createOscillator();eo.type='sawtooth';const ef=AC.createBiquadFilter();ef.type='lowpass';ef.frequency.value=400;const eg=AC.createGain();eg.gain.value=0;eo.connect(ef);ef.connect(eg);eg.connect(AC.out);eo.start();
  LP={wind:mk('bandpass',700),plane:mk('lowpass',180),amb:mk('lowpass',900),eo,ef,eg};}
