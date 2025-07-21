"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, Loader2 } from "lucide-react"
import type { Lead } from "@/lib/api-client"

interface CsvImportProps {
  isOpen: boolean
  onClose: () => void
  onImport: (leads: Omit<Lead, "id" | "createdAt" | "updatedAt">[]) => Promise<{ success: boolean; message: string }>
}

interface ParsedLead {
  name: string
  email: string
  phone?: string
  company?: string
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost"
  source?: string
  value?: number
  notes?: string[]
}

export function CsvImport({ isOpen, onClose, onImport }: CsvImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      parseCSV(selectedFile)
    } else {
      setMessage({ type: "error", text: "Please select a valid CSV file" })
    }
  }

  const parseCSV = async (file: File) => {
    setIsProcessing(true)
    setMessage(null)

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        setMessage({ type: "error", text: "CSV file must contain at least a header row and one data row" })
        setIsProcessing(false)
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
      const dataLines = lines.slice(1)

      // Map common header variations
      const headerMap: { [key: string]: string } = {
        name: "name",
        "full name": "name",
        "contact name": "name",
        email: "email",
        "email address": "email",
        phone: "phone",
        "phone number": "phone",
        company: "company",
        organization: "company",
        status: "status",
        "lead status": "status",
        source: "source",
        "lead source": "source",
        value: "value",
        "deal value": "value",
        notes: "notes",
        description: "notes",
      }

      const mappedHeaders = headers.map((h) => headerMap[h] || h)

      const leads: ParsedLead[] = []
      const errors: string[] = []

      for (let i = 0; i < dataLines.length; i++) {
        const values = dataLines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))

        if (values.length !== headers.length) {
          errors.push(`Row ${i + 2}: Column count mismatch`)
          continue
        }

        const leadData: any = {}
        mappedHeaders.forEach((header, index) => {
          leadData[header] = values[index]
        })

        // Validate required fields
        if (!leadData.name || !leadData.email) {
          errors.push(`Row ${i + 2}: Missing required fields (name, email)`)
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(leadData.email)) {
          errors.push(`Row ${i + 2}: Invalid email format`)
          continue
        }

        // Parse and validate status
        const validStatuses = ["new", "contacted", "qualified", "proposal", "won", "lost"]
        let status: ParsedLead["status"] = "new"
        if (leadData.status && validStatuses.includes(leadData.status.toLowerCase())) {
          status = leadData.status.toLowerCase() as ParsedLead["status"]
        }

        // Parse value
        let value: number | undefined
        if (leadData.value) {
          const numValue = Number.parseFloat(leadData.value.replace(/[$,]/g, ""))
          if (!isNaN(numValue)) {
            value = numValue
          }
        }

        // Parse notes
        let notes: string[] = []
        if (leadData.notes) {
          notes = [leadData.notes]
        }

        leads.push({
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone || undefined,
          company: leadData.company || undefined,
          status,
          source: leadData.source || "CSV Import",
          value,
          notes: notes.length > 0 ? notes : undefined,
        })
      }

      if (errors.length > 0) {
        setMessage({
          type: "error",
          text: `Found ${errors.length} errors:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? "\n..." : ""}`,
        })
      }

      if (leads.length === 0) {
        setMessage({ type: "error", text: "No valid leads found in CSV file" })
        setIsProcessing(false)
        return
      }

      setParsedLeads(leads)
      setStep("preview")
      setMessage({
        type: "success",
        text: `Successfully parsed ${leads.length} leads${errors.length > 0 ? ` (${errors.length} errors)` : ""}`,
      })
    } catch (error) {
      console.error("CSV parsing error:", error)
      setMessage({ type: "error", text: "Failed to parse CSV file. Please check the format." })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (parsedLeads.length === 0) return

    setStep("importing")
    setIsProcessing(true)
    setProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const result = await onImport(parsedLeads)

      clearInterval(progressInterval)
      setProgress(100)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        setStep("complete")
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        setMessage({ type: "error", text: result.message })
        setStep("preview")
      }
    } catch (error) {
      console.error("Import error:", error)
      setMessage({ type: "error", text: "Failed to import leads. Please try again." })
      setStep("preview")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setParsedLeads([])
    setMessage(null)
    setStep("upload")
    setProgress(0)
    setIsProcessing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClose()
  }

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <Label htmlFor="csv-file" className="text-lg font-medium cursor-pointer">
            Choose CSV file to import
          </Label>
          <p className="text-sm text-gray-500">
            File should contain columns: name, email, phone, company, status, source, value
          </p>
        </div>
        <Input
          ref={fileInputRef}
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="mt-4"
        />
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Required columns: name, email</li>
          <li>• Optional columns: phone, company, status, source, value, notes</li>
          <li>• First row should contain column headers</li>
          <li>• Status values: new, contacted, qualified, proposal, won, lost</li>
        </ul>
      </div>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Preview Import</h3>
        <Badge variant="secondary">{parsedLeads.length} leads</Badge>
      </div>

      <div className="max-h-64 overflow-y-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {parsedLeads.slice(0, 10).map((lead, index) => (
              <tr key={index} className="border-t">
                <td className="px-3 py-2">{lead.name}</td>
                <td className="px-3 py-2">{lead.email}</td>
                <td className="px-3 py-2">{lead.company || "-"}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{lead.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {parsedLeads.length > 10 && (
          <div className="p-3 text-center text-sm text-gray-500 border-t">
            ... and {parsedLeads.length - 10} more leads
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <Button variant="outline" onClick={() => setStep("upload")}>
          Back
        </Button>
        <Button onClick={handleImport} disabled={isProcessing}>
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Import {parsedLeads.length} Leads
        </Button>
      </div>
    </div>
  )

  const renderImportingStep = () => (
    <div className="space-y-4 text-center">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
      <div>
        <h3 className="text-lg font-medium">Importing Leads...</h3>
        <p className="text-sm text-gray-500">Please wait while we save your leads to the database</p>
      </div>
      <Progress value={progress} className="w-full" />
      <p className="text-sm text-gray-500">{progress}% complete</p>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="space-y-4 text-center">
      <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
      <div>
        <h3 className="text-lg font-medium text-green-900">Import Complete!</h3>
        <p className="text-sm text-gray-500">Your leads have been successfully imported</p>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Import Leads from CSV
          </DialogTitle>
          <DialogDescription>Upload a CSV file to bulk import leads into your CRM</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {message && (
            <Alert className={message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
              <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {step === "upload" && renderUploadStep()}
          {step === "preview" && renderPreviewStep()}
          {step === "importing" && renderImportingStep()}
          {step === "complete" && renderCompleteStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
