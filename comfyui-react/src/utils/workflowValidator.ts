// ComfyUI Workflow Validation Engine
// Validates JSON workflow structure, nodes, and connections

export interface ValidationError {
  type: 'syntax' | 'structure' | 'node' | 'connection' | 'schema'
  message: string
  path?: string
  nodeId?: string
  line?: number
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  nodeCount: number
  nodeTypes: string[]
}

export interface WorkflowNode {
  class_type: string
  inputs: Record<string, any>
  _meta?: {
    title?: string
  }
}

export type WorkflowData = Record<string, WorkflowNode>

// Known ComfyUI node types and their required inputs
const NODE_SCHEMAS: Record<string, { 
  requiredInputs: string[]
  optionalInputs?: string[]
  description: string 
}> = {
  'CLIPTextEncode': {
    requiredInputs: ['text', 'clip'],
    description: 'Encodes text prompts using CLIP'
  },
  'KSampler': {
    requiredInputs: ['model', 'positive', 'negative', 'latent_image', 'seed', 'steps', 'cfg', 'sampler_name', 'scheduler'],
    description: 'Main sampling node for image generation'
  },
  'VAEDecode': {
    requiredInputs: ['samples', 'vae'],
    description: 'Decodes latent samples to images'
  },
  'CheckpointLoaderSimple': {
    requiredInputs: ['ckpt_name'],
    description: 'Loads model checkpoint'
  },
  'EmptyLatentImage': {
    requiredInputs: ['width', 'height', 'batch_size'],
    description: 'Creates empty latent image'
  },
  'SaveImage': {
    requiredInputs: ['images'],
    optionalInputs: ['filename_prefix'],
    description: 'Saves generated images'
  },
  'LoadImage': {
    requiredInputs: ['image'],
    description: 'Loads image from file'
  },
  'LoraLoader': {
    requiredInputs: ['model', 'clip', 'lora_name', 'strength_model', 'strength_clip'],
    description: 'Loads and applies LoRA'
  },
  'ControlNetLoader': {
    requiredInputs: ['control_net_name'],
    description: 'Loads ControlNet model'
  },
  'ControlNetApply': {
    requiredInputs: ['conditioning', 'control_net', 'image', 'strength'],
    description: 'Applies ControlNet conditioning'
  }
}

export class WorkflowValidator {
  private workflow: WorkflowData
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []

  constructor(workflow: WorkflowData) {
    this.workflow = workflow
  }

