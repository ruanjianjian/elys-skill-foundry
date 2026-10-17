#!/usr/bin/env python3
"""Nine original short-film cues, synthesized without samples, APIs or packages.

48 kHz stereo PCM16. The score is seeded and reproducible. Each genre has its
own instruments, rhythmic vocabulary, harmonic progression and edited breaks.
The command prints measured output metadata; it does not claim a listening QA.
"""
import argparse
from array import array
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import random
import sys
import wave

RATE = 48_000
TAU = math.tau
GENRES = ('ink-rock','cut-paper','bright-breaks','noir-pulse','architectural','garage','prism','dispatch','jazz-collage')

def hz(midi):
    return 440 * 2 ** ((midi-69)/12)

def instrument(name, frequency=110, duration=.4, seed=12):
    rng = random.Random(seed)
    count = max(1,round(duration*RATE))
    out = array('f')
    low=0.0
    if name in ('fuzz','pluck'):
        period=max(8,round(RATE/frequency))
        string=[rng.uniform(-.65,.65) for _ in range(period)]
        for _ in range(3):
            string=[(string[i]+string[(i+1)%period])*.5 for i in range(period)]
        for i in range(count):
            t=i/RATE;index=i%period;v=string[index]
            string[index]=(v+string[(index+1)%period])*(.496 if name=='fuzz' else .492)
            v=math.tanh(v*(5.2 if name=='fuzz' else 1.5));low+=.36*(v-low)
            attack=min(1,t/.002);release=min(1,(duration-t)/.035)
            out.append(low*attack*release)
        return out
    for i in range(count):
        t=i/RATE;phase=TAU*frequency*t
        attack=min(1,t/.003)
        release=min(1,max(0,(duration-t)/min(.1,duration*.35)))
        if name=='kick':
            v=math.sin(TAU*(43*t+78*.024*(1-math.exp(-t/.024))))*math.exp(-t*14)
        elif name=='snare':
            noise=rng.uniform(-1,1);low+=.3*(noise-low)
            v=(low*.8+.29*math.sin(TAU*185*t))*math.exp(-t*24)
        elif name in ('hat','brush','shaker'):
            noise=rng.uniform(-1,1);low+=.2*(noise-low)
            decay={'hat':78,'brush':17,'shaker':36}[name]
            v=(noise-low)*math.exp(-t*decay)*(.42 if name=='brush' else .65)
        elif name=='rim':
            v=(math.sin(TAU*641*t)+.3*math.sin(TAU*1047*t))*math.exp(-t*105)
        elif name=='hand':
            v=(math.sin(TAU*(161*t+12*.03*(1-math.exp(-t/.03))))+.11*rng.uniform(-1,1))*math.exp(-t*22)
        elif name=='metal':
            v=(math.sin(TAU*731*t)+.45*math.sin(TAU*1193*t)+.23*math.sin(TAU*1933*t))*math.exp(-t*58)
        elif name=='bass':
            v=(math.sin(phase)+.19*math.sin(phase*2)+.05*math.sin(phase*3))*math.exp(-t*3.8)
        elif name=='sub':
            v=(math.sin(phase)+.05*math.sin(phase*2))*math.exp(-t*1.7)
        elif name=='dirty':
            saw=2*((frequency*t)%1)-1
            square=.32 if (frequency*t)%1<.41 else -.32
            v=math.tanh((saw*.72+square+math.sin(phase)*.6)*1.7)*math.exp(-t*6.5)
        elif name=='wood':
            v=(math.sin(phase)*math.exp(-t*8)+.43*math.sin(phase*3.91)*math.exp(-t*29)+.09*math.sin(phase*9.7)*math.exp(-t*80))
        elif name=='marimba':
            v=math.sin(phase+2.7*math.sin(phase*1.414)*math.exp(-t*17))*math.exp(-t*8.5)+.1*math.sin(phase*4.01)*math.exp(-t*28)
        elif name=='piano':
            v=0
            for k in range(1,7):
                v+=math.sin(phase*k*(1+.00019*k*k))*(.74**k)/k*math.exp(-t*(1.15+k*.55))
        elif name=='pad':
            env=min(1,t/.22)*min(1,max(0,(duration-t)/.8))
            v=(math.sin(phase)+.15*math.sin(phase*2.002)+.05*math.sin(phase*3.003))*env*.65
        elif name=='glass':
            v=(math.sin(phase+1.9*math.sin(phase*2.61)*math.exp(-t*6))+.15*math.sin(phase*5.43)*math.exp(-t*12))*math.exp(-t*3.8)
        elif name=='arp':
            v=(math.sin(phase)+.27*math.sin(phase*2)+.12*math.sin(phase*3))*math.exp(-t*5.9)
        elif name=='rhodes':
            tine=math.sin(phase+1.35*math.sin(phase*4)*math.exp(-t*9))
            v=(tine*.72+.15*math.sin(phase*2.002))*math.exp(-t*2.1)
        else:
            raise ValueError(name)
        out.append(v*attack*release)
    return out

