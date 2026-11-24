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
