// ============================================================================
// ComfyUI React - Enhanced Model Information Parser with Compatibility Analysis
// ============================================================================

import type { MetadataSchema, CheckpointInfo, LoRAInfo, VAEInfo } from '@/utils/metadataParser'

// Model architecture definitions
export interface ModelArchitecture {
  name: string
  type: 'SD1.5' | 'SDXL' | 'SD3' | 'Flux' | 'Unknown'
  baseModel: string
  version: string
  clipSkipSupport: boolean
  maxResolution: { width: number; height: number }
  recommendedResolutions: Array<{ width: number; height: number; label: string }>
  supportedSamplers: string[]
  supportedSchedulers: string[]
  vramRequirement: number // in MB
  features: ModelFeatures
}

export interface ModelFeatures {
  supportsImg2Img: boolean
  supportsInpainting: boolean
  supportsControlNet: boolean
  supportsLoRA: boolean
  supportsTextualInversion: boolean
  supportsRegionalPrompting: boolean
  supportsHighResolution: boolean
  supportsFaceRestoration: boolean
}

// Model verification and hash information
export interface ModelVerification {
  hash?: string
  sha256?: string
  size?: number
  verified: boolean
  source?: 'civitai' | 'huggingface' | 'local' | 'unknown'
  downloadUrl?: string
  modelPage?: string
  license?: string
  triggerWords?: string[]
  nsfw?: boolean
}

// Compatibility analysis results
export interface CompatibilityAnalysis {
  overall: 'excellent' | 'good' | 'warning' | 'error'
  score: number // 0-100
  warnings: CompatibilityWarning[]
  recommendations: string[]
  issues: CompatibilityIssue[]
}

export interface CompatibilityWarning {
  type: 'resolution' | 'sampler' | 'scheduler' | 'clipskip' | 'vram' | 'architecture' | 'lora' | 'parameter'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion: string
  learnMoreUrl?: string
}

export interface CompatibilityIssue {
  type: 'conflict' | 'incompatible' | 'suboptimal' | 'deprecated'
  component: string
  description: string
  solution: string
  impact: 'performance' | 'quality' | 'functionality'
}

// Enhanced model information
export interface EnhancedModelInfo {
  checkpoint: EnhancedCheckpointInfo
  vae?: EnhancedVAEInfo
  loras: EnhancedLoRAInfo[]
  architecture: ModelArchitecture
  verification: ModelVerification
  compatibility: CompatibilityAnalysis
  metadata: ModelMetadata
}

export interface EnhancedCheckpointInfo extends CheckpointInfo {
  fullName: string
  shortName: string
  category: 'realistic' | 'anime' | 'artistic' | 'photographic' | 'other'
  style: string
  trainingDataset?: string
  baseModelLineage: string[]
  mergeDetails?: ModelMergeInfo
  verification: ModelVerification
}

export interface EnhancedVAEInfo extends VAEInfo {
  fullName: string
  compatibility: string[]
  encoderType: string
  decoderType: string
  latentChannels: number
  verification: ModelVerification
}

export interface EnhancedLoRAInfo extends LoRAInfo {
  fullName: string
  category: string
  style: string
  baseModel: string
  compatibility: string[]
  optimal: OptimalLoRASettings
  verification: ModelVerification
}

export interface ModelMergeInfo {
  method: 'weighted' | 'add_difference' | 'block_weighted'
  models: Array<{ name: string; weight: number }>
  recipe?: string
}

export interface OptimalLoRASettings {
  modelStrength: { min: number; max: number; recommended: number }
  clipStrength: { min: number; max: number; recommended: number }
  recommendedTriggers: string[]
  incompatibleWith: string[]
}

export interface ModelMetadata {
  tags: string[]
  description?: string
  author?: string
  version?: string
  createdAt?: string
  updatedAt?: string
  downloads?: number
  rating?: number
  examples?: ModelExample[]
}

