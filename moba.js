/* ======================================================================
   NEXUS LEGENDS — an original 5v5 MOBA for Nexus (three.js r128)
   Lobby, hero select, loading screen, 3-lane map with towers, minions,
   jungle camps, Dragon and Lord, 8 original heroes, shop, bots, HUD.
   ====================================================================== */
(function(){
'use strict';
const T=window.THREE;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,hyp=Math.hypot,rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const TAU=Math.PI*2;
const L=(vi,en)=>window.NexusI18n&&window.NexusI18n.lang==='en'?en:vi;

/* ---------------- static data ---------------- */
const ROLE={fighter:L('Đấu sĩ','Fighter'),tank:L('Đỡ đòn','Tank'),assassin:L('Sát thủ','Assassin'),mage:L('Pháp sư','Mage'),marksman:L('Xạ thủ','Marksman'),support:L('Trợ thủ','Support')};
const ROLELANE={fighter:'top',tank:'top',assassin:'jungle',mage:'mid',marksman:'bot',support:'sup'};
/* skill kinds: dir (skillshot), point (ground target), self, target (enemy hero in range) */
const HEROES=[
 {id:'kael',n:'Kael',t:L('Kiếm sĩ bão tố','Storm blade'),role:'fighter',col:'#4f8cff',acc:'#cfe3ff',skin:'#e9c3a0',hair:'#2b2b33',hp:3300,hpL:230,atk:172,atkL:11,ar:80,arL:5,mr:50,sp:6.6,as:.95,rng:2.3,melee:true,wpn:'sword',
  sk:[{n:L('Chém Xoáy','Whirl Slash'),k:'self',cd:6,r:4.2,d:'Xoay kiếm gây sát thương quanh mình.',de:'Spin the blade, damaging enemies around you.'},
      {n:L('Lao Kiếm','Blade Rush'),k:'dir',cd:8,r:8,d:'Lao về phía trước, chém kẻ địch trên đường.',de:'Dash forward, slashing enemies in the path.'},
      {n:L('Phán Quyết','Judgement'),k:'point',cd:40,r:9,d:'Nhảy tới vị trí chọn, giáng đòn làm choáng 1 giây.',de:'Leap to a spot and slam down, stunning for 1s.'}]},
 {id:'brakk',n:'Brakk',t:L('Pháo đài sống','Living fortress'),role:'tank',col:'#7b8a96',acc:'#f2c14e',skin:'#c58d6b',hair:'#5a3a22',hp:3700,hpL:270,atk:150,atkL:8,ar:110,arL:7,mr:65,sp:6.3,as:.8,rng:2.3,melee:true,wpn:'hammer',big:1.15,
  sk:[{n:L('Khiên Chấn','Shield Bash'),k:'dir',cd:7,r:6,d:'Húc khiên về phía trước, làm choáng kẻ địch đầu tiên.',de:'Charge with the shield, stunning the first enemy hit.'},
      {n:L('Giáp Đá','Stone Skin'),k:'self',cd:12,r:0,d:'Nhận lá chắn lớn và làm chậm kẻ địch quanh mình.',de:'Gain a big shield and slow enemies around you.'},
      {n:L('Động Đất','Earthquake'),k:'self',cd:45,r:6.5,d:'Dậm đất làm choáng mọi kẻ địch xung quanh 1,5 giây.',de:'Stomp the ground, stunning everyone nearby for 1.5s.'}]},
 {id:'nyra',n:'Nyra',t:L('Bóng đêm','Night shade'),role:'assassin',col:'#8f5bff',acc:'#ff5bd0',skin:'#f1d0b8',hair:'#e8e8f0',hp:2800,hpL:185,atk:178,atkL:12,ar:70,arL:4,mr:45,sp:7.0,as:1.0,rng:2.1,melee:true,wpn:'daggers',
  sk:[{n:L('Phi Dao','Shadow Knife'),k:'dir',cd:5,r:10,d:'Phóng dao gây sát thương lớn.',de:'Throw a knife for heavy damage.'},
      {n:L('Bóng Tối','Shadow Step'),k:'dir',cd:9,r:6,d:'Lướt đi và tăng tốc chạy trong 2 giây.',de:'Dash and gain move speed for 2s.'},
      {n:L('Lưỡi Hái Đêm','Night Reaper'),k:'target',cd:35,r:8,d:'Dịch chuyển tới tướng địch, gây sát thương cực lớn khi địch yếu máu.',de:'Blink to an enemy hero, dealing huge damage to wounded targets.'}]},
 {id:'elara',n:'Elara',t:L('Phù thuỷ lửa','Fire witch'),role:'mage',col:'#ff6a3d',acc:'#ffd166',skin:'#f3d2bb',hair:'#c0392b',hp:2500,hpL:150,atk:140,atkL:6,ar:60,arL:3,mr:60,sp:6.4,as:.85,rng:7,wpn:'staff',orb:'#ff8a3d',
  sk:[{n:L('Cầu Lửa','Fireball'),k:'dir',cd:5,r:11,d:'Bắn cầu lửa nổ lan khi trúng.',de:'Hurl a fireball that explodes on impact.'},
      {n:L('Vòng Lửa','Flame Ring'),k:'point',cd:9,r:9,d:'Đốt một vùng, làm chậm kẻ địch.',de:'Ignite an area, slowing enemies.'},
      {n:L('Mưa Thiên Thạch','Meteor Rain'),k:'point',cd:45,r:11,d:'Gọi 4 thiên thạch rơi xuống vùng chọn.',de:'Call down 4 meteors on an area.'}]},
 {id:'vex',n:'Vex',t:L('Cung thủ gió','Wind archer'),role:'marksman',col:'#2ec4b6',acc:'#e9ff70',skin:'#e8c4a5',hair:'#3d2b1f',hp:2600,hpL:165,atk:168,atkL:12,ar:65,arL:4,mr:45,sp:6.6,as:1.0,rng:8.5,wpn:'bow',orb:'#e9ff70',
  sk:[{n:L('Mưa Tên','Arrow Fan'),k:'dir',cd:6,r:9,d:'Bắn 3 mũi tên hình quạt.',de:'Fire 3 arrows in a fan.'},
      {n:L('Lướt Gió','Gust Step'),k:'dir',cd:9,r:5,d:'Lướt đi và tăng 50% tốc đánh trong 3 giây.',de:'Dash and gain 50% attack speed for 3s.'},
      {n:L('Mũi Tên Sấm','Thunder Arrow'),k:'dir',cd:38,r:40,d:'Bắn mũi tên xuyên bản đồ gây sát thương cực lớn.',de:'Fire a piercing arrow across the map for huge damage.'}]},
 {id:'lumi',n:'Lumi',t:L('Thiên sứ ánh sáng','Light angel'),role:'support',col:'#ffd23f',acc:'#ffffff',skin:'#f6dcc6',hair:'#f2e6b6',hp:2800,hpL:190,atk:135,atkL:6,ar:75,arL:5,mr:60,sp:6.5,as:.85,rng:6.5,wpn:'wand',orb:'#fff2a8',
  sk:[{n:L('Ánh Sáng','Light Bolt'),k:'dir',cd:6,r:10,d:'Tia sáng gây sát thương và làm chậm.',de:'A bolt of light that damages and slows.'},
      {n:L('Ban Phước','Blessing'),k:'self',cd:10,r:8,d:'Hồi máu và tăng tốc cho đồng đội gần đó.',de:'Heal and speed up nearby allies.'},
      {n:L('Khiên Thiên Thần','Angel Shield'),k:'self',cd:50,r:14,d:'Mọi đồng đội gần đó nhận lá chắn lớn và hồi máu.',de:'All nearby allies gain a big shield and heal.'}]},
 {id:'zoltar',n:'Zoltar',t:L('Pháp sư băng sấm','Frost sage'),role:'mage',col:'#5bc0eb',acc:'#e0fbff',skin:'#e2c2a8',hair:'#dfe7ee',hp:2550,hpL:150,atk:140,atkL:6,ar:60,arL:3,mr:60,sp:6.3,as:.85,rng:7,wpn:'staff',orb:'#8be9ff',
  sk:[{n:L('Băng Tiễn','Ice Lance'),k:'dir',cd:5,r:11,d:'Mũi băng làm chậm 40%.',de:'An ice lance that slows by 40%.'},
      {n:L('Sét Đánh','Lightning'),k:'point',cd:8,r:9,d:'Sét đánh xuống làm choáng ngắn.',de:'Lightning strikes, briefly stunning.'},
      {n:L('Bão Tuyết','Blizzard'),k:'point',cd:42,r:10,d:'Bão tuyết 3 giây gây sát thương và làm chậm mạnh.',de:'A 3-second blizzard that damages and heavily slows.'}]},
 {id:'thorn',n:'Thorn',t:L('Ngọn giáo đỏ','Crimson spear'),role:'fighter',col:'#e63946',acc:'#f4a261',skin:'#c98d6b',hair:'#1d1d1d',hp:3200,hpL:225,atk:175,atkL:11,ar:85,arL:5,mr:50,sp:6.6,as:.9,rng:2.9,melee:true,wpn:'spear',
  sk:[{n:L('Đâm Xuyên','Piercing Thrust'),k:'dir',cd:6,r:7,d:'Đâm thương xuyên qua mọi kẻ địch trên đường.',de:'Thrust through every enemy in a line.'},
      {n:L('Móc Câu','Chain Hook'),k:'dir',cd:12,r:10,d:'Kéo kẻ địch đầu tiên trúng phải về phía mình.',de:'Pull the first enemy hit towards you.'},
      {n:L('Cơn Thịnh Nộ','Rage'),k:'self',cd:40,r:0,d:'Tăng 40% công, hút máu và tốc chạy trong 6 giây.',de:'Gain 40% attack, life steal and speed for 6s.'}]}
];
const HMAP={};HEROES.forEach(h=>HMAP[h.id]=h);
const ITEMS=[
 {id:'sword',n:L('Kiếm Dài','Long Sword'),p:550,atk:35,ic:'🗡️'},
 {id:'rod',n:L('Gậy Phép','Magic Rod'),p:550,ap:55,ic:'🪄'},
 {id:'mail',n:L('Giáp Xích','Chain Mail'),p:500,ar:40,ic:'🛡️'},
 {id:'cloak',n:L('Áo Choàng','Cloak'),p:500,mr:40,ic:'🧥'},
 {id:'gem',n:L('Ngọc Sinh Mệnh','Life Gem'),p:600,hp:550,ic:'💎'},
 {id:'boots',n:L('Giày Tốc Độ','Swift Boots'),p:450,sp:.7,ic:'👟'},
 {id:'glove',n:L('Găng Tốc Chiến','Battle Gloves'),p:700,as:.25,ic:'🧤'},
 {id:'blood',n:L('Huyết Kiếm','Blood Blade'),p:1800,atk:65,ls:.12,ic:'🩸'},
 {id:'void',n:L('Trượng Hư Không','Void Staff'),p:2000,ap:140,cdr:.1,ic:'🔮'},
 {id:'aegis',n:L('Khiên Thần','Aegis'),p:2100,ar:80,hp:800,ic:'🏛️'},
 {id:'gale',n:L('Cung Gió','Gale Bow'),p:2100,atk:40,as:.3,crit:.2,ic:'🏹'},
 {id:'axe',n:L('Rìu Huỷ Diệt','Doom Axe'),p:2500,atk:120,ic:'🪓'},
 {id:'hat',n:L('Mũ Phù Thuỷ','Wizard Hat'),p:2800,ap:220,ic:'🎩'},
 {id:'frost',n:L('Giáp Băng','Frost Plate'),p:2200,ar:60,mr:60,hp:500,cdr:.1,ic:'❄️'},
 {id:'halo',n:L('Vương Miện Sáng','Halo Crown'),p:1900,ap:80,hp:400,cdr:.15,ic:'👑'}
];
const IMAP={};ITEMS.forEach(i=>IMAP[i.id]=i);
const BUILD={fighter:['boots','sword','blood','gem','aegis','axe'],tank:['boots','gem','mail','aegis','frost','cloak'],assassin:['boots','sword','blood','axe','gale','mail'],
  mage:['boots','rod','void','hat','halo','cloak'],marksman:['boots','glove','gale','blood','axe','mail'],support:['boots','gem','halo','frost','aegis','cloak']};
const BOTNAMES=['Bóng Ma','SấmSét99','Mèo Lười','ThầnGió','Rồng Nhỏ','KiếmKhách','Hoa Đào','Sói Bạc','Tia Chớp','Bánh Bao','Cú Đêm','Lửa Hồng','Mây Trắng','BeoĐen','Gấu Trúc','Sao Băng','Huyền Thoại','Ninja Rùa','Bé Bự','ZeroBug'];

/* ---------------- map layout ---------------- */
const MH=96;                       // map half size
const BASE=[{x:-74,z:74},{x:74,z:-74}]; // blue (player team) bottom-left, red top-right
const FOUNT=[{x:-86,z:86},{x:86,z:-86}];
const mir=p=>({x:p.z,z:p.x});     // mirror across the river line z=x
const LANES={
  top:[{x:-82,z:62},{x:-82,z:-20},{x:-78,z:-78},{x:-20,z:-82},{x:62,z:-82}],
  mid:[{x:-62,z:62},{x:-20,z:20},{x:20,z:-20},{x:62,z:-62}],
  bot:[{x:-62,z:82},{x:20,z:82},{x:78,z:78},{x:82,z:20},{x:82,z:-62}]};
function laneLen(P){let s=0;for(let i=1;i<P.length;i++)s+=hyp(P[i].x-P[i-1].x,P[i].z-P[i-1].z);return s;}
function lanePt(P,t){let tot=laneLen(P)*t;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],l=hyp(b.x-a.x,b.z-a.z);if(tot<=l||i===P.length-1){const k=clamp(tot/l,0,1);return{x:lerp(a.x,b.x,k),z:lerp(a.z,b.z,k)};}tot-=l;}return P[P.length-1];}
/* jungle camps for blue; red side is the mirror */
const CAMPS0=[{k:'blue',x:-52,z:8},{k:'wolf',x:-36,z:-12},{k:'red',x:-8,z:52},{k:'golem',x:12,z:36},{k:'bird',x:-50,z:30},{k:'frog',x:-30,z:50}];

function create(opt){
opt=opt||{};
const view=opt.view,hud=opt.hudRoot,MOBILE=!!opt.mobile;
/* ---------- settings (saved per browser) ---------- */
const SKEY='nexus-moba-set';
const SET=Object.assign({gfx:MOBILE?'med':'high',glow:true,dynres:true,fps:60,showFps:false,camAng:40,camDist:1,aim:'hold',prio:'lowhp',dmg:true,shake:true,hpNum:false,sfx:80,btn:100},(()=>{try{const o=JSON.parse(localStorage.getItem(SKEY)||'{}');if(!o.gfx&&localStorage.getItem('nexus-moba-gfx')==='low')o.gfx='low';return o;}catch(_){return{};}})());
function saveSet(){try{localStorage.setItem(SKEY,JSON.stringify(SET));}catch(_){}}
const GFX={low:{shadows:false,dpr:1,sm:0,pp:false,grass:.35},med:{shadows:true,dpr:1.25,sm:1024,pp:false,grass:.7},high:{shadows:true,dpr:MOBILE?1.5:2,sm:2048,pp:!MOBILE,grass:1},ultra:{shadows:true,dpr:2,sm:4096,pp:true,grass:1.6}};
const Q={};function qFrom(){const g=GFX[SET.gfx]||GFX.high;Object.assign(Q,g,{dpr:Math.min(devicePixelRatio||1,g.dpr)});Q.dprBase=Q.dpr;}qFrom();
const renderer=new T.WebGLRenderer({antialias:SET.gfx!=='low',powerPreference:'high-performance'});
renderer.setPixelRatio(Q.dpr);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=Q.shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;
view.appendChild(renderer.domElement);renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
const scene=new T.Scene();scene.background=new T.Color('#9ec3d6');scene.fog=new T.Fog('#9ec3d6',110,320);
const camera=new T.PerspectiveCamera(42,1,.5,400);
const lin=c=>new T.Color(c).convertSRGBToLinear();
const hemi=new T.HemisphereLight(0xcfe6ff,0x3a4a2a,.75);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff1d6,1.55);sun.position.set(-30,60,25);sun.castShadow=Q.shadows;
sun.shadow.mapSize.set(Q.sm||1024,Q.sm||1024);Object.assign(sun.shadow.camera,{left:-46,right:46,top:46,bottom:-46,near:1,far:180});sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const fill=new T.DirectionalLight(0x8fb7ff,.35);fill.position.set(40,30,-40);scene.add(fill);
function resize(){const w=view.clientWidth||innerWidth,h=view.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(typeof ppResize==='function')ppResize();}
addEventListener('resize',resize);
/* ---------- post-processing: HDR bloom + filmic tone map + colour grade + vignette (high / ultra) ---------- */
const PP={on:false};
const ppCam=new T.OrthographicCamera(-1,1,1,-1,0,1),ppScene=new T.Scene(),ppQuad=new T.Mesh(new T.PlaneGeometry(2,2));ppQuad.frustumCulled=false;ppScene.add(ppQuad);
const ppVS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const ppMat=(fs,u)=>new T.ShaderMaterial({uniforms:u,vertexShader:ppVS,fragmentShader:fs,depthTest:false,depthWrite:false,toneMapped:false});
const ppBright=ppMat('uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(th,th*1.5+.15,l),1.);}',{t:{value:null},th:{value:1.0}});
const ppBlur=ppMat('uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227027;c+=(texture2D(t,vUv+d*1.3846).rgb+texture2D(t,vUv-d*1.3846).rgb)*.3162162;c+=(texture2D(t,vUv+d*3.2307).rgb+texture2D(t,vUv-d*3.2307).rgb)*.0702703;gl_FragColor=vec4(c,1.);}',{t:{value:null},d:{value:new T.Vector2()}});
const ppFinal=ppMat(`uniform sampler2D tS,b1,b2,b3;uniform float str,ex,sat,vig;varying vec2 vUv;
vec3 RRT(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
void main(){vec3 c=texture2D(tS,vUv).rgb;vec3 b=texture2D(b1,vUv).rgb*.55+texture2D(b2,vUv).rgb*.8+texture2D(b3,vUv).rgb*1.1;c+=b*str;c*=ex/.6;
 const mat3 I=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));const mat3 O=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));
 c=clamp(O*RRT(I*c),0.,1.);float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);c*=mix(1.-vig,1.,smoothstep(.95,.3,length((vUv-.5)*vec2(1.15,1.))));
 c=mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));gl_FragColor=vec4(c,1.);}`,{tS:{value:null},b1:{value:null},b2:{value:null},b3:{value:null},str:{value:.45},ex:{value:1.08},sat:{value:1.12},vig:{value:.22}});
function ppPass(m,target){ppQuad.material=m;renderer.setRenderTarget(target);renderer.render(ppScene,ppCam);}
function ppDispose(){if(PP.main){PP.main.dispose();for(const l of PP.lv){l[0].dispose();l[1].dispose();}}PP.main=null;PP.on=false;}
function ppSetup(){ppDispose();const want=!!Q.pp;if(want){try{const gl2=renderer.capabilities.isWebGL2;const ty=gl2||renderer.extensions.get('OES_texture_half_float')?T.HalfFloatType:T.UnsignedByteType;
    const o={type:ty,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false};
    PP.main=gl2&&T.WebGLMultisampleRenderTarget?new T.WebGLMultisampleRenderTarget(4,4,{type:ty,format:T.RGBAFormat}):new T.WebGLRenderTarget(4,4,{type:ty,format:T.RGBAFormat});if('samples' in PP.main)PP.main.samples=4;
    PP.lv=[0,1,2].map(()=>[new T.WebGLRenderTarget(4,4,o),new T.WebGLRenderTarget(4,4,o)]);PP.on=true;ppResize();}catch(e){ppDispose();}}
  const tm=PP.on?T.NoToneMapping:T.ACESFilmicToneMapping;if(renderer.toneMapping!==tm){renderer.toneMapping=tm;const f=o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)m.needsUpdate=true;};scene.traverse(f);if(typeof LS!=='undefined')LS.scene.traverse(f);}}
function ppResize(){if(!PP.on)return;const v=renderer.getDrawingBufferSize(new T.Vector2());PP.main.setSize(v.x,v.y);PP.lv.forEach((l,i)=>{const d=2<<i;l[0].setSize(Math.max(1,v.x/d|0),Math.max(1,v.y/d|0));l[1].setSize(Math.max(1,v.x/d|0),Math.max(1,v.y/d|0));});}
function present(sc,cam){if(!PP.on){renderer.render(sc,cam);return;}
  renderer.setRenderTarget(PP.main);renderer.render(sc,cam);
  ppBright.uniforms.t.value=PP.main.texture;ppPass(ppBright,PP.lv[0][0]);
  let src=PP.lv[0][0];PP.lv.forEach((l,i)=>{const w=l[0].width,h=l[0].height;ppBlur.uniforms.t.value=src.texture;ppBlur.uniforms.d.value.set(1/w,0);ppPass(ppBlur,l[1]);ppBlur.uniforms.t.value=l[1].texture;ppBlur.uniforms.d.value.set(0,1/h);ppPass(ppBlur,l[0]);src=l[0];});
  const u=ppFinal.uniforms;u.tS.value=PP.main.texture;u.b1.value=PP.lv[0][0].texture;u.b2.value=PP.lv[1][0].texture;u.b3.value=PP.lv[2][0].texture;u.ex.value=renderer.toneMappingExposure;ppPass(ppFinal,null);}

/* ---------- helpers ---------- */
function makeTex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;}return t;}
const MC={};function mat(c,r,m,em,emI){const k=c+r+m+em+emI;if(!MC[k])MC[k]=new T.MeshStandardMaterial({color:lin(c),roughness:r==null?.7:r,metalness:m||0,emissive:em?lin(em):new T.Color(0),emissiveIntensity:emI||0});return MC[k];}
const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_v=new T.Vector3(),_s=new T.Vector3();
/* merge primitive parts into one vertex-coloured geometry: {g,p:[x,y,z],r:[x,y,z],s:[x,y,z]|n,c} */
function mergeVC(parts){let n=0;const arr=parts.map(pt=>{const g=pt.g.index?pt.g.toNonIndexed():pt.g.clone();_e.set(...(pt.r||[0,0,0]));_q.setFromEuler(_e);const sc=pt.s==null?[1,1,1]:typeof pt.s==='number'?[pt.s,pt.s,pt.s]:pt.s;_m.compose(_v.set(...(pt.p||[0,0,0])),_q,_s.set(...sc));g.applyMatrix4(_m);n+=g.attributes.position.count;return{g,c:new T.Color(pt.c||'#ffffff').convertSRGBToLinear()};});
  const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;
  for(const{g,c}of arr){const p=g.attributes.position.array,nn=g.attributes.normal.array;P.set(p,o*3);N.set(nn,o*3);for(let i=0;i<g.attributes.position.count;i++){C[(o+i)*3]=c.r;C[(o+i)*3+1]=c.g;C[(o+i)*3+2]=c.b;}o+=g.attributes.position.count;}
  const G=new T.BufferGeometry();G.setAttribute('position',new T.BufferAttribute(P,3));G.setAttribute('normal',new T.BufferAttribute(N,3));G.setAttribute('color',new T.BufferAttribute(C,3));G.computeBoundingSphere();return G;}
const VCM=new T.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.08});
const VCMF=new T.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:0,flatShading:true});
const meshVC=(parts,m)=>{const me=new T.Mesh(mergeVC(parts),m||VCM);me.castShadow=true;me.receiveShadow=true;return me;};
const BOX=new T.BoxGeometry(1,1,1),SPH=new T.SphereGeometry(1,16,12),CYL=new T.CylinderGeometry(1,1,1,14),CONE=new T.ConeGeometry(1,1,12);
const glowTex=makeTex(128,128,(g)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);});
function glowSprite(col,size,op){const s=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:new T.Color(col),transparent:true,opacity:op==null?.9:op,depthWrite:false,blending:T.AdditiveBlending}));s.scale.set(size,size,1);return s;}
const TEAMC=['#3d8bff','#ff4545'],TEAMC2=['#8fc1ff','#ffb0a8'];

