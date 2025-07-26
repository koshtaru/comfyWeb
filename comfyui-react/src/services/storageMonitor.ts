// ============================================================================
// ComfyUI React - Storage Monitoring Service
// ============================================================================

import type { IPreset, IPresetStorageInfo } from '@/types/preset'

// Storage metrics interface
export interface StorageMetrics {
  usedBytes: number
  quotaBytes: number
  percentUsed: number
  availableBytes: number
  criticalThreshold: number // percentage
  warningThreshold: number // percentage
}

// Storage analysis result
export interface StorageAnalysis {
  metrics: StorageMetrics
  largestPresets: Array<{
    id: string
    name: string
    size: number
    compressionRatio: number
    lastUsed?: Date
  }>
  compressionOpportunities: Array<{
    id: string
    name: string
    currentSize: number
    potentialSavings: number
    compressionRatio: number
  }>
  cleanupSuggestions: Array<{
    id: string
    name: string
    reason: string
    priority: 'low' | 'medium' | 'high'
    potentialSavings: number
  }>
  optimizationRecommendations: string[]
}

// Usage tracking for analytics
interface PresetUsageTracker {
  [presetId: string]: {
    lastUsed: Date
    useCount: number
    totalTimeUsed: number
  }
}

/**
 * Comprehensive storage monitoring and optimization service
 * Tracks localStorage usage, analyzes preset storage efficiency,
 * and provides optimization recommendations
 */
export class StorageMonitorService {
  private usageTracker: PresetUsageTracker = {}
  private readonly USAGE_TRACKER_KEY = 'comfyui-preset-usage-tracker'
  private readonly CRITICAL_THRESHOLD = 90 // 90% storage usage
  private readonly WARNING_THRESHOLD = 75 // 75% storage usage

  constructor() {
    this.loadUsageTracker()
  }

