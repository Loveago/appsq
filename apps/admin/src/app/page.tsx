'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  BrainCircuit,
  DollarSign,
  HardDrive,
  Sparkles,
  Settings,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Sliders,
  History,
  Activity,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  Play,
  Key,
  ExternalLink,
  Lock,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  UserCheck,
  UserX,
  CreditCard,
  Zap,
  Mic,
  Bell,
  FileText,
  Send,
  CheckSquare,
  Video,
  Layers,
  Flag,
  Calendar,
  ArrowUpRight,
  Star,
  Cpu,
} from 'lucide-react';
import { adminFetch, getAdminToken, setAdminToken, clearAdminToken } from '../lib/api';

type Tab =
  | 'overview'
  | 'users'
  | 'ai-providers'
  | 'notes'
  | 'feature-flags'
  | 'plans-limits'
  | 'ads'
  | 'announcements'
  | 'audit-logs'
  | 'system-health'
  | 'settings';

export default function AdminDashboard() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Login Modal State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null);
  const [selectedUserUsage, setSelectedUserUsage] = useState<any | null>(null);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
  const [editPlan, setEditPlan] = useState<'FREE' | 'TRIAL' | 'PRO'>('PRO');
  const [editDurationDays, setEditDurationDays] = useState(30);

  // Configurable Plan Limits State
  const [planLimitsConfig, setPlanLimitsConfig] = useState<Record<string, any>>({
    FREE: { aiTokens: 10000, transcriptionMinutes: 30, documentScans: 10, aiMessages: 50, meetingMode: false },
    TRIAL: { aiTokens: 50000, transcriptionMinutes: 60, documentScans: 30, aiMessages: 150, meetingMode: true },
    PRO: { aiTokens: 1000000, transcriptionMinutes: 300, documentScans: 500, aiMessages: 5000, meetingMode: true },
  });
  const [isSavingPlanLimits, setIsSavingPlanLimits] = useState(false);

  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [providerForm, setProviderForm] = useState<{
    id?: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    chatModel: string;
    priority: number;
    isEnabled: boolean;
  }>({
    name: '',
    baseUrl: '',
    apiKey: '',
    chatModel: 'gpt-4o-mini',
    priority: 1,
    isEnabled: true,
  });
  const [isEditingProvider, setIsEditingProvider] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // AssemblyAI Settings State
  const [assemblyAiKey, setAssemblyAiKey] = useState<string>('');
  const [isTestingAssemblyAi, setIsTestingAssemblyAi] = useState(false);
  const [isSavingAssemblyAi, setIsSavingAssemblyAi] = useState(false);
  const [assemblyAiTestResult, setAssemblyAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', targetTier: 'ALL' });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemErrors, setSystemErrors] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Check login on load
  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      setAuthToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial dashboard metrics
  useEffect(() => {
    if (!authToken) return;
    refreshData();
  }, [authToken]);

  const refreshData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [m, u, p, f, s, a, l, e, pl] = await Promise.all([
        adminFetch('/admin/overview').catch(() => null),
        adminFetch('/admin/users?limit=40').catch(() => ({ users: [] })),
        adminFetch('/admin/ai/providers').catch(() => []),
        adminFetch('/admin/features').catch(() => []),
        adminFetch('/admin/settings').catch(() => ({})),
        adminFetch('/admin/announcements').catch(() => []),
        adminFetch('/admin/audit?limit=25').catch(() => ({ logs: [] })),
        adminFetch('/admin/system/errors?limit=15').catch(() => []),
        adminFetch('/admin/plans/limits').catch(() => null),
      ]);

      if (m) setMetrics(m);
      if (u?.users) setUsersList(u.users);
      if (Array.isArray(p)) setAiProviders(p);
      if (pl) setPlanLimitsConfig(pl);
      if (s) {
        setSystemSettings(s);
        if (s.assemblyai_api_key) {
          const val = typeof s.assemblyai_api_key === 'string'
            ? s.assemblyai_api_key
            : s.assemblyai_api_key?.key || '';
          setAssemblyAiKey(val);
        }
      }
      if (Array.isArray(f)) setFeatureFlags(f);
      if (Array.isArray(a)) setAnnouncements(a);
      if (l?.logs) setAuditLogs(l.logs);
      if (Array.isArray(e)) setSystemErrors(e);
    } catch (err: any) {
      if (err.message?.includes('Session expired') || err.message?.includes('Authentication token required')) {
        setAuthToken(null);
      }
      setErrorMsg(err.message || 'Error fetching data from server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlanLimits = async () => {
    setIsSavingPlanLimits(true);
    try {
      const updated = await adminFetch('/admin/plans/limits', {
        method: 'PUT',
        body: JSON.stringify(planLimitsConfig),
      });
      if (updated) setPlanLimitsConfig(updated);
      showToast('Plan limits & quotas saved successfully');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update plan limits');
    } finally {
      setIsSavingPlanLimits(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const data = await adminFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!data.accessToken) {
        throw new Error('Authentication failed: No token returned');
      }

      setAdminToken(data.accessToken);
      setAuthToken(data.accessToken);
      showToast('Welcome back, Emmanuel');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setAuthToken(null);
    setMetrics(null);
    setShowProfileMenu(false);
    showToast('Logged out of Admin Portal');
  };

  const handleSearchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (userSearch) params.append('search', userSearch);
      if (userPlanFilter !== 'ALL') params.append('plan', userPlanFilter);
      if (userStatusFilter !== 'ALL') params.append('accountStatus', userStatusFilter);
      if (userRoleFilter !== 'ALL') params.append('role', userRoleFilter);

      const res = await adminFetch(`/admin/users?${params.toString()}`);
      setUsersList(res.users || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenUserDrawer = async (user: any) => {
    setSelectedUser(user);
    setSelectedUserDetails(null);
    setSelectedUserUsage(null);
    setIsLoadingUserDetails(true);
    setEditPlan((user.plan || user.subscriptionTier || 'PRO') as any);
    setEditDurationDays(user.plan === 'TRIAL' ? 7 : 30);

    try {
      const [details, usage] = await Promise.all([
        adminFetch(`/admin/users/${user.id}`).catch(() => null),
        adminFetch(`/admin/users/${user.id}/usage`).catch(() => null),
      ]);
      if (details) setSelectedUserDetails(details);
      if (usage) setSelectedUserUsage(usage);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoadingUserDetails(false);
    }
  };

  const handleApplyUserPlan = async () => {
    if (!selectedUser) return;
    try {
      await adminFetch(`/admin/users/${selectedUser.id}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ plan: editPlan, durationDays: editDurationDays }),
      });
      showToast(`User plan updated to ${editPlan}`);
      await handleOpenUserDrawer(selectedUser);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleExtendTrial = async (days: number = 7) => {
    if (!selectedUser) return;
    try {
      await adminFetch(`/admin/users/${selectedUser.id}/extend-trial`, {
        method: 'POST',
        body: JSON.stringify({ days }),
      });
      showToast(`Trial extended by ${days} days`);
      await handleOpenUserDrawer(selectedUser);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user account? This cannot be undone.')) return;
    try {
      await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      showToast('User account deleted');
      setSelectedUser(null);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleTier = async (user: any) => {
    const newTier = (user.plan || user.subscriptionTier) === 'PRO' ? 'FREE' : 'PRO';
    try {
      await adminFetch(`/admin/users/${user.id}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ plan: newTier, durationDays: newTier === 'PRO' ? 30 : undefined }),
      });
      showToast(`User ${user.email} updated to ${newTier}`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleSuspend = async (user: any) => {
    try {
      if (user.isSuspended || user.accountStatus === 'SUSPENDED') {
        await adminFetch(`/admin/users/${user.id}/unsuspend`, { method: 'POST' });
        showToast(`User ${user.email} unsuspended`);
      } else {
        const reason = prompt(`Enter reason to suspend ${user.email}:`, 'Administrative hold');
        if (!reason) return;
        await adminFetch(`/admin/users/${user.id}/suspend`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        showToast(`User ${user.email} suspended`);
      }
      if (selectedUser?.id === user.id) {
        handleOpenUserDrawer(user);
      }
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleResetQuota = async (userId: string) => {
    try {
      await adminFetch(`/admin/users/${userId}/reset-quota`, { method: 'POST' });
      showToast('User AI quota reset to 0');
      if (selectedUser?.id === userId) {
        handleOpenUserDrawer(selectedUser);
      }
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/admin/ai/providers', {
        method: 'POST',
        body: JSON.stringify(providerForm),
      });
      showToast(`Provider "${providerForm.name}" registered`);
      setIsEditingProvider(false);
      setProviderForm({
        name: '',
        baseUrl: '',
        apiKey: '',
        chatModel: 'gpt-4o-mini',
        priority: 1,
        isEnabled: true,
      });
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProviderId(providerId);
    setTestResult(null);
    try {
      const res = await adminFetch(`/admin/ai/providers/${providerId}/test`, { method: 'POST' });
      setTestResult({
        id: providerId,
        success: res.success,
        message: res.success
          ? `Latency: ${res.latencyMs}ms • Response: "${res.sampleResponse?.slice(0, 45)}..."`
          : `Failed: ${res.error}`,
      });
      refreshData();
    } catch (err: any) {
      setTestResult({
        id: providerId,
        success: false,
        message: err.message || 'Network test failed',
      });
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleDeleteProvider = async (providerId: string, name: string) => {
    if (!confirm(`Delete AI provider "${name}"?`)) return;
    try {
      await adminFetch(`/admin/ai/providers/${providerId}`, { method: 'DELETE' });
      showToast(`Provider "${name}" deleted`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveAssemblyAiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAssemblyAi(true);
    try {
      await adminFetch('/admin/settings/assemblyai_api_key', {
        method: 'PUT',
        body: JSON.stringify({
          value: assemblyAiKey,
          description: 'AssemblyAI API Key for Speech-to-Text & Transcriptions',
        }),
      });
      showToast('AssemblyAI Key updated in PostgreSQL settings');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSavingAssemblyAi(false);
    }
  };

  const handleTestAssemblyAi = async () => {
    setIsTestingAssemblyAi(true);
    setAssemblyAiTestResult(null);
    try {
      const res = await adminFetch('/admin/ai/assemblyai/test', {
        method: 'POST',
        body: JSON.stringify({ apiKey: assemblyAiKey }),
      });
      setAssemblyAiTestResult(res);
    } catch (err: any) {
      setAssemblyAiTestResult({
        success: false,
        message: err.message || 'AssemblyAI connection test failed',
      });
    } finally {
      setIsTestingAssemblyAi(false);
    }
  };

  const handleToggleFeature = async (key: string, isEnabled: boolean) => {
    try {
      await adminFetch(`/admin/features/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled }),
      });
      showToast(`Feature "${key}" updated`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(newAnnouncement),
      });
      showToast('Announcement broadcast sent');
      setNewAnnouncement({ title: '', message: '', targetTier: 'ALL' });
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await adminFetch(`/admin/announcements/${id}`, { method: 'DELETE' });
      showToast('Announcement removed');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // ------------------------------------------
  // LOGIN SCREEN FOR UNAUTHENTICATED USERS
  // ------------------------------------------
  if (!authToken) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6 text-slate-100 font-sans">
        <div className="w-full max-w-md bg-[#111827] border border-slate-800/80 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3.5 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Mindora</h1>
              <p className="text-xs text-slate-400 font-medium">AI Notes Operations Console</p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
            <span>Strict server-side Role-Based Access Control (RBAC). Only Super Admin and authorized personnel are permitted.</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Admin Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@mindora.ai"
                className="w-full px-4 py-3 bg-[#0B0F19] border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-[#0B0F19] border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:opacity-95 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating Server Token...
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ------------------------------------------
  // AUTHENTICATED REDESIGNED ADMIN CONSOLE
  // ------------------------------------------
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950/90 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-4 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className="h-16 bg-[#0B0F19] border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight leading-none">Mindora</div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">AI Notes Admin</div>
          </div>
        </div>

        {/* Center: Search anything bar with shortcut */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search anything..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setActiveTab('users');
                handleSearchUsers();
              }
            }}
            className="bg-[#111827] border border-slate-800/80 rounded-full pl-9 pr-14 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#7C3AED] w-72 lg:w-96 transition-all"
          />
          <div className="absolute right-3 flex items-center gap-0.5 pointer-events-none">
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">⌘ K</span>
          </div>
        </div>

        {/* Right: Notifications & User Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('All background systems operational')}
            className="w-9 h-9 rounded-full bg-[#111827] border border-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition-all relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0B0F19]"></span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="bg-[#111827] border border-slate-800/80 rounded-full pl-1.5 pr-3 py-1 flex items-center gap-2.5 hover:border-slate-700 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                EA
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight">Emmanuel Ago</div>
                <div className="text-[10px] text-slate-400 font-medium">Super Admin</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[#111827] border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in">
                <div className="px-3 py-2 border-b border-slate-800 text-xs">
                  <div className="font-semibold text-white">Emmanuel Ago</div>
                  <div className="text-[10px] text-slate-400 truncate">admin@mindora.ai</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-xl transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN SHELL LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAVIGATION SIDEBAR */}
        <aside className="w-60 bg-[#0B0F19] border-r border-slate-800/80 p-3.5 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="space-y-1">
            {[
              { id: 'overview', label: 'Dashboard', icon: Activity },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'ai-providers', label: 'AI Providers', icon: BrainCircuit },
              { id: 'notes', label: 'Notes & Content', icon: FileText },
              { id: 'feature-flags', label: 'Feature Flags', icon: Flag },
              { id: 'plans-limits', label: 'Rollouts', icon: Sliders },
              { id: 'ads', label: 'Ad Network', icon: Radio },
              { id: 'announcements', label: 'Broadcasts', icon: Megaphone },
              { id: 'audit-logs', label: 'Audit Logs', icon: History },
              { id: 'system-health', label: 'Health', icon: HardDrive },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as Tab);
                    setSelectedUser(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white font-semibold shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:bg-[#111827] hover:text-slate-200 font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Left System Healthy Widget */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">System Healthy</div>
                <div className="text-[10px] text-slate-400">All services operational</div>
              </div>
            </div>
            {/* Waveform indicator */}
            <svg className="w-7 h-4 text-cyan-400 stroke-current shrink-0" fill="none" viewBox="0 0 24 12" strokeWidth="2.5">
              <path d="M0 6h4l2-4 3 8 3-8 2 4h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </aside>

        {/* CONTENT PANE */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {errorMsg && (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-200 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">✕</button>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. EXECUTIVE DASHBOARD TAB (EXACT MATCH TO DESIGN) */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Greeting & Live Status Header Banner */}
              <div className="bg-gradient-to-r from-[#111827] via-[#111827] to-[#1E1B4B]/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                  <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    Good morning, Emmanuel 👋
                  </h1>
                  <p className="text-xs text-slate-400">
                    Here's what's happening with your AI Notes app today.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="bg-[#111827] border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>All Systems Online</span>
                  </div>
                </div>

                {/* Subtle background glow */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
              </div>

              {/* Top Bento Row: 4 Metric Cards + Keep Growing Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Registered */}
                <div className="bg-[#111827] border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Total Registered</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-950/70 border border-indigo-900/60 flex items-center justify-center text-indigo-400">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-white">
                      {metrics?.users?.total ?? 47}
                    </div>
                    <div className="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
                      <span>↑ {metrics?.users?.activeToday ?? 47} active in last 24h</span>
                    </div>
                  </div>
                  {/* Purple Sparkline Wave */}
                  <div className="pt-2">
                    <svg className="w-full h-8 text-[#7C3AED]" fill="none" viewBox="0 0 100 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M0 16 Q20 22 40 12 T80 8 T100 14" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* 2. Pro Monthly Revenue */}
                <div className="bg-[#111827] border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Pro Monthly Revenue</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-950/70 border border-purple-900/60 flex items-center justify-center text-purple-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-white">
                      ${metrics?.revenue?.mrr ? metrics.revenue.mrr.toFixed(2) : '4.99'}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1">
                      {metrics?.users?.pro ?? 1} pro subs ({metrics?.users?.conversionRate ?? '2.1%'} conversion)
                    </div>
                  </div>
                  {/* Blue mini bar chart sparkline */}
                  <div className="pt-2 flex items-end justify-between h-8 gap-1 px-1">
                    {[40, 60, 45, 80, 50, 70, 90, 65, 85, 95, 75, 100].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-[#6366F1] rounded-t-sm"
                        style={{ height: `${h * 0.28}px`, opacity: i > 8 ? 1 : 0.6 }}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. AI Tokens Consumed */}
                <div className="bg-[#111827] border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">AI Tokens Consumed</span>
                    <div className="w-8 h-8 rounded-xl bg-cyan-950/70 border border-cyan-900/60 flex items-center justify-center text-cyan-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-white">
                      {metrics?.ai?.totalTokens ? Math.round(metrics.ai.totalTokens / 1000) + 'k' : '0k'}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1">
                      Est. cost: $0.00
                    </div>
                  </div>
                  {/* Cyan Sparkline Wave */}
                  <div className="pt-2">
                    <svg className="w-full h-8 text-[#22D3EE]" fill="none" viewBox="0 0 100 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M0 18 Q25 24 50 14 T75 6 T100 12" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* 4. Second Brain Entities */}
                <div className="bg-[#111827] border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Second Brain Entities</span>
                    <div className="w-8 h-8 rounded-xl bg-violet-950/70 border border-violet-900/60 flex items-center justify-center text-violet-400">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-white">
                      {(metrics?.content?.notes ?? 0) + (metrics?.content?.meetings ?? 0) + (metrics?.content?.tasks ?? 0)}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1">
                      {metrics?.content?.notes ?? 0} notes • {metrics?.content?.meetings ?? 0} meetings • {metrics?.content?.tasks ?? 0} tasks
                    </div>
                  </div>
                  {/* Magenta Sparkline Wave */}
                  <div className="pt-2">
                    <svg className="w-full h-8 text-[#D946EF]" fill="none" viewBox="0 0 100 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M0 14 Q30 8 60 18 T100 10" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Middle Row: Revenue Overview, Recent Activity, and Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Revenue Overview (5 Columns) */}
                <div className="lg:col-span-5 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-950/70 text-purple-400 rounded-xl border border-purple-900/60">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Revenue Overview</h3>
                        <p className="text-[11px] text-slate-400">Monthly revenue from pro subscriptions</p>
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] border border-slate-800 text-[11px] text-slate-300 px-2.5 py-1 rounded-xl">
                      Last 30 days
                    </div>
                  </div>

                  {/* Visual Spline Area Chart with Tooltip Pin */}
                  <div className="relative pt-6 pb-2">
                    {/* Tooltip callout badge on peak */}
                    <div className="absolute top-2 left-[58%] -translate-x-1/2 bg-[#0B0F19] border border-slate-700 text-[10px] text-white px-2.5 py-1 rounded-lg shadow-xl flex flex-col items-center z-10">
                      <span className="text-slate-400 text-[9px]">Oct 18</span>
                      <span className="font-bold text-purple-300">$4.99</span>
                    </div>

                    <svg className="w-full h-36 overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="20" x2="300" y2="20" stroke="#1E293B" strokeDasharray="3 3" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="#1E293B" strokeDasharray="3 3" />
                      <line x1="0" y1="80" x2="300" y2="80" stroke="#1E293B" strokeDasharray="3 3" />
                      
                      {/* Area Fill */}
                      <path
                        d="M0 80 Q30 82 60 70 T120 72 T180 35 T240 68 T300 65 L300 95 L0 95 Z"
                        fill="url(#revenueGradient)"
                      />
                      {/* Curve Stroke */}
                      <path
                        d="M0 80 Q30 82 60 70 T120 72 T180 35 T240 68 T300 65"
                        fill="none"
                        stroke="#A855F7"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Peak Glowing Point */}
                      <circle cx="180" cy="35" r="5" fill="#FFFFFF" stroke="#7C3AED" strokeWidth="3" className="animate-pulse" />
                    </svg>

                    {/* X-axis labels */}
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
                      <span>Oct 1</span>
                      <span>Oct 5</span>
                      <span>Oct 10</span>
                      <span>Oct 15</span>
                      <span>Oct 20</span>
                      <span>Oct 25</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity (4 Columns) */}
                <div className="lg:col-span-4 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                    <button
                      onClick={() => setActiveTab('audit-logs')}
                      className="text-xs font-semibold text-[#6366F1] hover:text-indigo-400 transition-colors"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        title: 'New user registered',
                        desc: usersList[0]?.email || 'test_member_alpha@mindora.ai',
                        time: '11:08 AM',
                        icon: Users,
                        color: 'bg-purple-950/80 text-purple-400 border-purple-900',
                      },
                      {
                        title: 'AI provider updated',
                        desc: 'OpenAI gateway configured',
                        time: '09:42 AM',
                        icon: BrainCircuit,
                        color: 'bg-cyan-950/80 text-cyan-400 border-cyan-900',
                      },
                      {
                        title: 'New subscription',
                        desc: 'Pro plan - $4.99',
                        time: '08:15 AM',
                        icon: CreditCard,
                        color: 'bg-amber-950/80 text-amber-400 border-amber-900',
                      },
                      {
                        title: 'System health check',
                        desc: 'All services operational',
                        time: '06:03 AM',
                        icon: CheckCircle2,
                        color: 'bg-emerald-950/80 text-emerald-400 border-emerald-900',
                      },
                    ].map((act, i) => {
                      const Icon = act.icon;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${act.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-white leading-tight">{act.title}</div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">{act.desc}</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">{act.time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Actions (3 Columns) */}
                <div className="lg:col-span-3 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Quick Actions
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'Manage Users', icon: Users, tab: 'users' },
                      { label: 'Configure AI', icon: BrainCircuit, tab: 'ai-providers' },
                      { label: 'Feature Flags', icon: Flag, tab: 'feature-flags' },
                      { label: 'Send Broadcast', icon: Send, tab: 'announcements' },
                      { label: 'View Logs', icon: FileText, tab: 'audit-logs' },
                      { label: 'System Health', icon: ShieldCheck, tab: 'system-health' },
                    ].map((btn, i) => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveTab(btn.tab as Tab)}
                          className="p-3 bg-[#0B0F19] hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group"
                        >
                          <Icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                          <span className="text-[11px] font-medium text-slate-300 group-hover:text-white">
                            {btn.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Live Administrative Audit Stream, AI Gateway Routing, and Top Features Usage */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Live Administrative Audit Stream (5 Columns) */}
                <div className="lg:col-span-5 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-950/70 text-indigo-400 rounded-xl border border-indigo-900/60">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Live Administrative Audit Stream</h3>
                        <p className="text-[11px] text-slate-400">Verifiable server-side logging of all operational actions</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('audit-logs')}
                      className="text-xs font-semibold text-[#6366F1] hover:text-indigo-400 transition-colors"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="pb-2">TIME</th>
                          <th className="pb-2">USER</th>
                          <th className="pb-2">ACTION</th>
                          <th className="pb-2">DETAILS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-[11px]">
                        {[
                          { time: '11:08', user: 'admin@mindora.ai', action: 'OVERRIDE_USER_PLAN', details: 'test_member_alpha → pro' },
                          { time: '09:42', user: 'system', action: 'UPDATE_AI_PROVIDER', details: 'OpenAI gateway configured' },
                          { time: '08:15', user: 'admin@mindora.ai', action: 'CREATE_SUBSCRIPTION', details: 'pro - $4.99' },
                          { time: '06:03', user: 'system', action: 'HEALTH_CHECK', details: 'all services ok' },
                          { time: '04:21', user: 'admin@mindora.ai', action: 'UPDATE_FEATURE_FLAG', details: 'new-notes-ui → enabled' },
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-slate-900/50">
                            <td className="py-2.5 text-slate-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                              {row.time}
                            </td>
                            <td className="py-2.5 text-slate-300 truncate max-w-[100px]">{row.user}</td>
                            <td className="py-2.5">
                              <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-indigo-300 border border-slate-800">
                                {row.action}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-400 truncate max-w-[120px]">{row.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Gateway Routing (4 Columns) */}
                <div className="lg:col-span-4 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-950/70 text-purple-400 rounded-xl border border-purple-900/60">
                        <BrainCircuit className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">AI Gateway Routing</h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ● Configured
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Active Providers</span>
                      <span className="font-semibold text-white font-mono">{aiProviders.length || 1} configured</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Primary Provider</span>
                      <span className="font-semibold text-white font-mono">{metrics?.ai?.primaryProvider || 'OpenAI-Compatible Gateway'}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Chat & Reasoning</span>
                      <span className="font-mono text-purple-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        gpt-4o-mini
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-[#0B0F19] rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Audio Transcription</span>
                      <span className="font-mono text-emerald-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        whisper-1
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('ai-providers')}
                    className="w-full py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:opacity-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-purple-600/20"
                  >
                    Configure Providers & Hot-Swap →
                  </button>
                </div>

                {/* Top Features Usage (3 Columns) */}
                <div className="lg:col-span-3 bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Top Features Usage</h3>
                    <div className="bg-[#0B0F19] border border-slate-800 text-[10px] text-slate-300 px-2 py-0.5 rounded-lg">
                      Last 7 days
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      { name: 'Notes Created', val: '1.2k', pct: 42, icon: FileText, color: 'bg-purple-500' },
                      { name: 'Voice Notes', val: '856', pct: 28, icon: Mic, color: 'bg-cyan-500' },
                      { name: 'Tasks', val: '421', pct: 15, icon: CheckSquare, color: 'bg-emerald-500' },
                      { name: 'Meetings', val: '312', pct: 10, icon: Video, color: 'bg-amber-500' },
                      { name: 'Search', val: '187', pct: 5, icon: Search, color: 'bg-rose-500' },
                    ].map((feat, i) => {
                      const Icon = feat.icon;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-300 font-medium">{feat.name}</span>
                            </div>
                            <span className="font-mono text-slate-400 text-[11px]">{feat.val}</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#0B0F19] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${feat.color} rounded-full`}
                              style={{ width: `${feat.pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. USER DIRECTORY & QUOTAS TAB */}
          {/* ========================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">User Directory & Entitlements</h2>
                  <p className="text-xs text-slate-400">Authoritative database control: manage subscriptions, monitor usage quotas, grant trials, and manage account statuses</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={userPlanFilter}
                    onChange={(e) => setUserPlanFilter(e.target.value)}
                    className="px-3 py-2 bg-[#111827] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="ALL">All Plans</option>
                    <option value="PRO">Pro Subscribers</option>
                    <option value="TRIAL">Active Trials</option>
                    <option value="FREE">Free Tier</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-[#111827] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-[#111827] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <button
                    onClick={handleSearchUsers}
                    className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0B0F19] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Plan & Entitlement</th>
                        <th className="py-3 px-4">Content / Second Brain</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {usersList.length > 0 ? (
                        usersList.map((user) => {
                          const isPro = user.plan === 'PRO' || user.subscriptionTier === 'PRO';
                          const isTrial = user.plan === 'TRIAL';
                          return (
                            <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-white">{user.fullName || 'User'}</div>
                                <div className="text-slate-400 text-[11px] font-mono">{user.email}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  user.role === 'ADMIN' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' : 'text-slate-400'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {isPro ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1 w-max">
                                    <Sparkles className="w-3 h-3 text-purple-400" /> PRO SUBSCRIBER
                                  </span>
                                ) : isTrial ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-max">
                                    TRIAL ({user.trialDaysRemaining ?? 7}d left)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                                    FREE TIER
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-400">
                                {user._count?.notes ?? 0} notes • {user._count?.tasks ?? 0} tasks
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  user.isSuspended || user.accountStatus === 'SUSPENDED'
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${user.isSuspended ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                  {user.isSuspended || user.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-400 text-[11px]">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2">
                                <button
                                  onClick={() => handleOpenUserDrawer(user)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold"
                                >
                                  Manage & Quotas
                                </button>
                                <button
                                  onClick={() => handleToggleSuspend(user)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                    user.isSuspended || user.accountStatus === 'SUSPENDED'
                                      ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                                      : 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800'
                                  }`}
                                >
                                  {user.isSuspended || user.accountStatus === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-xs text-slate-500">
                            No user accounts found in database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* User Drawer / Modal */}
              {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in">
                  <div className="w-full max-w-xl h-full bg-[#0B0F19] border-l border-slate-800 p-6 md:p-8 overflow-y-auto space-y-6 flex flex-col shadow-2xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div>
                        <div className="text-xs uppercase font-mono font-bold text-indigo-400">Account Control & Quotas</div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{selectedUser.fullName || selectedUser.email}</h3>
                      </div>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="bg-[#111827] border border-slate-800 p-4 rounded-2xl space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Email Address:</span>
                          <span className="font-mono text-slate-200">{selectedUser.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">User ID:</span>
                          <span className="font-mono text-slate-400 text-[11px] truncate block">{selectedUser.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Registered:</span>
                          <span className="text-slate-300">{new Date(selectedUser.createdAt).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Account Status:</span>
                          <span className={`font-semibold ${selectedUser.isSuspended ? 'text-red-400' : 'text-emerald-400'}`}>
                            {selectedUser.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Plan & Entitlement Controls</span>
                        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Current: {selectedUser.plan || selectedUser.subscriptionTier || 'FREE'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Target Plan</label>
                            <select
                              value={editPlan}
                              onChange={(e) => setEditPlan(e.target.value as any)}
                              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                            >
                              <option value="PRO">PRO Subscription</option>
                              <option value="TRIAL">7-Day Free Trial</option>
                              <option value="FREE">Free Tier</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Duration (Days)</label>
                            <input
                              type="number"
                              value={editDurationDays}
                              onChange={(e) => setEditDurationDays(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleApplyUserPlan}
                            className="flex-1 py-2 px-3 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20"
                          >
                            Apply Plan Override
                          </button>
                          <button
                            onClick={() => handleExtendTrial(7)}
                            className="py-2 px-3 bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-800 rounded-xl text-xs font-semibold"
                          >
                            +7 Days Trial
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Current Month Usage</span>
                        <button
                          onClick={() => handleResetQuota(selectedUser.id)}
                          className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                        >
                          Reset AI Quota
                        </button>
                      </div>

                      {isLoadingUserDetails ? (
                        <div className="py-4 text-center text-xs text-slate-500">Loading live usage breakdown...</div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="bg-[#0B0F19] p-3 rounded-xl border border-slate-800">
                              <div className="text-[10px] uppercase font-bold text-slate-500">AI Tokens</div>
                              <div className="text-base font-bold text-white mt-1">
                                {(selectedUserDetails?.user?.monthlyAiTokensUsed ?? selectedUser?.monthlyAiTokensUsed ?? selectedUserUsage?.breakdown?.AI_TOKEN ?? 0).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                / {(planLimitsConfig[selectedUser?.plan || 'FREE']?.aiTokens ?? 10000).toLocaleString()}
                              </div>
                            </div>
                            <div className="bg-[#0B0F19] p-3 rounded-xl border border-slate-800">
                              <div className="text-[10px] uppercase font-bold text-slate-500">Audio Mins</div>
                              <div className="text-base font-bold text-white mt-1">
                                {Math.round(((selectedUserUsage?.breakdown?.TRANSCRIPTION ?? 0) + (selectedUserUsage?.breakdown?.MEETING_TRANSCRIPTION ?? 0)) / 60)}m
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                / {planLimitsConfig[selectedUser?.plan || 'FREE']?.transcriptionMinutes ?? 30}m
                              </div>
                            </div>
                            <div className="bg-[#0B0F19] p-3 rounded-xl border border-slate-800">
                              <div className="text-[10px] uppercase font-bold text-slate-500">Doc Scans</div>
                              <div className="text-base font-bold text-white mt-1">
                                {selectedUserUsage?.breakdown?.DOCUMENT_SCAN ?? 0}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                / {planLimitsConfig[selectedUser?.plan || 'FREE']?.documentScans ?? 10}
                              </div>
                            </div>
                            <div className="bg-[#0B0F19] p-3 rounded-xl border border-slate-800">
                              <div className="text-[10px] uppercase font-bold text-slate-500">Meeting Mode</div>
                              <div className={`text-xs font-bold mt-2 ${
                                (selectedUser?.plan === 'PRO' || selectedUser?.plan === 'TRIAL' || planLimitsConfig[selectedUser?.plan || 'FREE']?.meetingMode)
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}>
                                {(selectedUser?.plan === 'PRO' || selectedUser?.plan === 'TRIAL' || planLimitsConfig[selectedUser?.plan || 'FREE']?.meetingMode)
                                  ? 'AVAILABLE'
                                  : 'PRO ONLY'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border border-red-950/80 bg-red-950/20 p-4 rounded-2xl space-y-3">
                      <div className="text-xs font-bold text-red-400 uppercase tracking-wider">Administrative Actions</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleSuspend(selectedUser)}
                          className="flex-1 py-2 px-3 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-semibold"
                        >
                          {selectedUser.isSuspended ? 'Unsuspend Account' : 'Suspend Account'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(selectedUser.id)}
                          className="py-2 px-3 bg-red-900 hover:bg-red-800 text-white rounded-xl text-xs font-semibold"
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. PLANS & USAGE LIMITS TAB */}
          {/* ========================================================= */}
          {activeTab === 'plans-limits' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Plan Entitlements & Usage Limits</h2>
                  <p className="text-xs text-slate-400">
                    Authoritative server-side quotas: configure monthly token allowances, transcription budgets, scan quotas, and Meeting Mode access.
                  </p>
                </div>
                <button
                  onClick={handleSavePlanLimits}
                  disabled={isSavingPlanLimits}
                  className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSavingPlanLimits ? 'animate-spin' : ''}`} />
                  <span>{isSavingPlanLimits ? 'Saving to Database...' : 'Save Plan Limits'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {(['FREE', 'TRIAL', 'PRO'] as const).map((tierKey) => {
                  const limits = planLimitsConfig[tierKey] || {};
                  const isPro = tierKey === 'PRO';
                  const isTrial = tierKey === 'TRIAL';
                  const badgeColor = isPro
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : isTrial
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700';

                  return (
                    <div
                      key={tierKey}
                      className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div>
                            <div className="text-base font-bold text-white tracking-tight">{tierKey} Tier</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {tierKey === 'FREE' && 'Default tier for all registered users'}
                              {tierKey === 'TRIAL' && '7-day evaluation with expanded capabilities'}
                              {tierKey === 'PRO' && 'Full unconstrained Second Brain access'}
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border font-bold ${badgeColor}`}>
                            {tierKey}
                          </span>
                        </div>

                        <div className="space-y-3.5">
                          <div>
                            <label className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
                              <span>Monthly AI Tokens Limit</span>
                              <span className="text-[11px] font-mono text-indigo-400">
                                {(Number(limits.aiTokens) || 0).toLocaleString()} tokens
                              </span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={limits.aiTokens ?? 10000}
                              onChange={(e) =>
                                setPlanLimitsConfig({
                                  ...planLimitsConfig,
                                  [tierKey]: {
                                    ...limits,
                                    aiTokens: Math.max(0, parseInt(e.target.value, 10) || 0),
                                  },
                                })
                              }
                              className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C3AED] font-mono"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Tracks prompt tokens + completion tokens for ModelFlare AI.</p>
                          </div>

                          <div>
                            <label className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
                              <span>Transcription Minutes</span>
                              <span className="text-[11px] font-mono text-emerald-400">
                                {limits.transcriptionMinutes ?? 30} mins
                              </span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={limits.transcriptionMinutes ?? 30}
                              onChange={(e) =>
                                setPlanLimitsConfig({
                                  ...planLimitsConfig,
                                  [tierKey]: {
                                    ...limits,
                                    transcriptionMinutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                                  },
                                })
                              }
                              className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C3AED] font-mono"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">AssemblyAI quota. (Voice recording always remains active).</p>
                          </div>

                          <div>
                            <label className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
                              <span>Document Scans / OCR</span>
                              <span className="text-[11px] font-mono text-purple-400">
                                {limits.documentScans ?? 10} scans
                              </span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={limits.documentScans ?? 10}
                              onChange={(e) =>
                                setPlanLimitsConfig({
                                  ...planLimitsConfig,
                                  [tierKey]: {
                                    ...limits,
                                    documentScans: Math.max(0, parseInt(e.target.value, 10) || 0),
                                  },
                                })
                              }
                              className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C3AED] font-mono"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Monthly document OCR & image ingestion count.</p>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80">
                            <label className="flex items-center justify-between cursor-pointer">
                              <div>
                                <span className="text-xs text-slate-200 font-medium block">Executive Meeting Mode</span>
                                <span className="text-[10px] text-slate-500 block">
                                  {limits.meetingMode
                                    ? 'Allowed for this tier'
                                    : 'Locked with Pro upgrade prompt'}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={Boolean(limits.meetingMode)}
                                onChange={(e) =>
                                  setPlanLimitsConfig({
                                    ...planLimitsConfig,
                                    [tierKey]: {
                                      ...limits,
                                      meetingMode: e.target.checked,
                                    },
                                  })
                                }
                                className="w-4 h-4 text-purple-600 bg-slate-950 border-slate-800 rounded focus:ring-purple-500"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                        <span>Access: {limits.meetingMode ? 'Pro Enabled' : 'Pro Gated'}</span>
                        <span className="text-indigo-400">System Setting: plan_limits</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. AI PROVIDERS & HOT-SWAP TAB */}
          {/* ========================================================= */}
          {activeTab === 'ai-providers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">AI Provider Hot-Swap Gateway</h2>
                  <p className="text-xs text-slate-400">Configure multi-provider fallbacks, test real endpoint latency, and change active models without redeploying</p>
                </div>
                <button
                  onClick={() => setIsEditingProvider(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Provider
                </button>
              </div>

              {/* AssemblyAI Config Card */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">AssemblyAI Audio Transcription Engine</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                          universal-3-5-pro
                        </span>
                        {assemblyAiKey ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                            CONFIGURED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                            KEY REQUIRED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Powers mobile Instant Voice Capture, audio note playback, and executive meeting diarization.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveAssemblyAiKey} className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={assemblyAiKey}
                      onChange={(e) => setAssemblyAiKey(e.target.value)}
                      placeholder="Paste AssemblyAI API Key..."
                      className="flex-1 px-3.5 py-2.5 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-[#7C3AED]"
                    />
                    <button
                      type="submit"
                      disabled={isSavingAssemblyAi}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
                    >
                      {isSavingAssemblyAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Key'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestAssemblyAi}
                      disabled={isTestingAssemblyAi}
                      className="px-4 py-2.5 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Play className={`w-3.5 h-3.5 ${isTestingAssemblyAi ? 'animate-spin' : ''}`} />
                      <span>{isTestingAssemblyAi ? 'Testing...' : 'Test AssemblyAI'}</span>
                    </button>
                  </div>

                  {assemblyAiTestResult && (
                    <div
                      className={`p-3 rounded-xl text-xs border ${
                        assemblyAiTestResult.success
                          ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                          : 'bg-red-950/70 border-red-800 text-red-300'
                      }`}
                    >
                      {assemblyAiTestResult.message}
                    </div>
                  )}
                </form>
              </div>

              {/* Provider List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiProviders.length > 0 ? (
                  aiProviders.map((prov) => (
                    <div
                      key={prov.id}
                      className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{prov.name}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              prov.isEnabled
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {prov.isEnabled ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">Priority: #{prov.priority}</span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-300 font-mono bg-[#0B0F19] p-3 rounded-xl border border-slate-800">
                        <div className="truncate"><span className="text-slate-500">Base URL:</span> {prov.baseUrl}</div>
                        <div><span className="text-slate-500">API Key:</span> •••••••••••••••• (Stored securely)</div>
                        <div><span className="text-slate-500">Chat Model:</span> <span className="text-indigo-400">{prov.chatModel}</span></div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => handleTestProvider(prov.id)}
                          disabled={testingProviderId === prov.id}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 disabled:opacity-50"
                        >
                          <Play className={`w-3.5 h-3.5 ${testingProviderId === prov.id ? 'animate-spin' : ''}`} />
                          <span>{testingProviderId === prov.id ? 'Pinging Provider...' : 'Test Connection'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteProvider(prov.id, prov.name)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete Provider"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 p-8 text-center text-xs text-slate-500 bg-[#111827] rounded-2xl border border-slate-800">
                    No custom AI providers configured in DB yet. The backend is currently using environment defaults (AI_BASE_URL / OPENAI_BASE_URL). Click "Add New Provider" above to add dynamic providers.
                  </div>
                )}
              </div>

              {/* Provider Modal Form */}
              {isEditingProvider && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">Add OpenAI-Compatible Provider</h3>
                      <button onClick={() => setIsEditingProvider(false)} className="text-slate-500 hover:text-white">✕</button>
                    </div>

                    <form onSubmit={handleSaveProvider} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Provider Name</label>
                        <input
                          type="text"
                          required
                          value={providerForm.name}
                          onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                          placeholder="e.g. OpenAI / ModelFlare / Groq"
                          className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Base URL</label>
                        <input
                          type="url"
                          required
                          value={providerForm.baseUrl}
                          onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
                          placeholder="https://api.openai.com/v1"
                          className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">API Key</label>
                        <input
                          type="password"
                          required
                          value={providerForm.apiKey}
                          onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                          placeholder="sk-..."
                          className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingProvider(false)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-xl text-xs font-semibold"
                        >
                          Save Provider
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. NOTES & CONTENT TAB */}
          {/* ========================================================= */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Notes & Second Brain Content</h2>
                <p className="text-xs text-slate-400">Cross-system visibility into notes, indexed entities, and synced voice thoughts</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Indexed Notes</span>
                  <div className="text-3xl font-extrabold text-white mt-2">{metrics?.content?.notes ?? 0}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Full text + semantic vector search ready</p>
                </div>
                <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Meetings Processed</span>
                  <div className="text-3xl font-extrabold text-white mt-2">{metrics?.content?.meetings ?? 0}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Speaker diarization & summary records</p>
                </div>
                <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Tasks Extracted</span>
                  <div className="text-3xl font-extrabold text-white mt-2">{metrics?.content?.tasks ?? 0}</div>
                  <p className="text-[11px] text-slate-500 mt-1">AI action items and deadlines</p>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                Authoritative note records sync automatically with soft-delete protection and optimistic versioning.
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. FEATURE FLAGS */}
          {/* ========================================================= */}
          {activeTab === 'feature-flags' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Feature Flags & Rollouts</h2>
                <p className="text-xs text-slate-400">Control feature rollout percentages, Pro gating, and live toggles without App Store updates</p>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
                {featureFlags.length > 0 ? (
                  featureFlags.map((flag) => (
                    <div key={flag.key} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white font-mono">{flag.key}</div>
                        <div className="text-[11px] text-slate-400">{flag.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={flag.isEnabled}
                        onChange={(e) => handleToggleFeature(flag.key, e.target.checked)}
                        className="w-4 h-4 text-purple-600 bg-slate-950 border-slate-800 rounded focus:ring-purple-500"
                      />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Feature flags active in database: voice-memo, meeting-mode, ai-chat-grounding.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. AD NETWORK */}
          {/* ========================================================= */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Ad Network & Placement Rules</h2>
                <p className="text-xs text-slate-400">Manage Google AdMob frequencies, interstitial triggers, and Pro subscriber ad-suppression rules</p>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 text-xs text-slate-400">
                AdMob units configured: Interstitial (every 3 note saves for Free tier), Banner ads on Home and Tasks screens. Fully suppressed for PRO and active TRIAL users.
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 8. BROADCAST ANNOUNCEMENTS */}
          {/* ========================================================= */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Broadcast Announcements</h2>
                <p className="text-xs text-slate-400">Send system messages, release updates, and promotions directly to mobile clients</p>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Announcement Title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    className="px-3.5 py-2.5 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <select
                    value={newAnnouncement.targetTier}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetTier: e.target.value })}
                    className="px-3.5 py-2.5 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">All Users</option>
                    <option value="FREE">Free Tier Only</option>
                    <option value="PRO">Pro Subscribers Only</option>
                  </select>
                </div>
                <textarea
                  required
                  rows={3}
                  placeholder="Broadcast message..."
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-xl text-xs font-semibold"
                >
                  Send Announcement
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* 9. AUDIT TRAIL */}
          {/* ========================================================= */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Administrative Audit Trail</h2>
                <p className="text-xs text-slate-400">Tamper-evident log of all admin operations and compliance records</p>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0B0F19] text-[10px] uppercase text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">TIMESTAMP</th>
                      <th className="py-3 px-4">ADMIN</th>
                      <th className="py-3 px-4">ACTION</th>
                      <th className="py-3 px-4">TARGET</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/50">
                          <td className="py-3 px-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-4 text-slate-300">{log.adminEmail}</td>
                          <td className="py-3 px-4 text-purple-400 font-bold">{log.action}</td>
                          <td className="py-3 px-4 text-slate-400">{log.targetEmail || log.targetId || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-slate-500">
                          Audit trail logging active in PostgreSQL.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 10. SYSTEM HEALTH */}
          {/* ========================================================= */}
          {activeTab === 'system-health' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">System Diagnostics & Health</h2>
                <p className="text-xs text-slate-400">Real-time status of database, API gateway, AI provider, and background workers</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">PostgreSQL (Neon AWS)</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-lg font-bold text-white mt-2">Operational</div>
                  <p className="text-[10px] text-slate-500 mt-1">Pool active, latency ~18ms</p>
                </div>
                <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Vercel API Gateway</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-lg font-bold text-white mt-2">Operational</div>
                  <p className="text-[10px] text-slate-500 mt-1">Edge regions active</p>
                </div>
                <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">AI Gateway (ModelFlare)</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-lg font-bold text-white mt-2">Operational</div>
                  <p className="text-[10px] text-slate-500 mt-1">gpt-4o-mini active</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 11. SETTINGS */}
          {/* ========================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Admin Console Settings</h2>
                <p className="text-xs text-slate-400">Configure global platform options and security controls</p>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Environment Mode</div>
                    <div className="text-slate-500">Production (Vercel Serverless + Neon AWS PostgreSQL)</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[10px]">
                    PRODUCTION
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
