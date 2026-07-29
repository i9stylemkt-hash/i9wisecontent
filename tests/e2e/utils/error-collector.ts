import type { Page, ConsoleMessage, Response } from '@playwright/test';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ErrorSeverity = 'critical' | 'important' | 'minor';

export interface CollectedError {
  type: 'console' | 'pageerror' | 'network' | 'resource';
  message: string;
  severity: ErrorSeverity;
  url: string;
  timestamp: number;
  /** HTTP status code (for network errors) */
  statusCode?: number;
  /** Stack trace (for page errors) */
  stack?: string;
}

export interface ErrorCollectorData {
  errors: CollectedError[];
  totalCount: number;
  criticalCount: number;
  importantCount: number;
  minorCount: number;
  /** Errors grouped by severity */
  bySeverity: Record<ErrorSeverity, CollectedError[]>;
}

// ─── Ignored patterns (expected noise in dev) ────────────────────────────────

const IGNORED_PATTERNS = [
  'hydrat',
  'Warning:',
  'NEXT_REDIRECT',
  'Download the React DevTools',
  'Third-party cookie',
  'favicon.ico',
  'chrome-extension://',
  '__nextjs',
  'webpack-hmr',
  'Fast Refresh',
  'hot-update',
] as const;

// ─── ErrorCollector ──────────────────────────────────────────────────────────

export class ErrorCollector {
  private errors: CollectedError[] = [];
  private page: Page | null = null;
  private isMonitoring = false;

  private consoleHandler = (msg: ConsoleMessage): void => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (this.shouldIgnore(text)) return;

      this.errors.push({
        type: 'console',
        message: text,
        severity: 'important',
        url: this.page?.url() ?? '',
        timestamp: Date.now(),
      });
    } else if (msg.type() === 'warning') {
      const text = msg.text();
      if (this.shouldIgnore(text)) return;

      this.errors.push({
        type: 'console',
        message: text,
        severity: 'minor',
        url: this.page?.url() ?? '',
        timestamp: Date.now(),
      });
    }
  };

  private pageErrorHandler = (error: Error): void => {
    const message = error.message;
    if (this.shouldIgnore(message)) return;

    this.errors.push({
      type: 'pageerror',
      message,
      severity: 'critical',
      url: this.page?.url() ?? '',
      timestamp: Date.now(),
      stack: error.stack,
    });
  };

  private responseHandler = (response: Response): void => {
    const status = response.status();
    const url = response.url();

    // Only track failed responses from the app itself (not external)
    if (status >= 400 && this.isAppUrl(url)) {
      const severity = this.categorizeStatus(status);
      this.errors.push({
        type: 'network',
        message: `HTTP ${status} - ${response.statusText()} - ${url}`,
        severity,
        url,
        timestamp: Date.now(),
        statusCode: status,
      });
    }
  };

  /**
   * Start monitoring the page for errors.
   * Attaches listeners for console errors, page errors, and network failures.
   */
  startMonitoring(page: Page): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.page = page;
    this.errors = [];
    this.isMonitoring = true;

    page.on('console', this.consoleHandler);
    page.on('pageerror', this.pageErrorHandler);
    page.on('response', this.responseHandler);
  }

  /**
   * Stop monitoring and return collected error data.
   */
  stopMonitoring(): ErrorCollectorData {
    if (this.page && this.isMonitoring) {
      this.page.off('console', this.consoleHandler);
      this.page.off('pageerror', this.pageErrorHandler);
      this.page.off('response', this.responseHandler);
    }

    this.isMonitoring = false;

    const data = this.buildData();
    return data;
  }

  /**
   * Get current collected errors without stopping monitoring.
   */
  getSnapshot(): ErrorCollectorData {
    return this.buildData();
  }

  /**
   * Categorize an error by its characteristics.
   */
  categorize(error: { statusCode?: number; type?: string; message?: string }): ErrorSeverity {
    // HTTP 500+ or uncaught exceptions → critical
    if (error.statusCode && error.statusCode >= 500) return 'critical';
    if (error.type === 'pageerror') return 'critical';

    // HTTP 400-499 or console errors → important
    if (error.statusCode && error.statusCode >= 400) return 'important';
    if (error.type === 'console') return 'important';

    // Warnings and everything else → minor
    return 'minor';
  }

  /**
   * Clear all collected errors (useful between navigations within the same test).
   */
  clear(): void {
    this.errors = [];
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private shouldIgnore(text: string): boolean {
    return IGNORED_PATTERNS.some((pattern) => text.includes(pattern));
  }

  private isAppUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.origin === (this.page?.url() ? new URL(this.page.url()).origin : '')
      );
    } catch {
      return false;
    }
  }

  private categorizeStatus(status: number): ErrorSeverity {
    if (status >= 500) return 'critical';
    if (status >= 400) return 'important';
    return 'minor';
  }

  private buildData(): ErrorCollectorData {
    const bySeverity: Record<ErrorSeverity, CollectedError[]> = {
      critical: [],
      important: [],
      minor: [],
    };

    for (const error of this.errors) {
      bySeverity[error.severity].push(error);
    }

    return {
      errors: [...this.errors],
      totalCount: this.errors.length,
      criticalCount: bySeverity.critical.length,
      importantCount: bySeverity.important.length,
      minorCount: bySeverity.minor.length,
      bySeverity,
    };
  }
}
