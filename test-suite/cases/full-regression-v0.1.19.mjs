/**
 * Creator Studio 章节保存状态全量自动化测试
 * 
 * 测试范围（基于今天修复的功能）：
 * 1. 打开项目后保存状态应为"已保存"
 * 2. 章节切换时状态正确
 * 3. 内容修改后状态变为"未保存"
 * 4. 未保存时切换章节弹出确认对话框
 * 5. 保存功能正常工作
 * 6. 视图切换（设置界面）不影响保存状态
 * 
 * 运行方式：
 * 1. 确保应用正在运行 (npm run tauri dev)
 * 2. 浏览器打开 http://localhost:1420
 * 3. 打开一个测试项目
 * 4. 运行: node test-suite/cases/full-regression-v0.1.19.mjs
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:1420';
const TIMEOUT = 15000;

// 测试结果收集
const results = [];
let passed = 0;
let failed = 0;

// 辅助函数：获取保存状态
async function getSaveStatus(page) {
  try {
    // 尝试多种选择器
    const selectors = [
      '.status-save-text',
      '.save-status',
      '[class*="save"]',
      '.ant-badge',
      'span:has-text("已保存")',
      'span:has-text("未保存")',
      'span:has-text("保存中")',
    ];
    
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && (text.includes('保存') || text.includes('saved'))) {
          return text.trim();
        }
      }
    }
    
    // 尝试从 StatusBar 获取
    const statusBar = await page.$('.status-bar, .antd5-layout-footer');
    if (statusBar) {
      return await statusBar.textContent();
    }
    
    return '未找到状态元素';
  } catch (e) {
    return `获取失败: ${e.message}`;
  }
}

// 辅助函数：等待并检查条件
async function waitForCondition(page, condition, maxWait = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    if (await condition()) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

// 测试用例定义
const testCases = [
  // 第一部分：基础状态测试
  {
    id: 'TV-001',
    name: '打开项目后保存状态',
    description: '打开项目后，章节状态应显示为"已保存"',
    priority: 'P0',
    run: async (page) => {
      // 确保编辑器已加载
      await page.waitForTimeout(2000);
      
      const status = await getSaveStatus(page);
      const isSaved = status.includes('已保存') || status.includes('saved');
      
      return {
        pass: isSaved,
        actual: status,
        message: isSaved ? '状态正确显示为已保存' : `状态错误: ${status}`
      };
    }
  },
  
  {
    id: 'TV-002',
    name: '章节内容加载',
    description: '选择章节后，内容应正确显示',
    priority: 'P0',
    run: async (page) => {
      // 等待编辑器加载
      await page.waitForTimeout(1000);
      
      // 检查编辑器是否有内容
      const editorContent = await page.$eval('.cm-content', el => el.textContent).catch(() => '');
      const hasContent = editorContent && editorContent.length > 0;
      
      return {
        pass: hasContent,
        actual: `内容长度: ${editorContent?.length || 0}`,
        message: hasContent ? '内容正确加载' : '内容为空'
      };
    }
  },
  
  // 第二部分：编辑和保存状态
  {
    id: 'TV-003',
    name: '内容修改后状态变为未保存',
    description: '在编辑器中输入内容后，状态应变为"未保存"',
    priority: 'P0',
    run: async (page) => {
      // 点击编辑器
      await page.click('.cm-editor').catch(() => {});
      await page.waitForTimeout(500);
      
      // 输入测试内容
      await page.keyboard.type('测试内容-TV003');
      await page.waitForTimeout(500);
      
      const status = await getSaveStatus(page);
      const isUnsaved = status.includes('未保存') || status.includes('unsaved');
      
      return {
        pass: isUnsaved,
        actual: status,
        message: isUnsaved ? '状态正确变为未保存' : `状态错误: ${status}`
      };
    }
  },
  
  {
    id: 'TV-004',
    name: '手动保存',
    description: '按 Ctrl+S 后，内容应保存，状态变为"已保存"',
    priority: 'P0',
    run: async (page) => {
      // 按 Ctrl+S 保存
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(2000);
      
      const status = await getSaveStatus(page);
      const isSaved = status.includes('已保存') || status.includes('saved');
      
      return {
        pass: isSaved,
        actual: status,
        message: isSaved ? '保存成功，状态正确' : `保存失败: ${status}`
      };
    }
  },
  
  // 第三部分：章节切换
  {
    id: 'TV-005',
    name: '章节切换状态正确',
    description: '在已保存状态下切换章节，状态应保持为"已保存"',
    priority: 'P0',
    run: async (page) => {
      // 确保当前是已保存状态
      await page.waitForTimeout(500);
      
      // 查找章节列表
      const chapterItems = await page.$$('.chapter-item, li[class*="chapter"], div[role="treeitem"]');
      
      if (chapterItems.length < 2) {
        return {
          pass: false,
          actual: `找到 ${chapterItems.length} 个章节`,
          message: '章节数量不足，无法测试切换'
        };
      }
      
      // 点击第二个章节
      await chapterItems[1].click();
      await page.waitForTimeout(1500);
      
      const status = await getSaveStatus(page);
      const isSaved = status.includes('已保存') || status.includes('saved');
      
      return {
        pass: isSaved,
        actual: status,
        message: isSaved ? '切换后状态保持已保存' : `状态错误: ${status}`
      };
    }
  },
  
  {
    id: 'TV-006',
    name: '未保存时切换章节弹出确认',
    description: '有未保存内容时切换章节，应弹出确认对话框',
    priority: 'P0',
    run: async (page) => {
      // 修改当前章节内容
      await page.click('.cm-editor').catch(() => {});
      await page.waitForTimeout(300);
      await page.keyboard.type('-未保存测试');
      await page.waitForTimeout(500);
      
      // 查找章节列表
      const chapterItems = await page.$$('.chapter-item, li[class*="chapter"], div[role="treeitem"]');
      
      if (chapterItems.length < 2) {
        return {
          pass: false,
          actual: '章节数量不足',
          message: '无法测试确认对话框'
        };
      }
      
      // 点击另一个章节
      await chapterItems[0].click();
      await page.waitForTimeout(800);
      
      // 检查是否有确认对话框
      const modal = await page.$('.ant-modal, [role="dialog"], .confirm-dialog');
      const hasModal = modal !== null;
      
      // 如果有对话框，关闭它
      if (hasModal) {
        const cancelBtn = await page.$('button:has-text("取消"), button:has-text("不保存")');
        if (cancelBtn) {
          await cancelBtn.click();
          await page.waitForTimeout(300);
        }
      }
      
      return {
        pass: hasModal,
        actual: hasModal ? '对话框已显示' : '无对话框',
        message: hasModal ? '确认对话框正确弹出' : '未弹出确认对话框'
      };
    }
  },
  
  // 第四部分：视图切换
  {
    id: 'TV-007',
    name: '切换到设置再切回状态正确',
    description: '切换到设置界面后再切回编辑，状态应保持正确',
    priority: 'P0',
    run: async (page) => {
      // 先确保有未保存状态
      await page.click('.cm-editor').catch(() => {});
      await page.waitForTimeout(200);
      
      // 点击设置按钮（ActivityBar 中的设置图标）
      const settingsBtn = await page.$('[aria-label*="设置"], button:has-text("设置"), [data-testid="settings"]');
      if (settingsBtn) {
        await settingsBtn.click();
        await page.waitForTimeout(1000);
        
        // 再切回来
        const editorBtn = await page.$('[aria-label*="章节"], button:has-text("章节")');
        if (editorBtn) {
          await editorBtn.click();
          await page.waitForTimeout(1000);
        }
      }
      
      const status = await getSaveStatus(page);
      // 检查状态是否正常显示（无论是已保存还是未保存，只要不是错误状态就行）
      const isValid = status.includes('保存') || status.includes('saved');
      
      return {
        pass: isValid,
        actual: status,
        message: isValid ? '视图切换后状态正常' : `状态异常: ${status}`
      };
    }
  },
  
  // 第五部分：空章节处理
  {
    id: 'TV-008',
    name: '新建空章节',
    description: '新建章节后，应显示为空内容，状态为已保存',
    priority: 'P1',
    run: async (page) => {
      // 点击新建章节按钮
      const addBtn = await page.$('button:has-text("+"), button:has-text("新建"), button[aria-label*="add"]');
      if (!addBtn) {
        return {
          pass: false,
          actual: '未找到新建按钮',
          message: '无法测试新建章节'
        };
      }
      
      await addBtn.click();
      await page.waitForTimeout(500);
      
      // 在弹出的对话框中输入章节名
      const input = await page.$('.ant-modal input, .ant-input');
      if (input) {
        await input.fill('测试章节-自动测试');
        await page.waitForTimeout(200);
        
        // 点击确认
        const okBtn = await page.$('.ant-modal button:has-text("确定"), .ant-modal button:has-text("创建")');
        if (okBtn) {
          await okBtn.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // 检查内容是否为空
      const editorContent = await page.$eval('.cm-content', el => el.textContent).catch(() => 'error');
      const isEmpty = editorContent === '' || editorContent === 'error';
      
      // 检查状态
      const status = await getSaveStatus(page);
      const isSaved = status.includes('已保存') || status.includes('saved');
      
      return {
        pass: isEmpty && isSaved,
        actual: `内容: ${editorContent?.substring(0, 20)}, 状态: ${status}`,
        message: isEmpty && isSaved ? '新建章节状态正确' : '新建章节状态异常'
      };
    }
  },
  
  // 第六部分：数据一致性
  {
    id: 'TV-009',
    name: '保存后内容一致性',
    description: '保存后重新加载，内容应与保存时一致',
    priority: 'P0',
    run: async (page) => {
      // 输入特定内容
      await page.click('.cm-editor').catch(() => {});
      await page.waitForTimeout(200);
      
      // 全选并替换
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(100);
      await page.keyboard.type('一致性测试内容-12345');
      await page.waitForTimeout(300);
      
      // 保存
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(2000);
      
      // 记录保存后的内容
      const afterSave = await page.$eval('.cm-content', el => el.textContent).catch(() => '');
      
      // 切换章节再切回来
      const chapterItems = await page.$$('.chapter-item, li[class*="chapter"]');
      if (chapterItems.length >= 2) {
        await chapterItems[0].click();
        await page.waitForTimeout(1000);
        await chapterItems[chapterItems.length - 1].click();
        await page.waitForTimeout(1000);
      }
      
      // 检查内容是否一致
      const afterReload = await page.$eval('.cm-content', el => el.textContent).catch(() => '');
      const isConsistent = afterSave === afterReload;
      
      return {
        pass: isConsistent,
        actual: `保存后: ${afterSave?.substring(0, 30)}, 重新加载后: ${afterReload?.substring(0, 30)}`,
        message: isConsistent ? '内容一致' : '内容不一致'
      };
    }
  },
  
  // 第七部分：边界条件
  {
    id: 'TV-010',
    name: '快速连续保存',
    description: '快速连续按 Ctrl+S 应正确处理，不重复保存',
    priority: 'P1',
    run: async (page) => {
      // 修改内容
      await page.click('.cm-editor').catch(() => {});
      await page.waitForTimeout(200);
      await page.keyboard.type('-快速保存测试');
      
      // 快速连续保存
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(100);
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(100);
      await page.keyboard.press('Control+s');
      
      await page.waitForTimeout(2000);
      
      // 检查状态
      const status = await getSaveStatus(page);
      const isSaved = status.includes('已保存') || status.includes('saved');
      
      return {
        pass: isSaved,
        actual: status,
        message: isSaved ? '快速保存处理正确' : `状态异常: ${status}`
      };
    }
  },
];

// 主测试函数
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📦 Creator Studio 章节保存状态全量自动化测试');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`测试时间: ${new Date().toLocaleString()}`);
  console.log(`目标地址: ${BASE_URL}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let browser;
  
  try {
    // 启动浏览器
    console.log('🚀 启动浏览器...\n');
    browser = await chromium.launch({ 
      headless: false, // 改为非无头模式，方便调试
      args: ['--no-sandbox']
    });
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 }
    });
    const page = await context.newPage();
    
    // 设置超时
    page.setDefaultTimeout(TIMEOUT);
    
    // 导航到应用
    console.log('📍 步骤1: 导航到应用...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ 应用已加载\n');
    
    // 步骤2: 打开项目
    console.log('📍 步骤2: 打开测试项目...');
    
    // 尝试多种方式打开项目
    // 方式1: 点击打开项目按钮
    const openButtons = [
      'button:has-text("打开")',
      'button:has-text("打开项目")',
      'button:has-text("Open Project")',
      '[data-testid="open-project"]',
      '.open-project-button',
    ];
    
    let opened = false;
    for (const selector of openButtons) {
      const btn = await page.$(selector);
      if (btn) {
        console.log(`   找到打开按钮: ${selector}`);
        await btn.click();
        await page.waitForTimeout(1000);
        opened = true;
        break;
      }
    }
    
    // 如果没找到按钮，等待用户手动选择项目
    if (!opened) {
      console.log('⚠️ 未找到打开按钮，请在浏览器中手动选择项目...');
      console.log('   按回车键继续测试（或等待10秒自动继续）...');
      
      // 等待最多10秒，让用户选择项目
      await page.waitForTimeout(10000);
    } else {
      // 如果弹出了对话框，等待选择项目
      await page.waitForTimeout(2000);
      
      // 检查是否需要输入路径
      const pathInput = await page.$('input[placeholder*="路径"], input[placeholder*="path"], .folder-input');
      if (pathInput) {
        // 输入测试项目路径
        const testProjectPath = 'C:\\Users\\16053\\Documents\\CreatorProjects\\测试项目';
        await pathInput.fill(testProjectPath);
        await page.waitForTimeout(500);
        
        // 点击确认
        const confirmBtn = await page.$('button:has-text("确认"), button:has-text("确定"), button:has-text("Open")');
        if (confirmBtn) {
          await confirmBtn.click();
        }
      }
    }
    
    // 等待项目加载
    console.log('📍 步骤3: 等待项目加载...');
    await page.waitForTimeout(3000);
    
    // 检查是否加载了编辑器
    const hasEditor = await page.$('.cm-editor, .editor-area, .monaco-editor');
    if (hasEditor) {
      console.log('✅ 编辑器已加载\n');
    } else {
      console.log('⚠️ 编辑器未加载，请在浏览器中手动打开项目...');
      console.log('   按回车键继续测试（或等待15秒自动继续）...');
      await page.waitForTimeout(15000);
    }
    
    // 执行测试用例
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 开始执行测试用例');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    for (const testCase of testCases) {
      const priorityLabel = testCase.priority === 'P0' ? '🔴' : '🟡';
      
      console.log(`${priorityLabel} [${testCase.id}] ${testCase.name}`);
      console.log(`   描述: ${testCase.description}`);
      
      try {
        const result = await testCase.run(page);
        
        if (result.pass) {
          passed++;
          console.log(`   ✅ 通过: ${result.message}`);
          console.log(`   实际: ${result.actual}\n`);
        } else {
          failed++;
          console.log(`   ❌ 失败: ${result.message}`);
          console.log(`   实际: ${result.actual}\n`);
        }
        
        results.push({
          id: testCase.id,
          name: testCase.name,
          priority: testCase.priority,
          status: result.pass ? '✅' : '❌',
          message: result.message,
          actual: result.actual
        });
        
      } catch (error) {
        failed++;
        console.log(`   ❌ 执行异常: ${error.message}\n`);
        
        results.push({
          id: testCase.id,
          name: testCase.name,
          priority: testCase.priority,
          status: '❌',
          message: `执行异常: ${error.message}`,
          actual: 'N/A'
        });
      }
      
      // 测试间隔
      await page.waitForTimeout(500);
    }
    
    // 关闭浏览器
    await browser.close();
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
  
  // 输出汇总
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 测试结果汇总');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n总计: ${passed + failed} 个测试`);
  console.log(`通过: ${passed} 个 ✅`);
  console.log(`失败: ${failed} 个 ❌`);
  console.log(`通过率: ${Math.round(passed / (passed + failed) * 100)}%\n`);
  
  // P0 用例统计
  const p0Results = results.filter(r => r.priority === 'P0');
  const p0Passed = p0Results.filter(r => r.status === '✅').length;
  console.log(`P0用例: ${p0Passed}/${p0Results.length} 通过\n`);
  
  // 详细结果表
  console.log('───────────────────────────────────────────────────────────');
  console.log('详细结果:');
  console.log('───────────────────────────────────────────────────────────');
  console.log('ID      | 优先级 | 状态 | 描述');
  console.log('--------|--------|------|----------------------------------------');
  
  for (const r of results) {
    const name = r.name.length > 35 ? r.name.substring(0, 32) + '...' : r.name;
    console.log(`${r.id.padEnd(8)}| ${r.priority.padEnd(6)} | ${r.status} | ${name}`);
  }
  
  console.log('───────────────────────────────────────────────────────────\n');
  
  // 失败用例详情
  if (failed > 0) {
    console.log('失败用例详情:\n');
    for (const r of results.filter(r => r.status === '❌')) {
      console.log(`[${r.id}] ${r.name}`);
      console.log(`   预期: ${r.message}`);
      console.log(`   实际: ${r.actual}\n`);
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 最终结论
  const criticalPassed = results.filter(r => r.priority === 'P0' && r.status === '✅').length;
  const criticalTotal = results.filter(r => r.priority === 'P0').length;
  
  if (criticalPassed === criticalTotal) {
    console.log('🎉 测试结论: ✅ 所有 P0 用例通过，可以继续使用\n');
    process.exit(0);
  } else {
    console.log(`⚠️  测试结论: ❌ 有 ${criticalTotal - criticalPassed} 个 P0 用例失败，需要修复\n`);
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试脚本执行失败:', error);
  process.exit(1);
});