@lru_cache(maxsize=800)
def voice(name,note=45,duration=.4):
    return instrument(name,hz(note),duration,seed=int(note*13+duration*1000)+len(name)*41)

def compose(track_id,duration,bpm,genre):
    count=round(duration*RATE);left=array('f',[0])*count;right=array('f',[0])*count
    beat=60/bpm;bar=beat*4;events=[];cue_times=[0,duration*.25,duration*.5,duration*.75]
    def add(at,name,note=45,dur=.4,gain=.2,pan=0,room=False):
        if at<duration-.04:events.append((at,name,note,dur,gain,pan,room))
    def chord(at,notes,name='pad',dur=2,gain=.065):
        for k,n in enumerate(notes):add(at+k*.012,name,n,dur,gain,(k%3-1)*.48,True)
    def section(at):return min(3,int(at/duration*4))
    def snare(at,g=.22):add(at,'snare',45,.2,g,-.05)
    def kick(at,g=.38):add(at,'kick',45,.32,g)
    if genre=='ink-rock':
        roots=[38,38,36,34,36,38,38,38]
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=roots[b%8]
            for off in ([0,.75,1.5,2.5,3.25] if b%2==0 else [0,1.25,2,2.75]):
                if not 2.5<=at+off*beat<3.5:kick(at+off*beat,.4 if off==0 else .31)
            for off in (1,3):
                if not 2.5<=at+off*beat<3.5:snare(at+off*beat,.25)
            for k in range(8):
                x=at+k*beat/2
                if not 2.5<=x<3.5:add(x,'hat',45,.075,.09 if k%2 else .13,.3 if k%2 else -.3)
            for off,n in [(0,root),(.75,root-12),(1.75,root),(2.75,root+7)]:
                x=at+off*beat
                if not 2.5<=x<3.5:add(x,'bass',n,.32,.23)
        melody=[(0,62),(.375,65),(.875,64),(1.625,57),(2.25,60),(3.5,62),(4.25,65),(4.625,64),(5.25,57),(6,60),(6.75,62),(8.1,64),(9.25,60),(10,65),(10.75,64),(12,62),(12.75,57),(13.3,64),(14,62),(14.375,65),(14.875,64),(15.5,57)]
        for at,n in melody:add(at,'fuzz',n,.42,.29,-.18,True)
        add(2.5,'sub',26,.65,.13);add(3.25,'glass',76,.25,.025,.4)
        for at in (5.5,7.15,8,9.5,12):add(at,'rim',45,.055,.07,-.2)
        chord(12,[50,57,60,64,65],'pad',2.2,.045);chord(14,[50,57,64],'pad',1.8,.035)
    elif genre=='cut-paper':
        # A dry pizzicato/wood cue, with a detective's intentional stop before the clue.
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=[45,45,48,43][b%4]
            for off in (0,1.5,2.75):add(at+off*beat,'hand',45,.19,.22 if off==0 else .13,(-.22 if off==1.5 else .14))
            for off in (.5,2,3.5):add(at+off*beat,'shaker',45,.12,.045,.5 if off==.5 else -.4)
            for off,n in [(0,root),(1.25,root+7),(2.5,root+10),(3.25,root+12)]:add(at+off*beat,'pluck',n,.25,.28,-.25,True)
            if b%2==1:add(at+3.5*beat,'wood',root+24,.3,.1,.35,True)
        for at,n in [(0,69),(1.1,72),(2.18,71),(3.8,67),(5.5,76),(6.1,74),(7.5,72),(8.8,69),(10.6,72),(11.4,76),(12.4,74),(13.5,72),(14.5,69),(15.4,76)]:add(at,'wood',n,.38,.13,.28,True)
        cue_times=[0,2.4,5.3,8,10.6,13.5]
        # Dedicated half-beat holds, rather than the electronic rock drop.
        events=[e for e in events if not (4.95<e[0]<5.5 or 7.65<e[0]<8)]
        add(5.5,'rim',45,.06,.12,-.3);add(6.6,'wood',81,.32,.11,.4)
        chord(13.5,[57,60,64,69],'pluck',.65,.08)
    elif genre=='bright-breaks':
        # Bright major-sixth FM mallets and syncopated bass. No rock guitar pattern.
        roots=[41,46,43,48]
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=roots[b%4]
            for off in (0,1.75,2.5,3.25):kick(at+off*beat,.3)
            for off in (1,3):add(at+off*beat,'rim',45,.055,.13,-.16)
            for k in range(8):add(at+k*beat/2+(.015 if k%2 else 0),'shaker',45,.1,.07,.4 if k%2 else -.4)
            for off,n in [(0,root),(.75,root+12),(1.5,root+7),(2.75,root+9),(3.5,root+12)]:add(at+off*beat,'bass',n,.23,.19)
            for off,n in [(0,root+24),(.5,root+31),(1.25,root+28),(2,root+33),(2.75,root+31),(3.5,root+36)]:add(at+off*beat,'marimba',n,.32,.14,(off/4-.5)*.8,True)
        # Break down at the visible bridge defect; resolution lands on the repaired crossing.
        events=[e for e in events if not 4.6<=e[0]<5.9 or e[1]=='marimba']
        add(4.6,'wood',65,.2,.11);add(6.2,'marimba',77,.45,.2,-.2,True)
        chord(10.5,[53,57,60,65,69],'marimba',.8,.055);cue_times=[0,2.6,4.6,6.2,7.8,10.5,11.1]
    elif genre=='noir-pulse':
        # Sparse minor ninth, deep low end, asymmetrical hats and slow night-road notes.
        roots=[30,30,27,32]
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=roots[b%4]
            for off in (0,2.5):kick(at+off*beat,.31)
            add(at+2*beat,'snare',45,.23,.09,-.2)
            for off in (.5,1.75,2.75,3.5):add(at+off*beat,'hat',45,.065,.045,.45 if off<2 else -.45)
            for off in (0,1.5,2.75):add(at+off*beat,'sub',root,.65,.22)
            if b%2==0:chord(at,[root+24,root+31,root+38],'pad',bar*1.7,.044)
            add(at+1.25*beat,'glass',root+36,.9,.045,.5,True)
        cue_times=[0,duration*.28,duration*.52,duration*.78]
        add(duration*.52,'rim',45,.06,.065,-.4)
    elif genre=='architectural':
        # Meter breathes: spacious piano triplets above sustained fourth/fifth shapes.
        roots=[48,45,53,50]
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=roots[b%4]
            chord(at,[root,root+7,root+14],'pad',bar*1.3,.045)
            for off,n in [(0,root+12),(4/3,root+19),(8/3,root+16)]:add(at+off*beat,'piano',n,1.8,.16,(off/4-.5)*.55,True)
            if b>0:add(at,'hand',45,.3,.07)
            if b%2:add(at+3*beat,'brush',45,.28,.025,.5)
        for at,n in [(duration*.25,79),(duration*.5,76),(duration*.75,81)]:add(at,'piano',n,2,.11,.32,True)
    elif genre=='garage':
        # Mechanized sixteenth break, distorted monosynth stabs and short steel impacts.
        roots=[31,31,34,29]
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=roots[b%4]
            for off in (0,.75,1.5,2.25,3,3.5):kick(at+off*beat,.36 if off==0 else .24)
            for off in (1,3):snare(at+off*beat,.22)
            for k in range(16):
                if k%4!=3:add(at+k*beat/4,'hat',45,.045,.035 if k%2 else .065,(-1 if k%2 else 1)*.35)
            for off,n in [(0,root),(.5,root),(1.25,root+12),(2,root+7),(2.75,root),(3.5,root+10)]:add(at+off*beat,'dirty',n,.19,.17)
            for off in (1.75,3.75):add(at+off*beat,'metal',45,.095,.042,.5 if off>2 else -.5)
        for n,at in enumerate(cue_times[1:]):add(at,'fuzz',[55,58,62][n],.3,.16,.25,True)
        events=[e for e in events if not duration*.48<e[0]<duration*.54]
    elif genre=='prism':
        # Inharmonic glass over a minimal sub pulse, with a five-step repeating optical motif.
        notes=[74,81,78,85,76]
        for k in range(math.ceil(duration/(beat*.75))):
            at=k*beat*.75;add(at,'glass',notes[k%5],.92,.095,math.sin(k*1.7)*.65,True)
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=[26,29,31,24][b%4]
            for off in (0,1.5,3):add(at+off*beat,'sub',root,.8,.18)
            add(at+2*beat,'brush',45,.23,.04,.4)
            if b%2==0:chord(at,[root+36,root+43],'pad',bar*1.7,.028)
        for at in cue_times[1:]:add(at,'glass',88,1.1,.07,-.5,True)
    elif genre=='dispatch':
        # Warm upward arpeggios, a marching pulse, soft snare and a hopeful final inversion.
        roots=[45,41,48,43]
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=roots[b%4]
            for off in (0,1.5,2,3.25):kick(at+off*beat,.25)
            for off in (1,3):snare(at+off*beat,.12)
            for off in (.75,2.75,3.5):add(at+off*beat,'rim',45,.055,.04,-.3)
            for k in range(8):
                n=root+[12,19,24,28,24,19,16,19][k]
                add(at+k*beat/2,'arp',n,.43,.095,(k%4-1.5)*.22,True)
            add(at,'bass',root-12,.65,.2)
            if b>=2:chord(at,[root+12,root+19,root+24],'pad',bar,.028)
        chord(duration*.75,[53,57,60,65],'pad',duration*.25-.1,.04)
    else:
        # A distinct swung jazz trio: Rhodes voicings, walking acoustic-style plucks,
        # brushed hats, and a syncopated soft wood/rim comping pattern.
        roots=[41,46,43,48]
        for b in range(math.ceil(duration/bar)):
            at=b*bar;root=roots[b%4]
            chord(at+.08,[root+12,root+19,root+22,root+26],'rhodes',2.4,.09)
            for k in range(4):
                add(at+k*beat,'pluck',root-12+[0,7,9,10][k],.48,.3,-.18)
                add(at+k*beat,'brush',45,.2,.032,.4)
                add(at+(k+2/3)*beat,'hat',45,.075,.025,-.35)
            for off in (1.0,2+2/3,3.5):add(at+off*beat,'rim',45,.06,.045,.16)
            if b%2: add(at+3.5*beat,'wood',root+31,.5,.055,.5,True)
        chord(duration*.75,[53,57,60,64,67],'rhodes',duration*.25-.1,.08)
    # A section-specific arrangement envelope creates a clear beginning, build,
    # central breath and release. This does not turn the nine cues into one motif.
    rendered_events=0
    for at,name,note,dur,gain,pan,room in sorted(events):
        sec=section(at)
        if sec==0 and name=='pad':gain*=.7
        if sec==1 and name in ('bass','dirty','sub'):gain*=1.12
        if sec==3 and name in ('hat','snare','metal'):gain*=.72
        data=voice(name,note,round(dur,3));offset=round(at*RATE);gl=math.sqrt((1-pan)/2)*gain;gr=math.sqrt((1+pan)/2)*gain
        for i,v in enumerate(data):
            j=offset+i
            if j>=count:break
            left[j]+=v*gl;right[j]+=v*gr
        if room:
            for delay,g,swap in ((.081,.105,True),(.147,.055,False)):
                dest=offset+round(delay*RATE)
                for i,v in enumerate(data):
                    j=dest+i
                    if j>=count:break
                    left[j]+=v*(gr if swap else gl)*g;right[j]+=v*(gl if swap else gr)*g
        rendered_events+=1
    peak=max(max(abs(v) for v in left),max(abs(v) for v in right),1e-9)
    # Target is below the requested 0.68 ceiling. Fade edges avoid hover/loop clicks.
    gain=.635/peak
    squares=0;postpeak=0;pcm=array('h')
    for i in range(count):
        t=i/RATE;fade=min(1,t/.012,max(0,(duration-t)/.15))
        if genre=='ink-rock' and 2.5<=t<3.5:
            duck=.16+.84*max(0,1-min((t-2.5)/.09,(3.5-t)/.09))
            fade*=min(1,duck)
        for source in (left,right):
            v=max(-.68,min(.68,source[i]*gain*fade));sample=round(v*32767);pcm.append(sample);normal=sample/32767;squares+=normal*normal;postpeak=max(postpeak,abs(normal))
    if sys.byteorder!='little':pcm.byteswap()
    return pcm,{'id':track_id,'genre':genre,'duration':count/RATE,'bpm':bpm,'sampleRate':RATE,'channels':2,'bitDepth':16,'peak':round(postpeak,6),'rms':round(math.sqrt(squares/(count*2)),6),'events':rendered_events,'cueTimes':cue_times,'synthesis':'original oscillators and seeded noise; no external samples','listeningVerified':False}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id',required=True);parser.add_argument('--duration',type=float,required=True);parser.add_argument('--bpm',type=float,required=True);parser.add_argument('--genre',choices=GENRES,required=True);parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    if not 1<=args.duration<=120 or not 40<=args.bpm<=220:parser.error('duration or bpm outside supported range')
    pcm,metadata=compose(args.id,args.duration,args.bpm,args.genre)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(args.out),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
    metadata['file']=str(args.out)
    args.out.with_suffix('.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(metadata,ensure_ascii=False))
if __name__=='__main__':main()
