import sys, json
p = sys.argv[1]
s = open(p, encoding='utf-8', newline='').read()
D = {
"19 bot, bắn chậm, bo co từ từ":"19 bots, slow aim, slow zone","29 bot, cân bằng":"29 bots, balanced","39 bot, ngắm tốt hơn, bo nhanh":"39 bots, better aim, faster zone","49 bot có súng ngay khi đáp, bo rất nhanh":"49 bots armed on landing, very fast zone",
"7 khu vực, rừng, đồi, bãi biển và bo thu hẹp 7 lần. Nhảy dù, nhặt đồ, sống sót tới cuối.":"7 areas, forests, hills, beaches and a zone that shrinks 7 times. Drop in, loot up, survive to the end.",
"Bo sắp xuất hiện":"Zone appearing soon","Bo xanh co lại theo thời gian, ở ngoài sẽ mất máu. Nhà, nhà kho và container có nhiều đồ. Áo giáp và mũ giảm sát thương tới khi hỏng.":"The blue zone shrinks over time and hurts you outside it. Houses, warehouses and containers hold lots of loot. Vests and helmets reduce damage until they break.",
"Bo đang thu hẹp!":"The zone is shrinking!","Bung dù sớm · W để lao nhanh":"Open your chute early · W to dive faster","Băng gạc":"Bandage","Băng gạc chỉ hồi tới 75 máu":"Bandages only heal up to 75 HP",
"Bạn chưa có skin nào. Mua ở Cửa hàng skin, hoặc dùng súng mặc định.":"You have no skins yet. Buy some in the Skin shop or use the default guns.","Bấm vào bản đồ để đánh dấu · M để đóng":"Click the map to place a marker · M to close","BẮT ĐẦU":"START","Bắn":"Fire","Bắn tỉa L96":"L96 sniper",
"Cao (bóng đổ, cỏ dày)":"High (shadows, thick grass)","Chơi tiếp":"Play again","Chế độ":"Mode","Click vào màn hình để điều khiển bằng chuột":"Click the screen to control with the mouse","Cài đặt":"Settings","Cách chơi":"How to play","Còn sống":"Alive","Cảng Cũ":"Old Harbor","Cấp":"Level",
"Cổng thanh toán chưa được kết nối. Chơi để nhận kim cương miễn phí.":"The payment gateway is not connected. Play matches to earn free diamonds.","Cửa hàng skin":"Skin shop","Dùng":"Equip","Dễ":"Easy","Gỗ Cổ":"Old Wood","H để hồi máu":"H to heal","Hiếm":"Rare","Hoàng Kim":"Gold","Huyền thoại":"Legendary",
"Hạ":"Kills","Hạ gục":"Kills","Hồi":"Heal","Hộp cứu thương":"Medkit","Kho súng":"Armory","Khu Mỏ":"The Mine","Khó":"Hard","Không có đồ hồi máu":"No healing items","Không đủ kim cương":"Not enough diamonds","Kim cương":"Diamonds",
"Kim cương dùng để mua skin súng. Bạn cũng nhận kim cương miễn phí khi chơi: Top 1 được 100, mỗi lần hạ gục được 5.":"Diamonds buy gun skins. You also earn them for free by playing: 100 for a Top 1, 5 for every kill.",
"Kẹo Ngọt":"Candy","Làng Chài":"Fishing Village","Lên xe":"Get in","Lưu":"Save","Máu đã đầy":"Health is full","Máy bay đang bay qua đảo. Bấm Space để nhảy.":"The plane is crossing the island. Press Space to jump.",
"Mũ cấp 1":"Helmet lv1","Mũ cấp 2":"Helmet lv2","Mũ cấp 3":"Helmet lv3","Mặc định":"Default","Mẹo:":"Tips:","Mục tiêu:":"Goal:","Neon Đêm":"Night Neon","Ngân Hà":"Galaxy","Ngắm":"Aim","Ngồi":"Crouch","Nhà Máy":"The Factory","Nhảy":"Jump","Nhảy khỏi máy bay":"Jump out of the plane",
"Nhảy khỏi máy bay, nhặt súng và giáp, ở trong bo và là người cuối cùng còn trụ lại.":"Jump out of the plane, grab guns and armor, stay in the zone and be the last one standing.","Nhặt":"Pick up","Nạp":"Reload","Nạp kim cương":"Top up diamonds",
"Rồng Lửa":"Fire Dragon","Rừng Rậm":"Jungle","Sa Mạc":"Desert","Sát thương":"Damage","Súng lục G9":"G9 pistol","Súng trường AR-7":"AR-7 rifle","Súng trường K47":"K47 rifle","Sống sót":"Survived","Sợi Carbon":"Carbon Fiber","Sử thi":"Epic","Tay không":"Unarmed","Thường":"Normal","Thấp (máy yếu, điện thoại)":"Low (older devices, phones)",
"Thần thoại":"Mythic","Tiểu liên V10":"V10 SMG","Trường Bắn":"Firing Range","Trạm Radar":"Radar Station","Trận":"Matches","Tên trong trận":"In-match name","Tìm súng trong nhà, kho, container":"Find guns in houses, warehouses, containers","Tặng thêm 10%":"10% bonus","Về sảnh":"Back to lobby","Vừa":"Medium",
"WASD di chuyển · Chuột nhìn · Click trái bắn · Click phải ngắm · Shift chạy · Space nhảy, bung dù · C ngồi · R nạp đạn · E nhặt đồ · F lên xe, xuống xe · H hồi máu · 1 2 3 đổi súng · M bản đồ":"WASD move · Mouse look · Left click fire · Right click aim · Shift sprint · Space jump, open chute · C crouch · R reload · E pick up · F enter/exit vehicle · H heal · 1 2 3 switch guns · M map",
"Xuống xe · W/S lái · Space phanh":"Get out · W/S drive · Space brake","· Bạn ở ngoài bo!":"· You are outside the zone!","Ác mộng":"Nightmare","Áo giáp cấp 1":"Vest lv1","Áo giáp cấp 2":"Vest lv2","Áo giáp cấp 3":"Vest lv3","Đang băng bó":"Bandaging","Đang dùng":"Equipped","Đang dùng hộp cứu thương":"Using medkit","Đang nạp đạn":"Reloading",
"Đang tìm trận...":"Finding a match...","Điều khiển:":"Controls:","Đã lưu. Thoát và mở lại game để đổi đồ hoạ.":"Saved. Exit and reopen the game to change graphics.","Đã nhảy! Bấm Space để bung dù sớm.":"You jumped! Press Space to open your chute early.","Đạn nhẹ":"Light ammo","Đạn nặng":"Heavy ammo","Đạn shotgun":"Shotgun shells","Đạn vừa":"Medium ammo",
"Đảo Ngọc Lam":"Jade Island","Đồ hoạ":"Graphics","Đồi Thông":"Pine Hill","Đổi mức đồ hoạ cần mở lại game để áp dụng hết.":"Reopen the game to fully apply a graphics change.","Độ nhạy chuột:":"Mouse sensitivity:","Bạc":"Silver","Băng Giá":"Frost","Bóng Đêm":"Nightfall","Dung Nham":"Lava",
"Mới · Sinh tồn 3D":"New · 3D survival","Nhảy dù xuống đảo, nhặt súng và giáp, lái xe, chạy bo và hạ hết bot để giành Top 1. 4 chế độ từ Dễ tới Ác mộng, sảnh chờ, skin súng.":"Parachute onto the island, grab guns and armor, drive, outrun the zone and take out every bot for the Top 1. 4 modes from Easy to Nightmare, a lobby and gun skins.",
"Chưa chơi trận nào":"No matches played yet","Vào sảnh":"Enter lobby","Thế giới mở 3D":"3D open world","Sinh tồn 3D · Bạn và tới 49 bot":"3D survival · You vs up to 49 bots","Đang dựng đảo, chờ vài giây...":"Building the island, give it a few seconds...","Ảnh bìa Last Zone":"Last Zone cover",
"Chiến thắng! Bạn là người cuối cùng còn trụ lại.":"Victory! You are the last one standing.","Shotgun S12":"S12 shotgun"}
R = r"""[/^Bo thu hẹp sau (\d+)s$/,m=>'Zone shrinks in '+m[1]+'s'],[/^Bo đang thu hẹp · (\d+)s$/,m=>'Zone shrinking · '+m[1]+'s'],[/^Băng gạc (\d+)$/,m=>'Bandages '+m[1]],[/^Cứu thương (\d+)$/,m=>'Medkits '+m[1]],
[/^Giáp (.+)$/,m=>'Vest '+m[1].replace(/^C/,'L')],[/^Mũ (.+)$/,m=>'Helmet '+m[1].replace(/^C/,'L')],[/^Nhặt (.+)$/,m=>'Pick up '+t(m[1])],[/^(.+) · còn (\d+)$/,m=>t(m[1])+' · '+m[2]+' left'],[/^Đã tìm thấy (\d+) đối thủ$/,m=>'Found '+m[1]+' opponents'],[/^Đã mua skin (.+)$/,m=>'Bought skin '+t(m[1])],
[/^Bạn bị loại ở hạng (\d+)\/(\d+)$/,m=>'You were knocked out in place '+m[1]+'/'+m[2]],[/^(\S+) hạ (\S+)( · headshot)?$/,m=>(m[1]==='Bạn'?'You':m[1]==='Bo'?'The zone':m[1])+' knocked out '+(m[2]==='Bạn'?'you':m[2])+(m[3]||'')],[/^(\d+) người$/,m=>m[1]+' players'],
[/^(\d+) trận · (\d+) lần Top 1 · (\d+) hạ gục$/,m=>m[1]+' matches · '+m[2]+' Top 1 · '+m[3]+' kills'],"""
block = ''.join('%s:%s,' % (json.dumps(k, ensure_ascii=False), json.dumps(v, ensure_ascii=False)) for k, v in D.items())
anchor = '"Nexus, trang chủ":"Nexus, home",'
assert anchor in s
s = s.replace(anchor, block + anchor, 1)
anchor2 = "[/^(\\d+) bài$/,m=>m[1]+' songs'],"
assert anchor2 in s, 'rules anchor'
s = s.replace(anchor2, anchor2 + R, 1)
open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok', len(D))
