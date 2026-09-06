import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EnvironmentGrid, getBandThreatLevel } from '../utils/ewSimulation';
import { SimulationMetrics, EmitterConfig, ReceiverObservation, SmartCatchRecord } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  ShieldAlert,
  Target,
  Clock,
  Info,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ExplainabilityPanel } from './ExplainabilityPanel';
import { ThreatAlertBanner } from './ThreatAlertBanner';
import { detectSmartCatch, playSmartCatchChime } from '../utils/smartCatch';
import { SmartCatchSpotlightOverlay } from './SmartCatchSpotlightOverlay';

interface HeatmapViewerProps {
  env: EnvironmentGrid;
  metrics: SimulationMetrics;
  emitters: EmitterConfig[];
  onViewBenchmarks?: () => void;
  selectedTimestep?: number | null;
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({
  env,
  metrics,
  emitters,
  onViewBenchmarks,
  selectedTimestep,
}) => {
  const [activePlayback, setActivePlayback] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(env.numTimesteps - 1);
  const [hoverCell, setHoverCell] = useState<{ band: number; t: number } | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Sync external timestep selection
  useEffect(() => {
    if (selectedTimestep !== undefined && selectedTimestep !== null) {
      setCurrentStep(selectedTimestep);
      setActivePlayback(false);
    }
  }, [selectedTimestep]);

  // Smart Catch Spotlight state
  const [spotlightEnabled, setSpotlightEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeCatch, setActiveCatch] = useState<SmartCatchRecord | null>(null);
  const [smartCatchLog, setSmartCatchLog] = useState<SmartCatchRecord[]>([]);
  const [showCatchLogModal, setShowCatchLogModal] = useState<boolean>(false);
  const spotlightTimeoutRef = useRef<any>(null);
  const lastHighlightedStepRef = useRef<number>(-1);

  useEffect(() => {
    setCurrentStep(env.numTimesteps - 1);
    setActivePlayback(false);
    setActiveCatch(null);
  }, [metrics.schedulerId, metrics.numReceivers, env.numTimesteps]);

  useEffect(() => {
    if (!activePlayback) {
      if (spotlightTimeoutRef.current) clearTimeout(spotlightTimeoutRef.current);
      setActiveCatch(null);
      return;
    }

    let isMounted = true;
    let timer: any = null;

    const stepForward = () => {
      setCurrentStep((prev) => {
        if (prev >= env.numTimesteps - 1) {
          setActivePlayback(false);
          setActiveCatch(null);
          return prev;
        }
        const next = prev + 1;

        // Check if any scan at next step is a notable smart catch
        if (spotlightEnabled && lastHighlightedStepRef.current !== next) {
          const nextScans = metrics.history.filter((h) => h.timestep === next && h.hit === 1);
          let foundCatch: SmartCatchRecord | null = null;
          for (const s of nextScans) {
            const detected = detectSmartCatch(s, metrics.schedulerId);
            if (detected) {
              foundCatch = detected;
              break;
            }
          }

          if (foundCatch) {
            lastHighlightedStepRef.current = next;
            setActiveCatch(foundCatch);
            setSmartCatchLog((oldLog) => {
              if (oldLog.some((c) => c.timestep === foundCatch!.timestep && c.band === foundCatch!.band)) {
                return oldLog;
              }
              return [...oldLog, foundCatch!];
            });

            if (soundEnabled) {
              playSmartCatchChime(false);
            }

            // Pause playback for 1.5 seconds for the spotlight highlight moment
            spotlightTimeoutRef.current = setTimeout(() => {
              if (!isMounted) return;
              setActiveCatch(null);
              timer = setTimeout(stepForward, 180);
            }, 1500);

            return next;
          }
        }

        // Standard playback step
        timer = setTimeout(stepForward, 180);
        return next;
      });
    };

    timer = setTimeout(stepForward, 180);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (spotlightTimeoutRef.current) clearTimeout(spotlightTimeoutRef.current);
    };
  }, [activePlayback, env.numTimesteps, metrics.history, metrics.schedulerId, spotlightEnabled, soundEnabled]);

  const handleRestart = () => {
    setCurrentStep(0);
    lastHighlightedStepRef.current = -1;
    setActiveCatch(null);
    setActivePlayback(true);
  };

  // Pre-index observations up to currentStep
  const scanLookup = useMemo(() => {
    const map = new Map<string, ReceiverObservation>();
    for (let i = 0; i < metrics.history.length; i++) {
      const rec = metrics.history[i];
      if (rec.timestep <= currentStep) {
        map.set(`${rec.band},${rec.timestep}`, rec);
      }
    }
    return map;
  }, [metrics.history, currentStep]);

