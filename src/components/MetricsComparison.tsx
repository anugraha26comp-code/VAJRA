import React from 'react';
import { SimulationMetrics } from '../types';
import { Target, Zap, Clock, ShieldAlert, Award, ArrowUpRight, ArrowDownRight, Check } from 'lucide-react';

interface MetricsComparisonProps {
  allMetrics: Record<string, SimulationMetrics>;
  activeSchedulerId: string;
  onSelectScheduler: (id: string) => void;
}

export const MetricsComparison: React.FC<MetricsComparisonProps> = ({
  allMetrics,
  activeSchedulerId,
  onSelectScheduler,
}) => {
  const metricList: SimulationMetrics[] = Object.values(allMetrics || {}) as SimulationMetrics[];
  const baseline = allMetrics?.['open_loop'];
  const activeMetrics = allMetrics?.[activeSchedulerId] || baseline || metricList[0];

  if (!activeMetrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 6 Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Intercept Rate */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Intercept Rate</span>
            <Target className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 font-mono">
            {activeMetrics.interceptRatePct ?? 0}%
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            {baseline && activeSchedulerId !== 'open_loop' ? (
              (activeMetrics.interceptRatePct ?? 0) >= (baseline.interceptRatePct ?? 0) ? (
                <span className="text-emerald-400 flex items-center font-medium">
                  <ArrowUpRight className="w-3 h-3" /> +{((activeMetrics.interceptRatePct ?? 0) - (baseline.interceptRatePct ?? 0)).toFixed(1)}%
                </span>
              ) : (
                <span className="text-rose-400 flex items-center">
                  <ArrowDownRight className="w-3 h-3" /> {((activeMetrics.interceptRatePct ?? 0) - (baseline.interceptRatePct ?? 0)).toFixed(1)}%
                </span>
              )
            ) : (
              <span className="text-zinc-500">Baseline</span>
            )}
          </div>
        </div>

        {/* 2. Probability of Detection */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">P_d (Detection)</span>
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 font-mono">
            {(activeMetrics.probDetection ?? 0).toFixed(3)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Hit fidelity ratio
          </div>
        </div>

        {/* 3. False Alarm Rate */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">P_fa (False Alarm)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 font-mono">
            {(activeMetrics.probFalseAlarm ?? 0).toFixed(4)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {activeMetrics.falseAlarms ?? 0} false triggers
          </div>
        </div>

        {/* 4. Hostile High-Threat Intercepts */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Hostile Radar</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">
            {activeMetrics.highThreatHits ?? 0} <span className="text-xs font-normal text-zinc-500">hits</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Band 5 Acquisition
          </div>
        </div>

        {/* 5. Average Reward */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Threat Return</span>
            <Award className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 font-mono">
            {(activeMetrics.averageReward ?? 0) > 0 ? `+${(activeMetrics.averageReward ?? 0).toFixed(3)}` : (activeMetrics.averageReward ?? 0).toFixed(3)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Threat-weighted net
          </div>
        </div>

        {/* 6. Intercept Delay */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Burst Latency</span>
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100 font-mono">
            {activeMetrics.avgInterceptTimeError ?? 0} <span className="text-xs font-normal text-zinc-500">steps</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Time to detect burst
          </div>
        </div>
      </div>

      {/* Comparative Matrix Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
            Algorithm Benchmark Comparison
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Side-by-side figures of merit: Open-Loop fixed sweep vs. Closed-Loop Machine Learning schedulers
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                <th className="py-3 px-3">Scan Strategy</th>
                <th className="py-3 px-3 text-center">Hits / Total</th>
                <th className="py-3 px-3 text-center">Intercept Rate</th>
                <th className="py-3 px-3 text-center">P_d (Detect)</th>
                <th className="py-3 px-3 text-center">P_fa (False Alarm)</th>
                <th className="py-3 px-3 text-center">Burst Latency</th>
                <th className="py-3 px-3 text-center">Mean Reward</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {metricList.map((m) => {
                const isSelected = m.schedulerId === activeSchedulerId;
                const isBaseline = m.schedulerId === 'open_loop';

                return (
                  <tr
                    key={m.schedulerId}
                    onClick={() => onSelectScheduler(m.schedulerId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-zinc-800/70 text-zinc-100 font-semibold'
                        : 'hover:bg-zinc-800/30 text-zinc-300'
                    }`}
                  >
                    <td className="py-3.5 px-3 flex items-center gap-2.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-emerald-400 ring-2 ring-emerald-400/40' : 'bg-zinc-700'
                        }`}
                      />
                      <span className="font-sans font-medium text-zinc-200">
                        {m.schedulerName}
                      </span>
                      {isBaseline && (
                        <span className="text-[10px] uppercase font-sans font-semibold tracking-wide px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                          Baseline
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold">
                      <span className="text-emerald-400">{m.hits}</span> / {m.totalScanOpportunities ?? m.totalSteps}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${m.interceptRatePct}%` }}
                          />
                        </div>
                        <span className="text-zinc-100 font-bold">{m.interceptRatePct}%</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center text-zinc-200">
                      {(m.probDetection ?? 0).toFixed(3)}
                    </td>

                    <td className="py-3.5 px-3 text-center text-zinc-400">
                      {(m.probFalseAlarm ?? 0).toFixed(4)}
                    </td>

                    <td className="py-3.5 px-3 text-center text-zinc-200">
                      {(m.avgInterceptTimeError ?? 0).toFixed(2)} steps
                    </td>

                    <td className="py-3.5 px-3 text-center text-zinc-200">
                      {(m.averageReward ?? 0) > 0 ? `+${(m.averageReward ?? 0).toFixed(3)}` : (m.averageReward ?? 0).toFixed(3)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-sans">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectScheduler(m.schedulerId);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
