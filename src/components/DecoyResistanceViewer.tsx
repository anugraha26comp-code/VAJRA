import React, { useState } from 'react';
import { runDecoyResistanceTraining } from '../utils/ewSimulation';
import { TrainingEpisodeRecord } from '../types';
import { ShieldCheck, AlertTriangle, TrendingDown, Play, RotateCcw, Target } from 'lucide-react';

export const DecoyResistanceViewer: React.FC = () => {
  const [episodes, setEpisodes] = useState<number>(30);
  const [history, setHistory] = useState<TrainingEpisodeRecord[]>(() => runDecoyResistanceTraining(30, 60));
  const [isRetraining, setIsRetraining] = useState(false);

  const handleRetrain = () => {
    setIsRetraining(true);
    setTimeout(() => {
      setHistory(runDecoyResistanceTraining(episodes, 60));
      setIsRetraining(false);
    }, 400);
  };

  const initialRec = history[0] || { decoyAttentionPct: 35, highThreatCatchRatePct: 55 };
  const finalRec = history[history.length - 1] || { decoyAttentionPct: 4.5, highThreatCatchRatePct: 92 };

  const svgWidth = 640;
  const svgHeight = 200;
  const padding = 36;

  // Decoy attention points
  const decoyPoints = history.map((rec, i) => {
    const x = padding + (i / (history.length - 1 || 1)) * (svgWidth - 2 * padding);
    const y = svgHeight - padding - (rec.decoyAttentionPct / 50) * (svgHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // High threat catch points
  const threatPoints = history.map((rec, i) => {
    const x = padding + (i / (history.length - 1 || 1)) * (svgWidth - 2 * padding);
    const y = svgHeight - padding - (rec.highThreatCatchRatePct / 100) * (svgHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
              Decoy Resistance & Countermeasure Immunity
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Adversaries deploy blinking RF transponders (<span className="text-zinc-300 font-mono">DECOY-00 on Band 0</span>)
            to bait EW receivers into wasting receiver looks. The Threat-Weighted ML scheduler recognizes the decoy trap
            and systematically drops attention to &lt; 5%, redirecting sensors to real hostile targets.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetrain}
          disabled={isRetraining}
          className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
        >
          {isRetraining ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRetraining ? 'Simulating...' : 'Retrain Decoy Immunity'}</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Initial Decoy Looks
          </span>
          <div className="text-xl font-bold text-zinc-200 font-mono mt-1.5">
            {initialRec.decoyAttentionPct}% of all scans
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Naive receiver lured by high blink frequency.
          </p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> Trained Decoy Looks
          </span>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1.5">
            {finalRec.decoyAttentionPct}% residual looks
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Decoy successfully deprioritized (-{Number(((initialRec?.decoyAttentionPct ?? 35) - (finalRec?.decoyAttentionPct ?? 5)).toFixed(1))}%)
          </p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-rose-400" /> Hostile Radar Catch Rate
          </span>
          <div className="text-xl font-bold text-rose-400 font-mono mt-1.5">
            {finalRec.highThreatCatchRatePct}%
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Sensors redirected to Band 5 (Hostile Radar).
          </p>
        </div>
      </div>

      {/* Dual-Line Graph */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 mb-2 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2.5 h-1 bg-amber-400 rounded-full" /> Attention to Decoy (% Scans)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2.5 h-1 bg-rose-400 rounded-full" /> Hostile Radar Catch Rate (%)
            </span>
          </div>
          <span className="font-mono text-zinc-500 text-[11px]">Episodes (1 to {episodes})</span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 select-none">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const y = svgHeight - padding - frac * (svgHeight - 2 * padding);
              return (
                <g key={idx}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={svgWidth - padding}
                    y2={y}
                    stroke="#27272a"
                    strokeDasharray="3 3"
                    strokeWidth="0.8"
                  />
                  <text
                    x={padding - 8}
                    y={y + 3}
                    fill="#71717a"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {Math.round(frac * 100)}%
                  </text>
                </g>
              );
            })}

            {/* High Threat Catch Rate (Rose Line) */}
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={threatPoints}
            />

            {/* Decoy Attention (Amber Line) */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={decoyPoints}
            />

            {/* Axes */}
            <line
              x1={padding}
              y1={svgHeight - padding}
              x2={svgWidth - padding}
              y2={svgHeight - padding}
              stroke="#3f3f46"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={svgHeight - padding}
              stroke="#3f3f46"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
