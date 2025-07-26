// ComfyUI Generation Service
// Handles workflow submission and generation management

import { createCustomAPIClient } from './api/client'
import { useAPIStore } from '@/store/apiStore'
import type { ComfyUIWorkflow } from '@/types'

export interface GenerationRequest {
  workflow: ComfyUIWorkflow
  client_id?: string
}

export interface GenerationResponse {
  prompt_id: string
  number: number
  node_errors?: Record<string, any>
}

export class GenerationService {
  private client_id: string
  private getAPIClient: () => any

  constructor() {
    // Generate a unique client ID for this session
    this.client_id = `comfyui-react-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Create a function to get the current API client with the right endpoint
    this.getAPIClient = () => {
      const endpoint = useAPIStore.getState().endpoint
      return createCustomAPIClient(endpoint)
    }
  }

  /**
   * Extract workflow nodes from ComfyUI UI format
   */
  private extractWorkflowNodes(workflow: ComfyUIWorkflow): ComfyUIWorkflow {
    // Check if this is a ComfyUI UI export format with nodes property
    if (workflow.nodes && typeof workflow.nodes === 'object') {
      console.log('[Generation] Detected ComfyUI UI format, extracting nodes')
      return workflow.nodes as ComfyUIWorkflow
    }
    
    // Already in the correct format (direct node mapping)
    return workflow
  }

  /**
   * Validate workflow structure before submission
   */
  private validateWorkflow(workflow: ComfyUIWorkflow): void {
    if (!workflow || typeof workflow !== 'object') {
      throw new Error('Invalid workflow: must be an object')
    }

    if (Object.keys(workflow).length === 0) {
      throw new Error('Invalid workflow: cannot be empty')
    }

    // Check that all nodes have required properties
    for (const [nodeId, node] of Object.entries(workflow)) {
      if (!node || typeof node !== 'object') {
        throw new Error(`Invalid node ${nodeId}: must be an object`)
      }
      
      if (!node.class_type || typeof node.class_type !== 'string') {
        console.error(`[Generation] Invalid node ${nodeId}:`, node)
        throw new Error(`Invalid node ${nodeId}: missing or invalid class_type property. Node data: ${JSON.stringify(node)}`)
      }
      
      if (!node.inputs || typeof node.inputs !== 'object') {
        throw new Error(`Invalid node ${nodeId}: missing or invalid inputs property`)
      }
    }

    console.log('[Generation] ✅ Workflow validation passed')
  }

  /**
   * Submit a workflow for generation
   */
  async generateImage(workflow: ComfyUIWorkflow): Promise<GenerationResponse> {
    try {
      // Extract nodes from ComfyUI UI format if needed
      const workflowNodes = this.extractWorkflowNodes(workflow)
      
      // Validate workflow structure before submission
      this.validateWorkflow(workflowNodes)
      
      console.log('[Generation] Submitting workflow:', { 
        client_id: this.client_id,
        nodeCount: Object.keys(workflowNodes).length,
        workflowKeys: Object.keys(workflowNodes),
        sampleNode: Object.entries(workflowNodes)[0]
      })
      
      console.log('[Generation] Full workflow structure:', JSON.stringify(workflowNodes, null, 2))

      // Force ComfyUI to execute by adding a timestamp to prevent caching
      const workflowCopy = JSON.parse(JSON.stringify(workflowNodes));
      
      // Find any SaveImage node and add timestamp to filename
      let foundSaveImage = false;
      Object.entries(workflowCopy).forEach(([nodeId, node]: [string, any]) => {
        if (node.class_type === 'SaveImage' && node.inputs) {
          node.inputs.filename_prefix = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          foundSaveImage = true;
          console.log('[Generation] Updated SaveImage node:', nodeId, node.inputs.filename_prefix);
        }
      });
      
      if (!foundSaveImage) {
        console.warn('[Generation] ⚠️ No SaveImage node found in workflow');
      }
      
      // Force re-execution by modifying seed if found
      Object.entries(workflowCopy).forEach(([nodeId, node]: [string, any]) => {
        if (node.class_type === 'KSampler' && node.inputs && node.inputs.seed !== undefined) {
          // If seed is -1 (random), leave it. Otherwise force a new seed
          if (node.inputs.seed !== -1) {
            node.inputs.seed = Math.floor(Math.random() * 1000000000);
            console.log('[Generation] Updated seed in KSampler node:', nodeId, node.inputs.seed);
          }
        }
      });
      
      const requestBody = {
        prompt: workflowCopy,
        client_id: this.client_id
      }
      
      console.log('[Generation] Request body:', JSON.stringify(requestBody, null, 2))
      console.log('[Generation] Workflow type:', typeof workflow)
      console.log('[Generation] Workflow is array?', Array.isArray(workflow))
      console.log('[Generation] Workflow keys:', Object.keys(workflow || {}))
      console.log('[Generation] Client ID:', this.client_id)

      const response = await this.getAPIClient().post('/prompt', requestBody)

      console.log('[Generation] ✅ Workflow accepted by ComfyUI:', {
        promptId: response.data.prompt_id,
        queueNumber: response.data.number,
        hasErrors: Object.keys(response.data.node_errors || {}).length > 0
      })
      
      // Check queue status
      try {
        const queueStatus = await this.getAPIClient().get('/queue')
        console.log('[Generation] Queue status:', queueStatus.data)
      } catch (err) {
        console.error('[Generation] Failed to check queue:', err)
      }
      
      // Check history to see if the workflow was executed
      try {
        await new Promise(resolve => setTimeout(resolve, 500)) // Small delay to let ComfyUI process
        const history = await this.getAPIClient().get('/history')
        console.log('[Generation] History after submission:', history.data)
        
        // Check if our prompt_id is in the history
        if (history.data[response.data.prompt_id]) {
          console.log('[Generation] ✅ Found our prompt in history:', history.data[response.data.prompt_id])
        } else {
          console.warn('[Generation] ⚠️ Prompt not found in history yet')
        }
      } catch (err) {
        console.error('[Generation] Failed to check history:', err)
      }
      
      return response.data
    } catch (error: any) {
      console.error('[Generation] Submission failed:', error)
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to submit generation request'
      )
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus() {
    try {
      const response = await this.getAPIClient().get('/queue')
      return response.data
    } catch (error: any) {
      console.error('[Generation] Failed to get queue status:', error)
      throw new Error('Failed to get queue status')
    }
  }

  /**
   * Interrupt current generation
   */
  async interruptGeneration(): Promise<void> {
    try {
      console.log('[Generation] Interrupting generation')
      await this.getAPIClient().post('/interrupt')
      console.log('[Generation] Generation interrupted successfully')
    } catch (error: any) {
      console.error('[Generation] Failed to interrupt generation:', error)
      throw new Error('Failed to interrupt generation')
    }
  }

  /**
   * Get generation history
   */
  async getHistory(maxItems: number = 50) {
    try {
      const response = await this.getAPIClient().get('/history', {
        params: { max_items: maxItems }
      })
      return response.data
    } catch (error: any) {
      console.error('[Generation] Failed to get history:', error)
      throw new Error('Failed to get generation history')
    }
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    try {
      console.log('[Generation] Clearing queue')
      await this.getAPIClient().post('/queue', { clear: true })
      console.log('[Generation] Queue cleared successfully')
    } catch (error: any) {
      console.error('[Generation] Failed to clear queue:', error)
      throw new Error('Failed to clear queue')
    }
  }

  /**
   * Get client ID for this session
   */
  getClientId(): string {
    return this.client_id
  }
}

// Export singleton instance
export const generationService = new GenerationService()