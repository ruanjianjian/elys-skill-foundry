"""Two original chamber/fingerstyle cues, using small CC0 instrument excerpts.

The wrapper owns loudness normalization and file encoding. This module returns
unmastered 48 kHz stereo PCM. See media/instruments/tactile/SOURCES.md.
"""
from functools import lru_cache
from pathlib import Path
import wave

import numpy as np

SR = 48000
ASSETS = Path(__file__).resolve().parents[1] / "media/instruments/tactile"
SAMPLES = {
    "piano": [(47, "piano-b2.wav"), (60, "piano-c4.wav"), (72, "piano-c5.wav")],
    "nylon": [(40, "nylon-e2.wav"), (48, "nylon-c3.wav"),
              (60, "nylon-c4.wav"), (67, "nylon-g4.wav")],
}


@lru_cache(maxsize=16)
def _read_sample(name):
    with wave.open(str(ASSETS / name), "rb") as src:
        if src.getsampwidth() != 2:
            raise ValueError("Tactile assets must be PCM16")
        pcm = np.frombuffer(src.readframes(src.getnframes()), dtype="<i2")
        pcm = pcm.reshape(-1, src.getnchannels()).mean(axis=1) / 32768.0
        rate = src.getframerate()
    return pcm, rate


def _sample(instrument, midi, length):
    root, name = min(SAMPLES[instrument], key=lambda item: abs(item[0] - midi))
    pcm, rate = _read_sample(name)
    n = max(1, round(length * SR))
    positions = np.arange(n) * (rate / SR) * 2 ** ((midi - root) / 12)
    out = np.interp(positions, np.arange(len(pcm)), pcm, right=0.0)
    # Keep the original recording's transient; only soften truncation at release.
    release = min(n, round((0.3 if instrument == "piano" else 0.09) * SR))
    out[-release:] *= np.linspace(1.0, 0.0, release) ** 1.5
    out[:min(32, n)] *= np.linspace(0.0, 1.0, min(32, n))
    return out


def _strings(midis, length):
    t = np.arange(round(length * SR)) / SR
    out = np.zeros(len(t))
    for k, midi in enumerate(midis):
        f = 440.0 * 2 ** ((midi - 69) / 12)
        for detune in (-0.0016, 0.0012):
            phase = 2 * np.pi * f * ((1 + detune) * t + 0.00013 * np.sin(2 * np.pi * 4.7 * t + k))
            for harmonic in range(1, 7):
                out += np.sin(phase * harmonic + k * 0.9) / harmonic ** 1.7
    envelope = np.minimum(t / 0.85, 1.0) * np.minimum((length - t) / 1.25, 1.0)
    return out * np.clip(envelope, 0, 1) / (2 * len(midis))


def _conga(rng, low=False, mute=False):
    length = 0.14 if mute else 0.32
    t = np.arange(round(length * SR)) / SR
    f = 165 if low else 228
    phase = 2 * np.pi * f * (t + 0.0018 * (1 - np.exp(-t * 60)))
    out = (np.sin(phase) * np.exp(-t * (27 if mute else 12))
           + 0.45 * np.sin(phase * 1.59 + 0.3) * np.exp(-t * 24)
           + 0.15 * np.sin(phase * 2.12) * np.exp(-t * 42))
    noise = rng.standard_normal(len(t))
    noise -= np.roll(noise, 1)
    out += noise * np.exp(-t * 150) * (0.12 if mute else 0.045)
    out[:32] *= np.linspace(0, 1, 32)
    out[-128:] *= np.linspace(1, 0, 128)
    return out


def _shaker(rng, accent=False):
    t = np.arange(round(0.105 * SR)) / SR
    noise = rng.standard_normal(len(t))
    bright = noise - 0.8 * np.roll(noise, 1)
    envelope = (1 - np.exp(-t * 1400)) * np.exp(-t * (52 if accent else 70))
    return bright * envelope * 0.35


def _room(audio, taps):
    dry = audio.copy()
    for delay, level, cross in taps:
        offset = round(delay * SR)
        if offset < len(audio):
            source = dry[:-offset, ::-1] if cross else dry[:-offset]
            audio[offset:] += source * level
    return audio


