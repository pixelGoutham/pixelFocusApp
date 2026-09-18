import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
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
  X,
  ArrowLeft,
  ArrowRight,
  Lyrics,
  Shuffle
} from '@phosphor-icons/react';
import { fetchYouTubeMetadata } from '@/lib/youtube-utils';

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

  const handleLoadUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    // Simple videoId extraction
    const match = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = match ? match[1] : trimmed.length === 11 ? trimmed : null;

    if (videoId) {
      // Fetch actual metadata from YouTube
      const metadata = await fetchYouTubeMetadata(videoId);

      actions.playTrack({
        id: videoId,
        title: metadata?.title || `YouTube Stream (${videoId})`,
        videoId: videoId,
        thumbnailUrl: metadata?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: 0 // Will be updated when player loads
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
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
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
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                onClick={() => setActivePane(item.id as any)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium',
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
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl shadow-sm"
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
      <footer className="fixed bottom-6 left-[51%] -translate-x-[50%] z-50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl px-4 py-2.5 rounded-full max-w-[90%] ring-1 ring-inset ring-white/30 dark:ring-zinc-900/20 hover:bg-white/80 dark:hover:bg-zinc-900/80 hover:ring-2 hover:ring-inset hover:ring-white/40 dark:hover:ring-zinc-900/30 border-[2px solid black] dark:border-[2px solid white] transition-colors">
        <div className="flex items-center justify-between gap-4 w-full">

          {/* Left Section: Track Metadata */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 border border-zinc-200 dark:border-white/10">
              {state.currentTrack?.thumbnailUrl ? (
                <img src={state.currentTrack.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400"><MusicNotes size={14} /></div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[-0.02em] text-zinc-900 dark:text-white truncate">
                {state.currentTrack?.title || "Not Playing"}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 tracking-[-0.02em] truncate">
                {state.currentTrack ? "YouTube Audio" : "Ready"}
              </p>
            </div>
          </div>

          {/* Center Section: Playback Controls */}
          <div className="flex items-center gap-2">
            {/* Shuffle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              onClick={actions.toggleShuffle}
              className={cn(
                "text-zinc-500 hover:text-zinc-800 dark:hover:text-white",
                state.shuffle && "text-primary"
              )}
            >
              <Shuffle size={18} weight="bold" />
            </motion.button>

            {/* Skip Back */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              onClick={actions.previousTrack}
              disabled={!state.currentTrack}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
            >
              <ArrowLeft size={18} weight="bold" />
            </motion.button>

            {/* Play/Pause */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              onClick={actions.togglePlay}
              disabled={!state.currentTrack}
              className="w-10 h-10 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-md disabled:opacity-30"
            >
              {state.isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
            </motion.button>

            {/* Skip Forward */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              onClick={actions.nextTrack}
              disabled={!state.currentTrack}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
            >
              <ArrowRight size={18} weight="bold" />
            </motion.button>

            {/* Repeat */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              onClick={actions.toggleRepeat}
              className={cn(
                "text-zinc-500 hover:text-zinc-800 dark:hover:text-white",
                state.repeat && "text-primary"
              )}
            >
              <ArrowsClockwise size={18} weight="bold" />
            </motion.button>
          </div>

          {/* Right Section: Utility & Volume */}
          <div className="flex items-center gap-2">
            {/* Lyrics */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              onClick={() => {
                console.log('Lyrics button clicked - feature coming soon');
                // TODO: Implement lyrics functionality
              }}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
            >
              <MusicNotes size={18} weight="bold" />
            </motion.button>

            {/* Queue */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              onClick={() => {
                console.log('Queue button clicked - feature coming soon');
                // TODO: Implement queue functionality
              }}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
            >
              <List size={18} weight="bold" />
            </motion.button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                onClick={() => actions.setVolume(state.volume > 0 ? 0 : 0.75)}
                className="text-zinc-500"
              >
                {state.volume > 0 ? <SpeakerHigh size={16} weight="bold" /> : <SpeakerX size={16} weight="bold" />}
              </motion.button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={state.volume}
                onChange={(e) => actions.setVolume(parseFloat(e.target.value))}
                className="w-20 accent-primary cursor-pointer"
              />
            </div>
          </div>

        </div>
      </footer>

      
    </div>
  );
}