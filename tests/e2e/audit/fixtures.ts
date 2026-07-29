import { test as base, expect } from '@playwright/test';
import { ErrorCollector } from '../utils/error-collector';
import { ScreenshotManager } from '../utils/screenshot-manager';
import { ModuleEvaluator } from '../utils/module-evaluator';

import type { ErrorCollectorData } from '../utils/error-collector';
import type { ModuleEvaluation } from '../utils/module-evaluator';

// ─── Extended Fixtures ───────────────────────────────────────────────────────

export interface AuditFixtures {
  errorCollector: ErrorCollector;
  screenshotManager: ScreenshotManager;
  moduleEvaluator: ModuleEvaluator;
  /** Navigates to a module page with auto-retry and auth check */
  auditPage: {
    goto: (path: string) => Promise<void>;
    waitForReady: () => Promise<void>;
  };
}

// ─── Shared instances (worker-scoped for cross-test access) ──────────────────

export const test = base.extend<AuditFixtures>({
  errorCollector: async ({}, use) => {
    const collector = new ErrorCollector();
    await use(collector);
  },

  screenshotManager: async ({}, use) => {
    const manager = new ScreenshotManager();
    await use(manager);
  },

  moduleEvaluator: async ({}, use) => {
    const evaluator = new ModuleEvaluator();
    await use(evaluator);
  },

  auditPage: async ({ page }, use) => {
    const auditPage = {
      goto: async (path: string) => {
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Check if we got redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('/login') || currentUrl.endsWith('/')) {
          throw new Error(
            `Redirected to login from ${path}. StorageState may be expired.`
          );
        }
      },

      waitForReady: async () => {
        // Wait for main content to be rendered
        await page.waitForSelector('main, [role="main"], #__next', {
          timeout: 10000,
        }).catch(() => {
          // Some pages may not have main landmark
        });
        // Small delay for client-side hydration
        await page.waitForTimeout(500);
      },
    };

    await use(auditPage);
  },
});

export { expect };

// ─── Types re-exported for convenience ───────────────────────────────────────

export type { ErrorCollectorData, ModuleEvaluation };
