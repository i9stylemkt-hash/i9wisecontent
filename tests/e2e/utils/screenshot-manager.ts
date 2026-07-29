import type { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScreenshotOptions {
  module: string;
  element: string;
  viewport?: string;
  fullPage?: boolean;
}

export interface ScreenshotRecord {
  path: string;
  relativePath: string;
  module: string;
  element: string;
  timestamp: number;
  viewport?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_SCREENSHOTS = 200;
const SCREENSHOTS_BASE_DIR = path.resolve(
  process.cwd(),
  'tests/e2e/screenshots/audit'
);

// ─── ScreenshotManager ──────────────────────────────────────────────────────

export class ScreenshotManager {
  private records: ScreenshotRecord[] = [];
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? SCREENSHOTS_BASE_DIR;
  }

  /**
   * Capture a screenshot of the page or a specific element.
   * Path pattern: {baseDir}/{module}-{element}-{timestamp}.png
   */
  async capture(page: Page, options: ScreenshotOptions): Promise<ScreenshotRecord> {
    if (this.records.length >= MAX_SCREENSHOTS) {
      // Return a placeholder record without actually capturing
      const record: ScreenshotRecord = {
        path: '',
        relativePath: '',
        module: options.module,
        element: options.element,
        timestamp: Date.now(),
        viewport: options.viewport,
      };
      return record;
    }

    const timestamp = Date.now();
    const filename = this.buildFilename(options.module, options.element, timestamp);
    const fullPath = path.join(this.baseDir, filename);

    // Ensure directory exists
    this.ensureDir(this.baseDir);

    await page.screenshot({
      path: fullPath,
      fullPage: options.fullPage ?? false,
    });

    const record: ScreenshotRecord = {
      path: fullPath,
      relativePath: `tests/e2e/screenshots/audit/${filename}`,
      module: options.module,
      element: options.element,
      timestamp,
      viewport: options.viewport,
    };

    this.records.push(record);
    return record;
  }

  /**
   * Capture an error screenshot with descriptive naming.
   */
  async captureError(
    page: Page,
    module: string,
    errorDescription: string
  ): Promise<ScreenshotRecord> {
    const sanitized = this.toKebabCase(errorDescription).slice(0, 60);
    return this.capture(page, {
      module,
      element: `error-${sanitized}`,
      fullPage: true,
    });
  }

  /**
   * Get all captured screenshot records.
   */
  getRecords(): ScreenshotRecord[] {
    return [...this.records];
  }

  /**
   * Get records filtered by module.
   */
  getByModule(module: string): ScreenshotRecord[] {
    return this.records.filter((r) => r.module === module);
  }

  /**
   * Get total count of screenshots captured.
   */
  getCount(): number {
    return this.records.length;
  }

  /**
   * Check if we've hit the screenshot limit.
   */
  isAtLimit(): boolean {
    return this.records.length >= MAX_SCREENSHOTS;
  }

  /**
   * Clear all screenshot records (does not delete files).
   */
  clear(): void {
    this.records = [];
  }

  /**
   * Clean up screenshot directory (useful before a new audit run).
   */
  cleanDir(): void {
    if (fs.existsSync(this.baseDir)) {
      const files = fs.readdirSync(this.baseDir);
      for (const file of files) {
        if (file.endsWith('.png')) {
          fs.unlinkSync(path.join(this.baseDir, file));
        }
      }
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private buildFilename(module: string, element: string, timestamp: number): string {
    const safeModule = this.toKebabCase(module);
    const safeElement = this.toKebabCase(element);
    return `${safeModule}-${safeElement}-${timestamp}.png`;
  }

  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
