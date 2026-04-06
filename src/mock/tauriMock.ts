/**
 * Tauri API Mock
 * 
 * 用于在浏览器模式下（npm run dev）模拟 Tauri API，
 * 加快 UI 调试速度。验证完成后使用 `npm run tauri dev` 或编译 MSI 测试完整功能。
 * 
 * 使用方式：
 * 1. 在 vite.config.ts 中添加此模块
 * 2. 或者在 main.tsx 开头 import 此模块
 */

// 模拟 invoke 方法
const mockInvoke = async (cmd: string, args?: Record<string, unknown>) => {
  console.log(`[Tauri Mock] invoke: ${cmd}`, args);
  
  // 根据不同命令返回模拟数据
  switch (cmd) {
    case "get_config":
      return {
        active_provider_id: "deepseek",
        providers: [],
        default_parameters: {
          model: "deepseek-chat",
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000,
        },
      };
    
    case "add_provider":
      return { success: true, id: `provider_${Date.now()}` };
    
    case "set_active_provider":
      return { success: true };
    
    case "set_default_parameters":
      return { success: true };
    
    case "refresh_provider_models":
      // 返回模拟的模型列表
      return ["qwen-plus", "qwen-turbo", "qwen-max", "qwen2.5-72b"];
    
    default:
      return null;
  }
};

// 检查是否在 Tauri 环境中
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// 如果不在 Tauri 环境中，创建 Mock
if (!isTauri) {
  console.log("[Tauri Mock] 浏览器模式：启用 Mock Tauri API");
  
  Object.defineProperty(window, "__TAURI__", {
    value: {
      core: {
        invoke: mockInvoke,
      },
      // Mock fs（文件操作）
      fs: {
        readTextFile: async (path: string) => {
          console.log(`[Tauri Mock] readTextFile: ${path}`);
          return "{}";
        },
        writeTextFile: async (path: string, contents: string) => {
          console.log(`[Tauri Mock] writeTextFile: ${path}`, contents);
          return { success: true };
        },
        exists: async (path: string) => {
          console.log(`[Tauri Mock] exists: ${path}`);
          return false;
        },
        mkdir: async (path: string) => {
          console.log(`[Tauri Mock] mkdir: ${path}`);
          return { success: true };
        },
      },
      // Mock dialog（对话框）
      dialog: {
        open: async (options?: { title?: string; defaultPath?: string }) => {
          console.log(`[Tauri Mock] dialog.open`, options);
          return null;
        },
        save: async (options?: { title?: string; defaultPath?: string }) => {
          console.log(`[Tauri Mock] dialog.save`, options);
          return null;
        },
        message: async (msg: string) => {
          console.log(`[Tauri Mock] dialog.message: ${msg}`);
        },
        confirm: async (msg: string) => {
          console.log(`[Tauri Mock] dialog.confirm: ${msg}`);
          return false;
        },
      },
      // Mock window（窗口操作）
      window: {
        getCurrentWindow: () => ({
          setTitle: (title: string) => {
            console.log(`[Tauri Mock] setTitle: ${title}`);
          },
          minimize: () => {
            console.log("[Tauri Mock] minimize");
          },
          maximize: () => {
            console.log("[Tauri Mock] maximize");
          },
          close: () => {
            console.log("[Tauri Mock] close");
          },
          isMaximized: () => false,
        }),
      },
      // Mock event（事件）
      event: {
        listen: (event: string, _handler: (event: { payload: unknown }) => void) => {
          console.log(`[Tauri Mock] listen: ${event}`);
          return Promise.resolve({ unlisten: () => {} });
        },
        emit: (event: string, payload?: unknown) => {
          console.log(`[Tauri Mock] emit: ${event}`, payload);
        },
      },
    },
    writable: true,
    configurable: true,
  });
  
  // 模拟 localStorage 持久化（开发模式）
  // 注意：必须在重写方法之前先保存原始引用
  // 使用 Storage.prototype 直接获取原始方法，避免原型链问题
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;
  const mockStorage: Record<string, string> = {};

  localStorage.getItem = (key: string) => {
    return mockStorage[key] ?? originalGetItem.call(localStorage, key);
  };

  localStorage.setItem = (key: string, value: string) => {
    mockStorage[key] = value;
    originalSetItem.call(localStorage, key, value);
    console.log(`[Tauri Mock] localStorage.setItem: ${key}`);
  };

  localStorage.removeItem = (key: string) => {
    delete mockStorage[key];
    originalRemoveItem.call(localStorage, key);
  };

  localStorage.clear = () => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    originalClear.call(localStorage);
  };
  
  console.log("[Tauri Mock] Mock 已启用 - UI 调试模式");
  console.log("[Tauri Mock] 提示：部分功能（如文件创建）无法在 Mock 模式下验证");
}

export {};
