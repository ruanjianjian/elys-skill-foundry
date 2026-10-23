#!/usr/bin/env python3
"""Original 16-second studio-house cue; generated oscillators, no samples."""
import argparse
import json
import wave
from pathlib import Path
import numpy as np

RATE = 48000
DURATION = 16

def compose():
    audio = np.zeros((RATE * DURATION, 2))
    rng = np.random.default_rng(20261023)
    def add(at, sound, gain=1, pan=0):
        start = round(at * RATE)
        count = min(len(sound), len(audio) - start)
        if count > 0:
            audio[start:start+count] += sound[:count, None] * gain * np.array([np.sqrt((1-pan)/2), np.sqrt((1+pan)/2)])
    def note(midi, duration, kind):
        t = np.arange(round(duration*RATE))/RATE
        f = 440*2**((midi-69)/12)
        if kind == 'bell':
            v = np.sin(2*np.pi*f*t + .8*np.sin(2*np.pi*2*f*t)*np.exp(-t*7)) * np.exp(-t*5)
        else:
            v = (np.sin(2*np.pi*f*t) + .15*np.sin(2*np.pi*2*f*t)) * np.exp(-t*2.8)
        return v * np.minimum(1,t/.008) * np.minimum(1,(duration-t)/.08)
    chords = [[53,57,60,64], [50,53,57,60], [55,59,62,65], [48,52,55,59]]
    for beat in range(32):
        at = beat*.5
        # Rounded kick, softly filtered hats: leave room for the visual story.
        t = np.arange(round(.28*RATE))/RATE
        kick = np.sin(2*np.pi*(49*t + 1.7*(1-np.exp(-t*38)))) * np.exp(-t*21)
        add(at,kick,.19)
        t = np.arange(round(.065*RATE))/RATE
        n = rng.standard_normal(len(t))
        hat = (n-np.roll(n,1)) * np.exp(-t*80) * np.minimum(1,t/.002)
        add(at+.25,hat,.018,.25)
        if beat%2==1:
            t = np.arange(round(.12*RATE))/RATE
            clap = rng.standard_normal(len(t))*np.exp(-t*43)*np.minimum(1,t/.004)
            add(at,clap,.035,-.2)
        chord=chords[beat//8]
        if beat%2==0:
            for j,midi in enumerate(chord):
                add(at+.025*j,note(midi,.85,'keys'),.065,(j-1.5)*.25)
        add(at,note(chord[0]-24,.42,'keys'),.14)
        if beat%4 in (1,3):
            add(at+.25,note(chord[(beat//2)%4]+12,.46,'bell'),.055,-.2 if beat%4==1 else .3)
    for at,midi in [(0,77),(4,81),(8,79),(12,84)]:
        add(at,note(midi,1.3,'bell'),.095)
    audio=np.tanh(audio)
    edge=np.minimum(1,np.arange(len(audio))/(RATE*.015))*np.minimum(1,(len(audio)-1-np.arange(len(audio)))/(RATE*.3))
    audio*=edge[:,None]
    audio*=.78/np.max(np.abs(audio))
    return audio

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,required=True)
    path=parser.parse_args().out
    if not path.is_absolute(): parser.error('--out must be absolute')
    path.parent.mkdir(parents=True,exist_ok=True)
    samples=compose()
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE)
        f.writeframes(np.rint(samples*32767).astype('<i2').tobytes())
    path.with_suffix('.json').write_text(json.dumps({'id':'mac-dev-resource-guard','duration':16,'bpm':120,'genre':'studio-house','source':'original oscillators and seeded noise; no external samples','listeningVerified':False},indent=2)+'\n')
    print(path)
