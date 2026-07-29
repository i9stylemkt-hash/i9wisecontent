import * as fs from 'fs';
import * as path from 'path';
import { ReportGenerator } from '../utils/report-generator';
import { ModuleEvaluator } from '../utils/module-evaluator';
import type { AuditReport } from '../utils/report-generator';

const RESULTS_PATH = path.resolve(
  process.cwd(),
  'tests/e2e/audit/audit-results.json'
);
const REPORT_OUTPUT_PATH = path.resolve(
  process.cwd(),
  'relatorio-auditoria-playwright.md'
);

async function globalTeardown(): Promise<void> {
  console.log('\n📝 Generating final audit report...');

  // Check if audit-results.json exists
  if (!fs.existsSync(RESULTS_PATH)) {
    console.warn('⚠️  audit-results.json not found. Skipping report generation.');
    return;
  }

  try {
    const rawResults = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
    const generator = new ReportGenerator();

    // Build a minimal AuditReport from the raw JSON results
    // The full report is assembled by the individual spec files writing to a shared store
    // For now, generate a summary report from the test results
    const report = buildReportFromResults(rawResults, generator);

    const markdown = generator.generate(report);
    fs.writeFileSync(REPORT_OUTPUT_PATH, markdown, 'utf-8');

    console.log(`✅ Report generated: ${REPORT_OUTPUT_PATH}`);
    console.log(`   Lines: ${markdown.split('\n').length}`);
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
  }
}

function buildReportFromResults(
  rawResults: Record<string, unknown>,
  generator: ReportGenerator
): AuditReport {
  const metadata = rawResults.metadata as AuditReport['metadata'];
  const modulesSummary = rawResults.modulesSummary as Record<
    string,
    { total: number; passed: number; failed: number; skipped: number }
  >;
  const tests = rawResults.tests as Array<{
    title: string;
    module: string;
    status: string;
    duration: number;
    errors: string[];
  }>;

  // Build module reports from test results
  const modules: AuditReport['modules'] = [];

  for (const [moduleName, summary] of Object.entries(modulesSummary)) {
    const moduleTests = tests.filter((t) => t.module === moduleName);
    const errors = moduleTests
      .filter((t) => t.errors.length > 0)
      .flatMap((t) =>
        t.errors.map((e) => ({
          type: 'console' as const,
          message: e,
          severity: 'important' as const,
          url: '',
          timestamp: Date.now(),
        }))
      );

    // Calculate scores based on pass rate
    const passRate = summary.total > 0 ? summary.passed / summary.total : 0;
    const functionalityScore = Math.round(passRate * 10 * 10) / 10;
    const completenessScore = Math.min(10, Math.round((summary.total / 5) * 10) / 10);
    const errorHandlingScore = errors.length === 0 ? 8 : Math.max(2, 8 - errors.length);
    const uxScore = passRate >= 0.8 ? 7 : passRate >= 0.5 ? 5 : 3;

    const evaluator = new ModuleEvaluator();
    const evaluation = evaluator.evaluate(moduleName, {
      functionality: functionalityScore,
      completeness: completenessScore,
      errorHandling: errorHandlingScore,
      uxAccessibility: uxScore,
    }, {
      strengths: [
        summary.passed > 0 ? `${summary.passed} teste(s) passando` : 'Módulo acessível',
        passRate >= 0.8 ? 'Alta taxa de sucesso' : 'Cobertura de testes presente',
        'Navegação funcional',
      ] as [string, string, string],
      weaknesses: [
        summary.failed > 0 ? `${summary.failed} teste(s) falhando` : 'Sem problemas críticos detectados',
        errors.length > 0 ? `${errors.length} erro(s) encontrado(s)` : 'Cobertura pode ser expandida',
        'Pode beneficiar de mais validações',
      ] as [string, string, string],
    });

    modules.push({
      name: moduleName,
      evaluation,
      errors,
      screenshots: [],
      testsRun: summary.total,
      testsPassed: summary.passed,
      testsFailed: summary.failed,
    });
  }

  // Generate recommendations
  const recommendations = generator.generateRecommendationsFromEvaluations(modules);

  // Detect patterns
  const patterns = generator.detectPatterns(modules);

  return {
    metadata: {
      startTime: metadata?.startTime ?? Date.now(),
      endTime: metadata?.endTime ?? Date.now(),
      duration: metadata?.duration ?? 0,
      nodeVersion: metadata?.nodeVersion ?? process.version,
      playwrightVersion: metadata?.playwrightVersion ?? 'unknown',
      appVersion: metadata?.appVersion ?? '0.1.0',
      os: metadata?.os ?? process.platform,
      baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    },
    modules,
    recommendations,
    patterns,
  };
}

export default globalTeardown;

// Allow running directly with: npx tsx tests/e2e/audit/global-teardown.ts
if (process.argv[1]?.includes('global-teardown')) {
  globalTeardown().catch(console.error);
}
