import React, { useState } from 'react';
import { ReceiverObservation } from '../types';
import { ChevronDown, ChevronUp, Sparkles, Target, ShieldAlert, Compass, AlertTriangle } from 'lucide-react';

interface ExplainabilityPanelProps {
  currentScans: ReceiverObservation[];
  currentStep: number;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ currentScans, currentStep }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentScans || currentScans.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 transition-all">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-zinc-200">
                Decision Explainability
              </h4>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                t = {currentStep}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live algorithmic rationale for why the scheduler selected each frequency band
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
        >
          <span>{isExpanded ? 'Hide breakdown' : 'Inspect factors'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
        </button>
      </div>

      {/* Quick Summary Preview (always visible) */}
      <div className="mt-3.5 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-2 text-xs">
        {currentScans.map((scan) => (
          <div
            key={scan.receiverId}
            className="flex-1 min-w-[200px] bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700/60">
                R{scan.receiverId}
              </span>
              <span className="font-medium text-zinc-300 truncate">
                Band {scan.band}: {scan.explanation?.reason?.split(':')[1] || scan.explanation?.reason || `Tuned to Band ${scan.band}`}
              </span>
            </div>
            <span className={`text-[11px] font-mono font-medium shrink-0 ${scan.hit === 1 ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {scan.hit === 1 ? 'HIT' : 'MISS'}
            </span>
          </div>
        ))}
      </div>

      {/* Detailed Factor Breakdown (collapsible) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {currentScans.map((scan) => {
            const exp = scan.explanation;
            return (
              <div
                key={`${scan.receiverId}-${scan.band}`}
                className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3"
              >
                {/* Receiver Sub-header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-100 border border-zinc-700/80">
                      Receiver R{scan.receiverId}
                    </span>
                    <span className="text-xs font-medium text-zinc-300">
                      → Band {scan.band}
                    </span>
                  </div>
                  <span className={`text-[11px] font-mono ${scan.hit === 1 ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                    {scan.hit === 1 ? '✓ Confirmed Hit' : '· Quiet Channel'}
                  </span>
                </div>

                {/* Primary Rationale */}
                <p className="text-xs text-zinc-300 bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800/80 leading-relaxed">
                  {exp?.reason || `Receiver tuned to Band ${scan.band}.`}
                </p>

                {/* Factor Weight Progress Bars */}
                {exp && (
                  <div className="space-y-2 pt-1 text-xs">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      Composite Decision Weights
                    </span>

                    {/* Historical Hit Rate */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Target className="w-3 h-3 text-zinc-400" /> Historical Frequency
                        </span>
                        <span className="font-mono text-zinc-200">{exp.historicalHitRate}%</span>
                      </div>
                      <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-zinc-300 h-full rounded-full" style={{ width: `${exp.historicalHitRate}%` }} />
                      </div>
                    </div>

                    {/* Periodic Radar Prediction */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-zinc-400" /> Periodic Timing Match
                        </span>
                        <span className="font-mono text-zinc-200">{exp.periodicConfidence}%</span>
                      </div>
                      <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-zinc-300 h-full rounded-full" style={{ width: `${exp.periodicConfidence}%` }} />
                      </div>
                    </div>

                    {/* Threat Priority */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3 h-3 text-rose-400" /> Threat Weight
                        </span>
                        <span className="font-mono text-rose-300 font-semibold">{exp.threatScore}%</span>
                      </div>
                      <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500/80 h-full rounded-full" style={{ width: `${exp.threatScore}%` }} />
                      </div>
                    </div>

                    {/* Exploration Incentive */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Compass className="w-3 h-3 text-zinc-400" /> Exploration Incentive
                        </span>
                        <span className="font-mono text-zinc-200">{exp.explorationBonus}%</span>
                      </div>
                      <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-zinc-400/80 h-full rounded-full" style={{ width: `${exp.explorationBonus}%` }} />
                      </div>
                    </div>

                    {/* Decoy Avoidance */}
                    {exp.decoyPenalty > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-amber-300 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Decoy Penalty
                          </span>
                          <span className="font-mono font-semibold">-{exp.decoyPenalty}%</span>
                        </div>
                        <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${exp.decoyPenalty}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
