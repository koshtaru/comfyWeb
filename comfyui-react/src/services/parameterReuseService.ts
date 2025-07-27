// ============================================================================
// ComfyUI React - Parameter Reuse Service
// ============================================================================

import type { StoredGeneration } from './historyManager'
import type { ExtractedParameters } from '@/utils/parameterExtractor'
import type { ComfyUIWorkflow } from '@/types'
import { getWorkflowNodes } from '@/types'

export interface ParameterReuseResult {
  success: boolean
  message: string
  parameters?: ExtractedParameters
  incompatibilities?: string[]
}

export interface CompatibilityCheck {
  isCompatible: boolean
  issues: string[]
  warnings: string[]
}

/**
 * Service for reusing parameters from history items in current workflows
 */
export class ParameterReuseService {
  /**
   * Convert StoredGeneration to ExtractedParameters format
   */
  convertHistoryToParameters(generation: StoredGeneration): ExtractedParameters {
    const metadata = generation.metadata

    return {
      generation: {
        steps: metadata.generation?.steps,
        cfg: metadata.generation?.cfg,
        seed: metadata.generation?.seed,
        scheduler: metadata.generation?.scheduler,
        sampler: metadata.generation?.sampler,
        denoise: 1.0, // Default denoise value
        nodeId: undefined // Will be determined when applying to workflow
      },
      model: {
        checkpoint: metadata.model?.name,
        vae: undefined, // Not stored in history metadata
        loras: [], // Not stored in history metadata
        controlnets: [], // Not stored in history metadata
        architecture: metadata.model?.architecture as any,
        nodeId: undefined
      },
      image: {
        width: metadata.image?.width,
        height: metadata.image?.height,
        batchSize: 1, // Default batch size
        nodeId: undefined
      },
      prompts: {
        positive: metadata.prompts?.positive,
        negative: metadata.prompts?.negative,
        positiveNodeId: undefined,
        negativeNodeId: undefined
      },
      advanced: {
        clipSkip: undefined,
        freeMemory: undefined,
        tileSize: undefined,
        customNodes: []
      },
      metadata: {
        totalNodes: 0,
        nodeTypes: [],
        hasImg2Img: false,
        hasInpainting: false,
        hasControlNet: false,
        hasLora: false,
        hasUpscaling: false,
        architecture: metadata.model?.architecture as any || 'Unknown',
        complexity: 'Simple'
      }
    }
  }

  /**
   * Check compatibility between history parameters and current workflow
   */
  checkCompatibility(
    historyParams: ExtractedParameters,
    currentWorkflow: ComfyUIWorkflow | null
  ): CompatibilityCheck {
    const issues: string[] = []
    const warnings: string[] = []

    // If no workflow is loaded, we'll load from history - always compatible
    if (!currentWorkflow) {
      warnings.push('No current workflow - will load workflow from history')
      return { isCompatible: true, issues, warnings }
    }

    const workflowNodes = getWorkflowNodes(currentWorkflow)
    const nodeTypes = Object.values(workflowNodes).map(node => node.class_type)

    // Check for basic required nodes
    const hasKSampler = nodeTypes.some(type => 
      type === 'KSampler' || type === 'KSamplerAdvanced'
    )
    if (!hasKSampler) {
      issues.push('Workflow missing sampling node (KSampler)')
    }

    const hasTextEncode = nodeTypes.some(type => type === 'CLIPTextEncode')
    if (!hasTextEncode) {
      warnings.push('Workflow missing text encoding nodes - prompts may not apply')
    }

    const hasLatentImage = nodeTypes.some(type => 
      type === 'EmptyLatentImage' || type === 'LatentUpscale'
    )
    if (!hasLatentImage) {
      warnings.push('Workflow missing latent image nodes - dimensions may not apply')
    }

    // Check model architecture compatibility
    const currentModelNodes = Object.values(workflowNodes).filter(node => 
      node.class_type === 'CheckpointLoaderSimple' || 
      node.class_type === 'NunchakuFluxDiTLoader'
    )

    if (currentModelNodes.length === 0) {
      warnings.push('No model loader found in current workflow')
    } else if (historyParams.model.architecture && historyParams.model.architecture !== 'Unknown') {
      // We can't easily detect the current workflow's architecture without loading the model
      // So we'll just add a warning for now
      warnings.push(`History uses ${historyParams.model.architecture} architecture - ensure compatibility`)
    }

    // Check if dimensions are reasonable
    if (historyParams.image.width && historyParams.image.height) {
      const totalPixels = historyParams.image.width * historyParams.image.height
      if (totalPixels > 2048 * 2048) {
        warnings.push('High resolution from history may require significant VRAM')
      }
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      warnings
    }
  }

