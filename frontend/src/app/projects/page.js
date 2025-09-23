"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Plus, ArrowLeft, CheckCircle2, Clock, AlertCircle, User, LogOut } from "lucide-react"
import AuthGuard from "@/src/components/auth-guard"
import api from "@/src/lib/api"
import { removeToken, getUserFromToken } from "@/src/lib/auth"

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  "in-progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
}

const statusIcons = {
  pending: Clock,
  "in-progress": AlertCircle,
  completed: CheckCircle2,
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState("")
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [tasks, setTasks] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [newTask, setNewTask] = useState({
    title: "",
    assignedTo: "",
    priority: "medium",
  })
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [orgMembers, setOrgMembers] = useState([])
  const [orgId, setOrgId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const userData = getUserFromToken()
    setUser(userData)

    // Only run on client
    const storedOrgId = typeof window !== "undefined" ? localStorage.getItem("selectedOrganization") : null
    setOrgId(storedOrgId)
    if (!storedOrgId) {
      router.push("/organizations")
      return
    }

    fetchOrganizationData(storedOrgId)
    fetchProjects(storedOrgId)
  }, [router])

  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject.id)
    }
  }, [selectedProject])

  const fetchOrganizationData = async (orgId) => {
    try {
      const [orgResponse, membersResponse] = await Promise.all([
        api.get(`/organizations/${orgId}`),
        api.get(`/organizations/${orgId}/members`),
      ])
      setOrganization(orgResponse.data)
      setOrgMembers(membersResponse.data)
    } catch (error) {
      setError("Failed to load organization data")
    }
  }

  const fetchProjects = async (orgId) => {
    try {
      const response = await api.get(`/organizations/${orgId}/projects`)
      setProjects(response.data)
      if (response.data.length > 0) {
        setSelectedProject(response.data[0])
      }
    } catch (error) {
      setError("Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }

  // Map backend status to frontend status
  const statusMap = {
    todo: "pending",
    pending: "pending",
    "in-progress": "in-progress",
    completed: "completed"
  };

  const fetchTasks = async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}/tasks`)
      // Map status for each task
      const mappedTasks = Array.isArray(response.data)
        ? response.data.map(task => ({ ...task, status: statusMap[task.status] || task.status }))
        : [];
      setTasks(mappedTasks)
    } catch (error) {
      setError("Failed to load tasks")
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !selectedProject) return

    setIsCreatingTask(true)
    try {
      await api.post(`/tasks`, {
        projectId: selectedProject.id,
        title: newTask.title,
        assignee: newTask.assignedTo ? Number(newTask.assignedTo) : null
      })
      setNewTask({ title: "", assignedTo: "", priority: "medium" })
      fetchTasks(selectedProject.id)
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create task")
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus })
      fetchTasks(selectedProject.id)
    } catch (error) {
      if (error.response?.status === 403) {
        setError("This task doesn't belong to you")
      } else {
        setError("Failed to update task status")
      }
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`)
      fetchTasks(selectedProject.id)
    } catch (error) {
      if (error.response?.status === 403) {
        setError("This task doesn't belong to you")
      } else {
        setError("Failed to delete task")
      }
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !orgId) return
    setIsCreatingProject(true)
    try {
      await api.post(`/projects`, { orgId: Number(orgId), name: newProjectName })
      setNewProjectName("")
      fetchProjects(orgId)
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create project")
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleLogout = () => {
    removeToken()
    if (typeof window !== "undefined") {
      localStorage.removeItem("selectedOrganization")
    }
    router.push("/login")
  }

  const canCreateTasks = user && organization && (user.role === "admin" || organization.userRole === "admin")
  const canUpdateTasks = (task) => {
    if (!user) return false
    if (user.role === "admin" || organization?.userRole === "admin") return true
    return task.assignedTo === user.id
  }

  // Use tasks array directly from API response

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Display orgId and projectCode at the top */}
        <div className="container mx-auto px-4 py-2 flex gap-8 items-center">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Org ID:</span> {orgId || "N/A"}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Project Code:</span> {selectedProject?.code || selectedProject?.id || "N/A"}
          </div>
        </div>
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/organizations")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{organization?.name || "Loading..."}</h1>
                <p className="text-sm text-muted-foreground">Project Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {organization?.userRole || "member"}
                  </Badge>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Projects Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Projects</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Add Project">
                          <Plus className="h-5 w-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Project</DialogTitle>
                          <DialogDescription>Add a new project to this organization.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Label htmlFor="projectName">Project Name</Label>
                          <Input id="projectName" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Enter project name" />
                          <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || isCreatingProject} className="w-full">
                            {isCreatingProject ? "Creating..." : "Create Project"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <CardDescription>Select a project to view tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-10 bg-muted rounded"></div>
                      <div className="h-10 bg-muted rounded"></div>
                    </div>
                  ) : projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No projects available</p>
                  ) : (
                    projects.map((project) => (
                      <Button
                        key={project.id}
                        variant={selectedProject?.id === project.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedProject(project)}
                      >
                        {project.name}
                      </Button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tasks Area */}
            <div className="lg:col-span-3">
              {selectedProject ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">{selectedProject.name}</h2>
                    </div>
                    {canCreateTasks && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                            <DialogDescription>Add a new task to {selectedProject.name}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">Task Title</Label>
                              <Input
                                id="title"
                                value={newTask.title}
                                onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter task title"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="assignedTo">Assign To</Label>
                              <Select
                                value={newTask.assignedTo}
                                onValueChange={(value) => setNewTask((prev) => ({ ...prev, assignedTo: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {orgMembers.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {member.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="priority">Priority</Label>
                              <Select
                                value={newTask.priority}
                                onValueChange={(value) => setNewTask((prev) => ({ ...prev, priority: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={handleCreateTask}
                              disabled={!newTask.title.trim() || isCreatingTask}
                              className="w-full"
                            >
                              {isCreatingTask ? "Creating..." : "Create Task"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {/* Task Board */}
                  <Tabs defaultValue="board" className="w-full">
                    <TabsList>
                      <TabsTrigger value="board">Board View</TabsTrigger>
                      <TabsTrigger value="list">List View</TabsTrigger>
                    </TabsList>

                    <TabsContent value="board" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['pending', 'in-progress', 'completed'].map((status) => {
                          const StatusIcon = statusIcons[status]
                          const statusTasks = tasks.filter((task) => task.status === status)
                          return (
                            <Card key={status}>
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                  <StatusIcon className="h-4 w-4" />
                                  {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                                  <Badge variant="secondary" className="ml-auto">
                                    {statusTasks.length}
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {statusTasks.map((task) => (
                                  <Card key={task.id} className="p-3">
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-sm">{task.title}</h4>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <User className="h-3 w-3" />
                                          <span className="text-xs text-muted-foreground">
                                            {task.assignedToName || "Unassigned"}
                                          </span>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {task.priority}
                                        </Badge>
                                      </div>
                                      {canUpdateTasks(task) && (
                                        <div className="flex gap-2 items-center">
                                          <Select
                                            value={task.status}
                                            onValueChange={(value) => handleUpdateTaskStatus(task.id, value)}
                                          >
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="pending">Pending</SelectItem>
                                              <SelectItem value="in-progress">In Progress</SelectItem>
                                              <SelectItem value="completed">Completed</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)}>
                                            Delete
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                ))}
                                {statusTasks.length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="list" className="space-y-4">
                      <Card>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border">
                            {tasks.map((task) => (
                              <div key={task.id} className="p-4 flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium">{task.title}</h4>
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {task.assignedToName || "Unassigned"}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {task.priority}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge className={statusColors[task.status]}>{task.status.replace("-", " ")}</Badge>
                                  {canUpdateTasks(task) && (
                                    <div className="flex gap-2 items-center">
                                      <Select
                                        value={task.status}
                                        onValueChange={(value) => handleUpdateTaskStatus(task.id, value)}
                                      >
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="in-progress">In Progress</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(task.id)}>
                                        Delete
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {tasks.length === 0 && (
                              <div className="p-8 text-center">
                                <p className="text-muted-foreground">No tasks in this project yet.</p>
                                {canCreateTasks && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Create your first task to get started.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Project Selected</h3>
                      <p className="text-muted-foreground">
                        Select a project from the sidebar to view and manage tasks.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
