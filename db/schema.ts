import {
  pgTable,
  serial,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  unique,
  index
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Enums
export const userRoleEnum = pgEnum('user_role', ['creator', 'brand_admin', 'brand_reviewer', 'platform_admin'])
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'closed'])
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected', 'withdrawn'])
export const assetCategoryEnum = pgEnum('asset_category', ['characters', 'backgrounds', 'logos', 'titles', 'props', 'other'])

// Core Tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  socialLinks: jsonb('social_links').$type<{
    website?: string
    twitter?: string
    instagram?: string
    portfolio?: string
  }>(),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}))

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: integer('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userRoleUnique: unique().on(table.userId, table.roleId, table.brandId),
  userIdIdx: index('user_roles_user_id_idx').on(table.userId),
}))

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  contactEmail: text('contact_email'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('brands_name_idx').on(table.name),
  ownerIdIdx: index('brands_owner_id_idx').on(table.ownerId),
}))

export const ipKits = pgTable('ip_kits', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  guidelines: text('guidelines'),
  brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'cascade' }).notNull(),
  isPublished: boolean('is_published').default(false),
  version: integer('version').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  brandIdIdx: index('ip_kits_brand_id_idx').on(table.brandId),
  publishedIdx: index('ip_kits_published_idx').on(table.isPublished),
}))

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  originalFilename: text('original_filename').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  category: assetCategoryEnum('category').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<{
    width: number
    height: number
    fileSize: number
    mimeType: string
    colorPalette?: string[]
  }>().notNull(),
  ipId: text('ip_id'), // Optional blockchain address for IP identification
  ipKitId: uuid('ip_kit_id').references(() => ipKits.id, { onDelete: 'cascade' }).notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  ipKitIdIdx: index('assets_ip_kit_id_idx').on(table.ipKitId),
  categoryIdx: index('assets_category_idx').on(table.category),
  filenameIdx: index('assets_filename_idx').on(table.filename),
  ipIdIdx: index('assets_ip_id_idx').on(table.ipId),
}))

// Junction table for many-to-many relationship between assets and IP kits
export const assetIpKits = pgTable('asset_ip_kits', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }).notNull(),
  ipKitId: uuid('ip_kit_id').references(() => ipKits.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  assetIdIdx: index('asset_ip_kits_asset_id_idx').on(table.assetId),
  ipKitIdIdx: index('asset_ip_kits_ip_kit_id_idx').on(table.ipKitId),
  uniqueAssetIpKit: unique().on(table.assetId, table.ipKitId),
}))

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  guidelines: text('guidelines'),
  briefDocument: text('brief_document'),
  brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'cascade' }).notNull(),
  ipKitId: uuid('ip_kit_id').references(() => ipKits.id, { onDelete: 'set null' }),
  status: campaignStatusEnum('status').default('draft').notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  maxSubmissions: integer('max_submissions'),
  rewardAmount: integer('reward_amount'),
  rewardCurrency: text('reward_currency').default('USD'),
  featuredUntil: timestamp('featured_until'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  brandIdIdx: index('campaigns_brand_id_idx').on(table.brandId),
  statusIdx: index('campaigns_status_idx').on(table.status),
  endDateIdx: index('campaigns_end_date_idx').on(table.endDate),
  featuredIdx: index('campaigns_featured_idx').on(table.featuredUntil),
}))

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  artworkUrl: text('artwork_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  canvasData: jsonb('canvas_data').$type<{
    elements: any[]
    canvasSize: { width: number; height: number }
    version: string
  }>(),
  usedAssetIds: jsonb('used_asset_ids').$type<string[]>().default([]), // Array of asset IDs used in canvas
  tags: jsonb('tags').$type<string[]>().default([]),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ipId: uuid('ip_id').references(() => ipKits.id, { onDelete: 'set null' }),
  status: submissionStatusEnum('status').default('pending').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  feedback: text('feedback'),
  rating: integer('rating'),
  isPublic: boolean('is_public').default(false),
  viewCount: integer('view_count').default(0),
  likeCount: integer('like_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  campaignIdIdx: index('submissions_campaign_id_idx').on(table.campaignId),
  creatorIdIdx: index('submissions_creator_id_idx').on(table.creatorId),
  ipIdIdx: index('submissions_ip_id_idx').on(table.ipId),
  statusIdx: index('submissions_status_idx').on(table.status),
  isPublicIdx: index('submissions_is_public_idx').on(table.isPublic),
}))

