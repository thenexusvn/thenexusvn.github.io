/* Last Zone: single-player battle royale against bots on an original island.
   Original map, characters, weapons and UI. No blood: hits knock players out of the match.
   Needs THREE r128 as a global. Exposes window.LastZone.create(opt). */
(function(){
'use strict';
const T=window.THREE;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],hyp=Math.hypot,lerp=(a,b,k)=>a+(b-a)*k;
const angD=(a,b)=>{let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;};
const lerpA=(a,b,k)=>a+angD(b,a)*k;
const lin=c=>new T.Color(c).convertSRGBToLinear();
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function hash2(x,z,s){let h=(Math.imul(x|0,374761393)+Math.imul(z|0,668265263)+Math.imul(s|0,982451653))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,z,s){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);return lerp(lerp(hash2(xi,zi,s),hash2(xi+1,zi,s),u),lerp(hash2(xi,zi+1,s),hash2(xi+1,zi+1,s),u),v);}
function fbm(x,z,o,s){let v=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){v+=a*vnoise(x*f,z*f,s+i*17);n+=a;a*=.5;f*=2.03;}return v/n;}
let SEED=7;const sr=(a,b)=>{SEED=(SEED*16807)%2147483647;return a+((SEED-1)/2147483646)*(b-a);};
/* geometry helpers */
class GB{constructor(){this.p=[];this.n=[];this.u=[];this.c=[];this.i=[];}
  quad(a,b,c,d,n,uv,col){const o=this.p.length/3;for(const v of[a,b,c,d])this.p.push(v[0],v[1],v[2]);for(let k=0;k<4;k++){this.n.push(n[0],n[1],n[2]);this.c.push(col?col.r:1,col?col.g:1,col?col.b:1);}for(const t of uv)this.u.push(t[0],t[1]);this.i.push(o,o+1,o+2,o,o+2,o+3);}
  box(x0,x1,y0,y1,z0,z1,col,s){s=s||3;const U=(a,b)=>[[a[0]/s,a[1]/s],[b[0]/s,a[1]/s],[b[0]/s,b[1]/s],[a[0]/s,b[1]/s]];
    this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],U([x0,y0],[x1,y1]),col);this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],U([x0,y0],[x1,y1]),col);
    this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],U([z0,y0],[z1,y1]),col);this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],U([z0,y0],[z1,y1]),col);
    this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],U([x0,z0],[x1,z1]),col);}
  geo(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(this.u,2));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.setIndex(this.i);g.computeBoundingSphere();return g;}}
const _v1=new T.Vector3(),_v2=new T.Vector3(),_q=new T.Quaternion(),_m4=new T.Matrix4(),_e=new T.Euler();
function buildVC(parts){let tot=0;const arr=[];for(const p of parts){const g=p.geo.index?p.geo.toNonIndexed():p.geo.clone();_e.set(...(p.rot||[0,0,0]));_q.setFromEuler(_e);_m4.compose(_v1.set(...(p.pos||[0,0,0])),_q,_v2.set(...(p.scale||[1,1,1])));g.applyMatrix4(_m4);arr.push([g,lin(p.color||'#ffffff')]);tot+=g.attributes.position.count;}
  const pos=new Float32Array(tot*3),nor=new Float32Array(tot*3),col=new Float32Array(tot*3),uv=new Float32Array(tot*2);let o=0;
  for(const[g,c]of arr){const n=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);for(let i=0;i<n;i++){col[(o+i)*3]=c.r;col[(o+i)*3+1]=c.g;col[(o+i)*3+2]=c.b;}o+=n;g.dispose();}
  const G=new T.BufferGeometry();G.setAttribute('position',new T.BufferAttribute(pos,3));G.setAttribute('normal',new T.BufferAttribute(nor,3));G.setAttribute('color',new T.BufferAttribute(col,3));G.setAttribute('uv',new T.BufferAttribute(uv,2));G.computeBoundingSphere();return G;}
function makeTex(w,h,draw,o){o=o||{};const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(o.repeat!==false)t.wrapS=t.wrapT=T.RepeatWrapping;if(o.srgb!==false)t.encoding=T.sRGBEncoding;t.anisotropy=o.aniso||8;return t;}
function speckle(g,w,h,base,n,a,sz){g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){const d=Math.random()<.5;g.fillStyle=d?`rgba(0,0,0,${Math.random()*a})`:`rgba(255,255,255,${Math.random()*a})`;const s=(sz||2)*Math.random()+1;g.fillRect(Math.random()*w,Math.random()*h,s,s);}}

