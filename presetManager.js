/**
 * Workflow Preset Management System
 * Handles saving, loading, and managing ComfyUI workflow presets in localStorage
 */

// Simple compression fallback - just use base64 encoding for now
var LZString = {
    compressToBase64: function(string) {
        if (string == null) return "";
        try {
            return btoa(string);
        } catch (e) {
            console.error('Base64 encoding failed:', e);
            return null;
        }
    },
    decompressFromBase64: function(string) {
        if (string == null) return "";
        if (string == "") return null;
        try {
            return atob(string);
        } catch (e) {
            console.error('Base64 decoding failed:', e);
            return null;
        }
    }
};

/**
 * Preset Storage Service
 * Manages workflow presets in localStorage with compression
 */
class PresetStorageService {
    constructor() {
        this.PRESET_PREFIX = 'comfyui_preset_';
        this.METADATA_KEY = 'comfyui_preset_metadata';
        this.LAST_WORKFLOW_KEY = 'comfyui_last_workflow_id';
        this.STORAGE_WARNING_THRESHOLD = 0.8; // Warn at 80% capacity
        this.MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB typical localStorage limit
        
        // Initialize metadata if not exists
        if (!this.getMetadata()) {
            this.setMetadata([]);
        }
    }

    /**
     * Generate unique ID for preset
     * @returns {string} Unique timestamp-based ID
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Compress workflow data
     * @param {Object} workflowData - The workflow JSON object
     * @returns {string} Compressed base64 string
     */
    compress(workflowData) {
        try {
            if (!workflowData) {
                throw new Error('No workflow data provided');
            }
            
            // Ensure we have a clean object
            let cleanData = workflowData;
            if (typeof workflowData === 'string') {
                try {
                    cleanData = JSON.parse(workflowData);
                } catch (e) {
                    throw new Error('Invalid JSON string provided');
                }
            }
            
            const jsonString = JSON.stringify(cleanData);
            if (!jsonString || jsonString === 'null' || jsonString === 'undefined') {
                throw new Error('Failed to serialize workflow data to JSON');
            }
            
            const compressed = LZString.compressToBase64(jsonString);
            if (!compressed) {
                throw new Error('Compression failed');
            }
            
            return compressed;
        } catch (error) {
            console.error('Compression error:', error);
            console.error('Data type:', typeof workflowData);
            console.error('Data sample:', workflowData);
            throw new Error(`Failed to compress workflow data: ${error.message}`);
        }
    }

    /**
     * Decompress workflow data
     * @param {string} compressedData - Compressed base64 string
     * @returns {Object} The workflow JSON object
     */
    decompress(compressedData) {
        try {
            if (!compressedData) {
                throw new Error('No compressed data provided');
            }
            
            const jsonString = LZString.decompressFromBase64(compressedData);
            
            if (!jsonString) {
                throw new Error('Decompression resulted in empty data');
            }
            
            const result = JSON.parse(jsonString);
            if (!result || typeof result !== 'object') {
                throw new Error('Decompressed data is not a valid object');
            }
            return result;
        } catch (error) {
            console.error('Decompression error:', error);
            throw new Error(`Failed to decompress workflow data: ${error.message}`);
        }
    }

    /**
     * Get all preset metadata
     * @returns {Array} Array of preset metadata objects
     */
    getMetadata() {
        try {
            const metadata = localStorage.getItem(this.METADATA_KEY);
            const result = metadata ? JSON.parse(metadata) : [];
            console.log(`📊 Found ${result.length} presets in metadata`);
            return result;
        } catch (error) {
            console.error('Error reading metadata:', error);
            console.error('Raw metadata:', localStorage.getItem(this.METADATA_KEY));
            return [];
        }
    }

    /**
     * Set preset metadata
     * @param {Array} metadata - Array of preset metadata objects
     */
    setMetadata(metadata) {
        try {
            localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
        } catch (error) {
            console.error('Error saving metadata:', error);
            throw new Error('Failed to save preset metadata');
        }
    }

