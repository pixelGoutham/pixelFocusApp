import React, { createContext, useContext, useRef, useState, useCallback } from "react";

// ─── Ambient sound definitions (Pure Math) ───────────────────────────────────
type SoundId = 'white' | 'brown' | 'pink' | 'rain' | 'storm' | 'ocean' | 'fire' | 'cafe' | 'wind';

interface SoundDef {
  id: SoundId;
  label: string;
  icon: React.ElementType;
  desc: string;
  activeColor: string;
}

import {
  CloudRain, Play, Pause, SpeakerHigh, SpeakerX,
  List, ArrowLeft, ArrowRight, Stop,
  Waveform, CloudLightning, Waves, Fire, Coffee, Wind
} from "@phosphor-icons/react";

export const SOUNDS: SoundDef[] = [
  { id: 'white', label: 'White Noise',  icon: Waveform, desc: 'Full-spectrum static', activeColor: 'text-zinc-400 dark:text-zinc-300' },
  { id: 'brown', label: 'Brown Noise',  icon: Waveform, desc: 'Deep rumbling calm', activeColor: 'text-amber-700 dark:text-amber-600' },
  { id: 'pink',  label: 'Pink Noise',   icon: Waveform, desc: 'Balanced natural hiss', activeColor: 'text-pink-500 dark:text-pink-400' },
  { id: 'rain',  label: 'Rain',         icon: CloudRain, desc: 'Gentle steady rainfall', activeColor: 'text-blue-500 dark:text-blue-400' },
  { id: 'storm', label: 'Thunderstorm', icon: CloudLightning, desc: 'Heavy downpour', activeColor: 'text-indigo-500 dark:text-indigo-400' },
  { id: 'ocean', label: 'Ocean Waves',  icon: Waves, desc: 'Slow rolling waves', activeColor: 'text-cyan-500 dark:text-cyan-400' },
  { id: 'fire',  label: 'Fireplace',    icon: Fire, desc: 'Warm crackling fire', activeColor: 'text-orange-500 dark:text-orange-400' },
  { id: 'cafe',  label: 'Café',         icon: Coffee, desc: 'Coffee-shop chatter', activeColor: 'text-amber-800 dark:text-amber-700' },
  { id: 'wind',  label: 'Wind',         icon: Wind, desc: 'Gentle outdoor breeze', activeColor: 'text-teal-500 dark:text-teal-400' },
];

interface ActiveSound { source: AudioBufferSourceNode; gain: GainNode; lfo?: OscillatorNode }

