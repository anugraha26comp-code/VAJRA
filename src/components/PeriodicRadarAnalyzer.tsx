import React from 'react';
import { EnvironmentGrid } from '../utils/ewSimulation';
import { Sparkles, CheckCircle2, Zap, Clock } from 'lucide-react';

interface PeriodicRadarAnalyzerProps {
  env: EnvironmentGrid;
}

export const PeriodicRadarAnalyzer: React.FC<PeriodicRadarAnalyzerProps> = ({ env }) => {
  const periodicBand = 3;
  const spatialBand = 5;

  const getActiveTimesteps = (band: number) => {
    const list: number[] = [];
    for (let t = 0; t < env.numTimesteps; t++) {
      if (env.groundTruth[band][t] === 1) list.push(t);
    }
    return list;
  };

  const periodicTimesteps = getActiveTimesteps(periodicBand);
  const spatialTimesteps = getActiveTimesteps(spatialBand);

  const periodicIntervals = [];
  for (let i = 1; i < periodicTimesteps.length; i++) {
    periodicIntervals.push(periodicTimesteps[i] - periodicTimesteps[i - 1]);
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
              Periodic & Scanning Emitter Timing Predictor
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            When an emitter exhibits a constant pulse repetition interval (PRI) or regular antenna scan pattern,
            the scheduler calculates inter-pulse arrival times <span className="font-mono text-zinc-200">Δt = t_k - t_{'{k-1}'}</span>.
            The receiver schedules dwell windows at <span className="font-mono text-zinc-200">t_next = t_last + T_scan</span> with zero wasted looks.
          </p>
        </div>
        <div className="bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-300 text-xs font-mono flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-400" /> Deterministic Timing Predictor
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Radar 1: Fixed Periodic Radar on Band 3 */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
              <span className="text-sm font-semibold text-zinc-200">Radar P-RAD-03 (Band 3)</span>
            </div>
            <span className="text-[11px] font-mono text-pink-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              True Period: T = 6 steps
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-400">Recorded Pulse Timestamps:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5 font-mono">
                {periodicTimesteps.slice(0, 8).map((t, idx) => (
                  <span key={idx} className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-pink-300 font-bold">
                    t = {t}
                  </span>
                ))}
                {periodicTimesteps.length > 8 && (
                  <span className="text-zinc-500 self-center">+{periodicTimesteps.length - 8} more</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-zinc-400">Inter-Pulse Intervals (Δt):</span>
              <div className="flex items-center gap-2 mt-1.5 font-mono text-zinc-300">
                <span className="text-emerald-400 font-bold">Δt = [{periodicIntervals.slice(0, 6).join(', ')}]</span>
                <span className="text-zinc-500">→ Mode: 6</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-zinc-300">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Predictive Scan Trigger
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                The predictor tunes to Band 3 at exact multiples of <span className="font-mono text-zinc-200">t = 6k + 1</span>,
                achieving near 100% intercept rate without wasting continuous receiver looks.
              </p>
            </div>
          </div>
        </div>

        {/* Radar 2: Spatially Scanning Radar on Band 5 */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="text-sm font-semibold text-zinc-200">Rotating Radar SCAN-05 (Band 5)</span>
            </div>
            <span className="text-[11px] font-mono text-rose-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              Rotation Period: T = 10 steps
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-400">Beam Dwell Timestamps (Receiver Facing):</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5 font-mono">
                {spatialTimesteps.slice(0, 8).map((t, idx) => (
                  <span key={idx} className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-rose-300 font-bold">
                    t = {t}
                  </span>
                ))}
                {spatialTimesteps.length > 8 && (
                  <span className="text-zinc-500 self-center">+{spatialTimesteps.length - 8} more</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-zinc-400">Antenna Rotation Delta:</span>
              <div className="flex items-center gap-2 mt-1.5 font-mono text-zinc-300">
                <span className="text-emerald-400 font-bold">Rotation Cycle = 10 steps</span>
                <span className="text-zinc-500">(Dwell window: 2 steps)</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-zinc-300">
              <div className="flex items-center gap-1.5 text-zinc-200 font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" /> Main-Lobe Synchronization
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                During 8 out of 10 time steps, the radar antenna is oriented away from our receiver. The closed-loop
                scheduler synchronizes dwell checks exclusively when the main lobe sweeps past.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