export interface ModelExample {
  prompt: string
  negativePrompt?: string
  settings: {
    steps: number
    cfg: number
    sampler: string
    scheduler: string
    seed?: number
  }
  imageUrl?: string
}

export class ModelInfoParser {
  private architectureDatabase: Map<string, ModelArchitecture> = new Map()
  private modelDatabase: Map<string, ModelVerification> = new Map()

  constructor() {
    this.initializeArchitectureDatabase()
    this.initializeModelDatabase()
  }

  /**
   * Parse and enhance model information from metadata
   */
  parseModelInfo(metadata: MetadataSchema): EnhancedModelInfo {
    const checkpoint = this.enhanceCheckpointInfo(metadata.models.checkpoint)
    const vae = metadata.models.vae ? this.enhanceVAEInfo(metadata.models.vae) : undefined
    const loras = metadata.models.loras.map(lora => this.enhanceLoRAInfo(lora))
    
    const architecture = this.detectArchitecture(checkpoint, metadata)
    const verification = this.verifyModel(checkpoint.name)
    const compatibility = this.analyzeCompatibility(metadata, architecture)

    return {
      checkpoint,
      vae,
      loras,
      architecture,
      verification,
      compatibility,
      metadata: this.extractModelMetadata(checkpoint.name)
    }
  }

  /**
   * Enhance checkpoint information with additional details
   */
  private enhanceCheckpointInfo(checkpoint: CheckpointInfo): EnhancedCheckpointInfo {
    const verification = this.verifyModel(checkpoint.name)
    const { fullName, shortName } = this.parseModelName(checkpoint.name)
    const category = this.categorizeModel(checkpoint.name)
    const style = this.determineModelStyle(checkpoint.name)
    const baseModelLineage = this.extractBaseModelLineage(checkpoint.name)
    const mergeDetails = this.extractMergeDetails(checkpoint.name)

    return {
      ...checkpoint,
      fullName,
      shortName,
      category,
      style,
      baseModelLineage,
      mergeDetails,
      verification
    }
  }

  /**
   * Enhance VAE information with technical details
   */
  private enhanceVAEInfo(vae: VAEInfo): EnhancedVAEInfo {
    const verification = this.verifyModel(vae.name)
    const { fullName } = this.parseModelName(vae.name)
    const compatibility = this.getVAECompatibility(vae.name)
    const { encoderType, decoderType, latentChannels } = this.getVAETechnicalSpecs(vae.name)

    return {
      ...vae,
      fullName,
      compatibility,
      encoderType,
      decoderType,
      latentChannels,
      verification
    }
  }

  /**
   * Enhance LoRA information with optimization details
   */
  private enhanceLoRAInfo(lora: LoRAInfo): EnhancedLoRAInfo {
    const verification = this.verifyModel(lora.name)
    const { fullName } = this.parseModelName(lora.name)
    const category = this.categorizeLoRA(lora.name)
    const style = this.determineLoRAStyle(lora.name)
    const baseModel = this.getLoRABaseModel(lora.name)
    const compatibility = this.getLoRACompatibility(lora.name)
    const optimal = this.getOptimalLoRASettings(lora.name)

    return {
      ...lora,
      fullName,
      category,
      style,
      baseModel,
      compatibility,
      optimal,
      verification
    }
  }

  /**
   * Detect model architecture from checkpoint and metadata
   */
  private detectArchitecture(checkpoint: EnhancedCheckpointInfo, metadata: MetadataSchema): ModelArchitecture {
    // Try to get from database first
    const knownArch = this.architectureDatabase.get(checkpoint.name.toLowerCase())
    if (knownArch) {
      return knownArch
    }

    // Analyze from name and parameters
    const archType = this.inferArchitectureFromName(checkpoint.name)
    
    // Default architecture based on detected type
    return {
      name: checkpoint.name,
      type: archType,
      baseModel: checkpoint.baseModel,
      version: '1.0',
      clipSkipSupport: archType === 'SD1.5' || archType === 'SDXL',
      maxResolution: this.getMaxResolution(archType),
      recommendedResolutions: this.getRecommendedResolutions(archType),
      supportedSamplers: this.getSupportedSamplers(archType),
      supportedSchedulers: this.getSupportedSchedulers(archType),
      vramRequirement: this.getVRAMRequirement(archType),
      features: this.detectModelFeatures(metadata)
    }
  }

