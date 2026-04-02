export type BokTier = 'SEED' | 'SPROUT' | 'FLOWER' | 'TREE' | 'FOREST'

export const TIER_THRESHOLDS: Record<BokTier, number> = {
  SEED: 0,
  SPROUT: 500,
  FLOWER: 2000,
  TREE: 5000,
  FOREST: 15000,
}

export const TIER_LABELS: Record<BokTier, string> = {
  SEED: '복의 씨앗',
  SPROUT: '복의 새싹',
  FLOWER: '복의 꽃',
  TREE: '복의 나무',
  FOREST: '복의 숲',
}

export function getTierLabel(tier: BokTier): string {
  return TIER_LABELS[tier] || '복의 씨앗'
}

export function getNextTierThreshold(tier: BokTier): number {
  const tiers: BokTier[] = ['SEED', 'SPROUT', 'FLOWER', 'TREE', 'FOREST']
  const idx = tiers.indexOf(tier)
  if (idx >= tiers.length - 1) return TIER_THRESHOLDS.FOREST
  return TIER_THRESHOLDS[tiers[idx + 1]]
}