/* ---------- the battlefield ---------- */
const world=new T.Group();scene.add(world);let GRASS=null;
const OB=[];// round obstacles {x,z,r}
{const S=MOBILE?2048:3072,K=S/(MH*2),P=(x,z)=>[(x+MH)*K,(z+MH)*K];
  const tex=makeTex(S,S,(g)=>{
    // grass base with soft variation
    g.fillStyle='#3b6a2c';g.fillRect(0,0,S,S);
    for(let i=0;i<2600;i++){const x=Math.random()*S,y=Math.random()*S,r=8+Math.random()*60;g.fillStyle=`rgba(${Math.random()<.5?'90,140,60':'30,70,30'},${.05+Math.random()*.08})`;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
    for(let i=0;i<26000;i++){const x=Math.random()*S,y=Math.random()*S;g.fillStyle=`rgba(${120+Math.random()*60|0},${170+Math.random()*50|0},${70+Math.random()*30|0},.18)`;g.fillRect(x,y,1.5,3+Math.random()*3);}
    // darker jungle away from lanes
    g.globalCompositeOperation='multiply';const jg=g.createRadialGradient(S/2,S/2,S*.05,S/2,S/2,S*.5);jg.addColorStop(0,'#c9d6c0');jg.addColorStop(.6,'#b8c8ad');jg.addColorStop(1,'#ffffff');g.fillStyle=jg;g.fillRect(0,0,S,S);g.globalCompositeOperation='source-over';
    // river bank and bed
    const rv=(w,c)=>{g.strokeStyle=c;g.lineWidth=w*K;g.lineCap='round';g.beginPath();g.moveTo(...P(-MH-10,-MH-10));g.lineTo(...P(MH+10,MH+10));g.stroke();};
    rv(26,'#7c8a55');rv(21,'#9c9a6a');rv(16,'#2f6670');
    // lanes: dirt with stone edges, then cobbles
    const lane=(Pt,w,c)=>{g.strokeStyle=c;g.lineWidth=w*K;g.lineJoin='round';g.lineCap='round';g.beginPath();Pt.forEach((p,i)=>i?g.lineTo(...P(p.x,p.z)):g.moveTo(...P(p.x,p.z)));g.stroke();};
    const LP=[LANES.top,LANES.mid,LANES.bot].map(l=>[BASE[0]].concat(l,[BASE[1]]));
    for(const l of LP)lane(l,11.5,'#5d5a48');for(const l of LP)lane(l,10,'#a08c64');
    for(const l of LP){const tot=laneLen(l);for(let d=0;d<tot;d+=.45){const p=lanePt(l,d/tot);for(let k=0;k<5;k++){const a=Math.random()*TAU,rr=Math.random()*4.5;const [cx,cy]=P(p.x+Math.cos(a)*rr,p.z+Math.sin(a)*rr);const s=(.22+Math.random()*.25)*K;
        g.fillStyle=`hsl(${35+Math.random()*12},${12+Math.random()*12}%,${50+Math.random()*16}%)`;g.beginPath();g.ellipse(cx,cy,s,s*.8,Math.random()*3,0,TAU);g.fill();g.strokeStyle='rgba(40,35,25,.35)';g.lineWidth=1;g.stroke();}}}
    // base plazas
    for(let t=0;t<2;t++){const b=BASE[t],[cx,cy]=P(b.x,b.z);for(const[r,c]of[[26,'#5e5a52'],[24.5,'#9b958a'],[19,'#8a8479'],[12,'#a7a094']]){g.fillStyle=c;g.beginPath();g.arc(cx,cy,r*K,0,TAU);g.fill();}
      for(let k=0;k<32;k++){const a=k/32*TAU;g.strokeStyle='rgba(60,55,48,.5)';g.lineWidth=2;g.beginPath();g.moveTo(cx+Math.cos(a)*12*K,cy+Math.sin(a)*12*K);g.lineTo(cx+Math.cos(a)*24.5*K,cy+Math.sin(a)*24.5*K);g.stroke();}
      for(const r of[12,16,19,24.5]){g.strokeStyle='rgba(60,55,48,.55)';g.lineWidth=2.5;g.beginPath();g.arc(cx,cy,r*K,0,TAU);g.stroke();}
      g.strokeStyle=TEAMC[t];g.globalAlpha=.55;g.lineWidth=.5*K;g.beginPath();g.arc(cx,cy,9*K,0,TAU);g.stroke();g.globalAlpha=1;
      const f=FOUNT[t],[fx,fy]=P(f.x,f.z);g.fillStyle='#6d685f';g.beginPath();g.arc(fx,fy,7*K,0,TAU);g.fill();g.fillStyle=TEAMC[t];g.globalAlpha=.35;g.beginPath();g.arc(fx,fy,6*K,0,TAU);g.fill();g.globalAlpha=1;}
    // dragon and lord pits
    for(const[p,c]of[[{x:38,z:38},'#8a5a3a'],[{x:-38,z:-38},'#5a3d6e']]){const [cx,cy]=P(p.x,p.z);g.fillStyle='#4d4a42';g.beginPath();g.arc(cx,cy,10*K,0,TAU);g.fill();g.fillStyle=c;g.globalAlpha=.55;g.beginPath();g.arc(cx,cy,8*K,0,TAU);g.fill();g.globalAlpha=1;g.strokeStyle='rgba(255,220,150,.4)';g.lineWidth=.3*K;g.beginPath();g.arc(cx,cy,8*K,0,TAU);g.stroke();}
    // map edge falls into dark forest floor
    g.strokeStyle='rgba(10,25,12,.85)';g.lineWidth=14*K;g.strokeRect(0,0,S,S);
  });
  const gnd=new T.Mesh(new T.PlaneGeometry(MH*2,MH*2),new T.MeshStandardMaterial({map:tex,roughness:.95,metalness:0}));gnd.rotation.x=-Math.PI/2;gnd.receiveShadow=true;world.add(gnd);
  const outer=new T.Mesh(new T.PlaneGeometry(700,700),new T.MeshStandardMaterial({color:lin('#14301a'),roughness:1}));outer.rotation.x=-Math.PI/2;outer.position.y=-.05;world.add(outer);
  const skyT=makeTex(8,512,(g,w,h)=>{const r=g.createLinearGradient(0,0,0,h);r.addColorStop(0,'#2f6fb4');r.addColorStop(.35,'#6fa6d6');r.addColorStop(.5,'#9ec3d6');r.addColorStop(1,'#9ec3d6');g.fillStyle=r;g.fillRect(0,0,w,h);});
  const sky=new T.Mesh(new T.SphereGeometry(330,32,16),new T.MeshBasicMaterial({map:skyT,side:T.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-1;world.add(sky);
  const hills=[];for(let i=0;i<70;i++){const a=i/70*TAU+Math.random()*.06,d=225+Math.random()*45,h=30+Math.random()*50,r=30+Math.random()*30;hills.push({g:new T.ConeGeometry(1,1,7),p:[Math.cos(a)*d,h/2-2,Math.sin(a)*d],s:[r,h,r],r:[0,Math.random()*3,0],c:Math.random()<.5?'#2e5a3a':'#3d6b45'});}
  world.add(new T.Mesh(mergeVC(hills),VCMF));}
/* river water with moving ripples */
const waterTex=makeTex(256,256,(g)=>{g.fillStyle='#2d7f93';g.fillRect(0,0,256,256);for(let i=0;i<260;i++){g.strokeStyle=`rgba(200,245,255,${.06+Math.random()*.12})`;g.lineWidth=1+Math.random()*2;const x=Math.random()*256,y=Math.random()*256;g.beginPath();g.ellipse(x,y,6+Math.random()*16,2+Math.random()*3,0,0,TAU);g.stroke();}},true);
waterTex.repeat.set(30,2);
{const w=new T.Mesh(new T.PlaneGeometry(hyp(MH*2,MH*2)+20,15),new T.MeshStandardMaterial({map:waterTex,color:lin('#5fb4c8'),roughness:.08,metalness:.3,transparent:true,opacity:.78,emissive:lin('#062a33'),emissiveIntensity:.25}));
  w.rotation.x=-Math.PI/2;w.rotation.z=-Math.PI/4;w.position.y=.04;world.add(w);}
/* walls, rocks and trees: built for the blue West quadrant, reflected to the South, then mirrored to the red half */
{const W0=[[-68,-6,3.2],[-68,3,3],[-66,13,2.8],[-60,-22,3.2],[-52,-27,2.6],[-28,6,2.8],[-24,-1,2.4],[-58,20,2.6],[-36,16,2.2],[-70,30,3],[-62,40,2.6]];
  const all=[];for(const[x,z,r]of W0){all.push([x,z,r],[-z,-x,r]);}const full=[];for(const[x,z,r]of all)full.push([x,z,r],[z,x,r]);
  const rockParts=[],rockParts2=[];
  for(const[x,z,r]of full){OB.push({x,z,r:r*.92});const n=3+Math.floor(Math.random()*3);for(let k=0;k<n;k++){const a=Math.random()*TAU,d=Math.random()*r*.55,s=r*(.45+Math.random()*.4);
      (k%2?rockParts2:rockParts).push({g:new T.DodecahedronGeometry(1,0),p:[x+Math.cos(a)*d,s*.55,z+Math.sin(a)*d],r:[Math.random()*3,Math.random()*3,Math.random()*3],s:[s,s*(.8+Math.random()*.6),s],c:k%2?'#7d8478':'#8e9585'});}
    rockParts.push({g:new T.DodecahedronGeometry(1,0),p:[x,r*.15,z],s:[r*1.05,r*.35,r*1.05],c:'#5f6a52'});}
  world.add(meshVC(rockParts,VCMF));world.add(meshVC(rockParts2,VCMF));
  // forest ring around the map edge, plus trees in the jungle that don't block anything
  const trees=[];const okTree=(x,z)=>{for(const l of[LANES.top,LANES.mid,LANES.bot]){const P=[BASE[0]].concat(l,[BASE[1]]);for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);if(hyp(x-a.x-dx*t,z-a.z-dz*t)<9)return false;}}
    if(Math.abs(z-x)/Math.SQRT2<11)return false;for(const b of BASE)if(hyp(x-b.x,z-b.z)<30)return false;for(const o of OB)if(hyp(x-o.x,z-o.z)<o.r+2)return false;for(const c of CAMPS0){if(hyp(x-c.x,z-c.z)<9||hyp(x-c.z,z-c.x)<9)return false;}if(hyp(x-38,z-38)<13||hyp(x+38,z+38)<13)return false;return true;};
  for(let i=0;i<900&&trees.length<(MOBILE?240:420);i++){const edge=Math.random()<.55;let x,z;if(edge){const s=Math.floor(Math.random()*4),u=rnd(-MH-14,MH+14),v=rnd(MH-4,MH+16);x=s===0?u:s===1?u:s===2?v:-v;z=s===0?v:s===1?-v:s===2?u:u;}else{x=rnd(-MH,MH);z=rnd(-MH,MH);}
    if(!okTree(x,z))continue;trees.push([x,z,(edge?.75:.55)+Math.random()*.35,Math.random()]);if(Math.abs(x)<MH&&Math.abs(z)<MH)OB.push({x,z,r:.9});}
  const trunk=new T.CylinderGeometry(.25,.4,2.4,7);trunk.translate(0,1.2,0);
  const crown=mergeVC([{g:new T.IcosahedronGeometry(1.9,1),p:[0,3.6,0],s:[1,.9,1],c:'#3f7d34'},{g:new T.IcosahedronGeometry(1.4,1),p:[.6,4.6,.2],c:'#4d9140'},{g:new T.IcosahedronGeometry(1.2,1),p:[-.7,4.3,-.3],c:'#356e2c'}]);
  const dummy=new T.Object3D();const ti=new T.InstancedMesh(trunk,mat('#5b3f2a',.9),trees.length),ci=new T.InstancedMesh(crown,VCMF,trees.length);
  trees.forEach((t,i)=>{dummy.position.set(t[0],0,t[1]);dummy.rotation.set(0,t[3]*TAU,0);dummy.scale.setScalar(t[2]);dummy.updateMatrix();ti.setMatrixAt(i,dummy.matrix);ci.setMatrixAt(i,dummy.matrix);});
  ti.castShadow=ci.castShadow=true;ci.receiveShadow=true;world.add(ti,ci);
  // flowers and grass tufts for texture
  const tuft=new T.ConeGeometry(.12,.6,4);tuft.translate(0,.3,0);const tf=[];for(let i=0;i<(MOBILE?1400:3600);i++){const x=rnd(-MH,MH),z=rnd(-MH,MH);if(okTree(x,z)||Math.random()<.3)tf.push([x,z]);}
  const tm=new T.InstancedMesh(tuft,mat('#5c9a3c',.9),tf.length);GRASS=tm;tf.forEach((p,i)=>{dummy.position.set(p[0],0,p[1]);dummy.rotation.set(0,Math.random()*3,0);dummy.scale.set(1,.6+Math.random(),1);dummy.updateMatrix();tm.setMatrixAt(i,dummy.matrix);});world.add(tm);}
/* base decoration: fountains with glowing rings, banners */
const FX={rings:[]};
for(let t=0;t<2;t++){const f=FOUNT[t],c=TEAMC[t];
  world.add(Object.assign(meshVC([{g:CYL,p:[f.x,.15,f.z],s:[7,.3,7],c:'#77726a'},{g:CYL,p:[f.x,.32,f.z],s:[5.5,.1,5.5],c:'#9d978c'},{g:CYL,p:[f.x,1.4,f.z],s:[.6,2.8,.6],c:'#bdb6a8'},{g:SPH,p:[f.x,3.2,f.z],s:.9,c:'#ffffff'}])));
  const ring=new T.Mesh(new T.RingGeometry(5.6,6.4,48),new T.MeshBasicMaterial({color:new T.Color(c),transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(f.x,.36,f.z);world.add(ring);FX.rings.push(ring);
  const gs=glowSprite(c,6,.7);gs.position.set(f.x,3.2,f.z);world.add(gs);
  for(let k=0;k<6;k++){const a=k/6*TAU,x=BASE[t].x+Math.cos(a)*25,z=BASE[t].z+Math.sin(a)*25;if(hyp(x,z)<hyp(BASE[t].x,BASE[t].z)-10)continue;
    world.add(meshVC([{g:CYL,p:[x,2.2,z],s:[.18,4.4,.18],c:'#4a4038'},{g:BOX,p:[x,3.6,z],s:[.08,1.8,1.2],c:c}]));}}

/* ---------- character models ---------- */
/* a stylised hero: hips pivot -> torso, head; shoulders -> arms; hips -> legs. Weapon in the right hand. */
function limb(len,r,c1,c2){const g=new T.Group();const m=meshVC([{g:new T.CylinderGeometry(r,r*.85,len,10),p:[0,-len/2,0],c:c1},{g:SPH,p:[0,-len,0],s:r*1.05,c:c2||c1}]);g.add(m);return g;}
function weaponMesh(w,h){const c=h.acc,col=h.col;
  if(w==='sword')return meshVC([{g:BOX,p:[0,-.05,0],s:[.09,.32,.09],c:'#3a2a1c'},{g:BOX,p:[0,.12,0],s:[.42,.07,.12],c:'#c9a227'},{g:BOX,p:[0,.78,0],s:[.13,1.25,.04],c:'#dfe8f2'},{g:CONE,p:[0,1.48,0],s:[.09,.2,.03],c:'#dfe8f2'}]);
  if(w==='hammer')return meshVC([{g:CYL,p:[0,.35,0],s:[.06,1.3,.06],c:'#5a3a22'},{g:BOX,p:[0,1.05,0],s:[.62,.38,.38],c:'#7d858c'},{g:BOX,p:[0,1.05,0],s:[.66,.1,.42],c:c}]);
  if(w==='daggers')return meshVC([{g:BOX,p:[0,0,0],s:[.07,.2,.07],c:'#222'},{g:CONE,p:[0,.38,0],s:[.07,.6,.025],c:'#d9d4ff'}]);
  if(w==='staff')return meshVC([{g:CYL,p:[0,.45,0],s:[.05,1.9,.05],c:'#4a3424'},{g:new T.TorusGeometry(.18,.035,8,16),p:[0,1.45,0],c:'#c9a227'},{g:SPH,p:[0,1.45,0],s:.15,c:h.orb||c}]);
  if(w==='bow')return meshVC([{g:new T.TorusGeometry(.75,.04,6,24,Math.PI*.9),p:[0,.35,0],r:[0,0,Math.PI*.55],c:'#6b4a2a'},{g:BOX,p:[-.2,.35,0],s:[.01,1.45,.01],c:'#eee'}]);
  if(w==='wand')return meshVC([{g:CYL,p:[0,.25,0],s:[.04,.8,.04],c:'#f4f1ea'},{g:new T.OctahedronGeometry(.16),p:[0,.75,0],c:h.orb||c}]);
  if(w==='spear')return meshVC([{g:CYL,p:[0,.6,0],s:[.045,2.6,.045],c:'#5a3a22'},{g:CONE,p:[0,2.05,0],s:[.1,.45,.05],c:'#dfe8f2'},{g:BOX,p:[0,1.78,0],s:[.22,.06,.06],c:col}]);
  return new T.Group();}
function heroModel(h,team){const g=new T.Group(),S=h.big||1,col=h.col,acc=h.acc,tc=TEAMC[team];
  const hip=new T.Group();hip.position.y=1.0;g.add(hip);
  const torso=new T.Group();hip.add(torso);
  const body=[{g:new T.CylinderGeometry(.34,.3,.7,12),p:[0,.36,0],c:col},{g:new T.CylinderGeometry(.36,.34,.14,12),p:[0,.06,0],c:'#3a2f28'},{g:BOX,p:[0,.06,.33],s:[.12,.1,.03],c:'#c9a227'},
    {g:SPH,p:[-.36,.66,0],s:[.15,.11,.15],c:acc},{g:SPH,p:[.36,.66,0],s:[.15,.11,.15],c:acc},{g:new T.CylinderGeometry(.31,.33,.08,12),p:[0,.5,0],c:acc},{g:new T.CylinderGeometry(.12,.14,.12,10),p:[0,.78,0],c:h.skin}];
  if(h.role==='tank')body.push({g:BOX,p:[0,.4,.3],s:[.55,.5,.1],c:'#9aa3ab'},{g:SPH,p:[-.44,.68,0],s:[.3,.22,.3],c:'#9aa3ab'},{g:SPH,p:[.44,.68,0],s:[.3,.22,.3],c:'#9aa3ab'});
  if(h.id==='lumi')body.push({g:new T.ConeGeometry(.7,1.2,4),p:[-.45,.65,-.32],r:[0,0,1.1],s:[1,1,.15],c:'#ffffff'},{g:new T.ConeGeometry(.7,1.2,4),p:[.45,.65,-.32],r:[0,0,-1.1],s:[1,1,.15],c:'#ffffff'});
  if(h.id==='vex')body.push({g:CYL,p:[.18,.5,-.3],r:[.3,0,-.3],s:[.12,.7,.12],c:'#6b4a2a'});
  torso.add(meshVC(body));
  // cape
  if(['kael','elara','zoltar','thorn'].includes(h.id)){const cape=new T.Mesh(new T.PlaneGeometry(.5,1.0,1,4),new T.MeshStandardMaterial({color:lin(h.id==='kael'?tc:acc),side:T.DoubleSide,roughness:.8}));cape.geometry.translate(0,-.5,0);cape.position.set(0,.72,-.31);cape.rotation.x=.12;torso.add(cape);g.userData.cape=cape;}
  // head
  const head=new T.Group();head.position.y=.98;torso.add(head);
  const hp=[{g:SPH,p:[0,.2,0],s:[.3,.32,.3],c:h.skin},{g:SPH,p:[-.1,.23,.27],s:.04,c:'#1d1d22'},{g:SPH,p:[.1,.23,.27],s:.04,c:'#1d1d22'},{g:SPH,p:[0,.3,-.07],s:[.315,.29,.31],c:h.hair},{g:SPH,p:[-.08,.13,.27],s:[.05,.02,.02],c:'#c97a6a'},{g:SPH,p:[.08,.13,.27],s:[.05,.02,.02],c:'#c97a6a'}];
  if(h.id==='elara')hp.push({g:CONE,p:[0,.75,0],s:[.32,.7,.32],r:[-.15,0,0],c:'#3a1c4a'},{g:CYL,p:[0,.45,0],s:[.5,.04,.5],c:'#3a1c4a'});
  if(h.id==='zoltar')hp.push({g:CONE,p:[0,.04,.2],s:[.18,.4,.1],r:[Math.PI,0,0],c:'#dfe7ee'},{g:CONE,p:[0,.72,0],s:[.3,.6,.3],c:'#2b4c7e'});
  if(h.id==='nyra')hp.push({g:SPH,p:[0,.3,-.05],s:[.36,.36,.36],c:'#2d1f45'});
  if(h.id==='thorn')hp.push({g:SPH,p:[0,.32,0],s:[.34,.28,.34],c:'#8d99a6'},{g:BOX,p:[0,.62,-.05],s:[.06,.26,.4],c:acc});
  if(h.id==='brakk')hp.push({g:SPH,p:[0,.3,0],s:[.35,.27,.35],c:'#9aa3ab'},{g:CONE,p:[-.28,.48,0],s:[.07,.25,.07],r:[0,0,.6],c:'#e9e1cf'},{g:CONE,p:[.28,.48,0],s:[.07,.25,.07],r:[0,0,-.6],c:'#e9e1cf'});
  if(h.id==='kael')hp.push({g:BOX,p:[0,.4,.05],s:[.5,.12,.4],c:h.hair});
  if(h.id==='lumi')hp.push({g:new T.TorusGeometry(.22,.03,6,20),p:[0,.68,0],r:[Math.PI/2,0,0],c:'#ffe066'});
  head.add(meshVC(hp));
  // arms and legs
  const sh=(x)=>{const p=new T.Group();p.position.set(x,.62,0);torso.add(p);const a=limb(.5,.1,col,h.skin);p.add(a);const el=new T.Group();el.position.y=-.5;a.add(el);const f=limb(.42,.085,h.skin,h.skin);el.add(f);const hand=new T.Group();hand.position.y=-.42;f.add(hand);return{p,el,hand};};
  const aL=sh(-.42),aR=sh(.42);
  const leg=(x)=>{const p=new T.Group();p.position.set(x,0,0);hip.add(p);const u=limb(.48,.12,'#2f3441','#2f3441');p.add(u);const k=new T.Group();k.position.y=-.48;u.add(k);const lo=limb(.44,.1,'#2f3441','#3a2f28');k.add(lo);return{p,k};};
  const lL=leg(-.16),lR=leg(.16);
  const w=weaponMesh(h.wpn,h);w.rotation.x=Math.PI/2;aR.hand.add(w);
  if(h.wpn==='daggers'){const w2=weaponMesh('daggers',h);w2.rotation.x=Math.PI/2;aL.hand.add(w2);}
  if(h.wpn==='hammer'){const sh2=meshVC([{g:CYL,p:[0,0,0],r:[0,0,Math.PI/2],s:[.55,.1,.55],c:'#8d99a6'},{g:CYL,p:[-.06,0,0],r:[0,0,Math.PI/2],s:[.3,.12,.3],c:tc}]);sh2.position.set(-.08,-.05,.05);aL.hand.add(sh2);}
  // team ring under the feet
  const ring=new T.Mesh(new T.RingGeometry(.7,.85,32),new T.MeshBasicMaterial({color:new T.Color(tc),transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.06;g.add(ring);
  g.scale.setScalar(S);g.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  return{g,hip,torso,head,aL,aR,lL,lR,ring,ph:Math.random()*6};}
/* pose a humanoid model: mv 0..1 running, atk 0..1 swing progress, cast flag, dead */
function poseHuman(M,dt,st){M.ph+=dt*(st.mv>.1?9:2);const s=Math.sin(M.ph),run=st.mv;
  M.lL.p.rotation.x=s*.8*run;M.lR.p.rotation.x=-s*.8*run;M.lL.k.rotation.x=Math.max(0,-s)*1.1*run;M.lR.k.rotation.x=Math.max(0,s)*1.1*run;
  M.hip.position.y=1.0+Math.abs(Math.cos(M.ph))*.06*run+(1-run)*Math.sin(M.ph*.5)*.015;
  M.aL.p.rotation.x=-s*.7*run;M.aL.el.rotation.x=-.4-.3*run;M.aR.p.rotation.x=s*.5*run;M.aR.el.rotation.x=-.5;M.aL.p.rotation.z=.12;M.aR.p.rotation.z=-.12;
  M.torso.rotation.y=0;M.torso.rotation.x=.08*run;
  if(st.atk>0){const k=st.atk;// wind up then strike
    if(st.ranged){M.aR.p.rotation.x=-1.4+Math.sin(k*Math.PI)*.3;M.aR.el.rotation.x=-.1;M.aL.p.rotation.x=-1.4;M.torso.rotation.y=-.3;}
    else{const sw=k<.4?k/.4:1-(k-.4)/.6;M.aR.p.rotation.x=-2.4*sw+.4*(1-sw);M.aR.p.rotation.z=-.4*sw;M.aR.el.rotation.x=-.2;M.torso.rotation.y=-.6*sw+.5*(1-sw)*(k>.4?1:0);}}
  if(st.cast>0){M.aR.p.rotation.x=-2.2;M.aL.p.rotation.x=-2.2;M.aL.p.rotation.z=.5;M.aR.p.rotation.z=-.5;}
  const cape=M.g.userData.cape;if(cape)cape.rotation.x=.12+run*.5+Math.sin(M.ph*.5)*.05;}
/* minions */
function minionModel(type,team){const tc=TEAMC[team],c2=team?'#7a2b2b':'#2b4a7a',g=new T.Group();
  if(type==='siege'){g.add(meshVC([{g:BOX,p:[0,.75,0],s:[1.5,.8,2],c:c2},{g:BOX,p:[0,1.2,0],s:[1.2,.15,1.6],c:tc},{g:CYL,p:[0,1.35,.6],r:[Math.PI/2,0,0],s:[.22,1.4,.22],c:'#3b3f45'},
    ...[[-.85,.45,-.7],[.85,.45,-.7],[-.85,.45,.7],[.85,.45,.7]].map(p=>({g:CYL,p,r:[0,0,Math.PI/2],s:[.42,.18,.42],c:'#4a3424'}))]));g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return{g,simple:true,ph:0};}
  const M={g,ph:Math.random()*6};const hip=new T.Group();hip.position.y=.62;g.add(hip);const torso=new T.Group();hip.add(torso);
  torso.add(meshVC([{g:new T.CylinderGeometry(.24,.2,.46,10),p:[0,.24,0],c:c2},{g:SPH,p:[0,.62,0],s:[.22,.23,.22],c:'#d8c3a5'},{g:SPH,p:[0,.7,0],s:[.25,.2,.25],c:tc},{g:BOX,p:[0,.45,.22],s:[.3,.2,.05],c:tc}]));
  const arm=x=>{const p=new T.Group();p.position.set(x,.42,0);torso.add(p);p.add(meshVC([{g:CYL,p:[0,-.18,0],s:[.06,.36,.06],c:c2}]));return p;};
  const aL=arm(-.27),aR=arm(.27);
  const w=type==='caster'?meshVC([{g:CYL,p:[0,-.2,.15],r:[Math.PI/2,0,0],s:[.03,.7,.03],c:'#4a3424'},{g:SPH,p:[0,-.2,.5],s:.1,c:team?'#ff9b8a':'#9fd0ff'}]):meshVC([{g:BOX,p:[0,-.35,.25],r:[Math.PI/2,0,0],s:[.06,.6,.03],c:'#dfe8f2'}]);aR.add(w);
  const leg=x=>{const p=new T.Group();p.position.set(x,0,0);hip.add(p);p.add(meshVC([{g:CYL,p:[0,-.3,0],s:[.07,.6,.07],c:'#2f3441'}]));return p;};
  const lL=leg(-.11),lR=leg(.11);
  Object.assign(M,{hip,torso,aL,aR,lL,lR});g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return M;}
function poseMinion(M,dt,st){if(M.simple)return;M.ph+=dt*(st.mv>.1?11:2);const s=Math.sin(M.ph)*st.mv;M.lL.rotation.x=s*.9;M.lR.rotation.x=-s*.9;M.aL.rotation.x=-s*.6;
  M.aR.rotation.x=st.atk>0?(-1.8*Math.sin(st.atk*Math.PI)):s*.6;M.hip.position.y=.62+Math.abs(Math.cos(M.ph))*.04*st.mv;}
/* towers, cores */
function towerModel(team){const tc=TEAMC[team],g=new T.Group();
  g.add(meshVC([{g:new T.CylinderGeometry(1.9,2.2,1,8),p:[0,.5,0],c:'#6f6a61'},{g:new T.CylinderGeometry(1.25,1.6,4.6,8),p:[0,3.3,0],c:'#a39c8f'},{g:new T.CylinderGeometry(1.3,1.3,.35,8),p:[0,2.2,0],c:team?'#7a2b2b':'#2b4a7a'},
    {g:new T.CylinderGeometry(1.55,1.3,.5,8),p:[0,5.8,0],c:'#8a8378'},...[0,1,2,3].map(k=>({g:BOX,p:[Math.cos(k*Math.PI/2+.78)*1.1,6.9,Math.sin(k*Math.PI/2+.78)*1.1],s:[.28,1.8,.28],c:'#8a8378'})),
    {g:new T.ConeGeometry(1.75,1.5,8),p:[0,8.5,0],c:team?'#8e2f2f':'#2f4f8e'}],VCMF));
  const cr=new T.Mesh(new T.OctahedronGeometry(.62),new T.MeshStandardMaterial({color:lin(TEAMC2[team]),emissive:lin(tc),emissiveIntensity:1.6,roughness:.2,metalness:.2}));cr.position.y=6.9;g.add(cr);
  const gl=glowSprite(tc,4.5,.75);gl.position.y=6.9;g.add(gl);
  const rune=new T.Mesh(new T.CylinderGeometry(1.32,1.32,.12,8,1,true),new T.MeshBasicMaterial({color:new T.Color(tc),transparent:true,opacity:.8,side:T.DoubleSide}));rune.position.y=3.5;g.add(rune);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return{g,cr,gl};}
function coreModel(team){const tc=TEAMC[team],g=new T.Group();
  g.add(meshVC([{g:new T.CylinderGeometry(4.2,4.8,1.2,10),p:[0,.6,0],c:'#6f6a61'},{g:new T.CylinderGeometry(3.4,3.8,.8,10),p:[0,1.6,0],c:'#a39c8f'},...[0,1,2,3,4,5].map(k=>({g:BOX,p:[Math.cos(k/6*TAU)*3.8,3.2,Math.sin(k/6*TAU)*3.8],r:[0,-k/6*TAU,0],s:[.6,3.6,.6],c:'#8a8378'}))],VCMF));
  const cr=new T.Mesh(new T.OctahedronGeometry(1.9),new T.MeshStandardMaterial({color:lin(TEAMC2[team]),emissive:lin(tc),emissiveIntensity:1.4,roughness:.15,metalness:.25}));cr.scale.y=1.7;cr.position.y=6.2;g.add(cr);
  const r1=new T.Mesh(new T.TorusGeometry(3,.12,8,40),new T.MeshBasicMaterial({color:new T.Color(tc)}));r1.position.y=6.2;r1.rotation.x=Math.PI/2;g.add(r1);
  const r2=r1.clone();r2.scale.setScalar(.8);g.add(r2);
  const gl=glowSprite(tc,12,.6);gl.position.y=6.2;g.add(gl);g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return{g,cr,r1,r2,gl};}
/* jungle monsters */
function monsterModel(k){const g=new T.Group();let p=[],s=1;
  if(k==='blue'||k==='red'){const c=k==='blue'?'#4fb3ff':'#ff6b3d',b=k==='blue'?'#5c6a7a':'#6a4a3a';s=1.3;
    p=[{g:SPH,p:[0,1.3,0],s:[1,1.1,.9],c:b},{g:SPH,p:[0,2.3,.2],s:.55,c:b},{g:new T.OctahedronGeometry(.35),p:[-.5,2.1,-.3],c:c},{g:new T.OctahedronGeometry(.45),p:[.4,2.4,-.4],c:c},{g:new T.OctahedronGeometry(.3),p:[0,2.85,0],c:c},
      {g:CYL,p:[-.7,.5,0],s:[.3,1,.3],c:b},{g:CYL,p:[.7,.5,0],s:[.3,1,.3],c:b},{g:CYL,p:[-1.1,1.4,.2],r:[0,0,.6],s:[.25,1.1,.25],c:b},{g:CYL,p:[1.1,1.4,.2],r:[0,0,-.6],s:[.25,1.1,.25],c:b},{g:SPH,p:[-.18,2.4,.65],s:.08,c:c},{g:SPH,p:[.18,2.4,.65],s:.08,c:c}];}
  else if(k==='wolf'||k==='frog'||k==='bird'){const c=k==='wolf'?'#6d6f78':k==='frog'?'#5e9a3c':'#c77d3a';
    p=k==='bird'?[{g:SPH,p:[0,.9,0],s:[.45,.4,.55],c},{g:SPH,p:[0,1.25,.4],s:.25,c},{g:CONE,p:[0,1.25,.7],r:[Math.PI/2,0,0],s:[.08,.25,.08],c:'#f2c14e'},{g:BOX,p:[-.55,1,0],r:[0,0,.4],s:[.7,.05,.4],c},{g:BOX,p:[.55,1,0],r:[0,0,-.4],s:[.7,.05,.4],c},{g:CYL,p:[0,.35,0],s:[.05,.7,.05],c:'#f2c14e'}]
      :k==='frog'?[{g:SPH,p:[0,.55,0],s:[.7,.45,.75],c},{g:SPH,p:[-.28,.95,.35],s:.18,c:'#e9f5d0'},{g:SPH,p:[.28,.95,.35],s:.18,c:'#e9f5d0'},{g:SPH,p:[-.28,.97,.48],s:.07,c:'#111'},{g:SPH,p:[.28,.97,.48],s:.07,c:'#111'}]
      :[{g:BOX,p:[0,.75,0],s:[.55,.5,1.2],c},{g:BOX,p:[0,.95,.75],s:[.42,.4,.45],c},{g:CONE,p:[0,.9,1.1],r:[Math.PI/2,0,0],s:[.15,.3,.15],c},{g:CONE,p:[-.14,1.25,.7],s:[.08,.2,.08],c},{g:CONE,p:[.14,1.25,.7],s:[.08,.2,.08],c},...[[-.2,-.4],[.2,-.4],[-.2,.4],[.2,.4]].map(([x,z])=>({g:CYL,p:[x,.3,z],s:[.08,.6,.08],c:'#4a4c55'})),{g:SPH,p:[-.1,1.05,1],s:.05,c:'#ffde59'},{g:SPH,p:[.1,1.05,1],s:.05,c:'#ffde59'}];}
  else if(k==='golem'){s=1.2;p=[{g:new T.DodecahedronGeometry(1,0),p:[0,1.4,0],s:[1,1.1,.9],c:'#8a8a7a'},{g:new T.DodecahedronGeometry(.5,0),p:[0,2.5,.2],c:'#9a9a88'},{g:new T.DodecahedronGeometry(.45,0),p:[-1.1,1.4,0],c:'#7a7a6a'},{g:new T.DodecahedronGeometry(.45,0),p:[1.1,1.4,0],c:'#7a7a6a'},{g:new T.DodecahedronGeometry(.4,0),p:[-.5,.4,0],c:'#6a6a5a'},{g:new T.DodecahedronGeometry(.4,0),p:[.5,.4,0],c:'#6a6a5a'},{g:SPH,p:[0,2.55,.6],s:.1,c:'#7cff6b'}];}
  else if(k==='dragon'){s=1.8;p=[{g:SPH,p:[0,1.6,0],s:[1.1,1,1.7],c:'#c0502a'},{g:SPH,p:[0,2.4,1.9],s:[.6,.55,.8],c:'#c0502a'},{g:CONE,p:[0,2.3,2.8],r:[Math.PI/2,0,0],s:[.35,.7,.3],c:'#a8401f'},{g:CONE,p:[-.3,3,1.8],r:[-.5,0,0],s:[.1,.6,.1],c:'#f2e6c4'},{g:CONE,p:[.3,3,1.8],r:[-.5,0,0],s:[.1,.6,.1],c:'#f2e6c4'},
      {g:BOX,p:[-1.7,2.5,0],r:[0,0,.5],s:[2.4,.08,1.6],c:'#e07b39'},{g:BOX,p:[1.7,2.5,0],r:[0,0,-.5],s:[2.4,.08,1.6],c:'#e07b39'},{g:CONE,p:[0,1.3,-2.2],r:[-Math.PI/2,0,0],s:[.4,2,.4],c:'#c0502a'},...[[-.6,-.6],[.6,-.6],[-.6,.7],[.6,.7]].map(([x,z])=>({g:CYL,p:[x,.5,z],s:[.22,1,.22],c:'#8a3518'})),{g:SPH,p:[-.25,2.6,2.45],s:.09,c:'#ffe066'},{g:SPH,p:[.25,2.6,2.45],s:.09,c:'#ffe066'}];}
  else if(k==='lord'){s=2.2;p=[{g:SPH,p:[0,2.2,0],s:[1.2,1.4,1],c:'#4b2d6e'},{g:SPH,p:[0,3.8,.1],s:.7,c:'#5d3a87'},{g:CONE,p:[-.5,4.6,0],r:[0,0,.4],s:[.15,.8,.15],c:'#e0c3ff'},{g:CONE,p:[.5,4.6,0],r:[0,0,-.4],s:[.15,.8,.15],c:'#e0c3ff'},
      {g:CYL,p:[-1.5,2.4,0],r:[0,0,.3],s:[.35,2,.35],c:'#4b2d6e'},{g:CYL,p:[1.5,2.4,0],r:[0,0,-.3],s:[.35,2,.35],c:'#4b2d6e'},{g:CYL,p:[-.6,.6,0],s:[.4,1.2,.4],c:'#3a2156'},{g:CYL,p:[.6,.6,0],s:[.4,1.2,.4],c:'#3a2156'},{g:SPH,p:[-.25,3.9,.62],s:.12,c:'#ff4df0'},{g:SPH,p:[.25,3.9,.62],s:.12,c:'#ff4df0'},{g:new T.OctahedronGeometry(.6),p:[0,2.4,1],c:'#ff4df0'}];}
  const m=meshVC(p);g.add(m);g.scale.setScalar(s);g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return{g,simple:true,ph:Math.random()*6,body:m};}

/* ====================================================================
   MATCH: units, combat, skills, minions, towers, jungle, bots
   ==================================================================== */
let M=null;               // current match
let UID=0;
const XPN=lv=>140+lv*90;
const MAXLV=15;
function laneFor(team,l){const P=[BASE[0]].concat(LANES[l],[BASE[1]]).map(p=>({x:p.x,z:p.z}));return team?P.reverse():P;}
function teamOf(u){return u.team;}
function alive(u){return u&&!u.dead&&!u.gone;}
function dist(a,b){return hyp(a.x-b.x,a.z-b.z);}
function newUnit(o){const u=Object.assign({id:++UID,hp:1,maxHp:1,atk:0,ap:0,ar:0,mr:0,sp:5,as:1,rng:1.5,r:.6,atkCd:0,dead:false,team:0,kind:'',face:0,mv:0,atkT:0,castT:0,
  stunT:0,slowT:0,slowP:0,shield:0,shieldT:0,buffs:[],dmgBy:{},lastHurt:-99,y:0},o);M.units.push(u);return u;}
/* ---------------- heroes ---------------- */
function itemSum(u,k){let s=0;for(const id of u.items){const it=IMAP[id];if(it&&it[k])s+=it[k];}return s;}
function buffSum(u,k){let s=0;for(const b of u.buffs)if(b[k])s+=b[k];return s;}
function recalc(u){const h=u.def,lv=u.lv-1,hpPct=u.maxHp?u.hp/u.maxHp:1;
  const mh=h.hp+h.hpL*lv+itemSum(u,'hp');u.maxHp=mh;u.hp=Math.min(mh,u.dead?0:hpPct*mh);
  u.atk=(h.atk+h.atkL*lv+itemSum(u,'atk'))*(1+buffSum(u,'atk'));
  u.ap=(itemSum(u,'ap')+((h.role==='mage'||h.role==='support')?(u.lv*14):u.lv*6))*(1+buffSum(u,'ap'));
  u.ar=h.ar+h.arL*lv+itemSum(u,'ar');u.mr=h.mr+lv*2+itemSum(u,'mr');
  u.sp=h.sp+Math.min(.7,itemSum(u,'sp'))+buffSum(u,'sp');u.as=h.as*(1+Math.min(1.2,itemSum(u,'as')+buffSum(u,'as')));
  u.crit=Math.min(.6,itemSum(u,'crit'));u.ls=itemSum(u,'ls')+buffSum(u,'ls');u.cdr=Math.min(.4,itemSum(u,'cdr')+buffSum(u,'cdr'));}
function spawnHero(def,team,name,isPlayer,lane){const f=FOUNT[team];const md=heroModel(def,team);scene.add(md.g);
  const u=newUnit({kind:'hero',def,team,name,isPlayer,lane,x:f.x+rnd(-2,2),z:f.z+rnd(-2,2),r:.65*(def.big||1),lv:1,xp:0,gold:400,items:[],k:0,d:0,a:0,cs:0,dmgDone:0,
    cd:[0,0,0],flashCd:0,recallT:0,respawnT:0,model:md,rng:def.rng,melee:!!def.melee,ai:{t:Math.random()*.3,mode:'lane',camp:null},spree:0});
  recalc(u);u.hp=u.maxHp;u.face=team?Math.PI*.75:-Math.PI*.25;return u;}
function giveXp(u,x){if(u.lv>=MAXLV)return;u.xp+=x;let up=false;while(u.lv<MAXLV&&u.xp>=XPN(u.lv)){u.xp-=XPN(u.lv);u.lv++;up=true;}if(up){const hp=u.hp;recalc(u);u.hp=Math.min(u.maxHp,hp+u.maxHp*.08);fxRing(u.x,u.z,1.6,'#ffe066',.6);if(u.isPlayer){announce(L('LÊN CẤP ','LEVEL UP ')+u.lv,'#ffe066',1.2);sfx('lvl');}}}
function giveGold(u,g){u.gold+=g;u.goldTotal=(u.goldTotal||0)+g;if(u.isPlayer&&g>=20)floatText(u,'+'+Math.round(g),'#ffd54a');}
/* ---------------- minions ---------------- */
function spawnMinion(team,lane,type){const P=laneFor(team,lane);const p=P[0],ang=Math.atan2(P[1].x-p.x,P[1].z-p.z);
  const md=minionModel(type,team);scene.add(md.g);const w=M.wave,tm=M.time/60;
  const base={melee:{hp:520,atk:28,rng:1.6,as:.9,ar:20},caster:{hp:360,atk:36,rng:5.5,as:.75,ar:10},siege:{hp:950,atk:60,rng:6.5,as:.6,ar:40}}[type];
  const g=1+tm*.09;
  const u=newUnit({kind:'minion',type,team,lane,path:P,wp:1,x:p.x+rnd(-1.2,1.2),z:p.z+rnd(-1.2,1.2),r:type==='siege'?.9:.45,maxHp:base.hp*g,atk:base.atk*(1+tm*.06),rng:base.rng,as:base.as,ar:base.ar,mr:10,sp:3.9,model:md,ranged:type!=='melee',face:ang});
  u.hp=u.maxHp;return u;}
function spawnWave(){M.wave++;const siege=M.wave%3===0;for(const team of[0,1])for(const lane of['top','mid','bot']){let k=0;const add=(t,d)=>M.timers.push({at:M.time+d/1000,fn:()=>{if(M&&!M.over)spawnMinion(team,lane,t);}});
    for(let i=0;i<3;i++)add('melee',k++*420);if(siege)add('siege',k++*420);for(let i=0;i<2;i++)add('caster',k++*420);}}
/* ---------------- towers & cores ---------------- */
function spawnTowers(){for(const team of[0,1])for(const lane of['top','mid','bot']){const P=laneFor(team,lane);
    for(const[tier,t]of[[1,.36],[2,.2]]){const p=lanePt(P,t);const md=towerModel(team);md.g.position.set(p.x,0,p.z);scene.add(md.g);
      newUnit({kind:'tower',team,lane,tier,x:p.x,z:p.z,r:1.9,maxHp:tier===1?3800:4600,hp:tier===1?3800:4600,atk:tier===1?310:360,ar:120,mr:120,rng:8.8,as:.9,model:md,shots:0,lastT:null});}}
  for(const team of[0,1]){const b=BASE[team],md=coreModel(team);md.g.position.set(b.x,0,b.z);scene.add(md.g);
    newUnit({kind:'core',team,x:b.x,z:b.z,r:4.2,maxHp:7000,hp:7000,atk:420,ar:150,mr:150,rng:9,as:1,model:md,shots:0});}}
function vulnerable(u){if(u.kind==='tower'&&u.tier===2){return!M.units.some(o=>o.kind==='tower'&&o.team===u.team&&o.lane===u.lane&&o.tier===1&&alive(o));}
  if(u.kind==='core')return M.units.some(o=>o.kind==='tower'&&o.team===u.team&&o.tier===2&&!alive(o));return true;}
/* ---------------- jungle ---------------- */
const MON={blue:{hp:2600,atk:70,r:1.4,gold:120,xp:160,re:90,n:L('Tinh Linh Băng','Frost Spirit')},red:{hp:2600,atk:80,r:1.4,gold:120,xp:160,re:90,n:L('Hoả Thú','Flame Beast')},
  wolf:{hp:900,atk:40,r:.8,gold:45,xp:60,re:60,n:L('Sói','Wolf'),n2:3},frog:{hp:1600,atk:55,r:1,gold:70,xp:90,re:60,n:L('Cóc Đá','Rock Toad')},bird:{hp:700,atk:35,r:.7,gold:40,xp:55,re:60,n:L('Chim Lửa','Fire Bird'),n2:3},
  golem:{hp:2200,atk:65,r:1.4,gold:90,xp:120,re:70,n:L('Người Đá','Golem')},dragon:{hp:9000,atk:140,r:3,gold:160,xp:260,re:150,n:L('Rồng Lửa','Fire Dragon'),start:120},lord:{hp:16000,atk:220,r:3.8,gold:250,xp:400,re:200,n:L('Chúa Tể','Abyss Lord'),start:420}};
function spawnCamp(c){const D=MON[c.k],n=D.n2||1;c.units=[];const g=1+M.time/600;
  for(let i=0;i<n;i++){const a=i/n*TAU,ox=n>1?Math.cos(a)*1.4:0,oz=n>1?Math.sin(a)*1.4:0;const md=monsterModel(c.k);scene.add(md.g);
    const u=newUnit({kind:'monster',mk:c.k,team:2,camp:c,x:c.x+ox,z:c.z+oz,hx:c.x+ox,hz:c.z+oz,r:D.r,maxHp:D.hp*g/(n>1?1.6:1),atk:D.atk*g,ar:40,mr:40,rng:D.r+1.3,as:.8,sp:4.5,model:md,face:Math.random()*TAU,name:D.n});
    u.hp=u.maxHp;c.units.push(u);}c.respawnAt=null;}
function campsInit(){M.camps=[];for(const c of CAMPS0){M.camps.push({k:c.k,x:c.x,z:c.z,side:0,nextAt:30});M.camps.push({k:c.k,x:c.z,z:c.x,side:1,nextAt:30});}
  M.camps.push({k:'dragon',x:38,z:38,side:2,nextAt:MON.dragon.start},{k:'lord',x:-38,z:-38,side:2,nextAt:MON.lord.start});}
/* ---------------- combat ---------------- */
function mitig(v,arm){return v*100/(100+Math.max(0,arm));}
function hurt(src,t,amt,type,o){if(!alive(t)||t.invuln)return 0;if((t.kind==='tower'||t.kind==='core')&&!vulnerable(t))return 0;o=o||{};
  if(src&&src.kind==='hero'&&M.diffMul&&src.team===1)amt*=M.diffMul;
  let v=type==='true'?amt:mitig(amt,type==='mag'?t.mr:t.ar);
  if(t.kind==='hero'&&t.buffs.some(b=>b.dr))v*=1-Math.max(...t.buffs.map(b=>b.dr||0));
  if(t.shield>0){const a=Math.min(t.shield,v);t.shield-=a;v-=a;}
  t.hp-=v;t.lastHurt=M.time;if(src){t.lastAttacker=src;if(src.kind==='hero'&&t.kind==='hero'){src.lastHitHero=M.time;src.lastHitHeroTeam=t.team;}if(src.kind==='hero'){t.dmgBy[src.id]=M.time;src.dmgDone=(src.dmgDone||0)+v;if(src.ls&&type!=='true'&&!o.noLs)src.hp=Math.min(src.maxHp,src.hp+v*src.ls);}}
  if(t.kind==='hero'&&t.recallT>0){t.recallT=0;}
  if(t.kind==='monster'&&src&&!t.aggro)t.aggro=src;
  if(v>=1&&(t.isPlayer||(src&&src.isPlayer)))floatText(t,Math.round(v),o.crit?'#ffb84d':type==='mag'?'#c89bff':type==='true'?'#ffffff':t.isPlayer?'#ff6b6b':'#ffffff',o.crit);
  if(t.hp<=0)kill(t,src);return v;}
function stun(t,d){if(!alive(t)||t.kind==='tower'||t.kind==='core')return;if(t.kind==='monster'&&(t.mk==='dragon'||t.mk==='lord'))d*=.3;t.stunT=Math.max(t.stunT,d);t.recallT=0;fxStun(t,d);}
function slow(t,p,d){if(!alive(t)||t.kind==='tower'||t.kind==='core')return;t.slowP=Math.max(t.slowT>0?t.slowP:0,p);t.slowT=Math.max(t.slowT,d);}
function heal(t,a){if(!alive(t))return;t.hp=Math.min(t.maxHp,t.hp+a);if(t.isPlayer||t.team===0)floatText(t,'+'+Math.round(a),'#7dff7d');}
function addBuff(u,b){u.buffs.push(Object.assign({t:b.dur},b));recalc(u);}
function bountyOf(v){return 300+Math.min(5,Math.max(0,v.spree-1))*60;}
function kill(t,src){if(t.dead)return;t.dead=true;t.hp=0;
  if(t.kind==='minion'){const g={melee:40,caster:34,siege:75}[t.type]+Math.min(30,M.time/30);const xp={melee:58,caster:48,siege:90}[t.type];
    if(src&&src.kind==='hero'){giveGold(src,g);src.cs++;}
    const near=M.units.filter(h=>h.kind==='hero'&&alive(h)&&h.team!==t.team&&dist(h,t)<13);for(const h of near){giveXp(h,xp/Math.max(1,near.length*.7));if(h!==src&&near.length>0)giveGold(h,6);}
    removeLater(t,.9);return;}
  if(t.kind==='monster'){const D=MON[t.mk];const killer=src&&src.kind==='hero'?src:null;
    if(killer){giveGold(killer,D.gold*(1+M.time/1200));giveXp(killer,D.xp*(1+M.time/1200));
      if(t.mk==='blue'||t.mk==='red'){addBuff(killer,t.mk==='blue'?{dur:90,cdr:.2,tag:'blue'}:{dur:90,atk:.1,burn:1,tag:'red'});if(killer.isPlayer)announce(t.mk==='blue'?L('NHẬN BÙA XANH: giảm hồi chiêu','BLUE BUFF: lower cooldowns'):L('NHẬN BÙA ĐỎ: đòn đánh thiêu đốt','RED BUFF: burning attacks'),t.mk==='blue'?'#6fc3ff':'#ff7b52',1.8);}
      if(t.mk==='dragon'){for(const h of heroesOf(killer.team)){giveGold(h,150);giveXp(h,180);}announce((killer.team?L('ĐỘI ĐỎ','RED TEAM'):L('ĐỘI XANH','BLUE TEAM'))+L(' HẠ RỒNG LỬA',' SLEW THE FIRE DRAGON'),killer.team?'#ff6b6b':'#6fb6ff',2.4);}
      if(t.mk==='lord'){for(const h of heroesOf(killer.team))addBuff(h,{dur:90,atk:.2,ap:.2,dr:.1,tag:'lord'});M.lordBuff[killer.team]=M.time+90;announce((killer.team?L('ĐỘI ĐỎ','RED TEAM'):L('ĐỘI XANH','BLUE TEAM'))+L(' HẠ CHÚA TỂ: lính được cường hoá',' SLEW THE ABYSS LORD: empowered minions'),'#d48bff',2.6);}}
    const c=t.camp;if(c&&c.units.every(u=>u.dead))c.nextAt=M.time+MON[c.k].re;removeLater(t,1.2);return;}
  if(t.kind==='tower'){const en=1-t.team;for(const h of heroesOf(en))giveGold(h,110);if(src&&src.kind==='hero')giveGold(src,90);
    announce(t.team===0?L('TRỤ CỦA BẠN ĐÃ BỊ PHÁ','YOUR TOWER WAS DESTROYED'):L('ĐÃ PHÁ TRỤ ĐỊCH','ENEMY TOWER DESTROYED'),t.team===0?'#ff6b6b':'#7dd3ff',2);sfx('tower');
    fxBoom(t.x,t.z,4,TEAMC[t.team]);t.model.g.visible=false;const rub=meshVC([{g:new T.CylinderGeometry(1.9,2.2,1,8),p:[0,.5,0],c:'#5a564f'},{g:new T.DodecahedronGeometry(.9,0),p:[.6,1.2,.3],c:'#7a756c'},{g:new T.DodecahedronGeometry(.7,0),p:[-.7,1.1,-.2],c:'#6a655c'}],VCMF);rub.position.set(t.x,0,t.z);scene.add(rub);M.extra.push(rub);return;}
  if(t.kind==='core'){fxBoom(t.x,t.z,8,TEAMC[t.team]);t.model.g.visible=false;endMatch(t.team===1);return;}
  if(t.kind==='hero'){t.d++;t.spree=0;t.recallT=0;const killer=src&&src.kind==='hero'?src:null;
    const assists=M.units.filter(h=>h.kind==='hero'&&h.team!==t.team&&h!==killer&&t.dmgBy[h.id]&&M.time-t.dmgBy[h.id]<10);
    if(killer){killer.k++;killer.spree++;killer.multiT=M.time-(killer.lastKillT||-99)<10?(killer.multi||1)+1:1;killer.multi=killer.multiT;killer.lastKillT=M.time;giveGold(killer,bountyOf(t));giveXp(killer,180+t.lv*30);}
    for(const a of assists){a.a++;giveGold(a,110);giveXp(a,90+t.lv*15);}
    M.score[1-t.team]++;
    const fb=!M.firstBlood;M.firstBlood=true;
    if(killer){const mult=['','',L('HẠ GỤC KÉP','DOUBLE KILL'),L('HẠ GỤC BA','TRIPLE KILL'),L('HẠ GỤC BỐN','QUADRA KILL'),L('ĐẠI SÁT','PENTA KILL')][Math.min(5,killer.multi)];
      killFeed(killer,t);
      if(killer.isPlayer||t.isPlayer||fb||mult)announce(fb?L('CHIẾN CÔNG ĐẦU TIÊN!','FIRST BLOOD!'):mult||(killer.isPlayer?L('ĐÃ HẠ GỤC ĐỊCH!','ENEMY SLAIN!'):L('BẠN ĐÃ BỊ HẠ!','YOU HAVE BEEN SLAIN!')),killer.team===0?'#7dd3ff':'#ff6b6b',2);}
    else{killFeed(src,t);if(t.isPlayer)announce(L('BẠN ĐÃ BỊ HẠ!','YOU HAVE BEEN SLAIN!'),'#ff6b6b',2);}
    if(t.isPlayer)sfx('die');else if(killer&&killer.isPlayer)sfx('kill');
    t.respawnT=Math.min(40,5+t.lv*2.2+M.time/90);t.respawnT0=t.respawnT;t.buffs=t.buffs.filter(b=>b.tag==='lord');recalc(t);t.dmgBy={};t.stunT=t.slowT=0;t.shield=0;t.dash=null;}}
function removeLater(u,d){u.removeAt=M.time+d;}
function heroesOf(team){return M.units.filter(u=>u.kind==='hero'&&u.team===team);}
function respawnHero(u){const f=FOUNT[u.team];u.dead=false;u.x=f.x+rnd(-1.5,1.5);u.z=f.z+rnd(-1.5,1.5);recalc(u);u.hp=u.maxHp;u.model.g.visible=true;u.model.g.rotation.set(0,0,0);u.respawnT=0;u.ai.mode='lane';if(u.isPlayer)announce(L('ĐÃ HỒI SINH','RESPAWNED'),'#7dff7d',1);}
/* ---------------- targeting ---------------- */
function targetable(u,by){return alive(u)&&u.kind!=='fountain'&&(u.team!==by.team)&&!(u.kind==='hero'&&u.hiddenT>0&&dist(u,by)>4)&&((u.kind!=='tower'&&u.kind!=='core')||vulnerable(u));}
function nearestEnemy(u,range,filter){let b=null,bd=1e9;for(const o of M.units){if(!targetable(o,u)||(filter&&!filter(o)))continue;const d=dist(u,o)-o.r;if(d<range&&d<bd){bd=d;b=o;}}return b;}
function autoTarget(u,extra){const R=u.rng+(extra||0);
  const hero=nearestEnemy(u,R+1,o=>o.kind==='hero');if(hero)return hero;
  let low=null,ld=1e9;for(const o of M.units){if(!targetable(o,u)||o.kind==='hero')continue;const d=dist(u,o)-o.r;if(d<R){const sc=d+(o.kind==='minion'?0:o.kind==='monster'?1:3)+o.hp/o.maxHp*2;if(sc<ld){ld=sc;low=o;}}}return low;}
/* ---------------- basic attacks ---------------- */
function tryAttack(u,t){if(!alive(t)||u.atkCd>0||u.stunT>0)return false;const d=dist(u,t)-t.r-u.r;if(d>u.rng)return false;
  u.atkCd=1/u.as;u.atkT=.001;u.face=Math.atan2(t.x-u.x,t.z-u.z);const crit=u.crit&&Math.random()<u.crit;let dmg=u.atk*(crit?1.75:1);
  if(u.kind==='hero'){if(t.kind==='tower'||t.kind==='core')dmg*=1.1;if(u.buffs.some(b=>b.burn)){dot(u,t,dmg*.18,3,'mag');slow(t,.15,1.5);}}
  if(u.kind==='minion'&&M.lordBuff[u.team]>M.time)dmg*=1.6;
  if(u.kind==='minion'&&(t.kind==='tower'||t.kind==='core'))dmg*=u.type==='siege'?2.5:1;
  if(u.kind==='tower'||u.kind==='core'){if(t.kind==='hero'){u.shots=(u.lastT===t?u.shots+1:0);dmg*=1+u.shots*.3;}else if(t.kind==='minion')dmg=t.maxHp*(t.type==='siege'?.18:.42);u.lastT=t;
    projectile({src:u,x:u.x,z:u.z,y:u.kind==='core'?6:6.9,target:t,spd:26,dmg,type:'true',col:TEAMC[u.team],size:.55});return true;}
  const ranged=!u.melee&&(u.kind==='hero'||u.ranged||u.kind==='monster'&&false);
  if(ranged){projectile({src:u,x:u.x,z:u.z,y:1.4,target:t,spd:u.kind==='hero'?28:18,dmg,type:'phys',crit,col:u.kind==='hero'?(u.def.orb||'#ffffff'):(u.team?'#ff9b8a':'#9fd0ff'),size:u.kind==='hero'?.28:.2});}
  else{const delay=u.kind==='hero'?.12:.2;M.timers.push({at:M.time+delay,fn:()=>{if(alive(u)&&alive(t)&&dist(u,t)<u.rng+t.r+u.r+1.2){hurt(u,t,dmg,'phys',{crit});if(u.kind==='hero')fxSlash(u,t);}}});}
  if(u.isPlayer)sfx(ranged?'shoot':'hit');return true;}
function dot(src,t,total,dur,type){const n=Math.round(dur*2);for(let i=1;i<=n;i++)M.timers.push({at:M.time+i*.5,fn:()=>hurt(src,t,total/n,type,{noLs:true})});}
/* ---------------- projectiles & area effects ---------------- */
function projectile(o){const mesh=new T.Group();const core=new T.Mesh(SPH,new T.MeshBasicMaterial({color:new T.Color(o.col||'#fff')}));core.scale.setScalar(o.size||.25);mesh.add(core);const gl=glowSprite(o.col||'#fff',(o.size||.25)*7,.9);mesh.add(gl);
  if(o.shape==='arrow'){core.scale.set(.06,.06,.9);}
  mesh.position.set(o.x,o.y||1.3,o.z);scene.add(mesh);const p=Object.assign({mesh,travel:0,hit:new Set(),team:o.src.team},o);M.proj.push(p);return p;}
function skillshot(u,dir,o){const p=projectile(Object.assign({src:u,x:u.x+dir.x*.6,z:u.z+dir.z*.6,y:1.3,dir,spd:o.spd||26,range:o.range||10,w:o.w||.8,type:'mag'},o));if(o.shape==='arrow'){p.mesh.rotation.y=Math.atan2(dir.x,dir.z);}return p;}
function enemiesIn(u,x,z,r,heroOnly){return M.units.filter(o=>targetable(o,u)&&(!heroOnly||o.kind==='hero')&&o.kind!=='core'&&o.kind!=='tower'&&hyp(o.x-x,o.z-z)<r+o.r);}
function alliesIn(u,x,z,r){return M.units.filter(o=>alive(o)&&o.kind==='hero'&&o.team===u.team&&hyp(o.x-x,o.z-z)<r);}
function aoe(u,x,z,r,dmg,type,delay,on,col){fxRing(x,z,r,col||'#ff9b4a',delay||.25,true);M.timers.push({at:M.time+(delay||0),fn:()=>{if(!M)return;for(const o of enemiesIn(u,x,z,r)){hurt(u,o,dmg,type);on&&on(o);}fxBoom(x,z,r*.7,col||'#ff9b4a');}});}
function dash(u,dir,d,spd,onHit,onEnd){u.dash={vx:dir.x*spd,vz:dir.z*spd,t:d/spd,hit:new Set(),onHit,onEnd};u.face=Math.atan2(dir.x,dir.z);}
function sc(u,base,per,ratio,useAp){return base+per*u.lv+ratio*(useAp?u.ap:u.atk);}
/* ---------------- skills ---------------- */
const SK={
 kael:[(u,a)=>{const v=sc(u,160,26,.9);fxSpin(u,4.2,'#bfe3ff');for(const o of enemiesIn(u,u.x,u.z,4.2))hurt(u,o,v,'phys');},
       (u,a)=>{const v=sc(u,140,22,.8);dash(u,a.dir,8,30,o=>hurt(u,o,v,'phys'));},
       (u,a)=>{const v=sc(u,380,45,1.4);const p=clampPt(u,a.pt,9);u.leap={x0:u.x,z0:u.z,x1:p.x,z1:p.z,t:0,d:.55};u.invuln=true;M.timers.push({at:M.time+.55,fn:()=>{u.invuln=false;fxBoom(u.x,u.z,3.5,'#6fb6ff');shake(.5);for(const o of enemiesIn(u,u.x,u.z,4.2)){hurt(u,o,v,'phys');stun(o,1);}}});}],
 brakk:[(u,a)=>{const v=sc(u,150,22,.6)+u.maxHp*.03;dash(u,a.dir,6,24,null);skillshot(u,a.dir,{range:6.5,spd:24,w:1.1,col:'#f2c14e',size:.45,dmg:v,type:'phys',stop:true,onHit:o=>stun(o,.9)});},
        (u,a)=>{u.shield=Math.max(u.shield,u.maxHp*.22+u.lv*30);u.shieldT=4;fxShield(u,'#f2c14e');for(const o of enemiesIn(u,u.x,u.z,4.5))slow(o,.35,2);},
        (u,a)=>{const v=sc(u,300,35,.8)+u.maxHp*.05;fxRing(u.x,u.z,6.5,'#c9a227',.45,true);M.timers.push({at:M.time+.45,fn:()=>{shake(.7);fxBoom(u.x,u.z,6,'#c9a227');for(const o of enemiesIn(u,u.x,u.z,6.5)){hurt(u,o,v,'phys');stun(o,1.5);}}});}],
 nyra:[(u,a)=>{skillshot(u,a.dir,{range:10,spd:34,w:.7,col:'#c58bff',size:.3,shape:'arrow',dmg:sc(u,220,30,1.05),type:'phys',stop:true});},
       (u,a)=>{dash(u,a.dir,6,32,null);addBuff(u,{dur:2,sp:2.2,tag:'step'});u.hiddenT=1.2;fxPuff(u,'#5b3d8a');},
       (u,a)=>{const t=a.tgt;if(!t)return;const back={x:t.x-Math.sin(t.face)*1.2,z:t.z-Math.cos(t.face)*1.2};fxPuff(u,'#5b3d8a');u.x=back.x;u.z=back.z;fxPuff(u,'#ff5bd0');
         const miss=1-t.hp/t.maxHp,v=sc(u,320,40,1.3)*(1+miss*1.2);M.timers.push({at:M.time+.12,fn:()=>{hurt(u,t,v,'phys');fxSlash(u,t,'#ff5bd0');}});}],
 elara:[(u,a)=>{const v=sc(u,240,32,.95,1);skillshot(u,a.dir,{range:11,spd:22,w:.9,col:'#ff7a2f',size:.5,dmg:0,stop:true,onHit:(o,p)=>{aoe(u,p.mesh.position.x,p.mesh.position.z,2.6,v,'mag',0,null,'#ff7a2f');},onEnd:p=>{}});},
        (u,a)=>{const p=clampPt(u,a.pt,9),v=sc(u,200,28,.8,1);aoe(u,p.x,p.z,3.2,v,'mag',.6,o=>slow(o,.4,2),'#ff5a2a');},
        (u,a)=>{const p=clampPt(u,a.pt,11),v=sc(u,260,36,.85,1);for(let i=0;i<4;i++){const ox=rnd(-2.2,2.2),oz=rnd(-2.2,2.2);M.timers.push({at:M.time+i*.35,fn:()=>{meteor(p.x+ox,p.z+oz);aoe(u,p.x+ox,p.z+oz,2.6,v,'mag',.45,null,'#ff4d1a');}});}}],
 vex:[(u,a)=>{const v=sc(u,150,22,.95);for(const k of[-.22,0,.22]){const c=Math.cos(k),s=Math.sin(k);const d={x:a.dir.x*c-a.dir.z*s,z:a.dir.x*s+a.dir.z*c};skillshot(u,d,{range:9,spd:32,w:.6,col:'#e9ff70',size:.22,shape:'arrow',dmg:v,type:'phys',stop:true});}},
      (u,a)=>{dash(u,a.dir,5,30,null);addBuff(u,{dur:3,as:.5,tag:'gust'});u.atkCd=0;},
      (u,a)=>{const v=sc(u,420,55,1.6);skillshot(u,a.dir,{range:40,spd:42,w:1.2,col:'#7df9ff',size:.55,shape:'arrow',dmg:v,type:'phys',pierce:true,heroFall:.15});shake(.3);}],
 lumi:[(u,a)=>{skillshot(u,a.dir,{range:10,spd:28,w:.9,col:'#fff2a8',size:.4,dmg:sc(u,180,26,.8,1),stop:true,onHit:o=>slow(o,.35,1.8)});},
       (u,a)=>{fxRing(u.x,u.z,8,'#7dff9a',.4);for(const o of alliesIn(u,u.x,u.z,8)){heal(o,sc(u,160,24,.6,1));addBuff(o,{dur:2,sp:1.4,tag:'bless'});}},
       (u,a)=>{fxRing(u.x,u.z,14,'#fff2a8',.5);for(const o of alliesIn(u,u.x,u.z,14)){o.shield=Math.max(o.shield,sc(u,420,45,1.1,1));o.shieldT=5;heal(o,sc(u,150,20,.4,1));fxShield(o,'#fff2a8');}}],
 zoltar:[(u,a)=>{skillshot(u,a.dir,{range:11,spd:30,w:.8,col:'#8be9ff',size:.38,shape:'arrow',dmg:sc(u,230,30,.9,1),stop:true,onHit:o=>slow(o,.4,2)});},
         (u,a)=>{const p=clampPt(u,a.pt,9);bolt(p.x,p.z);aoe(u,p.x,p.z,2.4,sc(u,200,28,.8,1),'mag',.35,o=>stun(o,.7),'#bfe9ff');},
         (u,a)=>{const p=clampPt(u,a.pt,10),v=sc(u,90,12,.3,1);const f=fxField(p.x,p.z,6,'#bfe9ff',3);for(let i=0;i<6;i++)M.timers.push({at:M.time+i*.5,fn:()=>{for(const o of enemiesIn(u,p.x,p.z,6)){hurt(u,o,v,'mag');slow(o,.6,.8);}}});}],
 thorn:[(u,a)=>{skillshot(u,a.dir,{range:7,spd:40,w:1,col:'#ff8a5b',size:.3,shape:'arrow',dmg:sc(u,190,26,1),type:'phys',pierce:true});u.atkT=.001;},
        (u,a)=>{skillshot(u,a.dir,{range:10,spd:30,w:.8,col:'#cfcfcf',size:.3,dmg:sc(u,120,18,.5),type:'phys',stop:true,chain:true,onHit:o=>{if(o.kind==='hero'||o.kind==='minion'){const d=dist(u,o),k=Math.max(0,d-1.6)/d;o.pull={x:o.x-(o.x-u.x)*k,z:o.z-(o.z-u.z)*k,t:.25};stun(o,.5);}}});},
        (u,a)=>{addBuff(u,{dur:6,atk:.4,ls:.25,sp:1,tag:'rage'});fxRing(u.x,u.z,2.5,'#ff3b30',.5);u.model.g.scale.setScalar(1.15);M.timers.push({at:M.time+6,fn:()=>u.model.g.scale.setScalar(u.def.big||1)});}]
};
function clampPt(u,p,r){const dx=p.x-u.x,dz=p.z-u.z,d=hyp(dx,dz);if(d<=r)return{x:p.x,z:p.z};return{x:u.x+dx/d*r,z:u.z+dz/d*r};}
function skillReady(u,i){return u.cd[i]<=0&&(i<2||u.lv>=4)&&!u.dead&&u.stunT<=0;}
function castSkill(u,i,aim){if(!skillReady(u,i))return false;const s=u.def.sk[i];aim=resolveAim(u,s,aim);if(!aim)return false;
  u.recallT=0;u.face=aim.dir?Math.atan2(aim.dir.x,aim.dir.z):u.face;u.castT=.35;SK[u.def.id][i](u,aim);u.cd[i]=s.cd*(1-u.cdr);if(u.isPlayer)sfx('cast');return true;}
function resolveAim(u,s,aim){aim=aim||{};let tgt=aim.tgt||nearestEnemy(u,(s.r||6)+2,o=>o.kind==='hero')||(s.k!=='target'?nearestEnemy(u,(s.r||6),o=>o.kind!=='tower'&&o.kind!=='core'):null);
  if(s.k==='target'){if(!tgt||tgt.kind!=='hero'||dist(u,tgt)>s.r+1)return null;return{tgt,dir:norm(tgt.x-u.x,tgt.z-u.z),pt:{x:tgt.x,z:tgt.z}};}
  let dir=aim.dir,pt=aim.pt;
  if(!dir&&pt)dir=norm(pt.x-u.x,pt.z-u.z);
  if(!dir){if(tgt){const lead=tgt.mv>.2?.25:0;pt={x:tgt.x+Math.sin(tgt.face)*tgt.sp*lead,z:tgt.z+Math.cos(tgt.face)*tgt.sp*lead};dir=norm(pt.x-u.x,pt.z-u.z);}else dir={x:Math.sin(u.face),z:Math.cos(u.face)};}
  if(!pt)pt=tgt?{x:tgt.x,z:tgt.z}:{x:u.x+dir.x*Math.min(5,s.r||5),z:u.z+dir.z*Math.min(5,s.r||5)};return{dir,pt,tgt};}
function norm(x,z){const l=hyp(x,z)||1;return{x:x/l,z:z/l};}
function flash(u,dir){if(u.flashCd>0||u.dead||u.stunT>0)return;fxPuff(u,'#fff6b0');let x=u.x+dir.x*5.5,z=u.z+dir.z*5.5;for(const o of OB){const d=hyp(x-o.x,z-o.z);if(d<o.r+u.r){x=o.x+(x-o.x)/d*(o.r+u.r+.1);z=o.z+(z-o.z)/d*(o.r+u.r+.1);}}
  u.x=clamp(x,-MH+3,MH-3);u.z=clamp(z,-MH+3,MH-3);fxPuff(u,'#fff6b0');u.flashCd=90;u.recallT=0;if(u.isPlayer)sfx('cast');}
function startRecall(u){if(u.dead||u.recallT>0)return;u.recallT=4;u.recallFx=fxRecall(u);}

/* ---------------- movement and collisions ---------------- */
function moveTo(u,x,z,dt,stopAt){if(u.stunT>0)return false;const dx=x-u.x,dz=z-u.z,d=hyp(dx,dz);if(d<(stopAt||.15)){u.mv=0;return true;}
  let sp=u.sp*(u.slowT>0?1-u.slowP:1)*(u.recallT>0?0:1);let vx=dx/d,vz=dz/d;
  // steer around rocks ahead
  for(const o of OB){const ox=o.x-u.x,oz=o.z-u.z,along=ox*vx+oz*vz;if(along<0||along>3+o.r)continue;const perp=ox*vz-oz*vx,R=o.r+u.r+.3;if(Math.abs(perp)<R){const s=perp>0?-1:1;const k=(R-Math.abs(perp))/R;vx+=vz*s*k*1.6;vz+=-vx*s*k*1.6;const l=hyp(vx,vz)||1;vx/=l;vz/=l;}}
  const st=Math.min(d,sp*dt);u.x+=vx*st;u.z+=vz*st;u.face=turn(u.face,Math.atan2(vx,vz),dt*12);u.mv=1;return d<=st+(stopAt||.15);}
function turn(a,b,k){let d=((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI;return a+clamp(d,-k,k);}
function collide(){const U=M.units;for(let i=0;i<U.length;i++){const a=U[i];if(!alive(a)||a.kind==='tower'||a.kind==='core'||a.leap)continue;
    for(const o of OB){const dx=a.x-o.x,dz=a.z-o.z,d=hyp(dx,dz),R=o.r+a.r;if(d<R&&d>1e-4){a.x=o.x+dx/d*R;a.z=o.z+dz/d*R;}}
    for(let j=i+1;j<U.length;j++){const b=U[j];if(!alive(b)||b.leap)continue;const dx=a.x-b.x,dz=a.z-b.z;if(Math.abs(dx)>4||Math.abs(dz)>4)continue;const d=hyp(dx,dz),R=a.r+b.r;if(d<R&&d>1e-4){const push=(R-d);
        const fa=(b.kind==='tower'||b.kind==='core')?1:a.kind==='hero'&&b.kind==='minion'?.2:a.kind==='minion'&&b.kind==='hero'?.8:.5;const fb=1-fa;
        a.x+=dx/d*push*fa;a.z+=dz/d*push*fa;if(b.kind!=='tower'&&b.kind!=='core'){b.x-=dx/d*push*fb;b.z-=dz/d*push*fb;}}}
    a.x=clamp(a.x,-MH+2,MH-2);a.z=clamp(a.z,-MH+2,MH-2);}}
/* ---------------- per-unit logic ---------------- */
function enemyTowerNear(u,x,z,pad){for(const o of M.units)if((o.kind==='tower'||o.kind==='core')&&alive(o)&&o.team!==u.team&&hyp(o.x-x,o.z-z)<o.rng+(pad||1))return o;return null;}
function towerTargetOf(t){return t.cur&&alive(t.cur)?t.cur:null;}
function minionLogic(u,dt){// pick a target: enemy near, prefer whoever attacks allied heroes
  if(!u.tgt||!alive(u.tgt)||!targetable(u.tgt,u)||dist(u,u.tgt)>9||(M.time-(u.tgtT||0))>3){u.tgt=null;let bd=1e9;
    for(const o of M.units){if(!targetable(o,u)||o.kind==='monster')continue;let d=dist(u,o)-o.r;if(d>7)continue;if(o.kind==='hero'){const atkAlly=o.lastHitHero&&M.time-o.lastHitHero<2;d+=atkAlly?-3:3;}if(o.kind==='tower'||o.kind==='core')d+=1.5;if(d<bd){bd=d;u.tgt=o;}}u.tgtT=M.time;}
  if(u.tgt){const d=dist(u,u.tgt)-u.tgt.r-u.r;if(d>u.rng)moveTo(u,u.tgt.x,u.tgt.z,dt,0);else{u.mv=0;tryAttack(u,u.tgt);}return;}
  const P=u.path;let w=P[Math.min(u.wp,P.length-1)];if(hyp(w.x-u.x,w.z-u.z)<3&&u.wp<P.length-1){u.wp++;w=P[u.wp];}moveTo(u,w.x,w.z,dt);}
function towerLogic(u,dt){let t=u.cur;
  if(t&&(!targetable(t,u)||dist(u,t)-t.r>u.rng))t=null;
  // switch to a hero that hurts an allied hero under the tower
  const agg=M.units.find(o=>o.kind==='hero'&&targetable(o,u)&&dist(u,o)-o.r<=u.rng&&o.lastHitHero&&M.time-o.lastHitHero<1.5&&o.lastHitHeroTeam===u.team);if(agg)t=agg;
  if(!t){let bd=1e9;for(const o of M.units){if(!targetable(o,u)||o.kind==='monster')continue;const d=dist(u,o)-o.r;if(d>u.rng)continue;const s=d+(o.kind==='hero'?20:0);if(s<bd){bd=s;t=o;}}}
  u.cur=t;if(t)tryAttack(u,t);if(u.model.cr){u.model.cr.rotation.y+=dt*1.5;u.model.cr.position.y=(u.kind==='core'?6.2:6.9)+Math.sin(M.time*2+u.id)*.15;}if(u.model.r1){u.model.r1.rotation.z+=dt*.8;u.model.r2.rotation.y+=dt*1.2;}}
function monsterLogic(u,dt){const D=MON[u.mk];let t=u.aggro;if(t&&(!alive(t)||t.dead||hyp(u.x-u.hx,u.z-u.hz)>12)){u.aggro=null;t=null;}
  if(t){const d=dist(u,t)-t.r-u.r;if(d>u.rng)moveTo(u,t.x,t.z,dt,0);else{u.mv=0;if(tryAttack(u,t)&&(u.mk==='dragon'||u.mk==='lord')&&Math.random()<.35){for(const o of M.units)if(o.kind==='hero'&&alive(o)&&dist(o,u)<5)hurt(u,o,u.atk*.6,'mag');fxRing(u.x,u.z,5,u.mk==='dragon'?'#ff7a2f':'#c06bff',.3,true);}}}
  else{if(hyp(u.x-u.hx,u.z-u.hz)>.5){moveTo(u,u.hx,u.hz,dt);u.hp=Math.min(u.maxHp,u.hp+u.maxHp*dt*.25);}else{u.mv=0;u.hp=Math.min(u.maxHp,u.hp+u.maxHp*dt*.05);}}
  // the whole camp fights together
  if(u.aggro&&u.camp)for(const o of u.camp.units)if(alive(o)&&!o.aggro)o.aggro=u.aggro;}
/* ---------------- bots ---------------- */
function frontPoint(u){const P=laneFor(u.team,u.lane==='sup'?'bot':u.lane==='jungle'?'mid':u.lane);let best=0;
  for(const o of M.units)if(o.kind==='minion'&&o.team===u.team&&alive(o)&&o.lane===(u.lane==='sup'?'bot':u.lane)){const pr=progressOn(P,o);if(pr>best)best=pr;}
  // own outer towers bound how far back we stay
  let t=Math.max(best-.03,.22);// stay a little behind the front minion
  if(best===0)t=.3;return lanePt(P,clamp(t,.05,.92));}
function progressOn(P,p){const tot=laneLen(P);let acc=0,best=0,bd=1e9;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],dx=b.x-a.x,dz=b.z-a.z,l=hyp(dx,dz),t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(l*l),0,1),d=hyp(p.x-a.x-dx*t,p.z-a.z-dz*t);if(d<bd){bd=d;best=(acc+t*l)/tot;}acc+=l;}return best;}
function botThink(u){const A=u.ai,hpP=u.hp/u.maxHp,f=FOUNT[u.team],diff=M.diff,smart=u.team===1?diff:Math.max(1,diff);
  const atBase=hyp(u.x-f.x,u.z-f.z)<9;
  // buy items whenever there is gold
  autoBuy(u);
  if(atBase&&hpP<.92){A.mode='heal';A.goal={x:f.x,z:f.z};return;}
  const foes=M.units.filter(o=>o.kind==='hero'&&targetable(o,u)&&dist(o,u)<11),friends=M.units.filter(o=>o.kind==='hero'&&alive(o)&&o.team===u.team&&dist(o,u)<12);
  const danger=foes.reduce((s,o)=>s+o.hp/o.maxHp+o.lv/12,0),power=friends.reduce((s,o)=>s+o.hp/o.maxHp+o.lv/12,0);
  if(hpP<(.22+(danger>power?.12:0))||A.mode==='retreat'&&hpP<.7){A.mode='retreat';if(!foes.length&&!enemyTowerNear(u,u.x,u.z,2)&&u.recallT<=0&&!atBase){startRecall(u);return;}A.goal={x:f.x,z:f.z};return;}
  // pick a hero fight
  let tgt=null,bs=1e9;for(const o of foes){const under=enemyTowerNear(u,o.x,o.z,0);const low=o.hp/o.maxHp<.25;if(under&&!(low&&hpP>.5&&smart>=2))continue;const s=o.hp/o.maxHp*10+dist(u,o);if(s<bs){bs=s;tgt=o;}}
  if(tgt&&(power>=danger*.9||tgt.hp/tgt.maxHp<.3||u.def.role==='assassin'&&tgt.hp/tgt.maxHp<.5)){A.mode='fight';A.tgt=tgt;return;}
  // jungle route
  if(u.lane==='jungle'&&M.time<540){const cs=M.camps.filter(c=>(c.side===u.team||(c.side===2&&M.time>300&&u.lv>=6))&&c.units&&c.units.some(x=>alive(x)));
    if(cs.length){cs.sort((a,b)=>hyp(a.x-u.x,a.z-u.z)-hyp(b.x-u.x,b.z-u.z));const c=cs[0];const m=c.units.find(x=>alive(x));A.mode='farm';A.tgt=m;return;}}
  // support sticks with the marksman
  if(u.lane==='sup'){const adc=M.units.find(o=>o.kind==='hero'&&o.team===u.team&&o.lane==='bot'&&alive(o));if(adc&&dist(u,adc)>5){A.mode='follow';A.goal={x:adc.x+rnd(-1.5,1.5),z:adc.z+rnd(-1.5,1.5)};return;}}
  // lane: kill minions / tower, else walk to the front
  const m=nearestEnemy(u,u.rng+5,o=>o.kind==='minion'&&!enemyTowerNear(u,o.x,o.z,-.5));
  if(m){A.mode='farm';A.tgt=m;return;}
  const tw=nearestEnemy(u,u.rng+6,o=>o.kind==='tower'||o.kind==='core');
  if(tw){const tankers=M.units.some(o=>o.kind==='minion'&&o.team===u.team&&alive(o)&&dist(o,tw)<tw.rng);if(tankers||tw.cur&&tw.cur.kind==='minion'){A.mode='siege';A.tgt=tw;return;}}
  if(M.time>720&&u.lane!=='jungle')u.lane2='mid';
  A.mode='lane';A.goal=frontPoint(u.lane2?{team:u.team,lane:'mid'}:u);}
function botAct(u,dt){const A=u.ai;if(u.recallT>0){u.mv=0;return;}
  if(A.mode==='heal'||A.mode==='retreat'||A.mode==='follow'||A.mode==='lane'){if(A.goal)moveTo(u,A.goal.x,A.goal.z,dt,A.mode==='lane'?1:.5);
    if(A.mode==='lane'){const m=nearestEnemy(u,u.rng,o=>o.kind!=='tower'&&o.kind!=='core');if(m&&!enemyTowerNear(u,m.x,m.z,-.5))tryAttack(u,m);}return;}
  const t=A.tgt;if(!t||!targetable(t,u)){A.mode='lane';return;}
  const d=dist(u,t)-t.r-u.r;
  // skills
  if(A.mode==='fight'||(A.mode==='farm'&&(t.kind==='monster'||Math.random()<.02))){for(let i=2;i>=0;i--){if(!skillReady(u,i))continue;const s=u.def.sk[i];
      const support=u.def.id==='lumi'&&i>0,selfBuff=s.k==='self'&&!s.r;
      if(support){const hurtAlly=M.units.some(o=>o.kind==='hero'&&o.team===u.team&&alive(o)&&dist(o,u)<(i===2?13:7.5)&&o.hp/o.maxHp<(i===2?.45:.7));if(hurtAlly&&(A.mode==='fight'||i===1))castSkill(u,i,{});continue;}
      if(i===2&&A.mode!=='fight'&&t.kind!=='monster')continue;
      if(i===2&&t.kind==='monster'&&!(t.mk==='dragon'||t.mk==='lord'))continue;
      const inR=selfBuff||(s.k==='self'?d<s.r:d<(s.r||6)-.5);
      if(inR&&Math.random()<(M.diff>=2||u.team===0?.9:.55)){castSkill(u,i,{tgt:t,pt:{x:t.x,z:t.z},dir:norm(t.x-u.x,t.z-u.z)});break;}}}
  if(d>u.rng){// approach but don't walk into a tower unless diving a low target
    const under=enemyTowerNear(u,t.x,t.z,0);if(under&&A.mode!=='siege'&&!(t.kind==='hero'&&t.hp/t.maxHp<.25)){A.mode='lane';return;}
    moveTo(u,t.x,t.z,dt,0);}else{u.mv=0;tryAttack(u,t);}}
function autoBuy(u){const list=BUILD[u.def.role];for(const id of list){if(u.items.includes(id))continue;const it=IMAP[id];if(u.gold>=it.p&&u.items.length<6){u.gold-=it.p;u.items.push(id);recalc(u);if(u.isPlayer){sfx('buy');announce(L('Đã mua ','Bought ')+it.n,'#ffd54a',1.2);}}return;}}
/* ---------------- hero update (status, movement, player input) ---------------- */
function heroUpdate(u,dt){if(u.dead){u.respawnT-=dt;if(u.respawnT<=0)respawnHero(u);return;}
  for(let i=0;i<3;i++)u.cd[i]=Math.max(0,u.cd[i]-dt);u.flashCd=Math.max(0,u.flashCd-dt);
  let ch=false;u.buffs=u.buffs.filter(b=>{b.t-=dt;if(b.t<=0){ch=true;return false;}return true;});if(ch)recalc(u);
  if(u.shieldT>0){u.shieldT-=dt;if(u.shieldT<=0)u.shield=0;}
  if(u.hiddenT>0)u.hiddenT-=dt;
  // regen, fountain
  const f=FOUNT[u.team];if(hyp(u.x-f.x,u.z-f.z)<8){u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.12*dt);}else if(M.time-u.lastHurt>6)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.008*dt);
  giveGoldPassive(u,dt);
  if(u.recallT>0){u.recallT-=dt;if(u.recallT<=0){fxPuff(u,TEAMC[u.team]);u.x=f.x+rnd(-1,1);u.z=f.z+rnd(-1,1);fxPuff(u,TEAMC[u.team]);if(u.isPlayer)sfx('lvl');}}
  if(u.leap){const L2=u.leap;L2.t+=dt/L2.d;const k=Math.min(1,L2.t);u.x=lerp(L2.x0,L2.x1,k);u.z=lerp(L2.z0,L2.z1,k);u.y=Math.sin(k*Math.PI)*3.5;u.mv=0;if(k>=1){u.leap=null;u.y=0;}return;}
  if(u.dash){const D=u.dash,s=Math.min(dt,D.t);u.x+=D.vx*s;u.z+=D.vz*s;D.t-=s;u.mv=1;if(D.onHit)for(const o of enemiesIn(u,u.x,u.z,1.4)){if(!D.hit.has(o.id)){D.hit.add(o.id);D.onHit(o);}}if(D.t<=0){u.dash=null;D.onEnd&&D.onEnd();}return;}
  if(u.pull){const p=u.pull;u.x=lerp(u.x,p.x,Math.min(1,dt*12));u.z=lerp(u.z,p.z,Math.min(1,dt*12));p.t-=dt;if(p.t<=0)u.pull=null;return;}
  if(u.stunT>0){u.stunT-=dt;u.mv=0;return;}
  if(u.slowT>0)u.slowT-=dt;
  if(u.isPlayer)playerControl(u,dt);else{u.ai.t-=dt;if(u.ai.t<=0){u.ai.t=M.diff===1&&u.team===1?.4:.22;botThink(u);}botAct(u,dt);}}
function giveGoldPassive(u,dt){if(M.time>15)u.gold+=dt*2.6;}
/* ---------------- main step ---------------- */
function step(dt){if(!M||M.over&&M.overT>4)return;M.time+=dt;
  // timers
  for(let i=M.timers.length-1;i>=0;i--){const t=M.timers[i];if(M.time>=t.at){M.timers.splice(i,1);try{t.fn();}catch(e){console.warn(e);}}}
  if(M.over){M.overT+=dt;return;}
  if(M.time>=M.nextWave){spawnWave();M.nextWave+=27;}
  for(const c of M.camps)if(c.nextAt!=null&&M.time>=c.nextAt){c.nextAt=null;for(const u of c.units||[])if(u.model)u.gone=true;spawnCamp(c);}
  for(const u of M.units){if(u.gone)continue;if(u.dead){if(u.kind==='hero')heroUpdate(u,dt);continue;}
    u.atkCd=Math.max(0,u.atkCd-dt);if(u.atkT>0){u.atkT+=dt*(u.kind==='hero'?u.as*1.6:2);if(u.atkT>1)u.atkT=0;}if(u.castT>0)u.castT-=dt;
    if(u.kind==='hero')heroUpdate(u,dt);
    else if(u.kind==='minion'){if(u.stunT>0){u.stunT-=dt;u.mv=0;}else{if(u.slowT>0)u.slowT-=dt;if(u.pull){const p=u.pull;u.x=lerp(u.x,p.x,Math.min(1,dt*12));u.z=lerp(u.z,p.z,Math.min(1,dt*12));p.t-=dt;if(p.t<=0)u.pull=null;}else minionLogic(u,dt);}}
    else if(u.kind==='tower'||u.kind==='core')towerLogic(u,dt);
    else if(u.kind==='monster'){if(u.stunT>0){u.stunT-=dt;u.mv=0;}else{if(u.slowT>0)u.slowT-=dt;monsterLogic(u,dt);}}}
  // fountains kill intruders
  for(let t=0;t<2;t++){const f=FOUNT[t];for(const u of M.units)if(u.kind==='hero'&&alive(u)&&u.team!==t&&hyp(u.x-f.x,u.z-f.z)<9)hurt(null,u,1500*dt,'true');}
  collide();
  // projectiles
  for(let i=M.proj.length-1;i>=0;i--){const p=M.proj[i];let done=false;
    if(p.target){const t=p.target;if(!alive(t)){done=true;}else{const ty=(t.kind==='tower'?3:t.kind==='core'?4:1.1),dx=t.x-p.mesh.position.x,dz=t.z-p.mesh.position.z,dy=ty-p.mesh.position.y,d=Math.hypot(dx,dy,dz),s=p.spd*dt;
        if(d<=s+.3){hurt(p.src,t,p.dmg,p.type,{crit:p.crit});if(p.src.kind==='hero'&&t.kind==='hero'){p.src.lastHitHero=M.time;p.src.lastHitHeroTeam=t.team;}done=true;}else{p.mesh.position.x+=dx/d*s;p.mesh.position.z+=dz/d*s;p.mesh.position.y+=dy/d*s;}}}
    else{const s=p.spd*dt;p.mesh.position.x+=p.dir.x*s;p.mesh.position.z+=p.dir.z*s;p.travel+=s;
      for(const o of M.units){if(!targetable(o,p.src)||p.hit.has(o.id)||o.kind==='tower'||o.kind==='core')continue;if(hyp(o.x-p.mesh.position.x,o.z-p.mesh.position.z)<o.r+p.w){p.hit.add(o.id);
          let dmg=p.dmg;if(p.heroFall&&o.kind!=='hero')dmg*=.5;if(dmg>0)hurt(p.src,o,dmg,p.type);if(o.kind==='hero'){p.src.lastHitHero=M.time;p.src.lastHitHeroTeam=o.team;}p.onHit&&p.onHit(o,p);fxHit(p.mesh.position.x,p.mesh.position.z,p.col);if(p.stop&&!p.pierce){done=true;break;}}}
      if(p.travel>=p.range){done=true;p.onEnd&&p.onEnd(p);}}
    if(done){scene.remove(p.mesh);M.proj.splice(i,1);}}
  // remove dead minions and monsters after a moment
  for(let i=M.units.length-1;i>=0;i--){const u=M.units[i];if((u.removeAt&&M.time>=u.removeAt)||(u.gone&&u.model)){scene.remove(u.model.g);if(u.hb)u.hb.remove();M.units.splice(i,1);}}
  fxUpdate(dt);}
/* ---------------- sync models ---------------- */
function syncModels(dt){for(const u of M.units){const g=u.model&&u.model.g;if(!g)continue;
    if(u.kind==='tower'||u.kind==='core')continue;
    if(u.dead){if(u.kind==='hero'){g.rotation.z=Math.min(Math.PI/2,(g.rotation.z||0)+dt*4);g.position.y=Math.max(-.3,g.position.y-dt*.4);if(u.respawnT<u.respawnT0-1.5)g.visible=false;}else{g.rotation.z=Math.min(Math.PI/2,g.rotation.z+dt*5);g.position.y-=dt*.8;}continue;}
    g.position.set(u.x,u.y||0,u.z);g.rotation.set(0,u.face,0);
    if(u.kind==='hero'){poseHuman(u.model,dt,{mv:u.mv,atk:u.atkT,ranged:!u.melee,cast:u.castT>0?1:0});g.visible=!(u.hiddenT>0&&u.team===1&&!u.isPlayer)||dist(u,M.me)<4;
}
    else if(u.kind==='minion')poseMinion(u.model,dt,{mv:u.mv,atk:u.atkT});
    else if(u.kind==='monster'){u.model.ph+=dt*(u.mv?8:1.5);u.model.body.position.y=Math.abs(Math.sin(u.model.ph))*(u.mv?.15:.05);if(u.atkT>0)u.model.body.rotation.x=Math.sin(u.atkT*Math.PI)*.35;else u.model.body.rotation.x=0;}}}

/* ---------------- visual effects ---------------- */
const FXL=[];
function fxAdd(o){FXL.push(o);scene.add(o.obj);return o;}
function fxRing(x,z,r,col,dur,tele){const m=new T.Mesh(new T.RingGeometry(r*.86,r,48),new T.MeshBasicMaterial({color:new T.Color(col),transparent:true,opacity:tele?.55:.9,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));
  m.rotation.x=-Math.PI/2;m.position.set(x,.08,z);if(tele){const fillM=new T.Mesh(new T.CircleGeometry(r,48),new T.MeshBasicMaterial({color:new T.Color(col),transparent:true,opacity:.18,depthWrite:false}));fillM.position.z=-.01;m.add(fillM);}
  return fxAdd({obj:m,t:0,d:Math.max(.25,dur||.35),up:(o,k)=>{if(!tele)m.scale.setScalar(.4+k*.7);m.material.opacity=(tele?.6:.9)*(1-k*k);}});}
function fxBoom(x,z,r,col){const g=new T.Group();g.position.set(x,0,z);const s=glowSprite(col,r*3,1);s.position.y=1;g.add(s);
  const n=MOBILE?8:16;const parts=[];for(let i=0;i<n;i++){const p=new T.Mesh(new T.OctahedronGeometry(.18),new T.MeshBasicMaterial({color:new T.Color(col),transparent:true}));const a=Math.random()*TAU,sp=3+Math.random()*6;p.userData.v=[Math.cos(a)*sp,4+Math.random()*6,Math.sin(a)*sp];p.position.y=.6;g.add(p);parts.push(p);}
  fxRing(x,z,r,col,.45);return fxAdd({obj:g,t:0,d:.7,up:(o,k,dt)=>{s.material.opacity=1-k;s.scale.setScalar(r*3*(1+k));for(const p of parts){p.position.x+=p.userData.v[0]*dt;p.position.y+=p.userData.v[1]*dt;p.position.z+=p.userData.v[2]*dt;p.userData.v[1]-=18*dt;p.material.opacity=1-k;}}});}
function fxHit(x,z,col){const s=glowSprite(col,1.6,1);s.position.set(x,1.2,z);fxAdd({obj:s,t:0,d:.25,up:(o,k)=>{s.material.opacity=1-k;s.scale.setScalar(1.6+k*2);}});}
function fxSlash(u,t,col){const m=new T.Mesh(new T.TorusGeometry(1.1,.07,6,20,Math.PI*.9),new T.MeshBasicMaterial({color:new T.Color(col||u.def.acc||'#fff'),transparent:true,blending:T.AdditiveBlending,depthWrite:false}));
  m.position.set((u.x+t.x)/2,1.3,(u.z+t.z)/2);m.rotation.set(Math.PI/2,0,u.face+Math.random());fxAdd({obj:m,t:0,d:.22,up:(o,k)=>{m.material.opacity=1-k;m.scale.setScalar(1+k*.6);}});}
function fxSpin(u,r,col){const m=new T.Mesh(new T.TorusGeometry(r*.8,.12,6,40),new T.MeshBasicMaterial({color:new T.Color(col),transparent:true,blending:T.AdditiveBlending,depthWrite:false}));m.rotation.x=Math.PI/2;m.position.set(u.x,1.1,u.z);
  fxAdd({obj:m,t:0,d:.35,up:(o,k)=>{m.rotation.z+=.6;m.material.opacity=1-k;m.scale.setScalar(.7+k*.4);}});}
function fxShield(u,col){const m=new T.Mesh(new T.SphereGeometry(1.25,20,14),new T.MeshBasicMaterial({color:new T.Color(col),transparent:true,opacity:.3,blending:T.AdditiveBlending,depthWrite:false}));
  fxAdd({obj:m,t:0,d:3,up:(o,k)=>{m.position.set(u.x,1.1,u.z);m.material.opacity=u.shield>0&&!u.dead?.28*(1-k*.5):0;}});}
function fxPuff(u,col){fxBoom(u.x,u.z,1.4,col);}
function fxStun(u,d){const g=new T.Group();for(let i=0;i<3;i++){const s=new T.Mesh(new T.OctahedronGeometry(.13),new T.MeshBasicMaterial({color:0xffe066}));g.add(s);}
  fxAdd({obj:g,t:0,d,up:(o,k)=>{g.position.set(u.x,(u.kind==='hero'?2.7:1.8)*(u.def&&u.def.big||1),u.z);g.children.forEach((s,i)=>{const a=M.time*6+i*2.09;s.position.set(Math.cos(a)*.5,0,Math.sin(a)*.5);});g.visible=!u.dead;}});}
function fxRecall(u){const m=new T.Mesh(new T.CylinderGeometry(1,1,3,24,1,true),new T.MeshBasicMaterial({color:new T.Color(TEAMC[u.team]),transparent:true,opacity:.35,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false}));
  return fxAdd({obj:m,t:0,d:4.05,up:(o,k)=>{m.position.set(u.x,1.5,u.z);m.visible=u.recallT>0;m.scale.set(1,.3+k,1);if(u.recallT<=0)o.t=o.d;}});}
function meteor(x,z){const m=new T.Mesh(new T.IcosahedronGeometry(.7,0),new T.MeshBasicMaterial({color:0xff6a1a}));const s=glowSprite('#ff7a2f',4,1);m.add(s);
  fxAdd({obj:m,t:0,d:.45,up:(o,k)=>{m.position.set(x+(1-k)*6,14*(1-k)+.5,z-(1-k)*4);}});}
function bolt(x,z){const pts=[];let px=x,pz=z;for(let y=16;y>=0;y-=2){pts.push(new T.Vector3(px+rnd(-.6,.6),y,pz+rnd(-.6,.6)));}const l=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0xd8f6ff,transparent:true}));
  fxAdd({obj:l,t:0,d:.3,up:(o,k)=>{l.material.opacity=1-k;}});}
function fxField(x,z,r,col,d){const m=new T.Mesh(new T.CircleGeometry(r,48),new T.MeshBasicMaterial({color:new T.Color(col),transparent:true,opacity:.28,depthWrite:false,blending:T.AdditiveBlending}));m.rotation.x=-Math.PI/2;m.position.set(x,.1,z);
  const g=new T.Group();g.add(m);const flakes=[];for(let i=0;i<(MOBILE?20:50);i++){const f=new T.Mesh(new T.OctahedronGeometry(.08),new T.MeshBasicMaterial({color:0xffffff}));f.position.set(x+rnd(-r,r),rnd(0,5),z+rnd(-r,r));g.add(f);flakes.push(f);}
  return fxAdd({obj:g,t:0,d,up:(o,k,dt)=>{for(const f of flakes){f.position.y-=dt*4;if(f.position.y<0)f.position.y=5;}m.material.opacity=.28*(1-k*k);}});}
function fxUpdate(dt){for(let i=FXL.length-1;i>=0;i--){const o=FXL[i];o.t+=dt;const k=Math.min(1,o.t/o.d);o.up(o,k,dt);if(k>=1){scene.remove(o.obj);FXL.splice(i,1);}}
  for(const r of FX.rings){r.material.opacity=.4+Math.sin(performance.now()/400)*.15;}
  waterTex.offset.x+=dt*.02;}
let shakeA=0;function shake(a){if(SET.shake)shakeA=Math.max(shakeA,a);}
/* ---------------- sound (tiny synth) ---------------- */
let AC=null;function sfx(k){if(SET.sfx<=0)return;try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);
  const P={hit:[180,90,.08,'square',.05],shoot:[620,300,.08,'triangle',.04],cast:[420,880,.18,'sawtooth',.04],kill:[520,1040,.35,'square',.06],die:[300,80,.6,'sawtooth',.06],lvl:[660,1320,.3,'triangle',.06],buy:[880,1320,.15,'sine',.06],tower:[120,40,.7,'sawtooth',.08],win:[523,1046,.8,'triangle',.08]}[k]||[440,440,.1,'sine',.04];
  o.type=P[3];o.frequency.setValueAtTime(P[0],t);o.frequency.exponentialRampToValueAtTime(P[1],t+P[2]);g.gain.setValueAtTime(P[4]*SET.sfx/80,t);g.gain.exponentialRampToValueAtTime(.0001,t+P[2]);o.start(t);o.stop(t+P[2]+.02);}catch(_){}}

/* ====================================================================
   HUD, input, camera
   ==================================================================== */
const CSS=`
.nl{position:absolute;inset:0;font-family:Inter,system-ui,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;pointer-events:none;overflow:hidden}
.nl *{box-sizing:border-box}.nl button{font-family:inherit;cursor:pointer}
.nl .pe{pointer-events:auto}
.nl-scr{position:absolute;inset:0;pointer-events:auto;display:flex;flex-direction:column}
.nl-gold{color:#ffd54a;font-weight:800}
.nl-btn{border:0;border-radius:12px;padding:12px 18px;font-weight:800;color:#1b1300;background:linear-gradient(180deg,#ffe27a,#f5b82e);box-shadow:0 4px 0 #a8741a,0 8px 18px rgba(0,0,0,.35);letter-spacing:.02em}
.nl-btn:active{transform:translateY(2px);box-shadow:0 2px 0 #a8741a}
.nl-btn.blue{color:#fff;background:linear-gradient(180deg,#4fa3ff,#1f62d6);box-shadow:0 4px 0 #123c88,0 8px 18px rgba(0,0,0,.35)}
.nl-btn.ghost{color:#e9eefb;background:rgba(20,28,48,.75);box-shadow:inset 0 0 0 1px rgba(160,190,255,.35)}
.nl-panel{background:linear-gradient(180deg,rgba(18,26,46,.92),rgba(10,14,28,.94));border:1px solid rgba(140,170,255,.25);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.nl-lob-top{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:linear-gradient(180deg,rgba(5,10,25,.85),rgba(5,10,25,0))}
.nl-me{display:flex;gap:10px;align-items:center}.nl-me .av{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#4fa3ff,#8f5bff);display:grid;place-items:center;font-weight:900;font-size:20px;border:2px solid #ffd54a}
.nl-xp{width:120px;height:6px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden;margin-top:4px}.nl-xp i{display:block;height:100%;background:linear-gradient(90deg,#7df9ff,#4fa3ff)}
.nl-cur{display:flex;gap:10px}.nl-cur span{background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:6px 12px;font-weight:700;font-size:14px}
.nl-lob-main{flex:1;display:grid;grid-template-columns:220px 1fr 260px;gap:14px;padding:6px 18px 18px;min-height:0}
.nl-side{display:flex;flex-direction:column;gap:10px;justify-content:center}
.nl-side button{text-align:left;font-size:15px}
.nl-hero-name{align-self:end;text-align:center;padding-bottom:10px;text-shadow:0 4px 18px rgba(0,0,0,.8)}
.nl-hero-name h2{margin:0;font:900 44px/1 Inter,sans-serif;letter-spacing:.04em}.nl-hero-name p{margin:6px 0 0;color:#cfe0ff;font-weight:600}
.nl-play{display:flex;flex-direction:column;gap:12px;justify-content:flex-end}
.nl-play .big{font-size:26px;padding:20px;border-radius:16px}
.nl-title{font:900 34px Inter,sans-serif;letter-spacing:.06em;text-align:center;margin:0;background:linear-gradient(180deg,#fff,#9fc6ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.nl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}
.nl-card{position:relative;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,.12);background:#101a30;cursor:pointer;aspect-ratio:3/4}
.nl-card img{width:100%;height:100%;object-fit:cover;display:block}.nl-card b{position:absolute;left:0;right:0;bottom:0;padding:6px;font-size:13px;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent)}
.nl-card .rl{position:absolute;top:6px;left:6px;font-size:10px;font-weight:800;background:rgba(0,0,0,.6);padding:2px 6px;border-radius:6px}
.nl-card.on{border-color:#ffd54a;box-shadow:0 0 0 3px rgba(255,213,74,.35)}.nl-card.taken{opacity:.35;pointer-events:none}
.nl-sel{flex:1;overflow:hidden;display:grid;grid-template-columns:230px 1fr 230px;gap:14px;padding:10px 18px 18px;min-height:0}
.nl-team{display:flex;flex-direction:column;gap:8px;overflow:auto;min-height:0}
.nl-slot{display:flex;gap:10px;align-items:center;padding:8px;border-radius:12px;background:rgba(20,40,80,.6);border:1px solid rgba(110,160,255,.25)}
.nl-slot.red{background:rgba(80,20,25,.6);border-color:rgba(255,120,120,.25)}.nl-slot.me{border-color:#ffd54a}
.nl-slot .pic{width:46px;height:46px;border-radius:10px;background:#0b1224 center/cover;flex:none;display:grid;place-items:center;font-weight:900;color:#5a6a8a}
.nl-slot small{display:block;color:#a9b8d8;font-size:11px}
.nl-info{padding:14px;display:flex;flex-direction:column;gap:8px;overflow:auto}
.nl-sk{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#cfd8ee}.nl-sk i{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-style:normal;font-weight:900;background:linear-gradient(135deg,#2a3c66,#1a2440);border:1px solid rgba(255,255,255,.2)}
.nl-bars{display:grid;grid-template-columns:70px 1fr;gap:4px 8px;font-size:12px;color:#a9b8d8;align-items:center}.nl-bars span i{display:block;height:6px;border-radius:4px;background:linear-gradient(90deg,#4fa3ff,#7df9ff)}
.nl-load{flex:1;display:flex;flex-direction:column;justify-content:center;gap:24px;padding:20px;background:radial-gradient(circle at 50% 50%,#1a2a55,#060912)}
.nl-lrow{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.nl-lc{width:clamp(92px,15vw,150px);border-radius:12px;overflow:hidden;background:#0d1426;border:2px solid #2d5bd6;text-align:center}.nl-lc.red{border-color:#d63a3a}
.nl-lc img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}.nl-lc b{display:block;padding:6px 4px 2px;font-size:13px}.nl-lc small{display:block;color:#9fb0d0;font-size:11px;padding-bottom:4px}.nl-lc .pr{height:4px;background:#1b2440}.nl-lc .pr i{display:block;height:100%;background:#7df9ff;width:0}
.nl-vs{text-align:center;font:900 40px Inter;color:#ffd54a;text-shadow:0 0 30px rgba(255,213,74,.5)}
/* in-match HUD */
.nl-mm{position:absolute;left:8px;top:8px;width:min(30vw,170px);aspect-ratio:1;border-radius:12px;border:2px solid rgba(255,255,255,.25);background:#1d3320;overflow:hidden;pointer-events:auto}
.nl-mm canvas{width:100%;height:100%;display:block}
.nl-me2{position:absolute;left:calc(min(30vw,170px) + 16px);top:8px;display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.5);border-radius:12px;padding:6px 10px;font-size:12px}
.nl-me2 img{width:38px;height:38px;border-radius:8px;object-fit:cover}.nl-me2 .lv{font-weight:900;color:#ffd54a}
.nl-score{position:absolute;left:50%;top:6px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;background:rgba(0,0,0,.55);border-radius:12px;padding:6px 14px;font-weight:900;font-size:18px}
.nl-score .b{color:#6fb6ff}.nl-score .r{color:#ff6b6b}.nl-score .tm{font-size:13px;color:#ddd;font-weight:700;min-width:44px;text-align:center}
.nl-tr{position:absolute;right:8px;top:8px;display:flex;gap:6px}.nl-tr button{pointer-events:auto;width:40px;height:40px;border-radius:12px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:18px}
.nl-feed{position:absolute;right:8px;top:56px;display:flex;flex-direction:column;gap:4px;align-items:flex-end}
.nl-feed div{background:rgba(0,0,0,.55);border-radius:8px;padding:4px 8px;font-size:12px;font-weight:700;animation:nlf 5s forwards}
@keyframes nlf{0%{opacity:0;transform:translateX(20px)}8%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}
.nl-ann{position:absolute;left:50%;top:22%;transform:translateX(-50%);font:900 clamp(20px,4vw,38px) Inter,sans-serif;letter-spacing:.04em;text-shadow:0 3px 0 rgba(0,0,0,.6),0 0 24px currentColor;white-space:nowrap;opacity:0;transition:opacity .25s}
.nl-pad{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));width:300px;height:280px}
.nl-pad button{position:absolute;pointer-events:auto;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:radial-gradient(circle at 35% 30%,rgba(90,120,190,.95),rgba(20,30,60,.95));color:#fff;font-weight:900;touch-action:none;overflow:hidden}
.nl-pad .atk{right:10px;bottom:10px;width:104px;height:104px;font-size:34px;background:radial-gradient(circle at 35% 30%,#ffb34d,#b8540f);border-color:rgba(255,230,180,.6)}
.nl-pad .s{width:70px;height:70px;font-size:22px}
.nl-pad .s0{right:128px;bottom:8px}.nl-pad .s1{right:112px;bottom:92px}.nl-pad .s2{right:34px;bottom:130px;width:78px;height:78px}
.nl-pad .fl{right:196px;bottom:6px;width:56px;height:56px;font-size:20px}.nl-pad .rc{right:200px;bottom:76px;width:48px;height:48px;font-size:18px}
.nl-pad .cd{position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(0,0,0,.7) var(--p,0%),transparent 0);display:grid;place-items:center;font-size:18px;font-weight:900}
.nl-pad .key{position:absolute;bottom:2px;left:0;right:0;font-size:10px;color:#cfe0ff;text-align:center}
.nl-pad .lock{filter:grayscale(1) brightness(.6)}
.nl-shopq{position:absolute;left:8px;top:calc(min(30vw,170px) + 18px);display:flex;flex-direction:column;gap:6px}
.nl-shopq button{pointer-events:auto;border:0;border-radius:12px;padding:6px 10px;background:rgba(0,0,0,.6);color:#fff;font-weight:800;font-size:13px;display:flex;gap:6px;align-items:center;min-width:120px}
.nl-shopq .ok{background:linear-gradient(180deg,#ffd54a,#e09a1a);color:#1b1300;animation:nlp 1s infinite alternate}@keyframes nlp{to{transform:scale(1.05)}}
.nl-joy{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.2);pointer-events:auto;touch-action:none}
.nl-joy i{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#9fb8e8);opacity:.85}
.nl-bars2{position:absolute;inset:0}
.nl-hb{position:absolute;transform:translate(-50%,-100%);pointer-events:none;text-align:center;white-space:nowrap}
.nl-hb .n{font-size:11px;font-weight:800;text-shadow:0 1px 2px #000;margin-bottom:1px}.nl-hb .n em{font-style:normal;background:#111;border-radius:4px;padding:0 4px;margin-right:3px;color:#ffd54a}
.nl-hb .bar{width:70px;height:8px;border-radius:3px;background:rgba(0,0,0,.7);border:1px solid rgba(0,0,0,.8);overflow:hidden;position:relative;margin:0 auto}
.nl-hb .bar i{position:absolute;left:0;top:0;bottom:0;background:#3ddc6a}.nl-hb .bar s{position:absolute;top:0;bottom:0;background:rgba(255,255,255,.8)}
.nl-hb.en .bar i{background:#ff4d4d}.nl-hb.al .bar i{background:#4fa3ff}.nl-hb.me .bar i{background:#3ddc6a}.nl-hb.sm .bar{width:38px;height:5px}.nl-hb.tw .bar{width:84px;height:8px}.nl-hb.mon .bar i{background:#e8b33a}
.nl-ft{position:absolute;font-weight:900;font-size:15px;text-shadow:0 2px 0 #000;pointer-events:none;animation:nlft .9s forwards;transform:translate(-50%,0)}.nl-ft.big{font-size:20px}
@keyframes nlft{0%{opacity:0;margin-top:0}15%{opacity:1}100%{opacity:0;margin-top:-46px}}
.nl-dead{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);text-align:center;font-weight:900;font-size:22px;text-shadow:0 2px 0 #000;display:none}
.nl-dead b{display:block;font-size:56px;color:#ffd54a}
.nl-ov{position:absolute;inset:0;background:rgba(3,6,14,.75);display:none;align-items:center;justify-content:center;pointer-events:auto;padding:14px}
.nl-ov .nl-panel{width:min(900px,100%);max-height:100%;overflow:auto;padding:16px}
.nl-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.nl-it{display:flex;gap:8px;align-items:center;padding:8px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);text-align:left;color:#fff}
.nl-it .e{font-size:24px}.nl-it small{display:block;color:#a9b8d8;font-size:11px}.nl-it.no{opacity:.45}.nl-it.own{border-color:#ffd54a}
.nl-tb{width:100%;border-collapse:collapse;font-size:13px}.nl-tb td{padding:6px;border-bottom:1px solid rgba(255,255,255,.08)}.nl-tb img{width:30px;height:30px;border-radius:6px;vertical-align:middle;object-fit:cover}
.nl-end{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;background:radial-gradient(circle at 50% 35%,rgba(30,60,130,.85),rgba(4,6,14,.95))}
.nl-end h1{margin:0;font:900 clamp(44px,9vw,90px) Inter,sans-serif;letter-spacing:.06em;text-shadow:0 0 40px currentColor}
@media (max-width:820px){.nl-lob-main{grid-template-columns:1fr;grid-template-rows:auto 1fr auto}.nl-side{flex-direction:row;flex-wrap:wrap;justify-content:center}.nl-sel{grid-template-columns:1fr;overflow:auto}.nl-team{flex-direction:row;overflow-x:auto}.nl-slot{min-width:150px}
  .nl-pad{transform:scale(.82);transform-origin:right bottom}.nl-me2{display:none}.nl-hero-name h2{font-size:32px}}
@media (pointer:fine){.nl-joy{display:none}}
.nl-tr button{border-radius:50%!important;border:2px solid rgba(255,255,255,.25)!important;background:radial-gradient(circle at 35% 30%,rgba(70,90,140,.9),rgba(10,16,34,.9))!important;box-shadow:0 2px 10px rgba(0,0,0,.4)}
.nl-gear{width:42px;height:42px;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:radial-gradient(circle at 35% 30%,rgba(70,90,140,.95),rgba(10,16,34,.95));color:#fff;font-size:20px;cursor:pointer}
.nl-fps{position:absolute;left:50%;top:44px;transform:translateX(-50%);font:700 11px Inter,sans-serif;color:#9fffa8;text-shadow:0 1px 2px #000}
.nl-hb .bar{position:relative}.nl-hb .hpn{position:absolute;inset:0;font:800 8px/1 Inter,sans-serif;color:#fff;text-align:center;display:flex;align-items:center;justify-content:center;text-shadow:0 0 2px #000}
.nl-set{position:absolute;inset:0;z-index:50;pointer-events:auto;background:rgba(2,5,14,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;color:#eef3ff}
.nl-set .box{width:min(760px,96vw);height:min(520px,92vh);display:grid;grid-template-columns:170px 1fr;grid-template-rows:auto 1fr auto;background:linear-gradient(160deg,rgba(22,30,58,.97),rgba(10,14,30,.97));border:1px solid rgba(140,170,255,.25);border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.nl-set .hd{grid-column:1/3;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08)}.nl-set .hd b{font-size:18px;letter-spacing:.08em}
.nl-set .tabs{display:flex;flex-direction:column;gap:4px;padding:10px;border-right:1px solid rgba(255,255,255,.08)}
.nl-set .tabs button{text-align:left;padding:10px 12px;border-radius:10px;border:0;background:transparent;color:#b9c6e6;font:700 14px Inter,sans-serif;cursor:pointer}.nl-set .tabs button.on{background:linear-gradient(90deg,#3d6bff,#6a4bff);color:#fff}
.nl-set .body{overflow:auto;padding:8px 16px}
.nl-set .row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06)}.nl-set .row>div:first-child{font-size:14px;font-weight:700}.nl-set .row small{display:block;font-weight:500;color:#8fa0c8;font-size:11px;margin-top:2px}
.nl-seg{display:flex;background:rgba(255,255,255,.06);border-radius:10px;padding:3px;gap:2px;flex-wrap:wrap;justify-content:flex-end}.nl-seg button{border:0;background:transparent;color:#c8d4f0;padding:7px 11px;border-radius:8px;font:700 12px Inter,sans-serif;cursor:pointer}.nl-seg button.on{background:#ffd54a;color:#1a1400}
.nl-tog{width:46px;height:26px;border-radius:13px;border:0;background:#3a4466;position:relative;cursor:pointer;flex:none}.nl-tog::after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s}.nl-tog.on{background:#38c76a}.nl-tog.on::after{left:23px}
.nl-rng{display:flex;align-items:center;gap:8px}.nl-rng input{width:min(220px,34vw);accent-color:#ffd54a}.nl-rng span{min-width:42px;text-align:right;font-weight:800;color:#ffd54a;font-size:13px}
.nl-set .ft{grid-column:1/3;display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid rgba(255,255,255,.08)}
@media (max-width:620px){.nl-set .box{grid-template-columns:1fr;grid-template-rows:auto auto 1fr auto}.nl-set .tabs{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.nl-set .tabs button{white-space:nowrap;padding:8px 10px;font-size:12px}.nl-set .hd,.nl-set .ft{grid-column:1}.nl-set .row{flex-direction:column;align-items:flex-start}}
`;
if(!document.getElementById('nl-css')){const st=document.createElement('style');st.id='nl-css';st.textContent=CSS;document.head.appendChild(st);}
const ui=document.createElement('div');ui.className='nl';hud.appendChild(ui);
const $=(s,r)=>(r||ui).querySelector(s);
const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* hero portraits rendered once with a little offscreen renderer */
const PORT={};
(function(){let r2=null;try{r2=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch(_){return;}
  r2.setSize(240,320,false);r2.outputEncoding=T.sRGBEncoding;r2.toneMapping=T.ACESFilmicToneMapping;
  const s=new T.Scene();s.add(new T.HemisphereLight(0xdfeaff,0x3a3050,1));const d=new T.DirectionalLight(0xffffff,1.3);d.position.set(2,4,5);s.add(d);const rim=new T.DirectionalLight(0x88aaff,.9);rim.position.set(-3,2,-4);s.add(rim);
  const c=new T.PerspectiveCamera(30,240/320,.1,50);
  for(const h of HEROES){const m=heroModel(h,0);m.ring.visible=false;poseHuman(m,0,{mv:0,atk:0});m.g.rotation.y=-.45;s.add(m.g);const H=(h.big||1)*2.3;c.position.set(0,H*.62,5.4*(h.big||1));c.lookAt(0,H*.5,0);
    const bg=new T.Color(h.col).multiplyScalar(.35);r2.setClearColor(bg,1);r2.render(s,c);PORT[h.id]=r2.domElement.toDataURL('image/png');s.remove(m.g);}
  r2.dispose();try{r2.forceContextLoss();}catch(_){}})();
const portrait=id=>PORT[id]||'';
/* ---------------- input ---------------- */
const keys=new Set();let mouseG=null,attackHeld=false,attackTapT=0,moveGoal=null,joy={x:0,z:0,on:false};
const ray=new T.Raycaster(),gplane=new T.Plane(new T.Vector3(0,1,0),0),_hit=new T.Vector3();
function groundAt(cx,cy){const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera({x:(cx-r.left)/r.width*2-1,y:-(cy-r.top)/r.height*2+1},camera);return ray.ray.intersectPlane(gplane,_hit)?{x:_hit.x,z:_hit.z}:null;}
function onKey(e,down){if(state!=='match'||setEl)return;const k=e.key.toLowerCase();if(down){if(['tab',' '].includes(k)||k.startsWith('arrow'))e.preventDefault();
    if(k==='escape')aimCancel();if(!keys.has(k)){const si={q:0,'1':0,e:1,'2':1,r:2,'3':2,f:3}[k];if(si!=null)skillDown(si,'key');if(k==='b')startRecall(M.me);if(k==='p')toggleShop();if(k==='tab')toggleBoard(true);if(k==='4')quickBuy();}
    keys.add(k);if(k===' '||k==='j')attackHeld=true;}else{keys.delete(k);{const si={q:0,'1':0,e:1,'2':1,r:2,'3':2,f:3}[k];if(si!=null)skillUp(si,'key');}if(k===' '||k==='j')attackHeld=false;if(k==='tab')toggleBoard(false);}}
const kd=e=>onKey(e,true),ku=e=>onKey(e,false);addEventListener('keydown',kd);addEventListener('keyup',ku);
renderer.domElement.addEventListener('mousemove',e=>{if(state==='match'){lastMouse={x:e.clientX,y:e.clientY};mouseG=groundAt(e.clientX,e.clientY);}});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('mousedown',e=>{if(state!=='match')return;const p=groundAt(e.clientX,e.clientY);if(!p)return;mouseG=p;
  if(AIM){if(e.button===0){aimTick();const i=AIM.i;AIM=null;releaseCast(i);}else aimCancel();return;}
  if(e.button===2||e.button===0){let t=null,bd=1.8;for(const o of M.units){if(!targetable(o,M.me))continue;const d=hyp(o.x-p.x,o.z-p.z)-o.r;if(d<bd){bd=d;t=o;}}
    if(t){M.me.lock=t;moveGoal=null;}else if(e.button===2){moveGoal=p;M.me.lock=null;fxRing(p.x,p.z,.6,'#7dff9a',.3);}}});
/* ---- skill aiming ----
   PC: hold Q/E/R/F to see the indicator follow the mouse, release to cast (or instant cast in settings).
       Clicking a skill button with the mouse arms it: left-click the ground to cast, right-click or Esc to cancel.
   Touch: drag from a skill button to aim, release to cast; a plain tap auto-targets. */
let AIM=null;
const skDef=i=>i===3?{k:'dir',r:5.5}:M.me.def.sk[i];
function skillDown(i,src){const u=M.me;if(!u||u.dead)return;const s=skDef(i);
  if(i<3&&i===2&&u.lv<4){floatText(u,L('Cấp 4 mở chiêu cuối','Ult unlocks at level 4'),'#ffd54a');return;}
  if(i<3&&u.cd[i]>0)return;if(i===3&&u.flashCd>0)return;
  if(AIM&&AIM.src==='click'&&AIM.i===i&&src==='click'){aimCancel();return;}
  if(s.k==='self'||SET.aim==='quick'&&src==='key'||!mouseG){releaseCast(i);return;}
  AIM={i,src};aimTick();}
function skillUp(i,src){if(AIM&&AIM.i===i&&AIM.src===src){aimTick();AIM=null;releaseCast(i);}}
function aimCancel(){AIM=null;aimHide();}
function releaseCast(i){if(i===3)playerFlash();else playerCast(i);aimHide();}
let lastMouse=null;
function aimTick(){if(!AIM||!M||!M.me)return;if(lastMouse){const p=groundAt(lastMouse.x,lastMouse.y);if(p)mouseG=p;}if(!mouseG)return;
  const u=M.me,s=skDef(AIM.i),R=s.r||6,dx=mouseG.x-u.x,dz=mouseG.z-u.z,l=hyp(dx,dz)||1;aimShow(u,AIM.i,dx/l,dz/l,l/R);}
function pickTarget(u,s,near){const R=(s.r||6)+1;let best=null,bv=1e9;for(const o of M.units){if(o.kind!=='hero'||!targetable(o,u)||dist(u,o)>R+o.r)continue;
    const v=near?hyp(o.x-near.x,o.z-near.z):SET.prio==='lowhp'?o.hp/o.maxHp*100+dist(u,o)*.5:dist(u,o);if(v<bv){bv=v;best=o;}}return best;}
function playerCast(i){const u=M.me;if(!u||u.dead)return;const s=u.def.sk[i];let aim={};
  if(MOBILE_AIM.i===i&&(MOBILE_AIM.dir||MOBILE_AIM.tgt)){aim={dir:MOBILE_AIM.dir,pt:MOBILE_AIM.pt,tgt:MOBILE_AIM.tgt||undefined};if(s.k==='target'&&!aim.tgt)aim={};}
  else if(mouseG&&!MOBILE&&SET.aim==='quick'){const p=clampPt(u,mouseG,s.r||6);aim=s.k==='target'?{tgt:pickTarget(u,s,mouseG)||undefined}:{pt:p,dir:norm(mouseG.x-u.x,mouseG.z-u.z)};}
  else if(s.k!=='self'){const t=pickTarget(u,s);if(t)aim={tgt:t};}
  if(!castSkill(u,i,aim)&&u.cd[i]<=0&&!(i<2||u.lv>=4)){floatText(u,L('Cấp 4 mở chiêu cuối','Ult unlocks at level 4'),'#ffd54a');}}
function playerFlash(){const u=M.me;let d;if(MOBILE_AIM.i===3&&MOBILE_AIM.dir)d=MOBILE_AIM.dir;else if(joy.on&&(joy.x||joy.z))d=norm(joy.x,joy.z);else if(mouseG&&!MOBILE)d=norm(mouseG.x-u.x,mouseG.z-u.z);else d={x:Math.sin(u.face),z:Math.cos(u.face)};flash(u,d);}
function playerControl(u,dt){let ix=0,iz=0;if(keys.has('w')||keys.has('arrowup'))iz-=1;if(keys.has('s')||keys.has('arrowdown'))iz+=1;if(keys.has('a')||keys.has('arrowleft'))ix-=1;if(keys.has('d')||keys.has('arrowright'))ix+=1;
  if(joy.on){ix+=joy.x;iz+=joy.z;}
  if(attackTapT>0)attackTapT-=dt;
  if(Math.abs(ix)+Math.abs(iz)>.15){moveGoal=null;u.lock=null;u.recallT=0;const l=Math.min(1,hyp(ix,iz));const n=norm(ix,iz);moveTo(u,u.x+n.x*3,u.z+n.z*3,dt*l);return;}
  if(u.lock&&!targetable(u.lock,u))u.lock=null;
  if(attackHeld||attackTapT>0||u.lock){const t=u.lock||autoTarget(u,4);if(t){const d=dist(u,t)-t.r-u.r;if(d>u.rng)moveTo(u,t.x,t.z,dt,0);else{u.mv=0;if(tryAttack(u,t))attackTapT=0;}return;}}
  if(moveGoal){if(moveTo(u,moveGoal.x,moveGoal.z,dt,.3))moveGoal=null;return;}
  u.mv=0;}
/* mobile joystick and skill buttons with drag-to-aim */
const MOBILE_AIM={i:-1,dir:null,pt:null,tgt:null};let aimMesh=null;
function aimShow(u,i,dx,dz,len){if(!aimMesh){aimMesh=new T.Group();const ag=new T.PlaneGeometry(1,1);ag.rotateX(-Math.PI/2);const a=new T.Mesh(ag,new T.MeshBasicMaterial({color:0x7df9ff,transparent:true,opacity:.5,depthWrite:false,depthTest:false}));a.renderOrder=5;a.name='a';aimMesh.add(a);
    const c=new T.Mesh(new T.RingGeometry(.9,1,40),new T.MeshBasicMaterial({color:0x7df9ff,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));c.rotation.x=-Math.PI/2;c.name='c';aimMesh.add(c);
    const rg=new T.Mesh(new T.RingGeometry(.97,1,64),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}));rg.rotation.x=-Math.PI/2;rg.name='r';aimMesh.add(rg);scene.add(aimMesh);}
  const s=i===3?{k:'dir',r:5.5}:u.def.sk[i],R=s.r||6;aimMesh.visible=true;aimMesh.position.set(u.x,.12,u.z);const a=aimMesh.getObjectByName('a'),c=aimMesh.getObjectByName('c'),rg=aimMesh.getObjectByName('r');
  rg.scale.set(R,R,1);const ang=Math.atan2(dx,dz);
  MOBILE_AIM.tgt=null;c.material.color.set(0x7df9ff);a.material.color.set(0x7df9ff);
  if(s.k==='target'){a.visible=false;const p={x:u.x+dx*Math.min(1,len)*R,z:u.z+dz*Math.min(1,len)*R};const t=pickTarget(u,s,p);c.visible=!!t;if(t){c.scale.set(1.5,1.5,1);c.position.set(t.x-u.x,0,t.z-u.z);c.material.color.set(0xff5a5a);MOBILE_AIM.tgt=t;}MOBILE_AIM.pt=t?{x:t.x,z:t.z}:null;}
  else if(s.k==='point'){const d=Math.min(1,len)*R;a.visible=false;c.visible=true;const sz=s.r>9?3:2.6;c.scale.set(sz,sz,1);c.position.set(dx*d,0,dz*d);MOBILE_AIM.pt={x:u.x+dx*d,z:u.z+dz*d};}
  else{c.visible=false;a.visible=s.k!=='self';a.scale.set(1.2,1,R);a.position.set(dx*R/2,0,dz*R/2);a.rotation.set(0,ang+Math.PI,0);}
  MOBILE_AIM.i=i;MOBILE_AIM.dir={x:dx,z:dz};}
function aimHide(){if(aimMesh)aimMesh.visible=false;MOBILE_AIM.i=-1;MOBILE_AIM.dir=null;MOBILE_AIM.pt=null;MOBILE_AIM.tgt=null;}

/* ====================================================================
   save, lobby, hero select, loading, match HUD, end screen, loop
   ==================================================================== */
const SAVEK='nexus-moba-save';
let save=(()=>{try{return Object.assign({lv:1,xp:0,gold:0,matches:0,wins:0,k:0,d:0,a:0,mvp:0,last:'kael'},JSON.parse(localStorage.getItem(SAVEK)||'{}'));}catch(_){return{lv:1,xp:0,gold:0,matches:0,wins:0,k:0,d:0,a:0,mvp:0,last:'kael'};}})();
function writeSave(){try{localStorage.setItem(SAVEK,JSON.stringify(save));}catch(_){}opt.onSave&&opt.onSave(save);}
const PNAME=(opt.playerName||'').trim()||L('Bạn','You');
let state='lobby',running=false,selHero=HMAP[save.last]?save.last:'kael',diff=2;
/* ---------------- lobby showcase scene ---------------- */
const LS={scene:new T.Scene(),cam:new T.PerspectiveCamera(34,1,.1,300),model:null,t:0};
{const s=LS.scene;const bgTex=makeTex(16,512,(g,w,h)=>{const r=g.createLinearGradient(0,0,0,h);r.addColorStop(0,'#05081a');r.addColorStop(.45,'#14245a');r.addColorStop(.7,'#3a2a6e');r.addColorStop(1,'#0b0b18');g.fillStyle=r;g.fillRect(0,0,w,h);});
  const sky=new T.Mesh(new T.SphereGeometry(120,32,16),new T.MeshBasicMaterial({map:bgTex,side:T.BackSide}));s.add(sky);
  s.add(new T.HemisphereLight(0xb8c8ff,0x201830,.7));const key=new T.DirectionalLight(0xfff0dd,1.6);key.position.set(4,8,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);s.add(key);
  LS.rim=new T.PointLight(0x4f8cff,3,20);LS.rim.position.set(-3,3,-3);s.add(LS.rim);LS.rim2=new T.PointLight(0xff5bd0,2,18);LS.rim2.position.set(3.5,2,-2);s.add(LS.rim2);
  const ped=meshVC([{g:new T.CylinderGeometry(2.6,3,.5,40),p:[0,.25,0],c:'#2a3150'},{g:new T.CylinderGeometry(2.2,2.4,.18,40),p:[0,.58,0],c:'#3d4a7a'},{g:new T.CylinderGeometry(3.6,3.8,.12,40),p:[0,.06,0],c:'#1a1f36'}]);ped.receiveShadow=true;s.add(ped);
  LS.ring=new T.Mesh(new T.TorusGeometry(2.5,.05,8,80),new T.MeshBasicMaterial({color:0x7df9ff}));LS.ring.rotation.x=Math.PI/2;LS.ring.position.y=.66;s.add(LS.ring);
  LS.ring2=new T.Mesh(new T.TorusGeometry(3.2,.03,8,80),new T.MeshBasicMaterial({color:0x8f5bff}));LS.ring2.rotation.x=Math.PI/2;LS.ring2.position.y=.2;s.add(LS.ring2);
  const floor=new T.Mesh(new T.CircleGeometry(60,48),new T.MeshStandardMaterial({color:lin('#0b0e1c'),roughness:.35,metalness:.6}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;s.add(floor);
  const N=MOBILE?120:260,pp=new Float32Array(N*3);for(let i=0;i<N;i++){pp[i*3]=rnd(-14,14);pp[i*3+1]=rnd(0,12);pp[i*3+2]=rnd(-14,4);}
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pp,3));LS.pts=new T.Points(pg,new T.PointsMaterial({color:0x9fd0ff,size:.09,transparent:true,opacity:.8,map:glowTex,depthWrite:false,blending:T.AdditiveBlending}));s.add(LS.pts);
  LS.cam.position.set(0,3.3,12.5);LS.cam.lookAt(0,2.35,0);}
function showcase(id){const h=HMAP[id];if(LS.model)LS.scene.remove(LS.model.g);const m=heroModel(h,0);m.ring.visible=false;m.g.scale.setScalar(1.55*(h.big||1));m.g.position.y=.66;LS.scene.add(m.g);LS.model=m;LS.rim.color.set(h.col);LS.ring.material.color.set(h.acc);LS.t=0;}
function lobbyFrame(dt){LS.t+=dt;const m=LS.model;if(m){m.g.rotation.y=Math.sin(LS.t*.4)*.6+.2;const a=(LS.t%5)/5;poseHuman(m,dt,{mv:0,atk:a>.8?(a-.8)*5:0,ranged:!HMAP[selHero].melee});}
  LS.ring.rotation.z+=dt*.6;LS.ring2.rotation.z-=dt*.3;const p=LS.pts.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)+dt*.4;if(y>12)y=0;p.setY(i,y);}p.needsUpdate=true;
  const w=view.clientWidth||innerWidth,asp=camera.aspect||1.6,back=asp<1.1?9.5/Math.max(.5,asp*.95):9.5;LS.cam.position.set(w<820?0:-1.2,3.2+(back-9.5)*.18,back);LS.cam.lookAt(w<820?0:-1.2,2.2,0);}
