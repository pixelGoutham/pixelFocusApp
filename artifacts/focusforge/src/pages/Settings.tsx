import { useState, useRef, useEffect } from "react";
import { Download, Upload, Trash2, Save, AlertTriangle, Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { exportData, importData, DEFAULT_SETTINGS } from "@/lib/store";
import { isFirebaseConfigured } from "@/lib/firebase";
import { syncToCloud, onSyncStatusChange, SyncStatus, getLastSyncTime } from "@/lib/cloudSync";
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("unconfigured");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSyncStatusChange(setSyncStatus);
    getLastSyncTime().then(setLastSync);
    return unsub;
  }, []);

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

  const handleManualSync = async () => {
    await syncToCloud();
    const t = await getLastSyncTime();
    setLastSync(t);
    if (syncStatus === "success") {
      toast({ title: "Synced to cloud", description: "Your data is backed up." });
    }
  };

  const syncStatusBadge = () => {
    if (!isFirebaseConfigured) {
      return <Badge variant="outline" className="gap-1 text-muted-foreground border-border"><CloudOff className="h-3 w-3" />Not configured</Badge>;
    }
    if (syncStatus === "syncing") {
      return <Badge variant="outline" className="gap-1 text-blue-400 border-blue-400/30"><RefreshCw className="h-3 w-3 animate-spin" />Syncing…</Badge>;
    }
    if (syncStatus === "success") {
      return <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-400/30"><CheckCircle2 className="h-3 w-3" />Synced</Badge>;
    }
    if (syncStatus === "offline") {
      return <Badge variant="outline" className="gap-1 text-yellow-400 border-yellow-400/30"><CloudOff className="h-3 w-3" />Offline</Badge>;
    }
    if (syncStatus === "error") {
      return <Badge variant="outline" className="gap-1 text-rose-400 border-rose-400/30"><Cloud className="h-3 w-3" />Sync error</Badge>;
    }
    return <Badge variant="outline" className="gap-1 text-muted-foreground border-border"><Cloud className="h-3 w-3" />Idle</Badge>;
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

      {/* Cloud Sync */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><Cloud className="h-4 w-4" />Cloud Sync (Firebase)</span>
            {syncStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFirebaseConfigured ? (
            <>
              <p className="text-xs text-muted-foreground">
                Your data syncs automatically every 5 minutes and after any changes when you're online.
              </p>
              {lastSync && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {format(new Date(lastSync), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
              <Button variant="outline" className="gap-2" onClick={handleManualSync} disabled={syncStatus === "syncing"} data-testid="button-sync-now">
                <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                Sync Now
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Add your Firebase project credentials as environment variables to enable automatic cloud backup:
              </p>
              <div className="rounded-md bg-muted/50 border border-border p-3 space-y-1 font-mono text-xs text-muted-foreground">
                <p>VITE_FIREBASE_API_KEY</p>
                <p>VITE_FIREBASE_AUTH_DOMAIN</p>
                <p>VITE_FIREBASE_PROJECT_ID</p>
                <p>VITE_FIREBASE_APP_ID</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a free Firebase project at <span className="text-primary">console.firebase.google.com</span>, enable Firestore + Anonymous Auth, then set these env vars and restart the app.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save File */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Local Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            All data is stored locally in IndexedDB on this device. Export a JSON backup to restore anywhere.
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
