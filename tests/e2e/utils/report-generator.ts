import type { ModuleEvaluation, MaturityLevel } from './module-evaluator';
import type { CollectedError, ErrorSeverity } from './error-collector';
import type { ScreenshotRecord } from './screenshot-manager';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Strip ANSI escape codes from a string for clean markdown output.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export type RecommendationPriority = 'bloqueante' | 'alta' | 'media' | 'baixa';

export interface Recommendation {
  title: string;
  description: string;
  priority: RecommendationPriority;
  module: string;
  effort: string;
}

export interface ModuleReport {
  name: string;
  evaluation: ModuleEvaluation;
  errors: CollectedError[];
  screenshots: ScreenshotRecord[];
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
}

export interface AuditReport {
  metadata: {
    startTime: number;
    endTime: number;
    duration: number;
    nodeVersion: string;
    playwrightVersion: string;
    appVersion: string;
    os: string;
    baseUrl: string;
  };
  modules: ModuleReport[];
  recommendations: Recommendation[];
  patterns: RecurringPattern[];
}

export interface RecurringPattern {
  description: string;
  occurrences: number;
  modules: string[];
  severity: ErrorSeverity;
}

// ─── ReportGenerator ─────────────────────────────────────────────────────────

export class ReportGenerator {
  /**
   * Generate a complete Markdown audit report.
   */
  generate(data: AuditReport): string {
    const sections: string[] = [];

    sections.push(this.generateHeader(data));
    sections.push(this.generateExecutiveSummary(data));
    sections.push(this.generateModuleResults(data));
    sections.push(this.generateErrorsDetected(data));
    sections.push(this.generateEvaluationsTable(data));
    sections.push(this.generateRecommendations(data));
    sections.push(this.generatePatterns(data));
    sections.push(this.generateEvidence(data));
    sections.push(this.generateFooter(data));

    return sections.join('\n\n');
  }

