// ============================================================================
// ComfyUI React - Application State Store
// ============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  ComfyUIWorkflow,
  WorkflowMetadata,
  GenerationHistoryItem,
  TabType,
} from '@/types'

interface AppState {
  // State
  isGenerating: boolean
  currentWorkflow: ComfyUIWorkflow | null
  workflowMetadata: WorkflowMetadata | null
  generationHistory: GenerationHistoryItem[]
  activeTab: TabType

  // Actions
  setIsGenerating: (isGenerating: boolean) => void
  setCurrentWorkflow: (workflow: ComfyUIWorkflow | null) => void
  setWorkflowMetadata: (metadata: WorkflowMetadata | null) => void
  addToHistory: (item: GenerationHistoryItem) => void
  clearHistory: () => void
  removeFromHistory: (id: string) => void
  setActiveTab: (tab: TabType) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      set => ({
        // Initial state
        isGenerating: false,
        currentWorkflow: null,
        workflowMetadata: null,
        generationHistory: [],
        activeTab: 'generate',

        // Actions
        setIsGenerating: isGenerating =>
          set({ isGenerating }, false, 'setIsGenerating'),

        setCurrentWorkflow: currentWorkflow =>
          set({ currentWorkflow }, false, 'setCurrentWorkflow'),

        setWorkflowMetadata: workflowMetadata =>
          set({ workflowMetadata }, false, 'setWorkflowMetadata'),

        addToHistory: item =>
          set(
            state => ({
              generationHistory: [item, ...state.generationHistory].slice(
                0,
                100
              ), // Keep last 100 items
            }),
            false,
            'addToHistory'
          ),

        clearHistory: () =>
          set({ generationHistory: [] }, false, 'clearHistory'),

        removeFromHistory: id =>
          set(
            state => ({
              generationHistory: state.generationHistory.filter(
                item => item.id !== id
              ),
            }),
            false,
            'removeFromHistory'
          ),

        setActiveTab: activeTab => set({ activeTab }, false, 'setActiveTab'),
      }),
      {
        name: 'comfyui-app-store',
        partialize: state => ({
          generationHistory: state.generationHistory,
          activeTab: state.activeTab,
        }),
      }
    ),
    {
      name: 'ComfyUI App Store',
    }
  )
)
