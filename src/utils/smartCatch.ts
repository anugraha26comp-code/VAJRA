import { ReceiverObservation, SmartCatchRecord, SchedulerType, ThreatLevel } from '../types';

/**
 * Play a gentle, rewarding synthetic success chime using the Web Audio API.
 * Uses pure harmonic sine/triangle tones without requiring external media assets.
 */
export function playSmartCatchChime(muted: boolean = false): void {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Harmonic arpeggio (C6 -> G6)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now); // C6
    osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12); // G6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now + 0.05); // E6
    osc2.frequency.exponentialRampToValueAtTime(2093.0, now + 0.16); // C7

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch {
    // Graceful fallback if audio autoplay policy prevents playback
  }
}

/**
 * Evaluates whether a receiver observation represents a "Notable / Smart" catch.
 * 
 * Rules:
 * 1. Must be an actual interception (hit === 1).
 * 2. Emitters like Periodic (P-RAD-03), Frequency-Agile (HOP-04), or Spatial-Scan (SCAN-05)
 *    demonstrate the AI scheduler's smart pattern learning.
 * 3. Or the scheduler estimated a high confidence / composite score before checking.
 */
export function detectSmartCatch(
  obs: ReceiverObservation,
  schedulerId: SchedulerType = 'hybrid_predictor'
): SmartCatchRecord | null {
  if (obs.hit !== 1) return null;

  const emitterType = obs.emitterType;
  const emitterId = obs.emitterId || '';
  const threatLevel: ThreatLevel = obs.threatLevel || 'LOW';
  const confidence = obs.explanation?.compositeScore ?? 65;

  // 1. Periodic Radar rhythm catch (P-RAD-03)
  if (emitterType === 'Periodic' || emitterId.includes('P-RAD') || obs.band === 3) {
    return {
      id: `catch-${obs.timestep}-${obs.band}-${obs.receiverId}`,
      timestep: obs.timestep,
      band: obs.band,
      receiverId: obs.receiverId,
      emitterId: obs.emitterId,
      emitterType: 'Periodic',
      emitterFriendlyName: 'Steady Rhythm Radar',
      threatLevel,
      headline: '🎯 Caught it right on beat!',
      explanation: "The AI learned this radar's repeating rhythm and intercepted it the exact instant it pulsed.",
      catchType: 'rhythm',
      confidencePct: Math.min(99, Math.max(75, Math.round(obs.explanation?.periodicConfidence || 92))),
      timestamp: Date.now(),
    };
  }

  // 2. Frequency-Agile jumping catch (HOP-04)
  if (emitterType === 'Freq-Agile' || emitterId.includes('HOP') || [4, 6, 7].includes(obs.band)) {
    return {
      id: `catch-${obs.timestep}-${obs.band}-${obs.receiverId}`,
      timestep: obs.timestep,
      band: obs.band,
      receiverId: obs.receiverId,
      emitterId: obs.emitterId,
      emitterType: 'Freq-Agile',
      emitterFriendlyName: 'Jumping Frequency Link',
      threatLevel,
      headline: '🎯 Tracked down the jumping signal!',
      explanation: 'This hostile signal keeps jumping across channels, but the AI anticipated its move and intercepted it!',
      catchType: 'jumping',
      confidencePct: Math.min(98, Math.max(68, Math.round(confidence))),
      timestamp: Date.now(),
    };
  }

  // 3. Spatial-Scan hostile radar sweep (SCAN-05)
  if (emitterType === 'Spatial-Scan' || emitterId.includes('SCAN') || obs.band === 5) {
    return {
      id: `catch-${obs.timestep}-${obs.band}-${obs.receiverId}`,
      timestep: obs.timestep,
      band: obs.band,
      receiverId: obs.receiverId,
      emitterId: obs.emitterId,
      emitterType: 'Spatial-Scan',
      emitterFriendlyName: 'Hostile Rotating Radar',
      threatLevel: 'HIGH',
      headline: '🎯 Hostile Radar Sweep Intercepted!',
      explanation: 'The AI predicted where this rotating tracking radar was aiming and caught its beam in real time.',
      catchType: 'hostile_scan',
      confidencePct: Math.min(96, Math.max(70, Math.round(confidence))),
      timestamp: Date.now(),
    };
  }

  // 4. High-confidence predictive hit (for other signals targeted deliberately by ML)
  if (schedulerId !== 'open_loop' && (obs.explanation?.compositeScore ?? 0) >= 55) {
    return {
      id: `catch-${obs.timestep}-${obs.band}-${obs.receiverId}`,
      timestep: obs.timestep,
      band: obs.band,
      receiverId: obs.receiverId,
      emitterId: obs.emitterId,
      emitterType: obs.emitterType,
      emitterFriendlyName: 'Targeted Signal',
      threatLevel,
      headline: '🎯 The AI predicted this signal — and was right!',
      explanation: `The AI calculated high probability on Band ${obs.band} before checking, resulting in a successful intercept.`,
      catchType: 'predictive',
      confidencePct: Math.min(95, Math.max(60, Math.round(obs.explanation?.compositeScore || 70))),
      timestamp: Date.now(),
    };
  }

  return null;
}