  /**
   * Analyze compatibility between all components
   */
  private analyzeCompatibility(metadata: MetadataSchema, architecture: ModelArchitecture): CompatibilityAnalysis {
    const warnings: CompatibilityWarning[] = []
    const recommendations: string[] = []
    const issues: CompatibilityIssue[] = []

    // Check resolution compatibility
    this.checkResolutionCompatibility(metadata, architecture, warnings, issues)
    
    // Check sampler compatibility
    this.checkSamplerCompatibility(metadata, architecture, warnings, issues)
    
    // Check LoRA compatibility
    this.checkLoRACompatibility(metadata, architecture, warnings, issues)
    
    // Check VRAM requirements
    this.checkVRAMRequirements(metadata, architecture, warnings, issues)
    
    // Check parameter conflicts
    this.checkParameterConflicts(metadata, warnings, issues)

    // Generate recommendations
    this.generateRecommendations(metadata, architecture, recommendations)

    // Calculate overall score
    const score = this.calculateCompatibilityScore(warnings, issues)
    const overall = this.determineOverallRating(score, warnings, issues)

    return {
      overall,
      score,
      warnings,
      recommendations,
      issues
    }
  }

  /**
   * Check resolution compatibility
   */
  private checkResolutionCompatibility(
    metadata: MetadataSchema,
    architecture: ModelArchitecture,
    warnings: CompatibilityWarning[],
    issues: CompatibilityIssue[]
  ): void {
    const width = metadata.generation.image?.width || 512
    const height = metadata.generation.image?.height || 512
    const aspectRatio = width / height

    // Check if resolution exceeds maximum
    if (width > architecture.maxResolution.width || height > architecture.maxResolution.height) {
      warnings.push({
        type: 'resolution',
        severity: 'high',
        message: `Resolution ${width}x${height} exceeds recommended maximum for ${architecture.type}`,
        suggestion: `Use ${architecture.maxResolution.width}x${architecture.maxResolution.height} or lower`,
        learnMoreUrl: '/docs/model-resolutions'
      })
    }

    // Check for non-standard aspect ratios
    if (architecture.type === 'SDXL' && Math.abs(aspectRatio - 1.0) > 0.5) {
      warnings.push({
        type: 'resolution',
        severity: 'medium',
        message: `Extreme aspect ratio ${aspectRatio.toFixed(2)} may produce lower quality results`,
        suggestion: 'Consider using aspect ratios closer to 1:1 for SDXL models'
      })
    }

    // Check for SD1.5 with high resolution
    if (architecture.type === 'SD1.5' && (width > 768 || height > 768)) {
      issues.push({
        type: 'suboptimal',
        component: 'Resolution',
        description: 'SD1.5 models perform best at 512x512 resolution',
        solution: 'Use 512x512 or enable high-resolution fix',
        impact: 'quality'
      })
    }
  }

  /**
   * Check sampler compatibility
   */
  private checkSamplerCompatibility(
    metadata: MetadataSchema,
    architecture: ModelArchitecture,
    warnings: CompatibilityWarning[],
    issues: CompatibilityIssue[]
  ): void {
    const samplers = metadata.generation.samplerChain || []
    
    for (const sampler of samplers) {
      if (!architecture.supportedSamplers.includes(sampler.name)) {
        warnings.push({
          type: 'sampler',
          severity: 'medium',
          message: `Sampler '${sampler.name}' may not be optimal for ${architecture.type}`,
          suggestion: `Try ${architecture.supportedSamplers.slice(0, 3).join(', ')} instead`
        })
      }

      // Check CFG scale compatibility
      if (sampler.cfg > 15 && architecture.type === 'SDXL') {
        issues.push({
          type: 'suboptimal',
          component: 'CFG Scale',
          description: 'SDXL models work best with CFG scale between 3-8',
          solution: `Reduce CFG from ${sampler.cfg} to 3-8 range`,
          impact: 'quality'
        })
      }
    }
  }

