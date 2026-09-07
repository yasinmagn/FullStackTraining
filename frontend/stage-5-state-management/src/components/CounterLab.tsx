import { useRef, useState } from 'react';

/**
 * A small lab for the three things about `useState` that surprise people.
 * Click the buttons and watch the numbers.
 */
export function CounterLab() {
  const [count, setCount] = useState(0);

  /**
   * A ref is a mutable box that SURVIVES re-renders and does NOT trigger them.
   *
   * Use it for values the UI does not display: timer ids, DOM nodes, a "did I
   * already do this" flag. Never read a ref during render to decide what to
   * show - it does not cause a re-render, so the screen will be stale.
   */
  const renderCount = useRef(0);
  renderCount.current += 1;

  return (
    <div className="lab">
      <p className="lab-value">
        count: <strong>{count}</strong> &middot; renders: <strong>{renderCount.current}</strong>
      </p>

      <div className="lab-buttons">
        {/*
          BROKEN. Three calls, all reading the same stale `count` from this
          render's closure, all setting it to the same value. Result: +1.

          `count` is a const captured when this render ran. Nothing inside the
          handler can change what it was.
        */}
        <button type="button" className="ghost" onClick={() => { setCount(count + 1); setCount(count + 1); setCount(count + 1); }}>
          +3 (stale, gives +1)
        </button>

        {/*
          CORRECT. The UPDATER form receives the latest pending value, so the
          three calls queue on top of each other. Result: +3.

          Rule of thumb: if the next value depends on the previous one, pass a
          function.
        */}
        <button type="button" onClick={() => { setCount((c) => c + 1); setCount((c) => c + 1); setCount((c) => c + 1); }}>
          +3 (updater, gives +3)
        </button>

        <button type="button" className="ghost" onClick={() => setCount(0)}>
          Reset
        </button>
      </div>

      <p className="lab-note">
        Both buttons call <code>setCount</code> three times, and both cause exactly one re-render -
        React batches every update inside an event handler (and, since React 18, inside promises and
        timeouts too).
      </p>
    </div>
  );
}
