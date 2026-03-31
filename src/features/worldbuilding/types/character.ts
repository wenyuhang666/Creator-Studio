/**
 * 人物类型定义模块
 * @module worldbuilding/types/character
 */

/**
 * 人物基础信息
 */
export interface Character {
  /** 唯一标识符 */
  id: string;
  /** 人物名称 */
  name: string;
  /** 人物描述 */
  description: string;
  /** 头像 URL */
  avatar?: string;
  /** 自定义属性键值对 */
  attributes: Record<string, string>;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * 关系类型枚举
 */
export type RelationshipType = 'friend' | 'enemy' | 'love' | 'family' | 'rival' | 'other';

/**
 * 人物关系
 */
export interface Relationship {
  /** 唯一标识符 */
  id: string;
  /** 源人物 ID */
  from: string;
  /** 目标人物 ID */
  to: string;
  /** 关系类型 */
  type: RelationshipType;
  /** 关系描述 */
  description: string;
  /** 创建时间戳 */
  createdAt: number;
}

/**
 * 关系图谱数据
 */
export interface CharacterGraphData {
  /** 人物列表 */
  characters: Character[];
  /** 关系列表 */
  relationships: Relationship[];
}

/**
 * React Flow 人物节点
 */
export interface CharacterNode {
  /** 节点 ID */
  id: string;
  /** 节点类型 */
  type: 'character';
  /** 节点位置 */
  position: { x: number; y: number };
  /** 节点数据 */
  data: {
    /** 关联的人物对象 */
    character: Character;
    /** 是否选中 */
    selected: boolean;
  };
}

/**
 * React Flow 关系边
 */
export interface RelationshipEdge {
  /** 边 ID */
  id: string;
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  /** 边类型 */
  type: 'smoothstep';
  /** 是否动画 */
  animated?: boolean;
  /** 边标签 */
  label?: string;
  /** 边数据 */
  data: {
    /** 关系类型 */
    relationshipType: RelationshipType;
  };
}
