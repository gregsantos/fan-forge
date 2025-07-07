import {Address} from "viem"
import {createHash} from "crypto"
import {client} from "@/utils/config"
import axios from "axios"
import FormData from "form-data"
import {PinataSDK} from "pinata-web3"
import sharp from "sharp"
import {getSubmissionAssetIpIds} from "@/lib/data/submissions"
import {db, submissions, campaigns, users} from "@/db"
import {eq} from "drizzle-orm"

// Log environment configuration on module load
console.log(`🔧 [STORY-PROTOCOL] Service initialization:`)
console.log(`   🌐 Network: ${process.env.STORY_NETWORK || "aeneid"}`)
console.log(
  `   🔑 Wallet configured: ${process.env.WALLET_ADDRESS ? "✅" : "❌"}`
)
console.log(
  `   🔐 Pinata JWT configured: ${process.env.PINATA_JWT ? "✅" : "❌"}`
)
console.log(`   📋 Story Protocol client ready: ✅`)
console.log(`   ⏰ Timestamp: ${new Date().toISOString()}`)
console.log(``)

// Validate required environment variables
const requiredEnvVars = ["WALLET_PRIVATE_KEY", "WALLET_ADDRESS", "PINATA_JWT"]
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.error(`❌ [STORY-PROTOCOL] Missing required environment variables:`)
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  console.error(
    `   Story Protocol registration will fail without these variables.`
  )
  console.error(``)
}

// Configuration for different campaign collection contracts
const CAMPAIGN_COLLECTION_CONTRACTS: Record<string, Address> = {
  // Add campaign-specific collection contracts here
  default: "0x011A0239090d42f5B1B27B4aD2bd70dd3Cf4cB55" as Address, // Go Bananas Art Challenge
}

// Types for submission data
export interface SubmissionData {
  id: string
  title: string
  description: string | null
  artworkUrl: string
  campaignId: string
  creatorId: string
  creator: {
    id: string
    displayName: string | null
    email: string
    walletAddress?: string
  }
  campaign: {
    id: string
    title: string
    brandId: string
    brand: {
      id: string
      name: string
      walletAddress?: string
    }
  }
  usedAssetIds: string[] // IP IDs of parent assets
}

interface RegisterDerivativeIpAssetResult {
  txHash: string
  ipId: string
  assetName: string
}

interface Creator {
  name: string
  address: string
  contributionPercent: number
}

interface IpMetadata {
  title: string
  description: string
  ipType: string
  createdAt: string
  creators: Creator[]
  image: string
  imageHash: string
  mediaUrl: string
  mediaHash: string
  mediaType: string
  tags: string[]
}

interface NftMetadata {
  title: string
  description: string
  ipType: string
  createdAt: string
  image: string
  attributes: {
    trait_type: string
    value: string
  }[]
  animation_url?: string
}

export interface AssetMetadata {
  ipMetadata: IpMetadata
  nftMetadata: NftMetadata
}

interface StoryProtocolRegistrationResult {
  success: boolean
  txHash?: string
  ipId?: string
  error?: string
}

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY_URL,
})

