import React from 'react';
import { EnvironmentGrid, compareMultiReceiverPerformance } from '../utils/ewSimulation';
import { MultiReceiverComparisonItem, SchedulerType } from '../types';
import { Users, CheckCircle2, TrendingUp, Zap, Clock, ShieldAlert } from 'lucide-react';

interface MultiReceiverBenchmarkProps {
  env: EnvironmentGrid;
  schedulerType: SchedulerType;
  currentReceiverCount: number;
  onSelectReceiverCount: (count: number) => void;
}

export const MultiReceiverBenchmark: React.FC<MultiReceiverBenchmarkProps> = ({
  env,
  schedulerType,
  currentReceiverCount,
  onSelectReceiverCount,
}) => {
  const comparisonData: MultiReceiverComparisonItem[] = compareMultiReceiverPerformance(env, schedulerType);

  const maxHits = Math.max(...comparisonData.map((d) => d.hits), 1);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
              Multi-Receiver Swarm Cooperation
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Single receivers suffer from the &quot;flashlight effect&quot;: focusing on one band leaves the remaining spectrum unmonitored.
            Coordinating 2 or 3 receivers with shared ML state eliminates redundant looks and multiplies signal interception across all frequency bands.
          </p>
        </div>

        {/* Quick selector */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800 text-xs">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onSelectReceiverCount(n)}
              className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-all ${
                currentReceiverCount === n
                  ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              {n} {n === 1 ? 'Sensor' : 'Sensors'}
            </button>
          ))}
        </div>
      </div>

      {/* Comparative Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {comparisonData.map((item) => {
          const isCurrent = item.numReceivers === currentReceiverCount;
          const badgeText = item.numReceivers === 1 ? '1 Receiver (Baseline)' : item.numReceivers === 2 ? '2 Receivers (Cooperative)' : '3 Receivers (Swarm)';

          return (
            <div
              key={item.numReceivers}
              onClick={() => onSelectReceiverCount(item.numReceivers)}
              className={`cursor-pointer rounded-2xl p-5 transition-all border ${
                isCurrent
                  ? 'bg-zinc-900 border-zinc-600 shadow-md ring-1 ring-zinc-500/30'
                  : 'bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-200">{badgeText}</span>
                {isCurrent && (
                  <span className="text-[10px] uppercase font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    Active
                  </span>
                )}
              </div>

              {/* Big Hit Counter */}
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold font-mono text-zinc-100">
                  {item.hits}
                </span>
                <span className="text-xs text-zinc-400">intercepted signals</span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs border-t border-zinc-800/80 pt-3.5">
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Scan Intercept Rate:</span>
                  <span className="font-mono font-medium text-zinc-200">{item.interceptRatePct}%</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Hostile Radar Intercepts:</span>
                  <span className="font-mono font-semibold text-rose-400">{item.highThreatHits} hits</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500">Mean Intercept Latency:</span>
                  <span className="font-mono text-zinc-200">{item.avgDelay} steps</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Bar Chart: Total Intercept Comparison */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium text-zinc-200">
            Total Intercepted Transmissions Comparison (1 vs 2 vs 3 Receivers)
          </span>
          <span className="font-mono text-zinc-500">T = {env.numTimesteps} steps</span>
        </div>

        <div className="space-y-3 pt-1">
          {comparisonData.map((d) => {
            const pct = Math.round((d.hits / maxHits) * 100);
            const isSelected = d.numReceivers === currentReceiverCount;

            return (
              <div key={d.numReceivers} className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className={isSelected ? 'text-zinc-100 font-semibold' : 'text-zinc-400'}>
                    {d.numReceivers} Sensor{d.numReceivers > 1 ? 's' : ''}{' '}
                    {d.numReceivers === 2 ? '(Cooperative split)' : d.numReceivers === 3 ? '(Full Swarm coverage)' : '(Baseline)'}
                  </span>
                  <span className="text-zinc-200 font-medium">{d.hits} Hits ({d.interceptRatePct}%)</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSelected ? 'bg-zinc-100' : 'bg-zinc-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
