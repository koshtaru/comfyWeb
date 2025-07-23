// Metadata Search Component
// Provides fuzzy search functionality within metadata display with filtering and highlighting

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import './MetadataSearch.css'

export interface MetadataSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  showSuggestions?: boolean
  maxSuggestions?: number
  className?: string
  onFocus?: () => void
  onBlur?: () => void
  onClear?: () => void
}

interface SearchSuggestion {
  text: string
  category: string
  path: string[]
  score: number
}

export const MetadataSearch = React.forwardRef<HTMLInputElement, MetadataSearchProps>(({
  value,
  onChange,
  placeholder = 'Search metadata...',
  debounceMs = 300,
  showSuggestions = true,
  maxSuggestions = 8,
  className = '',
  onFocus,
  onBlur,
  onClear
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Use the forwarded ref or the internal ref
  const effectiveRef = (ref as React.RefObject<HTMLInputElement>) || inputRef
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Sample metadata keywords for suggestions
  const metadataKeywords = useMemo(() => [
    { text: 'steps', category: 'Generation', path: ['generation', 'steps'] },
    { text: 'cfg', category: 'Generation', path: ['generation', 'cfg'] },
    { text: 'seed', category: 'Generation', path: ['generation', 'seed'] },
    { text: 'sampler', category: 'Generation', path: ['generation', 'sampler'] },
    { text: 'scheduler', category: 'Generation', path: ['generation', 'scheduler'] },
    { text: 'checkpoint', category: 'Models', path: ['models', 'checkpoint'] },
    { text: 'lora', category: 'Models', path: ['models', 'loras'] },
    { text: 'vae', category: 'Models', path: ['models', 'vae'] },
    { text: 'controlnet', category: 'Models', path: ['models', 'controlnets'] },
    { text: 'positive', category: 'Prompts', path: ['generation', 'prompts', 'positive'] },
    { text: 'negative', category: 'Prompts', path: ['generation', 'prompts', 'negative'] },
    { text: 'width', category: 'Image', path: ['generation', 'image', 'width'] },
    { text: 'height', category: 'Image', path: ['generation', 'image', 'height'] },
    { text: 'batch', category: 'Image', path: ['generation', 'image', 'batchSize'] },
    { text: 'nodes', category: 'Workflow', path: ['workflow', 'nodeCount'] },
    { text: 'connections', category: 'Workflow', path: ['workflow', 'connectionCount'] },
    { text: 'complexity', category: 'Workflow', path: ['workflow', 'complexity'] },
    { text: 'architecture', category: 'Workflow', path: ['workflow', 'architecture'] },
    { text: 'performance', category: 'Performance', path: ['performance'] },
    { text: 'bottlenecks', category: 'Performance', path: ['performance', 'bottlenecks'] },
    { text: 'execution time', category: 'Performance', path: ['performance', 'actualTime'] }
  ], [])

  // Fuzzy search algorithm
  const fuzzySearch = useCallback((query: string, keywords: typeof metadataKeywords): SearchSuggestion[] => {
    if (!query.trim()) return []

    const queryLower = query.toLowerCase()
    const results: SearchSuggestion[] = []

    for (const keyword of keywords) {
      const textLower = keyword.text.toLowerCase()
      
      // Exact match gets highest score
      if (textLower === queryLower) {
        results.push({ ...keyword, score: 100 })
        continue
      }

      // Starts with query gets high score
      if (textLower.startsWith(queryLower)) {
        results.push({ ...keyword, score: 90 })
        continue
      }

      // Contains query gets medium score
      if (textLower.includes(queryLower)) {
        results.push({ ...keyword, score: 70 })
        continue
      }

      // Fuzzy match for partial strings
      const score = calculateFuzzyScore(queryLower, textLower)
      if (score > 30) {
        results.push({ ...keyword, score })
      }
    }

    // Sort by score descending and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
  }, [metadataKeywords, maxSuggestions])

  // Calculate fuzzy match score
  const calculateFuzzyScore = (query: string, text: string): number => {
    let score = 0
    let queryIndex = 0
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        score += 2
        queryIndex++
      } else if (queryIndex > 0) {
        score -= 1
      }
    }
    
    // Bonus for matching all characters
    if (queryIndex === query.length) {
      score += 20
    }
    
    // Penalty for length difference
    score -= Math.abs(text.length - query.length)
    
    return Math.max(0, score)
  }

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      const results = fuzzySearch(query, metadataKeywords)
      setSuggestions(results)
      setSelectedSuggestion(-1)
    }, debounceMs)
  }, [fuzzySearch, metadataKeywords, debounceMs])

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    onChange(newValue)
    
    if (showSuggestions) {
      debouncedSearch(newValue)
    }
  }

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
    
    if (showSuggestions && value) {
      debouncedSearch(value)
    } else if (showSuggestions) {
      debouncedSearch('')
    }
  }

  // Handle input blur
  const handleBlur = () => {
    // Delay blur to allow suggestion clicks
    setTimeout(() => {
      setIsFocused(false)
      setSuggestions([])
      setSelectedSuggestion(-1)
      onBlur?.()
    }, 150)
  }

  // Handle clear button
  const handleClear = () => {
    onChange('')
    setSuggestions([])
    setSelectedSuggestion(-1)
    onClear?.()
    effectiveRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        event.preventDefault()
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1)
        break

      case 'Enter':
        event.preventDefault()
        if (selectedSuggestion >= 0 && selectedSuggestion < suggestions.length) {
          const suggestion = suggestions[selectedSuggestion]
          onChange(suggestion.text)
          setSuggestions([])
          setSelectedSuggestion(-1)
        }
        break

      case 'Escape':
        setSuggestions([])
        setSelectedSuggestion(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text)
    setSuggestions([])
    setSelectedSuggestion(-1)
    effectiveRef.current?.focus()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className={`metadata-search ${isFocused ? 'focused' : ''} ${className}`}>
      <div className="search-input-wrapper">
        {/* Search Icon */}
        <div className="search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
            />
          </svg>
        </div>

        {/* Search Input */}
        <input
          ref={effectiveRef}
          type="text"
          className="search-input"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          aria-label="Search metadata"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-haspopup="listbox"
          role="combobox"
        />

        {/* Clear Button */}
        {value && (
          <button
            type="button"
            className="clear-button"
            onClick={handleClear}
            aria-label="Clear search"
            title="Clear search"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Search Suggestions */}
      {showSuggestions && isFocused && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.category}-${suggestion.text}`}
              className={`suggestion-item ${index === selectedSuggestion ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected={index === selectedSuggestion}
            >
              <div className="suggestion-content">
                <div className="suggestion-text">
                  {highlightMatch(suggestion.text, value)}
                </div>
                <div className="suggestion-category">
                  {suggestion.category}
                </div>
              </div>
              <div className="suggestion-path">
                {suggestion.path.join(' → ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

MetadataSearch.displayName = 'MetadataSearch'

// Utility function to highlight matching text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text
  }

  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  const index = textLower.indexOf(queryLower)

  if (index === -1) {
    return text
  }

  return (
    <>
      {text.slice(0, index)}
      <mark className="search-highlight">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  )
}

// Advanced search filters
export interface SearchFilter {
  category?: string[]
  dataType?: string[]
  hasValue?: boolean
  minScore?: number
}

export interface AdvancedMetadataSearchProps extends MetadataSearchProps {
  filters?: SearchFilter
  onFiltersChange?: (filters: SearchFilter) => void
  showFilters?: boolean
}

export const AdvancedMetadataSearch: React.FC<AdvancedMetadataSearchProps> = ({
  filters = {},
  onFiltersChange,
  showFilters = false,
  ...searchProps
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const categories = ['Generation', 'Models', 'Workflow', 'Performance', 'Image', 'Prompts']
  const dataTypes = ['string', 'number', 'boolean', 'object', 'array']

  const handleFilterChange = (key: keyof SearchFilter, value: any) => {
    const newFilters = { ...filters, [key]: value }
    onFiltersChange?.(newFilters)
  }

  return (
    <div className="advanced-metadata-search">
      <div className="search-header">
        <MetadataSearch {...searchProps} />
        
        {showFilters && (
          <button
            type="button"
            className={`filters-toggle ${filtersOpen ? 'active' : ''}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-label="Toggle search filters"
            title="Search filters"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z"
              />
            </svg>
          </button>
        )}
      </div>

      {showFilters && filtersOpen && (
        <div className="search-filters">
          {/* Category Filter */}
          <div className="filter-group">
            <label className="filter-label">Categories:</label>
            <div className="filter-options">
              {categories.map(category => (
                <label key={category} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.category?.includes(category) || false}
                    onChange={(e) => {
                      const current = filters.category || []
                      const updated = e.target.checked
                        ? [...current, category]
                        : current.filter(c => c !== category)
                      handleFilterChange('category', updated.length > 0 ? updated : undefined)
                    }}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Data Type Filter */}
          <div className="filter-group">
            <label className="filter-label">Data Types:</label>
            <div className="filter-options">
              {dataTypes.map(type => (
                <label key={type} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.dataType?.includes(type) || false}
                    onChange={(e) => {
                      const current = filters.dataType || []
                      const updated = e.target.checked
                        ? [...current, type]
                        : current.filter(t => t !== type)
                      handleFilterChange('dataType', updated.length > 0 ? updated : undefined)
                    }}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Has Value Filter */}
          <div className="filter-group">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.hasValue || false}
                onChange={(e) => handleFilterChange('hasValue', e.target.checked || undefined)}
              />
              <span>Has Value</span>
            </label>
          </div>

          {/* Clear Filters */}
          <div className="filter-actions">
            <button
              type="button"
              className="clear-filters"
              onClick={() => onFiltersChange?.({})}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}