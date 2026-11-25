"""Composes and renders the Nexus Originals catalogue. Run: python3 compose.py [index ...]"""
import sys, json, subprocess, os
import numpy as np
from synth import *

CH = {'maj': [0, 4, 7], 'min': [0, 3, 7], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '7': [0, 4, 7, 10], 'm9': [0, 3, 7, 10, 14],
      'maj9': [0, 4, 7, 11, 14], 'sus2': [0, 2, 7], 'add9': [0, 4, 7, 14], 'dim': [0, 3, 6], 'm6': [0, 3, 7, 9], '6': [0, 4, 7, 9]}
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
SCALES = {'maj': [0, 2, 4, 5, 7, 9, 11], 'min': [0, 2, 3, 5, 7, 8, 10], 'dor': [0, 2, 3, 5, 7, 9, 10], 'pent': [0, 2, 4, 7, 9], 'mpent': [0, 3, 5, 7, 10], 'phryg': [0, 1, 3, 5, 7, 8, 10], 'hmin': [0, 2, 3, 5, 7, 8, 11]}


def chord_of(name):
    # e.g. 'Fmaj7', 'Am7', 'G', 'C#m'
    r = name[:2] if len(name) > 1 and name[1] in '#b' else name[:1]
    k = name[len(r):] or 'maj'
    if k == 'm':
        k = 'min'
    return NOTE[r], CH[k]


def snap(m, pool):
    best = min(pool, key=lambda p: (abs(p - m), p))
    return best


def pool_for(root_pc, ivs, lo, hi):
    pcs = {(root_pc + i) % 12 for i in ivs}
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def make_motif(rng, bars=2, density=0.5, syn=0.3, maxlen=4):
    """rhythm: list of (step, length) over bars*16 steps; contour: relative moves"""
    steps = bars * 16
    notes = []
    s = 0
    while s < steps:
        strong = s % 4 == 0
        p = density + (0.25 if strong else -0.1) + (syn if s % 4 == 2 else 0) * 0.3
        if rng.random() < p:
            L = int(rng.choice([1, 2, 2, 3, 4, 4, 6, 8][:maxlen + 3]))
            L = max(1, min(L, steps - s))
            notes.append((s, L))
            s += L
        else:
            s += 1
    if not notes:
        notes = [(0, 4), (8, 4)]
    contour = [int(rng.choice([-2, -1, -1, 0, 1, 1, 2, 3, -3])) for _ in notes]
    return {'notes': notes, 'contour': contour, 'bars': bars}


def realise(motif, chords_at, scale_pool, center, rng, var=0.0):
    """turn a motif into (start_step, length, midi) using chord tones on strong steps"""
    out = []
    cur = center
    for (s, L), c in zip(motif['notes'], motif['contour']):
        if rng.random() < var:
            c += int(rng.choice([-1, 1]))
        cur = cur + c * 2 if abs(c) > 1 else cur + c * 1.6
        cur = max(center - 7, min(center + 9, cur))
        root, ivs = chords_at(s)
        if s % 4 == 0 or L >= 4:
            pool = pool_for(root, ivs, center - 10, center + 12)
        else:
            pool = scale_pool
        m = snap(int(round(cur)), pool)
        out.append((s, L, m))
        cur = m
    return out