/* ---------------- lobby screen ---------------- */
function topBar(){const need=200+save.lv*100;return `<div class="nl-lob-top"><div class="nl-me"><div class="av">${escH(PNAME[0]||'N').toUpperCase()}</div><div><b>${escH(PNAME)}</b><div style="font-size:12px;color:#a9b8d8">${L('Cấp','Level')} ${save.lv} · ${save.matches} ${L('trận','matches')} · ${save.wins} ${L('thắng','wins')}</div><div class="nl-xp"><i style="width:${Math.min(100,save.xp/need*100)}%"></i></div></div></div>
  <div class="nl-cur"><span class="nl-gold">🪙 ${Math.round(save.gold)}</span><span>🏆 ${save.mvp} MVP</span><button class="nl-gear pe" data-a="set" title="${L('Cài đặt','Settings')}">⚙️</button><button class="nl-btn ghost pe" style="padding:6px 12px" data-exit>✕ ${L('Thoát','Exit')}</button></div></div>`;}
function screenLobby(){state='lobby';showcase(selHero);const h=HMAP[selHero];
  ui.innerHTML=`<div class="nl-scr">${topBar()}<div class="nl-lob-main"><div class="nl-side">
    <button class="nl-btn ghost" data-a="heroes">⚔️ ${L('Tướng','Heroes')}</button><button class="nl-btn ghost" data-a="guide">📖 ${L('Hướng dẫn','How to play')}</button><button class="nl-btn ghost" data-a="gfx">⚙️ ${L('Cài đặt','Settings')} · ${GFXN()[SET.gfx]}</button></div>
    <div class="nl-hero-name"><p style="color:${h.col};font-weight:900;letter-spacing:.2em">${escH(ROLE[h.role]).toUpperCase()}</p><h2>${escH(h.n)}</h2><p>${escH(h.t)}</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:12px" class="pe"><button class="nl-btn ghost" data-a="prev">◀</button><button class="nl-btn ghost" data-a="next">▶</button></div></div>
    <div class="nl-play"><div class="nl-panel" style="padding:14px"><b style="font-size:15px">NEXUS LEGENDS</b><p style="margin:6px 0 0;color:#a9b8d8;font-size:13px">${L('Đấu trường 5v5: phá nhà chính của đội đỏ để giành chiến thắng.','5v5 arena: destroy the red team’s core to win.')}</p></div>
      <button class="nl-btn big" data-a="play">${L('CHƠI','PLAY')}</button></div></div></div>`;
  ui.onclick=e=>{if(e.target.closest('[data-exit]')){opt.onExit&&opt.onExit();return;}const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;sfx('buy');
    if(a==='play')screenMode();else if(a==='heroes')screenHeroes();else if(a==='guide')screenGuide();
    else if(a==='gfx'||a==='set')openSettings();
    else if(a==='prev'||a==='next'){const i=HEROES.findIndex(x=>x.id===selHero);selHero=HEROES[(i+(a==='next'?1:HEROES.length-1))%HEROES.length].id;screenLobby();}};}
