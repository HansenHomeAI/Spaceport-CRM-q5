"use client"

import { useState } from "react"
import type React from "react"
import { motion } from "framer-motion"
import { FileText, X, Phone, Mail, MessageSquare, MapPin, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Lead } from "./leads-table"

interface CSVImportProps {
  onImport: (leads: Omit<Lead, "id" | "createdAt" | "updatedAt">[]) => Promise<{ success: boolean; message: string }>
  isOpen: boolean
  onClose: () => void
}

interface ParsedNote {
  text: string
  type: "call" | "email" | "note"
  timestamp: string
}

interface ParsedLead {
  name: string
  phone: string
  email: string
  address: string
  status: "cold" | "contacted" | "interested" | "closed"
  notes: ParsedNote[]
  rawNotes: string
}

export function CSVImport({ onImport, isOpen, onClose }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([])
  const [previewMode, setPreviewMode] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [parseStats, setParseStats] = useState<{
    totalLeads: number
    callsFound: number
    emailsFound: number
    notesFound: number
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setImportResult(null)
      parseCSV(selectedFile)
    }
  }

  const parseNotesIntelligently = (notesText: string): ParsedNote[] => {
    if (!notesText || notesText.trim() === "") return []

    const notes: ParsedNote[] = []
    const lines = notesText.split(/[,;|\n]/).filter((line) => line.trim())

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      let noteType: "call" | "email" | "note" = "note"
      let timestamp = new Date().toISOString()
      const text = trimmedLine

      // Detect call indicators
      if (/\b(call|called|phone|spoke|talked|conversation|discussed)\b/i.test(trimmedLine)) {
        noteType = "call"
      }
      // Detect email indicators
      else if (/\b(email|emailed|sent|replied|message|contacted via email)\b/i.test(trimmedLine)) {
        noteType = "email"
      }

      // Extract dates from the text
      const datePatterns = [
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(st|nd|rd|th)?\b/i,
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
        /\b\d{1,2}-\d{1,2}-\d{2,4}\b/,
        /\b\d{4}-\d{1,2}-\d{2,4}\b/,
      ]

      for (const pattern of datePatterns) {
        const match = trimmedLine.match(pattern)
        if (match) {
          try {
            const dateStr = match[0]
            let parsedDate: Date

            if (dateStr.includes("/") || dateStr.includes("-")) {
              parsedDate = new Date(dateStr)
            } else {
              // Handle "Jul 17th" format
              const currentYear = new Date().getFullYear()
              parsedDate = new Date(`${dateStr} ${currentYear}`)
            }

            if (!isNaN(parsedDate.getTime())) {
              timestamp = parsedDate.toISOString()
            }
          } catch (error) {
            // Keep default timestamp if parsing fails
          }
          break
        }
      }

      notes.push({
        text,
        type: noteType,
        timestamp,
      })
    }

    return notes
  }

  const inferStatusFromNotes = (notes: ParsedNote[]): "cold" | "contacted" | "interested" | "closed" => {
    const allText = notes.map((n) => n.text.toLowerCase()).join(" ")

    // Check for closed/won indicators
    if (/\b(closed|won|signed|contract|deal|sold|purchased|bought)\b/.test(allText)) {
      return "closed"
    }

    // Check for interested indicators
    if (/\b(interested|stoked|excited|ready|wants|looking|considering|thinking about)\b/.test(allText)) {
      return "interested"
    }

    // Check for contacted indicators
    if (/\b(call|email|spoke|talked|contacted|reached|replied|responded)\b/.test(allText)) {
      return "contacted"
    }

    return "cold"
  }

  const parseCSV = async (file: File) => {
    setLoading(true)
    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        throw new Error("CSV must have at least a header row and one data row")
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
      const dataLines = lines.slice(1)

      // Map headers to our expected fields
      const headerMap: { [key: string]: string } = {}

      headers.forEach((header, index) => {
        const cleanHeader = header.replace(/"/g, "").toLowerCase()

        if (cleanHeader.includes("name") || cleanHeader === "contact") {
          headerMap["name"] = header
        } else if (cleanHeader.includes("phone") || cleanHeader.includes("tel")) {
          headerMap["phone"] = header
        } else if (cleanHeader.includes("email") || cleanHeader.includes("mail")) {
          headerMap["email"] = header
        } else if (
          cleanHeader.includes("property") ||
          cleanHeader.includes("address") ||
          cleanHeader.includes("location")
        ) {
          headerMap["address"] = header
        } else if (
          cleanHeader.includes("note") ||
          cleanHeader.includes("comment") ||
          cleanHeader.includes("description")
        ) {
          headerMap["notes"] = header
        }
      })

      const leads: ParsedLead[] = []
      let totalCalls = 0,
        totalEmails = 0,
        totalNotes = 0

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i]
        if (!line.trim()) continue

        // Handle CSV parsing with quoted fields
        const values: string[] = []
        let currentValue = ""
        let inQuotes = false

        for (let j = 0; j < line.length; j++) {
          const char = line[j]

          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === "," && !inQuotes) {
            values.push(currentValue.trim())
            currentValue = ""
          } else {
            currentValue += char
          }
        }
        values.push(currentValue.trim()) // Add the last value

        if (values.length < headers.length) {
          // Pad with empty strings if needed
          while (values.length < headers.length) {
            values.push("")
          }
        }

        const leadData: any = {}
        headers.forEach((header, index) => {
          leadData[header] = values[index] || ""
        })

        // Extract basic info
        const name = leadData[headerMap["name"]] || leadData[headers[0]] || ""
        const phone = leadData[headerMap["phone"]] || ""
        const email = leadData[headerMap["email"]] || ""
        const address = leadData[headerMap["address"]] || ""
        const rawNotes = leadData[headerMap["notes"]] || ""

        if (!name.trim()) continue // Skip rows without names

        // Parse notes intelligently
        const parsedNotes = parseNotesIntelligently(rawNotes)
        const inferredStatus = inferStatusFromNotes(parsedNotes)

        // Count note types for stats
        parsedNotes.forEach((note) => {
          if (note.type === "call") totalCalls++
          else if (note.type === "email") totalEmails++
          else totalNotes++
        })

        leads.push({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          status: inferredStatus,
          notes: parsedNotes,
          rawNotes: rawNotes.trim(),
        })
      }

      setParsedLeads(leads)
      setParseStats({
        totalLeads: leads.length,
        callsFound: totalCalls,
        emailsFound: totalEmails,
        notesFound: totalNotes,
      })
      setPreviewMode(true)
    } catch (error) {
      console.error("Error parsing CSV:", error)
      setImportResult({
        success: false,
        message: "Error parsing CSV: " + (error instanceof Error ? error.message : "Unknown error"),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (parsedLeads.length === 0) return

    setLoading(true)
    setImportResult(null)

    try {
      const leadsToImport: Omit<Lead, "id" | "createdAt" | "updatedAt">[] = parsedLeads.map((lead) => ({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        status: lead.status,
        lastInteraction:
          lead.notes.length > 0
            ? lead.notes
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
                .timestamp.split("T")[0]
            : new Date().toISOString().split("T")[0],
        notes: lead.notes.map((note, noteIndex) => ({
          id: `note-${Date.now()}-${noteIndex}`,
          text: note.text,
          timestamp: note.timestamp,
          type: note.type,
        })),
      }))

      const result = await onImport(leadsToImport)
      setImportResult(result)

      if (result.success) {
        // Reset form after successful import
        setTimeout(() => {
          onClose()
          setFile(null)
          setParsedLeads([])
          setPreviewMode(false)
          setParseStats(null)
          setImportResult(null)
        }, 2000)
      }
    } catch (error) {
      console.error("Error importing leads:", error)
      setImportResult({
        success: false,
        message: "Error importing leads: " + (error instanceof Error ? error.message : "Unknown error"),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setPreviewMode(false)
    setParsedLeads([])
    setParseStats(null)
    setImportResult(null)
  }

  const handleClose = () => {
    onClose()
    setFile(null)
    setParsedLeads([])
    setPreviewMode(false)
    setParseStats(null)
    setImportResult(null)
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl max-h-[90vh]"
      >
        <Card className="bg-black/90 backdrop-blur-xl border-white/10 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewMode ? "Preview Import" : "Import CSV"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {importResult && (
              <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className={importResult.success ? "text-green-800" : "text-red-800"}>
                  {importResult.message}
                </AlertDescription>
              </Alert>
            )}

            {!previewMode ? (
              <>
                <div className="text-sm text-gray-400">
                  Upload a CSV file with your CRM data. Our intelligent parser will automatically detect calls, emails,
                  and notes.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-file" className="text-white">
                    Choose CSV File
                  </Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="bg-black/20 backdrop-blur-sm border-white/10 text-white file:bg-gradient-to-r file:from-purple-600 file:to-purple-700 file:text-white file:border-0 file:rounded-full file:px-4 file:py-2 rounded-full"
                  />
                </div>

                {file && (
                  <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span className="text-white text-sm">{file.name}</span>
                    {loading && <div className="ml-auto text-purple-400 text-sm">Parsing...</div>}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <strong>Supported formats:</strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Name, Phone, Email, Property/Address columns</li>
                    <li>• Notes column with mixed content (calls, emails, general notes)</li>
                    <li>• Automatic detection of interaction types and dates</li>
                    <li>• Smart status inference from note content</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                {parseStats && (
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white">{parseStats.totalLeads}</div>
                      <div className="text-xs text-gray-400">Leads Found</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-400 flex items-center justify-center gap-1">
                        <Phone className="h-4 w-4" />
                        {parseStats.callsFound}
                      </div>
                      <div className="text-xs text-gray-400">Calls Detected</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-400 flex items-center justify-center gap-1">
                        <Mail className="h-4 w-4" />
                        {parseStats.emailsFound}
                      </div>
                      <div className="text-xs text-gray-400">Emails Detected</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-400 flex items-center justify-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {parseStats.notesFound}
                      </div>
                      <div className="text-xs text-gray-400">Notes Found</div>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-96 w-full rounded-lg border border-white/10">
                  <div className="space-y-3 p-4">
                    {parsedLeads.slice(0, 10).map((lead, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-white">{lead.name}</div>
                          <Badge
                            className={`${
                              lead.status === "closed"
                                ? "bg-green-500/20 text-green-300"
                                : lead.status === "interested"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : lead.status === "contacted"
                                    ? "bg-yellow-500/20 text-yellow-300"
                                    : "bg-gray-500/20 text-gray-300"
                            } rounded-full`}
                          >
                            {lead.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-400">
                          {lead.email} • {lead.phone}
                        </div>
                        {lead.address && (
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.address}
                          </div>
                        )}
                        {lead.notes.length > 0 && (
                          <div className="space-y-1">
                            {lead.notes.slice(0, 2).map((note, noteIndex) => (
                              <div key={noteIndex} className="flex items-start gap-2 text-xs">
                                {note.type === "call" && <Phone className="h-3 w-3 text-blue-400 mt-0.5" />}
                                {note.type === "email" && <Mail className="h-3 w-3 text-green-400 mt-0.5" />}
                                {note.type === "note" && <MessageSquare className="h-3 w-3 text-purple-400 mt-0.5" />}
                                <span className="text-gray-300 flex-1">{note.text}</span>
                              </div>
                            ))}
                            {lead.notes.length > 2 && (
                              <div className="text-xs text-gray-500">+{lead.notes.length - 2} more notes</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {parsedLeads.length > 10 && (
                      <div className="text-center text-gray-400 text-sm py-2">
                        ... and {parsedLeads.length - 10} more leads
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="border-white/20 text-gray-300 bg-transparent rounded-full"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={loading || parsedLeads.length === 0}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full disabled:opacity-50"
                  >
                    {loading ? "Importing..." : `Import ${parsedLeads.length} Leads`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
