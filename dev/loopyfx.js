/* Loopy game filters: 15 TikTok-style interactive effects drawn on top of the camera.
   Each effect is drawn onto the 720x1280 recording canvas, so what you see is what gets posted.
   API: LoopyFX.list -> [{id,e,n}], LoopyFX.make(id) -> {start(now), draw(ctx,W,H,now,dt), tap(x,y,now)} ; LoopyFX.onSound(fn) */
(function(){
const EN=()=>!!(window.NexusI18n&&window.NexusI18n.lang==='en');const L=(v,e)=>EN()?e:v;
const R=a=>a[Math.random()*a.length|0];const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
const ease=k=>1-Math.pow(1-Math.min(1,Math.max(0,k)),3);const back=k=>{k=Math.min(1,Math.max(0,k));const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
let snd=()=>{};
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function T(c,s,x,y,size,col,o){o=o||{};c.font=`${o.it?'italic ':''}${o.w||800} ${size}px ${o.f||'Inter,system-ui,sans-serif'}`;c.textAlign=o.al||'center';c.textBaseline='middle';
  if(!o.ns){c.lineJoin='round';c.lineWidth=Math.max(4,size*.17);c.strokeStyle=o.sc||'rgba(0,0,0,.6)';c.strokeText(s,x,y);}c.fillStyle=col||'#fff';c.fillText(s,x,y);}
function pill(c,s,cx,y,size,bg,fg){c.font=`800 ${size}px Inter,system-ui,sans-serif`;const w=c.measureText(s).width+size*1.4,h=size*1.8;rr(c,cx-w/2,y-h/2,w,h,h/2);c.fillStyle=bg;c.fill();T(c,s,cx,y+1,size,fg||'#111',{ns:1});}
function grad(c,x0,y0,x1,y1,a,b){const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
/* confetti */
function Conf(){let P=[];return{burst(n){for(let i=0;i<(n||90);i++)P.push({x:.5+(Math.random()-.5)*.3,y:.2,vx:(Math.random()-.5)*1.1,vy:-.4-Math.random()*.7,r:Math.random()*6,c:R(['#c1f354','#ff5fa2','#ffd166','#7df9ff','#ff8a3d','#ffffff']),s:8+Math.random()*10,l:2.6});},
  draw(c,W,H,dt){P=P.filter(p=>(p.l-=dt)>0);for(const p of P){p.vy+=dt*1.1;p.x+=p.vx*dt*.5;p.y+=p.vy*dt*.5;p.r+=dt*7;c.save();c.globalAlpha=Math.min(1,p.l);c.translate(p.x*W,p.y*H);c.rotate(p.r);c.fillStyle=p.c;c.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);c.restore();}}};}
/* ---------- randomizer: a card above your head cycles through options and lands on one ---------- */
function randomizer(o){let t0=-1,idx=0,items=[],lastI=-1;const cf=Conf();let landed=false;
  return{start(now){items=o.items();idx=Math.random()*items.length|0;t0=now;lastI=-1;landed=false;},
    draw(c,W,H,now,dt){const cx=W/2,y=H*.2,bw=W*.8,bh=200;
      pill(c,o.title(),cx,y-150,34,o.col||'#c1f354');
      if(t0<0){rr(c,cx-bw/2,y-bh/2,bw,bh,34);c.fillStyle='rgba(10,12,20,.72)';c.fill();T(c,'?',cx,y,110,'#fff');T(c,L('Bấm quay để bắt đầu','Press record to start'),cx,y+bh/2+40,30,'#fff');cf.draw(c,W,H,dt);return;}
      const t=(now-t0)/1000,D=o.dur||3.4,k=Math.min(1,t/D),n=items.length,total=n*3+idx,pos=Math.floor(ease(k)*total),cur=items[pos%n];
      if(pos!==lastI){lastI=pos;if(k<1)snd('tick');}
      if(k>=1&&!landed){landed=true;cf.burst();snd('win');}
      const pop=landed?back(Math.min(1,(t-D)*3)):1,sc=landed?.85+.15*pop:1;
      c.save();c.translate(cx,y);c.scale(sc,sc);rr(c,-bw/2,-bh/2,bw,bh,34);c.fillStyle=landed?grad(c,-bw/2,0,bw/2,0,o.col||'#c1f354',o.col2||'#ffd166'):'rgba(10,12,20,.78)';c.fill();
      c.lineWidth=5;c.strokeStyle='rgba(255,255,255,.9)';c.stroke();
      if(!landed){c.save();rr(c,-bw/2,-bh/2,bw,bh,34);c.clip();const sh=((now/60)%1)*bw*2-bw;c.fillStyle='rgba(255,255,255,.08)';c.fillRect(sh,-bh/2,60,bh);c.restore();}
      T(c,cur[0],-bw/2+100,4,96,'#fff',{ns:1});T(c,cur[1],40,4,cur[1].length>12?42:56,landed?'#111':'#fff',{ns:landed?1:0,w:900});c.restore();
      if(landed&&o.sub){const s=o.sub(items[idx]);if(s)T(c,s,cx,y+bh/2+52,36,'#fff');}
      cf.draw(c,W,H,dt);},tap(){}};}
/* ---------- meter: a bar fills up, wobbles, then settles on a value ---------- */
function meter(o){let t0=-1,val=0;const cf=Conf();let done=false,lastP=-1;
  return{start(now){t0=now;val=o.pick?o.pick():Math.round(40+Math.random()*60);done=false;lastP=-1;},
    draw(c,W,H,now,dt){const cx=W/2,y=H*.2,bw=W*.78,bh=56;pill(c,o.title(),cx,y-120,34,o.col);
      let v=0;if(t0>=0){const t=(now-t0)/1000;if(t<2.6)v=Math.min(99,Math.max(0,(Math.sin(t*9)*.5+.5)*100*Math.min(1,t)));else{const k=Math.min(1,(t-2.6)/.8);v=v+(val)*ease(k);if(!done&&k>=1){done=true;cf.burst(70);snd('win');}}}
      const p=Math.round(v);if(t0>=0&&!done&&p!==lastP&&p%7===0){lastP=p;snd('tick');}
      rr(c,cx-bw/2,y-bh/2,bw,bh,bh/2);c.fillStyle='rgba(10,12,20,.75)';c.fill();c.lineWidth=4;c.strokeStyle='#fff';c.stroke();
      c.save();rr(c,cx-bw/2+6,y-bh/2+6,(bw-12)*v/100,bh-12,(bh-12)/2);c.fillStyle=grad(c,cx-bw/2,0,cx+bw/2,0,o.col,o.col2);c.fill();c.restore();
      T(c,(o.icon||'')+' '+(t0<0?'??':p)+'%',cx,y+bh/2+62,72,'#fff',{w:900});
      if(done&&o.verdict)T(c,o.verdict(val),cx,y+bh/2+140,40,o.col2);
      if(t0<0)T(c,L('Bấm quay để đo','Press record to measure'),cx,y+bh/2+140,30,'#fff');cf.draw(c,W,H,dt);},tap(){}};}
/* ---------- data ---------- */
const QUIZ=()=>[[L('Thủ đô của Úc là?','Capital of Australia?'),['Sydney','Canberra','Melbourne','Perth'],1],[L('Hành tinh lớn nhất?','Largest planet?'),[L('Sao Hỏa','Mars'),L('Trái Đất','Earth'),L('Sao Mộc','Jupiter'),L('Sao Kim','Venus')],2],
  [L('Nước sôi ở bao nhiêu độ C?','Water boils at (°C)?'),['90','100','120','80'],1],[L('Con vật nhanh nhất trên cạn?','Fastest land animal?'),[L('Ngựa','Horse'),L('Báo săn','Cheetah'),L('Sư tử','Lion'),L('Thỏ','Rabbit')],1],
  [L('1 năm có bao nhiêu tuần?','Weeks in a year?'),['48','50','52','54'],2],[L('Ai vẽ Mona Lisa?','Who painted the Mona Lisa?'),['Picasso','Van Gogh','Da Vinci','Monet'],2],
  [L('Đại dương lớn nhất?','Largest ocean?'),[L('Đại Tây Dương','Atlantic'),L('Ấn Độ Dương','Indian'),L('Thái Bình Dương','Pacific'),L('Bắc Băng Dương','Arctic')],2],
  [L('Kim loại nào ở thể lỏng?','Which metal is liquid?'),[L('Sắt','Iron'),L('Thủy ngân','Mercury'),L('Đồng','Copper'),L('Vàng','Gold')],1],[L('Bao nhiêu chân có con nhện?','How many legs does a spider have?'),['6','8','10','12'],1],
  [L('Núi cao nhất thế giới?','Tallest mountain?'),['K2','Everest','Fansipan','Kilimanjaro'],1],[L('7 x 8 = ?','7 x 8 = ?'),['54','56','58','64'],1],[L('Quốc gia có hình chữ S?','Which country is S-shaped?'),[L('Thái Lan','Thailand'),L('Việt Nam','Vietnam'),L('Lào','Laos'),L('Nhật Bản','Japan')],1]];
const FOODS=()=>[['🍜',L('Phở bò','Beef pho')],['🥖',L('Bánh mì','Banh mi')],['🍚',L('Cơm tấm','Broken rice')],['🥢',L('Bún chả','Bun cha')],['🍲',L('Lẩu thái','Thai hotpot')],['🧋',L('Trà sữa','Milk tea')],['🍕','Pizza'],['🍔','Burger'],['🍣','Sushi'],['🍗',L('Gà rán','Fried chicken')],['🍝',L('Mì Ý','Spaghetti')],['🍦',L('Kem','Ice cream')],['🥞',L('Bánh xèo','Banh xeo')],['🥟',L('Há cảo','Dumplings')],['🍢',L('Xiên que','Skewers')],['🍡','Tokbokki'],['🥭',L('Xoài lắc','Shaken mango')],['🦪',L('Ốc','Snails')],['🍠',L('Khoai lang nướng','Sweet potato')],['🌯',L('Bánh tráng cuốn','Rice paper rolls')]];
const TREND=()=>[['🍵',L('Matcha latte','Matcha latte')],['🍫',L('Socola Dubai','Dubai chocolate')],['🍋',L('Trà chanh giã tay','Hand-pounded lemon tea')],['🌶️',L('Bánh tráng chấm','Dipped rice paper')],['🔥',L('Mì cay 7 cấp','7-level spicy noodles')],['🐔',L('Gà ủ muối','Salt-baked chicken')],['🍳',L('Bánh mì chảo','Pan banh mi')],['🥑',L('Kem bơ','Avocado ice cream')],['🧀',L('Trà sữa phô mai','Cheese milk tea')],['🐚',L('Ốc len xào dừa','Coconut snails')],['🍰',L('Bông lan trứng muối','Salted egg sponge cake')],['🍘',L('Cơm cháy chà bông','Crispy rice with floss')],['🍡','Tokbokki'],['🥤',L('Nước ép cần tây','Celery juice')]];
const MEMES=()=>[['🤲','6 7',L('Hai tay lên xuống như cân, hô "six seven"!','Hands up and down like scales, say "six seven"!')],['😤','Huss huss huss',L('Thở mạnh 3 lần thật ngầu: huss huss huss!','Three big cool breaths: huss huss huss!')],
  ['🗿','Sigma face',L('Nhìn thẳng camera, nhướng 1 bên mày','Stare at the camera, raise one eyebrow')],['😌','Chill guy',L('Đút tay túi quần, cười nhẹ, thật chill','Hands in pockets, slight smile, so chill')],['🥁','Tung tung tung sahur',L('Gõ tay lên bàn 3 nhịp: tung tung tung!','Drum three beats: tung tung tung!')],
  ['🤫','Mewing',L('Ngậm miệng, chỉ tay lên quai hàm','Lips shut, point at your jawline')],['✨','Aura +1000',L('Vuốt tóc thật chậm, tạo dáng','Slowly fix your hair and pose')],['😏','Rizz',L('Nháy mắt và chỉ tay vào camera','Wink and point at the camera')],
  ['🙏',L('Ê xin vía','Gimme the luck'),L('Chắp tay xin vía thật thành tâm','Hands together, ask for the luck')],['🫡',L('Nghiêm!','Salute!'),L('Đứng nghiêm chào cờ 3 giây','Stand to attention for 3 seconds')],['💃',L('Lắc hông','Hip shake'),L('Lắc hông 3 cái theo nhạc','Shake your hips 3 times')],['🐸',L('Ếch ngồi đáy giếng','Frog face'),L('Phồng má như con ếch','Puff your cheeks like a frog')]];
const DARES=()=>[L('Nhảy 10 giây không cần nhạc','Dance 10 seconds with no music'),L('Nói giọng miền khác 15 giây','Talk in a different accent for 15 seconds'),L('Hít đất 10 cái ngay bây giờ','Do 10 push-ups right now'),L('Hát to điệp khúc bài bạn thích','Sing your favourite chorus out loud'),L('Nhắn "nhớ bạn" cho người thứ 3 trong danh bạ','Text "miss you" to the 3rd person in your contacts'),
  L('Đăng story bức ảnh xấu nhất của bạn','Post your worst photo on your story'),L('Ăn một muỗng chanh','Eat a spoon of lemon'),L('Làm mặt xấu 5 giây không cười','Ugly face for 5 seconds, no laughing'),L('Gọi tên crush bằng chữ cái đầu','Say your crush\'s initial'),L('Giả làm MC giới thiệu chính mình','Introduce yourself like a TV host')];
const TRUTHS=()=>[L('Lần cuối bạn khóc là khi nào?','When did you last cry?'),L('Crush hiện tại tên bắt đầu bằng chữ gì?','What letter does your crush\'s name start with?'),L('Điểm thấp nhất bạn từng bị là mấy?','Your lowest test score ever?'),L('Bạn sợ điều gì nhất?','What are you most afraid of?'),L('Bí mật nhỏ chưa ai biết?','A small secret nobody knows?'),L('Bạn từng nói dối ba mẹ chuyện gì?','A lie you told your parents?')];
let PEOPLE=[];
const people=n=>{const L2=PEOPLE.slice();const fill=[L('Bạn bí ẩn','Mystery friend')];let i=1;while(L2.length<n)L2.push({name:fill[0]+' #'+(i++),friend:false});return L2;};
/* ---------- ranking: items appear one by one, tap a numbered slot on the right ---------- */
function ranking(o){let items=[],cur=0,slots=[],t0=-1,doneT=-1;const cf=Conf(),N=o.n;
  const geo=()=>{const top=170,sh=N>5?92:118,h=N>5?80:98;return{x:W0-250,top,sh,h,w:220};};
  return{start(now){items=o.items().slice(0,N);cur=0;slots=Array(N).fill(null);t0=now;doneT=-1;},
    draw(c,W,H,now,dt){pill(c,o.title(),W/2,90,30,o.col||'#c1f354');const g=geo();
      for(let i=0;i<N;i++){const y=g.top+i*g.sh;rr(c,g.x,y,g.w,g.h,20);c.fillStyle=slots[i]?'rgba(193,243,84,.92)':'rgba(10,12,20,.7)';c.fill();c.lineWidth=3;c.strokeStyle='#fff';c.stroke();
        T(c,String(i+1),g.x+32,y+g.h/2,36,slots[i]?'#111':'#fff',{ns:!!slots[i],w:900});if(slots[i]){T(c,slots[i][0],g.x+84,y+g.h/2,40,'#fff',{ns:1});T(c,slots[i][1],g.x+114,y+g.h/2,slots[i][1].length>11?17:21,'#111',{ns:1,al:'left',w:800});}}
      if(t0<0){T(c,L('Bấm quay, rồi chạm số để xếp','Record, then tap a number'),(W-250)/2,250,26,'#fff');return;}
      if(cur<items.length){const it=items[cur],bob=Math.sin(now/220)*8,bw=W-300;rr(c,24,180+bob,bw,190,30);c.fillStyle='rgba(10,12,20,.8)';c.fill();c.lineWidth=4;c.strokeStyle=o.col||'#ffd166';c.stroke();
        T(c,it[0],24+bw/2,240+bob,74,'#fff',{ns:1});T(c,it[1],24+bw/2,318+bob,it[1].length>14?28:36,'#fff');T(c,(cur+1)+'/'+N+' · '+L('chạm số bên phải','tap a number'),24+bw/2,410,22,'#fff');}
      else{if(doneT<0){doneT=now;cf.burst(120);snd('win');}T(c,o.done?o.done():L('Xong! 🎉','Done! 🎉'),(W-250)/2,270,28,'#c1f354',{w:900});}
      cf.draw(c,W,H,dt);},
    tap(x,y){if(t0<0||cur>=items.length)return;const g=geo();if(x<g.x||x>g.x+g.w)return;const i=Math.floor((y-g.top)/g.sh);if(i<0||i>=N||slots[i]||y-g.top-i*g.sh>g.h)return;slots[i]=items[cur++];snd(cur>=items.length?'ding':'tick');}};}
/* ---------- tap mini-games ---------- */
function flappy(){let st=0,y=0,v=0,pipes=[],score=0,best=0,t0=-1,dead=false,lastT=0;
  const reset=now=>{y=500;v=0;pipes=[];score=0;dead=false;t0=now;lastT=now;};
  return{start(now){reset(now);st=1;},
    draw(c,W,H,now,dt){pill(c,L('🐤 Bay qua ống · chạm để bay','🐤 Flappy · tap to fly'),W/2,90,30,'#ffd166');
      if(!st){T(c,'🐤',W/2,500,120,'#fff',{ns:1});T(c,L('Bấm quay rồi chạm màn hình','Record, then tap the screen'),W/2,640,28,'#fff');return;}
      if(!dead){v+=1500*dt;y+=v*dt;if(now-lastT>1500){lastT=now;const gap=320,gy=260+Math.random()*(H-760);pipes.push({x:W+60,gy,gap,p:false});}
        for(const p of pipes){p.x-=260*dt;if(!p.p&&p.x<150){p.p=true;score++;snd('tick');}if(p.x<210&&p.x>40&&(y<p.gy||y>p.gy+p.gap)){dead=true;}}
        if(y>H-60||y<20)dead=true;if(dead){best=Math.max(best,score);snd('win');}}
      pipes=pipes.filter(p=>p.x>-120);for(const p of pipes){c.fillStyle='rgba(47,212,122,.82)';rr(c,p.x-60,-20,120,p.gy+20,16);c.fill();rr(c,p.x-60,p.gy+p.gap,120,H,16);c.fill();c.lineWidth=5;c.strokeStyle='#145c33';c.stroke();}
      c.save();c.translate(150,y);c.rotate(Math.max(-.5,Math.min(1.2,v/900)));T(c,'🐤',0,0,90,'#fff',{ns:1});c.restore();
      T(c,String(score),W/2,200,96,'#fff',{w:900});if(dead){T(c,L('Thua rồi! Chạm để chơi lại','Game over! Tap to retry'),W/2,H*.45,40,'#ff5fa2',{w:900});T(c,L('Kỷ lục: ','Best: ')+best,W/2,H*.45+60,34,'#ffd166');}},
    tap(x,y2,now){if(!st)return;if(dead){reset(now);return;}v=-560;snd('tick');}};}
function whack(){let t0=-1,holes=[],score=0,done=false;const cf=Conf();
  const pos=W=>{const P=[];for(let r=0;r<3;r++)for(let k=0;k<3;k++)P.push({x:W/2+(k-1)*210,y:780+r*170});return P;};
  return{start(now){t0=now;score=0;done=false;holes=pos(W0).map(p=>({...p,t:0,up:0,kind:'',hit:0}));},
    draw(c,W,H,now,dt){pill(c,L('🔨 Đập chuột · 20 giây','🔨 Whack-a-mole · 20 sec'),W/2,90,30,'#ff8a3d');if(t0<0){T(c,L('Bấm quay rồi chạm vào chuột','Record, then tap the moles'),W/2,200,28,'#fff');return;}
      const left=Math.max(0,20-(now-t0)/1000);if(left<=0&&!done){done=true;cf.burst(110);snd('win');}
      for(const h of holes){c.fillStyle='rgba(40,25,15,.85)';c.beginPath();c.ellipse(h.x,h.y+40,80,26,0,0,7);c.fill();
        if(!done){h.t-=dt;if(h.t<=0&&!h.up&&Math.random()<dt*1.4){h.up=1;h.t=.9+Math.random()*.6;h.kind=Math.random()<.2?'💣':'🐹';h.hit=0;}else if(h.up&&h.t<=0){h.up=0;h.t=.3;}}
        if(h.up||h.hit>0){const k=h.hit>0?1:Math.min(1,(1.5-h.t)*5);T(c,h.hit>0?'💥':h.kind,h.x,h.y+40-50*k,92,'#fff',{ns:1});if(h.hit>0)h.hit-=dt;}}
      T(c,L('Điểm ','Score ')+score,W/2,200,64,'#fff',{w:900});T(c,'⏱ '+Math.ceil(left),W/2,280,44,left<5?'#ff3b47':'#ffd166',{w:900});
      if(done)T(c,score>=15?L('Thợ săn chuột 🏆','Mole hunter 🏆'):L('Tay hơi chậm 😅','A bit slow 😅'),W/2,H*.42,48,'#c1f354',{w:900});cf.draw(c,W,H,dt);},
    tap(x,y){if(t0<0||done)return;for(const h of holes)if(h.up&&Math.hypot(x-h.x,y-(h.y-10))<90){h.up=0;h.hit=.35;h.t=.4;score+=h.kind==='💣'?-3:1;snd(h.kind==='💣'?'win':'tick');return;}}};}
function tapspeed(){let t0=-1,n=0,done=false,pops=[];const cf=Conf();
  return{start(now){t0=now;n=0;done=false;pops=[];},
    draw(c,W,H,now,dt){pill(c,L('👆 Bấm siêu tốc · 10 giây','👆 Speed tap · 10 sec'),W/2,90,30,'#7df9ff');if(t0<0){T(c,L('Bấm quay rồi chạm liên tục!','Record, then tap like crazy!'),W/2,200,28,'#fff');return;}
      const left=Math.max(0,10-(now-t0)/1000);if(left<=0&&!done){done=true;cf.burst(110);snd('win');}
      T(c,String(n),W/2,260,150,'#fff',{w:900});T(c,'⏱ '+left.toFixed(1),W/2,380,44,left<3?'#ff3b47':'#ffd166',{w:900});
      pops=pops.filter(p=>(p.t+=dt)<.6);for(const p of pops){c.globalAlpha=1-p.t/.6;T(c,'+1',p.x,p.y-p.t*120,48,'#c1f354',{w:900});c.globalAlpha=1;}
      if(done){const r=n/10;T(c,r>=8?L('Ngón tay thần thánh ⚡','God-tier fingers ⚡'):r>=5?L('Nhanh đó nha 💨','Pretty fast 💨'):L('Ngón tay ngủ quên 😴','Sleepy fingers 😴'),W/2,470,44,'#c1f354',{w:900});T(c,(r).toFixed(1)+L(' lần/giây',' taps/sec'),W/2,530,32,'#fff');}
      cf.draw(c,W,H,dt);},
    tap(x,y){if(t0<0||done)return;n++;pops.push({x,y,t:0});if(n%5===0)snd('tick');}};}
/* ---------- meme challenge: five memes, a countdown each, then do it ---------- */
function memes(){let list=[],t0=-1,last=-1;const cf=Conf();let fin=false;
  return{start(now){list=shuffle(MEMES()).slice(0,5);t0=now;last=-1;fin=false;},
    draw(c,W,H,now,dt){pill(c,L('🔥 5 meme · làm theo ngay!','🔥 5 memes · copy them!'),W/2,90,30,'#ff5fa2');
      if(t0<0){T(c,L('Bấm quay, 5 meme sẽ hiện ra','Record and 5 memes will pop up'),W/2,200,28,'#fff');return;}
      const t=(now-t0)/1000,per=5,i=Math.floor(t/per);
      for(let k=0;k<5;k++){c.beginPath();c.arc(W/2-80+k*40,150,12,0,7);c.fillStyle=k<i?'#c1f354':k===i?'#fff':'rgba(255,255,255,.3)';c.fill();}
      if(i>=5){if(!fin){fin=true;cf.burst(130);snd('win');}T(c,L('Hoàn thành 5/5 🎉','All 5 done 🎉'),W/2,320,60,'#c1f354',{w:900});cf.draw(c,W,H,dt);return;}
      const m=list[i],lt=t-i*per;if(i!==last){last=i;snd('ding');}
      const k=back(Math.min(1,lt*3));c.save();c.translate(W/2,300);c.scale(k,k);rr(c,-W*.42,-120,W*.84,250,34);c.fillStyle='rgba(10,12,20,.82)';c.fill();c.lineWidth=5;c.strokeStyle='#ff5fa2';c.stroke();
      T(c,m[0],-W*.42+90,-20,100,'#fff',{ns:1});T(c,m[1],40,-30,m[1].length>12?44:60,'#fff',{w:900,it:1});c.restore();
      T(c,m[2],W/2,470,m[2].length>34?24:28,'#fff',{w:700});
      if(lt<1.5){T(c,String(3-Math.floor(lt*2)),W/2,600,120,'#ffd166',{w:900});}else{const g=Math.sin(now/90)*.06+1;c.save();c.translate(W/2,600);c.scale(g,g);T(c,L('LÀM ĐI!','DO IT!'),0,0,90,'#c1f354',{w:900,it:1});c.restore();
        c.fillStyle='rgba(255,255,255,.3)';rr(c,W/2-200,680,400,12,6);c.fill();c.fillStyle='#c1f354';rr(c,W/2-200,680,400*Math.min(1,(lt-1.5)/(per-1.5)),12,6);c.fill();}
      cf.draw(c,W,H,dt);},tap(){}};}
/* ---------- truth or dare ---------- */
function dare(){let t0=-1,kind=0,txt='',last=-1;const cf=Conf();let shown=false;
  return{start(now){t0=now;kind=Math.random()<.5?0:1;txt=R(kind?DARES():TRUTHS());last=-1;shown=false;},
    draw(c,W,H,now,dt){pill(c,L('😈 Sự thật hay thử thách','😈 Truth or dare'),W/2,90,30,'#ff3b47');
      if(t0<0){T(c,L('Bấm quay · chạm để đổi câu khác','Record · tap for another one'),W/2,200,28,'#fff');return;}
      const t=(now-t0)/1000,ph=Math.floor(t*12);
      if(t<1.6){const k=ph%2;if(ph!==last){last=ph;snd('tick');}pill(c,k?L('THỬ THÁCH','DARE'):L('SỰ THẬT','TRUTH'),W/2,260,64,k?'#ff3b47':'#2f8dff','#fff');}
      else{if(!shown){shown=true;cf.burst(70);snd('win');}pill(c,kind?L('THỬ THÁCH','DARE'):L('SỰ THẬT','TRUTH'),W/2,230,52,kind?'#ff3b47':'#2f8dff','#fff');
        rr(c,40,300,W-80,200,28);c.fillStyle='rgba(10,12,20,.82)';c.fill();c.lineWidth=4;c.strokeStyle=kind?'#ff3b47':'#2f8dff';c.stroke();
        const words=txt.split(' ');let line='',ly=370;const lines=[];for(const w of words){if((line+' '+w).length>26){lines.push(line);line=w;}else line=line?line+' '+w:w;}lines.push(line);
        lines.forEach((l2,j)=>T(c,l2,W/2,ly+j*52-(lines.length-1)*20,40,'#fff',{w:800}));}
      cf.draw(c,W,H,dt);},tap(x,y,now){if(t0>=0&&(now-t0)>1700)this.start(now);}};}
/* ---------- the 15 filters ---------- */
const DEF={
  top10:()=>ranking({n:10,title:()=>L('🏆 Top 10 món ăn ngon nhất','🏆 Top 10 foods of all time'),col:'#ffd166',items:()=>shuffle(FOODS().concat(TREND())),done:()=>L('Top 10 của bạn đây! 🍽️','Here is your top 10! 🍽️')}),
  trend:()=>randomizer({title:()=>L('🔥 Món đang trend hợp với bạn','🔥 Your trending food'),col:'#ff5fa2',col2:'#ffd166',items:TREND,dur:3.6,sub:()=>L('Độ hot: 🔥🔥🔥🔥🔥 · đi ăn liền!','Hype: 🔥🔥🔥🔥🔥 · go eat it now!')}),
  meme5:()=>memes(),
  nexusrank:()=>{const cats=[[L('Ai sẽ giàu nhất?','Who will be the richest?'),'💰'],[L('Ai chơi game giỏi nhất?','Best gamer?'),'🎮'],[L('Ai hay trễ hẹn nhất?','Always late?'),'⏰'],[L('Ai hài hước nhất?','Funniest?'),'😂'],[L('Ai học giỏi nhất?','Smartest?'),'🧠'],[L('Ai dễ thương nhất?','Cutest?'),'🥰']];const cat=R(cats);
    return ranking({n:5,title:()=>L('👥 Xếp hạng bạn Nexus · ','👥 Rank your Nexus friends · ')+cat[0],col:'#a78bfa',items:()=>shuffle(people(5)).slice(0,5).map(p=>[p.friend?'⭐':cat[1],p.name]),done:()=>L('Đã xếp xong bạn bè 👀','Friends ranked 👀')});},
  nexusbff:()=>{const q=R([[L('Ai trên Nexus sẽ là bạn thân của bạn?','Who on Nexus will be your best friend?'),L('Rủ đi trà sữa liền!','Take them out for milk tea!')],[L('Ai sẽ bao bạn trà sữa hôm nay?','Who buys you milk tea today?'),L('Nhắn họ ngay đi 😆','Text them now 😆')],[L('Ai sẽ cùng bạn leo rank tối nay?','Who climbs rank with you tonight?'),L('Mở game thôi! 🎮','Open the game! 🎮')]]);
    return randomizer({title:()=>'👥 '+q[0],col:'#a78bfa',col2:'#7df9ff',items:()=>shuffle(people(6)).slice(0,10).map(p=>[p.friend?'⭐':'🧑',p.name]),dur:3.8,sub:()=>q[1]});},
  score7:()=>randomizer({title:()=>L('📝 Khi nào bạn được 7 điểm?','📝 When will you score a 7?'),col:'#7df9ff',col2:'#c1f354',dur:3.8,
    items:()=>[['📅',L('Tuần sau','Next week')],['🗓️',L('Kỳ thi tới','Next exam')],['⏳',L('Năm sau','Next year')],['🌙',L('Trong mơ','In your dreams')],['🍀',L('Ngày mai luôn','Tomorrow!')],['📚',L('Khi chịu học bài','When you study')],['😭',L('Không bao giờ','Never')],['🔥',L('Sắp rồi đó','Very soon')]],
    sub:it=>it[0]==='😭'?L('Đùa thôi, học đi nha 😂','Just kidding, go study 😂'):L('Cố lên! 💪','You got this! 💪')}),
  bo:()=>randomizer({title:()=>L('💞 Khi nào bạn có bồ?','💞 When will you get a partner?'),col:'#ff5fa2',col2:'#ffb3d1',dur:3.8,
    items:()=>[['📅',L('Tháng sau','Next month')],['🌸',L('Mùa xuân năm sau','Next spring')],['🕐',L('Ngày mai','Tomorrow')],['👀',L('Có rồi mà giấu','Already have one 👀')],['🎓',L('Khi ra trường','After graduation')],['💍',L('Năm 30 tuổi','At 30')],['🐶',L('Lấy chó làm bồ','Your dog counts')],['🚫',L('Chưa có cửa','Not a chance')]],sub:()=>L('Tag người đó vào đi 👀','Tag them 👀')}),
  dare:()=>dare(),
  flappy:()=>flappy(),
  whack:()=>whack(),
  tapspeed:()=>tapspeed(),
  gamer:()=>randomizer({title:()=>L('🎮 Bạn là game thủ hạng gì?','🎮 What gamer rank are you?'),col:'#7df9ff',col2:'#a78bfa',
    items:()=>[['🥉',L('Đồng','Bronze')],['🥈',L('Bạc','Silver')],['🥇',L('Vàng','Gold')],['💠',L('Bạch kim','Platinum')],['💎',L('Kim cương','Diamond')],['👑',L('Cao thủ','Master')],['🔥',L('Thách đấu','Challenger')],['🐢',L('Gà mờ','Noob')]],
    sub:it=>it[1]===L('Gà mờ','Noob')?L('Về luyện thêm nha 😂','Go practise 😂'):L('GG WP!','GG WP!')}),
  hud:()=>{let t0=-1,lv=1,pops=[],hp=1,mp=.7,xp=0,lvT=-9,combo=0,cmT=-9;const cf=Conf();
    return{start(now){t0=now;lv=1;pops=[];hp=1;mp=.7;xp=0;lvT=-9;combo=0;},
      draw(c,W,H,now,dt){const t=t0<0?now/1000:(now-t0)/1000;
        const bar=(x,y,w,v,a,b,lab)=>{rr(c,x,y,w,26,13);c.fillStyle='rgba(0,0,0,.6)';c.fill();rr(c,x+3,y+3,(w-6)*v,20,10);c.fillStyle=grad(c,x,0,x+w,0,a,b);c.fill();T(c,lab,x+12,y+13,16,'#fff',{al:'left',w:800});};
        rr(c,30,40,96,96,48);c.fillStyle='#111';c.fill();c.lineWidth=5;c.strokeStyle='#ffd166';c.stroke();T(c,'Lv '+lv,78,88,26,'#ffd166',{w:900});
        if(t0>=0){hp=.55+.45*(Math.sin(t*.9)*.5+.5);mp=.4+.5*(Math.sin(t*1.7+1)*.5+.5);xp+=dt*.22;if(Math.random()<dt*1.2){pops.push({x:120+Math.random()*(W-240),y:H*.45+Math.random()*200,t:0,s:R(['+100 XP','+50 XP','CRIT!','+250 XP','HEADSHOT'])});snd('tick');}
          if(Math.random()<dt*.9){combo++;cmT=t;}}
        bar(140,46,330,hp,'#ff3b47','#ff8a8a','HP');bar(140,84,280,mp,'#2f8dff','#7df9ff','MP');
        rr(c,W-170,40,140,140,70);c.fillStyle='rgba(0,0,0,.55)';c.fill();c.lineWidth=4;c.strokeStyle='#fff';c.stroke();c.fillStyle='#ff3b47';c.beginPath();c.arc(W-100+Math.sin(t*1.3)*30,110+Math.cos(t)*28,7,0,7);c.fill();c.fillStyle='#c1f354';c.beginPath();c.moveTo(W-100,96);c.lineTo(W-90,122);c.lineTo(W-110,122);c.fill();
        if(xp>=1){xp=0;lv++;lvT=t;cf.burst(90);snd('win');}
        rr(c,60,H-210,W-120,18,9);c.fillStyle='rgba(0,0,0,.6)';c.fill();rr(c,62,H-208,(W-124)*xp,14,7);c.fillStyle='#c1f354';c.fill();T(c,'XP',60,H-235,20,'#c1f354',{al:'left'});
        pops=pops.filter(p=>(p.t+=dt)<1.2);for(const p of pops){c.globalAlpha=1-p.t/1.2;T(c,p.s,p.x,p.y-p.t*90,38,p.s.includes('CRIT')||p.s.includes('HEAD')?'#ff3b47':'#ffd166',{w:900,it:1});c.globalAlpha=1;}
        if(t-cmT<1.4&&combo>1){T(c,combo+'x COMBO',W/2,H*.34,58,'#7df9ff',{w:900,it:1});}
        if(t-lvT<2){const k=back((t-lvT)*2.5);c.save();c.translate(W/2,H*.22);c.scale(k,k);T(c,'LEVEL UP!',0,0,96,'#ffd166',{w:900,it:1});c.restore();}
        if(t0<0)T(c,L('Bấm quay để vào trận','Press record to start the match'),W/2,H*.22,32,'#fff');cf.draw(c,W,H,dt);},tap(){}};},
  quiz:()=>{let t0=-1,q=null;const cf=Conf();let rev=false;
    return{start(now){q=R(QUIZ());t0=now;rev=false;},
      draw(c,W,H,now,dt){pill(c,L('❓ Đố vui 5 giây','❓ 5-second quiz'),W/2,90,32,'#7df9ff');if(!q){T(c,L('Bấm quay để nhận câu hỏi','Press record for a question'),W/2,200,32,'#fff');return;}
        const t=(now-t0)/1000,left=Math.max(0,5-t);if(left<=0&&!rev){rev=true;snd('win');cf.burst(60);}
        rr(c,40,150,W-80,140,28);c.fillStyle='rgba(10,12,20,.8)';c.fill();T(c,q[0],W/2,220,q[0].length>24?34:42,'#fff',{w:800});
        for(let i=0;i<4;i++){const x=40+(i%2)*((W-100)/2+20),y=320+Math.floor(i/2)*110,w=(W-100)/2;rr(c,x,y,w,90,22);c.fillStyle=rev?(i===q[2]?'#2fd47a':'rgba(120,20,30,.75)'):'rgba(10,12,20,.75)';c.fill();c.lineWidth=3;c.strokeStyle='#fff';c.stroke();T(c,'ABCD'[i]+'. '+q[1][i],x+w/2,y+46,q[1][i].length>12?24:30,'#fff');}
        const cx=W/2,cy=580;c.beginPath();c.arc(cx,cy,52,0,7);c.fillStyle='rgba(0,0,0,.65)';c.fill();c.beginPath();c.arc(cx,cy,52,-Math.PI/2,-Math.PI/2+Math.PI*2*(left/5));c.lineWidth=10;c.strokeStyle=left<2?'#ff3b47':'#7df9ff';c.stroke();
        T(c,rev?'✓':String(Math.ceil(left)),cx,cy+2,52,'#fff',{w:900});if(!rev&&Math.ceil(left)!==Math.ceil(left+dt))snd('tick');cf.draw(c,W,H,dt);},tap(){}};},
  nolaugh:()=>{let t0=-1,em=[],lastS=-1;
    return{start(now){t0=now;em=[];lastS=-1;},
      draw(c,W,H,now,dt){pill(c,L('😐 Thử thách nhịn cười','😐 Try not to laugh'),W/2,90,32,'#ffd166');
        if(t0<0){T(c,L('Bấm quay, nhịn cười 10 giây!','Record and hold it in for 10 seconds!'),W/2,200,30,'#fff');return;}
        const t=(now-t0)/1000,left=Math.max(0,10-t),s=Math.ceil(left);if(s!==lastS){lastS=s;snd(s===0?'win':'tick');}
        if(left>0){T(c,String(s),W/2,250,150,s<=3?'#ff3b47':'#fff',{w:900});T(c,L('ĐỪNG CƯỜI!','DO NOT LAUGH!'),W/2,370,54,'#ffd166',{w:900,it:1});
          if(Math.random()<dt*2.5)em.push({x:80+Math.random()*(W-160),y:H*.5+Math.random()*H*.3,t:0,e:R(['🤣','😂','🙃','🤪','🐸','🦆','💀','🍌'])});}
        else T(c,L('Bạn có cười không? 😂','Did you laugh? 😂'),W/2,260,56,'#c1f354',{w:900});
        em=em.filter(p=>(p.t+=dt)<1.6);for(const p of em){const k=back(Math.min(1,p.t*3));c.save();c.globalAlpha=Math.min(1,(1.6-p.t)*2);c.translate(p.x,p.y-p.t*40);c.scale(k,k);T(c,p.e,0,0,90,'#fff',{ns:1});c.restore();}},tap(){}};}};
let W0=720;
const LIST=()=>[['top10','🏆',L('Top 10 món ăn','Top 10 foods')],['trend','🔥',L('Món đang trend','Trending food')],['meme5','🤲',L('5 meme làm theo','5 meme challenge')],['nexusrank','👥',L('Xếp hạng bạn Nexus','Rank Nexus friends')],['nexusbff','🫶',L('Bạn thân trên Nexus','Nexus bestie')],
  ['score7','📝',L('Khi nào được 7 điểm?','When do I score 7?')],['bo','💞',L('Khi nào có bồ?','When do I get a partner?')],['dare','😈',L('Sự thật hay thử thách','Truth or dare')],['flappy','🐤',L('Game: Bay qua ống','Game: Flappy')],['whack','🔨',L('Game: Đập chuột','Game: Whack-a-mole')],
  ['tapspeed','👆',L('Game: Bấm siêu tốc','Game: Speed tap')],['hud','🕹️',L('Màn hình game','Game HUD')],['gamer','🎮',L('Rank game thủ','Gamer rank')],['quiz','❓',L('Đố vui 5 giây','5-second quiz')],['nolaugh','😐',L('Nhịn cười','Try not to laugh')]].map(([id,e,n])=>({id,e,n}));
window.LoopyFX={get list(){return LIST();},set people(a){PEOPLE=(a||[]).slice(0,60);},make(id){const f=DEF[id];return f?f():null;},onSound(fn){snd=fn||(()=>{});},set width(w){W0=w;}};
})();
