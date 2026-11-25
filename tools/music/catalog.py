"""The 12 Nexus Originals: arrangement specs fed to compose.Song"""


def sec(name, bars, **P):
    return (name, bars, P)


D_LOFI = {'k': 'x......x..x.....', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.xo'}
D_LOFI2 = {'k': 'x.......x.x.....', 's': '....x.......x..o', 'h': 'x.x.x.x.x.x.x.x.'}
D_HOUSE = {'k': 'x...x...x...x...', 'c': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.', 'o': '..x...x...x...x.'}
D_PHONK = {'k': 'x.........x.....', 'c': '....x.......x...', 'h': 'x.x.x.xrx.x.x.xr'}
D_PHONK2 = {'k': 'x.....x...x..x..', 'c': '....x.......x...', 'h': 'xrx.x.x.xrx.x.xr', 'p': '..o.....o.....o.'}
D_HIPHOP = {'k': 'x.....x...x..x..', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}
D_ROCK = {'k': 'x.....x.x.......', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}
D_EPIC = {'k': 'x..x..x.x..x..x.', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}
D_CHIP = {'k': 'x...x...x...x...', 's': '....x.......x...', 'h': 'xxxxxxxxxxxxxxxx'}
D_WAVE = {'k': 'x...x...x...x...', 's': '....x.......x...', 'h': '..x...x...x...x.'}
D_POP = {'k': 'x...x...x...x...', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.', 'o': '..............x.'}
ONLY_K = lambda d: {'k': d['k']}
NO_K = lambda d: {k: v for k, v in d.items() if k != 'k'}

TRACKS = [
    # 1 lo-fi: jazzy Rhodes, swing, vinyl
    dict(file='late-night-study', title='Late Night Study', artist='Nexus Lo-fi Lab', genre='Lo-fi', seed=101, bpm=78, key='F',
         prog=['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'], scale='maj', swing=0.18, humanize=0.006, bass='sub', bcut=300,
         lofi=True, vinyl=1.0, mdrive=1.4, rvt=2.4, lcenter=74, hookd=0.38, levels={'keys': 0.85, 'lead': 0.5, 'drums': 0.68}, hatv=0.7, kick={'punch': 0.8, 'dec': 0.3}, snare={'bright': 0.6},
         sections=[sec('intro', 4, chords='epiano'), sec('A', 8, drums=D_LOFI, bass='x.......x.x.....', chords='epiano'),
                   sec('B', 8, drums=D_LOFI, bass='x.......x.x.....', chords='epiano', lead='epiano'),
                   sec('A2', 8, drums=D_LOFI2, bass='x.....x...x.....', chords='epiano', arp='epiano'),
                   sec('B2', 8, drums=D_LOFI, bass='x.......x.x.....', chords='epiano', lead='epiano', hook=True),
                   sec('break', 4, chords='epiano', drums={'h': 'x.x.x.x.x.x.x.x.'}),
                   sec('B3', 8, drums=D_LOFI, bass='x.......x.x.....', chords='epiano', lead='epiano'),
                   sec('outro', 4, chords='epiano')]),
    # 2 lo-fi rain piano
    dict(file='mua-tren-san-truong', title='Mưa Trên Sân Trường', artist='Nexus Lo-fi Lab', genre='Lo-fi', seed=202, bpm=72, key='A',
         prog=['Am7', 'Fmaj7', 'Cmaj7', 'G'], scale='min', swing=0.15, humanize=0.008, bass='sub', bcut=260, lofi=True, vinyl=0.8, rain=0.9,
         mdrive=1.3, rvt=3.0, lcenter=76, hookd=0.33, strum=0.02, levels={'keys': 0.8, 'drums': 0.65}, hatv=0.7, snare={'bright': 0.6},
         sections=[sec('intro', 4, chords='piano'), sec('A', 8, drums=D_LOFI2, bass='x.......x.......', chords='piano'),
                   sec('B', 8, drums=D_LOFI2, bass='x.......x...x...', chords='piano', lead='piano'),
                   sec('pad', 4, chords='pad', lead='piano', hook=False),
                   sec('B2', 8, drums=D_LOFI, bass='x.......x...x...', chords='piano', lead='piano'),
                   sec('A2', 8, drums=D_LOFI2, bass='x.......x.......', chords='epiano', arp='epiano'),
                   sec('outro', 4, chords='piano')]),
    # 3 chillhop
    dict(file='dem-truoc-ky-thi', title='Đêm Trước Kỳ Thi', artist='Nexus Lo-fi Lab', genre='Lo-fi', seed=303, bpm=86, key='D',
         prog=['Dm9', 'G7', 'Cmaj7', 'Am7'], scale='dor', swing=0.2, humanize=0.005, bass='pluck', lofi=True, vinyl=0.7, mdrive=1.3, rvt=2.0,
         lcenter=72, hookd=0.5, delay=3, ebright=0.7, levels={'drums': 0.72}, hatv=0.75,
         sections=[sec('intro', 4, chords='epiano', drums=ONLY_K(D_HIPHOP)), sec('A', 8, drums=D_HIPHOP, bass='x.....x...x.....', chords='epiano'),
                   sec('B', 8, drums=D_HIPHOP, bass='x.....x...x..x..', chords='epiano', lead='pluck'),
                   sec('C', 8, drums=D_LOFI, bass='x.....x...x.....', chords='epiano', arp='pluck'),
                   sec('B2', 8, drums=D_HIPHOP, bass='x.....x...x..x..', chords='epiano', lead='pluck'),
                   sec('break', 4, chords='epiano'), sec('B3', 8, drums=D_HIPHOP, bass='x.....x...x..x..', chords='epiano', lead='epiano'),
                   sec('outro', 4, chords='epiano', drums=ONLY_K(D_HIPHOP))]),
    # 4 phonk cowbell
    dict(file='phonk-cong-truong', title='Phonk Cổng Trường', artist='Nexus Phonk', genre='Phonk', seed=404, bpm=130, key='C#',
         prog=['C#m', 'C#m', 'A', 'G#'], scale='phryg', bass='808', drive808=2.6, bassdrive=1.6, drumdrive=1.8, mdrive=1.9, rvt=1.6,
         lcenter=68, hookd=0.6, hookbars=1, kick={'punch': 1.3, 'dec': 0.3, 'f1': 42}, hatb=9000,
         sections=[sec('intro', 4, lead='cowbell', drums={'h': 'x.x.x.x.x.x.x.x.'}),
                   sec('A', 8, drums=D_PHONK, bass='x.........x.....', lead='cowbell'),
                   sec('B', 8, drums=D_PHONK2, bass='x.....x...x..x..', lead='cowbell', chords='pad'),
                   sec('break', 4, chords='pad', lead='cowbell', hook=False, riser=True),
                   sec('B2', 8, drums=D_PHONK2, bass='x.....x...x..x..', lead='cowbell', impact=True),
                   sec('A2', 8, drums=D_PHONK, bass='x.........x.....', lead='cowbell', hook=False),
                   sec('B3', 8, drums=D_PHONK2, bass='x.....x...x..x..', lead='cowbell', chords='pad'),
                   sec('outro', 4, lead='cowbell', drums={'h': 'x.x.x.x.x.x.x.x.'})]),
    # 5 drift phonk (faster, distorted)
    dict(file='drift-qua-pho-co', title='Drift Qua Phố Cổ', artist='Nexus Phonk', genre='Phonk', seed=505, bpm=150, key='F',
         prog=['Fm', 'Db', 'Eb', 'C'], scale='hmin', bass='808', drive808=3.0, bassdrive=2.0, drumdrive=2.2, mdrive=2.1, rvt=1.4,
         lcenter=70, hookd=0.65, hookbars=1, kick={'punch': 1.4, 'dec': 0.28}, hatb=9500,
         sections=[sec('intro', 4, lead='cowbell', drums={'h': 'x.xrx.x.x.xrx.x.'}, riser=True),
                   sec('A', 8, drums=D_PHONK2, bass='x.....x...x..x..', lead='cowbell', impact=True),
                   sec('B', 8, drums=D_PHONK2, bass='x..x..x...x..x..', lead='cowbell', chords='stab', crhythm='x.......x.......'),
                   sec('break', 4, lead='cowbell', hook=False, chords='pad', riser=True),
                   sec('B2', 8, drums=D_PHONK2, bass='x..x..x...x..x..', lead='cowbell', impact=True, chords='stab', crhythm='x.......x.......'),
                   sec('A2', 8, drums=D_PHONK, bass='x.....x...x..x..', lead='cowbell', hook=False),
                   sec('B3', 8, drums=D_PHONK2, bass='x..x..x...x..x..', lead='cowbell'),
                   sec('outro', 4, lead='cowbell')]),
    # 6 Vietnamese-club style remix
    dict(file='remix-tan-truong', title='Remix Tan Trường', artist='DJ Lớp Trưởng', genre='Remix', seed=606, bpm=136, key='A',
         prog=['Am', 'F', 'C', 'G'], scale='min', bass='sub', bcut=600, sc=0.75, mdrive=1.6, rvt=1.8, lcenter=76, hookd=0.55,
         delay=3, scut=3000, kick={'punch': 1.2, 'dec': 0.32}, levels={'pad': 0.5, 'lead': 0.7},
         sections=[sec('intro', 8, drums=ONLY_K(D_HOUSE), chords='pad'),
                   sec('A', 8, drums=D_HOUSE, bass='..x...x...x...x.', chords='pluck', crhythm='x..x..x...x..x..'),
                   sec('build', 4, drums={'s': 'x.x.x.x.x.x.x.x.'}, chords='supersaw', riser=True),
                   sec('drop', 16, drums=D_HOUSE, bass='..x...x...x...x.', chords='supersaw', lead='pluck', arp='saw', impact=True),
                   sec('break', 8, chords='pad', lead='piano', hook=False),
                   sec('build2', 4, drums={'s': 'x.x.x.x.x.x.xxxx'}, chords='supersaw', riser=True),
                   sec('drop2', 16, drums=D_HOUSE, bass='..x...x...x...x.', chords='supersaw', lead='saw', arp='pluck', impact=True),
                   sec('outro', 8, drums=ONLY_K(D_HOUSE), chords='pad')]),
    # 7 future house
    dict(file='bay-len-nao', title='Bay Lên Nào', artist='Nexus Originals', genre='Dance', seed=707, bpm=124, key='E',
         prog=['C#m7', 'Amaj7', 'E', 'B'], scale='maj', bass='sub', bcut=800, sc=0.7, mdrive=1.5, rvt=2.0, lcenter=74, hookd=0.5,
         delay=3, kick={'punch': 1.1, 'dec': 0.3},
         sections=[sec('intro', 8, drums=ONLY_K(D_HOUSE), chords='stab', crhythm='x..x..x...x.....'),
                   sec('A', 8, drums=D_HOUSE, bass='x..x..x...x..x..', chords='stab', crhythm='x..x..x...x.....', lead='sine', hook=False),
                   sec('build', 4, drums={'k': 'x...x...x...x...', 'c': 'x.x.x.x.x.x.x.x.'}, chords='pad', riser=True),
                   sec('drop', 16, drums=D_HOUSE, bass='x..x..x...x..x..', chords='stab', crhythm='x..x..x...x..x..', lead='saw', impact=True),
                   sec('break', 8, chords='pad', lead='pluck'),
                   sec('drop2', 16, drums=D_HOUSE, bass='x..x..x...x..x..', chords='stab', crhythm='x..x..x...x..x..', lead='saw', arp='pluck', impact=True),
                   sec('outro', 8, drums=ONLY_K(D_HOUSE), chords='pad')]),
    # 8 game: epic boss battle
    dict(file='final-boss', title='Final Boss', artist='Nexus Game Sound', genre='Nhạc game', seed=808, bpm=160, key='D',
         prog=['Dm', 'Bb', 'C', 'A'], scale='hmin', bass='sub', bcut=500, mdrive=1.5, rvt=2.6, lcenter=74, hookd=0.55, hookbars=2,
         kick={'punch': 1.2, 'dec': 0.25}, levels={'pad': 0.6, 'lead': 0.65},
         sections=[sec('intro', 4, chords='strings', impact=True),
                   sec('A', 8, drums=D_EPIC, bass='xxxxxxxxxxxxxxxx', chords='strings', arp='saw'),
                   sec('B', 8, drums=D_EPIC, bass='xxxxxxxxxxxxxxxx', chords='brass', crhythm='x.....x.....x...', lead='saw'),
                   sec('C', 8, drums=D_ROCK, bass='x.x.x.x.x.x.x.x.', chords='strings', lead='brass', hook=False),
                   sec('B2', 8, drums=D_EPIC, bass='xxxxxxxxxxxxxxxx', chords='brass', crhythm='x.....x.....x...', lead='saw', arp='pulse', impact=True),
                   sec('break', 4, chords='strings', riser=True),
                   sec('B3', 8, drums=D_EPIC, bass='xxxxxxxxxxxxxxxx', chords='strings', lead='brass'),
                   sec('outro', 4, chords='brass', impact=True)]),
    # 9 game: chiptune hero
    dict(file='pixel-hero', title='Pixel Hero', artist='Nexus Game Sound', genre='Nhạc game', seed=909, bpm=140, key='C',
         prog=['C', 'Am', 'F', 'G'], scale='maj', bass='sub', bcut=900, mdrive=1.2, rvt=1.0, rvmix=0.4, lcenter=76, hookd=0.6,
         arpppat=None, arprate=1, arppat=[0, 1, 2, 3], kick={'punch': 0.9, 'dec': 0.2}, snare={'bright': 1.2}, hatv=0.6,
         sections=[sec('intro', 4, arp='pulse', lead='pulse'),
                   sec('A', 8, drums=D_CHIP, bass='x.x.x.x.x.x.x.x.', arp='pulse', lead='pulse', hook=False),
                   sec('B', 8, drums=D_CHIP, bass='x.x.x.x.x.x.x.x.', arp='pulse', lead='pulse'),
                   sec('C', 8, drums=D_POP, bass='x...x...x...x...', chords='pluck', lead='pulse', hook=False),
                   sec('B2', 8, drums=D_CHIP, bass='x.x.x.x.x.x.x.x.', arp='pulse', lead='pulse'),
                   sec('break', 4, arp='pulse'),
                   sec('B3', 8, drums=D_CHIP, bass='x.x.x.x.x.x.x.x.', arp='pulse', lead='pulse'),
                   sec('outro', 4, lead='pulse')]),
    # 10 sporty hip-hop
    dict(file='buzzer-beater', title='Buzzer Beater', artist='Court Kings', genre='Hip-hop', seed=1010, bpm=95, key='G',
         prog=['Gm7', 'Ebmaj7', 'Cm7', 'D7'], scale='min', bass='808', drive808=1.6, drumdrive=1.4, mdrive=1.5, rvt=1.6, lcenter=72, hookd=0.5,
         kick={'punch': 1.2, 'dec': 0.35}, delay=3,
         sections=[sec('intro', 4, chords='piano', drums={'h': 'x.x.x.x.x.x.x.x.'}),
                   sec('A', 8, drums=D_HIPHOP, bass='x.....x...x.....', chords='piano', crhythm='x.......x.......'),
                   sec('B', 8, drums=D_HIPHOP, bass='x.....x...x..x..', chords='brass', crhythm='x..x....x..x....', lead='saw'),
                   sec('A2', 8, drums=D_HIPHOP, bass='x.....x...x.....', chords='piano', crhythm='x.......x.......', arp='pluck'),
                   sec('B2', 8, drums=D_HIPHOP, bass='x.....x...x..x..', chords='brass', crhythm='x..x....x..x....', lead='saw'),
                   sec('break', 4, chords='piano', riser=True),
                   sec('B3', 8, drums=D_HIPHOP, bass='x.....x...x..x..', chords='brass', crhythm='x..x....x..x....', lead='saw', impact=True),
                   sec('outro', 4, chords='piano')]),
    # 11 synthwave
    dict(file='neon-sai-gon', title='Neon Sài Gòn', artist='Nexus Originals', genre='Synthwave', seed=1111, bpm=105, key='E',
         prog=['Em', 'C', 'G', 'D'], scale='min', bass='sub', bcut=700, sc=0.5, mdrive=1.35, rvt=3.2, lcenter=76, hookd=0.45, delay=3,
         arprate=1, arppat=[0, 1, 2, 1], snare={'dec': 0.3}, kick={'dec': 0.35},
         sections=[sec('intro', 4, chords='pad', arp='saw'),
                   sec('A', 8, drums=D_WAVE, bass='xoxoxoxoxoxoxoxo', chords='supersaw', arp='saw'),
                   sec('B', 8, drums=D_WAVE, bass='xoxoxoxoxoxoxoxo', chords='supersaw', lead='saw'),
                   sec('break', 4, chords='pad', lead='sine', hook=False),
                   sec('A2', 8, drums=D_WAVE, bass='xoxoxoxoxoxoxoxo', chords='supersaw', arp='pulse'),
                   sec('B2', 8, drums=D_WAVE, bass='xoxoxoxoxoxoxoxo', chords='supersaw', lead='saw', arp='saw'),
                   sec('outro', 8, chords='pad', arp='saw')]),
    # 12 happy pop / indie
    dict(file='gio-ra-choi', title='Giờ Ra Chơi', artist='Nexus Originals', genre='Pop', seed=1212, bpm=118, key='G',
         prog=['G', 'D', 'Em', 'C'], scale='maj', bass='pluck', mdrive=1.3, rvt=1.8, lcenter=74, hookd=0.55, strum=0.012,
         sections=[sec('intro', 4, chords='pluck', crhythm='x..x..x.x..x..x.'),
                   sec('A', 8, drums=D_POP, bass='x...x...x...x...', chords='piano', crhythm='x..x..x.x..x..x.', lead='pluck', hook=False),
                   sec('B', 8, drums=D_POP, bass='x.x.x.x.x.x.x.x.', chords='piano', lead='saw', arp='pluck'),
                   sec('A2', 8, drums=D_POP, bass='x...x...x...x...', chords='pluck', crhythm='x..x..x.x..x..x.', lead='pluck', hook=False),
                   sec('B2', 8, drums=D_POP, bass='x.x.x.x.x.x.x.x.', chords='piano', lead='saw', arp='pluck'),
                   sec('break', 4, chords='pad', lead='piano'),
                   sec('B3', 8, drums=D_POP, bass='x.x.x.x.x.x.x.x.', chords='piano', lead='saw', arp='pluck', impact=True),
                   sec('outro', 4, chords='piano')]),
]
