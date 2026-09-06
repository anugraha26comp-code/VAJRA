import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EnvironmentGrid } from '../utils/ewSimulation';
import { SimulationMetrics, EmitterConfig, ReceiverObservation, SchedulerType } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Radio,
  Activity,
  Target,
  Clock,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sliders,
  Maximize2,
  Repeat,
  Info,
} from 'lucide-react';
import { ScanCycleProgressBar } from './ScanCycleProgressBar';

interface LiveFrequencyDemoProps {
  env: EnvironmentGrid;
  metrics: SimulationMetrics;
  emitters: EmitterConfig[];
  activeScheduler: SchedulerType;
  onSelectScheduler?: (scheduler: SchedulerType) => void;
  numReceivers: number;
  selectedTimestep?: number | null;
  onStepChange?: (step: number) => void;
}

export const LiveFrequencyDemo: React.FC<LiveFrequencyDemoProps> = ({
  env,
  metrics,
  emitters,
  activeScheduler,
  onSelectScheduler,
  numReceivers,
  selectedTimestep,
  onStepChange,
}) => {
  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 0.5x, 1x, 2x, 3x

  // Respond to external timestep selection (e.g. from Threat Alert sidebar jump)
  useEffect(() => {
    if (selectedTimestep !== undefined && selectedTimestep !== null) {
      setCurrentStep(selectedTimestep);
      setIsPlaying(false);
    }
  }, [selectedTimestep]);

  // Notify parent of current step changes if callback provided
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [rollingWindowSize, setRollingWindowSize] = useState<number>(10);
  const [selectedScenario, setSelectedScenario] = useState<string>('all');
  const [showPresenterNotes, setShowPresenterNotes] = useState<boolean>(true);
  const [hoveredCell, setHoveredCell] = useState<{ band: number; t: number } | null>(null);

  const numBands = env.numBands;
  const totalSteps = env.numTimesteps;

  // Auto-play timer loop
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      // Base interval: 260ms divided by multiplier
      const intervalMs = Math.max(60, Math.round(260 / speedMultiplier));
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps - 1) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, speedMultiplier, isLooping, totalSteps]);

  // Observations lookup map
  const scanLookup = useMemo(() => {
    const map = new Map<string, ReceiverObservation>();
    for (const rec of metrics.history) {
      map.set(`${rec.band},${rec.timestep}`, rec);
    }
    return map;
  }, [metrics.history]);

  // Active receiver observations at currentStep
  const currentStepScans = useMemo(() => {
    return metrics.history.filter((h) => h.timestep === currentStep);
  }, [metrics.history, currentStep]);

  // Running hit count & looks up to currentStep
  const runningStats = useMemo(() => {
    let looks = 0;
    let hits = 0;
    let highThreatHits = 0;
    let decoyHits = 0;

    for (const rec of metrics.history) {
      if (rec.timestep <= currentStep) {
        looks++;
        if (rec.hit === 1) {
          hits++;
          if (rec.threatLevel === 'HIGH') highThreatHits++;
          if (rec.threatLevel === 'LOW' && rec.emitterType === 'Decoy') decoyHits++;
        }
      }
    }

    const interceptRate = looks > 0 ? (hits / looks) * 100 : 0;
    return { looks, hits, highThreatHits, decoyHits, interceptRate };
  }, [metrics.history, currentStep]);

  // Rolling Activity per band in [max(0, currentStep - rollingWindowSize + 1), currentStep]
  const recentActivity = useMemo(() => {
    const startT = Math.max(0, currentStep - rollingWindowSize + 1);
    const windowLength = currentStep - startT + 1;

    const activityCounts = Array(numBands).fill(0);
    const activityPcts = Array(numBands).fill(0);
    const isCurrentlyActive = Array(numBands).fill(false);

    for (let b = 0; b < numBands; b++) {
      let count = 0;
      for (let t = startT; t <= currentStep; t++) {
        if (env.groundTruth[b][t] === 1) {
          count++;
        }
      }
      activityCounts[b] = count;
      activityPcts[b] = windowLength > 0 ? Math.round((count / windowLength) * 100) : 0;
      isCurrentlyActive[b] = env.groundTruth[b][currentStep] === 1;
    }

    return { activityCounts, activityPcts, isCurrentlyActive, windowLength };
  }, [env.groundTruth, numBands, currentStep, rollingWindowSize]);

  // Find most active band recently
  const mostActiveBand = useMemo(() => {
    let bestBand = 0;
    let maxPct = -1;
    for (let b = 0; b < numBands; b++) {
      if (recentActivity.activityPcts[b] > maxPct) {
        maxPct = recentActivity.activityPcts[b];
        bestBand = b;
      }
    }
    const emitter = emitters.find((e) => e.bands.includes(bestBand));
    return {
      band: bestBand,
      pct: maxPct,
      emitterName: emitter ? emitter.name : `Band ${bestBand}`,
      threatLevel: emitter ? emitter.threatLevel : 'LOW',
    };
  }, [recentActivity, numBands, emitters]);

  // Periodic Pattern Detector & Confidence Calculator
  const periodicAnalysis = useMemo(() => {
    const results: { band: number; estimatedPeriod: number | null; confidence: number; name: string }[] = [];

    for (let b = 0; b < numBands; b++) {
      // Collect all hit timestamps for band up to currentStep
      const hits: number[] = [];
      for (let t = 0; t <= currentStep; t++) {
        if (env.groundTruth[b][t] === 1) hits.push(t);
      }

      const emitter = emitters.find((e) => e.bands.includes(b));
      const name = emitter ? emitter.name : `Band ${b}`;

      if (hits.length < 3) {
        results.push({ band: b, estimatedPeriod: null, confidence: 0, name });
        continue;
      }

      // Calculate intervals
      const intervals: number[] = [];
      for (let i = 1; i < hits.length; i++) {
        intervals.push(hits[i] - hits[i - 1]);
      }

      // Frequency of interval deltas
      const counts: Record<number, number> = {};
      for (const dt of intervals) {
        counts[dt] = (counts[dt] || 0) + 1;
      }

      let bestDt = 0;
      let maxCount = 0;
      for (const [dtStr, count] of Object.entries(counts)) {
        const dt = Number(dtStr);
        if (count > maxCount) {
          maxCount = count;
          bestDt = dt;
        }
      }

      // Confidence is ratio of mode matches over total intervals
      const confidence = intervals.length > 0 ? Math.round((maxCount / intervals.length) * 100) : 0;
      results.push({
        band: b,
        estimatedPeriod: bestDt > 1 ? bestDt : null,
        confidence: bestDt > 1 ? confidence : 0,
        name,
      });
    }

    // Sort by confidence descending
    const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
    const top = sorted[0];
    return {
      topPredictable: top && top.confidence >= 40 ? top : null,
      allBands: results,
    };
  }, [env.groundTruth, numBands, currentStep, emitters]);

  // Rolling Heatmap matrix [band][t] where value = rolling density in [t - windowSize + 1, t]
  const rollingHeatmapData = useMemo(() => {
    const matrix: number[][] = Array.from({ length: numBands }, () => Array(totalSteps).fill(0));

    for (let b = 0; b < numBands; b++) {
      for (let t = 0; t < totalSteps; t++) {
        const start = Math.max(0, t - rollingWindowSize + 1);
        const span = t - start + 1;
        let count = 0;
        for (let i = start; i <= t; i++) {
          if (env.groundTruth[b][i] === 1) count++;
        }
        matrix[b][t] = count / span; // 0.0 to 1.0
      }
    }
    return matrix;
  }, [env.groundTruth, numBands, totalSteps, rollingWindowSize]);

  // Handlers
  const handleTogglePlay = () => setIsPlaying((prev) => !prev);
  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };
  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };
  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
  };

  const getEmitterForBand = (band: number): EmitterConfig | undefined => {
    return emitters.find((e) => e.bands.includes(band));
  };

  return (
    <div className="space-y-6 select-none">
      {/* 1. Presentation Control Bar (Auto-Play Demo Mode) */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
                  <span>Live Frequency Analysis Demo</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                    Presentation Mode
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time spectrum activity monitor, high-visibility receiver tracking HUD, and rolling density heatmap.
                </p>
              </div>
            </div>
          </div>

          {/* Core Transport Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-950/90 p-1.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={handleStepBack}
              className="p-2 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors"
              title="Step Backward (1 Step)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isPlaying
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm shadow-emerald-500/20'
                  : 'bg-white hover:bg-zinc-200 text-zinc-950'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={handleStepForward}
              className="p-2 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors"
              title="Step Forward (1 Step)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
              title="Reset to Step 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            {/* Speed Control */}
            <div className="flex items-center gap-1">
              {[0.5, 1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeedMultiplier(spd)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    speedMultiplier === spd
                      ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-mono transition-colors ${
                isLooping
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={isLooping ? 'Auto-loop enabled' : 'Loop disabled (stops at end)'}
            >
              <Repeat className="w-3 h-3" />
              <span className="hidden sm:inline">Loop</span>
            </button>
          </div>
        </div>

        {/* Timeline Slider with Live Scrubbing */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Timestep Progress:</span>
              <span className="text-white font-bold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                t = {currentStep} / {totalSteps - 1}
              </span>
            </span>
            <div className="flex items-center gap-3 text-zinc-400">
              <span className="text-[11px]">
                Rolling Window:{' '}
                <select
                  value={rollingWindowSize}
                  onChange={(e) => setRollingWindowSize(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:outline-none"
                >
                  <option value={5}>5 Steps</option>
                  <option value={10}>10 Steps</option>
                  <option value={15}>15 Steps</option>
                  <option value={20}>20 Steps</option>
                </select>
              </span>
            </div>
          </div>

          <div className="relative flex items-center w-full">
            <input
              type="range"
              min={0}
              max={totalSteps - 1}
              value={currentStep}
              onChange={(e) => {
                setCurrentStep(Number(e.target.value));
              }}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Scan Cycle Timing & Progress Bar Animation */}
      <ScanCycleProgressBar
        currentStep={currentStep}
        totalSteps={totalSteps}
        activeScheduler={activeScheduler}
        numReceivers={numReceivers}
        numBands={numBands}
        speedMultiplier={speedMultiplier}
        isPlaying={isPlaying}
        history={metrics.history}
      />

      {/* 2. Live Scan Status Panel (Large, Audience-Ready HUD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Time Step */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Timeline Step</span>
            <Clock className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-zinc-100">
              t = {currentStep}
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-150"
                style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {Math.round((currentStep / (totalSteps - 1)) * 100)}% through scenario
          </span>
        </div>

        {/* Card 2: Current Receiver Checks */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Active Receiver Look(s) at t = {currentStep}</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              {currentStepScans.length} of {numReceivers} Sensors Active
            </span>
          </div>

          <div className="my-2 space-y-1.5">
            {currentStepScans.length > 0 ? (
              currentStepScans.map((scan) => {
                const isHit = scan.hit === 1;
                const emitter = scan.emitterId ? emitters.find((e) => e.id === scan.emitterId) : undefined;
                return (
                  <div
                    key={scan.receiverId}
                    className="flex items-center justify-between bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800/80 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-[10px]">
                        R{scan.receiverId}
                      </span>
                      <span className="text-zinc-200 font-semibold">
                        Band {scan.band}
                      </span>
                      <span className="text-zinc-500 text-[11px] hidden sm:inline">
                        ({emitter ? emitter.name.split(' ')[0] : 'Idle'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isHit ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>INTERCEPT</span>
                          {scan.threatLevel && (
                            <span
                              className={`ml-1 text-[9px] px-1 rounded ${
                                scan.threatLevel === 'HIGH'
                                  ? 'bg-rose-900/80 text-rose-300'
                                  : scan.threatLevel === 'MEDIUM'
                                  ? 'bg-amber-900/80 text-amber-300'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {scan.threatLevel}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-500 border border-zinc-800 text-[11px]">
                          NO EMISSION
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-zinc-500 italic py-2">Receivers re-tuning...</div>
            )}
          </div>

          <span className="text-[11px] text-zinc-500 font-mono">
            Scheduler: <span className="text-zinc-300">{metrics.schedulerName}</span>
          </span>
        </div>

        {/* Card 3: Intercept Rate & Hits */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Running Interception</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {(runningStats?.interceptRate ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs font-mono text-zinc-300 mt-1">
              {runningStats?.hits ?? 0} hits / {runningStats?.looks ?? 0} looks
            </div>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            High-Threat: <span className="text-rose-400 font-bold">{runningStats?.highThreatHits ?? 0}</span>
          </span>
        </div>

        {/* Card 4: Most Active & Most Predictable Bands */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Spectral Intelligence</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>

          <div className="my-1.5 space-y-1 text-xs">
            <div>
              <span className="text-zinc-500 text-[10px] uppercase font-mono block">Highest Recent Density</span>
              <div className="font-mono text-zinc-200 font-bold flex items-center justify-between mt-0.5">
                <span>Band {mostActiveBand.band}</span>
                <span className="text-amber-400 font-semibold">{mostActiveBand.pct}%</span>
              </div>
            </div>

            <div className="pt-1 border-t border-zinc-800/60">
              <span className="text-zinc-500 text-[10px] uppercase font-mono block">Predictable Emitter</span>
              <div className="font-mono text-zinc-200 font-bold flex items-center justify-between mt-0.5">
                {periodicAnalysis.topPredictable ? (
                  <>
                    <span className="text-emerald-400">Band {periodicAnalysis.topPredictable.band}</span>
                    <span className="text-zinc-400 text-[11px]">PRI: {periodicAnalysis.topPredictable.estimatedPeriod}t</span>
                  </>
                ) : (
                  <span className="text-zinc-500 italic text-[11px]">Analyzing PRI...</span>
                )}
              </div>
            </div>
          </div>

          <span className="text-[11px] text-zinc-500 font-mono">
            Window: Last {rollingWindowSize} steps
          </span>
        </div>
      </div>

      {/* 3. Real-Time Frequency Activity View (Equalizer / Spectrum Analyzer) */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                Real-Time Spectrum Analyzer & Activity Level
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                Rolling {rollingWindowSize}-Step Window
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Bar height reflects relative transmission density in the recent window. Live indicators show instantaneous RF emissions and active receiver dwell locations.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /> Live Pulse
            </span>
            <span className="text-zinc-600">&bull;</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-zinc-800 border border-zinc-600 text-[9px] font-bold text-white flex items-center justify-center">R</span> Dwell Receiver
            </span>
          </div>
        </div>

        {/* Spectrum Equalizer Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
          {Array.from({ length: numBands }, (_, band) => {
            const emitter = getEmitterForBand(band);
            const activityPct = recentActivity.activityPcts[band];
            const isFiringNow = recentActivity.isCurrentlyActive[band];
            const dwellingReceivers = currentStepScans.filter((s) => s.band === band);
            const isDwelling = dwellingReceivers.length > 0;
            const hasHit = dwellingReceivers.some((s) => s.hit === 1);

            // Bar color logic based on threat / activity
            const isDecoy = emitter?.isDecoy;
            const isHighThreat = emitter?.threatLevel === 'HIGH';

            return (
              <div
                key={band}
                className={`relative bg-zinc-950/80 border rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-150 ${
                  isDwelling
                    ? hasHit
                      ? 'border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'border-zinc-500 shadow-sm'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Top Badge: Dwell indicator */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    Band {band}
                  </span>

                  {isDwelling ? (
                    <div className="flex items-center gap-1">
                      {dwellingReceivers.map((r) => (
                        <span
                          key={r.receiverId}
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold text-white shadow-xs ${
                            r.hit === 1
                              ? 'bg-emerald-600 border border-emerald-400 animate-bounce'
                              : 'bg-zinc-700 border border-zinc-500'
                          }`}
                          title={`Receiver ${r.receiverId} dwelling on Band ${band} (Hit: ${r.hit})`}
                        >
                          R{r.receiverId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-zinc-800" />
                  )}
                </div>

                {/* Equalizer Bar Container */}
                <div className="relative h-44 bg-zinc-900/80 rounded-xl overflow-hidden flex flex-col justify-end p-1 border border-zinc-800">
                  {/* Background grid markings */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 p-2">
                    <div className="border-b border-zinc-700 w-full" />
                    <div className="border-b border-zinc-700 w-full" />
                    <div className="border-b border-zinc-700 w-full" />
                    <div className="border-b border-zinc-700 w-full" />
                  </div>

                  {/* The Dynamic Activity Fill */}
                  <div
                    className={`w-full rounded-lg transition-all duration-200 ${
                      isHighThreat
                        ? 'bg-gradient-to-t from-rose-950 via-rose-600 to-rose-400'
                        : isDecoy
                        ? 'bg-gradient-to-t from-amber-950 via-amber-600 to-amber-400'
                        : 'bg-gradient-to-t from-emerald-950 via-emerald-600 to-emerald-400'
                    }`}
                    style={{
                      height: `${Math.max(6, activityPct)}%`,
                    }}
                  />

                  {/* Instantaneous Firing Flash Indicator */}
                  {isFiringNow && (
                    <div className="absolute top-2 left-2 right-2 bg-white/90 text-zinc-950 text-[10px] font-bold font-mono text-center py-0.5 rounded shadow-sm animate-pulse">
                      TX ACTIVE
                    </div>
                  )}

                  {/* Decoy Warning */}
                  {isDecoy && (
                    <div className="absolute bottom-2 left-2 right-2 bg-amber-950/80 text-amber-300 text-[9px] font-mono text-center py-0.5 rounded border border-amber-800/80">
                      DECOY TRAP
                    </div>
                  )}
                </div>

                {/* Bar Footer Stats */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Activity:</span>
                    <span
                      className={`font-bold ${
                        activityPct > 50
                          ? 'text-white'
                          : activityPct > 20
                          ? 'text-zinc-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      {activityPct}%
                    </span>
                  </div>

                  <div className="truncate text-[11px] text-zinc-400 font-medium">
                    {emitter ? emitter.name.split(' ')[0] : 'Open Band'}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        isHighThreat
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/80'
                          : isDecoy
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      {emitter?.threatLevel || 'LOW'}
                    </span>

                    {isFiringNow && (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ON
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Frequency Heatmap Over Time (Rolling Window Intensity) */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                Rolling Density Spectrogram (Bands vs Time)
              </h3>
              <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
                Temporal Regularity Visualizer
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Shading indicates rolling activity intensity. Periodic pulses (Band 3) form clean vertical stripes; rotating sweeps (Band 5) form distinct dwell bars. White dots indicate receiver intercepts.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-zinc-900 border border-zinc-800" /> 0%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-950 border border-emerald-800" /> 50%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500" /> 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-white ring-2 ring-emerald-400" /> Intercept
            </span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px] space-y-1.5">
            {Array.from({ length: numBands }, (_, band) => {
              const emitter = getEmitterForBand(band);
              return (
                <div key={band} className="flex items-center gap-2 text-xs">
                  {/* Band Row Header */}
                  <div className="w-36 shrink-0 flex items-center justify-between px-2.5 py-1 bg-zinc-950/80 rounded-lg border border-zinc-800 font-mono text-[11px]">
                    <span className="font-bold text-zinc-200">Band {band}</span>
                    <span
                      className={`text-[9px] px-1.5 rounded ${
                        emitter?.threatLevel === 'HIGH'
                          ? 'bg-rose-950 text-rose-300'
                          : emitter?.threatLevel === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {emitter ? emitter.name.split(' ')[0] : 'Idle'}
                    </span>
                  </div>

                  {/* Cells for each timestep */}
                  <div className="flex-1 flex gap-[2px] relative py-0.5">
                    {Array.from({ length: totalSteps }, (_, t) => {
                      const intensity = rollingHeatmapData[band][t];
                      const isGroundTruthActive = env.groundTruth[band][t] === 1;
                      const scan = scanLookup.get(`${band},${t}`);
                      const isCurrentScrub = t === currentStep;
                      const isFuture = t > currentStep;

                      // Cell background calculation
                      let bgColor = '#18181b'; // default dark
                      if (intensity > 0.75) {
                        bgColor = '#10b981'; // emerald-500
                      } else if (intensity > 0.45) {
                        bgColor = '#047857'; // emerald-700
                      } else if (intensity > 0.2) {
                        bgColor = '#064e3b'; // emerald-900
                      } else if (intensity > 0.05) {
                        bgColor = '#022c22'; // emerald-950
                      }

                      return (
                        <div
                          key={t}
                          onMouseEnter={() => setHoveredCell({ band, t })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            setCurrentStep(t);
                            setIsPlaying(false);
                          }}
                          className={`flex-1 h-7 rounded-[2px] transition-all cursor-pointer relative flex items-center justify-center ${
                            isFuture ? 'opacity-35' : 'opacity-100'
                          } ${isCurrentScrub ? 'ring-2 ring-white z-10 scale-y-110' : ''}`}
                          style={{ backgroundColor: bgColor }}
                          title={`Band ${band}, t=${t} | Density: ${Math.round(intensity * 100)}% | TX: ${
                            isGroundTruthActive ? 'ACTIVE' : 'OFF'
                          } ${scan ? `| R${scan.receiverId} ${scan.hit ? 'HIT' : 'MISS'}` : ''}`}
                        >
                          {/* Intercept crosshair indicator */}
                          {scan && scan.hit === 1 && (
                            <div className="w-2 h-2 rounded-full bg-white shadow-sm ring-1 ring-emerald-400 animate-pulse" />
                          )}

                          {/* Missed dwell mark */}
                          {scan && scan.hit === 0 && (
                            <div className="w-1 h-1 rounded-full bg-zinc-500" />
                          )}
                        </div>
                      );
                    })}

                    {/* Timeline Scrubber Line Indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-20"
                      style={{
                        left: `${(currentStep / (totalSteps - 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time axis ticks */}
          <div className="min-w-[760px] flex items-center text-[10px] font-mono text-zinc-500 mt-2 pl-38">
            <span className="w-1/4">t = 0</span>
            <span className="w-1/4 text-center">t = {Math.round(totalSteps * 0.25)}</span>
            <span className="w-1/4 text-center">t = {Math.round(totalSteps * 0.5)}</span>
            <span className="w-1/4 text-center">t = {Math.round(totalSteps * 0.75)}</span>
            <span className="text-right">t = {totalSteps - 1}</span>
          </div>
        </div>

        {/* Hover inspector tooltip */}
        {hoveredCell && (
          <div className="bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">Inspect: Band {hoveredCell.band} at t = {hoveredCell.t}</span>
              <span className="text-zinc-500">&bull;</span>
              <span>Rolling Density: <strong className="text-emerald-400">{Math.round(rollingHeatmapData[hoveredCell.band][hoveredCell.t] * 100)}%</strong></span>
              <span className="text-zinc-500">&bull;</span>
              <span>
                Emitter Status:{' '}
                {env.groundTruth[hoveredCell.band][hoveredCell.t] === 1 ? (
                  <strong className="text-emerald-400">ACTIVE TRANSMISSION</strong>
                ) : (
                  <span className="text-zinc-500">OFF</span>
                )}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Click cell to jump playback scrubber
            </div>
          </div>
        )}
      </div>

      {/* 5. Audience / Judge Presentation Cheatsheet Drawer */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
              <Info className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200 tracking-tight">
              Presentation Talking Points for Judges & Evaluators
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowPresenterNotes(!showPresenterNotes)}
            className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            {showPresenterNotes ? 'Collapse Notes' : 'Expand Notes'}
          </button>
        </div>

        {showPresenterNotes && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 space-y-1.5">
              <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 1. The Intercept Bottleneck
              </span>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Conventional receivers scan sequentially (open-loop round-robin). In an 8-band RF spectrum with 1 sensor, they miss &gt;75% of agile radar pulses because they dwell blindly on silent bands.
              </p>
            </div>

            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 space-y-1.5">
              <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 2. Real-Time Spectral Tracking
              </span>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                The equalizer view above monitors rolling transmission density in real time. This converts chaotic RF bursts into quantifiable activity metrics, feeding bandit and reinforcement learning agents.
              </p>
            </div>

            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 space-y-1.5">
              <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 3. Deterministic PRI Sync
              </span>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Notice Band 3 (P-RAD-03): the scheduler extracts its Pulse Repetition Interval (T = 6 steps) from historical arrival timestamps and tunes exactly when the pulse arrives.
              </p>
            </div>

            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 space-y-1.5">
              <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 4. Decoy ECCM Rejection
              </span>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Adversaries spam Band 0 with high-frequency decoy beacons. The Threat-Aware ML scheduler recognizes the low-threat trap and redirects receiver dwell looks to hostile radar on Band 5.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
