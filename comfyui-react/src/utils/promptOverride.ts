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

  // Create a deep copy of the workflow to avoid mutating the original
  const modifiedWorkflow = JSON.parse(JSON.stringify(workflow)) as ComfyUIWorkflow

  console.log('[PromptOverride] Starting prompt override process')
  console.log('[PromptOverride] Extracted parameters:', extractedParams.prompts)
  
  // Apply override to positive prompt node if available
  if (extractedParams.prompts.positiveNodeId) {
    const nodeId = extractedParams.prompts.positiveNodeId
    const node = modifiedWorkflow[nodeId]
    
    console.log(`[PromptOverride] Found positive node ID: ${nodeId}`)
    console.log(`[PromptOverride] Node exists:`, !!node)
    console.log(`[PromptOverride] Node type:`, node?.class_type)
    
    if (node && node.class_type === 'CLIPTextEncode') {
      console.log(`[PromptOverride] ✅ Replacing positive prompt in node ${nodeId}`)
      console.log(`[PromptOverride] Original: "${node.inputs.text}"`)
      console.log(`[PromptOverride] Override: "${overrideText}"`)
      
      const oldText = node.inputs.text
      node.inputs.text = overrideText.trim()
      
      console.log(`[PromptOverride] ✅ Successfully changed prompt from "${oldText}" to "${node.inputs.text}"`)
    } else {
      console.warn(`[PromptOverride] ❌ Could not find CLIPTextEncode node with ID ${nodeId}`)
      console.warn(`[PromptOverride] Available nodes:`, Object.keys(modifiedWorkflow))
    }
  } else {
    // Fallback: Find all CLIPTextEncode nodes and replace the first one connected to a positive input
    console.log('[PromptOverride] ⚠️ No positive node ID found, searching for CLIPTextEncode nodes')
    
    let fallbackSuccess = false
    for (const [nodeId, node] of Object.entries(modifiedWorkflow)) {
      if (node.class_type === 'CLIPTextEncode') {
        console.log(`[PromptOverride] Checking CLIPTextEncode node ${nodeId}`)
        
        // Check if this node connects to a sampler's positive input
        const promptType = findPromptType(modifiedWorkflow, nodeId)
        console.log(`[PromptOverride] Node ${nodeId} prompt type: ${promptType}`)
        
        if (promptType === 'positive') {
          console.log(`[PromptOverride] ✅ Found positive prompt node ${nodeId}, applying override`)
          console.log(`[PromptOverride] Original: "${node.inputs.text}"`)
          console.log(`[PromptOverride] Override: "${overrideText}"`)
          
          const oldText = node.inputs.text
          node.inputs.text = overrideText.trim()
          console.log(`[PromptOverride] ✅ Successfully changed prompt from "${oldText}" to "${node.inputs.text}"`)
          fallbackSuccess = true
          break // Only override the first positive prompt found
        }
      }
    }
    
    if (!fallbackSuccess) {
      console.error('[PromptOverride] ❌ No positive CLIPTextEncode nodes found in workflow')
    }
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