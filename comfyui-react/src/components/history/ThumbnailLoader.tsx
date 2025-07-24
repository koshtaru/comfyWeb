// ============================================================================
// ComfyUI React - Thumbnail Loader with Lazy Loading and Caching
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { historyManager } from '@/services/historyManager'
import './ThumbnailLoader.css'

interface ThumbnailLoaderProps {
  generationId: string
  imageIndex?: number
  width?: number
  height?: number
  className?: string
  alt?: string
  onLoad?: () => void
  onError?: (error: Error) => void
  placeholder?: React.ReactNode
  errorFallback?: React.ReactNode
}

// In-memory cache for loaded thumbnails
const thumbnailCache = new Map<string, string>()

// Intersection observer for lazy loading
let intersectionObserver: IntersectionObserver | null = null

// Initialize intersection observer
const getIntersectionObserver = (): IntersectionObserver => {
  if (!intersectionObserver && typeof window !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            const loadCallback = (target as any).__thumbnailLoadCallback
            if (loadCallback) {
              loadCallback()
              intersectionObserver?.unobserve(target)
            }
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before the image is visible
        threshold: 0.1
      }
    )
  }
  return intersectionObserver!
}

export const ThumbnailLoader: React.FC<ThumbnailLoaderProps> = ({
  generationId,
  imageIndex = 0,
  width = 256,
  height = 256,
  className = '',
  alt = 'Generated image thumbnail',
  onLoad,
  onError,
  placeholder,
  errorFallback
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isInView, setIsInView] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const cacheKey = `${generationId}_${imageIndex}`

  // Load thumbnail from IndexedDB
  const loadThumbnail = useCallback(async () => {
    if (isLoading || imageUrl || error) return

    setIsLoading(true)
    setError(null)

    try {
      // Check cache first
      if (thumbnailCache.has(cacheKey)) {
        const cachedUrl = thumbnailCache.get(cacheKey)!
        setImageUrl(cachedUrl)
        setIsLoading(false)
        onLoad?.()
        return
      }

      // Load from IndexedDB
      const thumbnailBlob = await historyManager.getThumbnail(generationId, imageIndex)
      
      if (!thumbnailBlob) {
        throw new Error('Thumbnail not found')
      }

      // Create object URL from blob
      const url = URL.createObjectURL(thumbnailBlob)
      
      // Cache the URL
      thumbnailCache.set(cacheKey, url)
      
      setImageUrl(url)
      onLoad?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load thumbnail')
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [generationId, imageIndex, cacheKey, isLoading, imageUrl, error, onLoad, onError])

  // Set up intersection observer for lazy loading
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = getIntersectionObserver()
    
    // Store the load callback on the element
    ;(container as any).__thumbnailLoadCallback = loadThumbnail
    
    observer.observe(container)

    return () => {
      observer.unobserve(container)
      ;(container as any).__thumbnailLoadCallback = null
    }
  }, [loadThumbnail])

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl)
        thumbnailCache.delete(cacheKey)
      }
    }
  }, [imageUrl, cacheKey])

  // Handle image load success
  const handleImageLoad = () => {
    setIsInView(true)
  }

  // Handle image load error
  const handleImageError = () => {
    const error = new Error('Failed to display thumbnail')
    setError(error)
    onError?.(error)
  }

  // Retry loading
  const retry = () => {
    setError(null)
    setImageUrl(null)
    loadThumbnail()
  }

  // Default placeholder
  const defaultPlaceholder = (
    <div className="thumbnail-placeholder">
      <div className="placeholder-content">
        {isLoading ? (
          <div className="loading-spinner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          </div>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
        )}
      </div>
    </div>
  )

  // Default error fallback
  const defaultErrorFallback = (
    <div className="thumbnail-error">
      <div className="error-content">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <p className="error-message">Failed to load</p>
        <button 
          type="button" 
          onClick={retry}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={`thumbnail-loader ${className}`}
      style={{ width, height }}
    >
      {error ? (
        errorFallback || defaultErrorFallback
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`thumbnail-image ${isInView ? 'loaded' : ''}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        placeholder || defaultPlaceholder
      )}
    </div>
  )
}

// Utility function to preload thumbnails
export const preloadThumbnails = async (generationIds: string[], imageIndex: number = 0): Promise<void> => {
  const loadPromises = generationIds.map(async (generationId) => {
    const cacheKey = `${generationId}_${imageIndex}`
    
    // Skip if already cached
    if (thumbnailCache.has(cacheKey)) {
      return
    }

    try {
      const thumbnailBlob = await historyManager.getThumbnail(generationId, imageIndex)
      if (thumbnailBlob) {
        const url = URL.createObjectURL(thumbnailBlob)
        thumbnailCache.set(cacheKey, url)
      }
    } catch (error) {
      // Silently ignore preload errors
      console.warn(`Failed to preload thumbnail for ${generationId}:`, error)
    }
  })

  await Promise.allSettled(loadPromises)
}

// Utility function to clear thumbnail cache
export const clearThumbnailCache = (): void => {
  // Revoke all object URLs to prevent memory leaks
  thumbnailCache.forEach((url) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
  
  thumbnailCache.clear()
}

// Utility function to get cache stats
export const getThumbnailCacheStats = (): { size: number; urls: string[] } => {
  return {
    size: thumbnailCache.size,
    urls: Array.from(thumbnailCache.values())
  }
}

export default ThumbnailLoader