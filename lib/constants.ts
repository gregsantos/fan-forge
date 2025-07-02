import { AssetCategory } from '@/types'
import { 
  PersonStanding,
  Palette,
  Target,
  Type,
  Package2,
  HelpCircle,
  LucideIcon
} from 'lucide-react'

export interface CategoryInfo {
  value: AssetCategory | 'all'
  label: string
  description: string
  icon: LucideIcon
  colorClass: string
  bgColorClass: string
}

// Asset category definitions with visual styling
export const ASSET_CATEGORIES: CategoryInfo[] = [
  {
    value: 'characters',
    label: 'Characters',
    description: 'People, mascots, and character illustrations',
    icon: PersonStanding,
    colorClass: 'text-blue-800',
    bgColorClass: 'bg-blue-100'
  },
  {
    value: 'backgrounds',
    label: 'Backgrounds',
    description: 'Background images, patterns, and textures',
    icon: Palette,
    colorClass: 'text-green-800',
    bgColorClass: 'bg-green-100'
  },
  {
    value: 'logos',
    label: 'Logos',
    description: 'Brand logos, symbols, and emblems',
    icon: Target,
    colorClass: 'text-purple-800',
    bgColorClass: 'bg-purple-100'
  },
  {
    value: 'titles',
    label: 'Titles',
    description: 'Text graphics, titles, and typography elements',
    icon: Type,
    colorClass: 'text-orange-800',
    bgColorClass: 'bg-orange-100'
  },
  {
    value: 'props',
    label: 'Props',
    description: 'Objects, items, and decorative elements',
    icon: Package2,
    colorClass: 'text-pink-800',
    bgColorClass: 'bg-pink-100'
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Miscellaneous assets and elements',
    icon: HelpCircle,
    colorClass: 'text-gray-800',
    bgColorClass: 'bg-gray-100'
  }
]

// Filter categories including "All" option for filtering UIs
export const FILTER_CATEGORIES: CategoryInfo[] = [
  {
    value: 'all',
    label: 'All Categories',
    description: 'Show assets from all categories',
    icon: Palette,
    colorClass: 'text-slate-800',
    bgColorClass: 'bg-slate-100'
  },
  ...ASSET_CATEGORIES
]

// Helper functions
export const getCategoryInfo = (category: AssetCategory | 'all'): CategoryInfo => {
  return FILTER_CATEGORIES.find(cat => cat.value === category) || ASSET_CATEGORIES[5] // fallback to 'other'
}

export const getCategoryColor = (category: AssetCategory | 'all'): string => {
  const info = getCategoryInfo(category)
  return `${info.bgColorClass} ${info.colorClass}`
}

export const getCategoryIcon = (category: AssetCategory | 'all'): LucideIcon => {
  const info = getCategoryInfo(category)
  return info.icon
}

export const getCategoryLabel = (category: AssetCategory | 'all'): string => {
  const info = getCategoryInfo(category)
  return info.label
}

export const getCategoryDescription = (category: AssetCategory | 'all'): string => {
  const info = getCategoryInfo(category)
  return info.description
}

// Background asset specifications for brand users
export const BACKGROUND_ASSET_SPECS = {
  canvas: {
    width: 800,
    height: 600,
    aspectRatio: '4:3'
  },
  recommended: {
    minWidth: 1600,
    minHeight: 1200,
    idealWidth: 2400,
    idealHeight: 1800,
    aspectRatio: '4:3',
    formats: ['PNG', 'JPEG', 'SVG'],
    maxFileSize: '10MB'
  }
} as const