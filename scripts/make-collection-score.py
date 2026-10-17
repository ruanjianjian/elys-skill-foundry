#!/usr/bin/env python3
"""Render independently composed Skill Foundry cues, not variations of one template.

Requires NumPy. Each family owns its instruments, groove and arrangement in a
separate score module. This entry point only validates, fades and writes 48 kHz
stereo PCM24 WAV + reproducible metadata. Final AAC mastering is separate.
"""
import argparse
import hashlib
import importlib
import json
from pathlib import Path
import sys
import wave

sys.dont_write_bytecode = True
import numpy as np

RATE = 48_000
MODULES = {
    'shibuya-pop': 'score_neon',
    'detective-bigbeat': 'score_neon',
    'industrial-halfstep': 'score_neon',
    'jungle-breaks': 'score_kinetic',
    'night-synthwave': 'score_kinetic',
    'electro-punk': 'score_kinetic',
    'minimal-piano': 'score_tactile',
    'glitch-lab': 'score_precise',
    'bossa-courier': 'score_tactile',
    'brushed-jazz': 'score_precise',
}


def render(track_id, duration, bpm, genre):
    module = importlib.import_module(MODULES[genre])
    composer_hash = hashlib.sha256(Path(module.__file__).read_bytes()).hexdigest()
    audio, metadata = module.compose(track_id, duration, bpm, genre)
    assert composer_hash == hashlib.sha256(Path(module.__file__).read_bytes()).hexdigest(), 'Composer changed during render; retry after it is frozen'
    audio = np.array(audio, dtype=np.float64, copy=True)
    expected = round(duration * RATE)
    assert audio.shape == (expected, 2), f'Expected {expected} stereo samples, got {audio.shape}'
    assert np.isfinite(audio).all(), 'Non-finite samples'
    peak = float(np.max(np.abs(audio)))
    assert peak > 1e-6, 'Silent cue'
    # Shared output preparation does not add a shared groove, instrument or effect.
    audio -= np.mean(audio, axis=0)
    edge = min(round(.007 * RATE), expected // 4)
    ramp = np.sin(np.linspace(0, np.pi / 2, edge)) ** 2
    audio[:edge] *= ramp[:, None]
    audio[-edge:] *= ramp[::-1, None]
    audio *= .80 / max(float(np.max(np.abs(audio))), 1e-12)
    for key in ('cueTimes', 'arrangement', 'palette', 'meter', 'introSignature'):
        assert key in metadata, 'Missing composition metadata: ' + key
    metadata.update({
        'id': track_id, 'genre': genre, 'duration': expected / RATE, 'bpm': bpm,
        'version': 'music-v3', 'sampleRate': RATE, 'channels': 2, 'bitDepth': 24,
        'composerModule': MODULES[genre] + '.py', 'premaster': True,
        'composerSHA256': composer_hash,
        'peak': float(np.max(np.abs(audio))), 'rms': float(np.sqrt(np.mean(audio ** 2))),
        'listeningVerified': False,
    })
    pcm = np.rint(np.clip(audio, -1, 1) * 8_388_607).astype(np.int32).reshape(-1)
    raw = np.column_stack((pcm & 255, (pcm >> 8) & 255, (pcm >> 16) & 255)).astype(np.uint8).tobytes()
    return raw, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id', required=True)
    parser.add_argument('--duration', type=float, required=True)
    parser.add_argument('--bpm', type=float, required=True)
    parser.add_argument('--genre', choices=tuple(MODULES), required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if not args.out.is_absolute():
        parser.error('--out must be absolute')
    if not 2 <= args.duration <= 90 or not 50 <= args.bpm <= 190:
        parser.error('duration/BPM outside supported range')
    raw, metadata = render(args.id, args.duration, args.bpm, args.genre)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(args.out), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(3)
        output.setframerate(RATE)
        output.writeframes(raw)
    metadata['sha256'] = hashlib.sha256(args.out.read_bytes()).hexdigest()
    args.out.with_suffix('.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: metadata[k] for k in ('id', 'genre', 'bpm', 'duration', 'meter', 'palette', 'peak', 'rms', 'sha256')}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
