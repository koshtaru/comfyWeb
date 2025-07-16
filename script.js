/**
 * ComfyUI JSON Workflow Runner
 * Main application script
 */

// Application state
const AppState = {
    apiEndpoint: localStorage.getItem('comfyui_endpoint') || 'http://192.168.10.15:8188',
    isConnected: false,
    workflowData: null,
    modifiedWorkflowData: null,
    isGenerating: false
};

// DOM Elements
const elements = {
    apiUrl: document.getElementById('api-url'),
    testConnection: document.getElementById('test-connection'),
    connectionStatus: document.getElementById('connection-status'),
    fileUpload: document.getElementById('workflow-file'),
    fileUploadArea: document.getElementById('file-upload-area'),
    uploadStatus: document.getElementById('upload-status'),
    workflowForm: document.getElementById('workflow-form'),
    generateButton: document.getElementById('generate-button'),
    resultsArea: document.getElementById('results-area'),
    clearResults: document.getElementById('clear-results'),
    toastContainer: document.getElementById('toast-container')
};

// Utility Functions
const Utils = {
    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: start; gap: 12px;">
                <svg style="width: 20px; height: 20px; flex-shrink: 0;" viewBox="0 0 24 24">
                    ${type === 'error' ? 
                        '<path fill="currentColor" d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />' :
                        '<path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />'
                    }
                </svg>
                <div>${message}</div>
            </div>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Validate JSON
    isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    },

    // Validate ComfyUI workflow structure
    validateComfyUIWorkflow(workflowData) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            nodeCount: 0,
            foundNodes: {
                ksampler: false,
                emptyLatentImage: false,
                clipTextEncode: false
            }
        };

        try {
            // Check if it's an object
            if (!workflowData || typeof workflowData !== 'object') {
                validation.isValid = false;
                validation.errors.push('Workflow must be a valid JSON object');
                return validation;
            }

            // Check for basic ComfyUI workflow structure
            if (!workflowData.nodes && !Object.keys(workflowData).some(key => !isNaN(key))) {
                validation.isValid = false;
                validation.errors.push('Invalid ComfyUI workflow format - missing nodes structure');
                return validation;
            }

            // Parse workflow nodes (handle both node array and numbered object formats)
            let nodes = [];
            if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
                // New format with nodes array
                nodes = workflowData.nodes;
            } else {
                // Old format with numbered keys
                nodes = Object.keys(workflowData)
                    .filter(key => !isNaN(key))
                    .map(key => workflowData[key]);
            }

            validation.nodeCount = nodes.length;

            if (nodes.length === 0) {
                validation.isValid = false;
                validation.errors.push('Workflow contains no nodes');
                return validation;
            }

            // Check for essential ComfyUI node types
            for (const node of nodes) {
                if (!node || typeof node !== 'object') {
                    validation.warnings.push('Found invalid node structure');
                    continue;
                }

                const nodeType = node.class_type || node.type;
                if (!nodeType) {
                    validation.warnings.push('Found node without type information');
                    continue;
                }

                // Check for key node types
                if (nodeType === 'KSampler' || nodeType === 'KSamplerAdvanced') {
                    validation.foundNodes.ksampler = true;
                } else if (nodeType === 'FluxSampler' || nodeType.includes('FluxSample')) {
                    validation.foundNodes.ksampler = true;
                } else if (nodeType === 'FluxGuidanceNode' || nodeType === 'FluxGuidance') {
                    validation.foundNodes.ksampler = true;
                } else if (nodeType === 'EmptyLatentImage') {
                    validation.foundNodes.emptyLatentImage = true;
                } else if (nodeType === 'EmptySD3LatentImage' || nodeType === 'SD3LatentImage') {
                    validation.foundNodes.emptyLatentImage = true;
                } else if (nodeType === 'FluxGGUFLatent' || nodeType === 'FluxLatent' || nodeType === 'FluxGGUFLatentImage') {
                    validation.foundNodes.emptyLatentImage = true;
                } else if (nodeType.includes('Flux') && nodeType.includes('Latent')) {
                    validation.foundNodes.emptyLatentImage = true;
                } else if (nodeType === 'CLIPTextEncode') {
                    validation.foundNodes.clipTextEncode = true;
                }
            }

            // Validate essential nodes with Flux/SD3-aware messages
            if (!validation.foundNodes.ksampler) {
                validation.warnings.push('No sampling control nodes found (KSampler, FluxSampler, or FluxGuidanceNode) - generation steps and CFG may not be controllable');
            }
            if (!validation.foundNodes.emptyLatentImage) {
                validation.warnings.push('No dimension control nodes found (EmptyLatentImage, EmptySD3LatentImage, FluxGGUFLatent, FluxLatent, VAE, or ModelInput) - image dimensions may not be controllable through the UI');
            }
            if (!validation.foundNodes.clipTextEncode) {
                validation.warnings.push('No text encoding nodes found (CLIPTextEncode) - positive prompt may not be controllable');
            }

            return validation;
        } catch (error) {
            validation.isValid = false;
            validation.errors.push(`Workflow validation error: ${error.message}`);
            return validation;
        }
    },

    // Extract parameters from ComfyUI workflow
    extractWorkflowParameters(workflowData) {
        console.log('🔍 Extracting parameters from workflow...');
        
        const parameters = {
            steps: 20,
            cfg: 7.0,
            width: 512,
            height: 512,
            batchSize: 1,
            positivePrompt: '',
            foundNodes: {
                ksampler: false,
                emptyLatentImage: false,
                clipTextEncode: false
            }
        };
        
        try {
            // Parse workflow nodes (handle both formats)
            let nodes = [];
            if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
                // New format with nodes array
                nodes = workflowData.nodes;
                console.log('📋 Using new workflow format (nodes array)');
            } else {
                // Old format with numbered keys
                nodes = Object.keys(workflowData)
                    .filter(key => !isNaN(key))
                    .map(key => ({ ...workflowData[key], id: key }));
                console.log('📋 Using old workflow format (numbered keys)');
            }
            
            console.log(`📊 Processing ${nodes.length} nodes for parameter extraction`);
            
            // DEBUG: Log all node types found in workflow
            console.log('🔍 DEBUG: All node types in workflow:');
            nodes.forEach((node, index) => {
                if (node && typeof node === 'object') {
                    const nodeType = node.class_type || node.type;
                    const inputs = node.inputs || {};
                    const inputKeys = Object.keys(inputs);
                    console.log(`  Node ${index}: "${nodeType}" | Inputs: [${inputKeys.join(', ')}]`);
                }
            });
            
            // Extract parameters from each node
            nodes.forEach((node, index) => {
                if (!node || typeof node !== 'object') return;
                
                const nodeType = node.class_type || node.type;
                if (!nodeType) return;
                
                console.log(`🔎 Node ${index}: "${nodeType}"`);
                
                // SPECIAL DEBUG for EmptySD3LatentImage
                if (nodeType === 'EmptySD3LatentImage') {
                    console.log(`🎯 FOUND EmptySD3LatentImage! Node structure:`, {
                        nodeType,
                        inputs: node.inputs,
                        allNodeKeys: Object.keys(node)
                    });
                }
                
                // Extract KSampler parameters (traditional ComfyUI)
                if (nodeType === 'KSampler' || nodeType === 'KSamplerAdvanced') {
                    parameters.foundNodes.ksampler = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.steps !== undefined) {
                        parameters.steps = parseInt(inputs.steps) || parameters.steps;
                        console.log(`  ⚙️ Found steps (${nodeType}): ${parameters.steps}`);
                    }
                    if (inputs.cfg !== undefined) {
                        parameters.cfg = parseFloat(inputs.cfg) || parameters.cfg;
                        console.log(`  ⚙️ Found CFG (${nodeType}): ${parameters.cfg}`);
                    }
                }
                
                // Extract FluxSampler parameters
                else if (nodeType === 'FluxSampler' || nodeType.includes('FluxSample')) {
                    parameters.foundNodes.ksampler = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.steps !== undefined || inputs.num_steps !== undefined) {
                        const stepValue = inputs.steps || inputs.num_steps;
                        parameters.steps = parseInt(stepValue) || parameters.steps;
                        console.log(`  ⚙️ Found steps (${nodeType}): ${parameters.steps}`);
                    }
                    if (inputs.cfg !== undefined || inputs.guidance !== undefined || inputs.guidance_scale !== undefined) {
                        const cfgValue = inputs.cfg || inputs.guidance || inputs.guidance_scale;
                        parameters.cfg = parseFloat(cfgValue) || parameters.cfg;
                        console.log(`  ⚙️ Found CFG/guidance (${nodeType}): ${parameters.cfg}`);
                    }
                }
                
                // Extract FluxGuidanceNode parameters
                else if (nodeType === 'FluxGuidanceNode' || nodeType === 'FluxGuidance') {
                    parameters.foundNodes.ksampler = true; // Mark as found for CFG control
                    
                    const inputs = node.inputs || {};
                    if (inputs.guidance !== undefined || inputs.guidance_scale !== undefined || inputs.cfg !== undefined) {
                        const guidanceValue = inputs.guidance || inputs.guidance_scale || inputs.cfg;
                        parameters.cfg = parseFloat(guidanceValue) || parameters.cfg;
                        console.log(`  ⚙️ Found guidance (${nodeType}): ${parameters.cfg}`);
                    }
                }
                
                // Extract dimension parameters from various node types
                else if (nodeType === 'EmptyLatentImage') {
                    parameters.foundNodes.emptyLatentImage = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.width !== undefined) {
                        parameters.width = parseInt(inputs.width) || parameters.width;
                        console.log(`  📐 Found width (EmptyLatentImage): ${parameters.width}`);
                    }
                    if (inputs.height !== undefined) {
                        parameters.height = parseInt(inputs.height) || parameters.height;
                        console.log(`  📐 Found height (EmptyLatentImage): ${parameters.height}`);
                    }
                    if (inputs.batch_size !== undefined) {
                        parameters.batchSize = parseInt(inputs.batch_size) || parameters.batchSize;
                        console.log(`  📦 Found batch size (EmptyLatentImage): ${parameters.batchSize}`);
                    }
                }
                
                // Extract EmptySD3LatentImage parameters (SD3/Flux workflows)
                else if (nodeType === 'EmptySD3LatentImage' || nodeType === 'SD3LatentImage' || 
                        nodeType === 'Empty SD3 LatentImage' || nodeType.includes('SD3') && nodeType.includes('Latent')) {
                    parameters.foundNodes.emptyLatentImage = true;
                    
                    const inputs = node.inputs || {};
                    console.log(`  🎯 FOUND SD3 NODE: "${nodeType}" with inputs:`, Object.keys(inputs));
                    
                    if (inputs.width !== undefined) {
                        parameters.width = parseInt(inputs.width) || parameters.width;
                        console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                    }
                    if (inputs.height !== undefined) {
                        parameters.height = parseInt(inputs.height) || parameters.height;
                        console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                    }
                    if (inputs.batch_size !== undefined) {
                        parameters.batchSize = parseInt(inputs.batch_size) || parameters.batchSize;
                        console.log(`  📦 Found batch size (${nodeType}): ${parameters.batchSize}`);
                    }
                }
                
                // Extract FluxGGUFLatent and specific Flux dimension parameters
                else if (nodeType === 'FluxGGUFLatent' || nodeType === 'FluxLatent' || nodeType === 'FluxGGUFLatentImage') {
                    parameters.foundNodes.emptyLatentImage = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.width !== undefined) {
                        parameters.width = parseInt(inputs.width) || parameters.width;
                        console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                    }
                    if (inputs.height !== undefined) {
                        parameters.height = parseInt(inputs.height) || parameters.height;
                        console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                    }
                    if (inputs.batch_size !== undefined || inputs.batchSize !== undefined) {
                        const batchValue = inputs.batch_size || inputs.batchSize;
                        parameters.batchSize = parseInt(batchValue) || parameters.batchSize;
                        console.log(`  📦 Found batch size (${nodeType}): ${parameters.batchSize}`);
                    }
                }
                
                // Extract other Flux-specific dimension parameters (fallback)
                else if (nodeType.includes('Flux') && (nodeType.includes('Latent') || nodeType.includes('Image'))) {
                    parameters.foundNodes.emptyLatentImage = true; // Mark as found for compatibility
                    
                    const inputs = node.inputs || {};
                    if (inputs.width !== undefined) {
                        parameters.width = parseInt(inputs.width) || parameters.width;
                        console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                    }
                    if (inputs.height !== undefined) {
                        parameters.height = parseInt(inputs.height) || parameters.height;
                        console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                    }
                    if (inputs.batch_size !== undefined || inputs.batchSize !== undefined) {
                        const batchValue = inputs.batch_size || inputs.batchSize;
                        parameters.batchSize = parseInt(batchValue) || parameters.batchSize;
                        console.log(`  📦 Found batch size (${nodeType}): ${parameters.batchSize}`);
                    }
                }
                
                // Extract VAE dimension parameters
                else if (nodeType.includes('VAE') && (nodeType.includes('Encode') || nodeType.includes('Decode'))) {
                    const inputs = node.inputs || {};
                    // Some VAE nodes have dimension inputs
                    if (inputs.width !== undefined || inputs.height !== undefined) {
                        parameters.foundNodes.emptyLatentImage = true;
                        if (inputs.width !== undefined) {
                            parameters.width = parseInt(inputs.width) || parameters.width;
                            console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                        }
                        if (inputs.height !== undefined) {
                            parameters.height = parseInt(inputs.height) || parameters.height;
                            console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                        }
                    }
                }
                
                // Extract model input dimensions (for various model types)
                else if (nodeType.includes('ModelInput') || nodeType.includes('ImageSize') || nodeType.includes('Resolution')) {
                    const inputs = node.inputs || {};
                    if (inputs.width !== undefined || inputs.height !== undefined) {
                        parameters.foundNodes.emptyLatentImage = true;
                        if (inputs.width !== undefined) {
                            parameters.width = parseInt(inputs.width) || parameters.width;
                            console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                        }
                        if (inputs.height !== undefined) {
                            parameters.height = parseInt(inputs.height) || parameters.height;
                            console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                        }
                    }
                }
                
                // Extract CLIPTextEncode parameters (positive prompt)
                else if (nodeType === 'CLIPTextEncode') {
                    parameters.foundNodes.clipTextEncode = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.text !== undefined && typeof inputs.text === 'string' && inputs.text.trim()) {
                        // Only use the first non-empty prompt we find
                        if (!parameters.positivePrompt) {
                            parameters.positivePrompt = inputs.text.trim();
                            console.log(`  💬 Found positive prompt: "${parameters.positivePrompt.substring(0, 50)}${parameters.positivePrompt.length > 50 ? '...' : '"'}`);
                        }
                    }
                }
                
                // FALLBACK: Check ANY node for dimension parameters
                else {
                    const inputs = node.inputs || {};
                    if ((inputs.width !== undefined || inputs.height !== undefined) && !parameters.foundNodes.emptyLatentImage) {
                        console.log(`  🔍 FALLBACK: Found node "${nodeType}" with dimension inputs:`, Object.keys(inputs));
                        parameters.foundNodes.emptyLatentImage = true;
                        
                        if (inputs.width !== undefined) {
                            parameters.width = parseInt(inputs.width) || parameters.width;
                            console.log(`  📐 Found width (FALLBACK ${nodeType}): ${parameters.width}`);
                        }
                        if (inputs.height !== undefined) {
                            parameters.height = parseInt(inputs.height) || parameters.height;
                            console.log(`  📐 Found height (FALLBACK ${nodeType}): ${parameters.height}`);
                        }
                        if (inputs.batch_size !== undefined) {
                            parameters.batchSize = parseInt(inputs.batch_size) || parameters.batchSize;
                            console.log(`  📦 Found batch size (FALLBACK ${nodeType}): ${parameters.batchSize}`);
                        }
                    }
                }
            });
            
            console.log('🎯 Parameter extraction summary:', {
                steps: parameters.steps,
                cfg: parameters.cfg,
                dimensions: `${parameters.width}x${parameters.height}`,
                batchSize: parameters.batchSize,
                promptLength: parameters.positivePrompt.length,
                foundNodes: parameters.foundNodes
            });
            
            return parameters;
            
        } catch (error) {
            console.error('❌ Error extracting parameters:', error);
            return parameters; // Return defaults on error
        }
    },
    
    // Collect current form data for workflow modification
    collectFormData() {
        console.log('📝 Collecting form data for workflow modification...');
        
        try {
            const formData = {
                steps: parseInt(document.getElementById('steps')?.value) || 20,
                cfg: parseFloat(document.querySelector('[data-linked="cfg"]')?.value) || 7.0,
                width: parseInt(document.querySelector('[data-linked="width"]')?.value) || 512,
                height: parseInt(document.querySelector('[data-linked="height"]')?.value) || 512,
                batchSize: parseInt(document.querySelector('[data-linked="batch-size"]')?.value) || 1,
                positivePrompt: document.getElementById('positive-prompt')?.value?.trim() || ''
            };
            
            console.log('📊 Collected form data:', formData);
            return formData;
        } catch (error) {
            console.error('❌ Error collecting form data:', error);
            return null;
        }
    },
    
    // Modify workflow parameters with form data
    modifyWorkflowParameters(workflowData, formData) {
        console.log('🔧 Modifying workflow parameters...');
        
        if (!workflowData || !formData) {
            console.error('❌ Invalid workflow data or form data');
            return null;
        }
        
        try {
            // Create a deep copy to avoid modifying the original
            const modifiedWorkflow = JSON.parse(JSON.stringify(workflowData));
            
            // Parse workflow nodes (handle both formats)
            let nodes = [];
            let isOldFormat = false;
            
            if (modifiedWorkflow.nodes && Array.isArray(modifiedWorkflow.nodes)) {
                // New format with nodes array
                nodes = modifiedWorkflow.nodes;
                console.log('📋 Using new workflow format for modification');
            } else {
                // Old format with numbered keys
                isOldFormat = true;
                nodes = Object.keys(modifiedWorkflow)
                    .filter(key => !isNaN(key))
                    .map(key => ({ ...modifiedWorkflow[key], nodeId: key }));
                console.log('📋 Using old workflow format for modification');
            }
            
            console.log(`🔧 Modifying ${nodes.length} nodes`);
            
            // Track modifications made
            const modifications = {
                ksampler: 0,
                emptyLatentImage: 0,
                clipTextEncode: 0,
                fluxGuidance: 0
            };
            
            // Modify each node as needed
            nodes.forEach((node, index) => {
                if (!node || typeof node !== 'object') return;
                
                const nodeType = node.class_type || node.type;
                if (!nodeType) return;
                
                const nodeRef = isOldFormat ? modifiedWorkflow[node.nodeId] : node;
                
                // Modify KSampler parameters
                if (nodeType === 'KSampler' || nodeType === 'KSamplerAdvanced') {
                    if (nodeRef.inputs) {
                        if (nodeRef.inputs.steps !== undefined) {
                            const oldSteps = nodeRef.inputs.steps;
                            nodeRef.inputs.steps = formData.steps;
                            console.log(`  ⚙️ Updated KSampler steps: ${oldSteps} → ${formData.steps}`);
                        }
                        if (nodeRef.inputs.cfg !== undefined) {
                            const oldCfg = nodeRef.inputs.cfg;
                            nodeRef.inputs.cfg = formData.cfg;
                            console.log(`  ⚙️ Updated KSampler CFG: ${oldCfg} → ${formData.cfg}`);
                        }
                        modifications.ksampler++;
                    }
                }
                
                // Modify FluxSampler parameters
                else if (nodeType === 'FluxSampler' || nodeType.includes('FluxSample')) {
                    if (nodeRef.inputs) {
                        if (nodeRef.inputs.steps !== undefined || nodeRef.inputs.num_steps !== undefined) {
                            const stepsKey = nodeRef.inputs.steps !== undefined ? 'steps' : 'num_steps';
                            const oldSteps = nodeRef.inputs[stepsKey];
                            nodeRef.inputs[stepsKey] = formData.steps;
                            console.log(`  ⚙️ Updated FluxSampler steps: ${oldSteps} → ${formData.steps}`);
                        }
                        if (nodeRef.inputs.cfg !== undefined || nodeRef.inputs.guidance !== undefined) {
                            const cfgKey = nodeRef.inputs.cfg !== undefined ? 'cfg' : 'guidance';
                            const oldCfg = nodeRef.inputs[cfgKey];
                            nodeRef.inputs[cfgKey] = formData.cfg;
                            console.log(`  ⚙️ Updated FluxSampler CFG: ${oldCfg} → ${formData.cfg}`);
                        }
                        modifications.ksampler++;
                    }
                }
                
                // Modify FluxGuidance parameters
                else if (nodeType === 'FluxGuidanceNode' || nodeType === 'FluxGuidance') {
                    if (nodeRef.inputs) {
                        if (nodeRef.inputs.guidance !== undefined) {
                            const oldGuidance = nodeRef.inputs.guidance;
                            nodeRef.inputs.guidance = formData.cfg;
                            console.log(`  ⚙️ Updated FluxGuidance: ${oldGuidance} → ${formData.cfg}`);
                        }
                        modifications.fluxGuidance++;
                    }
                }
                
                // Modify EmptySD3LatentImage parameters
                else if (nodeType === 'EmptySD3LatentImage' || nodeType === 'EmptyLatentImage') {
                    if (nodeRef.inputs) {
                        if (nodeRef.inputs.width !== undefined) {
                            const oldWidth = nodeRef.inputs.width;
                            nodeRef.inputs.width = formData.width;
                            console.log(`  📐 Updated ${nodeType} width: ${oldWidth} → ${formData.width}`);
                        }
                        if (nodeRef.inputs.height !== undefined) {
                            const oldHeight = nodeRef.inputs.height;
                            nodeRef.inputs.height = formData.height;
                            console.log(`  📐 Updated ${nodeType} height: ${oldHeight} → ${formData.height}`);
                        }
                        if (nodeRef.inputs.batch_size !== undefined) {
                            const oldBatch = nodeRef.inputs.batch_size;
                            nodeRef.inputs.batch_size = formData.batchSize;
                            console.log(`  📦 Updated ${nodeType} batch_size: ${oldBatch} → ${formData.batchSize}`);
                        }
                        modifications.emptyLatentImage++;
                    }
                }
                
                // Modify CLIPTextEncode parameters (only first one)
                else if (nodeType === 'CLIPTextEncode' && modifications.clipTextEncode === 0) {
                    if (nodeRef.inputs && nodeRef.inputs.text !== undefined) {
                        const oldText = nodeRef.inputs.text;
                        nodeRef.inputs.text = formData.positivePrompt;
                        console.log(`  💬 Updated CLIPTextEncode prompt: "${oldText.substring(0, 30)}..." → "${formData.positivePrompt.substring(0, 30)}..."`);
                        modifications.clipTextEncode++;
                    }
                }
            });
            
            console.log('🎯 Workflow modification summary:', modifications);
            
            // Show user feedback about modifications
            const modifiedFields = [];
            if (modifications.ksampler > 0) modifiedFields.push('Sampling Parameters');
            if (modifications.fluxGuidance > 0) modifiedFields.push('Flux Guidance');
            if (modifications.emptyLatentImage > 0) modifiedFields.push('Image Dimensions');
            if (modifications.clipTextEncode > 0) modifiedFields.push('Prompt');
            
            if (modifiedFields.length > 0) {
                Utils.showToast(`Modified: ${modifiedFields.join(', ')}`, 'success');
            } else {
                Utils.showToast('No parameters were modified', 'info');
            }
            
            return modifiedWorkflow;
            
        } catch (error) {
            console.error('❌ Error modifying workflow:', error);
            Utils.showToast('Failed to modify workflow parameters', 'error');
            return null;
        }
    },

    // Populate form fields with extracted parameters
    populateFormParameters(parameters) {
        console.log('📝 Populating form with extracted parameters...');
        
        try {
            // Update steps
            const stepsSlider = document.getElementById('steps');
            const stepsInput = document.querySelector('[data-linked="steps"]');
            if (stepsSlider && stepsInput) {
                stepsSlider.value = parameters.steps;
                stepsInput.value = parameters.steps;
                console.log(`✅ Set steps to: ${parameters.steps}`);
            }
            
            // Update CFG
            const cfgSlider = document.getElementById('cfg');
            const cfgInput = document.querySelector('[data-linked="cfg"]');
            if (cfgSlider && cfgInput) {
                cfgSlider.value = parameters.cfg;
                cfgInput.value = parameters.cfg;
                console.log(`✅ Set CFG to: ${parameters.cfg}`);
            }
            
            // Update width
            const widthSlider = document.getElementById('width');
            const widthInput = document.querySelector('[data-linked="width"]');
            if (widthSlider && widthInput) {
                widthSlider.value = parameters.width;
                widthInput.value = parameters.width;
                console.log(`✅ Set width to: ${parameters.width}`);
            }
            
            // Update height
            const heightSlider = document.getElementById('height');
            const heightInput = document.querySelector('[data-linked="height"]');
            if (heightSlider && heightInput) {
                heightSlider.value = parameters.height;
                heightInput.value = parameters.height;
                console.log(`✅ Set height to: ${parameters.height}`);
            }
            
            // Update batch size
            const batchSlider = document.getElementById('batch-size');
            const batchInput = document.querySelector('[data-linked="batch-size"]');
            if (batchSlider && batchInput) {
                batchSlider.value = parameters.batchSize;
                batchInput.value = parameters.batchSize;
                console.log(`✅ Set batch size to: ${parameters.batchSize}`);
            }
            
            // Update positive prompt
            const promptTextarea = document.getElementById('positive-prompt');
            if (promptTextarea && parameters.positivePrompt) {
                promptTextarea.value = parameters.positivePrompt;
                console.log(`✅ Set positive prompt (${parameters.positivePrompt.length} characters)`);
            }
            
            // Show user feedback about what was populated
            const populatedFields = [];
            const controllableFields = [];
            
            if (parameters.foundNodes.ksampler) {
                populatedFields.push('Steps & CFG');
                controllableFields.push('Steps & CFG');
            }
            if (parameters.foundNodes.emptyLatentImage) {
                populatedFields.push('Dimensions & Batch Size');
                controllableFields.push('Dimensions & Batch Size');
            }
            if (parameters.foundNodes.clipTextEncode && parameters.positivePrompt) {
                populatedFields.push('Positive Prompt');
                controllableFields.push('Positive Prompt');
            }
            
            if (populatedFields.length > 0) {
                Utils.showToast(`Auto-populated: ${populatedFields.join(', ')}`, 'success');
                
                // Additional info about controllability
                setTimeout(() => {
                    if (controllableFields.length < 3) {
                        const uncontrollable = [];
                        if (!parameters.foundNodes.ksampler) uncontrollable.push('Steps/CFG');
                        if (!parameters.foundNodes.emptyLatentImage) uncontrollable.push('Dimensions');
                        if (!parameters.foundNodes.clipTextEncode) uncontrollable.push('Prompt');
                        
                        if (uncontrollable.length > 0) {
                            Utils.showToast(`Note: ${uncontrollable.join(', ')} may not be controllable in this workflow`, 'info');
                        }
                    } else {
                        Utils.showToast('All parameters are controllable in this workflow! 🎉', 'success');
                    }
                }, 1500);
            } else {
                Utils.showToast('No parameters found to auto-populate - workflow may use custom node types', 'info');
            }
            
        } catch (error) {
            console.error('❌ Error populating form:', error);
            Utils.showToast('Failed to auto-populate form fields', 'error');
        }
    },

    // Test WebSocket connection as fallback
    async testWebSocketConnection(url) {
        return new Promise((resolve, reject) => {
            const wsUrl = url.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
            console.log(`🔌 Testing WebSocket connection: ${wsUrl}`);
            
            const ws = new WebSocket(wsUrl);
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket connection timeout'));
            }, 5000);
            
            ws.onopen = () => {
                console.log('✅ WebSocket connection successful');
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            };
            
            ws.onerror = (error) => {
                console.log('❌ WebSocket connection failed:', error);
                clearTimeout(timeout);
                reject(new Error('WebSocket connection failed'));
            };
            
            ws.onclose = (event) => {
                if (event.wasClean) {
                    console.log('WebSocket closed cleanly');
                } else {
                    console.log('WebSocket connection lost');
                }
            };
        });
    }
};

