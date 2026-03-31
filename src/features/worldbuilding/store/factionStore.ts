/**
 * 势力状态管理模块
 * @module worldbuilding/store/factionStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Faction, FactionRelation, FactionTreeNode } from '../types';

/**
 * 势力Store 接口
 */
export interface FactionStore {
  // 势力相关
  /** 势力列表 */
  factions: Faction[];
  /** 添加势力 */
  addFaction: (faction: Omit<Faction, 'id' | 'createdAt' | 'updatedAt'>) => Faction;
  /** 更新势力 */
  updateFaction: (id: string, updates: Partial<Faction>) => void;
  /** 删除势力 */
  deleteFaction: (id: string) => void;
  /** 获取势力 */
  getFaction: (id: string) => Faction | undefined;

  // 势力关系相关
  /** 势力关系列表 */
  relations: FactionRelation[];
  /** 添加势力关系 */
  addRelation: (relation: Omit<FactionRelation, 'id'>) => FactionRelation;
  /** 更新势力关系 */
  updateRelation: (id: string, updates: Partial<FactionRelation>) => void;
  /** 删除势力关系 */
  deleteRelation: (id: string) => void;

  // 树形结构相关
  /** 构建势力树 */
  buildFactionTree: () => FactionTreeNode[];
  /** 获取势力成员 */
  getFactionMembers: (factionId: string) => string[];

  // 工具方法
  /** 清空所有数据 */
  clearAll: () => void;
}

/**
 * 势力状态管理 Store
 * 使用 Zustand 进行状态管理，支持 localStorage 持久化
 */
export const useFactionStore = create<FactionStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      factions: [],
      relations: [],

      // ========== 势力 CRUD ==========

      /**
       * 添加新势力
       */
      addFaction: (faction) => {
        const now = Date.now();
        const newFaction: Faction = {
          ...faction,
          id: nanoid(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          factions: [...state.factions, newFaction],
        }));
        return newFaction;
      },

      /**
       * 更新势力信息
       */
      updateFaction: (id, updates) => {
        set((state) => ({
          factions: state.factions.map((f) =>
            f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f
          ),
        }));
      },

      /**
       * 删除势力及其子势力和关系
       */
      deleteFaction: (id) => {
        const state = get();
        // 递归获取所有需要删除的势力ID（包括子势力）
        const getDescendantIds = (parentId: string): string[] => {
          const children = state.factions.filter((f) => f.parentId === parentId);
          return [
            parentId,
            ...children.flatMap((c) => getDescendantIds(c.id)),
          ];
        };
        const idsToDelete = new Set(getDescendantIds(id));

        set((state) => ({
          factions: state.factions.filter((f) => !idsToDelete.has(f.id)),
          relations: state.relations.filter(
            (r) => !idsToDelete.has(r.from) && !idsToDelete.has(r.to)
          ),
        }));
      },

      /**
       * 根据 ID 获取势力
       */
      getFaction: (id) => {
        return get().factions.find((f) => f.id === id);
      },

      // ========== 势力关系 CRUD ==========

      /**
       * 添加势力关系
       */
      addRelation: (relation) => {
        const newRelation: FactionRelation = {
          ...relation,
          id: nanoid(),
        };
        set((state) => ({
          relations: [...state.relations, newRelation],
        }));
        return newRelation;
      },

      /**
       * 更新势力关系
       */
      updateRelation: (id, updates) => {
        set((state) => ({
          relations: state.relations.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      /**
       * 删除势力关系
       */
      deleteRelation: (id) => {
        set((state) => ({
          relations: state.relations.filter((r) => r.id !== id),
        }));
      },

      // ========== 树形结构相关 ==========

      /**
       * 构建势力树
       */
      buildFactionTree: () => {
        const { factions } = get();
        const buildNode = (faction: Faction, level: number): FactionTreeNode => ({
          faction,
          level,
          children: factions
            .filter((f) => f.parentId === faction.id)
            .map((f) => buildNode(f, level + 1)),
        });

        // 返回顶层势力（没有父级的势力）
        return factions
          .filter((f) => !f.parentId)
          .map((f) => buildNode(f, 0));
      },

      /**
       * 获取势力成员ID列表
       */
      getFactionMembers: (factionId) => {
        const { factions } = get();
        const result: string[] = [];
        
        // 递归获取所有成员
        const collectMembers = (id: string) => {
          const faction = factions.find((f) => f.id === id);
          if (faction) {
            result.push(...faction.members);
            // 子势力的成员也算
            factions
              .filter((f) => f.parentId === id)
              .forEach((f) => collectMembers(f.id));
          }
        };
        
        collectMembers(factionId);
        return [...new Set(result)]; // 去重
      },

      // ========== 工具方法 ==========

      /**
       * 清空所有数据
       */
      clearAll: () => {
        set({ factions: [], relations: [] });
      },
    }),
    {
      name: 'creator-studio-faction-store',
    }
  )
);

export default useFactionStore;
