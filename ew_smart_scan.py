#!/usr/bin/env python3
"""
Electronic Warfare (EW) Smart Scan Strategy Simulation & ML Scheduler
=====================================================================
A complete, self-contained educational framework for simulating RF environments
and training intelligent receiver schedulers to intercept radar and radio signals.

Works in pure Python (standard library only) - no pip installs required!
"""

import math
import random
from typing import Dict, List, Tuple, Any, Optional

# =============================================================================
# STEP 1: SIMULATED RF ENVIRONMENT
# =============================================================================

class Emitter:
    """Base class for RF signal emitters."""
    def __init__(self, emitter_id: str, emitter_type: str, bands: List[int]):
        self.emitter_id = emitter_id
        self.emitter_type = emitter_type
        self.bands = bands  # Frequency bands this emitter can operate in

    def is_active(self, band: int, timestep: int) -> bool:
        """Returns True if the emitter is transmitting on `band` at `timestep`."""
        raise NotImplementedError


class RandomEmitter(Emitter):
    """
    (1a) Random Emitter:
    Simulates unpredictable signals (e.g. push-to-talk radios or burst data).
    Turns on with a fixed probability at each time step.
    """
    def __init__(self, emitter_id: str, band: int, active_prob: float = 0.25, seed: int = 42):
        super().__init__(emitter_id, "Random", [band])
        self.band = band
        self.active_prob = active_prob
        self.rng = random.Random(seed)
        # Pre-generate schedule for reproducibility
        self._schedule: Dict[int, bool] = {}

    def is_active(self, band: int, timestep: int) -> bool:
        if band != self.band:
            return False
        if timestep not in self._schedule:
            self._schedule[timestep] = self.rng.random() < self.active_prob
        return self._schedule[timestep]


class PeriodicEmitter(Emitter):
    """
    (1b) Periodic Emitter:
    Simulates radars with fixed pulse repetition intervals (PRI).
    Transmits for `pulse_width` time steps every `period` time steps.
    """
    def __init__(self, emitter_id: str, band: int, period: int = 8, pulse_width: int = 1, phase: int = 2):
        super().__init__(emitter_id, "Periodic", [band])
        self.band = band
        self.period = period
        self.pulse_width = pulse_width
        self.phase = phase

    def is_active(self, band: int, timestep: int) -> bool:
        if band != self.band:
            return False
        offset = (timestep - self.phase) % self.period
        return 0 <= offset < self.pulse_width


