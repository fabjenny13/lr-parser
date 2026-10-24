const R = 24, GX = 170, GY = 130, X0 = 110, Y0 = 100;

export default function DfaDiagram({ states }) {
  // layer states by BFS depth from the start state
  const depth = { 0: 0 };
  const queue = [0];
  while (queue.length) {
    const u = queue.shift();
    for (const v of Object.values(states[u].transitions))
      if (!(v in depth)) {
        depth[v] = depth[u] + 1;
        queue.push(v);
      }
  }
  const layers = {};
  states.forEach((_, i) => (layers[depth[i]] ??= []).push(i));
  const maxDepth = Math.max(...Object.keys(layers).map(Number));
  const maxRows = Math.max(...Object.values(layers).map((l) => l.length));

  const at = states.map((_, i) => {
    const layer = layers[depth[i]];
    const offset = ((maxRows - layer.length) * GY) / 2;
    return { x: X0 + depth[i] * GX, y: Y0 + offset + layer.indexOf(i) * GY };
  });

  // merge parallel edges: "a,b" on one arrow
  const edges = new Map();
  states.forEach((s, u) =>
    Object.entries(s.transitions).forEach(([sym, v]) => {
      const k = `${u}>${v}`;
      if (!edges.has(k)) edges.set(k, { u, v, syms: [] });
      edges.get(k).syms.push(sym);
    })
  );

  const width = X0 + maxDepth * GX + 80;
  const height = Y0 + (maxRows - 1) * GY + 80;
  const unit = (dx, dy) => {
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };

  return (
    <div className="scroll">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="DFA transition diagram">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" className="arrow-head" />
          </marker>
        </defs>

        {/* start arrow */}
        <line className="edge-dfa" x1={at[0].x - R - 50} y1={at[0].y} x2={at[0].x - R} y2={at[0].y} markerEnd="url(#arrow)" />

        {[...edges.values()].map(({ u, v, syms }) => {
          const a = at[u], b = at[v];
          const label = syms.join(",");
          if (u === v) {
            return (
              <g key={`${u}>${v}`}>
                <path
                  className="edge-dfa"
                  d={`M${a.x - 12} ${a.y - R + 3} C${a.x - 34} ${a.y - R - 46} ${a.x + 34} ${a.y - R - 46} ${a.x + 12} ${a.y - R + 3}`}
                  markerEnd="url(#arrow)"
                />
                <text className="edge-label" x={a.x} y={a.y - R - 38} textAnchor="middle">{label}</text>
              </g>
            );
          }
          const [nx, ny] = unit(b.y - a.y, -(b.x - a.x)); // perpendicular; flips for the reverse edge
          const cx = (a.x + b.x) / 2 + nx * 44;
          const cy = (a.y + b.y) / 2 + ny * 44;
          const [d1x, d1y] = unit(cx - a.x, cy - a.y);
          const [d2x, d2y] = unit(cx - b.x, cy - b.y);
          const sx = a.x + d1x * R, sy = a.y + d1y * R;
          const ex = b.x + d2x * R, ey = b.y + d2y * R;
          const lx = 0.25 * sx + 0.5 * cx + 0.25 * ex + nx * 10;
          const ly = 0.25 * sy + 0.5 * cy + 0.25 * ey + ny * 10;
          return (
            <g key={`${u}>${v}`}>
              <path className="edge-dfa" d={`M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`} markerEnd="url(#arrow)" />
              <text className="edge-label" x={lx} y={ly} textAnchor="middle" dy="0.35em">{label}</text>
            </g>
          );
        })}

        {states.map((s, i) => (
          <g key={i} transform={`translate(${at[i].x},${at[i].y})`}>
            <title>{`q${i} = {${s.positions.join(",")}}`}</title>
            <circle r={R} className="state" />
            {s.isFinal && <circle r={R - 5} className="state-final" />}
            <text className="node-label" textAnchor="middle" dy="0.35em">q{i}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}