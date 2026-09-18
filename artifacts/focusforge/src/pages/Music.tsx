import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import YouTubePlayer from '@/lib/YouTubePlayer';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { 
  MusicNotes, 
  CloudRain, 
  FolderSimple, 
  Play, 
  Pause, 
  SpeakerHigh, 
  SpeakerX, 
  Link, 
  ArrowsClockwise,
  List,
  X
} from '@phosphor-icons/react';

export const PLAYER_HEIGHT = 80;

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; weight?: 'bold' | 'fill' }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'listen-now', label: 'Listen Now', icon: MusicNotes },
  { id: 'focus-env', label: 'Focus Environments', icon: CloudRain },
  { id: 'library', label: 'Local Library', icon: FolderSimple }
];

export default function Music() {
  const { state, actions } = useMusicPlayer();
  const [activePane, setActivePane] = useState<'listen-now' | 'focus-env' | 'library'>('listen-now');
  const [urlInput, setUrlInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Spring animation config
  const springConfig = { type: 'spring', bounce: 0, duration: 0.4 };

  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    // Simple videoId extraction
    const match = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = match ? match[1] : trimmed.length === 11 ? trimmed : null;

    if (videoId) {
      actions.playTrack({
        id: videoId,
        title: `YouTube Stream (${videoId})`,
        videoId: videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: 180 // Default fallback until loaded
      });
      setUrlInput('');
    } else {
      alert('Please enter a valid YouTube URL or Video ID.');
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remain = Math.floor(secs % 60);
    return `${mins}:${remain.toString().padStart(2, '0')}`;
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
              {sidebarOpen ? "Apple Music" : "AM"}
            </span>
          </div>
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
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
                onClick={() => setActivePane(item.id as any)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left',
                  isActive 
                    ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]'
                )}
              >
                <Icon size={20} weight={isActive ? 'fill' : 'bold'} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate tracking-[-0.02em]">{item.label}</span>}
              </motion.button>
            );
          })}
        </nav>
      </motion.aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto w-full p-8 space-y-8">
          
          {activePane === 'listen-now' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-[-0.02em]">Listen Now</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 tracking-[-0.02em]">Stream distraction-free audio via YouTube headless engine.</p>
              </div>

              {/* URL Input Form */}
              <form onSubmit={handleLoadUrl} className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Link size={16} weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="text" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste YouTube URL (e.g., https://youtu.be/...)"
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none',
                      'bg-zinc-100 border border-zinc-200 text-zinc-900 focus:bg-white focus:border-zinc-400 shadow-sm',
                      'dark:bg-white/[0.03] dark:border-white/[0.1] dark:text-white dark:focus:bg-white/[0.08] dark:focus:border-white/[0.3]'
                    )}
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl shadow-sm hover:opacity-95 transition-opacity"
                >
                  Play
                </motion.button>
              </form>

              {/* Active Track Display / Artwork Frame */}
              <div className="flex flex-col items-center justify-center pt-8">
                <div className="w-64 h-64 sm:w-80 sm:h-80 aspect-square rounded-2xl shadow-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 relative group">
                  {state.currentTrack ? (
                    <img 
                      src={state.currentTrack.thumbnailUrl} 
                      alt={state.currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 gap-2">
                      <MusicNotes size={48} weight="bold" />
                      <span className="text-xs tracking-[-0.02em]">No media loaded</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center space-y-1 max-w-md">
                  <h2 className="text-lg font-semibold tracking-[-0.02em] truncate">
                    {state.currentTrack?.title || "Ready to Stream"}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 tracking-[-0.02em]">
                    {state.currentTrack ? "Headless YouTube Engine" : "Paste a URL above to initialize audio"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activePane === 'focus-env' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold tracking-[-0.02em]">Focus Environments</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Ambient sound generator settings will appear here.</p>
            </div>
          )}

          {activePane === 'library' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold tracking-[-0.02em]">Local Library</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Saved offline tracks and downloads will appear here.</p>
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky Bottom Player (Apple Translucent Chrome) ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Track Preview Info */}
          <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 border border-zinc-200 dark:border-white/10">
              {state.currentTrack?.thumbnailUrl ? (
                <img src={state.currentTrack.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400"><MusicNotes size={20} /></div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[-0.02em] text-zinc-900 dark:text-white truncate">
                {state.currentTrack?.title || "Not Playing"}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tracking-[-0.02em] truncate">
                {state.currentTrack ? "YouTube Audio Engine" : "Ready"}
              </p>
            </div>
          </div>

          {/* Central Controls & Timeline */}
          <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-md">
            <div className="flex items-center gap-6">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={actions.togglePlay}
                disabled={!state.currentTrack}
                className="w-10 h-10 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-md disabled:opacity-30 transition-transform"
              >
                {state.isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
              </motion.button>
            </div>

            {/* Timeline Bar */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] tabular-nums text-zinc-400 tracking-[-0.02em]">
                {formatTime(state.progress)}
              </span>
              <div 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  actions.seekTo(pos * state.duration);
                }}
                className="flex-1 h-1.5 bg-zinc-200 dark:bg-white/20 rounded-full cursor-pointer relative overflow-hidden group"
              >
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-primary transition-all rounded-full"
                  style={{ width: `${state.duration ? (state.progress / state.duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-zinc-400 tracking-[-0.02em]">
                {formatTime(state.duration)}
              </span>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center justify-end gap-3 w-1/4 min-w-[160px]">
            <button 
              onClick={() => actions.setVolume(state.volume > 0 ? 0 : 0.75)}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
            >
              {state.volume > 0 ? <SpeakerHigh size={18} weight="bold" /> : <SpeakerX size={18} weight="bold" />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01"
              value={state.volume}
              onChange={(e) => actions.setVolume(parseFloat(e.target.value))}
              className="w-24 accent-primary cursor-pointer"
            />
          </div>

        </div>
      </footer>

      {/* Headless Player Instance */}
      {state.currentTrack && (
        <div className="hidden">
          <YouTubePlayer 
            videoId={state.currentTrack.videoId}
            autoplay={state.isPlaying}
            onReady={(e) => {
              // Ensure duration syncs from real iframe
            }}
            onStateChange={(e) => {
              // Map native iframe state changes smoothly
              if (e.data === 1 && !state.isPlaying) actions.play();
              if (e.data === 2 && state.isPlaying) actions.pause();
            }}
          />
        </div>
      )}

    </div>
  );
}