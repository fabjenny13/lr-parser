import { sorted } from "../regexToDfa";

const DX = 56, DY = 76, R = 18, PAD = 40;
const fmt = (s) => "{" + sorted(s).join(",") + "}";

export default function SyntaxTree({ root }) {
  const pos = new Map();
  let leaf = 0, maxDepth = 0;

  (function walk(n, depth) {
    const kids = [n.left, n.right].filter(Boolean);
    kids.forEach((k) => walk(k, depth + 1));
    const x = kids.length ? kids.reduce((s, k) => s + pos.get(k).x, 0) / kids.length : leaf++;
    pos.set(n, { x, depth });
    maxDepth = Math.max(maxDepth, depth);
  })(root, 0);

  const px = (n) => PAD + pos.get(n).x * DX;
  const py = (n) => PAD + pos.get(n).depth * DY;
  const width = PAD * 2 + Math.max(leaf - 1, 0) * DX;
  const height = PAD * 2 + maxDepth * DY + 16;

  const all = [];
  (function collect(n) {
    if (!n) return;
    all.push(n);
    collect(n.left);
    collect(n.right);
  })(root);

  return (
    <div className="scroll">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Syntax tree">
        {all.flatMap((n) =>
          [n.left, n.right].filter(Boolean).map((c, i) => (
            <line key={`${px(n)}-${py(n)}-${i}`} className="edge" x1={px(n)} y1={py(n)} x2={px(c)} y2={py(c)} />
          ))
        )}
        {all.map((n, i) => {
          const isLeaf = !n.left && !n.right;
          return (
            <g key={i} transform={`translate(${px(n)},${py(n)})`}>
              <title>
                {`${n.val}\nnullable: ${n.nullable}\nfirstpos: ${fmt(n.firstpos)}\nlastpos: ${fmt(n.lastpos)}`}
              </title>
              <circle r={R} className={isLeaf ? "leaf" : "op"} />
              <text className="node-label" textAnchor="middle" dy="0.35em">
                {n.val === "." ? "·" : n.val}
              </text>
              {isLeaf && (
                <text className="pos-label" textAnchor="middle" y={R + 15}>
                  {n.pos}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}