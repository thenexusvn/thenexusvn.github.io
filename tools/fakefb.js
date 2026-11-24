/* Minimal in-memory stand-in for the Firebase compat SDK, for tests only. Store is window.__FB (seeded from sessionStorage 'fbstore'). */
(function(){
if(window.firebase)return;
const store=JSON.parse(sessionStorage.getItem('fbstore')||'{}');window.__FB=store;
const persist=()=>sessionStorage.setItem('fbstore',JSON.stringify(store));
const subs=[];const notify=()=>subs.forEach(f=>f());
const TS=ms=>({toMillis:()=>ms,_ts:ms});
const clean=v=>{if(v&&v.__st)return Date.now();if(v&&v.toMillis)return v.toMillis();return v;};
function docRef(path){return{id:path.split('/').pop(),path,
  async get(){const d=store[path];return{exists:!!d,id:this.id,data:()=>revive(d)};},
  async set(data,opt){const o=opt&&opt.merge?Object.assign({},store[path]||{}):{};for(const k in data){const v=data[k];o[k]=v&&v.__inc!=null?((o[k]||0)+v.__inc):clean(v);}store[path]=o;persist();notify();},
  async update(data){return this.set(data,{merge:true});},async delete(){delete store[path];persist();notify();},
  collection(c){return coll(path+'/'+c);},
  onSnapshot(cb,eb){const f=()=>{const d=store[path];cb({exists:!!d,data:()=>revive(d)});};subs.push(f);f();return()=>subs.splice(subs.indexOf(f),1);}};}
function revive(d){if(!d)return d;const o={};for(const k in d)o[k]=(k==='pro'||k==='vaultPlus'||k==='premium')?TS(d[k]):d[k];return o;}
function coll(path){const q={orderBy(){return q;},limit(){return q;},where(){return q;},doc(id){return docRef(path+'/'+(id||Math.random().toString(36).slice(2)));},
  async add(d){return this.doc().set(d);},async get(){const docs=Object.keys(store).filter(k=>k.startsWith(path+'/')&&k.split('/').length===path.split('/').length+1).map(k=>({id:k.split('/').pop(),data:()=>store[k]}));return{docs,size:docs.length};},
  onSnapshot(cb){const f=async()=>cb(await q.get());subs.push(f);f();return()=>{};}};return q;}
let cur=null;const al=[];const fire=()=>al.forEach(f=>f(cur));
const auth={get currentUser(){return cur;},onAuthStateChanged(f){al.push(f);setTimeout(()=>f(cur),0);},
  async signInAnonymously(){cur={uid:'anon'+Math.random().toString(36).slice(2,6),isAnonymous:true};fire();},
  async signInWithPopup(p){window.__lastProvider=p;cur={uid:'G1',isAnonymous:false,displayName:'Minh Khoa',email:'mk@gmail.com'};fire();return{user:cur};},
  async signInWithRedirect(){},async signOut(){cur=null;fire();},
  async signInWithEmailAndPassword(){},async createUserWithEmailAndPassword(){}};
function GoogleAuthProvider(){this.params=null;}GoogleAuthProvider.prototype.setCustomParameters=function(p){this.params=p;};
const fs={collection:coll,async runTransaction(fn){return fn({get:r=>r.get(),update:(r,d)=>r.update(d)});}};
window.firebase={initializeApp(){},auth:Object.assign(()=>auth,{GoogleAuthProvider}),firestore:Object.assign(()=>fs,{FieldValue:{serverTimestamp:()=>({__st:1}),increment:n=>({__inc:n})}})};
})();
