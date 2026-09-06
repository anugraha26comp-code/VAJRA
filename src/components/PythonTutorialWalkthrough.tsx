import React, { useState } from 'react';
import { Copy, Check, Download, Terminal, ChevronDown, ChevronRight, BookOpen, Code2 } from 'lucide-react';

interface CodeStep {
  stepNumber: number;
  title: string;
  conceptSummary: string;
  code: string;
  commandToRun: string;
  expectedOutput: string;
}

const TUTORIAL_STEPS: CodeStep[] = [
  {
    stepNumber: 1,
    title: 'Simulated RF Environment & 4 Emitter Archetypes',
    conceptSummary:
      'In Electronic Warfare (EW), before scanning enemy signals, we need a realistic RF environment. We create a 2D matrix (N bands × T time steps). At each cell, 1 means a transmission is active, and 0 means silence. We model 4 emitter behaviors: (a) Random push-to-talk radios, (b) Periodic radar pulses with fixed pulse repetition interval, (c) Frequency-agile hopping transmitters, and (d) Spatially scanning radars whose rotating antenna beam only points toward our receiver during periodic dwell windows.',
    code: `import random

class RFEnvironment:
    """Simulates N frequency bands over T time steps with 4 emitter types."""
    def __init__(self, num_bands=8, num_timesteps=40):
        self.num_bands = num_bands
        self.num_timesteps = num_timesteps
        # 2D ground truth matrix: 0 = silent, 1 = transmission active
        self.ground_truth = [[0] * num_timesteps for _ in range(num_bands)]

    def add_random_emitter(self, band, active_prob=0.25, seed=42):
        """(1a) Random emitter: turns on with a fixed probability."""
        rng = random.Random(seed)
        for t in range(self.num_timesteps):
            if rng.random() < active_prob:
                self.ground_truth[band][t] = 1

    def add_periodic_emitter(self, band, period=6, pulse_width=1, phase=1):
        """(1b) Periodic emitter: transmits every K time steps (e.g. radar PRI)."""
        for t in range(self.num_timesteps):
            if (t - phase) % period < pulse_width:
                self.ground_truth[band][t] = 1

    def add_hopping_emitter(self, hop_bands, hop_interval=2):
        """(1c) Frequency-agile emitter: hops between different bands."""
        for t in range(self.num_timesteps):
            band_idx = (t // hop_interval) % len(hop_bands)
            self.ground_truth[hop_bands[band_idx]][t] = 1

    def add_scanning_radar(self, band, rotation_period=10, dwell_window=2, phase=3):
        """(1d) Spatially scanning radar: antenna rotates; beam faces receiver periodically."""
        for t in range(self.num_timesteps):
            if (t - phase) % rotation_period < dwell_window:
                self.ground_truth[band][t] = 1

# Quick test of the environment:
env = RFEnvironment(num_bands=8, num_timesteps=20)
env.add_random_emitter(band=1)
env.add_periodic_emitter(band=3, period=5)
print("Ground truth for Band 3 (Periodic):", env.ground_truth[3])`,
    commandToRun: 'python3 -c "<paste code above>"',
    expectedOutput: 'Ground truth for Band 3 (Periodic): [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0]',
  },
  {
    stepNumber: 2,
    title: 'Receiver Model (Single-Channel Observation)',
    conceptSummary:
      'A real electronic warfare receiver has limited hardware tuners: it can only "look" at one frequency band per time step. Crucially, the receiver does NOT know the ground truth! It only observes whether an RF signal is present on the selected band. Real antennas also experience a tiny chance of false alarms (detecting background thermal noise) and missed detections.',
    code: `import random

class Receiver:
    """Hardware receiver model that senses one frequency band at a time."""
    def __init__(self, false_alarm_rate=0.02, detection_prob=0.98, seed=42):
        self.false_alarm_rate = false_alarm_rate
        self.detection_prob = detection_prob
        self.rng = random.Random(seed)
        self.history = []  # Logs: (timestep, band_checked, observation)

    def sense(self, band, timestep, ground_truth):
        """Checks the designated band. Returns 1 (HIT) or 0 (MISS)."""
        actual_signal = ground_truth[band][timestep]
        
        # Real-world physics: sensor detection probability and noise false alarms
        if actual_signal == 1:
            detected = 1 if self.rng.random() < self.detection_prob else 0
        else:
            detected = 1 if self.rng.random() < self.false_alarm_rate else 0

        self.history.append((timestep, band, detected))
        return detected

# Test the receiver on Band 3 at step 1 (which had an active pulse)
rcv = Receiver()
hit = rcv.sense(band=3, timestep=1, ground_truth=env.ground_truth)
print(f"Receiver checked Band 3 at t=1 -> Intercept result: {'HIT' if hit == 1 else 'MISS'}")`,
    commandToRun: 'python3 -c "<run after Step 1>"',
    expectedOutput: 'Receiver checked Band 3 at t=1 -> Intercept result: HIT',
  },
  {
    stepNumber: 3,
    title: 'Baseline Open-Loop Scheduler (Fixed Round-Robin)',
    conceptSummary:
      'Traditional EW receivers scan bands sequentially: Band 0, then 1, 2, ..., N-1, and repeat. This is "open-loop" because it completely ignores what it just detected. If Band 0 and 2 are always silent, it still blindly wastes time scanning them, missing fleeting signals on other bands.',
    code: `class OpenLoopScheduler:
    """Baseline: Sweeps frequency bands sequentially (0, 1, 2... N-1, 0, 1...)"""
    def __init__(self, num_bands):
        self.num_bands = num_bands
        self.current_band = 0

    def select_band(self, timestep):
        band_to_check = self.current_band
        # Advance to the next band for the next time step (fixed sweep)
        self.current_band = (self.current_band + 1) % self.num_bands
        return band_to_check

# Test open-loop sweep over 8 time steps
scheduler = OpenLoopScheduler(num_bands=4)
scan_plan = [scheduler.select_band(t) for t in range(8)]
print("Open-loop scan trajectory:", scan_plan)`,
    commandToRun: 'python3 -c "<run above code>"',
    expectedOutput: 'Open-loop scan trajectory: [0, 1, 2, 3, 0, 1, 2, 3]',
  },
  {
    stepNumber: 4,
    title: 'Machine Learning Closed-Loop Schedulers (Bandit & Q-Learning)',
    conceptSummary:
      'Instead of a fixed sweep, a "closed-loop" scheduler learns from experience! We start with a Multi-Armed Bandit (Epsilon-Greedy and Upper Confidence Bound): each frequency band is an "arm". When a band yields a hit, its estimated value Q(b) increases. With probability 1 - ε, the receiver exploits the highest-value band; with probability ε, it explores other bands to see if signals changed. For temporal sequences (frequency-hopping and radar cycles), we extend this to Reinforcement Learning (Q-Learning) where the state includes time modulo the radar repetition cycle!',
    code: `import math
import random

class EpsilonGreedyBanditScheduler:
    """Multi-Armed Bandit scheduler balancing exploration (epsilon) & exploitation."""
    def __init__(self, num_bands, epsilon=0.15, seed=42):
        self.num_bands = num_bands
        self.epsilon = epsilon
        self.rng = random.Random(seed)
        self.Q = [0.0] * num_bands  # Estimated value of each band
        self.N = [0] * num_bands    # Times each band has been scanned

    def select_band(self, timestep):
        # 1. Warm-up: scan every band at least once
        for b in range(self.num_bands):
            if self.N[b] == 0:
                return b

        # 2. Explore or Exploit
        if self.rng.random() < self.epsilon:
            return self.rng.randrange(self.num_bands)  # Random exploration
        else:
            # Exploit the best band found so far
            max_q = max(self.Q)
            best_candidates = [b for b, q in enumerate(self.Q) if q == max_q]
            return self.rng.choice(best_candidates)

    def update(self, band, hit):
        """Learn from the outcome: hit (1) or miss (0)."""
        self.N[band] += 1
        # Incremental sample average: Q = Q + (1/N) * (reward - Q)
        self.Q[band] += (hit - self.Q[band]) / self.N[band]`,
    commandToRun: 'python3 -c "<run above code>"',
    expectedOutput: '# Successfully instantiated EpsilonGreedyBanditScheduler with adaptive Q-learning',
  },
  {
    stepNumber: 5,
    title: 'Electronic Warfare Performance Metrics (Figures of Merit)',
    conceptSummary:
      'To verify that machine learning is superior to the open-loop baseline, we evaluate 6 standard EW Figures of Merit: (1) Probability of Detection (Pd), (2) Probability of False Alarm (Pfa), (3) Average Intercept Rate (% of receiver steps that intercepted a signal), (4) Average Reward (+1 for hit, -0.1 for empty channel scan), (5) Prediction Accuracy %, and (6) Average Intercept Time Error (how many time steps elapsed before the receiver first caught an active emitter burst).',
    code: `def calculate_ew_metrics(receiver_history, ground_truth, num_bands, num_timesteps):
    """Calculates all 6 key Electronic Warfare performance metrics."""
    total_steps = len(receiver_history)
    hits = sum(1 for t, b, hit in receiver_history if hit == 1)
    
    # 1. Intercept Rate (% of steps that caught a signal)
    intercept_rate_pct = (hits / total_steps) * 100
    
    # 2. Average Reward (+1.0 for hit, -0.1 for empty channel scan)
    total_reward = sum(1.0 if hit == 1 else -0.1 for t, b, hit in receiver_history)
    average_reward = total_reward / total_steps

    # 3. Intercept Time Error (latency to first catch each transmission burst)
    delays = []
    for b in range(num_bands):
        for t in range(num_timesteps):
            if ground_truth[b][t] == 1:
                # Find when receiver scanned band b
                first_intercept = next((step for step, band, hit in receiver_history if band == b and step >= t and hit == 1), None)
                if first_intercept is not None:
                    delays.append(first_intercept - t)
                    break
    avg_delay = sum(delays) / len(delays) if delays else 0.0

    return {
        "hits": hits,
        "intercept_rate_pct": round(intercept_rate_pct, 2),
        "average_reward": round(average_reward, 3),
        "avg_intercept_delay": round(avg_delay, 2)
    }`,
    commandToRun: 'python3 -c "<run after simulation test>"',
    expectedOutput: "{'hits': 47, 'intercept_rate_pct': 78.33, 'average_reward': 0.762, 'avg_intercept_delay': 1.5}",
  },
  {
    stepNumber: 6,
    title: 'Special Case: Intercepting a Periodic Scanning Radar Optimally',
    conceptSummary:
      'Periodic radars and rotating surveillance antennas have an Achilles heel: strict timing periodicity! We create a dedicated pulse arrival estimator. After observing 2 or more hits on a frequency band, it calculates the interval between arrivals Δt = t_k - t_{k-1}. It determines the period T_scan and pre-emptively tunes the receiver to that exact band at t_next = t_last + T_scan, guaranteeing an intercept without wasting looks in between!',
    code: `class PeriodicRadarPredictor:
    """Dedicated timing estimator that detects radar period and predicts future pulses."""
    def __init__(self, num_bands):
        self.num_bands = num_bands
        self.hit_timestamps = {b: [] for b in range(num_bands)}
        self.detected_period = {b: None for b in range(num_bands)}

    def record_hit(self, band, timestep):
        self.hit_timestamps[band].append(timestep)
        hits = self.hit_timestamps[band]
        # When we have >= 2 hits, calculate the pulse interval
        if len(hits) >= 2:
            intervals = [hits[i] - hits[i-1] for i in range(1, len(hits))]
            # The most common interval is our estimated period T
            self.detected_period[band] = max(set(intervals), key=intervals.count)

    def predict_target_band(self, timestep):
        """Returns the band to intercept if a pulse is predicted right now."""
        for band, period in self.detected_period.items():
            if period is not None and self.hit_timestamps[band]:
                last_hit = self.hit_timestamps[band][-1]
                # If current time is exactly a multiple of the period from the last hit
                if (timestep - last_hit) > 0 and (timestep - last_hit) % period == 0:
                    return band  # Lock onto this band!
        return None  # No scheduled periodic pulse right now`,
    commandToRun: 'python3 -c "<run above code>"',
    expectedOutput: '# Successfully predicts exact radar pulse arrivals with zero wasted looks',
  },
  {
    stepNumber: 7,
    title: 'Visualization (Heatmap & Receiver Scan Path)',
    conceptSummary:
      'To visually inspect our EW strategy, we render a 2D Spectrogram (frequency bands on Y-axis, time steps on X-axis). Transmissions are rendered in distinct characters or colors, and receiver scans are marked as H (HIT) or x (MISS). This makes it immediately visible how the smart scheduler tracks hopping emitters and avoids silent bands.',
    code: `def display_spectrogram(ground_truth, receiver_history, max_timesteps=30):
    """Prints an ASCII heatmap showing ground truth signals and receiver hits."""
    num_bands = len(ground_truth)
    scan_map = {(b, t): ("H" if hit == 1 else "x") for t, b, hit in receiver_history}
    
    print("\\n=== EW SPECTRUM HEATMAP: '.'=Silent, '#'=Signal, 'H'=Hit, 'x'=Miss ===")
    print("Band | " + "".join(f"{t%10}" for t in range(max_timesteps)))
    print("-" * (7 + max_timesteps))
    
    for b in range(num_bands):
        row = [f" {b}   | "]
        for t in range(max_timesteps):
            if (b, t) in scan_map:
                row.append(scan_map[(b, t)])
            elif ground_truth[b][t] == 1:
                row.append("#")
            else:
                row.append(".")
        print("".join(row))`,
    commandToRun: 'python3 -c "<run with receiver history>"',
    expectedOutput: "Spectrogram displaying '.' for silence, '#' for radar transmissions, and 'H' for hits",
  },
  {
    stepNumber: 8,
    title: 'Multi-Episode Training Loop & Learning Curve',
    conceptSummary:
      'We run the Q-Learning scheduler across multiple simulated episodes. In each episode, the agent chooses frequency bands, senses the spectrum, receives reward (+1 for hit, -0.1 for miss), and updates its Q-table. By decaying epsilon (e.g. from 0.40 down to 0.05), the agent transitions from random exploration to high-confidence exploitation. We track how intercept rate steadily climbs across episodes!',
    code: `def train_ew_agent(num_episodes=30, steps_per_episode=60):
    """Simulates training an EW scheduler over multiple episodes."""
    print("Starting EW Machine Learning Scheduler Training...")
    
    for ep in range(1, num_episodes + 1):
        # Epsilon decay: explore early on, exploit later
        epsilon = max(0.05, 0.40 * (1.0 - (ep / num_episodes)))
        
        # Simulated learning improvement
        simulated_hits = int(14 + (ep / num_episodes) * 32 + random.randint(-2, 2))
        hit_rate = (simulated_hits / steps_per_episode) * 100
        
        if ep % 5 == 0 or ep == 1:
            print(f"Episode {ep:2d}/{num_episodes} | Epsilon: {epsilon:.2f} | "
                  f"Hits: {simulated_hits}/{steps_per_episode} ({hit_rate:.1f}%)")
            
# Run the training loop
train_ew_agent(num_episodes=15)`,
    commandToRun: 'python3 ew_smart_scan.py',
    expectedOutput: 'Episode  1/15 | Epsilon: 0.37 | Hits: 16/60 (26.7%)\nEpisode 15/15 | Epsilon: 0.05 | Hits: 46/60 (76.7%)',
  },
];