function announceLobby(t){const d=document.createElement('div');d.className='nl-ann';d.style.opacity=1;d.style.fontSize='18px';d.textContent=t;ui.appendChild(d);setTimeout(()=>d.remove(),1800);}
function screenMode(){ui.innerHTML=`<div class="nl-scr" style="align-items:center;justify-content:center;background:rgba(3,6,16,.55)"><div class="nl-panel" style="padding:22px;width:min(520px,92vw);display:grid;gap:12px">
  <p class="nl-title">${L('ĐẤU THƯỜNG 5V5','CLASSIC 5V5')}</p><p style="text-align:center;color:#a9b8d8;margin:0;font-size:14px">${L('Bạn và 4 đồng đội máy đấu với 5 máy đội đỏ. Chọn độ khó:','You and 4 bot allies against 5 red bots. Pick a difficulty:')}</p>
  <button class="nl-btn blue" data-d="1">${L('DỄ · làm quen','EASY · warm-up')}</button><button class="nl-btn" data-d="2">${L('THƯỜNG','NORMAL')}</button><button class="nl-btn" style="background:linear-gradient(180deg,#ff8a7a,#d6332f);color:#fff;box-shadow:0 4px 0 #7a1714" data-d="3">${L('KHÓ · cao thủ','HARD · expert')}</button>
  <button class="nl-btn ghost" data-back>${L('Quay lại','Back')}</button></div></div>`;
  ui.onclick=e=>{if(e.target.closest('[data-back]')){screenLobby();return;}const b=e.target.closest('[data-d]');if(!b)return;diff=+b.dataset.d;screenSelect();};}
