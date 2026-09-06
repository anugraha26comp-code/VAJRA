import React, { useState } from 'react';
import { ReceiverObservation } from '../types';
import { ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, Crosshair } from 'lucide-react';

interface ThreatAlertBannerProps {
  currentScans: ReceiverObservation[];
  currentStep: number;
  allHistory: ReceiverObservation[];
}

export const ThreatAlertBanner: React.FC<ThreatAlertBannerProps> = ({
  currentScans,
  currentStep,
  allHistory,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any scan at currentStep intercepted a HIGH-threat signal
  const activeHighThreat = currentScans.find((s) => s.hit === 1 && s.threatLevel === 'HIGH');
  const activeMediumThreat = currentScans.find((s) => s.hit === 1 && s.threatLevel === 'MEDIUM');

  // Filter all high-threat intercepts up to currentStep
  const highThreatLogs = allHistory.filter(
    (s) => s.timestep <= currentStep && s.hit === 1 && s.threatLevel === 'HIGH'
  );

  return (
    <div className="space-y-2">
      {/* Active Threat Strip */}
      {activeHighThreat ? (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl px-4 py-3 text-zinc-100 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
                  Critical Hostile Signal Locked
                </span>
                <span className="text-xs font-mono text-zinc-400">t = {currentStep}</span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Receiver <span className="font-semibold text-white">R{activeHighThreat.receiverId}</span> intercepted{' '}
                <span className="text-rose-200 font-medium">{activeHighThreat.emitterId || 'Hostile Radar'}</span> on{' '}
                <span className="font-mono text-zinc-200">Band {activeHighThreat.band}</span> (Target Acquisition Radar)
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs hidden sm:block">
            <span className="text-zinc-500 block text-[10px]">Threat Multiplier</span>
            <span className="text-rose-300 font-bold">3.2× Priority</span>
          </div>
        </div>
      ) : activeMediumThreat ? (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl px-4 py-2.5 text-zinc-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs text-zinc-300">
                <span className="font-semibold text-amber-300 uppercase text-[10px] mr-1.5">Priority Signal</span>
                Receiver R{activeMediumThreat.receiverId} tuned to Band {activeMediumThreat.band}: {activeMediumThreat.emitterId || 'Signal'} (1.6× Threat)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">t = {currentStep}</span>
        </div>
      ) : null}

      {/* High Threat Log - Subtle collapsible drawer */}
      {highThreatLogs.length > 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-300">
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-medium">Hostile Intercepts:</span>
              <span className="font-mono text-rose-400 font-semibold">{highThreatLogs.length} confirmed</span>
              <span className="text-zinc-500 text-[11px] hidden sm:inline">(Band 5 Acquisition Radar)</span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-zinc-800"
            >
              <span>{isExpanded ? 'Hide history' : 'View history'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {highThreatLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-[10px] font-mono flex items-center gap-1.5 text-zinc-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-zinc-200">t={log.timestep}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-emerald-400">R{log.receiverId}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
