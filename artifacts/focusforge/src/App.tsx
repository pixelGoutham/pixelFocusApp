import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { use, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/AuthContext";
import { StoreProvider, useStore } from "@/lib/StoreContext";
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
import QuickCapture from "@/pages/QuickCapture";
import { MusicPlayerProvider } from "@/lib/MusicPlayerContext";
import { ShortcutsProvider } from "./lib/ShortcutsContext";
import OLEDClock from "./pages/OLEDClock";

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
    <>
      {/* QuickCapture route - outside Layout for Electron window */}
      <Route path="/quick-capture" component={QuickCapture} />
      <Route path={'/oled-clock'} component={OLEDClock} />


      {/* Main app routes - inside Layout */}
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/matrix" component={Matrix} />
          <Route path='/music' component={Music} />
          <Route path='/consistency' component={Consistency} />
          <Route path="/pomodoro" component={Pomodoro} />
          <Route path="/stopwatch" component={Stopwatch} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/study-planner" component={StudyPlanner} />
          <Route path="/mock-tests" component={MockTests} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </>
  );
}

const isElectron = navigator.userAgent.toLowerCase().includes('electron');

function AppContent() {
  const {toggleFullscreen, isFullscreen } = useFullscreen();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.ctrlKey || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, []);
  return isElectron ? (
  <WouterRouter hook={useHashLocation}>
    <AppRouter />
  </WouterRouter>
) : (
  <WouterRouter
    base={import.meta.env.BASE_URL.replace(/\/$/, "")}
  >
    <AppRouter />
  </WouterRouter>
);
}
function AppInner() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ShortcutsProvider>
          <AuthProvider>
            <StoreProvider>
              <FullscreenProvider>
                <ThemeProvider>
                  <TimerProvider>
                    <DiscordPresence />
                <MusicPlayerProvider>
                  <AppContent />
                </MusicPlayerProvider>
             </TimerProvider>
            </ThemeProvider>
           </FullscreenProvider>
         </StoreProvider>
       </AuthProvider>
       </ShortcutsProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <AppInner />
  );
}

export default App;