"""Three independent original instrumental worlds, synthesized at 48 kHz.

No samples, network calls, old score templates, mastering, or playback.
Public API: compose(track_id, duration, bpm, genre) -> (Nx2 float32, metadata).
"""
from functools import lru_cache
import hashlib
import math
import numpy as np

RATE = 48_000
TAU = 2 * math.pi


def _hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def _unit(x):
    return x / max(float(np.max(np.abs(x))), 1e-9)


def _edge(x, attack=.002, release=.008):
    x = np.asarray(x, dtype=np.float64).copy()
    n = len(x)
    a, r = min(n, round(attack * RATE)), min(n, round(release * RATE))
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if r:
        x[-r:] *= np.linspace(1, 0, r)
    return x


def _band(x, lo=0, hi=10_000):
    f = np.fft.rfftfreq(len(x), 1 / RATE)
    response = 1 / (1 + (f / hi) ** 6)
    if lo:
        response *= (f / lo) ** 4 / (1 + (f / lo) ** 4)
    return np.fft.irfft(np.fft.rfft(x) * response, n=len(x))


def _put(bus, source, at, gain=1, pan=0):
    start = round(at * RATE)
    source = np.asarray(source)
    if start < 0:
        source = source[-start:]
        start = 0
    count = min(len(source), len(bus) - start)
    if count <= 0:
        return
    if source.ndim == 1:
        angle = (np.clip(pan, -1, 1) + 1) * math.pi / 4
        bus[start:start + count, 0] += source[:count] * gain * math.cos(angle)
        bus[start:start + count, 1] += source[:count] * gain * math.sin(angle)
    else:
        bus[start:start + count] += source[:count] * gain


def _analog(note, duration, phase=0, cutoff=1800, square=False, detune=0):
    f = _hz(note) * 2 ** (detune / 1200)
    t = np.arange(round(duration * RATE)) / RATE
    result = np.zeros(len(t))
    for h in range(1, min(24, int(12_000 / f)) + 1):
        if square and h % 2 == 0:
            continue
        weight = (1 / h) / (1 + (h * f / cutoff) ** 4)
        result += weight * np.sin(TAU * f * h * t + phase * h)
    return result


@lru_cache(maxsize=96)
def _jungle_drum(kind, variant=0):
    rng = np.random.default_rng(4100 + variant)
    duration = {"kick": .29, "snare": .27, "ghost": .13, "hat": .075}[kind]
    t = np.arange(round(duration * RATE)) / RATE
    if kind == "kick":
        phase = TAU * (45 * t + 70 * .018 * (1 - np.exp(-t / .018)))
        x = np.sin(phase) * np.exp(-t * 17)
        x += _band(rng.normal(size=len(t)), 1200, 5000) * np.exp(-t * 150) * .15
    elif kind in ("snare", "ghost"):
        # Tight break-kit head, wire rattle and a tiny flam; no pop clap layer.
        noise = _band(rng.normal(size=len(t)), 800, 10_500)
        wire = noise * np.exp(-t * (24 if kind == "snare" else 43))
        shell = (.45 * np.sin(TAU * 188 * t) + .18 * np.sin(TAU * 335 * t)) * np.exp(-t * 35)
        x = wire * .85 + shell
        d = round(.009 * RATE)
        x[d:] += noise[:-d] * np.exp(-t[:-d] * 65) * .15
    else:
        x = _band(rng.normal(size=len(t)), 5500, 13_000) * np.exp(-t * 87)
    return _edge(_unit(x))


