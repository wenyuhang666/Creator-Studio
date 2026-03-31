/**
 * 时间线编辑器组件
 * @module worldbuilding/components
 */

import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Tag, 
  Popconfirm, 
  message, 
  Empty,
  Timeline as AntTimeline,
  Checkbox,
  Tooltip,
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  ClockCircleOutlined,
  FlagOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useTimelineStore } from '../store/timelineStore';
import { useCharacterStore } from '../store/characterStore';
import { useFactionStore } from '../store/factionStore';
import type { TimelineEvent, EventType } from '../types';

const { TextArea } = Input;

/**
 * 事件类型配置
 */
const EVENT_TYPE_CONFIG: Record<EventType, { color: string; label: string }> = {
  normal: { color: '#1890ff', label: '普通' },
  plot_point: { color: '#722ed1', label: '剧情点' },
  foreshadow: { color: '#faad14', label: '伏笔' },
  turning_point: { color: '#f5222d', label: '转折点' },
  subplot: { color: '#52c41a', label: '支线' },
};

/**
 * 时间线编辑器组件属性
 */
interface TimelineEditorProps {
  onSelectEvent?: (event: TimelineEvent | null) => void;
}

/**
 * 时间线编辑器组件
 */
const TimelineEditor: React.FC<TimelineEditorProps> = ({ onSelectEvent }) => {
  const {
    timelines,
    activeTimelineId,
    config,
    addTimeline,
    deleteTimeline,
    setActiveTimeline,
    addEvent,
    updateEvent,
    deleteEvent,
    updateConfig,
  } = useTimelineStore();

  const { characters } = useCharacterStore();
  const { factions } = useFactionStore();

  // UI 状态
  const [showAddTimelineModal, setShowAddTimelineModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [timelineForm] = Form.useForm();
  const [eventForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 当前时间线
  const activeTimeline = useMemo(() => {
    return timelines.find((t) => t.id === activeTimelineId);
  }, [timelines, activeTimelineId]);

  // 排序后的事件列表
  const sortedEvents = useMemo(() => {
    if (!activeTimeline) return [];
    return [...activeTimeline.events].sort((a, b) => a.order - b.order);
  }, [activeTimeline]);

  // 处理添加时间线
  const handleAddTimeline = () => {
    timelineForm.validateFields().then((values) => {
      addTimeline({
        name: values.name,
        description: values.description || '',
      });
      message.success(`时间线 "${values.name}" 已创建`);
      setShowAddTimelineModal(false);
      timelineForm.resetFields();
    });
  };

  // 处理添加事件
  const handleAddEvent = () => {
    if (!activeTimelineId) {
      message.warning('请先创建或选择一个时间线');
      return;
    }
    
    eventForm.validateFields().then((values) => {
      const maxOrder = activeTimeline?.events.length 
        ? Math.max(...activeTimeline.events.map((e) => e.order)) + 1 
        : 0;
        
      addEvent(activeTimelineId, {
        title: values.title,
        description: values.description || '',
        date: values.date,
        order: maxOrder,
        type: values.type || 'normal',
        tags: values.tags || [],
        characters: values.characters || [],
        factions: values.factions || [],
      });
      message.success('事件已添加');
      setShowAddEventModal(false);
      eventForm.resetFields();
    });
  };

  // 处理编辑事件
  const handleEditEvent = () => {
    if (!editingEvent || !activeTimelineId) return;
    
    editForm.validateFields().then((values) => {
      updateEvent(activeTimelineId, editingEvent.id, {
        title: values.title,
        description: values.description || '',
        date: values.date,
        type: values.type || 'normal',
        tags: values.tags || [],
        characters: values.characters || [],
        factions: values.factions || [],
      });
      message.success('事件已更新');
      setShowEditEventModal(false);
      setEditingEvent(null);
      editForm.resetFields();
    });
  };

  // 处理删除时间线
  const handleDeleteTimeline = (id: string) => {
    const timeline = timelines.find((t) => t.id === id);
    deleteTimeline(id);
    message.success(`时间线 "${timeline?.name}" 已删除`);
  };

  // 处理删除事件
  const handleDeleteEvent = (eventId: string) => {
    if (!activeTimelineId) return;
    deleteEvent(activeTimelineId, eventId);
    message.success('事件已删除');
  };

  // 打开编辑弹窗
  const openEditModal = (event: TimelineEvent) => {
    setEditingEvent(event);
    editForm.setFieldsValue({
      title: event.title,
      description: event.description,
      date: event.date,
      type: event.type,
      tags: event.tags,
      characters: event.characters,
      factions: event.factions,
    });
    setShowEditEventModal(true);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 时间线选择栏 */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space wrap>
          <Select
            placeholder="选择时间线"
            value={activeTimelineId}
            onChange={setActiveTimeline}
            style={{ minWidth: 200 }}
            options={timelines.map((t) => ({
              value: t.id,
              label: (
                <Space>
                  <span>{t.name}</span>
                  <Tag>{t.events.length}</Tag>
                </Space>
              ),
            }))}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={() => setShowAddTimelineModal(true)}
          >
            新建时间线
          </Button>
          {activeTimeline && (
            <Popconfirm
              title="确定删除此时间线？"
              description="删除后将同时删除所有事件"
              onConfirm={() => handleDeleteTimeline(activeTimeline.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* 配置栏 */}
      {activeTimeline && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Checkbox
              checked={config.showLabels}
              onChange={(e) => updateConfig({ showLabels: e.target.checked })}
            >
              显示标签
            </Checkbox>
            <Select
              value={config.orientation}
              onChange={(value) => updateConfig({ orientation: value })}
              options={[
                { value: 'horizontal', label: '水平' },
                { value: 'vertical', label: '垂直' },
              ]}
              style={{ width: 100 }}
            />
            <Tooltip title={config.showLabels ? '隐藏时间点' : '显示时间点'}>
              <Button
                icon={config.showLabels ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={() => updateConfig({ showLabels: !config.showLabels })}
              />
            </Tooltip>
          </Space>
        </div>
      )}

      {/* 时间线内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {!activeTimeline ? (
          <Empty description="请选择或创建一个时间线" />
        ) : sortedEvents.length === 0 ? (
          <Empty description="暂无事件，点击添加开始创建">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddEventModal(true)}
            >
              添加第一个事件
            </Button>
          </Empty>
        ) : (
          <div>
            {/* 事件类型图例 */}
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <Space wrap>
                {Object.entries(EVENT_TYPE_CONFIG).map(([type, cfg]) => (
                  <Tag key={type} color={cfg.color}>
                    {cfg.label}
                  </Tag>
                ))}
              </Space>
            </div>

            {/* 事件时间线 */}
            <Card
              title={
                <Space>
                  <ClockCircleOutlined />
                  <span>{activeTimeline.name}</span>
                  <Tag>{sortedEvents.length} 个事件</Tag>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowAddEventModal(true)}
                >
                  添加事件
                </Button>
              }
            >
              <AntTimeline
                mode={config.orientation === 'horizontal' ? 'left' : 'alternate'}
                items={sortedEvents.map((event) => ({
                  color: EVENT_TYPE_CONFIG[event.type].color,
                  dot: event.type === 'turning_point' ? <FlagOutlined /> : undefined,
                  children: (
                    <Card
                      size="small"
                      hoverable
                      onClick={() => onSelectEvent?.(event)}
                      style={{ 
                        marginBottom: 8,
                        borderLeft: `3px solid ${EVENT_TYPE_CONFIG[event.type].color}`,
                      }}
                      styles={{ body: { padding: 12 } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <strong>{event.title}</strong>
                            <Tag color={EVENT_TYPE_CONFIG[event.type].color} style={{ margin: 0 }}>
                              {EVENT_TYPE_CONFIG[event.type].label}
                            </Tag>
                          </div>
                          
                          {config.showLabels && (
                            <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 4 }}>
                              📅 {event.date}
                            </div>
                          )}
                          
                          {event.description && (
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                              {event.description.length > 100 
                                ? `${event.description.slice(0, 100)}...` 
                                : event.description}
                            </div>
                          )}

                          {/* 关联标签 */}
                          {(event.tags.length > 0 || event.characters.length > 0 || event.factions.length > 0) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {event.tags.map((tag, idx) => (
                                <Tag key={`tag-${idx}`} style={{ margin: 0 }}>
                                  #{tag}
                                </Tag>
                              ))}
                              {event.characters.map((charId) => {
                                const char = characters.find((c) => c.id === charId);
                                return char ? (
                                  <Tag key={`char-${charId}`} color="blue" style={{ margin: 0 }}>
                                    {char.name}
                                  </Tag>
                                ) : null;
                              })}
                              {event.factions.map((factionId) => {
                                const faction = factions.find((f) => f.id === factionId);
                                return faction ? (
                                  <Tag key={`faction-${factionId}`} color="green" style={{ margin: 0 }}>
                                    {faction.name}
                                  </Tag>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>

                        <Space size="small">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(event);
                            }}
                          />
                          <Popconfirm
                            title="确定删除此事件？"
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              handleDeleteEvent(event.id);
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
                    </Card>
                  ),
                }))}
              />
            </Card>
          </div>
        )}
      </div>

      {/* 添加时间线模态框 */}
      <Modal
        title="创建时间线"
        open={showAddTimelineModal}
        onOk={handleAddTimeline}
        onCancel={() => {
          setShowAddTimelineModal(false);
          timelineForm.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={timelineForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="时间线名称"
            rules={[{ required: true, message: '请输入时间线名称' }]}
          >
            <Input placeholder="例如：主线故事、支线任务等" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="description"
            label="时间线描述"
          >
            <TextArea
              placeholder="请输入时间线描述（可选）"
              rows={3}
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加事件模态框 */}
      <Modal
        title="添加事件"
        open={showAddEventModal}
        onOk={handleAddEvent}
        onCancel={() => {
          setShowAddEventModal(false);
          eventForm.resetFields();
        }}
        okText="添加"
        cancelText="取消"
        width={600}
      >
        <Form
          form={eventForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="title"
            label="事件标题"
            rules={[{ required: true, message: '请输入事件标题' }]}
          >
            <Input placeholder="请输入事件标题" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="date"
            label="时间"
            rules={[{ required: true, message: '请输入事件发生的时间' }]}
          >
            <Input placeholder="例如：第1年、第1章、Day 1 等" />
          </Form.Item>

          <Form.Item
            name="type"
            label="事件类型"
            initialValue="normal"
          >
            <Select
              options={Object.entries(EVENT_TYPE_CONFIG).map(([value, cfg]) => ({
                value,
                label: (
                  <Space>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: cfg.color,
                      }}
                    />
                    <span>{cfg.label}</span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="事件描述"
          >
            <TextArea
              placeholder="请输入事件描述（可选）"
              rows={4}
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="输入标签后按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="characters"
            label="关联人物"
          >
            <Select
              mode="multiple"
              placeholder="选择关联人物（可选）"
              allowClear
              options={characters.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="factions"
            label="关联势力"
          >
            <Select
              mode="multiple"
              placeholder="选择关联势力（可选）"
              allowClear
              options={factions.map((f) => ({
                value: f.id,
                label: f.name,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑事件模态框 */}
      <Modal
        title="编辑事件"
        open={showEditEventModal}
        onOk={handleEditEvent}
        onCancel={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
          editForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="title"
            label="事件标题"
            rules={[{ required: true, message: '请输入事件标题' }]}
          >
            <Input placeholder="请输入事件标题" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="date"
            label="时间"
            rules={[{ required: true, message: '请输入事件发生的时间' }]}
          >
            <Input placeholder="例如：第1年、第1章、Day 1 等" />
          </Form.Item>

          <Form.Item
            name="type"
            label="事件类型"
            initialValue="normal"
          >
            <Select
              options={Object.entries(EVENT_TYPE_CONFIG).map(([value, cfg]) => ({
                value,
                label: (
                  <Space>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: cfg.color,
                      }}
                    />
                    <span>{cfg.label}</span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="事件描述"
          >
            <TextArea
              placeholder="请输入事件描述（可选）"
              rows={4}
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="输入标签后按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="characters"
            label="关联人物"
          >
            <Select
              mode="multiple"
              placeholder="选择关联人物（可选）"
              allowClear
              options={characters.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="factions"
            label="关联势力"
          >
            <Select
              mode="multiple"
              placeholder="选择关联势力（可选）"
              allowClear
              options={factions.map((f) => ({
                value: f.id,
                label: f.name,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TimelineEditor;