def compose(track_id, duration, bpm, genre):
    """Return deterministic stereo float32 PCM and JSON-safe cue metadata."""
    if genre not in ("minimal-piano", "bossa-courier"):
        raise ValueError(f"Unsupported tactile genre: {genre}")
    if duration <= 0 or bpm <= 0:
        raise ValueError("duration and bpm must be positive")
    audio = np.zeros((round(duration * SR), 2), dtype=np.float64)
    beat = 60.0 / bpm
    rng = np.random.default_rng(41776 if genre == "minimal-piano" else 540108)
    event_count = 0

    def put(at, signal, gain=1.0, pan=0.0):
        nonlocal event_count
        start = round(at * SR)
        if start < 0 or start >= len(audio):
            return
        count = min(len(signal), len(audio) - start)
        angle = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        audio[start:start + count, 0] += signal[:count] * gain * np.cos(angle)
        audio[start:start + count, 1] += signal[:count] * gain * np.sin(angle)
        event_count += 1

    def note(instrument, midi, at, length, gain, pan):
        put(at, _sample(instrument, midi, length), gain, pan)

    if genre == "minimal-piano":
        bar = 3 * beat
        # Independent three-beat phrases, open fifths and major seconds. The
        # fourth bar deliberately receives no new note: space is part of cue.
        phrases = [
            (0.0, 62, 4.0, 0.70), (1.5, 69, 3.0, 0.37),
            (3.0, 47, 4.5, 0.40), (3.14, 66, 3.8, 0.47),
            (5.0, 73, 3.0, 0.34), (6.0, 55, 4.5, 0.43),
            (7.5, 69, 3.7, 0.36), (8.0, 71, 3.2, 0.27),
            (12.0, 52, 3.7, 0.43), (12.12, 66, 3.5, 0.39),
            (13.5, 71, 2.6, 0.30), (15.0, 57, 3.3, 0.36),
            (16.0, 64, 3.1, 0.31), (17.0, 69, 2.6, 0.27),
            (18.1, 62, 1.65, 0.47), (18.18, 73, 1.65, 0.24),
        ]
        for position, midi, length, gain in phrases:
            note("piano", midi, position * beat + 0.055,
                 length, gain, np.clip((midi - 62) / 42, -0.5, 0.5))
        put(2 * bar + 0.2, _strings([55, 62, 69], 3.4), 0.022, -0.27)
        put(4 * bar + 0.15, _strings([52, 59, 66], 4.0), 0.026, 0.3)
        audio = _room(audio, [(0.041, 0.12, False), (0.083, 0.10, True),
                              (0.157, 0.08, True), (0.281, 0.055, False),
                              (0.437, 0.045, True), (0.673, 0.028, True)])
        metadata = {
            "meter": "3/4",
            "introSignature": "One soft recorded upright-piano D, then a high A across a long decay; no drums",
            "palette": ["CC0 recorded Upright Piano KW", "quiet six-partial bowed-string ensemble", "open stereo room"],
            "cueTimes": [0.055, round(2 * bar, 4), round(3 * bar, 4), round(4 * bar, 4), round(18.1 * beat, 4)],
            "arrangement": [
                {"at": 0.0, "description": "A single piano note opens into a slow, asymmetrical three-beat question"},
                {"at": round(bar, 4), "description": "Low B and a soft upper answer; long real-string decays"},
                {"at": round(2 * bar, 4), "description": "A very quiet bowed layer enters under the open G voicing"},
                {"at": round(3 * bar, 4), "description": "A full measure without new attacks, leaving room and decay"},
                {"at": round(4 * bar, 4), "description": "A new low register answer returns; final open D/add9 decays"},
            ],
        }
    else:
        bar = 4 * beat
        # Bossa fingerstyle: alternating thumb bass, syncopated rolled treble
        # chords, and a small chromatic turnaround rather than a pop/drop form.
        chords = [([50, 57, 60, 64, 69], 38, 45),
                  ([53, 59, 64, 69], 43, 50),
                  ([52, 59, 62, 67], 36, 43),
                  ([55, 61, 64, 70], 45, 40),
                  ([53, 57, 60, 64], 38, 45),
                  ([53, 59, 64, 68], 43, 50),
                  ([52, 57, 62, 67], 36, 43),
                  ([52, 57, 62, 67], 36, 43)]
        count_bars = int(np.ceil(duration / bar))
        for section in range(count_bars):
            chord, root, fifth = chords[section % len(chords)]
            start = section * bar + 0.025
            note("nylon", root, start, 0.83, 0.57, -0.23)
            note("nylon", fifth, start + 2 * beat + 0.009, 0.73, 0.47, -0.18)
            # Reverse the roll on alternating phrases; actual plucks stay separate.
            for hit, position in enumerate((0.75, 1.5, 2.75, 3.5)):
                ordered = chord if (hit + section) % 2 else chord[::-1]
                for index, midi in enumerate(ordered):
                    at = start + position * beat + index * 0.012 + float(rng.uniform(-0.004, 0.004))
                    note("nylon", midi, at, 0.42 if hit % 2 else 0.60,
                         (0.24 if hit % 2 else 0.31) / np.sqrt(len(chord)),
                         0.06 + (index - 2) * 0.075)
            # Hand percussion comes after the opening guitar phrase. The middle
            # measure drops shakers, preserving the guitar's syncopated pocket.
            if section >= 1:
                for position, low, mute, gain in ((0.5, False, True, 0.044),
                                                  (1.75, True, False, 0.07),
                                                  (2.5, False, True, 0.035),
                                                  (3.25, False, False, 0.055)):
                    put(start + position * beat + float(rng.uniform(-0.008, 0.008)),
                        _conga(rng, low, mute), gain, -0.3 if low else 0.27)
            if section != 4:
                for eighth in range(8):
                    put(start + eighth * 0.5 * beat + float(rng.uniform(-0.007, 0.007)),
                        _shaker(rng, eighth % 2 == 1),
                        0.014 if eighth % 2 else 0.009, 0.4)
        # Short upper-string response with rests, not a repeating lead hook.
        for at_beat, midi in ((10.25, 72), (11.25, 71), (12.75, 69),
                              (23.25, 67), (24.75, 64), (25.5, 62)):
            note("nylon", midi, at_beat * beat, 0.55, 0.24, 0.2)
        audio = _room(audio, [(0.017, 0.08, True), (0.037, 0.045, False),
                              (0.071, 0.025, True)])
        metadata = {
            "meter": "4/4 with syncopated bossa thumb-and-treble pattern",
            "introSignature": "Recorded low nylon-string thumb note, a rolled upper chord, and light shaker; immediate acoustic pocket",
            "palette": ["CC0 recorded Spanish classical guitar", "modeled hand-conga membranes", "seeded brushed shaker", "small wooden room"],
            "cueTimes": [0.025, round(bar, 4), round(2.5 * bar, 4), round(4 * bar, 4), round(5 * bar, 4), round(6 * bar, 4)],
            "arrangement": [
                {"at": 0.0, "description": "Alternating nylon thumb bass and lightly rolled syncopated chords; no drum kit"},
                {"at": round(bar, 4), "description": "Quiet open/muted conga answers the guitar offbeats"},
                {"at": round(2.5 * bar, 4), "description": "A short descending treble response crosses the chord turnaround"},
                {"at": round(4 * bar, 4), "description": "Shaker rests for one measure, exposing fingerstyle guitar and hand drums"},
                {"at": round(5 * bar, 4), "description": "Shaker returns; upper-string answer leads to an open final C6/9"},
            ],
        }
    # Only click-safe boundaries; gain and loudness are left to the wrapper.
    edge = min(round(0.008 * SR), len(audio))
    audio[:edge] *= np.linspace(0, 1, edge)[:, None]
    tail = min(round(0.18 * SR), len(audio))
    audio[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 1.4
    metadata.update({"id": str(track_id), "genre": str(genre),
                     "duration": float(duration), "bpm": float(bpm),
                     "sampleRate": SR, "eventCount": int(event_count),
                     "composition": "Original deterministic note/rhythm arrangement; instrument excerpts are CC0, not song samples",
                     "listeningVerified": False})
    metadata["cueTimes"] = [t for t in metadata["cueTimes"] if t < duration]
    metadata["arrangement"] = [a for a in metadata["arrangement"] if a["at"] < duration]
    return audio.astype(np.float32), metadata
