// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ModuleEvaluator } from '../../e2e/utils/module-evaluator';
import type { EvaluationCriteria } from '../../e2e/utils/module-evaluator';

describe('ModuleEvaluator - Property-Based Tests', () => {
  const criteriaArb = fc.record({
    functionality: fc.double({ min: 0, max: 10, noNaN: true }),
    completeness: fc.double({ min: 0, max: 10, noNaN: true }),
    errorHandling: fc.double({ min: 0, max: 10, noNaN: true }),
    uxAccessibility: fc.double({ min: 0, max: 10, noNaN: true }),
  }) as fc.Arbitrary<EvaluationCriteria>;

  const moduleNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 -]{1,30}$/);

  const strengthsArb = fc.tuple(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 })
  ) as fc.Arbitrary<[string, string, string]>;

  const weaknessesArb = fc.tuple(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 })
  ) as fc.Arbitrary<[string, string, string]>;

  it('score is always between 0 and 10', () => {
    fc.assert(
      fc.property(criteriaArb, (criteria) => {
        const score = ModuleEvaluator.computeScore(criteria);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      })
    );
  });

  it('maturity level corresponds to score range', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 10, noNaN: true }), (score) => {
        const maturity = ModuleEvaluator.computeMaturity(score);
        if (score >= 8) expect(maturity).toBe('Completo');
        else if (score >= 6) expect(maturity).toBe('Funcional');
        else if (score >= 4) expect(maturity).toBe('Parcial');
        else if (score >= 2) expect(maturity).toBe('Incompleto');
        else expect(maturity).toBe('Não-Funcional');
      })
    );
  });

  it('evaluate always returns exactly 3 strengths and 3 weaknesses', () => {
    fc.assert(
      fc.property(
        moduleNameArb,
        criteriaArb,
        strengthsArb,
        weaknessesArb,
        (name, criteria, strengths, weaknesses) => {
          const evaluator = new ModuleEvaluator();
          const result = evaluator.evaluate(name, criteria, { strengths, weaknesses });

          expect(result.strengths).toHaveLength(3);
          expect(result.weaknesses).toHaveLength(3);
        }
      )
    );
  });

  it('justification always references the module name', () => {
    fc.assert(
      fc.property(
        moduleNameArb,
        criteriaArb,
        strengthsArb,
        weaknessesArb,
        (name, criteria, strengths, weaknesses) => {
          const evaluator = new ModuleEvaluator();
          const result = evaluator.evaluate(name, criteria, { strengths, weaknesses });

          expect(result.justification).toContain(name);
        }
      )
    );
  });

  it('higher criteria scores produce higher overall score', () => {
    fc.assert(
      fc.property(criteriaArb, criteriaArb, (criteria1, criteria2) => {
        // If all criteria in set 1 are >= corresponding in set 2, score should be >=
        if (
          criteria1.functionality >= criteria2.functionality &&
          criteria1.completeness >= criteria2.completeness &&
          criteria1.errorHandling >= criteria2.errorHandling &&
          criteria1.uxAccessibility >= criteria2.uxAccessibility
        ) {
          const score1 = ModuleEvaluator.computeScore(criteria1);
          const score2 = ModuleEvaluator.computeScore(criteria2);
          expect(score1).toBeGreaterThanOrEqual(score2 - 0.001); // floating point tolerance
        }
      })
    );
  });

  it('clamping: out-of-range criteria are bounded to 0-10', () => {
    const unboundedCriteria = fc.record({
      functionality: fc.double({ min: -100, max: 100, noNaN: true }),
      completeness: fc.double({ min: -100, max: 100, noNaN: true }),
      errorHandling: fc.double({ min: -100, max: 100, noNaN: true }),
      uxAccessibility: fc.double({ min: -100, max: 100, noNaN: true }),
    }) as fc.Arbitrary<EvaluationCriteria>;

    fc.assert(
      fc.property(
        moduleNameArb,
        unboundedCriteria,
        strengthsArb,
        weaknessesArb,
        (name, criteria, strengths, weaknesses) => {
          const evaluator = new ModuleEvaluator();
          const result = evaluator.evaluate(name, criteria, { strengths, weaknesses });

          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(10);
          expect(result.criteria.functionality).toBeGreaterThanOrEqual(0);
          expect(result.criteria.functionality).toBeLessThanOrEqual(10);
          expect(result.criteria.completeness).toBeGreaterThanOrEqual(0);
          expect(result.criteria.completeness).toBeLessThanOrEqual(10);
          expect(result.criteria.errorHandling).toBeGreaterThanOrEqual(0);
          expect(result.criteria.errorHandling).toBeLessThanOrEqual(10);
          expect(result.criteria.uxAccessibility).toBeGreaterThanOrEqual(0);
          expect(result.criteria.uxAccessibility).toBeLessThanOrEqual(10);
        }
      )
    );
  });
});
