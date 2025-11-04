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
import { DropdownMenuClient } from "@/components/ui/dropdown-menu-client"
import { ClientOnly } from "@/components/ui/client-only"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal } from "lucide-react"

export default function TestDropdownsPage() {
  const [count, setCount] = useState(0)
  const [diagnosticResult, setDiagnosticResult] = useState<string>("")

  const runDiagnostic = () => {
    console.log("=== TEST DROPDOWNS ===")
    let result = "=== DIAGNOSTIC RESULTS ===\n\n"

    const triggers = document.querySelectorAll('[data-slot="dropdown-menu-trigger"]')
    console.log("Triggers encontrados:", triggers.length)
    result += `✓ Triggers encontrados: ${triggers.length}\n`
    triggers.forEach((t, i) => console.log(`#${i + 1}`, t))

    const contents = document.querySelectorAll('[data-slot="dropdown-menu-content"]')
    console.log("Dropdown contents encontrados:", contents.length)
    result += `${contents.length === 0 ? "❌" : "✓"} Dropdown contents encontrados: ${contents.length}\n\n`

    if (contents.length === 0) {
      result += "❌ PROBLEMA: El contenido nunca se monta\n"
      result += "👉 Posible causa: SSR / Portal no renderizado\n"
      result += "👉 Solución: Verificar que el componente tenga 'use client'\n"
    } else {
      contents.forEach((c, i) => {
        const rect = c.getBoundingClientRect()
        const styles = getComputedStyle(c)
        console.group(`Dropdown #${i + 1}`)
        console.log("Display:", styles.display)
        console.log("Opacity:", styles.opacity)
        console.log("Transform:", styles.transform)
        console.log("Z-index:", styles.zIndex)
        console.log("Bounding rect:", rect)
        console.groupEnd()

        result += `Dropdown #${i + 1}:\n`
        result += `  Display: ${styles.display}\n`
        result += `  Opacity: ${styles.opacity}\n`
        result += `  Transform: ${styles.transform}\n`
        result += `  Z-index: ${styles.zIndex}\n`
        result += `  Position: top=${rect.top.toFixed(0)}px, left=${rect.left.toFixed(0)}px\n`
        result += `  Size: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px\n`

        // Diagnose issues
        if (styles.display === "none") {
          result += "  ❌ PROBLEMA: Display none\n"
          result += "  👉 Tailwind purgó las clases de animación\n"
        }
        if (Number.parseFloat(styles.opacity) === 0) {
          result += "  ❌ PROBLEMA: Opacity 0\n"
          result += "  👉 Clases de animación no aplicadas\n"
        }
        if (rect.top < 0 || rect.top > window.innerHeight) {
          result += "  ❌ PROBLEMA: Fuera de pantalla verticalmente\n"
          result += "  👉 Floating UI posicionó incorrectamente\n"
        }
        if (rect.left < 0 || rect.left > window.innerWidth) {
          result += "  ❌ PROBLEMA: Fuera de pantalla horizontalmente\n"
          result += "  👉 Floating UI posicionó incorrectamente\n"
        }
        if (rect.height === 0) {
          result += "  ❌ PROBLEMA: Altura 0\n"
          result += "  👉 Contenido no renderizado correctamente\n"
        }
        result += "\n"
      })
    }

    console.log(result)
    setDiagnosticResult(result)
  }

  const forceVisible = () => {
    console.log("=== FORCING DROPDOWNS VISIBLE ===")
    let result = "Intentando forzar visibilidad...\n\n"

    const contents = document.querySelectorAll('[data-slot="dropdown-menu-content"]')
    if (contents.length === 0) {
      result += "❌ No hay dropdowns para forzar (no están en el DOM)\n"
      console.warn("No dropdowns found to force visible")
    } else {
      contents.forEach((el, i) => {
        const element = el as HTMLElement
        element.style.opacity = "1"
        element.style.pointerEvents = "auto"
        element.style.zIndex = "99999"
        element.style.transform = "translate(0, 40px)"
        element.style.position = "fixed"
        element.style.top = "100px"
        element.style.right = "20px"
        element.style.display = "block"
        console.log("Dropdown forzado visible:", el)
        result += `✓ Dropdown #${i + 1} forzado visible\n`
      })
      result += "\n👉 Si ahora ves los menús, el problema es de posicionamiento/estilos\n"
      result += "👉 Si aún no los ves, el problema es más profundo (DOM/React)\n"
    }

    console.log(result)
    setDiagnosticResult(result)
  }

  return (
    <div className="min-h-screen p-12 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 space-y-4">
          <h1 className="text-2xl font-bold text-yellow-900">🔍 Diagnostic Panel</h1>
          <p className="text-yellow-800">
            <strong>Instrucciones:</strong>
          </p>
          <ol className="list-decimal list-inside text-yellow-800 space-y-2">
            <li>Haz clic en cualquier botón de dropdown (⋯) abajo</li>
            <li>Luego haz clic en "Run Diagnostic" para ver qué está pasando</li>
            <li>Si no ves el menú, haz clic en "Force Visible" para probar si existe pero está oculto</li>
            <li>Revisa la consola del navegador para más detalles</li>
          </ol>

          <div className="flex gap-4">
            <Button onClick={runDiagnostic} variant="default" className="bg-yellow-600 hover:bg-yellow-700">
              Run Diagnostic
            </Button>
            <Button
              onClick={forceVisible}
              variant="outline"
              className="border-yellow-600 text-yellow-900 bg-transparent"
            >
              Force Visible
            </Button>
          </div>

          {diagnosticResult && (
            <pre className="bg-white p-4 rounded border border-yellow-300 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {diagnosticResult}
            </pre>
          )}
        </div>

        {/* Test 0 - Added new test using DropdownMenuClient wrapper */}
        <div className="bg-green-50 p-8 rounded-lg shadow-sm border-2 border-green-400 space-y-4">
          <h3 className="text-xl font-semibold text-green-900">Test 0: DropdownMenuClient Wrapper (NEW)</h3>
          <p className="text-green-800 text-sm">
            This uses the new DropdownMenuClient wrapper that encapsulates the entire Radix tree in a client component.
          </p>
          <DropdownMenuClient
            trigger={
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Client Wrapper Dropdown
              </Button>
            }
          >
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuClient>
        </div>

        {/* Test 1 - Wrapped in ClientOnly */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 1: Basic Dropdown Menu (with ClientOnly)</h3>
          <ClientOnly>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Basic Dropdown
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" sideOffset={8}>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ClientOnly>
        </div>

        {/* Test 2 - Updated to use DropdownMenuClient */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 2: Dropdown in Table (with DropdownMenuClient)</h3>
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
                      <DropdownMenuClient
                        trigger={
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                      </DropdownMenuClient>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test 3 */}
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

        {/* Test 4 - Wrapped in ClientOnly */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 4: Dropdown with Interactive State (with ClientOnly)</h3>
          <p>Counter: {count}</p>
          <div className="flex gap-4">
            <Button onClick={() => setCount((n) => n + 1)}>Increment</Button>
            <ClientOnly>
              <DropdownMenu>
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
            </ClientOnly>
          </div>
        </div>

        {/* Test 5 - Updated to use DropdownMenuClient */}
        <div className="bg-white p-8 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-xl font-semibold">Test 5: Multiple Dropdowns (with DropdownMenuClient)</h3>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <DropdownMenuClient key={i} trigger={<Button variant="outline">Dropdown {i}</Button>}>
                <DropdownMenuItem>Action A from {i}</DropdownMenuItem>
                <DropdownMenuItem>Action B from {i}</DropdownMenuItem>
              </DropdownMenuClient>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