  /**
   * Check LoRA compatibility
   */
  private checkLoRACompatibility(
    metadata: MetadataSchema,
    architecture: ModelArchitecture,
    warnings: CompatibilityWarning[],
    issues: CompatibilityIssue[]
  ): void {
    const loras = metadata.models.loras || []
    
    for (const lora of loras) {
      const loraInfo = this.enhanceLoRAInfo(lora)
      
      // Check base model compatibility
      if (loraInfo.baseModel !== architecture.type && loraInfo.baseModel !== 'Unknown') {
        warnings.push({
          type: 'lora',
          severity: 'high',
          message: `LoRA '${lora.name}' is trained for ${loraInfo.baseModel} but used with ${architecture.type}`,
          suggestion: `Use a ${architecture.type}-compatible LoRA instead`
        })
      }
      
      // Check strength recommendations
      if (lora.modelStrength > loraInfo.optimal.modelStrength.max) {
        issues.push({
          type: 'suboptimal',
          component: `LoRA: ${lora.name}`,
          description: `Model strength ${lora.modelStrength} exceeds recommended maximum`,
          solution: `Reduce to ${loraInfo.optimal.modelStrength.recommended} or lower`,
          impact: 'quality'
        })
      }
    }
  }

  /**
   * Check VRAM requirements
   */
  private checkVRAMRequirements(
    metadata: MetadataSchema,
    architecture: ModelArchitecture,
    warnings: CompatibilityWarning[],
    _issues: CompatibilityIssue[]
  ): void {
    const width = metadata.generation.image?.width || 512
    const height = metadata.generation.image?.height || 512
    const batchSize = metadata.generation.image?.batchSize || 1
    
    const estimatedVRAM = this.estimateVRAMUsage(architecture, width, height, batchSize, metadata.models.loras.length)
    
    if (estimatedVRAM > 12000) { // 12GB
      warnings.push({
        type: 'vram',
        severity: 'high',
        message: `Estimated VRAM usage: ${(estimatedVRAM / 1024).toFixed(1)}GB`,
        suggestion: 'Reduce resolution, batch size, or number of LoRAs'
      })
    } else if (estimatedVRAM > 8000) { // 8GB
      warnings.push({
        type: 'vram',
        severity: 'medium',
        message: `High VRAM usage estimated: ${(estimatedVRAM / 1024).toFixed(1)}GB`,
        suggestion: 'Monitor GPU memory usage during generation'
      })
    }
  }

