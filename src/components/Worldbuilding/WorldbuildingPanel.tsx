/**
 * 世界观编辑器面板组件
 * @module worldbuilding/panel
 */

import React, { useState } from 'react';
import { Tabs, Tag, Space, Button, Badge, Drawer, Typography } from 'antd';
import {
  TeamOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import AIExtractModal from '../../features/worldbuilding/components/AIExtractModal';
import { CharacterGraph } from '../../features/worldbuilding/components/CharacterGraph';
import FactionTree from '../../features/worldbuilding/components/FactionTree';
import TimelineEditor from '../../features/worldbuilding/components/TimelineEditor';
import { useWorldbuildingStats } from '../../features/worldbuilding/hooks';
import type { Character, Faction, TimelineEvent } from '../../features/worldbuilding/types';

const { Text } = Typography;

/**
 * 世界观编辑器面板组件
 */
const WorldbuildingPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('character');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const stats = useWorldbuildingStats();
  const [extractModalVisible, setExtractModalVisible] = useState(false);

  // 渲染人物详情
  const renderCharacterDetail = () => {
    if (!selectedCharacter) return null;
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text strong style={{ fontSize: 16 }}>{selectedCharacter.name}</Text>
          <Button 
            type="text" 
            size="small" 
            icon={<CloseOutlined />} 
            onClick={() => setDetailVisible(false)} 
          />
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">描述：</Text>
            <div>{selectedCharacter.description || '暂无描述'}</div>
          </div>
          {Object.keys(selectedCharacter.attributes).length > 0 && (
            <div>
              <Text type="secondary">属性：</Text>
              <div style={{ marginTop: 8 }}>
                {Object.entries(selectedCharacter.attributes).map(([key, value]) => (
                  <Tag key={key} style={{ marginBottom: 4 }}>{key}: {String(value)}</Tag>
                ))}
              </div>
            </div>
          )}
        </Space>
      </div>
    );
  };

  // 渲染势力详情
  const renderFactionDetail = () => {
    if (!selectedFaction) return null;
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text strong style={{ fontSize: 16 }}>{selectedFaction.name}</Text>
          <Button 
            type="text" 
            size="small" 
            icon={<CloseOutlined />} 
            onClick={() => setDetailVisible(false)} 
          />
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">描述：</Text>
            <div>{selectedFaction.description || '暂无描述'}</div>
          </div>
          {selectedFaction.attributes.territory && (
            <div>
              <Text type="secondary">地盘：</Text>
              <div>{selectedFaction.attributes.territory}</div>
            </div>
          )}
          {selectedFaction.attributes.strength && (
            <div>
              <Text type="secondary">实力：</Text>
              <div>{selectedFaction.attributes.strength}</div>
            </div>
          )}
          {selectedFaction.attributes.goal && (
            <div>
              <Text type="secondary">目标：</Text>
              <div>{selectedFaction.attributes.goal}</div>
            </div>
          )}
          {selectedFaction.members.length > 0 && (
            <div>
              <Text type="secondary">成员数：</Text>
              <div>{selectedFaction.members.length} 人</div>
            </div>
          )}
        </Space>
      </div>
    );
  };

  // 渲染事件详情
  const renderEventDetail = () => {
    if (!selectedEvent) return null;
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text strong style={{ fontSize: 16 }}>{selectedEvent.title}</Text>
          <Button 
            type="text" 
            size="small" 
            icon={<CloseOutlined />} 
            onClick={() => setDetailVisible(false)} 
          />
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">时间：</Text>
            <div>{selectedEvent.date}</div>
          </div>
          <div>
            <Text type="secondary">描述：</Text>
            <div>{selectedEvent.description || '暂无描述'}</div>
          </div>
          {selectedEvent.tags.length > 0 && (
            <div>
              <Text type="secondary">标签：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedEvent.tags.map((tag: string, idx: number) => (
                  <Tag key={idx} color="blue">#{tag}</Tag>
                ))}
              </div>
            </div>
          )}
        </Space>
      </div>
    );
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f5f5f5',
    }}>
      {/* 统计概览 */}
      <div style={{ 
        padding: '12px 24px', 
        background: '#fff', 
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}>
        <Space size="large" wrap>
          <Badge count={stats.characters.total} showZero color="#1890ff" size="small">
            <Tag icon={<TeamOutlined />} style={{ margin: 0 }}>人物</Tag>
          </Badge>
          <Badge count={stats.factions.total} showZero color="#52c41a" size="small">
            <Tag icon={<ApartmentOutlined />} style={{ margin: 0 }}>势力</Tag>
          </Badge>
          <Badge count={stats.timelines.events} showZero color="#722ed1" size="small">
            <Tag icon={<ClockCircleOutlined />} style={{ margin: 0 }}>事件</Tag>
          </Badge>
        </Space>
      </div>

      {/* 标签页 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ height: '100%' }}
          tabBarStyle={{ marginBottom: 0, paddingLeft: 16 }}
          tabBarExtraContent={
            <Button
              type="primary"
              icon={<RobotOutlined />}
              size="small"
              onClick={() => setExtractModalVisible(true)}
              style={{ marginRight: 16 }}
            >
              AI 提取
            </Button>
          }
          items={[
            {
              key: 'character',
              label: (
                <span>
                  <TeamOutlined />
                  人物关系
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100% - 49px)' }}>
                  <CharacterGraph 
                    onSelectCharacter={(character) => {
                      setSelectedCharacter(character);
                      if (character) setDetailVisible(true);
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'faction',
              label: (
                <span>
                  <ApartmentOutlined />
                  势力结构
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100% - 49px)' }}>
                  <FactionTree 
                    onSelectFaction={(faction: Faction | null) => {
                      setSelectedFaction(faction);
                      if (faction) setDetailVisible(true);
                    }} 
                  />
                </div>
              ),
            },
            {
              key: 'timeline',
              label: (
                <span>
                  <ClockCircleOutlined />
                  时间线
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100% - 49px)' }}>
                  <TimelineEditor 
                    onSelectEvent={(event) => {
                      setSelectedEvent(event);
                      if (event) setDetailVisible(true);
                    }} 
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* 详情抽屉 */}
      <Drawer
        title="详情"
        placement="right"
        width={320}
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
        destroyOnClose
      >
        {activeTab === 'character' && renderCharacterDetail()}
        {activeTab === 'faction' && renderFactionDetail()}
        {activeTab === 'timeline' && renderEventDetail()}
      </Drawer>
      <AIExtractModal
        visible={extractModalVisible}
        onClose={() => setExtractModalVisible(false)}
      />
    </div>
  );
};

export default WorldbuildingPanel;
