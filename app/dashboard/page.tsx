"use client"

import { TooltipTrigger } from "@/components/ui/tooltip"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, Filter, Download, Upload, LogOut, Loader2, Clock, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth-context"
import { LeadsTable, type Lead } from "@/components/leads-table"
import { LeadPanel } from "@/components/lead-panel"
import { AddLeadModal } from "@/components/add-lead-modal"
import { CSVImport } from "@/components/csv-import"
import { FollowUpPriority } from "@/components/follow-up-priority"

// Enhanced mock data with ownership
const mockLeads: Lead[] = [
  {
    id: "1",
    name: "John Smith",
    phone: "+1 (555) 123-4567",
    email: "john.smith@techcorp.com",
    address: "1234 Maple Street, Beverly Hills, CA 90210",
    status: "interested",
    lastInteraction: "2024-01-15",
    ownerId: "demo-user-1",
    ownerName: "Demo User",
    notes: [
      {
        id: "1",
        text: "Initial contact made, showed strong interest in our enterprise solution",
        timestamp: "2024-01-15T10:00:00Z",
        type: "call",
      },
      {
        id: "2",
        text: "Sent product demo video and pricing information",
        timestamp: "2024-01-14T14:30:00Z",
        type: "email",
      },
    ],
  },
  {
    id: "2",
    name: "Sarah Johnson",
    phone: "+1 (555) 987-6543",
    email: "sarah.johnson@innovate.eu",
    address: "5678 Oak Avenue, Manhattan, NY 10001",
    status: "contacted",
    lastInteraction: "2024-01-10",
    // No owner - unclaimed lead
    notes: [
      {
        id: "3",
        text: "Left voicemail, awaiting callback",
        timestamp: "2024-01-10T09:15:00Z",
        type: "call",
      },
    ],
  },
  {
    id: "3",
    name: "Mike Davis",
    phone: "+1 (555) 456-7890",
    email: "mike.davis@startupxyz.com",
    address: "9012 Pine Road, Austin, TX 78701",
    status: "cold",
    lastInteraction: "2024-01-05",
    ownerId: "demo-user-2",
    ownerName: "Sarah Johnson",
    notes: [],
  },
  {
    id: "4",
    name: "Emily Chen",
    phone: "+1 (555) 321-9876",
    email: "emily.chen@globaltech.com",
    address: "3456 Cedar Lane, San Francisco, CA 94102",
    status: "closed",
    lastInteraction: "2024-01-12",
    ownerId: "demo-user-1",
    ownerName: "Demo User",
    notes: [
      {
        id: "4",
        text: "Deal closed! Signed annual contract for $50k",
        timestamp: "2024-01-12T16:45:00Z",
        type: "note",
      },
      {
        id: "5",
        text: "Final negotiation call - agreed on terms",
        timestamp: "2024-01-11T11:30:00Z",
        type: "call",
      },
    ],
  },
  {
    id: "5",
    name: "Robert Wilson",
    phone: "+1 (555) 654-3210",
    email: "robert.wilson@manufacturing.com",
    address: "7890 Elm Street, Chicago, IL 60601",
    status: "contacted",
    lastInteraction: "2024-01-08",
    // No owner - unclaimed lead
    notes: [
      {
        id: "6",
        text: "Interested in pilot program, scheduling demo for next week",
        timestamp: "2024-01-08T13:20:00Z",
        type: "email",
      },
    ],
  },
]

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [sortByRecent, setSortByRecent] = useState(false)
  const [filterByOwnership, setFilterByOwnership] = useState<"all" | "mine" | "unclaimed">("all")

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  // Calculate metrics
  const callsMade = leads.reduce((acc, lead) => acc + lead.notes.filter((note) => note.type === "call").length, 0)
  const responsesReceived = leads.filter((lead) => lead.status === "interested" || lead.status === "closed").length
  const myLeads = leads.filter((lead) => lead.ownerId === user?.id).length
  const unclaimedLeads = leads.filter((lead) => !lead.ownerId).length

  // Filter leads based on ownership
  const filteredLeads = leads.filter((lead) => {
    if (filterByOwnership === "mine") {
      return lead.ownerId === user?.id
    }
    if (filterByOwnership === "unclaimed") {
      return !lead.ownerId
    }
    return true
  })

  const handleLeadUpdate = (leadId: string, updates: Partial<Lead>) => {
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, ...updates } : lead)))

    // Update selected lead if it's the same one
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, ...updates } : null))
    }
  }

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead)
    setIsPanelOpen(true)
  }

  const handleAddNote = (leadId: string, note: { text: string; type: "call" | "email" | "note" }) => {
    const newNote = {
      id: Date.now().toString(),
      ...note,
      timestamp: new Date().toISOString(),
    }

    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, notes: [...lead.notes, newNote] } : lead)))

    // Update selected lead if it's the same one
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, notes: [...prev.notes, newNote] } : null))
    }
  }

  const handleCSVImport = async (importedLeads: Omit<Lead, "id" | "createdAt" | "updatedAt">[]) => {
    const leadsWithIds: Lead[] = importedLeads.map((lead) => ({
      ...lead,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ownerId: user?.id, // Assign imported leads to current user
      ownerName: user?.name,
    }))

    setLeads((prev) => [...prev, ...leadsWithIds])
    return { success: true, message: `Successfully imported ${leadsWithIds.length} leads!` }
  }

  const handleAddLead = (leadData: Omit<Lead, "id" | "notes">) => {
    const newLead: Lead = {
      ...leadData,
      id: Date.now().toString(),
      ownerId: user?.id, // Assign new leads to current user
      ownerName: user?.name,
      notes: [],
    }
    setLeads((prev) => [...prev, newLead])
  }

  const handleSignOut = () => {
    signOut()
    router.push("/login")
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-title text-primary-hierarchy mb-2">Welcome back, {user?.name}</h1>
            <p className="text-medium-hierarchy font-body">Here's what's happening with your leads today.</p>
            {user?.isDemo && (
              <Badge className="mt-2 bg-purple-500/20 text-purple-300 border-purple-500/30">Demo Mode</Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt={user.name} />
                    <AvatarFallback className="bg-purple-500/20 text-purple-300">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-black/90 backdrop-blur-xl border-white/10" align="end" forceMount>
                <DropdownMenuItem onClick={handleSignOut} className="text-white hover:bg-white/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Enhanced Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-black/20 backdrop-blur-xl border-system rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-medium-hierarchy font-body text-sm">Total Leads</p>
                  <p className="text-3xl font-bold text-primary-hierarchy">{leads.length}</p>
                </div>
                <div className="h-12 w-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Search className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-xl border-system rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-medium-hierarchy font-body text-sm">My Leads</p>
                  <p className="text-3xl font-bold text-primary-hierarchy">{myLeads}</p>
                </div>
                <div className="h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Plus className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-xl border-system rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-medium-hierarchy font-body text-sm">Unclaimed</p>
                  <p className="text-3xl font-bold text-primary-hierarchy">{unclaimedLeads}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-xl border-system rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-medium-hierarchy font-body text-sm">Responses</p>
                  <p className="text-3xl font-bold text-primary-hierarchy">{responsesReceived}</p>
                </div>
                <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Download className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setSortByRecent(!sortByRecent)}
                    variant="outline"
                    className={`border-system text-medium-hierarchy hover:bg-white/10 rounded-full px-6 backdrop-blur-sm font-body ${
                      sortByRecent ? "bg-purple-500/10 text-purple-300" : ""
                    }`}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {sortByRecent ? "Recent First" : "Sort by Recent"}
                    <Info className="h-3 w-3 ml-1 opacity-50" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 backdrop-blur-xl border-system rounded-2xl">
                  <p className="font-body">Toggle to show most recently contacted leads first</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={() =>
                setFilterByOwnership(
                  filterByOwnership === "all" ? "mine" : filterByOwnership === "mine" ? "unclaimed" : "all",
                )
              }
              variant="outline"
              className={`border-system text-medium-hierarchy hover:bg-white/10 rounded-full px-6 backdrop-blur-sm font-body ${
                filterByOwnership !== "all" ? "bg-blue-500/10 text-blue-300" : ""
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {filterByOwnership === "all" ? "All Leads" : filterByOwnership === "mine" ? "My Leads" : "Unclaimed"}
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setIsImportOpen(true)}
              variant="outline"
              className="border-system text-medium-hierarchy hover:bg-white/10 rounded-full px-6 backdrop-blur-sm font-body"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full px-6 transition-all duration-200 font-body"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        <FollowUpPriority leads={filteredLeads} onLeadSelect={handleLeadSelect} />

        <LeadsTable
          leads={filteredLeads}
          onLeadUpdate={handleLeadUpdate}
          onLeadSelect={handleLeadSelect}
          sortByRecent={sortByRecent}
        />

        <LeadPanel
          lead={selectedLead}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          onAddNote={handleAddNote}
          onUpdateLead={handleLeadUpdate}
        />

        <AddLeadModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAddLead={handleAddLead} />

        <CSVImport isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={handleCSVImport} />
      </div>
    </div>
  )
}
