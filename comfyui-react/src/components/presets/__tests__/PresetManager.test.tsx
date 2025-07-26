// ============================================================================
// ComfyUI React - PresetManager Component Tests
// ============================================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PresetManager } from '../PresetManager'
import type { IPreset, IPresetStorageInfo } from '@/types/preset'

// Mock the preset store
jest.mock('@/store/presetStore', () => ({
  usePresetStore: () => ({
    presets: mockPresets,
    loading: false,
    error: null,
    createPreset: jest.fn(),
    updatePreset: jest.fn(),
    deletePreset: jest.fn(),
    loadPresets: jest.fn(),
    searchPresets: jest.fn().mockReturnValue(mockPresets),
    getPresetsByCategory: jest.fn(),
    exportPresets: jest.fn(),
    importPresets: jest.fn()
  })
}))

// Mock the storage monitor service
jest.mock('@/services/storageMonitor', () => ({
  storageMonitorService: {
    analyzePresetStorage: jest.fn().mockResolvedValue(mockStorageInfo),
    generateStorageAnalysis: jest.fn().mockResolvedValue(mockStorageAnalysis)
  }
}))

// Mock child components
jest.mock('../PresetCard', () => ({
  PresetCard: ({ preset, onEdit, onDelete, onDuplicate }: any) => (
    <div data-testid={`preset-card-${preset.id}`}>
      <h3>{preset.name}</h3>
      <button onClick={() => onEdit(preset)}>Edit</button>
      <button onClick={() => onDelete(preset.id)}>Delete</button>
      <button onClick={() => onDuplicate(preset)}>Duplicate</button>
    </div>
  )
}))

jest.mock('../PresetSaveDialog', () => ({
  PresetSaveDialog: ({ onSave, onClose }: any) => (
    <div data-testid="preset-save-dialog">
      <button onClick={() => onSave(mockNewPreset)}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  )
}))

