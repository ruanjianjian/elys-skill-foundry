"""Two independent original scores: irregular digital lab and a warm swing quartet.
No previous score module, external samples or network resources are imported.
"""
import math
from functools import lru_cache
import numpy as np
RATE=48000
TAU=math.tau

def hz(n):return 440*2**((n-69)/12)
def stereo(v,p=0):return np.stack((v*math.sqrt((1-p)/2),v*math.sqrt((1+p)/2)),axis=1).astype(np.float32)
def envelope(t,d,a=.003,r=.04):return np.minimum(1,t/a)*np.minimum(1,np.maximum(0,(d-t)/r))
def noise(n,seed,lo,hi):
    size=1<<(n-1).bit_length();rng=np.random.default_rng(seed);f=np.fft.rfftfreq(size,1/RATE)
    band=(1-np.exp(-(f/max(1,lo))**2))*np.exp(-(f/hi)**6)
    v=np.fft.irfft(np.fft.rfft(rng.standard_normal(size))*band,size)[:n]
    return v/max(float(np.std(v)),1e-7)
class Bus:
    def __init__(self,d):self.n=round(d*RATE);self.a=np.zeros((self.n,2),np.float32);self.events=[]
    def put(self,at,v,g,p=0,label='',note=None):
        start=round(at*RATE)
        if start<0 or start>=self.n:return
        n=min(len(v),self.n-start)
        a=stereo(v[:n],p) if v.ndim==1 else v[:n]*np.array([math.sqrt(1-p),math.sqrt(1+p)])
        self.a[start:start+n]+=a*g;self.events.append({'at':round(at,6),'instrument':label,'note':note})
    def finish(self,gaps=(),room=0):
        a=self.a.astype(np.float64)
        if room:
            old=a.copy()
            for delay,gain in [(0.047,.08),(0.103,.035)]:
                k=round(delay*RATE);a[k:]+=old[:-k,::-1]*gain*room
        for start,end in gaps:
            lo=max(0,round(start*RATE));hi=min(self.n,round(end*RATE));n=hi-lo
            if n<=0:continue
            gate=np.zeros(n);edge=min(round(.01*RATE),n//3)
            if edge:
                theta=np.linspace(0,math.pi,edge);gate[:edge]=.5*(1+np.cos(theta));gate[-edge:]=.5*(1-np.cos(theta))
            a[lo:hi]*=gate[:,None]
        a=np.tanh(a);a-=a.mean(axis=0)
        a*=np.minimum(1,np.arange(self.n)/(.006*RATE))[:,None]
        a*=np.minimum(1,(self.n-1-np.arange(self.n))/(.07*RATE))[:,None]
        assert np.isfinite(a).all() and np.max(np.abs(a))>.001
        return a.astype(np.float32)
def metadata(tid,d,bpm,genre,bus,sections,palette,meter,signature):
    arr=[{'at':s,'section':n,'description':desc} for s,n,desc in sections if s<d]
    return {'id':tid,'genre':genre,'duration':round(d*RATE)/RATE,'bpm':bpm,'sampleRate':RATE,'channels':2,'cueTimes':[x['at'] for x in arr],'arrangement':arr,'palette':palette,'meter':meter,'introSignature':signature,'events':bus.events,'eventCount':len(bus.events),'synthesis':'original NumPy oscillators and seeded noise; no external samples','listeningVerified':False}

@lru_cache(maxsize=120)
def digital(kind,index,d):
    t=np.arange(round(d*RATE))/RATE;freq=[277,451,733,1193,1871][index%5]
    if kind=='click':
        v=np.sin(TAU*freq*t)*np.exp(-t*145)+noise(len(t),5110+index,1800,6200)*np.exp(-t*300)*.17
    elif kind=='grain':
        square=np.where(np.sin(TAU*freq*t)>=0,1,-1)*.35
        # Eight-bit sample/hold shards, deliberately non-tonal and very brief.
        hold=[5,9,13,7,11][index%5];v=np.repeat(square[::hold],hold)[:len(t)]
        v=np.round(v*24)/24;v*=np.sin(math.pi*np.minimum(1,t/d))**2
    elif kind=='microtone':v=(np.sin(TAU*freq*t)+.2*np.sin(TAU*freq*1.731*t))*np.exp(-t*58)
    elif kind=='low_probe':v=np.sin(TAU*(61+index*7)*t)*np.exp(-t*18)*.65
    else:raise ValueError(kind)
    return (v*envelope(t,d,.0008,.008)).astype(np.float32)
def glitch(tid,d,bpm):
    m=Bus(d);beat=60/bpm;bar=5*beat
    base=[(0,'click',0),(.75,'grain',3),(1.6,'click',1),(2.5,'microtone',4),(3.15,'grain',2),(4.45,'click',3)]
    for k in range(math.ceil(d/bar)):
        origin=k*bar
        for j,(off,kind,index) in enumerate(base):
            at=origin+off*beat
            if at>=10.9 and j not in (0,2,5):continue
            if 4.8<=at<7.6:off+=(.125 if j%2 else -.125)
            at=origin+off*beat
            length={'click':.046,'grain':.09,'microtone':.16}[kind]
            m.put(at,digital(kind,(index+k)%5,length),.15 if kind=='click' else .28,(-.65 if j%2 else .65)*(-1 if k%2 else 1),label='5/4 '+kind)
            if 7.6<=at<10.9:
                m.put(at+.077,digital('grain',(index+2)%5,.043),.15,-.4 if j%2 else .4,label='offset fragment reassembly')
        m.put(origin+.25*beat,digital('low_probe',k%3,.23),.32,0,label='sparse low-frequency probe')
    # Precise call/reply packet at the opening, not a sung or pop-scale melody.
    for at,index in [(0,0),(.12,2),(.41,4),(.68,1)]:m.put(at,digital('click',index,.035),.09,(-1 if index%2 else 1)*.7,label='opening digital packet')
    for at in (4.8,7.6,10.9):
        m.put(at,digital('grain',3,.14),.23,-.3,label='section splice')
        m.put(at+.18,digital('click',1,.044),.11,.4,label='splice answer')
    for j,at in enumerate((11.35,12.4,13.3)):
        m.put(at,digital('microtone',j,.2),.23,-.4,label='resolved sparse trace')
        m.put(at+.11,digital('click',j,.04),.075,.4,label='resolved trace pair')
    sections=[(0,'five-beat packet','irregular click and 8-bit fragments enter immediately'),(4.8,'phase displacement','alternating packets shift an eighth-grid offset'),(7.6,'fragment reassembly','delayed mirror shards increase local density'),(10.9,'precise sparse result','only paired traces remain; no EDM drop')]
    # Keep the scheduled sparse packets, but let their held/grain bodies carry
    # the mix instead of isolated sub-millisecond click peaks. This saturation
    # belongs only to the lab score; the acoustic jazz bus stays untouched.
    a=m.finish([(7.22,7.47)],0)
    a=(np.tanh(a.astype(np.float64)*12)/12).astype(np.float32)
    # Bus DC removal leaves a tiny floor: reapply this existing silence gate
    # after saturation, with smooth edges and a genuinely zero centre.
    lo=max(0,round(7.22*RATE));hi=min(len(a),round(7.47*RATE));n=hi-lo
    if n>0:
        edge=min(round(.01*RATE),n//3);gate=np.zeros(n)
        if edge:
            theta=np.linspace(0,math.pi,edge)
            gate[:edge]=.5*(1+np.cos(theta));gate[-edge:]=.5*(1-np.cos(theta))
        a[lo:hi]*=gate[:,None]
    info=metadata(tid,d,bpm,'glitch-lab',m,sections,['5/4 digital click','8-bit held micrograins','inharmonic microtones','sparse low probes'],'5/4 irregular subdivisions; no kick/snare backbeat','A dry left/right four-click packet, followed by a non-tonal crushed shard')
    info['transientControl']={'method':'lab-only tanh soft saturation','drive':12,'clickGain':.15,'grainBodyGain':.28,'lowProbeGain':.32,'scheduledEventsUnchanged':True,'silenceSeconds':[7.22,7.47]}
    return a,info

@lru_cache(maxsize=64)
def jazz_drum(kind):
    d={'swish':.43,'tap':.19,'ride':.48,'foot':.26}[kind];t=np.arange(round(d*RATE))/RATE
    if kind=='swish':
        n=noise(len(t),6110,500,5600);v=n*np.sin(np.minimum(1,t/.2)*math.pi/2)*np.exp(-t*5)*.26
    elif kind=='tap':v=noise(len(t),6111,1300,6300)*np.exp(-t*29)*.31
    elif kind=='ride':
        v=sum(np.sin(TAU*f*t)*g*np.exp(-t*decay) for f,g,decay in [(1807,.12,9),(2561,.09,12),(3727,.06,16),(5021,.04,20)])
        v+=noise(len(t),6112,3400,8500)*np.exp(-t*22)*.06
    else:v=np.sin(TAU*(65*t+13*.02*(1-np.exp(-t/.02))))*np.exp(-t*18)*.5
    return (v*envelope(t,d,.002,.025)).astype(np.float32)
@lru_cache(maxsize=220)
def jazz_note(kind,note,d):
    t=np.arange(round(d*RATE))/RATE;ph=TAU*hz(note)*t
    if kind=='upright':
        period=max(12,round(RATE/hz(note)));rng=np.random.default_rng(7100+note);string=rng.uniform(-.5,.5,period);v=np.empty(len(t));idx=0
        for i in range(len(t)):
            value=string[idx];string[idx]=(value+string[(idx+1)%period])*.4955;v[i]=value;idx=(idx+1)%period
        # Round body is stronger than the string transient, unlike the detective pizz.
        v=v*.95+np.sin(ph)*np.exp(-t*4.2)*.3
    elif kind=='rhodes':
        v=(np.sin(ph+1.2*np.sin(ph*4)*np.exp(-t*11))+.2*np.sin(ph*2.002))*np.exp(-t*2.3)
    elif kind=='flute':
        breath=noise(len(t),7200+note,900,3800)*.035
        vibrato=.009*np.sin(TAU*5.1*t)*(1-np.exp(-t*6))
        v=np.sin(ph+vibrato)+.16*np.sin(ph*2)+breath
        v*=np.minimum(1,t/.035)*np.exp(-t*1.2)
    else:raise ValueError(kind)
    return stereo(v*envelope(t,d,.006,.095))
def jazz(tid,d,bpm):
    m=Bus(d);b=60/bpm;bar=4*b
    changes=[([48,52,55,59],36),([53,57,60,64],41),([50,53,57,60],38),([55,59,62,65],43)]
    for k in range(math.ceil(d/bar)):
        origin=k*bar;voicing,root=changes[k%4]
        for j in range(4):
            at=origin+j*b
            m.put(at,jazz_drum('ride'),.16 if j in (0,2) else .2,.4,label='jazz ride quarter')
            if j in (1,3):m.put(at+2*b/3,jazz_drum('ride'),.115,.45,label='ride swung triplet skip')
            m.put(at+(0 if j%2 else .045),jazz_drum('swish'),.14,-.35,label='circular brush sweep')
            if j in (1,3):m.put(at,jazz_drum('tap'),.14,-.15,label='brush backbeat tap')
            n=root+[0,4,7,9][j]
            m.put(at,jazz_note('upright',n,.62),.5,-.12,label='quarter-note walking upright',note=n)
        m.put(origin,jazz_drum('foot'),.12,label='feathered bass drum')
        for off in (.6667,2.5):
            for j,n in enumerate(voicing):m.put(origin+off*b+j*.013,jazz_note('rhodes',n+12,1.25),.115,(j-1.5)*.28,label='Rhodes seventh-chord comp',note=n+12)
    # Breath-led flute plays short swing sentences, leaving full bars for the trio.
    phrases=[(0,[(0,72),(.6667,76),(1.6667,79),(2.6667,76)]),(5.7,[(0,77),(.6667,81),(1.6667,79),(2.6667,76)]),(11.4,[(0,74),(.6667,77),(1.6667,76),(2.6667,72)])]
    for at,phrase in phrases:
        for off,n in phrase:m.put(at+off*b,jazz_note('flute',n,.48),.11,.25,label='short swung flute sentence',note=n)
    # Middle four-bar view makes room for bass/brushes, then the woodwind returns.
    m.put(8.55,jazz_drum('tap'),.13,-.4,label='bass-feature pickup')
    for j,n in enumerate((60,64,67,71)):m.put(max(0,d-1.5)+j*.016,jazz_note('rhodes',n,1.55),.095,(j-1.5)*.3,label='warm unresolved jazz tag',note=n)
    sections=[(0,'quartet opening','flute sentence, Rhodes seventh, walking bass and triplet ride'),(2.86,'trio conversation','flute rests while bass/brushes continue'),(5.7,'second wind sentence','woodwind answers the first phrase'),(8.55,'bass and brushes','trio has space; no electronic build or drop'),(11.4,'final flute answer','short swung melody returns'),(d-1.5,'warm jazz tag','electric piano rings over the continuing walk')]
    return m.finish((),.65),metadata(tid,d,bpm,'brushed-jazz',m,sections,['circular brushed snare','triplet-swing ride','walking upright bass','Rhodes seventh chords','breathy flute sentences'],'4/4 jazz swing, 2:1 triplet eighths and quarter-note walking bass','Warm Rhodes and a breathy flute pickup over a walking upright, with swung ride skips')

def compose(track_id,duration,bpm,genre):
    if genre=='glitch-lab':return glitch(track_id,duration,bpm)
    if genre=='brushed-jazz':return jazz(track_id,duration,bpm)
    raise ValueError('Unsupported precise score genre: '+str(genre))
