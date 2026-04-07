/**
 * AI 续写功能集成测试
 * 运行方式: node test-ai-integration.js
 */

const fs = require('fs');
const path = require('path');

console.log("=".repeat(60));
console.log("AI 续写功能集成测试");
console.log("=".repeat(60));

let allPassed = true;

// 测试辅助函数
function assert(condition, testName, errorMsg = "") {
  if (condition) {
    console.log(`✅ ${testName}`);
    return true;
  } else {
    console.error(`❌ ${testName}`);
    if (errorMsg) console.error(`   ${errorMsg}`);
    allPassed = false;
    return false;
  }
}

// 测试 1: 验证 CONTINUE_DRAFT_MARKER 正则解析
function test1_ContinueDraftMarkerParsing() {
  console.log("\n--- 测试 1: CONTINUE_DRAFT_MARKER 解析 ---");
  
  const CONTINUE_DRAFT_MARKER = "<<<CONTINUE_DRAFT>>>";
  const aiResponse = `<<<CONTINUE_DRAFT>>>
林晚站在巷口，指尖无意识捻着衣角一枚松脱的盘扣。`;
  
  const escapedMarker = CONTINUE_DRAFT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|\\r?\\n)\\s*${escapedMarker}\\s*(\\r?\\n|$)`);
  const match = re.exec(aiResponse);
  
  assert(match !== null, "正则能匹配 CONTINUE_DRAFT_MARKER");
  
  if (match) {
    const after = aiResponse.slice(match.index + match[0].length);
    const content = after.replace(/^\s+/, "");
    assert(content.length > 0, "能提取草稿内容");
    assert(content.includes("林晚"), "内容包含预期文本");
  }
}

// 测试 2: 验证文件存在性
function test2_FileExistence() {
  console.log("\n--- 测试 2: 关键文件存在性 ---");
  
  const baseDir = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio";
  
  const files = [
    "src/components/AIPanel/AIPanel.tsx",
    "src/components/AIPanel/ChatMessage.tsx",
    "src/components/AIPanel/ChatHistory.tsx",
    "src/layouts/MainLayout.tsx",
    "src/hooks/useChapterManager.ts",
    "src-tauri/src/ai_bridge.rs",
    "src/lib/ai.ts",
    "src/lib/sessions.ts"
  ];
  
  for (const file of files) {
    const fullPath = path.join(baseDir, file);
    assert(fs.existsSync(fullPath), `文件存在: ${file}`);
  }
}

// 测试 3: 验证 AIPanel.tsx 中的关键代码
function test3_AIPanelKeyCode() {
  console.log("\n--- 测试 3: AIPanel.tsx 关键代码检查 ---");
  
  const filePath = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\components\\AIPanel\\AIPanel.tsx";
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查 CONTINUE_DRAFT_MARKER 定义
  assert(content.includes('CONTINUE_DRAFT_MARKER'), "包含 CONTINUE_DRAFT_MARKER");
  assert(content.includes('stripContinueDraftMarker'), "包含 stripContinueDraftMarker 函数");
  
  // 检查草稿预览相关的 metadata 设置
  assert(content.includes('assistantMeta.applied = false'), "包含 applied=false 设置");
  assert(content.includes('assistantMeta.applied = true'), "包含 applied=true 设置");
  
  // 检查 handleConfirmDraft
  assert(content.includes('handleConfirmDraft'), "包含 handleConfirmDraft");
  assert(content.includes('确认追加'), "包含确认追加文本");
  
  // 检查 handleRegenerateDraft
  assert(content.includes('handleRegenerateDraft'), "包含 handleRegenerateDraft");
  
  // 检查 chaptersChanged 事件
  assert(content.includes('creatorai:chaptersChanged'), "包含 chaptersChanged 事件");
  
  // 检查 chapterAppended 事件
  assert(content.includes('creatorai:chapterAppended'), "包含 chapterAppended 事件");
}

// 测试 4: 验证 ChatMessage.tsx 中的草稿预览 UI
function test4_ChatMessageDraftUI() {
  console.log("\n--- 测试 4: ChatMessage.tsx 草稿预览 UI 检查 ---");
  
  const filePath = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\components\\AIPanel\\ChatMessage.tsx";
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查草稿预览显示条件
  assert(content.includes('isContinueDraft'), "包含 isContinueDraft 判断");
  assert(content.includes('mode === \"Continue\"'), "检查 Continue 模式");
  assert(content.includes("applied === false"), "检查 applied=false");
  
  // 检查 UI 元素
  assert(content.includes('确认追加'), "包含确认追加按钮");
  assert(content.includes('重新生成'), "包含重新生成按钮");
  assert(content.includes('放弃'), "包含放弃按钮");
  assert(content.includes('续写预览'), "包含续写预览标签");
}

// 测试 5: 验证 MainLayout.tsx 中的事件监听
function test5_MainLayoutEventListener() {
  console.log("\n--- 测试 5: MainLayout.tsx 事件监听检查 ---");
  
  const filePath = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\layouts\\MainLayout.tsx";
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查 chapterAppended 事件监听
  assert(content.includes('creatorai:chapterAppended'), "包含 chapterAppended 事件监听");
  assert(content.includes('onChapterAppended'), "包含 onChapterAppended 处理函数");
  
  // 检查是否调用 loadChapterContent
  assert(content.includes('loadChapterContent'), "包含 loadChapterContent 调用");
  
  // 检查 currentChapterId 比较
  assert(content.includes('chapter.currentChapterId'), "包含 currentChapterId 比较");
}

// 测试 6: 验证 useChapterManager 导出
function test6_UseChapterManager() {
  console.log("\n--- 测试 6: useChapterManager 导出检查 ---");
  
  const filePath = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\hooks\\useChapterManager.ts";
  const content = fs.readFileSync(filePath, 'utf-8');
  
  assert(content.includes('export function useChapterManager'), "导出 useChapterManager");
  assert(content.includes('loadChapterContent'), "包含 loadChapterContent 方法");
  assert(content.includes('refreshChapters'), "包含 refreshChapters 方法");
}

// 测试 7: 验证 ai_bridge.rs 中的草稿阶段过滤
function test7_AiBridgeDraftFilter() {
  console.log("\n--- 测试 7: ai_bridge.rs 草稿过滤检查 ---");
  
  const filePath = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src-tauri\\src\\ai_bridge.rs";
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查草稿阶段过滤逻辑
  assert(content.includes('should_block_write_tools'), "包含 should_block_write_tools 变量");
  assert(content.includes('allow_write'), "检查 allow_write 参数");
  
  // 检查被阻止时返回的消息
  assert(content.includes('[跳过]'), "包含跳过提示");
  assert(content.includes('草稿阶段'), "包含草稿阶段提示");
}

// 测试 8: 验证 ai.ts 中的 system prompt 修改
function test8_AiSystemPrompt() {
  console.log("\n--- 测试 8: ai.ts System Prompt 检查 ---");
  
  const filePath = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\lib\\ai.ts";
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查草稿阶段前缀
  assert(content.includes('【草稿预览模式】'), "包含草稿预览模式前缀");
  assert(content.includes('Continue'), "检查 Continue 模式");
  assert(content.includes('!params.allowWrite'), "检查 allowWrite 条件");
}

// 测试 9: 验证 inferContinuePhase 函数
function test9_InferContinuePhase() {
  console.log("\n--- 测试 9: inferContinuePhase 函数检查 ---");
  
  const filePath = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\components\\AIPanel\\AIPanel.tsx";
  const content = fs.readFileSync(filePath, 'utf-8');
  
  assert(content.includes('inferContinuePhase'), "包含 inferContinuePhase 函数");
  assert(content.includes('确认追加'), "检查确认追加关键词");
  assert(content.includes('lastDraftIndex'), "检查草稿索引");
}

// 测试 10: 验证 CreateSessionModal 中的模式选择
function test10_CreateSessionModalMode() {
  console.log("\n--- 测试 10: CreateSessionModal 模式选择检查 ---");
  
  const filePath = "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\components\\AIPanel\\CreateSessionModal.tsx";
  const content = fs.readFileSync(filePath, 'utf-8');
  
  assert(content.includes('Radio.Group'), "包含 Radio.Group 组件");
  assert(content.includes('Discussion'), "包含 Discussion 选项");
  assert(content.includes('Continue'), "包含 Continue 选项");
  assert(content.includes('onCreate'), "包含 onCreate 回调");
}

// 运行所有测试
console.log("\n开始运行测试...\n");

test1_ContinueDraftMarkerParsing();
test2_FileExistence();
test3_AIPanelKeyCode();
test4_ChatMessageDraftUI();
test5_MainLayoutEventListener();
test6_UseChapterManager();
test7_AiBridgeDraftFilter();
test8_AiSystemPrompt();
test9_InferContinuePhase();
test10_CreateSessionModalMode();

console.log("\n" + "=".repeat(60));
console.log("测试结果汇总");
console.log("=".repeat(60));

if (allPassed) {
  console.log("✅ 所有静态检查通过！");
  console.log("\n下一步: 请在 Tauri 应用中手动测试完整流程:");
  console.log("1. 创建或切换到'✍️ 续写模式'的会话");
  console.log("2. 发送续写请求");
  console.log("3. 查看草稿预览是否显示");
  console.log("4. 点击'确认追加'");
  console.log("5. 验证编辑器中章节内容是否刷新");
  process.exit(0);
} else {
  console.error("❌ 有测试失败，请检查上述输出");
  process.exit(1);
}
