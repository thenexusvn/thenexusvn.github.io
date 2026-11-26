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
const FOODS=()=>[['🍜',L('Phở bò','Beef pho')],['🥖',L('Bánh mì','Banh mi')],['🍚',L('Cơm tấm','Broken rice')],['🥢',L('Bún chả','Bun cha')],['🍲',L('Lẩu thái','Thai hotpot')],['🧋',L('Trà sữa','Milk tea')],['🍕',L('Pizza','Pizza')],['🍔',L('Burger','Burger')],['🍣',L('Sushi','Sushi')],['🌮',L('Taco','Taco')],['🍗',L('Gà rán','Fried chicken')],['🥗',L('Salad','Salad')],['🍝',L('Mì Ý','Spaghetti')],['🍦',L('Kem','Ice cream')],['🦐',L('Bánh xèo','Banh xeo')],['🥟',L('Há cảo','Dumplings')]];
const QUIZ=()=>[[L('Thủ đô của Úc là?','Capital of Australia?'),['Sydney','Canberra','Melbourne','Perth'],1],[L('Hành tinh lớn nhất?','Largest planet?'),[L('Sao Hỏa','Mars'),L('Trái Đất','Earth'),L('Sao Mộc','Jupiter'),L('Sao Kim','Venus')],2],
  [L('Nước sôi ở bao nhiêu độ C?','Water boils at (°C)?'),['90','100','120','80'],1],[L('Con vật nhanh nhất trên cạn?','Fastest land animal?'),[L('Ngựa','Horse'),L('Báo săn','Cheetah'),L('Sư tử','Lion'),L('Thỏ','Rabbit')],1],
  [L('1 năm có bao nhiêu tuần?','Weeks in a year?'),['48','50','52','54'],2],[L('Ai vẽ Mona Lisa?','Who painted the Mona Lisa?'),['Picasso','Van Gogh','Da Vinci','Monet'],2],
  [L('Đại dương lớn nhất?','Largest ocean?'),[L('Đại Tây Dương','Atlantic'),L('Ấn Độ Dương','Indian'),L('Thái Bình Dương','Pacific'),L('Bắc Băng Dương','Arctic')],2],
  [L('Kim loại nào ở thể lỏng?','Which metal is liquid?'),[L('Sắt','Iron'),L('Thủy ngân','Mercury'),L('Đồng','Copper'),L('Vàng','Gold')],1],[L('Bao nhiêu chân có con nhện?','How many legs does a spider have?'),['6','8','10','12'],1],
  [L('Núi cao nhất thế giới?','Tallest mountain?'),['K2','Everest','Fansipan','Kilimanjaro'],1],[L('7 x 8 = ?','7 x 8 = ?'),['54','56','58','64'],1],[L('Quốc gia có hình chữ S?','Which country is S-shaped?'),[L('Thái Lan','Thailand'),L('Việt Nam','Vietnam'),L('Lào','Laos'),L('Nhật Bản','Japan')],1]];
