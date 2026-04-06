/**
 * Creator Studio 章节保存状态自动化测试
 * 
 * 运行方式：
 * 1. 确保应用正在运行 (npm run tauri dev)
 * 2. 浏览器打开 http://localhost:1420
 * 3. 运行: node test-suite/cases/chapter-save-status.test.mjs
 * 
 * 测试范围：
 * - TV-001: 打开项目后保存状态应为已保存
 * - TV-002: 章节内容正确加载
 * - TV-003: 章节切换内容正确
 * - TV-004: 未保存保护对话框
 * - TV-005: 文件恢复保存
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:1420';
const TIMEOUT = 10000;

async function runTests() {
  console.log('🚀 开始运行章节保存状态自动化测试\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  try {
    // 1. 导航到应用
    console.log('📍 步骤1: 导航到应用...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    console.log('✅ 应用已加载\n');
    
    // 2. 等待并点击"打开已有项目"按钮
    console.log('📍 步骤2: 打开项目...');
    await page.waitForTimeout(1000);
    
    // 尝试多种方式打开项目
    const openButton = await page.$('button:has-text("打开"), button:has-text("Open"), [data-testid="open-project"], .open-project-button');
    if (openButton) {
      await openButton.click();
      await page.waitForTimeout(500);
    }
    
    // 或者尝试直接进入编辑界面
    const editorArea = await page.$('.editor-area, .cm-editor, [class*="editor"]');
    if (!editorArea) {
      console.log('⚠️ 未找到编辑器区域，尝试刷新...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    // 3. 等待章节列表加载
    console.log('📍 步骤3: 等待章节列表...');
    await page.waitForTimeout(2000);
    
    // 查找章节项
    const chapterItems = await page.$$('.chapter-item, [class*="chapter"], li[class*="chapter"]');
    console.log(`📍 找到 ${chapterItems.length} 个章节项`);
    
    if (chapterItems.length === 0) {
      // 尝试查找其他可能的选择器
      const alternativeItems = await page.$$('div:has-text("第"), span:has-text("章")');
      console.log(`📍 尝试查找替代选择器，找到 ${alternativeItems.length} 个`);
    }
    
    // 3. 获取保存状态
    const getSaveStatus = async () => {
      const statusElement = await page.$('.status-save, .save-status, [class*="save"]');
      if (statusElement) {
        return await statusElement.textContent();
      }
      return '未找到状态元素';
    };
    
    // TV-001: 打开项目后保存状态应为已保存
    console.log('📍 测试 TV-001: 打开项目后保存状态...');
    const status1 = await getSaveStatus();
    const tv001 = status1.includes('已保存') && !status1.includes('未保存');
    results.push({ test: 'TV-001', description: '打开项目后保存状态', status: tv001 ? '✅' : '❌', actual: status1 });
    if (tv001) passed++; else failed++;
    console.log(tv001 ? '✅ 通过' : `❌ 失败 - 实际状态: ${status1}\n`);
    
    // 4. 在编辑器中输入内容
    console.log('📍 步骤4: 在编辑器中输入内容...');
    await page.click('.cm-editor');
    await page.keyboard.type('测试内容123');
    await page.waitForTimeout(500);
    
    const status2 = await getSaveStatus();
    const tv002 = status2.includes('未保存');
    results.push({ test: 'TV-002', description: '修改内容后状态变为未保存', status: tv002 ? '✅' : '❌', actual: status2 });
    if (tv002) passed++; else failed++;
    console.log(tv002 ? '✅ 通过' : `❌ 失败 - 实际状态: ${status2}\n`);
    
    // 5. 尝试切换到第二章（应该弹出确认对话框）
    console.log('📍 测试 TV-004: 未保存保护对话框...');
    await page.click('.chapter-item:has-text("第二章")');
    await page.waitForTimeout(500);
    
    // 检查是否有确认对话框
    const modal = await page.$('.ant-modal');
    const hasModal = modal !== null;
    results.push({ test: 'TV-004', description: '未保存时切换弹出确认对话框', status: hasModal ? '✅' : '❌', actual: hasModal ? '对话框已显示' : '无对话框' });
    if (hasModal) passed++; else failed++;
    console.log(hasModal ? '✅ 通过' : '❌ 失败 - 无确认对话框\n');
    
    // 如果有对话框，点击"不保存，直接切换"
    if (hasModal) {
      await page.click('button:has-text("不保存")');
      await page.waitForTimeout(500);
    }
    
    // 6. 切换到第二章
    console.log('📍 步骤6: 切换到第二章...');
    await page.click('.chapter-item:has-text("第二章")');
    await page.waitForTimeout(1000);
    
    // 7. 获取第二章内容
    const editorContent = await page.$eval('.cm-content', el => el.textContent);
    const hasContent = editorContent && editorContent.length > 0;
    results.push({ test: 'TV-003', description: '章节内容正确加载', status: hasContent ? '✅' : '❌', actual: `内容长度: ${editorContent?.length || 0}` });
    if (hasContent) passed++; else failed++;
    console.log(hasContent ? '✅ 通过' : `❌ 失败 - 内容为空或无内容\n`);
    
    // 8. 测试保存功能
    console.log('📍 测试 TV-006: 手动保存...');
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1000);
    
    const status3 = await getSaveStatus();
    const tv006 = status3.includes('已保存');
    results.push({ test: 'TV-006', description: '手动保存后状态恢复', status: tv006 ? '✅' : '❌', actual: status3 });
    if (tv006) passed++; else failed++;
    console.log(tv006 ? '✅ 通过' : `❌ 失败 - 实际状态: ${status3}\n`);
    
  } catch (error) {
    console.error('❌ 测试执行出错:', error.message);
    failed++;
  } finally {
    await browser.close();
  }
  
  // 输出测试结果汇总
  console.log('\n═══════════════════════════════════════');
  console.log('📊 测试结果汇总');
  console.log('═══════════════════════════════════════');
  console.log(`总计: ${passed + failed} 个测试`);
  console.log(`通过: ${passed} 个 ✅`);
  console.log(`失败: ${failed} 个 ❌`);
  console.log(`通过率: ${Math.round(passed / (passed + failed) * 100)}%\n`);
  
  console.log('详细结果:');
  console.log('───────────────────────────────────────');
  for (const r of results) {
    console.log(`${r.status} ${r.test}: ${r.description}`);
    console.log(`   实际: ${r.actual}`);
  }
  console.log('═══════════════════════════════════════\n');
  
  if (failed > 0) {
    console.log('⚠️  有测试失败，请检查上述结果。\n');
    process.exit(1);
  } else {
    console.log('🎉 所有测试通过！\n');
    process.exit(0);
  }
}

runTests().catch(console.error);
