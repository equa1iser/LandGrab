"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { api } from "@/lib/api-client";
import { User, Mail, Shield, Bell, Save, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

type AlertMsg = { type: "success" | "error"; text: string };

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hud-card p-6">
      <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-5 pb-3 border-b border-border-subtle">
        {label}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border-subtle/50 last:border-0">
      <div>
        <div className="font-mono text-sm text-text-primary">{label}</div>
        <div className="font-mono text-xs text-text-muted mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${
          checked ? "bg-accent-green" : "bg-border-subtle"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function StatusBanner({ msg, onDismiss }: { msg: AlertMsg; onDismiss: () => void }) {
  const Icon = msg.type === "success" ? CheckCircle : AlertCircle;
  const color = msg.type === "success" ? "text-accent-green border-accent-green/30 bg-accent-green/5" : "text-accent-red border-accent-red/30 bg-accent-red/5";
  return (
    <div className={`flex items-center gap-3 border px-4 py-3 font-mono text-xs ${color}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{msg.text}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [prefs, setPrefs] = useState({
    notify_price_drops: true,
    notify_new_listings: true,
    alert_frequency: "daily",
    marketing_emails: false,
  });

  const [profileAlert, setProfileAlert] = useState<AlertMsg | null>(null);
  const [prefsAlert, setPrefsAlert] = useState<AlertMsg | null>(null);
  const [pwAlert, setPwAlert] = useState<AlertMsg | null>(null);
  const [saving, setSaving] = useState<"profile" | "prefs" | "pw" | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (user) {
      setFullName(user.full_name);
      if (user.preferences) {
        setPrefs((p) => ({ ...p, ...user.preferences }));
      }
    }
  }, [user, isAuthenticated]);

  async function saveProfile() {
    if (!fullName.trim()) return;
    setSaving("profile");
    setProfileAlert(null);
    try {
      const updated = await api.updateProfile({ full_name: fullName.trim() });
      updateUser(updated);
      setProfileAlert({ type: "success", text: "Profile updated." });
    } catch {
      setProfileAlert({ type: "error", text: "Failed to update profile." });
    } finally {
      setSaving(null);
    }
  }

  async function savePrefs() {
    setSaving("prefs");
    setPrefsAlert(null);
    try {
      const updated = await api.updatePreferences(prefs);
      updateUser(updated);
      setPrefsAlert({ type: "success", text: "Notification preferences saved." });
    } catch {
      setPrefsAlert({ type: "error", text: "Failed to save preferences." });
    } finally {
      setSaving(null);
    }
  }

  async function changePassword() {
    if (newPw !== confirmPw) {
      setPwAlert({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwAlert({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setSaving("pw");
    setPwAlert(null);
    try {
      await api.changePassword(currentPw, newPw);
      setPwAlert({ type: "success", text: "Password changed successfully." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Failed to change password.";
      setPwAlert({ type: "error", text: detail });
    } finally {
      setSaving(null);
    }
  }

  if (!user) return null;

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : null;

  return (
    <div className="min-h-screen bg-bg-primary pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-full bg-accent-green/10 border border-accent-green/30 flex items-center justify-center">
            <span className="font-display font-bold text-2xl text-accent-green">
              {user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{user.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-text-muted">{user.email}</span>
              <span className="font-mono text-xs px-1.5 py-0.5 border border-accent-cyan/40 text-accent-cyan uppercase tracking-wider">
                {user.tier}
              </span>
              {joinedDate && (
                <span className="font-mono text-xs text-text-muted">· Member since {joinedDate}</span>
              )}
            </div>
          </div>
        </div>

        {/* Account */}
        <Section label="Account">
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:border-accent-green/60 transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-2 bg-bg-elevated border border-border-subtle px-3 py-2">
                <Mail className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                <span className="font-mono text-sm text-text-muted">{user.email}</span>
                <span className="ml-auto font-mono text-xs text-text-muted">read-only</span>
              </div>
            </div>
            {profileAlert && (
              <StatusBanner msg={profileAlert} onDismiss={() => setProfileAlert(null)} />
            )}
            <button
              onClick={saveProfile}
              disabled={saving === "profile"}
              className="flex items-center gap-2 px-5 py-2 bg-accent-green/10 border border-accent-green/40 text-accent-green font-mono text-xs uppercase tracking-wider hover:bg-accent-green/20 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving === "profile" ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Section>

        {/* Notifications */}
        <Section label="Email Notifications">
          <div className="space-y-0">
            <Toggle
              label="Price Drop Alerts"
              description="Get notified when a saved property's price decreases."
              checked={prefs.notify_price_drops}
              onChange={(v) => setPrefs((p) => ({ ...p, notify_price_drops: v }))}
            />
            <Toggle
              label="New Listing Alerts"
              description="Get notified when new properties match your saved searches."
              checked={prefs.notify_new_listings}
              onChange={(v) => setPrefs((p) => ({ ...p, notify_new_listings: v }))}
            />
            <Toggle
              label="Marketing Emails"
              description="Occasional updates about new LandGrab features."
              checked={prefs.marketing_emails}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing_emails: v }))}
            />
          </div>

          <div className="mt-5">
            <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
              Alert Frequency
            </label>
            <div className="flex gap-2">
              {(["immediate", "daily", "weekly"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setPrefs((p) => ({ ...p, alert_frequency: freq }))}
                  className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider border transition-colors ${
                    prefs.alert_frequency === freq
                      ? "border-accent-green text-accent-green bg-accent-green/10"
                      : "border-border-subtle text-text-muted hover:border-accent-green/40 hover:text-text-secondary"
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {prefsAlert && (
            <div className="mt-4">
              <StatusBanner msg={prefsAlert} onDismiss={() => setPrefsAlert(null)} />
            </div>
          )}
          <button
            onClick={savePrefs}
            disabled={saving === "prefs"}
            className="mt-4 flex items-center gap-2 px-5 py-2 bg-accent-green/10 border border-accent-green/40 text-accent-green font-mono text-xs uppercase tracking-wider hover:bg-accent-green/20 transition-colors disabled:opacity-50"
          >
            <Bell className="w-3.5 h-3.5" />
            {saving === "prefs" ? "Saving..." : "Save Preferences"}
          </button>
        </Section>

        {/* Security */}
        <Section label="Security">
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg-elevated border border-border-subtle px-3 py-2 pr-10 font-mono text-sm text-text-primary focus:outline-none focus:border-accent-green/60 transition-colors placeholder:text-text-muted/40"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-bg-elevated border border-border-subtle px-3 py-2 pr-10 font-mono text-sm text-text-primary focus:outline-none focus:border-accent-green/60 transition-colors placeholder:text-text-muted/40"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-bg-elevated border border-border-subtle px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:border-accent-green/60 transition-colors placeholder:text-text-muted/40"
              />
            </div>
            {pwAlert && (
              <StatusBanner msg={pwAlert} onDismiss={() => setPwAlert(null)} />
            )}
            <button
              onClick={changePassword}
              disabled={saving === "pw" || !currentPw || !newPw || !confirmPw}
              className="flex items-center gap-2 px-5 py-2 bg-accent-green/10 border border-accent-green/40 text-accent-green font-mono text-xs uppercase tracking-wider hover:bg-accent-green/20 transition-colors disabled:opacity-50"
            >
              <Shield className="w-3.5 h-3.5" />
              {saving === "pw" ? "Updating..." : "Update Password"}
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
