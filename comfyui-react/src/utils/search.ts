// ============================================================================
// ComfyUI React - Search and Text Highlighting Utilities
// ============================================================================

import React from 'react'

/**
 * Highlight matching text in a string
 */
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text
  }

  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  const index = textLower.indexOf(queryLower)

  if (index === -1) {
    return text
  }

  return React.createElement(
    React.Fragment,
    null,
    text.substring(0, index),
    React.createElement(
      'mark',
      { className: 'bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white px-1 rounded' },
      text.substring(index, index + query.length)
    ),
    text.substring(index + query.length)
  )
}

/**
 * Search for text within an object's values
 */
export function searchInObject(obj: unknown, query: string): boolean {
  if (!query.trim()) return true

  const queryLower = query.toLowerCase()

  function searchValue(value: unknown): boolean {
    if (value === null || value === undefined) return false
    
    if (typeof value === 'string') {
      return value.toLowerCase().includes(queryLower)
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).toLowerCase().includes(queryLower)
    }
    
    if (Array.isArray(value)) {
      return value.some(item => searchValue(item))
    }
    
    if (typeof value === 'object') {
      return Object.values(value).some(val => searchValue(val))
    }
    
    return false
  }

  return searchValue(obj)
}

/**
 * Filter array of objects by search query
 */
export function filterBySearch<T>(
  items: T[], 
  query: string,
  searchFields?: (keyof T)[]
): T[] {
  if (!query.trim()) return items

  return items.filter(item => {
    if (searchFields) {
      // Search only in specified fields
      return searchFields.some(field => {
        const value = item[field]
        return searchInObject(value, query)
      })
    } else {
      // Search in all object values
      return searchInObject(item, query)
    }
  })
}

/**
 * Get search result statistics
 */
export function getSearchStats(
  totalItems: number,
  filteredItems: number,
  query: string
): string {
  if (!query.trim()) {
    return `Showing all ${totalItems} items`
  }
  
  if (filteredItems === 0) {
    return `No results found for "${query}"`
  }
  
  if (filteredItems === totalItems) {
    return `All ${totalItems} items match "${query}"`
  }
  
  return `Showing ${filteredItems} of ${totalItems} items for "${query}"`
}

/**
 * Debounce search input to improve performance
 */
export function useSearchDebounce<T>(
  items: T[],
  query: string,
  searchFields?: (keyof T)[],
  delay = 300
): T[] {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query)
  const [filteredItems, setFilteredItems] = React.useState(items)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, delay)

    return () => clearTimeout(timer)
  }, [query, delay])

  React.useEffect(() => {
    const filtered = filterBySearch(items, debouncedQuery, searchFields)
    setFilteredItems(filtered)
  }, [items, debouncedQuery, searchFields])

  return filteredItems
}