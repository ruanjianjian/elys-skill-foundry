#!/usr/bin/env python3
"""Produce original electronic/K-pop-inspired instrumental scores from oscillators.

Requires NumPy. No copyright samples, vocals, models or network calls. Output is
an unmastered 48 kHz stereo PCM24 WAV with headroom: apply final loudness/true-peak
mastering after video mux/AAC if required. JSON records actual note/drum timing,
section edits, waveform measurements and reproducible synthesis configuration.

Example:
  python3 scripts/make-collection-score.py --id ns-spec-cards --duration 16 \
    --bpm 128 --genre y2k-electropop --out /absolute/ns-spec-cards.wav
"""
import argparse
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import sys
import wave

try:
    import numpy as np
except ImportError as exc:
    raise SystemExit('NumPy is required to rebuild these scores; use the project Python environment.') from exc

RATE=48000
PI=math.pi
TAU=2*PI
CONFIG={
 'y2k-electropop':dict(key=50,roots=[0,-5,-2,-7],chord=[0,3,7,10],lead='pop',hook=[12,15,19,15,12,15,19,22],steps=[0,.75,1.5,2.5,3.25,4,5.5,6.75],width=.78),
 'two-step-club':dict(key=42,roots=[0,5,3,7],chord=[0,3,7,14],lead='organ',hook=[24,27,31,27,24,27,31,26],steps=[0,.5,1.25,2.75,3.5,4.75,6,7.25],width=.66),
 'festival-electro':dict(key=43,roots=[0,-3,5,-2],chord=[0,3,7,12],lead='brass',hook=[24,24,27,31,24,24,27,19],steps=[0,.5,1.5,2,3,4,5.5,6.5],width=.96),
 'future-funk':dict(key=53,roots=[0,5,2,7],chord=[0,4,7,9],lead='fm',hook=[12,16,19,16,12,16,19,21],steps=[0,.75,1.5,2.25,3.5,4.5,5.75,7],width=.76),
 'dark-club':dict(key=38,roots=[0,-2,-5,-7],chord=[0,7,10,14],lead='resonant',hook=[12,19,15,19,12,19,15,10],steps=[0,1.5,2.25,3.5,4,5.25,6.5,7.75],width=.58),
 'dream-house':dict(key=48,roots=[0,7,5,2],chord=[0,4,7,14],lead='piano',hook=[24,28,31,28,24,28,31,33],steps=[0,1,2.5,3.5,4,5.5,6.25,7.5],width=.92),
 'bass-house':dict(key=40,roots=[0,0,3,-2],chord=[0,3,7,10],lead='stab',hook=[12,12,19,15,12,12,19,10],steps=[0,.75,1.5,2.25,3.5,4.75,6,7],width=.66),
 'hyper-glass':dict(key=47,roots=[0,3,-4,5],chord=[0,4,7,11],lead='glass',hook=[24,31,28,31,24,31,28,35],steps=[0,.5,1.75,2.5,3.25,4.5,5.5,7.25],width=.97),
 'synthwave-house':dict(key=45,roots=[0,-5,3,-2],chord=[0,3,7,14],lead='analog',hook=[12,19,24,19,12,19,24,22],steps=[0,.5,1.5,2.75,3.5,4.5,6,7.5],width=.88),
 'nu-disco':dict(key=45,roots=[0,5,10,3],chord=[0,3,7,10],lead='rhodes',hook=[12,15,19,15,12,15,19,22],steps=[0,.75,1.5,2.5,3.5,4.5,5.75,7],width=.83),
}
GENRES=tuple(CONFIG)

def hz(note):return 440*2**((note-69)/12)
def env(t,d,attack=.005,release=.045,decay=0,sustain=.4):
    e=np.minimum(1,t/max(.0001,attack))*np.minimum(1,np.maximum(0,(d-t)/max(.001,release)))
    return e*((sustain+(1-sustain)*np.exp(-t*decay)) if decay else 1)
def stereo(mono,pan=0):
    return np.stack((mono*math.sqrt((1-pan)/2),mono*math.sqrt((1+pan)/2)),axis=1).astype(np.float32)
def filtered_noise(rng,n,low=800,high=9000):
    nfft=1<<(n-1).bit_length();a=rng.standard_normal(nfft);f=np.fft.rfftfreq(nfft,1/RATE)
    shape=(1-np.exp(-(f/max(low,1))**2))*np.exp(-(f/max(high,1))**6)
    v=np.fft.irfft(np.fft.rfft(a)*shape,nfft)[:n]
    return v/(max(float(np.std(v)),1e-7))