function heroInfo(h){const st=[[L('Máu','HP'),h.hp/3800],[L('Tấn công','Attack'),h.atk/180],[L('Phòng thủ','Defence'),h.ar/110],[L('Tốc độ','Speed'),(h.sp-5.8)/1.3],[L('Tầm đánh','Range'),h.rng/8.5]];
  return `<div style="display:flex;gap:12px;align-items:center"><img src="${portrait(h.id)}" style="width:64px;height:84px;border-radius:10px;object-fit:cover"><div><b style="font-size:20px">${escH(h.n)}</b><div style="color:${h.col};font-weight:800;font-size:12px">${escH(ROLE[h.role])}</div><div style="color:#a9b8d8;font-size:12px">${escH(h.t)}</div></div></div>
  <div class="nl-bars">${st.map(([n,v])=>`<b style="font-weight:600">${n}</b><span><i style="width:${Math.round(clamp(v,.1,1)*100)}%"></i></span>`).join('')}</div>
  ${h.sk.map((s,i)=>`<div class="nl-sk"><i>${i===2?'★':i+1}</i><div><b style="color:#fff">${escH(s.n)}</b> <small style="color:#7d8db0">${s.cd}s</small><br>${escH(L(s.d,s.de))}</div></div>`).join('')}`;}
function screenHeroes(){let cur=selHero;const draw=()=>{ui.innerHTML=`<div class="nl-scr" style="background:rgba(3,6,16,.6)">${topBar()}<div class="nl-sel" style="grid-template-columns:1fr 320px"><div style="overflow:auto"><p class="nl-title" style="text-align:left;margin-bottom:10px">${L('TƯỚNG','HEROES')}</p>
    <div class="nl-grid">${HEROES.map(h=>`<div class="nl-card ${h.id===cur?'on':''}" data-h="${h.id}"><img src="${portrait(h.id)}"><span class="rl">${escH(ROLE[h.role])}</span><b>${escH(h.n)}</b></div>`).join('')}</div></div>
    <div class="nl-panel nl-info">${heroInfo(HMAP[cur])}<button class="nl-btn" data-use>${L('Dùng tướng này','Use this hero')}</button><button class="nl-btn ghost" data-back>${L('Quay lại','Back')}</button></div></div></div>`;};
  draw();ui.onclick=e=>{const c=e.target.closest('[data-h]');if(c){cur=c.dataset.h;showcase(cur);draw();return;}if(e.target.closest('[data-use]')){selHero=cur;save.last=cur;writeSave();screenLobby();return;}if(e.target.closest('[data-back]'))screenLobby();};}
