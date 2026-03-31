/**
 * 人物关系图谱状态管理模块
 * @module worldbuilding/store/characterStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Character, Relationship } from '../types';

/**
 * 人物关系图谱 Store 接口
 */
export interface CharacterStore {
  // 人物相关
  /** 人物列表 */
  characters: Character[];
  /** 添加人物 */
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Character;
  /** 更新人物 */
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  /** 删除人物 */
  deleteCharacter: (id: string) => void;
  /** 获取人物 */
  getCharacter: (id: string) => Character | undefined;

  // 关系相关
  /** 关系列表 */
  relationships: Relationship[];
  /** 添加关系 */
  addRelationship: (relationship: Omit<Relationship, 'id' | 'createdAt'>) => Relationship;
  /** 更新关系 */
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  /** 删除关系 */
  deleteRelationship: (id: string) => void;
  /** 获取人物的所有关系 */
  getRelationshipsByCharacter: (characterId: string) => Relationship[];

  // 工具方法
  /** 清空所有数据 */
  clearAll: () => void;
}

/**
 * 人物关系图谱状态管理 Store
 * 使用 Zustand 进行状态管理，支持 localStorage 持久化
 */
export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      characters: [],
      relationships: [],

      // ========== 人物 CRUD ==========

      /**
       * 添加新人物
       * @param character - 人物数据（不包含 id、createdAt、updatedAt）
       * @returns 创建的人物对象
       */
      addCharacter: (character) => {
        const now = Date.now();
        const newCharacter: Character = {
          ...character,
          id: nanoid(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          characters: [...state.characters, newCharacter],
        }));
        return newCharacter;
      },

      /**
       * 更新人物信息
       * @param id - 人物 ID
       * @param updates - 更新数据
       */
      updateCharacter: (id, updates) => {
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
          ),
        }));
      },

      /**
       * 删除人物及其相关关系
       * @param id - 人物 ID
       */
      deleteCharacter: (id) => {
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
          // 同时删除所有相关关系
          relationships: state.relationships.filter(
            (r) => r.from !== id && r.to !== id
          ),
        }));
      },

      /**
       * 根据 ID 获取人物
       * @param id - 人物 ID
       * @returns 人物对象或 undefined
       */
      getCharacter: (id) => {
        return get().characters.find((c) => c.id === id);
      },

      // ========== 关系 CRUD ==========

      /**
       * 添加人物关系
       * @param relationship - 关系数据（不包含 id、createdAt）
       * @returns 创建的关系对象
       */
      addRelationship: (relationship) => {
        const newRelationship: Relationship = {
          ...relationship,
          id: nanoid(),
          createdAt: Date.now(),
        };
        set((state) => ({
          relationships: [...state.relationships, newRelationship],
        }));
        return newRelationship;
      },

      /**
       * 更新关系信息
       * @param id - 关系 ID
       * @param updates - 更新数据
       */
      updateRelationship: (id, updates) => {
        set((state) => ({
          relationships: state.relationships.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      /**
       * 删除关系
       * @param id - 关系 ID
       */
      deleteRelationship: (id) => {
        set((state) => ({
          relationships: state.relationships.filter((r) => r.id !== id),
        }));
      },

      /**
       * 获取指定人物的所有关系
       * @param characterId - 人物 ID
       * @returns 该人物的所有关系列表（包含 from 和 to 都指向该人物的关系）
       */
      getRelationshipsByCharacter: (characterId) => {
        return get().relationships.filter(
          (r) => r.from === characterId || r.to === characterId
        );
      },

      // ========== 工具方法 ==========

      /**
       * 清空所有数据
       */
      clearAll: () => {
        set({ characters: [], relationships: [] });
      },
    }),
    {
      name: 'creator-studio-character-store',
    }
  )
);
