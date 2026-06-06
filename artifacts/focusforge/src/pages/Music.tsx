import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, Link2, Square, Music2, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMusicContext, parseYtEmbed } from '@/lib/MusicContext';

// ─── Ambient sound definitions ────────────────────────────────────────────────
type SoundId = 'white' | 'brown' | 'pink' | 'rain' | 'storm' | 'ocean' | 'fire' | 'cafe' | 'wind';

interface SoundDef { id: SoundId; label: string; emoji: string; desc: string }

const SOUNDS: SoundDef[] = [
  { id: 'white', label: 'White Noise',  emoji: '🌫️', desc: 'Full-spectrum static' },
  { id: 'brown', label: 'Brown Noise',  emoji: '🟤', desc: 'Deep rumbling calm' },
  { id: 'pink',  label: 'Pink Noise',   emoji: '🌸', desc: 'Balanced natural hiss' },
  { id: 'rain',  label: 'Rain',         emoji: '🌧️', desc: 'Gentle steady rainfall' },
  { id: 'storm', label: 'Thunderstorm', emoji: '⛈️', desc: 'Heavy downpour' },
  { id: 'ocean', label: 'Ocean Waves',  emoji: '🌊', desc: 'Slow rolling waves' },
  { id: 'fire',  label: 'Fireplace',    emoji: '🔥', desc: 'Warm crackling fire' },
  { id: 'cafe',  label: 'Café',         emoji: '☕', desc: 'Coffee-shop chatter' },
  { id: 'wind',  label: 'Wind',         emoji: '💨', desc: 'Gentle outdoor breeze' },
];

// ─── Audio generators ─────────────────────────────────────────────────────────
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

// ─── Height constants (kept in sync with Layout.tsx) ─────────────────────────
// Header: 56px · URL bar: 64px → player starts at 120px from viewport top
export const PLAYER_HEIGHT = 420;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Music() {
  const { embedUrl, title, rawUrl, setYt, clearYt } = useMusicContext();

  const ctxRef       = useRef<AudioContext | null>(null);
  const masterRef    = useRef<GainNode | null>(null);
  const activeSounds = useRef<Map<SoundId, ActiveSound>>(new Map());

  const [playing, setPlaying]   = useState<Set<SoundId>>(new Set());
  const [volumes, setVolumes]   = useState<Record<SoundId, number>>(
    Object.fromEntries(SOUNDS.map(s => [s.id, 0.5])) as Record<SoundId, number>
  );
  const [masterVol, setMasterVol] = useState(0.75);
  const [ytInput, setYtInput]   = useState(rawUrl);

  // Sync input field if context rawUrl changes externally
  useEffect(() => { setYtInput(rawUrl); }, [rawUrl]);

  useEffect(() => () => {
    activeSounds.current.forEach(s => { try { s.source.stop(); s.lfo?.stop(); } catch {} });
    ctxRef.current?.close();
  }, []);

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

  const loadYt = () => {
    const trimmed = ytInput.trim();
    if (!trimmed) return;
    if (embedUrl && trimmed === rawUrl) return;
    setYt(trimmed);
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: '#000' }}>

      {/* ── URL Input bar ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10"
           style={{ background: '#000', zIndex: 20, position: 'relative' }}>
        <Link2 className="h-4 w-4 text-zinc-500 flex-shrink-0" />
        <Input
          className="flex-1 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9"
          style={{ background: '#111' }}
          placeholder="Paste YouTube or YouTube Music URL (video or playlist)…"
          value={ytInput}
          onChange={e => setYtInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadYt()}
        />
        <Button
          onClick={loadYt}
          disabled={!ytInput.trim()}
          className="h-9 px-4 shrink-0"
        >
          Load
        </Button>
        {embedUrl && (
          <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-white shrink-0"
            onClick={() => { clearYt(); setYtInput(''); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ── Player placeholder (filled by fixed iframe from Layout) ── */}
      <div style={{ height: PLAYER_HEIGHT, background: '#000', flexShrink: 0, position: 'relative' }}>
        {!embedUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-600">
            <Music2 className="h-12 w-12" />
            <p className="text-sm">Paste a YouTube URL above to start playing</p>
            <p className="text-xs text-zinc-700">Works with YouTube Music playlists — paste the URL from your browser</p>
          </div>
        )}
        {/* Title overlay at bottom of player area */}
        {embedUrl && title && (
          <div className="absolute bottom-0 left-0 right-0 px-4 py-2"
               style={{ background: 'linear-gradient(to top, #000 70%, transparent)' }}>
            <p className="text-sm font-medium text-white/80 truncate">{title}</p>
          </div>
        )}
      </div>

      {/* ── Ambient Sounds ── */}
      <div className="flex-1 border-t border-white/10" style={{ background: '#000' }}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Ambient Sounds</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Generated offline · mix freely</p>
          </div>
          <div className="flex items-center gap-3">
            {playing.size > 0 && (
              <Button variant="ghost" size="sm" onClick={stopAll}
                className="text-zinc-500 hover:text-white h-7 px-2 gap-1 text-xs">
                <Square className="h-3 w-3 fill-current" /> Stop all
              </Button>
            )}
            <div className="flex items-center gap-2">
              <VolumeX className="h-3.5 w-3.5 text-zinc-600" />
              <Slider value={[masterVol]} min={0} max={1} step={0.01} className="w-24"
                onValueChange={([v]) => {
                  setMasterVol(v);
                  if (masterRef.current) masterRef.current.gain.value = v;
                }} />
              <Volume2 className="h-3.5 w-3.5 text-zinc-600" />
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {SOUNDS.map(s => {
            const active = playing.has(s.id);
            return (
              <div key={s.id}
                className={cn(
                  'rounded-xl border p-3 cursor-pointer select-none transition-all text-center',
                  active
                    ? 'border-primary/60 bg-primary/10 shadow-[0_0_12px_1px_hsl(var(--primary)/0.3)]'
                    : 'border-white/8 bg-white/4 hover:border-white/20 hover:bg-white/6'
                )}
                onClick={() => toggleSound(s.id)}
              >
                {active && (
                  <div className="flex justify-end mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-xs font-medium text-white leading-tight">{s.label}</div>

                {active && (
                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                    <Slider value={[volumes[s.id]]} min={0} max={1} step={0.01}
                      onValueChange={([v]) => setVolume(s.id, v)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
