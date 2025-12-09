import { CanvasElement } from "@/types"

// Types for local storage
export interface CanvasProject {
  id: string
  title: string
  campaignId?: string
  campaignTitle?: string
  elements: CanvasElement[]
  canvasSize: { width: number; height: number }
  version: string
  createdAt: Date
  updatedAt: Date
  thumbnail?: string
}

export interface StorageStats {
  used: number
  available: number
  projectCount: number
}

// Constants
const STORAGE_PREFIX = 'fanforge_canvas_'
const PROJECT_LIST_KEY = 'fanforge_canvas_projects'
const MAX_PROJECTS = 50
const STORAGE_QUOTA_MB = 50 // 50MB limit for canvas projects

/**
 * Generate a unique project ID
 */
export function generateProjectId(): string {
  return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): StorageStats {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { used: 0, available: STORAGE_QUOTA_MB, projectCount: 0 }
    }
    
    let totalSize = 0
    const projectCount = getProjectList().length
    
    // Calculate used storage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += new Blob([value]).size
        }
      }
    }
    
    const usedMB = totalSize / (1024 * 1024)
    const availableMB = STORAGE_QUOTA_MB - usedMB
    
    return {
      used: usedMB,
      available: Math.max(0, availableMB),
      projectCount
    }
  } catch (error) {
    console.error('Error calculating storage stats:', error)
    return { used: 0, available: STORAGE_QUOTA_MB, projectCount: 0 }
  }
}

/**
 * Check if we have enough storage space
 */
export function hasStorageSpace(estimatedSizeMB: number = 1): boolean {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    const stats = getStorageStats()
    return stats.available >= estimatedSizeMB
  } catch (error) {
    console.error('Error checking storage space:', error)
    return false
  }
}

/**
 * Get list of all saved projects
 */
export function getProjectList(): CanvasProject[] {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return []
    }
    
    const projectsJson = localStorage.getItem(PROJECT_LIST_KEY)
    if (!projectsJson) return []
    
    const projects = JSON.parse(projectsJson) as CanvasProject[]
    return projects.map(project => ({
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt)
    }))
  } catch (error) {
    console.error('Error loading project list:', error)
    return []
  }
}

/**
 * Save project list to localStorage
 */
function saveProjectList(projects: CanvasProject[]): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      throw new Error('localStorage not available')
    }
    localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(projects))
  } catch (error) {
    console.error('Error saving project list:', error)
    throw new Error('Failed to save project list')
  }
}

/**
 * Generate thumbnail for project (simplified base64 representation)
 */
export function generateThumbnail(elements: CanvasElement[]): string {
  // Simple thumbnail: JSON representation of first few elements
  const thumbnailData = elements.slice(0, 5).map(el => ({
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    text: el.text?.substring(0, 20)
  }))
  
  return btoa(JSON.stringify(thumbnailData))
}

/**
 * Save a canvas project to localStorage
 */
export function saveProject(project: Omit<CanvasProject, 'updatedAt' | 'thumbnail'>): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.warn('localStorage not available, skipping local save')
      return
    }
    
    // Check storage space
    if (!hasStorageSpace(2)) {
      // Try to clean up old projects if we're running out of space
      cleanupOldProjects()
      
      if (!hasStorageSpace(2)) {
        throw new Error('Not enough storage space. Please delete some old projects.')
      }
    }
    
    const now = new Date()
    const updatedProject: CanvasProject = {
      ...project,
      updatedAt: now,
      thumbnail: generateThumbnail(project.elements)
    }
    
    // Save project data
    const projectKey = `${STORAGE_PREFIX}${project.id}`
    localStorage.setItem(projectKey, JSON.stringify(updatedProject))
    
    // Update project list
    const projects = getProjectList()
    const existingIndex = projects.findIndex(p => p.id === project.id)
    
    if (existingIndex >= 0) {
      projects[existingIndex] = updatedProject
    } else {
      projects.push(updatedProject)
    }
    
    // Sort by updated date (most recent first)
    projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    
    saveProjectList(projects)
    
    console.log(`Project ${project.id} saved to localStorage`)
  } catch (error) {
    console.error('Error saving project:', error)
    throw error
  }
}

/**
 * Load a specific project from localStorage
 */
export function loadProject(projectId: string): CanvasProject | null {
  try {
    const projectKey = `${STORAGE_PREFIX}${projectId}`
    const projectJson = localStorage.getItem(projectKey)
    
    if (!projectJson) return null
    
    const project = JSON.parse(projectJson) as CanvasProject
    return {
      ...project,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt)
    }
  } catch (error) {
    console.error('Error loading project:', error)
    return null
  }
}

/**
 * Delete a project from localStorage
 */
export function deleteProject(projectId: string): void {
  try {
    // Remove project data
    const projectKey = `${STORAGE_PREFIX}${projectId}`
    localStorage.removeItem(projectKey)
    
    // Update project list
    const projects = getProjectList()
    const filteredProjects = projects.filter(p => p.id !== projectId)
    saveProjectList(filteredProjects)
    
    console.log(`Project ${projectId} deleted from localStorage`)
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}

/**
 * Clean up old projects to free storage space
 */
export function cleanupOldProjects(): void {
  try {
    const projects = getProjectList()
    
    if (projects.length <= MAX_PROJECTS) return
    
    // Sort by last updated and keep only the most recent projects
    projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    const projectsToKeep = projects.slice(0, MAX_PROJECTS)
    const projectsToDelete = projects.slice(MAX_PROJECTS)
    
    // Delete old projects
    projectsToDelete.forEach(project => {
      const projectKey = `${STORAGE_PREFIX}${project.id}`
      localStorage.removeItem(projectKey)
    })
    
    // Update project list
    saveProjectList(projectsToKeep)
    
    console.log(`Cleaned up ${projectsToDelete.length} old projects`)
  } catch (error) {
    console.error('Error cleaning up projects:', error)
  }
}

/**
 * Clear all canvas projects from localStorage
 */
export function clearAllProjects(): void {
  try {
    const projects = getProjectList()
    
    // Remove all project data
    projects.forEach(project => {
      const projectKey = `${STORAGE_PREFIX}${project.id}`
      localStorage.removeItem(projectKey)
    })
    
    // Clear project list
    localStorage.removeItem(PROJECT_LIST_KEY)
    
    console.log('All canvas projects cleared from localStorage')
  } catch (error) {
    console.error('Error clearing projects:', error)
    throw error
  }
}

/**
 * Check for storage conflicts (same project edited in multiple tabs)
 */
export function checkForConflicts(projectId: string, lastKnownUpdate: Date): boolean {
  try {
    const project = loadProject(projectId)
    if (!project) return false
    
    return project.updatedAt.getTime() > lastKnownUpdate.getTime()
  } catch (error) {
    console.error('Error checking for conflicts:', error)
    return false
  }
}

/**
 * Export project as JSON for sharing/backup
 */
export function exportProject(projectId: string): string | null {
  try {
    const project = loadProject(projectId)
    if (!project) return null
    
    return JSON.stringify(project, null, 2)
  } catch (error) {
    console.error('Error exporting project:', error)
    return null
  }
}

/**
 * Import project from JSON
 */
export function importProject(projectJson: string): CanvasProject {
  try {
    const project = JSON.parse(projectJson) as CanvasProject
    
    // Generate new ID to avoid conflicts
    const importedProject: CanvasProject = {
      ...project,
      id: generateProjectId(),
      title: `${project.title} (Imported)`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    saveProject(importedProject)
    return importedProject
  } catch (error) {
    console.error('Error importing project:', error)
    throw new Error('Failed to import project. Please check the file format.')
  }
}