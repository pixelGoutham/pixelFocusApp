import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Volume2, VolumeX, Link2, Square, Music2, X, Download, Trash2,
  Play, Pause, ChevronRight, ListMusic, Plus, SkipBack, SkipForward,
  Loader2, AlertCircle, FolderOpen, Check,
} from 'lucide-react';
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

export const PLAYER_HEIGHT = 420;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrackMeta {
  id: string; filename: string; title: string; artist: string;
  thumbnail: string; duration: number; url: string; addedAt: string; size: number;
}
interface PlaylistData {
  id: string; name: string; trackIds: string[]; createdAt: string;
}
interface DownloadJob {
  id: string; url: string; status: 'pending'|'downloading'|'done'|'error';
  progress: number; title: string; error: string; trackId: string;
}

function fmtDur(s: number): string {
  if (!s) return '--:--';
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
function fmtSize(b: number): string {
  if (b > 1024*1024) return `${(b/1024/1024).toFixed(1)} MB`;
  return `${(b/1024).toFixed(0)} KB`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Music() {
  const { embedUrl, title, rawUrl, setYt, clearYt } = useMusicContext();

  // ── Ambient sound state ───────────────────────────────────────────────────
  const ctxRef       = useRef<AudioContext | null>(null);
  const masterRef    = useRef<GainNode | null>(null);
  const activeSounds = useRef<Map<SoundId, ActiveSound>>(new Map());
  const [playing, setPlaying]   = useState<Set<SoundId>>(new Set());
  const [volumes, setVolumes]   = useState<Record<SoundId, number>>(
    Object.fromEntries(SOUNDS.map(s => [s.id, 0.5])) as Record<SoundId, number>
  );
  const [masterVol, setMasterVol] = useState(0.75);
  const [ytInput, setYtInput]   = useState(rawUrl);
  useEffect(() => { setYtInput(rawUrl); }, [rawUrl]);
  useEffect(() => () => {
    activeSounds.current.forEach(s => { try { s.source.stop(); s.lfo?.stop(); } catch {} });
    ctxRef.current?.close();
  }, []);

  // ── Library state ─────────────────────────────────────────────────────────
  const [library, setLibrary]         = useState<TrackMeta[]>([]);
  const [playlists, setPlaylists]     = useState<PlaylistData[]>([]);
  const [activeJobs, setActiveJobs]   = useState<DownloadJob[]>([]);
  const [dlInput, setDlInput]         = useState('');
  const [dlLoading, setDlLoading]     = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TrackMeta | null>(null);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [queueIds, setQueueIds]       = useState<string[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistData | null>(null);
  const [newPlName, setNewPlName]     = useState('');
  const [showNewPl, setShowNewPl]     = useState(false);
  const [addToPlTrack, setAddToPlTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeTab, setActiveTab] = useState<'youtube'|'library'>('youtube');

  const fetchLibrary = useCallback(async () => {
    try {
      const [lib, pls] = await Promise.all([
        fetch('/api/music/library').then(r => r.json()) as Promise<TrackMeta[]>,
        fetch('/api/music/playlists').then(r => r.json()) as Promise<PlaylistData[]>,
      ]);
      setLibrary(lib);
      setPlaylists(pls);
    } catch {}
  }, []);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  // Poll active jobs
  useEffect(() => {
    if (activeJobs.length === 0) return;
    const pending = activeJobs.filter(j => j.status === 'downloading' || j.status === 'pending');
    if (pending.length === 0) return;
    pollRef.current = setInterval(async () => {
      const updated = await Promise.all(
        pending.map(j => fetch(`/api/music/jobs/${j.id}`).then(r => r.json()) as Promise<DownloadJob>)
      );
      setActiveJobs(prev => {
        const map = new Map(prev.map(j => [j.id, j]));
        for (const u of updated) map.set(u.id, u);
        return [...map.values()];
      });
      const anyDone = updated.some(j => j.status === 'done' || j.status === 'error');
      if (anyDone) { fetchLibrary(); }
      const allSettled = updated.every(j => j.status === 'done' || j.status === 'error');
      if (allSettled && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, 1500);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [activeJobs, fetchLibrary]);

  // ── Ambient sound fns ─────────────────────────────────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumes]);
  const setVolume = useCallback((id: SoundId, vol: number) => {
    setVolumes(prev => ({ ...prev, [id]: vol }));
    const s = activeSounds.current.get(id);
    if (s) s.gain.gain.value = vol;
  }, []);
  const stopAll = () => {
    activeSounds.current.forEach(s => { try { s.source.stop(); s.lfo?.stop(); } catch {} });
    activeSounds.current.clear(); setPlaying(new Set());
  };
  const loadYt = () => {
    const trimmed = ytInput.trim();
    if (!trimmed) return;
    if (embedUrl && trimmed === rawUrl) return;
    setYt(trimmed);
  };

  // ── Library fns ───────────────────────────────────────────────────────────
  const startDownload = async () => {
    const url = dlInput.trim();
    if (!url) return;
    setDlLoading(true);
    try {
      const res = await fetch('/api/music/download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error('Server error');
      const job: DownloadJob = { ...(await res.json()), status: 'downloading', progress: 0, title: '', error: '' };
      setActiveJobs(prev => [job, ...prev]);
      setDlInput('');
    } catch (e) {
      alert('Download failed: ' + String(e));
    } finally { setDlLoading(false); }
  };

  const playTrack = (track: TrackMeta, queue?: string[]) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    const audio = new Audio(`/api/music/stream/${track.id}`);
    audio.onplay    = () => setLocalPlaying(true);
    audio.onpause   = () => setLocalPlaying(false);
    audio.ontimeupdate = () => setLocalProgress(audio.currentTime);
    audio.onloadedmetadata = () => setLocalDuration(audio.duration || track.duration);
    audio.onended   = () => {
      const idx = (queue ?? queueIds).indexOf(track.id);
      if (idx !== -1 && idx < (queue ?? queueIds).length - 1) {
        const nextId = (queue ?? queueIds)[idx + 1];
        const next = library.find(t => t.id === nextId);
        if (next) playTrack(next, queue ?? queueIds);
      } else { setLocalPlaying(false); setLocalProgress(0); }
    };
    audio.play().catch(() => {});
    audioRef.current = audio;
    setCurrentTrack(track);
    if (queue) setQueueIds(queue);
  };

  const toggleLocalPlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };

  const skipTrack = (dir: 1 | -1) => {
    if (!currentTrack) return;
    const idx = queueIds.indexOf(currentTrack.id);
    if (idx === -1) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= queueIds.length) return;
    const next = library.find(t => t.id === queueIds[nextIdx]);
    if (next) playTrack(next);
  };

  const deleteTrack = async (id: string) => {
    if (!confirm('Delete this track?')) return;
    await fetch(`/api/music/track/${id}`, { method: 'DELETE' });
    if (currentTrack?.id === id) {
      audioRef.current?.pause();
      setCurrentTrack(null); setLocalPlaying(false);
    }
    fetchLibrary();
  };

  const createPlaylist = async () => {
    if (!newPlName.trim()) return;
    await fetch('/api/music/playlists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPlName.trim(), trackIds: [] }),
    });
    setNewPlName(''); setShowNewPl(false); fetchLibrary();
  };

  const addToPlaylist = async (plId: string, trackId: string) => {
    const pl = playlists.find(p => p.id === plId);
    if (!pl) return;
    if (pl.trackIds.includes(trackId)) { setAddToPlTrack(null); return; }
    await fetch(`/api/music/playlists/${plId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackIds: [...pl.trackIds, trackId] }),
    });
    setAddToPlTrack(null); fetchLibrary();
  };

  const removeFromPlaylist = async (plId: string, trackId: string) => {
    const pl = playlists.find(p => p.id === plId);
    if (!pl) return;
    await fetch(`/api/music/playlists/${plId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackIds: pl.trackIds.filter(id => id !== trackId) }),
    });
    fetchLibrary();
  };

  const deletePlaylist = async (id: string) => {
    await fetch(`/api/music/playlists/${id}`, { method: 'DELETE' });
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
    fetchLibrary();
  };

  const playPlaylist = (pl: PlaylistData) => {
    const tracks = pl.trackIds.map(id => library.find(t => t.id === id)).filter(Boolean) as TrackMeta[];
    if (tracks.length === 0) return;
    playTrack(tracks[0], pl.trackIds);
  };

  const displayTracks = selectedPlaylist
    ? (selectedPlaylist.trackIds.map(id => library.find(t => t.id === id)).filter(Boolean) as TrackMeta[])
    : library;

  return (
    <div className="flex flex-col min-h-full" style={{ background: '#000' }}>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-white/10">
        {(['youtube', 'library'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-md transition-colors capitalize',
              activeTab === tab
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab === 'youtube' ? 'YouTube' : `Library${library.length > 0 ? ` (${library.length})` : ''}`}
          </button>
        ))}
      </div>

      {activeTab === 'youtube' ? (
        <>
          {/* ── URL Input bar ── */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10" style={{ background: '#000', zIndex: 20, position: 'relative' }}>
            <Link2 className="h-4 w-4 text-zinc-500 flex-shrink-0" />
            <Input
              className="flex-1 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-9"
              style={{ background: '#111' }}
              placeholder="Paste YouTube or YouTube Music URL…"
              value={ytInput}
              onChange={e => setYtInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadYt()}
            />
            <Button onClick={loadYt} disabled={!ytInput.trim()} className="h-9 px-4 shrink-0">Load</Button>
            {embedUrl && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-white shrink-0"
                onClick={() => { clearYt(); setYtInput(''); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* ── YouTube player placeholder ── */}
          <div style={{ height: PLAYER_HEIGHT, background: '#000', flexShrink: 0, position: 'relative' }}>
            {!embedUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-600">
                <Music2 className="h-12 w-12" />
                <p className="text-sm">Paste a YouTube URL above to start playing</p>
                <p className="text-xs text-zinc-700">Works with YouTube Music playlists</p>
              </div>
            )}
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
                    onValueChange={([v]) => { setMasterVol(v); if (masterRef.current) masterRef.current.gain.value = v; }} />
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
                      active ? 'border-primary/60 bg-primary/10 shadow-[0_0_12px_1px_hsl(var(--primary)/0.3)]'
                             : 'border-white/8 bg-white/4 hover:border-white/20 hover:bg-white/6'
                    )}
                    onClick={() => toggleSound(s.id)}
                  >
                    {active && <div className="flex justify-end mb-1"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /></div>}
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
        </>
      ) : (
        /* ──────────────────── LOCAL LIBRARY TAB ──────────────────── */
        <div className="flex-1 flex flex-col" style={{ background: '#000' }}>

          {/* ── Local player bar (sticky) ── */}
          {currentTrack && (
            <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-white/10"
                 style={{ background: '#0a0a0a' }}>
              <img src={currentTrack.thumbnail} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                className="h-10 w-10 rounded object-cover flex-shrink-0" style={{ border: '1px solid #222' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentTrack.title}</p>
                <p className="text-xs text-zinc-600 truncate">{currentTrack.artist || 'Unknown artist'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => skipTrack(-1)} disabled={!queueIds.length}
                  className="h-7 w-7 flex items-center justify-center text-zinc-500 hover:text-white disabled:opacity-30 transition-colors">
                  <SkipBack className="h-4 w-4" />
                </button>
                <button onClick={toggleLocalPlay}
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-black">
                  {localPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <button onClick={() => skipTrack(1)} disabled={!queueIds.length}
                  className="h-7 w-7 flex items-center justify-center text-zinc-500 hover:text-white disabled:opacity-30 transition-colors">
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 min-w-0 max-w-[160px]">
                <span className="text-xs text-zinc-600 tabular-nums flex-shrink-0">{fmtDur(localProgress)}</span>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: localDuration ? `${(localProgress/localDuration)*100}%` : '0%' }} />
                </div>
                <span className="text-xs text-zinc-600 tabular-nums flex-shrink-0">{fmtDur(localDuration || currentTrack.duration)}</span>
              </div>
            </div>
          )}

          {/* ── Download section ── */}
          <div className="px-4 pt-4 pb-3 border-b border-white/10">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Download from YouTube</p>
            <div className="flex gap-2">
              <Input
                className="flex-1 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-9 text-sm"
                style={{ background: '#111' }}
                placeholder="Paste YouTube URL…"
                value={dlInput}
                onChange={e => setDlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startDownload()}
              />
              <Button onClick={startDownload} disabled={dlLoading || !dlInput.trim()} className="h-9 gap-1.5 shrink-0">
                {dlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download MP3
              </Button>
            </div>

            {/* Active jobs */}
            {activeJobs.length > 0 && (
              <div className="mt-3 space-y-2">
                {activeJobs.map(job => (
                  <div key={job.id} className="flex items-center gap-3 rounded-lg px-3 py-2"
                       style={{ background: '#111', border: '1px solid #222' }}>
                    {job.status === 'downloading' && <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}
                    {job.status === 'done'        && <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                    {job.status === 'error'       && <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{job.title || job.url}</p>
                      {job.status === 'downloading' && (
                        <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${job.progress}%` }} />
                        </div>
                      )}
                      {job.status === 'error' && <p className="text-xs text-red-400 truncate mt-0.5">{job.error.split('\n').pop()}</p>}
                    </div>
                    <span className="text-xs text-zinc-600 flex-shrink-0 tabular-nums">
                      {job.status === 'downloading' ? `${job.progress.toFixed(0)}%` : job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Playlists ── */}
          <div className="px-4 pt-3 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Playlists</p>
              <button onClick={() => setShowNewPl(v => !v)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </div>
            {showNewPl && (
              <div className="flex gap-2 mb-2">
                <Input
                  className="flex-1 h-8 text-xs bg-zinc-900 border-zinc-800 text-white"
                  style={{ background: '#111' }}
                  placeholder="Playlist name…"
                  value={newPlName}
                  onChange={e => setNewPlName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createPlaylist(); if (e.key === 'Escape') { setShowNewPl(false); setNewPlName(''); } }}
                  autoFocus
                />
                <Button size="sm" onClick={createPlaylist} disabled={!newPlName.trim()} className="h-8 px-3">Create</Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  !selectedPlaylist ? 'bg-primary/20 text-primary border border-primary/40' : 'border border-white/10 text-zinc-500 hover:text-white'
                )}
              >
                <FolderOpen className="h-3 w-3" /> All tracks ({library.length})
              </button>
              {playlists.map(pl => (
                <div key={pl.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedPlaylist(prev => prev?.id === pl.id ? null : pl)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      selectedPlaylist?.id === pl.id ? 'bg-primary/20 text-primary border border-primary/40' : 'border border-white/10 text-zinc-500 hover:text-white'
                    )}
                  >
                    <ListMusic className="h-3 w-3" /> {pl.name} ({pl.trackIds.length})
                  </button>
                  {selectedPlaylist?.id === pl.id && (
                    <>
                      <button onClick={() => playPlaylist(pl)}
                        className="h-6 w-6 flex items-center justify-center text-zinc-500 hover:text-primary transition-colors">
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deletePlaylist(pl.id)}
                        className="h-6 w-6 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Track list ── */}
          <div className="flex-1 overflow-y-auto">
            {displayTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-700">
                <Music2 className="h-10 w-10" />
                <p className="text-sm">{selectedPlaylist ? 'No tracks in this playlist yet' : 'No downloads yet — paste a YouTube URL above'}</p>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-1">
                {displayTracks.map((track, idx) => {
                  const isActive = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors',
                        isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                      )}
                      onClick={() => playTrack(track, displayTracks.map(t => t.id))}
                    >
                      {/* Thumbnail / index */}
                      <div className="relative h-10 w-10 flex-shrink-0">
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            className="h-10 w-10 rounded object-cover" style={{ border: '1px solid #222' }} />
                        ) : (
                          <div className="h-10 w-10 rounded flex items-center justify-center text-xs text-zinc-600" style={{ background: '#111', border: '1px solid #222' }}>
                            {idx + 1}
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center rounded" style={{ background: 'rgba(0,0,0,.5)' }}>
                            {localPlaying
                              ? <div className="flex gap-0.5 items-end h-3">{[1,2,3].map(i => <div key={i} className="w-0.5 bg-primary animate-pulse rounded-full" style={{ height: `${40+i*20}%`, animationDelay: `${i*0.1}s` }} />)}</div>
                              : <Pause className="h-3 w-3 text-primary" />
                            }
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', isActive ? 'text-primary' : 'text-white')}>{track.title}</p>
                        <p className="text-xs text-zinc-600 truncate">{track.artist || 'Unknown artist'} · {fmtDur(track.duration)} · {fmtSize(track.size)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {selectedPlaylist ? (
                          <button
                            title="Remove from playlist"
                            onClick={() => removeFromPlaylist(selectedPlaylist.id, track.id)}
                            className="h-7 w-7 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors rounded">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <div className="relative">
                            <button
                              title="Add to playlist"
                              onClick={() => setAddToPlTrack(prev => prev === track.id ? null : track.id)}
                              className="h-7 w-7 flex items-center justify-center text-zinc-600 hover:text-primary transition-colors rounded">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            {addToPlTrack === track.id && playlists.length > 0 && (
                              <div className="absolute right-0 bottom-8 z-50 rounded-lg overflow-hidden"
                                   style={{ background: '#111', border: '1px solid #333', minWidth: 160 }}>
                                {playlists.map(pl => (
                                  <button key={pl.id}
                                    onClick={() => addToPlaylist(pl.id, track.id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 text-left">
                                    {pl.trackIds.includes(track.id) && <Check className="h-3 w-3 text-emerald-400" />}
                                    {!pl.trackIds.includes(track.id) && <div className="h-3 w-3" />}
                                    {pl.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          title="Delete track"
                          onClick={() => deleteTrack(track.id)}
                          className="h-7 w-7 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors rounded">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <ChevronRight className={cn('h-3.5 w-3.5 flex-shrink-0 transition-colors', isActive ? 'text-primary' : 'text-zinc-700')} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
