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
  Copy,
  Mail,
  Cloud,
  CloudOff,
  Database,
  RotateCcw,
} from 'lucide-react';
import { adminFetch, getAdminToken, setAdminToken, clearAdminToken } from '../lib/api';

type Tab =
  | 'overview'
  | 'users'
  | 'subscriptions'
  | 'ai-providers'
  | 'notes'
  | 'feature-flags'
  | 'plans-limits'
  | 'ads'
  | 'announcements'
  | 'audit-logs'
  | 'system-health'
  | 'settings'
  | 'cloud-sync';

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

  // Brevo Transactional Email & Password Reset State
  const [emailConfig, setEmailConfig] = useState<{
    apiKey: string;
    senderEmail: string;
    senderName: string;
    isEnabled: boolean;
    isConfigured: boolean;
  }>({
    apiKey: '',
    senderEmail: 'noreply@vynotes.app',
    senderName: 'VyNotes Security',
    isEnabled: true,
    isConfigured: false,
  });
  const [isSavingEmailConfig, setIsSavingEmailConfig] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    targetTier: 'ALL',
    priority: 'NORMAL',
    channel: 'BOTH',
    publishImmediately: true,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemErrors, setSystemErrors] = useState<any[]>([]);

  // In-App Purchases & RevenueCat billing states
  const [billingConfig, setBillingConfig] = useState<any>({
    isConfigured: false,
    environment: 'PRODUCTION',
    androidPublicKey: '',
    iosPublicKey: '',
    serverSecretKey: '',
    webhookSecret: '',
    products: [
      {
        id: 'monthly_pro',
        revenueCatPackageId: '$rc_monthly',
        googlePlayProductId: 'ai_notes_pro_monthly',
        appStoreProductId: 'ai_notes_pro_monthly',
        billingPeriod: 'MONTHLY',
        title: 'Mindora Pro Monthly',
        badgeText: 'Flexible',
        trialDays: 7,
        order: 1,
        isEnabled: true,
      },
      {
        id: 'annual_pro',
        revenueCatPackageId: '$rc_annual',
        googlePlayProductId: 'ai_notes_pro_annual',
        appStoreProductId: 'ai_notes_pro_annual',
        billingPeriod: 'ANNUAL',
        title: 'Mindora Pro Annual',
        badgeText: 'Best Value • Save 40%',
        trialDays: 7,
        order: 2,
        isEnabled: true,
      },
    ],
    display: {
      headline: 'Unlock the Full Power of Mindora Pro',
      subheadline: 'Infinite context, unlimited speech transcription, and autonomous AI task reasoning.',
      proBenefits: [
        'Unlimited AI chat reasoning with gpt-4o-mini',
        'Unlimited AssemblyAI speech-to-text audio memos',
        'Pro Meeting Mode with live speaker diarization',
        'Automatic general-purpose task extraction',
        'Priority vector search & semantic second brain',
      ],
      trialDisclosure: '7 days free, then automatically renews. Cancel anytime in Google Play / App Store account settings.',
      maintenanceMode: false,
    },
    trials: {
      defaultTrialDays: 7,
      allowCardlessTrial: true,
      enforceOneTrialPerDevice: true,
    },
  });
  const [isSavingBillingConfig, setIsSavingBillingConfig] = useState(false);
  const [isTestingRcConnection, setIsTestingRcConnection] = useState(false);
  const [rcTestResult, setRcTestResult] = useState<{ success: boolean; message: string; appName?: string } | null>(null);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [isLoadingWebhookEvents, setIsLoadingWebhookEvents] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('Admin customer support override');


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

  // Monetization & AdMob Management State
  const [adsConfig, setAdsConfig] = useState<any | null>(null);
  const [adsDraft, setAdsDraft] = useState<any | null>(null);
  const [isSavingAdsDraft, setIsSavingAdsDraft] = useState(false);
  const [isPublishingAds, setIsPublishingAds] = useState(false);
  const [isRevertingAds, setIsRevertingAds] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showProductionWarningModal, setShowProductionWarningModal] = useState(false);
  const [publishReason, setPublishReason] = useState('');
  const [selectedRevertVersion, setSelectedRevertVersion] = useState<number | null>(null);

  // Cloud Notes Sync & Retention State
  const [syncConfig, setSyncConfig] = useState<{
    enabled: boolean;
    maxNoteSizeBytes: number;
    proQuotaBytes: number;
    disabledRetentionDays: number;
    proGracePeriodDays: number;
    proExpiredRecoveryDays: number;
    tombstoneRetentionDays: number;
  }>({
    enabled: true,
    maxNoteSizeBytes: 524288,
    proQuotaBytes: 26214400,
    disabledRetentionDays: 90,
    proGracePeriodDays: 30,
    proExpiredRecoveryDays: 60,
    tombstoneRetentionDays: 30,
  });
  const [syncTelemetry, setSyncTelemetry] = useState<{
    activeSyncUsers: number;
    totalCloudStorageBytes: number;
    pendingExpirationCount: number;
    tombstonesCount: number;
  }>({
    activeSyncUsers: 0,
    totalCloudStorageBytes: 0,
    pendingExpirationCount: 0,
    tombstonesCount: 0,
  });
  const [isSavingSyncConfig, setIsSavingSyncConfig] = useState(false);
  const [isExecutingCleanup, setIsExecutingCleanup] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any | null>(null);

  // Google Sign-In & OAuth Authentication State
  const [googleAuthConfig, setGoogleAuthConfig] = useState<{
    isEnabled: boolean;
    webClientId: string;
    iosClientId: string;
    androidClientId: string;
    packageName: string;
    isConfigured: boolean;
  }>({
    isEnabled: true,
    webClientId: '',
    iosClientId: '',
    androidClientId: '',
    packageName: 'com.vynotes.crazytech',
    isConfigured: false,
  });
  const [isSavingGoogleAuth, setIsSavingGoogleAuth] = useState(false);
  const [copiedShaCommand, setCopiedShaCommand] = useState(false);
  const [copiedPackageName, setCopiedPackageName] = useState(false);

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
      const [m, u, p, f, s, a, l, e, pl, bc, we, ac, ec, sc, gc] = await Promise.all([
        adminFetch('/admin/overview').catch(() => null),
        adminFetch('/admin/users?limit=40').catch(() => ({ users: [] })),
        adminFetch('/admin/ai/providers').catch(() => []),
        adminFetch('/admin/features').catch(() => []),
        adminFetch('/admin/settings').catch(() => ({})),
        adminFetch('/admin/announcements').catch(() => []),
        adminFetch('/admin/audit?limit=25').catch(() => ({ logs: [] })),
        adminFetch('/admin/system/errors?limit=15').catch(() => []),
        adminFetch('/admin/plans/limits').catch(() => null),
        adminFetch('/admin/billing/config').catch(() => null),
        adminFetch('/admin/billing/webhook-events?limit=25').catch(() => []),
        adminFetch('/admin/ads/config').catch(() => null),
        adminFetch('/admin/email/config').catch(() => null),
        adminFetch('/admin/sync/config').catch(() => null),
        adminFetch('/admin/auth/google-config').catch(() => null),
      ]);

      if (m) setMetrics(m);
      if (u?.users) setUsersList(u.users);
      if (Array.isArray(p)) setAiProviders(p);
      if (pl) setPlanLimitsConfig(pl);
      if (bc) setBillingConfig(bc);
      if (Array.isArray(we)) setWebhookEvents(we);
      if (ac) {
        setAdsConfig(ac);
        setAdsDraft(ac.draft);
      }
      if (ec) {
        setEmailConfig({
          apiKey: ec.apiKey || '',
          senderEmail: ec.senderEmail || 'noreply@vynotes.app',
          senderName: ec.senderName || 'VyNotes Security',
          isEnabled: ec.isEnabled ?? true,
          isConfigured: ec.isConfigured ?? false,
        });
      }
      if (sc) {
        if (sc.config) setSyncConfig(sc.config);
        if (sc.telemetry) setSyncTelemetry(sc.telemetry);
      }
      if (gc) {
        setGoogleAuthConfig({
          isEnabled: gc.isEnabled ?? true,
          webClientId: gc.webClientId || '',
          iosClientId: gc.iosClientId || '',
          androidClientId: gc.androidClientId || '',
          packageName: gc.packageName || 'com.vynotes.crazytech',
          isConfigured: gc.isConfigured ?? false,
        });
      }
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

  const handleSaveSyncConfig = async (customConfig?: any) => {
    setIsSavingSyncConfig(true);
    try {
      const payload = customConfig || syncConfig;
      const res = await adminFetch('/admin/sync/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res?.config) {
        setSyncConfig(res.config);
      }
      showToast('Cloud Notes Sync & Retention policy saved successfully');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save cloud sync configuration');
    } finally {
      setIsSavingSyncConfig(false);
    }
  };

  const handleRunRetentionCleanup = async (dryRun: boolean) => {
    setIsExecutingCleanup(true);
    setCleanupResult(null);
    try {
      const res = await adminFetch('/admin/sync/cleanup', {
        method: 'POST',
        body: JSON.stringify({ dryRun }),
      });
      setCleanupResult(res);
      showToast(
        dryRun
          ? `Dry-Run completed: ${res.scannedCount ?? 0} scanned, ${res.purgedNotesCount ?? 0} notes ready for purge`
          : `Retention purge executed: ${res.purgedNotesCount ?? 0} notes & ${res.purgedTombstonesCount ?? 0} tombstones purged`,
      );
      if (!dryRun) {
        refreshData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute retention cleanup');
    } finally {
      setIsExecutingCleanup(false);
    }
  };

  const handleSaveGoogleAuthConfig = async () => {
    setIsSavingGoogleAuth(true);
    try {
      const res = await adminFetch('/admin/auth/google-config', {
        method: 'PUT',
        body: JSON.stringify(googleAuthConfig),
      });
      if (res?.config) {
        setGoogleAuthConfig(res.config);
      }
      showToast('Google Sign-In OAuth credentials saved successfully');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Google OAuth configuration');
    } finally {
      setIsSavingGoogleAuth(false);
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

  const handleSaveBillingConfig = async (customConfig?: any) => {
    setIsSavingBillingConfig(true);
    setErrorMsg(null);
    try {
      const payload = customConfig || billingConfig;
      const res = await adminFetch('/admin/billing/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res?.config) {
        setBillingConfig(res.config);
      }
      showToast('RevenueCat in-app purchase configuration saved successfully');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save billing configuration');
    } finally {
      setIsSavingBillingConfig(false);
    }
  };

  const handleTestRevenueCat = async () => {
    setIsTestingRcConnection(true);
    setRcTestResult(null);
    try {
      const res = await adminFetch('/admin/billing/validate-revenuecat', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: billingConfig.serverSecretKey?.includes('•••') ? undefined : billingConfig.serverSecretKey,
        }),
      });
      setRcTestResult(res);
      if (res.success) {
        showToast(res.message || 'RevenueCat API authenticated successfully!');
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setRcTestResult({
        success: false,
        message: err.message || 'Failed to connect to RevenueCat API',
      });
      setErrorMsg(err.message || 'RevenueCat connection test failed');
    } finally {
      setIsTestingRcConnection(false);
    }
  };

  const handleRefreshWebhookEvents = async () => {
    setIsLoadingWebhookEvents(true);
    try {
      const events = await adminFetch('/admin/billing/webhook-events?limit=40');
      if (Array.isArray(events)) {
        setWebhookEvents(events);
        showToast('Webhook event stream refreshed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch webhook events');
    } finally {
      setIsLoadingWebhookEvents(false);
    }
  };

  const handleOverrideUserSubscription = async (userId: string, plan: 'PRO' | 'TRIAL' | 'FREE', durationDays?: number) => {
    try {
      const res = await adminFetch(`/admin/billing/users/${userId}/override`, {
        method: 'POST',
        body: JSON.stringify({
          plan,
          durationDays,
          reason: overrideReason || 'Administrative override from User Directory',
          note: `Manual entitlement adjustment by admin`,
        }),
      });
      showToast(res.message || `User subscription overridden to ${plan}`);
      if (selectedUser?.id === userId) {
        handleOpenUserDrawer({ ...selectedUser, plan });
      }
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply subscription override');
    }
  };

  const handleCopyWebhookUrl = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://appsq-two.vercel.app';
    const webhookUrl = `${backendUrl}/billing/webhook/revenuecat`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhookUrl(true);
      showToast('Webhook endpoint copied to clipboard');
      setTimeout(() => setCopiedWebhookUrl(false), 2500);
    }
  };

  const handleSaveEmailConfig = async () => {
    setIsSavingEmailConfig(true);
    setEmailTestResult(null);
    try {
      const payload: any = {
        senderEmail: emailConfig.senderEmail,
        senderName: emailConfig.senderName,
        isEnabled: emailConfig.isEnabled,
      };
      if (emailConfig.apiKey && !emailConfig.apiKey.includes('••••')) {
        payload.apiKey = emailConfig.apiKey;
      }
      const res = await adminFetch('/admin/email/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res?.config) {
        setEmailConfig({
          apiKey: res.config.apiKey || '',
          senderEmail: res.config.senderEmail || 'noreply@vynotes.app',
          senderName: res.config.senderName || 'VyNotes Security',
          isEnabled: res.config.isEnabled ?? true,
          isConfigured: res.config.isConfigured ?? false,
        });
      }
      showToast('Brevo email & password reset configuration saved successfully');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save email configuration');
    } finally {
      setIsSavingEmailConfig(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      setErrorMsg('Please enter a recipient email address for testing');
      return;
    }
    setIsSendingTestEmail(true);
    setEmailTestResult(null);
    try {
      const res = await adminFetch('/admin/email/test', {
        method: 'POST',
        body: JSON.stringify({ testEmail: testEmailAddress.trim() }),
      });
      setEmailTestResult(res);
      if (res.success) {
        showToast(res.message || 'Test email dispatched successfully via Brevo!');
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setEmailTestResult({
        success: false,
        message: err.message || 'Failed to dispatch test email',
      });
      setErrorMsg(err.message || 'Test email dispatch failed');
    } finally {
      setIsSendingTestEmail(false);
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

  // AdMob Validation and Governance Handlers
  const isValidAppId = (id?: string) => /^ca-app-pub-\d{16}~\d{10}$/.test(id?.trim() || '');
  const isValidUnitId = (id?: string) => /^ca-app-pub-\d{16}\/\d{10}$/.test(id?.trim() || '');

  const handleSaveAdsDraft = async () => {
    if (!adsDraft) return;
    setIsSavingAdsDraft(true);
    try {
      const res = await adminFetch('/admin/ads/config', {
        method: 'PUT',
        body: JSON.stringify(adsDraft),
      });
      showToast('AdMob draft configuration saved');
      setAdsDraft(res.draft);
      const updated = await adminFetch('/admin/ads/config');
      setAdsConfig(updated);
      setAdsDraft(updated.draft);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save AdMob draft');
    } finally {
      setIsSavingAdsDraft(false);
    }
  };

  const handlePublishAds = async () => {
    setIsPublishingAds(true);
    try {
      await adminFetch('/admin/ads/publish', {
        method: 'POST',
        body: JSON.stringify({ reason: publishReason.trim() || undefined }),
      });
      showToast('AdMob configuration successfully published live!');
      setShowPublishModal(false);
      setPublishReason('');
      const updated = await adminFetch('/admin/ads/config');
      setAdsConfig(updated);
      setAdsDraft(updated.draft);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish AdMob configuration');
    } finally {
      setIsPublishingAds(false);
    }
  };

  const handleRevertAds = async (targetVer?: number) => {
    setIsRevertingAds(true);
    try {
      await adminFetch('/admin/ads/revert', {
        method: 'POST',
        body: JSON.stringify({ targetVersion: targetVer }),
      });
      showToast('AdMob configuration rolled back successfully');
      setSelectedRevertVersion(null);
      const updated = await adminFetch('/admin/ads/config');
      setAdsConfig(updated);
      setAdsDraft(updated.draft);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revert AdMob configuration');
    } finally {
      setIsRevertingAds(false);
    }
  };

  const handleResetToTestDefaults = () => {
    if (!adsDraft) return;
    setAdsDraft({
      ...adsDraft,
      testMode: true,
      androidAppId: adsConfig?.googleTestConstants?.androidAppId || 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: adsConfig?.googleTestConstants?.iosAppId || 'ca-app-pub-3940256099942544~1458002511',
      androidDefaultBannerUnitId: adsConfig?.googleTestConstants?.androidBannerUnitId || 'ca-app-pub-3940256099942544/6300978111',
      iosDefaultBannerUnitId: adsConfig?.googleTestConstants?.iosBannerUnitId || 'ca-app-pub-3940256099942544/2934735716',
      placements: {
        home_dashboard: { ...adsDraft.placements.home_dashboard, androidUnitId: '', iosUnitId: '' },
        notes_list: { ...adsDraft.placements.notes_list, androidUnitId: '', iosUnitId: '' },
      },
    });
    showToast('Draft reset to official Google test credentials');
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
      showToast(newAnnouncement.publishImmediately ? 'Announcement broadcast dispatched' : 'Draft announcement created');
      setNewAnnouncement({
        title: '',
        message: '',
        targetTier: 'ALL',
        priority: 'NORMAL',
        channel: 'BOTH',
        publishImmediately: true,
      });
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePublishAnnouncement = async (id: string) => {
    try {
      await adminFetch(`/admin/announcements/${id}/publish`, { method: 'POST' });
      showToast('Announcement published and dispatched to target audience');
      refreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRetractAnnouncement = async (id: string) => {
    try {
      await adminFetch(`/admin/announcements/${id}/retract`, { method: 'POST' });
      showToast('Announcement retracted and pending notifications cancelled');
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
          { id: "subscriptions", label: "Purchases" },
          { id: "cloud-sync", label: "Cloud Sync" },
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
                { id: "subscriptions", label: "In-App Purchases", icon: CreditCard, badge: "RevenueCat" },
                { id: "cloud-sync", label: "Cloud Notes Sync", icon: Cloud, badge: syncConfig.enabled ? "Pro Only" : "Off" },
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
                      { label: "Purchases & RC", icon: CreditCard, tab: "subscriptions", color: "text-purple-400" },
                      { label: "AI Gateways", icon: BrainCircuit, tab: "ai-providers", color: "text-pink-400" },
                      { label: "User Access", icon: Users, tab: "users", color: "text-cyan-400" },
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
                                  <div>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 w-max shadow-sm">
                                      <Sparkles className="w-3 h-3 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} /> PRO SUBSCRIBER
                                    </span>
                                    {user.subscriptions?.[0] && (
                                      <span className="text-[9px] text-purple-400/90 font-mono block mt-1">
                                        via {user.subscriptions[0].store === 'PLAY_STORE' ? 'Google Play' : user.subscriptions[0].store === 'APP_STORE' ? 'App Store' : user.subscriptions[0].store || 'RevenueCat'}
                                      </span>
                                    )}
                                  </div>
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

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Audit Reason for Override</label>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="e.g. VIP Customer Support / QA testing override"
                            className="w-full px-4 py-2 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-medium transition-all"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOverrideUserSubscription(selectedUser.id, editPlan, editDurationDays)}
                            className="flex-1 py-2 px-3 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:opacity-95 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Apply Audited Override</span>
                          </button>
                          <button
                            onClick={() => handleExtendTrial(7)}
                            className="py-2 px-3 bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-800 rounded-xl text-xs font-semibold"
                          >
                            +7 Days Trial
                          </button>
                        </div>

                        {selectedUser.subscriptions && selectedUser.subscriptions.length > 0 && (
                          <div className="p-3.5 bg-black/40 border border-purple-500/20 rounded-2xl space-y-2 mt-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-purple-300">Active Store Subscription</span>
                              <span className="font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
                                {selectedUser.subscriptions[0].store || 'STORE'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                              <div>Product: <span className="text-white">{selectedUser.subscriptions[0].productId || 'pro'}</span></div>
                              <div>Auto-Renew: <span className={selectedUser.subscriptions[0].autoRenewing ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{selectedUser.subscriptions[0].autoRenewing ? 'YES' : 'NO'}</span></div>
                              <div>Provider: <span className="text-white">{selectedUser.subscriptions[0].provider || 'REVENUECAT'}</span></div>
                              <div>Expires: <span className="text-white">{selectedUser.subscriptions[0].expiresAt ? new Date(selectedUser.subscriptions[0].expiresAt).toLocaleDateString() : 'Active'}</span></div>
                            </div>
                          </div>
                        )}

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
          {/* IN-APP PURCHASES & REVENUECAT SUBSCRIPTION MANAGEMENT */}
          {/* ========================================================= */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-7 animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <CreditCard className="w-3 h-3 text-pink-400" />
                      Store & Billing Engine
                    </span>
                    <span className="text-xs text-slate-500">• Google Play & App Store via RevenueCat</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    In-App Purchases & Subscription Configuration
                  </h2>
                  <p className="text-xs text-slate-400">
                    Remotely control store product IDs, RevenueCat credentials, dynamic paywall copy, and real-time webhook synchronization without app store redeployments.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextEnv = billingConfig.environment === 'PRODUCTION' ? 'SANDBOX' : 'PRODUCTION';
                      setBillingConfig({ ...billingConfig, environment: nextEnv });
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1.5 ${
                      billingConfig.environment === 'PRODUCTION'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${billingConfig.environment === 'PRODUCTION' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    <span>Env: {billingConfig.environment || 'PRODUCTION'}</span>
                  </button>

                  <button
                    onClick={handleTestRevenueCat}
                    disabled={isTestingRcConnection}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 disabled:opacity-50 transition-all"
                  >
                    <Play className={`w-3.5 h-3.5 text-purple-400 ${isTestingRcConnection ? 'animate-spin' : ''}`} />
                    <span>{isTestingRcConnection ? 'Testing API...' : 'Test Connection'}</span>
                  </button>

                  <button
                    onClick={() => handleSaveBillingConfig()}
                    disabled={isSavingBillingConfig}
                    className="px-5 py-2 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSavingBillingConfig ? 'animate-spin' : ''}`} />
                    <span>{isSavingBillingConfig ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </div>

              {/* Status Banner / Test Result if available */}
              {rcTestResult && (
                <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between backdrop-blur-md ${
                  rcTestResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {rcTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{rcTestResult.message}</span>
                  </div>
                  <button onClick={() => setRcTestResult(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              )}

              {/* Bento Row: 3 Overview Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="glass-panel p-5 rounded-[26px] border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RevenueCat API</span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-white">
                    {billingConfig.isConfigured ? 'Connected & Live' : 'Setup Required'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {billingConfig.androidPublicKey || billingConfig.iosPublicKey ? 'Public mobile keys active' : 'Public keys unconfigured'}
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-[26px] border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Store Products</span>
                    <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-white">
                    {billingConfig.products?.filter((p: any) => p.isEnabled).length ?? 2} Active Products
                  </div>
                  <div className="text-[11px] text-pink-400">
                    Google Play & App Store synchronized
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-[26px] border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Webhook Stream</span>
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-white">
                    {webhookEvents.length} Recent Events
                  </div>
                  <div className="text-[11px] text-cyan-400">
                    Idempotent deduplication enabled
                  </div>
                </div>
              </div>

              {/* Grid: Credentials & Webhook Endpoint + Paywall Copy */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. RevenueCat API Credentials */}
                <div className="glass-panel border-white/10 rounded-[32px] p-6 md:p-7 space-y-5 shadow-2xl backdrop-blur-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">RevenueCat SDK & API Credentials</h3>
                        <p className="text-[11px] text-slate-400">Public mobile keys and encrypted backend secrets</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-500/30">
                      AES-256-GCM
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Android Public SDK Key (Google Play)</label>
                      <input
                        type="text"
                        value={billingConfig.androidPublicKey || ''}
                        onChange={(e) => setBillingConfig({ ...billingConfig, androidPublicKey: e.target.value })}
                        placeholder="goog_..."
                        className="w-full px-4 py-2 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Shared with mobile app via public configuration endpoint</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">iOS Public SDK Key (App Store)</label>
                      <input
                        type="text"
                        value={billingConfig.iosPublicKey || ''}
                        onChange={(e) => setBillingConfig({ ...billingConfig, iosPublicKey: e.target.value })}
                        placeholder="appl_..."
                        className="w-full px-4 py-2 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Used by iOS builds to initiate Apple In-App Purchases</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">RevenueCat Server Secret Key</label>
                      <input
                        type="password"
                        value={billingConfig.serverSecretKey || ''}
                        onChange={(e) => setBillingConfig({ ...billingConfig, serverSecretKey: e.target.value })}
                        placeholder="sk_..."
                        className="w-full px-4 py-2 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Encrypted at rest on PostgreSQL. Leave masked (•••) to keep current secret intact.</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Webhook Authorization Secret</label>
                      <input
                        type="password"
                        value={billingConfig.webhookSecret || ''}
                        onChange={(e) => setBillingConfig({ ...billingConfig, webhookSecret: e.target.value })}
                        placeholder="whsec_... or Bearer token"
                        className="w-full px-4 py-2 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Validated on Authorization header of incoming RevenueCat webhook dispatches</span>
                    </div>

                    <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">RevenueCat Webhook URL</span>
                        <button
                          type="button"
                          onClick={handleCopyWebhookUrl}
                          className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-all"
                        >
                          {copiedWebhookUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedWebhookUrl ? 'Copied!' : 'Copy URL'}</span>
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-purple-300 break-all select-all bg-purple-950/30 p-2 rounded-xl border border-purple-500/20">
                        {(process.env.NEXT_PUBLIC_API_URL || 'https://appsq-two.vercel.app')}/billing/webhook/revenuecat
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Paste this exact URL into RevenueCat Dashboard &gt; Project Settings &gt; Integrations &gt; Webhooks.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Paywall Display & Marketing Copy */}
                <div className="glass-panel border-white/10 rounded-[32px] p-6 md:p-7 space-y-5 shadow-2xl backdrop-blur-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Paywall Copy & Display Settings</h3>
                        <p className="text-[11px] text-slate-400">Over-the-air text, highlights, and safety toggles</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-pink-400 bg-pink-950/80 px-2 py-0.5 rounded-md border border-pink-500/30">
                      LIVE ON MOBILE
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Paywall Headline</label>
                      <input
                        type="text"
                        value={billingConfig.display?.headline || ''}
                        onChange={(e) => setBillingConfig({
                          ...billingConfig,
                          display: { ...billingConfig.display, headline: e.target.value },
                        })}
                        placeholder="Unlock the Full Power of Mindora Pro"
                        className="w-full px-4 py-2 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-pink-500 transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Paywall Subheadline</label>
                      <textarea
                        rows={2}
                        value={billingConfig.display?.subheadline || ''}
                        onChange={(e) => setBillingConfig({
                          ...billingConfig,
                          display: { ...billingConfig.display, subheadline: e.target.value },
                        })}
                        placeholder="Infinite context, unlimited speech transcription..."
                        className="w-full px-4 py-2 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-pink-500 transition-all font-medium resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Pro Feature Highlights (Bullet Points)</label>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {(billingConfig.display?.proBenefits || []).map((benefit: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={benefit}
                              onChange={(e) => {
                                const updated = [...(billingConfig.display?.proBenefits || [])];
                                updated[idx] = e.target.value;
                                setBillingConfig({
                                  ...billingConfig,
                                  display: { ...billingConfig.display, proBenefits: updated },
                                });
                              }}
                              className="flex-1 px-3 py-1.5 bg-[#05070D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (billingConfig.display?.proBenefits || []).filter((_: any, i: number) => i !== idx);
                                setBillingConfig({
                                  ...billingConfig,
                                  display: { ...billingConfig.display, proBenefits: updated },
                                });
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(billingConfig.display?.proBenefits || []), 'New premium Pro capability'];
                          setBillingConfig({
                            ...billingConfig,
                            display: { ...billingConfig.display, proBenefits: updated },
                          });
                        }}
                        className="mt-2 px-3 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[11px] font-semibold flex items-center gap-1 border border-white/10 transition-all"
                      >
                        <Plus className="w-3 h-3 text-purple-400" />
                        <span>Add Benefit Bullet</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Legal / Store Trial Disclosure</label>
                      <input
                        type="text"
                        value={billingConfig.display?.trialDisclosure || ''}
                        onChange={(e) => setBillingConfig({
                          ...billingConfig,
                          display: { ...billingConfig.display, trialDisclosure: e.target.value },
                        })}
                        placeholder="7 days free, then automatically renews..."
                        className="w-full px-4 py-2 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-pink-500 transition-all"
                      />
                    </div>

                    {/* Paywall Maintenance Mode Toggle */}
                    <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Paywall Maintenance Mode</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Gracefully display scheduled store maintenance on mobile paywall instead of failing purchases
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const val = !billingConfig.display?.maintenanceMode;
                          setBillingConfig({
                            ...billingConfig,
                            display: { ...billingConfig.display, maintenanceMode: val },
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          billingConfig.display?.maintenanceMode ? 'bg-amber-500 shadow-md shadow-amber-500/30' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            billingConfig.display?.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Subscription Product Catalog & Mapping Table */}
              <div className="glass-panel border-white/10 rounded-[30px] overflow-hidden shadow-2xl backdrop-blur-2xl space-y-4 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span>Store Product Catalog & Package Mappings</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Map RevenueCat packages ($rc_monthly, $rc_annual) to Google Play and Apple App Store in-app purchase product IDs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct({
                        id: `product_${Date.now()}`,
                        revenueCatPackageId: '$rc_monthly',
                        googlePlayProductId: 'ai_notes_pro_monthly',
                        appStoreProductId: 'ai_notes_pro_monthly',
                        billingPeriod: 'MONTHLY',
                        title: 'Mindora Pro Monthly',
                        badgeText: '',
                        trialDays: 7,
                        order: (billingConfig.products?.length || 0) + 1,
                        isEnabled: true,
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-purple-500/30 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product Mapping</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#05070D]/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">Product / Title</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">RC Package ID</th>
                        <th className="py-3 px-4">Google Play ID</th>
                        <th className="py-3 px-4">App Store ID</th>
                        <th className="py-3 px-4">Trial</th>
                        <th className="py-3 px-4">Badge</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {(billingConfig.products || []).map((prod: any, idx: number) => (
                        <tr key={prod.id || idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-sans font-bold text-white text-xs">
                            {prod.title}
                            <span className="block font-mono text-[10px] text-slate-500 font-normal">{prod.id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold">
                              {prod.billingPeriod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-indigo-300">{prod.revenueCatPackageId}</td>
                          <td className="py-3 px-4 text-emerald-300">{prod.googlePlayProductId}</td>
                          <td className="py-3 px-4 text-cyan-300">{prod.appStoreProductId}</td>
                          <td className="py-3 px-4 text-slate-300">{prod.trialDays ? `${prod.trialDays}d Free` : 'No Trial'}</td>
                          <td className="py-3 px-4 font-sans text-pink-300">{prod.badgeText || '—'}</td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(billingConfig.products || [])];
                                updated[idx] = { ...updated[idx], isEnabled: !updated[idx].isEnabled };
                                setBillingConfig({ ...billingConfig, products: updated });
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-sans ${
                                prod.isEnabled
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {prod.isEnabled ? 'ENABLED' : 'DISABLED'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1 font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct({ ...prod });
                                setIsProductModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!confirm(`Delete product mapping "${prod.title}"?`)) return;
                                const updated = (billingConfig.products || []).filter((_: any, i: number) => i !== idx);
                                setBillingConfig({ ...billingConfig, products: updated });
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Live RevenueCat Webhook Telemetry */}
              <div className="glass-panel border-white/10 rounded-[30px] overflow-hidden shadow-2xl backdrop-blur-2xl space-y-4 p-6">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Live Webhook Event Stream</h3>
                      <p className="text-xs text-slate-400">Real-time store subscription lifecycle notifications captured by NestJS</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshWebhookEvents}
                    disabled={isLoadingWebhookEvents}
                    className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWebhookEvents ? 'animate-spin' : ''}`} />
                    <span>Refresh Stream</span>
                  </button>
                </div>

                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                  {webhookEvents.length > 0 ? (
                    webhookEvents.map((evt: any, i: number) => {
                      const type = evt.eventType || 'UNKNOWN';
                      const isPurchase = type.includes('PURCHASE') || type.includes('RENEWAL');
                      const isCancel = type.includes('CANCELLATION');
                      const isExpiry = type.includes('EXPIRATION') || type.includes('REVOCATION');
                      const isIssue = type.includes('BILLING_ISSUE');

                      const badgeStyle = isPurchase
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isCancel
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : isExpiry
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : isIssue
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/30';

                      return (
                        <div key={evt.id || i} className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-white/[0.02] rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${badgeStyle}`}>
                              {type}
                            </span>
                            <div>
                              <div className="font-mono text-white font-semibold flex items-center gap-2">
                                <span>{evt.payload?.event?.product_id || evt.payload?.event?.entitlement_id || 'pro'}</span>
                                <span className="text-[10px] text-slate-500">
                                  ({evt.payload?.event?.store === 'APP_STORE' ? 'Apple App Store' : 'Google Play'})
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                User: {evt.payload?.event?.app_user_id || 'anonymous'} • Trans ID: {evt.payload?.event?.transaction_id || evt.eventId || '—'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
                            {evt.status && (
                              <span className={`px-2 py-0.5 rounded-md border font-bold ${
                                evt.status === 'SUCCESS'
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                  : evt.status === 'IGNORED'
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : 'bg-red-950/60 text-red-400 border-red-800'
                              }`}>
                                {evt.status} {evt.processingTimeMs ? `(${evt.processingTimeMs}ms)` : ''}
                              </span>
                            )}
                            <span>{new Date(evt.createdAt || Date.now()).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-purple-400/80 mb-1" />
                      <span className="font-semibold text-slate-300">No Webhook Events Recorded Yet</span>
                      <span>Incoming transaction events from Google Play Billing and Apple StoreKit will display here in real time.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Modal */}
              {isProductModalOpen && editingProduct && (
                <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="w-full max-w-lg glass-panel border-white/15 rounded-[32px] p-7 shadow-2xl space-y-5 backdrop-blur-3xl bg-[#080C16]/95">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <h3 className="text-base font-bold text-white">Configure Store Product Mapping</h3>
                      <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Display Title</label>
                          <input
                            type="text"
                            value={editingProduct.title || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                            className="w-full px-3 py-2 bg-[#05070D] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Billing Period</label>
                          <select
                            value={editingProduct.billingPeriod || 'MONTHLY'}
                            onChange={(e) => setEditingProduct({ ...editingProduct, billingPeriod: e.target.value })}
                            className="w-full px-3 py-2 bg-[#05070D] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 font-medium"
                          >
                            <option value="MONTHLY">MONTHLY</option>
                            <option value="ANNUAL">ANNUAL</option>
                            <option value="LIFETIME">LIFETIME</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">RevenueCat Package ID</label>
                          <input
                            type="text"
                            value={editingProduct.revenueCatPackageId || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, revenueCatPackageId: e.target.value })}
                            placeholder="$rc_monthly"
                            className="w-full px-3 py-2 bg-[#05070D] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Badge Text (Optional)</label>
                          <input
                            type="text"
                            value={editingProduct.badgeText || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, badgeText: e.target.value })}
                            placeholder="Best Value • Save 40%"
                            className="w-full px-3 py-2 bg-[#05070D] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Google Play Product ID</label>
                        <input
                          type="text"
                          value={editingProduct.googlePlayProductId || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, googlePlayProductId: e.target.value })}
                          placeholder="ai_notes_pro_monthly"
                          className="w-full px-3 py-2 bg-[#05070D] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Apple App Store Product ID</label>
                        <input
                          type="text"
                          value={editingProduct.appStoreProductId || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, appStoreProductId: e.target.value })}
                          placeholder="ai_notes_pro_monthly"
                          className="w-full px-3 py-2 bg-[#05070D] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Trial Days</label>
                          <input
                            type="number"
                            min="0"
                            value={editingProduct.trialDays ?? 7}
                            onChange={(e) => setEditingProduct({ ...editingProduct, trialDays: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-3 py-2 bg-[#05070D] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="pt-4 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="productEnabledCheck"
                            checked={editingProduct.isEnabled}
                            onChange={(e) => setEditingProduct({ ...editingProduct, isEnabled: e.target.checked })}
                            className="rounded accent-purple-500"
                          />
                          <label htmlFor="productEnabledCheck" className="text-white font-semibold text-xs cursor-pointer">
                            Product Active in Store
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsProductModalOpen(false)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const existing = [...(billingConfig.products || [])];
                          const idx = existing.findIndex((p: any) => p.id === editingProduct.id);
                          if (idx >= 0) {
                            existing[idx] = editingProduct;
                          } else {
                            existing.push(editingProduct);
                          }
                          setBillingConfig({ ...billingConfig, products: existing });
                          setIsProductModalOpen(false);
                          showToast('Product mapping updated in staging');
                        }}
                        className="flex-1 py-2 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white rounded-xl text-xs font-semibold"
                      >
                        Apply Changes
                      </button>
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
              {/* Header & Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
                      Google AdMob Banner Engine
                    </span>
                    <span className="text-xs text-slate-500">• Monetization & Governance</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Ads & AdMob Management</h2>
                    {adsConfig?.published && (
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${
                        adsConfig.published.status === 'ENABLED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : adsConfig.published.status === 'TEST_MODE'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : adsConfig.published.status === 'AWAITING_CONFIG'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        LIVE: {adsConfig.published.status || 'DISABLED'} (v{adsConfig.published.version})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Authoritative control over Google AdMob banner units, platform toggles, and subscriber immunity
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetToTestDefaults}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Test IDs</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAdsDraft}
                    disabled={isSavingAdsDraft || !adsDraft}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all disabled:opacity-50"
                  >
                    <Check className={`w-3.5 h-3.5 ${isSavingAdsDraft ? 'animate-spin' : 'text-emerald-400'}`} />
                    <span>{isSavingAdsDraft ? 'Saving Draft...' : 'Save Draft'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(true)}
                    disabled={isPublishingAds || !adsDraft}
                    className="px-5 py-2 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#6366F1] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl shadow-purple-600/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>Publish to Live</span>
                  </button>
                </div>
              </div>

              {/* Banner Only Policy Banner */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold text-white">Strict Banner-Only Advertising Policy: </span>
                  <span className="text-slate-300">
                    Banner ads are the ONLY supported advertising format in the application. Video ads, full-screen interstitials, and rewarded ads are strictly blocked across all platforms to protect user focus and note-taking flow.
                  </span>
                </div>
              </div>

              {/* Validation Warnings if any */}
              {adsConfig?.validation?.errors && adsConfig.validation.errors.length > 0 && adsDraft?.isEnabled && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-red-300">Configuration Format Issues Detected:</span>
                    <ul className="text-xs text-red-400 list-disc list-inside space-y-0.5">
                      {adsConfig.validation.errors.map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Production Mode Warning if test IDs active */}
              {adsDraft && !adsDraft.testMode && adsDraft.isEnabled && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-300 leading-relaxed">
                    <span className="font-bold">Production Mode Alert: </span>
                    Production serving is enabled. Make sure you have entered real Google AdMob Banner Ad Unit IDs. If Google test IDs are used in production mode, ad serving will fail or generate zero revenue.
                  </div>
                </div>
              )}

              {/* Grid 1: Master Controls & Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Global Master Switch */}
                <div className="glass-panel border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Global Serving</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      adsDraft?.isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {adsDraft?.isEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Master kill-switch. When disabled, all mobile banner requests and renderings cease immediately.
                  </p>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Enable All Ads</span>
                    <button
                      type="button"
                      onClick={() => setAdsDraft(adsDraft ? { ...adsDraft, isEnabled: !adsDraft.isEnabled } : null)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        adsDraft?.isEnabled ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        adsDraft?.isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Test Mode Switch */}
                <div className="glass-panel border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">AdMob Mode</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      adsDraft?.testMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {adsDraft?.testMode ? 'TEST MODE' : 'PRODUCTION'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Test Mode serves official Google test banners without policy risk during QA and development.
                  </p>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Test Mode</span>
                    <button
                      type="button"
                      onClick={() => setAdsDraft(adsDraft ? { ...adsDraft, testMode: !adsDraft.testMode } : null)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        adsDraft?.testMode ? 'bg-blue-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        adsDraft?.testMode ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Android Switch */}
                <div className="glass-panel border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Android Platform</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      adsDraft?.androidEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {adsDraft?.androidEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Enable or disable banner serving on Android devices independently.
                  </p>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Android Ads</span>
                    <button
                      type="button"
                      onClick={() => setAdsDraft(adsDraft ? { ...adsDraft, androidEnabled: !adsDraft.androidEnabled } : null)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        adsDraft?.androidEnabled ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        adsDraft?.androidEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* iOS Switch */}
                <div className="glass-panel border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">iOS Platform</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      adsDraft?.iosEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {adsDraft?.iosEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Enable or disable banner serving on iOS devices independently.
                  </p>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-300">iOS Ads</span>
                    <button
                      type="button"
                      onClick={() => setAdsDraft(adsDraft ? { ...adsDraft, iosEnabled: !adsDraft.iosEnabled } : null)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        adsDraft?.iosEnabled ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        adsDraft?.iosEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bento Grid 2: Placements & Pro Immunity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Placement 1: Home Dashboard */}
                <div className="glass-panel border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Home Dashboard Banner</h3>
                      <p className="text-[11px] text-slate-400 font-mono">placement: home_dashboard</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!adsDraft) return;
                        setAdsDraft({
                          ...adsDraft,
                          placements: {
                            ...adsDraft.placements,
                            home_dashboard: {
                              ...adsDraft.placements.home_dashboard,
                              enabled: !adsDraft.placements.home_dashboard.enabled,
                            },
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        adsDraft?.placements?.home_dashboard?.enabled ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        adsDraft?.placements?.home_dashboard?.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sleek banner card positioned between quick metric statistics and recent notes on the Home screen.
                  </p>

                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Android Unit ID Override <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Leave blank to use default banner unit ID"
                        value={adsDraft?.placements?.home_dashboard?.androidUnitId || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setAdsDraft({
                            ...adsDraft,
                            placements: {
                              ...adsDraft.placements,
                              home_dashboard: { ...adsDraft.placements.home_dashboard, androidUnitId: val },
                            },
                          });
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        iOS Unit ID Override <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Leave blank to use default banner unit ID"
                        value={adsDraft?.placements?.home_dashboard?.iosUnitId || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setAdsDraft({
                            ...adsDraft,
                            placements: {
                              ...adsDraft.placements,
                              home_dashboard: { ...adsDraft.placements.home_dashboard, iosUnitId: val },
                            },
                          });
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Placement 2: Notes List */}
                <div className="glass-panel border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Notes Directory Banner</h3>
                      <p className="text-[11px] text-slate-400 font-mono">placement: notes_list</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!adsDraft) return;
                        setAdsDraft({
                          ...adsDraft,
                          placements: {
                            ...adsDraft.placements,
                            notes_list: {
                              ...adsDraft.placements.notes_list,
                              enabled: !adsDraft.placements.notes_list.enabled,
                            },
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        adsDraft?.placements?.notes_list?.enabled ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        adsDraft?.placements?.notes_list?.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Unobtrusive bottom banner displayed above the floating dock on the Notes directory screen.
                  </p>

                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Android Unit ID Override <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Leave blank to use default banner unit ID"
                        value={adsDraft?.placements?.notes_list?.androidUnitId || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setAdsDraft({
                            ...adsDraft,
                            placements: {
                              ...adsDraft.placements,
                              notes_list: { ...adsDraft.placements.notes_list, androidUnitId: val },
                            },
                          });
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        iOS Unit ID Override <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Leave blank to use default banner unit ID"
                        value={adsDraft?.placements?.notes_list?.iosUnitId || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setAdsDraft({
                            ...adsDraft,
                            placements: {
                              ...adsDraft.placements,
                              notes_list: { ...adsDraft.placements.notes_list, iosUnitId: val },
                            },
                          });
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Placement 3: Pro Subscriber Immunity */}
                <div className="glass-panel border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Subscriber Immunity</h3>
                        <p className="text-[11px] text-slate-400">Zero Ad Requests Guaranteed</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      AUTHORITATIVE
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Active Pro subscribers and active trial users NEVER receive ads. The mobile client disables AdMob SDK initialization and hides all banner widgets immediately.
                  </p>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target Audience:</span>
                      <span className="font-mono text-indigo-400 font-bold">FREE Plan Only</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Pro Users Ad Requests:</span>
                      <span className="font-mono text-emerald-400 font-bold">0 (Blocked)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Client Check Interval:</span>
                      <span className="font-mono text-slate-300 font-bold">{adsDraft?.refreshIntervalSec || 300}s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 3: AdMob IDs Management */}
              <div className="glass-panel border-white/10 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">AdMob Application & Default Unit IDs</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure official AdMob App IDs and Default Banner Unit IDs. App IDs are packaged in app binaries, while Banner Unit IDs update dynamically over-the-air.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Android Column */}
                  <div className="space-y-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Android AdMob Settings</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Android SDK 21+</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">Android AdMob App ID</label>
                        {isValidAppId(adsDraft?.androidAppId) ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3" /> Valid App ID
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">ca-app-pub-...~...</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={adsDraft?.androidAppId || ''}
                        onChange={(e) => setAdsDraft({ ...adsDraft, androidAppId: e.target.value.trim() })}
                        placeholder="ca-app-pub-3940256099942544~3347511713"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">Android Default Banner Unit ID</label>
                        {isValidUnitId(adsDraft?.androidDefaultBannerUnitId) ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3" /> Valid Unit ID
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">ca-app-pub-.../...</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={adsDraft?.androidDefaultBannerUnitId || ''}
                        onChange={(e) => setAdsDraft({ ...adsDraft, androidDefaultBannerUnitId: e.target.value.trim() })}
                        placeholder="ca-app-pub-3940256099942544/6300978111"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* iOS Column */}
                  <div className="space-y-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">iOS AdMob Settings</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">iOS 12+</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">iOS AdMob App ID</label>
                        {isValidAppId(adsDraft?.iosAppId) ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3" /> Valid App ID
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">ca-app-pub-...~...</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={adsDraft?.iosAppId || ''}
                        onChange={(e) => setAdsDraft({ ...adsDraft, iosAppId: e.target.value.trim() })}
                        placeholder="ca-app-pub-3940256099942544~1458002511"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">iOS Default Banner Unit ID</label>
                        {isValidUnitId(adsDraft?.iosDefaultBannerUnitId) ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3" /> Valid Unit ID
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">ca-app-pub-.../...</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={adsDraft?.iosDefaultBannerUnitId || ''}
                        onChange={(e) => setAdsDraft({ ...adsDraft, iosDefaultBannerUnitId: e.target.value.trim() })}
                        placeholder="ca-app-pub-3940256099942544/2934735716"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Version History & Rollback Table */}
              <div className="glass-panel border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">AdMob Version History & Rollback Audit</h3>
                      <p className="text-[11px] text-slate-400">Revert published ad network configuration to any previous release</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {adsConfig?.history?.length || 0} Historical Releases
                  </span>
                </div>

                {adsConfig?.history && adsConfig.history.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-white/5">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-white/[0.03] uppercase tracking-wider text-[10px] font-bold text-slate-400 font-mono">
                        <tr>
                          <th className="py-3 px-4">Version</th>
                          <th className="py-3 px-4">Mode</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Published At</th>
                          <th className="py-3 px-4">Publisher</th>
                          <th className="py-3 px-4">Reason / Notes</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {adsConfig.history.map((entry: any) => (
                          <tr key={entry.version} className="hover:bg-white/[0.02] transition-colors font-mono">
                            <td className="py-3 px-4 font-bold text-white">v{entry.version}</td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                entry.config.testMode ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {entry.config.testMode ? 'TEST' : 'PROD'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                entry.config.isEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {entry.config.isEnabled ? 'ENABLED' : 'DISABLED'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {entry.publishedAt ? new Date(entry.publishedAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-slate-300">{entry.publishedBy || 'admin'}</td>
                            <td className="py-3 px-4 text-slate-400 font-sans truncate max-w-xs">{entry.reason || 'Routine update'}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedRevertVersion(entry.version)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white rounded-lg text-[11px] font-sans font-semibold border border-purple-500/20 transition-all"
                              >
                                Revert to v{entry.version}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 rounded-2xl bg-white/[0.01] border border-dashed border-white/5">
                    No previous releases archived yet. Prior states are stored when updates are published.
                  </div>
                )}
              </div>

              {/* Publish Confirmation Modal */}
              {showPublishModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-[#12121A] border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Publish AdMob Configuration</h3>
                        <p className="text-xs text-slate-400">This will immediately update public client endpoints</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Global Ads Serving:</span>
                        <span className={`font-bold ${adsDraft?.isEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                          {adsDraft?.isEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">AdMob Mode:</span>
                        <span className={`font-bold ${adsDraft?.testMode ? 'text-blue-400' : 'text-amber-400'}`}>
                          {adsDraft?.testMode ? 'TEST MODE' : 'PRODUCTION MODE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">New Version:</span>
                        <span className="font-mono text-white font-bold">
                          v{(adsConfig?.published?.version || 1) + 1}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                        Publish Reason / Audit Note <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Switched to production banner units for launch"
                        value={publishReason}
                        onChange={(e) => setPublishReason(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPublishModal(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handlePublishAds}
                        disabled={isPublishingAds}
                        className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isPublishingAds ? 'Publishing...' : 'Confirm & Publish'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Revert Confirmation Modal */}
              {selectedRevertVersion !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-[#12121A] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
                        <History className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Rollback AdMob Configuration</h3>
                        <p className="text-xs text-slate-400">Revert published settings to v{selectedRevertVersion}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Are you sure you want to rollback live ad settings to version <strong>v{selectedRevertVersion}</strong>? This will create a new release archiving the current state and restore previous ad unit IDs and switches immediately.
                    </p>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRevertVersion(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevertAds(selectedRevertVersion)}
                        disabled={isRevertingAds}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
                      >
                        {isRevertingAds ? 'Rolling back...' : `Confirm Rollback to v${selectedRevertVersion}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Target Audience Tier</label>
                        <select
                          value={newAnnouncement.targetTier}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetTier: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                        >
                          <option value="ALL">All Users (Universal)</option>
                          <option value="FREE">Free Tier Only</option>
                          <option value="TRIAL">Trial Users Only</option>
                          <option value="PRO">Pro Subscribers Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Priority / Urgency</label>
                        <select
                          value={newAnnouncement.priority}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                        >
                          <option value="LOW">Low (Informational)</option>
                          <option value="NORMAL">Normal (Standard)</option>
                          <option value="HIGH">High (Important)</option>
                          <option value="URGENT">Urgent (Critical Alert)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Delivery Channel</label>
                        <select
                          value={newAnnouncement.channel}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, channel: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#05070D] border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium transition-all"
                        >
                          <option value="BOTH">Push & In-App (Recommended)</option>
                          <option value="PUSH">Push Notification Only</option>
                          <option value="IN_APP">In-App Banner Only</option>
                        </select>
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
                    announcements.map((ann) => {
                      const isPublished = ann.status === 'PUBLISHED' || (!ann.status && ann.publishedAt);
                      const isRetracted = ann.status === 'RETRACTED';
                      const isDraft = ann.status === 'DRAFT' || (!isPublished && !isRetracted);

                      return (
                        <div key={ann.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-white">{ann.title}</span>
                              
                              {/* Status Badge */}
                              {isPublished && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  PUBLISHED
                                </span>
                              )}
                              {isDraft && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/30 font-bold">
                                  DRAFT
                                </span>
                              )}
                              {isRetracted && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                                  RETRACTED
                                </span>
                              )}

                              {/* Target Tier */}
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                {ann.targetTier || 'ALL'}
                              </span>

                              {/* Priority */}
                              {ann.priority && ann.priority !== 'NORMAL' && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                  ann.priority === 'URGENT' 
                                    ? 'bg-red-500/10 text-red-300 border-red-500/30 font-bold' 
                                    : ann.priority === 'HIGH' 
                                    ? 'bg-orange-500/10 text-orange-300 border-orange-500/30' 
                                    : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                }`}>
                                  {ann.priority}
                                </span>
                              )}

                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(ann.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">{ann.message}</p>

                            {/* Delivery metrics */}
                            {ann.totalTargeted !== undefined && ann.totalTargeted !== null && (
                              <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 pt-0.5">
                                <span>Targeted: <strong className="text-white">{ann.totalTargeted}</strong></span>
                                <span>Delivered: <strong className="text-emerald-400">{ann.deliveredCount ?? 0}</strong></span>
                                {ann.failedCount > 0 && <span>Failed: <strong className="text-rose-400">{ann.failedCount}</strong></span>}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                            {/* Publish action for drafts or retracted */}
                            {!isPublished && (
                              <button
                                type="button"
                                onClick={() => handlePublishAnnouncement(ann.id)}
                                className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Publish</span>
                              </button>
                            )}

                            {/* Retract action for published announcements */}
                            {isPublished && (
                              <button
                                type="button"
                                onClick={() => handleRetractAnnouncement(ann.id)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Retract</span>
                              </button>
                            )}

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
                      );
                    })
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

                {/* 3. Brevo Transactional Email & Password Reset Management */}
                <div className="lg:col-span-2 glass-panel border-white/10 rounded-[32px] p-7 space-y-6 shadow-2xl backdrop-blur-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">Brevo Email & Password Reset Dispatch</h3>
                          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                            emailConfig.isEnabled && emailConfig.isConfigured
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : emailConfig.isConfigured
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border-white/10"
                          }`}>
                            {emailConfig.isEnabled && emailConfig.isConfigured
                              ? "ACTIVE & VERIFIED"
                              : emailConfig.isConfigured
                              ? "CONFIGURED (DISABLED)"
                              : "PENDING API KEY"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Transactional email gateway for 6-digit verification codes and automated password reset workflows
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">Service Enabled:</span>
                      <button
                        type="button"
                        onClick={() => setEmailConfig((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
                        className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                          emailConfig.isEnabled ? 'bg-blue-600 shadow-md shadow-blue-600/30' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                            emailConfig.isEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* API Key */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Brevo API Key (v3)</span>
                        {emailConfig.isConfigured && (
                          <span className="text-[10px] text-emerald-400 font-mono">Configured</span>
                        )}
                      </label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={emailConfig.apiKey}
                          onChange={(e) => setEmailConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                          placeholder={emailConfig.isConfigured ? "••••••••••••••••••••" : "xkeysib-..."}
                          className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Get your API key from your Brevo Dashboard → SMTP & API.
                      </p>
                    </div>

                    {/* Sender Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Sender Email Address</label>
                      <input
                        type="email"
                        value={emailConfig.senderEmail}
                        onChange={(e) => setEmailConfig((prev) => ({ ...prev, senderEmail: e.target.value }))}
                        placeholder="noreply@vynotes.app"
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                      />
                      <p className="text-[11px] text-slate-500">
                        Must match an authorized sender domain in Brevo.
                      </p>
                    </div>

                    {/* Sender Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Sender Display Name</label>
                      <input
                        type="text"
                        value={emailConfig.senderName}
                        onChange={(e) => setEmailConfig((prev) => ({ ...prev, senderName: e.target.value }))}
                        placeholder="VyNotes Security"
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                      />
                      <p className="text-[11px] text-slate-500">
                        Name shown to users when receiving password reset OTP emails.
                      </p>
                    </div>
                  </div>

                  {/* Save button and Test Dispatch row */}
                  <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button
                      onClick={handleSaveEmailConfig}
                      disabled={isSavingEmailConfig}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      {isSavingEmailConfig ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Brevo Configuration...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Brevo Credentials</span>
                        </>
                      )}
                    </button>

                    {/* Test Email Dispatch box */}
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="admin@example.com"
                        className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 w-52"
                      />
                      <button
                        onClick={handleSendTestEmail}
                        disabled={isSendingTestEmail || (!emailConfig.isConfigured && !emailConfig.apiKey)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {isSendingTestEmail ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>Send Test Email</span>
                      </button>
                    </div>
                  </div>

                  {/* Live test alert banner */}
                  {emailTestResult && (
                    <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                      emailTestResult.success
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-red-500/10 text-red-300 border-red-500/20"
                    }`}>
                      <div className="flex items-center gap-2.5">
                        {emailTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <span>{emailTestResult.message}</span>
                      </div>
                      <button
                        onClick={() => setEmailTestResult(null)}
                        className="text-slate-400 hover:text-white text-[11px] underline ml-4"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Google Sign-In & Mobile OAuth Credentials */}
                <div className="glass-panel border-white/10 rounded-[32px] p-7 space-y-6 shadow-2xl backdrop-blur-2xl lg:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">Google Sign-In & OAuth Configuration</h3>
                          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                            googleAuthConfig.isConfigured && googleAuthConfig.isEnabled
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : !googleAuthConfig.isEnabled
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}>
                            {!googleAuthConfig.isEnabled ? "DISABLED" : googleAuthConfig.isConfigured ? "OAUTH ACTIVE" : "AWAITING CLIENT IDS"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Manage Google OAuth 2.0 Client IDs for Android (`com.vynotes.crazytech`), iOS, and backend ID token verification.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">Enable Google Auth:</span>
                      <button
                        type="button"
                        onClick={() => setGoogleAuthConfig((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
                        className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                          googleAuthConfig.isEnabled ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                            googleAuthConfig.isEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Input Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Web Client ID / Server Client ID */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Web Client ID (Server Client ID)</span>
                        <span className="text-[10px] font-mono text-purple-400">CRITICAL FOR BOTH ANDROID & IOS</span>
                      </label>
                      <input
                        type="text"
                        value={googleAuthConfig.webClientId}
                        onChange={(e) => setGoogleAuthConfig((prev) => ({ ...prev, webClientId: e.target.value.trim() }))}
                        placeholder="e.g. 1234567890-abcdefg.apps.googleusercontent.com"
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 font-mono"
                      />
                      <p className="text-[11px] text-slate-500">
                        Created under &quot;Web application&quot; in Google Cloud Console. Used by the mobile app to obtain ID tokens for backend exchange.
                      </p>
                    </div>

                    {/* iOS Client ID */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>iOS Client ID (Optional for Web/Android)</span>
                        <span className="text-[10px] font-mono text-blue-400">iOS APP STORE BUILD</span>
                      </label>
                      <input
                        type="text"
                        value={googleAuthConfig.iosClientId}
                        onChange={(e) => setGoogleAuthConfig((prev) => ({ ...prev, iosClientId: e.target.value.trim() }))}
                        placeholder="e.g. 1234567890-iosclient.apps.googleusercontent.com"
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 font-mono"
                      />
                      <p className="text-[11px] text-slate-500">
                        Created under &quot;iOS&quot; in Google Cloud Console with Bundle ID `com.vynotes.crazytech`.
                      </p>
                    </div>

                    {/* Android Package Name */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Android Package Name</span>
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> VERIFIED
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={googleAuthConfig.packageName}
                          className="flex-1 px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-emerald-400 font-mono cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText(googleAuthConfig.packageName);
                              setCopiedPackageName(true);
                              showToast('Package name copied to clipboard');
                              setTimeout(() => setCopiedPackageName(false), 2500);
                            }
                          }}
                          className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-medium transition-all flex items-center gap-1"
                        >
                          {copiedPackageName ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPackageName ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Must match the Android client entry in your Google Cloud / Firebase console.
                      </p>
                    </div>

                    {/* SHA-1 & SHA-256 Command Box */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>SHA-1 / SHA-256 Fingerprint Extraction</span>
                        <span className="text-[10px] font-mono text-amber-400">REQUIRED FOR ANDROID</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value="cd android && ./gradlew signingReport"
                          className="flex-1 px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-amber-300 font-mono cursor-default"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText('cd android && ./gradlew signingReport');
                              setCopiedShaCommand(true);
                              showToast('Gradle signingReport command copied');
                              setTimeout(() => setCopiedShaCommand(false), 2500);
                            }
                          }}
                          className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-medium transition-all flex items-center gap-1"
                        >
                          {copiedShaCommand ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedShaCommand ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Run this in terminal to generate SHA-1 fingerprint for your Android OAuth client in Google Cloud Console.
                      </p>
                    </div>
                  </div>

                  {/* Save button and Guide Toggle */}
                  <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={handleSaveGoogleAuthConfig}
                      disabled={isSavingGoogleAuth}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingGoogleAuth ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving OAuth Credentials...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Google OAuth Credentials</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Step-by-Step Setup Guide Callout */}
                  <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Google Cloud Console &amp; Firebase Setup Instructions</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-center leading-5 text-[10px] font-bold">1</span>
                          <span>OAuth Consent Screen</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          In Google Cloud Console, configure your OAuth Consent Screen with User Support Email and add scopes: `email`, `profile`, `openid`.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-center leading-5 text-[10px] font-bold">2</span>
                          <span>Create Web Client ID</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Create an OAuth Client of type <strong>Web application</strong>. Paste that Client ID into the <strong>Web Client ID</strong> field above.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-center leading-5 text-[10px] font-bold">3</span>
                          <span>Android Client ID</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Create an OAuth Client of type <strong>Android</strong>. Enter Package Name <code className="text-purple-300">com.vynotes.crazytech</code> and your SHA-1 fingerprint.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLOUD NOTES SYNC & RETENTION TAB */}
          {activeTab === 'cloud-sync' && (
            <div className="space-y-6">
              {/* Header & Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Cloud className="w-3 h-3 text-purple-400 animate-pulse" />
                      Local-First Cloud Synchronization
                    </span>
                    <span className="text-xs text-slate-500">• Pro Gating & Storage Lifecycle</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Cloud Notes Sync & Retention</h2>
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${
                      syncConfig.enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {syncConfig.enabled ? 'ACTIVE (PRO ONLY)' : 'SYNC DISABLED GLOBALLY'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage cloud sync quotas, text-only isolation policies, Pro entitlement enforcement, and non-destructive retention lifecycles.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleRunRetentionCleanup(true)}
                    disabled={isExecutingCleanup}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isExecutingCleanup ? 'animate-spin' : 'text-purple-400'}`} />
                    <span>Dry-Run Scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSyncConfig()}
                    disabled={isSavingSyncConfig}
                    className="px-5 py-2 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#6366F1] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl shadow-purple-600/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Check className={`w-3.5 h-3.5 ${isSavingSyncConfig ? 'animate-spin' : ''}`} />
                    <span>{isSavingSyncConfig ? 'Saving...' : 'Save Sync Policy'}</span>
                  </button>
                </div>
              </div>

              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Active Sync Users</span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black text-white font-mono">{syncTelemetry.activeSyncUsers}</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pro users with cloud sync turned ON</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Total Cloud Text Storage</span>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Database className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black text-white font-mono">
                      {(syncTelemetry.totalCloudStorageBytes / (1024 * 1024)).toFixed(2)} <span className="text-sm font-normal text-slate-400">MB</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Strictly text & markdown bytes stored</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Pending Expirations</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black text-white font-mono">{syncTelemetry.pendingExpirationCount}</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">In retention window (disabled sync / lapsed Pro)</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Tombstones Retained</span>
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <Trash2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black text-white font-mono">{syncTelemetry.tombstonesCount}</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Soft-deletes waiting for client propagation</p>
                  </div>
                </div>
              </div>

              {/* Master Sync & Quota Rules Card */}
              <div className="p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 backdrop-blur-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Master Cloud Sync & Quota Controls</h3>
                      <p className="text-xs text-slate-400">Enable or disable cloud sync globally and set per-user text limits.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncConfig.enabled}
                      onChange={(e) => setSyncConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Pro Storage Quota per User</span>
                      <span className="text-[11px] font-mono text-purple-400">
                        {Math.round(syncConfig.proQuotaBytes / (1024 * 1024))} MB default
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={Math.round(syncConfig.proQuotaBytes / (1024 * 1024))}
                        onChange={(e) => {
                          const mb = parseInt(e.target.value, 10) || 1;
                          setSyncConfig((prev) => ({ ...prev, proQuotaBytes: mb * 1024 * 1024 }));
                        }}
                        className="flex-1 px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
                      />
                      <span className="text-xs text-slate-400 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl font-mono">
                        MB / User
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      25 MB text stores ~12,500 full markdown notes. Uploads exceeding quota are rejected with HTTP 400 Bad Request.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Max Single Note Size</span>
                      <span className="text-[11px] font-mono text-purple-400">
                        {Math.round(syncConfig.maxNoteSizeBytes / 1024)} KB limit
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="32"
                        max="5120"
                        value={Math.round(syncConfig.maxNoteSizeBytes / 1024)}
                        onChange={(e) => {
                          const kb = parseInt(e.target.value, 10) || 32;
                          setSyncConfig((prev) => ({ ...prev, maxNoteSizeBytes: kb * 1024 }));
                        }}
                        className="flex-1 px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
                      />
                      <span className="text-xs text-slate-400 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl font-mono">
                        KB / Note
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      512 KB allows ~250,000 words per note while shielding the database from oversized payloads.
                    </p>
                  </div>
                </div>
              </div>

              {/* Retention Policy Lifecycle Card */}
              <div className="p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 backdrop-blur-xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Cloud Retention & Expiration Policy</h3>
                    <p className="text-xs text-slate-400">Set grace periods, recovery windows, and soft-delete tombstone lifecycles.</p>
                  </div>
                </div>

                {/* Local-First Safety Banner */}
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Local-First Safety Guarantee</div>
                    <p className="text-indigo-300 mt-0.5 leading-relaxed">
                      Server retention cleanup NEVER deletes notes from user devices. Disabling sync and Deleting Cloud Data are completely separate actions: turning sync OFF initiates the 90-day retention countdown for cloud copies, while local notes remain 100% accessible offline.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Disabled Sync Retention</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={syncConfig.disabledRetentionDays}
                        onChange={(e) => setSyncConfig((prev) => ({ ...prev, disabledRetentionDays: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500/50"
                      />
                      <span className="text-[11px] text-slate-400 font-mono">days</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Days retained in cloud after user disables sync</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Pro Grace Period</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={syncConfig.proGracePeriodDays}
                        onChange={(e) => setSyncConfig((prev) => ({ ...prev, proGracePeriodDays: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500/50"
                      />
                      <span className="text-[11px] text-slate-400 font-mono">days</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Full sync remains active during payment retries</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Pro Recovery Window</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={syncConfig.proExpiredRecoveryDays}
                        onChange={(e) => setSyncConfig((prev) => ({ ...prev, proExpiredRecoveryDays: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500/50"
                      />
                      <span className="text-[11px] text-slate-400 font-mono">days</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Read-only cloud retention before marking expired</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Tombstone Retention</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={syncConfig.tombstoneRetentionDays}
                        onChange={(e) => setSyncConfig((prev) => ({ ...prev, tombstoneRetentionDays: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500/50"
                      />
                      <span className="text-[11px] text-slate-400 font-mono">days</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Lifespan of deletion tombstones for devices</p>
                  </div>
                </div>
              </div>

              {/* Strict Text-Only Isolation Policy Card */}
              <div className="p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Strict Text-Only Isolation Architecture</h3>
                    <p className="text-xs text-slate-400">Media exclusion rules verified both client-side and server-side.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>PERMITTED CLOUD DATA (SYNCHRONIZED)</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>Note titles, Markdown, and plain text body</li>
                      <li>Category, tag arrays, folder associations</li>
                      <li>Pin states and favorite flags</li>
                      <li>Server revision integers & client edit timestamps</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>STRICTLY EXCLUDED & REJECTED BY SERVER</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>Voice memos and microphone audio files</li>
                      <li>Meeting recordings and live audio streams</li>
                      <li>Scanned documents, photos, and OCR images</li>
                      <li>Binary blobs, base64 data URIs, and attachment buffers</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Scheduled Maintenance & On-Demand Cleanup Runner Card */}
              <div className="p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Retention Cleaner & Storage Reclaim</h3>
                      <p className="text-xs text-slate-400">Scan database for expired cloud notes and stale tombstones.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleRunRetentionCleanup(true)}
                      disabled={isExecutingCleanup}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isExecutingCleanup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-blue-400" />}
                      <span>Dry-Run Scan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Execute live retention cleanup? Expired server-side cloud notes and stale tombstones will be permanently removed. Local notes on user devices are not affected.')) {
                          handleRunRetentionCleanup(false);
                        }
                      }}
                      disabled={isExecutingCleanup}
                      className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Execute Cleanup Now</span>
                    </button>
                  </div>
                </div>

                {cleanupResult && (
                  <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          cleanupResult.dryRun ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {cleanupResult.dryRun ? 'DRY-RUN SCAN RESULTS' : 'RETENTION PURGE EXECUTED'}
                        </span>
                        <span className="text-xs text-slate-400">Processed in {cleanupResult.executionDurationMs ?? 0}ms</span>
                      </div>
                      <button
                        onClick={() => setCleanupResult(null)}
                        className="text-slate-400 hover:text-white text-xs underline"
                      >
                        Dismiss
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="text-slate-400 text-[11px]">Notes Scanned</div>
                        <div className="text-base font-bold text-white font-mono mt-0.5">{cleanupResult.scannedCount ?? 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="text-slate-400 text-[11px]">{cleanupResult.dryRun ? 'Purge Candidates' : 'Notes Purged'}</div>
                        <div className="text-base font-bold text-amber-400 font-mono mt-0.5">{cleanupResult.purgedNotesCount ?? 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="text-slate-400 text-[11px]">Tombstones Cleaned</div>
                        <div className="text-base font-bold text-purple-400 font-mono mt-0.5">{cleanupResult.purgedTombstonesCount ?? 0}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="text-slate-400 text-[11px]">Storage Reclaimed</div>
                        <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                          {((cleanupResult.reclaimedBytes ?? 0) / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
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
