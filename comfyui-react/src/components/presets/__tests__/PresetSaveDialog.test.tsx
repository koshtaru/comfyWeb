// ============================================================================
// ComfyUI React - PresetSaveDialog Component Tests
// ============================================================================

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PresetSaveDialog } from '../PresetSaveDialog'
import type { ComfyUIWorkflow } from '@/types'

// Mock compression service
jest.mock('@/utils/compression', () => ({
  compressionService: {
    compressWorkflow: jest.fn().mockResolvedValue({
      originalSize: 100000,
      compressedSize: 30000,
      ratio: 0.3
    })
  }
}))

const mockWorkflowData: ComfyUIWorkflow = {
  nodes: {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: 'model.safetensors'
      }
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: 'beautiful landscape',
        clip: ['1', 1]
      }
    }
  },
  links: [],
  groups: [],
  config: {},
  extra: {},
  version: 0.4
}

describe('PresetSaveDialog', () => {
  const user = userEvent.setup()
  const mockOnSave = jest.fn()
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the dialog with form fields', () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      expect(screen.getByText('Save New Preset')).toBeInTheDocument()
      expect(screen.getByLabelText('Preset Name *')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Tags')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Enable compression')).toBeInTheDocument()
    })

    it('should populate form with initial data', () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
          initialData={{
            name: 'Test Preset',
            category: 'quality',
            tags: ['test', 'landscape']
          }}
        />
      )

      expect(screen.getByDisplayValue('Test Preset')).toBeInTheDocument()
      expect(screen.getByDisplayValue('quality')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test, landscape')).toBeInTheDocument()
    })

    it('should show compression preview when enabled', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Original size:')).toBeInTheDocument()
        expect(screen.getByText('Compressed size:')).toBeInTheDocument()
        expect(screen.getByText('Space saved:')).toBeInTheDocument()
        expect(screen.getByText('97.7 KB')).toBeInTheDocument() // Original size
        expect(screen.getByText('29.3 KB')).toBeInTheDocument() // Compressed size
        expect(screen.getByText('70.0%')).toBeInTheDocument() // Space saved
      })
    })
  })

  describe('form validation', () => {
    it('should show error for empty name', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.clear(nameInput)

      await waitFor(() => {
        expect(screen.getByText('Preset name is required')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: 'Save Preset' })
      expect(saveButton).toBeDisabled()
    })

    it('should show error for name too short', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.clear(nameInput)
      await user.type(nameInput, 'ab')

      await waitFor(() => {
        expect(screen.getByText('Preset name must be at least 3 characters long')).toBeInTheDocument()
      })
    })

    it('should show error for name too long', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.clear(nameInput)
      await user.type(nameInput, 'a'.repeat(51))

      await waitFor(() => {
        expect(screen.getByText('Preset name must be less than 50 characters')).toBeInTheDocument()
      })
    })

    it('should show warning for special characters in name', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.clear(nameInput)
      await user.type(nameInput, 'Test@Preset#')

      await waitFor(() => {
        expect(screen.getByText('Preset name contains special characters that may cause issues')).toBeInTheDocument()
      })
    })

    it('should show warning for too many tags', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const tagsInput = screen.getByLabelText('Tags')
      await user.type(tagsInput, Array.from({ length: 12 }, (_, i) => `tag${i}`).join(', '))

      await waitFor(() => {
        expect(screen.getByText('Consider using fewer than 10 tags for better organization')).toBeInTheDocument()
      })
    })

    it('should show warning for long tags', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const tagsInput = screen.getByLabelText('Tags')
      await user.type(tagsInput, 'very-long-tag-that-exceeds-twenty-characters')

      await waitFor(() => {
        expect(screen.getByText('Some tags are very long - consider shortening them')).toBeInTheDocument()
      })
    })

    it('should show warning for duplicate tags', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const tagsInput = screen.getByLabelText('Tags')
      await user.type(tagsInput, 'test, landscape, test')

      await waitFor(() => {
        expect(screen.getByText('Duplicate tags detected - they will be removed')).toBeInTheDocument()
      })
    })

    it('should show suggestions for missing optional fields', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.type(nameInput, 'Valid Preset Name')

      await waitFor(() => {
        expect(screen.getByText('Consider adding tags to help organize and find this preset later')).toBeInTheDocument()
        expect(screen.getByText('Adding a description helps remember what this preset is for')).toBeInTheDocument()
      })
    })
  })

  describe('character counting', () => {
    it('should show character count for name field', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.type(nameInput, 'Test')

      expect(screen.getByText('4/50')).toBeInTheDocument()
    })

    it('should show character count for description field', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const descriptionInput = screen.getByLabelText('Description')
      await user.type(descriptionInput, 'Test description')

      expect(screen.getByText('16/200')).toBeInTheDocument()
    })
  })

  describe('compression handling', () => {
    it('should toggle compression preview when checkbox is changed', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const compressionCheckbox = screen.getByLabelText('Enable compression')
      
      // Initially should show preview
      await waitFor(() => {
        expect(screen.getByText('Original size:')).toBeInTheDocument()
      })

      // Uncheck compression
      await user.click(compressionCheckbox)

      // Preview should disappear
      expect(screen.queryByText('Original size:')).not.toBeInTheDocument()

      // Check compression again
      await user.click(compressionCheckbox)

      // Preview should reappear
      await waitFor(() => {
        expect(screen.getByText('Original size:')).toBeInTheDocument()
      })
    })

    it('should handle compression preview errors gracefully', async () => {
      const compressionService = require('@/utils/compression').compressionService
      compressionService.compressWorkflow.mockRejectedValueOnce(new Error('Compression failed'))

      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      // Should not show preview on error
      await waitFor(() => {
        expect(screen.queryByText('Original size:')).not.toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('should call onSave with correct data when form is valid', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.type(nameInput, 'Test Preset')

      const categorySelect = screen.getByLabelText('Category')
      await user.selectOptions(categorySelect, 'quality')

      const tagsInput = screen.getByLabelText('Tags')
      await user.type(tagsInput, 'test, landscape')

      const descriptionInput = screen.getByLabelText('Description')
      await user.type(descriptionInput, 'A test preset for landscapes')

      const saveButton = screen.getByRole('button', { name: 'Save Preset' })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Test Preset',
        description: 'A test preset for landscapes',
        workflowData: mockWorkflowData,
        metadata: expect.any(Object),
        compressed: true,
        tags: ['test', 'landscape'],
        category: 'quality',
        version: '1.0.0'
      })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should remove duplicate tags before saving', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.type(nameInput, 'Test Preset')

      const tagsInput = screen.getByLabelText('Tags')
      await user.type(tagsInput, 'test, landscape, test, art')

      const saveButton = screen.getByRole('button', { name: 'Save Preset' })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['test', 'landscape', 'art'] // Duplicates removed
        })
      )
    })

    it('should not save when form is invalid', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      // Don't fill in required name field
      const saveButton = screen.getByRole('button', { name: 'Save Preset' })
      expect(saveButton).toBeDisabled()

      await user.click(saveButton)
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should show loading state during save', async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.type(nameInput, 'Test Preset')

      const saveButton = screen.getByRole('button', { name: 'Save Preset' })
      await user.click(saveButton)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    it('should handle save errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockOnSave.mockRejectedValueOnce(new Error('Save failed'))

      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.type(nameInput, 'Test Preset')

      const saveButton = screen.getByRole('button', { name: 'Save Preset' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to save preset:', expect.any(Error))
      })

      // Dialog should still be open (not closed on error)
      expect(mockOnClose).not.toHaveBeenCalled()

      consoleError.mockRestore()
    })
  })

  describe('dialog interactions', () => {
    it('should close dialog when close button is clicked', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const closeButton = screen.getByRole('button', { name: '✕' })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close dialog when cancel button is clicked', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close dialog when clicking overlay', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const overlay = screen.getByTestId('dialog-overlay') || document.querySelector('.preset-save-dialog-overlay')
      if (overlay) {
        await user.click(overlay)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })

    it('should not close dialog when clicking inside dialog content', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const dialogContent = document.querySelector('.preset-save-dialog')
      if (dialogContent) {
        await user.click(dialogContent)
        expect(mockOnClose).not.toHaveBeenCalled()
      }
    })
  })

  describe('accessibility', () => {
    it('should focus name input on open', () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      expect(nameInput).toHaveFocus()
    })

    it('should have proper form labels', () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      expect(screen.getByLabelText('Preset Name *')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Tags')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Enable compression')).toBeInTheDocument()
    })

    it('should prevent form submission on Enter', async () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={mockWorkflowData}
        />
      )

      const nameInput = screen.getByLabelText('Preset Name *')
      await user.type(nameInput, 'Test{enter}')

      // Should not submit form (preventDefault called)
      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle missing workflow data', () => {
      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('No workflow data available to save')).toBeInTheDocument()
      
      const saveButton = screen.getByRole('button', { name: 'Save Preset' })
      expect(saveButton).toBeDisabled()
    })

    it('should handle empty workflow data', () => {
      const emptyWorkflow: ComfyUIWorkflow = {
        nodes: {},
        links: [],
        groups: [],
        config: {},
        extra: {},
        version: 0.4
      }

      render(
        <PresetSaveDialog
          onSave={mockOnSave}
          onClose={mockOnClose}
          workflowData={emptyWorkflow}
        />
      )

      // Should still allow saving empty workflows
      const nameInput = screen.getByLabelText('Preset Name *')
      expect(nameInput).toBeInTheDocument()
    })
  })
})