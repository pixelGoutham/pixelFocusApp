import { useState, useRef } from "react";
import { Download, Upload, Trash2, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { exportData, importData, DEFAULT_SETTINGS } from "@/lib/store";
import { format } from "date-fns";

export default function Settings() {
  const { settings, setSettings, reloadAll } = useStore();
  const { toast } = useToast();
  const [name, setName] = useState(settings.userName);
  const [goal, setGoal] = useState(settings.dailyGoalMinutes);
  const [pomWork, setPomWork] = useState(settings.pomodoroWork);
  const [pomBreak, setPomBreak] = useState(settings.pomodoroBreak);
  const [pomLong, setPomLong] = useState(settings.pomodoroLongBreak);
  const [clearOpen, setClearOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveProfile = () => {
    setSettings(prev => ({ ...prev, userName: name.trim(), dailyGoalMinutes: goal }));
    toast({ title: "Profile saved" });
  };

  const savePomodoro = () => {
    setSettings(prev => ({ ...prev, pomodoroWork: pomWork, pomodoroBreak: pomBreak, pomodoroLongBreak: pomLong }));
    toast({ title: "Pomodoro settings saved" });
  };

  const handleExport = async () => {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focusforge-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup exported", description: "Save this file somewhere safe." });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importData(text);
      await reloadAll();
      toast({ title: "Backup restored", description: "All your data has been loaded." });
    } catch {
      toast({ title: "Import failed", description: "Invalid backup file.", variant: "destructive" });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClearAll = async () => {
    const { saveTasks, saveSessions, saveFlashcards, saveMockTests, saveSettings } = await import("@/lib/store");
    await Promise.all([
      saveTasks([]),
      saveSessions([]),
      saveFlashcards([]),
      saveMockTests([]),
      saveSettings({ ...DEFAULT_SETTINGS }),
    ]);
    await reloadAll();
    setClearOpen(false);
    toast({ title: "All data cleared", variant: "destructive" });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm font-semibold">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Your Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Arjun" data-testid="input-settings-name" />
          </div>
          <div>
            <Label>Daily Study Goal (minutes)</Label>
            <div className="flex items-center gap-3 mt-1">
              <input type="range" min={60} max={720} step={30} value={goal} onChange={e => setGoal(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-sm font-mono w-16 text-right">{(goal / 60).toFixed(1)}h / day</span>
            </div>
          </div>
          <Button className="gap-2" onClick={saveProfile} data-testid="button-save-profile">
            <Save className="h-4 w-4" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Pomodoro */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm font-semibold">Pomodoro Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Work (min)</Label>
              <Input type="number" min={5} max={90} value={pomWork} onChange={e => setPomWork(Number(e.target.value))} data-testid="input-pom-work" />
            </div>
            <div>
              <Label>Break (min)</Label>
              <Input type="number" min={1} max={30} value={pomBreak} onChange={e => setPomBreak(Number(e.target.value))} data-testid="input-pom-break" />
            </div>
            <div>
              <Label>Long Break</Label>
              <Input type="number" min={5} max={60} value={pomLong} onChange={e => setPomLong(Number(e.target.value))} data-testid="input-pom-long" />
            </div>
          </div>
          <Button className="gap-2" onClick={savePomodoro} data-testid="button-save-pomodoro">
            <Save className="h-4 w-4" />
            Save Pomodoro Settings
          </Button>
        </CardContent>
      </Card>

      {/* Save File */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Save File & Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Your data is stored locally in this browser. Export a single JSON backup file that you can restore on any device.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={handleExport} data-testid="button-export">
              <Download className="h-4 w-4" />
              Export Backup
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} data-testid="button-import">
              <Upload className="h-4 w-4" />
              Import Backup
            </Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} data-testid="input-import-file" />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-rose-500/30">
        <CardHeader><CardTitle className="text-sm font-semibold text-rose-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">This will permanently delete all tasks, sessions, flashcards, test results, and settings. This cannot be undone.</p>
          <Button variant="destructive" className="gap-2" onClick={() => setClearOpen(true)} data-testid="button-clear-all">
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </Button>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Clear All Data?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently erase everything. Make sure you have a backup first.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll} data-testid="button-confirm-clear">Yes, Delete Everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
