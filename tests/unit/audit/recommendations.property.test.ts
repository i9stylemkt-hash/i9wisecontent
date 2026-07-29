// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ReportGenerator } from '../../e2e/utils/report-generator';
import type { ModuleReport, RecommendationPriority } from '../../e2e/utils/report-generator';
import type { ModuleEvaluation } from '../../e2e/utils/module-evaluator';

describe('Recommendations - Property-Based Tests', () => {
  const validPriorities: RecommendationPriority[] = ['bloqueante', 'alta', 'media', 'baixa'];

  const moduleReportArb = (
    funcScore: number,
    errorHandlingScore: number,
    uxScore: number,
    hasCriticalErrors: boolean
  ): ModuleReport => ({
    name: 'TestModule',
    evaluation: {
      moduleName: 'TestModule',
      score: 5,
      maturity: 'Parcial',
      criteria: {
        functionality: funcScore,
        completeness: 5,
        errorHandling: errorHandlingScore,
        uxAccessibility: uxScore,
      },
      strengths: ['a', 'b', 'c'],
      weaknesses: ['x', 'y', 'z'],
      justification: 'Test justification',
    },
    errors: hasCriticalErrors
      ? [{ type: 'pageerror' as const, message: 'Uncaught Error', severity: 'critical' as const, url: '', timestamp: Date.now() }]
      : [],
    screenshots: [],
    testsRun: 5,
    testsPassed: 3,
    testsFailed: 2,
  });

  it('recommendations always have valid priority values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.boolean(),
        (funcScore, errorScore, uxScore, hasCritical) => {
          const generator = new ReportGenerator();
          const modules = [moduleReportArb(funcScore, errorScore, uxScore, hasCritical)];
          const recommendations = generator.generateRecommendationsFromEvaluations(modules);

          for (const rec of recommendations) {
            expect(validPriorities).toContain(rec.priority);
          }
        }
      )
    );
  });

  it('recommendations have non-empty title and description', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 4, noNaN: true }),
        fc.double({ min: 0, max: 4, noNaN: true }),
        fc.double({ min: 0, max: 4, noNaN: true }),
        (funcScore, errorScore, uxScore) => {
          const generator = new ReportGenerator();
          const modules = [moduleReportArb(funcScore, errorScore, uxScore, true)];
          const recommendations = generator.generateRecommendationsFromEvaluations(modules);

          for (const rec of recommendations) {
            expect(rec.title.length).toBeGreaterThan(0);
            expect(rec.description.length).toBeGreaterThan(0);
            expect(rec.module.length).toBeGreaterThan(0);
            expect(rec.effort.length).toBeGreaterThan(0);
          }
        }
      )
    );
  });

  it('critical errors always generate bloqueante recommendations', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        (funcScore, errorScore, uxScore) => {
          const generator = new ReportGenerator();
          const modules = [moduleReportArb(funcScore, errorScore, uxScore, true)];
          const recommendations = generator.generateRecommendationsFromEvaluations(modules);

          const bloqueantes = recommendations.filter((r) => r.priority === 'bloqueante');
          expect(bloqueantes.length).toBeGreaterThanOrEqual(1);
        }
      )
    );
  });

  it('recommendations are sorted by priority (bloqueante first)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 4, noNaN: true }),
        fc.double({ min: 0, max: 4, noNaN: true }),
        fc.double({ min: 0, max: 4, noNaN: true }),
        (funcScore, errorScore, uxScore) => {
          const generator = new ReportGenerator();
          const modules = [moduleReportArb(funcScore, errorScore, uxScore, true)];
          const recommendations = generator.generateRecommendationsFromEvaluations(modules);

          const priorityOrder: Record<RecommendationPriority, number> = {
            bloqueante: 0,
            alta: 1,
            media: 2,
            baixa: 3,
          };

          for (let i = 1; i < recommendations.length; i++) {
            const prev = priorityOrder[recommendations[i - 1]!.priority];
            const curr = priorityOrder[recommendations[i]!.priority];
            expect(prev).toBeLessThanOrEqual(curr);
          }
        }
      )
    );
  });

  it('no recommendations generated for perfect scores without errors', () => {
    const generator = new ReportGenerator();
    const modules = [moduleReportArb(10, 10, 10, false)];
    const recommendations = generator.generateRecommendationsFromEvaluations(modules);

    expect(recommendations).toHaveLength(0);
  });
});
