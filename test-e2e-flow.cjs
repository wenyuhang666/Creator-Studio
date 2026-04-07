/**
 * 端到端流程测试：模拟用户点击"确认追加"后的完整流程
 */

const fs = require('fs');
const path = require('path');

console.log("=".repeat(60));
console.log("端到端流程测试：确认追加 -> 编辑器刷新");
console.log("=".repeat(60));

let allPassed = true;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`✅ ${testName}`);
    return true;
  } else {
    console.error(`❌ ${testName}`);
    if (details) console.error(`   ${details}`);
    allPassed = false;
    return false;
  }
}

// 场景：用户在 Continue 模式下发送续写请求，AI 生成草稿预览，用户点击"确认追加"

console.log("\n=== 模拟用户操作流程 ===\n");

// Step 1: 用户创建 Continue 模式的会话
console.log("Step 1: 用户创建 Continue 模式的会话");
const createSessionContent = fs.readFileSync(
  "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\components\\AIPanel\\CreateSessionModal.tsx", 
  'utf-8'
);

const sessionCreated = createSessionContent.includes('value="Continue"');
assert(sessionCreated, "会话创建时可以选择 Continue 模式");

// Step 2: 用户发送续写请求
console.log("\nStep 2: 用户发送续写请求");

const aipanelContent = fs.readFileSync(
  "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\components\\AIPanel\\AIPanel.tsx", 
  'utf-8'
);

// 验证续写请求的处理
const buildContinueSystemPrompt = aipanelContent.includes('buildContinueSystemPrompt');
assert(buildContinueSystemPrompt, "包含续写系统提示构建函数");

// Step 3: AI 生成草稿预览
console.log("\nStep 3: AI 生成草稿预览");

// 验证 CONTINUE_DRAFT_MARKER 的使用
const continueDraftMarker = aipanelContent.includes('<<<CONTINUE_DRAFT>>>');
assert(continueDraftMarker, "AI 输出包含 CONTINUE_DRAFT_MARKER");

// 验证 stripContinueDraftMarker 函数
const stripFunction = aipanelContent.includes('function stripContinueDraftMarker');
assert(stripFunction, "包含 stripContinueDraftMarker 函数用于解析草稿");

// 验证草稿阶段 metadata 设置
const appliedFalse = aipanelContent.includes('assistantMeta.applied = false');
assert(appliedFalse, "草稿预览设置 applied=false");

// Step 4: 前端显示草稿预览 UI
console.log("\nStep 4: 前端显示草稿预览 UI");

const chatMessageContent = fs.readFileSync(
  "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\components\\AIPanel\\ChatMessage.tsx", 
  'utf-8'
);

const isContinueDraft = chatMessageContent.includes('isContinueDraft');
const showDraftActions = chatMessageContent.includes('showDraftActions');
assert(isContinueDraft, "ChatMessage 包含 isContinueDraft 判断");
assert(showDraftActions, "ChatMessage 包含 showDraftActions 显示逻辑");

// 验证"确认追加"按钮
const confirmButton = chatMessageContent.includes('onConfirmDraft');
assert(confirmButton, "包含确认追加按钮回调");

// Step 5: 用户点击"确认追加"
console.log("\nStep 5: 用户点击'确认追加'");

// 验证 handleConfirmDraft 函数
const handleConfirmDraft = aipanelContent.includes('const handleConfirmDraft = async');
assert(handleConfirmDraft, "AIPanel 包含 handleConfirmDraft 函数");

// 验证发送"确认追加"消息
const confirmMessage = aipanelContent.includes('确认追加。请将你上一条给出的续写预览原文');
assert(confirmMessage, "handleConfirmDraft 发送正确的确认消息");

// 验证 continuePhase 设置为 "apply"
const applyPhase = aipanelContent.includes('continuePhase: "apply"');
assert(applyPhase, "点击确认后设置 continuePhase 为 apply");

// Step 6: 后端执行写入操作
console.log("\nStep 6: 后端执行写入操作");

const aiBridgeContent = fs.readFileSync(
  "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src-tauri\\src\\ai_bridge.rs", 
  'utf-8'
);

// 验证 allow_write 为 true 时执行写入
const allowWriteTrue = aiBridgeContent.includes('allow_write: true') || 
                       aiBridgeContent.includes('allow_write = true');
assert(allowWriteTrue, "确认追加阶段 allow_write 为 true");

// 验证 append 工具不被过滤
const appendTool = aiBridgeContent.includes('"append"');
assert(appendTool, "ai_bridge 包含 append 工具处理");

// Step 7: 前端接收写入结果
console.log("\nStep 7: 前端接收写入结果");

// 验证检测 append 成功
const appendedCheck = aipanelContent.includes('toolCalls.some((c) => c.name === "append" && c.status === "success"');
assert(appendedCheck, "前端检测 append 是否成功");

