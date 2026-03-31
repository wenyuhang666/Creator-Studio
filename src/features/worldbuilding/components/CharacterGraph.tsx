/**
 * 人物关系图谱组件
 * @module worldbuilding/components
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, Space, message, Modal, Input, Badge, Dropdown, Tag } from 'antd';
import { 
  PlusOutlined, 
  AppstoreOutlined,
  LinkOutlined,
  TeamOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { useCharacterStore } from '../store/characterStore';
import type { Character, RelationshipType } from '../types';
import CharacterCard from './CharacterCard';
import RelationshipEditor from './RelationshipEditor';

/**
 * 关系类型配置
 */
const RELATIONSHIP_CONFIG: Record<RelationshipType, { color: string; label: string }> = {
  friend: { color: '#52c41a', label: '朋友' },
  enemy: { color: '#ff4d4f', label: '敌人' },
  love: { color: '#eb2f96', label: '恋人' },
  family: { color: '#fa8c16', label: '家人' },
  rival: { color: '#faad14', label: '竞争对手' },
  other: { color: '#8c8c8c', label: '其他' },
};

/**
 * 节点类型映射
 */
const nodeTypes = {
  characterCard: CharacterCard,
};

/**
 * 人物关系图谱组件属性
 */
interface CharacterGraphProps {
  /** 选中人物回调 */
  onSelectCharacter?: (character: Character | null) => void;
}

/**
 * 人物关系图谱组件
 */
