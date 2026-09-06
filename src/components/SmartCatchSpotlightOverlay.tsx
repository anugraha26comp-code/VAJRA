import React from 'react';
import { SmartCatchRecord } from '../types';
import { Sparkles, ShieldAlert, Target, Clock, Volume2, VolumeX, History, X, CheckCircle2 } from 'lucide-react';

interface SmartCatchSpotlightOverlayProps {
  activeCatch: SmartCatchRecord | null;
  smartCatchLog: SmartCatchRecord[];
  isSpotlightEnabled: boolean;
  onToggleSpotlight: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  onSelectCatchStep?: (step: number) => void;
  showLogModal: boolean;
  onCloseLogModal: () => void;
  onOpenLogModal: () => void;
}

export const SmartCatchSpotlightOverlay: React.FC<SmartCatchSpotlightOverlayProps> = ({
  activeCatch,
  smartCatchLog,
  isSpotlightEnabled,
  onToggleSpotlight,
  isSoundEnabled,
  onToggleSound,
  onSelectCatchStep,
  showLogModal,
  onCloseLogModal,
  onOpenLogModal,
}) => {
  return (
    <>
      {/* Active Spotlight Toast/Card when a Smart Catch occurs */}
      {activeCatch && isSpotlightEnabled && (
        <div className="relative z-40 my-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-amber-950/90 via-zinc-900/95 to-amber-950/90 border-2 border-amber-400/80 rounded-2xl p-4 shadow-[0_0_30px_rgba(251,191,36,0.35)] backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-400 text-zinc-950 shadow-xs">
                      Smart Catch Spotlight
                    </span>
                    <span className="text-xs font-mono text-amber-200/90">
                      Band {activeCatch.band} • t = {activeCatch.timestep}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white tracking-tight mt-1 flex items-center gap-2">
                    {activeCatch.headline}
                  </h4>
                  <p className="text-xs text-zinc-200 mt-0.5 max-w-2xl leading-relaxed">
                    {activeCatch.explanation}
                  </p>
                </div>
              </div>

              {/* Target Details Badge & Timer */}
              <div className="flex items-center gap-3 shrink-0 ml-auto">
                <div className="bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800 text-right font-mono text-xs">
                  <div className="text-[10px] text-zinc-400 uppercase">Target Intercepted</div>
                  <div className="text-amber-300 font-semibold">{activeCatch.emitterFriendlyName}</div>
                </div>

                <div className="bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-xl font-mono text-xs text-amber-200">
                  <div className="text-[10px] text-amber-400/80 uppercase">AI Confidence</div>
                  <div className="text-amber-300 font-bold">{activeCatch.confidencePct}%</div>
                </div>
              </div>
            </div>

            {/* Countdown animation bar indicating automatic resumption */}
            <div className="w-full bg-zinc-950/60 rounded-full h-1 mt-3 overflow-hidden border border-amber-500/20">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-200 rounded-full transition-all ease-linear"
                style={{
                  width: '100%',
                  animation: 'shrinkBar 1.5s linear forwards',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Smart Catch Log Modal / Drawer */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    Smart Catches Log
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Showing {smartCatchLog.length} smart AI interceptions recorded this session
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseLogModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Log Entries */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {smartCatchLog.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No smart catches recorded yet. Press Play to let the AI intercept periodic or agile signals!
                </div>
              ) : (
                smartCatchLog.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl hover:border-amber-500/40 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300">{item.headline}</span>
                        <span className="font-mono text-[10px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                          t = {item.timestep}
                        </span>
                        <span className="font-mono text-[10px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                          Band {item.band}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {item.explanation}
                      </p>
                    </div>

                    {onSelectCatchStep && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCatchStep(item.timestep);
                          onCloseLogModal();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-300 text-zinc-300 font-mono text-[11px] border border-zinc-700/80 transition-colors shrink-0"
                      >
                        Jump to t={item.timestep}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={onCloseLogModal}
                className="px-4 py-2 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
