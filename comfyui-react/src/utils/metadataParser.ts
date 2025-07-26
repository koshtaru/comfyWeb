// Enhanced ComfyUI Metadata Parser with Deep Workflow Analysis
// Extends the existing parameter extractor with comprehensive metadata extraction

import type { WorkflowData } from './workflowValidator'
import type { ExtractedParameters } from './parameterExtractor'
import { ParameterExtractor } from './parameterExtractor'
import type { ComfyUIWorkflow } from '@/types'
import { getWorkflowNodes } from '@/types'

// JSON Schema for metadata validation
export interface MetadataSchema {
  version: string
  timestamp: number
  workflow: WorkflowMetadata
  generation: GenerationMetadata
  models: ModelMetadata
  performance: PerformanceMetadata
  nodes: NodeMetadata[]
  relationships: NodeRelationship[]
}

export interface WorkflowMetadata {
  id: string
  name?: string
  description?: string
  version?: string
  author?: string
  tags: string[]
  architecture: 'SD1.5' | 'SDXL' | 'SD3' | 'Flux' | 'Unknown'
  complexity: 'Simple' | 'Moderate' | 'Complex' | 'Expert'
  nodeCount: number
  connectionCount: number
  customNodeCount: number
  estimatedVRAM: string
  estimatedExecutionTime?: number
  features: WorkflowFeatures
}

export interface WorkflowFeatures {
  hasImg2Img: boolean
  hasInpainting: boolean
  hasControlNet: boolean
  hasLora: boolean
  hasEmbeddings: boolean
  hasUpscaling: boolean
  hasFaceRestore: boolean
  hasAnimationFrames: boolean
  hasBatchProcessing: boolean
  hasCustomSamplers: boolean
  hasIPAdapter: boolean
  hasRegionalPrompting: boolean
}

export interface GenerationMetadata extends ExtractedParameters {
  timestamp: number
  seed: number | null
  subseed?: number
  seedVariation?: number
  totalSteps: number
  actualSteps?: number
  samplerChain: SamplerInfo[]
  conditioningStrength: number
  guidanceScale: number
  promptEmbeddings: PromptEmbedding[]
}

export interface SamplerInfo {
  nodeId: string
  name: string
  scheduler: string
  steps: number
  cfg: number
  denoise: number
  order: number
}

export interface PromptEmbedding {
  nodeId: string
  type: 'positive' | 'negative'
  text: string
  tokenCount: number
  embeddings: string[]
  strength?: number
}

export interface ModelMetadata {
  checkpoint: CheckpointInfo
  vae?: VAEInfo
  loras: LoRAInfo[]
  embeddings: EmbeddingInfo[]
  controlnets: ControlNetInfo[]
  upscalers: UpscalerInfo[]
  faceRestorers: FaceRestorerInfo[]
}

export interface CheckpointInfo {
  name: string
  hash?: string
  size?: number
  architecture: WorkflowMetadata['architecture']
  baseModel: string
  variant?: string
  clipSkip?: number
  nodeId: string
}

export interface VAEInfo {
  name: string
  hash?: string
  nodeId: string
}

export interface LoRAInfo {
  name: string
  hash?: string
  modelStrength: number
  clipStrength: number
  triggerWords?: string[]
  nodeId: string
}

export interface EmbeddingInfo {
  name: string
  hash?: string
  dimensions: number
  nodeId: string
}

export interface ControlNetInfo {
  name: string
  model: string
  strength: number
  startPercent: number
  endPercent: number
  preprocessor?: string
  nodeId: string
}

export interface UpscalerInfo {
  name: string
  scale: number
  nodeId: string
}

export interface FaceRestorerInfo {
  name: string
  strength: number
  nodeId: string
}

export interface PerformanceMetadata {
  totalNodes: number
  processedNodes: number
  skippedNodes: number
  cachedNodes: number
  estimatedTime: number
  actualTime?: number
  peakMemory?: number
  averageMemory?: number
  gpuUtilization?: number
  bottlenecks: PerformanceBottleneck[]
}

export interface PerformanceBottleneck {
  nodeId: string
  nodeType: string
  executionTime: number
  memoryUsage: number
  reason: string
}

export interface NodeMetadata {
  id: string
  type: string
  title?: string
  category: string
  isCustom: boolean
  inputs: NodeInput[]
  outputs: NodeOutput[]
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  color?: string
  executionOrder?: number
  executionTime?: number
  memoryUsage?: number
  cacheHit?: boolean
}

