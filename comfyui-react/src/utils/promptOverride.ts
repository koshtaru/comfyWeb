// Prompt Override Utility
// Handles replacing prompts in ComfyUI workflow JSON with user-provided overrides

import type { ComfyUIWorkflow } from '@/types'
import type { ExtractedParameters } from './parameterExtractor'

/**
 * Applies a prompt override to a ComfyUI workflow
 * Replaces the positive prompt in CLIPTextEncode nodes with the provided override text
 * 
 * @param workflow - Original ComfyUI workflow JSON
 * @param overrideText - Text to use as prompt override (empty string = no override)
 * @param extractedParams - Previously extracted parameters containing node IDs
 * @returns Modified workflow with prompt overrides applied
 */
export function applyPromptOverride(
  workflow: ComfyUIWorkflow,
  overrideText: string,
  extractedParams: ExtractedParameters | null
): ComfyUIWorkflow {
  // If no override text provided, return original workflow unchanged
  if (!overrideText.trim()) {
    return workflow
  }

  // If no extracted parameters available, we can't identify prompt nodes
  if (!extractedParams) {
    console.warn('[PromptOverride] No extracted parameters available, cannot apply override')
    return workflow
  }

  // Extract nodes from ComfyUI UI format if needed
  let actualWorkflow = workflow
  if ((workflow as any).nodes && typeof (workflow as any).nodes === 'object') {
    actualWorkflow = (workflow as any).nodes as ComfyUIWorkflow
  }

  // Create a deep copy of the workflow to avoid mutating the original
  const modifiedWorkflow = JSON.parse(JSON.stringify(actualWorkflow)) as ComfyUIWorkflow
  
  // Apply override to positive prompt node if available
  if (extractedParams.prompts.positiveNodeId) {
    const nodeId = extractedParams.prompts.positiveNodeId
    const node = modifiedWorkflow[nodeId]
    
    if (node && node.class_type === 'CLIPTextEncode') {
      node.inputs.text = overrideText.trim()
    }
  } else {
    // Fallback: Find all CLIPTextEncode nodes and replace the first one connected to a positive input
    for (const [nodeId, node] of Object.entries(modifiedWorkflow)) {
      if (node.class_type === 'CLIPTextEncode') {
        // Check if this node connects to a sampler's positive input
        const promptType = findPromptType(modifiedWorkflow, nodeId)
        
        if (promptType === 'positive') {
          node.inputs.text = overrideText.trim()
          break // Only override the first positive prompt found
        }
      }
    }
  }

  // If we extracted nodes from UI format, return in the same UI format
  if ((workflow as any).nodes && typeof (workflow as any).nodes === 'object') {
    const uiFormat = JSON.parse(JSON.stringify(workflow))
    uiFormat.nodes = modifiedWorkflow
    return uiFormat
  }

  return modifiedWorkflow
}

/**
 * Determines if a CLIPTextEncode node is used for positive or negative conditioning
 * by analyzing its connections to sampler nodes
 */
function findPromptType(workflow: ComfyUIWorkflow, nodeId: string): 'positive' | 'negative' | 'unknown' {
  // Look through all nodes to find samplers that reference this node
  for (const [, node] of Object.entries(workflow)) {
    if (node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced') {
      // Check if this CLIPTextEncode node connects to positive or negative input
      for (const [inputName, inputValue] of Object.entries(node.inputs)) {
        // Fix type mismatch: ComfyUI node IDs can be strings or numbers in connection arrays
        if (Array.isArray(inputValue) && String(inputValue[0]) === String(nodeId)) {
          if (inputName === 'positive') {
            return 'positive'
          } else if (inputName === 'negative') {
            return 'negative'
          }
        }
      }
    }
  }
  
  return 'unknown'
}

/**
 * Validates that a prompt override can be applied to the given workflow
 */
export function canApplyPromptOverride(
  workflow: ComfyUIWorkflow | null,
  extractedParams: ExtractedParameters | null
): boolean {
  if (!workflow || !extractedParams) {
    return false
  }

  // Check if we have at least one CLIPTextEncode node
  const hasTextEncodeNode = Object.values(workflow).some(
    node => node.class_type === 'CLIPTextEncode'
  )

  return hasTextEncodeNode
}

/**
 * Gets a preview of what prompt will be overridden
 */
export function getPromptOverridePreview(
  extractedParams: ExtractedParameters | null
): { 
  canOverride: boolean
  originalPrompt: string | null
  nodeId: string | null
} {
  if (!extractedParams) {
    return {
      canOverride: false,
      originalPrompt: null,
      nodeId: null
    }
  }

  return {
    canOverride: !!extractedParams.prompts.positiveNodeId,
    originalPrompt: extractedParams.prompts.positive || null,
    nodeId: extractedParams.prompts.positiveNodeId || null
  }
}