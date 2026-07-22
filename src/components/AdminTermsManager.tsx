import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  RefreshCcw,
  Rocket,
  Save,
  Search,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { TermsPolicyVersion } from '../types';
import {
  createPolicyDraftFromPublished,
  forcePolicyReacceptance,
  getPublishedPolicy,
  publishPolicyVersion,
  readAcceptanceRecords,
  readPolicyVersions,
  savePolicyVersions
} from '../data/termsStore';

type Notice = { type: 'success' | 'error'; message: string } | null;

const formatDateTime = (value?: string) => {
  if (!value) return 'Not published';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
};

const getPolicyStatusClass = (status: TermsPolicyVersion['status']) => {
  if (status === 'Published') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'Draft') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
};

export default function AdminTermsManager() {
  const [policies, setPolicies] = useState<TermsPolicyVersion[]>(() => readPolicyVersions());
  const [acceptanceRecords, setAcceptanceRecords] = useState(() => readAcceptanceRecords());
  const [publishedPolicy, setPublishedPolicy] = useState(() => getPublishedPolicy());
  const [selectedPolicyId, setSelectedPolicyId] = useState(() => getPublishedPolicy().id);
  const [draft, setDraft] = useState<TermsPolicyVersion>(() => getPublishedPolicy());
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<Notice>(null);

  const refreshData = (nextSelectedId?: string) => {
    const nextPolicies = readPolicyVersions();
    const nextPublished = getPublishedPolicy();
    const selectedId = nextSelectedId ?? selectedPolicyId ?? nextPublished.id;
    const selectedPolicy = nextPolicies.find(policy => policy.id === selectedId) ?? nextPublished;

    setPolicies(nextPolicies);
    setAcceptanceRecords(readAcceptanceRecords());
    setPublishedPolicy(nextPublished);
    setSelectedPolicyId(selectedPolicy.id);
    setDraft(selectedPolicy);
  };

  useEffect(() => {
    const selectedPolicy = policies.find(policy => policy.id === selectedPolicyId);
    if (selectedPolicy) {
      setDraft(selectedPolicy);
    }
  }, [selectedPolicyId]);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 3600);
  };

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return acceptanceRecords;

    return acceptanceRecords.filter(record =>
      record.user_id.toLowerCase().includes(normalized) ||
      record.version.toLowerCase().includes(normalized) ||
      record.user_role.toLowerCase().includes(normalized)
    );
  }, [acceptanceRecords, query]);

  const publishedAcceptanceCount = acceptanceRecords.filter(record => record.version === publishedPolicy.version).length;
  const studentAcceptanceCount = acceptanceRecords.filter(record => record.user_role === 'student').length;
  const teacherAcceptanceCount = acceptanceRecords.filter(record => record.user_role === 'teacher').length;

  const validateDraft = () => {
    if (!draft.version.trim()) {
      showNotice('error', 'Version is required before saving or publishing.');
      return false;
    }

    if (!draft.termsContent.trim() || !draft.privacyContent.trim()) {
      showNotice('error', 'Terms and Privacy Policy content are required.');
      return false;
    }

    return true;
  };

  const handleCreateDraft = () => {
    const nextDraft = createPolicyDraftFromPublished('Admin');
    savePolicyVersions([nextDraft, ...policies]);
    refreshData(nextDraft.id);
    showNotice('success', `Draft ${nextDraft.version} created.`);
  };

  const handleSaveDraft = () => {
    if (!validateDraft()) return;

    const updatedDraft = {
      ...draft,
      updatedAt: new Date().toISOString()
    };
    const nextPolicies = policies.map(policy => (policy.id === updatedDraft.id ? updatedDraft : policy));

    savePolicyVersions(nextPolicies);
    refreshData(updatedDraft.id);
    showNotice('success', `Version ${updatedDraft.version} saved.`);
  };

  const handlePublish = () => {
    if (!validateDraft()) return;

    const published = publishPolicyVersion(draft, 'Admin');
    refreshData(published.id);
    showNotice('success', `Version ${published.version} published. Users will accept it on next login.`);
  };

  const handleArchive = () => {
    const archivedPolicy = {
      ...draft,
      status: 'Archived' as const,
      updatedAt: new Date().toISOString()
    };
    const nextPolicies = policies.map(policy => (policy.id === archivedPolicy.id ? archivedPolicy : policy));

    savePolicyVersions(nextPolicies);
    refreshData(archivedPolicy.id);
    showNotice('success', `Version ${archivedPolicy.version} archived.`);
  };

  const handleForceReacceptance = () => {
    const forced = forcePolicyReacceptance('Admin');
    refreshData(forced.id);
    showNotice('success', `Version ${forced.version} is now active for re-acceptance.`);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0" id="admin-terms-manager">
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${
            notice.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : 'border-rose-100 bg-rose-50 text-rose-700'
          }`}
          role="status"
        >
          {notice.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {notice.message}
        </motion.div>
      )}

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Published Version',
            value: publishedPolicy.version,
            detail: formatDateTime(publishedPolicy.publishedAt),
            icon: <ShieldCheck className="h-5 w-5" />
          },
          {
            label: 'Current Acceptances',
            value: String(publishedAcceptanceCount),
            detail: 'For active published version',
            icon: <CheckCircle2 className="h-5 w-5" />
          },
          {
            label: 'Student Records',
            value: String(studentAcceptanceCount),
            detail: 'Stored in user_terms_agreement',
            icon: <FileText className="h-5 w-5" />
          },
          {
            label: 'Teacher Records',
            value: String(teacherAcceptanceCount),
            detail: 'Stored in user_terms_agreement',
            icon: <Clock3 className="h-5 w-5" />
          }
        ].map(metric => (
          <motion.article
            key={metric.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-2 text-emerald-700">
                {metric.icon}
              </div>
              <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                Audit
              </span>
            </div>
            <p className="mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-400">{metric.label}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{metric.value}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{metric.detail}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-extrabold text-slate-950">Terms and Privacy Editor</h2>
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Create, edit, publish, and version platform policies for registration and re-acceptance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCreateDraft}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                New Draft
              </button>
              <button
                type="button"
                onClick={handleForceReacceptance}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 text-xs font-extrabold text-amber-700 transition hover:border-amber-200 hover:bg-amber-100/60"
              >
                <RefreshCcw className="h-4 w-4" />
                Force Re-acceptance
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1fr]">
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-extrabold text-slate-600">Policy Version</span>
                <input
                  value={draft.version}
                  onChange={event => setDraft(prev => ({ ...prev, version: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-extrabold text-slate-600">Policy Title</span>
                <input
                  value={draft.title}
                  onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-extrabold text-slate-600">Status</span>
                <select
                  value={draft.status}
                  onChange={event => setDraft(prev => ({ ...prev, status: event.target.value as TermsPolicyVersion['status'] }))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/20 p-3">
                <input
                  type="checkbox"
                  checked={draft.forceReacceptance}
                  onChange={event => setDraft(prev => ({ ...prev, forceReacceptance: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                />
                <span>
                  <span className="block text-xs font-extrabold text-emerald-700">Require re-acceptance</span>
                  <span className="block text-xs font-medium leading-5 text-slate-500">Publishing a new version makes users review it on next login.</span>
                </span>
              </label>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <Rocket className="h-4 w-4" />
                  Publish
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Archive
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className="text-xs font-extrabold text-slate-600">Terms and Agreement Content</span>
                <textarea
                  value={draft.termsContent}
                  onChange={event => setDraft(prev => ({ ...prev, termsContent: event.target.value }))}
                  className="mt-1 h-72 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-extrabold text-slate-600">Privacy Policy Content</span>
                <textarea
                  value={draft.privacyContent}
                  onChange={event => setDraft(prev => ({ ...prev, privacyContent: event.target.value }))}
                  className="mt-1 h-48 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-950">Version History</h2>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Track published and draft policy versions used for acceptance validation.
          </p>

          <div className="mt-5 space-y-3">
            {policies.map(policy => (
              <button
                key={policy.id}
                type="button"
                onClick={() => setSelectedPolicyId(policy.id)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selectedPolicyId === policy.id
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-950">Version {policy.version}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(policy.publishedAt ?? policy.updatedAt)}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${getPolicyStatusClass(policy.status)}`}>
                    {policy.status}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                  {policy.title}
                </p>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-extrabold text-slate-950">Acceptance Records</h2>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Audit trail for user_id, accepted status, timestamp, optional IP address, policy version, and user role.
            </p>
          </div>
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search user, role, or version"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 sm:w-72"
            />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-3 font-extrabold">Agreement ID</th>
                <th className="py-3 font-extrabold">User ID</th>
                <th className="py-3 font-extrabold">Role</th>
                <th className="py-3 font-extrabold">Version</th>
                <th className="py-3 font-extrabold">Accepted</th>
                <th className="py-3 font-extrabold">Accepted At</th>
                <th className="py-3 font-extrabold">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map(record => (
                  <tr key={record.agreement_id} className="transition hover:bg-emerald-50/20">
                    <td className="py-4 font-mono text-[11px] text-slate-500">{record.agreement_id}</td>
                    <td className="py-4 font-extrabold text-slate-900">{record.user_id}</td>
                    <td className="py-4 font-bold capitalize text-slate-600">{record.user_role}</td>
                    <td className="py-4 font-bold text-emerald-700">{record.version}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {record.accepted ? 'Accepted' : 'No'}
                      </span>
                    </td>
                    <td className="py-4 font-medium text-slate-500">{formatDateTime(record.accepted_at)}</td>
                    <td className="py-4 font-mono text-xs text-slate-500">{record.ip_address ?? 'Not captured'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm font-bold text-slate-400">
                    No acceptance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
