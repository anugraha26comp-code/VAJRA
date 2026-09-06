import React from 'react';
import { X, RotateCcw, Sliders, Check, Flame } from 'lucide-react';
import { AdversaryMode } from '../types';

interface RFConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  numReceivers: number;
  setNumReceivers: (val: number) => void;
  numTimesteps: number;
  setNumTimesteps: (val: number) => void;
  epsilon: number;
  setEpsilon: (val: number) => void;
  ucbC: number;
  setUcbC: (val: number) => void;
  detectionProb: number;
  setDetectionProb: (val: number) => void;
  falseAlarmRate: number;
  setFalseAlarmRate: (val: number) => void;
  adversaryMode?: AdversaryMode;
  setAdversaryMode?: (mode: AdversaryMode) => void;
  onReseed: () => void;
}

export const RFConfigModal: React.FC<RFConfigModalProps> = ({
  isOpen,
  onClose,
  numReceivers,
  setNumReceivers,
  numTimesteps,
  setNumTimesteps,
  epsilon,
  setEpsilon,
  ucbC,
  setUcbC,
  detectionProb,
  setDetectionProb,
  falseAlarmRate,
  setFalseAlarmRate,
  adversaryMode = 'cognitive_evasion',
  setAdversaryMode,
  onReseed,
}) => {
  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setNumReceivers(2);
    setNumTimesteps(60);
    setEpsilon(0.15);
    setUcbC(1.2);
    setDetectionProb(0.98);
    setFalseAlarmRate(0.02);
    if (setAdversaryMode) setAdversaryMode('cognitive_evasion');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 z-10 text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Simulation Settings</h3>
              <p className="text-xs text-zinc-400">Configure RF environment, noise, and algorithm hyperparameters</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-5">
          {/* Receivers */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300 font-medium">Cooperating Receivers</span>
              <span className="font-mono text-emerald-400 font-semibold">{numReceivers} Sensors</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNumReceivers(r)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-2 ${
                    numReceivers === r
                      ? 'bg-zinc-800 border-zinc-600 text-white font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span>{r} {r === 1 ? 'Receiver' : 'Receivers'}</span>
                  {numReceivers === r && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Adversary Intelligence Mode (Red Team) */}
          {setAdversaryMode && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  Red Radar Adversary Mode
                </span>
                <span className="font-mono text-red-400 font-semibold text-[11px]">
                  {adversaryMode === 'static' ? 'Static (Baseline)' : adversaryMode === 'jitter' ? 'PRI Jitter (±25%)' : 'Cognitive Evasion'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'static', label: 'Static PRI', sub: 'Baseline 6t' },
                  { id: 'jitter', label: 'PRI Jitter', sub: '±20–30% Stagger' },
                  { id: 'cognitive_evasion', label: 'Cognitive', sub: 'Anti-Camping Hop' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAdversaryMode(m.id as AdversaryMode)}
                    className={`py-2 px-2.5 rounded-lg text-left border transition-all flex flex-col justify-between ${
                      adversaryMode === m.id
                        ? 'bg-red-950/40 border-red-700 text-white font-semibold ring-1 ring-red-600/50'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs">{m.label}</span>
                      {adversaryMode === m.id && <Check className="w-3 h-3 text-red-400" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{m.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grid Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Timesteps */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Timeline Length (T)</span>
                <span className="font-mono text-zinc-200 font-semibold">{numTimesteps} steps</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={numTimesteps}
                onChange={(e) => setNumTimesteps(Number(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded"
              />
            </div>

            {/* Epsilon */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Bandit Exploration (ε)</span>
                <span className="font-mono text-zinc-200 font-semibold">{epsilon}</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.5}
                step={0.05}
                value={epsilon}
                onChange={(e) => setEpsilon(Number(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded"
              />
            </div>

            {/* UCB Parameter */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">UCB Confidence Bonus (c)</span>
                <span className="font-mono text-zinc-200 font-semibold">{ucbC}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.1}
                value={ucbC}
                onChange={(e) => setUcbC(Number(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded"
              />
            </div>

            {/* Detection Probability */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Detection Probability (P_d)</span>
                <span className="font-mono text-emerald-400 font-semibold">{detectionProb}</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.0}
                step={0.02}
                value={detectionProb}
                onChange={(e) => setDetectionProb(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
              />
            </div>

            {/* False Alarm Rate */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60 sm:col-span-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">False Alarm Rate (P_fa)</span>
                <span className="font-mono text-amber-400 font-semibold">{falseAlarmRate}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={0.1}
                step={0.01}
                value={falseAlarmRate}
                onChange={(e) => setFalseAlarmRate(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onReseed}
            className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-750 hover:text-white rounded-lg border border-zinc-700/60 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Generate New Seed</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Defaults
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
