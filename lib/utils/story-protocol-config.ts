/**
 * Get the Story Protocol explorer URL for viewing an IP Asset
 * Automatically uses the correct network (aeneid/mainnet) based on configuration
 */
export function getStoryProtocolExplorerUrl(ipId: string): string {
  // Use environment-based network detection for better compatibility
  const network = process.env.STORY_NETWORK || "aeneid"
  const baseUrl = network === "mainnet" 
    ? "https://explorer.story.foundation" 
    : "https://aeneid.explorer.story.foundation"
  
  return `${baseUrl}/ipa/${ipId}`
}

/**
 * Check if a Story Protocol IP ID is valid (basic format validation)
 */
export function isValidStoryProtocolIpId(ipId: string | null | undefined): boolean {
  if (!ipId) return false
  // Basic Ethereum address validation (0x followed by 40 hex characters)
  return /^0x[a-fA-F0-9]{40}$/.test(ipId)
}

/**
 * Get the Story Protocol IP Portal URL for viewing assets
 */
export function getStoryProtocolPortalUrl(): string {
  const network = process.env.STORY_NETWORK || "aeneid"
  return network === "mainnet" 
    ? "https://portal.story.foundation/assets"
    : "https://staging.portal.story.foundation/assets"
}