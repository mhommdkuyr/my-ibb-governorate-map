// محرك التوجيه والملاحة المحلي الكامل لمحافظة إب (يعمل 100% بدون إنترنت داخل Web Worker)
// يطبق خوارزمية A* الموزونة بالزمن والانحدار الجبلي وسرعات الشوارع مع تعليمات الملاحة العربية خطوة بخطوة

class MinHeap {
  constructor() { this.data = []; }
  push(node, priority) {
    this.data.push({ node, priority });
    this._up(this.data.length - 1);
  }
  pop() {
    const top = this.data[0];
    const bottom = this.data.pop();
    if (this.data.length > 0) { this.data[0] = bottom; this._down(0); }
    return top;
  }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].priority <= this.data[i].priority) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }
  _down(i) {
    const len = this.data.length;
    while ((i << 1) + 1 < len) {
      let left = (i << 1) + 1, right = left + 1, min = i;
      if (this.data[left].priority < this.data[min].priority) min = left;
      if (right < len && this.data[right].priority < this.data[min].priority) min = right;
      if (min === i) break;
      [this.data[i], this.data[min]] = [this.data[min], this.data[i]];
      i = min;
    }
  }
  get size() { return this.data.length; }
}

const IBB_ROAD_SPEEDS_KMH = {
  trunk: 50,
  primary: 40,
  secondary: 30,
  tertiary: 22,
  residential: 16,
  service: 12,
  track: 12,
  footway: 4.5
};

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestNodeId(graph, lat, lon) {
  const nodes = graph.nodes;
  let bestId = 0, bestDist = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const d = haversineMeters(lat, lon, nodes[i][0], nodes[i][1]);
    if (d < bestDist) { bestDist = d; bestId = i; }
  }
  return { id: bestId, distMeters: Math.round(bestDist), node: nodes[bestId] };
}

function computeOfflineRoute(graph, startLat, startLon, endLat, endLon, mode = 'driving') {
  const t0 = performance.now();
  const { nodes, adj, street_names } = graph;
  const startSnap = findNearestNodeId(graph, startLat, startLon);
  const endSnap = findNearestNodeId(graph, endLat, endLon);
  const startNodeId = startSnap.id;
  const endNodeId = endSnap.id;
  const endNode = nodes[endNodeId];

  const maxSpeedMps = mode === 'walking' ? 1.4 : (55 / 3.6);
  const gScore = new Float64Array(nodes.length).fill(Infinity);
  const prevNode = new Int32Array(nodes.length).fill(-1);
  const prevEdge = new Array(nodes.length).fill(null);
  const visited = new Uint8Array(nodes.length);

  const openSet = new MinHeap();
  gScore[startNodeId] = 0;
  openSet.push(startNodeId, 0);

  let exploredNodes = 0;
  while (openSet.size > 0) {
    const { node: u } = openSet.pop();
    if (u === endNodeId) break;
    if (visited[u]) continue;
    visited[u] = 1;
    exploredNodes++;

    const edges = adj[u] || [];
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]; // [targetId, distM, roadClass, streetNameIdx, slope]
      const to = e[0], dist = e[1], cls = e[2], sIdx = e[3], slope = e[4] || 0;
      if (mode === 'driving' && cls === 'footway') continue;

      const baseKmh = mode === 'walking' ? 4.5 : (IBB_ROAD_SPEEDS_KMH[cls] || 18);
      const slopeFactor = slope > 0.08 ? 1.35 : (slope < -0.08 ? 1.15 : 1.0);
      const edgeTimeSec = (dist / (baseKmh / 3.6)) * slopeFactor;
      const tentativeG = gScore[u] + edgeTimeSec;

      if (tentativeG < gScore[to]) {
        gScore[to] = tentativeG;
        prevNode[to] = u;
        prevEdge[to] = { to, dist, cls, street: street_names[sIdx] || 'طريق محلي', slope };
        const nCoord = nodes[to];
        const hTimeSec = haversineMeters(nCoord[0], nCoord[1], endNode[0], endNode[1]) / maxSpeedMps;
        openSet.push(to, tentativeG + hTimeSec);
      }
    }
  }

  if (gScore[endNodeId] === Infinity) return null;

  const pathCoords = [[endLon, endLat]];
  const rawSteps = [];
  let curr = endNodeId;
  while (curr !== -1) {
    pathCoords.push([nodes[curr][1], nodes[curr][0]]);
    if (prevEdge[curr]) rawSteps.push(prevEdge[curr]);
    curr = prevNode[curr];
  }
  pathCoords.push([startLon, startLat]);
  pathCoords.reverse();
  rawSteps.reverse();

  // Merge consecutive steps on the same street for clean Arabic Turn-by-Turn instructions
  const mergedSteps = [];
  for (const s of rawSteps) {
    const last = mergedSteps[mergedSteps.length - 1];
    if (last && last.street === s.street) {
      last.dist += s.dist;
    } else {
      mergedSteps.push({ street: s.street, dist: s.dist, cls: s.cls, slope: s.slope });
    }
  }

  const instructions = mergedSteps.map((s, idx) => {
    const dTxt = s.dist >= 1000 ? `${(s.dist / 1000).toFixed(2)} كم` : `${Math.round(s.dist)} متر`;
    const prefix = idx === 0 ? 'انطلق عبر' : (idx === mergedSteps.length - 1 ? 'اتجه نحو الوجهة عبر' : 'واصل السير في');
    const slopeNote = s.slope > 0.06 ? ' (صعود جبلي)' : (s.slope < -0.06 ? ' (منحدر)' : '');
    return { text: `${prefix} ${s.street} لمسافة ${dTxt}${slopeNote}`, distMeters: s.dist, street: s.street };
  });

  const totalDist = Math.round(
    rawSteps.reduce((acc, s) => acc + s.dist, 0) + startSnap.distMeters + endSnap.distMeters
  );
  const extraSec = (startSnap.distMeters + endSnap.distMeters) / (mode === 'walking' ? 1.25 : 6.0);
  const totalSec = Math.max(30, Math.round(gScore[endNodeId] + extraSec));

  return {
    engine: 'Offline A* Road Graph (Ibb Local CH)',
    computeMs: +(performance.now() - t0).toFixed(2),
    exploredNodes,
    durationSeconds: totalSec,
    distanceMeters: totalDist,
    startNodeName: startSnap.node[3],
    endNodeName: endSnap.node[3],
    geometry: { type: 'LineString', coordinates: pathCoords },
    steps: instructions
  };
}

let GRAPH = null;
self.onmessage = (e) => {
  const { type, payload, reqId } = e.data || {};
  if (type === 'INIT_GRAPH') {
    GRAPH = payload;
    self.postMessage({ type: 'GRAPH_READY', nodes: GRAPH.nodes.length });
  } else if (type === 'ROUTE' && GRAPH) {
    const res = computeOfflineRoute(GRAPH, payload.startLat, payload.startLon, payload.endLat, payload.endLon, payload.mode);
    self.postMessage({ type: 'ROUTE_RESULT', reqId, result: res });
  }
};
