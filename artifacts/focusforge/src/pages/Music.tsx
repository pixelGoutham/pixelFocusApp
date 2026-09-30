import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  CloudRain, Play, Pause, SpeakerHigh, SpeakerX,
  List, ArrowLeft, ArrowRight, Stop,
  Waveform, CloudLightning, Waves, Fire, Coffee, Wind
} from "@phosphor-icons/react";

import { useMusicPlayer } from "@/lib/MusicPlayerContext";

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

export default function Music() {
  const [activePane, setActivePane] = useState<"focus-env">("focus-env");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Music Player Hook ────────────────────────────────────────────────
  const { playing, volumes, masterVol, toggleSound, setVolume, stopAll, handleMasterVolChange } = useMusicPlayer();

  const springConfig = { type: "spring", bounce: 0, duration: 0.4 };

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

// ─── Navigation ──────────────────────────────────────────────────────────────
interface NavItem { id: string; label: string; icon: React.ComponentType<{ className?: string; weight?: "bold" | "fill" }>; }
const NAV_ITEMS: NavItem[] = [
  { id: "focus-env", label: "Focus Environments", icon: CloudRain },
];