  /**
   * Check for parameter conflicts
   */
  private checkParameterConflicts(
    metadata: MetadataSchema,
    warnings: CompatibilityWarning[],
    issues: CompatibilityIssue[]
  ): void {
    const generation = metadata.generation
    const samplers = generation.samplerChain || []
    
    // Check for conflicting scheduler/sampler combinations
    for (const sampler of samplers) {
      const conflicts = this.getKnownConflicts(sampler.name, sampler.scheduler)
      for (const conflict of conflicts) {
        issues.push({
          type: 'conflict',
          component: 'Sampler/Scheduler',
          description: conflict.description,
          solution: conflict.solution,
          impact: 'functionality'
        })
      }
    }

    // Check CLIP skip conflicts
    const clipSkip = metadata.models.checkpoint.clipSkip
    if (clipSkip && clipSkip > 2 && metadata.workflow.architecture === 'SDXL') {
      warnings.push({
        type: 'clipskip',
        severity: 'medium',
        message: 'CLIP skip > 2 is not recommended for SDXL models',
        suggestion: 'Use CLIP skip 1 or 2 for SDXL'
      })
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    metadata: MetadataSchema,
    architecture: ModelArchitecture,
    recommendations: string[]
  ): void {
    const generation = metadata.generation
    
    // Resolution recommendations
    const currentRes = `${generation.image?.width || 512}x${generation.image?.height || 512}`
    const recommendedRes = architecture.recommendedResolutions[0]
    if (currentRes !== `${recommendedRes.width}x${recommendedRes.height}`) {
      recommendations.push(`Try ${recommendedRes.label} (${recommendedRes.width}x${recommendedRes.height}) for optimal quality`)
    }
    
    // Sampler recommendations
    const currentSampler = generation.samplerChain?.[0]?.name || 'Unknown'
    if (!architecture.supportedSamplers.includes(currentSampler)) {
      recommendations.push(`Use ${architecture.supportedSamplers[0]} sampler for better results`)
    }
    
    // Steps recommendations
    const steps = generation.totalSteps || 20
    if (steps < 15) {
      recommendations.push('Increase steps to 20-30 for better quality')
    } else if (steps > 50) {
      recommendations.push('Reduce steps to 20-30 to save time without quality loss')
    }
  }

  /**
   * Calculate overall compatibility score
   */
  private calculateCompatibilityScore(warnings: CompatibilityWarning[], issues: CompatibilityIssue[]): number {
    let score = 100
    
    // Deduct points for warnings
    for (const warning of warnings) {
      switch (warning.severity) {
        case 'critical': score -= 30; break
        case 'high': score -= 20; break
        case 'medium': score -= 10; break
        case 'low': score -= 5; break
      }
    }
    
    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.type) {
        case 'conflict': score -= 25; break
        case 'incompatible': score -= 20; break
        case 'suboptimal': score -= 10; break
        case 'deprecated': score -= 5; break
      }
    }
    
