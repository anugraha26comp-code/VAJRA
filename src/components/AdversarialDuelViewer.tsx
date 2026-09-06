import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldAlert,
  Swords,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Flame,
  Zap,
  Radio,
  Clock,
  Target,
  Eye,
  Crosshair,
  TrendingUp,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  AdversaryMode,
  SchedulerType,
  AdversarialDuelMetrics,
  DuelEvent,
  PulseTrainItem,
} from '../types';
import {
  runAdversarialDuelSimulation,
  runAdversarialComparison,
  AdversarialComparisonRow,
} from '../utils/ewSimulation';

interface AdversarialDuelViewerProps {
  initialAdversaryMode?: AdversaryMode;
  onAdversaryModeChange?: (mode: AdversaryMode) => void;
  numReceivers: number;
  numTimesteps: number;
  randomSeed: number;
}

export const AdversarialDuelViewer: React.FC<AdversarialDuelViewerProps> = ({
  initialAdversaryMode = 'cognitive_evasion',
  onAdversaryModeChange,
  numReceivers,
  numTimesteps,
  randomSeed,
}) => {
  const [adversaryMode, setAdversaryMode] = useState<AdversaryMode>(initialAdversaryMode);
  const [activeScheduler, setActiveScheduler] = useState<SchedulerType>('hybrid_predictor');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [logFilter, setLogFilter] = useState<'all' | 'red' | 'blue' | 'evacuation'>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Synchronize when prop changes
  useEffect(() => {
    if (initialAdversaryMode !== adversaryMode) {
      setAdversaryMode(initialAdversaryMode);
    }
  }, [initialAdversaryMode]);

  const handleModeChange = (mode: AdversaryMode) => {
    setAdversaryMode(mode);
    setCurrentStep(0);
    setIsPlaying(false);
    if (onAdversaryModeChange) {
      onAdversaryModeChange(mode);
    }
  };

  // Run the full duel simulation
  const duelMetrics: AdversarialDuelMetrics = useMemo(() => {
    return runAdversarialDuelSimulation(
      activeScheduler,
      adversaryMode,
      numReceivers,
      numTimesteps,
      randomSeed
    );
  }, [activeScheduler, adversaryMode, numReceivers, numTimesteps, randomSeed]);

  // Run comparison benchmark across all 5 schedulers for this adversary mode
  const comparisonData: AdversarialComparisonRow[] = useMemo(() => {
    return runAdversarialComparison(
      adversaryMode,
      numReceivers,
      numTimesteps,
      randomSeed
    );
  }, [adversaryMode, numReceivers, numTimesteps, randomSeed]);

  // Playback timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      const delay = Math.max(120, 600 / playbackSpeed);
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= numTimesteps - 1) {
            setIsPlaying(false);
            return numTimesteps - 1;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, numTimesteps]);

  // Filtered duel events up to currentStep
  const visibleEvents = useMemo(() => {
    return duelMetrics.duelEvents.filter((evt) => evt.timestep <= currentStep);
  }, [duelMetrics.duelEvents, currentStep]);

  const filteredLogs = useMemo(() => {
    return visibleEvents.filter((evt) => {
      if (logFilter === 'red') return evt.actor === 'RED';
      if (logFilter === 'blue') return evt.actor === 'BLUE';
      if (logFilter === 'evacuation') return evt.type === 'red_evasion' || evt.type === 'blue_reacquire';
      return true;
    });
  }, [visibleEvents, logFilter]);

  // Auto-scroll logs when playing
  useEffect(() => {
    if (isPlaying && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentStep, isPlaying]);

  // Step-level stats up to currentStep
  const stepStats = useMemo(() => {
    const historySlice = duelMetrics.pulseTrainHistory.slice(0, currentStep + 1);
    const transmissions = historySlice.filter((p) => p.actualPulse).length;
    const intercepts = historySlice.filter((p) => p.actualPulse && p.interceptedBy !== null).length;
    const cleanEvasions = historySlice.filter((p) => p.actualPulse && p.interceptedBy === null).length;
    const evasions = historySlice.filter((p) => p.evacuationTrigger).length;

    const interceptRate = transmissions > 0 ? Number(((intercepts / transmissions) * 100).toFixed(1)) : 0;
    const evasionRate = transmissions > 0 ? Number(((cleanEvasions / transmissions) * 100).toFixed(1)) : 0;

    // Current lock state at currentStep
    const currentPulse = historySlice[currentStep];
    const recentIntercept = historySlice.slice(Math.max(0, currentStep - 3), currentStep + 1).some((p) => p.interceptedBy !== null);
    const justEvaded = historySlice.slice(Math.max(0, currentStep - 4), currentStep + 1).some((p) => p.evacuationTrigger);

    let lockStatus: 'LOCKED' | 'TRACKING' | 'EVADED' | 'SEARCHING' = 'SEARCHING';
    if (currentPulse && currentPulse.interceptedBy !== null) {
      lockStatus = 'LOCKED';
    } else if (justEvaded) {
      lockStatus = 'EVADED';
    } else if (recentIntercept) {
      lockStatus = 'TRACKING';
    }

    return {
      transmissions,
      intercepts,
      cleanEvasions,
      evasions,
      interceptRate,
      evasionRate,
      lockStatus,
      currentPulse,
    };
  }, [duelMetrics.pulseTrainHistory, currentStep]);

  const schedulersList: { id: SchedulerType; label: string; tag: string }[] = [
    { id: 'hybrid_predictor', label: 'VAJRA Hybrid Predictor', tag: 'AI Counter-Strategy' },
    { id: 'ucb', label: 'UCB Bandit', tag: 'Exploration Bound' },
    { id: 'q_learning', label: 'Q-Learning RL', tag: 'Value Iteration' },
    { id: 'epsilon_greedy', label: 'ε-Greedy Bandit', tag: 'Camping Prone' },
    { id: 'open_loop', label: 'Round-Robin Sweep', tag: 'Blind Sequential' },
  ];

  return (
    <div id="adversarial-duel-dashboard" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur">
        <div className="absolute top-0 right-0 w-96 h-40 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-red-950/80 border border-red-800/80 text-red-400 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                RED vs BLUE TACTICAL DUEL
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700/60">
                Cognitive Electronic Warfare Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              Cognitive EW Adversarial Duel
              <span className="text-xs font-mono font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                Non-Stationary Environment
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Pits hostile evasive radar architectures (Red Team) deploying PRI stagger, waveform jitter, and anti-camping frequency hops against VAJRA’s adaptive counter-strategies (Blue Team).
            </p>
          </div>

          {/* Live Lock State Pill */}
          <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl self-start lg:self-center">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Target Lock State</div>
              <div className="text-xs font-bold font-mono">
                {stepStats.lockStatus === 'LOCKED' && <span className="text-emerald-400 flex items-center justify-end gap-1.5"><Crosshair className="w-3.5 h-3.5 animate-pulse" /> FIRM TRACK LOCK</span>}
                {stepStats.lockStatus === 'TRACKING' && <span className="text-cyan-400 flex items-center justify-end gap-1.5"><Eye className="w-3.5 h-3.5" /> WAVEFORM TRACKING</span>}
                {stepStats.lockStatus === 'EVADED' && <span className="text-red-400 flex items-center justify-end gap-1.5"><AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> ENEMY EVADED (HOP)</span>}
                {stepStats.lockStatus === 'SEARCHING' && <span className="text-amber-400 flex items-center justify-end gap-1.5"><Activity className="w-3.5 h-3.5" /> RE-ACQUIRING BAND</span>}
              </div>
            </div>
            <div className={`w-3.5 h-3.5 rounded-full animate-pulse ${
              stepStats.lockStatus === 'LOCKED' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' :
              stepStats.lockStatus === 'TRACKING' ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]' :
              stepStats.lockStatus === 'EVADED' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]' :
              'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
            }`} />
          </div>
        </div>
      </div>

      {/* 1. Adversary Intelligence Modes (Red Team) & Blue Schedulers Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Red Team Adversary Mode Selector */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Red Team: Hostile Radar Operational Mode</h3>
                <p className="text-[11px] text-zinc-400">Choose adversary evasion sophistication and waveform agility</p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950/50 border border-red-800/40 text-red-300">
              Active: {adversaryMode === 'static' ? 'Legacy' : adversaryMode === 'jitter' ? 'Jitter ±25%' : 'Cognitive LPI'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Mode 1: Static */}
            <button
              id="adversary-mode-static"
              type="button"
              onClick={() => handleModeChange('static')}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                adversaryMode === 'static'
                  ? 'bg-zinc-800 border-zinc-600 text-white ring-1 ring-zinc-500 shadow-md'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-zinc-200">1. Static / Legacy Emitter</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Baseline</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Fixed nominal PRI (interval 6) on stationary Band 5. Standard predictable pulse train.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>Evasion: 0%</span>
                <span>Jitter: None</span>
              </div>
            </button>

            {/* Mode 2: PRI Jitter */}
            <button
              id="adversary-mode-jitter"
              type="button"
              onClick={() => handleModeChange('jitter')}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                adversaryMode === 'jitter'
                  ? 'bg-amber-950/30 border-amber-600/80 text-white ring-1 ring-amber-500/50 shadow-md'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-amber-300">2. PRI Stagger & Jitter</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">±20–30%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Pseudo-random interval jitter (interval 4 to 8 steps). Breaks naive rigid modulo periodic filters.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-amber-400/80">
                <span>Tolerance Req: ±1.5t</span>
                <span>Desync: High</span>
              </div>
            </button>

            {/* Mode 3: Cognitive Evasive Radar */}
            <button
              id="adversary-mode-cognitive"
              type="button"
              onClick={() => handleModeChange('cognitive_evasion')}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                adversaryMode === 'cognitive_evasion'
                  ? 'bg-red-950/30 border-red-600/80 text-white ring-1 ring-red-500/50 shadow-md'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-red-300">3. Cognitive Evasive Radar</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60">Anti-Camping</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Monitors Blue dwell history. Executes emergency frequency hops + LPI gating upon detection.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-red-400/80">
                <span>Freq Evacuation</span>
                <span>LPI Quiet Gating</span>
              </div>
            </button>
          </div>
        </div>

        {/* Blue Team Scheduler Selector & Capabilities */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Blue Team: VAJRA Receiver</h3>
                <p className="text-[11px] text-zinc-400">Test algorithm defenses against Red tactics</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400">Active Sensor Scheduler</label>
              <select
                id="blue-scheduler-select"
                value={activeScheduler}
                onChange={(e) => {
                  setActiveScheduler(e.target.value as SchedulerType);
                  setCurrentStep(0);
                  setIsPlaying(false);
                }}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                {schedulersList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.tag})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Counter-Adaptation Features Status */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Counter-Adaptation Subsystems</span>
              <span className="text-cyan-400">{activeScheduler === 'hybrid_predictor' ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 text-[11px]">Jitter-Tolerant Interval Filter</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  activeScheduler === 'hybrid_predictor'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                    : 'bg-zinc-800/60 text-zinc-400'
                }`}>
                  {activeScheduler === 'hybrid_predictor' ? 'Adaptive (±1.5t)' : 'Rigid (0t)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 text-[11px]">Anti-Evasion Relocation Forecast</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  activeScheduler === 'hybrid_predictor'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                    : 'bg-zinc-800/60 text-zinc-400'
                }`}>
                  {activeScheduler === 'hybrid_predictor' ? 'Active Anticipation' : 'None (Lagging)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tug-of-War Scorecard */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Tactical Duel Tug-of-War Scorecard</h3>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            Timestep {currentStep} of {numTimesteps - 1} | Transmissions Logged: {stepStats.transmissions}
          </div>
        </div>

        {/* Dual Tug-of-War Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>BLUE INTERCEPT RATIO: {stepStats.interceptRate}% ({stepStats.intercepts} Caught)</span>
            </div>
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <span>RED EVASION RATIO: {stepStats.evasionRate}% ({stepStats.cleanEvasions} Slipped)</span>
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* The visual Tug-of-War Bar */}
          <div className="w-full h-4 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden flex shadow-inner relative">
            <div
              className="h-full bg-cyan-500 transition-all duration-300 ease-out flex items-center justify-start pl-2"
              style={{ width: `${Math.max(5, Math.min(95, stepStats.interceptRate))}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all duration-300 ease-out flex items-center justify-end pr-2"
              style={{ width: `${Math.max(5, Math.min(95, stepStats.evasionRate))}%` }}
            />
            {/* Center Anchor Point */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/40 pointer-events-none transform -translate-x-1/2" />
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Card 1: Blue Intercept Rate */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Intercept & Lock Rate</span>
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {stepStats.interceptRate}%
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
              {stepStats.intercepts} / {stepStats.transmissions} Pulses Caught
            </div>
          </div>

          {/* Card 2: Red Clean Pulses */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Red Evasion / Clean</span>
              <Flame className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="text-xl font-bold font-mono text-red-400 mt-1">
              {stepStats.evasionRate}%
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
              {stepStats.cleanEvasions} Pulses Undetected
            </div>
          </div>

          {/* Card 3: Hostile Frequency Evacuations */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Emergency Evacuations</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {stepStats.evasions} <span className="text-xs font-normal text-zinc-400">Hops</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
              Triggered by Blue Lock
            </div>
          </div>

          {/* Card 4: Average Re-Acquisition Time */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Avg Re-Acquisition</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {duelMetrics.avgReacquisitionTime} <span className="text-xs font-normal text-zinc-400">timesteps</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
              {activeScheduler === 'hybrid_predictor' ? 'Rapid (Anti-Evasion)' : 'Slow Sweep Search'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Playback Scrubber */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            id="duel-btn-reset"
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Reset to Step 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="duel-btn-prev"
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition-colors"
            title="Step Back"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            id="duel-btn-play"
            type="button"
            onClick={() => {
              if (currentStep >= numTimesteps - 1) {
                setCurrentStep(0);
              }
              setIsPlaying(!isPlaying);
            }}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause Duel' : 'Simulate Duel'}</span>
          </button>
          <button
            id="duel-btn-next"
            type="button"
            onClick={() => setCurrentStep((prev) => Math.min(numTimesteps - 1, prev + 1))}
            disabled={currentStep >= numTimesteps - 1}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition-colors"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Scrubber Timeline Slider */}
        <div className="flex-1 w-full sm:w-auto flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400 min-w-[36px]">t={currentStep}</span>
          <input
            id="duel-scrubber-slider"
            type="range"
            min={0}
            max={numTimesteps - 1}
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStep(Number(e.target.value));
            }}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
          />
          <span className="text-xs font-mono text-zinc-400 min-w-[36px]">t={numTimesteps - 1}</span>
        </div>

        {/* Playback Speed Multiplier */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-zinc-400 mr-1">Speed:</span>
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                playbackSpeed === speed
                  ? 'bg-zinc-700 text-white font-bold'
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* 4. Pulse Train & Waveform Jitter Inspector */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Pulse Train & Waveform Jitter Inspector</h3>
              <p className="text-[11px] text-zinc-400">Comparing expected nominal PRI vs actual staggered pulses and Blue sensor dwell interceptions</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Blue Intercept
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Red Clean Pulse
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Zap className="w-3 h-3 inline" /> Evacuation Jump
            </span>
          </div>
        </div>

        {/* Interactive Oscillogram / Pulse Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[800px] space-y-2">
            {/* Timeline Header Labels */}
            <div className="grid grid-cols-[160px_1fr] items-center text-[10px] font-mono text-zinc-400">
              <span>CHANNEL / TRACE</span>
              <div className="flex justify-between px-1">
                {Array.from({ length: Math.ceil(numTimesteps / 5) }).map((_, i) => (
                  <span key={i}>t={i * 5}</span>
                ))}
              </div>
            </div>

            {/* Trace 1: Nominal Expected PRI (Baseline) */}
            <div className="grid grid-cols-[160px_1fr] items-center bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5">
              <div className="text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span>Nominal PRI (6t)</span>
              </div>
              <div className="flex items-center gap-1 relative h-6">
                {duelMetrics.pulseTrainHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-5 rounded-sm flex items-center justify-center text-[9px] font-mono transition-all ${
                      item.nominalPulse
                        ? 'bg-zinc-700/80 text-zinc-300 border border-zinc-600 font-bold'
                        : 'bg-zinc-900/30 text-transparent'
                    } ${idx === currentStep ? 'ring-2 ring-white z-10' : ''}`}
                    title={`Nominal Step ${idx}: ${item.nominalPulse ? 'Expected Pulse' : 'Quiet'}`}
                  >
                    {item.nominalPulse ? '||' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Trace 2: Actual Transmitted Pulse Train (With Jitter & Evacuation) */}
            <div className="grid grid-cols-[160px_1fr] items-center bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5">
              <div className="text-xs font-mono text-red-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Red Waveform Agility</span>
              </div>
              <div className="flex items-center gap-1 relative h-7">
                {duelMetrics.pulseTrainHistory.map((item, idx) => {
                  const isFuture = idx > currentStep;
                  const isEvac = item.evacuationTrigger;
                  const isPulse = item.actualPulse;
                  const isIntercepted = item.interceptedBy !== null;

                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-6 rounded-sm flex flex-col items-center justify-center text-[9px] font-mono transition-all relative ${
                        isFuture
                          ? 'opacity-30 bg-zinc-900/20'
                          : isEvac
                          ? 'bg-amber-950/80 border border-amber-600 text-amber-300 font-bold animate-pulse'
                          : isPulse
                          ? isIntercepted
                            ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300 font-bold'
                            : 'bg-red-950/80 border border-red-600 text-red-300 font-bold'
                          : 'bg-zinc-900/30 text-transparent'
                      } ${idx === currentStep ? 'ring-2 ring-cyan-400 z-10' : ''}`}
                      title={`Step t=${idx} | Band: ${item.band} | ${
                        isEvac
                          ? '⚡ EMERGENCY FREQUENCY EVACUATION'
                          : isPulse
                          ? `Transmitted Pulse (Jitter: ${item.jitterOffset > 0 ? '+' : ''}${item.jitterOffset}t)`
                          : 'Quiet'
                      }`}
                    >
                      {isEvac ? (
                        <Zap className="w-3 h-3 text-amber-400" />
                      ) : isPulse ? (
                        <span>B{item.band}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trace 3: Blue Receiver Intercept Status */}
            <div className="grid grid-cols-[160px_1fr] items-center bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5">
              <div className="text-xs font-mono text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Blue Dwell Intercept</span>
              </div>
              <div className="flex items-center gap-1 relative h-6">
                {duelMetrics.pulseTrainHistory.map((item, idx) => {
                  const isFuture = idx > currentStep;
                  const isIntercepted = item.interceptedBy !== null;
                  const isClean = item.evaded;

                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-5 rounded-sm flex items-center justify-center text-[9px] font-mono transition-all ${
                        isFuture
                          ? 'opacity-30 bg-zinc-900/20'
                          : isIntercepted
                          ? 'bg-emerald-500 text-zinc-950 font-bold shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                          : isClean
                          ? 'bg-red-900/60 border border-red-800/80 text-red-400'
                          : 'bg-zinc-900/30 text-transparent'
                      } ${idx === currentStep ? 'ring-2 ring-white z-10' : ''}`}
                      title={
                        isIntercepted
                          ? `t=${idx}: Intercepted by Receiver R${item.interceptedBy} on Band ${item.band}`
                          : isClean
                          ? `t=${idx}: Missed! Red clean pulse on Band ${item.band}`
                          : `t=${idx}: Scanning`
                      }
                    >
                      {isIntercepted ? `R${item.interceptedBy}` : isClean ? 'MISS' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Jitter / Evacuation Callout Card */}
        {stepStats.currentPulse && (
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-zinc-400">Timestep t={currentStep} Operational State:</span>{' '}
                <span className="text-white font-bold">
                  {stepStats.currentPulse.actualPulse
                    ? `Red Transmitted on Band ${stepStats.currentPulse.band} (Jitter: ${
                        stepStats.currentPulse.jitterOffset > 0 ? '+' : ''
                      }${stepStats.currentPulse.jitterOffset}t)`
                    : 'Channel Silent / Waveform Dwell Window'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {stepStats.currentPulse.interceptedBy !== null ? (
                <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Blue Receiver R{stepStats.currentPulse.interceptedBy} Lock Confirmed
                </span>
              ) : stepStats.currentPulse.actualPulse ? (
                <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-700/80 text-red-300 font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> Red Clean Pulse Evaded Blue Dwell
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400">
                  Receiver Passive Monitoring
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Tactical Decision Logs & Comparative Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tactical Decision Logs Feed */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-3.5 flex flex-col h-[460px]">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Tactical Decision Logs</h3>
                <p className="text-[11px] text-zinc-400">Real-time explainability of Red maneuvers & Blue adaptations</p>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1">
              {(['all', 'red', 'blue', 'evacuation'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setLogFilter(filter)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-colors ${
                    logFilter === filter
                      ? 'bg-zinc-700 text-white font-semibold'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Stream */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono">
                No tactical events recorded up to t={currentStep}
              </div>
            ) : (
              filteredLogs.map((evt) => {
                const isRed = evt.actor === 'RED';
                const isEvac = evt.type === 'red_evasion';
                const isReacq = evt.type === 'blue_reacquire';
                const isForecast = evt.type === 'blue_predict';

                return (
                  <div
                    key={evt.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isEvac
                        ? 'bg-red-950/40 border-red-800/80 text-red-200'
                        : isReacq
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                        : isForecast
                        ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200'
                        : isRed
                        ? 'bg-zinc-950/80 border-red-900/40 text-zinc-300'
                        : 'bg-zinc-950/80 border-cyan-900/40 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            isRed ? 'bg-red-950 text-red-400 border border-red-800/60' : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                          }`}
                        >
                          {evt.actor}
                        </span>
                        <span className="font-semibold text-xs text-white">{evt.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">t={evt.timestep}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed pl-1">{evt.detail}</p>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Head-to-Head Comparative Benchmark Table */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-lg space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Multi-Algorithm Adversarial Benchmark</h3>
                  <p className="text-[11px] text-zinc-400">Head-to-head performance against active Red operational mode</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Mode: {adversaryMode.toUpperCase()}
              </span>
            </div>

            {/* Benchmark Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-[10px] font-mono text-zinc-400">
                    <th className="py-2 px-2 font-medium">SCHEDULER</th>
                    <th className="py-2 px-2 font-medium text-right">INTERCEPT %</th>
                    <th className="py-2 px-2 font-medium text-right">EVASION %</th>
                    <th className="py-2 px-2 font-medium text-right">RE-ACQUISITION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {comparisonData.map((row) => {
                    const isSelected = row.schedulerId === activeScheduler;
                    const isVajra = row.schedulerId === 'hybrid_predictor';

                    return (
                      <tr
                        key={row.schedulerId}
                        onClick={() => {
                          setActiveScheduler(row.schedulerId);
                          setCurrentStep(0);
                          setIsPlaying(false);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-950/30 text-white font-semibold'
                            : 'text-zinc-300 hover:bg-zinc-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-2 flex items-center gap-1.5 font-sans">
                          {isVajra ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                          )}
                          <span className={isVajra ? 'text-cyan-300 font-semibold' : ''}>
                            {row.name}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">
                          {row.interceptRatePct}%
                        </td>
                        <td className="py-2.5 px-2 text-right text-red-400">
                          {row.evasionRatePct}%
                        </td>
                        <td className="py-2.5 px-2 text-right text-zinc-300">
                          {row.avgReacquisitionTime}t
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Insight Callout */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs space-y-1 mt-3">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-400 text-[11px]">
              <Info className="w-3.5 h-3.5" />
              <span>Tactical Insight: Why VAJRA Prevails</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Standard bandits (ε-Greedy / UCB) suffer from the <span className="text-zinc-200 font-medium">"camping trap"</span>—wasting dwells on stale frequencies long after the enemy evades. Round-robin sweeps blindly. VAJRA’s <span className="text-cyan-300 font-medium">Jitter-Tolerant Filter</span> widens look windows to absorb ±30% PRI variations, while its <span className="text-cyan-300 font-medium">Anti-Evasion Forecast</span> predicts new channels instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
