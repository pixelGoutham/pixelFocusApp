import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider, useStore } from "@/lib/StoreContext";
import { Layout } from "@/components/Layout";
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
import Flashcards from "@/pages/Flashcards";
import Settings from "@/pages/Settings";
import Onboarding from "@/pages/Onboarding";

const queryClient = new QueryClient();

function AppRouter() {
  const { settings, isLoading } = useStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading FocusForge...</p>
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
        <Route path="/flashcards" component={Flashcards} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
        </StoreProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
