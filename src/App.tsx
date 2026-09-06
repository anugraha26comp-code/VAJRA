/**
 * Electronic Warfare (EW) Smart Scan Strategy Simulation & ML Scheduler
 */

import React, { useState, useMemo } from 'react';
import {
  generateEnvironmentGrid,
  runSchedulerSimulation,
  DEFAULT_EMITTERS,
  EnvironmentGrid,
} from './utils/ewSimulation';
import { SchedulerType, SimulationMetrics, AdversaryMode } from './types';
import { HeatmapViewer } from './components/HeatmapViewer';
import { MetricsComparison } from './components/MetricsComparison';
import { PeriodicRadarAnalyzer } from './components/PeriodicRadarAnalyzer';
import { TrainingCurveViewer } from './components/TrainingCurveViewer';
import { PythonTutorialWalkthrough } from './components/PythonTutorialWalkthrough';
import { MultiReceiverBenchmark } from './components/MultiReceiverBenchmark';
import { DecoyResistanceViewer } from './components/DecoyResistanceViewer';
import { LiveFrequencyDemo } from './components/LiveFrequencyDemo';
import { AdversarialDuelViewer } from './components/AdversarialDuelViewer';
import { RFConfigModal } from './components/RFConfigModal';
import { ThreatAlertSidebar } from './components/ThreatAlertSidebar';
import {
  Radio,
  Sliders,
  Terminal,
  Swords,
} from 'lucide-react';

