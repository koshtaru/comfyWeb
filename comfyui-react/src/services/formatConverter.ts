// ============================================================================
// ComfyUI React - Format Converter Service
// ============================================================================

import type { ComfyUIWorkflow, ComfyUINode } from '@/types'
import type { IPreset, IPresetMetadata } from '@/types/preset'
import { getWorkflowNodes } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// Type definitions for external formats
export interface IA1111Preset {
  name: string
  prompt: string
  negative_prompt: string
  steps: number
  cfg_scale: number
  sampler_name: string
  scheduler?: string
  seed: number
  width: number
  height: number
  batch_size: number
  model?: string
  vae?: string
  clip_skip?: number
  denoising_strength?: number
  enable_hr?: boolean
  hr_scale?: number
  hr_upscaler?: string
  hr_second_pass_steps?: number
  hr_resize_x?: number
  hr_resize_y?: number
}

export interface IInvokeAIPreset {
  name: string
  description?: string
  positive_prompt: string
  negative_prompt: string
  width: number
  height: number
  cfg_scale: number
  steps: number
  sampler: string
  model: string
  seed: number
  seamless?: boolean
  hires_fix?: boolean
  variation_amount?: number
  threshold?: number
  perlin?: number
}

export interface IConversionResult {
  success: boolean
  preset?: IPreset
  workflow?: ComfyUIWorkflow
  errors: string[]
  warnings: string[]
}

export class FormatConverterService {
  // Sampler mapping tables
  private readonly SAMPLER_MAP = {
    a1111ToComfyUI: {
      'Euler': 'euler',
      'Euler a': 'euler_ancestral',
      'Heun': 'heun',
      'DPM2': 'dpm_2',
      'DPM2 a': 'dpm_2_ancestral',
      'DPM++ 2S a': 'dpmpp_2s_ancestral',
      'DPM++ 2M': 'dpmpp_2m',
      'DPM++ SDE': 'dpmpp_sde',
      'DPM++ 2M SDE': 'dpmpp_2m_sde',
      'DPM++ 3M SDE': 'dpmpp_3m_sde',
      'DPM fast': 'dpm_fast',
      'DPM adaptive': 'dpm_adaptive',
      'LMS': 'lms',
      'LMS Karras': 'lms',
      'DDIM': 'ddim',
      'PLMS': 'plms',
      'UniPC': 'uni_pc'
    } as Record<string, string>,
    comfyUIToA1111: {} as Record<string, string> // Will be inverted from above
  }

  // Scheduler mapping
  private readonly SCHEDULER_MAP = {
    a1111ToComfyUI: {
      'default': 'normal',
      'karras': 'karras',
      'exponential': 'exponential',
      'sgm_uniform': 'sgm_uniform',
      'simple': 'simple',
      'ddim_uniform': 'ddim_uniform'
    } as Record<string, string>
  }

