import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, ExternalLink, Link2, Square } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ─── Sound definitions ──────────────────────────────────────────────────────

type SoundId = 'white' | 'brown' | 'pink' | 'rain' | 'storm' | 'ocean' | 'fire' | 'cafe' | 'wind';

interface SoundDef {
  id: SoundId;
  label: string;
  emoji: string;
  desc: string;
  bg: string;
}

const SOUNDS: SoundDef[] = [
  { id: 'white', label: 'White Noise',  emoji: '🌫️', desc: 'Full-spectrum static',     bg: 'from-slate-600/30 to-slate-800/30' },
  { id: 'brown', label: 'Brown Noise',  emoji: '🟤', desc: 'Deep rumbling calm',        bg: 'from-amber-800/30 to-stone-900/30' },
  { id: 'pink',  label: 'Pink Noise',   emoji: '🌸', desc: 'Balanced natural hiss',     bg: 'from-pink-700/30 to-rose-900/30' },
  { id: 'rain',  label: 'Rain',         emoji: '🌧️', desc: 'Gentle steady rainfall',    bg: 'from-blue-700/30 to-sky-900/30' },
  { id: 'storm', label: 'Thunderstorm', emoji: '⛈️', desc: 'Heavy downpour & rumble',   bg: 'from-indigo-800/30 to-slate-900/30' },
  { id: 'ocean', label: 'Ocean Waves',  emoji: '🌊', desc: 'Slow rolling waves',        bg: 'from-cyan-700/30 to-blue-900/30' },
  { id: 'fire',  label: 'Fireplace',    emoji: '🔥', desc: 'Warm crackling flames',     bg: 'from-orange-700/30 to-red-900/30' },
  { id: 'cafe',  label: 'Café',         emoji: '☕', desc: 'Coffee-shop chatter',       bg: 'from-yellow-800/30 to-amber-900/30' },
  { id: 'wind',  label: 'Wind',         emoji: '💨', desc: 'Gentle outdoor breeze',     bg: 'from-emerald-700/30 to-teal-900/30' },
];

// ─── Web Audio generators ───────────────────────────────────────────────────

function whiteBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function brownBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = (last + 0.02 * w) / 1.02;
    last = d[i];
    d[i] *= 3.5;
  }
  return buf;
}

function pinkBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
    b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
    b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
    d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)/7;
    b6 = w*0.115926;
  }
  return buf;
}

interface ActiveSound { source: AudioBufferSourceNode; gain: GainNode; lfo?: OscillatorNode }

function spawnSound(ctx: AudioContext, id: SoundId, destGain: GainNode): ActiveSound {
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(destGain);

  function loopBuf(buf: AudioBuffer): AudioBufferSourceNode {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  }

  function filtered(src: AudioBufferSourceNode, ...filters: BiquadFilterNode[]) {
    let node: AudioNode = src;
    for (const f of filters) { node.connect(f); node = f; }
    node.connect(gain);
    src.start();
    return src;
  }

  function bq(type: BiquadFilterType, freq: number, q=1, g=0): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q; f.gain.value = g;
    return f;
  }

  let lfo: OscillatorNode | undefined;

  switch (id) {
    case 'white': { const s=loopBuf(whiteBuffer(ctx)); s.connect(gain); s.start(); return { source:s, gain }; }
    case 'brown': { const s=loopBuf(brownBuffer(ctx)); s.connect(gain); s.start(); return { source:s, gain }; }
    case 'pink':  { const s=loopBuf(pinkBuffer(ctx));  s.connect(gain); s.start(); return { source:s, gain }; }

    case 'rain': {
      const s = loopBuf(brownBuffer(ctx));
      return { source: filtered(s, bq('highpass',500), bq('peaking',1200,1,6), bq('lowpass',4000)), gain };
    }
    case 'storm': {
      const s = loopBuf(brownBuffer(ctx));
      return { source: filtered(s, bq('highpass',200), bq('peaking',700,0.8,12), bq('lowpass',7000)), gain };
    }
    case 'ocean': {
      const intGain = ctx.createGain(); intGain.gain.value = 0.5;
      lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
      const ld = ctx.createGain(); ld.gain.value = 0.45;
      lfo.connect(ld); ld.connect(intGain.gain); lfo.start();
      const s = loopBuf(brownBuffer(ctx));
      const lp = bq('lowpass', 700);
      s.connect(lp); lp.connect(intGain); intGain.connect(gain); s.start();
      return { source: s, gain, lfo };
    }
    case 'fire': {
      const s = loopBuf(brownBuffer(ctx));
      return { source: filtered(s, bq('highpass',80), bq('peaking',300,1,8), bq('lowpass',2000)), gain };
    }
    case 'cafe': {
      const s = loopBuf(pinkBuffer(ctx));
      return { source: filtered(s, bq('bandpass',900,0.5), bq('lowpass',2800)), gain };
    }
    case 'wind': {
      const intGain = ctx.createGain(); intGain.gain.value = 0.55;
      lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const ld = ctx.createGain(); ld.gain.value = 0.4;
      lfo.connect(ld); ld.connect(intGain.gain); lfo.start();
      const s = loopBuf(whiteBuffer(ctx));
      const lp1 = bq('lowpass',800); const lp2 = bq('lowpass',600);
      s.connect(lp1); lp1.connect(lp2); lp2.connect(intGain); intGain.connect(gain); s.start();
      return { source: s, gain, lfo };
    }
  }
}

