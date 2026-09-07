/**
 * A minimal metrics registry, Prometheus-flavoured.
 *
 * The three signals of observability:
 *
 *   LOGS    discrete events, high detail  -> "what happened to THIS request?"
 *   METRICS numbers over time, cheap      -> "how is the system doing?"
 *   TRACES  one request across services   -> "where did the 2s go?"
 *
 * You need all three. Logs alone cannot answer "is latency worse than last
 * week"; metrics alone cannot tell you why one user got a 500.
 */

export interface Metrics {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  /** Prometheus text exposition format. */
  render(): string;
  snapshot(): Record<string, number>;
}

/**
 * Histogram buckets, in milliseconds.
 *
 * AVERAGES LIE. If 99 requests take 10ms and one takes 10 seconds, the average
 * is 110ms and everything looks fine - while one user in a hundred is staring
 * at a frozen page. Buckets let you compute percentiles, and p95/p99 are what
 * actually describe user experience.
 */
const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

export function createMetrics(): Metrics {
  const counters = new Map<string, number>();
  const gauges = new Map<string, number>();
  const histograms = new Map<string, { buckets: Map<number, number>; sum: number; count: number }>();

  /**
   * Labels are how you slice a metric: by route, by status, by method.
   *
   * CARDINALITY IS THE TRAP. Every distinct label combination is a separate
   * time series. Label by ROUTE PATTERN (`/api/tasks/:id`), never by the
   * resolved path (`/api/tasks/8f3a...`) - the latter creates one series per
   * task and will melt your metrics backend. The same goes for user ids,
   * request ids and raw query strings.
   */
  const key = (name: string, labels: Record<string, string> = {}) => {
    const parts = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`);
    return parts.length > 0 ? `${name}{${parts.join(',')}}` : name;
  };

  return {
    incrementCounter(name, labels) {
      const id = key(name, labels);
      counters.set(id, (counters.get(id) ?? 0) + 1);
    },

    setGauge(name, value, labels) {
      gauges.set(key(name, labels), value);
    },

    observeHistogram(name, value, labels) {
      const id = key(name, labels);
      let histogram = histograms.get(id);
      if (!histogram) {
        histogram = { buckets: new Map(DEFAULT_BUCKETS.map((b) => [b, 0])), sum: 0, count: 0 };
        histograms.set(id, histogram);
      }

      histogram.sum += value;
      histogram.count += 1;
      // Prometheus buckets are CUMULATIVE: le="100" counts everything <= 100ms.
      for (const bucket of DEFAULT_BUCKETS) {
        if (value <= bucket) histogram.buckets.set(bucket, (histogram.buckets.get(bucket) ?? 0) + 1);
      }
    },

    render() {
      const lines: string[] = [];

      for (const [id, value] of counters) lines.push(`${id} ${value}`);
      for (const [id, value] of gauges) lines.push(`${id} ${value}`);

      for (const [id, histogram] of histograms) {
        const [name, labelPart] = splitKey(id);
        for (const [bucket, count] of histogram.buckets) {
          lines.push(`${name}_bucket{${joinLabels(labelPart, `le="${bucket}"`)}} ${count}`);
        }
        lines.push(`${name}_bucket{${joinLabels(labelPart, 'le="+Inf"')}} ${histogram.count}`);
        lines.push(`${name}_sum${labelPart ? `{${labelPart}}` : ''} ${histogram.sum}`);
        lines.push(`${name}_count${labelPart ? `{${labelPart}}` : ''} ${histogram.count}`);
      }

      return `${lines.join('\n')}\n`;
    },

    snapshot() {
      const output: Record<string, number> = {};
      for (const [id, value] of counters) output[id] = value;
      for (const [id, value] of gauges) output[id] = value;
      for (const [id, histogram] of histograms) {
        output[`${id}_count`] = histogram.count;
        output[`${id}_sum`] = histogram.sum;
      }
      return output;
    },
  };
}

function splitKey(id: string): [string, string] {
  const brace = id.indexOf('{');
  if (brace === -1) return [id, ''];
  return [id.slice(0, brace), id.slice(brace + 1, -1)];
}

function joinLabels(existing: string, extra: string): string {
  return existing ? `${existing},${extra}` : extra;
}
