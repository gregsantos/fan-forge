"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  CanvasProject,
  getProjectList,
  deleteProject,
  getStorageStats,
  clearAllProjects,
  exportProject,
  importProject
} from "@/lib/canvas-storage"
import {
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Search,
  Calendar,
  HardDrive,
  AlertCircle,
  FileText
} from "lucide-react"

interface ProjectManagerProps {
  onLoadProject: (project: CanvasProject) => void
  currentProjectId?: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectManager({
  onLoadProject,
  currentProjectId,
  isOpen,
  onOpenChange
}: ProjectManagerProps) {
  const [projects, setProjects] = useState<CanvasProject[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [storageStats, setStorageStats] = useState({ used: 0, available: 50, projectCount: 0 })
  const [isLoading, setIsLoading] = useState(false)

  // Load projects and update storage stats
  const refreshProjects = () => {
    setProjects(getProjectList())
    setStorageStats(getStorageStats())
  }

  useEffect(() => {
    if (isOpen) {
      refreshProjects()
    }
  }, [isOpen])

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.campaignTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteProject = async (projectId: string) => {
    try {
      setIsLoading(true)
      deleteProject(projectId)
      refreshProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportProject = (projectId: string) => {
    try {
      const exportData = exportProject(projectId)
      if (!exportData) {
        alert('Failed to export project')
        return
      }

      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fanforge-project-${projectId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting project:', error)
      alert('Failed to export project')
    }
  }

  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedProject = importProject(content)
        refreshProjects()
        onLoadProject(importedProject)
        onOpenChange(false)
      } catch (error) {
        console.error('Error importing project:', error)
        alert('Failed to import project. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }

  const handleClearAllProjects = async () => {
    try {
      setIsLoading(true)
      clearAllProjects()
      refreshProjects()
    } catch (error) {
      console.error('Error clearing projects:', error)
      alert('Failed to clear projects')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getStorageColor = () => {
    const usagePercent = (storageStats.used / (storageStats.used + storageStats.available)) * 100
    if (usagePercent > 80) return 'text-red-500'
    if (usagePercent > 60) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Project Manager
          </DialogTitle>
          <DialogDescription>
            Manage your saved canvas projects. Projects are automatically saved to your browser&apos;s local storage.
          </DialogDescription>
        </DialogHeader>

        {/* Storage Stats */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30">
          <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            <span className="text-sm">
              Storage: <span className={getStorageColor()}>
                {storageStats.used.toFixed(1)}MB used
              </span> of 50MB
            </span>
          </div>
          <Badge className="bg-gradient-to-br from-gradient-blue/20 to-gradient-purple/20 text-gradient-blue border-gradient-blue/30" variant="outline">
            {storageStats.projectCount} projects
          </Badge>
          </CardContent>
        </Card>

        {/* Search and Actions */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Import Project */}
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportProject}
              className="hidden"
              id="import-project-input"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const input = document.getElementById('import-project-input') as HTMLInputElement
                input?.click()
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>

          {/* Clear All Projects */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={projects.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Projects</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all saved projects from your local storage. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllProjects} className="bg-destructive text-destructive-foreground">
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? (
                <>
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No projects found matching &quot;{searchTerm}&quot;</p>
                </>
              ) : (
                <>
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No saved projects yet</p>
                  <p className="text-sm">Your projects will appear here as you save them</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] border-0 bg-gradient-to-br from-card via-card to-muted/30 backdrop-blur-sm ${
                    currentProjectId === project.id ? 'ring-2 ring-gradient-purple shadow-lg scale-[1.02]' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => {
                          onLoadProject(project)
                          onOpenChange(false)
                        }}
                      >
                        <h3 className="font-medium truncate">{project.title}</h3>
                        {project.campaignTitle && (
                          <p className="text-sm text-muted-foreground truncate">
                            Campaign: {project.campaignTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(project.updatedAt)}
                          </span>
                          <Badge className="bg-gradient-to-br from-gradient-pink/20 to-gradient-purple/20 text-gradient-pink border-gradient-pink/30 text-xs" variant="outline">
                            {project.elements.length} elements
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExportProject(project.id)
                          }}
                          title="Export project"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{project.title}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteProject(project.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Storage Warning */}
        {storageStats.available < 5 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              Low storage space remaining. Consider deleting old projects.
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}