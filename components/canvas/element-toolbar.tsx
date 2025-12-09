"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  RotateCw, 
  Copy, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical
} from "lucide-react"
import { CanvasElement } from "@/types"

interface ElementToolbarProps {
  element: CanvasElement
  onRotate: () => void
  onCopy: () => void
  onDelete: () => void
  onLayerUp: () => void
  onLayerDown: () => void
  onPosition: (position: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void
  canvasRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  panOffset: { x: number; y: number }
  canvasScale: number
}

export function ElementToolbar({
  element,
  onRotate,
  onCopy,
  onDelete,
  onLayerUp,
  onLayerDown,
  onPosition,
  canvasRef,
  zoom,
  panOffset,
  canvasScale
}: ElementToolbarProps) {
  // Calculate toolbar position above the selected element
  if (!canvasRef.current) return null
  
  const canvasRect = canvasRef.current.getBoundingClientRect()
  
  // For scaled canvas with transform-origin: center, we need to account for the centering offset
  const canvasWidth = 800
  const canvasHeight = 600
  
  // Calculate the center offset due to transform-origin: center
  const scaledWidth = canvasWidth * canvasScale
  const scaledHeight = canvasHeight * canvasScale
  const centerOffsetX = (canvasRect.width - scaledWidth) / 2
  const centerOffsetY = (canvasRect.height - scaledHeight) / 2
  
  // Element position with proper scaling and centering
  const elementX = (element.x * zoom * canvasScale) + (panOffset.x * canvasScale)
  const elementY = (element.y * zoom * canvasScale) + (panOffset.y * canvasScale)
  const elementWidth = element.width * zoom * canvasScale
  
  // Final screen position
  const toolbarX = canvasRect.left + centerOffsetX + elementX + (elementWidth / 2)
  const toolbarY = Math.max(10, canvasRect.top + centerOffsetY + elementY - 95) // Position toolbar much higher to clear rotation handle

  return (
    <div
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex items-center gap-1 p-1 z-50"
      style={{
        left: `${toolbarX}px`,
        top: `${toolbarY}px`,
        transform: 'translateX(-50%)', // Center horizontally above element
      }}
    >
      {/* Rotate */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRotate}
        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Rotate 90°"
      >
        <RotateCw className="h-4 w-4" />
      </Button>

      {/* Layer Up */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onLayerUp}
        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Bring Forward"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      {/* Layer Down */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onLayerDown}
        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Send Backward"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      {/* Copy */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCopy}
        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Copy"
      >
        <Copy className="h-4 w-4" />
      </Button>

      {/* Position Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Position"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <AlignLeft className="h-4 w-4" />
              Horizontal
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onPosition('left')} className="flex items-center gap-2">
                <AlignLeft className="h-4 w-4" />
                Align Left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPosition('center')} className="flex items-center gap-2">
                <AlignCenter className="h-4 w-4" />
                Align Center
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPosition('right')} className="flex items-center gap-2">
                <AlignRight className="h-4 w-4" />
                Align Right
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <AlignStartVertical className="h-4 w-4" />
              Vertical
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onPosition('top')} className="flex items-center gap-2">
                <AlignStartVertical className="h-4 w-4" />
                Align Top
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPosition('middle')} className="flex items-center gap-2">
                <AlignCenterVertical className="h-4 w-4" />
                Align Middle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPosition('bottom')} className="flex items-center gap-2">
                <AlignEndVertical className="h-4 w-4" />
                Align Bottom
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}