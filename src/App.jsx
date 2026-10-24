import { useState, useMemo } from "react";
import { regexToDfa, sorted } from "./regexToDfa";
import SyntaxTree from "./components/SyntaxTree";
import DfaDiagram from "./components/DfaDiagram";
import "./App.css";

const EXAMPLES = ["(a|b)*abb", "a(b|c)*", "(ab|c)*d", "a*b*"];
const fmt = (s) => "{" + sorted(s).join(", ") + "}";

export default function App() {
  const [input, setInput] = useState("(a|b)*abb");
  const [submitted, setSubmitted] = useState("(a|b)*abb");

  const { result, error } = useMemo(() => {
    try {
      return { result: regexToDfa(submitted), error: null };
    } catch (e) {
      return { result: null, error: e.message };
    }
  }, [submitted]);

  const run = (value) => {
    setInput(value);
    setSubmitted(value);
  };

  return (
    <main className="page">
      <header>
        <h1>Regex to DFA</h1>
        <p className="lede">
          Builds the syntax tree and DFA directly from a regular expression using
          nullable, firstpos, lastpos and followpos.
        </p>
      </header>

      <form
        className="input-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. (a|b)*abb"
          spellCheck="false"
          autoComplete="off"
          aria-label="Regular expression"
        />
        <button type="submit">Build DFA</button>
      </form>

      <div className="chips">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => run(ex)}>
            {ex}
          </button>
        ))}
      </div>
      <p className="hint">Supported: letters, digits, <code>|</code> (or), <code>*</code> (star), <code>( )</code>. Concatenation is implicit. <code>#</code> is reserved as the end marker.</p>

      {error && <div className="error" role="alert">{error}</div>}

      {result && (
        <>
          <section>
            <h2>Preprocessing</h2>
            <dl className="kv">
              <dt>With concatenation and end marker</dt>
              <dd><code>{result.withConcat}</code></dd>
              <dt>Postfix</dt>
              <dd><code>{result.postfix}</code></dd>
            </dl>
          </section>

          <section>
            <h2>Syntax tree</h2>
            <p className="hint">Numbers under the leaves are positions. Hover a node to see nullable, firstpos and lastpos.</p>
            <SyntaxTree root={result.root} />
          </section>

          <section>
            <h2>Node properties</h2>
            <details>
              <summary>Show nullable, firstpos and lastpos for every node</summary>
              <div className="scroll">
                <table>
                  <thead>
                    <tr><th>Node</th><th>Nullable</th><th>Firstpos</th><th>Lastpos</th></tr>
                  </thead>
                  <tbody>
                    {result.nodes.map((n, i) => (
                      <tr key={i}>
                        <td>{n.val === "." ? "· (concat)" : n.val}{n.pos !== -1 && ` [${n.pos}]`}</td>
                        <td>{String(n.nullable)}</td>
                        <td>{fmt(n.firstpos)}</td>
                        <td>{fmt(n.lastpos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section>
            <h2>Followpos</h2>
            <div className="scroll">
              <table>
                <thead><tr><th>Position</th><th>Symbol</th><th>Followpos</th></tr></thead>
                <tbody>
                  {Object.entries(result.followpos).map(([p, s]) => (
                    <tr key={p}>
                      <td>{p}</td>
                      <td>{result.positionSymbol[p]}</td>
                      <td>{fmt(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>DFA transition diagram</h2>
            <p className="hint">Arrow in = start state. Double circle = accepting state (contains the position of #).</p>
            <DfaDiagram states={result.states} />
          </section>

          <section>
            <h2>Transition table</h2>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>State</th>
                    <th>Positions</th>
                    {result.alphabet.map((s) => <th key={s}>{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.states.map((s, i) => (
                    <tr key={i}>
                      <td>q{i}{i === 0 && " (start)"}{s.isFinal && " (final)"}</td>
                      <td>{fmt(s.positions)}</td>
                      {result.alphabet.map((a) => (
                        <td key={a}>{a in s.transitions ? `q${s.transitions[a]}` : "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}