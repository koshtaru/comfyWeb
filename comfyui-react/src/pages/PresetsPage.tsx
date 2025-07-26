// ============================================================================
// ComfyUI React - Presets Page
// ============================================================================

import React from 'react'
import { PresetManager } from '@/components/presets/PresetManager'
import Container from '@/components/ui/Container'

const PresetsPage: React.FC = () => {
  return (
    <Container>
      <PresetManager />
    </Container>
  )
}

export default PresetsPage