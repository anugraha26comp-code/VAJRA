import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SimulationMetrics, EmitterConfig, ReceiverObservation } from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Target,
  Clock,
  Radio,
  Crosshair,
  ExternalLink,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';

/**
 * Web Audio API military warning chirp for high-threat alert notifications.
 */
function playThreatWarningBeep(muted: boolean = false): void {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(740, now + 0.08);
    osc.frequency.setValueAtTime(880, now + 0.16);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  } catch {
    // Autoplay policy fallback
  }
}

interface ThreatAlertSidebarProps {
  metrics: SimulationMetrics;
  emitters: EmitterConfig[];
  currentStep?: number;
  onSelectTimestep?: (step: number) => void;
  activeTab?: string;
  onNavigateToTab?: (tab: 'live_demo' | 'heatmap') => void;
}

export const ThreatAlertSidebar: React.FC<ThreatAlertSidebarProps> = ({
  metrics,
  emitters,
  currentStep,
  onSelectTimestep,
  activeTab,
  onNavigateToTab,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<{
    id: string;
    step: number;
    receiverId: number;
    band: number;
    emitterName: string;
    threatMultiplier: number;
  } | null>(null);

  const lastNotifiedStepRef = useRef<number>(-1);
  const toastTimeoutRef = useRef<any>(null);

  // 1. Gather all high-threat encounters from the simulation history
  const allHighThreatIntercepts = useMemo(() => {
    return metrics.history.filter((s) => s.threatLevel === 'HIGH' && s.hit === 1);
  }, [metrics.history]);

  // 2. High-threat emitter details (e.g. SCAN-05)
  const highThreatEmitter = useMemo(() => {
    return emitters.find((e) => e.threatLevel === 'HIGH') || {
      id: 'SCAN-05',
      name: 'Target Acquisition Radar',
      type: 'Spatial-Scan',
      bands: [5],
      threatLevel: 'HIGH',
      threatMultiplier: 3.2,
      description: 'Hostile rotating acquisition radar; high priority engagement.',
    };
  }, [emitters]);

  // 3. Current active high-threat intercept at currentStep (if currentStep is provided)
  const activeEncounterAtCurrentStep = useMemo(() => {
    if (currentStep === undefined) return null;
    return metrics.history.find(
      (s) => s.timestep === currentStep && s.threatLevel === 'HIGH' && s.hit === 1
    );
  }, [metrics.history, currentStep]);

  // 4. Trigger pop-up alert toast and audio alert when currentStep encounters a high-threat signal
  useEffect(() => {
    if (activeEncounterAtCurrentStep && currentStep !== undefined) {
      if (lastNotifiedStepRef.current !== currentStep) {
        lastNotifiedStepRef.current = currentStep;

        // Play warning beep
        if (soundEnabled) {
          playThreatWarningBeep(false);
        }

        // Display toast notification
        setActiveToast({
          id: `threat-${currentStep}-${activeEncounterAtCurrentStep.band}`,
          step: currentStep,
          receiverId: activeEncounterAtCurrentStep.receiverId,
          band: activeEncounterAtCurrentStep.band,
          emitterName: highThreatEmitter.name,
          threatMultiplier: highThreatEmitter.threatMultiplier,
        });

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setActiveToast(null);
        }, 5000);
      }
    }
  }, [activeEncounterAtCurrentStep, currentStep, highThreatEmitter, soundEnabled]);

  // 5. Total high-threat encounters count
  const threatCount = allHighThreatIntercepts.length;

  // Don't render anything if simulation has no high threats at all
  if (threatCount === 0 && !activeEncounterAtCurrentStep) {
    return null;
  }

  // Handle jump to timestep
  const handleJumpToStep = (step: number) => {
    if (onSelectTimestep) {
      onSelectTimestep(step);
    }
    if (onNavigateToTab && activeTab !== 'live_demo' && activeTab !== 'heatmap') {
      onNavigateToTab('live_demo');
    }
  };

  return (
    <>
      {/* Toast Notification (pops in when a High Threat is encountered) */}
      {activeToast && (
        <div
          className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-rose-950/95 border-2 border-rose-500 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-zinc-100 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300 shrink-0 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-rose-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider">
                    Critical Threat Locked
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/80 text-white">
                    t = {activeToast.step}
                  </span>
                </div>
                <p className="text-xs text-zinc-200 mt-1 font-medium leading-snug">
                  Receiver <span className="font-bold text-white">R{activeToast.receiverId}</span> intercepted{' '}
                  <span className="text-rose-200 font-bold">{activeToast.emitterName}</span> on Band{' '}
                  {activeToast.band}.
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
                  <span className="text-rose-300 font-bold">
                    {activeToast.threatMultiplier}× Threat Priority
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(true);
                      setActiveToast(null);
                    }}
                    className="text-white underline hover:text-rose-200 flex items-center gap-1 font-sans"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="p-1 rounded-lg hover:bg-rose-900/60 text-rose-300 hover:text-white transition-colors"
              title="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Floating Sidebar Tab / Pill Button (Docked to right edge) */}
      <aside aria-label="Threat Alert Sidebar" className="fixed right-0 top-32 z-40 flex flex-col items-end pointer-events-none">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`pointer-events-auto flex items-center gap-2 pl-3 pr-2.5 py-2.5 rounded-l-2xl border-y border-l shadow-2xl transition-all duration-300 ${
            activeEncounterAtCurrentStep
              ? 'bg-rose-950/90 hover:bg-rose-900 border-rose-500/80 text-white shadow-rose-900/50 ring-2 ring-rose-500/50 animate-pulse'
              : 'bg-zinc-950/90 hover:bg-zinc-900 border-rose-900/60 text-zinc-200 shadow-zinc-950/80'
          }`}
          title="Threat Alert Sidebar: View high-threat radar encounters and tactical EW recommendations"
        >
          <div className="relative flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            {activeEncounterAtCurrentStep && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            )}
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-rose-400 leading-none">
              Threat Alert
            </span>
            <span className="text-xs font-mono font-bold text-white mt-0.5 leading-none">
              {threatCount} {threatCount === 1 ? 'Intercept' : 'Intercepts'}
            </span>
          </div>

          <div className="ml-1 pl-1.5 border-l border-zinc-800 text-zinc-400">
            {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </div>
        </button>
      </aside>

      {/* Slide-Out Persistent Threat Alert Sidebar Drawer */}
      {isOpen && (
        <aside
          aria-label="Threat Alert Drawer"
          className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-zinc-950/95 border-l border-rose-900/40 shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-300 animate-in slide-in-from-right"
        >
          {/* Drawer Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span>THREAT ALERT MONITOR</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-mono">
                    HIGH PRIORITY
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Hostile Radar Interceptions & EW Countermeasures
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sound toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled
                    ? 'text-rose-400 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                }`}
                title={soundEnabled ? 'Alert chime enabled' : 'Alert chime muted'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Close Drawer Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                title="Collapse Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Active High-Threat Emitter Card */}
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 text-zinc-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-rose-300 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  Primary Hostile Emitter
                </span>
                <span className="text-xs font-mono font-bold text-rose-200 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/50">
                  {highThreatEmitter.threatMultiplier}× Multiplier
                </span>
              </div>

              <div>
                <h4 className="text-base font-semibold text-white font-mono">
                  {highThreatEmitter.id}: {highThreatEmitter.name}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs font-mono text-zinc-300">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                    Band {highThreatEmitter.bands.join(', ')}
                  </span>
                  <span>&bull;</span>
                  <span className="text-rose-300">Spatial-Scan Antenna</span>
                  <span>&bull;</span>
                  <span className="text-zinc-400">10.5 GHz X-Band</span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Adversary Target Acquisition Radar mechanically sweeping sector. Failure to dwell on this band during transmission leads to critical track loss.
              </p>
            </div>

            {/* Performance Summary Banner */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Active Scheduler:</span>
                <span className="font-semibold text-white">{metrics.schedulerName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Confirmed Intercepts</span>
                  <span className="text-lg font-bold font-mono text-rose-400">
                    {threatCount} hits
                  </span>
                </div>

                <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Threat Return</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    +{(metrics?.threatWeightedHits ?? ((metrics?.highThreatHits ?? threatCount) * 3.0)).toFixed(1)} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Chronological Interception Log */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Encounter Timeline ({threatCount})</span>
                </h5>
                <span className="text-[11px] text-zinc-500 font-mono">Click to jump</span>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {allHighThreatIntercepts.map((obs, idx) => {
                  const isCurrent = currentStep === obs.timestep;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono transition-all ${
                        isCurrent
                          ? 'bg-rose-950/80 border-rose-500 text-white shadow-sm'
                          : 'bg-zinc-900/50 hover:bg-zinc-850 border-zinc-800/80 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center font-bold text-[10px]">
                          R{obs.receiverId}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">t = {obs.timestep}</span>
                            <span className="text-[10px] text-zinc-400">Band {obs.band}</span>
                          </div>
                          <span className="text-[10px] text-rose-300">
                            {obs.emitterId || 'SCAN-05'} locked
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleJumpToStep(obs.timestep)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          isCurrent
                            ? 'bg-rose-500 text-zinc-950 shadow-xs'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                        title={`Jump timeline to t=${obs.timestep}`}
                      >
                        <Target className="w-3 h-3" />
                        <span>{isCurrent ? 'Active' : 'Jump'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tactical EW Recommendations (ECCM) */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200 uppercase">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Tactical EW Recommendations</span>
              </div>

              <ul className="text-xs text-zinc-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-zinc-200">Continuous Band 5 Dwell:</strong> Ensure at least one receiver retains focus on Band 5 during predicted radar rotation cycles.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-zinc-200">Decoy Rejection:</strong> Avoid diverting looks to Band 0 decoy beacons to preserve sensor bandwidth for Band 5 tracking.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-zinc-200">Multi-Sensor Swarm:</strong> When operating with 2 or 3 receivers, designate Receiver 1 as primary tracking lead.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Status: {threatCount > 0 ? 'Threat Track Active' : 'Idle'}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-zinc-300 hover:text-white underline"
            >
              Close Drawer
            </button>
          </div>
        </aside>
      )}
    </>
  );
};
