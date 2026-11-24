import sys
sp, out = sys.argv[1], sys.argv[2]
s = ''.join(open(sp + '/lz%d.js' % i, encoding='utf-8').read() for i in (1, 2, 3, 4))
def rep(old, new):
    global s
    assert old in s, 'missing: ' + old[:80]
    s = s.replace(old, new, 1)
# minimap: one transform, rotate so the camera's forward points up
a = s.index('function drawMini(){'); b = s.index('let marker=null;')
s = s[:a] + r"""function drawMini(){const c=mctx,W=380,s=2.6,px=P.car?P.car.x:P.x,pz=P.car?P.car.z:P.z;c.fillStyle='#163c4a';c.fillRect(0,0,W,W);c.save();c.translate(W/2,W/2);c.rotate(cam.yaw+Math.PI);c.scale(s,s);c.translate(-px,-pz);c.drawImage(mapBg,-HM,-HM,MAP,MAP);
  if(zone.phase>=0){c.lineWidth=2/s;c.strokeStyle='rgba(120,170,255,.95)';c.beginPath();c.arc(zone.cx,zone.cz,zone.r,0,7);c.stroke();c.strokeStyle='#fff';c.setLineDash([4/s,4/s]);c.beginPath();c.arc(zone.tcx,zone.tcz,zone.tr,0,7);c.stroke();c.setLineDash([]);}
  if(plane.on&&(P.state==='plane'||P.state==='fall')){c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.5/s;c.beginPath();c.moveTo(plane.x0,plane.z0);c.lineTo(plane.x1,plane.z1);c.stroke();}
  for(const v of cars)if(v.hp>0){c.fillStyle='#ffd166';c.fillRect(v.x-1.5,v.z-1.5,3,3);}
  if(marker){c.fillStyle='#ffcf3d';c.beginPath();c.arc(marker.x,marker.z,3,0,7);c.fill();}
  c.restore();c.save();c.translate(W/2,W/2);c.rotate(cam.yaw-(P.car?P.car.h:P.h));c.fillStyle='#c1f354';c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.moveTo(0,-11);c.lineTo(8,9);c.lineTo(0,4);c.lineTo(-8,9);c.closePath();c.fill();c.stroke();c.restore();}
""" + s[b:]
rep("let best=null,bd=mode.view;const eye=_v1.set(b.x,b.y+1.6,b.z);", "let best=null,bd=mode.view;const eye={x:b.x,y:b.y+1.6,z:b.z};")
rep("if(d.k==='gun'){const gg=gunGeos(d.w);g=buildVC(", "if(d.k==='gun'){g=buildVC(")
open(out, 'w', encoding='utf-8', newline='').write(s)
print(len(s))
