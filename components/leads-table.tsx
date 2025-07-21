"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  getSortedRowModel,
} from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { MapPin, ArrowUpDown, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { colors } from "@/lib/colors"

export interface Lead {
  id: string
  name: string
  phone: string
  email: string
  address: string
  status: "cold" | "contacted" | "interested" | "closed"
  lastInteraction: string
  notes: Array<{
    id: string
    text: string
    timestamp: string
    type: "call" | "email" | "note"
  }>
}

interface LeadsTableProps {
  leads: Lead[]
  onLeadUpdate: (leadId: string, updates: Partial<Lead>) => void
  onLeadSelect: (lead: Lead) => void
  sortByRecent?: boolean
}

const columnHelper = createColumnHelper<Lead>()

export function LeadsTable({ leads, onLeadUpdate, onLeadSelect, sortByRecent = false }: LeadsTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])

  // Sort leads by most recent interaction if requested
  const sortedLeads = useMemo(() => {
    if (!sortByRecent) return leads

    return [...leads].sort((a, b) => {
      const aLastNote = a.notes.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())[0]
      const bLastNote = b.notes.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())[0]

      const aTime = aLastNote ? new Date(aLastNote.timestamp).getTime() : 0
      const bTime = bLastNote ? new Date(bLastNote.timestamp).getTime() : 0

      return bTime - aTime
    })
  }, [leads, sortByRecent])

  const columns = useMemo<ColumnDef<Lead, any>[]>(
    () => [
      columnHelper.accessor("name", {
        header: ({ column }) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                  className="text-medium-hierarchy font-body hover:text-primary-hierarchy p-0"
                >
                  Contact
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                  <Info className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black/90 backdrop-blur-xl border-system rounded-2xl">
                <p className="font-body">Sort contacts alphabetically by name</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        cell: ({ getValue, row, column }) => {
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
          const value = getValue()

          if (isEditing) {
            return (
              <Input
                defaultValue={value}
                className="bg-black/20 backdrop-blur-sm border-system text-primary-hierarchy font-body text-sm rounded-full"
                onBlur={(e) => {
                  onLeadUpdate(row.original.id, { name: e.target.value })
                  setEditingCell(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onLeadUpdate(row.original.id, { name: e.currentTarget.value })
                    setEditingCell(null)
                  }
                }}
                autoFocus
              />
            )
          }

          return (
            <div className="space-y-1">
              <div
                className="text-primary-hierarchy font-title cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all duration-200"
                onDoubleClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
              >
                {value}
              </div>
              <div className="text-medium-hierarchy font-body text-sm">{row.original.email}</div>
            </div>
          )
        },
      }),
      columnHelper.accessor("address", {
        header: "Property Address",
        cell: ({ getValue, row, column }) => {
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
          const value = getValue()

          if (isEditing) {
            return (
              <Input
                defaultValue={value}
                className="bg-black/20 backdrop-blur-sm border-system text-primary-hierarchy font-body text-sm rounded-full"
                onBlur={(e) => {
                  onLeadUpdate(row.original.id, { address: e.target.value })
                  setEditingCell(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onLeadUpdate(row.original.id, { address: e.currentTarget.value })
                    setEditingCell(null)
                  }
                }}
                autoFocus
              />
            )
          }

          return (
            <div
              className="flex items-start gap-2 cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all duration-200 group"
              onDoubleClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
            >
              <MapPin className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="text-primary-hierarchy font-body leading-tight">{value}</div>
            </div>
          )
        },
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: ({ getValue, row, column }) => {
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
          const value = getValue()

          if (isEditing) {
            return (
              <Input
                defaultValue={value}
                className="bg-black/20 backdrop-blur-sm border-system text-primary-hierarchy font-body text-sm rounded-full"
                onBlur={(e) => {
                  onLeadUpdate(row.original.id, { phone: e.target.value })
                  setEditingCell(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onLeadUpdate(row.original.id, { phone: e.currentTarget.value })
                    setEditingCell(null)
                  }
                }}
                autoFocus
              />
            )
          }

          return (
            <div
              className="text-primary-hierarchy font-body cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all duration-200"
              onDoubleClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
            >
              {value}
            </div>
          )
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue, row }) => {
          const status = getValue()
          const statusColor = colors.status[status as keyof typeof colors.status] ?? {
            bg: "bg-gray-500/10",
            text: "text-gray-300",
            border: "border-gray-500/20",
            icon: "#6b7280", // Gray-500
          }
          return (
            <Select
              value={status}
              onValueChange={(newStatus) => onLeadUpdate(row.original.id, { status: newStatus as Lead["status"] })}
            >
              <SelectTrigger className="w-32 bg-transparent border-none p-0">
                <Badge
                  className={`${statusColor?.bg ?? "bg-gray-500/10"} ${statusColor?.text ?? "text-gray-300"} ${
                    statusColor?.border ?? "border-gray-500/20"
                  } rounded-full px-4 py-1.5 font-body`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border-system rounded-3xl">
                {Object.entries(colors.status).map(([key, color]) => (
                  <SelectItem key={key} value={key} className="rounded-full font-body">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color.icon }} />
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        },
      }),
      columnHelper.accessor("lastInteraction", {
        header: ({ column }) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                  className="text-medium-hierarchy font-body hover:text-primary-hierarchy p-0"
                >
                  Last Contact
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                  <Info className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black/90 backdrop-blur-xl border-system rounded-2xl">
                <p className="font-body">Sort by most recent interaction date</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        cell: ({ getValue, row }) => {
          const lastNote = row.original.notes.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )[0]
          const daysSince = lastNote
            ? Math.floor((new Date().getTime() - new Date(lastNote.timestamp).getTime()) / (1000 * 60 * 60 * 24))
            : null

          return (
            <div className="text-medium-hierarchy font-body text-sm">
              {getValue()}
              {daysSince !== null && (
                <div className="text-xs">{daysSince === 0 ? "Today" : `${daysSince} days ago`}</div>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLeadSelect(row.original)}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-full px-4 py-2 transition-all duration-200 font-body"
          >
            View Details
          </Button>
        ),
      }),
    ],
    [editingCell, onLeadUpdate, onLeadSelect],
  )

  const table = useReactTable({
    data: sortedLeads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-black/20 backdrop-blur-xl border-system rounded-3xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/5">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="text-left p-6 text-sm font-body text-medium-hierarchy">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <motion.tr
                key={row.id}
                className="border-b border-white/5 hover:bg-white/5 transition-all duration-200 cursor-pointer"
                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-6">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
