// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ReportGenerator } from '../../e2e/utils/report-generator';
import type { AuditReport, ModuleReport } from '../../e2e/utils/report-generator';
import type { ModuleEvaluation } from '../../e2e/utils/module-evaluator';

describe('ReportGenerator - Property-Based Tests', () => {
  const maturityLevels = ['Completo', 'Funcional', 'Parcial', 'Incompleto', 'Não-Funcional'] as const;

  const evaluationArb: fc.Arbitrary<ModuleEvaluation> = fc.record({
    moduleName: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{1,20}$/),
    score: fc.double({ min: 0, max: 10, noNaN: true }),
    maturity: fc.constantFrom(...maturityLevels),
    criteria: fc.record({
      functionality: fc.double({ min: 0, max: 10, noNaN: true }),
      completeness: fc.double({ min: 0, max: 10, noNaN: true }),
      errorHandling: fc.double({ min: 0, max: 10, noNaN: true }),
      uxAccessibility: fc.double({ min: 0, max: 10, noNaN: true }),
    }),
    strengths: fc.tuple(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.string({ minLength: 1, maxLength: 50 })
    ),
    weaknesses: fc.tuple(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.string({ minLength: 1, maxLength: 50 })
    ),
    justification: fc.string({ minLength: 10, maxLength: 200 }),
  }) as fc.Arbitrary<ModuleEvaluation>;

  const moduleReportArb: fc.Arbitrary<ModuleReport> = fc.record({
    name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{1,15}$/),
    evaluation: evaluationArb,
    errors: fc.array(
      fc.record({
        type: fc.constantFrom('console', 'pageerror', 'network', 'resource') as fc.Arbitrary<'console' | 'pageerror' | 'network' | 'resource'>,
        message: fc.string({ minLength: 1, maxLength: 100 }),
        severity: fc.constantFrom('critical', 'important', 'minor') as fc.Arbitrary<'critical' | 'important' | 'minor'>,
        url: fc.webUrl(),
        timestamp: fc.nat(),
      }),
      { minLength: 0, maxLength: 5 }
    ),
    screenshots: fc.constant([]),
    testsRun: fc.nat({ max: 20 }),
    testsPassed: fc.nat({ max: 20 }),
    testsFailed: fc.nat({ max: 10 }),
  }) as fc.Arbitrary<ModuleReport>;

  const auditReportArb: fc.Arbitrary<AuditReport> = fc.record({
    metadata: fc.record({
      startTime: fc.nat(),
      endTime: fc.nat(),
      duration: fc.nat({ max: 600000 }),
      nodeVersion: fc.constant('v20.0.0'),
      playwrightVersion: fc.constant('1.62.0'),
      appVersion: fc.constant('0.1.0'),
      os: fc.constant('win32'),
      baseUrl: fc.constant('http://localhost:3000'),
    }),
    modules: fc.array(moduleReportArb, { minLength: 1, maxLength: 9 }),
    recommendations: fc.constant([]),
    patterns: fc.constant([]),
  }) as fc.Arbitrary<AuditReport>;

  it('generated report always contains required sections', () => {
    fc.assert(
      fc.property(auditReportArb, (report) => {
        const generator = new ReportGenerator();
        const markdown = generator.generate(report);

        // Required sections
        expect(markdown).toContain('Resumo Executivo');
        expect(markdown).toContain('Resultados por Módulo');
        expect(markdown).toContain('Erros Detectados');
        expect(markdown).toContain('Avaliações e Notas');
        expect(markdown).toContain('Recomendações Priorizadas');
        expect(markdown).toContain('Evidências');
      }),
      { numRuns: 50 }
    );
  });

  it('report contains a table with module scores', () => {
    fc.assert(
      fc.property(auditReportArb, (report) => {
        const generator = new ReportGenerator();
        const markdown = generator.generate(report);

        // Should have table header row
        expect(markdown).toContain('| # | Módulo |');
      }),
      { numRuns: 30 }
    );
  });

  it('report includes timestamps in metadata', () => {
    fc.assert(
      fc.property(auditReportArb, (report) => {
        const generator = new ReportGenerator();
        const markdown = generator.generate(report);

        // Should contain date reference
        expect(markdown).toContain('Data:');
        expect(markdown).toContain('Duração:');
      }),
      { numRuns: 30 }
    );
  });

  it('recurring patterns are detected when same error in 3+ modules', () => {
    const generator = new ReportGenerator();

    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.array(fc.stringMatching(/^[A-Za-z]{3,10}$/), { minLength: 3, maxLength: 6 }),
        (errorMsg, moduleNames) => {
          // Create modules that all share the same error
          const modules: ModuleReport[] = moduleNames.map((name) => ({
            name,
            evaluation: {
              moduleName: name,
              score: 5,
              maturity: 'Parcial' as const,
              criteria: { functionality: 5, completeness: 5, errorHandling: 5, uxAccessibility: 5 },
              strengths: ['a', 'b', 'c'] as [string, string, string],
              weaknesses: ['x', 'y', 'z'] as [string, string, string],
              justification: 'test',
            },
            errors: [
              {
                type: 'console' as const,
                message: errorMsg,
                severity: 'important' as const,
                url: 'http://localhost',
                timestamp: Date.now(),
              },
            ],
            screenshots: [],
            testsRun: 1,
            testsPassed: 1,
            testsFailed: 0,
          }));

          const patterns = generator.detectPatterns(modules);
          // If 3+ modules share same error, pattern should be detected
          if (moduleNames.length >= 3) {
            expect(patterns.length).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