// ─── Web Audio Helper Functions (same as before) ───────────────────────────────────
function whiteBuffer(ctx: AudioContext): AudioBuffer {
  const b = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function brownBuffer(ctx: AudioContext): AudioBuffer {
  const b = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random()*2-1; d[i]=(last+0.02*w)/1.02; last=d[i]; d[i]*=3.5; }
  return b;
}
function pinkBuffer(ctx: AudioContext): AudioBuffer {
  const b = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = b.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i=0;i<d.length;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)/7;b6=w*.115926;}
  return b;
}
function bq(ctx: AudioContext, type: BiquadFilterType, freq: number, q=1, g=0): BiquadFilterNode {
  const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q; f.gain.value=g; return f;
}
function chain(src: AudioBufferSourceNode, gain: GainNode, ...filters: BiquadFilterNode[]): AudioBufferSourceNode {
  let node: AudioNode = src;
  for (const f of filters) { node.connect(f); node = f; }
  node.connect(gain); src.start(); return src;
}
function loop(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const s = ctx.createBufferSource(); s.buffer=buf; s.loop=true; return s;
}
function spawnSound(ctx: AudioContext, id: SoundId, dest: GainNode): ActiveSound {
  const gain = ctx.createGain(); gain.gain.value=1; gain.connect(dest);
  let lfo: OscillatorNode | undefined;
  switch (id) {
    case 'white': { const s=loop(ctx,whiteBuffer(ctx)); s.connect(gain); s.start(); return {source:s,gain}; }
    case 'brown': { const s=loop(ctx,brownBuffer(ctx)); s.connect(gain); s.start(); return {source:s,gain}; }
    case 'pink':  { const s=loop(ctx,pinkBuffer(ctx));  s.connect(gain); s.start(); return {source:s,gain}; }
    case 'rain':  return { source: chain(loop(ctx,brownBuffer(ctx)), gain, bq(ctx,'highpass',500), bq(ctx,'peaking',1200,1,6), bq(ctx,'lowpass',4000)), gain };
    case 'storm': return { source: chain(loop(ctx,brownBuffer(ctx)), gain, bq(ctx,'highpass',200), bq(ctx,'peaking',700,.8,12), bq(ctx,'lowpass',7000)), gain };
    case 'ocean': {
      const ig=ctx.createGain(); ig.gain.value=0.5;
      lfo=ctx.createOscillator(); lfo.frequency.value=0.12;
      const ld=ctx.createGain(); ld.gain.value=0.45; lfo.connect(ld); ld.connect(ig.gain); lfo.start();
      const s=loop(ctx,brownBuffer(ctx)); s.connect(bq(ctx,'lowpass',700)); (s as unknown as AudioNode).connect(ig); ig.connect(gain); s.start();
      return {source:s,gain,lfo};
    }
    case 'fire':  return { source: chain(loop(ctx,brownBuffer(ctx)), gain, bq(ctx,'highpass',80), bq(ctx,'peaking',300,1,8), bq(ctx,'lowpass',2000)), gain };
    case 'cafe':  return { source: chain(loop(ctx,pinkBuffer(ctx)),  gain, bq(ctx,'bandpass',900,.5), bq(ctx,'lowpass',2800)), gain };
    case 'wind': {
      const ig=ctx.createGain(); ig.gain.value=0.55;
      lfo=ctx.createOscillator(); lfo.frequency.value=0.07;
      const ld=ctx.createGain(); ld.gain.value=0.4; lfo.connect(ld); ld.connect(ig.gain); lfo.start();
      const s=loop(ctx,whiteBuffer(ctx)); const lp1=bq(ctx,'lowpass',800); const lp2=bq(ctx,'lowpass',600);
      s.connect(lp1); lp1.connect(lp2); lp2.connect(ig); ig.connect(gain); s.start();
      return {source:s,gain,lfo};
    }
  }
}

// ─── Context Definition ───────────────────────────────────────────────────────────
interface MusicPlayerState {
  playing: Set<SoundId>;
  volumes: Record<SoundId, number>;
  masterVol: number;
  toggleSound: (id: SoundId) => void;
  setVolume: (id: SoundId, vol: number) => void;
  stopAll: () => void;
  handleMasterVolChange: (val: number) => void;
}

const MusicPlayerContext = createContext<MusicPlayerState | null>(null);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playing, setPlaying] = useState<Set<SoundId>>(new Set());
  const [volumes, setVolumes] = useState<Record<SoundId, number>>(
    Object.fromEntries(SOUNDS.map(s => [s.id, 0.5])) as Record<SoundId, number>
  );
  const [masterVol, setMasterVol] = useState(0.75);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const activeSounds = useRef<Map<SoundId, ActiveSound>>(new Map());

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = masterVol;
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [masterVol]);

  const toggleSound = useCallback((id: SoundId) => {
    setPlaying(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        const s = activeSounds.current.get(id);
        if (s) { try { s.source.stop(); s.lfo?.stop(); } catch {} activeSounds.current.delete(id); }
        next.delete(id);
      } else {
        const ctx = getCtx();
        const a = spawnSound(ctx, id, masterRef.current!);
        a.gain.gain.value = volumes[id];
        activeSounds.current.set(id, a);
        next.add(id);
      }
      return next;
    });
  }, [volumes]);

  const setVolume = useCallback((id: SoundId, vol: number) => {
    setVolumes(prev => ({ ...prev, [id]: vol }));
    const s = activeSounds.current.get(id);
    if (s) s.gain.gain.value = vol;
  }, []);

  const stopAll = useCallback(() => {
    activeSounds.current.forEach(s => { try { s.source.stop(); s.lfo?.stop(); } catch {} });
    activeSounds.current.clear();
    setPlaying(new Set());
  }, []);

  const handleMasterVolChange = useCallback((val: number) => {
    setMasterVol(val);
    if (masterRef.current) masterRef.current.gain.value = val;
  }, []);

  const value = {
    playing,
    volumes,
    masterVol,
    toggleSound,
    setVolume,
    stopAll,
    handleMasterVolChange,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
};