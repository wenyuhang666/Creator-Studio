/**
 * 世界观构建模块自定义 Hooks
 * @module worldbuilding/hooks
 */

import { useMemo, useCallback } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { useFactionStore } from '../store/factionStore';
import { useTimelineStore } from '../store/timelineStore';
import type { Character, Faction, TimelineEvent, FactionTreeNode } from '../types';

/**
 * 人物关系 Hook
 */
export const useCharacterRelationships = (characterId: string) => {
  const { relationships, getCharacter } = useCharacterStore();

  const characterRelationships = useMemo(() => {
    return relationships
      .filter((r) => r.from === characterId || r.to === characterId)
      .map((r) => {
        const isSource = r.from === characterId;
        const otherId = isSource ? r.to : r.from;
        const otherCharacter = getCharacter(otherId);
        return {
          ...r,
          isSource,
          otherCharacter,
        };
      });
  }, [characterId, relationships, getCharacter]);

  const relationshipStats = useMemo(() => {
    const stats = {
      total: characterRelationships.length,
      friend: 0,
      enemy: 0,
      love: 0,
      family: 0,
      rival: 0,
      other: 0,
    };
    characterRelationships.forEach((r) => {
      stats[r.type]++;
    });
    return stats;
  }, [characterRelationships]);

  return {
    relationships: characterRelationships,
    stats: relationshipStats,
  };
};

/**
 * 势力关系 Hook
 */
export const useFactionRelationships = (factionId: string) => {
  const { relations, getFaction } = useFactionStore();

  const factionRelations = useMemo(() => {
    return relations
      .filter((r) => r.from === factionId || r.to === factionId)
      .map((r) => {
        const isSource = r.from === factionId;
        const otherId = isSource ? r.to : r.from;
        const otherFaction = getFaction(otherId);
        return {
          ...r,
          isSource,
          otherFaction,
        };
      });
  }, [factionId, relations, getFaction]);

  const relationStats = useMemo(() => {
    const stats = {
      total: factionRelations.length,
      ally: 0,
      hostile: 0,
      neutral: 0,
      unknown: 0,
    };
    factionRelations.forEach((r) => {
      stats[r.type]++;
    });
    return stats;
  }, [factionRelations]);

  return {
    relations: factionRelations,
    stats: relationStats,
  };
};

/**
 * 时间线事件聚合 Hook
 */
export const useTimelineEvents = (timelineId?: string) => {
  const { timelines, activeTimelineId } = useTimelineStore();

  const timeline = useMemo(() => {
    const id = timelineId || activeTimelineId;
    return timelines.find((t) => t.id === id);
  }, [timelineId, activeTimelineId, timelines]);

  const sortedEvents = useMemo(() => {
    if (!timeline) return [];
    return [...timeline.events].sort((a, b) => a.order - b.order);
  }, [timeline]);

  const eventsByType = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    sortedEvents.forEach((event) => {
      if (!grouped[event.type]) {
        grouped[event.type] = [];
      }
      grouped[event.type].push(event);
    });
    return grouped;
  }, [sortedEvents]);

  const eventsByCharacter = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    sortedEvents.forEach((event) => {
      event.characters.forEach((charId) => {
        if (!grouped[charId]) {
          grouped[charId] = [];
        }
        grouped[charId].push(event);
      });
    });
    return grouped;
  }, [sortedEvents]);

  const eventsByFaction = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    sortedEvents.forEach((event) => {
      event.factions.forEach((factionId) => {
        if (!grouped[factionId]) {
          grouped[factionId] = [];
        }
        grouped[factionId].push(event);
      });
    });
    return grouped;
  }, [sortedEvents]);

  return {
    timeline,
    events: sortedEvents,
    eventsByType,
    eventsByCharacter,
    eventsByFaction,
  };
};

/**
 * 势力树 Hook
 */
export const useFactionTree = () => {
  const { buildFactionTree, factions } = useFactionStore();

  const tree = useMemo(() => buildFactionTree(), [factions, buildFactionTree]);

  const flatList = useMemo(() => {
    const result: Array<{ faction: Faction; level: number }> = [];
    
    const traverse = (nodes: FactionTreeNode[]) => {
      nodes.forEach((node) => {
        result.push({ faction: node.faction, level: node.level });
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(tree);
    return result;
  }, [tree]);

  const getDescendants = useCallback((factionId: string): string[] => {
    const result: string[] = [];
    
    const traverse = (nodes: FactionTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.faction.id !== factionId) {
          result.push(node.faction.id);
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    const rootNode = tree.find((n) => n.faction.id === factionId);
    if (rootNode) {
      traverse(rootNode.children);
    }
    
    return result;
  }, [tree]);

  return {
    tree,
    flatList,
    getDescendants,
  };
};

/**
 * 世界观统计 Hook
 */
export const useWorldbuildingStats = () => {
  const { characters, relationships } = useCharacterStore();
  const { factions, relations } = useFactionStore();
  const { timelines } = useTimelineStore();

  const stats = useMemo(() => {
    const totalEvents = timelines.reduce((sum, t) => sum + t.events.length, 0);
    
    return {
      characters: {
        total: characters.length,
        relationships: relationships.length,
      },
      factions: {
        total: factions.length,
        relations: relations.length,
      },
      timelines: {
        total: timelines.length,
        events: totalEvents,
      },
    };
  }, [characters, relationships, factions, relations, timelines]);

  return stats;
};

/**
 * 搜索 Hook
 */
export const useWorldbuildingSearch = () => {
  const { characters } = useCharacterStore();
  const { factions } = useFactionStore();
  const { timelines } = useTimelineStore();

  const searchCharacters = useCallback((query: string): Character[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery)
    );
  }, [characters]);

  const searchFactions = useCallback((query: string): Faction[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return factions.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.description.toLowerCase().includes(lowerQuery) ||
        f.attributes.territory?.toLowerCase().includes(lowerQuery) ||
        f.attributes.goal?.toLowerCase().includes(lowerQuery)
    );
  }, [factions]);

  const searchEvents = useCallback((query: string): TimelineEvent[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    const results: TimelineEvent[] = [];
    
    timelines.forEach((timeline) => {
      timeline.events.forEach((event) => {
        if (
          event.title.toLowerCase().includes(lowerQuery) ||
          event.description.toLowerCase().includes(lowerQuery) ||
          event.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        ) {
          results.push(event);
        }
      });
    });
    
    return results;
  }, [timelines]);

  const search = useCallback((query: string) => {
    return {
      characters: searchCharacters(query),
      factions: searchFactions(query),
      events: searchEvents(query),
    };
  }, [searchCharacters, searchFactions, searchEvents]);

  return {
    search,
    searchCharacters,
    searchFactions,
    searchEvents,
  };
};