  // Running High-Threat Intercepts counter up to currentStep
  const runningHighThreatHits = useMemo(() => {
    let count = 0;
    for (const rec of metrics.history) {
      if (rec.timestep <= currentStep && rec.hit === 1 && rec.threatLevel === 'HIGH') {
        count++;
      }
    }
    return count;
  }, [metrics.history, currentStep]);

  // Active receiver scans at current step
  const currentScans: ReceiverObservation[] = metrics.history.filter(
    (h) => h.timestep === currentStep
  );

  return (
    <div className="space-y-6">
      {/* Top Threat Alert Strip (Non-intrusive, tactical) */}
      <ThreatAlertBanner
        currentScans={currentScans}
        currentStep={currentStep}
        allHistory={metrics.history}
      />

      {/* Main Spectrogram Card */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Card Header & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                Live RF Spectrogram
              </h3>
              <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
                {metrics.numReceivers} {metrics.numReceivers === 1 ? 'Receiver' : 'Coordinated Receivers'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Active Strategy:{' '}
              <span className="text-zinc-200 font-medium">{metrics.schedulerName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Smart Catch Spotlight Toggle & Sound */}
            <div className="flex items-center gap-1.5 bg-zinc-950/80 px-2 py-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setSpotlightEnabled(!spotlightEnabled)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  spotlightEnabled
                    ? 'bg-amber-400/20 border border-amber-400/50 text-amber-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Toggle Smart Catch Spotlight (1.5s visual pause with explanation when the AI makes an intelligent interception)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Spotlight: {spotlightEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg transition-colors ${
                  soundEnabled
                    ? 'text-amber-300 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
                title={soundEnabled ? 'Smart catch chime enabled' : 'Chime muted'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Smart Catches Running Counter / Log Button */}
            <button
              type="button"
              onClick={() => setShowCatchLogModal(true)}
              className="flex items-center gap-1.5 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/70 px-3 py-1.5 rounded-xl text-xs font-mono text-amber-300 transition-colors shadow-xs"
              title="Click to view all smart AI catches recorded during this session"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
              <span className="font-bold">{smartCatchLog.length}</span>
              <span className="text-amber-200/80">Smart {smartCatchLog.length === 1 ? 'Catch' : 'Catches'}</span>
            </button>

            {/* Feature 1: Running Counter for High-Threat Intercepts */}
            <div
              className="flex items-center gap-2 bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-xl text-xs font-mono shadow-xs"
              title="Running count of intercepted high-priority hostile radars up to current time step"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-zinc-300 font-medium">High-threat intercepts:</span>
              <span className="text-rose-400 font-bold text-sm">{runningHighThreatHits}</span>
              <span className="text-zinc-500 text-[10px]">/ {metrics.highThreatHits}</span>
            </div>

            {/* Grouped Playback & Scrubbing Controls */}
            <div className="flex items-center gap-2.5 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActivePlayback(!activePlayback)}
                className="px-2.5 py-1 hover:bg-zinc-800 rounded-lg text-zinc-200 transition-colors flex items-center gap-1.5 text-xs font-medium"
                title={activePlayback ? 'Pause simulation' : 'Play timeline replay'}
              >
                {activePlayback ? (
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{activePlayback ? 'Pause' : 'Replay'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Reset to start (t=0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">
                  t = <span className="text-zinc-100 font-bold">{currentStep}</span> / {env.numTimesteps - 1}
                </span>
                <input
                  type="range"
                  min={0}
                  max={env.numTimesteps - 1}
                  value={currentStep}
                  onChange={(e) => {
                    setActivePlayback(false);
                    setCurrentStep(Number(e.target.value));
                  }}
                  className="w-24 sm:w-32 accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded"
                />
              </div>

              <div className="h-4 w-[1px] bg-zinc-800 mx-0.5 hidden sm:block" />

              {/* Collapsible Legend Toggle */}
              <button
                type="button"
                onClick={() => setShowLegend(!showLegend)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <span>Legend</span>
                {showLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Legend Drawer */}
        {showLegend && (
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 text-xs space-y-2.5 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Emitter markers */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-400 font-medium text-[11px]">Emitters & Threat Levels:</span>
                {emitters.map((em) => (
                  <div
                    key={em.id}
                    className="flex items-center gap-1.5 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-[11px]"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: em.color }} />
                    <span className="font-mono text-zinc-200">{em.id}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1 rounded ${
                        em.threatLevel === 'HIGH'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : em.threatLevel === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {em.threatLevel}
                    </span>
                  </div>
                ))}
              </div>

              {/* Receiver indicators */}
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-zinc-400 font-medium">Receivers:</span>
                <span className="flex items-center gap-1 font-mono bg-zinc-900 border border-zinc-700/80 px-2 py-0.5 rounded text-zinc-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> R1
                </span>
                {metrics.numReceivers >= 2 && (
                  <span className="flex items-center gap-1 font-mono bg-zinc-900 border border-zinc-700/80 px-2 py-0.5 rounded text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-sky-400" /> R2
                  </span>
                )}
                {metrics.numReceivers >= 3 && (
                  <span className="flex items-center gap-1 font-mono bg-zinc-900 border border-zinc-700/80 px-2 py-0.5 rounded text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-purple-400" /> R3
                  </span>
                )}
              </div>
            </div>

            {/* Beginner Explanation of Threat Levels */}
            <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>
                <strong className="text-zinc-200">Threat Priority Scoring:</strong> High-threat targets (Red: Agile & Hostile Radars) get higher tactical weight in the AI decision math, so the receiver prefers them even if their raw burst chance is slightly lower than benign chatter.
              </span>
            </div>
          </div>
        )}

        {/* Smart Catch Spotlight Notification & Log Drawer */}
        <SmartCatchSpotlightOverlay
          activeCatch={activeCatch}
          smartCatchLog={smartCatchLog}
          isSpotlightEnabled={spotlightEnabled}
          onToggleSpotlight={() => setSpotlightEnabled(!spotlightEnabled)}
          isSoundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onSelectCatchStep={(step) => {
            setActivePlayback(false);
            setCurrentStep(step);
          }}
          showLogModal={showCatchLogModal}
          onCloseLogModal={() => setShowCatchLogModal(false)}
          onOpenLogModal={() => setShowCatchLogModal(true)}
        />

        {/* 2D Spectrogram Grid with clean spacing */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[760px]">
            {/* Timeline Axis Top */}
            <div className="flex items-center text-[10px] font-mono text-zinc-500 mb-1.5 ml-34">
              {Array.from({ length: env.numTimesteps }).map((_, t) => (
                <div
                  key={t}
                  className={`flex-1 text-center transition-colors ${
                    t === currentStep
                      ? 'text-white font-bold'
                      : t % 5 === 0
                      ? 'text-zinc-400'
                      : 'text-zinc-700'
                  }`}
                >
                  {t % 5 === 0 ? t : '·'}
                </div>
              ))}
            </div>

            {/* Rows for Frequency Bands */}
            <div className="space-y-1.5">
              {Array.from({ length: env.numBands }).map((_, band) => {
                const isTargetedNow = currentScans.some((s) => s.band === band);
                const bandThreat = getBandThreatLevel(band, emitters);
                const bandEmitter = emitters.find((e) => e.bands.includes(band));

                return (
                  <div key={band} className="flex items-center gap-2">
                    {/* Band label with Colored Threat Badge */}
                    <div
                      className={`w-32 flex items-center justify-between font-mono text-xs px-2.5 py-1.5 rounded-lg transition-colors shrink-0 border ${
                        isTargetedNow
                          ? 'bg-zinc-800 text-white font-semibold border-zinc-600 shadow-xs'
                          : 'text-zinc-300 bg-zinc-950/60 border-zinc-800/80'
                      }`}
                      title={`Band ${band}: Threat Level = ${bandThreat} (${bandEmitter ? bandEmitter.name : 'Open/Idle'}). The ML scheduler prioritizes High-threat signals.`}
                    >
                      <span className="font-bold">Band {band}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                          bandThreat === 'HIGH'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/80'
                            : bandThreat === 'MEDIUM'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/80'
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}
                      >
                        {bandThreat === 'HIGH' ? 'HIGH' : bandThreat === 'MEDIUM' ? 'MED' : 'LOW'}
                      </span>
                    </div>

                    {/* Timeline cells with clean proportions */}
                    <div className="flex-1 flex gap-[2px] h-8 bg-zinc-950/80 p-[2px] rounded-lg border border-zinc-800/80">
                      {Array.from({ length: env.numTimesteps }).map((_, t) => {
                        const isTransmitting = env.groundTruth[band][t] === 1;
                        const emitter = env.emitterMap[band][t];
                        const scanRecord = scanLookup.get(`${band},${t}`);
                        const isCurrentlyBeingScanned = currentScans.some(
                          (s) => s.band === band && currentStep === t
                        );
                        const isPastTime = t <= currentStep;
                        const isHighThreat = scanRecord && scanRecord.threatLevel === 'HIGH' && scanRecord.hit === 1;

                        const isSpotlightCell = Boolean(activeCatch && activeCatch.band === band && activeCatch.timestep === t);
                        const isOtherCellDuringSpotlight = Boolean(activeCatch && !isSpotlightCell);

                        let cellBg = 'bg-zinc-900/40';
                        if (isTransmitting) {
                          cellBg = emitter ? emitter.color : '#38bdf8';
                        }

                        // Subtle receiver background
                        let rBadgeBg = 'bg-emerald-500 text-zinc-950';
                        if (scanRecord?.receiverId === 2) {
                          rBadgeBg = 'bg-sky-500 text-zinc-950';
                        } else if (scanRecord?.receiverId === 3) {
                          rBadgeBg = 'bg-purple-500 text-zinc-950';
                        }

                        return (
                          <div
                            key={t}
                            onMouseEnter={() => setHoverCell({ band, t })}
                            onMouseLeave={() => setHoverCell(null)}
                            className={`flex-1 relative rounded-[3px] flex items-center justify-center transition-all cursor-pointer ${
                              isSpotlightCell
                                ? 'ring-4 ring-amber-400 shadow-[0_0_28px_rgba(251,191,36,1)] scale-125 z-30 animate-pulse bg-amber-500/30'
                                : isOtherCellDuringSpotlight
                                ? 'opacity-30'
                                : isPastTime
                                ? 'opacity-100'
                                : 'opacity-25'
                            } ${
                              isCurrentlyBeingScanned && !isSpotlightCell
                                ? 'ring-2 ring-white/80 shadow-[0_0_8px_rgba(255,255,255,0.3)] z-10'
                                : ''
                            } ${
                              isHighThreat && !isSpotlightCell
                                ? 'ring-2 ring-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                                : ''
                            }`}
                            style={{
                              backgroundColor: isTransmitting ? cellBg : undefined,
                              opacity: isSpotlightCell
                                ? 1
                                : isOtherCellDuringSpotlight
                                ? 0.35
                                : isTransmitting
                                ? isPastTime
                                  ? 0.92
                                  : 0.25
                                : isPastTime
                                ? 1
                                : 0.25,
                            }}
                          >
                            {/* Observation Badge showing which receiver looked */}
                            {scanRecord && (
                              <div
                                className={`absolute inset-0.5 rounded-[2px] flex items-center justify-center font-mono text-[9px] font-bold shadow-sm ${
                                  isSpotlightCell
                                    ? 'bg-amber-400 text-zinc-950 font-extrabold ring-1 ring-white shadow-md'
                                    : scanRecord.hit === 1
                                    ? isHighThreat
                                      ? 'bg-rose-600 text-white ring-1 ring-rose-300 font-extrabold'
                                      : `${rBadgeBg}`
                                    : 'bg-zinc-900/90 text-zinc-500 border border-zinc-800'
                                }`}
                              >
                                {isSpotlightCell ? '🎯' : scanRecord.hit === 1 ? `R${scanRecord.receiverId}` : '·'}
                              </div>
                            )}

                            {/* Unobserved transmission indicator */}
                            {isTransmitting && !scanRecord && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time axis footer */}
            <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-2.5 ml-34 px-1">
              <span>t = 0 (Start)</span>
              <span className="font-mono text-zinc-500 text-[10px]">Timeline (Discrete RF Steps)</span>
              <span>t = {env.numTimesteps - 1} (End)</span>
            </div>
          </div>
        </div>

        {/* Hover / Current Inspection Dock */}
        <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2 truncate">
            {hoverCell ? (
              <div className="truncate">
                <span className="font-mono text-zinc-100 font-semibold">
                  Band {hoverCell.band}, t={hoverCell.t}:
                </span>{' '}
                {env.groundTruth[hoverCell.band][hoverCell.t] === 1 ? (
                  <span className="text-emerald-400 font-semibold">
                    Transmission Active ({env.emitterMap[hoverCell.band][hoverCell.t]?.name || 'Unknown Emitter'}) - Threat: {getBandThreatLevel(hoverCell.band, emitters)}
                  </span>
                ) : (
                  <span className="text-zinc-500">Idle / No Signal - Threat: {getBandThreatLevel(hoverCell.band, emitters)}</span>
                )}
              </div>
            ) : (
              <span className="text-zinc-500 italic">
                Hover over any cell on the spectrogram to inspect instantaneous pulse ground truth and threat rating
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono hidden sm:block">
            Ground Truth vs Observation
          </div>
        </div>
      </div>

      {/* Feature 2: Decision Explainability (Now clean & collapsible) */}
      <ExplainabilityPanel currentScans={currentScans} currentStep={currentStep} />

      {/* Compact Status & Quick Metrics summary bar */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-zinc-400" />
              <span>Intercept Rate</span>
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-0.5">
              {metrics.interceptRatePct}%
            </div>
          </div>

          <div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Hostile Radar Intercepts</span>
            </div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
              {metrics.highThreatHits} <span className="text-xs font-normal text-zinc-400">hits</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Burst Latency</span>
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-0.5">
              {metrics.avgInterceptTimeError} <span className="text-xs font-normal text-zinc-400">steps</span>
            </div>
          </div>
        </div>

        {onViewBenchmarks && (
          <button
            type="button"
            onClick={onViewBenchmarks}
            className="px-4 py-2 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl transition-colors flex items-center gap-2 group"
          >
            <span>Compare all 5 schedulers in Benchmarks</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};
