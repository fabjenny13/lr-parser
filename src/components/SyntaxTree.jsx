
import Tree from "react-d3-tree";
import { useMemo, useRef, useState, useEffect } from "react";

function convertTree(node) {
  if (!node) return null;

  const children = [node.left, node.right]
    .filter(Boolean)
    .map(convertTree);

  return {
    name: node.val === "." ? "·" : String(node.val),
    attributes: node.pos != null ? { pos: node.pos } : {},
    children,
    isLeaf: !node.left && !node.right,
  };
}

function renderNode({ nodeDatum }) {
  const isLeaf = nodeDatum.isLeaf;

  return (
    <g>
      <title>{nodeDatum.name}</title>

      <circle
        r={18}
        className={isLeaf ? "leaf" : "op"}
      />

      <text
        className="node-label"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {nodeDatum.name}
      </text>

      {isLeaf && nodeDatum.attributes?.pos != null && (
        <text
          className="pos-label"
          textAnchor="middle"
          y={32}
        >
          {nodeDatum.attributes.pos}
        </text>
      )}
    </g>
  );
}

export default function SyntaxTree({ root }) {
  const data = useMemo(() => convertTree(root), [root]);
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 60 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setTranslate({ x: el.clientWidth / 2, y: 60 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  if (!data) return null;

  return (
    <div ref={containerRef} className="syntax-tree">
      <Tree
        data={data}
        orientation="vertical"
        renderCustomNodeElement={renderNode}
        collapsible={false}
        zoomable
        draggable
        pathFunc="straight"
        nodeSize={{ x: 80, y: 90 }}
        separation={{ siblings: 1.2, nonSiblings: 1.2 }}
        translate={translate}
        scaleExtent={{ min: 0.3, max: 2 }}
      />
    </div>
  );
}