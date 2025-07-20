"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Lead } from "./leads-table"

interface CSVImportProps {
  onImport: (leads: Lead[]) => void
  isOpen: boolean
  onClose: () => void
}

export function CSVImport({ onImport, isOpen, onClose }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
    }
  }

  const parseCSV = (csvText: string): Lead[] => {
    const lines = csvText.split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

    const leads: Lead[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim())
      if (values.length < 4) continue // Skip incomplete rows

      const lead: Lead = {
        id: `imported-${Date.now()}-${i}`,
        name: values[headers.indexOf("name")] || values[0] || "",
        phone: values[headers.indexOf("phone")] || values[1] || "",
        email: values[headers.indexOf("email")] || values[2] || "",
        address: values[headers.indexOf("address")] || values[3] || "",
        status: (values[headers.indexOf("status")] as Lead["status"]) || "cold",
        lastInteraction: values[headers.indexOf("last_interaction")] || new Date().toISOString().split("T")[0],
        notes: [],
      }

      // Parse notes if they exist
      const notesText = values[headers.indexOf("notes")]
      if (notesText) {
        lead.notes = [
          {
            id: `note-${Date.now()}`,
            text: notesText,
            timestamp: new Date().toISOString(),
            type: "note",
          },
        ]
      }

      leads.push(lead)
    }

    return leads
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    try {
      const text = await file.text()
      const importedLeads = parseCSV(text)
      onImport(importedLeads)
      onClose()
      setFile(null)
    } catch (error) {
      console.error("Error importing CSV:", error)
    } finally {
      setLoading(false)
    }
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
        className="w-full max-w-md"
      >
        <Card className="bg-black/90 backdrop-blur-xl border-white/10 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Import CSV</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-400">
              Upload a CSV file with columns: name, phone, email, address, status, notes
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
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-white/20 text-gray-300 bg-transparent rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full"
              >
                {loading ? "Importing..." : "Import"}
              </Button>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              <strong>Sample CSV format:</strong>
              <pre className="mt-1 p-2 bg-white/5 rounded text-xs">
                {`name,phone,email,address,status,notes
John Smith,555-123-4567,john@example.com,123 Main St Beverly Hills CA,interested,Initial contact made
Sarah Johnson,555-987-6543,sarah@example.com,456 Oak Ave Manhattan NY,contacted,Follow-up needed`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