/* ---------- the 15 filters ---------- */
const DEF={
  food:()=>randomizer({title:()=>L('🍽️ Chấm điểm món ăn','🍽️ Rate this food'),col:'#ffd166',col2:'#ff8a3d',items:()=>Array.from({length:10},(_,i)=>{const s=i+1;return['⭐',s+'/10'];}),
    sub:it=>{const s=parseInt(it[1]);return '★★★★★'.slice(0,Math.ceil(s/2))+'☆☆☆☆☆'.slice(0,5-Math.ceil(s/2))+'  '+(s>=9?L('Ngon xỉu 🤤','Insanely good 🤤'):s>=7?L('Ngon nha 😋','Pretty tasty 😋'):s>=5?L('Tạm được 🙂','It is okay 🙂'):s>=3?L('Hơi dở 😬','Kinda bad 😬'):L('Thôi khỏi 🤢','Nope 🤢'));}}),
  rank:()=>{let items=[],cur=0,slots=[null,null,null,null,null],t0=-1,doneT=-1;const cf=Conf();
    return{start(now){items=shuffle(FOODS()).slice(0,5);cur=0;slots=[null,null,null,null,null];t0=now;doneT=-1;},
      draw(c,W,H,now,dt){pill(c,L('🏆 Xếp hạng món ăn','🏆 Rank the food'),W/2,90,32,'#c1f354');
        const sx=W-250,sy=200;for(let i=0;i<5;i++){const y=sy+i*118;rr(c,sx,y,220,98,22);c.fillStyle=slots[i]?'rgba(193,243,84,.9)':'rgba(10,12,20,.7)';c.fill();c.lineWidth=3;c.strokeStyle='#fff';c.stroke();
          T(c,String(i+1),sx+36,y+50,44,slots[i]?'#111':'#fff',{ns:!!slots[i],w:900});if(slots[i]){T(c,slots[i][0],sx+100,y+50,52,'#fff',{ns:1});T(c,slots[i][1],sx+150,y+50,22,'#111',{ns:1,al:'left',w:700});}}
        if(t0<0){T(c,L('Bấm quay rồi chạm số để xếp','Record, then tap a number to place'),W/2-110,190,26,'#fff');return;}
        if(cur<items.length){const it=items[cur],bob=Math.sin(now/220)*8;rr(c,40,180+bob,W-340,170,30);c.fillStyle='rgba(10,12,20,.78)';c.fill();c.lineWidth=4;c.strokeStyle='#ffd166';c.stroke();
          T(c,it[0],130,265+bob,90,'#fff',{ns:1});T(c,it[1],W/2-90,265+bob,it[1].length>10?38:48,'#fff',{al:'center'});T(c,L('Chạm số 1–5 bên phải','Tap a number 1–5 on the right'),W/2-110,395,24,'#fff');}
        else{if(doneT<0){doneT=now;cf.burst(110);snd('win');}T(c,L('Bảng xếp hạng của bạn!','Your ranking!'),W/2-110,260,44,'#c1f354',{w:900});}
        cf.draw(c,W,H,dt);},
      tap(x,y){if(t0<0||cur>=items.length)return;const sx=W0-250,sy=200;if(x<sx||x>sx+220)return;const i=Math.floor((y-sy)/118);if(i<0||i>4||slots[i])return;slots[i]=items[cur++];snd(cur>=items.length?'ding':'tick');}};},
  eat:()=>randomizer({title:()=>L('🍲 Hôm nay ăn gì?','🍲 What should I eat today?'),col:'#ff8a3d',col2:'#ffd166',items:FOODS,sub:()=>L('Đi ăn liền thôi!','Let us go eat!')}),
  gamer:()=>randomizer({title:()=>L('🎮 Bạn là game thủ hạng gì?','🎮 What gamer rank are you?'),col:'#7df9ff',col2:'#a78bfa',
    items:()=>[['🥉',L('Đồng','Bronze')],['🥈',L('Bạc','Silver')],['🥇',L('Vàng','Gold')],['💠',L('Bạch kim','Platinum')],['💎',L('Kim cương','Diamond')],['👑',L('Cao thủ','Master')],['🔥',L('Thách đấu','Challenger')],['🐢',L('Gà mờ','Noob')]],
    sub:it=>it[1]===L('Gà mờ','Noob')?L('Về luyện thêm nha 😂','Go practise 😂'):L('GG WP!','GG WP!')}),
  hero:()=>randomizer({title:()=>L('⚔️ Bạn là tướng nào?','⚔️ Which hero are you?'),col:'#ff5fa2',col2:'#ffd166',
    items:()=>[['🗡️',L('Sát thủ','Assassin')],['🛡️',L('Đỡ đòn','Tank')],['🔮',L('Pháp sư','Mage')],['🏹',L('Xạ thủ','Marksman')],['✨',L('Hỗ trợ','Support')],['🪓',L('Đấu sĩ','Fighter')],['🐉',L('Rồng thần','Dragon')],['🧙',L('Phù thủy','Wizard')]],sub:()=>L('Gánh team giùm cái!','Carry the team!')}),
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
  wheel:()=>{let t0=-1,target=0,last=-1;const cf=Conf();let done=false;
    const segs=()=>[L('Hát 1 câu','Sing a line'),L('Nhảy 5 giây','Dance 5 sec'),L('Giả giọng mèo','Meow voice'),L('Kể chuyện cười','Tell a joke'),L('Làm mặt xấu','Ugly face'),L('Nói ngược','Talk backwards'),L('Tạo dáng ngầu','Cool pose'),L('Cười 10 giây','Laugh 10 sec')];
    const cols=['#ff5fa2','#ffd166','#7df9ff','#c1f354','#ff8a3d','#a78bfa','#2fd47a','#ff3b47'];
    return{start(now){t0=now;target=Math.random()*8|0;done=false;last=-1;},
      draw(c,W,H,now,dt){const cx=W/2,cy=H*.24,r=190,S=segs(),n=S.length;pill(c,L('🎡 Vòng quay thử thách','🎡 Challenge wheel'),cx,cy-r-50,32,'#ffd166');
        let a=0;if(t0>=0){const t=(now-t0)/1000,k=Math.min(1,t/4.2);const end=Math.PI*2*6-(target+.5)*Math.PI*2/n;a=end*ease(k);const seg=Math.floor(((a/(Math.PI*2/n))%n+n)%n);if(seg!==last&&k<1){last=seg;snd('tick');}if(k>=1&&!done){done=true;cf.burst(90);snd('win');}}
        c.save();c.translate(cx,cy);c.rotate(a-Math.PI/2);for(let i=0;i<n;i++){c.beginPath();c.moveTo(0,0);c.arc(0,0,r,i*Math.PI*2/n,(i+1)*Math.PI*2/n);c.closePath();c.fillStyle=cols[i];c.fill();c.lineWidth=3;c.strokeStyle='#111';c.stroke();
          c.save();c.rotate((i+.5)*Math.PI*2/n);T(c,S[i],r*.58,0,20,'#111',{ns:1,w:900});c.restore();}c.restore();
        c.beginPath();c.arc(cx,cy,26,0,7);c.fillStyle='#fff';c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(cx-18,cy-r-6);c.lineTo(cx+18,cy-r-6);c.lineTo(cx,cy-r+30);c.fill();
        if(done)T(c,'👉 '+S[target],cx,cy+r+60,48,'#ffd166',{w:900});else if(t0<0)T(c,L('Bấm quay để quay bánh xe','Press record to spin'),cx,cy+r+60,30,'#fff');cf.draw(c,W,H,dt);},tap(){}};},
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
        em=em.filter(p=>(p.t+=dt)<1.6);for(const p of em){const k=back(Math.min(1,p.t*3));c.save();c.globalAlpha=Math.min(1,(1.6-p.t)*2);c.translate(p.x,p.y-p.t*40);c.scale(k,k);T(c,p.e,0,0,90,'#fff',{ns:1});c.restore();}},tap(){}};},
  cool:()=>meter({title:()=>L('😎 Đo độ ngầu','😎 Cool-o-meter'),icon:'😎',col:'#7df9ff',col2:'#a78bfa',verdict:v=>v>=90?L('Ngầu hết nấc!','Off the charts!'):v>=70?L('Ngầu đét','Seriously cool'):v>=50?L('Cũng ngầu đó','Kinda cool'):L('Ngầu... từ từ','Cool... eventually')}),
  love:()=>meter({title:()=>L('💘 Bói tình yêu','💘 Love match'),icon:'💘',col:'#ff5fa2',col2:'#ff3b47',verdict:v=>v>=90?L('Định mệnh rồi!','Soulmates!'):v>=70?L('Hợp nhau phết','A great match'):v>=50?L('Có hy vọng','There is hope'):L('Làm bạn thôi 😅','Just friends 😅')}),
  animal:()=>randomizer({title:()=>L('🐾 Bạn giống con vật nào?','🐾 Which animal are you?'),col:'#2fd47a',col2:'#c1f354',
    items:()=>[['🐶',L('Cún con','Puppy')],['🐱',L('Mèo lười','Lazy cat')],['🦊',L('Cáo tinh ranh','Sly fox')],['🐼',L('Gấu trúc','Panda')],['🦁',L('Sư tử','Lion')],['🐸',L('Ếch','Frog')],['🐧',L('Chim cánh cụt','Penguin')],['🦥',L('Con lười','Sloth')],['🐹',L('Chuột hamster','Hamster')],['🦄',L('Kỳ lân','Unicorn')]]}),
  job:()=>randomizer({title:()=>L('💼 Năm 30 tuổi bạn làm nghề gì?','💼 Your job at 30?'),col:'#a78bfa',col2:'#7df9ff',
    items:()=>[['👨‍🚀',L('Phi hành gia','Astronaut')],['🧑‍🍳',L('Đầu bếp','Chef')],['🎤',L('Ca sĩ','Singer')],['🧑‍💻',L('Lập trình viên','Programmer')],['🎮',L('Streamer','Streamer')],['👩‍⚕️',L('Bác sĩ','Doctor')],['💰',L('Tỷ phú','Billionaire')],['🕵️',L('Thám tử','Detective')],['🎬',L('Diễn viên','Actor')],['🛵',L('Shipper','Delivery rider')]]}),
  hearts:()=>{let P=[];return{start(){},draw(c,W,H,now,dt){if(Math.random()<dt*9)P.push({x:Math.random()*W,y:-40,v:120+Math.random()*160,s:40+Math.random()*50,r:Math.random()*6,w:Math.random()*2+1,e:R(['❤️','💖','💕','💗','💘'])});
      P=P.filter(p=>p.y<H+60);for(const p of P){p.y+=p.v*dt;p.r+=dt;c.save();c.translate(p.x+Math.sin(p.r*p.w)*30,p.y);c.rotate(Math.sin(p.r)*.3);T(c,p.e,0,0,p.s,'#fff',{ns:1});c.restore();}
      c.save();c.globalAlpha=.85;T(c,L('Thương lắm 💗','Love you 💗'),W/2,H*.14,64,'#ff9fc8',{w:900,it:1});c.restore();},tap(){}};},
  crown:()=>{let S=[];return{start(){},draw(c,W,H,now,dt){const t=now/1000,cx=W/2,y=H*.15+Math.sin(t*2)*10;
      c.save();c.translate(cx,y);c.rotate(Math.sin(t*1.3)*.06);c.shadowColor='#ffd166';c.shadowBlur=40;T(c,'👑',0,0,190,'#fff',{ns:1});c.restore();
      if(Math.random()<dt*14)S.push({x:cx+(Math.random()-.5)*360,y:y+(Math.random()-.5)*160,t:0});S=S.filter(s=>(s.t+=dt)<.9);
      for(const s of S){const k=Math.sin(s.t/.9*Math.PI),r=14*k;c.save();c.translate(s.x,s.y);c.fillStyle='#fff8d0';c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr2=i%2?r*.3:r;c.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}c.fill();c.restore();}
      T(c,L('Vua của ngày hôm nay','Royalty of the day'),cx,y+140,44,'#ffd166',{w:900,it:1});},tap(){}};}};