// Upload image from URL to IPFS (optimized for Supabase storage)
export async function uploadImageToIPFS(imageUrl: string): Promise<{
  ipfsHash: string
  ipfsUrl: string
  contentHash: string
}> {
  try {
    console.log(`🚀 [IPFS] Starting image upload process`)
    console.log(`📥 [IPFS] Downloading image from: ${imageUrl}`)

    // Download image from URL (works with Supabase storage URLs)
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000, // 30 second timeout
      headers: {
        "User-Agent": "FanForge-AI/1.0",
      },
    })

    const imageBuffer = Buffer.from(response.data)
    const originalSizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2)
    console.log(
      `📄 [IPFS] Downloaded image: ${imageBuffer.length} bytes (${originalSizeMB} MB)`
    )
    console.log(`📊 [IPFS] Content-Type: ${response.headers["content-type"]}`)

    // Optimize image with sharp
    console.log(
      `🎨 [IPFS] Optimizing image with Sharp (max 1200x1200, 85% quality)...`
    )
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(1200, 1200, {fit: "inside", withoutEnlargement: true})
      .jpeg({quality: 85, progressive: true})
      .toBuffer()

    const optimizedSizeMB = (optimizedBuffer.length / 1024 / 1024).toFixed(2)
    const compressionRatio = (
      (1 - optimizedBuffer.length / imageBuffer.length) *
      100
    ).toFixed(1)
    console.log(
      `✨ [IPFS] Optimized image: ${optimizedBuffer.length} bytes (${optimizedSizeMB} MB)`
    )
    console.log(`📈 [IPFS] Compression: ${compressionRatio}% reduction`)

    // Create form data for Pinata
    const formData = new FormData()
    formData.append("file", optimizedBuffer, {
      filename: "artwork.jpg",
      contentType: "image/jpeg",
    })

    // Upload to IPFS via Pinata
    console.log(`📤 [IPFS] Uploading to Pinata IPFS...`)
    const uploadStart = Date.now()
    const pinataResponse = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
        timeout: 60000, // 60 second timeout for upload
      }
    )

    const uploadTime = Date.now() - uploadStart
    const ipfsHash = pinataResponse.data.IpfsHash
    const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`

    // Generate content hash for verification
    const contentHash = createHash("sha256")
      .update(optimizedBuffer)
      .digest("hex")

    console.log(`✅ [IPFS] Upload successful in ${uploadTime}ms`)
    console.log(`🔗 [IPFS] IPFS Hash: ${ipfsHash}`)
    console.log(`🌐 [IPFS] IPFS URL: ${ipfsUrl}`)
    console.log(`🔐 [IPFS] Content Hash: ${contentHash}`)

    return {
      ipfsHash,
      ipfsUrl,
      contentHash,
    }
  } catch (error) {
    console.error("❌ [IPFS] Upload failed:", error)
    if (axios.isAxiosError(error)) {
      console.error("📄 [IPFS] Error details:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
      })
      if (error.response?.data) {
        console.error("📄 [IPFS] Response data:", error.response.data)
      }
    }
    throw error
  }
}

export async function uploadJSONToIPFS({
  name,
  jsonMetadata,
}: {
  name: string
  jsonMetadata: any
}): Promise<string> {
  console.log(`📤 [JSON-IPFS] Uploading JSON to IPFS: ${name}`)

  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    data: {
      pinataOptions: {cidVersion: 0},
      pinataMetadata: {name: `${name}.json`},
      pinataContent: jsonMetadata,
    },
  }

  try {
    const uploadStart = Date.now()
    const response = await axios(url, options)
    const uploadTime = Date.now() - uploadStart
    const ipfsHash = response.data.IpfsHash

    console.log(`✅ [JSON-IPFS] Upload successful in ${uploadTime}ms`)
    console.log(`   📋 Name: ${name}`)
    console.log(`   🔗 Hash: ${ipfsHash}`)
    console.log(`   🌐 URL: https://ipfs.io/ipfs/${ipfsHash}`)

    return ipfsHash
  } catch (error) {
    console.error(`❌ [JSON-IPFS] Upload failed for ${name}:`, error)
    if (axios.isAxiosError(error)) {
      console.error(`📄 [JSON-IPFS] Error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      })
    }
    throw error
  }
}

// Build metadata from submission data
export function buildSubmissionMetadata(
  submissionData: SubmissionData,
  ipfsImageData: {
    ipfsHash: string
    ipfsUrl: string
    contentHash: string
  }
): AssetMetadata {
  const currentTimestamp = Math.floor(Date.now() / 1000).toString()

  // Build creators array
  const creators: Creator[] = []

  // Add brand as creator (50% contribution)
  if (submissionData.campaign.brand.walletAddress) {
    creators.push({
      name: submissionData.campaign.brand.name,
      address: submissionData.campaign.brand.walletAddress,
      contributionPercent: 50,
    })
  }

  // Add creator as contributor (50% contribution)
  if (submissionData.creator.walletAddress) {
    creators.push({
      name: submissionData.creator.displayName || submissionData.creator.email,
      address: submissionData.creator.walletAddress,
      contributionPercent: 50,
    })
  }

  // Build tags
  const tags = [
    submissionData.campaign.brand.name,
    submissionData.campaign.title,
    "Fan Art",
    "Derivative Work",
    "Official",
  ]

  const ipMetadata: IpMetadata = {
    title: submissionData.title,
    description:
      submissionData.description ||
      `Fan creation for ${submissionData.campaign.title}`,
    ipType: "Artwork",
    createdAt: currentTimestamp,
    creators,
    image: ipfsImageData.ipfsUrl,
    imageHash: ipfsImageData.ipfsHash,
    mediaUrl: ipfsImageData.ipfsUrl,
    mediaHash: ipfsImageData.ipfsHash,
    mediaType: "image/jpeg",
    tags,
  }

  const nftMetadata: NftMetadata = {
    title: submissionData.title,
    description:
      submissionData.description ||
      `Fan creation for ${submissionData.campaign.title}`,
    ipType: "Artwork",
    createdAt: currentTimestamp,
    image: ipfsImageData.ipfsUrl,
    attributes: [
      {
        trait_type: "Campaign",
        value: submissionData.campaign.title,
      },
      {
        trait_type: "Brand",
        value: submissionData.campaign.brand.name,
      },
      {
        trait_type: "Creator",
        value:
          submissionData.creator.displayName || submissionData.creator.email,
      },
    ],
  }

  return {
    ipMetadata,
    nftMetadata,
  }
}

// Register Derivative IP Asset
export const registerDerivativeIpAsset = async (
  assetMetadata: AssetMetadata,
  assetName: string,
  parentIpIds: Address[],
  collectionContract: Address
): Promise<RegisterDerivativeIpAssetResult> => {
  console.log(
    `⛓️  [BLOCKCHAIN] Starting blockchain registration for: "${assetName}"`
  )
  console.log(`📄 [BLOCKCHAIN] Collection contract: ${collectionContract}`)
  console.log(`👥 [BLOCKCHAIN] Parent IP assets: ${parentIpIds.length}`)

  try {
    // 1. Set up IP Metadata
    console.log(`🏗️  [BLOCKCHAIN] Step 1: Generating IP metadata...`)
    const ipMetadata = client.ipAsset.generateIpMetadata({
      title: assetMetadata.ipMetadata.title,
      description: assetMetadata.ipMetadata.description,
      ipType: assetMetadata.ipMetadata.ipType,
      createdAt: assetMetadata.ipMetadata.createdAt,
      creators: assetMetadata.ipMetadata.creators.map((creator: any) => ({
        ...creator,
        address: creator.address as `0x${string}`,
      })),
      image: assetMetadata.ipMetadata.image,
      imageHash: `0x${assetMetadata.ipMetadata.imageHash}`,
      mediaUrl: assetMetadata.ipMetadata.mediaUrl,
      mediaHash: `0x${assetMetadata.ipMetadata.mediaHash}`,
      mediaType: assetMetadata.ipMetadata.mediaType,
      tags: assetMetadata.ipMetadata.tags,
    })
    console.log(`✅ [BLOCKCHAIN] IP metadata generated`)

    // 2. Set up NFT Metadata
    console.log(`🎨 [BLOCKCHAIN] Step 2: Preparing NFT metadata...`)
    const nftMetadata = {
      name: assetMetadata.nftMetadata.title,
      description: assetMetadata.nftMetadata.description,
      image: assetMetadata.nftMetadata.image,
      attributes: assetMetadata.nftMetadata.attributes,
    }
    console.log(
      `✅ [BLOCKCHAIN] NFT metadata prepared (${nftMetadata.attributes.length} attributes)`
    )

    // 3. Upload metadata to IPFS
    console.log(`📤 [BLOCKCHAIN] Step 3: Uploading metadata to IPFS...`)
    const ipIpfsHash = await uploadJSONToIPFS({
      name: `ip-metadata-${assetName}`,
      jsonMetadata: ipMetadata,
    })

    const ipMetadataHash = createHash("sha256")
      .update(JSON.stringify(ipMetadata))
      .digest("hex")

    const nftIpfsHash = await uploadJSONToIPFS({
      name: `nft-metadata-${assetName}`,
      jsonMetadata: nftMetadata,
    })

    const nftMetadataHash = createHash("sha256")
      .update(JSON.stringify(nftMetadata))
      .digest("hex")

    console.log(`✅ [BLOCKCHAIN] Metadata uploaded to IPFS:`)
    console.log(`   📋 IP Metadata: https://ipfs.io/ipfs/${ipIpfsHash}`)
    console.log(`   🎨 NFT Metadata: https://ipfs.io/ipfs/${nftIpfsHash}`)
    console.log(`   🔐 IP Hash: 0x${ipMetadataHash}`)
    console.log(`   🔐 NFT Hash: 0x${nftMetadataHash}`)

    // 4. Create license terms array (all same license)
    console.log(`📜 [BLOCKCHAIN] Step 4: Setting up license terms...`)
    const licenseTermsIds = parentIpIds.map(() => "386")
    console.log(
      `✅ [BLOCKCHAIN] License terms configured (ID: 386 for all ${parentIpIds.length} parents)`
    )

    // 5. Mint and Register IP asset and make it a derivative of the parent IP Asset
    console.log(
      `🚀 [BLOCKCHAIN] Step 5: Minting and registering derivative IP asset...`
    )
    console.log(`   📋 Parent IPs: ${parentIpIds.join(", ")}`)
    console.log(`   📄 Collection: ${collectionContract}`)
    console.log(`   ⏳ This may take 30-60 seconds...`)

    const registrationStart = Date.now()
    const response = await client.ipAsset.mintAndRegisterIpAndMakeDerivative({
      spgNftContract: collectionContract,
      derivData: {
        parentIpIds: parentIpIds,
        licenseTermsIds: licenseTermsIds,
      },
      ipMetadata: {
        ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
        ipMetadataHash: `0x${ipMetadataHash}`,
        nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
        nftMetadataHash: `0x${nftMetadataHash}`,
      },
    })
    const registrationTime = Date.now() - registrationStart

    console.log(
      `🎉 [BLOCKCHAIN] Registration successful in ${registrationTime}ms!`
    )
    console.log(`   🆔 New IP Asset ID: ${response.ipId}`)
    console.log(`   🔗 Transaction Hash: ${response.txHash}`)
    console.log(
      `   🌐 Explorer: https://explorer.story.foundation/ipa/${response.ipId}`
    )
    console.log(
      `   📄 Transaction: https://explorer.story.foundation/tx/${response.txHash}`
    )

    return {
      txHash: response.txHash || "",
      ipId: response.ipId || "",
      assetName,
    }
  } catch (error) {
    console.error(
      `❌ [BLOCKCHAIN] Registration failed for "${assetName}":`,
      error
    )
    if (error instanceof Error) {
      console.error(`📄 [BLOCKCHAIN] Error message: ${error.message}`)
      console.error(`📄 [BLOCKCHAIN] Error stack:`, error.stack)
    }
    throw error
  }
}

// Main function to register submission as derivative
export const registerSubmissionAsDerivative = async (
  submissionData: SubmissionData,
  collectionContract: Address
): Promise<RegisterDerivativeIpAssetResult> => {
  try {
    console.log(
      `🎨 [DERIVATIVE] Processing submission: "${submissionData.title}"`
    )
    console.log(`📸 [DERIVATIVE] Artwork URL: ${submissionData.artworkUrl}`)
    console.log(
      `👥 [DERIVATIVE] Parent IP IDs (${submissionData.usedAssetIds.length}):`
    )
    submissionData.usedAssetIds.forEach((ipId, index) => {
      console.log(`   ${index + 1}. ${ipId}`)
    })
    console.log(`📄 [DERIVATIVE] Collection Contract: ${collectionContract}`)

    // 1. Upload artwork to IPFS
    console.log(`📤 [DERIVATIVE] Step 1: Uploading artwork to IPFS...`)
    const ipfsImageData = await uploadImageToIPFS(submissionData.artworkUrl)
    console.log(
      `✅ [DERIVATIVE] IPFS upload complete: ${ipfsImageData.ipfsUrl}`
    )

    // 2. Build metadata from submission data
    console.log(`🏗️  [DERIVATIVE] Step 2: Building metadata...`)
    const metadata = buildSubmissionMetadata(submissionData, ipfsImageData)
    console.log(`✅ [DERIVATIVE] Metadata built:`)
    console.log(`   📝 IP Title: ${metadata.ipMetadata.title}`)
    console.log(`   👥 Creators: ${metadata.ipMetadata.creators.length}`)
    console.log(`   🏷️  Tags: ${metadata.ipMetadata.tags.join(", ")}`)

    // 3. Convert asset IDs to addresses (assuming they are already IP addresses)
    console.log(`🔄 [DERIVATIVE] Step 3: Preparing parent IP addresses...`)
    const parentIpIds = submissionData.usedAssetIds as Address[]
    console.log(
      `✅ [DERIVATIVE] ${parentIpIds.length} parent IP addresses prepared`
    )

    // 4. Register as derivative
    console.log(
      `⛓️  [DERIVATIVE] Step 4: Registering on Story Protocol blockchain...`
    )
    const result = await registerDerivativeIpAsset(
      metadata,
      submissionData.title,
      parentIpIds,
      collectionContract
    )

    console.log(`✅ [DERIVATIVE] Blockchain registration successful!`)
    console.log(``)
    console.log(`📊 [DERIVATIVE] REGISTRATION SUMMARY:`)
    console.log(`   📝 Asset Name: ${result.assetName}`)
    console.log(`   🆔 IP Asset ID: ${result.ipId}`)
    console.log(`   🔗 Transaction Hash: ${result.txHash}`)
    console.log(`   🌐 IPFS Image: ${ipfsImageData.ipfsUrl}`)
    console.log(
      `   🔍 Explorer: https://explorer.story.foundation/ipa/${result.ipId}`
    )
    console.log(``)

    return result
  } catch (error) {
    console.error("❌ [DERIVATIVE] Registration failed:", error)
    if (error instanceof Error) {
      console.error(`📄 [DERIVATIVE] Error details: ${error.message}`)
    }
    throw error
  }
}

/**
 * Register an approved submission as a derivative IP asset on Story Protocol
 */
export async function registerApprovedSubmission(
  submissionId: string
): Promise<StoryProtocolRegistrationResult> {
  try {
    console.log(
      `🚀 [REGISTRATION] Starting Story Protocol registration for submission: ${submissionId}`
    )
    console.log(`⏰ [REGISTRATION] Timestamp: ${new Date().toISOString()}`)

    // 1. Get submission with all related data
    console.log(`📋 [REGISTRATION] Fetching submission data...`)
    const submissionResult = await db
      .select({
        submission: submissions,
        campaign: campaigns,
        creator: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
        },
        brand: {
          id: campaigns.brandId,
          name: campaigns.title, // Using campaign title as brand name for now
        },
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (submissionResult.length === 0) {
      console.error(`❌ [REGISTRATION] Submission not found: ${submissionId}`)
      return {
        success: false,
        error: "Submission not found",
      }
    }

    const {submission, campaign, creator} = submissionResult[0]

    console.log(`✅ [REGISTRATION] Submission data loaded:`)
    console.log(`   📝 Title: ${submission.title}`)
    console.log(`   🎨 Artwork URL: ${submission.artworkUrl}`)
    console.log(
      `   👤 Creator: ${creator?.displayName || creator?.email || "Unknown"}`
    )
    console.log(`   🏢 Campaign: ${campaign?.title || "Unknown"}`)

    if (!campaign) {
      console.error(
        `❌ [REGISTRATION] Campaign not found for submission: ${submissionId}`
      )
      return {
        success: false,
        error: "Campaign not found",
      }
    }

    if (!creator) {
      console.error(
        `❌ [REGISTRATION] Creator not found for submission: ${submissionId}`
      )
      return {
        success: false,
        error: "Creator not found",
      }
    }

    // 2. Get parent IP IDs from submission assets
    console.log(`🔍 [REGISTRATION] Fetching parent IP assets...`)
    const parentIpIds = await getSubmissionAssetIpIds(submissionId)

    console.log(
      `📊 [REGISTRATION] Found ${parentIpIds.length} parent IP assets:`
    )
    parentIpIds.forEach((ipId, index) => {
      console.log(`   ${index + 1}. ${ipId}`)
    })

    if (parentIpIds.length === 0) {
      console.warn(
        `⚠️  [REGISTRATION] No parent IP IDs found for submission ${submissionId}`
      )
      return {
        success: false,
        error: "No parent IP assets found for this submission",
      }
    }

    // 3. Build submission data for Story Protocol
    console.log(
      `🏗️  [REGISTRATION] Building submission data for Story Protocol...`
    )
    const submissionData: SubmissionData = {
      id: submission.id,
      title: submission.title,
      description: submission.description,
      artworkUrl: submission.artworkUrl,
      campaignId: submission.campaignId,
      creatorId: submission.creatorId,
      creator: {
        id: creator.id,
        displayName: creator.displayName,
        email: creator.email,
        walletAddress: process.env.WALLET_ADDRESS,
      },
      campaign: {
        id: campaign.id,
        title: campaign.title,
        brandId: campaign.brandId,
        brand: {
          id: campaign.brandId,
          name: campaign.title,
          walletAddress: process.env.WALLET_ADDRESS,
        },
      },
      usedAssetIds: parentIpIds,
    }

    // 4. Get collection contract for this campaign
    const collectionContract =
      CAMPAIGN_COLLECTION_CONTRACTS[campaign.id] ||
      CAMPAIGN_COLLECTION_CONTRACTS["default"]

    console.log(
      `📄 [REGISTRATION] Using collection contract: ${collectionContract}`
    )
    console.log(
      `🌐 [REGISTRATION] Network: ${process.env.STORY_NETWORK || "aeneid"}`
    )

    // 5. Register as derivative IP asset
    console.log(`🚀 [REGISTRATION] Starting blockchain registration...`)
    const result = await registerSubmissionAsDerivative(
      submissionData,
      collectionContract
    )

    console.log(`✅ [REGISTRATION] Blockchain registration successful!`)
    console.log(`   🆔 New IP Asset ID: ${result.ipId}`)
    console.log(`   📝 Asset Name: ${result.assetName}`)
    console.log(`   🔗 Transaction Hash: ${result.txHash}`)

    // 6. Update submission with Story Protocol IP Asset ID
    console.log(
      `💾 [REGISTRATION] Updating submission record with Story Protocol IP Asset ID...`
    )
    await db
      .update(submissions)
      .set({
        storyProtocolIpId: result.ipId, // Story Protocol IP Asset ID (0x address)
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId))

    console.log(`✅ [REGISTRATION] Database updated successfully`)
    console.log(
      `🎉 [REGISTRATION] Registration complete for submission ${submissionId}`
    )
    console.log(``)
    console.log(`📊 [REGISTRATION] FINAL SUMMARY:`)
    console.log(`   Submission ID: ${submissionId}`)
    console.log(`   IP Asset ID: ${result.ipId}`)
    console.log(`   Transaction: ${result.txHash}`)
    console.log(
      `   Explorer: https://explorer.story.foundation/ipa/${result.ipId}`
    )
    console.log(``)

    return {
      success: true,
      txHash: result.txHash,
      ipId: result.ipId,
    }
  } catch (error) {
    console.error(
      `❌ [REGISTRATION] Failed to register submission ${submissionId}:`,
      error
    )
    if (error instanceof Error) {
      console.error(`📄 [REGISTRATION] Error message: ${error.message}`)
      console.error(`📄 [REGISTRATION] Error stack:`, error.stack)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Check if a submission is eligible for Story Protocol registration
 */
export async function isSubmissionEligibleForRegistration(
  submissionId: string
): Promise<{eligible: boolean; reason?: string}> {
  try {
    // Check if submission exists and is approved
    const [submission] = await db
      .select({
        id: submissions.id,
        status: submissions.status,
        storyProtocolIpId: submissions.storyProtocolIpId,
      })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (!submission) {
      return {eligible: false, reason: "Submission not found"}
    }

    if (submission.status !== "approved") {
      return {eligible: false, reason: "Submission must be approved first"}
    }

    if (submission.storyProtocolIpId) {
      return {
        eligible: false,
        reason: "Submission already registered as IP asset",
      }
    }

    // Check if submission has parent IP assets
    const parentIpIds = await getSubmissionAssetIpIds(submissionId)
    if (parentIpIds.length === 0) {
      return {eligible: false, reason: "No parent IP assets found"}
    }

    return {eligible: true}
  } catch (error) {
    console.error(
      `Error checking eligibility for submission ${submissionId}:`,
      error
    )
    return {eligible: false, reason: "Error checking eligibility"}
  }
}

/**
 * Get Story Protocol registration status for a submission
 */
export async function getSubmissionRegistrationStatus(
  submissionId: string
): Promise<{
  registered: boolean
  ipId?: string
  txHash?: string
  parentIpIds?: string[]
}> {
  try {
    const [submission] = await db
      .select({
        storyProtocolIpId: submissions.storyProtocolIpId,
      })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (!submission) {
      return {registered: false}
    }

    const parentIpIds = await getSubmissionAssetIpIds(submissionId)

    return {
      registered: !!submission.storyProtocolIpId,
      ipId: submission.storyProtocolIpId || undefined,
      parentIpIds,
    }
  } catch (error) {
    console.error(
      `Error getting registration status for submission ${submissionId}:`,
      error
    )
    return {registered: false}
  }
}
