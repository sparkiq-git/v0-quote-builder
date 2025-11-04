"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AppHeaderContent {
  title?: string
  subtitle?: string
  actions?: ReactNode
}

interface AppHeaderContextType {
  content: AppHeaderContent
  setContent: (content: AppHeaderContent) => void
}

const AppHeaderContext = createContext<AppHeaderContextType | undefined>(undefined)

export function AppHeaderProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<AppHeaderContent>({})

  return <AppHeaderContext.Provider value={{ content, setContent }}>{children}</AppHeaderContext.Provider>
}

export function useAppHeader() {
  const context = useContext(AppHeaderContext)
  if (!context) {
    throw new Error("useAppHeader must be used within AppHeaderProvider")
  }
  return context
}