@lru_cache(maxsize=500)
def drum(name,variant=0):
    d={'kick':.42,'clap':.29,'snare':.22,'hat':.085,'open':.27,'shaker':.12,'rim':.065,'crash':.8,'tom':.27}[name]
    n=round(d*RATE);t=np.arange(n,dtype=np.float64)/RATE;rng=np.random.default_rng(20261017+variant*19+sum(map(ord,name)))
    if name=='kick':
        ph=TAU*(48*t+93*.022*(1-np.exp(-t/.022)))
        body=np.sin(ph)*(1-np.exp(-t/.0012))*np.exp(-t*12.5)
        punch=.22*np.sin(TAU*(95*t+18*.007*(1-np.exp(-t/.007))))*np.exp(-t*58)
        click=filtered_noise(rng,n,1800,6500)*.055*np.exp(-t*430)
        v=body+punch+click
    elif name in ('clap','snare'):
        noise=filtered_noise(rng,n,650,6500)
        if name=='clap':
            bursts=sum(np.where(t>=at,np.exp(-np.maximum(0,t-at)*rate)*amp,0) for at,rate,amp in [(0,155,.5),(.012,150,.55),(.024,135,.5),(.036,22,.7)])
            v=noise*bursts+.16*np.sin(TAU*193*t)*np.exp(-t*35)
        else:v=.64*noise*np.exp(-t*24)+.4*np.sin(TAU*(178*t+17*.01*(1-np.exp(-t/.01))))*np.exp(-t*33)
    elif name in ('hat','open','shaker'):
        noise=filtered_noise(rng,n,3700 if name!='shaker' else 1800,10500 if name!='shaker' else 8000)
        metal=sum(np.sin(TAU*f*t) for f in [4217,5513,6827])*.04
        v=(noise*.36+metal)*np.exp(-t*({'hat':85,'open':17,'shaker':34}[name]))
    elif name=='rim':v=(np.sin(TAU*617*t)+.42*np.sin(TAU*1019*t))*np.exp(-t*100)
    elif name=='tom':v=np.sin(TAU*(103*t+48*.024*(1-np.exp(-t/.024))))*np.exp(-t*18)
    else:v=filtered_noise(rng,n,2100,9500)*np.exp(-t*5.5)*.45
    v*=np.minimum(1,t/.001);v*=np.minimum(1,np.maximum(0,(d-t)/.02))
    return (v/max(1,float(np.max(np.abs(v))))).astype(np.float32)

@lru_cache(maxsize=1400)
def synth(kind,note,duration):
    d=float(duration);n=round(d*RATE);t=np.arange(n,dtype=np.float64)/RATE;f=hz(note);ph=TAU*f*t
    if kind=='sub':
        v=(np.sin(ph)+.055*np.sin(ph*2))*env(t,d,.004,.055,2.6,.62)
        return stereo(v)
    if kind in ('bass','reese','rubber'):
        mono=np.zeros(n);harmonics=12
        for k in range(1,harmonics+1):
            strength=(1/k)*np.exp(-k*(.16+t*(2 if kind=='rubber' else .65)))
            mono+=np.sin(ph*k+(.11*np.sin(TAU*.28*t) if kind=='reese' else 0))*strength
        mono=np.tanh(mono*(1.6 if kind=='reese' else 1.1))*.8
        mono*=env(t,d,.003,.04,5,.24)
        return stereo(mono)
    if kind in ('pop','brass','analog','stab','chord','pad','resonant'):
        output=np.zeros((n,2),dtype=np.float64)
        detunes={'pop':[-13,-5,5,13],'brass':[-19,-8,0,8,19],'analog':[-9,0,9],'stab':[-8,8],'chord':[-15,-5,5,15],'pad':[-11,-4,4,11],'resonant':[-6,6]}[kind]
        for j,cents in enumerate(detunes):
            freq=f*2**(cents/1200);v=np.zeros(n)
            for k in range(1,11):
                decay=.04 if kind=='pad' else (.17 if kind=='brass' else .32)
                amp=np.exp(-k*(.12+decay*t*3))/k
                v+=np.sin(TAU*freq*k*t)*amp
            pan=(j/max(1,len(detunes)-1)*2-1)*.7
            output+=stereo(v,pan)/len(detunes)
        dcy={'pop':3.6,'brass':2,'analog':4,'stab':9,'chord':4.5,'pad':0,'resonant':6}[kind]
        output*=env(t,d,.025 if kind=='pad' else .006,.12 if kind=='pad' else .055,dcy,.25 if kind!='brass' else .5)[:,None]
        return (output*.62).astype(np.float32)
    if kind in ('fm','glass'):
        ratio=2.0 if kind=='fm' else 2.73;idx=3.2 if kind=='fm' else 2.6
        v=np.sin(ph+idx*np.sin(ph*ratio)*np.exp(-t*16))+.11*np.sin(ph*4.01)*np.exp(-t*24)
        v*=env(t,d,.003,.06,7.5,.06)
    elif kind in ('organ','rhodes'):
        v=(np.sin(ph)+.28*np.sin(ph*2)+.13*np.sin(ph*3)+.05*np.sin(ph*4)) if kind=='organ' else np.sin(ph+1.9*np.sin(ph*4)*np.exp(-t*14))+.2*np.sin(ph*2.002)
        v*=env(t,d,.005,.08,5.2,.24)
    elif kind=='piano':
        v=sum(np.sin(ph*k*(1+k*k*.00013))*(.72**k)/k*np.exp(-t*(1+k*.65)) for k in range(1,7))
        v*=env(t,d,.003,.1)
    else:raise ValueError(kind)
    return stereo(v).astype(np.float32)

