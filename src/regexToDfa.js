// Direct regex -> DFA construction (followpos method). JS port of the C++ version.

const ALLOWED = /^[A-Za-z0-9()|*]+$/;

export function validate(regex) {
  if (!regex) return "Enter a regular expression.";
  if (!ALLOWED.test(regex))
    return "Only letters, digits and the operators ( ) | * are supported.";
  let depth = 0;
  for (const c of regex) {
    if (c === "(") depth++;
    if (c === ")" && --depth < 0) return "Unbalanced parentheses.";
  }
  if (depth !== 0) return "Unbalanced parentheses.";
  return null;
}

// Add explicit concatenation operator '.' and the end marker '#'
export function addConcat(regex) {
  let result = "";
  for (const current of regex) {
    if (result) {
      const before = result[result.length - 1];
      const leftIsValue = /[A-Za-z0-9)*]/.test(before);
      const rightIsValue = /[A-Za-z0-9(]/.test(current);
      if (leftIsValue && rightIsValue) result += ".";
    }
    result += current;
  }
  return result + ".#";
}

const precedence = (s) => (s === "*" ? 3 : s === "." ? 2 : s === "|" ? 1 : 0);

export function convertToPostfix(infix) {
  let postfix = "";
  const ops = [];
  for (const c of infix) {
    if (/[A-Za-z0-9#]/.test(c)) postfix += c;
    else if (c === "(") ops.push(c);
    else if (c === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") postfix += ops.pop();
      ops.pop();
    } else {
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        precedence(ops[ops.length - 1]) >= precedence(c)
      )
        postfix += ops.pop();
      ops.push(c);
    }
  }
  while (ops.length) postfix += ops.pop();
  return postfix;
}

const isOperator = (c) => c === "|" || c === "." || c === "*";

function makeNode(val) {
  return {
    val, left: null, right: null, pos: -1, nullable: false,
    firstpos: new Set(), lastpos: new Set(),
  };
}

export function buildSyntaxTree(postfix) {
  const st = [];
  const bad = () => new Error("Invalid expression structure (check for empty groups or misplaced operators).");
  for (const c of postfix) {
    if (!isOperator(c)) st.push(makeNode(c));
    else if (c === "*") {
      if (st.length < 1) throw bad();
      const node = makeNode(c);
      node.left = st.pop();
      st.push(node);
    } else {
      if (st.length < 2) throw bad();
      const node = makeNode(c);
      node.right = st.pop();
      node.left = st.pop();
      st.push(node);
    }
  }
  if (st.length !== 1) throw bad();
  return st[0];
}

const union = (...sets) => new Set(sets.flatMap((s) => [...s]));
const sorted = (s) => [...s].sort((a, b) => a - b);

export function regexToDfa(input) {
  const regex = input.replace(/\s+/g, "");
  const err = validate(regex);
  if (err) throw new Error(err);

  const withConcat = addConcat(regex);
  const postfix = convertToPostfix(withConcat);
  const root = buildSyntaxTree(postfix);

  // positions: in-order over leaves
  let counter = 1;
  const positionSymbol = {};
  (function assign(n) {
    if (!n) return;
    assign(n.left);
    if (!n.left && !n.right) {
      n.pos = counter;
      positionSymbol[counter++] = n.val;
    }
    assign(n.right);
  })(root);
  const endPos = counter - 1;

  // nullable / firstpos / lastpos (post-order, also the display order)
  const nodes = [];
  (function props(n) {
    if (!n) return;
    props(n.left);
    props(n.right);
    nodes.push(n);
    if (!n.left && !n.right) {
      n.nullable = false;
      n.firstpos = new Set([n.pos]);
      n.lastpos = new Set([n.pos]);
    } else if (n.val === "|") {
      n.nullable = n.left.nullable || n.right.nullable;
      n.firstpos = union(n.left.firstpos, n.right.firstpos);
      n.lastpos = union(n.left.lastpos, n.right.lastpos);
    } else if (n.val === ".") {
      n.nullable = n.left.nullable && n.right.nullable;
      n.firstpos = n.left.nullable ? union(n.left.firstpos, n.right.firstpos) : new Set(n.left.firstpos);
      n.lastpos = n.right.nullable ? union(n.left.lastpos, n.right.lastpos) : new Set(n.right.lastpos);
    } else {
      n.nullable = true;
      n.firstpos = new Set(n.left.firstpos);
      n.lastpos = new Set(n.left.lastpos);
    }
  })(root);

  // followpos
  const followpos = {};
  for (let i = 1; i <= endPos; i++) followpos[i] = new Set();
  for (const n of nodes) {
    if (n.val === "." && n.left) {
      for (const i of n.left.lastpos) for (const j of n.right.firstpos) followpos[i].add(j);
    } else if (n.val === "*" && n.left) {
      for (const i of n.lastpos) for (const j of n.firstpos) followpos[i].add(j);
    }
  }

  // DFA
  const alphabet = [...new Set(Object.values(positionSymbol))].filter((s) => s !== "#").sort();
  const key = (s) => sorted(s).join(",");
  const states = [{ positions: sorted(root.firstpos), transitions: {}, isFinal: root.firstpos.has(endPos) }];
  const index = new Map([[key(root.firstpos), 0]]);
  for (let q = 0; q < states.length; q++) {
    for (const sym of alphabet) {
      const U = new Set();
      for (const p of states[q].positions)
        if (positionSymbol[p] === sym) followpos[p].forEach((x) => U.add(x));
      if (!U.size) continue;
      const k = key(U);
      if (!index.has(k)) {
        index.set(k, states.length);
        states.push({ positions: sorted(U), transitions: {}, isFinal: U.has(endPos) });
      }
      states[q].transitions[sym] = index.get(k);
    }
  }

  return { withConcat, postfix, root, nodes, positionSymbol, followpos, states, alphabet, endPos };
}

export { sorted };