import React, { useMemo } from 'react';
import { SchedulerType, ReceiverObservation } from '../types';
import {
  Clock,
  Repeat,
  Radio,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface ScanCycleProgressBarProps {
  currentStep: number;
  totalSteps: number;
  activeScheduler: SchedulerType;
  numReceivers: number;
  numBands: number;
  speedMultiplier: number;
  isPlaying: boolean;
  history: ReceiverObservation[];
}

export const ScanCycleProgressBar: React.FC<ScanCycleProgressBarProps> = ({
  currentStep,
  totalSteps,
  activeScheduler,
  numReceivers,
  numBands,
  speedMultiplier,
  isPlaying,
  history,
}) => {
  // Step dwell duration in milliseconds
  const intervalMs = Math.max(60, Math.round(260 / speedMultiplier));

  // Compute Cycle Configuration based on activeScheduler
  const cycleData = useMemo(() => {
    let cycleLength = 4;
    let cycleName = 'Deterministic Sweep';
    let cycleBadge = 'Round-Robin';
    let cycleColorTheme = 'blue';
    let cycleExplanation = '';
    let phaseDescription = '';
    let bandsInStep: number[] = [];

    switch (activeScheduler) {
      case 'open_loop': {
        cycleLength = Math.max(1, Math.ceil(numBands / numReceivers));
        cycleName = 'Round-Robin Spectrum Sweep';
        cycleBadge = 'Deterministic Loop';
        cycleColorTheme = 'blue';
        const stepInCycle = currentStep % cycleLength;
        const startBand = (stepInCycle * numReceivers) % numBands;
        const assignedBands: number[] = [];
        for (let r = 0; r < numReceivers; r++) {
          assignedBands.push((startBand + r) % numBands);
        }
        bandsInStep = assignedBands;
        cycleExplanation = `Fixed sequential scan: With ${numReceivers} sensor(s), all ${numBands} frequency channels are surveyed sequentially every ${cycleLength} timesteps without adapting to pulse arrival times.`;
        phaseDescription = `Covering Bands ${assignedBands.join(', ')} (Step ${stepInCycle + 1} of ${cycleLength})`;
        break;
      }

      case 'hybrid_predictor': {
        cycleLength = 6; // Pulse Repetition Interval (PRI) of P-RAD-03
        cycleName = 'Threat-Aware PRI & Tracking Cycle';
        cycleBadge = 'PRI Synchronized';
        cycleColorTheme = 'emerald';
        const priPhase = currentStep % cycleLength;
        cycleExplanation = `Harmonic synchronization cycle: Aligns receiver looks with the estimated 6-step pulse recurrence of periodic radar while allocating secondary sensors to continuous High-Threat Band 5 acquisition.`;
        phaseDescription =
          priPhase === 0
            ? '🎯 PREDICTED FIRING WINDOW: Synchronized intercept on periodic radar channel'
            : `PRI Cycle Step ${priPhase + 1} of ${cycleLength} (Surveillance & Threat Dwell)`;
        break;
      }

      case 'ucb': {
        cycleLength = 5;
        cycleName = 'Upper Confidence Bound (UCB) Evaluation Epoch';
        cycleBadge = 'Bandit UCB1';
        cycleColorTheme = 'purple';
        const ucbPhase = currentStep % cycleLength;
        cycleExplanation = `Confidence interval epoch: Balances empirical reward mean Q(b) with upper confidence uncertainty bonus U_i(t) = √(2 ln t / N_i) over 5-step sampling epochs.`;
        phaseDescription =
          ucbPhase === 0
            ? 'Re-evaluating Upper Confidence Bounds across all bands'
            : `Exploitation Dwell (Step ${ucbPhase + 1} of ${cycleLength})`;
        break;
      }

      case 'epsilon_greedy': {
        cycleLength = 5;
        cycleName = 'ε-Greedy Exploration/Exploitation Window';
        cycleBadge = 'ε-Greedy Bandit';
        cycleColorTheme = 'amber';
        const epsPhase = currentStep % cycleLength;
        cycleExplanation = `Decision epoch: Samples highest estimated empirical reward band 85% of looks while reserving 15% random exploration looks to discover hopping emitters.`;
        phaseDescription =
          epsPhase === 0
            ? 'Exploration Horizon Evaluation'
            : `Greedy Exploitation Step (${epsPhase + 1} of ${cycleLength})`;
        break;
      }

      case 'q_learning': {
        cycleLength = 4;
        cycleName = 'Q-Learning Temporal Difference Cycle';
        cycleBadge = 'RL Bellman Update';
        cycleColorTheme = 'rose';
        const qPhase = currentStep % cycleLength;
        cycleExplanation = `Reinforcement learning cycle: Evaluates state-action values Q(s, a) and propagates temporal difference Bellman updates across consecutive observation steps.`;
        phaseDescription = `TD Value Update Step ${qPhase + 1} of ${cycleLength}`;
        break;
      }
    }

    const currentCycleNumber = Math.floor(currentStep / cycleLength) + 1;
    const totalCycles = Math.ceil(totalSteps / cycleLength);
    const stepInCycle = (currentStep % cycleLength) + 1;
    const cycleProgressPct = Math.round((stepInCycle / cycleLength) * 100);
    const cycleDurationMs = intervalMs * cycleLength;

    // Calculate hits and looks within this current cycle so far
    const cycleStartStep = Math.floor(currentStep / cycleLength) * cycleLength;
    const currentCycleScans = history.filter(
      (h) => h.timestep >= cycleStartStep && h.timestep <= currentStep
    );
    const cycleHits = currentCycleScans.filter((s) => s.hit === 1).length;
    const cycleLooks = currentCycleScans.length;

    return {
      cycleLength,
      cycleName,
      cycleBadge,
      cycleColorTheme,
      cycleExplanation,
      phaseDescription,
      bandsInStep,
      currentCycleNumber,
      totalCycles,
      stepInCycle,
      cycleProgressPct,
      cycleDurationMs,
      cycleHits,
      cycleLooks,
    };
  }, [
    activeScheduler,
    currentStep,
    numBands,
    numReceivers,
    totalSteps,
    intervalMs,
    history,
  ]);

  // Styling based on color theme
  const themeClasses = {
    blue: {
      border: 'border-blue-500/40',
      badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
      fill: 'from-blue-600 via-indigo-500 to-sky-400',
      glow: 'shadow-[0_0_16px_rgba(56,189,248,0.35)]',
      activeTick: 'bg-sky-400 ring-2 ring-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.8)]',
      pastTick: 'bg-blue-600',
      futureTick: 'bg-zinc-800',
      accentText: 'text-sky-400',
    },
    emerald: {
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
      fill: 'from-emerald-600 via-teal-500 to-cyan-400',
      glow: 'shadow-[0_0_16px_rgba(52,211,153,0.35)]',
      activeTick: 'bg-emerald-400 ring-2 ring-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
      pastTick: 'bg-emerald-600',
      futureTick: 'bg-zinc-800',
      accentText: 'text-emerald-400',
    },
    purple: {
      border: 'border-purple-500/40',
      badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
      fill: 'from-purple-600 via-violet-500 to-fuchsia-400',
      glow: 'shadow-[0_0_16px_rgba(192,132,252,0.35)]',
      activeTick: 'bg-purple-400 ring-2 ring-purple-300 shadow-[0_0_10px_rgba(192,132,252,0.8)]',
      pastTick: 'bg-purple-600',
      futureTick: 'bg-zinc-800',
      accentText: 'text-purple-400',
    },
    amber: {
      border: 'border-amber-500/40',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
      fill: 'from-amber-600 via-amber-500 to-yellow-400',
      glow: 'shadow-[0_0_16px_rgba(251,191,36,0.35)]',
      activeTick: 'bg-amber-400 ring-2 ring-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]',
      pastTick: 'bg-amber-600',
      futureTick: 'bg-zinc-800',
      accentText: 'text-amber-400',
    },
    rose: {
      border: 'border-rose-500/40',
      badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
      fill: 'from-rose-600 via-pink-500 to-rose-400',
      glow: 'shadow-[0_0_16px_rgba(251,113,133,0.35)]',
      activeTick: 'bg-rose-400 ring-2 ring-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.8)]',
      pastTick: 'bg-rose-600',
      futureTick: 'bg-zinc-800',
      accentText: 'text-rose-400',
    },
  }[cycleData.cycleColorTheme as 'blue' | 'emerald' | 'purple' | 'amber' | 'rose'] || {
    border: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    fill: 'from-emerald-600 via-teal-500 to-cyan-400',
    glow: 'shadow-[0_0_16px_rgba(52,211,153,0.35)]',
    activeTick: 'bg-emerald-400 ring-2 ring-emerald-300',
    pastTick: 'bg-emerald-600',
    futureTick: 'bg-zinc-800',
    accentText: 'text-emerald-400',
  };

  return (
    <div className={`bg-zinc-900/70 border ${themeClasses.border} rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 relative overflow-hidden select-none`}>
      <style>{`
        @keyframes scanCycleLaser {
          0% { transform: translateX(-100%); opacity: 0; }
          40% { opacity: 0.85; }
          100% { transform: translateX(350%); opacity: 0; }
        }
        @keyframes microDwellFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>

      {/* Header Row: Cycle Metadata & Timing */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shrink-0">
            <Repeat className={`w-4 h-4 ${themeClasses.accentText} ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white font-mono tracking-tight">
                {cycleData.cycleName}
              </h4>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${themeClasses.badgeBg}`}>
                {cycleData.cycleBadge}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Scan cycle timing & phase tracking for <span className="font-semibold text-zinc-200">{cycleData.cycleBadge}</span>
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-zinc-950/80 px-2.5 py-1 rounded-xl border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
            <span className="text-zinc-500">Cycle:</span>
            <span className="font-bold text-white">#{cycleData.currentCycleNumber}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{cycleData.totalCycles}</span>
          </div>

          <div className="bg-zinc-950/80 px-2.5 py-1 rounded-xl border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500">Period:</span>
            <span className="font-bold text-white">{cycleData.cycleLength}t</span>
            <span className="text-zinc-500">({cycleData.cycleDurationMs}ms)</span>
          </div>

          <div className={`px-2.5 py-1 rounded-xl border font-bold ${themeClasses.badgeBg}`}>
            {cycleData.cycleProgressPct}%
          </div>
        </div>
      </div>

      {/* Main Scan Cycle Progress Bar Animation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-300 flex items-center gap-1.5">
            <Activity className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>Cycle Step:</span>
            <strong className="text-white font-bold">
              {cycleData.stepInCycle} of {cycleData.cycleLength}
            </strong>
            <span className="text-zinc-500 hidden sm:inline">&bull; {cycleData.phaseDescription}</span>
          </span>

          <span className="text-zinc-400 text-[11px]">
            {cycleData.cycleHits} {cycleData.cycleHits === 1 ? 'Hit' : 'Hits'} / {cycleData.cycleLooks} Looks this cycle
          </span>
        </div>

        {/* Progress Track Container */}
        <div className="relative h-6 bg-zinc-950 rounded-xl p-1 border border-zinc-800/90 flex items-center overflow-hidden shadow-inner">
          {/* Animated Gradient Fill Bar */}
          <div
            className={`h-full rounded-lg bg-gradient-to-r ${themeClasses.fill} ${themeClasses.glow} transition-all duration-200 ease-out relative overflow-hidden`}
            style={{ width: `${cycleData.cycleProgressPct}%` }}
          >
            {/* Moving Laser / Light Beam Animation when playing */}
            {isPlaying && (
              <div
                className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none"
                style={{
                  animation: 'scanCycleLaser 1.8s infinite linear',
                }}
              />
            )}
          </div>

          {/* Segmented Timestep Ticks */}
          <div className="absolute inset-x-2 inset-y-0 flex items-center justify-between pointer-events-none px-1">
            {Array.from({ length: cycleData.cycleLength }, (_, idx) => {
              const isPast = idx < cycleData.stepInCycle - 1;
              const isActive = idx === cycleData.stepInCycle - 1;
              const isFuture = idx > cycleData.stepInCycle - 1;

              return (
                <div key={idx} className="flex flex-col items-center justify-center relative">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-200 flex items-center justify-center ${
                      isActive
                        ? `${themeClasses.activeTick} animate-pulse scale-125 z-20`
                        : isPast
                        ? `${themeClasses.pastTick} opacity-90`
                        : `${themeClasses.futureTick} opacity-40`
                    }`}
                  >
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-ping" />
                    )}
                  </div>
                  <span
                    className={`absolute -bottom-4 text-[9px] font-mono ${
                      isActive ? 'text-white font-bold' : 'text-zinc-500'
                    }`}
                  >
                    t+{idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Micro-Dwell Timing Animation (Progress within current step) */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
            <span>Dwell Clock: {intervalMs}ms / timestep</span>
            <span>
              {isPlaying ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Clock Running
                </span>
              ) : (
                <span className="text-zinc-500">Clock Paused</span>
              )}
            </span>
          </div>

          <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              key={`${currentStep}-${isPlaying}`}
              className={`h-full rounded-full bg-gradient-to-r ${themeClasses.fill}`}
              style={{
                animation: isPlaying ? `microDwellFill ${intervalMs}ms linear forwards` : 'none',
                width: isPlaying ? undefined : '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Cycle Strategy Explanation Card */}
      <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2 max-w-3xl">
          <Sparkles className={`w-3.5 h-3.5 ${themeClasses.accentText} mt-0.5 shrink-0`} />
          <p className="text-zinc-300 leading-relaxed text-[11px]">
            {cycleData.cycleExplanation}
          </p>
        </div>

        {cycleData.bandsInStep.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-500">Current Dwell:</span>
            <span className="text-white font-bold">
              Band {cycleData.bandsInStep.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
