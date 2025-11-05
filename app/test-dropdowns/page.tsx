"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SimpleDropdown } from "@/components/ui/simple-dropdown"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal } from "lucide-react"

export default function TestDropdownsPage() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen p-12 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6 space-y-4">
          <h1 className="text-2xl font-bold text-green-900">✅ Simple CSS Dropdowns</h1>
          <p className="text-green-800">
            These dropdowns use a simple CSS-based solution that works reliably in both development and production
            without SSR/hydration issues.
          </p>
        </div>

        {/* Test 1 - Basic Dropdown */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 1: Basic Dropdown Menu</h3>
          <SimpleDropdown
            trigger={
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Basic Dropdown
              </Button>
            }
            items={[
              { label: "My Account", type: "label" },
              { type: "separator" },
              { label: "Profile", onClick: () => console.log("Profile clicked") },
              { label: "Settings", onClick: () => console.log("Settings clicked") },
              { label: "Logout", onClick: () => console.log("Logout clicked") },
            ]}
          />
        </div>

        {/* Test 2 - Dropdown in Table */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 2: Dropdown in Table</h3>
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
                      <SimpleDropdown
                        trigger={
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                        items={[
                          { label: "Actions", type: "label" },
                          { label: "View", onClick: () => console.log(`View item ${i}`) },
                          { label: "Edit", onClick: () => console.log(`Edit item ${i}`) },
                          { type: "separator" },
                          {
                            label: "Delete",
                            onClick: () => console.log(`Delete item ${i}`),
                            variant: "destructive",
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test 3 - Select Component (unchanged) */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 3: Select Component</h3>
          <Select>
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

        {/* Test 4 - Dropdown with Interactive State */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 4: Dropdown with Interactive State</h3>
          <p>Counter: {count}</p>
          <div className="flex gap-4">
            <Button onClick={() => setCount((n) => n + 1)}>Increment</Button>
            <SimpleDropdown
              trigger={
                <Button variant="outline">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Reset Counter
                </Button>
              }
              items={[
                { label: "Reset to 0", onClick: () => setCount(0) },
                { label: "Set to 10", onClick: () => setCount(10) },
              ]}
            />
          </div>
        </div>

        {/* Test 5 - Multiple Dropdowns */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 5: Multiple Dropdowns</h3>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SimpleDropdown
                key={i}
                trigger={<Button variant="outline">Dropdown {i}</Button>}
                items={[
                  { label: `Action A from ${i}`, onClick: () => console.log(`Action A from ${i}`) },
                  { label: `Action B from ${i}`, onClick: () => console.log(`Action B from ${i}`) },
                ]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
