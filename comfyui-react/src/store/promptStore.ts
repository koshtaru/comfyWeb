// ============================================================================
// ComfyUI React - Prompt Override Store
// ============================================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface PromptState {
  // State
  promptOverride: string
  usePromptOverride: boolean

  // Actions
  setPromptOverride: (prompt: string) => void
  setUsePromptOverride: (use: boolean) => void
  clearPromptOverride: () => void
}

export const usePromptStore = create<PromptState>()(
  devtools(
    (set) => ({
      // Initial state
      promptOverride: '',
      usePromptOverride: false,

      // Actions
      setPromptOverride: (promptOverride) =>
        set({ promptOverride }, false, 'setPromptOverride'),

      setUsePromptOverride: (usePromptOverride) =>
        set({ usePromptOverride }, false, 'setUsePromptOverride'),

      clearPromptOverride: () =>
        set(
          {
            promptOverride: '',
            usePromptOverride: false,
          },
          false,
          'clearPromptOverride'
        ),
    }),
    {
      name: 'ComfyUI Prompt Store',
    }
  )
)