import { expect, test, type Page, type TestInfo } from '@playwright/test';

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

test.describe('Headquarters result visibility controls', () => {
  test('shows headquarters visibility controls to system administrators only', async ({ page }, testInfo: TestInfo) => {
    const employeeId = await findEmployeeIdByRole(page, 'システム管理者');
    test.skip(!employeeId, 'Firestoreにシステム管理者が登録されていません。');

    await page.evaluate((id) => {
      localStorage.setItem('loggedInUserEmployeeId', id!);
    }, employeeId);
    await page.goto('/admin/review');

    await expect(page.getByRole('heading', { level: 1, name: '提出物のレビュー' })).toBeVisible();
    await expect(page.getByText('本部表示', { exact: true })).toBeVisible();
    await expect(page.getByLabel('表示中の提出物をすべて選択')).toBeVisible();
    await page.getByText('本部表示', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('system-administrator-review.png'), fullPage: false });
  });

  test('does not expose headquarters visibility controls to headquarters administrators', async ({ page }, testInfo: TestInfo) => {
    const employeeId = await findEmployeeIdByRole(page, '本部管理者');
    test.skip(!employeeId, 'Firestoreに本部管理者が登録されていません。');

    await page.evaluate((id) => {
      localStorage.setItem('loggedInUserEmployeeId', id!);
    }, employeeId);
    await page.goto('/admin/review');

    await expect(page.getByRole('heading', { level: 1, name: '提出物のレビュー' })).toBeVisible();
    await expect(page.getByRole('button', { name: '提出物をエクスポート' })).toBeEnabled();
    await expect(page.getByText('本部表示', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('表示中の提出物をすべて選択')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('headquarters-administrator-review.png'), fullPage: false });
  });
});
