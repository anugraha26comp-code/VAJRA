import React, { useState } from 'react';
import { TrainingEpisodeRecord } from '../types';
import { runTrainingLoopSimulation } from '../utils/ewSimulation';
import { TrendingUp, Play, RotateCcw } from 'lucide-react';

export const TrainingCurveViewer: React.FC = () => {
  const [episodes, setEpisodes] = useState<number>(30);
  const [history, setHistory] = useState<TrainingEpisodeRecord[]>(() => runTrainingLoopSimulation(30, 60));
  const [isRetraining, setIsRetraining] = useState(false);

  const handleRetrain = () => {
    setIsRetraining(true);
    setTimeout(() => {
      const records = runTrainingLoopSimulation(episodes, 60);
      setHistory(records);
      setIsRetraining(false);
    }, 400);
  };

  const initialRecord = history[0] || { hitRatePct: 0, averageReward: 0, avgTimeError: 0 };
  const finalRecord = history[history.length - 1] || { hitRatePct: 0, averageReward: 0, avgTimeError: 0 };

  const maxHitRate = 100;
  const svgWidth = 640;
  const svgHeight = 200;
  const padding = 36;

  // Generate SVG path points for Hit Rate
  const hitRatePoints = history.map((rec, i) => {
    const x = padding + (i / (history.length - 1 || 1)) * (svgWidth - 2 * padding);
    const y = svgHeight - padding - (rec.hitRatePct / maxHitRate) * (svgHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // Generate SVG path points for Average Reward (scaled from -0.1 to 1.0)
  const rewardPoints = history.map((rec, i) => {
    const normReward = (rec.averageReward + 0.2) / 1.2;
    const x = padding + (i / (history.length - 1 || 1)) * (svgWidth - 2 * padding);
    const y = svgHeight - padding - Math.max(0, Math.min(1, normReward)) * (svgHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
              Reinforcement Learning Training Curve
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Tracks Q-Learning receiver agent convergence across simulated episodes as exploration decays (ε: 0.40 → 0.05).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
            <span className="text-zinc-400">Episodes:</span>
            <select
              value={episodes}
              onChange={(e) => setEpisodes(Number(e.target.value))}
              className="bg-zinc-900 text-zinc-200 border border-zinc-700/80 rounded px-2 py-0.5 text-xs focus:outline-none"
            >
              <option value={20}>20 Episodes</option>
              <option value={30}>30 Episodes</option>
              <option value={50}>50 Episodes</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleRetrain}
            disabled={isRetraining}
            className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {isRetraining ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isRetraining ? 'Training...' : 'Run Training Session'}</span>
          </button>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs text-zinc-400">Initial Episode Hit Rate</span>
          <div className="text-xl font-bold text-zinc-300 font-mono mt-1">
            {initialRecord.hitRatePct}%
          </div>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">Uninformed exploration</span>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs text-zinc-400">Trained Episode Hit Rate</span>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {finalRecord.hitRatePct}%
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-0.5 block">
            +{(((finalRecord?.hitRatePct ?? 0) - (initialRecord?.hitRatePct ?? 0))).toFixed(1)}% improvement
          </span>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs text-zinc-400">Mean Intercept Latency</span>
          <div className="text-xl font-bold text-zinc-200 font-mono mt-1">
            {finalRecord.avgTimeError} steps
          </div>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">
            Reduced from {initialRecord.avgTimeError} steps
          </span>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-1 bg-emerald-400 rounded-full" /> Intercept Rate (%)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2.5 h-1 bg-amber-400 rounded-full" /> Average Reward (Scale: -0.1 to +1.0)
            </span>
          </div>
          <span className="font-mono text-zinc-500 text-[11px]">Training Episodes</span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48 select-none"
          >
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

            {/* Hit rate curve (Emerald) */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={hitRatePoints}
            />

            {/* Average reward curve (Amber) */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.8"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={rewardPoints}
            />

            {/* Episode dots */}
            {history.map((rec, i) => {
              const x = padding + (i / (history.length - 1 || 1)) * (svgWidth - 2 * padding);
              const y = svgHeight - padding - (rec.hitRatePct / maxHitRate) * (svgHeight - 2 * padding);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#10b981"
                  className="hover:r-5 cursor-pointer transition-all"
                >
                  <title>
                    Episode {rec.episode}: Hit Rate {rec.hitRatePct}%, Reward: {rec.averageReward}
                  </title>
                </circle>
              );
            })}

            {/* X-axis labels */}
            <text x={padding} y={svgHeight - 12} fill="#71717a" fontSize="9" fontFamily="monospace">
              Ep 1
            </text>
            <text
              x={svgWidth / 2}
              y={svgHeight - 12}
              fill="#71717a"
              fontSize="9"
              textAnchor="middle"
              fontFamily="monospace"
            >
              Ep {Math.round(history.length / 2)}
            </text>
            <text
              x={svgWidth - padding}
              y={svgHeight - 12}
              fill="#71717a"
              fontSize="9"
              textAnchor="end"
              fontFamily="monospace"
            >
              Ep {history.length}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