/* ======================================================================= */
function create(opt){
const view=opt.view,root=opt.hudRoot,MOBILE=!!opt.mobile;
/* ---------- save ---------- */
const SAVE_KEY='lastzone-save';
const save={diamonds:120,owned:[],equipped:{},stats:{matches:0,wins:0,kills:0,best:0,top10:0},xp:0,mode:'normal',sens:1,quality:MOBILE?'low':'high',name:''};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s){Object.assign(save,s);save.stats=Object.assign({matches:0,wins:0,kills:0,best:0,top10:0},s.stats);}}catch(_){}
if(opt.playerName&&!save.name)save.name=opt.playerName;
function writeSave(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(_){}if(opt.onSave)opt.onSave(save);}
const QP={low:{pr:1,shadow:0,grass:0,far:420,trees:.6,aa:false},mid:{pr:Math.min(devicePixelRatio||1,1.25),shadow:1024,grass:2600,far:620,trees:.85,aa:true},high:{pr:Math.min(devicePixelRatio||1,1.6),shadow:2048,grass:6000,far:820,trees:1,aa:true}};
let Q=QP[save.quality]||QP.high;
/* ---------- renderer ---------- */
const renderer=new T.WebGLRenderer({antialias:!MOBILE,powerPreference:'high-performance'});
renderer.setPixelRatio(Q.pr);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=!!Q.shadow;renderer.shadowMap.type=T.PCFSoftShadowMap;view.appendChild(renderer.domElement);
const scene=new T.Scene();const FOGC=lin('#b9cbd8');scene.fog=new T.Fog(FOGC,120,Q.far);
const camera=new T.PerspectiveCamera(70,1,.1,3000);
const sunDir=new T.Vector3(.55,.62,.35).normalize();
const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{sunDir:{value:sunDir},ct:{value:0}},
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform vec3 sunDir;uniform float ct;varying vec3 vP;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){vec3 d=normalize(vP);float h=d.y;vec3 top=vec3(.18,.38,.72),hor=vec3(.72,.82,.9),low=vec3(.55,.62,.66);
vec3 c=mix(hor,top,pow(smoothstep(0.,.75,h),.7));if(h<0.)c=mix(hor,low,smoothstep(0.,-.2,h));
float s=max(dot(d,normalize(sunDir)),0.);c+=vec3(1.,.86,.62)*pow(s,10.)*.35+vec3(1.,.96,.85)*pow(s,700.)*3.;
if(h>0.){vec2 cp=d.xz/(h+.15)*1.4+vec2(ct*.006,ct*.002);float cl=fbm(cp);float a=smoothstep(.48,.75,cl)*smoothstep(0.,.15,h);vec3 cc=mix(vec3(.72,.76,.82),vec3(1.),clamp((cl-.45)*2.4+.4*s,0.,1.));c=mix(c,cc,a*.9);}
gl_FragColor=vec4(c,1.);}`});
const sky=new T.Mesh(new T.SphereGeometry(2600,32,16),skyMat);sky.renderOrder=-1;scene.add(sky);
let ENV=null;
try{const pm=new T.PMREMGenerator(renderer);const es=new T.Scene();es.add(new T.Mesh(new T.SphereGeometry(100,32,16),skyMat));ENV=pm.fromScene(es,.02).texture;pm.dispose();
  // probe: some GPUs return a black PMREM; drop reflections there
  const rt=new T.WebGLRenderTarget(8,8),ts=new T.Scene();ts.environment=ENV;ts.add(new T.Mesh(new T.SphereGeometry(1,16,12),new T.MeshStandardMaterial({color:0xffffff,metalness:1,roughness:.4})));
  const tc=new T.PerspectiveCamera(40,1,.1,10);tc.position.z=3;renderer.setRenderTarget(rt);renderer.render(ts,tc);const px=new Uint8Array(256);renderer.readRenderTargetPixels(rt,0,0,8,8,px);renderer.setRenderTarget(null);rt.dispose();
  let sum=0;for(let i=0;i<px.length;i+=4)sum+=px[i]+px[i+1]+px[i+2];if(!(sum>300))ENV=null;}catch(e){ENV=null;}
scene.environment=ENV;const ENV_OK=!!ENV;
const hemi=new T.HemisphereLight(lin('#cfe3ff'),lin('#5b5040'),.75);scene.add(hemi);
const sun=new T.DirectionalLight(lin('#fff1d6'),2.6);sun.castShadow=!!Q.shadow;if(Q.shadow)sun.shadow.mapSize.set(Q.shadow,Q.shadow);
{const c=sun.shadow.camera;c.left=-70;c.right=70;c.top=70;c.bottom=-70;c.near=10;c.far=600;}sun.shadow.bias=-.0003;sun.shadow.normalBias=.05;scene.add(sun,sun.target);
const flashLight=new T.PointLight(lin('#ffc777'),0,14,2);scene.add(flashLight);
/* ---------- terrain ---------- */
const MAP=900,HM=MAP/2,GRID=300,STEP=MAP/GRID,ISLE=370;
const TOWNS=[{n:'Cảng Cũ',x:-230,z:150,r:55},{n:'Làng Chài',x:210,z:220,r:50},{n:'Nhà Máy',x:150,z:-150,r:62},{n:'Trạm Radar',x:-60,z:-250,r:42},{n:'Khu Mỏ',x:-250,z:-120,r:50},{n:'Đồi Thông',x:10,z:40,r:48},{n:'Trường Bắn',x:280,z:-10,r:45}];
function rawH(x,z){const r=hyp(x*1.05,z)/ISLE,edge=fbm(x/90,z/90,3,4)*.25;const fall=1-Math.pow(clamp(r+edge-.12,0,2),3.2);
  let h=fbm(x/170,z/170,5,1)*46+fbm(x/38,z/38,3,7)*5;const ridge=Math.pow(1-Math.abs(fbm(x/240,z/240,3,3)*2-1),2.2)*34;h=h+ridge-18;
  return fall>0?Math.max(.6,h)*fall+3*fall-2*(1-fall):fall*40-2;}
const HG=new Float32Array((GRID+1)*(GRID+1));
for(const t of TOWNS){t.h=Math.max(4,rawH(t.x,t.z));}
for(let j=0;j<=GRID;j++)for(let i=0;i<=GRID;i++){const x=-HM+i*STEP,z=-HM+j*STEP;let h=rawH(x,z);for(const t of TOWNS){const d=hyp(x-t.x,z-t.z),k=smooth(1-(d-t.r)/45);if(k>0)h=lerp(h,t.h+fbm(x/20,z/20,2,9)*.6,k);}HG[j*(GRID+1)+i]=h;}
function heightAt(x,z){const fx=clamp((x+HM)/STEP,0,GRID-.001),fz=clamp((z+HM)/STEP,0,GRID-.001),i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j,W=GRID+1;
  const a=HG[j*W+i],b=HG[j*W+i+1],c=HG[(j+1)*W+i],d=HG[(j+1)*W+i+1];return u+v<1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
function normalAt(x,z){const e=1.5;return _v1.set(heightAt(x-e,z)-heightAt(x+e,z),2*e,heightAt(x,z-e)-heightAt(x,z+e)).normalize();}
const townAt=(x,z,pad)=>TOWNS.find(t=>hyp(x-t.x,z-t.z)<t.r+(pad||0));
{const g=new T.PlaneGeometry(MAP,MAP,GRID,GRID);g.rotateX(-Math.PI/2);const p=g.attributes.position,cols=new Float32Array(p.count*3);
  const sand=lin('#d9c49a'),wet=lin('#a8946c'),g1=lin('#5f8a3a'),g2=lin('#7a9a45'),dry=lin('#a6a061'),rock=lin('#86827a'),rock2=lin('#6e6a63'),dirt=lin('#6f6048'),c=new T.Color();
  for(let k=0;k<p.count;k++){const x=p.getX(k),z=p.getZ(k),h=heightAt(x,z);p.setY(k,h);const n=normalAt(x,z),slope=1-n.y,nz=fbm(x/26,z/26,3,11),nz2=fbm(x/7,z/7,2,13);
    if(h<.4)c.copy(wet).lerp(sand,clamp(h+.6,0,1));else if(h<2.6)c.copy(sand).lerp(g1,smooth((h-1.6)/1));else{c.copy(g1).lerp(g2,nz).lerp(dry,smooth((nz2-.55)*3)*.6);if(h>36)c.lerp(rock,smooth((h-36)/14)*.6);}
    if(slope>.32)c.lerp(nz2>.5?rock:rock2,smooth((slope-.32)/.2));const tw=townAt(x,z,8);if(tw)c.lerp(dirt,smooth(1-hyp(x-tw.x,z-tw.z)/(tw.r+8))*.5*(.6+nz*.8));
    c.multiplyScalar(.9+nz2*.2);cols[k*3]=c.r;cols[k*3+1]=c.g;cols[k*3+2]=c.b;}
  g.setAttribute('color',new T.BufferAttribute(cols,3));g.computeVertexNormals();
  const det=makeTex(512,512,(c2,w,h)=>{const id=c2.createImageData(w,h);for(let i=0;i<w*h;i++){const v=200+Math.random()*55-(Math.random()<.06?60:0);id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v;id.data[i*4+3]=255;}c2.putImageData(id,0,0);},{srgb:false});
  det.repeat.set(MAP/6,MAP/6);
  const tm=new T.MeshStandardMaterial({vertexColors:true,map:det,roughness:.96,metalness:0});const terrain=new T.Mesh(g,tm);terrain.receiveShadow=!!Q.shadow;scene.add(terrain);}
/* water: wide plane, small animated sparkle via normal-ish roughness */
const water=new T.Mesh(new T.PlaneGeometry(6000,6000,1,1).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:lin('#1d6a80'),roughness:.06,metalness:ENV_OK?.55:.2,transparent:true,opacity:.9,envMapIntensity:1.3}));
water.position.y=0;scene.add(water);
const shoreFoam=new T.Mesh(new T.RingGeometry(ISLE*.86,ISLE*1.02,128,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.05,depthWrite:false}));shoreFoam.position.y=.05;scene.add(shoreFoam);
/* ---------- colliders: 2D spatial hash, boxes have a height ---------- */
const HC=16,hash=new Map();let stamp=0;const cellOf=v=>Math.floor((v+2000)/HC),hk=(a,b)=>a*8192+b;
function addCol(c){c.s=0;const x0=c.t==='b'?c.x0:c.x-c.r,x1=c.t==='b'?c.x1:c.x+c.r,z0=c.t==='b'?c.z0:c.z-c.r,z1=c.t==='b'?c.z1:c.z+c.r;
  for(let i=cellOf(x0);i<=cellOf(x1);i++)for(let j=cellOf(z0);j<=cellOf(z1);j++){const k=hk(i,j);let a=hash.get(k);if(!a)hash.set(k,a=[]);a.push(c);}return c;}
function query(x,z,r,cb){stamp++;for(let i=cellOf(x-r);i<=cellOf(x+r);i++)for(let j=cellOf(z-r);j<=cellOf(z+r);j++){const a=hash.get(hk(i,j));if(!a)continue;for(const c of a){if(c.s===stamp)continue;c.s=stamp;cb(c);}}}
function resolve(x,z,r,y){let px=0,pz=0,hit=false;query(x,z,r,c=>{if(y!==undefined&&c.y1!==undefined&&(y>c.y1-.35||y+1.7<c.y0))return;
  if(c.t==='b'){const cx=clamp(x,c.x0,c.x1),cz=clamp(z,c.z0,c.z1),dx=x-cx,dz=z-cz,d2=dx*dx+dz*dz;if(d2<r*r){hit=true;if(d2>1e-8){const d=Math.sqrt(d2);px+=dx/d*(r-d);pz+=dz/d*(r-d);}else{const l=x-c.x0,rr=c.x1-x,t=z-c.z0,b=c.z1-z,m=Math.min(l,rr,t,b);if(m===l)px-=l+r;else if(m===rr)px+=rr+r;else if(m===t)pz-=t+r;else pz+=b+r;}}}
  else{const dx=x-c.x,dz=z-c.z,d=hyp(dx,dz),R=r+c.r;if(d<R&&d>1e-6){hit=true;px+=dx/d*(R-d);pz+=dz/d*(R-d);}}});return hit?[px,pz]:null;}
/* ray vs world (boxes with height, tree trunks, terrain) */
function rayWorld(o,d,max){let best=max;
  const steps=Math.ceil(max/HC)+1;stamp++;const seen=stamp;
  for(let s=0;s<=steps;s++){const t=s*HC;if(t>best)break;const x=o.x+d.x*t,z=o.z+d.z*t;for(let i=cellOf(x)-1;i<=cellOf(x)+1;i++)for(let j=cellOf(z)-1;j<=cellOf(z)+1;j++){const a=hash.get(hk(i,j));if(!a)continue;for(const c of a){if(c.s===seen)continue;c.s=seen;
      if(c.t==='b'){const y0=c.y0||0,y1=c.y1||1e3;let tmin=0,tmax=best;for(const[oo,dd,lo,hi]of[[o.x,d.x,c.x0,c.x1],[o.y,d.y,y0,y1],[o.z,d.z,c.z0,c.z1]]){if(Math.abs(dd)<1e-9){if(oo<lo||oo>hi){tmin=1e9;break;}}else{let t1=(lo-oo)/dd,t2=(hi-oo)/dd;if(t1>t2){const q=t1;t1=t2;t2=q;}tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)break;}}if(tmin<=tmax&&tmin<best)best=tmin;}
      else if(c.trunk){const fx=o.x-c.x,fz=o.z-c.z,a2=d.x*d.x+d.z*d.z,b2=2*(fx*d.x+fz*d.z),cc=fx*fx+fz*fz-c.r*c.r,disc=b2*b2-4*a2*cc;if(disc>=0&&a2>1e-9){const t2=(-b2-Math.sqrt(disc))/(2*a2);if(t2>0&&t2<best&&o.y+d.y*t2<c.top)best=t2;}}}}}
  for(let t=1;t<best;t+=t<40?1.5:4){const y=o.y+d.y*t;if(y<heightAt(o.x+d.x*t,o.z+d.z*t)){best=Math.max(0,t-1);break;}}return best;}
const losClear=(a,b)=>{_v1.set(b.x-a.x,b.y-a.y,b.z-a.z);const L=_v1.length();if(L<.1)return true;_v1.divideScalar(L);return rayWorld(a,{x:_v1.x,y:_v1.y,z:_v1.z},L)>=L-.6;};
/* ---------- materials & textures ---------- */
const MC={};function mat(c,r,m){r=r===undefined?.8:r;m=m||0;const k=c+r+m;return MC[k]||(MC[k]=new T.MeshStandardMaterial({color:lin(c),roughness:r,metalness:m}));}
const VCM=new T.MeshStandardMaterial({vertexColors:true,roughness:.85});
const plaster=makeTex(256,256,(g,w,h)=>{speckle(g,w,h,'#d8d2c4',5000,.13,2);g.fillStyle='rgba(80,60,40,.08)';for(let i=0;i<25;i++){g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,8+Math.random()*30,4+Math.random()*16,0,0,7);g.fill();}g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,h-6,w,6);});
const metalSheet=makeTex(256,256,(g,w,h)=>{speckle(g,w,h,'#9aa3a8',3000,.12,2);for(let x=0;x<w;x+=16){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x,0,3,h);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x+4,0,2,h);}g.fillStyle='rgba(120,60,20,.15)';for(let i=0;i<30;i++)g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*10,10+Math.random()*30);});
const brickTex=makeTex(256,256,(g,w,h)=>{g.fillStyle='#6b6259';g.fillRect(0,0,w,h);const bh=16;for(let y=0;y<h;y+=bh)for(let x=(y/bh)%2?-16:0;x<w;x+=32){const v=110+Math.random()*40|0;g.fillStyle=`rgb(${v+30},${v-5},${v-25})`;g.fillRect(x+1,y+1,30,bh-2);}});
const WALLM=new T.MeshStandardMaterial({map:plaster,vertexColors:true,roughness:.92});
const METALM=new T.MeshStandardMaterial({map:metalSheet,vertexColors:true,roughness:.55,metalness:ENV_OK?.45:.1});
const BRICKM=new T.MeshStandardMaterial({map:brickTex,vertexColors:true,roughness:.9});
function addMesh(geo,m,cast){const me=new T.Mesh(geo,m);me.castShadow=!!cast&&!!Q.shadow;me.receiveShadow=!!Q.shadow;scene.add(me);return me;}
const dummy=new T.Object3D();
function inst(geo,m,list,fn,cast){if(!list.length)return null;const im=new T.InstancedMesh(geo,m,list.length);list.forEach((p,i)=>{dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);fn(p,dummy,i);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);});im.castShadow=!!cast&&!!Q.shadow;im.receiveShadow=!!Q.shadow;scene.add(im);return im;}
/* ---------- towns: houses you can walk into, warehouses, containers, towers, cover walls ---------- */
const WB=new GB(),MB=new GB(),BB=new GB(),RB=new GB(),FL=new GB();const lootPts=[];const BLD=[];
function wallSeg(B,x0,x1,z0,z1,y0,y1,col){B.box(x0,x1,y0,y1,z0,z1,col,3);addCol({t:'b',x0,x1,z0,z1,y0,y1});BLD.push({x0,x1,z0,z1,y0,y1});}
function house(cx,cz,w,d,rot,col){const y=heightAt(cx,cz)-.05,H=3.3,t=.25,dw=1.3;const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;const B=WB;
  FL.box(x0,x1,y,y+.12,z0,z1,lin('#8a7d6c'),2);
  // door gap on the side chosen by rot (0:+z,1:-z,2:+x,3:-x), windows as gaps on the opposite wall
  const side=(s,a0,a1,fixed,isX)=>{const door=s===rot,win=(s^1)===rot;const segs=door?[[a0,(a0+a1)/2-dw],[(a0+a1)/2+dw,a1]]:win?[[a0,(a0+a1)/2-1.1],[(a0+a1)/2+1.1,a1]]:[[a0,a1]];
    for(const[s0,s1]of segs){if(isX)wallSeg(B,s0,s1,fixed-t/2,fixed+t/2,y,y+H,col);else wallSeg(B,fixed-t/2,fixed+t/2,s0,s1,y,y+H,col);}
    if(door){if(isX)wallSeg(B,(a0+a1)/2-dw,(a0+a1)/2+dw,fixed-t/2,fixed+t/2,y+2.3,y+H,col);else wallSeg(B,fixed-t/2,fixed+t/2,(a0+a1)/2-dw,(a0+a1)/2+dw,y+2.3,y+H,col);}
    if(win){if(isX){B.box((a0+a1)/2-1.1,(a0+a1)/2+1.1,y,y+1,fixed-t/2,fixed+t/2,col);B.box((a0+a1)/2-1.1,(a0+a1)/2+1.1,y+2.2,y+H,fixed-t/2,fixed+t/2,col);addCol({t:'b',x0:(a0+a1)/2-1.1,x1:(a0+a1)/2+1.1,z0:fixed-t/2,z1:fixed+t/2,y0:y,y1:y+1});}
      else{B.box(fixed-t/2,fixed+t/2,y,y+1,(a0+a1)/2-1.1,(a0+a1)/2+1.1,col);B.box(fixed-t/2,fixed+t/2,y+2.2,y+H,(a0+a1)/2-1.1,(a0+a1)/2+1.1,col);addCol({t:'b',x0:fixed-t/2,x1:fixed+t/2,z0:(a0+a1)/2-1.1,z1:(a0+a1)/2+1.1,y0:y,y1:y+1});}}};
  side(0,x0,x1,z1,true);side(1,x0,x1,z0,true);side(2,z0,z1,x1,false);side(3,z0,z1,x0,false);
  // gable-ish flat roof with overhang (metal) so shadows fall inside
  RB.box(x0-.4,x1+.4,y+H,y+H+.25,z0-.4,z1+.4,lin('#8b4f3a'),3);BLD.push({x0:x0-.4,x1:x1+.4,z0:z0-.4,z1:z1+.4,y0:y+H,y1:y+H+.25,roof:1});
  lootPts.push({x:cx+rnd(-w/4,w/4),z:cz+rnd(-d/4,d/4),inside:1},{x:cx+rnd(-w/4,w/4),z:cz+rnd(-d/4,d/4),inside:1});}
function warehouse(cx,cz,w,d){const y=heightAt(cx,cz)-.05,H=6.5,t=.3;const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2,dw=2.6;FL.box(x0,x1,y,y+.12,z0,z1,lin('#6f6a62'),2);
  wallSeg(MB,x0,x1,z0-t/2,z0+t/2,y,y+H,lin('#9fb0b8'));wallSeg(MB,x0,cx-dw,z1-t/2,z1+t/2,y,y+H,lin('#9fb0b8'));wallSeg(MB,cx+dw,x1,z1-t/2,z1+t/2,y,y+H,lin('#9fb0b8'));wallSeg(MB,cx-dw,cx+dw,z1-t/2,z1+t/2,y+4.2,y+H,lin('#9fb0b8'));
  wallSeg(MB,x0-t/2,x0+t/2,z0,z1,y,y+H,lin('#8fa2ab'));wallSeg(MB,x1-t/2,x1+t/2,z0,cz-dw,y,y+H,lin('#8fa2ab'));wallSeg(MB,x1-t/2,x1+t/2,cz+dw,z1,y,y+H,lin('#8fa2ab'));wallSeg(MB,x1-t/2,x1+t/2,cz-dw,cz+dw,y+4.2,y+H,lin('#8fa2ab'));
  RB.box(x0-.3,x1+.3,y+H,y+H+.3,z0-.3,z1+.3,lin('#5d6a70'),3);BLD.push({x0,x1,z0,z1,y0:y+H,y1:y+H+.3,roof:1});
  for(let k=0;k<5;k++)lootPts.push({x:cx+rnd(-w/2+2,w/2-2),z:cz+rnd(-d/2+2,d/2-2),inside:1});
  for(let k=0;k<3;k++){const bx=cx+rnd(-w/2+2,w/2-3),bz=cz+rnd(-d/2+2,d/2-3);crate(bx,bz);}}
function crate(x,z){const y=heightAt(x,z);BB.box(x-.6,x+.6,y,y+1.2,z-.6,z+.6,lin('#8a6a3e'),1.2);addCol({t:'b',x0:x-.6,x1:x+.6,z0:z-.6,z1:z+.6,y0:y,y1:y+1.2});BLD.push({x0:x-.6,x1:x+.6,z0:z-.6,z1:z+.6,y0:y,y1:y+1.2});}
function container(x,z,rotX,col){const y=heightAt(x,z),L=6.1,W=2.45,H=2.6;const[x0,x1,z0,z1]=rotX?[x-L/2,x+L/2,z-W/2,z+W/2]:[x-W/2,x+W/2,z-L/2,z+L/2];wallSeg(MB,x0,x1,z0,z1,y,y+H,lin(col));lootPts.push({x:x+(rotX?0:W/2+1),z:z+(rotX?W/2+1:0)});}
function coverWall(x,z,len,rotX){const y=heightAt(x,z),H=1.15,t=.35;if(rotX)wallSeg(BB,x-len/2,x+len/2,z-t/2,z+t/2,y-.2,y+H,lin('#9a958c'));else wallSeg(BB,x-t/2,x+t/2,z-len/2,z+len/2,y-.2,y+H,lin('#9a958c'));}
function tower(x,z){const y=heightAt(x,z),H=9;const parts=[];for(const[a,b]of[[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]]){BB.box(x+a-.15,x+a+.15,y,y+H,z+b-.15,z+b+.15,lin('#5b4a36'),2);addCol({t:'c',x:x+a,z:z+b,r:.25,y0:y,y1:y+H});}
  BB.box(x-2.2,x+2.2,y+H,y+H+.25,z-2.2,z+2.2,lin('#6b5840'),2);for(const s of[-1,1]){BB.box(x-2.2,x+2.2,y+H+.25,y+H+1.2,z+s*2.2-.08,z+s*2.2+.08,lin('#6b5840'),2);}BLD.push({x0:x-2.2,x1:x+2.2,z0:z-2.2,z1:z+2.2,y0:y+H,y1:y+H+.25,roof:1});}
const HOUSE_COLS=['#e8e0cf','#d9c7a8','#c9d3c5','#e2cfc2','#cfd6dc','#e6d9b8'],CONT_COLS=['#b5442f','#2f6f8f','#3f7d4e','#c48a2a','#6b4f8f','#8a8f96'];
SEED=97;
for(const t of TOWNS){const n=Math.round(t.r/7);const placed=[];
  const free=(x,z,rr)=>placed.every(p=>hyp(p[0]-x,p[1]-z)>p[2]+rr+3);
  let tries=0;while(placed.length<n&&tries++<200){const a=sr(0,6.283),r=sr(0,t.r-8),x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r;const kind=sr(0,1);
    if(kind<.55){const w=sr(7,10),d=sr(7,9.5);if(!free(x,z,Math.max(w,d)/2))continue;house(x,z,w,d,Math.floor(sr(0,3.99)),lin(HOUSE_COLS[Math.floor(sr(0,5.99))]));placed.push([x,z,Math.max(w,d)/2]);}
    else if(kind<.72){const w=sr(14,20),d=sr(12,16);if(!free(x,z,Math.max(w,d)/2))continue;warehouse(x,z,w,d);placed.push([x,z,Math.max(w,d)/2]);}
    else if(kind<.88){if(!free(x,z,4))continue;const rx=sr(0,1)<.5;container(x,z,rx,CONT_COLS[Math.floor(sr(0,5.99))]);if(sr(0,1)<.5)container(x+(rx?0:2.6),z+(rx?2.6:0),rx,CONT_COLS[Math.floor(sr(0,5.99))]);placed.push([x,z,4]);}
    else{if(!free(x,z,3))continue;tower(x,z);placed.push([x,z,3]);lootPts.push({x:x+3,z});}}
  for(let k=0;k<6;k++){const a=sr(0,6.283),r=sr(t.r*.5,t.r+10),x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r;if(free(x,z,2))coverWall(x,z,sr(3,6),sr(0,1)<.5);}
  for(let k=0;k<4;k++){const a=sr(0,6.283),r=sr(0,t.r),x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r;if(free(x,z,1))crate(x,z);}}
// scattered field loot & lonely buildings
for(let k=0;k<26;k++){const a=sr(0,6.283),r=sr(40,ISLE*.85),x=Math.cos(a)*r,z=Math.sin(a)*r;if(heightAt(x,z)<3||townAt(x,z,20))continue;if(sr(0,1)<.5)house(x,z,sr(6,8),sr(6,8),Math.floor(sr(0,3.99)),lin(pick(HOUSE_COLS)));else{crate(x,z);lootPts.push({x:x+1.6,z});}}
for(let k=0;k<90;k++){const a=sr(0,6.283),r=sr(20,ISLE*.9),x=Math.cos(a)*r,z=Math.sin(a)*r;if(heightAt(x,z)>2.2)lootPts.push({x,z});}
addMesh(WB.geo(),WALLM,true);addMesh(MB.geo(),METALM,true);addMesh(BB.geo(),BRICKM,true);addMesh(RB.geo(),METALM,true);addMesh(FL.geo(),VCM,false);
/* ---------- vegetation: pines, broadleaf trees, bushes, rocks (instanced) ---------- */
const trees=[],pines=[],bushes=[],rocks=[];SEED=31;
for(let k=0;k<2600;k++){const x=sr(-ISLE,ISLE),z=sr(-ISLE,ISLE),h=heightAt(x,z);if(h<3||townAt(x,z,6))continue;const n=normalAt(x,z);if(n.y<.82)continue;const f=fbm(x/80,z/80,3,21);
  if(f>.52&&sr(0,1)<Q.trees){(h>18?pines:trees).push([x,h,z,sr(.8,1.35),sr(0,6.28)]);}else if(f>.42&&sr(0,1)<.35)bushes.push([x,h,z,sr(.7,1.4),sr(0,6.28)]);}
for(let k=0;k<420;k++){const x=sr(-ISLE,ISLE),z=sr(-ISLE,ISLE),h=heightAt(x,z);if(h<1||townAt(x,z,4))continue;rocks.push([x,h,z,sr(.6,2.6),sr(0,6.28)]);}
const leafTex=makeTex(128,128,(g,w,h)=>{g.fillStyle='#d0d0d0';g.fillRect(0,0,w,h);for(let i=0;i<260;i++){const x=Math.random()*w,y=Math.random()*h,s=3+Math.random()*7,v=150+Math.random()*105|0;g.fillStyle=`rgb(${v},${v},${v})`;g.beginPath();g.ellipse(x,y,s,s*.55,Math.random()*3,0,7);g.fill();}});
const FOLM=new T.MeshStandardMaterial({vertexColors:true,map:leafTex,roughness:.85});
{const lump=(r,d)=>{const g=new T.IcosahedronGeometry(r,d);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+Math.sin(x*4.1+z*3.3)*.1+Math.cos(y*5.2)*.08;p.setXYZ(i,x*k,y*k*.82,z*k);}g.computeVertexNormals();return g;};
  const broad=buildVC([{geo:new T.CylinderGeometry(.18,.34,5,7),pos:[0,2.5,0],color:'#5d4631'},{geo:lump(2.6,1),pos:[0,6,0],color:'#4b7a33'},{geo:lump(1.9,1),pos:[1.4,5.2,.6],color:'#567f37'},{geo:lump(1.8,1),pos:[-1.2,6.6,-.5],color:'#44702f'},{geo:lump(1.5,1),pos:[.2,7.6,.9],color:'#5a8a3a'}]);
  const pine=buildVC([{geo:new T.CylinderGeometry(.15,.3,7,6),pos:[0,3.5,0],color:'#4f3b2a'},{geo:new T.ConeGeometry(2.6,4.2,8),pos:[0,4.5,0],color:'#2f5a2c'},{geo:new T.ConeGeometry(2.1,3.6,8),pos:[0,6.6,0],color:'#336330'},{geo:new T.ConeGeometry(1.5,3,8),pos:[0,8.6,0],color:'#3a6c35'}]);
  const bush=buildVC([{geo:lump(1,1),pos:[0,.6,0],color:'#4e7a35'},{geo:lump(.75,1),pos:[.7,.5,.2],color:'#5b8a3c'},{geo:lump(.7,1),pos:[-.6,.45,-.3],color:'#46702f'}]);
  const rk=lump(1,1);const rp=rk.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i);rp.setXYZ(i,x*(1+Math.sin(z*6)*.15),y*.7,z);}rk.computeVertexNormals();
  const rockG=buildVC([{geo:rk,color:'#8a867e'}]);
  const pl=(p,d)=>{d.position.set(p[0],p[1]-.2,p[2]);d.rotation.y=p[4];d.scale.setScalar(p[3]);};
  inst(broad,FOLM,trees,pl,true);inst(pine,FOLM,pines,pl,true);inst(bush,FOLM,bushes,pl,true);inst(rockG,new T.MeshStandardMaterial({vertexColors:true,map:plaster,roughness:.95}),rocks,(p,d)=>{d.position.set(p[0],p[1]-.3*p[3],p[2]);d.rotation.set(p[4]*.3,p[4],0);d.scale.set(p[3]*1.3,p[3],p[3]);},true);
  for(const p of trees)addCol({t:'c',x:p[0],z:p[2],r:.35*p[3],trunk:1,top:p[1]+5*p[3]});for(const p of pines)addCol({t:'c',x:p[0],z:p[2],r:.3*p[3],trunk:1,top:p[1]+8*p[3]});
  for(const p of rocks)if(p[3]>1.2)addCol({t:'b',x0:p[0]-p[3]*1.1,x1:p[0]+p[3]*1.1,z0:p[2]-p[3]*.9,z1:p[2]+p[3]*.9,y0:p[1]-1,y1:p[1]+p[3]*.6});}
/* grass: instanced clumps around the player, swaying in the wind */
const grassTex=makeTex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<34;i++){const x=6+Math.random()*(w-12),bw=2+Math.random()*3,top=Math.random()*h*.45;const gr=g.createLinearGradient(0,h,0,top);gr.addColorStop(0,'#3d5e22');gr.addColorStop(1,Math.random()<.3?'#b6b46a':'#8fb24f');g.fillStyle=gr;g.beginPath();g.moveTo(x-bw,h);g.quadraticCurveTo(x+rnd(-6,6),h*.6,x+rnd(-10,10),top);g.lineTo(x+bw,h);g.fill();}},{repeat:false});
const grassU={uTime:{value:0}};let grass=null;
if(Q.grass){const g=new T.BufferGeometry(),P=[],U=[],N=[],I=[];for(let k=0;k<3;k++){const a=k/3*Math.PI,cx=Math.cos(a)*.6,cz=Math.sin(a)*.6,o=P.length/3;P.push(-cx,0,-cz,cx,0,cz,cx,.62,cz,-cx,.62,-cz);U.push(0,0,1,0,1,1,0,1);for(let q=0;q<4;q++)N.push(0,1,0);I.push(o,o+1,o+2,o,o+2,o+3);}
  g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setIndex(I);
  const gm=new T.MeshLambertMaterial({map:grassTex,alphaTest:.5,side:T.DoubleSide});
  gm.onBeforeCompile=sh=>{sh.uniforms.uTime=grassU.uTime;sh.fragmentShader=sh.fragmentShader.split('vLightBack').join('vLightFront').split('vIndirectBack').join('vIndirectFront');sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*.21+instanceMatrix[3].z*.17;transformed.x+=sin(uTime*1.7+ph)*.16*uv.y;transformed.z+=cos(uTime*1.3+ph)*.1*uv.y;\n#endif');};
  grass=new T.InstancedMesh(g,gm,Q.grass);grass.frustumCulled=false;grass.receiveShadow=!!Q.shadow;scene.add(grass);grass.lastX=1e9;grass.lastZ=1e9;}
function grassUpdate(px,pz){if(!grass||hyp(px-grass.lastX,pz-grass.lastZ)<6)return;grass.lastX=px;grass.lastZ=pz;const R=Math.sqrt(Q.grass/Math.PI)*1.35,cell=1.35;let n=0;
  const i0=Math.floor((px-R)/cell),i1=Math.floor((px+R)/cell),j0=Math.floor((pz-R)/cell),j1=Math.floor((pz+R)/cell);
  for(let i=i0;i<=i1&&n<Q.grass;i++)for(let j=j0;j<=j1&&n<Q.grass;j++){const x=(i+hash2(i,j,3))*cell,z=(j+hash2(i,j,5))*cell;if(hyp(x-px,z-pz)>R)continue;const h=heightAt(x,z);if(h<2.4||townAt(x,z,-4))continue;if(fbm(x/30,z/30,2,41)<.38)continue;
    dummy.position.set(x,h-.05,z);dummy.rotation.set(0,hash2(i,j,7)*6.28,0);const s=.6+hash2(i,j,9)*.55;dummy.scale.set(s,s*(.75+hash2(i,j,2)*.5),s);dummy.updateMatrix();grass.setMatrixAt(n++,dummy.matrix);}
  grass.count=n;grass.instanceMatrix.needsUpdate=true;}
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
  if(d.k==='gun'){g=buildVC([{geo:new T.BoxGeometry(.12,WEAP[d.w].len+.2,.16),color:WEAP[d.w].col}]);}
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
  let best=null,bd=mode.view;const eye={x:b.x,y:b.y+1.6,z:b.z};
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
function drawMini(){const c=mctx,W=380,s=2.6,px=P.car?P.car.x:P.x,pz=P.car?P.car.z:P.z;c.fillStyle='#163c4a';c.fillRect(0,0,W,W);c.save();c.translate(W/2,W/2);c.rotate(cam.yaw+Math.PI);c.scale(s,s);c.translate(-px,-pz);c.drawImage(mapBg,-HM,-HM,MAP,MAP);
  if(zone.phase>=0){c.lineWidth=2/s;c.strokeStyle='rgba(120,170,255,.95)';c.beginPath();c.arc(zone.cx,zone.cz,zone.r,0,7);c.stroke();c.strokeStyle='#fff';c.setLineDash([4/s,4/s]);c.beginPath();c.arc(zone.tcx,zone.tcz,zone.tr,0,7);c.stroke();c.setLineDash([]);}
  if(plane.on&&(P.state==='plane'||P.state==='fall')){c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.5/s;c.beginPath();c.moveTo(plane.x0,plane.z0);c.lineTo(plane.x1,plane.z1);c.stroke();}
  for(const v of cars)if(v.hp>0){c.fillStyle='#ffd166';c.fillRect(v.x-1.5,v.z-1.5,3,3);}
  if(marker){c.fillStyle='#ffcf3d';c.beginPath();c.arc(marker.x,marker.z,3,0,7);c.fill();}
  c.restore();c.save();c.translate(W/2,W/2);c.rotate(cam.yaw-(P.car?P.car.h:P.h));c.fillStyle='#c1f354';c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.moveTo(0,-11);c.lineTo(8,9);c.lineTo(0,4);c.lineTo(-8,9);c.closePath();c.fill();c.stroke();c.restore();}
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
const api={start(){running=true;active=true;try{if(AC&&AC.state==='suspended')AC.resume();}catch(_){}last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);resize();},
  stop(){running=false;active=false;keys.clear();mouseL=false;try{if(AC&&AC.state==='running')AC.suspend();}catch(_){}cancelAnimationFrame(raf);if(locked)document.exitPointerLock();if(phase==='match'&&!ended){/* leaving mid-match counts as a loss without reward */phase='lobby';toLobby();}writeSave();},
  setPaused(p){running=!p;active=!p;keys.clear();mouseL=false;if(p&&locked)document.exitPointerLock();if(!p){last=performance.now();}},
  resize,get save(){return save;},
  _dbg:{P,bots,items,cars,zone,plane,cam,keys,step,startMatch,beginMatch,toLobby,jump,openChute,playerFire,playerPick,heightAt,info:()=>renderer.info.render,render:()=>renderer.render(phase==='lobby'?lobby.scene:scene,phase==='lobby'?lobby.cam:camera),camUpdate,scene,camera,get phase(){return phase;},get alive(){return aliveCount;},MODES,SKINS,save,TOWNS,lootPts,openShop,openTopup,renderer}};
return api;}
window.LastZone={create};
})();
