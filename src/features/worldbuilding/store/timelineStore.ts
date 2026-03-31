/**
 * 时间线状态管理模块
 * @module worldbuilding/store/timelineStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Timeline, TimelineEvent, TimelineConfig } from '../types';

/**
 * 时间线Store 接口
 */
export interface TimelineStore {
  // 时间线相关
  /** 时间线列表 */
  timelines: Timeline[];
  /** 当前选中的时间线 ID */
  activeTimelineId: string | null;
  /** 添加时间线 */
  addTimeline: (timeline: Omit<Timeline, 'id' | 'createdAt' | 'updatedAt' | 'events'>) => Timeline;
  /** 更新时间线 */
  updateTimeline: (id: string, updates: Partial<Timeline>) => void;
  /** 删除时间线 */
  deleteTimeline: (id: string) => void;
  /** 获取时间线 */
  getTimeline: (id: string) => Timeline | undefined;
  /** 切换当前时间线 */
  setActiveTimeline: (id: string | null) => void;

  // 事件相关
  /** 添加事件 */
  addEvent: (timelineId: string, event: Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'>) => TimelineEvent;
  /** 更新事件 */
  updateEvent: (timelineId: string, eventId: string, updates: Partial<TimelineEvent>) => void;
  /** 删除事件 */
  deleteEvent: (timelineId: string, eventId: string) => void;
  /** 移动事件位置 */
  moveEvent: (timelineId: string, eventId: string, newOrder: number) => void;

  // 配置相关
  /** 时间线配置 */
  config: TimelineConfig;
  /** 更新配置 */
  updateConfig: (updates: Partial<TimelineConfig>) => void;

  // 工具方法
  /** 清空所有数据 */
  clearAll: () => void;
  /** 导出时间线数据 */
  exportTimeline: (id: string) => Timeline | undefined;
}

/**
 * 时间线状态管理 Store
 * 使用 Zustand 进行状态管理，支持 localStorage 持久化
 */
export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      timelines: [],
      activeTimelineId: null,
      config: {
        orientation: 'horizontal',
        showLabels: true,
        groupingEnabled: true,
      },

      // ========== 时间线 CRUD ==========

      /**
       * 添加新时间线
       */
      addTimeline: (timeline) => {
        const now = Date.now();
        const newTimeline: Timeline = {
          ...timeline,
          id: nanoid(),
          events: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          timelines: [...state.timelines, newTimeline],
          activeTimelineId: state.activeTimelineId || newTimeline.id,
        }));
        return newTimeline;
      },

      /**
       * 更新时间线信息
       */
      updateTimeline: (id, updates) => {
        set((state) => ({
          timelines: state.timelines.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        }));
      },

      /**
       * 删除时间线
       */
      deleteTimeline: (id) => {
        set((state) => ({
          timelines: state.timelines.filter((t) => t.id !== id),
          activeTimelineId:
            state.activeTimelineId === id
              ? state.timelines.find((t) => t.id !== id)?.id || null
              : state.activeTimelineId,
        }));
      },

      /**
       * 根据 ID 获取时间线
       */
      getTimeline: (id) => {
        return get().timelines.find((t) => t.id === id);
      },

      /**
       * 切换当前时间线
       */
      setActiveTimeline: (id) => {
        set({ activeTimelineId: id });
      },

      // ========== 事件 CRUD ==========

      /**
       * 添加事件到时间线
       */
      addEvent: (timelineId, event) => {
        const now = Date.now();
        const newEvent: TimelineEvent = {
          ...event,
          id: nanoid(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          timelines: state.timelines.map((t) =>
            t.id === timelineId
              ? {
                  ...t,
                  events: [...t.events, newEvent].sort((a, b) => a.order - b.order),
                  updatedAt: now,
                }
              : t
          ),
        }));
        return newEvent;
      },

      /**
       * 更新事件
       */
      updateEvent: (timelineId, eventId, updates) => {
        set((state) => ({
          timelines: state.timelines.map((t) =>
            t.id === timelineId
              ? {
                  ...t,
                  events: t.events.map((e) =>
                    e.id === eventId ? { ...e, ...updates, updatedAt: Date.now() } : e
                  ),
                  updatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      /**
       * 删除事件
       */
      deleteEvent: (timelineId, eventId) => {
        set((state) => ({
          timelines: state.timelines.map((t) =>
            t.id === timelineId
              ? {
                  ...t,
                  events: t.events.filter((e) => e.id !== eventId),
                  updatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      /**
       * 移动事件位置
       */
      moveEvent: (timelineId, eventId, newOrder) => {
        set((state) => ({
          timelines: state.timelines.map((t) => {
            if (t.id !== timelineId) return t;
            
            const events = [...t.events];
            const eventIndex = events.findIndex((e) => e.id === eventId);
            if (eventIndex === -1) return t;

            // 移除事件
            const [event] = events.splice(eventIndex, 1);
            // 插入到新位置
            const insertIndex = events.findIndex((e) => e.order >= newOrder);
            if (insertIndex === -1) {
              events.push({ ...event, order: newOrder });
            } else {
              events.splice(insertIndex, 0, { ...event, order: newOrder });
            }
            
            // 重新排序
            events.forEach((e, idx) => {
              e.order = idx;
            });

            return { ...t, events, updatedAt: Date.now() };
          }),
        }));
      },

      // ========== 配置相关 ==========

      /**
       * 更新配置
       */
      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
      },

      // ========== 工具方法 ==========

      /**
       * 清空所有数据
       */
      clearAll: () => {
        set({ timelines: [], activeTimelineId: null });
      },

      /**
       * 导出时间线数据
       */
      exportTimeline: (id) => {
        const timeline = get().timelines.find((t) => t.id === id);
        if (timeline) {
          return JSON.parse(JSON.stringify(timeline));
        }
        return undefined;
      },
    }),
    {
      name: 'creator-studio-timeline-store',
    }
  )
);

export default useTimelineStore;
