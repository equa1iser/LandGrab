"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Building2, Key, TrendingUp, ShieldCheck, ShieldOff,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "@/lib/store/authStore";
import { api } from "@/lib/api-client";

// ---- Types ----

interface UserStats {
  total: number; active: number; verified: number;
  pro: number; admins: number; new_7d: number; new_30d: number;
}
interface PropertyStats { total_cached: number; sources: Record<string, number> }
interface ApiUsage {
  rentcast_calls_this_month: number;
  rentcast_monthly_quota: number;
  api_keys_configured: Record<string, boolean>;
}
interface Overview { users: UserStats; properties: PropertyStats; api_usage: ApiUsage }

interface AdminUser {
  id: string; email: string; full_name: string;
  tier: string; is_active: boolean; is_admin: boolean; is_verified: boolean;
  created_at: string; saved_properties_count: number; saved_searches_count: number;
  views_used: number;
}
interface UsersPage { items: AdminUser[]; total: number; page: number; pages: number }

// ---- Sub-components ----

function StatCard({
  icon: Icon, label, value, sub, accent = false,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; accent?: boolean;
}) {
  return (
    <div className={clsx(
      "hud-card p-5 space-y-3",
      accent && "border-accent-green/40",
    )}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-text-muted uppercase tracking-widest">{label}</span>
        <Icon className={clsx("w-4 h-4", accent ? "text-accent-green" : "text-text-muted/50")} />
      </div>
      <div className={clsx("font-display font-bold text-3xl", accent ? "text-accent-green" : "text-text-primary")}>
        {value}
      </div>
      {sub && <div className="font-mono text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

function ApiKeyRow({ name, active }: { name: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
      <span className="font-mono text-xs text-text-secondary uppercase tracking-wider">{name}</span>
      <div className={clsx("flex items-center gap-1.5 font-mono text-xs", active ? "text-accent-green" : "text-accent-red")}>
        {active
          ? <><CheckCircle2 className="w-3.5 h-3.5" /> configured</>
          : <><XCircle className="w-3.5 h-3.5" /> missing</>}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={clsx(
      "font-mono text-[10px] px-1.5 py-0.5 border uppercase tracking-wider",
      tier === "pro"
        ? "border-accent-amber/40 text-accent-amber bg-accent-amber/10"
        : "border-border-subtle text-text-muted",
    )}>
      {tier}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={clsx(
      "inline-block w-2 h-2 rounded-full",
      active ? "bg-accent-green" : "bg-accent-red/60",
    )} />
  );
}

// ---- Main page ----

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [usersPage, setUsersPage] = useState<UsersPage | null>(null);
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Guard: redirect non-admins (wait for isInitialized before checking)
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || (user && !user.is_admin))) {
      router.replace("/");
    }
  }, [isInitialized, isAuthenticated, user, router]);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadUsers = useCallback(async (p: number) => {
    setLoadingUsers(true);
    try {
      const data = await api.getAdminUsers(p, 20);
      setUsersPage(data);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialized && user?.is_admin) loadOverview();
  }, [isInitialized, user, loadOverview]);

  useEffect(() => {
    if (isInitialized && user?.is_admin) loadUsers(page);
  }, [isInitialized, user, page, loadUsers]);

  async function handleUpdate(userId: string, patch: { tier?: string; is_active?: boolean; is_admin?: boolean }) {
    setUpdatingId(userId);
    try {
      await api.updateAdminUser(userId, patch);
      await loadUsers(page);
      await loadOverview();
    } finally {
      setUpdatingId(null);
    }
  }

  if (!isInitialized || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="font-mono text-text-muted text-sm">Loading…</div>
      </div>
    );
  }

  const o = overview;
  const rentcastPct = o
    ? Math.round((o.api_usage.rentcast_calls_this_month / o.api_usage.rentcast_monthly_quota) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-bg-primary pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary tracking-wide">
              Admin Dashboard
            </h1>
            <p className="font-mono text-xs text-text-muted mt-1">
              Platform overview · logged in as {user.email}
            </p>
          </div>
          <button
            onClick={() => { loadOverview(); loadUsers(page); }}
            className="flex items-center gap-2 px-3 py-1.5 border border-border-subtle text-text-muted
              hover:border-accent-green/50 hover:text-accent-green transition-colors font-mono text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Overview stats */}
        {loadingOverview ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="hud-card p-5 h-28 animate-pulse bg-bg-tertiary/30" />
            ))}
          </div>
        ) : o && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={o.users.total}
                sub={`${o.users.active} active · ${o.users.pro} pro`} accent />
              <StatCard icon={TrendingUp} label="New (7d)" value={o.users.new_7d}
                sub={`${o.users.new_30d} last 30 days`} />
              <StatCard icon={Building2} label="Properties Cached" value={o.properties.total_cached}
                sub={Object.entries(o.properties.sources).map(([k, v]) => `${k}: ${v}`).join(" · ")} />
              <StatCard icon={Key} label="RentCast Usage" value={`${o.api_usage.rentcast_calls_this_month}/${o.api_usage.rentcast_monthly_quota}`}
                sub={`${rentcastPct}% of monthly quota`} />
            </div>

            {/* RentCast quota bar + API keys */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quota bar */}
              <div className="hud-card p-5 space-y-4">
                <div className="font-mono text-xs text-text-muted uppercase tracking-widest">
                  RentCast Monthly Quota
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-text-secondary">
                      {o.api_usage.rentcast_calls_this_month} calls used
                    </span>
                    <span className={clsx(
                      rentcastPct >= 80 ? "text-accent-red" :
                      rentcastPct >= 50 ? "text-accent-amber" : "text-accent-green"
                    )}>
                      {rentcastPct}%
                    </span>
                  </div>
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-700",
                        rentcastPct >= 80 ? "bg-accent-red" :
                        rentcastPct >= 50 ? "bg-accent-amber" : "bg-accent-green"
                      )}
                      style={{ width: `${Math.min(rentcastPct, 100)}%` }}
                    />
                  </div>
                  <div className="font-mono text-[10px] text-text-muted">
                    {o.api_usage.rentcast_monthly_quota - o.api_usage.rentcast_calls_this_month} calls remaining this month
                  </div>
                </div>
              </div>

              {/* API key status */}
              <div className="hud-card p-5">
                <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
                  API Key Status
                </div>
                <div>
                  {Object.entries(o.api_usage.api_keys_configured).map(([name, active]) => (
                    <ApiKeyRow key={name} name={name.replace(/_/g, " ")} active={active} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* User management */}
        <div className="hud-card">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <div className="font-mono text-xs text-text-muted uppercase tracking-widest">
              User Management
            </div>
            {usersPage && (
              <span className="font-mono text-xs text-text-muted">
                {usersPage.total} total
              </span>
            )}
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center font-mono text-xs text-text-muted">Loading users…</div>
          ) : usersPage && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {["Status", "Name", "Email", "Tier", "Saved", "Views (mo)", "Joined", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-mono text-[10px] text-text-muted uppercase tracking-widest">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usersPage.items.map((u) => (
                      <tr key={u.id} className="border-b border-border-subtle/50 hover:bg-bg-tertiary/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusDot active={u.is_active} />
                            {u.is_admin && (
                              <ShieldCheck className="w-3.5 h-3.5 text-accent-amber" aria-label="Admin" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text-primary">
                          {u.full_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text-muted">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <TierBadge tier={u.tier} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text-muted">
                          {u.saved_properties_count}p · {u.saved_searches_count}s
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {u.tier === "pro" ? (
                            <span className="text-accent-amber">∞</span>
                          ) : (
                            <span className={u.views_used >= 5 ? "text-accent-red" : "text-text-muted"}>
                              {u.views_used}/5
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-text-muted">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Toggle active */}
                            <button
                              disabled={updatingId === u.id}
                              onClick={() => handleUpdate(u.id, { is_active: !u.is_active })}
                              className={clsx(
                                "font-mono text-[10px] px-2 py-1 border transition-colors",
                                u.is_active
                                  ? "border-accent-red/40 text-accent-red hover:bg-accent-red/10"
                                  : "border-accent-green/40 text-accent-green hover:bg-accent-green/10"
                              )}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            {/* Toggle tier */}
                            <button
                              disabled={updatingId === u.id}
                              onClick={() => handleUpdate(u.id, { tier: u.tier === "pro" ? "free" : "pro" })}
                              className={clsx(
                                "font-mono text-[10px] px-2 py-1 border transition-colors",
                                u.tier === "pro"
                                  ? "border-border-subtle text-text-muted hover:border-accent-amber/40 hover:text-accent-amber"
                                  : "border-accent-amber/40 text-accent-amber hover:bg-accent-amber/10"
                              )}
                            >
                              {u.tier === "pro" ? "→ Free" : "→ Pro"}
                            </button>
                            {/* Toggle admin */}
                            <button
                              disabled={updatingId === u.id}
                              onClick={() => handleUpdate(u.id, { is_admin: !u.is_admin })}
                              className={clsx(
                                "font-mono text-[10px] px-2 py-1 border transition-colors",
                                u.is_admin
                                  ? "border-accent-amber/40 text-accent-amber hover:bg-accent-amber/10"
                                  : "border-border-subtle text-text-muted hover:border-accent-amber/40 hover:text-accent-amber"
                              )}
                              title={u.is_admin ? "Revoke admin" : "Grant admin"}
                            >
                              {u.is_admin ? <ShieldOff className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersPage.pages > 1 && (
                <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-between">
                  <span className="font-mono text-xs text-text-muted">
                    Page {usersPage.page} of {usersPage.pages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="p-1.5 border border-border-subtle text-text-muted hover:border-accent-green/40
                        hover:text-accent-green transition-colors disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={page >= usersPage.pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="p-1.5 border border-border-subtle text-text-muted hover:border-accent-green/40
                        hover:text-accent-green transition-colors disabled:opacity-30"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
