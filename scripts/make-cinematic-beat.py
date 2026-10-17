#!/usr/bin/env python3
"""Synthesize an original, storyboard-scored 16-second electronic rock cue.

All instruments are oscillators, seeded noise, or a synthesized plucked string.
No external audio, samples, models, packages, or network connections are used.
"""

import argparse
from array import array
import json
import math
from pathlib import Path
import random
import sys
import wave

RATE = 48_000
DURATION = 16.0
BPM = 120
BEAT = 60 / BPM
TAU = 2 * math.pi
SEED = 2026101702

CUES = [
    {"start": 0, "end": 2.5, "shot": "烦恼推进", "music": "切分鼓、拨弦标志动机与推进低音", "accents": [0, 0.375, 1.625, 2.25]},
    {"start": 2.5, "end": 3.5, "shot": "眼睛特写", "music": "鼓与主旋律留空，短sub与轻柔提示音承接", "accents": [2.5, 3.25]},
    {"start": 3.5, "end": 5.5, "shot": "纸卡吸走", "music": "切分groove归来，短拨弦回应", "accents": [3.5, 4.25, 5.25]},
    {"start": 5.5, "end": 8, "shot": "手夹卡与红勾", "music": "稳定低音，纸夹与红勾处轻击强调", "accents": [5.75, 7.15]},
    {"start": 8, "end": 11.5, "shot": "三张卡落桌", "music": "低位和弦拨弦，两个清楚而短的落点", "accents": [8, 9.5]},
    {"start": 11.5, "end": 14, "shot": "拉开见全景", "music": "开放Dm9和弦释放，鼓组略松", "accents": [11.5, 13]},
    {"start": 14, "end": 16, "shot": "Logo动机", "music": "开头拨弦动机回归，A尾音接循环D首拍", "accents": [14, 14.375, 14.875, 15.5]},
]