  constructor() {
    // Create reverse mapping for ComfyUI to A1111
    this.SAMPLER_MAP.comfyUIToA1111 = Object.entries(this.SAMPLER_MAP.a1111ToComfyUI)
      .reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {})
  }

  /**
   * Convert Automatic1111 preset to ComfyUI format
   */
  async convertFromA1111(a1111Preset: IA1111Preset): Promise<IConversionResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Create workflow
      const workflow = this.createComfyUIWorkflowFromA1111(a1111Preset)
      
      // Extract metadata
      const metadata = this.extractMetadataFromA1111(a1111Preset)

      // Create preset
      const preset: IPreset = {
        id: uuidv4(),
        name: a1111Preset.name || 'Imported A1111 Preset',
        createdAt: new Date(),
        lastModified: new Date(),
        workflowData: workflow,
        metadata,
        compressed: false,
        size: 0,
        tags: ['imported', 'automatic1111'],
        category: 'imported',
        version: '2.0.0'
      }

      // Calculate size
      preset.size = new Blob([JSON.stringify(preset.workflowData)]).size

      // Add warnings for unsupported features
      if (a1111Preset.enable_hr) {
        warnings.push('Hires fix converted to ComfyUI upscaling nodes')
      }
      
      if (a1111Preset.clip_skip && a1111Preset.clip_skip > 1) {
        warnings.push(`CLIP skip ${a1111Preset.clip_skip} applied`)
      }

      return {
        success: true,
        preset,
        workflow,
        errors,
        warnings
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Conversion failed')
      return {
        success: false,
        errors,
        warnings
      }
    }
  }

  /**
   * Create ComfyUI workflow from A1111 preset
   */
  private createComfyUIWorkflowFromA1111(preset: IA1111Preset): ComfyUIWorkflow {
    const nodes: Record<string, ComfyUINode> = {}
    let nodeId = 1

    // Checkpoint Loader
    nodes[nodeId.toString()] = {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: preset.model || 'model.safetensors'
      }
    }
    const checkpointNode = nodeId++

    // VAE Loader (if specified)
    let vaeNode: number | null = null
    if (preset.vae && preset.vae !== 'Automatic') {
      nodes[nodeId.toString()] = {
        class_type: 'VAELoader',
        inputs: {
          vae_name: preset.vae
        }
      }
      vaeNode = nodeId++
    }

    // CLIP Text Encode (Positive)
    nodes[nodeId.toString()] = {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: preset.prompt,
        clip: [checkpointNode.toString(), 1]
      }
    }
    const positiveNode = nodeId++

    // CLIP Text Encode (Negative)
    nodes[nodeId.toString()] = {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: preset.negative_prompt,
        clip: [checkpointNode.toString(), 1]
      }
    }
    const negativeNode = nodeId++

    // CLIP Skip (if needed)
    let clipPositiveNode = positiveNode
    let clipNegativeNode = negativeNode
    
    if (preset.clip_skip && preset.clip_skip > 1) {
      // Add CLIPSetLastLayer nodes
      nodes[nodeId.toString()] = {
        class_type: 'CLIPSetLastLayer',
        inputs: {
          clip: [checkpointNode.toString(), 1],
          stop_at_clip_layer: -preset.clip_skip
        }
      }
      const clipSkipNode = nodeId++

      // Update positive prompt to use skipped CLIP
      nodes[positiveNode.toString()].inputs.clip = [clipSkipNode.toString(), 0]
      nodes[negativeNode.toString()].inputs.clip = [clipSkipNode.toString(), 0]
    }

    // Empty Latent Image
    nodes[nodeId.toString()] = {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: preset.width,
        height: preset.height,
        batch_size: preset.batch_size
      }
    }
    const latentNode = nodeId++

    // KSampler
    nodes[nodeId.toString()] = {
      class_type: 'KSampler',
      inputs: {
        seed: preset.seed,
        steps: preset.steps,
        cfg: preset.cfg_scale,
        sampler_name: this.mapSampler(preset.sampler_name, 'a1111'),
        scheduler: this.mapScheduler(preset.scheduler || 'default'),
        denoise: preset.denoising_strength || 1.0,
        model: [checkpointNode.toString(), 0],
        positive: [clipPositiveNode.toString(), 0],
        negative: [clipNegativeNode.toString(), 0],
        latent_image: [latentNode.toString(), 0]
      }
    }
    const samplerNode = nodeId++

    // VAE Decode
    nodes[nodeId.toString()] = {
      class_type: 'VAEDecode',
      inputs: {
        samples: [samplerNode.toString(), 0],
        vae: vaeNode ? [vaeNode.toString(), 0] : [checkpointNode.toString(), 2]
      }
    }
    const vaeDecodeNode = nodeId++

    // Handle Hires Fix
    if (preset.enable_hr) {
      // Upscale Image
      nodes[nodeId.toString()] = {
        class_type: 'ImageUpscaleWithModel',
        inputs: {
          upscale_model: preset.hr_upscaler || 'ESRGAN_4x',
          image: [vaeDecodeNode.toString(), 0]
        }
      }
      const upscaleNode = nodeId++

      // Image Scale
      nodes[nodeId.toString()] = {
        class_type: 'ImageScale',
        inputs: {
          width: preset.hr_resize_x || preset.width * (preset.hr_scale || 2),
          height: preset.hr_resize_y || preset.height * (preset.hr_scale || 2),
          upscale_method: 'bicubic',
          crop: 'disabled',
          image: [upscaleNode.toString(), 0]
        }
      }
      const scaleNode = nodeId++

      // VAE Encode for second pass
      nodes[nodeId.toString()] = {
        class_type: 'VAEEncode',
        inputs: {
          pixels: [scaleNode.toString(), 0],
          vae: vaeNode ? [vaeNode.toString(), 0] : [checkpointNode.toString(), 2]
        }
      }
      const encodeNode = nodeId++

      // Second KSampler pass
      nodes[nodeId.toString()] = {
        class_type: 'KSampler',
        inputs: {
          seed: preset.seed,
          steps: preset.hr_second_pass_steps || preset.steps,
          cfg: preset.cfg_scale,
          sampler_name: this.mapSampler(preset.sampler_name, 'a1111'),
          scheduler: this.mapScheduler(preset.scheduler || 'default'),
          denoise: 0.5, // Lower denoise for hires fix
          model: [checkpointNode.toString(), 0],
          positive: [clipPositiveNode.toString(), 0],
          negative: [clipNegativeNode.toString(), 0],
          latent_image: [encodeNode.toString(), 0]
        }
      }
      const hiresKSamplerNode = nodeId++

      // Final VAE Decode
      nodes[nodeId.toString()] = {
        class_type: 'VAEDecode',
        inputs: {
          samples: [hiresKSamplerNode.toString(), 0],
          vae: vaeNode ? [vaeNode.toString(), 0] : [checkpointNode.toString(), 2]
        }
      }
      const finalDecodeNode = nodeId++

      // Save Image
      nodes[nodeId.toString()] = {
        class_type: 'SaveImage',
        inputs: {
          filename_prefix: 'ComfyUI',
          images: [finalDecodeNode.toString(), 0]
        }
      }
    } else {
      // Save Image (no hires fix)
      nodes[nodeId.toString()] = {
        class_type: 'SaveImage',
        inputs: {
          filename_prefix: 'ComfyUI',
          images: [vaeDecodeNode.toString(), 0]
        }
      }
    }

    return {
      nodes,
      links: [], // Links are implicit in ComfyUI through node connections
      groups: [],
      config: {},
      extra: {
        ds: {
          scale: 1,
          offset: { 0: 0, 1: 0 }
        }
      },
      version: 0.4
    }
  }

  /**
   * Extract metadata from A1111 preset
   */
  private extractMetadataFromA1111(preset: IA1111Preset): IPresetMetadata {
    return {
      model: {
        name: preset.model || 'Unknown',
        architecture: this.detectArchitecture(preset.width, preset.height),
        hash: undefined
      },
      generation: {
        steps: preset.steps,
        cfg: preset.cfg_scale,
        sampler: this.mapSampler(preset.sampler_name, 'a1111'),
        scheduler: this.mapScheduler(preset.scheduler || 'default'),
        seed: preset.seed,
        denoise: preset.denoising_strength
      },
      dimensions: {
        width: preset.width,
        height: preset.height,
        batchSize: preset.batch_size
      },
      prompts: {
        positive: preset.prompt,
        negative: preset.negative_prompt
      },
      compatibility: {
        requiredNodes: ['CheckpointLoaderSimple', 'CLIPTextEncode', 'KSampler', 'VAEDecode', 'SaveImage'],
        customNodes: preset.enable_hr ? ['ImageUpscaleWithModel', 'ImageScale'] : []
      }
    }
  }

  /**
   * Convert InvokeAI preset to ComfyUI format
   */
  async convertFromInvokeAI(invokePreset: IInvokeAIPreset): Promise<IConversionResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // InvokeAI uses similar structure to A1111
      const a1111Equivalent: IA1111Preset = {
        name: invokePreset.name,
        prompt: invokePreset.positive_prompt,
        negative_prompt: invokePreset.negative_prompt,
        steps: invokePreset.steps,
        cfg_scale: invokePreset.cfg_scale,
        sampler_name: invokePreset.sampler,
        seed: invokePreset.seed,
        width: invokePreset.width,
        height: invokePreset.height,
        batch_size: 1,
        model: invokePreset.model,
        enable_hr: invokePreset.hires_fix
      }

      // Use A1111 converter
      const result = await this.convertFromA1111(a1111Equivalent)
      
      if (result.preset) {
        result.preset.description = invokePreset.description
        result.preset.tags = ['imported', 'invokeai']
        
        // Add InvokeAI-specific warnings
        if (invokePreset.seamless) {
          warnings.push('Seamless mode not directly supported - use tiling nodes')
        }
        
        if (invokePreset.variation_amount) {
          warnings.push('Variation amount not directly supported')
        }
      }

      return {
        ...result,
        warnings: [...result.warnings, ...warnings]
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Conversion failed')
      return {
        success: false,
        errors,
        warnings
      }
    }
  }

  /**
   * Convert ComfyUI preset to Automatic1111 format
   */
  async convertToA1111(preset: IPreset): Promise<IA1111Preset | null> {
    try {
      const metadata = preset.metadata
      
      return {
        name: preset.name,
        prompt: metadata.prompts.positive,
        negative_prompt: metadata.prompts.negative,
        steps: metadata.generation.steps,
        cfg_scale: metadata.generation.cfg,
        sampler_name: this.mapSampler(metadata.generation.sampler, 'comfyui'),
        scheduler: this.reverseMapScheduler(metadata.generation.scheduler),
        seed: metadata.generation.seed,
        width: metadata.dimensions.width,
        height: metadata.dimensions.height,
        batch_size: metadata.dimensions.batchSize,
        model: metadata.model.name,
        denoising_strength: metadata.generation.denoise
      }
    } catch (error) {
      console.error('Failed to convert to A1111 format:', error)
      return null
    }
  }

  /**
   * Map sampler names between formats
   */
  private mapSampler(sampler: string, fromFormat: 'a1111' | 'comfyui'): string {
    if (fromFormat === 'a1111') {
      return this.SAMPLER_MAP.a1111ToComfyUI[sampler] || sampler.toLowerCase()
    } else {
      return this.SAMPLER_MAP.comfyUIToA1111[sampler] || sampler
    }
  }

  /**
   * Map scheduler names
   */
  private mapScheduler(scheduler: string): string {
    return this.SCHEDULER_MAP.a1111ToComfyUI[scheduler] || 'normal'
  }

  /**
   * Reverse map scheduler names
   */
  private reverseMapScheduler(scheduler: string): string {
    const reverseMap = Object.entries(this.SCHEDULER_MAP.a1111ToComfyUI)
      .find(([_, v]) => v === scheduler)
    return reverseMap ? reverseMap[0] : 'default'
  }

  /**
   * Detect model architecture based on dimensions
   */
  private detectArchitecture(width: number, height: number): string {
    const resolution = width * height
    
    if (resolution <= 512 * 768) {
      return 'SD1.5'
    } else if (resolution <= 1024 * 1024) {
      return 'SDXL'
    } else {
      return 'SD3' // Assume newer models for higher resolutions
    }
  }

  /**
   * Validate converted workflow
   */
  async validateConvertedWorkflow(workflow: ComfyUIWorkflow): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Extract nodes using type-safe helper
    const workflowNodes = getWorkflowNodes(workflow)

    // Check for required nodes
    const nodeTypes = Object.values(workflowNodes).map(node => node.class_type)
    
    if (!nodeTypes.includes('CheckpointLoaderSimple')) {
      errors.push('Missing checkpoint loader')
    }
    
    if (!nodeTypes.includes('KSampler')) {
      errors.push('Missing sampler node')
    }
    
    if (!nodeTypes.includes('SaveImage') && !nodeTypes.includes('PreviewImage')) {
      warnings.push('No output node found')
    }

    // Validate connections
    for (const [nodeId, node] of Object.entries(workflowNodes)) {
      if (node.inputs) {
        for (const [_inputName, inputValue] of Object.entries(node.inputs)) {
          if (Array.isArray(inputValue) && inputValue.length === 2) {
            const [sourceNodeId] = inputValue
            if (!workflowNodes[sourceNodeId]) {
              errors.push(`Node ${nodeId} references non-existent node ${sourceNodeId}`)
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// Export singleton instance
export const formatConverterService = new FormatConverterService()