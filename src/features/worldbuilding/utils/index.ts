/**
 * 世界观构建模块工具函数
 * @module worldbuilding/utils
 */

import type { Character, Faction, TimelineEvent, CharacterGraphData, FactionTreeNode } from '../types';

/**
 * 导出人物关系图谱数据
 */
export const exportCharacterGraph = (
  characters: Character[],
  relationships: CharacterGraphData['relationships']
): string => {
  const data: CharacterGraphData = {
    characters,
    relationships,
  };
  return JSON.stringify(data, null, 2);
};

/**
 * 导入人物关系图谱数据
 */
export const importCharacterGraph = (jsonString: string): CharacterGraphData | null => {
  try {
    const data = JSON.parse(jsonString);
    if (data.characters && data.relationships) {
      return {
        characters: data.characters,
        relationships: data.relationships,
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * 导出台式格式数据
 */
export const exportFactionTree = (
  nodes: FactionTreeNode[]
): string => {
  return JSON.stringify(nodes, null, 2);
};

/**
 * 导入台式格式数据
 */
export const importFactionTree = (jsonString: string): FactionTreeNode[] | null => {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * 导出的时间线数据
 */
export const exportTimeline = (
  name: string,
  description: string,
  events: TimelineEvent[]
): string => {
  return JSON.stringify({ name, description, events }, null, 2);
};

/**
 * 导入时间线数据
 */
export const importTimeline = (
  jsonString: string
): { name: string; description: string; events: TimelineEvent[] } | null => {
  try {
    const data = JSON.parse(jsonString);
    if (data.name && data.events) {
      return {
        name: data.name,
        description: data.description || '',
        events: data.events,
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * 生成人物关系报告
 */
export const generateCharacterReport = (
  characters: Character[],
  relationships: CharacterGraphData['relationships']
): string => {
  const lines: string[] = ['# 人物关系报告\n'];

  characters.forEach((char) => {
    const charRelations = relationships.filter(
      (r) => r.from === char.id || r.to === char.id
    );

    lines.push(`## ${char.name}`);
    lines.push(`- ID: ${char.id}`);
    lines.push(`- 描述: ${char.description || '无'}`);

    if (charRelations.length > 0) {
      lines.push(`- 关系数量: ${charRelations.length}`);
      lines.push('\n### 关系列表:');
      charRelations.forEach((rel) => {
        const isSource = rel.from === char.id;
        const otherId = isSource ? rel.to : rel.from;
        const otherChar = characters.find((c) => c.id === otherId);
        const direction = isSource ? '→' : '←';
        lines.push(`  - ${direction} ${otherChar?.name || '未知'}: ${rel.description || rel.type}`);
      });
    } else {
      lines.push('- 关系数量: 0');
    }
    lines.push('');
  });

  return lines.join('\n');
};

/**
 * 生成势力关系报告
 */
export const generateFactionReport = (factions: Faction[]): string => {
  const lines: string[] = ['# 势力关系报告\n'];

  // 按层级分组
  const byLevel: Record<number, Faction[]> = {};
  const collectLevels = (nodes: FactionTreeNode[], level = 0) => {
    nodes.forEach((node) => {
      if (!byLevel[level]) {
        byLevel[level] = [];
      }
      byLevel[level].push(node.faction);
      if (node.children.length > 0) {
        collectLevels(node.children, level + 1);
      }
    });
  };

  // 这里简化处理，实际应该传入树结构
  factions.forEach((faction) => {
    const level = faction.parentId ? 1 : 0;
    if (!byLevel[level]) {
      byLevel[level] = [];
    }
    byLevel[level].push(faction);
  });

  Object.entries(byLevel)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([level, items]) => {
      lines.push(`## 层级 ${Number(level) + 1}`);
      items.forEach((faction) => {
        lines.push(`- ${faction.name}`);
        if (faction.parentId) {
          const parent = factions.find((f) => f.id === faction.parentId);
          if (parent) {
            lines.push(`  - 上级: ${parent.name}`);
          }
        }
        lines.push(`  - 成员数: ${faction.members.length}`);
        if (faction.attributes.territory) {
          lines.push(`  - 地盘: ${faction.attributes.territory}`);
        }
        if (faction.attributes.strength) {
          lines.push(`  - 实力: ${faction.attributes.strength}`);
        }
      });
    });

  return lines.join('\n');
};

/**
 * 生成时间线报告
 */
export const generateTimelineReport = (
  name: string,
  events: TimelineEvent[]
): string => {
  const lines: string[] = [`# ${name} 时间线报告\n`];

  if (events.length === 0) {
    lines.push('_暂无事件_');
    return lines.join('\n');
  }

  // 按类型分组
  const byType: Record<string, TimelineEvent[]> = {};
  events.forEach((event) => {
    if (!byType[event.type]) {
      byType[event.type] = [];
    }
    byType[event.type].push(event);
  });

  lines.push(`总计 ${events.length} 个事件\n`);

  Object.entries(byType).forEach(([type, items]) => {
    lines.push(`## ${type} (${items.length})`);
    items
      .sort((a, b) => a.order - b.order)
      .forEach((event) => {
        lines.push(`### ${event.date}: ${event.title}`);
        if (event.description) {
          lines.push(event.description);
        }
        if (event.tags.length > 0) {
          lines.push(`标签: ${event.tags.join(', ')}`);
        }
        if (event.characters.length > 0) {
          lines.push(`涉及人物: ${event.characters.length} 人`);
        }
        if (event.factions.length > 0) {
          lines.push(`涉及势力: ${event.factions.length} 个`);
        }
        lines.push('');
      });
  });

  return lines.join('\n');
};

/**
 * 计算关系密度
 */
export const calculateRelationshipDensity = (
  characters: Character[],
  relationships: CharacterGraphData['relationships']
): number => {
  if (characters.length < 2) return 0;
  const maxRelationships = (characters.length * (characters.length - 1)) / 2;
  return relationships.length / maxRelationships;
};

/**
 * 计算势力覆盖度
 */
export const calculateFactionCoverage = (
  characters: Character[],
  factions: Faction[]
): number => {
  if (characters.length === 0) return 0;
  const charactersInFactions = new Set(
    factions.flatMap((f) => f.members)
  );
  return charactersInFactions.size / characters.length;
};

/**
 * 计算事件密度
 */
export const calculateEventDensity = (
  events: TimelineEvent[],
  type?: string
): number => {
  if (events.length === 0) return 0;
  if (!type) return events.length;
  return events.filter((e) => e.type === type).length / events.length;
};

/**
 * 格式化时间戳
 */
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  
  return formatTimestamp(timestamp);
};