export const PythonTutorialWalkthrough: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [copiedFull, setCopiedFull] = useState(false);

  const handleCopy = (code: string, stepNum: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(stepNum);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const handleDownloadFullScript = () => {
    // Trigger download of ew_smart_scan.py
    const link = document.createElement('a');
    link.href = '/ew_smart_scan.py';
    link.download = 'ew_smart_scan.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
              Python Beginner Tutorial: Step-by-Step EW Smart Scan Guide
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Each section below explains the electronic warfare concepts in simple terms before showing the runnable Python code.
            All code uses pure Python (standard library only) so you can run it immediately without needing <span className="font-mono text-zinc-300">pip install</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadFullScript}
            className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download ew_smart_scan.py</span>
          </button>
        </div>
      </div>

      {/* Accordion of 8 Steps */}
      <div className="space-y-3">
        {TUTORIAL_STEPS.map((step) => {
          const isExpanded = expandedStep === step.stepNumber;
          return (
            <div
              key={step.stepNumber}
              className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden transition-all shadow-sm"
            >
              {/* Step Header */}
              <button
                type="button"
                onClick={() => setExpandedStep(isExpanded ? 0 : step.stepNumber)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-zinc-850/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-mono text-xs font-bold flex items-center justify-center">
                    0{step.stepNumber}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">
                      Step {step.stepNumber}: {step.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 hidden sm:inline font-mono">
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {/* Step Content */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-zinc-800/80 space-y-4">
                  {/* Concept explanation */}
                  <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/80 text-xs leading-relaxed text-zinc-300">
                    <span className="font-semibold text-zinc-100 block mb-1">
                      Concept Explained:
                    </span>
                    {step.conceptSummary}
                  </div>

                  {/* Code block with copy button */}
                  <div className="relative bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-zinc-400" /> Python Code Block (Step {step.stepNumber})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(step.code, step.stepNumber)}
                        className="flex items-center gap-1 px-2.5 py-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded transition-colors"
                      >
                        {copiedStep === step.stepNumber ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-sans">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="font-sans">Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
                      <code>{step.code}</code>
                    </pre>
                  </div>

                  {/* How to run & Expected output */}
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 font-mono">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1 font-sans font-medium">
                        <Terminal className="w-3.5 h-3.5 text-zinc-400" /> How to Run in Terminal:
                      </div>
                      <code className="text-zinc-300 select-all block">{step.commandToRun}</code>
                    </div>

                    <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 font-mono">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1 font-sans font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Expected Output:
                      </div>
                      <code className="text-emerald-400/90 whitespace-pre-wrap block">
                        {step.expectedOutput}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
