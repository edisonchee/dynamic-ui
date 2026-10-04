import { useState } from "react";
import type { ActionPayload } from "@a2ui/web_core/v0_9";
import { ScenarioPlayer } from "./ScenarioPlayer";
import { scenarios } from "./scenarios";

export function App() {
  const [actions, setActions] = useState<ActionPayload[]>([]);
  const logAction = (action: ActionPayload) => setActions((log) => [...log, action]);

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 640, margin: "2rem auto" }}>
      <h1>Spike 001 — A2UI renderer</h1>
      {scenarios.map((scenario) => (
        <section key={scenario.title} style={{ borderTop: "1px solid #ccc", padding: "1rem 0" }}>
          <h2 style={{ fontSize: 18 }}>{scenario.title}</h2>
          <p>
            <em>Expect:</em> {scenario.expectation}
          </p>
          <ScenarioPlayer steps={scenario.steps} onAction={logAction} />
        </section>
      ))}

      <h2>Action log</h2>
      {actions.length === 0 ? (
        <p>Click a button above.</p>
      ) : (
        <pre>{JSON.stringify(actions, null, 2)}</pre>
      )}
    </main>
  );
}
