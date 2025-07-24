// ============================================================================
// ComfyUI React - History Search Component with Advanced Filtering
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react'
import type { HistorySearchParams } from '@/services/historyManager'
import './HistorySearch.css'

export interface HistorySearchProps {
  onSearch: (params: HistorySearchParams) => void
  availableModels: string[]
  availableDimensions: string[]
  availableTags: string[]
  isLoading?: boolean
  className?: string
}

interface DateRange {
  from: Date | null
  to: Date | null
}

export const HistorySearch: React.FC<HistorySearchProps> = ({
  onSearch,
  availableModels,
  availableDimensions,
  availableTags,
  isLoading = false,
  className = ''
}) => {
  // Search state
  const [query, setQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null })
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [minRating, setMinRating] = useState<number>(0)
  const [sortBy, setSortBy] = useState<'timestamp' | 'rating' | 'duration'>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isExpanded, setIsExpanded] = useState(false)

  // Status options
  const statusOptions = [
    { value: 'completed', label: 'Completed', color: 'text-green-400' },
    { value: 'failed', label: 'Failed', color: 'text-red-400' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-yellow-400' },
    { value: 'in-progress', label: 'In Progress', color: 'text-blue-400' }
  ]

  // Sort options
  const sortOptions = [
    { value: 'timestamp', label: 'Date Created' },
    { value: 'rating', label: 'Rating' },
    { value: 'duration', label: 'Generation Time' }
  ]

  // Build search parameters
  const buildSearchParams = useCallback((): HistorySearchParams => {
    return {
      query: query.trim() || undefined,
      dateFrom: dateRange.from || undefined,
      dateTo: dateRange.to || undefined,
      models: selectedModels.length > 0 ? selectedModels : undefined,
      dimensions: selectedDimensions.length > 0 ? selectedDimensions : undefined,
      status: selectedStatus.length > 0 ? selectedStatus : undefined,
      rating: minRating > 0 ? minRating : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      sortBy,
      sortOrder,
      limit: 50,
      offset: 0
    }
  }, [query, dateRange, selectedModels, selectedDimensions, selectedStatus, selectedTags, minRating, sortBy, sortOrder])

  // Trigger search when parameters change
  useEffect(() => {
    const params = buildSearchParams()
    onSearch(params)
  }, [buildSearchParams, onSearch])

  // Clear all filters
  const clearFilters = () => {
    setQuery('')
    setDateRange({ from: null, to: null })
    setSelectedModels([])
    setSelectedDimensions([])
    setSelectedStatus([])
    setSelectedTags([])
    setMinRating(0)
    setSortBy('timestamp')
    setSortOrder('desc')
  }

  // Toggle filter selection
  const toggleFilter = (value: string, selectedList: string[], setSelectedList: (list: string[]) => void) => {
    if (selectedList.includes(value)) {
      setSelectedList(selectedList.filter(item => item !== value))
    } else {
      setSelectedList([...selectedList, value])
    }
  }

  // Format date for input
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  // Parse date from input
  const parseDateFromInput = (value: string): Date | null => {
    if (!value) return null
    return new Date(value)
  }

  return (
    <div className={`history-search ${className}`}>
      {/* Main search bar */}
      <div className="search-main">
        <div className="search-input-container">
          <svg 
            className="search-icon"
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search prompts, models, samplers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            disabled={isLoading}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="search-clear"
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="search-actions">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`filter-toggle ${isExpanded ? 'active' : ''}`}
            aria-label="Toggle advanced filters"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
            </svg>
            Filters
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              className={`chevron ${isExpanded ? 'rotated' : ''}`}
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="clear-filters"
            disabled={isLoading}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Advanced filters panel */}
      {isExpanded && (
        <div className="filters-panel">
          {/* Date range */}
          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <div className="date-range">
              <input
                type="date"
                value={formatDateForInput(dateRange.from)}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: parseDateFromInput(e.target.value) }))}
                className="date-input"
                disabled={isLoading}
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={formatDateForInput(dateRange.to)}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: parseDateFromInput(e.target.value) }))}
                className="date-input"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Models filter */}
          {availableModels.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">Models ({selectedModels.length} selected)</label>
              <div className="filter-options">
                {availableModels.slice(0, 10).map(model => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => toggleFilter(model, selectedModels, setSelectedModels)}
                    className={`filter-option ${selectedModels.includes(model) ? 'selected' : ''}`}
                    disabled={isLoading}
                  >
                    <span className="option-text">{model}</span>
                    {selectedModels.includes(model) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </button>
                ))}
                {availableModels.length > 10 && (
                  <span className="filter-more">+{availableModels.length - 10} more</span>
                )}
              </div>
            </div>
          )}

          {/* Dimensions filter */}
          {availableDimensions.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">Dimensions ({selectedDimensions.length} selected)</label>
              <div className="filter-options">
                {availableDimensions.map(dimension => (
                  <button
                    key={dimension}
                    type="button"
                    onClick={() => toggleFilter(dimension, selectedDimensions, setSelectedDimensions)}
                    className={`filter-option ${selectedDimensions.includes(dimension) ? 'selected' : ''}`}
                    disabled={isLoading}
                  >
                    <span className="option-text">{dimension}</span>
                    {selectedDimensions.includes(dimension) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status filter */}
          <div className="filter-group">
            <label className="filter-label">Status ({selectedStatus.length} selected)</label>
            <div className="filter-options">
              {statusOptions.map(status => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => toggleFilter(status.value, selectedStatus, setSelectedStatus)}
                  className={`filter-option ${selectedStatus.includes(status.value) ? 'selected' : ''}`}
                  disabled={isLoading}
                >
                  <span className={`option-text ${status.color}`}>{status.label}</span>
                  {selectedStatus.includes(status.value) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tags filter */}
          {availableTags.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">Tags ({selectedTags.length} selected)</label>
              <div className="filter-options">
                {availableTags.slice(0, 15).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFilter(tag, selectedTags, setSelectedTags)}
                    className={`filter-option tag-option ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    disabled={isLoading}
                  >
                    <span className="option-text">#{tag}</span>
                    {selectedTags.includes(tag) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </button>
                ))}
                {availableTags.length > 15 && (
                  <span className="filter-more">+{availableTags.length - 15} more</span>
                )}
              </div>
            </div>
          )}

          {/* Rating filter */}
          <div className="filter-group">
            <label className="filter-label">Minimum Rating</label>
            <div className="rating-filter">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setMinRating(rating === minRating ? 0 : rating)}
                  className={`rating-star ${rating <= minRating ? 'filled' : ''}`}
                  disabled={isLoading}
                  aria-label={`${rating} star${rating > 1 ? 's' : ''}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                </button>
              ))}
              {minRating > 0 && (
                <span className="rating-text">{minRating}+ stars</span>
              )}
            </div>
          </div>

          {/* Sort options */}
          <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <div className="sort-controls">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'rating' | 'duration')}
                className="sort-select"
                disabled={isLoading}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-order"
                disabled={isLoading}
                aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  {sortOrder === 'desc' ? (
                    <path d="M3 6h18M7 12h10m-7 6h4" />
                  ) : (
                    <path d="M3 18h18M7 12h10m-7-6h4" />
                  )}
                </svg>
                {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {(query || dateRange.from || dateRange.to || selectedModels.length > 0 || 
        selectedDimensions.length > 0 || selectedStatus.length > 0 || 
        selectedTags.length > 0 || minRating > 0) && (
        <div className="active-filters">
          <span className="active-filters-label">Active filters:</span>
          <div className="active-filters-list">
            {query && (
              <span className="active-filter">
                Text: "{query}"
                <button onClick={() => setQuery('')} className="remove-filter">×</button>
              </span>
            )}
            {dateRange.from && (
              <span className="active-filter">
                From: {dateRange.from.toLocaleDateString()}
                <button onClick={() => setDateRange(prev => ({ ...prev, from: null }))} className="remove-filter">×</button>
              </span>
            )}
            {dateRange.to && (
              <span className="active-filter">
                To: {dateRange.to.toLocaleDateString()}
                <button onClick={() => setDateRange(prev => ({ ...prev, to: null }))} className="remove-filter">×</button>
              </span>
            )}
            {selectedModels.map(model => (
              <span key={`model-${model}`} className="active-filter">
                Model: {model}
                <button onClick={() => toggleFilter(model, selectedModels, setSelectedModels)} className="remove-filter">×</button>
              </span>
            ))}
            {selectedDimensions.map(dimension => (
              <span key={`dim-${dimension}`} className="active-filter">
                Size: {dimension}
                <button onClick={() => toggleFilter(dimension, selectedDimensions, setSelectedDimensions)} className="remove-filter">×</button>
              </span>
            ))}
            {selectedStatus.map(status => (
              <span key={`status-${status}`} className="active-filter">
                Status: {status}
                <button onClick={() => toggleFilter(status, selectedStatus, setSelectedStatus)} className="remove-filter">×</button>
              </span>
            ))}
            {selectedTags.map(tag => (
              <span key={`tag-${tag}`} className="active-filter">
                #{tag}
                <button onClick={() => toggleFilter(tag, selectedTags, setSelectedTags)} className="remove-filter">×</button>
              </span>
            ))}
            {minRating > 0 && (
              <span className="active-filter">
                Rating: {minRating}+ stars
                <button onClick={() => setMinRating(0)} className="remove-filter">×</button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default HistorySearch