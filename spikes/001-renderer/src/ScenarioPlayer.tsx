import { useEffect, useRef, useState } from "react";
import {
  MessageProcessor,
  type ActionPayload,
  type ProcessableMessagePayload,
  type SurfaceModel,
} from "@a2ui/web_core/v0_9";
import { A2uiSurface, type ReactComponentImplementation } from "@a2ui/react/v0_9";
import { orgCatalog } from "./orgCatalog";
import type { Step } from "./scenarios";

type Surface = SurfaceModel<ReactComponentImplementation>;

/**
 * Owns one MessageProcessor and replays a list of steps into it.
 *
 * The processor is plain (non-React) state: it parses messages, keeps the
 * component map and data model per surface, and notifies listeners. React only
 * needs to know *which surfaces exist*; each <A2uiSurface> subscribes to its
 * own surface's changes internally.
 */
function useScenario(steps: Step[], onAction: (action: ActionPayload) => void) {
  // The processor is created once, but the caller's onAction may change
  // between renders. Reading it through a ref always calls the latest one.
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  // useState's initializer runs once per mount, so the processor is stable.
  // Only our catalog is registered, so surfaces can use only our components.
  const [processor] = useState(
    () =>
      new MessageProcessor<ReactComponentImplementation>(
        [orgCatalog],
        (action) => onActionRef.current(action),
      ),
  );
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setSurfaces(Array.from(processor.model.surfacesMap.values()));
    const created = processor.onSurfaceCreated(sync);
    const deleted = processor.onSurfaceDeleted(sync);

    // Apply steps in order, honouring each delay. A bad message must not stop
    // the rest of the stream, so each one is processed in its own try/catch.
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    steps.forEach((step, index) => {
      at += step.delayMs ?? 0;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          try {
            processor.processMessages(step.message as ProcessableMessagePayload);
          } catch (error) {
            const text = error instanceof Error ? error.message : String(error);
            setErrors((list) => [...list, `step ${index + 1}: ${text}`]);
          }
        }, at),
      );
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      created.unsubscribe();
      deleted.unsubscribe();
      processor.dispose();
    };
  }, [processor, steps]);

  return { surfaces, errors };
}

/**
 * Renders every surface a list of steps produces, plus any processing errors.
 *
 * It replays the steps once, when it mounts. To replay different steps, give
 * it a new `key` so React mounts a fresh player (and a fresh processor).
 */
export function ScenarioPlayer({
  steps,
  onAction,
}: {
  steps: Step[];
  onAction: (action: ActionPayload) => void;
}) {
  const { surfaces, errors } = useScenario(steps, onAction);
  return (
    <>
      {surfaces.length === 0 && <p>(no surface)</p>}
      {surfaces.map((surface) => (
        <A2uiSurface key={surface.id} surface={surface} />
      ))}
      {errors.length > 0 && (
        <pre role="alert" style={{ color: "#a00", whiteSpace: "pre-wrap" }}>
          {errors.join("\n")}
        </pre>
      )}
    </>
  );
}
