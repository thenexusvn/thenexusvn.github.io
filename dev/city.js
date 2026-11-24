/* Nexus City: open-world 3D sandbox for Nexus TheArena.
   Original city, characters and vehicles. Needs THREE r128 as a global.
   Exposes window.NexusCity2.create(opts). */
(function(){
'use strict';
const T=window.THREE;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)], hyp=Math.hypot;
const angD=(a,b)=>{let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;};
const lerpA=(a,b,k)=>a+angD(b,a)*k;
const fmt$=n=>'$'+Math.round(n).toLocaleString('vi-VN');
const L=(vi,en)=>(window.NexusI18n&&window.NexusI18n.lang==='en')?en:vi;
const TT=s=>(window.NexusI18n&&window.NexusI18n.t)?window.NexusI18n.t(s):s;
const lin=c=>new T.Color(c).convertSRGBToLinear();

/* ---------- city layout constants ---------- */
const CELL=64,N=14,HALF=N*CELL/2,RW=14,LANE=3.5,SW=4;
const road=i=>i*CELL-HALF;
const SAND0=HALF+RW/2,WATER=HALF+72;
const EXT={x0:-HALF-26,x1:WATER-3,z0:-HALF-26,z1:HALF+26};
/* west hills: terrain heights live in HGRID (built later); heightAt is 0 everywhere else */
const HZ={x0:-800,x1:-456,z0:-110,z1:480};let HGRID=null;
function inHills(x,z){return x<HZ.x1&&x>HZ.x0&&z>HZ.z0&&z<HZ.z1;}
function heightAt(x,z){const G=HGRID;if(!G||!inHills(x,z))return 0;const fx=(x-G.X0)/G.ST,fz=(z-G.Z0)/G.ST,ix=clamp(Math.floor(fx),0,G.NX-2),iz=clamp(Math.floor(fz),0,G.NZ-2),tx=fx-ix,tz=fz-iz,H=G.H,a=H[iz*G.NX+ix],b=H[iz*G.NX+ix+1],c=H[(iz+1)*G.NX+ix],d=H[(iz+1)*G.NX+ix+1];return(a*(1-tx)+b*tx)*(1-tz)+(c*(1-tx)+d*tx)*tz;}
const FLOOR=3.6,BAY=3.2,FT_W=4*BAY,FT_H=4*FLOOR;
// a river runs west to east through block row RIVER_J and out to the sea; every north-south road crosses it on a bridge
const RIVER_J=4,RZ0=road(RIVER_J)+RW/2,RZ1=road(RIVER_J+1)-RW/2,BIG_BRIDGE=7;
const SPECIAL={'8,7':'bank','3,6':'police','10,2':'hospital','4,10':'school','6,12':'stadium','10,11':'mall','5,2':'cars','2,11':'guns','7,9':'food','11,8':'gym','1,5':'garage','2,8':'gas','11,6':'gas'};
function district(i,j){
  if(j===RIVER_J)return'river';
  if(i===N-1)return'beach';
  const s=SPECIAL[i+','+j];if(s)return s;
  if((i===9&&j===9)||(i===1&&j===2)||(i===5&&j===12)||(i===12&&j===12)||(i===7&&j===0))return'park';
  if((i<=2&&j>=9)||(i>=11&&j<=2))return'res';
  if(i>=8&&j<=1)return'industrial';
  if(i>=6&&i<=10&&j>=6&&j<=10)return'downtown';
  if((i*7+j*3)%4===0)return'tube';
  return'mid';
}

/* ---------- geometry builder ---------- */
class GB{
  constructor(){this.p=[];this.n=[];this.u=[];this.i=[];}
  quad(a,b,c,d,n,uv){const o=this.p.length/3;for(const v of[a,b,c,d])this.p.push(v[0],v[1],v[2]);for(let k=0;k<4;k++)this.n.push(n[0],n[1],n[2]);for(const t of uv)this.u.push(t[0],t[1]);this.i.push(o,o+1,o+2,o,o+2,o+3);}
  tri(a,b,c,n,uv){const o=this.p.length/3;for(const v of[a,b,c])this.p.push(v[0],v[1],v[2]);for(let k=0;k<3;k++)this.n.push(n[0],n[1],n[2]);for(const t of uv)this.u.push(t[0],t[1]);this.i.push(o,o+1,o+2);}
  box(x0,x1,y0,y1,z0,z1,o){o=o||{};const uw=o.uw||FT_W,uh=o.uh||FT_H,uo=o.uo||0,V=y=>y/uh;
    const side=(a,b,c,d,n,len)=>this.quad(a,b,c,d,n,[[uo,V(y0)],[uo+len/uw,V(y0)],[uo+len/uw,V(y1)],[uo,V(y1)]]);
    side([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],x1-x0);
    side([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],x1-x0);
    side([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],z1-z0);
    side([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],z1-z0);
    const tb=o.top===undefined?this:o.top;
    if(tb){const s=o.ts||8;tb.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],[[x0/s,-z1/s],[x1/s,-z1/s],[x1/s,-z0/s],[x0/s,-z0/s]]);}
  }
  flat(x0,x1,y,z0,z1,s){s=s||4;this.quad([x0,y,z1],[x1,y,z1],[x1,y,z0],[x0,y,z0],[0,1,0],[[x0/s,-z1/s],[x1/s,-z1/s],[x1/s,-z0/s],[x0/s,-z0/s]]);}
  geo(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(this.u,2));g.setIndex(this.i);g.computeBoundingSphere();return g;}
}
function mergeGeos(list){const gb=new GB();for(const g0 of list){const g=g0.index?g0.toNonIndexed():g0;const p=g.attributes.position.array,n=g.attributes.normal.array,u=g.attributes.uv?g.attributes.uv.array:null;const o=gb.p.length/3,cnt=p.length/3;for(let k=0;k<p.length;k++)gb.p.push(p[k]);for(let k=0;k<n.length;k++)gb.n.push(n[k]);for(let k=0;k<cnt;k++){gb.u.push(u?u[k*2]:0,u?u[k*2+1]:0);gb.i.push(o+k);}}return gb.geo();}

const _v1=new T.Vector3(),_v2=new T.Vector3(),_q=new T.Quaternion(),_m4=new T.Matrix4();
function buildVC(parts){let tot=0;const arr=[];for(const p of parts){const g=p.geo.index?p.geo.toNonIndexed():p.geo.clone();_m4.compose(_v1.set(...(p.pos||[0,0,0])),_q.identity(),_v2.set(...(p.scale||[1,1,1])));g.applyMatrix4(_m4);arr.push([g,lin(p.color||'#ffffff')]);tot+=g.attributes.position.count;}
  const pos=new Float32Array(tot*3),nor=new Float32Array(tot*3),col=new Float32Array(tot*3),uv=new Float32Array(tot*2);let o=0;
  for(const[g,c]of arr){const n=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);for(let i=0;i<n;i++){col[(o+i)*3]=c.r;col[(o+i)*3+1]=c.g;col[(o+i)*3+2]=c.b;}o+=n;g.dispose();}
  const G=new T.BufferGeometry();G.setAttribute('position',new T.BufferAttribute(pos,3));G.setAttribute('normal',new T.BufferAttribute(nor,3));G.setAttribute('color',new T.BufferAttribute(col,3));G.setAttribute('uv',new T.BufferAttribute(uv,2));G.computeBoundingSphere();return G;}
/* ---------- canvas textures ---------- */
function makeTex(w,h,draw,o){o=o||{};const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new T.CanvasTexture(c);if(o.repeat!==false)t.wrapS=t.wrapT=T.RepeatWrapping;if(o.srgb!==false)t.encoding=T.sRGBEncoding;t.anisotropy=o.aniso||4;return t;}
function speckle(g,w,h,base,n,a){g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){const d=Math.random()<.5;g.fillStyle=d?`rgba(0,0,0,${Math.random()*a})`:`rgba(255,255,255,${Math.random()*a})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2.5,1+Math.random()*2.5);}}

/* ======================================================================= */
function create(opt){
const view=opt.view,root=opt.hudRoot,MOBILE=!!opt.mobile;
const Q={peds:MOBILE?14:22,traffic:MOBILE?14:24,shadows:!MOBILE,pr:MOBILE?1:Math.min(window.devicePixelRatio||1,1.5),cull:MOBILE?130:175,tex:MOBILE?256:512};

/* ---------- save ---------- */
const SAVE_KEY='nexus-city2-save';
let save={money:500,char:'minh',tutDone:false,bankCD:0,heists:0,hour:17,radio:0,outfit:'base',outfits:['base'],cap:false,capOwned:false,up:{str:0,hp:0,run:0},weapons:{},ammo:{pistol:0,smg:0,rifle:0},armor:0,garage:[],apt:false,lang:null};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s)Object.assign(save,s);}catch(_){}
save.up=Object.assign({str:0,hp:0,run:0},save.up);save.ammo=Object.assign({pistol:0,smg:0,rifle:0},save.ammo);save.weapons=save.weapons||{};save.garage=save.garage||[];save.outfits=save.outfits||['base'];
const maxHp=()=>100+50*(save.up.hp|0);
if(opt.char)save.char=opt.char;
function writeSave(){try{save.hour=Math.round(tod.hour*100)/100;}catch(_){}try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(_){}if(opt.onSave)opt.onSave(save);}

/* ---------- renderer, scene, sky ---------- */
const renderer=new T.WebGLRenderer({antialias:!MOBILE,powerPreference:'high-performance'});
renderer.setPixelRatio(Q.pr);
renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=Q.shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;
view.appendChild(renderer.domElement);
const scene=new T.Scene();
scene.fog=new T.Fog(lin('#f3b48a'),90,MOBILE?Q.cull+150:Q.cull+300);
const camera=new T.PerspectiveCamera(60,1,.2,2800);
const sunDir=new T.Vector3(.78,.3,-.45).normalize();
// sky: gradient + sun/moon disc + drifting clouds + stars at night. Colours are display-space (no tone mapping), like before.
const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new T.Color('#283a7a')},mid:{value:new T.Color('#e58c8c')},hor:{value:new T.Color('#ffc48c')},low:{value:new T.Color('#c89a86')},sunDir:{value:sunDir},sunCol:{value:new T.Color(1,.72,.42)},sunI:{value:1},night:{value:0},cloudLit:{value:new T.Color('#fff0e0')},cloudDark:{value:new T.Color('#b08090')},ct:{value:0},cover:{value:0}},
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform vec3 top,mid,hor,low,sunDir,sunCol,cloudLit,cloudDark;uniform float sunI,night,ct,cover;varying vec3 vP;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=mix(hor,mid,smoothstep(0.,.2,h));c=mix(c,top,smoothstep(.2,.8,h));if(h<0.)c=mix(hor,low,smoothstep(0.,-.15,h));
vec3 sd=normalize(sunDir);float s=max(dot(d,sd),0.);c+=sunCol*pow(s,18.)*.55*sunI+vec3(1.,.93,.75)*pow(s,900.)*2.5*sunI;
float m=max(dot(d,-sd),0.);c+=vec3(.85,.9,1.)*smoothstep(.9994,.9997,m)*night*.9+vec3(.3,.35,.5)*pow(m,40.)*night*.25;
if(h>0.){vec3 sp=d*420.;float st=hs(floor(sp.xz+sp.y*3.1));c+=vec3(step(.9965,st))*night*smoothstep(.05,.3,h)*(.6+.4*sin(ct*3.+st*90.));
vec2 cp=d.xz/(h+.12)*1.6+vec2(ct*.012,ct*.004);float cl=fbm(cp);float a=smoothstep(.5,.78,cl)*smoothstep(0.,.12,h)*(1.-smoothstep(.65,1.,h));
a=smoothstep(.5-cover*.4,.78-cover*.34,cl)*smoothstep(0.,.12,h)*(1.-smoothstep(.65,1.,h)*(1.-cover));
vec3 cc=mix(cloudDark,cloudLit,clamp((cl-.5)*2.5+.35*s,0.,1.))*(1.-cover*.5);c=mix(c,cc,a*(.88+cover*.1));}
gl_FragColor=vec4(c,1.);}`});
const sky=new T.Mesh(new T.SphereGeometry(2400,32,16),skyMat);sky.renderOrder=-1;scene.add(sky);
let ENV=null;
try{const pm=new T.PMREMGenerator(renderer);const es=new T.Scene();es.add(new T.Mesh(new T.SphereGeometry(100,32,16),skyMat));ENV=pm.fromScene(es,.03).texture;pm.dispose();
  // some GPUs/drivers return a broken (black/NaN) PMREM; probe it before trusting it
  const rt=new T.WebGLRenderTarget(8,8),ts=new T.Scene();ts.environment=ENV;ts.add(new T.Mesh(new T.SphereGeometry(1,16,12),new T.MeshStandardMaterial({color:0xffffff,metalness:1,roughness:.4})));
  const tc=new T.PerspectiveCamera(40,1,.1,10);tc.position.z=3;renderer.setRenderTarget(rt);renderer.render(ts,tc);const px=new Uint8Array(256);renderer.readRenderTargetPixels(rt,0,0,8,8,px);renderer.setRenderTarget(null);rt.dispose();
  let sum=0;for(let i=0;i<px.length;i+=4)sum+=px[i]+px[i+1]+px[i+2];if(!(sum>300))ENV=null;}catch(e){ENV=null;}
scene.environment=ENV;
const ENV_OK=!!ENV;
const hemi=new T.HemisphereLight(lin('#ffe0c6'),lin('#4b3c56'),.7);scene.add(hemi);
const sun=new T.DirectionalLight(lin('#ffcf9c'),2.4);
sun.castShadow=Q.shadows;sun.shadow.mapSize.set(2048,2048);
{const c=sun.shadow.camera;c.left=-80;c.right=80;c.top=80;c.bottom=-80;c.near=5;c.far=500;}
sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);

/* ---------- materials ---------- */
const MC={};
function mat(c,r,m,ex){r=r===undefined?.8:r;m=m||0;const k=c+'|'+r+'|'+m+(ex?'x':'');if(!MC[k])MC[k]=new T.MeshStandardMaterial(Object.assign({color:lin(c),roughness:r,metalness:m},ex||{}));return MC[k];}
function emat(c,i){i=i===undefined?1:i;const k='e|'+c+'|'+i;if(!MC[k])MC[k]=new T.MeshStandardMaterial({color:lin('#202020'),emissive:lin(c),emissiveIntensity:i,roughness:.35});return MC[k];}
const GLASS=new T.MeshStandardMaterial({color:lin(ENV_OK?'#0e141c':'#1d2733'),roughness:ENV_OK?.06:.12,metalness:ENV_OK?.9:.25,envMapIntensity:1.2});
const S=Q.tex,C=S/4;
const TX={
  asphalt:makeTex(1024,1024,(g,w,h)=>{speckle(g,w,h,'#3b3a40',26000,.2);for(let i=0;i<5;i++){const x=Math.random()*w,y=Math.random()*h,pw=rnd(90,220),ph=rnd(60,160);g.fillStyle=`rgba(${Math.random()<.5?'20,20,24':'80,80,86'},.22)`;g.fillRect(x,y,pw,ph);g.strokeStyle='rgba(15,15,18,.5)';g.lineWidth=2.5;g.strokeRect(x,y,pw,ph);}g.fillStyle='rgba(0,0,0,.09)';for(let i=0;i<26;i++){g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,20+Math.random()*70,8+Math.random()*34,Math.random()*3,0,7);g.fill();}for(let i=0;i<9;i++){const gr=g.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,'rgba(10,10,14,.35)');gr.addColorStop(1,'rgba(10,10,14,0)');g.save();g.translate(Math.random()*w,Math.random()*h);g.scale(rnd(14,38),rnd(8,20));g.fillStyle=gr;g.beginPath();g.arc(0,0,1,0,7);g.fill();g.restore();}g.strokeStyle='rgba(12,12,14,.6)';for(let i=0;i<22;i++){g.lineWidth=rnd(.8,2);g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<rnd(4,9);k++){x+=rnd(-28,28);y+=rnd(-28,28);g.lineTo(x,y);}g.stroke();}}),
  walk:makeTex(256,256,(g,w,h)=>{speckle(g,w,h,'#bdb5a8',2500,.12);g.strokeStyle='rgba(60,50,40,.28)';g.lineWidth=2;for(let x=0;x<=w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<=h;y+=64){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}}),
  grass:makeTex(256,256,(g,w,h)=>{speckle(g,w,h,'#5a8c3c',4000,.18);g.strokeStyle='rgba(30,70,20,.35)';for(let i=0;i<500;i++){const x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+rnd(-2,2),y-rnd(3,7));g.stroke();}}),
  sand:makeTex(256,256,(g,w,h)=>speckle(g,w,h,'#e6cf9c',5000,.16)),
  gravel:makeTex(256,256,(g,w,h)=>speckle(g,w,h,'#6d6a66',6000,.25)),
  shingleRed:makeTex(256,256,(g,w,h)=>{g.fillStyle='#8a4b3a';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=16){for(let x=(y/16)%2?-16:0;x<w;x+=32){g.fillStyle=`rgb(${120+rnd(-14,14)|0},${62+rnd(-8,8)|0},${48+rnd(-6,6)|0})`;g.fillRect(x+1,y+1,30,14);}g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y+14,w,2);}}),
  shingleGrey:makeTex(256,256,(g,w,h)=>{g.fillStyle='#4b4f58';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=16){for(let x=(y/16)%2?-16:0;x<w;x+=32){const v=70+rnd(-10,10)|0;g.fillStyle=`rgb(${v},${v+4},${v+12})`;g.fillRect(x+1,y+1,30,14);}g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,y+14,w,2);}}),
  leaf:makeTex(128,512,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#3e7a2e';g.lineWidth=5;g.beginPath();g.moveTo(w/2,h);g.lineTo(w/2,0);g.stroke();for(let y=20;y<h-10;y+=9){const l=(1-Math.abs(y/h-.45)*1.4)*w*.48;g.strokeStyle=`rgb(${50+rnd(0,25)|0},${110+rnd(0,40)|0},${40+rnd(0,20)|0})`;g.lineWidth=4;g.beginPath();g.moveTo(w/2,y);g.lineTo(w/2-l,y-26);g.moveTo(w/2,y);g.lineTo(w/2+l,y-26);g.stroke();}},{repeat:false})
};
TX.asphalt.repeat.set(1,1);
function shadeHex(hex,l){const c=new T.Color(hex),o={};c.getHSL(o);c.setHSL(o.h,o.s,clamp(o.l+l/100,0,1));return '#'+c.getHexString();}
function facade(style,p){
  const lit=[];for(let i=0;i<16;i++)lit.push(Math.random()<(style==='glass'?.25:style==='house'?.3:.2));
  const win={glass:[.04,.04,.92,.78],apt:[.22,.18,.56,.56],deco:[.08,.28,.84,.4],brick:[.25,.25,.5,.42],house:[.3,.28,.4,.42],stone:[.32,.12,.36,.66]}[style];
  const glassG=(g,x,y,w,h,a,b)=>{const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(x,y,w,h);};
  const map=makeTex(S,S,(g)=>{
    if(style==='glass'){g.fillStyle=p.frame;g.fillRect(0,0,S,S);}
    else if(style==='brick'){g.fillStyle='#7d4535';g.fillRect(0,0,S,S);const bh=S/48;for(let y=0;y<S;y+=bh){const off=(y/bh)%2?bh*1.5:0;for(let x=-off;x<S;x+=bh*3){g.fillStyle=`rgb(${118+rnd(-18,18)|0},${62+rnd(-10,10)|0},${48+rnd(-8,8)|0})`;g.fillRect(x+1,y+1,bh*3-2,bh-2);}}}
    else{speckle(g,S,S,p.wall,S*6,.07);}
    if(style==='house'){g.fillStyle='rgba(0,0,0,.07)';for(let y=0;y<S;y+=S/40)g.fillRect(0,y,S,1.5);}
    if(style==='stone'){g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=1.5;for(let y=0;y<S;y+=S/16){g.beginPath();g.moveTo(0,y);g.lineTo(S,y);g.stroke();}}
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){
      const x=c*C,y=r*C,[wx,wy,ww,wh]=win,X=x+wx*C,Y=y+wy*C,W=ww*C,H=wh*C,L=lit[r*4+c];
      if(style==='glass'){glassG(g,X,Y,W,H,p.g1,p.g2);g.fillStyle='rgba(255,255,255,.09)';g.beginPath();g.moveTo(X+W*.1,Y+H);g.lineTo(X+W*.55,Y);g.lineTo(X+W*.75,Y);g.lineTo(X+W*.3,Y+H);g.fill();g.fillStyle=p.span;g.fillRect(x,y+C*.82,C,C*.18);g.fillStyle=p.frame;g.fillRect(X+W/2-1,Y,2,H);}
      else{
        if(style==='deco'){g.fillStyle=p.accent;g.fillRect(x,y+C*.84,C,C*.07);g.fillRect(x,y+C*.12,C,C*.03);}
        if(p.trim){g.fillStyle=p.trim;g.fillRect(X-C*.03,Y-C*.03,W+C*.06,H+C*.06);}
        glassG(g,X,Y,W,H,L?'#ffe2b0':'#9cc0d6',L?'#e7a35a':'#2c4558');
        if(!L&&Math.random()<.45){g.fillStyle=pick(['rgba(220,200,170,.65)','rgba(180,200,220,.6)','rgba(230,170,170,.6)']);g.fillRect(X,Y,W*.42,H);}
        g.fillStyle='rgba(0,0,0,.28)';if(style==='deco'||style==='brick'||style==='stone'){for(let k=1;k<4;k++)g.fillRect(X+W*k/4-1,Y,2,H);}else{g.fillRect(X+W/2-1,Y,2,H);g.fillRect(X,Y+H*.45,W,2);}
        if(style==='house'&&p.shutter){g.fillStyle=p.shutter;g.fillRect(X-C*.12,Y,C*.09,H);g.fillRect(X+W+C*.03,Y,C*.09,H);}
        if(p.trim){g.fillStyle=p.trim;g.fillRect(X-C*.05,Y+H,W+C*.1,C*.04);}
        if(style==='apt'&&r%2===0&&p.balcony){g.fillStyle='rgba(40,40,45,.75)';g.fillRect(x+C*.12,y+C*.8,C*.76,C*.03);for(let k=0;k<9;k++)g.fillRect(x+C*.12+k*C*.095,y+C*.8,2,C*.12);g.fillRect(x+C*.12,y+C*.92,C*.76,C*.02);}
      }
      if(L&&style==='glass'){g.fillStyle='rgba(255,210,140,.32)';g.fillRect(X,Y,W,H);}
    }
  });
  const emi=makeTex(S,S,(g)=>{g.fillStyle='#000';g.fillRect(0,0,S,S);for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(lit[r*4+c]){const[wx,wy,ww,wh]=win,X=c*C+wx*C,Y=r*C+wy*C,W=ww*C,H=wh*C;const tint=pick(style==='glass'?['#a88050','#8a7450','#7f8ea8','#b08a58']:['#ffbf70','#ffd394','#ffe2b5','#f4a95c','#bcd6ff','#ffc98a']),k=rnd(.55,1);const gr=g.createLinearGradient(0,Y,0,Y+H);gr.addColorStop(0,tint);gr.addColorStop(1,shadeHex(tint,-38*k));g.globalAlpha=k;g.fillStyle=gr;g.fillRect(X,Y,W,H);const v=Math.random();g.fillStyle='rgba(0,0,0,.55)';if(v<.25){for(let y=Y+H*.06;y<Y+H*.6;y+=H*.09)g.fillRect(X,y,W,H*.035);}else if(v<.5){g.fillRect(X,Y,W*rnd(.2,.38),H);g.fillRect(X+W*rnd(.62,.8),Y,W,H);}else if(v<.62){g.fillRect(X+W*.3,Y+H*.45,W*.22,H*.55);g.beginPath();g.arc(X+W*.41,Y+H*.38,W*.08,0,7);g.fill();}g.globalAlpha=1;}});
  const fm=new T.MeshStandardMaterial({map,emissiveMap:emi,emissive:new T.Color(1,1,1),emissiveIntensity:style==='glass'?.5:.75,roughness:style==='glass'?(ENV_OK?.18:.4):.85,metalness:style==='glass'&&ENV_OK?.55:0,envMapIntensity:style==='glass'?1:.4});
  fm.userData.baseE=fm.emissiveIntensity;fm.userData.baseEnv=fm.envMapIntensity;NIGHTM.push(fm);return fm;
}
const NIGHTM=[];
const FAC={
  glassBlue:facade('glass',{frame:'#2a3340',span:'#1d242e',g1:'#a9c6dc',g2:'#2c4a66'}),
  glassTeal:facade('glass',{frame:'#22333a',span:'#16262b',g1:'#a6e0dc',g2:'#1f5a62'}),
  glassBronze:facade('glass',{frame:'#3a3028',span:'#2a221c',g1:'#e8c9a0',g2:'#5a4430'}),
  glassSilver:facade('glass',{frame:'#6a7078',span:'#4a5058',g1:'#dfe8ef',g2:'#62707e'}),
  aptPink:facade('apt',{wall:'#f2c4c4',trim:'#fbf3ee',balcony:1}),
  aptMint:facade('apt',{wall:'#a7d8c8',trim:'#f4fbf8',balcony:1}),
  aptPeach:facade('apt',{wall:'#f7d2ad',trim:'#fff8ef'}),
  aptCream:facade('apt',{wall:'#ece4d2',trim:'#ffffff',balcony:1}),
  aptLav:facade('apt',{wall:'#cdbde6',trim:'#f7f2ff'}),
  decoPink:facade('deco',{wall:'#f6c6d4',accent:'#2fb6b0'}),
  decoTeal:facade('deco',{wall:'#a9e2dc',accent:'#f27c9b'}),
  decoYellow:facade('deco',{wall:'#f8e2a6',accent:'#3d8fd6'}),
  decoWhite:facade('deco',{wall:'#f4f1ea',accent:'#ff8f6b'}),
  brick:facade('brick',{trim:'#2a2a2a'}),
  houseWhite:facade('house',{wall:'#f2efe8',trim:'#ffffff',shutter:'#3d5a80'}),
  houseBlue:facade('house',{wall:'#a8c6e0',trim:'#ffffff',shutter:'#2b3a55'}),
  houseYellow:facade('house',{wall:'#f3dc9c',trim:'#ffffff',shutter:'#6b4a2b'}),
  houseSage:facade('house',{wall:'#b9cbb0',trim:'#ffffff',shutter:'#44523a'}),
  stone:facade('stone',{wall:'#e3d6bd',trim:'#f3ead7'}),
  white:facade('stone',{wall:'#eef0f2',trim:'#ffffff'}),
  policeBlue:facade('apt',{wall:'#3f63a8',trim:'#e9eef8'})
};
const ROOF=new T.MeshStandardMaterial({map:TX.gravel,roughness:.95});
const SHINGLE={red:new T.MeshStandardMaterial({map:TX.shingleRed,roughness:.9}),grey:new T.MeshStandardMaterial({map:TX.shingleGrey,roughness:.9})};
function textTex(text,o){o=o||{};const w=o.w||512,h=o.h||128;return makeTex(w,h,(g)=>{g.fillStyle=o.bg||'rgba(0,0,0,0)';g.fillRect(0,0,w,h);g.font=`700 ${o.size||64}px ${o.font||'"Space Grotesk",Inter,system-ui,sans-serif'}`;g.textAlign='center';g.textBaseline='middle';if(o.glow){g.shadowColor=o.glow;g.shadowBlur=18;}g.fillStyle=o.fg||'#fff';g.fillText(text,w/2,h/2+2);if(o.glow){g.shadowBlur=36;g.fillText(text,w/2,h/2+2);}},{repeat:false});}
function sign(text,x,y,z,ry,w,h,o){const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:textTex(text,o),transparent:true,toneMapped:false,fog:true}));m.position.set(x,y,z);m.rotation.y=ry;scene.add(m);return m;}

/* ---------- colliders (spatial hash) ---------- */
const HC=24,hash=new Map();let stamp=0;
const hk=(ix,iz)=>ix*4096+iz;
const cellOf=v=>Math.floor((v+2000)/HC);
function addCol(c){c.s=0;const x0=c.t==='b'?c.x0:c.x-c.r,x1=c.t==='b'?c.x1:c.x+c.r,z0=c.t==='b'?c.z0:c.z-c.r,z1=c.t==='b'?c.z1:c.z+c.r;
  for(let ix=cellOf(x0);ix<=cellOf(x1);ix++)for(let iz=cellOf(z0);iz<=cellOf(z1);iz++){const k=hk(ix,iz);let a=hash.get(k);if(!a)hash.set(k,a=[]);a.push(c);}return c;}
const blds=[];
function colB(x0,x1,z0,z1,h){const c=addCol({t:'b',x0,x1,z0,z1,h});blds.push(c);return c;}
function query(x,z,r,cb){stamp++;for(let ix=cellOf(x-r);ix<=cellOf(x+r);ix++)for(let iz=cellOf(z-r);iz<=cellOf(z+r);iz++){const a=hash.get(hk(ix,iz));if(!a)continue;for(const c of a){if(c.s===stamp||c.off)continue;c.s=stamp;cb(c);}}}
function resolve(x,z,r){let px=0,pz=0,hit=false;
  query(x,z,r,c=>{if(c.t==='b'){const cx=clamp(x,c.x0,c.x1),cz=clamp(z,c.z0,c.z1),dx=x-cx,dz=z-cz,d2=dx*dx+dz*dz;if(d2<r*r){hit=true;if(d2>1e-8){const d=Math.sqrt(d2);px+=dx/d*(r-d);pz+=dz/d*(r-d);}else{const l=x-c.x0,rr=c.x1-x,t=z-c.z0,b=c.z1-z,m=Math.min(l,rr,t,b);if(m===l)px-=l+r;else if(m===rr)px+=rr+r;else if(m===t)pz-=t+r;else pz+=b+r;}}}
    else{const dx=x-c.x,dz=z-c.z,d=hyp(dx,dz),R=r+c.r;if(d<R&&d>1e-6){hit=true;px+=dx/d*(R-d);pz+=dz/d*(R-d);}}});
  if(x<2500){if(x-r<EXT.x0&&!(z>HZ.z0+r&&z<HZ.z1-r&&x>HZ.x0+r)){px+=EXT.x0-(x-r);hit=true;}if(x<EXT.x0){if(x-r<HZ.x0){px+=HZ.x0-(x-r);hit=true;}if(z-r<HZ.z0){pz+=HZ.z0-(z-r);hit=true;}if(z+r>HZ.z1){pz-=z+r-HZ.z1;hit=true;}}if(x+r>EXT.x1){px-=x+r-EXT.x1;hit=true;}if(z-r<EXT.z0){pz+=EXT.z0-(z-r);hit=true;}if(z+r>EXT.z1){pz-=z+r-EXT.z1;hit=true;}}
  return hit?[px,pz]:null;}
function inBld(x,z,y){let r=false;query(x,z,0,c=>{if(!r&&c.t==='b'&&x>c.x0-.3&&x<c.x1+.3&&z>c.z0-.3&&z<c.z1+.3&&(y===undefined||y<c.h+.6))r=true;});return r;}
function los(x0,z0,x1,z1){const n=Math.ceil(hyp(x1-x0,z1-z0)/3);for(let i=1;i<n;i++){const t=i/n;if(inBld(x0+(x1-x0)*t,z0+(z1-z0)*t,4))return false;}return true;}

/* ---------- build the city ---------- */
let seed=20261123;const sr=(a,b)=>{seed=(seed*16807)%2147483647;return a+((seed-1)/2147483646)*(b-a);};const spick=a=>a[Math.floor(sr(0,a.length-.001))];
const blocks=[];for(let i=0;i<N;i++)for(let j=0;j<N;j++)blocks.push({i,j,x0:road(i)+RW/2,x1:road(i+1)-RW/2,z0:road(j)+RW/2,z1:road(j+1)-RW/2,d:district(i,j)});
const BK=(i,j)=>blocks[i*N+j];
const FB={};for(const k in FAC)FB[k]=new GB();
const RB=new GB(),SWB=new GB(),GRB=new GB(),PKB=new GB(),SHB={red:new GB(),grey:new GB()},DRB=new GB();
const props={lamp:[],palm:[],tank:[],ac:[],hedge:[],bench:[],door:[],column:[],tl:[],tree:[],hydrant:[],bin:[],board:[],flood:[]};
const spots={parking:[],parkedPolice:[],driveway:[],display:[]};
const SP={shops:[]};
const shieldSigns=[];
// MISC: small coloured boxes (awnings, balconies, hoops, pumps...) merged into ONE vertex-coloured mesh at the end
const MISC=[],GLB=new GB(),_bx={};let ASPH=null;
function mbox(x0,x1,y0,y1,z0,z1,color){MISC.push({geo:_bx.g||(_bx.g=new T.BoxGeometry(1,1,1)),pos:[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],scale:[x1-x0,y1-y0,z1-z0],color});}
function shopFront(b,o){// generic shop: building at the back of the block, glass front and sign facing the south road, door marker in front
  const ix0=b.x0+SW,ix1=b.x1-SW,iz0=b.z0+SW,iz1=b.z1-SW,cx=(b.x0+b.x1)/2;const x0=ix0+(o.inset||3),x1=ix1-(o.inset||3),z0=iz0+2,z1=iz1-(o.front||14),h=o.h||8;
  FB[o.key].box(x0,x1,.25,h,z0,z1,{top:RB,uo:sr(0,1)});colB(x0,x1,z0,z1,h);
  GLB.quad([x0+2,.4,z1+.05],[x1-2,.4,z1+.05],[x1-2,3.6,z1+.05],[x0+2,3.6,z1+.05],[0,0,1],[[0,0],[1,0],[1,1],[0,1]]);
  mbox(x0+1,x1-1,3.7,4.0,z1,z1+2.2,o.awn||'#c1f354');
  shieldSigns.push([o.sign,cx,Math.min(h-1.4,6.2),z1+.07,0,Math.min(16,x1-x0-2),2,{fg:o.fg||'#fff',bg:o.bg||'#111',size:64,glow:o.glow}]);
  props.door.push([cx,.25,z1+.05,2.2,3,.12,'#20262e']);PKB.flat(ix0,ix1,.27,z1+1,iz1,6);
  const door={x:cx,z:z1+1.4};if(o.shop)SP.shops.push({id:o.shop,x:door.x,z:door.z});return{door,x0,x1,z0,z1,h};}
function houseAt(x0,x1,z0,z1,face,key,two,roof){
  const h=two?6.8:3.6;FB[key].box(x0,x1,.25,.25+h,z0,z1,{top:null,uo:sr(0,1)});
  const y0=.25+h,hr=2.4,o=.45;const zc=(z0+z1)/2,hd=(z1-z0)/2+o,s=4,sl=hyp(hd,hr);
  const R=SHB[roof];const nS=new T.Vector3(0,hd,hr).normalize(),nN=new T.Vector3(0,hd,-hr).normalize();
  R.quad([x0-o,y0,z1+o],[x1+o,y0,z1+o],[x1+o,y0+hr,zc],[x0-o,y0+hr,zc],[nS.x,nS.y,nS.z],[[0,0],[(x1-x0+2*o)/s,0],[(x1-x0+2*o)/s,sl/s],[0,sl/s]]);
  R.quad([x1+o,y0,z0-o],[x0-o,y0,z0-o],[x0-o,y0+hr,zc],[x1+o,y0+hr,zc],[nN.x,nN.y,nN.z],[[0,0],[(x1-x0+2*o)/s,0],[(x1-x0+2*o)/s,sl/s],[0,sl/s]]);
  const W=FB[key],v=y=>y/FT_H;
  W.tri([x1,y0,z1],[x1,y0,z0],[x1,y0+hr,zc],[1,0,0],[[0,v(y0)],[(z1-z0)/FT_W,v(y0)],[(z1-z0)/2/FT_W,v(y0+hr)]]);
  W.tri([x0,y0,z0],[x0,y0,z1],[x0,y0+hr,zc],[-1,0,0],[[0,v(y0)],[(z1-z0)/FT_W,v(y0)],[(z1-z0)/2/FT_W,v(y0+hr)]]);
  colB(x0,x1,z0,z1,y0+hr);
  const cx=(x0+x1)/2,fz=face<0?z0:z1;props.door.push([cx,.25,fz+face*.04,1.1,2.2,.12,'#6b4428']);
  return{door:{x:cx,z:fz+face*1.6},cx,fz};
}
for(const b of blocks){
  if(b.d==='river'){addCol({t:'b',x0:b.x0-.4,x1:b.x1+.4,z0:b.z0,z1:b.z1,h:.3});continue;}
  SWB.box(b.x0,b.x1,0,.25,b.z0,b.z1,{uw:4,uh:4,top:SWB,ts:4});
  const ix0=b.x0+SW,ix1=b.x1-SW,iz0=b.z0+SW,iz1=b.z1-SW,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
  // street lamps along the curb
  for(const s of[0,1,2,3])for(let k=1;k<=2;k++){const t=k/3;let x,z;if(s===0){x=b.x0+(b.x1-b.x0)*t;z=b.z0+.9;}else if(s===1){x=b.x0+(b.x1-b.x0)*t;z=b.z1-.9;}else if(s===2){x=b.x0+.9;z=b.z0+(b.z1-b.z0)*t;}else{x=b.x1-.9;z=b.z0+(b.z1-b.z0)*t;}props.lamp.push([x,z,s,addCol({t:'c',x,z,r:.2})]);}
  const d=b.d;
  // street furniture: hydrants and bins near the curb, street trees on calmer blocks
  if(d!=='beach'){for(let k=0;k<2;k++){const s=sr(0,1),side=Math.floor(sr(0,3.99));const t=.15+s*.7;let x,z;if(side===0){x=b.x0+(b.x1-b.x0)*t;z=b.z0+.7;}else if(side===1){x=b.x0+(b.x1-b.x0)*t;z=b.z1-.7;}else if(side===2){x=b.x0+.7;z=b.z0+(b.z1-b.z0)*t;}else{x=b.x1-.7;z=b.z0+(b.z1-b.z0)*t;}
    (k?props.bin:props.hydrant).push([x,z,side]);addCol({t:'c',x,z,r:.3});}}
  if(d==='mid'||d==='res'||d==='hospital'||d==='police'||d==='tube'||d==='school'){for(const s of[0,1,2,3])for(const t of[.5]){let x,z;if(s===0){x=b.x0+(b.x1-b.x0)*t;z=b.z0+1.3;}else if(s===1){x=b.x0+(b.x1-b.x0)*t;z=b.z1-1.3;}else if(s===2){x=b.x0+1.3;z=b.z0+(b.z1-b.z0)*t;}else{x=b.x1-1.3;z=b.z0+(b.z1-b.z0)*t;}if(sr(0,1)<.75){props.tree.push([x,z,sr(.8,1.15)]);addCol({t:'c',x,z,r:.3});}}}
  if(d==='downtown'){
    const split=sr(0,1)<.5;const parts=split?[[ix0,(ix0+ix1)/2-1,iz0,iz1],[(ix0+ix1)/2+1,ix1,iz0,iz1]]:[[ix0,ix1,iz0,iz1]];
    for(const[x0,x1,z0,z1]of parts){const m=1.5;const h=Math.round(sr(42,118)/FLOOR)*FLOOR;const key=spick(['glassBlue','glassTeal','glassBronze','glassSilver']);
      let a0=x0+m,a1=x1-m,c0=z0+m,c1=z1-m,y=.25;const tiers=h>70?3:2;
      for(let t=0;t<tiers;t++){const th=t===tiers-1?h-(y-.25):Math.round(h*(t===0?.55:.27)/FLOOR)*FLOOR;FB[key].box(a0,a1,y,y+th,c0,c1,{top:RB,uo:sr(0,1)});if(t===0)colB(a0,a1,c0,c1,h);y+=th;const ins=Math.min(a1-a0,c1-c0)*.11;a0+=ins;a1-=ins;c0+=ins;c1-=ins;}
      for(let k=0;k<3;k++)props.ac.push([sr(a0+1,a1-1),y,sr(c0+1,c1-1)]);
      if(sr(0,1)<.6&&a1-a0>9)props.board.push([a0,a1,c0,c1,y,Math.floor(sr(0,3.99))]);
    }
  }else if(d==='mid'){
    const L=(ix1-ix0)/2;
    for(let a=0;a<2;a++)for(let c=0;c<2;c++){const x0=ix0+a*L,z0=iz0+c*L;
      if(sr(0,1)<.16){PKB.flat(x0+.5,x0+L-.5,.27,z0+.5,z0+L-.5,6);spots.parking.push([x0+L/2,z0+L/2]);continue;}
      const s=[sr(.8,2.2),sr(.8,2.2),sr(.8,2.2),sr(.8,2.2)],h=Math.round(sr(10,30)/FLOOR)*FLOOR;const key=spick(['aptPink','aptMint','aptPeach','aptCream','aptLav']);
      const a0=x0+s[0],a1=x0+L-s[1],c0=z0+s[2],c1=z0+L-s[3];FB[key].box(a0,a1,.25,.25+h,c0,c1,{top:RB,uo:sr(0,1)});colB(a0,a1,c0,c1,h);
      if(sr(0,1)<.6)props.tank.push([(a0+a1)/2+sr(-2,2),.25+h,(c0+c1)/2+sr(-2,2)]);}
  }else if(d==='beach'){
    const L=(iz1-iz0)/2;
    for(let c=0;c<2;c++){const z0=iz0+c*L+1.5,z1=iz0+(c+1)*L-1.5,x0=ix0+2,x1=ix1-1;const h=Math.round(sr(11,24)/FLOOR)*FLOOR;const key=spick(['decoPink','decoTeal','decoYellow','decoWhite']);
      FB[key].box(x0,x1,.25,.25+h,z0,z1,{top:RB,uo:sr(0,1)});colB(x0,x1,z0,z1,h);
      const nm=spick(['OCEAN','FLAMINGO','PALMS','SUNSET','CORAL','MARINA','BREEZE','TROPIC','LUNA','SEAGLASS']),col=spick(['#ff5fa2','#3ef0e0','#ffd166','#b48cff']);
      shieldSigns.push([nm,x1+.06,.25+h-2.2,(z0+z1)/2,Math.PI/2,Math.min(12,z1-z0-2),2.6,{fg:col,glow:col,size:80}]);if(b.i===N-1&&b.j===9&&c===0){SP.apt={x:x0-1.6,z:(z0+z1)/2};props.door.push([x0-.05,.25,(z0+z1)/2,.12,2.6,1.6,'#2a9d8f']);}}
    for(let z=b.z0+4;z<b.z1-2;z+=9)props.palm.push([b.x1-1.6,z]);
  }else if(d==='industrial'){
    const x0=ix0+1,x1=ix1-1,z0=iz0+1,z1=iz1-(sr(0,1)<.5?12:1);const h=sr(8,13);FB.brick.box(x0,x1,.25,.25+h,z0,z1,{top:RB,uo:sr(0,1)});colB(x0,x1,z0,z1,h);
    if(z1<iz1-5){PKB.flat(x0,x1,.27,z1+1,iz1,6);spots.parking.push([x0+6,z1+6]);}
  }else if(d==='res'){
    GRB.flat(ix0,ix1,.26,iz0,iz1,6);
    const L=(ix1-ix0)/3;
    for(let row=0;row<2;row++)for(let k=0;k<3;k++){
      const lx0=ix0+k*L,face=row===0?-1:1;const hw=sr(8,9.5),hdp=sr(7.5,8.5);
      const hx0=lx0+(L-hw)/2-1.6,hx1=hx0+hw;const hz0=row===0?iz0+6:iz1-6-hdp,hz1=hz0+hdp;
      const key=spick(['houseWhite','houseBlue','houseYellow','houseSage']),roof=spick(['red','grey']);
      const hs=houseAt(hx0,hx1,hz0,hz1,face,key,sr(0,1)<.55,roof);
      const dx0=hx1+.4,dx1=Math.min(lx0+L-.3,hx1+3.6);DRB.flat(dx0,dx1,.27,row===0?iz0:hz0-0,row===0?hz1:iz1,4);
      spots.driveway.push([(dx0+dx1)/2,row===0?iz0+3:iz1-3,row===0?Math.PI:0]);
      if(k<2)props.hedge.push([lx0+L,.25,(row===0?(iz0+hz1)/2:(hz0+iz1)/2),.6,1.1,row===0?hz1-iz0:iz1-hz0]);
      if(sr(0,1)<.6)props.palm.push([lx0+1.6,row===0?iz0+2.2:iz1-2.2]);
      if(b.i===1&&b.j===10&&row===0&&k===1)SP.house={door:hs.door,x:hs.cx,z:hs.fz,bag:{x:hs.cx-3.2,z:iz0+2.6}};
    }
  }else if(d==='park'){
    GRB.flat(ix0,ix1,.26,iz0,iz1,6);SWB.flat(cx-1.6,cx+1.6,.27,iz0,iz1,4);SWB.flat(ix0,ix1,.272,cz-1.6,cz+1.6,4);
    for(let k=0;k<9;k++){const x=sr(ix0+3,ix1-3),z=sr(iz0+3,iz1-3);if(Math.abs(x-cx)<4||Math.abs(z-cz)<4)continue;props.palm.push([x,z]);}
    for(let k=0;k<12;k++){const x=sr(ix0+3,ix1-3),z=sr(iz0+3,iz1-3);if(Math.abs(x-cx)<5||Math.abs(z-cz)<5||props.palm.some(p=>hyp(p[0]-x,p[1]-z)<4))continue;props.tree.push([x,z,sr(1,1.5)]);addCol({t:'c',x,z,r:.4});}
    for(const[x,z,r]of[[cx+5,cz-2.6,0],[cx-5,cz+2.6,Math.PI],[cx-2.6,cz-6,Math.PI/2]])props.bench.push([x,z,r]);
    SP['park'+b.i+b.j]={x:cx,z:cz};if(b.i===9&&b.j===9)SP.parkMain={x:cx,z:cz};
  }else if(d==='bank'){
    const x0=ix0+3,x1=ix1-3,z0=iz0+2,z1=iz1-10;FB.stone.box(x0,x1,.25,16.2,z0,z1,{top:RB});colB(x0,x1,z0,z1,16);
    FB.stone.box(x0-.6,x1+.6,16.2,17.4,z0-.6,z1+.6,{top:RB});
    for(let k=0;k<3;k++)FB.stone.box(x0+4-k*.6,x1-4+k*.6,.25,.25+(3-k)*.3,z1,z1+6-k*1.4,{top:SWB,ts:4});
    for(let k=0;k<6;k++){const x=x0+5+k*((x1-x0-10)/5);props.column.push([x,z1+2.4]);addCol({t:'c',x,z:z1+2.4,r:.55});}
    FB.stone.box(x0+3,x1-3,13.2,15,z1,z1+3.2,{top:RB});
    shieldSigns.push(['NGÂN HÀNG NEXUS',(x0+x1)/2,14.1,z1+3.25,0,18,1.6,{fg:'#203048',size:58,bg:'rgba(0,0,0,0)'}]);
    SP.bank={door:{x:(x0+x1)/2,z:z1+1.2},front:z1};
    props.door.push([(x0+x1)/2,.25,z1+.05,3.2,4.2,.15,'#2c2418']);
  }else if(d==='police'){
    const x0=ix0+2,x1=ix1-2,z0=iz0+2,z1=iz1-14;FB.policeBlue.box(x0,x1,.25,12.2,z0,z1,{top:RB});colB(x0,x1,z0,z1,12);
    PKB.flat(ix0,ix1,.27,z1+1,iz1,6);spots.parkedPolice.push([cx-6,z1+7,Math.PI/2],[cx+6,z1+7,Math.PI/2]);
    shieldSigns.push(['CẢNH SÁT',cx,10,z1+.06,0,12,2,{fg:'#ffffff',size:70,bg:'#1f3a75'}]);
    SP.police={x:cx,z:iz1+1.5};props.door.push([cx,.25,z1+.05,2.4,3,.12,'#1b2433']);
  }else if(d==='hospital'){
    const x0=ix0+2,x1=ix1-2,z0=iz0+2,z1=iz1-9;FB.white.box(x0,x1,.25,21.8,z0,z1,{top:RB});colB(x0,x1,z0,z1,22);
    shieldSigns.push(['BỆNH VIỆN',cx,18,z1+.06,0,14,2.2,{fg:'#d62828',size:70,bg:'#ffffff'}]);
    SP.hospital={x:cx,z:iz1+1.5};SP.hospitalDoor={x:cx,z:z1+1.4};props.door.push([cx,.25,z1+.05,3,3,.12,'#8fb8d0']);
    mbox(cx-4,cx+4,3.4,3.7,z1,z1+3,'#d62828');
  }else if(d==='tube'){
    // Vietnamese tube houses: narrow, deep, different heights and colours, two rows back to back
    for(const row of[0,1]){let x=ix0;while(x<ix1-3.5){const w=Math.min(sr(4,6.2),ix1-x);const dep=sr(13,19),fl=Math.floor(sr(2,5.99)),h=.25+fl*3.2;const key=spick(['aptPink','aptMint','aptPeach','aptCream','aptLav','decoYellow','decoTeal']);
      const z0=row?iz1-dep:iz0,z1=row?iz1:iz0+dep;FB[key].box(x+.05,x+w-.05,.25,h,z0,z1,{top:RB,uo:sr(0,1)});colB(x,x+w,z0,z1,h);
      const fz=row?z1:z0,s=row?1:-1;mbox(x+.3,x+w-.3,3.2,3.45,row?fz:fz-1.6,row?fz+1.6:fz,spick(['#e63946','#2a9d8f','#e9c46a','#3a86ff','#f4a261','#6c757d']));
      for(let f=1;f<fl;f++)mbox(x+.4,x+w-.4,.25+f*3.2,.25+f*3.2+.12,row?fz:fz-.9,row?fz+.9:fz,'#d8d8d8');
      if(sr(0,1)<.5)props.ac.push([x+w/2,h,(z0+z1)/2]);props.door.push([x+w/2,.25,fz+s*.04,1.6,2.4,.1,spick(['#3b3b3b','#6b4428','#28536b'])]);x+=w;}}
  }else if(d==='school'){
    const h=.25+3*FLOOR,k='aptCream';
    FB[k].box(ix0+1,ix1-1,.25,h,iz0+1,iz0+12,{top:RB});colB(ix0+1,ix1-1,iz0+1,iz0+12,h);
    FB[k].box(ix0+1,ix0+10,.25,h,iz0+12,iz1-16,{top:RB});colB(ix0+1,ix0+10,iz0+12,iz1-16,h);
    FB[k].box(ix1-10,ix1-1,.25,h,iz0+12,iz1-16,{top:RB});colB(ix1-10,ix1-1,iz0+12,iz1-16,h);
    shieldSigns.push(['TRƯỜNG THPT NEXUS',cx,h-2,iz0+12.07,0,20,2.2,{fg:'#1d3557',bg:'#f1faee',size:60}]);
    mbox(cx-7,cx+7,.26,.3,iz1-14,iz1-1,'#3a6ea5');for(const s of[-1,1]){mbox(cx+s*6.6-.1,cx+s*6.6+.1,.3,3.4,cz+14,cz+14.2,'#eeeeee');}
    for(const z of[iz1-13.5,iz1-1.5]){mbox(cx-.08,cx+.08,.3,3,z,z+.01,'#dddddd');mbox(cx-.6,cx+.6,2.6,3.4,z-.05,z+.05,'#ffffff');}
    mbox(ix1-4,ix1-3.8,.25,10,iz1-4,iz1-3.8,'#cccccc');mbox(ix1-3.8,ix1-1.6,8.6,10,iz1-3.95,iz1-3.85,'#c1f354');addCol({t:'c',x:ix1-3.9,z:iz1-3.9,r:.2});
    SP.school={x:cx,z:iz1+1.5};
  }else if(d==='stadium'){
    GRB.flat(ix0+8,ix1-8,.26,iz0+8,iz1-8,6);mbox(cx-.1,cx+.1,.27,.29,iz0+8,iz1-8,'#ffffff');
    const st=(x0,x1,z0,z1)=>{for(let t=0;t<4;t++){const fx=(x1-x0)>(z1-z0),i0=t*1.6;if(fx){const zA=z0<cz?z1-i0-1.6:z0+i0,zB=zA+1.6;mbox(x0,x1,.25,2+t*2.4,Math.min(zA,zB),Math.max(zA,zB),t%2?'#9aa3ad':'#c0c6cc');}else{const xA=x0<cx?x1-i0-1.6:x0+i0;mbox(xA,xA+1.6,.25,2+t*2.4,z0,z1,t%2?'#9aa3ad':'#c0c6cc');}}colB(x0,x1,z0,z1,10);};
    st(ix0,ix1,iz0,iz0+7);st(ix0,cx-5,iz1-7,iz1);st(cx+5,ix1,iz1-7,iz1);st(ix0,ix0+7,iz0+7,iz1-7);st(ix1-7,ix1,iz0+7,iz1-7);
    for(const[x,z]of[[ix0+1,iz0+1],[ix1-1,iz0+1],[ix0+1,iz1-1],[ix1-1,iz1-1]]){mbox(x-.3,x+.3,.25,24,z-.3,z+.3,'#5a5f66');mbox(x-1.6,x+1.6,23,25,z-.4,z+.4,'#2a2e33');props.flood.push([x,z,24]);}
    shieldSigns.push(['SÂN VẬN ĐỘNG NEXUS',cx-14,8,iz1+.07,0,14,1.8,{fg:'#c1f354',bg:'#0b0d10',size:54}]);SP.stadium={x:cx,z:iz1+1.5};
  }else if(d==='mall'){
    const r=shopFront(b,{key:'glassTeal',h:20,inset:1,front:16,sign:'NEXUS PLAZA',fg:'#ffffff',bg:'#7b2cbf',awn:'#ad8dff',shop:'clothes'});
    for(let k=0;k<4;k++)spots.parking.push([b.x0+10+k*12,r.z1+8]);
  }else if(d==='cars'){
    const r=shopFront(b,{key:'glassSilver',h:9,inset:2,front:20,sign:'NEXUS MOTORS',fg:'#111',bg:'#c1f354',awn:'#e9edf2',shop:'cars'});
    for(let k=0;k<3;k++)spots.display.push([cx-12+k*12,r.z1+9,Math.PI*.15]);
  }else if(d==='guns'){shopFront(b,{key:'brick',h:7,inset:8,sign:'SÚNG TẦM XA',fg:'#fff',bg:'#8f1a20',awn:'#3a3a3a',shop:'guns'});}
  else if(d==='food'){shopFront(b,{key:'aptPeach',h:10,inset:6,sign:'CƠM TẤM CÔ BA',fg:'#3a2000',bg:'#ffb703',awn:'#e63946',shop:'food'});}
  else if(d==='gym'){shopFront(b,{key:'brick',h:9,inset:4,sign:'VÕ ĐƯỜNG RỒNG XANH',fg:'#ffffff',bg:'#1b4332',awn:'#2d6a4f',shop:'gym'});}
  else if(d==='garage'){shopFront(b,{key:'brick',h:8,inset:3,front:18,sign:'GARAGE SƠN MỚI',fg:'#111',bg:'#ffd166',awn:'#555b63',shop:'garage'});}
  else if(d==='gas'){
    // gas station: canopy over pumps by the road, small shop behind
    const r=shopFront(b,{key:'decoWhite',h:5,inset:10,front:24,sign:'XĂNG NEXUS · MART',fg:'#ffffff',bg:'#e63946',awn:'#e63946',shop:'mart'});
    const z0=r.z1+6,z1=iz1-2;mbox(cx-14,cx+14,5.4,6.2,z0,z1,'#f1f1f1');mbox(cx-14,cx+14,6.2,6.5,z0,z1,'#e63946');
    for(const x of[cx-12,cx+12])for(const z of[z0+1,z1-1]){mbox(x-.25,x+.25,.25,5.4,z-.25,z+.25,'#d8d8d8');addCol({t:'c',x,z,r:.35});}
    for(const x of[cx-5,cx+5]){mbox(x-.5,x+.5,.25,1.8,(z0+z1)/2-.35,(z0+z1)/2+.35,'#2b2d42');mbox(x-.4,x+.4,1.2,1.6,(z0+z1)/2+.35,(z0+z1)/2+.37,'#c1f354');addCol({t:'c',x,z:(z0+z1)/2,r:.6});}
    props.flood.push([cx-8,(z0+z1)/2,5.2],[cx+8,(z0+z1)/2,5.2]);
  }
}
// river: water strip below street level, stone embankments, bridges with railings, one cable-stayed bridge
{const WY=-1.6,SB=new GB(),xa=-1600,xb=WATER+40;
  const wg=new T.PlaneGeometry(xb-xa,RZ1-RZ0);wg.rotateX(-Math.PI/2);const rw=new T.Mesh(wg,new T.MeshStandardMaterial({color:lin('#2a6f7f'),roughness:.15,metalness:.2,envMapIntensity:1}));rw.position.set((xa+xb)/2,WY,(RZ0+RZ1)/2);rw.receiveShadow=Q.shadows;scene.add(rw);
  SB.quad([xa,-4,RZ0],[xb,-4,RZ0],[xb,0,RZ0],[xa,0,RZ0],[0,0,1],[[xa/4,-1],[xb/4,-1],[xb/4,0],[xa/4,0]]);
  SB.quad([xb,-4,RZ1],[xa,-4,RZ1],[xa,0,RZ1],[xb,0,RZ1],[0,0,-1],[[xb/4,-1],[xa/4,-1],[xa/4,0],[xb/4,0]]);
  for(let i=0;i<=N;i++){const x=road(i);SB.box(x-RW/2,x+RW/2,-.8,0,RZ0,RZ1,{uw:4,uh:4,top:null});for(const s of[-1,1]){mbox(x+s*(RW/2-.15)-.15,x+s*(RW/2-.15)+.15,0,1.05,RZ0,RZ1,'#cfd4da');}
    for(const z of[RZ0+12,RZ1-12])SB.box(x-3,x+3,-4,-.8,z-1,z+1,{uw:4,uh:4,top:null});
    for(const z of[RZ0+8,(RZ0+RZ1)/2,RZ1-8])for(const s of[-1,1])props.lamp.push([x+s*(RW/2-.4),z,s<0?3:2]);}
  addMesh(SB.geo(),new T.MeshStandardMaterial({map:TX.walk,color:lin('#9a948a'),roughness:.95}),true);
  // cable-stayed bridge: A-frame pylon over the middle of the big bridge, fans of cables to both ends
  const bx=road(BIG_BRIDGE),bz=(RZ0+RZ1)/2,TOP=46;for(const s of[-1,1]){const g=new T.BoxGeometry(1.2,TOP+2,1.6);g.translate(0,(TOP+2)/2,0);g.rotateZ(-s*.1);MISC.push({geo:g,pos:[bx+s*(RW/2+2.4),-1,bz],color:'#e9edf2'});}
  mbox(bx-RW/2-3,bx+RW/2+3,TOP-6,TOP-4.6,bz-.8,bz+.8,'#e9edf2');
  const cp=[];for(const s of[-1,1])for(let k=1;k<=7;k++)for(const e of[-1,1]){cp.push(bx+s*(RW/2+.2),TOP-2-k*.8,bz,bx+s*(RW/2-.15),1,bz+e*(4+k*3.6));}
  const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(cp,3));scene.add(new T.LineSegments(cg,new T.LineBasicMaterial({color:lin('#f4f6f8')})));
  SP.bigBridge={x:bx,z:bz};}
// ground pieces around the city and river, sand split by the river mouth
{const cx0=road(0)-RW/2,cx1=SAND0,cz0=road(0)-RW/2,cz1=road(N)+RW/2,G=new GB(),S=new GB(),R=new GB();
  G.flat(-1600,1600,-.05,-1600,cz0,20);G.flat(-1600,1600,-.05,cz1,1600,20);G.flat(-1600,cx0,-.05,cz0,RZ0,20);G.flat(-1600,cx0,-.05,RZ1,cz1,20);G.flat(cx1,1600,-.05,cz0,RZ0,20);G.flat(cx1,1600,-.05,RZ1,cz1,20);
  const ggr=addMesh(G.geo(),new T.MeshStandardMaterial({map:TX.grass,color:lin('#9fb08a'),roughness:1}),false);
  S.flat(SAND0,WATER+40,.02,-HALF-300,RZ0,6);S.flat(SAND0,WATER+40,.02,RZ1,HALF+300,6);addMesh(S.geo(),new T.MeshStandardMaterial({map:TX.sand,roughness:1}),false);
  for(let j=0;j<=N;j++)R.flat(cx0,SAND0,0,road(j)-RW/2,road(j)+RW/2,14);
  for(let i=0;i<=N;i++)for(let s=0;s<N;s++)R.flat(road(i)-RW/2,road(i)+RW/2,0,road(s)+RW/2,road(s+1)-RW/2,14);
  addMesh(R.geo(),ASPH=new T.MeshStandardMaterial({map:TX.asphalt,roughness:.92}),false);
  addCol({t:'b',x0:EXT.x0-5,x1:cx0+.4,z0:RZ0,z1:RZ1,h:.3});addCol({t:'b',x0:SAND0-.4,x1:EXT.x1+5,z0:RZ0,z1:RZ1,h:.3});}
// meshes for static city
function addMesh(geo,m,cast){const me=new T.Mesh(geo,m);me.castShadow=!!cast&&Q.shadows;me.receiveShadow=Q.shadows;scene.add(me);return me;}
const waterG=new T.PlaneGeometry(1400,2000,MOBILE?30:70,MOBILE?40:90);waterG.rotateX(-Math.PI/2);
const water=new T.Mesh(waterG,new T.MeshStandardMaterial({color:lin('#1d7f99'),roughness:.12,metalness:.25,envMapIntensity:1.1,transparent:true,opacity:.95}));water.position.set(WATER+700,.15,0);water.receiveShadow=Q.shadows;scene.add(water);
const waterBase=Float32Array.from(waterG.attributes.position.array);
addMesh(SWB.geo(),new T.MeshStandardMaterial({map:TX.walk,roughness:.9}),false);
addMesh(GRB.geo(),new T.MeshStandardMaterial({map:TX.grass,roughness:1}),false);
if(PKB.p.length)addMesh(PKB.geo(),new T.MeshStandardMaterial({map:TX.asphalt,roughness:.95}),false);
if(DRB.p.length)addMesh(DRB.geo(),new T.MeshStandardMaterial({map:TX.walk,roughness:.9}),false);
for(const k in FB)if(FB[k].p.length)addMesh(FB[k].geo(),FAC[k],true);
addMesh(RB.geo(),ROOF,true);
for(const k in SHB)if(SHB[k].p.length)addMesh(SHB[k].geo(),SHINGLE[k],true);
for(const s of shieldSigns)sign(...s);
if(MISC.length)addMesh(buildVC(MISC),new T.MeshStandardMaterial({vertexColors:true,roughness:.75}),true);
if(GLB.p.length)addMesh(GLB.geo(),GLASS,false);
// road markings
{const Y=new GB(),Wt=new GB();const yv=.03;
  for(let k=0;k<=N;k++){const c=road(k);for(let s=0;s<N;s++){const a=road(s)+RW/2+2,b=road(s+1)-RW/2-2;
      Y.flat(c-.22,c-.08,yv,a,b,99);Y.flat(c+.08,c+.22,yv,a,b,99);Y.flat(a,b,yv,c-.22,c-.08,99);Y.flat(a,b,yv,c+.08,c+.22,99);
      Wt.flat(c-RW/2+.3,c-.3,yv,b-.6,b-.2,99);Wt.flat(c+.3,c+RW/2-.3,yv,a+.2,a+.6,99);Wt.flat(b-.6,b-.2,yv,c+.3,c+RW/2-.3,99);Wt.flat(a+.2,a+.6,yv,c-RW/2+.3,c-.3,99);
    }
    for(let s=0;s<=N;s++){const zc=road(s);for(let q=-RW/2+1;q<RW/2-1;q+=1.6){Wt.flat(c+q,c+q+.8,yv,zc+RW/2-.2+.4,zc+RW/2+1.8,99);Wt.flat(c+q,c+q+.8,yv,zc-RW/2-1.8,zc-RW/2-.2,99);Wt.flat(zc+RW/2+.2,zc+RW/2+1.8,yv,c+q,c+q+.8,99);Wt.flat(zc-RW/2-1.8,zc-RW/2-.2,yv,c+q,c+q+.8,99);}}
  }
  addMesh(Y.geo(),mat('#e8c24a',.7),false);addMesh(Wt.geo(),mat('#e9e6df',.7),false);}
// instanced props
const dummy=new T.Object3D();const LIM={},LAMPS=[];let LAMPGLOW=null;
function inst(geo,m,list,fn,cast){if(!list.length)return null;const im=new T.InstancedMesh(geo,m,list.length);list.forEach((p,i)=>{dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);fn(p,dummy,i);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);});im.castShadow=!!cast&&Q.shadows;im.receiveShadow=Q.shadows;scene.add(im);return im;}
{const pole=new T.CylinderGeometry(.08,.12,6.2,8);pole.translate(0,3.1,0);const arm=new T.BoxGeometry(.1,.1,1.6);arm.translate(0,6.1,.75);const head=new T.BoxGeometry(.45,.18,.7);head.translate(0,6.0,1.45);
  const rot=s=>s===0?Math.PI:s===1?0:s===2?-Math.PI/2:Math.PI/2;
  const place=(p,d)=>{d.position.set(p[0],.25,p[1]);d.rotation.y=rot(p[2]);};
  LIM.pole=inst(pole,mat('#3a3d42',.5,.6),props.lamp,place,true);LIM.arm=inst(arm,mat('#3a3d42',.5,.6),props.lamp,place,false);LIM.head=inst(head,emat('#ffd9a0',1.6),props.lamp,place,false);LIM.off=inst(head,mat('#2a2c30',.6,.5),props.lamp,(p,d)=>{d.position.set(p[0],-60,p[1]);d.scale.set(.001,.001,.001);},false);for(const k in LIM)if(LIM[k]){LIM[k].frustumCulled=false;LIM[k].instanceMatrix.setUsage(T.DynamicDrawUsage);}props.lamp.forEach((p,i)=>{const col=p[3]||addCol({t:'c',x:p[0],z:p[1],r:.2});col.lamp=i;LAMPS.push({i,x:p[0],z:p[1],s:p[2],col,down:0,t:0,ang:0,yaw:rot(p[2])});});}
{const tr=new T.CylinderGeometry(.18,.32,8.5,7,8);const p=tr.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i)+4.25;p.setX(i,p.getX(i)+Math.pow(y/8.5,2)*1.1);}tr.translate(0,4.25,0);tr.computeVertexNormals();
  const fr=[];for(let k=0;k<9;k++){const g=new T.PlaneGeometry(1.25,4.2,1,6);const q=g.attributes.position;for(let i=0;i<q.count;i++){const v=(q.getY(i)+2.1)/4.2;q.setZ(i,-v*v*1.6);}g.translate(0,2.1,0);g.rotateX(-Math.PI/2+.5);g.rotateY(k/9*Math.PI*2+rnd(-.2,.2));g.translate(1.1,8.5,0);fr.push(g);}
  const frG=mergeGeos(fr);frG.computeVertexNormals();
  const place=(p,d,i)=>{d.position.set(p[0],.25,p[1]);d.rotation.y=(i*2.39)%6.28;const s=.85+((i*37)%30)/100;d.scale.set(s,s,s);};
  inst(tr,mat('#8a6a4a',.95),props.palm,place,true);
  inst(frG,new T.MeshStandardMaterial({map:TX.leaf,alphaTest:.45,side:T.DoubleSide,roughness:.8}),props.palm,place,true);
  for(const p of props.palm)addCol({t:'c',x:p[0]+.6,z:p[1],r:.35});}
{const g=new T.CylinderGeometry(1.1,1.1,2.4,12);g.translate(0,1.2,0);inst(g,mat('#9a9ca0',.6,.4),props.tank,(p,d)=>d.position.set(p[0],p[1],p[2]),true);
  const a=new T.BoxGeometry(2.2,1.3,1.6);a.translate(0,.65,0);inst(a,mat('#b9bbbe',.6,.3),props.ac,(p,d)=>d.position.set(p[0],p[1],p[2]),true);
  const hb=new T.BoxGeometry(1,1,1);hb.translate(0,.5,0);inst(hb,mat('#3f6b30',1),props.hedge,(p,d)=>{d.position.set(p[0],p[1],p[2]);d.scale.set(p[3],p[4],p[5]);},true);
  const bn=new T.BoxGeometry(1.8,.5,.55);bn.translate(0,.45,0);inst(bn,mat('#7a5232',.8),props.bench,(p,d)=>{d.position.set(p[0],.26,p[1]);d.rotation.y=p[2];},true);
  const col=new T.CylinderGeometry(.5,.55,12.8,14);col.translate(0,7,0);inst(col,mat('#eee6d6',.7),props.column,(p,d)=>d.position.set(p[0],.25,p[1]),true);
  const dg=new T.BoxGeometry(1,1,1);dg.translate(0,.5,0);props.door.forEach(p=>{const m=new T.Mesh(dg,mat(p[6],.6));m.position.set(p[0],p[1],p[2]);m.scale.set(p[3],p[4],p[5]);scene.add(m);});}
/* ---------- west hills: real terrain with a winding mountain road up to a lookout ---------- */
{const X0=HZ.x0,Z0=HZ.z0,ST=4,NX=Math.round((HZ.x1-X0)/ST)+1,NZ=Math.round((HZ.z1-Z0)/ST)+1;
  const ss=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  const nz=(x,z)=>Math.sin(x*.021+z*.013)*.5+Math.sin(x*.047-z*.039+1.3)*.3+Math.sin(x*.11+z*.09+2.1)*.12;
  const mask=(x,z)=>ss(HZ.x1,HZ.x1-70,x)*ss(HZ.x0,HZ.x0+50,x)*ss(HZ.z0,HZ.z0+60,z)*ss(HZ.z1,HZ.z1-45,z);
  const nat=(x,z)=>{const d=hyp(x+705,z-285)/300;const dome=Math.max(0,1-d*d);return mask(x,z)*(78*dome+12*nz(x,z)*dome+6*nz(z*1.7,x*1.3));};
  /* road centre line: Catmull-Rom through hand-placed points, resampled every 2 m */
  const CP=[[-452,128],[-472,128],[-520,131],[-572,150],[-607,196],[-614,256],[-592,307],[-548,338],[-516,378],[-528,423],[-586,446],[-656,442],[-712,408],[-744,348],[-748,282],[-728,218],[-694,184]];
  const raw=[];for(let k=0;k<CP.length-1;k++){const p0=CP[Math.max(0,k-1)],p1=CP[k],p2=CP[k+1],p3=CP[Math.min(CP.length-1,k+2)];
    for(let t=0;t<1;t+=1/40){const t2=t*t,t3=t2*t;raw.push([.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
  raw.push(CP[CP.length-1]);
  const RP=[raw[0]];let acc=0;for(let k=1;k<raw.length;k++){const a=raw[k-1],b=raw[k],l=hyp(b[0]-a[0],b[1]-a[1]);acc+=l;if(acc>=2){RP.push(b);acc=0;}}
  const n=RP.length,DS=2;
  /* road heights follow the hill, smoothed, with a 9 % grade limit; flat where it meets the city */
  let h=RP.map(p=>nat(p[0],p[1]));for(let pass=0;pass<4;pass++){const o=h.slice();for(let i=0;i<n;i++){let s=0,c=0;for(let k=-25;k<=25;k++){const j=i+k;if(j>=0&&j<n){s+=o[j];c++;}}h[i]=s/c;}}
  for(let i=0;i<14;i++)h[i]=0;const G=.09*DS;for(let i=1;i<n;i++)h[i]=clamp(h[i],h[i-1]-G,h[i-1]+G);for(let i=n-2;i>=0;i--)h[i]=clamp(h[i],h[i+1]-G,h[i+1]+G);for(let i=0;i<14;i++)h[i]=0;
  const TOP=h[n-1],PC=RP[n-1],PR=17;
  /* height grid: natural hill, blended into the road band and the lookout plaza */
  const HG=new Float32Array(NX*NZ),RW2=5,BL=16;
  for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){const x=X0+ix*ST,z=Z0+iz*ST;let v=nat(x,z),bd=1e9,bh=0;
    let bi=0;for(let i=0;i<n;i+=1){const dx=x-RP[i][0],dz=z-RP[i][1],d2=dx*dx+dz*dz;if(d2<bd){bd=d2;bi=i;}}bh=h[bi];
    for(const j of[bi-1,bi]){if(j<0||j>=n-1)continue;const ax=RP[j][0],az=RP[j][1],ex=RP[j+1][0]-ax,ez=RP[j+1][1]-az,L2=ex*ex+ez*ez||1,t=clamp(((x-ax)*ex+(z-az)*ez)/L2,0,1),qx=ax+ex*t-x,qz=az+ez*t-z,d2=qx*qx+qz*qz;if(d2<=bd){bd=d2;bh=h[j]+(h[j+1]-h[j])*t;}}
    const d=Math.sqrt(bd);if(d<RW2+BL){const w=1-ss(RW2+1.5,RW2+BL,d);v=v*(1-w)+bh*w;}
    const dp=hyp(x-PC[0],z-PC[1]);if(dp<PR+12){const w=1-ss(PR,PR+12,dp);v=v*(1-w)+TOP*w;}
    if(x>HZ.x1-8)v*=ss(HZ.x1,HZ.x1-8,x);HG[iz*NX+ix]=Math.max(.04,v);}
  HGRID={X0,Z0,ST,NX,NZ,H:HG};
  /* terrain mesh with grass, dirt near the road and rock on steep slopes */
  const pos=[],nor=[],uv=[],col=[],idx=[];const gc=new T.Color(),rock=new T.Color('#8c8478'),dirt=new T.Color('#a38c66'),gA=new T.Color('#88a36a'),gB=new T.Color('#5f7f45');
  for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){const x=X0+ix*ST,z=Z0+iz*ST,y=HG[iz*NX+ix];pos.push(x,y,z);uv.push(x/6,z/6);
    const hx=HG[iz*NX+Math.min(NX-1,ix+1)]-HG[iz*NX+Math.max(0,ix-1)],hz=HG[Math.min(NZ-1,iz+1)*NX+ix]-HG[Math.max(0,iz-1)*NX+ix];const nn=new T.Vector3(-hx,2*ST,-hz).normalize();nor.push(nn.x,nn.y,nn.z);
    const slope=1-nn.y;gc.copy(gA).lerp(gB,clamp(.5+nz(x*2,z*2),0,1));gc.lerp(rock,clamp((slope-.12)*4,0,1));
    let bd=1e9;for(let i=0;i<n;i+=3){const dx=x-RP[i][0],dz=z-RP[i][1];bd=Math.min(bd,dx*dx+dz*dz);}if(bd<(RW2+5)*(RW2+5))gc.lerp(dirt,.55);col.push(gc.r,gc.g,gc.b);}
  for(let iz=0;iz<NZ-1;iz++)for(let ix=0;ix<NX-1;ix++){const a=iz*NX+ix,b=a+1,c=a+NX,d=c+1;idx.push(a,c,b,b,c,d);}
  const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(pos,3));tg.setAttribute('normal',new T.Float32BufferAttribute(nor,3));tg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));tg.setAttribute('color',new T.Float32BufferAttribute(col,3));tg.setIndex(idx);tg.computeBoundingSphere();
  addMesh(tg,new T.MeshStandardMaterial({map:TX.grass,vertexColors:true,roughness:1}),false).receiveShadow=Q.shadows;
  /* road ribbon, gravel shoulders, lines, guard rails */
  const RD=new GB(),SH=new GB(),YL=new GB(),WL=new GB(),RL=new GB(),W=RW2*.9;const posts=[];
  const side=(i,off)=>{const a=RP[Math.max(0,i-1)],b=RP[Math.min(n-1,i+1)],tx=b[0]-a[0],tz=b[1]-a[1],l=hyp(tx,tz)||1;return[RP[i][0]+(-tz/l)*off,RP[i][1]+(tx/l)*off];};
  const strip=(gb,o0,o1,dy,ts,from,to,every)=>{for(let i=from;i<to;i++){if(every&&Math.floor(i/every)%2)continue;const y0=h[i]+dy,y1=h[i+1]+dy;const a0=side(i,o0),a1=side(i,o1),b0=side(i+1,o0),b1=side(i+1,o1);
    const v=[[a0[0],y0,a0[1]],[a1[0],y0,a1[1]],[b1[0],y1,b1[1]],[b0[0],y1,b0[1]]];const cr=(v[1][0]-v[0][0])*(v[3][2]-v[0][2])-(v[1][2]-v[0][2])*(v[3][0]-v[0][0]);const q=cr<0?v:[v[0],v[3],v[2],v[1]];
    const s0=i*DS/ts,s1=(i+1)*DS/ts;gb.quad(q[0],q[1],q[2],q[3],[0,1,0],cr<0?[[0,s0],[1,s0],[1,s1],[0,s1]]:[[0,s0],[0,s1],[1,s1],[1,s0]]);}};
  strip(RD,-W,W,.07,8,0,n-1);strip(SH,-W-1.4,-W,.05,6,0,n-1);strip(SH,W,W+1.4,.05,6,0,n-1);
  strip(YL,-.16,-.04,.085,4,10,n-1);strip(YL,.04,.16,.085,4,10,n-1);strip(WL,-W+.15,-W+.3,.085,4,10,n-1);strip(WL,W-.3,W-.15,.085,4,10,n-1);
  const rail=(off)=>{for(let i=16;i<n-1;i++){const a=side(i,off),b=side(i+1,off);for(const[y0,y1]of[[.52,.78]]){const p0=[a[0],h[i]+y0,a[1]],p1=[b[0],h[i+1]+y0,b[1]],p2=[b[0],h[i+1]+y1,b[1]],p3=[a[0],h[i]+y1,a[1]];const tx=b[0]-a[0],tz=b[1]-a[1],l=hyp(tx,tz)||1;
      RL.quad(p0,p1,p2,p3,[-tz/l,0,tx/l],[[i/2,0],[(i+1)/2,0],[(i+1)/2,1],[i/2,1]]);RL.quad(p1,p0,p3,p2,[tz/l,0,-tx/l],[[0,0],[1,0],[1,1],[0,1]]);}
      if(i%2===0){posts.push([a[0],h[i],a[1]]);addCol({t:'c',x:a[0],z:a[1],r:.3});}}};
  rail(W+1.9);rail(-W-1.9);
  addMesh(RD.geo(),ASPH,false);addMesh(SH.geo(),new T.MeshStandardMaterial({map:TX.gravel,color:lin('#b8ab95'),roughness:1}),false);
  addMesh(YL.geo(),mat('#e8c24a',.7),false);addMesh(WL.geo(),mat('#e9e6df',.7),false);addMesh(RL.geo(),new T.MeshStandardMaterial({color:lin('#c3c8ce'),roughness:.35,metalness:.85,side:T.DoubleSide}),true);
  const pg=new T.BoxGeometry(.14,.85,.14);pg.translate(0,.42,0);const pim=inst(pg,mat('#9aa0a6',.4,.7),posts,(p,d)=>d.position.set(p[0],p[1],p[2]),true);if(pim)pim.frustumCulled=false;
  /* lookout plaza: stone floor, low wall with railing, benches, telescope, lamp posts */
  {const pl=new T.CircleGeometry(PR,48);pl.rotateX(-Math.PI/2);const m=new T.Mesh(pl,new T.MeshStandardMaterial({map:TX.walk,color:lin('#d8cfbf'),roughness:.9}));m.position.set(PC[0],TOP+.08,PC[1]);m.receiveShadow=Q.shadows;scene.add(m);
    const wall=new T.TorusGeometry(PR,.35,8,64,Math.PI*1.55);wall.rotateX(Math.PI/2);wall.rotateY(Math.PI*.22);const wm=new T.Mesh(wall,mat('#cfc6b6',.85));wm.position.set(PC[0],TOP+.45,PC[1]);wm.castShadow=Q.shadows;scene.add(wm);
    const tel=new T.Group();const tb1=new T.Mesh(new T.CylinderGeometry(.06,.09,1.1,10),mat('#4a4e55',.4,.7));tb1.position.y=.55;tel.add(tb1);const tb2=new T.Mesh(new T.CylinderGeometry(.12,.16,.7,12),mat('#2f6fa6',.4,.5));tb2.rotation.z=Math.PI/2-.2;tb2.position.set(.15,1.2,0);tel.add(tb2);tel.position.set(PC[0]+PR*.55,TOP+.08,PC[1]-PR*.2);tel.rotation.y=-.6;scene.add(tel);
    {const bg=new T.BoxGeometry(1.8,.12,.5);bg.translate(0,.45,0);const bb=new T.BoxGeometry(1.8,.5,.08);bb.translate(0,.75,-.22);const bl=new T.BoxGeometry(.1,.45,.45);bl.translate(0,.22,0);const geo=mergeGeos([bg,bb,bl.clone().translate(-.75,0,0),bl.translate(.75,0,0)]);geo.computeVertexNormals();
      for(const a of[.4,1.1,2.1]){const b=new T.Mesh(geo,mat('#7a5232',.8));b.position.set(PC[0]+Math.cos(a)*(PR-3),TOP+.08,PC[1]+Math.sin(a)*(PR-3));b.rotation.y=Math.atan2(PC[0]-b.position.x,PC[1]-b.position.z)+Math.PI;b.castShadow=Q.shadows;scene.add(b);addCol({t:'c',x:b.position.x,z:b.position.z,r:.7});}}
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2+.3;props.flood.push([PC[0]+Math.cos(a)*(PR-1.2),PC[1]+Math.sin(a)*(PR-1.2),TOP+4.2]);}
    SP.lookout={x:PC[0],z:PC[1],y:TOP};}
  /* hillside letters facing the city and a road sign at the foot of the climb */
  {const lx=-596,lz=232,ly=heightAt(lx,lz);sign('NEXUS',lx+2,ly+6,lz,Math.PI/2,46,12,{fg:'#ffffff',size:200,w:1024,h:256,font:'"Space Grotesk",Inter,system-ui,sans-serif'});}
  sign('ĐÈO NEXUS · ĐIỂM NGẮM CẢNH',-478,4.2,121,Math.PI/2,8,1.2,{fg:'#ffffff',bg:'#2f7a46',size:52,w:1024,h:150});
  {const ph=new T.CylinderGeometry(.08,.08,3.6,8);ph.translate(0,1.8,0);const mm=new T.Mesh(ph,mat('#8a8f96',.5,.6));mm.position.set(-478,0,121);scene.add(mm);}
  /* pine forest: trunk and two cones per tree, away from the road */
  {const trees=[];const rng=(()=>{let s=7;return()=>{s=(s*16807)%2147483647;return s/2147483647;};})();
    for(let k=0;k<(MOBILE?260:620);k++){const x=X0+rng()*(HZ.x1-X0-30),z=Z0+rng()*(HZ.z1-Z0);if(mask(x,z)<.25)continue;let bd=1e9;for(let i=0;i<n;i+=4){const dx=x-RP[i][0],dz=z-RP[i][1];bd=Math.min(bd,dx*dx+dz*dz);}if(bd<15*15)continue;if(hyp(x-PC[0],z-PC[1])<PR+8)continue;
      const y=heightAt(x,z);if(heightAt(x+3,z)-y>2.4||heightAt(x,z+3)-y>2.4)continue;trees.push([x,y,z,.8+rng()*.7]);if(bd<60*60)addCol({t:'c',x,z,r:.45});}
    const tr=new T.CylinderGeometry(.18,.28,3,6);tr.translate(0,1.5,0);const c1=new T.ConeGeometry(2.2,4.2,8);c1.translate(0,4.2,0);const c2=new T.ConeGeometry(1.6,3.4,8);c2.translate(0,6.4,0);const cones=mergeGeos([c1,c2]);cones.computeVertexNormals();
    const pl=(p,d,i)=>{d.position.set(p[0],p[1]-.1,p[2]);d.scale.setScalar(p[3]);d.rotation.y=i*1.7;};
    const a=inst(tr,mat('#5a4030',.95),trees,pl,true),b=inst(cones,mat('#2f5a34',.9),trees,pl,true);if(a)a.frustumCulled=false;if(b)b.frustumCulled=false;}
  HZ.road=RP;HZ.roadH=h;}
/* ---------- extra city dressing (all instanced or merged: a handful of draw calls) ---------- */
const VCM=new T.MeshStandardMaterial({vertexColors:true,roughness:.85}),VCMI=new T.MeshStandardMaterial({vertexColors:true,roughness:.85});
// round street/park trees: trunk + lumpy canopy merged into one vertex-coloured geometry, one InstancedMesh
{const can=new T.IcosahedronGeometry(1.9,1);const cp=can.attributes.position;for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),k=1+Math.sin(x*3.1+z*2.3)*.12+Math.cos(y*4.2)*.08;cp.setXYZ(i,x*k,y*k*.85,z*k);}can.computeVertexNormals();
  const can2=new T.IcosahedronGeometry(1.3,1);
  const g=buildVC([{geo:new T.CylinderGeometry(.16,.24,3.2,7),pos:[0,1.6,0],color:'#6b4c34'},{geo:can,pos:[0,4.2,0],color:'#4f8a3a'},{geo:can2,pos:[.9,3.6,.5],color:'#5d9a42'},{geo:can2,pos:[-.8,4.9,-.4],color:'#46803a'}]);
  const im=inst(g,VCMI,props.tree,(p,d,i)=>{d.position.set(p[0],.25,p[1]);d.rotation.y=i*1.7;d.scale.setScalar(p[2]);},true);
  if(im){const c=new T.Color();props.tree.forEach((p,i)=>{c.setHSL(.2+((i*13)%10)/90,.25+((i*7)%10)/50,.72+((i*11)%10)/60);c.multiplyScalar(1.25);im.setColorAt(i,c);});im.instanceColor.needsUpdate=true;}}
// hydrants and bins
{const hy=buildVC([{geo:new T.CylinderGeometry(.16,.18,.7,10),pos:[0,.35,0],color:'#c8281e'},{geo:new T.SphereGeometry(.17,10,6,0,Math.PI*2,0,Math.PI/2),pos:[0,.7,0],color:'#c8281e'},{geo:new T.CylinderGeometry(.06,.06,.42,6).rotateZ(Math.PI/2),pos:[0,.48,0],color:'#d8d8d8'}]);
  inst(hy,VCM,props.hydrant,(p,d)=>d.position.set(p[0],.25,p[1]),true);
  const bn=buildVC([{geo:new T.CylinderGeometry(.32,.27,.95,12),pos:[0,.475,0],color:'#2f6b4a'},{geo:new T.CylinderGeometry(.35,.35,.08,12),pos:[0,.98,0],color:'#24302a'}]);
  inst(bn,VCM,props.bin,(p,d)=>d.position.set(p[0],.25,p[1]),true);}
// rooftop billboards with original ads, one atlas texture
{const ADS=[['NEXUS COLA','Mát lạnh cả ngày','#e63946','#ffffff'],['SONICDECK','Nhạc mới mỗi tuần','#1a1036','#c9b6ff'],['BÁNH MÌ CÔ BA','Nóng giòn 24/7','#ffb703','#3a2000'],['TRÀ SỮA MÂY','Mua 1 tặng 1','#ffd6e8','#7a1f4a'],['THE 7-VAULT','Đề cương miễn phí','#0d1b12','#c1f354'],['XE ĐIỆN VOLTA','Lái thử hôm nay','#0b5394','#ffffff'],['COURTDRAFT','Rủ trận 5v5 chiều nay','#f4a261','#1d1d1d'],['PHỞ ĐÊM','Mở tới 3 giờ sáng','#14213d','#ffd166']];
  const atlas=makeTex(1024,1024,(g)=>{ADS.forEach((a,i)=>{const x=(i%2)*512,y=Math.floor(i/2)*256;const gr=g.createLinearGradient(x,y,x+512,y+256);gr.addColorStop(0,a[2]);gr.addColorStop(1,a[2]+'cc');g.fillStyle=gr;g.fillRect(x,y,512,256);
    g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=8;g.strokeRect(x+10,y+10,492,236);g.fillStyle=a[3];g.textAlign='center';g.textBaseline='middle';g.font='800 64px "Space Grotesk",Inter,sans-serif';g.fillText(a[0],x+256,y+108,470);g.font='600 32px Inter,sans-serif';g.globalAlpha=.85;g.fillText(a[1],x+256,y+176,470);g.globalAlpha=1;});},{repeat:false});
  const FB2=new GB(),MB=new GB();
  props.board.forEach((p,i)=>{const[a0,a1,c0,c1,y,dir]=p,ad=i%ADS.length,u0=(ad%2)/2,u1=u0+.5,v1=1-Math.floor(ad/2)/4,v0=v1-.25,uv=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
    const along=dir<2?a1-a0:c1-c0,w=Math.min(14,along*.8),h=w/2,y0=y+2.2,y1=y0+h;
    if(dir<2){const xc=(a0+a1)/2,x0=xc-w/2,x1=xc+w/2,z=dir===0?c1-1.2:c0+1.2,s=dir===0?1:-1;
      MB.box(x0-.2,x1+.2,y0-.2,y1+.2,z-.25,z,{top:MB});for(const px of[x0+1,x1-1])MB.box(px-.15,px+.15,y,y0,z-.3,z-.05,{top:null});
      if(s>0)FB2.quad([x0,y0,z+.02],[x1,y0,z+.02],[x1,y1,z+.02],[x0,y1,z+.02],[0,0,1],uv);else FB2.quad([x1,y0,z-.27],[x0,y0,z-.27],[x0,y1,z-.27],[x1,y1,z-.27],[0,0,-1],uv);}
    else{const zc=(c0+c1)/2,z0=zc-w/2,z1=zc+w/2,x=dir===2?a1-1.2:a0+1.2,s=dir===2?1:-1;
      MB.box(x-.25,x,y0-.2,y1+.2,z0-.2,z1+.2,{top:MB});for(const pz of[z0+1,z1-1])MB.box(x-.3,x-.05,y,y0,pz-.15,pz+.15,{top:null});
      if(s>0)FB2.quad([x+.02,y0,z1],[x+.02,y0,z0],[x+.02,y1,z0],[x+.02,y1,z1],[1,0,0],uv);else FB2.quad([x-.27,y0,z0],[x-.27,y0,z1],[x-.27,y1,z1],[x-.27,y1,z0],[-1,0,0],uv);}});
  if(FB2.p.length){const bm=new T.MeshStandardMaterial({map:atlas,emissiveMap:atlas,emissive:new T.Color(1,1,1),emissiveIntensity:.6,roughness:.6});bm.userData.baseE=.6;NIGHTM.push(bm);addMesh(FB2.geo(),bm,false);addMesh(MB.geo(),mat('#4a4f57',.5,.5),true);}}
// beach Ferris wheel (spins slowly) and a pier out over the water
const FW={x:SAND0+40,z:-HALF+96,y:19,R:15};
{const legs=[];for(const sx of[-2.6,2.6])for(const sz of[-1,1]){const L=hyp(FW.y,8.5);const g=new T.BoxGeometry(.5,L,.5);g.translate(0,L/2,0);g.rotateX(sz*Math.atan2(8.5,FW.y));legs.push({geo:g,pos:[sx,0,-sz*8.5],color:'#e9edf2'});}
  legs.push({geo:new T.CylinderGeometry(.5,.5,5.8,12).rotateZ(Math.PI/2),pos:[0,FW.y,0],color:'#b9c0c8'});
  const base=new T.Mesh(buildVC(legs),VCM);base.position.set(FW.x,.02,FW.z);base.castShadow=Q.shadows;scene.add(base);
  for(const sx of[-2.6,2.6])for(const sz of[-8.5,8.5])addCol({t:'c',x:FW.x+sx,z:FW.z+sz,r:.5});
  const wp=[];for(const sx of[-1.2,1.2]){wp.push({geo:new T.TorusGeometry(FW.R,.22,6,64).rotateY(Math.PI/2),pos:[sx,0,0],color:'#f4f6f8'});wp.push({geo:new T.TorusGeometry(FW.R*.55,.14,6,40).rotateY(Math.PI/2),pos:[sx,0,0],color:'#f4f6f8'});
    for(let k=0;k<16;k++){const g=new T.BoxGeometry(.14,FW.R,.14);g.translate(0,FW.R/2,0);g.rotateX(k/16*Math.PI*2);wp.push({geo:g,pos:[sx,0,0],color:'#dfe4ea'});}}
  const wheel=new T.Mesh(buildVC(wp),VCM);const bulbs=new T.Mesh(new T.TorusGeometry(FW.R+.25,.12,4,64).rotateY(Math.PI/2),emat('#ff7ad9',1.4));
  FW.g=new T.Group();FW.g.add(wheel,bulbs);FW.g.position.set(FW.x,FW.y,FW.z);scene.add(FW.g);FW.bulbs=bulbs.material;
  const cab=buildVC([{geo:new T.BoxGeometry(1.9,1.6,1.6),pos:[0,-1.2,0],color:'#ff5fa2'},{geo:new T.BoxGeometry(2.1,.15,1.8),pos:[0,-.35,0],color:'#ffffff'}]);
  FW.cabs=new T.InstancedMesh(cab,VCMI,12);FW.cabs.castShadow=Q.shadows;scene.add(FW.cabs);
  const cc=new T.Color();for(let k=0;k<12;k++){cc.set(['#ff5fa2','#3ef0e0','#ffd166','#b48cff'][k%4]).multiplyScalar(1.6);FW.cabs.setColorAt(k,cc);}FW.cabs.instanceColor.needsUpdate=true;
  const pier=new GB();const pz=HALF-70,px0=WATER-4,px1=WATER+120;pier.box(px0,px1,1.1,1.5,pz-5,pz+5,{uw:4,uh:4,top:pier,ts:3});
  for(let x=px0+4;x<px1;x+=8)for(const s of[-4.4,4.4])pier.box(x-.25,x+.25,-2,1.1,pz+s-.25,pz+s+.25,{uw:4,uh:4,top:null});
  for(const s of[-4.9,4.9])pier.box(px0,px1,1.5,2.4,pz+s-.08,pz+s+.08,{uw:4,uh:4,top:pier,ts:3});
  addMesh(pier.geo(),new T.MeshStandardMaterial({map:TX.walk,color:lin('#b08a64'),roughness:.9}),true);FW.pier={x0:px0,x1:px1,z:pz};}
function fwUpdate(dt){const a=time*.06;FW.g.children[0].rotation.x=a;FW.g.children[1].rotation.x=a;if(hyp(FW.x-P.x,FW.z-P.z)>Q.cull+120)return;
  for(let k=0;k<12;k++){const t=a+k/12*Math.PI*2;dummy.position.set(FW.x,FW.y+Math.cos(t)*FW.R,FW.z+Math.sin(t)*FW.R);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();FW.cabs.setMatrixAt(k,dummy.matrix);}FW.cabs.instanceMatrix.needsUpdate=true;}
// distant hills ring (land side only), haze-blended in display space like the sky
const hillMat=new T.ShaderMaterial({fog:false,side:T.DoubleSide,uniforms:{haze:{value:new T.Color('#ffc48c')},hk:{value:.45},lk:{value:1}},
  vertexShader:'attribute vec3 color;varying vec3 vC;varying float vH;void main(){vC=color;vH=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 haze;uniform float hk,lk;varying vec3 vC;varying float vH;void main(){float k=clamp(hk+(1.-smoothstep(0.,90.,vH))*.25,0.,1.);gl_FragColor=vec4(mix(vC*lk,haze,k),1.);}'});
{const SEG=180,RR=[800,880,990,1120,1260],pos=[],col=[],idx=[];const fb=a=>{let v=0,amp=1,f=1;for(let o=0;o<4;o++){v+=amp*(Math.sin(a*f*3+o*1.7)*.5+Math.sin(a*f*7.3+o*4.1)*.3+.8);amp*=.5;f*=2.1;}return v/3;};
  const L=new T.Vector3(.6,.7,-.4).normalize();
  for(let s=0;s<=SEG;s++){const a=s/SEG*Math.PI*2,cx=Math.cos(a),cz=Math.sin(a),w=clamp((.25-cx)/.45,0,1),w2=w*w*(3-2*w),H=(70+150*fb(a))*w2;
    const prof=[0,.55,1,.75,.35];RR.forEach((r,k)=>{const jitter=k===0||k===4?0:fb(a*2.3+k)*30;pos.push(cx*(r+jitter),H*prof[k]*(k===2?1+.25*Math.sin(a*11):1)-2,cz*(r+jitter));});}
  for(let s=0;s<SEG;s++)for(let k=0;k<RR.length-1;k++){const a=s*RR.length+k,b=a+RR.length;idx.push(a,b,a+1,a+1,b,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  const nr=g.attributes.normal,pp=g.attributes.position,lo=new T.Color('#6f8a4c'),mid2=new T.Color('#8a7a55'),hi=new T.Color('#b0a28a'),c=new T.Color();
  for(let i=0;i<pp.count;i++){const y=pp.getY(i),sg=nr.getY(i)<0?-1:1,nl=Math.max(0,sg*(nr.getX(i)*L.x+nr.getY(i)*L.y+nr.getZ(i)*L.z));c.copy(lo).lerp(mid2,clamp(y/90,0,1)).lerp(hi,clamp((y-90)/80,0,1));c.multiplyScalar(.45+.6*nl);col.push(c.r,c.g,c.b);}
  g.setAttribute('color',new T.Float32BufferAttribute(col,3));const m=new T.Mesh(g,hillMat);m.frustumCulled=false;scene.add(m);}
// soft glow sprites for street lamps (and the pier), faded in at night
const glowTex=makeTex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,240,210,1)');r.addColorStop(.25,'rgba(255,200,130,.55)');r.addColorStop(1,'rgba(255,170,90,0)');g.fillStyle=r;g.fillRect(0,0,64,64);},{repeat:false});
const glowMat=new T.PointsMaterial({size:4.2,map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,sizeAttenuation:true});
{const gp=[];const rot=s=>s===0?Math.PI:s===1?0:s===2?-Math.PI/2:Math.PI/2;for(const p of props.lamp){const r=rot(p[2]);gp.push(p[0]+Math.sin(r)*1.45,6.1,p[1]+Math.cos(r)*1.45);}
  for(const f of props.flood)gp.push(f[0],f[2],f[1]);
  for(let x=FW.pier.x0+6;x<FW.pier.x1;x+=12)for(const s of[-4.9,4.9])gp.push(x,3,FW.pier.z+s);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(gp,3));const pts=new T.Points(g,glowMat);pts.frustumCulled=false;scene.add(pts);LAMPGLOW=g;}
const LAMPM=emat('#ffd9a0',1.6);
/* warm light pools under street lamps: one quad on the road and one on the pavement per lamp, faded in at night */
const poolTex=makeTex(128,128,(g)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,214,150,.95)');r.addColorStop(.35,'rgba(255,190,120,.45)');r.addColorStop(.75,'rgba(255,170,100,.1)');r.addColorStop(1,'rgba(255,160,90,0)');g.fillStyle=r;g.fillRect(0,0,128,128);},{repeat:false});
const poolMat=new T.MeshBasicMaterial({map:poolTex,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-4});
let POOLG=null;const POOLV=[];
{const gb=new GB(),RAD=5.2;
  for(const L of LAMPS){const hx=L.x+Math.sin(L.yaw)*1.45,hz=L.z+Math.cos(L.yaw)*1.45;const out=[Math.sin(L.yaw),Math.cos(L.yaw)];
    const cx=L.x-out[0]*.9,cz=L.z-out[1]*.9;/* curb line point */
    const uv=(x,z)=>[(x-hx)/(RAD*2)+.5,(z-hz)/(RAD*2)+.5];const start=gb.p.length/3;POOLV.push(start);
    const quad=(a0,a1,b0,b1,y)=>{/* a: along the curb, b: distance from curb (positive = road side) */
      const tx=-out[1],tz=out[0];const P=(a,b)=>[cx+tx*a+out[0]*b,y,cz+tz*a+out[1]*b];const v=[P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1)];
      const up=(v[1][0]-v[0][0])*(v[3][2]-v[0][2])-(v[1][2]-v[0][2])*(v[3][0]-v[0][0])<0;const o=up?v:[v[0],v[3],v[2],v[1]];gb.quad(o[0],o[1],o[2],o[3],[0,1,0],o.map(q=>uv(q[0],q[2])));};
    quad(-RAD,RAD,0,RAD+1.5,.035);quad(-RAD,RAD,-RAD+1.5,0,.27);}
  POOLG=gb.geo();const m=new T.Mesh(POOLG,poolMat);m.frustumCulled=false;m.renderOrder=1;scene.add(m);}
function poolShow(i,on){if(!POOLG)return;const a=POOLG.attributes.position,st=POOLV[i];for(let k=0;k<8;k++){const y=on?(k<4?.035:.27):-80;a.setY(st+k,y);}a.needsUpdate=true;}
{const mh=makeTex(128,128,(g)=>{g.fillStyle='#2b2b2e';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.strokeStyle='#4a4a4f';g.lineWidth=5;g.beginPath();g.arc(64,64,56,0,7);g.stroke();g.strokeStyle='#1a1a1c';g.lineWidth=3;for(let k=-48;k<=48;k+=12){g.beginPath();g.moveTo(64+k,64-Math.sqrt(48*48-k*k));g.lineTo(64+k,64+Math.sqrt(48*48-k*k));g.stroke();}},{repeat:false});
  const dr=makeTex(128,64,(g)=>{g.fillStyle='#3a3a3e';g.fillRect(0,0,128,64);g.fillStyle='#0b0b0d';for(let x=8;x<120;x+=12)g.fillRect(x,8,6,48);},{repeat:false});
  const mg=new T.CircleGeometry(.5,20);mg.rotateX(-Math.PI/2);const dg=new T.PlaneGeometry(.9,.36);dg.rotateX(-Math.PI/2);
  const mhs=[],drs=[];for(let k=0;k<=N;k++)for(let s2=0;s2<N;s2++){const c=road(k),mid=(road(s2)+road(s2+1))/2;if((k+s2)%2===0){mhs.push([c+LANE*.5,mid,0]);mhs.push([mid,c-LANE*.5,0]);}
    drs.push([c-RW/2+.25,mid-6,1]);drs.push([c+RW/2-.25,mid+6,1]);drs.push([mid+6,c-RW/2+.25,0]);drs.push([mid-6,c+RW/2-.25,0]);}
  const a=inst(mg,new T.MeshStandardMaterial({map:mh,roughness:.55,metalness:.6,polygonOffset:true,polygonOffsetFactor:-2}),mhs,(p,d)=>{d.position.set(p[0],.028,p[1]);},false);
  const b=inst(dg,new T.MeshStandardMaterial({map:dr,roughness:.6,metalness:.5,polygonOffset:true,polygonOffsetFactor:-2}),drs,(p,d)=>{d.position.set(p[0],.028,p[1]);d.rotation.y=p[2]?Math.PI/2:0;},false);
  if(a)a.frustumCulled=false;if(b)b.frustumCulled=false;}
/* ---------- knock-down street lamps ---------- */
const _lq=new T.Quaternion(),_lqy=new T.Quaternion(),_lm=new T.Matrix4(),_lv=new T.Vector3(),_ls=new T.Vector3(1,1,1),_lz=new T.Matrix4().makeScale(0,0,0),_UP=new T.Vector3(0,1,0);
function lampPose(L){_lqy.setFromAxisAngle(_UP,L.yaw);if(L.ang>0){_lq.setFromAxisAngle(L.ax,L.ang).multiply(_lqy);}else _lq.copy(_lqy);
  _lm.compose(_lv.set(L.x,.25,L.z),_lq,_ls);LIM.pole.setMatrixAt(L.i,_lm);LIM.arm.setMatrixAt(L.i,_lm);
  if(L.down){LIM.head.setMatrixAt(L.i,_lz);LIM.off.setMatrixAt(L.i,_lm);}else{LIM.head.setMatrixAt(L.i,_lm);LIM.off.setMatrixAt(L.i,_lz);}
  for(const k of['pole','arm','head','off'])LIM[k].instanceMatrix.needsUpdate=true;}
const LDOWN=[];
function knockLamp(i,dx,dz,byPlayer){const L=LAMPS[i];if(!L||L.down)return;L.down=1;L.t=0;L.ang=0;L.col.off=true;L.ax=new T.Vector3(dz,0,-dx).normalize();L.respawn=120;LDOWN.push(L);
  if(LAMPGLOW){const a=LAMPGLOW.attributes.position;a.setY(i,-200);a.needsUpdate=true;}poolShow(i,false);
  if(byPlayer){sfx('crash');cam.shake=Math.max(cam.shake,.2);}fx3(L.x+dx*.4,1.1,L.z+dz*.4,false);}
function lampHits(c){const sp=hyp(c.vx,c.vz);if(sp<4.5)return;const sc=c.spec||{},CO=sc.co||1.25,CR=(sc.cr||1.15)+.3,fx=Math.sin(c.h),fz=Math.cos(c.h);
  query(c.x,c.z,CO+CR+.6,col=>{if(col.lamp==null||col.off)return;for(const o of[CO,0,-CO]){if(hyp(c.x+fx*o-col.x,c.z+fz*o-col.z)<CR){knockLamp(col.lamp,c.vx/sp,c.vz/sp,c===P.car);c.vx*=.78;c.vz*=.78;break;}}});}
function lampUpdate(dt){for(let k=LDOWN.length-1;k>=0;k--){const L=LDOWN[k];
    if(L.t<1.4){L.t+=dt;const u=Math.min(1,L.t/.8),top=Math.PI/2-.04;let a=top*u*u;if(L.t>.8){const b=(L.t-.8)/.6;a=top-Math.sin(Math.min(1,b)*Math.PI)*.12*(1-b);}L.ang=a;lampPose(L);}
    else{L.respawn-=dt;if(L.respawn<=0&&hyp(L.x-P.x,L.z-P.z)>80){L.down=0;L.ang=0;L.col.off=false;lampPose(L);if(LAMPGLOW){const a=LAMPGLOW.attributes.position;a.setY(L.i,6.1);a.needsUpdate=true;}poolShow(L.i,true);LDOWN.splice(k,1);}}}}

/* ---------- day / night cycle: 1 game hour = 30 s, a full day = 12 min ---------- */
// [hour, skyTop, skyMid, horizon, below, fog, sunColour, sunIntensity, hemiSky, hemiGround, hemiI, night, cloudLit, cloudDark]
const NIGHT_K=['#05081a','#0d1430','#1a2240','#0c0f1c','#141a30','#8aa0ff',.3,'#4a5a90','#1a1424',.38,1,'#3a4260','#151a2c'];
const TODK=[[0,...NIGHT_K],[5.3,'#1a2350','#6a5a8a','#e89a80','#6a5060','#a07a80','#ffb48a',.7,'#9a90b0','#3a3040',.45,.5,'#f0b0a0','#6a5070'],
  [7,'#3a6ab8','#9ac0e0','#f0d8c0','#b0a090','#d8d0c8','#ffe2c0',1.9,'#d0e0f0','#4b4a46',.6,0,'#ffffff','#b8c0d0'],
  [12,'#2f66c8','#7fb2e6','#cfe4f2','#a8b0b0','#c8dae6','#fff6e6',2.6,'#dceaff','#4f4a40',.65,0,'#ffffff','#c0c8d8'],
  [16,'#3466b8','#8ab4e0','#e6e0d0','#b0a898','#d8d4c8','#ffe8c8',2.4,'#e8e8f0','#4f4a46',.65,0,'#fffaf0','#c8c0c8'],
  [18.3,'#283a7a','#e58c8c','#ffc48c','#c89a86','#f3b48a','#ffcf9c',2.4,'#ffe0c6','#4b3c56',.7,0,'#fff0e0','#b08090'],
  [19.6,'#141c48','#6a3a6a','#d86a5a','#5a3a4a','#7a4a5a','#ff8a5a',.9,'#8a7090','#2a2030',.5,.45,'#ff9a7a','#4a3050'],
  [21,...NIGHT_K],[24,...NIGHT_K]].map(k=>k.map(v=>typeof v==='string'?new T.Color(v):v));
const _ca=new T.Color(),_cb=new T.Color(),SUN_AZ=new T.Vector2(.78,-.45).normalize();
const tod={hour:+save.hour||17,day:1,lightDir:new T.Vector3()};
function todApply(){const h=((tod.hour%24)+24)%24;let a=0;while(a<TODK.length-2&&TODK[a+1][0]<=h)a++;const A=TODK[a],B=TODK[a+1],k=(h-A[0])/(B[0]-A[0]||1);
  const C=(i,out)=>out.copy(A[i]).lerp(B[i],k),F=i=>A[i]+(B[i]-A[i])*k;const U=skyMat.uniforms;
  C(1,U.top.value);C(2,U.mid.value);C(3,U.hor.value);C(4,U.low.value);C(5,_ca);scene.fog.color.copy(_ca).convertSRGBToLinear();
  C(6,_cb);U.sunCol.value.copy(_cb);sun.color.copy(_cb).convertSRGBToLinear();C(8,_ca);hemi.color.copy(_ca).convertSRGBToLinear();C(9,_ca);hemi.groundColor.copy(_ca).convertSRGBToLinear();hemi.intensity=F(10);
  C(12,U.cloudLit.value);C(13,U.cloudDark.value);U.night.value=F(11);
  const p=(h-5.4)/14.2,el=p>0&&p<1?Math.sin(Math.PI*p)*1.05:-.8*Math.sin(Math.PI*clamp((h<5.4?h+24-19.6:h-19.6)/9.8,0,1));
  sunDir.set(SUN_AZ.x*Math.cos(el),Math.sin(el),SUN_AZ.y*Math.cos(el)).normalize();
  const day=clamp(el*4+.15,0,1);tod.day=day;U.sunI.value=day;
  if(day>.02){tod.lightDir.copy(sunDir);sun.intensity=F(7)*Math.max(.25,day);}else{tod.lightDir.copy(sunDir).negate();sun.color.set('#8aa0ff').convertSRGBToLinear();sun.intensity=.35;}
  if(tod.lightDir.y<.12){tod.lightDir.y=.12;tod.lightDir.normalize();}
  const nk=1-day;for(const m of NIGHTM){m.emissiveIntensity=m.userData.baseE*(.15+1.25*nk);if(m.userData.baseEnv!==undefined)m.envMapIntensity=m.userData.baseEnv*(.3+.7*day);}
  LAMPM.emissiveIntensity=.2+2.4*nk;FW.bulbs.emissiveIntensity=.4+2.2*nk;glowMat.opacity=nk*.85;poolMat.opacity=Math.max(0,nk-.15)*.9;glowMat.visible=nk>.03;
  hillMat.uniforms.haze.value.copy(U.hor.value);hillMat.uniforms.lk.value=.22+.78*day;}
/* ---------- weather: clear / cloudy / rain with wet roads, rain streaks, thunder ---------- */
const weather={w:0,target:0,hold:40,flash:0};
const RAINN=MOBILE?500:1300,rainPos=new Float32Array(RAINN*6),rainG=new T.BufferGeometry();
for(let i=0;i<RAINN;i++){const x=rnd(-35,35),y=rnd(0,30),z=rnd(-35,35);rainPos.set([x,y,z,x+.06,y+.7,z+.03],i*6);}
rainG.setAttribute('position',new T.BufferAttribute(rainPos,3));
const rainMat=new T.LineBasicMaterial({color:lin('#b8c4d4'),transparent:true,opacity:0,depthWrite:false});const rain=new T.LineSegments(rainG,rainMat);rain.frustumCulled=false;scene.add(rain);
const FOG_RAIN=new T.Color('#7d8590');
function weatherUpdate(dt){weather.hold-=dt;if(weather.hold<=0){const r=Math.random();weather.target=r<.5?0:r<.72?.35:1;weather.hold=rnd(60,160);if(weather.target===1)showPrompt(L('Trời bắt đầu mưa','It is starting to rain'),2);}
  weather.w+=clamp(weather.target-weather.w,-dt*.04,dt*.04);const w=weather.w;
  const show=w>.4&&!P.inside;rain.visible=show;if(show){const cp=camera.position,fall=26*dt;rainMat.opacity=Math.min(.55,(w-.4)*1.2);for(let i=0;i<RAINN;i++){const o=i*6;let y=rainPos[o+1]-fall;if(y<0)y+=30;rainPos[o+1]=y;rainPos[o+4]=y+.7;}rainG.attributes.position.needsUpdate=true;rain.position.set(Math.round(cp.x),cp.y-12,Math.round(cp.z));}
  if(w>.85&&!P.inside&&Math.random()<dt/14){weather.flash=.25;setTimeout(()=>sfx('thunder'),rnd(300,1800));}
  if(weather.flash>0)weather.flash-=dt;}
function weatherApply(){const w=weather.w,U=skyMat.uniforms;U.cover.value=Math.min(1,w*1.1);
  for(const k of['top','mid','hor','low'])U[k].value.lerp(FOG_RAIN,w*.55).multiplyScalar(1-w*.25*(1-tod.day*.5));
  scene.fog.color.lerp(_ca.copy(FOG_RAIN).multiplyScalar(.35+.65*tod.day).convertSRGBToLinear(),w*.7);scene.fog.far=(MOBILE?Q.cull+150:Q.cull+300)*(1-.5*w);scene.fog.near=90*(1-.6*w);
  sun.intensity*=1-.7*w;U.sunI.value*=1-.85*w;hemi.intensity*=1-.2*w;
  if(weather.flash>0){hemi.intensity+=2.5*weather.flash;}
  if(ASPH){ASPH.roughness=.92-.6*w;ASPH.color.setScalar(1-.35*w);ASPH.envMapIntensity=.3+1.2*w;}}
function clockText(){const h=((tod.hour%24)+24)%24;return String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor((h%1)*60)).padStart(2,'0');}
// traffic lights
const TL=[];
{for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const sx=i<N?1:-1,sz=j<N?1:-1;const x=road(i)+sx*(RW/2+1.1),z=road(j)+sz*(RW/2+1.1);TL.push({i,j,x,z});addCol({t:'c',x,z,r:.22});}
  const pole=new T.CylinderGeometry(.1,.12,5.2,8);pole.translate(0,2.6,0);const head=new T.BoxGeometry(.5,1.2,.5);head.translate(0,5.4,0);
  inst(pole,mat('#2c2f33',.5,.6),TL,(p,d)=>d.position.set(p.x,.25,p.z),true);inst(head,mat('#1c1e21',.6,.4),TL,(p,d)=>d.position.set(p.x,.25,p.z),false);
  const lamp=new T.SphereGeometry(.17,10,8);
  TL.ns=inst(lamp,new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),TL,(p,d)=>d.position.set(p.x,5.65,p.z+.27),false);
  TL.ew=inst(lamp,new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),TL,(p,d)=>d.position.set(p.x+.27,5.15,p.z),false);}
const LC={G:new T.Color('#3dff7a'),Y:new T.Color('#ffc93d'),R:new T.Color('#ff3b3b')};
function light(i,j,axis,t){const c=(t+((i*7+j*3)%10)*2)%20;const ns=c<8?'G':c<10?'Y':'R',ew=c<10?'R':c<18?'G':'Y';return axis==='NS'?ns:ew;}
function paintLights(t){TL.forEach((p,k)=>{TL.ns.setColorAt(k,LC[light(p.i,p.j,'NS',t)]);TL.ew.setColorAt(k,LC[light(p.i,p.j,'EW',t)]);});TL.ns.instanceColor.needsUpdate=true;TL.ew.instanceColor.needsUpdate=true;}

/* ---------- humans ---------- */
const HG={torso:new T.CylinderGeometry(.2,.165,.56,12),pelvis:new T.BoxGeometry(.34,.17,.22),neck:new T.CylinderGeometry(.055,.06,.12,8),head:new T.SphereGeometry(.135,16,12),
  hair:new T.SphereGeometry(.142,16,10,0,Math.PI*2,0,Math.PI*.55),hairLong:new T.BoxGeometry(.27,.34,.09),upper:new T.CylinderGeometry(.064,.056,.3,8),fore:new T.CylinderGeometry(.053,.045,.27,8),
  hand:new T.SphereGeometry(.052,8,6),thigh:new T.CylinderGeometry(.09,.072,.46,8),shin:new T.CylinderGeometry(.07,.056,.43,8),foot:new T.BoxGeometry(.11,.08,.27),eye:new T.SphereGeometry(.019,6,4),
  nose:new T.BoxGeometry(.03,.05,.04),cap:new T.CylinderGeometry(.148,.15,.09,14),brim:new T.BoxGeometry(.24,.02,.13),skirt:new T.CylinderGeometry(.19,.27,.34,12),shadow:new T.CircleGeometry(.4,12)};
HG.upper.translate(0,-.15,0);HG.fore.translate(0,-.135,0);HG.thigh.translate(0,-.23,0);HG.shin.translate(0,-.215,0);HG.shadow.rotateX(-Math.PI/2);
const SKIN=['#f3d2b8','#e8b896','#d39b72','#b07650','#8a5a3a','#6a4229'],HAIR=['#1a1410','#2d1f15','#4a3020','#7a5230','#c9a165','#151515','#8b3a2f'];
const SHIRT=['#e63946','#f1faee','#457b9d','#2a9d8f','#e9c46a','#f4a261','#ffffff','#8ecae6','#ff8fab','#3a86ff','#8338ec','#06d6a0','#ffb703','#1d3557','#e5e5e5'],PANTS=['#2b2f3a','#3a4a6b','#5c4b3b','#1f1f1f','#6b7280','#c2b280','#2f4858'],SHOES=['#f4f4f4','#1d1d1d','#7a4a2a','#c0392b','#2c3e50'];
const shadowMat=new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.28,depthWrite:false});
const HUMAT=new T.MeshStandardMaterial({vertexColors:true,roughness:.82});
const humanPool=[];
function makeHuman(o){
  const mk=(parts,parent,pos)=>{const me=new T.Mesh(buildVC(parts),HUMAT);me.castShadow=Q.shadows;if(pos)me.position.set(...pos);parent.add(me);return me;};
  const root=new T.Group(),hips=new T.Group();root.rotation.order='YXZ';hips.position.y=.95;root.add(hips);
  const hp=[{geo:HG.pelvis,color:o.pants}];if(o.skirt)hp.push({geo:HG.skirt,color:o.pants,pos:[0,-.1,0]});mk(hp,hips);
  const spine=new T.Group();spine.position.y=.06;hips.add(spine);
  mk([{geo:HG.torso,color:o.shirt,pos:[0,.32,0],scale:[o.female?.9:1,1,.66]},{geo:HG.neck,color:o.skin,pos:[0,.66,0]}],spine);
  const head=new T.Group();head.position.y=.82;spine.add(head);
  const hd=[{geo:HG.head,color:o.skin,scale:[1,1.12,1.05]},{geo:HG.hair,color:o.hair,pos:[0,.022,0],scale:[1.03,1.04,1.1]},{geo:HG.eye,color:'#151515',pos:[-.048,.02,.133]},{geo:HG.eye,color:'#151515',pos:[.048,.02,.133]},{geo:HG.nose,color:o.skin,pos:[0,-.02,.145]}];
  if(o.longHair)hd.push({geo:HG.hairLong,color:o.hair,pos:[0,-.13,-.1]});if(o.cap)hd.push({geo:HG.cap,color:o.cap,pos:[0,.1,0]},{geo:HG.brim,color:o.cap,pos:[0,.07,.13]});
  mk(hd,head);
  const arm={},el={};
  for(const s of[-1,1]){const sh=new T.Group();sh.position.set(s*.25,.56,0);sh.rotation.z=s*.07;spine.add(sh);mk([{geo:HG.upper,color:o.sleeve===false?o.skin:o.shirt}],sh);const e=new T.Group();e.position.y=-.3;sh.add(e);mk([{geo:HG.fore,color:o.longSleeve?o.shirt:o.skin},{geo:HG.hand,color:o.skin,pos:[0,-.29,0]}],e);arm[s]=sh;el[s]=e;}
  const leg={},kn={};
  for(const s of[-1,1]){const hpG=new T.Group();hpG.position.set(s*.1,-.04,0);hips.add(hpG);mk([{geo:HG.thigh,color:o.skirt?o.skin:o.pants}],hpG);const k=new T.Group();k.position.y=-.46;hpG.add(k);mk([{geo:HG.shin,color:o.skirt?o.skin:o.pants},{geo:HG.foot,color:o.shoes,pos:[0,-.44,.05]}],k);leg[s]=hpG;kn[s]=k;}
  if(!Q.shadows){const sh=new T.Mesh(HG.shadow,shadowMat);sh.position.y=.03;root.add(sh);}
  scene.add(root);
  return{root,hips,spine,head,armL:arm[-1],armR:arm[1],elL:el[-1],elR:el[1],legL:leg[-1],legR:leg[1],knL:kn[-1],knR:kn[1],ph:Math.random()*6,punchT:0,side:1,guard:0,ko:0,koK:0,hitT:0};
}
function resetHuman(H){H.ko=0;H.koK=0;H.guard=0;H.punchT=0;H.hitT=0;H.kickT=0;H.windT=0;H.block=0;H.blockHold=false;H.root.rotation.set(0,0,0);H.root.visible=true;}
function randomLook(kind){const f=Math.random()<.45;const o={female:f,skin:pick(SKIN),hair:pick(HAIR),shirt:pick(SHIRT),pants:pick(PANTS),shoes:pick(SHOES),longHair:f&&Math.random()<.75,skirt:f&&Math.random()<.3,sleeve:Math.random()<.6};
  if(kind==='cop')Object.assign(o,{shirt:'#1f2d4d',pants:'#18203a',shoes:'#111111',cap:'#16203a',longSleeve:false,skirt:false,longHair:false});
  if(kind==='guard')Object.assign(o,{shirt:'#5b6470',pants:'#25292f',shoes:'#111111',cap:'#2a2e35',skirt:false});
  if(kind==='fighter')Object.assign(o,{female:false,shirt:pick(['#b3261e','#151515','#f1c40f']),sleeve:false,pants:pick(['#1f1f1f','#2b2f3a']),longHair:false,skirt:false});
  return o;}
const CHARS={minh:{female:false,skin:'#d6a17a',hair:'#15110e',shirt:'#2f6fa6',pants:'#262b36',shoes:'#f4f4f4',sleeve:true,cap:null},
  vy:{female:true,skin:'#ecc2a0',hair:'#2a1c14',longHair:true,shirt:'#e85d75',pants:'#334a70',shoes:'#f4f4f4',sleeve:false}};
function animHuman(H,dt,spd,t){
  if(H.ko>0||H.koK>0){const tgt=H.ko>0?1:0;H.koK+=(tgt-H.koK)*Math.min(1,dt*(tgt?6:2.5));if(H.koK<.01&&!H.ko)H.koK=0;H.root.rotation.x=-Math.PI/2*H.koK;H.root.position.y+=.18*H.koK;if(H.ko>0)return;}
  const amp=Math.min(1,spd/5.5),run=spd>7;
  H.ph+=dt*(spd>.2?3+spd*.75:0);const s=Math.sin(H.ph),c=Math.cos(H.ph);
  H.legL.rotation.x=s*.72*amp;H.legR.rotation.x=-s*.72*amp;
  H.knL.rotation.x=Math.max(0,-s)*1.15*amp+.05;H.knR.rotation.x=Math.max(0,s)*1.15*amp+.05;
  let aL=-s*.65*amp,aR=s*.65*amp,eL=-.25-.35*amp,eR=-.25-.35*amp;
  if(H.guard>0){aL=-1.05;aR=-.95;eL=-1.7;eR=-1.7;}
  if(H.block>0){H.block-=dt*(H.blockHold?0:1);aL=-1.5;aR=-1.45;eL=-2.25;eR=-2.2;}
  let twist=0,lean=null,hipDrop=0;
  if(H.hold>0&&!(H.aim>0)){aR=-.35;eR=-.6;}
  if(H.aim>0){const ap=H.aimP||0;aR=-1.52-ap;eR=0;if(H.two){aL=-1.35-ap;eL=-.55;}twist=.12;}
  // wind-up: the attacker pulls the arm (or leg) back first, so hits can be read and blocked
  if(H.windT>0){H.windT-=dt;const k=clamp(1-H.windT/(H.windD||.3),0,1);if(H.windKick){lean=-.12*k;hipDrop=.03*k;}else if(H.side>0){aR=.35*k-.9;eR=-2.1;twist=-.45*k;}else{aL=.35*k-.9;eL=-2.1;twist=.45*k;}}
  if(H.punchT>0){H.punchT-=dt;const k=1-H.punchT/.32,ext=k<.35?k/.35:Math.max(0,1-(k-.35)/.65);if(H.side>0){aR=-1.6*ext+aR*(1-ext);eR=eR*(1-ext);}else{aL=-1.6*ext+aL*(1-ext);eL=eL*(1-ext);}twist=H.side*.55*ext;lean=.18*ext;}
  if(H.kickT>0){H.kickT-=dt;const k=1-H.kickT/.5,ext=k<.38?k/.38:Math.max(0,1-(k-.38)/.62);H.legR.rotation.x=-1.55*ext+H.legR.rotation.x*(1-ext);H.knR.rotation.x=.05+1.3*(1-ext)*Math.min(1,k*3);H.legL.rotation.x=.18*ext;H.knL.rotation.x=.25*ext+.05;aL=-1.1;aR=-.5;eL=-1.9;eR=-1.2;twist=.3*ext;lean=-.32*ext;hipDrop=.06*ext;}
  H.armL.rotation.x=aL;H.armR.rotation.x=aR;H.elL.rotation.x=eL;H.elR.rotation.x=eR;
  H.spine.rotation.y=twist;H.spine.rotation.x=lean!==null?lean:run?.2:H.guard>0?.12:.04*amp+(amp<.05?Math.sin(t*2)*.012:0);
  H.hips.position.y=.95+Math.abs(c)*.045*amp-(run?.04:0)-hipDrop-(H.guard>0&&amp<.2?.05:0);
  H.head.rotation.x=0;H.head.rotation.y=0;
  if(H.hitT>0){H.hitT-=dt;const k=Math.min(1,H.hitT*4);H.spine.rotation.x=-.42*k;H.spine.rotation.y+=(H.hitSide||1)*.35*k;H.head.rotation.x=-.35*k;H.head.rotation.y=(H.hitSide||1)*.4*k;}
}

/* ---------- cars ---------- */
const CAR_T={
  sedan:{hl:.72,tl:.82,w:1.86,wr:.36,wz:1.42,yb:.32,len:4.6,lower:[[-2.25,.32],[-2.33,.58],[-2.28,.86],[-2.02,.98],[-1.45,1.0],[1.05,1.0],[2.02,.9],[2.3,.76],[2.34,.5],[2.24,.32]],cabin:[[-1.47,.97],[-.98,1.42],[.36,1.44],[1.08,.97]],roof:[-.98,.36,1.43],max:40,acc:12,brk:30,grip:7,mass:1.3},
  sports:{hl:.56,tl:.66,w:1.92,wr:.35,wz:1.38,yb:.27,len:4.45,lower:[[-2.15,.27],[-2.22,.55],[-2.1,.8],[-1.35,.86],[.95,.84],[2.0,.66],[2.24,.5],[2.22,.33],[2.12,.27]],cabin:[[-1.35,.84],[-.72,1.18],[.18,1.2],[.98,.84]],roof:[-.72,.18,1.19],max:52,acc:19,brk:34,grip:8.6,mass:1.15},
  suv:{hl:.92,tl:1.0,w:2.0,wr:.44,wz:1.5,yb:.45,len:4.8,lower:[[-2.35,.45],[-2.42,.8],[-2.4,1.12],[1.35,1.14],[2.2,1.06],[2.4,.88],[2.42,.55],[2.3,.45]],cabin:[[-2.3,1.12],[-2.2,1.82],[.82,1.84],[1.4,1.13]],roof:[-2.2,.82,1.83],max:37,acc:10.5,brk:28,grip:6.3,mass:1.8}};
CAR_T.taxi=Object.assign({},CAR_T.sedan,{max:39});CAR_T.police=Object.assign({},CAR_T.sedan,{max:47,acc:16,grip:7.7,mass:1.45});
CAR_T.super={hl:.5,tl:.6,w:2.02,wr:.36,wz:1.45,yb:.25,len:4.6,lower:[[-2.3,.25],[-2.38,.5],[-2.25,.74],[-1.3,.8],[1.0,.78],[2.1,.55],[2.35,.42],[2.32,.28],[2.2,.25]],cabin:[[-1.4,.78],[-.6,1.12],[.3,1.13],[1.1,.78]],roof:[-.6,.3,1.12],max:62,acc:24,brk:38,grip:9.5,mass:1.2};
CAR_T.bike={wr:.3,wz:.66,w:.7,len:1.9,max:36,acc:17,brk:26,grip:9,mass:.45,cr:.55,co:.45,bike:true};
const CAR_BODY={sedan:'sedan',sports:'sports',suv:'suv',taxi:'sedan',police:'sedan',super:'super',bike:'bike'};
const CARC=['#c0392b','#f4f4f2','#1d3557','#2a9d8f','#e9c46a','#111418','#8d99ae','#6c757d','#3a86ff','#ff8fab','#7b2cbf','#e76f51','#264653','#d4d8dd','#ffb703'];
const CG={};
function carGeos(b){if(CG[b])return CG[b];const s=CAR_T[b];
  const sh=new T.Shape();const L=s.lower;sh.moveTo(L[0][0],L[0][1]);for(let k=1;k<L.length;k++)sh.lineTo(L[k][0],L[k][1]);
  const R=s.wr+.07,ph=Math.asin(clamp((s.yb-s.wr)/R,-1,1));
  sh.lineTo(s.wz+R*Math.cos(ph),s.yb);sh.absarc(s.wz,s.wr,R,ph,Math.PI-ph,false);sh.lineTo(-s.wz+R*Math.cos(ph),s.yb);sh.absarc(-s.wz,s.wr,R,ph,Math.PI-ph,false);sh.lineTo(L[0][0],L[0][1]);
  const ex=(shape,w)=>{const bv=.06,g=new T.ExtrudeGeometry(shape,{depth:w-2*bv,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:2,curveSegments:10});g.rotateY(-Math.PI/2);g.translate((w-2*bv)/2,0,0);g.computeVertexNormals();return g;};
  const cs=new T.Shape();s.cabin.forEach((p,k)=>k?cs.lineTo(p[0],p[1]):cs.moveTo(p[0],p[1]));
  const roof=new T.BoxGeometry(s.w-.2,.07,s.roof[1]-s.roof[0]);roof.translate(0,s.roof[2],(s.roof[0]+s.roof[1])/2);
  const pil=new T.BoxGeometry(s.w-.16,(s.roof[2]-s.cabin[0][1])*.98,.09);pil.translate(0,(s.roof[2]+s.cabin[0][1])/2,(s.roof[0]+s.roof[1])/2-.15);
  return CG[b]={lower:ex(sh,s.w),cabin:ex(cs,s.w-.22),roof,pil,tire:new T.CylinderGeometry(s.wr,s.wr,.26,18).rotateZ(Math.PI/2),rim:new T.CylinderGeometry(s.wr*.62,s.wr*.62,.27,12).rotateZ(Math.PI/2)};}
const lightBox=new T.BoxGeometry(.36,.12,.06),grille=new T.BoxGeometry(1,.16,.08),plate=new T.BoxGeometry(.42,.13,.03),mirror=new T.BoxGeometry(.18,.1,.12),barG=new T.BoxGeometry(.5,.12,.28);
const BAR={r:new T.MeshStandardMaterial({color:0x220000,emissive:lin('#ff1a2a'),emissiveIntensity:3}),b:new T.MeshStandardMaterial({color:0x000022,emissive:lin('#1a5bff'),emissiveIntensity:3})};
const copText=textTex('CẢNH SÁT',{fg:'#1b2a55',size:70,bg:'rgba(0,0,0,0)'}),taxiText=textTex('TAXI',{fg:'#111',size:90,bg:'#f5c518',w:256,h:128});
const DETAILM=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false}),WHEELM=new T.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.4});
const CM={};
function carMeshes(b){if(CM[b])return CM[b];const s=CAR_T[b],cg=carGeos(b);
  const fz=s.lower.reduce((a,p)=>Math.max(a,p[0]),0)+.03,rz=s.lower.reduce((a,p)=>Math.min(a,p[0]),0)-.03;
  const paint=buildVC([{geo:cg.lower},{geo:cg.roof},{geo:cg.pil},{geo:mirror,pos:[-(s.w/2+.04),s.cabin[0][1]+.1,s.cabin[3][0]-.15]},{geo:mirror,pos:[s.w/2+.04,s.cabin[0][1]+.1,s.cabin[3][0]-.15]}]);
  const det=[];for(const x of[-1,1]){det.push({geo:lightBox,color:'#fff4dc',pos:[x*(s.w/2-.36),s.hl,fz]},{geo:lightBox,color:'#ff2020',pos:[x*(s.w/2-.34),s.tl,rz]});}
  det.push({geo:grille,color:'#0c0c0c',pos:[0,s.hl-.2,fz]},{geo:plate,color:'#e8e8e8',pos:[0,s.tl-.3,rz]});
  const wheel=buildVC([{geo:cg.tire,color:'#151515'},{geo:cg.rim,color:'#b9bec5'}]);
  return CM[b]={paint,glass:cg.cabin,detail:buildVC(det),wheel,fz,rz};}
const carPool={};
function makeCar(type,color){
  const pl=carPool[type];if(pl&&pl.length){const m=pl.pop();m.g.visible=true;m.bg.rotation.set(0,0,0);m.bg.position.y=0;if(m.rider)m.rider.root.visible=false;if(type!=='police'&&type!=='taxi')m.paint.color.copy(lin(color));for(const w of m.wheels)w.rotation.x=0;return m;}
  if(type==='bike')return makeBike(color);
  const b=CAR_BODY[type],s=CAR_T[b],M=carMeshes(b),g=new T.Group(),bg=new T.Group();g.add(bg);
  const paint=new T.MeshStandardMaterial({color:lin(type==='police'?'#14171d':type==='taxi'?'#f5c518':color),roughness:ENV_OK?.28:.35,metalness:ENV_OK?.55:.15});
  const body=new T.Mesh(M.paint,paint);body.castShadow=Q.shadows;bg.add(body);
  const gl=new T.Mesh(M.glass,GLASS);gl.castShadow=Q.shadows;bg.add(gl);bg.add(new T.Mesh(M.detail,DETAILM));
  if(type==='police'){const door=new T.Mesh(new T.BoxGeometry(s.w+.03,.4,2.1),mat('#f4f5f7',.35,.2));door.position.set(0,.66,-.1);bg.add(door);
    const tg=buildVC([{geo:new T.PlaneGeometry(1.5,.32).rotateY(Math.PI/2),pos:[s.w/2+.03,.66,-.1]},{geo:new T.PlaneGeometry(1.5,.32).rotateY(-Math.PI/2),pos:[-(s.w/2+.03),.66,-.1]}]);
    bg.add(new T.Mesh(tg,new T.MeshBasicMaterial({map:copText,transparent:true})));
    const r=new T.Mesh(barG,BAR.r);r.position.set(-.28,s.roof[2]+.1,(s.roof[0]+s.roof[1])/2);const bl=new T.Mesh(barG,BAR.b);bl.position.set(.28,s.roof[2]+.1,(s.roof[0]+s.roof[1])/2);bg.add(r,bl);}
  if(type==='taxi'){const sg=new T.Mesh(new T.BoxGeometry(.7,.24,.3),new T.MeshBasicMaterial({map:taxiText,toneMapped:false}));sg.position.set(0,s.roof[2]+.16,(s.roof[0]+s.roof[1])/2);bg.add(sg);}
  if(type==='super'){const sp=new T.Mesh(new T.BoxGeometry(s.w-.2,.06,.5),mat('#111418',.4,.3));sp.position.set(0,.98,s.lower[0][0]+.35);bg.add(sp);}
  const wheels=[],steer=[];
  for(const[sx,sz]of[[-1,1],[1,1],[-1,-1],[1,-1]]){const pv=new T.Group();pv.position.set(sx*(s.w/2-.13),s.wr,sz*s.wz);const w=new T.Mesh(M.wheel,WHEELM);w.castShadow=Q.shadows;pv.add(w);g.add(pv);wheels.push(w);if(sz>0)steer.push(pv);}
  if(!Q.shadows){const sh=new T.Mesh(new T.PlaneGeometry(s.w+.3,s.len+.2).rotateX(-Math.PI/2),shadowMat);sh.position.y=.04;g.add(sh);}
  scene.add(g);return{g,bg,wheels,steer,paint,spec:Object.assign({},CAR_T[type]),body:b};
}
// motorbike: paint parts + dark frame, two wheels, optional NPC rider attached for traffic bikes
let BIKEG=null;
function makeBike(color){const s=CAR_T.bike;if(!BIKEG){BIKEG={paint:buildVC([{geo:new T.BoxGeometry(.34,.3,.7),pos:[0,.78,.15]},{geo:new T.BoxGeometry(.5,.5,.25),pos:[0,.9,.72]},{geo:new T.BoxGeometry(.4,.22,.7),pos:[0,.72,-.45]}]),
    dark:buildVC([{geo:new T.BoxGeometry(.3,.12,.75),pos:[0,.9,-.3],color:'#151515'},{geo:new T.BoxGeometry(.12,.12,1.5),pos:[0,.48,0],color:'#2a2a2a'},{geo:new T.BoxGeometry(.7,.05,.05),pos:[0,1.12,.62],color:'#202020'},{geo:new T.BoxGeometry(.05,.55,.05),pos:[0,.85,.66],color:'#888888'},{geo:new T.BoxGeometry(.18,.12,.05),pos:[0,.95,.86],color:'#fff4dc'},{geo:new T.BoxGeometry(.16,.08,.05),pos:[0,.78,-.82],color:'#ff2020'}]),
    wheel:buildVC([{geo:new T.CylinderGeometry(s.wr,s.wr,.12,16).rotateZ(Math.PI/2),color:'#151515'},{geo:new T.CylinderGeometry(s.wr*.55,s.wr*.55,.13,10).rotateZ(Math.PI/2),color:'#b9bec5'}])};}
  const g=new T.Group(),bg=new T.Group();g.add(bg);const paint=new T.MeshStandardMaterial({color:lin(color),roughness:ENV_OK?.3:.4,metalness:ENV_OK?.5:.1});
  const a=new T.Mesh(BIKEG.paint,paint),d=new T.Mesh(BIKEG.dark,WHEELM);a.castShadow=d.castShadow=Q.shadows;bg.add(a,d);
  const wheels=[],steer=[];for(const sz of[1,-1]){const pv=new T.Group();pv.position.set(0,s.wr,sz*s.wz);const w=new T.Mesh(BIKEG.wheel,WHEELM);w.castShadow=Q.shadows;pv.add(w);bg.add(pv);wheels.push(w);if(sz>0)steer.push(pv);}
  const rider=makeHuman(randomLook('ped'));scene.remove(rider.root);rider.root.position.set(0,.05,-.25);bg.add(rider.root);rideBikePose(rider);rider.root.visible=false;
  if(!Q.shadows){const sh=new T.Mesh(new T.PlaneGeometry(.8,2).rotateX(-Math.PI/2),shadowMat);sh.position.y=.04;g.add(sh);}
  scene.add(g);return{g,bg,wheels,steer,paint,rider,spec:Object.assign({},CAR_T.bike),body:'bike'};}
function rideBikePose(H){H.hips.position.y=.88;H.legL.rotation.x=H.legR.rotation.x=-1.25;H.legL.rotation.z=.12;H.legR.rotation.z=-.12;H.knL.rotation.x=H.knR.rotation.x=1.45;H.armL.rotation.x=H.armR.rotation.x=-1.1;H.elL.rotation.x=H.elR.rotation.x=-.35;H.spine.rotation.x=.28;H.spine.rotation.y=0;}

/* ---------- entities ---------- */
const cars=[],npcs=[];
let time=0;
function newCar(type,x,z,h,kind,color){const m=makeCar(type,color||pick(CARC));if(m.rider)m.rider.root.visible=kind==='traffic';const c={type,x,z,h,vx:0,vz:0,vf:0,steer:0,kind,m,mesh:m.g,wheels:m.wheels,steerW:m.steer,spec:m.spec,mass:m.spec.mass,driver:kind==='traffic'||kind==='police',ai:null,stuck:0,hp:100};cars.push(c);syncCar(c);return c;}
function syncCar(c){if(!inHills(c.x,c.z)){c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.set(0,c.h,0);return;}const fx=Math.sin(c.h),fz=Math.cos(c.h);
  const hf=heightAt(c.x+fx*1.4,c.z+fz*1.4),hb=heightAt(c.x-fx*1.4,c.z-fz*1.4),hr=heightAt(c.x+fz*.9,c.z-fx*.9),hl=heightAt(c.x-fz*.9,c.z+fx*.9);
  c.mesh.rotation.order='YXZ';c.mesh.position.set(c.x,(hf+hb+hr+hl)/4+.08,c.z);c.mesh.rotation.set(Math.atan2(hb-hf,2.8),c.h,Math.atan2(hr-hl,1.8));}
function removeCar(c){c.mesh.visible=false;(carPool[c.type]=carPool[c.type]||[]).push(c.m);const i=cars.indexOf(c);if(i>=0)cars.splice(i,1);}
function carStep(c,dt,thr,brk,st,hb){
  const s=c.spec,fx=Math.sin(c.h),fz=Math.cos(c.h),rx=-fz,rz=fx;
  let vf=c.vx*fx+c.vz*fz,vl=c.vx*rx+c.vz*rz;
  if(thr>0){if(vf<-.5)vf+=s.brk*thr*dt;else vf+=s.acc*thr*dt*Math.max(0,1-vf/s.max);}
  if(brk>0){if(vf>.5)vf-=s.brk*brk*dt;else vf-=s.acc*.55*brk*dt*Math.max(0,1+vf/(s.max*.3));}
  if(!thr&&!brk){vf-=vf*.18*dt+Math.sign(vf)*Math.min(Math.abs(vf),1.2*dt);}
  if(hb)vf-=Math.sign(vf)*Math.min(Math.abs(vf),11*dt);
  vl-=vl*Math.min(1,(hb?1.6:s.grip)*dt);
  const maxSt=.62/(1+Math.abs(vf)/22);c.steer+=(st*maxSt-c.steer)*Math.min(1,9*dt);
  const yaw=vf*Math.tan(c.steer)/2.7*(hb?1.35:1);c.h-=yaw*dt;
  const nfx=Math.sin(c.h),nfz=Math.cos(c.h),nrx=-nfz,nrz=nfx;
  c.vx=nfx*vf+nrx*vl;c.vz=nfz*vf+nrz*vl;c.vf=vf;
  c.x+=c.vx*dt;c.z+=c.vz*dt;
  // static collision with two circles
  lampHits(c);if(inHills(c.x,c.z)){const fx=Math.sin(c.h),fz=Math.cos(c.h),sl=(heightAt(c.x-fx*1.4,c.z-fz*1.4)-heightAt(c.x+fx*1.4,c.z+fz*1.4))/2.8;c.vx+=fx*9.8*sl*dt*.7;c.vz+=fz*9.8*sl*dt*.7;}const CO=s.co||1.25,CR=s.cr||1.15;for(const o of[CO,-CO]){const cx=c.x+nfx*o,cz=c.z+nfz*o,p=resolve(cx,cz,CR);if(p){c.x+=p[0];c.z+=p[1];const l=hyp(p[0],p[1])||1,nx=p[0]/l,nz=p[1]/l,vn=c.vx*nx+c.vz*nz;if(vn<0){c.vx-=nx*vn*1.35;c.vz-=nz*vn*1.35;if(-vn>9)onCrash(c,-vn);}}}
  for(const w of c.wheels)w.rotation.x+=vf*dt/c.spec.wr;for(const p of c.steerW)p.rotation.y=-c.steer;
  // suspension: body pitches under braking/acceleration, rolls in corners (bikes lean into the turn)
  if(c.m.bg&&dt>0&&c.mesh.visible){const sp=c.sus||(c.sus={p:0,pv:0,r:0,rv:0,y:0,yv:0,lv:vf});const acc=clamp((vf-sp.lv)/dt,-60,60);sp.lv=vf;const bike=s.bike;
    const pT=clamp(-acc*.006,-.07,.07),rT=bike?clamp(c.steer*Math.min(1,Math.abs(vf)/8)*1.2,-.6,.6):clamp(-vf*yaw*.012,-.075,.075),K=bike?40:90,D=bike?12:11;
    sp.pv+=((pT-sp.p)*K-sp.pv*D)*dt;sp.p+=sp.pv*dt;sp.rv+=((rT-sp.r)*K-sp.rv*D)*dt;sp.r+=sp.rv*dt;sp.yv+=(-sp.y*140-sp.yv*10)*dt;sp.y+=sp.yv*dt;
    c.m.bg.rotation.x=sp.p;c.m.bg.rotation.z=sp.r;c.m.bg.position.y=sp.y;}
  syncCar(c);
}

/* ---------- player ---------- */
const P={x:0,z:0,y:0,vy:0,h:0,hp:maxHp(),boostT:0,car:null,H:makeHuman(CHARS[save.char]||CHARS.minh),punchCD:0,lastPunch:-9,koT:0,dirty:0,inv:0,moving:0,combo:0,pend:null,lunge:0,kvx:0,kvz:0,blocking:false,blockStart:-9,getUp:false};
function spawnAt(x,z,h){P.inside=null;P.x=x;P.z=z;P.h=h||0;P.y=0;P.vy=0;cam.yaw=P.h;P.H.root.visible=true;}
const cam={yaw:0,pitch:.28,dist:6.5,lastDrag:-1e9,drag:null,shake:0};

/* ---------- traffic ---------- */
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const inb=i=>i>=0&&i<=N;
function pickDir(a,d){let o=DIRS.filter(q=>!(q[0]===-d[0]&&q[1]===-d[1])&&inb(a[0]+q[0])&&inb(a[1]+q[1]));if(!o.length)o=[[-d[0],-d[1]]];if(o.length>1&&Math.random()<.5){const s=o.find(q=>q[0]===d[0]&&q[1]===d[1]);if(s)return s;}return pick(o);}
function lanePt(a,d,t){return[road(a[0])+d[0]*t-d[1]*LANE,road(a[1])+d[1]*t+d[0]*LANE];}
const axisOf=d=>d[0]?'EW':'NS';
function nearestNode(x,z){return[clamp(Math.round((x+HALF)/CELL),0,N),clamp(Math.round((z+HALF)/CELL),0,N)];}
function spawnTraffic(near){for(let tries=0;tries<20;tries++){const a=[Math.floor(rnd(0,N+1)),Math.floor(rnd(0,N+1))];const d=pickDir(a,[0,0]);const t=rnd(8,CELL-18);const[x,z]=lanePt(a,d,t);const dist=hyp(x-P.x,z-P.z);if(near&&(dist<70||dist>Q.cull))continue;if(cars.some(c=>hyp(c.x-x,c.z-z)<10))continue;
  const c=newCar(pick(['sedan','sedan','sedan','suv','suv','sports','taxi','bike','bike','bike']),x,z,Math.atan2(d[0],d[1]),'traffic');c.ai={a,d,next:pickDir([a[0]+d[0],a[1]+d[1]],d),cruise:rnd(11,15),wait:0,ghost:0};const v=c.ai.cruise*.7;c.vx=Math.sin(c.h)*v;c.vz=Math.cos(c.h)*v;return c;}return null;}
function trafficAI(c,dt){
  const ai=c.ai,d=ai.d;const ax=road(ai.a[0]),az=road(ai.a[1]);let t=(c.x-ax)*d[0]+(c.z-az)*d[1];
  if(t>CELL-3){ai.a=[ai.a[0]+d[0],ai.a[1]+d[1]];ai.d=ai.next;ai.next=pickDir([ai.a[0]+ai.d[0],ai.a[1]+ai.d[1]],ai.d);return trafficAI(c,0);}
  const sp=Math.max(0,c.vf),L=5+sp*.45;let tx,tz;
  if(t+L<=CELL-RW/2){[tx,tz]=lanePt(ai.a,d,t+L);}else{const turn=ai.next[0]!==d[0]||ai.next[1]!==d[1];const na=[ai.a[0]+d[0],ai.a[1]+d[1]];const rem=t+L-CELL;[tx,tz]=lanePt(na,ai.next,turn?Math.max(RW/2+1,rem):rem);}
  const err=angD(Math.atan2(tx-c.x,tz-c.z),c.h);const st=clamp(-err*2.2,-1,1);
  let target=ai.cruise;const toNode=CELL-t;
  if((ai.next[0]!==d[0]||ai.next[1]!==d[1])&&toNode<22)target=Math.min(target,7);
  const nxt=[ai.a[0]+d[0],ai.a[1]+d[1]];const L8=light(nxt[0],nxt[1],axisOf(d),time);
  const stop=toNode-RW/2-2.5;if(L8!=='G'&&stop>-.5&&stop<16&&!(L8==='Y'&&stop<4))target=Math.min(target,Math.max(0,stop*.9));
  let block=99;if(ai.ghost>0)ai.ghost-=dt;else{const fx=Math.sin(c.h),fz=Math.cos(c.h);
    const chk=(x,z,lat)=>{const dx=x-c.x,dz=z-c.z,ah=dx*fx+dz*fz;if(ah>0&&ah<12&&Math.abs(dx*-fz+dz*fx)<lat)block=Math.min(block,ah);};
    for(const o of cars)if(o!==c)chk(o.x,o.z,2.4);if(!P.car)chk(P.x,P.z,1.6);for(const n of npcs)if(n.onRoad)chk(n.x,n.z,1.4);}
  if(block<99){target=Math.min(target,Math.max(0,(block-5.5)*1.2));ai.wait+=dt;if(ai.wait>7){ai.ghost=2.5;ai.wait=0;}}else ai.wait=0;
  const v=c.vf;let thr=0,brk=0;if(v<target-.4)thr=clamp((target-v)/4,0,1);else if(v>target+.4)brk=clamp((v-target)/3,0,1);
  carStep(c,dt,thr,brk,st,false);
  const[lx,lz]=lanePt(ai.a,d,clamp(t,0,CELL));if(hyp(lx-c.x,lz-c.z)>16&&t>0&&t<CELL){c.kind='parked';c.ai=null;c.driver=true;}
}

/* ---------- pedestrians & NPC humans ---------- */
function perim(b,s){const x0=b.x0+2,x1=b.x1-2,z0=b.z0+2,z1=b.z1-2,w=x1-x0,d=z1-z0,L=2*(w+d);s=((s%L)+L)%L;if(s<w)return[x0+s,z0,1,0];s-=w;if(s<d)return[x1,z0+s,0,1];s-=d;if(s<w)return[x1-s,z1,-1,0];s-=w;return[x0,z1-s,0,-1];}
function perimS(b,x,z){const x0=b.x0+2,x1=b.x1-2,z0=b.z0+2,z1=b.z1-2,w=x1-x0,d=z1-z0;const cx=clamp(x,x0,x1),cz=clamp(z,z0,z1);const dl=[Math.abs(cz-z0),Math.abs(cx-x1),Math.abs(cz-z1),Math.abs(cx-x0)];const m=dl.indexOf(Math.min(...dl));return m===0?cx-x0:m===1?w+cz-z0:m===2?w+d+x1-cx:2*w+d+z1-cz;}
function blockAt(x,z){const i=Math.floor((x+HALF)/CELL),j=Math.floor((z+HALF)/CELL);return i>=0&&j>=0&&i<N&&j<N?BK(i,j):null;}
function newNPC(kind,x,z,o){let H;if(kind==='ped'&&humanPool.length){H=humanPool.pop();resetHuman(H);}else H=makeHuman(randomLook(kind));const n=Object.assign({kind,x,z,h:rnd(0,6.28),H,hp:kind==='cop'?90:kind==='guard'?90:kind==='fighter'?110:60,state:'walk',spd:0,t:0,cd:rnd(.3,1),dir:Math.random()<.5?1:-1,walkSpd:rnd(1.2,1.7),b:null,s:0,vx:0,vz:0,kvx:0,kvz:0,stag:0,kd:0,windT:0,pend:0,atkK:'punch'},o||{});n.maxHp=n.hp;npcs.push(n);if(kind==='cop'||kind==='guard')giveCopGun(n);n.H.root.position.set(x,0,z);return n;}
function removeNPC(n){if(n.kind==='ped'&&!n.mission){n.H.root.visible=false;humanPool.push(n.H);}else{scene.remove(n.H.root);n.H.root.traverse(o=>{if(o.geometry&&o.material===HUMAT)o.geometry.dispose();});}const i=npcs.indexOf(n);if(i>=0)npcs.splice(i,1);}
function spawnPed(){for(let k=0;k<20;k++){const a=rnd(0,6.28),r=rnd(40,Q.cull-20);const b=blockAt(P.x+Math.cos(a)*r,P.z+Math.sin(a)*r);if(!b||b.d==='river'||b.d==='stadium')continue;const s=rnd(0,200);const p=perim(b,s);if(hyp(p[0]-P.x,p[1]-P.z)<30)continue;const n=newNPC('ped',p[0],p[1],{b,s,fighter:Math.random()<.3});return n;}}
function koNPC(n,by){n.state='down';n.H.ko=1;n.t=rnd(12,18);n.hp=0;if(by==='player'&&!n.mission){if(n.kind==='cop'){crime(2,true);}else crime(1,false);}}
function hurtNPC(n,dmg,fx,fz,by,knock){if(n.state==='down')return;n.hp-=dmg;const H=n.H;H.hitT=.3;H.hitSide=Math.random()<.5?-1:1;
  const kb=knock?7.5:3.2;n.kvx+=fx*kb;n.kvz+=fz*kb;n.stag=knock?.5:.38;n.windT=0;n.pend=0;H.windT=0;H.punchT=0;
  if(n.hp<=0){koNPC(n,by);return;}
  if(knock){n.kd=1.5;H.ko=1;}
  if(by==='player'){if(n.kind==='ped'){if(n.fighter){n.state='fight';n.t=25;}else{n.state='flee';n.t=7;}crime(1,false);}else if(n.kind==='cop'){crime(1,true);n.state='fight';}else{n.state='fight';n.t=30;}}}
function npcUpdate(n,dt){
  const H=n.H,dp=hyp(n.x-P.x,n.z-P.z);
  if(dp>Q.cull+20&&(n.kind==='ped')){removeNPC(n);return;}
  const vis=dp<Q.cull;H.root.visible=vis;
  let spd=0;
  if(n.kvx||n.kvz){n.x+=n.kvx*dt;n.z+=n.kvz*dt;const f=Math.exp(-7*dt);n.kvx*=f;n.kvz*=f;if(Math.abs(n.kvx)+Math.abs(n.kvz)<.05)n.kvx=n.kvz=0;const p=resolve(n.x,n.z,.35);if(p){n.x+=p[0];n.z+=p[1];}}
  if(n.stag>0)n.stag-=dt;H.aim=0;
  if(n.state==='down'){n.t-=dt;if(n.t<=0){H.ko=0;n.hp=n.kind==='ped'?40:60;n.state=n.kind==='ped'?'flee':'fight';n.t=8;}}
  else if(n.kd>0){n.kd-=dt;H.guard=0;if(n.kd<=0){H.ko=0;n.stag=.75;}}
  else{
    // car threats & hits
    for(const c of cars){const sp=Math.abs(c.vf);if(sp<3)continue;const dx=n.x-c.x,dz=n.z-c.z;if(dx*dx+dz*dz>64)continue;const fx=Math.sin(c.h),fz=Math.cos(c.h),lz=dx*fx+dz*fz,lx=dx*-fz+dz*fx;
      if(Math.abs(lx)<1.25&&Math.abs(lz)<2.55){if(sp>5){const s=Math.sign(c.vf);n.x+=fx*s*2.2;n.z+=fz*s*2.2;n.hp-=sp*3.2;koNPC(n,null);n.t=Math.max(n.t,10);if(c===P.car)crime(n.kind==='cop'?2:1,n.kind==='cop');c.vx*=.9;c.vz*=.9;return;}else{n.x+=dx>0?.1:-.1;}}
      else if(lz*Math.sign(c.vf)<0&&Math.abs(lx)<3&&n.state==='walk'&&sp>7){n.state='flee';n.t=3;}}
    if(n.state==='walk'){
      if(n.b){n.s+=n.dir*n.walkSpd*dt;const p=perim(n.b,n.s);n.x=p[0];n.z=p[1];n.h=Math.atan2(p[2]*n.dir,p[3]*n.dir);spd=n.walkSpd;}
      else if(n.kind==='cop'||n.kind==='guard'){n.state='fight';}
    }else if(n.state==='flee'){
      n.t-=dt;const ax=n.x-P.x,az=n.z-P.z,l=hyp(ax,az)||1;const tx=ax/l,tz=az/l;n.h=lerpA(n.h,Math.atan2(tx,tz),Math.min(1,dt*8));spd=6.2;n.x+=Math.sin(n.h)*spd*dt;n.z+=Math.cos(n.h)*spd*dt;
      if(n.t<=0&&n.kind==='ped'){n.state='walk';n.b=blockAt(n.x,n.z)||n.b;if(n.b)n.s=perimS(n.b,n.x,n.z);}
    }else if(n.state==='fight'){
      n.t-=dt;H.guard=1;
      const tgtCar=P.car;const tx=P.x,tz=P.z;n.h=lerpA(n.h,Math.atan2(tx-n.x,tz-n.z),Math.min(1,dt*7));
      const reach=tgtCar?2.6:1.3,face=Math.atan2(tx-n.x,tz-n.z);n.cd-=dt;
      if(n.stag>0){/* staggered: can't act */}
      else if((n.kind==='cop'||n.kind==='guard')&&npcShoot(n,dt)){spd=0;}
      else if(n.windT>0){n.windT-=dt;spd=0;if(n.windT<=0){if(n.atkK==='kick')H.kickT=.5;else H.punchT=.32;n.pend=n.atkK==='kick'?.19:.11;sfx('swing');}}
      else if(n.pend>0){n.pend-=dt;if(n.pend<=0&&!P.car&&P.koT<=0&&hyp(n.x-P.x,n.z-P.z)<(n.atkK==='kick'?2.15:1.75))playerHitBy(n);}
      else if(dp>reach+.25){
        if(dp>4.5||tgtCar){spd=dp>6?6:3.4;n.x+=Math.sin(n.h)*spd*dt;n.z+=Math.cos(n.h)*spd*dt;}
        else{// circle the player while closing in, like a real scrap
          const ang=face+n.dir*(n.cd>0?1.25:.35);spd=n.cd>0?2:3.2;n.x+=Math.sin(ang)*spd*dt;n.z+=Math.cos(ang)*spd*dt;if(Math.random()<dt*.4)n.dir=-n.dir;}}
      else if(!tgtCar){
        if(n.cd<=0&&P.koT<=0){const kickP=n.kind==='fighter'?.3:n.kind==='cop'?.12:n.kind==='guard'?.15:.08;n.atkK=Math.random()<kickP?'kick':'punch';n.windT=n.atkK==='kick'?.42:rnd(.22,.3);H.windT=H.windD=n.windT;H.windKick=n.atkK==='kick';if(!H.windKick)H.side=-H.side;n.cd=(n.kind==='cop'?rnd(1,1.5):rnd(.85,1.4))+n.windT;}
        else if(dp<.9){spd=1.6;n.x-=Math.sin(face)*spd*dt;n.z-=Math.cos(face)*spd*dt;}
        else{const ang=face+Math.PI/2*n.dir;spd=.9;n.x+=Math.sin(ang)*spd*dt;n.z+=Math.cos(ang)*spd*dt;}}
      if(n.kind==='cop'){if(stars===0){n.state='leave';}}
      else if((n.kind==='ped'||n.kind==='fighter'&&!n.mission)&&(n.t<=0||dp>35||P.car)){n.state='flee';n.t=4;H.guard=0;}
      if(n.kind==='guard'&&dp>45){n.state='leave';}
    }else if(n.state==='leave'){H.guard=0;spd=4;n.h=lerpA(n.h,Math.atan2(n.x-P.x,n.z-P.z),dt*4);n.x+=Math.sin(n.h)*spd*dt;n.z+=Math.cos(n.h)*spd*dt;if(dp>70)removeNPC(n);}
    if(n.state!=='fight')H.guard=0;
    const p=resolve(n.x,n.z,.35);if(p){n.x+=p[0];n.z+=p[1];if(n.state==='walk'&&n.b){n.dir=-n.dir;}}
  }
  n.onRoad=!blockAt(n.x,n.z)||(()=>{const b=blockAt(n.x,n.z);return n.x<b.x0||n.x>b.x1||n.z<b.z0||n.z>b.z1;})();
  if(vis){H.root.position.set(n.x,(blockAt(n.x,n.z)&&!n.onRoad)?.25:heightAt(n.x,n.z),n.z);H.root.rotation.y=n.h;animHuman(H,dt,spd,time);}
}

/* ---------- player combat & damage ---------- */
let flashT=0;
function hurtPlayer(d,src){if(P.koT>0||P.inv>0)return;if(save.armor>0){const a=Math.min(save.armor,d*.75);save.armor-=a;d-=a;}P.hp-=d;flashT=.35;P.H.hitT=.2;if(src){const dx=P.x-src.x,dz=P.z-src.z,l=hyp(dx,dz)||1;P.x+=dx/l*.3;P.z+=dz/l*.3;}if(P.hp<=0)wasted();}
/* combat: 3-hit combo (jab, cross, kick), hold to block, timed block = parry. No weapons, no blood. */
const ATK=[{dmg:[13,17],t:.11,cd:.24,kind:'jab',side:-1,reach:1.75},{dmg:[18,23],t:.12,cd:.28,kind:'cross',side:1,reach:1.8},{dmg:[30,38],t:.19,cd:.55,kind:'kick',reach:2.1,knock:true}];
let hitStop=0,lastFoe=null;
function nearestFoe(r,cone){let best=null,bd=r;for(const n of npcs){if(n.state==='down')continue;const d=hyp(n.x-P.x,n.z-P.z);if(d<bd&&(cone===undefined||Math.abs(angD(Math.atan2(n.x-P.x,n.z-P.z),P.h))<cone)){bd=d;best=n;}}return best;}
function playerPunch(){
  if(P.car||P.koT>0||P.punchCD>0||P.blocking)return;
  const step=time-P.lastPunch<.8?(P.combo+1)%3:0;P.combo=step;const A=ATK[step];P.punchCD=A.cd;P.lastPunch=time;const H=P.H;
  if(A.kind==='kick')H.kickT=.5;else{H.side=A.side;H.punchT=.32;}
  let best=nearestFoe(3,1.3)||nearestFoe(2.2);let bd=best?hyp(best.x-P.x,best.z-P.z):3;
  if(bag){const d=hyp(bag.x-P.x,bag.z-P.z);if(d<bd&&Math.abs(angD(Math.atan2(bag.x-P.x,bag.z-P.z),P.h))<1.3){best=bag;bd=d;}}
  if(best){P.h=Math.atan2(best.x-P.x,best.z-P.z);if(bd>A.reach-.5)P.lunge=Math.min(1.2,bd-(A.reach-.6));}
  P.pend={t:A.t,best,A};sfx('swing');
}
function resolvePlayerHit(pe){const best=pe.best,A=pe.A;if(!best||P.car)return;const d=hyp(best.x-P.x,best.z-P.z);if(d>A.reach)return;const fx=Math.sin(P.h),fz=Math.cos(P.h),hy=A.kind==='kick'?1.05:1.45;
  if(best===bag){bag.vel+=A.kind==='kick'?5:3;bag.hits++;cam.shake=.08;sfx('hit');fx3(bag.x-fx*.3,hy,bag.z-fz*.3,false);return;}
  const n=best,bc=n.kind==='fighter'?.28+(n.mission&&mis?mis.wave*.06:0):n.kind==='cop'?.22:n.kind==='guard'?.25:n.fighter?.12:0;
  lastFoe={n,t:time};
  if(A.kind!=='kick'&&n.windT<=0&&n.pend<=0&&n.stag<=0&&n.state==='fight'&&Math.random()<bc){n.H.block=.35;n.kvx+=fx*1.5;n.kvz+=fz*1.5;hurtNPC(n,rnd(...A.dmg)*.2,0,0,'player');n.stag=0;n.H.hitT=0;sfx('block');fx3(n.x-fx*.4,hy,n.z-fz*.4,true);showPrompt('Đối thủ đỡ đòn · dùng cú đá (đòn 3) để phá thế đỡ',1.2);return;}
  hurtNPC(n,rnd(...A.dmg),fx,fz,'player',A.knock);cam.shake=A.knock?.2:.1;hitStop=A.knock?.09:.05;sfx(A.knock?'heavy':'hit');fx3(n.x-fx*.35,hy,n.z-fz*.35,false);}
function playerHitBy(n){const kick=n.atkK==='kick';let d=(n.kind==='cop'?7:n.kind==='guard'?8:6+(n.mission&&mis?mis.wave:0))*(kick?1.6:1);
  const facing=Math.abs(angD(Math.atan2(n.x-P.x,n.z-P.z),P.h))<1.4;const fx=Math.sin(n.h),fz=Math.cos(n.h);
  if(P.blocking&&facing){if(time-P.blockStart<.28){n.stag=1.1;n.windT=0;n.pend=0;n.kvx-=fx*3;n.kvz-=fz*3;n.H.hitT=.3;cam.shake=.12;hitStop=.08;sfx('block');fx3(P.x+fx*-.5,1.4,P.z+fz*-.5,true);showPrompt('Đỡ đúng lúc! Đối thủ mất thăng bằng',1);return;}
    d*=.2;sfx('block');fx3(P.x-fx*.5,1.4,P.z-fz*.5,true);P.kvx=(P.kvx||0)+fx*1.2;P.kvz=(P.kvz||0)+fz*1.2;}
  else{sfx(kick?'heavy':'hit');fx3(P.x-fx*.4,kick?1:1.45,P.z-fz*.4,false);P.H.hitSide=Math.random()<.5?-1:1;P.kvx=(P.kvx||0)+fx*(kick?6:2.5);P.kvz=(P.kvz||0)+fz*(kick?6:2.5);cam.shake=kick?.22:.12;}
  hurtPlayer(d,null);
  if(kick&&!(P.blocking&&facing)&&P.hp>0&&P.koT<=0){P.koT=1.25;P.H.ko=1;P.getUp=true;}}
// impact flashes: small pool of additive sprites (white/yellow on hit, pale blue on block)
const fxTex=makeTex(64,64,(g)=>{g.translate(32,32);const r=g.createRadialGradient(0,0,0,0,0,30);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,240,200,.8)');r.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=r;g.beginPath();for(let k=0;k<16;k++){const a=k/16*Math.PI*2,rr=k%2?11:30;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();},{repeat:false});
const FXP=[];for(let k=0;k<6;k++){const s=new T.Sprite(new T.SpriteMaterial({map:fxTex,transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,toneMapped:false}));s.visible=false;s.renderOrder=5;scene.add(s);FXP.push({s,t:0});}
function fx3(x,y,z,blk){const f=FXP.find(f=>f.t<=0)||FXP[0];f.t=.2;f.s.position.set(x,y,z);f.s.material.color.set(blk?'#9fd8ff':'#fff2c8');f.s.material.rotation=Math.random()*3;f.s.visible=true;}
// engine smoke from damaged cars (grey puffs, small pool)
const smkTex=makeTex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,30);r.addColorStop(0,'rgba(200,200,200,.9)');r.addColorStop(1,'rgba(160,160,160,0)');g.fillStyle=r;g.fillRect(0,0,64,64);},{repeat:false});
const SMK=[];for(let k=0;k<22;k++){const s=new T.Sprite(new T.SpriteMaterial({map:smkTex,transparent:true,depthWrite:false,color:0x888888}));s.visible=false;scene.add(s);SMK.push({s,t:0,vy:0});}let smkT=0,smkI=0;
function smokeUpdate(dt){smkT-=dt;if(smkT<=0){smkT=.09;for(const c of cars){if(c.hp>=40||!c.mesh.visible||hyp(c.x-P.x,c.z-P.z)>60)continue;const f=SMK[smkI++%SMK.length],fx=Math.sin(c.h),fz=Math.cos(c.h);f.t=1.6;f.s.position.set(c.x+fx*1.6+rnd(-.3,.3),1.1,c.z+fz*1.6+rnd(-.3,.3));f.s.material.color.set(c.hp<=0?'#3a3a3a':'#9a9a9a');f.s.visible=true;}
    for(const c of cars)if(c.hp<=0&&c.kind==='traffic')bailOut(c);}
  for(const f of SMK){if(f.t<=0)continue;f.t-=dt;f.s.position.y+=dt*1.6;const k=1-f.t/1.6;f.s.scale.setScalar(.8+k*2.6);f.s.material.opacity=.55*(1-k);if(f.t<=0)f.s.visible=false;}}
function fxUpdate(dt){smokeUpdate(dt);for(const f of FXP){if(f.t<=0)continue;f.t-=dt;const k=1-f.t/.2;f.s.scale.setScalar(.35+k*.9);f.s.material.opacity=Math.max(0,1-k);if(f.t<=0)f.s.visible=false;}}
// tiny synthesized sound effects (own AudioContext, created on first key/click)
let sfxAC=null;
function sfxInit(){if(sfxAC)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{sfxAC=new C();const b=sfxAC.createBuffer(1,sfxAC.sampleRate*.3,sfxAC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;sfxAC.nb=b;sfxAC.out=sfxAC.createGain();sfxAC.out.gain.value=.32;sfxAC.out.connect(sfxAC.destination);}catch(_){sfxAC=null;}}
function sfx(k){const a=sfxAC;if(!a||!active)return;if(a.state==='suspended')a.resume();const t=a.currentTime;
  const nz=(dur,f,type,v)=>{const s=a.createBufferSource();s.buffer=a.nb;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;const g=a.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(fl);fl.connect(g);g.connect(a.out);s.start(t);s.stop(t+dur+.02);};
  const th=(f0,f1,dur,v)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(a.out);o.start(t);o.stop(t+dur+.02);};
  if(k==='swing')nz(.12,1400,'bandpass',.18);
  else if(k==='hit'){nz(.09,900,'lowpass',.8);th(160,60,.12,.7);}
  else if(k==='heavy'){nz(.16,700,'lowpass',1);th(120,40,.2,.9);}
  else if(k==='block'){nz(.06,2600,'bandpass',.6);th(420,300,.06,.25);}
  else if(k==='door'){th(140,90,.12,.4);nz(.05,3000,'highpass',.15);}
  else if(k==='cash'){const o=(f,d)=>{const s=a.createOscillator(),g=a.createGain();s.type='triangle';s.frequency.value=f;g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(.35,t+d+.01);g.gain.exponentialRampToValueAtTime(.001,t+d+.25);s.connect(g);g.connect(a.out);s.start(t+d);s.stop(t+d+.3);};o(1320,0);o(1760,.08);}
  else if(k==='crash'){nz(.35,900,'lowpass',1.2);th(90,35,.3,.8);nz(.25,4000,'highpass',.3);}
  else if(k==='pistol'){nz(.12,2200,'lowpass',1.3);th(220,60,.1,.9);}
  else if(k==='smg'){nz(.07,2600,'lowpass',1);th(260,90,.06,.6);}
  else if(k==='rifle'){nz(.2,1800,'lowpass',1.5);th(160,45,.16,1);nz(.3,600,'lowpass',.4);}
  else if(k==='ric'){th(2400,900,.08,.12);}
  else if(k==='empty'){th(900,800,.03,.2);}
  else if(k==='horn'){for(const f of[392,494]){const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.12,t);g.gain.setValueAtTime(.12,t+.35);g.gain.exponentialRampToValueAtTime(.001,t+.45);const fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=1800;o.connect(fl);fl.connect(g);g.connect(a.out);o.start(t);o.stop(t+.5);}}
  else if(k==='thunder'){const s=a.createBufferSource();s.buffer=a.nb;s.loop=true;const fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=260;const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(1.4,t+.15);g.gain.exponentialRampToValueAtTime(.001,t+3.2);s.connect(fl);fl.connect(g);g.connect(a.out);s.start(t);s.stop(t+3.3);}}
/* continuous sounds: engine, tyre screech, siren, rain, city ambience */
let LOOPS=null;
function loopsInit(){const a=sfxAC;if(!a||LOOPS)return;const mk=(type,f)=>{const s=a.createBufferSource();s.buffer=a.nb;s.loop=true;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;const g=a.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(a.out);s.start();return{g,fl};};
  const eo=a.createOscillator();eo.type='sawtooth';const eo2=a.createOscillator();eo2.type='square';const ef=a.createBiquadFilter();ef.type='lowpass';ef.frequency.value=500;const eg=a.createGain();eg.gain.value=0;eo.connect(ef);eo2.connect(ef);ef.connect(eg);eg.connect(a.out);eo.start();eo2.start();
  const so=a.createOscillator();so.type='square';const lfo=a.createOscillator();lfo.frequency.value=1.6;const lg=a.createGain();lg.gain.value=260;lfo.connect(lg);lg.connect(so.frequency);so.frequency.value=900;const sf=a.createBiquadFilter();sf.type='lowpass';sf.frequency.value=1800;const sg=a.createGain();sg.gain.value=0;so.connect(sf);sf.connect(sg);sg.connect(a.out);so.start();lfo.start();
  LOOPS={eo,eo2,ef,eg,sg,screech:mk('bandpass',2200),rain:mk('lowpass',2400),amb:mk('lowpass',380),surf:mk('lowpass',600)};}
let engineRun=false;function engineOn(){engineRun=true;}function engineOff(){engineRun=false;}
function audioUpdate(dt){if(!sfxAC)return;loopsInit();const Lp=LOOPS,t=sfxAC.currentTime,k=.08,on=active&&!paused;
  const c=P.car;let eg=0,ef=60,sc=0;if(on&&c&&engineRun){const v=Math.abs(c.vf),gear=Math.min(4,Math.floor(v/9)),r=(v-gear*9)/9;ef=(c.type==='bike'?70:45)+gear*12+r*55;eg=c.hp>0?.06+Math.min(.06,v*.002):0;
    const rx=-Math.cos(c.h),rz=Math.sin(c.h),vl=Math.abs(c.vx*rx+c.vz*rz);sc=vl>3.5&&v>6?Math.min(.35,(vl-3.5)*.06):0;}
  Lp.eo.frequency.setTargetAtTime(ef,t,k);Lp.eo2.frequency.setTargetAtTime(ef*.5,t,k);Lp.ef.frequency.setTargetAtTime(300+ef*6,t,k);Lp.eg.gain.setTargetAtTime(eg,t,k);Lp.screech.g.gain.setTargetAtTime(sc,t,.05);
  let sd=1e9;if(on&&stars>0&&!P.inside)for(const p of cars)if(p.kind==='police'){const d=hyp(p.x-P.x,p.z-P.z);if(d<sd)sd=d;}Lp.sg.gain.setTargetAtTime(sd<120?.05*(1-sd/120):0,t,.2);
  const out=on&&!P.inside;Lp.rain.g.gain.setTargetAtTime(out?weather.w*.22:(on?weather.w*.05:0),t,.5);Lp.amb.g.gain.setTargetAtTime(out?.05+.05*tod.day:0,t,.5);
  Lp.surf.g.gain.setTargetAtTime(out&&P.x>SAND0-30?Math.min(.18,(P.x-SAND0+30)*.004):0,t,.5);}
/* ---------- guns: pistol, SMG, rifle. Hits knock people out (no blood); they wake up later ---------- */
const WEAP={pistol:{n:'Súng lục',dmg:24,rate:.3,spread:.018,range:70,auto:false,len:.26,two:false},smg:{n:'Tiểu liên',dmg:12,rate:.085,spread:.05,range:55,auto:true,len:.46,two:true},rifle:{n:'Súng trường',dmg:38,rate:.22,spread:.01,range:120,auto:true,len:.82,two:true}};
const WORDER=['fist','pistol','smg','rifle'];
P.weapon='fist';P.trigger=false;P.fireCD=0;P.aiming=false;
let weaponMesh=null;const WMESH={};
function gunGeo(w){if(WMESH[w])return WMESH[w];const L2=WEAP[w].len,parts=[{geo:new T.BoxGeometry(.055,L2,.1),pos:[0,-.3-L2/2+.08,.04],color:'#1c1d20'},{geo:new T.BoxGeometry(.05,.1,.14),pos:[0,-.27,-.06],color:'#2b2b2b'}];
  if(w!=='pistol')parts.push({geo:new T.BoxGeometry(.05,.16,.1),pos:[0,-.3-L2*.45,-.07],color:'#2b2b2b'},{geo:new T.BoxGeometry(.06,.2,.1),pos:[0,-.2,.02],color:w==='rifle'?'#5c4433':'#1c1d20'});
  return WMESH[w]=buildVC(parts);}
const GUNM=new T.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.5});
function attachWeapon(){if(weaponMesh&&weaponMesh.parent)weaponMesh.parent.remove(weaponMesh);weaponMesh=null;if(P.weapon==='fist')return;weaponMesh=new T.Mesh(gunGeo(P.weapon),GUNM);weaponMesh.castShadow=Q.shadows;P.H.elR.add(weaponMesh);}
function selectWeapon(w){if(w!=='fist'&&!save.weapons[w]){showPrompt(L('Chưa có súng này · mua ở Súng Tầm Xa','You do not own this gun · buy it at Súng Tầm Xa'),1.6);return;}P.weapon=w;P.trigger=false;attachWeapon();hudT=0;lastHUD='';}
function cycleWeapon(){const own=WORDER.filter(w=>w==='fist'||save.weapons[w]);const i=own.indexOf(P.weapon);selectWeapon(own[(i+1)%own.length]);}
function giveCopGun(n){const m=new T.Mesh(gunGeo('pistol'),GUNM);n.H.elR.add(m);n.gun=true;}
// tracers (one LineSegments, pooled) and muzzle flashes (reuse the impact sprites)
const TRN=8,trPos=new Float32Array(TRN*6),trGeo=new T.BufferGeometry();trGeo.setAttribute('position',new T.BufferAttribute(trPos,3));
const tracer=new T.LineSegments(trGeo,new T.LineBasicMaterial({color:0xfff2b0,transparent:true,opacity:.8,toneMapped:false}));tracer.frustumCulled=false;scene.add(tracer);let trI=0;const trT=new Float32Array(TRN);
function addTracer(a,b){const k=trI++%TRN,o=k*6;trPos.set([a.x,a.y,a.z,b.x,b.y,b.z],o);trT[k]=.06;trGeo.attributes.position.needsUpdate=true;}
function tracerUpdate(dt){let ch=false;for(let k=0;k<TRN;k++)if(trT[k]>0){trT[k]-=dt;if(trT[k]<=0){trPos.fill(0,k*6,k*6+6);ch=true;}}if(ch)trGeo.attributes.position.needsUpdate=true;}
const _o=new T.Vector3(),_d=new T.Vector3(),_m=new T.Vector3();
function muzzlePos(H,out){if(H===P.H&&weaponMesh){weaponMesh.updateWorldMatrix(true,false);return out.set(0,-.3-WEAP[P.weapon].len+.05,.04).applyMatrix4(weaponMesh.matrixWorld);}H.elR.updateWorldMatrix(true,false);return out.set(0,-.55,0).applyMatrix4(H.elR.matrixWorld);}
// ray vs people (vertical capsules), cars (spheres), buildings (marching) and ground
function rayHit(o,d,range,ignore){let best=range,hit=null,kind=null;
  for(const n of npcs){if(n===ignore||n.state==='down'||n.H.root.visible===false)continue;const dx=n.x-o.x,dz=n.z-o.z,hh=d.x*d.x+d.z*d.z;if(hh<1e-6)continue;const t=(dx*d.x+dz*d.z)/hh;if(t<0||t>best)continue;const px=o.x+d.x*t-n.x,pz=o.z+d.z*t-n.z,y=o.y+d.y*t;if(px*px+pz*pz<.16&&y>.1&&y<1.85){best=t;hit=n;kind='npc';}}
  if(ignore!==P&&!P.car&&!P.inside){const dx=P.x-o.x,dz=P.z-o.z,hh=d.x*d.x+d.z*d.z,t=(dx*d.x+dz*d.z)/hh;if(t>0&&t<best){const px=o.x+d.x*t-P.x,pz=o.z+d.z*t-P.z,y=o.y+d.y*t;if(px*px+pz*pz<.16&&y>.1&&y<1.85){best=t;hit=P;kind='player';}}}
  for(const c of cars){if(c===P.car&&ignore===P)continue;const r=c.type==='bike'?.8:1.7;_m.set(c.x-o.x,.9-o.y,c.z-o.z);const t=_m.dot(d);if(t<0||t>best)continue;const q=_m.lengthSq()-t*t;if(q<r*r){best=t-Math.sqrt(r*r-q);hit=c;kind='car';}}
  if(d.y<-1e-3){const t=-o.y/d.y;if(t<best){best=t;hit=null;kind='ground';}}
  for(let t=1;t<best;t+=1){const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;if(inBld(x,z,y)&&y<60){best=t;hit=null;kind='wall';break;}}
  return{t:best,hit,kind};}
function fireWeapon(){const w=P.weapon,W=WEAP[w];if(!W)return;if(save.ammo[w]<=0){sfx('empty');showPrompt(L('Hết đạn · mua thêm ở Súng Tầm Xa','Out of ammo · buy more at Súng Tầm Xa'),1.4);P.trigger=false;return;}
  save.ammo[w]--;P.fireCD=W.rate;P.lastShot=time;P.lastPunch=time;sfx(w);cam.shake=Math.max(cam.shake,w==='rifle'?.06:.03);
  muzzlePos(P.H,_o);if(P.aiming){camera.getWorldDirection(_d);const tgt=camera.position.clone().addScaledVector(_d,60);_d.copy(tgt).sub(_o).normalize();}
  else{const f=nearestFoe(W.range*.6,1.2);if(f){P.h=Math.atan2(f.x-P.x,f.z-P.z);_d.set(f.x-_o.x,1.25-_o.y,f.z-_o.z).normalize();}else _d.set(Math.sin(P.h),0,Math.cos(P.h));}
  _d.x+=rnd(-1,1)*W.spread;_d.y+=rnd(-1,1)*W.spread;_d.z+=rnd(-1,1)*W.spread;_d.normalize();
  const r=rayHit(_o,_d,W.range,P),end=_o.clone().addScaledVector(_d,r.t);addTracer(_o,end);fx3(_o.x,_o.y,_o.z,false);
  if(r.kind==='npc'){const n=r.hit;lastFoe={n,t:time};hurtNPC(n,W.dmg*rnd(.85,1.15),_d.x,_d.z,'player',w==='rifle'&&Math.random()<.4);if(n.kind==='cop')crime(2,true);fx3(end.x,end.y,end.z,true);}
  else if(r.kind==='car'){const c=r.hit;c.hp-=W.dmg*.5;sfx('ric');fx3(end.x,end.y,end.z,false);if(c.kind==='police')crime(1,true);if(c.driver&&c.kind==='traffic'&&Math.random()<.4)bailOut(c);}
  else if(r.kind){sfx('ric');fx3(end.x,end.y,end.z,true);}
  // gunfire scares people nearby; cops who see it react
  for(const n of npcs)if((n.kind==='ped'&&!n.fighter)&&n.state==='walk'&&hyp(n.x-P.x,n.z-P.z)<40){n.state='flee';n.t=rnd(6,10);}
  if(copsSee())crime(1,false);
  if(!W.auto)P.trigger=false;if(save.ammo[w]<=0)hudT=0;}
function bailOut(c){c.kind='parked';c.ai=null;c.driver=false;if(c.m.rider)c.m.rider.root.visible=false;const lx=Math.cos(c.h),lz=-Math.sin(c.h);const n=newNPC('ped',c.x+lx*2,c.z+lz*2,{state:'flee',t:8});n.b=blockAt(n.x,n.z);}
// cops with guns (3+ stars) and the helicopter (5 stars) shoot back
function npcShoot(n,dt){if(!n.gun||(stars<3&&n.kind!=='guard')||P.koT>0||(P.inside&&n.x<2500))return false;const dp=hyp(n.x-P.x,n.z-P.z);if(dp>32||dp<2.2)return false;if(!los(n.x,n.z,P.x,P.z))return false;
  n.H.aim=1;n.scd=(n.scd||rnd(.6,1.2))-dt;if(n.scd>0)return true;n.scd=rnd(.8,1.4);
  muzzlePos(n.H,_o);const t=P.car||P;_d.set(t.x-_o.x,1.2-_o.y,t.z-_o.z).normalize();let pHit=.42-(P.car?Math.min(.25,Math.abs(P.car.vf)*.01):0)-(P.moving>7?.15:0)+(dp<10?.15:0);
  const miss=Math.random()>pHit;if(miss){_d.x+=rnd(-.08,.08);_d.y+=rnd(-.04,.06);_d.z+=rnd(-.08,.08);_d.normalize();}
  const r=rayHit(_o,_d,40,n),end=_o.clone().addScaledVector(_d,r.t);addTracer(_o,end);fx3(_o.x,_o.y,_o.z,false);sfx('pistol');
  if(!miss&&P.car&&hyp(t.x-n.x,t.z-n.z)<40){P.car.hp-=4;if(Math.random()<.3)hurtPlayer(4,null);}else if(r.kind==='player'){hurtPlayer(7,n);P.H.hitT=.25;}else if(r.kind){sfx('ric');}
  return true;}
function heliShoot(dt){if(!heli.on||stars<5||P.inside)return;heli.scd=(heli.scd||1.5)-dt;if(heli.scd>0)return;heli.scd=rnd(1.2,2);const t=P.car||P;_o.set(heli.x,heli.y-1,heli.z);_d.set(t.x-_o.x,1-_o.y,t.z-_o.z).normalize();_d.x+=rnd(-.03,.03);_d.z+=rnd(-.03,.03);_d.normalize();
  const r=rayHit(_o,_d,90,null),end=_o.clone().addScaledVector(_d,r.t);addTracer(_o,end);sfx('smg');if(r.kind==='player')hurtPlayer(5,null);else if(P.car&&hyp(end.x-P.car.x,end.z-P.car.z)<2.5){P.car.hp-=3;}}
let bag=null;
function makeBag(x,z){const g=new T.Group();const fr=new T.Mesh(new T.BoxGeometry(.12,2.6,.12),mat('#333',.5,.6));fr.position.set(-.6,1.3,0);g.add(fr);const top=new T.Mesh(new T.BoxGeometry(.8,.1,.12),mat('#333',.5,.6));top.position.set(-.25,2.6,0);g.add(top);
  const piv=new T.Group();piv.position.set(0,2.55,0);g.add(piv);const b=new T.Mesh(new T.CylinderGeometry(.28,.28,1.1,14),mat('#8b1e1e',.7));b.position.y=-.9;b.castShadow=Q.shadows;piv.add(b);
  g.position.set(x,.25,z);scene.add(g);addCol({t:'c',x:x-.6,z,r:.15});return{x,z,g,piv,swing:0,hits:0,vel:0};}

/* ---------- wanted level & police ---------- */
let stars=0,seenT=0,evadeT=0,lastSeen=null,bustT=0,crimeCD=0;
const heli={on:false,g:null,x:0,z:0,y:46,rotor:null,beam:null};
function crime(n,force){if(crimeCD>0&&!force&&stars>0)return;crimeCD=1.2;const witnessed=force||copsSee()||Math.random()<.55;if(!witnessed)return;const b=stars;stars=Math.min(5,Math.max(stars+n,force&&n>=2?2:stars+n));evadeT=0;lastSeen={x:P.x,z:P.z};if(b===0&&stars>0)banner('Bị truy nã','Thoát khỏi tầm nhìn của cảnh sát để mất sao');}
function copsSee(){const t=P.car||P;for(const c of cars)if(c.kind==='police'){const d=hyp(c.x-t.x,c.z-t.z);if(d<75&&(d<16||los(c.x,c.z,t.x,t.z)))return true;}for(const n of npcs)if(n.kind==='cop'&&n.state!=='down'){const d=hyp(n.x-t.x,n.z-t.z);if(d<40&&(d<10||los(n.x,n.z,t.x,t.z)))return true;}if(heli.on&&hyp(heli.x-t.x,heli.z-t.z)<42)return true;return false;}
function spawnCop(){const cand=[];for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const d=hyp(road(i)-P.x,road(j)-P.z);if(d>85&&d<170)cand.push([i,j]);}if(!cand.length)return;const n=pick(cand);const x=road(n[0]),z=road(n[1]);if(cars.some(c=>hyp(c.x-x,c.z-z)<6))return;const c=newCar('police',x,z,Math.atan2(P.x-x,P.z-z),'police');c.ai={wp:null,from:n,rev:0,deployed:0};}
function policeAI(c,dt){
  const ai=c.ai,t=P.car||P,dist=hyp(t.x-c.x,t.z-c.z);
  if(stars===0){ai.leave=(ai.leave||0)+dt;carStep(c,dt,.35,0,0,false);if(ai.leave>8||dist>Q.cull)removeCar(c);return;}
  let tx=t.x,tz=t.z;if(!(seenT>0)&&lastSeen){tx=lastSeen.x;tz=lastSeen.z;}
  if(P.car){tx+=P.car.vx*.4;tz+=P.car.vz*.4;}
  const dt2=hyp(tx-c.x,tz-c.z);
  if(dt2>16&&!los(c.x,c.z,tx,tz)){
    if(!ai.wp){const n=nearestNode(c.x,c.z);ai.from=n;ai.wp=hyp(road(n[0])-c.x,road(n[1])-c.z)>8?n:null;}
    if(!ai.wp||hyp(road(ai.wp[0])-c.x,road(ai.wp[1])-c.z)<8){const n=ai.wp||ai.from,pn=nearestNode(tx,tz);const di=Math.sign(pn[0]-n[0]),dj=Math.sign(pn[1]-n[1]);const s=di&&dj?(Math.abs(pn[0]-n[0])>=Math.abs(pn[1]-n[1])?[di,0]:[0,dj]):[di,dj];ai.from=n;ai.wp=s[0]||s[1]?[n[0]+s[0],n[1]+s[1]]:null;}
    if(ai.wp){tx=road(ai.wp[0]);tz=road(ai.wp[1]);}
  }else ai.wp=null;
  const err=angD(Math.atan2(tx-c.x,tz-c.z),c.h);let st=clamp(-err*2.4,-1,1),thr=1,brk=0;
  if(ai.rev>0){ai.rev-=dt;thr=0;brk=1;st=-st;}
  else{if(Math.abs(err)>1.2&&c.vf>14){thr=0;brk=.7;}
    const onFoot=!P.car||Math.abs(P.car.vf)<3;if(dist<16&&onFoot){thr=0;brk=1;if(Math.abs(c.vf)<2&&ai.deployed<=0&&npcs.filter(n=>n.kind==='cop').length<6){ai.deployed=25;for(const s of[-1,1]){const n=newNPC('cop',c.x+Math.cos(c.h)*s*2.2,c.z-Math.sin(c.h)*s*2.2,{state:'fight'});n.car=c;}}}
    if(Math.abs(c.vf)<1.2&&thr>0){c.stuck+=dt;if(c.stuck>.9){ai.rev=1;c.stuck=0;ai.stuckN=(ai.stuckN||0)+1;}}else c.stuck=0;}
  if(ai.deployed>0)ai.deployed-=dt;
  carStep(c,dt,thr,brk,st,false);
  if(dist>Q.cull+60||(ai.stuckN||0)>8)removeCar(c);
}
function wantedUpdate(dt){
  crimeCD-=dt;
  if(stars<=0){bustT=0;if(heli.on)heliOff();return;}
  const wantCars=[0,1,2,3,4,5][stars];const have=cars.filter(c=>c.kind==='police').length;
  if(have<wantCars&&Math.random()<dt*1.5)spawnCop();
  if(stars>=4&&!heli.on)heliOn();if(stars<4&&heli.on)heliOff();
  const see=copsSee()||(P.inside&&stars>0);if(see){seenT=1;const o=P.inside?(P.outside||SP.bank.door):(P.car||P);lastSeen={x:o.x,z:o.z};evadeT=0;}else{seenT=0;evadeT+=dt;const need=9+stars*2.5;if(evadeT>need){stars=0;evadeT=0;lastSeen=null;banner('Đã thoát truy nã','Cảnh sát thôi tìm kiếm');}}
  // arrest
  let near=false;for(const n of npcs)if(n.kind==='cop'&&n.state==='fight'&&hyp(n.x-P.x,n.z-P.z)<1.7)near=true;for(const c of cars)if(c.kind==='police'&&hyp(c.x-P.x,c.z-P.z)<6.5)near=near||!!P.car;
  const slow=P.car?Math.abs(P.car.vf)<3:(time-P.lastPunch>2&&P.moving<.5);
  if(near&&slow&&stars<=3){bustT+=dt;if(bustT>2.4)busted();}else bustT=Math.max(0,bustT-dt);
}
function heliOn(){heli.on=true;if(!heli.g){const g=new T.Group();const body=new T.Mesh(new T.SphereGeometry(1.4,16,12),mat('#1c2230',.4,.5));body.scale.set(1,.9,1.9);g.add(body);const tail=new T.Mesh(new T.CylinderGeometry(.18,.32,5,8),mat('#1c2230',.4,.5));tail.rotation.x=Math.PI/2;tail.position.z=-3.6;g.add(tail);
  const glass=new T.Mesh(new T.SphereGeometry(1.0,12,10,0,Math.PI*2,0,Math.PI/2),GLASS);glass.position.set(0,.2,1.2);glass.rotation.x=.6;g.add(glass);
  const rot=new T.Mesh(new T.BoxGeometry(9,.06,.3),mat('#111',.5));rot.position.y=1.5;g.add(rot);const rot2=rot.clone();rot2.rotation.y=Math.PI/2;g.add(rot2);
  for(const s of[-1,1]){const sk=new T.Mesh(new T.BoxGeometry(.1,.1,3),mat('#222',.5,.5));sk.position.set(s*.9,-1.4,0);g.add(sk);}
  const bm=new T.Mesh(new T.ConeGeometry(7,46,24,1,true),new T.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:.11,depthWrite:false,side:T.DoubleSide}));bm.position.y=-23;g.add(bm);
  heli.g=g;heli.rot=[rot,rot2];scene.add(g);heli.x=P.x-80;heli.z=P.z-80;}heli.g.visible=true;}
function heliOff(){heli.on=false;if(heli.g)heli.g.visible=false;}
function heliUpdate(dt){if(!heli.on)return;const t=P.car||P;const dx=t.x-heli.x,dz=t.z-heli.z,d=hyp(dx,dz);const sp=Math.min(26,d*1.4);if(d>.5){heli.x+=dx/d*sp*dt;heli.z+=dz/d*sp*dt;}heli.g.position.set(heli.x,heli.y+Math.sin(time*1.3)*.6,heli.z);heli.g.rotation.y=Math.atan2(dx,dz);heli.g.rotation.x=Math.min(.25,sp/100);for(const r of heli.rot)r.rotation.y+=dt*28;}

/* ---------- respawn ---------- */
function clearChaos(){stars=0;evadeT=0;lastSeen=null;bustT=0;for(const c of cars.filter(c=>c.kind==='police'))removeCar(c);for(const n of npcs.filter(n=>n.kind==='cop'||n.kind==='guard'||n.kind==='fighter'))removeNPC(n);heliOff();}
function exitCarNow(){if(!P.car)return;radioStop();engineOff();dismount();P.car.kind='parked';P.car.driver=false;P.car=null;P.H.root.visible=true;}
function mount(c){if(c.type!=='bike')return;const H=P.H;scene.remove(H.root);H.root.position.set(0,.05,-.25);H.root.rotation.set(0,0,0);c.m.bg.add(H.root);H.root.visible=true;rideBikePose(H);P.bike=c;}
function dismount(){if(!P.bike)return;const H=P.H;P.bike.m.bg.remove(H.root);scene.add(H.root);H.legL.rotation.z=H.legR.rotation.z=0;H.hips.position.y=.95;H.root.rotation.set(0,0,0);P.bike=null;}
function loseDirty(){const d=P.dirty;P.dirty=0;if(heist&&heist.stage!=='done')heist=null;return d;}
function wasted(){const fine=Math.min(save.money,Math.max(100,Math.round(save.money*.08)));save.money-=fine;const d=loseDirty();exitCarNow();clearChaos();failMission('Bất tỉnh giữa nhiệm vụ');
  P.koT=3.2;P.H.ko=1;setTimeout(()=>{P.H.ko=0;P.koT=0;P.hp=maxHp();spawnAt(SP.hospital.x,SP.hospital.z,0);P.inv=3;},2600);
  banner('BẤT TỈNH',`Tỉnh dậy ở bệnh viện · viện phí ${fmt$(fine)}${d?` · mất ${fmt$(d)} tiền nóng`:''}`,3.6);writeSave();}
function busted(){const fine=Math.min(save.money,Math.round(save.money*.1));save.money-=fine;const d=loseDirty();exitCarNow();clearChaos();failMission('Bị bắt giữa nhiệm vụ');
  P.hp=maxHp();spawnAt(SP.police.x,SP.police.z,0);P.inv=3;banner('BỊ BẮT',`Nộp phạt ${fmt$(fine)}${d?` · tịch thu ${fmt$(d)} tiền nóng`:''}`,3.6);writeSave();}

/* ---------- car enter / exit ---------- */
function toggleCar(){
  if(P.koT>0)return;
  if(P.car){const c=P.car;if(Math.abs(c.vf)>6){showPrompt('Giảm tốc để xuống xe',1.2);return;}
    const lx=Math.cos(c.h),lz=-Math.sin(c.h);let ok=false;for(const s of[1.9,-1.9]){const x=c.x+lx*s,z=c.z+lz*s;if(!resolve(x,z,.4)){P.x=x;P.z=z;ok=true;break;}}if(!ok){P.x=c.x+Math.sin(c.h)*3.2;P.z=c.z+Math.cos(c.h)*3.2;}
    dismount();engineOff();c.kind='parked';c.driver=false;P.car=null;P.H.root.visible=true;P.h=c.h;radioStop();tutEvent('exit');return;}
  let best=null,bd=4.5;for(const c of cars){const d=hyp(c.x-P.x,c.z-P.z);if(d<bd){bd=d;best=c;}}
  if(!best)return;
  if(best.type==='police'&&!best.driver)crime(1,true);
  if(best.m.rider)best.m.rider.root.visible=false;
  if(best.driver){const lx=Math.cos(best.h),lz=-Math.sin(best.h);const n=newNPC(best.kind==='police'?'cop':'ped',best.x+lx*2,best.z+lz*2);
    if(best.kind==='police'){crime(2,true);n.state='fight';}else{if(Math.random()<.3){n.state='fight';n.t=20;n.fighter=true;}else{n.state='flee';n.t=6;}crime(1,false);}n.b=blockAt(n.x,n.z);}
  best.kind='player';best.ai=null;best.driver=false;P.car=best;P.H.root.visible=false;mount(best);engineOn();P.blocking=false;P.pend=null;cam.lastDrag=-1e9;tutEvent('enter');
  if(radio.idx>=0&&radioPlay())showPrompt('Radio: '+radioNames()[radio.idx]+' · R đổi bài',1.8);
}

/* ---------- heist, safehouse, missions ---------- */
let heist=null;
function markerRing(color,r){const g=new T.Group();const ring=new T.Mesh(new T.TorusGeometry(r||1.6,.08,8,40),new T.MeshBasicMaterial({color,toneMapped:false}));ring.rotation.x=Math.PI/2;ring.position.y=.35;const disc=new T.Mesh(new T.CircleGeometry(r||1.6,32),new T.MeshBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.3;
  const col=new T.Mesh(new T.CylinderGeometry(.5,.5,70,12,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.16,depthWrite:false,fog:false,side:T.DoubleSide}));col.position.y=35;g.add(ring,disc,col);scene.add(g);return g;}
const MK={bank:markerRing(0x4ade80),house:markerRing(0xffffff,1.3),target:markerRing(0xffd166,2.2)};MK.target.visible=false;
const GIVERS={deliver:{name:'Giao hàng gấp',col:0xffd166,css:'#ffd166'},race:{name:'Đua đường phố',col:0x4cc9f0,css:'#4cc9f0'},fight:{name:'Ẩu đả đường phố',col:0xff5d5d,css:'#ff5d5d'}};
const giverPos={deliver:null,race:null,fight:null};
function sidewalkSpot(filter){for(let k=0;k<50;k++){const b=pick(blocks);if(b.d==='river'||filter&&!filter(b))continue;const p=perim(b,rnd(0,200));if(resolve(p[0],p[1],.6))continue;return{x:p[0],z:p[1]};}return{x:0,z:0};}
for(const k in GIVERS){GIVERS[k].m=markerRing(GIVERS[k].col,1.4);}
function placeGivers(){giverPos.deliver=sidewalkSpot(b=>b.d==='mid');giverPos.race=sidewalkSpot(b=>b.d==='downtown'||b.d==='beach');const pk=SP.parkMain;giverPos.fight={x:pk.x+6,z:pk.z};for(const k in GIVERS){const p=giverPos[k];GIVERS[k].m.position.set(p.x,.25,p.z);GIVERS[k].m.visible=true;}}
let mis=null;
function setTarget(x,z){MK.target.visible=true;MK.target.position.set(x,.1,z);if(mis){mis.tx=x;mis.tz=z;}}
function nodeAround(a,b){const c=[];for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const d=hyp(road(i)-P.x,road(j)-P.z);if(d>=a&&d<=b)c.push([i,j]);}const n=c.length?pick(c):nearestNode(P.x,P.z);return lanePt(n,[1,0],0);}
function startMission(k){
  if(mis||heist&&heist.stage!=='done')return;
  if(k==='race'&&!P.car){showPrompt('Cần lên xe để đua',1.5);return;}
  mis={k,left:0};for(const g in GIVERS)GIVERS[g].m.visible=false;
  if(k==='deliver'){mis.stage='pickup';const p=nodeAround(60,150);setTarget(p[0],p[1]);mis.left=70;banner('Giao hàng gấp','Lấy gói hàng ở điểm vàng');}
  if(k==='race'){let n=nearestNode(P.x,P.z),d=[0,0];mis.cps=[];for(let q=0;q<6;q++){for(let s=0;s<3;s++){d=pickDir(n,d);n=[n[0]+d[0],n[1]+d[1]];}mis.cps.push(lanePt(n,[0,0],0));}
    mis.cp=0;setTarget(...mis.cps[0]);let L=0,px=P.x,pz=P.z;for(const c of mis.cps){L+=hyp(c[0]-px,c[1]-pz);px=c[0];pz=c[1];}mis.left=Math.round(L/23+14);banner('Đua đường phố','Qua 6 điểm trước khi hết giờ');}
  if(k==='fight'){mis.left=150;mis.wave=0;mis.cx=giverPos.fight.x-6;mis.cz=giverPos.fight.z;nextFighter();banner('Ẩu đả đường phố','Hạ gục 3 đối thủ, không dùng xe');}
}
function nextFighter(){mis.wave++;const a=rnd(0,6.28);const n=newNPC('fighter',mis.cx+Math.cos(a)*8,mis.cz+Math.sin(a)*8,{state:'fight',t:999,mission:true});n.hp=n.maxHp=90+mis.wave*25;mis.f=n;showPrompt(`Đối thủ ${mis.wave}/3`,1.6);}
function endMission(){mis=null;MK.target.visible=false;placeGivers();}
function winMission(r,txt){save.money+=r;writeSave();banner('+'+fmt$(r),txt);endMission();}
function failMission(txt){if(!mis)return;for(const n of npcs.filter(n=>n.mission))removeNPC(n);banner('Nhiệm vụ thất bại',txt);endMission();}
function missionUpdate(dt){
  for(const k in GIVERS)GIVERS[k].m.children[0].rotation.z+=dt;
  MK.target.children[0].scale.setScalar(1+Math.sin(time*5)*.06);
  if(!mis)return;mis.left-=dt;const t=P.car||P;const at=mis.tx!==undefined&&MK.target.visible&&hyp(mis.tx-t.x,mis.tz-t.z)<5.5;
  if(mis.k==='deliver'){if(at&&mis.stage==='pickup'){mis.stage='drop';const p=nodeAround(140,260);setTarget(p[0],p[1]);mis.left=Math.round(hyp(p[0]-t.x,p[1]-t.z)/12+24);banner('Đã lấy hàng','Giao tới điểm vàng trước khi hết giờ');}else if(at&&mis.stage==='drop'){winMission(600,'Giao hàng thành công');return;}}
  if(mis.k==='race'&&at){mis.cp++;if(mis.cp>=mis.cps.length){winMission(900,'Về đích');return;}setTarget(...mis.cps[mis.cp]);}
  if(mis.k==='fight'){if(P.car){failMission('Không được dùng xe');return;}if(hyp(P.x-mis.cx,P.z-mis.cz)>45){failMission('Bạn bỏ chạy khỏi trận');return;}
    if(mis.f&&mis.f.state==='down'){const f=mis.f;setTimeout(()=>removeNPC(f),3000);mis.f=null;if(mis.wave>=3){winMission(700,'Bạn thắng cả 3 trận');return;}setTimeout(()=>{if(mis&&mis.k==='fight')nextFighter();},1800);}}
  if(mis&&mis.left<=0)failMission('Hết giờ');
}
function heistUpdate(dt){
  MK.bank.visible=!heist||heist.stage==='vault';MK.bank.children[0].rotation.z+=dt;
  if(!heist)return;
  if(heist.stage==='vault'){const V=ROOMS.bank.vault,d=hyp(P.x-V.x,P.z-V.z);
    if(d>7||P.inside!=='bank'){heist=null;banner('Bỏ dở vụ cướp','Bạn rời ngân hàng quá sớm');return;}
    heist.prog+=dt/12;if(heist.prog>=1){heist.stage='escape';P.dirty=Math.round(rnd(18000,32000)/100)*100;stars=Math.max(stars,4);evadeT=0;lastSeen={x:SP.bank.door.x,z:SP.bank.door.z};save.bankCD=Date.now()+240000;save.heists++;writeSave();banner('Đã vét két',`${fmt$(P.dirty)} tiền nóng · cắt đuôi cảnh sát rồi mang về nhà`,3.5);}}
}
function stashAtHome(){if(stars>0){showPrompt('Cắt đuôi cảnh sát trước khi vào nhà',1.6);return;}const d=P.dirty;P.dirty=0;if(d){save.money+=d;heist=null;}P.hp=maxHp();writeSave();banner(d?'+'+fmt$(d):'Đã lưu game',d?'Vụ cướp thành công · đã cất tiền và lưu game':'Hồi đầy máu tại nhà');tutEvent('save');}
function startHeist(){if(Date.now()<save.bankCD){showPrompt(`Ngân hàng đang canh gác kỹ, quay lại sau ${Math.ceil((save.bankCD-Date.now())/60000)} phút`,2);return;}if(stars>0){showPrompt('Cắt đuôi cảnh sát trước khi cướp',1.6);return;}if(mis){showPrompt('Xong nhiệm vụ hiện tại trước',1.4);return;}
  heist={stage:'vault',prog:0};stars=2;evadeT=0;lastSeen={x:SP.bank.door.x,z:SP.bank.door.z};banner(L('BÁO ĐỘNG','ALARM'),L('Đứng gần cửa két 12 giây · bảo vệ đang tới','Stay by the vault for 12 seconds · guards incoming'));
  const R=ROOMS.bank;for(const s of[-1,1]){newNPC('guard',R.door.x+s*3,R.door.z-1,{state:'fight',t:999});}}
function sleepHome(){stashAtHome();if(stars===0){const h=tod.hour;if(h>20||h<6){tod.hour=7;banner(L('Chào buổi sáng','Good morning'),L('Bạn đã ngủ tới 7 giờ sáng','You slept until 7 AM'));}}}

/* ---------- shops: food, mart, clothes, guns, cars, dojo, garage, beach apartment ---------- */
const OUTFITS={base:{n:'Đồ mặc định',p:0},white:{n:'Áo thun trắng',p:150,shirt:'#f1faee',pants:'#2b2f3a',sleeve:false},sport:{n:'Đồ thể thao đỏ',p:250,shirt:'#e63946',pants:'#1f1f1f',shoes:'#f4f4f4',sleeve:false},
  shirt:{n:'Sơ mi xanh dài tay',p:300,shirt:'#457b9d',pants:'#3a4a6b',longSleeve:true,sleeve:true},summer:{n:'Váy hè hồng',p:350,shirt:'#ffd6e8',pants:'#ff8fab',skirt:true,sleeve:false},hoodie:{n:'Hoodie đen',p:450,shirt:'#151515',pants:'#262b36',longSleeve:true,sleeve:true},
  leather:{n:'Áo khoác da nâu',p:700,shirt:'#4a2c1c',pants:'#111111',shoes:'#1d1d1d',longSleeve:true,sleeve:true},nexus:{n:'Bộ Nexus chanh tím',p:900,shirt:'#c1f354',pants:'#2a1d4a',shoes:'#ad8dff',sleeve:false}};
function playerLook(){const b=Object.assign({},CHARS[save.char]||CHARS.minh),o=OUTFITS[save.outfit]||{};for(const k of['shirt','pants','shoes','sleeve','longSleeve','skirt'])if(o[k]!==undefined)b[k]=o[k];b.cap=save.cap?'#1d1d1d':null;if(save.outfit==='nexus'&&save.cap)b.cap='#ad8dff';return b;}
function rebuildPlayer(){const old=P.H;const H=makeHuman(playerLook());H.root.position.copy(old.root.position);H.root.rotation.copy(old.root.rotation);H.root.visible=old.root.visible;scene.remove(old.root);old.root.traverse(o=>{if(o.geometry&&o.material===HUMAT)o.geometry.dispose();});P.H=H;if(weaponMesh)attachWeapon();}
const VEH={bike:{n:'Xe máy',p:1500},sedan:{n:'Sedan gia đình',p:6000},suv:{n:'SUV 7 chỗ',p:11000},sports:{n:'Xe thể thao',p:24000},super:{n:'Siêu xe Nexus GT',p:60000}};
const SHOPS={
  food:{n:'Cơm Tấm Cô Ba',items:[{n:'Bánh mì thịt',d:'+25 máu',p:8,fn:()=>heal(25)},{n:'Cơm tấm sườn bì chả',d:'+60 máu',p:18,fn:()=>heal(60)},{n:'Phở bò tái',d:'Hồi đầy máu',p:25,fn:()=>heal(999)},{n:'Trà sữa trân châu',d:'+15 máu, chạy nhanh hơn 60 giây',p:12,fn:()=>{heal(15);P.boostT=60;}}]},
  mart:{n:'Xăng Nexus Mart',items:[{n:'Snack khoai tây',d:'+10 máu',p:4,fn:()=>heal(10)},{n:'Nước tăng lực',d:'Chạy nhanh hơn 60 giây',p:7,fn:()=>{P.boostT=60;}},{n:'Bộ sơ cứu',d:'Hồi đầy máu',p:120,fn:()=>heal(999)},{n:'Sửa xe nhanh',d:'Hồi 50% độ bền cho xe bạn đang lái',p:60,need:'car',fn:()=>{P.car.hp=Math.min(100,P.car.hp+50);}}]},
  clothes:{n:'Nexus Plaza · Thời trang',kind:'clothes'},
  guns:{n:'Súng Tầm Xa',items:[{n:'Súng lục',d:'Bắn từng phát, kèm 36 viên',p:1200,w:'pistol'},{n:'Súng tiểu liên',d:'Bắn liên thanh, kèm 120 viên',p:4500,w:'smg'},{n:'Súng trường',d:'Bắn xa, mạnh, kèm 60 viên',p:9000,w:'rifle'},
    {n:'Đạn súng lục ×36',d:'',p:60,a:'pistol',q:36},{n:'Đạn tiểu liên ×120',d:'',p:150,a:'smg',q:120},{n:'Đạn súng trường ×60',d:'',p:200,a:'rifle',q:60},{n:'Áo giáp',d:'Đỡ 75% sát thương tới khi hết giáp',p:400,fn:()=>{save.armor=100;},ok:()=>save.armor<100}]},
  cars:{n:'Nexus Motors',kind:'cars'},
  gym:{n:'Võ đường Rồng Xanh',items:[{n:'Sức mạnh I',d:'Đòn tay chân mạnh hơn 20%',p:1500,ok:()=>save.up.str<1,fn:()=>{save.up.str=1;}},{n:'Sức mạnh II',d:'Mạnh hơn 40% (cần Sức mạnh I)',p:4000,ok:()=>save.up.str===1,fn:()=>{save.up.str=2;}},
    {n:'Thể lực',d:'Máu tối đa 150',p:3000,ok:()=>save.up.hp<1,fn:()=>{save.up.hp=1;P.hp=maxHp();}},{n:'Chạy bền',d:'Chạy nhanh hơn 15%',p:2000,ok:()=>save.up.run<1,fn:()=>{save.up.run=1;}}]},
  garage:{n:'Garage Sơn Mới',items:[{n:'Sửa xe',d:'Xe như mới',p:150,need:'car',fn:()=>{P.car.hp=100;}},{n:'Sơn màu mới',d:'Đổi màu xe. Nếu cảnh sát không thấy bạn, xoá truy nã',p:300,need:'car',fn:()=>{const col=pick(CARC);if(P.car.type!=='police'&&P.car.type!=='taxi')P.car.m.paint.color.copy(lin(col));if(P.car.owned){const o=save.garage[P.car.owned-1];if(o)o.color=col;}if(stars>0&&!seenT){stars=0;evadeT=0;lastSeen=null;banner(L('Đã thoát truy nã','Wanted level cleared'),L('Xe mới sơn, cảnh sát mất dấu','Fresh paint, the police lost you'));}}},
    {n:'Độ động cơ',d:'Xe đang lái nhanh hơn 15%',p:2500,need:'car',ok:()=>P.car&&!P.car.tuned,fn:()=>{P.car.tuned=true;P.car.spec.max*=1.15;P.car.spec.acc*=1.15;if(P.car.owned){const o=save.garage[P.car.owned-1];if(o)o.tuned=true;}}}]}};
function heal(n){P.hp=Math.min(maxHp(),P.hp+n);}
let shopOpen=null;
function shopItems(id){const S=SHOPS[id];if(S.kind==='clothes'){const L2=[];for(const k in OUTFITS){const o=OUTFITS[k],own=save.outfits.includes(k);if(S.own&&!own)continue;L2.push({n:o.n,d:own?(save.outfit===k?L('Đang mặc','Wearing'):L('Đã có · bấm để mặc','Owned · tap to wear')):'',p:own?0:o.p,label:own?(save.outfit===k?'✓':L('Mặc','Wear')):null,dis:save.outfit===k,fn:()=>{if(!own)save.outfits.push(k);save.outfit=k;rebuildPlayer();}});}
    if(!S.own||save.capOwned)L2.push({n:L('Mũ lưỡi trai','Baseball cap'),d:save.capOwned?(save.cap?L('Đang đội · bấm để bỏ','On · tap to remove'):L('Đã có · bấm để đội','Owned · tap to wear')):'',p:save.capOwned?0:80,label:save.capOwned?(save.cap?L('Bỏ','Remove'):L('Đội','Wear')):null,fn:()=>{save.capOwned=true;save.cap=!save.cap;rebuildPlayer();}});return L2;}
  if(S.kind==='cars'){return Object.keys(VEH).map(k=>({n:VEH[k].n,d:L('Giao xe ngay trước cửa, lưu vào gara nhà bạn','Delivered out front and kept in your home garage'),p:VEH[k].p,fn:()=>buyVehicle(k)}));}
  return S.items.map(it=>{if(it.w){const own=!!save.weapons[it.w];return Object.assign({},it,{dis:own,label:own?L('Đã có','Owned'):null,fn:()=>{save.weapons[it.w]=true;save.ammo[it.w]+=({pistol:36,smg:120,rifle:60})[it.w];selectWeapon(it.w);}});}
    if(it.a)return Object.assign({},it,{dis:!save.weapons[it.a],d:save.weapons[it.a]?L('Đang có ','You have ')+save.ammo[it.a]:L('Cần mua súng trước','Buy the gun first'),fn:()=>{save.ammo[it.a]+=it.q;}});
    const dis=(it.need==='car'&&!P.car)||(it.ok&&!it.ok());return Object.assign({},it,{dis,d:it.need==='car'&&!P.car?L('Cần lái xe tới đây','Drive a car here first'):it.d});});}
function openShop(id){shopOpen=id;keys.clear();renderShop();hud.shop.hidden=false;sfx('door');tutEvent('shop');}
function closeShop(){shopOpen=null;hud.shop.hidden=true;writeSave();}
function renderShop(){const id=shopOpen;if(!id)return;const its=shopItems(id);hud.shop.querySelector('h3').textContent=SHOPS[id].n;hud.shop.querySelector('.nc-cash').textContent=fmt$(save.money);
  const ul=hud.shop.querySelector('.nc-items');ul.innerHTML='';its.forEach((it,i)=>{const b=document.createElement('button');b.type='button';const poor=it.p>save.money;b.disabled=!!it.dis||poor&&!it.label;
    b.innerHTML=`<span class="k">${i+1}</span><span class="t"><b></b><small></small></span><span class="p"></span>`;b.querySelector('b').textContent=it.n;b.querySelector('small').textContent=it.d||'';b.querySelector('.p').textContent=it.label||(it.p?fmt$(it.p):L('Miễn phí','Free'));
    b.addEventListener('click',()=>buyItem(it));ul.appendChild(b);});}
function buyItem(it){if(it.dis)return;if(it.p>save.money){showPrompt(L('Không đủ tiền','Not enough money'),1.2);return;}save.money-=it.p;it.fn();sfx(it.p?'cash':'door');writeSave();renderShop();if(it.p)showPrompt(L('Đã mua: ','Bought: ')+it.n,1.4);}
function buyVehicle(k){const sp=spots.display.length?spots.display[0]:[SP.shops.find(s=>s.id==='cars').x,SP.shops.find(s=>s.id==='cars').z+8,0];const col=k==='super'?'#ad8dff':pick(CARC);save.garage.push({type:k,color:col});
  const c=newCar(k,sp[0]+rnd(-3,3),sp[1]+6,0,'parked',col);c.driver=false;c.owned=save.garage.length;closeShop();banner(VEH[k].n,L('Xe đang chờ trước cửa hàng · gara nhà bạn cũng có xe này','Your new ride is out front · also saved in your home garage'));}
function garageSpawn(){if(!save.garage.length){showPrompt(L('Gara trống · mua xe ở Nexus Motors','Garage is empty · buy cars at Nexus Motors'),1.8);return;}
  save.gIdx=((save.gIdx|0)+1)%save.garage.length;const o=save.garage[save.gIdx];for(const c of cars.slice())if(c.owned&&c!==P.car&&c.kind==='parked'&&hyp(c.x-homeCar.x,c.z-homeCar.z)<14)removeCar(c);
  const c=newCar(o.type,SP.garage.x,SP.garage.z,SP.garage.h,'parked',o.color);c.driver=false;c.owned=save.gIdx+1;if(o.tuned){c.tuned=true;c.spec.max*=1.15;c.spec.acc*=1.15;}showPrompt(L('Đã lấy ','Pulled out ')+VEH[o.type].n+' · '+(save.gIdx+1)+'/'+save.garage.length,1.6);}
const APT_PRICE=50000;
SHOPS.wardrobe={n:'Tủ quần áo',kind:'clothes',own:true};
/* ---------- interiors: house, hospital, bank (built far east of the map, entered through doors) ---------- */
const ROOMS={},IM=[],IE=[];
/* ---------- interior textures: drawn once on canvases ---------- */
const ITS=MOBILE?256:512;
const shade=(hex,l)=>{const c=new T.Color(hex),o={};c.getHSL(o);c.setHSL(o.h,o.s,clamp(o.l+l/100,0,1));return '#'+c.getHexString();};
function grain(g,w,h,n,a){for(let i=0;i<n;i++){g.fillStyle=Math.random()<.5?`rgba(0,0,0,${Math.random()*a})`:`rgba(255,255,255,${Math.random()*a})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}}
function plankTex(base,dark,rows){return makeTex(ITS,ITS,(g,w,h)=>{rows=rows||6;const rh=h/rows;g.fillStyle=base;g.fillRect(0,0,w,h);
  for(let r=0;r<rows;r++){let x=-Math.random()*w*.6;while(x<w){const len=w*(.38+Math.random()*.45);g.fillStyle=shade(base,rnd(-7,6));g.fillRect(x,r*rh,len,rh);
    for(let k=0;k<14;k++){g.strokeStyle=`rgba(40,20,5,${.05+Math.random()*.09})`;g.lineWidth=.6+Math.random();g.beginPath();const y=r*rh+Math.random()*rh;g.moveTo(x,y);g.bezierCurveTo(x+len*.3,y+rnd(-2,2),x+len*.7,y+rnd(-2,2),x+len,y+rnd(-1.5,1.5));g.stroke();}
    if(Math.random()<.35){g.fillStyle='rgba(60,30,10,.25)';g.beginPath();g.ellipse(x+len*Math.random(),r*rh+rh/2,rnd(3,7),rnd(1.5,3),0,0,6.28);g.fill();}
    g.fillStyle=dark;g.fillRect(x,r*rh,1.6,rh);x+=len;}
    g.fillStyle=dark;g.fillRect(0,r*rh,w,1.4);}grain(g,w,h,1200,.05);});}
function tileTex(base,grout,n,v){return makeTex(ITS,ITS,(g,w,h)=>{g.fillStyle=grout;g.fillRect(0,0,w,h);const s=w/n,gp=Math.max(1.5,w/170);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){g.fillStyle=shade(base,rnd(-v,v));g.fillRect(i*s+gp/2,j*s+gp/2,s-gp,s-gp);const gr=g.createLinearGradient(i*s,j*s,i*s+s,j*s+s);gr.addColorStop(0,'rgba(255,255,255,.07)');gr.addColorStop(1,'rgba(0,0,0,.05)');g.fillStyle=gr;g.fillRect(i*s+gp/2,j*s+gp/2,s-gp,s-gp);}
  grain(g,w,h,900,.035);});}
function marbleTex(base,vein,n){return makeTex(ITS,ITS,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);
  for(let k=0;k<7;k++){const gr=g.createRadialGradient(rnd(0,w),rnd(0,h),0,rnd(0,w),rnd(0,h),w*.6);gr.addColorStop(0,'rgba(255,255,255,.08)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}
  for(let k=0;k<(n||30);k++){g.strokeStyle=vein;g.globalAlpha=.06+Math.random()*.3;g.lineWidth=.5+Math.random()*2;g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);
    for(let s=0;s<7;s++){const nx=x+rnd(-w*.2,w*.2),ny=y+rnd(-h*.12,h*.22);g.quadraticCurveTo((x+nx)/2+rnd(-25,25),(y+ny)/2+rnd(-25,25),nx,ny);x=nx;y=ny;}g.stroke();}
  g.globalAlpha=1;g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=2;g.strokeRect(0,0,w,h);grain(g,w,h,700,.03);});}
function plasterTex(base){return makeTex(ITS,ITS,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);for(let k=0;k<40;k++){const gr=g.createRadialGradient(rnd(0,w),rnd(0,h),0,rnd(0,w),rnd(0,h),rnd(20,90));gr.addColorStop(0,Math.random()<.5?'rgba(0,0,0,.025)':'rgba(255,255,255,.04)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}grain(g,w,h,2200,.035);});}
function wallpaperTex(base,ink){return makeTex(ITS,ITS,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const s=w/4;
  for(let i=0;i<4;i++){g.fillStyle='rgba(255,255,255,.07)';g.fillRect(i*s,0,s/2,h);}
  g.fillStyle=ink;g.globalAlpha=.16;for(let i=0;i<4;i++)for(let j=0;j<4;j++){const cx=i*s+s/2+(j%2?s/2:0),cy=j*s+s/2;g.beginPath();g.ellipse(cx%w,cy,s*.08,s*.2,0,0,6.28);g.fill();g.beginPath();g.ellipse(cx%w,cy,s*.2,s*.06,0,0,6.28);g.fill();}
  g.globalAlpha=1;grain(g,w,h,1500,.03);});}
function ceilTileTex(base){return makeTex(ITS,ITS,(g,w,h)=>{g.fillStyle='#cfd2d4';g.fillRect(0,0,w,h);const s=w/2;
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){g.fillStyle=base;g.fillRect(i*s+3,j*s+3,s-6,s-6);g.fillStyle='rgba(0,0,0,.08)';for(let k=0;k<260;k++)g.fillRect(i*s+6+Math.random()*(s-12),j*s+6+Math.random()*(s-12),1.4,1.4);}});}
function carpetTex(base,border){return makeTex(ITS,ITS,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);grain(g,w,h,9000,.08);if(border){g.strokeStyle=border;g.lineWidth=w*.03;g.strokeRect(w*.03,h*.03,w*.94,h*.94);g.lineWidth=w*.008;g.strokeRect(w*.09,h*.09,w*.82,h*.82);}},{});}
function fabricTex(base){return makeTex(ITS/2,ITS/2,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);for(let y=0;y<h;y+=2){g.fillStyle=`rgba(0,0,0,${.04+Math.random()*.04})`;g.fillRect(0,y,w,1);}for(let x=0;x<w;x+=3){g.fillStyle=`rgba(255,255,255,${.02+Math.random()*.03})`;g.fillRect(x,0,1,h);}grain(g,w,h,800,.05);});}
function stoneTex(base){return makeTex(ITS,ITS,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const rh=h/4;for(let r=0;r<4;r++){const off=r%2?w/4:0;for(let c=-1;c<3;c++){const x=c*w/2+off;g.fillStyle=shade(base,rnd(-4,4));g.fillRect(x+2,r*rh+2,w/2-4,rh-4);}}grain(g,w,h,3000,.05);g.strokeStyle='rgba(0,0,0,.12)';for(let r=0;r<=4;r++){g.beginPath();g.moveTo(0,r*rh);g.lineTo(w,r*rh);g.stroke();}});}
function viewTex(night){return makeTex(512,256,(g,w,h)=>{const sk=g.createLinearGradient(0,0,0,h);sk.addColorStop(0,'#7fb2e6');sk.addColorStop(.62,'#d6e8f4');sk.addColorStop(1,'#e9dcc4');g.fillStyle=sk;g.fillRect(0,0,w,h);
  for(let k=0;k<5;k++){g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(rnd(0,w),rnd(15,70),rnd(30,70),rnd(6,12),0,0,6.28);g.fill();}
  let x=0;while(x<w){const bw=rnd(24,60),bh=rnd(50,150);g.fillStyle=shade('#8a96a6',rnd(-10,8));g.fillRect(x,h-bh,bw,bh);g.fillStyle='rgba(255,255,255,.28)';for(let yy=h-bh+8;yy<h-10;yy+=10)for(let xx=x+5;xx<x+bw-6;xx+=8)if(Math.random()<.6)g.fillRect(xx,yy,4,5);x+=bw+rnd(2,10);}
  for(let k=0;k<9;k++){g.fillStyle=shade('#3f6b3a',rnd(-8,8));g.beginPath();g.arc(rnd(0,w),h-rnd(0,10),rnd(14,30),0,6.28);g.fill();}},{repeat:false});}
function paintingTex(seed){return makeTex(256,192,(g,w,h)=>{const P=[['#1d3557','#457b9d','#e63946','#f1faee'],['#264653','#2a9d8f','#e9c46a','#f4a261'],['#3d405b','#81b29a','#f2cc8f','#e07a5f']][seed%3];
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,P[1]);gr.addColorStop(1,P[0]);g.fillStyle=gr;g.fillRect(0,0,w,h);
  if(seed%3===0){g.fillStyle=P[3];g.beginPath();g.arc(w*.7,h*.32,26,0,6.28);g.fill();g.fillStyle=P[0];g.beginPath();g.moveTo(0,h);g.lineTo(w*.35,h*.45);g.lineTo(w*.6,h*.75);g.lineTo(w*.8,h*.5);g.lineTo(w,h);g.fill();}
  else for(let k=0;k<14;k++){g.fillStyle=P[k%4];g.globalAlpha=.75;g.fillRect(rnd(0,w),rnd(0,h),rnd(15,70),rnd(15,70));}g.globalAlpha=1;},{repeat:false});}
function screenTex(kind){return makeTex(256,160,(g,w,h)=>{if(kind==='tv'){const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#14325c');gr.addColorStop(1,'#2a9d8f');g.fillStyle=gr;g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.9)';g.font='700 26px Inter,sans-serif';g.fillText('NEXUS TV',18,42);g.font='15px Inter,sans-serif';g.fillText('Bản tin thành phố 18:00',18,68);g.fillStyle='#e63946';g.fillRect(0,h-28,w,28);g.fillStyle='#fff';g.font='700 14px Inter,sans-serif';g.fillText('TRỰC TIẾP · Giao thông thông thoáng',10,h-10);}
  else if(kind==='ecg'){g.fillStyle='#03120c';g.fillRect(0,0,w,h);g.strokeStyle='#38ff8a';g.lineWidth=2.5;g.beginPath();let x=0;g.moveTo(0,90);while(x<w){g.lineTo(x+20,90);g.lineTo(x+26,70);g.lineTo(x+31,120);g.lineTo(x+36,40);g.lineTo(x+42,95);g.lineTo(x+60,90);x+=60;}g.stroke();g.fillStyle='#38ff8a';g.font='700 26px Inter,sans-serif';g.fillText('72',w-56,34);}
  else if(kind==='atm'){g.fillStyle='#0b3d63';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='700 22px Inter,sans-serif';g.fillText('NEXUS BANK',20,40);g.font='15px Inter,sans-serif';g.fillText('Vui lòng đưa thẻ vào',20,80);g.fillStyle='#ffc93d';g.fillRect(20,100,w-40,6);}
  else{g.fillStyle='#e8eef5';g.fillRect(0,0,w,h);g.fillStyle='#2f6fa6';g.fillRect(0,0,w,22);for(let y=34;y<h-8;y+=14){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(12,y,rnd(80,w-30),6);}}},{repeat:false});}
/* materials by key; map:null means plain colour */
const ITX={
  oak:{map:plankTex('#b07a45','#5e3a18'),r:.48},walnut:{map:plankTex('#5d3b22','#26150a',10),r:.4},
  tileW:{map:tileTex('#e9edf0','#b7c0c6',4,2.5),r:.28},tileK:{map:tileTex('#d9d3c7','#8f877a',6,4),r:.3},
  marble:{map:marbleTex('#efe8dc','#7d6f5e'),r:.1},marbleDk:{map:marbleTex('#2f3237','#bdb5a6',22),r:.12},marbleTop:{map:marbleTex('#f4f1ec','#8b8b8b',18),r:.12},
  plaster:{map:plasterTex('#f2eee6'),r:.95},plasterW:{map:plasterTex('#f4f6f7'),r:.9},mint:{map:plasterTex('#a8d5c2'),r:.7},
  paper:{map:wallpaperTex('#e8dcc4','#8a6a3a'),r:.92},stone:{map:stoneTex('#e2d6bf'),r:.75},
  ceilT:{map:ceilTileTex('#f1f1ef'),r:.95},carpet:{map:carpetTex('#8f1a20','#d4a640'),r:1},rug:{map:carpetTex('#3e5a7a','#d9c7a3'),r:1},rugB:{map:carpetTex('#7a5a3e','#e8d8b8'),r:1},
  sofa:{map:fabricTex('#46596e'),r:.95},blanket:{map:fabricTex('#2f6fa6'),r:.95},teal:{map:fabricTex('#4fa3a5'),r:.95},curtain:{map:fabricTex('#c9b48f'),r:.95},curtainH:{map:fabricTex('#8fc7c1'),r:.95},
  white:{c:'#f4f4f2',r:.55},offwhite:{c:'#e9e6df',r:.6},cab:{c:'#f0ece4',r:.45},dark:{c:'#1b1d21',r:.35},black:{c:'#0b0c0e',r:.18,m:.2},
  steel:{c:'#b9c0c8',r:.32,m:.9},chrome:{c:'#eef1f4',r:.12,m:1},gold:{c:'#d8aa45',r:.22,m:1},brass:{c:'#b9873a',r:.3,m:1},
  red:{c:'#b3202a',r:.6},blue:{c:'#2a5ca8',r:.5},green:{c:'#2f7a46',r:.8},leaf:{c:'#3d7a3a',r:.85},pot:{c:'#a8653e',r:.8},paperW:{c:'#fbfbf8',r:.9},
};
const IMAT={};
function imat(k){if(IMAT[k])return IMAT[k];const d=ITX[k];const m=new T.MeshStandardMaterial({map:d.map||null,color:d.map?0xffffff:lin(d.c),roughness:d.r,metalness:d.m||0});if(d.map)d.map.anisotropy=8;return IMAT[k]=m;}
const IB={},ICY={};
/* textured box; ts = metres per texture repeat; bottom face only when asked */
function itb(k,x0,x1,y0,y1,z0,z1,o){o=o||{};const ts=o.ts||1.2,gb=IB[k]||(IB[k]=new GB());gb.box(x0,x1,y0,y1,z0,z1,{uw:ts,uh:ts,ts,top:o.noTop?null:undefined});
  if(o.bot)gb.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],[[x0/ts,z0/ts],[x1/ts,z0/ts],[x1/ts,z1/ts],[x0/ts,z1/ts]]);
  if(o.col)addCol({t:'b',x0,x1,z0,z1,h:y1});}
function ceilQ(k,x0,x1,y,z0,z1,ts){ts=ts||1.2;(IB[k]||(IB[k]=new GB())).quad([x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],[0,-1,0],[[x0/ts,z0/ts],[x1/ts,z0/ts],[x1/ts,z1/ts],[x0/ts,z1/ts]]);}
function cyl(k,x,y0,y1,z,r0,r1,seg,ax){const g=new T.CylinderGeometry(r1==null?r0:r1,r0,y1-y0,seg||18);if(ax==='x')g.rotateZ(Math.PI/2);if(ax==='z')g.rotateX(Math.PI/2);g.translate(x,ax?y0:(y0+y1)/2,z);(ICY[k]||(ICY[k]=[])).push(g);}
function sph(k,x,y,z,r,sy){const g=new T.SphereGeometry(r,14,10);if(sy)g.scale(1,sy,1);g.translate(x,y,z);(ICY[k]||(ICY[k]=[])).push(g);}
function ibox(x0,x1,y0,y1,z0,z1,color,col){IM.push({geo:_bx.g||(_bx.g=new T.BoxGeometry(1,1,1)),pos:[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],scale:[x1-x0,y1-y0,z1-z0],color});if(col)addCol({t:'b',x0,x1,z0,z1,h:y1});}
const IGLOW=[];/* emissive planes: [texture or colour, x,y,z, w,h, ry, strength] */
function glow(src,x,y,z,w,h,ry,k){IGLOW.push([src,x,y,z,w,h,ry||0,k==null?1:k]);}
const VIEW=viewTex();
/* a window on a wall: frame, sill, outdoor view and curtains. side: 'n' (z0 wall), 'w' (x0), 'e' (x1) */
function iwin(R,side,a,y0,w,h,curt){const f='white',t=.08;
  if(side==='n'){const z=R.z0;glow(VIEW,a,y0+h/2,z+.02,w,h,0,.95);itb(f,a-w/2-t,a+w/2+t,y0-t,y0,z,z+.14);itb(f,a-w/2-t,a+w/2+t,y0+h,y0+h+t,z,z+.06);itb(f,a-w/2-t,a-w/2,y0,y0+h,z,z+.06);itb(f,a+w/2,a+w/2+t,y0,y0+h,z,z+.06);itb(f,a-.025,a+.025,y0,y0+h,z,z+.05);
    if(curt){itb(curt,a-w/2-.55,a-w/2-.05,.1,y0+h+.25,z+.08,z+.2);itb(curt,a+w/2+.05,a+w/2+.55,.1,y0+h+.25,z+.08,z+.2);cyl('brass',a,y0+h+.3,y0+h+.3+w+1.4,z+.16,.02,.02,8,'x');}}
  else{const x=side==='w'?R.x0:R.x1,s=side==='w'?1:-1,ry=side==='w'?Math.PI/2:-Math.PI/2;glow(VIEW,x+s*.02,y0+h/2,a,w,h,ry,.95);
    itb(f,Math.min(x,x+s*.14),Math.max(x,x+s*.14),y0-t,y0,a-w/2-t,a+w/2+t);itb(f,Math.min(x,x+s*.06),Math.max(x,x+s*.06),y0+h,y0+h+t,a-w/2-t,a+w/2+t);
    itb(f,Math.min(x,x+s*.06),Math.max(x,x+s*.06),y0,y0+h,a-w/2-t,a-w/2);itb(f,Math.min(x,x+s*.06),Math.max(x,x+s*.06),y0,y0+h,a+w/2,a+w/2+t);
    if(curt){itb(curt,Math.min(x+s*.08,x+s*.2),Math.max(x+s*.08,x+s*.2),.1,y0+h+.25,a-w/2-.55,a-w/2-.05);itb(curt,Math.min(x+s*.08,x+s*.2),Math.max(x+s*.08,x+s*.2),.1,y0+h+.25,a+w/2+.05,a+w/2+.55);}}}
function pframe(tex,x,y,z,w,h,ry){glow(tex,x,y,z,w,h,ry,.85);const s=Math.sin(ry),c=Math.cos(ry),d=.05;
  /* simple dark frame drawn as four thin boxes facing the room */
  if(Math.abs(s)<.5){const za=z-.03,zb=z+.04;itb('walnut',x-w/2-.06,x+w/2+.06,y-h/2-.06,y-h/2,za,zb,{bot:1});itb('walnut',x-w/2-.06,x+w/2+.06,y+h/2,y+h/2+.06,za,zb);itb('walnut',x-w/2-.06,x-w/2,y-h/2,y+h/2,za,zb);itb('walnut',x+w/2,x+w/2+.06,y-h/2,y+h/2,za,zb);}
  else{const a=Math.min(x,x+d*s),b=Math.max(x,x+d*s);itb('walnut',a,b,y-h/2-.06,y-h/2,z-w/2-.06,z+w/2+.06);itb('walnut',a,b,y+h/2,y+h/2+.06,z-w/2-.06,z+w/2+.06);itb('walnut',a,b,y-h/2,y+h/2,z-w/2-.06,z-w/2);itb('walnut',a,b,y-h/2,y+h/2,z+w/2,z+w/2+.06);}}
function plant(x,z,s){s=s||1;cyl('pot',x,0,.45*s,z,.24*s,.3*s,16);cyl('dark',x,.42*s,.45*s,z,.27*s,.27*s,16);for(let k=0;k<5;k++)sph('leaf',x+rnd(-.18,.18)*s,(.75+k*.12)*s,z+rnd(-.18,.18)*s,(.26-k*.02)*s,1.2);addCol({t:'c',x,z,r:.3*s});}
/* room shell: floor, ceiling, four walls with a doorway on the z1 (front) side, skirting board and optional lower wainscot */
function room(id,cx,cz,w,d,h,o){const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2,t=.3,dw=1.4,wa=o.wall,fl=o.floor;
  itb(fl,x0,x1,-.2,0,z0,z1,{ts:o.fts||1.6});ceilQ(o.ceil||'plaster',x0,x1,h,z0,z1,o.cts||1.2);
  itb(wa,x0-t,x0,0,h,z0,z1,{col:1,ts:o.wts});itb(wa,x1,x1+t,0,h,z0,z1,{col:1,ts:o.wts});itb(wa,x0,x1,0,h,z0-t,z0,{col:1,ts:o.wts});
  itb(wa,x0,cx-dw,0,h,z1,z1+t,{col:1,ts:o.wts});itb(wa,cx+dw,x1,0,h,z1,z1+t,{col:1,ts:o.wts});itb(wa,cx-dw,cx+dw,2.8,h,z1,z1+t,{ts:o.wts,bot:1});
  const sk=o.skirt||'walnut',sh=.12,e=.025;itb(sk,x0,x0+e,0,sh,z0,z1);itb(sk,x1-e,x1,0,sh,z0,z1);itb(sk,x0,x1,0,sh,z0,z0+e);itb(sk,x0,cx-dw,0,sh,z1-e,z1);itb(sk,cx+dw,x1,0,sh,z1-e,z1);
  if(o.wain){const wh=o.wainH||1.1,wk=o.wain;itb(wk,x0,x0+e*1.4,sh,wh,z0,z1);itb(wk,x1-e*1.4,x1,sh,wh,z0,z1);itb(wk,x0,x1,sh,wh,z0,z0+e*1.4);itb(wk,x0,cx-dw,sh,wh,z1-e*1.4,z1);itb(wk,cx+dw,x1,sh,wh,z1-e*1.4,z1);
    const rk=o.rail||sk;itb(rk,x0,x0+.06,wh,wh+.06,z0,z1);itb(rk,x1-.06,x1,wh,wh+.06,z0,z1);itb(rk,x0,x1,wh,wh+.06,z0,z0+.06);itb(rk,x0,cx-dw,wh,wh+.06,z1-.06,z1);itb(rk,cx+dw,x1,wh,wh+.06,z1-.06,z1);}
  if(o.crown){itb(o.crown,x0,x1,h-.1,h,z0,z0+.08,{bot:1});itb(o.crown,x0,x0+.08,h-.1,h,z0,z1,{bot:1});itb(o.crown,x1-.08,x1,h-.1,h,z0,z1,{bot:1});itb(o.crown,x0,x1,h-.1,h,z1-.08,z1,{bot:1});}
  /* door frame and mat */
  itb('walnut',cx-dw-.1,cx-dw,0,2.8,z1-.04,z1+t+.02);itb('walnut',cx+dw,cx+dw+.1,0,2.8,z1-.04,z1+t+.02);itb('walnut',cx-dw-.1,cx+dw+.1,2.8,2.9,z1-.04,z1+t+.02,{bot:1});
  ibox(cx-.9,cx+.9,0,.015,z1-.9,z1-.1,'#3b332b');
  return ROOMS[id]={x0,x1,z0,z1,h,door:{x:cx,z:z1-1.3},lights:[]};}
/* ======== HOUSE: bedroom corner, living room, kitchen ======== */
{const H=room('house',3000,0,14,12,3.2,{wall:'paper',floor:'oak',fts:1.8,wts:1.4,ceil:'plaster',crown:'white'}),x0=H.x0,x1=H.x1,z0=H.z0,z1=H.z1;
  // bedroom: double bed against the back wall, nightstands, lamp, picture, rug, wardrobe on the left wall
  itb('rugB',x0+.4,x0+3.9,0,.012,z0+1.4,z0+4.6,{ts:3.5});
  itb('walnut',x0+.5,x0+2.6,0,1.15,z0+.05,z0+.16,{col:1});itb('walnut',x0+.5,x0+2.6,0,.32,z0+.16,z0+2.5,{col:1});
  itb('white',x0+.55,x0+2.55,.32,.56,z0+.18,z0+2.45);itb('blanket',x0+.52,x0+2.58,.5,.62,z0+.85,z0+2.48,{ts:.8});itb('blanket',x0+.52,x0+2.58,.2,.6,z0+2.42,z0+2.5,{ts:.8});
  itb('paperW',x0+.65,x0+1.5,.56,.72,z0+.24,z0+.7);itb('paperW',x0+1.6,x0+2.45,.56,.72,z0+.24,z0+.7);
  for(const nx of[x0+2.7]){itb('walnut',nx,nx+.55,0,.55,z0+.06,z0+.5,{col:1});itb('dark',nx+.03,nx+.52,.3,.32,z0+.47,z0+.5);cyl('brass',nx+.28,.55,.95,z0+.26,.05,.025,10);cyl('offwhite',nx+.28,.92,1.15,z0+.26,.18,.12,16);glow('#ffd59a',nx+.28,1.03,z0+.26,.001,.001,0,0);}
  pframe(paintingTex(0),x0+1.55,1.85,z0+.03,1.3,.85,0);
  H.bed={x:x0+3.2,z:z0+1.8};
  itb('walnut',x0+.02,x0+.66,0,2.3,z0+3.1,z0+4.9,{col:1});itb('dark',x0+.66,x0+.68,.1,2.2,z0+3.99,z0+4.01);cyl('brass',x0+.7,1.1,1.3,z0+3.9,.015,.015,8);cyl('brass',x0+.7,1.1,1.3,z0+4.1,.015,.015,8);
  H.wardrobe={x:x0+1.3,z:z0+4};
  iwin(H,'w',z0+6.6,.95,1.5,1.35,'curtain');
  // bookshelf divider between bedroom and living room
  itb('walnut',x0+4.4,x0+4.75,0,2,z0+.05,z0+2.4,{col:1});
  for(let r=0;r<4;r++){itb('walnut',x0+4.4,x0+4.75,.05+r*.5,.08+r*.5,z0+.05,z0+2.4);let z=z0+.12;while(z<z0+2.3){const bw=rnd(.04,.09),bh=rnd(.24,.38);ibox(x0+4.45,x0+4.7,.08+r*.5,.08+r*.5+bh,z,z+bw,pick(['#8b2d2d','#2d4f8b','#3c6e47','#c9a227','#6b4a8b','#e6e0d0','#2b2b2b']));z+=bw+.01;}}
  // living room: TV wall, sofa, coffee table, floor lamp, plant
  itb('rug',x0+5.2,x0+9.6,0,.012,z0+2.6,z0+6.2,{ts:4.4});
  itb('walnut',x0+5.4,x0+8.8,0,.5,z0+.08,z0+.55,{col:1});itb('dark',x0+5.45,x0+8.75,.12,.4,z0+.54,z0+.56);
  itb('black',x0+5.6,x0+8.6,.9,2.6,z0+.07,z0+.13);glow(screenTex('tv'),x0+7.1,1.75,z0+.14,2.85,1.6,0,.9);
  itb('sofa',x0+5.2,x0+9.2,0,.45,z0+6.1,z0+7.1,{col:1,ts:.9});itb('sofa',x0+5.2,x0+9.2,.45,1.05,z0+6.85,z0+7.15,{ts:.9});itb('sofa',x0+5.05,x0+5.35,0,.75,z0+6.1,z0+7.15,{ts:.9});itb('sofa',x0+9.05,x0+9.35,0,.75,z0+6.1,z0+7.15,{ts:.9});
  for(let k=0;k<3;k++)itb('sofa',x0+5.4+k*1.25,x0+6.55+k*1.25,.45,.6,z0+6.15,z0+6.85,{ts:.9});
  itb('walnut',x0+6.1,x0+8.3,.38,.44,z0+3.6,z0+4.7,{col:1,bot:1});for(const[a,b]of[[x0+6.2,z0+3.7],[x0+8.15,z0+3.7],[x0+6.2,z0+4.55],[x0+8.15,z0+4.55]])itb('walnut',a,a+.06,0,.38,b,b+.06);
  cyl('dark',x0+9.8,0,.03,z0+7.4,.18,.18,16);cyl('brass',x0+9.8,.03,1.55,z0+7.4,.018,.018,8);cyl('offwhite',x0+9.8,1.5,1.82,z0+7.4,.22,.15,18);
  plant(x0+9.9,z0+.6,1.1);
  iwin(H,'n',x0+10.1,1.05,1.1,1.3,'curtain');
  // kitchen: L counter, sink, stove, hood, upper cabinets, fridge, dining table
  const kx=x1-.68;
  itb('cab',kx,x1,0,.86,z0+.05,z0+4.6,{col:1});itb('marbleTop',kx-.04,x1,.86,.9,z0+.05,z0+4.6,{ts:1});
  itb('cab',x1-3.3,x1,0,.86,z0+.05,z0+.7,{col:1});itb('marbleTop',x1-3.3,x1,.86,.9,z0+.05,z0+.74,{ts:1});
  for(let z=z0+.8;z<z0+4.5;z+=.6)itb('dark',kx-.005,kx,.1,.8,z,z+.005);for(let x=x1-3.2;x<x1-.7;x+=.6)itb('dark',x,x+.005,.1,.8,z0+.7,z0+.705);
  itb('steel',kx+.08,x1-.08,.82,.9,z0+2.2,z0+2.9);cyl('chrome',x1-.12,.9,1.25,z0+2.55,.02,.02,8);
  itb('black',x1-2.9,x1-1.9,.9,.92,z0+.12,z0+.66);for(const[a,b]of[[x1-2.65,z0+.27],[x1-2.15,z0+.27],[x1-2.65,z0+.52],[x1-2.15,z0+.52]])cyl('dark',a,.92,.93,b,.1,.1,14);
  itb('steel',x1-3,x1-1.8,1.65,1.95,z0+.05,z0+.55,{bot:1});
  itb('cab',kx+.25,x1,1.5,2.3,z0+.05,z0+4.6,{bot:1});itb('cab',x1-3.3,x1-.68,1.5,2.3,z0+.05,z0+.38,{bot:1});
  itb('tileK',kx+.001,x1,.9,1.5,z0+.05,z0+4.6,{ts:.6});itb('tileK',x1-3.3,x1,.9,1.5,z0+.05,z0+.06,{ts:.6});
  itb('steel',x1-.85,x1-.05,0,1.95,z0+5.1,z0+5.95,{col:1});itb('dark',x1-.86,x1-.85,1.2,1.21,z0+5.1,z0+5.95);cyl('chrome',x1-.9,.5,1.1,z0+5.2,.015,.015,8);cyl('chrome',x1-.9,1.35,1.8,z0+5.2,.015,.015,8);
  H.fridge={x:x1-1.7,z:z0+5.5};
  itb('oak',x1-3.6,x1-1.8,.74,.78,z0+7.4,z0+8.6,{col:1,bot:1,ts:1});for(const[a,b]of[[x1-3.5,z0+7.5],[x1-1.96,z0+7.5],[x1-3.5,z0+8.44],[x1-1.96,z0+8.44]])itb('walnut',a,a+.06,0,.74,b,b+.06);
  for(const[a,b,s]of[[x1-3.2,z0+7.05,-1],[x1-2.3,z0+7.05,-1],[x1-3.2,z0+8.95,1],[x1-2.3,z0+8.95,1]]){itb('walnut',a-.22,a+.22,.44,.48,b-.22,b+.22,{bot:1});itb('walnut',a-.22,a+.22,.48,.95,b+s*.2,b+s*.24);}
  cyl('dark',x1-2.7,2.4,3.2,z0+8,.006,.006,6);cyl('brass',x1-2.7,2.25,2.42,z0+8,.26,.08,18);
  glow('#fff1d6',x1-2.7,2.24,z0+8,.001,.001,0,0);
  H.lights=[[x0+2.2,2.5,z0+2.6,.85,'#ffcf96',9],[x0+7.2,2.9,z0+4.2,1.15,'#ffe6c4',12],[x1-2.4,2.6,z0+4.8,1,'#fff0d8',10]];
  for(const p of[[x0+7.2,z0+4.2],[x1-2.2,z0+2.6]])IE.push([p[0],H.h-.04,p[1]]);}
/* ======== HOSPITAL: reception, waiting area, four-bed ward ======== */
{const R=room('hospital',3100,0,24,16,3.6,{wall:'plasterW',floor:'tileW',fts:1.2,wts:1.6,ceil:'ceilT',cts:1.2,wain:'mint',wainH:1.15,rail:'steel',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3100;
  // reception desk with counter top, monitors and sign
  itb('white',cx-4,cx+4,0,1.1,z0+5,z0+6,{col:1});itb('oak',cx-4.1,cx+4.1,1.1,1.16,z0+4.95,z0+6.25,{bot:1});itb('blue',cx-4.01,cx+4.01,.15,.35,z0+5.99,z0+6.01);
  itb('white',cx-3.6,cx+3.6,.72,.76,z0+4.3,z0+5,{bot:1});
  for(const x of[cx-2,cx+1.5]){itb('black',x-.35,x+.35,.86,1.3,z0+4.55,z0+4.6);glow(screenTex('doc'),x,1.08,z0+4.61,.64,.4,0,.9);itb('dark',x-.04,x+.04,.76,.86,z0+4.5,z0+4.6);}
  R.desk={x:cx,z:z0+7.2};
  sign('BỆNH VIỆN NEXUS',cx,2.75,z0+.04,0,6,.75,{fg:'#1f6f8b',size:72,w:1024,h:128});
  glow('#e63946',cx-3.8,2.75,z0+.05,.18,.55,0,1.2);glow('#e63946',cx-3.8,2.75,z0+.05,.55,.18,0,1.2);
  sign('TIẾP NHẬN',cx,1.45,z0+6.27,0,1.8,.36,{fg:'#ffffff',bg:'#2a5ca8',size:56,w:512,h:96});
  // four-bed ward against the back wall, curtains, IV poles, monitors
  for(let k=0;k<4;k++){const x=x0+2.6+k*2.6;
    itb('steel',x-.5,x+.5,.38,.5,z0+.3,z0+2.3,{col:1});for(const[a,b]of[[x-.45,z0+.35],[x+.4,z0+.35],[x-.45,z0+2.2],[x+.4,z0+2.2]])itb('steel',a,a+.05,0,.38,b,b+.05);
    itb('white',x-.48,x+.48,.5,.68,z0+.32,z0+2.28);itb('teal',x-.5,x+.5,.62,.72,z0+1.05,z0+2.3,{ts:.8});itb('paperW',x-.35,x+.35,.68,.8,z0+.4,z0+.8);
    itb('steel',x-.5,x+.5,.5,1.1,z0+.28,z0+.34);itb('chrome',x-.52,x-.49,.72,.98,z0+.9,z0+2);itb('chrome',x+.49,x+.52,.72,.98,z0+.9,z0+2);
    cyl('chrome',x+.75,0,1.9,z0+.6,.014,.014,8);sph('white',x+.75,1.82,z0+.6,.08,1.6);cyl('dark',x+.75,0,.03,z0+.6,.16,.16,12);
    itb('white',x-.95,x-.6,0,.75,z0+.2,z0+.6,{col:1});itb('dark',x-.92,x-.63,1.35,1.62,z0+.06,z0+.1);glow(screenTex('ecg'),x-.775,1.485,z0+.105,.27,.22,0,1);
    if(k<3){itb('curtainH',x+1.22,x+1.28,.25,2.7,z0+.1,z0+2.6);cyl('chrome',x+1.25,2.75,2.75+2.5,z0+1.35,.012,.012,8,'z');}}
  iwin(R,'w',z0+5,1.2,1.8,1.4,null);iwin(R,'w',z0+10.5,1.2,1.8,1.4,null);
  // waiting area chairs, table with magazines, plants, vending machine, water cooler
  for(let row=0;row<2;row++)for(let k=0;k<5;k++){const x=x1-8+k*1.15,z=z1-4.2+row*1.7;itb('steel',x-.5,x+.5,.4,.45,z-.28,z+.28,{col:1});itb('blue',x-.46,x+.46,.45,.52,z-.26,z+.26);itb('blue',x-.46,x+.46,.52,.95,z+.2,z+.28);itb('steel',x-.45,x-.41,0,.4,z-.2,z+.2);itb('steel',x+.41,x+.45,0,.4,z-.2,z+.2);}
  itb('oak',x1-2.2,x1-.4,.42,.46,z1-3.2,z1-2.4,{col:1,bot:1});itb('dark',x1-2.1,x1-.5,0,.42,z1-3.1,z1-2.5);ibox(x1-1.9,x1-1.4,.46,.48,z1-3,z1-2.7,'#d62828');ibox(x1-1.2,x1-.7,.46,.48,z1-2.95,z1-2.6,'#2a9d8f');
  plant(x1-.6,z1-.9,1.2);plant(x0+.6,z1-.9,1.2);
  itb('dark',x0+.1,x0+1.1,0,1.9,z1-3.5,z1-2.7,{col:1});glow('#bfe6ff',x0+1.11,1.15,z1-3.1,.7,1.2,Math.PI/2,.7);itb('chrome',x0+1.1,x0+1.12,.2,.35,z1-3.4,z1-2.8);
  itb('white',x0+.15,x0+.55,0,1.05,z1-5,z1-4.6,{col:1});cyl('blue',x0+.35,1.05,1.45,z1-4.8,.16,.16,14);
  pframe(paintingTex(2),x1-.03,1.9,z0+8.5,1.2,.8,-Math.PI/2);
  sign('PHÒNG CHỜ',x1-4.5,2.6,z1-.02,Math.PI,2.2,.42,{fg:'#ffffff',bg:'#2f7a46',size:56,w:512,h:96});
  sign('KHU ĐIỀU TRỊ',x0+5.3,3.05,z0+2.9,0,2.6,.4,{fg:'#ffffff',bg:'#1f6f8b',size:52,w:512,h:96});
  for(let x=x0+2;x<x1-1;x+=4)for(let z=z0+2;z<z1-1;z+=4)IE.push([x,R.h-.04,z]);
  R.lights=[[x0+6,3.3,z0+3,1.1,'#eef6ff',13],[cx+2,3.3,z0+5.5,1.1,'#f2f8ff',14],[x1-5,3.3,z1-4,1,'#f2f8ff',13]];}
/* ======== BANK: marble hall, teller counters, vault ======== */
{const B=room('bank',3200,0,30,22,6,{wall:'stone',floor:'marble',fts:2.2,wts:2.2,ceil:'plaster',cts:2,wain:'walnut',wainH:1.3,rail:'brass',crown:'stone'}),x0=B.x0,x1=B.x1,z0=B.z0,z1=B.z1,cx=3200;
  // dark marble border inlay and red carpet runner
  itb('marbleDk',x0,x1,0,.006,z0+9.6,z0+10,{ts:2});itb('marbleDk',x0,x1,0,.006,z1-1.6,z1-1.2,{ts:2});
  itb('carpet',cx-2,cx+2,0,.014,z0+10,z1-1.2,{ts:4});
  // teller counters: walnut body, marble top, glass screen with chrome frame, brass name plates
  for(let k=0;k<4;k++){const x=x0+4+k*7.3;itb('walnut',x-2.6,x+2.6,0,1.15,z0+8,z0+8.8,{col:1,ts:1.4});itb('marbleTop',x-2.65,x+2.65,1.15,1.2,z0+7.95,z0+8.9,{bot:1});
    itb('brass',x-2.6,x+2.6,.12,.16,z0+8.8,z0+8.83);
    itb('chrome',x-2.62,x-2.56,1.2,2.45,z0+8.38,z0+8.44);itb('chrome',x+2.56,x+2.62,1.2,2.45,z0+8.38,z0+8.44);itb('chrome',x-2.62,x+2.62,2.42,2.48,z0+8.38,z0+8.44,{bot:1});
    itb('brass',x-.35,x+.35,1.2,1.32,z0+8.75,z0+8.8);
    itb('oak',x-1.2,x+1.2,.74,.78,z0+6.2,z0+7.2,{col:1,bot:1});itb('black',x-.32,x+.32,.86,1.28,z0+6.5,z0+6.55);glow(screenTex('doc'),x,1.07,z0+6.56,.58,.38,0,.85);}
  // marble columns with base and capital
  for(const x of[x0+6,x1-6])for(const z of[z0+12,z0+17]){cyl('marble',x,.25,5.6,z,.5,.5,24);cyl('marbleDk',x,0,.25,z,.68,.68,24);cyl('marbleDk',x,5.6,6,z,.62,.5,24);addCol({t:'c',x,z,r:.62});}
  // vault: steel wall, big round door, spokes and bolts
  itb('steel',cx-4,cx+4,0,6,z0,z0+1.2,{col:1,ts:2});cyl('chrome',cx,2.3,2.3+.55,z0+1.2,2.15,2.15,40,'z');cyl('steel',cx,2.3,2.3+.6,z0+1.2,1.6,1.6,40,'z');
  cyl('dark',cx,2.3,2.3+.72,z0+1.2,.42,.42,20,'z');for(let k=0;k<4;k++){const a=k*Math.PI/4;const g=new T.BoxGeometry(2.1,.12,.12);g.rotateZ(a);g.translate(cx,2.3,z0+1.6);(ICY.chrome=ICY.chrome||[]).push(g);}
  for(let k=0;k<12;k++){const a=k/12*6.283;cyl('dark',cx+Math.cos(a)*1.9,2.3+Math.sin(a)*1.9,2.3+Math.sin(a)*1.9+.12,z0+1.5,.07,.07,8,'z');}
  B.vault={x:cx,z:z0+4};
  // sign, clock, chandeliers, rope stands, benches, ATMs, plants, cameras
  sign('NGÂN HÀNG NEXUS',cx,4.7,z0+1.25,0,7.5,.9,{fg:'#e9c46a',size:78,w:1024,h:128,glow:'rgba(233,196,106,.35)'});
  sign('NEXUS BANK',cx,4.7,z1-.02,Math.PI,5,.7,{fg:'#e9c46a',size:78,w:1024,h:128});
  cyl('brass',x1-.08,3.6,3.6+.08,z0+12,.42,.42,28,'x');glow(makeTex(128,128,(g)=>{g.fillStyle='#f8f4ea';g.beginPath();g.arc(64,64,62,0,6.28);g.fill();g.strokeStyle='#222';g.lineWidth=6;g.beginPath();g.moveTo(64,64);g.lineTo(64,22);g.moveTo(64,64);g.lineTo(96,70);g.stroke();for(let k=0;k<12;k++){const a=k/12*6.28;g.fillStyle='#222';g.fillRect(64+Math.cos(a)*50-2,64+Math.sin(a)*50-2,4,4);}},{repeat:false}),x1-.13,3.6,z0+12,.7,.7,-Math.PI/2,.8);
  for(const z of[z0+12.5,z0+18]){cyl('gold',cx,5.2,6,z,.015,.015,6);cyl('gold',cx,4.85,5.25,z,.55,.25,18);for(let k=0;k<8;k++){const a=k/8*6.283;sph('chrome',cx+Math.cos(a)*.62,4.8,z+Math.sin(a)*.62,.07);}glow('#ffe3b0',cx,4.86,z,.001,.001,0,0);}
  for(const s of[-1,1])for(let z=z0+11;z<z1-2;z+=2.4){const x=cx+s*2.4;cyl('gold',x,0,.95,z,.035,.035,10);cyl('gold',x,0,.04,z,.18,.18,16);sph('gold',x,1,z,.07);if(z+2.4<z1-2){const g=new T.CylinderGeometry(.03,.03,2.4,8);g.rotateX(Math.PI/2);g.translate(x,.86,z+1.2);(ICY.red=ICY.red||[]).push(g);}}
  for(const x of[x0+4,x1-4]){itb('walnut',x-1.6,x+1.6,.42,.5,z1-5.2,z1-4.6,{col:1,bot:1});itb('walnut',x-1.6,x+1.6,.5,1,z1-4.65,z1-4.55);itb('dark',x-1.5,x-1.4,0,.42,z1-5.1,z1-4.7);itb('dark',x+1.4,x+1.5,0,.42,z1-5.1,z1-4.7);}
  for(const x of[x0+1.2,x1-1.2]){itb('steel',x-.5,x+.5,0,1.9,z1-3.2,z1-2.6,{col:1});glow(screenTex('atm'),x,1.32,z1-2.59,.6,.38,0,.95);itb('dark',x-.3,x+.3,1,1.05,z1-2.6,z1-2.45);}
  plant(x0+1,z0+10.6,1.4);plant(x1-1,z0+10.6,1.4);plant(cx-3.2,z1-.9,1.2);plant(cx+3.2,z1-.9,1.2);
  for(const x of[x0+.5,x1-.5]){itb('dark',x-.15,x+.15,5.2,5.45,z0+9,z0+9.35,{bot:1});glow('#ff2a2a',x,5.3,z0+9.36,.03,.03,0,2);}
  pframe(paintingTex(0),x0+.03,3,z0+15,2.2,1.4,Math.PI/2);pframe(paintingTex(1),x1-.03,3,z0+17,2.2,1.4,-Math.PI/2);
  B.lights=[[cx,4.6,z0+12.5,1.25,'#ffd9a6',18],[cx,4.6,z0+18,1.1,'#ffdcaa',16],[cx,4.4,z0+4.5,.9,'#fff0dc',14]];}
function z1_(R){return R.z1;}
/* build the meshes: one per textured material, cylinders per material, coloured props, glowing planes */
{for(const k in IB){const m=new T.Mesh(IB[k].geo(),imat(k));m.receiveShadow=Q.shadows;scene.add(m);}
  for(const k in ICY){const m=new T.Mesh(mergeGeos(ICY[k]),imat(k));m.receiveShadow=Q.shadows;scene.add(m);}
  if(IM.length){const m=new T.Mesh(buildVC(IM),new T.MeshStandardMaterial({vertexColors:true,roughness:.6}));scene.add(m);}
  for(const[src,x,y,z,w,h,ry,k]of IGLOW){if(!k)continue;const isTex=typeof src!=='string';const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial(isTex?{map:src,toneMapped:false,color:new T.Color(k,k,k)}:{color:lin(src).multiplyScalar(k),toneMapped:false}));m.position.set(x,y,z);m.rotation.y=ry;scene.add(m);}
  const pg=new T.BoxGeometry(1.2,.05,1.2);inst(pg,emat('#fff6e0',1.4),IE,(p,d)=>d.position.set(p[0],p[1],p[2]),false);}
/* indoor lights: a fixed number of point lights moved into the room the player is in */
const ILIGHTS=[];for(let k=0;k<(MOBILE?1:3);k++){const l=new T.PointLight(0xffffff,0,14,2);scene.add(l);ILIGHTS.push(l);}
function interiorLights(){const R=P.inside&&ROOMS[P.inside];
  if(R){sun.intensity*=.12;hemi.intensity=Math.min(hemi.intensity,.32);}
  rain.visible=!R;
  ILIGHTS.forEach((l,i)=>{const s=R&&R.lights[i];if(s){l.position.set(s[0],s[1],s[2]);l.intensity=s[3]*(MOBILE?1.6:1);l.color.set(s[4]).convertSRGBToLinear();l.distance=s[5]||14;}else l.intensity=0;});}
function fade(fn){const f=hud.fade;f.classList.add('on');setTimeout(()=>{fn();setTimeout(()=>f.classList.remove('on'),120);},260);}
function enterInterior(id){if(P.car)return;const R=ROOMS[id];fade(()=>{P.outside={x:P.x,z:P.z,h:P.h+Math.PI};P.inside=id;P.x=R.door.x;P.z=R.door.z-.6;P.h=Math.PI;cam.yaw=Math.PI;camera.position.set(P.x,2,P.z+3);sfx('door');if(id==='bank')tutEvent('bank');});}
function exitInterior(){if(heist&&heist.stage==='vault'){heist=null;banner(L('Bỏ dở vụ cướp','Heist abandoned'),L('Bạn rời két quá sớm','You left the vault too early'));for(const n of npcs.filter(n=>n.kind==='guard'))removeNPC(n);}
  const o=P.outside||{x:SP.house.door.x,z:SP.house.door.z,h:0};fade(()=>{P.inside=null;P.x=o.x+Math.sin(o.h)*1.2;P.z=o.z+Math.cos(o.h)*1.2;P.h=o.h;cam.yaw=o.h;camera.position.set(P.x-Math.sin(o.h)*5,3,P.z-Math.cos(o.h)*5);sfx('door');});}
function checkup(){const c=50;if(P.hp>=maxHp()){showPrompt(L('Bạn đang khoẻ','You are already healthy'),1.2);return;}if(save.money<c){showPrompt(L('Không đủ tiền','Not enough money'),1.2);return;}save.money-=c;P.hp=maxHp();sfx('cash');banner(L('Khám xong','All patched up'),L('Hồi đầy máu · ','Full health · ')+fmt$(c));}

/* ---------- GPS: pick a place on the big map, get a route along the roads ---------- */
const gps={wp:null,pts:null,len:0,t:0,key:'',col:'#ff5fd2',mesh:null,arrived:0};
const arrowTex=makeTex(64,64,(g)=>{g.clearRect(0,0,64,64);g.strokeStyle='#fff';g.lineWidth=11;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(18,10);g.lineTo(42,32);g.lineTo(18,54);g.stroke();},{repeat:true});
const routeMat=new T.MeshBasicMaterial({map:arrowTex,color:0xff5fd2,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});
function roadProj(x,z){const i=clamp(Math.round((x+HALF)/CELL),0,N),j=clamp(Math.round((z+HALF)/CELL),0,N);let best;
  {const rx=road(i),zz=clamp(z,road(0),road(N)),s=clamp(Math.floor((zz+HALF)/CELL),0,N-1);best={x:rx,z:zz,d:Math.abs(x-rx)+Math.abs(z-zz),a:[i,s],b:[i,s+1]};}
  {const rz=road(j),xx=clamp(x,road(0),road(N)),s=clamp(Math.floor((xx+HALF)/CELL),0,N-1),d=Math.abs(z-rz)+Math.abs(x-xx);if(d<best.d)best={x:xx,z:rz,d,a:[s,j],b:[s+1,j]};}return best;}
function planRoute(fx,fz,tx,tz){const s=roadProj(fx,fz),e=roadProj(tx,tz),NN=N+1,nid=n=>n[0]*NN+n[1];
  const pts=[[fx,fz],[s.x,s.z]];
  if(nid(s.a)===nid(e.a)&&nid(s.b)===nid(e.b)){pts.push([e.x,e.z],[tx,tz]);return pts;}
  const dist=new Map(),prev=new Map(),open=[];const push=(key,c,pk)=>{if(dist.has(key)&&dist.get(key)<=c)return;dist.set(key,c);prev.set(key,pk);open.push([c,key]);};
  for(const n of[s.a,s.b])push(nid(n)*5+4,hyp(road(n[0])-s.x,road(n[1])-s.z),-1);
  const goal=new Map();for(const n of[e.a,e.b])goal.set(nid(n),hyp(road(n[0])-e.x,road(n[1])-e.z));
  let bestK=-1,bestC=1e9;
  while(open.length){let mi=0;for(let k=1;k<open.length;k++)if(open[k][0]<open[mi][0])mi=k;const[c,key]=open.splice(mi,1)[0];if(c>dist.get(key))continue;if(c>=bestC)break;
    const id=Math.floor(key/5),dir=key%5,node=[Math.floor(id/NN),id%NN];const g=goal.get(id);if(g!==undefined&&c+g<bestC){bestC=c+g;bestK=key;}
    DIRS.forEach((d,di)=>{const a=node[0]+d[0],b=node[1]+d[1];if(!inb(a)||!inb(b))return;push((a*NN+b)*5+di,c+CELL+(dir!==4&&dir!==di?16:0),key);});}
  const chain=[];for(let k=bestK;k>=0;k=prev.get(k)){const id=Math.floor(k/5);chain.push([road(Math.floor(id/NN)),road(id%NN)]);}
  chain.reverse();for(const p of chain)pts.push(p);pts.push([e.x,e.z],[tx,tz]);
  const out=[pts[0]];for(let k=1;k<pts.length;k++){const q=out[out.length-1];if(hyp(pts[k][0]-q[0],pts[k][1]-q[1])>.5)out.push(pts[k]);}return out;}
function gpsTarget(){if(gps.wp)return{x:gps.wp.x,z:gps.wp.z,col:'#ff5fd2',name:gps.wp.name};
  if(MK.target.visible)return{x:MK.target.position.x,z:MK.target.position.z,col:'#ffd166',name:mis?'Mục tiêu':'Điểm vàng'};
  if(heist&&heist.stage==='escape'&&stars===0)return{x:SP.house.door.x,z:SP.house.door.z,col:'#ffffff',name:'Nhà an toàn'};return null;}
function buildRouteMesh(pts,col){if(gps.mesh){scene.remove(gps.mesh);gps.mesh.geometry.dispose();gps.mesh=null;}if(!pts||pts.length<2)return;
  const gb=new GB(),W=.75;let u=0,L=0;const yAt=(x,z)=>{const b=blockAt(x,z);return b&&x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1?.33:.09;};
  for(let k=0;k<pts.length-1&&L<360;k++){let[x0,z0]=pts[k],[x1,z1]=pts[k+1];const l=hyp(x1-x0,z1-z0);if(l<.01)continue;const dx=(x1-x0)/l,dz=(z1-z0)/l,nx=-dz*W,nz=dx*W;
    const steps=Math.max(1,Math.ceil(l/8));for(let s=0;s<steps;s++){const a0=s/steps,a1=(s+1)/steps,ax=x0+(x1-x0)*a0,az=z0+(z1-z0)*a0,bx=x0+(x1-x0)*a1,bz=z0+(z1-z0)*a1,ya=yAt(ax,az),yb=yAt(bx,bz),u0=u+l*a0/2.2,u1=u+l*a1/2.2;
      gb.quad([ax-nx,ya,az-nz],[bx-nx,yb,bz-nz],[bx+nx,yb,bz+nz],[ax+nx,ya,az+nz],[0,1,0],[[u0,1],[u1,1],[u1,0],[u0,0]]);}
    u+=l/2.2;L+=l;}
  routeMat.color.set(col);gps.mesh=new T.Mesh(gb.geo(),routeMat);gps.mesh.renderOrder=2;scene.add(gps.mesh);}
function gpsUpdate(dt){arrowTex.offset.x-=dt*1.4;gps.t-=dt;const tg=gpsTarget(),me=P.car||P;
  if(gps.wp&&hyp(gps.wp.x-me.x,gps.wp.z-me.z)<9){showPrompt('Đã tới '+gps.wp.name,2);clearWaypoint(false);return;}
  if(!tg){if(gps.pts){gps.pts=null;buildRouteMesh(null);}return;}
  if(gps.t>0&&gps.pts)return;gps.t=.4;
  const pts=planRoute(me.x,me.z,tg.x,tg.z);let L=0;for(let k=0;k<pts.length-1;k++)L+=hyp(pts[k+1][0]-pts[k][0],pts[k+1][1]-pts[k][1]);gps.len=L;gps.name=tg.name;gps.col=tg.col;
  const key=pts.slice(2,-2).map(p=>p.join(',')).join('|')+tg.col+Math.round(me.x/4)+','+Math.round(me.z/4);gps.pts=pts;if(key!==gps.key){gps.key=key;buildRouteMesh(pts,tg.col);}}
function setWaypoint(x,z,name){gps.wp={x,z,name:name||'Điểm đánh dấu'};gps.t=0;gps.key='';showPrompt('Đã đặt điểm đến: '+gps.wp.name+' · G để huỷ',2);}
function clearWaypoint(say){if(!gps.wp)return;gps.wp=null;gps.t=0;gps.key='';if(say)showPrompt('Đã huỷ chỉ đường',1.2);}
function poiList(){const L=[{n:'Nhà an toàn',x:SP.house.door.x,z:SP.house.door.z,i:'house'},{n:'Ngân hàng Nexus',x:SP.bank.door.x,z:SP.bank.door.z,i:'bank'},{n:'Bệnh viện',x:SP.hospital.x,z:SP.hospital.z,i:'hosp'},{n:'Đồn cảnh sát',x:SP.police.x,z:SP.police.z,i:'police'},
  {n:'Công viên trung tâm',x:SP.parkMain.x,z:SP.parkMain.z,i:'#5fbf5a'},{n:'Vòng quay bãi biển',x:FW.x-10,z:FW.z,i:'#ff7ad9'},{n:'Cầu tàu',x:WATER-6,z:FW.pier.z,i:'#3ef0e0'}];
  const SC={food:'#ffb703',mart:'#e63946',clothes:'#ad8dff',guns:'#8f1a20',cars:'#c1f354',gym:'#2d6a4f',garage:'#ffd166'};const seen={};for(const sh of SP.shops){if(sh.id==='mart'&&seen.mart)continue;seen[sh.id]=1;L.push({n:SHOPS[sh.id].n,x:sh.x,z:sh.z,i:SC[sh.id]||'#fff'});}
  if(SP.school)L.push({n:'Trường THPT Nexus',x:SP.school.x,z:SP.school.z,i:'#f1faee'});if(SP.stadium)L.push({n:'Sân vận động',x:SP.stadium.x,z:SP.stadium.z,i:'#9aa3ad'});if(SP.apt)L.push({n:save.apt?'Căn hộ của bạn':'Căn hộ ven biển (bán)',x:SP.apt.x,z:SP.apt.z,i:'#2a9d8f'});if(SP.bigBridge)L.push({n:'Cầu dây văng',x:SP.bigBridge.x,z:SP.bigBridge.z-40,i:'#e9edf2'});
  if(!mis)for(const k in GIVERS)if(giverPos[k])L.push({n:GIVERS[k].name,x:giverPos[k].x,z:giverPos[k].z,i:GIVERS[k].css});return L.map(p=>Object.assign(p,{n:TT(p.n)}));}
/* ---------- car radio: plays the Nexus Originals from SonicDeck (original, generated music only) ---------- */
const radio={on:false,idx:typeof save.radio==='number'?save.radio:0};
function radioNames(){return(window.NexusTracks||[]).map(t=>t.t);}
function radioPlay(){const S=window.NexusSynth,names=radioNames();if(!S||!names.length)return false;if(radio.idx<0||radio.idx>=names.length)radio.idx=0;if(S.playing&&!radio.on)return false;S.play(radio.idx,0);radio.on=true;return true;}
function radioStop(){if(radio.on&&window.NexusSynth)window.NexusSynth.stop();radio.on=false;}
function radioNext(){if(!P.car){showPrompt('Lên xe để nghe radio',1.2);return;}const names=radioNames();if(!names.length||!window.NexusSynth){showPrompt('Radio chưa sẵn sàng',1.2);return;}
  if(!radio.on){if(window.NexusSynth.playing){showPrompt('Đang phát nhạc từ SonicDeck',1.4);return;}radioPlay();}else{radio.idx++;if(radio.idx>=names.length){radio.idx=-1;radioStop();save.radio=-1;showPrompt('Radio: tắt',1.4);return;}radioPlay();}
  save.radio=radio.idx;showPrompt('Radio: '+names[radio.idx]+' · R đổi bài',1.8);}

/* ---------- tutorial (optional) ---------- */
const TUT=[
  {t:'Đi lại',d:'Dùng W A S D hoặc phím mũi tên để đi.',ok:()=>tut.moved>8},
  {t:'Camera',d:'Kéo chuột (hoặc vuốt màn hình) để xoay camera. Q và E cũng xoay được.',ok:()=>tut.turned>1.2},
  {t:'Chạy',d:'Giữ Shift trong lúc đi để chạy nhanh.',ok:()=>tut.sprint>1.5},
  {t:'Đánh nhau',d:'Bấm J hoặc click trái để đánh. Bấm liền 3 lần ra combo: đấm trái, đấm phải, đá. Giữ K hoặc chuột phải để đỡ. Đánh bao cát 3 lần.',ok:()=>bag&&bag.hits>=3,mark:()=>bag},
  {t:'Lên xe',d:'Lại gần chiếc xe đậu ở lối vào nhà rồi bấm F.',ok:()=>!!P.car,mark:()=>homeCar},
  {t:'Lái xe',d:'W tăng tốc, S phanh và lùi, A/D lái, Space phanh tay. Lái tới điểm vàng.',ok:()=>tut.drove,mark:()=>tut.drivePt},
  {t:'Xuống xe',d:'Dừng lại và bấm F để xuống xe.',ok:()=>!P.car},
  {t:'Bản đồ',d:'Bấm M (hoặc nút Bản đồ) để mở bản đồ. Bấm vào một địa điểm để được chỉ đường, mũi tên sẽ hiện trên mặt đường.',ok:()=>tut.map},
  {t:'Cửa hàng',d:'Ghé một cửa hàng và bấm E ở cửa. Cơm Tấm Cô Ba bán đồ ăn hồi máu. Bấm số để mua, E để đóng.',ok:()=>tut.shop,mark:()=>SP.shops.find(s=>s.id==='food')},
  {t:'Vũ khí',d:'Súng mua ở Súng Tầm Xa. Phím 1 đến 4 để đổi vũ khí. Giữ chuột phải hoặc K để ngắm, click hoặc J để bắn. Bắn người là phạm tội.',ok:()=>tut.wT>8},
  {t:'Nhà an toàn',d:'Bấm E ở cửa để vào nhà. Tới giường và bấm E để ngủ: lưu game, hồi máu, cất tiền.',ok:()=>tut.saved,mark:()=>P.inside?null:SP.house.door},
  {t:'Xong',d:'Bạn đã sẵn sàng. Cướp ngân hàng ở cột xanh lá giữa trung tâm, rồi cắt đuôi cảnh sát và mang tiền về nhà.',ok:()=>tut.doneT>6}
];
const tut={on:!!opt.tutorial,step:0,moved:0,turned:0,sprint:0,drove:false,map:false,saved:false,shop:false,wT:0,doneT:0,drivePt:null};
function tutEvent(e){if(!tut.on)return;if(e==='save')tut.saved=true;if(e==='map')tut.map=true;if(e==='shop')tut.shop=true;}
function tutSkipStep(){if(!tut.on)return;tut.step++;if(tut.step>=TUT.length)endTut();else{hudT=0;lastHUD='';}}
function tutUpdate(dt){if(!tut.on)return;const s=TUT[tut.step];if(s.t==='Lái xe'&&!tut.drivePt){const p=lanePt(nearestNode(P.x,P.z),[1,0],0);const q=nodeAround(70,110);tut.drivePt={x:q[0],z:q[1]};}
  if(s.t==='Lái xe'&&tut.drivePt&&P.car&&hyp(P.car.x-tut.drivePt.x,P.car.z-tut.drivePt.z)<6)tut.drove=true;
  if(s.t==='Xong')tut.doneT+=dt;if(s.t==='Vũ khí')tut.wT+=dt;
  if(s.ok()){tut.step++;if(tut.step>=TUT.length){endTut();return;}}
  const m=TUT[tut.step].mark&&TUT[tut.step].mark();if(m&&!mis){MK.target.visible=true;MK.target.position.set(m.x,.1,m.z);}else if(!mis)MK.target.visible=false;}
function endTut(){tut.on=false;save.tutDone=true;writeSave();if(!mis)MK.target.visible=false;hud.help.hidden=true;}

/* ---------- world init ---------- */
const homeCar=newCar('sports',spots.driveway.length?SP.house.x+6.2:0,SP.house.z+5,Math.PI,'parked',save.char==='vy'?'#ff4d6d':'#c1f354');
homeCar.driver=false;{const rp=roadProj(SP.house.door.x,SP.house.door.z),hz=Math.abs(rp.z-SP.house.door.z)>Math.abs(rp.x-SP.house.door.x);SP.garage=hz?{x:rp.x+8,z:rp.z+(SP.house.door.z>rp.z?LANE:-LANE),h:SP.house.door.z>rp.z?Math.PI/2:-Math.PI/2}:{x:rp.x+(SP.house.door.x>rp.x?LANE:-LANE),z:rp.z,h:0};SP.garageBtn={x:SP.house.door.x+4.5,z:SP.house.door.z};}
for(const s of spots.display)newCar(pick(['sports','super','suv']),s[0],s[1],s[2],'parked').driver=false;{const dw=spots.driveway.find(s=>Math.abs(s[0]-(SP.house.x+6))<6&&Math.abs(s[1]-SP.house.z)<12);if(dw){homeCar.x=dw[0];homeCar.z=dw[1];homeCar.h=dw[2];syncCar(homeCar);}}
for(const s of spots.parking.slice(0,14))newCar(pick(['sedan','suv','sports']),s[0]+rnd(-3,3),s[1]+rnd(-3,3),pick([0,Math.PI/2,Math.PI,-Math.PI/2]),'parked');
for(const s of spots.driveway)if(Math.random()<.45&&hyp(s[0]-homeCar.x,s[1]-homeCar.z)>4)newCar(pick(['sedan','suv']),s[0],s[1],s[2],'parked');
for(const s of spots.parkedPolice)newCar('police',s[0],s[1],s[2],'parked');
for(const c of cars)c.driver=false;
MK.bank.position.set(SP.bank.door.x,.27,SP.bank.door.z);MK.house.position.set(SP.house.door.x,.27,SP.house.door.z);
bag=makeBag(SP.house.bag.x,SP.house.bag.z);
spawnAt(SP.house.door.x,SP.house.door.z-1.5,0);
placeGivers();
for(let k=0;k<Q.traffic;k++)spawnTraffic(false);
for(let k=0;k<Q.peds;k++)spawnPed();
paintLights(0);
todApply();weatherApply();
if(save.outfit!=='base'||save.cap)rebuildPlayer();

/* ---------- HUD ---------- */
const css=document.createElement('style');css.textContent=`
.nc{position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif;color:#fff}
.nc *{box-sizing:border-box}
.nc [hidden]{display:none!important}
.nc-tr{position:absolute;right:18px;top:62px;text-align:right;display:grid;gap:2px;justify-items:end}
.nc-money{font:700 34px "Space Grotesk",Inter,sans-serif;letter-spacing:.01em;color:#fff;-webkit-text-stroke:1.2px #0a0a0a;paint-order:stroke fill;font-variant-numeric:tabular-nums}
.nc-dirty{font:600 15px Inter,sans-serif;color:#7dffa0;-webkit-text-stroke:.8px #0a0a0a;paint-order:stroke fill}
.nc-stars{font-size:26px;letter-spacing:2px;-webkit-text-stroke:1px #000;paint-order:stroke fill}
.nc-stars i{font-style:normal;color:rgba(255,255,255,.28)}.nc-stars i.on{color:#fff}
.nc-stars.blink i.on{animation:ncb .6s steps(2) infinite}@keyframes ncb{50%{opacity:.3}}
.nc-fist{min-width:44px;height:44px;padding:0 10px;border-radius:10px;background:rgba(0,0,0,.45);display:flex;align-items:center;gap:6px;justify-content:center;font:700 14px Inter,sans-serif;margin-top:4px;pointer-events:auto;cursor:pointer}.nc-fist .e{font-size:22px}
.nc-cross{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border:2px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.5)}.nc-cross::after{content:'';position:absolute;left:50%;top:50%;width:3px;height:3px;margin:-1.5px;background:#fff;border-radius:50%}
.nc-mini{position:absolute;left:18px;bottom:18px;width:230px}
.nc-mini canvas{display:block;width:230px;height:150px;border-radius:10px;border:2px solid rgba(0,0,0,.6);box-shadow:0 4px 18px rgba(0,0,0,.35)}
.nc-ar{height:5px!important;margin-top:3px!important}.nc-ar i{background:#5aa9ff!important}
.nc-hp{height:8px;margin-top:6px;border-radius:4px;background:rgba(0,0,0,.55);overflow:hidden}.nc-hp i{display:block;width:100%;height:100%;background:#4ade80;transform-origin:left center;transition:transform .2s}
.nc-help{position:absolute;left:18px;top:62px;max-width:340px;background:rgba(10,10,14,.82);border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.45;pointer-events:auto}
.nc-help b{display:block;color:#c1f354;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
.nc-help button{margin-top:10px;background:none;border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:8px;padding:5px 10px;font:500 12px Inter,sans-serif;cursor:pointer}
.nc-obj{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);text-align:center;font-size:17px;font-weight:600;-webkit-text-stroke:.8px #000;paint-order:stroke fill;max-width:70vw}
.nc-obj span{color:#ffd166}
.nc-prompt{position:absolute;left:50%;bottom:76px;transform:translateX(-50%);background:rgba(10,10,14,.8);padding:8px 14px;border-radius:9px;font-size:14px;white-space:nowrap}
.nc-prompt:empty{display:none}
.nc-prompt kbd{display:inline-block;min-width:22px;padding:1px 6px;margin-right:6px;border-radius:5px;background:#fff;color:#111;font:700 13px Inter,sans-serif;text-align:center}
.nc-banner{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);text-align:center;opacity:0;transition:opacity .3s}
.nc-banner.on{opacity:1}.nc-banner b{display:block;font:700 clamp(40px,8vw,84px) "Space Grotesk",sans-serif;-webkit-text-stroke:2px #000;paint-order:stroke fill;letter-spacing:.02em}
.nc-banner span{font-size:16px;font-weight:600;-webkit-text-stroke:.7px #000;paint-order:stroke fill}
.nc-speed{position:absolute;right:22px;bottom:20px;font:700 46px "Space Grotesk",sans-serif;line-height:1;text-align:right;-webkit-text-stroke:1.2px #000;paint-order:stroke fill}
.nc-speed small{display:block;font:600 12px Inter,sans-serif}
.nc-bar{position:absolute;left:50%;top:60%;transform:translateX(-50%);width:min(360px,70vw);text-align:center;font-size:14px;font-weight:600}
.nc-bar div{height:10px;border-radius:5px;background:rgba(0,0,0,.55);margin-top:6px;overflow:hidden}.nc-bar i{display:block;height:100%;background:#4ade80}
.nc-flash{position:absolute;inset:0;box-shadow:inset 0 0 160px rgba(255,0,0,.75);opacity:0;transition:opacity .15s}
.nc-map{position:absolute;inset:0;background:rgba(6,8,12,.94);display:flex;align-items:center;justify-content:center;gap:18px;padding:56px 16px 16px;pointer-events:auto}
.nc-map canvas{max-width:min(70vw,84vh);max-height:84vh;width:auto;height:auto;aspect-ratio:1;border-radius:12px;cursor:crosshair;touch-action:none}
.nc-side{width:240px;max-height:84vh;overflow:auto;display:grid;gap:8px;align-content:start;font-size:13px;color:#cfd2da}
.nc-side b{color:#fff;font:700 18px "Space Grotesk",Inter,sans-serif}
.nc-side p{margin:0;line-height:1.45}
.nc-side button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:9px;padding:8px 10px;font:500 13px Inter,sans-serif;cursor:pointer}
.nc-side button:hover{background:rgba(255,255,255,.12)}
.nc-side button i{width:10px;height:10px;border-radius:50%;flex:none}
.nc-side .nc-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.nc-side .nc-row button{justify-content:center}
.nc-gps{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:13px;font-weight:600;-webkit-text-stroke:.6px #000;paint-order:stroke fill}
.nc-gps:empty{display:none}.nc-gps i{width:10px;height:10px;border-radius:50%;flex:none;border:1.5px solid #000}
.nc-clock{font:600 15px "Space Grotesk",Inter,sans-serif;-webkit-text-stroke:.8px #000;paint-order:stroke fill;font-variant-numeric:tabular-nums}
.nc-foe{position:absolute;left:50%;top:70px;transform:translateX(-50%);width:min(260px,60vw);text-align:center;font-size:12px;font-weight:600;-webkit-text-stroke:.6px #000;paint-order:stroke fill}
.nc-foe div{height:7px;border-radius:4px;background:rgba(0,0,0,.6);margin-top:4px;overflow:hidden}.nc-foe i{display:block;height:100%;background:#ff6b5d;transform-origin:left center;transition:transform .15s}
@media (max-width:760px){.nc-map{flex-direction:column;padding-top:52px}.nc-map canvas{max-width:92vw;max-height:56vh}.nc-side{width:92vw;max-height:30vh}}
.nc-fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .25s}.nc-fade.on{opacity:1}
.nc-shop{position:absolute;inset:0;background:rgba(6,8,12,.72);display:grid;place-items:center;pointer-events:auto}
.nc-shopbox{width:min(460px,92vw);max-height:86vh;overflow:auto;background:#101318;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px;display:grid;gap:10px}
.nc-shophead{display:flex;justify-content:space-between;align-items:baseline;gap:10px}.nc-shophead h3{margin:0;font:700 22px "Space Grotesk",Inter,sans-serif}.nc-cash{font:700 18px "Space Grotesk",Inter,sans-serif;color:#c1f354}
.nc-items{display:grid;gap:6px}.nc-items button{display:grid;grid-template-columns:26px 1fr auto;gap:10px;align-items:center;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#fff;font:500 14px Inter,sans-serif;cursor:pointer}
.nc-items button:hover:not(:disabled){background:rgba(193,243,84,.12);border-color:rgba(193,243,84,.4)}.nc-items button:disabled{opacity:.45;cursor:default}
.nc-items .k{width:24px;height:24px;border-radius:6px;background:#fff;color:#111;display:grid;place-items:center;font-weight:700;font-size:12px}.nc-items small{display:block;color:#aab;font-size:12px;margin-top:2px}.nc-items .p{font:700 15px "Space Grotesk",Inter,sans-serif;color:#c1f354}
.nc-shopbox p{margin:0;color:#99a;font-size:12px}.nc-shopx{justify-self:end;background:none;border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:8px;padding:6px 14px;font:500 13px Inter,sans-serif;cursor:pointer}
.nc-touch{position:absolute;inset:0}
.nc-joy{position:absolute;left:26px;bottom:200px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.3);pointer-events:auto;touch-action:none}
.nc-joy i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(255,255,255,.7)}
.nc-btns{position:absolute;right:14px;bottom:84px;display:grid;grid-template-columns:repeat(2,58px);gap:9px;pointer-events:auto}
.nc-btns button{width:58px;height:58px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(0,0,0,.45);color:#fff;font:700 12px Inter,sans-serif;touch-action:none}
@media (max-width:700px){.nc-mini{width:150px}.nc-mini canvas{width:150px;height:110px}.nc-money{font-size:24px}.nc-help{max-width:62vw;font-size:12.5px}.nc-speed{bottom:auto;top:170px;font-size:30px}.nc-obj{bottom:170px;font-size:14px}.nc-prompt{bottom:auto;top:118px;white-space:normal;max-width:80vw;text-align:center}.nc-tr{top:58px}}`;
root.appendChild(css);
const hudEl=document.createElement('div');hudEl.className='nc';hudEl.innerHTML=`
<div class="nc-flash"></div><div class="nc-fade"></div><div class="nc-shop" hidden><div class="nc-shopbox"><div class="nc-shophead"><h3></h3><span class="nc-cash"></span></div><div class="nc-items"></div><p>Bấm số hoặc chạm để mua · E để đóng</p><button type="button" class="nc-shopx">Đóng</button></div></div>
<div class="nc-help" hidden><b></b><div></div><button type="button" class="nc-skip1">Bỏ qua bước này</button> <button type="button" class="nc-skipall">Tắt hướng dẫn</button></div>
<div class="nc-tr"><div class="nc-clock"></div><div class="nc-money"></div><div class="nc-dirty"></div><div class="nc-stars"></div><div class="nc-fist" title="Đổi vũ khí (1-4)"><span class="e">✊</span></div></div><div class="nc-cross" hidden></div>
<div class="nc-foe" hidden><span></span><div><i></i></div></div>
<div class="nc-mini"><div class="nc-gps"></div><canvas width="460" height="300"></canvas><div class="nc-hp"><i></i></div><div class="nc-hp nc-ar" hidden><i></i></div></div>
<div class="nc-obj"></div><div class="nc-prompt"></div>
<div class="nc-bar" hidden>Đang vét két<div><i></i></div></div>
<div class="nc-speed" hidden></div>
<div class="nc-banner"><b></b><span></span></div>
<div class="nc-map" hidden><canvas width="900" height="900"></canvas><div class="nc-side"><b>Chỉ đường</b><p>Bấm vào một điểm trên bản đồ hoặc chọn địa điểm bên dưới. Đường đi hiện trên mặt đường và bản đồ nhỏ.</p><div class="nc-poi" style="display:grid;gap:6px"></div><div class="nc-row"><button type="button" class="nc-clr">Huỷ chỉ đường</button><button type="button" class="nc-close">Đóng (M)</button></div></div></div>
<div class="nc-touch" hidden><div class="nc-joy"><i></i></div><div class="nc-btns"><button data-b="punch">Đấm</button><button data-b="block">Đỡ</button><button data-b="jump">Nhảy<br>Phanh</button><button data-b="car">Xe</button><button data-b="act">E</button><button data-b="sprint">Chạy</button><button data-b="map">Bản đồ</button><button data-b="radio">Radio</button></div></div>`;
root.appendChild(hudEl);
const $h=s=>hudEl.querySelector(s);
const hud={help:$h('.nc-help'),money:$h('.nc-money'),dirty:$h('.nc-dirty'),stars:$h('.nc-stars'),mini:$h('.nc-mini canvas'),hp:$h('.nc-hp i'),obj:$h('.nc-obj'),prompt:$h('.nc-prompt'),bar:$h('.nc-bar'),barI:$h('.nc-bar i'),speed:$h('.nc-speed'),banner:$h('.nc-banner'),flash:$h('.nc-flash'),map:$h('.nc-map'),mapC:$h('.nc-map canvas'),touch:$h('.nc-touch'),gps:$h('.nc-gps'),fistEl:$h('.nc-fist'),cross:$h('.nc-cross'),armor:$h('.nc-ar i'),shop:$h('.nc-shop'),clock:$h('.nc-clock'),foe:$h('.nc-foe'),foeN:$h('.nc-foe span'),foeI:$h('.nc-foe i'),poi:$h('.nc-poi')};
hud.help.querySelector('.nc-skipall').addEventListener('click',endTut);hud.help.querySelector('.nc-skip1').addEventListener('click',tutSkipStep);$h('.nc-fist').addEventListener('click',()=>{if(active)cycleWeapon();});hud.fade=$h('.nc-fade');$h('.nc-shopx').addEventListener('click',closeShop);
let banT=0,promptT=0,promptTxt='';
function banner(t,d,dur){hud.banner.querySelector('b').textContent=t;hud.banner.querySelector('span').textContent=d||'';hud.banner.classList.add('on');clearTimeout(banT);banT=setTimeout(()=>hud.banner.classList.remove('on'),(dur||2.6)*1000);}
function showPrompt(t,dur){promptTxt=t;promptT=dur||1.5;}
// minimap background
const MAPX0=EXT.x0-10,MAPX1=WATER+60,MAPZ0=EXT.z0-10,MAPZ1=EXT.z1+10,MK1=1.2;
const mapBg=document.createElement('canvas');mapBg.width=Math.ceil((MAPX1-MAPX0)*MK1);mapBg.height=Math.ceil((MAPZ1-MAPZ0)*MK1);
{const g=mapBg.getContext('2d'),X=x=>(x-MAPX0)*MK1,Z=z=>(z-MAPZ0)*MK1;g.fillStyle='#55683f';g.fillRect(0,0,mapBg.width,mapBg.height);g.fillStyle='#3b3a40';g.fillRect(X(-HALF-RW/2-3),Z(-HALF-RW/2-3),(2*HALF+RW+6)*MK1,(2*HALF+RW+6)*MK1);
  g.fillStyle='#d9c08c';g.fillRect(X(SAND0),0,X(WATER)-X(SAND0),mapBg.height);g.fillStyle='#2b86a3';g.fillRect(X(WATER),0,mapBg.width,mapBg.height);
  for(const b of blocks){g.fillStyle=b.d==='river'?'#2b86a3':b.d==='park'||b.d==='stadium'?'#5f9442':b.d==='res'?'#6f9a52':'#a39d94';g.fillRect(X(b.x0),Z(b.z0),(b.x1-b.x0)*MK1,(b.z1-b.z0)*MK1);}
  g.fillStyle='#2b86a3';g.fillRect(0,Z(RZ0),X(road(0)-RW/2),(RZ1-RZ0)*MK1);g.fillRect(X(SAND0),Z(RZ0),mapBg.width,(RZ1-RZ0)*MK1);
  for(const c of blds){g.fillStyle=c.h>40?'#57545e':'#6f6b74';g.fillRect(X(c.x0),Z(c.z0),(c.x1-c.x0)*MK1,(c.z1-c.z0)*MK1);}}
const mm=hud.mini.getContext('2d');
function icon(g,x,y,type,s){s=s||1;g.save();g.translate(x,y);g.scale(s,s);g.lineWidth=2;g.strokeStyle='#000';
  if(type==='bank'){g.fillStyle='#4ade80';g.beginPath();g.arc(0,0,9,0,7);g.fill();g.stroke();g.fillStyle='#062';g.font='700 12px Inter';g.textAlign='center';g.textBaseline='middle';g.fillText('$',0,1);}
  else if(type==='house'){g.fillStyle='#fff';g.beginPath();g.moveTo(-8,1);g.lineTo(0,-8);g.lineTo(8,1);g.lineTo(5,1);g.lineTo(5,8);g.lineTo(-5,8);g.lineTo(-5,1);g.closePath();g.fill();g.stroke();}
  else if(type==='hosp'){g.fillStyle='#fff';g.fillRect(-8,-8,16,16);g.strokeRect(-8,-8,16,16);g.fillStyle='#d62828';g.fillRect(-2,-6,4,12);g.fillRect(-6,-2,12,4);}
  else if(type==='police'){g.fillStyle='#3d6fd6';g.beginPath();g.moveTo(0,-9);g.lineTo(8,-5);g.lineTo(6,6);g.lineTo(0,9);g.lineTo(-6,6);g.lineTo(-8,-5);g.closePath();g.fill();g.stroke();}
  else{g.fillStyle=type;g.beginPath();g.arc(0,0,7,0,7);g.fill();g.stroke();}g.restore();}
function drawMini(){const g=mm,Wd=hud.mini.width,Hd=hud.mini.height,k=1.6;g.save();g.fillStyle='#55683f';g.fillRect(0,0,Wd,Hd);g.translate(Wd/2,Hd*.62);g.rotate(cam.yaw+Math.PI);g.scale(k/MK1,k/MK1);const t=P.car||P;g.drawImage(mapBg,-(t.x-MAPX0)*MK1,-(t.z-MAPZ0)*MK1);g.restore();
  const tr=(x,z)=>{const dx=(x-t.x)*k,dz=(z-t.z)*k,c=Math.cos(cam.yaw+Math.PI),s=Math.sin(cam.yaw+Math.PI);let sx=dx*c-dz*s,sy=dx*s+dz*c;const mx=Wd/2-12,myT=Hd*.62-12,myB=Hd*.38-12;sx=clamp(sx,-mx,mx);sy=clamp(sy,-myT,myB);return[Wd/2+sx,Hd*.62+sy];};
  if(gps.pts){const c0=Math.cos(cam.yaw+Math.PI),s0=Math.sin(cam.yaw+Math.PI);g.save();g.beginPath();g.rect(0,0,Wd,Hd);g.clip();g.lineWidth=6;g.lineJoin='round';g.lineCap='round';g.strokeStyle='rgba(0,0,0,.55)';
    const path=()=>{g.beginPath();gps.pts.forEach((p,k)=>{const dx=(p[0]-t.x)*k1,dz=(p[1]-t.z)*k1,x=Wd/2+dx*c0-dz*s0,y=Hd*.62+dx*s0+dz*c0;k?g.lineTo(x,y):g.moveTo(x,y);});};const k1=k;
    path();g.lineWidth=8;g.stroke();path();g.lineWidth=4.5;g.strokeStyle=gps.col;g.stroke();g.restore();}
  if(gps.wp){const p=tr(gps.wp.x,gps.wp.z);pin(g,p[0],p[1],1);}
  if(lastSeen&&stars>0&&!seenT){const p=tr(lastSeen.x,lastSeen.z);g.fillStyle='rgba(255,60,60,.18)';g.strokeStyle='rgba(255,80,80,.6)';g.beginPath();g.arc(p[0],p[1],60,0,7);g.fill();g.stroke();}
  icon(g,...tr(SP.bank.door.x,SP.bank.door.z),'bank');icon(g,...tr(SP.house.door.x,SP.house.door.z),'house');icon(g,...tr(SP.hospital.x,SP.hospital.z),'hosp',.8);icon(g,...tr(SP.police.x,SP.police.z),'police',.8);
  if(!mis&&!(heist&&heist.stage==='vault'))for(const kk in GIVERS)icon(g,...tr(giverPos[kk].x,giverPos[kk].z),GIVERS[kk].css,.8);
  if(MK.target.visible)icon(g,...tr(MK.target.position.x,MK.target.position.z),'#ffd166',1.1);
  for(const c of cars)if(c.kind==='police'&&stars>0){const p=tr(c.x,c.z);g.fillStyle=Math.floor(time*6)%2?'#ff3b3b':'#3b7bff';g.beginPath();g.arc(p[0],p[1],4,0,7);g.fill();}
  const h=(P.car?P.car.h:P.h);g.save();g.translate(Wd/2,Hd*.62);g.rotate(cam.yaw-h);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(0,-10);g.lineTo(7,8);g.lineTo(0,4);g.lineTo(-7,8);g.closePath();g.fill();g.stroke();g.restore();}
function pin(g,x,y,s){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle='#ff5fd2';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-3,-6,-9,-9,-9,-15);g.arc(0,-15,9,Math.PI,0);g.bezierCurveTo(9,-9,3,-6,0,0);g.fill();g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(0,-15,3.5,0,7);g.fill();g.restore();}
const mapS=()=>hud.mapC.width/Math.max(mapBg.width,mapBg.height),mapOY=()=>(hud.mapC.height-mapBg.height*mapS())/2;
function drawBigMap(){const c=hud.mapC,g=c.getContext('2d'),s=mapS();g.fillStyle='#111';g.fillRect(0,0,c.width,c.height);const oy=mapOY();g.drawImage(mapBg,0,oy,mapBg.width*s,mapBg.height*s);
  const tr=(x,z)=>[(x-MAPX0)*MK1*s,(z-MAPZ0)*MK1*s+oy];
  if(gps.pts){g.lineJoin='round';g.lineCap='round';const path=()=>{g.beginPath();gps.pts.forEach((p,k)=>{const q=tr(p[0],p[1]);k?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);});};path();g.lineWidth=7;g.strokeStyle='rgba(0,0,0,.6)';g.stroke();path();g.lineWidth=4;g.strokeStyle=gps.col;g.stroke();}
  g.font='700 21px Inter';g.textAlign='left';
  for(const p of poiList()){const q=tr(p.x,p.z);icon(g,q[0],q[1],p.i,p.i.length>6?1.5:1.9);g.lineWidth=5;g.strokeStyle='rgba(0,0,0,.8)';g.strokeText(p.n,q[0]+17,q[1]+7);g.fillStyle='#fff';g.fillText(p.n,q[0]+17,q[1]+7);}
  if(MK.target.visible)icon(g,...tr(MK.target.position.x,MK.target.position.z),'#ffd166',1.6);
  if(gps.wp){const q=tr(gps.wp.x,gps.wp.z);pin(g,q[0],q[1],1.6);}
  const t=P.car||P,p=tr(t.x,t.z),h=P.car?P.car.h:P.h;g.save();g.translate(p[0],p[1]);g.rotate(Math.PI-h);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(0,-13);g.lineTo(9,10);g.lineTo(0,5);g.lineTo(-9,10);g.closePath();g.fill();g.stroke();g.restore();
  g.fillStyle='#fff';g.font='700 26px "Space Grotesk",Inter';g.textAlign='left';g.fillText('NEXUS CITY',16,mapOY()+34);}
function renderPOI(){hud.poi.innerHTML='';for(const p of poiList()){const b=document.createElement('button');b.type='button';const col=p.i==='bank'?'#4ade80':p.i==='house'?'#ffffff':p.i==='hosp'?'#d62828':p.i==='police'?'#3d6fd6':p.i;b.innerHTML='<i style="background:'+col+'"></i>';b.appendChild(document.createTextNode(p.n));b.addEventListener('click',()=>{setWaypoint(p.x,p.z,p.n);gpsUpdate(0);drawBigMap();});hud.poi.appendChild(b);}}
let mapOpen=false;function toggleMap(){mapOpen=!mapOpen;hud.map.hidden=!mapOpen;if(mapOpen){gps.t=0;gpsUpdate(0);drawBigMap();renderPOI();tutEvent('map');}}
hud.mapC.addEventListener('click',e=>{const c=hud.mapC,r=c.getBoundingClientRect(),px=(e.clientX-r.left)*c.width/r.width,py=(e.clientY-r.top)*c.height/r.height,s=mapS();
  const x=px/(MK1*s)+MAPX0,z=(py-mapOY())/(MK1*s)+MAPZ0;
  if(gps.wp&&hyp(gps.wp.x-x,gps.wp.z-z)*MK1*s<16){clearWaypoint(true);gpsUpdate(0);drawBigMap();return;}
  let best=null,bd=22;for(const p of poiList()){const d=hyp(p.x-x,p.z-z)*MK1*s;if(d<bd){bd=d;best=p;}}
  if(best)setWaypoint(best.x,best.z,best.n);else setWaypoint(clamp(x,EXT.x0+2,EXT.x1-2),clamp(z,EXT.z0+2,EXT.z1-2),'Điểm đánh dấu');
  gpsUpdate(0);drawBigMap();});
$h('.nc-clr').addEventListener('click',()=>{clearWaypoint(true);gpsUpdate(0);drawBigMap();});
$h('.nc-close').addEventListener('click',toggleMap);

/* ---------- input ---------- */
const keys=new Set();let active=false;const K=k=>keys.has(k);
const joy={x:0,y:0,id:null},tb={jump:false,sprint:false,block:false};
function onKey(e){if(!active)return;sfxInit();const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat){keys.add(k);return;}
  if(shopOpen){if(k==='e'||k==='backspace')closeShop();else if(/^[1-9]$/.test(k)){const it=shopItems(shopOpen)[+k-1];if(it)buyItem(it);}return;}
  if(k==='m')toggleMap();else if(mapOpen)return;
  if(k==='f')toggleCar();if(k==='j'){if(P.weapon!=='fist'&&!P.car)P.trigger=true;else playerPunch();}if(k==='h'&&P.car)sfx('horn');if(k>='1'&&k<='4')selectWeapon(WORDER[+k-1]);if(k==='e')interact();if(k==='r')radioNext();if(k==='g')clearWaypoint(true);if(k==='c')cam.lastDrag=-1e9,cam.yaw=P.car?P.car.h:P.h;keys.add(k);}
const offKey=e=>{const k=e.key.toLowerCase();keys.delete(k);if(k==='j')P.trigger=false;};
window.addEventListener('keydown',onKey);window.addEventListener('keyup',offKey);
const cv=renderer.domElement;
cv.addEventListener('pointerdown',e=>{sfxInit();if(e.pointerType==='mouse'&&e.button===2)cam.rmb=true;if(e.pointerType==='mouse'&&e.button===0&&active&&!mapOpen&&P.weapon!=='fist'&&!P.car)P.trigger=true;cam.drag={x:e.clientX,y:e.clientY,id:e.pointerId,t:performance.now(),moved:0,mouse:e.pointerType==='mouse'};try{cv.setPointerCapture(e.pointerId);}catch(_){}});
cv.addEventListener('pointermove',e=>{const d=cam.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;d.moved+=Math.abs(dx)+Math.abs(dy);cam.yaw-=dx*.006;cam.pitch=clamp(cam.pitch+dy*.004,.05,1.05);cam.lastDrag=performance.now();tut.turned+=Math.abs(dx*.006);});
const endDrag=e=>{if(e.pointerType==='mouse'&&(e.button===2||e.type==='pointercancel'))cam.rmb=false;if(e.button===0||e.type==='pointercancel')P.trigger=false;const d=cam.drag;if(!d||d.id!==e.pointerId)return;cam.drag=null;if(d.mouse&&e.button===0&&d.moved<6&&performance.now()-d.t<300&&active&&!mapOpen&&P.weapon==='fist')playerPunch();};
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
cv.addEventListener('wheel',e=>{cam.dist=clamp(cam.dist+e.deltaY*.01,4,14);e.preventDefault();},{passive:false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
if(MOBILE){hud.touch.hidden=false;const jEl=$h('.nc-joy'),kn=$h('.nc-joy i');
  const mv=e=>{const r=jEl.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const m=hyp(dx,dy),R=50;if(m>R){dx*=R/m;dy*=R/m;}joy.x=dx/R;joy.y=-dy/R;kn.style.transform=`translate(${dx}px,${dy}px)`;};
  jEl.addEventListener('pointerdown',e=>{joy.id=e.pointerId;try{jEl.setPointerCapture(e.pointerId);}catch(_){}mv(e);});jEl.addEventListener('pointermove',e=>{if(joy.id===e.pointerId)mv(e);});
  const je=e=>{if(joy.id!==e.pointerId)return;joy.id=null;joy.x=joy.y=0;kn.style.transform='';};jEl.addEventListener('pointerup',je);jEl.addEventListener('pointercancel',je);
  hudEl.querySelectorAll('.nc-btns button').forEach(b=>{const k=b.dataset.b;b.addEventListener('pointerdown',e=>{e.preventDefault();if(!active)return;sfxInit();if(k==='punch'){if(P.weapon!=='fist'&&!P.car)P.trigger=true;else playerPunch();}if(k==='car')toggleCar();if(k==='act')interact();if(k==='map')toggleMap();if(k==='radio')radioNext();if(k==='jump')tb.jump=true;if(k==='block')tb.block=true;if(k==='sprint')tb.sprint=!tb.sprint,b.style.background=tb.sprint?'rgba(193,243,84,.5)':'';});
    const up=()=>{if(k==='punch')P.trigger=false;if(k==='jump')tb.jump=false;if(k==='block')tb.block=false;};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);});}

/* ---------- interaction ---------- */
function interactOption(){const t=P.car||P,near=(p,r)=>p&&hyp(P.x-p.x,P.z-p.z)<r;
  if(P.inside){const R=ROOMS[P.inside];
    if(near(R.door,1.8))return{k:'E',txt:L('Ra ngoài','Go outside'),fn:exitInterior};
    if(P.inside==='house'){if(near(R.bed,2.2))return{k:'E',txt:P.dirty?L('Cất tiền và lưu game','Stash the cash and save'):L('Ngủ: lưu game, hồi máu','Sleep: save and heal'),fn:sleepHome};if(near(R.wardrobe,2))return{k:'E',txt:L('Tủ quần áo','Wardrobe'),fn:()=>openShop('wardrobe')};if(near(R.fridge,2))return{k:'E',txt:L('Tủ lạnh: ăn nhẹ, +30 máu','Fridge: grab a snack, +30 HP'),fn:()=>{heal(30);showPrompt(L('Ngon!','Tasty!'),1);}};}
    if(P.inside==='hospital'&&near(R.desk,2.6))return{k:'E',txt:L('Khám bệnh: hồi đầy máu · $50','Check-up: full health · $50'),fn:checkup};
    if(P.inside==='bank'&&near(R.vault,3.2)&&!heist)return{k:'E',txt:L('Cướp két','Rob the vault'),fn:startHeist};
    return null;}
  if(!P.car&&near(SP.house.door,2.6))return{k:'E',txt:L('Vào nhà','Enter house'),fn:()=>enterInterior('house')};
  if(!P.car&&near(SP.bank.door,2.6))return{k:'E',txt:L('Vào ngân hàng','Enter bank'),fn:()=>enterInterior('bank')};
  if(!P.car&&near(SP.hospitalDoor,2.6))return{k:'E',txt:L('Vào bệnh viện','Enter hospital'),fn:()=>enterInterior('hospital')};
  if(!P.car&&near(SP.garageBtn,2.2))return{k:'E',txt:L('Gara: lấy xe của bạn','Garage: get your car'),fn:garageSpawn};
  if(!P.car&&near(SP.apt,2.6))return save.apt?{k:'E',txt:L('Căn hộ: lưu game, hồi máu','Apartment: save and heal'),fn:stashAtHome}:{k:'E',txt:L('Mua căn hộ ven biển · ','Buy beach apartment · ')+fmt$(APT_PRICE),fn:()=>{if(save.money<APT_PRICE){showPrompt(L('Không đủ tiền','Not enough money'),1.4);return;}save.money-=APT_PRICE;save.apt=true;sfx('cash');writeSave();banner(L('Căn hộ ven biển','Beach apartment'),L('Nhà an toàn thứ hai: lưu game, hồi máu, cất tiền','Second safehouse: save, heal, stash cash'));}};
  for(const s of SP.shops){const r=s.id==='garage'?5.5:2.6;if((s.id==='garage'||!P.car)&&hyp(t.x-s.x,t.z-s.z)<r)return{k:'E',txt:L('Vào ','Enter ')+TT(SHOPS[s.id].n),fn:()=>openShop(s.id)};}
  if(!mis&&!(heist&&heist.stage==='vault'))for(const k in GIVERS){const p=giverPos[k];if(p&&hyp(t.x-p.x,t.z-p.z)<3.2)return{k:'E',txt:'Nhận việc: '+GIVERS[k].name,fn:()=>startMission(k)};}
  if(!P.car){let best=null,bd=4.5;for(const c of cars){const d=hyp(c.x-P.x,c.z-P.z);if(d<bd){bd=d;best=c;}}if(best)return{k:'F',txt:best.driver?(best.kind==='police'?'Cướp xe cảnh sát':'Kéo tài xế ra, lấy xe'):'Lên xe',fn:toggleCar,noE:true};}
  else if(Math.abs(P.car.vf)<6)return{k:'F',txt:'Xuống xe',fn:toggleCar,noE:true};
  return null;}
function interact(){const o=interactOption();if(o&&!o.noE)o.fn();}

/* ---------- player update ---------- */
function playerUpdate(dt){
  P.punchCD-=dt;if(P.inv>0)P.inv-=dt;
  if(P.kvx||P.kvz){P.x+=P.kvx*dt;P.z+=P.kvz*dt;const f=Math.exp(-8*dt);P.kvx*=f;P.kvz*=f;if(Math.abs(P.kvx)+Math.abs(P.kvz)<.05)P.kvx=P.kvz=0;const p=resolve(P.x,P.z,.38);if(p){P.x+=p[0];P.z+=p[1];}}
  if(P.koT>0){P.koT-=dt;if(P.getUp&&P.koT<.5){P.H.ko=0;P.getUp=false;}P.pend=null;P.blocking=false;P.H.blockHold=false;if(!P.car){P.H.root.position.set(P.x,P.y,P.z);}animHuman(P.H,dt,0,time);return;}
  if(P.pend){P.pend.t-=dt;if(P.pend.t<=0){const pe=P.pend;P.pend=null;resolvePlayerHit(pe);}}
  const armed=P.weapon!=='fist'&&!P.car,wantAim=armed&&(K('k')||cam.rmb||tb.block);P.aiming=wantAim;P.fireCD-=dt;
  P.H.hold=armed?1:0;P.H.two=armed&&WEAP[P.weapon].two;P.H.aim=wantAim||armed&&time-(P.lastShot||-9)<.6?1:0;P.H.aimP=wantAim?(cam.pitch-.28)*-.9:0;
  if(wantAim)P.h=lerpA(P.h,cam.yaw,1-Math.exp(-20*dt));
  if(armed&&P.trigger&&P.fireCD<=0)fireWeapon();
  const wantBlock=!armed&&!P.car&&(K('k')||cam.rmb||tb.block);if(wantBlock&&!P.blocking)P.blockStart=time;P.blocking=wantBlock;P.H.blockHold=wantBlock;if(wantBlock)P.H.block=.1;
  if(P.blocking){const f=nearestFoe(5);if(f)P.h=lerpA(P.h,Math.atan2(f.x-P.x,f.z-P.z),1-Math.exp(-14*dt));}
  if(P.lunge>0&&!P.car){const s=Math.min(P.lunge,dt*9);P.lunge-=s;P.x+=Math.sin(P.h)*s;P.z+=Math.cos(P.h)*s;}
  const fwd=clamp((K('w')||K('arrowup')?1:0)-(K('s')||K('arrowdown')?1:0)+joy.y,-1,1),side=clamp((K('d')||K('arrowright')?1:0)-(K('a')||K('arrowleft')?1:0)+joy.x,-1,1);
  const jump=K(' ')||tb.jump,sprint=K('shift')||tb.sprint;
  cam.yaw+=((K('q')?1:0)-(K('e')&&false?1:0))*0;
  if(P.car){const c=P.car,dead=c.hp<=0;if(dead&&!c.deadSaid){c.deadSaid=1;showPrompt(L('Xe hỏng máy · xuống xe hoặc tới garage','The engine is dead · get out or visit a garage'),2.4);}
    carStep(c,dt,dead?0:Math.max(0,fwd),dead?.3:Math.max(0,-fwd),side,jump);P.x=c.x;P.z=c.z;P.moving=Math.abs(c.vf);if(tut.on&&TUT[tut.step].t==='Lái xe');return;}
  const y=cam.yaw,fx=Math.sin(y),fz=Math.cos(y),rx=-Math.cos(y),rz=Math.sin(y);let mx=fx*fwd+rx*side,mz=fz*fwd+rz*side;const n=hyp(mx,mz);let spd=0;
  const busy=P.punchCD>0&&time-P.lastPunch<.25;
  if(n>.05){spd=(P.blocking?1.8:P.aiming?2.4:busy?1.2:sprint?9.5*(1+.15*(save.up.run|0))*(P.boostT>0?1.15:1):4.6)*Math.min(1,n);mx/=n;mz/=n;P.x+=mx*spd*dt;P.z+=mz*spd*dt;if(!P.blocking&&!busy&&!P.aiming)P.h=lerpA(P.h,Math.atan2(mx,mz),1-Math.exp(-12*dt));tut.moved+=spd*dt;if(sprint)tut.sprint+=dt;}
  P.moving=spd;
  const p=resolve(P.x,P.z,.38);if(p){P.x+=p[0];P.z+=p[1];}
  for(const c of cars){const dx=P.x-c.x,dz=P.z-c.z;if(dx*dx+dz*dz>16)continue;const fx2=Math.sin(c.h),fz2=Math.cos(c.h),lz=dx*fx2+dz*fz2,lx=dx*-fz2+dz*fx2;if(Math.abs(lx)<1.35&&Math.abs(lz)<2.6){const sp=Math.abs(c.vf);if(sp>6&&c!==P.car){hurtPlayer(sp*2.4,c);if(P.hp>0){P.koT=1.4;P.H.ko=1;setTimeout(()=>{P.H.ko=0;},1100);}P.x+=fx2*Math.sign(c.vf)*2;P.z+=fz2*Math.sign(c.vf)*2;}else{const ox=1.35-Math.abs(lx),oz=2.6-Math.abs(lz);if(ox<oz){P.x+=-fz2*Math.sign(lx)*ox;P.z+=fx2*Math.sign(lx)*ox;}else{P.x+=fx2*Math.sign(lz)*oz;P.z+=fz2*Math.sign(lz)*oz;}}}}
  for(const n2 of npcs){if(n2.state==='down')continue;const dx=P.x-n2.x,dz=P.z-n2.z,d=hyp(dx,dz);if(d<.7&&d>0){P.x+=dx/d*(.7-d)*.5;P.z+=dz/d*(.7-d)*.5;n2.x-=dx/d*(.7-d)*.5;n2.z-=dz/d*(.7-d)*.5;}}
  const ground=(()=>{const b=blockAt(P.x,P.z);return b&&P.x>b.x0&&P.x<b.x1&&P.z>b.z0&&P.z<b.z1?.25:heightAt(P.x,P.z);})();
  if(jump&&P.y<=ground+.001)P.vy=6.5;P.vy-=20*dt;P.y+=P.vy*dt;if(P.y<ground){P.y=ground;P.vy=0;}
  const near=npcs.some(n2=>n2.state==='fight'&&hyp(n2.x-P.x,n2.z-P.z)<4);P.H.guard=near||time-P.lastPunch<1.2?1:0;
  P.H.root.position.set(P.x,P.y,P.z);P.H.root.rotation.y=P.h;animHuman(P.H,dt,spd,time);
  if(P.boostT>0)P.boostT-=dt;const MH=maxHp();if(P.hp<MH&&time-P.lastPunch>4)P.hp=Math.min(MH,P.hp+dt*(P.hp<50?2:.6));
}

/* ---------- car-car collisions ---------- */
function onCrash(c,imp){if(c.sus){c.sus.pv+=imp*.015;c.sus.yv+=imp*.02;}if(c===P.car)sfx('crash');if(c===P.car){cam.shake=Math.min(.5,imp/40);P.car.hp-=imp*.6;}}
function carPairs(){const L=cars.filter(c=>Math.abs(c.x-P.x)<90&&Math.abs(c.z-P.z)<90);
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];const ddx=b.x-a.x,ddz=b.z-a.z;if(ddx*ddx+ddz*ddz>36)continue;
    const ca=a.spec.co||1.2,cb=b.spec.co||1.2,RS=(a.spec.cr||1.12)+(b.spec.cr||1.12);for(const ia of[-ca,ca])for(const ib of[-cb,cb]){const ax=a.x+Math.sin(a.h)*ia,az=a.z+Math.cos(a.h)*ia,bx=b.x+Math.sin(b.h)*ib,bz=b.z+Math.cos(b.h)*ib;const dx=bx-ax,dz=bz-az,d=hyp(dx,dz);if(d>=RS||d<1e-4)continue;
      const nx=dx/d,nz=dz/d,pen=RS-d,ma=a.kind==='parked'?a.mass*1.5:a.mass,mb=b.kind==='parked'?b.mass*1.5:b.mass,wa=mb/(ma+mb),wb=ma/(ma+mb);
      a.x-=nx*pen*wa;a.z-=nz*pen*wa;b.x+=nx*pen*wb;b.z+=nz*pen*wb;
      const rv=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(rv<0){const J=-1.25*rv/(1/ma+1/mb);a.vx-=J*nx/ma;a.vz-=J*nz/ma;b.vx+=J*nx/mb;b.vz+=J*nz/mb;
        const imp=-rv;if(imp>3){const pc=a===P.car?a:b===P.car?b:null;if(pc){const o=pc===a?b:a;cam.shake=Math.min(.45,imp/35);if(o.kind==='police'&&imp>6)crime(1,true);
          if(o.kind==='traffic'&&imp>11&&Math.random()<.35){o.kind='parked';o.ai=null;o.driver=false;const lx=Math.cos(o.h),lz=-Math.sin(o.h);const n=newNPC('ped',o.x+lx*2,o.z+lz*2,{state:'fight',t:20,fighter:true});showPrompt('Tài xế nổi giận xuống xe',1.4);}}}}
      syncCar(a);syncCar(b);}}}
function parkedPhysics(c,dt){if(Math.abs(c.vx)+Math.abs(c.vz)<.05){c.vx=c.vz=0;return;}carStep(c,dt,0,.6,0,false);}

/* ---------- camera ---------- */
const camPos=new T.Vector3();
function camUpdate(dt){
  const t=P.car?{x:P.car.x,y:1.5+heightAt(P.car.x,P.car.z),z:P.car.z}:{x:P.x,y:1.55+P.y,z:P.z};
  cam.yaw+=((K('q')?1:0)-(K('e')&&P.car?1:0))*2.2*dt;
  if(P.car&&performance.now()-cam.lastDrag>1400&&Math.abs(P.car.vf)>2){const tgt=P.car.vf<-1?P.car.h+Math.PI:P.car.h;cam.yaw=lerpA(cam.yaw,tgt,1-Math.exp(-2.6*dt));}
  const dist=P.car?Math.max(9,cam.dist+3.5)+Math.min(4,Math.abs(P.car.vf)*.08):P.aiming?3.1:P.inside?Math.min(cam.dist,4.2):cam.dist,p=P.inside?Math.min(cam.pitch,.3):cam.pitch+(P.car?.04:0);const shx=P.aiming?-Math.cos(cam.yaw)*.75:0,shz=P.aiming?Math.sin(cam.yaw)*.75:0;t.x+=shx;t.z+=shz;
  let cx=t.x-Math.sin(cam.yaw)*dist*Math.cos(p),cz=t.z-Math.cos(cam.yaw)*dist*Math.cos(p),cy=t.y+dist*Math.sin(p)+(P.car?.8:.3);
  if(P.inside){const R=ROOMS[P.inside];let k=1;for(;k>.18;k-=.04){const x=t.x+(cx-t.x)*k,z=t.z+(cz-t.z)*k,y=t.y+(cy-t.y)*k;if(x>R.x0+.3&&x<R.x1-.3&&z>R.z0+.3&&z<R.z1-.3&&y<R.h-.3&&!inBld(x,z,y))break;}cx=t.x+(cx-t.x)*k;cz=t.z+(cz-t.z)*k;cy=Math.min(t.y+(cy-t.y)*k,R.h-.3);}else for(let k=1;k>.15;k-=.1){const x=t.x+(cx-t.x)*k,z=t.z+(cz-t.z)*k,y=t.y+(cy-t.y)*k;if(!inBld(x,z,y)){cx=x;cz=z;cy=y;break;}}
  if(!P.inside)cy=Math.max(cy,heightAt(cx,cz)+.7);const kk=1-Math.exp(-12*dt);camPos.set(cx,cy,cz);camera.position.lerp(camPos,kk);
  if(cam.shake>0){cam.shake-=dt;camera.position.x+=rnd(-1,1)*cam.shake;camera.position.y+=rnd(-1,1)*cam.shake*.6;}
  camera.lookAt(t.x,t.y+(P.aiming?.35:.6),t.z);
  sky.position.copy(camera.position);
  const L=tod.lightDir;sun.position.set(t.x+L.x*220,L.y*220,t.z+L.z*220);sun.target.position.set(t.x,0,t.z);sun.target.updateMatrixWorld();
}

/* ---------- HUD update ---------- */
let hudT=0,miniT=0,lightT=0,lastHUD='';
function hudUpdate(dt){
  hudT-=dt;miniT-=dt;if(promptT>0)promptT-=dt;
  hud.flash.style.opacity=flashT>0?Math.min(1,flashT*3):(P.hp<30?.35+Math.sin(time*6)*.15:0);if(flashT>0)flashT-=dt;
  if(miniT<=0){drawMini();miniT=1/15;}
  if(hudT>0)return;hudT=.1;
  const gt=gps.pts&&gps.name?`<i style="background:${gps.col}"></i>${gps.name} · ${gps.len>950?(gps.len/1000).toFixed(1)+' km':Math.round(gps.len/10)*10+' m'}`:'';if(hud.gps.innerHTML!==gt)hud.gps.innerHTML=gt;
  hud.cross.hidden=!(P.aiming||P.weapon!=='fist'&&!P.car&&!MOBILE);const wk=P.weapon+'|'+(save.ammo[P.weapon]|0);if(hud.fistEl.dataset.k!==wk){hud.fistEl.dataset.k=wk;hud.fistEl.innerHTML=P.weapon==='fist'?'<span class="e">✊</span>':'<span></span><b></b>';if(P.weapon!=='fist'){hud.fistEl.querySelector('span').textContent=TT(WEAP[P.weapon].n);hud.fistEl.querySelector('b').textContent=save.ammo[P.weapon]|0;}}
  const ck=clockText();if(hud.clock.textContent!==ck)hud.clock.textContent=ck;
  const f=lastFoe&&time-lastFoe.t<5&&npcs.includes(lastFoe.n)?lastFoe.n:null;hud.foe.hidden=!f;
  if(f){hud.foeN.textContent=f.mission?`Đối thủ ${mis?mis.wave:''}`:{ped:'Người đi đường',fighter:'Dân anh chị',cop:'Cảnh sát',guard:'Bảo vệ'}[f.kind]||'Đối thủ';hud.foeI.style.transform=`scaleX(${Math.max(0,f.hp)/(f.maxHp||100)})`;}
  const io=interactOption();const pr=promptT>0?promptTxt:io?`<kbd>${io.k}</kbd>${io.txt}`:'';
  let obj='';
  if(heist&&heist.stage==='escape')obj=stars>0?'Cắt đuôi cảnh sát để mang tiền về':'Mang <span>tiền nóng</span> về nhà an toàn (biểu tượng mái nhà)';
  else if(mis){const s=Math.max(0,Math.ceil(mis.left));if(mis.k==='deliver')obj=(mis.stage==='pickup'?'Lấy gói hàng ở <span>điểm vàng</span>':'Giao hàng tới <span>điểm vàng</span>')+` · ${s}s`;if(mis.k==='race')obj=`Đua: điểm <span>${mis.cp+1}/${mis.cps.length}</span> · ${s}s`;if(mis.k==='fight')obj=`Ẩu đả: hạ đối thủ <span>${mis.wave}/3</span> · ${s}s`;}
  else if(stars>0)obj='Thoát khỏi tầm nhìn cảnh sát';
  const key=[pr,obj,Math.round(save.money),P.dirty,stars,!!seenT,Math.round(P.hp),Math.round(save.armor),P.car?Math.round(Math.abs(P.car.vf)*3.6):-1,heist&&heist.stage==='vault'?Math.round(heist.prog*100):-1,tut.on?tut.step:-1].join('|');
  if(key===lastHUD)return;lastHUD=key;
  hud.prompt.innerHTML=pr;hud.obj.innerHTML=obj;hud.money.textContent=fmt$(save.money);hud.dirty.textContent=P.dirty?'Tiền nóng: '+fmt$(P.dirty):'';
  hud.stars.innerHTML=[0,1,2,3,4].map(i=>`<i class="${i<stars?'on':''}">★</i>`).join('');hud.stars.classList.toggle('blink',stars>0&&!seenT);
  hud.hp.style.transform=`scaleX(${Math.max(0,P.hp)/maxHp()})`;hud.armor.style.transform=`scaleX(${Math.max(0,save.armor)/100})`;hud.armor.parentNode.hidden=!(save.armor>0);hud.hp.style.background=P.hp<30?'#ef4444':'#4ade80';
  const sp=P.car?Math.round(Math.abs(P.car.vf)*3.6):-1;hud.speed.hidden=sp<0;if(sp>=0)hud.speed.innerHTML=`${sp}<small>km/h</small>`;
  hud.bar.hidden=!(heist&&heist.stage==='vault');if(heist&&heist.stage==='vault')hud.barI.style.width=Math.round(heist.prog*100)+'%';
  if(tut.on){const s=TUT[tut.step];hud.help.hidden=false;hud.help.querySelector('b').textContent=`Hướng dẫn ${tut.step+1}/${TUT.length} · ${s.t}`;hud.help.querySelector('div').textContent=s.d;}else hud.help.hidden=true;
}

/* ---------- main loop ---------- */
let raf=0,last=0,paused=true,dead=false;
function step(dt){
  time+=dt;
  playerUpdate(dt);
  for(const c of cars.slice()){if(c===P.car)continue;if(c.kind==='traffic')trafficAI(c,dt);else if(c.kind==='police'&&c.ai)policeAI(c,dt);else parkedPhysics(c,dt);
    const d=hyp(c.x-P.x,c.z-P.z);c.mesh.visible=d<Q.cull+30;if(c.kind==='traffic'&&d>Q.cull+50)removeCar(c);}
  carPairs();
  for(const n of npcs.slice())npcUpdate(n,dt);
  wantedUpdate(dt);heliUpdate(dt);heistUpdate(dt);missionUpdate(dt);tutUpdate(dt);gpsUpdate(dt);fxUpdate(dt);fwUpdate(dt);
  tod.hour=(tod.hour+dt/30)%24;todApply();weatherUpdate(dt);weatherApply();interiorLights();skyMat.uniforms.ct.value=time;tracerUpdate(dt);heliShoot(dt);lampUpdate(dt);
  if(cars.filter(c=>c.kind==='traffic').length<Q.traffic&&Math.random()<dt*2)spawnTraffic(true);
  if(npcs.filter(n=>n.kind==='ped').length<Q.peds&&Math.random()<dt*3)spawnPed();
  lightT-=dt;if(lightT<=0){paintLights(time);lightT=.25;}
  const on=Math.floor(time*5)%2===0;BAR.r.emissiveIntensity=on?4:.2;BAR.b.emissiveIntensity=on?.2:4;
  if(bag){bag.vel+=(-bag.swing*14-bag.vel*2.5)*dt;bag.swing+=bag.vel*dt;bag.piv.rotation.x=bag.swing;}
  // water waves
  if(Math.floor(time*20)%2===0){const pa=waterG.attributes.position;for(let i=0;i<pa.count;i++){const x=waterBase[i*3],z=waterBase[i*3+2];pa.array[i*3+1]=Math.sin(x*.06+time*1.3)*.35+Math.cos(z*.05+time*.9)*.3;}pa.needsUpdate=true;waterG.computeVertexNormals();}
}
let perfT=0,perfN=0,lowQ=false;
function adapt(raw){if(lowQ||paused)return;perfT+=raw;perfN++;if(perfT>4){const avg=perfT/perfN;perfT=0;perfN=0;if(avg>.045){lowQ=true;renderer.setPixelRatio(1);if(renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);}});}resize();}}}
function frame(now){raf=requestAnimationFrame(frame);const raw=(now-last)/1000||0;let dt=Math.max(0,Math.min(.05,raw));last=now;if(hitStop>0){hitStop-=dt;dt*=.12;}if(raw>0&&raw<1)adapt(raw);if(!paused&&!mapOpen&&!shopOpen)step(dt);camUpdate(dt);hudUpdate(dt);audioUpdate(dt);renderer.render(scene,camera);}
function resize(){const w=view.clientWidth||innerWidth,h=view.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',()=>{if(!view.closest('[hidden]'))resize();});
camera.position.set(P.x,4,P.z+7);
if(tut.on)banner('Chào mừng tới Nexus City','Làm theo hướng dẫn ở góc trên bên trái, hoặc bấm Bỏ qua');
else banner('Nexus City','Bấm M để mở bản đồ và chọn nơi muốn tới. Cột xanh lá giữa trung tâm là ngân hàng.');
const api={
  start(){paused=false;active=true;keys.clear();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);resize();},
  setPaused(p){paused=p;active=!p;keys.clear();cam.rmb=false;tb.block=false;if(p)radioStop();else{last=performance.now();if(P.car&&radio.idx>=0)radioPlay();}},
  stop(){cancelAnimationFrame(raf);active=false;paused=true;keys.clear();radioStop();writeSave();},
  resume(){active=true;paused=false;keys.clear();cam.rmb=false;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);resize();if(P.car&&radio.idx>=0)radioPlay();},
  resize,
  get save(){return save;},
  _dbg:{P,cars,npcs,get stars(){return stars;},set stars(v){stars=v;},startHeist,startMission,interact,toggleCar,playerPunch,get heist(){return heist;},set heistProg(v){if(heist)heist.prog=v;},SP,tut,toggleMap,bag,time:()=>time,scene,renderer,sun,step,info:()=>renderer.info.render,keys,camUpdate,camera,weather,ROOMS,openShop,closeShop,enterInterior,exitInterior,selectWeapon,fireWeapon,get shopOpen(){return shopOpen;},tod,todApply,gps,setWaypoint,clearWaypoint,planRoute,poiList,radio,radioNext,playerHitBy,get lastFoe(){return lastFoe;},cam,tb,render:()=>renderer.render(scene,camera)}
};
return api;
}
window.NexusCity2={create};
})();
