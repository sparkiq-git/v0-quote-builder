export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

import { Suspense } from "react"
import { getServerUser } from "@/lib/supabase/server"
import { ContactsListClient } from "@/components/contacts/contacts-list-client"
import { ContactsPageLayout } from "@/components/contacts/contacts-page-layout"

export default async function ContactsManagementPage() {
  try {
    const { user } = await getServerUser()

    if (!user) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
            <p className="text-muted-foreground">
              Unable to verify your authentication. Please try refreshing the page.
            </p>
          </div>
        </div>
      )
    }

    return (
      <ContactsPageLayout>
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<div>Loading contacts...</div>}>
            <ContactsListClient />
          </Suspense>
        </main>
      </ContactsPageLayout>
    )
  } catch (error) {
    console.error("Contacts management page error:", error)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Page</h1>
          <p className="text-muted-foreground">
            There was an error loading the contacts management page. Please try refreshing or contact support.
          </p>
        </div>
      </div>
    )
  }
}