// Form Validation
const Validation = {
    validateSteps(value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 150) {
            return { valid: false, message: 'Steps must be between 1 and 150' };
        }
        return { valid: true };
    },

    validateCFG(value) {
        const num = parseFloat(value);
        if (isNaN(num) || num < 1 || num > 30) {
            return { valid: false, message: 'CFG must be between 1 and 30' };
        }
        return { valid: true };
    },

    validateDimensions(value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 64 || num > 2048 || num % 8 !== 0) {
            return { valid: false, message: 'Dimensions must be 64-2048 in increments of 8' };
        }
        return { valid: true };
    },

    validateBatchSize(value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 10) {
            return { valid: false, message: 'Batch size must be between 1 and 10' };
        }
        return { valid: true };
    }
};

// Slider Synchronization
function initializeSliders() {
    const sliders = document.querySelectorAll('.slider');
    
    sliders.forEach(slider => {
        const linkedInput = document.querySelector(`[data-linked="${slider.id}"]`);
        
        if (linkedInput) {
            // Sync slider to input
            slider.addEventListener('input', () => {
                linkedInput.value = slider.value;
            });
            
            // Sync input to slider
            linkedInput.addEventListener('input', () => {
                const value = parseFloat(linkedInput.value);
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                
                if (value >= min && value <= max) {
                    slider.value = value;
                }
            });
            
            // Validate on blur
            linkedInput.addEventListener('blur', () => {
                const value = linkedInput.value;
                let validation;
                
                switch (slider.id) {
                    case 'steps':
                        validation = Validation.validateSteps(value);
                        break;
                    case 'cfg':
                        validation = Validation.validateCFG(value);
                        break;
                    case 'width':
                    case 'height':
                        validation = Validation.validateDimensions(value);
                        break;
                    case 'batch-size':
                        validation = Validation.validateBatchSize(value);
                        break;
                    default:
                        validation = { valid: true };
                }
                
                const controlGroup = linkedInput.closest('.control-group');
                const existingError = controlGroup.querySelector('.error-message');
                
                if (existingError) {
                    existingError.remove();
                }
                
                if (!validation.valid) {
                    controlGroup.classList.add('error');
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = validation.message;
                    controlGroup.appendChild(errorMsg);
                } else {
                    controlGroup.classList.remove('error');
                }
            });
        }
    });
}

