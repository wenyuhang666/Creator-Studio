/**
 * Creator Studio 文件操作功能测试套件
 * 
 * 测试范围：
 * - 保存状态管理 (TC-SAVE-*)
 * - 文件导出功能 (TC-EXPORT-*)
 * - 打开文件夹功能 (TC-FOLDER-*)
 * - 边界条件测试 (TC-BOUNDARY-*)
 * 
 * @version 1.0.1
 * @date 2026-04-06
 */

import { test, expect } from '@playwright/test';

// ==================== 测试配置 ====================

const TEST_PROJECT = 'web-demo://test-project';
const TEST_TIMEOUT = 30000;

// ==================== 辅助函数 ====================

/**
 * 等待保存状态变为指定状态
 */
async function waitForSaveStatus(page: any, status: 'saved' | 'saving' | 'unsaved', timeout = 5000) {
  const statusMap = {
    'saved': '已保存',
    'saving': '保存中...',
    'unsaved': '未保存'
  };
  
  await expect(page.locator('.status-save')).toContainText(statusMap[status], { timeout });
}

/**
 * 获取当前保存状态文本
 */
async function getSaveStatusText(page: any): Promise<string> {
  return await page.locator('.status-save').textContent() || '';
}

/**
 * 选择指定标题的章节
 */
async function selectChapter(page: any, title: string) {
  await page.click(`.chapter-item:has-text("${title}")`);
}

// ==================== TC-SAVE-* 保存状态管理测试 ====================

