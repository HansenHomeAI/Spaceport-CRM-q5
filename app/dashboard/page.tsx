"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, Upload, Clock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MetricCards } from "@/components/metric-cards"
import { LeadsTable, type Lead } from "@/components/leads-table"
import { LeadPanel } from "@/components/lead-panel"
import { AddLeadModal } from "@/components/add-lead-modal"
import { FollowUpPriority } from "@/components/follow-up-priority"
import { useAuth } from "@/lib/auth-context"
import { CSVImport } from "@/components/csv-import"

// Enhanced mock data with addresses and more interaction history
const mockLeads: Lead[] = [
  {
    id: "1",
    name: "John Smith",
    phone: "+1 (555) 123-4567",
    email: "john.smith@techcorp.com",
    address: "1234 Maple Street, Beverly Hills, CA 90210",
    status: "interested",
    lastInteraction: "2024-01-15",
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
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [sortByRecent, setSortByRecent] = useState(false)

  // Calculate metrics
  const callsMade = leads.reduce((acc, lead) => acc + lead.notes.filter((note) => note.type === "call").length, 0)
  const responsesReceived = leads.filter((lead) => lead.status === "interested" || lead.status === "closed").length

  // Mock weekly data for charts
  const weeklyData = {
    calls: [12, 15, 8, 22, 18, 25, callsMade],
    responses: [3, 5, 2, 8, 6, 9, responsesReceived],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"],
  }

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

  const handleCSVImport = (importedLeads: Lead[]) => {
    setLeads((prev) => [...prev, ...importedLeads])
  }

  const handleAddLead = (leadData: Omit<Lead, "id" | "notes">) => {
    const newLead: Lead = {
      ...leadData,
      id: Date.now().toString(),
      notes: [],
    }
    setLeads((prev) => [...prev, newLead])
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
          </div>
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
        </motion.div>

        <MetricCards callsMade={callsMade} responsesReceived={responsesReceived} weeklyData={weeklyData} />

        <FollowUpPriority leads={leads} onLeadSelect={handleLeadSelect} />

        <LeadsTable
          leads={leads}
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