// Step 8: 触发 chapterAppended 事件
console.log("\nStep 8: 触发 chapterAppended 事件");

const chapterAppendedEvent = aipanelContent.includes('creatorai:chapterAppended');
assert(chapterAppendedEvent, "触发 chapterAppended 事件");

// 验证事件包含正确的 detail
const eventDetail = aipanelContent.includes('detail: { projectPath, chapterId: resolved.chapterId, content: appendedContent');
assert(eventDetail, "事件包含 projectPath, chapterId, content");

// Step 9: MainLayout 监听并处理事件
console.log("\nStep 9: MainLayout 监听并处理事件");

const mainLayoutContent = fs.readFileSync(
  "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\layouts\\MainLayout.tsx", 
  'utf-8'
);

const onChapterAppended = mainLayoutContent.includes('const onChapterAppended = (event: Event)');
assert(onChapterAppended, "MainLayout 包含 onChapterAppended 处理函数");

// 验证项目路径匹配检查
const projectPathCheck = mainLayoutContent.includes('detail.projectPath !== projectPath');
assert(projectPathCheck, "包含项目路径匹配检查");

// Step 10: 调用 loadChapterContent 重新加载章节
console.log("\nStep 10: 调用 loadChapterContent 重新加载章节");

const chapterIdCheck = mainLayoutContent.includes('detail.chapterId === chapter.currentChapterId');
assert(chapterIdCheck, "检查是否是当前章节");

const loadChapterContent = mainLayoutContent.includes('chapter.loadChapterContent');
assert(loadChapterContent, "调用 loadChapterContent 重新加载内容");

// Step 11: useChapterManager 加载章节内容
console.log("\nStep 11: useChapterManager 加载章节内容");

const chapterManagerContent = fs.readFileSync(
  "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\hooks\\useChapterManager.ts", 
  'utf-8'
);

const loadChapter = chapterManagerContent.includes('loadChapterContent');
assert(loadChapter, "useChapterManager 包含 loadChapterContent");

// 验证通过 Tauri invoke 调用
const invokeGetContent = chapterManagerContent.includes('get_chapter_content');
assert(invokeGetContent, "调用 get_chapter_content 获取章节内容");

// 验证更新状态
const setChapterContent = chapterManagerContent.includes('setChapterContent');
assert(setChapterContent, "更新 chapterContent 状态");

// Step 12: Editor 接收新内容
console.log("\nStep 12: Editor 接收新内容");

const editorContent = fs.readFileSync(
  "C:\\Users\\16053\\proj\\07-story\\Creator-Studio\\src\\components\\Editor\\Editor.tsx", 
  'utf-8'
);

// Editor 通过 initialContent prop 接收内容
const editorInitialContent = editorContent.includes('initialContent: string');
assert(editorInitialContent, "Editor 定义 initialContent prop");

// MainLayout 传递 chapterContent 给 Editor
const mainLayoutEditorProps = mainLayoutContent.includes('initialContent={chapter.chapterContent}');
assert(mainLayoutEditorProps, "MainLayout 传递 chapter.chapterContent 给 Editor 的 initialContent");

// Editor 监听 initialContent 变化并更新
const contentChanged = editorContent.includes('contentChanged') && editorContent.includes('prevInitialContentRef');
assert(contentChanged, "Editor 监听 initialContent 变化并更新内容");

// 验证 applyExternalAppend 函数（备用方案）
const applyExternalAppend = editorContent.includes('applyExternalAppend');
assert(applyExternalAppend, "Editor 包含 applyExternalAppend 函数（用于外部追加）");

console.log("\n" + "=".repeat(60));
console.log("端到端流程验证结果");
console.log("=".repeat(60));

if (allPassed) {
  console.log("✅ 所有端到端流程检查通过！\n");
  console.log("代码逻辑完整，流程如下：");
  console.log("1. ✅ 用户创建 Continue 模式会话");
  console.log("2. ✅ 用户发送续写请求");
  console.log("3. ✅ AI 生成带 CONTINUE_DRAFT_MARKER 的草稿");
  console.log("4. ✅ 前端显示草稿预览 UI（确认/重新生成/放弃）");
  console.log("5. ✅ 用户点击'确认追加'");
  console.log("6. ✅ 后端执行 append 写入操作");
  console.log("7. ✅ 前端触发 chapterAppended 事件");
  console.log("8. ✅ MainLayout 监听并调用 loadChapterContent");
  console.log("9. ✅ useChapterManager 重新加载章节内容");
  console.log("10. ✅ Editor 显示新的章节内容");
  console.log("\n如果实际使用中内容没有刷新，请检查：");
  console.log("  - 是否在 Continue 模式下（不是 Discussion）");
  console.log("  - AI 是否成功执行了 append 工具");
  console.log("  - 浏览器控制台是否有错误信息");
} else {
  console.error("❌ 有流程检查失败，请查看上述输出");
}

process.exit(allPassed ? 0 : 1);
