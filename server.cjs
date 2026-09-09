var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
import_dotenv.default.config();
var PORT = 3e3;
var genAIClient = null;
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return genAIClient;
}
function generateTacticalFallbackAssessment(spectrumData) {
  const {
    currentStep = 0,
    activeEmitters = [],
    bandActivity = [],
    receiverInterceptions = [],
    scheduler = "Threat-Aware Hybrid",
    metrics = {}
  } = spectrumData || {};
  const hasBand5 = bandActivity.includes(5) || activeEmitters.some((e) => e.bands?.includes(5) || e.name?.toLowerCase().includes("acquisition") || e.name?.toLowerCase().includes("fire control"));
  const hasBand6 = bandActivity.includes(6) || activeEmitters.some((e) => e.bands?.includes(6) || e.name?.toLowerCase().includes("jam"));
  const hasHopper = bandActivity.some((b) => [4, 7].includes(b)) || activeEmitters.some((e) => e.type === "Freq-Agile" || e.name?.toLowerCase().includes("agile"));
  const hasDecoy = bandActivity.includes(0) || activeEmitters.some((e) => e.bands?.includes(0) || e.isDecoy || e.name?.toLowerCase().includes("decoy"));
  const hasSearch = bandActivity.includes(3) || bandActivity.includes(1) || bandActivity.includes(2);
  let classification = "Multirole Tactical EW Grid (Surveillance & Agile Comms)";
  let threatLevel = "HIGH";
  let threatConfidence = 91;
  let doctrine = "Adversary forces coordinating tactical movements via rapid pseudo-random frequency shifts and sector sweeps.";
  let primaryIntent = "Search";
  let searchScore = hasSearch ? 85 : 35;
  let targetAcquisitionScore = hasBand5 ? 94 : 20;
  let jammingScore = hasBand6 ? 88 : 15;
  let decoyScore = hasDecoy ? 92 : 10;
  if (hasBand5) {
    classification = "Hostile X-Band Phased-Array Fire Control & Target Acquisition Radar";
    threatLevel = "CRITICAL";
    threatConfidence = 96;
    primaryIntent = "Target Acquisition";
    doctrine = "Adversary fire-control monopulse radar tracking prioritized vectors; immediate receiver dwell lock mandatory.";
  } else if (hasBand6) {
    classification = "Active High-Power Electronic Attack (Barricade Noise / DRFM Jammer)";
    threatLevel = "HIGH";
    threatConfidence = 90;
    primaryIntent = "Jamming";
    doctrine = "Adversary attempting broadband noise saturation to obscure agile command transmissions.";
  } else if (hasHopper) {
    classification = "Tactical Frequency-Agile Military Communications & Command Net";
    threatLevel = "ELEVATED";
    threatConfidence = 87;
    primaryIntent = "Tactical Communications";
    doctrine = "Adversary units executing pseudo-random channel transitions across Bands 4, 6, 7 to evade electronic surveillance.";
  } else if (hasDecoy) {
    classification = "Active Deceptive RF Decoy Beacon (Duty-Cycle Saturation Lure)";
    threatLevel = "ROUTINE";
    threatConfidence = 93;
    primaryIntent = "Decoy Deception";
    doctrine = "Adversary attempting to saturate blue receiver dwell time with high-repetition non-threat transponder bursts.";
  }
  const threatMatrix = [
    {
      band: 5,
      emitterName: "SCAN-05 Fire Control Radar",
      threatPriority: hasBand5 ? "CRITICAL" : "ROUTINE",
      intent: "Target Acquisition",
      frequencyGhz: "10.5 GHz (X-Band)",
      waveformType: "Monopulse Pulse-Doppler",
      prfPri: "3.2 kHz PRF / 312 \xB5s PRI",
      dutyCyclePct: hasBand5 ? 42 : 0,
      killChainStage: hasBand5 ? "Weapon Guidance / Track Lock" : "Inactive Standby",
      tacticalAction: "Lock primary harmonic dwell window; synchronize look gate with antenna rotation."
    },
    {
      band: 6,
      emitterName: "JAM-06 Barrage Noise Jammer",
      threatPriority: hasBand6 ? "HIGH" : "ROUTINE",
      intent: "Jamming",
      frequencyGhz: "12.0 GHz (Ku-Band)",
      waveformType: "Continuous Wave / Gaussian Noise",
      prfPri: "Continuous (CW)",
      dutyCyclePct: hasBand6 ? 78 : 0,
      killChainStage: hasBand6 ? "Electromagnetic Spectrum Denial" : "Standby",
      tacticalAction: "Apply digital notch filtering; redirect secondary receiver to unjammed adjacent bands."
    },
    {
      band: 4,
      emitterName: "HOP-04 Tactical Agile Datalink",
      threatPriority: hasHopper ? "ELEVATED" : "ROUTINE",
      intent: "Tactical Communications",
      frequencyGhz: "9.4 GHz (X-Band)",
      waveformType: "Fast Frequency Shift Keying (FFSK)",
      prfPri: "Agile Burst (120 hops/s)",
      dutyCyclePct: hasHopper ? 35 : 0,
      killChainStage: "C2 Tactical Coordination",
      tacticalAction: "Deploy Markov transition probability predictor to intercept next hop band."
    },
    {
      band: 3,
      emitterName: "SRV-03 Periodic Early Warning Radar",
      threatPriority: hasSearch ? "ELEVATED" : "ROUTINE",
      intent: "Search",
      frequencyGhz: "8.2 GHz (X-Band)",
      waveformType: "Linear FM Chirp Sweep",
      prfPri: "650 Hz PRF / 1538 \xB5s PRI",
      dutyCyclePct: hasSearch ? 28 : 0,
      killChainStage: "Wide-Area Sector Search",
      tacticalAction: "Schedule periodic look gates synchronized to 6-step antenna rotation cycle."
    },
    {
      band: 0,
      emitterName: "DECOY-00 Blinking RF Transponder",
      threatPriority: "ROUTINE",
      intent: "Decoy Deception",
      frequencyGhz: "2.1 GHz (S-Band)",
      waveformType: "High-Repetition Square Beacon",
      prfPri: "5.0 kHz PRF / Non-Threat",
      dutyCyclePct: hasDecoy ? 65 : 0,
      killChainStage: "EW Dwell Depletion / Diversion",
      tacticalAction: "Enforce dwell suppression penalty (<5% budget) to prevent receiver saturation."
    }
  ];
  const recommendedReceiverActions = [
    {
      action: hasBand5 ? "Prioritize Band 5 Harmonic Dwell Allocation" : "Maintain Balanced Multi-Band Surveillance",
      priority: hasBand5 ? "CRITICAL" : "HIGH",
      targetBand: hasBand5 ? 5 : 3,
      rationale: hasBand5 ? "Adversary fire control radar active in Band 5. Maintain >60% intercept rate to satisfy early warning requirements." : "Adversary in search phase. Allocate dwells across Bands 1-3 to detect initial illumination."
    },
    {
      action: "Apply Decoy Resistance Penalty Filter on Band 0",
      priority: "HIGH",
      targetBand: 0,
      rationale: "Active transponder on Band 0 is a verified diversionary lure. Suppress dwell budget to preserve cycle time."
    },
    {
      action: "Engage Jitter-Tolerant Look Gates on Agile Emitters",
      priority: "MEDIUM",
      targetBand: 4,
      rationale: "Adversary pulse repetition intervals exhibit \xB125% intentional jitter to break naive time-of-arrival correlation."
    }
  ];
  const automatedDebrief = {
    headline: hasBand5 ? "CRITICAL ALERT: Hostile X-Band Fire Control Lock in Progress" : hasBand6 ? "ELEVATED EW: Active Noise Jamming Detected in Band 6" : "TACTICAL PATROL: Agile Communications & Periodic Surveillance Net",
    executiveSummary: `At simulation step ${currentStep}, spectrum activity reveals ${bandActivity.length} active bands. Cognitive scheduler (${scheduler}) achieves ${metrics.interceptRatePct ?? 82}% intercept efficiency across ${metrics.hits ?? 0} total intercepts, with ${metrics.highThreatHits ?? 0} hostile acquisitions recorded.`,
    operationalRisk: hasBand5 ? "SEVERE" : hasBand6 ? "ELEVATED" : "MODERATE",
    interceptionEfficiencyGrade: `${metrics.interceptRatePct ?? 85 >= 85 ? "A" : metrics.interceptRatePct ?? 85 >= 70 ? "B+" : "C"} (${metrics.interceptRatePct ?? 85}%)`,
    nextDwellProtocol: hasBand5 ? "Emergency lock: Reassign Receiver 1 & 2 to synchronized Band 5 interleaving." : "Standard threat-aware patrol: 50% search, 35% agile tracking, 15% exploration."
  };
  const recommendations = [
    "Lock primary receiver dwell window to Band 5 harmonic frequency.",
    "Deploy Markov transition anti-evasion forecasting for Band 4/7 hopping.",
    "Deprioritize Band 0 to prevent decoy entrapment."
  ];
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    timestep: currentStep,
    classification,
    threatLevel,
    threatConfidence,
    intentAssessment: {
      primaryIntent,
      searchScore,
      targetAcquisitionScore,
      jammingScore,
      decoyScore,
      assessmentRationale: `Dominant RF spectral density and pulse repetition patterns indicate ${primaryIntent.toLowerCase()} as the adversary's primary tactical goal.`
    },
    threatMatrix,
    recommendedReceiverActions,
    automatedDebrief,
    doctrine,
    recommendations,
    tacticalAdvisory: hasBand5 ? "HOSTILE WEAPON ILLUMINATION ACTIVE ON BAND 5. ENGAGE MAXIMUM RECEIVER SENSOR DWELL." : "MAINTAIN THREAT-AWARE SCAN CYCLES. DECOY FILTERING ENGAGED.",
    isSimulatedFallback: true
  };
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  const analysisCache = /* @__PURE__ */ new Map();
  let rateLimitBackoffUntil = 0;
  let lastGeminiCallTime = 0;
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "VAJRA EW Intelligence Engine",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      rateLimitCooldownSeconds: Math.max(0, Math.round((rateLimitBackoffUntil - Date.now()) / 1e3)),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/elint/analyze", async (req, res) => {
    try {
      const spectrumData = req.body || {};
      const step = spectrumData.currentStep ?? 0;
      const sched = spectrumData.scheduler || "default";
      const bands = (spectrumData.bandActivity || []).slice().sort().join(",");
      const cacheKey = `${step}_${sched}_${bands}`;
      const cached = analysisCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 6e5) {
        res.json(cached.report);
        return;
      }
      const now = Date.now();
      const ai = getGenAI();
      if (!ai || now < rateLimitBackoffUntil || now - lastGeminiCallTime < 8e3) {
        const fallback = {
          ...generateTacticalFallbackAssessment(spectrumData),
          isSimulatedFallback: true,
          quotaPreserved: true
        };
        analysisCache.set(cacheKey, { report: fallback, timestamp: now });
        res.json(fallback);
        return;
      }
      const prompt = `You are the Senior ELINT/SIGINT Electronic Warfare Intelligence Officer on duty aboard the VAJRA cognitive receiver platform.
Analyze this instantaneous tactical RF spectrum surveillance snapshot:
- Timestep: ${spectrumData.currentStep ?? 0}
- Active Frequency Bands (0-7): ${JSON.stringify(spectrumData.bandActivity || [])}
- Active Emitters Detected: ${JSON.stringify(spectrumData.activeEmitters || [])}
- Receiver Dwell Allocation: ${JSON.stringify(spectrumData.receiverScans || [])}
- Performance Metrics: InterceptRate=${spectrumData.metrics?.interceptRatePct ?? 0}%, Hits=${spectrumData.metrics?.hits ?? 0}, HostileHits=${spectrumData.metrics?.highThreatHits ?? 0}, DecoyHits=${spectrumData.metrics?.decoyHits ?? 0}
- Active Scheduler: ${spectrumData.scheduler || "Threat-Aware Hybrid"}
- Adversary Mode: ${spectrumData.adversaryMode || "cognitive_evasion"}

Generate a military-grade tactical ELINT intelligence assessment in JSON format matching this exact schema:
{
  "classification": "Specific tactical radar classification (e.g. Hostile X-Band Phased-Array Fire Control / Tactical Agile Link / Active Decoy)",
  "threatLevel": "CRITICAL" | "HIGH" | "ELEVATED" | "ROUTINE",
  "threatConfidence": number between 75 and 99,
  "intentAssessment": {
    "primaryIntent": "Search" | "Target Acquisition" | "Jamming" | "Decoy Deception" | "Tactical Communications",
    "searchScore": number between 0 and 100,
    "targetAcquisitionScore": number between 0 and 100,
    "jammingScore": number between 0 and 100,
    "decoyScore": number between 0 and 100,
    "assessmentRationale": "1-2 sentences explaining why this intent profile was determined"
  },
  "threatMatrix": [
    {
      "band": number,
      "emitterName": "string",
      "threatPriority": "CRITICAL" | "HIGH" | "ELEVATED" | "ROUTINE",
      "intent": "Search" | "Target Acquisition" | "Jamming" | "Decoy Deception" | "Tactical Communications",
      "frequencyGhz": "string (e.g. 10.5 GHz)",
      "waveformType": "string",
      "prfPri": "string",
      "dutyCyclePct": number,
      "killChainStage": "string",
      "tacticalAction": "string"
    }
  ],
  "recommendedReceiverActions": [
    {
      "action": "string",
      "priority": "CRITICAL" | "HIGH" | "MEDIUM",
      "targetBand": number,
      "rationale": "string"
    }
  ],
  "automatedDebrief": {
    "headline": "Punchy military headline summarizing the RF situation",
    "executiveSummary": "2-3 sentences debriefing the commander on adversary intentions and receiver intercept efficiency",
    "operationalRisk": "SEVERE" | "ELEVATED" | "MODERATE" | "LOW",
    "interceptionEfficiencyGrade": "string (e.g. A (92%))",
    "nextDwellProtocol": "Recommended immediate scheduler action"
  },
  "doctrine": "Two concise sentences describing the adversary's operational doctrine",
  "recommendations": ["3 actionable Electronic Protection bullet points"],
  "tacticalAdvisory": "Brief tactical advisory briefing for the combat command display (max 35 words)"
}
Return ONLY valid JSON.`;
      lastGeminiCallTime = Date.now();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });
      const responseText = response.text?.trim() || "";
      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
      } catch {
        parsedResult = generateTacticalFallbackAssessment(spectrumData);
      }
      const finalReport = {
        ...parsedResult,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        timestep: spectrumData.currentStep ?? 0,
        isSimulatedFallback: false
      };
      analysisCache.set(cacheKey, { report: finalReport, timestamp: Date.now() });
      res.json(finalReport);
    } catch (err) {
      const errMsg = String(err?.message || err || "");
      const isRateLimit = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
      const isHighDemand = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE");
      if (isRateLimit || isHighDemand) {
        rateLimitBackoffUntil = Date.now() + 6e4;
        console.warn(`[ELINT Intelligence Engine] Gemini ${isRateLimit ? "429 Quota" : "503 High Demand"} handled cleanly. Tactical rule-based fallback active for 60s.`);
      } else {
        console.warn("[ELINT Intelligence Engine] Temporary API note; active tactical heuristic fallback engaged.");
      }
      const fallback = {
        ...generateTacticalFallbackAssessment(req.body),
        isSimulatedFallback: true,
        quotaPreserved: true
      };
      res.json(fallback);
    }
  });
  const generateQueryFallbackAnswer = (query, spectrumContext) => {
    let fallbackAnswer = `[TACTICAL ADVISORY - VAJRA ELINT OFFICER]: Regarding "${query}":

`;
    const qLower = query.toLowerCase();
    if (qLower.includes("decoy") || qLower.includes("band 0")) {
      fallbackAnswer += `Band 0 exhibits a high-repetition duty cycle characteristic of an active RF blinking transponder (DECOY-00). Its objective is to lure receiver dwell time away from hostile radars. The VAJRA Threat-Aware algorithm applies a penalty score to suppress dwell allocation on Band 0 to <5% once classified.`;
    } else if (qLower.includes("band 5") || qLower.includes("radar") || qLower.includes("acquisition") || qLower.includes("fire control")) {
      fallbackAnswer += `Band 5 hosts a 10.5 GHz X-band target acquisition radar (SCAN-05) executing spatial mechanical scans with a 10-step rotation period. Failure to synchronize receiver dwells during its 2-step dwell window results in severe track loss. Prioritize Band 5 when periodic rotation phase approaches.`;
    } else if (qLower.includes("jitter") || qLower.includes("pri") || qLower.includes("stagger")) {
      fallbackAnswer += `Adversary pulse repetition intervals (PRI) with \xB125% jitter are designed to defeat static time-of-arrival gating. VAJRA counters this using a Jitter-Tolerant Interval Filter that expands look gates by \xB130% around the predicted arrival time.`;
    } else if (qLower.includes("hop") || qLower.includes("agile") || qLower.includes("band 4") || qLower.includes("band 7")) {
      fallbackAnswer += `Emitters on Bands 4, 6, and 7 represent agile frequency-hopping channels (HOP-04). Standard round-robin sweeps miss >70% of hops. VAJRA's anti-evasion forecaster tracks channel transition Markov probabilities to anticipate agile re-locations.`;
    } else if (qLower.includes("jam") || qLower.includes("noise") || qLower.includes("band 6")) {
      fallbackAnswer += `Band 6 is subject to active high-power noise barrage jamming. The cognitive receiver should apply digital notch filtering and redirect secondary sensor channels to adjacent unjammed bands.`;
    } else {
      fallbackAnswer += `In the current RF environment, electromagnetic activity is dominated by coordinated adversary surveillance. We recommend maintaining multi-receiver cooperative scanning (2-3 sensors) using the Threat-Aware Hybrid scheduler to achieve >90% high-threat interception while evading decoy entrapment.`;
    }
    return fallbackAnswer;
  };
  app.post("/api/elint/query", async (req, res) => {
    try {
      const { query, spectrumContext } = req.body || {};
      if (!query || typeof query !== "string") {
        res.status(400).json({ error: "Query string is required" });
        return;
      }
      const now = Date.now();
      const ai = getGenAI();
      if (!ai || now < rateLimitBackoffUntil || now - lastGeminiCallTime < 6e3) {
        res.json({
          answer: generateQueryFallbackAnswer(query, spectrumContext),
          isFallback: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        return;
      }
      const prompt = `You are a Senior Electronic Warfare (EW) ELINT/SIGINT Intelligence Officer on duty operating the VAJRA cognitive receiver system.
Current Spectrum Context:
- Active Emitters: ${JSON.stringify(spectrumContext?.emitters || [])}
- Active Bands: ${JSON.stringify(spectrumContext?.bandActivity || [])}
- Intercept Rate: ${spectrumContext?.interceptRate || "85%"}
- Active Scheduler: ${spectrumContext?.scheduler || "Threat-Aware Hybrid"}
- Adversary Tactics: Agile hopping (Bands 4, 6, 7), Hostile X-Band 10.5 GHz (Band 5), Deceptive decoy (Band 0), Periodic early warning (Band 3).

Operator Query: "${query}"

Provide a crisp, authoritative, authentic military ELINT briefing response.
- Use real EW terminology (PRF, PRI jitter, ESM, ECM, ECCM, EP, LPI, Doppler heterodyne, DRFM, dwell scheduling).
- Be concise (under 160 words).
- Provide practical recommendations for the operator's receiver scheduler.`;
      lastGeminiCallTime = Date.now();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.3
        }
      });
      res.json({
        answer: response.text?.trim() || "ELINT analysis complete. Signal parameters nominal.",
        isFallback: false,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      const errMsg = String(err?.message || err || "");
      if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("quota") || errMsg.includes("demand")) {
        rateLimitBackoffUntil = Date.now() + 6e4;
        console.warn("[ELINT Query] Gemini rate-limit or high-demand active. Tactical advisory fallback returned.");
      } else {
        console.warn("[ELINT Query] Temporary note; tactical advisory fallback engaged.");
      }
      res.json({
        answer: generateQueryFallbackAnswer(req.body?.query || "", req.body?.spectrumContext),
        isFallback: true,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VAJRA EW Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
