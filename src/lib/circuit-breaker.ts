/**
 * Circuit Breaker for External Service Calls
 *
 * Prevents cascading failures by tracking failure rates and temporarily
 * rejecting calls to services that are experiencing issues.
 *
 * States:
 *   CLOSED  — Normal operation, calls pass through
 *   OPEN    — Service failing, all calls rejected immediately
 *   HALF_OPEN — Testing recovery, allows one probe call
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  /** Number of consecutive failures to trip the circuit */
  failureThreshold: number;
  /** Time in ms to wait before transitioning from OPEN → HALF_OPEN */
  resetTimeoutMs: number;
  /** Window in ms to track failures (counter resets after this) */
  monitorWindowMs: number;
}

interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  monitorWindowMs: 60_000,
};

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange = Date.now();
  private windowStart = Date.now();
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private resetWindowIfExpired(): void {
    const now = Date.now();
    if (now - this.windowStart > this.options.monitorWindowMs) {
      this.failureCount = 0;
      this.windowStart = now;
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === 'HALF_OPEN') {
      // Allow one probe
    }
    console.log(`[CircuitBreaker] State → ${newState}`);
  }

  /**
   * Execute an async function through the circuit breaker.
   * Throws if circuit is OPEN. Transitions states based on outcome.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.resetWindowIfExpired();

    // Check state
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastStateChange;
      if (elapsed >= this.options.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker is OPEN. Service unavailable. Retry after ${Math.ceil((this.options.resetTimeoutMs - elapsed) / 1000)}s`);
      }
    }

    try {
      const result = await fn();

      // Success — reset or close
      if (this.state === 'HALF_OPEN') {
        this.transitionTo('CLOSED');
      }
      this.failureCount = 0;
      this.successCount++;
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.state === 'HALF_OPEN') {
        // Probe failed — reopen
        this.transitionTo('OPEN');
      } else if (this.failureCount >= this.options.failureThreshold) {
        this.transitionTo('OPEN');
      }

      throw error;
    }
  }

  /**
   * Get current metrics for monitoring.
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Manually reset the circuit breaker (for admin recovery).
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
    console.log('[CircuitBreaker] Manually reset to CLOSED');
  }
}

/**
 * Pre-configured circuit breaker for external service calls.
 * 5 failures → open, 30s reset timeout, 60s monitor window.
 */
export const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  monitorWindowMs: 60_000,
});

/**
 * Create a custom circuit breaker instance.
 */
export function createCircuitBreaker(options: Partial<CircuitBreakerOptions> = {}): CircuitBreaker {
  return new CircuitBreaker(options);
}

export type { CircuitBreakerMetrics, CircuitBreakerOptions, CircuitState };
