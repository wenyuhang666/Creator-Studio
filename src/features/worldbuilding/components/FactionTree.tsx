/**
 * 势力树形视图组件
 * @module worldbuilding/components
 */

import React, { useState, useMemo } from 'react';
import { Tree, Button, Space, Modal, Form, Input, Select, Tag, Popconfirm, message, Empty } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  TeamOutlined,
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { useFactionStore } from '../store/factionStore';
import type { Faction } from '../types';

const { TextArea } = Input;

// 势力关系类型配置
// const RELATION_CONFIG: Record<FactionRelationType, { color: string; label: string }> = {
//   ally: { color: '#52c41a', label: '同盟' },
//   hostile: { color: '#ff4d4f', label: '敌对' },
//   neutral: { color: '#8c8c8c', label: '中立' },
//   unknown: { color: '#faad14', label: '未知' },
// };

/**
 * 势力树组件属性
 */
interface FactionTreeProps {
  onSelectFaction?: (faction: Faction | null) => void;
}

/**
 * 势力树组件
 */
const FactionTree: React.FC<FactionTreeProps> = ({ onSelectFaction }) => {
  const {
    factions,
    relations,
    buildFactionTree,
    addFaction,
    updateFaction,
    deleteFaction,
  } = useFactionStore();

  // UI 状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 构建树形数据
  const treeData = useMemo(() => {
    const tree = buildFactionTree();
    
    const convertToTreeData = (nodes: typeof tree): DataNode[] => {
      return nodes.map((node) => ({
        key: node.faction.id,
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{node.faction.name}</span>
            {node.faction.members.length > 0 && (
              <Tag color="blue" style={{ margin: 0 }}>
                {node.faction.members.length}
              </Tag>
            )}
          </div>
        ),
        icon: ({ expanded }: { expanded?: boolean }) => 
          expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
        children: node.children.length > 0 ? convertToTreeData(node.children) : undefined,
      }));
    };
    
    return convertToTreeData(tree);
  }, [factions, buildFactionTree]);

  // 处理添加
  const handleAdd = () => {
    form.validateFields().then((values) => {
      addFaction({
        name: values.name,
        description: values.description || '',
        members: values.members || [],
        parentId,
        attributes: {
          territory: values.territory,
          strength: values.strength,
          goal: values.goal,
          ideology: values.ideology,
        },
      });
      message.success(`势力 "${values.name}" 已添加`);
      setShowAddModal(false);
      form.resetFields();
      setParentId(undefined);
    });
  };

  // 处理编辑
  const handleEdit = () => {
    if (!editingFaction) return;
    
    editForm.validateFields().then((values) => {
      updateFaction(editingFaction.id, {
        name: values.name,
        description: values.description || '',
        members: values.members || [],
        attributes: {
          territory: values.territory,
          strength: values.strength,
          goal: values.goal,
          ideology: values.ideology,
        },
      });
      message.success('势力信息已更新');
      setShowEditModal(false);
      setEditingFaction(null);
      editForm.resetFields();
    });
  };

  // 处理删除
  const handleDelete = (id: string) => {
    const faction = factions.find((f) => f.id === id);
    deleteFaction(id);
    message.success(`势力 "${faction?.name}" 已删除`);
  };

  // 打开编辑弹窗
  const openEditModal = (faction: Faction) => {
    setEditingFaction(faction);
    editForm.setFieldsValue({
      name: faction.name,
      description: faction.description,
      members: faction.members,
      territory: faction.attributes.territory,
      strength: faction.attributes.strength,
      goal: faction.attributes.goal,
      ideology: faction.attributes.ideology,
    });
    setShowEditModal(true);
  };

  // 获取可作为父级的势力列表（排除自己及后代）
  const getAvailableParents = (excludeId?: string): Faction[] => {
    const getDescendantIds = (id: string): string[] => {
      const children = factions.filter((f) => f.parentId === id);
      return [id, ...children.flatMap((c) => getDescendantIds(c.id))];
    };
    
    const excludeIds = excludeId ? new Set(getDescendantIds(excludeId)) : new Set();
    return factions.filter((f) => !excludeIds.has(f.id));
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setParentId(undefined);
              setShowAddModal(true);
            }}
          >
            添加势力
          </Button>
        </Space>
      </div>

      {/* 势力统计 */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <Tag icon={<TeamOutlined />}>
            势力数量: {factions.length}
          </Tag>
          <Tag>
            同盟: {relations.filter((r) => r.type === 'ally').length}
          </Tag>
          <Tag color="red">
            敌对: {relations.filter((r) => r.type === 'hostile').length}
          </Tag>
        </Space>
      </div>

      {/* 势力树 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {factions.length === 0 ? (
          <Empty description="暂无势力，点击添加开始创建" />
        ) : (
          <Tree
            showIcon
            showLine={{ showLeafIcon: false }}
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            onSelect={(_, info) => {
              const faction = factions.find((f) => f.id === info.node.key);
              onSelectFaction?.(faction || null);
            }}
            titleRender={(nodeData) => {
              const faction = factions.find((f) => f.id === nodeData.key);
              if (!faction) return <span>{String(nodeData.title)}</span>;
              
              const isExpanded = expandedKeys.includes(nodeData.key);
              
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isExpanded ? <FolderOpenOutlined /> : <FolderOutlined />}
                    <span>{faction.name}</span>
                    {faction.members.length > 0 && (
                      <Tag color="blue" style={{ margin: 0 }}>
                        {faction.members.length}
                      </Tag>
                    )}
                  </div>
                  <Space size="small">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(faction);
                      }}
                    />
                    <Popconfirm
                      title="确定删除此势力？"
                      description="删除后将同时删除所有子势力和关联关系"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDelete(faction.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Space>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* 添加势力模态框 */}
      <Modal
        title="添加势力"
        open={showAddModal}
        onOk={handleAdd}
        onCancel={() => {
          setShowAddModal(false);
          form.resetFields();
        }}
        okText="添加"
        cancelText="取消"
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="势力名称"
            rules={[{ required: true, message: '请输入势力名称' }]}
          >
            <Input placeholder="请输入势力名称" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="parentId"
            label="上级势力"
          >
            <Select
              placeholder="请选择上级势力（可选）"
              allowClear
              options={getAvailableParents().map((f) => ({
                value: f.id,
                label: f.name,
              }))}
              onChange={(value) => setParentId(value)}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="势力描述"
          >
            <TextArea
              placeholder="请输入势力描述"
              rows={3}
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            name="territory"
            label="地盘/控制区域"
          >
            <Input placeholder="例如：北方草原、东部沿海等" />
          </Form.Item>

          <Form.Item
            name="strength"
            label="实力等级"
          >
            <Select
              placeholder="请选择实力等级"
              allowClear
              options={[
                { value: '极弱', label: '极弱' },
                { value: '较弱', label: '较弱' },
                { value: '普通', label: '普通' },
                { value: '较强', label: '较强' },
                { value: '极强', label: '极强' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="goal"
            label="组织目标"
          >
            <Input placeholder="例如：统一大陆、守护和平等" />
          </Form.Item>

          <Form.Item
            name="ideology"
            label="意识形态"
          >
            <Input placeholder="例如：民主、专制、中立等" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑势力模态框 */}
      <Modal
        title="编辑势力"
        open={showEditModal}
        onOk={handleEdit}
        onCancel={() => {
          setShowEditModal(false);
          setEditingFaction(null);
          editForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="势力名称"
            rules={[{ required: true, message: '请输入势力名称' }]}
          >
            <Input placeholder="请输入势力名称" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="description"
            label="势力描述"
          >
            <TextArea
              placeholder="请输入势力描述"
              rows={3}
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            name="territory"
            label="地盘/控制区域"
          >
            <Input placeholder="例如：北方草原、东部沿海等" />
          </Form.Item>

          <Form.Item
            name="strength"
            label="实力等级"
          >
            <Select
              placeholder="请选择实力等级"
              allowClear
              options={[
                { value: '极弱', label: '极弱' },
                { value: '较弱', label: '较弱' },
                { value: '普通', label: '普通' },
                { value: '较强', label: '较强' },
                { value: '极强', label: '极强' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="goal"
            label="组织目标"
          >
            <Input placeholder="例如：统一大陆、守护和平等" />
          </Form.Item>

          <Form.Item
            name="ideology"
            label="意识形态"
          >
            <Input placeholder="例如：民主、专制、中立等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FactionTree;
