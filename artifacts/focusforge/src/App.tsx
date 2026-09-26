import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/AuthContext";
import { StoreProvider, useStore } from "@/lib/StoreContext";
import { MusicPlayerProvider } from "@/lib/MusicPlayerContext";
import { TimerProvider } from "@/lib/TimerContext";
import { DiscordPresence } from '@/components/DiscordPresence';
import { ThemeProvider } from "@/lib/ThemeContext";
import { Layout } from "@/components/Layout";
import { FullscreenProvider, useFullscreen } from "@/lib/FullscreenContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Calendar from "@/pages/Calendar";
import Tasks from "@/pages/Tasks";
import Matrix from "@/pages/Matrix";
import Pomodoro from "@/pages/Pomodoro";
import Stopwatch from "@/pages/Stopwatch";
import Analytics from "@/pages/Analytics";
import StudyPlanner from "@/pages/StudyPlanner";
import MockTests from "@/pages/MockTests";
import Settings from "@/pages/Settings";
import Onboarding from "@/pages/Onboarding";
import Music from "@/pages/Music";
import Consistency from "@/pages/Consistency";

const queryClient = new QueryClient();

function AppRouter() {
  const { settings, isLoading } = useStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Pixel...</p>
        </div>
      </div>
    );
  }

  if (!settings.onboardingDone) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/matrix" component={Matrix} />
        <Route path="/pomodoro" component={Pomodoro} />
        <Route path="/stopwatch" component={Stopwatch} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/study-planner" component={StudyPlanner} />
        <Route path="/mock-tests" component={MockTests} />
        <Route path="/music" component={Music} />
        <Route path="/consistency" component={Consistency} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

const isElectron = navigator.userAgent.toLowerCase().includes('electron');

function AppInner() {
  const { toggleFullscreen, isFullscreen } = useFullscreen();

  // Global keyboard listener for F11 and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        // Only handle Escape if we're in fullscreen (to avoid interfering with modals, etc.)
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleFullscreen, isFullscreen]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <StoreProvider>
            <ThemeProvider>
              <TimerProvider>
                <MusicPlayerProvider>
                  <DiscordPresence />
                  {isElectron ? (
                    <WouterRouter hook={useHashLocation}>
                      <AppRouter />
                    </WouterRouter>
                  ) : (
                    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                      <AppRouter />
                    </WouterRouter>
                  )}
                </MusicPlayerProvider>
              </TimerProvider>
            </ThemeProvider>
          </StoreProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <FullscreenProvider>
      <AppInner />
    </FullscreenProvider>
  );
}

export default App;