function screenGuide(){ui.innerHTML=`<div class="nl-scr" style="align-items:center;justify-content:center;background:rgba(3,6,16,.7)"><div class="nl-panel" style="padding:20px;width:min(640px,94vw);max-height:90%;overflow:auto;display:grid;gap:10px;font-size:14px;line-height:1.55;color:#d8e2f6">
  <p class="nl-title">${L('HƯỚNG DẪN','HOW TO PLAY')}</p>
  <p><b>${L('Mục tiêu','Goal')}:</b> ${L('đẩy lính theo 3 đường, phá 2 trụ của một đường rồi phá Nhà chính của đội đỏ ở góc trên bên phải.','push minions down the 3 lanes, destroy both towers of a lane, then destroy the red Core in the top-right corner.')}</p>
  <p><b>${L('Điện thoại','Phone')}:</b> ${L('cần gạt bên trái để đi. Nút cam to để đánh (tự nhắm). Bấm nút chiêu để tung tự động, hoặc giữ và kéo để nhắm rồi thả ra.','left stick to move. Big orange button attacks (auto-target). Tap a skill to auto-cast, or hold and drag to aim, then release.')}</p>
  <p><b>${L('Máy tính','Computer')}:</b> ${L('WASD để đi (hoặc chuột phải để đi tới), Space giữ để đánh, Q E R tung chiêu về phía con trỏ, F tốc biến, B về thành, P cửa hàng, Tab bảng điểm.','WASD to move (or right-click to walk), hold Space to attack, Q E R cast towards the cursor, F flash, B recall, P shop, Tab scoreboard.')}</p>
  <p><b>${L('Mẹo','Tips')}:</b> ${L('đứng sau lính khi đánh trụ; hạ lính để có vàng; mua đồ ở nút vàng bên trái; về thành để hồi máu; cấp 4 mở chiêu cuối. Hạ Bùa Xanh/Đỏ trong rừng để mạnh hơn, Rồng Lửa cho cả đội vàng, Chúa Tể cường hoá lính.','stay behind your minions at towers; last-hit minions for gold; buy items with the gold button on the left; recall to heal; level 4 unlocks your ultimate. Blue/Red buffs in the jungle make you stronger, the Fire Dragon gives the team gold, the Abyss Lord empowers your minions.')}</p>
  <button class="nl-btn" data-back>OK</button></div></div>`;ui.onclick=e=>{if(e.target.closest('[data-back]'))screenLobby();};}