export const CharacterGraph: React.FC<CharacterGraphProps> = ({ onSelectCharacter }) => {
  // Store 数据
  const {
    characters,
    relationships,
    addCharacter,
    addRelationship,
    deleteCharacter,
    deleteRelationship,
  } = useCharacterStore();

  // React Flow 状态
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // UI 状态
  const [, setSelectedCharacter] = useState<Character | null>(null);
  const [showRelationshipEditor, setShowRelationshipEditor] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [showAddCharacterModal, setShowAddCharacterModal] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterDescription, setNewCharacterDescription] = useState('');
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<RelationshipType[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // 筛选边
  const filteredEdges = useMemo<Edge[]>(() => {
    if (selectedRelationTypes.length === 0) {
      return edges;
    }
    return edges.filter((edge: Edge) => {
      const relationship = relationships.find((r) => r.id === edge.id);
      return relationship && selectedRelationTypes.includes(relationship.type);
    });
  }, [edges, relationships, selectedRelationTypes]);

  // 初始化节点和边
  useEffect(() => {
    // 将 characters 转换为 nodes
    const newNodes: Node[] = characters.map((char, index) => ({
      id: char.id,
      type: 'characterCard',
      position: {
        x: (index % 5) * 250 + Math.random() * 50,
        y: Math.floor(index / 5) * 200 + Math.random() * 50,
      },
      data: { character: char },
    }));

    // 将 relationships 转换为 edges
    const newEdges: Edge[] = relationships.map((rel) => {
      const config = RELATIONSHIP_CONFIG[rel.type];
      return {
        id: rel.id,
        source: rel.from,
        target: rel.to,
        label: rel.description || config.label,
        style: { stroke: config.color, strokeWidth: 2 },
        animated: rel.type === 'enemy',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: config.color,
          width: 20,
          height: 20,
        },
        labelStyle: {
          fill: config.color,
          fontWeight: 500,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: '#fff',
          fillOpacity: 0.9,
        },
        labelBgPadding: [4, 4] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [characters, relationships, setNodes, setEdges]);

  // 添加新人物
  const handleAddCharacter = () => {
    if (!newCharacterName.trim()) {
      message.warning('请输入人物名称');
      return;
    }

    addCharacter({
      name: newCharacterName.trim(),
      description: newCharacterDescription.trim(),
      attributes: {},
    });

    message.success(`人物 "${newCharacterName}" 已添加`);
    setShowAddCharacterModal(false);
    setNewCharacterName('');
    setNewCharacterDescription('');
  };

  // 处理连接
  const onConnect = useCallback(
    (connection: Connection) => {
      // 检查是否已存在相同的关系
      const exists = relationships.some(
        (rel) =>
          (rel.from === connection.source && rel.to === connection.target) ||
          (rel.from === connection.target && rel.to === connection.source)
      );

      if (exists) {
        message.warning('这两个人物之间已经存在关系');
        return;
      }

      setPendingConnection(connection);
      setShowRelationshipEditor(true);
    },
    [relationships]
  );

  // 确认创建关系
  const handleConfirmRelationship = (type: RelationshipType, description: string) => {
    if (pendingConnection?.source && pendingConnection?.target) {
      addRelationship({
        from: pendingConnection.source,
        to: pendingConnection.target,
        type,
        description,
      });
      message.success('关系已创建');
    }
    setShowRelationshipEditor(false);
    setPendingConnection(null);
  };

  // 删除节点
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        deleteCharacter(node.id);
      });
      message.success(`已删除 ${deletedNodes.length} 个人物`);
    },
    [deleteCharacter]
  );

  // 删除边
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        deleteRelationship(edge.id);
      });
      message.success(`已删除 ${deletedEdges.length} 条关系`);
    },
    [deleteRelationship]
  );

  // 节点点击处理
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const character = characters.find((c) => c.id === node.id);
    if (character) {
      setSelectedCharacter(character);
      onSelectCharacter?.(character);
    }
  }, [characters, onSelectCharacter]);

  // 筛选关系类型
  const filterItems = useMemo(() => {
    return Object.entries(RELATIONSHIP_CONFIG).map(([type, config]) => ({
      key: type,
      label: (
        <Space>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: config.color,
            }}
          />
          <span>{config.label}</span>
          {selectedRelationTypes.includes(type as RelationshipType) && (
            <span style={{ color: '#1890ff' }}>✓</span>
          )}
        </Space>
      ),
      onClick: () => {
        const newTypes = selectedRelationTypes.includes(type as RelationshipType)
          ? selectedRelationTypes.filter((t) => t !== type)
          : [...selectedRelationTypes, type as RelationshipType];
        setSelectedRelationTypes(newTypes);
      },
    }));
  }, [selectedRelationTypes]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', minHeight: 600 }}>
      {/* 图谱区域 */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* 顶部工具栏 */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px 16px',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Space size="middle">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddCharacterModal(true)}
            >
              添加人物
            </Button>

            <Dropdown
              menu={{ items: filterItems }}
              trigger={['click']}
              open={showFilterDropdown}
              onOpenChange={setShowFilterDropdown}
            >
              <Button icon={<AimOutlined />}>
                <Space>
                  筛选关系
                  {selectedRelationTypes.length > 0 && (
                    <Badge count={selectedRelationTypes.length} size="small" />
                  )}
                </Space>
              </Button>
            </Dropdown>

            {selectedRelationTypes.length > 0 && (
              <Button
                size="small"
                onClick={() => setSelectedRelationTypes([])}
              >
                清除筛选
              </Button>
            )}
          </Space>

          <Space>
            <Tag icon={<TeamOutlined />}>
              人物: {characters.length}
            </Tag>
            <Tag icon={<LinkOutlined />}>
              关系: {relationships.length}
            </Tag>
          </Space>
        </div>

        {/* React Flow 图谱 */}
        <ReactFlow
          nodes={nodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={['Backspace', 'Delete']}
          style={{ backgroundColor: '#fafafa' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <MiniMap
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            nodeColor={(node) => {
              const character = characters.find((c) => c.id === node.id);
              return character ? '#1890ff' : '#ccc';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* 侧边栏 */}
      <div
        style={{
          width: 320,
          padding: 16,
          background: '#fff',
          borderLeft: '1px solid #f0f0f0',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>
            <Space>
              <TeamOutlined />
              <span>人物列表</span>
            </Space>
          </h4>
          {characters.length === 0 ? (
            <Card size="small">
              <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                <TeamOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <div>暂无人物</div>
                <div style={{ fontSize: 12 }}>点击右上角"添加人物"开始创建</div>
              </div>
            </Card>
          ) : (
            characters.map((char) => (
              <Card
                key={char.id}
                size="small"
                hoverable
                onClick={() => setSelectedCharacter(char)}
                style={{ marginBottom: 8 }}
                styles={{
                  body: { padding: 12 }
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{char.name}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#999',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {char.description || '暂无描述'}
                </div>
                {/* 显示关系数量 */}
                {relationships.filter(
                  (rel) => rel.from === char.id || rel.to === char.id
                ).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {relationships
                      .filter((rel) => rel.from === char.id || rel.to === char.id)
                      .slice(0, 3)
                      .map((rel) => {
                        const config = RELATIONSHIP_CONFIG[rel.type];
                        return (
                          <Tag
                            key={rel.id}
                            color={config.color}
                            style={{ marginRight: 4, marginBottom: 4 }}
                          >
                            {config.label}
                          </Tag>
                        );
                      })}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* 关系图例 */}
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12 }}>
            <Space>
              <AppstoreOutlined />
              <span>关系图例</span>
            </Space>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(RELATIONSHIP_CONFIG).map(([type, config]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 3,
                    backgroundColor: config.color,
                    borderRadius: 2,
                  }}
                />
                <span style={{ fontSize: 12 }}>{config.label}</span>
                <span style={{ fontSize: 12, color: '#999' }}>
                  ({relationships.filter((r) => r.type === type).length})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 操作提示 */}
        <div
          style={{
            marginTop: 24,
            padding: 12,
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            fontSize: 12,
            color: '#666',
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 500 }}>操作提示：</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>拖拽节点调整位置</li>
            <li>拖拽节点边缘创建关系</li>
            <li>点击节点查看详情</li>
            <li>按 Delete 删除节点或关系</li>
          </ul>
        </div>
      </div>

      {/* 添加人物模态框 */}
      <Modal
        title="添加人物"
        open={showAddCharacterModal}
        onOk={handleAddCharacter}
        onCancel={() => {
          setShowAddCharacterModal(false);
          setNewCharacterName('');
          setNewCharacterDescription('');
        }}
        okText="添加"
        cancelText="取消"
      >
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            人物名称 *
          </label>
          <Input
            placeholder="请输入人物名称"
            value={newCharacterName}
            onChange={(e) => setNewCharacterName(e.target.value)}
            maxLength={50}
          />

          <label style={{ display: 'block', marginBottom: 8, marginTop: 16, fontWeight: 500 }}>
            人物描述
          </label>
          <Input.TextArea
            placeholder="请输入人物描述（可选）"
            value={newCharacterDescription}
            onChange={(e) => setNewCharacterDescription(e.target.value)}
            rows={3}
            maxLength={200}
            showCount
          />
        </div>
      </Modal>

      {/* 关系编辑器模态框 */}
      {showRelationshipEditor && (
        <RelationshipEditor
          visible={showRelationshipEditor}
          onClose={() => {
            setShowRelationshipEditor(false);
            setPendingConnection(null);
          }}
          onConfirm={handleConfirmRelationship}
        />
      )}
    </div>
  );
};

export default CharacterGraph;
