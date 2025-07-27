// ============================================================================
// ComfyUI React - Dimension Presets Constants
// ============================================================================

export interface DimensionPreset {
  label: string
  width: number
  height: number
  description: string
  category: 'square' | 'portrait' | 'landscape' | 'wide' | 'ultra-wide'
  aspectRatio: string
  vramUsage: 'low' | 'medium' | 'high' | 'very-high'
}

// Common dimension presets
export const DIMENSION_PRESETS: DimensionPreset[] = [
  // Square formats
  {
    label: '512²',
    width: 512,
    height: 512,
    description: 'Classic SD 1.5 square format',
    category: 'square',
    aspectRatio: '1:1',
    vramUsage: 'low'
  },
  {
    label: '768²',
    width: 768,
    height: 768,
    description: 'Medium resolution square',
    category: 'square',
    aspectRatio: '1:1',
    vramUsage: 'medium'
  },
  {
    label: '1024²',
    width: 1024,
    height: 1024,
    description: 'High resolution square (SDXL native)',
    category: 'square',
    aspectRatio: '1:1',
    vramUsage: 'high'
  },

  // Portrait formats
  {
    label: '512×768',
    width: 512,
    height: 768,
    description: 'Portrait 2:3 ratio',
    category: 'portrait',
    aspectRatio: '2:3',
    vramUsage: 'low'
  },
  {
    label: '768×1024',
    width: 768,
    height: 1024,
    description: 'Portrait 3:4 ratio',
    category: 'portrait',
    aspectRatio: '3:4',
    vramUsage: 'medium'
  },
  {
    label: '832×1216',
    width: 832,
    height: 1216,
    description: 'SDXL portrait format',
    category: 'portrait',
    aspectRatio: '13:19',
    vramUsage: 'high'
  },

  // Landscape formats
  {
    label: '768×512',
    width: 768,
    height: 512,
    description: 'Landscape 3:2 ratio',
    category: 'landscape',
    aspectRatio: '3:2',
    vramUsage: 'low'
  },
  {
    label: '1024×768',
    width: 1024,
    height: 768,
    description: 'Landscape 4:3 ratio',
    category: 'landscape',
    aspectRatio: '4:3',
    vramUsage: 'medium'
  },
  {
    label: '1216×832',
    width: 1216,
    height: 832,
    description: 'SDXL landscape format',
    category: 'landscape',
    aspectRatio: '19:13',
    vramUsage: 'high'
  },

  // Wide formats
  {
    label: '1152×768',
    width: 1152,
    height: 768,
    description: 'Wide landscape 3:2',
    category: 'wide',
    aspectRatio: '3:2',
    vramUsage: 'medium'
  },
  {
    label: '1344×768',
    width: 1344,
    height: 768,
    description: 'Cinematic wide format',
    category: 'wide',
    aspectRatio: '7:4',
    vramUsage: 'high'
  },

  // Ultra-wide formats
  {
    label: '1536×640',
    width: 1536,
    height: 640,
    description: 'Ultra-wide panoramic',
    category: 'ultra-wide',
    aspectRatio: '12:5',
    vramUsage: 'high'
  }
]