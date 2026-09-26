import { useState, useRef, useEffect } from "react";
import { Download, Upload, Trash2, Save, AlertTriangle, Cloud, CloudOff, RefreshCw, CheckCircle2, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { useStore } from "@/lib/StoreContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { exportData, importData, DEFAULT_SETTINGS } from "@/lib/store";
import { useTheme, Theme } from "@/lib/ThemeContext";
import { isFirebaseConfigured } from "@/lib/firebase";
import { syncToCloud, onSyncStatusChange, SyncStatus, getLastSyncTime } from "@/lib/cloudSync";
import { format } from "date-fns";

// ── Google icon SVG ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

// ── Apple icon SVG ────────────────────────────────────────────────────────────
function AppleIcon() {
  return (
    <svg width="17" height="18" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-143-39.3c-59.3 0-79.3 40.3-142.7 40.3s-100.4-60.6-155.5-127.1C81.1 786.4 0 643.7 0 512C0 287.5 153.2 168.8 303.5 168.8c74.1 0 135.8 48.7 181.4 48.7 43.7 0 112.5-51.7 196.1-51.7 31.3 0 147.3 3.1 221.5 110.8zm-209.4-221.1c31.3-36.7 53.8-88.2 53.8-139.7 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.9-55.1 136.1 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 134.8-71.5z"/>
    </svg>
  );
}

export default function Settings() {
  const { settings, setSettings, reloadAll } = useStore();
  const { user, isAuthLoading, isFirebaseReady, signInWithGoogle, signInWithApple, signOut, authError, clearAuthError } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(settings.userName || user?.displayName || "");
  const [goal, setGoal] = useState(settings.dailyGoalMinutes);
  const [pomWork, setPomWork] = useState(settings.pomodoroWork);
  const [pomBreak, setPomBreak] = useState(settings.pomodoroBreak);
  const [pomLong, setPomLong] = useState(settings.pomodoroLongBreak);
  const [clearOpen, setClearOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("unconfigured");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState<'google' | 'apple' | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSyncStatusChange(setSyncStatus);
    getLastSyncTime().then(setLastSync);
    return unsub;
  }, []);

  // When user signs in, pull their display name into the profile field if it's empty
  useEffect(() => {
    if (user?.displayName && !name.trim()) {
      setName(user.displayName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.displayName]);

  // Show auth errors as toasts
  useEffect(() => {
    if (authError) {
      toast({ title: "Sign-in error", description: authError, variant: "destructive" });
      clearAuthError();
    }
  }, [authError, clearAuthError, toast]);

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
    a.download = `pixel-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
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
      saveTasks([]), saveSessions([]), saveFlashcards([]),
      saveMockTests([]), saveSettings({ ...DEFAULT_SETTINGS }),
    ]);
    await reloadAll();
    setClearOpen(false);
    toast({ title: "All data cleared", variant: "destructive" });
  };

  const handleManualSync = async () => {
    if (!user?.uid) return;
    await syncToCloud(user.uid);
    const t = await getLastSyncTime();
    setLastSync(t);
    toast({ title: "Synced to cloud", description: "Your data is backed up." });
  };

  const handleGoogleSignIn = async () => {
    setSigningIn('google');
    await signInWithGoogle();
    setSigningIn(null);
  };

  const handleAppleSignIn = async () => {
    setSigningIn('apple');
    await signInWithApple();
    setSigningIn(null);
  };

  const syncBadge = () => {
    if (!isFirebaseReady) return null;
    if (!user) return <Badge variant="outline" className="gap-1 text-zinc-500 border-zinc-700"><CloudOff className="h-3 w-3" />Not signed in</Badge>;
    const map: Record<SyncStatus, React.ReactNode> = {
      syncing:      <Badge variant="outline" className="gap-1 text-blue-400 border-blue-400/30"><RefreshCw className="h-3 w-3 animate-spin" />Syncing…</Badge>,
      success:      <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-400/30"><CheckCircle2 className="h-3 w-3" />Synced</Badge>,
      offline:      <Badge variant="outline" className="gap-1 text-yellow-400 border-yellow-400/30"><CloudOff className="h-3 w-3" />Offline</Badge>,
      error:        <Badge variant="outline" className="gap-1 text-rose-400 border-rose-400/30"><Cloud className="h-3 w-3" />Error</Badge>,
      idle:         <Badge variant="outline" className="gap-1 text-zinc-500 border-zinc-700"><Cloud className="h-3 w-3" />Idle</Badge>,
      unconfigured: <Badge variant="outline" className="gap-1 text-zinc-500 border-zinc-700"><CloudOff className="h-3 w-3" />Not configured</Badge>,
      'signed-out': <Badge variant="outline" className="gap-1 text-zinc-500 border-zinc-700"><CloudOff className="h-3 w-3" />Not signed in</Badge>,
    };
    return map[syncStatus] ?? null;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Account / Cloud Sync ──────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><Cloud className="h-4 w-4" />Account & Cloud Sync</span>
            {syncBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isFirebaseReady ? (
            /* Firebase not configured → show env var instructions */
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Add these env vars to enable Google / Apple sign-in with automatic cloud backup:
              </p>
              <div className="rounded-md bg-muted/40 border border-border p-3 font-mono text-xs text-muted-foreground space-y-1">
                <p>VITE_FIREBASE_API_KEY</p>
                <p>VITE_FIREBASE_AUTH_DOMAIN</p>
                <p>VITE_FIREBASE_PROJECT_ID</p>
                <p>VITE_FIREBASE_APP_ID</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a free Firebase project at <span className="text-primary">console.firebase.google.com</span>,
                enable Firestore + Google Authentication, then add these as Replit Secrets and restart.
              </p>
            </div>
          ) : isAuthLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Checking sign-in status…
            </div>
          ) : user ? (
            /* Signed in state */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName ?? ''} className="h-10 w-10 rounded-full object-cover border border-border" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                    {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{user.displayName ?? 'Signed in'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your data syncs automatically after changes and every 5 minutes when online.
                {lastSync && ` Last synced ${format(new Date(lastSync), "MMM d 'at' h:mm a")}.`}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline" size="sm" className="gap-2"
                  onClick={handleManualSync}
                  disabled={syncStatus === 'syncing'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="gap-2 text-rose-400 border-rose-400/30 hover:bg-rose-400/10"
                  onClick={() => setSignOutOpen(true)}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            /* Not signed in state */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in to sync your data across all your devices. Your data is stored securely under your account — no one else can access it.
              </p>
              <div className="space-y-2">
                {/* Google Sign-In button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn !== null}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-zinc-200"
                >
                  {signingIn === 'google' ? (
                    <div className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin flex-shrink-0" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>Continue with Google</span>
                </button>
                {/* Apple Sign-In button */}
                <button
                  onClick={handleAppleSignIn}
                  disabled={signingIn !== null}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md bg-black text-white text-sm font-medium hover:bg-zinc-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-zinc-800"
                >
                  {signingIn === 'apple' ? (
                    <div className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin flex-shrink-0" />
                  ) : (
                    <AppleIcon />
                  )}
                  <span>Continue with Apple</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sign-in is optional — the app works fully offline without an account.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Profile ───────────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm font-semibold">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Auth avatar / initials — shown when signed in */}
          {user && (
            <div className="flex items-center gap-3 pb-1">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName ?? ""} className="h-12 w-12 rounded-full object-cover border border-border flex-shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
                  {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user.displayName ?? "Signed in"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          <div>
            <Label>Display Name</Label>
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
            <Save className="h-4 w-4" />Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* ── Appearance ────────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm font-semibold">Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark',  label: 'Dark',  icon: Moon },
              { value: 'system',label: 'System',icon: Monitor },
            ] as { value: Theme; label: string; icon: React.FC<{ className?: string }> }[]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Pomodoro ──────────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm font-semibold">Pomodoro Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Work (min)</Label><Input type="number" min={5} max={90} value={pomWork} onChange={e => setPomWork(Number(e.target.value))} data-testid="input-pom-work" /></div>
            <div><Label>Break (min)</Label><Input type="number" min={1} max={30} value={pomBreak} onChange={e => setPomBreak(Number(e.target.value))} data-testid="input-pom-break" /></div>
            <div><Label>Long Break</Label><Input type="number" min={5} max={60} value={pomLong} onChange={e => setPomLong(Number(e.target.value))} data-testid="input-pom-long" /></div>
          </div>
          <Button className="gap-2" onClick={savePomodoro} data-testid="button-save-pomodoro">
            <Save className="h-4 w-4" />Save Pomodoro Settings
          </Button>
        </CardContent>
      </Card>

      {/* ── Local Backup ──────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm font-semibold">Local Backup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            All data is stored locally in IndexedDB on this device. Export a JSON backup to restore anywhere.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={handleExport} data-testid="button-export">
              <Download className="h-4 w-4" />Export Backup
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} data-testid="button-import">
              <Upload className="h-4 w-4" />Import Backup
            </Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} data-testid="input-import-file" />
          </div>
        </CardContent>
      </Card>

      {/* ── Danger Zone ───────────────────────────────────────────────────────── */}
      <Card className="bg-card border-rose-500/30">
        <CardHeader><CardTitle className="text-sm font-semibold text-rose-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">Permanently deletes all tasks, sessions, flashcards, test results, and settings. Cannot be undone.</p>
          <Button variant="destructive" className="gap-2" onClick={() => setClearOpen(true)} data-testid="button-clear-all">
            <Trash2 className="h-4 w-4" />Clear All Data
          </Button>
        </CardContent>
      </Card>

      {/* Clear confirm dialog */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Clear All Data?</DialogTitle>
            </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently erase everything. Make sure you have a backup first.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll} data-testid="button-confirm-clear">Yes, Delete Everything</Button>
          </DialogFooter>
        </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Sign-out confirm dialog */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5" />Sign Out?</DialogTitle>
            </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You'll continue in local-only mode. Your data stays on this device and in the cloud — nothing is deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOutOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { await signOut(); setSignOutOpen(false); toast({ title: "Signed out" }); }}>Sign Out</Button>
          </DialogFooter>
        </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