export interface NodeInput {
  name: string
  type: string
  value: any
  isConnected: boolean
  connectedFrom?: string
  defaultValue?: any
  description?: string
}

export interface NodeOutput {
  name: string
  type: string
  connectedTo: string[]
  description?: string
}

export interface NodeRelationship {
  fromNode: string
  toNode: string
  fromOutput: string
  toInput: string
  dataType: string
  isRequired: boolean
}

// Enhanced metadata parser class
export class MetadataParser extends ParameterExtractor {
  private nodeTypes: Map<string, NodeTypeDefinition> = new Map()
  private executionOrder: string[] = []
  private metadata: Partial<MetadataSchema> = {}

  constructor(workflow: ComfyUIWorkflow | WorkflowData, nodeDefinitions?: Map<string, NodeTypeDefinition>) {
    // Clean and validate workflow before processing
    const cleanedWorkflow = MetadataParser.cleanWorkflow(workflow)
    super(cleanedWorkflow)
    if (nodeDefinitions) {
      this.nodeTypes = nodeDefinitions
    }
    this.loadStandardNodeTypes()
  }

  /**
   * Clean workflow data by removing invalid nodes
   */
  private static cleanWorkflow(workflow: ComfyUIWorkflow | WorkflowData): WorkflowData {
    const cleaned: WorkflowData = {}
    
    if (!workflow || typeof workflow !== 'object') {
      console.error('[MetadataParser] Invalid workflow structure')
      return cleaned
    }

    // Extract nodes using the unified type helper
    const workflowNodes = getWorkflowNodes(workflow as ComfyUIWorkflow)

    for (const [nodeId, node] of Object.entries(workflowNodes)) {
      // Skip invalid nodes
      if (!node || typeof node !== 'object') {
        console.warn(`[MetadataParser] Skipping invalid node ${nodeId}`)
        continue
      }

      // Skip nodes without class_type
      if (!node.class_type) {
        console.warn(`[MetadataParser] Skipping node ${nodeId} without class_type`)
        continue
      }

      // Ensure node has inputs object
      if (!node.inputs) {
        node.inputs = {}
      }

      cleaned[nodeId] = node
    }

    console.log(`[MetadataParser] Cleaned workflow: ${Object.keys(actualWorkflow).length} → ${Object.keys(cleaned).length} nodes`)
    return cleaned
  }

  /**
   * Parse workflow and extract comprehensive metadata
   */
  parseWorkflow(): MetadataSchema {
    const timestamp = Date.now()
    const workflowId = this.generateWorkflowId()

    this.metadata = {
      version: '1.0',
      timestamp,
      workflow: this.extractEnhancedWorkflowMetadata(workflowId),
      generation: this.extractGenerationMetadata(timestamp),
      models: this.extractModelMetadata(),
      performance: this.extractPerformanceMetadata(),
      nodes: this.extractNodesMetadata(),
      relationships: this.extractNodeRelationships()
    }

    this.validateMetadataSchema()
    return this.metadata as MetadataSchema
  }

  /**
   * Extract comprehensive workflow metadata
   */
  private extractEnhancedWorkflowMetadata(id: string): WorkflowMetadata {
    const baseMetadata = super.extractWorkflowMetadata()
    const connections = this.countConnections()
    const customNodes = this.countCustomNodes()
    const features = this.analyzeWorkflowFeatures()

    return {
      id,
      name: this.extractWorkflowName(),
      description: this.extractWorkflowDescription(),
      version: this.extractWorkflowVersion(),
      author: this.extractWorkflowAuthor(),
      tags: this.extractWorkflowTags(),
      architecture: baseMetadata.architecture || 'Unknown',
      complexity: this.calculateComplexity(),
      nodeCount: Object.keys(this.workflow).length,
      connectionCount: connections,
      customNodeCount: customNodes,
      estimatedVRAM: baseMetadata.estimatedVRAM || '4GB',
      estimatedExecutionTime: this.estimateExecutionTime(),
      features
    }
  }