// File Upload Handling
function initializeFileUpload() {
    console.log('🔧 Initializing file upload...');
    
    const fileInput = elements.fileUpload;
    const uploadArea = elements.fileUploadArea;
    
    // Check if DOM elements exist
    if (!fileInput) {
        console.error('❌ File input element not found (id: workflow-file)');
        Utils.showToast('File upload initialization failed - missing file input', 'error');
        return;
    }
    
    if (!uploadArea) {
        console.error('❌ Upload area element not found (id: file-upload-area)');
        Utils.showToast('File upload initialization failed - missing upload area', 'error');
        return;
    }
    
    console.log('✅ File upload DOM elements found');
    
    try {
        // Click to upload
        uploadArea.addEventListener('click', () => {
            console.log('📁 Upload area clicked, triggering file input');
            fileInput.click();
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            console.log('📂 File dragged over upload area');
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            console.log('📂 File dragged away from upload area');
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            console.log(`📂 Files dropped: ${files.length} file(s)`);
            if (files.length > 0) {
                console.log(`📂 Processing dropped file: ${files[0].name}`);
                handleFileUpload(files[0]);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            console.log(`📁 File input changed: ${e.target.files.length} file(s)`);
            if (e.target.files.length > 0) {
                console.log(`📁 Processing selected file: ${e.target.files[0].name}`);
                handleFileUpload(e.target.files[0]);
            }
        });
        
        console.log('✅ File upload event listeners attached successfully');
    } catch (error) {
        console.error('❌ Error setting up file upload event listeners:', error);
        Utils.showToast('File upload initialization failed', 'error');
    }
}

// Handle file upload
function handleFileUpload(file) {
    console.log('📄 handleFileUpload called with file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
    });
    
    const status = elements.uploadStatus;
    
    // Check if status element exists
    if (!status) {
        console.error('❌ Upload status element not found (id: upload-status)');
        Utils.showToast('Upload failed - status display not found', 'error');
        return;
    }
    
    // Validate file type
    console.log(`🔍 Validating file type for: ${file.name}`);
    if (!file.name.toLowerCase().endsWith('.json')) {
        console.log('❌ File validation failed: not a JSON file');
        status.textContent = 'Please select a JSON file';
        status.className = 'upload-status error';
        Utils.showToast('Only JSON files are supported', 'error');
        return;
    }
    
    // Validate file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    console.log(`🔍 Validating file size: ${file.size} bytes (max: ${maxSize})`);
    if (file.size > maxSize) {
        console.log('❌ File validation failed: too large');
        status.textContent = 'File too large (max 10MB)';
        status.className = 'upload-status error';
        Utils.showToast('File size exceeds 10MB limit', 'error');
        return;
    }
    
    // Show detailed loading status
    const loadingMessage = `Loading ${file.name} (${Utils.formatFileSize(file.size)})...`;
    console.log(`⏳ ${loadingMessage}`);
    status.textContent = loadingMessage;
    status.className = 'upload-status';
    
    // Read file
    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log('📖 File read completed, processing content...');
        try {
            const jsonText = e.target.result;
            console.log(`📝 File content length: ${jsonText.length} characters`);
            
            // Basic JSON validation
            console.log('🔍 Validating JSON syntax...');
            if (!Utils.isValidJSON(jsonText)) {
                throw new Error('Invalid JSON format - check for syntax errors');
            }
            console.log('✅ JSON syntax is valid');
            
            const workflowData = JSON.parse(jsonText);
            console.log('📊 Parsed JSON data:', Object.keys(workflowData));
            
            // ComfyUI workflow validation
            console.log('🔍 Validating ComfyUI workflow structure...');
            const validation = Utils.validateComfyUIWorkflow(workflowData);
            console.log('📊 Validation result:', validation);
            
            if (!validation.isValid) {
                const errorMessage = validation.errors.join(', ');
                throw new Error(`Invalid ComfyUI workflow: ${errorMessage}`);
            }
            
            // Store workflow data
            AppState.workflowData = workflowData;
            console.log('💾 Workflow data stored in AppState');
            
            // Build detailed success message
            let successMessage = `✓ ${file.name} loaded successfully`;
            if (validation.nodeCount > 0) {
                successMessage += ` (${validation.nodeCount} nodes)`;
            }
            
            status.textContent = successMessage;
            status.className = 'upload-status success';
            console.log(`✅ ${successMessage}`);
            
            // Show success toast with node information
            const nodeInfo = [];
            if (validation.foundNodes.ksampler) nodeInfo.push('KSampler');
            if (validation.foundNodes.emptyLatentImage) nodeInfo.push('EmptyLatentImage');
            if (validation.foundNodes.clipTextEncode) nodeInfo.push('CLIPTextEncode');
            
            const toastMessage = nodeInfo.length > 0 
                ? `Workflow loaded with ${nodeInfo.join(', ')} nodes`
                : 'Workflow loaded successfully';
            
            Utils.showToast(toastMessage, 'success');
            console.log(`🎉 ${toastMessage}`);
            
            // Show warnings if any
            if (validation.warnings.length > 0) {
                console.log('⚠️ Validation warnings:', validation.warnings);
                setTimeout(() => {
                    validation.warnings.forEach(warning => {
                        Utils.showToast(`⚠️ ${warning}`, 'info');
                    });
                }, 1000);
            }
            
            // Extract and populate parameters from workflow
            console.log('🔄 Starting parameter extraction...');
            const extractedParams = Utils.extractWorkflowParameters(workflowData);
            Utils.populateFormParameters(extractedParams);
            console.log('✅ Parameter extraction and population completed');
            
        } catch (error) {
            console.error('❌ File upload error:', error);
            
            let errorMessage = error.message;
            
            // Provide specific error guidance
            if (errorMessage.includes('JSON')) {
                errorMessage += '. Please check your JSON syntax using a validator.';
            } else if (errorMessage.includes('ComfyUI workflow')) {
                errorMessage += '. Please ensure this is a valid ComfyUI workflow export.';
            }
            
            status.textContent = `Error: ${errorMessage}`;
            status.className = 'upload-status error';
            Utils.showToast('Failed to load workflow file', 'error');
            
            // Clear invalid data
            AppState.workflowData = null;
        }
    };
    
    reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        status.textContent = 'Error reading file';
        status.className = 'upload-status error';
        Utils.showToast('File could not be read', 'error');
        AppState.workflowData = null;
    };
    
    console.log('📖 Starting file read...');
    reader.readAsText(file);
}

