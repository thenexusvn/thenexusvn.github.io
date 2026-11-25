"""Nexus Originals: a small offline synthesizer that composes and renders original tracks to WAV.
Every sound is generated from oscillators and noise: no samples, no third-party material."""
import numpy as np
from scipy import signal

SR = 44100
TAU = 2 * np.pi


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a, d, s, r, hold):
    """n samples total; hold = seconds before release"""
    t = np.arange(n) / SR
    e = np.empty(n)
    a = max(a, 1e-4)
    d = max(d, 1e-4)
    e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    rel = t >= hold
    if rel.any():
        lvl = np.interp(hold, t, e) if hold < t[-1] else s
        e = np.where(rel, lvl * np.exp(-(t - hold) / max(r, 1e-3) * 3.0), e)
    return e


def exp_env(n, decay):
    return np.exp(-np.arange(n) / SR / max(decay, 1e-4))


_lp_cache = {}


def lowpass(x, f, order=2):
    f = min(max(f, 30), SR * 0.45)
    key = ('lp', round(f), order)
    if key not in _lp_cache:
        _lp_cache[key] = signal.butter(order, f / (SR / 2), 'low', output='sos')
    return signal.sosfilt(_lp_cache[key], x)


def highpass(x, f, order=2):
    key = ('hp', round(f), order)
    if key not in _lp_cache:
        _lp_cache[key] = signal.butter(order, f / (SR / 2), 'high', output='sos')
    return signal.sosfilt(_lp_cache[key], x)


def bandpass(x, lo, hi, order=2):
    key = ('bp', round(lo), round(hi), order)
    if key not in _lp_cache:
        _lp_cache[key] = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos')
    return signal.sosfilt(_lp_cache[key], x)


def saw(f, t, phase=0.0):
    return 2 * ((f * t + phase) % 1.0) - 1


def square(f, t, duty=0.5):
    return np.where(((f * t) % 1.0) < duty, 1.0, -1.0)


def tri(f, t):
    return 2 * np.abs(2 * ((f * t) % 1.0) - 1) - 1


class Mix:
    def __init__(self, seconds):
        self.n = int(seconds * SR) + SR * 4
        self.buses = {}

    def bus(self, name):
        if name not in self.buses:
            self.buses[name] = np.zeros((2, self.n))
        return self.buses[name]

    def add(self, name, start, mono, gain=1.0, pan=0.0, stereo=None):
        b = self.bus(name)
        i = int(start * SR)
        if i >= self.n:
            return
        if stereo is not None:
            L, R = stereo
            m = min(len(L), self.n - i)
            b[0, i:i + m] += L[:m] * gain
            b[1, i:i + m] += R[:m] * gain
            return
        m = min(len(mono), self.n - i)
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        b[0, i:i + m] += mono[:m] * gain * l * 1.414
        b[1, i:i + m] += mono[:m] * gain * r * 1.414


# ---------------------------------------------------------------- instruments
rng_global = np.random.default_rng(1)
NOISE = rng_global.standard_normal(SR * 3)


def noise(n, rng=None):
    if n <= len(NOISE):
        o = rng.integers(0, len(NOISE) - n) if rng is not None else 0
        return NOISE[o:o + n]
    return rng_global.standard_normal(n)


def kick(punch=1.0, dec=0.38, f0=160, f1=46, click=0.35):
    n = int((dec * 2.2) * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    ph = np.cumsum(f) / SR
    x = np.sin(TAU * ph) * np.exp(-t / dec)
    x += click * highpass(noise(n) * np.exp(-t / 0.004), 1500)
    return np.tanh(x * 1.6 * punch) * 0.9


def snare(tone=190, dec=0.17, bright=1.0, rng=None):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    nz = bandpass(noise(n, rng), 1200, 7000) * np.exp(-t / dec) * bright
    body = np.sin(TAU * tone * t) * np.exp(-t / 0.06) * 0.6
    return (nz * 0.9 + body) * 0.8


def clap(rng=None):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    e = np.zeros(n)
    for k, o in enumerate([0, 0.011, 0.022]):
        i = int(o * SR)
        e[i:] += np.exp(-(t[:n - i]) / (0.008 if k < 2 else 0.14))
    return bandpass(noise(n, rng), 900, 5000) * e * 0.8


def hat(open_=False, rng=None, bright=8000):
    dec = 0.22 if open_ else 0.035
    n = int((dec * 4 + 0.02) * SR)
    t = np.arange(n) / SR
    return highpass(noise(n, rng), bright) * np.exp(-t / dec) * 0.55


def cowbell(midi, dur=0.35):
    t = t_arr(dur)
    f = mtof(midi)
    x = square(f, t) + square(f * 1.48, t)
    x = bandpass(x, f * 0.9, min(f * 3.5, 16000)) * (0.75 * np.exp(-t / 0.05) + 0.25 * np.exp(-t / 0.25))
    return x * 0.5


def bass808(midi, dur, drive=1.6, glide_from=None):
    t = t_arr(dur + 0.25)
    f = mtof(midi) * (1 + 1.4 * np.exp(-t / 0.03))
    if glide_from is not None:
        f = f * (mtof(glide_from) / mtof(midi)) ** np.exp(-t / 0.08)
    ph = np.cumsum(f) / SR
    e = np.minimum(1, t / 0.003) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.05)) * np.exp(-t / (dur * 1.6 + 0.2))
    return np.tanh(np.sin(TAU * ph) * drive) * e * 0.9


