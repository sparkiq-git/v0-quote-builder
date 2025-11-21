"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Palette, Building2, SettingsIcon } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"

// Prevent static generation - this page requires client-side only mock store
export const dynamic = "force-dynamic"

export default function SettingsPage() {
  const { state, dispatch } = useMockStore()
  const { toast } = useToast()
  // Safely access companies array - may not exist in mock store during static generation
  const company = (state.companies && Array.isArray(state.companies) && state.companies.length > 0) 
    ? state.companies[0] 
    : null

  const [brandingSettings, setBrandingSettings] = useState({
    primaryColor: company?.primaryColor || "#2563eb",
    logo: company?.logo || "",
  })

  const handleBrandingUpdate = (updates: Partial<typeof brandingSettings>) => {
    const newSettings = { ...brandingSettings, ...updates }
    setBrandingSettings(newSettings)

    // Update company branding in store
    if (company) {
      dispatch({
        type: "UPDATE_COMPANY",
        payload: {
          id: company.id,
          updates: {
            primaryColor: newSettings.primaryColor,
            logo: newSettings.logo,
          },
        },
      })
    }

    toast({
      title: "Branding updated",
      description: "Your branding settings have been saved and will apply to all new quotes.",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your company settings and branding preferences.</p>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding & Customization
              </CardTitle>
              <CardDescription>
                Customize the appearance of your quotes and company branding. These settings will apply to all new
                quotes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={brandingSettings.primaryColor}
                      onChange={(e) => handleBrandingUpdate({ primaryColor: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={brandingSettings.primaryColor}
                      onChange={(e) => handleBrandingUpdate({ primaryColor: e.target.value })}
                      placeholder="#2563eb"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This color will be used for buttons, headers, and accent elements in your quotes.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Company Logo</Label>
                  <Input
                    value={brandingSettings.logo}
                    onChange={(e) => handleBrandingUpdate({ logo: e.target.value })}
                    placeholder="Logo URL or upload functionality (demo)"
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    Logo upload functionality is available in the full version.
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Preview</h4>
                <div className="border rounded-lg p-4" style={{ borderColor: brandingSettings.primaryColor }}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: brandingSettings.primaryColor }} />
                    <div>
                      <h3 className="font-semibold" style={{ color: brandingSettings.primaryColor }}>
                        {company?.name || "Brokers Portal"}
                      </h3>
                      <p className="text-sm text-muted-foreground">Charter Quote</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This is how your quote header will appear to customers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Manage your company details and contact information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Company Name</Label>
                <Input value={company?.name || "Brokers Portal"} disabled />
                <p className="text-sm text-muted-foreground">
                  Company information management is available in the full version.
                </p>
              </div>

              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Company Settings</h3>
                <p className="text-muted-foreground mb-4">
                  Full company management features including contact details, billing information, and team management.
                </p>
                <Badge variant="outline">Available in Full Version</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                User Preferences
              </CardTitle>
              <CardDescription>Customize your application preferences and defaults.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <SettingsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">User Preferences</h3>
                <p className="text-muted-foreground mb-4">
                  Notification settings, default values, and personal preferences.
                </p>
                <Badge variant="outline">Available in Full Version</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
