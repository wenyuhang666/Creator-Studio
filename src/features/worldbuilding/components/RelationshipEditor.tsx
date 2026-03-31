/**
 * 关系编辑器模态框组件
 * @module worldbuilding/components
 */

import React, { useState } from 'react';
import { Modal, Form, Select, Input, Space } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import type { RelationshipType } from '../types';

/**
 * 关系编辑器属性接口
 */
interface RelationshipEditorProps {
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认回调 */
  onConfirm: (type: RelationshipType, description: string) => void;
}

/**
 * 关系类型配置
 */
const RELATIONSHIP_OPTIONS: Array<{
  value: RelationshipType;
  label: string;
  color: string;
}> = [
  { value: 'friend', label: '朋友', color: '#52c41a' },
  { value: 'enemy', label: '敌人', color: '#ff4d4f' },
  { value: 'love', label: '恋人', color: '#eb2f96' },
  { value: 'family', label: '家人', color: '#fa8c16' },
  { value: 'rival', label: '竞争对手', color: '#faad14' },
  { value: 'other', label: '其他', color: '#8c8c8c' },
];

/**
 * 关系编辑器组件
 */
const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<RelationshipType>('friend');

  /**
   * 处理确认
   */
  const handleOk = () => {
    form.validateFields().then((values) => {
      onConfirm(values.type as RelationshipType, values.description || '');
      form.resetFields();
      setSelectedType('friend');
    });
  };

  /**
   * 处理取消
   */
  const handleCancel = () => {
    form.resetFields();
    setSelectedType('friend');
    onClose();
  };

  /**
   * 处理类型变化
   */
  const handleTypeChange = (value: RelationshipType) => {
    setSelectedType(value);
  };

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined />
          <span>创建人物关系</span>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="创建关系"
      cancelText="取消"
      destroyOnClose
      width={400}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: 'friend',
          description: '',
        }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="type"
          label="关系类型"
          rules={[{ required: true, message: '请选择关系类型' }]}
        >
          <Select
            placeholder="请选择关系类型"
            onChange={handleTypeChange}
            options={RELATIONSHIP_OPTIONS.map((option) => ({
              value: option.value,
              label: (
                <Space>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: option.color,
                    }}
                  />
                  <span>{option.label}</span>
                </Space>
              ),
            }))}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="关系描述"
          tooltip="可选，描述这段关系的具体情况"
        >
          <Input.TextArea
            placeholder="请输入关系描述（可选）"
            rows={3}
            maxLength={200}
            showCount
          />
        </Form.Item>

        {/* 关系类型说明 */}
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: 6,
          marginTop: 8,
        }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            关系类型说明：
          </div>
          <div style={{ fontSize: 12 }}>
            {RELATIONSHIP_OPTIONS.map((option) => (
              <div key={option.value} style={{ marginBottom: 4 }}>
                <Space size={4}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: option.color,
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>{option.label}</span>
                  {option.value === selectedType && (
                    <span style={{ color: '#1890ff' }}>（当前选中）</span>
                  )}
                </Space>
              </div>
            ))}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default RelationshipEditor;