jest.mock('../PresetStorageIndicator', () => ({
  PresetStorageIndicator: ({ onClose }: any) => (
    <div data-testid="storage-indicator">
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

jest.mock('../PresetImportExport', () => ({
  PresetImportExport: ({ onClose, onImport }: any) => (
    <div data-testid="import-export-dialog">
      <button onClick={() => onImport([mockNewPreset])}>Import</button>
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

const mockPresets: IPreset[] = [
  {
    id: 'preset1',
    name: 'Test Preset 1',
    description: 'A test preset',
    createdAt: new Date('2024-01-01'),
    lastModified: new Date('2024-01-15'),
    workflowData: { nodes: {}, links: [], groups: [], config: {}, extra: {}, version: 0.4 },
    metadata: {
      model: { name: 'test-model', architecture: 'SD1.5' },
      generation: { steps: 20, cfg: 7, sampler: 'euler', scheduler: 'normal', seed: 123 },
      dimensions: { width: 512, height: 512, batchSize: 1 },
      prompts: { positive: 'beautiful landscape', negative: 'blurry' }
    },
    compressed: true,
    size: 50000,
    tags: ['landscape', 'test'],
    category: 'custom',
    version: '1.0.0'
  },
  {
    id: 'preset2',
    name: 'Quality Preset',
    createdAt: new Date('2024-01-05'),
    lastModified: new Date('2024-01-20'),
    workflowData: { nodes: {}, links: [], groups: [], config: {}, extra: {}, version: 0.4 },
    metadata: {
      model: { name: 'quality-model', architecture: 'SDXL' },
      generation: { steps: 30, cfg: 8, sampler: 'dpmpp_2m', scheduler: 'karras', seed: 456 },
      dimensions: { width: 1024, height: 1024, batchSize: 1 },
      prompts: { positive: 'high quality art', negative: 'low quality' }
    },
    compressed: false,
    size: 120000,
    tags: ['quality', 'art'],
    category: 'quality',
    version: '1.0.0'
  }
]

const mockStorageInfo: IPresetStorageInfo = {
  totalSize: 170000,
  presetCount: 2,
  compressionRatio: 0.7,
  availableSpace: 50000000,
  quotaUsagePercent: 25,
  needsCleanup: false
}

const mockStorageAnalysis = {
  storageMetrics: {
    quota: 100000000,
    usage: 25000000,
    usagePercent: 25,
    available: 75000000,
    localStorageUsage: 200000
  },
  presetAnalysis: mockStorageInfo,
  optimizationRecommendations: ['Consider compressing large presets'],
  cleanupSuggestions: [],
  compressionOpportunities: [{
    id: 'preset2',
    name: 'Quality Preset',
    currentSize: 120000,
    potentialSavings: 60000
  }],
  largestPresets: [{
    id: 'preset2',
    name: 'Quality Preset',
    size: 120000,
    compressionRatio: 1
  }]
}

const mockNewPreset = {
  name: 'New Preset',
  workflowData: { nodes: {}, links: [], groups: [], config: {}, extra: {}, version: 0.4 },
  metadata: mockPresets[0].metadata,
  compressed: true,
  tags: ['new'],
  category: 'custom' as const,
  version: '1.0.0'
}

describe('PresetManager', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the preset manager with default view', () => {
      render(<PresetManager />)

      expect(screen.getByText('Preset Manager')).toBeInTheDocument()
      expect(screen.getByText('My Presets')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Import/Export')).toBeInTheDocument()
    })

    it('should display preset cards in grid view', () => {
      render(<PresetManager />)

      expect(screen.getByTestId('preset-card-preset1')).toBeInTheDocument()
      expect(screen.getByTestId('preset-card-preset2')).toBeInTheDocument()
      expect(screen.getByText('Test Preset 1')).toBeInTheDocument()
      expect(screen.getByText('Quality Preset')).toBeInTheDocument()
    })

    it('should show preset count and storage info', async () => {
      render(<PresetManager />)

      await waitFor(() => {
        expect(screen.getByText(/2 presets/)).toBeInTheDocument()
        expect(screen.getByText(/166 KB total/)).toBeInTheDocument()
      })
    })
  })

  describe('view switching', () => {
    it('should switch between grid and list view', async () => {
      render(<PresetManager />)

      const listViewButton = screen.getByRole('button', { name: /list view/i })
      await user.click(listViewButton)

      expect(screen.getByTestId('preset-list')).toBeInTheDocument()

      const gridViewButton = screen.getByRole('button', { name: /grid view/i })
      await user.click(gridViewButton)

      expect(screen.getByTestId('preset-grid')).toBeInTheDocument()
    })

    it('should switch between different tabs', async () => {
      render(<PresetManager />)

      // Switch to Analytics tab
      const analyticsTab = screen.getByRole('button', { name: 'Analytics' })
      await user.click(analyticsTab)

      await waitFor(() => {
        expect(screen.getByTestId('storage-indicator')).toBeInTheDocument()
      })

      // Switch to Import/Export tab
      const importExportTab = screen.getByRole('button', { name: 'Import/Export' })
      await user.click(importExportTab)

      expect(screen.getByTestId('import-export-dialog')).toBeInTheDocument()
    })
  })

  describe('search and filtering', () => {
    it('should filter presets by search query', async () => {
      render(<PresetManager />)

      const searchInput = screen.getByPlaceholderText(/search presets/i)
      await user.type(searchInput, 'Quality')

      // Should show only the Quality Preset
      expect(screen.getByTestId('preset-card-preset2')).toBeInTheDocument()
      expect(screen.queryByTestId('preset-card-preset1')).not.toBeInTheDocument()
    })

    it('should filter presets by category', async () => {
      render(<PresetManager />)

      const categorySelect = screen.getByDisplayValue('All Categories')
      await user.selectOptions(categorySelect, 'quality')

      expect(screen.getByTestId('preset-card-preset2')).toBeInTheDocument()
      expect(screen.queryByTestId('preset-card-preset1')).not.toBeInTheDocument()
    })

    it('should filter presets by tags', async () => {
      render(<PresetManager />)

      const tagButton = screen.getByText('landscape')
      await user.click(tagButton)

      expect(screen.getByTestId('preset-card-preset1')).toBeInTheDocument()
      expect(screen.queryByTestId('preset-card-preset2')).not.toBeInTheDocument()
    })

    it('should clear all filters', async () => {
      render(<PresetManager />)

      // Apply filters
      const searchInput = screen.getByPlaceholderText(/search presets/i)
      await user.type(searchInput, 'Quality')

      const clearButton = screen.getByRole('button', { name: /clear filters/i })
      await user.click(clearButton)

      // Should show all presets again
      expect(screen.getByTestId('preset-card-preset1')).toBeInTheDocument()
      expect(screen.getByTestId('preset-card-preset2')).toBeInTheDocument()
    })
  })

  describe('sorting', () => {
    it('should sort presets by different criteria', async () => {
      render(<PresetManager />)

      const sortSelect = screen.getByDisplayValue('Name')
      await user.selectOptions(sortSelect, 'lastModified')

      // The order should change (Quality Preset was modified more recently)
      const presetCards = screen.getAllByTestId(/preset-card-/)
      expect(presetCards[0]).toHaveAttribute('data-testid', 'preset-card-preset2')
    })

    it('should toggle sort order', async () => {
      render(<PresetManager />)

      const sortOrderButton = screen.getByRole('button', { name: /sort order/i })
      await user.click(sortOrderButton)

      // Order should be reversed
      const presetCards = screen.getAllByTestId(/preset-card-/)
      expect(presetCards[0]).toHaveAttribute('data-testid', 'preset-card-preset2')
    })
  })

  describe('preset operations', () => {
    it('should open save dialog when creating preset', async () => {
      render(<PresetManager />)

      const newPresetButton = screen.getByRole('button', { name: /new preset/i })
      await user.click(newPresetButton)

      expect(screen.getByTestId('preset-save-dialog')).toBeInTheDocument()
    })

    it('should handle preset editing', async () => {
      render(<PresetManager />)

      const editButton = screen.getAllByText('Edit')[0]
      await user.click(editButton)

      expect(screen.getByTestId('preset-save-dialog')).toBeInTheDocument()
    })

    it('should handle preset deletion with confirmation', async () => {
      render(<PresetManager />)

      const deleteButton = screen.getAllByText('Delete')[0]
      await user.click(deleteButton)

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      // Preset should be deleted (mocked)
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })

    it('should handle preset duplication', async () => {
      render(<PresetManager />)

      const duplicateButton = screen.getAllByText('Duplicate')[0]
      await user.click(duplicateButton)

      expect(screen.getByTestId('preset-save-dialog')).toBeInTheDocument()
    })
  })

  describe('bulk operations', () => {
    it('should select multiple presets', async () => {
      render(<PresetManager />)

      // Enable bulk selection mode
      const bulkSelectButton = screen.getByRole('button', { name: /bulk select/i })
      await user.click(bulkSelectButton)

      // Select presets
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      expect(screen.getByText(/2 selected/i)).toBeInTheDocument()
    })

    it('should delete multiple presets', async () => {
      render(<PresetManager />)

      const bulkSelectButton = screen.getByRole('button', { name: /bulk select/i })
      await user.click(bulkSelectButton)

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      const deleteSelectedButton = screen.getByRole('button', { name: /delete selected/i })
      await user.click(deleteSelectedButton)

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })

    it('should export selected presets', async () => {
      render(<PresetManager />)

      const bulkSelectButton = screen.getByRole('button', { name: /bulk select/i })
      await user.click(bulkSelectButton)

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      const exportSelectedButton = screen.getByRole('button', { name: /export selected/i })
      await user.click(exportSelectedButton)

      // Should trigger export functionality
      expect(exportSelectedButton).toBeInTheDocument()
    })
  })

  describe('storage analytics', () => {
    it('should display storage analytics in Analytics tab', async () => {
      render(<PresetManager />)

      const analyticsTab = screen.getByRole('button', { name: 'Analytics' })
      await user.click(analyticsTab)

      await waitFor(() => {
        expect(screen.getByTestId('storage-indicator')).toBeInTheDocument()
      })
    })

    it('should close storage indicator', async () => {
      render(<PresetManager />)

      const analyticsTab = screen.getByRole('button', { name: 'Analytics' })
      await user.click(analyticsTab)

      await waitFor(() => {
        const closeButton = screen.getByText('Close')
        fireEvent.click(closeButton)
      })

      expect(screen.queryByTestId('storage-indicator')).not.toBeInTheDocument()
    })
  })

  describe('import/export', () => {
    it('should handle preset import', async () => {
      render(<PresetManager />)

      const importExportTab = screen.getByRole('button', { name: 'Import/Export' })
      await user.click(importExportTab)

      const importButton = screen.getByText('Import')
      await user.click(importButton)

      // Should handle import (mocked)
      expect(importButton).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should display error message when loading fails', () => {
      // Mock error state
      jest.mocked(require('@/store/presetStore').usePresetStore).mockReturnValueOnce({
        presets: [],
        loading: false,
        error: 'Failed to load presets',
        createPreset: jest.fn(),
        updatePreset: jest.fn(),
        deletePreset: jest.fn(),
        loadPresets: jest.fn(),
        searchPresets: jest.fn(),
        getPresetsByCategory: jest.fn(),
        exportPresets: jest.fn(),
        importPresets: jest.fn()
      })

      render(<PresetManager />)

      expect(screen.getByText(/failed to load presets/i)).toBeInTheDocument()
    })

    it('should display loading state', () => {
      // Mock loading state
      jest.mocked(require('@/store/presetStore').usePresetStore).mockReturnValueOnce({
        presets: [],
        loading: true,
        error: null,
        createPreset: jest.fn(),
        updatePreset: jest.fn(),
        deletePreset: jest.fn(),
        loadPresets: jest.fn(),
        searchPresets: jest.fn(),
        getPresetsByCategory: jest.fn(),
        exportPresets: jest.fn(),
        importPresets: jest.fn()
      })

      render(<PresetManager />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should handle empty preset collection', () => {
      // Mock empty state
      jest.mocked(require('@/store/presetStore').usePresetStore).mockReturnValueOnce({
        presets: [],
        loading: false,
        error: null,
        createPreset: jest.fn(),
        updatePreset: jest.fn(),
        deletePreset: jest.fn(),
        loadPresets: jest.fn(),
        searchPresets: jest.fn().mockReturnValue([]),
        getPresetsByCategory: jest.fn(),
        exportPresets: jest.fn(),
        importPresets: jest.fn()
      })

      render(<PresetManager />)

      expect(screen.getByText(/no presets found/i)).toBeInTheDocument()
      expect(screen.getByText(/create your first preset/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PresetManager />)

      expect(screen.getByLabelText(/search presets/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category filter/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(<PresetManager />)

      const firstTab = screen.getByRole('button', { name: 'My Presets' })
      firstTab.focus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('button', { name: 'Analytics' })).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('button', { name: 'Import/Export' })).toHaveFocus()
    })
  })

  describe('responsive behavior', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<PresetManager />)

      // Should show mobile-optimized layout
      expect(screen.getByTestId('preset-grid')).toHaveClass('mobile-grid')
    })
  })
})