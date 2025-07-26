// ComfyUI Workflow Parameter Extraction System
// Extracts and catalogs parameters from workflow JSON for UI manipulation

import type { WorkflowData } from './workflowValidator'
import type { ComfyUIWorkflow } from '@/types'
import { getWorkflowNodes } from '@/types'

export interface ExtractedParameters {
  generation: GenerationParameters
  model: ModelParameters
  image: ImageParameters
  prompts: PromptParameters
  advanced: AdvancedParameters
  metadata: WorkflowMetadata
}

export interface GenerationParameters {
  steps?: number
  cfg?: number
  seed?: number
  scheduler?: string
  sampler?: string
  denoise?: number
  nodeId?: string // Source node ID for updates
}

export interface ModelParameters {
  checkpoint?: string
  vae?: string
  loras: LoraParameter[]
  controlnets: ControlNetParameter[]
  architecture?: 'SD1.5' | 'SDXL' | 'SD3' | 'Flux' | 'Unknown'
  nodeId?: string
}

export interface LoraParameter {
  name: string
  modelStrength: number
  clipStrength: number
  nodeId: string
}

export interface ControlNetParameter {
  name: string
  strength: number
  startPercent?: number
  endPercent?: number
  nodeId: string
}

export interface ImageParameters {
  width?: number
  height?: number
  batchSize?: number
  nodeId?: string
}

export interface PromptParameters {
  positive?: string
  negative?: string
  positiveNodeId?: string
  negativeNodeId?: string
}

export interface AdvancedParameters {
  clipSkip?: number
  freeMemory?: boolean
  tileSize?: number
  customNodes: CustomNodeParameter[]
}

export interface CustomNodeParameter {
  nodeId: string
  nodeType: string
  title?: string
  parameters: Record<string, any>
}

export interface WorkflowMetadata {
  totalNodes: number
  nodeTypes: string[]
  hasImg2Img: boolean
  hasInpainting: boolean
  hasControlNet: boolean
  hasLora: boolean
  hasUpscaling: boolean
  architecture: ModelParameters['architecture']
  estimatedVRAM?: string
  complexity: 'Simple' | 'Moderate' | 'Complex' | 'Expert'
}

export class ParameterExtractor {
  protected workflow: WorkflowData
  protected nodeConnections: Map<string, Array<{ nodeId: string, outputIndex: number }>>

  constructor(workflow: ComfyUIWorkflow | WorkflowData) {
    // Extract nodes using the unified type helper
    this.workflow = this.extractWorkflowNodes(workflow)
    this.nodeConnections = new Map()
    this.buildConnectionMap()
  }

  /**
   * Extract workflow nodes from ComfyUI UI format using type-safe helper
   */
  private extractWorkflowNodes(workflow: ComfyUIWorkflow | WorkflowData): WorkflowData {
    // Use the type-safe helper to extract nodes
    const nodes = getWorkflowNodes(workflow as ComfyUIWorkflow)
    return nodes as WorkflowData
  }

  extract(): ExtractedParameters {
    return {
      generation: this.extractGenerationParameters(),
      model: this.extractModelParameters(),
      image: this.extractImageParameters(),
      prompts: this.extractPromptParameters(),
      advanced: this.extractAdvancedParameters(),
      metadata: this.extractWorkflowMetadata()
    }
  }

  private buildConnectionMap(): void {
    // Safety check for workflow structure
    if (!this.workflow || typeof this.workflow !== 'object') {
      console.error('[ParameterExtractor] Invalid workflow structure:', this.workflow)
      return
    }

    for (const [nodeId, node] of Object.entries(this.workflow)) {
      // Safety check for node structure - only warn if truly invalid
      if (!node || typeof node !== 'object') {
        console.warn(`[ParameterExtractor] Invalid node structure for node ${nodeId}: not an object`)
        continue
      }
      
      // Skip nodes without inputs (metadata nodes, etc.)
      if (!node.inputs) {
        continue
      }

      for (const [, inputValue] of Object.entries(node.inputs)) {
        if (Array.isArray(inputValue) && inputValue.length === 2) {
          const [sourceNodeId, outputIndex] = inputValue
          if (!this.nodeConnections.has(String(sourceNodeId))) {
            this.nodeConnections.set(String(sourceNodeId), [])
          }
          this.nodeConnections.get(String(sourceNodeId))!.push({
            nodeId,
            outputIndex: outputIndex as number
          })
        }
      }
    }
  }

