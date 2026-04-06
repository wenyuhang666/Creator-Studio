// Mock Tauri API（在 Tauri 环境中自动跳过，仅用于浏览器调试）
import "./mock/tauriMock";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/theme.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
