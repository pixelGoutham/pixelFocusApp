import { useState } from "react";
import { Zap, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/StoreContext";
import { motion } from "framer-motion";

export default function Onboarding() {
  const { settings, setSettings } = useStore();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(480);

  const handleStart = () => {
    if (!name.trim()) return;
    setSettings({
      ...settings,
      userName: name.trim(),
      dailyGoalMinutes: goal,
      onboardingDone: true,
    });
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-border bg-card p-10 shadow-2xl">
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 mb-2">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome to Pixel</h1>
            <p className="text-sm text-muted-foreground text-center">
              Your offline productivity OS. Study. Plan. Focus. Achieve.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                What should we call you?
              </Label>
              <Input
                id="name"
                data-testid="input-name"
                placeholder="e.g. Arjun"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleStart()}
                className="h-11"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal" className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Daily study goal (hours)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  id="goal"
                  data-testid="input-goal"
                  type="range"
                  min={60}
                  max={720}
                  step={30}
                  value={goal}
                  onChange={e => setGoal(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-mono font-medium w-14 text-right">
                  {(goal / 60).toFixed(1)}h
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex gap-3">
              <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">100% Offline. No cloud. No login.</p>
                <p>All your data stays on this device. Export a single backup file anytime.</p>
              </div>
            </div>

            <Button
              data-testid="button-get-started"
              className="w-full h-11 font-semibold"
              onClick={handleStart}
              disabled={!name.trim()}
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