  validate(): ValidationResult {
    this.errors = []
    this.warnings = []

    // Basic structure validation
    this.validateBasicStructure()
    
    // Node validation
    this.validateNodes()
    
    // Connection validation
    this.validateConnections()
    
    // Workflow completeness validation
    this.validateWorkflowCompleteness()

    const nodeTypes = this.getUniqueNodeTypes()
    
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      nodeCount: Object.keys(this.workflow).length,
      nodeTypes
    }
  }

  private validateBasicStructure(): void {
    if (!this.workflow || typeof this.workflow !== 'object') {
      this.addError('structure', 'Workflow must be a JSON object')
      return
    }

    if (Object.keys(this.workflow).length === 0) {
      this.addError('structure', 'Workflow cannot be empty')
      return
    }

    // Check if all keys are numeric strings (ComfyUI node IDs)
    for (const nodeId of Object.keys(this.workflow)) {
      if (!/^\d+$/.test(nodeId)) {
        this.addWarning('structure', `Node ID "${nodeId}" should be numeric`, nodeId)
      }
    }
  }

  private validateNodes(): void {
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      this.validateNode(nodeId, node)
    }
  }

  private validateNode(nodeId: string, node: WorkflowNode): void {
    // Check required node properties
    if (!node.class_type) {
      this.addError('node', 'Node missing required "class_type" property', nodeId)
      return
    }

    if (!node.inputs || typeof node.inputs !== 'object') {
      this.addError('node', 'Node missing required "inputs" property', nodeId)
      return
    }

    // Validate against known schemas
    const schema = NODE_SCHEMAS[node.class_type]
    if (schema) {
      this.validateNodeSchema(nodeId, node, schema)
    } else {
      this.addWarning('schema', `Unknown node type: ${node.class_type}`, nodeId)
    }

    // Check for common input value types
    this.validateInputValues(nodeId, node)
  }

  private validateNodeSchema(
    nodeId: string, 
    node: WorkflowNode, 
    schema: typeof NODE_SCHEMAS[string]
  ): void {
    // Check required inputs
    for (const requiredInput of schema.requiredInputs) {
      if (!(requiredInput in node.inputs)) {
        this.addError('schema', 
          `Node "${node.class_type}" missing required input: ${requiredInput}`, 
          nodeId
        )
      }
    }

    // Validate specific node types
    this.validateSpecificNodeTypes(nodeId, node)
  }

  private validateSpecificNodeTypes(nodeId: string, node: WorkflowNode): void {
    switch (node.class_type) {
      case 'KSampler':
        this.validateKSampler(nodeId, node)
        break
      case 'EmptyLatentImage':
        this.validateEmptyLatentImage(nodeId, node)
        break
      case 'CheckpointLoaderSimple':
        this.validateCheckpointLoader(nodeId, node)
        break
    }
  }

  private validateKSampler(nodeId: string, node: WorkflowNode): void {
    const inputs = node.inputs
    
    // Validate steps
    if (typeof inputs.steps === 'number') {
      if (inputs.steps < 1 || inputs.steps > 1000) {
        this.addWarning('schema', 'KSampler steps should be between 1-1000', nodeId)
      }
    }
    
    // Validate CFG
    if (typeof inputs.cfg === 'number') {
      if (inputs.cfg < 1 || inputs.cfg > 30) {
        this.addWarning('schema', 'KSampler CFG should be between 1-30', nodeId)
      }
    }
    
    // Validate seed
    if (typeof inputs.seed === 'number') {
      if (inputs.seed < 0) {
        this.addWarning('schema', 'KSampler seed should be non-negative', nodeId)
      }
    }
  }

  private validateEmptyLatentImage(nodeId: string, node: WorkflowNode): void {
    const inputs = node.inputs
    
    // Validate dimensions
    if (typeof inputs.width === 'number' && typeof inputs.height === 'number') {
      if (inputs.width % 8 !== 0 || inputs.height % 8 !== 0) {
        this.addWarning('schema', 'Image dimensions should be multiples of 8', nodeId)
      }
      
      if (inputs.width < 64 || inputs.height < 64) {
        this.addWarning('schema', 'Image dimensions should be at least 64x64', nodeId)
      }
      
      if (inputs.width > 4096 || inputs.height > 4096) {
        this.addWarning('schema', 'Large image dimensions may cause memory issues', nodeId)
      }
    }
    
    // Validate batch size
    if (typeof inputs.batch_size === 'number') {
      if (inputs.batch_size < 1 || inputs.batch_size > 10) {
        this.addWarning('schema', 'Batch size should be between 1-10', nodeId)
      }
    }
  }

  private validateCheckpointLoader(nodeId: string, node: WorkflowNode): void {
    const ckptName = node.inputs.ckpt_name
    if (typeof ckptName === 'string') {
      if (!ckptName.endsWith('.safetensors') && !ckptName.endsWith('.ckpt')) {
        this.addWarning('schema', 'Checkpoint should be .safetensors or .ckpt file', nodeId)
      }
    }
  }

  private validateInputValues(_nodeId: string, node: WorkflowNode): void {
    for (const [, inputValue] of Object.entries(node.inputs)) {
      // Check for connection references [nodeId, outputIndex]
      if (Array.isArray(inputValue) && inputValue.length === 2) {
        const [refNodeId, outputIndex] = inputValue
        if (typeof refNodeId === 'string' && typeof outputIndex === 'number') {
          // This is a valid connection reference
          continue
        }
      }
      
      // Additional input validation can be added here
    }
  }

  private validateConnections(): void {
    const nodeIds = new Set(Object.keys(this.workflow))
    
    for (const [nodeId, node] of Object.entries(this.workflow)) {
      for (const [, inputValue] of Object.entries(node.inputs)) {
        if (Array.isArray(inputValue) && inputValue.length === 2) {
          const [refNodeId, outputIndex] = inputValue
          
          // Check if referenced node exists
          if (!nodeIds.has(String(refNodeId))) {
            this.addError('connection', 
              `Node ${nodeId} references non-existent node ${refNodeId}`,
              nodeId
            )
          }
          
          // Check output index is valid
          if (typeof outputIndex !== 'number' || outputIndex < 0) {
            this.addError('connection',
              `Invalid output index ${outputIndex} in node ${nodeId}`,
              nodeId
            )
          }
        }
      }
    }
  }

  private validateWorkflowCompleteness(): void {
    const nodeTypes = this.getUniqueNodeTypes()
    
    // Check for essential node types
    const hasTextEncoder = nodeTypes.includes('CLIPTextEncode')
    const hasSampler = nodeTypes.includes('KSampler')
    const hasVAEDecoder = nodeTypes.includes('VAEDecode')
    const hasModelLoader = nodeTypes.includes('CheckpointLoaderSimple')
    
    if (!hasModelLoader) {
      this.addWarning('structure', 'Workflow should include a model loader (CheckpointLoaderSimple)')
    }
    
    if (!hasTextEncoder) {
      this.addWarning('structure', 'Workflow should include text encoding (CLIPTextEncode)')
    }
    
    if (!hasSampler) {
      this.addWarning('structure', 'Workflow should include a sampler (KSampler)')
    }
    
    if (!hasVAEDecoder) {
      this.addWarning('structure', 'Workflow should include VAE decoding (VAEDecode)')
    }
  }

  private getUniqueNodeTypes(): string[] {
    return [...new Set(Object.values(this.workflow).map(node => node.class_type))]
  }

  private addError(type: ValidationError['type'], message: string, nodeId?: string): void {
    this.errors.push({
      type,
      message,
      nodeId,
      severity: 'error'
    })
  }

  private addWarning(type: ValidationError['type'], message: string, nodeId?: string): void {
    this.warnings.push({
      type,
      message,
      nodeId,
      severity: 'warning'
    })
  }
}

// Utility functions for validation
export function validateWorkflowJSON(jsonString: string): ValidationResult {
  try {
    const workflow = JSON.parse(jsonString) as WorkflowData
    const validator = new WorkflowValidator(workflow)
    return validator.validate()
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        type: 'syntax',
        message: `JSON syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }],
      warnings: [],
      nodeCount: 0,
      nodeTypes: []
    }
  }
}

export function validateWorkflow(workflow: WorkflowData): ValidationResult {
  const validator = new WorkflowValidator(workflow)
  return validator.validate()
}