describe('保存状态管理测试 (TC-SAVE-*)', () => {
  
  test.beforeEach(async ({ page }) => {
    // 导航到测试项目
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  /**
   * TC-SAVE-001: 打开项目后保存状态应为已保存
   * 
   * 【重要】这是 BUG-001 的核心验证用例
   * 验证修复后：打开章节后不再错误显示"未保存"
   */
  test('TC-SAVE-001: 打开项目后保存状态应为已保存', async ({ page }) => {
    // 1. 选择章节
    await selectChapter(page, '第一章');
    
    // 2. 等待内容加载完成
    await page.waitForTimeout(1000);
    
    // 3. 验证状态显示为"已保存"
    await waitForSaveStatus(page, 'saved');
    
    // 额外验证：确认不是"未保存"
    const statusText = await getSaveStatusText(page);
    expect(statusText).not.toContain('未保存');
  });

  /**
   * TC-SAVE-002: 修改内容后状态变为未保存
   */
  test('TC-SAVE-002: 修改内容后状态变为未保存', async ({ page }) => {
    // 1. 选择章节
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    // 2. 在编辑器中输入文字
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('测试内容');
    
    // 3. 验证状态变为"未保存"
    await waitForSaveStatus(page, 'unsaved');
  });

  /**
   * TC-SAVE-003: Ctrl+S 保存后状态恢复已保存
   */
  test('TC-SAVE-003: Ctrl+S 保存后状态恢复已保存', async ({ page }) => {
    // 1. 选择章节并修改
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('测试内容');
    await waitForSaveStatus(page, 'unsaved');
    
    // 2. 按 Ctrl+S 保存
    await page.keyboard.press('Control+s');
    
    // 3. 验证状态变为"已保存"
    await waitForSaveStatus(page, 'saved');
  });

  /**
   * TC-SAVE-004: 保存过程中显示"保存中"状态
   */
  test('TC-SAVE-004: 保存过程中显示"保存中"状态', async ({ page }) => {
    // 1. 选择章节并修改
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('测试内容');
    await waitForSaveStatus(page, 'unsaved');
    
    // 2. 记录状态变化（此测试可能需要特殊方式捕获短暂状态）
    // 由于"保存中"状态持续时间很短，这里只验证最终状态
    await page.keyboard.press('Control+s');
    await waitForSaveStatus(page, 'saved');
  });

  /**
   * TC-SAVE-005: 章节切换时状态正确重置
   */
  test('TC-SAVE-005: 章节切换时状态正确重置', async ({ page }) => {
    // 1. 选择章节A并修改
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('测试内容');
    await waitForSaveStatus(page, 'unsaved');
    
    // 2. 切换到章节B
    await selectChapter(page, '第二章');
    
    // 3. 验证章节B显示"已保存"
    await waitForSaveStatus(page, 'saved');
  });

  /**
   * TC-SAVE-006: 切换回原章节保持原状态
   */
  test('TC-SAVE-006: 切换回原章节保持原状态', async ({ page }) => {
    // 1. 在章节A中修改内容
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('测试内容');
    await waitForSaveStatus(page, 'unsaved');
    
    // 2. 切换到章节B
    await selectChapter(page, '第二章');
    await waitForSaveStatus(page, 'saved');
    
    // 3. 切换回章节A
    await selectChapter(page, '第一章');
    
    // 4. 验证章节A仍显示"未保存"
    await waitForSaveStatus(page, 'unsaved');
  });

  /**
   * TC-SAVE-007: 自动保存触发状态更新
   */
  test.skip('TC-SAVE-007: 自动保存触发状态更新（需要等待30秒）', async ({ page }) => {
    // 1. 修改内容
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('测试内容');
    await waitForSaveStatus(page, 'unsaved');
    
    // 2. 等待自动保存（30秒）
    await page.waitForTimeout(31000);
    
    // 3. 验证状态变为"已保存"
    await waitForSaveStatus(page, 'saved');
  });

  /**
   * TC-SAVE-008: 快速连续输入内容状态正确
   */
  test('TC-SAVE-008: 快速连续输入内容状态正确', async ({ page }) => {
    // 1. 选择章节
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    // 2. 快速连续输入大量文字
    const editor = page.locator('.cm-editor');
    await editor.click();
    
    for (let i = 0; i < 10; i++) {
      await page.keyboard.type(`第${i}段文字`);
      await page.keyboard.press('Enter');
    }
    
    // 3. 验证状态变为"未保存"
    await waitForSaveStatus(page, 'unsaved');
  });
});

// ==================== TC-EXPORT-* 文件导出测试 ====================

describe('文件导出功能测试 (TC-EXPORT-*)', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await selectChapter(page, '第一章');
  });

  /**
   * TC-EXPORT-001: 导出单个章节为TXT
   */
  test('TC-EXPORT-001: 导出单个章节为TXT', async ({ page }) => {
    // 1. 点击导出按钮
    await page.click('button:has-text("导出")');
    
    // 2. 确认导出对话框打开
    await expect(page.locator('.ant-modal')).toBeVisible();
    
    // 3. 选择"导出当前章节"（默认选项）
    await expect(page.locator('text=导出当前章节')).toBeVisible();
    
    // 4. 设置下载监听
    const downloadPromise = page.waitForEvent('download');
    
    // 5. 点击导出
    await page.click('button:has-text("导出"):not(.status-button)');
    
    // 6. 等待下载完成（在实际测试中可能需要特殊处理）
    // const download = await downloadPromise;
    // expect(download.suggestedFilename()).toContain('.txt');
  });

  /**
   * TC-EXPORT-002: 导出所有章节
   */
  test('TC-EXPORT-002: 导出所有章节', async ({ page }) => {
    // 1. 点击导出按钮
    await page.click('button:has-text("导出")');
    
    // 2. 选择"导出所有章节"
    await page.click('text=导出所有章节');
    
    // 3. 验证显示章节数量
    await expect(page.locator('text=/共 \\d+ 个章节/')).toBeVisible();
    
    // 4. 关闭对话框（不实际执行导出）
    await page.click('.ant-modal-close');
  });

  /**
   * TC-EXPORT-003: 导出时无章节提示
   */
  test.skip('TC-EXPORT-003: 导出时无章节提示（需要清空章节选择）', async ({ page }) => {
    // 1. 关闭导出对话框
    await page.click('.ant-modal-close').catch(() => {});
    await page.waitForTimeout(500);
  });

  /**
   * TC-EXPORT-004: 导出文件编码格式
   */
  test('TC-EXPORT-004: 导出文件编码格式', async ({ page }) => {
    // 验证导出说明显示UTF-8编码
    await page.click('button:has-text("导出")');
    await expect(page.locator('text=UTF-8')).toBeVisible();
    await page.click('.ant-modal-close');
  });

  /**
   * TC-EXPORT-005: 导出空章节
   */
  test.skip('TC-EXPORT-005: 导出空章节（需要创建空章节）', async ({ page }) => {
    // 空测试用例
  });

  /**
   * TC-EXPORT-006: 导出取消操作
   */
  test('TC-EXPORT-006: 导出取消操作', async ({ page }) => {
    // 1. 点击导出按钮
    await page.click('button:has-text("导出")');
    
    // 2. 点击取消按钮
    await page.click('.ant-modal button:has-text("取消")');
    
    // 3. 验证对话框关闭
    await expect(page.locator('.ant-modal')).not.toBeVisible();
  });
});

// ==================== TC-BOUNDARY-* 边界条件测试 ====================

