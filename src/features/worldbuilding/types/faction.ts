/**
 * 势力类型定义模块
 * @module worldbuilding/types/faction
 */

/**
 * 势力基础信息
 */
export interface Faction {
  /** 唯一标识符 */
  id: string;
  /** 势力名称 */
  name: string;
  /** 势力描述 */
  description: string;
  /** 上级势力 ID */
  parentId?: string;
  /** 成员 Character ID 列表 */
  members: string[];
  /** 势力属性 */
  attributes: {
    /** 地盘/控制区域 */
    territory?: string;
    /** 实力等级 */
    strength?: string;
    /** 组织目标 */
    goal?: string;
    /** 意识形态 */
    ideology?: string;
  };
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * 势力树形节点
 */
export interface FactionTreeNode {
  /** 势力对象 */
  faction: Faction;
  /** 子节点列表 */
  children: FactionTreeNode[];
  /** 树层级 */
  level: number;
}

/**
 * 势力关系类型枚举
 */
export type FactionRelationType = 'ally' | 'hostile' | 'neutral' | 'unknown';

/**
 * 势力关系
 */
export interface FactionRelation {
  /** 唯一标识符 */
  id: string;
  /** 源势力 ID */
  from: string;
  /** 目标势力 ID */
  to: string;
  /** 关系类型 */
  type: FactionRelationType;
  /** 关系描述 */
  description: string;
}
