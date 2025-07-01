"use client"

import {useState, useRef, useCallback, useEffect, useMemo} from "react"
import {Asset, CanvasElement} from "@/types"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {generateId} from "@/lib/utils"
import {
  Save,
  Download,
  RotateCw,
  Move,
  Square,
  Circle,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers,
  Palette,
  ChevronUp,
  ChevronDown,
  X,
  Settings,
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FolderOpen,
  Clock,
  Undo2,
  Redo2,
} from "lucide-react"
import {ProjectManager} from "./project-manager"
import {ElementToolbar} from "./element-toolbar"
import {HoverBoundingBox} from "./hover-bounding-box"
import {EnhancedSelectionBox} from "./enhanced-selection-box"
import {SubmissionModal} from "../submissions/submission-modal"
import {
  CanvasProject,
  saveProject,
  generateProjectId,
  checkForConflicts,
  hasStorageSpace,
} from "@/lib/canvas-storage"
import {
  exportCanvas,
  downloadBlob,
  generateExportFilename,
  ExportOptions,
  ExportProgress,
} from "@/lib/canvas-export"
import {
  ActionHistory,
  createActionHistory,
  addAction,
  canUndo,
  canRedo,
  undo,
  redo,
  applyActionToElements,
  createMoveAction,
  createRotateAction,
  createResizeAction,
  createUpdateAction,
  createDeleteAction,
  createCreateAction,
  createCopyAction,
} from "@/lib/canvas-actions"

interface CreationCanvasProps {
  assets: Asset[]
  campaignId: string
  campaignTitle: string
  ipKitId?: string
  onSave: (elements: CanvasElement[]) => void
  isLoading?: boolean
  onAutoSave?: (elements: CanvasElement[]) => void
}