  protected extractGenerationParameters(): GenerationParameters {
    const params: GenerationParameters = {}

    // Find KSampler nodes
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced') {
        params.steps = this.getNumericValue(node.inputs.steps)
        params.cfg = this.getNumericValue(node.inputs.cfg)
        params.seed = this.getNumericValue(node.inputs.seed)
        params.scheduler = this.getStringValue(node.inputs.scheduler)
        params.sampler = this.getStringValue(node.inputs.sampler_name)
        params.denoise = this.getNumericValue(node.inputs.denoise) || 1.0
        params.nodeId = nodeId
        break // Use first sampler found
      }
    }

    return params
  }

  protected extractModelParameters(): ModelParameters {
    const params: ModelParameters = {
      loras: [],
      controlnets: []
    }

    // Find checkpoint loader
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'CheckpointLoaderSimple') {
        params.checkpoint = this.getStringValue(node.inputs.ckpt_name)
        params.nodeId = nodeId
        params.architecture = this.detectArchitecture(params.checkpoint)
        break
      }
    }

    // Find VAE loader
    for (const [, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'VAELoader') {
        params.vae = this.getStringValue(node.inputs.vae_name)
        break
      }
    }

    // Find LoRA loaders
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'LoraLoader') {
        const lora: LoraParameter = {
          name: this.getStringValue(node.inputs.lora_name) || 'Unknown',
          modelStrength: this.getNumericValue(node.inputs.strength_model) || 1.0,
          clipStrength: this.getNumericValue(node.inputs.strength_clip) || 1.0,
          nodeId
        }
        params.loras.push(lora)
      }
    }

    // Find ControlNet nodes
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'ControlNetApply' || node.class_type === 'ControlNetApplyAdvanced') {
        const controlnet: ControlNetParameter = {
          name: 'ControlNet', // Will be updated from loader if found
          strength: this.getNumericValue(node.inputs.strength) || 1.0,
          startPercent: this.getNumericValue(node.inputs.start_percent),
          endPercent: this.getNumericValue(node.inputs.end_percent),
          nodeId
        }
        params.controlnets.push(controlnet)
      }
    }

    return params
  }

  private extractImageParameters(): ImageParameters {
    const params: ImageParameters = {}

    // Find EmptyLatentImage for generation settings
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'EmptyLatentImage') {
        params.width = this.getNumericValue(node.inputs.width)
        params.height = this.getNumericValue(node.inputs.height)
        params.batchSize = this.getNumericValue(node.inputs.batch_size) || 1
        params.nodeId = nodeId
        break
      }
    }

    // Check for image input nodes (img2img)
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'LoadImage') {
        // If we find a LoadImage node, this might be img2img
        // Try to extract dimensions from connected VAEEncode
        const connections = this.nodeConnections.get(nodeId)
        if (connections) {
          for (const conn of connections) {
            const connectedNode = this.workflow[conn.nodeId]
            if (connectedNode?.class_type === 'VAEEncode') {
              // This suggests img2img workflow
              break
            }
          }
        }
      }
    }

    return params
  }

  private extractPromptParameters(): PromptParameters {
    const params: PromptParameters = {}

    // Debug: Log all node types found in workflow
    const nodeTypes = Object.values(this.workflow).map(node => node.class_type)
    const uniqueNodeTypes = [...new Set(nodeTypes)]
    console.log(`[ParameterExtractor] Workflow contains node types:`, uniqueNodeTypes)
    
    // Find CLIPTextEncode nodes
    const clipNodes = Object.entries(this.workflow).filter(([, node]) => node.class_type === 'CLIPTextEncode')
    console.log(`[ParameterExtractor] Found ${clipNodes.length} CLIPTextEncode nodes`)
    
    for (const [nodeId, node] of clipNodes) {
      const text = this.getStringValue(node.inputs.text)
      
      // Determine if this is positive or negative based on connections
      const connections = this.nodeConnections.get(nodeId)
      let promptType: 'positive' | 'negative' | 'unknown' = 'unknown'
      
      if (connections && connections.length > 0) {
        // Extended list of sampler types to support modern workflows
        const samplerTypes = [
          'KSampler', 'KSamplerAdvanced', 
          'SamplerCustom', 'SamplerCustomAdvanced',
          'SamplerDPMPP_2M', 'SamplerDPMPP_SDE',  
          'SamplerEuler', 'SamplerEulerAncestral',
          'SamplerDDIM', 'SamplerLMS',
          'SamplerDPM2', 'SamplerDPM2Ancestral'
        ]
        
        const samplerConnection = connections.find(conn => {
          const connNode = this.workflow[conn.nodeId]
          return samplerTypes.includes(connNode?.class_type || '')
        })
        
        if (samplerConnection) {
          const samplerNode = this.workflow[samplerConnection.nodeId]
          // Check if this node connects to positive or negative input
          for (const [inputName, inputValue] of Object.entries(samplerNode.inputs)) {
            if (Array.isArray(inputValue) && String(inputValue[0]) === String(nodeId)) {
              if (inputName === 'positive') {
                promptType = 'positive'
              } else if (inputName === 'negative') {
                promptType = 'negative'
              }
              break
            }
          }
        }
      }
      
      // If we found a connection, use it
      if (promptType === 'positive') {
        params.positive = text
        params.positiveNodeId = nodeId
        console.log(`[ParameterExtractor] Found positive prompt: "${text}" in node ${nodeId}`)
      } else if (promptType === 'negative') {
        params.negative = text
        params.negativeNodeId = nodeId
        console.log(`[ParameterExtractor] Found negative prompt: "${text}" in node ${nodeId}`)
      } else {
        // Fallback: If we can't determine connection, assume first CLIPTextEncode is positive
        // This helps with complex workflows where connections aren't easily traced
        if (!params.positiveNodeId) {
          params.positive = text
          params.positiveNodeId = nodeId
          console.log(`[ParameterExtractor] Fallback: Assuming first CLIPTextEncode is positive: "${text}" in node ${nodeId}`)
          console.log(`[ParameterExtractor] Set positiveNodeId to:`, params.positiveNodeId)
        } else if (!params.negativeNodeId && text !== params.positive) {
          params.negative = text  
          params.negativeNodeId = nodeId
          console.log(`[ParameterExtractor] Fallback: Assuming second CLIPTextEncode is negative: "${text}" in node ${nodeId}`)
        }
      }
    }

    console.log(`[ParameterExtractor] Final prompt parameters:`, params)
    return params
  }

  private extractAdvancedParameters(): AdvancedParameters {
    const params: AdvancedParameters = {
      customNodes: []
    }

    // Find custom/advanced nodes
    const standardNodes = new Set([
      'CheckpointLoaderSimple', 'CLIPTextEncode', 'KSampler', 'VAEDecode', 
      'EmptyLatentImage', 'SaveImage', 'LoadImage', 'LoraLoader', 
      'ControlNetLoader', 'ControlNetApply', 'VAELoader'
    ])

    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (!standardNodes.has(node.class_type)) {
        const customNode: CustomNodeParameter = {
          nodeId,
          nodeType: node.class_type,
          title: node._meta?.title,
          parameters: { ...node.inputs }
        }
        params.customNodes.push(customNode)
      }
    }

    return params
  }

  protected extractWorkflowMetadata(): WorkflowMetadata {
    const nodeTypes = [...new Set(Object.values(this.workflow)
      .filter(n => n && n.class_type)
      .map(n => n.class_type))]
    const totalNodes = Object.keys(this.workflow).length
    
    // Detect workflow characteristics
    const hasImg2Img = nodeTypes.includes('LoadImage') && nodeTypes.includes('VAEEncode')
    const hasInpainting = nodeTypes.some(type => type && type.toLowerCase().includes('inpaint'))
    const hasControlNet = nodeTypes.some(type => type && type.includes('ControlNet'))
    const hasLora = nodeTypes.includes('LoraLoader')
    const hasUpscaling = nodeTypes.some(type => 
      type && (type.toLowerCase().includes('upscale') || type.toLowerCase().includes('esrgan'))
    )

    // Detect architecture from checkpoint
    let architecture: ModelParameters['architecture'] = 'Unknown'
    for (const node of Object.values(this.workflow)) {
      if (node.class_type === 'CheckpointLoaderSimple') {
        const checkpoint = this.getStringValue(node.inputs.ckpt_name)
        architecture = this.detectArchitecture(checkpoint)
        break
      }
    }

    // Estimate complexity
    let complexity: WorkflowMetadata['complexity'] = 'Simple'
    if (totalNodes > 50) complexity = 'Expert'
    else if (totalNodes > 20 || hasControlNet || hasLora) complexity = 'Complex'
    else if (totalNodes > 10 || hasImg2Img) complexity = 'Moderate'

    // Estimate VRAM usage
    const estimatedVRAM = this.estimateVRAMUsage(architecture, totalNodes, hasControlNet, hasLora)

    return {
      totalNodes,
      nodeTypes,
      hasImg2Img,
      hasInpainting,
      hasControlNet,
      hasLora,
      hasUpscaling,
      architecture,
      estimatedVRAM,
      complexity
    }
  }

  private detectArchitecture(checkpoint?: string): ModelParameters['architecture'] {
    if (!checkpoint) return 'Unknown'
    
    const name = checkpoint.toLowerCase()
    if (name.includes('xl') || name.includes('sdxl')) return 'SDXL'
    if (name.includes('sd3') || name.includes('stable-diffusion-3')) return 'SD3'
    if (name.includes('flux')) return 'Flux'
    if (name.includes('v1-5') || name.includes('1.5')) return 'SD1.5'
    
    return 'Unknown'
  }

  private estimateVRAMUsage(
    arch: ModelParameters['architecture'], 
    nodeCount: number, 
    hasControlNet: boolean, 
    hasLora: boolean
  ): string {
    let baseVRAM = 4 // GB baseline
    
    switch (arch) {
      case 'SDXL': baseVRAM = 6; break
      case 'SD3': baseVRAM = 8; break
      case 'Flux': baseVRAM = 12; break
      case 'SD1.5': baseVRAM = 4; break
    }
    
    if (hasControlNet) baseVRAM += 2
    if (hasLora) baseVRAM += 1
    if (nodeCount > 30) baseVRAM += 2
    
    return `~${baseVRAM}GB`
  }

  protected getStringValue(value: any): string | undefined {
    if (typeof value === 'string') return value
    return undefined
  }

  protected getNumericValue(value: any): number | undefined {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      if (!isNaN(parsed)) return parsed
    }
    return undefined
  }
}

