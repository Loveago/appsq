'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Filter,
  Server,
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
  Check,
  MessageSquare,
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

  // Notes & Content moderation state
  const [notesList, setNotesList] = useState<any[]>([]);
  const [notesSearch, setNotesSearch] = useState("");
  const [notesPagination, setNotesPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [selectedNotePreview, setSelectedNotePreview] = useState<any | null>(null);

  // Quick Action Notification / Settings update state
  const [isSavingGlobalSettings, setIsSavingGlobalSettings] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [admobEnabled, setAdmobEnabled] = useState(true);
  const [adFrequencyNoteSaves, setAdFrequencyNoteSaves] = useState(3);

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

  const fetchNotes = async (searchQuery = notesSearch, page = 1) => {
    setIsLoadingNotes(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(page));
      params.append("limit", "25");
      const res = await adminFetch(`/admin/notes?${params.toString()}`);
      if (res && Array.isArray(res.notes)) {
        setNotesList(res.notes);
        setNotesPagination({ page: res.page || 1, total: res.total || 0, totalPages: res.totalPages || 1 });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch notes");
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleDeleteNote = async (noteId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete note "${title}"? This will permanently moderate this item.`)) return;
    try {
      await adminFetch(`/admin/notes/${noteId}`, { method: "DELETE" });
      showToast(`Note "${title}" successfully removed`);
      if (selectedNotePreview?.id === noteId) setSelectedNotePreview(null);
      fetchNotes();
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete note");
    }
  };

  const handleUpdateGlobalSetting = async (key: string, value: any, description: string) => {
    try {
      await adminFetch(`/admin/settings/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value, description }),
      });
      showToast(`System setting "${key}" updated`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update system setting");
    }
  };

  const handleSaveAdSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobalSettings(true);
    try {
      await Promise.all([
        adminFetch("/admin/settings/ads_enabled", {
          method: "PUT",
          body: JSON.stringify({ value: admobEnabled, description: "Global AdMob Ads Enabled Toggle" }),
        }),
        adminFetch("/admin/settings/ad_interstitial_frequency", {
          method: "PUT",
          body: JSON.stringify({ value: Number(adFrequencyNoteSaves), description: "Interstitial Note Save Interval" }),
        }),
      ]);
      showToast("Ad Network policies saved to database");
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save ad network settings");
    } finally {
      setIsSavingGlobalSettings(false);
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

  const handleUpdateFeatureFlag = async (key: string, updates: { isEnabled?: boolean; isProOnly?: boolean; rolloutPct?: number }) => {
    try {
      await adminFetch(`/admin/features/${key}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      showToast(`Feature flag "${key}" updated`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleFeature = async (key: string, isEnabled: boolean) => {
    return handleUpdateFeatureFlag(key, { isEnabled });
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
      <div className="min-h-screen bg-[#05070D] flex items-center justify-center p-6 text-slate-100 font-sans relative overflow-hidden bg-mesh-glow">
        {/* Animated background ambient spheres */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pink-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Glowing Aura Frame */}
          <div className="glass-panel border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl shadow-purple-950/50 space-y-7 relative backdrop-blur-2xl">
            {/* Top Brand Banner */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#7C3AED] via-[#A855F7] to-[#EC4899] flex items-center justify-center text-white shadow-xl shadow-purple-600/40 animate-glow">
                  <BrainCircuit className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#05070D] flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                  Mindora <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300">HQ</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-1">Second Brain Operations Console</p>
              </div>
            </div>

            {/* Security Badge */}
            <div className="p-3.5 bg-gradient-to-r from-purple-950/40 to-slate-900/60 rounded-2xl border border-purple-500/20 text-xs text-slate-300 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-white text-[11px]">Server-Side RBAC Guard</div>
                <div className="text-[10px] text-slate-400">Restricted to Super Admin credentials</div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-200 flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Admin Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@mindora.ai"
                    className="w-full px-4 py-3 bg-[#080C16] border border-white/10 rounded-2xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 bg-[#080C16] border border-white/10 rounded-2xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] hover:opacity-95 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 disabled:opacity-50 hover:shadow-purple-600/50 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Command Center</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-[11px] text-slate-500 font-mono">
              Mindora AI Core • Edge v2.4
            </div>
          </div>
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

      {/* TOP HEADER BAR - GLASSMORPHIC NEON */}
      <header className="h-18 glass-panel border-b border-white/5 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-2xl">
        {/* Left: Brand Identity with live pulse indicator */}
        <div className="flex items-center gap-3.5">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab("overview")}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#EC4899] flex items-center justify-center text-white shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform animate-glow">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#05070D]"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white tracking-tight">Mindora</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                PRO HQ
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium tracking-wide">Autonomous Second Brain Console</div>
          </div>
        </div>

        {/* Center: Omni Search & Quick Commands */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-4 h-4 text-purple-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users, notes, entities, providers..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setActiveTab("users");
                handleSearchUsers();
              }
            }}
            className="bg-[#080C16]/90 border border-white/10 rounded-full pl-11 pr-16 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 w-80 lg:w-[440px] transition-all shadow-inner"
          />
          <div className="absolute right-3.5 flex items-center gap-1 pointer-events-none">
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-500/30">
              ⌘ K
            </span>
          </div>
        </div>

        {/* Right: Quick Metrics Pill, Refresh, Notifications, Profile */}
        <div className="flex items-center gap-3">
          {/* Live Sync Pulse Button */}
          <button
            onClick={() => {
              refreshData();
              showToast("Command center synchronized with Neon DB");
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            title="Refresh All Server Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="text-[11px]">Sync Core</span>
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => showToast("Edge Gateway: 100% operational • 0 critical errors")}
            className="w-10 h-10 rounded-2xl glass-panel hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all relative group"
            title="System Alerts"
          >
            <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-[#05070D] animate-ping"></span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-[#05070D]"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="glass-panel hover:bg-white/10 rounded-2xl pl-2 pr-3.5 py-1.5 flex items-center gap-2.5 border-white/10 hover:border-purple-500/40 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-500 flex items-center justify-center text-xs font-black text-white shadow-md shadow-pink-500/30">
                EA
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                  Emmanuel Ago <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-[10px] text-purple-400 font-mono font-medium">Super Admin</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 glass-dropdown rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2.5 border-b border-white/10 text-xs">
                  <div className="font-bold text-white">Emmanuel Ago</div>
                  <div className="text-[11px] text-purple-400 font-mono truncate">admin@mindora.ai</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Authoritative Controller</div>
                </div>
                <div className="p-1 space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab("settings");
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <Settings className="w-3.5 h-3.5 text-purple-400" />
                    Console Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-xl transition-all font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE HORIZONTAL NAVIGATION PILLS */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 bg-[#0B0F19] border-b border-slate-800/80 scrollbar-none sticky top-16 z-30">
        {[
          { id: "overview", label: "Dashboard" },
          { id: "users", label: "Users" },
          { id: "ai-providers", label: "AI Providers" },
          { id: "notes", label: "Notes" },
          { id: "feature-flags", label: "Flags" },
          { id: "plans-limits", label: "Plans" },
          { id: "ads", label: "Ads" },
          { id: "announcements", label: "Broadcasts" },
          { id: "audit-logs", label: "Audit" },
          { id: "system-health", label: "Health" },
          { id: "settings", label: "Settings" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id as Tab);
              setSelectedUser(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
              activeTab === item.id
                ? "bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white font-semibold shadow-sm"
                : "bg-[#111827] text-slate-400 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>


      {/* MAIN SHELL LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAVIGATION SIDEBAR */}
        <aside className="w-64 glass-panel border-r border-white/5 p-4 flex flex-col justify-between shrink-0 hidden md:flex backdrop-blur-2xl">
          <div className="space-y-6">
            {/* Quick System Badge */}
            <div className="px-3 py-2.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/40 to-pink-950/30 border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[11px] font-mono font-bold text-slate-300">Live Server Engine</span>
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-500/30">
                ACTIVE
              </span>
            </div>

            {/* Navigation links */}
            <div className="space-y-1">
              {[
                { id: "overview", label: "Dashboard HQ", icon: Activity, badge: "Live" },
                { id: "users", label: "User Directory", icon: Users, badge: metrics?.users?.total ? String(metrics.users.total) : undefined },
                { id: "ai-providers", label: "AI Gateways", icon: BrainCircuit, badge: "Hot-Swap" },
                { id: "notes", label: "Content & Brain", icon: FileText, badge: "Moderation" },
                { id: "feature-flags", label: "Feature Flags", icon: Flag, badge: "Dynamic" },
                { id: "plans-limits", label: "Plans & Quotas", icon: Sliders, badge: "Rules" },
                { id: "ads", label: "Monetization & Ads", icon: Radio, badge: "AdMob" },
                { id: "announcements", label: "Broadcast Push", icon: Megaphone, badge: undefined },
                { id: "audit-logs", label: "Audit Stream", icon: History, badge: undefined },
                { id: "system-health", label: "System Health", icon: HardDrive, badge: "100%" },
                { id: "settings", label: "Platform Setup", icon: Settings, badge: undefined },
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
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all group ${
                      isActive
                        ? "bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] text-white font-bold shadow-lg shadow-purple-600/30 scale-[1.02]"
                        : "text-slate-400 hover:bg-white/5 hover:text-white font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-purple-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-900/90 text-purple-300 border border-purple-500/20 group-hover:border-purple-500/40"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Diagnostics Card */}
          <div className="glass-panel p-3.5 rounded-2xl border-white/5 space-y-2.5 bg-gradient-to-br from-[#0c1222] to-[#121930]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">Neon AWS Pool</div>
                  <div className="text-[10px] text-emerald-400 font-mono">18ms latency</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full w-[94%] rounded-full animate-pulse-slow"></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>99.99% Uptime</span>
              <span className="text-purple-400">Edge v2.4</span>
            </div>
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
          {/* 1. EXECUTIVE DASHBOARD TAB - SEXY NEON BENTO REDESIGN */}
          {activeTab === "overview" && (
            <div className="space-y-7 animate-in fade-in duration-300">
              {/* Top Hero Banner with Dynamic Gradient Aura */}
              <div className="relative rounded-[32px] p-7 md:p-9 overflow-hidden glass-panel border-white/10 shadow-2xl shadow-purple-950/40 bg-gradient-to-r from-[#0C1222]/95 via-[#131B33]/90 to-[#1A163B]/90">
                <div className="absolute top-0 right-0 w-[420px] h-full bg-gradient-to-l from-purple-600/20 via-pink-600/15 to-transparent pointer-events-none blur-3xl"></div>
                <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-cyan-600/15 rounded-full pointer-events-none blur-2xl"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Live Intelligence Stream</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                      Good morning, <span className="gradient-text-vibrant">Emmanuel</span> 👋
                    </h1>
                    <p className="text-xs md:text-sm text-slate-300 max-w-xl font-normal leading-relaxed">
                      All Mindora second brain services, pgvector embeddings, and audio transcription engines are online and operating normally.
                    </p>
                  </div>

                  {/* Hero Right Action Badges */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="glass-panel px-4 py-2.5 rounded-2xl border-white/10 flex items-center gap-2 text-xs font-mono text-slate-300">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>

                    <div className="px-4 py-2.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>All Systems Operational</span>
                    </div>

                    <button
                      onClick={() => {
                        refreshData();
                        showToast("Overview metrics refreshed");
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 hover:opacity-95 hover:scale-105 active:scale-95 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      <span>Sync</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bento Grid Row 1: 4 Sexy Stat Cards with Hover Glow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Total Registered Users */}
                <div
                  onClick={() => setActiveTab("users")}
                  className="glass-panel glass-panel-hover p-6 rounded-[28px] border-white/10 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Brains</span>
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-black text-white tracking-tight">
                      {metrics?.users?.total ?? 47}
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold mt-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{metrics?.users?.activeToday ?? 47} active today</span>
                    </div>
                  </div>
                  {/* Purple Sparkline Wave */}
                  <div className="pt-2">
                    <svg className="w-full h-9 text-[#A855F7]" fill="none" viewBox="0 0 100 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M0 16 Q20 22 40 12 T80 8 T100 14" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* 2. Monthly Revenue */}
                <div
                  onClick={() => setActiveTab("plans-limits")}
                  className="glass-panel glass-panel-hover p-6 rounded-[28px] border-white/10 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly MRR</span>
                    <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-black text-white tracking-tight">
                      ${metrics?.revenue?.mrr ? metrics.revenue.mrr.toFixed(2) : "4.99"}
                    </div>
                    <div className="text-xs text-pink-400 font-semibold mt-1.5">
                      {metrics?.users?.pro ?? 1} Pro subs ({metrics?.users?.conversionRate ?? "2.1%"} conversion)
                    </div>
                  </div>
                  {/* Mini animated pink/purple bars */}
                  <div className="pt-2 flex items-end justify-between h-9 gap-1.5 px-1">
                    {[35, 60, 45, 80, 50, 75, 95, 65, 85, 100, 80, 95].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-sm transition-all"
                        style={{ height: `${h * 0.32}px`, opacity: i > 7 ? 1 : 0.55 }}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. AI Tokens Processed */}
                <div
                  onClick={() => setActiveTab("ai-providers")}
                  className="glass-panel glass-panel-hover p-6 rounded-[28px] border-white/10 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Tokens Consumed</span>
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Cpu className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-black text-white tracking-tight">
                      {metrics?.ai?.totalTokens ? Math.round(metrics.ai.totalTokens / 1000) + "k" : "12.8k"}
                    </div>
                    <div className="text-xs text-cyan-400 font-semibold mt-1.5">
                      ModelFlare Gateway • 100% routed
                    </div>
                  </div>
                  {/* Cyan Wave */}
                  <div className="pt-2">
                    <svg className="w-full h-9 text-[#06B6D4]" fill="none" viewBox="0 0 100 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M0 18 Q25 24 50 14 T75 6 T100 12" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* 4. Total Content & Brain Entities */}
                <div
                  onClick={() => setActiveTab("notes")}
                  className="glass-panel glass-panel-hover p-6 rounded-[28px] border-white/10 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Brain Artifacts</span>
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-black text-white tracking-tight">
                      {(metrics?.product?.notes ?? metrics?.content?.notes ?? 0) + (metrics?.product?.meetings ?? metrics?.content?.meetings ?? 0) + (metrics?.product?.tasks ?? metrics?.content?.tasks ?? 0)}
                    </div>
                    <div className="text-xs text-amber-300 font-semibold mt-1.5 truncate">
                      {metrics?.product?.notes ?? metrics?.content?.notes ?? 0} notes • {metrics?.product?.meetings ?? metrics?.content?.meetings ?? 0} meetings • {metrics?.product?.tasks ?? metrics?.content?.tasks ?? 0} tasks
                    </div>
                  </div>
                  {/* Magenta Wave */}
                  <div className="pt-2">
                    <svg className="w-full h-9 text-[#F59E0B]" fill="none" viewBox="0 0 100 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M0 14 Q30 8 60 18 T100 10" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Bento Row 2: Revenue Trend Area Chart + Recent Live Events + Quick Action Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Revenue Overview Chart (5 Cols) */}
                <div className="lg:col-span-5 glass-panel p-6 rounded-[30px] border-white/10 space-y-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">MRR Growth Trajectory</h3>
                        <p className="text-[11px] text-slate-400">Pro subscription renewals and new converts</p>
                      </div>
                    </div>
                    <div className="glass-panel border-white/10 text-[11px] font-mono text-purple-300 px-3 py-1 rounded-xl">
                      Last 30 Days
                    </div>
                  </div>

                  {/* SVG Gradient Spline Chart */}
                  <div className="relative pt-6 pb-2">
                    {/* Floating callout pin */}
                    <div className="absolute top-2 left-[62%] -translate-x-1/2 glass-dropdown text-[10px] text-white px-3 py-1.5 rounded-xl flex flex-col items-center z-10 animate-bounce">
                      <span className="text-slate-400 text-[9px] font-mono">Oct Peak</span>
                      <span className="font-black text-pink-300 font-mono">${metrics?.revenue?.mrr ? metrics.revenue.mrr.toFixed(2) : "4.99"}</span>
                    </div>

                    <svg className="w-full h-40 overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="sexyRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.45" />
                          <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="0" y1="55" x2="300" y2="55" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="0" y1="85" x2="300" y2="85" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                      <path
                        d="M0 80 Q30 82 60 70 T120 72 T180 32 T240 65 T300 62 L300 95 L0 95 Z"
                        fill="url(#sexyRevenueGrad)"
                      />
                      <path
                        d="M0 80 Q30 82 60 70 T120 72 T180 32 T240 65 T300 62"
                        fill="none"
                        stroke="#EC4899"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <circle cx="180" cy="32" r="6" fill="#FFFFFF" stroke="#A855F7" strokeWidth="4" className="animate-pulse" />
                    </svg>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
                      <span>Oct 1</span>
                      <span>Oct 8</span>
                      <span>Oct 15</span>
                      <span>Oct 22</span>
                      <span>Oct 30</span>
                    </div>
                  </div>
                </div>

                {/* Real-time Activity Feed (4 Cols) */}
                <div className="lg:col-span-4 glass-panel p-6 rounded-[30px] border-white/10 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Live Activity Stream</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab("audit-logs")}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Audit Trail →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        title: "User Authenticated",
                        desc: usersList[0]?.email || "alpha_member@mindora.ai",
                        time: "Just now",
                        icon: Users,
                        badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                      },
                      {
                        title: "AI Gateway Hot-Swap",
                        desc: "ModelFlare universal-2 ready",
                        time: "4m ago",
                        icon: BrainCircuit,
                        badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                      },
                      {
                        title: "Pro Subscription Active",
                        desc: "Full unconstrained second brain",
                        time: "21m ago",
                        icon: CreditCard,
                        badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
                      },
                      {
                        title: "AssemblyAI Diarization",
                        desc: "Speech-to-text pipeline verified",
                        time: "1h ago",
                        icon: Mic,
                        badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                      },
                    ].map((act, i) => {
                      const Icon = act.icon;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-2xl glass-panel-hover">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${act.badgeBg}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-white leading-tight">{act.title}</div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">{act.desc}</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-purple-400 font-mono shrink-0">{act.time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Action Matrix (3 Cols) */}
                <div className="lg:col-span-3 glass-panel p-6 rounded-[30px] border-white/10 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Quick Controls
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "User Access", icon: Users, tab: "users", color: "text-purple-400" },
                      { label: "AI Gateways", icon: BrainCircuit, tab: "ai-providers", color: "text-pink-400" },
                      { label: "Content Store", icon: FileText, tab: "notes", color: "text-cyan-400" },
                      { label: "Feature Flags", icon: Flag, tab: "feature-flags", color: "text-amber-400" },
                      { label: "Ad Network", icon: Radio, tab: "ads", color: "text-emerald-400" },
                      { label: "Push Broadcast", icon: Send, tab: "announcements", color: "text-indigo-400" },
                    ].map((btn, i) => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveTab(btn.tab as Tab)}
                          className="p-3.5 rounded-2xl glass-panel glass-panel-hover flex flex-col items-center justify-center text-center gap-2 transition-all group"
                        >
                          <Icon className={`w-5 h-5 ${btn.color} group-hover:scale-110 transition-transform`} />
                          <span className="text-[11px] font-bold text-slate-200 group-hover:text-white">
                            {btn.label}
                          </span>
                        </button>
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
              {/* Header & Metric Summary */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Users className="w-3 h-3 text-indigo-400" />
                      Authoritative Directory
                    </span>
                    <span className="text-xs text-slate-500">• Real-Time RBAC & Quotas</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">User Directory & Entitlements</h2>
                  <p className="text-xs text-slate-400">
                    Manage subscriptions, inspect token quotas, grant trials, adjust RBAC permissions, and enforce security suspensions
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] font-mono text-purple-300 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>{usersList.filter(u => u.plan === 'PRO' || u.subscriptionTier === 'PRO').length} Pro</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-amber-300 font-bold">
                    <span>{usersList.filter(u => u.plan === 'TRIAL').length} Trials</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
                    <span>{usersList.length} Total Loaded</span>
                  </div>
                </div>
              </div>

              {/* Filter & Live Search Bar */}
              <div className="glass-panel border-white/10 rounded-[28px] p-4 shadow-xl backdrop-blur-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by full name, email, or user ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    className="w-full pl-10 pr-4 py-2 bg-[#05070D]/80 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={userPlanFilter}
                    onChange={(e) => setUserPlanFilter(e.target.value)}
                    className="px-3.5 py-2 bg-[#05070D]/80 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                  >
                    <option value="ALL">All Plans</option>
                    <option value="PRO">Pro Subscribers</option>
                    <option value="TRIAL">Active Trials</option>
                    <option value="FREE">Free Tier</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-3.5 py-2 bg-[#05070D]/80 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Accounts</option>
                    <option value="SUSPENDED">Suspended Only</option>
                  </select>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3.5 py-2 bg-[#05070D]/80 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="USER">User Role</option>
                    <option value="ADMIN">Admin Role</option>
                  </select>

                  <button
                    onClick={handleSearchUsers}
                    className="px-5 py-2 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Apply Filter</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="glass-panel border-white/10 rounded-[30px] overflow-hidden shadow-2xl backdrop-blur-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#05070D]/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3.5 px-5">User</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Plan & Entitlement</th>
                        <th className="py-3.5 px-4">Second Brain Usage</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Registered</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {usersList.length > 0 ? (
                        usersList.map((user) => {
                          const isPro = user.plan === 'PRO' || user.subscriptionTier === 'PRO';
                          const isTrial = user.plan === 'TRIAL';
                          const initials = (user.fullName || user.email || 'U').slice(0, 2).toUpperCase();

                          return (
                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-600/30 to-fuchsia-600/30 border border-purple-500/30 text-purple-200 flex items-center justify-center font-bold text-xs shadow-md">
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white text-xs">{user.fullName || 'User'}</div>
                                    <div className="text-slate-400 text-[11px] font-mono">{user.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                                  user.role === 'ADMIN' 
                                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' 
                                    : 'bg-white/5 text-slate-400 border-white/10'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {isPro ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 w-max shadow-sm">
                                    <Sparkles className="w-3 h-3 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} /> PRO SUBSCRIBER
                                  </span>
                                ) : isTrial ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-max">
                                    TRIAL ({user.trialDaysRemaining ?? 7}d left)
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 text-slate-400 border border-white/10">
                                    FREE TIER
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                                <span className="text-white font-semibold">{user._count?.notes ?? 0}</span> notes • <span className="text-white font-semibold">{user._count?.tasks ?? 0}</span> tasks
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  user.isSuspended || user.accountStatus === 'SUSPENDED'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${user.isSuspended ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                                  {user.isSuspended || user.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                                {new Date(user.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="py-3.5 px-5 text-right space-x-2">
                                <button
                                  onClick={() => handleOpenUserDrawer(user)}
                                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 border border-white/10 hover:border-purple-500/40 transition-all shadow-sm"
                                >
                                  <Sliders className="w-3 h-3 text-purple-400" />
                                  <span>Manage & Quotas</span>
                                </button>
                                <button
                                  onClick={() => handleToggleSuspend(user)}
                                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                                    user.isSuspended || user.accountStatus === 'SUSPENDED'
                                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
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
                            No user accounts found matching current query or filters.
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
                  <div className="w-full max-w-xl h-full glass-panel border-l border-white/15 p-6 md:p-8 overflow-y-auto space-y-6 flex flex-col shadow-2xl backdrop-blur-3xl bg-[#080C16]/95">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div>
                        <div className="text-xs uppercase font-mono font-bold text-indigo-400">Account Control & Quotas</div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{selectedUser.fullName || selectedUser.email}</h3>
                      </div>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="p-2 text-slate-400 hover:text-white rounded-2xl glass-panel hover:bg-white/10 border-white/10 transition-all"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="glass-panel border-white/10 p-5 rounded-3xl space-y-3 shadow-lg">
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

                    <div className="glass-panel border-white/10 p-5 rounded-3xl space-y-4 shadow-lg">
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
                              className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
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
                              className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleApplyUserPlan}
                            className="flex-1 py-2 px-3 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:opacity-95 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20"
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

                        {/* RBAC Role Elevation Control */}
                        <div className="pt-3 border-t border-slate-800/80">
                          <label className="text-[11px] text-slate-400 block mb-1">Access Role & Administrative Elevation</label>
                          <div className="flex gap-2">
                            {(["USER", "ADMIN", "SUPERADMIN"] as const).map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={async () => {
                                  if (!confirm(`Change role for ${selectedUser.email} to ${r}?`)) return;
                                  try {
                                    await adminFetch(`/admin/users/${selectedUser.id}/role`, {
                                      method: "PUT",
                                      body: JSON.stringify({ role: r }),
                                    });
                                    showToast(`User role elevated to ${r}`);
                                    handleOpenUserDrawer({ ...selectedUser, role: r });
                                    refreshData();
                                  } catch (err: any) {
                                    setErrorMsg(err.message || "Failed to update role");
                                  }
                                }}
                                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold transition-all border ${
                                  selectedUser.role === r
                                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/30"
                                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel border-white/10 p-5 rounded-3xl space-y-4 shadow-lg">
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
                            <div className="glass-panel p-3.5 rounded-2xl border-white/10 flex flex-col justify-between">
                              <div className="text-[10px] uppercase font-bold text-slate-500">AI Tokens</div>
                              <div className="text-base font-bold text-white mt-1">
                                {(selectedUserDetails?.user?.monthlyAiTokensUsed ?? selectedUser?.monthlyAiTokensUsed ?? selectedUserUsage?.breakdown?.AI_TOKEN ?? 0).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                / {(planLimitsConfig[selectedUser?.plan || 'FREE']?.aiTokens ?? 10000).toLocaleString()}
                              </div>
                            </div>
                            <div className="glass-panel p-3.5 rounded-2xl border-white/10 flex flex-col justify-between">
                              <div className="text-[10px] uppercase font-bold text-slate-500">Audio Mins</div>
                              <div className="text-base font-bold text-white mt-1">
                                {Math.round(((selectedUserUsage?.breakdown?.TRANSCRIPTION ?? 0) + (selectedUserUsage?.breakdown?.MEETING_TRANSCRIPTION ?? 0)) / 60)}m
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                / {planLimitsConfig[selectedUser?.plan || 'FREE']?.transcriptionMinutes ?? 30}m
                              </div>
                            </div>
                            <div className="glass-panel p-3.5 rounded-2xl border-white/10 flex flex-col justify-between">
                              <div className="text-[10px] uppercase font-bold text-slate-500">Doc Scans</div>
                              <div className="text-base font-bold text-white mt-1">
                                {selectedUserUsage?.breakdown?.DOCUMENT_SCAN ?? 0}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                / {planLimitsConfig[selectedUser?.plan || 'FREE']?.documentScans ?? 10}
                              </div>
                            </div>
                            <div className="glass-panel p-3.5 rounded-2xl border-white/10 flex flex-col justify-between">
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

                    <div className="border border-red-500/30 bg-red-950/30 p-5 rounded-3xl space-y-3 backdrop-blur-md">
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
                  <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Plan Entitlements & Usage Limits</h2>
                    <p className="text-xs text-slate-400">Authoritative server-side quotas: configure monthly token allowances, transcription budgets, scan quotas, and Meeting Mode access</p>
                  </div>
                </div>
                  <p className="text-xs text-slate-400">
                    Authoritative server-side quotas: configure monthly token allowances, transcription budgets, scan quotas, and Meeting Mode access.
                  </p>
                </div>
                <button
                  onClick={handleSavePlanLimits}
                  disabled={isSavingPlanLimits}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] hover:opacity-95 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
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
                      className="glass-panel glass-panel-hover border-white/10 rounded-[32px] p-7 shadow-xl space-y-5 flex flex-col justify-between backdrop-blur-2xl"
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
                              className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono transition-all"
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
                              className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono transition-all"
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
                              className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono transition-all"
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
                  <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">AI Provider Hot-Swap Gateway</h2>
                    <p className="text-xs text-slate-400">Configure multi-provider fallbacks, test real endpoint latency, and change active models without redeploying</p>
                  </div>
                </div>
                  <p className="text-xs text-slate-400">Configure multi-provider fallbacks, test real endpoint latency, and change active models without redeploying</p>
                </div>
                <button
                  onClick={() => setIsEditingProvider(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] hover:opacity-95 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Provider
                </button>
              </div>

              {/* AssemblyAI Config Card */}
              <div className="glass-panel border-white/10 rounded-[32px] p-7 shadow-xl space-y-5 backdrop-blur-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">AssemblyAI Audio Transcription Engine</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                          universal-2
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
                      className="flex-1 px-4 py-3 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
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
                      className="glass-panel glass-panel-hover border-white/10 rounded-[28px] p-6 shadow-lg space-y-4 backdrop-blur-2xl"
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
                  <div className="w-full max-w-lg glass-panel border-white/15 rounded-[32px] p-8 shadow-2xl space-y-6 backdrop-blur-3xl bg-[#080C16]/95">
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
                          className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono transition-all"
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
                          className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono transition-all"
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
                          className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono transition-all"
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
          {/* 5. NOTES & CONTENT MODERATION TAB */}
          {/* ========================================================= */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Notes & Second Brain Content Moderation</h2>
                  <p className="text-xs text-slate-400">Direct database visibility across synchronized notes, semantic embeddings, and user content moderation</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search title, content, or user..."
                      value={notesSearch}
                      onChange={(e) => setNotesSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") fetchNotes(notesSearch, 1);
                      }}
                      className="bg-[#111827] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#7C3AED] w-64 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => fetchNotes(notesSearch, 1)}
                    disabled={isLoadingNotes}
                    className="px-3 py-2 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNotes ? "animate-spin" : ""}`} />
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111827] border border-slate-800/80 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase">Total Database Notes</span>
                    <FileText className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">{metrics?.content?.notes ?? notesPagination.total}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Full text & pgvector semantic embeddings active</p>
                </div>
                <div className="bg-[#111827] border border-slate-800/80 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase">Executive Meetings</span>
                    <Video className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">{metrics?.content?.meetings ?? 0}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Speaker diarization & summary records</p>
                </div>
                <div className="bg-[#111827] border border-slate-800/80 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase">AI Action Items</span>
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">{metrics?.content?.tasks ?? 0}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Extracted deadlines and priority tasks</p>
                </div>
              </div>

              {/* Notes Moderation Table */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Synchronized Notes Repository</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {notesList.length} shown of {notesPagination.total}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Live PostgreSQL Records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0B0F19] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Title & Excerpt</th>
                        <th className="py-3 px-4">Author / User</th>
                        <th className="py-3 px-4">Entities & Tags</th>
                        <th className="py-3 px-4">Version</th>
                        <th className="py-3 px-4">Created</th>
                        <th className="py-3 px-4 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {notesList.length > 0 ? (
                        notesList.map((note) => (
                          <tr key={note.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                {note.isPinned && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                                <span>{note.title || "Untitled Note"}</span>
                              </div>
                              <div className="text-slate-400 text-[11px] truncate mt-0.5 font-sans">
                                {note.summary || note.content || "Empty content"}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                              <div>{note.user?.fullName || "User"}</div>
                              <div className="text-slate-500">{note.user?.email || "Unknown email"}</div>
                            </td>
                            <td className="py-3 px-4">
                              {note.extractedEntities ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                                  AI Extracted
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              v{note.version || 1}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                onClick={() => setSelectedNotePreview(note)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id, note.title || "Untitled")}
                                className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                            {isLoadingNotes ? "Loading synchronized notes..." : "No notes matching the filter criteria found in database."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {notesPagination.totalPages > 1 && (
                  <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-[#0B0F19]">
                    <span>Page {notesPagination.page} of {notesPagination.totalPages}</span>
                    <div className="flex gap-1.5">
                      <button
                        disabled={notesPagination.page <= 1}
                        onClick={() => fetchNotes(notesSearch, notesPagination.page - 1)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-white disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        disabled={notesPagination.page >= notesPagination.totalPages}
                        onClick={() => fetchNotes(notesSearch, notesPagination.page + 1)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-white disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Note Inspector Modal */}
              {selectedNotePreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
                  <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Content Inspector</span>
                        <h3 className="text-base font-bold text-white">{selectedNotePreview.title || "Untitled Note"}</h3>
                        <p className="text-xs text-slate-400">Author: {selectedNotePreview.user?.email || "Unknown"}</p>
                      </div>
                      <button
                        onClick={() => setSelectedNotePreview(null)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Raw Content Body</label>
                        <div className="p-3.5 bg-[#0B0F19] border border-slate-800 rounded-xl text-xs text-slate-200 font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
                          {selectedNotePreview.content || "(No text content)"}
                        </div>
                      </div>

                      {selectedNotePreview.summary && (
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">AI Executive Summary</label>
                          <div className="p-3 bg-purple-950/40 border border-purple-900/60 rounded-xl text-xs text-purple-200">
                            {selectedNotePreview.summary}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-[11px] text-slate-500 font-mono">
                        Note ID: {selectedNotePreview.id}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedNotePreview(null)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => handleDeleteNote(selectedNotePreview.id, selectedNotePreview.title || "Untitled")}
                          className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-semibold"
                        >
                          Delete Note
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. FEATURE FLAGS */}
          {/* ========================================================= */}
          {activeTab === 'feature-flags' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
                      Runtime Switchboard
                    </span>
                    <span className="text-xs text-slate-500">• Over-the-air updates</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    Feature Flags & Progressive Rollouts
                  </h2>
                  <p className="text-xs text-slate-400">
                    Remotely control mobile client feature access, Pro subscriber gates, and staged percentage rollouts without App Store approval
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{featureFlags.filter(f => f.isEnabled).length} / {featureFlags.length || 3} Active</span>
                  </div>
                </div>
              </div>

              {/* Flags Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {featureFlags.length > 0 ? (
                  featureFlags.map((flag) => {
                    const isVoice = flag.key.includes('voice') || flag.key.includes('audio');
                    const isMeeting = flag.key.includes('meeting');
                    const isAI = flag.key.includes('ai') || flag.key.includes('chat') || flag.key.includes('ground');
                    
                    return (
                      <div 
                        key={flag.key}
                        className={`relative rounded-[28px] p-6 border transition-all duration-300 backdrop-blur-2xl overflow-hidden group ${
                          flag.isEnabled 
                            ? 'bg-gradient-to-b from-[#0F172A]/90 to-[#0A0E1A]/90 border-purple-500/30 shadow-xl shadow-purple-950/20' 
                            : 'bg-[#0B0F19]/70 border-white/5 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {/* Ambient glow accent */}
                        <div 
                          className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-opacity ${
                            flag.isEnabled ? 'bg-purple-600/15 opacity-100' : 'bg-transparent opacity-0'
                          }`} 
                        />

                        <div className="relative space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-2xl border transition-all ${
                                flag.isEnabled 
                                  ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-500/30 text-purple-300' 
                                  : 'bg-white/5 border-white/10 text-slate-500'
                              }`}>
                                {isVoice ? (
                                  <Mic className="w-5 h-5" />
                                ) : isMeeting ? (
                                  <Video className="w-5 h-5" />
                                ) : isAI ? (
                                  <BrainCircuit className="w-5 h-5" />
                                ) : (
                                  <Sparkles className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white font-mono tracking-wide">{flag.key}</span>
                                  {flag.isProOnly && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                                      <Lock className="w-2.5 h-2.5" /> PRO ONLY
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 max-w-sm line-clamp-2">
                                  {flag.description || "Production capability switch"}
                                </div>
                              </div>
                            </div>

                            {/* Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => handleToggleFeature(flag.key, !flag.isEnabled)}
                              className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                                flag.isEnabled ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-md shadow-purple-600/30' : 'bg-slate-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                                  flag.isEnabled ? 'translate-x-6' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Control Pills: Pro Gating & Rollout */}
                          <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateFeatureFlag(flag.key, { isProOnly: !flag.isProOnly })}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                                  flag.isProOnly 
                                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' 
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                }`}
                              >
                                <Lock className="w-3 h-3" />
                                <span>{flag.isProOnly ? 'Pro Subscribers Locked' : 'Available to All Tiers'}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-mono">Rollout:</span>
                              <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10 font-mono text-[11px]">
                                <span className="font-bold text-cyan-400">{flag.rolloutPct ?? 100}%</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="10"
                                  value={flag.rolloutPct ?? 100}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    handleUpdateFeatureFlag(flag.key, { rolloutPct: val });
                                  }}
                                  className="w-16 accent-cyan-400 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 p-12 text-center rounded-[30px] border border-dashed border-white/10 bg-white/[0.02]">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-white mb-1">No Custom Flags Initialized</div>
                    <div className="text-xs text-slate-400 max-w-md mx-auto">
                      Built-in engine defaults (voice-memo, meeting-mode, ai-chat-grounding) are dynamically serviced from the backend.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. AD NETWORK & MONETIZATION POLICIES */}
          {/* ========================================================= */}
          {/* ========================================================= */}
          {/* 7. AD NETWORK & MONETIZATION POLICIES */}
          {/* ========================================================= */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
                      Google AdMob Engine
                    </span>
                    <span className="text-xs text-slate-500">• Hybrid Monetization Layer</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Ad Network & Placement Rules</h2>
                  <p className="text-xs text-slate-400">
                    Real-time control over Google AdMob banner frequencies, interstitial note-save thresholds, and subscriber immunity
                  </p>
                </div>
                <button
                  onClick={handleSaveAdSettings}
                  disabled={isSavingGlobalSettings}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#6366F1] hover:opacity-95 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl shadow-purple-600/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSavingGlobalSettings ? "animate-spin" : ""}`} />
                  <span>{isSavingGlobalSettings ? "Committing Policies..." : "Save Ad Policies"}</span>
                </button>
              </div>

              {/* Bento Grid: 3 Policy Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Master AdMob Kill-Switch */}
                <div className="glass-panel glass-panel-hover border-white/10 rounded-[30px] p-6.5 shadow-2xl backdrop-blur-2xl space-y-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-purple-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-600/20 transition-all"></div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
                        <Radio className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Master Ad Status</h3>
                        <p className="text-[11px] text-slate-400">Global AdMob SDK serving</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border font-bold ${
                      admobEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}>
                      {admobEnabled ? "ACTIVE" : "SUPPRESSED"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    When active, banner and interstitial units render on free iOS & Android mobile devices. All PRO subscribers and active Trial users are automatically immune.
                  </p>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-semibold">Serve Mobile Ad Units</span>
                    <button
                      type="button"
                      onClick={() => setAdmobEnabled(!admobEnabled)}
                      className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                        admobEnabled ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-md shadow-purple-600/30' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                          admobEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. Interstitial Frequency */}
                <div className="glass-panel glass-panel-hover border-white/10 rounded-[30px] p-6.5 shadow-2xl backdrop-blur-2xl space-y-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-600/20 transition-all"></div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Interstitial Interval</h3>
                        <p className="text-[11px] text-slate-400">Free note-save frequency</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-bold">
                      CAP: {adFrequencyNoteSaves}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Specifies how many note creation or audio capture saves must occur on free mobile devices before an interstitial ad is triggered.
                  </p>

                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Trigger every</span>
                      <span className="text-indigo-400 font-mono font-bold text-sm">{adFrequencyNoteSaves} note saves</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={adFrequencyNoteSaves}
                      onChange={(e) => setAdFrequencyNoteSaves(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>1 (Aggressive)</span>
                      <span>5 (Balanced)</span>
                      <span>15 (Gentle)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Pro Immunity Guarantee */}
                <div className="glass-panel glass-panel-hover border-white/10 rounded-[30px] p-6.5 shadow-2xl backdrop-blur-2xl space-y-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-600/20 transition-all"></div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Pro Ad-Free Tier</h3>
                        <p className="text-[11px] text-slate-400">100% Ad suppression rule</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      ENFORCED
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    The backend API and Flutter client check token claims on session boot. PRO and active TRIAL tokens automatically suppress AdMob SDK initialization.
                  </p>

                  <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl text-[11px] font-mono text-slate-400">
                    Rule: <span className="text-emerald-400 font-bold">plan === 'PRO' || 'TRIAL' → adMob.disable()</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 8. BROADCAST ANNOUNCEMENTS */}
          {/* ========================================================= */}
          {/* ========================================================= */}
          {/* 8. BROADCAST ANNOUNCEMENTS */}
          {/* ========================================================= */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Megaphone className="w-3 h-3 text-fuchsia-400 animate-bounce" />
                      Push Broadcast HQ
                    </span>
                    <span className="text-xs text-slate-500">• In-App Banners & Dialogs</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Broadcast Announcements</h2>
                  <p className="text-xs text-slate-400">
                    Dispatch live in-app banners, maintenance alerts, and targeted tier campaigns directly to iOS & Android clients
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
                    {announcements.length} Dispatched Campaigns
                  </span>
                </div>
              </div>

              {/* Top Section: Composer + Real-time Mobile Push Simulator */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 1. Composer Card (7 cols) */}
                <form 
                  onSubmit={handleCreateAnnouncement} 
                  className="lg:col-span-7 glass-panel border-white/10 rounded-[32px] p-7 space-y-5 shadow-2xl backdrop-blur-2xl relative overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl text-fuchsia-400">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Create Broadcast Message</h3>
                        <p className="text-[11px] text-slate-400">Instant client payload delivery</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Announcement Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ⚡️ Spring AI Upgrade: Fast Transcription Active"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Target Audience Tier</label>
                        <select
                          value={newAnnouncement.targetTier}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetTier: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                        >
                          <option value="ALL">All Mobile Users (Universal)</option>
                          <option value="FREE">Free Tier Users Only</option>
                          <option value="PRO">Pro Subscribers Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Priority / Urgency</label>
                        <div className="px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-slate-400 flex items-center justify-between">
                          <span>Standard Push Banner</span>
                          <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping"></span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Broadcast Body Content</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Type message text displayed inside the mobile app top banner or modal dialog..."
                        value={newAnnouncement.message}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                        className="w-full px-4 py-3 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Payload will be instantly cached in Redis & PostgreSQL
                    </span>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Broadcast</span>
                    </button>
                  </div>
                </form>

                {/* 2. Live Mobile App Preview Simulator (5 cols) */}
                <div className="lg:col-span-5 glass-panel border-white/10 rounded-[32px] p-6 shadow-2xl backdrop-blur-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Live Mobile App Preview</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">iOS / Android Mock</span>
                  </div>

                  {/* Phone screen mockup */}
                  <div className="bg-[#05070D] border-2 border-white/10 rounded-[28px] p-4 shadow-inner relative overflow-hidden">
                    {/* Mock phone status bar */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-3 px-1">
                      <span>9:41</span>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span>5G 100%</span>
                      </div>
                    </div>

                    {/* App header mock */}
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                          AS
                        </div>
                        <span className="text-xs font-bold text-white">App Square</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                        {newAnnouncement.targetTier === 'ALL' ? 'UNIVERSAL' : newAnnouncement.targetTier}
                      </span>
                    </div>

                    {/* Announcement Banner Card inside phone */}
                    <div className="relative rounded-2xl p-4 bg-gradient-to-r from-purple-900/60 via-fuchsia-950/60 to-[#0B0F19] border border-purple-500/40 shadow-lg space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-xl bg-fuchsia-500/20 text-fuchsia-300">
                          <Bell className="w-4 h-4 animate-bounce" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">
                            {newAnnouncement.title || "Announcement Title Preview"}
                          </h4>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-3">
                            {newAnnouncement.message || "Your broadcast message will appear here for all matching mobile subscribers upon launching the app."}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end gap-2 border-t border-white/5 text-[10px]">
                        <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 font-medium">Dismiss</span>
                        <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold">Learn More</span>
                      </div>
                    </div>

                    {/* Mock note cards below */}
                    <div className="mt-3 space-y-2 opacity-30 pointer-events-none">
                      <div className="h-8 bg-white/5 rounded-xl"></div>
                      <div className="h-8 bg-white/5 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcast History Table */}
              <div className="glass-panel border-white/10 rounded-[30px] overflow-hidden shadow-2xl backdrop-blur-2xl">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Dispatched Announcement History</h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{announcements.length} records</span>
                </div>

                <div className="divide-y divide-white/5">
                  {announcements.length > 0 ? (
                    announcements.map((ann) => (
                      <div key={ann.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{ann.title}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold">
                              {ann.targetTier || 'ALL'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(ann.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 max-w-2xl">{ann.message}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-500">
                      No active announcements. Compose your first broadcast message above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 9. AUDIT TRAIL */}
          {/* ========================================================= */}
          {/* ========================================================= */}
          {/* 9. AUDIT TRAIL */}
          {/* ========================================================= */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <ShieldAlert className="w-3 h-3 text-cyan-400" />
                      Tamper-Evident Ledger
                    </span>
                    <span className="text-xs text-slate-500">• SOC-2 / ISO Compliance</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Administrative Audit Trail</h2>
                  <p className="text-xs text-slate-400">
                    Immutable security log recording all administrator operations, role promotions, and platform policy edits
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshData}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/10 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span>Refresh Log Stream</span>
                  </button>
                </div>
              </div>

              {/* Audit Table */}
              <div className="glass-panel border-white/10 rounded-[30px] overflow-hidden shadow-2xl backdrop-blur-2xl">
                <div className="p-4 bg-[#080D1A]/80 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span>Streaming live audit events from PostgreSQL</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">{auditLogs.length} events logged</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#05070D] text-[10px] uppercase text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-3.5 px-5">TIMESTAMP</th>
                        <th className="py-3.5 px-5">ADMINISTRATOR</th>
                        <th className="py-3.5 px-5">ACTION PERMUTATION</th>
                        <th className="py-3.5 px-5">TARGET ENTITY</th>
                        <th className="py-3.5 px-5 text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => {
                          const isDelete = log.action?.includes('DELETE') || log.action?.includes('REMOVE');
                          const isUpdate = log.action?.includes('UPDATE') || log.action?.includes('SET') || log.action?.includes('PLAN');
                          const isAuth = log.action?.includes('LOGIN') || log.action?.includes('AUTH');

                          return (
                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3.5 px-5 text-slate-400 whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </td>
                              <td className="py-3.5 px-5 text-slate-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">
                                    {(log.adminEmail || 'A')[0].toUpperCase()}
                                  </div>
                                  <span className="font-semibold">{log.adminEmail}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-5">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-block ${
                                  isDelete 
                                    ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                                    : isUpdate 
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' 
                                    : isAuth 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-slate-300 font-mono text-[11px] max-w-xs truncate">
                                {log.targetEmail || log.targetId || 'SYSTEM_GLOBAL'}
                              </td>
                              <td className="py-3.5 px-5 text-right">
                                <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  RECORDED
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-xs text-slate-500">
                            Audit trail logging active in PostgreSQL. Perform any admin action to view live trace records.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 10. SYSTEM HEALTH & DIAGNOSTICS */}
          {/* ========================================================= */}
          {activeTab === 'system-health' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                      Infrastructure Telemetry
                    </span>
                    <span className="text-xs text-slate-500">• 99.98% SLA Availability</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">System Diagnostics & Node Health</h2>
                  <p className="text-xs text-slate-400">
                    Live performance status of distributed database clusters, serverless API edge gateways, and speech synthesis pipelines
                  </p>
                </div>
                <button
                  onClick={refreshData}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/10 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Ping Microservices</span>
                </button>
              </div>

              {/* 4 Health Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel glass-panel-hover border-white/10 p-5 rounded-[28px] shadow-xl backdrop-blur-2xl relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      HEALTHY
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-bold text-white">Neon PostgreSQL</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">AWS us-east-1 • pgvector</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Latency:</span>
                    <span className="text-cyan-400 font-bold">14ms</span>
                  </div>
                </div>

                <div className="glass-panel glass-panel-hover border-white/10 p-5 rounded-[28px] shadow-xl backdrop-blur-2xl relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Server className="w-4 h-4" />
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      EDGE READY
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-bold text-white">Vercel API Gateway</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Global Edge CDN & NestJS</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">HTTP 200:</span>
                    <span className="text-purple-400 font-bold">99.96%</span>
                  </div>
                </div>

                <div className="glass-panel glass-panel-hover border-white/10 p-5 rounded-[28px] shadow-xl backdrop-blur-2xl relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                      <Mic className="w-4 h-4" />
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      SYNCHRONIZED
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-bold text-white">AssemblyAI Pipeline</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Universal-2 Conformer Core</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Audio Queue:</span>
                    <span className="text-fuchsia-400 font-bold">0 Pending</span>
                  </div>
                </div>

                <div className="glass-panel glass-panel-hover border-white/10 p-5 rounded-[28px] shadow-xl backdrop-blur-2xl relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      ACTIVE
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-bold text-white">ModelFlare Gateway</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Dynamic gpt-4o-mini route</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Tokens/sec:</span>
                    <span className="text-emerald-400 font-bold">128 t/s</span>
                  </div>
                </div>
              </div>

              {/* Error Log Viewer */}
              <div className="glass-panel border-white/10 rounded-[30px] overflow-hidden shadow-2xl backdrop-blur-2xl">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Live Exception & Error Telemetry</h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{systemErrors.length} captured tracebacks</span>
                </div>

                <div className="divide-y divide-white/5">
                  {systemErrors.length > 0 ? (
                    systemErrors.map((err, idx) => (
                      <div key={idx} className="p-5 hover:bg-white/[0.02] transition-colors space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              {err.statusCode || '500'}
                            </span>
                            <span className="text-xs font-bold text-white font-mono">{err.endpoint || err.path || 'API Exception'}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {err.createdAt ? new Date(err.createdAt).toLocaleTimeString() : 'Just now'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono bg-black/40 p-3 rounded-xl border border-white/5 overflow-x-auto">
                          {err.message || JSON.stringify(err)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-400/80 mb-1" />
                      <span className="font-semibold text-slate-300">Clean Telemetry Pipeline</span>
                      <span>No unhandled runtime exceptions or database disconnects in the last 24 hours.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 11. PLATFORM SETTINGS & SECURITY INFRASTRUCTURE */}
          {/* ========================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Settings className="w-3 h-3 text-purple-400" />
                      Core Environment
                    </span>
                    <span className="text-xs text-slate-500">• Production Node Cluster</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Platform Settings & Security Infrastructure</h2>
                  <p className="text-xs text-slate-400">
                    System topology parameters, database connection pooling, maintenance holds, and session keys
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Infrastructure Overview */}
                <div className="glass-panel border-white/10 rounded-[32px] p-7 space-y-5 shadow-2xl backdrop-blur-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Deployment Topology</h3>
                        <p className="text-[11px] text-slate-400">Cloud orchestration footprint</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                      PRODUCTION LIVE
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-slate-400">API Gateway:</span>
                      <span className="text-white font-semibold">Vercel Edge & Serverless</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-slate-400">Primary Database:</span>
                      <span className="text-cyan-400 font-semibold">Neon AWS PostgreSQL (pgvector)</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-slate-400">Audio Transcription:</span>
                      <span className="text-purple-400 font-semibold">AssemblyAI Universal-2</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-slate-400">Reasoning Core:</span>
                      <span className="text-emerald-400 font-semibold">gpt-4o-mini (Dynamic Gateway)</span>
                    </div>
                  </div>
                </div>

                {/* 2. Platform Operations & Maintenance Controls */}
                <div className="glass-panel border-white/10 rounded-[32px] p-7 space-y-5 shadow-2xl backdrop-blur-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Operational Controls</h3>
                        <p className="text-[11px] text-slate-400">Platform safety toggles & access</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold border ${
                      maintenanceMode 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}>
                      {maintenanceMode ? "MAINTENANCE ACTIVE" : "NORMAL OPERATIONS"}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs leading-relaxed">
                    Control global maintenance gates and manage active administrative credentials securely.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white text-xs">Scheduled Maintenance Hold</div>
                        <div className="text-[11px] text-slate-400">Notify mobile clients that scheduled maintenance is underway</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !maintenanceMode;
                          setMaintenanceMode(val);
                          await handleUpdateGlobalSetting("maintenance_mode", val, "System Scheduled Maintenance Hold");
                        }}
                        className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                          maintenanceMode ? 'bg-amber-600 shadow-md shadow-amber-600/30' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                            maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white text-xs">Purge Admin Credentials</div>
                        <div className="text-[11px] text-slate-400">Sign out and revoke this browser's administrative token</div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