export function CreationCanvas({
  assets,
  campaignId,
  campaignTitle,
  ipKitId,
  onSave,
  isLoading = false,
  onAutoSave,
}: CreationCanvasProps) {
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({x: 0, y: 0})
  const [panOffset, setPanOffset] = useState({x: 0, y: 0})
  const [isAssetPanelOpen, setIsAssetPanelOpen] = useState(false)
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(false)
  const [touchStart, setTouchStart] = useState<{
    x: number
    y: number
    elementId: string
  } | null>(null)
  const [elementDrag, setElementDrag] = useState<{
    elementId: string
    startX: number
    startY: number
    offsetX: number
    offsetY: number
    initialPos: {x: number; y: number}
  } | null>(null)
  const [isResizing, setIsResizing] = useState<{
    elementId: string
    corner: string
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    initialSize: {width: number; height: number}
    initialPos: {x: number; y: number}
  } | null>(null)
  const [isRotating, setIsRotating] = useState<{
    elementId: string
    startAngle: number
    initialRotation: number
  } | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>("")
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)
  const [preventNextCanvasClick, setPreventNextCanvasClick] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null
  )
  const [isMobile, setIsMobile] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(800)
  const [screenSize, setScreenSize] = useState<"mobile" | "tablet" | "desktop">(
    "desktop"
  )

  // Local storage state
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [projectTitle, setProjectTitle] = useState<string>("")
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedElements, setLastSavedElements] = useState<CanvasElement[]>(
    []
  )
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Action history state
  const [actionHistory, setActionHistory] = useState<ActionHistory>(() =>
    createActionHistory()
  )
  const [clipboard, setClipboard] = useState<CanvasElement | null>(null)

  // Submission state
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false)

  // Calculate current canvas scale for toolbar positioning
  const canvasScale = useMemo(() => {
    if (isMobile) {
      return 1 // Mobile uses no scaling
    } else {
      // Desktop scaling calculation (same as in canvas style)
      const windowHeight =
        typeof window !== "undefined" ? window.innerHeight : 800

      let panelWidth = 224
      if (viewportWidth >= 1024) panelWidth = 256
      if (viewportWidth >= 1280) panelWidth = 288
      panelWidth = Math.min(panelWidth, 288)

      const totalPanelWidth = panelWidth * 2
      const padding = 64

      const availableWidth = Math.max(
        400,
        viewportWidth - totalPanelWidth - padding
      )
      const availableHeight = Math.max(300, windowHeight - 200)

      const scaleX = availableWidth / 800
      const scaleY = availableHeight / 600
      const autoScale = Math.min(scaleX, scaleY, 1.0)

      return zoom * autoScale
    }
  }, [isMobile, viewportWidth, zoom])

  // Detect responsive breakpoints for optimal layout
  useEffect(() => {
    const checkDevice = () => {
      if (typeof window !== "undefined") {
        const width = window.innerWidth
        setViewportWidth(width)

        // Detect if device has touch capability
        const hasTouch =
          "ontouchstart" in window || navigator.maxTouchPoints > 0
        setIsTouchDevice(hasTouch)

        if (width < 768) {
          setScreenSize("mobile")
          setIsMobile(true)
        } else if (width < 960) {
          setScreenSize("tablet")
          setIsMobile(true) // Use mobile layout for smaller tablets
        } else {
          setScreenSize("desktop")
          setIsMobile(false) // Use desktop 3-column layout for 960px+
        }
      }
    }

    checkDevice()
    if (typeof window !== "undefined") {
      window.addEventListener("resize", checkDevice)
      return () => window.removeEventListener("resize", checkDevice)
    }
  }, [])

  // Handle touch events for moving elements on touch devices
  const handleTouchStart = (e: React.TouchEvent, elementId: string) => {
    if (isTouchDevice) {
      e.stopPropagation()
      const touch = e.touches[0]
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        elementId,
      })
      setSelectedElement(elementId)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isTouchDevice && touchStart) {
      e.preventDefault()
      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStart.x
      const deltaY = touch.clientY - touchStart.y

      const element = elements.find(el => el.id === touchStart.elementId)
      if (element) {
        const newX = Math.max(0, element.x + deltaX)
        const newY = Math.max(0, element.y + deltaY)

        updateElement(touchStart.elementId, {x: newX, y: newY})
        setTouchStart({...touchStart, x: touch.clientX, y: touch.clientY})
      }
    }
  }

  const handleTouchEnd = () => {
    if (isTouchDevice) {
      setTouchStart(null)
    }
  }

  // Action recording functions
  const recordAction = useCallback(
    (
      action: Omit<
        import("@/lib/canvas-actions").CanvasAction,
        "id" | "timestamp"
      >
    ) => {
      setActionHistory(prev => addAction(prev, action))
    },
    []
  )

  // Debounce element updates for performance
  const debouncedUpdateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      setElements(prev =>
        prev.map(el => (el.id === id ? {...el, ...updates} : el))
      )
    },
    []
  )
  const updateElement = debouncedUpdateElement

  // Element drag handlers for mouse/trackpad devices
  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (canvasRef.current) {
      e.stopPropagation()
      const rect = canvasRef.current.getBoundingClientRect()
      const element = elements.find(el => el.id === elementId)
      if (element) {
        // Background elements cannot be moved - only select them
        if (element.isBackground) {
          setSelectedElement(elementId)
          return
        }

        setElementDrag({
          elementId,
          startX: e.clientX,
          startY: e.clientY,
          offsetX: (e.clientX - rect.left - panOffset.x) / zoom - element.x,
          offsetY: (e.clientY - rect.top - panOffset.y) / zoom - element.y,
          initialPos: {x: element.x, y: element.y},
        })
        setSelectedElement(elementId)
      }
    }
  }

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    elementId: string,
    corner: string
  ) => {
    e.stopPropagation()
    const element = elements.find(el => el.id === elementId)
    if (element) {
      // Background elements cannot be resized - they're locked to canvas size
      if (element.isBackground) {
        return
      }

      setIsResizing({
        elementId,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: element.width,
        startHeight: element.height,
        initialSize: {width: element.width, height: element.height},
        initialPos: {x: element.x, y: element.y},
      })
    }
  }

  const handleRotationMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    const element = elements.find(el => el.id === elementId)
    if (element && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()

      // Account for canvas scaling and centering
      const canvasWidth = 800
      const canvasHeight = 600
      const scaledWidth = canvasWidth * canvasScale
      const scaledHeight = canvasHeight * canvasScale
      const centerOffsetX = (rect.width - scaledWidth) / 2
      const centerOffsetY = (rect.height - scaledHeight) / 2

      // Element center position with proper scaling
      const elementCenterX =
        (element.x + element.width / 2) * zoom * canvasScale +
        panOffset.x * canvasScale
      const elementCenterY =
        (element.y + element.height / 2) * zoom * canvasScale +
        panOffset.y * canvasScale

      // Final screen position
      const centerX = rect.left + centerOffsetX + elementCenterX
      const centerY = rect.top + centerOffsetY + elementCenterY

      const startAngle =
        Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)

      setIsRotating({
        elementId,
        startAngle,
        initialRotation: element.rotation,
      })
    }
  }

  // Flip handlers for background elements
  const handleFlipHorizontal = useCallback(
    (elementId: string) => {
      const element = elements.find(el => el.id === elementId)
      if (element && element.isBackground) {
        updateElement(elementId, {flipHorizontal: !element.flipHorizontal})
        recordAction(
          createUpdateAction(
            elementId,
            {flipHorizontal: element.flipHorizontal},
            {flipHorizontal: !element.flipHorizontal}
          )
        )
      }
    },
    [elements, updateElement, recordAction]
  )

  const handleFlipVertical = useCallback(
    (elementId: string) => {
      const element = elements.find(el => el.id === elementId)
      if (element && element.isBackground) {
        updateElement(elementId, {flipVertical: !element.flipVertical})
        recordAction(
          createUpdateAction(
            elementId,
            {flipVertical: element.flipVertical},
            {flipVertical: !element.flipVertical}
          )
        )
      }
    },
    [elements, updateElement, recordAction]
  )

  // Helper function to build transform string for elements
  const getElementTransform = useCallback((element: CanvasElement) => {
    const transforms = []

    if (element.flipHorizontal) {
      transforms.push("scaleX(-1)")
    }
    if (element.flipVertical) {
      transforms.push("scaleY(-1)")
    }
    if (element.rotation) {
      transforms.push(`rotate(${element.rotation}deg)`)
    }

    return transforms.length > 0 ? transforms.join(" ") : "none"
  }, [])

  useEffect(() => {
    const handleElementMouseMove = (e: MouseEvent) => {
      if (elementDrag && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const newX = Math.max(
          0,
          (e.clientX - rect.left - panOffset.x) / zoom - elementDrag.offsetX
        )
        const newY = Math.max(
          0,
          (e.clientY - rect.top - panOffset.y) / zoom - elementDrag.offsetY
        )

        updateElement(elementDrag.elementId, {x: newX, y: newY})
      }
    }

    const handleElementMouseUp = () => {
      if (elementDrag) {
        const element = elements.find(el => el.id === elementDrag.elementId)
        if (
          element &&
          (element.x !== elementDrag.initialPos.x ||
            element.y !== elementDrag.initialPos.y)
        ) {
          recordAction(
            createMoveAction(elementDrag.elementId, elementDrag.initialPos, {
              x: element.x,
              y: element.y,
            })
          )
        }
      }
      setElementDrag(null)
    }

    const handleResizeMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const deltaX = e.clientX - isResizing.startX
        const deltaY = e.clientY - isResizing.startY

        let newWidth = isResizing.startWidth
        let newHeight = isResizing.startHeight
        let newX = isResizing.initialPos.x
        let newY = isResizing.initialPos.y

        const element = elements.find(el => el.id === isResizing.elementId)
        if (!element) return

        switch (isResizing.corner) {
          // Corner handles (proportional or free resize)
          case "se": // bottom-right
            newWidth = Math.max(20, isResizing.startWidth + deltaX / zoom)
            newHeight = Math.max(20, isResizing.startHeight + deltaY / zoom)
            break
          case "sw": // bottom-left
            newWidth = Math.max(20, isResizing.startWidth - deltaX / zoom)
            newHeight = Math.max(20, isResizing.startHeight + deltaY / zoom)
            newX = isResizing.initialPos.x + (isResizing.startWidth - newWidth)
            break
          case "ne": // top-right
            newWidth = Math.max(20, isResizing.startWidth + deltaX / zoom)
            newHeight = Math.max(20, isResizing.startHeight - deltaY / zoom)
            newY =
              isResizing.initialPos.y + (isResizing.startHeight - newHeight)
            break
          case "nw": // top-left
            newWidth = Math.max(20, isResizing.startWidth - deltaX / zoom)
            newHeight = Math.max(20, isResizing.startHeight - deltaY / zoom)
            newX = isResizing.initialPos.x + (isResizing.startWidth - newWidth)
            newY =
              isResizing.initialPos.y + (isResizing.startHeight - newHeight)
            break

          // Side handles (one-directional resize)
          case "n": // top
            newHeight = Math.max(20, isResizing.startHeight - deltaY / zoom)
            newY =
              isResizing.initialPos.y + (isResizing.startHeight - newHeight)
            break
          case "s": // bottom
            newHeight = Math.max(20, isResizing.startHeight + deltaY / zoom)
            break
          case "e": // right
            newWidth = Math.max(20, isResizing.startWidth + deltaX / zoom)
            break
          case "w": // left
            newWidth = Math.max(20, isResizing.startWidth - deltaX / zoom)
            newX = isResizing.initialPos.x + (isResizing.startWidth - newWidth)
            break
        }

        const updates: Partial<CanvasElement> = {
          width: newWidth,
          height: newHeight,
        }
        if (newX !== undefined) updates.x = newX
        if (newY !== undefined) updates.y = newY

        updateElement(isResizing.elementId, updates)
      }
    }

    const handleResizeMouseUp = () => {
      if (isResizing) {
        const element = elements.find(el => el.id === isResizing.elementId)
        if (
          element &&
          (element.width !== isResizing.initialSize.width ||
            element.height !== isResizing.initialSize.height)
        ) {
          recordAction(
            createResizeAction(isResizing.elementId, isResizing.initialSize, {
              width: element.width,
              height: element.height,
            })
          )
        }
        // Prevent canvas click from deselecting after resize
        setPreventNextCanvasClick(true)
        setTimeout(() => setPreventNextCanvasClick(false), 50)
      }
      setIsResizing(null)
    }

    const handleRotationMouseMove = (e: MouseEvent) => {
      if (isRotating && canvasRef.current) {
        const element = elements.find(el => el.id === isRotating.elementId)
        if (element) {
          const rect = canvasRef.current.getBoundingClientRect()

          // Account for canvas scaling and centering
          const canvasWidth = 800
          const canvasHeight = 600
          const scaledWidth = canvasWidth * canvasScale
          const scaledHeight = canvasHeight * canvasScale
          const centerOffsetX = (rect.width - scaledWidth) / 2
          const centerOffsetY = (rect.height - scaledHeight) / 2

          // Element center position with proper scaling
          const elementCenterX =
            (element.x + element.width / 2) * zoom * canvasScale +
            panOffset.x * canvasScale
          const elementCenterY =
            (element.y + element.height / 2) * zoom * canvasScale +
            panOffset.y * canvasScale

          // Final screen position
          const centerX = rect.left + centerOffsetX + elementCenterX
          const centerY = rect.top + centerOffsetY + elementCenterY

          const currentAngle =
            Math.atan2(e.clientY - centerY, e.clientX - centerX) *
            (180 / Math.PI)
          const angleDiff = currentAngle - isRotating.startAngle
          let newRotation = isRotating.initialRotation + angleDiff

          // Background elements: no rotation allowed to maintain edge-to-edge coverage
          if (element.isBackground) {
            // Keep background at current rotation, no changes allowed
            newRotation = isRotating.initialRotation
          } else {
            // Regular elements: snap to 15-degree increments when shift is held
            if (e.shiftKey) {
              newRotation = Math.round(newRotation / 15) * 15
            }
          }

          // Normalize angle to 0-360 range
          newRotation = ((newRotation % 360) + 360) % 360

          updateElement(isRotating.elementId, {rotation: newRotation})
        }
      }
    }

    const handleRotationMouseUp = () => {
      if (isRotating) {
        const element = elements.find(el => el.id === isRotating.elementId)
        if (element && element.rotation !== isRotating.initialRotation) {
          recordAction(
            createRotateAction(
              isRotating.elementId,
              isRotating.initialRotation,
              element.rotation
            )
          )
        }
        // Prevent canvas click from deselecting after rotation
        setPreventNextCanvasClick(true)
        setTimeout(() => setPreventNextCanvasClick(false), 50)
      }
      setIsRotating(null)
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleElementMouseMove(e)
      handleResizeMouseMove(e)
      handleRotationMouseMove(e)
    }

    const handleMouseUp = () => {
      handleElementMouseUp()
      handleResizeMouseUp()
      handleRotationMouseUp()
    }

    if (elementDrag || isResizing || isRotating) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [
    elementDrag,
    isResizing,
    isRotating,
    zoom,
    panOffset,
    elements,
    recordAction,
    canvasScale,
    updateElement,
  ])

  // Text editing handlers
  const handleTextDoubleClick = (elementId: string) => {
    const element = elements.find(
      el => el.id === elementId && el.type === "text"
    )
    if (element) {
      setEditingTextId(elementId)
      setEditingText(element.text || "")
      setSelectedElement(elementId)
    }
  }

  const handleTextSave = useCallback(() => {
    if (editingTextId) {
      updateElement(editingTextId, {text: editingText})
      setEditingTextId(null)
      setEditingText("")
    }
  }, [editingTextId, editingText, updateElement])

  const handleTextCancel = useCallback(() => {
    setEditingTextId(null)
    setEditingText("")
  }, [])

  // Handle escape key to cancel text editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) {
        if (e.key === "Escape") {
          handleTextCancel()
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          handleTextSave()
        }
      }
    }

    if (editingTextId) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [editingTextId, handleTextCancel, handleTextSave])

  const categories = [
    {id: "all", label: "All Assets", icon: Palette},
    {id: "characters", label: "Characters", icon: Circle},
    {id: "backgrounds", label: "Backgrounds", icon: Square},
    {id: "logos", label: "Logos", icon: Circle},
    {id: "titles", label: "Titles", icon: Square},
    {id: "props", label: "Props", icon: Circle},
  ]

  // Memoize filtered assets for performance
  const filteredAssets = useMemo(() => {
    return selectedCategory === "all"
      ? assets
      : assets.filter(asset => asset.category === selectedCategory)
  }, [assets, selectedCategory])

  // Virtual scrolling state for large asset libraries
  const [visibleAssets, setVisibleAssets] = useState<Asset[]>([])
  const [assetScrollTop, setAssetScrollTop] = useState(0)
  const assetContainerRef = useRef<HTMLDivElement>(null)

  // Performance optimization: Only show visible assets
  useEffect(() => {
    if (filteredAssets.length <= 20) {
      // For small lists, show all assets
      setVisibleAssets(filteredAssets)
      return
    }

    // For large lists, implement virtual scrolling
    const itemHeight = 120 // Approximate height per asset item
    const containerHeight = assetContainerRef.current?.clientHeight || 400
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 // Buffer
    const startIndex = Math.floor(assetScrollTop / itemHeight)
    const endIndex = Math.min(startIndex + visibleCount, filteredAssets.length)

    setVisibleAssets(filteredAssets.slice(startIndex, endIndex))
  }, [filteredAssets, assetScrollTop])

  // Local storage functions
  const saveToLocalStorage = useCallback(() => {
    try {
      if (!hasStorageSpace()) {
        console.warn("Not enough storage space for local backup")
        return
      }

      const projectId = currentProjectId || generateProjectId()
      const title =
        projectTitle || `${campaignTitle} - ${new Date().toLocaleDateString()}`

      const project: Omit<CanvasProject, "updatedAt" | "thumbnail"> = {
        id: projectId,
        title,
        campaignTitle,
        elements,
        canvasSize: {width: 800, height: 600},
        version: "1.0",
        createdAt: lastSaveTime || new Date(),
      }

      saveProject(project)

      if (!currentProjectId) {
        setCurrentProjectId(projectId)
      }
      if (!projectTitle) {
        setProjectTitle(title)
      }

      const now = new Date()
      setLastSaveTime(now)
      setLastAutoSaveTime(now) // Also update autosave time to prevent immediate autosave
      setLastSavedElements([...elements])
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Failed to save to local storage:", error)
    }
  }, [currentProjectId, projectTitle, campaignTitle, elements, lastSaveTime])

  const handleLoadProject = useCallback(
    (project: CanvasProject) => {
      try {
        // Check for conflicts
        if (currentProjectId && hasUnsavedChanges) {
          const hasConflict = checkForConflicts(project.id, project.updatedAt)
          if (hasConflict) {
            const shouldContinue = confirm(
              "This project has been modified elsewhere. Loading it will overwrite your current changes. Continue?"
            )
            if (!shouldContinue) return
          }
        }

        setElements(project.elements)
        setCurrentProjectId(project.id)
        setProjectTitle(project.title)
        setLastSaveTime(project.updatedAt)
        setLastSavedElements([...project.elements])
        setHasUnsavedChanges(false)
        setSelectedElement(null)
      } catch (error) {
        console.error("Failed to load project:", error)
        alert("Failed to load project")
      }
    },
    [currentProjectId, hasUnsavedChanges]
  )

  const handleNewProject = useCallback(() => {
    if (hasUnsavedChanges) {
      const shouldContinue = confirm(
        "You have unsaved changes. Create a new project anyway?"
      )
      if (!shouldContinue) return
    }

    setElements([])
    setCurrentProjectId(null)
    setProjectTitle("")
    setLastSaveTime(null)
    setLastSavedElements([])
    setHasUnsavedChanges(false)
    setSelectedElement(null)
  }, [hasUnsavedChanges])

  // Auto-save functionality with longer debouncing to reduce frequency
  useEffect(() => {
    // Only auto-save if there are elements and changes since last save
    if (elements.length > 0 && hasUnsavedChanges) {
      const timer = setTimeout(() => {
        // Check if we still have unsaved changes and enough time has passed since last autosave
        const now = new Date()
        const timeSinceLastAutoSave = lastAutoSaveTime
          ? now.getTime() - lastAutoSaveTime.getTime()
          : Infinity
        const minTimeBetweenSaves = 10000 // Minimum 10 seconds between autosaves

        if (hasUnsavedChanges && timeSinceLastAutoSave >= minTimeBetweenSaves) {
          setIsAutoSaving(true)
          setLastAutoSaveTime(now)

          // Save to external system if provided
          if (onAutoSave) {
            onAutoSave(elements)
          }

          // Save to local storage
          saveToLocalStorage()

          setTimeout(() => setIsAutoSaving(false), 1000)
        }
      }, 10000) // Auto-save after 10 seconds of inactivity

      return () => clearTimeout(timer)
    }
  }, [
    elements,
    onAutoSave,
    saveToLocalStorage,
    hasUnsavedChanges,
    lastAutoSaveTime,
  ])

  // Track unsaved changes by comparing current elements with last saved state
  useEffect(() => {
    const hasChanges =
      JSON.stringify(elements) !== JSON.stringify(lastSavedElements)
    setHasUnsavedChanges(hasChanges)
  }, [elements, lastSavedElements])

  // Zoom with mouse wheel
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(prev => Math.max(0.25, Math.min(2, prev + delta)))
      }
    }

    const canvas = canvasContainerRef.current
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, {passive: false})
      return () => canvas.removeEventListener("wheel", handleWheel)
    }
  }, [])

  // Memoize selected element data for performance
  const selectedElementData = useMemo(() => {
    return selectedElement
      ? elements.find(el => el.id === selectedElement)
      : null
  }, [selectedElement, elements])

  const selectedAsset = useMemo(() => {
    return selectedElementData
      ? assets.find(a => a.id === selectedElementData.assetId)
      : null
  }, [selectedElementData, assets])

  const handleUndo = useCallback(() => {
    if (canUndo(actionHistory)) {
      const {history: newHistory, action} = undo(actionHistory)
      if (action) {
        const newElements = applyActionToElements(elements, action, true)
        setElements(newElements)
        setActionHistory(newHistory)
        setSelectedElement(null)
      }
    }
  }, [actionHistory, elements])

  const handleRedo = useCallback(() => {
    if (canRedo(actionHistory)) {
      const {history: newHistory, action} = redo(actionHistory)
      if (action) {
        const newElements = applyActionToElements(elements, action, false)
        setElements(newElements)
        setActionHistory(newHistory)
        setSelectedElement(null)
      }
    }
  }, [actionHistory, elements])

  // Enhanced element manipulation functions
  const rotateElement = useCallback(
    (elementId: string) => {
      const element = elements.find(el => el.id === elementId)
      if (element) {
        const previousRotation = element.rotation
        const newRotation = (previousRotation + 90) % 360

        setElements(prev =>
          prev.map(el =>
            el.id === elementId ? {...el, rotation: newRotation} : el
          )
        )

        recordAction(
          createRotateAction(elementId, previousRotation, newRotation)
        )
      }
    },
    [elements, recordAction]
  )

  const copyElement = useCallback(
    (elementId: string) => {
      const element = elements.find(el => el.id === elementId)
      if (element) {
        const copiedElement: CanvasElement = {
          ...element,
          id: generateId(),
          x: element.x + 20,
          y: element.y + 20,
          zIndex: Math.max(...elements.map(el => el.zIndex)) + 1,
        }

        setElements(prev => [...prev, copiedElement])
        setSelectedElement(copiedElement.id)
        setClipboard(element)

        recordAction(createCopyAction(element, copiedElement))
      }
    },
    [elements, recordAction]
  )

  const deleteElementWithHistory = useCallback(
    (elementId: string) => {
      const element = elements.find(el => el.id === elementId)
      if (element) {
        setElements(prev => prev.filter(el => el.id !== elementId))
        setSelectedElement(null)

        recordAction(createDeleteAction(element))
      }
    },
    [elements, recordAction]
  )

  const moveElementLayer = useCallback(
    (elementId: string, direction: "up" | "down") => {
      const element = elements.find(el => el.id === elementId)
      if (!element) return

      const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)
      const currentIndex = sortedElements.findIndex(el => el.id === elementId)

      let newZIndex = element.zIndex

      if (direction === "up" && currentIndex < sortedElements.length - 1) {
        newZIndex = sortedElements[currentIndex + 1].zIndex + 1
      } else if (direction === "down" && currentIndex > 0) {
        newZIndex = sortedElements[currentIndex - 1].zIndex - 1
      }

      if (newZIndex !== element.zIndex) {
        setElements(prev =>
          prev.map(el =>
            el.id === elementId ? {...el, zIndex: newZIndex} : el
          )
        )

        recordAction(
          createUpdateAction(
            elementId,
            {zIndex: element.zIndex},
            {zIndex: newZIndex}
          )
        )
      }
    },
    [elements, recordAction]
  )

  const deleteElement = deleteElementWithHistory

  // Position alignment handler
  const handlePosition = useCallback(
    (
      elementId: string,
      position: "left" | "center" | "right" | "top" | "middle" | "bottom"
    ) => {
      const element = elements.find(el => el.id === elementId)
      if (!element) return

      const canvasWidth = 800
      const canvasHeight = 600
      let newX = element.x
      let newY = element.y

      // Calculate new position based on canvas dimensions
      switch (position) {
        case "left":
          newX = 20 // Small padding from edge
          break
        case "center":
          newX = (canvasWidth - element.width) / 2
          break
        case "right":
          newX = canvasWidth - element.width - 20 // Small padding from edge
          break
        case "top":
          newY = 20 // Small padding from edge
          break
        case "middle":
          newY = (canvasHeight - element.height) / 2
          break
        case "bottom":
          newY = canvasHeight - element.height - 20 // Small padding from edge
          break
      }

      const oldPosition = {x: element.x, y: element.y}
      const newPosition = {x: newX, y: newY}

      updateElement(elementId, newPosition)
      recordAction(createMoveAction(elementId, oldPosition, newPosition))
    },
    [elements, updateElement, recordAction]
  )

  // Pan controls
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        // Middle mouse or Ctrl+click
        e.preventDefault()
        setIsPanning(true)
        setPanStart({x: e.clientX - panOffset.x, y: e.clientY - panOffset.y})
      }
    },
    [panOffset]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        })
      }
    },
    [isPanning, panStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleSave = useCallback(() => {
    if (elements.length === 0) {
      alert("Nothing to submit. Add some elements to your canvas first.")
      return
    }
    setIsSubmissionModalOpen(true)
  }, [elements])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when editing text
      if (editingTextId) return

      if (e.key === "Delete" && selectedElement) {
        deleteElementWithHistory(selectedElement)
      } else if (e.key === "Escape") {
        setSelectedElement(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault()
        handleRedo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedElement) {
        e.preventDefault()
        const element = elements.find(el => el.id === selectedElement)
        if (element) {
          setClipboard(element)
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard) {
        e.preventDefault()
        copyElement(selectedElement || clipboard.id)
      } else if (selectedElement && !e.ctrlKey && !e.metaKey) {
        // Arrow key movement for precise positioning
        const element = elements.find(el => el.id === selectedElement)
        if (element) {
          const moveDistance = e.shiftKey ? 10 : 1
          let newX = element.x
          let newY = element.y

          switch (e.key) {
            case "ArrowLeft":
              e.preventDefault()
              newX = Math.max(0, element.x - moveDistance)
              break
            case "ArrowRight":
              e.preventDefault()
              newX = element.x + moveDistance
              break
            case "ArrowUp":
              e.preventDefault()
              newY = Math.max(0, element.y - moveDistance)
              break
            case "ArrowDown":
              e.preventDefault()
              newY = element.y + moveDistance
              break
          }

          if (newX !== element.x || newY !== element.y) {
            setElements(prev =>
              prev.map(el =>
                el.id === selectedElement ? {...el, x: newX, y: newY} : el
              )
            )
            recordAction(
              createMoveAction(
                selectedElement,
                {x: element.x, y: element.y},
                {x: newX, y: newY}
              )
            )
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    selectedElement,
    editingTextId,
    elements,
    clipboard,
    handleUndo,
    handleRedo,
    deleteElementWithHistory,
    copyElement,
    recordAction,
    handleSave,
  ])

  const resetCanvas = () => {
    setElements([])
    setSelectedElement(null)
    setPanOffset({x: 0, y: 0})
    setZoom(1)
  }

  // Export functionality
  const handleExport = async (
    format: "png" | "jpeg" = "png",
    scale: number = 2
  ) => {
    if (elements.length === 0) {
      alert("Nothing to export. Add some elements to your canvas first.")
      return
    }

    setIsExporting(true)
    setExportProgress(null)

    try {
      const options: ExportOptions = {
        format,
        quality: 0.9,
        scale, // Export at 2x resolution for better quality
        backgroundColor: format === "jpeg" ? "#ffffff" : "transparent",
      }

      const blob = await exportCanvas(
        elements,
        assets,
        {width: 800, height: 600}, // Canvas size
        options,
        progress => setExportProgress(progress)
      )

      const filename = generateExportFilename(
        projectTitle || campaignTitle,
        format
      )
      downloadBlob(blob, filename)
    } catch (error) {
      console.error("Export failed:", error)
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    } finally {
      setIsExporting(false)
      setExportProgress(null)
    }
  }

  const addTextElement = () => {
    const canvasWidth = isMobile ? Math.min(800, viewportWidth - 8) : 800
    const canvasHeight = isMobile ? canvasWidth * 0.75 : 600

    const newElement: CanvasElement = {
      id: generateId(),
      type: "text",
      text: "Double-click to edit",
      fontSize: 24,
      fontFamily: "Arial, sans-serif",
      fontWeight: "normal",
      fontStyle: "normal",
      textAlign: "center",
      color: "#000000",
      x: (canvasWidth - 200) / 2, // Center horizontally
      y: (canvasHeight - 50) / 2, // Center vertically
      width: 200,
      height: 50,
      rotation: 0,
      zIndex: elements.length,
      opacity: 1,
    }

    setElements(prev => [...prev, newElement])
    setSelectedElement(newElement.id)
    recordAction(createCreateAction(newElement))
  }

  const fitToScreen = () => {
    if (canvasContainerRef.current && canvasRef.current) {
      const container = canvasContainerRef.current.getBoundingClientRect()
      const canvasWidth = 800
      const canvasHeight = 600

      const scaleX = (container.width - 80) / canvasWidth
      const scaleY = (container.height - 80) / canvasHeight
      const newZoom = Math.min(scaleX, scaleY, 1)

      setZoom(newZoom)
      setPanOffset({x: 0, y: 0})
    }
  }

  return (
    <div
      className={`h-screen w-full bg-background ${isMobile ? "flex flex-col" : "flex"}`}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className='absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2' />
            <p className='text-sm text-muted-foreground'>Loading assets...</p>
          </div>
        </div>
      )}

      {/* Mobile Asset Panel - Top Collapsible */}
      {isMobile && (
        <div
          className={`bg-card border-b transition-all duration-300 ${isAssetPanelOpen ? "h-80" : "h-12"} shrink-0 z-10`}
        >
          <div className='flex items-center justify-between px-4 h-12 border-b'>
            <div className='flex items-center gap-2'>
              <Palette className='h-4 w-4' />
              <span className='font-medium'>Assets</span>
              <Badge variant='outline' className='text-xs'>
                {filteredAssets.length}
              </Badge>
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsAssetPanelOpen(!isAssetPanelOpen)}
            >
              {isAssetPanelOpen ? (
                <ChevronUp className='h-4 w-4' />
              ) : (
                <ChevronDown className='h-4 w-4' />
              )}
            </Button>
          </div>

          {isAssetPanelOpen && (
            <div className='h-68 overflow-hidden'>
              <div className='p-3'>
                <div className='flex gap-1 mb-3 overflow-x-auto pb-2 scrollbar-hide'>
                  {categories.map(category => (
                    <Button
                      key={category.id}
                      variant={
                        selectedCategory === category.id ? "default" : "outline"
                      }
                      size='sm'
                      onClick={() => setSelectedCategory(category.id)}
                      className='text-xs whitespace-nowrap flex-shrink-0'
                    >
                      <category.icon className='mr-1 h-3 w-3' />
                      {category.label}
                    </Button>
                  ))}
                </div>

                <div className='grid grid-cols-3 sm:grid-cols-4 gap-2 h-52 overflow-y-auto'>
                  {(filteredAssets.length > 20
                    ? visibleAssets
                    : filteredAssets
                  ).map((asset, index) => (
                    <div
                      key={asset.id}
                      className='asset-palette-item group relative aspect-square border border-border rounded cursor-pointer transition-all hover:border-primary active:scale-95'
                      onClick={e => {
                        // Click to add asset to canvas
                        setIsAssetPanelOpen(false)
                        const canvasWidth = isMobile
                          ? Math.min(800, viewportWidth - 8)
                          : 800
                        const canvasHeight = isMobile ? canvasWidth * 0.75 : 600

                        const isBackgroundAsset =
                          asset.category === "backgrounds"

                        const newElement: CanvasElement = isBackgroundAsset
                          ? {
                              // Background asset: fill entire canvas edge-to-edge
                              id: generateId(),
                              type: "asset",
                              assetId: asset.id,
                              x: 0,
                              y: 0,
                              width: 800, // Always use full canvas width
                              height: 600, // Always use full canvas height
                              rotation: 0,
                              zIndex: -elements.length - 1, // Always bottom layer
                              isBackground: true,
                              locked: true, // Prevent moving/resizing
                              flipHorizontal: false,
                              flipVertical: false,
                            }
                          : {
                              // Regular asset: add to center
                              id: generateId(),
                              type: "asset",
                              assetId: asset.id,
                              x: (canvasWidth - 100) / 2, // Center horizontally
                              y: (canvasHeight - 100) / 2, // Center vertically
                              width: 100,
                              height: 100,
                              rotation: 0,
                              zIndex: elements.length,
                            }

                        setElements(prev => [...prev, newElement])
                        setSelectedElement(newElement.id)
                        recordAction(createCreateAction(newElement))
                      }}
                    >
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.filename}
                        className='w-full h-full object-cover rounded'
                        loading='lazy'
                        onError={e => {
                          const target = e.target as HTMLImageElement
                          if (target.src !== asset.url) {
                            target.src = asset.url
                          }
                        }}
                      />
                      <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded flex items-center justify-center'>
                        <div className='text-white text-center px-1'>
                          <p className='text-xs font-medium'>
                            {asset.filename}
                          </p>
                          <Badge variant='secondary' className='mt-1 text-xs'>
                            {asset.category}
                          </Badge>
                          {asset.category === "backgrounds" && (
                            <p className='text-xs mt-1 text-orange-300 font-medium'>
                              Fills entire canvas
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Background asset indicator */}
                      {asset.category === "backgrounds" && (
                        <div className='absolute top-1 left-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded text-[10px] font-medium'>
                          BG
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Desktop Asset Palette */}
      {!isMobile && (
        <div
          className='border-r bg-card flex flex-col flex-shrink-0'
          style={{
            width:
              viewportWidth >= 1280
                ? "288px"
                : viewportWidth >= 1024
                  ? "256px"
                  : "224px",
          }}
        >
          <CardHeader>
            <CardTitle className='text-lg'>Asset Kit</CardTitle>
            <p className='text-sm text-muted-foreground'>{campaignTitle}</p>
          </CardHeader>

          <div className='px-6 mb-4'>
            <div className='flex flex-wrap gap-1'>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? "default" : "outline"
                  }
                  size='sm'
                  onClick={() => setSelectedCategory(category.id)}
                  className='text-xs'
                >
                  <category.icon className='mr-1 h-3 w-3' />
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          <CardContent
            ref={assetContainerRef}
            className='flex-1 overflow-y-auto'
            onScroll={e => {
              const target = e.target as HTMLDivElement
              setAssetScrollTop(target.scrollTop)
            }}
          >
            <div
              className='grid grid-cols-2 gap-3'
              style={{
                minHeight:
                  filteredAssets.length > 20
                    ? `${Math.ceil(filteredAssets.length / 2) * 120}px`
                    : "auto",
              }}
            >
              {(filteredAssets.length > 20
                ? visibleAssets
                : filteredAssets
              ).map((asset, index) => (
                <div
                  key={asset.id}
                  className='asset-palette-item group relative aspect-square overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all'
                  onClick={() => {
                    // Add asset to canvas
                    const canvasWidth = 800
                    const canvasHeight = 600

                    const isBackgroundAsset = asset.category === "backgrounds"

                    const newElement: CanvasElement = isBackgroundAsset
                      ? {
                          // Background asset: fill entire canvas edge-to-edge
                          id: generateId(),
                          type: "asset",
                          assetId: asset.id,
                          x: 0,
                          y: 0,
                          width: 800, // Always use full canvas width
                          height: 600, // Always use full canvas height
                          rotation: 0,
                          zIndex: -elements.length - 1, // Always bottom layer
                          isBackground: true,
                          locked: true, // Prevent moving/resizing
                          flipHorizontal: false,
                          flipVertical: false,
                        }
                      : {
                          // Regular asset: add to center
                          id: generateId(),
                          type: "asset",
                          assetId: asset.id,
                          x: (canvasWidth - 100) / 2, // Center horizontally
                          y: (canvasHeight - 100) / 2, // Center vertically
                          width: 100,
                          height: 100,
                          rotation: 0,
                          zIndex: elements.length,
                        }

                    setElements(prev => [...prev, newElement])
                    setSelectedElement(newElement.id)
                    recordAction(createCreateAction(newElement))
                  }}
                >
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.filename}
                    className='w-full h-full object-cover rounded'
                    loading='lazy'
                    onError={e => {
                      // Fallback to full URL if thumbnail fails
                      const target = e.target as HTMLImageElement
                      if (target.src !== asset.url) {
                        target.src = asset.url
                      }
                    }}
                  />
                  <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center'>
                    <div className='text-white text-center px-2'>
                      <p className='text-xs font-medium truncate'>
                        {asset.filename}
                      </p>
                      <Badge variant='secondary' className='mt-1 text-xs'>
                        {asset.category}
                      </Badge>
                      {asset.category === "backgrounds" ? (
                        <p className='text-xs mt-1 text-orange-300 font-medium'>
                          Fills entire canvas
                        </p>
                      ) : (
                        <p className='text-xs mt-1 opacity-75'>Click to add</p>
                      )}
                    </div>
                  </div>
                  {/* Background asset indicator */}
                  {asset.category === "backgrounds" && (
                    <div className='absolute top-1 left-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded text-[10px] font-medium'>
                      BG
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredAssets.length === 0 && (
              <div className='text-center py-8 text-muted-foreground'>
                <Palette className='mx-auto h-8 w-8 mb-2' />
                <p className='text-sm'>No assets in this category</p>
              </div>
            )}
          </CardContent>
        </div>
      )}

      {/* Canvas Area - Responsive Layout */}
      <div className='flex-1 flex flex-col bg-muted/30 min-h-0 min-w-0'>
        {/* Canvas Toolbar */}
        <div className='border-b bg-card px-4 py-3 flex items-center justify-between min-w-0'>
          <div className='flex items-center gap-2 min-w-0 flex-1 overflow-hidden'>
            {/* Mobile: Show assets toggle */}
            {isMobile && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setIsAssetPanelOpen(!isAssetPanelOpen)}
              >
                <Palette className='h-4 w-4 mr-1' />
                Assets
              </Button>
            )}

            {/* Desktop controls */}
            {!isMobile && (
              <>
                <Button
                  variant={isPanning ? "default" : "outline"}
                  size='sm'
                  onMouseDown={handleMouseDown}
                  title='Pan'
                >
                  <Move className='h-4 w-4 mr-1' />
                </Button>
                <div className='border-l h-6 mx-2 hidden lg:block' />
              </>
            )}

            <Button
              variant='outline'
              size='sm'
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              disabled={zoom <= 0.25}
            >
              <ZoomOut className='h-4 w-4' />
            </Button>
            <span className='text-sm font-medium min-w-[3rem] text-center'>
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              disabled={zoom >= 2}
            >
              <ZoomIn className='h-4 w-4' />
            </Button>

            <div className='border-l h-6 mx-2 hidden lg:block' />

            <Button
              variant='outline'
              size='sm'
              onClick={addTextElement}
              title='Add text'
            >
              <Type className='h-4 w-4' />
            </Button>

            <div className='border-l h-6 mx-2 hidden lg:block' />

            {/* Undo/Redo */}
            <Button
              variant='outline'
              size='sm'
              onClick={handleUndo}
              disabled={!canUndo(actionHistory)}
              title='Undo (Ctrl+Z)'
            >
              <Undo2 className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRedo}
              disabled={!canRedo(actionHistory)}
              title='Redo (Ctrl+Y)'
            >
              <Redo2 className='h-4 w-4' />
            </Button>

            {!isMobile && (
              <Button
                variant='outline'
                size='sm'
                onClick={resetCanvas}
                title='Reset canvas'
                className='hidden xl:flex'
              >
                Reset
              </Button>
            )}
          </div>

          <div className='flex items-center gap-2 flex-shrink-0'>
            {/* Project Management */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsProjectManagerOpen(true)}
              title='Open Project Manager'
            >
              <FolderOpen className='h-4 w-4 mr-1' />
              <span className='hidden xl:inline'>Projects</span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={handleNewProject}
              title={
                hasUnsavedChanges
                  ? "Create new project (will prompt to save changes)"
                  : "Create new project"
              }
              className='hidden lg:flex'
            >
              New
            </Button>

            <div className='border-l h-6 mx-2' />

            {!isMobile && (
              <Button
                variant='outline'
                size='sm'
                onClick={saveToLocalStorage}
                disabled={isAutoSaving}
                className='hidden lg:flex'
                title={`Manual save${lastSaveTime ? ` (last: ${lastSaveTime.toLocaleTimeString()})` : ""}. Auto-saves every 10s after changes, minimum 10s apart.`}
              >
                <Save
                  className={`h-4 w-4 mr-1 ${isAutoSaving ? "animate-spin" : ""}`}
                />
                <span className='hidden xl:inline'>
                  {isAutoSaving ? "Saving..." : "Save"}
                </span>
                {hasUnsavedChanges ? (
                  <div className='w-2 h-2 bg-orange-500 rounded-full ml-1' />
                ) : (
                  elements.length > 0 &&
                  lastSaveTime && (
                    <div className='w-2 h-2 bg-green-500 rounded-full ml-1' />
                  )
                )}
              </Button>
            )}

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={elements.length === 0 || isExporting}
                  title={
                    isExporting
                      ? exportProgress
                        ? `${exportProgress.message} (${exportProgress.progress}%)`
                        : "Exporting..."
                      : "Export canvas as image"
                  }
                >
                  <Download
                    className={`h-4 w-4 mr-1 ${isExporting ? "animate-pulse" : ""}`}
                  />
                  <span className='hidden lg:inline'>
                    {isExporting
                      ? exportProgress
                        ? `${exportProgress.progress}%`
                        : "Exporting..."
                      : "Export"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  onClick={() => handleExport("png")}
                  disabled={isExporting}
                  className='flex items-center gap-2'
                >
                  <Download className='h-4 w-4' />
                  Export as PNG (High Quality)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("jpeg")}
                  disabled={isExporting}
                  className='flex items-center gap-2'
                >
                  <Download className='h-4 w-4' />
                  Export as JPEG (Smaller Size)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className='border-l h-6 mx-2' />

            <Button
              size='sm'
              onClick={handleSave}
              disabled={elements.length === 0}
            >
              <Download className='h-4 w-4 mr-1' />
              {isMobile ? "Done" : "Submit"}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className={`flex-1 overflow-auto ${isMobile ? "p-2 pb-20" : "p-2"}`}
        >
          <div
            ref={canvasContainerRef}
            className='relative w-full h-full flex items-center justify-center min-h-0'
          >
            <div
              ref={canvasRef}
              className='relative bg-white overflow-hidden'
              style={(() => {
                if (isMobile) {
                  // Use full available width minus minimal padding for mobile
                  const availableWidth = viewportWidth - 8 // Minimal padding (p-1 = 4px * 2)
                  const canvasWidth = Math.min(800, availableWidth)
                  return {
                    width: `${canvasWidth}px`,
                    height: `${canvasWidth * 0.75}px`, // Maintain 4:3 aspect ratio
                    transform: "none",
                    transformOrigin: "center",
                    minWidth: "300px",
                    maxWidth: "100%",
                  }
                } else {
                  // Desktop: Calculate available space and scale canvas accordingly
                  const windowHeight =
                    typeof window !== "undefined" ? window.innerHeight : 800

                  // Calculate panel widths based on viewport size with max-width constraint
                  let panelWidth = 224 // w-56 (base)
                  if (viewportWidth >= 1024) panelWidth = 256 // lg:w-64
                  if (viewportWidth >= 1280) panelWidth = 288 // xl:w-72

                  // Cap at max-w-72 (288px)
                  panelWidth = Math.min(panelWidth, 288)

                  const totalPanelWidth = panelWidth * 2 // Both side panels
                  const padding = 64 // Canvas area padding

                  const availableWidth = Math.max(
                    400,
                    viewportWidth - totalPanelWidth - padding
                  )
                  const availableHeight = Math.max(300, windowHeight - 200) // Subtract toolbar and padding

                  const scaleX = availableWidth / 800
                  const scaleY = availableHeight / 600
                  const autoScale = Math.min(scaleX, scaleY, 1.0) // Keep at 100% max for better fit

                  const finalScale = zoom * autoScale

                  return {
                    width: "800px",
                    height: "600px",
                    transform: `scale(${finalScale})`,
                    transformOrigin: "center",
                  }
                }
              })()}
              onClick={() => {
                if (!preventNextCanvasClick) {
                  setSelectedElement(null)
                }
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {elements.length === 0 && (
                <div className='absolute inset-0 flex items-center justify-center text-muted-foreground'>
                  <div className='text-center p-4'>
                    <Palette className='mx-auto h-8 w-8 sm:h-12 sm:w-12 mb-2 sm:mb-4' />
                    <h3 className='font-medium mb-1 sm:mb-2 text-sm sm:text-base'>
                      Start Creating
                    </h3>
                    <p className='text-xs sm:text-sm'>
                      Click assets from the palette to add them to your canvas
                    </p>
                    {!isMobile && (
                      <p className='text-xs mt-2 opacity-70'>
                        Ctrl+Scroll to zoom • Middle-click to pan
                      </p>
                    )}
                  </div>
                </div>
              )}

              {elements.map(element => {
                if (element.type === "asset") {
                  const asset = assets.find(a => a.id === element.assetId)
                  if (!asset) return null

                  return (
                    <div key={element.id} className='relative'>
                      {/* Main element */}
                      <div
                        className={`canvas-element absolute ${
                          selectedElement === element.id ? "selected" : ""
                        } ${elementDrag?.elementId === element.id ? "cursor-grabbing" : isTouchDevice ? "cursor-pointer" : "cursor-grab"}`}
                        style={{
                          left: element.x,
                          top: element.y,
                          width: element.width,
                          height: element.height,
                          transform: getElementTransform(element),
                          zIndex: element.zIndex,
                          opacity: element.opacity || 1,
                        }}
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedElement(element.id)
                        }}
                        onMouseDown={e => handleElementMouseDown(e, element.id)}
                        onMouseEnter={() => {
                          if (selectedElement !== element.id) {
                            setHoveredElement(element.id)
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredElement(null)
                        }}
                        onTouchStart={e => handleTouchStart(e, element.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className={`w-full h-full pointer-events-none ${
                            element.isBackground
                              ? "object-cover object-center"
                              : "object-cover"
                          }`}
                          style={
                            element.isBackground
                              ? {
                                  // Ensure background images completely fill the canvas
                                  minWidth: "100%",
                                  minHeight: "100%",
                                  objectFit: "cover",
                                  objectPosition: "center",
                                }
                              : undefined
                          }
                          draggable={false}
                        />
                      </div>

                      {/* Hover bounding box for non-selected elements */}
                      {hoveredElement === element.id &&
                        selectedElement !== element.id && (
                          <HoverBoundingBox element={element} zoom={zoom} />
                        )}

                      {/* Enhanced selection box for selected elements */}
                      {selectedElement === element.id && (
                        <div
                          className='absolute pointer-events-none'
                          style={{
                            left: element.x,
                            top: element.y,
                            width: element.width,
                            height: element.height,
                            // Background elements: don't inherit transforms for UI elements
                            transform: element.isBackground
                              ? "none"
                              : getElementTransform(element),
                            zIndex: element.zIndex + 1000,
                          }}
                        >
                          <EnhancedSelectionBox
                            element={element}
                            onResizeMouseDown={handleResizeMouseDown}
                            onRotationMouseDown={handleRotationMouseDown}
                            onFlipHorizontal={handleFlipHorizontal}
                            onFlipVertical={handleFlipVertical}
                            isTouchDevice={isTouchDevice}
                          />
                        </div>
                      )}
                    </div>
                  )
                } else if (element.type === "text") {
                  return (
                    <div key={element.id} className='relative'>
                      {/* Main element */}
                      <div
                        className={`canvas-element absolute ${
                          selectedElement === element.id ? "selected" : ""
                        } ${elementDrag?.elementId === element.id ? "cursor-grabbing" : isTouchDevice ? "cursor-pointer" : "cursor-grab"}`}
                        style={{
                          left: element.x,
                          top: element.y,
                          width: element.width,
                          height: element.height,
                          transform: getElementTransform(element),
                          zIndex: element.zIndex,
                          opacity: element.opacity || 1,
                        }}
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedElement(element.id)
                        }}
                        onDoubleClick={() => handleTextDoubleClick(element.id)}
                        onMouseDown={e => handleElementMouseDown(e, element.id)}
                        onMouseEnter={() => {
                          if (selectedElement !== element.id) {
                            setHoveredElement(element.id)
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredElement(null)
                        }}
                        onTouchStart={e => handleTouchStart(e, element.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        {editingTextId === element.id ? (
                          // Inline text editing
                          <div className='w-full h-full flex items-center justify-center'>
                            <textarea
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              onBlur={handleTextSave}
                              autoFocus
                              className='w-full h-full resize-none border-none outline-none bg-transparent text-center pointer-events-auto'
                              style={{
                                fontSize: element.fontSize || 24,
                                fontFamily:
                                  element.fontFamily || "Arial, sans-serif",
                                fontWeight: element.fontWeight || "normal",
                                fontStyle: element.fontStyle || "normal",
                                textAlign: element.textAlign || "center",
                                color: element.color || "#000000",
                                padding: "4px",
                              }}
                              onClick={e => e.stopPropagation()}
                              onMouseDown={e => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          // Display text
                          <div
                            className='w-full h-full flex items-center justify-center pointer-events-none'
                            style={{
                              fontSize: element.fontSize || 24,
                              fontFamily:
                                element.fontFamily || "Arial, sans-serif",
                              fontWeight: element.fontWeight || "normal",
                              fontStyle: element.fontStyle || "normal",
                              textAlign: element.textAlign || "center",
                              color: element.color || "#000000",
                              backgroundColor:
                                element.backgroundColor || "transparent",
                              padding: "4px",
                              borderRadius: "4px",
                            }}
                          >
                            {element.text || "Double-click to edit"}
                          </div>
                        )}
                      </div>

                      {/* Hover bounding box for non-selected elements */}
                      {hoveredElement === element.id &&
                        selectedElement !== element.id && (
                          <HoverBoundingBox element={element} zoom={zoom} />
                        )}

                      {/* Enhanced selection box for selected elements */}
                      {selectedElement === element.id && (
                        <div
                          className='absolute pointer-events-none'
                          style={{
                            left: element.x,
                            top: element.y,
                            width: element.width,
                            height: element.height,
                            // Background elements: don't inherit transforms for UI elements
                            transform: element.isBackground
                              ? "none"
                              : getElementTransform(element),
                            zIndex: element.zIndex + 1000,
                          }}
                        >
                          <EnhancedSelectionBox
                            element={element}
                            onResizeMouseDown={handleResizeMouseDown}
                            onRotationMouseDown={handleRotationMouseDown}
                            onFlipHorizontal={handleFlipHorizontal}
                            onFlipVertical={handleFlipVertical}
                            isTouchDevice={isTouchDevice}
                          />
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Element Toolbar - Don't show for background elements */}
      {selectedElementData &&
        canvasRef.current &&
        !isMobile &&
        !selectedElementData.isBackground && (
          <ElementToolbar
            element={selectedElementData}
            onRotate={() => rotateElement(selectedElementData.id)}
            onCopy={() => copyElement(selectedElementData.id)}
            onDelete={() => deleteElementWithHistory(selectedElementData.id)}
            onLayerUp={() => moveElementLayer(selectedElementData.id, "up")}
            onLayerDown={() => moveElementLayer(selectedElementData.id, "down")}
            onPosition={position =>
              handlePosition(selectedElementData.id, position)
            }
            canvasRef={canvasRef}
            zoom={zoom}
            panOffset={panOffset}
            canvasScale={canvasScale}
          />
        )}

      {/* Mobile Properties Persistent Bottom Panel */}
      {isMobile && (
        <div className='fixed inset-x-0 bottom-0 bg-card border-t shadow-lg z-40 flex flex-col'>
          {/* Always visible header */}
          <div
            className='flex items-center justify-between p-3 cursor-pointer border-b bg-card'
            onClick={() => setIsPropertiesPanelOpen(!isPropertiesPanelOpen)}
          >
            <div className='flex items-center gap-2'>
              <Settings className='h-4 w-4' />
              <span className='font-medium text-sm'>
                {selectedElementData
                  ? selectedElementData.type === "text"
                    ? "Edit Text"
                    : `Edit ${selectedAsset?.filename || "Element"}`
                  : "Properties"}
              </span>
              {selectedElementData && (
                <Badge variant='secondary' className='text-xs'>
                  {selectedElementData.type === "text"
                    ? "Text"
                    : selectedAsset?.category}
                </Badge>
              )}
            </div>
            <div className='flex items-center gap-2'>
              {/* Quick delete button when element is selected */}
              {selectedElementData && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={e => {
                    e.stopPropagation()
                    deleteElement(selectedElementData.id)
                  }}
                >
                  <Trash2 className='h-4 w-4 text-destructive' />
                </Button>
              )}
              <Button variant='ghost' size='sm'>
                {isPropertiesPanelOpen ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronUp className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>

          {/* Expandable content */}
          {isPropertiesPanelOpen && (
            <div className='p-4 space-y-4 bg-card max-h-[50vh] overflow-y-auto'>
              {selectedElementData ? (
                <>
                  {/* Quick Actions - Don't show for background elements */}
                  {!selectedElementData.isBackground && (
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          updateElement(selectedElementData.id, {
                            rotation: (selectedElementData.rotation + 90) % 360,
                          })
                        }
                        className='flex-1'
                      >
                        <RotateCw className='h-4 w-4 mr-1' />
                        Rotate
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          const canvasWidth = Math.min(800, viewportWidth - 8)
                          const canvasHeight = canvasWidth * 0.75
                          updateElement(selectedElementData.id, {
                            x: (canvasWidth - selectedElementData.width) / 2,
                            y: (canvasHeight - selectedElementData.height) / 2,
                          })
                        }}
                        className='flex-1'
                      >
                        Center
                      </Button>
                    </div>
                  )}

                  {/* Text-specific controls */}
                  {selectedElementData.type === "text" && (
                    <>
                      <div>
                        <label className='text-xs text-muted-foreground block mb-1'>
                          Text
                        </label>
                        <Textarea
                          value={selectedElementData.text || ""}
                          onChange={e =>
                            updateElement(selectedElementData.id, {
                              text: e.target.value,
                            })
                          }
                          className='h-20 text-sm resize-none'
                          placeholder='Enter your text...'
                        />
                      </div>

                      <div className='grid grid-cols-2 gap-2'>
                        <div>
                          <label className='text-xs text-muted-foreground block mb-1'>
                            Font Size
                          </label>
                          <Input
                            type='number'
                            value={selectedElementData.fontSize || 24}
                            onChange={e =>
                              updateElement(selectedElementData.id, {
                                fontSize: parseInt(e.target.value) || 12,
                              })
                            }
                            className='h-8 text-sm'
                            min='8'
                            max='120'
                          />
                        </div>
                        <div>
                          <label className='text-xs text-muted-foreground block mb-1'>
                            Color
                          </label>
                          <Input
                            type='color'
                            value={selectedElementData.color || "#000000"}
                            onChange={e =>
                              updateElement(selectedElementData.id, {
                                color: e.target.value,
                              })
                            }
                            className='h-8 text-sm'
                          />
                        </div>
                      </div>

                      <div className='flex gap-2'>
                        <Button
                          variant={
                            selectedElementData.fontWeight === "bold"
                              ? "default"
                              : "outline"
                          }
                          size='sm'
                          onClick={() =>
                            updateElement(selectedElementData.id, {
                              fontWeight:
                                selectedElementData.fontWeight === "bold"
                                  ? "normal"
                                  : "bold",
                            })
                          }
                          className='flex-1'
                        >
                          <Bold className='h-4 w-4 mr-1' />
                          Bold
                        </Button>
                        <Button
                          variant={
                            selectedElementData.fontStyle === "italic"
                              ? "default"
                              : "outline"
                          }
                          size='sm'
                          onClick={() =>
                            updateElement(selectedElementData.id, {
                              fontStyle:
                                selectedElementData.fontStyle === "italic"
                                  ? "normal"
                                  : "italic",
                            })
                          }
                          className='flex-1'
                        >
                          <Italic className='h-4 w-4 mr-1' />
                          Italic
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Size Controls */}
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <label className='text-xs text-muted-foreground block mb-1'>
                        Width
                      </label>
                      <Input
                        type='number'
                        value={selectedElementData.width}
                        onChange={e =>
                          updateElement(selectedElementData.id, {
                            width: parseInt(e.target.value) || 1,
                          })
                        }
                        className='h-8 text-sm'
                      />
                    </div>
                    <div>
                      <label className='text-xs text-muted-foreground block mb-1'>
                        Height
                      </label>
                      <Input
                        type='number'
                        value={selectedElementData.height}
                        onChange={e =>
                          updateElement(selectedElementData.id, {
                            height: parseInt(e.target.value) || 1,
                          })
                        }
                        className='h-8 text-sm'
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className='text-sm text-muted-foreground text-center py-4'>
                  Select an element to edit its properties
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop Properties Panel */}
      {!isMobile && (
        <div
          className='border-l bg-card flex flex-col flex-shrink-0'
          style={{
            width:
              viewportWidth >= 1280
                ? "288px"
                : viewportWidth >= 1024
                  ? "256px"
                  : "224px",
          }}
        >
          <CardHeader>
            <CardTitle className='text-lg flex items-center'>
              <Layers className='mr-2 h-5 w-5' />
              Properties
            </CardTitle>
          </CardHeader>

          <CardContent className='flex-1 space-y-6'>
            {selectedElementData ? (
              <>
                {/* Element Info */}
                <div>
                  <h3 className='font-medium mb-2'>Selected Element</h3>
                  {selectedElementData.type === "text" ? (
                    <>
                      <p className='text-sm text-muted-foreground mb-2'>
                        {selectedElementData.text || "Empty text element"}
                      </p>
                      <Badge variant='outline'>Text</Badge>
                    </>
                  ) : (
                    <>
                      <p className='text-sm text-muted-foreground mb-2'>
                        {selectedAsset?.filename}
                      </p>
                      <Badge variant='outline'>{selectedAsset?.category}</Badge>
                    </>
                  )}
                </div>

                {/* Position - Don't show for background elements */}
                {!selectedElementData.isBackground && (
                  <div className='space-y-3'>
                    <h4 className='font-medium'>Position & Size</h4>
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <label className='text-xs text-muted-foreground'>
                          X
                        </label>
                        <Input
                          type='number'
                          value={Math.round(selectedElementData.x)}
                          onChange={e =>
                            updateElement(selectedElementData.id, {
                              x: parseInt(e.target.value) || 0,
                            })
                          }
                          className='h-8'
                        />
                      </div>
                      <div>
                        <label className='text-xs text-muted-foreground'>
                          Y
                        </label>
                        <Input
                          type='number'
                          value={Math.round(selectedElementData.y)}
                          onChange={e =>
                            updateElement(selectedElementData.id, {
                              y: parseInt(e.target.value) || 0,
                            })
                          }
                          className='h-8'
                        />
                      </div>
                      <div>
                        <label className='text-xs text-muted-foreground'>
                          Width
                        </label>
                        <Input
                          type='number'
                          value={selectedElementData.width}
                          onChange={e =>
                            updateElement(selectedElementData.id, {
                              width: parseInt(e.target.value) || 1,
                            })
                          }
                          className='h-8'
                        />
                      </div>
                      <div>
                        <label className='text-xs text-muted-foreground'>
                          Height
                        </label>
                        <Input
                          type='number'
                          value={selectedElementData.height}
                          onChange={e =>
                            updateElement(selectedElementData.id, {
                              height: parseInt(e.target.value) || 1,
                            })
                          }
                          className='h-8'
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Rotation */}
                <div className='space-y-2'>
                  <h4 className='font-medium'>Rotation</h4>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='number'
                      value={selectedElementData.rotation}
                      onChange={e =>
                        updateElement(selectedElementData.id, {
                          rotation: parseInt(e.target.value) || 0,
                        })
                      }
                      className='h-8'
                    />
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        updateElement(selectedElementData.id, {
                          rotation: (selectedElementData.rotation + 90) % 360,
                        })
                      }
                    >
                      <RotateCw className='h-4 w-4' />
                    </Button>
                  </div>
                </div>

                {/* Text Controls - only show for text elements */}
                {selectedElementData.type === "text" && (
                  <div className='space-y-3'>
                    <h4 className='font-medium'>Text Properties</h4>

                    {/* Text Content */}
                    <div>
                      <label className='text-xs text-muted-foreground block mb-1'>
                        Text Content
                      </label>
                      <Textarea
                        value={selectedElementData.text || ""}
                        onChange={e =>
                          updateElement(selectedElementData.id, {
                            text: e.target.value,
                          })
                        }
                        className='h-20 text-sm resize-none'
                        placeholder='Enter your text...'
                      />
                    </div>

                    {/* Font Size and Color */}
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <label className='text-xs text-muted-foreground block mb-1'>
                          Font Size
                        </label>
                        <Input
                          type='number'
                          value={selectedElementData.fontSize || 24}
                          onChange={e =>
                            updateElement(selectedElementData.id, {
                              fontSize: parseInt(e.target.value) || 12,
                            })
                          }
                          className='h-8'
                          min='8'
                          max='120'
                        />
                      </div>
                      <div>
                        <label className='text-xs text-muted-foreground block mb-1'>
                          Color
                        </label>
                        <Input
                          type='color'
                          value={selectedElementData.color || "#000000"}
                          onChange={e =>
                            updateElement(selectedElementData.id, {
                              color: e.target.value,
                            })
                          }
                          className='h-8'
                        />
                      </div>
                    </div>

                    {/* Font Style Controls */}
                    <div className='grid grid-cols-2 gap-2'>
                      <Button
                        variant={
                          selectedElementData.fontWeight === "bold"
                            ? "default"
                            : "outline"
                        }
                        size='sm'
                        onClick={() =>
                          updateElement(selectedElementData.id, {
                            fontWeight:
                              selectedElementData.fontWeight === "bold"
                                ? "normal"
                                : "bold",
                          })
                        }
                        className='flex items-center justify-center'
                      >
                        <Bold className='h-4 w-4 mr-1' />
                        Bold
                      </Button>
                      <Button
                        variant={
                          selectedElementData.fontStyle === "italic"
                            ? "default"
                            : "outline"
                        }
                        size='sm'
                        onClick={() =>
                          updateElement(selectedElementData.id, {
                            fontStyle:
                              selectedElementData.fontStyle === "italic"
                                ? "normal"
                                : "italic",
                          })
                        }
                        className='flex items-center justify-center'
                      >
                        <Italic className='h-4 w-4 mr-1' />
                        Italic
                      </Button>
                    </div>

                    {/* Text Alignment */}
                    <div>
                      <label className='text-xs text-muted-foreground block mb-1'>
                        Text Alignment
                      </label>
                      <div className='grid grid-cols-3 gap-1'>
                        <Button
                          variant={
                            selectedElementData.textAlign === "left"
                              ? "default"
                              : "outline"
                          }
                          size='sm'
                          onClick={() =>
                            updateElement(selectedElementData.id, {
                              textAlign: "left",
                            })
                          }
                          className='flex items-center justify-center'
                        >
                          <AlignLeft className='h-4 w-4' />
                        </Button>
                        <Button
                          variant={
                            selectedElementData.textAlign === "center" ||
                            !selectedElementData.textAlign
                              ? "default"
                              : "outline"
                          }
                          size='sm'
                          onClick={() =>
                            updateElement(selectedElementData.id, {
                              textAlign: "center",
                            })
                          }
                          className='flex items-center justify-center'
                        >
                          <AlignCenter className='h-4 w-4' />
                        </Button>
                        <Button
                          variant={
                            selectedElementData.textAlign === "right"
                              ? "default"
                              : "outline"
                          }
                          size='sm'
                          onClick={() =>
                            updateElement(selectedElementData.id, {
                              textAlign: "right",
                            })
                          }
                          className='flex items-center justify-center'
                        >
                          <AlignRight className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className='space-y-2'>
                  <h4 className='font-medium'>Actions</h4>
                  <Button
                    variant='destructive'
                    size='sm'
                    className='w-full'
                    onClick={() => deleteElement(selectedElementData.id)}
                  >
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete Element
                  </Button>
                </div>
              </>
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                <Layers className='mx-auto h-8 w-8 mb-2' />
                <p className='text-sm'>Select an element to edit properties</p>
              </div>
            )}

            {/* Layer Management */}
            <div className='space-y-2'>
              <h4 className='font-medium'>Layers ({elements.length})</h4>
              <div className='space-y-1 max-h-40 overflow-y-auto'>
                {elements
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map(element => {
                    const asset = assets.find(a => a.id === element.assetId)
                    return (
                      <div
                        key={element.id}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          selectedElement === element.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        }`}
                        onClick={() => setSelectedElement(element.id)}
                      >
                        <div className='flex items-center justify-between'>
                          <span className='text-sm truncate'>
                            {asset?.filename || "Unknown"}
                          </span>
                          <Badge variant='outline' className='text-xs'>
                            {element.zIndex}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </CardContent>
        </div>
      )}

      {/* Project Manager Dialog */}
      <ProjectManager
        isOpen={isProjectManagerOpen}
        onOpenChange={setIsProjectManagerOpen}
        onLoadProject={handleLoadProject}
        currentProjectId={currentProjectId || undefined}
      />

      {/* Submission Modal */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        campaignId={campaignId}
        campaignTitle={campaignTitle}
        canvasElements={elements}
        assets={assets}
        ipKitId={ipKitId}
        onSubmissionSuccess={submissionId => {
          console.log("Submission successful:", submissionId)
          onSave(elements) // Call the original onSave callback
        }}
      />
    </div>
  )
}
