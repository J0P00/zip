import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { TermsPolicyVersion } from '../types';

interface TermsAgreementModalProps {
  isOpen: boolean;
  policy: TermsPolicyVersion;
  mode?: 'registration' | 'reauth' | 'view';
  initialTab?: PolicyTab;
  onClose: () => void;
  onAccept?: () => void;
}

type PolicyTab = 'terms' | 'privacy';

const renderPolicyContent = (content: string) => {
  return content.split('\n').map((line, index) => {
    const value = line.trim();

    if (!value) {
      return <div key={`space-${index}`} className="h-2" />;
    }

    if (/^\d+\.\s/.test(value) || value === 'Privacy Policy') {
      return (
        <h3 key={`${value}-${index}`} className="pt-2 text-sm font-extrabold text-slate-950">
          {value}
        </h3>
      );
    }

    if (value.startsWith('- ')) {
      return (
        <p key={`${value}-${index}`} className="flex gap-2 text-sm font-medium leading-6 text-slate-600">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6b7f2a]" />
          <span>{value.slice(2)}</span>
        </p>
      );
    }

    return (
      <p key={`${value}-${index}`} className="text-sm font-medium leading-6 text-slate-600">
        {value}
      </p>
    );
  });
};

export default function TermsAgreementModal({
  isOpen,
  policy,
  mode = 'registration',
  initialTab = 'terms',
  onClose,
  onAccept
}: TermsAgreementModalProps) {
  const [activeTab, setActiveTab] = useState<PolicyTab>('terms');
  const [readSections, setReadSections] = useState<Record<PolicyTab, boolean>>({
    terms: false,
    privacy: false
  });
  const contentRef = useRef<HTMLDivElement | null>(null);

  const requireAcceptance = Boolean(onAccept);
  const canAccept = !requireAcceptance || (readSections.terms && readSections.privacy);

  const markCurrentSectionRead = () => {
    const element = contentRef.current;
    if (!element) return;

    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 24;
    if (isAtBottom || element.scrollHeight <= element.clientHeight + 4) {
      setReadSections(prev => ({ ...prev, [activeTab]: true }));
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab(initialTab);
    setReadSections({ terms: false, privacy: false });
  }, [isOpen, policy.id, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    const frame = window.requestAnimationFrame(markCurrentSectionRead);
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, isOpen]);

  const activeContent = activeTab === 'terms' ? policy.termsContent : policy.privacyContent;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-agreement-title"
        >
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-md border border-[#dfe8c5] bg-[#f6f8ee] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#5f6f24]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Version {policy.version}
                  </div>
                  <h2 id="terms-agreement-title" className="mt-3 text-xl font-black tracking-tight text-slate-950">
                    {policy.title}
                  </h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {mode === 'reauth'
                      ? 'An updated agreement must be accepted before continuing to the workspace.'
                      : 'Review the platform terms and privacy policy for student and teacher accounts.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  aria-label="Close Terms and Agreement"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {[
                  { id: 'terms' as PolicyTab, label: 'Terms and Conditions', icon: <FileText className="h-4 w-4" /> },
                  { id: 'privacy' as PolicyTab, label: 'Privacy Policy', icon: <LockKeyhole className="h-4 w-4" /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition ${
                      activeTab === tab.id
                        ? 'bg-[#6b7f2a] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                    {readSections[tab.id] && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={contentRef}
              onScroll={markCurrentSectionRead}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6"
            >
              {renderPolicyContent(activeContent)}
            </div>

            <footer className="border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              {requireAcceptance && !canAccept && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Review both Terms and Conditions and Privacy Policy before accepting.</span>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                >
                  {requireAcceptance ? 'Cancel' : 'Close'}
                </button>

                {requireAcceptance && (
                  <button
                    type="button"
                    onClick={onAccept}
                    disabled={!canAccept}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6b7f2a] px-4 text-sm font-extrabold text-white shadow-lg shadow-[#6b7f2a]/15 transition hover:-translate-y-0.5 hover:bg-[#5f6f24] focus:outline-none focus:ring-4 focus:ring-[#dfe8c5] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    I have read and agree to the Terms and Agreement
                  </button>
                )}
              </div>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