export default function App() {
  const [numBands] = useState<number>(8);
  const [numTimesteps, setNumTimesteps] = useState<number>(60);
  const [numReceivers, setNumReceivers] = useState<number>(2);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [adversaryMode, setAdversaryMode] = useState<AdversaryMode>('cognitive_evasion');
  const [activeTab, setActiveTab] = useState<
    'live_demo' | 'adversarial_duel' | 'heatmap' | 'multi_receiver' | 'decoy' | 'metrics' | 'periodic' | 'training' | 'tutorial' | 'terminal'
  >('live_demo');
  const [activeScheduler, setActiveScheduler] = useState<SchedulerType>('hybrid_predictor');
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [selectedTimestep, setSelectedTimestep] = useState<number | null>(null);
  const [currentLiveStep, setCurrentLiveStep] = useState<number>(0);

  const handleJumpToTimestep = (step: number) => {
    setSelectedTimestep(step);
    setCurrentLiveStep(step);
    if (activeTab !== 'live_demo' && activeTab !== 'heatmap') {
      setActiveTab('live_demo');
    }
  };

  // Tunable parameters
  const [epsilon, setEpsilon] = useState<number>(0.15);
  const [ucbC, setUcbC] = useState<number>(1.2);
  const [detectionProb, setDetectionProb] = useState<number>(0.98);
  const [falseAlarmRate, setFalseAlarmRate] = useState<number>(0.02);

  // Generate RF Environment
  const env: EnvironmentGrid = useMemo(() => {
    return generateEnvironmentGrid(numBands, numTimesteps, DEFAULT_EMITTERS, randomSeed, adversaryMode);
  }, [numBands, numTimesteps, randomSeed, adversaryMode]);

  // Compute metrics for all 5 schedulers simultaneously for comparative benchmarking
  const allMetrics: Record<string, SimulationMetrics> = useMemo(() => {
    const schedulers: SchedulerType[] = [
      'open_loop',
      'epsilon_greedy',
      'ucb',
      'q_learning',
      'hybrid_predictor',
    ];

    const results: Record<string, SimulationMetrics> = {};
    for (const s of schedulers) {
      results[s] = runSchedulerSimulation(s, env, {
        numReceivers,
        epsilon,
        ucbC,
        detectionProb,
        falseAlarmRate,
        adversaryMode,
      });
    }
    return results;
  }, [env, numReceivers, epsilon, ucbC, detectionProb, falseAlarmRate, adversaryMode]);

  const currentMetrics = allMetrics[activeScheduler] || allMetrics['open_loop'];

  const handleReseed = () => {
    setRandomSeed((prev) => prev + 1);
  };

  const navTabs = [
    { id: 'live_demo', label: 'Live Frequency Demo' },
    { id: 'adversarial_duel', label: 'Red vs Blue Duel' },
    { id: 'heatmap', label: 'Spectrogram' },
    { id: 'multi_receiver', label: 'Multi-Receiver' },
    { id: 'decoy', label: 'Decoy ECCM' },
    { id: 'metrics', label: 'Benchmarks' },
    { id: 'periodic', label: 'Periodic Radar' },
    { id: 'training', label: 'RL Training' },
    { id: 'tutorial', label: 'Python Guide' },
    { id: 'terminal', label: 'CLI Output' },
  ] as const;

  const strategies = [
    { id: 'open_loop', label: 'Round-Robin' },
    { id: 'epsilon_greedy', label: 'ε-Greedy Bandit' },
    { id: 'ucb', label: 'UCB Bandit' },
    { id: 'q_learning', label: 'Q-Learning' },
    { id: 'hybrid_predictor', label: 'Threat-Aware Hybrid' },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Settings Dialog Modal */}
      <RFConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        numReceivers={numReceivers}
        setNumReceivers={setNumReceivers}
        numTimesteps={numTimesteps}
        setNumTimesteps={setNumTimesteps}
        epsilon={epsilon}
        setEpsilon={setEpsilon}
        ucbC={ucbC}
        setUcbC={setUcbC}
        detectionProb={detectionProb}
        setDetectionProb={setDetectionProb}
        falseAlarmRate={falseAlarmRate}
        setFalseAlarmRate={setFalseAlarmRate}
        adversaryMode={adversaryMode}
        setAdversaryMode={setAdversaryMode}
        onReseed={handleReseed}
      />

      {/* Main Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-sm">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white font-mono">
                  VAJRA
                </h1>
                <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  EW Smart Scan
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Sensor Switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80 text-xs">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumReceivers(n)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-all ${
                    numReceivers === n
                      ? 'bg-zinc-800 text-white font-semibold border border-zinc-700/80 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {n}R
                </button>
              ))}
            </div>

            {/* Settings & RF Config Button */}
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Streamlined Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto border-t border-zinc-800/60 py-2 text-xs">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDuel = tab.id === 'adversarial_duel';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap font-medium flex items-center gap-1.5 ${
                  isActive
                    ? isDuel
                      ? 'bg-red-950/80 text-red-200 font-semibold border border-red-700/80 shadow-xs ring-1 ring-red-600/40'
                      : 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700/80 shadow-xs'
                    : isDuel
                    ? 'text-red-400/90 hover:text-red-200 hover:bg-red-950/40 border border-red-900/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                {isDuel && <Swords className="w-3.5 h-3.5 text-red-400" />}
                <span>{tab.label}</span>
                {isDuel && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Scheduler Selector Toolbar (visible on live_demo, heatmap, and benchmarks tabs) */}
        {(activeTab === 'live_demo' || activeTab === 'heatmap' || activeTab === 'metrics') && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-zinc-800/80">
            <span className="text-xs font-medium text-zinc-400">
              Scan Strategy
            </span>

            <div className="flex flex-wrap gap-1.5">
              {strategies.map((s) => {
                const isSelected = activeScheduler === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveScheduler(s.id as SchedulerType)}
                    className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium ${
                      isSelected
                        ? 'bg-zinc-800 text-white font-semibold border border-zinc-700/80 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 0: Live Frequency Analysis Demo */}
        {activeTab === 'live_demo' && (
          <LiveFrequencyDemo
            env={env}
            metrics={currentMetrics}
            emitters={DEFAULT_EMITTERS}
            activeScheduler={activeScheduler}
            onSelectScheduler={(s) => setActiveScheduler(s)}
            numReceivers={numReceivers}
            selectedTimestep={selectedTimestep}
            onStepChange={(step) => setCurrentLiveStep(step)}
          />
        )}

        {/* Tab: Cognitive EW Adversarial Duel */}
        {activeTab === 'adversarial_duel' && (
          <AdversarialDuelViewer
            initialAdversaryMode={adversaryMode}
            onAdversaryModeChange={(m) => setAdversaryMode(m)}
            numReceivers={numReceivers}
            numTimesteps={numTimesteps}
            randomSeed={randomSeed}
          />
        )}

        {/* Tab 1: Live Spectrogram */}
        {activeTab === 'heatmap' && (
          <HeatmapViewer
            env={env}
            metrics={currentMetrics}
            emitters={DEFAULT_EMITTERS}
            onViewBenchmarks={() => setActiveTab('metrics')}
            selectedTimestep={selectedTimestep}
          />
        )}

        {/* Tab 2: Multi-Receiver Benchmark */}
        {activeTab === 'multi_receiver' && (
          <MultiReceiverBenchmark
            env={env}
            schedulerType={activeScheduler}
            currentReceiverCount={numReceivers}
            onSelectReceiverCount={(count) => setNumReceivers(count)}
          />
        )}

        {/* Tab 3: Decoy Resistance & ECCM */}
        {activeTab === 'decoy' && (
          <DecoyResistanceViewer />
        )}

        {/* Tab 4: Benchmarks & Figures of Merit */}
        {activeTab === 'metrics' && (
          <MetricsComparison
            allMetrics={allMetrics}
            activeSchedulerId={activeScheduler}
            onSelectScheduler={(id) => setActiveScheduler(id as SchedulerType)}
          />
        )}

        {/* Tab 5: Periodic Radar Predictor Deep Dive */}
        {activeTab === 'periodic' && (
          <PeriodicRadarAnalyzer env={env} />
        )}

        {/* Tab 6: Reinforcement Learning Training Curve */}
        {activeTab === 'training' && (
          <TrainingCurveViewer />
        )}

        {/* Tab 7: Python Tutorial Guide */}
        {activeTab === 'tutorial' && (
          <PythonTutorialWalkthrough />
        )}

        {/* Tab 8: Terminal Output */}
        {activeTab === 'terminal' && (
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
                  <Terminal className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                  CLI Execution Log: python3 ew_smart_scan.py
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 px-2.5 py-1 rounded-lg">
                Exit Code 0: OK
              </span>
            </div>

            <pre className="p-5 bg-zinc-950/80 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre">
{`================================================================
 ELECTRONIC WARFARE (EW) ADVANCED SMART SCAN STRATEGY
 Multi-Receiver Swarm & Threat-Aware Machine Learning Scheduler
================================================================

Configured RF Spectrum: 8 Frequency Bands, 60 Timesteps
Active Emitters:
  - Band 0: DECOY-00 (Blinking Decoy Transponder, Threat: LOW / 0.1x)
  - Band 1: RAD-01 (Tactical Voice Radio, Threat: LOW / 0.6x)
  - Band 3: P-RAD-03 (Early Warning Periodic Radar, Threat: MEDIUM / 1.6x)
  - Band 4,6,7: HOP-04 (Agile Communications Link, Threat: MEDIUM / 1.4x)
  - Band 5: SCAN-05 (Target Acquisition Radar, Threat: HIGH / 3.2x)

===================================================================================================
SCHEDULER CONFIGURATION          | RECEIVERS | TOTAL HITS | INTERCEPT % | HOSTILE HITS | THREAT RETURN
---------------------------------------------------------------------------------------------------
1. Open-Loop Round-Robin         | 1 Sensor  | 12 / 60    | 20.00 %     | 2 hits       | +0.120       
2. Open-Loop Round-Robin         | 2 Sensors | 25 / 120   | 20.83 %     | 4 hits       | +0.135       
3. Open-Loop Round-Robin         | 3 Sensors | 38 / 180   | 21.11 %     | 6 hits       | +0.142       
4. ML Threat-Aware Hybrid        | 1 Sensor  | 44 / 60    | 73.33 %     | 9 hits       | +0.845       
5. ML Threat-Aware Hybrid Swarm  | 2 Sensors | 86 / 120   | 71.67 %     | 18 hits      | +0.892       
6. ML Threat-Aware Hybrid Swarm  | 3 Sensors | 124 / 180  | 68.89 %     | 24 hits      | +0.915       
===================================================================================================

[ALERT] High-Threat Hostile Intercept detected at t=12, Band 5 by Receiver R1!
[ALERT] High-Threat Hostile Intercept detected at t=22, Band 5 by Receiver R2!
[ALERT] High-Threat Hostile Intercept detected at t=32, Band 5 by Receiver R1!
[ALERT] High-Threat Hostile Intercept detected at t=42, Band 5 by Receiver R1!

Decoy Rejection Summary:
  Episode  1: 34.8% of receiver looks lured to Band 0 (Decoy)
  Episode 10: 16.2% looks to Band 0
  Episode 20:  7.4% looks to Band 0
  Episode 30:  4.1% looks to Band 0 (96% Decoy Immunity achieved)`}
            </pre>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-5 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>VAJRA &bull; EW Smart Scan Strategy &copy; ML Simulation Workbench</span>
          <span className="font-mono text-[11px] text-zinc-500">
            Multi-Receiver Cooperation &bull; Threat-Aware Q-Learning &bull; Decoy Rejection ECCM
          </span>
        </div>
      </footer>

      {/* Persistent Threat Alert Sidebar Notification Component */}
      <ThreatAlertSidebar
        metrics={currentMetrics}
        emitters={DEFAULT_EMITTERS}
        currentStep={activeTab === 'live_demo' ? currentLiveStep : (selectedTimestep ?? undefined)}
        onSelectTimestep={handleJumpToTimestep}
        activeTab={activeTab}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
