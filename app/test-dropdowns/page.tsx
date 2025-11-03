"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal } from "lucide-react"

// Micro reflow para SSR + webfonts: ayuda a Floating UI a recalcular posición en prod
const forceRecalc = () =>
  requestAnimationFrame(() =>
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")))
  )

export default function TestDropdownsPage() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen p-12 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold mb-4">Dropdown Test Page</h1>
          <p className="text-gray-600">
            Clean test page to isolate dropdown visibility issues. This page uses NO sidebar or layout components.
          </p>
        </div>

        {/* Test 1: Basic Dropdown */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-xl font-semibold">Test 1: Basic Dropdown Menu</h2>
          <DropdownMenu modal={false} onOpenChange={(open) => open && forceRecalc()}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Basic Dropdown
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Test 2: Dropdown in Table */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-xl font-semibold">Test 2: Dropdown in Table</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left">Name</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-4">Item {i}</td>
                    <td className="p-4">Active</td>
                    <td className="p-4 text-right">
                      <DropdownMenu modal={false} onOpenChange={(open) => open && forceRecalc()}>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          side="bottom"
                          sideOffset={8}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test 3: Select Component */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-xl font-semibold">Test 3: Select Component</h2>
          <Select modal={false}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={8}>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Test 4: Dropdown with State */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-xl font-semibold">Test 4: Dropdown with Interactive State</h2>
          <p>Counter: {count}</p>
          <div className="flex gap-4">
            <Button onClick={() => setCount(count + 1)}>Increment</Button>
            <DropdownMenu modal={false} onOpenChange={(open) => open && forceRecalc()}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Reset Counter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" sideOffset={8}>
                <DropdownMenuItem onClick={() => setCount(0)}>Reset to 0</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCount(10)}>Set to 10</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Test 5: Multiple Dropdowns */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-xl font-semibold">Test 5: Multiple Dropdowns</h2>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <DropdownMenu key={i} modal={false} onOpenChange={(open) => open && forceRecalc()}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Dropdown {i}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" sideOffset={8}>
                  <DropdownMenuItem>Action A from {i}</DropdownMenuItem>
                  <DropdownMenuItem>Action B from {i}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
