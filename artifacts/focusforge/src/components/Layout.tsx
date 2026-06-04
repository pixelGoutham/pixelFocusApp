import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  LayoutDashboard, CalendarDays, CheckSquare, Grid2x2, 
  Timer, Clock, BarChart3, BookOpen, ClipboardList, Layers, Settings, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/matrix', label: 'Matrix', icon: Grid2x2 },
  { href: '/pomodoro', label: 'Pomodoro', icon: Timer },
  { href: '/stopwatch', label: 'Stopwatch', icon: Clock },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/study-planner', label: 'Study Planner', icon: BookOpen },
  { href: '/mock-tests', label: 'Mock Tests', icon: ClipboardList },
  { href: '/flashcards', label: 'Flashcards', icon: Layers },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeItem = [...NAV_ITEMS, { href: '/settings', label: 'Settings', icon: Settings }].find(item => 
    item.href === '/' ? location === '/' : location.startsWith(item.href)
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 64 : 240 }}
        className="flex flex-col bg-sidebar border-r border-sidebar-border z-20 flex-shrink-0"
      >
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <Zap className="h-6 w-6 text-primary flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-lg tracking-tight"
                >
                  Pixel
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/' ? location === '/' : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors group relative overflow-hidden",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
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

        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Link href="/settings">
            <div className={cn(
              "flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors group relative overflow-hidden",
              location.startsWith('/settings')
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  Settings
                </div>
              )}
            </div>
          </Link>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex w-full items-center gap-3 px-2.5 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors justify-center md:justify-start overflow-hidden"
          >
            <div className="h-5 w-5 flex items-center justify-center flex-shrink-0">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={cn("transition-transform duration-300", isCollapsed ? "rotate-180" : "rotate-0")}
              >
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 z-10 sticky top-0">
          <h1 className="font-semibold text-lg tracking-tight">
            {activeItem?.label || 'Pixel'}
          </h1>
          <div className="text-sm font-medium text-muted-foreground tabular-nums">
            {format(new Date(), 'EEEE, d MMMM yyyy • HH:mm')}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-background relative flex flex-col">
          <div className="flex-1 p-6">
            {children}
          </div>
          <footer className="flex-shrink-0 border-t border-border py-2 px-6 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              made with ❤️ by <span className="text-primary font-medium">Pixel for bot</span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}