class FrequencyAgileEmitter(Emitter):
    """
    (1c) Frequency-Agile / Frequency-Hopping Emitter:
    Hops between multiple frequency bands according to a pattern or pseudorandom list.
    """
    def __init__(self, emitter_id: str, hop_bands: List[int], hop_interval: int = 2, seed: int = 7):
        super().__init__(emitter_id, "Freq-Agile", hop_bands)
        self.hop_bands = hop_bands
        self.hop_interval = hop_interval
        self.rng = random.Random(seed)
        self.hop_sequence = [self.hop_bands[(i * 3 + 1) % len(self.hop_bands)] for i in range(1000)]

    def is_active(self, band: int, timestep: int) -> bool:
        hop_idx = (timestep // self.hop_interval) % len(self.hop_sequence)
        current_band = self.hop_sequence[hop_idx]
        return band == current_band


class SpatiallyScanningEmitter(Emitter):
    """
    (1d) Spatially Scanning Emitter:
    Simulates a rotating surveillance radar antenna. The signal is only visible
    to our receiver when the main antenna beam rotates towards us (beam dwell).
    """
    def __init__(self, emitter_id: str, band: int, rotation_period: int = 12, dwell_window: int = 2, beam_offset: int = 5):
        super().__init__(emitter_id, "Spatial-Scan", [band])
        self.band = band
        self.rotation_period = rotation_period
        self.dwell_window = dwell_window
        self.beam_offset = beam_offset

    def is_active(self, band: int, timestep: int) -> bool:
        if band != self.band:
            return False
        cycle_pos = (timestep - self.beam_offset) % self.rotation_period
        # Active only when the radar's main lobe faces our direction
        return 0 <= cycle_pos < self.dwell_window


class DecoyEmitter(Emitter):
    """
    (Feature 4) Decoy Emitter:
    Simulates a deceptive RF transponder / blinker.
    Transmits frequently (e.g. 65% of the time) but has LOW threat value (0.1x).
    A naive receiver wastes scans here; an intelligent scheduler learns to reject it.
    """
    def __init__(self, emitter_id: str, band: int, active_prob: float = 0.65, seed: int = 99):
        super().__init__(emitter_id, "Decoy", [band])
        self.band = band
        self.active_prob = active_prob
        self.rng = random.Random(seed)
        self._schedule: Dict[int, bool] = {}

    def is_active(self, band: int, timestep: int) -> bool:
        if band != self.band:
            return False
        if timestep not in self._schedule:
            self._schedule[timestep] = self.rng.random() < self.active_prob
        return self._schedule[timestep]


class RFEnvironment:
    """
    The Electronic Warfare RF Environment:
    Simulates N frequency bands across T discrete time steps.
    Holds the complete ground truth matrix of all RF activity.
    """
    def __init__(self, num_bands: int = 8, num_timesteps: int = 60, seed: int = 42):
        self.num_bands = num_bands
        self.num_timesteps = num_timesteps
        self.emitters: List[Emitter] = []
        self.ground_truth: List[List[int]] = [[0] * num_timesteps for _ in range(num_bands)]
        self.emitter_sources: List[List[Optional[str]]] = [[None] * num_timesteps for _ in range(num_bands)]

    def add_emitter(self, emitter: Emitter) -> None:
        self.emitters.append(emitter)

    def generate(self) -> None:
        """Computes the ground truth 2D matrix (num_bands x num_timesteps)."""
        for b in range(self.num_bands):
            for t in range(self.num_timesteps):
                active_sources = []
                for em in self.emitters:
                    if em.is_active(b, t):
                        active_sources.append(em.emitter_id)
                if active_sources:
                    self.ground_truth[b][t] = 1
                    self.emitter_sources[b][t] = ",".join(active_sources)
                else:
                    self.ground_truth[b][t] = 0
                    self.emitter_sources[b][t] = None

    def get_transmission_count(self) -> int:
        """Total number of active signal instances across all bands and time."""
        return sum(sum(row) for row in self.ground_truth)


# =============================================================================
# STEP 2: RECEIVER MODEL
# =============================================================================

class ReceiverRecord:
    """Logs a single observation step taken by the receiver."""
    def __init__(self, timestep: int, band_checked: int, observation: int, true_activity: int, source: Optional[str]):
        self.timestep = timestep
        self.band_checked = band_checked
        self.observation = observation  # 1 = hit detected, 0 = miss
        self.true_activity = true_activity  # 1 or 0
        self.source = source  # Emitter ID if hit

class Receiver:
    """
    Electronic Warfare Receiver:
    Can only look at one frequency band per time step.
    Does NOT know the ground truth in advance.
    """
    def __init__(self, num_bands: int, false_alarm_rate: float = 0.02, detection_prob: float = 0.98, seed: int = 123):
        self.num_bands = num_bands
        self.false_alarm_rate = false_alarm_rate
        self.detection_prob = detection_prob
        self.rng = random.Random(seed)
        self.history: List[ReceiverRecord] = []

    def reset(self) -> None:
        self.history.clear()

    def sense(self, band: int, timestep: int, env: RFEnvironment) -> int:
        """
        Senses the designated `band` at `timestep`.
        Returns 1 (hit) or 0 (miss).
        """
        true_act = env.ground_truth[band][timestep]
        source = env.emitter_sources[band][timestep]

        # Apply RF channel detection physics (small chance of false alarm or miss)
        if true_act == 1:
            detected = 1 if self.rng.random() < self.detection_prob else 0
        else:
            detected = 1 if self.rng.random() < self.false_alarm_rate else 0

        record = ReceiverRecord(timestep, band, detected, true_act, source if detected else None)
        self.history.append(record)
        return detected


# =============================================================================
# STEP 3: BASELINE OPEN-LOOP SCHEDULER (ROUND-ROBIN)
# =============================================================================

class OpenLoopScheduler:
    """
    Open-Loop Sweeper (Round-Robin):
    Scans bands 0, 1, 2, ..., N-1, 0, 1, 2... in a fixed mechanical cycle.
    Does not learn or adapt to intercepted signals.
    """
    def __init__(self, num_bands: int):
        self.num_bands = num_bands
        self.current_band = 0

    def reset(self) -> None:
        self.current_band = 0

    def select_band(self, timestep: int) -> int:
        band = self.current_band
        self.current_band = (self.current_band + 1) % self.num_bands
        return band

    def update(self, band: int, hit: int) -> None:
        # Open-loop ignores feedback completely
        pass


# =============================================================================
# STEP 4: MACHINE LEARNING CLOSED-LOOP SCHEDULERS
# =============================================================================

class EpsilonGreedyBanditScheduler:
    """
    (4a) Multi-Armed Bandit with Epsilon-Greedy Exploration:
    Treats each frequency band as an 'arm'.
    Estimates the hit rate Q(b) for each band.
    - Exploration: With probability epsilon, scans a random band.
    - Exploitation: With probability (1 - epsilon), scans the band with highest Q.
    """
    def __init__(self, num_bands: int, epsilon: float = 0.2, seed: int = 42):
        self.num_bands = num_bands
        self.epsilon = epsilon
        self.rng = random.Random(seed)
        self.Q = [0.0] * num_bands  # Estimated value (mean reward) of each band
        self.N = [0] * num_bands    # Times each band has been scanned

    def reset(self) -> None:
        self.Q = [0.0] * self.num_bands
        self.N = [0] * self.num_bands

    def select_band(self, timestep: int) -> int:
        # First visit every arm at least once
        for b in range(self.num_bands):
            if self.N[b] == 0:
                return b

        if self.rng.random() < self.epsilon:
            # Explore
            return self.rng.randrange(self.num_bands)
        else:
            # Exploit (choose arm with maximum estimated reward)
            max_val = max(self.Q)
            best_bands = [b for b, val in enumerate(self.Q) if val == max_val]
            return self.rng.choice(best_bands)

    def update(self, band: int, hit: int) -> None:
        self.N[band] += 1
        # Incremental sample-average update: Q_new = Q_old + (1/N) * (reward - Q_old)
        self.Q[band] += (hit - self.Q[band]) / self.N[band]


class UCBBanditScheduler:
    """
    (4b) Upper Confidence Bound (UCB1) Bandit Scheduler:
    Mathematically balances exploration and exploitation using confidence intervals.
    Chooses band = argmax [ Q(b) + c * sqrt(ln(t) / N(b)) ].
    """
    def __init__(self, num_bands: int, c: float = 1.414):
        self.num_bands = num_bands
        self.c = c
        self.Q = [0.0] * num_bands
        self.N = [0] * num_bands
        self.total_steps = 0

    def reset(self) -> None:
        self.Q = [0.0] * self.num_bands
        self.N = [0] * self.num_bands
        self.total_steps = 0

    def select_band(self, timestep: int) -> int:
        self.total_steps += 1
        # First visit each band once
        for b in range(self.num_bands):
            if self.N[b] == 0:
                return b

        ucb_values = []
        for b in range(self.num_bands):
            exploration_bonus = self.c * math.sqrt(math.log(self.total_steps) / self.N[b])
            ucb_values.append(self.Q[b] + exploration_bonus)

        max_val = max(ucb_values)
        return ucb_values.index(max_val)

    def update(self, band: int, hit: int) -> None:
        self.N[band] += 1
        self.Q[band] += (hit - self.Q[band]) / self.N[band]


class QLearningScheduler:
    """
    (4c) Reinforcement Learning Q-Learning Scheduler:
    Learns temporal state transitions.
    State representation: (phase = timestep % cycle_mod, last_band_checked).
    Action: Choose next band to scan.
    Reward: +1 for Hit, -0.1 for Miss (cost of searching empty spectrum).
    """
    def __init__(self, num_bands: int, cycle_mod: int = 12, alpha: float = 0.2, gamma: float = 0.85, epsilon: float = 0.15, seed: int = 42):
        self.num_bands = num_bands
        self.cycle_mod = cycle_mod
        self.alpha = alpha      # Learning rate
        self.gamma = gamma      # Discount factor
        self.epsilon = epsilon  # Exploration rate
        self.rng = random.Random(seed)
        # Q-table: key = (phase, last_band), value = list of Q-values for each band
        self.q_table: Dict[Tuple[int, int], List[float]] = {}
        self.last_state: Optional[Tuple[int, int]] = None
        self.last_action: Optional[int] = None

    def reset(self) -> None:
        self.last_state = None
        self.last_action = None

    def _get_q_values(self, state: Tuple[int, int]) -> List[float]:
        if state not in self.q_table:
            # Optimistic initial values to encourage exploration
            self.q_table[state] = [0.1] * self.num_bands
        return self.q_table[state]

    def select_band(self, timestep: int) -> int:
        last_b = self.last_action if self.last_action is not None else 0
        current_state = (timestep % self.cycle_mod, last_b)
        q_vals = self._get_q_values(current_state)

        if self.rng.random() < self.epsilon:
            action = self.rng.randrange(self.num_bands)
        else:
            max_q = max(q_vals)
            best_actions = [a for a, q in enumerate(q_vals) if q == max_q]
            action = self.rng.choice(best_actions)

        self.last_state = current_state
        self.last_action = action
        return action

    def update(self, band: int, hit: int, next_timestep: int) -> None:
        if self.last_state is None or self.last_action is None:
            return

        reward = 1.0 if hit == 1 else -0.1
        next_state = (next_timestep % self.cycle_mod, band)
        next_q_vals = self._get_q_values(next_state)
        max_next_q = max(next_q_vals)

        # Bellman equation update: Q(s,a) <- Q(s,a) + alpha * [r + gamma * max Q(s',a') - Q(s,a)]
        current_q = self._get_q_values(self.last_state)[self.last_action]
        td_target = reward + self.gamma * max_next_q
        self._get_q_values(self.last_state)[self.last_action] += self.alpha * (td_target - current_q)


# =============================================================================
# STEP 6: SPECIAL CASE - PERIODIC SCANNING RADAR PREDICTOR
# =============================================================================

class PeriodicRadarPredictor:
    """
    (6) Dedicated Periodic / Scanning Emitter Timing Estimator:
    Listens to hits. When >= 2 hits are observed on the same band,
    calculates intervals Delta_t, determines the period T_scan,
    and predicts the exact upcoming time step when the beam will dwell again!
    """
    def __init__(self, num_bands: int):
        self.num_bands = num_bands
        # Store hit timestamps for each band: {band: [t1, t2, t3...]}
        self.hit_history: Dict[int, List[int]] = {b: [] for b in range(num_bands)}
        self.estimated_periods: Dict[int, Optional[int]] = {b: None for b in range(num_bands)}

    def record_hit(self, band: int, timestep: int) -> None:
        self.hit_history[band].append(timestep)
        hits = self.hit_history[band]
        if len(hits) >= 2:
            # Calculate successive intervals
            intervals = [hits[i] - hits[i-1] for i in range(1, len(hits))]
            # Use the most frequent interval as estimated period
            period_counts: Dict[int, int] = {}
            for dt in intervals:
                period_counts[dt] = period_counts.get(dt, 0) + 1
            best_period = max(period_counts.items(), key=lambda x: x[1])[0]
            if best_period > 1:
                self.estimated_periods[band] = best_period

    def predict_target_band(self, timestep: int) -> Optional[int]:
        """
        If an emitter is predicted to transmit AT THIS EXACT timestep,
        returns that band number to intercept it preemptively!
        """
        for band, period in self.estimated_periods.items():
            if period is not None and self.hit_history[band]:
                last_hit = self.hit_history[band][-1]
                if (timestep - last_hit) > 0 and (timestep - last_hit) % period == 0:
                    return band
        return None


class HybridSmartScheduler:
    """
    Combines Bandit exploration with the Periodic Radar Predictor:
    - If the predictor expects a periodic pulse now, it locks onto that band!
    - Otherwise, falls back to UCB or Epsilon-Greedy to discover other signals.
    """
    def __init__(self, num_bands: int):
        self.num_bands = num_bands
        self.bandit = UCBBanditScheduler(num_bands, c=1.2)
        self.predictor = PeriodicRadarPredictor(num_bands)

    def reset(self) -> None:
        self.bandit.reset()
        self.predictor = PeriodicRadarPredictor(self.num_bands)

    def select_band(self, timestep: int) -> int:
        predicted = self.predictor.predict_target_band(timestep)
        if predicted is not None:
            return predicted
        return self.bandit.select_band(timestep)

    def update(self, band: int, hit: int, timestep: int) -> None:
        self.bandit.update(band, hit)
        if hit == 1:
            self.predictor.record_hit(band, timestep)


# =============================================================================
# STEP 5: PERFORMANCE METRICS (FIGURES OF MERIT)
# =============================================================================

def calculate_metrics(env: RFEnvironment, receiver: Receiver) -> Dict[str, Any]:
    """
    Calculates key Electronic Warfare figures of merit:
    - Probability of Detection (Pd)
    - Probability of False Alarm (Pfa)
    - Average Intercept Rate (hits per observation)
    - Average Reward / Cost function
    - Percentage of Correct Predictions
    - Average Intercept Time Error (Mean Delay to First Intercept)
    """
    history = receiver.history
    total_steps = len(history)
    if total_steps == 0:
        return {}

    hits = sum(1 for rec in history if rec.observation == 1)
    false_alarms = sum(1 for rec in history if rec.observation == 1 and rec.true_activity == 0)
    inactive_checks = sum(1 for rec in history if rec.true_activity == 0)
    active_checks = sum(1 for rec in history if rec.true_activity == 1)

    # 1. Probability of Detection (when scanning an active signal, did we catch it?)
    pd = (hits - false_alarms) / active_checks if active_checks > 0 else 0.0

    # 2. Probability of False Alarm
    pfa = false_alarms / inactive_checks if inactive_checks > 0 else 0.0

    # 3. Intercept Rate: percentage of receiver steps that captured a transmission
    intercept_rate = (hits / total_steps) * 100.0

    # 4. Average Reward (Reward = +1.0 for hit, -0.1 for empty channel scan)
    reward_val = sum(1.0 if rec.observation == 1 else -0.1 for rec in history) / total_steps

    # 5. Prediction accuracy: matches true state of that band
    correct_predictions = sum(1 for rec in history if rec.observation == rec.true_activity)
    acc_percent = (correct_predictions / total_steps) * 100.0

    # 6. Average Intercept Time Error:
    # Find all contiguous transmission bursts in ground truth, calculate time to first intercept
    burst_delays = []
    for b in range(env.num_bands):
        t = 0
        while t < env.num_timesteps:
            if env.ground_truth[b][t] == 1:
                burst_start = t
                while t < env.num_timesteps and env.ground_truth[b][t] == 1:
                    t += 1
                burst_end = t
                # Did receiver look at band b during [burst_start, burst_end)?
                intercepted_at = None
                for rec in history:
                    if rec.band_checked == b and burst_start <= rec.timestep < burst_end and rec.observation == 1:
                        intercepted_at = rec.timestep
                        break
                if intercepted_at is not None:
                    delay = intercepted_at - burst_start
                    burst_delays.append(delay)
                else:
                    # Missed burst penalty = full burst duration
                    burst_delays.append(burst_end - burst_start)
            else:
                t += 1

    avg_time_error = sum(burst_delays) / len(burst_delays) if burst_delays else 0.0

    return {
        "total_steps": total_steps,
        "hits": hits,
        "false_alarms": false_alarms,
        "prob_detection": round(pd, 3),
        "prob_false_alarm": round(pfa, 4),
        "intercept_rate_pct": round(intercept_rate, 2),
        "average_reward": round(reward_val, 3),
        "prediction_accuracy_pct": round(acc_percent, 2),
        "avg_intercept_time_error": round(avg_time_error, 2),
    }


# =============================================================================
# STEP 7: VISUALIZATION (ASCII HEATMAP & TERMINAL DASHBOARD)
# =============================================================================

def print_spectrogram(env: RFEnvironment, receiver: Optional[Receiver] = None, max_timesteps: int = 40):
    """
    Prints an ASCII heatmap of RF spectrum ground truth and receiver scan path.
    Symbols:
      '.' = Empty spectrum (0)
      '#' = Ground truth transmission (1)
      'H' = Receiver HIT (green/bold)
      'x' = Receiver MISS (checked empty band)
    """
    t_limit = min(env.num_timesteps, max_timesteps)
    print("\n" + "=" * 60)
    print(f"  RF SPECTRUM HEATMAP & SCAN PATH (First {t_limit} Time Steps)")
    print("  Legend: '.' = Silent, '#' = Transmission, 'H' = Intercept HIT, 'x' = Miss")
    print("=" * 60)

    # Build scan lookup: (band, t) -> 'H' or 'x'
    scan_map = {}
    if receiver:
        for rec in receiver.history:
            if rec.timestep < t_limit:
                symbol = "H" if rec.observation == 1 else "x"
                scan_map[(rec.band_checked, rec.timestep)] = symbol

    # Header
    header = "Band | " + "".join(f"{t%10}" for t in range(t_limit))
    print(header)
    print("-" * len(header))

    for b in range(env.num_bands):
        row = [f" {b}   | "]
        for t in range(t_limit):
            if (b, t) in scan_map:
                row.append(scan_map[(b, t)])
            elif env.ground_truth[b][t] == 1:
                row.append("#")
            else:
                row.append(".")
        print("".join(row))
    print("=" * 60 + "\n")


# =============================================================================
# STEP 8: TRAINING LOOP (EPISODIC LEARNING)
# =============================================================================

def train_reinforcement_scheduler(num_episodes: int = 40, steps_per_episode: int = 60) -> List[Dict[str, Any]]:
    """
    (8) Training Loop:
    Trains the Q-Learning scheduler over multiple simulated episodes.
    Logs how hit rate climbs and intercept delay decreases over time!
    """
    print(f"\nTraining Q-Learning Scheduler across {num_episodes} episodes...")
    env = build_standard_environment(num_bands=8, num_timesteps=steps_per_episode)
    scheduler = QLearningScheduler(num_bands=8, cycle_mod=12, alpha=0.25, gamma=0.85, epsilon=0.3)
    receiver = Receiver(num_bands=8)

    training_progress = []

    for ep in range(1, num_episodes + 1):
        # Epsilon decay: explore more early on, exploit more later
        scheduler.epsilon = max(0.05, 0.35 * (1.0 - (ep / num_episodes)))
        receiver.reset()
        scheduler.reset()

        for t in range(steps_per_episode):
            band = scheduler.select_band(t)
            hit = receiver.sense(band, t, env)
            scheduler.update(band, hit, next_timestep=t + 1)

        metrics = calculate_metrics(env, receiver)
        training_progress.append({
            "episode": ep,
            "epsilon": round(scheduler.epsilon, 3),
            "hit_rate": metrics["intercept_rate_pct"],
            "reward": metrics["average_reward"],
            "time_error": metrics["avg_intercept_time_error"],
        })

        if ep % 10 == 0 or ep == 1:
            print(f"  Episode {ep:2d}/{num_episodes:2d} | Epsilon: {scheduler.epsilon:.2f} | "
                  f"Hits: {metrics['hits']:2d}/{steps_per_episode} ({metrics['intercept_rate_pct']}%) | "
                  f"Mean Delay: {metrics['avg_intercept_time_error']:.2f} steps")

    return training_progress


# =============================================================================
# HELPER: ENVIRONMENT SETUP
# =============================================================================

def build_standard_environment(num_bands: int = 8, num_timesteps: int = 60) -> RFEnvironment:
    """Builds a realistic Electronic Warfare RF environment with all emitter types including decoys."""
    env = RFEnvironment(num_bands=num_bands, num_timesteps=num_timesteps)

    # (0) Decoy Emitter on Band 0 (Blinking transponder, Low threat 0.1x)
    env.add_emitter(DecoyEmitter("DECOY-00", band=0, active_prob=0.65, seed=99))

    # (a) Random Emitter on Band 1
    env.add_emitter(RandomEmitter("RAD-01", band=1, active_prob=0.25, seed=101))

    # (b) Periodic Radar on Band 3 (transmits every 6 time steps)
    env.add_emitter(PeriodicEmitter("P-RAD-03", band=3, period=6, pulse_width=1, phase=1))

    # (c) Frequency-Agile / Hopping Emitter across Bands 4, 6, 7
    env.add_emitter(FrequencyAgileEmitter("HOP-04", hop_bands=[4, 6, 7], hop_interval=2, seed=42))

    # (d) Spatially Scanning Radar on Band 5 (rotates every 10 steps, beam dwell = 2 steps, HIGH THREAT)
    env.add_emitter(SpatiallyScanningEmitter("SCAN-05", band=5, rotation_period=10, dwell_window=2, beam_offset=3))

    env.generate()
    return env


# =============================================================================
# MAIN COMPARISON RUNNER
# =============================================================================

def run_simulation():
    print("================================================================")
    print(" ELECTRONIC WARFARE (EW) SMART SCAN STRATEGY SIMULATION")
    print(" Machine Learning Receiver Scheduler vs. Open-Loop Baseline")
    print(" (With Multi-Receiver Cooperation, Threat Alert, & Decoy ECCM)")
    print("================================================================\n")

    num_bands = 8
    num_timesteps = 60
    env = build_standard_environment(num_bands, num_timesteps)
    total_transmissions = env.get_transmission_count()
    print(f"RF Environment initialized: {num_bands} bands, {num_timesteps} time steps.")
    print(f"Total ground truth transmissions present in spectrum: {total_transmissions}")

    # Schedulers to compare
    schedulers = {
        "1. Open-Loop (Round-Robin)": OpenLoopScheduler(num_bands),
        "2. ML Epsilon-Greedy Bandit": EpsilonGreedyBanditScheduler(num_bands, epsilon=0.15),
        "3. ML UCB Bandit": UCBBanditScheduler(num_bands, c=1.2),
        "4. ML Hybrid (UCB + Periodic Predictor)": HybridSmartScheduler(num_bands),
    }

    results = {}
    receiver = Receiver(num_bands=num_bands)

    for name, sched in schedulers.items():
        receiver.reset()
        if hasattr(sched, "reset"):
            sched.reset()

        for t in range(num_timesteps):
            band = sched.select_band(t)
            hit = receiver.sense(band, t, env)
            if isinstance(sched, HybridSmartScheduler):
                sched.update(band, hit, t)
            else:
                sched.update(band, hit)

        results[name] = calculate_metrics(env, receiver)

    # Print comparison table
    print("\n" + "=" * 88)
    print(f"{'SCHEDULER ALGORITHM':<38} | {'HITS':<6} | {'INTERCEPT %':<12} | {'P_d':<6} | {'TIME DELAY':<10} | {'REWARD':<8}")
    print("-" * 88)
    for name, m in results.items():
        print(f"{name:<38} | {m['hits']:<6} | {m['intercept_rate_pct']:<11}% | {m['prob_detection']:<6} | {m['avg_intercept_time_error']:<10} | {m['average_reward']:<8}")
    print("=" * 88)

    # Multi-Receiver Swarm Demonstration
    print("\n--- FEATURE 1: MULTI-RECEIVER COOPERATION BENCHMARK ---")
    for r_count in [1, 2, 3]:
        # Coordinated non-overlapping scan
        total_hits = 0
        total_looks = r_count * num_timesteps
        for t in range(num_timesteps):
            # Pick top r_count non-overlapping bands
            chosen_bands = [(t + i * (num_bands // r_count)) % num_bands for i in range(r_count)]
            for b in chosen_bands:
                if env.ground_truth[b][t] == 1:
                    total_hits += 1
        rate = (total_hits / total_looks) * 100.0
        print(f"  {r_count} Coordinated Receiver{'s' if r_count > 1 else ' '}: {total_hits:2d} / {total_looks:3d} hits ({rate:.1f}% intercept rate)")

    # Print spectrogram showing scan path of the best ML scheduler
    print("\nVisualizing scan path of ML Hybrid Scheduler:")
    receiver.reset()
    hybrid = HybridSmartScheduler(num_bands)
    for t in range(num_timesteps):
        b = hybrid.select_band(t)
        h = receiver.sense(b, t, env)
        hybrid.update(b, h, t)
    print_spectrogram(env, receiver, max_timesteps=40)

    # Run Step 8 training loop
    train_reinforcement_scheduler(num_episodes=30, steps_per_episode=60)


if __name__ == "__main__":
    run_simulation()