  /**
   * Get current storage metrics using navigator.storage.estimate()
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      // Try to use the Storage API if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const usedBytes = estimate.usage || 0
        const quotaBytes = estimate.quota || 0
        
        return {
          usedBytes,
          quotaBytes,
          percentUsed: quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0,
          availableBytes: quotaBytes - usedBytes,
          criticalThreshold: this.CRITICAL_THRESHOLD,
          warningThreshold: this.WARNING_THRESHOLD,
        }
      }

      // Fallback: Calculate localStorage usage manually
      return this.calculateLocalStorageUsage()
    } catch (error) {
      console.warn('Failed to get storage estimate, using fallback:', error)
      return this.calculateLocalStorageUsage()
    }
  }

  /**
   * Fallback method to calculate localStorage usage
   */
  private calculateLocalStorageUsage(): StorageMetrics {
    let totalSize = 0
    
    // Calculate size of all localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key) || ''
        totalSize += key.length + value.length
      }
    }

    // Estimate total quota (browsers typically allow 5-10MB for localStorage)
    const estimatedQuota = 10 * 1024 * 1024 // 10MB estimate
    
    return {
      usedBytes: totalSize * 2, // UTF-16 encoding (2 bytes per character)
      quotaBytes: estimatedQuota,
      percentUsed: (totalSize * 2 / estimatedQuota) * 100,
      availableBytes: estimatedQuota - (totalSize * 2),
      criticalThreshold: this.CRITICAL_THRESHOLD,
      warningThreshold: this.WARNING_THRESHOLD,
    }
  }

  /**
   * Analyze preset storage and provide optimization recommendations
   */
  async analyzeStorage(presets: IPreset[]): Promise<StorageAnalysis> {
    const metrics = await this.getStorageMetrics()
    
    // Sort presets by size (largest first)
    const largestPresets = [...presets]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(preset => ({
        id: preset.id,
        name: preset.name,
        size: preset.size,
        compressionRatio: preset.compressed ? 0.6 : 1.0, // Estimate
        lastUsed: this.usageTracker[preset.id]?.lastUsed,
      }))

    // Identify compression opportunities
    const compressionOpportunities = presets
      .filter(preset => !preset.compressed && preset.size > 1024)
      .map(preset => {
        const estimatedCompressedSize = preset.size * 0.6 // Estimate 40% compression
        return {
          id: preset.id,
          name: preset.name,
          currentSize: preset.size,
          potentialSavings: preset.size - estimatedCompressedSize,
          compressionRatio: 0.6,
        }
      })
      .sort((a, b) => b.potentialSavings - a.potentialSavings)
      .slice(0, 10)

    // Generate cleanup suggestions
    const cleanupSuggestions = this.generateCleanupSuggestions(presets)

    // Generate optimization recommendations
    const optimizationRecommendations = this.generateOptimizationRecommendations(
      metrics, 
      presets,
      compressionOpportunities.length,
      cleanupSuggestions.length
    )

    return {
      metrics,
      largestPresets,
      compressionOpportunities,
      cleanupSuggestions,
      optimizationRecommendations,
    }
  }

  /**
   * Generate cleanup suggestions based on usage patterns
   */
  private generateCleanupSuggestions(presets: IPreset[]): StorageAnalysis['cleanupSuggestions'] {
    const now = new Date()
    const suggestions: StorageAnalysis['cleanupSuggestions'] = []

    for (const preset of presets) {
      const usage = this.usageTracker[preset.id]
      const daysSinceLastUsed = usage?.lastUsed 
        ? Math.floor((now.getTime() - usage.lastUsed.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - preset.lastModified.getTime()) / (1000 * 60 * 60 * 24))

      // Suggest cleanup for unused presets
      if (daysSinceLastUsed > 90) {
        suggestions.push({
          id: preset.id,
          name: preset.name,
          reason: `Not used for ${daysSinceLastUsed} days`,
          priority: daysSinceLastUsed > 180 ? 'high' : 'medium',
          potentialSavings: preset.size,
        })
      }

      // Suggest cleanup for rarely used large presets
      if (preset.size > 100 * 1024 && usage && usage.useCount < 3 && daysSinceLastUsed > 30) {
        suggestions.push({
          id: preset.id,
          name: preset.name,
          reason: `Large preset (${this.formatBytes(preset.size)}) used only ${usage.useCount} times`,
          priority: 'medium',
          potentialSavings: preset.size,
        })
      }
    }

    // Sort by potential savings (highest first)
    return suggestions
      .sort((a, b) => b.potentialSavings - a.potentialSavings)
      .slice(0, 20) // Limit to top 20 suggestions
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    metrics: StorageMetrics,
    presets: IPreset[],
    compressionOpportunities: number,
    cleanupSuggestions: number
  ): string[] {
    const recommendations: string[] = []

    // Storage usage recommendations
    if (metrics.percentUsed > this.CRITICAL_THRESHOLD) {
      recommendations.push(
        `Critical: Storage is ${metrics.percentUsed.toFixed(1)}% full. Immediate cleanup required.`
      )
    } else if (metrics.percentUsed > this.WARNING_THRESHOLD) {
      recommendations.push(
        `Warning: Storage is ${metrics.percentUsed.toFixed(1)}% full. Consider cleanup soon.`
      )
    }

    // Compression recommendations
    if (compressionOpportunities > 0) {
      const uncompressedCount = presets.filter(p => !p.compressed).length
      recommendations.push(
        `Enable compression for ${uncompressedCount} presets to save storage space.`
      )
    }

    // Cleanup recommendations
    if (cleanupSuggestions > 0) {
      recommendations.push(
        `Remove ${cleanupSuggestions} unused presets to free up space.`
      )
    }

    // General optimization
    const totalPresets = presets.length
    if (totalPresets > 100) {
      recommendations.push(
        `Consider organizing ${totalPresets} presets into categories for better management.`
      )
    }

    // Performance recommendations
    const largePresets = presets.filter(p => p.size > 500 * 1024).length
    if (largePresets > 10) {
      recommendations.push(
        `${largePresets} presets are very large (>500KB). Consider splitting complex workflows.`
      )
    }

    return recommendations
  }

  /**
   * Track preset usage for analytics
   */
  trackPresetUsage(presetId: string, usageDurationMs: number = 0): void {
    const now = new Date()
    
    if (!this.usageTracker[presetId]) {
      this.usageTracker[presetId] = {
        lastUsed: now,
        useCount: 0,
        totalTimeUsed: 0,
      }
    }

    const usage = this.usageTracker[presetId]
    usage.lastUsed = now
    usage.useCount += 1
    usage.totalTimeUsed += usageDurationMs

    this.saveUsageTracker()
  }

  /**
   * Get preset storage information for the store
   */
  async getPresetStorageInfo(presets: IPreset[]): Promise<IPresetStorageInfo> {
    const metrics = await this.getStorageMetrics()
    const totalSize = presets.reduce((sum, preset) => sum + preset.size, 0)
    const compressedPresets = presets.filter(p => p.compressed)
    const uncompressedSize = presets
      .filter(p => !p.compressed)
      .reduce((sum, preset) => sum + preset.size, 0)
    const compressedSize = compressedPresets.reduce((sum, preset) => sum + preset.size, 0)
    
    // Calculate compression ratio
    const originalCompressedSize = compressedSize / 0.6 // Assume 40% compression
    const totalOriginalSize = uncompressedSize + originalCompressedSize
    const compressionRatio = totalOriginalSize > 0 ? totalSize / totalOriginalSize : 1.0

    return {
      totalSize,
      presetCount: presets.length,
      compressionRatio,
      availableSpace: metrics.availableBytes,
      quotaUsagePercent: metrics.percentUsed,
      needsCleanup: metrics.percentUsed > this.WARNING_THRESHOLD,
    }
  }

  /**
   * Perform automatic cleanup based on configured rules
   */
  async performAutomaticCleanup(
    presets: IPreset[],
    maxPresets: number = 1000,
    maxUsagePercent: number = 85
  ): Promise<{
    deletedCount: number
    spaceFreed: number
    deletedPresetIds: string[]
  }> {
    const metrics = await this.getStorageMetrics()
    
    if (metrics.percentUsed < maxUsagePercent && presets.length <= maxPresets) {
      return { deletedCount: 0, spaceFreed: 0, deletedPresetIds: [] }
    }

    const analysis = await this.analyzeStorage(presets)
    const toDelete = analysis.cleanupSuggestions
      .filter(suggestion => suggestion.priority === 'high')
      .slice(0, Math.min(20, presets.length - maxPresets))

    const deletedPresetIds = toDelete.map(suggestion => suggestion.id)
    const spaceFreed = toDelete.reduce((sum, suggestion) => sum + suggestion.potentialSavings, 0)

    return {
      deletedCount: toDelete.length,
      spaceFreed,
      deletedPresetIds,
    }
  }

  /**
   * Load usage tracker from localStorage
   */
  private loadUsageTracker(): void {
    try {
      const stored = localStorage.getItem(this.USAGE_TRACKER_KEY)
      if (stored) {
        const data = JSON.parse(stored) as Record<string, any>
        // Convert date strings back to Date objects
        for (const presetId in data) {
          if (data[presetId].lastUsed) {
            data[presetId].lastUsed = new Date(data[presetId].lastUsed)
          }
        }
        this.usageTracker = data
      }
    } catch (error) {
      console.error('Failed to load usage tracker:', error)
      this.usageTracker = {}
    }
  }

  /**
   * Save usage tracker to localStorage
   */
  private saveUsageTracker(): void {
    try {
      localStorage.setItem(this.USAGE_TRACKER_KEY, JSON.stringify(this.usageTracker))
    } catch (error) {
      console.error('Failed to save usage tracker:', error)
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Clear all usage tracking data
   */
  clearUsageTracking(): void {
    this.usageTracker = {}
    localStorage.removeItem(this.USAGE_TRACKER_KEY)
  }

  /**
   * Export usage analytics
   */
  exportUsageAnalytics(): {
    totalTrackedPresets: number
    mostUsedPresets: Array<{
      presetId: string
      useCount: number
      lastUsed: Date
      totalTimeUsed: number
    }>
    usageStatistics: {
      averageUseCount: number
      totalUsageTime: number
      activePresets: number // used in last 30 days
    }
  } {
    const entries = Object.entries(this.usageTracker)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const mostUsedPresets = entries
      .map(([presetId, usage]) => ({
        presetId,
        useCount: usage.useCount,
        lastUsed: usage.lastUsed,
        totalTimeUsed: usage.totalTimeUsed,
      }))
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 20)

    const activePresets = entries.filter(([, usage]) => usage.lastUsed > thirtyDaysAgo).length
    const totalUseCount = entries.reduce((sum, [, usage]) => sum + usage.useCount, 0)
    const totalUsageTime = entries.reduce((sum, [, usage]) => sum + usage.totalTimeUsed, 0)

    return {
      totalTrackedPresets: entries.length,
      mostUsedPresets,
      usageStatistics: {
        averageUseCount: entries.length > 0 ? totalUseCount / entries.length : 0,
        totalUsageTime,
        activePresets,
      },
    }
  }
}

// Default instance
export const storageMonitorService = new StorageMonitorService()

// Utility functions
export const getStorageMetrics = () => storageMonitorService.getStorageMetrics()
export const analyzeStorage = (presets: IPreset[]) => storageMonitorService.analyzeStorage(presets)
export const trackPresetUsage = (presetId: string, duration?: number) => 
  storageMonitorService.trackPresetUsage(presetId, duration)