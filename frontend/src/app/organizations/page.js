"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Building2, Plus, Users, LogOut } from "lucide-react"
import AuthGuard from "@/src/components/auth-guard"
import api from "@/src/lib/api"
import { removeToken, getUserFromToken } from "@/src/lib/auth"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [joinOrgId, setJoinOrgId] = useState("")
  const [newOrgName, setNewOrgName] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const userData = getUserFromToken()
    setUser(userData)
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const response = await api.get("/organizations")
      setOrganizations(response.data.organizations)
    } catch (error) {
      setError("Failed to load organizations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinOrganization = async () => {
    if (!joinOrgId.trim() || !user?.userId) return

    setIsJoining(true)
    try {
      await api.post(`/organizations/${joinOrgId}/join`, {
        userId: user.userId,
        role: "member"
      })
      setJoinOrgId("")
      fetchOrganizations()
    } catch (error) {
      setError(error.response?.data?.message || "Failed to join organization")
    } finally {
      setIsJoining(false)
    }
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return

    setIsCreating(true)
    try {
      await api.post("/organizations", { name: newOrgName })
      setNewOrgName("")
      fetchOrganizations()
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create organization")
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectOrganization = (orgId) => {
    localStorage.setItem("selectedOrganization", orgId)
    router.push("/projects")
  }

  const handleLogout = () => {
    removeToken()
    localStorage.removeItem("selectedOrganization")
    router.push("/login")
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-semibold text-foreground">TaskTracker</h1>
                <p className="text-sm text-muted-foreground">Select an organization</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Join Organization Card */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join Organization
                </CardTitle>
                <CardDescription>Enter an organization ID to join an existing team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgId">Organization ID</Label>
                  <Input
                    id="orgId"
                    value={joinOrgId}
                    onChange={(e) => setJoinOrgId(e.target.value)}
                    placeholder="Enter organization ID"
                  />
                </div>
                <Button onClick={handleJoinOrganization} disabled={!joinOrgId.trim() || isJoining} className="w-full">
                  {isJoining ? "Joining..." : "Join Organization"}
                </Button>
              </CardContent>
            </Card>

            {/* Create Organization Card */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Organization
                </CardTitle>
                <CardDescription>Start a new organization for your team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Enter organization name"
                  />
                </div>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={!newOrgName.trim() || isCreating}
                  className="w-full"
                >
                  {isCreating ? "Creating..." : "Create Organization"}
                </Button>
              </CardContent>
            </Card>

            {/* Organization List */}
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
              </Card>
            ) : (
              (Array.isArray(organizations) ? organizations : []).map((org) => (
                <Card key={org.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <Badge variant={org.role === "admin" ? "default" : "secondary"}>{org.role}</Badge>
                    </div>
                    <CardDescription>
                      {org.memberCount} member{org.memberCount !== 1 ? "s" : ""} • {org.projectCount} project
                      {org.projectCount !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => handleSelectOrganization(org.id)} className="w-full">
                      Select Organization
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {!isLoading && organizations.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Organizations</h3>
              <p className="text-muted-foreground mb-4">
                You're not part of any organizations yet. Join an existing one or create a new one to get started.
              </p>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
