/**
 * 人物卡片节点组件
 * @module worldbuilding/components
 */

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, Avatar, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { Character } from '../types';

/**
 * 人物卡片节点属性
 */
interface CharacterCardNodeProps extends NodeProps {
  data: {
    character: Character;
  };
}

/**
 * 人物卡片节点组件
 */
const CharacterCard: React.FC<CharacterCardNodeProps> = ({ data }) => {
  const { character } = data;

  return (
    <>
      {/* 连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#1890ff',
          width: 8,
          height: 8,
          border: '2px solid #fff',
        }}
      />
      
      <Card
        size="small"
        hoverable
        style={{
          minWidth: 150,
          maxWidth: 200,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #1890ff',
          borderRadius: 8,
        }}
        styles={{
          body: {
            padding: 12,
          }
        }}
      >
        {/* 人物头像和名称 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Avatar
            size={32}
            icon={<UserOutlined />}
            src={character.avatar}
            style={{ backgroundColor: '#1890ff' }}
          />
          <div style={{ 
            fontSize: 14, 
            fontWeight: 'bold',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {character.name}
          </div>
        </div>

        {/* 人物描述 */}
        {character.description && (
          <div
            style={{
              fontSize: 12,
              color: '#666',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              marginBottom: 8,
            }}
          >
            {character.description}
          </div>
        )}

        {/* 自定义属性标签 */}
        {Object.keys(character.attributes).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(character.attributes)
              .slice(0, 3)
              .map(([key, value]) => (
                <Tag
                  key={key}
                  style={{
                    fontSize: 10,
                    padding: '0 4px',
                    margin: 0,
                  }}
                >
                  {key}: {value}
                </Tag>
              ))}
            {Object.keys(character.attributes).length > 3 && (
              <Tag
                style={{
                  fontSize: 10,
                  padding: '0 4px',
                  margin: 0,
                }}
              >
                +{Object.keys(character.attributes).length - 3}
              </Tag>
            )}
          </div>
        )}
      </Card>

      {/* 连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#1890ff',
          width: 8,
          height: 8,
          border: '2px solid #fff',
        }}
      />
    </>
  );
};

export default CharacterCard;
