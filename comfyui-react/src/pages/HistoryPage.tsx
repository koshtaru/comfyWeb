// ============================================================================
// ComfyUI React - History Page
// ============================================================================

import React, { useState, useEffect } from 'react'
import { historyManager, type HistorySearchParams, type HistorySearchResult } from '@/services/historyManager'
import { useParameterReuse } from '@/hooks/useParameterReuse'
import { useUploadStore } from '@/store/uploadStore'

export default function HistoryPage() {
  const [searchResult, setSearchResult] = useState<HistorySearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showReuseConfirm, setShowReuseConfirm] = useState<string | null>(null)
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{ deleting: boolean, progress: number, total: number } | null>(null)

  // Parameter reuse hook
  const { reuseParameters, isCompatible, getParameterSummary } = useParameterReuse()
  const { currentWorkflow } = useUploadStore()

  // Handle ESC key to close modal and exit selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) {
          setShowModal(false)
        } else if (selectionMode) {
          setSelectionMode(false)
          setSelectedItems(new Set())
        }
      }
    }

    if (showModal || selectionMode) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showModal, selectionMode])

  // Load initial history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await historyManager.searchGenerations({ limit: 20 })
        setSearchResult(result)
      } catch (err) {
        console.error('Failed to load history:', err)
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [])

  // Bulk selection helper functions
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const selectAllItems = () => {
    if (searchResult) {
      setSelectedItems(new Set(searchResult.items.map(item => item.id)))
    }
  }

  const deselectAllItems = () => {
    setSelectedItems(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    const itemsToDelete = Array.from(selectedItems)
    setBulkDeleteProgress({ deleting: true, progress: 0, total: itemsToDelete.length })
    setShowBulkDeleteConfirm(false)
    
    // Clear selection state immediately to prevent stale references
    setSelectionMode(false)
    setSelectedItems(new Set())

    try {
      const result = await historyManager.deleteMultipleGenerations(
        itemsToDelete,
        (completed, total) => {
          setBulkDeleteProgress({ deleting: true, progress: completed, total })
        }
      )
      
      // Show results
      if (result.failed.length > 0) {
        console.error('Some deletions failed:', result.failed)
        alert(`Deleted ${result.deleted.length} items. ${result.failed.length} items failed to delete.`)
      }

      // Refresh the history list
      const refreshedResult = await historyManager.searchGenerations({ limit: 20 })
      setSearchResult(refreshedResult)
      
    } catch (error) {
      console.error('Bulk deletion failed:', error)
      alert('Failed to delete selected items. Please try again.')
      
      // Don't re-enter selection mode on error since we already cleared state
    } finally {
      setBulkDeleteProgress(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="comfy-panel p-6">
          <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
            Generation History
          </h1>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-comfy-accent-orange"></div>
            <span className="ml-3 text-comfy-text-secondary">Loading history...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="comfy-panel p-6">
          <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
            Generation History
          </h1>
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">⚠️</div>
            <h3 className="mb-2 text-lg font-medium text-comfy-text-primary">
              Error Loading History
            </h3>
            <p className="text-comfy-text-secondary mb-4">
              {error}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="comfy-button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const hasHistory = searchResult && searchResult.items.length > 0

  return (
    <div className="space-y-6">
      <div className="comfy-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-comfy-text-primary">
            Generation History
          </h1>
          
          {hasHistory && (
            <div className="flex items-center space-x-2">
              {!selectionMode ? (
                <button
                  className="comfy-button secondary text-sm"
                  onClick={() => setSelectionMode(true)}
                  title="Select multiple items for bulk operations"
                >
                  ☐ Select Multiple
                </button>
              ) : (
                <div className="flex flex-col items-end space-y-1">
                  {/* Button Row */}
                  <div className="flex items-center space-x-2">
                    <button
                      className="comfy-button secondary text-sm"
                      onClick={() => {
                        setSelectionMode(false)
                        setSelectedItems(new Set())
                      }}
                      title="Exit selection mode"
                    >
                      Cancel
                    </button>
                    
                    <button
                      className="comfy-button secondary text-sm"
                      onClick={() => {
                        if (selectedItems.size === searchResult!.items.length && searchResult!.items.length > 0) {
                          deselectAllItems()
                        } else {
                          selectAllItems()
                        }
                      }}
                      title={selectedItems.size === searchResult!.items.length && searchResult!.items.length > 0 ? "Deselect all" : "Select all"}
                      disabled={searchResult!.items.length === 0}
                    >
                      {selectedItems.size === searchResult!.items.length && searchResult!.items.length > 0 ? "☑ Deselect All" : "☐ Select All"}
                    </button>
                    
                    {selectedItems.size > 0 && (
                      <button
                        className="comfy-button text-sm bg-comfy-error hover:bg-comfy-error/80"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        title={`Delete ${selectedItems.size} selected items`}
                      >
                        🗑️ Delete ({selectedItems.size})
                      </button>
                    )}
                  </div>
                  
                  {/* Selection Count Row */}
                  <div className="text-comfy-text-secondary text-xs text-right">
                    {selectedItems.size} of {searchResult!.items.length} selected
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="mb-6 text-comfy-text-secondary">
          View and manage your previous generations. {hasHistory && `(${searchResult.total} total)`}
        </p>

        {!hasHistory ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">📚</div>
            <h3 className="mb-2 text-lg font-medium text-comfy-text-primary">
              No history yet
            </h3>
            <p className="text-comfy-text-secondary">
              Your generated images will appear here once you start creating.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Results Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-comfy-text-secondary">
                Showing {searchResult.items.length} of {searchResult.total} generations
                {searchResult.hasMore && " (more available)"}
              </span>
            </div>

            {/* History Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResult.items.map(item => {
                console.log('[HistoryPage] Rendering item:', item.id, 'with images:', item.images)
                const isSelected = selectedItems.has(item.id)
                return (
                <div 
                  key={item.id} 
                  className={`comfy-card transition-colors relative ${
                    selectionMode 
                      ? isSelected 
                        ? 'border-comfy-accent-orange bg-comfy-accent-orange/5' 
                        : 'hover:border-comfy-accent-orange/50 cursor-pointer'
                      : 'hover:border-comfy-accent-orange/50'
                  }`}
                  onClick={selectionMode ? (e) => {
                    // Only handle clicks on the card background, not on child elements
                    if (e.target === e.currentTarget) {
                      toggleItemSelection(item.id)
                    }
                  } : undefined}
                >
                  {/* Selection Checkbox Overlay */}
                  {selectionMode && (
                    <div 
                      className="absolute top-2 left-2 z-10 cursor-pointer"
                      onClick={() => toggleItemSelection(item.id)}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Select generation ${item.id}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleItemSelection(item.id)
                        }
                      }}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'border-comfy-accent-orange bg-comfy-accent-orange/20' 
                          : 'border-comfy-border bg-comfy-bg-primary hover:border-comfy-accent-orange/50'
                      }`}>
                        {isSelected && (
                          <div className="w-3 h-3 bg-comfy-accent-orange rounded-sm"></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Image Preview Area */}
                  <div 
                    className="mb-3 flex aspect-[3/4] items-center justify-center rounded-md bg-comfy-bg-tertiary w-[70%] mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      if (selectionMode) {
                        toggleItemSelection(item.id)
                      } else {
                        console.log('View details for:', item.id, '(clicked on image)')
                        setSelectedItem(item)
                        setShowModal(true)
                      }
                    }}
                  >
                    {item.images && item.images.length > 0 ? (
                      <>
                        <img 
                          src={item.images[0]} 
                          alt="Generated image"
                          className="w-full h-full object-cover rounded-md"
                          onLoad={(e) => {
                            console.log('[HistoryPage] Image loaded successfully:', item.images[0], 'for item:', item.id)
                            const target = e.target as HTMLImageElement
                            const span = target.nextElementSibling as HTMLElement
                            if (span) {
                              console.log('[HistoryPage] Hiding loading text for:', item.id)
                              span.style.display = 'none'
                            }
                          }}
                          onError={(e) => {
                            console.error('[HistoryPage] Image failed to load:', item.images[0], 'for item:', item.id)
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const span = target.nextElementSibling as HTMLElement
                            if (span) {
                              span.style.display = 'block'
                              span.textContent = 'Failed to load'
                            }
                          }}
                        />
                        <span className="text-comfy-text-secondary text-sm">
                          Loading...
                        </span>
                      </>
                    ) : (
                      <span className="text-comfy-text-secondary text-sm">
                        No Image
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    {/* Prompt */}
                    <h4 className="font-medium text-comfy-text-primary line-clamp-2 text-sm">
                      {item.metadata.prompts.positive || 'No prompt'}
                    </h4>

                    {/* Metadata */}
                    <div className="space-y-1 text-xs text-comfy-text-secondary">
                      <div className="flex items-center justify-between">
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {item.metadata.model?.name && (
                        <div>Model: {item.metadata.model.name}</div>
                      )}
                      {item.metadata.image && (
                        <div>Size: {item.metadata.image.width}×{item.metadata.image.height}</div>
                      )}
                      {item.metadata.timing?.duration && (
                        <div>Duration: {Math.round(item.metadata.timing.duration / 1000)}s</div>
                      )}
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          item.status === 'completed'
                            ? 'bg-comfy-success bg-opacity-20 text-comfy-success'
                            : item.status === 'failed'
                              ? 'bg-comfy-error bg-opacity-20 text-comfy-error'
                              : 'bg-comfy-accent-blue bg-opacity-20 text-comfy-accent-blue'
                        }`}
                      >
                        {item.status}
                      </span>
                      
                      {/* Action Buttons - Hidden in selection mode */}
                      {!selectionMode && (
                        <div className="flex items-center space-x-1">
                          <button 
                            className="text-comfy-text-secondary hover:text-comfy-accent-orange transition-colors p-1"
                            title="View Details"
                            onClick={() => {
                              console.log('View details for:', item.id)
                              setSelectedItem(item)
                              setShowModal(true)
                            }}
                          >
                            👁️
                          </button>
                          <button 
                            className="text-comfy-text-secondary hover:text-comfy-accent-orange transition-colors p-1"
                            title={currentWorkflow ? "Reuse Parameters" : "Reuse Parameters (will load workflow from history)"}
                            onClick={() => {
                              setShowReuseConfirm(item.id)
                            }}
                          >
                            🔄
                          </button>
                          <button 
                            className="text-comfy-text-secondary hover:text-comfy-error transition-colors p-1"
                            title="Delete Generation"
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this generation? This cannot be undone.')) {
                                try {
                                  await historyManager.deleteGeneration(item.id)
                                  // Refresh the history list
                                  const result = await historyManager.searchGenerations({ limit: 20 })
                                  setSearchResult(result)
                                  console.log('Deleted generation:', item.id)
                                } catch (error) {
                                  console.error('Failed to delete generation:', error)
                                  alert('Failed to delete generation. Please try again.')
                                }
                              }
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                      
                      {/* Selection mode indicator */}
                      {selectionMode && (
                        <div className="text-xs text-comfy-text-secondary">
                          Click to select
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )
              })}
            </div>

            {/* Load More Button */}
            {searchResult.hasMore && (
              <div className="text-center pt-4">
                <button 
                  className="comfy-button secondary"
                  onClick={async () => {
                    try {
                      const nextResult = await historyManager.searchGenerations({ 
                        limit: 20, 
                        offset: searchResult.items.length 
                      })
                      setSearchResult({
                        ...nextResult,
                        items: [...searchResult.items, ...nextResult.items]
                      })
                      
                      // If in selection mode, clear selections to avoid confusion
                      if (selectionMode) {
                        setSelectedItems(new Set())
                      }
                    } catch (err) {
                      console.error('Failed to load more:', err)
                    }
                  }}
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Detail Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75"
              onClick={() => setShowModal(false)}
            ></div>

            {/* Modal content */}
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-comfy-bg-primary border border-comfy-border rounded-lg shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-comfy-text-primary">
                  Generation Details
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-comfy-text-secondary hover:text-comfy-text-primary transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Section */}
                <div>
                  {selectedItem.images && selectedItem.images.length > 0 ? (
                    <img
                      src={selectedItem.images[0]}
                      alt="Generated image"
                      className="w-full rounded-md border border-comfy-border"
                      style={{ maxHeight: '500px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-comfy-bg-tertiary rounded-md border border-comfy-border">
                      <span className="text-comfy-text-secondary">No Image Available</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-4">
                    <button 
                      className="comfy-button"
                      onClick={() => {
                        setShowReuseConfirm(selectedItem.id)
                      }}
                      title={currentWorkflow ? "Copy parameters to current workflow" : "Copy parameters and load workflow from history"}
                    >
                      Copy Parameters
                    </button>
                    {selectedItem.images && selectedItem.images.length > 0 && (
                      <button 
                        className="comfy-button secondary"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = selectedItem.images[0]
                          link.download = `generated-image-${selectedItem.id}.png`
                          link.click()
                        }}
                      >
                        Download Image
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                  {/* Prompts */}
                  <div>
                    <h4 className="font-medium text-comfy-text-primary mb-2">Positive Prompt</h4>
                    <div className="p-3 bg-comfy-bg-secondary rounded-md border border-comfy-border">
                      <p className="text-sm text-comfy-text-primary whitespace-pre-wrap">
                        {selectedItem.metadata.prompts.positive || 'No prompt'}
                      </p>
                    </div>
                  </div>

                  {selectedItem.metadata.prompts.negative && (
                    <div>
                      <h4 className="font-medium text-comfy-text-primary mb-2">Negative Prompt</h4>
                      <div className="p-3 bg-comfy-bg-secondary rounded-md border border-comfy-border">
                        <p className="text-sm text-comfy-text-primary whitespace-pre-wrap">
                          {selectedItem.metadata.prompts.negative}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Generation Parameters */}
                  <div>
                    <h4 className="font-medium text-comfy-text-primary mb-2">Generation Parameters</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">Steps:</span>
                        <span className="text-comfy-text-primary">{selectedItem.metadata.generation?.steps || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">CFG:</span>
                        <span className="text-comfy-text-primary">{selectedItem.metadata.generation?.cfg || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">Sampler:</span>
                        <span className="text-comfy-text-primary">{selectedItem.metadata.generation?.sampler || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">Scheduler:</span>
                        <span className="text-comfy-text-primary">{selectedItem.metadata.generation?.scheduler || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">Seed:</span>
                        <span className="text-comfy-text-primary">{selectedItem.metadata.generation?.seed || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Model and Image Info */}
                  <div>
                    <h4 className="font-medium text-comfy-text-primary mb-2">Model & Image Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">Model:</span>
                        <span className="text-comfy-text-primary">{selectedItem.metadata.model?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">Dimensions:</span>
                        <span className="text-comfy-text-primary">
                          {selectedItem.metadata.image?.width || 512}×{selectedItem.metadata.image?.height || 512}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">Duration:</span>
                        <span className="text-comfy-text-primary">
                          {selectedItem.metadata.timing?.duration 
                            ? `${Math.round(selectedItem.metadata.timing.duration / 1000)}s`
                            : 'Unknown'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-comfy-text-secondary">Generated:</span>
                        <span className="text-comfy-text-primary">
                          {new Date(selectedItem.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parameter Reuse Confirmation Dialog */}
      {showReuseConfirm && searchResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75"
              onClick={() => setShowReuseConfirm(null)}
            ></div>

            {/* Modal content */}
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-comfy-bg-primary border border-comfy-border rounded-lg shadow-xl">
              {(() => {
                const item = searchResult.items.find(i => i.id === showReuseConfirm)
                if (!item) return null

                const paramSummary = getParameterSummary(item)
                const compatible = isCompatible(item)

                return (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-comfy-text-primary">
                        Reuse Parameters
                      </h3>
                      <button
                        onClick={() => setShowReuseConfirm(null)}
                        className="text-comfy-text-secondary hover:text-comfy-text-primary transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                      <p className="text-sm text-comfy-text-secondary">
                        {currentWorkflow 
                          ? 'Copy the following parameters to your current workflow:'
                          : 'Load the following workflow and parameters from history:'
                        }
                      </p>

                      <div className="bg-comfy-bg-secondary rounded-md p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-1 text-xs">
                          {paramSummary.map((param, index) => (
                            <div key={index} className="text-comfy-text-primary">
                              • {param}
                            </div>
                          ))}
                        </div>
                      </div>

                      {!currentWorkflow && (
                        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-md">
                          <div className="flex items-start space-x-2">
                            <div className="text-blue-400">ℹ️</div>
                            <div className="text-sm text-blue-300">
                              No workflow is currently loaded. This will load the complete workflow from this history item along with the parameters.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-3 pt-4">
                        <button
                          className="flex-1 comfy-button"
                          onClick={async () => {
                            const success = await reuseParameters(item)
                            if (success) {
                              setShowReuseConfirm(null)
                            }
                          }}
                        >
                          {currentWorkflow ? 'Copy & Switch to Generate' : 'Load Workflow & Switch to Generate'}
                        </button>
                        <button
                          className="flex-1 comfy-button secondary"
                          onClick={() => setShowReuseConfirm(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75"
              onClick={() => setShowBulkDeleteConfirm(false)}
            ></div>

            {/* Modal content */}
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-comfy-bg-primary border border-comfy-border rounded-lg shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-comfy-text-primary">
                  Delete Selected Generations
                </h3>
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="text-comfy-text-secondary hover:text-comfy-text-primary transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-md">
                  <div className="flex items-start space-x-2">
                    <div className="text-red-400">⚠️</div>
                    <div className="text-sm text-red-300">
                      Are you sure you want to delete {selectedItems.size} generation{selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    className="flex-1 comfy-button bg-comfy-error hover:bg-comfy-error/80"
                    onClick={handleBulkDelete}
                  >
                    Delete {selectedItems.size} Item{selectedItems.size > 1 ? 's' : ''}
                  </button>
                  <button
                    className="flex-1 comfy-button secondary"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Progress Dialog */}
      {bulkDeleteProgress && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75"></div>

            {/* Modal content */}
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-comfy-bg-primary border border-comfy-border rounded-lg shadow-xl">
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-lg font-medium text-comfy-text-primary">
                  Deleting Generations
                </h3>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-comfy-accent-orange"></div>
                  <span className="text-comfy-text-secondary">
                    Deleting generations... ({bulkDeleteProgress.progress}/{bulkDeleteProgress.total})
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-comfy-bg-tertiary rounded-full h-2">
                  <div 
                    className="bg-comfy-accent-orange h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(bulkDeleteProgress.progress / bulkDeleteProgress.total) * 100}%` 
                    }}
                  ></div>
                </div>
                
                <div className="text-center text-sm text-comfy-text-secondary">
                  Please wait, this may take a moment.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
