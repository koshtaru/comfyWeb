import type { ExtractedParameters } from '@/utils/parameterExtractor'
import type { ParameterSet } from '@/components/parameters'

/**
 * Utility functions to convert between ExtractedParameters (workflow system) 
 * and ParameterSet (preset system) formats
 */

/**
 * Convert ExtractedParameters to ParameterSet for preset system compatibility
 */
export function extractedParametersToParameterSet(
  extractedParams: ExtractedParameters
): ParameterSet {
  return {
    steps: extractedParams.generation.steps || 20,
    cfg: extractedParams.generation.cfg || 7.0,
    width: extractedParams.image.width || 512,
    height: extractedParams.image.height || 512,
    seed: extractedParams.generation.seed !== undefined ? extractedParams.generation.seed : -1,
    batchSize: extractedParams.image.batchSize || 1,
    batchCount: 1, // ExtractedParameters doesn't have batchCount, default to 1
    sampler: extractedParams.generation.sampler,
    scheduler: extractedParams.generation.scheduler
  }
}

/**
 * Convert ParameterSet to a format that can be applied to ExtractedParameters
 * Returns an array of parameter change objects
 */
export interface ParameterChange {
  nodeId: string
  parameter: string
  value: any
}

export function parameterSetToChanges(
  parameterSet: ParameterSet,
  extractedParams: ExtractedParameters
): ParameterChange[] {
  const changes: ParameterChange[] = []

  // Generation parameters
  if (parameterSet.steps !== extractedParams.generation.steps) {
    changes.push({
      nodeId: extractedParams.generation.nodeId || '',
      parameter: 'steps',
      value: parameterSet.steps
    })
  }

  if (parameterSet.cfg !== extractedParams.generation.cfg) {
    changes.push({
      nodeId: extractedParams.generation.nodeId || '',
      parameter: 'cfg',
      value: parameterSet.cfg
    })
  }

  if (parameterSet.seed !== extractedParams.generation.seed) {
    changes.push({
      nodeId: extractedParams.generation.nodeId || '',
      parameter: 'seed',
      value: parameterSet.seed
    })
  }

  // Image parameters
  if (parameterSet.width !== extractedParams.image.width) {
    changes.push({
      nodeId: extractedParams.image.nodeId || '',
      parameter: 'width',
      value: parameterSet.width
    })
  }

  if (parameterSet.height !== extractedParams.image.height) {
    changes.push({
      nodeId: extractedParams.image.nodeId || '',
      parameter: 'height',
      value: parameterSet.height
    })
  }

  if (parameterSet.batchSize !== extractedParams.image.batchSize) {
    changes.push({
      nodeId: extractedParams.image.nodeId || '',
      parameter: 'batch_size',
      value: parameterSet.batchSize
    })
  }

  return changes
}

/**
 * Apply a ParameterSet to the current parameters by generating change events
 */
export function applyParameterSet(
  parameterSet: ParameterSet,
  extractedParams: ExtractedParameters,
  onParameterChange: (nodeId: string, parameter: string, value: any) => void
): void {
  const changes = parameterSetToChanges(parameterSet, extractedParams)
  
  // Apply all changes
  changes.forEach(change => {
    onParameterChange(change.nodeId, change.parameter, change.value)
  })
}

/**
 * Check if current parameters match a ParameterSet (for preset highlighting)
 */
export function parametersMatchPreset(
  extractedParams: ExtractedParameters,
  parameterSet: ParameterSet
): boolean {
  const currentSet = extractedParametersToParameterSet(extractedParams)
  
  return (
    currentSet.steps === parameterSet.steps &&
    currentSet.cfg === parameterSet.cfg &&
    currentSet.width === parameterSet.width &&
    currentSet.height === parameterSet.height &&
    currentSet.seed === parameterSet.seed &&
    currentSet.batchSize === parameterSet.batchSize
  )
}

/**
 * Get a readable description of what parameters would change when applying a preset
 */
export function getPresetChangeDescription(
  parameterSet: ParameterSet,
  extractedParams: ExtractedParameters
): string[] {
  const changes = parameterSetToChanges(parameterSet, extractedParams)
  
  return changes.map(change => {
    switch (change.parameter) {
      case 'steps':
        return `Steps: ${extractedParams.generation.steps} → ${change.value}`
      case 'cfg':
        return `CFG Scale: ${extractedParams.generation.cfg} → ${change.value}`
      case 'seed':
        return `Seed: ${extractedParams.generation.seed === -1 ? 'Random' : extractedParams.generation.seed} → ${change.value === -1 ? 'Random' : change.value}`
      case 'width':
        return `Width: ${extractedParams.image.width} → ${change.value}`
      case 'height':
        return `Height: ${extractedParams.image.height} → ${change.value}`
      case 'batch_size':
        return `Batch Size: ${extractedParams.image.batchSize} → ${change.value}`
      default:
        return `${change.parameter}: ${change.value}`
    }
  })
}

/**
 * Create a default ParameterSet for when no parameters are available
 */
export function createDefaultParameterSet(): ParameterSet {
  return {
    steps: 20,
    cfg: 7.0,
    width: 512,
    height: 512,
    seed: -1,
    batchSize: 1,
    batchCount: 1
  }
}

/**
 * Validate that a ParameterSet has reasonable values
 */
export function validateParameterSet(parameterSet: ParameterSet): string[] {
  const errors: string[] = []

  if (parameterSet.steps < 1 || parameterSet.steps > 150) {
    errors.push('Steps must be between 1 and 150')
  }

  if (parameterSet.cfg < 1 || parameterSet.cfg > 30) {
    errors.push('CFG Scale must be between 1 and 30')
  }

  if (parameterSet.width < 64 || parameterSet.width > 4096) {
    errors.push('Width must be between 64 and 4096')
  }

  if (parameterSet.height < 64 || parameterSet.height > 4096) {
    errors.push('Height must be between 64 and 4096')
  }

  if (parameterSet.width % 8 !== 0) {
    errors.push('Width must be divisible by 8')
  }

  if (parameterSet.height % 8 !== 0) {
    errors.push('Height must be divisible by 8')
  }

  if (parameterSet.batchSize < 1 || parameterSet.batchSize > 16) {
    errors.push('Batch size must be between 1 and 16')
  }

  if (parameterSet.batchCount < 1 || parameterSet.batchCount > 100) {
    errors.push('Batch count must be between 1 and 100')
  }

  return errors
}