/**
 * 时间线类型定义模块
 * @module worldbuilding/types/timeline
 */

/**
 * 事件类型枚举
 */
export type EventType = 'normal' | 'plot_point' | 'foreshadow' | 'turning_point' | 'subplot';

/**
 * 时间线事件
 */
export interface TimelineEvent {
  /** 唯一标识符 */
  id: string;
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 时间线中的日期（相对或绝对） */
  date: string;
  /** 排序顺序 */
  order: number;
  /** 事件类型 */
  type: EventType;
  /** 标签列表 */
  tags: string[];
  /** 关联的章节 ID */
  chapterId?: string;
  /** 关联的人物 ID 列表 */
  characters: string[];
  /** 关联的势力 ID 列表 */
  factions: string[];
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * 时间线容器
 */
export interface Timeline {
  /** 唯一标识符 */
  id: string;
  /** 时间线名称 */
  name: string;
  /** 时间线描述 */
  description: string;
  /** 事件列表 */
  events: TimelineEvent[];
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * 时间线配置选项
 */
export interface TimelineConfig {
  /** 时间线方向 */
  orientation: 'horizontal' | 'vertical';
  /** 是否显示标签 */
  showLabels: boolean;
  /** 是否启用分组 */
  groupingEnabled: boolean;
}