class Song:
    def __init__(self, spec):
        self.S = spec
        self.rng = np.random.default_rng(spec['seed'])
        self.bpm = spec['bpm']
        self.step = 60 / self.bpm / 4
        self.bar = self.step * 16
        self.key = NOTE[spec['key']]
        self.prog = [chord_of(c) for c in spec['prog']]
        self.cpb = spec.get('cpb', 1)  # chords per bar
        bars = sum(b for _, b, _ in spec['sections'])
        if bars * 240 / spec['bpm'] < 140:  # stretch the middle sections of fast tracks to ~2.5 min
            k = 150 / (bars * 240 / spec['bpm'])
            spec['sections'] = [(nm, b if nm in ('intro', 'outro') else max(4, int(round(b * k / 4)) * 4), P) for nm, b, P in spec['sections']]
            bars = sum(b for _, b, _ in spec['sections'])
        self.total = bars * self.bar + 4
        self.mix = Mix(self.total)
        self.kicks = []
        self.scale = SCALES[spec.get('scale', 'maj')]

    def chord_at_bar(self, bar, half=0):
        i = (bar * self.cpb + half) % len(self.prog)
        return self.prog[i]

    def tstep(self, bar, s):
        sw = self.S.get('swing', 0)
        t = bar * self.bar + s * self.step
        if sw and s % 2 == 1:
            t += self.step * sw
        hum = self.S.get('humanize', 0)
        if hum:
            t += self.rng.normal(0, hum)
        return max(0, t)

    # ------------------------------------------------------------ parts
    def drums(self, bar, P):
        mx = self.mix
        S = self.S
        for name, pat in P.get('drums', {}).items():
            for s, ch in enumerate(pat):
                if ch in '.-':
                    continue
                t = self.tstep(bar, s)
                acc = 1.0 if ch in 'xX' else 0.55
                if name == 'k':
                    mx.add('drums', t, self.KICK, 0.95 * acc)
                    self.kicks.append(t)
                elif name == 's':
                    mx.add('drums', t, self.SNR[self.rng.integers(0, 4)], 0.75 * acc, pan=0.02)
                elif name == 'c':
                    mx.add('drums', t, self.CLP[self.rng.integers(0, 4)], 0.7 * acc, pan=-0.05)
                elif name == 'h':
                    if ch == 'r':  # roll: 32nds/triplets
                        n = int(self.rng.choice([2, 3, 4]))
                        for k in range(n):
                            mx.add('drums', t + k * self.step / n, self.HAT[self.rng.integers(0, 4)], 0.32, pan=0.25)
                    else:
                        mx.add('drums', t, self.HAT[self.rng.integers(0, 4)], (0.42 if ch == 'x' else 0.24) * S.get('hatv', 1), pan=0.25)
                elif name == 'o':
                    mx.add('drums', t, self.OH, 0.35 * acc, pan=-0.25)
                elif name == 'p':  # percussion: rim-ish tone
                    tt = t_arr(0.08)
                    x = np.sin(TAU * 820 * tt) * np.exp(-tt / 0.015) + highpass(noise(len(tt)), 3000) * np.exp(-tt / 0.01) * 0.4
                    mx.add('drums', t, x, 0.35 * acc, pan=-0.35)

    def bass(self, bar, P):
        pat = P.get('bass')
        if not pat:
            return
        kind = self.S.get('bass', 'sub')
        starts = [i for i, c in enumerate(pat) if c in 'xo']
        for j, s in enumerate(starts):
            e = starts[j + 1] if j + 1 < len(starts) else 16
            while e < 16 and pat[e] == '-':
                e += 1
            # length = until next start (or sustained dashes)
            L = (starts[j + 1] - s) if j + 1 < len(starts) else (16 - s)
            half = 1 if (self.cpb == 2 and s >= 8) else 0
            root, ivs = self.chord_at_bar(bar, half)
            m = 24 + 12 + root if root < 6 else 24 + root
            if pat[s] == 'o':
                m += 12 if kind != '808' else 7
            t = self.tstep(bar, s)
            dur = L * self.step * 0.95
            if kind == '808':
                prev = getattr(self, '_last808', None)
                g = prev if (prev is not None and prev != m and self.rng.random() < 0.35) else None
                self.mix.add('bass', t, bass808(m, dur, drive=self.S.get('drive808', 1.8), glide_from=g), 0.9)
                self._last808 = m
            elif kind == 'pluck':
                self.mix.add('bass', t, pluck(m + 12, dur, 0.35, self.rng), 1.0)
                self.mix.add('bass', t, subbass(m, dur, 200, 0.5), 0.5)
            else:
                self.mix.add('bass', t, subbass(m, dur, self.S.get('bcut', 420)), 0.9)

    def chords(self, bar, P):
        inst = P.get('chords')
        if not inst:
            return
        rhythm = P.get('crhythm') or self.S.get('crhythm') or ('x' + '-' * 15)
        starts = [i for i, c in enumerate(rhythm) if c == 'x']
        for j, s in enumerate(starts):
            L = (starts[j + 1] - s) if j + 1 < len(starts) else (16 - s)
            half = 1 if (self.cpb == 2 and s >= 8) else 0
            root, ivs = self.chord_at_bar(bar, half)
            base = 48 + root if root >= 4 else 60 + root
            if inst in ('pad', 'supersaw', 'strings'):
                base -= 12 if base > 55 else 0
            notes = [base + i for i in ivs]
            # voice leading: keep notes within 52..74
            notes = [n - 12 if n > 74 else n for n in notes]
            notes = sorted(set(notes))
            t0 = self.tstep(bar, s)
            dur = L * self.step * (0.98 if inst != 'stab' else 0.35)
            for k, n in enumerate(notes):
                t = t0 + (k * self.S.get('strum', 0))
                if inst == 'epiano':
                    self.mix.add('keys', t, epiano(n, dur, 0.55 + self.rng.random() * 0.15, self.S.get('ebright', 1)), 0.6, pan=(k / max(1, len(notes) - 1) - 0.5) * 0.5)
                elif inst == 'piano':
                    self.mix.add('keys', t, piano(n, dur, 0.55 + self.rng.random() * 0.15), 0.65, pan=(k / max(1, len(notes) - 1) - 0.5) * 0.4)
                elif inst == 'pad':
                    self.mix.add('pad', t, sine_pad(n, dur), 0.7, pan=(k % 2 - 0.5) * 0.6)
                elif inst in ('supersaw', 'stab'):
                    L2, R2 = supersaw(n, dur, cut=self.S.get('scut', 2400), rng=self.rng, a=0.005 if inst == 'stab' else 0.03, r=0.15 if inst == 'stab' else 0.35)
                    self.mix.add('pad', t, None, 0.42, stereo=(L2, R2))
                elif inst == 'strings':
                    L2, R2 = strings(n, dur, rng=self.rng)
                    self.mix.add('pad', t, None, 0.4, stereo=(L2, R2))
                elif inst == 'brass':
                    self.mix.add('pad', t, brass(n, dur), 0.55, pan=(k % 2 - 0.5) * 0.5)
                elif inst == 'pluck':
                    self.mix.add('keys', t, pluck(n + 12, dur, 0.6, self.rng), 0.55, pan=(k % 2 - 0.5) * 0.6)

    def arp(self, bar, P):
        inst = P.get('arp')
        if not inst:
            return
        pat = self.S.get('arppat', [0, 1, 2, 3, 2, 1, 0, 1])
        rate = self.S.get('arprate', 2)  # steps per note
        for s in range(0, 16, rate):
            half = 1 if (self.cpb == 2 and s >= 8) else 0
            root, ivs = self.chord_at_bar(bar, half)
            tones = [60 + root + i for i in ivs] + [72 + root + ivs[0]]
            n = tones[pat[(s // rate) % len(pat)] % len(tones)]
            t = self.tstep(bar, s)
            d = self.step * rate * 0.8
            if inst == 'pulse':
                self.mix.add('arp', t, pulse_lead(n + 12, d, 0.125), 0.5, pan=0.3 if (s // rate) % 2 else -0.3)
            elif inst == 'pluck':
                self.mix.add('arp', t, pluck(n + 12, d, 0.7, self.rng), 0.5, pan=0.3 if (s // rate) % 2 else -0.3)
            elif inst == 'saw':
                self.mix.add('arp', t, saw_lead(n + 12, d, cut=2500, vib=0), 0.55, pan=0.3 if (s // rate) % 2 else -0.3)
            elif inst == 'epiano':
                self.mix.add('arp', t, epiano(n + 12, d * 1.5, 0.4), 0.5, pan=0.3 if (s // rate) % 2 else -0.3)

    def lead(self, bar0, nbars, P):
        inst = P.get('lead')
        if not inst:
            return
        motif = self.hook if P.get('hook', True) else self.verse
        center = self.S.get('lcenter', 72)
        spool = [m for m in range(center - 12, center + 14) if (m - self.key) % 12 in self.scale]
        for b in range(0, nbars, motif['bars']):
            bar = bar0 + b

            def chords_at(s, bar=bar):
                bb = bar + s // 16
                half = 1 if (self.cpb == 2 and (s % 16) >= 8) else 0
                return self.chord_at_bar(bb, half)
            var = 0.0 if (b // motif['bars']) % 2 == 0 else 0.35
            notes = realise(motif, chords_at, spool, center, np.random.default_rng(self.S['seed'] * 7 + (b // motif['bars']) % 2), var)
            for s, L, m in notes:
                if bar + s // 16 >= bar0 + nbars:
                    continue
                t = self.tstep(bar + s // 16, s % 16)
                d = L * self.step * 0.92
                if inst == 'saw':
                    x = saw_lead(m, d, cut=self.S.get('lcut', 3200))
                elif inst == 'pulse':
                    x = pulse_lead(m, d, 0.25, vib=0.004)
                elif inst == 'piano':
                    x = piano(m, d, 0.7)
                elif inst == 'epiano':
                    x = epiano(m, d, 0.7)
                elif inst == 'pluck':
                    x = pluck(m, d, 0.8, self.rng)
                elif inst == 'cowbell':
                    x = cowbell(m, max(0.25, d))
                elif inst == 'brass':
                    x = brass(m, d, 800, 3200)
                elif inst == 'sine':
                    tt = t_arr(d + 0.2)
                    x = (np.sin(TAU * mtof(m) * tt) + 0.2 * np.sin(TAU * mtof(m) * 2 * tt)) * env_adsr(len(tt), 0.02, 0.1, 0.8, 0.15, d) * 0.3
                else:
                    x = saw_lead(m, d)
                self.mix.add('lead', t, x, P.get('lgain', 1.0) * self.S.get('lgain', 1.0))

    def fx(self, bar, nbars, P):
        if P.get('riser'):
            d = nbars * self.bar
            tt = t_arr(d)
            nz = highpass(noise(len(tt)), 600) * (tt / d) ** 2
            self.mix.add('fx', bar * self.bar, nz, 0.18)
        if P.get('impact'):
            tt = t_arr(2.5)
            x = np.sin(TAU * 50 * tt) * np.exp(-tt / 0.5) + lowpass(noise(len(tt)), 800) * np.exp(-tt / 0.4) * 0.5
            self.mix.add('fx', bar * self.bar, x, 0.55)

    # ------------------------------------------------------------ render
    def render(self):
        S = self.S
        r = self.rng
        self.KICK = kick(**S.get('kick', {}))
        self.SNR = [snare(rng=np.random.default_rng(i), **S.get('snare', {})) for i in range(4)]
        self.CLP = [clap(np.random.default_rng(10 + i)) for i in range(4)]
        self.HAT = [hat(False, np.random.default_rng(20 + i), S.get('hatb', 8000)) for i in range(4)]
        self.OH = hat(True, np.random.default_rng(30))
        self.hook = make_motif(np.random.default_rng(S['seed'] + 1), bars=S.get('hookbars', 2), density=S.get('hookd', 0.45))
        self.verse = make_motif(np.random.default_rng(S['seed'] + 2), bars=2, density=S.get('versed', 0.35))
        bar = 0
        for name, nb, P in S['sections']:
            for b in range(nb):
                self.drums(bar + b, P)
                self.bass(bar + b, P)
                self.chords(bar + b, P)
                self.arp(bar + b, P)
            self.lead(bar, nb, P)
            self.fx(bar, nb, P)
            bar += nb
        return self.mixdown()

    def mixdown(self):
        S = self.S
        mx = self.mix
        n = mx.n
        out = np.zeros((2, n))
        sc = sidechain_env(n, self.kicks, S.get('sc', 0.0), 60 / self.bpm * 0.45) if S.get('sc') else None
        ir = make_ir(S.get('rvt', 2.2), damp=S.get('rvdamp', 6000), seed=S['seed'])
        send = np.zeros((2, n))
        lvl = {'drums': 0.9, 'bass': 0.85, 'keys': 0.7, 'pad': 0.55, 'arp': 0.45, 'lead': 0.6, 'fx': 0.5}
        lvl.update(S.get('levels', {}))
        sends = {'drums': 0.06, 'bass': 0.0, 'keys': 0.25, 'pad': 0.35, 'arp': 0.3, 'lead': 0.28, 'fx': 0.3}
        sends.update(S.get('sends', {}))
        for name, b in mx.buses.items():
            x = b * lvl.get(name, 0.6)
            if name == 'drums' and S.get('drumdrive'):
                x = np.tanh(x * S['drumdrive']) / S['drumdrive'] * 1.4
            if name == 'bass' and S.get('bassdrive'):
                x = np.tanh(x * S['bassdrive']) / S['bassdrive'] * 1.2
            if name in ('lead', 'arp') and S.get('delay'):
                x = delay(x, self.step * S['delay'], 0.35, 0.28)
            if sc is not None and name in ('pad', 'bass', 'keys', 'arp'):
                x = x * sc[None, :]
            out += x
            send += x * sends.get(name, 0.2)
        out += reverb(send, ir) * S.get('rvmix', 0.9)
        if S.get('vinyl'):
            out += vinyl(n, S['seed'], S['vinyl']) * np.max(np.abs(out)) * 0.6
        if S.get('rain'):
            out += rain(n, S['seed']) * np.max(np.abs(out)) * S['rain']
        # fade out tail
        tail = int(3 * SR)
        end = int(self.total * SR)
        out = out[:, :end]
        out[:, -tail:] *= np.linspace(1, 0, tail)[None, :] ** 1.5
        st = master(out, S.get('mdrive', 1.2), -1.0, S.get('lofi', False))
        # loudness match across the catalogue: aim for about -13.5 dB RMS, soft-limit the peaks
        rms = 20 * np.log10(np.sqrt(np.mean(st ** 2)) + 1e-9)
        g = 10 ** ((-13.5 - rms) / 20)
        st = np.tanh(st * g * 1.05) / 1.05
        return st * (0.97 / max(0.97, np.max(np.abs(st))))


def write_mp3(st, path, kbps=160):
    pcm = (np.clip(st.T, -1, 1) * 32767).astype('<i2').tobytes()
    p = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', 'pipe:0',
                        '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', path], input=pcm)
    assert p.returncode == 0


if __name__ == '__main__':
    from catalog import TRACKS
    idx = [int(a) for a in sys.argv[1:]] or range(len(TRACKS))
    os.makedirs('out', exist_ok=True)
    for i in idx:
        spec = TRACKS[i]
        st = Song(spec).render()
        fn = f"out/{spec['file']}.mp3"
        write_mp3(st, fn)
        print(i, spec['title'], round(st.shape[1] / SR), 's', os.path.getsize(fn) // 1024, 'KB', flush=True)