  /**
   * Apply parameters to current workflow by finding appropriate nodes
   */
  applyParametersToWorkflow(
    parameters: ExtractedParameters,
    currentWorkflow: ComfyUIWorkflow
  ): { updatedParameters: ExtractedParameters; nodeMapping: Record<string, string> } {
    const workflowNodes = getWorkflowNodes(currentWorkflow)
    const nodeMapping: Record<string, string> = {}
    const updatedParameters = { ...parameters }

    // Find and map sampler node
    const samplerNode = Object.entries(workflowNodes).find(([, node]) =>
      node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced'
    )
    if (samplerNode) {
      const [nodeId] = samplerNode
      updatedParameters.generation.nodeId = nodeId
      nodeMapping.sampler = nodeId
    }

    // Find and map text encoding nodes
    const textEncodeNodes = Object.entries(workflowNodes).filter(([, node]) =>
      node.class_type === 'CLIPTextEncode'
    )
    if (textEncodeNodes.length >= 1) {
      updatedParameters.prompts.positiveNodeId = textEncodeNodes[0][0]
      nodeMapping.positivePrompt = textEncodeNodes[0][0]
    }
    if (textEncodeNodes.length >= 2) {
      updatedParameters.prompts.negativeNodeId = textEncodeNodes[1][0]
      nodeMapping.negativePrompt = textEncodeNodes[1][0]
    }

    // Find and map image dimension nodes
    const latentImageNode = Object.entries(workflowNodes).find(([, node]) =>
      node.class_type === 'EmptyLatentImage'
    )
    if (latentImageNode) {
      const [nodeId] = latentImageNode
      updatedParameters.image.nodeId = nodeId
      nodeMapping.dimensions = nodeId
    }

    // Find and map model loader node
    const modelNode = Object.entries(workflowNodes).find(([, node]) =>
      node.class_type === 'CheckpointLoaderSimple' || 
      node.class_type === 'NunchakuFluxDiTLoader'
    )
    if (modelNode) {
      const [nodeId] = modelNode
      updatedParameters.model.nodeId = nodeId
      nodeMapping.model = nodeId
    }

    return { updatedParameters, nodeMapping }
  }

  /**
   * Main method to reuse parameters from history
   */
  reuseParameters(
    generation: StoredGeneration,
    currentWorkflow: ComfyUIWorkflow | null
  ): ParameterReuseResult & { workflowToLoad?: ComfyUIWorkflow } {
    try {
      // Convert history to parameters
      const historyParams = this.convertHistoryToParameters(generation)

      // Check compatibility
      const compatibility = this.checkCompatibility(historyParams, currentWorkflow)
      
      if (!compatibility.isCompatible) {
        return {
          success: false,
          message: `Cannot reuse parameters: ${compatibility.issues.join(', ')}`,
          incompatibilities: compatibility.issues
        }
      }

      // If no current workflow, use the workflow from history
      if (!currentWorkflow) {
        if (!generation.workflow) {
          return {
            success: false,
            message: 'No workflow available in history item',
            incompatibilities: ['History item missing workflow data']
          }
        }

        return {
          success: true,
          message: 'Workflow and parameters loaded from history',
          parameters: historyParams,
          workflowToLoad: generation.workflow,
          incompatibilities: compatibility.warnings
        }
      }

      // Apply parameters to existing workflow
      const { updatedParameters } = this.applyParametersToWorkflow(historyParams, currentWorkflow)

      let message = 'Parameters copied successfully'
      if (compatibility.warnings.length > 0) {
        message += ` (${compatibility.warnings.length} warning${compatibility.warnings.length > 1 ? 's' : ''})`
      }

      return {
        success: true,
        message,
        parameters: updatedParameters,
        incompatibilities: compatibility.warnings
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to reuse parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        incompatibilities: ['Internal error occurred']
      }
    }
  }

  /**
   * Get a summary of what parameters will be applied
   */
  getParameterSummary(generation: StoredGeneration): string[] {
    const summary: string[] = []
    const metadata = generation.metadata

    if (metadata.prompts?.positive) {
      summary.push(`Positive prompt: "${metadata.prompts.positive.substring(0, 50)}..."`)
    }
    if (metadata.prompts?.negative) {
      summary.push(`Negative prompt: "${metadata.prompts.negative.substring(0, 50)}..."`)
    }
    if (metadata.generation?.steps) {
      summary.push(`Steps: ${metadata.generation.steps}`)
    }
    if (metadata.generation?.cfg) {
      summary.push(`CFG: ${metadata.generation.cfg}`)
    }
    if (metadata.generation?.sampler) {
      summary.push(`Sampler: ${metadata.generation.sampler}`)
    }
    if (metadata.generation?.scheduler) {
      summary.push(`Scheduler: ${metadata.generation.scheduler}`)
    }
    if (metadata.generation?.seed) {
      summary.push(`Seed: ${metadata.generation.seed}`)
    }
    if (metadata.image?.width && metadata.image?.height) {
      summary.push(`Dimensions: ${metadata.image.width}×${metadata.image.height}`)
    }
    if (metadata.model?.name) {
      summary.push(`Model: ${metadata.model.name}`)
    }

    return summary
  }
}

// Export singleton instance
export const parameterReuseService = new ParameterReuseService()