def render():
    rng = random.Random(SEED)
    count = round(RATE * DURATION)
    left, right = [0.0] * count, [0.0] * count

    def voice(duration, function):
        return [function(index / RATE, index) for index in range(round(duration * RATE))]

    def add(start, data, gain=1.0, pan=0.0, room=False):
        offset = round(start * RATE)
        gl = math.sqrt((1 - pan) / 2) * gain
        gr = math.sqrt((1 + pan) / 2) * gain
        for index, value in enumerate(data):
            at = offset + index
            if at >= count:
                break
            if at >= 0:
                left[at] += value * gl
                right[at] += value * gr
        if room:
            # Small crossed reflections, used only on melodic instruments.
            for delay, amount, swap in [(0.083, 0.11, True), (0.139, 0.065, False)]:
                echo = offset + round(delay * RATE)
                for index, value in enumerate(data):
                    at = echo + index
                    if at >= count:
                        break
                    if at >= 0:
                        left[at] += value * (gr if swap else gl) * amount
                        right[at] += value * (gl if swap else gr) * amount

    def kick():
        def sample(t, _):
            phase = TAU * (43 * t + 84 * 0.022 * (1 - math.exp(-t / 0.022)))
            envelope = min(1, t / 0.0018) * math.exp(-t * 13)
            thud = 0.055 * math.sin(TAU * 420 * t) * math.exp(-t * 100)
            return math.sin(phase) * envelope + thud * min(1, t / 0.001)
        return voice(0.36, sample)

    def snare():
        low = high = 0.0
        def sample(t, _):
            nonlocal low, high
            low += .34 * (rng.uniform(-1, 1) - low)
            high += .025 * (low - high)
            noise = (low - high) * math.exp(-t * 21)
            body = (.28 * math.sin(TAU * 183 * t) + .08 * math.sin(TAU * 330 * t)) * math.exp(-t * 27)
            return (noise * .88 + body) * min(1, t / .0018)
        return voice(.23, sample)

    def hat(opened=False):
        low = high = 0.0
        def sample(t, _):
            nonlocal low, high
            low += .31 * (rng.uniform(-1, 1) - low)
            high += .1 * (low - high)
            envelope = math.exp(-t * (25 if opened else 72)) * min(1, t / .001)
            return (low - high) * envelope
        return voice(.16 if opened else .075, sample)

    def rim():
        def sample(t, _):
            envelope = min(1, t / .0008) * math.exp(-t * 105)
            return (math.sin(TAU * 640 * t) + .3 * math.sin(TAU * 1053 * t)) * envelope
        return voice(.055, sample)

    def tom():
        def sample(t, _):
            phase = TAU * (88 * t + 75 * .03 * (1 - math.exp(-t / .03)))
            return math.sin(phase) * math.exp(-t * 23) * min(1, t / .002)
        return voice(.23, sample)

    def bass(frequency, duration=.34):
        def sample(t, _):
            phase = TAU * frequency * t
            signal = math.sin(phase) + .19 * math.sin(phase * 2) + .055 * math.sin(phase * 3)
            envelope = min(1, t / .006) * min(1, max(0, (duration - t) / .045)) * math.exp(-t * 3.8)
            return math.tanh(signal * 1.3) * envelope
        return voice(duration, sample)

    def pluck(frequency, duration=.44, fuzz=1.65):
        # Karplus-Strong string excitation with a softened pick transient.
        period = max(8, round(RATE / frequency))
        string = [rng.uniform(-.65, .65) + .35 * math.sin(TAU * index / period) for index in range(period)]
        for _ in range(3):
            string = [(string[index] + string[(index + 1) % period]) * .5 for index in range(period)]
        mean = sum(string) / period
        string = [value - mean for value in string]
        position = 0
        smooth = 0.0
        def sample(t, _):
            nonlocal position, smooth
            value = string[position]
            string[position] = (value + string[(position + 1) % period]) * .4965
            position = (position + 1) % period
            driven = math.tanh(value * fuzz * 2.2)
            smooth += .42 * (driven - smooth)
            envelope = min(1, t / .0018) * min(1, max(0, (duration - t) / .045))
            return smooth * envelope
        return voice(duration, sample)

    def chime(frequency, duration=.35):
        def sample(t, _):
            envelope = min(1, t / .006) * math.exp(-t * 10) * min(1, max(0, (duration - t) / .04))
            return (math.sin(TAU * frequency * t) + .12 * math.sin(TAU * frequency * 2 * t)) * envelope
        return voice(duration, sample)

    def chord(start, notes, duration=2.2):
        for index, frequency in enumerate(notes):
            def sample(t, _, frequency=frequency, index=index):
                envelope = min(1, t / .18) * min(1, max(0, (duration - t) / 1.1))
                amplitude = (.87 + .13 * math.sin(TAU * .7 * t + index))
                tone = math.sin(TAU * frequency * t) + .17 * math.sin(TAU * frequency * 2.003 * t)
                return tone * envelope * amplitude
            add(start + index * .009, voice(duration, sample), .039, (index % 3 - 1) * .58, room=True)

    def in_break(at):
        return 2.5 <= at < 3.5

    # Eight bars, with an edited one-second breath matching the eye close-up.
    for bar in range(8):
        origin = bar * 2
        kick_pattern = (0, .75, 1.5, 2.5, 3.25) if bar % 2 == 0 else (0, 1.25, 2, 2.75)
        if bar >= 6:
            kick_pattern = (0, 1.5, 2.75)
        for beat in kick_pattern:
            at = origin + beat * BEAT
            if not in_break(at):
                add(at, kick(), .49 if beat == 0 else .41)
        for beat in (1, 3):
            at = origin + beat * BEAT
            if not in_break(at):
                add(at, snare(), .32 if bar < 6 else .28, -.035)
        for eighth in range(8):
            at = origin + eighth * .25 + (0.008 if eighth % 2 else 0)
            if not in_break(at):
                opened = eighth == 7 and bar in (0, 2, 4)
                add(at, hat(opened), .13 if eighth % 2 == 0 else .095, .24 if eighth % 2 else -.2)
        for beat in (2.75, 3.5):
            at = origin + beat * BEAT
            if bar in (0, 2, 4, 6) and not in_break(at):
                add(at, rim(), .045, -.3)
        if bar in (0, 4):
            add(origin + 1.875, hat(), .063, .36)

    # Warm D-minor-centred syncopation; C and Bb add movement without a riser.
    roots = (73.416, 73.416, 73.416, 65.406, 58.270, 65.406, 73.416, 73.416)
    for bar, root in enumerate(roots):
        pattern = ((0, root, .33), (.375, root / 2, .26), (.875, root, .3), (1.375, root * 1.5, .22), (1.75, root, .22))
        if bar >= 6:
            pattern = ((0, root, .5), (.875, root / 2, .4), (1.5, root * 1.5, .35))
        for offset, frequency, duration in pattern:
            at = bar * 2 + offset
            if not in_break(at):
                add(at, bass(frequency, duration), .27)

    # First-downbeat signature: D–F–E, then a low A response.
    melody = [
        (0, 293.665, .39), (.375, 349.228, .29), (.875, 329.628, .4), (1.625, 220, .31), (2.25, 261.626, .21),
        (3.5, 293.665, .41), (4.25, 349.228, .29), (4.625, 329.628, .36), (5.25, 220, .31),
        (6, 261.626, .33), (6.75, 293.665, .43), (8.75, 329.628, .32), (9.375, 261.626, .29),
        (10, 349.228, .35), (10.75, 329.628, .4), (11.5, 293.665, .64), (12.375, 220, .45), (13, 329.628, .42),
        (14, 293.665, .39), (14.375, 349.228, .29), (14.875, 329.628, .4), (15.5, 220, .36),
    ]
    for at, frequency, duration in melody:
        add(at, pluck(frequency, duration), .21, -.16, room=True)
    # A short sub and round, quiet cue preserve tension through the breath.
    add(2.5, bass(36.708, .72), .18)
    add(3.25, chime(659.255, .26), .036, .23)
    add(3.5, kick(), .34)
    add(3.5, bass(73.416, .32), .17)

    # Precisely placed light hand/mark accents, rather than harsh UI beeps.
    add(5.75, rim(), .066, -.18)
    add(7.15, rim(), .079, .13)
    add(7.15, chime(587.33, .18), .034, .13)
    for at in (8, 9.5):
        add(at, tom(), .19)
        for index, frequency in enumerate((146.832, 220, 349.228)):
            add(at + index * .012, pluck(frequency, .34, fuzz=1.35), .115, (index - 1) * .32, room=True)
    chord(11.5, (146.832, 220, 261.626, 329.628, 349.228), 2.5)
    # A thinner final chord leaves the signature clear and leads A back to D.
    chord(14, (146.832, 220, 329.628), 1.9)
    add(14, chime(587.33, .38), .04, .28)

    for index in range(count):
        t = index / RATE
        envelope = min(1, t / .006) * min(1, max(0, (DURATION - 1 / RATE - t) / .10))
        left[index] *= envelope
        right[index] *= envelope
    peak = max(max(map(abs, left)), max(map(abs, right))) or 1
    scale = .68 * 32767 / peak
    pcm = array('h')
    square_sum = 0.0
    for lvalue, rvalue in zip(left, right):
        lv, rv = round(lvalue * scale), round(rvalue * scale)
        pcm.extend((lv, rv))
        square_sum += lv * lv + rv * rv
    measured_peak = max(map(abs, pcm)) / 32767
    rms = math.sqrt(square_sum / (count * 2)) / 32767
    if sys.byteorder != 'little':
        pcm.byteswap()
    return pcm, measured_peak, rms


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path, help='Absolute WAV path')
    args = parser.parse_args()
    if not args.out.is_absolute():
        parser.error('--out must be absolute')
    args.out.parent.mkdir(parents=True, exist_ok=True)
    pcm, peak, rms = render()
    with wave.open(str(args.out), 'wb') as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(pcm.tobytes())
    metadata = {
        "title": "Decision Cards — Paper / Pulse", "original_synthesis": True,
        "seed": SEED, "duration": DURATION, "bpm": BPM, "time_signature": "4/4", "bars": 8, "beats": 32,
        "sample_rate": RATE, "channels": 2, "format": "PCM signed 16-bit", "peak_limit": .7,
        "measured_peak": peak, "measured_rms": rms,
        "beat_times": [index * BEAT for index in range(32)], "cues": CUES,
        "loop": {"in": 0, "out": 16, "note": "32-beat boundary; final A returns to opening D; 6ms entry / 100ms ending envelope avoids sample clicks."},
        "listening_review": "Not auditioned; synthesis and signal measurements only.",
    }
    cues_path = args.out.with_suffix('.cues.json')
    cues_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({"wav": str(args.out), "cues": str(cues_path), "duration": DURATION, "peak": peak, "rms": rms}, ensure_ascii=False))


if __name__ == '__main__':
    main()
