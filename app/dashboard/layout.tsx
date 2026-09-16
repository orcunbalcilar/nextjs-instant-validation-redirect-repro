import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Suspense } from "react"

// The shape the Cache Components migration guide recommends: keep the
// request-bound read out of the layout's top level so the segment prerenders.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<p>loading shell…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  )
}

async function Shell({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  // An ordinary gate: no cookie, no dashboard. Deliberate control flow, not an error.
  if (!jar.get("seeded")) {
    redirect("/elsewhere")
  }
  return <main>{children}</main>
}