def subbass(midi, dur, cut=420, sub=0.6):
    t = t_arr(dur + 0.12)
    f = mtof(midi)
    x = lowpass(saw(f, t) * 0.6, cut) + np.sin(TAU * f * t) * sub
    e = env_adsr(len(t), 0.005, 0.12, 0.8, 0.06, dur)
    return x * e * 0.7


def supersaw(midi, dur, cut=2200, voices=5, det=0.12, a=0.01, r=0.3, s=0.8, rng=None):
    t = t_arr(dur + r * 1.5)
    f = mtof(midi)
    L = np.zeros(len(t))
    R = np.zeros(len(t))
    for v in range(voices):
        d = (v - (voices - 1) / 2) / max(1, (voices - 1) / 2) * det
        ff = f * 2 ** (d / 12)
        ph = (rng.random() if rng is not None else v * 0.37)
        w = saw(ff, t, ph)
        pan = (v / max(1, voices - 1)) * 2 - 1
        L += w * (1 - pan) * 0.5
        R += w * (1 + pan) * 0.5
    e = env_adsr(len(t), a, 0.2, s, r, dur)
    L = lowpass(L, cut) * e / voices * 1.6
    R = lowpass(R, cut) * e / voices * 1.6
    return L, R


def epiano(midi, dur, vel=0.8, bright=1.0):
    """FM electric piano (Rhodes-like): bell-ish attack, warm sustain, gentle tremolo"""
    rel = 0.35
    t = t_arr(dur + rel)
    f = mtof(midi)
    idx = (2.4 * bright) * np.exp(-t / 0.18) + 0.25
    mod = np.sin(TAU * f * t) * idx
    car = np.sin(TAU * f * t + mod)
    tine = np.sin(TAU * f * 7.0 * t) * np.exp(-t / 0.02) * 0.15 * bright
    e = np.exp(-t / (1.4 + 40 / max(f, 40))) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.08))
    trem = 1 + 0.12 * np.sin(TAU * 4.5 * t)
    return (car + tine) * e * vel * 0.45 * trem


def piano(midi, dur, vel=0.8):
    rel = 0.5
    t = t_arr(dur + rel)
    f = mtof(midi)
    B = 0.0004
    x = np.zeros(len(t))
    for h in range(1, 9):
        fh = f * h * np.sqrt(1 + B * h * h)
        if fh > 15000:
            break
        x += np.sin(TAU * fh * t + h) * (1 / h ** 1.25) * np.exp(-t * (0.6 + h * 0.55) * (f / 300) ** 0.35)
    ham = lowpass(noise(len(t)) * np.exp(-t / 0.004), 3000) * 0.08
    e = np.where(t < dur, 1, np.exp(-(t - dur) / 0.12)) * np.minimum(1, t / 0.002)
    return (x + ham) * e * vel * 0.42


def pluck(midi, dur, bright=0.5, rng=None):
    """Karplus-Strong string"""
    f = mtof(midi)
    N = max(2, int(SR / f))
    n = int((dur + 0.4) * SR)
    exc = np.zeros(n)
    burst = noise(N, rng)
    exc[:N] = lowpass(burst, 2000 + bright * 8000)
    g = 0.996 - (1 - bright) * 0.004
    a = np.zeros(N + 2)
    a[0] = 1
    a[N] = -0.5 * g
    a[N + 1] = -0.5 * g
    y = signal.lfilter([1.0], a, exc)
    e = np.where(np.arange(n) / SR < dur, 1, np.exp(-(np.arange(n) / SR - dur) / 0.07))
    return y * e * 0.6


def pulse_lead(midi, dur, duty=0.25, vib=0.0, a=0.003, r=0.05, cut=6000):
    t = t_arr(dur + r * 2)
    f = mtof(midi) * (1 + vib * np.sin(TAU * 5.5 * t) * np.minimum(1, t / 0.25))
    ph = np.cumsum(f) / SR
    x = np.where((ph % 1) < duty, 1.0, -1.0)
    x = lowpass(x, cut)
    return x * env_adsr(len(t), a, 0.08, 0.7, r, dur) * 0.3


def saw_lead(midi, dur, cut=3500, vib=0.006, a=0.01, r=0.12, det=0.08):
    t = t_arr(dur + r * 2)
    f = mtof(midi) * (1 + vib * np.sin(TAU * 5.2 * t) * np.minimum(1, t / 0.3))
    ph = np.cumsum(f) / SR
    ph2 = np.cumsum(f * 2 ** (det / 12)) / SR
    x = (2 * (ph % 1) - 1) + (2 * (ph2 % 1) - 1)
    x = lowpass(x, cut)
    return x * env_adsr(len(t), a, 0.1, 0.8, r, dur) * 0.22


