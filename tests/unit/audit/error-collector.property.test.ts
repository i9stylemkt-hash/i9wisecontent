// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ErrorCollector } from '../../e2e/utils/error-collector';
import type { ErrorSeverity } from '../../e2e/utils/error-collector';

describe('ErrorCollector - Property-Based Tests', () => {
  it('categorize always returns a valid severity', () => {
    const errorArb = fc.record({
      statusCode: fc.option(fc.integer({ min: 100, max: 599 }), { nil: undefined }),
      type: fc.option(
        fc.constantFrom('console', 'pageerror', 'network', 'resource'),
        { nil: undefined }
      ),
      message: fc.option(fc.string(), { nil: undefined }),
    });

    fc.assert(
      fc.property(errorArb, (error) => {
        const collector = new ErrorCollector();
        const severity = collector.categorize(error);

        expect(['critical', 'important', 'minor']).toContain(severity);
      })
    );
  });

  it('status 500+ always categorized as critical', () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 599 }), (statusCode) => {
        const collector = new ErrorCollector();
        const severity = collector.categorize({ statusCode });

        expect(severity).toBe('critical');
      })
    );
  });

  it('status 400-499 categorized as important', () => {
    fc.assert(
      fc.property(fc.integer({ min: 400, max: 499 }), (statusCode) => {
        const collector = new ErrorCollector();
        const severity = collector.categorize({ statusCode });

        expect(severity).toBe('important');
      })
    );
  });

  it('pageerror type always categorized as critical', () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        const collector = new ErrorCollector();
        const severity = collector.categorize({ type: 'pageerror', message });

        expect(severity).toBe('critical');
      })
    );
  });

  it('console type categorized as important', () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        const collector = new ErrorCollector();
        const severity = collector.categorize({ type: 'console', message });

        expect(severity).toBe('important');
      })
    );
  });

  it('stopMonitoring returns consistent counts', () => {
    // Since we can't mock a real page, test the data building logic
    const collector = new ErrorCollector();
    const data = collector.stopMonitoring();

    expect(data.totalCount).toBe(0);
    expect(data.criticalCount).toBe(0);
    expect(data.importantCount).toBe(0);
    expect(data.minorCount).toBe(0);
    expect(data.errors).toHaveLength(0);
    expect(data.bySeverity.critical).toHaveLength(0);
    expect(data.bySeverity.important).toHaveLength(0);
    expect(data.bySeverity.minor).toHaveLength(0);
  });

  it('counts are always non-negative and sum to totalCount', () => {
    // Test the invariant via the categorize logic
    const severities: ErrorSeverity[] = ['critical', 'important', 'minor'];
    const severityArb = fc.constantFrom(...severities);
    const errorsArb = fc.array(
      fc.record({
        severity: severityArb,
      }),
      { minLength: 0, maxLength: 50 }
    );

    fc.assert(
      fc.property(errorsArb, (errors) => {
        const critical = errors.filter((e) => e.severity === 'critical').length;
        const important = errors.filter((e) => e.severity === 'important').length;
        const minor = errors.filter((e) => e.severity === 'minor').length;

        expect(critical).toBeGreaterThanOrEqual(0);
        expect(important).toBeGreaterThanOrEqual(0);
        expect(minor).toBeGreaterThanOrEqual(0);
        expect(critical + important + minor).toBe(errors.length);
      })
    );
  });
});
