import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard, CalendarDays, CheckSquare, Grid2x2,
  Timer, Clock, BarChart3, BookOpen, ClipboardList, Settings, Zap,
  Music2, TreePine, X, ExternalLink, Cloud, LogIn, Sun, Moon, Menu, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getSyncStatus } from '@/lib/cloudSync';
import { useTheme } from '@/lib/ThemeContext';
import { useFullscreen } from '@/lib/FullscreenContext';

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/',          label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/tasks',     label: 'Tasks',        icon: CheckSquare },
  { href: '/matrix',    label: 'Matrix',       icon: Grid2x2 },
  { href: '/music',     label: 'Music',        icon: Music2 },
  { href: '/pomodoro',  label: 'Pomodoro',     icon: Timer },
  { href: '/calendar',  label: 'Calendar',     icon: CalendarDays },
  { href: '/stopwatch', label: 'Stopwatch',    icon: Clock },
  { href: '/analytics', label: 'Analytics',    icon: BarChart3 },
  { href: '/study-planner', label: 'Study Planner',icon: BookOpen },
  { href: '/mock-tests',    label: 'Mock Tests',   icon: ClipboardList },
  { href: '/consistency',   label: 'My Tree',      icon: TreePine },
];

// ─── Auth Indicator ────────────────────────────────────────────────────────────
function AuthIndicator({ isCollapsed }: { isCollapsed: boolean }) {
  const { user } = useAuth();
  const syncStatus = getSyncStatus();

  if (!isFirebaseConfigured) return null;

  const syncDot = user && syncStatus === 'success'
    ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
    : user && syncStatus === 'syncing'
    ? <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
    : null;

  return (
    <Link href="/settings">
      <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-muted/60 transition-colors overflow-hidden group active-scale">
        {user ? (
          user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-5 w-5 rounded-full flex-shrink-0 object-cover" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-primary/30 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
              {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
            </div>
          )
        ) : (
          <LogIn className="h-5 w-5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
        )}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
            >
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-xs">
                {user ? (user.displayName ?? user.email ?? 'Account') : 'Sign in'}
              </span>
              {syncDot}
              {!user && <Cloud className="h-3 w-3 text-muted-foreground" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Link>
  );
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const SIDEBAR_EXPANDED  = 240;
const SIDEBAR_COLLAPSED = 64;
const MOBILE_BREAKPOINT = 768;

// ─── Component ────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [fsSidebarOpen, setFsSidebarOpen] = useState(false);
  const { isFullscreen, toggleFullscreen, isTransitioning: contextIsTransitioning } = useFullscreen();
  const { resolvedTheme, setTheme } = useTheme();

  const isOnMusic = location === '/music' || location.startsWith('/music');
  const sidebarCollapsed = isMobile ? false : isCollapsed;
  const sidebarW = isMobile ? 0 : (isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);

  const activeItem = [...NAV_ITEMS, { href: '/settings', label: 'Settings', icon: Settings }].find(item =>
    item.href === '/' ? location === '/' : location.startsWith(item.href)
  );

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => { setIsMobileOpen(false); setFsSidebarOpen(false); }, [location]);

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      {/* ── Mobile drawer backdrop ── */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/50"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside
        initial={false}
        animate={
          isMobile
            ? { x: isMobileOpen ? 0 : -SIDEBAR_EXPANDED, width: SIDEBAR_EXPANDED }
            : { 
                width: (isFullscreen && !fsSidebarOpen) ? 0 : sidebarW, 
                opacity: (isFullscreen && !fsSidebarOpen) ? 0 : 1, 
                x: (isFullscreen && !fsSidebarOpen) ? -30 : 0 
              }
        }
        transition={{ type: "spring", bounce: 0, duration: 0.35 }}
        className={cn(
          'flex flex-col z-40 flex-shrink-0 border-r border-sidebar-border bg-sidebar/90 backdrop-blur-lg overflow-hidden',
          isMobile && 'fixed inset-y-0 left-0'
        )}
        aria-hidden={sidebarW === 0 || (isFullscreen && !fsSidebarOpen) ? 'true' : undefined}
        style={{ pointerEvents: (sidebarW === 0 || (isFullscreen && !fsSidebarOpen)) ? 'none' : 'auto' }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <img
              src={resolvedTheme === 'dark' ? 'logo_light.ico' : 'logo_dark.ico'}
              alt="Pixel Logo"
              className="h-10 w-10 flex-shrink-0 rounded-lg drop-shadow-[0_1px_2px_rgb(0,0,0,0.1)]"
            />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-lg tracking-tight text-foreground ml-3"
                >
                  Pixel
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {(isMobile || (isFullscreen && fsSidebarOpen)) && (
            <button
              onClick={() => isMobile ? setIsMobileOpen(false) : setFsSidebarOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/' ? location === '/' : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  'flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors group relative overflow-hidden active-scale',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}>
                  <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
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
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Settings + theme toggle + collapse */}
        <div className="p-2 border-t border-sidebar-border space-y-0.5">
          <AuthIndicator isCollapsed={sidebarCollapsed} />
          <Link href="/settings">
            <div className={cn(
              'flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors group relative overflow-hidden active-scale',
              location.startsWith('/settings')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}>
              <Settings className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
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
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors overflow-hidden group active-scale"
          >
            <div className="h-5 w-5 flex items-center justify-center flex-shrink-0">
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-medium text-sm whitespace-nowrap"
                >
                  {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(c => !c)}
              className="flex w-full items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors justify-center md:justify-start overflow-hidden active-scale"
            >
              <div className="h-5 w-5 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn('transition-transform duration-300', isCollapsed ? 'rotate-180' : 'rotate-0')}>
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
          )}
        </div>
      </motion.aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 z-10 sticky top-0 bg-background gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && (
              <button onClick={() => setIsMobileOpen(true)} className="p-1.5 -ml-1.5 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors flex-shrink-0 active-scale">
                <Menu className="h-5 w-5" />
              </button>
            )}
            
            {/* INJECTED HERE: Safely pushes the Dashboard text to the right! */}
            {isFullscreen && !fsSidebarOpen && !isMobile && (
              <button
                onClick={() => setFsSidebarOpen(true)}
                className="p-1.5 -ml-1.5 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors flex-shrink-0 active-scale"
                aria-label="Open sidebar"
              >
                <List className="h-5 w-5" />
              </button>
            )}

            <h1 className="font-semibold text-lg tracking-tight text-foreground truncate">
              {activeItem?.label || 'Pixel'}
            </h1>
          </div>
          <div className="text-sm font-medium text-muted-foreground tabular-nums flex-shrink-0 hidden sm:block">
            {format(new Date(), 'EEEE, d MMMM yyyy • HH:mm')}
          </div>
        </header>

        {/* Page content */}
        <motion.main
          className="flex-1 overflow-y-auto relative flex flex-col w-full h-full bg-background [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          initial={false}
          animate={{ borderRadius: isFullscreen ? "0px" : "16px", scale: isFullscreen ? 1 : 0.98 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          style={{ transformOrigin: "center center" }}
        >
          <div className={cn('flex-1 w-full max-w-7xl mx-auto', !isOnMusic && !isFullscreen && 'p-6')}>
            {children}
          </div>
          <footer className="flex-shrink-0 border-t border-border py-2 px-6 flex items-center justify-center mt-auto">
            <p className="text-xs text-muted-foreground/50">
              made with ❤️ by <span className="text-primary font-medium">Pixel for bot</span>
            </p>
          </footer>
        </motion.main>
      </div>
    </div>
  );
}