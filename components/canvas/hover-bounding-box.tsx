"use client"

import { CanvasElement } from "@/types"

interface HoverBoundingBoxProps {
  element: CanvasElement
  zoom: number
}

export function HoverBoundingBox({ element, zoom }: HoverBoundingBoxProps) {
  return (
    <div
      className="absolute pointer-events-none border-2 border-blue-300/60 rounded-sm transition-opacity duration-200"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex + 1000, // Ensure it's above the element
      }}
    />
  )
}