/**
 * 应用层 Provider
 * 
 * 提供全局的 Context Providers（如主题配置）
 */

import { type ReactNode } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import { useTheme } from "../hooks/useTheme";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const { theme } = useTheme();

  const antdThemeConfig = {
    algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: theme === "dark"
      ? {
          colorBgBase: "#1a1a1a",
          colorBgContainer: "#242424",
          colorBgElevated: "#242424",
          colorBorder: "#3a3a3a",
          colorText: "#e8e8e8",
          colorTextSecondary: "#a0a0a0",
          colorTextTertiary: "#666666",
          colorPrimary: "#c9a66b",
          colorPrimaryHover: "#d4b896",
          colorLink: "#c9a66b",
          colorLinkHover: "#d4b896",
          borderRadius: 10,
        }
      : {
          colorBgBase: "#fffff0",
          colorBgContainer: "#fafaf5",
          colorBgElevated: "#fafaf5",
          colorBorder: "#e8e8d8",
          colorText: "#333333",
          colorTextSecondary: "#666666",
          colorTextTertiary: "#999999",
          colorPrimary: "#8b7355",
          colorPrimaryHover: "#d4a574",
          colorLink: "#8b7355",
          colorLinkHover: "#d4a574",
          borderRadius: 10,
        },
    components: {
      Layout: {
        bodyBg: theme === "dark" ? "#1a1a1a" : "#fffff0",
        headerBg: theme === "dark" ? "#242424" : "#fafaf5",
        footerBg: theme === "dark" ? "#242424" : "#fafaf5",
        siderBg: theme === "dark" ? "#242424" : "#fafaf5",
      },
      Tooltip: {
        colorBgSpotlight: theme === "dark" ? "#242424" : "#fafaf5",
        colorTextLightSolid: theme === "dark" ? "#e8e8e8" : "#333333",
      },
    },
  };

  return (
    <ConfigProvider theme={antdThemeConfig}>
      {children}
    </ConfigProvider>
  );
}
