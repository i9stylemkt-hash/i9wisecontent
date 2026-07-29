import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Strip ANSI escape codes from a string for clean markdown output.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

interface AuditTestResult {
  title: string;
  module: string;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  errors: string[];
}

interface AuditResultsJson {
  metadata: {
    startTime: number;
    endTime: number;
    duration: number;
    nodeVersion: string;
    playwrightVersion: string;
    appVersion: string;
    os: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
  };
  tests: AuditTestResult[];
  modulesSummary: Record<
    string,
    { total: number; passed: number; failed: number; skipped: number }
  >;
}

// ─── Audit Reporter ──────────────────────────────────────────────────────────

class AuditReporter implements Reporter {
  private startTime = 0;
  private tests: AuditTestResult[] = [];
  private outputPath: string;

  constructor() {
    this.outputPath = path.resolve(
      process.cwd(),
      'tests/e2e/audit/audit-results.json'
    );
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
    console.log('\n🔍 Playwright Audit Suite — Starting...\n');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Extract module name from file path (audit-{module}.spec.ts)
    const file = test.location.file;
    const match = path.basename(file).match(/^audit-(.+)\.spec\.ts$/);
    const module = match ? match[1] : 'unknown';

    const errors = result.errors.map((e) => stripAnsi(e.message ?? String(e)));

    this.tests.push({
      title: test.title,
      module,
      status: result.status,
      duration: result.duration,
      errors,
    });

    // Log progress
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    console.log(`  ${icon} [${module}] ${test.title} (${result.duration}ms)`);
  }

  async onEnd(result: FullResult): Promise<void> {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Build module summary
    const modulesSummary: AuditResultsJson['modulesSummary'] = {};
    for (const t of this.tests) {
      if (!modulesSummary[t.module]) {
        modulesSummary[t.module] = { total: 0, passed: 0, failed: 0, skipped: 0 };
      }
      const summary = modulesSummary[t.module]!;
      summary.total++;
      if (t.status === 'passed') summary.passed++;
      else if (t.status === 'failed' || t.status === 'timedOut') summary.failed++;
      else summary.skipped++;
    }

    // Read app version from package.json
    let appVersion = '0.0.0';
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')
      );
      appVersion = pkg.version ?? '0.0.0';
    } catch {
      // ignore
    }

    // Read Playwright version
    let playwrightVersion = 'unknown';
    try {
      const pwPkg = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), 'node_modules/@playwright/test/package.json'),
          'utf-8'
        )
      );
      playwrightVersion = pwPkg.version ?? 'unknown';
    } catch {
      // ignore
    }

    const passed = this.tests.filter((t) => t.status === 'passed').length;
    const failed = this.tests.filter(
      (t) => t.status === 'failed' || t.status === 'timedOut'
    ).length;
    const skipped = this.tests.filter(
      (t) => t.status === 'skipped' || t.status === 'interrupted'
    ).length;

    const output: AuditResultsJson = {
      metadata: {
        startTime: this.startTime,
        endTime,
        duration,
        nodeVersion: process.version,
        playwrightVersion,
        appVersion,
        os: `${os.platform()} ${os.release()}`,
        totalTests: this.tests.length,
        passedTests: passed,
        failedTests: failed,
        skippedTests: skipped,
      },
      tests: this.tests,
      modulesSummary,
    };

    // Write results JSON
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.outputPath, JSON.stringify(output, null, 2), 'utf-8');

    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('📋 AUDIT SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Total: ${this.tests.length} | ✅ ${passed} | ❌ ${failed} | ⏭️ ${skipped}`);
    console.log(`  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Results: ${this.outputPath}`);
    console.log('═'.repeat(60) + '\n');
    console.log('💡 Run "npm run test:audit:report" to generate the Markdown report.');
  }
}

export default AuditReporter;