    /**
     * Calculate current storage usage
     * @returns {Object} Storage usage information
     */
    getStorageUsage() {
        let totalSize = 0;
        const presetSizes = {};
        
        // Calculate size of all presets
        for (let key in localStorage) {
            if (key.startsWith(this.PRESET_PREFIX) || key === this.METADATA_KEY) {
                const size = localStorage.getItem(key).length;
                totalSize += size;
                if (key.startsWith(this.PRESET_PREFIX)) {
                    const id = key.replace(this.PRESET_PREFIX, '');
                    presetSizes[id] = size;
                }
            }
        }
        
        const percentage = (totalSize / this.MAX_STORAGE_SIZE) * 100;
        const isWarning = percentage >= (this.STORAGE_WARNING_THRESHOLD * 100);
        
        return {
            totalSize,
            totalSizeKB: Math.round(totalSize / 1024),
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            percentage: Math.round(percentage),
            isWarning,
            remaining: this.MAX_STORAGE_SIZE - totalSize,
            remainingKB: Math.round((this.MAX_STORAGE_SIZE - totalSize) / 1024),
            presetSizes
        };
    }

    /**
     * Save a workflow preset
     * @param {string} name - Preset name
     * @param {Object} workflowData - The workflow JSON data
     * @returns {Object} Saved preset metadata
     */
    savePreset(name, workflowData) {
        const id = this.generateId();
        const timestamp = new Date().toISOString();
        
        // Create preset metadata
        const presetMetadata = {
            id,
            name,
            createdAt: timestamp,
            lastUsedAt: timestamp,
            size: 0 // Will be updated after compression
        };
        
        try {
            // Compress and save workflow data
            const compressed = this.compress(workflowData);
            const key = this.PRESET_PREFIX + id;
            
            // Check if we have enough space
            const testSize = compressed.length;
            const usage = this.getStorageUsage();
            if (usage.totalSize + testSize > this.MAX_STORAGE_SIZE) {
                throw new Error('Storage quota exceeded. Please delete some presets.');
            }
            
            localStorage.setItem(key, compressed);
            presetMetadata.size = compressed.length;
            
            // Verify data was saved
            const savedData = localStorage.getItem(key);
            if (!savedData) {
                throw new Error('Failed to save preset data to localStorage');
            }
            
            // Update metadata
            const metadata = this.getMetadata();
            metadata.push(presetMetadata);
            this.setMetadata(metadata);
            
            // Verify metadata was saved
            const savedMetadata = this.getMetadata();
            const found = savedMetadata.find(p => p.id === id);
            if (!found) {
                throw new Error('Failed to save preset metadata');
            }
            
            // Set as last used
            this.setLastUsedWorkflow(id);
            
            console.log('✅ Preset saved successfully:', name, `(${Math.round(compressed.length / 1024)}KB)`);
            console.log('📋 Preset ID:', id);
            console.log('📋 Total presets now:', savedMetadata.length);
            return presetMetadata;
            
        } catch (error) {
            // Clean up if save failed
            try {
                localStorage.removeItem(this.PRESET_PREFIX + id);
            } catch (e) {}
            
            console.error('Error saving preset:', error);
            throw error;
        }
    }

    /**
     * Load a workflow preset
     * @param {string} id - Preset ID
     * @returns {Object} Object containing preset metadata and workflow data
     */
    loadPreset(id) {
        console.log('🔄 Loading preset:', id);
        
        try {
            const key = this.PRESET_PREFIX + id;
            const compressed = localStorage.getItem(key);
            
            if (!compressed) {
                console.error('❌ Preset data not found in localStorage for key:', key);
                throw new Error(`Preset data not found for ID: ${id}`);
            }
            
            console.log('📋 Found compressed data, size:', compressed.length);
            
            const workflowData = this.decompress(compressed);
            console.log('📋 Decompressed workflow data successfully');
            
            // Update last used timestamp
            const metadata = this.getMetadata();
            const presetIndex = metadata.findIndex(p => p.id === id);
            if (presetIndex === -1) {
                console.error('❌ Preset metadata not found for ID:', id);
                throw new Error(`Preset metadata not found for ID: ${id}`);
            }
            
            metadata[presetIndex].lastUsedAt = new Date().toISOString();
            this.setMetadata(metadata);
            
            // Set as last used
            this.setLastUsedWorkflow(id);
            
            console.log('✅ Preset loaded successfully:', metadata[presetIndex].name);
            
            return {
                metadata: metadata[presetIndex],
                workflowData
            };
            
        } catch (error) {
            console.error('❌ Error loading preset:', error);
            throw error;
        }
    }

