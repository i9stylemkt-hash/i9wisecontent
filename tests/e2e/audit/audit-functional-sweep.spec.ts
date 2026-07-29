import { test, expect } from './fixtures';

/**
 * Varredura Funcional Completa
 * Testa todas as páginas, botões, links e ações do app
 * para identificar funcionalidades desconectadas ou inativas.
 */

interface DeadAction {
  page: string;
  element: string;
  text: string;
  issue: string;
}

const ALL_ROUTES = [
  '/dashboard',
  '/blogs',
  '/articles',
  '/ideas',
  '/calendar',
  '/pipeline',
  '/templates',
  '/prompts',
  '/settings',
];

test.describe('Audit: Varredura Funcional Completa', () => {
  const deadActions: DeadAction[] = [];
  const orphanLinks: DeadAction[] = [];
  const brokenInteractions: DeadAction[] = [];

  test.afterAll(async () => {
    // Output final report
    const report = {
      deadActions,
      orphanLinks,
      brokenInteractions,
      summary: {
        totalDeadActions: deadActions.length,
        totalOrphanLinks: orphanLinks.length,
        totalBrokenInteractions: brokenInteractions.length,
      },
    };
    console.log('\n═══ RELATÓRIO DE VARREDURA FUNCIONAL ═══');
    console.log(JSON.stringify(report, null, 2));
  });

  test('01 - Verificar links da sidebar levam a páginas válidas', async ({
    page,
    auditPage,
  }) => {
    await auditPage.goto('/dashboard');
    await auditPage.waitForReady();

    for (const route of ALL_ROUTES) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = response?.status() || 0;
      const currentUrl = page.url();

      if (status >= 400 || currentUrl.includes('/login')) {
        orphanLinks.push({
          page: '/sidebar',
          element: 'link',
          text: route,
          issue: status >= 400
            ? `HTTP ${status} - Página retorna erro`
            : 'Redireciona para /login (pode ser problema de auth)',
        });
      }

      // Verifica se a página renderiza conteúdo principal
      const hasContent = await page.locator('main, [role="main"]').count();
      if (hasContent === 0 && !currentUrl.includes('/login')) {
        orphanLinks.push({
          page: route,
          element: 'main',
          text: 'Conteúdo principal',
          issue: 'Página não renderiza elemento <main>',
        });
      }
      await page.waitForTimeout(500);
    }
  });

  test('02 - Verificar botões de ação em cada página', async ({
    page,
    auditPage,
  }) => {
    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const buttons = page.locator('button:visible');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const text = ((await btn.textContent()) || '').trim();
        const isDisabled = await btn.isDisabled();
        const ariaLabel = await btn.getAttribute('aria-label');
        const btnName = text || ariaLabel || `button[${i}]`;

        // Skip navigation toggle buttons and theme buttons
        if (btnName.includes('theme') || btnName.includes('sidebar')) continue;

        // Check if button has an onclick or is purely decorative
        const hasHandler = await btn.evaluate((el) => {
          // Check for onclick, React event handlers, etc.
          const events = (el as any).__reactFiber$ || (el as any).__reactEvents$;
          return el.onclick !== null || !!events;
        }).catch(() => false);

        if (!hasHandler && !isDisabled && text) {
          deadActions.push({
            page: route,
            element: 'button',
            text: btnName,
            issue: 'Botão sem handler de click detectável',
          });
        }
      }
    }
  });

  test('03 - Verificar links internos não levam a 404', async ({
    page,
    auditPage,
  }) => {
    const checkedLinks = new Set<string>();

    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      const links = page.locator('a[href^="/"]');
      const count = await links.count();

      for (let i = 0; i < Math.min(count, 20); i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        if (!href || checkedLinks.has(href)) continue;
        checkedLinks.add(href);

        const response = await page.goto(href, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        }).catch(() => null);

        if (response && response.status() === 404) {
          orphanLinks.push({
            page: route,
            element: 'link',
            text: href,
            issue: `Link leva a 404: ${href}`,
          });
        }
      }
    }
  });

  test('04 - Verificar CTAs principais funcionam (Criar, Novo, Gerar)', async ({
    page,
    auditPage,
  }) => {
    const ctaPatterns = [
      { route: '/blogs', selector: 'button:has-text("Criar"), button:has-text("Novo"), a:has-text("Criar"), a:has-text("Novo")' },
      { route: '/articles', selector: 'button:has-text("Criar"), button:has-text("Novo"), a:has-text("Criar"), a:has-text("Novo")' },
      { route: '/ideas', selector: 'button:has-text("Criar"), button:has-text("Nova"), a:has-text("Nova"), a:has-text("Criar")' },
      { route: '/pipeline', selector: 'button:has-text("Gerar"), button:has-text("Executar")' },
      { route: '/templates', selector: 'button:has-text("Criar"), button:has-text("Novo"), a:has-text("Criar")' },
      { route: '/prompts', selector: 'button:has-text("Criar"), button:has-text("Novo"), a:has-text("Criar")' },
    ];

    for (const { route, selector } of ctaPatterns) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const cta = page.locator(selector);
      const count = await cta.count();

      if (count === 0) {
        deadActions.push({
          page: route,
          element: 'CTA',
          text: 'Nenhum botão de ação primária encontrado',
          issue: `Página ${route} não tem CTA (Criar/Novo/Gerar)`,
        });
        continue;
      }

      // Tenta clicar e verifica o que acontece
      const urlBefore = page.url();
      const firstCta = cta.first();
      const ctaText = ((await firstCta.textContent()) || '').trim();

      await firstCta.click().catch(() => {});
      await page.waitForTimeout(2000);

      const urlAfter = page.url();
      const hasDialog = await page.locator('[role="dialog"], [aria-modal="true"]').count();
      const hasForm = await page.locator('form, input, textarea').count();
      const hasLoading = await page.locator('[class*="animate"], [class*="loading"]').count();

      // Se o URL não mudou, não abriu dialog, e não tem form/loading
      if (urlAfter === urlBefore && hasDialog === 0 && hasForm === 0 && hasLoading === 0) {
        deadActions.push({
          page: route,
          element: 'CTA button',
          text: ctaText,
          issue: 'Botão CTA não produz nenhuma ação visível (sem navegação, dialog ou loading)',
        });
      }
    }
  });

  test('05 - Verificar formulários têm submit funcional', async ({
    page,
    auditPage,
  }) => {
    const formPages = ['/settings', '/blogs/new', '/settings/ai-models'];

    for (const route of formPages) {
      const response = await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }).catch(() => null);

      if (!response || response.status() >= 400) continue;
      await page.waitForTimeout(2000);

      const forms = page.locator('form');
      const formCount = await forms.count();

      if (formCount === 0) {
        // Check for save buttons (some forms don't use <form>)
        const saveBtn = page.locator(
          'button:has-text("Salvar"), button:has-text("Save"), button[type="submit"]'
        );
        const saveBtnCount = await saveBtn.count();
        if (saveBtnCount === 0) {
          deadActions.push({
            page: route,
            element: 'form',
            text: 'Formulário',
            issue: `Página ${route} não tem formulário nem botão de salvar`,
          });
        }
      }

      // Check submit buttons inside forms
      for (let i = 0; i < formCount; i++) {
        const form = forms.nth(i);
        const submitBtn = form.locator('button[type="submit"], button:has-text("Salvar")');
        const submitCount = await submitBtn.count();

        if (submitCount === 0) {
          deadActions.push({
            page: route,
            element: 'form',
            text: `Formulário #${i + 1}`,
            issue: 'Formulário sem botão de submit',
          });
        }
      }
    }
  });

  test('06 - Verificar selects e dropdowns funcionam', async ({
    page,
    auditPage,
  }) => {
    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Native selects
      const selects = page.locator('select:visible');
      const selectCount = await selects.count();

      for (let i = 0; i < selectCount; i++) {
        const select = selects.nth(i);
        const options = await select.locator('option').count();

        if (options <= 1) {
          const name = await select.getAttribute('name') || `select[${i}]`;
          brokenInteractions.push({
            page: route,
            element: 'select',
            text: name,
            issue: `Select "${name}" tem ${options} opção(ões) - pode estar vazio/sem dados`,
          });
        }
      }

      // Custom dropdown triggers (base-ui)
      const dropdownTriggers = page.locator(
        '[data-slot="dropdown-menu-trigger"]:visible, button[aria-haspopup]:visible'
      );
      const triggerCount = await dropdownTriggers.count();

      for (let i = 0; i < Math.min(triggerCount, 5); i++) {
        const trigger = dropdownTriggers.nth(i);
        await trigger.click().catch(() => {});
        await page.waitForTimeout(500);

        const popup = page.locator(
          '[data-slot="dropdown-menu-content"]:visible, [role="menu"]:visible'
        );
        const popupCount = await popup.count();

        if (popupCount === 0) {
          const text = ((await trigger.textContent()) || '').trim();
          brokenInteractions.push({
            page: route,
            element: 'dropdown',
            text: text || `dropdown[${i}]`,
            issue: 'Dropdown trigger não abre menu',
          });
        } else {
          // Fechar o dropdown
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }
    }
  });

  test('07 - Verificar mensagens de estado vazio com ações', async ({
    page,
    auditPage,
  }) => {
    // Páginas que mostram empty states com botões de ação
    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Procura empty states (texto + botão de ação)
      const emptyStates = page.locator(
        '[class*="empty"], [class*="no-data"], [class*="placeholder"]'
      );
      const emptyStateTexts = page.locator(
        'text="Nenhum", text="Nenhuma", text="Sem ", text="Ainda não"'
      );

      const hasEmpty = (await emptyStates.count()) > 0 || (await emptyStateTexts.count()) > 0;

      if (hasEmpty) {
        // Verifica se há botão de ação dentro do empty state
        const emptyActions = page.locator(
          'button:has-text("Criar"), button:has-text("Adicionar"), a:has-text("Criar"), a:has-text("Começar")'
        );
        const actionCount = await emptyActions.count();

        if (actionCount > 0) {
          const actionBtn = emptyActions.first();
          const actionText = ((await actionBtn.textContent()) || '').trim();
          const urlBefore = page.url();

          await actionBtn.click().catch(() => {});
          await page.waitForTimeout(1500);

          const urlAfter = page.url();
          const hasDialog = await page.locator('[role="dialog"]').count();

          if (urlAfter === urlBefore && hasDialog === 0) {
            deadActions.push({
              page: route,
              element: 'empty-state-action',
              text: actionText,
              issue: 'Botão no empty state não produz ação',
            });
          }
        }
      }
    }
  });

  test('08 - Verificar API responses e erros de rede', async ({
    page,
    auditPage,
  }) => {
    const apiErrors: DeadAction[] = [];

    // Interceptar chamadas de API
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 400) {
        apiErrors.push({
          page: page.url(),
          element: 'api',
          text: url,
          issue: `API retornou ${response.status()}: ${url}`,
        });
      }
    });

    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    // Adicionar erros de API ao relatório
    for (const err of apiErrors) {
      brokenInteractions.push(err);
    }
  });

  test('09 - Verificar console errors em todas as páginas', async ({
    page,
    auditPage,
  }) => {
    const consoleErrors: DeadAction[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignorar erros conhecidos/irrelevantes
        if (text.includes('favicon') || text.includes('analytics')) return;
        consoleErrors.push({
          page: page.url(),
          element: 'console',
          text: text.substring(0, 200),
          issue: 'Erro no console',
        });
      }
    });

    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
    }

    for (const err of consoleErrors) {
      brokenInteractions.push(err);
    }
  });

  test('10 - Verificar sub-páginas e rotas dinâmicas', async ({
    page,
    auditPage,
  }) => {
    const subRoutes = [
      '/settings/ai-models',
      '/settings/profile',
      '/blogs/new',
    ];

    for (const route of subRoutes) {
      const response = await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }).catch(() => null);

      if (!response) {
        orphanLinks.push({
          page: route,
          element: 'page',
          text: route,
          issue: `Rota ${route} não responde (timeout ou crash)`,
        });
        continue;
      }

      const status = response.status();
      if (status === 404) {
        orphanLinks.push({
          page: route,
          element: 'page',
          text: route,
          issue: `Rota ${route} retorna 404`,
        });
      } else if (status >= 500) {
        orphanLinks.push({
          page: route,
          element: 'page',
          text: route,
          issue: `Rota ${route} retorna ${status} (Server Error)`,
        });
      }
    }
  });

  test('11 - Gerar relatório final', async () => {
    // Este teste apenas imprime o relatório consolidado
    const total = deadActions.length + orphanLinks.length + brokenInteractions.length;
    console.log(`\n🔍 Total de problemas encontrados: ${total}`);
    console.log(`   - Ações mortas (botões sem função): ${deadActions.length}`);
    console.log(`   - Links órfãos (levam a lugar nenhum): ${orphanLinks.length}`);
    console.log(`   - Interações quebradas: ${brokenInteractions.length}`);

    if (deadActions.length > 0) {
      console.log('\n❌ AÇÕES MORTAS:');
      deadActions.forEach((a) => console.log(`   [${a.page}] ${a.text}: ${a.issue}`));
    }
    if (orphanLinks.length > 0) {
      console.log('\n🔗 LINKS ÓRFÃOS:');
      orphanLinks.forEach((l) => console.log(`   [${l.page}] ${l.text}: ${l.issue}`));
    }
    if (brokenInteractions.length > 0) {
      console.log('\n⚠️  INTERAÇÕES QUEBRADAS:');
      brokenInteractions.forEach((b) => console.log(`   [${b.page}] ${b.text}: ${b.issue}`));
    }

    // Fail the test if critical issues found
    expect(
      orphanLinks.filter((l) => l.issue.includes('404')).length,
      'Existem links que levam a 404'
    ).toBe(0);
  });
});
