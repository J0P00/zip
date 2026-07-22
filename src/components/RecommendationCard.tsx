import React from 'react';
import { ArrowRight, CheckCircle2, Lightbulb, RotateCcw, Trophy } from 'lucide-react';
import { AdaptiveRecommendation, StudentSubView } from '../types';

interface RecommendationCardProps {
  recommendation: AdaptiveRecommendation | null;
  onNavigateTo?: (view: StudentSubView) => void;
  compact?: boolean;
}

const typeStyles = {
  Remedial: {
    wrapper: 'border-rose-200 bg-rose-50/70',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: <RotateCcw className="h-5 w-5 text-rose-600" />,
    label: 'Remedial'
  },
  Continue: {
    wrapper: 'border-amber-200 bg-amber-50/70',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <Lightbulb className="h-5 w-5 text-amber-600" />,
    label: 'Continue'
  },
  Advanced: {
    wrapper: 'border-emerald-200 bg-emerald-50/70',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <Trophy className="h-5 w-5 text-emerald-600" />,
    label: 'Advanced'
  }
};

export default function RecommendationCard({ recommendation, onNavigateTo, compact = false }: RecommendationCardProps) {
  if (!recommendation) return null;

  const styles = typeStyles[recommendation.type];

  return (
    <section className={`rounded-lg border p-5 shadow-sm ${styles.wrapper}`} id="adaptive-recommendation-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-white/70 bg-white p-2 shadow-sm">
            {styles.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-950">{recommendation.title}</h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${styles.badge}`}>
                {styles.label}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{recommendation.summary}</p>
            <p className="mt-2 text-[11px] font-bold text-slate-500">
              Reason: {recommendation.reason}
            </p>
          </div>
        </div>

        {(recommendation.quizScore !== undefined || recommendation.codingScore !== undefined) && (
          <div className="grid min-w-32 grid-cols-2 gap-2 text-center sm:grid-cols-1">
            {recommendation.quizScore !== undefined && (
              <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">
                <span className="block text-[9px] font-black uppercase text-slate-400">Quiz Score</span>
                <strong className="font-mono text-sm text-slate-900">{recommendation.quizScore}%</strong>
              </div>
            )}
            {recommendation.codingScore !== undefined && (
              <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">
                <span className="block text-[9px] font-black uppercase text-slate-400">Coding Score</span>
                <strong className="font-mono text-sm text-slate-900">{recommendation.codingScore}%</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {recommendation.actions.map(action => (
            <div key={action} className="flex items-start gap-2 rounded-lg border border-white/70 bg-white/70 p-3 text-xs font-bold text-slate-700">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{action}</span>
            </div>
          ))}
        </div>
      )}

      {onNavigateTo && (
        <button
          type="button"
          onClick={() => onNavigateTo(recommendation.targetView)}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
        >
          {recommendation.primaryActionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </section>
  );
}
