// ─── Types ───────────────────────────────────────────────────────────────────

export type MaturityLevel =
  | 'Completo'
  | 'Funcional'
  | 'Parcial'
  | 'Incompleto'
  | 'Não-Funcional';

export interface EvaluationCriteria {
  /** How well do features work (0-10) */
  functionality: number;
  /** How complete is the feature set (0-10) */
  completeness: number;
  /** How well does it handle errors (0-10) */
  errorHandling: number;
  /** UX quality and accessibility (0-10) */
  uxAccessibility: number;
}

export interface ModuleEvaluation {
  moduleName: string;
  score: number;
  maturity: MaturityLevel;
  criteria: EvaluationCriteria;
  strengths: [string, string, string];
  weaknesses: [string, string, string];
  justification: string;
}

// ─── Weights ─────────────────────────────────────────────────────────────────

const WEIGHTS = {
  functionality: 0.4,
  completeness: 0.25,
  errorHandling: 0.2,
  uxAccessibility: 0.15,
} as const;

// ─── ModuleEvaluator ─────────────────────────────────────────────────────────

export class ModuleEvaluator {
  private evaluations: ModuleEvaluation[] = [];

  /**
   * Evaluate a module based on criteria scores.
   * Formula: (functionality × 0.4) + (completeness × 0.25) + (errorHandling × 0.2) + (ux × 0.15)
   */
  evaluate(
    moduleName: string,
    criteria: EvaluationCriteria,
    analysis: {
      strengths: [string, string, string];
      weaknesses: [string, string, string];
    }
  ): ModuleEvaluation {
    // Clamp all criteria to 0-10
    const clamped: EvaluationCriteria = {
      functionality: this.clamp(criteria.functionality),
      completeness: this.clamp(criteria.completeness),
      errorHandling: this.clamp(criteria.errorHandling),
      uxAccessibility: this.clamp(criteria.uxAccessibility),
    };

    // Calculate weighted score
    const score = this.calculateScore(clamped);

    // Determine maturity level
    const maturity = this.getMaturity(score);

    // Build justification
    const justification = this.buildJustification(moduleName, score, maturity, clamped);

    const evaluation: ModuleEvaluation = {
      moduleName,
      score: Math.round(score * 100) / 100,
      maturity,
      criteria: clamped,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      justification,
    };

    this.evaluations.push(evaluation);
    return evaluation;
  }

  /**
   * Get all module evaluations performed so far.
   */
  getEvaluations(): ModuleEvaluation[] {
    return [...this.evaluations];
  }

  /**
   * Get the average score across all evaluated modules.
   */
  getAverageScore(): number {
    if (this.evaluations.length === 0) return 0;
    const sum = this.evaluations.reduce((acc, e) => acc + e.score, 0);
    return Math.round((sum / this.evaluations.length) * 100) / 100;
  }

  /**
   * Get maturity distribution across all modules.
   */
  getMaturityDistribution(): Record<MaturityLevel, string[]> {
    const distribution: Record<MaturityLevel, string[]> = {
      'Completo': [],
      'Funcional': [],
      'Parcial': [],
      'Incompleto': [],
      'Não-Funcional': [],
    };

    for (const evaluation of this.evaluations) {
      distribution[evaluation.maturity].push(evaluation.moduleName);
    }

    return distribution;
  }

  /**
   * Get the overall system maturity based on average score.
   */
  getOverallMaturity(): MaturityLevel {
    return this.getMaturity(this.getAverageScore());
  }

  /**
   * Clear all stored evaluations.
   */
  clear(): void {
    this.evaluations = [];
  }

  // ─── Static utility ────────────────────────────────────────────────────────

  /**
   * Calculate weighted score from criteria (pure function).
   */
  static computeScore(criteria: EvaluationCriteria): number {
    return (
      criteria.functionality * WEIGHTS.functionality +
      criteria.completeness * WEIGHTS.completeness +
      criteria.errorHandling * WEIGHTS.errorHandling +
      criteria.uxAccessibility * WEIGHTS.uxAccessibility
    );
  }

  /**
   * Get maturity label from score (pure function).
   */
  static computeMaturity(score: number): MaturityLevel {
    if (score >= 8) return 'Completo';
    if (score >= 6) return 'Funcional';
    if (score >= 4) return 'Parcial';
    if (score >= 2) return 'Incompleto';
    return 'Não-Funcional';
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private calculateScore(criteria: EvaluationCriteria): number {
    return ModuleEvaluator.computeScore(criteria);
  }

  private getMaturity(score: number): MaturityLevel {
    return ModuleEvaluator.computeMaturity(score);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(10, value));
  }

  private buildJustification(
    moduleName: string,
    score: number,
    maturity: MaturityLevel,
    criteria: EvaluationCriteria
  ): string {
    const parts: string[] = [
      `O módulo "${moduleName}" obteve nota ${score.toFixed(2)}/10, classificado como "${maturity}".`,
    ];

    // Highlight strongest criterion
    const criteriaEntries = Object.entries(criteria) as [keyof EvaluationCriteria, number][];
    const sorted = [...criteriaEntries].sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    if (strongest) {
      parts.push(
        `Ponto mais forte: ${this.criteriaLabel(strongest[0])} (${strongest[1].toFixed(1)}/10).`
      );
    }
    if (weakest && weakest[1] < 7) {
      parts.push(
        `Área com maior oportunidade de melhoria: ${this.criteriaLabel(weakest[0])} (${weakest[1].toFixed(1)}/10).`
      );
    }

    return parts.join(' ');
  }

  private criteriaLabel(key: keyof EvaluationCriteria): string {
    const labels: Record<keyof EvaluationCriteria, string> = {
      functionality: 'Funcionalidade',
      completeness: 'Completude',
      errorHandling: 'Tratamento de Erros',
      uxAccessibility: 'UX/Acessibilidade',
    };
    return labels[key];
  }
}
