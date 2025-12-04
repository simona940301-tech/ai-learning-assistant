/**
 * 🎨 Avatar Preset System
 *
 * Provides 24 pre-designed pixel art avatars for instant selection
 * Categorized by style for easy browsing
 */

export interface AvatarPreset {
  id: string
  name: string
  category: 'fairy'
  emoji: string // Fallback for when image is not available
  imageUrl: string // Path to the preset avatar image
  color: string
  description: string
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // 🧚 Fairy系列 - 精靈角色
  {
    id: 'fairy-lightblue',
    name: '天空精靈',
    category: 'fairy',
    emoji: '🧚‍♀️',
    imageUrl: '/avatars/presets/fairy/avatarlightblue.png',
    color: '#3B82F6',
    description: '來自天空的智慧精靈'
  },
  {
    id: 'fairy-pink',
    name: '櫻花精靈',
    category: 'fairy',
    emoji: '🌸',
    imageUrl: '/avatars/presets/fairy/avatarpink.png',
    color: '#EC4899',
    description: '溫柔優雅的櫻花仙子'
  },
  {
    id: 'fairy-purple',
    name: '星夜精靈',
    category: 'fairy',
    emoji: '⭐',
    imageUrl: '/avatars/presets/fairy/avatarpurple.png',
    color: '#8B5CF6',
    description: '神秘的星夜守護者'
  },
  {
    id: 'fairy-white',
    name: '月光精靈',
    category: 'fairy',
    emoji: '🌙',
    imageUrl: '/avatars/presets/fairy/avatarwhite.png',
    color: '#6B7280',
    description: '純潔的月光使者'
  },
  {
    id: 'fairy-zebra',
    name: '斑馬精靈',
    category: 'fairy',
    emoji: '🦓',
    imageUrl: '/avatars/presets/fairy/avatarzebra.png',
    color: '#374151',
    description: '活潑的斑馬精靈'
  },
  {
    id: 'fairy-green',
    name: '森林精靈',
    category: 'fairy',
    emoji: '🌿',
    imageUrl: '/avatars/presets/fairy/avatergreen.png',
    color: '#10B981',
    description: '大自然的守護精靈'
  },
]

export const AVATAR_CATEGORIES = [
  { id: 'fairy', label: '精靈', icon: '🧚‍♀️', description: '魔幻精靈風格' },
] as const

/**
 * Get avatar preset by ID
 */
export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find(preset => preset.id === id)
}

/**
 * Get avatars by category
 */
export function getAvatarsByCategory(category: AvatarPreset['category']): AvatarPreset[] {
  return AVATAR_PRESETS.filter(preset => preset.category === category)
}

/**
 * Get random avatar preset
 */
export function getRandomAvatar(): AvatarPreset {
  return AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)]
}

/**
 * Get random fairy avatar for opponent (system AI)
 * 用於對戰時隨機選擇對手的精靈頭像
 */
export function getRandomOpponentFairy(): AvatarPreset {
  const fairyAvatars = AVATAR_PRESETS.filter(preset => preset.category === 'fairy')
  return fairyAvatars[Math.floor(Math.random() * fairyAvatars.length)]
}

/**
 * Get default avatar for new users
 */
export function getDefaultAvatar(): AvatarPreset {
  return AVATAR_PRESETS[0] // 天空精靈
}
