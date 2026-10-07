'use client';

import React, { useState } from 'react';
import { 
  Users, 
  BrainCircuit, 
  DollarSign, 
  HardDrive, 
  Sparkles, 
  Settings2, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ShieldCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'ai-models' | 'ads'>('overview');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Mindora Admin</h1>
            <p className="text-xs text-slate-500 font-medium">AI Second Brain • Control Center</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Users & Quotas
          </button>
          <button
            onClick={() => setActiveTab('ai-models')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ai-models' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Providers
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ad Controls
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Systems Operational
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">14,820</div>
              <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
                ↑ 18.2% from last month
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Revenue</span>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">$21,480</div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                4,305 Pro Subscribers ($4.99/mo)
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Tokens Consumed</span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <BrainCircuit className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">48.2M</div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                Est. Provider Cost: $142.30
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audio Minutes (Whisper)</span>
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900">8,190 min</div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                Meetings & Voice Memos
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Tab View */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Subscriptions & Activity */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Live Knowledge Extraction Stream</h2>
              <p className="text-xs text-slate-500 mt-1">Real-time asynchronous BullMQ background jobs</p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    type: 'Meeting Distillation',
                    user: 'sarah.miller@techflow.io',
                    status: 'COMPLETED',
                    time: '2 mins ago',
                    details: 'Generated 4 decisions, 7 action items from 38m audio',
                  },
                  {
                    type: 'Vector Embedding Sync',
                    user: 'david.chen@ventures.co',
                    status: 'COMPLETED',
                    time: '5 mins ago',
                    details: '1536-dim embedding generated for "Q3 Product Architecture"',
                  },
                  {
                    type: 'Daily Briefing Synthesis',
                    user: 'emmanuel@mindora.ai',
                    status: 'COMPLETED',
                    time: '12 mins ago',
                    details: 'Cron briefing generated for 7:00 AM local delivery',
                  },
                ].map((job, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{job.type}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                          {job.user}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{job.details}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {job.status}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{job.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Provider Health */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900">AI Gateway Routing</h2>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Free Tier Model</span>
                  <span className="font-bold text-indigo-600 bg-white px-2 py-1 rounded-md border border-slate-200">
                    gpt-4o-mini
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Pro Tier Model</span>
                  <span className="font-bold text-purple-600 bg-white px-2 py-1 rounded-md border border-slate-200">
                    gpt-4o
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Embeddings</span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-200">
                    text-embedding-3-small
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Speech-To-Text</span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-200">
                    whisper-1
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('ai-models')}
                  className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Configure Providers & Prompts →
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">User Management & AI Quotas</h2>
                <p className="text-xs text-slate-500 mt-0.5">Override subscription tiers, view usage, or grant bonus tokens</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by email or user ID..."
                    className="text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">AI Usage</th>
                    <th className="py-3 px-4">Notes Count</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { email: 'emma.watson@mindora.app', tier: 'PRO', usage: '1.2M / 2.0M tokens', notes: 142 },
                    { email: 'john.developer@acme.com', tier: 'FREE', usage: '48.5K / 50K tokens', notes: 38 },
                    { email: 'michael.ross@legalcorp.org', tier: 'PRO', usage: '620K / 2.0M tokens', notes: 87 },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{row.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          row.tier === 'PRO' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{row.usage}</td>
                      <td className="py-3.5 px-4">{row.notes}</td>
                      <td className="py-3.5 px-4">
                        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                          Edit Quota
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ai-models' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Dynamic AI Provider Hot-Swap</h2>
              <p className="text-xs text-slate-500 mt-0.5">Switch active models in production without code redeployment</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <label className="block text-xs font-bold text-slate-800">Free Tier Active Model</label>
                <select className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="gpt-4o-mini">OpenAI gpt-4o-mini (Default)</option>
                  <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
                  <option value="claude-3-haiku">Anthropic Claude 3 Haiku</option>
                  <option value="llama-3-8b-groq">Groq Llama 3 8B</option>
                </select>
                <p className="text-[11px] text-slate-500">Free users receive this model with strict token-bucket rate limits.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <label className="block text-xs font-bold text-slate-800">Pro Tier Active Model</label>
                <select className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="gpt-4o">OpenAI gpt-4o (Default)</option>
                  <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                  <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                </select>
                <p className="text-[11px] text-slate-500">Pro users receive high-reasoning intelligence with priority processing.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Google AdMob Configuration & Safety Rules</h2>
              <p className="text-xs text-slate-500 mt-0.5">Control native ad frequencies and verify strict safety guardrails</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Ad Network Master Switch</div>
                  <div className="text-xs text-slate-500">Enable or disable ads globally across all clients</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <strong>Guardrails Active:</strong> Native ads are automatically suppressed while the user is typing, during voice capture, inside Meeting Mode, and within private note bodies.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
