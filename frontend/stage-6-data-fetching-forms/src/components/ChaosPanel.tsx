import { useState } from 'react';
import { chaos } from '../api/fakeServer.ts';

/**
 * Failure is a feature you have to build, so it has to be a thing you can see.
 *
 * Turn the failure rates up and watch: retries on 5xx, no retry on 4xx,
 * optimistic updates rolling back, and the error UI you would otherwise never
 * exercise before production does it for you.
 */
export function ChaosPanel() {
  const [, force] = useState(0);
  const set = <K extends keyof typeof chaos>(key: K, value: number) => {
    chaos[key] = value;
    force((n) => n + 1); // `chaos` is a plain module object, not React state
  };

  return (
    <div className="filters">
      <div className="field field-narrow">
        <label htmlFor="latency">Latency: {chaos.latencyMs}ms</label>
        <input
          id="latency"
          type="range"
          min={0}
          max={2000}
          step={100}
          value={chaos.latencyMs}
          onChange={(e) => set('latencyMs', Number(e.target.value))}
        />
      </div>
      <div className="field field-narrow">
        <label htmlFor="read-fail">Read failures: {Math.round(chaos.readFailureRate * 100)}%</label>
        <input
          id="read-fail"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={chaos.readFailureRate}
          onChange={(e) => set('readFailureRate', Number(e.target.value))}
        />
      </div>
      <div className="field field-narrow">
        <label htmlFor="write-fail">Write failures: {Math.round(chaos.writeFailureRate * 100)}%</label>
        <input
          id="write-fail"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={chaos.writeFailureRate}
          onChange={(e) => set('writeFailureRate', Number(e.target.value))}
        />
      </div>
    </div>
  );
}