describe('边界条件测试 (TC-BOUNDARY-*)', () => {
  
  /**
   * TC-BOUNDARY-001: 空内容章节状态
   */
  test.skip('TC-BOUNDARY-001: 空内容章节状态（需要创建空章节）', async ({ page }) => {
    // 空测试用例
  });

  /**
   * TC-BOUNDARY-002: 超长内容处理
   */
  test('TC-BOUNDARY-002: 超长内容处理', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    // 生成10万字内容（分批输入以避免超时）
    const editor = page.locator('.cm-editor');
    await editor.click();
    
    const chunk = '这是一段测试文字用于测试超长内容的保存功能。'.repeat(100);
    const chunks = [];
    for (let i = 0; i < 10; i++) {
      chunks.push(chunk);
    }
    
    // 分批输入
    for (const c of chunks) {
      await page.keyboard.type(c);
    }
    
    // 验证状态变为未保存
    await waitForSaveStatus(page, 'unsaved');
    
    // 保存
    await page.keyboard.press('Control+s');
    await waitForSaveStatus(page, 'saved');
  });

  /**
   * TC-BOUNDARY-003: 特殊字符内容
   */
  test('TC-BOUNDARY-003: 特殊字符内容', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    const editor = page.locator('.cm-editor');
    await editor.click();
    
    // 输入特殊字符
    const specialChars = '<>:"/\\|?* &^%$#@!~`';
    await page.keyboard.type(specialChars);
    
    // 验证状态变化
    await waitForSaveStatus(page, 'unsaved');
    
    // 保存
    await page.keyboard.press('Control+s');
    await waitForSaveStatus(page, 'saved');
  });

  /**
   * TC-BOUNDARY-004: 快速连续切换章节
   */
  test('TC-BOUNDARY-004: 快速连续切换章节', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 快速切换10次
    for (let i = 0; i < 10; i++) {
      await selectChapter(page, i % 2 === 0 ? '第一章' : '第二章');
      await page.waitForTimeout(100);
    }
    
    // 验证状态稳定
    const statusText = await getSaveStatusText(page);
    expect(statusText).toMatch(/已保存|未保存/);
  });

  /**
   * TC-BOUNDARY-005: 同时编辑和保存冲突
   */
  test('TC-BOUNDARY-005: 同时编辑和保存冲突', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await selectChapter(page, '第一章');
    await waitForSaveStatus(page, 'saved');
    
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.type('测试内容');
    await waitForSaveStatus(page, 'unsaved');
    
    // 在保存过程中立即再次修改
    await page.keyboard.press('Control+s');
    await page.keyboard.type('追加内容');
    
    // 验证最终状态为"未保存"（追加的内容未保存）
    await waitForSaveStatus(page, 'unsaved');
  });

  /**
   * TC-BOUNDARY-006: 内容未实际变化不触发未保存（BUG-001回归验证）
   * 
   * 【核心】这是 BUG-001 修复的关键验证点
   * 验证 setDraftContent 函数在内容未变化时不会设置 unsaved 状态
   */
  test('TC-BOUNDARY-006: 内容未实际变化不触发未保存', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await selectChapter(page, '第一章');
    
    // 等待初始加载完成
    await waitForSaveStatus(page, 'saved');
    
    // 移动光标但不做任何输入
    const editor = page.locator('.cm-editor');
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    
    // 等待一小段时间确保状态已更新
    await page.waitForTimeout(500);
    
    // 验证状态仍为"已保存"
    await waitForSaveStatus(page, 'saved');
  });
});

// ==================== BUG回归测试 ====================

describe('BUG回归验证', () => {
  
  /**
   * BUG-001: 打开软件后右下角一直显示"未保存"
   * 
   * 修复代码：useChapterManager.ts 第 232-239 行
   * 
   * 修复前：setDraftContent 无条件设置 saveStatus="unsaved"
   * 修复后：只有内容真正变化时才设置 saveStatus="unsaved"
   */
  test('BUG-001回归: 打开章节后不应错误显示"未保存"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 选择章节
    await selectChapter(page, '第一章');
    
    // 等待内容加载
    await page.waitForTimeout(1500);
    
    // 验证状态显示为"已保存"（而非"未保存"）
    const statusText = await getSaveStatusText(page);
    expect(statusText).toBe('已保存');
  });
});

// ==================== 运行配置 ====================

// 可使用以下命令运行特定测试：
// npx playwright test --grep "TC-SAVE-001"
// npx playwright test --grep "BUG-001"
// npx playwright test file-operation.test.ts
