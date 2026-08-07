/** Mock simulation tick engine — believable gradual updates for demo */

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (min, max) => min + Math.random() * (max - min);

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function congestionFromQueue(queue) {
  if (queue >= 25) return 'severe';
  if (queue >= 18) return 'heavy';
  if (queue >= 10) return 'moderate';
  return 'free';
}

function addDecision(decisions, entry) {
  return [entry, ...decisions].slice(0, 20);
}

function getEmergencyRouteCoords(junctions, route) {
  const coords = [];
  route.forEach((id) => {
    const j = junctions.find((x) => x.id === id);
    if (j) coords.push(j.position);
  });
  return coords;
}

export function createInitialChartHistory() {
  const points = [];
  for (let i = 19; i >= 0; i--) {
    points.push({
      time: `${18}:${String(41 + i).padStart(2, '0')}`,
      avgWait: 32 + rand(-2, 2),
      queueLength: 18 + rand(-2, 2),
      avgSpeed: 25 + rand(-1, 1),
      co2: 34.5 + rand(-0.5, 0.5),
    });
  }
  return points;
}

export function tickSimulation(state) {
  const next = JSON.parse(JSON.stringify(state));
  const t = next.simulation.time + 1;
  const mode = next.simulation.mode;
  const isOptimized = mode === 'optimized';
  const storyPhase = next.simulation.storyPhase ?? 0;

  next.simulation.time = t;
  next.simulation.storyPhase = storyPhase;

  const j1 = next.junctions.find((j) => j.id === 'J1');
  const north = j1?.approaches.north;

  // --- Story progression (optimized mode) ---
  if (isOptimized && !next.emergency.active) {
    if (t >= 15 && storyPhase < 1) {
      next.simulation.storyPhase = 1;
    }
    if (t >= 28 && storyPhase < 2) {
      next.simulation.storyPhase = 2;
      north.aiGreen = 42;
      north.aiAdjustment = 12;
      north.badge = 'ai_adjusted';
      next.aiDecisions = addDecision(next.aiDecisions, {
        id: `dec-${t}`,
        time: formatTime(t),
        type: 'congestion_detected',
        message: 'High congestion detected',
        detail: 'J1 — North Approach',
      });
      next.aiDecisions = addDecision(next.aiDecisions, {
        id: `dec-${t}-b`,
        time: formatTime(t + 1),
        type: 'signal_optimization',
        message: 'Signal optimization',
        detail: 'Green duration: 30 sec → 42 sec',
        reason: 'High queue length',
      });
    }
    if (t >= 45 && storyPhase < 3) {
      next.simulation.storyPhase = 3;
      next.aiDecisions = addDecision(next.aiDecisions, {
        id: `dec-${t}-c`,
        time: formatTime(t),
        type: 'queue_reduced',
        message: 'Queue reduced',
        detail: '23 → 15 vehicles',
      });
    }
    if (t >= 75 && storyPhase < 4 && !next.emergency.triggered) {
      next.emergency.triggered = true;
      next.emergency.active = true;
      next.emergency.currentJunction = 'J1';
      next.emergency.progress = 0;
      next.emergency.estimatedClearance = 42;
      next.emergency.corridorStates = [
        { junctionId: 'J1', status: 'passed' },
        { junctionId: 'J2', status: 'forced_green' },
        { junctionId: 'J3', status: 'preparing_green' },
        { junctionId: 'J4', status: 'waiting' },
      ];
      next.emergency.routeCoordinates = getEmergencyRouteCoords(next.junctions, next.emergency.route);
      next.aiDecisions = addDecision(next.aiDecisions, {
        id: `dec-${t}-em`,
        time: formatTime(t),
        type: 'emergency',
        message: 'Emergency vehicle detected',
        detail: 'Ambulance-01',
      });
      next.aiDecisions = addDecision(next.aiDecisions, {
        id: `dec-${t}-gc`,
        time: formatTime(t + 1),
        type: 'green_corridor',
        message: 'Green Corridor activated',
        detail: 'J1 → J2 → J3 → J4',
      });
      next.simulation.storyPhase = 4;
    }
  }

  // --- Emergency progression ---
  if (next.emergency.active) {
    const prog = next.emergency.progress + rand(0.04, 0.07);
    next.emergency.progress = clamp(prog, 0, 1);
    next.emergency.estimatedClearance = Math.max(0, Math.round(next.emergency.estimatedClearance - 1));

    const step = Math.floor(next.emergency.progress * 4);
    const statuses = ['passed', 'forced_green', 'preparing_green', 'waiting'];
    next.emergency.corridorStates = next.emergency.route.map((id, i) => ({
      junctionId: id,
      status: i < step ? 'passed' : i === step ? 'forced_green' : i === step + 1 ? 'preparing_green' : 'waiting',
    }));
    next.emergency.currentJunction = next.emergency.route[Math.min(step, 3)];

    next.junctions.forEach((j) => {
      const cs = next.emergency.corridorStates.find((c) => c.junctionId === j.id);
      if (!cs) return;
      Object.values(j.approaches).forEach((a) => {
        if (cs.status === 'forced_green') {
          a.signal = 'green';
          a.badge = 'emergency';
        } else if (cs.status === 'preparing_green') {
          a.badge = 'emergency';
        }
      });
    });

    if (next.emergency.progress >= 1 || next.emergency.estimatedClearance <= 0) {
      next.emergency.active = false;
      next.emergency.progress = 1;
      next.emergency.corridorStates = next.emergency.route.map((id) => ({
        junctionId: id,
        status: 'passed',
      }));
      next.junctions.forEach((j) => {
        Object.values(j.approaches).forEach((a) => {
          if (a.badge === 'emergency') a.badge = isOptimized ? (a.aiAdjustment > 0 ? 'ai_adjusted' : 'normal') : 'normal';
        });
      });
      next.aiDecisions = addDecision(next.aiDecisions, {
        id: `dec-${t}-clear`,
        time: formatTime(t),
        type: 'emergency_clear',
        message: 'Green Corridor cleared',
        detail: 'Normal AI operation restored',
      });
    }
  }

  // --- Junction updates ---
  next.junctions.forEach((junction) => {
    Object.entries(junction.approaches).forEach(([dir, approach]) => {
      if (approach.countdown > 0) approach.countdown = Math.max(0, approach.countdown - 1);
      if (approach.countdown === 0) {
        approach.signal = approach.signal === 'green' ? 'red' : 'green';
        const duration = isOptimized && approach.aiAdjustment > 0 ? approach.aiGreen : approach.fixedGreen;
        approach.countdown = Math.round(duration * rand(0.8, 1));
      }

      let queueDelta = rand(-0.5, 0.8);
      if (junction.id === 'J1' && dir === 'north') {
        if (isOptimized) {
          if (next.simulation.storyPhase === 1) queueDelta = rand(0.5, 1.5);
          if (next.simulation.storyPhase >= 2) queueDelta = rand(-1.2, -0.2);
        } else {
          queueDelta = rand(0.2, 1);
        }
      }
      approach.queue = Math.round(clamp(approach.queue + queueDelta, 2, 35));
      approach.avgWait = Math.round(clamp(approach.avgWait + queueDelta * 0.4, 3, 30));
      approach.congestion = congestionFromQueue(approach.queue);

      if (!isOptimized) {
        approach.aiAdjustment = 0;
        approach.aiGreen = approach.fixedGreen;
        approach.badge = 'normal';
      }
    });

    const queues = Object.values(junction.approaches).map((a) => a.queue);
    const avgQ = queues.reduce((s, q) => s + q, 0) / queues.length;
    junction.overallCongestion = congestionFromQueue(avgQ);
  });

  // --- Road congestion from connected junctions ---
  next.roads.forEach((road) => {
    const from = next.junctions.find((j) => j.id === road.from);
    const to = next.junctions.find((j) => j.id === road.to);
    const levels = [from?.overallCongestion, to?.overallCongestion];
    const worst = levels.includes('severe') ? 'severe' : levels.includes('heavy') ? 'heavy' : levels.includes('moderate') ? 'moderate' : 'free';
    road.congestion = worst;
  });

  // --- Network metrics ---
  const baseline = next.comparison.baseline;
  const optimized = next.comparison.optimized;
  const target = isOptimized ? optimized : baseline;
  const current = next.metrics;

  const phase = next.simulation.storyPhase;
  let blend = isOptimized ? 0.85 : 0.15;
  if (isOptimized && phase >= 2) blend = 0.92;
  if (isOptimized && phase >= 3) blend = 0.97;

  next.metrics = {
    avgWait: lerp(current.avgWait, target.avgWait, blend) + rand(-0.3, 0.3),
    throughput: lerp(current.throughput, target.throughput, blend) + rand(-5, 5),
    efficiency: lerp(current.efficiency, target.efficiency, blend) + rand(-0.5, 0.5),
    queueLength: lerp(current.queueLength, target.queueLength, blend) + rand(-0.5, 0.5),
    avgSpeed: lerp(current.avgSpeed, target.avgSpeed, blend) + rand(-0.3, 0.3),
    co2: lerp(current.co2, target.co2, blend) + rand(-0.1, 0.1),
  };

  Object.keys(next.metrics).forEach((k) => {
    next.metrics[k] = Math.round(next.metrics[k] * 10) / 10;
  });

  // --- Prediction update ---
  if (north) {
    next.prediction.expectedQueue = Math.round(north.queue + rand(2, 6));
    next.prediction.current = north.congestion === 'free' ? 'moderate' : north.congestion;
    next.prediction.forecast30 = congestionFromQueue(north.queue + 5);
    next.prediction.forecast60 = congestionFromQueue(north.queue + 10);
  }

  // --- Chart history ---
  const chartPoint = {
    time: formatTime(t).slice(-5),
    avgWait: next.metrics.avgWait,
    queueLength: next.metrics.queueLength,
    avgSpeed: next.metrics.avgSpeed,
    co2: next.metrics.co2,
  };
  next.chartHistory = [...(next.chartHistory ?? []).slice(-29), chartPoint];

  return next;
}