    /**
     * Delete a workflow preset
     * @param {string} id - Preset ID
     * @returns {boolean} Success status
     */
    deletePreset(id) {
        try {
            // Remove from localStorage
            const key = this.PRESET_PREFIX + id;
            localStorage.removeItem(key);
            
            // Update metadata
            const metadata = this.getMetadata();
            const filteredMetadata = metadata.filter(p => p.id !== id);
            this.setMetadata(filteredMetadata);
            
            // Clear last used if it was this preset
            if (this.getLastUsedWorkflowId() === id) {
                localStorage.removeItem(this.LAST_WORKFLOW_KEY);
            }
            
            console.log('✅ Preset deleted:', id);
            return true;
            
        } catch (error) {
            console.error('Error deleting preset:', error);
            return false;
        }
    }

    /**
     * Set last used workflow ID
     * @param {string} id - Preset ID
     */
    setLastUsedWorkflow(id) {
        try {
            localStorage.setItem(this.LAST_WORKFLOW_KEY, id);
        } catch (error) {
            console.error('Error setting last used workflow:', error);
            // Non-critical error, don't throw
        }
    }

    /**
     * Get last used workflow ID
     * @returns {string|null} Last used preset ID
     */
    getLastUsedWorkflowId() {
        return localStorage.getItem(this.LAST_WORKFLOW_KEY);
    }

    /**
     * Export all presets as JSON
     * @returns {Object} All presets data
     */
    exportAllPresets() {
        const metadata = this.getMetadata();
        const presets = {};
        
        metadata.forEach(preset => {
            try {
                const { workflowData } = this.loadPreset(preset.id);
                presets[preset.id] = {
                    metadata: preset,
                    workflowData
                };
            } catch (error) {
                console.error(`Error exporting preset ${preset.id}:`, error);
            }
        });
        
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            presets
        };
    }

    /**
     * Import presets from JSON
     * @param {Object} exportData - Exported presets data
     * @param {boolean} overwrite - Whether to overwrite existing presets
     * @returns {Object} Import results
     */
    importPresets(exportData, overwrite = false) {
        const results = {
            imported: 0,
            skipped: 0,
            errors: 0
        };
        
        if (!exportData || !exportData.presets) {
            throw new Error('Invalid import data format');
        }
        
        const existingMetadata = this.getMetadata();
        const existingNames = new Set(existingMetadata.map(p => p.name));
        
        for (const [id, presetData] of Object.entries(exportData.presets)) {
            try {
                const { metadata, workflowData } = presetData;
                
                // Check for duplicates
                if (!overwrite && existingNames.has(metadata.name)) {
                    results.skipped++;
                    continue;
                }
                
                // Save preset with new ID
                this.savePreset(metadata.name, workflowData);
                results.imported++;
                
            } catch (error) {
                console.error(`Error importing preset:`, error);
                results.errors++;
            }
        }
        
        return results;
    }

    /**
     * Get storage cleanup suggestions
     * @returns {Array} Array of preset IDs to consider for cleanup
     */
    getCleanupSuggestions() {
        const metadata = this.getMetadata();
        const usage = this.getStorageUsage();
        
        if (!usage.isWarning) {
            return [];
        }
        
        // Sort by last used date (oldest first)
        const sorted = [...metadata].sort((a, b) => 
            new Date(a.lastUsedAt) - new Date(b.lastUsedAt)
        );
        
        // Suggest oldest 20% of presets for cleanup
        const suggestCount = Math.ceil(sorted.length * 0.2);
        return sorted.slice(0, suggestCount).map(p => p.id);
    }
}

// Create global instance
window.presetStorage = new PresetStorageService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PresetStorageService;
}