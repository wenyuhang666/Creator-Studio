import React, { useState } from 'react';
import { Button, Space, Tooltip, Spin } from 'antd';
import { EditOutlined, ExpandOutlined, CompressOutlined, FormatPainterOutlined } from '@ant-design/icons';
import { aiTransform } from '../../lib/ai';

interface PolishToolbarProps {
  selectedText: string;
  position: { top: number; left: number };
  onApply: (newText: string) => void;
  onDismiss: () => void;
}

const PolishToolbar: React.FC<PolishToolbarProps> = ({ selectedText, position, onApply, onDismiss }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleAction = async (action: 'polish' | 'expand' | 'condense' | 'restyle') => {
    setLoading(true);
    setPreview(null);
    try {
      const result = await aiTransform({ text: selectedText, action });
      setPreview(result);
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  if (preview) {
    return (
      <div
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 1000,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 12,
          maxWidth: 500,
          maxHeight: 300,
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          AI 改写预览
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{preview}</div>
        <Space style={{ marginTop: 8 }}>
          <Button size="small" type="primary" onClick={() => { onApply(preview); setPreview(null); }}>
            接受
          </Button>
          <Button size="small" onClick={() => { setPreview(null); onDismiss(); }}>
            取消
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '4px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {loading ? (
        <Spin size="small" />
      ) : (
        <Space size={4}>
          <Tooltip title="润色">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleAction('polish')} />
          </Tooltip>
          <Tooltip title="扩写">
            <Button type="text" size="small" icon={<ExpandOutlined />} onClick={() => handleAction('expand')} />
          </Tooltip>
          <Tooltip title="缩写">
            <Button type="text" size="small" icon={<CompressOutlined />} onClick={() => handleAction('condense')} />
          </Tooltip>
          <Tooltip title="改风格">
            <Button type="text" size="small" icon={<FormatPainterOutlined />} onClick={() => handleAction('restyle')} />
          </Tooltip>
        </Space>
      )}
    </div>
  );
};

export default PolishToolbar;
