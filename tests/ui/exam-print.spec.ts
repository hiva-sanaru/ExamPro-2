import { expect, test, type Page } from '@playwright/test';

async function findEmployeeIdByRole(page: Page, roleLabel: string) {
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { level: 1, name: 'ユーザー管理' })).toBeVisible();

  const row = page.locator('tbody tr').filter({ hasText: roleLabel }).first();
  const found = await row.waitFor({ state: 'visible', timeout: 10_000 }).then(
    () => true,
    () => false,
  );
  if (!found) return null;

  return (await row.locator('td').nth(1).textContent())?.trim() || null;
}

test.describe('Exam print preview', () => {
  test('rejects direct access without a system administrator login', async ({ page }) => {
    await page.goto('/admin/exams/nonexistent/print');

    await expect(page.getByText('このページを表示できません', { exact: true })).toBeVisible();
    await expect(page.getByText('問題の出力はシステム管理者のみ利用できます。')).toBeVisible();
    await expect(page.getByRole('link', { name: '試験一覧へ戻る' })).toBeVisible();
  });

  test('opens a saved exam preview and invokes printing', async ({ page }) => {
    const employeeId = await findEmployeeIdByRole(page, 'システム管理者');
    test.skip(!employeeId, 'Firestoreにシステム管理者が登録されていません。');

    await page.evaluate((id) => {
      localStorage.setItem('loggedInUserEmployeeId', id!);
    }, employeeId);
    await page.goto('/admin/dashboard');

    const printLink = page.locator('a[href*="/admin/exams/"][href$="/print"]').first();
    await expect(printLink).toBeVisible();
    await printLink.click();

    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/print$/);
    await expect(page.getByRole('button', { name: '印刷・PDF保存' })).toBeVisible();
    await expect(page.getByRole('link', { name: '試験一覧へ戻る' })).toBeVisible();
    await expect(page.locator('.exam-print-question').first()).toBeVisible();

    const labels = new Set(await page.locator('.exam-print-field-title').allTextContents());
    expect([...labels].sort()).toEqual(['問題文', '採点基準', '模範解答'].sort());

    await page.evaluate(() => {
      window.print = () => document.body.setAttribute('data-print-invoked', 'true');
    });
    await page.getByRole('button', { name: '印刷・PDF保存' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-print-invoked', 'true');

    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.exam-print-actions')).toBeHidden();
    await expect(page.locator('[data-sidebar="sidebar"]')).toBeHidden();

    await page.emulateMedia({ media: 'screen' });
    await page.goto('/admin/exams/does-not-exist/print');
    await expect(page.getByText('試験が見つかりません', { exact: true })).toBeVisible();
  });

  test('hides the output action from headquarters administrators', async ({ page }) => {
    const employeeId = await findEmployeeIdByRole(page, '本部管理者');
    test.skip(!employeeId, 'Firestoreに本部管理者が登録されていません。');

    await page.evaluate((id) => {
      localStorage.setItem('loggedInUserEmployeeId', id!);
    }, employeeId);
    await page.goto('/admin/dashboard');

    await expect(page.locator('a[href*="/admin/exams/"][href$="/print"]')).toHaveCount(0);
    const examLink = page.locator('a[href^="/exam/"]').first();
    await expect(examLink).toBeVisible();
    const examId = (await examLink.getAttribute('href'))?.split('/').pop();

    await page.goto(`/admin/exams/${examId}/print`);
    await expect(page.getByText('このページを表示できません', { exact: true })).toBeVisible();
  });
});