  /**
   * Extract enhanced generation metadata
   */
  private extractGenerationMetadata(timestamp: number): GenerationMetadata {
    const baseParams = this.extract()
    const samplerChain = this.extractSamplerChain()
    const promptEmbeddings = this.extractPromptEmbeddings()

    return {
      ...baseParams,
      timestamp,
      seed: baseParams.generation.seed || null,
      subseed: this.extractSubseed(),
      seedVariation: this.extractSeedVariation(),
      totalSteps: this.calculateTotalSteps(),
      samplerChain,
      conditioningStrength: this.extractConditioningStrength(),
      guidanceScale: baseParams.generation.cfg || 7.0,
      promptEmbeddings
    }
  }

  /**
   * Extract comprehensive model metadata
   */
  private extractModelMetadata(): ModelMetadata {
    const baseModels = super.extractModelParameters()
    
    return {
      checkpoint: this.extractCheckpointInfo(baseModels),
      vae: this.extractVAEInfo(),
      loras: this.extractLoRAInfo(baseModels.loras),
      embeddings: this.extractEmbeddingInfo(),
      controlnets: this.extractControlNetInfo(baseModels.controlnets),
      upscalers: this.extractUpscalerInfo(),
      faceRestorers: this.extractFaceRestorerInfo()
    }
  }

  /**
   * Extract performance metadata
   */
  private extractPerformanceMetadata(): PerformanceMetadata {
    const totalNodes = Object.keys(this.workflow).length
    const estimatedTime = this.estimateExecutionTime()
    const bottlenecks = this.identifyBottlenecks()

    return {
      totalNodes,
      processedNodes: 0, // Will be updated during execution
      skippedNodes: 0,
      cachedNodes: 0,
      estimatedTime,
      bottlenecks
    }
  }

  /**
   * Extract detailed node metadata
   */
  private extractNodesMetadata(): NodeMetadata[] {
    const nodes: NodeMetadata[] = []

    for (const [nodeId, node] of Object.entries(this.workflow)) {
      const nodeType = this.nodeTypes.get(node.class_type)
      const isCustom = !this.isStandardNode(node.class_type)

      const nodeMetadata: NodeMetadata = {
        id: nodeId,
        type: node.class_type,
        title: node._meta?.title,
        category: nodeType?.category || 'Unknown',
        isCustom,
        inputs: this.extractNodeInputs(node, nodeType),
        outputs: this.extractNodeOutputs(node, nodeType),
        position: (node._meta as any)?.position,
        size: (node._meta as any)?.size,
        color: (node._meta as any)?.color,
        executionOrder: this.executionOrder.indexOf(nodeId)
      }

      nodes.push(nodeMetadata)
    }

    return nodes
  }

  /**
   * Extract node relationships and connections
   */
  private extractNodeRelationships(): NodeRelationship[] {
    const relationships: NodeRelationship[] = []

    for (const [nodeId, node] of Object.entries(this.workflow)) {
      // Safety check for node structure
      if (!node || !node.inputs || typeof node.inputs !== 'object') {
        continue
      }
      
      for (const [inputName, inputValue] of Object.entries(node.inputs)) {
        if (Array.isArray(inputValue) && inputValue.length === 2) {
          const [sourceNodeId, outputIndex] = inputValue
          const sourceNode = this.workflow[sourceNodeId]
          
          if (sourceNode) {
            const sourceNodeType = this.nodeTypes.get(sourceNode.class_type)
            const targetNodeType = this.nodeTypes.get(node.class_type)
            
            const outputName = sourceNodeType?.outputs?.[outputIndex]?.name || `output_${outputIndex}`
            const dataType = sourceNodeType?.outputs?.[outputIndex]?.type || 'unknown'

            relationships.push({
              fromNode: sourceNodeId,
              toNode: nodeId,
              fromOutput: outputName,
              toInput: inputName,
              dataType,
              isRequired: targetNodeType?.inputs?.[inputName]?.required || false
            })
          }
        }
      }
    }

    return relationships
  }

  /**
   * Analyze workflow features
   */
  private analyzeWorkflowFeatures(): WorkflowFeatures {
    const nodeTypes = Object.values(this.workflow)
      .filter(n => n && n.class_type)
      .map(n => n.class_type)
    
    return {
      hasImg2Img: this.hasImg2Img(nodeTypes),
      hasInpainting: this.hasInpainting(nodeTypes),
      hasControlNet: this.hasControlNet(nodeTypes),
      hasLora: this.hasLora(nodeTypes),
      hasEmbeddings: this.hasEmbeddings(nodeTypes),
      hasUpscaling: this.hasUpscaling(nodeTypes),
      hasFaceRestore: this.hasFaceRestore(nodeTypes),
      hasAnimationFrames: this.hasAnimationFrames(nodeTypes),
      hasBatchProcessing: this.hasBatchProcessing(nodeTypes),
      hasCustomSamplers: this.hasCustomSamplers(nodeTypes),
      hasIPAdapter: this.hasIPAdapter(nodeTypes),
      hasRegionalPrompting: this.hasRegionalPrompting(nodeTypes)
    }
  }

