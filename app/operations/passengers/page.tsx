import { PassengersPageLayout } from "@/components/passengers/passengers-page-layout"
import { PassengersListClient } from "@/components/passengers/passengers-list-client"

export default async function PassengersPage() {
  return (
    <PassengersPageLayout>
      <PassengersListClient />
    </PassengersPageLayout>
  )
}