// Utility functions
export function extractWorkflowParameters(workflow: ComfyUIWorkflow | WorkflowData): ExtractedParameters {
  const extractor = new ParameterExtractor(workflow)
  return extractor.extract()
}

export function updateWorkflowParameter(
  workflow: ComfyUIWorkflow | WorkflowData,
  nodeId: string,
  parameterName: string,
  value: any
): ComfyUIWorkflow {
  // Extract nodes from either format and create a copy
  const workflowNodes = getWorkflowNodes(workflow as ComfyUIWorkflow)
  const updatedWorkflow = { ...workflowNodes }
  
  if (updatedWorkflow[nodeId]) {
    updatedWorkflow[nodeId] = {
      ...updatedWorkflow[nodeId],
      inputs: {
        ...updatedWorkflow[nodeId].inputs,
        [parameterName]: value
      }
    }
  }
  
  // Return in the same format as the original workflow
  if (isComfyUIWorkflowUI(workflow as ComfyUIWorkflow)) {
    const uiFormat = JSON.parse(JSON.stringify(workflow))
    uiFormat.nodes = updatedWorkflow
    return uiFormat
  }
  
  return updatedWorkflow
}

export function formatParameterValue(value: any, type: 'string' | 'number' | 'boolean'): string {
  switch (type) {
    case 'string':
      return String(value || '')
    case 'number':
      return typeof value === 'number' ? value.toString() : '0'
    case 'boolean':
      return Boolean(value).toString()
    default:
      return String(value || '')
  }
}