/* ---------------- hero select ---------------- */
let SEL=null;
function pickTeam(exclude,need){// one hero per lane, no duplicates in a team
  const out=[];const used=new Set(exclude);const lanes=need.slice();
  for(const ln of lanes){const prefer=HEROES.filter(h=>!used.has(h.id)&&ROLELANE[h.role]===ln);const pool=prefer.length?prefer:HEROES.filter(h=>!used.has(h.id));const h=pick(pool);used.add(h.id);out.push({h:h.id,lane:ln});}return out;}
function screenSelect(){state='select';const myLane=ROLELANE[HMAP[selHero].role];
  SEL={t:25,locked:false,me:selHero,ally:pickTeam([selHero],['top','jungle','mid','bot','sup'].filter(l=>l!==myLane).slice(0,4)),enemy:pickTeam([],['top','jungle','mid','bot','sup']),shown:0,myLane,names:BOTNAMES.slice().sort(()=>Math.random()-.5)};
  showcase(selHero);drawSelect();}
function drawSelect(){const S=SEL;
  const slot=(o,i,team,me)=>{const sh=me||i<S.shown;const h=HMAP[o.h];return `<div class="nl-slot ${team?'red':''} ${me?'me':''}"><div class="pic" style="${sh&&!team?`background-image:url(${portrait(o.h)})`:''}">${sh&&!team?'':'?'}</div><div><b>${escH(me?PNAME:S.names[i+(team?5:0)])}</b><small>${team?L('Đội đỏ','Red team'):sh?escH(h.n)+' · '+escH(ROLE[h.role]):L('Đang chọn…','Picking…')}</small></div></div>`;};
  ui.innerHTML=`<div class="nl-scr" style="background:linear-gradient(90deg,rgba(5,10,30,.85),rgba(5,10,30,.25) 30%,rgba(5,10,30,.25) 70%,rgba(30,5,10,.85))"><div class="nl-lob-top"><b style="font-size:18px">${L('CHỌN TƯỚNG','PICK YOUR HERO')}</b><span class="nl-cur"><span id="nlT">${Math.ceil(S.t)}s</span></span></div>
   <div class="nl-sel"><div class="nl-team">${slot({h:S.me},0,0,true)}${S.ally.map((o,i)=>slot(o,i,0)).join('')}</div>
   <div style="display:flex;flex-direction:column;justify-content:flex-end;gap:10px;min-height:0"><div class="nl-grid pe" style="grid-template-columns:repeat(auto-fill,minmax(80px,1fr));max-height:34vh;overflow:auto">${HEROES.map(h=>{const taken=S.ally.slice(0,S.shown).some(o=>o.h===h.id);return `<div class="nl-card ${h.id===S.me?'on':''} ${taken||S.locked&&h.id!==S.me?'taken':''}" data-h="${h.id}"><img src="${portrait(h.id)}"><span class="rl">${escH(ROLE[h.role])}</span><b>${escH(h.n)}</b></div>`;}).join('')}</div>
     <button class="nl-btn" data-lock ${S.locked?'disabled':''} style="align-self:center;min-width:220px;font-size:20px">${S.locked?L('ĐÃ KHOÁ','LOCKED IN'):L('KHOÁ TƯỚNG','LOCK IN')}</button></div>
   <div class="nl-team">${S.enemy.map((o,i)=>slot(o,i,1)).join('')}<div class="nl-panel nl-info" style="margin-top:6px">${heroInfo(HMAP[S.me])}</div></div></div></div>`;
  ui.onclick=e=>{const c=e.target.closest('[data-h]');if(c&&!S.locked){S.me=c.dataset.h;selHero=S.me;// make sure no ally bot has it
      const ix=S.ally.findIndex(o=>o.h===S.me);if(ix>=0){const free=HEROES.filter(h=>h.id!==S.me&&!S.ally.some(o=>o.h===h.id));S.ally[ix].h=pick(free).id;}showcase(S.me);drawSelect();return;}
    if(e.target.closest('[data-lock]')&&!S.locked){S.locked=true;save.last=S.me;writeSave();sfx('lvl');drawSelect();}};}
function selectTick(dt){const S=SEL;if(!S)return;const ot=S.t;S.t-=dt;const want=Math.min(4,Math.floor((25-S.t)/2.2));if(want!==S.shown){S.shown=want;drawSelect();}
  if(Math.ceil(ot)!==Math.ceil(S.t)){const el=document.getElementById('nlT');if(el)el.textContent=Math.max(0,Math.ceil(S.t))+'s';}
  if(S.locked&&S.shown>=4&&S.t>3)S.t=Math.min(S.t,3);
  if(S.t<=0){if(!S.locked){S.locked=true;}SEL=null;screenLoading(S);}}
/* ---------------- loading ---------------- */
let LOADS=null;
function screenLoading(S){state='loading';const players=[{h:S.me,name:PNAME,team:0,me:true,lane:S.myLane}].concat(S.ally.map((o,i)=>({h:o.h,name:S.names[i],team:0,lane:o.lane})),S.enemy.map((o,i)=>({h:o.h,name:S.names[i+5],team:1,lane:o.lane})));
  LOADS={t:0,players,diff,pr:players.map(()=>0)};
  const card=(p,i)=>`<div class="nl-lc ${p.team?'red':''}"><img src="${portrait(p.h)}"><b>${escH(HMAP[p.h].n)}</b><small>${escH(p.name)}</small><div class="pr"><i id="nlp${i}"></i></div></div>`;
  ui.innerHTML=`<div class="nl-scr"><div class="nl-load"><div class="nl-lrow">${players.slice(0,5).map(card).join('')}</div><div class="nl-vs">VS</div><div class="nl-lrow">${players.slice(5).map((p,i)=>card(p,i+5)).join('')}</div>
    <p style="text-align:center;color:#9fb0d0;margin:0">${L('Mẹo: ','Tip: ')}${pick([L('Cấp 4 mở chiêu cuối.','Level 4 unlocks your ultimate.'),L('Đứng sau lính khi đánh trụ.','Stand behind minions when attacking towers.'),L('Bấm B (hoặc nút 🏠) để về thành hồi máu.','Press B (or 🏠) to recall and heal.'),L('Hạ Rồng Lửa để cả đội nhận thêm vàng.','Slay the Fire Dragon for team gold.')])}</p></div></div>`;}
function loadingTick(dt){const Lo=LOADS;if(!Lo)return;Lo.t+=dt;let all=true;Lo.pr=Lo.pr.map((v,i)=>{const n=Math.min(100,v+dt*rnd(20,70));if(n<100)all=false;const el=document.getElementById('nlp'+i);if(el)el.style.width=n+'%';return n;});
  if(all&&Lo.t>2.2){LOADS=null;startMatch(Lo);}}

/* ---------------- settings panel (lobby and in-match) ---------------- */
let PAUSED=false,setEl=null,setTab='gfx';
const GFXN=()=>({low:L('Thấp','Low'),med:L('Vừa','Medium'),high:L('Cao','High'),ultra:L('Siêu cao','Ultra')});
const SET_DEF={gfx:MOBILE?'med':'high',glow:true,dynres:true,fps:60,showFps:false,camAng:40,camDist:1,aim:'hold',prio:'lowhp',dmg:true,shake:true,hpNum:false,sfx:80,btn:100};
function applyGfx(){const prevSm=Q.sm;qFrom();if(SET.glow===false)Q.pp=false;renderer.setPixelRatio(Q.dpr);
  renderer.shadowMap.enabled=Q.shadows;sun.castShadow=Q.shadows;if(Q.sm&&Q.sm!==prevSm){sun.shadow.mapSize.set(Q.sm,Q.sm);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
  const f=o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)m.needsUpdate=true;};scene.traverse(f);LS.scene.traverse(f);
  ppSetup();resize();}
function applyHudSet(){if(typeof H!=='object'||!H)return;const base=innerWidth<=820?.82:1,k=base*SET.btn/100;if(H.pad){H.pad.style.transform=`scale(${k})`;H.pad.style.transformOrigin='right bottom';}
  const J=ui.querySelector('#nlJoy');if(J){J.style.transform=`scale(${SET.btn/100})`;J.style.transformOrigin='left bottom';}
  if(H.fps){H.fps.style.display=SET.showFps?'':'none';}}
function openSettings(){if(setEl)return;if(state==='match')PAUSED=true;keys.clear();attackHeld=false;if(typeof aimCancel==='function')aimCancel();
  setEl=document.createElement('div');setEl.className='nl-set';hud.appendChild(setEl);drawSettings();}
function closeSettings(){if(!setEl)return;setEl.remove();setEl=null;PAUSED=false;saveSet();if(state==='lobby')screenLobby();}
function drawSettings(){const seg=(key,opts)=>`<div class="nl-seg">${opts.map(([v,t])=>`<button class="${SET[key]===v?'on':''}" data-seg="${key}" data-v="${v}">${t}</button>`).join('')}</div>`;
  const tog=key=>`<button class="nl-tog ${SET[key]?'on':''}" data-tog="${key}"></button>`;
  const rng=(key,min,max,stp,fmt)=>`<div class="nl-rng"><input type="range" min="${min}" max="${max}" step="${stp}" value="${SET[key]}" data-rng="${key}"><span>${fmt(SET[key])}</span></div>`;
  const row=(t,sm,c)=>`<div class="row"><div>${t}${sm?`<small>${sm}</small>`:''}</div>${c}</div>`;
  const G=GFXN();const tabs=[['gfx','🎨 '+L('Đồ hoạ','Graphics')],['cam','🎥 '+L('Góc nhìn','Camera')],['ctl','🎮 '+L('Điều khiển','Controls')],['snd','🔊 '+L('Âm thanh & hiển thị','Sound & display')]];
  let body='';
  if(setTab==='gfx')body=row(L('Chất lượng đồ hoạ','Graphics quality'),L('Cao hơn đẹp hơn nhưng nặng máy hơn','Higher looks better but needs a stronger device'),seg('gfx',[['low',G.low],['med',G.med],['high',G.high],['ultra',G.ultra]]))
    +row(L('Hiệu ứng phát sáng','Glow effects'),L('Ánh sáng chiêu thức, màu điện ảnh (Cao và Siêu cao)','Skill glow and cinematic colour (High and Ultra)'),tog('glow'))
    +row(L('Tự giảm độ phân giải khi giật','Auto resolution'),L('Giữ game mượt trên máy yếu','Keeps the game smooth on slower devices'),tog('dynres'))
    +row(L('Giới hạn khung hình','Frame rate'),L('30 FPS tiết kiệm pin','30 FPS saves battery'),seg('fps',[[30,'30 FPS'],[60,'60 FPS']]))
    +row(L('Hiện FPS','Show FPS'),'',tog('showFps'));
  if(setTab==='cam')body=row(L('Góc camera','Camera angle'),L('Thấp: thấy xa hơn · Cao: nhìn từ trên xuống','Low: see further · High: top-down'),rng('camAng',28,70,1,v=>v+'°'))
    +row(L('Độ xa camera','Camera distance'),L('Máy tính: lăn chuột để phóng to/thu nhỏ','PC: mouse wheel zooms'),rng('camDist',.8,1.35,.05,v=>Math.round(v*100)+'%'))
    +row(L('Rung màn hình','Screen shake'),'',tog('shake'))
    +`<div class="row"><div>${L('Đặt nhanh','Presets')}</div><div class="nl-seg"><button data-cam="34,1.15">${L('Thấp, xa','Low, far')}</button><button data-cam="40,1">${L('Mặc định','Default')}</button><button data-cam="55,1">${L('Cao','High')}</button></div></div>`;
  if(setTab==='ctl')body=row(L('Cách tung chiêu (máy tính)','Skill casting (PC)'),L('Giữ Q/E/R/F để thấy vùng ngắm theo chuột, thả để tung. Bấm nút chiêu rồi bấm chuột trái vào chỗ muốn tung','Hold Q/E/R/F to aim at the mouse, release to cast. Or click a skill button, then left-click the ground'),seg('aim',[['hold',L('Giữ để ngắm','Hold to aim')],['quick',L('Tung ngay','Quick cast')]]))
    +row(L('Ưu tiên mục tiêu khi tự ngắm','Auto-target priority'),L('Điện thoại: chạm nút để tự ngắm, kéo nút để ngắm tay','Phone: tap a skill to auto-aim, drag it to aim yourself'),seg('prio',[['lowhp',L('Máu thấp nhất','Lowest HP')],['near',L('Gần nhất','Nearest')]]))
    +row(L('Kích thước nút (điện thoại)','Button size (phone)'),'',rng('btn',70,130,5,v=>v+'%'))
    +`<div class="row" style="display:block;color:#a9b8d8;font-size:12px;line-height:1.7"><b style="color:#fff">${L('Phím tắt','Keys')}:</b> WASD / ${L('chuột phải','right-click')} ${L('di chuyển','move')} · Space ${L('đánh','attack')} · Q E R ${L('chiêu','skills')} · F ${L('tốc biến','flash')} · B ${L('về thành','recall')} · P ${L('cửa hàng','shop')} · Tab ${L('bảng điểm','scoreboard')} · Esc ${L('huỷ ngắm','cancel aim')}</div>`;
  if(setTab==='snd')body=row(L('Âm lượng hiệu ứng','Sound volume'),'',rng('sfx',0,100,5,v=>v+'%'))
    +row(L('Số sát thương','Damage numbers'),'',tog('dmg'))
    +row(L('Số máu trên thanh máu','HP numbers on bars'),'',tog('hpNum'));
  setEl.innerHTML=`<div class="box"><div class="hd"><b>⚙️ ${L('CÀI ĐẶT','SETTINGS')}</b>${state==='match'?`<span style="color:#ffd54a;font-size:12px;font-weight:700">⏸ ${L('Trận đang tạm dừng','Match paused')}</span>`:''}</div>
    <div class="tabs">${tabs.map(([k,t])=>`<button class="${setTab===k?'on':''}" data-tab="${k}">${t}</button>`).join('')}</div><div class="body">${body}</div>
    <div class="ft"><button class="nl-btn ghost" data-reset>${L('Mặc định','Reset')}</button><button class="nl-btn" data-close>${L('Xong','Done')}</button></div></div>`;
  setEl.onclick=e=>{const t=e.target;if(t===setEl||t.closest('[data-close]')){closeSettings();return;}
    const tb=t.closest('[data-tab]');if(tb){setTab=tb.dataset.tab;drawSettings();return;}
    if(t.closest('[data-reset]')){const g=SET.gfx;Object.assign(SET,SET_DEF);saveSet();if(g!==SET.gfx)applyGfx();else applyGfx();applyHudSet();drawSettings();return;}
    const sg=t.closest('[data-seg]');if(sg){const k=sg.dataset.seg;let v=sg.dataset.v;if(k==='fps')v=+v;SET[k]=v;saveSet();if(k==='gfx')applyGfx();drawSettings();return;}
    const tg=t.closest('[data-tog]');if(tg){const k=tg.dataset.tog;SET[k]=!SET[k];saveSet();if(k==='glow'||k==='dynres')applyGfx();applyHudSet();drawSettings();return;}
    const cm=t.closest('[data-cam]');if(cm){const [a,d]=cm.dataset.cam.split(',');SET.camAng=+a;SET.camDist=+d;saveSet();drawSettings();}};
  setEl.oninput=e=>{const r=e.target.closest('[data-rng]');if(!r)return;SET[r.dataset.rng]=+r.value;const sp=r.parentNode.querySelector('span');const k=r.dataset.rng;sp.textContent=k==='camAng'?r.value+'°':k==='camDist'?Math.round(r.value*100)+'%':r.value+'%';applyHudSet();};
  setEl.onchange=()=>saveSet();}