// Connection Testing
function initializeConnectionTest() {
    elements.testConnection.addEventListener('click', async () => {
        const url = elements.apiUrl.value.trim();
        const indicator = elements.connectionStatus.querySelector('.status-indicator');
        const statusText = elements.connectionStatus.querySelector('.status-text');
        
        // Validate URL format
        if (!url) {
            Utils.showToast('Please enter an API URL', 'error');
            return;
        }
        
        // Ensure URL has protocol
        let testUrl = url;
        if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
            testUrl = 'http://' + testUrl;
            elements.apiUrl.value = testUrl; // Update the input field
        }
        
        // Update UI
        elements.testConnection.textContent = 'Testing...';
        elements.testConnection.disabled = true;
        statusText.textContent = 'Testing connection...';
        indicator.dataset.status = 'unknown';
        
        console.log(`Testing connection to: ${testUrl}`);
        
        try {
            // Test official ComfyUI endpoints in order of reliability
            const endpoints = [
                { path: '/history', name: 'History API' },
                { path: '/queue', name: 'Queue API' },
                { path: '/prompt', name: 'Prompt API' }
            ];
            
            let response = null;
            let lastError = null;
            let successfulEndpoint = null;
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`Testing ComfyUI ${endpoint.name}: ${testUrl}${endpoint.path}`);
                    
                    response = await fetch(`${testUrl}${endpoint.path}`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(5000), // 5 second timeout
                        mode: 'cors',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    console.log(`${endpoint.name} response:`, response.status, response.statusText);
                    
                    if (response.ok) {
                        successfulEndpoint = endpoint;
                        console.log(`✅ Success with ${endpoint.name}`);
                        break;
                    } else if (response.status === 405) {
                        // Method not allowed - endpoint exists but wrong method
                        console.log(`${endpoint.name} exists but method not allowed`);
                        successfulEndpoint = endpoint;
                        break;
                    }
                } catch (endpointError) {
                    console.log(`❌ ${endpoint.name} failed:`, endpointError.message);
                    lastError = endpointError;
                    
                    // Check if it's a CORS error
                    if (endpointError.message.includes('CORS') || 
                        endpointError.message.includes('NetworkError') ||
                        endpointError.name === 'TypeError') {
                        // This might be CORS blocking
                        console.log('Possible CORS issue detected');
                        lastError.possibleCors = true;
                    }
                }
            }
            
            if (response && (response.ok || response.status === 405) && successfulEndpoint) {
                // Verify it's ComfyUI by checking response structure
                let isComfyUI = false;
                try {
                    if (response.ok) {
                        const data = await response.json();
                        console.log('ComfyUI response data:', data);
                        
                        // Check if response looks like ComfyUI
                        if (successfulEndpoint.path === '/history' && 
                            (typeof data === 'object' || Array.isArray(data))) {
                            isComfyUI = true;
                        } else if (successfulEndpoint.path === '/queue' && 
                                 data && (data.queue_running !== undefined || data.queue_pending !== undefined)) {
                            isComfyUI = true;
                        } else {
                            isComfyUI = true; // Assume it's ComfyUI if we get any JSON response
                        }
                    } else {
                        // 405 Method Not Allowed means endpoint exists
                        isComfyUI = true;
                    }
                } catch (jsonError) {
                    console.log('Response not JSON, but endpoint responded');
                    isComfyUI = true; // Endpoint responded, likely ComfyUI
                }
                
                if (isComfyUI) {
                    AppState.isConnected = true;
                    AppState.apiEndpoint = testUrl;
                    localStorage.setItem('comfyui_endpoint', testUrl);
                    
                    indicator.dataset.status = 'connected';
                    statusText.textContent = 'Connected to ComfyUI';
                    Utils.showToast(`Connected to ComfyUI via ${successfulEndpoint.name}`, 'success');
                    console.log('✅ ComfyUI connection verified!');
                } else {
                    throw new Error('Server responded but does not appear to be ComfyUI');
                }
            } else {
                // Try WebSocket as fallback
                console.log('🔄 HTTP endpoints failed, trying WebSocket fallback...');
                statusText.textContent = 'Trying WebSocket...';
                
                try {
                    await Utils.testWebSocketConnection(testUrl);
                    
                    AppState.isConnected = true;
                    AppState.apiEndpoint = testUrl;
                    localStorage.setItem('comfyui_endpoint', testUrl);
                    
                    indicator.dataset.status = 'connected';
                    statusText.textContent = 'Connected via WebSocket';
                    Utils.showToast('Connected to ComfyUI via WebSocket (CORS may be blocking HTTP)', 'success');
                    console.log('✅ ComfyUI WebSocket connection successful!');
                } catch (wsError) {
                    console.log('❌ WebSocket also failed:', wsError.message);
                    throw lastError || new Error(`All connection methods failed`);
                }
            }
        } catch (error) {
            console.error('Connection failed:', error);
            AppState.isConnected = false;
            indicator.dataset.status = 'disconnected';
            
            // Provide detailed error messages with solutions
            let errorMessage = 'Connection failed';
            let detailedMessage = error.message;
            let solution = '';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Connection timeout';
                detailedMessage = 'Request timed out after 5 seconds';
                solution = 'Check if ComfyUI is running and accessible';
            } else if (error.possibleCors || 
                       error.message.includes('CORS') ||
                       error.message.includes('NetworkError') ||
                       error.name === 'TypeError') {
                errorMessage = '🚫 CORS Issue Detected';
                detailedMessage = 'Cross-origin request blocked by browser';
                solution = `To fix this:\n1. Restart ComfyUI with: python main.py --enable-cors-header\n2. Or add --cors-enable flag to your ComfyUI startup command`;
                
                // Show detailed CORS help
                setTimeout(() => {
                    Utils.showToast('💡 CORS Solution: Restart ComfyUI with --enable-cors-header flag', 'info');
                }, 2000);
            } else if (error.message.includes('Failed to fetch') || 
                      error.message.includes('ERR_CONNECTION_REFUSED')) {
                errorMessage = 'Cannot reach ComfyUI';
                detailedMessage = 'Server is not responding';
                solution = `Check:\n1. ComfyUI is running at ${testUrl}\n2. IP address and port are correct\n3. No firewall blocking the connection`;
            } else if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                errorMessage = 'Invalid address';
                detailedMessage = 'Cannot resolve hostname';
                solution = 'Verify the IP address is correct';
            }
            
            statusText.textContent = errorMessage;
            
            // Show comprehensive error message
            if (solution) {
                Utils.showToast(`${errorMessage}: ${detailedMessage}\n\n${solution}`, 'error');
            } else {
                Utils.showToast(`${errorMessage}: ${detailedMessage}`, 'error');
            }
            
            // Log detailed error for debugging
            console.log('🔍 Connection Error Details:', {
                name: error.name,
                message: error.message,
                possibleCors: error.possibleCors,
                url: testUrl,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
            
            // Additional CORS debugging
            if (error.possibleCors) {
                console.log('🛠️ CORS Troubleshooting:');
                console.log('1. ComfyUI Command: python main.py --enable-cors-header');
                console.log('2. Alternative: python main.py --cors-enable');
                console.log('3. Check ComfyUI startup logs for CORS headers');
            }
        } finally {
            elements.testConnection.textContent = 'Test';
            elements.testConnection.disabled = false;
        }
    });
    
    // Auto-save endpoint on change
    elements.apiUrl.addEventListener('blur', () => {
        const url = elements.apiUrl.value.trim();
        if (url && url !== AppState.apiEndpoint) {
            localStorage.setItem('comfyui_endpoint', url);
        }
    });
}

