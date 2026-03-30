import { QuickConfigPanel } from "../../features/settings/QuickConfigPanel";

export default function SettingsPanel() {
  return (
    <div style={{ padding: 16, height: "100%", overflow: "auto" }}>
      {/* 快速配置面板 */}
      <QuickConfigPanel />
    </div>
  );
}
