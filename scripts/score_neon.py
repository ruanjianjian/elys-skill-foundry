"""Three independently arranged original instrumental scores.

Public API: compose(track_id, duration, bpm, genre) -> (Nx2 float32, metadata).
48 kHz; NumPy only. No shared drum kit, chord loop or arrangement template.
No samples, voices, model calls or imports from the previous score generator.
"""
from functools import lru_cache
import math
import numpy as np

RATE=48000
TAU=math.tau

def hz(n):return 440*2**((n-69)/12)
def e(t,d,a=.003,r=.045):return np.minimum(1,t/max(a,.0001))*np.minimum(1,np.maximum(0,(d-t)/max(.001,r)))
def pan(v,p=0):return np.stack((v*math.sqrt((1-p)/2),v*math.sqrt((1+p)/2)),axis=1).astype(np.float32)
def noise(n,seed,lo,hi):
    size=1<<(n-1).bit_length();rng=np.random.default_rng(seed);f=np.fft.rfftfreq(size,1/RATE)
    shape=(1-np.exp(-(f/max(1,lo))**2))*np.exp(-(f/hi)**6)
    v=np.fft.irfft(np.fft.rfft(rng.standard_normal(size))*shape,size)[:n]
    return v/max(float(np.std(v)),1e-7)

class Mix:
    def __init__(self,duration):
        self.duration=duration;self.n=round(duration*RATE)
        self.buses={};self.events=[];self.kicks=[]
    def add(self,at,v,gain,bus='music',p=0,label='',note=None):
        i=round(at*RATE)
        if i<0 or i>=self.n:return
        count=min(len(v),self.n-i)
        if count<=0:return
        if bus not in self.buses:self.buses[bus]=np.zeros((self.n,2),np.float32)
        a=v[:count]
        if a.ndim==1:a=pan(a,p)
        elif p:a=a*np.array([math.sqrt(1-p),math.sqrt(1+p)])
        self.buses[bus][i:i+count]+=a*gain
        self.events.append({'at':round(at,6),'instrument':label or bus,'bus':bus,'note':note})
        if bus=='kick':self.kicks.append(at)
    def echo(self,bus,delay,gain,swap=True):
        if bus not in self.buses:return
        k=round(delay*RATE)
        if 0<k<self.n:
            source=self.buses[bus].copy()
            self.buses[bus][k:]+=source[:-k,::-1] * gain if swap else source[:-k]*gain
    def duck(self,bus,depth,release):
        if bus not in self.buses:return
        curve=np.ones(self.n,np.float32)
        for at in self.kicks:
            start=round(at*RATE);count=min(round(release*5*RATE),self.n-start)
            if count<=0:continue
            t=np.arange(count)/RATE;v=1-depth*(1-np.exp(-t/.002))*np.exp(-t/release)
            curve[start:start+count]=np.minimum(curve[start:start+count],v)
        self.buses[bus]*=curve[:,None]
    def finish(self,gaps=(),warmth=1):
        a=sum(self.buses.values(),np.zeros((self.n,2),np.float32)).astype(np.float64)
        a=np.tanh(a*warmth)/warmth
        a-=a.mean(axis=0)
        for start,end in gaps:
            lo=max(0,round(start*RATE));hi=min(self.n,round(end*RATE));n=hi-lo
            if n<=0:continue
            gate=np.zeros(n);edge=min(round(.018*RATE),n//3)
            if edge:
                theta=np.linspace(0,math.pi,edge);gate[:edge]=.5*(1+np.cos(theta));gate[-edge:]=.5*(1-np.cos(theta))
            a[lo:hi]*=gate[:,None]
        ramp=np.minimum(1,np.arange(self.n)/(.005*RATE))*np.minimum(1,(self.n-1-np.arange(self.n))/(.07*RATE))
        a*=ramp[:,None]
        assert np.isfinite(a).all() and np.max(np.abs(a))>1e-5
        return a.astype(np.float32)

# SHIBUYA: polished acoustic-like kick, fingertip snaps and soft tambourine.
# Entirely independent of the breakbeat and industrial percussion below.
@lru_cache(maxsize=32)
def city_drum(kind):
    d={'kick':.28,'snap':.17,'tamb':.11,'soft_open':.19,'stick':.05}[kind]
    t=np.arange(round(d*RATE))/RATE
    if kind=='kick':
        v=np.sin(TAU*(62*t+57*.018*(1-np.exp(-t/.018))))*np.exp(-t*19)
        v+=.11*np.sin(TAU*143*t)*np.exp(-t*75)
    elif kind=='snap':
        v=noise(len(t),1102,1200,5700)*(.42*np.exp(-t*61)+.3*np.where(t>.009,np.exp(-np.maximum(0,t-.009)*38),0))
        v+=.1*np.sin(TAU*1120*t)*np.exp(-t*115)
    elif kind in ('tamb','soft_open'):
        v=noise(len(t),1103,4600,9500)*np.exp(-t*(57 if kind=='tamb' else 23))*.3
        v+=sum(np.sin(TAU*f*t) for f in (3167,4853,7019))*.025*np.exp(-t*40)
    else:v=(np.sin(TAU*783*t)+.22*np.sin(TAU*1541*t))*np.exp(-t*115)
    return (v*e(t,d,.0008,.02)).astype(np.float32)

@lru_cache(maxsize=256)
def city_note(kind,note,d):
    t=np.arange(round(d*RATE))/RATE;f=hz(note);ph=TAU*f*t
    if kind=='fingerbass':
        v=np.sin(ph)+.24*np.sin(ph*2)*np.exp(-t*12)+.08*np.sin(ph*3)*np.exp(-t*23)
        v*=np.exp(-t*3.4)*e(t,d,.002,.05)
        return pan(v)
    if kind=='bright_pluck':
        # Rounded FM tine, not a saw or the previous detuned EDM lead.
        v=np.sin(ph+1.8*np.sin(ph*2)*np.exp(-t*26))*.8+.12*np.sin(ph*3)*np.exp(-t*18)
        v*=np.exp(-t*7)*e(t,d,.001,.07)
        return pan(v)
    if kind=='reed_chord':
        v=sum(np.sin(ph*k)*(math.exp(-((k-3)/3.2)**2)/k)*np.exp(-t*(2+k*.5)) for k in range(1,8))
        v*=e(t,d,.014,.09)
        return pan(v)
    if kind=='silk_keys':
        l=np.sin(ph+1.0*np.sin(ph*4)*np.exp(-t*13))+.13*np.sin(ph*2.002)
        r=np.sin(ph*1.0008+1.0*np.sin(ph*4.003)*np.exp(-t*13))+.13*np.sin(ph*1.998)
        return np.stack((l,r),axis=1)*e(t,d,.012,.1)[:,None]*np.exp(-t*3.8)[:,None]*.6
    raise ValueError(kind)

def shibuya(track_id,duration,bpm):
    m=Mix(duration);b=60/bpm;bar=4*b
    voicings=[(52,56,59,63),(49,52,56,59),(54,57,61,64),(47,51,54,61)]
    for k in range(math.ceil(duration/bar)):
        at=k*bar;ch=voicings[k%4];root=ch[0]-12
        for off in ([0,1.5,2.75] if k%2==0 else [0,.75,2.5,3.5]):
            if not 2.5<=at+off*b<3.35:m.add(at+off*b,city_drum('kick'),.42,'kick',label='tight acoustic-pop kick')
        for off in (1,3):
            if not 2.5<=at+off*b<3.35:
                m.add(at+off*b,city_drum('snap'),.21,'drums',-.1,label='layered fingertip snap')
                m.add(at+off*b+.011,city_drum('snap'),.075,'drums',.55,label='wide snap reflection')
        for j in range(8):
            time=at+j*b/2+(.012 if j%2 else 0)
            if not 2.5<=time<3.35:m.add(time,city_drum('tamb'),.055 if j%2 else .032,'drums',.4 if j%2 else -.4,label='light tambourine')
        bass=[(0,root),(.75,root+12),(1.5,root+7),(2.25,root+9),(3,root+7),(3.5,root+12)]
        for off,n in bass:
            time=at+off*b
            if not 2.5<=time<3.35:m.add(time,city_note('fingerbass',n,b*.68),.31,'bass',label='bouncing fingerbass',note=n)
        for off in (.5,2.25,3.5):
            if 2.5<=at+off*b<3.35:continue
            for j,n in enumerate(ch):
                m.add(at+off*b+j*.007,city_note('reed_chord',n,.47),.14,'chords',(j-1.5)*.29,label='short major-seven reed chord',note=n)
        if k in (2,4,6):
            for j,n in enumerate(ch):m.add(at+j*.012,city_note('silk_keys',n+12,1.1),.085,'keys',(j-1.5)*.2,label='silk electric keys',note=n+12)
    # Major-pentatonic four-note question and a rising answer. Motif repeats.
    call=[(0,76),(.5,73),(1.25,71),(2,73)]
    answer=[(0,76),(.75,78),(1.5,80),(2.5,78)]
    for phrase in range(math.ceil(duration/(bar*2))):
        origin=phrase*bar*2
        for off,n in call:
            time=origin+off*b
            if not 2.5<=time<3.35:m.add(time,city_note('bright_pluck',n,.46),.19,'hook',-.16,label='four-note pop question',note=n)
        for off,n in answer:
            time=origin+bar+off*b
            if not 2.5<=time<3.35:m.add(time,city_note('bright_pluck',n,.5),.17,'hook',.2,label='ascending pop answer',note=n)
    # A real reed-comping entrance at the card shot, then a thinner key-led reply.
    for time in (5.5,6.45,7.4):
        for j,n in enumerate(voicings[1]):m.add(time+j*.008,city_note('reed_chord',n,.36),.115,'chords',(j-1.5)*.28,label='chorus reed entrance',note=n)
    if 'chords' in m.buses:m.buses['chords'][round(10*RATE):round(12.3*RATE)]*=.52
    for j,n in enumerate(voicings[2]):m.add(10+j*.014,city_note('silk_keys',n+12,1.25),.12,'keys',(j-1.5)*.28,label='lighter key-led answer',note=n+12)
    # The closing phrase resolves gently; it is not the EDM stop/stinger template.
    for j,n in enumerate((64,68,71,75)):m.add(max(0,duration-1.2)+j*.012,city_note('silk_keys',n,1.25),.1,'keys',(j-1.5)*.28,label='open city-pop cadence',note=n)
    m.echo('hook',b*.75,.13);m.echo('keys',.111,.07)
    m.duck('bass',.32,.065);m.duck('chords',.18,.055)
    sections=[(0,'immediate pop question','bright FM tine over elastic bass; no saw lead'),(2.5,'character breath','full-bus stop for the eye close-up'),(3.35,'answer returns','ascending four-note answer and snapped backbeat'),(5.5,'chorus comping','short brassy major-seven voicings'),(10,'lighter second answer','keys replace density rather than adding an EDM drop'),(duration-1.2,'open cadence','sustained electric-key resolution without a stinger')]
    a=m.finish([(2.5,3.35)],.95)
    return a,meta(track_id,duration,bpm,'shibuya-pop',m,sections,['FM tine pluck','short additive reed/brass chords','major-seven silk keys','bouncing fingerbass','snap and tambourine'],'4/4 syncopated city-pop; no four-on-the-floor','Major-pentatonic tine question + fingerbass + light snap in the first second')

# DETECTIVE: a deliberately dirty break kit, acoustic pizzicato and odd-harmonic
# woodwind. No city snap, no electronic-pop voicing or common drum samples.
@lru_cache(maxsize=32)
def detective_drum(kind):
    d={'boot':.41,'break_snare':.31,'dust_hat':.12,'ghost':.16,'woodblock':.08,'brush_drag':.24}[kind]
    t=np.arange(round(d*RATE))/RATE
    if kind=='boot':v=np.sin(TAU*(46*t+61*.036*(1-np.exp(-t/.036))))*np.exp(-t*11)+.13*np.sin(TAU*112*t)*np.exp(-t*39)
    elif kind in ('break_snare','ghost'):
        n=noise(len(t),2107,360,5200);v=n*np.exp(-t*(17 if kind=='break_snare' else 34))*.46+.38*np.sin(TAU*164*t)*np.exp(-t*25)
    elif kind=='dust_hat':v=noise(len(t),2108,2600,6800)*np.exp(-t*39)*.27
    elif kind=='woodblock':v=(np.sin(TAU*417*t)+.45*np.sin(TAU*769*t))*np.exp(-t*73)
    else:v=noise(len(t),2109,900,5800)*np.sin(np.minimum(1,t/.04)*math.pi/2)*np.exp(-t*13)*.32
    # Sample-and-hold plus 9-bit quantization gives this kit its own dusty texture.
    hold=4;v=np.repeat(v[::hold],hold)[:len(v)];v=np.round(v*256)/256
    return (np.tanh(v*1.6)*e(t,d,.001,.035)).astype(np.float32)

@lru_cache(maxsize=256)
def detective_note(kind,note,d):
    t=np.arange(round(d*RATE))/RATE;f=hz(note);ph=TAU*f*t
    if kind=='pizz':
        rng=np.random.default_rng(3100+note);period=max(12,round(RATE/f));exc=rng.uniform(-.45,.45,period);out=np.empty(len(t));idx=0
        for i in range(len(t)):
            value=exc[idx];exc[idx]=(value+exc[(idx+1)%period])*.494;out[i]=value;idx=(idx+1)%period
        out*=e(t,d,.002,.055)
        return pan(out)
    if kind=='clarinet':
        vibrato=.015*np.sin(TAU*5.4*t)*(1-np.exp(-t*8))
        v=sum(np.sin(ph*k+vibrato*k)/k**1.25 for k in (1,3,5,7,9))
        v*=e(t,d,.018,.09)*(.65+.35*np.exp(-t*8))
        return pan(v)
    if kind=='muted_horn':
        v=sum(np.sin(ph*k)*math.exp(-((k-4.2)/3)**2)/k for k in range(1,11))
        v*=e(t,d,.009,.07)*np.exp(-t*5)
        return pan(v)
    raise ValueError(kind)

def detective(track_id,duration,bpm):
    m=Mix(duration);b=60/bpm;bar=4*b
    for k in range(math.ceil(duration/bar)):
        at=k*bar
        kicks=([0,.75,2.25,3.5] if k%2==0 else [0,1.25,1.75,2.75,3.25])
        for off in kicks:m.add(at+off*b,detective_drum('boot'),.51,'kick',label='dusty low break kick')
        for off in (1,3):m.add(at+off*b,detective_drum('break_snare'),.29,'drums',-.08,label='grainy room snare')
        for off in (.875,2.875,3.75):m.add(at+off*b,detective_drum('ghost'),.055,'drums',.28,label='breakbeat ghost drag')
        for j in (0,1,3,4,6,7,9,11,12,14,15):m.add(at+(j/4+(.055 if j%2 else 0))*b,detective_drum('dust_hat'),.063 if j%4 else .095,'drums',-.4 if j%2 else .35,label='swung dusty hat')
        root=[38,38,41,36][k%4]
        for off,n in [(0,root),(.75,root+7),(1.75,root+12),(2.5,root+10),(3.25,root+7)]:m.add(at+off*b,detective_note('pizz',n,.44),.82,'bass',label='low acoustic pizzicato',note=n)
        if k%2:
            for off in (1.5,3.25):
                for j,n in enumerate((root+24,root+27,root+31)):m.add(at+off*b+j*.008,detective_note('muted_horn',n,.28),.22,'horn',(j-1)*.35,label='muted brass stab',note=n)
        if k in (0,3,5):m.add(at+3.5*b,detective_drum('brush_drag'),.12,'drums',.35,label='reverse-feeling brush drag')
    # A cheeky chromatic detective riff; call and reply use leaps and a tritone.
    calls=[(0,62),(.5,65),(1.25,68),(1.75,67),(2.75,62)]
    replies=[(0,74),(.75,72),(1.5,69),(2.25,68),(3.5,62)]
    for phrase in range(math.ceil(duration/(bar*2))):
        origin=phrase*bar*2
        for off,n in calls:m.add(origin+off*b,detective_note('clarinet',n,.29 if off<2 else .49),.25,'woodwind',-.2,label='chromatic detective question',note=n)
        for off,n in replies:m.add(origin+bar+off*b,detective_note('clarinet',n,.35),.22,'woodwind',.25,label='falling woodwind reply',note=n)
    # One exposed bass/woodblock moment near the clue, then the chase returns.
    solo_start=6.6;solo_end=8.3
    for bus in ('kick','drums','horn'):
        if bus in m.buses:m.buses[bus][round(solo_start*RATE):round(solo_end*RATE)]*=.1
    for at,n in [(6.6,38),(7.05,45),(7.5,50),(7.9,48)]:m.add(at,detective_note('pizz',n,.34),.9,'bass',label='exposed clue pizzicato',note=n)
    m.add(7.15,detective_drum('woodblock'),.18,'drums',.4,label='clue woodblock')
    for bus in ('kick','drums'):
        if bus in m.buses:m.buses[bus][round(13.2*RATE):]*=.4
    if 'woodwind' in m.buses:m.buses['woodwind'][round(13.2*RATE):]*=.2
    for off,n in [(0,65),(.45,64),(.9,62),(1.45,61),(2,62)]:m.add(13.2+off,detective_note('clarinet',n,.43),.22,'woodwind',.15,label='closing chromatic detective turn',note=n)
    m.echo('woodwind',.091,.065);m.echo('horn',.065,.08);m.duck('bass',.28,.09)
    sections=[(0,'dusty detective riff','coarse low breakbeat and chromatic clarinet enter together'),(3.1,'sudden stop-time','short comic cut before the reply'),(3.42,'reply and brass','falling clarinet with muted horn stabs'),(6.6,'clue solo','drums recede; exposed low pizzicato and woodblock'),(8.3,'chase resumes','broken drums return, never a four-floor drop'),(13.2,'case closes','riff reply and dusty tail; no festival stinger')]
    a=m.finish([(3.1,3.42),(7.98,8.18)],1.2)
    return a,meta(track_id,duration,bpm,'detective-bigbeat',m,sections,['9-bit dusty low break kit','swung ghost drags','odd-harmonic clarinet','low pizzicato string','muted brass stabs'],'4/4 swung breakbeat, uneven kick and ghosted snare','Low dusty break hit + upward chromatic woodwind leap, with no pop snap or four-floor kick')

# INDUSTRIAL: resonant metal and sliding 808 only. The pulse is half-time,
# with triplet command/response bursts. There is deliberately no chord track.
@lru_cache(maxsize=32)
def machine_hit(kind):
    d={'slam':.47,'anvil':.61,'wire':.32,'latch':.085,'triplet':.13}[kind]
    t=np.arange(round(d*RATE))/RATE
    if kind=='slam':
        v=np.sin(TAU*(39*t+117*.018*(1-np.exp(-t/.018))))*np.exp(-t*10)
        v+=noise(len(t),4101,150,3200)*np.exp(-t*74)*.16
    elif kind=='anvil':
        v=sum(np.sin(TAU*f*t)*amp*np.exp(-t*decay) for f,amp,decay in [(427,.4,9),(719,.31,14),(1091,.18,19),(1807,.1,24)])
        v+=noise(len(t),4102,600,4500)*.14*np.exp(-t*40)
    elif kind=='wire':
        v=sum(np.sin(TAU*f*t)*amp for f,amp in [(967,.27),(1561,.21),(2381,.09)])*np.exp(-t*18)
    elif kind=='latch':v=noise(len(t),4103,950,4200)*np.exp(-t*102)*.45+.25*np.sin(TAU*541*t)*np.exp(-t*95)
    else:v=(np.sin(TAU*263*t)+.32*np.sin(TAU*911*t))*np.exp(-t*47)*.5
    return (np.tanh(v*1.45)*e(t,d,.001,.04)).astype(np.float32)

@lru_cache(maxsize=128)
def slide808(start_note,end_note,d):
    t=np.arange(round(d*RATE))/RATE;f0,f1=hz(start_note),hz(end_note);tau=.075
    ph=TAU*(f1*t-(f1-f0)*tau*(1-np.exp(-t/tau)))
    v=(np.sin(ph)+.13*np.sin(ph*2)*np.exp(-t*5)+.035*np.sin(ph*3))*e(t,d,.004,.09)*np.exp(-t*1.4)
    return pan(np.tanh(v*1.25))

def industrial(track_id,duration,bpm):
    m=Mix(duration);b=60/bpm;bar=4*b
    for k in range(math.ceil(duration/bar)):
        at=k*bar
        for off in ([0,1.75,3.25] if k%2==0 else [0,.6667,2.75]):m.add(at+off*b,machine_hit('slam'),.57,'kick',label='forged low mechanical slam')
        m.add(at+2*b,machine_hit('anvil'),.4,'metal',-.1,label='half-time anvil backbeat')
        for j,off in enumerate((.3333,.6667,1.5,2.6667,3.75)):
            m.add(at+off*b,machine_hit('latch'),.12 if j%2 else .17,'metal',(-1 if j%2 else 1)*.5,label='triplet latch command')
        # A-B call is rhythmic and textural, not a pitched lead melody.
        if k%2==0:
            for off in (0,.3333,.6667):m.add(at+off*b,machine_hit('triplet'),.19,'commands',-.43,label='three-pulse command')
        else:
            for off in (1.5,1.8333,2.1667):m.add(at+off*b,machine_hit('wire'),.13,'commands',.43,label='metallic delayed response')
        slides=[(0,28,28,1.3),(1.75,28,34,.82),(3,34,26,.75)] if k%2==0 else [(0,26,26,1.2),(2.5,26,31,.9)]
        for off,a,z,d in slides:m.add(at+off*b,slide808(a,z,d),.45,'sub',label='mono 808 portamento',note=[a,z])
    # Separate command episodes, not a pop build / eight-second chorus.
    for bus in ('metal','commands'):
        if bus in m.buses:
            m.buses[bus][round(4.4*RATE):round(7.8*RATE)]*=.55
            m.buses[bus][round(11.6*RATE):]*=.65
    m.add(8.3,machine_hit('anvil'),.35,'metal',.25,label='same-session reply accent')
    m.add(11.6,machine_hit('slam'),.4,'kick',label='lead returns to control')
    m.echo('commands',b/3,.13);m.echo('metal',.083,.07);m.duck('sub',.48,.07)
    # A gradual mechanical shutdown closes the piece; no final chord or festival hit.
    if 'commands' in m.buses:
        lo=round(14*RATE)
        if lo<m.n:m.buses['commands'][lo:]*=np.linspace(1,.18,m.n-lo)[:,None]
    sections=[(0,'forged command','low 808 and triplet latch signature immediately'),(4.05,'mechanical breath','an abrupt short all-bus cut'),(4.4,'portamento exchange','808 slides and sparse command response; no harmony'),(7.8,'original-session continuation','metallic response repeats in the same rhythmic identity'),(11.6,'lead takes control','one low slam, slower metal density'),(14,'shutdown tail','commands fade instead of a major chord or EDM drop')]
    a=m.finish([(4.05,4.3),(8.9,9.12)],1.12)
    return a,meta(track_id,duration,bpm,'industrial-halfstep',m,sections,['resonant anvil and wire','low mechanical slam','mono portamento 808','triplet latch bursts','no chords or melodic lead'],'4/4 half-time, single beat-three metal backbeat, triplet subdivisions','Forged low slam + three clipped command pulses + gliding mono 808')

def meta(track_id,duration,bpm,genre,m,sections,palette,meter,signature):
    arrangement=[{'at':round(at,6),'section':name,'description':desc} for at,name,desc in sections if at<duration]
    return {'id':track_id,'genre':genre,'duration':round(duration*RATE)/RATE,'bpm':bpm,'sampleRate':RATE,'channels':2,'cueTimes':[s['at'] for s in arrangement],'arrangement':arrangement,'palette':palette,'meter':meter,'introSignature':signature,'eventCount':len(m.events),'events':m.events,'kickTimes':[round(x,6) for x in m.kicks],'synthesis':'original NumPy oscillators and seeded noise; no external samples or vocals','listeningVerified':False}

def compose(track_id,duration,bpm,genre):
    if genre=='shibuya-pop':return shibuya(track_id,duration,bpm)
    if genre=='detective-bigbeat':return detective(track_id,duration,bpm)
    if genre=='industrial-halfstep':return industrial(track_id,duration,bpm)
    raise ValueError('Unsupported neon score genre: '+str(genre))
