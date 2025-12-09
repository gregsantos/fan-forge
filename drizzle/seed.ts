import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { db } from '../db/index'
import {
  users,
  roles,
  userRoles,
  brands,
  ipKits,
  assets,
  campaigns,
  submissions,
  portfolioItems,
} from '../db/schema'

async function seed() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clear existing data (for development only)
    console.log('📝 Clearing existing data...')
    await db.delete(portfolioItems)
    await db.delete(submissions)
    await db.delete(campaigns)
    await db.delete(assets)
    await db.delete(ipKits)
    await db.delete(userRoles)
    await db.delete(brands)
    await db.delete(users)
    await db.delete(roles)

    // Seed roles
    console.log('👥 Seeding roles...')
    const rolesData = await db.insert(roles).values([
      {
        name: 'creator',
        description: 'Content creator with submission rights',
        permissions: ['submission:create', 'submission:edit', 'portfolio:manage'],
      },
      {
        name: 'brand_admin',
        description: 'Brand administrator with campaign management rights',
        permissions: [
          'campaign:create',
          'campaign:edit',
          'submission:review',
          'asset:manage',
          'ipkit:manage',
        ],
      },
      {
        name: 'brand_reviewer',
        description: 'Brand reviewer with submission review rights only',
        permissions: ['submission:review'],
      },
      {
        name: 'platform_admin',
        description: 'Platform administrator with full system access',
        permissions: ['*'],
      },
    ]).returning()

    // Seed users
    console.log('👤 Seeding users...')
    const usersData = await db.insert(users).values([
      {
        email: 'maya.chen@example.com',
        displayName: 'Maya Chen',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face',
        bio: 'Digital artist passionate about anime and character design. Love bringing stories to life through art.',
        socialLinks: {
          website: 'https://mayachen.art',
          twitter: '@mayachenart',
          instagram: '@maya_creates',
          portfolio: 'https://behance.net/mayachen',
        },
        emailVerified: true,
      },
      {
        email: 'david.rodriguez@studioghibli.com',
        displayName: 'David Rodriguez',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face',
        bio: 'Brand manager at Studio Ghibli, fostering creative partnerships with talented artists worldwide.',
        socialLinks: {
          website: 'https://studioghibli.com',
        },
        emailVerified: true,
      },
      {
        email: 'alex.kim@example.com',
        displayName: 'Alex Kim',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face',
        bio: 'Freelance illustrator specializing in fantasy and sci-fi artwork.',
        socialLinks: {
          website: 'https://alexkim.design',
          twitter: '@alexkimdesign',
        },
        emailVerified: true,
      },
      {
        email: 'sarah.wilson@neoncorp.com',
        displayName: 'Sarah Wilson',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face',
        bio: 'Creative director at NeonCorp Studios, passionate about cyberpunk aesthetics.',
        emailVerified: true,
      },
    ]).returning()

    // Seed brands
    console.log('🏢 Seeding brands...')
    const brandsData = await db.insert(brands).values([
      {
        name: 'Studio Ghibli',
        description: 'Renowned animation studio creating magical worlds and unforgettable characters.',
        logoUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=150&h=150&fit=crop',
        website: 'https://studioghibli.com',
        contactEmail: 'partnerships@studioghibli.com',
        ownerId: usersData[1].id, // David Rodriguez
      },
      {
        name: 'NeonCorp Studios',
        description: 'Cutting-edge gaming studio specializing in cyberpunk and futuristic experiences.',
        logoUrl: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=150&h=150&fit=crop',
        website: 'https://neoncorp.studios',
        contactEmail: 'creative@neoncorp.com',
        ownerId: usersData[3].id, // Sarah Wilson
      },
    ]).returning()

    // Assign user roles
    console.log('🔑 Assigning user roles...')
    await db.insert(userRoles).values([
      {
        userId: usersData[0].id, // Maya Chen
        roleId: rolesData.find(r => r.name === 'creator')!.id,
      },
      {
        userId: usersData[1].id, // David Rodriguez
        roleId: rolesData.find(r => r.name === 'brand_admin')!.id,
        brandId: brandsData[0].id, // Studio Ghibli
      },
      {
        userId: usersData[2].id, // Alex Kim
        roleId: rolesData.find(r => r.name === 'creator')!.id,
      },
      {
        userId: usersData[3].id, // Sarah Wilson
        roleId: rolesData.find(r => r.name === 'brand_admin')!.id,
        brandId: brandsData[1].id, // NeonCorp Studios
      },
    ])

    // Seed IP Kits
    console.log('📦 Seeding IP kits...')
    const ipKitsData = await db.insert(ipKits).values([
      {
        name: 'Anime Heroes Collection',
        description: 'Official character assets from our most beloved anime series.',
        guidelines: 'Use characters in creative compositions. Maintain character proportions and color schemes. Family-friendly content only.',
        brandId: brandsData[0].id, // Studio Ghibli
        isPublished: true,
      },
      {
        name: 'Cyberpunk City Assets',
        description: 'Futuristic cityscapes and cyberpunk elements for creative projects.',
        guidelines: 'Focus on neon lighting and futuristic architecture. Use dark color palette with bright accent colors.',
        brandId: brandsData[1].id, // NeonCorp Studios
        isPublished: true,
      },
    ]).returning()

    // Seed assets
    console.log('🎨 Seeding assets...')
    const assetsData = await db.insert(assets).values([
      {
        filename: 'hero-character-001.png',
        originalFilename: 'anime_hero_main.png',
        url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop',
        category: 'characters',
        tags: ['hero', 'main character', 'anime', 'warrior'],
        metadata: {
          width: 400,
          height: 400,
          fileSize: 65000,
          mimeType: 'image/png',
          colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
        },
        ipKitId: ipKitsData[0].id,
        uploadedBy: usersData[1].id,
      },
      {
        filename: 'fantasy-background-001.jpg',
        originalFilename: 'magical_forest.jpg',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=200&h=150&fit=crop',
        category: 'backgrounds',
        tags: ['forest', 'magical', 'nature', 'mystical'],
        metadata: {
          width: 800,
          height: 600,
          fileSize: 120000,
          mimeType: 'image/jpeg',
          colorPalette: ['#2D5016', '#408E2B', '#6DB944', '#A3D977'],
        },
        ipKitId: ipKitsData[0].id,
        uploadedBy: usersData[1].id,
      },
      {
        filename: 'studio-logo-main.svg',
        originalFilename: 'ghibli_logo.svg',
        url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=300&h=300&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=150&h=150&fit=crop',
        category: 'logos',
        tags: ['logo', 'brand', 'official'],
        metadata: {
          width: 300,
          height: 300,
          fileSize: 18000,
          mimeType: 'image/svg+xml',
        },
        ipKitId: ipKitsData[0].id,
        uploadedBy: usersData[1].id,
      },
      {
        filename: 'cyber-city-skyline.jpg',
        originalFilename: 'neon_cityscape.jpg',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop',
        category: 'backgrounds',
        tags: ['cyberpunk', 'city', 'neon', 'futuristic'],
        metadata: {
          width: 800,
          height: 600,
          fileSize: 95000,
          mimeType: 'image/jpeg',
          colorPalette: ['#FF00FF', '#00FFFF', '#FF6600', '#9933FF'],
        },
        ipKitId: ipKitsData[1].id,
        uploadedBy: usersData[3].id,
      },
    ]).returning()

    // Seed campaigns
    console.log('📋 Seeding campaigns...')
    const campaignsData = await db.insert(campaigns).values([
      {
        title: 'Anime Heroes Collection Challenge',
        description: 'Create amazing artwork using our official anime character assets. Express your creativity while staying true to our brand aesthetic.',
        guidelines: 'Use provided characters in creative compositions. No violent themes. Maintain character proportions and color schemes. Family-friendly content only.',
        brandId: brandsData[0].id,
        ipKitId: ipKitsData[0].id,
        status: 'active',
        startDate: new Date('2024-11-01'),
        endDate: new Date('2025-08-01'),
        maxSubmissions: 100,
        rewardAmount: 500,
        rewardCurrency: 'USD',
        featuredUntil: new Date('2025-01-01'),
        createdBy: usersData[1].id,
      },
      {
        title: 'Cyberpunk City Designs',
        description: 'Design futuristic cityscapes using our sci-fi asset collection. Perfect for digital artists interested in cyberpunk aesthetics.',
        guidelines: 'Focus on neon lighting and futuristic architecture. Use dark color palette with bright accent colors. Include our brand elements subtly.',
        brandId: brandsData[1].id,
        ipKitId: ipKitsData[1].id,
        status: 'active',
        startDate: new Date('2024-10-15'),
        endDate: new Date('2025-07-15'),
        maxSubmissions: 50,
        rewardAmount: 750,
        rewardCurrency: 'USD',
        createdBy: usersData[3].id,
      },
      {
        title: 'Fantasy Realm Adventure',
        description: 'Create magical scenes with our fantasy character and environment assets. Bring mystical worlds to life.',
        guidelines: 'Emphasize magical elements and vibrant colors. Characters should appear heroic and inspiring. Suitable for all ages.',
        brandId: brandsData[0].id,
        ipKitId: ipKitsData[0].id,
        status: 'draft',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-09-01'),
        maxSubmissions: 75,
        rewardAmount: 400,
        rewardCurrency: 'USD',
        createdBy: usersData[1].id,
      },
    ]).returning()

    // Seed submissions
    console.log('📄 Seeding submissions...')
    const submissionsData = await db.insert(submissions).values([
      {
        title: 'Heroes Unite',
        description: 'A dynamic composition featuring the main character in an action pose with mystical background elements.',
        artworkUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=800&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300&h=400&fit=crop',
        canvasData: {
          elements: [
            { id: 'char1', assetId: assetsData[0].id, x: 100, y: 150, width: 200, height: 200, rotation: 0, zIndex: 2 },
            { id: 'bg1', assetId: assetsData[1].id, x: 0, y: 0, width: 600, height: 800, rotation: 0, zIndex: 1 }
          ],
          canvasSize: { width: 600, height: 800 },
          version: '1.0.0'
        },
        tags: ['action', 'hero', 'dynamic', 'fantasy'],
        campaignId: campaignsData[0].id,
        creatorId: usersData[0].id, // Maya Chen
        status: 'approved',
        reviewedBy: usersData[1].id, // David Rodriguez
        reviewedAt: new Date('2024-11-26'),
        feedback: 'Excellent composition and use of brand assets. Great attention to character details!',
        rating: 5,
        isPublic: true,
        viewCount: 234,
        likeCount: 47,
      },
      {
        title: 'Peaceful Moment',
        description: 'A serene scene showcasing the character in a calm, contemplative setting.',
        artworkUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=800&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=400&fit=crop',
        canvasData: {
          elements: [
            { id: 'char2', assetId: assetsData[0].id, x: 200, y: 200, width: 180, height: 180, rotation: 0, zIndex: 2 },
            { id: 'bg2', assetId: assetsData[1].id, x: 0, y: 0, width: 600, height: 800, rotation: 0, zIndex: 1 }
          ],
          canvasSize: { width: 600, height: 800 },
          version: '1.0.0'
        },
        tags: ['peaceful', 'serene', 'character study'],
        campaignId: campaignsData[0].id,
        creatorId: usersData[0].id, // Maya Chen
        status: 'pending',
        isPublic: false,
        viewCount: 0,
        likeCount: 0,
      },
      {
        title: 'Neon Dreams',
        description: 'A cyberpunk cityscape with vibrant neon colors and futuristic atmosphere.',
        artworkUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=800&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=400&fit=crop',
        canvasData: {
          elements: [
            { id: 'city1', assetId: assetsData[3].id, x: 0, y: 0, width: 600, height: 800, rotation: 0, zIndex: 1 }
          ],
          canvasSize: { width: 600, height: 800 },
          version: '1.0.0'
        },
        tags: ['cyberpunk', 'neon', 'cityscape', 'futuristic'],
        campaignId: campaignsData[1].id,
        creatorId: usersData[2].id, // Alex Kim
        status: 'approved',
        reviewedBy: usersData[3].id, // Sarah Wilson
        reviewedAt: new Date('2024-11-20'),
        feedback: 'Perfect capture of our cyberpunk aesthetic. Love the neon color usage!',
        rating: 5,
        isPublic: true,
        viewCount: 156,
        likeCount: 32,
      },
    ]).returning()

    // Seed portfolio items
    console.log('🎯 Seeding portfolio items...')
    await db.insert(portfolioItems).values([
      {
        userId: usersData[0].id, // Maya Chen
        submissionId: submissionsData[0].id,
        title: 'Heroes Unite',
        description: 'Dynamic anime hero composition for Studio Ghibli campaign',
        imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=800&fit=crop',
        sortOrder: 1,
        isVisible: true,
      },
      {
        userId: usersData[2].id, // Alex Kim
        submissionId: submissionsData[2].id,
        title: 'Neon Dreams',
        description: 'Cyberpunk cityscape for NeonCorp Studios',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=800&fit=crop',
        sortOrder: 1,
        isVisible: true,
      },
      {
        userId: usersData[2].id, // Alex Kim
        title: 'Fantasy Character Design',
        description: 'Original character design for personal project',
        imageUrl: 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=600&h=800&fit=crop',
        externalUrl: 'https://alexkim.design/fantasy-character',
        sortOrder: 2,
        isVisible: true,
      },
    ])

    console.log('✅ Database seeding completed successfully!')
    console.log(`📊 Seeded data:`)
    console.log(`   - ${rolesData.length} roles`)
    console.log(`   - ${usersData.length} users`)
    console.log(`   - ${brandsData.length} brands`)
    console.log(`   - ${ipKitsData.length} IP kits`)
    console.log(`   - ${assetsData.length} assets`)
    console.log(`   - ${campaignsData.length} campaigns`)
    console.log(`   - ${submissionsData.length} submissions`)
    console.log(`   - 3 portfolio items`)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('🎉 Seeding completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error)
      process.exit(1)
    })
}

export { seed }