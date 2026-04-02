import type { Character, Relationship } from '../types';
import type { ExtractedWorldbuilding } from '../../../lib/ai';

interface MergePreview {
  newCharacters: ExtractedWorldbuilding['characters'];
  updatedCharacters: Array<{ existing: Character; updates: Partial<Character> }>;
  newRelationships: ExtractedWorldbuilding['relationships'];
  newFactions: ExtractedWorldbuilding['factions'];
  newEvents: ExtractedWorldbuilding['events'];
}

function nameMatches(a: string, b: string): boolean {
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * 将 AI 提取的世界观数据与现有 store 数据对比，生成预览
 */
export function buildMergePreview(
  extracted: ExtractedWorldbuilding,
  existingCharacters: Character[],
  existingRelationships: Relationship[],
): MergePreview {
  const newChars: ExtractedWorldbuilding['characters'] = [];
  const updatedChars: MergePreview['updatedCharacters'] = [];

  for (const ext of extracted.characters) {
    const match = existingCharacters.find((c) => nameMatches(c.name, ext.name));
    if (match) {
      const updates: Partial<Character> = {};
      if (ext.description && !match.description) updates.description = ext.description;
      if (Object.keys(updates).length > 0) {
        updatedChars.push({ existing: match, updates });
      }
    } else {
      newChars.push(ext);
    }
  }

  // 过滤已存在的关系（from+to+type 匹配）
  const newRels = (extracted.relationships ?? []).filter((rel) => {
    return !existingRelationships.some((r) => {
      const fromChar = existingCharacters.find((c) => c.id === r.from);
      const toChar = existingCharacters.find((c) => c.id === r.to);
      return (
        fromChar &&
        toChar &&
        nameMatches(fromChar.name, rel.from) &&
        nameMatches(toChar.name, rel.to) &&
        r.type === rel.type
      );
    });
  });

  return {
    newCharacters: newChars,
    updatedCharacters: updatedChars,
    newRelationships: newRels,
    newFactions: extracted.factions ?? [],
    newEvents: extracted.events ?? [],
  };
}

export type { MergePreview };
