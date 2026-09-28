import React, { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  CloudRain, Play, Pause, SpeakerHigh, SpeakerX,
  List, ArrowLeft, ArrowRight, Stop,
  Waveform, CloudLightning, Waves, Fire, Coffee, Wind
} from "@phosphor-icons/react";

export const PLAYER_HEIGHT = 80;

// ─── Ambient sound definitions (Pure Math) ───────────────────────────────────
type SoundId = 'white' | 'brown' | 'pink' | 'rain' | 'storm' | 'ocean' | 'fire' | 'cafe' | 'wind';

interface SoundDef { 
  id: SoundId; 
  label: string; 
  icon: React.ElementType; 
  desc: string;
  activeColor: string;
}

const SOUNDS: SoundDef[] = [
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

// ─── Navigation ──────────────────────────────────────────────────────────────
interface NavItem { id: string; label: string; icon: React.ComponentType<{ className?: string; weight?: "bold" | "fill" }>; }
const NAV_ITEMS: NavItem[] = [
  { id: "focus-env", label: "Focus Environments", icon: CloudRain },
];

export default function Music() {
  const [activePane, setActivePane] = useState<"focus-env">("focus-env");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Web Audio State ──
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const activeSounds = useRef<Map<SoundId, ActiveSound>>(new Map());
  const [playing, setPlaying] = useState<Set<SoundId>>(new Set());
  const [volumes, setVolumes] = useState<Record<SoundId, number>>(
    Object.fromEntries(SOUNDS.map(s => [s.id, 0.5])) as Record<SoundId, number>
  );
  const [masterVol, setMasterVol] = useState(0.75);

  const springConfig = { type: "spring", bounce: 0, duration: 0.4 };

  // Cleanup on unmount
  useEffect(() => () => {
    activeSounds.current.forEach(s => { try { s.source.stop(); s.lfo?.stop(); } catch {} });
    ctxRef.current?.close();
  }, []);

  // Web Audio Controls
  function getCtx() {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = masterVol;
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }

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

  const stopAll = () => {
    activeSounds.current.forEach(s => { try { s.source.stop(); s.lfo?.stop(); } catch {} });
    activeSounds.current.clear(); 
    setPlaying(new Set());
  };

  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    if (masterRef.current) masterRef.current.gain.value = val;
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] w-full overflow-hidden bg-white dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-100">
      
      {/* ── Sidebar ── */}
      <motion.aside
        initial={{ width: 240 }}
        animate={{ width: sidebarOpen ? 240 : 72 }}
        transition={springConfig}
        className="flex flex-col flex-shrink-0 border-r border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-900/40 backdrop-blur-xl select-none"
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-sm tracking-[-0.02em] text-zinc-900 dark:text-white truncate">
              {sidebarOpen ? "Focus Sounds" : "FS"}
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10"
          >
            <List size={18} weight="bold" />
          </motion.button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePane === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setActivePane(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]",
                )}
              >
                <Icon size={20} weight={isActive ? "fill" : "bold"} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate tracking-[-0.02em]">{item.label}</span>}
              </motion.button>
            );
          })}
        </nav>
      </motion.aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto w-full p-8 space-y-8">
          
          {/* Focus Environments (Math Synthesis Generator) */}
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.02em]">Focus Environments</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Mix mathematically generated, completely offline ambient sounds.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {SOUNDS.map(s => {
                const active = playing.has(s.id);
                return (
                  <div key={s.id}
                    className={cn(
                      'rounded-2xl border p-5 cursor-pointer select-none transition-all text-center flex flex-col items-center',
                      active 
                        ? 'border-primary/50 bg-primary/10 shadow-[0_0_20px_0px_hsl(var(--primary)/0.15)] dark:bg-primary/20 dark:border-primary/40'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/30 dark:hover:bg-zinc-800/50'
                    )}
                    onClick={() => toggleSound(s.id)}
                  >
                    <div className="mb-3 relative flex justify-center">
                      <s.icon 
                        size={32} 
                        weight={active ? "fill" : "duotone"} 
                        className={cn(
                          "transition-colors duration-300",
                          active ? s.activeColor : "text-zinc-400 dark:text-zinc-500"
                        )} 
                      />
                      {active && <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </div>
                    <div className="text-sm font-semibold tracking-[-0.02em] text-zinc-900 dark:text-white leading-tight">{s.label}</div>
                    
                    {/* Independent Volume Control */}
                    {active && (
                      <div className="mt-4 w-full px-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="range"
                          min="0" max="1" step="0.01"
                          value={volumes[s.id]}
                          onChange={e => setVolume(s.id, parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ── Sticky Bottom Player ── */}
      <footer className="fixed bottom-6 left-[51%] -translate-x-[50%] z-50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl px-4 py-2.5 rounded-full max-w-[90%] ring-1 ring-inset ring-white/30 dark:ring-zinc-900/20 hover:bg-white/80 dark:hover:bg-zinc-900/80 transition-colors shadow-2xl">
        <div className="flex items-center justify-between gap-6 w-full">
          
          {/* Metadata */}
          <div className="flex items-center gap-3 w-48">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex flex-shrink-0 items-center justify-center border border-zinc-200 dark:border-white/10 text-zinc-400">
              <CloudRain size={20} weight={playing.size > 0 ? "fill" : "regular"} className={playing.size > 0 ? "text-primary" : ""} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[-0.02em] text-zinc-900 dark:text-white truncate">
                {playing.size > 0 ? `${playing.size} Environment${playing.size > 1 ? 's' : ''}` : "Not Playing"}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tracking-[-0.02em] truncate">
                Local Synthesis
              </p>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.9 }} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-not-allowed">
              <ArrowLeft size={20} weight="bold" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={playing.size > 0 ? stopAll : undefined}
              className="w-12 h-12 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-md"
            >
              {playing.size > 0 ? (
                <Stop size={20} weight="fill" />
              ) : (
                <Play size={20} weight="fill" className="ml-0.5" />
              )}
            </motion.button>

            <motion.button whileTap={{ scale: 0.9 }} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-not-allowed">
              <ArrowRight size={20} weight="bold" />
            </motion.button>
          </div>

          {/* Utility & Master Volume */}
          <div className="flex items-center gap-3 w-48 justify-end">
            <SpeakerHigh size={18} weight="bold" className="text-zinc-500" />
            <input
              type="range"
              min="0" max="1" step="0.01"
              value={masterVol}
              onChange={(e) => handleMasterVolChange(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}