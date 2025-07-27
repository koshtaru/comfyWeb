// ============================================================================
// ComfyUI React - Generation Parameter Utilities
// ============================================================================

/**
 * Quality level assessment based on step count
 */
export function getQualityClass(steps: number): string {
  if (steps < 15) return 'quality-low'
  if (steps < 25) return 'quality-medium'
  if (steps < 40) return 'quality-high'
  return 'quality-ultra'
}

/**
 * Get quality label for step count
 */
export function getQualityLabel(steps: number): string {
  if (steps < 15) return 'Low'
  if (steps < 25) return 'Good'
  if (steps < 40) return 'High'
  return 'Ultra'
}

/**
 * Estimate generation time based on step count
 */
export function getTimeEstimate(steps: number): string {
  // Rough estimates based on typical generation times
  if (steps < 15) return '~10-20s'
  if (steps < 25) return '~20-40s'
  if (steps < 40) return '~40-80s'
  return '~80s+'
}

/**
 * Get quality impact description for steps
 */
export function getQualityImpact(steps: number): string {
  if (steps < 10) return 'Very Fast, Lower Quality'
  if (steps < 15) return 'Fast, Basic Quality'
  if (steps < 25) return 'Balanced Speed/Quality'
  if (steps < 40) return 'High Quality, Slower'
  if (steps < 60) return 'Ultra Quality, Much Slower'
  return 'Maximum Quality, Very Slow'
}

/**
 * Get CFG scale guidance description
 */
export function getPromptAdherence(cfg: number): string {
  if (cfg < 2) return 'Very Creative'
  if (cfg < 5) return 'Creative'
  if (cfg < 8) return 'Balanced'
  if (cfg < 12) return 'Strict'
  return 'Very Strict'
}

/**
 * Get creativity level based on CFG scale
 */
export function getCreativity(cfg: number): string {
  if (cfg < 2) return 'Maximum Creativity'
  if (cfg < 5) return 'High Creativity'
  if (cfg < 8) return 'Moderate Creativity'
  if (cfg < 12) return 'Low Creativity'
  return 'Minimal Creativity'
}

/**
 * Validate generation parameters
 */
export function validateGenerationParams(params: {
  steps?: number
  cfg?: number
  width?: number
  height?: number
  seed?: number
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (params.steps !== undefined) {
    if (params.steps < 1 || params.steps > 150) {
      errors.push('Steps must be between 1 and 150')
    }
  }

  if (params.cfg !== undefined) {
    if (params.cfg < 0.1 || params.cfg > 30) {
      errors.push('CFG Scale must be between 0.1 and 30')
    }
  }

  if (params.width !== undefined) {
    if (params.width < 64 || params.width > 2048 || params.width % 8 !== 0) {
      errors.push('Width must be between 64-2048 and divisible by 8')
    }
  }

  if (params.height !== undefined) {
    if (params.height < 64 || params.height > 2048 || params.height % 8 !== 0) {
      errors.push('Height must be between 64-2048 and divisible by 8')
    }
  }

  if (params.seed !== undefined) {
    if (params.seed < -1 || params.seed > 2147483647) {
      errors.push('Seed must be between -1 and 2147483647')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}