def compose(track_id,duration,bpm,genre):
    cfg=CONFIG[genre];beat=60/bpm;bar=4*beat;count=round(duration*RATE)
    stems={s:np.zeros((count,2),np.float32) for s in ['kick','drums','sub','bass','chords','hook','fx']}
    events=[];kick_times=[];kick_strength={};notes=[];key=cfg['key'];drop=round((duration*.5)/beat)*beat
    break_start=drop-beat;end_stop=duration-.83;end_hit=duration-.45
    def add(at,data,gain,stem,pan=0,label=None,note=None):
        if at>=duration or at<0:return
        start=round(at*RATE);n=min(len(data),count-start)
        if n<=0:return
        a=data[:n]
        if a.ndim==1:a=stereo(a,pan)
        elif pan:a=a*np.array([math.sqrt(1-pan),math.sqrt(1+pan)])
        stems[stem][start:start+n]+=a*gain
        events.append({'at':round(at,6),'instrument':label or stem,'stem':stem,'note':note})
    def hit(at,name,gain,pan=0,variant=0):
        if break_start<at<drop or end_stop<at<end_hit:return
        if genre=='y2k-electropop' and 2.5<=at<3.35:return
        if name=='kick':
            sample_at=round(at*RATE);previous=kick_strength.get(sample_at,0)
            if previous>=gain:return
            kick_strength[sample_at]=gain
            add(at,drum(name,variant),gain-previous,'kick',pan,name)
            if previous==0:kick_times.append(at)
        else:add(at,drum(name,variant),gain,'drums',pan,name)
    def note(at,kind,midi,dur,gain,stem='hook',pan=0):
        if break_start<at<drop or end_stop<at<end_hit:return
        if genre=='y2k-electropop' and 2.5<=at<3.35:return
        add(at,synth(kind,midi,round(dur,3)),gain,stem,pan,kind,midi)
        notes.append({'at':round(at,6),'midi':midi,'kind':kind})
    def chord(at,root,dur,gain,kind='chord',inversion=0):
        for j,interval in enumerate(cfg['chord']):
            note(at+j*.006,kind,root+12+interval+(12 if j<inversion else 0),dur,gain,'chords',(j/3-.5)*cfg['width'])
    total_bars=math.ceil(duration/bar)
    for b in range(total_bars):
        at=b*bar;root=key+cfg['roots'][b%4];is_drop=at>=drop;lift=duration*.25<=at<break_start
        # Deliberately different backbeats, not one drum loop at ten speeds.
        if genre=='two-step-club':kicks=[0,1.5,2.75,3.5] if b%2==0 else [0,.75,2.5];snares=[1,3]
        elif genre=='festival-electro':kicks=[0,1,2,3];snares=[1,3]
        elif genre=='bass-house':kicks=[0,1,2,3,3.5] if is_drop else [0,1,2,3];snares=[1,3]
        elif genre=='dark-club':kicks=[0,1.5,2,3.25];snares=[1,3]
        elif genre=='hyper-glass':kicks=[0,.75,2,2.75,3.5];snares=[1,3]
        elif genre=='future-funk':kicks=[0,1.75,2.5,3.25];snares=[1,3]
        elif genre=='nu-disco':kicks=[0,1,2,3];snares=[1,3]
        elif genre=='dream-house':kicks=[0,1,2,3];snares=[1,3]
        elif genre=='synthwave-house':kicks=[0,1,2,3];snares=[1,3]
        else:kicks=[0,.75,1.5,2.5,3.25] if b%2==0 else [0,1.25,2,2.75];snares=[1,3]
        for off in kicks:hit(at+off*beat,'kick',.66 if is_drop else .57)
        for off in snares:
            hit(at+off*beat,'clap',.29 if is_drop else .23,-.035,b%2)
            hit(at+off*beat+.003,'snare',.19 if genre in ('festival-electro','y2k-electropop','bass-house') else .115,.03)
        for k in range(8):
            swing=.025 if genre in ('two-step-club','nu-disco') and k%2 else 0
            hit(at+k*beat/2+swing,'hat',.072 if k%2 else .052,.42 if k%2 else -.32)
            if k in (3,7):hit(at+k*beat/2+.008,'open',.065 if is_drop else .045,-.4)
        if genre in ('two-step-club','hyper-glass','bass-house'):
            for k in (3,7,11,14):hit(at+k*beat/4+.012,'shaker',.035,.6 if k%2 else -.6)
            hit(at+2.75*beat,'snare',.035,-.22,1)
        if genre in ('nu-disco','future-funk'):hit(at+2.5*beat,'rim',.047,.35)
        if lift and b%2:
            for off in (3,3.5,3.75):hit(at+off*beat,'snare',.07+off*.015,.1)
        # Mono sub anchors syncopated mid-bass; their note shapes differ by world.
        if genre in ('festival-electro','dream-house','synthwave-house','nu-disco'):bass_steps=[.5,1.5,2.5,3.5]
        elif genre=='two-step-club':bass_steps=[0,.75,1.5,2.75,3.5]
        elif genre=='bass-house':bass_steps=[.5,.75,1.5,2.25,2.75,3.5]
        else:bass_steps=[0,.75,1.5,2.5,3.25]
        for j,off in enumerate(bass_steps):
            bass_note=root-12+([0,0,7,0,10,7][j%6] if genre in ('future-funk','nu-disco') else [0,0,0,7,0,12][j%6])
            ndur=beat*(.7 if genre!='two-step-club' else .95)
            note(at+off*beat,'sub',bass_note,ndur,.37,'sub')
            note(at+off*beat,'reese' if genre in ('dark-club','bass-house','festival-electro') else 'rubber',bass_note+12,ndur,.28 if is_drop else .21,'bass')
        # Harmonic rhythms are as distinct as the timbres.
        if genre=='two-step-club':
            for off in (.5,1.75,3.25):chord(at+off*beat,root,.42,.15,'organ',b%2)
        elif genre=='festival-electro':
            for off in (0,1.5,2,3.5):chord(at+off*beat,root,.46,.145 if is_drop else .09,'brass')
        elif genre=='nu-disco':
            for off in (.75,2,3.5):chord(at+off*beat,root,.7,.14,'rhodes',b%2)
        elif genre=='dream-house':
            chord(at,root,bar*.93,.115,'pad');chord(at+1.5*beat,root,.8,.17,'piano',1)
        elif genre=='synthwave-house':
            chord(at,root,bar*.88,.13,'pad')
            for j in range(8):note(at+j*beat/2,'analog',root+12+[0,7,12,15,19,15,12,7][j],.27,.12,'chords',(-1 if j%2 else 1)*.5)
        elif genre=='bass-house':
            for off in (.75,2.25):chord(at+off*beat,root,.23,.09,'stab')
        elif genre=='hyper-glass':
            for off in (.5,2.5):chord(at+off*beat,root,.8,.12,'glass')
        else:
            for off in (.5,2.5):chord(at+off*beat,root,.7,.14,'chord',b%2)
    # Two-bar original motifs. They begin immediately and return transformed in the drop.
    for phrase in range(math.ceil(duration/(bar*2))):
        origin=phrase*bar*2;root=key+cfg['roots'][(phrase*2)%4]
        for j,(interval,step) in enumerate(zip(cfg['hook'],cfg['steps'])):
            at=origin+step*beat;d=beat*(.64 if j not in (2,7) else 1.1)
            gain=.17 if genre not in ('festival-electro','dark-club') else .205
            if at>=drop:gain*=1.12
            note(at,cfg['lead'],root+interval,d,gain,'hook',math.sin(j*1.3)*.18)
            if at>=drop and genre in ('festival-electro','y2k-electropop','hyper-glass'):
                note(at,cfg['lead'],root+interval-12,d,.065,'hook',-.2)
    # A high, restrained lift and reverse texture create forward motion, without
    # the harsh continuous high-frequency riser used by generic demo music.
    rng=np.random.default_rng(0x20261017+sum(map(ord,track_id)))
    lift_start=max(0,break_start-beat*2);lift_duration=break_start-lift_start
    if lift_duration>0:
        n=round(lift_duration*RATE);tt=np.arange(n)/RATE;noise=filtered_noise(rng,n,1400,5600)
        lift=noise*(tt/max(lift_duration,.01))**1.8*np.sin(np.minimum(1,tt/.08)*PI/2)*.085
        add(lift_start,stereo(lift,.35),1,'fx',label='filtered-noise-lift')
    # Drop and last-word accents use a tailored pitch/voicing, never a stock sample.
    hit(drop,'kick',.7);hit(drop,'crash',.1,-.25);chord(drop,key,.7,.17,'brass' if genre=='festival-electro' else 'chord',1)
    hit(end_hit,'kick',.43);chord(end_hit,key,.4,.1,'rhodes' if genre=='nu-disco' else cfg['lead'])
    if genre=='y2k-electropop':
        for at in (5.5,8,12):hit(at,'rim',.08,-.2)
    if genre=='two-step-club':hit(5.3,'rim',.095,.3)
    if genre=='festival-electro':hit(8.3,'kick',.42);hit(8.3,'crash',.07,.3)
    # Short stereo echoes + a diffuse early room make the instruments occupy a
    # mix, rather than sound like isolated synthetic notification beeps.
    for name in ('chords','hook','fx'):
        original=stems[name].copy()
        for delay,gain,swap in ((.073,.11,True),(.127,.075,False),(.193,.05,True),(.293,.025,False)):
            k=round(delay*RATE)
            if k<count:stems[name][k:]+=original[:-k,::-1] * gain if swap else original[:-k]*gain
        if name=='hook':
            k=round(beat*.75*RATE)
            if k<count:stems[name][k:]+=original[:-k,::-1]*.17
    # Kick-driven sidechain is applied independently to low and musical buses.
    duck=np.ones(count,dtype=np.float32)
    for at in kick_times:
        start=round(at*RATE);n=min(round(.42*RATE),count-start)
        if n>0:
            tt=np.arange(n)/RATE;curve=1-.73*(1-np.exp(-tt/.0012))*np.exp(-tt/.11)
            duck[start:start+n]=np.minimum(duck[start:start+n],curve)
    for name,amount in [('sub',.9),('bass',.82),('chords',1),('hook',.55),('fx',.62)]:
        stems[name]*=(1-amount+amount*duck)[:,None]
    # Drum bus saturation glues kick/clap layers while preserving a controlled crest.
    drums=stems['kick']+stems['drums'];drums=np.tanh(drums*1.3)/1.15
    audio=drums+sum((stems[n] for n in ('sub','bass','chords','hook','fx')),np.zeros_like(drums))
    # Real edited silence includes effect tails, not merely skipped note-ons.
    def silence(start,end):
        lo=max(0,round(start*RATE));hi=min(count,round(end*RATE));n=hi-lo
        if n<=0:return
        gate=np.zeros(n);edge=min(round(.022*RATE),n//3)
        if edge:
            gate[:edge]=np.linspace(1,0,edge);gate[-edge:]=np.linspace(0,1,edge)
        audio[lo:hi]*=gate[:,None]
    silence(break_start,drop-.008);silence(end_stop,end_hit-.008)
    if genre=='y2k-electropop':silence(2.5,3.35)
    # Remove DC and guarantee mono bass below 120 Hz across the entire mix.
    nfft=1<<(count-1).bit_length();freq=np.fft.rfftfreq(nfft,1/RATE)
    mid=(audio[:,0]+audio[:,1])*.5;side=(audio[:,0]-audio[:,1])*.5
    hp=1-np.exp(-(freq/23)**4);mono_side=1-np.exp(-(freq/150)**6)
    mid=np.fft.irfft(np.fft.rfft(mid,nfft)*hp,nfft)[:count]
    side=np.fft.irfft(np.fft.rfft(side,nfft)*hp*mono_side,nfft)[:count]
    audio=np.stack((mid+side,mid-side),axis=1)
    # FFT band shaping has a tiny non-causal tail, so restore edited silent centres.
    for start,end in [(break_start+.04,drop-.04),(end_stop+.04,end_hit-.04)]+([(2.54,3.31)] if genre=='y2k-electropop' else []):
        lo=max(0,round(start*RATE));hi=min(count,round(end*RATE))
        if hi>lo:
            gate=np.zeros(hi-lo);edge=min(round(.005*RATE),(hi-lo)//3)
            if edge:
                theta=np.linspace(0,PI,edge)
                gate[:edge]=.5*(1+np.cos(theta));gate[-edge:]=.5*(1-np.cos(theta))
            audio[lo:hi]*=gate[:,None]
    fade=np.minimum(1,np.arange(count)/(.008*RATE))*np.minimum(1,(count-1-np.arange(count))/(.055*RATE));audio*=fade[:,None]
    assert np.isfinite(audio).all(),'Non-finite sample'
    peak=float(np.max(np.abs(audio)));assert peak>1e-5,'Silent score'
    audio*=.82/peak
    rms=float(np.sqrt(np.mean(audio**2)));peak=float(np.max(np.abs(audio)))
    cues=[{'at':0,'section':'hook','description':'groove and original motif enter immediately'},
          {'at':round(duration*.25,6),'section':'lift','description':'bass/chord density and ghost percussion rise'},
          {'at':round(break_start,6),'section':'breath','description':'all-bus edited silence including effect tails'},
          {'at':round(drop,6),'section':'drop','description':'full drum/sub/chord hook arrangement'},
          {'at':round(duration*.75,6),'section':'return','description':'hook variation and return voicing'},
          {'at':round(end_stop,6),'section':'last-word pause','description':'full-bus stop before final hit'},
          {'at':round(end_hit,6),'section':'final hit','description':'short signature voicing and kick'}]
    if genre=='y2k-electropop':cues.insert(1,{'at':2.5,'end':3.35,'section':'eye-closeup breath','description':'deliberate all-bus quiet for the character close-up'})
    metadata={'id':track_id,'genre':genre,'duration':count/RATE,'bpm':bpm,'beatSeconds':beat,'sampleRate':RATE,'channels':2,'bitDepth':24,'version':'electro-v2','premaster':True,'peak':round(peak,8),'rms':round(rms,8),'crestDb':round(20*math.log10(peak/rms),3),'cueTimes':[x['at'] for x in cues],'arrangement':cues,'kickTimes':[round(x,6) for x in sorted(set(kick_times))],'originalHookMidi':cfg['hook'],'motifCallMidi':cfg['hook'][:4],'motifResponseMidi':cfg['hook'][4:],'keyMidi':key,'eventCount':len(events),'noteEvents':notes,'synthesis':'original NumPy oscillators, additive detuned synthesis, FM, seeded filtered noise; no external samples or vocals','mix':['layered kick + clap/snare','mono sub with syncopated mid bass','kick-envelope sidechain','stereo chord and hook sends','all-bus edited breaths','headroom for final loudness/true-peak master'],'listeningVerified':False}
    return audio,metadata

def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--id',required=True,help='Skill id recorded in metadata')
    parser.add_argument('--duration',type=float,required=True,help='Exact film duration in seconds')
    parser.add_argument('--bpm',type=float,required=True,help='Tempo used for all event placement')
    parser.add_argument('--genre',choices=GENRES,required=True,help='Unique sound design and arrangement family')
    parser.add_argument('--out',type=Path,required=True,help='Absolute output WAV; adjacent JSON records synthesis and measurements')
    args=parser.parse_args()
    if not args.out.is_absolute():parser.error('--out must be an absolute path')
    if not 2<=args.duration<=90 or not 60<=args.bpm<=180:parser.error('duration/BPM outside supported range')
    audio,metadata=compose(args.id,args.duration,args.bpm,args.genre)
    pcm=np.rint(np.clip(audio,-1,1)*8388607).astype(np.int32).reshape(-1)
    raw=np.column_stack(((pcm&255),((pcm>>8)&255),((pcm>>16)&255))).astype(np.uint8).tobytes()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(args.out),'wb') as output:
        output.setnchannels(2);output.setsampwidth(3);output.setframerate(RATE);output.writeframes(raw)
    metadata['file']=str(args.out);metadata['sha256']=hashlib.sha256(args.out.read_bytes()).hexdigest()
    args.out.with_suffix('.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:metadata[k] for k in ('id','genre','duration','bpm','peak','rms','sha256','cueTimes')},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