def strings(midi, dur, cut=2600, rng=None):
    L, R = supersaw(midi, dur, cut=cut, voices=6, det=0.16, a=0.18, r=0.5, s=0.9, rng=rng)
    return L, R


def brass(midi, dur, cut0=500, cut1=2600):
    t = t_arr(dur + 0.25)
    f = mtof(midi)
    x = saw(f, t) + saw(f * 1.003, t, 0.3)
    # filter swell: split into chunks with rising cutoff
    out = np.zeros(len(t))
    ch = 2048
    for i in range(0, len(t), ch):
        k = min(1, (i / SR) / 0.12)
        out[i:i + ch] = lowpass(x[i:i + ch], cut0 + (cut1 - cut0) * k, 1)
    return out * env_adsr(len(t), 0.04, 0.2, 0.85, 0.2, dur) * 0.22


def sine_pad(midi, dur):
    t = t_arr(dur + 0.8)
    f = mtof(midi)
    x = np.sin(TAU * f * t) + 0.3 * np.sin(TAU * f * 2 * t) + 0.15 * np.sin(TAU * f * 3.01 * t)
    return x * env_adsr(len(t), 0.4, 0.5, 0.8, 0.8, dur) * 0.18


# ---------------------------------------------------------------- effects
def make_ir(seconds, damp=6000, seed=3, predelay=0.012):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    pd = int(predelay * SR)
    out = []
    for ch in range(2):
        x = r.standard_normal(n) * np.exp(-t / (seconds / 6.9))
        x = lowpass(x, damp)
        x = np.concatenate([np.zeros(pd), x])
        out.append(x / np.sqrt(np.sum(x ** 2)) * 0.9)
    return out


def reverb(st, ir):
    L = signal.fftconvolve(st[0], ir[0])[:st.shape[1]]
    R = signal.fftconvolve(st[1], ir[1])[:st.shape[1]]
    return np.vstack([L, R])


def delay(st, time, fb=0.35, mix=0.3, cross=True):
    d = int(time * SR)
    out = np.zeros_like(st)
    g = mix
    for k in range(1, 7):
        sh = d * k
        if sh >= st.shape[1]:
            break
        if cross and k % 2:
            out[0, sh:] += st[1, :-sh] * g
            out[1, sh:] += st[0, :-sh] * g
        else:
            out[:, sh:] += st[:, :-sh] * g
        g *= fb
    return st + lowpass(out[0], 5000)[None, :] * np.array([[1], [0]]) + lowpass(out[1], 5000)[None, :] * np.array([[0], [1]])


def sidechain_env(n, times, depth=0.7, rel=0.18):
    e = np.ones(n)
    tl = np.arange(int(rel * 3 * SR)) / SR
    curve = 1 - depth * np.exp(-tl / (rel / 2.2))
    for t in times:
        i = int(t * SR)
        m = min(len(curve), n - i)
        if m > 0:
            e[i:i + m] = np.minimum(e[i:i + m], curve[:m])
    return e


def vinyl(n, seed=5, amount=1.0):
    r = np.random.default_rng(seed)
    hiss = lowpass(highpass(r.standard_normal(n), 2000), 9000) * 0.004
    cr = np.zeros(n)
    k = int(n / SR * 9)
    pos = r.integers(0, n - 200, k)
    for p in pos:
        L = r.integers(20, 120)
        cr[p:p + L] += r.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * r.uniform(0.02, 0.12)
    rumble = lowpass(r.standard_normal(n), 60) * 0.02
    x = (hiss + highpass(cr, 800) + rumble) * amount
    return np.vstack([x, np.roll(x, 37)])


def rain(n, seed=9):
    r = np.random.default_rng(seed)
    x = lowpass(highpass(r.standard_normal(n), 400), 6000) * 0.02
    drops = np.zeros(n)
    for p in r.integers(0, n - 400, int(n / SR * 40)):
        L = 300
        drops[p:p + L] += r.standard_normal(L) * np.exp(-np.arange(L) / 40) * r.uniform(0.01, 0.05)
    x = x + bandpass(drops, 1500, 8000)
    return np.vstack([x, np.roll(x, 911)])


def master(st, drive=1.15, target=-1.0, lofi=False):
    st = st - np.mean(st, axis=1, keepdims=True)
    if lofi:
        st = np.vstack([lowpass(st[0], 9000), lowpass(st[1], 9000)])
    # gentle glue: soft clip after normalising
    peak = np.max(np.abs(st)) + 1e-9
    st = st / peak * 0.95
    st = np.tanh(st * drive) / np.tanh(drive)
    peak = np.max(np.abs(st)) + 1e-9
    st = st / peak * (10 ** (target / 20))
    return st