def _jungle(duration, bpm, rng):
    bus = np.zeros((round(duration * RATE), 2))
    beat, sixteenth = 60 / bpm, 60 / bpm / 4
    bar = beat * 4
    # Build our own two-bar break, then physically cut/reorder its sixteenths.
    phrase = np.zeros((round((bar * 2 + .3) * RATE), 2))
    for b in range(2):
        at = b * bar
        for p in ([0, 1.5, 2.75] if b == 0 else [0, .75, 2, 3.5]):
            _put(phrase, _jungle_drum("kick"), at + p * beat, .48)
        for p in [1, 3]:
            _put(phrase, _jungle_drum("snare", b), at + p * beat, .36)
        for k, p in enumerate([.75, 1.75, 2.5, 3.5, 3.75]):
            _put(phrase, _jungle_drum("ghost", k), at + p * beat, .075 + .015 * (k % 2), -.16)
        for k in range(8):
            _put(phrase, _jungle_drum("hat", k), at + k * beat / 2, .055 + .025 * (k % 2), (-1) ** k * .35)
    patterns = [
        list(range(16)),
        list(range(16, 32)),
        [0, 1, 6, 7, 4, 5, 10, 11, 8, 9, 12, 4, 12, 4, 14, 4],
        [16, 17, 18, 19, 20, 21, None, None, 24, 25, None, None, 28, 29, 30, 31],
        [0, 1, 2, 3, 4, 5, 6, 7, 24, 25, 26, 27, 28, 29, 4, 4],
        [16, 17, 18, 19, 20, 21, 22, 23, 8, 9, 10, 11, 12, 13, 14, 15],
        [0, 1, 2, 3, 4, 5, 4, 7, 8, 9, 10, 4, 12, 13, 4, 4],
    ]
    for b in range(math.ceil(duration / bar)):
        pattern = patterns[b % len(patterns)]
        for k, source_index in enumerate(pattern):
            if source_index is None:
                continue
            start = round(source_index * sixteenth * RATE)
            end = round((source_index + 1) * sixteenth * RATE)
            chunk = phrase[start:end].copy()
            fade = min(35, len(chunk) // 2)
            chunk[:fade] *= np.linspace(0, 1, fade)[:, None]
            chunk[-fade:] *= np.linspace(1, 0, fade)[:, None]
            _put(bus, chunk, b * bar + k * sixteenth)
        root = [28, 28, 31, 26, 28, 33, 31, 26][b % 8]
        for k, offset in enumerate([0, .75, 2.25, 3.25]):
            if b == 3 and offset in (.75, 2.25):
                continue
            length = [.39, .22, .45, .2][k]
            t = np.arange(round(length * RATE)) / RATE
            f = _hz(root + (12 if k == 3 else 0))
            frequency = f * (1 + .35 * np.exp(-t / .025))
            phase = TAU * np.cumsum(frequency) / RATE
            sub = (np.sin(phase) + .16 * np.sin(phase * 2)) * np.minimum(1, t / .009) * np.exp(-t * 2.5)
            _put(bus, _edge(sub, .002, .035), b * bar + offset * beat, .27)
    for at, chord in [(0.04, [52, 55, 59, 66]), (2 * bar, [55, 59, 62, 69]), (4 * bar + beat, [52, 55, 59, 66]), (6 * bar + 2 * beat, [50, 53, 57, 64]), (8 * bar + .05, [52, 55, 59, 66])]:
        for i, note in enumerate(chord):
            x = _analog(note, .23, phase=rng.uniform(0, TAU), cutoff=2100)
            t = np.arange(len(x)) / RATE
            x = _edge(x * np.exp(-t * 17), .003, .025)
            _put(bus, x, at, .055, (i - 1.5) * .4)
            _put(bus, x, at + beat * .75, .012, -(i - 1.5) * .4)
    return bus, {
        "cueTimes": [0, round(3 * bar, 3), round(4 * bar, 3), round(8 * bar, 3), min(duration - .4, round(9 * bar, 3))],
        "arrangement": ["0s: full chopped break, kick and sub immediately", "three bars of rolling ghost-snare edits", "fourth bar removes two slices and bass answers", "bass changes beneath a different cut on every bar", "final bars recycle snare fragments rather than a pop drop/stinger"],
        "palette": ["original synthetic break-kit cut into sixteenths", "dry head/wire ghost snares", "round sliding sub", "sparse minor-ninth organ chops"],
        "meter": "4/4, 168 BPM, asymmetric sixteenth break slicing",
        "introSignature": "A complete fast broken drum pattern begins on sample zero; snare hits inside the first half-second with sub and a short jazzy chord chop.",
    }


@lru_cache(maxsize=16)
def _night_drum(kind):
    rng = np.random.default_rng(940 + len(kind))
    duration = {"kick": .42, "snare": .32, "hat": .12}[kind]
    t = np.arange(round(duration * RATE)) / RATE
    if kind == "kick":
        x = np.sin(TAU * (43 * t + 44 * .035 * (1 - np.exp(-t / .035)))) * np.exp(-t * 12)
        x += .065 * _band(rng.normal(size=len(t)), 500, 1700) * np.exp(-t * 80)
    elif kind == "snare":
        room = _band(rng.normal(size=len(t)), 450, 7600)
        x = .47 * np.sin(TAU * 168 * t) * np.exp(-t * 16) + room * np.exp(-t * 9) * .64
        # A broad, gated room body; abrupt gate only after its short smooth release.
        for seconds, amount in [(.052, .28), (.083, .22), (.119, .16)]:
            d = round(seconds * RATE)
            x[d:] += room[:-d] * np.exp(-t[:-d] * 12) * amount
        gate = np.minimum(1, np.maximum(0, (.265 - t) / .025))
        x *= gate
    else:
        x = _band(rng.normal(size=len(t)), 4300, 10_000) * np.exp(-t * 45)
    return _edge(_unit(x), .002, .012)


def _night(duration, bpm, rng):
    bus = np.zeros((round(duration * RATE), 2))
    beat, bar = 60 / bpm, 240 / bpm
    chords = [[45, 52, 55, 60], [41, 48, 52, 57], [48, 55, 59, 62], [43, 50, 55, 57]]
    for b in range(math.ceil(duration / bar)):
        at = b * bar
        chord = chords[b % 4]
        length = min(bar + .7, duration - at + .2)
        t = np.arange(round(length * RATE)) / RATE
        env = np.minimum(1, t / .12) * np.minimum(1, np.maximum(0, (length - t) / .7))
        for i, note in enumerate(chord):
            phase = rng.uniform(0, TAU)
            l = _analog(note + 12, length, phase, 1250, detune=-7)
            r = _analog(note + 12, length, phase + .31, 1250, detune=7)
            ensemble = np.column_stack([l, r]) * env[:, None]
            ensemble *= (1 + .045 * np.sin(TAU * .3 * t))[:, None]
            _put(bus, ensemble, at, .052)
        for off in ([0, 2] if b != 2 else [0]):
            _put(bus, _night_drum("kick"), at + off * beat, .47)
        for off in ([1, 3] if b != 2 else [3]):
            snare = _night_drum("snare")
            _put(bus, snare, at + off * beat, .30)
            _put(bus, snare, at + off * beat + .018, .08, .8)
            _put(bus, snare, at + off * beat + .026, .08, -.8)
        for k in range(8):
            _put(bus, _night_drum("hat"), at + k * beat / 2, .035, (-1) ** k * .55)
            note = chord[0] - 12 + ([0, 0, 7, 0, 12, 7, 0, 7][k])
            length_bass = beat * (.7 if k in (2, 6) else .43)
            bt = np.arange(round(length_bass * RATE)) / RATE
            bass = _analog(note, length_bass, .15, 520, square=True)
            bass *= np.minimum(1, bt / .012) * np.exp(-bt * 4)
            _put(bus, _edge(bass, .006, .035), at + k * beat / 2, .19)
        arp_notes = [chord[0] + 24, chord[1] + 24, chord[2] + 24, chord[3] + 24]
        for k in range(8):
            length_arp = .37
            nt = np.arange(round(length_arp * RATE)) / RATE
            arp = _analog(arp_notes[(k + b) % 4], length_arp, .7, 2200, square=True)
            arp = _edge(arp * np.exp(-nt * 11), .006, .045)
            pan = -.65 if k % 2 == 0 else .65
            _put(bus, arp, at + k * beat / 2, .051 if b != 2 else .022, pan)
            _put(bus, arp, at + k * beat / 2 + beat * .75, .019, -pan)
    # One long answer phrase in the second half, rather than a riser/drop.
    for at, note, length in [(3 * bar, 76, .95), (3 * bar + beat * 1.75, 74, .7), (4 * bar, 72, 1.05), (4 * bar + beat * 2, 71, .85)]:
        t = np.arange(round(length * RATE)) / RATE
        phase = TAU * _hz(note) * t + .035 * np.sin(TAU * 5.1 * t)
        lead = (np.sin(phase) + .19 * np.sin(phase * 2)) * np.minimum(1, t / .06)
        lead *= np.minimum(1, np.maximum(0, (length - t) / .22))
        _put(bus, lead, at, .11, -.16)
        _put(bus, lead, at + beat * .75, .032, .5)
    return bus, {
        "cueTimes": [0, round(2 * bar, 3), round(3 * bar, 3), round(5 * bar, 3)],
        "arrangement": ["immediate wide analog minor-seventh chord and low pulse", "slow half-time-feeling road groove with gated room snare", "third bar holds the harmony and removes a kick/snare", "a sustained answering lead enters after the cruising space", "last partial bar lets its harmony dissolve, no EDM drop"],
        "palette": ["wide detuned analog saw ensemble", "low warm pulse bass", "large gated room snare", "stereo eighth-note square arpeggio", "restrained sine lead"],
        "meter": "4/4, 94 BPM, slow kick on 1/3 and gated snare on 2/4",
        "introSignature": "Wide left/right detuned chord, warm low pulse and a spacious arpeggio start immediately; the first large gated snare arrives at 0.64s.",
    }


def _string(note, duration, seed, pick=.21):
    rng = np.random.default_rng(seed)
    frequency = _hz(note)
    delay = max(12, round(RATE / frequency - .5))
    excitation = rng.normal(size=delay)
    excitation -= np.roll(excitation, max(1, round(delay * pick)))
    # A physical delay-loop pluck with energy loss at each round trip.
    state = _unit(excitation)
    count = round(duration * RATE)
    result = np.empty(count)
    cursor = 0
    while cursor < count:
        n = min(delay, count - cursor)
        result[cursor:cursor + n] = state[:n]
        state = .996 * (state + np.roll(state, 1)) * .5
        cursor += n
    t = np.arange(count) / RATE
    return _edge(result * np.exp(-t * 1.3), .001, .012)


@lru_cache(maxsize=128)
def _guitar(root, length, side, palm):
    x = np.zeros(round(length * RATE))
    for k, (note, gain) in enumerate([(root, 1), (root + 7, .85), (root + 12, .62)]):
        v = _string(note, length, 14800 + root * 31 + side * 113 + k * 7, .18 + side * .035)
        d = round((.0014 * k + .0006 * side) * RATE)
        x[d:] += v[:len(x) - d] * gain
    if palm:
        t = np.arange(len(x)) / RATE
        x *= np.exp(-t * 17)
    # Nonlinear amp and a dark cabinet, applied to a power chord, not a saw pluck.
    x = np.tanh(x * 4.8) + .10 * np.tanh(x * 10)
    x = _band(x, 85, 3900 if palm else 4600)
    return _edge(_unit(x), .001, .018)


@lru_cache(maxsize=24)
def _punk_drum(kind, variant=0):
    rng = np.random.default_rng(1480 + variant * 17 + len(kind))
    duration = {"kick": .28, "snare": .24, "hat": .085, "crash": 1.3, "tom": .3}[kind]
    t = np.arange(round(duration * RATE)) / RATE
    if kind == "kick":
        x = np.sin(TAU * (48 * t + 52 * .022 * (1 - np.exp(-t / .022)))) * np.exp(-t * 17)
        x += _band(rng.normal(size=len(t)), 900, 3500) * np.exp(-t * 160) * .23
    elif kind == "snare":
        x = .62 * np.sin(TAU * 212 * t) * np.exp(-t * 28)
        x += _band(rng.normal(size=len(t)), 1300, 10_000) * np.exp(-t * 22)
    elif kind == "tom":
        frequency = [142, 112, 88][variant % 3]
        x = np.sin(TAU * (frequency * t + 20 * .035 * (1 - np.exp(-t / .035)))) * np.exp(-t * 14)
        x += .08 * rng.normal(size=len(t)) * np.exp(-t * 75)
    else:
        noise = _band(rng.normal(size=len(t)), 2400 if kind == "crash" else 6000, 13_000)
        metal = sum(np.sin(TAU * 2210 * ratio * t + ratio) for ratio in [1, 1.421, 1.937, 2.739]) / 4
        x = (noise * .8 + metal * .24) * np.exp(-t * (3.7 if kind == "crash" else 66))
    return _edge(_unit(x), .001, .015)


def _punk(duration, bpm, rng):
    bus = np.zeros((round(duration * RATE), 2))
    beat, bar = 60 / bpm, 240 / bpm
    roots = [40, 40, 43, 45, 40, 38, 43, 38, 40]
    for b in range(math.ceil(duration / bar)):
        at = b * bar
        root = roots[b % len(roots)]
        stop_time, ending = b == 3, b == 8
        if b in [0, 4, 6, 8]:
            crash = _punk_drum("crash", b % 3)
            _put(bus, crash, at, .16, -.48)
            _put(bus, crash, at + .012, .10, .65)
        for off in ([0, 2] if stop_time else [0, 1.5, 2, 3.5]):
            if ending and off != 0:
                continue
            _put(bus, _punk_drum("kick"), at + off * beat, .48)
        for off in ([1, 3] if not ending else [1]):
            _put(bus, _punk_drum("snare", b % 2), at + off * beat + .003, .39)
        if not ending:
            for k in range(8):
                _put(bus, _punk_drum("hat", k % 2), at + k * beat / 2 + .002 * (k % 2), .055 + .02 * (k % 2), -.28)
        for k in ([0, 4] if stop_time else ([0] if ending else range(8))):
            open_chord = k == 0 or (b >= 4 and k in [3, 6])
            length = min(duration - at + .05, 1.1) if ending else (.49 if open_chord else .17)
            note = root + (2 if b in [4, 6] and k in [3, 5] else 0)
            for side in [0, 1]:
                guitar = _guitar(note, round(length, 4), side, not open_chord)
                _put(bus, guitar, at + k * beat / 2 + side * .009, .255 if open_chord else .225, -.86 if side == 0 else .86)
            bass = _string(note - 12, min(.29, length), 3800 + b * 17 + k, .28)
            bass = _band(np.tanh(bass * 1.5), 35, 1400)
            _put(bus, bass, at + k * beat / 2, .22)
        if b == 7:
            for j, off in enumerate([2, 2.5, 3, 3.25, 3.5, 3.75]):
                _put(bus, _punk_drum("tom", j % 3), at + off * beat, .26, -.6 + j * .22)
    return bus, {
        "cueTimes": [0, round(3 * bar, 3), round(4 * bar, 3), round(7 * bar, 3), round(8 * bar, 3)],
        "arrangement": ["first sample: low power chord, kick and crash", "three bars of double-tracked eighth-note downstrokes", "one stop-time bar with two guitar punches", "answer riff uses open chords and a moving bass", "descending acoustic-style tom fill leads to a held final power chord"],
        "palette": ["independent left/right Karplus-Strong power-chord guitars", "nonlinear amplifier and dark cabinet", "picked low electric-style bass", "straight rock kick/snare", "inharmonic crash cymbals", "descending tom fill"],
        "meter": "4/4, 148 BPM, straight rock backbeat and eighth-note guitar strokes",
        "introSignature": "A distorted root/fifth/octave guitar chord hits with kick and crash immediately; a second independently plucked guitar is 9ms later in the opposite speaker.",
    }


def compose(track_id, duration, bpm, genre):
    expected = {
        "web-testing": (168, "jungle-breaks"),
        "mobile-testing": (94, "night-synthwave"),
        "elys-code-development": (148, "electro-punk"),
    }
    if track_id not in expected or (bpm, genre) != expected[track_id]:
        raise ValueError("score_kinetic: track/tempo/genre does not match its frozen arrangement")
    if not math.isfinite(duration) or abs(duration - 14) > .025:
        raise ValueError("score_kinetic: all three films retain 14-second arrangements")
    seed = int.from_bytes(hashlib.sha256((track_id + genre).encode()).digest()[:8], "little")
    rng = np.random.default_rng(seed)
    renderer = {"jungle-breaks": _jungle, "night-synthwave": _night, "electro-punk": _punk}[genre]
    audio, details = renderer(duration, bpm, rng)
    audio -= audio.mean(axis=0, keepdims=True)
    metadata = {
        "id": track_id, "genre": genre, "duration": float(duration), "bpm": float(bpm),
        "sampleRate": RATE, **details, "listeningVerified": False,
        "synthesis": "Original NumPy synthesis; no external samples or old composition template",
        "mastering": "Unmastered floating-point stereo; normalization and delivery mastering belong to the caller",
        "rawPeak": float(np.max(np.abs(audio))),
    }
    metadata["cueTimes"] = [float(t) for t in metadata["cueTimes"] if 0 <= t < duration]
    return audio.astype(np.float32), metadata