  /**
   * Extract sampler chain information
   */
  private extractSamplerChain(): SamplerInfo[] {
    const samplers: SamplerInfo[] = []
    let order = 0

    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced') {
        samplers.push({
          nodeId,
          name: this.getStringValue(node.inputs.sampler_name) || 'Unknown',
          scheduler: this.getStringValue(node.inputs.scheduler) || 'Unknown',
          steps: this.getNumericValue(node.inputs.steps) || 20,
          cfg: this.getNumericValue(node.inputs.cfg) || 7.0,
          denoise: this.getNumericValue(node.inputs.denoise) || 1.0,
          order: order++
        })
      }
    }

    return samplers
  }

  /**
   * Extract prompt embeddings information
   */
  private extractPromptEmbeddings(): PromptEmbedding[] {
    const embeddings: PromptEmbedding[] = []

    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'CLIPTextEncode') {
        const text = this.getStringValue(node.inputs.text) || ''
        const type = this.determinePromptType(nodeId)
        
        embeddings.push({
          nodeId,
          type,
          text,
          tokenCount: this.estimateTokenCount(text),
          embeddings: this.extractEmbeddingTokens(text),
          strength: this.getNumericValue(node.inputs.strength)
        })
      }
    }

    return embeddings
  }

  /**
   * Extract checkpoint information
   */
  private extractCheckpointInfo(baseModels: { checkpoint?: string; architecture?: string; nodeId?: string }): CheckpointInfo {
    const checkpoint = baseModels.checkpoint
    const architecture = baseModels.architecture || 'Unknown'
    
    return {
      name: checkpoint || 'Unknown',
      architecture,
      baseModel: this.extractBaseModel(checkpoint),
      variant: this.extractModelVariant(checkpoint),
      clipSkip: this.extractClipSkip(),
      nodeId: baseModels.nodeId || ''
    }
  }

  /**
   * Load standard node type definitions
   */
  private loadStandardNodeTypes(): void {
    const standardTypes: Record<string, NodeTypeDefinition> = {
      'CheckpointLoaderSimple': {
        category: 'loaders',
        inputs: {
          ckpt_name: { type: 'string', required: true }
        },
        outputs: [
          { name: 'MODEL', type: 'MODEL' },
          { name: 'CLIP', type: 'CLIP' },
          { name: 'VAE', type: 'VAE' }
        ]
      },
      'KSampler': {
        category: 'sampling',
        inputs: {
          model: { type: 'MODEL', required: true },
          positive: { type: 'CONDITIONING', required: true },
          negative: { type: 'CONDITIONING', required: true },
          latent_image: { type: 'LATENT', required: true },
          seed: { type: 'int', required: true, defaultValue: 0 },
          steps: { type: 'int', required: true, defaultValue: 20 },
          cfg: { type: 'float', required: true, defaultValue: 8.0 },
          sampler_name: { type: 'string', required: true },
          scheduler: { type: 'string', required: true },
          denoise: { type: 'float', required: true, defaultValue: 1.0 }
        },
        outputs: [
          { name: 'LATENT', type: 'LATENT' }
        ]
      },
      'CLIPTextEncode': {
        category: 'conditioning',
        inputs: {
          text: { type: 'string', required: true },
          clip: { type: 'CLIP', required: true }
        },
        outputs: [
          { name: 'CONDITIONING', type: 'CONDITIONING' }
        ]
      },
      'VAEDecode': {
        category: 'latent',
        inputs: {
          samples: { type: 'LATENT', required: true },
          vae: { type: 'VAE', required: true }
        },
        outputs: [
          { name: 'IMAGE', type: 'IMAGE' }
        ]
      }
      // Add more standard node types as needed
    }

    for (const [type, definition] of Object.entries(standardTypes)) {
      this.nodeTypes.set(type, definition)
    }
  }

  // Helper methods
  private generateWorkflowId(): string {
    const hash = this.hashWorkflow()
    return `workflow_${Date.now()}_${hash.substring(0, 8)}`
  }

  private hashWorkflow(): string {
    const workflowString = JSON.stringify(this.workflow)
    let hash = 0
    for (let i = 0; i < workflowString.length; i++) {
      const char = workflowString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private extractWorkflowName(): string | undefined {
    // Try to extract from metadata or comments
    const validNodes = Object.values(this.workflow).filter(n => n && typeof n === 'object')
    const firstNode = validNodes[0]
    return firstNode?._meta?.title || undefined
  }

  private extractWorkflowDescription(): string | undefined {
    // Look for description in metadata
    return undefined
  }

  private extractWorkflowVersion(): string | undefined {
    // Look for version in metadata
    return undefined
  }

  private extractWorkflowAuthor(): string | undefined {
    // Look for author in metadata
    return undefined
  }

  private extractWorkflowTags(): string[] {
    const tags: string[] = []
    const features = this.analyzeWorkflowFeatures()
    
    if (features.hasImg2Img) tags.push('img2img')
    if (features.hasControlNet) tags.push('controlnet')
    if (features.hasLora) tags.push('lora')
    if (features.hasUpscaling) tags.push('upscaling')
    if (features.hasInpainting) tags.push('inpainting')
    
    return tags
  }

  private calculateComplexity(): WorkflowMetadata['complexity'] {
    const nodeCount = Object.keys(this.workflow).length
    const customNodeCount = this.countCustomNodes()
    const connectionCount = this.countConnections()
    
    let score = 0
    score += nodeCount
    score += customNodeCount * 2
    score += connectionCount * 0.5
    
    if (score > 100) return 'Expert'
    if (score > 50) return 'Complex'
    if (score > 20) return 'Moderate'
    return 'Simple'
  }

  private countConnections(): number {
    let count = 0
    for (const node of Object.values(this.workflow)) {
      // Safety check for node structure
      if (!node || !node.inputs || typeof node.inputs !== 'object') {
        continue
      }
      
      for (const input of Object.values(node.inputs)) {
        if (Array.isArray(input) && input.length === 2) {
          count++
        }
      }
    }
    return count
  }

  private countCustomNodes(): number {
    return Object.values(this.workflow).filter(
      node => node && node.class_type && !this.isStandardNode(node.class_type)
    ).length
  }

  private isStandardNode(nodeType: string): boolean {
    const standardNodes = [
      'CheckpointLoaderSimple', 'CLIPTextEncode', 'KSampler', 'KSamplerAdvanced',
      'VAEDecode', 'VAEEncode', 'EmptyLatentImage', 'SaveImage', 'LoadImage',
      'LoraLoader', 'ControlNetLoader', 'ControlNetApply', 'VAELoader'
    ]
    return standardNodes.includes(nodeType)
  }

  private estimateExecutionTime(): number {
    // Estimate based on node count and complexity
    const nodeCount = Object.keys(this.workflow).length
    const baseTime = 30 // seconds
    return baseTime + (nodeCount * 2)
  }

  private identifyBottlenecks(): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = []
    
    // Look for potentially slow nodes
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      let estimatedTime = 5 // base time in seconds
      
      if (node.class_type === 'KSampler') {
        const steps = this.getNumericValue(node.inputs.steps) || 20
        estimatedTime = steps * 0.5
      }
      
      if (estimatedTime > 15) {
        bottlenecks.push({
          nodeId,
          nodeType: node.class_type,
          executionTime: estimatedTime,
          memoryUsage: this.estimateNodeMemoryUsage(node),
          reason: 'High step count or complex processing'
        })
      }
    }
    
    return bottlenecks
  }

  private estimateNodeMemoryUsage(node: { class_type: string; inputs?: Record<string, unknown> }): number {
    // Estimate memory usage in MB
    switch (node.class_type) {
      case 'CheckpointLoaderSimple': return 2000
      case 'KSampler': return 1500
      case 'ControlNetApply': return 800
      default: return 100
    }
  }

  private extractNodeInputs(node: { inputs?: Record<string, unknown> }, nodeType?: NodeTypeDefinition): NodeInput[] {
    const inputs: NodeInput[] = []
    
    // Safety check for node.inputs
    if (!node.inputs || typeof node.inputs !== 'object') {
      return inputs
    }
    
    for (const [name, value] of Object.entries(node.inputs)) {
      const inputDef = nodeType?.inputs?.[name]
      const isConnected = Array.isArray(value) && value.length === 2
      
      inputs.push({
        name,
        type: inputDef?.type || 'unknown',
        value: isConnected ? null : value,
        isConnected,
        connectedFrom: isConnected ? value[0] : undefined,
        defaultValue: inputDef?.defaultValue,
        description: inputDef?.description
      })
    }
    
    return inputs
  }

  private extractNodeOutputs(node: { class_type: string }, nodeType?: NodeTypeDefinition): NodeOutput[] {
    const outputs: NodeOutput[] = []
    const nodeOutputs = nodeType?.outputs || []
    
    for (let i = 0; i < nodeOutputs.length; i++) {
      const outputDef = nodeOutputs[i]
      const connectedTo = this.findConnectedNodes(node, i)
      
      outputs.push({
        name: outputDef.name,
        type: outputDef.type,
        connectedTo,
        description: outputDef.description
      })
    }
    
    return outputs
  }

  private findConnectedNodes(sourceNode: { inputs?: Record<string, unknown> }, outputIndex: number): string[] {
    const connected: string[] = []
    const sourceNodeId = Object.keys(this.workflow).find(
      id => this.workflow[id] === sourceNode
    )
    
    if (!sourceNodeId) return connected
    
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      for (const input of Object.values(node.inputs)) {
        if (Array.isArray(input) && input[0] === sourceNodeId && input[1] === outputIndex) {
          connected.push(nodeId)
        }
      }
    }
    
    return connected
  }

  // Feature detection methods
  private hasImg2Img(nodeTypes: string[]): boolean {
    return nodeTypes.includes('LoadImage') && nodeTypes.includes('VAEEncode')
  }

  private hasInpainting(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => type.toLowerCase().includes('inpaint'))
  }

  private hasControlNet(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => type.includes('ControlNet'))
  }

  private hasLora(nodeTypes: string[]): boolean {
    return nodeTypes.includes('LoraLoader')
  }

  private hasEmbeddings(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => type.toLowerCase().includes('embedding'))
  }

  private hasUpscaling(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => 
      type.toLowerCase().includes('upscale') || 
      type.toLowerCase().includes('esrgan')
    )
  }

  private hasFaceRestore(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => 
      type.toLowerCase().includes('face') || 
      type.toLowerCase().includes('gfpgan') ||
      type.toLowerCase().includes('codeformer')
    )
  }

  private hasAnimationFrames(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => 
      type.toLowerCase().includes('animation') ||
      type.toLowerCase().includes('frame')
    )
  }

  private hasBatchProcessing(_nodeTypes: string[]): boolean {
    for (const node of Object.values(this.workflow)) {
      if (!node || !node.inputs) continue
      const batchSize = this.getNumericValue(node.inputs.batch_size)
      if (batchSize && batchSize > 1) return true
    }
    return false
  }

  private hasCustomSamplers(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => 
      type.includes('Sampler') && !['KSampler', 'KSamplerAdvanced'].includes(type)
    )
  }

  private hasIPAdapter(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => type.toLowerCase().includes('ipadapter'))
  }

  private hasRegionalPrompting(nodeTypes: string[]): boolean {
    return nodeTypes.some(type => 
      type.toLowerCase().includes('regional') ||
      type.toLowerCase().includes('attention')
    )
  }

  // Additional extraction methods
  private extractSubseed(): number | undefined {
    // Look for subseed in advanced sampler nodes
    return undefined
  }

  private extractSeedVariation(): number | undefined {
    // Look for seed variation settings
    return undefined
  }

  private calculateTotalSteps(): number {
    let totalSteps = 0
    for (const node of Object.values(this.workflow)) {
      if (!node || !node.class_type || !node.inputs) continue
      if (node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced') {
        totalSteps += this.getNumericValue(node.inputs.steps) || 0
      }
    }
    return totalSteps
  }

  private extractConditioningStrength(): number {
    // Extract conditioning strength from workflow
    return 1.0
  }

  private determinePromptType(nodeId: string): 'positive' | 'negative' {
    // Determine if this is positive or negative conditioning
    const connections = this.nodeConnections.get(nodeId)
    if (connections) {
      for (const conn of connections) {
        const connectedNode = this.workflow[conn.nodeId]
        if (connectedNode?.class_type === 'KSampler' || connectedNode?.class_type === 'KSamplerAdvanced') {
          // Check which input this connects to
          for (const [inputName, inputValue] of Object.entries(connectedNode.inputs)) {
            // Fix type mismatch: ComfyUI node IDs can be strings or numbers in connection arrays
            if (Array.isArray(inputValue) && String(inputValue[0]) === String(nodeId)) {
              return inputName === 'positive' ? 'positive' : 'negative'
            }
          }
        }
      }
    }
    return 'positive' // Default
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~0.75 tokens per word
    return Math.ceil(text.split(/\s+/).length * 0.75)
  }

  private extractEmbeddingTokens(text: string): string[] {
    // Extract embedding tokens like <token:1.2>
    const matches = text.match(/<[^>]+>/g) || []
    return matches.map(match => match.slice(1, -1))
  }

  private extractVAEInfo(): VAEInfo | undefined {
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      if (node.class_type === 'VAELoader') {
        return {
          name: this.getStringValue(node.inputs.vae_name) || 'Unknown',
          nodeId
        }
      }
    }
    return undefined
  }

  private extractLoRAInfo(baseLoras: Array<{ name?: string; strength?: number; clipStrength?: number; nodeId?: string }>): LoRAInfo[] {
    return baseLoras.map(lora => ({
      name: lora.name,
      modelStrength: lora.modelStrength,
      clipStrength: lora.clipStrength,
      nodeId: lora.nodeId,
      triggerWords: this.extractLoRATriggerWords(lora.name)
    }))
  }

  private extractLoRATriggerWords(_loraName: string): string[] | undefined {
    // This would need to be populated from a LoRA database
    return undefined
  }

  private extractEmbeddingInfo(): EmbeddingInfo[] {
    const embeddings: EmbeddingInfo[] = []
    // Extract textual inversion embeddings
    return embeddings
  }

  private extractControlNetInfo(baseControlNets: Array<{ model?: string; weight?: number; startPercent?: number; endPercent?: number; nodeId?: string }>): ControlNetInfo[] {
    return baseControlNets.map(cn => ({
      name: cn.name,
      model: cn.name, // Would need to be extracted from loader
      strength: cn.strength,
      startPercent: cn.startPercent || 0,
      endPercent: cn.endPercent || 1,
      nodeId: cn.nodeId
    }))
  }

  private extractUpscalerInfo(): UpscalerInfo[] {
    const upscalers: UpscalerInfo[] = []
    // Extract upscaler information
    return upscalers
  }

  private extractFaceRestorerInfo(): FaceRestorerInfo[] {
    const faceRestorers: FaceRestorerInfo[] = []
    // Extract face restorer information
    return faceRestorers
  }

  private extractBaseModel(checkpoint?: string): string {
    if (!checkpoint) return 'Unknown'
    // Extract base model from checkpoint name
    if (checkpoint.toLowerCase().includes('xl')) return 'SDXL'
    if (checkpoint.toLowerCase().includes('sd3')) return 'SD3'
    if (checkpoint.toLowerCase().includes('flux')) return 'Flux'
    return 'SD1.5'
  }

  private extractModelVariant(checkpoint?: string): string | undefined {
    if (!checkpoint) return undefined
    // Extract variant information (fp16, ema, etc.)
    return undefined
  }

  private extractClipSkip(): number | undefined {
    // Look for CLIP skip settings
    return undefined
  }

  /**
   * Validate metadata schema
   */
  private validateMetadataSchema(): boolean {
    // Basic validation - in production, use JSON Schema validation
    if (!this.metadata.version || !this.metadata.timestamp) {
      throw new Error('Invalid metadata schema: missing required fields')
    }
    return true
  }
}

// Node type definition interface
export interface NodeTypeDefinition {
  category: string
  inputs?: Record<string, {
    type: string
    required?: boolean
    defaultValue?: any
    description?: string
  }>
  outputs?: Array<{
    name: string
    type: string
    description?: string
  }>
}

// Utility functions
export function parseWorkflowMetadata(workflow: ComfyUIWorkflow | WorkflowData): MetadataSchema {
  const parser = new MetadataParser(workflow)
  return parser.parseWorkflow()
}

export function validateWorkflowMetadata(_metadata: MetadataSchema): boolean {
  // Implement JSON Schema validation
  return true
}

export function compareWorkflowMetadata(
  _metadata1: MetadataSchema,
  _metadata2: MetadataSchema
): Record<string, unknown> {
  // Implement metadata comparison
  return {}
}