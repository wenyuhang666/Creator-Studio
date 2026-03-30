/**
 * 快速配置面板
 *
 * 简化 AI 配置流程，用户只需输入 API Key
 */

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Alert,
  Spin,
  Divider,
} from "antd";
import {
  KeyOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useQuickConfigStore, checkHasValidConfig } from "./store/quickConfigStore";
import { PROVIDER_PRESETS, getPresetById } from "./providerPresets";

const { Text, Paragraph, Title } = Typography;

export function QuickConfigPanel() {
  const [hasConfig, setHasConfig] = useState(false);
  const [configInfo, setConfigInfo] = useState<{
    providerName?: string;
    model?: string;
  }>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    apiKey,
    selectedPresetId,
    selectedModel,
    customBaseUrl,
    detectedPreset,
    isDetecting,
    isLoading,
    error,
    setApiKey,
    setSelectedPreset,
    setSelectedModel,
    setCustomBaseUrl,
    quickSetup,
  } = useQuickConfigStore();

  // 检查当前配置状态
  useEffect(() => {
    checkHasValidConfig().then((result) => {
      setHasConfig(result.hasConfig);
      setConfigInfo({
        providerName: result.providerName,
        model: result.model,
      });
    });
  }, []);

  const selectedPreset = getPresetById(selectedPresetId);
  const showCustomUrl = selectedPresetId === "custom";
  const showApiKeyInput = selectedPresetId !== "ollama";
  const canSubmit = showApiKeyInput ? !!apiKey && !!selectedModel : !!selectedModel;

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      {/* 标题 */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <ThunderboltOutlined style={{ fontSize: 48, color: "#1890ff" }} />
        <Title level={4} style={{ marginTop: 12, marginBottom: 8 }}>
          快速配置 AI
        </Title>
        <Text type="secondary">
          输入 API Key，自动配置，立即使用
        </Text>
      </div>

      {/* 当前配置提示 */}
      {hasConfig && !showAdvanced && (
        <Card
          size="small"
          style={{ marginBottom: 16, background: "#f6ffed", borderColor: "#b7eb8f" }}
        >
          <Space>
            <CheckCircleOutlined style={{ color: "#52c41a" }} />
            <Text strong>当前已配置</Text>
            <Tag color="green">{configInfo.providerName}</Tag>
            <Text type="secondary">{configInfo.model}</Text>
          </Space>
          <div style={{ marginTop: 8 }}>
            <Button
              type="link"
              size="small"
              onClick={() => setShowAdvanced(true)}
            >
              重新配置
            </Button>
          </div>
        </Card>
      )}

      {/* API Key 输入 */}
      {showAdvanced && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="API Key" required={showApiKeyInput}>
              <Input.Password
                size="large"
                placeholder="请输入 API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                prefix={<KeyOutlined />}
                suffix={
                  isDetecting ? (
                    <Spin indicator={<LoadingOutlined spin />} size="small" />
                  ) : detectedPreset ? (
                    <Tag color="success">{detectedPreset.name}</Tag>
                  ) : null
                }
              />
            </Form.Item>

            {/* 自动检测提示 */}
            {detectedPreset && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={`已识别为 ${detectedPreset.name}`}
                description={`将自动配置 ${detectedPreset.baseUrl}`}
                style={{ marginBottom: 0 }}
              />
            )}
          </Form>
        </Card>
      )}

      {/* 服务商和模型选择 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Form.Item label="服务商">
            <Select
              value={selectedPresetId}
              onChange={(value) => {
                setSelectedPreset(value);
              }}
              options={PROVIDER_PRESETS.map((p) => ({
                value: p.id,
                label: (
                  <Space>
                    <span>{p.name}</span>
                    {p.id === "ollama" && <Tag>本地</Tag>}
                    {p.id === "custom" && <Tag>手动</Tag>}
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          {/* 自定义 URL */}
          {showCustomUrl && (
            <Form.Item label="API 地址" required>
              <Input
                placeholder="https://api.example.com/v1"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
              />
            </Form.Item>
          )}

          {/* 模型选择 */}
          <Form.Item
            label="模型"
            required
            tooltip="选择推荐模型或手动输入"
          >
            {selectedPreset && selectedPreset.recommendedModels.length > 0 ? (
              <Select
                value={selectedModel || undefined}
                placeholder="选择模型"
                showSearch
                allowClear
                onChange={(value) => {
                  if (value === "__custom__") {
                    setSelectedModel("");
                  } else if (value) {
                    setSelectedModel(value);
                  }
                }}
                options={[
                  {
                    label: "推荐模型",
                    options: selectedPreset.recommendedModels.map((m) => ({
                      value: m,
                      label: `✨ ${m}`,
                    })),
                  },
                  {
                    label: "其他模型",
                    options: [
                      {
                        value: "__custom__",
                        label: "手动输入...",
                      },
                    ],
                  },
                ]}
              />
            ) : (
              <Input
                placeholder="输入模型名称，如 gpt-4o-mini"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              />
            )}
          </Form.Item>
        </Form>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert
          type="error"
          message="配置失败"
          description={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => useQuickConfigStore.getState().reset()}
        />
      )}

      {/* 提交按钮 */}
      <Button
        type="primary"
        size="large"
        block
        loading={isLoading}
        disabled={!canSubmit}
        onClick={() => quickSetup()}
        icon={<RocketOutlined />}
      >
        保存并开始使用
      </Button>

      {/* 高级选项入口 */}
      {!showAdvanced && (
        <>
          <Divider plain>
            <Text type="secondary" style={{ fontSize: 12 }}>
              或
            </Text>
          </Divider>
          <Button block onClick={() => setShowAdvanced(true)}>
            高级配置
          </Button>
        </>
      )}

      {showAdvanced && (
        <Button
          type="link"
          block
          onClick={() => setShowAdvanced(false)}
          style={{ marginTop: 8 }}
        >
          收起高级配置
        </Button>
      )}

      {/* 安全提示 */}
      <Paragraph
        type="secondary"
        style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 12,
          marginBottom: 0,
        }}
      >
        🔒 您的 API Key 安全存储在系统密钥链中
        <br />
        不会与任何人共享
      </Paragraph>
    </div>
  );
}
