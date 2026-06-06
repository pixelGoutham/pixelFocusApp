import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  LayoutDashboard, CalendarDays, CheckSquare, Grid2x2, 
  Timer, Clock, BarChart3, BookOpen, ClipboardList, Layers, Settings, Zap,
  Music2, TreePine, X, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useMusicContext } from '@/lib/MusicContext';
import { PLAYER_HEIGHT } from '@/pages/Music';

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/calendar',      label: 'Calendar',     icon: CalendarDays },
  { href: '/tasks',         label: 'Tasks',        icon: CheckSquare },
  { href: '/matrix',        label: 'Matrix',       icon: Grid2x2 },
  { href: '/pomodoro',      label: 'Pomodoro',     icon: Timer },
  { href: '/stopwatch',     label: 'Stopwatch',    icon: Clock },
  { href: '/analytics',     label: 'Analytics',    icon: BarChart3 },
  { href: '/study-planner', label: 'Study Planner',icon: BookOpen },
  { href: '/mock-tests',    label: 'Mock Tests',   icon: ClipboardList },
  { href: '/flashcards',    label: 'Flashcards',   icon: Layers },
  { href: '/music',         label: 'Music',        icon: Music2 },
  { href: '/consistency',   label: 'My Tree',      icon: TreePine },
];

// ─── Layout constants ─────────────────────────────────────────────────────────
const HEADER_H       = 56;    // h-14
const URL_BAR_H      = 52;    // border-b bar in Music.tsx (py-3 + h-9 input)
const PLAYER_TOP     = HEADER_H + URL_BAR_H;  // 108px from viewport top
const SIDEBAR_EXPANDED  = 240;
const SIDEBAR_COLLAPSED = 64;

// ─── Component ────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [miniDismissed, setMiniDismissed] = useState(false);
  const { embedUrl, title, thumb, clearYt } = useMusicContext();

  const isOnMusic = location === '/music' || location.startsWith('/music');
  const sidebarW  = isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const activeItem = [...NAV_ITEMS, { href: '/settings', label: 'Settings', icon: Settings }].find(item =>
    item.href === '/' ? location === '/' : location.startsWith(item.href)
  );

  // Re-show mini-player when URL changes
  React.useEffect(() => { setMiniDismissed(false); }, [embedUrl]);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#000' }}>

      {/* ── Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarW }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex flex-col z-20 flex-shrink-0 border-r"
        style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b" style={{ borderColor: '#1a1a1a' }}>
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <Zap className="h-6 w-6 text-primary flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-lg tracking-tight text-white"
                >
                  Pixel
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/' ? location === '/' : location.startsWith(item.href);
            const isMusic  = item.href === '/music';
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  'flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors group relative overflow-hidden',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                )}>
                  <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                  {/* Music pulse dot when playing */}
                  {isMusic && embedUrl && !isActive && (
                    <span className="absolute left-2.5 top-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium text-sm whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Settings + collapse */}
        <div className="p-2 border-t space-y-0.5" style={{ borderColor: '#1a1a1a' }}>
          <Link href="/settings">
            <div className={cn(
              'flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors group relative overflow-hidden',
              location.startsWith('/settings')
                ? 'bg-primary/10 text-primary'
                : 'text-zinc-500 hover:bg-white/5 hover:text-white'
            )}>
              <Settings className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-medium text-sm whitespace-nowrap"
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </Link>

          <button
            onClick={() => setIsCollapsed(c => !c)}
            className="flex w-full items-center gap-3 px-2.5 py-2 rounded-md text-zinc-600 hover:bg-white/5 hover:text-white transition-colors justify-center md:justify-start overflow-hidden"
          >
            <div className="h-5 w-5 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={cn('transition-transform duration-300', isCollapsed ? 'rotate-180' : 'rotate-0')}>
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-medium text-sm whitespace-nowrap"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b flex items-center justify-between px-6 z-10 sticky top-0"
          style={{ background: '#000', borderColor: '#1a1a1a' }}>
          <h1 className="font-semibold text-lg tracking-tight text-white">
            {activeItem?.label || 'Pixel'}
          </h1>
          <div className="text-sm font-medium text-zinc-600 tabular-nums">
            {format(new Date(), 'EEEE, d MMMM yyyy • HH:mm')}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto relative flex flex-col" style={{ background: '#000' }}>
          <div className={cn('flex-1', !isOnMusic && 'p-6')}>
            {children}
          </div>
          <footer className="flex-shrink-0 border-t py-2 px-6 flex items-center justify-center"
            style={{ borderColor: '#1a1a1a' }}>
            <p className="text-xs text-zinc-700">
              made with ❤️ by <span className="text-primary font-medium">Pixel for bot</span>
            </p>
          </footer>
        </main>
      </div>

      {/* ── Persistent YouTube iframe ─────────────────────────────────────────
           Always mounted when embedUrl is set so audio never stops.
           On /music → large panel overlaying the player-spacer area.
           Off /music → invisible 1×1px (Chromium keeps audio alive).
      ──────────────────────────────────────────────────────────────────────── */}
      {embedUrl && (
        <iframe
          key={embedUrl}
          src={embedUrl}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{
            position: 'fixed',
            ...(isOnMusic ? {
              top: PLAYER_TOP,
              left: sidebarW,
              right: 0,
              height: PLAYER_HEIGHT,
              width: `calc(100% - ${sidebarW}px)`,
              zIndex: 10,
              background: '#000',
              border: 'none',
              transition: 'left 0.3s ease, width 0.3s ease',
            } : {
              bottom: 0, right: 0,
              width: 1, height: 1,
              opacity: 0.001,
              pointerEvents: 'none',
              zIndex: -1,
              border: 'none',
            }),
          }}
        />
      )}

      {/* ── Floating mini-player (all pages except /music) ────────────────── */}
      <AnimatePresence>
        {embedUrl && !isOnMusic && !miniDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              bottom: 24, right: 24,
              zIndex: 60,
              width: 288,
              background: '#000',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 14,
              boxShadow: '0 0 32px rgba(251,191,36,0.08), 0 4px 24px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Now Playing</span>
              </div>
              <button
                onClick={() => setMiniDismissed(true)}
                className="h-5 w-5 flex items-center justify-center text-zinc-600 hover:text-white transition-colors rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Thumbnail + info */}
            <div className="px-3 pb-3 flex gap-3 items-center">
              {thumb ? (
                <img src={thumb} alt="thumbnail"
                  className="h-14 w-24 rounded-lg object-cover flex-shrink-0"
                  style={{ border: '1px solid #1a1a1a' }} />
              ) : (
                <div className="h-14 w-24 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#111', border: '1px solid #1a1a1a' }}>
                  <Music2 className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white leading-tight line-clamp-2">
                  {title || 'YouTube Music'}
                </p>
                <p className="text-xs text-zinc-600 mt-1">YouTube</p>
              </div>
            </div>

            {/* Open button */}
            <div className="border-t px-3 py-2 flex items-center justify-between" style={{ borderColor: '#1a1a1a' }}>
              <button
                onClick={() => { clearYt(); setMiniDismissed(false); }}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Stop
              </button>
              <button
                onClick={() => navigate('/music')}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-amber-300 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Open Player
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
