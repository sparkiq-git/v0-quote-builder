import { create } from "zustand"
import { shallow } from "zustand/shallow"
import { saveQuoteAll } from "@/lib/supabase/queries/quotes"

type QuoteState = {
  quote: any | null
  isDirty: boolean
  dirtyKeys: Set<keyof any>
  saving: boolean
  lastSaved: Date | null
  lastSnapshotJson: string | null

  load: (q: any) => void
  updatePart: (key: string, value: any) => void
  updateMany: (patch: Partial<any>) => void
  queueSave: () => Promise<void>
  forceSave: () => Promise<void>
  clearDirty: () => void
  reloadFromServer: (freshQuote: any) => void
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  quote: null,
  isDirty: false,
  dirtyKeys: new Set(),
  saving: false,
  lastSaved: null,
  lastSnapshotJson: null,

  load: (q) =>
    set({
      quote: q,
      isDirty: false,
      dirtyKeys: new Set(),
      lastSnapshotJson: JSON.stringify(q ?? null),
    }),

  updatePart: (key, value) =>
    set((state) => ({
      quote: { ...(state.quote ?? {}), [key]: value },
      isDirty: true,
      dirtyKeys: new Set([...state.dirtyKeys, key]),
    })),

  updateMany: (patch) =>
    set((state) => ({
      quote: { ...(state.quote ?? {}), ...patch },
      isDirty: true,
      dirtyKeys: new Set([...state.dirtyKeys, ...Object.keys(patch)]),
    })),

  queueSave: async () => {
    const { saving, isDirty, quote, lastSnapshotJson } = get()
    if (saving || !isDirty || !quote?.id) return

    const nowJson = JSON.stringify(quote)
    if (nowJson === lastSnapshotJson) {
      set({ isDirty: false })
      return
    }

    set({ saving: true })
    try {
      const refreshed = await saveQuoteAll(quote)
      get().reloadFromServer(refreshed)
    } catch (e) {
      set({ saving: false })
      throw e
    }
  },

  forceSave: async () => {
    const { saving, quote } = get()
    if (saving || !quote?.id) return
    set({ saving: true })
    try {
      const refreshed = await saveQuoteAll(quote)
      get().reloadFromServer(refreshed)
    } catch (e) {
      set({ saving: false })
      throw e
    }
  },

  reloadFromServer: (freshQuote) =>
    set({
      quote: freshQuote,
      isDirty: false,
      saving: false,
      lastSaved: new Date(),
      lastSnapshotJson: JSON.stringify(freshQuote),
      dirtyKeys: new Set(),
    }),

  clearDirty: () => set({ isDirty: false, dirtyKeys: new Set() }),
}))

export const useQuoteSlice = <T,>(selector: (s: QuoteState) => T) =>
  useQuoteStore(selector, shallow)
