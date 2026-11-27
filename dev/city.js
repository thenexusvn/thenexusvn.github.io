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
let MAXANISO=0,GFX_T='mid';
function makeTex(w,h,draw,o){o=o||{};const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new T.CanvasTexture(c);if(o.repeat!==false)t.wrapS=t.wrapT=T.RepeatWrapping;if(o.srgb!==false)t.encoding=T.sRGBEncoding;t.anisotropy=o.aniso||(GFX_T==='ultra'?16:GFX_T==='low'?1:4);if(MAXANISO)t.anisotropy=Math.min(t.anisotropy,MAXANISO);return t;}
function speckle(g,w,h,base,n,a){g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){const d=Math.random()<.5;g.fillStyle=d?`rgba(0,0,0,${Math.random()*a})`:`rgba(255,255,255,${Math.random()*a})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2.5,1+Math.random()*2.5);}}

/* ======================================================================= */
function create(opt){
const view=opt.view,root=opt.hudRoot,MOBILE=!!opt.mobile;
/* graphics tier: low = Smooth, mid = Good, ultra = Ultra (old saves said 'high', which is Good now) */
const GFX=opt.gfx==='low'?'low':opt.gfx==='ultra'?'ultra':'mid';GFX_T=GFX;
// tiers: Smooth = lean (hard shadows, 1x resolution, no post FX, fewer people, shorter view); Good = balanced;
// Ultra = everything on: supersampled 1.5-2x resolution, 4096 soft shadows, AO, god rays, 16x texture filtering, sharper drawn textures, busier streets, longer view, never auto-downgraded
const DPR=window.devicePixelRatio||1;
const Q=MOBILE?{peds:16,traffic:16,shadows:true,pr:1,cull:130,tex:256}
  :GFX==='low'?{peds:22,traffic:20,shadows:true,pr:1,cull:140,tex:256}
  :GFX==='ultra'?{peds:46,traffic:44,shadows:true,pr:Math.min(2,Math.max(1.5,DPR)),cull:235,tex:1024}
  :{peds:34,traffic:34,shadows:true,pr:Math.min(DPR,1.25),cull:175,tex:512};
if(MOBILE)Q.shadows=false;

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
renderer.shadowMap.enabled=Q.shadows;renderer.shadowMap.type=GFX==='low'?T.PCFShadowMap:T.PCFSoftShadowMap;
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
sun.castShadow=Q.shadows;sun.shadow.mapSize.set(GFX==='ultra'?4096:GFX==='low'?1024:2048,GFX==='ultra'?4096:GFX==='low'?1024:2048);
{const c=sun.shadow.camera;c.left=-80;c.right=80;c.top=80;c.bottom=-80;c.near=5;c.far=500;}
sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);

/* ---------- materials ---------- */
const MC={};
function mat(c,r,m,ex){r=r===undefined?.8:r;m=m||0;const k=c+'|'+r+'|'+m+(ex?'x':'');if(!MC[k])MC[k]=new T.MeshStandardMaterial(Object.assign({color:lin(c),roughness:r,metalness:m},ex||{}));return MC[k];}
function emat(c,i){i=i===undefined?1:i;const k='e|'+c+'|'+i;if(!MC[k])MC[k]=new T.MeshStandardMaterial({color:lin('#202020'),emissive:lin(c),emissiveIntensity:i,roughness:.35});return MC[k];}
/* ---------- HDRI reflections: real sky photos (Poly Haven, CC0) reflected in car paint, glass, chrome and water.
   Three HDRIs (day, golden hour, night) are swapped by time of day; the general scene lighting is unchanged. ---------- */
const HDR={names:{day:'kloofendal_48d_partly_cloudy_puresky',gold:'venice_sunset',night:'satara_night'},tex:{},cur:'',mats:new Set(),t:0,on:!MOBILE&&GFX!=='low'};
function envProbe(E,min){try{const rt=new T.WebGLRenderTarget(8,8),ts=new T.Scene();ts.add(new T.Mesh(new T.SphereGeometry(1,16,12),new T.MeshStandardMaterial({color:0xffffff,metalness:1,roughness:.4,envMap:E})));
  const tc=new T.PerspectiveCamera(40,1,.1,10);tc.position.z=3;renderer.setRenderTarget(rt);renderer.render(ts,tc);const px=new Uint8Array(256);renderer.readRenderTargetPixels(rt,0,0,8,8,px);renderer.setRenderTarget(null);rt.dispose();let sum=0;for(let i=0;i<px.length;i+=4)sum+=px[i]+px[i+1]+px[i+2];return sum>(min||300);}catch(_){return false;}}
function hdrJs(src){return new Promise((res,rej)=>{if(T.RGBELoader)return res();const sc=document.createElement('script');sc.src=src;sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});}
async function hdrLoad(k){if(HDR.tex[k]!==undefined)return HDR.tex[k];HDR.tex[k]=null;
  try{await hdrJs('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js');
    const t=await new Promise((r,j)=>new T.RGBELoader().setDataType(T.UnsignedByteType).load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/'+HDR.names[k]+'_1k.hdr',r,null,j));
    const pm=new T.PMREMGenerator(renderer);const e=pm.fromEquirectangular(t).texture;t.dispose();pm.dispose();const ok=envProbe(e,12);HDR.tex[k]=ok?e:false;if(!ok)console.warn('hdri probe failed',k);return HDR.tex[k];}catch(err){console.warn('hdri',err);HDR.tex[k]=false;return false;}}
function hdrReg(m){if(m)HDR.mats.add(m);const e=HDR.cur&&HDR.tex[HDR.cur];if(e&&m){m.envMap=e;m.needsUpdate=true;}return m;}
function hdrTick(dt){if(!HDR.on)return;HDR.t-=dt;if(HDR.t>0)return;HDR.t=1;const h=((tod.hour%24)+24)%24,k=h>=7.3&&h<17.2?'day':(h>=17.2&&h<19.9)||(h>=5&&h<7.3)?'gold':'night';
  const inten=k==='night'?.55:k==='gold'?1.15:1;for(const m of HDR.mats)m.envMapIntensity=(m.userData.envBase||1)*inten;
  if(k===HDR.cur)return;HDR.cur=k;hdrLoad(k).then(e=>{if(HDR.cur!==k)return;for(const m of HDR.mats){m.envMap=e||null;m.needsUpdate=true;}
    // the photo sky also lights the whole city (image-based lighting) and shows in wet asphalt
    if(e){scene.environment=e;if(ASPH){ASPH.envMap=e;ASPH.needsUpdate=true;}}else scene.environment=ENV;});}
const GLASS=new T.MeshStandardMaterial({color:lin(ENV_OK?'#0e141c':'#1d2733'),roughness:ENV_OK?.06:.12,metalness:ENV_OK?.9:.25,envMapIntensity:1.2});GLASS.userData.envBase=1.2;hdrReg(GLASS);
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
  query(x,z,r,c=>{if(c.off||(c.lv!==undefined&&!lvOK(c)))return;if(c.t==='b'){const cx=clamp(x,c.x0,c.x1),cz=clamp(z,c.z0,c.z1),dx=x-cx,dz=z-cz,d2=dx*dx+dz*dz;if(d2<r*r){hit=true;if(d2>1e-8){const d=Math.sqrt(d2);px+=dx/d*(r-d);pz+=dz/d*(r-d);}else{const l=x-c.x0,rr=c.x1-x,t=z-c.z0,b=c.z1-z,m=Math.min(l,rr,t,b);if(m===l)px-=l+r;else if(m===rr)px+=rr+r;else if(m===t)pz-=t+r;else pz+=b+r;}}}
    else{const dx=x-c.x,dz=z-c.z,d=hyp(dx,dz),R=r+c.r;if(d<R&&d>1e-6){hit=true;px+=dx/d*(R-d);pz+=dz/d*(R-d);}}});
  if(x<2500){const ins=(qx,qz)=>AREAS.some(a=>qx>=a.x0&&qx<=a.x1&&qz>=a.z0&&qz<=a.z1);
    if(!(ins(x-r,z)&&ins(x+r,z)&&ins(x,z-r)&&ins(x,z+r))){let bd=1e9,bp=null;for(const a of AREAS){const cx=clamp(x,a.x0+r,a.x1-r),cz=clamp(z,a.z0+r,a.z1-r),d=hyp(cx-x,cz-z);if(d<bd){bd=d;bp=[cx-x,cz-z];}}if(bp){px+=bp[0];pz+=bp[1];hit=true;}}
    const LK=WILD.lake;if(LK&&!onDock(x,z)){const dx=x-LK.x,dz=z-LK.z,d=hyp(dx,dz),Rr=LK.r-2+r;if(d<Rr&&d>1e-6){px+=dx/d*(Rr-d);pz+=dz/d*(Rr-d);hit=true;}}}
  return hit?[px,pz]:null;}
function inBld(x,z,y){let r=false;query(x,z,0,c=>{if(!r&&c.t==='b'&&!c.off&&(c.lv===undefined||lvOK(c))&&(y===undefined||c.y0===undefined||y>c.y0-.6)&&x>c.x0-.3&&x<c.x1+.3&&z>c.z0-.3&&z<c.z1+.3&&(y===undefined||y<c.h+.6))r=true;});return r;}
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
const SP={shops:[]},GDOORS=[],COURTS=[];
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
  }else if(d==='park'){const CT=b.i===12&&b.j===12,PR=CT?{palm:[],tree:[],bench:[]}:props,AC=CT?()=>{}:addCol;if(CT)COURTS.push({cx,cz,ix0,ix1,iz0,iz1});
    if(CT){SWB.flat(ix0,ix1,.265,iz0,iz1,4);}else{GRB.flat(ix0,ix1,.26,iz0,iz1,6);SWB.flat(cx-1.6,cx+1.6,.27,iz0,iz1,4);SWB.flat(ix0,ix1,.272,cz-1.6,cz+1.6,4);
    dpath(SWB,ix0+.5,iz0+.5,ix1-.5,iz1-.5,2.4,.274);dpath(SWB,ix0+.5,iz1-.5,ix1-.5,iz0+.5,2.4,.276);}
    const pW=ix1-ix0,pH=iz1-iz0,dDiag=(x,z)=>{const u=(x-ix0)/pW,v=(z-iz0)/pH;return Math.min(Math.abs(u-v),Math.abs(u+v-1))*Math.min(pW,pH)/1.414;};
    for(let k=0;k<9;k++){const x=sr(ix0+3,ix1-3),z=sr(iz0+3,iz1-3);if(Math.abs(x-cx)<4||Math.abs(z-cz)<4||dDiag(x,z)<3)continue;PR.palm.push([x,z]);}
    for(let k=0;k<12;k++){const x=sr(ix0+3,ix1-3),z=sr(iz0+3,iz1-3);if(Math.abs(x-cx)<5||Math.abs(z-cz)<5||dDiag(x,z)<3.5||PR.palm.some(p=>hyp(p[0]-x,p[1]-z)<4))continue;PR.tree.push([x,z,sr(1,1.5)]);AC({t:'c',x,z,r:.4});}
    for(let k=0,n=0;k<60&&n<16;k++){const x=sr2(ix0+2.5,ix1-2.5),z=sr2(iz0+2.5,iz1-2.5);if(Math.abs(x-cx)<4.5||Math.abs(z-cz)<4.5||dDiag(x,z)<3.4||PR.tree.some(p=>hyp(p[0]-x,p[1]-z)<5)||PR.palm.some(p=>hyp(p[0]-x,p[1]-z)<4))continue;n++;
      if(sr2(0,1)<.3)PR.palm.push([x,z]);else{PR.tree.push([x,z,sr2(.9,1.45)]);AC({t:'c',x,z,r:.4});}}
    for(const[x,z,r]of[[cx+5,cz-2.6,0],[cx-5,cz+2.6,Math.PI],[cx-2.6,cz-6,Math.PI/2]])PR.bench.push([x,z,r]);
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
    shieldSigns.push(['SÂN VẬN ĐỘNG NEXUS',cx-14,8,iz1+.07,0,14,1.8,{fg:'#c1f354',bg:'#0b0d10',size:54}]);gdoor(cx+11,iz1,0,'court',2.6,3);shieldSigns.push(['NHÀ THI ĐẤU BÓNG RỔ',cx+11,4.3,iz1+.07,0,7,1.1,{fg:'#ffffff',bg:'#1b3e7a',size:50}]);SP.arena={x:cx+11,z:iz1+1.5};SP.stadium={x:cx,z:iz1+1.5};
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
const water=new T.Mesh(waterG,new T.MeshStandardMaterial({color:lin('#1d7f99'),roughness:.12,metalness:.25,envMapIntensity:1.1,transparent:true,opacity:.95}));water.position.set(0,.02,0);water.receiveShadow=Q.shadows;water.frustumCulled=false;scene.add(water);water.material.userData.envBase=1.1;hdrReg(water.material);
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
      {const x0=-950,x1=-893,z0=-55,z1=0;bld('glassSilver',x0,x1,z0,z1,y,16,true);door(-921,z1,0,'mall',y,4,3.2,'#22323f',null);door(x0,-28,-Math.PI/2,'mart',y,2.4,2.8,'#22323f',null);
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
const NIGHT_K=['#0a1028','#16204a','#2a3660','#161c30','#26304e','#a8b8ff',.3,'#8a9cd0','#3a3650',.8,1,'#4a5478','#1e2440'];
const TODK=[[0,...NIGHT_K],[5.3,'#1a2350','#6a5a8a','#e89a80','#6a5060','#a07a80','#ffb48a',.7,'#9a90b0','#3a3040',.45,.5,'#f0b0a0','#6a5070'],
  [7,'#3a6ab8','#9ac0e0','#f0d8c0','#b0a090','#d8d0c8','#ffe2c0',1.9,'#d0e0f0','#4b4a46',.6,0,'#ffffff','#b8c0d0'],
  [12,'#2f66c8','#7fb2e6','#cfe4f2','#a8b0b0','#c8dae6','#fff6e6',2.6,'#dceaff','#4f4a40',.65,0,'#ffffff','#c0c8d8'],
  [16,'#3466b8','#8ab4e0','#e6e0d0','#b0a898','#d8d4c8','#ffe8c8',2.4,'#e8e8f0','#4f4a46',.65,0,'#fffaf0','#c8c0c8'],
  [18.3,'#283a7a','#e58c8c','#ffc48c','#c89a86','#f3b48a','#ffcf9c',2.4,'#ffe0c6','#4b3c56',.7,0,'#fff0e0','#b08090'],
  [19.6,'#1c2658','#7a4a7a','#d86a5a','#6a4a5a','#8a5a6a','#ff8a5a',.9,'#a890b0','#3a3040',.68,.45,'#ff9a7a','#4a3050'],
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
  if(day>.02){tod.lightDir.copy(sunDir);sun.intensity=F(7)*Math.max(.25,day);}else{tod.lightDir.copy(sunDir).negate();sun.color.set('#b0c0ff').convertSRGBToLinear();sun.intensity=.75;}
  if(tod.lightDir.y<.12){tod.lightDir.y=.12;tod.lightDir.normalize();}
  const nk=1-day;renderer.toneMappingExposure=1+.3*nk;for(const m of NIGHTM){m.emissiveIntensity=m.userData.baseE*(.15+1.25*nk);if(m.userData.baseEnv!==undefined)m.envMapIntensity=m.userData.baseEnv*(.3+.7*day);}
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
  const arm={},el={},wrs={},ank={},sleeve=o.sleeve===false?o.skin:top,fore=o.longSleeve||o.jacket?top:o.skin;
  for(const s of[-1,1]){const sh=new T.Group();sh.position.set(s*(F?.2:.222),.5,0);sh.rotation.z=s*.07;spine.add(sh);mk([{geo:G.upper,color:sleeve,scale:F?[.9,1,.9]:[1,1,1]}],sh);const e=new T.Group();e.position.y=-.3;sh.add(e);
    mk([{geo:G.fore,color:fore,scale:F?[.9,1,.9]:[1,1,1]}],e);const wr=new T.Group();wr.position.y=-.285;e.add(wr);mk([{geo:G.hand,color:o.skin,pos:[0,-.015,.005],scale:[.72,1,.42]},{geo:G.thumb,color:o.skin,pos:[-s*.03,.005,.018]}],wr);arm[s]=sh;el[s]=e;wrs[s]=wr;}
  const leg={},kn={},legC=o.skirt?o.skin:o.pants;
  for(const s of[-1,1]){const hpG=new T.Group();hpG.position.set(s*(F?.095:.09),-.04,0);hips.add(hpG);mk([{geo:G.thigh,color:legC,scale:F?[1.04,1,1]:[1,1,1]}],hpG);const k=new T.Group();k.position.y=-.46;hpG.add(k);
    mk([{geo:G.shin,color:legC}],k);const an=new T.Group();an.position.y=-.42;k.add(an);mk([{geo:G.shoe,color:o.shoes,pos:[0,-.01,.055],scale:[.85,.62,1.9]},{geo:G.sole,color:'#e9e7e2',pos:[0,-.045,.05]}],an);leg[s]=hpG;kn[s]=k;ank[s]=an;}
  if(!Q.shadows){const sh=new T.Mesh(G.shadow,shadowMat);sh.position.y=.03;root.add(sh);}
  scene.add(root);
  return{root,hips,spine,head,armL:arm[-1],armR:arm[1],elL:el[-1],elR:el[1],legL:leg[-1],legR:leg[1],knL:kn[-1],knR:kn[1],anL:ank[-1],anR:ank[1],wrL:wrs[-1],wrR:wrs[1],ph:Math.random()*6,punchT:0,side:1,guard:0,ko:0,koK:0,hitT:0};
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
  // natural motion: hip sway and counter-rotating shoulders, feet that roll heel-to-toe, wrists, breathing and weight shift when idle
  if(H.anL){const sp=amp*(run?1.15:1);H.hips.rotation.y=s*.11*sp;H.hips.rotation.z=c*.035*sp;H.spine.rotation.y+=-s*.17*sp;H.head.rotation.y=s*.08*sp;
    const footL=-(H.legL.rotation.x+H.knL.rotation.x),footR=-(H.legR.rotation.x+H.knR.rotation.x);
    H.anL.rotation.x=footL*.85+(H.legL.rotation.x<-.15?.35*amp:0);H.anR.rotation.x=footR*.85+(H.legR.rotation.x<-.15?.35*amp:0);
    if(run&&!(H.aim>0)&&!(H.punchT>0)&&!(H.guard>0)&&!(H.block>0)){H.elL.rotation.x=Math.min(H.elL.rotation.x,-1.45);H.elR.rotation.x=Math.min(H.elR.rotation.x,-1.45);H.knL.rotation.x+=Math.max(0,-s)*.35;H.knR.rotation.x+=Math.max(0,s)*.35;}
    H.wrL.rotation.x=-.12-Math.max(0,-s)*.2*amp;H.wrR.rotation.x=-.12-Math.max(0,s)*.2*amp;
    if(amp<.05&&!(H.guard>0)&&!(H.aim>0)){const b=Math.sin(t*1.6+H.ph);H.spine.scale.y=1+b*.008;H.hips.rotation.z=Math.sin(t*.45+H.ph)*.025;H.head.rotation.y=Math.sin(t*.37+H.ph*2)*.18;H.head.rotation.x=Math.sin(t*.29+H.ph)*.05;H.armL.rotation.z=-.07-b*.012;H.armR.rotation.z=.07+b*.012;}
    else{H.spine.scale.y=1;H.armL.rotation.z=-.07;H.armR.rotation.z=.07;}}
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
    rimParts.push({geo:new T.CylinderGeometry(wr*.4,wr*.4,.012,20).rotateZ(Math.PI/2),pos:[sx*.1,0,0],color:'#7b8087'});
    for(let k=0;k<10;k++){const a=k/10*Math.PI*2+(k%2?.13:-.13),sp=new T.BoxGeometry(.016,wr*.5,.04).translate(0,wr*.34,0).rotateX(a);rimParts.push({geo:sp,pos:[sx*.114,0,0],color:'#d6dbe0'});}}
  return CG[b]={BL,CL,lower:loftGeo(BL),cabin:glass,roof,tire,rimParts};}
const lightBox=new T.BoxGeometry(.36,.12,.06),grille=new T.BoxGeometry(1,.16,.08),plate=new T.BoxGeometry(.42,.13,.03),mirror=new T.BoxGeometry(.18,.1,.12),barG=new T.BoxGeometry(.5,.12,.28);
const BAR={r:new T.MeshStandardMaterial({color:0x220000,emissive:lin('#ff1a2a'),emissiveIntensity:3}),b:new T.MeshStandardMaterial({color:0x000022,emissive:lin('#1a5bff'),emissiveIntensity:3})};
const copText=textTex('CẢNH SÁT',{fg:'#1b2a55',size:70,bg:'rgba(0,0,0,0)'}),taxiText=textTex('TAXI',{fg:'#111',size:90,bg:'#f5c518',w:256,h:128});
const DETAILM=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false}),WHEELM=new T.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.4});
const TRIMM=hdrReg(new T.MeshStandardMaterial({vertexColors:true,roughness:.3,metalness:.75}));
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
  // lighting details: LED daytime strips over the headlights, projector lenses, a light bar across the tail on sporty cars
  const sporty=['sports','super','hyper','legend','coupe','muscle'].includes(b),exotic=['super','hyper','legend'].includes(b);
  for(const x of[-1,1]){add(new T.BoxGeometry(.38,.018,.02),[x*(fw-.3),s.hl+.078,fz+.028],'#eaf6ff');
    for(const o of[-.09,.09])add(new T.CylinderGeometry(.04,.04,.02,12).rotateX(Math.PI/2),[x*(fw-.3)+o,s.hl,fz+.035],'#fffdf4');}
  if(sporty){add(new T.BoxGeometry(rw*1.5,.022,.02),[0,s.tl+.06,rz-.035],'#ff2424');
    // body kit: front splitter, side skirts, diffuser fins, exhaust tips
    add(new T.BoxGeometry(fw*1.7,.03,.2),[0,s.yb+.03,fz-.02],'#121315',trim);
    for(const x of[-1,1])add(new T.BoxGeometry(.06,.07,Math.max(.6,s.wz*2-(s.wr+.1)*2)),[x*(sideX(0,s.yb+.05)+.02),s.yb+.035,0],'#121315',trim);
    for(let k=-2;k<=2;k++)add(new T.BoxGeometry(.02,.1,.2),[k*rw*.28,s.yb+.06,rz+.05],'#0c0c0d');
    const pipes=exotic?[-.3,-.18,.18,.3]:b==='muscle'?[-.55,.55]:[-.22,.22];for(const px of pipes)add(new T.CylinderGeometry(.05,.055,.18,14).rotateX(Math.PI/2),[px*rw,s.yb+.1,rz-.06],'#b9bec4',trim);
    // rear wing on the fast ones, hood vents on exotics
    if(exotic||b==='sports'){const wz=rz+.32,top=BL.span(wz)[1];for(const x of[-1,1])add(new T.BoxGeometry(.035,.2,.1),[x*rw*.55,top+.09,wz],'#151618',trim);
      add(new T.BoxGeometry(rw*1.75,.035,.34),[0,top+.2,wz-.02],'#17181b',trim);for(const x of[-1,1])add(new T.BoxGeometry(.03,.12,.38),[x*rw*.875,top+.19,wz-.02],'#17181b',trim);}
    if(exotic){const vz=BL.zmax-.75,top=BL.span(vz)[1];for(const x of[-1,1])for(let k=0;k<4;k++)add(new T.BoxGeometry(.2,.012,.025),[x*fw*.35,top+.004,vz+k*.06],'#0a0a0b');}}
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
  const pc={color:lin(type==='police'?'#14171d':type==='taxi'?'#f5c518':color),roughness:ENV_OK?.3:.35,metalness:ENV_OK?.5:.15};const paint=!MOBILE&&(ENV_OK||HDR.on)?new T.MeshPhysicalMaterial(Object.assign(pc,{clearcoat:.8,clearcoatRoughness:.04,envMapIntensity:.5,roughness:.42,metalness:.12})):new T.MeshStandardMaterial(pc);if(paint.isMeshPhysicalMaterial){paint.userData.envBase=.5;hdrReg(paint);}
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
function newCar(type,x,z,h,kind,color){if(!color)color=type==='limo'?pick(['#111418','#111418','#f4f4f2']):type==='bus'?pick(['#f2b705','#2a9d8f','#d62828','#3a86ff']):pick(CARC);const m=makeCar(type,color);if(m.rider)m.rider.root.visible=kind==='traffic';const c={type,x,z,h,color,vx:0,vz:0,vf:0,steer:0,kind,m,mesh:m.g,wheels:m.wheels,steerW:m.steer,spec:m.spec,mass:m.spec.mass,driver:kind==='traffic'||kind==='police',ai:null,stuck:0,hp:100,doorA:0,doorT:0};cars.push(c);if(c.driver&&m.drv){c.look=randomLook(kind==='police'?'cop':'ped');setDriverLook(c,c.look);}syncCar(c);return c;}
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
function playerPunch(){mpPunch=1;
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
  else if(k==='bounce'){th(120,62,.1,.45);nz(.05,500,'lowpass',.25);}
  else if(k==='swish'){nz(.22,5200,'highpass',.16);}
  else if(k==='rim'){th(820,520,.18,.22);th(1240,760,.12,.1);}
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
function selectWeapon(w){if(w!=='fist'&&!save.weapons[w]){showPrompt(L('Chưa có súng này · mua ở Súng Tầm Xa','You do not own this gun · buy it at Long Range Guns'),1.6);return;}P.weapon=w;P.trigger=false;attachWeapon();hudT=0;lastHUD='';if(w==='fist'){if(typeof aimOff==='function')aimOff();}else if(!MOBILE)showPrompt(L('Di chuột để ngắm · B để bắn · bấm 1 để cất súng','Move the mouse to aim · B to shoot · press 1 to put the gun away'),2.6);}
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
  muzzlePos(P.H,_o);if(P.aiming){camera.updateMatrixWorld();camera.getWorldDirection(_d);const co=camera.position.clone();const ch=rayHit(co,_d.clone(),W.range+8,P);const tgt=co.addScaledVector(_d,ch.kind?ch.t:60);_d.copy(tgt).sub(_o).normalize();}
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
  if(!STORY)banner('BẤT TỈNH',`Tỉnh dậy ở bệnh viện · viện phí ${fmt$(fine)}${d?` · mất ${fmt$(d)} tiền nóng`:''}`,3.6);writeSave();}
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
function playerLook(){const b=Object.assign({},CHARS[save.char]||CHARS.minh),o=OUTFITS[save.outfit]||{};for(const k of['shirt','pants','shoes','sleeve','longSleeve','skirt'])if(o[k]!==undefined)b[k]=o[k];if(o.shirt!==undefined){b.jacket=null;if(o.longSleeve===undefined)b.longSleeve=false;}b.cap=save.cap?'#1d1d1d':null;if(save.outfit==='nexus'&&save.cap)b.cap='#ad8dff';if(save.hairStyle)b.hairStyle=save.hairStyle;if(save.hairCol)b.hair=save.hairCol;if(save.beard!==undefined&&save.beard!==null)b.beard=save.beard;if(save.glasses)b.glasses=true;return b;}
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
/* menus, the map and pause give the mouse back; closing them takes it again if it was captured */
let relock=false;
function freeMouse(){if(document.pointerLockElement===cv){relock=true;try{document.exitPointerLock();}catch(_){}}lockHintUpd();}
function backMouse(){if(relock&&!shopOpen&&!mapOpen&&!paused){relock=false;mouseLock();}lockHintUpd();}
function lockHintUpd(){if(hud&&hud.lockHint)hud.lockHint.hidden=MOBILE||document.pointerLockElement===cv||!!shopOpen||mapOpen||paused||!active;}
function openShop(id){shopOpen=id;freeMouse();keys.clear();renderShop();hud.shop.hidden=false;sfx('door');tutEvent('shop');}
function closeShop(){shopOpen=null;hud.shop.hidden=true;writeSave();backMouse();}
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
const EXTRAS=[];
function extra(look,x,z,h,sit){const H=makeHuman(look);EXTRAS.push({H,x,z});H.root.position.set(x,0,z);H.root.rotation.y=h;if(sit)sitPose(H,-1);else{H.armL.rotation.x=H.armR.rotation.x=-.08;H.elL.rotation.x=H.elR.rotation.x=-.2;}return H;}
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
/* ================= BASKETBALL: 2 outdoor courts in the sports park + an indoor arena =================
   FIBA dimensions: court 28 x 15 m, rim 3.05 m high, rim centre 1.575 m from the baseline, backboard 1.8 x 1.05 m at 1.2 m,
   key 4.9 x 5.8 m, three-point arc 6.75 m (0.9 m from the sidelines in the corners). Walk up to a hoop and press E to shoot. */
const BB={hoops:[],score:0,made:0,taken:0,streak:0,ball:null,shot:null,board:null};
const CPX=64,CL=32,CWD=18,OX=2,OY=1.5;// texture: 64 px per metre, 32 x 18 m incl. apron
function courtCanvas(indoor){const W=CL*CPX,H=CWD*CPX;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
  const X=m=>(OX+m)*CPX,Y=m=>(OY+m)*CPX,R=m=>m*CPX;
  if(indoor){// maple strips, staggered seams, darker stained apron
    g.fillStyle='#d9a86a';g.fillRect(0,0,W,H);const sw=7;
    for(let y=0;y<H;y+=sw){let x=-Math.random()*300;while(x<W){const L=180+Math.random()*320,t=Math.random();g.fillStyle=`hsl(${30+t*6},${48+t*10}%,${60+t*12}%)`;g.fillRect(x,y,L,sw-1);
      g.fillStyle='rgba(120,70,30,.10)';for(let k=0;k<6;k++)g.fillRect(x+Math.random()*L,y+1,8+Math.random()*30,1);g.fillStyle='rgba(60,30,10,.35)';g.fillRect(x+L-1,y,1,sw);x+=L;}
      g.fillStyle='rgba(70,40,15,.25)';g.fillRect(0,y+sw-1,W,1);}
    g.fillStyle='rgba(95,45,15,.55)';g.fillRect(0,0,W,Y(0));g.fillRect(0,Y(15),W,H-Y(15));g.fillRect(0,0,X(0),H);g.fillRect(X(28),0,W-X(28),H);
  }else{g.fillStyle='#3d7d4e';g.fillRect(0,0,W,H);g.fillStyle='#2c5f9e';g.fillRect(X(0),Y(0),R(28),R(15));
    for(let i=0;i<9000;i++){g.fillStyle=`rgba(${Math.random()<.5?255:0},${Math.random()<.5?255:0},255,${Math.random()*.035})`;g.fillRect(Math.random()*W,Math.random()*H,2,2);}
    for(let i=0;i<40;i++){g.fillStyle='rgba(0,0,0,.05)';g.beginPath();g.ellipse(Math.random()*W,Math.random()*H,20+Math.random()*60,8+Math.random()*20,Math.random()*3,0,7);g.fill();}}
  const key=indoor?'rgba(30,70,140,.78)':'#b23b3b';
  for(const end of[0,1]){const bx=end?28-1.575:1.575,dir=end?-1:1;// paint
    g.fillStyle=key;g.fillRect(end?X(28-5.8):X(0),Y(7.5-2.45),R(5.8),R(4.9));}
  g.fillStyle=indoor?'rgba(30,70,140,.78)':'#b23b3b';g.beginPath();g.arc(X(14),Y(7.5),R(1.8),0,7);g.fill();
  if(indoor){g.fillStyle='#f5f1e8';g.font=`900 ${R(.9)}px Arial`;g.textAlign='center';g.textBaseline='middle';g.fillText('NEXUS',X(14),Y(7.5));
    g.save();g.globalAlpha=.55;g.fillStyle='#1b3e7a';g.font=`900 ${R(1.1)}px Arial`;g.translate(X(7),Y(7.5));g.rotate(-Math.PI/2);g.fillText('NEXUS ARENA',0,0);g.restore();
    g.save();g.globalAlpha=.55;g.fillStyle='#1b3e7a';g.font=`900 ${R(1.1)}px Arial`;g.translate(X(21),Y(7.5));g.rotate(Math.PI/2);g.fillText('NEXUS ARENA',0,0);g.restore();}
  g.strokeStyle='#ffffff';g.lineWidth=R(.05)+1;g.lineCap='butt';
  const line=(a,b,c,d)=>{g.beginPath();g.moveTo(X(a),Y(b));g.lineTo(X(c),Y(d));g.stroke();};
  g.strokeRect(X(0),Y(0),R(28),R(15));line(14,0,14,15);g.beginPath();g.arc(X(14),Y(7.5),R(1.8),0,7);g.stroke();
  for(const end of[0,1]){const bx=end?28-1.575:1.575,s=end?-1:1,base=end?28:0;
    g.strokeRect(end?X(28-5.8):X(0),Y(7.5-2.45),R(5.8),R(4.9));
    const fx=base+s*5.8;g.beginPath();g.arc(X(fx),Y(7.5),R(1.8),end?Math.PI/2:-Math.PI/2,end?Math.PI*1.5:Math.PI/2);g.stroke();
    g.setLineDash([R(.3),R(.3)]);g.beginPath();g.arc(X(fx),Y(7.5),R(1.8),end?-Math.PI/2:Math.PI/2,end?Math.PI/2:Math.PI*1.5);g.stroke();g.setLineDash([]);
    const a=Math.asin(6.6/6.75),cx=bx+s*Math.cos(a)*6.75;line(base,.9,cx,.9);line(base,14.1,cx,14.1);
    g.beginPath();if(end)g.arc(X(bx),Y(7.5),R(6.75),Math.PI-a,Math.PI+a);else g.arc(X(bx),Y(7.5),R(6.75),-a,a);g.stroke();
    g.beginPath();if(end)g.arc(X(bx),Y(7.5),R(1.25),Math.PI/2,Math.PI*1.5);else g.arc(X(bx),Y(7.5),R(1.25),-Math.PI/2,Math.PI/2);g.stroke();
    for(const yy of[7.5-2.45,7.5+2.45])for(const d of[1.75,2.6,3.45])line(base+s*d,yy,base+s*d,yy+(yy<7.5?-.1:.1));}
  return cv;}
let COURTTX_IN=null,COURTTX_OUT=null;
function courtTex(indoor){const k=indoor?'in':'out';if(indoor&&COURTTX_IN)return COURTTX_IN;if(!indoor&&COURTTX_OUT)return COURTTX_OUT;
  const t=new T.CanvasTexture(courtCanvas(indoor));t.encoding=T.sRGBEncoding;t.anisotropy=MAXANISO||8;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;return indoor?(COURTTX_IN=t):(COURTTX_OUT=t);}
const BALLTX=makeTex(256,128,(g,w,h)=>{g.fillStyle='#d4621e';g.fillRect(0,0,w,h);for(let i=0;i<3000;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.12})`;g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5);}
  g.strokeStyle='#1a1008';g.lineWidth=3;g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();for(const x of[w/4,w*3/4]){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
  for(const x of[0,w/2]){g.beginPath();for(let y=0;y<=h;y+=2){const xx=x+w/4+Math.sin(y/h*Math.PI)*w*.17*(x?-1:1);y?g.lineTo(xx,y):g.moveTo(xx,y);}g.stroke();}},{repeat:false});
const NETTX=makeTex(128,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#f4f4f4';g.lineWidth=2.2;for(let k=-8;k<16;k++){g.beginPath();g.moveTo(k*16,0);g.lineTo(k*16+h,h);g.stroke();g.beginPath();g.moveTo(k*16+h,0);g.lineTo(k*16,h);g.stroke();}},{repeat:true});
const FENCETX=makeTex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#c9ced4';g.lineWidth=2;for(let k=-4;k<8;k++){g.beginPath();g.moveTo(k*32,0);g.lineTo(k*32+h,h);g.stroke();g.beginPath();g.moveTo(k*32+h,0);g.lineTo(k*32,h);g.stroke();}},{repeat:true});
const BBM={ball:new T.MeshStandardMaterial({map:BALLTX,roughness:.75}),rim:mat('#e0561b',.4,.6),net:new T.MeshStandardMaterial({map:NETTX,alphaTest:.4,side:T.DoubleSide,roughness:.9}),
  steel:mat('#9aa1a9',.35,.85),dark:mat('#1d2126',.6,.3),pad:mat('#1b3e7a',.85),white:mat('#f4f4f2',.5),
  glass:new T.MeshPhysicalMaterial({color:0xdfefff,roughness:.05,metalness:0,transmission:.85,transparent:true,opacity:.35,depthWrite:false}),
  fence:new T.MeshStandardMaterial({map:FENCETX,alphaTest:.35,side:T.DoubleSide,metalness:.6,roughness:.4})};FENCETX.repeat.set(14,17);
const boardTex=(glass)=>makeTex(256,150,(g,w,h)=>{g.clearRect(0,0,w,h);if(!glass){g.fillStyle='#f6f6f4';g.fillRect(0,0,w,h);}const c=glass?'#ffffff':'#1a1a1a';g.strokeStyle=c;g.lineWidth=7;g.strokeRect(4,4,w-8,h-8);
  const iw=w*.59/1.8,ih=h*.45/1.05;g.lineWidth=6;g.strokeRect(w/2-iw/2,h-ih-h*.15/1.05,iw,ih);},{repeat:false});
const BOARD_O=boardTex(false),BOARD_G=boardTex(true);
/* one hoop: s=+1 basket faces +x (hoop on the low-x baseline), -1 faces -x */
function buildHoop(par,bx,bz,s,indoor,y0){y0=y0||0;const g=new T.Group();par.add(g);const add=(geo,m,x,y,z)=>{const me=new T.Mesh(geo,m);me.position.set(x,y,z);me.castShadow=true;me.receiveShadow=true;g.add(me);return me;};
  const boardX=bx-s*.375,rimY=y0+3.05;
  if(indoor){add(new T.BoxGeometry(.03,1.05,1.8),BBM.glass,boardX,y0+2.9+.525,bz);const ln=new T.Mesh(new T.PlaneGeometry(1.8,1.05),new T.MeshBasicMaterial({map:BOARD_G,transparent:true,depthWrite:false}));ln.position.set(boardX+s*.02,y0+3.425,bz);ln.rotation.y=s*Math.PI/2;g.add(ln);
    add(new T.BoxGeometry(.06,1.11,.04),BBM.dark,boardX,y0+3.425,bz-.92);add(new T.BoxGeometry(.06,1.11,.04),BBM.dark,boardX,y0+3.425,bz+.92);add(new T.BoxGeometry(.08,.1,1.86),BBM.pad,boardX,y0+2.86,bz);add(new T.BoxGeometry(.06,.04,1.84),BBM.dark,boardX,y0+3.97,bz);
    // stanchion: padded base behind the baseline, arm reaching over the court
    const baseX=bx-s*3.6;add(new T.BoxGeometry(1.6,1.05,1.2),BBM.pad,baseX,y0+.53,bz);add(new T.BoxGeometry(.25,2.9,.25),BBM.pad,baseX+s*.4,y0+2.1,bz);
    const arm=add(new T.BoxGeometry(2.9,.18,.18),BBM.steel,(baseX+boardX)/2+s*.2,y0+3.25,bz);arm.rotation.z=s*.18;add(new T.BoxGeometry(.5,.5,.5),BBM.dark,boardX-s*.3,y0+3.35,bz);
    addCol({t:'b',x0:Math.min(baseX-.8,baseX+.8),x1:Math.max(baseX-.8,baseX+.8),z0:bz-.6,z1:bz+.6});}
  else{const BF=BBM.boardFace||(BBM.boardFace=new T.MeshStandardMaterial({map:BOARD_O,roughness:.45}));const bm=new T.Mesh(new T.BoxGeometry(.04,1.05,1.8),[BF,BF,BBM.white,BBM.white,BBM.white,BBM.white]);
    bm.position.set(boardX,y0+3.425,bz);bm.castShadow=true;g.add(bm);
    const px=bx-s*1.75;add(new T.CylinderGeometry(.09,.1,3.55,14),BBM.steel,px,y0+1.78,bz);add(new T.CylinderGeometry(.06,.07,.9,10),BBM.steel,px+s*.42,y0+3.6,bz).rotation.z=-s*1.05;
    add(new T.BoxGeometry(1.45,.08,.08),BBM.steel,(px+boardX)/2,y0+3.2,bz);add(new T.BoxGeometry(.4,.6,.6),BBM.steel,boardX-s*.22,y0+3.4,bz);add(new T.CylinderGeometry(.25,.25,.05,16),BBM.dark,px,y0+.03,bz);
    addCol({t:'c',x:px,z:bz,r:.18});}
  // rim, flange and net
  const rim=add(new T.TorusGeometry(.225,.011,8,36),BBM.rim,bx,rimY,bz);rim.rotation.x=Math.PI/2;add(new T.BoxGeometry(.16,.03,.14),BBM.rim,boardX+s*.08,rimY,bz);
  const net=add(new T.CylinderGeometry(.225,.15,.42,20,1,true),BBM.net,bx,rimY-.21,bz);net.castShadow=false;
  const hp={x:bx,z:bz,y:rimY,s,net,inside:indoor?'court':null,y0};BB.hoops.push(hp);return hp;}
function buildCourt(par,cx,cz,indoor,y0){y0=y0||0;// court centred on (cx,cz), length along x
  const fl=new T.Mesh(new T.PlaneGeometry(CL,CWD),new T.MeshStandardMaterial({map:courtTex(indoor),roughness:indoor?.28:.85,metalness:0}));fl.rotation.x=-Math.PI/2;fl.position.set(cx,y0+.006,cz);fl.receiveShadow=true;par.add(fl);
  buildHoop(par,cx-14+1.575,cz,1,indoor,y0);buildHoop(par,cx+14-1.575,cz,-1,indoor,y0);
  // a rack of balls by the sideline
  const rk=new T.Group();par.add(rk);rk.position.set(cx-4,y0,cz+CWD/2-.6);const fr=new T.Mesh(new T.BoxGeometry(1.4,.05,.45),BBM.steel);fr.position.y=.55;rk.add(fr);
  for(const x of[-.6,.6])for(const z of[-.2,.2]){const l=new T.Mesh(new T.CylinderGeometry(.02,.02,.55,6),BBM.steel);l.position.set(x,.28,z);rk.add(l);}
  for(let k=0;k<5;k++){const b=new T.Mesh(new T.SphereGeometry(.12,16,12),BBM.ball);b.position.set(-.5+k*.25,.7,0);b.rotation.set(k,k*2,0);b.castShadow=true;rk.add(b);}}
/* ---------- outdoor: two fenced courts with floodlights, benches and a water fountain ---------- */
function buildParkCourts(C){const g=new T.Group();scene.add(g);const{cx,cz}=C;const z1=cz-9.75,z2=cz+9.75;
  buildCourt(g,cx,z1,false,.27);buildCourt(g,cx,z2,false,.27);
  const fx0=cx-16.6,fx1=cx+16.6,fz0=cz-19.6,fz1=cz+19.6,H=3.6;
  const fenceSide=(ax,az,bx,bz,gap)=>{const L=hyp(bx-ax,bz-az),n=Math.max(1,Math.round(L/3));for(let k=0;k<n;k++){const t0=k/n,t1=(k+1)/n,mx=ax+(bx-ax)*(t0+t1)/2,mz=az+(bz-az)*(t0+t1)/2;
      if(gap&&hyp(mx-gap.x,mz-gap.z)<2)continue;const seg=L/n,p=new T.Mesh(new T.PlaneGeometry(seg,H),BBM.fence);p.position.set(mx,.27+H/2,mz);p.rotation.y=Math.atan2(bx-ax,bz-az)-Math.PI/2;g.add(p);
      const x0=ax+(bx-ax)*t0,z0=az+(bz-az)*t0;const post=new T.Mesh(new T.CylinderGeometry(.035,.035,H+.1,6),BBM.steel);post.position.set(x0,.27+H/2,z0);g.add(post);
      const rail=new T.Mesh(new T.CylinderGeometry(.025,.025,seg,6),BBM.steel);rail.rotation.z=Math.PI/2;rail.rotation.y=Math.atan2(bx-ax,bz-az)+Math.PI/2;rail.position.set(mx,.27+H,mz);g.add(rail);
      const a=Math.min(x0,ax+(bx-ax)*t1),b2=Math.max(x0,ax+(bx-ax)*t1),c=Math.min(z0,az+(bz-az)*t1),d=Math.max(z0,az+(bz-az)*t1);addCol({t:'b',x0:a-.05,x1:b2+.05,z0:c-.05,z1:d+.05});}};
  fenceSide(fx0,fz0,fx1,fz0,{x:cx,z:fz0});fenceSide(fx0,fz1,fx1,fz1,{x:cx,z:fz1});fenceSide(fx0,fz0,fx0,fz1,{x:fx0,z:cz});fenceSide(fx1,fz0,fx1,fz1,{x:fx1,z:cz});
  for(const[x,z]of[[fx0+.5,fz0+.5],[fx1-.5,fz0+.5],[fx0+.5,fz1-.5],[fx1-.5,fz1-.5],[fx0+.5,cz],[fx1-.5,cz]]){const p=new T.Mesh(new T.CylinderGeometry(.11,.15,9,10),BBM.steel);p.position.set(x,.27+4.5,z);p.castShadow=true;g.add(p);
    const hd=new T.Mesh(new T.BoxGeometry(.9,.35,.5),BBM.dark);hd.position.set(x+(x<cx?.4:-.4),.27+9,z);hd.lookAt(cx,0,z<cz?z1:z2);g.add(hd);const lens=new T.Mesh(new T.PlaneGeometry(.75,.25),new T.MeshBasicMaterial({color:0xfff6d8,toneMapped:false}));lens.position.copy(hd.position);lens.position.y-=.18;lens.rotation.x=-Math.PI/2;g.add(lens);addCol({t:'c',x,z,r:.18});}
  for(const z of[z1,z2])for(const x of[cx-6,cx+6]){const bz=z+(z<cz?-8.4:8.4)*0+ (z<cz?-8.6:8.6);const b=new T.Group();b.position.set(x,.27,z<cz?fz0+1.1:fz1-1.1);g.add(b);
    const seat=new T.Mesh(new T.BoxGeometry(2.4,.06,.4),mat('#8a5a32',.8));seat.position.y=.45;b.add(seat);for(const sx of[-1,1]){const l=new T.Mesh(new T.BoxGeometry(.06,.45,.4),BBM.dark);l.position.set(sx*1.05,.22,0);b.add(l);}}
  const sign=new T.Mesh(new T.PlaneGeometry(6,1.1),new T.MeshBasicMaterial({map:textTex('SÂN BÓNG RỔ NEXUS',{fg:'#ffffff',bg:'#2c5f9e',size:60,w:512,h:96}),toneMapped:false}));sign.position.set(cx,.27+H+.75,fz1+.02);g.add(sign);
  const s2=sign.clone();s2.position.set(cx,.27+H+.75,fz0-.02);s2.rotation.y=Math.PI;g.add(s2);
  SP.courts={x:cx,z:fz1+1.5};}
/* ---------- indoor arena ---------- */
{const R=room('court',4900,0,40,30,11,{wall:'plasterW',floor:'oak',fts:1.4,wts:2.2,ceil:'ceilT',cts:2,wain:'blue',wainH:1.4,rail:'steel',skirt:'dark'}),x0=R.x0,x1=R.x1,z0=R.z0,z1=R.z1,cx=(x0+x1)/2,cz=(z0+z1)/2-1.5;
  const g=new T.Group();scene.add(g);buildCourt(g,cx,cz,true,0);
  // bleachers on both long sides, rows of plastic seats
  for(const side of[-1,1]){const zEdge=cz+side*(CWD/2+.4);for(let r=0;r<5;r++){const zA=zEdge+side*r*.85,zB=zA+side*.85,y=.45+r*.42;itb('dark',cx-14,cx+14,0,y,Math.min(zA,zB),Math.max(zA,zB),{ts:2,col:r===0});
      for(let k=0;k<26;k++){const sx=cx-13+k*1.04,sz=(zA+zB)/2+side*.1;ibox(sx-.22,sx+.22,y,y+.08,sz-.2,sz+.2,r%2?'#c0392b':'#1b3e7a');ibox(sx-.22,sx+.22,y,y+.42,sz+side*.17,sz+side*.21,r%2?'#c0392b':'#1b3e7a');}}
    if(side<0)addCol({t:'b',x0:cx-14,x1:cx+14,z0:zEdge-5*.85,z1:zEdge});else addCol({t:'b',x0:cx-14,x1:cx+14,z0:zEdge,z1:zEdge+5*.85});}
  // scoreboard on the back wall and banners
  const sb=document.createElement('canvas');sb.width=512;sb.height=256;const sbt=new T.CanvasTexture(sb);sbt.encoding=T.sRGBEncoding;
  BB.board={cv:sb,tx:sbt,draw(){const g2=sb.getContext('2d');g2.fillStyle='#07090c';g2.fillRect(0,0,512,256);g2.strokeStyle='#2a2f36';g2.lineWidth=8;g2.strokeRect(4,4,504,248);
    g2.font='bold 28px Arial';g2.textAlign='center';g2.fillStyle='#c1f354';g2.fillText('NEXUS ARENA',256,42);g2.fillStyle='#9aa3ad';g2.font='bold 22px Arial';let G1=null;try{G1=HP.game;}catch(_){}g2.fillText(G1?L('BẠN','YOU'):L('ĐIỂM','POINTS'),128,86);g2.fillText(G1?'BOT':L('VÀO RỔ','MADE'),384,86);
    g2.font='bold 96px "Courier New",monospace';g2.fillStyle='#ff3b2f';g2.fillText(String(G1?G1.sc[0]:BB.score).padStart(2,'0'),128,180);g2.fillStyle='#ffb000';g2.fillText(String(G1?G1.sc[1]:BB.made).padStart(2,'0'),384,180);
    g2.font='bold 22px Arial';g2.fillStyle='#7df9ff';g2.fillText(L('Chuỗi ','Streak ')+BB.streak+' · '+L('Ném ','Shots ')+BB.taken,256,232);sbt.needsUpdate=true;}};BB.board.draw();
  const sbm=new T.Mesh(new T.PlaneGeometry(6,3),new T.MeshBasicMaterial({map:sbt,toneMapped:false}));sbm.position.set(cx,7.2,z0+.05);g.add(sbm);const sbf=new T.Mesh(new T.BoxGeometry(6.4,3.4,.3),BBM.dark);sbf.position.set(cx,7.2,z0+.02-.15);g.add(sbf);
  for(const[k,x]of[[0,cx-12],[1,cx+12]]){const bn=new T.Mesh(new T.PlaneGeometry(3,4.2),new T.MeshBasicMaterial({map:textTex(k?'NEXUS ★ 2026':'VÔ ĐỊCH',{fg:'#ffd166',bg:k?'#7b2cbf':'#1b3e7a',size:46,w:256,h:360}),toneMapped:false}));bn.position.set(x,7.2,z0+.05);g.add(bn);}
  // ceiling light panels (emissive) + point lights
  for(let i=-2;i<=2;i++)for(const zz of[-6,0,6]){const lp=new T.Mesh(new T.PlaneGeometry(2.6,.6),new T.MeshBasicMaterial({color:0xfffbea,toneMapped:false}));lp.rotation.x=Math.PI/2;lp.position.set(cx+i*6.5,10.95,cz+zz);g.add(lp);}
  R.lights.push([cx-8,9,cz,2.6,'#fff6e0',34],[cx+8,9,cz,2.6,'#fff6e0',34],[cx,9,cz+6,2.2,'#fff6e0',30]);R.bright=true;}
/* ---------- basketball mode: dribble, crossover, jump shot, layup, dunk, steal, block, and 1v1 against a bot ----------
   Enter with E on a court. Controls (keyboard / on-screen buttons):
   attack: J shoot · K layup · L dunk · Space crossover · E leave      defence: J steal · K/Space block */
const HP={on:false,hoop:null,ball:null,PA:null,bot:null,game:null,ui:null,uiKey:'',tipT:0};
function bbNearHoop(){if(P.car)return null;let best=null,bd=1e9;for(const h of BB.hoops){if((h.inside||null)!==(P.inside||null))continue;const dx=P.x-h.x,dz=P.z-h.z,d=hyp(dx,dz);if(d>12||dx*h.s<-.3||Math.abs(dz)>7.6)continue;if(d<bd){bd=d;best=h;}}return best?{h:best,d:bd}:null;}
function bbOption(){if(HP.on)return null;const n=bbNearHoop();if(!n)return null;return{k:'E',txt:L('Chơi bóng rổ','Play basketball'),fn:()=>hpEnter(n.h)};}
function bbShoot(){hpKey('j');}
// ---- geometry helpers around the active hoop (half court) ----
const hpRim=()=>HP.hoop;
function hpFloor(){return HP.hoop.y0+(HP.hoop.inside?0:.0);}
function hpClamp(a){const h=HP.hoop,xb=h.x-h.s*1.575,xm=xb+h.s*14;const lo=Math.min(xb,xm)+.35,hi=Math.max(xb,xm)-.35;a.x=clamp(a.x,lo,hi);a.z=clamp(a.z,h.z-7.15,h.z+7.15);}
function hpTop(dist){const h=HP.hoop;return{x:h.x+h.s*dist,z:h.z};}
const dRim=a=>hyp(a.x-HP.hoop.x,a.z-HP.hoop.z);
// ---- actors: the player proxy and the bot share the same fields ----
function hpActor(H,isBot){return{H,x:0,z:0,y:0,h:0,vy:0,act:null,hand:1,dph:0,spd:0,isBot,stun:0,cool:0,jy:0};}
function hpEnter(h){HP.on=true;HP.hoop=h;HP.PA=HP.PA||hpActor(P.H,false);HP.PA.H=P.H;HP.ball={st:'held',owner:HP.PA,x:P.x,y:1,z:P.z,vx:0,vy:0,vz:0,spin:0};hpUI(true);
  if(P.weapon!=='fist')selectWeapon('fist');banner(L('Bóng rổ','Basketball'),MOBILE?L('Dùng các nút bên phải · bấm 1v1 để solo với bot','Use the buttons on the right · tap 1v1 to play a bot'):L('J ném · K layup · L úp rổ · Space đảo bóng · V solo 1v1 với bot · E thoát','J shoot · K layup · L dunk · Space crossover · V 1v1 vs bot · E leave'),4);}
function hpExit(){HP.on=false;{const H=P.H;H.armL.rotation.z=-.07;H.armR.rotation.z=.07;H.spine.rotation.z=0;}if(HP.bot){scene.remove(HP.bot.H.root);HP.bot=null;}HP.game=null;if(HP.ballMesh)HP.ballMesh.visible=false;HP.ball=null;hpUI(false);if(BB.board)BB.board.draw();P.H.root.position.y=P.y;}
function hpBallMesh(){if(!HP.ballMesh){HP.ballMesh=new T.Mesh(new T.SphereGeometry(.12,20,16),BBM.ball);HP.ballMesh.castShadow=true;scene.add(HP.ballMesh);}HP.ballMesh.visible=true;return HP.ballMesh;}
// ---- 1v1 ----
function hp1v1(){if(!HP.on)return;if(HP.game){showPrompt(L('Đang solo rồi','Already playing'),1);return;}
  if(!HP.bot){const look=Object.assign(randomLook('ped'),{female:false,shirt:'#d62828',sleeve:false,longSleeve:false,jacket:null,pants:'#1b1b1b',shoes:'#f4f4f4',cap:null,skirt:false,hairStyle:pick(['buzz','short','bald'])});
    const H=makeHuman(look);HP.bot=hpActor(H,true);HP.bot.name=pick(['Bot Tuấn','Bot Khang','Bot Long','Bot Minh']);}
  HP.game={sc:[0,0],to:11,poss:0,clear:false,pause:0,shots:0};hpReset(0);banner('SOLO 1V1',L(`Bạn đấu với ${HP.bot.name} · ai tới 11 điểm trước thắng · bóng ném trúng ngoài vạch = 3 điểm`,`You vs ${HP.bot.name} · first to 11 · shots beyond the arc count 3`),4);}
function hpReset(poss){const g=HP.game;g.poss=poss;g.clear=false;const off=poss===0?HP.PA:HP.bot,def=poss===0?HP.bot:HP.PA;const t=hpTop(8.2),d=hpTop(4.6);
  off.x=t.x;off.z=t.z+rnd(-1.5,1.5);def.x=d.x;def.z=off.z*.5+d.z*.5;for(const a of[off,def]){a.act=null;a.y=hpFloor();a.vy=0;a.jy=0;a.stun=0;}
  if(off===HP.PA||def===HP.PA){P.x=HP.PA.x;P.z=HP.PA.z;}HP.ball={st:'held',owner:off,x:off.x,y:1,z:off.z,vx:0,vy:0,vz:0,spin:0};hpFace(off,HP.hoop);hpFace(def,off);if(BB.board)BB.board.draw();}
function hpFace(a,t){a.h=Math.atan2(t.x-a.x,t.z-a.z);}
// ---- input ----
function hpKey(k){if(!HP.on)return false;const A=HP.PA,b=HP.ball;if(!b)return false;
  if(k==='e'||k==='q'){hpExit();return true;}
  if(k==='1v1'||k==='v'){hp1v1();return true;}
  if(A.act&&A.act.k!=='cross')return true;
  const mine=b.st==='held'&&b.owner===A;
  if(mine){if(k==='j')hpStart(A,'shot');else if(k==='k')hpStart(A,dRim(A)<5.2?'layup':'shot');else if(k==='l'){if(dRim(A)<3.8)hpStart(A,'dunk');else showPrompt(L('Lại gần rổ hơn để úp (dưới 3,8 m)','Get closer to dunk (under 3.8 m)'),1.3);}else if(k===' ')hpStart(A,'cross');else return false;return true;}
  if(k==='j')hpStart(A,'steal');else if(k==='k'||k==='l'||k===' ')hpStart(A,'block');else return false;return true;}
// ---- actions ----
const ACT={shot:1.05,layup:1.05,dunk:1.55,cross:.36,steal:.5,block:.85};
function hpStart(A,k){if(A.act||A.stun>0)return;const b=HP.ball;if((k==='shot'||k==='layup'||k==='dunk'||k==='cross')&&!(b.st==='held'&&b.owner===A))return;
  A.act={k,t:0,dur:ACT[k],rel:false,sx:A.x,sz:A.z};if(k==='cross'){A.act.dir=-A.hand;sfx('swing');}if(k==='steal'||k==='block')sfx('swing');
  if(k==='shot'||k==='layup'||k==='dunk'){hpFace(A,HP.hoop);const g=HP.game;A.act.d=dRim(A);if(g&&g.clear&&g.poss===(A.isBot?1:0)){A.act.noCount=true;}}
  // defender reaction to a shot
  const other=A===HP.PA?HP.bot:HP.PA;if(other&&other.isBot&&(k==='shot'||k==='layup'||k==='dunk')&&hyp(other.x-A.x,other.z-A.z)<2.8&&!other.act&&other.stun<=0)setTimeout(()=>{if(HP.on&&HP.bot===other&&!other.act)hpStart(other,'block');},rnd(90,220));}
function hpLerp(a,b,k){return a+(b-a)*k;}
const sm=x=>x<0?0:x>1?1:x*x*(3-2*x);
function hpActUpdate(A,dt){const a=A.act;if(!a)return;a.t+=dt;const u=a.t/a.dur,h=HP.hoop;
  if(a.k==='shot'){A.jy=a.t>.22&&a.t<.92?Math.sin(Math.PI*(a.t-.22)/.7)*.52:0;if(!a.rel&&a.t>=.5){a.rel=true;hpRelease(A,'shot');}}
  else if(a.k==='layup'){if(a.t<.45){const tx=h.x+h.s*1.1,tz=h.z+(A.z>h.z?.6:-.6),dx=tx-A.x,dz=tz-A.z,d=hyp(dx,dz);if(d>.2){const s=Math.min(d,dt*6.2);A.x+=dx/d*s;A.z+=dz/d*s;}A.h=lerpA(A.h,Math.atan2(h.x-A.x,h.z-A.z),dt*10);}
    A.jy=a.t>.45&&a.t<1?Math.sin(Math.PI*(a.t-.45)/.55)*.78:0;if(!a.rel&&a.t>=.7){a.rel=true;hpRelease(A,'layup');}}
  else if(a.k==='dunk'){if(a.t<.42){const tx=h.x+h.s*.55,tz=h.z,dx=tx-A.x,dz=tz-A.z,d=hyp(dx,dz);if(d>.1){const s=Math.min(d,dt*Math.max(6,d/.4*1.2));A.x+=dx/d*s;A.z+=dz/d*s;}hpFace(A,h);}
    A.jy=a.t<.42?0:a.t<.78?sm((a.t-.42)/.36)*1.18:a.t<1.18?1.12-Math.sin((a.t-.78)*9)*.03:Math.max(0,1.12*(1-sm((a.t-1.18)/.3)));
    if(!a.rel&&a.t>=.8){a.rel=true;hpRelease(A,'dunk');cam.shake=Math.max(cam.shake,.12);}}
  else if(a.k==='cross'){const side=a.dir,fx=Math.cos(A.h),fz=-Math.sin(A.h);if(a.t<.22){const s=dt*3.6;A.x+=fx*side*s;A.z+=fz*side*s;}if(!a.sw&&a.t>.17){a.sw=true;A.hand=side;}
    const o=A===HP.PA?HP.bot:HP.PA;if(!a.chk&&a.t>.2&&o&&!o.act&&hyp(o.x-A.x,o.z-A.z)<1.6){a.chk=true;if(Math.random()<(o.isBot?.33:.25)){o.stun=.9;showPrompt(o.isBot?L('Bẻ cổ chân!','Ankle breaker!'):L('Bị qua người!','Crossed over!'),1.2);}}}
  else if(a.k==='steal'){if(a.t<.18){A.x+=Math.sin(A.h)*dt*3;A.z+=Math.cos(A.h)*dt*3;}const b=HP.ball;if(!a.done&&a.t>.18){a.done=true;const o=b.owner;if(b.st==='held'&&o&&o!==A&&hyp(o.x-A.x,o.z-A.z)<1.35&&!(o.act&&o.act.k!=='cross')){if(Math.random()<(A.isBot?.3:.33)){hpGive(A,true);sfx('block');showPrompt(A.isBot?L('Bị cướp bóng!','Stolen!'):L('Cướp bóng!','Steal!'),1.2);}}}}
  else if(a.k==='block'){A.jy=a.t<.7?Math.sin(Math.PI*a.t/.7)*.58:0;}
  if(a.t>=a.dur){A.act=null;A.jy=0;A.cool=.15;}}
function hpGive(A,clear){const b=HP.ball;b.st='held';b.owner=A;b.vx=b.vy=b.vz=0;const g=HP.game;if(g){const np=A.isBot?1:0;if(np!==g.poss){g.poss=np;g.clear=!!clear;}}}
// ---- ball release, flight, rim and floor ----
function hpRelease(A,kind){const h=HP.hoop,b=HP.ball;const o=A===HP.PA?HP.bot:HP.PA,d=Math.max(.5,A.act.d||dRim(A));const hd=hpHand(A,1);
  let p=kind==='dunk'?.97:kind==='layup'?.86:clamp(.9-(d-1)*.072,.2,.88);let blocked=false;
  if(o){const dd=hyp(o.x-A.x,o.z-A.z),air=o.act&&o.act.k==='block'&&o.jy>.22;p*=dd<1.2?(kind==='dunk'?.9:.55):dd<2?.75:dd<3?.9:1;if(air&&dd<1.6&&Math.random()<(kind==='dunk'?.22:kind==='layup'?.35:.42))blocked=true;}
  if(!A.isBot&&!HP.game){p=Math.min(.95,p+.05);BB.taken++;}
  const make=!blocked&&Math.random()<p,pts=kind!=='dunk'&&kind!=='layup'&&d>6.75?3:2;b.st='air';b.owner=null;b.shooter=A;b.kind=kind;b.pts=pts;b.noCount=!!A.act.noCount;
  if(blocked){b.x=hd.x;b.y=hd.y;b.z=hd.z;const ang=Math.atan2(A.x-o.x,A.z-o.z);b.vx=Math.sin(ang)*rnd(3,5);b.vz=Math.cos(ang)*rnd(3,5);b.vy=rnd(1,2.5);b.st='loose';sfx('block');showPrompt(o.isBot?L('Bị chắn bóng!','Blocked!'):L('CHẮN BÓNG!','BLOCKED!'),1.3);return;}
  const miss=make?null:{x:rnd(-.25,.25),z:(Math.random()<.5?-1:1)*rnd(.22,.34)};
  b.fl={sx:hd.x,sy:hd.y,sz:hd.z,tx:h.x+(miss?miss.x:0),ty:h.y+(miss?.04:.03),tz:h.z+(miss?miss.z:0),t:0,T:kind==='dunk'?.12:kind==='layup'?.42:.62+d*.05,apex:kind==='dunk'?h.y+.2:kind==='layup'?h.y+.55:Math.max(hd.y,h.y)+.85+d*.12,make,miss};}
function hpHand(A,side){const e=side>0?A.H.elR:A.H.elL;e.updateWorldMatrix(true,false);const v=new T.Vector3(0,-.33,.06).applyMatrix4(e.matrixWorld);if(!(typeof v.x==='number'&&isFinite(v.x)))return{x:A.x+Math.sin(A.h)*.3,y:A.y+A.jy+1.9,z:A.z+Math.cos(A.h)*.3};return v;}
function hpBallUpdate(dt){const b=HP.ball,h=HP.hoop,m=hpBallMesh(),fl=hpFloor()+.12;
  if(b.st==='held'){const A=b.owner;if(A.act&&(A.act.k==='shot'||A.act.k==='layup'||A.act.k==='dunk')&&!A.act.rel){const p=hpHand(A,1),q=hpHand(A,-1);b.x=(p.x+q.x)/2;b.y=(p.y+q.y)/2+.04;b.z=(p.z+q.z)/2;if(A.act.k==='layup'){b.x=p.x;b.y=p.y+.08;b.z=p.z;}}
    else{// dribble: the ball bounces between the floor and the dribbling hand
      A.dph+=dt*(A.spd>3?11:8.5);const c=Math.abs(Math.cos(A.dph)),side=A.act&&A.act.k==='cross'?(1-2*sm(A.act.t/.3))*-A.act.dir:A.hand;const fx=Math.sin(A.h),fz=Math.cos(A.h),rx=Math.cos(A.h),rz=-Math.sin(A.h);
      const lead=A.spd>3?.55:.32,hx=A.x+fx*lead+rx*side*.3,hz=A.z+fz*lead+rz*side*.3,top=A.y+A.jy+.88;b.x=hx;b.z=hz;b.y=fl+(top-fl)*c;if(c<.12&&!b.down){b.down=true;sfx('bounce');}if(c>.5)b.down=false;}
    m.position.set(b.x,b.y,b.z);m.rotation.x+=dt*6;return;}
  if(b.st==='air'&&b.fl){const f=b.fl;f.t+=dt;const u=Math.min(1,f.t/f.T),x=f.sx+(f.tx-f.sx)*u,z=f.sz+(f.tz-f.sz)*u,y=(1-u)*(1-u)*f.sy+2*u*(1-u)*(2*f.apex-(f.sy+f.ty)/2)+u*u*f.ty;b.x=x;b.y=y;b.z=z;m.rotation.z-=dt*10;
    if(u>=1){b.fl=null;if(f.make){b.st='drop';b.dt=0;h.net.scale.set(1,1.3,1);sfx(b.kind==='dunk'?'heavy':'swish');hpScore(b);}else{if(!HP.game)BB.streak=0;b.st='loose';const out=Math.sign(f.miss.z)||1;b.vx=-h.s*rnd(.6,2.2);b.vy=rnd(1.8,3.4);b.vz=out*rnd(.8,2.4);sfx('rim');}}
    m.position.set(b.x,b.y,b.z);return;}
  if(b.st==='drop'){b.dt+=dt;h.net.scale.y+=(1-h.net.scale.y)*Math.min(1,dt*7);b.y-=dt*(1.6+b.dt*9.8);m.position.set(b.x,b.y,b.z);if(b.y<fl+.4){b.st='loose';b.vx=rnd(-.5,.5);b.vy=0;b.vz=rnd(-.5,.5);}return;}
  if(b.st==='loose'){b.vy-=9.8*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;if(b.y<fl){b.y=fl;if(Math.abs(b.vy)>1.3)sfx('bounce');b.vy=-b.vy*.66;b.vx*=.86;b.vz*=.86;}const f2=Math.exp(-.4*dt);b.vx*=f2;b.vz*=f2;
    // stay on the half court
    const xb=h.x-h.s*1.575,xm=xb+h.s*14;const lo=Math.min(xb,xm),hi=Math.max(xb,xm);if(b.x<lo||b.x>hi){b.vx=-b.vx*.5;b.x=clamp(b.x,lo,hi);}if(Math.abs(b.z-h.z)>7.5){b.vz=-b.vz*.5;b.z=clamp(b.z,h.z-7.5,h.z+7.5);}
    m.position.set(b.x,b.y,b.z);m.rotation.x+=b.vz*dt*3;m.rotation.z-=b.vx*dt*3;
    if(!HP.game&&b.y<fl+.3&&Math.hypot(b.vx,b.vz)<1.2){hpGive(HP.PA,false);}// practice: the ball comes back to you
    if(!(HP.game&&HP.game.pause>0))for(const A of[HP.PA,HP.bot])if(A&&!A.act&&A.stun<=0&&hyp(A.x-b.x,A.z-b.z)<.75&&b.y<1.7){const shooterTeam=b.shooter?(b.shooter.isBot?1:0):-1;hpGive(A,HP.game&&shooterTeam!==-1&&shooterTeam!==(A.isBot?1:0));break;}}}
function hpScore(b){const g=HP.game,A=b.shooter,pts=b.pts;
  if(!g){BB.made++;BB.streak++;BB.score+=pts;const cash=pts===3?25:b.kind==='dunk'?20:10;save.money+=cash;banner(b.kind==='dunk'?L('ÚP RỔ!','SLAM DUNK!'):pts===3?L('BA ĐIỂM!','THREE!'):L('VÀO!','BUCKET!'),`+${pts} · +${fmt$(cash)}`,1.3);if(BB.board)BB.board.draw();return;}
  if(b.noCount){showPrompt(L('Không tính: chưa ra ngoài vạch 3 điểm sau khi đổi bóng','No basket: take it beyond the arc after a change of possession'),2.2);g.pause=1;g.next=A.isBot?0:1;return;}
  const t=A.isBot?1:0;g.sc[t]+=pts;banner(A.isBot?`${HP.bot.name} +${pts}`:(b.kind==='dunk'?L('ÚP RỔ!','SLAM DUNK!'):pts===3?L('BA ĐIỂM!','THREE!'):L('VÀO!','BUCKET!'))+` +${pts}`,`${L('Bạn','You')} ${g.sc[0]} - ${g.sc[1]} ${HP.bot.name}`,1.6);if(BB.board)BB.board.draw();
  if(g.sc[t]>=g.to){g.over=t===0?'win':'lose';g.endT=1;g.pause=99;return;}
  g.pause=1.1;g.next=t===0?1:0;}
// ---- bot brain ----
function hpBot(dt){const B=HP.bot,A=HP.PA,b=HP.ball,h=HP.hoop,g=HP.game;if(!B)return;B.cool-=dt;
  if(B.stun>0){B.stun-=dt;B.spd=0;return;}
  if(B.act)return;let tx=B.x,tz=B.z,sp=0;
  if(b.st==='held'&&b.owner===B){// offence
    const d=dRim(B),gap=hyp(A.x-B.x,A.z-B.z);B.think=(B.think||0)-dt;
    if(g&&g.clear){if(d<7.3){const o=hpTop(8);tx=o.x;tz=B.z;sp=5;}else g.clear=false;}
    else{if(B.think<=0){B.think=rnd(.35,.7);if(d<2.6){hpStart(B,Math.random()<.4?'dunk':'layup');return;}if(d<7.4&&gap>1.9&&Math.random()<.45){hpStart(B,'shot');return;}if(gap<1.3&&Math.random()<.3){hpStart(B,'cross');return;}if(d<4.6&&Math.random()<.5){hpStart(B,Math.random()<.3?'dunk':'layup');return;}if(d<6.2&&Math.random()<.18){hpStart(B,'shot');return;}}
      const side=(B.z>h.z?1:-1)*(gap<1.5?1.6:.6);tx=h.x+h.s*1.4;tz=h.z+side;sp=4.9;}}
  else if(b.st==='held'&&b.owner===A){// defence: stay between the player and the rim
    const dx=h.x-A.x,dz=h.z-A.z,d=hyp(dx,dz)||1;tx=A.x+dx/d*1.15;tz=A.z+dz/d*1.15;sp=5.4;hpFace(B,A);
    if(hyp(A.x-B.x,A.z-B.z)<1.15&&B.cool<=0&&Math.random()<dt*.55&&!(A.act&&A.act.k==='cross')){hpStart(B,'steal');B.cool=1.2;return;}}
  else{tx=b.x;tz=b.z;sp=5.8;}
  const dx=tx-B.x,dz=tz-B.z,d=hyp(dx,dz);if(d>.12){const s=Math.min(d,sp*dt);B.x+=dx/d*s;B.z+=dz/d*s;B.spd=sp*Math.min(1,d/.5);if(!(b.owner===A&&b.st==='held'))B.h=lerpA(B.h,Math.atan2(dx,dz),1-Math.exp(-10*dt));}else B.spd=0;
  if(b.st==='held'&&b.owner===A)hpFace(B,A);}
// ---- poses: blended on top of the walk/run cycle ----
function hpPose(A,dt){const H=A.H,a=A.act,hasBall=HP.ball&&HP.ball.st==='held'&&HP.ball.owner===A,k=1-Math.exp(-dt*22);
  const set=(o,ax,v)=>{o.rotation[ax]=hpLerp(o.rotation[ax],v,k);};
  // athletic stance: bent knees, low hips, slight lean
  const low=A.spd<3?1:.5;H.legL.rotation.x-=.32*low;H.legR.rotation.x-=.32*low;H.knL.rotation.x+=.55*low;H.knR.rotation.x+=.55*low;H.hips.position.y-=.1*low;H.spine.rotation.x+=.14;
  if(!a){if(hasBall){const c=Math.abs(Math.cos(A.dph)),dr=A.hand>0?H.armR:H.armL,de=A.hand>0?H.elR:H.elL,ot=A.hand>0?H.armL:H.armR,oe=A.hand>0?H.elL:H.elR;
      dr.rotation.x=-.45-.25*c;de.rotation.x=-.75+.45*(1-c);dr.rotation.z=A.hand*.18;ot.rotation.x=-.75;oe.rotation.x=-1.25;ot.rotation.z=-A.hand*.35;}
    else{// defensive slide: arms out wide
      H.armL.rotation.x=-.55;H.armR.rotation.x=-.55;H.armL.rotation.z=-.85;H.armR.rotation.z=.85;H.elL.rotation.x=-.5;H.elR.rotation.x=-.5;H.hips.position.y-=.05;}
    return;}
  const t=a.t;H.armL.rotation.z=-.07;H.armR.rotation.z=.07;
  if(a.k==='shot'){const g=sm(t/.22),rise=sm((t-.22)/.28),fol=t>.5?1:0;
    H.knL.rotation.x+=.6*g*(1-rise);H.knR.rotation.x+=.6*g*(1-rise);H.legL.rotation.x-=.35*g*(1-rise);H.legR.rotation.x-=.35*g*(1-rise);H.hips.position.y-=.12*g*(1-rise);
    if(A.jy>.05){H.knL.rotation.x=.35;H.knR.rotation.x=.25;H.legL.rotation.x=-.15;H.legR.rotation.x=.05;}
    H.armR.rotation.x=hpLerp(-1.2,-2.85,rise);H.elR.rotation.x=fol?hpLerp(-1.4,-.05,sm((t-.5)/.1)):hpLerp(-1.6,-1.4,rise);H.armL.rotation.x=hpLerp(-1.2,-2.5,rise)*(fol?1-sm((t-.5)/.2)*.5:1);H.elL.rotation.x=hpLerp(-1.6,-1.1,rise);H.armL.rotation.z=-.25*rise;H.spine.rotation.x=.05;}
  else if(a.k==='layup'){const air=t>.45;if(!air){const s=Math.sin(t*16);H.legL.rotation.x=s*.8;H.legR.rotation.x=-s*.8;H.knL.rotation.x=.5+Math.max(0,-s);H.knR.rotation.x=.5+Math.max(0,s);H.armR.rotation.x=-1.1;H.elR.rotation.x=-1.4;H.armL.rotation.x=-1.1;H.elL.rotation.x=-1.4;}
    else{const r=sm((t-.45)/.25);H.legL.rotation.x=-1.35*r;H.knL.rotation.x=1.5*r;H.legR.rotation.x=.25;H.knR.rotation.x=.2;H.armR.rotation.x=hpLerp(-1.1,-3.0,r);H.elR.rotation.x=hpLerp(-1.4,-.15,r);H.armL.rotation.x=-1.2;H.elL.rotation.x=-1.2;H.armL.rotation.z=-.4;H.spine.rotation.x=-.05;}}
  else if(a.k==='dunk'){if(t<.42){const s=Math.sin(t*20);H.legL.rotation.x=s*.9;H.legR.rotation.x=-s*.9;H.knL.rotation.x=.4+Math.max(0,-s)*1.2;H.knR.rotation.x=.4+Math.max(0,s)*1.2;H.armL.rotation.x=H.armR.rotation.x=-1;H.elL.rotation.x=H.elR.rotation.x=-1.3;H.spine.rotation.x=.3;}
    else if(t<.8){const r=sm((t-.42)/.3);H.armL.rotation.x=H.armR.rotation.x=hpLerp(-1,-3.05,r);H.elL.rotation.x=H.elR.rotation.x=hpLerp(-1.3,-.35,r);H.knL.rotation.x=H.knR.rotation.x=hpLerp(1.2,.6,r);H.legL.rotation.x=H.legR.rotation.x=-.4;H.spine.rotation.x=-.1;}
    else if(t<1.18){const sw=Math.sin((t-.8)*10)*.15;H.armL.rotation.x=H.armR.rotation.x=-2.95;H.elL.rotation.x=H.elR.rotation.x=-.15;H.armL.rotation.z=-.25;H.armR.rotation.z=.25;H.legL.rotation.x=H.legR.rotation.x=.25+sw;H.knL.rotation.x=H.knR.rotation.x=.5;H.spine.rotation.x=-.12+sw*.5;}
    else{const r=sm((t-1.18)/.3);H.armL.rotation.x=H.armR.rotation.x=hpLerp(-2.9,-.4,r);H.elL.rotation.x=H.elR.rotation.x=-.4;H.knL.rotation.x=H.knR.rotation.x=hpLerp(.5,.9,r);H.legL.rotation.x=H.legR.rotation.x=-.45*r;H.hips.position.y-=.12*r;}}
  else if(a.k==='cross'){const c=1-2*sm(t/.3);const dr=H.armR,dl=H.armL;dr.rotation.x=-.5;dl.rotation.x=-.5;H.elR.rotation.x=-.6;H.elL.rotation.x=-.6;H.armR.rotation.z=.1+(c<0?.4:0);H.armL.rotation.z=-.1-(c>0?.4:0);H.spine.rotation.z=-a.dir*.18*Math.sin(Math.PI*t/.36);H.hips.position.y-=.08;H.spine.rotation.x+=.12;}
  else if(a.k==='steal'){const r=Math.sin(Math.PI*Math.min(1,t/.4));H.armR.rotation.x=-1.45*r-.3;H.elR.rotation.x=-.2;H.spine.rotation.x+=.35*r;H.legL.rotation.x=-.7*r;H.knL.rotation.x=.9*r;}
  else if(a.k==='block'){const r=sm(t/.25);H.armL.rotation.x=H.armR.rotation.x=hpLerp(-.6,-3.05,r);H.elL.rotation.x=H.elR.rotation.x=-.1;H.armL.rotation.z=-.15;H.armR.rotation.z=.15;H.knL.rotation.x=A.jy>.05?.3:.8;H.knR.rotation.x=A.jy>.05?.3:.8;}}
// ---- per-frame ----
function hpPlayer(dt,fwd,side,sprint){const A=HP.PA;P.H.guard=0;P.H.hold=0;P.H.aim=0;A.x=P.x;A.z=P.z;A.y=P.y;A.h=P.h;
  if(A.stun>0){A.stun-=dt;fwd=side=0;}
  const locked=A.act&&A.act.k!=='cross'&&A.act.k!=='steal';let spd=0;
  if(!locked){const y=cam.yaw,fx=Math.sin(y),fz=Math.cos(y),rx=-Math.cos(y),rz=Math.sin(y);let mx=fx*fwd+rx*side,mz=fz*fwd+rz*side;const n=hyp(mx,mz);
    if(n>.05){const def=!(HP.ball.st==='held'&&HP.ball.owner===A);spd=(sprint?6.6:4.4)*Math.min(1,n);mx/=n;mz/=n;A.x+=mx*spd*dt;A.z+=mz*spd*dt;
      if(def&&HP.bot)hpFace(A,HP.ball.owner&&HP.ball.st==='held'?HP.ball.owner:HP.ball);else A.h=lerpA(A.h,Math.atan2(mx,mz),1-Math.exp(-12*dt));}}
  A.spd=spd;hpActUpdate(A,dt);const p=resolve(A.x,A.z,.38);if(p){A.x+=p[0];A.z+=p[1];}hpClamp(A);
  if(HP.bot){const B=HP.bot,dx=A.x-B.x,dz=A.z-B.z,d=hyp(dx,dz);if(d<.72&&d>1e-3){const o=(.72-d)/2;A.x+=dx/d*o;A.z+=dz/d*o;B.x-=dx/d*o;B.z-=dz/d*o;}}
  P.x=A.x;P.z=A.z;P.h=A.h;P.moving=spd;P.y=hpFloor()+(P.inside?0:0);
  P.H.root.position.set(P.x,P.y+A.jy,P.z);P.H.root.rotation.y=P.h;animHuman(P.H,dt,A.act?0:spd,time);hpPose(A,dt);}
function bbUpdate(dt){if(!HP.on)return;const h=HP.hoop;
  if(P.car||P.koT>0||(h.inside||null)!==(P.inside||null)||hyp(P.x-h.x,P.z-h.z)>26){hpExit();return;}
  const g=HP.game;if(g&&g.over){g.endT-=dt;if(g.endT<=0){const win=g.over==='win';banner(win?L('BẠN THẮNG!','YOU WIN!'):L('BẠN THUA','YOU LOST'),`${g.sc[0]} - ${g.sc[1]}`+(win?' · +$500':''),4);if(win){save.money+=500;sfx('cash');writeSave();}HP.game=null;if(HP.bot){scene.remove(HP.bot.H.root);HP.bot=null;}hpGive(HP.PA,false);if(BB.board)BB.board.draw();}}
  if(g&&g.clear&&HP.ball.st==='held'&&HP.ball.owner&&dRim(HP.ball.owner)>6.9)g.clear=false;if(g&&g.pause>0){g.pause-=dt;if(g.pause<=0&&g.next!=null){const n=g.next;g.next=null;hpReset(n);}}
  if(HP.bot){const B=HP.bot;hpBot(dt);hpActUpdate(B,dt);hpClamp(B);B.y=hpFloor();B.H.root.position.set(B.x,B.y+B.jy,B.z);B.H.root.rotation.y=B.h;animHuman(B.H,dt,B.act?0:B.spd,time);hpPose(B,dt);}
  hpBallUpdate(dt);hpUIUpdate();}
// ---- on-screen buttons ----
function hpUI(show){if(!HP.ui){const d=document.createElement('div');d.className='nc-hp';d.innerHTML='<div class="nc-hp-sc"></div><div class="nc-hp-b"></div>';root.appendChild(d);HP.ui=d;
    d.querySelector('.nc-hp-b').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-hk]');if(!b)return;e.preventDefault();e.stopPropagation();hpKey(b.dataset.hk);});}
  HP.ui.hidden=!show;HP.uiKey='';}
function hpUIUpdate(){if(!HP.ui)return;const A=HP.PA,b=HP.ball,mine=b&&b.st==='held'&&b.owner===A,g=HP.game;const key=[mine,!!g,g&&g.sc.join('-'),g&&g.clear,dRim(A)<3.8].join('|');if(key===HP.uiKey)return;HP.uiKey=key;
  const B=(k,l,s)=>`<button type="button" data-hk="${k}"><b>${l}</b>${MOBILE?'':`<kbd>${s}</kbd>`}</button>`;
  HP.ui.querySelector('.nc-hp-b').innerHTML=(mine?B('j',L('Ném','Shoot'),'J')+B('k',L('Layup','Layup'),'K')+B('l',L('Úp rổ','Dunk'),'L')+B(' ',L('Đảo bóng','Crossover'),'Space'):B('j',L('Cướp bóng','Steal'),'J')+B('k',L('Chắn bóng','Block'),'K'))+(g?'':B('1v1',L('Solo 1v1','1v1 bot'),'V'))+B('e',L('Thoát','Leave'),'E');
  HP.ui.querySelector('.nc-hp-sc').innerHTML=g?`<span>${L('Bạn','You')} <b>${g.sc[0]}</b></span><i>${L('tới','to')} ${g.to}</i><span><b>${g.sc[1]}</b> ${HP.bot?HP.bot.name:'Bot'}</span>${g.clear?`<em>${g.poss===0?L('Đưa bóng ra ngoài vạch 3 điểm','Take it beyond the arc'):L('Bot đang đưa bóng ra ngoài','Bot is clearing the ball')}</em>`:''}`:`<em>${L('Tập ném','Practice')} · ${BB.made}/${BB.taken}</em>`;}

/* ================= SHOPS 2: 24h store, barber, nail salon · store robberies · NEXUS MALL (3 floors, escalators, elevator) · a door on every building =================
   Robbery: walk to any shop counter and press X (or aim a gun at the cashier). With a gun the cashier puts his hands up and fills a bag;
   barehanded you knock him out and empty the till. Then crack the safe in the back: the dial spins, the door swings open and the cash flies out. */
const MALL={X:6300,Z:0,lv:0,ramp:null,Y:[0,6,12]};
function lvOK(c){if(c.off)return false;if(c.lv===undefined)return true;if(typeof c.lv==='string')return MALL.ramp===c.lv;return !MALL.ramp&&MALL.lv===c.lv;}
function mcol(x0,x1,z0,z1,y0,y1,lv){return addCol({t:'b',x0,x1,z0,z1,h:y1,y0,lv});}
ITX.mglass={c:'#bfe3ef',r:.05};IMAT.mglass=new T.MeshStandardMaterial({color:lin('#cfeaf3'),roughness:.04,metalness:.2,transparent:true,opacity:.22,depthWrite:false,envMapIntensity:1.2});
ITX.pinkW={map:plasterTex('#f6dbe4'),r:.85};ITX.mallTile={map:tileTex('#c9c1b4','#8f877b',2,4),r:.22};ITX.sage={map:plasterTex('#d9e4d6'),r:.85};ITX.navy={c:'#22324a',r:.6};ITX.leather={c:'#7a1f24',r:.45};ITX.oakDk={map:plankTex('#7a5232','#3a2412'),r:.5};
/* a unit frame: u runs along the shop front, v from the front (0) to the back (D); h = the direction the front faces */
function UF(x0,x1,z0,z1,front){const f={front};
  if(front==='z1'){f.W=x1-x0;f.D=z1-z0;f.p=(u,v)=>[x0+u,z1-v];f.h=0;}
  else if(front==='z0'){f.W=x1-x0;f.D=z1-z0;f.p=(u,v)=>[x1-u,z0+v];f.h=Math.PI;}
  else if(front==='x1'){f.W=z1-z0;f.D=x1-x0;f.p=(u,v)=>[x1-v,z1-u];f.h=Math.PI/2;}
  else{f.W=z1-z0;f.D=x1-x0;f.p=(u,v)=>[x0+v,z0+u];f.h=-Math.PI/2;}
  f.r=(u0,u1,v0,v1)=>{const a=f.p(u0,v0),b=f.p(u1,v1);return[Math.min(a[0],b[0]),Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[1],b[1])];};return f;}
function ubox(F,k,u0,u1,y0,y1,v0,v1,o){const[a,b,c,d]=F.r(u0,u1,v0,v1);if(k[0]==='#')ibox(a,b,y0,y1,c,d,k);else itb(k,a,b,y0,y1,c,d,o&&o.ts?{ts:o.ts}:undefined);if(o&&o.col)mcol(a,b,c,d,y0,y1,o.lv);}
function ucyl(F,k,u,v,y0,y1,r0,r1,seg){const[x,z]=F.p(u,v);cyl(k,x,y0,y1,z,r0,r1,seg);}
/* ---------- safe ---------- */
const SAFE_M={body:new T.MeshStandardMaterial({color:lin('#30353c'),roughness:.32,metalness:.85}),door:new T.MeshStandardMaterial({color:lin('#454b54'),roughness:.28,metalness:.9}),
  chrome:new T.MeshStandardMaterial({color:lin('#e9edf1'),roughness:.12,metalness:1}),gold:new T.MeshStandardMaterial({color:lin('#e0b04a'),roughness:.22,metalness:1,emissive:lin('#5a3c08'),emissiveIntensity:.6}),
  cash:new T.MeshStandardMaterial({color:lin('#5a9e62'),roughness:.85}),band:new T.MeshStandardMaterial({color:lin('#f3e6c2'),roughness:.8}),inner:new T.MeshStandardMaterial({color:lin('#15171a'),roughness:.9}),
  bag:new T.MeshStandardMaterial({color:lin('#2b2b2b'),roughness:.9}),red:new T.MeshBasicMaterial({color:0xff2a2a,toneMapped:false})};
function makeSafe(x,y,z,h){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=h;scene.add(g);const W=.92,H=1.08,D=.78,t=.07;
  // merged parts: one mesh per material so a safe costs a handful of draw calls
  const parts={};const bx=(k,w,hh,d,px,py,pz,rz)=>{const b=new T.BoxGeometry(w,hh,d);if(rz)b.rotateZ(rz);b.translate(px,py,pz);(parts[k]||(parts[k]=[])).push(b);};
  const flush=(par,k,m)=>{if(!parts[k])return null;const me=new T.Mesh(mergeGeos(parts[k]),m);me.castShadow=me.receiveShadow=Q.shadows;par.add(me);parts[k]=null;return me;};
  bx('b',W,H,t,0,H/2,-D/2+t/2);bx('b',t,H,D,-W/2+t/2,H/2,0);bx('b',t,H,D,W/2-t/2,H/2,0);bx('b',W,t,D,0,H-t/2,0);bx('b',W,.14,D,0,.07,0);bx('b',W-2*t,.03,D-t-.04,0,H*.52,-.02);flush(g,'b',SAFE_M.body);
  bx('i',W-2*t,H-.2,.01,0,H/2,-D/2+t+.01);flush(g,'i',SAFE_M.inner);
  const loot=[];for(let i=0;i<3;i++)for(let j=0;j<2;j++){const p=new T.Vector3(-.25+i*.25,H*.52+.05+j*.075,-.05);bx('c',.2,.07,.11,p.x,p.y,p.z);bx('n',.04,.075,.115,p.x,p.y,p.z);loot.push({p,m:SAFE_M.cash});}
  for(let i=0;i<3;i++){const p=new T.Vector3(-.27+i*.27,.18,0);bx('g',.24,.07,.11,p.x,p.y,p.z);loot.push({p,m:SAFE_M.gold});}
  const lootM=[flush(g,'c',SAFE_M.cash),flush(g,'n',SAFE_M.band),flush(g,'g',SAFE_M.gold)];
  const piv=new T.Group();piv.position.set(-W/2,0,D/2);g.add(piv);bx('d',W,H,.08,W/2,H/2,.04);bx('d',W*.8,H*.8,.02,W/2,H/2,.085);flush(piv,'d',SAFE_M.door);
  for(let k=0;k<3;k++)bx('s',.024,.26,.024,W*.5,H*.32,.12,k*Math.PI/3);flush(piv,'s',SAFE_M.chrome);
  const dg=new T.Group();dg.position.set(W*.5,H*.6,.1);piv.add(dg);const dial=new T.Mesh(new T.CylinderGeometry(.12,.12,.05,28),SAFE_M.chrome);dial.rotation.x=Math.PI/2;dg.add(dial);const tk=new T.Mesh(new T.BoxGeometry(.02,.07,.02),SAFE_M.gold);tk.position.set(0,.085,.03);dg.add(tk);
  const led=new T.Mesh(new T.BoxGeometry(.05,.05,.02),SAFE_M.red);led.position.set(W*.85,H*.85,.09);piv.add(led);
  return{g,piv,dg,loot,lootM,led};}
/* ---------- robbable shops ---------- */
const ROBS=[],EXTRA_ACTS=[];let ROB=null,robLast=null,robAim=0;
function robReg(o){const r=Object.assign({st:'idle',t:0,cool:0,y:0,pay:[160,420],spay:[700,1800]},o);ROBS.push(r);return r;}
function robNear(){if(!P.inside||P.car)return null;let best=null,bd=1e9;for(const r of ROBS){if(r.room!==P.inside||Math.abs((r.y||0)-P.y)>2.2)continue;const d=hyp(P.x-r.cx,P.z-r.cz);if(d<bd){bd=d;best=r;}}return best?{r:best,d:bd}:null;}
function robPose(r,k){const H=r.cash;if(!H)return;if(k==='rest'){H.root.rotation.x=0;H.root.position.y=r.y;H.armL.rotation.set(-.08,0,-.07);H.armR.rotation.set(-.08,0,.07);H.elL.rotation.x=H.elR.rotation.x=-.2;H.spine.rotation.x=0;H.head.rotation.x=0;}
  else if(k==='up'){H.armL.rotation.set(-2.95,0,-.25);H.armR.rotation.set(-2.95,0,.25);H.elL.rotation.x=H.elR.rotation.x=-.15;}}
function robReset(r){r.st='idle';r.t=0;robPose(r,'rest');if(r.safe){r.safe.piv.rotation.y=0;for(const m of r.safe.lootM)if(m)m.visible=true;r.safe.led.material=SAFE_M.red;}if(r.bag)r.bag.visible=false;}
function robAlarm(){const a=sfxAC;if(!a||!active)return;const t=a.currentTime;for(let i=0;i<6;i++){const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.setValueAtTime(i%2?880:660,t+i*.22);g.gain.setValueAtTime(.0001,t+i*.22);g.gain.linearRampToValueAtTime(.07,t+i*.22+.02);g.gain.linearRampToValueAtTime(.0001,t+i*.22+.2);o.connect(g);g.connect(a.out);o.start(t+i*.22);o.stop(t+i*.22+.22);}}
function robClick(f){const a=sfxAC;if(!a||!active)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=f||rnd(1500,2100);g.gain.setValueAtTime(.06,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);o.connect(g);g.connect(a.out);o.start(t);o.stop(t+.06);}
function robDing(){const a=sfxAC;if(!a||!active)return;const t=a.currentTime;for(const[f,d]of[[988,0],[1319,.16]]){const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t+d);g.gain.linearRampToValueAtTime(.12,t+d+.02);g.gain.exponentialRampToValueAtTime(.001,t+d+.9);o.connect(g);g.connect(a.out);o.start(t+d);o.stop(t+d+1);}}
const FLY=[];
function robFly(from,amount,mat){if(amount){save.money+=amount;writeSave();}const m=new T.Mesh(new T.BoxGeometry(.2,.07,.11),mat||SAFE_M.cash);m.position.copy(from);scene.add(m);FLY.push({m,a:from.clone(),t:0,amount});}
function flyUpdate(dt){for(let i=FLY.length-1;i>=0;i--){const f=FLY[i];f.t+=dt/.55;const k=Math.min(1,f.t),b=new T.Vector3(P.x,P.y+1.2,P.z);f.m.position.lerpVectors(f.a,b,k);f.m.position.y+=Math.sin(k*Math.PI)*.9;f.m.rotation.x+=dt*14;f.m.rotation.y+=dt*9;
    if(k>=1){scene.remove(f.m);f.m.geometry.dispose();FLY.splice(i,1);if(f.amount)sfx('cash');}}}
let robUI=null;
function robUIEl(){if(robUI)return robUI;const d=document.createElement('div');d.className='nc-rob';
  d.innerHTML='<style>.nc-rob .rb{position:absolute;left:50%;top:62%;transform:translateX(-50%);width:min(380px,74vw);text-align:center;font:700 14px Inter,sans-serif;color:#fff;text-shadow:0 1px 3px #000}.nc-rob .rb div{height:11px;border-radius:6px;background:rgba(0,0,0,.6);margin-top:7px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.15)}.nc-rob .rb i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff3b47,#ffd166)}'
    +'.nc-rob .rbtn{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);pointer-events:auto;background:#d62828;color:#fff;border:0;border-radius:999px;padding:10px 20px 10px 12px;font:800 15px Inter,sans-serif;box-shadow:0 6px 20px rgba(214,40,40,.45);cursor:pointer;display:flex;gap:9px;align-items:center}.nc-rob .rbtn kbd{background:#fff;color:#d62828;border-radius:6px;padding:2px 7px;font:800 13px Inter,sans-serif}'
    +'.nc-rob .rflash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle,rgba(255,40,40,0) 40%,rgba(255,40,40,.35));opacity:0;transition:opacity .25s}.nc-rob .rflash.on{opacity:1}</style>'
    +'<div class="rflash"></div><div class="rb" hidden><b></b><div><i></i></div></div><button type="button" class="rbtn" hidden><kbd>X</kbd><span></span></button>';
  hudEl.appendChild(d);const b=d.querySelector('.rbtn');b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();sfxInit();robKey();});if(MOBILE)b.querySelector('kbd').remove();
  robUI={bar:d.querySelector('.rb'),barT:d.querySelector('.rb b'),barI:d.querySelector('.rb i'),btn:b,btnT:b.querySelector('span'),flash:d.querySelector('.rflash')};return robUI;}
function robStart(r,armed){if(Date.now()<r.cool){showPrompt(L('Tiệm vừa bị cướp · quay lại sau ','This store was just robbed · come back in ')+Math.ceil((r.cool-Date.now())/60000)+L(' phút',' min'),2);return;}
  if(ROB&&ROB!==r)return;ROB=r;r.armed=armed;r.st=armed?'hold':'fight';r.t=0;r.hit=0;P.h=Math.atan2(r.cash.root.position.x-P.x,r.cash.root.position.z-P.z);cam.shake=.18;robAlarm();crime(2,true);
  const u=robUIEl();u.flash.classList.add('on');setTimeout(()=>u.flash.classList.remove('on'),900);
  banner(L('CƯỚP TIỆM!','STICK-UP!'),armed?L('Chĩa súng · thu ngân đang bỏ tiền vào túi','Gun out · the cashier is filling a bag'):L('Hạ gục thu ngân rồi vét quầy tiền','Knock the cashier out and empty the till'),2.6);}
function robKey(){const n=robNear();if(!n)return;const r=n.r;if(r.st==='idle'&&n.d<3.4)robStart(r,P.weapon!=='fist'&&!!save.weapons[P.weapon]);
  else if(r.st==='regdone'&&r.safe&&hyp(P.x-r.sx,P.z-r.sz)<2.2)robCrack(r);}
function robCrack(r){if(r.st!=='regdone')return;r.st='crack';r.t=0;r.ck=0;P.h=Math.atan2(r.safe.g.position.x-P.x,r.safe.g.position.z-P.z);showPrompt(L('Đang dò mã két...','Cracking the combination...'),1.4);}
function robOption(){const n=robNear();if(!n)return null;const r=n.r;
  if(r.st==='regdone'&&r.safe&&hyp(P.x-r.sx,P.z-r.sz)<2.2)return{k:'E',txt:L('Phá két sắt','Crack the safe'),fn:()=>robCrack(r)};
  if(r.st==='crack'||r.st==='open')return{k:'E',txt:L('Đang phá két...','Cracking the safe...'),fn:()=>{}};return null;}
function robDecor(o){const n=robNear();if(n&&n.r.st==='idle'&&n.d<3.4&&!MOBILE)o.txt+=' · X: '+L('cướp tiệm','rob the store');return o;}
function robTick(dt){const u=robUI||(hudEl?robUIEl():null);if(!u)return;
  if(robLast!==P.inside){robLast=P.inside;for(const r of ROBS)if(r.room===P.inside&&r.st!=='idle'&&(r.st!=='done'||Date.now()>=r.cool))robReset(r);if(ROB&&ROB.room!==P.inside){if(ROB.st!=='done'&&ROB.st!=='regdone')robReset(ROB);ROB=null;}}
  const n=robNear();
  // gun pointed at the cashier for half a second starts a robbery too
  if(!ROB&&n&&n.r.st==='idle'&&n.d<5&&P.aiming&&Date.now()>=n.r.cool){const c=n.r.cash.root.position;if(Math.abs(angD(Math.atan2(c.x-P.x,c.z-P.z),cam.yaw))<.32){robAim+=dt;if(robAim>.5){robAim=0;robStart(n.r,true);}}else robAim=0;}else robAim=0;
  const showBtn=n&&((n.r.st==='idle'&&n.d<3.4&&Date.now()>=n.r.cool)||(n.r.st==='regdone'&&MOBILE&&hyp(P.x-n.r.sx,P.z-n.r.sz)<2.2));u.btn.hidden=!showBtn||!!shopOpen;
  if(showBtn)u.btnT.textContent=n.r.st==='idle'?L('Cướp tiệm','Rob the store'):L('Phá két','Crack the safe');
  MK_SAFE.visible=false;let bar=null;const r=ROB;
  if(r){const H=r.cash;r.t+=dt;
    if(r.st==='hold'){const k=Math.min(1,r.t/.5);H.armL.rotation.x=H.armR.rotation.x=-.08-2.87*k;H.armL.rotation.z=-.07-.18*k;H.armR.rotation.z=.07+.18*k;H.elL.rotation.x=H.elR.rotation.x=-.2+.05*k;H.head.rotation.x=-.1*k;if(r.t>1){r.st='bag';r.t=0;if(r.bag){r.bag.visible=true;r.bag.scale.setScalar(.2);}}}
    else if(r.st==='bag'){const s=r.t*9;H.armR.rotation.set(-1.05+Math.sin(s)*.45,0,.1);H.armL.rotation.set(-1.0+Math.cos(s)*.45,0,-.1);H.elL.rotation.x=H.elR.rotation.x=-.9;H.head.rotation.x=.35;H.spine.rotation.x=.18;
      if(r.bag)r.bag.scale.setScalar(.2+.8*Math.min(1,r.t/3.2));if(Math.random()<dt*3)sfx('swing');bar=[L('Thu ngân đang bỏ tiền vào túi...','The cashier is filling the bag...'),r.t/3.2];
      if(r.t>=3.2){const pay=Math.round(rnd(r.pay[0],r.pay[1])/10)*10;const from=r.bag?r.bag.getWorldPosition(new T.Vector3()):H.root.position.clone().setY(r.y+1.1);if(r.bag)r.bag.visible=false;robFly(from,pay,SAFE_M.bag);H.spine.rotation.x=0;H.head.rotation.x=0;robPose(r,'up');
        r.st='regdone';r.t=0;banner('+'+fmt$(pay),r.safe?L('Két sắt ở phía sau · lại gần bấm E để phá','The safe is in the back · walk up and press E to crack it'):L('Chạy đi trước khi cảnh sát tới!','Run before the cops arrive!'),2.8);if(!r.safe){r.st='done';r.cool=Date.now()+150000;ROB=null;}}}
    else if(r.st==='fight'){P.h=lerpA(P.h,Math.atan2(H.root.position.x-P.x,H.root.position.z-P.z),.3);for(const tt of[0,.42,.84])if(r.t-dt<tt&&r.t>=tt){P.punchCD=0;playerPunch();}
      for(const tt of[.18,.6,1.02])if(r.t-dt<tt&&r.t>=tt){sfx('hit');r.hit=.25;cam.shake=Math.max(cam.shake,.07);}
      if(r.hit>0){r.hit-=dt;const j=Math.max(0,r.hit)/.25;H.spine.rotation.x=-.35*j;H.head.rotation.x=-.4*j;H.armL.rotation.x=H.armR.rotation.x=-.5*j-.08;}
      if(r.t>1.2){const k=Math.min(1,(r.t-1.2)/.45),e=k*k;H.root.rotation.x=-Math.PI/2*e;H.root.position.y=r.y+.16*e;H.armL.rotation.x=H.armR.rotation.x=-2.2*e;if(r.t-dt<1.2)sfx('heavy');}
      bar=r.t<1.2?null:[L('Vét tiền trong quầy...','Emptying the till...'),(r.t-1.2)/1.1];
      if(r.t>=2.3){const pay=Math.round(rnd(r.pay[0],r.pay[1])/10)*10;robFly(new T.Vector3(r.cx,r.y+1.1,r.cz),Math.round(pay/2));robFly(new T.Vector3(r.cx+.2,r.y+1.15,r.cz),pay-Math.round(pay/2));
        r.st='regdone';r.t=0;banner('+'+fmt$(pay),r.safe?L('Két sắt ở phía sau · lại gần bấm E để phá','The safe is in the back · walk up and press E to crack it'):L('Chạy đi trước khi cảnh sát tới!','Run before the cops arrive!'),2.8);if(!r.safe){r.st='done';r.cool=Date.now()+150000;ROB=null;}}}
    else if(r.st==='regdone'){if(r.safe){MK_SAFE.visible=true;MK_SAFE.position.set(r.sx,r.y+.05,r.sz);MK_SAFE.children[0].rotation.z+=dt;}}
    else if(r.st==='crack'){const near=hyp(P.x-r.sx,P.z-r.sz)<2.6;if(near){r.t+=0;r.ck=(r.ck||0)+dt;}else r.t-=dt;
      const p=Math.min(1,(r.ck||0)/5);r.safe.dg.rotation.z+=dt*(Math.sin(r.ck*3)>0?7:-5);if(Math.floor(r.ck*5)!==Math.floor((r.ck-dt)*5)&&near)robClick();
      if(near){P.h=lerpA(P.h,Math.atan2(r.safe.g.position.x-P.x,r.safe.g.position.z-P.z),.2);P.H.punchT=Math.max(P.H.punchT||0,Math.sin(r.ck*6)>.9?.12:0);}
      bar=[near?L('Đang dò mã két · giữ vị trí','Cracking the combination · stay close'):L('Quay lại két sắt!','Get back to the safe!'),p];
      if(p>=1){r.st='open';r.t=0;robClick(2600);setTimeout(()=>robClick(3100),120);r.safe.led.material=SAFE_M.gold;}}
    else if(r.st==='open'){const k=Math.min(1,r.t/1.1),e=1-Math.pow(1-k,3);r.safe.piv.rotation.y=-1.95*e;if(r.t-dt<.05)sfx('heavy');
      if(r.t>.7&&!r.paid){r.paid=1;const tot=Math.round(rnd(r.spay[0],r.spay[1])/10)*10;r.lastPay=tot;const L2=r.safe.loot;const each=Math.floor(tot/L2.length);r.safe.g.updateMatrixWorld();const wps=L2.map(l=>l.p.clone().applyMatrix4(r.safe.g.matrixWorld));for(const m of r.safe.lootM)if(m)m.visible=false;L2.forEach((l,i)=>setTimeout(()=>robFly(wps[i],i===L2.length-1?tot-each*(L2.length-1):each,l.m),i*110));}
      if(r.t>2.4){r.st='done';r.paid=0;r.cool=Date.now()+150000;ROB=null;stars=Math.max(stars,3);evadeT=0;lastSeen={x:P.x,z:P.z};robAlarm();
        banner(L('PHÁ KÉT THÀNH CÔNG','SAFE CRACKED')+' +'+fmt$(r.lastPay||0),L('3 sao truy nã · chạy ra ngoài và cắt đuôi cảnh sát','3 wanted stars · get out and lose the cops'),3.4);}}}
  u.bar.hidden=!bar;if(bar){u.barT.textContent=bar[0];u.barI.style.width=Math.round(clamp(bar[1],0,1)*100)+'%';}
  flyUpdate(dt);}
const MK_SAFE=markerRing(0xffd166,.75);MK_SAFE.visible=false;
/* place a safe in a free corner the player can walk to (flood fill from the door), as close to the cashier as possible */
function autoSafe(R,cash,y){const st=.5,x0=R.x0+.4,z0=R.z0+.4,nx=Math.floor((R.x1-R.x0-.8)/st)+1,nz=Math.floor((R.z1-R.z0-.8)/st)+1,ok=new Uint8Array(nx*nz),seen=new Uint8Array(nx*nz);
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)ok[j*nx+i]=resolve(x0+i*st,z0+j*st,.42)?0:1;
  const si=Math.round((R.door.x-x0)/st),sj=Math.round((R.door.z-.6-z0)/st);const q=[];if(si>=0&&si<nx&&sj>=0&&sj<nz&&ok[sj*nx+si]){q.push(sj*nx+si);seen[sj*nx+si]=1;}
  while(q.length){const c=q.pop(),i=c%nx,j=(c-i)/nx;for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=nx||b>=nz)continue;const k=b*nx+a;if(!seen[k]&&ok[k]){seen[k]=1;q.push(k);}}}
  let best=null,bd=1e9;const cx=cash.root.position.x,cz=cash.root.position.z;
  const tryWall=(sx,sz,h)=>{const ax=Math.cos(h),az=-Math.sin(h);if(resolve(sx,sz,.42)||resolve(sx+ax*.3,sz+az*.3,.42)||resolve(sx-ax*.3,sz-az*.3,.42))return;const fx=Math.sin(h),fz=Math.cos(h),px=sx+fx*1.0,pz=sz+fz*1.0;const i=Math.round((px-x0)/st),j=Math.round((pz-z0)/st);if(i<0||j<0||i>=nx||j>=nz||!seen[j*nx+i])return;
    if(hyp(sx-R.door.x,sz-R.door.z)<4.5)return;const d=hyp(sx-cx,sz-cz);if(d<1.4)return;if(d<bd){bd=d;best={x:sx,z:sz,h,px,pz};}};
  for(let x=R.x0+.9;x<R.x1-.9;x+=.5){tryWall(x,R.z0+.55,0);}for(let z=R.z0+.9;z<R.z1-.9;z+=.5){tryWall(R.x0+.55,z,Math.PI/2);tryWall(R.x1-.55,z,-Math.PI/2);}
  if(!best)return null;const s=makeSafe(best.x,y||0,best.z,best.h);addCol({t:'b',x0:best.x-.5,x1:best.x+.5,z0:best.z-.5,z1:best.z+.5,h:(y||0)+1.1});return{s,px:best.px,pz:best.pz};}
function cashBag(x,y,z){const b=new T.Mesh(new T.SphereGeometry(.2,12,9),SAFE_M.bag);b.scale.setScalar(.2);b.position.set(x,y,z);b.visible=false;scene.add(b);return b;}
/* ---------- shop furnishing by type (also used for the mall units) ---------- */
const SHOPTYPE={
  mart24:{n:'Nexus 24h',kind:'market',bg:'#0f9d58',fg:'#fff',cols:['#e63946','#ffb703','#2a9d8f','#3a86ff','#f4a261','#6a994e','#ff8fab','#8338ec'],fridge:1,floor:'tileW'},
  pharmacy:{n:'Nhà thuốc Hoa Sen',kind:'market',bg:'#1b998b',fg:'#fff',cols:['#ffffff','#e0f2f1','#80cbc4','#4db6ac','#ef5350','#90caf9'],floor:'tileW',shop:'pharmacy'},
  tech:{n:'Nexus Tech',kind:'market',bg:'#111827',fg:'#7dd3fc',cols:['#1f2937','#374151','#111827','#0ea5e9','#e5e7eb'],floor:'marbleDk',shop:'tech',pay:[300,700],spay:[1500,3200]},
  toys:{n:'Thế Giới Đồ Chơi',kind:'market',bg:'#ff6b6b',fg:'#fff',cols:['#ff595e','#ffca3a','#8ac926','#1982c4','#6a4c93','#ff924c'],floor:'oak',shop:'toys'},
  books:{n:'Nhà sách Gió',kind:'market',bg:'#3d405b',fg:'#f2cc8f',cols:['#8d5524','#c68642','#3d405b','#81b29a','#e07a5f','#f2cc8f','#264653'],floor:'oak',shop:'books'},
  cosm:{n:'Mỹ phẩm Mây',kind:'market',bg:'#ffafcc',fg:'#5a1a3a',cols:['#ffc8dd','#ffafcc','#cdb4db','#ffffff','#e5989b'],floor:'marble',shop:'cosm'},
  clothes:{n:'Lụa Boutique',kind:'fashion',bg:'#ad8dff',fg:'#fff',floor:'oak',shop:'clothes'},
  urban:{n:'Urban Wear',kind:'fashion',bg:'#1d1d1d',fg:'#c1f354',floor:'marbleDk',shop:'clothes'},
  shoes:{n:'Sneaker Lab',kind:'fashion',bg:'#f8f9fa',fg:'#e63946',floor:'oak',shop:'clothes',shoes:1},
  sport:{n:'Thể Thao 24',kind:'fashion',bg:'#e63946',fg:'#fff',floor:'oakDk',shop:'clothes'},
  outlet:{n:'Nexus Outlet',kind:'fashion',bg:'#ffd166',fg:'#1d1d1d',floor:'oak',shop:'clothes'},
  jewel:{n:'Kim Hoàn Ngọc Bảo',kind:'jewel',bg:'#1d1d1d',fg:'#e0b04a',floor:'marbleDk',shop:'jewel',pay:[600,1400],spay:[4000,8000]},
  watch:{n:'Đồng Hồ Thời Gian',kind:'jewel',bg:'#0b2545',fg:'#e0b04a',floor:'marbleDk',shop:'watch',pay:[500,1100],spay:[2500,5000]},
  optic:{n:'Kính Mắt Sáng',kind:'jewel',bg:'#ffffff',fg:'#1d3557',floor:'marble',shop:'optic'},
  bags:{n:'Túi Xinh',kind:'fashion',bg:'#ffb4a2',fg:'#6d2e46',floor:'marble',shop:'bags'},
  barber:{n:'Tóc Đẹp Barber',kind:'salon',bg:'#1d3557',fg:'#fff',floor:'tileK',shop:'barber',pole:1},
  nails:{n:'Nail Hồng',kind:'salon',bg:'#ff8fab',fg:'#fff',floor:'marble',shop:'nails',nails:1},
  arcade:{n:'Arcade Nexus',kind:'arcade',bg:'#240046',fg:'#ff4ecd',floor:'navy',shop:'arcade'},
  coffee:{n:'Cà Phê Gác Mái',kind:'food',bg:'#6f4e37',fg:'#fff',floor:'oakDk',shop:'coffee'},
  com:{n:'Cơm Tấm Cô Ba',kind:'food',bg:'#ffb703',fg:'#1d1d1d',floor:'tileK',shop:'food'},
  pizza:{n:'Pizza Lửa Hồng',kind:'food',bg:'#c1121f',fg:'#fff',floor:'tileK',shop:'pizza'},
  boba:{n:'Trà Sữa Mây',kind:'food',bg:'#a47148',fg:'#fff',floor:'tileW',shop:'boba'},
  pho:{n:'Phở Hà Thành',kind:'food',bg:'#bc4749',fg:'#fff',floor:'tileK',shop:'pho'},
  bbq:{n:'Lẩu Nướng Khói',kind:'food',bg:'#370617',fg:'#ffba08',floor:'oakDk',shop:'bbq'},
  sushi:{n:'Sushi Sóng',kind:'food',bg:'#f1faee',fg:'#e63946',floor:'oak',shop:'sushi'},
  kem:{n:'Kem Tuyết',kind:'food',bg:'#bde0fe',fg:'#1d3557',floor:'tileW',shop:'kem'}};
SHOPTYPE.mart24.shop='mart24';SHOPTYPE.barber.shop='barber';SHOPTYPE.nails.shop='nails';
const STEX={},SIGNGB={};
function shopSignQ(t,x,y,z,h,w,hh){const g=SIGNGB[t]||(SIGNGB[t]=new GB());const rx=Math.cos(h),rz=-Math.sin(h),n=[Math.sin(h),0,Math.cos(h)];g.quad([x-rx*w/2,y-hh/2,z-rz*w/2],[x+rx*w/2,y-hh/2,z+rz*w/2],[x+rx*w/2,y+hh/2,z+rz*w/2],[x-rx*w/2,y+hh/2,z-rz*w/2],n,[[0,0],[1,0],[1,1],[0,1]]);}
function signMat(t){if(STEX[t])return STEX[t];const S=SHOPTYPE[t];const tx=textTex(S.n,{fg:S.fg,bg:S.bg,size:66,w:1024,h:160,glow:S.fg});return STEX[t]=new T.MeshBasicMaterial({map:tx,toneMapped:false});}
function shopSign(t,x,y,z,h,w,hh){const m=new T.Mesh(new T.PlaneGeometry(w,hh),signMat(t));m.position.set(x,y,z);m.rotation.y=h;scene.add(m);return m;}
function furnish(F,type,y,lv,roomId,R){const S=SHOPTYPE[type],W=F.W,D=F.D,col={col:1,lv},hc=y+(R&&R.unitH||3.2);
  ubox(F,S.floor||'oak',.05,W-.05,y,y+.012,.05,D-.05);
  const cash=extra(Object.assign(randomLook('ped'),{shirt:S.bg==='#ffffff'||S.bg==='#f8f9fa'||S.bg==='#f1faee'?S.fg:S.bg,jacket:null}),...F.p(W-3,D-1.8),F.h);cash.root.position.y=y;
  // the counter, the till and the menu/brand panel behind it
  ubox(F,'white',W-5.2,W-1,y,y+1.0,D-3.3,D-2.6,col);ubox(F,'marbleTop',W-5.3,W-.95,y+1.0,y+1.05,D-3.4,D-2.5);ubox(F,'#16181c',W-2.6,W-2.0,y+1.05,y+1.3,D-3.1,D-2.75);ubox(F,'#c1f354',W-2.55,W-2.05,y+1.27,y+1.3,D-3.1,D-2.95);
  {const[a,b]=F.p(W-3.2,D-.06);const bb=new T.Mesh(new T.PlaneGeometry(3.4,.8),signMat(type));bb.position.set(a,y+2.3,b);bb.rotation.y=F.h;scene.add(bb);}
  const bag=cashBag(0,0,0);{const[a,b]=F.p(W-3.6,D-2.95);bag.position.set(a,y+1.25,b);}
  const PC=S.cols||['#e63946','#ffb703','#2a9d8f','#3a86ff','#f4a261'];
  if(S.kind==='market'){for(const u of[2.4,4.9]){if(u>W-6)continue;ubox(F,'steel',u-.32,u+.32,y,y+1.7,1.6,D-2.4,col);for(const yy of[.2,.65,1.1])for(let v=1.7;v<D-2.5;v+=.55){const c=PC[Math.floor(Math.abs(Math.sin(v*7.1+yy*3+u))*PC.length)];ubox(F,c,u-.4,u-.32,y+yy,y+yy+.32,v,v+.42);ubox(F,PC[(PC.indexOf(c)+2)%PC.length],u+.32,u+.4,y+yy,y+yy+.32,v,v+.42);}}
    ubox(F,'white',2.9,W-5.6,y,y+2.1,D-.55,D-.05,col);for(const yy of[.3,.85,1.4])for(let u=3;u<W-5.8;u+=.5)ubox(F,PC[Math.floor(Math.abs(Math.sin(u*5.3+yy))*PC.length)],u,u+.38,y+yy,y+yy+.35,D-.5,D-.38);
    if(S.fridge){ubox(F,'white',.05,.75,y,y+2.1,1.2,D-2.6,col);const[a,b]=F.p(.78,(D-1.4)/2+.6);glow('#dff4ff',a,y+1.1,b,D-4.2,1.8,F.h+Math.PI/2,.6);}
    if(type==='tech'){for(let u=1.2;u<W-6;u+=1.6){const[a,b]=F.p(u,D-.04);glow('#38bdf8',a,y+1.6,b,1.2,.7,F.h,.8);}}}
  else if(S.kind==='fashion'){const GC=['#e63946','#f1faee','#457b9d','#1d3557','#ffb703','#2a9d8f','#ad8dff','#111111','#f4a261'];
    for(const v of[2.0,4.2]){if(v>D-3)continue;for(const[u]of[[1.2],[W-6.2]])ucyl(F,'chrome',u,v,y,y+1.55,.025,.025,8);
      ubox(F,'chrome',1.2,W-6.2,y+1.5,y+1.55,v-.02,v+.02);for(let u=1.5;u<W-6.4;u+=.32)ubox(F,GC[Math.floor(Math.abs(Math.sin(u*9.7+v))*GC.length)],u,u+.07,y+.55,y+1.45,v-.28,v+.28);
      mcol(...F.r(1.0,W-6.0,v-.3,v+.3),y,y+1.6,lv);}
    for(const u of[1.0,W-6.6]){ubox(F,'#e9e6df',u-.22,u+.22,y,y+.06,.8,1.25);ubox(F,'#e9e6df',u-.04,u+.04,y+.06,y+.95,.98,1.06);ubox(F,GC[(u*3|0)%GC.length],u-.24,u+.24,y+.95,y+1.6,.88,1.16);ubox(F,'#f3d2b8',u-.1,u+.1,y+1.6,y+1.85,.92,1.12);}
    if(S.shoes){ubox(F,'white',.8,W-5.6,y,y+2.2,D-.5,D-.05,col);for(const yy of[.35,.8,1.25,1.7])for(let u=1;u<W-5.9;u+=.55)ubox(F,GC[Math.floor(Math.abs(Math.sin(u*3.1+yy*5))*GC.length)],u,u+.34,y+yy,y+yy+.14,D-.45,D-.2);}
    else{const[a,b]=F.p(1.6,D-.04);glow('#dfeff5',a,y+1.4,b,1.2,2.2,F.h,.45);}}
  else if(S.kind==='jewel'){for(const[u0,u1,v0,v1]of[[.8,W-6,1.6,2.2],[.8,1.4,2.2,D-2.2]]){ubox(F,'dark',u0,u1,y,y+.9,v0,v1,col);ubox(F,'#bfe6f2',u0,u1,y+.9,y+1.12,v0,v1);for(let u=u0+.15;u<u1-.1;u+=.35)for(let v=v0+.15;v<v1-.1;v+=.3)ubox(F,(u*7|0)%3?'#e0b04a':'#e8eef5',u,u+.09,y+.92,y+.97,v,v+.06);}
    ubox(F,'#e0b04a',.8,W-6,y+1.12,y+1.14,1.6,2.2);const[a,b]=F.p(3.5,D-.04);glow('#fff1cc',a,y+1.8,b,3,1.1,F.h,.5);}
  else if(S.kind==='salon'){for(let k=0;k<3;k++){const u=1.3+k*1.7;if(u>W-6)break;const v=D-1.0;if(S.nails){ubox(F,'white',u-.5,u+.5,y,y+.75,v-1.4,v-.9,col);ubox(F,'#ff8fab',u-.55,u+.55,y+.75,y+.79,v-1.45,v-.85);ubox(F,'pinkW',u-.25,u+.25,y,y+.45,v-.6,v-.2);for(let j=0;j<6;j++)ubox(F,PC[j%PC.length]||'#e63946',u-.4+j*.14,u-.32+j*.14,y+.79,y+.9,v-1.3,v-1.24);}
      else{ubox(F,'leather',u-.3,u+.3,y+.35,y+.6,v-.3,v+.3,col);ubox(F,'leather',u-.3,u+.3,y+.6,y+1.25,v+.2,v+.3);ubox(F,'chrome',u-.05,u+.05,y,y+.35,v-.05,v+.05);ubox(F,'dark',u-.32,u+.32,y,y+.04,v-.32,v+.32);}
      const[a,b]=F.p(u,D-.04);glow('#e8f4fa',a,y+1.55,b,.9,1.1,F.h,.55);ubox(F,'white',u-.55,u+.55,y+.9,y+.95,D-.3,D-.05);}
    if(S.pole){const[a,b]=F.p(.35,-.25);cyl('white',a,y+1.6,y+2.6,b,.1,.1,12);cyl('red',a,y+1.9,y+2.3,b,.105,.105,12);sph('chrome',a,y+2.65,b,.11);}
    if(S.nails)for(let j=0;j<14;j++)ubox(F,['#e63946','#ff8fab','#ffb703','#8338ec','#2a9d8f','#111','#f1faee'][j%7],.06,.14,y+1.0+(j%2)*.3,y+1.18+(j%2)*.3,1.2+(j>>1)*.3,1.32+(j>>1)*.3);}
  else if(S.kind==='food'){ubox(F,'steel',.6,W-5.6,y,y+.92,D-.8,D-.05,col);ubox(F,'dark',.6,W-5.6,y+.92,y+.96,D-.8,D-.05);for(let u=1.2;u<W-6;u+=1.3)ucyl(F,'black',u,D-.45,y+.96,y+.99,.15,.15,14);
    ubox(F,'steel',.6,W-5.6,y+2.0,y+2.4,D-1.0,D-.05);const[a,b]=F.p(Math.max(2.4,(W-5)/2),D-.04);glow(menuTex(S.n.toUpperCase().slice(0,16),[[L('Món chính','Mains'),'$18'],[L('Món nhẹ','Snacks'),'$8'],[L('Đồ uống','Drinks'),'$6']],S.bg,S.fg),a,y+1.65,b,2.4,1.1,F.h,.95);
    for(const u of[1.2,3.2])if(u<W-6){ubox(F,'oak',u-.5,u+.5,y+.72,y+.76,1.2,2.0);ubox(F,'dark',u-.04,u+.04,y,y+.72,1.55,1.65);mcol(...F.r(u-.5,u+.5,1.2,2.0),y,y+.8,lv);}}
  else if(S.kind==='arcade'){for(let k=0;k<4;k++){const u=1.0+k*1.25;if(u>W-6)break;ubox(F,'#2b2d42',u-.4,u+.4,y,y+1.85,D-1.0,D-.2,col);const[a,b]=F.p(u,D-1.02);glow(['#ff4ecd','#00f5d4','#fee440','#9b5de5'][k],a,y+1.35,b,.6,.45,F.h,.9);ubox(F,'#111',u-.35,u+.35,y+.9,y+.98,D-1.25,D-1.0);}
    for(let k=0;k<3;k++){const v=1.4+k*1.3;if(v>D-3)break;ubox(F,'#2b2d42',.2,.9,y,y+1.85,v-.4,v+.4,col);const[a,b]=F.p(.92,v);glow(['#00bbf9','#f15bb5','#fee440'][k],a,y+1.35,b,.6,.45,F.h-Math.PI/2,.9);}}
  const[ax,az]=F.p(W-3.1,D-4.3);if(R){act(R,ax,az,2.4,()=>L('Mua ở quầy · ','Buy at the counter · ')+S.n,()=>openShop(S.shop||type));R.acts[R.acts.length-1].y=y;}
  // safe in the back-left corner, behind a little partition
  const[sx,sz]=F.p(1.0,D-.55);const sf=makeSafe(sx,y,sz,F.h);mcol(sx-.55,sx+.55,sz-.55,sz+.55,y,y+1.1,lv);const[spx,spz]=F.p(1.0,D-1.6);
  const r=robReg({room:roomId,cx:ax,cz:az,cash,safe:sf,sx:spx,sz:spz,y,bag,name:S.n,pay:S.pay||[160,420],spay:S.spay||[700,1800]});
  return r;}
/* ---------- the menus for the new shops ---------- */
function gift(n,en,d,den,p){return{n:L(n,en),d:L(d,den),p,fn:()=>{save.items=save.items||{};save.items[n]=(save.items[n]|0)+1;banner(L(n,en),L('Đã cất vào túi đồ','Added to your bag'));}};}
function food(n,en,hp,p,col,boost){return{n:L(n,en),d:hp>=200?L('Hồi đầy máu','Full health'):'+'+hp+L(' máu',' HP')+(boost?L(', chạy nhanh 60 giây',', run faster for 60 s'):''),p,ok:()=>!P.tray,fn:()=>takeFood({n:L(n,en),hp,col,boost})};}
function hairItem(n,en,style,p){return{n:L(n,en),d:L('Kiểu tóc mới','New haircut'),p,fn:()=>{save.hairStyle=style;rebuildPlayer();banner(L('Tóc mới!','Fresh cut!'),L(n,en));}};}
function hairCol(n,en,c,p){return{n:L(n,en),d:L('Nhuộm màu tóc','Hair colour'),p,fn:()=>{save.hairCol=c;rebuildPlayer();banner(L('Tóc mới!','Fresh colour!'),L(n,en));}};}
Object.assign(SHOPS,{
  mart24:{n:L('Nexus 24h · cửa hàng tiện lợi','Nexus 24h · convenience store'),items:[{n:L('Mì ly','Cup noodles'),d:'+20'+L(' máu',' HP'),p:3,fn:()=>heal(20)},{n:L('Bánh bao nóng','Hot steamed bun'),d:'+30'+L(' máu',' HP'),p:5,fn:()=>heal(30)},{n:L('Nước tăng lực','Energy drink'),d:L('Chạy nhanh 60 giây','Run faster for 60 s'),p:6,fn:()=>{P.boostT=60;}},{n:L('Cơm nắm','Rice ball'),d:'+40'+L(' máu',' HP'),p:7,fn:()=>heal(40)},{n:L('Bộ sơ cứu','First aid kit'),d:L('Hồi đầy máu','Full health'),p:110,fn:()=>heal(999)}]},
  pharmacy:{n:L('Nhà thuốc Hoa Sen','Lotus Pharmacy'),items:[{n:L('Băng cá nhân','Plasters'),d:'+25'+L(' máu',' HP'),p:6,fn:()=>heal(25)},{n:L('Vitamin tổng hợp','Multivitamins'),d:'+60'+L(' máu',' HP'),p:25,fn:()=>heal(60)},{n:L('Hộp cứu thương','Medkit'),d:L('Hồi đầy máu','Full health'),p:90,fn:()=>heal(999)}]},
  tech:{n:'Nexus Tech',items:[{n:L('Máy quét sóng cảnh sát','Police scanner'),d:L('Giảm 1 sao truy nã','Drops 1 wanted star'),p:450,ok:()=>stars>0,fn:()=>{stars=Math.max(0,stars-1);evadeT=0;}},gift('Tai nghe không dây','Wireless earbuds','Đồ sưu tầm','Collectible',220),gift('Điện thoại Nexus X','Nexus X phone','Đồ sưu tầm','Collectible',1200),gift('Máy chơi game cầm tay','Handheld console','Đồ sưu tầm','Collectible',650)]},
  toys:{n:L('Thế Giới Đồ Chơi','Toy World'),items:[gift('Gấu bông khổng lồ','Giant teddy bear','Đồ sưu tầm','Collectible',60),gift('Xe điều khiển','RC car','Đồ sưu tầm','Collectible',140),gift('Bộ xếp hình thành phố','City building set','Đồ sưu tầm','Collectible',90)]},
  books:{n:L('Nhà sách Gió','Wind Bookstore'),items:[gift('Truyện tranh Nexus','Nexus comic','Đồ sưu tầm','Collectible',8),gift('Sách nấu ăn','Cookbook','Đồ sưu tầm','Collectible',15),gift('Bản đồ thành phố','City map','Đồ sưu tầm','Collectible',5)]},
  cosm:{n:L('Mỹ phẩm Mây','Cloud Cosmetics'),items:[gift('Son môi','Lipstick','Đồ sưu tầm','Collectible',25),gift('Nước hoa','Perfume','Đồ sưu tầm','Collectible',120),{n:L('Mặt nạ dưỡng da','Face mask'),d:'+30'+L(' máu',' HP'),p:12,fn:()=>heal(30)}]},
  jewel:{n:L('Kim Hoàn Ngọc Bảo','Ngoc Bao Jewellers'),items:[gift('Nhẫn bạc','Silver ring','Trang sức','Jewellery',300),gift('Dây chuyền vàng','Gold chain','Trang sức','Jewellery',2200),gift('Nhẫn kim cương','Diamond ring','Trang sức','Jewellery',12000)]},
  watch:{n:L('Đồng Hồ Thời Gian','Time Watches'),items:[gift('Đồng hồ thể thao','Sports watch','Đồ sưu tầm','Collectible',180),gift('Đồng hồ cơ','Mechanical watch','Đồ sưu tầm','Collectible',1500),gift('Đồng hồ vàng','Gold watch','Đồ sưu tầm','Collectible',9000)]},
  optic:{n:L('Kính Mắt Sáng','Bright Optics'),items:[{n:L('Kính râm','Sunglasses'),d:save.glasses?L('Đang đeo · bấm để tháo','Wearing · tap to remove'):L('Đeo ngay','Wear them now'),p:80,fn:()=>{save.glasses=!save.glasses;rebuildPlayer();}},gift('Kính áp tròng','Contact lenses','Đồ sưu tầm','Collectible',30)]},
  bags:{n:L('Túi Xinh','Pretty Bags'),items:[gift('Túi tote','Tote bag','Đồ sưu tầm','Collectible',45),gift('Ba lô du lịch','Travel backpack','Đồ sưu tầm','Collectible',110),gift('Túi da cao cấp','Designer handbag','Đồ sưu tầm','Collectible',2400)]},
  barber:{n:L('Tóc Đẹp Barber','Good Hair Barber'),items:[hairItem('Tóc ngắn gọn','Short cut','short',25),hairItem('Đầu đinh','Buzz cut','buzz',20),hairItem('Cạo trọc','Shaved','bald',15),hairItem('Tóc dài','Long hair','long',60),hairItem('Buộc đuôi ngựa','Ponytail','pony',40),hairItem('Búi tóc','Bun','bun',40),
    hairCol('Nhuộm đen','Black dye','#151515',30),hairCol('Nhuộm nâu hạt dẻ','Chestnut dye','#7a5230',35),hairCol('Nhuộm vàng','Blonde dye','#e0c070',45),hairCol('Nhuộm bạch kim','Platinum dye','#e8e8e8',60),hairCol('Nhuộm đỏ','Red dye','#b3202a',50),hairCol('Nhuộm xanh','Blue dye','#2a5ca8',50),
    {n:L('Cạo râu / để râu','Shave / grow a beard'),d:L('Đổi qua lại','Toggle'),p:15,fn:()=>{save.beard=!(save.beard===undefined?(CHARS[save.char]||{}).beard:save.beard);rebuildPlayer();}}]},
  nails:{n:L('Nail Hồng','Pink Nails'),items:[{n:L('Sơn gel','Gel polish'),d:'+30'+L(' máu',' HP'),p:20,fn:()=>{heal(30);banner(L('Móng xinh!','Nice nails!'),L('Thư giãn, hồi 30 máu','Relaxed, +30 HP'));}},{n:L('Đắp bột','Acrylic set'),d:'+60'+L(' máu',' HP'),p:45,fn:()=>{heal(60);banner(L('Móng xinh!','Nice nails!'),L('Hồi 60 máu','+60 HP'));}},{n:L('Massage tay chân','Hand and foot massage'),d:L('Hồi đầy máu, chạy nhanh 60 giây','Full health, run faster for 60 s'),p:80,fn:()=>{heal(999);P.boostT=60;banner(L('Thư giãn','Relaxed'),L('Hồi đầy máu','Full health'));}}]},
  arcade:{n:'Arcade Nexus',items:[{n:L('Máy gắp thú','Claw machine'),d:L('50% gắp được gấu bông','50% chance to win a teddy'),p:5,fn:()=>{if(Math.random()<.5){save.items=save.items||{};save.items['Gấu bông']=(save.items['Gấu bông']|0)+1;banner(L('GẮP TRÚNG!','GOT ONE!'),L('Bạn được 1 gấu bông','You won a teddy bear'));}else showPrompt(L('Trượt rồi, thử lại!','Missed, try again!'),1.4);}},{n:L('Đua xe arcade','Arcade racer'),d:L('Thắng được $30','Win $30'),p:10,fn:()=>{if(Math.random()<.4){save.money+=30;banner(L('VỀ NHẤT!','FIRST PLACE!'),'+$30');}else showPrompt(L('Về nhì rồi!','Second place!'),1.4);}}]},
  coffee:{n:L('Cà Phê Gác Mái','Attic Coffee'),items:[food('Cà phê sữa đá','Iced milk coffee',10,4,'#6f4e37',1),food('Bạc xỉu','Bac xiu',12,5,'#d4a373',1),food('Bánh croissant','Croissant',25,6,'#e9c46a')]},
  pizza:{n:L('Pizza Lửa Hồng','Pink Flame Pizza'),items:[food('Pizza hải sản','Seafood pizza',70,16,'#e76f51'),food('Pizza phô mai','Cheese pizza',55,12,'#f4a261'),food('Nước ngọt','Soft drink',10,3,'#c1121f',1)]},
  boba:{n:L('Trà Sữa Mây','Cloud Bubble Tea'),items:[food('Trà sữa trân châu','Bubble milk tea',15,6,'#d4a373',1),food('Trà đào cam sả','Peach lemongrass tea',12,5,'#f4a261',1),food('Sữa tươi đường đen','Brown sugar milk',18,7,'#8a5a3a',1)]},
  pho:{n:L('Phở Hà Thành','Ha Thanh Pho'),items:[food('Phở bò tái','Rare beef pho',200,9,'#e9c46a'),food('Phở gà','Chicken pho',80,8,'#f1e3b5'),food('Quẩy','Fried dough',15,2,'#d4a373')]},
  bbq:{n:L('Lẩu Nướng Khói','Smoke Hotpot and Grill'),items:[food('Lẩu thái','Thai hotpot',200,30,'#e63946'),food('Ba chỉ nướng','Grilled pork belly',70,14,'#8a4b2a'),food('Trà đá','Iced tea',8,1,'#c9a227')]},
  sushi:{n:L('Sushi Sóng','Wave Sushi'),items:[food('Cơm cuộn cá hồi','Salmon roll',45,12,'#f4a261'),food('Sashimi tổng hợp','Sashimi platter',120,28,'#e76f51'),food('Trà xanh','Green tea',10,3,'#6a994e',1)]},
  kem:{n:L('Kem Tuyết','Snow Ice Cream'),items:[food('Kem ốc quế','Ice cream cone',15,3,'#fbe7c6'),food('Kem dừa','Coconut ice cream',25,6,'#f1faee'),food('Bingsu xoài','Mango bingsu',40,9,'#ffb703')]}});
SHOPS.food.n=SHOPS.food.n||'Cơm Tấm Cô Ba';
/* ---------- street shops: 24h store, barber, nail salon (shared interiors, entered from doors all over the city) ---------- */
for(const[id,cx,w,d,wall,ceil]of[['mart24',5100,14,11,'plasterW','ceilT'],['barber',5180,12,10,'paper','plaster'],['nails',5260,12,10,'pinkW','plaster']]){
  const R=room(id,cx,0,w,d,3.4,{wall,floor:'tileW',fts:1,wts:1.6,ceil,cts:1.2,skirt:'dark'});R.seats=[];
  const F=UF(R.x0,R.x1,R.z0,R.z1,'z1');furnish(F,id,0,undefined,id,R);
  for(let x=R.x0+2.5;x<R.x1-1;x+=3.5)for(let z=R.z0+2;z<R.z1-1;z+=3.5)IE.push([x,R.h-.04,z]);R.lights=[[cx,3.2,R.z0+3,.9,'#fff4e6',13],[cx,3.2,R.z1-3,.7,'#fff4e6',11]];plant(R.x0+.7,R.z1-.8,.9);}
/* robberies in the existing shops: find the counter that opens the shop, the cashier standing behind it, and drop a safe in a free corner */
for(const[room,key,pay,spay]of[['mart','mart'],['guns','guns',[400,900],[1800,3500]],['diner','food'],['gym','gym'],['clothes','clothes'],['cars','cars',[500,1200],[2500,5000]],['hotel','bar',[300,700]],['tea','tea'],['sea','sea'],['saloon','saloon'],['cinema','Bắp rang']]){
  const R=ROOMS[room];if(!R||!R.acts)continue;const a=R.acts.find(a=>String(a.fn).includes(key));if(!a)continue;
  let cash=null,bd=5.5;for(const e of EXTRAS){if(e.x<R.x0||e.x>R.x1||e.z<R.z0||e.z>R.z1)continue;const d=hyp(e.x-a.x,e.z-a.z);if(d<bd){bd=d;cash=e.H;}}if(!cash)continue;
  const sf=autoSafe(R,cash,0);const bag=cashBag(0,0,0);{const c=cash.root.position,dx=a.x-c.x,dz=a.z-c.z,l=hyp(dx,dz)||1;bag.position.set(c.x+dx/l*.7,1.15,c.z+dz/l*.7);}
  robReg({room,cx:a.x,cz:a.z,cash,safe:sf&&sf.s,sx:sf&&sf.px,sz:sf&&sf.pz,y:0,bag,pay:pay||[160,420],spay:spay||[700,1800]});}
/* ================= NEXUS MALL: 3 floors around a glass-roofed atrium, criss-cross escalators, a glass elevator, 26 shops and a food court ================= */
{const MX=MALL.X,MZ=MALL.Z,Y=MALL.Y,X=v=>MX+v,Z=v=>MZ+v;
  const R=room('mall',MX,MZ,64,48,18,{wall:'sage',floor:'mallTile',fts:2.4,wts:3,ceil:'ceilT',cts:2.4,skirt:'dark'});R.seats=[];R.unitH=5.7;MALL.R=R;
  // floor slabs of level 1 and 2 with the atrium (|x|<12,|z|<8) and the elevator shaft (|x|<1.6, -20<z<-16) cut out
  const slab=(y,a,b,c,d)=>{itb('mallTile',X(a),X(b),y-.3,y,Z(c),Z(d),{ts:2.4});ceilQ('ceilT',X(a),X(b),y-.31,Z(c),Z(d),2.4);};
  for(const y of[Y[1],Y[2]]){slab(y,-32,32,8,24);slab(y,-32,-1.6,-24,-8);slab(y,1.6,32,-24,-8);slab(y,-1.6,1.6,-24,-20);slab(y,-1.6,1.6,-16,-8);slab(y,-32,-12,-8,8);slab(y,12,32,-8,8);
    // glass balustrade round the atrium, gaps where the escalators land
    const rail=(x0,x1,z0,z1)=>{itb('mglass',X(x0),X(x1),y,y+1.05,Z(z0),Z(z1));itb('chrome',X(x0),X(x1),y+1.05,y+1.1,Z(z0),Z(z1));mcol(X(x0),X(x1),Z(z0),Z(z1),y,y+1.1,y===Y[1]?1:2);};
    rail(-12,12,-8.06,-7.94);rail(-12,12,7.94,8.06);
    if(y===Y[1]){rail(-12.06,-11.94,-8,-5.3);rail(-12.06,-11.94,-2.7,2.7);rail(-12.06,-11.94,5.3,8);rail(11.94,12.06,-8,8);}
    else{rail(-12.06,-11.94,-8,8);rail(11.94,12.06,-8,2.7);rail(11.94,12.06,5.3,8);}
    const cy=y===Y[2]?17.96:y+5.66;for(let x=-30;x<=30;x+=6)for(const z of[-12,12])if(Math.abs(x)>1||z>0)IE.push([X(x),cy,Z(z)]);for(const x of[-18,18])for(const z of[-4,4])IE.push([X(x),cy,Z(z)]);}
  for(let x=-30;x<=30;x+=6)for(const z of[-12,12,20])IE.push([X(x),Y[1]-.35,Z(z)]);for(const x of[-18,18])for(const z of[-4,4])IE.push([X(x),Y[1]-.35,Z(z)]);
  // skylight over the atrium and a big window wall over the entrance
  {const sk=new T.Mesh(new T.PlaneGeometry(24,16),new T.MeshBasicMaterial({color:lin('#dcefff'),toneMapped:false}));sk.rotation.x=Math.PI/2;sk.position.set(MX,17.94,MZ);scene.add(sk);
    for(let k=-2;k<=2;k++)itb('dark',X(k*5.6-.1),X(k*5.6+.1),17.6,17.95,Z(-8),Z(8));glow(VIEW,MX,10.5,MZ+23.9,40,13,Math.PI,.95);for(let k=-4;k<=4;k++)itb('dark',X(k*5-.12),X(k*5+.12),4.2,17,Z(23.75),Z(23.95));}
  // entrance hall: NEXUS MALL letters, planters, a directory board
  sign('NEXUS MALL',MX,4.9,MZ+23.8,Math.PI,14,2.2,{fg:'#ffffff',bg:'rgba(0,0,0,0)',size:110,w:1024,h:160,glow:'#c1f354'});
  for(const sx of[-1,1]){plant(X(sx*6),Z(21),1.3);plant(X(sx*10),Z(21),1.3);}
  glow(menuTex('NEXUS MALL',[[L('Tầng 1 · Siêu thị, trang sức','Floor 1 · Market, jewellery'),''],[L('Tầng 2 · Thời trang, tóc, nail','Floor 2 · Fashion, hair, nails'),''],[L('Tầng 3 · Khu ẩm thực','Floor 3 · Food court'),''],[L('Thang máy ở phía sau','Elevator at the back'),'']],'#111827','#c1f354'),X(-6),2.1,Z(14.2),1.8,1.35,0,.95);
  itb('dark',X(-6.95),X(-5.05),0,1.45,Z(14.05),Z(14.15));mcol(X(-7),X(-5),Z(14),Z(14.2),0,2.8,0);
  // back-centre service core around the elevator, all floors
  for(const[a,b]of[[-8,-1.8],[1.8,8]]){itb('marbleDk',X(a),X(b),0,18,Z(-24),Z(-16),{ts:2});addCol({t:'b',x0:X(a),x1:X(b),z0:Z(-24),z1:Z(-16),h:18});}
  itb('steel',X(-1.8),X(-1.6),0,18,Z(-20.2),Z(-16));itb('steel',X(1.6),X(1.8),0,18,Z(-20.2),Z(-16));itb('steel',X(-1.8),X(1.8),0,18,Z(-20.4),Z(-20.2));
  addCol({t:'b',x0:X(-1.8),x1:X(-1.6),z0:Z(-20.2),z1:Z(-16),h:18});addCol({t:'b',x0:X(1.6),x1:X(1.8),z0:Z(-20.2),z1:Z(-16),h:18});addCol({t:'b',x0:X(-1.8),x1:X(1.8),z0:Z(-20.4),z1:Z(-20.2),h:18});
  for(const y of Y){itb('marbleDk',X(-1.8),X(1.8),y+2.8,y+(y===Y[2]?6:6)-.3,Z(-16.1),Z(-15.9));glow(textTex(L('THANG MÁY','ELEVATOR'),{fg:'#c1f354',bg:'#111',size:54,w:512,h:96}),MX,y+3.3,MZ-15.85,1.8,.34,0,1);
    for(const sx of[-1,1])glow(textTex('WC',{fg:'#fff',bg:'#1d3557',size:70,w:256,h:128}),X(sx*5),y+2.4,MZ-15.95,.9,.45,0,1);}
  const UNITS=[];// [level, x0,x1,z0,z1, front, type]
  const back=[[-32,-20],[-20,-8],[8,20],[20,32]],side=[[-16,-3],[-3,10]];
  const LT=[['mart24','jewel','tech','pharmacy','clothes','shoes','toys','books'],['barber','nails','urban','cosm','sport','watch','bags','optic','arcade','coffee'],['com','pizza','boba','pho','bbq','sushi','kem','coffee','outlet','arcade']];
  for(let lv=0;lv<3;lv++){const T0=LT[lv];let i=0;for(const[a,b]of back)UNITS.push([lv,a,b,-24,-16,'z1',T0[i++]]);for(const[c,d]of side){UNITS.push([lv,-32,-24,c,d,'x1',T0[i++]]);UNITS.push([lv,24,32,c,d,'x0',T0[i++]]);}
    if(lv>0){UNITS.push([lv,-32,-8,16,24,'z0',T0[i++]]);UNITS.push([lv,8,32,16,24,'z0',T0[i++]]);}}
  for(const[lv,a,b,c,d,front,type]of UNITS){const y=Y[lv],F=UF(X(a),X(b),Z(c),Z(d),front),W=F.W,D=F.D,top=lv===2?18:y+5.7;
    // party walls, the glass front with a 3.2 m opening, a header with the shop sign
    ubox(F,'plasterW',-.1,.1,y,top,0,D,{col:1,lv});ubox(F,'plasterW',W-.1,W+.1,y,top,0,D,{col:1,lv});
    const o0=W/2-1.6,o1=W/2+1.6;ubox(F,'mglass',.1,o0,y,y+3.6,-.04,.04,{col:1,lv});ubox(F,'mglass',o1,W-.1,y,y+3.6,-.04,.04,{col:1,lv});
    for(const u of[.1,o0,o1,W-.1])ubox(F,'dark',u-.05,u+.05,y,y+3.6,-.06,.06);ubox(F,'plasterW',.1,W-.1,y+3.6,top,-.12,.02);ubox(F,'dark',.1,W-.1,y,y+.12,-.07,.07);
    const[sx,sz]=F.p(W/2,-.14);shopSign(type,sx,y+4.6,sz,F.h,Math.min(W-2,8),1.25);
    for(let u=2;u<W-1;u+=3.5)for(let v=2;v<D-1;v+=3.5){const[px,pz]=F.p(u,v);IE.push([px,top-.04,pz]);}
    furnish(F,type,y,lv,'mall',R);}
  // food court tables on the top floor, benches and planters along the corridors
  for(const x of[-26,-20,-14,14,20,26])for(const z of[-12,12]){const y=Y[2];cyl('marbleTop',X(x),y+.73,y+.77,Z(z),.6,.6,22);cyl('dark',X(x),y,y+.73,Z(z),.05,.05,8);for(const a of[0,1.57,3.14,4.71]){const cx=X(x)+Math.sin(a)*.95,cz=Z(z)+Math.cos(a)*.95;cyl('red',cx,y+.42,y+.48,cz,.2,.2,14);cyl('dark',cx,y,y+.42,cz,.03,.03,6);}mcol(X(x)-.7,X(x)+.7,Z(z)-.7,Z(z)+.7,y,y+.8,2);}
  for(let lv=0;lv<3;lv++){const y=Y[lv];for(const x of[-20,20]){itb('oak',X(x-1.2),X(x+1.2),y,y+.45,Z(-12.3),Z(-11.7));mcol(X(x-1.2),X(x+1.2),Z(-12.3),Z(-11.7),y,y+.5,lv);}
    for(const[x,z]of[[-15,-10.5],[15,-10.5],[-15,10.5],[15,10.5]]){cyl('pot',X(x),y,y+.55,Z(z),.45,.55,16);for(let k=0;k<5;k++)sph('leaf',X(x)+rnd(-.3,.3),y+.9+k*.18,Z(z)+rnd(-.3,.3),.42-k*.04,1.15);mcol(X(x)-.55,X(x)+.55,Z(z)-.55,Z(z)+.55,y,y+1.5,lv);}}
  // a few shoppers
  for(const[lv,x,z,h]of[[0,-16,-11,.4],[0,17,-10,-.6],[0,-4,15,3],[0,9,12,2.5],[1,-18,-11,0],[1,20,11,3.1],[1,-25,10,1.6],[2,-21,-13,0],[2,19,-12,.3],[2,-6,12,3]]){const H=extra(randomLook('ped'),X(x),Z(z),h);H.root.position.y=Y[lv];}
  R.lights=[[MX,5.2,MZ,1.2,'#fff4e6',30],[MX-18,5.2,MZ-12,1,'#fff4e6',22],[MX+18,5.2,MZ+12,1,'#fff4e6',22]];}
/* ---------- escalators: A climbs from the ground floor (east) to floor 2 (west), B from floor 2 (west) to floor 3 (east) ---------- */
const ESC=[];
{const MX=MALL.X,MZ=MALL.Z;const stepTex=makeTex(64,64,(g,w,h)=>{g.fillStyle='#3b3f45';g.fillRect(0,0,w,h);g.fillStyle='#9aa1a9';for(let x=0;x<w;x+=4)g.fillRect(x,0,2,h);g.fillStyle='#ffd166';g.fillRect(0,0,w,3);});stepTex.wrapS=stepTex.wrapT=T.RepeatWrapping;
  const stepM=new T.MeshStandardMaterial({map:stepTex,metalness:.6,roughness:.45,side:T.DoubleSide});const glassM=IMAT.mglass,steelM=new T.MeshStandardMaterial({color:lin('#c9ced4'),metalness:.9,roughness:.25}),railM=new T.MeshStandardMaterial({color:lin('#111'),roughness:.5});
  const mk=(id,z0,z1,xa,ya,xb,yb)=>{const g=new GB(),len=hyp(xb-xa,yb-ya),n=[-(yb-ya)/len*Math.sign(xb-xa),Math.abs(xb-xa)/len,0];
    g.quad([xa,ya+.02,z1],[xb,yb+.02,z1],[xb,yb+.02,z0],[xa,ya+.02,z0],n,[[0,0],[len/0.4,0],[len/0.4,1],[0,1]]);const me=new T.Mesh(g.geo(),stepM);me.receiveShadow=Q.shadows;scene.add(me);
    const ang=Math.atan2(yb-ya,xb-xa),mx=(xa+xb)/2,my=(ya+yb)/2;
    const bar=(m,w,h,d,dy,z)=>{const b=new T.Mesh(new T.BoxGeometry(w,h,d),m);b.position.set(mx,my+dy,z);b.rotation.z=ang;scene.add(b);return b;};
    bar(steelM,len,.7,z1-z0+.3,-.42,(z0+z1)/2);for(const z of[z0-.06,z1+.06]){bar(glassM,len,1.0,.04,.55,z);bar(railM,len,.08,.12,1.08,z);bar(steelM,len,.18,.12,.05,z);}
    for(const[x,y]of[[xa,ya],[xb,yb]]){const p=new T.Mesh(new T.BoxGeometry(1.2,.03,z1-z0),steelM);p.position.set(x+Math.sign(xb-xa)*(x===xa?-.6:.6),y+.015,(z0+z1)/2);scene.add(p);}
    for(const z of[z0-.12,z1+.12]){const x0=Math.min(xa,xb),x1=Math.max(xa,xb);addCol({t:'b',x0,x1,z0:z-.06,z1:z+.06,h:Math.max(ya,yb)+1.2,lv:id});}
    ESC.push({id,z0,z1,xa,ya,xb,yb,tex:stepTex});};
  mk('A',MZ-5.2,MZ-2.8,MX+12,0,MX-12,6);addCol({t:'b',x0:MX-1,x1:MX+11.3,z0:MZ-5.35,z1:MZ-2.65,h:3,y0:0,lv:0});mk('B',MZ+2.8,MZ+5.2,MX-12,6,MX+12,12);}
/* ---------- elevator: glass cab in the back core; call it from any floor, choose a floor inside ---------- */
const ELEV={y:0,lvl:0,tgt:0,st:'idle',door:1,dc:[],pan:[]};
{const MX=MALL.X,MZ=MALL.Z,cz=MZ-18;const g=new T.Group();g.position.set(MX,0,cz);scene.add(g);ELEV.g=g;
  const steel=new T.MeshStandardMaterial({color:lin('#c9ced4'),metalness:.9,roughness:.22}),floorM=new T.MeshStandardMaterial({color:lin('#2b2d31'),roughness:.4}),lightM=new T.MeshBasicMaterial({color:lin('#fff6e0'),toneMapped:false}),mir=new T.MeshStandardMaterial({color:lin('#dfe7ee'),metalness:1,roughness:.05});
  const add=(m,w,h,d,x,y,z)=>{const b=new T.Mesh(new T.BoxGeometry(w,h,d),m);b.position.set(x,y,z);g.add(b);return b;};
  add(floorM,3.2,.12,3.9,0,-.06,0);add(steel,3.2,.1,3.9,0,2.75,0);add(lightM,2.2,.02,2.6,0,2.69,0);add(mir,3.2,2.7,.06,0,1.35,-1.95);add(steel,.06,2.7,3.9,-1.6,1.35,0);add(steel,.06,2.7,3.9,1.6,1.35,0);add(railM2(),2.8,.05,.05,0,.95,-1.85);
  function railM2(){return new T.MeshStandardMaterial({color:lin('#111'),roughness:.4});}
  const pan=add(new T.MeshBasicMaterial({color:lin('#111'),toneMapped:false}),.3,.5,.04,1.35,1.3,-1.9);
  for(let k=0;k<3;k++){const y=MALL.Y[k];const ps=[];for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(1.6,2.75,.06),steel);p.position.set(MX+s*.8,y+1.4,MZ-15.95);scene.add(p);ps.push(p);}ELEV.pan.push(ps);
    ELEV.dc.push(addCol({t:'b',x0:MX-1.6,x1:MX+1.6,z0:MZ-16.15,z1:MZ-15.9,h:y+3,y0:y,lv:k}));}}
function elevGo(k){if(ELEV.st!=='idle')return;if(ELEV.lvl===k&&ELEV.door>.9)return;ELEV.tgt=k;ELEV.st='closing';}
SHOPS.elev={n:L('Thang máy · chọn tầng','Elevator · choose a floor'),items:[0,1,2].map(k=>({n:[L('Tầng 1 · Siêu thị, trang sức, công nghệ','Floor 1 · Market, jewellery, tech'),L('Tầng 2 · Thời trang, tóc, nail, arcade','Floor 2 · Fashion, hair, nails, arcade'),L('Tầng 3 · Khu ẩm thực','Floor 3 · Food court')][k],d:'',p:0,label:'→',ok:()=>ELEV.lvl!==k,fn:()=>{closeShop();elevGo(k);}}))};
function inShaft(x,z){const lx=x-MALL.X,lz=z-MALL.Z;return Math.abs(lx)<1.6&&lz>-20.2&&lz<-15.95;}
function mallGround(x,z,y){const lx=x-MALL.X,lz=z-MALL.Z;MALL.ramp=null;if(inShaft(x,z))return ELEV.y;let g=0;const inVoid=Math.abs(lx)<12&&Math.abs(lz)<8;
  if(!inVoid){if(6<=y+.7)g=6;if(12<=y+.7)g=12;}
  if(Math.abs(lx)<=12.6){if(lz>-5.2&&lz<-2.8){const ry=clamp((12-lx)/24*6,0,6);if(ry<=y+.7&&ry>=g-.01){g=ry;MALL.ramp=lx<12&&lx>-12?'A':null;}}
    if(lz>2.8&&lz<5.2){const ry=clamp(6+(lx+12)/24*6,6,12);if(ry<=y+.7&&ry>=g-.01){g=ry;MALL.ramp=lx<12&&lx>-12?'B':null;}}}
  return g;}
function mallOption(){if(P.inside!=='mall')return null;const lz=P.z-MALL.Z,lx=P.x-MALL.X;
  if(inShaft(P.x,P.z)&&ELEV.st==='idle')return{k:'E',txt:L('Thang máy · chọn tầng','Elevator · choose a floor'),fn:()=>openShop('elev')};
  if(Math.abs(lx)<2.4&&lz>-16&&lz<-13.4&&ELEV.st==='idle'&&(ELEV.lvl!==MALL.lv||ELEV.door<.5))return{k:'E',txt:L('Gọi thang máy','Call the elevator'),fn:()=>elevGo(MALL.lv)};
  return null;}
let mallAmb=null;
function mallTick(dt){const inM=P.inside==='mall';if(!mallAmb){mallAmb=new T.HemisphereLight(lin('#fff6ea'),lin('#b9b3a8'),0);scene.add(mallAmb);}mallAmb.intensity=inM?.28:0;
  for(const e of ESC)e.tex.offset.x=(e.tex.offset.x+dt*1.4/.4)%1;
  const E=ELEV;if(E.st==='closing'){E.door=Math.max(0,E.door-dt*1.5);if(E.door<=0)E.st=E.lvl===E.tgt?'opening':'moving';}
  else if(E.st==='moving'){const ty=MALL.Y[E.tgt],d=ty-E.y,s=Math.min(Math.abs(d),dt*2.6);E.y+=Math.sign(d)*s;if(Math.abs(ty-E.y)<.001){E.y=ty;E.lvl=E.tgt;E.st='opening';robDing();}}
  else if(E.st==='opening'){E.door=Math.min(1,E.door+dt*1.5);if(E.door>=1)E.st='idle';}
  E.g.position.y=E.y;E.pan.forEach((ps,k)=>{const o=(k===E.lvl&&E.st!=='moving')?E.door:0;ps[0].position.x=MALL.X-.8-o*1.45;ps[1].position.x=MALL.X+.8+o*1.45;});
  E.dc.forEach((c,k)=>{c.off=k===E.lvl&&E.door>.75&&E.st!=='moving';});
  if(!inM){MALL.ramp=null;return;}
  if(inShaft(P.x,P.z)&&(E.st==='moving')){P.y=E.y;P.vy=0;P.H.root.position.y=E.y;}
  MALL.lv=P.y>=10.8?2:P.y>=4.8?1:0;
  if(MALL.ramp==='A')P.x-=dt*1.3;else if(MALL.ramp==='B')P.x+=dt*1.3;
  const Rl=MALL.R.lights,y=MALL.Y[MALL.lv];Rl[0][0]=P.x;Rl[0][1]=y+5.2;Rl[0][2]=P.z;Rl[1][1]=Rl[2][1]=y+5.2;}
/* ---------- a door on every building that has none: offices, flats, warehouses, and new 24h stores, barbers and nail salons ---------- */
const SHOP2POI=[];
{const pts=[];const grab=(o,d)=>{if(!o||d>3||typeof o!=='object'||o.isObject3D)return;if(typeof o.x==='number'&&typeof o.z==='number')pts.push(o);if(Array.isArray(o))o.forEach(v=>grab(v,d+1));else for(const k in o)grab(o[k],d+1);};grab(SP,0);
  for(const d of GDOORS)pts.push(d);
  const cyc=['mart24','barber','nails'];let nShop=0,nAll=0;const doorParts=[];
  // the downtown mall entrance on the biggest downtown building
  let mallB=null;{let ba=0;for(const c of blds){if(c.x0>2400)continue;const b=blockAt((c.x0+c.x1)/2,(c.z0+c.z1)/2);if(!b||b.d!=='downtown')continue;const a=(c.x1-c.x0)*(c.z1-c.z0);if(a>ba&&a<6000){ba=a;mallB=c;}}}
  const addDoor=(x,z,h,room)=>{const fx=Math.sin(h),fz=Math.cos(h),ox=x+fx*1.4,oz=z+fz*1.4;if(resolve(ox,oz,.45)||inBld(ox,oz)||resolve(x+fx*3,z+fz*3,.6)||inBld(x+fx*3,z+fz*3))return false;
      const gy=groundY(ox,oz);const w=room==='mall'?3.6:room==='ware'?3.4:1.8,ht=room==='mall'||room==='ware'?3.3:2.6;
      if(Math.abs(fz)>.5)doorParts.push([x,gy,z+fz*.06,w,ht,.12,room==='flat'?'#5a3d28':'#22323f'],[x,gy+ht,z+fz*.07,w+.3,.16,.14,'#e8dfcc']);else doorParts.push([x+fx*.06,gy,z,.12,ht,w,room==='flat'?'#5a3d28':'#22323f'],[x+fx*.07,gy+ht,z,.14,.16,w+.3,'#e8dfcc']);
      GDOORS.push({id:'x'+GDOORS.length,x:ox,z:oz,h,room});pts.push({x:ox,z:oz});
      if(SHOPTYPE[room]){const S=SHOPTYPE[room];shopSignQ(room,x+fx*.1,gy+ht+.75,z+fz*.1,h,3.8,.62);SHOP2POI.push({n:S.n,x:ox,z:oz,i:S.bg==='#f8f9fa'?'#e63946':S.bg});}
      if(room==='mall'){sign('NEXUS MALL',x+fx*.12,gy+ht+1.6,z+fz*.12,h,12,2,{fg:'#fff',bg:'#e63946',size:96,w:1024,h:160});SP.mall={x:ox,z:oz};}
      return true;};
  // a face already has a door if any known door point sits within 3 m in front of it
  const faceHas=(c,h)=>{const fx=Math.round(Math.sin(h)),fz=Math.round(Math.cos(h));for(const p of pts){if(fz){const z=fz>0?c.z1:c.z0,d=(p.z-z)*fz;if(d>-1&&d<3.2&&p.x>c.x0-1&&p.x<c.x1+1)return true;}else{const x=fx>0?c.x1:c.x0,d=(p.x-x)*fx;if(d>-1&&d<3.2&&p.z>c.z0-1&&p.z<c.z1+1)return true;}}return false;};
  const faces=c=>{const cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2;return[[cx,c.z1,0,c.x1-c.x0,'x'],[cx,c.z0,Math.PI,c.x1-c.x0,'x'],[c.x1,cz,Math.PI/2,c.z1-c.z0,'z'],[c.x0,cz,-Math.PI/2,c.z1-c.z0,'z']];};
  if(mallB){for(const[x,z,h]of faces(mallB))if(addDoor(x,z,h,'mall'))break;}
  for(const c of blds){if(c.x0>2400||c===mallB)continue;const w=c.x1-c.x0,d=c.z1-c.z0,a=w*d;if(w<4||d<4||a>9000)continue;const cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2,gy=groundY(cx,cz),hh=c.h-gy;if(hh<3)continue;
    if(AIR.term&&cx>AIR.term.x0-5&&cx<AIR.term.x1+5&&cz>AIR.term.z0-5&&cz<AIR.term.z1+5)continue;
    for(const[x,z,h,len,ax]of faces(c)){if(len<5||faceHas(c,h))continue;
      let room=hh>22?(nAll%5===0?'hotel':'office'):a>900&&hh<14?'ware':'flat';if(room!=='ware'&&hh<18&&nAll%6===1)room=cyc[nShop%3];
      for(const off of[0,-len/4,len/4]){const px=ax==='x'?x+off:x,pz=ax==='z'?z+off:z;if(addDoor(px,pz,h,room)){nAll++;if(SHOPTYPE[room])nShop++;break;}}}}
  for(const t in SIGNGB){const m=new T.Mesh(SIGNGB[t].geo(),signMat(t));scene.add(m);}
  for(const p of doorParts)IM.push({geo:_bx.g||(_bx.g=new T.BoxGeometry(1,1,1)),pos:[p[0],p[1]+p[4]/2,p[2]],scale:[p[3],p[4],p[5]],color:p[6]});
  console.log('[nexus] doors added',nAll,'shops',nShop);}
function shopsTick(dt){mallTick(dt);robTick(dt);}

for(const C of COURTS)buildParkCourts(C);
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
  if(R&&!R.open){sun.intensity*=.12;hemi.intensity=R.bright?.75:Math.min(hemi.intensity,.32);}
  rain.visible=!R||!!R.open;
  ILIGHTS.forEach((l,i)=>{const s=R&&R.lights[i];if(s){l.position.set(s[0],s[1],s[2]);l.intensity=s[3]*(MOBILE?1.6:1);l.color.set(s[4]).convertSRGBToLinear();l.distance=s[5]||14;}else l.intensity=0;});}
function fade(fn){const f=hud.fade;f.classList.add('on');setTimeout(()=>{fn();setTimeout(()=>f.classList.remove('on'),120);},260);}
function enterInterior(id,out){if(P.car)return;const R=ROOMS[id];curDoor=out||null;fade(()=>{P.outside=out?{x:out.x-Math.sin(out.h)*1.2,z:out.z-Math.cos(out.h)*1.2,h:out.h}:{x:P.x,z:P.z,h:P.h+Math.PI};P.sit=null;P.inside=id;P.x=R.door.x;P.z=R.door.z-.6;P.y=0;P.vy=0;P.h=Math.PI;cam.yaw=Math.PI;camera.position.set(P.x,2,P.z+3);sfx('door');if(id==='bank')tutEvent('bank');});}
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
  {n:'Công viên trung tâm',x:SP.parkMain.x,z:SP.parkMain.z,i:'#5fbf5a'},...(SP.courts?[{n:LL('Sân bóng rổ ngoài trời','Outdoor courts'),x:SP.courts.x,z:SP.courts.z,i:'#2c5f9e'}]:[]),...(SP.arena?[{n:LL('Nhà thi đấu bóng rổ','Basketball arena'),x:SP.arena.x,z:SP.arena.z,i:'#e0561b'}]:[]),{n:'Vòng quay bãi biển',x:FW.x-10,z:FW.z,i:'#ff7ad9'},{n:'Cầu tàu',x:FW.pier.x0-2,z:FW.pier.z,i:'#3ef0e0'}];
  const SC={food:'#ffb703',mart:'#e63946',clothes:'#ad8dff',guns:'#8f1a20',cars:'#c1f354',gym:'#2d6a4f',garage:'#ffd166'};const seen={};for(const sh of SP.shops){if(sh.id==='mart'&&seen.mart)continue;seen[sh.id]=1;L.push({n:SHOPS[sh.id].n,x:sh.x,z:sh.z,i:SC[sh.id]||'#fff'});}
  if(SP.mall)L.push({n:'Nexus Mall',x:SP.mall.x,z:SP.mall.z,i:'#c1f354'});for(const s of SHOP2POI.filter((s,i,a)=>a.findIndex(o=>o.n===s.n)===i))L.push(s);
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
  {t:'Camera',d:'Bấm vào màn hình một lần, rồi chỉ cần di chuột hoặc touchpad để xoay camera (Esc để hiện chuột). Trên điện thoại thì vuốt màn hình.',ok:()=>tut.turned>1.2},
  {t:'Chạy',d:'Giữ Shift trong lúc đi để chạy nhanh.',ok:()=>tut.sprint>1.5},
  {t:'Đánh nhau',d:'Bấm J hoặc click trái để đánh. Bấm liền 3 lần ra combo: đấm trái, đấm phải, đá. Giữ K hoặc chuột phải để đỡ. Đánh bao cát 3 lần.',ok:()=>bag&&bag.hits>=3,mark:()=>bag},
  {t:'Lên xe',d:'Lại gần chiếc xe đậu ở lối vào nhà rồi bấm F.',ok:()=>!!P.car,mark:()=>homeCar},
  {t:'Lái xe',d:'W tăng tốc, S phanh và lùi, A/D lái, Space phanh tay. Lái tới điểm vàng.',ok:()=>tut.drove,mark:()=>tut.drivePt},
  {t:'Xuống xe',d:'Dừng lại và bấm F để xuống xe.',ok:()=>!P.car},
  {t:'Bản đồ',d:'Bấm M (hoặc nút Bản đồ) để mở bản đồ. Bấm vào một địa điểm để được chỉ đường, mũi tên sẽ hiện trên mặt đường.',ok:()=>tut.map},
  {t:'Cửa hàng',d:'Ghé một cửa hàng và bấm E ở cửa. Cơm Tấm Cô Ba bán đồ ăn hồi máu. Bấm số để mua, E để đóng.',ok:()=>tut.shop,mark:()=>SP.shops.find(s=>s.id==='food')},
  {t:'Vũ khí',d:'Súng mua ở Súng Tầm Xa. Phím 1 đến 4 để đổi vũ khí. Cầm súng là vòng ngắm hiện giữa màn hình, di chuột để ngắm, vẫn đi bằng WASD, bấm B để bắn. Bắn người là phạm tội.',ok:()=>tut.wT>8},
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
.nc-lock{position:absolute;left:50%;top:64px;transform:translateX(-50%);background:rgba(0,0,0,.62);color:#fff;font:600 13px Inter,sans-serif;padding:8px 14px;border-radius:999px;pointer-events:none;white-space:nowrap}
.nc-cross{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border:2px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.5)}.nc-cross{transition:transform .15s,border-color .1s,opacity .15s;opacity:.55}.nc-cross.aim{transform:scale(1.35);opacity:1}.nc-cross.hot{border-color:#ff3b47;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 12px rgba(255,59,71,.8)}.nc-cross.hot::after{background:#ff3b47}.nc-cross::after{content:'';position:absolute;left:50%;top:50%;width:3px;height:3px;margin:-1.5px;background:#fff;border-radius:50%}
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
.nc-hp{position:absolute;inset:0;pointer-events:none;z-index:8}.nc-hp[hidden]{display:none}.nc-hp-sc{position:absolute;top:58px;left:50%;transform:translateX(-50%);display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;background:rgba(8,10,14,.72);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:6px 14px;color:#fff;font-weight:700;font-size:14px;max-width:92vw}.nc-hp-sc b{font-size:20px;color:#ffd166;margin:0 2px}.nc-hp-sc i{font-style:normal;color:#9aa3ad;font-size:12px}.nc-hp-sc em{font-style:normal;color:#7df9ff;font-size:12px;width:100%;text-align:center}.nc-hp-b{position:absolute;right:14px;top:50%;transform:translateY(-50%);display:grid;gap:8px;pointer-events:auto}.nc-hp-b button{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:132px;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 12px;background:linear-gradient(180deg,rgba(230,110,40,.92),rgba(170,60,15,.92));color:#fff;font:700 14px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);touch-action:none}.nc-hp-b button:active{transform:scale(.96)}.nc-hp-b button[data-hk='e']{background:rgba(20,24,30,.85)}.nc-hp-b button[data-hk='1v1']{background:linear-gradient(180deg,#3d6bff,#2a3fb0)}.nc-hp-b kbd{font:600 11px system-ui;background:rgba(0,0,0,.3);border-radius:6px;padding:2px 6px}@media (pointer:coarse){.nc-hp-b{right:auto;left:12px;top:42%}.nc-hp-b button{min-width:96px;padding:12px 10px}}
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
<div class="nc-tr"><div class="nc-clock"></div><div class="nc-money"></div><div class="nc-dirty"></div><div class="nc-stars"></div><div class="nc-fist" title="Đổi vũ khí (1-4)"><span class="e">✊</span></div></div><div class="nc-cross" hidden></div><div class="nc-lock" hidden>${L('Bấm vào màn hình để điều khiển bằng chuột / touchpad','Click the screen to control with the mouse / touchpad')}</div>
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
hud.lockHint=$h('.nc-lock');hud.lockHint.hidden=MOBILE;
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
  if(MP.on)for(const id in MP.others){const o=MP.others[id];if((o.d.i||null)!==(P.inside||null))continue;const p=tr(o.x,o.z);g.fillStyle='#c1f354';g.strokeStyle='#0a0c14';g.lineWidth=2;g.beginPath();g.arc(p[0],p[1],5,0,7);g.fill();g.stroke();}
  for(const c of cars)if(c.kind==='police'&&stars>0){const p=tr(c.x,c.z);g.fillStyle=Math.floor(time*6)%2?'#ff3b3b':'#3b7bff';g.beginPath();g.arc(p[0],p[1],4,0,7);g.fill();}
  const h=(P.car?P.car.h:P.h);g.save();g.translate(Wd/2,Hd*.62);g.rotate(cam.yaw-h);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(0,-10);g.lineTo(7,8);g.lineTo(0,4);g.lineTo(-7,8);g.closePath();g.fill();g.stroke();g.restore();}
function pin(g,x,y,s){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle='#ff5fd2';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-3,-6,-9,-9,-9,-15);g.arc(0,-15,9,Math.PI,0);g.bezierCurveTo(9,-9,3,-6,0,0);g.fill();g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(0,-15,3.5,0,7);g.fill();g.restore();}
const mapS=()=>hud.mapC.width/Math.max(mapBg.width,mapBg.height),mapOY=()=>(hud.mapC.height-mapBg.height*mapS())/2;
function drawBigMap(){const c=hud.mapC,g=c.getContext('2d'),s=mapS();g.fillStyle='#111';g.fillRect(0,0,c.width,c.height);const oy=mapOY();g.drawImage(mapBg,0,oy,mapBg.width*s,mapBg.height*s);
  const tr=(x,z)=>[(x-MAPX0)*MK1*s,(z-MAPZ0)*MK1*s+oy];
  if(gps.pts){g.lineJoin='round';g.lineCap='round';const path=()=>{g.beginPath();gps.pts.forEach((p,k)=>{const q=tr(p[0],p[1]);k?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);});};path();g.lineWidth=7;g.strokeStyle='rgba(0,0,0,.6)';g.stroke();path();g.lineWidth=4;g.strokeStyle=gps.col;g.stroke();}
  // labels never overlap: icons first, then each name tries right, left, above, below; names that do not fit appear when you hover the dot
  const items=poiList().map(p=>({p,q:tr(p.x,p.z)})),boxes=[],hit=b=>b.x0<2||b.x1>c.width-2||b.y0<oy+70||boxes.some(o=>b.x0<o.x1&&b.x1>o.x0&&b.y0<o.y1&&b.y1>o.y0);
  for(const it of items){icon(g,it.q[0],it.q[1],it.p.i,it.p.i.length>6?1.3:1.6);boxes.push({x0:it.q[0]-10,x1:it.q[0]+10,y0:it.q[1]-10,y1:it.q[1]+10});}
  g.font='700 17px Inter';g.lineJoin='round';MAPLAB=[];
  const drawLab=(t,x,y,al,col)=>{g.textAlign=al;g.lineWidth=4;g.strokeStyle='rgba(0,0,0,.85)';g.strokeText(t,x,y);g.fillStyle=col||'#fff';g.fillText(t,x,y);};
  for(const it of items){const t=it.p.n,w=g.measureText(t).width,[x,y]=it.q;let done=false;
    for(const[cx,cy,al]of[[x+13,y+6,'left'],[x-13,y+6,'right'],[x,y-15,'center'],[x,y+28,'center']]){const x0=al==='left'?cx:al==='right'?cx-w:cx-w/2,b={x0:x0-2,x1:x0+w+2,y0:cy-15,y1:cy+5};if(hit(b))continue;boxes.push(b);drawLab(t,cx,cy,al);done=true;break;}
    MAPLAB.push({x,y,t,shown:done});}
  if(MAPHOV&&!MAPHOV.shown){g.font='800 18px Inter';const w=g.measureText(MAPHOV.t).width;g.fillStyle='rgba(10,12,20,.88)';g.fillRect(MAPHOV.x+12,MAPHOV.y-14,w+16,26);g.strokeStyle='#c1f354';g.lineWidth=1.5;g.strokeRect(MAPHOV.x+12,MAPHOV.y-14,w+16,26);g.textAlign='left';g.fillStyle='#fff';g.fillText(MAPHOV.t,MAPHOV.x+20,MAPHOV.y+5);}
  // other players in multiplayer, always on top
  let mpOn=false;try{mpOn=MP.on;}catch(_){}
  if(mpOn)for(const id in MP.others){const o=MP.others[id];if((o.d.i||null)!==null)continue;const q=tr(o.x,o.z);g.fillStyle='#c1f354';g.strokeStyle='#0a0c14';g.lineWidth=3;g.beginPath();g.arc(q[0],q[1],8,0,7);g.fill();g.stroke();
    g.font='800 16px Inter';const nm=String(o.name||'Player').slice(0,18),w=g.measureText(nm).width;g.fillStyle='rgba(10,12,20,.85)';g.fillRect(q[0]-w/2-7,q[1]-34,w+14,22);g.fillStyle='#c1f354';g.textAlign='center';g.fillText(nm,q[0],q[1]-18);}
  g.textAlign='left';
  if(MK.target.visible)icon(g,...tr(MK.target.position.x,MK.target.position.z),'#ffd166',1.6);
  if(gps.wp){const q=tr(gps.wp.x,gps.wp.z);pin(g,q[0],q[1],1.6);}
  const t=P.car||P,p=tr(t.x,t.z),h=P.car?P.car.h:P.h;g.save();g.translate(p[0],p[1]);g.rotate(Math.PI-h);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(0,-13);g.lineTo(9,10);g.lineTo(0,5);g.lineTo(-9,10);g.closePath();g.fill();g.stroke();g.restore();
  g.fillStyle='#fff';g.font='700 26px "Space Grotesk",Inter';g.textAlign='left';g.fillText('NEXUS CITY',16,mapOY()+34);
  if(WILD.places){g.font='600 19px Inter';g.fillStyle='#d6f5ff';g.fillText(L('Khám phá ','Explored ')+WILD.places.filter(p=>save.disc[p.id]).length+'/'+WILD.places.length+'   ·   '+L('Kim cương ','Diamonds ')+(save.dia||[]).length+'/'+DIAS.length+'   ·   '+L('Ngọc Nexus ','Nexus gems ')+save.gems.length+'/'+WILD.gems.length,16,mapOY()+62);}}
function renderPOI(){hud.poi.innerHTML='';for(const p of poiList()){const b=document.createElement('button');b.type='button';const col=p.i==='bank'?'#4ade80':p.i==='house'?'#ffffff':p.i==='hosp'?'#d62828':p.i==='police'?'#3d6fd6':p.i;b.innerHTML='<i style="background:'+col+'"></i>';b.appendChild(document.createTextNode(p.n));b.addEventListener('click',()=>{setWaypoint(p.x,p.z,p.n);gpsUpdate(0);drawBigMap();});hud.poi.appendChild(b);}}
let MAPLAB=[],MAPHOV=null,mapT=0;
hud.mapC.addEventListener('mousemove',e=>{const c=hud.mapC,r=c.getBoundingClientRect(),px=(e.clientX-r.left)*c.width/r.width,py=(e.clientY-r.top)*c.height/r.height;let best=null,bd=16;for(const l of MAPLAB){const d=Math.hypot(l.x-px,l.y-py);if(d<bd){bd=d;best=l;}}if(best!==MAPHOV){MAPHOV=best;hud.mapC.style.cursor=best?'pointer':'';drawBigMap();}});
let mapOpen=false;function toggleMap(){mapOpen=!mapOpen;hud.map.hidden=!mapOpen;if(mapOpen)freeMouse();else backMouse();if(mapOpen){gps.t=0;gpsUpdate(0);drawBigMap();renderPOI();tutEvent('map');}}
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
/* ---------- gun aiming (desktop): B = raise the gun and show the aim circle; B again = shoot. While aiming, the mouse/touchpad
   or WASD/arrows move the circle; right click or Esc lowers the gun. A light aim assist snaps to the nearest target on raise
   and pulls the circle gently when it is almost on someone. ---------- */
const AIM={on:false,pitch:0,onT:false};
const aimArmed=()=>P.weapon!=='fist'&&!P.car&&!P.plane&&!P.tour&&!P.sit&&!P.seq;
function aimTargets(){const out=[];for(const n of npcs){if(n.state==='down'||!n.H||!n.H.root.visible)continue;out.push({x:n.x,y:(n.y||0)+1.25,z:n.z});}
  if(typeof stHeli!=='undefined'&&stHeli&&stHeli.g&&!stHeli.dead)out.push({x:stHeli.g.position.x,y:stHeli.g.position.y,z:stHeli.g.position.z,heli:1});return out;}
function aimEye(){return {x:P.x-Math.cos(cam.yaw)*.75,y:1.9+P.y,z:P.z+Math.sin(cam.yaw)*.75};}
function aimAssist(snap,dt){const W=WEAP[P.weapon];if(!W)return;const e=aimEye();let best=null,bs=snap?.75:.09;
  for(const t of aimTargets()){const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz);if(d>W.range||d<1.5)continue;const yw=Math.atan2(dx,dz),pt=-Math.atan2(t.y-e.y,d);
    const sc=Math.abs(angD(yw,cam.yaw))+Math.abs(pt-AIM.pitch)*.7;if(sc<bs){bs=sc;best={yw,pt};}}
  if(!best)return;const k=snap?1:1-Math.exp(-5*dt);cam.yaw=lerpA(cam.yaw,best.yw,k);AIM.pitch+=(best.pt-AIM.pitch)*k;}
function aimOn(){if(!aimArmed()||MOBILE)return;AIM.on=true;AIM.pitch=clamp(-(cam.pitch-.28)*.9,-.5,.4);P.trigger=false;cam.lastDrag=performance.now();}
function aimOff(){if(!AIM.on)return;AIM.on=false;P.trigger=false;cam.pitch=clamp(.28-AIM.pitch/.9,.12,.6);}
function mouseLock(){if(MOBILE||!active||paused||mapOpen||shopOpen||document.pointerLockElement===cv)return;try{const r=cv.requestPointerLock&&cv.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(_){}}
function aimKey(){if(!aimArmed()){if(P.weapon==='fist'&&!P.car)showPrompt(L('Bấm 2, 3 hoặc 4 để cầm súng rồi bấm B để bắn','Press 2, 3 or 4 to hold a gun, then B to shoot'),1.8);return;}
  if(!AIM.on)aimOn();P.trigger=true;}
function onKey(e){if(!active)return;sfxInit();const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(movKey(k)||cinKey(k)){keys.clear();return;}if(e.repeat){keys.add(k);return;}
  if(shopOpen){if(k==='e'||k==='backspace')closeShop();else if(/^[1-9]$/.test(k)){const it=shopItems(shopOpen)[+k-1];if(it)buyItem(it);}return;}
  if(k==='m')toggleMap();else if(mapOpen)return;
  if(HP.on&&hpKey(k)){keys.add(k);return;}
  if(k==='f')toggleCar();if(k==='b'&&!MOBILE)aimKey();if(k==='x')robKey();if(k==='j'){if(P.weapon!=='fist'&&!P.car){if(!MOBILE)aimKey();else P.trigger=true;}else playerPunch();}if(k==='h'&&P.car)sfx('horn');if(k>='1'&&k<='4')selectWeapon(WORDER[+k-1]);if(k==='e')interact();if(k==='r')radioNext();if(k==='g')clearWaypoint(true);if(k==='c')cam.lastDrag=-1e9,cam.yaw=P.car?P.car.h:P.h;keys.add(k);}
const offKey=e=>{const k=e.key.toLowerCase();keys.delete(k);if(k==='j'||k==='b')P.trigger=false;};
window.addEventListener('keydown',onKey);window.addEventListener('keyup',offKey);
const cv=renderer.domElement;
cv.addEventListener('pointerdown',e=>{sfxInit();if(e.pointerType==='mouse'&&e.button===2)cam.rmb=true;if(e.pointerType==='mouse'&&document.pointerLockElement!==cv){mouseLock();if(e.button===0)return;}cam.drag={x:e.clientX,y:e.clientY,id:e.pointerId,t:performance.now(),moved:0,mouse:e.pointerType==='mouse'};try{cv.setPointerCapture(e.pointerId);}catch(_){}});
// mouse / touchpad look: once the mouse is captured (one click on the game), just moving it turns the camera, like Last Zone
document.addEventListener('pointermove',e=>{if(document.pointerLockElement!==cv||!active||e.pointerType==='touch')return;const mx=e.movementX||0,my=e.movementY||0;if(Math.abs(mx)>300||Math.abs(my)>300)return;
  cam.yaw-=mx*.0024;if(AIM.on)AIM.pitch=clamp(AIM.pitch+my*.0018,-1.15,.55);else cam.pitch=clamp(cam.pitch+my*.0018,.05,1.05);cam.lastDrag=performance.now();tut.turned+=Math.abs(mx*.0024);});
document.addEventListener('pointerlockchange',lockHintUpd);
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointermove',e=>{if(document.pointerLockElement===cv)return;const d=cam.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;d.moved+=Math.abs(dx)+Math.abs(dy);cam.yaw-=dx*.006;cam.pitch=clamp(cam.pitch+dy*.004,.05,1.05);cam.lastDrag=performance.now();tut.turned+=Math.abs(dx*.006);});
const endDrag=e=>{if(e.pointerType==='mouse'&&(e.button===2||e.type==='pointercancel'))cam.rmb=false;if(e.button===0||e.type==='pointercancel')P.trigger=false;const d=cam.drag;if(!d||d.id!==e.pointerId)return;cam.drag=null;if(d.mouse&&e.button===0&&d.moved<6&&performance.now()-d.t<300&&active&&!mapOpen&&P.weapon==='fist'){if(HP.on)hpKey('j');else playerPunch();}};
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
const DOORTXT={mart24:()=>L('Vào Nexus 24h','Enter Nexus 24h'),barber:()=>L('Vào tiệm cắt tóc','Enter the barber shop'),nails:()=>L('Vào tiệm làm móng','Enter the nail salon'),mall:()=>L('Vào trung tâm thương mại Nexus Mall','Enter Nexus Mall'),court:()=>L('Vào nhà thi đấu bóng rổ','Enter the basketball arena'),tea:()=>L('Vào trà quán','Enter the teahouse'),sea:()=>L('Vào nhà hàng hải sản','Enter the seafood restaurant'),church:()=>L('Vào nhà thờ','Enter the church'),saloon:()=>L('Vào saloon','Enter the saloon'),cinema:()=>L('Vào rạp phim','Enter the cinema'),hotel:()=>L('Vào khách sạn','Enter the hotel'),ware:()=>L('Vào nhà kho','Enter the warehouse'),office:()=>L('Vào toà nhà','Enter the building'),mart:()=>L('Vào cửa hàng tạp hoá','Enter the store'),guns:()=>L('Vào tiệm súng','Enter the gun shop'),gym:()=>L('Vào phòng tập','Enter the gym'),clothes:()=>L('Vào shop quần áo','Enter the clothes shop'),cars:()=>L('Vào showroom xe','Enter the car showroom'),diner:()=>L('Vào quán ăn','Enter the restaurant'),police:()=>L('Vào đồn cảnh sát','Enter the police station'),flat:()=>L('Vào nhà','Go inside'),office:()=>L('Vào toà nhà văn phòng','Enter the office tower'),hotel:()=>L('Vào khách sạn','Enter the hotel'),ware:()=>L('Vào nhà kho','Enter the warehouse')};
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
function interactOption(){const t=P.car||P,near=(p,r)=>p&&hyp(P.x-p.x,P.z-p.z)<r;{const so=stDoorOption()||bbOption();if(so)return so;}
  if(P.inside){const R=ROOMS[P.inside];
    if(P.sit)return{k:'E',txt:P.sit.left>0?L('Đang ăn · bấm E để đứng dậy','Eating · press E to stand up'):L('Đứng dậy','Stand up'),fn:standUp};
    {const mo=mallOption()||robOption();if(mo)return mo;}
    if(near(R.door,1.8)&&P.y<2)return{k:'E',txt:L('Ra ngoài','Go outside'),fn:exitInterior};
    if(R.acts)for(const a of R.acts)if(near(a,a.r||2)&&(a.y===undefined||Math.abs(P.y-a.y)<2.2)&&(!a.ok||a.ok()))return robDecor({k:'E',txt:typeof a.txt==='function'?a.txt():a.txt,fn:a.fn});
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
  const armed=P.weapon!=='fist'&&!P.car;if(!MOBILE){if(aimArmed()&&!AIM.on)aimOn();else if(AIM.on&&!aimArmed())aimOff();}if(AIM.on)aimAssist(false,dt);
  if(document.pointerLockElement===cv&&(paused||mapOpen||shopOpen||!active))try{document.exitPointerLock();}catch(_){}
  const wantAim=armed&&(AIM.on||tb.block);P.aiming=wantAim;P.fireCD-=dt;
  P.H.hold=armed?1:0;P.H.two=armed&&WEAP[P.weapon].two;P.H.aim=wantAim||armed&&time-(P.lastShot||-9)<.6?1:0;P.H.aimP=wantAim?(AIM.on?-AIM.pitch:(cam.pitch-.28)*-.9):0;
  if(wantAim)P.h=lerpA(P.h,cam.yaw,1-Math.exp(-20*dt));
  if(armed&&P.trigger&&P.fireCD<=0)fireWeapon();
  const wantBlock=!armed&&!P.car&&(K('k')||cam.rmb||tb.block);if(wantBlock&&!P.blocking)P.blockStart=time;P.blocking=wantBlock;P.H.blockHold=wantBlock;if(wantBlock)P.H.block=.1;
  if(P.blocking){const f=nearestFoe(5);if(f)P.h=lerpA(P.h,Math.atan2(f.x-P.x,f.z-P.z),1-Math.exp(-14*dt));}
  if(P.lunge>0&&!P.car){const s=Math.min(P.lunge,dt*9);P.lunge-=s;P.x+=Math.sin(P.h)*s;P.z+=Math.cos(P.h)*s;}
  const fwd=clamp((K('w')||K('arrowup')?1:0)-(K('s')||K('arrowdown')?1:0)+joy.y,-1,1),side=clamp((K('d')||K('arrowright')?1:0)-(K('a')||K('arrowleft')?1:0)+joy.x,-1,1);
  const jump=K(' ')||tb.jump,sprint=K('shift')||tb.sprint;
  if(HP.on&&!P.car){hpPlayer(dt,fwd,side,sprint);return;}
  cam.yaw+=((K('q')?1:0)-(K('e')&&false?1:0))*0;
  if(P.car){const c=P.car,dead=c.hp<=0;if(dead&&!c.deadSaid){c.deadSaid=1;showPrompt(L('Xe hỏng máy · xuống xe hoặc tới garage','The engine is dead · get out or visit a garage'),2.4);}
    carStep(c,dt,dead?0:Math.max(0,fwd),dead?.3:Math.max(0,-fwd),side,jump);P.x=c.x;P.z=c.z;P.moving=Math.abs(c.vf);if(tut.on&&TUT[tut.step].t==='Lái xe');return;}
  const y=cam.yaw,fx=Math.sin(y),fz=Math.cos(y),rx=-Math.cos(y),rz=Math.sin(y);let mx=fx*fwd+rx*side,mz=fz*fwd+rz*side;const n=hyp(mx,mz);let spd=0;
  const busy=P.punchCD>0&&time-P.lastPunch<.25;
  if(n>.05){spd=(P.blocking?1.8:P.aiming?(AIM.on&&!busy?(sprint?7.2:4.4):2.4):busy?1.2:sprint?9.5*(1+.15*(save.up.run|0))*(P.boostT>0?1.15:1):4.6)*Math.min(1,n);mx/=n;mz/=n;P.x+=mx*spd*dt;P.z+=mz*spd*dt;if(!P.blocking&&!busy&&!P.aiming)P.h=lerpA(P.h,Math.atan2(mx,mz),1-Math.exp(-12*dt));tut.moved+=spd*dt;if(sprint)tut.sprint+=dt;}
  P.moving=spd;
  const p=resolve(P.x,P.z,.38);if(p){P.x+=p[0];P.z+=p[1];}
  for(const c of cars){const dx=P.x-c.x,dz=P.z-c.z;if(dx*dx+dz*dz>16)continue;const fx2=Math.sin(c.h),fz2=Math.cos(c.h),lz=dx*fx2+dz*fz2,lx=dx*-fz2+dz*fx2;if(Math.abs(lx)<1.35&&Math.abs(lz)<2.6){const sp=Math.abs(c.vf);if(sp>6&&c!==P.car){hurtPlayer(sp*2.4,c);if(P.hp>0){P.koT=1.4;P.H.ko=1;setTimeout(()=>{P.H.ko=0;},1100);}P.x+=fx2*Math.sign(c.vf)*2;P.z+=fz2*Math.sign(c.vf)*2;}else{const ox=1.35-Math.abs(lx),oz=2.6-Math.abs(lz);if(ox<oz){P.x+=-fz2*Math.sign(lx)*ox;P.z+=fx2*Math.sign(lx)*ox;}else{P.x+=fx2*Math.sign(lz)*oz;P.z+=fz2*Math.sign(lz)*oz;}}}}
  for(const n2 of npcs){if(n2.state==='down')continue;const dx=P.x-n2.x,dz=P.z-n2.z,d=hyp(dx,dz);if(d<.7&&d>0){P.x+=dx/d*(.7-d)*.5;P.z+=dz/d*(.7-d)*.5;n2.x-=dx/d*(.7-d)*.5;n2.z-=dz/d*(.7-d)*.5;}}
  const ground=P.inside==='mall'?mallGround(P.x,P.z,P.y):(()=>{const b=blockAt(P.x,P.z);return b&&P.x>b.x0&&P.x<b.x1&&P.z>b.z0&&P.z<b.z1&&!inCut(b,P.x,P.z)?.25:heightAt(P.x,P.z);})();
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
  const dist=P.tour?48:P.plane?PT[P.plane.type].cam+P.plane.spd*.05:P.car?Math.max(9,cam.dist+3.5)+Math.min(4,Math.abs(P.car.vf)*.08)+Math.max(0,((P.car.spec.len||4.6)-4.8)*.9):P.aiming?3.1:P.inside?Math.min(cam.dist,4.2):cam.dist,p=AIM.on&&!P.car?clamp(.12+AIM.pitch*.35,-.05,.35):P.inside?Math.min(cam.pitch,.3):cam.pitch+(P.car?.04:0);const shx=P.aiming?-Math.cos(cam.yaw)*.75:0,shz=P.aiming?Math.sin(cam.yaw)*.75:0;t.x+=shx;t.z+=shz;
  let cx=t.x-Math.sin(cam.yaw)*dist*Math.cos(p),cz=t.z-Math.cos(cam.yaw)*dist*Math.cos(p),cy=t.y+dist*Math.sin(p)+(P.car?.8:.3);
  if(P.inside){const R=ROOMS[P.inside];let k=1;for(;k>.18;k-=.04){const x=t.x+(cx-t.x)*k,z=t.z+(cz-t.z)*k,y=t.y+(cy-t.y)*k;if(x>R.x0+.3&&x<R.x1-.3&&z>R.z0+.3&&z<R.z1-.3&&y<R.h-.3&&!inBld(x,z,y))break;}cx=t.x+(cx-t.x)*k;cz=t.z+(cz-t.z)*k;cy=Math.min(t.y+(cy-t.y)*k,R.h-.3);}else for(let k=1;k>.15;k-=.1){const x=t.x+(cx-t.x)*k,z=t.z+(cz-t.z)*k,y=t.y+(cy-t.y)*k;if(!inBld(x,z,y)){cx=x;cz=z;cy=y;break;}}
  if(!P.inside)cy=Math.max(cy,heightAt(cx,cz)+.7);
  if(!FP&&AIR.term){const A=AIR.term;if(t.x>A.x0&&t.x<A.x1&&t.z>A.z0&&t.z<A.z1){cy=Math.min(cy,AP.y+A.h-1.5);cx=clamp(cx,A.x0+.8,A.x1-.8);cz=clamp(cz,A.z0+.8,A.z1-.8);}}const kk=1-Math.exp(-12*dt);camPos.set(cx,cy,cz);camera.position.lerp(camPos,kk);
  if(cam.shake>0){cam.shake-=dt;camera.position.x+=rnd(-1,1)*cam.shake;camera.position.y+=rnd(-1,1)*cam.shake*.6;}
  if(AIM.on&&!FP&&!P.car){const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw);camera.lookAt(t.x+fx*20,t.y+.35-Math.tan(AIM.pitch)*20,t.z+fz*20);}else camera.lookAt(t.x,t.y+(P.aiming?.35:.6),t.z);
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
  hud.cross.hidden=!(P.aiming||P.weapon!=='fist'&&!P.car&&!MOBILE);hud.cross.classList.toggle('aim',P.aiming);if(P.aiming&&(AIM.hk=(AIM.hk|0)+1)%3===0){camera.getWorldDirection(_aimD);const W=WEAP[P.weapon];const r=W?rayHit(camera.position.clone(),_aimD.clone(),W.range+8,P):{};let hot=r.kind==='npc'&&r.hit.state!=='down';if(!hot&&typeof stHeli!=='undefined'&&stHeli&&stHeli.g&&!stHeli.dead){const hp=stHeli.g.position,v=hp.clone().sub(camera.position);const along=v.dot(_aimD);hot=along>0&&v.clone().addScaledVector(_aimD,-along).length()<4;}hud.cross.classList.toggle('hot',!!hot);}else if(!P.aiming)hud.cross.classList.remove('hot');const wk=P.weapon+'|'+(save.ammo[P.weapon]|0);if(hud.fistEl.dataset.k!==wk){hud.fistEl.dataset.k=wk;hud.fistEl.innerHTML=P.weapon==='fist'?'<span class="e">✊</span>':'<span></span><b></b>';if(P.weapon!=='fist'){hud.fistEl.querySelector('span').textContent=TT(WEAP[P.weapon].n);hud.fistEl.querySelector('b').textContent=save.ammo[P.weapon]|0;}}
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
  wantedUpdate(dt);heliUpdate(dt);heistUpdate(dt);shopsTick(dt);missionUpdate(dt);storyUpdate(dt);bbUpdate(dt);tutUpdate(dt);gpsUpdate(dt);fxUpdate(dt);fwUpdate(dt);
  tod.hour=(tod.hour+dt/30)%24;todApply();weatherUpdate(dt);weatherApply();interiorLights();skyMat.uniforms.ct.value=time;tracerUpdate(dt);heliShoot(dt);lampUpdate(dt);smashUpdate(dt);beamUpdate();doorsUpdate(dt);wildUpdate(dt);airUpdate(dt);
  if(cars.filter(c=>c.kind==='traffic').length<Q.traffic&&Math.random()<dt*2)spawnTraffic(true);
  if(npcs.filter(n=>n.kind==='ped').length<Q.peds&&Math.random()<dt*3)spawnPed();
  lightT-=dt;if(lightT<=0){paintLights(time);lightT=.25;}
  const on=Math.floor(time*5)%2===0;BAR.r.emissiveIntensity=on?4:.2;BAR.b.emissiveIntensity=on?.2:4;
  if(bag){bag.vel+=(-bag.swing*14-bag.vel*2.5)*dt;bag.swing+=bag.vel*dt;bag.piv.rotation.x=bag.swing;}
  // water waves
  if(WN){WN.offset.x=(WN.offset.x+dt*.006)%1;WN.offset.y=(WN.offset.y+dt*.0035)%1;}
  foamUpdate();if(Math.floor(time*20)%2===0){const pa=waterG.attributes.position;for(let i=0;i<pa.count;i++){const x=waterBase[i*3],z=waterBase[i*3+2];pa.array[i*3+1]=Math.sin(x*.06+time*1.3)*.08+Math.cos(z*.05+time*.9)*.06+Math.sin((x+z)*.13+time*2.1)*.04;}pa.needsUpdate=true;waterG.computeVertexNormals();}
}
let perfT=0,perfN=0,lowQ=false;const _aimD=new T.Vector3();
function adapt(raw){if(lowQ||paused||GFX==='ultra')return;perfT+=raw;perfN++;if(perfT>4){const avg=perfT/perfN;perfT=0;perfN=0;
  // step down gently: resolution first, then bloom, then shadows (each only if it is still slow)
  if(avg>.03&&(PP.ao||PP.gr)){PP.ao=PP.gr=false;return;}
  if(avg>.034&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);resize();return;}
  if(avg>.04&&PP.on){PP.on=false;return;}
  if(avg>.05){lowQ=true;if(renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);}});}resize();}}}
/* ---------- post-processing: HDR-ish bloom, a San Andreas style colour grade (warm highlights, cool shadows, smog haze),
   vignette, film grain and FXAA. Off on phones and switched off automatically if the frame rate drops. ---------- */
const PP=(()=>{const gl2=renderer.capabilities.isWebGL2;const o={on:GFX!=='low',w:1,h:1,ao:GFX==='ultra',gr:GFX==='ultra',dof:0,focus:20};
  const depthOK=gl2||!!renderer.extensions.get('WEBGL_depth_texture');if(!depthOK){o.ao=o.gr=false;}
  const mkRT=(w,h,ms,depth)=>{const opt={minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,type:T.UnsignedByteType};
    const rt=ms&&gl2&&T.WebGLMultisampleRenderTarget?new T.WebGLMultisampleRenderTarget(w,h,opt):new T.WebGLRenderTarget(w,h,opt);if(rt.samples!==undefined&&ms)rt.samples=4;
    if(depth){rt.depthTexture=new T.DepthTexture(w,h);rt.depthTexture.type=gl2?T.UnsignedIntType:T.UnsignedShortType;}return rt;};
  // Ultra renders without MSAA so the depth buffer can be read (ambient occlusion, sun shafts, depth of field); FXAA smooths the edges instead
  const useDepth=depthOK&&GFX==='ultra';
  const main=mkRT(4,4,!useDepth,useDepth),b1=mkRT(4,4),b2=mkRT(4,4),b3=mkRT(4,4),b4=mkRT(4,4),aoA=mkRT(4,4),aoB=mkRT(4,4),grA=mkRT(4,4),grB=mkRT(4,4),dfA=mkRT(4,4),dfB=mkRT(4,4);
  const cam=new T.OrthographicCamera(-1,1,1,-1,0,1),tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
  const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const pass=(fs,u,ext)=>{const m=new T.ShaderMaterial({vertexShader:VS,fragmentShader:fs,uniforms:u,depthTest:false,depthWrite:false});if(ext)m.extensions={derivatives:true};m.toneMapped=false;const sc=new T.Scene();const me=new T.Mesh(tri,m);me.frustumCulled=false;sc.add(me);return{m,sc,u};};
  const LIN=`uniform float cNear,cFar;float viewZ(float d){return (cNear*cFar)/((cFar-cNear)*d-cFar);}`;
  const bright=pass(`uniform sampler2D tDiffuse;uniform vec2 px;uniform float thr;varying vec2 vUv;
    vec3 s(vec2 o){return texture2D(tDiffuse,vUv+o*px).rgb;}
    void main(){vec3 c=(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.)))*.25;float l=max(c.r,max(c.g,c.b));float k=smoothstep(thr,thr+.25,l);gl_FragColor=vec4(c*k,1.);}`,{tDiffuse:{value:null},px:{value:new T.Vector2()},thr:{value:.72}});
  const blur=pass(`uniform sampler2D tDiffuse;uniform vec2 dir;varying vec2 vUv;
    void main(){vec4 c=texture2D(tDiffuse,vUv)*.227;c+=texture2D(tDiffuse,vUv+dir*1.385)*.316;c+=texture2D(tDiffuse,vUv-dir*1.385)*.316;c+=texture2D(tDiffuse,vUv+dir*3.23)*.07;c+=texture2D(tDiffuse,vUv-dir*3.23)*.07;gl_FragColor=c;}`,{tDiffuse:{value:null},dir:{value:new T.Vector2()}});
  const copy=pass(`uniform sampler2D tDiffuse;varying vec2 vUv;void main(){gl_FragColor=texture2D(tDiffuse,vUv);}`,{tDiffuse:{value:null}});
  // ambient occlusion from the depth buffer (scalable AO style spiral sampling, view-space normals from derivatives)
  const ao=pass(`uniform sampler2D tDepth;uniform vec2 px;uniform float tanH,aspect,radius,inten,seed;varying vec2 vUv;${LIN}
    vec3 vpos(vec2 uv){float d=texture2D(tDepth,uv).x;float z=viewZ(d);return vec3((uv*2.-1.)*vec2(tanH*aspect,tanH)*-z,z);}
    float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+seed)*43758.5453);}
    void main(){float d=texture2D(tDepth,vUv).x;if(d>.99999){gl_FragColor=vec4(1.);return;}vec3 P=vpos(vUv);vec3 N=normalize(cross(dFdx(P),dFdy(P)));
      float rs=radius/(-P.z*tanH*2.)*1.;float a0=hash(vUv*1000.)*6.2832,occ=0.;
      for(int i=0;i<12;i++){float fi=float(i)+.5;float r=rs*fi/12.;float an=a0+fi*2.4;vec2 uv=vUv+vec2(cos(an),sin(an))*r*vec2(1./aspect,1.);
        vec3 S=vpos(uv)-P;float l=length(S);occ+=max(0.,dot(N,S/l)-.08)*(1.-smoothstep(radius*.6,radius*1.8,l));}
      float a=clamp(1.-occ/12.*inten,0.,1.);gl_FragColor=vec4(a,a,a,1.);}`,
    {tDepth:{value:null},px:{value:new T.Vector2()},tanH:{value:.5},aspect:{value:1},radius:{value:1.6},inten:{value:1.9},seed:{value:0},cNear:{value:.2},cFar:{value:2800}},true);
  // sun shafts: sky pixels near the sun, smeared toward the sun on screen
  const grMask=pass(`uniform sampler2D tDiffuse,tDepth;uniform vec2 sun;uniform float aspect;varying vec2 vUv;
    void main(){float d=texture2D(tDepth,vUv).x;vec3 c=texture2D(tDiffuse,vUv).rgb;float sky=step(.9999,d);vec2 q=(vUv-sun)*vec2(aspect,1.);float k=sky*(1.-smoothstep(0.,.55,length(q)));gl_FragColor=vec4(c*k,1.);}`,
    {tDiffuse:{value:null},tDepth:{value:null},sun:{value:new T.Vector2(.5,.5)},aspect:{value:1}});
  const grBlur=pass(`uniform sampler2D tDiffuse;uniform vec2 sun;varying vec2 vUv;
    void main(){vec2 d=(vUv-sun)/48.*.9;vec2 uv=vUv;vec3 c=vec3(0.);float w=1.;for(int i=0;i<48;i++){uv-=d;c+=texture2D(tDiffuse,uv).rgb*w;w*=.96;}gl_FragColor=vec4(c/18.,1.);}`,{tDiffuse:{value:null},sun:{value:new T.Vector2(.5,.5)}});
  const fin=pass(`uniform sampler2D tDiffuse,tB1,tB2,tAO,tGR,tDOF,tDepth;uniform vec2 px;uniform float bloom,time,grade,night,grain,aa,aoOn,grI,dof,focus;varying vec2 vUv;${LIN}
    float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    vec3 fxaa(vec2 uv){vec3 rgbM=texture2D(tDiffuse,uv).rgb;if(aa<.5)return rgbM;vec3 L=vec3(.299,.587,.114);
      float lM=dot(rgbM,L),lNW=dot(texture2D(tDiffuse,uv+vec2(-1.,-1.)*px).rgb,L),lNE=dot(texture2D(tDiffuse,uv+vec2(1.,-1.)*px).rgb,L),lSW=dot(texture2D(tDiffuse,uv+vec2(-1.,1.)*px).rgb,L),lSE=dot(texture2D(tDiffuse,uv+vec2(1.,1.)*px).rgb,L);
      float mn=min(lM,min(min(lNW,lNE),min(lSW,lSE))),mx=max(lM,max(max(lNW,lNE),max(lSW,lSE)));if(mx-mn<max(.0312,mx*.125))return rgbM;
      vec2 d=vec2(-((lNW+lNE)-(lSW+lSE)),((lNW+lSW)-(lNE+lSE)));float rd=max((lNW+lNE+lSW+lSE)*.03125,.0078);float ri=1./(min(abs(d.x),abs(d.y))+rd);d=clamp(d*ri,-8.,8.)*px;
      vec3 a=.5*(texture2D(tDiffuse,uv+d*(1./3.-.5)).rgb+texture2D(tDiffuse,uv+d*(2./3.-.5)).rgb);vec3 b=a*.5+.25*(texture2D(tDiffuse,uv-d*.5).rgb+texture2D(tDiffuse,uv+d*.5).rgb);float lb=dot(b,L);return(lb<mn||lb>mx)?a:b;}
    vec3 toS(vec3 c){c=max(c,0.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
    void main(){vec3 c=fxaa(vUv);
      if(aoOn>.5){float a=texture2D(tAO,vUv).r;c*=mix(1.,a,.85);}
      if(dof>.01){float z=-viewZ(texture2D(tDepth,vUv).x);float coc=clamp(abs(z-focus)/max(2.,focus*.6),0.,1.)*dof;c=mix(c,texture2D(tDOF,vUv).rgb,coc);}
      c+=(texture2D(tB1,vUv).rgb*.75+texture2D(tB2,vUv).rgb*.9)*bloom;
      if(grI>.001)c+=texture2D(tGR,vUv).rgb*grI*vec3(1.,.86,.62);
      float l=dot(c,vec3(.2126,.7152,.0722));
      // colour grade: richer colour, cool blue-grey shadows, warm amber highlights, a little smog lift
      vec3 g=mix(vec3(l),c,1.06);g*=mix(vec3(.9,.95,1.06),vec3(1.09,1.,.84),smoothstep(.02,.6,l));g=g*.95+vec3(.02,.016,.009);
      c=mix(c,g,grade);
      c=toS(c);
      // filmic S-curve contrast in display space
      c=mix(c,c*c*(3.-2.*c),.26*grade);
      vec2 q=vUv-.5;float v=smoothstep(.85,.25,length(q*vec2(1.15,1.)));c*=mix(1.,v,.4+night*.12);
      c+=(hash(vUv*vec2(1931.,1213.)+fract(time*7.))-.5)*grain;
      gl_FragColor=vec4(c,1.);}`,{tDiffuse:{value:null},tB1:{value:null},tB2:{value:null},tAO:{value:null},tGR:{value:null},tDOF:{value:null},tDepth:{value:null},px:{value:new T.Vector2()},bloom:{value:.55},time:{value:0},grade:{value:1},night:{value:0},grain:{value:.03},
      aa:{value:main.samples?0:1},aoOn:{value:0},grI:{value:0},dof:{value:0},focus:{value:20},cNear:{value:.2},cFar:{value:2800}});
  o.setSize=(w,h)=>{o.w=w;o.h=h;main.setSize(w,h);const w2=Math.max(1,w>>1),h2=Math.max(1,h>>1),w4=Math.max(1,w>>2),h4=Math.max(1,h>>2),w8=Math.max(1,w>>3),h8=Math.max(1,h>>3);
    b1.setSize(w4,h4);b2.setSize(w4,h4);b3.setSize(w8,h8);b4.setSize(w8,h8);aoA.setSize(w2,h2);aoB.setSize(w2,h2);grA.setSize(w4,h4);grB.setSize(w4,h4);dfA.setSize(w4,h4);dfB.setSize(w4,h4);};
  const run=(p,src,dst)=>{if(src)p.u.tDiffuse.value=src.texture;renderer.setRenderTarget(dst);renderer.render(p.sc,cam);};
  const blur2=(a,b)=>{blur.u.dir.value.set(1/a.width,0);run(blur,a,b);blur.u.dir.value.set(0,1/a.height);run(blur,b,a);};
  const _sv=new T.Vector3();
  o.render=()=>{if(!o.on){renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
    renderer.setRenderTarget(main);renderer.render(scene,camera);const u=fin.u,dt=main.depthTexture;
    bright.u.px.value.set(1/o.w,1/o.h);const nk=1-tod.day;bright.u.thr.value=.78-nk*.22;run(bright,main,b1);blur2(b1,b2);
    run(bright,b1,b3);bright.u.thr.value=0;blur2(b3,b4);
    u.cNear.value=ao.u.cNear.value=camera.near;u.cFar.value=ao.u.cFar.value=camera.far;
    // ambient occlusion (Ultra)
    u.aoOn.value=0;if(dt&&o.ao){const A=ao.u;A.tDepth.value=dt;A.tanH.value=Math.tan(camera.fov*Math.PI/360);A.aspect.value=camera.aspect;A.seed.value=0;renderer.setRenderTarget(aoA);renderer.render(ao.sc,cam);blur2(aoA,aoB);u.tAO.value=aoA.texture;u.aoOn.value=1;}
    // sun shafts (Ultra, sun above the horizon and in front of the camera)
    u.grI.value=0;if(dt&&o.gr&&!P.inside&&tod.day>.05){_sv.copy(sunDir).multiplyScalar(1000).add(camera.position).project(camera);
      if(_sv.z<1&&Math.abs(_sv.x)<1.6&&Math.abs(_sv.y)<1.6){const sx=_sv.x*.5+.5,sy=_sv.y*.5+.5;grMask.u.tDepth.value=dt;grMask.u.sun.value.set(sx,sy);grMask.u.aspect.value=camera.aspect;run(grMask,main,grA);grBlur.u.sun.value.set(sx,sy);run(grBlur,grA,grB);
        const low=1-Math.min(1,Math.max(0,sunDir.y-.05)/.6);u.tGR.value=grB.texture;u.grI.value=(.35+.65*low)*Math.min(1,tod.day*3)*(1-weather.w*.8)*.9*(1-Math.min(1,Math.max(Math.abs(_sv.x),Math.abs(_sv.y))-.6));}}
    // depth of field in film scenes
    u.dof.value=0;if(dt&&o.dof>.01){run(copy,main,dfA);blur2(dfA,dfB);blur2(dfA,dfB);u.tDOF.value=dfA.texture;u.tDepth.value=dt;u.dof.value=o.dof;u.focus.value=o.focus;}
    if(dt)u.tDepth.value=dt;
    u.tDiffuse.value=main.texture;u.tB1.value=b1.texture;u.tB2.value=b3.texture;u.px.value.set(1/o.w,1/o.h);u.time.value=time;u.night.value=nk;u.bloom.value=.42+nk*.45;
    renderer.setRenderTarget(null);renderer.render(fin.sc,cam);};
  return o;})();
/* ================= STORY MODE: "Lật đổ Ông Trùm" =================
   ch 0: buy a gun · ch 1-5: beat the boss of each town (1 key card each) · ch 6: Syndicate Tower rooftop, final boss + escape helicopter · ch 7: done.
   3 lives: dying wakes you in hospital with progress kept; losing all 3 sends you back to the first boss (key cards lost). */
const STORY=opt.mode==='story';
const ST_TOWNS=[['oldq',L('Lantern Mike','Lantern Mike'),L('Phố Cổ Đèn Lồng','Lantern Old Quarter')],['harbor',L('Shark Henry','Shark Henry'),L('Cảng Bắc','North Harbor')],['highland',L('Cloud Rio','Cloud Rio'),L('Đồi Mây','Cloud Hills')],['minetown',L('Silver Michael','Silver Michael'),L('Thị trấn Mỏ Bạc','Silver Mine Town')],['westside',L('Desert Han','Desert Han'),L('Nexus Tây','Nexus West')]];
const ST_FACE=[{skin:'#c9956b',hair:'#dddddd',hairStyle:'buzz',beard:true},{skin:'#a8714f',hair:'#1a1a1a',hairStyle:'short',beard:false},{skin:'#e0b08a',hair:'#0d0d0d',hairStyle:'long',glasses:true,beard:false},{skin:'#b07a55',hair:'#8a8a8a',hairStyle:'bald',beard:true},{skin:'#d9a77c',hair:'#111111',hairStyle:'buzz',beard:false,glasses:true}];
const ST_LOOKS=[{shirt:'#7a1020',pants:'#1a1a1a',jacket:'#c0392b',cap:null},{shirt:'#1d3557',pants:'#22313f',jacket:'#457b9d',cap:'#0b1a2a'},{shirt:'#eeeeee',pants:'#30343a',jacket:'#6c757d',cap:null},{shirt:'#3b2f2f',pants:'#4a3b2a',jacket:'#8d6e63',cap:'#5d4037'},{shirt:'#2d6a4f',pants:'#1b4332',jacket:'#1b1b1b',cap:'#2d6a4f'}];
const ST_BODY=ST_LOOKS.map((l,i)=>Object.assign({female:false,shoes:'#111111',sleeve:true,longSleeve:true,skirt:false,glasses:false},l,ST_FACE[i]));
const VUONG_LOOK={female:false,skin:'#c9956b',hair:'#111111',hairStyle:'short',beard:true,glasses:true,shirt:'#f5f5f5',jacket:'#111111',pants:'#111111',shoes:'#111111',cap:null,sleeve:true,longSleeve:true};
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
function stSpawnGang(i){const p=stSpot(i),list=[];const lk=Object.assign(randomLook('guard'),ST_BODY[i]);
  const boss=newNPC('guard',p.x,p.z,{state:'fight',t:999,mission:true,story:true,boss:ST_TOWNS[i][1],look:lk});boss.hp=boss.maxHp=420+i*90;boss.H.root.scale.setScalar(1.12);list.push(boss);
  for(let k=0;k<3+Math.min(2,i);k++){const a=k/(3+i)*6.283,x=p.x+Math.cos(a)*7,z=p.z+Math.sin(a)*7,q=resolve(x,z,.6)?p:{x,z};const n=newNPC('guard',q.x,q.z,{state:'fight',t:999,mission:true,story:true,look:Object.assign(randomLook('guard'),{jacket:ST_LOOKS[i].jacket})});n.hp=n.maxHp=110+i*15;list.push(n);}
  stGang={i,boss,list,said:false,intro:false,half:false,hp0:0};cine({type:'title',hold:2.6,slow:.55,kick:L('Đang vào lãnh địa','Entering territory'),title:ST_TOWNS[i][2],c:ST_COL[i][0],c2:'#ffffff',snd:'slow',sub:L('Đàn em của '+ST_TOWNS[i][1]+' đã thấy bạn','The crew of '+ST_TOWNS[i][1]+' has spotted you')});}
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
function stStartTower(){stTowerReset();const list=[];const lk=Object.assign(randomLook('guard'),VUONG_LOOK);
  const boss=newNPC('guard',TW.cx,TW.cz-8,{state:'fight',t:999,mission:true,story:true,boss:L('Ông Trùm Vương','Boss Vương'),look:lk});boss.hp=boss.maxHp=1100;boss.H.root.scale.setScalar(1.18);list.push(boss);
  for(let k=0;k<6;k++){const x=TW.cx+(k%3-1)*12,z=TW.cz-14+Math.floor(k/3)*14+(k%2?3:-3);const n=newNPC('guard',x,z,{state:'fight',t:999,mission:true,story:true,look:Object.assign(randomLook('guard'),{jacket:'#111111',shirt:'#222222'})});n.hp=n.maxHp=150;list.push(n);}
  stTower={boss,list,phase:'fight'};stTowerIntro();}
function stTowerReset(){if(stTower){for(const n of stTower.list)if(npcs.includes(n))removeNPC(n);}stTower=null;if(stHeli){scene.remove(stHeli.g);stHeli=null;}}
function stHeliHit(o,d,range,dmg){if(!stHeli||stHeli.dead)return false;const H=stHeli.g.position;_m.set(H.x-o.x,H.y-o.y,H.z-o.z);const t=_m.dot(d);if(t<0||t>range)return false;const q=_m.lengthSq()-t*t;if(q>3.2*3.2)return false;
  stHeli.hp-=dmg;if(!stHeli.half&&stHeli.hp<=50&&stHeli.hp>0){stHeli.half=true;cine({type:'title',hold:1.5,slow:.2,kick:L('Trực thăng','Helicopter'),title:L('Bốc khói rồi!','It is smoking!'),c:'#ff8a3d',c2:'#ffd166',snd:'slow'});}fx3(H.x+rnd(-1,1),H.y+rnd(-.5,.5),H.z+rnd(-1,1),false);sfx('ric');lastFoe={n:{boss:L('Trực thăng Ông Trùm','Boss helicopter'),hp:Math.max(0,stHeli.hp),maxHp:100,heli:true},t:time};return true;}
function stDied(){if(!STORY||SS.done)return;SS.lives--;SS.deaths=(SS.deaths|0)+1;stClearGang();stTowerReset();
  if(SS.lives<=0){SS.lives=3;SS.keys=[0,0,0,0,0];SS.ch=Math.min(SS.ch,1);if(SS.ch>0)SS.ch=1;stFail(true);}
  else stFail(false);
  writeSave();}
function stWinBoss(i){SS.keys[i]=1;SS.ch=Math.min(6,SS.ch+1);while(SS.ch<=5&&SS.keys[SS.ch-1])SS.ch++;sfx('cash');P.hp=maxHp();save.money+=2000;
  writeSave();stKeyStamp(i);
  const g=stGang;stGang=null;setTimeout(()=>{if(g)for(const n of g.list)if(npcs.includes(n)&&n.state==='down')removeNPC(n);},6000);for(const n of g.list)if(n!==g.boss&&n.state!=='down'){n.state='leave';n.story=false;}}
let stEnding=false;
function stVictory(){if(stWin||stEnding)return;stEnding=true;setTimeout(()=>playFilm(filmEnding(),()=>{stEnding=false;stVictoryCard();}),2600);}
function stVictoryCard(){if(stWin)return;SS.done=true;SS.ch=7;const mins=Math.round((Date.now()-(SS.t0||Date.now()))/60000);
  let lg={};try{lg=JSON.parse(localStorage.getItem('nexus-city2-legend')||'{}');}catch(_){}const first=!lg.done;
  if(first){lg={done:true,claimed:false,at:Date.now()};try{localStorage.setItem('nexus-city2-legend',JSON.stringify(lg));}catch(_){}}
  writeSave();if(opt.onStory)opt.onStory(save);cinSfx('win');
  for(let k=0;k<14;k++)setTimeout(()=>burst(P.x+rnd(-25,25),rnd(18,32),P.z+rnd(-25,25),pick(['#ffd166','#ff5fd2','#7df9ff','#c1f354','#ff6b5d'])),k*450);
  stWin=document.createElement('div');stWin.className='nc-win';
  stWin.innerHTML=`<div class="nc-win-in"><small>${L('THE SYNDICATE ĐÃ SỤP ĐỔ','THE SYNDICATE HAS FALLEN')}</small><h2>${L('PHÁ ĐẢO NEXUS CITY','NEXUS CITY COMPLETE')}</h2><p class="nc-win-n">${L('Danh hiệu: Huyền Thoại Nexus','Title: Nexus Legend')}</p>
    <div class="nc-win-s"><span>⏱ ${mins} ${L('phút','min')}</span><span>💀 ${SS.deaths|0} ${L('lần ngã','falls')}</span><span>🔑 5/5</span></div>
    ${first?`<div class="nc-win-r"><b>${L('Phần thưởng','Rewards')}</b><span>🏎️ ${L('Siêu xe Huyền Thoại (chỉ có 1 chiếc)','Legend supercar (one of a kind)')}</span><span>💰 $100.000</span><em>${L('Đã chuyển vào chế độ "Vào thẳng thành phố" · xe nằm trong gara nhà bạn','Sent to "Go straight to the city" · the car is in your home garage')}</em></div>`
      :`<div class="nc-win-r"><b>${L('Bạn đã phá đảo trước đó','You already beat the game')}</b><em>${L('Chơi lại Story mode không nhận thêm xe hay tiền','Replaying Story mode gives no extra car or money')}</em></div>`}
    <button type="button" class="nc-win-b">${L('Về menu','Back to menu')}</button></div>`;
  root.appendChild(stWin);stWin.querySelector('button').addEventListener('click',()=>{stWin.remove();stWin=null;if(opt.onMenu)opt.onMenu();});}
function storyUpdate(dt){fwkUpdate(dt);if(!STORY||MOV.on)return;if(stTower&&P.inside!=='tower'&&P.koT<=0)stTowerReset();
  if(stDoorMk){const show=SS.ch===6&&!P.inside;stDoorMk.visible=show;if(show){const d=stDoorSpot();stDoorMk.position.set(d.x,.25,d.z);stDoorMk.children[0].rotation.z+=dt;}}
  if(SS.done)return;
  if(SS.ch===0&&Object.keys(save.weapons).some(w=>save.weapons[w])){SS.ch=1;writeSave();stArmed();}
  if(SS.ch>=1&&SS.ch<=5&&!P.inside){const i=SS.ch-1,p=stSpot(i),t=P.car||P,d=hyp(t.x-p.x,t.z-p.z);
    if(!stGang&&d<85&&P.koT<=0)stSpawnGang(i);
    if(stGang){if(d>170){stClearGang();showPrompt(L('Bạn đã rời khỏi khu trùm','You left the boss area'),1.6);}
      else{for(const n of stGang.list)if(n.state==='leave'&&n.story){n.state='fight';n.t=999;}const b=stGang.boss;
        if(!stGang.intro&&d<42&&P.koT<=0){stGang.intro=true;stGang.hp0=P.hp;stIntro(i);}
        else if(stGang.intro&&!stTips().fight&&(P.hp<stGang.hp0-1||stGang.list.some(n=>n.hp<n.maxHp)))stFightTip();
        if(stGang&&!stGang.half&&b.hp>0&&b.hp<=b.maxHp*.5){stGang.half=true;stHalf(b);}
        if(!npcs.includes(b)||b.state==='down'||b.hp<=0)stWinBoss(i);}}}
  if(!SS.done&&P.koT<=0){if(stars>0)stWantedTip();else if(P.hp>0&&P.hp<maxHp()*.35)stLowTip();}
  if(SS.ch===6&&P.inside==='tower'&&stTower){const T2=stTower,b=T2.boss;if(!T2.solo&&T2.phase==='fight'&&T2.list.every(n=>n===b||!npcs.includes(n)||n.state==='down'||n.hp<=0)){T2.solo=true;cine({type:'title',hold:2,slow:.2,kick:L('Vệ sĩ đã gục hết','All bodyguards down'),title:L('Chỉ còn Ông Trùm','Just the Boss now'),c:'#d4a017',c2:'#ffffff',snd:'slow'});}for(const n of T2.list)if(n.state==='leave'&&npcs.includes(n)){n.state='fight';n.t=999;}
    if(T2.phase==='fight'&&(b.hp<=b.maxHp*.25||b.state==='down')){T2.phase='escape';removeNPC(b);stHeli=stHeliMake();stHeli.hp=100;stHeli.t=0;stHeli.g.position.set(TW.cx,1.8,TW.cz-14);stHeli.a=0;sfx('horn');stHeliTip();}
    if(stHeli){const H=stHeli;H.t+=dt;for(const r of H.rot)r.rotation.y+=dt*(r===H.rot[2]?0:28);H.rot[2].rotation.x+=dt*30;const g=H.g;
      if(!H.dead){if(H.t<3){g.position.y=1.8+H.t*5;}else{H.a+=dt*.35;const R=24,y=17+Math.sin(H.t*.7)*3;g.position.set(TW.cx+Math.sin(H.a)*R,y,TW.cz+Math.cos(H.a)*R);}
        g.rotation.y=Math.atan2(P.x-g.position.x,P.z-g.position.z);g.rotation.z=Math.sin(H.t)*.08;
        H.scd=(H.scd==null?2:H.scd)-dt;if(H.t>3&&H.scd<=0&&P.koT<=0){H.scd=rnd(.9,1.6);_o.copy(g.position);_o.y-=1;_d.set(P.x-_o.x,1.1-_o.y,P.z-_o.z).normalize();_d.x+=rnd(-.04,.04);_d.z+=rnd(-.04,.04);_d.normalize();const r=rayHit(_o,_d,90,null),end=_o.clone().addScaledVector(_d,r.t);addTracer(_o,end);sfx('smg');if(r.kind==='player')hurtPlayer(6,null);}
        if(H.hp<=0){H.dead=true;H.vy=0;stHeliDown();for(let k=0;k<6;k++)setTimeout(()=>{if(stHeli)fx3(g.position.x+rnd(-2,2),g.position.y+rnd(-1,1),g.position.z+rnd(-2,2),false);sfx('crash');},k*180);}}
      else{H.vy-=12*dt;g.position.y+=H.vy*dt;g.rotation.y+=dt*6;g.position.x+=(g.position.x-TW.cx)*dt*.4;g.position.z+=(g.position.z-TW.cz)*dt*.4;if(g.position.y<-70){scene.remove(g);stHeli=null;for(const n of T2.list)if(npcs.includes(n))n.state='leave';T2.phase='won';stVictory();}}}}}
/* ---------- story cinematics: the game slows to a freeze-frame, big animated title cards, how-to panels and stingers ---------- */
const CIN={ts:1,tgt:1,q:[],cur:null,el:null,leave:0,yaw:null,dist0:null,duck:null};
const cnE=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cinCss=document.createElement('style');cinCss.textContent=`
.cn{position:absolute;inset:0;z-index:40;pointer-events:none;font-family:"Space Grotesk",Inter,system-ui,sans-serif;color:#fff;overflow:hidden}
.cn.wait{pointer-events:auto;cursor:pointer}
.cn-bar{position:absolute;left:0;right:0;height:12vh;background:#000;transition:transform .7s cubic-bezier(.2,.8,.2,1);z-index:1}
.cn-bar.t{top:0;transform:translateY(-101%)}.cn-bar.b{bottom:0;transform:translateY(101%)}
.cn.bars .cn-bar{transform:none}
.cn-tint{position:absolute;inset:0;opacity:0;transition:opacity .8s;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 35%,rgba(0,0,0,.78) 100%)}
.cn.on .cn-tint{opacity:1}
.cn.k-tip .cn-tint{background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.55) 55%,rgba(0,0,0,.15) 100%)}
.cn.k-title .cn-tint,.cn.k-stamp .cn-tint{background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.55) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,.8) 100%)}
.cn.k-fail .cn-tint{background:radial-gradient(ellipse at 50% 50%,rgba(120,0,0,.15) 20%,rgba(60,0,0,.85) 100%)}
.cn-flash{position:absolute;inset:0;background:#fff;opacity:0}
.cn-flash.go{animation:cnFlash .55s ease-out}
@keyframes cnFlash{0%{opacity:.85}100%{opacity:0}}
.cn-ptr{position:absolute;left:0;top:0;opacity:0;transition:opacity .4s;z-index:2}
.cn-ptr.on{opacity:1}
.cn-ptr i{position:absolute;left:-46px;top:-46px;width:92px;height:92px;border-radius:50%;border:3px solid var(--c,#ff3b5c);box-shadow:0 0 24px var(--c,#ff3b5c);animation:cnRing 1.2s ease-in-out infinite}
.cn-ptr b{position:absolute;left:56px;top:-62px;white-space:nowrap;font-size:15px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;background:var(--c,#ff3b5c);color:#fff;padding:4px 10px;transform:skewX(-10deg)}
.cn-ptr b:before{content:"";position:absolute;left:-30px;bottom:-14px;width:34px;height:3px;background:var(--c,#ff3b5c);transform:rotate(-40deg);transform-origin:right}
@keyframes cnRing{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
.cn-stage{position:absolute;inset:0;z-index:3}
.cn-card{position:absolute}
.cn-card.out{animation:cnOut .38s ease-in forwards}
@keyframes cnOut{to{opacity:0;transform:translateY(-14px) scale(.97);filter:blur(6px)}}
.cn-kick{display:inline-flex;align-items:center;gap:10px;font-size:clamp(13px,1.5vw,18px);font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:var(--c,#ff5fa2);animation:cnKick .7s cubic-bezier(.2,.8,.2,1) both}
.cn-kick:before{content:"";width:42px;height:3px;background:currentColor;box-shadow:0 0 12px currentColor}
@keyframes cnKick{from{opacity:0;transform:translateX(-40px);letter-spacing:.8em}to{opacity:1;transform:none}}
.cn-title{margin:.12em 0 0;font-size:clamp(46px,8.4vw,128px);line-height:.9;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-.01em;
  background:linear-gradient(100deg,#fff 0%,#fff 38%,var(--c2,#ffb36b) 70%,var(--c,#ff5fa2) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 6px 0 rgba(0,0,0,.55)) drop-shadow(0 0 30px rgba(0,0,0,.5));animation:cnTitle .9s cubic-bezier(.16,.9,.2,1) .12s both}
@keyframes cnTitle{0%{opacity:0;transform:scale(1.35) translateY(10px);letter-spacing:.3em;filter:blur(16px)}60%{opacity:1}100%{opacity:1;transform:none;filter:drop-shadow(0 6px 0 rgba(0,0,0,.55)) drop-shadow(0 0 30px rgba(0,0,0,.5))}}
.cn-sub{margin:.7em 0 0;max-width:min(760px,86vw);font-family:Inter,system-ui,sans-serif;font-size:clamp(16px,1.7vw,22px);line-height:1.45;font-weight:600;color:rgba(255,255,255,.92);text-shadow:0 2px 10px rgba(0,0,0,.9);animation:cnUp .7s ease .55s both}
@keyframes cnUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.cn-steps{list-style:none;margin:1.1em 0 0;padding:0;display:grid;gap:10px}
.cn-steps li{display:flex;align-items:center;gap:14px;font-family:Inter,system-ui,sans-serif;font-size:clamp(15px,1.55vw,20px);font-weight:600;text-shadow:0 2px 8px rgba(0,0,0,.9);animation:cnStep .55s cubic-bezier(.2,.8,.2,1) var(--d,.6s) both}
@keyframes cnStep{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}
.cn kbd{display:inline-grid;place-items:center;min-width:44px;padding:6px 12px;border-radius:9px;background:rgba(255,255,255,.95);color:#111;font:800 clamp(13px,1.3vw,17px) Inter,system-ui,sans-serif;box-shadow:0 4px 0 rgba(0,0,0,.45),0 0 0 2px var(--c,#ff5fa2);white-space:nowrap}
.cn-go{margin-top:1.4em;display:flex;align-items:center;gap:10px;font:700 15px Inter,system-ui,sans-serif;letter-spacing:.06em;color:rgba(255,255,255,.8);opacity:0;transition:opacity .4s}
.cn.ready .cn-go{opacity:1;animation:cnPulse 1.4s ease-in-out infinite}
@keyframes cnPulse{50%{opacity:.45}}
/* tip panel: left side, like a director stepping in */
.cn-tip{left:6vw;top:50%;transform:translateY(-50%);max-width:min(880px,88vw);padding-left:26px;border-left:5px solid var(--c,#ff5fa2)}
.cn-tip:before{content:"";position:absolute;left:-5px;top:0;width:5px;height:0;background:#fff;animation:cnLine .8s ease .2s forwards}
@keyframes cnLine{to{height:100%}}
/* boss intro: freeze-frame name card */
.cn-intro{left:0;bottom:15vh;width:100%;height:auto}
.cn-slash{position:absolute;left:-5vw;bottom:-2vh;width:78vw;height:calc(100% + 4vh);background:linear-gradient(100deg,var(--c,#ff3b5c),var(--c2,#7a1020));clip-path:polygon(0 0,100% 0,88% 100%,0 100%);opacity:.92;animation:cnSlash .6s cubic-bezier(.2,.9,.2,1) both;box-shadow:0 20px 60px rgba(0,0,0,.5)}
@keyframes cnSlash{from{transform:translateX(-100%)}to{transform:none}}
.cn-intro .cn-in{position:relative;padding:22px 0 22px 7vw}
.cn-intro .cn-kick{color:#fff}
.cn-intro .cn-title{background:none;color:#fff;-webkit-background-clip:initial;background-clip:initial}
.cn-tag{margin:.5em 0 0;font:600 italic clamp(16px,1.8vw,24px) Inter,system-ui,sans-serif;color:rgba(255,255,255,.95);animation:cnUp .6s ease .6s both}
.cn-stats{display:flex;gap:10px;margin-top:12px;animation:cnUp .6s ease .8s both}
.cn-stats span{background:rgba(0,0,0,.55);padding:5px 12px;font:800 14px Inter,system-ui,sans-serif;letter-spacing:.08em}
.cn-intro .cn-go{padding-left:7vw}
/* centred cards */
.cn-mid{left:50%;top:50%;transform:translate(-50%,-50%);width:min(1100px,92vw);text-align:center}
.cn-mid .cn-kick:after{content:"";width:42px;height:3px;background:currentColor;box-shadow:0 0 12px currentColor}
.cn-mid .cn-sub{margin-left:auto;margin-right:auto}
.cn-mid .cn-go{justify-content:center}
/* stamp: key card earned */
.cn-stamp .cn-title{animation:cnSlam .62s cubic-bezier(.2,1.4,.3,1) .05s both}
@keyframes cnSlam{0%{opacity:0;transform:scale(2.8) rotate(-7deg);filter:blur(10px)}55%{opacity:1;transform:scale(.94) rotate(1deg);filter:none}75%{transform:scale(1.04)}100%{opacity:1;transform:none}}
.cn-cards{display:flex;justify-content:center;gap:clamp(8px,1.4vw,18px);margin-top:22px}
.cn-cards i{width:clamp(38px,4.6vw,62px);aspect-ratio:3/4.2;border-radius:8px;border:2px solid rgba(255,255,255,.35);background:rgba(0,0,0,.45);position:relative;overflow:hidden}
.cn-cards i.on{border-color:#ffd166;background:linear-gradient(150deg,#ffe9a3,#ffb703 55%,#d4860b);box-shadow:0 0 22px rgba(255,190,40,.75)}
.cn-cards i.on:after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.8) 50%,transparent 70%);transform:translateX(-120%);animation:cnShine 1.1s ease var(--d,0s) both}
.cn-cards i.new{animation:cnPop .55s cubic-bezier(.2,1.6,.3,1) .45s both}
@keyframes cnPop{0%{transform:scale(0) rotate(-30deg)}100%{transform:none}}
@keyframes cnShine{to{transform:translateX(120%)}}
.cn-big{font:900 italic clamp(60px,10vw,150px) "Space Grotesk",Inter,sans-serif;line-height:.9;color:#ffd166;text-shadow:0 6px 0 rgba(0,0,0,.55),0 0 40px rgba(255,190,40,.6);animation:cnSlam .62s cubic-bezier(.2,1.4,.3,1) .3s both}
/* fail */
.cn-fail .cn-title{background:none;color:#ff3b47;-webkit-background-clip:initial;background-clip:initial;filter:drop-shadow(0 6px 0 rgba(0,0,0,.6));animation:cnGlitch .9s steps(2) both}
@keyframes cnGlitch{0%{opacity:0;transform:scale(1.6)}20%{opacity:1;transform:translate(-8px,3px) scale(1.05)}35%{transform:translate(6px,-2px)}50%{transform:translate(-3px,1px)}100%{opacity:1;transform:none}}
.cn-hearts{display:flex;justify-content:center;gap:16px;margin-top:18px;font-size:clamp(34px,4vw,54px)}
.cn-hearts span{filter:drop-shadow(0 4px 0 rgba(0,0,0,.5))}
.cn-hearts span.lost{animation:cnBreak .9s ease .7s both}
.cn-hearts span.gone{opacity:.22;filter:grayscale(1)}
@keyframes cnBreak{0%{transform:none}30%{transform:scale(1.35)}100%{transform:translateY(40px) rotate(25deg) scale(.6);opacity:.15;filter:grayscale(1)}}
.cine-on .nc>*{transition:opacity .5s}.cine-on .nc>*:not(.nc-foe){opacity:.12}
@media (max-width:700px){.cn-tip{left:5vw;top:auto;bottom:14vh;transform:none}.cn-intro{bottom:14vh}.cn-slash{width:100vw}}
`;document.head.appendChild(cinCss);
function cinEl(){if(CIN.el)return CIN.el;const d=document.createElement('div');d.className='cn';
  d.innerHTML='<div class="cn-bar t"></div><div class="cn-bar b"></div><div class="cn-tint"></div><div class="cn-flash"></div><div class="cn-ptr"><i></i><b></b></div><div class="cn-stage"></div>';
  root.appendChild(d);d.addEventListener('pointerdown',e=>{if(CIN.cur&&CIN.cur.wait){e.preventDefault();e.stopPropagation();cinNext();}});return CIN.el=d;}
/* stingers, synthesised on the game's audio context */
function cinSfx(k){try{sfxInit();}catch(_){}const a=sfxAC;if(!a)return;if(a.state==='suspended')a.resume();const t0=a.currentTime+.02;
  if(!a.cin){a.cin=a.createGain();a.cin.gain.value=.6;a.cin.connect(a.destination);}const out=a.cin;
  const osc=(type,f0,f1,at,dur,v,lp)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0+at);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t0+at+dur);
    g.gain.setValueAtTime(.0001,t0+at);g.gain.exponentialRampToValueAtTime(v,t0+at+.015);g.gain.exponentialRampToValueAtTime(.0001,t0+at+dur);let n=o;if(lp){const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;o.connect(f);n=f;}n.connect(g);g.connect(out);o.start(t0+at);o.stop(t0+at+dur+.05);};
  const nz=(at,dur,v,type,f0,f1)=>{const s=a.createBufferSource();s.buffer=a.nb;s.loop=true;const f=a.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f0,t0+at);f.frequency.exponentialRampToValueAtTime(f1,t0+at+dur);
    const g=a.createGain();g.gain.setValueAtTime(.0001,t0+at);g.gain.exponentialRampToValueAtTime(v,t0+at+Math.min(.08,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,t0+at+dur);s.connect(f);f.connect(g);g.connect(out);s.start(t0+at);s.stop(t0+at+dur+.05);};
  const chord=(fs,at,dur,v,type,lp)=>fs.forEach(f=>{osc(type||'sawtooth',f,f,at,dur,v,lp||1800);osc(type||'sawtooth',f*1.006,f*1.006,at,dur,v*.7,lp||1800);});
  if(k==='in'){nz(0,.75,.55,'lowpass',5000,160);osc('sine',120,36,.05,1.3,.95);osc('triangle',55,50,.05,1.6,.35);}
  else if(k==='out'){nz(0,.38,.35,'bandpass',300,5200);osc('sine',70,150,0,.3,.3);}
  else if(k==='boss'){for(const at of[0,.2,.4]){osc('sine',130,38,at,.4,.95);nz(at,.12,.5,'lowpass',2500,400);}chord([110,130.8,164.8],.55,1.6,.09,'sawtooth',900);osc('sine',55,40,.55,1.8,.7);}
  else if(k==='stamp'){nz(0,.3,1,'lowpass',2000,300);osc('sine',95,30,0,1.2,1);osc('square',1318,1318,.02,.5,.06);osc('square',1760,1760,.05,.7,.05);chord([523.3,659.3,784],.22,1.3,.06,'sawtooth',2400);chord([659.3,784,1046.5],.5,1.4,.05,'triangle',3000);}
  else if(k==='fail'){osc('sawtooth',220,48,0,1.7,.16,1100);osc('sine',75,28,0,1.6,.9);nz(0,1.1,.4,'lowpass',900,120);}
  else if(k==='win'){[523.3,659.3,784,1046.5,1318.5].forEach((f,i)=>osc('square',f,f,i*.11,.45,.07,3000));chord([523.3,659.3,784,1046.5],.6,2.2,.05,'sawtooth',2600);osc('sine',65,40,.6,1.4,.8);}
  else if(k==='ring'){osc('sine',880,880,0,.35,.18);osc('sine',1320,1320,0,.35,.12);osc('sine',880,880,.42,.35,.18);osc('sine',1320,1320,.42,.35,.12);}
  else if(k==='slow'){nz(0,.9,.45,'lowpass',3000,200);osc('sine',90,32,0,1,.85);}}
function cinDuck(on){const a=sfxAC;if(!a||!a.out)return;const g=a.out.gain,t=a.currentTime;if(on){if(CIN.duck==null)CIN.duck=g.value;g.cancelScheduledValues(t);g.setTargetAtTime(CIN.duck*.3,t,.15);}else if(CIN.duck!=null){g.cancelScheduledValues(t);g.setTargetAtTime(CIN.duck,t,.25);CIN.duck=null;}}
/* o: {type:'tip'|'intro'|'stamp'|'title'|'fail'|'flash', kick,title,sub,steps:[[key,text]],tag,stats,c,c2,wait,hold,slow,snd,at(npc),onDone} */
function cine(o){if(!STORY)return;CIN.q.push(o);if(!CIN.cur&&CIN.leave<=0)cinPlay();}
function cinPlay(){const el=cinEl(),o=CIN.q.shift();if(!o){cinEnd();return;}CIN.cur=o;o.t=0;
  const freeze=o.wait;CIN.tgt=freeze?0:(o.slow!=null?o.slow:1);
  el.className='cn on k-'+o.type+(freeze||o.bars?' bars':'')+(o.wait?' wait':'');el.style.setProperty('--c',o.c||'#ff5fa2');el.style.setProperty('--c2',o.c2||'#ffb36b');
  root.classList.add('cine-on');cinDuck(true);
  view.style.transition='filter .8s ease';view.style.filter=o.type==='fail'?'grayscale(.9) contrast(1.15) brightness(.8)':freeze?'saturate(.35) contrast(1.12) brightness(.85)':'saturate(.7) contrast(1.08)';
  if(o.flash){const f=el.querySelector('.cn-flash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go');}
  const go=o.wait?`<div class="cn-go"><kbd>Space</kbd><span>${L('hoặc bấm chuột để tiếp tục','or click to continue')}</span></div>`:'';
  const steps=(o.steps||[]).map((s,i)=>`<li style="--d:${(.75+i*.14).toFixed(2)}s"><kbd>${cnE(s[0])}</kbd><span>${cnE(s[1])}</span></li>`).join('');
  const kick=o.kick?`<div class="cn-kick">${cnE(o.kick)}</div>`:'';const sub=o.sub?`<p class="cn-sub">${cnE(o.sub)}</p>`:'';let h='';
  if(o.type==='tip')h=`<div class="cn-card cn-tip">${kick}<h2 class="cn-title">${cnE(o.title)}</h2>${sub}${steps?`<ol class="cn-steps">${steps}</ol>`:''}${go}</div>`;
  else if(o.type==='intro')h=`<div class="cn-card cn-intro"><div class="cn-slash"></div><div class="cn-in">${kick}<h2 class="cn-title">${cnE(o.title)}</h2>${o.tag?`<p class="cn-tag">“${cnE(o.tag)}”</p>`:''}${o.stats?`<div class="cn-stats">${o.stats.map(s=>`<span>${cnE(s)}</span>`).join('')}</div>`:''}${go}</div></div>`;
  else if(o.type==='stamp')h=`<div class="cn-card cn-mid cn-stamp">${kick}<h2 class="cn-title">${cnE(o.title)}</h2>${o.big?`<div class="cn-big">${cnE(o.big)}</div>`:''}${o.cards?`<div class="cn-cards">${o.cards.map((v,i)=>`<i class="${v?'on':''}${v===2?' new':''}" style="--d:${(.5+i*.08).toFixed(2)}s"></i>`).join('')}</div>`:''}${sub}${go}</div>`;
  else if(o.type==='fail')h=`<div class="cn-card cn-mid cn-fail">${kick}<h2 class="cn-title">${cnE(o.title)}</h2>${o.hearts?`<div class="cn-hearts">${o.hearts.map(v=>`<span class="${v===2?'lost':v?'':'gone'}">❤️</span>`).join('')}</div>`:''}${sub}${go}</div>`;
  else h=`<div class="cn-card cn-mid">${kick}<h2 class="cn-title">${cnE(o.title)}</h2>${sub}${steps?`<ol class="cn-steps" style="justify-content:center">${steps}</ol>`:''}${go}</div>`;
  el.querySelector('.cn-stage').innerHTML=h;
  const ptr=el.querySelector('.cn-ptr');ptr.classList.toggle('on',!!o.at);ptr.style.opacity='0';if(o.at)ptr.querySelector('b').textContent=o.atName||o.title||'';
  if(o.at){CIN.yaw=Math.atan2(o.at.x-P.x,o.at.z-P.z);if(CIN.dist0==null){CIN.dist0=cam.dist;}}
  if(o.snd)cinSfx(o.snd);else if(freeze)cinSfx('in');if(o.say)setTimeout(()=>{if(CIN.cur===o)say(o.say[0],L(o.say[1],o.say[2]));},700);}
function cinNext(){const o=CIN.cur;if(!o||CIN.leave>0)return;if(o.wait&&o.t<.9)return;const el=cinEl();const card=el.querySelector('.cn-card');if(card)card.classList.add('out');
  el.classList.remove('wait','ready');el.querySelector('.cn-ptr').classList.remove('on');if(o.wait&&!CIN.q.length)cinSfx('out');CIN.leave=.38;CIN.cur=null;CIN.yaw=null;
  try{keys.clear();P.trigger=false;}catch(_){}if(o.onDone)try{o.onDone();}catch(e){console.warn(e);}}
function cinEnd(){const el=CIN.el;CIN.tgt=1;if(el){el.className='cn';el.querySelector('.cn-stage').innerHTML='';}root.classList.remove('cine-on');view.style.filter='';cinDuck(false);if(CIN.dist0!=null){cam.dist=CIN.dist0;CIN.dist0=null;}}
const _cv=new T.Vector3();
function cinTick(dt){const k=CIN.tgt<CIN.ts?3:2.6;CIN.ts+=(CIN.tgt-CIN.ts)*(1-Math.exp(-k*dt));if(CIN.tgt===0&&CIN.ts<.02)CIN.ts=0;if(CIN.tgt===1&&CIN.ts>.995)CIN.ts=1;
  if(CIN.leave>0){CIN.leave-=dt;if(CIN.leave<=0){CIN.leave=0;if(CIN.q.length)cinPlay();else cinEnd();}return;}
  const o=CIN.cur;if(!o)return;o.t+=dt;const el=CIN.el;
  if(o.wait&&o.t>.9&&!el.classList.contains('ready'))el.classList.add('ready');
  if(!o.wait&&o.hold&&o.t>=o.hold)cinNext();
  if(o.at&&el){const H=o.at.H&&o.at.H.root;if(H&&H.parent){H.getWorldPosition(_cv);_cv.y+=2.3;_cv.project(camera);const r=view.getBoundingClientRect(),rr=root.getBoundingClientRect();
      const ptr=el.querySelector('.cn-ptr');const vis=_cv.z<1&&Math.abs(_cv.x)<1.1&&Math.abs(_cv.y)<1.1;ptr.style.opacity=vis?'':'0';ptr.style.transform=`translate(${(_cv.x*.5+.5)*r.width+r.left-rr.left}px,${(-_cv.y*.5+.5)*r.height+r.top-rr.top}px)`;}}
  if(CIN.yaw!=null){cam.yaw=lerpA(cam.yaw,CIN.yaw,1-Math.exp(-2.2*dt));cam.lastDrag=performance.now();if(CIN.dist0!=null)cam.dist+=(CIN.dist0*.82-cam.dist)*(1-Math.exp(-1.5*dt));}}
function cinKey(k){if(!CIN.cur&&CIN.leave<=0)return false;if(CIN.cur&&CIN.cur.wait){if(k===' '||k==='enter'||k==='e'||k==='j')cinNext();return true;}return false;}
/* ---------- the story script ---------- */
const ST_TAG=[[ 'Giữ Phố Cổ bằng nắm đấm và tiền bảo kê.','Rules the Old Quarter with fists and protection money.'],['Mọi chuyến hàng qua Cảng Bắc đều phải nộp phần cho hắn.','Every shipment through the North Harbor pays his cut.'],['Không ai thấy hắn tới. Chỉ thấy hắn đi.','Nobody sees him coming. Only leaving.'],['Ngồi trên núi bạc, nuôi cả một đội đầu gấu.','Sits on a mountain of silver and a crew of thugs.'],['Cắn một lần là đủ. Đừng để hắn áp sát.','One bite is enough. Do not let him close in.']];
const ST_COL=[['#ff3b47','#7a1020'],['#2f8dff','#0d2a55'],['#b9c2cc','#3a4048'],['#c58a4a','#4a2c14'],['#2fd47a','#0e3d24']];
function stTips(){return SS.tips||(SS.tips={});}
function stOnce(id){const t=stTips();if(t[id])return false;t[id]=1;writeSave();return true;}
function stOpening(){if(SS.done)return;
  if(SS.ch===0&&stOnce('open')){playFilm(filmOpening(),stMission1);}
  else if(SS.ch===0)stMission1();
  else if(SS.ch>=1&&SS.ch<=6){const i=SS.ch-1;
    cine({type:'title',hold:3.4,slow:.35,kick:L('Story mode · tiếp tục','Story mode · continued'),title:SS.ch===6?L('Hồi cuối','Final act'):L('Chương ','Chapter ')+SS.ch,c:SS.ch===6?'#ffd166':ST_COL[i][0],c2:SS.ch===6?'#ff8a3d':'#ffffff',snd:'slow',
      sub:SS.ch===6?L('Đủ 5 mảnh thẻ. Tháp Syndicate đang chờ ở trung tâm.','All 5 key cards. Syndicate Tower is waiting downtown.'):L(`Tìm ${ST_TOWNS[i][1]} ở ${ST_TOWNS[i][2]} · ❤ ${SS.lives} mạng · 🔑 ${stKeys()}/5`,`Find ${ST_TOWNS[i][1]} in ${ST_TOWNS[i][2]} · ❤ ${SS.lives} lives · 🔑 ${stKeys()}/5`)});}}
function stMission1(){cine({type:'tip',wait:true,kick:L('Nhiệm vụ 1','Mission 1'),title:L('Gặp Chú Philip','Meet Uncle Philip'),c:'#c1f354',c2:'#ffd166',snd:'boss',
    sub:L('Chú Philip chờ ở Súng Tầm Xa. Theo đường đỏ, vào tiệm và mua vũ khí đầu tiên. Bạn có $1.500.','Uncle Philip is waiting at Long Range Guns. Follow the red route, go in and buy your first weapon. You have $1,500.'),
    steps:[['M',L('mở bản đồ · đường đỏ luôn chỉ chỗ cần tới','open the map · the red route always shows where to go')],['W A S D',L('đi · giữ Shift để chạy','move · hold Shift to run')],['F',L('lên xe gần nhất cho nhanh','jump into the nearest car to get there faster')],['E',L('vào tiệm · bấm số để mua','enter the shop · press a number to buy')]]});}
function stArmed(){cine({type:'stamp',hold:2.6,slow:.25,kick:L('Mở khoá','Unlocked'),title:L('Vũ khí đầu tiên','First weapon'),c:'#ffd166',c2:'#ff8a3d',snd:'stamp',flash:true});
  if(stOnce('gun'))cine({type:'tip',wait:true,kick:L('Hướng dẫn','How to'),title:L('Bắn súng','Shooting'),c:'#ffd166',c2:'#ff8a3d',
    steps:[['1 – 4',L('đổi vũ khí · 1 là tay không','switch weapons · 1 is fists')],['2 – 4',L('cầm súng · vòng ngắm hiện giữa màn hình','hold a gun · the aim circle appears in the middle')],[L('Chuột / touchpad','Mouse / touchpad'),L('di chuyển để ngắm, không cần bấm · vòng đỏ là trúng','just move it to aim, no clicking · red means on target')],['B',L('bắn · giữ B để xả liên tục','shoot · hold B to keep firing')],['!',L('bắn người ngoài phố là bị truy nã','shooting people on the street gets you wanted')]]});
  cine({type:'tip',wait:true,kick:L('Chương 1','Chapter 1'),title:ST_TOWNS[0][2],c:ST_COL[0][0],c2:'#ffb36b',sub:L(`Trùm đầu tiên, ${ST_TOWNS[0][1]}, đang giữ khu này. Theo đường đỏ để tìm hắn.`,`The first boss, ${ST_TOWNS[0][1]}, runs this district. Follow the red route to find him.`)});}
function stIntro(i){const g=stGang;if(!g)return;const b=g.boss;
  cine({type:'intro',wait:true,at:b,atName:L('Trùm','Boss'),kick:L(`Chương ${i+1} · ${ST_TOWNS[i][2]}`,`Chapter ${i+1} · ${ST_TOWNS[i][2]}`),title:ST_TOWNS[i][1],tag:L(ST_TAG[i][0],ST_TAG[i][1]),
    stats:[L('Đàn em Syndicate','Syndicate henchman'),`❤ ${b.maxHp}`,L(`${g.list.length-1} đàn em`,`${g.list.length-1} henchmen`),'🔑 '+(stKeys()+1)+'/5'],c:ST_COL[i][0],c2:ST_COL[i][1],snd:'boss',flash:true});}
function stFightTip(){if(!stOnce('fight'))return;
  cine({type:'tip',wait:true,kick:L('Giữa trận · hướng dẫn','Mid-fight · how to'),title:L('Cách hạ trùm','How to beat a boss'),c:'#ff3b47',c2:'#ffb36b',snd:'slow',
    steps:[['Click / J',L('đánh · bấm liền 3 lần ra combo đấm, đấm, đá','attack · tap 3 times for a punch, punch, kick combo')],[L('Giữ chuột phải / K','Hold right click / K'),L('đỡ đòn · đỡ đúng lúc hắn ra đòn sẽ làm hắn choáng','block · blocking right as he swings stuns him')],['2 – 4',L('rút súng nếu có · bắn từ xa an toàn hơn','pull a gun if you have one · range is safer')],['Shift',L('chạy vòng ra, hạ đàn em trước để không bị vây','circle away and drop the henchmen first so you are not surrounded')]]});}
function stHalf(n){cine({type:'title',hold:1.5,slow:.18,kick:n.boss||'',title:L('Còn một nửa máu!','Half health!'),c:'#ff3b47',c2:'#ffd166',snd:'slow'});}
function stWhenFree(fn,d){const t=setInterval(()=>{if(!CIN.cur&&!CIN.q.length&&CIN.leave<=0&&!MOV.on){clearInterval(t);setTimeout(fn,d||1200);}},400);}
function stKeyStamp(i){const k=stKeys();stWhenFree(()=>stCall(k),1500);
  cine({type:'stamp',hold:3.6,slow:.12,kick:L(`${ST_TOWNS[i][1]} đã gục`,`${ST_TOWNS[i][1]} is down`),title:L('Mảnh thẻ khoá','Key card'),big:k+'/5',cards:SS.keys.map((v,j)=>j===i?2:v?1:0),c:'#ffd166',c2:'#ff8a3d',snd:'stamp',flash:true,
    sub:k>=5?L('+$2.000 · Đủ 5 mảnh!','+$2,000 · All five!'):L(`+$2.000 · tiếp theo: ${ST_TOWNS[SS.ch-1][2]}`,`+$2,000 · next: ${ST_TOWNS[SS.ch-1][2]}`)});
  if(k>=5)cine({type:'title',wait:true,kick:L('Hồi cuối','Final act'),title:L('Tháp Syndicate đã mở','Syndicate Tower is open'),c:'#ffd166',c2:'#ff5fa2',snd:'boss',
    sub:L('Ông Trùm Vương đang chờ trên sân thượng. Theo đường đỏ tới trung tâm. Cắt đuôi cảnh sát trước khi vào.','Boss Vương is waiting on the roof. Follow the red route downtown. Lose the police before you go in.')});
  else if(stOnce('afterkey'))cine({type:'tip',wait:true,kick:L('Mẹo','Tip'),title:L('Hồi sức trước trận sau','Recover before the next fight'),c:'#2fd47a',c2:'#c1f354',
    steps:[['E',L('ngủ ở nhà an toàn: lưu game, hồi đầy máu','sleep at your safehouse: save and full health')],['🍚',L('Cơm Tấm Cô Ba bán đồ ăn hồi máu','Cô Ba\'s Broken Rice sells healing food')],['🔫',L('mua thêm súng và áo giáp bằng tiền thưởng','spend the reward on guns and armor')]]});}
function stTowerIntro(){cine({type:'intro',wait:true,at:stTower&&stTower.boss,atName:L('Ông Trùm','The Boss'),kick:L('Thủ lĩnh Syndicate · Hồi cuối','Leader of the Syndicate · Final act'),title:L('Ông Trùm Vương','Boss Vương'),
    tag:L('Con trai của Jonathan. Mày không biết ba mày từng là người của tao à?','Jonathan\'s boy. Did you know your father used to work for me?'),say:['vuong','Con trai của Jonathan. Mày không biết ba mày từng là người của tao à?','Jonathan\'s boy. Did you know your father used to work for me?'],stats:['❤ 1100',L('6 vệ sĩ','6 bodyguards'),'🚁'],c:'#d4a017',c2:'#3a2a00',snd:'boss',flash:true});
  if(stOnce('tower'))cine({type:'tip',wait:true,kick:L('Sân thượng','Rooftop'),title:L('Sống sót trên mái','Survive the roof'),c:'#ffd166',c2:'#ff8a3d',
    steps:[['E',L('thùng đạn cạnh cửa: nạp đầy đạn bao nhiêu lần cũng được','ammo crate by the door: refill as often as you like')],['⬛',L('núp sau máy lạnh và lỗ thông gió','take cover behind AC units and vents')],['🎯',L('hạ vệ sĩ trước, rồi dồn Ông Trùm','drop the bodyguards first, then go for the Boss')]]});}
function stHeliTip(){cine({type:'tip',wait:true,kick:L('Hắn đang bỏ chạy!','He is getting away!'),title:L('Bắn rơi trực thăng','Shoot down the helicopter'),c:'#ff3b47',c2:'#ffd166',snd:'boss',flash:true,
    steps:[['2 – 4',L('chọn súng bắn nhanh nhất','pick your fastest-firing gun')],[L('Chuột','Mouse'),L('di chuột ngắm lên thân trực thăng','move the mouse onto the helicopter body')],[L('Giữ B','Hold B'),L('xả đạn liên tục','keep firing')],['Shift',L('chạy liên tục · hắn bắn trả từ trên cao','keep moving · he shoots back from above')],['E',L('hết đạn thì ra thùng đạn cạnh cửa','out of ammo? hit the crate by the door')]]});}
function stHeliDown(){cine({type:'stamp',hold:2.6,slow:.15,kick:L('Trúng rồi!','Direct hit!'),title:L('Trực thăng đang rơi','The helicopter is going down'),c:'#ffd166',c2:'#ff5fa2',snd:'stamp',flash:true});}
function stFail(lost){const h=[0,1,2].map(j=>j<SS.lives?1:j===SS.lives&&!lost?2:0);
  if(lost)cine({type:'fail',hold:4.4,slow:.15,kick:L('Hết mạng','Out of lives'),title:L('Nhiệm vụ thất bại','Mission failed'),hearts:[2,2,2],snd:'fail',c:'#ff3b47',
    sub:L('Mất hết mảnh thẻ khoá. Làm lại từ trùm đầu tiên với 3 mạng mới.','All key cards are lost. Start again from the first boss with 3 new lives.')});
  else cine({type:'fail',hold:3.4,slow:.15,kick:L('Story mode','Story mode'),title:L('Gục ngã','You went down'),hearts:h,snd:'fail',c:'#ff3b47',
    sub:L(`Tỉnh lại ở bệnh viện · còn ${SS.lives} mạng · tiến độ vẫn được giữ`,`You wake up in hospital · ${SS.lives} lives left · progress kept`)});}
function stWantedTip(){if(!stOnce('wanted'))return;cine({type:'tip',wait:true,kick:L('Cảnh báo','Warning'),title:L('Bị truy nã','Wanted'),c:'#2f8dff',c2:'#ff3b47',snd:'slow',
    steps:[['★',L('càng nhiều sao, cảnh sát càng đông và càng mạnh tay','more stars means more police and heavier force')],['👁',L('chạy khỏi tầm nhìn của cảnh sát cho tới khi sao tắt','break line of sight until the stars fade')],['🚗',L('lên xe chạy cho nhanh','grab a car to get away faster')],['🏢',L('đang bị truy nã thì không vào được Tháp Syndicate','you cannot enter Syndicate Tower while wanted')]]});}
function stLowTip(){if(!stOnce('lowhp'))return;cine({type:'tip',wait:true,kick:L('Nguy hiểm','Danger'),title:L('Máu thấp','Low health'),c:'#ff3b47',c2:'#ffd166',snd:'slow',
    steps:[['Shift',L('rút lui khỏi trận ngay','back off from the fight now')],['🍚',L('Cơm Tấm Cô Ba bán đồ ăn hồi máu','Cô Ba\'s Broken Rice sells healing food')],['E',L('ngủ ở nhà để hồi đầy máu','sleep at home for full health')],['❤',L(`còn ${SS.lives} mạng · gục là mất 1 mạng`,`${SS.lives} lives left · going down costs one`)]]});}

/* ======== STORY FILM "Món nợ của Cha": in-engine cutscenes with voiced dialogue (speech synthesis), subtitles,
   scripted actors, camera moves, flashback grade, fire, music, and phone calls during play ======== */
const isEN=()=>L('v','e')==='e';
const CAST={
  minh:{n:['Joseph','Joseph'],look:CHARS.minh,col:'#7ec3ff',pitch:.9,rate:1.02,male:true},
  linh:{n:['Oscar','Oscar'],look:CHARS.oscar,col:'#ff9fb8',pitch:1.2,rate:1.04},
  ba:{n:['Jonathan · Ba','Jonathan · Father'],look:{female:false,skin:'#b77c58',hair:'#a8a8a8',hairStyle:'short',beard:true,shirt:'#5b6b4a',pants:'#3b3b3b',shoes:'#2a2522',sleeve:true,longSleeve:true},col:'#ffd166',pitch:.72,rate:.9,male:true},
  tu:{n:['Chú Philip','Uncle Philip'],look:{female:false,skin:'#c08a62',hair:'#222222',hairStyle:'bald',beard:true,glasses:true,shirt:'#d9d2c3',jacket:'#2b2b2b',pants:'#262a33',shoes:'#111111',sleeve:true},col:'#c1f354',pitch:.78,rate:.96,male:true},
  lao:{n:['Lantern Mike','Lantern Mike'],look:ST_BODY[0],col:'#ff5a4a',pitch:.58,rate:.88,male:true},
  thug:{n:['Đàn em','Henchman'],look:{female:false,skin:'#b98260',hair:'#111111',hairStyle:'buzz',shirt:'#1a1a1a',jacket:'#7a1f2b',pants:'#141414',shoes:'#111111'},col:'#ff5a4a',pitch:.66,rate:1,male:true},
  gang:{n:['Cả năm đàn em','All five henchmen'],look:ST_BODY[1],col:'#ff8a3d',pitch:.62,rate:1,male:true},
  vuong:{n:['Ông Trùm Vương','Boss Vương'],look:VUONG_LOOK,col:'#d4a017',pitch:.55,rate:.86,male:true},
  nurse:{n:['Y tá','Nurse'],look:{female:true,skin:'#e9bf9b',hair:'#2a1a12',hairStyle:'bun',shirt:'#9fd3e6',pants:'#9fd3e6',shoes:'#f5f5f3',sleeve:false},col:'#9fd3e6',pitch:1.15,rate:1.05}};
/* ---- voices ---- */
const VO={ok:!!(window.speechSynthesis&&window.SpeechSynthesisUtterance),gen:0};
if(VO.ok)try{speechSynthesis.getVoices();speechSynthesis.addEventListener&&speechSynthesis.addEventListener('voiceschanged',()=>{});}catch(_){VO.ok=false;}
function voVoice(male){if(!VO.ok)return null;const lg=isEN()?'en':'vi';let vs=[];try{vs=speechSynthesis.getVoices().filter(v=>(v.lang||'').toLowerCase().replace('_','-').startsWith(lg));}catch(_){}
  if(!vs.length)return null;const M=/\bmale\b|daniel|alex|fred|david|james|thomas|aaron|arthur|rishi|guy|mark|oliver|nam\b|minh|an\b/i,F=/female|samantha|karen|victoria|zira|moira|tessa|susan|linh|hoai|my\b|nữ/i;
  const pref=vs.filter(v=>male?M.test(v.name)&&!/female/i.test(v.name):F.test(v.name));const loc=vs.filter(v=>v.localService);return(pref[0]||loc[0]||vs[0]);}
/* speak one line; cb fires once when it ends (or after a safe estimate if speech is unavailable) */
function say(who,text,cb){const c=CAST[who]||{},est=1+String(text).length*(isEN()?.062:.07);let done=false,g=++VO.gen;const fin=()=>{if(done)return;done=true;cb&&cb();};
  if(!VO.ok){setTimeout(fin,est*1000);return;}
  try{const u=new SpeechSynthesisUtterance(text);u.lang=isEN()?'en-US':'vi-VN';const v=voVoice(!!c.male);if(v)u.voice=v;u.pitch=c.pitch||1;u.rate=c.rate||1;u.volume=1;
    u.onend=fin;u.onerror=()=>setTimeout(fin,600);speechSynthesis.speak(u);setTimeout(fin,(est*2.2+2.5)*1000);}catch(_){setTimeout(fin,est*1000);}}
function voStop(){VO.gen++;try{VO.ok&&speechSynthesis.cancel();}catch(_){}}
/* ---- overlay ---- */
const movCss=document.createElement('style');movCss.textContent=`
.mv{position:absolute;inset:0;z-index:45;pointer-events:none;font-family:"Space Grotesk",Inter,system-ui,sans-serif;color:#fff;overflow:hidden}
.mv .cn-bar{transform:none}
.mv-black{position:absolute;inset:0;background:#000;opacity:1;transition:opacity .7s ease;z-index:4}
.mv-black.off{opacity:0}
.mv-grain{position:absolute;inset:0;z-index:2;opacity:0;transition:opacity .6s;background:repeating-linear-gradient(0deg,rgba(255,240,200,.05) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
.mv.flash .mv-grain{opacity:1;animation:mvFlick .18s steps(2) infinite}
@keyframes mvFlick{50%{opacity:.6}}
.mv.flash:after{content:"";position:absolute;inset:0;z-index:2;box-shadow:inset 0 0 160px 40px rgba(40,20,0,.75)}
.mv-sub{position:absolute;left:50%;bottom:calc(12vh + 22px);transform:translateX(-50%);z-index:5;max-width:min(980px,90vw);background:rgba(0,0,0,.5);padding:6px 16px;border-radius:8px;text-align:center;font:600 clamp(17px,1.9vw,25px)/1.4 Inter,system-ui,sans-serif;text-shadow:0 2px 6px #000,0 0 2px #000;opacity:0;transition:opacity .25s}
.mv-sub.on{opacity:1}
.mv-sub b{font-family:"Space Grotesk",Inter,sans-serif;font-weight:800;margin-right:.45em}
.mv-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1100px,92vw);text-align:center;z-index:5}
.mv-card .cn-kick:after{content:"";width:42px;height:3px;background:currentColor;box-shadow:0 0 12px currentColor}
.mv-card .cn-sub{margin-left:auto;margin-right:auto}
.mv-card.out{animation:cnOut .6s ease-in forwards}
.mv-loc{position:absolute;left:6vw;bottom:calc(12vh + 26px);z-index:5;font:800 clamp(14px,1.5vw,19px) Inter,system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase;animation:cnKick .8s ease both}
.mv-loc small{display:block;font-weight:600;letter-spacing:.08em;opacity:.75;text-transform:none;margin-top:4px}
.mv-skip{position:absolute;right:24px;top:calc(12vh + 14px);z-index:6;display:flex;align-items:center;gap:10px;font:700 13px Inter,system-ui,sans-serif;color:rgba(255,255,255,.75);pointer-events:auto;cursor:pointer}
.mv-skip i{width:70px;height:4px;border-radius:2px;background:rgba(255,255,255,.25);overflow:hidden}.mv-skip i:before{content:"";display:block;height:100%;width:var(--p,0%);background:#fff}
.mv-who{position:absolute;left:5vw;top:30%;z-index:5;display:flex;align-items:stretch;gap:0;animation:mvWhoIn .55s cubic-bezier(.2,.9,.2,1) both}
.mv-who.out{animation:mvWhoOut .45s ease-in forwards}
.mv-who i{width:10px;background:var(--c);box-shadow:0 0 24px var(--c)}
.mv-who div{padding:14px 70px 16px 20px;background:linear-gradient(100deg,rgba(0,0,0,.82),rgba(0,0,0,.55) 75%,rgba(0,0,0,0));clip-path:polygon(0 0,100% 0,92% 100%,0 100%)}
.mv-who small{display:block;font:800 13px Inter,system-ui,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:var(--c);animation:cnKick .6s ease .15s both}
.mv-who b{display:block;font:900 italic clamp(46px,6.4vw,92px)/.95 "Space Grotesk",Inter,sans-serif;text-transform:uppercase;letter-spacing:-.01em;margin:.08em 0 .1em;text-shadow:0 5px 0 rgba(0,0,0,.5);animation:cnSlam .6s cubic-bezier(.2,1.4,.3,1) .1s both}
.mv-who span{display:block;font:600 clamp(15px,1.5vw,20px) Inter,system-ui,sans-serif;color:rgba(255,255,255,.92);animation:cnUp .6s ease .45s both}
@keyframes mvWhoIn{from{opacity:0;transform:translateX(-80px) skewX(-8deg)}to{opacity:1;transform:none}}
@keyframes mvWhoOut{to{opacity:0;transform:translateX(-60px)}}
.mv-ring{position:absolute;left:0;top:0;z-index:4;width:0;height:0;opacity:0;transition:opacity .3s}
.mv-ring.on{opacity:1}
.mv-ring:before{content:"";position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;border:3px solid var(--c);box-shadow:0 0 20px var(--c);animation:cnRing 1.1s ease-in-out infinite}
.mv-flash{position:absolute;inset:0;z-index:3;background:#fff;opacity:0;pointer-events:none}.mv-flash.go{animation:cnFlash .5s ease-out}
.mov-on .nc{display:none}
.mv-roll{position:absolute;left:50%;top:100%;transform:translateX(-50%);z-index:5;text-align:center;width:min(700px,90vw);font:600 18px/1.8 Inter,system-ui,sans-serif}
.mv-roll h3{font:900 italic 54px "Space Grotesk",Inter,sans-serif;margin:0 0 .3em;background:linear-gradient(100deg,#fff,#ffd166,#ff5fa2);-webkit-background-clip:text;background-clip:text;color:transparent}
.mv-roll em{display:block;font-style:normal;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#ffd166;margin-top:1.6em}
/* phone calls during play */
.mv-phone{position:absolute;right:18px;top:26%;z-index:44;width:min(330px,80vw);background:linear-gradient(160deg,rgba(18,20,30,.94),rgba(8,9,14,.94));border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:14px 16px;color:#fff;font-family:Inter,system-ui,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.55);transform:translateX(120%);transition:transform .45s cubic-bezier(.2,.9,.2,1)}
.mv-phone.on{transform:none}
.mv-phone header{display:flex;align-items:center;gap:12px}
.mv-av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font:900 20px "Space Grotesk",Inter,sans-serif;color:#111;flex:none}
.mv-phone header b{display:block;font:800 16px "Space Grotesk",Inter,sans-serif}.mv-phone header small{color:rgba(255,255,255,.6);font-size:12px}
.mv-phone.ring .mv-av{animation:mvRing .5s ease-in-out infinite}
@keyframes mvRing{0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}}
.mv-phone p{margin:12px 0 0;font-size:15px;line-height:1.45;min-height:2.9em}
.mv-phone p b{font-weight:800;margin-right:6px}
.mv-wave{display:flex;gap:3px;height:14px;align-items:end;margin-left:auto}.mv-wave i{width:3px;background:#7df9a0;border-radius:2px;animation:mvWave .7s ease-in-out infinite}
.mv-wave i:nth-child(2){animation-delay:.15s}.mv-wave i:nth-child(3){animation-delay:.3s}.mv-wave i:nth-child(4){animation-delay:.45s}
@keyframes mvWave{0%,100%{height:3px}50%{height:14px}}
`;document.head.appendChild(movCss);
const MOV={on:false,film:null,si:-1,s:null,t:0,li:0,lt:0,speaking:false,doneT:-1,end:0,cast:{},fx:null,cars:[],music:null,skip:0,skipHeld:false,el:null,keep:null,cb:null};
function movEl(){if(MOV.el)return MOV.el;const d=document.createElement('div');d.className='mv';
  d.innerHTML='<div class="cn-bar t"></div><div class="cn-bar b"></div><div class="mv-grain"></div><div class="mv-flash"></div><div class="mv-ring"></div><div class="mv-stage"></div><div class="mv-sub"></div><div class="mv-skip"><span></span><i></i></div><div class="mv-black"></div>';
  root.appendChild(d);d.querySelector('.mv-skip').addEventListener('pointerdown',e=>{e.preventDefault();MOV.skipHeld=true;});window.addEventListener('pointerup',()=>{MOV.skipHeld=false;});
  window.addEventListener('keyup',e=>{if(e.key===' ')MOV.skipHeld=false;});return MOV.el=d;}
/* ---- actors ---- */
function actor(id,who,x,z,h,o){const c=CAST[who];const look=Object.assign({},c.look,o&&o.look||{});const H=makeHuman(look);resetHuman(H);if(o&&o.scale)H.root.scale.setScalar(o.scale);
  const a={id,who,H,x,z,h:h||0,spd:0,path:null,v:0,pose:o&&o.pose||null,talk:0,y:o&&o.y,inside:o&&o.inside};MOV.cast[id]=a;return a;}
function walk(a,pts,v){a.path=pts.map(p=>({x:p[0],z:p[1]}));a.v=v||1.5;}
function actTick(a,dt){let spd=0;if(a.path&&a.path.length){const p=a.path[0],dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);if(d<.12){a.path.shift();if(!a.path.length)a.path=null;}else{const s=Math.min(d,a.v*dt);a.x+=dx/d*s;a.z+=dz/d*s;a.h=lerpA(a.h,Math.atan2(dx,dz),1-Math.exp(-10*dt));spd=a.v;}}
  if(a.face!=null&&!a.path)a.h=lerpA(a.h,a.face,1-Math.exp(-6*dt));
  a.spd+=(spd-a.spd)*Math.min(1,dt*8);const H=a.H;const y=a.y!=null?a.y:a.inside?0:groundY(a.x,a.z);
  H.root.position.set(a.x,y,a.z);H.root.rotation.y=a.h;H.root.rotation.x=0;animHuman(H,dt,a.spd,time+MOV.t);
  const T0=MOV.t;
  if(a.pose==='cross'){H.armL.rotation.x=-.75;H.armR.rotation.x=-.75;H.elL.rotation.x=-1.75;H.elR.rotation.x=-1.75;H.armL.rotation.z=.5;H.armR.rotation.z=-.5;}
  else if(a.pose==='reach'){H.armR.rotation.x=-.95;H.elR.rotation.x=-.35;}
  else if(a.pose==='hug'){H.armL.rotation.x=-1.25;H.armR.rotation.x=-1.25;H.elL.rotation.x=-1.1;H.elR.rotation.x=-1.1;}
  else if(a.pose==='salute'){H.armR.rotation.x=-1.25;H.elR.rotation.x=-2.1;H.spine.rotation.x=.12;H.head.rotation.x=.18;}
  else if(a.pose==='wrench'){H.armR.rotation.x=-.45;H.elR.rotation.x=-.9;}
  else if(a.pose==='cry'){H.head.rotation.x=.35;H.armL.rotation.x=-1.3;H.elL.rotation.x=-2.3;H.armR.rotation.x=-1.25;H.elR.rotation.x=-2.3;}
  else if(a.pose==='recline'){H.root.rotation.x=-1.05;H.legL.rotation.x=-1.4;H.legR.rotation.x=-1.4;H.knL.rotation.x=.15;H.knR.rotation.x=.15;}
  else{H.armL.rotation.z=-.07;H.armR.rotation.z=.07;}
  if(a.talk>0&&!H.ko){a.talk-=dt;H.head.rotation.x+=Math.sin(T0*9.5)*.05;H.head.rotation.y+=Math.sin(T0*3.1)*.09;if(!a.pose&&a.spd<.3){H.armR.rotation.x+=-.35-Math.sin(T0*4.2)*.22;H.elR.rotation.x=-1.1+Math.sin(T0*3)*.2;}}}
function movClear(){if(MOV.lights){for(const l of MOV.lights)scene.remove(l);MOV.lights=[];}for(const k in MOV.cast){const a=MOV.cast[k];scene.remove(a.H.root);}MOV.cast={};for(const c of MOV.cars)removeCar(c);MOV.cars=[];fireOff();}
/* ---- fire and smoke for the flashback ---- */
let FIRE=null;
function fireOn(pts,big){if(!FIRE){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
    const tex=new T.CanvasTexture(cv),P2=[];for(let i=0;i<90;i++){const m=new T.SpriteMaterial({map:tex,color:'#ff8a2a',transparent:true,depthWrite:false,blending:T.AdditiveBlending});const s=new T.Sprite(m);s.visible=false;scene.add(s);P2.push({s,t:0,life:1,vx:0,vy:0,vz:0,smoke:false});}
    const light=new T.PointLight('#ff7a2a',0,26,1.6);scene.add(light);FIRE={tex,P:P2,light,pts:[],on:false,k:0,smk:[]};
    for(let i=0;i<40;i++){const m=new T.SpriteMaterial({map:tex,color:'#1b1714',transparent:true,depthWrite:false,opacity:0});const s=new T.Sprite(m);s.visible=false;scene.add(s);FIRE.smk.push({s,t:0,life:1});}}
  FIRE.pts=pts;FIRE.on=true;FIRE.k=big?1:.15;FIRE.light.position.set(pts[0][0],2.5,pts[0][2]);}
function fireOff(){if(!FIRE)return;FIRE.on=false;FIRE.light.intensity=0;for(const p of FIRE.P)p.s.visible=false;for(const p of FIRE.smk)p.s.visible=false;}
function fireTick(dt){if(!FIRE||!FIRE.on)return;const F=FIRE;F.light.intensity=(2.2+Math.sin(MOV.t*23)*.5+Math.sin(MOV.t*7.3)*.6)*F.k*3;
  const rate=Math.round(70*F.k*dt*10);for(let n=0;n<rate;n++){const p=F.P.find(p=>p.t<=0);if(!p)break;const o=F.pts[(Math.random()*F.pts.length)|0];p.t=p.life=.6+Math.random()*.7;p.x=o[0]+rnd(-1.2,1.2);p.y=o[1]+rnd(0,.6);p.z=o[2]+rnd(-.5,.5);p.vx=rnd(-.3,.3);p.vy=rnd(2,4.2);p.vz=rnd(-.3,.3);p.sz=rnd(.7,1.4)*(.6+F.k*.6);p.s.visible=true;}
  for(const p of F.P){if(p.t<=0)continue;p.t-=dt;if(p.t<=0){p.s.visible=false;continue;}const k=1-p.t/p.life;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.s.position.set(p.x,p.y,p.z);p.s.scale.setScalar(p.sz*(1-k*.6));
    p.s.material.color.setHSL(.02+.07*(1-k),1,.36+.14*(1-k));p.s.material.opacity=Math.min(.85,(1-k)*1.3);}
  if(Math.random()<dt*14*F.k){const p=F.smk.find(p=>p.t<=0);if(p){const o=F.pts[(Math.random()*F.pts.length)|0];p.t=p.life=3+Math.random()*2;p.x=o[0]+rnd(-1,1);p.y=o[1]+2.5;p.z=o[2];p.s.visible=true;}}
  for(const p of F.smk){if(p.t<=0)continue;p.t-=dt;if(p.t<=0){p.s.visible=false;continue;}const k=1-p.t/p.life;p.y+=1.6*dt;p.x+=.4*dt;p.s.position.set(p.x,p.y,p.z);p.s.scale.setScalar(2+k*6);p.s.material.opacity=.55*Math.sin(k*Math.PI);}}
/* ---- score: slow synth pads and bells, different per mood ---- */
function movMusic(mood){const a=sfxAC;if(MOV.music){const m=MOV.music;try{m.g.gain.setTargetAtTime(0,a.currentTime,.5);setTimeout(()=>{try{m.g.disconnect();}catch(_){}},3000);}catch(_){}MOV.music=null;}
  if(!mood||!a)return;const g=a.createGain();g.gain.value=0;g.gain.setTargetAtTime(mood==='fire'?.13:.1,a.currentTime,1);g.connect(a.destination);
  const P2={sad:[[220,261.6,329.6],[174.6,220,261.6],[130.8,196,261.6],[196,246.9,293.7]],hope:[[261.6,329.6,392],[196,246.9,293.7],[220,261.6,329.6],[174.6,220,261.6]],
    tense:[[146.8,174.6,220],[138.6,174.6,207.7]],fire:[[110,130.8,164.8],[103.8,130.8,155.6]],title:[[130.8,196,261.6],[146.8,220,293.7]]}[mood];
  MOV.music={g,prog:P2,i:0,next:a.currentTime+.05,mood};}
function musicTick(){const m=MOV.music,a=sfxAC;if(!m||!a)return;while(m.next<a.currentTime+.25){const ch=m.prog[m.i%m.prog.length],t=m.next,len=m.mood==='tense'||m.mood==='fire'?2.4:4;
    for(const f of ch)for(const det of[-4,4]){const o=a.createOscillator(),gg=a.createGain(),fl=a.createBiquadFilter();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;fl.type='lowpass';fl.frequency.value=m.mood==='fire'?500:900;
      gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(.05,t+len*.35);gg.gain.linearRampToValueAtTime(0,t+len+.6);o.connect(fl);fl.connect(gg);gg.connect(m.g);o.start(t);o.stop(t+len+.7);}
    {const o=a.createOscillator(),gg=a.createGain();o.type='sine';o.frequency.value=ch[0]/2;gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(.16,t+.4);gg.gain.linearRampToValueAtTime(0,t+len+.4);o.connect(gg);gg.connect(m.g);o.start(t);o.stop(t+len+.5);}
    if(m.mood==='sad'||m.mood==='hope'){const arp=[ch[0]*2,ch[1]*2,ch[2]*2,ch[1]*2];arp.forEach((f,j)=>{const tt=t+j*len/4,o=a.createOscillator(),gg=a.createGain();o.type='triangle';o.frequency.value=f;gg.gain.setValueAtTime(.0001,tt);gg.gain.exponentialRampToValueAtTime(.09,tt+.01);gg.gain.exponentialRampToValueAtTime(.0001,tt+1.6);o.connect(gg);gg.connect(m.g);o.start(tt);o.stop(tt+1.7);});}
    if(m.mood==='tense'){for(let j=0;j<8;j++){const tt=t+j*len/8,o=a.createOscillator(),gg=a.createGain();o.type='square';o.frequency.value=ch[0]/2;gg.gain.setValueAtTime(.0001,tt);gg.gain.exponentialRampToValueAtTime(.05,tt+.01);gg.gain.exponentialRampToValueAtTime(.0001,tt+.18);o.connect(gg);gg.connect(m.g);o.start(tt);o.stop(tt+.2);}}
    if(m.mood==='fire'&&a.nb){const s=a.createBufferSource();s.buffer=a.nb;s.loop=true;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=.7;const gg=a.createGain();gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(.35,t+.3);gg.gain.linearRampToValueAtTime(0,t+len+.2);s.connect(f);f.connect(gg);gg.connect(m.g);s.start(t);s.stop(t+len+.3);}
    m.i++;m.next+=len;}}
/* ---- player ---- */
function playFilm(shots,cb){if(MOV.on){cb&&cb();return;}try{sfxInit();}catch(_){}const el=movEl();MOV.on=true;MOV.film=shots;MOV.si=-1;MOV.cb=cb;MOV.skip=0;MOV.skipHeld=false;
  MOV.keep={x:P.x,z:P.z,h:P.h,inside:P.inside,hour:tod.hour,fov:camera.fov,car:P.car};if(P.car)toggleCar&&toggleCar();
  el.className='mv';el.style.display='';el.querySelector('.mv-black').classList.remove('off');el.querySelector('.mv-skip span').textContent=L('Giữ Space để bỏ qua','Hold Space to skip');
  root.classList.add('mov-on');keys.clear();cinDuck(true);movNext();}
function movNext(){const el=MOV.el;MOV.si++;const s=MOV.film[MOV.si];movClear();el.querySelector('.mv-stage').innerHTML='';subOff();
  if(!s){movEnd();return;}MOV.s=s;MOV.t=0;MOV.frz=0;MOV.ring=null;if(MOV.el)MOV.el.querySelector('.mv-ring').classList.remove('on');MOV.li=0;MOV.lt=s.lines&&s.lines[0]&&s.lines[0][3]!=null?s.lines[0][3]:.8;MOV.speaking=false;MOV.doneT=-1;MOV.end=0;
  P.inside=s.inside||null;if(s.px!=null){P.x=s.px;P.z=s.pz;}P.vy=0;P.y=0;
  view.style.transition='filter .6s';view.style.filter=s.flash?'sepia(.85) saturate(1.3) contrast(1.15) brightness(.92)':(s.grade||'');el.classList.toggle('flash',!!s.flash);
  if(s.music!==undefined&&(!MOV.music||MOV.music.mood!==s.music))movMusic(s.music);
  camera.fov=s.fov||48;camera.updateProjectionMatrix();
  if(gps.mesh)gps.mesh.visible=false;if(s.setup)s.setup();
  if(s.loc)el.querySelector('.mv-stage').insertAdjacentHTML('beforeend',`<div class="mv-loc">${cnE(s.loc[0])}<small>${cnE(s.loc[1]||'')}</small></div>`);
  if(s.card)setTimeout(()=>{if(MOV.s===s)el.querySelector('.mv-stage').insertAdjacentHTML('beforeend',`<div class="mv-card" style="--c:${s.card.c||'#ff5fa2'};--c2:${s.card.c2||'#ffb36b'}">${s.card.kick?`<div class="cn-kick">${cnE(s.card.kick)}</div>`:''}<h2 class="cn-title">${cnE(s.card.title)}</h2>${s.card.sub?`<p class="cn-sub">${cnE(s.card.sub)}</p>`:''}</div>`);if(s.card.snd)cinSfx(s.card.snd);},(s.card.at||.6)*1000);
  movCam(0);const b=el.querySelector('.mv-black');if(s.black)b.classList.remove('off');else setTimeout(()=>b.classList.add('off'),30);}
function subOn(who,text){const el=MOV.el.querySelector('.mv-sub'),c=CAST[who]||{};el.innerHTML=`<b style="color:${c.col||'#fff'}">${cnE(c.n?L(c.n[0],c.n[1]):'')}</b>${cnE(text)}`;el.classList.add('on');}
function subOff(){if(MOV.el)MOV.el.querySelector('.mv-sub').classList.remove('on');}
const _ma=new T.Vector3(),_mb=new T.Vector3();
function movCam(dt){const s=MOV.s;if(!s||!s.cam)return;const C=s.cam,dur=s.camT||s.dur||6;let k=clamp(MOV.t/dur,0,1);k=s.linear?k:k*k*(3-2*k);
  const A=C[0],B=C[1]||C[0];const p=[0,1,2].map(i=>A.p[i]+(B.p[i]-A.p[i])*k),l=[0,1,2].map(i=>A.l[i]+(B.l[i]-A.l[i])*k);
  let fx=0,fy=0;if(s.follow){const a=MOV.cast[s.follow];if(a){fx=a.x;fy=a.z;}}
  PP.dof=GFX==='ultra'?.9:0;PP.focus=Math.max(1.5,Math.hypot(p[0]-l[0],p[1]-l[1],p[2]-l[2]));
  const hand=s.hand?Math.sin(MOV.t*1.3)*.03:0;camera.position.set(p[0]+fx,p[1]+hand,p[2]+fy);camera.lookAt(l[0]+fx,l[1]+hand*.5,l[2]+fy);
  sky.position.copy(camera.position);const Ld=tod.lightDir;sun.position.set(l[0]+fx+Ld.x*220,Ld.y*220,l[2]+fy+Ld.z*220);sun.target.position.set(l[0]+fx,0,l[2]+fy);sun.target.updateMatrixWorld();}
/* character intro: freeze-frame, name card slams in, a ring marks who it is */
const WHO={joseph:()=>['Joseph',L('Nhân vật chính','The hero'),L('Về Nexus City sau 5 năm làm ăn xa','Back in Nexus City after five years away'),'#7ec3ff'],
  oscar:()=>['Oscar',L('Em gái của Joseph','Joseph\'s little sister'),L('Ở nhà chăm Father suốt 5 năm','Stayed home with Father for five years'),'#ff9fb8'],
  jonathan:()=>['Jonathan',L('Bố của Joseph và Oscar','Father of Joseph and Oscar'),L('Joseph gọi ông là “Father” · chủ garage','Joseph calls him “Father” · owns the garage'),'#ffd166'],
  philip:()=>['Philip',L('Bạn thân 30 năm của Jonathan','Jonathan\'s friend of 30 years'),L('Joseph gọi là “Uncle Philip” · bán súng','Joseph calls him “Uncle Philip” · sells guns'),'#c1f354'],
  henry:()=>['Shark Henry',L('Đàn em Syndicate · trùm số 2','Syndicate henchman · boss no. 2'),L('Giữ Cảng Bắc · mọi chuyến hàng đều phải nộp phần','Runs North Harbor · every shipment pays his cut'),'#2f8dff'],
  rio:()=>['Cloud Rio',L('Đàn em Syndicate · trùm số 3','Syndicate henchman · boss no. 3'),L('Giữ Đồi Mây · không ai thấy hắn tới','Runs Cloud Hills · nobody sees him coming'),'#b9c2cc'],
  michael:()=>['Silver Michael',L('Đàn em Syndicate · trùm số 4','Syndicate henchman · boss no. 4'),L('Giữ Thị trấn Mỏ Bạc · nuôi cả đội đầu gấu','Runs Silver Mine Town · keeps a crew of thugs'),'#c58a4a'],
  han:()=>['Desert Han',L('Đàn em Syndicate · trùm số 5','Syndicate henchman · boss no. 5'),L('Giữ Nexus Tây · cắn một lần là đủ','Runs Nexus West · one bite is enough'),'#2fd47a'],
  vuong:()=>[L('Ông Trùm Vương','Boss Vương'),L('Thủ lĩnh Syndicate','Leader of the Syndicate'),L('Nắm cả năm khu phố · năm tên trùm đều nghe lệnh hắn','Owns all five districts · the five bosses answer to him'),'#d4a017'],
  mike:()=>['Lantern Mike',L('Đàn em Syndicate · trùm số 1','Syndicate henchman · boss no. 1'),L('Giữ Phố Cổ Đèn Lồng cho Ông Trùm Vương','Runs the Lantern Old Quarter for Boss Vương'),'#ff5a4a']};
function movWho(ak,id){const el=MOV.el,w=WHO[id]();const st=el.querySelector('.mv-stage'),old=st.querySelector('.mv-who');if(old)old.remove();
  st.insertAdjacentHTML('beforeend',`<div class="mv-who" style="--c:${w[3]}"><i></i><div><small>${cnE(w[1])}</small><b>${cnE(w[0])}</b><span>${cnE(w[2])}</span></div></div>`);
  const f=el.querySelector('.mv-flash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go');
  MOV.frz=3;MOV.ring=MOV.cast[ak]||null;const rg=el.querySelector('.mv-ring');rg.style.setProperty('--c',w[3]);rg.classList.toggle('on',!!MOV.ring);
  view.style.filter='saturate(.15) contrast(1.25) brightness(1.05)';cinSfx('slow');const s=MOV.s;
  setTimeout(()=>{if(MOV.s!==s)return;const c=st.querySelector('.mv-who');if(c)c.classList.add('out');rg.classList.remove('on');MOV.ring=null;setTimeout(()=>{if(c)c.remove();},500);},8500);}
function movRing(){const a=MOV.ring,rg=MOV.el.querySelector('.mv-ring');if(!a||!a.H.root.parent){return;}a.H.head.getWorldPosition(_ma);_ma.y+=.15;_ma.project(camera);
  const r=view.getBoundingClientRect(),rr=root.getBoundingClientRect();rg.style.opacity=_ma.z<1?'':'0';rg.style.transform=`translate(${(_ma.x*.5+.5)*r.width+r.left-rr.left}px,${(-_ma.y*.5+.5)*r.height+r.top-rr.top}px)`;}
function movTick(dt){const s=MOV.s;if(!s)return;const el=MOV.el;
  if(paused){return;}
  movRing();if(MOV.frz>0){MOV.frz-=dt;if(MOV.frz<=0)view.style.filter=s.flash?'sepia(.85) saturate(1.3) contrast(1.15) brightness(.92)':(s.grade||'');return;}
  MOV.t+=dt;keys.clear();
  try{step(dt);}catch(e){console.warn(e);}
  P.H.root.visible=false;if(gps.mesh)gps.mesh.visible=false;if(s.px!=null){P.x=s.px;P.z=s.pz;}
  if(s.tod!=null){tod.hour=s.tod;todApply();}
  for(const k in MOV.cast)actTick(MOV.cast[k],dt);fireTick(dt);musicTick();
  if(s.who)for(const w of s.who)if(!w.done&&MOV.t>=w[0]){w.done=true;movWho(w[1],w[2]);}
  if(s.acts)for(const a of s.acts)if(!a.done&&MOV.t>=a[0]){a.done=true;try{a[1]();}catch(e){console.warn(e);}}
  if(s.tick)s.tick(dt,MOV.t);
  movCam(dt);
  // dialogue
  const lines=s.lines||[];
  if(MOV.li<lines.length&&!MOV.speaking&&MOV.t>=MOV.lt){const ln=lines[MOV.li],txt=L(ln[1],ln[2]),who=ln[0];MOV.speaking=true;subOn(who,txt);
    for(const k in MOV.cast){const a=MOV.cast[k];if(ln[4]?k===ln[4]:a.who===who)a.talk=99;}const myLi=MOV.li;
    say(who,txt,()=>{if(MOV.s!==s||MOV.li!==myLi)return;MOV.speaking=false;MOV.li++;for(const k in MOV.cast)MOV.cast[k].talk=0;subOff();const nx=lines[MOV.li];MOV.lt=MOV.t+(nx&&nx[3]!=null?nx[3]:.35);});}
  if(MOV.li>=lines.length&&!MOV.speaking&&MOV.doneT<0)MOV.doneT=MOV.t;
  // skip
  if(MOV.skipHeld){MOV.skip+=dt;if(MOV.skip>1){MOV.skip=0;MOV.skipHeld=false;voStop();movEnd();return;}}else MOV.skip=Math.max(0,MOV.skip-dt*2);
  el.querySelector('.mv-skip i').style.setProperty('--p',Math.round(MOV.skip*100)+'%');
  // end of shot
  if(MOV.end>0){MOV.end-=dt;if(MOV.end<=0)movNext();return;}
  if(MOV.doneT>=0&&MOV.t>=Math.max(s.dur||0,MOV.doneT+(s.tail!=null?s.tail:1))){if(s.cut){movNext();}else{el.querySelector('.mv-black').classList.remove('off');const cd=el.querySelector('.mv-card');if(cd)cd.classList.add('out');MOV.end=.75;}}}
function movEnd(){voStop();PP.dof=0;if(gps.mesh)gps.mesh.visible=true;movClear();movMusic(null);const el=MOV.el;MOV.on=false;MOV.s=null;el.style.display='none';root.classList.remove('mov-on');view.style.filter='';subOff();
  const K=MOV.keep;if(K){tod.hour=K.hour;todApply();camera.fov=K.fov;camera.updateProjectionMatrix();P.inside=K.inside;P.x=K.x;P.z=K.z;P.h=K.h;cam.yaw=K.h;P.H.root.visible=true;}
  cinDuck(false);keys.clear();const cb=MOV.cb;MOV.cb=null;if(cb)setTimeout(cb,60);}
function movKey(k){if(!MOV.on)return false;if(k===' ')MOV.skipHeld=true;return true;}
/* ---- phone calls while you play ---- */
const PH={q:[],cur:null,el:null};
function phoneCall(who,lines){if(!STORY)return;PH.q.push({who,lines});if(!PH.cur)phNext();}
function phNext(){const c=PH.q.shift();if(!c){PH.cur=null;if(PH.el)PH.el.classList.remove('on');return;}PH.cur=c;
  if(!PH.el){PH.el=document.createElement('div');PH.el.className='mv-phone';root.appendChild(PH.el);}const ca=CAST[c.who];
  PH.el.innerHTML=`<header><div class="mv-av" style="background:${ca.col}">${cnE(L(ca.n[0],ca.n[1]).trim()[0])}</div><div><b>${cnE(L(ca.n[0],ca.n[1]))}</b><small>${L('Cuộc gọi đến…','Incoming call…')}</small></div><div class="mv-wave" hidden><i></i><i></i><i></i><i></i></div></header><p></p>`;
  PH.el.classList.add('on','ring');let i=0;const p=PH.el.querySelector('p'),sm=PH.el.querySelector('small'),wv=PH.el.querySelector('.mv-wave');
  cinSfx('ring');setTimeout(()=>cinSfx('ring'),900);
  const next=()=>{if(i>=c.lines.length){sm.textContent=L('Đã kết thúc','Call ended');wv.hidden=true;setTimeout(()=>{PH.el.classList.remove('on');setTimeout(phNext,600);},1600);return;}
    const ln=c.lines[i++],who=ln[0],txt=L(ln[1],ln[2]),cc=CAST[who];p.innerHTML=`<b style="color:${cc.col}">${cnE(L(cc.n[0],cc.n[1]))}:</b>${cnE(txt)}`;say(who,txt,()=>setTimeout(next,300));};
  setTimeout(()=>{PH.el.classList.remove('ring');sm.textContent=L('Đang nghe máy','On the line');wv.hidden=false;sfx('door');next();},2100);}
/* ---- the script ---- */
function filmAnchors(){const G=SP.shops.find(s=>s.id==='garage')||{x:SP.house.door.x,z:SP.house.door.z},HD=SP.hospitalDoor,R=ROOMS.hospital,B=SP.bank.door;return{G,HD,R,B,bed:R.x0+2.6+3*2.6};}
function filmOpening(){const{G,HD,R,B,bed}=filmAnchors();const gx=G.x,gz=G.z-1.25;return[
  {black:true,dur:3.6,tod:18.2,px:gx,pz:gz,music:'sad',cam:[{p:[0,300,0],l:[0,0,1]}],card:{kick:L('Nexus City','Nexus City'),title:L('Năm năm sau','Five years later'),c:'#ffd166',c2:'#ffffff',at:.3},tail:0},
  {dur:9,tod:18.3,px:B.x,pz:B.z,camT:11,cam:[{p:[B.x-170,120,B.z+190],l:[B.x,10,B.z]},{p:[B.x-80,70,B.z+120],l:[B.x+10,20,B.z-20]}],linear:true,
    lines:[['minh','Năm năm. Con đi làm xa, gửi từng đồng về để ba mở rộng cái tiệm sửa xe.','Five years. I worked far away and sent every cent home so Father could grow his repair shop.',.9],['minh','Hôm nay con về. Con muốn làm ba bất ngờ.','Today I am back. I wanted to surprise him.']]},
  {dur:7,tod:18.5,px:gx,pz:gz,loc:[L('Garage của ông Jonathan','Jonathan\'s Garage'),L('Khu phố phía tây','West side')],
    setup(){const m=actor('m','minh',gx-14,gz+2.2,Math.PI/2);walk(m,[[gx-2.2,gz+2.2]],1.45);fireOn([[gx-3,0,gz-.2],[gx+2,0,gz-.2]],false);},
    cam:[{p:[-6,1.4,4.2],l:[0,1.5,0]},{p:[-3,1.5,3.6],l:[1,1.4,0]}],follow:'m',hand:true,who:[[1.4,'m','joseph']],
    lines:[['minh','…Gì thế này?','…What is this?',4.6]]},
  {dur:3,tod:18.5,px:gx,pz:gz,cut:true,setup(){const m=actor('m','minh',gx-2.2,gz+2.2,Math.PI*.9);m.face=Math.PI;fireOn([[gx-3,0,gz-.2],[gx+2,0,gz-.2],[gx,0,gz-.3]],false);},
    cam:[{p:[gx-1.5,1.6,gz+6.5],l:[gx,3.5,gz-3]},{p:[gx-1.6,1.4,gz+5.5],l:[gx,4.5,gz-4]}],tail:.2},
  {dur:5,tod:18.5,px:gx,pz:gz,setup(){const m=actor('m','minh',gx-2.2,gz+2.2,Math.PI);m.face=Math.PI/2;const l=actor('l','linh',gx+11,gz+2.6,-Math.PI/2);walk(l,[[gx-.9,gz+2.3]],4.2);},
    who:[[2.9,'l','oscar']],acts:[[3.4,()=>{MOV.cast.l.face=-Math.PI/2;MOV.cast.l.pose='hug';MOV.cast.m.pose='hug';}]],
    cam:[{p:[gx-5,1.7,gz+6],l:[gx+2,1.4,gz+2]},{p:[gx-4.4,1.6,gz+5],l:[gx-1.4,1.4,gz+2.2]}],
    lines:[['linh','Anh Joseph!','Joseph!',3.1],['minh','Oscar? Tiệm của ba sao thế này? Ba đâu?','Oscar? What happened to Father\'s shop? Where is he?'],['linh','Đêm qua… người của Syndicate tới. Ba không chịu nộp tiền bảo kê…','Last night… the Syndicate came. Father refused to pay them…']]},
  /* flashback */
  {dur:4,tod:23.2,px:gx,pz:gz,flash:true,music:'tense',loc:[L('Đêm hôm trước','The night before'),L('Hồi tưởng','Flashback')],
    who:[[1,'b','jonathan']],setup(){const b=actor('b','ba',gx,gz+.9,0,{pose:'wrench'});},cam:[{p:[gx+3,1.3,gz+5],l:[gx,1.4,gz+.5]},{p:[gx+1.8,1.5,gz+3.8],l:[gx,1.5,gz+.8]}],
    lines:[['ba','Muộn rồi, tiệm đóng cửa.','It is late. The shop is closed.',1.8]]},
  {dur:6,tod:23.2,px:gx,pz:gz,flash:true,cut:true,
    setup(){actor('b','ba',gx,gz+.9,0,{pose:'wrench'});const L1=actor('lao','lao',gx+1,gz+10,Math.PI);walk(L1,[[gx+.2,gz+3.2]],1.3);const t1=actor('t1','thug',gx+2.6,gz+10.5,Math.PI);walk(t1,[[gx+1.8,gz+3.9]],1.3);const t2=actor('t2','thug',gx-1.4,gz+10.8,Math.PI);walk(t2,[[gx-1.3,gz+3.7]],1.3);},
    who:[[5.4,'lao','mike']],cam:[{p:[gx-.6,1.7,gz-1],l:[gx+.5,1.4,gz+6]},{p:[gx-.4,1.6,gz-.4],l:[gx+.3,1.5,gz+4.5]}],
    lines:[['lao','Ông Jonathan. Tháng này ông lại quên nộp tiền cho Ông Trùm.','Jonathan. You forgot to pay the Boss again this month.',5.6],['ba','Tiệm này tôi gầy dựng bằng hai bàn tay. Không đưa đồng nào cho tụi bây hết.','I built this shop with my own two hands. You get nothing from me.']]},
  {dur:7,tod:23.2,px:gx,pz:gz,flash:true,cut:true,
    setup(){actor('b','ba',gx,gz+.9,0,{pose:'wrench'});const L1=actor('lao','lao',gx+.2,gz+3.2,Math.PI);actor('t1','thug',gx+1.8,gz+3.9,Math.PI);actor('t2','thug',gx-1.3,gz+3.7,Math.PI);},
    acts:[[3.6,()=>{const t=MOV.cast.t1;t.path=[{x:gx+.5,z:gz+1.9}];t.v=3;}],[4.3,()=>{const t=MOV.cast.t1;t.H.side=1;t.H.punchT=.32;cinSfx('stamp');}],[4.45,()=>{const b=MOV.cast.b;b.H.hitT=.4;b.H.hitSide=1;b.pose=null;}],[4.9,()=>{MOV.cast.b.H.ko=1;}],
      [5.6,()=>{fireOn([[gx-3,0,gz-.2],[gx+2,0,gz-.2],[gx,0,gz-.1]],true);cinSfx('in');movMusic('fire');}]],
    cam:[{p:[gx+4.5,1.5,gz+4],l:[gx,1.3,gz+1.6]},{p:[gx+5.5,2.2,gz+6],l:[gx,1.5,gz+.5]}],
    lines:[['lao','Vậy thì để lửa nói chuyện với ông.','Then let the fire talk to you.',.8]],tail:1.6},
  {dur:5,tod:23.2,px:gx,pz:gz,flash:true,cut:true,setup(){const b=actor('b','ba',gx-.3,gz+1.9,0);b.H.ko=1;b.H.koK=1;fireOn([[gx-3,0,gz-.2],[gx+2,0,gz-.2],[gx,0,gz-.1]],true);const L1=actor('lao','lao',gx+.2,gz+3.2,0);walk(L1,[[gx+1,gz+11]],1.2);},
    cam:[{p:[gx-6,4,gz+9],l:[gx,2,gz]},{p:[gx-9,7,gz+14],l:[gx,3,gz]}],tail:.8},
  /* hospital */
  {dur:6,tod:20.5,inside:'hospital',px:bed+1,pz:R.z0+4,music:'sad',loc:[L('Bệnh viện Nexus','Nexus Hospital'),L('Phòng hồi sức','Recovery ward')],
    setup(){const b=actor('b','ba',bed,R.z0+2.15,0,{inside:true,y:.66});b.H.ko=1;b.H.koK=1;const m=actor('m','minh',bed+.95,R.z0+1.5,-Math.PI/2,{inside:true,pose:'reach'});const l=actor('l','linh',bed-.2,R.z0+3.3,Math.PI,{inside:true,pose:'cry'});},
    cam:[{p:[bed+3.4,1.9,R.z0+5],l:[bed,.9,R.z0+1.2]},{p:[bed+2.4,1.6,R.z0+3.6],l:[bed+.2,1,R.z0+1.4]}],
    lines:[['linh','Bác sĩ nói ba bị chấn thương đầu. Chưa biết khi nào mới tỉnh…','The doctor says Father has a head injury. They do not know when he will wake up…',1],['minh','Ba ơi… con về rồi đây.','Father… I am home.']]},
  {dur:6,tod:20.5,inside:'hospital',px:bed+1,pz:R.z0+4,cut:true,
    setup(){const b=actor('b','ba',bed,R.z0+2.15,0,{inside:true,y:.66});b.H.ko=1;b.H.koK=1;const m=actor('m','minh',bed+.95,R.z0+1.5,-Math.PI/2,{inside:true});const l=actor('l','linh',bed-.2,R.z0+3.3,Math.PI,{inside:true});
      m.face=Math.PI*.75;},
    cam:[{p:[bed+.2,1.55,R.z0+3.2],l:[bed+.95,1.55,R.z0+1.5]},{p:[bed+.35,1.6,R.z0+2.9],l:[bed+.95,1.6,R.z0+1.5]}],
    lines:[['minh','Ai làm chuyện này?','Who did this?',.6],['linh','Lantern Mike ở Phố Cổ. Nhưng hắn chỉ là chó săn. Cả năm khu phố đều nộp tiền cho Ông Trùm Vương.','Lantern Mike from the Old Quarter. But he is just a dog on a leash. All five districts pay Boss Vương.'],
      ['minh','Vậy anh sẽ lấy lại từng khu một. Bắt đầu từ Lantern Mike.','Then I will take them back one by one. Starting with Lantern Mike.']]},
  /* the Syndicate on the tower roof */
  {dur:3,tod:19.4,inside:'tower',px:TW.cx,pz:TW.cz+4,music:'tense',loc:[L('Cùng lúc đó · Tháp Syndicate','Meanwhile · Syndicate Tower'),L('Sân thượng','The roof')],
    setup(){filmGang(false);},cam:[{p:[TW.cx+14,9,TW.cz+12],l:[TW.cx,1.5,TW.cz-8]},{p:[TW.cx+9,6,TW.cz+6],l:[TW.cx,1.5,TW.cz-8]}],tail:.3},
  ...['mike','henry','rio','michael','han'].map((id,i)=>{const hx=TW.cx-8+i*4;return{dur:6,tod:19.4,inside:'tower',px:TW.cx,pz:TW.cz+4,cut:i>0,setup(){filmGang(false);},who:[[.5,'h'+i,id]],
    cam:[{p:[hx-.2,1.9,TW.cz-8.4],l:[hx+1.3,1.75,TW.cz-4]},{p:[hx-.1,1.85,TW.cz-7.2],l:[hx+1.1,1.8,TW.cz-4]}],tail:.4};}),
  {dur:6,tod:19.4,inside:'tower',px:TW.cx,pz:TW.cz+4,cut:true,setup(){filmGang(false);},who:[[.7,'v','vuong']],
    cam:[{p:[TW.cx+2.6,2.2,TW.cz-2.4],l:[TW.cx,2.1,TW.cz-12]},{p:[TW.cx+1.6,2.1,TW.cz-6.8],l:[TW.cx,2.2,TW.cz-12]}],
    lines:[['vuong','Đêm qua tiệm của lão Jonathan đã thành tro. Kẻ nào không nộp tiền, kết cục cũng như thế.','Last night Jonathan\'s shop burned to ash. Anyone who does not pay ends up the same way.',3.4],
      ['vuong','Nghe nói thằng con trai của lão vừa về thành phố.','I hear his son just came back to town.'],
      ['lao','Để tôi lo nó, thưa Ông Trùm.','Leave him to me, Boss.',.4,'h0'],
      ['vuong','Không. Năm đứa bây giữ chặt khu của mình. Nó bước vào khu nào, khu đó xử nó.','No. All five of you hold your districts. Whatever district he walks into, that district finishes him.',.4]]},
  {dur:5,tod:19.4,inside:'tower',px:TW.cx,pz:TW.cz+4,cut:true,setup(){filmGang(true);},
    cam:[{p:[TW.cx+1.5,3.6,TW.cz-16.5],l:[TW.cx,1.4,TW.cz-3]},{p:[TW.cx+.8,4.6,TW.cz-18.5],l:[TW.cx,1.3,TW.cz-3]}],
    lines:[['gang','Vâng, thưa Ông Trùm!','Yes, Boss!',.8],['vuong','Đi đi.','Go.',.5]],tail:1.2},
  /* uncle Tư */
  {dur:6,tod:21,px:HD.x,pz:HD.z+4,music:'tense',
    setup(){const c=newCar('muscle',HD.x+5,HD.z+5.5,Math.PI/2,'movie','#2b2b2b');MOV.cars.push(c);const t=actor('t','tu',HD.x+4.6,HD.z+3.7,-Math.PI*.8,{pose:'cross'});const m=actor('m','minh',HD.x,HD.z+.4,0);walk(m,[[HD.x+2.6,HD.z+2.6]],1.4);},
    who:[[1.2,'t','philip']],acts:[[2.4,()=>{MOV.cast.m.face=Math.atan2(2,1.1);}]],
    cam:[{p:[HD.x-2,1.6,HD.z+8],l:[HD.x+3.5,1.4,HD.z+3]},{p:[HD.x+.5,1.6,HD.z+7.2],l:[HD.x+3.6,1.5,HD.z+3.2]}],
    lines:[['tu','Thằng Joseph đó hả? Lớn quá rồi.','Is that you, Joseph? Look how you have grown.',2.6],['minh','Chú Philip.','Uncle Philip.'],
      ['tu','Ba con với chú là anh em ba chục năm. Muốn đụng Syndicate thì tay không không được đâu con.','Your dad and I have been brothers for thirty years. You cannot take on the Syndicate empty-handed.'],
      ['tu','Ghé tiệm Súng Tầm Xa. Chú lấy giá anh em cho con.','Come by Long Range Guns. I will give you the family price.'],['minh','Cảm ơn chú.','Thank you, Uncle.']]},
  {dur:7,tod:21,px:gx,pz:gz,music:'title',camT:8,cam:[{p:[gx+6,3,gz+10],l:[gx,3,gz]},{p:[gx+30,40,gz+70],l:[gx,10,gz]}],linear:true,
    card:{kick:L('Nexus City · Story mode','Nexus City · Story mode'),title:L('Món nợ của Cha','A Debt to My Father'),sub:L('Lấy lại năm khu phố. Đưa Ông Trùm Vương ra trả giá.','Take back five districts. Make Boss Vương pay.'),c:'#ffd166',c2:'#ff5fa2',at:.4,snd:'boss'},tail:0}];}
function filmLight(x,y,z,col,int,dist){const l=new T.PointLight(col,int,dist||30,1.4);l.position.set(x,y,z);scene.add(l);(MOV.lights||(MOV.lights=[])).push(l);return l;}
function filmGang(salute){filmLight(TW.cx,5,TW.cz-8,'#ffd9a8',2.2,34);filmLight(TW.cx-6,3,TW.cz-2,'#9fc3ff',1.2,22);filmLight(TW.cx+6,3,TW.cz-2,'#ff9a6a',1.2,22);const v=actor('v','vuong',TW.cx,TW.cz-12,0,{inside:true,scale:1.18});v.pose='cross';
  for(let i=0;i<5;i++){const a=actor('h'+i,'gang',TW.cx-8+i*4,TW.cz-4,Math.PI,{inside:true,scale:1.08,look:ST_BODY[i]});if(salute)a.pose='salute';}}
function filmEnding(){const{G,HD,R,B,bed}=filmAnchors();const gx=G.x,gz=G.z-1.25,bx=road(N-1)+1.8;return[
  {black:true,dur:3,tod:9,px:gx,pz:gz,music:'hope',cam:[{p:[0,300,0],l:[0,0,1]}],card:{kick:'',title:L('Sáng hôm sau','The next morning'),c:'#ffd166',c2:'#ffffff',at:.3},tail:0},
  {dur:7,tod:9,inside:'hospital',px:bed+1,pz:R.z0+4,loc:[L('Bệnh viện Nexus','Nexus Hospital'),''],
    setup(){const b=actor('b','ba',bed,R.z0+1.75,0,{inside:true,y:.86,pose:'recline'});const l=actor('l','linh',bed-.9,R.z0+1.6,Math.PI/2,{inside:true});const m=actor('m','minh',R.x0+11,R.z1-2,Math.PI,{inside:true});walk(m,[[bed+1,R.z0+2.6]],1.3);},
    acts:[[4.5,()=>{MOV.cast.m.face=-Math.PI*.8;}]],
    cam:[{p:[bed+3,1.7,R.z0+5.5],l:[bed+.5,1.1,R.z0+1.6]},{p:[bed+2.2,1.5,R.z0+4.4],l:[bed+.3,1.1,R.z0+1.6]}],
    lines:[['ba','Joseph… con về rồi.','Joseph… you came home.',4.8],['minh','Con về rồi, ba.','I am home, Father.']]},
  {dur:6,tod:9,inside:'hospital',px:bed+1,pz:R.z0+4,cut:true,
    setup(){actor('b','ba',bed,R.z0+1.75,0,{inside:true,y:.86,pose:'recline'});actor('l','linh',bed-.9,R.z0+1.6,Math.PI/2,{inside:true,pose:'hug'});const m=actor('m','minh',bed+1,R.z0+2.6,-Math.PI*.8,{inside:true});},
    cam:[{p:[bed+.6,1.35,R.z0+3.4],l:[bed,1.2,R.z0+1.2]},{p:[bed+.5,1.3,R.z0+3.1],l:[bed,1.2,R.z0+1.2]}],
    lines:[['ba','Ông Trùm nói đúng. Hồi trẻ ba từng chạy việc cho hắn. Ba bỏ đi để mở tiệm, để hai đứa được sống đàng hoàng.','The Boss told you the truth. When I was young I ran jobs for him. I walked away to open the shop, so you two could live clean.',.6],
      ['ba','Đó là món nợ ba chưa bao giờ trả xong.','That was the debt I never finished paying.'],['minh','Món nợ đó, con trả rồi.','That debt is paid now, Father.']]},
  {dur:9,tod:18.3,px:bx,pz:-20,music:'hope',loc:[L('Ba tháng sau','Three months later'),L('Đường ven biển','Coast road')],
    setup(){const c=newCar('legend',bx,-60,0,'movie','#e8b730');MOV.cars.push(c);MOV.drive=c;},
    tick(dt,t){const c=MOV.drive;if(!c)return;c.z=-60+t*14;P.x=c.x;P.z=c.z;c.x=bx;c.h=0;syncCar(c);if(c.wheels)for(const w of c.wheels)w.rotation.x+=dt*14/.37;},
    cam:[{p:[bx+7,1.2,-62],l:[bx,1,-52]},{p:[bx+9,3,-48],l:[bx,1,-58+9*14]}],
    lines:[['linh','Ba tháng sau, Garage ông Jonathan mở cửa lại. Lần này không ai dám tới thu tiền nữa.','Three months later, Jonathan\'s Garage opened again. This time, nobody came to collect.',1.6],
      ['ba','Chạy chậm thôi con. Xe này chỉ có một chiếc trên đời.','Easy, son. There is only one of these in the world.'],['minh','Con biết mà, ba.','I know, Father.']]},
  {dur:12,tod:18.6,px:bx,pz:40,cam:[{p:[bx+30,25,40],l:[bx,0,60]},{p:[bx+60,60,10],l:[bx,0,90]}],linear:true,
    setup(){const c=newCar('legend',bx,40,0,'movie','#e8b730');MOV.cars.push(c);MOV.drive=c;MOV.el.querySelector('.mv-stage').insertAdjacentHTML('beforeend',`<div class="mv-roll"><h3>${L('Món nợ của Cha','A Debt to My Father')}</h3>${L('Một câu chuyện ở Nexus City','A Nexus City story')}<em>${L('Nhân vật','Cast')}</em>Joseph · Oscar · ${L('Ông Jonathan','Jonathan')} · ${L('Chú Philip','Uncle Philip')}<em>${L('Phản diện','Villains')}</em>${ST_TOWNS.map(t=>t[1]).join(' · ')} · ${L('Ông Trùm Vương','Boss Vương')}<em>${L('Làm bởi','Made by')}</em>The Nexus · TheArena<em>${L('Cảm ơn bạn đã chơi','Thank you for playing')}</em></div>`);},
    tick(dt,t){const c=MOV.drive;if(c){c.z=40+t*14;syncCar(c);P.x=c.x;P.z=c.z;}const r=MOV.el.querySelector('.mv-roll');if(r)r.style.transform=`translateX(-50%) translateY(${-t*95}px)`;},tail:0}];}
/* story beats in play: phone calls between chapters */
function stCall(k){if(k===1)phoneCall('linh',[['linh','Anh ơi! Bác sĩ nói tim ba đập đều hơn rồi.','Joseph! The doctor says Father\'s heartbeat is steadier.'],['minh','Tốt. Còn bốn thằng nữa.','Good. Four more to go.'],['linh','Anh cẩn thận. Shark Henry ở Cảng Bắc ác hơn nhiều.','Be careful. Shark Henry up at North Harbor is much worse.']]);
  else if(k===2)phoneCall('tu',[['tu','Con làm Syndicate loạn hết rồi đó Joseph.','You have the whole Syndicate rattled, Joseph.'],['tu','Cloud Rio ở Đồi Mây đang săn con. Đừng để hắn áp sát.','Cloud Rio up in Cloud Hills is hunting you. Do not let him get close.'],['minh','Sao chú biết rõ vậy?','How do you know all this?'],['tu','…Chú quen nhiều người. Thôi, đi đi.','…I know people. Go on.']]);
  else if(k===3)phoneCall('linh',[['linh','Anh… ba mấp máy môi. Hình như ba gọi tên anh.','Joseph… Father\'s lips moved. I think he said your name.'],['minh','Nói với ba là anh sắp về.','Tell him I am coming home soon.']]);
  else if(k===4){phoneCall('linh',[['linh','Anh! Em thấy Chú Philip ngồi với người của Ông Trùm ở bến cảng. Chú đưa họ một phong bì.','Joseph! I saw Uncle Philip at the docks with the Boss\'s men. He handed them an envelope.'],['minh','…Chú Philip?','…Uncle Philip?']]);
    phoneCall('tu',[['tu','Joseph… chú xin lỗi. Năm đó chú nợ Ông Trùm. Chính chú chỉ chỗ tiệm của ba con.','Joseph… I am sorry. I owed the Boss. I was the one who told them where your father\'s shop was.'],['minh','Ba coi chú như anh ruột.','Father treated you like a brother.'],
      ['tu','Desert Han biết con tới. Đi đường phía nam. Đó là điều cuối cùng chú làm được cho con.','Desert Han knows you are coming. Take the south road. That is the last thing I can do for you.']]);}
  else if(k===5)phoneCall('linh',[['linh','Anh ơi… ba tỉnh rồi! Ba muốn nói chuyện với anh.','Joseph… Father is awake! He wants to talk to you.'],['ba','Joseph… đừng để thù hận nuốt mất con. Về với ba.','Joseph… do not let hatred swallow you. Come home.'],['minh','Con sẽ về, ba. Sau khi chuyện này kết thúc.','I will, Father. As soon as this is over.']]);}

/* ======== MULTIPLAYER: one shared city for everyone on the site (Firebase Realtime Database).
   Each player writes a small state record ~5 times a second to /mp/players/{uid}; everyone else's are drawn as
   ghosts (walking people or their car) with a name tag. NPCs, traffic and police stay local to each player. ======== */
const MP={on:opt.mode==='multi'&&!!(opt.mp&&opt.mp.db),db:opt.mp&&opt.mp.db,uid:opt.mp&&opt.mp.uid,name:(opt.mp&&opt.mp.name)||'Player',others:{},t:0,n:0,el:null,ref:null,list:null,last:''};
function lookFor(k,o,cap){const b=Object.assign({},CHARS[k]||CHARS.minh),of=OUTFITS[o]||{};for(const q of['shirt','pants','shoes','sleeve','longSleeve','skirt'])if(of[q]!==undefined)b[q]=of[q];if(of.shirt!==undefined){b.jacket=null;if(of.longSleeve===undefined)b.longSleeve=false;}b.cap=cap?'#1d1d1d':null;return b;}
function mpTag(name){const cv=document.createElement('canvas');cv.width=512;cv.height=112;const g=cv.getContext('2d');g.font='800 54px Inter,system-ui,sans-serif';const w=Math.min(500,g.measureText(name).width+56);
  g.fillStyle='rgba(10,12,20,.72)';const x=(512-w)/2;g.beginPath();g.moveTo(x+28,14);g.arcTo(x+w,14,x+w,98,28);g.arcTo(x+w,98,x,98,28);g.arcTo(x,98,x,14,28);g.arcTo(x,14,x+w,14,28);g.fill();
  g.fillStyle='#c1f354';g.textAlign='center';g.textBaseline='middle';g.fillText(name,256,58);const tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;
  const s=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:false,transparent:true}));s.scale.set(2.6,.57,1);s.renderOrder=5;scene.add(s);return s;}
function mpDrop(id){const o=MP.others[id];if(!o)return;scene.remove(o.H.root);if(o.tag){scene.remove(o.tag);o.tag.material.map.dispose();o.tag.material.dispose();}if(o.car){o.car.g.visible=false;(carPool[o.ct]=carPool[o.ct]||[]).push(o.car);}delete MP.others[id];}
function mpSet(id,d){if(!d||id===MP.uid)return;let o=MP.others[id];
  if(!o){o=MP.others[id]={d,x:d.x,z:d.z,y:d.y||0,h:d.h||0,spd:0,H:makeHuman(lookFor(d.k,d.o,d.cap)),tag:mpTag(String(d.n||'Player').slice(0,18)),car:null,ct:'',name:d.n};resetHuman(o.H);}
  else{if(d.n!==o.name){scene.remove(o.tag);o.tag=mpTag(String(d.n||'Player').slice(0,18));o.name=d.n;}if(d.k!==o.d.k||d.o!==o.d.o||d.cap!==o.d.cap){scene.remove(o.H.root);o.H=makeHuman(lookFor(d.k,d.o,d.cap));resetHuman(o.H);}o.d=d;}
  if(d.p&&o.H)o.H.punchT=.32;}
function mpStart(){if(!MP.on)return;try{MP.ref=MP.db.ref('mp/players/'+MP.uid);MP.ref.onDisconnect().remove();MP.list=MP.db.ref('mp/players');
    MP.list.on('child_added',s=>mpSet(s.key,s.val()));MP.list.on('child_changed',s=>mpSet(s.key,s.val()));MP.list.on('child_removed',s=>mpDrop(s.key));}catch(e){console.warn('mp',e);MP.on=false;return;}
  MP.el=document.createElement('div');MP.el.className='nc-mp';MP.el.style.cssText='position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:30;background:rgba(10,12,20,.72);color:#c1f354;font:800 13px Inter,system-ui,sans-serif;padding:6px 14px;border-radius:999px;border:1px solid rgba(193,243,84,.4);pointer-events:none';
  root.appendChild(MP.el);window.addEventListener('beforeunload',mpStop);}
function mpStop(){if(!MP.ref)return;try{MP.ref.remove();}catch(_){}}
let mpPunch=0;
function mpTick(dt){if(!MP.on||!MP.ref)return;MP.t-=dt;const now=Date.now();
  if(MP.t<=0){MP.t=.2;const c=P.car,src=c||P;const d={n:MP.name,k:save.char||'joseph',o:save.outfit||'base',cap:save.cap?1:0,x:Math.round(src.x*100)/100,z:Math.round(src.z*100)/100,y:Math.round((c?0:P.y)*100)/100,h:Math.round((c?c.h:P.h)*100)/100,
      s:Math.round((c?Math.abs(c.vf||0):Math.min(9,hyp(P.x-(MP.lx??P.x),P.z-(MP.lz??P.z))/.2))*10)/10,c:c?c.type:0,cc:c?(c.color||'#888888'):0,i:P.inside||0,p:mpPunch>0?1:0,t:firebase.database.ServerValue.TIMESTAMP};
    MP.lx=P.x;MP.lz=P.z;mpPunch=0;const sig=JSON.stringify([d.x,d.z,d.h,d.c,d.i,d.p,d.s,d.k,d.o]);if(sig!==MP.last||!MP.keep||now-MP.keep>4000){MP.last=sig;MP.keep=now;MP.ref.set(d).catch(()=>{});}}
  let n=1;for(const id in MP.others){const o=MP.others[id],d=o.d;if(d.t&&now-d.t>45000){mpDrop(id);continue;}n++;
    const k=1-Math.exp(-10*dt);o.x+=(d.x-o.x)*k;o.z+=(d.z-o.z)*k;o.y+=((d.y||0)-o.y)*k;o.h=lerpA(o.h,d.h||0,k);
    const vis=(d.i||null)===(P.inside||null);
    if(d.c){if(!o.car||o.ct!==d.c){if(o.car){o.car.g.visible=false;(carPool[o.ct]=carPool[o.ct]||[]).push(o.car);}o.car=makeCar(d.c,d.cc||'#888888');o.ct=d.c;}
      o.car.g.visible=vis;syncCar({x:o.x,z:o.z,h:o.h,mesh:o.car.g});o.H.root.visible=false;o.tag.position.set(o.x,heightAt(o.x,o.z)+3,o.z);}
    else{if(o.car){o.car.g.visible=false;(carPool[o.ct]=carPool[o.ct]||[]).push(o.car);o.car=null;o.ct='';}
      o.H.root.visible=vis;o.H.root.position.set(o.x,(d.i?0:groundY(o.x,o.z))+o.y,o.z);o.H.root.rotation.y=o.h;o.spd+=((d.s||0)-o.spd)*k;animHuman(o.H,dt,o.spd,time);o.tag.position.set(o.x,o.H.root.position.y+2.35,o.z);}
    o.tag.visible=vis&&hyp(o.x-P.x,o.z-P.z)<160;}
  if(MP.el&&MP.n!==n){MP.n=n;MP.el.textContent='🌐 '+L('Đang online: ','Online: ')+n;}}

// free mode: collect the one-time reward of a finished story
if(!STORY){let lg=null;try{lg=JSON.parse(localStorage.getItem('nexus-city2-legend')||'null');}catch(_){}
  if(lg&&lg.done&&!lg.claimed){lg.claimed=true;try{localStorage.setItem('nexus-city2-legend',JSON.stringify(lg));}catch(_){}
    if(!save.garage.some(o=>o.type==='legend')){save.money+=100000;save.garage.push({type:'legend',color:'#d4a017'});save.legend=true;writeSave();setTimeout(()=>banner(L('Phần thưởng phá đảo!','Story reward!'),L('+$100.000 và Siêu xe Huyền Thoại · lấy xe ở gara nhà bạn','+$100,000 and the Legend supercar · get it from your home garage'),5),2500);}}}

function frame(now){raf=requestAnimationFrame(frame);const raw=(now-last)/1000||0;let dt=Math.max(0,Math.min(.05,raw));last=now;if(hitStop>0){hitStop-=dt;dt*=.12;}if(raw>0&&raw<1)adapt(raw);cinTick(dt);if(MOV.on)movTick(dt);else{if(!paused&&!mapOpen&&!shopOpen&&CIN.ts>.003)step(dt*CIN.ts);camUpdate(dt);}hudUpdate(dt);hdrTick(dt);if(MP.on){mpTick(dt);if(mapOpen){mapT-=dt;if(mapT<=0){mapT=.25;drawBigMap();}}}audioUpdate(dt);if(GRASS&&!P.inside)GRASS.update(P.car?P.car.x:P.x,P.car?P.car.z:P.z);PP.render();}
function resize(){const w=view.clientWidth||innerWidth,h=view.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const pr=renderer.getPixelRatio();PP.setSize(Math.round(w*pr),Math.round(h*pr));}
window.addEventListener('resize',()=>{if(!view.closest('[hidden]'))resize();});
camera.position.set(P.x,4,P.z+7);
if(STORY)setTimeout(stOpening,1100);
else if(tut.on)banner('Chào mừng tới Nexus City','Làm theo hướng dẫn ở góc trên bên trái, hoặc bấm Bỏ qua');
else banner('Nexus City','Bấm M để mở bản đồ và chọn nơi muốn tới. Cột xanh lá giữa trung tâm là ngân hàng.');
mpStart();

/* ---------- photo PBR surfaces (Poly Haven, CC0): asphalt, pavement, grass, sand, gravel and roof tiles get real colour and normal maps
   (plus roughness maps on Ultra). The textures stream in after the city is built and replace the drawn ones in place. ---------- */
const PBR={on:GFX!=='low'&&!MOBILE,set:{asphalt:'asphalt_02',walk:'concrete_pavement',grass:'leafy_grass',sand:'coast_sand_01',gravel:'gravel_floor_02',shingleRed:'clay_roof_tiles_02',shingleGrey:'grey_roof_tiles'},nor:{},rough:{}};
function pbrImg(u){return new Promise((res,rej)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>res(im);im.onerror=rej;im.src=u;});}
async function pbrLoad(){if(!PBR.on)return;const base=n=>'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/'+n+'/'+n+'_';
  for(const k in PBR.set){const n=PBR.set[k],t=TX[k];if(!t)continue;
    try{const[d,nm,r]=await Promise.all([pbrImg(base(n)+'diff_1k.jpg'),pbrImg(base(n)+'nor_gl_1k.jpg'),GFX==='ultra'?pbrImg(base(n)+'rough_1k.jpg'):Promise.resolve(null)]);
      if(k!=='grass'){t.image=d;t.needsUpdate=true;}// grass keeps its own green colour and only takes the photo's bumps
      const mk=im=>{const x=new T.Texture(im);x.wrapS=x.wrapT=T.RepeatWrapping;x.repeat.copy(t.repeat);x.anisotropy=GFX==='ultra'?(MAXANISO||16):t.anisotropy;x.needsUpdate=true;return x;};
      PBR.nor[k]=mk(nm);if(r)PBR.rough[k]=mk(r);pbrApply();}catch(e){console.warn('pbr',k,e);}}
  setTimeout(pbrApply,8000);}
function pbrApply(){const by=new Map();for(const k in PBR.nor)by.set(TX[k],k);scene.traverse(o=>{if(!o.material)return;for(const m of(Array.isArray(o.material)?o.material:[o.material])){const k=m.map&&by.get(m.map);if(!k||m.normalMap||!m.isMeshStandardMaterial)continue;
    m.normalMap=PBR.nor[k];m.normalScale=new T.Vector2(k==='grass'||k==='sand'?.6:1,k==='grass'||k==='sand'?.6:1);if(PBR.rough[k]){m.roughnessMap=PBR.rough[k];m.roughness=Math.min(1,m.roughness+.05);}m.needsUpdate=true;}});}
/* ---------- moving water normals (Good and Ultra): small ripples that catch the sun and reflect the sky ---------- */
let WN=null;
if(GFX!=='low'&&!MOBILE){const S=256,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d'),im=g.createImageData(S,S),hgt=new Float32Array(S*S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){let h=0;for(let k=1;k<=5;k++){const f=k*2*Math.PI/S;h+=Math.sin(x*f*k*.9+k*1.7)*Math.cos(y*f*(6-k)*.7+k)/k+Math.sin((x+y)*f*1.3*k+k*2.3)*.5/k;}hgt[y*S+x]=h;}
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const hx=hgt[y*S+(x+1)%S]-hgt[y*S+(x-1+S)%S],hy=hgt[((y+1)%S)*S+x]-hgt[((y-1+S)%S)*S+x];let nx=-hx*1.2,ny=-hy*1.2,nz=1;const l=Math.hypot(nx,ny,nz);const i=(y*S+x)*4;im.data[i]=(nx/l*.5+.5)*255;im.data[i+1]=(ny/l*.5+.5)*255;im.data[i+2]=(nz/l*.5+.5)*255;im.data[i+3]=255;}
  g.putImageData(im,0,0);WN=new T.CanvasTexture(c);WN.wrapS=WN.wrapT=T.RepeatWrapping;WN.repeat.set(60,60);
  water.material.normalMap=WN;water.material.normalScale=new T.Vector2(.55,.55);water.material.roughness=.06;water.material.metalness=.1;water.material.needsUpdate=true;}
setTimeout(pbrLoad,1500);
const api={
  setGfx(v){PP.on=v!=='low';PP.ao=PP.gr=v==='ultra'&&GFX==='ultra';resize();},
  start(){paused=false;active=true;keys.clear();try{if(sfxAC&&sfxAC.state==='suspended')sfxAC.resume();}catch(_){}last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);resize();},
  setPaused(p){paused=p;active=!p;if(p)freeMouse();else backMouse();keys.clear();cam.rmb=false;tb.block=false;if(p)radioStop();else{last=performance.now();if(P.car&&radio.idx>=0)radioPlay();}},
  stop(){mpStop();MP.keep=0;cancelAnimationFrame(raf);active=false;paused=true;keys.clear();radioStop();try{if(sfxAC&&sfxAC.state==='running')sfxAC.suspend();}catch(_){}writeSave();},
  resume(){active=true;paused=false;keys.clear();cam.rmb=false;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);resize();if(P.car&&radio.idx>=0)radioPlay();},
  resize,
  get save(){return save;},
  _dbg:{ROBS,ELEV,MALL,robKey,AIM,aimOn,aimOff,BB,HP,hpEnter,hpExit,hpKey,hp1v1,bbShoot,bbNearHoop,COURTS,SP,film:{run(n,d){for(let i=0;i<n;i++){if(MOV.on)movTick(d||1/30);}PP.render();return MOV.si+':'+MOV.t.toFixed(1);},go(i){MOV.si=i-1;movNext();PP.render();},MOV,playFilm,filmOpening,filmEnding,phoneCall,stCall,say},cin:{CIN,cine,stOpening,stArmed,stIntro,stFightTip,stKeyStamp,stTowerIntro,stHeliTip,stFail,stWantedTip},story:{get SS(){return SS;},stSpot,stDoorSpot,get gang(){return stGang;},get tower(){return stTower;},get heli(){return stHeli;},stEnterTower,stStartTower,stVictory,stDied,storyUpdate,wasted,get win(){return stWin;}},heightAt,resolve,TOWNS,DIAS,PADS,inBld,AIR,PP,P,cars,newCar,buyVehicle,interactOption,sitDown,standUp,takeFood,GDOORS,SHOPS,save,bookTour,npcs,get stars(){return stars;},set stars(v){stars=v;},startHeist,startMission,interact,toggleCar,playerPunch,get heist(){return heist;},set heistProg(v){if(heist)heist.prog=v;},SP,tut,toggleMap,bag,time:()=>time,scene,renderer,sun,step,info:()=>renderer.info.render,keys,camUpdate,camera,weather,ROOMS,openShop,closeShop,enterInterior,exitInterior,selectWeapon,fireWeapon,get shopOpen(){return shopOpen;},tod,todApply,gps,setWaypoint,clearWaypoint,planRoute,poiList,radio,radioNext,playerHitBy,get lastFoe(){return lastFoe;},cam,tb,render:()=>renderer.render(scene,camera)}
};
return api;
}
window.NexusCity2={create};
})();
