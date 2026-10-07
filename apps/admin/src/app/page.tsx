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
  TrendingUp,
  AlertTriangle,
  Megaphone,
  UserCheck,
  UserX,
  CreditCard,
  Zap,
  Mic,
} from 'lucide-react';
import { adminFetch, getAdminToken, setAdminToken, clearAdminToken } from '../lib/api';

type Tab =
  | 'overview'
  | 'users'
  | 'ai-providers'
  | 'feature-flags'
  | 'ads'
  | 'announcements'
  | 'audit-logs'
  | 'system-health';

export default function AdminDashboard() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Login Modal State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userTierFilter, setUserTierFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

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
      const [m, u, p, f, s, a, l, e] = await Promise.all([
        adminFetch('/admin/overview').catch(() => null),
        adminFetch('/admin/users?limit=40').catch(() => ({ users: [] })),
        adminFetch('/admin/ai/providers').catch(() => []),
        adminFetch('/admin/features').catch(() => []),
        adminFetch('/admin/settings').catch(() => ({})),
        adminFetch('/admin/announcements').catch(() => []),
        adminFetch('/admin/audit?limit=25').catch(() => ({ logs: [] })),
        adminFetch('/admin/system/errors?limit=15').catch(() => []),
      ]);

      if (m) setMetrics(m);
      if (u?.users) setUsersList(u.users);
      if (Array.isArray(p)) setAiProviders(p);
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
      showToast('Welcome back, Administrator');
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
    showToast('Logged out of Admin Portal');
  };

  // ==========================================
  // USER ACTIONS
  // ==========================================
  const handleSearchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminFetch(
        `/admin/users?search=${encodeURIComponent(userSearch)}&tier=${userTierFilter === 'ALL' ? '' : userTierFilter}`
      );
      setUsersList(res.users || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTier = async (user: any) => {
    const newTier = user.subscriptionTier === 'PRO' ? 'FREE' : 'PRO';
    try {
      await adminFetch(`/admin/users/${user.id}/tier`, {
        method: 'Put',
        body: JSON.stringify({ tier: newTier, durationDays: newTier === 'PRO' ? 30 : undefined }),
      });
      showToast(`User ${user.email} updated to ${newTier}`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleSuspend = async (user: any) => {
    try {
      if (user.isSuspended) {
        await adminFetch(`/admin/users/${user.id}/unsuspend`, { method: 'POST' });
        showToast(`User ${user.email} unsuspended`);
      } else {
        const reason = prompt(`Enter reason to suspend ${user.email}:`, 'Violation of Terms');
        if (!reason) return;
        await adminFetch(`/admin/users/${user.id}/suspend`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        showToast(`User ${user.email} suspended`);
      }
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleResetQuota = async (userId: string) => {
    try {
      await adminFetch(`/admin/users/${userId}/reset-quota`, { method: 'POST' });
      showToast('AI quota reset to 0');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // ==========================================
  // AI PROVIDER ACTIONS
  // ==========================================
  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/admin/ai/providers', {
        method: 'POST',
        body: JSON.stringify(providerForm),
      });
      showToast(`AI Provider ${providerForm.name} saved successfully`);
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
      if (res.success) {
        setTestResult({
          id: providerId,
          success: true,
          message: `Connected! Latency: ${res.latencyMs}ms. Response: "${res.response}"`,
        });
        showToast('AI Provider test passed!');
      } else {
        setTestResult({
          id: providerId,
          success: false,
          message: res.error || 'Connection failed',
        });
      }
      refreshData();
    } catch (err: any) {
      setTestResult({
        id: providerId,
        success: false,
        message: err.message || 'Error executing health test',
      });
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!confirm(`Delete AI provider "${name}"?`)) return;
    try {
      await adminFetch(`/admin/ai/providers/${id}`, { method: 'DELETE' });
      showToast(`Provider ${name} deleted`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleTestAssemblyAi = async () => {
    setIsTestingAssemblyAi(true);
    setAssemblyAiTestResult(null);
    try {
      const res = await adminFetch('/admin/ai/assemblyai/test', {
        method: 'POST',
        body: JSON.stringify({ apiKey: assemblyAiKey || undefined }),
      });
      setAssemblyAiTestResult({ success: res.success, message: res.message });
      if (res.success) {
        showToast('AssemblyAI Universal-3.5 Pro test passed!');
      }
    } catch (err: any) {
      setAssemblyAiTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTestingAssemblyAi(false);
    }
  };

  const handleSaveAssemblyAiKey = async () => {
    if (!assemblyAiKey.trim()) {
      alert('Please enter a valid AssemblyAI API key');
      return;
    }
    setIsSavingAssemblyAi(true);
    try {
      await adminFetch('/admin/settings/assemblyai_api_key', {
        method: 'PUT',
        body: JSON.stringify({
          value: assemblyAiKey.trim(),
          description: 'AssemblyAI Universal-3.5 Pro API key for audio transcription',
        }),
      });
      showToast('AssemblyAI API key saved & activated globally');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save AssemblyAI key');
    } finally {
      setIsSavingAssemblyAi(false);
    }
  };

  // ==========================================
  // FEATURE FLAGS & ADS
  // ==========================================
  const handleToggleFeature = async (flag: any) => {
    try {
      await adminFetch(`/admin/features/${flag.key}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: !flag.isEnabled }),
      });
      showToast(`Feature "${flag.name}" toggled`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveAdConfig = async (enabled: boolean) => {
    try {
      await adminFetch(`/admin/settings/ads_config`, {
        method: 'PUT',
        body: JSON.stringify({
          value: {
            masterEnabled: enabled,
            homeBanner: enabled,
            notesListBanner: enabled,
            suppressedInMeeting: true,
            suppressedInRecording: true,
            suppressedForPro: true,
          },
        }),
      });
      showToast(`Global Ad configuration updated`);
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.message) return;
    try {
      await adminFetch('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(newAnnouncement),
      });
      showToast('Announcement broadcasted to users');
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Mindora Admin</h1>
              <p className="text-xs text-slate-400">Operations & Control Center</p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 text-xs text-slate-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
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
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
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
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
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
  // AUTHENTICATED ADMIN CONSOLE
  // ------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Admin Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Mindora Executive Admin</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
                RBAC LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Production SaaS Operations & Controls</p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-slate-700"
            title="Refresh All Operations Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1 bg-emerald-950/80 text-emerald-400 rounded-full border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Gateways Online
          </span>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 transition-all border border-slate-700"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Administrative Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 p-4 space-y-1.5 shrink-0 hidden md:block">
          <div className="text-[10px] uppercase font-bold text-slate-500 px-3 py-2 tracking-wider">
            Operational Modules
          </div>

          {[
            { id: 'overview', label: 'Executive Dashboard', icon: Activity },
            { id: 'users', label: 'User Directory & Quotas', icon: Users },
            { id: 'ai-providers', label: 'AI Providers & Hot-Swap', icon: BrainCircuit },
            { id: 'feature-flags', label: 'Feature Flags & Rollouts', icon: Sliders },
            { id: 'ads', label: 'Ad Network & Safety Rules', icon: Radio },
            { id: 'announcements', label: 'Broadcast Announcements', icon: Megaphone },
            { id: 'audit-logs', label: 'Audit Trail & Compliance', icon: History },
            { id: 'system-health', label: 'Diagnostics & Health', icon: HardDrive },
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {errorMsg && (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">✕</button>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. EXECUTIVE DASHBOARD TAB */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Executive Operations Dashboard</h2>
                  <p className="text-xs text-slate-400">Live PostgreSQL metrics, RevenueCat synchronization & AI Gateway usage</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300 font-mono">
                    Provider: {metrics?.ai?.primaryProvider || 'OpenAI-Compatible Gateway'}
                  </span>
                </div>
              </div>

              {/* Top 4 Real KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</span>
                    <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-900">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-white">{metrics?.users?.total ?? '—'}</div>
                    <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                      <TrendingUp className="w-3 h-3" />
                      <span>{metrics?.users?.activeToday ?? 0} active in last 24h</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pro Monthly Revenue</span>
                    <div className="p-2 bg-purple-950 text-purple-400 rounded-xl border border-purple-900">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-white">
                      ${metrics?.revenue?.mrr ? metrics.revenue.mrr.toFixed(2) : '0.00'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">
                      {metrics?.users?.pro ?? 0} Pro Subs ({metrics?.users?.conversionRate ?? '0%'} conversion)
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Tokens Consumed</span>
                    <div className="p-2 bg-amber-950 text-amber-400 rounded-xl border border-amber-900">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-white font-mono">
                      {metrics?.ai?.monthlyTokens
                        ? (metrics.ai.monthlyTokens / 1000).toFixed(1) + 'k'
                        : '0k'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Est. Provider Cost: ${metrics?.ai?.estimatedAiCost ?? '0.00'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Second Brain Entities</span>
                    <div className="p-2 bg-sky-950 text-sky-400 rounded-xl border border-sky-900">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-white">
                      {(metrics?.product?.notes ?? 0) + (metrics?.product?.meetings ?? 0)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {metrics?.product?.notes ?? 0} notes • {metrics?.product?.meetings ?? 0} meetings • {metrics?.product?.tasks ?? 0} tasks
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Stream & Quick Operations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-time Audit Trail */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Live Administrative Audit Stream</h3>
                      <p className="text-[11px] text-slate-400">Verifiable server-side logging of all operational actions</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('audit-logs')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {metrics?.recentAudits && metrics.recentAudits.length > 0 ? (
                      metrics.recentAudits.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{item.action}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {item.targetEmail || item.targetType}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              By <span className="text-indigo-300">{item.adminEmail}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/50">
                        No administrative operations recorded yet. Every action performed in this console is automatically logged here.
                      </div>
                    )}
                  </div>
                </div>

                {/* Gateway Routing Status */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-white">AI Gateway Routing</h3>
                  <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Active Providers</span>
                      <span className="font-mono text-indigo-400 font-bold">{metrics?.ai?.activeProvidersCount ?? 1} configured</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Primary Provider</span>
                      <span className="font-medium text-white">{metrics?.ai?.primaryProvider ?? 'ModelFlare'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Chat & Reasoning</span>
                      <span className="font-mono text-purple-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        gpt-4o-mini
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Audio Transcription</span>
                      <span className="font-mono text-emerald-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        whisper-1
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('ai-providers')}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20"
                  >
                    Configure Providers & Hot-Swap →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. USER DIRECTORY & QUOTAS TAB */}
          {/* ========================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">User Directory & Quota Overrides</h2>
                  <p className="text-xs text-slate-400">Manage customer subscriptions, grant Pro licenses, suspend accounts, and reset quotas</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={userTierFilter}
                    onChange={(e) => setUserTierFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">All Plans</option>
                    <option value="PRO">Pro Subscribers</option>
                    <option value="FREE">Free Tier</option>
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search email or ID..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                      className="pl-8 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleSearchUsers}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Plan</th>
                        <th className="py-3 px-4">Monthly Tokens</th>
                        <th className="py-3 px-4">Notes / Tasks</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {usersList.length > 0 ? (
                        usersList.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-white">{user.fullName || 'Mindora User'}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  user.subscriptionTier === 'PRO'
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {user.subscriptionTier}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              {(user.monthlyAiTokensUsed || 0).toLocaleString()} tokens
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {user._count?.notes ?? 0} notes • {user._count?.tasks ?? 0} tasks
                            </td>
                            <td className="py-3.5 px-4">
                              {user.isSuspended ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                                  SUSPENDED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                  ACTIVE
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <button
                                onClick={() => handleToggleTier(user)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                  user.subscriptionTier === 'PRO'
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    : 'bg-purple-900 hover:bg-purple-800 text-purple-200'
                                }`}
                              >
                                {user.subscriptionTier === 'PRO' ? 'Revoke Pro' : 'Grant Pro'}
                              </button>
                              <button
                                onClick={() => handleResetQuota(user.id)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                              >
                                Reset Quota
                              </button>
                              <button
                                onClick={() => handleToggleSuspend(user)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                  user.isSuspended
                                    ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                                    : 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800'
                                }`}
                              >
                                {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                            No users found matching query.
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
          {/* 3. AI PROVIDERS & HOT-SWAP TAB */}
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
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Provider
                </button>
              </div>

              {/* AssemblyAI Universal-3.5 Pro Speech Engine Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      AssemblyAI API Key (Saved in System Settings)
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={assemblyAiKey}
                        onChange={(e) => setAssemblyAiKey(e.target.value)}
                        placeholder="e.g. 984d5db83ae34999a30d75b879b66c80"
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={handleTestAssemblyAi}
                      disabled={isTestingAssemblyAi}
                      className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
                    >
                      <Play className={`w-3.5 h-3.5 ${isTestingAssemblyAi ? 'animate-spin' : ''}`} />
                      <span>{isTestingAssemblyAi ? 'Testing...' : 'Test Key'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAssemblyAiKey}
                      disabled={isSavingAssemblyAi}
                      className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSavingAssemblyAi ? 'Saving...' : 'Save & Activate'}</span>
                    </button>
                  </div>
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
              </div>

              {/* Provider List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiProviders.length > 0 ? (
                  aiProviders.map((prov) => (
                    <div
                      key={prov.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
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

                      <div className="space-y-2 text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <div className="truncate"><span className="text-slate-500">Base URL:</span> {prov.baseUrl}</div>
                        <div><span className="text-slate-500">API Key:</span> •••••••••••••••• (Stored securely)</div>
                        <div><span className="text-slate-500">Chat Model:</span> <span className="text-indigo-400">{prov.chatModel}</span></div>
                        {prov.lastStatus && (
                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800 text-[11px]">
                            <span className="text-slate-500">Health:</span>
                            <span className={prov.lastStatus === 'OPERATIONAL' ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                              {prov.lastStatus} ({prov.lastLatencyMs || 0}ms)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Test feedback */}
                      {testResult && testResult.id === prov.id && (
                        <div
                          className={`p-3 rounded-xl text-xs border ${
                            testResult.success
                              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                              : 'bg-red-950/70 border-red-800 text-red-300'
                          }`}
                        >
                          {testResult.message}
                        </div>
                      )}

                      {/* Card Actions */}
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
                  <div className="md:col-span-2 p-8 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                    No custom AI providers configured in DB yet. The backend is currently using environment defaults (AI_BASE_URL / OPENAI_BASE_URL). Click "Add New Provider" above to add dynamic providers.
                  </div>
                )}
              </div>

              {/* Provider Modal Form */}
              {isEditingProvider && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                  <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
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
                          placeholder="e.g. OpenAI / Groq / OpenRouter / Custom"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Base URL</label>
                        <input
                          type="text"
                          required
                          value={providerForm.baseUrl}
                          onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
                          placeholder="https://api.openai.com/v1"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none"
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
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Chat Model</label>
                          <input
                            type="text"
                            required
                            value={providerForm.chatModel}
                            onChange={(e) => setProviderForm({ ...providerForm, chatModel: e.target.value })}
                            placeholder="gpt-4o-mini"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Priority (1 = Highest)</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={providerForm.priority}
                            onChange={(e) => setProviderForm({ ...providerForm, priority: parseInt(e.target.value, 10) || 1 })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingProvider(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                        >
                          Save & Activate Provider
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. FEATURE FLAGS & ROLLOUTS TAB */}
          {/* ========================================================= */}
          {activeTab === 'feature-flags' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Feature Flags & Remote Configuration</h2>
                <p className="text-xs text-slate-400">Instantly activate or kill features across mobile and backend without app store releases</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-800">
                {featureFlags.map((flag) => (
                  <div key={flag.key} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{flag.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {flag.key}
                        </span>
                        {flag.isProOnly && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                            PRO ONLY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{flag.description}</p>
                    </div>

                    <button
                      onClick={() => handleToggleFeature(flag)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        flag.isEnabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {flag.isEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. AD NETWORK & SAFETY CONTROLS TAB */}
          {/* ========================================================= */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Ad Network Monetization & Safety Guardrails</h2>
                <p className="text-xs text-slate-400">Control non-intrusive native ad slots and ensure absolute compliance with distraction-free second brain rules</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Global Advertising Master Switch</h3>
                      <p className="text-xs text-slate-400">Toggles Google AdMob / native banner slots across all mobile clients</p>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => handleSaveAdConfig(true)}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20"
                    >
                      Enable Ads (Free Tier Only)
                    </button>
                    <button
                      onClick={() => handleSaveAdConfig(false)}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all border border-slate-700"
                    >
                      Disable Ads Globally
                    </button>
                  </div>
                </div>

                {/* Safety Rules Display */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                    <h3 className="text-sm font-bold">Hard-Coded Anti-Interruption Guardrails</h3>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li><strong className="text-white">Pro Subscribers:</strong> 100% ad-free experience guaranteed.</li>
                    <li><strong className="text-white">Meeting Mode:</strong> Ads permanently suppressed during recording & distillation.</li>
                    <li><strong className="text-white">Voice & Typing:</strong> Never interrupt user focus or note editor sessions.</li>
                    <li><strong className="text-white">AI Conversations:</strong> Zero popup or interstitial interruptions.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. BROADCAST ANNOUNCEMENTS TAB */}
          {/* ========================================================= */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">System Announcements & Product Updates</h2>
                <p className="text-xs text-slate-400">Broadcast maintenance notices or release alerts directly to user feeds</p>
              </div>

              {/* Create Announcement Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-white">Create New Broadcast</h3>
                <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Headline</label>
                      <input
                        type="text"
                        required
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        placeholder="e.g. New AI Meeting Mode is now live!"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Audience</label>
                      <select
                        value={newAnnouncement.targetTier}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetTier: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                      >
                        <option value="ALL">All Users</option>
                        <option value="PRO">Pro Subscribers Only</option>
                        <option value="FREE">Free Tier Only</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Message Body</label>
                    <textarea
                      rows={2}
                      required
                      value={newAnnouncement.message}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                      placeholder="Detailed announcement content..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
                  >
                    Broadcast to Users
                  </button>
                </form>
              </div>

              {/* Existing Announcements */}
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-400">
                          {item.targetTier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{item.message}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. AUDIT TRAIL TAB */}
          {/* ========================================================= */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Administrative Audit Trail</h2>
                <p className="text-xs text-slate-400">Tamper-evident chronological log of every administrative operation and security event</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Admin</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 font-mono text-[11px]">
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-indigo-300 font-semibold">{log.adminEmail}</td>
                        <td className="py-3 px-4 text-white font-bold">{log.action}</td>
                        <td className="py-3 px-4 text-slate-300">{log.targetEmail || log.targetType}</td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                          {JSON.stringify(log.details || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 8. SYSTEM HEALTH & DIAGNOSTICS TAB */}
          {/* ========================================================= */}
          {activeTab === 'system-health' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">System Health & Live Error Telemetry</h2>
                <p className="text-xs text-slate-400">Service availability, backend database connectivity and automated exception logs</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-500 uppercase font-bold">API Backend</div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Operational
                  </div>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-500 uppercase font-bold">PostgreSQL + pgvector</div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Operational
                  </div>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-500 uppercase font-bold">AI Providers</div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> AI Gateway (OpenAI Compatible) Online
                  </div>
                </div>
              </div>

              {/* Error Log */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-white">Recent System Errors</h3>
                {systemErrors.length > 0 ? (
                  <div className="space-y-2">
                    {systemErrors.map((err) => (
                      <div key={err.id} className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between text-red-300 font-mono font-bold">
                          <span>{err.type}</span>
                          <span className="text-[10px] text-slate-400">{new Date(err.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-300">{err.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/40">
                    No runtime errors logged.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
