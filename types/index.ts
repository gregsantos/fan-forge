// Database schema types - inferred from Drizzle schema
export type UserRole = 'creator' | 'brand_admin' | 'brand_reviewer' | 'platform_admin'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'closed'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'
export type AssetCategory = 'characters' | 'backgrounds' | 'logos' | 'titles' | 'props' | 'other'

export interface User {
  id: string
  email: string
  passwordHash?: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  socialLinks?: {
    website?: string
    twitter?: string
    instagram?: string
    portfolio?: string
  }
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Role {
  id: number
  name: string
  description?: string
  permissions: string[]
  createdAt: Date
}

export interface UserRoleAssignment {
  id: string
  userId: string
  roleId: number
  brandId?: string
  createdAt: Date
}

export interface Brand {
  id: string
  name: string
  description?: string
  logoUrl?: string
  website?: string
  contactEmail?: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export interface IPKit {
  id: string
  name: string
  description?: string
  guidelines?: string
  brandId: string
  isPublished: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface Asset {
  id: string
  filename: string
  originalFilename: string
  url: string
  thumbnailUrl?: string
  category: AssetCategory
  tags: string[]
  metadata: {
    width: number
    height: number
    fileSize: number
    mimeType: string
    colorPalette?: string[]
  }
  ipId?: string // Optional blockchain address
  ipKitId: string | null // Now nullable for campaign assets
  uploadedBy?: string
  createdAt: Date
}

export interface Campaign {
  id: string
  title: string
  description: string
  guidelines?: string
  briefDocument?: string
  imageUrl?: string // Campaign cover image
  thumbnailUrl?: string // Campaign thumbnail
  brandId: string
  ipKitId?: string
  status: CampaignStatus
  startDate?: Date
  endDate?: Date
  maxSubmissions?: number
  rewardAmount?: number
  rewardCurrency?: string
  featuredUntil?: Date
  featured?: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Submission {
  id: string
  title: string
  description?: string
  artworkUrl: string
  thumbnailUrl?: string
  canvasData?: {
    elements: any[]
    canvasSize: { width: number; height: number }
    version: string
  }
  assetMetadata?: {
    usedAssetIds: string[]
    assetUsageInfo: AssetUsageInfo[]
    ipKitId?: string
    elementCounts: {
      total: number
      assets: number
      text: number
    }
  }
  tags: string[]
  campaignId: string
  creatorId: string
  ipId?: string // IP Kit used for source assets (not destination after approval)
  status: SubmissionStatus
  reviewedBy?: string
  reviewedAt?: Date
  feedback?: string
  rating?: number
  isPublic: boolean
  viewCount: number
  likeCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Review {
  id: string
  submissionId: string
  reviewerId: string
  status: SubmissionStatus
  feedback?: string
  rating?: number
  internalNotes?: string
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: Date
}

export interface AuditLog {
  id: string
  userId?: string
  action: string
  entityType: string
  entityId: string
  oldValues?: any
  newValues?: any
  metadata?: any
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface PortfolioItem {
  id: string
  userId: string
  submissionId?: string
  title: string
  description?: string
  imageUrl: string
  externalUrl?: string
  sortOrder: number
  isVisible: boolean
  createdAt: Date
}

// Canvas and UI types
export interface CanvasElement {
  id: string
  type: 'asset' | 'text'
  // Asset-specific properties
  assetId?: string
  // Text-specific properties
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  fontStyle?: 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  backgroundColor?: string
  // Common properties
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  opacity?: number
  locked?: boolean
}

export interface CanvasState {
  elements: CanvasElement[]
  canvasSize: { width: number; height: number }
  version: string
}

// Extended types with relations for UI
export interface CampaignWithAssets extends Campaign {
  assets: Asset[]
  brand: Brand
  ipKit?: IPKit
  submissionCount?: number
}

export interface SubmissionWithDetails extends Submission {
  campaign: Campaign
  creator: User
  ipKit?: IPKit
  reviewer?: User
}

export interface UserWithRoles extends User {
  roles: (UserRoleAssignment & { role: Role; brand?: Brand })[]
}

// Legacy compatibility types (temporary - to be removed after migration)
export interface LegacyUser {
  id: string
  email: string
  role: "creator" | "brand_admin"
  name: string
  avatar_url?: string
  created_at: Date
  updated_at: Date
}

export interface LegacyCampaign {
  id: string
  title: string
  description: string
  guidelines: string
  brand_id: string
  brand_name: string
  status: "draft" | "active" | "closed"
  deadline: Date
  assets: Asset[]
  submission_count: number
  created_at: Date
  updated_at: Date
}

export interface LegacyAsset {
  id: string
  campaign_id: string
  filename: string
  url: string
  category: "characters" | "backgrounds" | "logos" | "titles" | "props"
  metadata: {
    width: number
    height: number
    file_size: number
    mime_type: string
  }
  created_at: Date
}

export interface LegacySubmission {
  id: string
  campaign_id: string
  creator_id: string
  title: string
  description: string
  artwork_url: string
  status: "pending" | "approved" | "rejected"
  feedback?: string
  created_at: Date
  updated_at: Date
}

// Asset tracking and submission types
export interface AssetUsageInfo {
  assetId: string
  count: number
  transformations: {
    x: number
    y: number
    width: number
    height: number
    rotation: number
    opacity?: number
  }[]
}

export interface SubmissionUploadProgress {
  stage: 'preparing' | 'uploading_artwork' | 'uploading_thumbnail' | 'complete' | 'error'
  progress: number // 0-100
  message: string
}

export interface CanvasValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    usedAssetIds: string[]
    totalElements: number
    assetElements: number
    textElements: number
  }
}