let W0=720;
const LIST=()=>[['food','🍽️',L('Chấm điểm món ăn','Rate the food')],['rank','🏆',L('Xếp hạng món ăn','Food ranking')],['eat','🍲',L('Hôm nay ăn gì?','What to eat?')],['gamer','🎮',L('Rank game thủ','Gamer rank')],['hero','⚔️',L('Bạn là tướng nào?','Which hero?')],
  ['hud','🕹️',L('Màn hình game','Game HUD')],['wheel','🎡',L('Vòng quay thử thách','Challenge wheel')],['quiz','❓',L('Đố vui 5 giây','5-second quiz')],['nolaugh','😐',L('Nhịn cười','Try not to laugh')],['cool','😎',L('Đo độ ngầu','Cool-o-meter')],
  ['love','💘',L('Bói tình yêu','Love match')],['animal','🐾',L('Bạn là con gì?','Which animal?')],['job','💼',L('Nghề năm 30 tuổi','Job at 30')],['hearts','❤️',L('Mưa tim','Heart rain')],['crown','👑',L('Vương miện','Crown')]].map(([id,e,n])=>({id,e,n}));
window.LoopyFX={get list(){return LIST();},make(id){const f=DEF[id];return f?f():null;},onSound(fn){snd=fn||(()=>{});},set width(w){W0=w;}};
})();
