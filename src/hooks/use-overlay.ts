'use client'

import { create } from 'zustand'

interface OverlayState {
  /** Número de overlays ativos (modais, command palette, sheets) */
  activeOverlays: number
  /** Registra que um overlay foi aberto */
  openOverlay: () => void
  /** Registra que um overlay foi fechado */
  closeOverlay: () => void
  /** Retorna true se há algum overlay ativo */
  hasActiveOverlay: () => boolean
}

export const useOverlay = create<OverlayState>()((set, get) => ({
  activeOverlays: 0,
  openOverlay: () => set((state) => ({ activeOverlays: state.activeOverlays + 1 })),
  closeOverlay: () =>
    set((state) => ({ activeOverlays: Math.max(0, state.activeOverlays - 1) })),
  hasActiveOverlay: () => get().activeOverlays > 0,
}))