// Junction table for submission-asset relationships
export const submissionAssets = pgTable('submission_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'cascade' }).notNull(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  submissionIdIdx: index('submission_assets_submission_id_idx').on(table.submissionId),
  assetIdIdx: index('submission_assets_asset_id_idx').on(table.assetId),
  uniqueSubmissionAsset: unique().on(table.submissionId, table.assetId),
}))

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: submissionStatusEnum('status').notNull(),
  feedback: text('feedback'),
  rating: integer('rating'),
  internalNotes: text('internal_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  submissionIdIdx: index('reviews_submission_id_idx').on(table.submissionId),
  reviewerIdIdx: index('reviews_reviewer_id_idx').on(table.reviewerId),
}))

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: jsonb('data').$type<Record<string, any>>(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  typeIdx: index('notifications_type_idx').on(table.type),
}))

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}))

// User portfolio/profile extensions
export const portfolioItems = pgTable('portfolio_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  externalUrl: text('external_url'),
  sortOrder: integer('sort_order').default(0),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('portfolio_items_user_id_idx').on(table.userId),
  sortOrderIdx: index('portfolio_items_sort_order_idx').on(table.sortOrder),
}))

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  brands: many(brands),
  submissions: many(submissions),
  reviews: many(reviews),
  notifications: many(notifications),
  portfolioItems: many(portfolioItems),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  brand: one(brands, {
    fields: [userRoles.brandId],
    references: [brands.id],
  }),
}))

export const brandsRelations = relations(brands, ({ one, many }) => ({
  owner: one(users, {
    fields: [brands.ownerId],
    references: [users.id],
  }),
  ipKits: many(ipKits),
  campaigns: many(campaigns),
  userRoles: many(userRoles),
}))

export const ipKitsRelations = relations(ipKits, ({ one, many }) => ({
  brand: one(brands, {
    fields: [ipKits.brandId],
    references: [brands.id],
  }),
  assets: many(assets),
  assetIpKits: many(assetIpKits),
  campaigns: many(campaigns),
  submissions: many(submissions),
}))

export const assetsRelations = relations(assets, ({ one, many }) => ({
  ipKit: one(ipKits, {
    fields: [assets.ipKitId],
    references: [ipKits.id],
  }),
  uploadedBy: one(users, {
    fields: [assets.uploadedBy],
    references: [users.id],
  }),
  assetIpKits: many(assetIpKits),
  submissionAssets: many(submissionAssets),
}))

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  brand: one(brands, {
    fields: [campaigns.brandId],
    references: [brands.id],
  }),
  ipKit: one(ipKits, {
    fields: [campaigns.ipKitId],
    references: [ipKits.id],
  }),
  createdBy: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  submissions: many(submissions),
}))

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [submissions.campaignId],
    references: [campaigns.id],
  }),
  creator: one(users, {
    fields: [submissions.creatorId],
    references: [users.id],
  }),
  ipKit: one(ipKits, {
    fields: [submissions.ipId],
    references: [ipKits.id],
  }),
  reviewedBy: one(users, {
    fields: [submissions.reviewedBy],
    references: [users.id],
  }),
  reviews: many(reviews),
  portfolioItems: many(portfolioItems),
  submissionAssets: many(submissionAssets),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  submission: one(submissions, {
    fields: [reviews.submissionId],
    references: [submissions.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

export const portfolioItemsRelations = relations(portfolioItems, ({ one }) => ({
  user: one(users, {
    fields: [portfolioItems.userId],
    references: [users.id],
  }),
  submission: one(submissions, {
    fields: [portfolioItems.submissionId],
    references: [submissions.id],
  }),
}))

export const assetIpKitsRelations = relations(assetIpKits, ({ one }) => ({
  asset: one(assets, {
    fields: [assetIpKits.assetId],
    references: [assets.id],
  }),
  ipKit: one(ipKits, {
    fields: [assetIpKits.ipKitId],
    references: [ipKits.id],
  }),
}))

export const submissionAssetsRelations = relations(submissionAssets, ({ one }) => ({
  submission: one(submissions, {
    fields: [submissionAssets.submissionId],
    references: [submissions.id],
  }),
  asset: one(assets, {
    fields: [submissionAssets.assetId],
    references: [assets.id],
  }),
}))
