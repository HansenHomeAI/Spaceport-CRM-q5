"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Plus, Filter, Download, Upload, LogOut, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiClient, type Lead, type Activity } from "@/lib/api-client"
import { LeadsTable } from "@/components/leads-table"
import { LeadPanel } from "@/components/lead-panel"
import { AddLeadModal } from "@/components/add-lead-modal"
import { CsvImport } from "@/components/csv-import"
import { MetricCards } from "@/components/metric-cards"
import { FollowUpPriority } from "@/components/follow-up-priority"

export default function Dashboard() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [leads, setLeads] = useState<Lead[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  // Set up API client with user token
  useEffect(() => {
    if (user?.accessToken) {
      apiClient.setAccessToken(user.accessToken)
    }
  }, [user])

  // Load initial data
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [leadsResult, activitiesResult] = await Promise.all([apiClient.getLeads(), apiClient.getActivities()])

      if (leadsResult.error) {
        console.error("Failed to load leads:", leadsResult.error)
        // Fallback to demo data if API fails
        setLeads([
          {
            id: "1",
            name: "John Doe",
            email: "john@example.com",
            phone: "+1 (555) 123-4567",
            company: "Acme Corp",
            status: "new",
            source: "Website",
            value: 50000,
            notes: ["Initial contact made", "Interested in enterprise plan"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByName: "Demo User",
          },
        ])
      } else {
        setLeads(leadsResult.data || [])
      }

      if (activitiesResult.error) {
        console.error("Failed to load activities:", activitiesResult.error)
        setActivities([])
      } else {
        setActivities(activitiesResult.data || [])
      }

      if (leadsResult.error || activitiesResult.error) {
        setError("Some data could not be loaded. Using demo data where available.")
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load data. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddLead = async (leadData: Omit<Lead, "id" | "createdAt" | "updatedAt">) => {
    const { data, error } = await apiClient.createLead(leadData)

    if (error) {
      console.error("Failed to create lead:", error)
      return { success: false, message: error }
    }

    if (data) {
      setLeads((prev) => [data, ...prev])
      setIsAddLeadOpen(false)
      return { success: true, message: "Lead created successfully!" }
    }

    return { success: false, message: "Unknown error occurred" }
  }

  const handleUpdateLead = async (updatedLead: Lead) => {
    const { data, error } = await apiClient.updateLead(updatedLead)

    if (error) {
      console.error("Failed to update lead:", error)
      return
    }

    if (data) {
      setLeads((prev) => prev.map((lead) => (lead.id === data.id ? data : lead)))
      setSelectedLead(data)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    const { error } = await apiClient.deleteLead(leadId)

    if (error) {
      console.error("Failed to delete lead:", error)
      return
    }

    setLeads((prev) => prev.filter((lead) => lead.id !== leadId))
    if (selectedLead?.id === leadId) {
      setSelectedLead(null)
    }
  }

  const handleAddActivity = async (activity: Omit<Activity, "id" | "timestamp" | "createdAt">) => {
    const { data, error } = await apiClient.createActivity(activity)

    if (error) {
      console.error("Failed to create activity:", error)
      return
    }

    if (data) {
      setActivities((prev) => [data, ...prev])
    }
  }

  const handleCsvImport = async (importedLeads: Omit<Lead, "id" | "createdAt" | "updatedAt">[]) => {
    const { data, error } = await apiClient.createLeads(importedLeads)

    if (error) {
      console.error("CSV import failed:", error)
      return { success: false, message: error }
    }

    if (data) {
      setLeads((prev) => [...data, ...prev])
      setIsCsvImportOpen(false)
      return { success: true, message: `Successfully imported ${data.length} leads!` }
    }

    return { success: false, message: "Unknown error occurred" }
  }

  const handleSignOut = () => {
    signOut()
    router.push("/login")
  }

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Spaceport CRM</h1>
              <Badge variant="secondary">Production</Badge>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6">
            {error && (
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <AlertDescription className="text-yellow-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Metrics */}
            <MetricCards leads={leads} />

            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsCsvImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button size="sm" onClick={() => setIsAddLeadOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="leads" className="flex-1">
              <TabsList>
                <TabsTrigger value="leads">All Leads ({filteredLeads.length})</TabsTrigger>
                <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
                <TabsTrigger value="recent">Recent Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="leads" className="mt-4">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <LeadsTable
                    leads={filteredLeads}
                    onSelectLead={setSelectedLead}
                    onUpdateLead={handleUpdateLead}
                    onDeleteLead={handleDeleteLead}
                  />
                )}
              </TabsContent>

              <TabsContent value="follow-ups" className="mt-4">
                <FollowUpPriority leads={leads} onSelectLead={setSelectedLead} />
              </TabsContent>

              <TabsContent value="recent" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest updates across all leads</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activities.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No recent activity</p>
                    ) : (
                      <div className="space-y-4">
                        {activities.slice(0, 10).map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.description}</p>
                              <p className="text-xs text-gray-500">
                                {activity.createdByName} • {new Date(activity.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Lead Panel */}
        {selectedLead && (
          <LeadPanel
            lead={selectedLead}
            activities={activities.filter((a) => a.leadId === selectedLead.id)}
            onClose={() => setSelectedLead(null)}
            onUpdateLead={handleUpdateLead}
            onAddActivity={handleAddActivity}
          />
        )}
      </div>

      {/* Modals */}
      <AddLeadModal isOpen={isAddLeadOpen} onClose={() => setIsAddLeadOpen(false)} onAddLead={handleAddLead} />

      <CsvImport isOpen={isCsvImportOpen} onClose={() => setIsCsvImportOpen(false)} onImport={handleCsvImport} />
    </div>
  )
}