// Form Submission
function initializeFormSubmission() {
    elements.workflowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!AppState.workflowData) {
            Utils.showToast('Please upload a workflow file first', 'error');
            return;
        }
        
        if (!AppState.isConnected) {
            Utils.showToast('Please test API connection first', 'error');
            return;
        }
        
        // Collect current form data
        const formData = Utils.collectFormData();
        if (!formData) {
            Utils.showToast('Failed to collect form data', 'error');
            return;
        }
        
        // Modify workflow with current form values
        console.log('🔄 Starting workflow modification...');
        const modifiedWorkflow = Utils.modifyWorkflowParameters(AppState.workflowData, formData);
        
        if (!modifiedWorkflow) {
            Utils.showToast('Failed to modify workflow parameters', 'error');
            return;
        }
        
        // Store modified workflow for API submission
        AppState.modifiedWorkflowData = modifiedWorkflow;
        
        console.log('✅ Workflow modification completed successfully');
        
        // TODO: Implement API submission (Task 6)
        Utils.showToast('Workflow modified successfully! API submission will be implemented in Task 6.', 'success');
    });
}

// Clear Results
function initializeClearResults() {
    elements.clearResults.addEventListener('click', () => {
        elements.resultsArea.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor" d="M21,17H7V3A1,1 0 0,1 8,2H20A1,1 0 0,1 21,3V17M19,19H5V5H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19H19M11,6H18V8H11V6M11,10H18V12H11V10M11,14H18V16H11V14Z" />
                </svg>
                <p class="empty-text">Upload a workflow and click Generate to see results here</p>
            </div>
        `;
        elements.clearResults.disabled = true;
        Utils.showToast('Results cleared', 'success');
    });
}

// Prompt Toolbar
function initializePromptToolbar() {
    const clearButton = document.querySelector('.prompt-toolbar .icon-button');
    const promptTextarea = document.getElementById('positive-prompt');
    
    clearButton.addEventListener('click', () => {
        promptTextarea.value = '';
        promptTextarea.focus();
    });
}

// Initialize Application
function initializeApp() {
    console.log('🚀 Initializing ComfyUI JSON Workflow Runner...');
    
    try {
        // Check if critical DOM elements exist
        const criticalElements = [
            { key: 'apiUrl', id: 'api-url' },
            { key: 'fileUpload', id: 'workflow-file' },
            { key: 'fileUploadArea', id: 'file-upload-area' },
            { key: 'uploadStatus', id: 'upload-status' },
            { key: 'toastContainer', id: 'toast-container' }
        ];
        
        let missingElements = [];
        criticalElements.forEach(element => {
            if (!elements[element.key]) {
                missingElements.push(element.id);
                console.error(`❌ Missing critical element: ${element.key} (id: ${element.id})`);
            } else {
                console.log(`✅ Found element: ${element.key}`);
            }
        });
        
        if (missingElements.length > 0) {
            const errorMsg = `Missing DOM elements: ${missingElements.join(', ')}`;
            console.error('❌ Critical initialization error:', errorMsg);
            alert(`Application initialization failed: ${errorMsg}`);
            return;
        }
        
        // Set initial API URL
        if (elements.apiUrl) {
            elements.apiUrl.value = AppState.apiEndpoint;
            console.log(`🔧 Set API URL to: ${AppState.apiEndpoint}`);
        }
        
        // Initialize all components
        console.log('🔧 Initializing components...');
        initializeSliders();
        initializeFileUpload();
        initializeConnectionTest();
        initializeFormSubmission();
        initializeClearResults();
        initializePromptToolbar();
        
        // Show welcome message
        Utils.showToast('ComfyUI Workflow Runner initialized', 'success');
        
        console.log('✅ Application ready!');
        console.log('📋 Debug: Try uploading a file and check console for detailed logs');
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        alert(`Application failed to initialize: ${error.message}`);
    }
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}