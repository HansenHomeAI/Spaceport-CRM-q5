"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Lead } from "./leads-table"

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onAddLead: (lead: Omit<Lead, "id" | "notes">) => void
}

export function AddLeadModal({ isOpen, onClose, onAddLead }: AddLeadModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    status: "cold" as Lead["status"],
    lastInteraction: new Date().toISOString().split("T")[0],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Only require name - everything else is optional
    if (!formData.name.trim()) return

    onAddLead({
      ...formData,
      // Provide defaults for empty fields
      phone: formData.phone || "Not provided",
      email: formData.email || "Not provided",
      address: formData.address || "Address not provided",
    })

    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      status: "cold",
      lastInteraction: new Date().toISOString().split("T")[0],
    })
    onClose()
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-md bg-black/90 backdrop-blur-xl border-system rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-primary-hierarchy font-title text-xl">Add New Lead</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-medium-hierarchy hover:text-primary-hierarchy hover:bg-white/10 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-primary-hierarchy font-body">
                      Contact Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="bg-black/20 backdrop-blur-sm border-system text-primary-hierarchy font-body placeholder:text-medium-hierarchy rounded-full"
                      placeholder="Enter contact name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-primary-hierarchy font-body">
                      Property Address <span className="text-medium-hierarchy text-sm">(optional)</span>
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      className="bg-black/20 backdrop-blur-sm border-system text-primary-hierarchy font-body placeholder:text-medium-hierarchy rounded-full"
                      placeholder="Enter property address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-primary-hierarchy font-body">
                      Email <span className="text-medium-hierarchy text-sm">(optional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="bg-black/20 backdrop-blur-sm border-system text-primary-hierarchy font-body placeholder:text-medium-hierarchy rounded-full"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-primary-hierarchy font-body">
                      Phone <span className="text-medium-hierarchy text-sm">(optional)</span>
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="bg-black/20 backdrop-blur-sm border-system text-primary-hierarchy font-body placeholder:text-medium-hierarchy rounded-full"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-primary-hierarchy font-body">
                      Initial Status
                    </Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                      <SelectTrigger className="bg-black/20 backdrop-blur-sm border-system text-primary-hierarchy font-body rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 backdrop-blur-xl border-system rounded-3xl">
                        <SelectItem value="cold" className="rounded-full font-body">
                          Cold
                        </SelectItem>
                        <SelectItem value="contacted" className="rounded-full font-body">
                          Contacted
                        </SelectItem>
                        <SelectItem value="interested" className="rounded-full font-body">
                          Interested
                        </SelectItem>
                        <SelectItem value="closed" className="rounded-full font-body">
                          Closed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 border-system text-medium-hierarchy bg-transparent hover:bg-white/10 rounded-full font-body"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!formData.name.trim()}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full transition-all duration-200 font-body disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lead
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
