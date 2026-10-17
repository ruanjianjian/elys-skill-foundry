#!/usr/bin/env python3
"""Create an original 12-second, 120 BPM electronic promo beat.

Uses synthesized oscillators and seeded noise only. No samples or dependencies.
"""

import argparse
from array import array
import math
from pathlib import Path
import random
import sys
import wave


RATE = 48_000
SECONDS = 12
BPM = 120
BEAT = 60 / BPM
TAU = 2 * math.pi


def render():
    rng = random.Random(20261017)
    samples = [0.0] * (RATE * SECONDS)

    def mix(start, duration, voice, gain=1.0):
        offset = round(start * RATE)
        length = min(round(duration * RATE), len(samples) - offset)
        for index in range(max(0, length)):
            t = index / RATE
            samples[offset + index] += voice(t, index) * gain

    def kick(t, _):
        # Integrate a falling frequency, rather than abruptly switching notes.
        phase = TAU * (44 * t + 88 * 0.025 * (1 - math.exp(-t / 0.025)))
        attack = 1 - math.exp(-t * 1800)
        body = math.sin(phase) * math.exp(-t * 12)
        click = math.sin(TAU * 900 * t) * math.exp(-t * 170) * 0.045
        return attack * (body + click)

    def snare():
        filtered = 0.0

        def voice(t, _):
            nonlocal filtered
            filtered += 0.42 * (rng.uniform(-1, 1) - filtered)
            attack = min(1.0, t / 0.0015)
            noise = filtered * math.exp(-t * 24) * 0.74
            tone = math.sin(TAU * 176 * t) * math.exp(-t * 29) * 0.21
            return (noise + tone) * attack

        return voice

    def hat():
        low = 0.0
        softened = 0.0

        def voice(t, _):
            nonlocal low, softened
            raw = rng.uniform(-1, 1)
            low += 0.14 * (raw - low)
            softened += 0.48 * ((raw - low) - softened)
            return softened * math.exp(-t * 62) * min(1.0, t / 0.0008)

        return voice

    def bass(frequency, brightness):
        def voice(t, _):
            phase = TAU * frequency * t
            modulation = brightness * math.exp(-t * 14) * math.sin(phase * 2)
            fundamental = math.sin(phase + modulation)
            harmonic = math.sin(phase * 2) * 0.12
            attack = min(1.0, t / 0.005)
            release = min(1.0, max(0.0, (0.22 - t) / 0.04))
            return (fundamental + harmonic) * attack * release * math.exp(-t * 7)

        return voice

    notes = (55.0, 65.406, 82.407, 48.999)
    for beat_index in range(24):
        at = beat_index * BEAT
        act = min(3, int(at / 3))
        mix(at, 0.42, kick, 0.62 if beat_index % 4 == 0 else 0.55)
        if beat_index % 4 in (1, 3):
            mix(at, 0.22, snare(), 0.36)

        # Four 3-second acts retain the same tempo with small timbral changes.
        for subdivision in (0, 0.5):
            accent = 0.13 if subdivision == 0 else 0.095
            mix(at + subdivision * BEAT, 0.095, hat(), accent)
        if act in (1, 3) and beat_index % 4 == 3:
            mix(at + 0.75 * BEAT, 0.065, hat(), 0.07)

        note = notes[(beat_index // 2 + act) % len(notes)]
        mix(at + 0.02, 0.22, bass(note, 0.55 + act * 0.12), 0.29)
        if beat_index % 2 == 0 or act == 3:
            mix(at + 0.75 * BEAT, 0.22, bass(note * (2 if act == 2 else 1), 0.5), 0.18)

    # Quiet, rounded interval accents mark each visual scene without a riser.
    for act in range(4):
        frequency = (440, 523.251, 659.255, 587.33)[act]

        def chime(t, _, frequency=frequency):
            envelope = min(1.0, t / 0.008) * math.exp(-t * 5)
            return (math.sin(TAU * frequency * t)
                    + 0.22 * math.sin(TAU * frequency * 1.5 * t)) * envelope

        mix(act * 3 + 0.01, 0.8, chime, 0.065)

    for index in range(len(samples)):
        t = index / RATE
        fade_in = min(1.0, t / 0.015)
        fade_out = min(1.0, (SECONDS - 1 / RATE - t) / 0.3)
        samples[index] *= fade_in * max(0.0, fade_out) ** 2

    peak = max(abs(value) for value in samples) or 1.0
    scale = 0.68 * 32767 / peak
    pcm = array('h', (round(value * scale) for value in samples))
    if sys.byteorder != 'little':
        pcm.byteswap()
    return pcm


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path, help='Absolute WAV output path')
    args = parser.parse_args()
    if not args.out.is_absolute():
        parser.error('--out must be an absolute path')
    args.out.parent.mkdir(parents=True, exist_ok=True)
    pcm = render()
    with wave.open(str(args.out), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(pcm.tobytes())
    print(f'{args.out}\n{SECONDS}s · {BPM} BPM · {RATE} Hz · mono · peak 0.68')


if __name__ == '__main__':
    main()