    return Math.max(0, Math.min(100, score))
  }

  /**
   * Determine overall compatibility rating
   */
  private determineOverallRating(
    score: number,
    warnings: CompatibilityWarning[],
    issues: CompatibilityIssue[]
  ): 'excellent' | 'good' | 'warning' | 'error' {
    const hasCritical = warnings.some(w => w.severity === 'critical') || 
                       issues.some(i => i.type === 'conflict' || i.type === 'incompatible')
    
    if (hasCritical || score < 50) return 'error'
    if (score < 70) return 'warning'
    if (score < 90) return 'good'
    return 'excellent'
  }

  // Helper methods for model analysis
  private parseModelName(fullName: string): { fullName: string; shortName: string } {
    const shortName = fullName.split(/[._-]/).slice(0, 2).join(' ')
    return { fullName, shortName }
  }

  private categorizeModel(modelName: string): 'realistic' | 'anime' | 'artistic' | 'photographic' | 'other' {
    const name = modelName.toLowerCase()
    if (name.includes('realistic') || name.includes('photo')) return 'realistic'
    if (name.includes('anime') || name.includes('manga')) return 'anime'
    if (name.includes('art') || name.includes('paint')) return 'artistic'
    if (name.includes('photo')) return 'photographic'
    return 'other'
  }

  private determineModelStyle(modelName: string): string {
    const name = modelName.toLowerCase()
    if (name.includes('realistic')) return 'Realistic'
    if (name.includes('anime')) return 'Anime'
    if (name.includes('cartoon')) return 'Cartoon'
    if (name.includes('art')) return 'Artistic'
    return 'General'
  }

  private extractBaseModelLineage(_modelName: string): string[] {
    // This would be populated from a model database
    return ['SD 1.5 Base']
  }

  private extractMergeDetails(_modelName: string): ModelMergeInfo | undefined {
    // This would be populated from model metadata
    return undefined
  }

  private verifyModel(modelName: string): ModelVerification {
    // Check against known model database
    const known = this.modelDatabase.get(modelName.toLowerCase())
    if (known) {
      return known
    }
    
    return {
      verified: false,
      source: 'unknown'
    }
  }

  private extractModelMetadata(_modelName: string): ModelMetadata {
    return {
      tags: [],
      examples: []
    }
  }

  private getVAECompatibility(_vaeName: string): string[] {
    return ['SD1.5', 'SDXL'] // Default compatibility
  }

  private getVAETechnicalSpecs(_vaeName: string): { encoderType: string; decoderType: string; latentChannels: number } {
    return {
      encoderType: 'Standard',
      decoderType: 'Standard',
      latentChannels: 4
    }
  }

  private categorizeLoRA(_loraName: string): string {
    const name = _loraName.toLowerCase()
    if (name.includes('character')) return 'Character'
    if (name.includes('style')) return 'Style'
    if (name.includes('concept')) return 'Concept'
    if (name.includes('clothing')) return 'Clothing'
    return 'General'
  }

  private determineLoRAStyle(_loraName: string): string {
    const name = _loraName.toLowerCase()
    if (name.includes('anime')) return 'Anime'
    if (name.includes('realistic')) return 'Realistic'
    return 'General'
  }

  private getLoRABaseModel(_loraName: string): string {
    const name = _loraName.toLowerCase()
    if (name.includes('xl') || name.includes('sdxl')) return 'SDXL'
    if (name.includes('sd3')) return 'SD3'
    if (name.includes('flux')) return 'Flux'
    return 'SD1.5'
  }

  private getLoRACompatibility(_loraName: string): string[] {
    const baseModel = this.getLoRABaseModel(_loraName)
    return [baseModel]
  }

  private getOptimalLoRASettings(_loraName: string): OptimalLoRASettings {
    return {
      modelStrength: { min: 0.1, max: 1.5, recommended: 0.8 },
      clipStrength: { min: 0.1, max: 1.5, recommended: 0.8 },
      recommendedTriggers: [],
      incompatibleWith: []
    }
  }

  private inferArchitectureFromName(modelName: string): 'SD1.5' | 'SDXL' | 'SD3' | 'Flux' | 'Unknown' {
    const name = modelName.toLowerCase()
    if (name.includes('xl') || name.includes('sdxl')) return 'SDXL'
    if (name.includes('sd3') || name.includes('sd 3')) return 'SD3'
    if (name.includes('flux')) return 'Flux'
    if (name.includes('sd') || name.includes('stable')) return 'SD1.5'
    return 'Unknown'
  }

  private getMaxResolution(archType: string): { width: number; height: number } {
    switch (archType) {
      case 'SD1.5': return { width: 768, height: 768 }
      case 'SDXL': return { width: 1536, height: 1536 }
      case 'SD3': return { width: 2048, height: 2048 }
      case 'Flux': return { width: 2048, height: 2048 }
      default: return { width: 512, height: 512 }
    }
  }

  private getRecommendedResolutions(archType: string): Array<{ width: number; height: number; label: string }> {
    switch (archType) {
      case 'SD1.5':
        return [
          { width: 512, height: 512, label: 'Square' },
          { width: 512, height: 768, label: 'Portrait' },
          { width: 768, height: 512, label: 'Landscape' }
        ]
      case 'SDXL':
        return [
          { width: 1024, height: 1024, label: 'Square' },
          { width: 896, height: 1152, label: 'Portrait' },
          { width: 1152, height: 896, label: 'Landscape' }
        ]
      default:
        return [{ width: 512, height: 512, label: 'Default' }]
    }
  }

  private getSupportedSamplers(archType: string): string[] {
    const common = ['euler', 'euler_a', 'dpmpp_2m', 'dpmpp_sde']
    switch (archType) {
      case 'SDXL': return [...common, 'dpmpp_2m_karras', 'dpmpp_3m_sde']
      case 'SD3': return ['euler', 'euler_cfg_pp']
      default: return common
    }
  }

  private getSupportedSchedulers(archType: string): string[] {
    const common = ['normal', 'karras', 'exponential']
    switch (archType) {
      case 'SDXL': return [...common, 'simple', 'ddim_uniform']
      default: return common
    }
  }

  private getVRAMRequirement(archType: string): number {
    switch (archType) {
      case 'SD1.5': return 4000 // 4GB
      case 'SDXL': return 8000 // 8GB
      case 'SD3': return 12000 // 12GB
      case 'Flux': return 16000 // 16GB
      default: return 4000
    }
  }

  private detectModelFeatures(metadata: MetadataSchema): ModelFeatures {
    return {
      supportsImg2Img: metadata.workflow.features.hasImg2Img,
      supportsInpainting: metadata.workflow.features.hasInpainting,
      supportsControlNet: metadata.workflow.features.hasControlNet,
      supportsLoRA: metadata.workflow.features.hasLora,
      supportsTextualInversion: metadata.workflow.features.hasEmbeddings,
      supportsRegionalPrompting: metadata.workflow.features.hasRegionalPrompting,
      supportsHighResolution: true,
      supportsFaceRestoration: metadata.workflow.features.hasFaceRestore
    }
  }

  private estimateVRAMUsage(
    architecture: ModelArchitecture,
    width: number,
    height: number,
    batchSize: number,
    loraCount: number
  ): number {
    let baseVRAM = architecture.vramRequirement
    
    // Add for resolution
    const pixelMultiplier = (width * height) / (512 * 512)
    baseVRAM *= Math.sqrt(pixelMultiplier)
    
    // Add for batch size
    baseVRAM *= batchSize
    
    // Add for LoRAs
    baseVRAM += loraCount * 200 // 200MB per LoRA
    
    return Math.round(baseVRAM)
  }

  private getKnownConflicts(_sampler: string, _scheduler: string): Array<{ description: string; solution: string }> {
    // Database of known conflicts
    return []
  }

  private initializeArchitectureDatabase(): void {
    // This would be populated from a comprehensive model database
    // For now, we'll add a few examples
    this.architectureDatabase.set('deliberate_v2', {
      name: 'Deliberate v2',
      type: 'SD1.5',
      baseModel: 'SD 1.5',
      version: '2.0',
      clipSkipSupport: true,
      maxResolution: { width: 768, height: 768 },
      recommendedResolutions: [
        { width: 512, height: 512, label: 'Square' },
        { width: 512, height: 768, label: 'Portrait' }
      ],
      supportedSamplers: ['euler', 'euler_a', 'dpmpp_2m'],
      supportedSchedulers: ['normal', 'karras'],
      vramRequirement: 4000,
      features: {
        supportsImg2Img: true,
        supportsInpainting: true,
        supportsControlNet: true,
        supportsLoRA: true,
        supportsTextualInversion: true,
        supportsRegionalPrompting: false,
        supportsHighResolution: true,
        supportsFaceRestoration: false
      }
    })
  }

  private initializeModelDatabase(): void {
    // This would be populated from model verification services
    // For now, we'll add a few examples
    this.modelDatabase.set('deliberate_v2', {
      hash: 'abc123def456',
      verified: true,
      source: 'civitai',
      modelPage: 'https://civitai.com/models/4823/deliberate',
      license: 'CreativeML OpenRAIL-M',
      nsfw: false
    })
  }

}


// Export singleton instance
export const modelInfoParser = new ModelInfoParser()

// Utility functions
export function parseModelInformation(metadata: MetadataSchema): EnhancedModelInfo {
  return modelInfoParser.parseModelInfo(metadata)
}

export function analyzeModelCompatibility(metadata: MetadataSchema): CompatibilityAnalysis {
  const modelInfo = modelInfoParser.parseModelInfo(metadata)
  return modelInfo.compatibility
}