// ─── YouTube URL parser ─────────────────────────────────────────────────────

function parseYtEmbed(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const list = u.searchParams.get('list');
    const v    = u.searchParams.get('v');
    const shortId = u.hostname === 'youtu.be' ? u.pathname.slice(1) : null;
    const base = 'https://www.youtube-nocookie.com/embed/';
    if (list)    return `${base}videoseries?list=${list}&autoplay=1&rel=0`;
    if (shortId) return `${base}${shortId}?autoplay=1&rel=0`;
    if (v)       return `${base}${v}?autoplay=1&rel=0`;
    return null;
  } catch { return null; }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Music() {
  const ctxRef         = useRef<AudioContext | null>(null);
  const masterRef      = useRef<GainNode | null>(null);
  const activeSounds   = useRef<Map<SoundId, ActiveSound>>(new Map());

  const [playing, setPlaying]   = useState<Set<SoundId>>(new Set());
  const [volumes, setVolumes]   = useState<Record<SoundId, number>>(
    Object.fromEntries(SOUNDS.map(s => [s.id, 0.5])) as Record<SoundId, number>
  );
  const [masterVol, setMasterVol] = useState(0.8);
  const [ytUrl, setYtUrl]       = useState('');
  const [ytEmbed, setYtEmbed]   = useState<string | null>(null);
  const [ytInput, setYtInput]   = useState('');

  // Cleanup on unmount
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
        // Stop
        const s = activeSounds.current.get(id);
        if (s) { try { s.source.stop(); s.lfo?.stop(); } catch {} activeSounds.current.delete(id); }
        next.delete(id);
      } else {
        // Start
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

  const updateMaster = (v: number) => {
    setMasterVol(v);
    if (masterRef.current) masterRef.current.gain.value = v;
  };

  const loadYt = () => {
    const embed = parseYtEmbed(ytInput);
    if (embed) { setYtEmbed(embed); setYtUrl(ytInput); }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Music & Ambience</h1>
          <p className="text-sm text-muted-foreground mt-1">Mix multiple sounds · all generated offline</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Volume2 className="h-4 w-4" />
            <span className="w-8">Master</span>
          </div>
          <div className="w-32">
            <Slider value={[masterVol]} min={0} max={1} step={0.01}
              onValueChange={([v]) => updateMaster(v)} />
          </div>
          {playing.size > 0 && (
            <Button variant="outline" size="sm" onClick={stopAll} className="gap-2">
              <Square className="h-3 w-3 fill-current" /> Stop all
            </Button>
          )}
        </div>
      </div>

      {/* Ambient sounds grid */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ambient Sounds</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
          {SOUNDS.map(s => {
            const active = playing.has(s.id);
            return (
              <div key={s.id}
                className={cn(
                  'relative rounded-xl border p-4 cursor-pointer transition-all select-none',
                  'bg-gradient-to-br',
                  s.bg,
                  active
                    ? 'border-primary shadow-[0_0_16px_2px_hsl(var(--primary)/0.35)] scale-[1.02]'
                    : 'border-border hover:border-primary/40 hover:scale-[1.01]'
                )}
                onClick={() => toggleSound(s.id)}
              >
                {active && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
                <div className="text-3xl mb-2">{s.emoji}</div>
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>

                {active && (
                  <div className="mt-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <VolumeX className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <Slider
                        value={[volumes[s.id]]} min={0} max={1} step={0.01}
                        onValueChange={([v]) => setVolume(s.id, v)}
                        className="flex-1"
                      />
                      <Volume2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* YouTube section */}
      <section className="border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">▶️</span>
              <h2 className="font-semibold">YouTube Music Player</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Paste any YouTube video or playlist URL · works with YT Premium</p>
          </div>
          <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ExternalLink className="h-3 w-3" /> Open YT Music
            </Button>
          </a>
        </div>

        <div className="px-5 py-4 bg-card/50 flex gap-2">
          <div className="flex-1 relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="https://www.youtube.com/watch?v=... or playlist URL"
              value={ytInput}
              onChange={e => setYtInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadYt()}
            />
          </div>
          <Button onClick={loadYt} disabled={!ytInput.trim()}>Play</Button>
          {ytEmbed && <Button variant="outline" onClick={() => { setYtEmbed(null); setYtUrl(''); setYtInput(''); }}>Clear</Button>}
        </div>

        {ytEmbed ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              src={ytEmbed}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube player"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <span className="text-5xl">🎵</span>
            <p className="text-sm">Paste a YouTube URL above to start playing</p>
            <p className="text-xs opacity-60">Tip: Use playlists for continuous music</p>
          </div>
        )}
      </section>

      {/* Tips */}
      <section className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="font-semibold text-foreground mb-1">🎧 Focus tip</div>
          Brown or pink noise masks distractions better than music for deep work.
        </div>
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="font-semibold text-foreground mb-1">🌊 Layering</div>
          Try Rain + Café together for a cosy coffee-shop-in-the-rain feel.
        </div>
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="font-semibold text-foreground mb-1">📻 YT Premium</div>
          Paste a YouTube Music playlist URL to get ad-free background audio.
        </div>
      </section>
    </div>
  );
}
