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
const L=(vi,en)=>(window.NexusI18n&&window.NexusI18n.lang==='en')?en:vi;const LL=L;
const TT=s=>(window.NexusI18n&&window.NexusI18n.t)?window.NexusI18n.t(s):s;
const lin=c=>new T.Color(c).convertSRGBToLinear();

/* ---------- city layout constants ---------- */
const CELL=64,N=14,HALF=N*CELL/2,RW=14,LANE=3.5,SW=4;
const road=i=>i*CELL-HALF;
const SAND0=HALF+RW/2,WATER=HALF+72;
const EXT={x0:-HALF-26,x1:WATER-3,z0:-HALF-26,z1:HALF+26};
/* west hills: terrain heights live in HGRID (built later); heightAt is 0 everywhere else */
EXT.z1=HALF+70;EXT.x1=WATER+18;
const HZ={x0:-800,x1:-456,z0:-110,z1:480};let HGRID=null;
const WL={x0:-1385,x1:-790,z0:-112,z1:440};
/* raised decks (harbour quay and piers) with their own floor height; hidden diamonds; the towns out in the country */
const PADS=[],DIAS=[],TOWNS=[];
/* the wilds north and west of the city: their own height grid; WA is the part the player may walk in */
const WZ={x0:-1500,x1:545,z0:-1700,z1:-110},WA={x0:-1300,x1:EXT.x1,z0:-1500,z1:-110},WILD={};let WGRID=null;
/* the airport sits on reclaimed land off the south beach; a causeway joins it to the city */
const AP={x0:-620,x1:660,z0:640,z1:1010,y:.35},CW={x0:-10.4,x1:10.4,z0:EXT.z1-14,z1:AP.z0+2},AREAS=[EXT,HZ,WA,AP,CW,WL];
function inAirport(x,z){return(x>AP.x0&&x<AP.x1&&z>AP.z0&&z<AP.z1)||(x>CW.x0&&x<CW.x1&&z>CW.z0&&z<CW.z1);}
function inHZ(x,z){return x<HZ.x1&&x>HZ.x0&&z>HZ.z0&&z<HZ.z1;}
function inWild(x,z){return x>WZ.x0&&x<WZ.x1&&z>WZ.z0&&z<WZ.z1&&!(x>EXT.x0&&z>EXT.z0);}
function inHills(x,z){return inHZ(x,z)||inWild(x,z);}
function onDock(x,z){const d=WILD.dock;return d&&x>d.x0&&x<d.x1&&z>d.z0&&z<d.z1;}
function heightAt(x,z){for(let i=0;i<PADS.length;i++){const p=PADS[i];if(x>p.x0&&x<p.x1&&z>p.z0&&z<p.z1)return p.y;}if(z>CW.z0&&inAirport(x,z))return AP.y;let G=null;if(inHZ(x,z))G=HGRID;else if(inWild(x,z)){G=WGRID;if(G&&onDock(x,z))return Math.max(WILD.dock.y,gridH(G,x,z));}return G?gridH(G,x,z):0;}
function gridH(G,x,z){const fx=(x-G.X0)/G.ST,fz=(z-G.Z0)/G.ST,ix=clamp(Math.floor(fx),0,G.NX-2),iz=clamp(Math.floor(fz),0,G.NZ-2),tx=fx-ix,tz=fz-iz,H=G.H,a=H[iz*G.NX+ix],b=H[iz*G.NX+ix+1],c=H[(iz+1)*G.NX+ix],d=H[(iz+1)*G.NX+ix+1];return(a*(1-tx)+b*tx)*(1-tz)+(c*(1-tx)+d*tx)*tz;}
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
/* rounded sidewalk slab: rounded-rectangle top plus curb sides */
const CRAD=3.2;
function inCut(b,x,z){const dx=Math.min(x-b.x0,b.x1-x),dz=Math.min(z-b.z0,b.z1-z);return dx<CRAD&&dz<CRAD&&hyp(CRAD-dx,CRAD-dz)>CRAD;}
function rslab(gb,x0,x1,z0,z1,y1,r){const pts=[],seg=5;for(const[cx,cz,a0]of[[x1-r,z1-r,0],[x0+r,z1-r,Math.PI/2],[x0+r,z0+r,Math.PI],[x1-r,z0+r,Math.PI*1.5]])for(let k=0;k<=seg;k++){const a=a0+k/seg*Math.PI/2;pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}
  const mx=(x0+x1)/2,mz=(z0+z1)/2,U=(x,z)=>[x/4,-z/4];let u=0;
  for(let k=0;k<pts.length;k++){const a=pts[k],b=pts[(k+1)%pts.length];gb.tri([mx,y1,mz],[b[0],y1,b[1]],[a[0],y1,a[1]],[0,1,0],[U(mx,mz),U(b[0],b[1]),U(a[0],a[1])]);
    const dx=b[0]-a[0],dz=b[1]-a[1],l=hyp(dx,dz);if(l<1e-4)continue;const n=[dz/l,0,-dx/l];gb.quad([b[0],0,b[1]],[a[0],0,a[1]],[a[0],y1,a[1]],[b[0],y1,b[1]],n,[[(u+l)/4,0],[u/4,0],[u/4,y1/4],[(u+l)/4,y1/4]]);u+=l;}}
/* a straight flat strip between two points (park paths) */
function dpath(gb,ax,az,bx,bz,w,y){const dx=bx-ax,dz=bz-az,l=hyp(dx,dz),nx=-dz/l*w/2,nz=dx/l*w/2;const v=[[ax-nx,y,az-nz],[bx-nx,y,bz-nz],[bx+nx,y,bz+nz],[ax+nx,y,az+nz]];
  const cr=(v[1][0]-v[0][0])*(v[3][2]-v[0][2])-(v[1][2]-v[0][2])*(v[3][0]-v[0][0]);const q=cr<0?v:[v[0],v[3],v[2],v[1]];gb.quad(q[0],q[1],q[2],q[3],[0,1,0],q.map(p=>[p[0]/4,-p[2]/4]));}
let seed2=7771;const sr2=(a,b)=>{seed2=(seed2*16807)%2147483647;return a+((seed2-1)/2147483646)*(b-a);};
function buildVC(parts){let tot=0;const arr=[];for(const p of parts){const g=p.geo.index?p.geo.toNonIndexed():p.geo.clone();_m4.compose(_v1.set(...(p.pos||[0,0,0])),_q.identity(),_v2.set(...(p.scale||[1,1,1])));g.applyMatrix4(_m4);arr.push([g,lin(p.color||'#ffffff')]);tot+=g.attributes.position.count;}
  const pos=new Float32Array(tot*3),nor=new Float32Array(tot*3),col=new Float32Array(tot*3),uv=new Float32Array(tot*2);let o=0;
  for(const[g,c]of arr){const n=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);for(let i=0;i<n;i++){col[(o+i)*3]=c.r;col[(o+i)*3+1]=c.g;col[(o+i)*3+2]=c.b;}o+=n;g.dispose();}
  const G=new T.BufferGeometry();G.setAttribute('position',new T.BufferAttribute(pos,3));G.setAttribute('normal',new T.BufferAttribute(nor,3));G.setAttribute('color',new T.BufferAttribute(col,3));G.setAttribute('uv',new T.BufferAttribute(uv,2));G.computeBoundingSphere();return G;}
/* ---------- canvas textures ---------- */
let MAXANISO=0;
function makeTex(w,h,draw,o){o=o||{};const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new T.CanvasTexture(c);if(o.repeat!==false)t.wrapS=t.wrapT=T.RepeatWrapping;if(o.srgb!==false)t.encoding=T.sRGBEncoding;t.anisotropy=o.aniso||4;if(MAXANISO)t.anisotropy=Math.min(t.anisotropy,MAXANISO);return t;}
function speckle(g,w,h,base,n,a){g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){const d=Math.random()<.5;g.fillStyle=d?`rgba(0,0,0,${Math.random()*a})`:`rgba(255,255,255,${Math.random()*a})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2.5,1+Math.random()*2.5);}}

/* ======================================================================= */
function create(opt){
const view=opt.view,root=opt.hudRoot,MOBILE=!!opt.mobile;
const Q={peds:MOBILE?16:34,traffic:MOBILE?16:34,shadows:!MOBILE,pr:MOBILE?1:Math.min(window.devicePixelRatio||1,1.5),cull:MOBILE?130:175,tex:MOBILE?256:512};

/* ---------- save ---------- */
const SAVE_KEY=opt.mode==='story'?'nexus-city2-story':'nexus-city2-save';
let save={money:500,char:'joseph',tutDone:false,bankCD:0,heists:0,hour:17,radio:0,outfit:'base',outfits:['base'],cap:false,capOwned:false,up:{str:0,hp:0,run:0},weapons:{},ammo:{pistol:0,smg:0,rifle:0},armor:0,garage:[],apt:false,lang:null};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s)Object.assign(save,s);else if(opt.mode==='story'){save.money=1500;save.tutDone=true;}}catch(_){}
save.up=Object.assign({str:0,hp:0,run:0},save.up);save.ammo=Object.assign({pistol:0,smg:0,rifle:0},save.ammo);save.weapons=save.weapons||{};save.garage=save.garage||[];save.outfits=save.outfits||['base'];
const maxHp=()=>100+50*(save.up.hp|0);
if(opt.char)save.char=opt.char;if(save.char==='minh'||!save.char)save.char='joseph';if(save.char==='vy')save.char='oscar';
function writeSave(){try{save.hour=Math.round(tod.hour*100)/100;}catch(_){}try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(_){}if(opt.mode==='story'){if(opt.onStory)opt.onStory(save);}else if(opt.onSave)opt.onSave(save);}

/* ---------- renderer, scene, sky ---------- */
const renderer=new T.WebGLRenderer({antialias:!MOBILE,powerPreference:'high-performance'});
renderer.setPixelRatio(Q.pr);MAXANISO=renderer.capabilities.getMaxAnisotropy()||4;
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
  walk:makeTex(512,512,(g,w,h)=>{speckle(g,w,h,'#bdb5a8',10000,.12);for(let i=0;i<26;i++){const x=Math.random()*w,y=Math.random()*h,r=6+Math.random()*26;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(60,50,40,.14)');gr.addColorStop(1,'rgba(60,50,40,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}g.strokeStyle='rgba(50,45,40,.25)';g.lineWidth=1;for(let i=0;i<10;i++){let x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);for(let k=0;k<6;k++){x+=rnd(-14,14);y+=rnd(-14,14);g.lineTo(x,y);}g.stroke();}g.strokeStyle='rgba(60,50,40,.28)';g.lineWidth=2;for(let x=0;x<=w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<=h;y+=64){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}}),
  grass:makeTex(512,512,(g,w,h)=>{speckle(g,w,h,'#5a8c3c',16000,.2);for(let i=0;i<60;i++){const x=Math.random()*w,y=Math.random()*h,r=10+Math.random()*50;const gr=g.createRadialGradient(x,y,0,x,y,r);const d=Math.random()<.5;gr.addColorStop(0,d?'rgba(120,100,60,.16)':'rgba(30,70,20,.16)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}g.strokeStyle='rgba(30,70,20,.35)';for(let i=0;i<1500;i++){const x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+rnd(-2,2),y-rnd(3,7));g.stroke();}g.strokeStyle='rgba(30,70,20,.35)';for(let i=0;i<500;i++){const x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+rnd(-2,2),y-rnd(3,7));g.stroke();}}),
  sand:makeTex(256,256,(g,w,h)=>speckle(g,w,h,'#e6cf9c',5000,.16)),
  gravel:makeTex(256,256,(g,w,h)=>speckle(g,w,h,'#6d6a66',6000,.25)),
  shingleRed:makeTex(256,256,(g,w,h)=>{g.fillStyle='#8a4b3a';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=16){for(let x=(y/16)%2?-16:0;x<w;x+=32){g.fillStyle=`rgb(${120+rnd(-14,14)|0},${62+rnd(-8,8)|0},${48+rnd(-6,6)|0})`;g.fillRect(x+1,y+1,30,14);}g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y+14,w,2);}}),
  shingleGrey:makeTex(256,256,(g,w,h)=>{g.fillStyle='#4b4f58';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=16){for(let x=(y/16)%2?-16:0;x<w;x+=32){const v=70+rnd(-10,10)|0;g.fillStyle=`rgb(${v},${v+4},${v+12})`;g.fillRect(x+1,y+1,30,14);}g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,y+14,w,2);}}),
  foliage:makeTex(256,256,(g,w,h)=>{g.fillStyle='#8a8a8a';g.fillRect(0,0,w,h);for(let i=0;i<1400;i++){const x=Math.random()*w,y=Math.random()*h,r=2+Math.random()*6,v=110+Math.random()*120|0;g.fillStyle=`rgb(${v},${v},${v})`;g.beginPath();g.ellipse(x,y,r,r*.6,Math.random()*3,0,7);g.fill();}for(let i=0;i<500;i++){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(Math.random()*w,Math.random()*h,2,2);}}),
  needles:makeTex(256,256,(g,w,h)=>{g.fillStyle='#7c7c7c';g.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const x=Math.random()*w,y=Math.random()*h,v=90+Math.random()*130|0;g.strokeStyle=`rgb(${v},${v},${v})`;g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+rnd(-3,3),y+rnd(4,9));g.stroke();}for(let y=0;y<h;y+=32){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(0,y,w,5);}}),
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
    if(style!=='glass'){for(let r=0;r<4;r++)for(let c=0;c<4;c++){const[wx,wy,ww,wh]=win,X=c*C+wx*C,Y=r*C+wy*C+wh*C,W=ww*C;for(let k=0;k<5;k++){const sx=X+Math.random()*W,len=C*(.15+Math.random()*.5);const gr=g.createLinearGradient(0,Y,0,Y+len);gr.addColorStop(0,'rgba(40,32,24,.22)');gr.addColorStop(1,'rgba(40,32,24,0)');g.fillStyle=gr;g.fillRect(sx,Y,1+Math.random()*2.5,len);}}
      for(let i=0;i<40;i++){const x=Math.random()*S,y=Math.random()*S,r=8+Math.random()*40;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(30,25,20,.06)');gr.addColorStop(1,'rgba(30,25,20,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}}
    else{for(let i=0;i<30;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*.05})`;g.fillRect(Math.random()*S,Math.random()*S,Math.random()*S*.4,1);}}
  },{aniso:16});
  const emi=makeTex(S,S,(g)=>{g.fillStyle='#000';g.fillRect(0,0,S,S);for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(lit[r*4+c]){const[wx,wy,ww,wh]=win,X=c*C+wx*C,Y=r*C+wy*C,W=ww*C,H=wh*C;const tint=pick(style==='glass'?['#a88050','#8a7450','#7f8ea8','#b08a58']:['#ffbf70','#ffd394','#ffe2b5','#f4a95c','#bcd6ff','#ffc98a']),k=rnd(.55,1);const gr=g.createLinearGradient(0,Y,0,Y+H);gr.addColorStop(0,tint);gr.addColorStop(1,shadeHex(tint,-38*k));g.globalAlpha=k;g.fillStyle=gr;g.fillRect(X,Y,W,H);const v=Math.random();g.fillStyle='rgba(0,0,0,.55)';if(v<.25){for(let y=Y+H*.06;y<Y+H*.6;y+=H*.09)g.fillRect(X,y,W,H*.035);}else if(v<.5){g.fillRect(X,Y,W*rnd(.2,.38),H);g.fillRect(X+W*rnd(.62,.8),Y,W,H);}else if(v<.62){g.fillRect(X+W*.3,Y+H*.45,W*.22,H*.55);g.beginPath();g.arc(X+W*.41,Y+H*.38,W*.08,0,7);g.fill();}g.globalAlpha=1;}});
  const fm=new T.MeshStandardMaterial({map,emissiveMap:emi,emissive:new T.Color(1,1,1),emissiveIntensity:style==='glass'?.5:.75,roughness:style==='glass'?(ENV_OK?.18:.4):.85,metalness:style==='glass'&&ENV_OK?.55:0,envMapIntensity:style==='glass'?1:.4});
  fm.userData.style=style;fm.userData.wall=p.wall||(style==='brick'?'#7d4535':p.frame);fm.userData.trim=p.trim;fm.userData.frame=p.frame;fm.userData.baseE=fm.emissiveIntensity;fm.userData.baseEnv=fm.envMapIntensity;NIGHTM.push(fm);return fm;
}
const NIGHTM=[];
const FAC={
  glassBlue:facade('glass',{frame:'#2a3340',span:'#1d242e',g1:'#a9c6dc',g2:'#2c4a66'}),
  glassTeal:facade('glass',{frame:'#22333a',span:'#16262b',g1:'#a6e0dc',g2:'#1f5a62'}),
  glassBronze:facade('glass',{frame:'#3a3028',span:'#2a221c',g1:'#e8c9a0',g2:'#5a4430'}),
  glassSilver:facade('glass',{frame:'#6a7078',span:'#4a5058',g1:'#dfe8ef',g2:'#62707e'}),
  aptPink:facade('apt',{wall:'#d8a596',trim:'#ece4d8',balcony:1}),
  aptMint:facade('apt',{wall:'#9fb5a4',trim:'#e6e8e0',balcony:1}),
  aptPeach:facade('apt',{wall:'#d9b48e',trim:'#efe4d2'}),
  aptCream:facade('apt',{wall:'#d6ccb6',trim:'#ede8de',balcony:1}),
  aptLav:facade('apt',{wall:'#aea6bd',trim:'#e9e6ee'}),
  decoPink:facade('deco',{wall:'#d9aab0',accent:'#3a8f8a'}),
  decoTeal:facade('deco',{wall:'#93bdb5',accent:'#c06a78'}),
  decoYellow:facade('deco',{wall:'#dcc58e',accent:'#3f6f9e'}),
  decoWhite:facade('deco',{wall:'#ddd8cc',accent:'#c8704f'}),
  brick:facade('brick',{trim:'#2a2a2a'}),
  houseWhite:facade('house',{wall:'#e0dbd0',trim:'#f0ede6',shutter:'#3d5a80'}),
  houseBlue:facade('house',{wall:'#8faabf',trim:'#ecebe6',shutter:'#2b3a55'}),
  houseYellow:facade('house',{wall:'#d8c38a',trim:'#efe9dc',shutter:'#6b4a2b'}),
  houseSage:facade('house',{wall:'#a4b39a',trim:'#ecebe4',shutter:'#44523a'}),
  stone:facade('stone',{wall:'#cdbf9f',trim:'#e2d8c4'}),
  white:facade('stone',{wall:'#d6d6d2',trim:'#e8e8e4'}),
  policeBlue:facade('apt',{wall:'#3f63a8',trim:'#e9eef8'})
};
/* ---------- foliage: alpha-tested leaf cards (much fuller and softer than solid blobs) ---------- */
const LEAFTX=makeTex(256,256,(g,w,h)=>{g.clearRect(0,0,w,h);
  for(let i=0;i<340;i++){const a=Math.random()*Math.PI*2,rr=Math.sqrt(Math.random())*112,x=128+Math.cos(a)*rr,y=128+Math.sin(a)*rr*.92,l=5+Math.random()*9,v=150+Math.random()*95|0;
    g.save();g.translate(x,y);g.rotate(Math.random()*Math.PI);g.fillStyle=`rgb(${v*.82|0},${v},${v*.7|0})`;g.beginPath();g.ellipse(0,0,l,l*.48,0,0,7);g.fill();g.strokeStyle='rgba(40,60,30,.35)';g.lineWidth=1;g.beginPath();g.moveTo(-l,0);g.lineTo(l,0);g.stroke();g.restore();}
  g.fillStyle='#ffffff';g.fillRect(0,236,20,20);},{repeat:false});
const NEEDLETX=makeTex(256,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#8a7a60';g.lineWidth=3;g.beginPath();g.moveTo(4,h/2);g.lineTo(w-6,h/2);g.stroke();
  for(let x=6;x<w-8;x+=2.2){const t=x/w,len=(1-t*.7)*h*.46*(.75+Math.random()*.35);for(const s of[-1,1]){const v=140+Math.random()*90|0;g.strokeStyle=`rgb(${v*.8|0},${v},${v*.85|0})`;g.lineWidth=1.3;g.beginPath();g.moveTo(x,h/2);g.lineTo(x+len*.55,h/2+s*len);g.stroke();}}
  g.fillStyle='#ffffff';g.fillRect(0,h-12,12,12);},{repeat:false});
const FOLIAGE=(tex)=>{const m=new T.MeshStandardMaterial({map:tex,alphaTest:.45,vertexColors:true,roughness:.92});m.userData.depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:tex,alphaTest:.45});return m;};
const LEAFM=FOLIAGE(LEAFTX),NEEDLEM=FOLIAGE(NEEDLETX);let PINEG=null,BROADG2=null;
function folBuilder(){const P=[],N=[],U=[],C=[];const col=new T.Color();
  return{P,N,U,C,
    card(cx,cy,cz,ax,ay,az,bx,by,bz,nx,ny,nz,u0,u1,v0,v1,hex,k){col.copy(lin(hex)).multiplyScalar(k||1);
      const v=[[cx-ax-bx,cy-ay-by,cz-az-bz,u0,v0],[cx+ax-bx,cy+ay-by,cz+az-bz,u1,v0],[cx+ax+bx,cy+ay+by,cz+az+bz,u1,v1],[cx-ax+bx,cy-ay+by,cz-az+bz,u0,v1]];
      for(const i of[0,1,2,0,2,3,0,2,1,0,3,2]){const q=v[i];P.push(q[0],q[1],q[2]);N.push(nx,ny,nz);U.push(q[3],q[4]);C.push(col.r,col.g,col.b);}},
    solid(geo,hex,uv){const g=geo.index?geo.toNonIndexed():geo;const p=g.attributes.position.array,n=g.attributes.normal.array;col.copy(lin(hex));for(let i=0;i<p.length/3;i++){P.push(p[i*3],p[i*3+1],p[i*3+2]);N.push(n[i*3],n[i*3+1],n[i*3+2]);U.push(uv[0],uv[1]);C.push(col.r,col.g,col.b);}},
    geo(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.computeBoundingSphere();return g;}};}
// broadleaf tree: trunk + a few branches + ~30 leaf cards spread through an ellipsoid crown, normals pointing out of the crown
function broadleafGeo(o){o=o||{};let s=o.seed||7;const r=()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};
  const B=folBuilder(),cy=o.cy||4.3,R=o.r||2.1,H=o.h||1.7,n=o.n||(MOBILE?20:32),hex=o.color||'#5f9a45';
  B.solid(new T.CylinderGeometry(.13,.24,cy+.2,7).translate(0,(cy+.2)/2,0),'#5e4430',[.03,.03]);
  for(let k=0;k<3;k++){const a=k/3*Math.PI*2+.4,br=new T.CylinderGeometry(.05,.09,1.6,5).translate(0,.8,0).rotateZ(.7).rotateY(a).translate(0,cy-.9,0);B.solid(br,'#5e4430',[.03,.03]);}
  for(let i=0;i<n;i++){const th=r()*Math.PI*2,ph=Math.acos(1-2*r()),rr=Math.pow(r(),.45);const dx=Math.sin(ph)*Math.cos(th),dy=Math.cos(ph),dz=Math.sin(ph)*Math.sin(th);
    const px=dx*R*rr*.85,py=cy+dy*H*rr*.85,pz=dz*R*rr*.85;const sz=(1.1+r()*.7)*(R/2.1);
    // random card orientation
    const a1=r()*Math.PI*2,a2=(r()-.5)*Math.PI;const ax=Math.cos(a1)*Math.cos(a2)*sz/2,ay=Math.sin(a2)*sz/2,az=Math.sin(a1)*Math.cos(a2)*sz/2;
    let bx=-Math.sin(a1)*sz/2,by=(r()-.5)*sz*.6,bz=Math.cos(a1)*sz/2;
    const nl=Math.hypot(dx,dy*1.2+.25,dz)||1,shade=.62+.48*rr+(dy>0?.12:0);B.card(px,py,pz,ax,ay,az,bx,by,bz,dx/nl,(dy*1.2+.25)/nl,dz/nl,.1,.9,.1,.9,hex,shade);}
  return B.geo();}
// conifer: tiers of drooping branch cards around a tall trunk
function coniferGeo(o){o=o||{};let s=o.seed||11;const r=()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};
  const B=folBuilder(),Ht=o.h||9.6,R0=o.r||3.0,hex=o.color||'#557f4c';
  B.solid(new T.CylinderGeometry(.09,.3,Ht,7).translate(0,Ht/2,0),'#4e3a2a',[.02,.05]);
  const tiers=MOBILE?9:14;for(let t=0;t<tiers;t++){const k=t/(tiers-1),y=1.5+k*(Ht-2.1),R=R0*(1-k*.88)+.3,nb=Math.max(5,Math.round((MOBILE?9:13)-k*7));
    for(let j=0;j<nb;j++){const a=j/nb*Math.PI*2+t*.7+r()*.3,ca=Math.cos(a),sa=Math.sin(a),droop=.35+r()*.2;
      const len=R*(.95+r()*.3),wid=len*.62;const ex=ca*len/2,ey=-Math.sin(droop)*len/2,ez=sa*len/2;const cx=ex,cy=y+ey,cz=ez;
      const bx=-sa*wid/2,bz=ca*wid/2;const shade=.7+.45*(1-k*.3)*(.85+r()*.3);
      B.card(cx,cy,cz,ex,ey,ez,bx,0,bz,ca*.35,.94,sa*.35,.06,.98,.06,.94,hex,shade);}}
  // a small spike at the top
  B.card(0,Ht+.2,0,0,.7,0,.35,0,0,0,0,1,.06,.98,.06,.94,hex,1.1);B.card(0,Ht+.2,0,0,.7,0,0,0,.35,1,0,0,.06,.98,.06,.94,hex,1.1);
  return B.geo();}
function instFol(geo,m,list,fn){const im=inst(geo,m,list,fn,true);if(im){im.customDepthMaterial=m.userData.depth;im.frustumCulled=false;}return im;}

/* ---------- grass tufts around the player on the hills and in the wilds (one instanced mesh, recycled as you move) ---------- */
const GRASSTX=makeTex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<70;i++){const x=6+Math.random()*(w-12),ht=h*(.45+Math.random()*.55),lean=(Math.random()-.5)*26,v=120+Math.random()*110|0;
  const gr=g.createLinearGradient(0,h,0,h-ht);gr.addColorStop(0,`rgb(${v*.62|0},${v*.8|0},${v*.45|0})`);gr.addColorStop(1,`rgb(${v*.88|0},${v},${v*.6|0})`);g.fillStyle=gr;g.beginPath();g.moveTo(x-2.2,h);g.quadraticCurveTo(x+lean*.4,h-ht*.6,x+lean,h-ht);g.quadraticCurveTo(x+lean*.4+1,h-ht*.6,x+2.2,h);g.fill();}},{repeat:false});
const GRASS=(()=>{if(MOBILE)return null;const CELL=1.05,RAD=30,NC=Math.ceil(RAD*2/CELL),COUNT=NC*NC;
  const q=[];for(let k=0;k<3;k++){const a=k/3*Math.PI;const ca=Math.cos(a)*.55,sa=Math.sin(a)*.55;q.push([-ca,0,-sa,0,0],[ca,0,sa,1,0],[ca,.42,sa,1,1],[-ca,0,-sa,0,0],[ca,.42,sa,1,1],[-ca,.42,-sa,0,1],[-ca,0,-sa,0,0],[ca,.42,sa,1,1],[ca,0,sa,1,0],[-ca,0,-sa,0,0],[-ca,.42,-sa,0,1],[ca,.42,sa,1,1]);}
  const P=[],N=[],U=[];for(const v of q){P.push(v[0],v[1],v[2]);N.push(0,1,0);U.push(v[3],v[4]);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('normal',new T.Float32BufferAttribute(N,3));geo.setAttribute('uv',new T.Float32BufferAttribute(U,2));
  const m=new T.MeshStandardMaterial({map:GRASSTX,alphaTest:.4,color:lin('#8fb26a'),roughness:1});
  const im=new T.InstancedMesh(geo,m,COUNT);im.frustumCulled=false;im.receiveShadow=Q.shadows;im.count=0;scene.add(im);
  const hsh=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};const dm=new T.Object3D();let lx=1e9,lz=1e9;
  return{update(px,pz){if(Math.abs(px-lx)<3&&Math.abs(pz-lz)<3)return;lx=px;lz=pz;let n=0;const ix0=Math.floor((px-RAD)/CELL),iz0=Math.floor((pz-RAD)/CELL);const RR=(HZ.road||[]).filter(p=>Math.abs(p[0]-px)<RAD+8&&Math.abs(p[1]-pz)<RAD+8);
      for(let a=0;a<NC;a++)for(let b=0;b<NC;b++){const ix=ix0+a,iz=iz0+b,r1=hsh(ix,iz),r2=hsh(iz,ix);const x=(ix+r1)*CELL,z=(iz+r2)*CELL;if((x-px)*(x-px)+(z-pz)*(z-pz)>RAD*RAD)continue;
        if(!inHills(x,z)||TOWNS.some(t=>hyp(x-t.x,z-t.z)<t.r*.6)||PADS.some(p=>x>p.x0-1&&x<p.x1+1&&z>p.z0-1&&z<p.z1+1))continue;if(RR.length&&inHZ(x,z)&&RR.some(p=>(p[0]-x)*(p[0]-x)+(p[1]-z)*(p[1]-z)<20))continue;const y=heightAt(x,z);if(y<.35)continue;if(inWild(x,z)&&WGRID&&WGRID.RD){const G=WGRID,gx=Math.round((x-G.X0)/G.ST),gz=Math.round((z-G.Z0)/G.ST);if(gx>=0&&gz>=0&&gx<G.NX&&gz<G.NZ&&G.RD[gz*G.NX+gx]<7)continue;}
        const s=.75+hsh(ix*3,iz*7)*.6;dm.position.set(x,y-.04,z);dm.rotation.set(0,r1*6.28,0);dm.scale.set(s,s*(.8+r2*.6),s);dm.updateMatrix();im.setMatrixAt(n++,dm.matrix);}
      im.count=n;im.instanceMatrix.needsUpdate=true;}};})();

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
  if(x<2500){const ins=(qx,qz)=>AREAS.some(a=>qx>=a.x0&&qx<=a.x1&&qz>=a.z0&&qz<=a.z1);
    if(!(ins(x-r,z)&&ins(x+r,z)&&ins(x,z-r)&&ins(x,z+r))){let bd=1e9,bp=null;for(const a of AREAS){const cx=clamp(x,a.x0+r,a.x1-r),cz=clamp(z,a.z0+r,a.z1-r),d=hyp(cx-x,cz-z);if(d<bd){bd=d;bp=[cx-x,cz-z];}}if(bp){px+=bp[0];pz+=bp[1];hit=true;}}
    const LK=WILD.lake;if(LK&&!onDock(x,z)){const dx=x-LK.x,dz=z-LK.z,d=hyp(dx,dz),Rr=LK.r-2+r;if(d<Rr&&d>1e-6){px+=dx/d*(Rr-d);pz+=dz/d*(Rr-d);hit=true;}}}
  return hit?[px,pz]:null;}
function inBld(x,z,y){let r=false;query(x,z,0,c=>{if(!r&&c.t==='b'&&x>c.x0-.3&&x<c.x1+.3&&z>c.z0-.3&&z<c.z1+.3&&(y===undefined||y<c.h+.6))r=true;});return r;}
function los(x0,z0,x1,z1){const n=Math.ceil(hyp(x1-x0,z1-z0)/3);for(let i=1;i<n;i++){const t=i/n;if(inBld(x0+(x1-x0)*t,z0+(z1-z0)*t,4))return false;}return true;}

/* ---------- build the city ---------- */
let seed=20261123;const sr=(a,b)=>{seed=(seed*16807)%2147483647;return a+((seed-1)/2147483646)*(b-a);};const spick=a=>a[Math.floor(sr(0,a.length-.001))];
const blocks=[];for(let i=0;i<N;i++)for(let j=0;j<N;j++)blocks.push({i,j,x0:road(i)+RW/2,x1:road(i+1)-RW/2,z0:road(j)+RW/2,z1:road(j+1)-RW/2,d:district(i,j)});
const BK=(i,j)=>blocks[i*N+j];
/* ---------- architectural detail: floor ledges, cornices, plinths, corner pilasters, parapets, glass fins, roof plant ---------- */
const BLD=[];
function wrapGB(gb,k){const ob=gb.box.bind(gb);gb.box=(x0,x1,y0,y1,z0,z1,o)=>{ob(x0,x1,y0,y1,z0,z1,o);if(!(o&&o.top===null)&&y1-y0>4.5)BLD.push({k,x0,x1,y0,y1,z0,z1});};return gb;}
function buildDetails(){if(!BLD.length)return;
  let rs=9137;const r=(a,b)=>{rs=(rs*16807)%2147483647;return a+((rs-1)/2147483646)*(b-a);};
  const P=[],N=[],C=[],I=[];const col=new T.Color();
  const face=(a,b,c,d,n)=>{const o=P.length/3;for(const v of[a,b,c,d]){P.push(v[0],v[1],v[2]);N.push(n[0],n[1],n[2]);C.push(col.r,col.g,col.b);}I.push(o,o+1,o+2,o,o+2,o+3);};
  const box=(x0,x1,y0,y1,z0,z1,hex,noTop)=>{col.copy(lin(hex));
    face([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1]);face([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1]);
    face([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0]);face([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0]);
    if(!noTop)face([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0]);face([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0]);};
  // a ring of four boxes hugging the walls (dx = outward depth)
  const band=(b,y0,y1,dx,hex)=>{box(b.x0-dx,b.x1+dx,y0,y1,b.z1,b.z1+dx,hex);box(b.x0-dx,b.x1+dx,y0,y1,b.z0-dx,b.z0,hex);box(b.x1,b.x1+dx,y0,y1,b.z0,b.z1,hex);box(b.x0-dx,b.x0,y0,y1,b.z0,b.z1,hex);};
  const covered=b=>BLD.some(o=>o!==b&&o.y0>=b.y1-.3&&o.x0<b.x1&&o.x1>b.x0&&o.z0<b.z1&&o.z1>b.z0);
  const lite=MOBILE;
  for(const b of BLD){const m=FAC[b.k];if(!m)continue;const st=m.userData.style,wall=m.userData.wall||'#cccccc',trim=m.userData.trim||shadeHex(wall,12),dark=shadeHex(wall,-22);const W=b.x1-b.x0,D=b.z1-b.z0,H=b.y1-b.y0,top=!covered(b);
    if(st==='glass'){const fin=m.userData.frame||'#2a3340';
      if(!lite){for(const[ax,len]of[['x',W],['z',D]]){const n=Math.max(1,Math.round(len/BAY));for(let i=0;i<=n;i++){const t=i/n;if(ax==='x'){const x=b.x0+W*t;box(x-.05,x+.05,b.y0,b.y1,b.z1,b.z1+.22,fin,true);box(x-.05,x+.05,b.y0,b.y1,b.z0-.22,b.z0,fin,true);}else{const z=b.z0+D*t;box(b.x1,b.x1+.22,b.y0,b.y1,z-.05,z+.05,fin,true);box(b.x0-.22,b.x0,b.y0,b.y1,z-.05,z+.05,fin,true);}}}}
      if(b.y0<1)band(b,b.y0,b.y0+4.2,.12,shadeHex(fin,-10));
      if(top){band(b,b.y1,b.y1+.9,.06,fin);if(W>8&&D>8){const pw=W*r(.3,.45),pd=D*r(.3,.45),cx=(b.x0+b.x1)/2+r(-1,1),cz=(b.z0+b.z1)/2+r(-1,1);box(cx-pw/2,cx+pw/2,b.y1,b.y1+r(3,4.5),cz-pd/2,cz+pd/2,'#8d939a');
          box(cx-pw/2+.5,cx-pw/2+1.6,b.y1,b.y1+r(4.5,6),cz+pd/2+.6,cz+pd/2+1.7,'#7a8088');}}
      continue;}
    // masonry styles
    const floors=Math.round(H/FLOOR);
    if(b.y0<1)band(b,b.y0,b.y0+.75,.04,dark);// plinth
    const every=lite?2:1;for(let y=Math.ceil((b.y0+1)/FLOOR)*FLOOR;y<b.y1-1.2;y+=FLOOR*every)band(b,y-.09,y+.07,.05,trim);
    if(st==='deco'||st==='stone'||st==='brick'){const pw=.55,pd=.12,hex=st==='brick'?'#6a3a2c':trim;for(const[x,z,sx,sz]of[[b.x0,b.z0,-1,-1],[b.x1,b.z0,1,-1],[b.x0,b.z1,-1,1],[b.x1,b.z1,1,1]]){box(Math.min(x,x-sx*pw+sx*pd),Math.max(x,x-sx*pw+sx*pd),b.y0,b.y1,Math.min(z,z-sz*pw+sz*pd),Math.max(z,z-sz*pw+sz*pd),hex,true);}}
    if(top){band(b,b.y1-.55,b.y1+.05,.32,trim);band(b,b.y1+.05,b.y1+.95,.0001,trim);// cornice + parapet (inside face)
      box(b.x0+.2,b.x1-.2,b.y1,b.y1+.95,b.z1-.25,b.z1,trim);box(b.x0+.2,b.x1-.2,b.y1,b.y1+.95,b.z0,b.z0+.25,trim);box(b.x1-.25,b.x1,b.y1,b.y1+.95,b.z0,b.z1,trim);box(b.x0,b.x0+.25,b.y1,b.y1+.95,b.z0,b.z1,trim);
      if(W>7&&D>7){const sx=r(b.x0+1.5,b.x1-4.5),sz=r(b.z0+1.5,b.z1-4.5);box(sx,sx+3,b.y1,b.y1+2.6,sz,sz+3,shadeHex(wall,-8));// stair hut
        if(!lite)for(let k=0;k<2;k++){const vx=r(b.x0+1,b.x1-1.5),vz=r(b.z0+1,b.z1-1.5);box(vx,vx+.35,b.y1,b.y1+r(.8,1.6),vz,vz+.35,'#6e7176');}}}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.setIndex(I);g.computeBoundingSphere();
  const me=addMesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.82}),true);me.frustumCulled=false;BLD.length=0;}

const FB={};for(const k in FAC)FB[k]=wrapGB(new GB(),k);
const RB=new GB(),SWB=new GB(),GRB=new GB(),PKB=new GB(),SHB={red:new GB(),grey:new GB()},DRB=new GB();
const props={lamp:[],palm:[],tank:[],ac:[],hedge:[],bench:[],door:[],column:[],tl:[],tree:[],hydrant:[],bin:[],mail:[],board:[],flood:[]};
const spots={parking:[],parkedPolice:[],driveway:[],display:[]};
const SP={shops:[]},GDOORS=[];
function gdoor(x,z,h,room,w,ht,col){// a door on a building facade that leads into one of the shared interiors
  const fx=Math.sin(h),fz=Math.cos(h);if(Math.abs(fz)>.5)props.door.push([x,.25,z+fz*.05,w||2,ht||2.8,.12,col||'#2a3038']);else props.door.push([x+fx*.05,.25,z,.12,ht||2.8,w||2,col||'#2a3038']);
  GDOORS.push({id:'d'+GDOORS.length,x:x+fx*1.4,z:z+fz*1.4,h,room});}
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
  rslab(SWB,b.x0,b.x1,b.z0,b.z1,.25,CRAD);
  const ix0=b.x0+SW,ix1=b.x1-SW,iz0=b.z0+SW,iz1=b.z1-SW,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
  // street lamps along the curb
  for(const s of[0,1,2,3])for(let k=1;k<=2;k++){const t=k/3;let x,z;if(s===0){x=b.x0+(b.x1-b.x0)*t;z=b.z0+.9;}else if(s===1){x=b.x0+(b.x1-b.x0)*t;z=b.z1-.9;}else if(s===2){x=b.x0+.9;z=b.z0+(b.z1-b.z0)*t;}else{x=b.x1-.9;z=b.z0+(b.z1-b.z0)*t;}props.lamp.push([x,z,s,addCol({t:'c',x,z,r:.2})]);}
  const d=b.d;
  // street furniture: hydrants and bins near the curb, street trees on calmer blocks
  if(d!=='beach'){for(let k=0;k<2;k++){const s=sr(0,1),side=Math.floor(sr(0,3.99));const t=.15+s*.7;let x,z;if(side===0){x=b.x0+(b.x1-b.x0)*t;z=b.z0+.7;}else if(side===1){x=b.x0+(b.x1-b.x0)*t;z=b.z1-.7;}else if(side===2){x=b.x0+.7;z=b.z0+(b.z1-b.z0)*t;}else{x=b.x1-.7;z=b.z0+(b.z1-b.z0)*t;}
    const L=k?props.bin:props.hydrant,col=addCol({t:'c',x,z,r:.3});col.smash={k:k?'bin':'hyd',i:L.length};L.push([x,z,side]);}}
  // more street trees, benches and mailboxes along the sidewalk (own random stream so the rest of the city stays put)
  if(d!=='beach'&&d!=='park'&&d!=='industrial'&&d!=='stadium'){const at=(s,t,ins)=>s===0?[b.x0+(b.x1-b.x0)*t,b.z0+ins]:s===1?[b.x0+(b.x1-b.x0)*t,b.z1-ins]:s===2?[b.x0+ins,b.z0+(b.z1-b.z0)*t]:[b.x1-ins,b.z0+(b.z1-b.z0)*t];
    const free=(x,z,r)=>!props.hydrant.some(p=>hyp(p[0]-x,p[1]-z)<r)&&!props.bin.some(p=>hyp(p[0]-x,p[1]-z)<r);
    for(const s of[0,1,2,3]){for(const t of[.2,.8]){if(sr2(0,1)<.7){const[x,z]=at(s,t,1.3);if(free(x,z,1.6)){props.tree.push([x,z,sr2(.75,1.05)]);addCol({t:'c',x,z,r:.3});}}}
      if(sr2(0,1)<.45){const[x,z]=at(s,.42,1.25);if(free(x,z,1.6)){props.bench.push([x,z,s<2?0:Math.PI/2]);addCol({t:'c',x,z,r:.5});}}
      if(sr2(0,1)<.3){const[x,z]=at(s,.58,.75);if(free(x,z,1.2)){const col=addCol({t:'c',x,z,r:.3});col.smash={k:'mail',i:props.mail.length};props.mail.push([x,z,s]);}}}}
  if(d==='mid'||d==='res'||d==='hospital'||d==='police'||d==='tube'||d==='school'){for(const s of[0,1,2,3])for(const t of[.5]){let x,z;if(s===0){x=b.x0+(b.x1-b.x0)*t;z=b.z0+1.3;}else if(s===1){x=b.x0+(b.x1-b.x0)*t;z=b.z1-1.3;}else if(s===2){x=b.x0+1.3;z=b.z0+(b.z1-b.z0)*t;}else{x=b.x1-1.3;z=b.z0+(b.z1-b.z0)*t;}if(sr(0,1)<.75){props.tree.push([x,z,sr(.8,1.15)]);addCol({t:'c',x,z,r:.3});}}}
  if(d==='downtown'){
    const split=sr(0,1)<.5;const parts=split?[[ix0,(ix0+ix1)/2-1,iz0,iz1],[(ix0+ix1)/2+1,ix1,iz0,iz1]]:[[ix0,ix1,iz0,iz1]];
    for(const[x0,x1,z0,z1]of parts){const m=1.5;const h=Math.round(sr(42,118)/FLOOR)*FLOOR;const key=spick(['glassBlue','glassTeal','glassBronze','glassSilver']);
      let a0=x0+m,a1=x1-m,c0=z0+m,c1=z1-m,y=.25;const tiers=h>70?3:2;gdoor((a0+a1)/2,c1,0,'office',3.2,3.4,'#22323f');
      for(let t=0;t<tiers;t++){const th=t===tiers-1?h-(y-.25):Math.round(h*(t===0?.55:.27)/FLOOR)*FLOOR;FB[key].box(a0,a1,y,y+th,c0,c1,{top:RB,uo:sr(0,1)});if(t===0)colB(a0,a1,c0,c1,h);y+=th;const ins=Math.min(a1-a0,c1-c0)*.11;a0+=ins;a1-=ins;c0+=ins;c1-=ins;}
      for(let k=0;k<3;k++)props.ac.push([sr(a0+1,a1-1),y,sr(c0+1,c1-1)]);
      if(sr(0,1)<.6&&a1-a0>9)props.board.push([a0,a1,c0,c1,y,Math.floor(sr(0,3.99))]);
    }
  }else if(d==='mid'){
    const L=(ix1-ix0)/2;
    for(let a=0;a<2;a++)for(let c=0;c<2;c++){const x0=ix0+a*L,z0=iz0+c*L;
      if(sr(0,1)<.16){PKB.flat(x0+.5,x0+L-.5,.27,z0+.5,z0+L-.5,6);spots.parking.push([x0+L/2,z0+L/2]);continue;}
      const s=[sr(.8,2.2),sr(.8,2.2),sr(.8,2.2),sr(.8,2.2)],h=Math.round(sr(10,30)/FLOOR)*FLOOR;const key=spick(['aptPink','aptMint','aptPeach','aptCream','aptLav']);
      const a0=x0+s[0],a1=x0+L-s[1],c0=z0+s[2],c1=z0+L-s[3];FB[key].box(a0,a1,.25,.25+h,c0,c1,{top:RB,uo:sr(0,1)});colB(a0,a1,c0,c1,h);gdoor((a0+a1)/2,c?c1:c0,c?0:Math.PI,'flat',1.8,2.6,'#5a3d28');
      if(sr(0,1)<.6)props.tank.push([(a0+a1)/2+sr(-2,2),.25+h,(c0+c1)/2+sr(-2,2)]);}
  }else if(d==='beach'){
    const L=(iz1-iz0)/2;
    for(let c=0;c<2;c++){const z0=iz0+c*L+1.5,z1=iz0+(c+1)*L-1.5,x0=ix0+2,x1=ix1-1;const h=Math.round(sr(11,24)/FLOOR)*FLOOR;const key=spick(['decoPink','decoTeal','decoYellow','decoWhite']);
      FB[key].box(x0,x1,.25,.25+h,z0,z1,{top:RB,uo:sr(0,1)});colB(x0,x1,z0,z1,h);
      const nm=spick(['OCEAN','FLAMINGO','PALMS','SUNSET','CORAL','MARINA','BREEZE','TROPIC','LUNA','SEAGLASS']),col=spick(['#ff5fa2','#3ef0e0','#ffd166','#b48cff']);
      shieldSigns.push([nm,x1+.06,.25+h-2.2,(z0+z1)/2,Math.PI/2,Math.min(12,z1-z0-2),2.6,{fg:col,glow:col,size:80}]);if(b.i===N-1&&b.j===9&&c===0){SP.apt={x:x0-1.6,z:(z0+z1)/2};props.door.push([x0-.05,.25,(z0+z1)/2,.12,2.6,1.6,'#2a9d8f']);}else gdoor(x0,(z0+z1)/2,-Math.PI/2,'hotel',2.6,3,'#2a3a48');}
    for(let z=b.z0+4;z<b.z1-2;z+=9)props.palm.push([b.x1-1.6,z]);
  }else if(d==='industrial'){
    const x0=ix0+1,x1=ix1-1,z0=iz0+1,z1=iz1-(sr(0,1)<.5?12:1);const h=sr(8,13);FB.brick.box(x0,x1,.25,.25+h,z0,z1,{top:RB,uo:sr(0,1)});colB(x0,x1,z0,z1,h);gdoor((x0+x1)/2,z1,0,'ware',3.6,3.6,'#5a5f66');
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
      if(b.i===1&&b.j===10&&row===0&&k===1)SP.house={door:hs.door,x:hs.cx,z:hs.fz,bag:{x:hs.cx-3.2,z:iz0+2.6}};else GDOORS.push({id:'d'+GDOORS.length,x:hs.door.x,z:hs.door.z,h:face>0?0:Math.PI,room:'flat'});
    }
  }else if(d==='park'){
    GRB.flat(ix0,ix1,.26,iz0,iz1,6);SWB.flat(cx-1.6,cx+1.6,.27,iz0,iz1,4);SWB.flat(ix0,ix1,.272,cz-1.6,cz+1.6,4);
    dpath(SWB,ix0+.5,iz0+.5,ix1-.5,iz1-.5,2.4,.274);dpath(SWB,ix0+.5,iz1-.5,ix1-.5,iz0+.5,2.4,.276);
    const pW=ix1-ix0,pH=iz1-iz0,dDiag=(x,z)=>{const u=(x-ix0)/pW,v=(z-iz0)/pH;return Math.min(Math.abs(u-v),Math.abs(u+v-1))*Math.min(pW,pH)/1.414;};
    for(let k=0;k<9;k++){const x=sr(ix0+3,ix1-3),z=sr(iz0+3,iz1-3);if(Math.abs(x-cx)<4||Math.abs(z-cz)<4||dDiag(x,z)<3)continue;props.palm.push([x,z]);}
    for(let k=0;k<12;k++){const x=sr(ix0+3,ix1-3),z=sr(iz0+3,iz1-3);if(Math.abs(x-cx)<5||Math.abs(z-cz)<5||dDiag(x,z)<3.5||props.palm.some(p=>hyp(p[0]-x,p[1]-z)<4))continue;props.tree.push([x,z,sr(1,1.5)]);addCol({t:'c',x,z,r:.4});}
    for(let k=0,n=0;k<60&&n<16;k++){const x=sr2(ix0+2.5,ix1-2.5),z=sr2(iz0+2.5,iz1-2.5);if(Math.abs(x-cx)<4.5||Math.abs(z-cz)<4.5||dDiag(x,z)<3.4||props.tree.some(p=>hyp(p[0]-x,p[1]-z)<5)||props.palm.some(p=>hyp(p[0]-x,p[1]-z)<4))continue;n++;
      if(sr2(0,1)<.3)props.palm.push([x,z]);else{props.tree.push([x,z,sr2(.9,1.45)]);addCol({t:'c',x,z,r:.4});}}
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
    SP.police={x:cx,z:iz1+1.5};SP.policeDoor={x:cx,z:z1+1.4};props.door.push([cx,.25,z1+.05,2.4,3,.12,'#1b2433']);
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
      if(sr(0,1)<.5)props.ac.push([x+w/2,h,(z0+z1)/2]);props.door.push([x+w/2,.25,fz+s*.04,1.6,2.4,.1,spick(['#3b3b3b','#6b4428','#28536b'])]);GDOORS.push({id:'d'+GDOORS.length,x:x+w/2,z:fz+s*1.3,h:row?0:Math.PI,room:'flat'});x+=w;}}
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
  G.flat(-1600,cx1,-.05,-1700,cz0,20);G.flat(-1600,cx0,-.05,cz0,RZ0,20);G.flat(-1600,cx0,-.05,RZ1,cz1,20);
  const ggr=addMesh(G.geo(),new T.MeshStandardMaterial({map:TX.grass,color:lin('#9fb08a'),roughness:1}),false);
  for(let j=0;j<=N;j++)R.flat(cx0,SAND0,0,road(j)-RW/2,road(j)+RW/2,14);
  for(let i=0;i<=N;i++)for(let s=0;s<N;s++)R.flat(road(i)-RW/2,road(i)+RW/2,0,road(s)+RW/2,road(s+1)-RW/2,14);
  for(const b of blocks)if(b.d!=='river')for(const[ax,az]of[[b.x0,b.z0],[b.x1-CRAD,b.z0],[b.x0,b.z1-CRAD],[b.x1-CRAD,b.z1-CRAD]])R.flat(ax,ax+CRAD,0,az,az+CRAD,14);
  addMesh(R.geo(),ASPH=new T.MeshStandardMaterial({map:TX.asphalt,roughness:.92}),false);
  addCol({t:'b',x0:EXT.x0-5,x1:cx0+.4,z0:RZ0,z1:RZ1,h:.3});addCol({t:'b',x0:SAND0-.4,x1:EXT.x1+5,z0:RZ0,z1:RZ1,h:.3});}
// meshes for static city
function addMesh(geo,m,cast){const me=new T.Mesh(geo,m);me.castShadow=!!cast&&Q.shadows;me.receiveShadow=Q.shadows;scene.add(me);return me;}
/* ---------- the sea (east and south) and curved beaches ---------- */
const shoreE=z=>WATER+8+16*Math.sin(z*.011+.7)+8*Math.sin(z*.029+2.1)+28*Math.exp(-Math.pow((z+HALF-96)/80,2));
const shoreS=x=>HALF+64+14*Math.sin(x*.012+1.3)+7*Math.sin(x*.033);
const CZ1=road(N)+RW/2;
/* sand height: dry and level near the city, sloping under the water past the shore */
function beachH(x,z){const dE=x-shoreE(z),dS=x<SAND0+30?z-shoreS(x):-1e9,d=Math.max(dE,dS);
  const rE=x>=SAND0?clamp((x-SAND0)/6,0,1):0,rS=z>=CZ1?clamp((z-CZ1)/6,0,1):0,dry=.02+.23*Math.max(rE,rS);return Math.max(-3,dry-Math.max(0,d+10)*.055);}
/* one water grid shaped like an L: everything east of the beach plus everything south of the city */
const WST=MOBILE?48:24,WX0=-1600,WX1=WATER+1400,WZ0=-1700,WZ1=2000,WNX=Math.round((WX1-WX0)/WST)+1,WNZ=Math.round((WZ1-WZ0)/WST)+1;
const waterG=new T.BufferGeometry();
{const pos=[],idx=[];for(let iz=0;iz<WNZ;iz++)for(let ix=0;ix<WNX;ix++)pos.push(WX0+ix*WST,0,WZ0+iz*WST);
  const wet=(x,z)=>x>WATER+88||z>HALF+148||beachH(x,z)<.05,sea=(x,z)=>(z>RZ0-2&&z<RZ1+2&&x>SAND0-1&&z<CZ1)||((x>SAND0+4||z>CZ1+4)&&(wet(x-WST/2,z-WST/2)||wet(x+WST/2,z-WST/2)||wet(x-WST/2,z+WST/2)||wet(x+WST/2,z+WST/2)));
  for(let iz=0;iz<WNZ-1;iz++)for(let ix=0;ix<WNX-1;ix++){const x=WX0+(ix+.5)*WST,z=WZ0+(iz+.5)*WST;if(!sea(x,z))continue;const a=iz*WNX+ix,b=a+1,c=a+WNX,d=c+1;idx.push(a,c,b,b,c,d);}
  waterG.setAttribute('position',new T.Float32BufferAttribute(pos,3));waterG.setIndex(idx);waterG.computeVertexNormals();waterG.computeBoundingSphere();}
const water=new T.Mesh(waterG,new T.MeshStandardMaterial({color:lin('#1d7f99'),roughness:.12,metalness:.25,envMapIntensity:1.1,transparent:true,opacity:.95}));water.position.set(0,.02,0);water.receiveShadow=Q.shadows;water.frustumCulled=false;scene.add(water);
const waterBase=Float32Array.from(waterG.attributes.position.array);
/* beach mesh: east strip and south strip, wet sand darker near the waterline; the river mouth stays open */
{const pos=[],uv=[],col=[],idx=[];const dry=new T.Color('#ffffff'),wet=new T.Color('#b39673'),cc=new T.Color();
  const grid=(x0,x1,z0,z1,st,skip)=>{const nx=Math.round((x1-x0)/st)+1,nz=Math.round((z1-z0)/st)+1,o=pos.length/3;
    for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const x=x0+ix*st,z=z0+iz*st,y=beachH(x,z);pos.push(x,y,z);uv.push(x/6,z/6);cc.copy(dry).lerp(wet,clamp((.32-y)/.3,0,1));col.push(cc.r,cc.g,cc.b);}
    for(let iz=0;iz<nz-1;iz++)for(let ix=0;ix<nx-1;ix++){const z=z0+(iz+.5)*st;if(skip&&skip(z))continue;const a=o+iz*nx+ix,b=a+1,c=a+nx,d=c+1;idx.push(a,c,b,b,c,d);}};
  grid(SAND0,WATER+90,-1700,CZ1,3,z=>z>RZ0-1&&z<RZ1+1);
  grid(-1600,WATER+90,CZ1,HALF+150,3);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();
  const m=addMesh(g,new T.MeshStandardMaterial({map:TX.sand,vertexColors:true,roughness:1}),false);m.frustumCulled=false;}
/* foam: a soft white band along the waterline that breathes in and out */
const foamTex=makeTex(256,64,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<900;i++){const y=h*.5+(Math.random()-.5)*h*.8*Math.random();g.fillStyle=`rgba(255,255,255,${.15+Math.random()*.5})`;g.fillRect(Math.random()*w,y,2+Math.random()*7,1+Math.random()*2);}
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
const foamMat=new T.MeshBasicMaterial({map:foamTex,transparent:true,opacity:.6,depthWrite:false,fog:true,polygonOffset:true,polygonOffsetFactor:-3});
{const gb=new GB(),W=2.6;let u=0;const line=[];
  for(let z=-1700;z<CZ1;z+=4){if(z>RZ0-6&&z<RZ1+6){if(line.length){addFoam(line);line.length=0;}continue;}line.push([shoreE(z)-8.2,z]);}
  for(let x=shoreE(CZ1)-8.2;x>-1600;x-=4)line.push([x,shoreS(x)-8.2]);
  addFoam(line);
  function addFoam(L){for(let k=0;k<L.length-1;k++){const a=L[k],b=L[k+1],tx=b[0]-a[0],tz=b[1]-a[1],l=hyp(tx,tz)||1,nx=-tz/l*W,nz=tx/l*W;const y=.2;
      const v=[[a[0]-nx,y,a[1]-nz],[b[0]-nx,y,b[1]-nz],[b[0]+nx,y,b[1]+nz],[a[0]+nx,y,a[1]+nz]];const cr=(v[1][0]-v[0][0])*(v[3][2]-v[0][2])-(v[1][2]-v[0][2])*(v[3][0]-v[0][0]);const q=cr<0?v:[v[0],v[3],v[2],v[1]];
      const u0=u/12,u1=(u+l)/12;gb.quad(q[0],q[1],q[2],q[3],[0,1,0],cr<0?[[u0,0],[u1,0],[u1,1],[u0,1]]:[[u0,0],[u0,1],[u1,1],[u1,0]]);u+=l;}}
  const m=new T.Mesh(gb.geo(),foamMat);m.frustumCulled=false;m.renderOrder=2;scene.add(m);}
function foamUpdate(){foamTex.offset.y=Math.sin(time*.9)*.18;foamTex.offset.x+=.0006;foamMat.opacity=.42+.22*Math.sin(time*.9+1);}
addMesh(SWB.geo(),new T.MeshStandardMaterial({map:TX.walk,roughness:.9}),false);
addMesh(GRB.geo(),new T.MeshStandardMaterial({map:TX.grass,roughness:1}),false);
if(PKB.p.length)addMesh(PKB.geo(),new T.MeshStandardMaterial({map:TX.asphalt,roughness:.95}),false);
if(DRB.p.length)addMesh(DRB.geo(),new T.MeshStandardMaterial({map:TX.walk,roughness:.9}),false);
for(const k in FB)if(FB[k].p.length)addMesh(FB[k].geo(),FAC[k],true);buildDetails();
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
  const dg=new T.BoxGeometry(1,1,1);dg.translate(0,.5,0);if(props.door.length){const parts=[];for(const p of props.door){parts.push({geo:dg,pos:[p[0],p[1],p[2]],scale:[p[3],p[4],p[5]],color:p[6]});const tx=p[3]>p[5];parts.push({geo:dg,pos:[p[0],p[1]+p[4],p[2]],scale:[tx?p[3]+.3:p[3]+.02,.14,tx?p[5]+.02:p[5]+.3],color:'#d8d2c4'});}const m=new T.Mesh(buildVC(parts),new T.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.1}));m.castShadow=false;m.receiveShadow=Q.shadows;scene.add(m);}}
/* ---------- west hills: real terrain with a winding mountain road up to a lookout ---------- */
{const X0=HZ.x0,Z0=HZ.z0,ST=4,NX=Math.round((HZ.x1-X0)/ST)+1,NZ=Math.round((HZ.z1-Z0)/ST)+1;
  const ss=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  const nz=(x,z)=>Math.sin(x*.021+z*.013)*.5+Math.sin(x*.047-z*.039+1.3)*.3+Math.sin(x*.11+z*.09+2.1)*.12;
  const mask=(x,z)=>ss(HZ.x1,HZ.x1-70,x)*ss(HZ.x0,HZ.x0+50,x)*ss(HZ.z0,HZ.z0+60,z)*ss(HZ.z1,HZ.z1-45,z);
  const PCX=-694,PCZ=184;let TOPH=60;
  const nat=(x,z)=>{const d=hyp(x-PCX,z-PCZ);const k=Math.pow(Math.max(0,1-d/340),1.3);return mask(x,z)*((TOPH+2)*k+5*nz(x,z)*Math.min(1,d/60)+3*nz(z*1.7,x*1.3));};
  /* road centre line: Catmull-Rom through hand-placed points, resampled every 2 m */
  const CP=[[-452,128],[-472,128],[-520,131],[-572,150],[-607,196],[-614,256],[-592,307],[-548,338],[-516,378],[-528,423],[-586,446],[-656,442],[-712,408],[-744,348],[-748,282],[-728,218],[-694,184]];
  const raw=[];for(let k=0;k<CP.length-1;k++){const p0=CP[Math.max(0,k-1)],p1=CP[k],p2=CP[k+1],p3=CP[Math.min(CP.length-1,k+2)];
    for(let t=0;t<1;t+=1/40){const t2=t*t,t3=t2*t;raw.push([.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
  raw.push(CP[CP.length-1]);
  const RP=[raw[0]];let acc=0;for(let k=1;k<raw.length;k++){const a=raw[k-1],b=raw[k],l=hyp(b[0]-a[0],b[1]-a[1]);acc+=l;if(acc>=2){RP.push(b);acc=0;}}
  const n=RP.length,DS=2;
  /* road heights follow the hill, smoothed, with a 9 % grade limit; flat where it meets the city */
  /* road climbs evenly from the city to the summit: at most about 9 % in the steepest part */
  TOPH=Math.min(62,(n-16)*DS*.09/1.5);const h=RP.map((p,i)=>{const u=clamp((i-15)/(n-16),0,1);return TOPH*u*u*(3-2*u);});
  const TOP=h[n-1],PC=RP[n-1],PR=17;
  /* height grid: natural hill, blended into the road band and the lookout plaza */
  const HG=new Float32Array(NX*NZ),RW2=5,BL=16;
  for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){const x=X0+ix*ST,z=Z0+iz*ST;let v=nat(x,z),bd=1e9,bh=0;
    let bi=0;for(let i=0;i<n;i+=1){const dx=x-RP[i][0],dz=z-RP[i][1],d2=dx*dx+dz*dz;if(d2<bd){bd=d2;bi=i;}}bh=h[bi];
    for(const j of[bi-1,bi]){if(j<0||j>=n-1)continue;const ax=RP[j][0],az=RP[j][1],ex=RP[j+1][0]-ax,ez=RP[j+1][1]-az,L2=ex*ex+ez*ez||1,t=clamp(((x-ax)*ex+(z-az)*ez)/L2,0,1),qx=ax+ex*t-x,qz=az+ez*t-z,d2=qx*qx+qz*qz;if(d2<=bd){bd=d2;bh=h[j]+(h[j+1]-h[j])*t;}}
    const d=Math.sqrt(bd),reach=RW2+1.5+Math.max(10,Math.abs(v-bh)*1.8);if(d<reach){const w=1-ss(RW2+1.5,reach,d);v=v*(1-w)+bh*w;}
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
    instFol(PINEG||(PINEG=coniferGeo({seed:11})),NEEDLEM,trees,pl);}
  HZ.road=RP;HZ.roadH=h;}
/* ===== the wilds: terrain + roads (pure math, no three.js) ===== */
function wildBuild(ST,EXTX0,EXTZ0){
  const WX0=-1500,WX1=545,WZ0=-1700,WZ1=-110;
  const X0=WX0,Z0=WZ0,NX=Math.round((WX1-X0)/ST)+1,NZ=Math.round((WZ1-Z0)/ST)+1;
  const cl=(v,a,b)=>v<a?a:v>b?b:v,hy=Math.hypot;
  const ss=(a,b,v)=>{const t=cl((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  const nz=(x,z)=>Math.sin(x*.013+z*.009)*.5+Math.sin(x*.031-z*.027+1.3)*.3+Math.sin(x*.071+z*.063+2.1)*.15+Math.sin(x*.17-z*.15)*.05;
  const bump=(x,z,cx,cz,r)=>{const t=hy(x-cx,z-cz)/r;return t>=1?0:(1-t*t)*(1-t*t);};
  const cityD=(x,z)=>hy(Math.max(0,EXTX0-x),Math.max(0,EXTZ0-z));
  const PL={lake:{x:-230,z:-930,r:95},village:{x:-640,z:-720,r:80},camp:{x:150,z:-1080,r:22},summit:{x:-520,z:-1330,r:15},mine:{x:-985,z:-985,r:16},farm:{x:-900,z:-600},meadow:{x:-40,z:-570},forest:{x:190,z:-800},oldq:{x:-375,z:-612,r:95},harbor:{x:385,z:-655,r:105},highland:{x:-540,z:-1050,r:92},minetown:{x:-1030,z:-800,r:84}};
  const nat0=(x,z)=>{const dc=cityD(x,z),u=cl(dc/650,0,1);
    let v=3+24*u*u+(5+11*u)*nz(x,z);
    v+=30*ss(-1100,-1420,z)*(.75+.25*nz(x*1.7,z*1.3));
    v+=48*bump(x,z,PL.summit.x,PL.summit.z,300)+78*bump(x,z,-1090,-1110,240)+70*bump(x,z,270,-1330,230)+26*bump(x,z,200,-790,170)+18*bump(x,z,-420,-560,150);
    v+=160*Math.max(ss(-1290,-1480,x),ss(-1490,-1680,z));
    v*=ss(0,80,dc)*ss(-110,-175,z)*ss(445,385,x);
    return Math.max(.04,v);};
  const L=PL.lake;{let m=1e9;for(let a=0;a<6.28;a+=.2)m=Math.min(m,nat0(L.x+Math.cos(a)*(L.r+25),L.z+Math.sin(a)*(L.r+25)));L.y=Math.round(Math.min(nat0(L.x,L.z),m)-2);}
  PL.farm.r=75;const flats=[[PL.village,90,40],[PL.camp,22,25],[PL.mine,16,18],[PL.farm,75,40],[PL.oldq,95,50],[PL.harbor,105,40],[PL.highland,92,50],[PL.minetown,84,45]];for(const[p]of flats)p.y=nat0(p.x,p.z);PL.harbor.y=1.2;PL.oldq.y=5;
  /* ---- roads: Catmull-Rom through hand-placed points, resampled every 2 m ---- */
  const spline=CP=>{const raw=[];for(let k=0;k<CP.length-1;k++){const p0=CP[Math.max(0,k-1)],p1=CP[k],p2=CP[k+1],p3=CP[Math.min(CP.length-1,k+2)];
      for(let t=0;t<1;t+=1/60){const t2=t*t,t3=t2*t;raw.push([.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
    raw.push(CP[CP.length-1]);const RP=[raw[0]];let acc=0;for(let k=1;k<raw.length;k++){const a=raw[k-1],b=raw[k];acc+=hy(b[0]-a[0],b[1]-a[1]);if(acc>=2){RP.push(b);acc=0;}}return RP;};
  const flatAt=(x,z,v)=>{for(const[p,r,f]of flats){const d=hy(x-p.x,z-p.z);if(d<r+f){const w=1-ss(r,r+f,d);v=v*(1-w)+p.y*w;}}return v;};
  const profile=(RP,h0,h1,g)=>{const n=RP.length;let h=RP.map(p=>flatAt(p[0],p[1],nat0(p[0],p[1])));
    for(let it=0;it<6;it++){const o=h.slice();for(let i=0;i<n;i++){let s=0,c=0;for(let j=Math.max(0,i-10);j<=Math.min(n-1,i+10);j++){s+=o[j];c++;}h[i]=s/c;}}
    if(h0!=null)for(let i=0;i<Math.min(n,14);i++)h[i]=h0;if(h1!=null)h[n-1]=h1;
    const G=g*2;for(let rep=0;rep<3;rep++){for(let i=1;i<n;i++)h[i]=cl(h[i],h[i-1]-G,h[i-1]+G);for(let i=n-2;i>=0;i--)h[i]=cl(h[i],h[i+1]-G,h[i+1]+G);if(h0!=null)for(let i=0;i<Math.min(n,14);i++)h[i]=h0;}
    for(let it=0;it<3;it++){const o=h.slice();for(let i=1;i<n-1;i++)h[i]=(o[i-1]+o[i]*2+o[i+1])/4;if(h0!=null)for(let i=0;i<Math.min(n,14);i++)h[i]=h0;}
    return h;};
  const R1=spline([[0,-452],[0,-492],[4,-540],[-18,-610],[-78,-676],[-160,-728],[-262,-768],[-382,-772],[-500,-748],[-590,-726],[-640,-720],[-700,-728],[-790,-768],[-858,-846],[-890,-938],[-870,-1030],[-800,-1100],[-720,-1130],[-640,-1110],[-580,-1150],[-620,-1200],[-700,-1215],[-740,-1260],[-700,-1300],[-630,-1300],[-580,-1340],[-540,-1336]]);
  const R2=spline([[-172,-736],[-200,-786],[-232,-812],[-178,-828],[-112,-848],[-62,-898],[-2,-958],[58,-1006],[106,-1046],[138,-1068]]);
  const h1=profile(R1,0,null,.15);
  /* branch starts on the main road: take its height there */
  let jb=0,jd=1e9;R1.forEach((p,i)=>{const d=hy(p[0]-R2[0][0],p[1]-R2[0][1]);if(d<jd){jd=d;jb=i;}});
  const h2=profile(R2,null,null,.11);{const d=h1[jb]-h2[0];for(let i=0;i<R2.length;i++){const w=Math.max(0,1-i/40);h2[i]+=d*w;}}
  PL.summit.y=h1[h1.length-1];PL.camp.y=h2[h2.length-1]*.5+PL.camp.y*.5;
  /* more roads: to the harbour and the old quarter straight out of the city, and branches off the main road to the highland town and the mining town */
  const R3=spline([[384,-452],[384,-492],[386,-540],[390,-580],[392,-620],[392,-680],[392,-740],[384,-770]]),h3=profile(R3,0,null,.12);
  const R6=spline([[-256,-452],[-256,-492],[-258,-536],[-262,-572],[-282,-596],[-320,-600],[-380,-600],[-450,-600],[-500,-618],[-545,-655],[-582,-698],[-600,-722]]),h6=profile(R6,0,null,.12);
  const branch=(P,g)=>{let pj=0,pd=1e9;R1.forEach((p,i)=>{const d=hy(p[0]-P[0][0],p[1]-P[0][1]);if(d<pd){pd=d;pj=i;}});const h=profile(P,null,null,g),d=h1[pj]-h[0];for(let i=0;i<P.length;i++){const w=Math.max(0,1-i/40);h[i]+=d*w;}return{P,h,par:0,pj};};
  const B4=branch(spline([[-640,-1112],[-614,-1080],[-588,-1056],[-556,-1048],[-500,-1048],[-440,-1048],[-392,-1056]]),.12);
  const B7=branch(spline([[-858,-846],[-905,-828],[-950,-808],[-990,-800],[-1050,-800],[-1110,-800],[-1150,-800]]),.12);
  const roads=[{P:R1,h:h1,kind:'asph',gate:[0,-440]},{P:R2,h:h2,kind:'gravel',par:0,pj:jb},{P:R3,h:h3,kind:'asph',gate:[384,-440]},{P:R6,h:h6,kind:'asph',gate:[-256,-440]},Object.assign(B4,{kind:'asph'}),Object.assign(B7,{kind:'gravel'})];
  /* ---- nearest-road distance and road height per grid cell (rasterised, 2 m samples) ---- */
  const RD=new Float32Array(NX*NZ).fill(1e9),RH=new Float32Array(NX*NZ),RM=48;
  for(const r of roads)for(let i=0;i<r.P.length;i++){const[px,pz]=r.P[i],ix0=Math.max(0,Math.floor((px-RM-X0)/ST)),ix1=Math.min(NX-1,Math.ceil((px+RM-X0)/ST)),iz0=Math.max(0,Math.floor((pz-RM-Z0)/ST)),iz1=Math.min(NZ-1,Math.ceil((pz+RM-Z0)/ST));
    for(let iz=iz0;iz<=iz1;iz++)for(let ix=ix0;ix<=ix1;ix++){const d=hy(X0+ix*ST-px,Z0+iz*ST-pz),k=iz*NX+ix;if(d<RD[k]){RD[k]=d;RH[k]=r.h[i];}}}
  const SUMR=PL.summit.r;
  const H=new Float32Array(NX*NZ);
  for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){const x=X0+ix*ST,z=Z0+iz*ST,k=iz*NX+ix;let v=nat0(x,z);
    // lake bowl, a rim around it, a little island, and a cliff on the north shore for the waterfall
    const dl=hy(x-L.x,z-L.z);if(dl<L.r)v=L.y-1.4-7*(1-(dl/L.r)**2)+Math.max(0,5.5*bump(x,z,L.x+32,L.z+14,15));else if(dl<L.r+45){const w=ss(L.r,L.r+45,dl);v=(L.y+.7)*(1-w)+v*w;}
    const cf=(L.y+36)*ss(L.z-L.r+1,L.z-L.r-11,z)*(1-ss(28,68,Math.abs(x-L.x)));if(dl>L.r-2)v=Math.max(v,cf);
    v=flatAt(x,z,v);
    // the river keeps flowing west through its own valley
    if(x<EXTX0+2){const dzr=Math.max(RZ0-z,z-RZ1);if(dzr<16)v=dzr<=0?-3:-3*(1-ss(0,16,dzr))+v*ss(0,16,dzr);}
    // rock face behind the old mine portal
    {const M=PL.mine,ux=-105/163.4,uz=-125/163.4,ex=M.x+ux*13,ez=M.z+uz*13,dm=(x-ex)*ux+(z-ez)*uz,lat=Math.abs((x-ex)*uz-(z-ez)*ux);if(dm>-1&&lat<16)v=Math.max(v,M.y+Math.min(14,(dm+1)*3.2)*(1-ss(9,16,lat)));}
    const ds=hy(x-PL.summit.x,z-PL.summit.z);if(ds<330)v=Math.min(v,PL.summit.y+1+Math.max(0,ds-SUMR)*.075+Math.max(0,ds-200)*.5);if(ds<SUMR+22){const w=1-ss(SUMR,SUMR+22,ds);v=v*(1-w)+PL.summit.y*w;}
    const d=RD[k];if(d<RM){const bh=RH[k],reach=Math.min(RM,10+Math.max(9,Math.abs(v-bh)*1.5));if(d<reach){const w=1-ss(8,reach,d);v=v*(1-w)+bh*w;}}
    H[k]=Math.max(-12,v);}
  const G={X0,Z0,ST,NX,NZ,H,RD};
  return{G,roads,PL,nat0,ss,nz,bump,jb,WX0,WX1,WZ0,WZ1};}
/* ---------- the wilds north and west of the city: meadow, pine forest, a lake with a waterfall, a village with farms,
   a campsite, an old mine, a lighthouse and a mountain summit, joined by a country road ---------- */
{const glowTex0=()=>makeTex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,230,190,1)');r.addColorStop(.3,'rgba(255,170,80,.5)');r.addColorStop(1,'rgba(255,120,40,0)');g.fillStyle=r;g.fillRect(0,0,64,64);},{repeat:false});
  const W=wildBuild(MOBILE?8:6,EXT.x0,EXT.z0),G=W.G,PL=W.PL,ss=W.ss,nz=W.nz;WGRID=G;
  Object.assign(WILD,{PL,roads:W.roads,jb:W.jb,lake:PL.lake,gems:[],places:[],anim:{}});
  /* West Nexus: a new town on the flat land south of the river, reached by an avenue out of the city's west side */
  {const poly=CP=>{const o=[];for(let k=0;k<CP.length-1;k++){const a=CP[k],b=CP[k+1],l=hyp(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.round(l/2));for(let t=0;t<n;t++)o.push([a[0]+(b[0]-a[0])*t/n,a[1]+(b[1]-a[1])*t/n]);}o.push(CP[CP.length-1]);return o;};
    const hh=P=>P.map(p=>Math.max(.02,heightAt(p[0],p[1])));const R=W.roads,add=(CP,o)=>{const P=poly(CP);const r=Object.assign({P,h:hh(P),kind:'asph',urban:true,w:5.5},o);if(r.par!=null){let pj=0,pd=1e9;R[r.par].P.forEach((p,i)=>{const d=hyp(p[0]-P[0][0],p[1]-P[0][1]);if(d<pd){pd=d;pj=i;}});r.pj=pj;}R.push(r);return R.length-1;};
    const r5=add([[-452,-102],[-560,-102],[-700,-102],[-790,-102],[-840,-92],[-872,-60],[-880,0],[-880,150]],{gate:[-440,-102],urban:false,w:4.6});
    const av=add([[-880,150],[-980,150],[-1080,150],[-1200,150],[-1330,150]],{par:r5});
    add([[-1080,150],[-1080,60],[-1080,-30],[-1080,-85]],{par:av});const so=add([[-1080,150],[-1080,240],[-1080,330],[-1080,420]],{par:av});
    add([[-1080,330],[-980,330],[-900,330]],{par:so});add([[-1200,150],[-1200,60],[-1200,-30]],{par:av});add([[-1200,150],[-1200,250],[-1200,330]],{par:av});}
  const L=PL.lake,{X0,Z0,ST,NX,NZ,H,RD}=G;
  const rng=(()=>{let s=4242;return()=>{s=(s*16807)%2147483647;return s/2147483647;};})();
  const rdAt=(x,z)=>{const ix=clamp(Math.round((x-X0)/ST),0,NX-1),iz=clamp(Math.round((z-Z0)/ST),0,NZ-1);return RD[iz*NX+ix];};
  const inCity=(x,z)=>x>EXT.x0-4&&z>EXT.z0-4;
  /* ---- terrain mesh: grass, wildflowers in the meadow, dark forest floor, rock on steep slopes, snow up high, mud round the lake ---- */
  {const n=NX*NZ,pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2),col=new Float32Array(n*3),c=new T.Color();
    const gA=new T.Color('#8fae6c'),gB=new T.Color('#5d7f43'),fl=new T.Color('#d8cf63'),fw=new T.Color('#e9e4d6'),forest=new T.Color('#4a6a36'),rock=new T.Color('#8a8378'),snow=new T.Color('#f2f4f6'),mud=new T.Color('#7d6b52'),dirt=new T.Color('#a08a64');
    for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){const k=iz*NX+ix,x=X0+ix*ST,z=Z0+iz*ST,y=H[k];pos[k*3]=x;pos[k*3+1]=y;pos[k*3+2]=z;uv[k*2]=x/6;uv[k*2+1]=z/6;
      const hx=H[iz*NX+Math.min(NX-1,ix+1)]-H[iz*NX+Math.max(0,ix-1)],hz=H[Math.min(NZ-1,iz+1)*NX+ix]-H[Math.max(0,iz-1)*NX+ix],l=Math.hypot(hx,2*ST,hz);nor[k*3]=-hx/l;nor[k*3+1]=2*ST/l;nor[k*3+2]=-hz/l;
      const slope=1-2*ST/l,nn=nz(x*2.3,z*2.3);c.copy(gA).lerp(gB,clamp(.5+nn,0,1));
      const city=Math.hypot(Math.max(0,EXT.x0-x),Math.max(0,EXT.z0-z));
      if(city<260&&nz(x*5.1,z*4.7)>.55)c.lerp(nz(x*3,z*7)>0?fl:fw,.55);
      if(city>230)c.lerp(forest,clamp((city-230)/200,0,.6)*clamp(.6+nz(x*.7,z*.9),0,1));
      c.lerp(rock,clamp((slope-.18)*3.2,0,1));if(y>92)c.lerp(snow,clamp((y-92)/18,0,1)*clamp(1-(slope-.35)*2,0,1));
      const dl=Math.hypot(x-L.x,z-L.z);if(dl<L.r+5)c.lerp(mud,clamp((L.r+5-dl)/6,0,1));{const M=PL.mine,dm=Math.hypot(x-(M.x-8.4),z-(M.z-10));if(dm<24)c.lerp(rock,clamp((24-dm)/8,0,.85));}if(RD[k]<11)c.lerp(dirt,.45);
      col[k*3]=c.r;col[k*3+1]=c.g;col[k*3+2]=c.b;}
    const idx=[];for(let iz=0;iz<NZ-1;iz++)for(let ix=0;ix<NX-1;ix++){const x=X0+(ix+.5)*ST,z=Z0+(iz+.5)*ST;if(inCity(x,z)||x>452)continue;const a=iz*NX+ix,b=a+1,cc=a+NX,d=cc+1;idx.push(a,cc,b,b,cc,d);}
    const tg=new T.BufferGeometry();tg.setAttribute('position',new T.BufferAttribute(pos,3));tg.setAttribute('normal',new T.BufferAttribute(nor,3));tg.setAttribute('uv',new T.BufferAttribute(uv,2));tg.setAttribute('color',new T.BufferAttribute(col,3));tg.setIndex(idx);tg.computeBoundingSphere();
    const tm=addMesh(tg,new T.MeshStandardMaterial({map:TX.grass,vertexColors:true,roughness:1}),false);tm.receiveShadow=Q.shadows;}
  /* ---- roads: asphalt main road with lines and reflector posts, gravel road to the lake and the campsite ---- */
  const posts=[];
  W.roads.forEach((r,ri)=>{const RP=r.P,h=r.h,n=RP.length,DS=2,AS=r.kind!=='gravel',Wd=r.w||(AS?4.4:3.6);
    const side=(i,off)=>{const a=RP[Math.max(0,i-1)],b=RP[Math.min(n-1,i+1)],tx=b[0]-a[0],tz=b[1]-a[1],l=hyp(tx,tz)||1;return[RP[i][0]+(-tz/l)*off,RP[i][1]+(tx/l)*off];};
    const strip=(gb,o0,o1,dy,ts,from,to,every)=>{for(let i=from;i<to;i++){if(every&&Math.floor(i/every)%2)continue;const y0=h[i]+dy,y1=h[i+1]+dy,a0=side(i,o0),a1=side(i,o1),b0=side(i+1,o0),b1=side(i+1,o1);
      const v=[[a0[0],y0,a0[1]],[a1[0],y0,a1[1]],[b1[0],y1,b1[1]],[b0[0],y1,b0[1]]];const cr=(v[1][0]-v[0][0])*(v[3][2]-v[0][2])-(v[1][2]-v[0][2])*(v[3][0]-v[0][0]);const q=cr<0?v:[v[0],v[3],v[2],v[1]];
      const s0=i*DS/ts,s1=(i+1)*DS/ts;gb.quad(q[0],q[1],q[2],q[3],[0,1,0],cr<0?[[0,s0],[1,s0],[1,s1],[0,s1]]:[[0,s0],[0,s1],[1,s1],[1,s0]]);}};
    const RDg=new GB(),SH=new GB(),SB=r.urban?3.2:1.3,SY=r.urban?.24:.1;strip(RDg,-Wd,Wd,.12,8,0,n-1);strip(SH,-Wd-SB,-Wd,SY,6,0,n-1);strip(SH,Wd,Wd+SB,SY,6,0,n-1);
    if(AS){addMesh(RDg.geo(),ASPH,false);const YL=new GB(),WL=new GB();strip(YL,-.15,-.03,.135,4,16,n-1,4);strip(WL,-Wd+.15,-Wd+.3,.135,4,16,n-1);strip(WL,Wd-.3,Wd-.15,.135,4,16,n-1);
      addMesh(YL.geo(),mat('#e8c24a',.7),false);addMesh(WL.geo(),mat('#e9e6df',.7),false);}
    else addMesh(RDg.geo(),new T.MeshStandardMaterial({map:TX.gravel,color:lin('#b49c76'),roughness:1}),false);
    addMesh(SH.geo(),r.urban?new T.MeshStandardMaterial({map:TX.walk,roughness:.9}):new T.MeshStandardMaterial({map:TX.gravel,color:lin('#a9987c'),roughness:1}),false);
    if(!r.urban)for(let i=20;i<n;i+=12)for(const o of[-Wd-1.8,Wd+1.8]){const p=side(i,o);posts.push([p[0],h[i]+.05,p[1]]);}});
  {const pg=new T.BoxGeometry(.14,1,.14);pg.translate(0,.5,0);const rf=new T.BoxGeometry(.16,.12,.16);rf.translate(0,.86,0);
    const g=buildVC([{geo:pg,color:'#efefe9'},{geo:rf,color:'#ff9f1c'}]);const im=inst(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.6}),posts,(p,d)=>d.position.set(p[0],p[1],p[2]),false);if(im)im.frustumCulled=false;}
  /* ---- lake: water, dock with a rowboat, a little island, the waterfall on the cliff ---- */
  {const wg=new T.CircleGeometry(L.r+3,96);wg.rotateX(-Math.PI/2);const wm=new T.Mesh(wg,new T.MeshStandardMaterial({color:lin('#2c7c8c'),roughness:.08,metalness:.25,transparent:true,opacity:.9}));wm.position.set(L.x,L.y,L.z);scene.add(wm);
    const dz0=L.z+L.r+2,dz1=L.z+L.r-14,dy=L.y+.55;WILD.dock={x0:L.x-1.6,x1:L.x+1.6,z0:dz1,z1:dz0,y:dy};
    const dk=new GB();for(let z=dz1;z<dz0;z+=.5)dk.box(L.x-1.5,L.x+1.5,dy-.12,dy,z,z+.42,{uw:1,uh:1,ts:1});const dm=addMesh(dk.geo(),mat('#8a6a48',.85),true);
    const pp=[];for(let z=dz1;z<dz0;z+=3)for(const s of[-1.4,1.4])pp.push([L.x+s,z]);const pgeo=new T.CylinderGeometry(.13,.13,4,6);pgeo.translate(0,-1.6,0);inst(pgeo,mat('#5a4030',.9),pp,(p,d)=>d.position.set(p[0],dy,p[1]),false);
    const boat=buildVC([{geo:new T.BoxGeometry(1.4,.5,3.6),pos:[0,.15,0],color:'#c8553d'},{geo:new T.BoxGeometry(1.2,.12,3.3),pos:[0,.42,0],color:'#e8dcc6'},{geo:new T.BoxGeometry(1.1,.08,.3),pos:[0,.5,.4],color:'#8a6a48'}]);
    const bm=new T.Mesh(boat,new T.MeshStandardMaterial({vertexColors:true,roughness:.7}));bm.position.set(L.x+3.4,L.y,dz1+4);bm.rotation.y=.15;scene.add(bm);WILD.anim.boat=bm;
    // waterfall: a sheet of moving water down the cliff on the north shore, foam at the bottom
    const ft=makeTex(128,256,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<70;i++){const x=Math.random()*w,a=.25+Math.random()*.5;g.fillStyle=`rgba(${220+Math.random()*35|0},${240+Math.random()*15|0},255,${a})`;g.fillRect(x,0,1+Math.random()*4,h);}
      for(let i=0;i<120;i++){g.fillStyle='rgba(255,255,255,.55)';g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*5,6+Math.random()*20);}});
    const fall=new T.Mesh(new T.PlaneGeometry(16,38),new T.MeshBasicMaterial({map:ft,transparent:true,opacity:.88,depthWrite:false,toneMapped:false}));fall.position.set(L.x,L.y+18,L.z-L.r-2.6);scene.add(fall);WILD.anim.fall=ft;
    const fg=new T.CircleGeometry(9,32);fg.rotateX(-Math.PI/2);const foam=new T.Mesh(fg,new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,depthWrite:false}));foam.position.set(L.x,L.y+.06,L.z-L.r+4);scene.add(foam);WILD.anim.foam=foam;
    sign('HỒ GƯƠNG',L.x-6,L.y+3.2,L.z+L.r+6,Math.PI,6,1.1,{fg:'#ffffff',bg:'#2f5a46',size:60,w:512,h:110});
    {const ph=new T.CylinderGeometry(.07,.07,3,6);ph.translate(0,1.5,0);for(const dx of[-8.6,-3.4]){const m=new T.Mesh(ph,mat('#5a4030',.9));m.position.set(L.x+dx,heightAt(L.x+dx,L.z+L.r+6),L.z+L.r+6);scene.add(m);}}
    WILD.places.push({id:'lake',n:'Hồ Gương',en:'Mirror Lake',x:L.x,z:L.z+L.r+10,r:60,rw:250},{id:'fall',n:'Thác Bạc',en:'Silver Falls',x:L.x,z:L.z-L.r+8,r:34,rw:300});}
  /* ---- houses and farm buildings (all merged: one vertex-coloured mesh, one roof mesh) ---- */
  const HP=[],RF=new GB();
  function house(cx,cz,w,d,hgt,wall,rot,y0,roofCol){const hw=rot?d/2:w/2,hd=rot?w/2:d/2,y=y0;HP.push({geo:new T.BoxGeometry(hw*2,hgt,hd*2),pos:[cx,y+hgt/2,cz],color:wall},{geo:new T.BoxGeometry(hw*2+.3,.5,hd*2+.3),pos:[cx,y+.25,cz],color:'#6d655b'});
    // door + windows on the long sides
    const fs=rot?[[1,0],[-1,0]]:[[0,1],[0,-1]];for(const[fx,fz]of fs){const ox=fx*(hw+.03),oz=fz*(hd+.03),len=rot?hd*2:hw*2;
      HP.push({geo:new T.BoxGeometry(fx?.06:1.1,2,fz?.06:1.1),pos:[cx+ox,y+1,cz+oz],color:'#4b3526'});
      for(const t of[-.32,.32]){const wx=rot?0:t*len,wz=rot?t*len:0;HP.push({geo:new T.BoxGeometry(fx?.06:1.2,1,fz?.06:1.2),pos:[cx+ox+wx,y+hgt*.6,cz+oz+wz],color:'#a9cfe0'});}}
    // gable roof along the long axis
    const o=.45,rh=Math.min(hw,hd)*.75+.6,top=y+hgt,ax=!rot,L0=ax?hw+o:hd+o,S=(ax?hd:hw)+o;
    const P=(a,b,yy)=>ax?[cx+a,yy,cz+b]:[cx+b,yy,cz+a];
    const s1=[P(-L0,-S,top),P(L0,-S,top),P(L0,0,top+rh),P(-L0,0,top+rh)],s2=[P(L0,S,top),P(-L0,S,top),P(-L0,0,top+rh),P(L0,0,top+rh)];
    const nrm=(q)=>{const u=[q[1][0]-q[0][0],q[1][1]-q[0][1],q[1][2]-q[0][2]],v=[q[3][0]-q[0][0],q[3][1]-q[0][1],q[3][2]-q[0][2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n);n=n.map(a=>a/l);if(n[1]<0){q.reverse();n=n.map(a=>-a);}return n;};
    for(const q of[s1,s2]){const n=nrm(q);RF.quad(q[0],q[1],q[2],q[3],n,[[0,0],[L0/2,0],[L0/2,S/2.2],[0,S/2.2]]);}
    for(const e of[-1,1]){const a=P(e*(L0-o),-S+o,top),b=P(e*(L0-o),S-o,top),c=P(e*(L0-o),0,top+rh);const ok=ax?e>0:e<0;HP.push();RF.tri(...(ok?[a,c,b]:[a,b,c]),ax?[e,0,0]:[0,0,e],[[0,0],[1,0],[.5,1]]);RF.tri(...(ok?[a,b,c]:[a,c,b]),ax?[-e,0,0]:[0,0,-e],[[0,0],[1,0],[.5,1]]);}
    colB(cx-hw,cx+hw,cz-hd,cz+hd,hgt+rh);}
  /* ---- the village: cabins along the road, a shop and a café you can use, a well ---- */
  {const V=PL.village,vy=V.y;const walls=['#d9c7a5','#c9a27a','#e8dcc6','#b9886a','#d4b48c','#e2d2b8'];let k=0;WILD.shops=[];
    const spots=[[-46,-30,0],[-8,-34,0],[34,-30,0],[-58,-64,1],[14,-66,0],[-44,30,0],[-4,34,0],[38,30,0],[-16,66,1],[58,-4,1]];
    for(const[dx,dz,r]of spots){const x=V.x+dx,z=V.z+dz;if(rdAt(x,z)<12)continue;const w=7+(k%3),d=6+(k%2);house(x,z,w,d,3.4,walls[k%walls.length],r,vy,0);
      if(k===1)WILD.shops.push({id:'mart',x,z:z+(dz<0?4.2:-4.2),n:'Tạp hoá Làng Thông'});if(k===5)WILD.shops.push({id:'food',x,z:z+(dz<0?4.2:-4.2),n:'Quán cơm Làng Thông'});k++;}
    for(const s of WILD.shops)sign(s.id==='mart'?'TẠP HOÁ':'QUÁN CƠM',s.x,vy+3,s.z+(s.z>V.z?-.05:.05)+(s.z>V.z?-.5:.5),s.z>V.z?Math.PI:0,3.4,.8,{fg:'#fff',bg:s.id==='mart'?'#b5382b':'#2b6cb0',size:64,w:512,h:120});
    const wl=buildVC([{geo:new T.CylinderGeometry(1.2,1.3,1,14),pos:[0,.5,0],color:'#9a958c'},{geo:new T.CylinderGeometry(1,1,.05,14),pos:[0,.98,0],color:'#1f3b4a'},{geo:new T.BoxGeometry(.15,2.4,.15),pos:[-1.1,1.2,0],color:'#5a4030'},{geo:new T.BoxGeometry(.15,2.4,.15),pos:[1.1,1.2,0],color:'#5a4030'},{geo:new T.BoxGeometry(2.8,.12,1.6),pos:[0,2.45,0],color:'#7a3b2e'}]);
    const wm=new T.Mesh(wl,new T.MeshStandardMaterial({vertexColors:true,roughness:.85}));wm.position.set(V.x+12,vy,V.z+14);wm.castShadow=Q.shadows;scene.add(wm);addCol({t:'c',x:V.x+12,z:V.z+14,r:1.4});
    {const R1=W.roads[0];let bi=0,bd=1e9;R1.P.forEach((p,i)=>{const dd=hyp(p[0]-(V.x+75),p[1]-V.z);if(dd<bd){bd=dd;bi=i;}});const a=R1.P[bi-1],b=R1.P[bi+1],tx=b[0]-a[0],tz=b[1]-a[1],l=hyp(tx,tz),sx=R1.P[bi][0]+(-tz/l)*8,sz=R1.P[bi][1]+(tx/l)*8,sy=heightAt(sx,sz);
    sign('LÀNG THÔNG',sx,sy+3.4,sz,Math.atan2(tx,tz)+Math.PI,6,1.2,{fg:'#fff',bg:'#7a5232',size:64,w:512,h:110});for(const o of[-2.6,2.6]){const pm=new T.Mesh(new T.CylinderGeometry(.09,.09,4,6),mat('#5a4030',.9));pm.position.set(sx+(tx/l)*o,sy+2,sz+(tz/l)*o);scene.add(pm);}}
    for(const[dx,dz]of[[-30,-12],[20,-12],[-20,12],[30,12],[70,-14]])props.flood.push([V.x+dx,V.z+dz,vy+4.2]);
    WILD.places.push({id:'village',n:'Làng Thông',en:'Pine Village',x:V.x,z:V.z,r:70,rw:250});SP.village={x:V.x,z:V.z};}
  /* ---- farm: barn, silo, fields of wheat and vegetables, fences, hay bales ---- */
  {const F=PL.farm,fy=F.y;house(F.x+30,F.z-30,16,11,6,'#9c2f2a',0,fy);
    const silo=buildVC([{geo:new T.CylinderGeometry(3,3,12,18),pos:[0,6,0],color:'#c9ced4'},{geo:new T.SphereGeometry(3,18,8,0,Math.PI*2,0,Math.PI/2),pos:[0,12,0],color:'#9aa3ad'}]);
    const sm=new T.Mesh(silo,new T.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.4}));sm.position.set(F.x+46,fy,F.z-34);sm.castShadow=Q.shadows;scene.add(sm);addCol({t:'c',x:F.x+46,z:F.z-34,r:3.1});
    const cols=['#d6b24a','#6f9a3a','#8a6a3e','#c9a43a','#5d8a34','#a3c25a'];const fence=[];
    const fields=[[-50,-40,34,22],[-50,-8,34,22],[-10,10,36,24],[30,10,32,24],[-50,26,34,20],[-10,44,36,18]];
    fields.forEach(([dx,dz,w,d],i)=>{const x0=F.x+dx,z0=F.z+dz,gb=new GB();gb.flat(x0,x0+w,fy+.12,z0,z0+d,3);
      const tex=makeTex(64,64,(g,ww,hh)=>{g.fillStyle=cols[i%cols.length];g.fillRect(0,0,ww,hh);g.fillStyle='rgba(0,0,0,.18)';for(let y=0;y<hh;y+=8)g.fillRect(0,y,ww,3);});
      addMesh(gb.geo(),new T.MeshStandardMaterial({map:tex,roughness:1}),false);
      for(let t=0;t<=w;t+=3){fence.push([x0+t,z0,0]);fence.push([x0+t,z0+d,0]);}for(let t=0;t<=d;t+=3){fence.push([x0,z0+t,1]);fence.push([x0+w,z0+t,1]);}});
    const fp=buildVC([{geo:new T.BoxGeometry(.12,1,.12),pos:[0,.5,0],color:'#7a5a3a'},{geo:new T.BoxGeometry(3,.1,.06),pos:[1.5,.75,0],color:'#9a7a52'},{geo:new T.BoxGeometry(3,.1,.06),pos:[1.5,.4,0],color:'#9a7a52'}]);
    inst(fp,new T.MeshStandardMaterial({vertexColors:true,roughness:.9}),fence,(p,d)=>{d.position.set(p[0],fy,p[1]);d.rotation.y=p[2]?-Math.PI/2:0;},false);
    const hay=[];for(let i=0;i<14;i++)hay.push([F.x+rng()*50-20,F.z+60+rng()*14]);const hg=new T.CylinderGeometry(.8,.8,1.2,12);hg.rotateZ(Math.PI/2);hg.translate(0,.8,0);
    inst(hg,mat('#d8b960',.95),hay,(p,d,i)=>{d.position.set(p[0],fy,p[1]);d.rotation.y=i;},true);hay.forEach(p=>addCol({t:'c',x:p[0],z:p[1],r:.8}));
    WILD.places.push({id:'farm',n:'Nông trại Đồi Gió',en:'Windy Hill Farm',x:F.x,z:F.z,r:70,rw:200});}
  /* ---- campsite: tents, a campfire you can rest at, log seats ---- */
  {const C=PL.camp,cy=C.y;const tents=[[-7,-5,'#e07a3a'],[6,-8,'#3a7a5a'],[9,5,'#3a5aa8']];
    for(const[dx,dz,c]of tents){const tg=new T.ConeGeometry(2.1,2.5,4);tg.translate(0,1.25,0);const m=new T.Mesh(tg,mat(c,.85));m.position.set(C.x+dx,cy,C.z+dz);m.rotation.y=Math.PI/4+dx*.1;m.castShadow=Q.shadows;scene.add(m);addCol({t:'c',x:C.x+dx,z:C.z+dz,r:1.6});}
    const fire=new T.Group();const stones=[];for(let a=0;a<10;a++)stones.push({geo:new T.DodecahedronGeometry(.22),pos:[Math.cos(a/10*6.28)*.8,.1,Math.sin(a/10*6.28)*.8],color:'#7d7a74'});
    stones.push({geo:new T.CylinderGeometry(.1,.1,1.4,6).rotateZ(Math.PI/2).rotateY(.6),pos:[0,.15,0],color:'#4a3324'},{geo:new T.CylinderGeometry(.1,.1,1.4,6).rotateZ(Math.PI/2).rotateY(-.7),pos:[0,.2,0],color:'#4a3324'});
    fire.add(new T.Mesh(buildVC(stones),new T.MeshStandardMaterial({vertexColors:true,roughness:.9})));
    const f1=new T.Mesh(new T.ConeGeometry(.45,1.3,8),new T.MeshBasicMaterial({color:'#ff7a1a',transparent:true,opacity:.9,toneMapped:false}));f1.position.y=.75;
    const f2=new T.Mesh(new T.ConeGeometry(.25,.9,8),new T.MeshBasicMaterial({color:'#ffd27a',transparent:true,opacity:.95,toneMapped:false}));f2.position.y=.6;fire.add(f1,f2);
    const gl=new T.Mesh(new T.CircleGeometry(8,24).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:makeTex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,160,60,.9)');r.addColorStop(1,'rgba(255,120,40,0)');g.fillStyle=r;g.fillRect(0,0,w,h);},{repeat:false}),transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));gl.position.y=.05;fire.add(gl);
    {const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex0(),color:'#ffb060',transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));sp.scale.set(6,6,1);sp.position.y=1.1;fire.add(sp);WILD.anim.fireSp=sp;}
    fire.position.set(C.x,cy,C.z+2);scene.add(fire);WILD.anim.fire={f1,f2,gl};addCol({t:'c',x:C.x,z:C.z+2,r:.9});
    const lg=new T.CylinderGeometry(.28,.28,2.2,8);lg.rotateZ(Math.PI/2);lg.translate(0,.28,0);const logs=[[0,4.2,0],[-3.3,1.6,1.1],[3.3,1.6,-1.1]];
    inst(lg,mat('#6b4a32',.9),logs,(p,d)=>{d.position.set(C.x+p[0],cy,C.z+2+p[1]);d.rotation.y=p[2];},true);
    SP.camp={x:C.x,z:C.z+2};WILD.places.push({id:'camp',n:'Khu cắm trại Thông Reo',en:'Whispering Pines Camp',x:C.x,z:C.z,r:30,rw:200});
    WILD.parks=[['suv',C.x-12,C.z+10,.4,'#3d5a40'],['bike',C.x-8,C.z+14,.9,'#d35400']];}
  /* ---- old mine: timber portal into the mountain, rails and a mine cart ---- */
  {const M=PL.mine,my=M.y,dx=-105,dz=-125,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,ry=Math.atan2(ux,uz);
    const ex=M.x+ux*13,ez=M.z+uz*13;const g=new T.Group();g.position.set(ex,my,ez);g.rotation.y=ry;scene.add(g);
    const wood=mat('#5e4430',.9);const add=(geo,m,x,y,z)=>{const me=new T.Mesh(geo,m);me.position.set(x,y,z);me.castShadow=Q.shadows;g.add(me);return me;};
    add(new T.BoxGeometry(5.6,5.2,8),mat('#0b0b0c',1),0,2.4,3.2);
    add(new T.BoxGeometry(.5,4.6,.5),wood,-2.5,2.3,-.6);add(new T.BoxGeometry(.5,4.6,.5),wood,2.5,2.3,-.6);add(new T.BoxGeometry(6.2,.6,.6),wood,0,4.8,-.6);
    const rail=new T.BoxGeometry(.08,.1,16);for(const s of[-.55,.55])add(rail,mat('#6d6f73',.4,.8),s,.15,-7);
    for(let t=0;t<16;t+=1.2)add(new T.BoxGeometry(1.6,.08,.25),wood,0,.06,-14.5+t);
    const cart=add(new T.BoxGeometry(1.4,.9,2),mat('#5b4a3a',.6,.4),0,.75,-9);add(new T.BoxGeometry(1.2,.3,1.8),mat('#2b2b2d',1),0,1.15,-9);
    add(new T.BoxGeometry(.25,.35,.25),new T.MeshBasicMaterial({color:'#ffc46b',toneMapped:false}),2.2,3.4,-.9);
    const s=sign('MỎ CŨ · NGUY HIỂM',0,5.6,-.95,0,4.6,.8,{fg:'#ffde59',bg:'#3a2a1a',size:60,w:512,h:100});scene.remove(s);g.add(s);s.rotation.y=Math.PI;
    for(const sx of[-2.5,2.5]){const wx=ex+Math.cos(ry)*sx,wz=ez-Math.sin(ry)*sx;addCol({t:'c',x:wx,z:wz,r:.5});}
    {const bx=ex+ux*3,bz=ez+uz*3;addCol({t:'c',x:bx,z:bz,r:2.6});}
    WILD.mineIn={x:ex-ux*.9,z:ez-uz*.9,y:my};WILD.places.push({id:'mine',n:'Mỏ Cũ',en:'The Old Mine',x:M.x,z:M.z,r:26,rw:300});}
  /* ---- summit: stone plaza, lattice radio mast with a blinking light, flag, benches ---- */
  {const S=PL.summit,sy=S.y;const pl=new T.CircleGeometry(S.r,48);pl.rotateX(-Math.PI/2);const m=new T.Mesh(pl,new T.MeshStandardMaterial({map:TX.walk,color:lin('#cfc6b6'),roughness:.9}));m.position.set(S.x,sy+.1,S.z);m.receiveShadow=Q.shadows;scene.add(m);
    const wall=new T.TorusGeometry(S.r,.22,6,64,Math.PI*1.6);wall.rotateX(Math.PI/2);wall.rotateY(-Math.PI*.15);const wm=new T.Mesh(wall,mat('#bfb6a6',.85));wm.position.set(S.x,sy+.3,S.z);scene.add(wm);
    const lt=makeTex(64,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#e04040';g.lineWidth=5;g.strokeRect(2,0,w-4,h);for(let y=0;y<h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y+32);g.moveTo(w,y);g.lineTo(0,y+32);g.stroke();g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}},{repeat:true});lt.repeat.set(1,4);
    const mast=new T.Mesh(new T.CylinderGeometry(.45,2.2,30,4,1,true),new T.MeshStandardMaterial({map:lt,transparent:true,alphaTest:.4,side:T.DoubleSide,roughness:.6,metalness:.5}));mast.position.set(S.x+6,sy+15,S.z-5);mast.rotation.y=Math.PI/4;scene.add(mast);
    const bl=new T.Mesh(new T.SphereGeometry(.35,10,8),new T.MeshBasicMaterial({color:'#ff2a2a',toneMapped:false}));bl.position.set(S.x+6,sy+30.4,S.z-5);scene.add(bl);WILD.anim.blink=bl;addCol({t:'c',x:S.x+6,z:S.z-5,r:2});
    const fp=new T.Mesh(new T.CylinderGeometry(.06,.06,7,6),mat('#c9ced4',.3,.8));fp.position.set(S.x-6,sy+3.6,S.z+3);scene.add(fp);
    const flag=new T.Mesh(new T.PlaneGeometry(2.4,1.5,8,1),new T.MeshBasicMaterial({map:textTex('NEXUS',{bg:'#c1f354',fg:'#11140c',size:90,w:256,h:160}),side:T.DoubleSide}));flag.position.set(S.x-4.8,sy+6.3,S.z+3);scene.add(flag);WILD.anim.flag=flag;
    sign('ĐỈNH NEXUS',S.x-2,sy+1.6,S.z+S.r-1.5,Math.PI,5,1,{fg:'#fff',bg:'#3b3a40',size:56,w:512,h:100});
    for(let k=0;k<4;k++){const a=k/4*Math.PI*2+.4;props.flood.push([S.x+Math.cos(a)*(S.r-1.5),S.z+Math.sin(a)*(S.r-1.5),sy+4.2]);}
    WILD.places.push({id:'summit',n:'Đỉnh Nexus',en:'Nexus Peak',x:S.x,z:S.z,r:18,rw:1000});SP.summit={x:S.x,z:S.z,y:sy};
    WILD.parkSummit=['sports',S.x+8,S.z+6,2.4,'#e63946'];}
  /* ---- lighthouse on the north beach, beam turns at night ---- */
  {const lz=-1260,lx=shoreE(lz)-34,ly=.25;const st=makeTex(64,256,(g,w,h)=>{for(let y=0;y<h;y+=64){g.fillStyle='#f4f1ea';g.fillRect(0,y,w,32);g.fillStyle='#c0392b';g.fillRect(0,y+32,w,32);}});
    const tw=new T.Mesh(new T.CylinderGeometry(2.1,3,24,24),new T.MeshStandardMaterial({map:st,roughness:.6}));tw.position.set(lx,ly+12,lz);tw.castShadow=Q.shadows;scene.add(tw);
    const gal=new T.Mesh(new T.CylinderGeometry(3,3,.4,24),mat('#2b2e33',.5,.6));gal.position.set(lx,ly+24.2,lz);scene.add(gal);
    const lamp=new T.Mesh(new T.CylinderGeometry(1.6,1.6,2.4,16),new T.MeshBasicMaterial({color:'#fff2b0',toneMapped:false}));lamp.position.set(lx,ly+25.6,lz);scene.add(lamp);
    const cap=new T.Mesh(new T.ConeGeometry(2.2,2,16),mat('#c0392b',.5));cap.position.set(lx,ly+27.8,lz);scene.add(cap);
    const bg=new T.ConeGeometry(4,90,16,1,true);bg.translate(0,-45,0);bg.rotateZ(Math.PI/2);const bm=new T.MeshBasicMaterial({color:'#fff6c8',transparent:true,opacity:.16,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
    const beam=new T.Group();beam.add(new T.Mesh(bg,bm));const b2=new T.Mesh(bg,bm);b2.rotation.y=Math.PI;beam.add(b2);beam.position.set(lx,ly+25.6,lz);scene.add(beam);WILD.anim.beam={g:beam,m:bm,lamp};
    house(lx-12,lz+6,7,6,3.2,'#f2efe6',1,ly);addCol({t:'c',x:lx,z:lz,r:3.1});
    WILD.places.push({id:'light',n:'Hải đăng Mũi Bắc',en:'North Cape Lighthouse',x:lx,z:lz,r:30,rw:250});SP.lighthouse={x:lx,z:lz};}
  /* ---- named spots with no buildings ---- */
  WILD.places.push({id:'meadow',n:'Đồng cỏ Hoa Dại',en:'Wildflower Meadow',x:PL.meadow.x,z:PL.meadow.z,r:60,rw:150},{id:'forest',n:'Rừng Thông Già',en:'Old Pine Forest',x:PL.forest.x,z:PL.forest.z,r:70,rw:200});
  if(SP.lookout)WILD.places.push({id:'lookout',n:'Điểm ngắm Đèo Nexus',en:'Nexus Pass Lookout',x:SP.lookout.x,z:SP.lookout.z,r:20,rw:200});
  addCol({t:'b',x0:WA.x0-5,x1:EXT.x0-5,z0:RZ0,z1:RZ1,h:.3});
  addMesh(RF.geo(),new T.MeshStandardMaterial({map:TX.shingleRed,roughness:.85}),true);
  {const hm=new T.Mesh(buildVC(HP.filter(p=>p.geo)),new T.MeshStandardMaterial({vertexColors:true,roughness:.85}));hm.castShadow=hm.receiveShadow=Q.shadows;scene.add(hm);}
  /* ---- road signs at the city exit and the lake turn-off ---- */
  {const sp=new T.CylinderGeometry(.08,.08,3.4,8);sp.translate(0,1.7,0);for(const[x,z,t,ry]of[[9,-468,'↑ HỒ GƯƠNG · LÀNG THÔNG · ĐỈNH NEXUS',0],[-150,-748,'→ HỒ GƯƠNG · KHU CẮM TRẠI',Math.PI*.15]]){const y=heightAt(x,z);sign(t,x,y+3.6,z,ry,9,1.1,{fg:'#fff',bg:'#2f7a46',size:44,w:1024,h:120});const m=new T.Mesh(sp,mat('#8a8f96',.5,.6));m.position.set(x,y,z);scene.add(m);}}
  /* ---- forest: pines on the hills and mountains, broadleaf trees and boulders in the meadow ---- */
  {const pines=[],broad=[],rocks=[];const NP=MOBILE?1300:3600,NB=MOBILE?160:420,NR=MOBILE?120:300;
    const ok=(x,z,road)=>{if(inCity(x,z)||x>425||z<W.WZ0+200||x<W.WX0+190)return false;if(Math.hypot(Math.max(0,EXT.x0-x),Math.max(0,EXT.z0-z))<30)return false;if(rdAt(x,z)<road)return false;
      if(Math.hypot(x-L.x,z-L.z)<L.r+8)return false;for(const p of[PL.village,PL.camp,PL.mine,PL.summit,PL.farm,PL.oldq,PL.harbor,PL.highland,PL.minetown]){if(Math.hypot(x-p.x,z-p.z)<(p.r||20)+14)return false;}if(SP.lighthouse&&Math.hypot(x-SP.lighthouse.x,z-SP.lighthouse.z)<20)return false;return true;};
    for(let k=0;k<NP*4&&pines.length<NP;k++){const x=W.WX0+rng()*(W.WX1-W.WX0),z=W.WZ0+rng()*(W.WZ1-W.WZ0);if(!ok(x,z,10))continue;const y=heightAt(x,z);if(y>104)continue;
      const city=Math.hypot(Math.max(0,EXT.x0-x),Math.max(0,EXT.z0-z)),dens=clamp((city-120)/260,0,1)*clamp(.55+nz(x*.8,z*.8),0,1);if(rng()>dens)continue;
      if(Math.abs(heightAt(x+3,z)-y)>2.6||Math.abs(heightAt(x,z+3)-y)>2.6)continue;pines.push([x,y,z,.75+rng()*.8]);addCol({t:'c',x,z,r:.45});}
    for(let k=0;k<NB*6&&broad.length<NB;k++){const x=W.WX0+rng()*(W.WX1-W.WX0),z=W.WZ0+rng()*(W.WZ1-W.WZ0);if(!ok(x,z,9))continue;const city=Math.hypot(Math.max(0,EXT.x0-x),Math.max(0,EXT.z0-z));if(city>420||rng()<.35)continue;const y=heightAt(x,z);broad.push([x,y,z,.8+rng()*.6]);addCol({t:'c',x,z,r:.5});}
    for(let k=0;k<NR*6&&rocks.length<NR;k++){const x=W.WX0+rng()*(W.WX1-W.WX0),z=W.WZ0+rng()*(W.WZ1-W.WZ0);if(!ok(x,z,9))continue;const y=heightAt(x,z);if(y<30&&Math.hypot(x-L.x,z-L.z)>L.r+40&&rng()<.7)continue;const s=.6+rng()*2.2;rocks.push([x,y,z,s]);if(s>1)addCol({t:'c',x,z,r:s*.8});}
    const tr=new T.CylinderGeometry(.18,.3,3,6,1,true);tr.translate(0,1.5,0);const c1=new T.ConeGeometry(2.3,4.4,8,1,true);c1.translate(0,4.3,0);const c2=new T.ConeGeometry(1.7,3.6,8,1,true);c2.translate(0,6.6,0);const c3=new T.ConeGeometry(1.1,2.6,8,1,true);c3.translate(0,8.4,0);const cones=mergeGeos([c1,c2,c3]);cones.computeVertexNormals();
    const pl=(p,d,i)=>{d.position.set(p[0],p[1]-.15,p[2]);d.scale.setScalar(p[3]);d.rotation.y=i*1.7;};
    instFol(PINEG||(PINEG=coniferGeo({seed:11})),NEEDLEM,pines,pl);
    const bt=new T.CylinderGeometry(.22,.32,3.2,6);bt.translate(0,1.6,0);const cn=new T.IcosahedronGeometry(2.4,0);cn.translate(0,4.4,0);
    instFol(BROADG2||(BROADG2=broadleafGeo({seed:5,cy:4.4,r:2.4,h:1.9,color:'#6a9e48'})),LEAFM,broad,pl);
    const rg=new T.DodecahedronGeometry(1,0);const ri=inst(rg,mat('#8d877d',.95),rocks,(p,d,i)=>{d.position.set(p[0],p[1]+p[3]*.25,p[2]);d.scale.set(p[3]*1.2,p[3]*.8,p[3]);d.rotation.set(i*.7,i*1.3,0);},true);if(ri)ri.frustumCulled=false;}
  /* ---- 20 hidden Nexus gems to find around the wilds and the hills ---- */
  {const C=PL.camp,S=PL.summit,F=PL.farm,V=PL.village,M=WILD.mineIn;const pts=[[S.x-9,S.z-6],[L.x+14,L.z-L.r-24],[L.x+2,L.z+L.r-12],[C.x+10,C.z-14],[M.x,M.z],[F.x+36,F.z-46],[V.x+12,V.z+18],[SP.lighthouse.x+5,SP.lighthouse.z+4],
      [PL.meadow.x+20,PL.meadow.z+10],[PL.forest.x+8,PL.forest.z-30],[270,-1330],[-1090,-1110],[-420,-560],[300,-620],[-1200,-480],[-300,-1180],[480,-1460]];
    if(SP.lookout)pts.push([SP.lookout.x+6,SP.lookout.z+9]);pts.push([-760,300],[-560,-260]);
    for(const[x,z]of pts.slice(0,20)){WILD.gems.push({x,z,y:heightAt(x,z)+1.3});}
    const g=new T.OctahedronGeometry(.45,0);const m=new T.MeshStandardMaterial({color:lin('#7ef9ff'),emissive:lin('#38d8ff'),emissiveIntensity:1.6,roughness:.2,metalness:.3});
    const im=new T.InstancedMesh(g,m,WILD.gems.length);im.frustumCulled=false;im.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(im);WILD.gemIM=im;}
}
/* ---------- TOWNS: five new places spread over the map, each with its own look, doors you can walk through and hidden diamonds ----------
   Old Quarter (lanterns, canal, covered bridge, pagoda) · North Harbour (quay, piers, boats, cranes, containers)
   Cloud Hill highland town (villas, church, night market, pines) · Silver Mine frontier town (false fronts, boardwalks, water tower, windmill)
   West Nexus (glass towers, plaza fountain, cinema, villas with pools, football pitch) */
{const PL=WILD.PL,RNG=(()=>{let s=777;return()=>{s=(s*16807)%2147483647;return s/2147483647;};})(),rr=(a,b)=>a+RNG()*(b-a),rp=a=>a[Math.floor(RNG()*a.length)];
  const FACG={},flatRoof=new GB(),tileR=new GB(),tileG=new GB(),gw={},VC=[],BOX1=new T.BoxGeometry(1,1,1),CYL=new T.CylinderGeometry(1,1,1,10);
  const LANT={'#ff3b30':[],'#ffcc33':[],'#ff8a1f':[],'#c86bff':[]},LAMPS=[],TREES=[],PINES=[],FLOW=[],STR=[],BOATS=[],MILLS=[];
  const fb=k=>FACG[k]||(FACG[k]=wrapGB(new GB(),k));
  const rdW=(x,z)=>{const G=WGRID;if(!G)return 1e9;const ix=Math.round((x-G.X0)/G.ST),iz=Math.round((z-G.Z0)/G.ST);if(ix<0||iz<0||ix>=G.NX||iz>=G.NZ)return 1e9;return G.RD[iz*G.NX+ix];};
  const vb=(x0,x1,y0,y1,z0,z1,c)=>VC.push({geo:BOX1,pos:[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],scale:[Math.max(.01,x1-x0),Math.max(.01,y1-y0),Math.max(.01,z1-z0)],color:c});
  const vc=(x,y0,y1,z,r,c)=>VC.push({geo:CYL,pos:[x,(y0+y1)/2,z],scale:[r,y1-y0,r],color:c});
  const gwb=c=>gw[c]||(gw[c]=new GB());
  const nq=(gb,q,s)=>{const u=[q[1][0]-q[0][0],q[1][1]-q[0][1],q[1][2]-q[0][2]],v=[q[3][0]-q[0][0],q[3][1]-q[0][1],q[3][2]-q[0][2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(n[0],n[1],n[2])||1;n=n.map(a=>a/l);
    if(n[1]<0){q=q.slice().reverse();n=n.map(a=>-a);}const L=Math.hypot(u[0],u[1],u[2]),W=Math.hypot(v[0],v[1],v[2]);gb.quad(q[0],q[1],q[2],q[3],n,[[0,0],[L/s,0],[L/s,W/s],[0,W/s]]);};
  const tri2=(gb,a,b,c)=>{const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(n[0],n[1],n[2])||1;n=n.map(q=>q/l);
    gb.tri(a,b,c,n,[[0,0],[1,0],[.5,1]]);gb.tri(a,c,b,n.map(q=>-q),[[0,0],[1,0],[.5,1]]);};
  /* gable roof over a box; ax 'x' puts the ridge along x */
  function gable(gb,x0,x1,z0,z1,y,rh,ax,o,wallC){o=o==null?.5:o;
    if(ax==='x'){const zm=(z0+z1)/2;nq(gb,[[x0-o,y,z0-o],[x1+o,y,z0-o],[x1+o,y+rh,zm],[x0-o,y+rh,zm]],2.2);nq(gb,[[x1+o,y,z1+o],[x0-o,y,z1+o],[x0-o,y+rh,zm],[x1+o,y+rh,zm]],2.2);
      if(wallC)for(const x of[x0,x1])tri2(gwb(wallC),[x,y,z0],[x,y,z1],[x,y+rh,zm]);}
    else{const xm=(x0+x1)/2;nq(gb,[[x0-o,y,z1+o],[x0-o,y,z0-o],[xm,y+rh,z0-o],[xm,y+rh,z1+o]],2.2);nq(gb,[[x1+o,y,z0-o],[x1+o,y,z1+o],[xm,y+rh,z1+o],[xm,y+rh,z0-o]],2.2);
      if(wallC)for(const z of[z0,z1])tri2(gwb(wallC),[x0,y,z],[x1,y,z],[xm,y+rh,z]);}}
  /* hipped roof (four slopes), used for the pagoda tiers and the villas */
  function hip(gb,x0,x1,z0,z1,y,rh,o){o=o==null?.6:o;const a=x0-o,b=x1+o,c=z0-o,d=z1+o,w=b-a,dd=d-c,k=Math.min(w,dd)/2,top=y+rh;
    if(w>=dd){const r0=a+k,r1=b-k,zm=(c+d)/2;nq(gb,[[a,y,c],[b,y,c],[r1,top,zm],[r0,top,zm]],2.2);nq(gb,[[b,y,d],[a,y,d],[r0,top,zm],[r1,top,zm]],2.2);tri2(gb,[a,y,d],[a,y,c],[r0,top,zm]);tri2(gb,[b,y,c],[b,y,d],[r1,top,zm]);}
    else{const r0=c+k,r1=d-k,xm=(a+b)/2;nq(gb,[[a,y,d],[a,y,c],[xm,top,r0],[xm,top,r1]],2.2);nq(gb,[[b,y,c],[b,y,d],[xm,top,r1],[xm,top,r0]],2.2);tri2(gb,[a,y,c],[b,y,c],[xm,top,r0]);tri2(gb,[b,y,d],[a,y,d],[xm,top,r1]);}}
  /* a building: textured facade box + collider; returns the top height */
  function bld(k,x0,x1,z0,z1,y,h,flat){fb(k).box(x0,x1,y-.8,y+h,z0,z1,{top:flat===false?null:flatRoof,uo:RNG()});colB(x0,x1,z0,z1,y+h);return y+h;}
  /* a door on a facade facing h (0:+z, PI:-z, PI/2:+x, -PI/2:-x) that leads into one of the interiors */
  function door(x,z,h,room,y,w,ht,col,txt){const fx=Math.round(Math.sin(h)),fz=Math.round(Math.cos(h));w=w||1.6;ht=ht||2.5;col=col||'#4b3526';
    if(fz)vb(x-w/2,x+w/2,y,y+ht,z+fz*.0-.07,z+fz*.0+.07+fz*.02,col);else vb(x-.07,x+.07+fx*.02,y,y+ht,z-w/2,z+w/2,col);
    if(fz)vb(x-w/2-.15,x+w/2+.15,y+ht,y+ht+.18,z-.1,z+.1,'#e8dfcc');else vb(x-.1,x+.1,y+ht,y+ht+.18,z-w/2-.15,z+w/2+.15,'#e8dfcc');
    GDOORS.push({id:'t'+GDOORS.length,x:x+fx*1.4,z:z+fz*1.4,h,room,txt});}
  const lamp=(x,z,y)=>{LAMPS.push([x,y,z]);props.flood.push([x,z,y+4.6]);addCol({t:'c',x,z,r:.18});};
  const tree=(x,z,y,s)=>{TREES.push([x,y,z,s||1]);addCol({t:'c',x,z,r:.45});};
  const pine=(x,z,y,s)=>{PINES.push([x,y,z,s||1]);addCol({t:'c',x,z,r:.45});};
  const lanternString=(x0,z0,x1,z1,y,sag,step)=>{const n=Math.max(2,Math.round(hyp(x1-x0,z1-z0)/(step||1.6)));const keys=Object.keys(LANT);let px=x0,pz=z0,py=y;
    for(let i=1;i<=n;i++){const t=i/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t,yy=y-sag*4*t*(1-t);STR.push(px,py,pz,x,yy,z);px=x;pz=z;py=yy;if(i<n)LANT[keys[(i+Math.round(Math.abs(x0)))%4]].push([x,yy-.35,z]);}};
  const town=(id,n,en,x,z,r,rw)=>{WILD.places.push({id,n,en,x,z,r:r*.6,rw});TOWNS.push({id,x,z,r});};
  const dia=(x,z,y)=>DIAS.push({x,z,y:(y==null?heightAt(x,z):y)+1.1});
  const archSign=(text,x,z,y,ry,span,col)=>{const c=Math.cos(ry),s=Math.sin(ry),ax=c,az=-s;for(const e of[-1,1]){const px=x+ax*e*span/2,pz=z+az*e*span/2;vb(px-.35,px+.35,y,y+6.2,pz-.35,pz+.35,col);addCol({t:'c',x:px,z:pz,r:.4});}
    const bx=Math.abs(ax)>.5;if(bx)vb(x-span/2-.6,x+span/2+.6,y+6.2,y+6.8,z-.45,z+.45,col);else vb(x-.45,x+.45,y+6.2,y+6.8,z-span/2-.6,z+span/2+.6,col);
    sign(text,x+Math.sin(ry)*.47,y+5.6,z+Math.cos(ry)*.47,ry,Math.min(span-1.4,9),1.1,{fg:'#fff',bg:col,size:64,w:1024,h:128});sign(text,x-Math.sin(ry)*.47,y+5.6,z-Math.cos(ry)*.47,ry+Math.PI,Math.min(span-1.4,9),1.1,{fg:'#fff',bg:col,size:64,w:1024,h:128});};

  /* ======== 1. PHỐ CỔ ĐÈN LỒNG — Lantern Old Quarter ======== */
  {const O=PL.oldq,y=O.y,Z=-600,SN=-611.5,SS=-588.5;
    const pave=new GB();pave.flat(-462,-292,y+.14,SN,Z-5.7,3);pave.flat(-462,-292,y+.14,Z+5.7,SS-.01,3);
    const COLS=['houseYellow','decoYellow','houseYellow','aptPeach','houseYellow','stone'],WALLC={houseYellow:'#d8c38a',decoYellow:'#dcc58e',aptPeach:'#d9b48e',stone:'#cdbf9f'};
    const row=(xa,xb,side)=>{let x=xa;while(x<xb-5){const w=Math.min(xb-x,rr(6.2,8.2));if(w<5)break;const k=rp(COLS),h=rr(6.4,7.6),z0=side<0?SN-12:SS,z1=side<0?SN:SS+12;
        const top=bld(k,x,x+w,z0,z1,y,h,false);gable(tileR,x,x+w,z0,z1,top,2.3,'x',.55,WALLC[k]);
        const fz=side<0?z1:z0,o=side<0?1:-1;// street side
        vb(x+.4,x+w-.4,y+3.5,y+3.65,fz+o*0,fz+o*1.1,'#6b3f24');for(let px=x+.6;px<x+w-.4;px+=.5)vb(px-.03,px+.03,y+3.65,y+4.5,fz+o*1.05-.03,fz+o*1.05+.03,'#6b3f24');vb(x+.4,x+w-.4,y+4.45,y+4.55,fz+o*1.02,fz+o*1.1,'#6b3f24');
        for(const t of[.28,.72])vb(x+w*t-.55,x+w*t+.55,y+4.0,y+5.6,fz+o*.02-.01,fz+o*.06,'#355c4a');
        vb(x+.3,x+w-.3,y+2.9,y+3.0,fz,fz+o*1.6,rp(['#b23a48','#2b6cb0','#2f855a','#c05621']));
        LANT[rp(Object.keys(LANT))].push([x+w*.25,y+3.2,fz+o*1.3]);LANT[rp(Object.keys(LANT))].push([x+w*.75,y+3.2,fz+o*1.3]);
        const rm=RNG();door(x+w/2,fz,side<0?0:Math.PI,rm<.12?'mart':rm<.2?'clothes':'flat',y,1.5,2.5,'#5a3a22');
        x+=w;}};
    row(-458,-386,-1);row(-379,-296,-1);row(-458,-403,1);row(-338,-296,1);
    // the teahouse: a wider building with a sign
    {const x0=-386,x1=-379;vb(x0,x1,y,y+.15,SN-12,SN,'#8c8174');}
    for(let x=-452;x<=-300;x+=8)lanternString(x,SN+.5,x+3,SS-.5,y+6.2,1.2,1.5);
    // pagoda in a stone yard on the south side
    {const cx=-380,cz=-566,pv=new GB();pv.flat(-402,-358,y+.15,-588.4,-544,3);addMesh(pv.geo(),new T.MeshStandardMaterial({map:TX.walk,color:lin('#b9ad98'),roughness:.95}),false);
      let s=8,yy=y;for(let t=0;t<3;t++){const h=t?2.6:3.4;vb(cx-s/2,cx+s/2,yy,yy+h,cz-s/2,cz+s/2,t?'#9b3328':'#a33b2b');for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])vc(cx+a*s/2,yy,yy+h,cz+b*s/2,.22,'#5a2418');yy+=h;hip(tileR,cx-s/2,cx+s/2,cz-s/2,cz+s/2,yy,1.4,1.3);yy+=.9;s-=2.2;}
      vc(cx,yy+.4,yy+3,cz,.12,'#c9a227');VC.push({geo:new T.SphereGeometry(.35,10,8),pos:[cx,yy+3.1,cz],color:'#f2c84b'});colB(cx-4,cx+4,cz-4,cz+4,yy);
      vb(cx-1,cx+1,y,y+.9,cz+6,cz+7,'#7a7a72');LANT['#ff3b30'].push([cx-4.4,y+3,cz+4.4],[cx+4.4,y+3,cz+4.4],[cx-4.4,y+3,cz-4.4],[cx+4.4,y+3,cz-4.4]);
      for(const[a,b]of[[-16,-14],[16,-14],[-16,14],[16,14]])tree(cx+a,cz+b,y,1.1);dia(cx+5.5,cz-6);}
    // canal behind the north row with a covered bridge
    {const z0=-656,z1=-646,cx=-377;const wg=new GB();wg.flat(-462,-292,y-.7,z0,z1,6);const wm=addMesh(wg.geo(),new T.MeshStandardMaterial({color:lin('#2f6f6a'),roughness:.1,metalness:.2}),false);
      vb(-462,-292,y-1.6,y+.25,z0-.6,z0,'#8a8578');vb(-462,-292,y-1.6,y+.25,z1,z1+.6,'#8a8578');
      colX(-462,cx-3.2,z0,z1,3);colX(cx+3.2,-292,z0,z1,3);
      vb(cx-3,cx+3,y+.05,y+.3,z0-1.5,z1+1.5,'#7a4a2a');for(const a of[-1,1])for(const b of[z0-1.2,(z0+z1)/2,z1+1.2])vc(cx+a*2.7,y+.3,y+3,b,.14,'#9b2f22');
      gable(tileR,cx-3,cx+3,z0-1.5,z1+1.5,y+3,1.6,'z',.5,'#9b2f22');colX(cx-3.3,cx-2.6,z0-1.5,z1+1.5,3);colX(cx+2.6,cx+3.3,z0-1.5,z1+1.5,3);
      sign('CẦU MÁI ĐỎ',cx,y+3.4,z1+1.95,0,3.2,.5,{fg:'#ffe08a',bg:'#5a1a12',size:56,w:512,h:96});dia(-300,z1+2.2);dia(-456,z0-2.5);
      for(let x=-455;x<-300;x+=14){tree(x,z1+5,y,.9);tree(x+7,z0-5,y,.9);}}
    // tea house on the south side of the main street
    {const x0=-356,x1=-340,z0=SS,z1=SS+13;const top=bld('decoYellow',x0,x1,z0,z1,y,7.2,false);gable(tileR,x0,x1,z0,z1,top,2.6,'x',.6,'#dcc58e');door((x0+x1)/2,z0,Math.PI,'tea',y,2,2.6,'#5a1a12',()=>L('Vào Trà quán Phố Cổ','Enter the Old Quarter Teahouse'));
      sign('TRÀ QUÁN PHỐ CỔ',(x0+x1)/2,y+5.4,z0-.08,Math.PI,5.5,.8,{fg:'#ffe08a',bg:'#5a1a12',size:60,w:1024,h:140});}
    archSign('PHỐ CỔ ĐÈN LỒNG',-290,Z,y,Math.PI/2,13,'#8f1d16');
    for(let x=-450;x<-300;x+=24){lamp(x,SN+6.3,y);lamp(x+12,SS-6.3,y);}
    dia(-383,SN-14);dia(-460,SS+6);
    town('oldq','Phố Cổ Đèn Lồng','Lantern Old Quarter',O.x,-600,110,600);
    addMesh(pave.geo(),new T.MeshStandardMaterial({map:TX.walk,color:lin('#c9b79a'),roughness:.95}),false);}

  /* ======== 2. CẢNG BẮC — North Harbour ======== */
  {const H=PL.harbor,y=H.y,QX0=446,QX1=538,QZ0=-736,QZ1=-574;
    PADS.push({x0:QX0,x1:QX1+.5,z0:QZ0,z1:QZ1,y:y+.05});
    const deck=new GB();deck.box(QX0,QX1,y-3,y+.05,QZ0,QZ1,{uw:4,uh:4,top:undefined});addMesh(deck.geo(),new T.MeshStandardMaterial({map:TX.walk,color:lin('#a7a39b'),roughness:.95}),true);
    vb(QX1-.4,QX1,y+.05,y+.25,QZ0,QZ1,'#e8c24a');for(let z=QZ0+4;z<QZ1;z+=8)vc(QX1-.6,y+.05,y+.6,z,.2,'#2a2e33');
    // three finger piers out into the sea, walkable
    for(const pz of[-716,-655,-594]){const p={x0:QX1-.5,x1:612,z0:pz-3,z1:pz+3,y:y-.15};PADS.push(p);AREAS.push({x0:QX0,x1:612,z0:pz-3.2,z1:pz+3.2});
      const g=new GB();for(let x=p.x0;x<p.x1;x+=.6)g.box(x,x+.52,p.y-.18,p.y,p.z0,p.z1,{uw:1,uh:1,top:undefined});addMesh(g.geo(),mat('#8a6a48',.85),true);
      for(let x=p.x0+2;x<p.x1;x+=4)for(const s of[p.z0+.2,p.z1-.2])vc(x,-2,p.y+.6,s,.16,'#5a4030');
      // boats moored on both sides
      for(const s of[-1,1]){if(RNG()<.25)continue;const bx=rr(560,595),bz=pz+s*7.5;BOATS.push({x:bx,z:bz,c:rp(['#e63946','#2a9d8f','#f4f1ea','#3a86ff','#ffb703']),len:rr(8,12),ph:RNG()*6});}}
    AREAS.push({x0:QX0,x1:QX1+.5,z0:QZ0,z1:QZ1});
    // containers and a gantry crane on the quay
    const CC=['#c0392b','#2e86de','#27ae60','#f39c12','#8e44ad','#16a085','#d35400'];
    for(let i=0;i<4;i++)for(let j=0;j<2;j++){const x0=462+j*7,z0=-650+i*3,n=1+Math.floor(RNG()*3);for(let k=0;k<n;k++){vb(x0,x0+6,y+k*2.6,y+k*2.6+2.55,z0,z0+2.5,rp(CC));}colX(x0,x0+6,z0,z0+2.5,n*2.6);}
    dia(476,-653.5);
    {const cz0=-700,cz1=-676,cx0=500,cx1=530,H2=y+26;for(const x of[cx0,cx1])for(const z of[cz0,cz1]){vb(x-.6,x+.6,y,H2,z-.6,z+.6,'#e8b400');addCol({t:'c',x,z,r:.8});}
      vb(cx0-.8,cx1+.8,H2,H2+1.6,cz0-.8,cz0+.8,'#e8b400');vb(cx0-.8,cx1+.8,H2,H2+1.6,cz1-.8,cz1+.8,'#e8b400');vb(cx0-12,cx1+26,H2+1.6,H2+3,(cz0+cz1)/2-1,(cz0+cz1)/2+1,'#e8b400');vb(cx0+6,cx0+12,H2+3,H2+6,(cz0+cz1)/2-2,(cz0+cz1)/2+2,'#33383f');
      for(let k=0;k<8;k++){const x=cx0+2+k*3.5;vb(x-.08,x+.08,y+1,H2,cz0-.1,cz0+.1,'#c99c00');}props.flood.push([cx0,cz0,H2+1],[cx1,cz1,H2+1]);}
    // warehouses and the fish market between the road and the quay
    const W2=['brick','brick','stone'];
    {const x0=404,x1=444;let z=-744;const plan=[[22,'ware','CHỢ CÁ CẢNG BẮC'],[18,'sea','NHÀ HÀNG HẢI SẢN BIỂN XANH'],[14,'mart','TẠP HOÁ BẾN CẢNG'],[30,'ware','KHO HÀNG 07'],[22,'ware','KHO HÀNG 08'],[20,'hotel','NHÀ NGHỈ THUYỀN TRƯỞNG']];
      for(const[d,room,nm]of plan){const z0=z,z1=z+d-2,h=room==='hotel'?13:room==='sea'?6:rr(8,10),k=room==='sea'?'decoWhite':room==='hotel'?'aptMint':rp(W2);const top=bld(k,x0,x1,z0,z1,y,h,true);
        const sea=room==='sea',dx=sea?x1:x0,hh=sea?Math.PI/2:-Math.PI/2;door(dx,(z0+z1)/2,hh,room,y,room==='ware'?3.6:1.8,room==='ware'?3.6:2.6,room==='ware'?'#5a5f66':'#2a3a48',room==='sea'?()=>L('Vào Nhà hàng Hải sản Biển Xanh','Enter the Blue Sea seafood restaurant'):null);
        sign(nm,dx+(sea?.08:-.08),y+Math.min(h-1,5),(z0+z1)/2,hh,Math.min(d-3,9),.9,{fg:'#fff',bg:sea?'#1d5f8a':room==='hotel'?'#2f6b4f':'#33383f',size:52,w:1024,h:110});
        if(sea){vb(x1,x1+6,y,y+.15,z0,z1,'#9a7a58');for(let k=0;k<3;k++){const tz=z0+3+k*5;vc(x1+3,y,y+.75,tz,.6,'#f4f1ea');vc(x1+3,y,y+2.6,tz,.04,'#ddd');VC.push({geo:new T.ConeGeometry(1.4,.7,10),pos:[x1+3,y+2.8,tz],color:rp(['#e63946','#2a9d8f','#ffb703'])});}}
        z+=d;}
      dia(x0-1.5,-695);}
    // fishermen's houses on the hillside west of the road
    {let z=-744;const KK=['aptMint','aptPeach','houseBlue','aptCream','houseWhite','aptLav'];while(z<-570){const d=rr(12,16),x1=380,x0=x1-rr(12,16),h=rr(7,14),k=rp(KK);bld(k,x0,x1,z,z+d,y,h,true);door(x1,z+d/2,Math.PI/2,'flat',y,1.4,2.4,'#5a3d28');z+=d+rr(3,6);}
      dia(358,-600);}
    for(let z=-740;z<-560;z+=20){lamp(399.5,z,y);lamp(384.5,z+10,y);}
    for(const p of[[392,-760],[300,-740],[310,-600]])tree(p[0],p[1],y,1);
    archSign('CẢNG BẮC NEXUS',392,-548,heightAt(392,-548),0,13,'#1d5f8a');dia(610,-594);dia(608,-716);
    town('harbor','Cảng Bắc','North Harbour',430,-655,110,600);}

  /* ======== 3. ĐỒI MÂY — Cloud Hill highland town ======== */
  {const Hh=PL.highland,y=Hh.y,Z=-1048,SN=Z-7.5,SS=Z+7.5;
    const pave=new GB();
    // villas with steep roofs, gardens and white fences
    const VK=['houseWhite','houseBlue','houseSage','houseYellow','houseWhite'];const villa=(x,side,room)=>{const w=11,d=9,z0=side<0?SN-6-d:SS+6,z1=z0+d,k=rp(VK),top=bld(k,x-w/2,x+w/2,z0,z1,y,6.6,false);
        hip(tileG,x-w/2,x+w/2,z0,z1,top,3.2,.7);vb(x+2,x+3,top,top+3.6,z0+2,z0+3,'#7a6a5a');
        const fz=side<0?z1:z0,o=side<0?1:-1;door(x,fz,side<0?0:Math.PI,room||'flat',y,1.5,2.5,'#2f4a5f');
        for(let t=-5;t<=5;t+=.6)vb(x+t-.04,x+t+.04,y,y+.9,fz+o*5.6-.04,fz+o*5.6+.04,'#f4f1ea');vb(x-5.5,x-.9,y+.75,y+.85,fz+o*5.6-.05,fz+o*5.6+.05,'#f4f1ea');vb(x+.9,x+5.5,y+.75,y+.85,fz+o*5.6-.05,fz+o*5.6+.05,'#f4f1ea');
        for(let t=0;t<16;t++)FLOW.push([x+rr(-5,5),y,fz+o*rr(1,4.8),rp(['#ff6b9a','#ffd166','#c77dff','#ff8fab','#f94144','#ffffff'])]);
        pave.flat(x-.8,x+.8,y+.04,Math.min(fz,fz+o*5.6),Math.max(fz,fz+o*5.6),2);};
    for(let x=-605;x<=-470;x+=27){if(x>-600)villa(x,-1);if(x<-480)villa(x,1);}
    // hotel
    {const x0=-640,x1=-616,z0=SN-16,z1=SN-2,top=bld('houseWhite',x0,x1,z0,z1,y,10,false);hip(tileG,x0,x1,z0,z1,top,4,.8);door((x0+x1)/2,z1,0,'hotel',y,2.4,2.8,'#2f4a5f',()=>L('Vào Khách sạn Đồi Mây','Enter the Cloud Hill Hotel'));
      sign('KHÁCH SẠN ĐỒI MÂY',(x0+x1)/2,y+7.6,z1+.08,0,8,1,{fg:'#ffffff',bg:'#3d5677',size:60,w:1024,h:128});}
    // stone church with a steeple
    {const x0=-458,x1=-442,z0=SS+4,z1=SS+34,cx=(x0+x1)/2;bld('stone',x0,x1,z0,z1,y,9,false);gable(tileG,x0,x1,z0,z1,y+9,4.5,'z',.4,'#cdbf9f');
      const tz0=z0-4,tz1=z0+1.5;bld('stone',cx-3,cx+3,tz0,tz1,y,20,false);hip(tileG,cx-3,cx+3,tz0,tz1,y+20,7,.3);vb(cx-.08,cx+.08,y+27,y+29.4,(tz0+tz1)/2-.08,(tz0+tz1)/2+.08,'#e8e1cf');vb(cx-.7,cx+.7,y+28.4,y+28.6,(tz0+tz1)/2-.08,(tz0+tz1)/2+.08,'#e8e1cf');
      VC.push({geo:new T.CircleGeometry(1.1,20).rotateY(Math.PI),pos:[cx,y+15,tz0-.02],color:'#f4f1ea'});
      door(cx,tz0,Math.PI,'church',y,2.2,3.4,'#5a3a22',()=>L('Vào Nhà thờ Đồi Mây','Enter Cloud Hill Church'));
      for(const t of[.3,.5,.7])vb(x1+.02,x1+.06,y+3,y+6.5,z0+(z1-z0)*t-.6,z0+(z1-z0)*t+.6,'#5a8fc9');dia(x0-1.8,z1-2);}
    // night market: striped stalls with string lights along the east end
    for(let x=-436;x<=-400;x+=6)for(const s of[-1,1]){const z=s<0?SN-2.4:SS+2.4;vb(x-2.2,x+2.2,y,y+.95,z-1,z+1,'#7a5a3a');for(const a of[-1,1])for(const b of[-1,1])vb(x+a*2.1-.05,x+a*2.1+.05,y,y+2.6,z+b*.95-.05,z+b*.95+.05,'#ddd');
      vb(x-2.4,x+2.4,y+2.6,y+2.75,z-1.3,z+1.3,rp(['#e63946','#2a9d8f','#ffb703','#7b2cbf']));for(let k=0;k<5;k++)VC.push({geo:BOX1,pos:[x-1.6+k*.8,y+1.05,z],scale:[.5,.2,.5],color:rp(['#f4a261','#e9c46a','#a33b20','#6a994e','#ff8fab'])});colX(x-2.2,x+2.2,z-1,z+1,2.7);}
    lanternString(-438,SN-1,-398,SN-1,y+3.4,.6,1.3);lanternString(-438,SS+1,-398,SS+1,y+3.4,.6,1.3);
    sign('CHỢ ĐÊM ĐỒI MÂY',-418,y+4.8,SN-1.2,0,7,1,{fg:'#ffd166',bg:'#3a1f4a',size:60,w:1024,h:128});
    for(let x=-620;x<-400;x+=22){lamp(x,SN-.6,y);lamp(x+11,SS+.6,y);}
    // ring of pines around the town
    for(let k=0;k<70;k++){const a=RNG()*6.28,r=rr(70,110),x=Hh.x+Math.cos(a)*r*1.3,z=Hh.z+Math.sin(a)*r*.75;if(Math.abs(z-Z)<12||rdW(x,z)<10)continue;pine(x,z,heightAt(x,z),rr(.8,1.4));}
    archSign('ĐỒI MÂY',-566,-1050,y,Math.PI/2,12,'#3d5677');
    dia(-610,SS+18);dia(-392,SN-6);dia(-520,SN-26);
    addMesh(pave.geo(),new T.MeshStandardMaterial({map:TX.walk,color:lin('#cfc6b4'),roughness:.95}),false);
    town('highland','Đồi Mây','Cloud Hill',-520,-1050,100,700);}

  /* ======== 4. MỎ BẠC — Silver Mine frontier town ======== */
  {const M=PL.minetown,y=M.y,Z=-800,SN=Z-7.6,SS=Z+7.6;const WOOD=['#8b5a3c','#a0703f','#6f4a2f','#b88b5a','#7d5236','#9c6b45'];
    for(const s of[-1,1]){const z0=s<0?Z-7.6:Z+4.9,z1=s<0?Z-4.9:Z+7.6;const g=new GB();for(let x=-1112;x<-992;x+=.55)g.box(x,x+.5,y+.05,y+.35,z0,z1,{uw:1,uh:1,top:undefined});addMesh(g.geo(),mat('#7a5a3e',.9),false);}
    const plan=[['saloon','SALOON CHIM ƯNG',16,9.5],['police','VĂN PHÒNG CẢNH SÁT TRƯỞNG',11,7],['mart','CỬA HÀNG TỔNG HỢP',12,7.5],['guns','THỢ SÚNG',9,7],['flat','TIỆM CẮT TÓC',8,6],['hotel','KHÁCH SẠN MỎ BẠC',14,10],['flat','',9,6.5],['diner','QUÁN ĂN THỢ MỎ',11,7],['ware','KHO QUẶNG',14,8],['flat','',9,6]];
    let xs={'-1':-1110,'1':-1110},i=0;
    for(const[room,nm,w,h]of plan){const s=i%2?1:-1;i++;const x0=xs[s],x1=x0+w;xs[s]=x1+rr(2,4);const z0=s<0?SN-12:SS,z1=s<0?SN:SS+12,col=rp(WOOD);
      vb(x0,x1,y-.5,y+h,z0,z1,col);colB(x0,x1,z0,z1,y+h);vb(x0-.1,x1+.1,y+h,y+h+.15,z0-.1,z1+.1,'#4a3424');
      const fz=s<0?z1:z0,o=s<0?1:-1;vb(x0,x1,y+h,y+h+2.4,fz-o*.15,fz+o*.05,col);vb(x0+.2,x1-.2,y+h+1.9,y+h+2.2,fz+o*.06,fz+o*.12,'#3a2a1c');
      for(let px=x0+.25;px<x1;px+=.32)vb(px-.015,px+.015,y,y+h,fz+o*.02,fz+o*.04,'#4a3424');
      vb(x0,x1,y+3.2,y+3.35,fz,fz+o*2.6,'#5a4030');for(const t of[x0+.3,x1-.3])vb(t-.1,t+.1,y,y+3.2,fz+o*2.5-.1,fz+o*2.5+.1,'#5a4030');
      for(const t of[.25,.75])vb(x0+w*t-.6,x0+w*t+.6,y+1.2,y+2.6,fz+o*.02,fz+o*.07,'#a9cfe0');
      if(nm)sign(nm,(x0+x1)/2,y+h+1.1,fz+o*.2,s<0?0:Math.PI,Math.min(w-1,9),1,{fg:'#f4e2c0',bg:'#3a2a1c',size:54,w:1024,h:120,font:'Georgia,serif'});
      const nmF=room==='saloon'?()=>L('Vào Saloon Chim Ưng','Enter the Eagle Saloon'):room==='police'?()=>L('Vào văn phòng cảnh sát trưởng','Enter the sheriff\'s office'):null;
      door((x0+x1)/2,fz,s<0?0:Math.PI,room,y,room==='saloon'?2.2:1.5,2.6,'#3a2414',nmF);
      if(room==='saloon'){vb(x0+2,x0+2.2,y,y+1.1,fz+o*3.2,fz+o*3.4,'#5a4030');vb(x0+1,x0+5,y+1,y+1.1,fz+o*3.2,fz+o*3.4,'#5a4030');}}
    // water tower, windmill, wagon, barrels
    {const x=-1080,z=-770;for(const a of[-1,1])for(const b of[-1,1])vb(x+a*2.4-.15,x+a*2.4+.15,y,y+9,z+b*2.4-.15,z+b*2.4+.15,'#5a4030');vc(x,y+9,y+13,z,3.2,'#7d5236');VC.push({geo:new T.ConeGeometry(3.5,1.6,12),pos:[x,y+13.8,z],color:'#4a3424'});addCol({t:'c',x,z,r:3});dia(x+4.5,z+3);}
    {const x=-985,z=-772,hb=y+11;vb(x-1.2,x+1.2,y,hb,z-1.2,z+1.2,'#a0703f');colB(x-1.2,x+1.2,z-1.2,z+1.2,hb);const g=new T.Group();g.position.set(x,hb-1,z+1.3);
      for(let k=0;k<4;k++){const b=new T.Mesh(new T.BoxGeometry(.5,5.5,.06),mat('#e9dfc9',.8));b.position.y=2.75;const p=new T.Group();p.rotation.z=k*Math.PI/2;p.add(b);g.add(p);}scene.add(g);MILLS.push(g);}
    for(const[bx,bz]of[[-1075,-764],[-1073.8,-764.6],[-1074.5,-763.3],[-990,-766],[-991,-767.2]]){vc(bx,y,y+1,bz,.4,'#6f4a2f');addCol({t:'c',x:bx,z:bz,r:.42});}
    {const x=-960,z=Z+14;vb(x-1.1,x+1.1,y+.7,y+1.5,z-2,z+2,'#8b5a3c');for(const a of[-1,1])for(const b of[-1.5,1.5])VC.push({geo:new T.CylinderGeometry(.6,.6,.12,12).rotateZ(Math.PI/2),pos:[x+a*1.15,y+.6,z+b],color:'#3a2a1c'});colX(x-1.2,x+1.2,z-2,z+2,1.6);}
    for(let x=-1100;x<-990;x+=20)lamp(x,SN+.8,y);
    archSign('MỎ BẠC',-990,Z,y,Math.PI/2,11,'#5a3a22');
    for(let k=0;k<40;k++){const a=RNG()*6.28,r=rr(55,95),x=M.x+Math.cos(a)*r,z=M.z+Math.sin(a)*r;if(Math.abs(z-Z)<26||rdW(x,z)<9||hyp(x+1080,z+770)<8||hyp(x+985,z+772)<6)continue;pine(x,z,heightAt(x,z),rr(.8,1.3));}
    dia(-1113,SN-13);dia(-998,SS+13);dia(-1045,SS+14);
    town('minetown','Thị trấn Mỏ Bạc','Silver Mine Town',M.x,Z,95,700);}

  /* ======== 5. NEXUS TÂY — West Nexus, a modern new town ======== */
  {const y=0,E=8.7;
    // downtown towers
    const tower=(k,x0,x1,z0,z1,h,dx,dz,dh)=>{let a0=x0,a1=x1,c0=z0,c1=z1,yy=y;const tiers=h>60?3:h>35?2:1;for(let t=0;t<tiers;t++){const th=t===tiers-1?h-yy:Math.round(h*(t===0?.55:.27));fb(k).box(a0,a1,yy,yy+th,c0,c1,{top:flatRoof,uo:RNG()});if(t===0)colB(a0,a1,c0,c1,h);yy+=th;const ins=Math.min(a1-a0,c1-c0)*.11;a0+=ins;a1-=ins;c0+=ins;c1-=ins;}
      vb(a0+1,a0+3,yy,yy+3,c0+1,c0+3,'#5a5f66');door(dx,dz,dh,'office',y,3,3.2,'#22323f',null);};
    tower('glassBlue',-1188,-1158,-26,6,86,-1173,6,0);tower('glassTeal',-1150,-1112,-24,16,64,-1112,-4,Math.PI/2);tower('glassSilver',-1188,-1140,36,80,52,-1164,80,0);tower('glassBronze',-1128,-1092,46,138,34,-1110,138,0);
    tower('glassSilver',-1300,-1262,-26,18,58,-1281,18,0);tower('glassBlue',-1250,-1212,-20,30,74,-1212,5,Math.PI/2);tower('decoWhite',-1300,-1260,44,90,22,-1280,90,0);
    {const x0=-1252,x1=-1212,z0=60,z1=138;bld('glassTeal',x0,x1,z0,z1,y,14,true);door(x1,90,Math.PI/2,'gym',y,2.4,2.8,'#22323f',null);door(x1,122,Math.PI/2,'clothes',y,2.4,2.8,'#22323f',null);
      sign('NEXUS FIT · THỜI TRANG TÂY',x1+.08,y+10,105,Math.PI/2,12,1.3,{fg:'#fff',bg:'#7b2cbf',size:56,w:1024,h:120});}
    // plaza with a fountain, cinema, mall, car showroom and café
    {const pz=new GB();pz.flat(-1071,-888,y+.06,-60,141,4);addMesh(pz.geo(),new T.MeshStandardMaterial({map:TX.walk,color:lin('#d9d2c4'),roughness:.9}),false);
      const fx=-980,fzz=50;vc(fx,y,y+.7,fzz,9,'#c9c2b3');vc(fx,y+.7,y+.72,fzz,8.4,'#3a8fb7');vc(fx,y,y+3,fzz,1,'#c9c2b3');vc(fx,y+3,y+3.3,fzz,2.6,'#c9c2b3');vc(fx,y+3.3,y+4.6,fzz,.4,'#c9c2b3');addCol({t:'c',x:fx,z:fzz,r:9.1});
      const jet=new T.Mesh(new T.CylinderGeometry(.15,.6,3,10,1,true),new T.MeshBasicMaterial({color:0xcfefff,transparent:true,opacity:.55}));jet.position.set(fx,y+6,fzz);scene.add(jet);WILD.anim.jet=jet;
      for(let a=0;a<6.28;a+=.785)tree(fx+Math.cos(a)*22,fzz+Math.sin(a)*22,y,1);
      {const x0=-1066,x1=-1026,z0=-55,z1=-12;bld('decoTeal',x0,x1,z0,z1,y,13,true);door(-1046,z1,0,'cinema',y,3.2,3,'#1d1f22',()=>L('Vào Rạp chiếu phim Nexus','Enter Nexus Cinema'));
        sign('RẠP PHIM NEXUS',-1046,y+9.6,z1+.08,0,14,2,{fg:'#ffd166',bg:'#1d1f22',size:80,w:1024,h:150});for(let k=0;k<12;k++)LANT['#ffcc33'].push([x0+2+k*3.3,y+12.2,z1+.3]);}
      {const x0=-950,x1=-893,z0=-55,z1=0;bld('glassSilver',x0,x1,z0,z1,y,16,true);door(-921,z1,0,'clothes',y,4,3.2,'#22323f',null);door(x0,-28,-Math.PI/2,'mart',y,2.4,2.8,'#22323f',null);
        sign('NEXUS TÂY MALL',-921,y+13,z1+.08,0,16,2,{fg:'#fff',bg:'#e63946',size:84,w:1024,h:150});}
      {const x0=-950,x1=-893,z0=88,z1=136;bld('glassBlue',x0,x1,z0,z1,y,9,true);door(-921,z0,Math.PI,'cars',y,4,3.2,'#22323f',null);sign('NEXUS MOTORS TÂY',-921,y+7,z0-.08,Math.PI,12,1.4,{fg:'#111',bg:'#c1f354',size:72,w:1024,h:130});}
      {const x0=-1066,x1=-1036,z0=100,z1=136;bld('decoPink',x0,x1,z0,z1,y,8,true);door(-1051,z0,Math.PI,'diner',y,2.2,2.8,'#22323f',null);sign('QUÁN CƠM TÂY THÀNH',-1051,y+6.2,z0-.08,Math.PI,10,1.2,{fg:'#3a2000',bg:'#ffb703',size:62,w:1024,h:128});
        for(let k=0;k<4;k++){const tz=z0-5,tx=x0+4+k*6.5;vc(tx,y,y+.75,tz,.6,'#f4f1ea');vc(tx,y,y+2.6,tz,.04,'#ddd');VC.push({geo:new T.ConeGeometry(1.5,.7,10),pos:[tx,y+2.8,tz],color:'#ffb703'});}}
      dia(-1069,-58);dia(-890,139);}
    // apartments
    {let x=-1190;while(x<-1110){const w=Math.min(rr(22,30),-1092-x);if(w<14)break;const k=rp(['aptPink','aptLav','aptCream','decoTeal','aptMint']);bld(k,x,x+w,165,205,y,rr(18,34),true);door(x+w/2,165,Math.PI,'flat',y,2,2.8,'#2a3038',null);bld(rp(['aptPink','aptLav','aptCream']),x,x+w,250,312,y,rr(14,26),true);door(x+w/2,312,0,'flat',y,2,2.8,'#2a3038',null);x+=w+6;}dia(-1150,228);}
    // villas with pools
    const villa=(cx,cz,face)=>{const w=14,d=11,x0=cx-w/2,z0=cz-d/2,k=rp(['houseWhite','houseBlue','white','houseSage']);bld(k,x0,x0+w,z0,z0+d,y,7,true);vb(x0+2,x0+8,y+7,y+7.4,z0+1,z0+d-1,'#f4f1ea');
      const pz=face>0?z0+d+3:z0-9;vb(x0+1,x0+10,y,y+.18,pz,pz+6,'#e8e4da');vb(x0+1.6,x0+9.4,y+.16,y+.19,pz+.6,pz+5.4,'#38b6d8');colX(x0+1,x0+10,pz,pz+6,.4);
      door(cx+4,face>0?z0+d:z0,face>0?0:Math.PI,'flat',y,1.6,2.6,'#3a2a1c',null);for(let t=0;t<3;t++)tree(x0+w+3,z0+t*5,y,.8);};
    for(const cx of[-1310,-1270,-1230])for(const cz of[180,225,270,315])villa(cx,cz,cz<250?-1:1);
    for(const cx of[-1050,-1010,-970,-930])villa(cx,400,-1);
    dia(-1330,330);dia(-912,425);
    // football pitch and park
    {const x0=-1060,x1=-960,z0=175,z1=305,g=new GB();g.flat(x0,x1,y+.05,z0,z1,6);addMesh(g.geo(),new T.MeshStandardMaterial({map:TX.grass,color:lin('#6fbf5a'),roughness:1}),false);
      const ln='#f4f4f2';vb(x0+2,x1-2,y+.06,y+.08,z0+2,z0+2.15,ln);vb(x0+2,x1-2,y+.06,y+.08,z1-2.15,z1-2,ln);vb(x0+2,x0+2.15,y+.06,y+.08,z0+2,z1-2,ln);vb(x1-2.15,x1-2,y+.06,y+.08,z0+2,z1-2,ln);vb(x0+2,x1-2,y+.06,y+.08,(z0+z1)/2-.07,(z0+z1)/2+.07,ln);
      for(const zz of[z0+2,z1-2]){const cx=(x0+x1)/2;vb(cx-3.7,cx-3.5,y,y+2.4,zz-.1,zz+.1,ln);vb(cx+3.5,cx+3.7,y,y+2.4,zz-.1,zz+.1,ln);vb(cx-3.7,cx+3.7,y+2.3,y+2.45,zz-.1,zz+.1,ln);}
      for(let z=z0;z<z1;z+=12){tree(-950,z+6,y,1.1);tree(-915,z,y,1);}dia(-905,240);}
    for(let x=-1320;x<-890;x+=24){lamp(x,150-E+.6,y);lamp(x+12,150+E-.6,y);}for(let z=-70;z<420;z+=24){lamp(-1080-E+.6,z,y);lamp(-1080+E-.6,z+12,y);}for(let z=-60;z<140;z+=24)lamp(-880-6.2,z,y);
    archSign('NEXUS TÂY',-800,-102,heightAt(-800,-102),Math.PI/2,12,'#2b6cb0');
    town('westside','Nexus Tây','West Nexus',-1100,150,190,800);}

  /* ======== build the shared meshes ======== */
  for(const k in FACG)if(FACG[k].p.length)addMesh(FACG[k].geo(),FAC[k],true);buildDetails();
  if(flatRoof.p.length)addMesh(flatRoof.geo(),ROOF,false);
  if(tileR.p.length)addMesh(tileR.geo(),SHINGLE.red,true);if(tileG.p.length)addMesh(tileG.geo(),SHINGLE.grey,true);
  for(const c in gw)addMesh(gw[c].geo(),mat(c,.9),false);
  for(let s=0;s<VC.length;s+=4000){const m=new T.Mesh(buildVC(VC.slice(s,s+4000)),new T.MeshStandardMaterial({vertexColors:true,roughness:.8}));m.castShadow=Q.shadows;m.receiveShadow=Q.shadows;scene.add(m);}
  if(STR.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(STR,3));scene.add(new T.LineSegments(g,new T.LineBasicMaterial({color:0x2a2420})));}
  {const lg=new T.SphereGeometry(.26,10,8);lg.scale(1,1.3,1);for(const c in LANT){const im=inst(lg,new T.MeshBasicMaterial({color:new T.Color(c),toneMapped:false}),LANT[c],(p,d)=>d.position.set(p[0],p[1],p[2]),false);if(im){im.frustumCulled=false;}}}
  {const pole=new T.CylinderGeometry(.08,.12,4.8,8);pole.translate(0,2.4,0);const head=new T.SphereGeometry(.32,10,8);head.translate(0,4.95,0);
    const im1=inst(pole,mat('#2b2f36',.5,.5),LAMPS,(p,d)=>d.position.set(p[0],p[1],p[2]),true),im2=inst(head,new T.MeshBasicMaterial({color:0xfff1c8,toneMapped:false}),LAMPS,(p,d)=>d.position.set(p[0],p[1],p[2]),false);for(const im of[im1,im2])if(im)im.frustumCulled=false;}
  {const pl=(p,d,i)=>{d.position.set(p[0],p[1]-.15,p[2]);d.scale.setScalar(p[3]);d.rotation.y=i*1.7;};
    const bt=new T.CylinderGeometry(.22,.32,3.2,6);bt.translate(0,1.6,0);const cn=new T.IcosahedronGeometry(2.4,0);cn.translate(0,4.4,0);
    instFol(BROADG2||(BROADG2=broadleafGeo({seed:5,cy:4.4,r:2.4,h:1.9,color:'#6a9e48'})),LEAFM,TREES,pl);
    const tr=new T.CylinderGeometry(.18,.3,3,6,1,true);tr.translate(0,1.5,0);const c1=new T.ConeGeometry(2.3,4.4,8,1,true);c1.translate(0,4.3,0);const c2=new T.ConeGeometry(1.7,3.6,8,1,true);c2.translate(0,6.6,0);const c3=new T.ConeGeometry(1.1,2.6,8,1,true);c3.translate(0,8.4,0);const cones=mergeGeos([c1,c2,c3]);cones.computeVertexNormals();
    instFol(PINEG||(PINEG=coniferGeo({seed:11})),NEEDLEM,PINES,pl);
    const fg=new T.SphereGeometry(.16,6,5);const groups={};for(const f of FLOW)(groups[f[3]]||(groups[f[3]]=[])).push(f);for(const c in groups){const im=inst(fg,mat(c,.7),groups[c],(p,d)=>{d.position.set(p[0],p[1]+.28,p[2]);},false);if(im)im.frustumCulled=false;}}
  // fishing boats that bob on the swell
  for(const b of BOATS){const g=new T.Group();const L2=b.len;g.add(new T.Mesh(buildVC([{geo:new T.BoxGeometry(2.6,1.1,L2),pos:[0,.35,0],color:b.c},{geo:new T.BoxGeometry(2.7,.18,L2+.1),pos:[0,.95,0],color:'#f4f1ea'},{geo:new T.CylinderGeometry(0,1.3,2.2,4).rotateX(Math.PI/2).rotateZ(Math.PI/4),pos:[0,.45,L2/2+1],color:b.c},
      {geo:new T.BoxGeometry(1.9,1.6,2.6),pos:[0,1.8,-L2*.15],color:'#f4f1ea'},{geo:new T.BoxGeometry(1.95,.5,2.65),pos:[0,2.2,-L2*.15],color:'#20303a'},{geo:new T.BoxGeometry(.12,4.5,.12),pos:[0,3,L2*.2],color:'#5a4030'},{geo:new T.BoxGeometry(.06,.06,L2*.6),pos:[0,4.8,0],color:'#5a4030'}]),new T.MeshStandardMaterial({vertexColors:true,roughness:.7})));
    g.position.set(b.x,.05,b.z);g.rotation.y=RNG()<.5?Math.PI/2:-Math.PI/2;g.children[0].castShadow=Q.shadows;scene.add(g);b.g=g;addCol({t:'b',x0:b.x-L2/2,x1:b.x+L2/2,z0:b.z-1.4,z1:b.z+1.4,h:3});}
  WILD.anim.boats=BOATS;WILD.anim.mills=MILLS;}

/* ---------- Nexus International Airport: built on reclaimed land off the south beach, joined to the city by a causeway.
   Runway 09/27, taxiway, apron with jet bridges, a walk-in glass terminal, control tower, hangars with planes you can fly ---------- */
const AIR={planes:[],gates:[],lights:[]};
function colX(x0,x1,z0,z1,h){return addCol({t:'b',x0,x1,z0,z1,h});}
function shapeBox(w,h,d,f,ws){const g=new T.BoxGeometry(w,h,d,ws||1,1,1);const p=g.attributes.position;for(let i=0;i<p.count;i++){const r=f(p.getX(i),p.getY(i),p.getZ(i));p.setXYZ(i,r[0],r[1],r[2]);}g.computeVertexNormals();return g;}
/* airliner, nose towards +z, wheels touch y=0 */
function airlinerGeo(liv,tail){const W='#f2f3f5',G='#c3c7cd',D='#18202b',P=[];
  const fus=new T.CylinderGeometry(2,2,26,20);fus.rotateX(Math.PI/2);P.push({geo:fus,pos:[0,3.2,0],color:W});
  P.push({geo:new T.SphereGeometry(2,20,12),pos:[0,3.2,13],scale:[1,1,2.1],color:W});
  const tc=new T.ConeGeometry(2,9,20);tc.rotateX(-Math.PI/2);P.push({geo:tc,pos:[0,3.7,-17.5],scale:[1,.82,1],color:W});
  P.push({geo:new T.BoxGeometry(4.1,.42,25.6),pos:[0,3.45,0],color:liv},{geo:new T.BoxGeometry(4.06,.5,25.6),pos:[0,2.15,0],color:G});
  const wb=new T.BoxGeometry(.06,.34,.3);for(let z=-11;z<=11.2;z+=.9)for(const s of[-1,1])P.push({geo:wb,pos:[s*1.86,3.95,z],color:D});
  for(const s of[-1,1])P.push({geo:new T.BoxGeometry(.07,1.8,.95),pos:[s*1.92,3.3,10.4],color:'#9aa1aa'});
  P.push({geo:new T.BoxGeometry(2.4,.42,1.1),pos:[0,4.05,14.4],color:D});
  P.push({geo:shapeBox(34,.45,6,(x,y,z)=>{const t=Math.abs(x)/17;return[x,y+t*1.1,z*(1-t*.62)-t*5];},2),pos:[0,2.35,1],color:W});
  for(const s of[-1,1]){const en=new T.CylinderGeometry(1.05,1.15,4.2,16);en.rotateX(Math.PI/2);P.push({geo:en,pos:[s*6.4,1.45,3],color:G});
    const ii=new T.CylinderGeometry(.88,.88,.1,16);ii.rotateX(Math.PI/2);P.push({geo:ii,pos:[s*6.4,1.45,5.12],color:D},{geo:new T.BoxGeometry(.3,.9,2.6),pos:[s*6.4,2.15,2.2],color:G});}
  P.push({geo:shapeBox(.4,7,6.5,(x,y,z)=>{const t=(y+3.5)/7;return[x*(1-t*.5),y,z*(1-t*.5)-t*3.6];}),pos:[0,8.4,-18.4],color:tail});
  P.push({geo:shapeBox(13,.3,3.6,(x,y,z)=>{const t=Math.abs(x)/6.5;return[x,y+t*.5,z*(1-t*.5)-t*2.2];},2),pos:[0,4.1,-19.6],color:W});
  const wh=new T.CylinderGeometry(.5,.5,.42,12);wh.rotateZ(Math.PI/2);
  P.push({geo:new T.CylinderGeometry(.12,.12,1.7,6),pos:[0,1.35,10.6],color:'#3a3f46'},{geo:wh,pos:[0,.5,10.6],color:'#15171a'});
  for(const s of[-1,1])P.push({geo:new T.CylinderGeometry(.16,.16,1.6,6),pos:[s*2.7,1.3,-.6],color:'#3a3f46'},{geo:wh,pos:[s*2.45,.5,-.6],color:'#15171a'},{geo:wh,pos:[s*2.95,.5,-.6],color:'#15171a'});
  return buildVC(P);}
/* small propeller plane, nose towards +z, wheels touch y=0 */
function cessnaGeo(liv){const W='#f4f4f2',D='#1c2430',P=[];
  P.push({geo:shapeBox(1.3,1.5,7.5,(x,y,z)=>{const t=Math.min(1,(z+3.75)/7.5*1.6);return[x*(.32+.68*t),y*(.42+.58*t)+(1-t)*.38,z];}),pos:[0,1.5,0],color:W});
  P.push({geo:new T.BoxGeometry(1.34,.16,6.4),pos:[0,1.25,.4],color:liv});
  for(const s of[-1,1])P.push({geo:new T.BoxGeometry(.06,.55,1.5),pos:[s*.66,2.0,1.6],color:D});
  P.push({geo:new T.BoxGeometry(1.1,.5,.06),pos:[0,2.0,2.45],color:D});
  P.push({geo:shapeBox(11,.16,1.6,(x,y,z)=>{const t=Math.abs(x)/5.5;return[x,y,z*(1-t*.3)];},2),pos:[0,2.38,1.2],color:W},{geo:new T.BoxGeometry(11.04,.17,.3),pos:[0,2.38,.55],color:liv});
  for(const s of[-1,1]){const st=new T.BoxGeometry(.07,1.2,.12);st.rotateZ(s*.95);P.push({geo:st,pos:[s*1.5,1.75,1.2],color:'#9aa1aa'});}
  P.push({geo:shapeBox(.14,1.6,1.4,(x,y,z)=>{const t=(y+.8)/1.6;return[x,y,z*(1-t*.4)-t*.5];}),pos:[0,2.6,-3.3],color:liv});
  P.push({geo:shapeBox(3.6,.1,1,(x,y,z)=>[x,y,z*(1-Math.abs(x)/1.8*.3)],2),pos:[0,1.85,-3.4],color:W});
  P.push({geo:new T.BoxGeometry(1.05,1,.6),pos:[0,1.5,4.0],color:W});const sp=new T.ConeGeometry(.24,.5,10);sp.rotateX(Math.PI/2);P.push({geo:sp,pos:[0,1.5,4.55],color:'#d1d5db'});
  const wh=new T.CylinderGeometry(.3,.3,.2,10);wh.rotateZ(Math.PI/2);P.push({geo:wh,pos:[0,.3,3.2],color:'#15171a'},{geo:new T.BoxGeometry(.08,.8,.08),pos:[0,.7,3.2],color:'#3a3f46'});
  for(const s of[-1,1]){P.push({geo:wh,pos:[s*1.1,.3,.6],color:'#15171a'});const g2=new T.BoxGeometry(.07,.9,.07);g2.rotateZ(s*.6);P.push({geo:g2,pos:[s*.75,.7,.6],color:'#3a3f46'});}
  return buildVC(P);}
const PLANEM=new T.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.25,envMapIntensity:.9}),SKYPM=new T.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.2,fog:false});
const NAVG=new T.SphereGeometry(.22,8,6),NAVR=new T.MeshBasicMaterial({color:'#ff3030',toneMapped:false}),NAVGN=new T.MeshBasicMaterial({color:'#30ff60',toneMapped:false}),NAVW=new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false});
function makePlane(type,liv,tail,o){o=o||{};const g=new T.Group(),inner=new T.Group();g.add(inner);g.rotation.order='YXZ';
  const geo=type==='cessna'?cessnaGeo(liv):airlinerGeo(liv,tail||liv),m=new T.Mesh(geo,o.sky?SKYPM:PLANEM);m.castShadow=Q.shadows&&!o.sky;inner.add(m);
  if(type==='jet')inner.scale.setScalar(.55);
  const span=type==='cessna'?5.5:17,ly=type==='cessna'?2.38:3.5,lz=type==='cessna'?1.2:-3.5;
  const l=new T.Mesh(NAVG,NAVR);l.position.set(span,ly,lz);const r=new T.Mesh(NAVG,NAVGN);r.position.set(-span,ly,lz);const s=new T.Mesh(NAVG,NAVW);s.position.set(0,type==='cessna'?3.4:11.8,type==='cessna'?-3.9:-22);inner.add(l,r,s);
  let prop=null;if(type==='cessna'){prop=new T.Mesh(new T.BoxGeometry(.13,2.1,.05),new T.MeshStandardMaterial({color:'#2a2c30',roughness:.6}));prop.position.set(0,1.5,4.66);inner.add(prop);}
  let glow=null;if(o.sky){glow=new T.Sprite(new T.SpriteMaterial({map:AIR.glowTex,color:'#ff6a6a',transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,toneMapped:false}));glow.scale.set(30,30,1);glow.position.y=2;inner.add(glow);}
  scene.add(g);return{type,g,inner,prop,strobe:s,glow,x:0,y:0,z:0,h:0,p:0,r:0,spd:0,thr:0,air:false};}
{const A={x0:-620,x1:660,z0:640,z1:1010},Y=AP.y,RZ=950,RW2=22.5,TZ=880;AIR.RZ=RZ;AIR.TZ=TZ;
  AIR.glowTex=makeTex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);},{repeat:false});
  const conc=makeTex(512,512,(g,w,h)=>{speckle(g,w,h,'#a9a59c',9000,.1);g.strokeStyle='rgba(60,55,50,.35)';g.lineWidth=2;for(let i=0;i<=w;i+=128){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke();}for(let i=0;i<14;i++){const x=Math.random()*w,y=Math.random()*h,r=10+Math.random()*40;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(40,35,30,.18)');gr.addColorStop(1,'rgba(40,35,30,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}});
  const CONC=new T.MeshStandardMaterial({map:conc,roughness:.9}),RWM=new T.MeshStandardMaterial({map:TX.asphalt,color:lin('#7d7d80'),roughness:.95});
  // platform, sea wall, grass
  {const gb=new GB();gb.box(A.x0,A.x1,-5,Y-.02,A.z0,A.z1,{uw:6,uh:6,ts:6});addMesh(gb.geo(),CONC,true);
    const gr=new GB();gr.flat(A.x0+2,A.x1-2,Y,A.z0+2,A.z1-2,8);addMesh(gr.geo(),new T.MeshStandardMaterial({map:TX.grass,color:lin('#b8c79a'),roughness:1}),false);}
  // concrete: landside road + parking, apron, hangar apron; asphalt: runway, taxiway, links
  const CG=new GB(),AG=new GB();
  CG.flat(-260,250,Y+.05,646,688,8);CG.flat(-340,620,Y+.05,750,870,8);CG.flat(280,620,Y+.05,700,760,8);CG.flat(-560,-370,Y+.05,690,760,8);
  AG.flat(-565,605,Y+.09,RZ-RW2,RZ+RW2,10);AG.flat(-545,585,Y+.085,TZ-11.5,TZ+11.5,10);for(const x of[-545,-200,200,585])AG.flat(x-11.5,x+11.5,Y+.08,TZ+11.5,RZ-RW2,10);AG.flat(-20,20,Y+.08,868,TZ-11.5,10);
  addMesh(CG.geo(),CONC,false);addMesh(AG.geo(),RWM,false);
  // markings
  {const WM=new GB(),YM=new GB(),y1=Y+.12;
    for(let x=-470;x<500;x+=50)WM.flat(x,x+30,y1,RZ-.45,RZ+.45,2);
    WM.flat(-565,605,y1,RZ-RW2+1,RZ-RW2+1.9,2);WM.flat(-565,605,y1,RZ+RW2-1.9,RZ+RW2-1,2);
    for(const[xa,dir]of[[-560,1],[600,-1]]){for(let k=0;k<12;k++){const z0=RZ-RW2+3+k*3.5+(k>5?3:0);WM.flat(Math.min(xa,xa+dir*30),Math.max(xa,xa+dir*30),y1,z0,z0+1.8,2);}
      for(const off of[150,300])for(const s of[-1,1]){const x0=xa+dir*off;WM.flat(Math.min(x0,x0+dir*22),Math.max(x0,x0+dir*22),y1,RZ+s*7-1.2,RZ+s*7+1.2,2);}}
    for(let x=-545;x<585;x+=6)YM.flat(x,x+4,y1-.01,TZ-.15,TZ+.15,2);
    for(const g of[-190,-100,-10])YM.flat(g-.15,g+.15,y1-.02,752,868,2);
    addMesh(WM.geo(),mat('#eeeeea',.6),false);addMesh(YM.geo(),mat('#f2c230',.6),false);
    for(const[x,t,ry]of[[-520,'09',-Math.PI/2],[560,'27',Math.PI/2]]){const pl=new T.Mesh(new T.PlaneGeometry(24,14),new T.MeshStandardMaterial({map:textTex(t,{w:256,h:150,size:140,fg:'#f2f2ee'}),transparent:true,roughness:.6}));pl.rotation.order='YXZ';pl.rotation.set(-Math.PI/2,ry,0);pl.position.set(x,Y+.125,RZ);scene.add(pl);}}
  // runway, threshold, taxiway and approach lights
  {const W=[],GN=[],RD=[],BL=[];for(let x=-560;x<=600;x+=60)for(const s of[-1,1])W.push([x,RZ+s*(RW2+.8)]);
    for(let z=RZ-RW2;z<=RZ+RW2;z+=4){GN.push([-566,z]);RD.push([606,z]);}
    for(let x=-545;x<=585;x+=30)for(const s of[-1,1])BL.push([x,TZ+s*12.2]);
    for(let x=620;x<=800;x+=20)for(const dz of[-6,-3,0,3,6])W.push([x,RZ+dz]);
    const lg=new T.BoxGeometry(.45,.35,.45);lg.translate(0,.18,0);
    for(const[LST,c]of[[W,'#fff6dc'],[GN,'#40ff70'],[RD,'#ff4040'],[BL,'#4f7dff']]){const im=inst(lg,new T.MeshBasicMaterial({color:c,toneMapped:false}),LST,(p,d)=>d.position.set(p[0],p[0]>A.x1?1.2:Y,p[1]),false);if(im)im.frustumCulled=false;}
    const pg=new T.CylinderGeometry(.12,.12,6,6);pg.translate(0,-2,0);const pp=[];for(let x=680;x<=800;x+=20)pp.push([x,RZ]);inst(pg,mat('#6a6e75',.6),pp,(p,d)=>d.position.set(p[0],1.2,p[1]),false);}
  // causeway: deck, road, sidewalks, rails, lamp posts
  {const z0=CW.z0,z1=CW.z1+4,dk=new GB();dk.box(-11,11,-4,Y-.01,z0+40,z1,{uw:6,uh:6,ts:6});addMesh(dk.geo(),CONC,true);
    const rd=new GB();rd.flat(-7.5,7.5,Y+.02,z0,z1,8);addMesh(rd.geo(),ASPH,false);const sw=new GB();sw.box(-10.5,-7.5,Y,Y+.15,z0,z1,{uw:4,uh:4,ts:4});sw.box(7.5,10.5,Y,Y+.15,z0,z1,{uw:4,uh:4,ts:4});addMesh(sw.geo(),new T.MeshStandardMaterial({map:TX.walk,roughness:.9}),false);
    const rl=new GB();for(const s of[-1,1]){rl.box(s*10.6-.1,s*10.6+.1,Y+.15,Y+1.1,z0+30,z1,{uw:2,uh:2,ts:2});}addMesh(rl.geo(),mat('#c9ccd1',.4,.6),false);
    const ym=new GB();for(let z=z0;z<z1;z+=6)ym.flat(-.12,.12,Y+.03,z,z+3.5,2);addMesh(ym.geo(),mat('#f2c230',.6),false);
    const pp=[];for(let z=z0+12;z<z1;z+=30)pp.push([-1,z]);for(const p of pp)props.flood.push([p[0]*9.8,p[1],Y+6.5]);
    const pl=new T.Mesh(new T.CylinderGeometry(.6,.8,6,10),CONC);for(let z=z0+60;z<z1;z+=24)for(const s of[-1,1]){const m=pl.clone();m.position.set(s*8,-3,z);scene.add(m);}
    sign(L('↓ SÂN BAY QUỐC TẾ NEXUS','↓ NEXUS INTERNATIONAL AIRPORT'),0,7.2,CW.z0+6,0,13,1.3,{fg:'#fff',bg:'#1f4f8a',size:44,w:1024,h:110});
    {const m=new T.Mesh(new T.BoxGeometry(.25,7,.25),mat('#8a8f96',.5,.6));for(const s of[-6.4,6.4]){const c=m.clone();c.position.set(s,3.5,CW.z0+6);scene.add(c);}}}
  /* ---- terminal: glass hall you can walk through, check-in islands, departures board, seats, café, three gates ---- */
  const TX0=-230,TX1=30,TZ0=690,TZ1=745,TH=16;AIR.term={x0:TX0,x1:TX1,z0:TZ0,z1:TZ1,h:TH};
  {const glassM=new T.MeshStandardMaterial({color:lin('#9fc3d6'),roughness:.08,metalness:.6,transparent:true,opacity:.38,envMapIntensity:1.4,side:T.DoubleSide,depthWrite:false});
    const floorT=makeTex(512,512,(g,w,h)=>{speckle(g,w,h,'#d9d6cf',6000,.06);g.strokeStyle='rgba(120,115,105,.35)';g.lineWidth=2;for(let i=0;i<=w;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke();}});
    const fl=new GB();fl.flat(TX0,TX1,Y+.1,TZ0,TZ1,6);const fm=addMesh(fl.geo(),new T.MeshStandardMaterial({map:floorT,roughness:.25,metalness:.1,emissive:lin('#4a4840'),emissiveIntensity:.35,envMapIntensity:.8}),false);
    // roof slab with a wavy overhang on the landside
    const rf=new GB();rf.box(TX0-4,TX1+4,TH,TH+1.2,TZ0-22,TZ1+5,{uw:8,uh:8,ts:8});addMesh(rf.geo(),mat('#e4e6e9',.5,.3),true);
    const cl=new GB();for(let x=TX0+6;x<TX1-4;x+=12)cl.box(x,x+8,TH-.35,TH-.05,TZ0+4,TZ1-4,{uw:2,uh:2,ts:2});const clm=addMesh(cl.geo(),new T.MeshBasicMaterial({color:'#fff7e6',toneMapped:false}),false);
    // glass walls with door gaps, solid end walls; colliders for every solid piece
    const wallSeg=(x0,x1,z,gaps)=>{let cur=x0;const segs=[];for(const g of gaps.sort((a,b)=>a-b)){segs.push([cur,g-4]);cur=g+4;}segs.push([cur,x1]);
      for(const[a,b]of segs){if(b-a<.5)continue;const m=new T.Mesh(new T.BoxGeometry(b-a,TH,.25),glassM);m.position.set((a+b)/2,Y+TH/2,z);scene.add(m);colB(a,b,z-.3,z+.3,TH);
        const mu=new GB();for(let x=a;x<=b;x+=4)mu.box(x-.08,x+.08,Y,Y+TH,z-.18,z+.18,{uw:1,uh:1,ts:1});mu.box(a,b,Y+TH*.5-.08,Y+TH*.5+.08,z-.18,z+.18,{uw:1,uh:1,ts:1});addMesh(mu.geo(),mat('#5c636b',.4,.7),false);}};
    wallSeg(TX0,TX1,TZ0,[-180,-100,-20]);wallSeg(TX0,TX1,TZ1,[-190,-100,-10]);
    for(const x of[TX0,TX1]){const m=new T.Mesh(new T.BoxGeometry(.8,TH,TZ1-TZ0),mat('#d8dadd',.6));m.position.set(x,Y+TH/2,(TZ0+TZ1)/2);scene.add(m);colB(x-.4,x+.4,TZ0,TZ1,TH);}
    // columns
    const col=new T.CylinderGeometry(.55,.55,TH,12);col.translate(0,TH/2,0);const cols=[];for(let x=TX0+20;x<TX1;x+=30)for(const z of[TZ0+12,TZ1-12])cols.push([x,z]);for(let x=TX0+5;x<TX1;x+=30)cols.push([x,TZ0-18]);
    inst(col,mat('#eceef0',.4,.2),cols,(p,d)=>d.position.set(p[0],Y,p[1]),true);cols.forEach(p=>addCol({t:'c',x:p[0],z:p[1],r:.6}));
    // check-in islands with belts and signs
    const P=[];['A','B','C','D'].forEach((k,i)=>{const x=TX0+28+i*44;P.push({geo:new T.BoxGeometry(22,1.1,2.2),pos:[x,Y+.55,TZ0+20],color:'#3d4a5c'},{geo:new T.BoxGeometry(22,.12,1.2),pos:[x,Y+1.16,TZ0+20],color:'#e9ecef'},{geo:new T.BoxGeometry(22,.5,1),pos:[x,Y+.3,TZ0+22],color:'#20252c'});colX(x-11,x+11,TZ0+18.8,TZ0+23,1.2);
      const s=sign(L('QUẦY ','CHECK-IN ')+k,x,Y+4.8,TZ0+19.8,Math.PI,6,1.1,{fg:'#fff',bg:'#1f4f8a',size:56,w:512,h:96});});
    // seats near the gates
    const seat=buildVC([{geo:new T.BoxGeometry(6,.12,.6),pos:[0,.48,0],color:'#2f6fa6'},{geo:new T.BoxGeometry(6,.6,.1),pos:[0,.8,-.28],color:'#2f6fa6'},{geo:new T.BoxGeometry(.1,.46,.5),pos:[-2.8,.23,0],color:'#6b7280'},{geo:new T.BoxGeometry(.1,.46,.5),pos:[2.8,.23,0],color:'#6b7280'}]);
    const seats=[];for(const gx of[-190,-100,-10])for(const dx of[-14,-7,7,14])for(const z of[TZ1-12,TZ1-9])seats.push([gx+dx,z]);inst(seat,new T.MeshStandardMaterial({vertexColors:true,roughness:.6}),seats,(p,d)=>d.position.set(p[0],Y+.06,p[1]),true);
    seats.forEach(p=>colX(p[0]-3,p[0]+3,p[1]-.4,p[1]+.4,1));
    // gate desks, gate signs
    for(const[i,gx]of[-190,-100,-10].entries()){P.push({geo:new T.BoxGeometry(4,1.1,1.2),pos:[gx-6,Y+.55,TZ1-4],color:'#2b3440'});colX(gx-8,gx-4,TZ1-4.6,TZ1-3.4,1.2);
      sign(L('CỬA ','GATE ')+(i+1)+(i===2?L(' · BAY NGẮM CẢNH',' · SIGHTSEEING'):''),gx,Y+5.5,TZ1-.6,Math.PI,i===2?9:4,1.1,{fg:'#111',bg:'#f2c230',size:i===2?44:56,w:i===2?1024:512,h:100});
      AIR.gates.push({x:gx-6,z:TZ1-5.6,tour:i===2});}
    // café and duty free
    P.push({geo:new T.BoxGeometry(10,1.1,2),pos:[TX1-14,Y+.55,TZ0+34],color:'#6b4a32'},{geo:new T.BoxGeometry(10,.1,2.2),pos:[TX1-14,Y+1.15,TZ0+34],color:'#e8e2d6'});colX(TX1-19,TX1-9,TZ0+33,TZ0+35,1.2);
    sign('NEXUS CAFÉ',TX1-14,Y+3.6,TZ0+33.2,Math.PI,5,1,{fg:'#fff',bg:'#6b4a32',size:56,w:512,h:100});
    P.push({geo:new T.BoxGeometry(18,3.2,6),pos:[TX0+20,Y+1.6,TZ1-24],color:'#e8e0d0'});colB(TX0+11,TX0+29,TZ1-27,TZ1-21,3.2);sign('DUTY FREE',TX0+20,Y+4,TZ1-20.9,0,7,1.2,{fg:'#111',bg:'#f6f1e6',size:60,w:512,h:96});
    {const hm=new T.Mesh(buildVC(P),new T.MeshStandardMaterial({vertexColors:true,roughness:.6}));hm.castShadow=hm.receiveShadow=Q.shadows;scene.add(hm);}
    // departures board
    const bt=makeTex(1024,512,(g,w,h)=>{g.fillStyle='#0b0f16';g.fillRect(0,0,w,h);g.fillStyle='#f2c230';g.font='700 46px Inter,sans-serif';g.fillText(L('KHỞI HÀNH · DEPARTURES','DEPARTURES'),30,60);g.font='600 34px "Courier New",monospace';
      const rows=[['08:40','NX101',L('Hà Nội','Hanoi'),'A1',L('Đúng giờ','On time')],['09:15','NX220','Đà Nẵng','A2',L('Lên máy bay','Boarding')],['10:05','NX318','Singapore','B4',L('Đúng giờ','On time')],['11:30','NX404','Tokyo','C2',L('Trễ 20p','Delayed 20m')],['12:10','NX777',L('Ngắm cảnh Nexus','Nexus sightseeing'),L('Cửa 3','Gate 3'),L('Mở bán vé','Tickets on sale')],['13:45','NX512','Seoul','D1',L('Đúng giờ','On time')],['15:20','NX090','Bangkok','B2',L('Đúng giờ','On time')]];
      rows.forEach((r,i)=>{const y=120+i*54;g.fillStyle=i%2?'#121927':'#0e1420';g.fillRect(20,y-38,w-40,50);g.fillStyle='#ffe9a6';g.fillText(r[0],34,y);g.fillStyle='#9ad1ff';g.fillText(r[1],170,y);g.fillStyle='#fff';g.fillText(r[2],330,y);g.fillStyle='#9ad1ff';g.fillText(r[3],700,y);g.fillStyle=/Trễ|Delayed/.test(r[4])?'#ff7a7a':'#7ef9a0';g.fillText(r[4],790,y);});},{repeat:false});
    for(const z of[TZ0+.5]){const b=new T.Mesh(new T.PlaneGeometry(16,8),new T.MeshBasicMaterial({map:bt,toneMapped:false}));b.position.set(-100,Y+10.5,TZ0+30);b.rotation.y=Math.PI;scene.add(b);const b2=b.clone();b2.rotation.y=0;b2.position.z=TZ0+30.05;scene.add(b2);}
    {const fr=new T.Mesh(new T.BoxGeometry(16.6,8.6,.3),mat('#2b2f36',.5,.5));fr.position.set(-100,Y+10.5,TZ0+30.02);scene.add(fr);}
    // big name on the landside roof edge
    sign(L('SÂN BAY QUỐC TẾ NEXUS','NEXUS INTERNATIONAL AIRPORT'),-100,TH+3.2,TZ0-22.4,Math.PI,46,4,{fg:'#ffffff',bg:'rgba(0,0,0,0)',size:70,w:1600,h:140,glow:'#9ad1ff'});
    // canopy columns over the drop-off lane
    props.flood.push([-200,668,Y+7],[-120,668,Y+7],[-40,668,Y+7],[20,668,Y+7]);
    sign(L('GA ĐI · DEPARTURES','DEPARTURES'),-100,Y+8.6,TZ0-21.7,Math.PI,12,1.4,{fg:'#fff',bg:'#1f4f8a',size:52,w:1024,h:120});
    AIR.arrive={x:-100,z:TZ0+40};SP.airport={x:-100,z:670};
    WILD.places.push({id:'airport',n:'Sân bay quốc tế Nexus',en:'Nexus International Airport',x:-100,z:700,r:60,rw:250});}
  // jet bridges + parked airliners at gates 1 and 2, the sightseeing airliner at gate 3
  {const jb=new T.BoxGeometry(4,3.4,22),jm=mat('#c9ced4',.5,.4);for(const gx of[-190,-100,-10]){const m=new T.Mesh(jb,jm);m.position.set(gx,Y+6.4,TZ1+11);m.castShadow=Q.shadows;scene.add(m);
      const pl=new T.Mesh(new T.CylinderGeometry(.45,.45,4.7,8),jm);pl.position.set(gx,Y+2.35,TZ1+16);scene.add(pl);addCol({t:'c',x:gx,z:TZ1+16,r:.6});}
    const liv=[['#1f4f8a','#1f4f8a'],['#c0392b','#c0392b'],['#16a34a','#c1f354']];[-190,-100,-10].forEach((gx,i)=>{const p=makePlane('airliner',liv[i][0],liv[i][1]);p.x=gx;p.z=TZ1+22+17;p.y=Y;p.h=Math.PI;p.g.position.set(p.x,p.y,p.z);p.g.rotation.y=p.h;colX(gx-2.2,gx+2.2,p.z-17.5,p.z+22,7);
      if(i===2){AIR.tour=p;p.home={x:p.x,z:p.z,h:p.h};}});}
  /* ---- control tower ---- */
  {const x=150,z=770,g=new T.Group();g.position.set(x,Y,z);scene.add(g);const sh=new T.Mesh(new T.CylinderGeometry(3.2,4.2,44,18),mat('#e7e8ea',.6));sh.position.y=22;sh.castShadow=Q.shadows;g.add(sh);
    const cab=new T.Mesh(new T.CylinderGeometry(7,5.5,5,8),new T.MeshStandardMaterial({color:lin('#2c4a60'),roughness:.1,metalness:.7,envMapIntensity:1.4}));cab.position.y=46.5;g.add(cab);
    const rf=new T.Mesh(new T.CylinderGeometry(7.6,7.6,1,8),mat('#d0d3d8',.5));rf.position.y=49.5;g.add(rf);const ant=new T.Mesh(new T.CylinderGeometry(.12,.12,8,6),mat('#8a8f96',.4,.7));ant.position.y=54;g.add(ant);
    const bc=new T.Mesh(new T.SphereGeometry(.45,10,8),new T.MeshBasicMaterial({color:'#5cff8a',toneMapped:false}));bc.position.y=58.2;g.add(bc);AIR.beacon=bc;addCol({t:'c',x,z,r:4.3});
    sign(L('ĐÀI KIỂM SOÁT','CONTROL TOWER'),x,Y+4,z-4.35,Math.PI,6,1,{fg:'#fff',bg:'#3b4048',size:50,w:512,h:90});}
  /* ---- hangars with planes you can fly ---- */
  {const hm=new T.MeshStandardMaterial({map:conc,color:lin('#b9bec4'),roughness:.6,metalness:.4,side:T.DoubleSide});AIR.hangars=[];
    for(const[i,cx]of[345,440,535].entries()){const zb=700,zf=760,Wd=76,H=18;const arch=new T.CylinderGeometry(1,1,zf-zb,24,1,true,-Math.PI/2,Math.PI);arch.rotateX(-Math.PI/2);
      const m=new T.Mesh(arch,hm);m.scale.set(Wd/2,H,1);m.position.set(cx,Y,(zb+zf)/2);m.castShadow=Q.shadows;scene.add(m);
      const back=new T.Mesh(new T.CircleGeometry(1,24,0,Math.PI),hm);back.scale.set(Wd/2,H,1);back.position.set(cx,Y,zb);scene.add(back);
      const rim=new T.Mesh(new T.TorusGeometry(1,.012,6,32,Math.PI),mat('#d64532',.5));rim.scale.set(Wd/2,H,40);rim.position.set(cx,Y,zf);scene.add(rim);
      colB(cx-Wd/2,cx-Wd/2+1.2,zb,zf,H*.6);colB(cx+Wd/2-1.2,cx+Wd/2,zb,zf,H*.6);colB(cx-Wd/2,cx+Wd/2,zb-.6,zb+.6,H);
      sign(L('NHÀ CHỨA ','HANGAR ')+(i+1),cx,Y+H*.78,zf+.2,0,12,1.6,{fg:'#fff',bg:'#3b4048',size:60,w:640,h:100});
      for(let k=0;k<3;k++)props.flood.push([cx-20+k*20,zf-14,Y+H*.75]);AIR.hangars.push({x:cx,z:(zb+zf)/2});}}
  /* ---- fuel farm, windsock, ground vehicles ---- */
  {const P=[];for(const[x,z]of[[-520,712],[-480,712],[-440,712],[-520,742],[-480,742]]){P.push({geo:new T.CylinderGeometry(8,8,9,20),pos:[x,Y+4.5,z],color:'#e8e9eb'},{geo:new T.CylinderGeometry(8.2,8.2,.6,20),pos:[x,Y+9.2,z],color:'#c9ccd1'});addCol({t:'c',x,z,r:8.2});}
    P.push({geo:new T.CylinderGeometry(.12,.12,7,6),pos:[-450,Y+3.5,905],color:'#d8dbe0'});
    for(const[x,z,c]of[[-260,820,'#f2c230'],[-150,826,'#f2c230'],[60,830,'#e8e9eb'],[-60,812,'#3d6ea8']]){P.push({geo:new T.BoxGeometry(2.4,1.6,5),pos:[x,Y+1.2,z],color:c},{geo:new T.BoxGeometry(2.2,1.1,1.8),pos:[x,Y+2.3,z+1.4],color:'#2b3440'});colX(x-1.2,x+1.2,z-2.5,z+2.5,2.5);}
    const m=new T.Mesh(buildVC(P),new T.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.2}));m.castShadow=Q.shadows;scene.add(m);
    const sock=new T.Mesh(new T.ConeGeometry(.7,4,12,1,true),new T.MeshStandardMaterial({color:lin('#ff7a1a'),side:T.DoubleSide,roughness:.8}));sock.rotation.z=Math.PI/2;sock.position.set(-448,Y+6.6,905);scene.add(sock);AIR.sock=sock;}
  // parked cars in the car park
  for(let k=0;k<8;k++)WILD.parks.push([pick(['sedan','suv','sports','taxi']),80+k*16,712,0,null]);
  /* ---- flyable planes: two Cessnas and a private jet ---- */
  AIR.fly=[['cessna',345,730,0,'#c0392b'],['jet',440,730,0,'#1f2937'],['cessna',535,730,0,'#1f4f8a'],['cessna',-300,840,Math.PI/2,'#16a34a']].map(([t,x,z,h,c])=>{const p=makePlane(t,c,c);p.x=x;p.z=z;p.h=h;p.y=Y;p.home={x,z,h};p.flyable=true;p.g.position.set(x,Y,z);p.g.rotation.y=h;AIR.planes.push(p);return p;});
  /* ---- airliners crossing the sky and one that lands and takes off here ---- */
  AIR.sky=[[1500,420,.034,'#1f4f8a'],[2100,520,-.028,'#c0392b'],[1100,330,.045,'#16a34a']].map(([R,alt,w,c],i)=>{const p=makePlane('airliner',c,c,{sky:true});p.R=R;p.alt=alt;p.w=w;p.a=i*2.1;return p;});
  AIR.traffic=makePlane('airliner','#7c3aed','#7c3aed');AIR.traffic.st='wait';AIR.traffic.t=8;AIR.traffic.g.visible=false;
}
/* ---------- contact shadow round the foot of every building (fake ambient occlusion) ---------- */
{const gb=new GB(),Wd=2.4;const tex=makeTex(8,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.35,'rgba(0,0,0,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');g.clearRect(0,0,w,h);g.fillStyle=gr;g.fillRect(0,0,w,h);},{repeat:false,srgb:false});
  for(const c of blds){if(c.x0>2400||c.h<2.2)continue;const cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2,b=blockAt(cx,cz);const y=(b&&cx>b.x0&&cx<b.x1&&cz>b.z0&&cz<b.z1?.25:heightAt(cx,cz))+.035;if(Math.abs(heightAt(c.x0,c.z0)-heightAt(c.x1,c.z1))>1.5)continue;
    const{x0,x1,z0,z1}=c;const q=(a,b2,cc,d)=>gb.quad(a,b2,cc,d,[0,1,0],[[0,0],[1,0],[1,1],[0,1]]);
    q([x0,y,z1],[x1,y,z1],[x1+Wd,y,z1+Wd],[x0-Wd,y,z1+Wd]);q([x1,y,z0],[x0,y,z0],[x0-Wd,y,z0-Wd],[x1+Wd,y,z0-Wd]);q([x1,y,z1],[x1,y,z0],[x1+Wd,y,z0-Wd],[x1+Wd,y,z1+Wd]);q([x0,y,z0],[x0,y,z1],[x0-Wd,y,z1+Wd],[x0-Wd,y,z0-Wd]);}
  const geo=gb.geo();const fixUV=geo.attributes.uv;for(let i=0;i<fixUV.count;i+=4){fixUV.setXY(i,.5,0);fixUV.setXY(i+1,.5,0);fixUV.setXY(i+2,.5,1);fixUV.setXY(i+3,.5,1);}
  const m=new T.Mesh(geo,new T.MeshBasicMaterial({map:tex,transparent:true,opacity:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false}));m.renderOrder=1;m.frustumCulled=false;scene.add(m);}
/* ---------- extra city dressing (all instanced or merged: a handful of draw calls) ---------- */
const SMI={};
const VCM=new T.MeshStandardMaterial({vertexColors:true,roughness:.85}),VCMI=new T.MeshStandardMaterial({vertexColors:true,roughness:.85});
// round street/park trees: trunk + lumpy canopy merged into one vertex-coloured geometry, one InstancedMesh
{const can=new T.IcosahedronGeometry(1.9,1);const cp=can.attributes.position;for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),k=1+Math.sin(x*3.1+z*2.3)*.12+Math.cos(y*4.2)*.08;cp.setXYZ(i,x*k,y*k*.85,z*k);}can.computeVertexNormals();
  const can2=new T.IcosahedronGeometry(1.3,1);
  const g=broadleafGeo({seed:3,cy:4.1,r:2.0,h:1.6});const im=instFol(g,LEAFM,props.tree,(p,d,i)=>{d.position.set(p[0],.25,p[1]);d.rotation.y=i*1.7;d.scale.setScalar(p[2]);});
  if(im){const c=new T.Color();props.tree.forEach((p,i)=>{c.setHSL(.2+((i*13)%10)/90,.25+((i*7)%10)/50,.72+((i*11)%10)/60);c.multiplyScalar(1.25);im.setColorAt(i,c);});im.instanceColor.needsUpdate=true;}}
// hydrants and bins
{const hy=buildVC([{geo:new T.CylinderGeometry(.16,.18,.7,10),pos:[0,.35,0],color:'#c8281e'},{geo:new T.SphereGeometry(.17,10,6,0,Math.PI*2,0,Math.PI/2),pos:[0,.7,0],color:'#c8281e'},{geo:new T.CylinderGeometry(.06,.06,.42,6).rotateZ(Math.PI/2),pos:[0,.48,0],color:'#d8d8d8'}]);
  SMI.hyd=inst(hy,VCM,props.hydrant,(p,d)=>d.position.set(p[0],.25,p[1]),true);
  const bn=buildVC([{geo:new T.CylinderGeometry(.32,.27,.95,12),pos:[0,.475,0],color:'#2f6b4a'},{geo:new T.CylinderGeometry(.35,.35,.08,12),pos:[0,.98,0],color:'#24302a'}]);
  SMI.bin=inst(bn,VCM,props.bin,(p,d)=>d.position.set(p[0],.25,p[1]),true);
  const mb=buildVC([{geo:new T.BoxGeometry(.5,.62,.42),pos:[0,.78,0],color:'#2459b8'},{geo:new T.CylinderGeometry(.21,.21,.5,12,1,false,0,Math.PI).rotateZ(Math.PI/2),pos:[0,1.09,0],color:'#2459b8'},{geo:new T.BoxGeometry(.1,.47,.1),pos:[0,.235,0],color:'#2a2e35'},{geo:new T.BoxGeometry(.3,.04,.02),pos:[0,.98,.22],color:'#0e1830'},{geo:new T.BoxGeometry(.36,.1,.02),pos:[0,.7,.22],color:'#f2f2f2'}]);
  SMI.mail=inst(mb,VCM,props.mail,(p,d)=>{d.position.set(p[0],.25,p[1]);d.rotation.y=p[2]===0?Math.PI:p[2]===1?0:p[2]===2?-Math.PI/2:Math.PI/2;},true);
  for(const k in SMI)if(SMI[k]){SMI[k].frustumCulled=false;SMI[k].instanceMatrix.setUsage(T.DynamicDrawUsage);}}
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
  const pier=new GB();const pz=HALF-70,px0=Math.round(shoreE(HALF-70)-24),px1=px0+130;pier.box(px0,px1,1.1,1.5,pz-5,pz+5,{uw:4,uh:4,top:pier,ts:3});
  for(let x=px0+4;x<px1;x+=8)for(const s of[-4.4,4.4])pier.box(x-.25,x+.25,-2,1.1,pz+s-.25,pz+s+.25,{uw:4,uh:4,top:null});
  for(const s of[-4.9,4.9])pier.box(px0,px1,1.5,2.4,pz+s-.08,pz+s+.08,{uw:4,uh:4,top:pier,ts:3});
  addMesh(pier.geo(),new T.MeshStandardMaterial({map:TX.walk,color:lin('#b08a64'),roughness:.9}),true);FW.pier={x0:px0,x1:px1,z:pz};}
function fwUpdate(dt){const a=time*.06;FW.g.children[0].rotation.x=a;FW.g.children[1].rotation.x=a;if(hyp(FW.x-P.x,FW.z-P.z)>Q.cull+120)return;
  for(let k=0;k<12;k++){const t=a+k/12*Math.PI*2;dummy.position.set(FW.x,FW.y+Math.cos(t)*FW.R,FW.z+Math.sin(t)*FW.R);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();FW.cabs.setMatrixAt(k,dummy.matrix);}FW.cabs.instanceMatrix.needsUpdate=true;}
// distant hills ring (land side only), haze-blended in display space like the sky
const hillMat=new T.ShaderMaterial({fog:false,side:T.DoubleSide,uniforms:{haze:{value:new T.Color('#ffc48c')},hk:{value:.45},lk:{value:1}},
  vertexShader:'attribute vec3 color;varying vec3 vC;varying float vH;void main(){vC=color;vH=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 haze;uniform float hk,lk;varying vec3 vC;varying float vH;void main(){float k=clamp(hk+(1.-smoothstep(0.,90.,vH))*.25,0.,1.);gl_FragColor=vec4(mix(vC*lk,haze,k),1.);}'});
{const SEG=180,RR=[1750,1850,2000,2150,2300],pos=[],col=[],idx=[];const fb=a=>{let v=0,amp=1,f=1;for(let o=0;o<4;o++){v+=amp*(Math.sin(a*f*3+o*1.7)*.5+Math.sin(a*f*7.3+o*4.1)*.3+.8);amp*=.5;f*=2.1;}return v/3;};
  const L=new T.Vector3(.6,.7,-.4).normalize();
  for(let s=0;s<=SEG;s++){const a=s/SEG*Math.PI*2,cx=Math.cos(a),cz=Math.sin(a),w=clamp((.25-cx)/.45,0,1),w2=w*w*(3-2*w),H=(120+220*fb(a))*w2;
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
  query(c.x,c.z,CO+CR+.6,col=>{if((col.lamp==null&&!col.smash)||col.off)return;for(const o of[CO,0,-CO]){if(hyp(c.x+fx*o-col.x,c.z+fz*o-col.z)<CR){if(col.lamp!=null){knockLamp(col.lamp,c.vx/sp,c.vz/sp,c===P.car);c.vx*=.78;c.vz*=.78;}else{smashProp(col,c.vx/sp,c.vz/sp,sp,c===P.car);const k=col.smash.k==='tl'?.82:.93;c.vx*=k;c.vz*=k;}break;}}});}
/* small street props fly off, traffic lights topple, hydrants burst into a fountain */
const SMF=[],JETS=[];const jetMat=new T.MeshBasicMaterial({color:'#d9f0ff',transparent:true,opacity:.55,depthWrite:false});
{const jg=new T.CylinderGeometry(.08,.55,5.5,10,1,true);jg.translate(0,2.75,0);const sg=new T.CircleGeometry(1.6,16);sg.rotateX(-Math.PI/2);
  for(let k=0;k<4;k++){const g=new T.Group();g.add(new T.Mesh(jg,jetMat));const sp=new T.Mesh(sg,jetMat);sp.position.y=.02;g.add(sp);g.visible=false;scene.add(g);JETS.push({g,t:0});}}
function smPose(f){const S=f.col.smash;if(S.k==='tl'){const q=_q.setFromAxisAngle(f.ax,f.ang),B=_v1.set(f.x,.25,f.z);
    for(const[k,ox,oy,oz]of[['pole',0,0,0],['head',0,0,0],['ns',0,5.4,.27],['ew',.27,4.9,0]]){dummy.position.set(ox,oy,oz).applyQuaternion(q).add(B);dummy.quaternion.copy(q);dummy.scale.set(1,1,1);dummy.updateMatrix();TL[k].setMatrixAt(S.i,dummy.matrix);TL[k].instanceMatrix.needsUpdate=true;}return;}
  const im=SMI[S.k];dummy.position.set(f.px,f.py,f.pz);dummy.rotation.set(f.rx,f.ry,f.rz);dummy.scale.set(1,1,1);dummy.updateMatrix();im.setMatrixAt(S.i,dummy.matrix);im.instanceMatrix.needsUpdate=true;}
function smashProp(col,dx,dz,sp,byPlayer){col.off=true;const S=col.smash,f={col,x:col.x,z:col.z,t:0,respawn:S.k==='tl'?120:90,live:1};
  if(S.k==='tl'){f.ax=new T.Vector3(dz,0,-dx).normalize();f.ang=0;}
  else{const v=Math.min(sp,30);f.px=col.x;f.py=.25;f.pz=col.z;f.vx=dx*v*.75+rnd(-1.5,1.5);f.vz=dz*v*.75+rnd(-1.5,1.5);f.vy=3+v*.22;f.rx=0;f.ry=S.k==='mail'?SMI.mail&&0:0;f.rz=0;f.wx=rnd(-6,6);f.wy=rnd(-4,4);f.wz=rnd(-6,6);
    if(S.k==='mail'){const p=props.mail[S.i];f.ry=p[2]===0?Math.PI:p[2]===1?0:p[2]===2?-Math.PI/2:Math.PI/2;}
    if(S.k==='hyd'){const j=JETS.find(j=>j.t<=0)||JETS[0];j.t=22;j.g.position.set(col.x,.25,col.z);j.g.visible=true;}}
  SMF.push(f);if(byPlayer){sfx('crash');cam.shake=Math.max(cam.shake,S.k==='tl'?.2:.08);}fx3(col.x,.8,col.z,S.k==='hyd');}
function smashUpdate(dt){for(let k=SMF.length-1;k>=0;k--){const f=SMF[k],S=f.col.smash;
    if(f.live){f.t+=dt;if(S.k==='tl'){const u=Math.min(1,f.t/.9),top=Math.PI/2-.06;let a=top*u*u;if(f.t>.9){const b=Math.min(1,(f.t-.9)/.5);a=top-Math.sin(b*Math.PI)*.1*(1-b);}f.ang=a;if(f.t>1.4)f.live=0;}
      else{f.vy-=20*dt;f.px+=f.vx*dt;f.py+=f.vy*dt;f.pz+=f.vz*dt;f.rx+=f.wx*dt;f.ry+=f.wy*dt;f.rz+=f.wz*dt;const b=blockAt(f.px,f.pz),gy=(b&&f.px>b.x0&&f.px<b.x1&&f.pz>b.z0&&f.pz<b.z1?.25:heightAt(f.px,f.pz))+.15;
        if(f.py<gy){f.py=gy;if(f.vy<-2){f.vy*=-.3;f.vx*=.55;f.vz*=.55;f.wx*=.5;f.wy*=.5;f.wz*=.5;}else{f.vy=0;f.vx*=.8;f.vz*=.8;f.wx*=.7;f.wy*=.7;f.wz*=.7;}
          if(hyp(f.vx,f.vz)<.3&&f.t>1){f.live=0;f.rx=Math.round(f.rx/(Math.PI/2))*(Math.PI/2);f.rz=Math.round(f.rz/(Math.PI/2))*(Math.PI/2);f.py=gy-.15+(Math.abs(Math.sin(f.rx))+Math.abs(Math.sin(f.rz))>.5?.25:0);}}
        if(f.t>6)f.live=0;}
      smPose(f);}
    else{f.respawn-=dt;if(f.respawn<=0&&hyp(f.x-P.x,f.z-P.z)>80){f.col.off=false;if(S.k==='tl'){f.ang=0;}else{f.px=f.x;f.py=.25;f.pz=f.z;f.rx=f.rz=0;f.ry=0;if(S.k==='mail'){const p=props.mail[S.i];f.ry=p[2]===0?Math.PI:p[2]===1?0:p[2]===2?-Math.PI/2:Math.PI/2;}}smPose(f);SMF.splice(k,1);}}}
  for(const j of JETS){if(j.t<=0)continue;j.t-=dt;const a=Math.min(1,j.t/3);j.g.scale.set(1+Math.sin(time*23)*.06,(.85+Math.sin(time*17)*.08+Math.sin(time*5.3)*.05)*a,1+Math.cos(time*19)*.06);if(j.t<=0)j.g.visible=false;}
  jetMat.opacity=.4+Math.sin(time*11)*.08;}
/* car headlight beams on the road at night (nearest cars only, one instanced draw) */
const BEAMN=MOBILE?8:18;let BEAM=null;
{const tex=makeTex(128,256,(g,w,h)=>{const id=g.createImageData(w,h),D=id.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=1-y/(h-1),u=(x/(w-1))*2-1,wid=.3+.7*Math.sqrt(v),e=1-Math.abs(u)/wid;
      const a=e<=0?0:Math.pow(Math.min(1,e*1.4),1.2)*Math.pow(1-v,.75)*Math.min(1,v/.04)*(.75+.25*Math.cos(u*9)*(1-v));const o=(y*w+x)*4;D[o]=255;D[o+1]=246;D[o+2]=220;D[o+3]=Math.round(clamp(a,0,1)*255);}g.putImageData(id,0,0);},{repeat:false});
  const g=new T.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);g.rotateY(Math.PI);g.translate(0,0,.5);
  const m=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,opacity:0,polygonOffset:true,polygonOffsetFactor:-4});
  BEAM=new T.InstancedMesh(g,m,BEAMN);BEAM.frustumCulled=false;BEAM.count=0;BEAM.renderOrder=1;BEAM.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(BEAM);}
const _bl=[];
function beamUpdate(){const nk=1-tod.day;if(nk<.08||P.inside){BEAM.visible=false;return;}BEAM.visible=true;BEAM.material.opacity=Math.min(1,(nk-.08)*1.4)*.5;
  const cp=camera.position;_bl.length=0;for(const c of cars){if(!c.mesh.visible||c.hp<=0)continue;const d=hyp(c.x-cp.x,c.z-cp.z);if(d<170)_bl.push([d,c]);}_bl.sort((a,b)=>a[0]-b[0]);
  const n=Math.min(BEAMN,_bl.length);for(let k=0;k<n;k++){const c=_bl[k][1],fx=Math.sin(c.h),fz=Math.cos(c.h),L=(c.spec&&c.spec.len||4.6)/2-.2,x=c.x+fx*L,z=c.z+fz*L;
    dummy.position.set(x,heightAt(x+fx*6,z+fz*6)+.06,z);dummy.rotation.set(0,c.h,0);dummy.scale.set(9,1,19);dummy.updateMatrix();BEAM.setMatrixAt(k,dummy.matrix);}
  BEAM.count=n;BEAM.instanceMatrix.needsUpdate=true;}
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
{for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const sx=i<N?1:-1,sz=j<N?1:-1;const x=road(i)+sx*(RW/2+1.1),z=road(j)+sz*(RW/2+1.1),o={i,j,x,z};TL.push(o);o.col=addCol({t:'c',x,z,r:.22});o.col.smash={k:'tl',i:TL.length-1};}
  const pole=new T.CylinderGeometry(.1,.12,5.2,8);pole.translate(0,2.6,0);const head=new T.BoxGeometry(.5,1.2,.5);head.translate(0,5.4,0);
  TL.pole=inst(pole,mat('#2c2f33',.5,.6),TL,(p,d)=>d.position.set(p.x,.25,p.z),true);TL.head=inst(head,mat('#1c1e21',.6,.4),TL,(p,d)=>d.position.set(p.x,.25,p.z),false);
  const lamp=new T.SphereGeometry(.17,10,8);
  TL.ns=inst(lamp,new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),TL,(p,d)=>d.position.set(p.x,5.65,p.z+.27),false);
  TL.ew=inst(lamp,new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),TL,(p,d)=>d.position.set(p.x+.27,5.15,p.z),false);
  for(const k of['pole','head','ns','ew']){TL[k].frustumCulled=false;TL[k].instanceMatrix.setUsage(T.DynamicDrawUsage);}}
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
/* realistic-ish people: smooth lathe-turned bodies, face with eyes, brows, ears and mouth, real hair styles, hands, sneakers, jackets */
const HG2=(()=>{const V=(x,y)=>new T.Vector2(x,y);
  const limb=(r0,r1,len,bul)=>{const p=[];const n=5;for(let i=0;i<=n;i++){const a=i/n*Math.PI/2;p.push(V(Math.sin(a)*r1,-len-Math.cos(a)*r1*.7));}
    p.push(V(r1*1.03,-len*.78),V((r0+r1)/2*(1+bul),-len*.42),V(r0*1.02,-len*.12));for(let i=0;i<=n;i++){const a=(1-i/n)*Math.PI/2;p.push(V(Math.sin(a)*r0,Math.cos(a)*r0*.65));}return new T.LatheGeometry(p,14);};
  const torso=(w,c,s)=>new T.LatheGeometry([V(0,-.02),V(w*.98,-.015),V(w,.05),V(w*1.08,.14),V(c,.28),V(c*1.02,.38),V(s,.45),V(s*.93,.52),V(s*.62,.565),V(.075,.59),V(0,.595)],18);
  const pelvis=(w)=>new T.LatheGeometry([V(0,-.14),V(w*.72,-.13),V(w*.97,-.06),V(w,.03),V(w*.9,.085),V(0,.09)],18);
  const belt=new T.TorusGeometry(.163,.014,6,28);belt.rotateX(Math.PI/2);
  const pony=new T.CylinderGeometry(.045,.018,.34,10);pony.translate(0,-.17,0);pony.rotateX(.42);
  const longH=new T.CylinderGeometry(.115,.09,.34,16,1,true,Math.PI*.55,Math.PI*.9);longH.translate(0,-.17,0);
  const bun=new T.SphereGeometry(.06,12,10);
  const thumb=new T.CylinderGeometry(.014,.012,.05,6);thumb.rotateZ(.6);
  return{torsoM:torso(.15,.195,.205),torsoF:torso(.13,.175,.172),pelvisM:pelvis(.165),pelvisF:pelvis(.182),belt,
    upper:limb(.058,.046,.3,.12),fore:limb(.047,.035,.27,.1),thigh:limb(.092,.064,.45,.08),shin:limb(.066,.044,.42,.14),
    head:new T.SphereGeometry(.118,24,18),jaw:new T.SphereGeometry(.09,18,12),ear:new T.SphereGeometry(.026,8,6),nose:new T.SphereGeometry(.021,10,8),eye:new T.SphereGeometry(.0185,10,8),iris:new T.SphereGeometry(.0105,8,6),
    brow:new T.BoxGeometry(.048,.011,.014),mouth:new T.BoxGeometry(.044,.009,.01),neck:new T.CylinderGeometry(.052,.058,.13,12),
    hairCap:new T.SphereGeometry(.126,24,12,0,Math.PI*2,0,Math.PI*.36),hairBack:new T.SphereGeometry(.124,20,10,Math.PI*.85,Math.PI*1.3,Math.PI*.3,Math.PI*.33),pony,longH,bun,
    bust:new T.SphereGeometry(.068,14,10),panel:new T.BoxGeometry(.12,.38,.016),collar:new T.TorusGeometry(.085,.016,6,20,Math.PI),
    hand:new T.SphereGeometry(.048,12,10),thumb,shoe:new T.SphereGeometry(.07,14,10),sole:new T.BoxGeometry(.118,.03,.275),glasses:new T.TorusGeometry(.024,.004,6,14),cap:HG.cap,brim:HG.brim,skirt:HG.skirt,shadow:HG.shadow};})();
const mixHex=(a,b,k)=>{const A=new T.Color(a),B=new T.Color(b);return '#'+A.lerp(B,k).getHexString();};
function makeHuman(o){
  const mk=(parts,parent,pos)=>{const me=new T.Mesh(buildVC(parts),HUMAT);me.castShadow=Q.shadows;if(pos)me.position.set(...pos);parent.add(me);return me;};
  const F=!!o.female,G=HG2,style=o.hairStyle||(o.longHair?'long':F?'pony':'short'),top=o.jacket||o.shirt;
  const root=new T.Group(),hips=new T.Group();root.rotation.order='YXZ';hips.position.y=.95;root.add(hips);if(F)root.scale.setScalar(.95);
  const hp=[{geo:F?G.pelvisF:G.pelvisM,color:o.pants,scale:[1,1,.72]},{geo:G.belt,color:'#2a2522',pos:[0,.06,0],scale:[F?1.08:1,1,.72]}];if(o.skirt)hp.push({geo:G.skirt,color:o.pants,pos:[0,-.1,0]});mk(hp,hips);
  const spine=new T.Group();spine.position.y=.06;hips.add(spine);
  const sp=[{geo:F?G.torsoF:G.torsoM,color:top,scale:[1,1,.64]},{geo:G.neck,color:o.skin,pos:[0,.62,0],scale:[1.15,1,1.1]}];
  if(F)for(const s of[-1,1])sp.push({geo:G.bust,color:top,pos:[s*.06,.335,.05],scale:[.9,.8,.62]});
  if(o.jacket){sp.push({geo:G.panel,color:o.shirt,pos:[0,.27,F?.118:.124]});sp.push({geo:G.collar,color:o.jacket,pos:[0,.55,.02],scale:[1.2,1,1]});}
  mk(sp,spine);
  const head=new T.Group();head.position.y=.775;spine.add(head);
  const sk=o.skin,dk=mixHex(sk,'#000000',.18),hd=[{geo:G.head,color:sk,scale:[.95,1.1,1.04]},{geo:G.jaw,color:o.beard?mixHex(sk,o.hair,.55):sk,pos:[0,-.062,.022],scale:[F?.86:.96,.74,.95]},
    {geo:G.ear,color:dk,pos:[-.112,-.005,0],scale:[.5,1,.8]},{geo:G.ear,color:dk,pos:[.112,-.005,0],scale:[.5,1,.8]},{geo:G.nose,color:sk,pos:[0,-.018,.118],scale:[.8,1.35,1.1]},
    {geo:G.mouth,color:F?'#b4505c':'#8f4a46',pos:[0,-.07,.104]}];
  for(const s of[-1,1])hd.push({geo:G.eye,color:'#f3efe8',pos:[s*.041,.016,.097],scale:[1,.8,.8]},{geo:G.iris,color:'#2a1c12',pos:[s*.041,.016,.111]},{geo:G.brow,color:o.hair,pos:[s*.042,.05,.106]});
  if(o.glasses)for(const s of[-1,1])hd.push({geo:G.glasses,color:'#1a1a1a',pos:[s*.041,.016,.118]});
  if(style!=='bald'){hd.push({geo:G.hairCap,color:o.hair,pos:[0,.018,-.008],scale:style==='buzz'?[.98,1.02,1.02]:[1.02,1.12,1.1]},{geo:G.hairBack,color:o.hair,pos:[0,.0,-.006],scale:[1.02,1.12,1.1]});
    if(style==='pony')hd.push({geo:G.pony,color:o.hair,pos:[0,.03,-.115]},{geo:G.bun,color:o.hair,pos:[0,.035,-.118],scale:[.7,.7,.7]});
    if(style==='long')hd.push({geo:G.longH,color:o.hair,pos:[0,-.0,-.012],scale:[1,1.05,1.05]});
    if(style==='bun')hd.push({geo:G.bun,color:o.hair,pos:[0,.1,-.09]});}
  if(o.cap)hd.push({geo:G.cap,color:o.cap,pos:[0,.1,0]},{geo:G.brim,color:o.cap,pos:[0,.07,.13]});
  mk(hd,head);
  const arm={},el={},sleeve=o.sleeve===false?o.skin:top,fore=o.longSleeve||o.jacket?top:o.skin;
  for(const s of[-1,1]){const sh=new T.Group();sh.position.set(s*(F?.2:.222),.5,0);sh.rotation.z=s*.07;spine.add(sh);mk([{geo:G.upper,color:sleeve,scale:F?[.9,1,.9]:[1,1,1]}],sh);const e=new T.Group();e.position.y=-.3;sh.add(e);
    mk([{geo:G.fore,color:fore,scale:F?[.9,1,.9]:[1,1,1]},{geo:G.hand,color:o.skin,pos:[0,-.3,.005],scale:[.72,1,.42]},{geo:G.thumb,color:o.skin,pos:[-s*.03,-.28,.018]}],e);arm[s]=sh;el[s]=e;}
  const leg={},kn={},legC=o.skirt?o.skin:o.pants;
  for(const s of[-1,1]){const hpG=new T.Group();hpG.position.set(s*(F?.095:.09),-.04,0);hips.add(hpG);mk([{geo:G.thigh,color:legC,scale:F?[1.04,1,1]:[1,1,1]}],hpG);const k=new T.Group();k.position.y=-.46;hpG.add(k);
    mk([{geo:G.shin,color:legC},{geo:G.shoe,color:o.shoes,pos:[0,-.43,.055],scale:[.85,.62,1.9]},{geo:G.sole,color:'#e9e7e2',pos:[0,-.465,.05]}],k);leg[s]=hpG;kn[s]=k;}
  if(!Q.shadows){const sh=new T.Mesh(G.shadow,shadowMat);sh.position.y=.03;root.add(sh);}
  scene.add(root);
  return{root,hips,spine,head,armL:arm[-1],armR:arm[1],elL:el[-1],elR:el[1],legL:leg[-1],legR:leg[1],knL:kn[-1],knR:kn[1],ph:Math.random()*6,punchT:0,side:1,guard:0,ko:0,koK:0,hitT:0};
}
function resetHuman(H){H.ko=0;H.koK=0;H.guard=0;H.punchT=0;H.hitT=0;H.kickT=0;H.windT=0;H.block=0;H.blockHold=false;H.root.rotation.set(0,0,0);H.root.visible=true;}
function randomLook(kind){const f=Math.random()<.45;const o={female:f,skin:pick(SKIN),hair:pick(HAIR),shirt:pick(SHIRT),pants:pick(PANTS),shoes:pick(SHOES),hairStyle:f?pick(['long','long','pony','bun']):pick(['short','short','buzz','bald']),beard:!f&&Math.random()<.3,glasses:Math.random()<.15,jacket:Math.random()<.25?pick(['#3d5677','#2b2b2b','#6b4a32','#4a5d3a','#7a1f2b']):null,skirt:f&&Math.random()<.3,sleeve:Math.random()<.6};
  if(kind==='cop')Object.assign(o,{shirt:'#1f2d4d',pants:'#18203a',shoes:'#111111',cap:'#16203a',longSleeve:false,skirt:false,longHair:false,jacket:null,hairStyle:o.female?'bun':'buzz'});
  if(kind==='guard')Object.assign(o,{shirt:'#5b6470',pants:'#25292f',shoes:'#111111',cap:'#2a2e35',skirt:false,jacket:null});
  if(kind==='fighter')Object.assign(o,{female:false,shirt:pick(['#b3261e','#151515','#f1c40f']),sleeve:false,pants:pick(['#1f1f1f','#2b2f3a']),longHair:false,skirt:false,hairStyle:pick(['buzz','bald','short']),jacket:null});
  return o;}
const CHARS={joseph:{female:false,skin:'#c98e66',hair:'#17110d',hairStyle:'short',beard:true,shirt:'#ecebe6',jacket:'#3d5677',pants:'#27344b',shoes:'#f2f2f0',sleeve:true,longSleeve:true,cap:null},
  oscar:{female:true,skin:'#e9bf9b',hair:'#3a2418',hairStyle:'pony',shirt:'#b23a48',pants:'#1e2127',shoes:'#f5f5f3',sleeve:false}};
CHARS.minh=CHARS.joseph;CHARS.vy=CHARS.oscar;
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
Object.assign(CAR_T,{
  hatch:{hl:.7,tl:.85,w:1.76,wr:.32,wz:1.22,yb:.3,len:3.95,lower:[[-1.92,.3],[-1.98,.6],[-1.95,.95],[-1.85,1.0],[.85,.98],[1.75,.85],[1.98,.7],[2.0,.45],[1.9,.3]],cabin:[[-1.9,.97],[-1.78,1.48],[.2,1.5],[.9,.97]],roof:[-1.75,.2,1.49],max:36,acc:11.5,brk:30,grip:7.4,mass:1.0,co:1.05,cr:1.05},
  coupe:{hl:.62,tl:.72,w:1.9,wr:.35,wz:1.4,yb:.3,len:4.5,lower:[[-2.2,.3],[-2.26,.6],[-2.15,.86],[-1.6,.9],[1.0,.88],[2.05,.74],[2.28,.55],[2.25,.32],[2.15,.3]],cabin:[[-1.6,.88],[-.85,1.28],[.15,1.3],[1.02,.88]],roof:[-.85,.15,1.29],max:47,acc:16,brk:32,grip:8,mass:1.2},
  muscle:{hl:.72,tl:.82,w:1.98,wr:.38,wz:1.55,yb:.33,len:4.95,lower:[[-2.4,.33],[-2.46,.62],[-2.4,.92],[-1.9,.96],[1.25,.98],[2.3,.92],[2.47,.78],[2.47,.48],[2.38,.33]],cabin:[[-1.85,.95],[-1.1,1.3],[.15,1.32],[1.05,.96]],roof:[-1.1,.15,1.31],max:50,acc:20,brk:30,grip:6.8,mass:1.5,co:1.4},
  pickup:{hl:.98,tl:1.0,w:2.02,wr:.44,wz:1.75,yb:.5,len:5.3,lower:[[-2.6,.5],[-2.66,.8],[-2.64,1.22],[1.0,1.2],[2.35,1.12],[2.6,.95],[2.62,.6],[2.5,.5]],cabin:[[-.75,1.18],[-.62,1.9],[.55,1.92],[1.15,1.18]],roof:[-.62,.55,1.91],max:38,acc:11,brk:27,grip:6,mass:2.0,co:1.6,cr:1.2},
  van:{hl:.9,tl:.9,w:2.0,wr:.38,wz:1.7,yb:.42,len:5.2,lower:[[-2.6,.42],[-2.62,.8],[-2.62,2.42],[.35,2.42],[.35,1.18],[1.6,1.14],[2.45,1.0],[2.6,.85],[2.6,.5],[2.5,.42]],cabin:[[.3,1.16],[.3,2.4],[.75,2.4],[1.65,1.16]],roof:[.3,.75,2.41],hip:.98,max:32,acc:8.5,brk:24,grip:5.8,mass:2.4,co:1.6,cr:1.2},
  minivan:{hl:.85,tl:1.0,w:1.95,wr:.37,wz:1.5,yb:.38,len:4.95,lower:[[-2.42,.38],[-2.48,.75],[-2.45,1.05],[1.3,1.02],[2.2,.9],[2.45,.72],[2.45,.48],[2.35,.38]],cabin:[[-2.4,1.03],[-2.3,1.82],[.55,1.84],[1.4,1.02]],roof:[-2.3,.55,1.83],max:36,acc:10,brk:27,grip:6.4,mass:1.7,co:1.4},
  jeep:{hl:1.12,tl:1.15,w:2.0,wr:.5,wz:1.38,yb:.62,len:4.45,lower:[[-2.15,.62],[-2.2,.9],[-2.2,1.35],[1.0,1.35],[2.12,1.3],[2.22,1.1],[2.22,.75],[2.1,.62]],cabin:[[-2.1,1.33],[-2.05,2.12],[.4,2.12],[.95,1.33]],roof:[-2.05,.4,2.11],max:39,acc:12.5,brk:27,grip:6.8,mass:1.9,co:1.2,cr:1.2},
  limo:{hl:.72,tl:.82,w:1.95,wr:.37,wz:2.55,yb:.32,len:7.2,lower:[[-3.55,.32],[-3.62,.6],[-3.58,.92],[-3.2,.98],[2.3,.98],[3.25,.88],[3.55,.74],[3.6,.48],[3.5,.32]],cabin:[[-3.1,.96],[-2.6,1.42],[1.6,1.44],[2.35,.96]],roof:[-2.6,1.6,1.43],max:38,acc:9,brk:26,grip:6,mass:2.2,co:2.4,cr:1.12,offs:[2.4,0,-2.4]},
  legend:{hl:.42,tl:.58,w:2.12,wr:.37,wz:1.52,yb:.2,len:4.78,lower:[[-2.3,.2],[-2.4,.5],[-2.26,.74],[-1.15,.8],[.9,.64],[2.12,.4],[2.45,.28],[2.4,.21],[2.26,.2]],cabin:[[-1.25,.76],[-.38,1.03],[.18,1.03],[1.12,.64]],roof:[-.38,.18,1.02],hip:.19,max:94,acc:42,brk:50,grip:12.5,mass:1.1},
  hyper:{hl:.45,tl:.62,w:2.05,wr:.36,wz:1.5,yb:.22,len:4.7,lower:[[-2.35,.22],[-2.42,.55],[-2.3,.78],[-1.2,.84],[1.0,.72],[2.15,.48],[2.4,.36],[2.36,.24],[2.25,.22]],cabin:[[-1.3,.8],[-.45,1.08],[.25,1.08],[1.05,.74]],roof:[-.45,.25,1.07],hip:.2,max:74,acc:30,brk:42,grip:10.5,mass:1.15},
  bus:{hl:.75,tl:.9,w:2.5,wr:.52,wz:3.4,yb:.48,len:11.1,lower:[[-5.5,.48],[-5.56,.9],[-5.56,1.25],[5.42,1.25],[5.56,1.1],[5.56,.55],[5.45,.48]],cabin:[[-5.5,1.23],[-5.5,2.72],[5.5,2.72],[5.56,1.23]],roof:[-5.5,5.5,2.76],hip:1.05,seatZ:4.5,max:27,acc:6,brk:20,grip:5,mass:6,co:3.9,cr:1.4,offs:[3.9,1.3,-1.3,-3.9]}});
const CAR_BODY={sedan:'sedan',sports:'sports',suv:'suv',taxi:'sedan',police:'sedan',super:'super',bike:'bike',hatch:'hatch',coupe:'coupe',muscle:'muscle',pickup:'pickup',van:'van',minivan:'minivan',jeep:'jeep',limo:'limo',hyper:'hyper',bus:'bus',legend:'legend'};
const CARC=['#c0392b','#f4f4f2','#1d3557','#2a9d8f','#e9c46a','#111418','#8d99ae','#6c757d','#3a86ff','#ff8fab','#7b2cbf','#e76f51','#264653','#d4d8dd','#ffb703'];
const CG={};
/* ---------- car bodies: lofted from the side profile, with rounded plan view, tumblehome and real cross-sections ---------- */
function carLoft(poly,hw0,opt){// poly: side-view points [z,y]; returns indexed geometry + sampler
  const P=poly;const zs=P.map(p=>p[0]),zmin=Math.min(...zs),zmax=Math.max(...zs),zc=(zmin+zmax)/2,hl=(zmax-zmin)/2;
  const span=z=>{let lo=1e9,hi=-1e9;for(let k=0;k<P.length;k++){const a=P[k],b=P[(k+1)%P.length];const z0=Math.min(a[0],b[0]),z1=Math.max(a[0],b[0]);if(z<z0-1e-6||z>z1+1e-6)continue;
      if(Math.abs(b[0]-a[0])<1e-6){lo=Math.min(lo,a[1],b[1]);hi=Math.max(hi,a[1],b[1]);continue;}const t=(z-a[0])/(b[0]-a[0]),y=a[1]+(b[1]-a[1])*t;lo=Math.min(lo,y);hi=Math.max(hi,y);}return[lo,hi];};
  const hwAt=z=>{const e=clamp((Math.abs((z-zc)/hl)-(opt.endStart||.68))/(1-(opt.endStart||.68)),0,1);return hw0*(1-(opt.endPinch||.13)*e*e);};
  const nT=opt.nTop||5,nB=opt.nBot||6,tum=opt.tum||.06,tf=opt.tumFrom==null?.5:opt.tumFrom,M=opt.ring||24,bul=opt.bulge||0;
  const tumF=yRel=>1-tum*clamp((yRel-tf)/(1-tf),0,1);
  // unit ring: x factor and relative height for each of the M+1 points
  const RX=[],RY=[];for(let k=0;k<=M;k++){const th=k/M*Math.PI*2,c=Math.cos(th),s=Math.sin(th),nn=s>=0?nT:nB;const sy=Math.sign(s)*Math.pow(Math.abs(s),2/nn),sx=Math.sign(c)*Math.pow(Math.abs(c),2/nn);RY.push((sy+1)/2);RX.push(sx);}
  const xAt=(yRel,hw)=>{const up=yRel>=.5,nn=up?nT:nB,v=Math.abs(2*yRel-1);const sx=Math.pow(Math.max(0,1-Math.pow(v,nn)),1/nn);return hw*sx*tumF(yRel)*(1+bul*Math.sin(Math.PI*clamp(yRel,0,1)));};
  // slice positions: dense, plus both sides of every profile vertex
  let sl=[];const NS=opt.slices||44;for(let i=0;i<=NS;i++){const u=i/NS;sl.push(zmin+(zmax-zmin)*(.5-.5*Math.cos(Math.PI*u)));}
  for(const z of zs){sl.push(z-.004,z+.004);}sl=sl.map(z=>clamp(z,zmin+.002,zmax-.002)).sort((a,b)=>a-b).filter((z,i,a)=>!i||z-a[i-1]>.0015);
  const pos=[],uv=[],ring=[];
  for(const z of sl){const[lo,hi]=span(z);const h=Math.max(.002,hi-lo),hw=hwAt(z);const r=[];
    for(let k=0;k<=M;k++){const yRel=RY[k];const x=hw*RX[k]*tumF(yRel)*(1+bul*Math.sin(Math.PI*yRel));r.push(pos.length/3);pos.push(x,lo+h*yRel,z);uv.push(0,0);}
    ring.push({z,lo,hi,r});}
  const quads=[];// [a,b,c,d,meta]
  for(let i=0;i<ring.length-1;i++){const A=ring[i],B=ring[i+1];for(let k=0;k<M;k++){const q=[A.r[k],B.r[k],B.r[k+1],A.r[k+1]];quads.push(q);}}
  // caps
  const caps=[];for(const[R,dir]of[[ring[0],-1],[ring[ring.length-1],1]]){const ci=pos.length/3;pos.push(0,(R.lo+R.hi)/2,R.z);uv.push(0,0);for(let k=0;k<M;k++)caps.push(dir>0?[ci,R.r[k],R.r[k+1]]:[ci,R.r[k+1],R.r[k]]);}
  return{pos,uv,quads,caps,ring,M,span,hwAt,xAt,zmin,zmax,RY};}
function loftGeo(L,filter){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(L.pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(L.uv,2));
  const id=[];L.quads.forEach((q,i)=>{if(filter&&!filter(q,i))return;id.push(q[0],q[3],q[2],q[0],q[2],q[1]);});if(!filter||filter('cap'))for(const c of L.caps)id.push(c[0],c[1],c[2]);
  g.setIndex(id);g.computeVertexNormals();return g;}
function carGeos(b){if(CG[b])return CG[b];const s=CAR_T[b];
  const sh=new T.Shape();const L=s.lower;sh.moveTo(L[0][0],L[0][1]);for(let k=1;k<L.length;k++)sh.lineTo(L[k][0],L[k][1]);
  const R=s.wr+.07,ph=Math.asin(clamp((s.yb-s.wr)/R,-1,1));
  sh.lineTo(s.wz+R*Math.cos(ph),s.yb);sh.absarc(s.wz,s.wr,R,ph,Math.PI-ph,false);sh.lineTo(-s.wz+R*Math.cos(ph),s.yb);sh.absarc(-s.wz,s.wr,R,ph,Math.PI-ph,false);sh.lineTo(L[0][0],L[0][1]);
  const poly=sh.getPoints(14).map(p=>[p.x,p.y]);
  const tall=b==='van'||b==='bus';
  const BL=carLoft(poly,s.w/2,{nTop:tall?8:5,nBot:tall?10:6,tum:tall?.03:.07,bulge:.02,endPinch:tall?.05:.15,endStart:tall?.85:.62,slices:tall?40:52});
  const cabPoly=s.cabin.map(p=>[p[0],p[1]]);
  const shoulder=BL.xAt(.94,s.w/2);const CL=carLoft(cabPoly,tall?s.w/2-.03:shoulder,{nTop:tall?9:3.2,nBot:16,tum:tall?.04:.26,tumFrom:0,endPinch:tall?.03:.12,endStart:.5,slices:tall?30:36});
  // split the greenhouse: roof skin and B-pillars are paint, the rest is glass
  const r0=s.roof[0],r1=s.roof[1],bp=(r0+r1)/2-.15,M=CL.M;
  const isPaint=(q,i)=>{const ri=Math.floor(i/M),k=i%M,A=CL.ring[ri],B=CL.ring[ri+1];const zA=A.z,zB=B.z;const yRel=(CL.RY[k]+CL.RY[k+1])/2;
    const inRoof=zA>=r0-.05&&zB<=r1+.05;if(inRoof&&yRel>(tall?.97:.86))return true;if(!tall&&zA>=bp-.06&&zB<=bp+.06&&yRel<.9)return true;return false;};
  const glass=loftGeo(CL,(q,i)=>q==='cap'?true:!isPaint(q,i)),roof=loftGeo(CL,(q,i)=>q==='cap'?false:isPaint(q,i));
  roof.scale(1.004,1.004,1);
  // tyre: rounded sidewalls; rim: dark barrel, 5 silver spokes, lip ring and hub, brake disc
  const wr=s.wr,tp=[[wr*.64,-.13],[wr*.9,-.134],[wr*.97,-.118],[wr,-.08],[wr*1.005,0],[wr,.08],[wr*.97,.118],[wr*.9,.134],[wr*.64,.13]].map(p=>new T.Vector2(p[0],p[1]));
  const tire=new T.LatheGeometry(tp,26).rotateZ(Math.PI/2);
  const rimParts=[{geo:new T.CylinderGeometry(wr*.64,wr*.64,.22,22).rotateZ(Math.PI/2),color:'#24272b'},{geo:new T.CylinderGeometry(wr*.46,wr*.46,.235,20).rotateZ(Math.PI/2),color:'#3a3d42'}];
  for(const sx of[-1,1]){rimParts.push({geo:new T.TorusGeometry(wr*.62,.016,6,26).rotateY(Math.PI/2),pos:[sx*.112,0,0],color:'#d8dde2'},{geo:new T.CylinderGeometry(wr*.13,wr*.13,.02,10).rotateZ(Math.PI/2),pos:[sx*.118,0,0],color:'#c4c9cf'});
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2,sp=new T.BoxGeometry(.02,wr*.5,.055).translate(0,wr*.33,0).rotateX(a);rimParts.push({geo:sp,pos:[sx*.112,0,0],color:'#cfd4da'});}}
  return CG[b]={BL,CL,lower:loftGeo(BL),cabin:glass,roof,tire,rimParts};}
const lightBox=new T.BoxGeometry(.36,.12,.06),grille=new T.BoxGeometry(1,.16,.08),plate=new T.BoxGeometry(.42,.13,.03),mirror=new T.BoxGeometry(.18,.1,.12),barG=new T.BoxGeometry(.5,.12,.28);
const BAR={r:new T.MeshStandardMaterial({color:0x220000,emissive:lin('#ff1a2a'),emissiveIntensity:3}),b:new T.MeshStandardMaterial({color:0x000022,emissive:lin('#1a5bff'),emissiveIntensity:3})};
const copText=textTex('CẢNH SÁT',{fg:'#1b2a55',size:70,bg:'rgba(0,0,0,0)'}),taxiText=textTex('TAXI',{fg:'#111',size:90,bg:'#f5c518',w:256,h:128});
const DETAILM=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false}),WHEELM=new T.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.4});
const TRIMM=new T.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.6});
const CM={};
function carMeshes(b){if(CM[b])return CM[b];const s=CAR_T[b],cg=carGeos(b),BL=cg.BL,tall=b==='van'||b==='bus';
  const fz=BL.zmax+.012,rz=BL.zmin-.012,belt=s.cabin[0][1];
  // side x of the body surface at height y, slice z
  const sideX=(z,y)=>{const[lo,hi]=BL.span(z);const yRel=clamp((y-lo)/Math.max(.01,hi-lo),0,1);return BL.xAt(yRel,BL.hwAt(z));};
  const mz=s.cabin[3][0]-.15,mx=sideX(mz,belt)+.06;
  const paint=buildVC([{geo:cg.lower},{geo:cg.roof},{geo:mirror,pos:[-mx,belt+.08,mz]},{geo:mirror,pos:[mx,belt+.08,mz]}]);
  const det=[],trim=[],add=(g,p,c,a)=>(a||det).push({geo:g,pos:p,color:c});
  const fy=(z)=>BL.span(z),fw=BL.hwAt(BL.zmax-.01),rw=BL.hwAt(BL.zmin+.01);
  for(const x of[-1,1]){// lamps: lens + bright core, indicators
    add(new T.BoxGeometry(.42,.13,.05),[x*(fw-.3),s.hl,fz],'#c9d2dc',trim);add(new T.BoxGeometry(.26,.07,.03),[x*(fw-.3),s.hl,fz+.02],'#fffaf0');add(new T.BoxGeometry(.1,.05,.03),[x*(fw-.08),s.hl-.02,fz+.015],'#ffa526');
    add(new T.BoxGeometry(.44,.14,.05),[x*(rw-.3),s.tl,rz],'#6a0a0a',trim);add(new T.BoxGeometry(.32,.07,.03),[x*(rw-.3),s.tl,rz-.02],'#ff1e1e');add(new T.BoxGeometry(.1,.06,.03),[x*(rw-.06),s.tl,rz-.02],'#ffb020');
    // side: chrome belt strip, dark skirt, door handles, door seams, mirrors' glass
    if(!tall){const z0=s.cabin[0][0]+.1,z1=s.cabin[3][0]-.1,zm=(z0+z1)/2;add(new T.BoxGeometry(.012,.025,z1-z0),[x*(sideX(zm,belt-.03)+.004),belt-.03,zm],'#cfd5dc',trim);
      for(const hz of[zm+.35,zm-.75])add(new T.BoxGeometry(.02,.035,.17),[x*(sideX(hz,belt-.16)+.01),belt-.16,hz],'#c0c6cc',trim);
      for(const dz of[zm+.95,zm-.15,zm-1.15])if(dz>s.lower[0][0]+.6&&dz<BL.zmax-.6)add(new T.BoxGeometry(.008,(belt-s.yb)*.82,.012),[x*(sideX(dz,(belt+s.yb)/2)+.003),(belt+s.yb)/2+.02,dz],'#1a1b1e');}
    add(new T.BoxGeometry(.03,.12,s.wz*2-(s.wr+.07)*2-.1),[x*(sideX(0,s.yb+.07)-.01),s.yb+.06,0],'#141518');
  }
  // front: grille with chrome surround, lower intake, plate; rear: plate, diffuser, exhaust
  add(new T.BoxGeometry(Math.min(1.1,fw*1.1),.2,.04),[0,s.hl-.04,fz],'#c4cad1',trim);add(new T.BoxGeometry(Math.min(1.0,fw),.15,.05),[0,s.hl-.04,fz+.01],'#0b0c0e');
  add(new T.BoxGeometry(fw*1.3,.12,.04),[0,s.yb+.14,fz-.01],'#0f1012');add(new T.BoxGeometry(.5,.13,.02),[0,s.yb+.32,fz+.012],'#f0f0ec');
  add(new T.BoxGeometry(.5,.13,.02),[0,s.tl-.27,rz-.012],'#f0f0ec');add(new T.BoxGeometry(rw*1.4,.1,.04),[0,s.yb+.1,rz+.01],'#121315');
  add(new T.CylinderGeometry(.045,.045,.16,10).rotateX(Math.PI/2),[-rw*.55,s.yb+.08,rz-.05],'#9aa0a6',trim);
  // dark wheel housings so you cannot see through the arches
  for(const z of[s.wz,-s.wz])add(new T.BoxGeometry(s.w-.62,s.wr*1.5,(s.wr+.07)*2-.05),[0,s.wr+.05,z],'#0a0a0b');
  const wheel=buildVC([{geo:cg.tire,color:'#121314'}].concat(cg.rimParts));
  return CM[b]={paint,glass:cg.cabin,detail:buildVC(det),trim:trim.length?buildVC(trim):null,wheel,fz,rz};}
/* driver-side front door (local +x) that can swing open, the dark opening behind it, and a seated driver */
const DG={},ARMG=new T.BoxGeometry(.1,.1,.46).translate(0,0,.21).rotateX(.42),WHEELG=new T.TorusGeometry(.17,.025,6,18),HOLEM=new T.MeshBasicMaterial({color:'#121418'});
function doorGeo(b){if(DG[b])return DG[b];const s=CAR_T[b],R=s.wr+.07,belt=s.cabin[0][1];
  const z1=Math.min(s.cabin[3][0]-.05,s.wz-R-.05),z0=z1-1.15,yb=s.yb+.1,L=z1-z0,hh=belt+.01-yb;
  const panel=new T.BoxGeometry(.05,hh,L);panel.translate(.033,yb+hh/2,-L/2);
  const gz0=Math.max(z0+.08,s.roof[0]),gz1=Math.min(z1-.12,s.roof[1]),gh=s.roof[2]-.1-(belt+.02);
  const glass=new T.BoxGeometry(.03,gh,Math.max(.2,gz1-gz0));glass.translate(.03,belt+.02+gh/2,(gz0+gz1)/2-z1);
  const det=buildVC([{geo:new T.BoxGeometry(.03,.04,.16),color:'#1a1c20',pos:[.072,belt-.12,-L+.28]},{geo:new T.BoxGeometry(.012,hh,.012),color:'#0c0d10',pos:[.058,yb+hh/2,-L]}]);
  const hole=new T.PlaneGeometry(L-.04,hh-.04).rotateY(Math.PI/2);hole.translate(0,yb+hh/2,(z0+z1)/2);
  const sc=.85,hip=s.hip!=null?s.hip:s.roof[2]-1.04*sc-.06,sz=s.seatZ!=null?s.seatZ:s.cabin[3][0]-.98,sx=s.w/2-.52;
  return DG[b]={panel,glass,det,hole,z0,z1,zc:(z0+z1)/2,seat:{x:sx,z:sz,hip,sc}};}
function bustGeo(b,o){const S=doorGeo(b).seat,sc=S.sc,x=S.x,z=S.z,y=S.hip;
  return buildVC([{geo:HG.torso,color:o.shirt,pos:[x,y+.32*sc,z],scale:[sc*(o.female?.9:1),sc,.66*sc]},{geo:HG.neck,color:o.skin,pos:[x,y+.66*sc,z]},
    {geo:HG.head,color:o.skin,pos:[x,y+.88*sc,z],scale:[sc,1.12*sc,1.05*sc]},{geo:HG.hair,color:o.hair,pos:[x,y+.9*sc,z],scale:[1.03*sc,1.04*sc,1.1*sc]},
    {geo:ARMG,color:o.sleeve===false?o.skin:o.shirt,pos:[x-.2*sc,y+.56*sc,z]},{geo:ARMG,color:o.sleeve===false?o.skin:o.shirt,pos:[x+.2*sc,y+.56*sc,z]},
    {geo:WHEELG,color:'#18191c',pos:[x,y+.5*sc,z+.5]}]);}
function setDriverLook(c,o){const m=c.m;if(!m.drv)return;if(m.drv.geometry)m.drv.geometry.dispose();m.drv.geometry=bustGeo(m.body,o);}
const carPool={};
function makeCar(type,color){
  const pl=carPool[type];if(pl&&pl.length){const m=pl.pop();m.g.visible=true;if(m.door){m.door.visible=m.hole.visible=false;m.door.rotation.y=0;m.drv.visible=false;}m.bg.rotation.set(0,0,0);m.bg.position.y=0;if(m.rider)m.rider.root.visible=false;if(type!=='police'&&type!=='taxi')m.paint.color.copy(lin(color));for(const w of m.wheels)w.rotation.x=0;return m;}
  if(type==='bike')return makeBike(color);
  const b=CAR_BODY[type],s=CAR_T[b],M=carMeshes(b),g=new T.Group(),bg=new T.Group();g.add(bg);
  const pc={color:lin(type==='police'?'#14171d':type==='taxi'?'#f5c518':color),roughness:ENV_OK?.3:.35,metalness:ENV_OK?.5:.15};const paint=!MOBILE&&ENV_OK?new T.MeshPhysicalMaterial(Object.assign(pc,{clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.1})):new T.MeshStandardMaterial(pc);
  const body=new T.Mesh(M.paint,paint);body.castShadow=Q.shadows;bg.add(body);
  const gl=new T.Mesh(M.glass,GLASS);gl.castShadow=Q.shadows;bg.add(gl);bg.add(new T.Mesh(M.detail,DETAILM));if(M.trim)bg.add(new T.Mesh(M.trim,TRIMM));
  if(type==='police'){const door=new T.Mesh(new T.BoxGeometry(s.w+.03,.4,2.1),mat('#f4f5f7',.35,.2));door.position.set(0,.66,-.1);bg.add(door);
    const tg=buildVC([{geo:new T.PlaneGeometry(1.5,.32).rotateY(Math.PI/2),pos:[s.w/2+.03,.66,-.1]},{geo:new T.PlaneGeometry(1.5,.32).rotateY(-Math.PI/2),pos:[-(s.w/2+.03),.66,-.1]}]);
    bg.add(new T.Mesh(tg,new T.MeshBasicMaterial({map:copText,transparent:true})));
    const r=new T.Mesh(barG,BAR.r);r.position.set(-.28,s.roof[2]+.1,(s.roof[0]+s.roof[1])/2);const bl=new T.Mesh(barG,BAR.b);bl.position.set(.28,s.roof[2]+.1,(s.roof[0]+s.roof[1])/2);bg.add(r,bl);}
  if(type==='taxi'){const sg=new T.Mesh(new T.BoxGeometry(.7,.24,.3),new T.MeshBasicMaterial({map:taxiText,toneMapped:false}));sg.position.set(0,s.roof[2]+.16,(s.roof[0]+s.roof[1])/2);bg.add(sg);}
  if(type==='super'){const sp=new T.Mesh(new T.BoxGeometry(s.w-.2,.06,.5),mat('#111418',.4,.3));sp.position.set(0,.98,s.lower[0][0]+.35);bg.add(sp);}
  carExtras(type,s,bg,paint);
  const wheels=[],steer=[];
  for(const[sx,sz]of[[-1,1],[1,1],[-1,-1],[1,-1]]){const pv=new T.Group();pv.position.set(sx*(s.w/2-.13),s.wr,sz*s.wz);const w=new T.Mesh(M.wheel,WHEELM);w.castShadow=Q.shadows;pv.add(w);g.add(pv);wheels.push(w);if(sz>0)steer.push(pv);}
  if(!Q.shadows){const sh=new T.Mesh(new T.PlaneGeometry(s.w+.3,s.len+.2).rotateX(-Math.PI/2),shadowMat);sh.position.y=.04;g.add(sh);}
  const D=doorGeo(b),door=new T.Group();door.position.set(s.w/2+.003,0,D.z1);door.add(new T.Mesh(D.panel,paint),new T.Mesh(D.glass,GLASS),new T.Mesh(D.det,DETAILM));door.visible=false;bg.add(door);
  const hole=new T.Mesh(D.hole,HOLEM);hole.position.x=s.w/2+.004;hole.visible=false;bg.add(hole);
  const drv=new T.Mesh(bustGeo(b,CHARS.minh),HUMAT);drv.visible=false;bg.add(drv);
  scene.add(g);return{g,bg,wheels,steer,paint,spec:Object.assign({},CAR_T[type]),body:b,door,hole,drv,D};
}
/* body-specific details: wings, bull bars, spare wheels, bus pillars and destination sign */
const XG={};let busSignTex=null;
function carExtras(type,s,bg,paint){const dk='#15171b',ch='#b9bec5';
  const P2=(parts,m)=>{const me=new T.Mesh(buildVC(parts),m||DETAILM);me.castShadow=Q.shadows;bg.add(me);};
  if(type==='legend'){const z=s.lower[0][0]+.35;XG.legend=XG.legend||buildVC([{geo:new T.BoxGeometry(s.w+.1,.06,.5),pos:[0,1.18,z],color:'#111111'},{geo:new T.BoxGeometry(.08,.42,.2),pos:[-.55,.98,z],color:'#111111'},{geo:new T.BoxGeometry(.08,.42,.2),pos:[.55,.98,z],color:'#111111'},{geo:new T.BoxGeometry(s.w-.5,.07,.05),pos:[0,.32,s.lower[0][0]-.02],color:'#ff2a2a'},{geo:new T.BoxGeometry(s.w-.3,.05,.06),pos:[0,.28,s.lower[6][0]+.02],color:'#d4a017'},{geo:new T.BoxGeometry(.04,.12,1.2),pos:[-(s.w/2-.02),.42,-.3],color:'#111111'},{geo:new T.BoxGeometry(.04,.12,1.2),pos:[s.w/2-.02,.42,-.3],color:'#111111'}]);bg.add(new T.Mesh(XG.legend,DETAILM));}
  if(type==='hyper'){const z=s.lower[0][0]+.3;XG.hyper=XG.hyper||buildVC([{geo:new T.BoxGeometry(s.w-.1,.05,.42),pos:[0,1.12,z],color:dk},{geo:new T.BoxGeometry(.06,.35,.18),pos:[-.6,.94,z],color:dk},{geo:new T.BoxGeometry(.06,.35,.18),pos:[.6,.94,z],color:dk},{geo:new T.BoxGeometry(.05,.22,.42),pos:[-(s.w/2-.05),1.2,z],color:dk},{geo:new T.BoxGeometry(.05,.22,.42),pos:[s.w/2-.05,1.2,z],color:dk},{geo:new T.BoxGeometry(s.w-.4,.08,.05),pos:[0,.3,s.lower[0][0]-.02],color:'#ff3030'}]);bg.add(new T.Mesh(XG.hyper,DETAILM));}
  if(type==='muscle'){const sc=new T.Mesh(new T.BoxGeometry(.6,.14,.9),paint);sc.position.set(0,1.02,1.75);bg.add(sc);XG.mus=XG.mus||buildVC([{geo:new T.BoxGeometry(.5,.1,.05),pos:[0,1.02,2.2],color:dk},{geo:new T.BoxGeometry(.22,.012,1.2),pos:[-.18,1.325,-.47],color:'#f4f4f2'},{geo:new T.BoxGeometry(.22,.012,1.2),pos:[.18,1.325,-.47],color:'#f4f4f2'}]);
    bg.add(new T.Mesh(XG.mus,DETAILM));}
  if(type==='jeep'){XG.jeep=XG.jeep||buildVC([{geo:new T.CylinderGeometry(.42,.42,.26,18).rotateX(Math.PI/2),pos:[0,1.15,-2.35],color:'#151515'},{geo:new T.CylinderGeometry(.26,.26,.27,10).rotateX(Math.PI/2),pos:[0,1.15,-2.35],color:ch},
      {geo:new T.BoxGeometry(1.7,.08,.08),pos:[0,.85,2.3],color:dk},{geo:new T.BoxGeometry(1.7,.08,.08),pos:[0,1.15,2.32],color:dk},{geo:new T.BoxGeometry(.08,.4,.08),pos:[-.6,1.0,2.3],color:dk},{geo:new T.BoxGeometry(.08,.4,.08),pos:[.6,1.0,2.3],color:dk},
      {geo:new T.BoxGeometry(.06,.08,2.2),pos:[-.75,2.2,-.8],color:dk},{geo:new T.BoxGeometry(.06,.08,2.2),pos:[.75,2.2,-.8],color:dk},{geo:new T.BoxGeometry(1.56,.05,.06),pos:[0,2.22,-1.6],color:dk},{geo:new T.BoxGeometry(1.56,.05,.06),pos:[0,2.22,0],color:dk},
      {geo:new T.BoxGeometry(.3,.06,.5),pos:[-1.05,.75,1.38],color:dk},{geo:new T.BoxGeometry(.3,.06,.5),pos:[1.05,.75,1.38],color:dk},{geo:new T.BoxGeometry(.3,.06,.5),pos:[-1.05,.75,-1.38],color:dk},{geo:new T.BoxGeometry(.3,.06,.5),pos:[1.05,.75,-1.38],color:dk}]);bg.add(new T.Mesh(XG.jeep,DETAILM));}
  if(type==='pickup'){XG.pk=XG.pk||buildVC([{geo:new T.BoxGeometry(s.w-.3,.03,1.75),pos:[0,1.235,-1.7],color:'#202226'},{geo:new T.BoxGeometry(.06,.06,1.8),pos:[-(s.w/2-.08),1.27,-1.7],color:ch},{geo:new T.BoxGeometry(.06,.06,1.8),pos:[s.w/2-.08,1.27,-1.7],color:ch},{geo:new T.BoxGeometry(s.w-.1,.14,.1),pos:[0,.55,2.6],color:ch},{geo:new T.BoxGeometry(s.w-.1,.14,.1),pos:[0,.55,-2.68],color:ch}]);bg.add(new T.Mesh(XG.pk,DETAILM));}
  if(type==='van'){XG.van=XG.van||buildVC([{geo:new T.BoxGeometry(s.w-.1,.16,.1),pos:[0,.55,2.6],color:dk},{geo:new T.BoxGeometry(s.w-.1,.16,.1),pos:[0,.55,-2.66],color:dk},{geo:new T.BoxGeometry(.012,1.0,1.5),pos:[s.w/2+.003,1.6,-1.2],color:'#f4f4f2'},{geo:new T.BoxGeometry(.012,1.0,1.5),pos:[-(s.w/2+.003),1.6,-1.2],color:'#f4f4f2'},{geo:new T.BoxGeometry(.02,2.0,.02),pos:[0,1.4,-2.635],color:dk}]);bg.add(new T.Mesh(XG.van,DETAILM));}
  if(type==='limo'){XG.limo=XG.limo||buildVC([{geo:new T.BoxGeometry(s.w+.02,.05,6.6),pos:[0,.62,0],color:ch},{geo:new T.BoxGeometry(.04,.3,.04),pos:[0,1.06,3.4],color:ch}]);bg.add(new T.Mesh(XG.limo,DETAILM));}
  if(type==='bus'){if(!busSignTex)busSignTex=textTex('05  NEXUS · TRUNG TÂM',{fg:'#ffb000',bg:'#111',size:60,w:1024,h:96});
    const parts=[{geo:new T.BoxGeometry(s.w-.04,.22,10.9),pos:[0,2.86,0]},{geo:new T.BoxGeometry(1.6,.3,2.6),pos:[0,3.05,-1]}];for(let z=-5.1;z<=5.1;z+=1.7)parts.push({geo:new T.BoxGeometry(s.w-.12,1.5,.12),pos:[0,1.98,z]});
    const cap=new T.Mesh(buildVC(parts),paint);cap.castShadow=Q.shadows;bg.add(cap);
    P2([{geo:new T.BoxGeometry(s.w+.02,.3,10.8),pos:[0,.75,0],color:'#f4f4f2'},{geo:new T.BoxGeometry(s.w-.2,.12,.08),pos:[0,.55,5.58],color:dk},{geo:new T.BoxGeometry(s.w-.2,.12,.08),pos:[0,.55,-5.6],color:dk},{geo:new T.BoxGeometry(.03,1.35,1.0),pos:[-(s.w/2+.01),1.4,4.0],color:'#20242a'},{geo:new T.BoxGeometry(.03,1.35,1.0),pos:[-(s.w/2+.01),1.4,.2],color:'#20242a'}]);
    const sg=new T.Mesh(new T.PlaneGeometry(1.9,.24),new T.MeshBasicMaterial({map:busSignTex,toneMapped:false}));sg.position.set(0,2.55,5.565);bg.add(sg);}}
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
function newCar(type,x,z,h,kind,color){if(!color)color=type==='limo'?pick(['#111418','#111418','#f4f4f2']):type==='bus'?pick(['#f2b705','#2a9d8f','#d62828','#3a86ff']):pick(CARC);const m=makeCar(type,color);if(m.rider)m.rider.root.visible=kind==='traffic';const c={type,x,z,h,vx:0,vz:0,vf:0,steer:0,kind,m,mesh:m.g,wheels:m.wheels,steerW:m.steer,spec:m.spec,mass:m.spec.mass,driver:kind==='traffic'||kind==='police',ai:null,stuck:0,hp:100,doorA:0,doorT:0};cars.push(c);if(c.driver&&m.drv){c.look=randomLook(kind==='police'?'cop':'ped');setDriverLook(c,c.look);}syncCar(c);return c;}
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
  lampHits(c);if(inHills(c.x,c.z)){const fx=Math.sin(c.h),fz=Math.cos(c.h),sl=(heightAt(c.x-fx*1.4,c.z-fz*1.4)-heightAt(c.x+fx*1.4,c.z+fz*1.4))/2.8;c.vx+=fx*9.8*sl*dt*.7;c.vz+=fz*9.8*sl*dt*.7;}const CO=s.co||1.25,CR=s.cr||1.15;for(const o of(s.offs||[CO,-CO])){const cx=c.x+nfx*o,cz=c.z+nfz*o,p=resolve(cx,cz,CR);if(p){c.x+=p[0];c.z+=p[1];const l=hyp(p[0],p[1])||1,nx=p[0]/l,nz=p[1]/l,vn=c.vx*nx+c.vz*nz;if(vn<0){c.vx-=nx*vn*1.35;c.vz-=nz*vn*1.35;if(-vn>9)onCrash(c,-vn);}}}
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
function spawnAt(x,z,h){P.inside=null;P.sit=null;P.tray=null;curDoor=null;P.x=x;P.z=z;P.h=h||0;P.y=0;P.vy=0;cam.yaw=P.h;P.H.root.visible=true;}
const cam={yaw:0,pitch:.28,dist:6.5,lastDrag:-1e9,drag:null,shake:0};

/* ---------- traffic ---------- */
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const inb=i=>i>=0&&i<=N;
function pickDir(a,d){let o=DIRS.filter(q=>!(q[0]===-d[0]&&q[1]===-d[1])&&inb(a[0]+q[0])&&inb(a[1]+q[1]));if(!o.length)o=[[-d[0],-d[1]]];if(o.length>1&&Math.random()<.5){const s=o.find(q=>q[0]===d[0]&&q[1]===d[1]);if(s)return s;}return pick(o);}
function lanePt(a,d,t){return[road(a[0])+d[0]*t-d[1]*LANE,road(a[1])+d[1]*t+d[0]*LANE];}
const axisOf=d=>d[0]?'EW':'NS';
function nearestNode(x,z){return[clamp(Math.round((x+HALF)/CELL),0,N),clamp(Math.round((z+HALF)/CELL),0,N)];}
function spawnTraffic(near){for(let tries=0;tries<20;tries++){const a=[Math.floor(rnd(0,N+1)),Math.floor(rnd(0,N+1))];const d=pickDir(a,[0,0]);const t=rnd(8,CELL-18);const[x,z]=lanePt(a,d,t);const dist=hyp(x-P.x,z-P.z);if(near&&(dist<70||dist>Q.cull))continue;if(cars.some(c=>hyp(c.x-x,c.z-z)<10))continue;
  const c=newCar(pick(['sedan','sedan','sedan','suv','suv','sports','taxi','bike','bike','bike','hatch','hatch','coupe','muscle','pickup','pickup','van','minivan','minivan','jeep','limo','hyper','bus']),x,z,Math.atan2(d[0],d[1]),'traffic');c.ai={a,d,next:pickDir([a[0]+d[0],a[1]+d[1]],d),cruise:rnd(11,15),wait:0,ghost:0};const v=c.ai.cruise*.7;c.vx=Math.sin(c.h)*v;c.vz=Math.cos(c.h)*v;return c;}return null;}
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
function newNPC(kind,x,z,o){let H;if(o&&o.look){H=makeHuman(o.look);delete o.look;}else if(kind==='ped'&&humanPool.length){H=humanPool.pop();resetHuman(H);}else H=makeHuman(randomLook(kind));const n=Object.assign({kind,x,z,h:rnd(0,6.28),H,hp:kind==='cop'?90:kind==='guard'?90:kind==='fighter'?110:60,state:'walk',spd:0,t:0,cd:rnd(.3,1),dir:Math.random()<.5?1:-1,walkSpd:rnd(1.2,1.7),b:null,s:0,vx:0,vz:0,kvx:0,kvz:0,stag:0,kd:0,windT:0,pend:0,atkK:'punch'},o||{});n.maxHp=n.hp;npcs.push(n);if(kind==='cop'||kind==='guard')giveCopGun(n);n.H.root.position.set(x,0,z);return n;}
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
      if(n.kind==='guard'&&dp>45&&!n.story){n.state='leave';}
    }else if(n.state==='leave'){H.guard=0;spd=4;n.h=lerpA(n.h,Math.atan2(n.x-P.x,n.z-P.z),dt*4);n.x+=Math.sin(n.h)*spd*dt;n.z+=Math.cos(n.h)*spd*dt;if(dp>70)removeNPC(n);}
    if(n.state!=='fight')H.guard=0;
    const p=resolve(n.x,n.z,.35);if(p){n.x+=p[0];n.z+=p[1];if(n.state==='walk'&&n.b){n.dir=-n.dir;}}
  }
  n.onRoad=!blockAt(n.x,n.z)||(()=>{const b=blockAt(n.x,n.z);return n.x<b.x0||n.x>b.x1||n.z<b.z0||n.z>b.z1;})();
  if(vis){H.root.position.set(n.x,n.onRoad?heightAt(n.x,n.z):groundY(n.x,n.z),n.z);H.root.rotation.y=n.h;animHuman(H,dt,spd,time);}
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
function selectWeapon(w){if(w!=='fist'&&!save.weapons[w]){showPrompt(L('Chưa có súng này · mua ở Súng Tầm Xa','You do not own this gun · buy it at Long Range Guns'),1.6);return;}P.weapon=w;P.trigger=false;attachWeapon();hudT=0;lastHUD='';}
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
function fireWeapon(){const w=P.weapon,W=WEAP[w];if(!W)return;if(save.ammo[w]<=0){sfx('empty');showPrompt(L('Hết đạn · mua thêm ở Súng Tầm Xa','Out of ammo · buy more at Long Range Guns'),1.4);P.trigger=false;return;}
  save.ammo[w]--;P.fireCD=W.rate;P.lastShot=time;P.lastPunch=time;sfx(w);cam.shake=Math.max(cam.shake,w==='rifle'?.06:.03);
  muzzlePos(P.H,_o);if(P.aiming){camera.getWorldDirection(_d);const tgt=camera.position.clone().addScaledVector(_d,60);_d.copy(tgt).sub(_o).normalize();}
  else{const f=nearestFoe(W.range*.6,1.2);if(f){P.h=Math.atan2(f.x-P.x,f.z-P.z);_d.set(f.x-_o.x,1.25-_o.y,f.z-_o.z).normalize();}else _d.set(Math.sin(P.h),0,Math.cos(P.h));}
  _d.x+=rnd(-1,1)*W.spread;_d.y+=rnd(-1,1)*W.spread;_d.z+=rnd(-1,1)*W.spread;_d.normalize();
  const r=rayHit(_o,_d,W.range,P),end=_o.clone().addScaledVector(_d,r.t);addTracer(_o,end);fx3(_o.x,_o.y,_o.z,false);if(stHeli&&stHeliHit(_o,_d,r.t,W.dmg*.35))r.kind=null;
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
function exitCarNow(){if(P.plane){P.plane=null;}if(P.tour){P.tour=null;const T0=AIR.tour;T0.x=T0.home.x;T0.z=T0.home.z;T0.h=T0.home.h;T0.y=AP.y;T0.p=T0.r=0;poseP(T0);}if(P.seq){const q=P.seq;P.seq=null;q.c.doorT=0;q.c.pseat=false;if(q.k==='in'&&q.kind0&&q.c.driver)q.c.kind=q.kind0;}if(!P.car){P.H.root.visible=true;return;}radioStop();engineOff();dismount();P.car.kind='parked';P.car.driver=false;P.car.pseat=false;P.car=null;P.H.root.visible=true;}
function mount(c){if(c.type!=='bike')return;const H=P.H;scene.remove(H.root);H.root.position.set(0,.05,-.25);H.root.rotation.set(0,0,0);c.m.bg.add(H.root);H.root.visible=true;rideBikePose(H);P.bike=c;}
function dismount(){if(!P.bike)return;const H=P.H;P.bike.m.bg.remove(H.root);scene.add(H.root);H.legL.rotation.z=H.legR.rotation.z=0;H.hips.position.y=.95;H.root.rotation.set(0,0,0);P.bike=null;}
function loseDirty(){const d=P.dirty;P.dirty=0;if(heist&&heist.stage!=='done')heist=null;return d;}
function wasted(){if(STORY)stDied();const fine=Math.min(save.money,Math.max(100,Math.round(save.money*.08)));save.money-=fine;const d=loseDirty();exitCarNow();clearChaos();failMission('Bất tỉnh giữa nhiệm vụ');
  P.koT=3.2;P.H.ko=1;setTimeout(()=>{P.H.ko=0;P.koT=0;P.hp=maxHp();spawnAt(SP.hospital.x,SP.hospital.z,0);P.inv=3;},2600);
  banner('BẤT TỈNH',`Tỉnh dậy ở bệnh viện · viện phí ${fmt$(fine)}${d?` · mất ${fmt$(d)} tiền nóng`:''}`,3.6);writeSave();}
function busted(){const fine=Math.min(save.money,Math.round(save.money*.1));save.money-=fine;const d=loseDirty();exitCarNow();clearChaos();failMission('Bị bắt giữa nhiệm vụ');
  P.hp=maxHp();spawnAt(SP.police.x,SP.police.z,0);P.inv=3;banner('BỊ BẮT',`Nộp phạt ${fmt$(fine)}${d?` · tịch thu ${fmt$(d)} tiền nóng`:''}`,3.6);writeSave();}

/* ---------- car enter / exit ---------- */
function groundY(x,z){const b=blockAt(x,z);return b&&x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1&&!inCut(b,x,z)?.25:heightAt(x,z);}
function L2W(c,lx,lz){const ch=Math.cos(c.h),sh=Math.sin(c.h);return[c.x+lx*ch+lz*sh,c.z-lx*sh+lz*ch];}
const DOOR_OPEN=1.15,ease=k=>k<.5?2*k*k:1-2*(1-k)*(1-k);
function doorsUpdate(dt){for(const c of cars){const m=c.m;if(!m.door)continue;
    if(c.doorA!==c.doorT){const d=c.doorT-c.doorA,st=dt*(c.doorT>c.doorA?3.6:4.4);c.doorA=Math.abs(d)<=st?c.doorT:c.doorA+Math.sign(d)*st;
      if(c.doorA===0&&c.doorT===0&&c.slam){c.slam=0;if(hyp(c.x-P.x,c.z-P.z)<25)sfx('door');}}
    const open=c.doorA>.002;m.door.visible=m.hole.visible=open;if(open)m.door.rotation.y=-ease(c.doorA/DOOR_OPEN)*DOOR_OPEN;
    m.drv.visible=!!(c.driver||c.pseat)&&c.mesh.visible&&hyp(c.x-P.x,c.z-P.z)<70;}}
function seqCancel(){const q=P.seq;if(!q)return;P.seq=null;const c=q.c;c.slam=1;c.doorT=0;if(q.k==='in'){if(q.kind0&&c.driver){c.kind=q.kind0;}P.H.root.visible=true;c.pseat=false;}else finishExit(q);}
function startEnter(c){const D=c.m.D,o=L2W(c,c.spec.w/2+.6,D.zc-.25);if(resolve(o[0],o[1],.32)||Math.abs(c.vf)>4)return false;
  const q={k:'in',c,ph:'walk',t:0,kind0:null};if(c.driver){q.kind0=c.kind;c.kind='held';c.ai=null;}c.vx=c.vz=c.vf=0;P.seq=q;P.blocking=false;P.pend=null;return true;}
function startExit(c){const D=c.m.D,o=L2W(c,c.spec.w/2+.6,D.zc-.25);if(resolve(o[0],o[1],.32))return false;
  c.vx=c.vz=c.vf=0;radioStop();engineOff();P.seq={k:'out',c,ph:'open',t:0};c.doorT=DOOR_OPEN;sfx('door');return true;}
function finishEnter(c){c.kind='player';c.ai=null;c.driver=false;c.pseat=true;setDriverLook(c,CHARS[save.char]||CHARS.minh);P.car=c;P.H.root.visible=false;mount(c);engineOn();P.blocking=false;P.pend=null;cam.lastDrag=-1e9;tutEvent('enter');
  if(radio.idx>=0&&radioPlay())showPrompt('Radio: '+radioNames()[radio.idx]+' · R đổi bài',1.8);}
function finishExit(q){const c=q.c;P.seq=null;dismount();c.kind='parked';c.driver=false;c.pseat=false;P.car=null;P.H.root.visible=true;c.slam=1;c.doorT=0;radioStop();engineOff();tutEvent('exit');}
function pullDriver(c){const a=L2W(c,c.spec.w/2+.25,c.m.D.zc-.1),pol=c.kind==='police'||c.type==='police'||(P.seq&&P.seq.kind0==='police');
  const n=newNPC(pol?'cop':'ped',a[0],a[1],{look:c.look||randomLook(pol?'cop':'ped'),state:'down',t:99,onRoad:true});n.h=c.h-Math.PI/2;n.b=null;c.driver=false;
  if(pol){crime(2,true);}else{crime(1,false);if(Math.random()<.3){n.fighter=true;}}return n;}
function seqUpdate(dt){const q=P.seq,c=q.c,H=P.H,D=c.m.D,S=D.seat;q.t+=dt;let spd=0;const out=L2W(c,c.spec.w/2+.6,D.zc-.25),seat=L2W(c,S.x,S.z),faceIn=c.h-Math.PI/2,faceOut=c.h+Math.PI/2;
  if(q.k==='in'){
    if(q.ph==='walk'){const dx=out[0]-P.x,dz=out[1]-P.z,d=hyp(dx,dz);if(d>.08&&q.t<1.6){const st=Math.min(d,4.6*dt);P.x+=dx/d*st;P.z+=dz/d*st;P.h=lerpA(P.h,Math.atan2(dx,dz),1-Math.exp(-14*dt));spd=4.6;}else{P.x=out[0];P.z=out[1];q.ph='open';q.t=0;c.doorT=DOOR_OPEN;sfx('door');}}
    else if(q.ph==='open'){P.h=lerpA(P.h,faceIn,1-Math.exp(-14*dt));if(q.t>.42){q.t=0;q.ph=c.driver?'pull':'climb';if(c.driver)q.n=pullDriver(c);}}
    else if(q.ph==='pull'){const n=q.n,k=Math.min(1,q.t/.6),e=ease(k),src=L2W(c,c.spec.w/2+.25,D.zc-.1),dst=L2W(c,c.spec.w/2+1.4,D.zc-1.4);
      if(n&&npcs.includes(n)){n.x=src[0]+(dst[0]-src[0])*e;n.z=src[1]+(dst[1]-src[1])*e;n.h=faceIn;if(k>.55)n.H.ko=1;if(q.t>1.05){n.t=1.3;n.onRoad=false;}}
      P.x=out[0]+(dst[0]-out[0])*.12*Math.sin(k*Math.PI);P.z=out[1]+(dst[1]-out[1])*.12*Math.sin(k*Math.PI);P.h=lerpA(P.h,faceIn,1-Math.exp(-10*dt));
      if(q.t>1.05){q.ph='climb';q.t=0;}}
    else if(q.ph==='climb'){const k=Math.min(1,q.t/.55),e=ease(k);P.x=out[0]+(seat[0]-out[0])*e;P.z=out[1]+(seat[1]-out[1])*e;P.h=lerpA(faceIn,c.h,e);
      if(k>.6&&H.root.visible){H.root.visible=false;c.pseat=true;setDriverLook(c,CHARS[save.char]||CHARS.minh);}
      if(k>=1){q.ph='close';q.t=0;c.slam=1;c.doorT=0;}}
    else if(q.ph==='close'){if(q.t>.3){P.seq=null;finishEnter(c);return;}}
  }else{
    if(q.ph==='open'){P.x=seat[0];P.z=seat[1];P.h=c.h;if(q.t>.38){q.ph='climb';q.t=0;c.pseat=false;H.root.visible=true;}}
    else if(q.ph==='climb'){const k=Math.min(1,q.t/.55),e=ease(k);P.x=seat[0]+(out[0]-seat[0])*e;P.z=seat[1]+(out[1]-seat[1])*e;P.h=lerpA(c.h,faceOut,e);spd=k<1?2.5:0;if(k>=1){P.h=faceOut;finishExit(q);}}
  }
  P.y=groundY(P.x,P.z);H.root.position.set(P.x,P.y,P.z);H.root.rotation.y=P.h;animHuman(H,dt,spd,time);
  // hands on the door, then a tug when pulling someone out, and a step up into the seat
  if(q.ph==='open'&&q.k==='in'){H.armR.rotation.x=-1.15;H.elR.rotation.x=-.3;}
  if(q.ph==='pull'){const k=Math.min(1,q.t/.6);H.armL.rotation.x=H.armR.rotation.x=-1.35+k*.6;H.elL.rotation.x=H.elR.rotation.x=-.5;H.spine.rotation.x=-.32*Math.sin(Math.min(1,q.t/.8)*Math.PI);}
  if(q.ph==='climb'){const k=Math.min(1,q.t/.55),u=Math.sin(k*Math.PI);H.legR.rotation.x=-1.1*u;H.knR.rotation.x=1.2*u;H.spine.rotation.x=.35*u;H.root.position.y+=.18*u;}
}
function toggleCar(){
  if(P.koT>0||P.seq)return;
  if(P.tour){endTour();return;}if(P.plane){exitPlane();return;}if(!P.car){const pl=nearPlane();if(pl){enterPlane(pl);return;}}
  if(P.car){const c=P.car;if(Math.abs(c.vf)>6){showPrompt('Giảm tốc để xuống xe',1.2);return;}
    if(c.m.door&&Math.abs(c.vf)<4.5&&!P.inside&&startExit(c))return;
    const lx=Math.cos(c.h),lz=-Math.sin(c.h);let ok=false;for(const s of[1.9,-1.9]){const x=c.x+lx*s,z=c.z+lz*s;if(!resolve(x,z,.4)){P.x=x;P.z=z;ok=true;break;}}if(!ok){P.x=c.x+Math.sin(c.h)*3.2;P.z=c.z+Math.cos(c.h)*3.2;}
    dismount();engineOff();c.kind='parked';c.driver=false;c.pseat=false;P.car=null;P.H.root.visible=true;P.h=c.h;radioStop();tutEvent('exit');return;}
  let best=null,bd=4.5;for(const c of cars){const d=hyp(c.x-P.x,c.z-P.z);if(d<bd){bd=d;best=c;}}
  if(!best)return;
  if(best.m.door&&best.hp>0&&startEnter(best)){if(best.type==='police'&&!best.driver)crime(1,true);return;}
  if(best.type==='police'&&!best.driver)crime(1,true);
  if(best.m.rider)best.m.rider.root.visible=false;
  if(best.driver){const lx=Math.cos(best.h),lz=-Math.sin(best.h);const n=newNPC(best.kind==='police'?'cop':'ped',best.x+lx*2,best.z+lz*2);
    if(best.kind==='police'){crime(2,true);n.state='fight';}else{if(Math.random()<.3){n.state='fight';n.t=20;n.fighter=true;}else{n.state='flee';n.t=6;}crime(1,false);}n.b=blockAt(n.x,n.z);}
  best.kind='player';best.ai=null;best.driver=false;best.pseat=true;if(best.m.drv)setDriverLook(best,CHARS[save.char]||CHARS.minh);P.car=best;P.H.root.visible=false;mount(best);engineOn();P.blocking=false;P.pend=null;cam.lastDrag=-1e9;tutEvent('enter');
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
function playerLook(){const b=Object.assign({},CHARS[save.char]||CHARS.minh),o=OUTFITS[save.outfit]||{};for(const k of['shirt','pants','shoes','sleeve','longSleeve','skirt'])if(o[k]!==undefined)b[k]=o[k];if(o.shirt!==undefined){b.jacket=null;if(o.longSleeve===undefined)b.longSleeve=false;}b.cap=save.cap?'#1d1d1d':null;if(save.outfit==='nexus'&&save.cap)b.cap='#ad8dff';return b;}
function rebuildPlayer(){const old=P.H;const H=makeHuman(playerLook());H.root.position.copy(old.root.position);H.root.rotation.copy(old.root.rotation);H.root.visible=old.root.visible;scene.remove(old.root);old.root.traverse(o=>{if(o.geometry&&o.material===HUMAT)o.geometry.dispose();});P.H=H;if(weaponMesh)attachWeapon();}
const VEH={bike:{n:'Xe máy',p:1500},hatch:{n:'Xe hatchback nhỏ',p:4500},sedan:{n:'Sedan gia đình',p:6000},minivan:{n:'Xe gia đình 7 chỗ',p:8500},van:{n:'Xe tải van',p:9000},suv:{n:'SUV 7 chỗ',p:11000},pickup:{n:'Bán tải',p:13000},jeep:{n:'Xe địa hình gầm cao',p:16000},coupe:{n:'Coupe 2 cửa',p:18000},muscle:{n:'Xe cơ bắp Mỹ',p:22000},sports:{n:'Xe thể thao',p:24000},limo:{n:'Limousine',p:35000},bus:{n:'Xe buýt thành phố',p:40000},super:{n:'Siêu xe Nexus GT',p:60000},hyper:{n:'Siêu xe Hyper X',p:95000},legend:{n:'Siêu xe Huyền Thoại',p:0,unique:true}};
const SHOPS={
  food:{n:'Cơm Tấm Cô Ba',items:[{n:'Bánh mì thịt',d:'+25 máu',p:8,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Bánh mì thịt'),hp:25,col:'#c98b4a'})},{n:'Cơm tấm sườn bì chả',d:'+60 máu',p:18,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Cơm tấm sườn bì chả'),hp:60,col:'#a33b20'})},{n:'Phở bò tái',d:'Hồi đầy máu',p:25,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Phở bò tái'),hp:200,col:'#e9c46a'})},{n:'Trà sữa trân châu',d:'+15 máu, chạy nhanh hơn 60 giây',p:12,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Trà sữa trân châu'),hp:15,boost:1,col:'#d4a373'})}]},
  tea:{n:'Trà quán Phố Cổ',items:[{n:'Trà sen nóng',d:'+20 máu',p:6,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Trà sen nóng'),hp:20,col:'#c9a227'})},{n:'Bánh đậu xanh',d:'+30 máu',p:8,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Bánh đậu xanh'),hp:30,col:'#e9c46a'})},{n:'Cao lầu',d:'+70 máu',p:20,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Cao lầu'),hp:70,col:'#c98b4a'})},{n:'Cà phê trứng',d:'+15 máu, chạy nhanh hơn 60 giây',p:10,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Cà phê trứng'),hp:15,boost:1,col:'#d4a373'})}]},
  sea:{n:'Nhà hàng Hải sản Biển Xanh',items:[{n:'Mực nướng',d:'+40 máu',p:14,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Mực nướng'),hp:40,col:'#f4a261'})},{n:'Tôm hùm bơ tỏi',d:'Hồi đầy máu',p:60,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Tôm hùm bơ tỏi'),hp:200,col:'#e63946'})},{n:'Cá kho tộ',d:'+60 máu',p:22,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Cá kho tộ'),hp:60,col:'#8a4b2a'})},{n:'Nước dừa',d:'+15 máu',p:5,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Nước dừa'),hp:15,col:'#f1faee'})}]},
  saloon:{n:'Saloon Chim Ưng',items:[{n:'Đậu hầm thịt xông khói',d:'+45 máu',p:12,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Đậu hầm thịt xông khói'),hp:45,col:'#8a4b2a'})},{n:'Bò nướng than',d:'Hồi đầy máu',p:40,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Bò nướng than'),hp:200,col:'#6b2e1a'})},{n:'Bia gừng',d:'+15 máu, chạy nhanh hơn 60 giây',p:7,ok:()=>!P.tray,fn:()=>takeFood({n:TT('Bia gừng'),hp:15,boost:1,col:'#e9c46a'})}]},
  bar:{n:'Quầy bar Nexus Grand',items:[{n:'Nước cam ép',d:'+15 máu',p:6,fn:()=>heal(15)},{n:'Cà phê sữa đá',d:'+10 máu, chạy nhanh hơn 60 giây',p:9,fn:()=>{heal(10);P.boostT=60;}},{n:'Mocktail nhiệt đới',d:'+35 máu',p:15,fn:()=>heal(35)},{n:'Bít tết bò',d:'Hồi đầy máu',p:45,fn:()=>heal(999)}]},
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
  if(S.kind==='cars'){return Object.keys(VEH).filter(k=>!VEH[k].unique).map(k=>({n:VEH[k].n,d:L('Giao xe ngay trước cửa, lưu vào gara nhà bạn','Delivered out front and kept in your home garage'),p:VEH[k].p,fn:()=>buyVehicle(k)}));}
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
/* ======== MORE INTERIORS: restaurant, police station, every shop, and shared rooms for the city's other buildings ======== */
const XROOM={food:'diner',mart:'mart',guns:'guns',gym:'gym',clothes:'clothes',cars:'cars'};
function sitPose(H,eat){H.root.rotation.x=0;H.hips.position.y=.5;H.legL.rotation.x=H.legR.rotation.x=-1.5;H.legL.rotation.z=.06;H.legR.rotation.z=-.06;H.knL.rotation.x=H.knR.rotation.x=1.5;H.spine.rotation.set(.06,0,0);H.armL.rotation.x=-.85;H.elL.rotation.x=-.55;
  if(eat!=null&&eat>=0){const k=.5+.5*Math.sin(eat);H.armR.rotation.x=-.95-.5*k;H.elR.rotation.x=-.7-1.25*k;H.head.rotation.x=.14-.12*k;}else{H.armR.rotation.x=-.85;H.elR.rotation.x=-.55;H.head.rotation.x=0;}H.head.rotation.y=0;}
function extra(look,x,z,h,sit){const H=makeHuman(look);H.root.position.set(x,0,z);H.root.rotation.y=h;if(sit)sitPose(H,-1);else{H.armL.rotation.x=H.armR.rotation.x=-.08;H.elL.rotation.x=H.elR.rotation.x=-.2;}return H;}
/* chair facing h (0:+z, PI:-z, PI/2:+x, -PI/2:-x); the seat goes into R.seats so the player can sit on it */
function chair(R,x,z,h,col,taken){const fx=Math.round(Math.sin(h)),fz=Math.round(Math.cos(h)),c=col||'walnut',w=.23;
  itb(c,x-w,x+w,.42,.48,z-w,z+w);for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])itb('dark',x+a*.19-.025,x+a*.19+.025,0,.42,z+b*.19-.025,z+b*.19+.025);
  const bx=x-fx*.21,bz=z-fz*.21;if(fz)itb(c,x-w,x+w,.48,1.02,bz-.03,bz+.03);else itb(c,bx-.03,bx+.03,.48,1.02,z-w,z+w);
  addCol({t:'c',x,z,r:.22});const s={x,z,h,taken:!!taken};R.seats.push(s);return s;}
function rtable(x,z,r,top){cyl(top||'oak',x,.73,.77,z,r,r,22);cyl('dark',x,.03,.73,z,.05,.05,8);cyl('dark',x,0,.03,z,.32,.32,14);addCol({t:'c',x,z,r:r+.05});}
function sofa(R,x,z,h,len,col){const fx=Math.round(Math.sin(h)),fz=Math.round(Math.cos(h)),c=col||'sofa';
  if(fz){itb(c,x-len/2,x+len/2,.1,.45,z-.45,z+.45,{col:1});const bz=z-fz*.36;itb(c,x-len/2,x+len/2,.45,.95,bz-.1,bz+.1);itb(c,x-len/2-.15,x-len/2,.1,.7,z-.45,z+.45);itb(c,x+len/2,x+len/2+.15,.1,.7,z-.45,z+.45);
    for(let k=0;k<Math.round(len/.8);k++){const sx=x-len/2+.4+k*(len/Math.round(len/.8));R.seats.push({x:sx,z:z+fz*.05,h,sofa:1});}}
  else{itb(c,x-.45,x+.45,.1,.45,z-len/2,z+len/2,{col:1});const bx=x-fx*.36;itb(c,bx-.1,bx+.1,.45,.95,z-len/2,z+len/2);itb(c,x-.45,x+.45,.1,.7,z-len/2-.15,z-len/2);itb(c,x-.45,x+.45,.1,.7,z+len/2,z+len/2+.15);
    for(let k=0;k<Math.round(len/.8);k++){const sz=z-len/2+.4+k*(len/Math.round(len/.8));R.seats.push({x:x+fx*.05,z:sz,h,sofa:1});}}}
function act(R,x,z,r,txt,fn,ok){(R.acts||(R.acts=[])).push({x,z,r,txt,fn,ok});}
function menuTex(title,rows,bg,fg){return makeTex(512,384,(g,w,h)=>{g.fillStyle=bg||'#1d1f22';g.fillRect(0,0,w,h);g.fillStyle=fg||'#ffb703';g.font='800 44px Inter,sans-serif';g.textAlign='center';g.fillText(title,w/2,58);
  g.fillRect(40,74,w-80,3);g.font='600 27px Inter,sans-serif';rows.forEach((r,i)=>{g.textAlign='left';g.fillStyle='#f4f1ea';g.fillText(r[0],40,124+i*52);g.textAlign='right';g.fillStyle=fg||'#ffb703';g.fillText(r[1],w-40,124+i*52);});});}
function noticeTex(t1,t2,col){return makeTex(256,320,(g,w,h)=>{g.fillStyle='#f3ecd8';g.fillRect(0,0,w,h);g.fillStyle=col||'#8f1a20';g.font='800 40px Inter,sans-serif';g.textAlign='center';g.fillText(t1,w/2,52);
  g.fillStyle='#3a3a3a';g.fillRect(58,76,140,150);g.fillStyle='#c9b79a';g.beginPath();g.arc(128,130,34,0,7);g.fill();g.fillRect(86,170,84,56);g.fillStyle='#222';g.font='700 26px Inter,sans-serif';g.fillText(t2,w/2,268);});}
const LOOT={},DINERS=[];let curDoor=null;
/* ---- RESTAURANT: order at the counter, carry the tray, sit at a table and eat ---- */
{const R=room('diner',3300,0,22,16,3.4,{wall:'plasterW',floor:'tileK',fts:.9,wts:1.6,ceil:'plaster',wain:'red',wainH:1.05,rail:'white',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3300;R.seats=[];
  // kitchen behind the counter: stoves, hood, fridge, shelves with pots
  itb('steel',x0+.2,x1-.2,0,.92,z0+.1,z0+.8,{col:1});itb('dark',x0+.2,x1-.2,.92,.96,z0+.1,z0+.8);for(let k=0;k<4;k++){const x=cx-5+k*1.6;cyl('black',x,.96,.99,z0+.45,.16,.16,14);cyl('steel',x+.05,.99,1.2,z0+.45,.14,.12,14);}
  itb('steel',cx-6,cx+1,2.2,2.6,z0+.05,z0+1.1);itb('white',x1-2,x1-.3,0,2.1,z0+.1,z0+.85,{col:1});itb('chrome',x1-1.95,x1-1.9,.9,1.6,z0+.86,z0+.9);
  for(const y of[1.6,2.0])itb('walnut',x0+.4,x0+4,y,y+.04,z0+.05,z0+.4);for(let k=0;k<5;k++){cyl('steel',x0+.8+k*.7,1.64,1.84,z0+.22,.12,.12,12);cyl('red',x0+.8+k*.7,2.04,2.2,z0+.22,.1,.1,10);}
  // the counter with a glass food display, register and stools
  itb('red',cx-6,cx+6,0,1.0,z0+2.6,z0+3.4,{col:1});itb('marbleTop',cx-6.1,cx+6.1,1.0,1.06,z0+2.5,z0+3.5,{bot:1});itb('white',cx-6,cx+6,.12,.22,z0+3.39,z0+3.42);
  ibox(cx-4,cx+1,1.06,1.42,z0+2.7,z0+3.3,'#cfe8ef');for(let k=0;k<6;k++)ibox(cx-3.8+k*.8,cx-3.3+k*.8,1.07,1.16,z0+2.8,z0+3.2,['#c98b4a','#e9c46a','#a33b20','#f4f1ea','#6a994e','#d4a373'][k]);
  itb('black',cx+2.5,cx+3.1,1.06,1.3,z0+2.8,z0+3.2);glow('#38ff8a',cx+2.8,1.25,z0+3.21,.4,.1,0,1);
  for(let k=0;k<4;k++){const x=cx+3.8+k*.6;cyl('chrome',x,0,.72,z0+3.9,.035,.035,8);cyl('red',x,.72,.8,z0+3.9,.2,.2,14);}
  glow(menuTex('THỰC ĐƠN',[['Bánh mì thịt','$8'],['Cơm tấm sườn bì chả','$18'],['Phở bò tái','$25'],['Trà sữa trân châu','$12']]),cx-1,2.35,z0+1.13,2.6,1.6,0,1);
  sign('CƠM TẤM CÔ BA',cx+4.2,2.55,z0+1.12,0,3.2,.6,{fg:'#3a2000',bg:'#ffb703',size:64,w:1024,h:160});
  R.counter={x:cx-1,z:z0+4.3};act(R,cx-1,z0+4.2,2.3,()=>P.tray?L('Bạn đang cầm khay · ra bàn ngồi ăn','You are holding a tray · sit at a table'):L('Gọi món','Order food'),()=>{if(!P.tray)openShop('food');});
  extra(Object.assign(randomLook('ped'),{shirt:'#f4f1ea',pants:'#2b2b2b',cap:'#f4f1ea',jacket:null}),cx-1,z0+1.9,0);extra(Object.assign(randomLook('ped'),{shirt:'#e63946',jacket:null}),cx-4.4,z0+1.4,Math.PI*.1);
  // dining room: eight tables with two chairs each, some customers already eating
  const cust=[[0,0],[2,1],[5,0],[6,1]];let ti=0;
  for(const tx of[cx-7.4,cx-3.9,cx+3.9,cx+7.4])for(const tz of[z0+7.6,z0+11.6]){rtable(tx,tz,.55);const a=chair(R,tx,tz-.82,0,'walnut'),b=chair(R,tx,tz+.82,Math.PI,'walnut');
    for(const[i,s]of cust)if(i===ti){const ch=s?b:a;ch.taken=true;const H=extra(randomLook('ped'),ch.x,ch.z,ch.h,true);cyl('white',tx,.77,.79,tz+(s?.3:-.3),.15,.15,14);sph('red',tx,.82,tz+(s?.3:-.3),.08,.5);DINERS.push(H);}
    cyl('white',tx+.25,.77,.9,tz,.03,.03,6);ti++;}
  // booths along both side walls
  for(const s of[-1,1]){const x=s<0?x0+.7:x1-.7;for(const z of[z0+6,z0+9.5,z0+13]){itb('oak',x-.45,x+.45,.74,.78,z-.5,z+.5,{col:1});itb('dark',x-.05,x+.05,0,.74,z-.05,z+.05);}}
  plant(x0+.6,z1-.8,1.1);plant(x1-.6,z1-.8,1.1);pframe(paintingTex(1),x0+.03,2.1,z0+9.5,1.6,1,Math.PI/2);pframe(paintingTex(2),x1-.03,2.1,z0+9.5,1.6,1,-Math.PI/2);
  for(let x=x0+2.5;x<x1-1;x+=4)for(let z=z0+2.5;z<z1-1;z+=4)IE.push([x,R.h-.04,z]);
  R.lights=[[cx,3.1,z0+3,1.1,'#ffe2b8',14],[cx-5,3.1,z0+10,1,'#ffd9a6',13],[cx+5,3.1,z0+10,1,'#ffd9a6',13]];}
/* ---- POLICE STATION: front desk, offices, holding cells, armoury ---- */
{const R=room('police',3380,0,26,18,3.6,{wall:'plasterW',floor:'tileW',fts:1.2,wts:1.6,ceil:'ceilT',cts:1.2,wain:'blue',wainH:1.1,rail:'steel',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3380;R.seats=[];
  sign('CẢNH SÁT NEXUS',cx,3.0,z0+.04,0,5,.6,{fg:'#ffffff',bg:'#1f3a75',size:64,w:1024,h:128});
  // front desk across the hall
  itb('walnut',cx-4,cx+4,0,1.1,z0+9,z0+9.8,{col:1});itb('marbleTop',cx-4.1,cx+4.1,1.1,1.16,z0+8.9,z0+9.95,{bot:1});itb('blue',cx-4.01,cx+4.01,.2,.4,z0+9.79,z0+9.82);
  for(const x of[cx-2,cx+2]){itb('black',x-.32,x+.32,1.16,1.55,z0+9.1,z0+9.15);glow(screenTex('doc'),x,1.36,z0+9.16,.58,.34,0,.9);}
  extra(randomLook('cop'),cx-1,z0+8.4,0);R.desk={x:cx,z:z0+10.6};
  act(R,cx,z0+10.5,2.6,()=>stars>0?L('Đầu thú: nộp phạt ','Turn yourself in: pay a fine of ')+fmt$(stars*250)+L(' để xoá truy nã',' to clear your wanted level'):L('Nói chuyện với trực ban','Talk to the desk officer'),()=>{
    if(stars>0){const f=stars*250;if(save.money<f){showPrompt(L('Không đủ tiền nộp phạt','Not enough money for the fine'),1.6);return;}save.money-=f;stars=0;evadeT=0;lastSeen=null;sfx('cash');writeSave();banner(L('ĐÃ NỘP PHẠT','FINE PAID'),L('Bạn không còn bị truy nã','You are no longer wanted'));}
    else showPrompt(pick([L('“Hôm nay thành phố yên bình. Lái xe cẩn thận nhé!”','“Quiet day in the city. Drive safe!”'),L('“Có gì bất thường cứ báo cho chúng tôi.”','“Report anything unusual to us.”'),L('“Đừng chạy quá tốc độ trên cầu lớn!”','“No speeding on the big bridge!”')]),2.4);});
  // waiting chairs by the entrance
  for(let k=0;k<4;k++)chair(R,x0+2+k*.6,z1-3,Math.PI/2,'blue');
  for(let k=0;k<4;k++)chair(R,x1-2-k*.6,z1-3,-Math.PI/2,'blue');
  // two office desks with computers and chairs
  for(const x of[x0+4,x1-4]){itb('oak',x-1.1,x+1.1,.74,.78,z0+5,z0+6,{col:1,bot:1});itb('dark',x-1.05,x-.95,0,.74,z0+5.05,z0+5.95);itb('dark',x+.95,x+1.05,0,.74,z0+5.05,z0+5.95);
    itb('black',x-.3,x+.3,.8,1.2,z0+5.2,z0+5.25);glow(screenTex('doc'),x,1.0,z0+5.26,.54,.32,0,.9);chair(R,x,z0+6.7,Math.PI,'dark');ibox(x+.5,x+.9,.78,.8,z0+5.4,z0+5.8,'#f3ecd8');}
  extra(randomLook('cop'),x0+4,z0+6.7,Math.PI,true);R.seats[R.seats.length-2].taken=true;
  // holding cells along the back wall with bars
  for(let k=0;k<3;k++){const a=cx-1.5+k*3,b=a+3;itb('plasterW',b-.1,b+.1,0,R.h,z0,z0+3.2,{col:1});itb('steel',a+.3,b-.3,0,.45,z0+.2,z0+.9,{col:1});
    for(let x=a+.2;x<b-.1;x+=.25)cyl('chrome',x,0,2.9,z0+3.2,.025,.025,6);itb('steel',a,b,2.85,2.95,z0+3.15,z0+3.25);addCol({t:'b',x0:a,x1:b,z0:z0+3.1,z1:z0+3.3,h:3});}
  itb('plasterW',cx-1.6,cx-1.4,0,R.h,z0,z0+3.2,{col:1});
  // armoury lockers, notice board with wanted posters, flag, plants
  for(let k=0;k<5;k++){const z=z0+1+k*.62;itb('steel',x1-.65,x1-.05,0,2,z-.3,z+.3,{col:1});itb('dark',x1-.66,x1-.65,1.5,1.7,z-.2,z+.2);}
  act(R,x1-1.4,z0+2.2,1.8,()=>L('Tủ vũ khí: áo giáp · $350','Armoury: body armour · $350'),()=>{if(save.armor>=100){showPrompt(L('Bạn đã có giáp đầy','Your armour is full'),1.4);return;}if(save.money<350){showPrompt(L('Không đủ tiền','Not enough money'),1.2);return;}save.money-=350;save.armor=100;sfx('cash');writeSave();showPrompt(L('Đã mặc áo giáp','Armour on'),1.4);});
  itb('walnut',x0+.04,x0+.1,1.2,2.4,z0+1,z0+4);for(let k=0;k<3;k++)glow(noticeTex(L('TRUY NÃ','WANTED'),'$'+(k+1)*500),x0+.11,1.8,z0+1.6+k*1,.7,.88,Math.PI/2,.9);
  cyl('chrome',x0+.6,0,2.6,z0+7.5,.03,.03,8);ibox(x0+.63,x0+.65,1.7,2.5,z0+7.5,z0+8.7,'#d62828');plant(x0+.7,z1-.8,1.2);plant(x1-.7,z1-.8,1.2);
  for(let x=x0+2.5;x<x1-1;x+=4)for(let z=z0+2.5;z<z1-1;z+=4)IE.push([x,R.h-.04,z]);
  R.lights=[[cx,3.3,z0+4,1.1,'#eef6ff',14],[x0+5,3.3,z1-5,1,'#eef6ff',13],[x1-5,3.3,z1-5,1,'#eef6ff',13]];}
/* ---- MINI MART at the gas station ---- */
{const R=room('mart',3460,0,18,14,3.2,{wall:'plasterW',floor:'tileW',fts:.9,wts:1.6,ceil:'ceilT',cts:1.2,skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3460;R.seats=[];
  const PC=['#e63946','#ffb703','#2a9d8f','#3a86ff','#f4a261','#6a994e','#ff8fab','#8338ec','#f1faee'];
  for(const ax of[cx-4.5,cx-1.5,cx+1.5]){itb('steel',ax-.35,ax+.35,0,1.8,z0+2.5,z0+8,{col:1});for(const y of[.15,.6,1.05,1.5])for(let z=z0+2.6;z<z0+7.9;z+=.42){const c=PC[Math.floor(Math.abs(Math.sin(z*7.3+y*3+ax))*9)];ibox(ax-.42,ax-.35,y,y+.32,z,z+.34,c);ibox(ax+.35,ax+.42,y,y+.32,z,z+.34,PC[(PC.indexOf(c)+3)%9]);}}
  for(let k=0;k<5;k++){const x=x0+1+k*1.2;itb('white',x-.58,x+.58,0,2.2,z0+.05,z0+.8,{col:1});glow('#dff4ff',x,1.15,z0+.81,1.05,1.9,0,.55);for(const y of[.4,.9,1.4,1.85])for(let j=0;j<5;j++)ibox(x-.5+j*.2,x-.38+j*.2,y,y+.25,z0+.5,z0+.62,PC[(j+k)%9]);}
  itb('white',x1-4.5,x1-.3,0,1.0,z1-4.2,z1-3.5,{col:1});itb('marbleTop',x1-4.6,x1-.25,1.0,1.05,z1-4.3,z1-3.4,{bot:1});itb('black',x1-2.8,x1-2.2,1.05,1.3,z1-4.1,z1-3.7);ibox(x1-1.6,x1-.6,1.05,1.12,z1-4.2,z1-3.6,'#c1f354');
  itb('walnut',x1-4.4,x1-.3,1.4,2.2,z1-5.9,z1-5.6,{col:1});for(let k=0;k<8;k++)ibox(x1-4.2+k*.48,x1-3.85+k*.48,1.5+(k%2)*.35,1.78+(k%2)*.35,z1-5.95,z1-5.9,PC[k]);
  extra(Object.assign(randomLook('ped'),{shirt:'#e63946',cap:'#e63946',jacket:null}),x1-2.2,z1-4.9,0);
  act(R,x1-2.4,z1-2.8,2.2,L('Thanh toán tại quầy','Pay at the counter'),()=>openShop('mart'));
  sign('XĂNG NEXUS · MART',cx,2.6,z0+.84,0,4,.5,{fg:'#ffffff',bg:'#e63946',size:60,w:1024,h:128});
  plant(x0+.6,z1-.8,1);for(let x=x0+2.5;x<x1-1;x+=3.5)for(let z=z0+2.5;z<z1-1;z+=3.5)IE.push([x,R.h-.04,z]);
  R.lights=[[cx,3,z0+5,1.2,'#f4fbff',14],[cx+4,3,z1-4,1,'#f4fbff',12]];}
/* ---- GUN SHOP ---- */
{const R=room('guns',3540,0,18,14,3.4,{wall:'stone',floor:'oak',fts:1.4,wts:1.8,ceil:'plaster',wain:'walnut',wainH:1.0,rail:'dark',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3540;R.seats=[];
  itb('dark',cx-5,cx+5,0,1.0,z0+4,z0+4.8,{col:1});ibox(cx-5,cx+5,1.0,1.08,z0+3.95,z0+4.85,'#9fc3cf');for(let k=0;k<8;k++)ibox(cx-4.6+k*1.15,cx-4+k*1.15,.92,.97,z0+4.2,z0+4.55,'#1c1d20');
  itb('walnut',x0+1,x1-1,.9,2.8,z0+.05,z0+.12);for(let r=0;r<3;r++)for(let k=0;k<7;k++){const x=x0+2+k*2,y=1.25+r*.55;ibox(x-.7,x+.6,y,y+.1,z0+.13,z0+.2,'#1c1d20');ibox(x-.2,x,y-.18,y,z0+.13,z0+.2,'#3a2a1c');ibox(x+.4,x+.65,y-.05,y+.15,z0+.13,z0+.2,'#2b2b2b');}
  extra(Object.assign(randomLook('ped'),{shirt:'#4a5d3a',beard:true,female:false,hairStyle:'buzz',cap:'#2b2b2b'}),cx,z0+3,0);
  act(R,cx,z0+5.7,2.6,L('Xem súng ở quầy','Browse the counter'),()=>openShop('guns'));
  for(let k=0;k<3;k++)glow(noticeTex(L('BIA TẬP','TARGET'),'','#8f1a20'),x0+.11,1.9,z0+7+k*1.6,.7,.88,Math.PI/2,.9);
  sign('SÚNG TẦM XA',cx,3.0,z0+.13,0,3.6,.45,{fg:'#fff',bg:'#8f1a20',size:60,w:1024,h:128});
  for(let x=x0+2.5;x<x1-1;x+=4)for(let z=z0+2.5;z<z1-1;z+=4)IE.push([x,R.h-.04,z]);R.lights=[[cx,3.1,z0+4,1.1,'#ffe8c8',14],[cx,3.1,z1-4,.9,'#ffe8c8',12]];}
/* ---- GYM: ring, bags, weights ---- */
{const R=room('gym',3620,0,24,16,4.5,{wall:'paper',floor:'oak',fts:1.4,wts:1.6,ceil:'plaster',wain:'green',wainH:1.2,rail:'dark',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3620;R.seats=[];
  // boxing ring
  const rx=cx+5,rz=z0+5;itb('blue',rx-3,rx+3,0,.6,rz-3,rz+3,{col:1});for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])cyl('red',rx+a*2.9,.6,1.9,rz+b*2.9,.07,.07,10);
  for(const y of[1.0,1.35,1.7]){itb('white',rx-2.9,rx+2.9,y,y+.03,rz-2.92,rz-2.88);itb('white',rx-2.9,rx+2.9,y,y+.03,rz+2.88,rz+2.92);itb('white',rx-2.92,rx-2.88,y,y+.03,rz-2.9,rz+2.9);itb('white',rx+2.88,rx+2.92,y,y+.03,rz-2.9,rz+2.9);}
  // heavy bags hanging on chains
  const bags=[];for(let k=0;k<3;k++){const x=x0+2+k*2.2,z=z0+3;cyl('red',x,.9,2.1,z,.22,.22,14);cyl('chrome',x,2.1,R.h,z,.015,.015,6);addCol({t:'c',x,z,r:.3});bags.push({x,z});}
  for(const b of bags)act(R,b.x,b.z+.9,1.2,L('Đấm bao cát','Hit the heavy bag'),()=>{P.h=Math.PI;P.H.side=-(P.H.side||1);P.H.punchT=.32;sfx('hit');gymHits++;if(gymHits%15===0)showPrompt(L('Tập tốt lắm! Mồ hôi ướt áo rồi','Good workout! You are drenched in sweat'),1.6);});
  // dumbbell rack and benches
  itb('dark',x0+.3,x0+.9,0,.9,z0+7,z0+11,{col:1});for(let k=0;k<6;k++){const z=z0+7.3+k*.6;ibox(x0+.35,x0+.85,.92,1.04,z-.08,z+.08,'#151515');}
  for(const z of[z0+8,z0+11]){itb('dark',x0+3,x0+4.6,.38,.48,z-.2,z+.2,{col:1});itb('chrome',x0+3.1,x0+4.5,1.08,1.12,z-.01,z+.01);cyl('black',x0+3.1,1.1,1.16,z,.2,.2,14,'x');cyl('black',x0+4.44,1.1,1.16,z,.2,.2,14,'x');}
  itb('blue',x0+6,x0+11,0,.04,z0+8,z0+12);
  // reception
  itb('white',x1-5,x1-.3,0,1.05,z1-4.4,z1-3.7,{col:1});itb('oak',x1-5.1,x1-.25,1.05,1.1,z1-4.5,z1-3.6,{bot:1});extra(Object.assign(randomLook('fighter'),{female:false}),x1-2.5,z1-5.1,0);
  act(R,x1-2.6,z1-2.9,2.2,L('Đăng ký tập luyện','Sign up for training'),()=>openShop('gym'));
  extra(randomLook('fighter'),rx-1,rz,Math.PI/2).root.position.y=.6;extra(randomLook('fighter'),rx+1,rz,-Math.PI/2).root.position.y=.6;
  sign('VÕ ĐƯỜNG RỒNG XANH',cx-3,3.6,z0+.04,0,5,.7,{fg:'#ffffff',bg:'#1b4332',size:60,w:1024,h:128});
  for(let x=x0+2.5;x<x1-1;x+=4.5)for(let z=z0+2.5;z<z1-1;z+=4.5)IE.push([x,R.h-.04,z]);R.lights=[[rx,4.2,rz,1.2,'#fff3dc',15],[x0+5,4.2,z0+8,1,'#fff3dc',14],[x1-4,4.2,z1-4,1,'#fff3dc',12]];}
/* ---- CLOTHES STORE in Nexus Plaza ---- */
{const R=room('clothes',3700,0,22,16,4,{wall:'plasterW',floor:'marble',fts:2,wts:1.6,ceil:'plaster',crown:'white',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3700;R.seats=[];
  const CC=['#e63946','#1d3557','#2a9d8f','#f1faee','#ffb703','#7b2cbf','#111418','#ff8fab','#6a994e','#c1f354'];
  for(const rz of[z0+4,z0+7.5])for(const rx of[cx-5.5,cx+5.5]){cyl('chrome',rx-1.6,0,1.6,rz,.025,.025,6);cyl('chrome',rx+1.6,0,1.6,rz,.025,.025,6);itb('chrome',rx-1.6,rx+1.6,1.58,1.62,rz-.02,rz+.02);
    for(let k=0;k<12;k++){const x=rx-1.45+k*.26;ibox(x-.02,x+.02,.75,1.55,rz-.28,rz+.28,CC[(k+Math.round(rx+rz))%10]);}addCol({t:'b',x0:rx-1.7,x1:rx+1.7,z0:rz-.35,z1:rz+.35,h:1.7});}
  // mannequins wearing the store outfits
  const ok=Object.keys(OUTFITS);for(let k=0;k<4;k++){const o=OUTFITS[ok[k%ok.length]];const H=extra({female:k%2===1,skin:'#e8e4de',hair:'#e8e4de',shirt:o.shirt||'#ffffff',pants:o.pants||'#222',shoes:o.shoes||'#222',sleeve:o.sleeve,longSleeve:o.longSleeve,skirt:o.skirt,hairStyle:'bald'},cx-4.5+k*3,z0+1.4,0);H.root.position.y=.3;cyl('white',cx-4.5+k*3,0,.3,z0+1.4,.4,.4,18);addCol({t:'c',x:cx-4.5+k*3,z:z0+1.4,r:.45});}
  // mirrors and fitting rooms
  glow('#cfe3ee',x0+.05,1.4,z0+10,1.2,2.2,Math.PI/2,.7);act(R,x0+.8,z0+10,1.4,L('Soi gương','Check the mirror'),()=>showPrompt(pick([L('Trông bạn ngầu đấy!','Looking sharp!'),L('Bộ này hợp với bạn','That outfit suits you')]),1.6));
  for(let k=0;k<3;k++){const z=z0+4+k*1.6;itb('walnut',x1-1.6,x1-1.55,0,2.4,z-.8,z+.8);itb('curtainH',x1-1.65,x1-1.6,.2,2.3,z-.6,z+.6);}
  itb('white',x1-6,x1-2,0,1.05,z1-4.4,z1-3.7,{col:1});itb('marbleTop',x1-6.1,x1-1.9,1.05,1.1,z1-4.5,z1-3.6,{bot:1});extra(Object.assign(randomLook('ped'),{female:true,shirt:'#7b2cbf',jacket:null}),x1-4,z1-5.2,0);
  act(R,x1-4,z1-2.9,2.2,L('Thử đồ và mua sắm','Try on and shop'),()=>openShop('clothes'));
  sign('NEXUS PLAZA · THỜI TRANG',cx,3.3,z0+.04,0,5,.6,{fg:'#ffffff',bg:'#7b2cbf',size:56,w:1024,h:128});
  sofa(R,x0+1.2,z1-4,Math.PI/2,2.4,'sofa');
  for(let x=x0+2.5;x<x1-1;x+=4)for(let z=z0+2.5;z<z1-1;z+=4)IE.push([x,R.h-.04,z]);R.lights=[[cx,3.7,z0+4,1.2,'#fff4e6',15],[cx,3.7,z1-5,1.1,'#fff4e6',14]];}
/* ---- CAR SHOWROOM: three cars on turntables, sales desk ---- */
const SHOWCARS=[];
{const R=room('cars',3780,0,28,20,5,{wall:'plasterW',floor:'marble',fts:2.4,wts:2,ceil:'plaster',crown:'white',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3780;R.seats=[];
  for(const[k,t,c]of[[0,'hyper','#ff7a1a'],[1,'muscle','#1d3557'],[2,'jeep','#4a5d3a']]){const x=cx-8+k*8,z=z0+6;cyl('chrome',x,0,.12,z,3,3,36);addCol({t:'c',x,z,r:2.8});const m=makeCar(t,c);m.g.position.set(x,.12,z);m.g.rotation.y=.6+k*.4;SHOWCARS.push(m.g);}
  itb('white',cx-2.5,cx+2.5,0,1.05,z1-5.4,z1-4.6,{col:1});itb('marbleTop',cx-2.6,cx+2.6,1.05,1.1,z1-5.5,z1-4.5,{bot:1});extra(Object.assign(randomLook('ped'),{jacket:'#111418',shirt:'#f4f4f2'}),cx,z1-6.1,0);
  act(R,cx,z1-3.8,2.4,L('Mua xe mới','Buy a new car'),()=>openShop('cars'));
  sign('NEXUS MOTORS',cx,4.1,z0+.04,0,6,.9,{fg:'#111',bg:'#c1f354',size:72,w:1024,h:160});
  sofa(R,x0+1,z1-6,Math.PI/2,2.4,'sofa');sofa(R,x1-1,z1-6,-Math.PI/2,2.4,'sofa');plant(x0+.7,z1-.8,1.3);plant(x1-.7,z1-.8,1.3);
  for(let x=x0+3;x<x1-1;x+=5)for(let z=z0+3;z<z1-1;z+=5)IE.push([x,R.h-.04,z]);R.lights=[[cx-8,4.6,z0+6,1.3,'#ffffff',16],[cx+8,4.6,z0+6,1.3,'#ffffff',16],[cx,4.6,z1-6,1.1,'#fff4e6',14]];}
/* ---- shared rooms for the rest of the city: home, office lobby, hotel lobby, warehouse ---- */
{const R=room('flat',3860,0,12,10,3,{wall:'paper',floor:'oak',fts:1.6,wts:1.4,ceil:'plaster',crown:'white'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3860;R.seats=[];
  itb('rug',cx-2.4,cx+1.4,0,.012,z0+4.5,z0+7.5,{ts:3});sofa(R,cx-.5,z0+7.9,Math.PI,2.4,'sofa');itb('walnut',cx-1.2,cx+.2,.35,.4,z0+5.6,z0+6.4,{col:1});
  itb('dark',cx-2,cx+1,.4,.9,z0+3.7,z0+4.1,{col:1});itb('black',cx-1.6,cx+.6,1.0,2.2,z0+3.85,z0+3.9);glow(screenTex('tv'),cx-.5,1.6,z0+3.91,2.1,1.12,0,.95);
  itb('white',x1-3.6,x1-.1,0,.9,z0+.1,z0+.75,{col:1});itb('marbleTop',x1-3.65,x1-.1,.9,.94,z0+.05,z0+.8);itb('white',x1-.8,x1-.1,0,1.9,z0+.8,z0+1.5,{col:1});itb('white',x1-3.6,x1-1.2,1.5,2.2,z0+.05,z0+.4);
  R.fridge={x:x1-1.3,z:z0+1.6};act(R,x1-1.4,z0+1.8,1.5,L('Tủ lạnh: ăn nhẹ, +20 máu','Fridge: a snack, +20 HP'),()=>{heal(20);showPrompt(L('Ngon!','Tasty!'),1);});
  rtable(x1-2.4,z0+3.4,.45);chair(R,x1-3.2,z0+3.4,Math.PI/2);chair(R,x1-1.6,z0+3.4,-Math.PI/2);
  itb('walnut',x0+.1,x0+2.2,0,.35,z0+.1,z0+2.4,{col:1});itb('white',x0+.15,x0+2.15,.35,.55,z0+.15,z0+2.35);itb('blanket',x0+.12,x0+2.18,.5,.6,z0+1,z0+2.38,{ts:.8});itb('walnut',x0+.1,x0+2.2,0,1.1,z0+.05,z0+.12);
  act(R,x0+2.7,z0+1.4,1.6,L('Nằm nghỉ: hồi 40 máu','Lie down: +40 HP'),()=>{heal(40);sfx('door');showPrompt(L('Nghỉ ngơi xong, khoẻ hơn rồi','Rested, feeling better'),1.6);});
  iwin(R,'w',z0+6,1,1.5,1.3,'curtain');pframe(paintingTex(1),x0+1.2,1.8,z0+.03,1.1,.75,0);plant(x0+.5,z1-.6,1);
  R.lights=[[cx,2.8,z0+4,1,'#ffe2b8',12],[x0+2,2.8,z0+2,.8,'#ffd9a6',9]];IE.push([cx,R.h-.04,z0+4],[x0+2,R.h-.04,z0+2]);}
let gymHits=0;
{const R=room('office',3940,0,22,16,5,{wall:'stone',floor:'marble',fts:2.2,wts:2,ceil:'plaster',crown:'stone',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=3940;R.seats=[];
  itb('walnut',cx-3,cx+3,0,1.15,z0+5,z0+5.9,{col:1});itb('marbleTop',cx-3.1,cx+3.1,1.15,1.2,z0+4.9,z0+6,{bot:1});extra(Object.assign(randomLook('ped'),{jacket:'#2b2b2b'}),cx,z0+4.3,0);
  for(const x of[cx-1.5,cx+1.5]){itb('black',x-.3,x+.3,1.2,1.55,z0+5.1,z0+5.15);glow(screenTex('doc'),x,1.38,z0+5.16,.55,.3,0,.9);}
  act(R,cx,z0+6.8,2.4,L('Hỏi lễ tân','Ask the receptionist'),()=>showPrompt(pick([L('“Chào bạn! Toà nhà mở cửa tới 22 giờ.”','“Hello! The building is open until 10 pm.”'),L('“Phòng họp tầng 12 đang kín lịch.”','“The 12th floor meeting rooms are fully booked.”'),L('“Bạn cần gặp ai ạ?”','“Who are you here to see?”')]),2.2));
  for(let k=0;k<3;k++){const x=cx-5+k*5;itb('chrome',x-1,x+1,0,2.6,z0+.05,z0+.15);itb('dark',x-.01,x+.01,0,2.6,z0+.15,z0+.17);glow('#ff9a3c',x,2.85,z0+.16,.3,.12,0,1.2);}
  act(R,cx,z0+1.3,3,L('Gọi thang máy','Call the lift'),()=>showPrompt(L('Thang máy chỉ dành cho nhân viên có thẻ','The lifts need a staff key card'),1.8));
  sofa(R,x0+1.2,z0+9,Math.PI/2,3.2,'sofa');sofa(R,x1-1.2,z0+9,-Math.PI/2,3.2,'sofa');itb('walnut',x0+2.2,x0+3,.4,.45,z0+8,z0+10,{col:1});
  itb('red',x1-.9,x1-.1,0,1.9,z1-4.5,z1-3.7,{col:1});glow('#bfe6ff',x1-.91,1.2,z1-4.1,.6,1.2,-Math.PI/2,.8);
  act(R,x1-1.6,z1-4.1,1.4,L('Máy bán nước · $3: +15 máu','Vending machine · $3: +15 HP'),()=>{if(save.money<3){showPrompt(L('Không đủ tiền','Not enough money'),1.2);return;}save.money-=3;heal(15);sfx('cash');showPrompt(L('Mát lạnh!','Ice cold!'),1);});
  plant(x0+.7,z1-.8,1.4);plant(x1-.7,z1-.8,1.4);plant(cx-4.5,z0+5.5,1.2);plant(cx+4.5,z0+5.5,1.2);
  sign('NEXUS TOWER',cx,4.3,z0+.04,0,5,.7,{fg:'#203048',size:64,bg:'rgba(0,0,0,0)',w:1024,h:128});
  for(let x=x0+3;x<x1-1;x+=4.5)for(let z=z0+3;z<z1-1;z+=4.5)IE.push([x,R.h-.04,z]);R.lights=[[cx,4.6,z0+5,1.2,'#fff4e6',16],[cx,4.6,z1-5,1,'#fff4e6',14]];}
{const R=room('hotel',4020,0,22,16,4.5,{wall:'paper',floor:'marble',fts:2,wts:1.4,ceil:'plaster',wain:'walnut',wainH:1.2,rail:'brass',crown:'white'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=4020;R.seats=[];
  itb('rugB',cx-3,cx+3,0,.012,z0+6,z1-2,{ts:3.5});
  // bar on the left with stools and bottles
  itb('walnut',x0+.4,x0+1.2,0,1.1,z0+2,z0+9,{col:1});itb('marbleTop',x0+.35,x0+1.3,1.1,1.15,z0+1.9,z0+9.1,{bot:1});for(let k=0;k<5;k++){const z=z0+2.8+k*1.3;cyl('brass',x0+1.8,0,.75,z,.035,.035,8);cyl('red',x0+1.8,.75,.83,z,.21,.21,14);}
  for(let k=0;k<14;k++)cyl(['green','brass','red','teal'][k%4],x0+.12,1.5+(k%2)*.5,1.5+(k%2)*.5+.3,z0+2.4+k*.45,.05,.05,8);itb('walnut',x0+.04,x0+.25,1.48,1.5,z0+2,z0+9);itb('walnut',x0+.04,x0+.25,1.98,2,z0+2,z0+9);
  extra(Object.assign(randomLook('ped'),{shirt:'#f4f4f2',jacket:'#111418'}),x0+.2+.3,z0+5.5,Math.PI/2).root.position.x=x0+.05+.35;
  act(R,x0+2.2,z0+5.5,2.2,L('Gọi đồ ở quầy bar','Order at the bar'),()=>openShop('bar'));
  // reception and room rental
  itb('walnut',x1-5,x1-.4,0,1.15,z0+3,z0+3.8,{col:1});itb('marbleTop',x1-5.1,x1-.35,1.15,1.2,z0+2.9,z0+3.9,{bot:1});extra(Object.assign(randomLook('ped'),{female:true,shirt:'#1d3557',jacket:null}),x1-2.6,z0+2.3,0);
  act(R,x1-2.7,z0+4.6,2.2,L('Thuê phòng · $80: ngủ, hồi máu, lưu game','Rent a room · $80: sleep, heal, save'),()=>{if(stars>0){showPrompt(L('Cắt đuôi cảnh sát trước đã','Lose the police first'),1.6);return;}if(save.money<80){showPrompt(L('Không đủ tiền','Not enough money'),1.2);return;}save.money-=80;P.hp=maxHp();const h=tod.hour,night=h>=18||h<6;if(night)tod.hour=8;writeSave();sfx('cash');banner(L('NGHỈ TẠI KHÁCH SẠN','HOTEL STAY'),L('Hồi đầy máu','Full health')+(night?L(' · trời đã sáng',' · it is morning'):'')+L(' · đã lưu game',' · game saved'));});
  sofa(R,cx-1.5,z0+8,0,2.4,'sofa');sofa(R,cx-1.5,z0+11.6,Math.PI,2.4,'sofa');itb('walnut',cx-2.5,cx-.5,.38,.43,z0+9.3,z0+10.3,{col:1});
  sofa(R,x1-1.2,z0+10,-Math.PI/2,2.4,'sofa');
  // chandelier and piano
  cyl('gold',cx,R.h-.6,R.h,z0+9.8,.6,.2,12);sph('white',cx,R.h-.75,z0+9.8,.35,.6);
  itb('black',x1-3.6,x1-1.6,0,1.0,z1-4.2,z1-3,{col:1});itb('white',x1-3.55,x1-1.65,.8,.85,z1-3.05,z1-2.85);
  act(R,x1-2.6,z1-2.4,1.4,L('Đánh đàn piano','Play the piano'),()=>{sfx('horn');showPrompt(L('♪ Một bản nhạc vui tai','♪ A cheerful little tune'),1.6);});
  sign('NEXUS GRAND HOTEL',cx+3,3.7,z0+.04,0,5,.65,{fg:'#c9a227',size:60,bg:'rgba(0,0,0,0)',w:1024,h:128});
  plant(x1-.7,z1-.8,1.4);plant(cx+3.5,z1-.8,1.2);
  R.lights=[[cx,4.0,z0+9.8,1.3,'#ffd9a6',16],[x0+2,4.0,z0+5,1,'#ffc98a',12],[x1-3,4.0,z0+4,1,'#ffe2b8',12]];IE.push([x0+2,R.h-.04,z0+5],[x1-3,R.h-.04,z0+4],[cx,R.h-.04,z1-2.5]);}
{const R=room('ware',4100,0,24,18,7,{wall:'stone',floor:'stone',fts:2.5,wts:2.5,ceil:'ceilT',cts:2,skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=4100;R.seats=[];
  for(const rx of[x0+3,x0+8,x1-8,x1-3]){for(const y of[0,1.8,3.6]){itb('steel',rx-1.2,rx+1.2,y+1.6,y+1.7,z0+1,z0+9);}for(const[a,b]of[[-1.2,z0+1],[1.1,z0+1],[-1.2,z0+8.9],[1.1,z0+8.9]])itb('blue',rx+a,rx+a+.1,0,5.4,b,b+.1);
    addCol({t:'b',x0:rx-1.25,x1:rx+1.25,z0:z0+.95,z1:z0+9.05,h:5.4});for(const y of[0,1.7,3.5])for(let z=z0+1.3;z<z0+8.6;z+=1.25)if(Math.sin(z*3+rx+y)>-.5)itb('walnut',rx-.55,rx+.55,y+(y?.02:0),y+1.1,z,z+1.05);}
  // forklift and pallets
  const fx=cx,fz=z1-6;ibox(fx-.7,fx+.7,.3,1.3,fz-1,fz+.6,'#f2b705');ibox(fx-.6,fx+.6,1.3,2.4,fz-.6,fz+.4,'#20242a');ibox(fx-.75,fx+.75,2.4,2.5,fz-1,fz+.6,'#f2b705');ibox(fx-.5,fx-.4,0,2.6,fz+.7,fz+.8,'#333');ibox(fx+.4,fx+.5,0,2.6,fz+.7,fz+.8,'#333');ibox(fx-.5,fx+.5,.1,.15,fz+.8,fz+2,'#333');
  for(const s of[-1,1])cyl('black',s<0?fx-.82:fx+.62,.3,.5,fz-.6,.3,.3,12,'x');addCol({t:'c',x:fx,z:fz,r:1.1});
  for(let k=0;k<3;k++){const x=x0+3+k*2;itb('oak',x-.6,x+.6,0,.15,z1-3,z1-1.8,{col:1});itb('walnut',x-.5,x+.5,.15,1,z1-2.9,z1-1.9);}
  itb('walnut',x1-2.4,x1-1.2,0,.9,z1-3.2,z1-2.2,{col:1});ibox(x1-2.42,x1-1.18,.6,.7,z1-3.22,z1-2.18,'#c1f354');
  act(R,x1-1.8,z1-1.7,1.6,L('Lục thùng hàng','Search the crate'),()=>{const k=curDoor&&curDoor.id||'w';if(time-(LOOT[k]||-1e9)<300){showPrompt(L('Thùng trống rỗng · quay lại sau','The crate is empty · come back later'),1.6);return;}LOOT[k]=time;const m=Math.round(rnd(40,160));save.money+=m;sfx('cash');showPrompt(L('Tìm được ','Found ')+fmt$(m),1.6);});
  for(let x=x0+3;x<x1-1;x+=6)for(let z=z0+3;z<z1-1;z+=6)IE.push([x,R.h-.04,z]);R.lights=[[cx,6.6,z0+5,1.2,'#e8f0ff',16],[cx,6.6,z1-5,1.1,'#e8f0ff',15]];}
/* ---- town interiors: teahouse, seafood restaurant, church, saloon, cinema ---- */
{const R=room('tea',4180,0,18,14,3.4,{wall:'plasterW',floor:'oak',fts:1.4,wts:1.6,ceil:'oak',cts:1.6,wain:'walnut',wainH:1.0,rail:'red',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=4180;R.seats=[];
  itb('walnut',cx-4,cx+4,0,1.0,z0+2.6,z0+3.3,{col:1});itb('oak',cx-4.1,cx+4.1,1.0,1.05,z0+2.5,z0+3.4,{bot:1});for(let k=0;k<5;k++){cyl('brass',cx-3+k*1.5,1.05,1.3,z0+2.95,.13,.1,12);cyl('brass',cx-3+k*1.5,1.3,1.38,z0+2.95,.04,.04,8);}
  for(const y of[1.4,1.9,2.4])itb('walnut',x0+.5,x1-.5,y,y+.04,z0+.05,z0+.35);for(let k=0;k<14;k++)cyl(['green','red','brass','white'][k%4],x0+1+k*1.1,1.44+(k%3)*.5,1.44+(k%3)*.5+.25,z0+.2,.09,.09,10);
  extra(Object.assign(randomLook('ped'),{female:true,shirt:'#b23a48',jacket:null}),cx,z0+1.9,0);
  act(R,cx,z0+4.2,2.3,()=>P.tray?L('Bạn đang cầm khay · tới bàn ngồi','You are holding a tray · sit at a table'):L('Gọi trà và bánh','Order tea and snacks'),()=>{if(!P.tray)openShop('tea');});
  for(const tx of[x0+3,x0+7,x1-7,x1-3])for(const tz of[z0+7,z0+10.5]){if(Math.abs(tx-cx)<1.5)continue;itb('walnut',tx-.55,tx+.55,.55,.6,tz-.55,tz+.55,{col:1});itb('dark',tx-.05,tx+.05,0,.55,tz-.05,tz+.05);
    chair(R,tx,tz-.85,0,'red');chair(R,tx,tz+.85,Math.PI,'red');cyl('white',tx,.6,.68,tz,.06,.05,10);}
  for(let k=0;k<6;k++)sph('red',x0+2+k*2.8,2.7,z0+6+(k%2)*3,.24,1.3);
  pframe(paintingTex(2),x0+.03,2.0,z0+8,1.8,1.1,Math.PI/2);pframe(paintingTex(1),x1-.03,2.0,z0+8,1.8,1.1,-Math.PI/2);plant(x0+.7,z1-.8,1.2);plant(x1-.7,z1-.8,1.2);
  for(let x=x0+2.5;x<x1-1;x+=4)for(let z=z0+2.5;z<z1-1;z+=4)IE.push([x,R.h-.04,z]);R.lights=[[cx,3.1,z0+4,1,'#ffcf9a',13],[cx,3.1,z1-4,1,'#ffcf9a',12]];
  DIAS.push({x:x1-.8,z:z0+1.2,y:1.1});}
{const R=room('sea',4260,0,20,14,3.5,{wall:'plasterW',floor:'tileW',fts:1,wts:1.6,ceil:'plaster',wain:'blue',wainH:1.1,rail:'white',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=4260;R.seats=[];
  // aquariums along the back wall with fish
  for(let k=0;k<3;k++){const x=cx-6+k*6;itb('dark',x-2.2,x+2.2,0,.9,z0+.1,z0+1.1,{col:1});glow('#47b6e8',x,1.55,z0+1.12,4.3,1.3,0,.9);for(let f=0;f<5;f++)sph(['red','brass','white','teal','gold'][f],x-1.6+f*.8,1.2+(f%3)*.3,z0+.9,.09,.7);}
  itb('white',x1-6,x1-.3,0,1.05,z1-4.4,z1-3.7,{col:1});itb('marbleTop',x1-6.1,x1-.25,1.05,1.1,z1-4.5,z1-3.6,{bot:1});extra(Object.assign(randomLook('ped'),{shirt:'#f4f1ea',jacket:null,cap:'#f4f1ea'}),x1-3,z1-5.2,0);
  act(R,x1-3,z1-2.9,2.2,()=>P.tray?L('Bạn đang cầm khay · tới bàn ngồi','You are holding a tray · sit at a table'):L('Gọi món hải sản','Order seafood'),()=>{if(!P.tray)openShop('sea');});
  for(const tx of[x0+3,x0+7.5,cx+2])for(const tz of[z0+4.5,z0+8.5]){rtable(tx,tz,.55,'oak');chair(R,tx-.85,tz,Math.PI/2,'blue');chair(R,tx+.85,tz,-Math.PI/2,'blue');}
  glow('#bfe6ff',x0+.05,1.9,z0+7,6,1.6,Math.PI/2,.75);for(let k=0;k<4;k++)itb('walnut',x0+.04,x0+.08,1.1,2.7,z0+4+k*2,z0+4.06+k*2);
  sign('BIỂN XANH',cx,2.9,z0+.04,0,3.6,.5,{fg:'#fff',bg:'#1d5f8a',size:60,w:512,h:96});plant(x0+.7,z1-.8,1.1);
  for(let x=x0+2.5;x<x1-1;x+=4)for(let z=z0+2.5;z<z1-1;z+=4)IE.push([x,R.h-.04,z]);R.lights=[[cx,3.2,z0+4,1.1,'#eaf6ff',14],[cx,3.2,z1-4,1,'#fff1dc',12]];
  DIAS.push({x:x0+.8,z:z0+1.6,y:1.1});}
{const R=room('church',4340,0,16,28,8,{wall:'stone',floor:'marble',fts:2,wts:2.4,ceil:'plaster',crown:'stone',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=4340;R.seats=[];
  itb('stone',cx-3,cx+3,0,.35,z0+.2,z0+4,{col:1});itb('white',cx-1.4,cx+1.4,.35,1.3,z0+1.4,z0+2.4,{col:1});ibox(cx-1.45,cx+1.45,1.3,1.36,z0+1.35,z0+2.45,'#c9a227');
  ibox(cx-.06,cx+.06,1.36,2.4,z0+1.85,z0+1.95,'#c9a227');ibox(cx-.4,cx+.4,2.0,2.1,z0+1.85,z0+1.95,'#c9a227');
  for(const s of[-1,1])for(let k=0;k<3;k++){const x=cx+s*(1.8+k*.3);cyl('white',x,1.3,1.6+k*.1,z0+2.6,.04,.04,8);sph('gold',x,1.66+k*.1,z0+2.6,.04,1.6);}
  act(R,cx,z0+5,2.4,L('Thắp nến cầu nguyện (+15 máu)','Light a candle and pray (+15 HP)'),()=>{heal(15);sfx('door');showPrompt(L('Lòng bình yên hơn','You feel at peace'),1.6);});
  for(let r=0;r<6;r++){const z=z0+7.5+r*2.6;for(const s of[-1,1]){const xa=s<0?x0+1.2:cx+1.2,xb=s<0?cx-1.2:x1-1.2;itb('walnut',xa,xb,.42,.48,z-.25,z+.25,{col:1});itb('walnut',xa,xb,.48,1.0,z+.25,z+.33);
    for(let x=xa+.5;x<xb-.2;x+=.75)R.seats.push({x,z,h:Math.PI});}}
  const SG=['#e63946','#3a86ff','#ffb703','#2a9d8f','#8338ec'];for(let k=0;k<5;k++){const z=z0+5+k*4.5;glow(SG[k],x0+.05,4.5,z,1.2,3.2,Math.PI/2,1.1);glow(SG[(k+2)%5],x1-.05,4.5,z,1.2,3.2,-Math.PI/2,1.1);}
  glow('#ffd9a6',cx,5.8,z0+.04,2.4,2.4,0,1);
  for(let z=z0+4;z<z1-1;z+=5)IE.push([cx,R.h-.04,z]);R.lights=[[cx,7,z0+4,1.2,'#ffe2b8',16],[cx,7,z0+16,1,'#ffe2b8',14]];
  DIAS.push({x:x1-.8,z:z0+.8,y:1.1});}
{const R=room('saloon',4420,0,20,16,4,{wall:'oak',floor:'oak',fts:1.2,wts:1.4,ceil:'oak',cts:1.6,wain:'walnut',wainH:1.1,rail:'brass',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=4420;R.seats=[];
  itb('walnut',x0+1,x1-6,0,1.15,z0+3,z0+3.8,{col:1});itb('walnut',x0+.9,x1-5.9,1.15,1.22,z0+2.9,z0+3.9,{bot:1});itb('brass',x0+1,x1-6,.15,.2,z0+3.85,z0+3.95);
  for(const y of[1.5,2.1])itb('walnut',x0+1,x1-6,y,y+.05,z0+.05,z0+.4);for(let k=0;k<18;k++)cyl(['green','brass','red','teal'][k%4],x0+1.3+k*.7,1.55+(k%2)*.6,1.55+(k%2)*.6+.32,z0+.22,.06,.06,8);
  extra(Object.assign(randomLook('ped'),{shirt:'#f4f1ea',beard:true,female:false,jacket:'#3a2414',cap:'#3a2a1c'}),cx-2,z0+2.3,0);
  act(R,cx-2,z0+4.6,2.4,()=>P.tray?L('Bạn đang cầm khay · tới bàn ngồi','You are holding a tray · sit at a table'):L('Gọi đồ ở quầy','Order at the bar'),()=>{if(!P.tray)openShop('saloon');});
  for(const[tx,tz]of[[x0+3,z0+8],[x0+7,z0+11],[cx+2,z0+8],[cx+6,z0+11],[cx-2,z1-3]]){rtable(tx,tz,.6,'walnut');chair(R,tx-.9,tz,Math.PI/2,'walnut');chair(R,tx+.9,tz,-Math.PI/2,'walnut');}
  itb('black',x1-4,x1-1.6,0,1.25,z0+1,z0+2.2,{col:1});itb('white',x1-3.95,x1-1.65,.82,.86,z0+2.2,z0+2.4);act(R,x1-2.8,z0+3,1.4,L('Đánh piano','Play the piano'),()=>{sfx('horn');showPrompt(L('♪ Một điệu nhạc miền Tây','♪ A honky-tonk tune'),1.6);});
  ibox(cx-1.2,cx+1.2,2.6,3.2,z0+.05,z0+.15,'#e9dfc9');ibox(cx-.1,cx+.1,2.4,3.4,z0+.05,z0+.1,'#4a3424');
  for(let x=x0+2.5;x<x1-1;x+=4)for(let z=z0+2.5;z<z1-1;z+=4)IE.push([x,R.h-.04,z]);R.lights=[[cx,3.7,z0+4,1,'#ffc98a',13],[cx,3.7,z1-4,1,'#ffc98a',12]];
  DIAS.push({x:x1-.8,z:z1-2.2,y:1.1});}
let CINE=null;
{const R=room('cinema',4500,0,22,20,7,{wall:'dark',floor:'rugB',fts:2,wts:2,ceil:'plaster',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=4500;R.seats=[];
  const cv=document.createElement('canvas');cv.width=512;cv.height=256;const tex=new T.CanvasTexture(cv);const sc=new T.Mesh(new T.PlaneGeometry(14,7),new T.MeshBasicMaterial({map:tex,toneMapped:false}));sc.position.set(cx,3.9,z0+.06);scene.add(sc);CINE={cv,tex,t:0};
  ibox(cx-7.3,cx+7.3,.2,.3,z0+.02,z0+.1,'#111');
  for(let r=0;r<5;r++){const z=z0+6+r*2.2;for(let x=cx-7;x<=cx+7;x+=1){if(Math.abs(x-cx)<.6)continue;chair(R,x,z,Math.PI,'red');}}
  itb('red',x1-5,x1-.3,0,1.05,z1-4.4,z1-3.7,{col:1});itb('marbleTop',x1-5.1,x1-.25,1.05,1.1,z1-4.5,z1-3.6,{bot:1});extra(Object.assign(randomLook('ped'),{shirt:'#d62828',cap:'#d62828',jacket:null}),x1-2.6,z1-5.2,0);
  act(R,x1-2.6,z1-2.9,2.2,()=>P.tray?L('Bạn đang cầm bắp rang · tìm ghế ngồi xem phim','You have popcorn · find a seat and watch'):L('Mua bắp rang và nước · $10','Buy popcorn and a drink · $10'),()=>{if(P.tray)return;if(save.money<10){showPrompt(L('Không đủ tiền','Not enough money'),1.2);return;}save.money-=10;sfx('cash');P.tray={n:TT('Bắp rang bơ'),hp:30,col:'#f2d16b'};trayMesh('#f2d16b');banner(L('BẮP RANG BƠ','POPCORN'),L('Tìm một ghế và bấm E để ngồi xem phim','Find a seat and press E to watch the film'));});
  R.lights=[[cx,6.5,z1-4,1.1,'#ffd9a6',18],[cx,6.5,z0+6,.8,'#cfe0ff',16]];IE.push([cx,R.h-.04,z1-3],[cx-6,R.h-.04,z1-3],[cx+6,R.h-.04,z1-3]);
  DIAS.push({x:x0+.8,z:z0+3,y:1.1});}
/* diamonds hidden inside the city's shared interiors */
for(const[id,fx,fz]of[['diner',.06,.1],['police',.6,.45],['mart',.94,.1],['gym',.05,.08],['ware',.96,.3],['hotel',.97,.75],['office',.5,.22],['flat',.13,.88],['clothes',.95,.4],['cars',.04,.08],['guns',.96,.9]]){const R=ROOMS[id];DIAS.push({x:R.x0+(R.x1-R.x0)*fx,z:R.z0+(R.z1-R.z0)*fz,y:1.1});}
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
  if(R&&!R.open){sun.intensity*=.12;hemi.intensity=Math.min(hemi.intensity,.32);}
  rain.visible=!R||!!R.open;
  ILIGHTS.forEach((l,i)=>{const s=R&&R.lights[i];if(s){l.position.set(s[0],s[1],s[2]);l.intensity=s[3]*(MOBILE?1.6:1);l.color.set(s[4]).convertSRGBToLinear();l.distance=s[5]||14;}else l.intensity=0;});}
function fade(fn){const f=hud.fade;f.classList.add('on');setTimeout(()=>{fn();setTimeout(()=>f.classList.remove('on'),120);},260);}
function enterInterior(id,out){if(P.car)return;const R=ROOMS[id];curDoor=out||null;fade(()=>{P.outside=out?{x:out.x-Math.sin(out.h)*1.2,z:out.z-Math.cos(out.h)*1.2,h:out.h}:{x:P.x,z:P.z,h:P.h+Math.PI};P.sit=null;P.inside=id;P.x=R.door.x;P.z=R.door.z-.6;P.h=Math.PI;cam.yaw=Math.PI;camera.position.set(P.x,2,P.z+3);sfx('door');if(id==='bank')tutEvent('bank');});}
function exitInterior(){if(heist&&heist.stage==='vault'){heist=null;banner(L('Bỏ dở vụ cướp','Heist abandoned'),L('Bạn rời két quá sớm','You left the vault too early'));for(const n of npcs.filter(n=>n.kind==='guard'))removeNPC(n);}
  if(P.sit)P.sit=null;if(P.tray){heal(P.tray.hp);if(P.tray.boost)P.boostT=60;P.tray=null;showPrompt(L('Bạn ăn mang đi trên đường','You ate it on the go'),1.6);}
  const o=P.outside||{x:SP.house.door.x,z:SP.house.door.z,h:0};fade(()=>{P.inside=null;curDoor=null;P.x=o.x+Math.sin(o.h)*1.2;P.z=o.z+Math.cos(o.h)*1.2;P.h=o.h;cam.yaw=o.h;camera.position.set(P.x-Math.sin(o.h)*5,3,P.z-Math.cos(o.h)*5);sfx('door');});}
function checkup(){const c=50;if(P.hp>=maxHp()){showPrompt(L('Bạn đang khoẻ','You are already healthy'),1.2);return;}if(save.money<c){showPrompt(L('Không đủ tiền','Not enough money'),1.2);return;}save.money-=c;P.hp=maxHp();sfx('cash');banner(L('Khám xong','All patched up'),L('Hồi đầy máu · ','Full health · ')+fmt$(c));}

/* ---------- GPS: pick a place on the big map, get a route along the roads ---------- */
const gps={wp:null,pts:null,len:0,t:0,key:'',col:'#ff5fd2',mesh:null,arrived:0};
const arrowTex=makeTex(64,64,(g)=>{g.clearRect(0,0,64,64);g.strokeStyle='#fff';g.lineWidth=11;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(18,10);g.lineTo(42,32);g.lineTo(18,54);g.stroke();},{repeat:true});
const routeMat=new T.MeshBasicMaterial({map:arrowTex,color:0xff5fd2,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});
function roadProj(x,z){const i=clamp(Math.round((x+HALF)/CELL),0,N),j=clamp(Math.round((z+HALF)/CELL),0,N);let best;
  {const rx=road(i),zz=clamp(z,road(0),road(N)),s=clamp(Math.floor((zz+HALF)/CELL),0,N-1);best={x:rx,z:zz,d:Math.abs(x-rx)+Math.abs(z-zz),a:[i,s],b:[i,s+1]};}
  {const rz=road(j),xx=clamp(x,road(0),road(N)),s=clamp(Math.floor((xx+HALF)/CELL),0,N-1),d=Math.abs(z-rz)+Math.abs(x-xx);if(d<best.d)best={x:xx,z:rz,d,a:[s,j],b:[s+1,j]};}return best;}
function planRouteCity(fx,fz,tx,tz){const s=roadProj(fx,fz),e=roadProj(tx,tz),NN=N+1,nid=n=>n[0]*NN+n[1];
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
  if(heist&&heist.stage==='escape'&&stars===0)return{x:SP.house.door.x,z:SP.house.door.z,col:'#ffffff',name:'Nhà an toàn'};return stTarget();}
function buildRouteMesh(pts,col){if(gps.mesh){scene.remove(gps.mesh);gps.mesh.geometry.dispose();gps.mesh=null;}if(!pts||pts.length<2)return;
  const gb=new GB(),W=.75;let u=0,L=0;const yAt=(x,z)=>{const b=blockAt(x,z);return b&&x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1?.33:Math.max(.09,heightAt(x,z)+.24);};
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
  {n:'Công viên trung tâm',x:SP.parkMain.x,z:SP.parkMain.z,i:'#5fbf5a'},{n:'Vòng quay bãi biển',x:FW.x-10,z:FW.z,i:'#ff7ad9'},{n:'Cầu tàu',x:FW.pier.x0-2,z:FW.pier.z,i:'#3ef0e0'}];
  const SC={food:'#ffb703',mart:'#e63946',clothes:'#ad8dff',guns:'#8f1a20',cars:'#c1f354',gym:'#2d6a4f',garage:'#ffd166'};const seen={};for(const sh of SP.shops){if(sh.id==='mart'&&seen.mart)continue;seen[sh.id]=1;L.push({n:SHOPS[sh.id].n,x:sh.x,z:sh.z,i:SC[sh.id]||'#fff'});}
  if(SP.school)L.push({n:'Trường THPT Nexus',x:SP.school.x,z:SP.school.z,i:'#f1faee'});if(SP.stadium)L.push({n:'Sân vận động',x:SP.stadium.x,z:SP.stadium.z,i:'#9aa3ad'});if(SP.apt)L.push({n:save.apt?'Căn hộ của bạn':'Căn hộ ven biển (bán)',x:SP.apt.x,z:SP.apt.z,i:'#2a9d8f'});if(SP.bigBridge)L.push({n:'Cầu dây văng',x:SP.bigBridge.x,z:SP.bigBridge.z-40,i:'#e9edf2'});
  if(!mis)for(const k in GIVERS)if(giverPos[k])L.push({n:GIVERS[k].name,x:giverPos[k].x,z:giverPos[k].z,i:GIVERS[k].css});
  if(WILD.places)for(const p of WILD.places)L.push({n:LL(p.n,p.en)+(save.disc[p.id]?' ✓':''),x:p.x,z:p.z,i:save.disc[p.id]?'#7ef9a0':'#b9c2cc'});return L.map(p=>Object.assign(p,{n:TT(p.n)}));}
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
wildPark();const homeCar=newCar('sports',spots.driveway.length?SP.house.x+6.2:0,SP.house.z+5,Math.PI,'parked',save.char==='oscar'?'#ff4d6d':'#c1f354');
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
.nc-money{font:400 40px Impact,Haettenschweiler,"Arial Narrow Bold","Oswald",sans-serif;letter-spacing:.04em;color:#4fae4a;-webkit-text-stroke:2px #0a0a0a;text-shadow:0 2px 0 #000;paint-order:stroke fill;font-variant-numeric:tabular-nums}
.nc-dirty{font:600 15px Inter,sans-serif;color:#7dffa0;-webkit-text-stroke:.8px #0a0a0a;paint-order:stroke fill}
.nc-stars{font-size:28px;letter-spacing:2px;color:#f2c230;-webkit-text-stroke:1.4px #000;paint-order:stroke fill}
.nc-stars i{font-style:normal;color:rgba(255,255,255,.28)}.nc-stars i.on{color:#fff}
.nc-stars.blink i.on{animation:ncb .6s steps(2) infinite}@keyframes ncb{50%{opacity:.3}}
.nc-fist{min-width:44px;height:44px;padding:0 10px;border-radius:10px;background:rgba(0,0,0,.45);display:flex;align-items:center;gap:6px;justify-content:center;font:700 14px Inter,sans-serif;margin-top:4px;pointer-events:auto;cursor:pointer}.nc-fist .e{font-size:22px}
.nc-cross{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border:2px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.5)}.nc-cross::after{content:'';position:absolute;left:50%;top:50%;width:3px;height:3px;margin:-1.5px;background:#fff;border-radius:50%}
.nc-mini{position:absolute;left:18px;bottom:18px;width:230px}
.nc-mini canvas{display:block;width:230px;height:150px;border-radius:10px;border:2px solid rgba(0,0,0,.6);box-shadow:0 4px 18px rgba(0,0,0,.35)}
.nc-ar{height:5px!important;margin-top:3px!important}.nc-ar i{background:#5aa9ff!important}
.nc-hp{height:8px;margin-top:6px;border-radius:4px;background:rgba(0,0,0,.55);overflow:hidden}.nc-hp i{display:block;width:100%;height:100%;background:linear-gradient(180deg,#e0473b,#a8231b);transform-origin:left center;transition:transform .2s}
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
.nc-speed{position:absolute;right:22px;bottom:20px;font:400 50px Impact,Haettenschweiler,"Arial Narrow Bold",sans-serif;letter-spacing:.03em;line-height:1;text-align:right;-webkit-text-stroke:1.2px #000;paint-order:stroke fill}
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
.nc-clock{font:400 26px Impact,Haettenschweiler,"Arial Narrow Bold",sans-serif;letter-spacing:.05em;color:#e8e6df;-webkit-text-stroke:1.4px #000;paint-order:stroke fill;font-variant-numeric:tabular-nums}
.nc-foe{position:absolute;left:50%;top:70px;transform:translateX(-50%);width:min(260px,60vw);text-align:center;font-size:12px;font-weight:600;-webkit-text-stroke:.6px #000;paint-order:stroke fill}
.nc-win{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,rgba(40,30,0,.55),rgba(0,0,0,.82));pointer-events:auto;animation:ncwin .8s ease}.nc-win-in{text-align:center;color:#fff;padding:26px 22px;max-width:min(560px,92vw);font-family:inherit}.nc-win-in small{letter-spacing:.3em;color:#ffd166;font-weight:700;font-size:12px}.nc-win-in h2{font-size:clamp(34px,7vw,64px);margin:8px 0;line-height:1;background:linear-gradient(180deg,#fff6c9,#ffd166 45%,#c98a00);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 18px rgba(255,200,60,.5))}.nc-win-n{font-weight:700;color:#ffe9a8;margin:0 0 14px}.nc-win-s{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}.nc-win-s span{background:rgba(255,255,255,.1);padding:6px 12px;border-radius:999px;font-weight:600}.nc-win-r{display:grid;gap:6px;background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.45);border-radius:14px;padding:14px;margin-bottom:16px}.nc-win-r b{color:#ffd166}.nc-win-r em{font-style:normal;font-size:13px;color:#e9e3c8}.nc-win-b{border:0;border-radius:999px;padding:12px 26px;font-weight:800;font-size:15px;background:linear-gradient(180deg,#ffe08a,#ffb703);color:#1a1200;cursor:pointer}@keyframes ncwin{from{opacity:0;transform:scale(1.08)}to{opacity:1;transform:none}}
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
const MAPX0=WA.x0-10,MAPX1=WATER+60,MAPZ0=WA.z0-10,MAPZ1=AP.z1+10,MK1=1.2;
const mapBg=document.createElement('canvas');mapBg.width=Math.ceil((MAPX1-MAPX0)*MK1);mapBg.height=Math.ceil((MAPZ1-MAPZ0)*MK1);
{const g=mapBg.getContext('2d'),X=x=>(x-MAPX0)*MK1,Z=z=>(z-MAPZ0)*MK1;g.fillStyle='#55683f';g.fillRect(0,0,mapBg.width,mapBg.height);g.fillStyle='#3b3a40';g.fillRect(X(-HALF-RW/2-3),Z(-HALF-RW/2-3),(2*HALF+RW+6)*MK1,(2*HALF+RW+6)*MK1);
  g.fillStyle='#d9c08c';g.fillRect(X(SAND0),0,mapBg.width,mapBg.height);g.fillRect(0,Z(road(N)+RW/2),mapBg.width,mapBg.height);
  g.fillStyle='#2b86a3';g.beginPath();g.moveTo(X(shoreE(MAPZ0)-8),0);for(let z=MAPZ0;z<=MAPZ1;z+=4)g.lineTo(X(shoreE(z)-8),Z(z));for(let x=shoreE(MAPZ1)-8;x>=MAPX0;x-=4)g.lineTo(X(x),Z(Math.min(MAPZ1,shoreS(x)-8)));g.lineTo(0,mapBg.height);g.lineTo(mapBg.width,mapBg.height);g.lineTo(mapBg.width,0);g.closePath();g.fill();
  for(const b of blocks){g.fillStyle=b.d==='river'?'#2b86a3':b.d==='park'||b.d==='stadium'?'#5f9442':b.d==='res'?'#6f9a52':'#a39d94';g.fillRect(X(b.x0),Z(b.z0),(b.x1-b.x0)*MK1,(b.z1-b.z0)*MK1);}
  g.fillStyle='#2b86a3';g.fillRect(0,Z(RZ0),X(road(0)-RW/2),(RZ1-RZ0)*MK1);g.fillRect(X(SAND0),Z(RZ0),mapBg.width,(RZ1-RZ0)*MK1);
  for(const c of blds){g.fillStyle=c.h>40?'#57545e':'#6f6b74';g.fillRect(X(c.x0),Z(c.z0),(c.x1-c.x0)*MK1,(c.z1-c.z0)*MK1);}
  /* west hills: shaded by height, mountain road and lookout */
  if(HGRID){const G=HGRID;for(let iz=0;iz<G.NZ-1;iz++)for(let ix=0;ix<G.NX-1;ix++){const v=G.H[iz*G.NX+ix];if(v<.5)continue;const k=clamp(v/70,0,1);g.fillStyle=`rgb(${85+k*70|0},${104+k*50|0},${63+k*40|0})`;g.fillRect(X(G.X0+ix*G.ST),Z(G.Z0+iz*G.ST),G.ST*MK1+1,G.ST*MK1+1);}}
  if(WGRID){const G=WGRID;for(let iz=0;iz<G.NZ-1;iz++)for(let ix=0;ix<G.NX-1;ix++){const x=G.X0+ix*G.ST,z=G.Z0+iz*G.ST;if(x>440||(x>EXT.x0&&z>EXT.z0)||x<MAPX0-8||z<MAPZ0-8)continue;const v=G.H[iz*G.NX+ix];const k=clamp(v/110,0,1);
      g.fillStyle=v>95?'#e8eaec':`rgb(${85+k*80|0},${104+k*40|0},${63+k*55|0})`;g.fillRect(X(x),Z(z),G.ST*MK1+1,G.ST*MK1+1);}
    const LK=WILD.lake;g.fillStyle='#2b86a3';g.beginPath();g.arc(X(LK.x),Z(LK.z),LK.r*MK1,0,7);g.fill();
    g.lineJoin='round';g.lineCap='round';WILD.roads.forEach((r,ri)=>{g.beginPath();r.P.forEach((p,k)=>{k?g.lineTo(X(p[0]),Z(p[1])):g.moveTo(X(p[0]),Z(p[1]));});g.strokeStyle=r.kind==='gravel'?'#8a7556':'#3b3a40';g.lineWidth=(r.kind==='gravel'?7:9)*MK1;g.stroke();});
    g.fillStyle='#2b86a3';g.fillRect(X(WA.x0-10),Z(RZ0),X(EXT.x0)-X(WA.x0-10),(RZ1-RZ0)*MK1);
    for(const c of blds)if(c.x0<EXT.x0||c.z0<EXT.z0){g.fillStyle='#8a5a44';g.fillRect(X(c.x0),Z(c.z0),(c.x1-c.x0)*MK1,(c.z1-c.z0)*MK1);}}
  {const rr=(x0,x1,z0,z1,c)=>{g.fillStyle=c;g.fillRect(X(x0),Z(z0),(x1-x0)*MK1,(z1-z0)*MK1);};rr(CW.x0,CW.x1,CW.z0,CW.z1,'#4a4a50');rr(AP.x0,AP.x1,AP.z0,AP.z1,'#8b9a74');
    rr(-260,250,646,688,'#b9b4aa');rr(-340,620,750,870,'#b9b4aa');rr(280,620,700,760,'#b9b4aa');rr(-565,605,927.5,972.5,'#3b3a40');rr(-545,585,868.5,891.5,'#46454b');
    g.fillStyle='#e8e8e4';for(let x=-470;x<500;x+=50)g.fillRect(X(x),Z(949),30*MK1,2*MK1);if(AIR.term){const A=AIR.term;rr(A.x0,A.x1,A.z0,A.z1,'#dfe4ea');}for(const h of AIR.hangars||[])rr(h.x-38,h.x+38,700,760,'#c9ced4');}
  if(HZ.road){g.lineJoin='round';g.lineCap='round';g.beginPath();HZ.road.forEach((p,k)=>{k?g.lineTo(X(p[0]),Z(p[1])):g.moveTo(X(p[0]),Z(p[1]));});g.strokeStyle='#3b3a40';g.lineWidth=10*MK1;g.stroke();
    const L=HZ.road[HZ.road.length-1];g.fillStyle='#d8cfbf';g.beginPath();g.arc(X(L[0]),Z(L[1]),17*MK1,0,7);g.fill();}}
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
  g.fillStyle='#fff';g.font='700 26px "Space Grotesk",Inter';g.textAlign='left';g.fillText('NEXUS CITY',16,mapOY()+34);
  if(WILD.places){g.font='600 19px Inter';g.fillStyle='#d6f5ff';g.fillText(L('Khám phá ','Explored ')+WILD.places.filter(p=>save.disc[p.id]).length+'/'+WILD.places.length+'   ·   '+L('Kim cương ','Diamonds ')+(save.dia||[]).length+'/'+DIAS.length+'   ·   '+L('Ngọc Nexus ','Nexus gems ')+save.gems.length+'/'+WILD.gems.length,16,mapOY()+62);}}
function renderPOI(){hud.poi.innerHTML='';for(const p of poiList()){const b=document.createElement('button');b.type='button';const col=p.i==='bank'?'#4ade80':p.i==='house'?'#ffffff':p.i==='hosp'?'#d62828':p.i==='police'?'#3d6fd6':p.i;b.innerHTML='<i style="background:'+col+'"></i>';b.appendChild(document.createTextNode(p.n));b.addEventListener('click',()=>{setWaypoint(p.x,p.z,p.n);gpsUpdate(0);drawBigMap();});hud.poi.appendChild(b);}}
let mapOpen=false;function toggleMap(){mapOpen=!mapOpen;hud.map.hidden=!mapOpen;if(mapOpen){gps.t=0;gpsUpdate(0);drawBigMap();renderPOI();tutEvent('map');}}
hud.mapC.addEventListener('click',e=>{const c=hud.mapC,r=c.getBoundingClientRect(),px=(e.clientX-r.left)*c.width/r.width,py=(e.clientY-r.top)*c.height/r.height,s=mapS();
  const x=px/(MK1*s)+MAPX0,z=(py-mapOY())/(MK1*s)+MAPZ0;
  if(gps.wp&&hyp(gps.wp.x-x,gps.wp.z-z)*MK1*s<16){clearWaypoint(true);gpsUpdate(0);drawBigMap();return;}
  let best=null,bd=22;for(const p of poiList()){const d=hyp(p.x-x,p.z-z)*MK1*s;if(d<bd){bd=d;best=p;}}
  if(best)setWaypoint(best.x,best.z,best.n);else setWaypoint(clamp(x,WA.x0+2,EXT.x1-2),clamp(z,WA.z0+2,EXT.z1-2),'Điểm đánh dấu');
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
const DOORTXT={tea:()=>L('Vào trà quán','Enter the teahouse'),sea:()=>L('Vào nhà hàng hải sản','Enter the seafood restaurant'),church:()=>L('Vào nhà thờ','Enter the church'),saloon:()=>L('Vào saloon','Enter the saloon'),cinema:()=>L('Vào rạp phim','Enter the cinema'),hotel:()=>L('Vào khách sạn','Enter the hotel'),ware:()=>L('Vào nhà kho','Enter the warehouse'),office:()=>L('Vào toà nhà','Enter the building'),mart:()=>L('Vào cửa hàng tạp hoá','Enter the store'),guns:()=>L('Vào tiệm súng','Enter the gun shop'),gym:()=>L('Vào phòng tập','Enter the gym'),clothes:()=>L('Vào shop quần áo','Enter the clothes shop'),cars:()=>L('Vào showroom xe','Enter the car showroom'),diner:()=>L('Vào quán ăn','Enter the restaurant'),police:()=>L('Vào đồn cảnh sát','Enter the police station'),flat:()=>L('Vào nhà','Go inside'),office:()=>L('Vào toà nhà văn phòng','Enter the office tower'),hotel:()=>L('Vào khách sạn','Enter the hotel'),ware:()=>L('Vào nhà kho','Enter the warehouse')};
/* sitting, carrying a tray, eating at a table */
let TRAYM=null;
function trayMesh(col){if(!TRAYM){TRAYM=new T.Group();TRAYM.add(new T.Mesh(buildVC([{geo:new T.BoxGeometry(.5,.03,.36),color:'#7a4a24'},{geo:new T.CylinderGeometry(.15,.12,.03,16),pos:[-.06,.03,0],color:'#f4f1ea'},{geo:new T.CylinderGeometry(.045,.04,.14,10),pos:[.17,.085,.08],color:'#e9e2d0'},{geo:new T.CylinderGeometry(.01,.01,.12,5),pos:[.17,.18,.08],color:'#d62828'}]),HUMAT));
    TRAYM.food=new T.Mesh(new T.SphereGeometry(.1,12,8).scale(1.2,.45,1),new T.MeshStandardMaterial({roughness:.7}));TRAYM.food.position.set(-.06,.07,0);TRAYM.add(TRAYM.food);}
  TRAYM.food.material.color.copy(lin(col||'#c98b4a'));return TRAYM;}
function takeFood(f){const RM=P.inside&&ROOMS[P.inside];if(!RM||!RM.seats||!RM.seats.length){heal(f.hp);if(f.boost)P.boostT=60;return;}P.tray=f;trayMesh(f.col);closeShop();setTimeout(()=>banner(L('MANG KHAY RA BÀN','CARRY IT TO A TABLE'),L('Tới một chiếc ghế trống và bấm E để ngồi ăn','Walk to a free chair and press E to sit and eat')),900);}
function sitDown(st){P.sit={s:st,left:P.tray?6:0,t:0};P.x=st.x;P.z=st.z;P.h=st.h;P.y=0;P.vy=0;P.aiming=false;keys.clear();if(P.tray)showPrompt(L('Chúc ngon miệng!','Enjoy your meal!'),1.4);}
function standUp(){const S=P.sit;if(!S)return;const st=S.s;P.sit=null;const rx=Math.cos(st.h),rz=-Math.sin(st.h);for(const d of[.75,-.75,0]){const x=st.x+rx*d-Math.sin(st.h)*(d?0:.7),z=st.z+rz*d-Math.cos(st.h)*(d?0:.7);if(!resolve(x,z,.38)||d===0){P.x=x;P.z=z;break;}}
  const H=P.H;H.legL.rotation.z=H.legR.rotation.z=0;H.root.rotation.x=0;}
function sitUpdate(dt){const S=P.sit,H=P.H,st=S.s;P.moving=0;P.h=st.h;H.root.position.set(st.x,P.y,st.z);H.root.rotation.set(0,st.h,0);
  if(S.left>0&&P.tray){const d=Math.min(dt,S.left);S.left-=d;heal(P.tray.hp*d/6);if(S.left<=0){if(P.tray.boost)P.boostT=60;banner(L('ĂN XONG','ALL DONE'),P.tray.n+L(' · no căng bụng',' · you are full'));P.tray=null;}}
  sitPose(H,S.left>0?time*3.2:null);
  const mv=K('w')||K('a')||K('s')||K('d')||K('arrowup')||K('arrowdown')||K('arrowleft')||K('arrowright')||Math.abs(joy.x)+Math.abs(joy.y)>.3;if(mv&&!(S.left>0))standUp();}
function trayUpdate(){const want=!!P.tray;if(!want){if(TRAYM&&TRAYM.parent)TRAYM.parent.remove(TRAYM);return;}const m=trayMesh(P.tray.col);if(m.parent!==P.H.root)P.H.root.add(m);
  if(P.sit)m.position.set(0,.785,.58);else{m.position.set(0,1.02,.4);const H=P.H;H.armL.rotation.x=H.armR.rotation.x=-.8;H.elL.rotation.x=H.elR.rotation.x=-.75;}}
function interactOption(){const t=P.car||P,near=(p,r)=>p&&hyp(P.x-p.x,P.z-p.z)<r;{const so=stDoorOption();if(so)return so;}
  if(P.inside){const R=ROOMS[P.inside];
    if(P.sit)return{k:'E',txt:P.sit.left>0?L('Đang ăn · bấm E để đứng dậy','Eating · press E to stand up'):L('Đứng dậy','Stand up'),fn:standUp};
    if(near(R.door,1.8))return{k:'E',txt:L('Ra ngoài','Go outside'),fn:exitInterior};
    if(R.acts)for(const a of R.acts)if(near(a,a.r||2)&&(!a.ok||a.ok()))return{k:'E',txt:typeof a.txt==='function'?a.txt():a.txt,fn:a.fn};
    if(R.seats){let b=null,bd=1.3;for(const st of R.seats){if(st.taken)continue;const d=hyp(P.x-st.x,P.z-st.z);if(d<bd){bd=d;b=st;}}if(b)return{k:'E',txt:P.tray?L('Ngồi xuống ăn','Sit down and eat'):L('Ngồi xuống','Sit down'),fn:()=>sitDown(b)};}
    if(P.inside==='house'){if(near(R.bed,2.2))return{k:'E',txt:P.dirty?L('Cất tiền và lưu game','Stash the cash and save'):L('Ngủ: lưu game, hồi máu','Sleep: save and heal'),fn:sleepHome};if(near(R.wardrobe,2))return{k:'E',txt:L('Tủ quần áo','Wardrobe'),fn:()=>openShop('wardrobe')};if(near(R.fridge,2))return{k:'E',txt:L('Tủ lạnh: ăn nhẹ, +30 máu','Fridge: grab a snack, +30 HP'),fn:()=>{heal(30);showPrompt(L('Ngon!','Tasty!'),1);}};}
    if(P.inside==='hospital'&&near(R.desk,2.6))return{k:'E',txt:L('Khám bệnh: hồi đầy máu · $50','Check-up: full health · $50'),fn:checkup};
    if(P.inside==='bank'&&near(R.vault,3.2)&&!heist)return{k:'E',txt:L('Cướp két','Rob the vault'),fn:startHeist};
    return null;}
  if(P.tour)return{k:'F',txt:L('Kết thúc chuyến bay','End the flight'),fn:toggleCar,noE:true};
  if(P.plane)return P.plane.air||P.plane.spd>4?null:{k:'F',txt:L('Xuống máy bay','Leave the plane'),fn:toggleCar,noE:true};
  if(!P.car)for(const g of AIR.gates)if(g.tour&&near(g,2.8))return{k:'E',txt:L('Bay ngắm cảnh Nexus · $250','Nexus sightseeing flight · $250'),fn:bookTour};
  if(!P.car){const pl=nearPlane();if(pl)return{k:'F',txt:L('Lên máy bay','Board the plane'),fn:toggleCar,noE:true};}
  if(!P.car&&near(SP.house.door,2.6))return{k:'E',txt:L('Vào nhà','Enter house'),fn:()=>enterInterior('house')};
  if(!P.car&&near(SP.bank.door,2.6))return{k:'E',txt:L('Vào ngân hàng','Enter bank'),fn:()=>enterInterior('bank')};
  if(!P.car&&near(SP.hospitalDoor,2.6))return{k:'E',txt:L('Vào bệnh viện','Enter hospital'),fn:()=>enterInterior('hospital')};
  if(!P.car&&near(SP.policeDoor,2.6))return{k:'E',txt:L('Vào đồn cảnh sát','Enter the police station'),fn:()=>enterInterior('police',{x:SP.policeDoor.x,z:SP.policeDoor.z,h:0})};
  if(!P.car&&near(SP.garageBtn,2.2))return{k:'E',txt:L('Gara: lấy xe của bạn','Garage: get your car'),fn:garageSpawn};
  if(!P.car&&near(SP.camp,3.6))return{k:'E',txt:L('Nghỉ bên lửa trại: hồi máu, qua đêm','Rest by the campfire: heal, skip the night'),fn:campRest};
  if(!P.car&&WILD.shops)for(const sh of WILD.shops)if(near(sh,2.8))return{k:'E',txt:L('Vào ','Enter ')+sh.n,fn:()=>openShop(sh.id)};
  if(!P.car&&near(SP.apt,2.6))return save.apt?{k:'E',txt:L('Căn hộ: lưu game, hồi máu','Apartment: save and heal'),fn:stashAtHome}:{k:'E',txt:L('Mua căn hộ ven biển · ','Buy beach apartment · ')+fmt$(APT_PRICE),fn:()=>{if(save.money<APT_PRICE){showPrompt(L('Không đủ tiền','Not enough money'),1.4);return;}save.money-=APT_PRICE;save.apt=true;sfx('cash');writeSave();banner(L('Căn hộ ven biển','Beach apartment'),L('Nhà an toàn thứ hai: lưu game, hồi máu, cất tiền','Second safehouse: save, heal, stash cash'));}};
  for(const s of SP.shops){const r=s.id==='garage'?5.5:2.6;if((s.id==='garage'||!P.car)&&hyp(t.x-s.x,t.z-s.z)<r)return{k:'E',txt:L('Vào ','Enter ')+TT(SHOPS[s.id].n),fn:XROOM[s.id]?()=>enterInterior(XROOM[s.id],{x:s.x,z:s.z,h:0}):()=>openShop(s.id)};}
  if(!P.car){let gd=null,bd=1.8;for(const d of GDOORS){const dd=Math.abs(P.x-d.x)+Math.abs(P.z-d.z);if(dd<bd){bd=dd;gd=d;}}if(gd)return{k:'E',txt:gd.txt?gd.txt():DOORTXT[gd.room]?DOORTXT[gd.room]():L('Vào trong','Go inside'),fn:()=>enterInterior(gd.room,gd)};}
  if(!mis&&!(heist&&heist.stage==='vault'))for(const k in GIVERS){const p=giverPos[k];if(p&&hyp(t.x-p.x,t.z-p.z)<3.2)return{k:'E',txt:'Nhận việc: '+GIVERS[k].name,fn:()=>startMission(k)};}
  if(P.seq)return null;
  if(!P.car){let best=null,bd=4.5;for(const c of cars){const d=hyp(c.x-P.x,c.z-P.z);if(d<bd){bd=d;best=c;}}if(best)return{k:'F',txt:best.driver?(best.kind==='police'?'Cướp xe cảnh sát':'Kéo tài xế ra, lấy xe'):'Lên xe',fn:toggleCar,noE:true};}
  else if(Math.abs(P.car.vf)<6)return{k:'F',txt:'Xuống xe',fn:toggleCar,noE:true};
  return null;}
function interact(){const o=interactOption();if(o&&!o.noE)o.fn();}

/* ---------- player update ---------- */
function playerUpdate(dt){
  P.punchCD-=dt;if(P.inv>0)P.inv-=dt;
  if(P.kvx||P.kvz){P.x+=P.kvx*dt;P.z+=P.kvz*dt;const f=Math.exp(-8*dt);P.kvx*=f;P.kvz*=f;if(Math.abs(P.kvx)+Math.abs(P.kvz)<.05)P.kvx=P.kvz=0;const p=resolve(P.x,P.z,.38);if(p){P.x+=p[0];P.z+=p[1];}}
  if(P.seq&&(P.koT>0||!cars.includes(P.seq.c)))seqCancel();
  if(P.seq){seqUpdate(dt);return;}
  if(P.tour){tourStep(dt);return;}
  if(P.sit){sitUpdate(dt);trayUpdate();return;}
  if(P.plane&&P.koT<=0){const pl=P.plane,inp={thr:(K('w')||tb.sprint?1:0)-(K('s')||tb.jump?1:0),pitch:clamp((K('arrowup')?1:0)-(K('arrowdown')?1:0)+(MOBILE?joy.y:0),-1,1),turn:clamp((K('d')||K('arrowright')?1:0)-(K('a')||K('arrowleft')?1:0)+joy.x,-1,1)};planeStep(pl,dt,inp);if(P.plane){P.x=pl.x;P.z=pl.z;P.y=pl.y;}P.moving=pl.spd;return;}
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
  const ground=(()=>{const b=blockAt(P.x,P.z);return b&&P.x>b.x0&&P.x<b.x1&&P.z>b.z0&&P.z<b.z1&&!inCut(b,P.x,P.z)?.25:heightAt(P.x,P.z);})();
  if(jump&&P.y<=ground+.001)P.vy=6.5;P.vy-=20*dt;P.y+=P.vy*dt;if(P.y<ground){P.y=ground;P.vy=0;}
  const near=npcs.some(n2=>n2.state==='fight'&&hyp(n2.x-P.x,n2.z-P.z)<4);P.H.guard=near||time-P.lastPunch<1.2?1:0;
  P.H.root.position.set(P.x,P.y,P.z);P.H.root.rotation.y=P.h;animHuman(P.H,dt,spd,time);trayUpdate();
  if(P.boostT>0)P.boostT-=dt;const MH=maxHp();if(P.hp<MH&&time-P.lastPunch>4)P.hp=Math.min(MH,P.hp+dt*(P.hp<50?2:.6));
}

/* ---------- the wilds at run time: discoveries, gems, villagers, animated bits, GPS along the country roads ---------- */
save.disc=save.disc||{};save.gems=save.gems||[];
function wildPark(){for(const p of(WILD.parks||[]).concat(WILD.parkSummit?[WILD.parkSummit]:[]))newCar(p[0],p[1],p[2],p[3],'parked',p[4]);}
let wildT=0,wildFog=1;const VIL=[];
function inWildArea(x,z){return z<EXT.z0||(x<EXT.x0&&z<HZ.z0)||(x<HZ.x0&&z<WL.z1);}
/* Nexus diamonds: hidden in the towns, the countryside and inside buildings */
let DIAIM=null;save.dia=save.dia||[];const TPED=[];
function diaUpdate(dt){if(!DIAS.length)return;if(!DIAIM){const g=new T.OctahedronGeometry(.42,0);g.scale(1,1.5,1);DIAIM=new T.InstancedMesh(g,new T.MeshStandardMaterial({color:lin('#bff3ff'),emissive:new T.Color('#4fd2ff'),emissiveIntensity:.9,roughness:.08,metalness:.35}),DIAS.length);DIAIM.frustumCulled=false;DIAIM.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(DIAIM);}
  const me=P.car||P,got=save.dia,N=DIAS.length;for(let i=0;i<N;i++){const g=DIAS[i],have=got.includes(i);dummy.position.set(g.x,g.y+Math.sin(time*2.4+i)*.15,g.z);dummy.rotation.set(0,time*2+i,0);dummy.scale.setScalar(have?.0001:1+.08*Math.sin(time*6+i));dummy.updateMatrix();DIAIM.setMatrixAt(i,dummy.matrix);
    if(!have&&Math.abs(me.x-g.x)<3&&Math.abs(me.z-g.z)<3&&hyp(me.x-g.x,me.z-g.z)<(P.car?2.6:1.6)&&Math.abs((P.car?heightAt(me.x,me.z):P.y)-(g.y-1.1))<2.6){got.push(i);save.money+=500;sfx('cash');const n=got.length;
      if(n>=N){save.money+=50000;banner(L('ĐÃ TÌM ĐỦ KIM CƯƠNG NEXUS','ALL NEXUS DIAMONDS FOUND'),L('Thưởng thêm $50.000','Bonus $50,000'),4);}else banner(L('KIM CƯƠNG NEXUS ','NEXUS DIAMOND ')+n+'/'+N,'+$500 · '+L('còn '+(N-n)+' viên đang trốn đâu đó',(N-n)+' more hidden out there'),2.6);writeSave();}}
  dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);DIAIM.instanceMatrix.needsUpdate=true;
  if(CINE&&P.inside==='cinema'){CINE.t+=dt;if(CINE.t>.08){CINE.t=0;const g=CINE.cv.getContext('2d'),w=512,h=256,k=time*.6;const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,`hsl(${(k*40)%360},60%,45%)`);gr.addColorStop(1,`hsl(${(k*40+120)%360},60%,25%)`);g.fillStyle=gr;g.fillRect(0,0,w,h);
      g.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<6;i++){const x=(i*97+k*60)%(w+80)-40,y=150+Math.sin(k*2+i)*40;g.beginPath();g.arc(x,y,18+i*3,0,7);g.fill();}g.fillStyle='#111';g.fillRect(0,h-40,w,40);g.fillStyle='#ffd166';g.font='700 26px Inter,sans-serif';g.textAlign='center';g.fillText(TT('NEXUS CITY: CUỘC PHIÊU LƯU MỚI'),w/2,h-12);CINE.tex.needsUpdate=true;}}}
function wildUpdate(dt){const A=WILD.anim,nk=1-tod.day,me=P.car||P;diaUpdate(dt);
  if(A.jet){const k=1+Math.sin(time*6)*.08;A.jet.scale.set(k,1+Math.sin(time*3)*.1,k);}
  if(A.mills)for(const m of A.mills)m.rotation.z+=dt*.9;
  if(A.boats)for(const b of A.boats)if(b.g){b.g.position.y=.05+Math.sin(time*1.3+b.ph)*.12;b.g.rotation.z=Math.sin(time*1.1+b.ph)*.04;}
  const wf=inWildArea(me.x,me.z)?(MOBILE?1.5:2.2):1;wildFog+=(wf-wildFog)*Math.min(1,dt*.6);scene.fog.far*=wildFog;
  if(A.fall)A.fall.offset.y+=dt*1.4;
  if(A.foam){const k=1+Math.sin(time*3)*.06;A.foam.scale.set(k,1,k);A.foam.material.opacity=.42+Math.sin(time*5)*.08;}
  if(A.fire){const f=A.fire,k=1+Math.sin(time*17)*.12+Math.sin(time*29)*.08;f.f1.scale.set(1,k,1);f.f2.scale.set(1,1.3-k*.3,1);f.gl.material.opacity=.35+nk*.65;if(A.fireSp){A.fireSp.material.opacity=.25+nk*.75;const q=5.5+Math.sin(time*13)*.4;A.fireSp.scale.set(q,q,1);}}
  if(A.blink)A.blink.visible=Math.floor(time*1.2)%2===0;
  if(A.flag)A.flag.rotation.y=Math.sin(time*1.7)*.25;
  if(A.beam){const b=A.beam;b.g.rotation.y+=dt*.9;b.g.visible=nk>.15;b.m.opacity=.16*Math.min(1,(nk-.15)*3);b.lamp.material.color.setHex(nk>.15?0xfff2b0:0xb8b8a8);}
  if(A.boat){A.boat.position.y=WILD.lake.y+Math.sin(time*1.4)*.06;A.boat.rotation.z=Math.sin(time*1.1)*.04;}
  // gems spin and bob; walk or drive through one to pick it up
  const im=WILD.gemIM;if(im){const got=save.gems,N=WILD.gems.length;WILD.gems.forEach((g,i)=>{const have=got.includes(i);dummy.position.set(g.x,g.y+Math.sin(time*2+i)*.18,g.z);dummy.rotation.set(0,time*1.6+i,0);dummy.scale.setScalar(have?.0001:1);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);
      if(!have&&Math.abs(me.x-g.x)<3.2&&Math.abs(me.z-g.z)<3.2&&hyp(me.x-g.x,me.z-g.z)<(P.car?3:1.9)&&Math.abs((P.car?heightAt(me.x,me.z):P.y)-(g.y-1.3))<3){got.push(i);save.money+=150;sfx('cash');const n=got.length;
        if(n>=N){save.money+=5000;banner(L('ĐÃ TÌM ĐỦ NGỌC NEXUS','ALL NEXUS GEMS FOUND'),L('Thưởng thêm $5.000','Bonus $5,000'),4);}else banner(L('NGỌC NEXUS ','NEXUS GEM ')+n+'/'+N,'+$150 · '+L('còn '+(N-n)+' viên ở ngoài kia',(N-n)+' more out there'),2.6);writeSave();}});
    dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);im.instanceMatrix.needsUpdate=true;}
  wildT-=dt;if(wildT>0)return;wildT=.5;
  for(const p of WILD.places){if(save.disc[p.id])continue;if(hyp(me.x-p.x,me.z-p.z)<p.r){save.disc[p.id]=1;save.money+=p.rw;sfx('cash');const k=WILD.places.filter(q=>save.disc[q.id]).length;
      banner(L('KHÁM PHÁ: ','DISCOVERED: ')+L(p.n,p.en),'+'+fmt$(p.rw)+' · '+L('Đã khám phá ','Explored ')+k+'/'+WILD.places.length,3.4);writeSave();break;}}
  const V=SP.village;if(V){for(let i=VIL.length-1;i>=0;i--)if(!npcs.includes(VIL[i]))VIL.splice(i,1);
    if(hyp(me.x-V.x,me.z-V.z)<150&&VIL.length<6){const a=Math.random()*6.28,r=8+Math.random()*30,x=V.x+Math.cos(a)*r,z=V.z+Math.sin(a)*r;if(!resolve(x,z,.4)&&hyp(x-P.x,z-P.z)>25){const n=newNPC('ped',x,z,{b:null,state:'walk'});n.h=Math.random()*6.28;VIL.push(n);}}}
  // townsfolk walking about in the new towns
  for(let i=TPED.length-1;i>=0;i--)if(!npcs.includes(TPED[i]))TPED.splice(i,1);
  if(!P.inside)for(const t of TOWNS){if(hyp(me.x-t.x,me.z-t.z)>t.r+60)continue;const lim=t.id==='westside'?14:9;for(let tries=0;tries<3&&TPED.length<lim;tries++){const a=Math.random()*6.28,r=Math.random()*t.r*.8,x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r;
      if(resolve(x,z,.5)||hyp(x-P.x,z-P.z)<22)continue;const n=newNPC('ped',x,z,{b:null,state:'walk'});n.h=Math.random()*6.28;TPED.push(n);}break;}}
function campRest(){if(stars>0){showPrompt(L('Cắt đuôi cảnh sát trước đã','Lose the police first'),1.6);return;}P.hp=maxHp();const h=tod.hour,night=h>=18||h<6;if(night)tod.hour=7;writeSave();sfx('door');
  banner(L('NGHỈ BÊN LỬA TRẠI','RESTED BY THE FIRE'),L('Hồi đầy máu','Full health')+(night?L(' · trời đã sáng',' · it is morning'):'')+L(' · đã lưu game',' · game saved'),3);}
function wildNearest(x,z){let best=null,bd=1e9;WILD.roads.forEach((r,ri)=>{for(let i=0;i<r.P.length;i+=3){const d=hyp(r.P[i][0]-x,r.P[i][1]-z);if(d<bd){bd=d;best={ri,i};}}});return best;}
function wildPath(a,b){const R=WILD.roads,seg=(ri,i0,i1)=>{const P=R[ri].P,o=[],st=i1>=i0?5:-5;for(let i=i0;st>0?i<i1:i>i1;i+=st)o.push(P[i]);o.push(P[i1]);return o;};
  // climb from a node to the root of its road tree: list of [road, index where we join it]
  const chain=n=>{const c=[[n.ri,n.i]];let r=n.ri;while(R[r].par!=null){c.push([R[r].par,R[r].pj]);r=R[r].par;}return c;};
  const ca=chain(a),cb=chain(b);let ia=-1,ib=-1;for(let x=0;x<ca.length&&ia<0;x++)for(let y=0;y<cb.length;y++)if(ca[x][0]===cb[y][0]){ia=x;ib=y;break;}
  if(ia<0){const ra=ca[ca.length-1][0],rb=cb[cb.length-1][0],ga=R[ra].gate,gb=R[rb].gate;let o=[];for(let x=0;x<ca.length;x++)o=o.concat(seg(ca[x][0],ca[x][1],0));o=o.concat(planRouteCity(ga[0],ga[1],gb[0],gb[1]));let t=[];for(let y=0;y<cb.length;y++)t=seg(cb[y][0],0,cb[y][1]).concat(t);return o.concat(t);}
  let o=[];for(let x=0;x<ia;x++)o=o.concat(seg(ca[x][0],ca[x][1],0));o=o.concat(seg(ca[ia][0],ca[ia][1],cb[ib][1]));let t=[];for(let y=0;y<ib;y++)t=seg(cb[y][0],0,cb[y][1]).concat(t);return o.concat(t);}
function planRoute(fx,fz,tx,tz){const fa=inAirport(fx,fz)&&fz>CW.z0+20,ta=inAirport(tx,tz)&&tz>CW.z0+20;if(fa&&ta)return[[fx,fz],[tx,tz]];if(ta)return planRoute(fx,fz,0,HALF-3).concat([[0,CW.z0+4],[0,AP.z0+8],[tx,tz]]);if(fa)return[[fx,fz],[0,AP.z0+8],[0,CW.z0+4]].concat(planRoute(0,HALF-3,tx,tz));
  const fw=inWildArea(fx,fz),tw=inWildArea(tx,tz);if(!WILD.roads||(!fw&&!tw))return planRouteCity(fx,fz,tx,tz);
  const rootOf=n=>{let r=n.ri;while(WILD.roads[r].par!=null)r=WILD.roads[r].par;return r;};let pts;
  if(fw&&tw)pts=[[fx,fz]].concat(wildPath(wildNearest(fx,fz),wildNearest(tx,tz)),[[tx,tz]]);
  else if(tw){const nb=wildNearest(tx,tz),rr=rootOf(nb),gt=WILD.roads[rr].gate;pts=planRouteCity(fx,fz,gt[0],gt[1]).concat(wildPath({ri:rr,i:0},nb),[[tx,tz]]);}
  else{const na=wildNearest(fx,fz),rr=rootOf(na),gt=WILD.roads[rr].gate;pts=[[fx,fz]].concat(wildPath(na,{ri:rr,i:0}),planRouteCity(gt[0],gt[1],tx,tz));}
  const out=[pts[0]];for(let k=1;k<pts.length;k++){const q=out[out.length-1];if(hyp(pts[k][0]-q[0],pts[k][1]-q[1])>.5)out.push(pts[k]);}return out;}
/* ---------- planes at run time: flying your own plane, airliners crossing the sky, airport traffic, the sightseeing flight ---------- */
const PT={cessna:{max:62,acc:.55,vr:24,stall:18,turn:.95,bank:.75,pitch:.9,taxi:1.1,rad:5,side:2.8,cam:15},jet:{max:135,acc:.32,vr:50,stall:40,turn:.62,bank:.8,pitch:.7,taxi:.6,rad:8,side:4.4,cam:26}};
function planeGround(x,z){const b=blockAt(x,z);if(b&&x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1)return{y:inCut(b,x,z)?0:.25,land:true};const LK=WILD.lake,inLake=LK&&hyp(x-LK.x,z-LK.z)<LK.r-2;
  const land=!inLake&&AREAS.some(a=>x>=a.x0&&x<=a.x1&&z>=a.z0&&z<=a.z1);return{y:inLake?LK.y:land?heightAt(x,z):0,land};}
function poseP(p){p.g.position.set(p.x,p.y,p.z);p.g.rotation.set(-p.p,p.h,p.r);}
function nearPlane(){let best=null,bd=1e9;for(const p of AIR.planes){if(p.wreck>0||p.air||p===P.plane)continue;const d=hyp(P.x-p.x,P.z-p.z),r=p.type==='jet'?9:6;if(d<r&&d<bd){bd=d;best=p;}}return best;}
function enterPlane(p){P.plane=p;p.thr=0;p.spd=0;P.H.root.visible=false;P.aiming=false;radioStop();cam.lastDrag=-1e9;
  showPrompt(MOBILE?L('Cần gạt: ngóc/chúi mũi, lượn · Chạy: tăng ga · Phanh: giảm ga','Stick: pitch and turn · Run: throttle up · Brake: throttle down'):L('W/S: ga · ↑/↓: ngóc/chúi mũi · A/D: lượn · F: xuống khi đã dừng','W/S: throttle · ↑/↓: nose up/down · A/D: turn · F: get out when stopped'),6);}
function exitPlane(){const p=P.plane;if(!p)return;if(p.air||p.spd>4){showPrompt(L('Hạ cánh và dừng hẳn rồi mới xuống được','Land and stop before getting out'),1.8);return;}
  const s=PT[p.type].side;for(const d of[s,-s]){const x=p.x+Math.cos(p.h)*d,z=p.z-Math.sin(p.h)*d;if(!resolve(x,z,.4)){P.x=x;P.z=z;break;}}P.plane=null;p.thr=0;P.H.root.visible=true;P.y=planeGround(P.x,P.z).y;P.h=p.h;}
function crashPlane(p,water){p.wreck=30;p.air=false;p.spd=0;p.thr=0;for(let k=0;k<6;k++)fx3(p.x+rnd(-4,4),p.y+rnd(0,4),p.z+rnd(-4,4),true);sfx('crash');cam.shake=Math.max(cam.shake,.6);p.g.visible=false;
  if(P.plane===p){P.plane=null;P.H.root.visible=true;const g=planeGround(p.x,p.z);if(water||!g.land){P.x=AIR.arrive.x;P.z=AIR.arrive.z;banner(L('MÁY BAY RƠI XUỐNG NƯỚC','PLANE DITCHED'),L('Cứu hộ đã đưa bạn về sân bay','Rescuers brought you back to the airport'),3);}else{P.x=p.x;P.z=p.z;const q=resolve(P.x,P.z,.4);if(q){P.x+=q[0];P.z+=q[1];}banner(L('MÁY BAY RƠI','PLANE DOWN'),L('Máy bay sẽ được đưa về nhà chứa','The plane will be back in its hangar'),3);}
    P.y=planeGround(P.x,P.z).y;hurtPlayer(55);P.koT=2.2;P.H.ko=1;P.getUp=true;}}
function planeStep(p,dt,inp){const S=PT[p.type],ox=p.x,oz=p.z,oy=p.y;
  p.thr=clamp(p.thr+inp.thr*.5*dt,0,1);const tgt=p.thr*S.max;p.spd+=(tgt-p.spd)*(tgt>p.spd?S.acc:.25)*dt;
  if(!p.air){if(inp.thr<0&&p.thr<.05)p.spd=Math.max(0,p.spd-10*dt);
    p.h-=inp.turn*S.taxi*dt*clamp(p.spd/10,.25,1)*(p.spd>.5?1:0);p.r+=(0-p.r)*Math.min(1,6*dt);
    if(inp.pitch>0&&p.spd>S.vr){p.p=Math.min(p.p+.45*dt,.22);if(p.p>.07){p.air=true;p.y+=.5;p.toldVr=0;}}else p.p+=(0-p.p)*Math.min(1,4*dt);
    if(p.spd>S.vr*.6&&inp.pitch>0&&p.spd<=S.vr&&!p.toldVr){p.toldVr=1;showPrompt(L('Tăng tốc thêm để cất cánh','More speed to take off'),1.4);}}
  else{p.r+=(inp.turn*S.bank-p.r)*Math.min(1,2.6*dt);p.h-=Math.sin(p.r)*S.turn*dt;
    p.p+=inp.pitch*S.pitch*dt;if(!inp.pitch)p.p-=p.p*.25*dt;p.p=clamp(p.p,-.7,.75);
    const lift=clamp((p.spd-S.stall)/(S.vr-S.stall),0,1);if(lift<1){p.p-=(1-lift)*.7*dt;if(!p.toldStall&&p.spd<S.stall){p.toldStall=1;showPrompt(L('Mất lực nâng · tăng ga, chúi mũi xuống','Stalling · more throttle, nose down'),1.6);}}else p.toldStall=0;
    p.spd-=Math.sin(p.p)*9.8*.55*dt;p.spd=Math.max(0,p.spd);p.y+=(Math.sin(p.p)*p.spd-(1-lift)*12)*dt;p.y=Math.min(p.y,1100);}
  const cp=Math.cos(p.p);p.x+=Math.sin(p.h)*cp*p.spd*dt;p.z+=Math.cos(p.h)*cp*p.spd*dt;
  if(hyp(p.x,p.z)>2700){p.h=lerpA(p.h,Math.atan2(-p.x,-p.z),Math.min(1,.9*dt));if(!p.toldEdge){p.toldEdge=1;showPrompt(L('Hết vùng bay · quay lại thành phố','Edge of the airspace · turning back'),2);}}else p.toldEdge=0;
  const g=planeGround(p.x,p.z);
  // landing assist: close to solid ground the wings level, the nose flares and the sink rate is held to a gentle touchdown
  if(p.air&&g.land){const agl=p.y-g.y;if(agl<32){const k=1-agl/32;
      if(!inp.turn)p.r+=(0-p.r)*Math.min(1,(1.5+3*k)*dt);
      if(inp.pitch<=0){const tgt=-.1+.07*k;if(p.p<tgt||(!inp.pitch&&p.thr<.6))p.p+=(tgt-p.p)*Math.min(1,(1+2.5*k)*dt);}
      if(p.p<-.05&&!p.toldFlare&&agl<20){p.toldFlare=1;showPrompt(L('Gần mặt đất · tự động nâng mũi','Close to the ground · auto flare'),1.4);}
      const maxSink=2.5+agl*.45;if((p.y-oy)/dt<-maxSink)p.y=oy-maxSink*dt;}else p.toldFlare=0;}
  if(p.air){if(p.y<=g.y){const vs=(p.y-oy)/Math.max(dt,1e-4);
      if(!g.land||vs<-30||Math.abs(p.r)>1.05||p.p<-.75){p.y=g.y;crashPlane(p,!g.land);return;}
      const rough=vs<-9||Math.abs(p.r)>.55;p.y=g.y;p.p=Math.max(0,p.p);p.r=0;
      if(rough){p.spd*=.75;p.y=g.y+.6;p.p=.05;p.bounce=(p.bounce||0)+1;cam.shake=Math.max(cam.shake,.4);sfx('crash');if(P.plane===p)hurtPlayer(8);showPrompt(L('Hạ cánh mạnh! Máy bay nảy lên','Hard landing! The plane bounced'),1.6);if(p.bounce<3){p.air=true;p.toldVr=0;poseP(p);return;}}
      p.air=false;p.bounce=0;p.toldFlare=0;cam.shake=Math.max(cam.shake,.12);showPrompt(L('Hạ cánh!','Touchdown!'),1.2);}}
  else{if(!g.land&&p.spd>1){crashPlane(p,true);return;}p.y=g.y;}
  // hitting buildings, trees and poles
  let hit=false;const rr=S.rad*(p.type==='jet'?.45:.4);query(p.x,p.z,S.rad+2,c=>{if(hit)return;if(c.t==='b'){if(p.y<c.h+g.y-.3&&p.x>c.x0-rr&&p.x<c.x1+rr&&p.z>c.z0-rr&&p.z<c.z1+rr)hit=true;}else if(c.r!==undefined&&!c.lamp&&p.y-g.y<9&&hyp(p.x-c.x,p.z-c.z)<c.r+rr*.6)hit=true;});
  if(hit){if(p.air||p.spd>14){crashPlane(p,false);return;}p.x=ox;p.z=oz;p.spd=0;p.thr=0;}
  poseP(p);}
/* the sightseeing flight: a fixed path over the city, the coast and the wilds, then back to land */
const TOUR=(()=>{const W=[[-520,0,950],[-150,0,950],[140,24,950],[430,95,940],[720,165,760],[640,200,300],[540,220,-200],[520,235,-800],[500,240,-1230],[160,245,-1130],[-220,235,-960],[-520,265,-1330],[-720,225,-920],[-640,210,-660],[-690,200,170],[-320,190,110],[-20,180,-60],[320,170,260],[900,160,720],[1550,140,960],[1050,80,950],[560,0,950],[-160,0,950]];
  const raw=[];for(let k=0;k<W.length-1;k++){const p0=W[Math.max(0,k-1)],p1=W[k],p2=W[k+1],p3=W[Math.min(W.length-1,k+2)];for(let t=0;t<1;t+=1/40){const t2=t*t,t3=t2*t;raw.push([0,1,2].map(j=>.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3)));}}raw.push(W[W.length-1]);
  const pts=[],s=[];let acc=0;for(let i=0;i<raw.length;i++){if(i)acc+=hyp(raw[i][0]-raw[i-1][0],raw[i][2]-raw[i-1][2]);const[x,y,z]=raw[i],onRw=Math.abs(z-AIR.RZ)<30&&x>-570&&x<610&&y<6;const gq=planeGround(x,z);pts.push([x,onRw?AP.y:Math.max(AP.y+y,gq.y+(gq.land&&!inAirport(x,z)?45:3)),z]);s.push(acc);}
  return{pts,s,S:acc,poi:[['Bãi biển & vòng quay','The beach & Ferris wheel',500,-352],['Hải đăng Mũi Bắc','North Cape Lighthouse',SP.lighthouse?SP.lighthouse.x:500,SP.lighthouse?SP.lighthouse.z:-1260],['Khu cắm trại Thông Reo','Whispering Pines Camp',150,-1080],['Hồ Gương & Thác Bạc','Mirror Lake & Silver Falls',-230,-960],['Đỉnh Nexus','Nexus Peak',-520,-1330],['Làng Thông','Pine Village',-640,-720],['Đèo Nexus','Nexus Pass',-694,184],['Trung tâm & Ngân hàng Nexus','Downtown & Nexus Bank',0,0],['Sân bay quốc tế Nexus','Nexus International Airport',0,850]]};})();
function bookTour(){if(stars>0){showPrompt(L('Cắt đuôi cảnh sát trước đã','Lose the police first'),1.6);return;}if(save.money<250){showPrompt(L('Không đủ tiền · vé $250','Not enough money · ticket $250'),1.6);return;}
  save.money-=250;sfx('cash');P.tour={s:0,i:0,shown:{},v:0};const T0=AIR.tour;T0.air=true;P.H.root.visible=false;cam.lastDrag=-1e9;
  banner('NX777 · NEXUS AIR',L('Bay ngắm cảnh · cài dây an toàn','Sightseeing flight · seatbelts on'),3);showPrompt(L('F: kết thúc chuyến bay bất cứ lúc nào','F: end the flight at any time'),4);}
function endTour(){const T0=AIR.tour;P.tour=null;T0.x=T0.home.x;T0.z=T0.home.z;T0.h=T0.home.h;T0.y=AP.y;T0.p=T0.r=0;T0.air=false;poseP(T0);
  P.x=AIR.arrive.x;P.z=AIR.arrive.z;P.y=AP.y;P.H.root.visible=true;banner(L('HẠ CÁNH AN TOÀN','LANDED SAFELY'),L('Cảm ơn bạn đã bay cùng Nexus Air','Thanks for flying Nexus Air'),3);writeSave();}
function tourStep(dt){const q=P.tour,R=TOUR,T0=AIR.tour;const v=Math.min(95,6+Math.sqrt(2*3*q.s),Math.sqrt(2*4.2*Math.max(0,R.S-q.s))+1);q.v=v;q.s+=v*dt;
  if(q.s>=R.S){endTour();return;}while(q.i<R.s.length-2&&R.s[q.i+1]<q.s)q.i++;const i=q.i,k=clamp((q.s-R.s[i])/Math.max(1e-3,R.s[i+1]-R.s[i]),0,1),a=R.pts[i],b=R.pts[i+1];
  const x=a[0]+(b[0]-a[0])*k,y=a[1]+(b[1]-a[1])*k,z=a[2]+(b[2]-a[2])*k,dx=b[0]-a[0],dz=b[2]-a[2],hd=hyp(dx,dz),nh=Math.atan2(dx,dz);
  const dh=((nh-T0.h+Math.PI*3)%(Math.PI*2))-Math.PI;T0.r+=(clamp(-dh/Math.max(dt,1e-3)*.9,-.5,.5)-T0.r)*Math.min(1,2*dt);T0.h=nh;T0.p+=(Math.atan2(b[1]-a[1],hd||1)-T0.p)*Math.min(1,3*dt);T0.x=x;T0.y=y;T0.z=z;poseP(T0);
  P.x=x;P.z=z;P.y=y;P.moving=v;
  for(const[n,en,px,pz]of R.poi){if(q.shown[n])continue;if(hyp(px-x,pz-z)<380&&y>20){q.shown[n]=1;showPrompt(L('Bên dưới: ','Below: ')+L(n,en),3.2);break;}}}
function airUpdate(dt){const nk=1-tod.day,blink=Math.floor(time*1.3)%2===0;
  for(const p of AIR.sky){const oh=p.h;p.a+=p.w*dt;p.x=Math.cos(p.a)*p.R;p.z=-300+Math.sin(p.a)*p.R;p.h=Math.atan2(-Math.sin(p.a)*p.w,Math.cos(p.a)*p.w);p.y=p.alt;p.r=p.w>0?-.18:.18;p.p=0;poseP(p);p.strobe.visible=blink;if(p.glow){p.glow.visible=nk>.2&&blink;}}
  for(const p of AIR.planes){if(p.prop)p.prop.rotation.z+=(p===P.plane?(.5+p.thr*1.2+p.spd*.02):0)*60*dt;p.strobe.visible=p===P.plane?blink:false;
    if(p.wreck>0){p.wreck-=dt;if(p.wreck<=0){if(hyp(P.x-p.home.x,P.z-p.home.z)>60){p.x=p.home.x;p.z=p.home.z;p.h=p.home.h;p.y=AP.y;p.p=p.r=0;p.spd=p.thr=0;p.g.visible=true;poseP(p);}else p.wreck=5;}}}
  if(AIR.beacon)AIR.beacon.material.color.setHex(Math.floor(time*1.6)%2?0x5cff8a:0xffffff);if(AIR.sock)AIR.sock.rotation.y=Math.sin(time*.7)*.4;
  AIR.tour.strobe.visible=!!P.tour&&blink;
  // a widebody that lands from the east, rolls out, turns round and takes off again
  const tr=AIR.traffic,Y=AP.y;tr.t-=dt;
  if(tr.st==='wait'){if(tr.t<=0&&!P.tour){tr.st='land';tr.k=0;tr.g.visible=true;tr.spd=75;}}
  else if(tr.st==='land'){tr.k+=dt*75/2080;const k=Math.min(1,tr.k);tr.x=2600-2080*k;tr.z=AIR.RZ;tr.y=Y+250*(1-k);tr.h=-Math.PI/2;tr.p=.05;tr.r=0;if(k>=1){tr.st='roll';tr.y=Y;tr.p=0;}}
  else if(tr.st==='roll'){tr.spd=Math.max(0,tr.spd-4*dt);tr.x-=tr.spd*dt;if(tr.spd<=0){tr.st='hold';tr.t=14;}}
  else if(tr.st==='hold'){if(tr.t<=0){tr.st='pivot';tr.t=9;}}
  else if(tr.st==='pivot'){tr.h=-Math.PI/2+Math.PI*(1-Math.max(0,tr.t)/9);if(tr.t<=0){tr.st='takeoff';tr.spd=0;tr.h=Math.PI/2;}}
  else if(tr.st==='takeoff'){tr.spd=Math.min(82,tr.spd+3*dt);tr.x+=tr.spd*dt;if(tr.spd>58){tr.p+=(.13-tr.p)*Math.min(1,dt);tr.y+=Math.sin(tr.p)*tr.spd*dt;}if(tr.x>2900){tr.st='wait';tr.t=50;tr.g.visible=false;}}
  if(tr.st!=='wait'){poseP(tr);tr.strobe.visible=blink;}}
/* ---------- car-car collisions ---------- */
function onCrash(c,imp){if(c.sus){c.sus.pv+=imp*.015;c.sus.yv+=imp*.02;}if(c===P.car)sfx('crash');if(c===P.car){cam.shake=Math.min(.5,imp/40);P.car.hp-=imp*.6;}}
function carPairs(){const L=cars.filter(c=>Math.abs(c.x-P.x)<90&&Math.abs(c.z-P.z)<90);
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];const ddx=b.x-a.x,ddz=b.z-a.z;const lim=(a.spec.len||4.6)/2+(b.spec.len||4.6)/2+1.5;if(ddx*ddx+ddz*ddz>lim*lim)continue;
    const ca=a.spec.co||1.2,cb=b.spec.co||1.2,RS=(a.spec.cr||1.12)+(b.spec.cr||1.12);for(const ia of(a.spec.offs||[-ca,ca]))for(const ib of(b.spec.offs||[-cb,cb])){const ax=a.x+Math.sin(a.h)*ia,az=a.z+Math.cos(a.h)*ia,bx=b.x+Math.sin(b.h)*ib,bz=b.z+Math.cos(b.h)*ib;const dx=bx-ax,dz=bz-az,d=hyp(dx,dz);if(d>=RS||d<1e-4)continue;
      const nx=dx/d,nz=dz/d,pen=RS-d,ma=a.kind==='parked'?a.mass*1.5:a.mass,mb=b.kind==='parked'?b.mass*1.5:b.mass,wa=mb/(ma+mb),wb=ma/(ma+mb);
      a.x-=nx*pen*wa;a.z-=nz*pen*wa;b.x+=nx*pen*wb;b.z+=nz*pen*wb;
      const rv=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(rv<0){const J=-1.25*rv/(1/ma+1/mb);a.vx-=J*nx/ma;a.vz-=J*nz/ma;b.vx+=J*nx/mb;b.vz+=J*nz/mb;
        const imp=-rv;if(imp>3){const pc=a===P.car?a:b===P.car?b:null;if(pc){const o=pc===a?b:a;cam.shake=Math.min(.45,imp/35);if(o.kind==='police'&&imp>6)crime(1,true);
          if(o.kind==='traffic'&&imp>11&&Math.random()<.35){o.kind='parked';o.ai=null;o.driver=false;o.slam=1;o.doorA=DOOR_OPEN*.9;o.doorT=0;const lx=Math.cos(o.h),lz=-Math.sin(o.h);const n=newNPC('ped',o.x+lx*2,o.z+lz*2,{state:'fight',t:20,fighter:true,look:o.look});showPrompt('Tài xế nổi giận xuống xe',1.4);}}}}
      syncCar(a);syncCar(b);}}}
function parkedPhysics(c,dt){if(Math.abs(c.vx)+Math.abs(c.vz)<.05){c.vx=c.vz=0;return;}carStep(c,dt,0,.6,0,false);}

/* ---------- camera ---------- */
const camPos=new T.Vector3();
function camUpdate(dt){
  const FP=P.tour?AIR.tour:P.plane;const t=FP?{x:FP.x,y:FP.y+(P.tour?5:2.6),z:FP.z}:P.car?{x:P.car.x,y:1.5+heightAt(P.car.x,P.car.z),z:P.car.z}:{x:P.x,y:1.55+P.y,z:P.z};
  if(FP&&performance.now()-cam.lastDrag>1400&&(FP.spd>2||P.tour))cam.yaw=lerpA(cam.yaw,FP.h,1-Math.exp(-2.4*dt));
  cam.yaw+=((K('q')?1:0)-(K('e')&&P.car?1:0))*2.2*dt;
  if(P.car&&performance.now()-cam.lastDrag>1400&&Math.abs(P.car.vf)>2){const tgt=P.car.vf<-1?P.car.h+Math.PI:P.car.h;cam.yaw=lerpA(cam.yaw,tgt,1-Math.exp(-2.6*dt));}
  const dist=P.tour?48:P.plane?PT[P.plane.type].cam+P.plane.spd*.05:P.car?Math.max(9,cam.dist+3.5)+Math.min(4,Math.abs(P.car.vf)*.08)+Math.max(0,((P.car.spec.len||4.6)-4.8)*.9):P.aiming?3.1:P.inside?Math.min(cam.dist,4.2):cam.dist,p=P.inside?Math.min(cam.pitch,.3):cam.pitch+(P.car?.04:0);const shx=P.aiming?-Math.cos(cam.yaw)*.75:0,shz=P.aiming?Math.sin(cam.yaw)*.75:0;t.x+=shx;t.z+=shz;
  let cx=t.x-Math.sin(cam.yaw)*dist*Math.cos(p),cz=t.z-Math.cos(cam.yaw)*dist*Math.cos(p),cy=t.y+dist*Math.sin(p)+(P.car?.8:.3);
  if(P.inside){const R=ROOMS[P.inside];let k=1;for(;k>.18;k-=.04){const x=t.x+(cx-t.x)*k,z=t.z+(cz-t.z)*k,y=t.y+(cy-t.y)*k;if(x>R.x0+.3&&x<R.x1-.3&&z>R.z0+.3&&z<R.z1-.3&&y<R.h-.3&&!inBld(x,z,y))break;}cx=t.x+(cx-t.x)*k;cz=t.z+(cz-t.z)*k;cy=Math.min(t.y+(cy-t.y)*k,R.h-.3);}else for(let k=1;k>.15;k-=.1){const x=t.x+(cx-t.x)*k,z=t.z+(cz-t.z)*k,y=t.y+(cy-t.y)*k;if(!inBld(x,z,y)){cx=x;cz=z;cy=y;break;}}
  if(!P.inside)cy=Math.max(cy,heightAt(cx,cz)+.7);
  if(!FP&&AIR.term){const A=AIR.term;if(t.x>A.x0&&t.x<A.x1&&t.z>A.z0&&t.z<A.z1){cy=Math.min(cy,AP.y+A.h-1.5);cx=clamp(cx,A.x0+.8,A.x1-.8);cz=clamp(cz,A.z0+.8,A.z1-.8);}}const kk=1-Math.exp(-12*dt);camPos.set(cx,cy,cz);camera.position.lerp(camPos,kk);
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
  const f=lastFoe&&time-lastFoe.t<5&&(npcs.includes(lastFoe.n)||lastFoe.n.heli&&stHeli)?lastFoe.n:null;hud.foe.hidden=!f;
  if(f){hud.foeN.textContent=f.boss?f.boss:f.mission&&f.story?L('Đàn em Syndicate','Syndicate thug'):f.mission?`Đối thủ ${mis?mis.wave:''}`:{ped:'Người đi đường',fighter:'Dân anh chị',cop:'Cảnh sát',guard:'Bảo vệ'}[f.kind]||'Đối thủ';hud.foeI.style.transform=`scaleX(${Math.max(0,f.hp)/(f.maxHp||100)})`;}
  const io=interactOption();const pr=promptT>0?promptTxt:io?`<kbd>${io.k}</kbd>${io.txt}`:'';
  let obj='';
  if(heist&&heist.stage==='escape')obj=stars>0?'Cắt đuôi cảnh sát để mang tiền về':'Mang <span>tiền nóng</span> về nhà an toàn (biểu tượng mái nhà)';
  else if(mis){const s=Math.max(0,Math.ceil(mis.left));if(mis.k==='deliver')obj=(mis.stage==='pickup'?'Lấy gói hàng ở <span>điểm vàng</span>':'Giao hàng tới <span>điểm vàng</span>')+` · ${s}s`;if(mis.k==='race')obj=`Đua: điểm <span>${mis.cp+1}/${mis.cps.length}</span> · ${s}s`;if(mis.k==='fight')obj=`Ẩu đả: hạ đối thủ <span>${mis.wave}/3</span> · ${s}s`;}
  else if(STORY&&(!P.inside||P.inside==='tower'))obj=stObj()+(stars>0?' · '+L('Cắt đuôi cảnh sát','Lose the police'):'');
  else if(stars>0)obj='Thoát khỏi tầm nhìn cảnh sát';
  const key=[pr,obj,Math.round(save.money),P.dirty,stars,!!seenT,Math.round(P.hp),Math.round(save.armor),P.car?Math.round(Math.abs(P.car.vf)*3.6):-1,heist&&heist.stage==='vault'?Math.round(heist.prog*100):-1,tut.on?tut.step:-1].join('|');
  if(key===lastHUD)return;lastHUD=key;
  hud.prompt.innerHTML=pr;hud.obj.innerHTML=obj;hud.money.textContent=fmt$(save.money);hud.dirty.textContent=P.dirty?'Tiền nóng: '+fmt$(P.dirty):'';
  hud.stars.innerHTML=[0,1,2,3,4].map(i=>`<i class="${i<stars?'on':''}">★</i>`).join('');hud.stars.classList.toggle('blink',stars>0&&!seenT);
  hud.hp.style.transform=`scaleX(${Math.max(0,P.hp)/maxHp()})`;hud.armor.style.transform=`scaleX(${Math.max(0,save.armor)/100})`;hud.armor.parentNode.hidden=!(save.armor>0);hud.hp.style.background=P.hp<30?'#ef4444':'#4ade80';
  const FPl=P.tour?AIR.tour:P.plane;const sp=FPl?Math.round((P.tour?P.tour.v:FPl.spd)*3.6):P.car?Math.round(Math.abs(P.car.vf)*3.6):-1;hud.speed.hidden=sp<0;if(sp>=0)hud.speed.innerHTML=FPl?`${sp}<small>km/h · ${Math.max(0,Math.round(FPl.y-planeGround(FPl.x,FPl.z).y))} m${P.plane?' · '+L('ga ','thr ')+Math.round(P.plane.thr*100)+'%':''}</small>`:`${sp}<small>km/h</small>`;
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
  wantedUpdate(dt);heliUpdate(dt);heistUpdate(dt);missionUpdate(dt);storyUpdate(dt);tutUpdate(dt);gpsUpdate(dt);fxUpdate(dt);fwUpdate(dt);
  tod.hour=(tod.hour+dt/30)%24;todApply();weatherUpdate(dt);weatherApply();interiorLights();skyMat.uniforms.ct.value=time;tracerUpdate(dt);heliShoot(dt);lampUpdate(dt);smashUpdate(dt);beamUpdate();doorsUpdate(dt);wildUpdate(dt);airUpdate(dt);
  if(cars.filter(c=>c.kind==='traffic').length<Q.traffic&&Math.random()<dt*2)spawnTraffic(true);
  if(npcs.filter(n=>n.kind==='ped').length<Q.peds&&Math.random()<dt*3)spawnPed();
  lightT-=dt;if(lightT<=0){paintLights(time);lightT=.25;}
  const on=Math.floor(time*5)%2===0;BAR.r.emissiveIntensity=on?4:.2;BAR.b.emissiveIntensity=on?.2:4;
  if(bag){bag.vel+=(-bag.swing*14-bag.vel*2.5)*dt;bag.swing+=bag.vel*dt;bag.piv.rotation.x=bag.swing;}
  // water waves
  foamUpdate();if(Math.floor(time*20)%2===0){const pa=waterG.attributes.position;for(let i=0;i<pa.count;i++){const x=waterBase[i*3],z=waterBase[i*3+2];pa.array[i*3+1]=Math.sin(x*.06+time*1.3)*.08+Math.cos(z*.05+time*.9)*.06+Math.sin((x+z)*.13+time*2.1)*.04;}pa.needsUpdate=true;waterG.computeVertexNormals();}
}
let perfT=0,perfN=0,lowQ=false;
function adapt(raw){if(lowQ||paused)return;perfT+=raw;perfN++;if(perfT>4){const avg=perfT/perfN;perfT=0;perfN=0;
  // step down gently: resolution first, then bloom, then shadows (each only if it is still slow)
  if(avg>.034&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);resize();return;}
  if(avg>.04&&PP.on){PP.on=false;return;}
  if(avg>.05){lowQ=true;if(renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);}});}resize();}}}
/* ---------- post-processing: HDR-ish bloom, a San Andreas style colour grade (warm highlights, cool shadows, smog haze),
   vignette, film grain and FXAA. Off on phones and switched off automatically if the frame rate drops. ---------- */
const PP=(()=>{const gl2=renderer.capabilities.isWebGL2;const o={on:opt.gfx?opt.gfx!=='low':!MOBILE,w:1,h:1};
  const mkRT=(w,h,ms)=>{const opt={minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,type:T.UnsignedByteType};const rt=ms&&gl2&&T.WebGLMultisampleRenderTarget?new T.WebGLMultisampleRenderTarget(w,h,opt):new T.WebGLRenderTarget(w,h,opt);if(rt.samples!==undefined&&ms)rt.samples=4;return rt;};
  const main=mkRT(4,4,true),b1=mkRT(4,4),b2=mkRT(4,4),b3=mkRT(4,4),b4=mkRT(4,4);
  const cam=new T.OrthographicCamera(-1,1,1,-1,0,1),tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
  const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const pass=(fs,u)=>{const m=new T.ShaderMaterial({vertexShader:VS,fragmentShader:fs,uniforms:u,depthTest:false,depthWrite:false});m.toneMapped=false;const sc=new T.Scene();const me=new T.Mesh(tri,m);me.frustumCulled=false;sc.add(me);return{m,sc,u};};
  const bright=pass(`uniform sampler2D tDiffuse;uniform vec2 px;uniform float thr;varying vec2 vUv;
    vec3 s(vec2 o){return texture2D(tDiffuse,vUv+o*px).rgb;}
    void main(){vec3 c=(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.)))*.25;float l=max(c.r,max(c.g,c.b));float k=smoothstep(thr,thr+.25,l);gl_FragColor=vec4(c*k,1.);}`,{tDiffuse:{value:null},px:{value:new T.Vector2()},thr:{value:.72}});
  const blur=pass(`uniform sampler2D tDiffuse;uniform vec2 dir;varying vec2 vUv;
    void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*.227;c+=texture2D(tDiffuse,vUv+dir*1.385).rgb*.316;c+=texture2D(tDiffuse,vUv-dir*1.385).rgb*.316;c+=texture2D(tDiffuse,vUv+dir*3.23).rgb*.07;c+=texture2D(tDiffuse,vUv-dir*3.23).rgb*.07;gl_FragColor=vec4(c,1.);}`,{tDiffuse:{value:null},dir:{value:new T.Vector2()}});
  const fin=pass(`uniform sampler2D tDiffuse,tB1,tB2;uniform vec2 px;uniform float bloom,time,grade,night,grain,aa;varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    vec3 fxaa(vec2 uv){vec3 rgbM=texture2D(tDiffuse,uv).rgb;if(aa<.5)return rgbM;vec3 L=vec3(.299,.587,.114);
      float lM=dot(rgbM,L),lNW=dot(texture2D(tDiffuse,uv+vec2(-1.,-1.)*px).rgb,L),lNE=dot(texture2D(tDiffuse,uv+vec2(1.,-1.)*px).rgb,L),lSW=dot(texture2D(tDiffuse,uv+vec2(-1.,1.)*px).rgb,L),lSE=dot(texture2D(tDiffuse,uv+vec2(1.,1.)*px).rgb,L);
      float mn=min(lM,min(min(lNW,lNE),min(lSW,lSE))),mx=max(lM,max(max(lNW,lNE),max(lSW,lSE)));if(mx-mn<max(.0312,mx*.125))return rgbM;
      vec2 d=vec2(-((lNW+lNE)-(lSW+lSE)),((lNW+lSW)-(lNE+lSE)));float rd=max((lNW+lNE+lSW+lSE)*.03125,.0078);float ri=1./(min(abs(d.x),abs(d.y))+rd);d=clamp(d*ri,-8.,8.)*px;
      vec3 a=.5*(texture2D(tDiffuse,uv+d*(1./3.-.5)).rgb+texture2D(tDiffuse,uv+d*(2./3.-.5)).rgb);vec3 b=a*.5+.25*(texture2D(tDiffuse,uv-d*.5).rgb+texture2D(tDiffuse,uv+d*.5).rgb);float lb=dot(b,L);return(lb<mn||lb>mx)?a:b;}
    vec3 toS(vec3 c){c=max(c,0.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
    void main(){vec3 c=fxaa(vUv);
      c+=(texture2D(tB1,vUv).rgb*.75+texture2D(tB2,vUv).rgb*.9)*bloom;
      float l=dot(c,vec3(.2126,.7152,.0722));
      // colour grade: richer colour, cool blue-grey shadows, warm amber highlights, a little smog lift
      vec3 g=mix(vec3(l),c,1.02);g*=mix(vec3(.9,.95,1.06),vec3(1.09,1.,.84),smoothstep(.02,.6,l));g=g*.95+vec3(.022,.017,.009);
      c=mix(c,g,grade);
      c=toS(c);
      // gentle S-curve contrast in display space
      c=mix(c,c*c*(3.-2.*c),.22*grade);
      vec2 q=vUv-.5;float v=smoothstep(.85,.25,length(q*vec2(1.15,1.)));c*=mix(1.,v,.38+night*.12);
      c+=(hash(vUv*vec2(1931.,1213.)+fract(time*7.))-.5)*grain;
      gl_FragColor=vec4(c,1.);}`,{tDiffuse:{value:null},tB1:{value:null},tB2:{value:null},px:{value:new T.Vector2()},bloom:{value:.55},time:{value:0},grade:{value:1},night:{value:0},grain:{value:.03},aa:{value:main.samples?0:1}});
  o.setSize=(w,h)=>{o.w=w;o.h=h;main.setSize(w,h);const w4=Math.max(1,w>>2),h4=Math.max(1,h>>2),w8=Math.max(1,w>>3),h8=Math.max(1,h>>3);b1.setSize(w4,h4);b2.setSize(w4,h4);b3.setSize(w8,h8);b4.setSize(w8,h8);};
  const run=(p,src,dst)=>{p.u.tDiffuse.value=src.texture;renderer.setRenderTarget(dst);renderer.render(p.sc,cam);};
  o.render=()=>{if(!o.on){renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
    renderer.setRenderTarget(main);renderer.render(scene,camera);
    bright.u.px.value.set(1/o.w,1/o.h);const nk=1-tod.day;bright.u.thr.value=.78-nk*.22;run(bright,main,b1);
    blur.u.dir.value.set(1/b1.width,0);run(blur,b1,b2);blur.u.dir.value.set(0,1/b1.height);run(blur,b2,b1);
    run(bright,b1,b3);bright.u.thr.value=0;
    blur.u.dir.value.set(1/b3.width,0);run(blur,b3,b4);blur.u.dir.value.set(0,1/b3.height);run(blur,b4,b3);
    const u=fin.u;u.tDiffuse.value=main.texture;u.tB1.value=b1.texture;u.tB2.value=b3.texture;u.px.value.set(1/o.w,1/o.h);u.time.value=time;u.night.value=nk;u.bloom.value=.42+nk*.45;
    renderer.setRenderTarget(null);renderer.render(fin.sc,cam);};
  return o;})();
/* ================= STORY MODE: "Lật đổ Ông Trùm" =================
   ch 0: buy a gun · ch 1-5: beat the boss of each town (1 key card each) · ch 6: Syndicate Tower rooftop, final boss + escape helicopter · ch 7: done.
   3 lives: dying wakes you in hospital with progress kept; losing all 3 sends you back to the first boss (key cards lost). */
const STORY=opt.mode==='story';
const ST_TOWNS=[['oldq','Lão Đèn Lồng','Phố Cổ Đèn Lồng'],['harbor','Cá Mập Cảng','Cảng Bắc'],['highland','Bóng Ma Đồi Mây','Đồi Mây'],['minetown','Vua Mỏ Bạc','Thị trấn Mỏ Bạc'],['westside','Rắn Sa Mạc','Nexus Tây']];
const ST_LOOKS=[{shirt:'#7a1020',pants:'#1a1a1a',jacket:'#c0392b',cap:null},{shirt:'#1d3557',pants:'#22313f',jacket:'#457b9d',cap:'#0b1a2a'},{shirt:'#eeeeee',pants:'#30343a',jacket:'#6c757d',cap:null},{shirt:'#3b2f2f',pants:'#4a3b2a',jacket:'#8d6e63',cap:'#5d4037'},{shirt:'#2d6a4f',pants:'#1b4332',jacket:'#1b1b1b',cap:'#2d6a4f'}];
if(STORY){save.story=Object.assign({ch:0,keys:[0,0,0,0,0],lives:3,done:false,deaths:0,t0:Date.now()},save.story||{});}
const SS=STORY?save.story:null;
let stGang=null,stTower=null,stHeli=null,stWin=null;
// a walkable spot near each town centre for the boss fight
function stSpot(i){const t=TOWNS.find(o=>o.id===ST_TOWNS[i][0]);if(!t)return null;if(t.spot)return t.spot;
  for(let k=0;k<400;k++){const a=k*2.399,r=8+k*.25,x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r;if(resolve(x,z,1.2))continue;if(Math.abs(heightAt(x,z)-heightAt(x+3,z+3))>1.2)continue;return t.spot={x,z};}
  return t.spot={x:t.x,z:t.z};}
// tower door: a downtown sidewalk spot closest to the city centre
let stDoor=null;
function stDoorSpot(){if(stDoor)return stDoor;const bs=blocks.filter(b=>b.d==='downtown').sort((a,b)=>hyp((a.x0+a.x1)/2,(a.z0+a.z1)/2)-hyp((b.x0+b.x1)/2,(b.z0+b.z1)/2));
  for(const b of bs){for(let s=0;s<200;s+=2.5){const p=perim(b,s);if(resolve(p[0],p[1],.8))continue;if(SP.bank&&hyp(p[0]-SP.bank.door.x,p[1]-SP.bank.door.z)<12)continue;return stDoor={x:p[0],z:p[1]};}}
  return stDoor={x:0,z:0};}
const stDoorMk=STORY?markerRing('#ff3b3b',1.6):null;
/* ---------- Syndicate Tower rooftop (built east of the interiors, at ground level; the city below is a painted skyline) ---------- */
const TW={cx:5600,cz:0,w:46,d:46};
if(STORY){const x0=TW.cx-TW.w/2,x1=TW.cx+TW.w/2,z0=TW.cz-TW.d/2,z1=TW.cz+TW.d/2,g=new T.Group();scene.add(g);
  const fl=new T.Mesh(new T.BoxGeometry(TW.w,1,TW.d),mat('#6b6f75',.92));fl.position.set(TW.cx,-.5,TW.cz);fl.receiveShadow=true;g.add(fl);
  const tiles=makeTex(256,256,(c,w,h)=>{c.fillStyle='#7b8087';c.fillRect(0,0,w,h);c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=3;for(let i=0;i<=4;i++){c.beginPath();c.moveTo(i*64,0);c.lineTo(i*64,h);c.stroke();c.beginPath();c.moveTo(0,i*64);c.lineTo(w,i*64);c.stroke();}for(let i=0;i<500;i++){c.fillStyle=`rgba(0,0,0,${Math.random()*.08})`;c.fillRect(Math.random()*w,Math.random()*h,3,3);}});
  tiles.repeat.set(TW.w/4,TW.d/4);const top=new T.Mesh(new T.PlaneGeometry(TW.w,TW.d),new T.MeshStandardMaterial({map:tiles,roughness:.9}));top.rotation.x=-Math.PI/2;top.position.set(TW.cx,.01,TW.cz);top.receiveShadow=true;g.add(top);
  const pm=mat('#5d6268',.85);const wall=(ax0,ax1,az0,az1,h)=>{const m=new T.Mesh(new T.BoxGeometry(ax1-ax0,h,az1-az0),pm);m.position.set((ax0+ax1)/2,h/2,(az0+az1)/2);m.castShadow=m.receiveShadow=true;g.add(m);addCol({t:'b',x0:ax0,x1:ax1,z0:az0,z1:az1});};
  wall(x0-.4,x1+.4,z0-.4,z0,1.15);wall(x0-.4,x1+.4,z1,z1+.4,1.15);wall(x0-.4,x0,z0,z1,1.15);wall(x1,x1+.4,z0,z1,1.15);
  // cover: AC units, vents, a stair hut with the door back down
  for(const[ax,az,w,d,h]of[[-12,-4,3,2,1.6],[10,-2,2.4,2.4,1.4],[-6,8,4,1.6,1.3],[8,10,2,3,1.7],[-15,12,2.6,2.6,1.5],[15,-12,3,1.8,1.4],[0,2,2,2,1.2]]){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat('#9aa0a6',.6,.3));m.position.set(TW.cx+ax,h/2,TW.cz+az);m.castShadow=m.receiveShadow=true;g.add(m);addCol({t:'b',x0:TW.cx+ax-w/2,x1:TW.cx+ax+w/2,z0:TW.cz+az-d/2,z1:TW.cz+az+d/2});}
  const hut=new T.Mesh(new T.BoxGeometry(6,3.2,2.6),mat('#4a4f55',.8));hut.position.set(TW.cx,1.6,z1-1.7);g.add(hut);addCol({t:'b',x0:TW.cx-3,x1:TW.cx+3,z0:z1-3,z1:z1-.4});
  const dr=new T.Mesh(new T.BoxGeometry(1.4,2.4,.08),mat('#8a1c1c',.5));dr.position.set(TW.cx,1.2,z1-3.05);g.add(dr);
  // helipad
  const hp=makeTex(256,256,(c,w,h)=>{c.clearRect(0,0,w,h);c.strokeStyle='#ffd166';c.lineWidth=12;c.beginPath();c.arc(128,128,112,0,7);c.stroke();c.fillStyle='#ffd166';c.font='bold 150px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('H',128,136);},{repeat:false});
  const pad=new T.Mesh(new T.CircleGeometry(6,40),new T.MeshStandardMaterial({map:hp,transparent:true,roughness:.8}));pad.rotation.x=-Math.PI/2;pad.position.set(TW.cx,.03,TW.cz-14);g.add(pad);
  const crate=new T.Mesh(new T.BoxGeometry(1.2,.8,.8),mat('#3d5a2a',.7));crate.position.set(TW.cx-4,.4,z1-6);g.add(crate);addCol({t:'b',x0:TW.cx-4.6,x1:TW.cx-3.4,z0:z1-6.4,z1:z1-5.6});
  // the city far below: ground, streets of light and a ring of towers
  const gnd=new T.Mesh(new T.PlaneGeometry(1400,1400),mat('#2a2d33',.95));gnd.rotation.x=-Math.PI/2;gnd.position.set(TW.cx,-80,TW.cz);g.add(gnd);
  const keys=Object.keys(FAC);let rs=77;const rr=(a,b)=>{rs=(rs*16807)%2147483647;return a+(rs-1)/2147483646*(b-a);};const BG={};
  for(let i=0;i<140;i++){const a=rr(0,6.283),d=rr(48,320),bx=TW.cx+Math.cos(a)*d,bz=TW.cz+Math.sin(a)*d,w=rr(14,34),dd=rr(14,34),top=-80+rr(18,d<90?55:70);const k=keys[i%keys.length];(BG[k]||(BG[k]=new GB())).box(bx-w/2,bx+w/2,-80,Math.min(top,-12),bz-dd/2,bz+dd/2,{});}
  for(const k in BG)g.add(new T.Mesh(BG[k].geo(),FAC[k]));
  ROOMS.tower={x0,x1,z0,z1,h:60,open:true,door:{x:TW.cx,z:z1-7.8},lights:[],acts:[{x:TW.cx-4,z:z1-6,r:2.2,txt:()=>L('Thùng đạn: nạp đầy đạn','Ammo crate: refill ammo'),fn:()=>{let any=false;for(const w in save.weapons)if(save.weapons[w]){save.ammo[w]=Math.max(save.ammo[w]|0,w==='pistol'?72:w==='smg'?240:120);any=true;}if(!any){save.weapons.pistol=1;save.ammo.pistol=72;}sfx('cash');showPrompt(L('Đã nạp đầy đạn','Ammo refilled'),1.4);}}]};}
/* ---------- boss helicopter ---------- */
function stHeliMake(){const g=new T.Group();const b=new T.Mesh(new T.SphereGeometry(1.6,18,14),mat('#111318',.35,.6));b.scale.set(1,.85,2);g.add(b);
  const gl=new T.Mesh(new T.SphereGeometry(1.1,14,10,0,6.3,0,1.4),new T.MeshStandardMaterial({color:0x223344,roughness:.1,metalness:.8}));gl.position.set(0,.35,1.6);gl.rotation.x=-.5;g.add(gl);
  const tail=new T.Mesh(new T.CylinderGeometry(.2,.4,5,8),mat('#111318',.4,.5));tail.rotation.x=Math.PI/2;tail.position.set(0,.4,-4.2);g.add(tail);
  const stripe=new T.Mesh(new T.BoxGeometry(3.25,.25,2.5),mat('#d4a017',.3,.8));stripe.position.y=-.2;g.add(stripe);
  for(const s of[-1,1]){const sk=new T.Mesh(new T.BoxGeometry(.12,.12,3.4),mat('#222',.5,.5));sk.position.set(s*1.1,-1.55,0);g.add(sk);}
  const rot=new T.Mesh(new T.BoxGeometry(11,.06,.35),mat('#1a1a1a',.6));rot.position.y=1.55;g.add(rot);const rot2=rot.clone();rot2.rotation.y=Math.PI/2;g.add(rot2);
  const tr=new T.Mesh(new T.BoxGeometry(.06,1.8,.25),mat('#1a1a1a',.6));tr.position.set(.3,.6,-6.6);g.add(tr);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(g);return{g,rot:[rot,rot2,tr]};}
/* ---------- fireworks for the ending ---------- */
const FWK=[];
function burst(x,y,z,col){const n=90,p=new Float32Array(n*3),v=[];for(let i=0;i<n;i++){p[i*3]=x;p[i*3+1]=y;p[i*3+2]=z;const a=Math.random()*6.283,b=Math.acos(2*Math.random()-1),s=rnd(9,15);v.push([Math.sin(b)*Math.cos(a)*s,Math.cos(b)*s,Math.sin(b)*Math.sin(a)*s]);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));const m=new T.PointsMaterial({color:col,size:.5,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});const pt=new T.Points(g,m);scene.add(pt);FWK.push({pt,v,t:0});sfx('crash');}
function fwkUpdate(dt){for(let i=FWK.length-1;i>=0;i--){const f=FWK[i];f.t+=dt;const a=f.pt.geometry.attributes.position;for(let k=0;k<f.v.length;k++){const v=f.v[k];v[1]-=9*dt;v[0]*=.985;v[1]*=.985;v[2]*=.985;a.array[k*3]+=v[0]*dt;a.array[k*3+1]+=v[1]*dt;a.array[k*3+2]+=v[2]*dt;}a.needsUpdate=true;f.pt.material.opacity=Math.max(0,1-f.t/2.2);if(f.t>2.2){scene.remove(f.pt);f.pt.geometry.dispose();FWK.splice(i,1);}}}
/* ---------- helpers ---------- */
function stKeys(){return SS?SS.keys.reduce((a,b)=>a+(b?1:0),0):0;}
function stClearGang(){if(stGang){for(const n of stGang.list)if(npcs.includes(n))removeNPC(n);stGang=null;}}
function stSpawnGang(i){const p=stSpot(i),list=[];const lk=Object.assign(randomLook('guard'),ST_LOOKS[i]);
  const boss=newNPC('guard',p.x,p.z,{state:'fight',t:999,mission:true,story:true,boss:ST_TOWNS[i][1],look:lk});boss.hp=boss.maxHp=420+i*90;boss.H.root.scale.setScalar(1.12);list.push(boss);
  for(let k=0;k<3+Math.min(2,i);k++){const a=k/(3+i)*6.283,x=p.x+Math.cos(a)*7,z=p.z+Math.sin(a)*7,q=resolve(x,z,.6)?p:{x,z};const n=newNPC('guard',q.x,q.z,{state:'fight',t:999,mission:true,story:true,look:Object.assign(randomLook('guard'),{jacket:ST_LOOKS[i].jacket})});n.hp=n.maxHp=110+i*15;list.push(n);}
  stGang={i,boss,list,said:false};banner(ST_TOWNS[i][1],L('Trùm khu '+ST_TOWNS[i][2]+' và đàn em · hạ hắn để lấy mảnh thẻ khoá','Boss of '+ST_TOWNS[i][2]+' and his crew · take him down for a key card'),3);}
function stTarget(){if(!STORY||SS.done||P.inside)return null;
  if(SS.ch===0){const g=SP.shops.find(s=>s.id==='guns');return g?{x:g.x,z:g.z,col:'#ff3b3b',name:L('Cửa hàng súng','Gun shop')}:null;}
  if(SS.ch>=1&&SS.ch<=5){const p=stSpot(SS.ch-1);return{x:p.x,z:p.z,col:'#ff3b3b',name:ST_TOWNS[SS.ch-1][1]};}
  if(SS.ch===6){const d=stDoorSpot();return{x:d.x,z:d.z,col:'#ff3b3b',name:L('Tháp Syndicate','Syndicate Tower')};}return null;}
function stObj(){if(!STORY)return'';const lv=`<span>❤ ${SS.lives}</span> · 🔑 ${stKeys()}/5 · `;
  if(SS.done)return L('Đã phá đảo Nexus City','Nexus City completed');
  if(SS.ch===0)return lv+L('Mua một khẩu súng ở <span>Súng Tầm Xa</span> (đường đỏ)','Buy a gun at <span>Long Range Guns</span> (red route)');
  if(SS.ch>=1&&SS.ch<=5)return lv+(stGang?L('Hạ <span>'+ST_TOWNS[SS.ch-1][1]+'</span>','Take down <span>'+ST_TOWNS[SS.ch-1][1]+'</span>'):L('Tới '+ST_TOWNS[SS.ch-1][2]+', tìm <span>'+ST_TOWNS[SS.ch-1][1]+'</span> (đường đỏ)','Go to '+ST_TOWNS[SS.ch-1][2]+' and find <span>'+ST_TOWNS[SS.ch-1][1]+'</span> (red route)'));
  if(SS.ch===6){if(P.inside==='tower'){if(stHeli)return lv+L('Bắn rơi <span>trực thăng</span> của Ông Trùm!','Shoot down the boss <span>helicopter</span>!');return lv+L('Hạ <span>Ông Trùm Vương</span> trên sân thượng','Take down <span>Boss Vương</span> on the roof');}return lv+L('Vào <span>Tháp Syndicate</span> ở trung tâm (đường đỏ)','Enter <span>Syndicate Tower</span> downtown (red route)');}
  return '';}
function stDoorOption(){if(!STORY||SS.ch!==6||P.inside||P.car)return null;const d=stDoorSpot();if(hyp(P.x-d.x,P.z-d.z)>2.6)return null;
  return{k:'E',txt:L('Vào Tháp Syndicate','Enter Syndicate Tower'),fn:stEnterTower};}
function stEnterTower(){if(stars>0){showPrompt(L('Cắt đuôi cảnh sát trước đã','Lose the police first'),1.6);return;}const d=stDoorSpot();enterInterior('tower',{x:d.x,z:d.z,h:0});setTimeout(stStartTower,420);}
function stStartTower(){stTowerReset();const list=[];const lk=Object.assign(randomLook('guard'),{shirt:'#f5f5f5',pants:'#111111',jacket:'#111111',cap:null});
  const boss=newNPC('guard',TW.cx,TW.cz-8,{state:'fight',t:999,mission:true,story:true,boss:L('Ông Trùm Vương','Boss Vương'),look:lk});boss.hp=boss.maxHp=1100;boss.H.root.scale.setScalar(1.18);list.push(boss);
  for(let k=0;k<6;k++){const x=TW.cx+(k%3-1)*12,z=TW.cz-14+Math.floor(k/3)*14+(k%2?3:-3);const n=newNPC('guard',x,z,{state:'fight',t:999,mission:true,story:true,look:Object.assign(randomLook('guard'),{jacket:'#111111',shirt:'#222222'})});n.hp=n.maxHp=150;list.push(n);}
  stTower={boss,list,phase:'fight'};banner(L('THÁP SYNDICATE','SYNDICATE TOWER'),L('Ông Trùm Vương đang chờ trên sân thượng · thùng đạn ở cạnh cửa','Boss Vương is waiting on the roof · ammo crate by the door'),3.2);}
function stTowerReset(){if(stTower){for(const n of stTower.list)if(npcs.includes(n))removeNPC(n);}stTower=null;if(stHeli){scene.remove(stHeli.g);stHeli=null;}}
function stHeliHit(o,d,range,dmg){if(!stHeli||stHeli.dead)return false;const H=stHeli.g.position;_m.set(H.x-o.x,H.y-o.y,H.z-o.z);const t=_m.dot(d);if(t<0||t>range)return false;const q=_m.lengthSq()-t*t;if(q>3.2*3.2)return false;
  stHeli.hp-=dmg;fx3(H.x+rnd(-1,1),H.y+rnd(-.5,.5),H.z+rnd(-1,1),false);sfx('ric');lastFoe={n:{boss:L('Trực thăng Ông Trùm','Boss helicopter'),hp:Math.max(0,stHeli.hp),maxHp:100,heli:true},t:time};return true;}
function stDied(){if(!STORY||SS.done)return;SS.lives--;SS.deaths=(SS.deaths|0)+1;stClearGang();stTowerReset();
  if(SS.lives<=0){SS.lives=3;SS.keys=[0,0,0,0,0];SS.ch=Math.min(SS.ch,1);if(SS.ch>0)SS.ch=1;setTimeout(()=>banner(L('HẾT MẠNG','OUT OF LIVES'),L('Mất hết mảnh thẻ khoá · làm lại từ trùm đầu tiên, bạn có lại 3 mạng','All key cards lost · start again from the first boss with 3 lives'),4.5),2900);}
  else setTimeout(()=>banner(L('Tỉnh lại ở bệnh viện','You woke up in hospital'),L(`Còn ${SS.lives} mạng · tiến độ vẫn được giữ`,`${SS.lives} lives left · progress kept`),3.5),2900);
  writeSave();}
function stWinBoss(i){SS.keys[i]=1;SS.ch=Math.min(6,SS.ch+1);while(SS.ch<=5&&SS.keys[SS.ch-1])SS.ch++;sfx('cash');P.hp=maxHp();save.money+=2000;
  banner(L('Mảnh thẻ khoá '+stKeys()+'/5','Key card '+stKeys()+'/5'),stKeys()>=5?L('Đủ 5 mảnh! Tháp Syndicate ở trung tâm đã mở · +$2.000','All 5! Syndicate Tower downtown is open · +$2,000'):L('Hạ '+ST_TOWNS[i][1]+' · +$2.000 · tới thị trấn tiếp theo','Beat '+ST_TOWNS[i][1]+' · +$2,000 · on to the next town'),4);writeSave();
  const g=stGang;stGang=null;setTimeout(()=>{if(g)for(const n of g.list)if(npcs.includes(n)&&n.state==='down')removeNPC(n);},6000);for(const n of g.list)if(n!==g.boss&&n.state!=='down'){n.state='leave';n.story=false;}}
function stVictory(){if(stWin)return;SS.done=true;SS.ch=7;const mins=Math.round((Date.now()-(SS.t0||Date.now()))/60000);
  let lg={};try{lg=JSON.parse(localStorage.getItem('nexus-city2-legend')||'{}');}catch(_){}const first=!lg.done;
  if(first){lg={done:true,claimed:false,at:Date.now()};try{localStorage.setItem('nexus-city2-legend',JSON.stringify(lg));}catch(_){}}
  writeSave();if(opt.onStory)opt.onStory(save);
  for(let k=0;k<14;k++)setTimeout(()=>burst(P.x+rnd(-25,25),rnd(18,32),P.z+rnd(-25,25),pick(['#ffd166','#ff5fd2','#7df9ff','#c1f354','#ff6b5d'])),k*450);
  stWin=document.createElement('div');stWin.className='nc-win';
  stWin.innerHTML=`<div class="nc-win-in"><small>${L('THE SYNDICATE ĐÃ SỤP ĐỔ','THE SYNDICATE HAS FALLEN')}</small><h2>${L('PHÁ ĐẢO NEXUS CITY','NEXUS CITY COMPLETE')}</h2><p class="nc-win-n">${L('Danh hiệu: Huyền Thoại Nexus','Title: Nexus Legend')}</p>
    <div class="nc-win-s"><span>⏱ ${mins} ${L('phút','min')}</span><span>💀 ${SS.deaths|0} ${L('lần ngã','falls')}</span><span>🔑 5/5</span></div>
    ${first?`<div class="nc-win-r"><b>${L('Phần thưởng','Rewards')}</b><span>🏎️ ${L('Siêu xe Huyền Thoại (chỉ có 1 chiếc)','Legend supercar (one of a kind)')}</span><span>💰 $100.000</span><em>${L('Đã chuyển vào chế độ "Vào thẳng thành phố" · xe nằm trong gara nhà bạn','Sent to "Go straight to the city" · the car is in your home garage')}</em></div>`
      :`<div class="nc-win-r"><b>${L('Bạn đã phá đảo trước đó','You already beat the game')}</b><em>${L('Chơi lại Story mode không nhận thêm xe hay tiền','Replaying Story mode gives no extra car or money')}</em></div>`}
    <button type="button" class="nc-win-b">${L('Về menu','Back to menu')}</button></div>`;
  root.appendChild(stWin);stWin.querySelector('button').addEventListener('click',()=>{stWin.remove();stWin=null;if(opt.onMenu)opt.onMenu();});}
function storyUpdate(dt){fwkUpdate(dt);if(!STORY)return;if(stTower&&P.inside!=='tower'&&P.koT<=0)stTowerReset();
  if(stDoorMk){const show=SS.ch===6&&!P.inside;stDoorMk.visible=show;if(show){const d=stDoorSpot();stDoorMk.position.set(d.x,.25,d.z);stDoorMk.children[0].rotation.z+=dt;}}
  if(SS.done)return;
  if(SS.ch===0&&Object.keys(save.weapons).some(w=>save.weapons[w])){SS.ch=1;banner(L('Đã có vũ khí','Armed'),L('Giờ tới Phố Cổ Đèn Lồng hạ trùm đầu tiên','Now head to the Lantern Old Quarter for the first boss'),3.5);writeSave();}
  if(SS.ch>=1&&SS.ch<=5&&!P.inside){const i=SS.ch-1,p=stSpot(i),t=P.car||P,d=hyp(t.x-p.x,t.z-p.z);
    if(!stGang&&d<85&&P.koT<=0)stSpawnGang(i);
    if(stGang){if(d>170){stClearGang();showPrompt(L('Bạn đã rời khỏi khu trùm','You left the boss area'),1.6);}
      else{for(const n of stGang.list)if(n.state==='leave'&&n.story){n.state='fight';n.t=999;}const b=stGang.boss;if(!npcs.includes(b)||b.state==='down'||b.hp<=0)stWinBoss(i);}}}
  if(SS.ch===6&&P.inside==='tower'&&stTower){const T2=stTower,b=T2.boss;for(const n of T2.list)if(n.state==='leave'&&npcs.includes(n)){n.state='fight';n.t=999;}
    if(T2.phase==='fight'&&(b.hp<=b.maxHp*.25||b.state==='down')){T2.phase='escape';removeNPC(b);stHeli=stHeliMake();stHeli.hp=100;stHeli.t=0;stHeli.g.position.set(TW.cx,1.8,TW.cz-14);stHeli.a=0;banner(L('ÔNG TRÙM BỎ CHẠY!','THE BOSS IS ESCAPING!'),L('Hắn nhảy lên trực thăng · bắn rơi nó!','He jumped into his helicopter · shoot it down!'),3.2);sfx('horn');}
    if(stHeli){const H=stHeli;H.t+=dt;for(const r of H.rot)r.rotation.y+=dt*(r===H.rot[2]?0:28);H.rot[2].rotation.x+=dt*30;const g=H.g;
      if(!H.dead){if(H.t<3){g.position.y=1.8+H.t*5;}else{H.a+=dt*.35;const R=24,y=17+Math.sin(H.t*.7)*3;g.position.set(TW.cx+Math.sin(H.a)*R,y,TW.cz+Math.cos(H.a)*R);}
        g.rotation.y=Math.atan2(P.x-g.position.x,P.z-g.position.z);g.rotation.z=Math.sin(H.t)*.08;
        H.scd=(H.scd==null?2:H.scd)-dt;if(H.t>3&&H.scd<=0&&P.koT<=0){H.scd=rnd(.9,1.6);_o.copy(g.position);_o.y-=1;_d.set(P.x-_o.x,1.1-_o.y,P.z-_o.z).normalize();_d.x+=rnd(-.04,.04);_d.z+=rnd(-.04,.04);_d.normalize();const r=rayHit(_o,_d,90,null),end=_o.clone().addScaledVector(_d,r.t);addTracer(_o,end);sfx('smg');if(r.kind==='player')hurtPlayer(6,null);}
        if(H.hp<=0){H.dead=true;H.vy=0;banner(L('TRÚNG RỒI!','DIRECT HIT!'),L('Trực thăng của Ông Trùm đang rơi','The boss helicopter is going down'),2.5);for(let k=0;k<6;k++)setTimeout(()=>{if(stHeli)fx3(g.position.x+rnd(-2,2),g.position.y+rnd(-1,1),g.position.z+rnd(-2,2),false);sfx('crash');},k*180);}}
      else{H.vy-=12*dt;g.position.y+=H.vy*dt;g.rotation.y+=dt*6;g.position.x+=(g.position.x-TW.cx)*dt*.4;g.position.z+=(g.position.z-TW.cz)*dt*.4;if(g.position.y<-70){scene.remove(g);stHeli=null;for(const n of T2.list)if(npcs.includes(n))n.state='leave';T2.phase='won';stVictory();}}}}}
// free mode: collect the one-time reward of a finished story
if(!STORY){let lg=null;try{lg=JSON.parse(localStorage.getItem('nexus-city2-legend')||'null');}catch(_){}
  if(lg&&lg.done&&!lg.claimed){lg.claimed=true;try{localStorage.setItem('nexus-city2-legend',JSON.stringify(lg));}catch(_){}
    if(!save.garage.some(o=>o.type==='legend')){save.money+=100000;save.garage.push({type:'legend',color:'#d4a017'});save.legend=true;writeSave();setTimeout(()=>banner(L('Phần thưởng phá đảo!','Story reward!'),L('+$100.000 và Siêu xe Huyền Thoại · lấy xe ở gara nhà bạn','+$100,000 and the Legend supercar · get it from your home garage'),5),2500);}}}

function frame(now){raf=requestAnimationFrame(frame);const raw=(now-last)/1000||0;let dt=Math.max(0,Math.min(.05,raw));last=now;if(hitStop>0){hitStop-=dt;dt*=.12;}if(raw>0&&raw<1)adapt(raw);if(!paused&&!mapOpen&&!shopOpen)step(dt);camUpdate(dt);hudUpdate(dt);audioUpdate(dt);if(GRASS&&!P.inside)GRASS.update(P.car?P.car.x:P.x,P.car?P.car.z:P.z);PP.render();}
function resize(){const w=view.clientWidth||innerWidth,h=view.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const pr=renderer.getPixelRatio();PP.setSize(Math.round(w*pr),Math.round(h*pr));}
window.addEventListener('resize',()=>{if(!view.closest('[hidden]'))resize();});
camera.position.set(P.x,4,P.z+7);
if(tut.on)banner('Chào mừng tới Nexus City','Làm theo hướng dẫn ở góc trên bên trái, hoặc bấm Bỏ qua');
else banner('Nexus City','Bấm M để mở bản đồ và chọn nơi muốn tới. Cột xanh lá giữa trung tâm là ngân hàng.');
const api={
  setGfx(v){PP.on=v!=='low';resize();},
  start(){paused=false;active=true;keys.clear();try{if(sfxAC&&sfxAC.state==='suspended')sfxAC.resume();}catch(_){}last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);resize();},
  setPaused(p){paused=p;active=!p;keys.clear();cam.rmb=false;tb.block=false;if(p)radioStop();else{last=performance.now();if(P.car&&radio.idx>=0)radioPlay();}},
  stop(){cancelAnimationFrame(raf);active=false;paused=true;keys.clear();radioStop();try{if(sfxAC&&sfxAC.state==='running')sfxAC.suspend();}catch(_){}writeSave();},
  resume(){active=true;paused=false;keys.clear();cam.rmb=false;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);resize();if(P.car&&radio.idx>=0)radioPlay();},
  resize,
  get save(){return save;},
  _dbg:{story:{get SS(){return SS;},stSpot,stDoorSpot,get gang(){return stGang;},get tower(){return stTower;},get heli(){return stHeli;},stEnterTower,stStartTower,stVictory,stDied,storyUpdate,wasted,get win(){return stWin;}},heightAt,resolve,TOWNS,DIAS,PADS,inBld,AIR,PP,P,cars,newCar,buyVehicle,interactOption,sitDown,standUp,takeFood,GDOORS,SHOPS,save,bookTour,npcs,get stars(){return stars;},set stars(v){stars=v;},startHeist,startMission,interact,toggleCar,playerPunch,get heist(){return heist;},set heistProg(v){if(heist)heist.prog=v;},SP,tut,toggleMap,bag,time:()=>time,scene,renderer,sun,step,info:()=>renderer.info.render,keys,camUpdate,camera,weather,ROOMS,openShop,closeShop,enterInterior,exitInterior,selectWeapon,fireWeapon,get shopOpen(){return shopOpen;},tod,todApply,gps,setWaypoint,clearWaypoint,planRoute,poiList,radio,radioNext,playerHitBy,get lastFoe(){return lastFoe;},cam,tb,render:()=>renderer.render(scene,camera)}
};
return api;
}
window.NexusCity2={create};
})();
