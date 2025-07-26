// ============================================================================
// ComfyUI React - Preset JSON Editor Modal
// ============================================================================

import React, { useState, useEffect } from 'react'
import type { IPreset } from '@/types/preset'
import './PresetJsonEditor.css'

interface PresetJsonEditorProps {
  preset: IPreset
  onSave: (updates: Partial<IPreset>) => void
  onClose: () => void
}

export const PresetJsonEditor: React.FC<PresetJsonEditorProps> = ({
  preset,
  onSave,
  onClose
}) => {
  const [jsonData, setJsonData] = useState('')
  const [jsonError, setJsonError] = useState('')

  // Initialize JSON data
  useEffect(() => {
    setJsonData(JSON.stringify(preset.workflowData, null, 2))
  }, [preset.workflowData])


  const handleJsonChange = (value: string) => {
    setJsonData(value)
    setJsonError('')
    
    // Try to parse and validate JSON
    try {
      const parsed = JSON.parse(value)
      if (!parsed.nodes || typeof parsed.nodes !== 'object') {
        setJsonError('Invalid workflow format: missing nodes object')
        return
      }
    } catch (error) {
      setJsonError('Invalid JSON format')
    }
  }

  const handleSave = () => {
    try {
      const parsedWorkflow = JSON.parse(jsonData)
      
      if (!parsedWorkflow.nodes || typeof parsedWorkflow.nodes !== 'object') {
        setJsonError('Invalid workflow format: missing nodes object')
        return
      }

      const updates: Partial<IPreset> = {
        workflowData: parsedWorkflow
      }

      onSave(updates)
      onClose()
    } catch (error) {
      setJsonError('Invalid JSON format')
    }
  }

  return (
    <div className="json-editor-overlay" onClick={onClose}>
      <div className="json-editor-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="json-editor-header">
          <h2>Edit Workflow JSON: {preset.name}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* JSON Editor Content */}
        <div className="json-editor-content">
          <div className="json-editor-container">
            <textarea
              className="json-textarea"
              value={jsonData}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder="Edit workflow JSON..."
              spellCheck={false}
            />
            {jsonError && (
              <div className="json-error">
                ⚠️ {jsonError}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="json-editor-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!!jsonError}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}