/**
 * Canvas Export Utilities
 * Handles exporting canvas compositions to various image formats
 */

import { CanvasElement, Asset } from '@/types'

export interface ExportOptions {
  format: 'png' | 'jpeg'
  quality?: number // 0.1 to 1.0 for JPEG
  scale?: number // Export scale multiplier (1 = normal, 2 = 2x resolution)
  backgroundColor?: string // Background color (transparent for PNG, white default for JPEG)
}

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'generating' | 'complete' | 'error'
  progress: number // 0-100
  message: string
}

/**
 * Export canvas elements to an image file
 */
export async function exportCanvas(
  elements: CanvasElement[],
  assets: Asset[],
  canvasSize: { width: number; height: number },
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const {
    format = 'png',
    quality = 0.9,
    scale = 1,
    backgroundColor = format === 'jpeg' ? '#ffffff' : 'transparent'
  } = options

  try {
    // Stage 1: Prepare canvas
    onProgress?.({
      stage: 'preparing',
      progress: 10,
      message: 'Preparing canvas...'
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Set canvas size with scale
    canvas.width = canvasSize.width * scale
    canvas.height = canvasSize.height * scale
    
    // Scale context for high-resolution export
    ctx.scale(scale, scale)
    
    // Set background
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
    }

    // Stage 2: Load and render elements
    onProgress?.({
      stage: 'rendering',
      progress: 20,
      message: 'Loading assets...'
    })

    // Sort elements by zIndex to render in correct order
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)
    
    for (let i = 0; i < sortedElements.length; i++) {
      const element = sortedElements[i]
      const progress = 20 + (60 * (i / sortedElements.length))
      
      onProgress?.({
        stage: 'rendering',
        progress,
        message: `Rendering element ${i + 1} of ${sortedElements.length}...`
      })

      await renderElement(ctx, element, assets)
    }

    // Stage 3: Generate image
    onProgress?.({
      stage: 'generating',
      progress: 90,
      message: 'Generating image...'
    })

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onProgress?.({
              stage: 'complete',
              progress: 100,
              message: 'Export complete!'
            })
            resolve(blob)
          } else {
            reject(new Error('Failed to generate image blob'))
          }
        },
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        format === 'jpeg' ? quality : undefined
      )
    })

  } catch (error) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Export failed'
    })
    throw error
  }
}

/**
 * Render a single canvas element to the context
 */
async function renderElement(ctx: CanvasRenderingContext2D, element: CanvasElement, assets: Asset[]): Promise<void> {
  ctx.save()
  
  // Apply transformations
  const centerX = element.x + element.width / 2
  const centerY = element.y + element.height / 2
  
  ctx.translate(centerX, centerY)
  ctx.rotate((element.rotation * Math.PI) / 180)
  ctx.translate(-centerX, -centerY)
  
  // Apply opacity
  if (element.opacity !== undefined) {
    ctx.globalAlpha = element.opacity
  }

  if (element.type === 'asset') {
    await renderAssetElement(ctx, element, assets)
  } else if (element.type === 'text') {
    renderTextElement(ctx, element)
  }

  ctx.restore()
}

/**
 * Render an asset element (image)
 */
async function renderAssetElement(ctx: CanvasRenderingContext2D, element: CanvasElement, assets: Asset[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const asset = assets.find(a => a.id === element.assetId)
    if (!asset) {
      reject(new Error(`Asset not found: ${element.assetId}`))
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous' // Handle CORS for external images
    
    img.onload = () => {
      try {
        ctx.drawImage(img, element.x, element.y, element.width, element.height)
        resolve()
      } catch (error) {
        reject(new Error(`Failed to draw image: ${error}`))
      }
    }
    
    img.onerror = () => {
      reject(new Error(`Failed to load image for export: ${asset.url}`))
    }
    
    // Use the asset URL directly
    img.src = asset.url
  })
}

/**
 * Render a text element
 */
function renderTextElement(ctx: CanvasRenderingContext2D, element: CanvasElement): void {
  const {
    text = '',
    fontSize = 24,
    fontFamily = 'Arial, sans-serif',
    fontWeight = 'normal',
    fontStyle = 'normal',
    color = '#000000',
    backgroundColor,
    textAlign = 'center'
  } = element

  // Set font
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.textAlign = textAlign as CanvasTextAlign
  ctx.textBaseline = 'middle'

  // Draw background if specified
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(element.x, element.y, element.width, element.height)
    ctx.fillStyle = color
  }

  // Calculate text position
  let textX = element.x
  if (textAlign === 'center') {
    textX = element.x + element.width / 2
  } else if (textAlign === 'right') {
    textX = element.x + element.width
  }
  
  const textY = element.y + element.height / 2

  // Draw text
  ctx.fillText(text, textX, textY)
}


/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate a filename for export
 */
export function generateExportFilename(
  projectTitle?: string,
  format: 'png' | 'jpeg' = 'png'
): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  const title = projectTitle?.replace(/[^a-zA-Z0-9]/g, '_') || 'canvas_export'
  return `${title}_${timestamp}.${format}`
}