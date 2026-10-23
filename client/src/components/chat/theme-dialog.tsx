
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { KeyRound, Moon, Play, RefreshCw, Settings, ShieldCheck, Sun, Terminal } from "lucide-react";

interface ThemeDialogProps {
  onReplayTutorial: () => void;
}

interface AdminData {
  logs: string[];
  uptimeSeconds: number;
}

type SettingsView = "theme" | "access" | "admin";

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}m`].filter(Boolean).join(" ");
}

export default function ThemeDialog({ onReplayTutorial }: ThemeDialogProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<SettingsView>("theme");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [isAccessing, setIsAccessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const useDarkMode = savedTheme === "dark";
    document.documentElement.classList.toggle("dark", useDarkMode);
    setIsDarkMode(useDarkMode);
    if (!savedTheme) localStorage.setItem("theme", "light");
  }, []);

  useEffect(() => {
    if (!isOpen || view !== "admin" || !accessToken) return;

    const refresh = async () => {
      try {
        const response = await fetch("/api/admin/logs", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.status === 401) {
          setError("Admin access expired. Enter the password again.");
          setAccessToken("");
          setView("access");
          return;
        }
        if (!response.ok) throw new Error("Could not load admin status.");
        setAdminData(await response.json());
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load admin status.");
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 15000);
    return () => window.clearInterval(interval);
  }, [isOpen, view, accessToken]);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
    localStorage.setItem("theme", checked ? "dark" : "light");
  };

  const closeSettings = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (!nextOpen) {
      setView("theme");
      setPassword("");
      setAccessToken("");
      setAdminData(null);
      setError("");
    }
  };

  const accessAdminPanel = async () => {
    setIsAccessing(true);
    setError("");
    try {
      const response = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Access denied.");
      setAccessToken(result.token);
      setPassword("");
      setView("admin");
    } catch (accessError) {
      setError(accessError instanceof Error ? accessError.message : "Access denied.");
    } finally {
      setIsAccessing(false);
    }
  };

  const refreshAdmin = async () => {
    if (!accessToken) return;
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/logs", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Could not refresh app logs.");
      setAdminData(await response.json());
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh app logs.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const replayTutorial = () => {
    closeSettings(false);
    window.setTimeout(onReplayTutorial, 180);
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeSettings}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Settings"
          data-tour="theme-settings"
          data-testid="button-settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className={view === "admin" ? "w-[calc(100%-2rem)] max-w-3xl" : "sm:max-w-md"}>
        {view === "theme" && (
          <>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-2">
                {isDarkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                <Label htmlFor="theme-switch" className="text-sm font-medium">
                  {isDarkMode ? "Dark Mode" : "Light Mode"}
                </Label>
              </div>
              <Switch id="theme-switch" checked={isDarkMode} onCheckedChange={toggleTheme} data-testid="theme-switch" />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Admin panel</p>
                  <p className="text-xs text-muted-foreground">Protected app tools</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setView("access")}>
                <KeyRound className="mr-2 h-4 w-4" /> Access
              </Button>
            </div>
          </>
        )}

        {view === "access" && (
          <>
            <DialogHeader>
              <DialogTitle>Admin panel access</DialogTitle>
              <DialogDescription>Enter the admin password configured in Galaxy to continue.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(event) => { event.preventDefault(); void accessAdminPanel(); }} className="space-y-3">
              <Input
                autoFocus
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Admin password"
                aria-label="Admin password"
                data-testid="input-admin-password"
              />
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setView("theme"); setError(""); }}>
                  Back
                </Button>
                <Button type="submit" disabled={!password || isAccessing} data-testid="button-admin-access">
                  {isAccessing ? "Verifying..." : "Access"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {view === "admin" && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <div>
                  <DialogTitle>Admin panel</DialogTitle>
                  <DialogDescription className="mt-1">Read-only application status and recent server logs.</DialogDescription>
                </div>
                <span className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Read only
                </span>
              </div>
            </DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium">Server process running</span>
                <span className="text-muted-foreground">{adminData ? `Uptime ${formatUptime(adminData.uptimeSeconds)}` : "Checking status..."}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={replayTutorial}>
                  <Play className="mr-2 h-4 w-4" /> Replay tutorial
                </Button>
                <Button variant="ghost" size="icon" onClick={() => void refreshAdmin()} disabled={isRefreshing} title="Refresh logs" aria-label="Refresh logs">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4" /> Recent app logs
            </div>
            <pre className="max-h-[45vh] min-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed text-foreground">
              {adminData?.logs.length ? adminData.logs.join("\n") : "No application logs captured yet."}
            </pre>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