  /**
   * Detect recurring patterns (same error appearing in 3+ modules).
   */
  detectPatterns(modules: ModuleReport[]): RecurringPattern[] {
    const errorMap = new Map<string, { modules: Set<string>; severity: ErrorSeverity }>();

    for (const mod of modules) {
      for (const error of mod.errors) {
        // Normalize error message for grouping
        const key = this.normalizeErrorMessage(error.message);
        const existing = errorMap.get(key);
        if (existing) {
          existing.modules.add(mod.name);
        } else {
          errorMap.set(key, {
            modules: new Set([mod.name]),
            severity: error.severity,
          });
        }
      }
    }

    const patterns: RecurringPattern[] = [];
    for (const [description, data] of errorMap) {
      if (data.modules.size >= 3) {
        patterns.push({
          description,
          occurrences: data.modules.size,
          modules: [...data.modules],
          severity: data.severity,
        });
      }
    }

    return patterns.sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Generate prioritized recommendations based on evaluation data.
   */
  generateRecommendationsFromEvaluations(modules: ModuleReport[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const mod of modules) {
      const { evaluation } = mod;

      // Critical errors → bloqueante
      const criticalErrors = mod.errors.filter((e) => e.severity === 'critical');
      if (criticalErrors.length > 0) {
        recommendations.push({
          title: `Corrigir erros críticos em ${mod.name}`,
          description: `${criticalErrors.length} erro(s) crítico(s) detectado(s): ${stripAnsi(criticalErrors[0]?.message ?? '').slice(0, 100)}`,
          priority: 'bloqueante',
          module: mod.name,
          effort: 'Alta',
        });
      }

      // Low functionality → alta
      if (evaluation.criteria.functionality < 5) {
        recommendations.push({
          title: `Melhorar funcionalidade de ${mod.name}`,
          description: `Nota de funcionalidade: ${evaluation.criteria.functionality}/10. Funções core não estão operando corretamente.`,
          priority: 'alta',
          module: mod.name,
          effort: 'Alta',
        });
      }

      // Low error handling → media
      if (evaluation.criteria.errorHandling < 5) {
        recommendations.push({
          title: `Implementar tratamento de erros em ${mod.name}`,
          description: `Nota de error handling: ${evaluation.criteria.errorHandling}/10. Faltam feedbacks adequados ao usuário.`,
          priority: 'media',
          module: mod.name,
          effort: 'Média',
        });
      }

      // Low UX → baixa
      if (evaluation.criteria.uxAccessibility < 5) {
        recommendations.push({
          title: `Melhorar UX/Acessibilidade de ${mod.name}`,
          description: `Nota de UX: ${evaluation.criteria.uxAccessibility}/10. Aspectos de usabilidade e acessibilidade precisam atenção.`,
          priority: 'baixa',
          module: mod.name,
          effort: 'Média',
        });
      }
    }

    // Sort by priority
    const priorityOrder: Record<RecommendationPriority, number> = {
      bloqueante: 0,
      alta: 1,
      media: 2,
      baixa: 3,
    };
    return recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  // ─── Private section generators ───────────────────────────────────────────

  private generateHeader(data: AuditReport): string {
    const date = new Date(data.metadata.startTime).toISOString().split('T')[0];
    return [
      '# 📋 Relatório de Auditoria Completa — Playwright',
      '',
      `**Data:** ${date}  `,
      `**Aplicação:** i9 Wise Content v${data.metadata.appVersion}  `,
      `**Base URL:** ${data.metadata.baseUrl}  `,
      `**Duração:** ${this.formatDuration(data.metadata.duration)}  `,
      `**Node:** ${data.metadata.nodeVersion} | **Playwright:** ${data.metadata.playwrightVersion} | **OS:** ${data.metadata.os}`,
    ].join('\n');
  }

  private generateExecutiveSummary(data: AuditReport): string {
    const totalModules = data.modules.length;
    const avgScore = this.averageScore(data.modules);
    const totalErrors = data.modules.reduce((acc, m) => acc + m.errors.length, 0);
    const criticalErrors = data.modules.reduce(
      (acc, m) => acc + m.errors.filter((e) => e.severity === 'critical').length,
      0
    );
    const totalTests = data.modules.reduce((acc, m) => acc + m.testsRun, 0);
    const passedTests = data.modules.reduce((acc, m) => acc + m.testsPassed, 0);
    const maturity = this.getOverallMaturity(avgScore);

    return [
      '## 📊 Resumo Executivo',
      '',
      `| Métrica | Valor |`,
      `|---------|-------|`,
      `| Módulos auditados | ${totalModules} |`,
      `| Nota média | ${avgScore.toFixed(2)}/10 |`,
      `| Maturidade geral | ${maturity} |`,
      `| Total de testes | ${totalTests} |`,
      `| Testes passando | ${passedTests} (${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%) |`,
      `| Erros detectados | ${totalErrors} |`,
      `| Erros críticos | ${criticalErrors} |`,
      `| Recomendações | ${data.recommendations.length} |`,
      `| Padrões recorrentes | ${data.patterns.length} |`,
    ].join('\n');
  }

  private generateModuleResults(data: AuditReport): string {
    const lines: string[] = ['## 🏗️ Resultados por Módulo', ''];

    for (const mod of data.modules) {
      const { evaluation } = mod;
      const emoji = this.maturityEmoji(evaluation.maturity);

      lines.push(`### ${emoji} ${mod.name} — ${evaluation.score}/10 (${evaluation.maturity})`);
      lines.push('');
      lines.push(`| Critério | Nota |`);
      lines.push(`|----------|------|`);
      lines.push(`| Funcionalidade | ${evaluation.criteria.functionality}/10 |`);
      lines.push(`| Completude | ${evaluation.criteria.completeness}/10 |`);
      lines.push(`| Tratamento de Erros | ${evaluation.criteria.errorHandling}/10 |`);
      lines.push(`| UX/Acessibilidade | ${evaluation.criteria.uxAccessibility}/10 |`);
      lines.push('');
      lines.push(`**Pontos Fortes:**`);
      for (const s of evaluation.strengths) {
        lines.push(`- ✅ ${s}`);
      }
      lines.push('');
      lines.push(`**Pontos Fracos:**`);
      for (const w of evaluation.weaknesses) {
        lines.push(`- ⚠️ ${w}`);
      }
      lines.push('');
      lines.push(`> ${evaluation.justification}`);
      lines.push('');

      if (mod.errors.length > 0) {
        lines.push(`**Erros (${mod.errors.length}):**`);
        for (const err of mod.errors.slice(0, 5)) {
          lines.push(`- \`[${err.severity}]\` ${stripAnsi(err.message).slice(0, 120)}`);
        }
        if (mod.errors.length > 5) {
          lines.push(`- _...e mais ${mod.errors.length - 5} erro(s)_`);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateErrorsDetected(data: AuditReport): string {
    const allErrors = data.modules.flatMap((m) =>
      m.errors.map((e) => ({ ...e, module: m.name }))
    );

    if (allErrors.length === 0) {
      return ['## 🐛 Erros Detectados', '', 'Nenhum erro detectado durante a auditoria.'].join('\n');
    }

    const lines: string[] = [
      '## 🐛 Erros Detectados',
      '',
      `Total: **${allErrors.length}** erros`,
      '',
      '| Módulo | Tipo | Severidade | Mensagem |',
      '|--------|------|------------|----------|',
    ];

    const sorted = allErrors.sort((a, b) => {
      const order: Record<ErrorSeverity, number> = { critical: 0, important: 1, minor: 2 };
      return order[a.severity] - order[b.severity];
    });

    for (const err of sorted.slice(0, 30)) {
      const msg = stripAnsi(err.message).replace(/\|/g, '\\|').slice(0, 80);
      lines.push(`| ${err.module} | ${err.type} | ${err.severity} | ${msg} |`);
    }

    if (sorted.length > 30) {
      lines.push('');
      lines.push(`_Mostrando 30 de ${sorted.length} erros. Consulte audit-results.json para lista completa._`);
    }

    return lines.join('\n');
  }

  private generateEvaluationsTable(data: AuditReport): string {
    const lines: string[] = [
      '## 📈 Avaliações e Notas',
      '',
      '| # | Módulo | Nota | Maturidade | Funcionalidade | Completude | Erros | UX |',
      '|---|--------|------|------------|----------------|------------|-------|-----|',
    ];

    data.modules.forEach((mod, i) => {
      const e = mod.evaluation;
      lines.push(
        `| ${i + 1} | ${mod.name} | **${e.score}** | ${e.maturity} | ${e.criteria.functionality} | ${e.criteria.completeness} | ${e.criteria.errorHandling} | ${e.criteria.uxAccessibility} |`
      );
    });

    return lines.join('\n');
  }

  private generateRecommendations(data: AuditReport): string {
    if (data.recommendations.length === 0) {
      return ['## 🎯 Recomendações Priorizadas', '', 'Nenhuma recomendação gerada.'].join('\n');
    }

    const lines: string[] = ['## 🎯 Recomendações Priorizadas', ''];

    const grouped: Record<RecommendationPriority, Recommendation[]> = {
      bloqueante: [],
      alta: [],
      media: [],
      baixa: [],
    };

    for (const rec of data.recommendations) {
      grouped[rec.priority].push(rec);
    }

    const priorityLabels: Record<RecommendationPriority, string> = {
      bloqueante: '🚨 Bloqueante',
      alta: '🔴 Alta',
      media: '🟡 Média',
      baixa: '🟢 Baixa',
    };

    for (const [priority, label] of Object.entries(priorityLabels) as [RecommendationPriority, string][]) {
      const items = grouped[priority];
      if (items.length === 0) continue;

      lines.push(`### ${label}`);
      lines.push('');
      for (const rec of items) {
        lines.push(`- **${rec.title}** (${rec.module}) — Esforço: ${rec.effort}`);
        lines.push(`  ${rec.description}`);
      }
      lines.push('');
    }

    // Roadmap summary
    lines.push('### 🗺️ Roadmap Sugerido');
    lines.push('');
    lines.push('| Fase | Prioridade | Itens |');
    lines.push('|------|------------|-------|');
    lines.push(`| Imediato | Bloqueante | ${grouped.bloqueante.length} |`);
    lines.push(`| Sprint 1 | Alta | ${grouped.alta.length} |`);
    lines.push(`| Sprint 2-3 | Média | ${grouped.media.length} |`);
    lines.push(`| Backlog | Baixa | ${grouped.baixa.length} |`);

    return lines.join('\n');
  }

  private generatePatterns(data: AuditReport): string {
    if (data.patterns.length === 0) {
      return ['## 🔄 Padrões Recorrentes', '', 'Nenhum padrão recorrente detectado.'].join('\n');
    }

    const lines: string[] = [
      '## 🔄 Padrões Recorrentes',
      '',
      'Erros que aparecem em 3 ou mais módulos indicam problemas sistêmicos:',
      '',
    ];

    for (const pattern of data.patterns) {
      lines.push(`### ⚡ ${pattern.description}`);
      lines.push(`- **Severidade:** ${pattern.severity}`);
      lines.push(`- **Ocorrências:** ${pattern.occurrences} módulos`);
      lines.push(`- **Módulos afetados:** ${pattern.modules.join(', ')}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateEvidence(data: AuditReport): string {
    const allScreenshots = data.modules.flatMap((m) => m.screenshots);

    if (allScreenshots.length === 0) {
      return ['## 📸 Evidências', '', 'Nenhuma captura de tela registrada.'].join('\n');
    }

    const lines: string[] = [
      '## 📸 Evidências',
      '',
      `Total de capturas: **${allScreenshots.length}**`,
      '',
    ];

    // Group by module
    const byModule = new Map<string, ScreenshotRecord[]>();
    for (const ss of allScreenshots) {
      const existing = byModule.get(ss.module) ?? [];
      existing.push(ss);
      byModule.set(ss.module, existing);
    }

    for (const [module, records] of byModule) {
      lines.push(`### ${module} (${records.length} capturas)`);
      for (const record of records.slice(0, 5)) {
        lines.push(`- \`${record.relativePath}\` — ${record.element}`);
      }
      if (records.length > 5) {
        lines.push(`- _...e mais ${records.length - 5} captura(s)_`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateFooter(data: AuditReport): string {
    const endDate = new Date(data.metadata.endTime).toISOString();
    return [
      '---',
      '',
      `_Relatório gerado automaticamente por Playwright Audit Suite em ${endDate}_  `,
      `_Dados completos disponíveis em \`tests/e2e/audit/audit-results.json\`_`,
    ].join('\n');
  }

  // ─── Utility helpers ───────────────────────────────────────────────────────

  private averageScore(modules: ModuleReport[]): number {
    if (modules.length === 0) return 0;
    const sum = modules.reduce((acc, m) => acc + m.evaluation.score, 0);
    return Math.round((sum / modules.length) * 100) / 100;
  }

  private getOverallMaturity(score: number): MaturityLevel {
    if (score >= 8) return 'Completo';
    if (score >= 6) return 'Funcional';
    if (score >= 4) return 'Parcial';
    if (score >= 2) return 'Incompleto';
    return 'Não-Funcional';
  }

  private maturityEmoji(maturity: MaturityLevel): string {
    const map: Record<MaturityLevel, string> = {
      'Completo': '🟢',
      'Funcional': '🔵',
      'Parcial': '🟡',
      'Incompleto': '🟠',
      'Não-Funcional': '🔴',
    };
    return map[maturity];
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private normalizeErrorMessage(message: string): string {
    // Remove dynamic parts like URLs, timestamps, IDs
    return message
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      .replace(/\b[0-9a-f]{8,}\b/gi, '[ID]')
      .replace(/\d{10,}/g, '[TIMESTAMP]')
      .slice(0, 150);
  }
}
