/**
 * Electronic Warfare (EW) Simulation & ML Scheduler Types
 */

export type EmitterType = 'Random' | 'Periodic' | 'Freq-Agile' | 'Spatial-Scan' | 'Decoy';

export type ThreatLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type AdversaryMode = 'static' | 'jitter' | 'cognitive_evasion';

export interface EmitterConfig {
  id: string;
  name: string;
  type: EmitterType;
  bands: number[];
  color: string;
  threatLevel: ThreatLevel;
  threatWeight: number; // e.g., HIGH = 3.0, MEDIUM = 1.5, LOW = 0.5, DECOY = 0.1
  activeProb?: number;  // for random / decoy
  period?: number;      // for periodic
  pulseWidth?: number;  // for periodic
  phase?: number;       // for periodic
  hopInterval?: number; // for agile
  hopBands?: number[];  // for agile
  rotationPeriod?: number; // for spatial scan
  dwellWindow?: number;    // for spatial scan
  isDecoy?: boolean;
}

export type SchedulerType = 
  | 'open_loop' 
  | 'epsilon_greedy' 
  | 'ucb' 
  | 'q_learning' 
  | 'hybrid_predictor';

export interface ReceiverDecisionFactor {
  band: number;
  receiverId: number;
  chosen: boolean;
  historicalHitRate: number;    // 0 - 100
  periodicConfidence: number;   // 0 - 100
  threatScore: number;          // 0 - 100
  explorationBonus: number;     // 0 - 100
  decoyPenalty: number;         // 0 - 100
  compositeScore: number;       // Final weighted ranking score
  reason: string;               // Plain-English explanation
}

export interface ReceiverObservation {
  timestep: number;
  band: number;
  receiverId: number; // 1, 2, or 3
  hit: 0 | 1;
  trueActivity: 0 | 1;
  emitterId?: string;
  emitterType?: EmitterType;
  threatLevel?: ThreatLevel;
  explanation?: ReceiverDecisionFactor;
}

export interface SmartCatchRecord {
  id: string;
  timestep: number;
  band: number;
  receiverId: number;
  emitterId?: string;
  emitterType?: EmitterType;
  emitterFriendlyName: string;
  threatLevel: ThreatLevel;
  headline: string;
  explanation: string;
  catchType: 'rhythm' | 'jumping' | 'hostile_scan' | 'predictive';
  confidencePct: number;
  timestamp: number;
}

export interface SimulationMetrics {
  schedulerId: SchedulerType;
  schedulerName: string;
  numReceivers: number;
  totalSteps: number;
  totalScanOpportunities: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  highThreatHits: number;
  decoyHits: number;
  probDetection: number;        // Pd: 0.0 - 1.0
  probFalseAlarm: number;       // Pfa: 0.0 - 1.0
  interceptRatePct: number;     // % of receiver looks that intercepted a signal
  averageReward: number;        // Threat-weighted reward per step
  predictionAccuracyPct: number;// % match
  avgInterceptTimeError: number;// Mean latency (in steps)
  threatWeightedHits?: number;  // Cumulative threat-weighted return points
  history: ReceiverObservation[];
}

export interface TrainingEpisodeRecord {
  episode: number;
  epsilon: number;
  hits: number;
  hitRatePct: number;
  averageReward: number;
  avgTimeError: number;
  decoyAttentionPct: number; // Percentage of scans wasted on decoy
  highThreatCatchRatePct: number;
}

export interface MultiReceiverComparisonItem {
  numReceivers: number;
  hits: number;
  interceptRatePct: number;
  highThreatHits: number;
  spectrumCoveragePct: number;
  avgDelay: number;
}

export interface DuelEvent {
  id: string;
  timestep: number;
  type: 'red_evasion' | 'red_jitter' | 'red_lpi' | 'blue_reacquire' | 'blue_predict' | 'blue_miss';
  actor: 'RED' | 'BLUE';
  title: string;
  detail: string;
  fromBand?: number;
  toBand?: number;
  jitterOffset?: number; // e.g. -1, +1, +2
  receiverId?: number;
}

export interface PulseTrainItem {
  timestep: number;
  nominalPulse: boolean;
  actualPulse: boolean;
  jitterOffset: number;
  nominalPeriod: number;
  band: number;
  interceptedBy: number | null; // receiverId or null
  evaded: boolean;
  evacuationTrigger?: boolean;
}

export interface AdversarialDuelMetrics {
  adversaryMode: AdversaryMode;
  totalTransmissions: number;
  blueIntercepts: number;
  redCleanPulses: number; // pulses transmitted that avoided detection
  blueInterceptRatePct: number;
  redEvasionRatePct: number;
  totalEvasions: number;
  avgReacquisitionTime: number; // in timesteps
  activeLockState: 'LOCKED' | 'TRACKING' | 'EVADED' | 'SEARCHING';
  duelEvents: DuelEvent[];
  pulseTrainHistory: PulseTrainItem[];
}