/* ---------------- start / end a match ---------------- */
function clearMatch(){if(!M)return;for(const u of M.units){if(u.model)scene.remove(u.model.g);if(u.hb)u.hb.remove();}for(const p of M.proj)scene.remove(p.mesh);for(const e of M.extra)scene.remove(e);for(const f of FXL)scene.remove(f.obj);FXL.length=0;M=null;aimHide();}
function startMatch(Lo){clearMatch();UID=0;
  M={units:[],proj:[],timers:[],extra:[],camps:[],time:0,nextWave:14,wave:0,score:[0,0],firstBlood:false,lordBuff:[0,0],diff:Lo.diff,diffMul:[0,.72,1,1.18][Lo.diff],over:false,overT:0,feed:[]};
  spawnTowers();campsInit();
  for(const p of Lo.players){const u=spawnHero(HMAP[p.h],p.team,p.name,!!p.me,p.lane==='sup'?'sup':p.lane);if(p.me)M.me=u;if(!p.me&&p.team===0&&Lo.diff===1)u.gold+=0;if(p.team===1&&Lo.diff===3)u.gold+=300;}
  state='match';buildHud();keys.clear();attackHeld=false;moveGoal=null;CF=null;sfx('lvl');
  announce(L('CHÀO MỪNG ĐẾN VỚI ĐẤU TRƯỜNG NEXUS','WELCOME TO THE NEXUS ARENA'),'#ffd54a',2.5);
  M.timers.push({at:12,fn:()=>announce(L('LÍNH SẮP XUẤT HIỆN','MINIONS ARE COMING'),'#ffffff',1.6)});}
function endMatch(win){if(M.over)return;M.over=true;M.win=win;sfx(win?'win':'die');announce(win?L('CHIẾN THẮNG','VICTORY'):L('THẤT BẠI','DEFEAT'),win?'#ffd54a':'#ff6b6b',3);
  const me=M.me,score=u=>u.k*3+u.a*1.6-u.d*1.2+(u.dmgDone||0)/4000+(u.goldTotal||0)/2500;const all=M.units.filter(u=>u.kind==='hero');const mvp=all.slice().sort((a,b)=>score(b)-score(a))[0];
  const xp=win?140:70,gold=win?120:60;save.matches++;if(win)save.wins++;save.k+=me.k;save.d+=me.d;save.a+=me.a;if(mvp===me)save.mvp++;save.gold+=gold+(mvp===me?50:0);save.xp+=xp;while(save.xp>=200+save.lv*100){save.xp-=200+save.lv*100;save.lv++;}writeSave();
  setTimeout(()=>screenEnd(win,mvp,xp,gold),3000);}
function screenEnd(win,mvp,xp,gold){state='end';const all=M.units.filter(u=>u.kind==='hero');
  const row=u=>`<tr style="${u.isPlayer?'background:rgba(255,213,74,.12)':''}"><td><img src="${portrait(u.def.id)}"> ${escH(u.name)} ${u===mvp?'<b style="color:#ffd54a">MVP</b>':''}</td><td>${u.lv}</td><td>${u.k}/${u.d}/${u.a}</td><td class="nl-gold">${Math.round(u.goldTotal||0)}</td><td>${Math.round((u.dmgDone||0)/1000)}k</td><td>${u.items.map(i=>IMAP[i].ic).join('')}</td></tr>`;
  ui.innerHTML=`<div class="nl-scr"><div class="nl-end"><h1 style="color:${win?'#ffd54a':'#ff6b6b'}">${win?L('CHIẾN THẮNG','VICTORY'):L('THẤT BẠI','DEFEAT')}</h1>
    <p style="margin:0;color:#cfe0ff">${L('Thời gian','Time')} ${fmtT(M.time)} · ${M.score[0]} - ${M.score[1]} · +${xp} XP · <span class="nl-gold">+${gold} 🪙</span></p>
    <div class="nl-panel" style="padding:12px;width:min(860px,96vw);max-height:52vh;overflow:auto"><table class="nl-tb"><tr style="color:#7d8db0"><td>${L('Đội xanh','Blue team')}</td><td>${L('Cấp','Lv')}</td><td>KDA</td><td>${L('Vàng','Gold')}</td><td>${L('Sát thương','Damage')}</td><td>${L('Đồ','Items')}</td></tr>${all.filter(u=>u.team===0).map(row).join('')}
      <tr style="color:#7d8db0"><td>${L('Đội đỏ','Red team')}</td><td></td><td></td><td></td><td></td><td></td></tr>${all.filter(u=>u.team===1).map(row).join('')}</table></div>
    <div style="display:flex;gap:10px"><button class="nl-btn" data-again>${L('Chơi lại','Play again')}</button><button class="nl-btn ghost" data-lobby>${L('Về sảnh','Back to lobby')}</button></div></div></div>`;
  ui.onclick=e=>{if(e.target.closest('[data-again]')){clearMatch();screenMode();}if(e.target.closest('[data-lobby]')){clearMatch();screenLobby();}};}
const fmtT=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
/* ---------------- match HUD ---------------- */
let H={};
function buildHud(){const me=M.me,h=me.def;
  ui.innerHTML=`<div class="nl-bars2" id="nlBars"></div>
  <div class="nl-mm"><canvas width="240" height="240" id="nlMM"></canvas></div>
  <div class="nl-me2"><img src="${portrait(h.id)}"><div><div><span class="lv" id="nlLv">1</span> · <b>${escH(h.n)}</b></div><div id="nlKda" style="color:#cfe0ff">0/0/0</div></div></div>
  <div class="nl-score"><span class="b" id="nlSB">0</span><span class="tm" id="nlTm">0:00</span><span class="r" id="nlSR">0</span></div>
  <div class="nl-fps" id="nlFps"></div><div class="nl-tr"><button data-a="set" title="${L('Cài đặt','Settings')}">⚙️</button><button data-a="board" title="${L('Bảng điểm','Scoreboard')}">📊</button><button data-a="shop" title="${L('Cửa hàng','Shop')}">🛒</button><button data-a="quit" title="${L('Đầu hàng','Surrender')}">🏳️</button></div>
  <div class="nl-feed" id="nlFeed"></div><div class="nl-ann" id="nlAnn"></div>
  <div class="nl-shopq"><button id="nlQB">🛒 <span id="nlQBt"></span></button><button data-a="shop" class="nl-gold" id="nlGold">🪙 0</button></div>
  <div class="nl-dead" id="nlDead">${L('Hồi sinh sau','Respawn in')}<b id="nlDT">0</b></div>
  <div class="nl-joy" id="nlJoy"><i></i></div>
  <div class="nl-pad" id="nlPad"><button class="atk" data-k="atk">⚔<span class="key">${MOBILE?'':'Space'}</span></button>
    ${h.sk.map((s,i)=>`<button class="s s${i}" data-k="${i}" title="${escH(s.n)}">${['①','②','★'][i]}<span class="cd" id="nlCd${i}"></span><span class="key">${MOBILE?'':'QER'[i]}</span></button>`).join('')}
    <button class="fl s" data-k="3" title="${L('Tốc biến','Flash')}">✦<span class="cd" id="nlCd3"></span><span class="key">${MOBILE?'':'F'}</span></button><button class="rc s" data-k="rc" title="${L('Về thành','Recall')}">🏠<span class="key">${MOBILE?'':'B'}</span></button></div>
  <div class="nl-ov" id="nlShop"></div><div class="nl-ov" id="nlBoard"></div>`;
  H={bars:$('#nlBars'),mm:$('#nlMM').getContext('2d'),lv:$('#nlLv'),kda:$('#nlKda'),sb:$('#nlSB'),sr:$('#nlSR'),tm:$('#nlTm'),feed:$('#nlFeed'),ann:$('#nlAnn'),qb:$('#nlQB'),qbt:$('#nlQBt'),gold:$('#nlGold'),dead:$('#nlDead'),dt:$('#nlDT'),cd:[0,1,2,3].map(i=>$('#nlCd'+i)),pad:$('#nlPad'),shop:$('#nlShop'),board:$('#nlBoard'),fps:$('#nlFps'),mmT:0,annT:0};applyHudSet();
  ui.onclick=e=>{const b=e.target.closest('[data-a]');if(b){const a=b.dataset.a;if(a==='set')openSettings();if(a==='shop')toggleShop();if(a==='board')toggleBoard();if(a==='quit'){if(b.dataset.sure){endMatch(false);}else{b.dataset.sure=1;announce(L('Bấm lần nữa để đầu hàng','Tap again to surrender'),'#ffffff',1.5);setTimeout(()=>delete b.dataset.sure,2500);}}}};
  H.qb.onclick=quickBuy;
  // skill pad: tap = auto aim, drag = aim
  H.pad.querySelectorAll('button').forEach(b=>{const k=b.dataset.k;let st=null;
    b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}st={x:e.clientX,y:e.clientY,aim:false};if(k==='atk'){attackHeld=true;attackTapT=.6;}});
    b.addEventListener('pointermove',e=>{if(!st||k==='atk'||k==='rc')return;const dx=e.clientX-st.x,dy=e.clientY-st.y,l=hyp(dx,dy);if(l>16){st.aim=true;const i=+k;const s=i===3?{k:'dir'}:M.me.def.sk[i];if(s.k==='self'&&i!==3)return;AIM=null;aimShow(M.me,i,dx/l,dy/l,l/90);}});
    const up=e=>{if(!st)return;if(k==='atk'){attackHeld=false;}else if(k==='rc'){startRecall(M.me);}else{const i=+k;if(e.pointerType==='mouse'&&!st.aim){st=null;skillDown(i,'click');return;}if(i===3)playerFlash();else playerCast(i);}aimHide();st=null;};
    b.addEventListener('pointerup',up);b.addEventListener('pointercancel',()=>{st=null;attackHeld=false;aimHide();});});
  const J=$('#nlJoy'),knob=J.querySelector('i');let jid=null;
  const jm=e=>{const r=J.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const l=hyp(dx,dy),R=r.width/2-20;if(l>R){dx*=R/l;dy*=R/l;}knob.style.transform=`translate(${dx}px,${dy}px)`;joy.x=dx/R;joy.z=dy/R;joy.on=true;};
  J.addEventListener('pointerdown',e=>{e.preventDefault();jid=e.pointerId;J.setPointerCapture(jid);jm(e);});J.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e);});
  const jup=e=>{if(e.pointerId!==jid)return;jid=null;joy.on=false;joy.x=joy.z=0;knob.style.transform='';};J.addEventListener('pointerup',jup);J.addEventListener('pointercancel',jup);
  $('#nlMM').addEventListener('pointerdown',e=>{const r=e.target.getBoundingClientRect();const x=((e.clientX-r.left)/r.width-.5)*MH*2,z=((e.clientY-r.top)/r.height-.5)*MH*2;moveGoal={x,z};M.me.lock=null;});}
function announce(t,col,d){if(!H.ann)return;H.ann.textContent=t;H.ann.style.color=col||'#fff';H.ann.style.opacity=1;H.annT=d||1.6;}
function killFeed(k,v){if(!H.feed)return;const d=document.createElement('div');const nm=u=>u?(u.kind==='hero'?u.def.n:u.kind==='tower'||u.kind==='core'?L('Trụ','Tower'):u.kind==='minion'?L('Lính','Minion'):u.name||'?'):'?';
  d.innerHTML=`<span style="color:${k&&k.team===0?'#6fb6ff':'#ff6b6b'}">${escH(nm(k))}</span> ⚔ <span style="color:${v.team===0?'#6fb6ff':'#ff6b6b'}">${escH(nm(v))}</span>`;H.feed.prepend(d);while(H.feed.children.length>5)H.feed.lastChild.remove();setTimeout(()=>d.remove(),5000);}
const _p=new T.Vector3();let FT=0;
function toScreen(x,y,z){_p.set(x,y,z).project(camera);if(_p.z>1)return null;const r=renderer.domElement;return{x:(_p.x+1)/2*r.clientWidth,y:(1-_p.y)/2*r.clientHeight};}
function floatText(u,txt,col,big){if(!H.bars||FT>40||(!SET.dmg&&typeof txt==='number'))return;const s=toScreen(u.x,(u.kind==='hero'?3.2:2.2),u.z);if(!s||s.x<0||s.y<0||s.x>innerWidth||s.y>innerHeight)return;
  const d=document.createElement('div');d.className='nl-ft'+(big?' big':'');d.textContent=txt;d.style.color=col;d.style.left=(s.x+rnd(-14,14))+'px';d.style.top=s.y+'px';H.bars.appendChild(d);FT++;setTimeout(()=>{d.remove();FT--;},900);}
function quickNext(u){for(const id of BUILD[u.def.role])if(!u.items.includes(id))return IMAP[id];return null;}
function quickBuy(){const u=M.me,it=quickNext(u);if(!it){toggleShop();return;}if(u.gold<it.p){announce(L('Chưa đủ vàng','Not enough gold'),'#ffd54a',1);return;}if(u.items.length>=6){toggleShop();return;}u.gold-=it.p;u.items.push(it.id);recalc(u);sfx('buy');announce(L('Đã mua ','Bought ')+it.n,'#ffd54a',1.2);}
function toggleShop(force){const o=H.shop;if(!o)return;const show=force!=null?force:o.style.display!=='flex';o.style.display=show?'flex':'none';if(show)drawShop();}
function drawShop(){const u=M.me,rec=BUILD[u.def.role];const st=it=>[it.atk&&'+'+it.atk+L(' công',' atk'),it.ap&&'+'+it.ap+L(' phép',' AP'),it.hp&&'+'+it.hp+L(' máu',' HP'),it.ar&&'+'+it.ar+L(' giáp',' armour'),it.mr&&'+'+it.mr+L(' kháng phép',' MR'),it.as&&'+'+Math.round(it.as*100)+L('% tốc đánh','% atk spd'),it.sp&&L('tăng tốc chạy','move speed'),it.ls&&Math.round(it.ls*100)+L('% hút máu','% life steal'),it.crit&&Math.round(it.crit*100)+L('% chí mạng','% crit'),it.cdr&&Math.round(it.cdr*100)+L('% giảm hồi chiêu','% CDR')].filter(Boolean).join(', ');
  H.shop.innerHTML=`<div class="nl-panel"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:18px">${L('CỬA HÀNG','SHOP')} · <span class="nl-gold">🪙 ${Math.floor(u.gold)}</span></b><button class="nl-btn ghost" data-x>✕</button></div>
   <p style="margin:0 0 6px;color:#a9b8d8;font-size:12px">${L('Đồ của bạn','Your items')} (${u.items.length}/6): ${u.items.map(i=>`<button class="nl-btn ghost" style="padding:4px 8px" data-sell="${i}">${IMAP[i].ic} ${L('Bán','Sell')}</button>`).join(' ')||'—'}</p>
   <div class="nl-items">${ITEMS.map(it=>`<button class="nl-it ${u.gold<it.p||u.items.length>=6?'no':''} ${u.items.includes(it.id)?'own':''}" data-buy="${it.id}"><span class="e">${it.ic}</span><span><b>${escH(it.n)}</b>${rec.includes(it.id)?' <span style="color:#7dff9a;font-size:10px">★</span>':''}<small>${st(it)}</small><small class="nl-gold">🪙 ${it.p}</small></span></button>`).join('')}</div></div>`;
  H.shop.onclick=e=>{if(e.target.closest('[data-x]')||e.target===H.shop){toggleShop(false);return;}const b=e.target.closest('[data-buy]');if(b){const it=IMAP[b.dataset.buy];if(u.gold>=it.p&&u.items.length<6){u.gold-=it.p;u.items.push(it.id);recalc(u);sfx('buy');drawShop();}return;}
    const s=e.target.closest('[data-sell]');if(s){const i=u.items.indexOf(s.dataset.sell);if(i>=0){u.items.splice(i,1);u.gold+=IMAP[s.dataset.sell].p*.6;recalc(u);drawShop();}}};}
function toggleBoard(force){const o=H.board;if(!o)return;const show=force!=null?force:o.style.display!=='flex';o.style.display=show?'flex':'none';if(!show)return;
  const row=u=>`<tr style="${u.isPlayer?'background:rgba(255,213,74,.12)':''}"><td><img src="${portrait(u.def.id)}"> ${escH(u.name)}</td><td>${u.dead?'💀 '+Math.ceil(u.respawnT):u.lv}</td><td>${u.k}/${u.d}/${u.a}</td><td>${u.cs}</td><td>${u.items.map(i=>IMAP[i].ic).join('')}</td></tr>`;const all=M.units.filter(u=>u.kind==='hero');
  o.innerHTML=`<div class="nl-panel"><div style="display:flex;justify-content:space-between"><b>${L('BẢNG ĐIỂM','SCOREBOARD')} · <span style="color:#6fb6ff">${M.score[0]}</span> - <span style="color:#ff6b6b">${M.score[1]}</span></b><button class="nl-btn ghost" data-x>✕</button></div>
   <table class="nl-tb"><tr style="color:#6fb6ff"><td>${L('Đội xanh','Blue team')}</td><td>${L('Cấp','Lv')}</td><td>KDA</td><td>${L('Lính','CS')}</td><td>${L('Đồ','Items')}</td></tr>${all.filter(u=>u.team===0).map(row).join('')}<tr style="color:#ff6b6b"><td>${L('Đội đỏ','Red team')}</td><td></td><td></td><td></td><td></td></tr>${all.filter(u=>u.team===1).map(row).join('')}</table></div>`;
  o.onclick=e=>{if(e.target.closest('[data-x]')||e.target===o)toggleBoard(false);};}
function hudUpdate(dt){const me=M.me;H.lv.textContent=me.lv;H.kda.textContent=`${me.k}/${me.d}/${me.a}`;H.sb.textContent=M.score[0];H.sr.textContent=M.score[1];H.tm.textContent=fmtT(M.time);H.gold.textContent='🪙 '+Math.floor(me.gold);
  const nx=quickNext(me);H.qbt.textContent=nx?nx.ic+' '+nx.p:'—';H.qb.classList.toggle('ok',!!nx&&me.gold>=nx.p&&me.items.length<6);
  for(let i=0;i<4;i++){const c=H.cd[i];const cd=i<3?me.cd[i]:me.flashCd,tot=i<3?me.def.sk[i].cd*(1-me.cdr):90,lock=i===2&&me.lv<4;c.style.setProperty('--p',(cd>0?cd/tot*100:0)+'%');c.textContent=cd>0?Math.ceil(cd):'';c.parentNode.classList.toggle('lock',lock);}
  H.dead.style.display=me.dead?'block':'none';if(me.dead)H.dt.textContent=Math.ceil(me.respawnT);renderer.domElement.style.filter=me.dead?'grayscale(.85) brightness(.8)':'';
  if(H.annT>0){H.annT-=dt;if(H.annT<=0)H.ann.style.opacity=0;}
  // health bars
  const W=renderer.domElement.clientWidth,Hh=renderer.domElement.clientHeight;
  for(const u of M.units){if(u.gone)continue;const show=alive(u)&&!(u.kind==='hero'&&u.hiddenT>0&&u.team!==0&&dist(u,me)>4);
    let e=u.hb;if(!show){if(e)e.style.display='none';continue;}
    const y=u.kind==='hero'?2.9*(u.def.big||1)+(u.y||0):u.kind==='tower'?9.8:u.kind==='core'?11:u.kind==='monster'?(u.mk==='dragon'?5.5:u.mk==='lord'?9:2+u.r):u.type==='siege'?2.3:1.75;
    const s=toScreen(u.x,y,u.z);if(!s||s.x<-60||s.y<-30||s.x>W+60||s.y>Hh+30){if(e)e.style.display='none';continue;}
    if(!e){e=document.createElement('div');const cls=u.isPlayer?'me':u.kind==='monster'?'mon':u.team===0?'al':'en';e.className='nl-hb '+cls+(u.kind==='minion'?' sm':'')+(u.kind==='tower'||u.kind==='core'?' tw':'');
      e.innerHTML=(u.kind==='hero'?`<div class="n"><em>${u.lv}</em>${escH(u.name)}</div>`:'')+`<div class="bar"><i></i><s></s>${u.kind==='hero'?'<b class="hpn"></b>':''}</div>`;H.bars.appendChild(e);u.hb=e;u._hbI=e.querySelector('i');u._hbS=e.querySelector('s');u._hbN=e.querySelector('em');u._hbH=e.querySelector('.hpn');}
    e.style.display='';e.style.transform=`translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;e.style.left='0';e.style.top='0';
    const tot=u.hp+(u.shield||0),mx=Math.max(u.maxHp,tot);u._hbI.style.width=(u.hp/mx*100)+'%';u._hbS.style.left=(u.hp/mx*100)+'%';u._hbS.style.width=((u.shield||0)/mx*100)+'%';if(u._hbN&&u._hbN.textContent!=String(u.lv))u._hbN.textContent=u.lv;if(u._hbH){const t=SET.hpNum?String(Math.ceil(u.hp)):'';if(u._hbH.textContent!==t)u._hbH.textContent=t;}}
  H.mmT-=dt;if(H.mmT<=0){H.mmT=.12;drawMinimap();}}
function drawMinimap(){const g=H.mm,S=240,K=S/(MH*2),P=(x,z)=>[(x+MH)*K,(z+MH)*K];g.fillStyle='#2d4a2a';g.fillRect(0,0,S,S);
  g.strokeStyle='#3a7a8a';g.lineWidth=12*K;g.beginPath();g.moveTo(0,0);g.lineTo(S,S);g.stroke();
  g.strokeStyle='#a08c64';g.lineWidth=7*K;for(const l of['top','mid','bot']){const Pp=laneFor(0,l);g.beginPath();Pp.forEach((p,i)=>i?g.lineTo(...P(p.x,p.z)):g.moveTo(...P(p.x,p.z)));g.stroke();}
  for(const u of M.units){if(!alive(u))continue;const [x,y]=P(u.x,u.z);
    if(u.kind==='tower'||u.kind==='core'){g.fillStyle=TEAMC[u.team];const s=u.kind==='core'?9:6;g.fillRect(x-s/2,y-s/2,s,s);g.strokeStyle='#000';g.lineWidth=1;g.strokeRect(x-s/2,y-s/2,s,s);}
    else if(u.kind==='minion'){g.fillStyle=u.team?'#ff8a8a':'#8ac4ff';g.fillRect(x-1.5,y-1.5,3,3);}
    else if(u.kind==='monster'){g.fillStyle=u.mk==='dragon'?'#ff7a2f':u.mk==='lord'?'#c06bff':'#e8b33a';g.beginPath();g.arc(x,y,u.mk==='dragon'||u.mk==='lord'?5:2.5,0,TAU);g.fill();}}
  for(const u of M.units){if(u.kind!=='hero'||!alive(u))continue;if(u.team===1&&u.hiddenT>0)continue;const [x,y]=P(u.x,u.z);g.fillStyle=TEAMC[u.team];g.beginPath();g.arc(x,y,u.isPlayer?6.5:5,0,TAU);g.fill();g.lineWidth=2;g.strokeStyle=u.isPlayer?'#ffd54a':'#111';g.stroke();}
  // view frame
  const [cx,cy]=P(camera.position.x,camera.position.z-20);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;g.strokeRect(cx-22,cy-14,44,28);}
/* ---------------- camera: tilt and distance come from settings ---------------- */
let camZ=1,CF=null;
function camUpdate(dt){const u=M.me;const k=1-Math.exp(-dt*9);
  if(!CF)CF={x:u.x,z:u.z};else{CF.x+=(u.x-CF.x)*k;CF.z+=(u.z-CF.z)*k;}
  const fov=MOBILE?50:46;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
  const ang=clamp(SET.camAng,28,70)*Math.PI/180,D=(MOBILE?27:29)*SET.camDist*camZ,lead=4*Math.cos(ang);
  const fx=CF.x,fz=CF.z-lead;let cx=fx,cz=fz+Math.cos(ang)*D,cy=Math.sin(ang)*D;
  if(shakeA>0){cx+=rnd(-1,1)*shakeA*.4;cz+=rnd(-1,1)*shakeA*.4;shakeA=Math.max(0,shakeA-dt*2);}
  camera.position.set(cx,cy,cz);camera.lookAt(fx,0,fz);
  const sd=Math.cos(ang)*18;sun.position.set(fx-30,60,fz-sd+25);sun.target.position.set(fx,0,fz-sd);}
renderer.domElement.addEventListener('wheel',e=>{if(state!=='match')return;camZ=clamp(camZ+(e.deltaY>0?.06:-.06),.75,1.3);},{passive:true});
/* ---------------- loop: fps cap, auto resolution, fps meter ---------------- */
let last=0,raf=0,acc=0,perf={t:0,n:0,lowT:0,hiT:0,fps:60};
function dynRes(dt){if(dt>.25||document.hidden){perf.t=0;perf.n=0;return;}perf.t+=dt;perf.n++;if(perf.t<1)return;perf.fps=perf.n/perf.t;perf.t=0;perf.n=0;
  if(SET.showFps&&H.fps)H.fps.textContent=Math.round(perf.fps)+' FPS';
  if(!SET.dynres||state!=='match')return;const target=SET.fps>=60?50:27;
  if(perf.fps<target){perf.lowT++;perf.hiT=0;}else if(perf.fps>(SET.fps>=60?58:29.5)){perf.hiT++;perf.lowT=0;}else{perf.lowT=0;perf.hiT=0;}
  if(perf.lowT>=2&&Q.dpr>.75){Q.dpr=Math.max(.75,Q.dpr-.25);renderer.setPixelRatio(Q.dpr);resize();perf.lowT=0;}
  else if(perf.hiT>=6&&Q.dpr<Q.dprBase){Q.dpr=Math.min(Q.dprBase,Q.dpr+.25);renderer.setPixelRatio(Q.dpr);resize();perf.hiT=0;}}
function frame(ts){if(!running)return;raf=requestAnimationFrame(frame);let dt=(ts-last)/1000||.016;
  if(SET.fps<60){acc+=dt;last=ts;if(acc<1/SET.fps-.004)return;dt=acc;acc=0;}else last=ts;
  dynRes(dt);dt=Math.min(.05,dt);
  if(state==='match'&&M){if(!PAUSED){step(dt);if(!M)return;}syncModels(PAUSED?0:dt);camUpdate(dt);aimTick();if(H.bars)hudUpdate(dt);if(aimMesh&&aimMesh.visible)aimMesh.position.set(M.me.x,.12,M.me.z);if(GRASS)GRASS.count=Math.floor(GRASS.instanceMatrix.count*Math.min(1,Q.grass/1.6));present(scene,camera);}
  else if(state==='end'&&M){step(dt);syncModels(dt);present(scene,camera);}
  else{if(state==='select')selectTick(dt);if(state==='loading')loadingTick(dt);lobbyFrame(dt);LS.cam.aspect=camera.aspect;LS.cam.updateProjectionMatrix();renderer.domElement.style.filter='';present(LS.scene,LS.cam);}}
ppSetup();screenLobby();
return{start(){if(running)return;running=true;resize();last=performance.now();raf=requestAnimationFrame(frame);},stop(){running=false;cancelAnimationFrame(raf);keys.clear();attackHeld=false;},
  _dbg:{get M(){return M;},SET,Q,PP,applyGfx,openSettings,get AIM(){return AIM;},skillDown,skillUp,step,startMatch,screenLobby,screenSelect,HEROES,castSkill,tryAttack,get state(){return state;},syncModels,hudUpdate,camUpdate,get save(){return save;},quickBuy,endMatch}};
}
window.NexusMoba={create};
})();
