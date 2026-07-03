/**
 * In-Memory Prometheus Metrics Collector
 *
 * Tracks counters, gauges, and histograms for /api/metrics endpoint.
 * Import this from route handlers or middleware to record metrics.
 */

interface CounterEntry { value: number; labels: Record<string, string> }
interface HistogramEntry { values: number[]; labels: Record<string, string> }
interface GaugeEntry { value: number; labels: Record<string, string> }

const counters = new Map<string, CounterEntry>();
const histograms = new Map<string, HistogramEntry>();
const gauges = new Map<string, GaugeEntry>();

function labelsToSuffix(labels: Record<string, string>): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '';
  return '{' + entries.map(([k, v]) => `${k}="${v}"`).join(',') + '}';
}

export const metricsCollector = {
  incrementCounter(name: string, labels: Record<string, string> = {}, amount = 1): void {
    const key = name + JSON.stringify(Object.entries(labels).sort());
    const existing = counters.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      counters.set(key, { value: amount, labels });
    }
  },

  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = name + JSON.stringify(Object.entries(labels).sort());
    const existing = histograms.get(key);
    if (existing) {
      existing.values.push(value);
    } else {
      histograms.set(key, { values: [value], labels });
    }
  },

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = name + JSON.stringify(Object.entries(labels).sort());
    gauges.set(key, { value, labels });
  },
};

/** Render all collected metrics as Prometheus text format */
export function renderMetrics(): string {
  const lines: string[] = [];

  // Counters
  for (const [key, entry] of counters) {
    const baseName = key.split('{"')[0];
    lines.push(`# HELP ${baseName} Total count`);
    lines.push(`# TYPE ${baseName} counter`);
    lines.push(`${baseName}${labelsToSuffix(entry.labels)} ${entry.value}`);
  }

  // Gauges
  for (const [key, entry] of gauges) {
    const baseName = key.split('{"')[0];
    lines.push(`# HELP ${baseName} Current value`);
    lines.push(`# TYPE ${baseName} gauge`);
    lines.push(`${baseName}${labelsToSuffix(entry.labels)} ${entry.value}`);
  }

  // Histograms
  for (const [key, entry] of histograms) {
    const baseName = key.split('{"')[0];
    const sorted = [...entry.values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const count = sorted.length;

    lines.push(`# HELP ${baseName} Duration in seconds`);
    lines.push(`# TYPE ${baseName} histogram`);

    const buckets = [0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    for (const bucket of buckets) {
      const within = sorted.filter(v => v <= bucket).length;
      lines.push(`${baseName}_bucket${labelsToSuffix({ ...entry.labels, le: String(bucket) })} ${within}`);
    }
    lines.push(`${baseName}_bucket${labelsToSuffix({ ...entry.labels, le: '+Inf' })} ${count}`);
    lines.push(`${baseName}_sum${labelsToSuffix(entry.labels)} ${sum.toFixed(4)}`);
    lines.push(`${baseName}_count${labelsToSuffix(entry.labels)} ${count}`);
  }

  // Uptime gauge
  const uptimeSec = Math.floor(process.uptime());
  lines.push(`# HELP process_uptime_seconds Process uptime`);
  lines.push(`# TYPE process_uptime_seconds gauge`);
  lines.push(`process_uptime_seconds ${uptimeSec}`);

  // Memory gauge
  const mem = process.memoryUsage();
  lines.push(`# HELP process_memory_heap_used_bytes Heap memory used`);
  lines.push(`# TYPE process_memory_heap_used_bytes gauge`);
  lines.push(`process_memory_heap_used_bytes ${mem.heapUsed}`);

  return lines.join('\n') + '\n';
}
