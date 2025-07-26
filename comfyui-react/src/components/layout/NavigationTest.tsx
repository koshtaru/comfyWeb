// Test Navigation component to identify the problematic import
import { Link, useLocation } from 'react-router-dom'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { TAB_CONFIG } from '@/constants/routes'
import { useGeneration } from '@/hooks/useGeneration'
import { useUploadStore } from '@/store/uploadStore'
import { usePromptStore } from '@/store/promptStore'
import { applyPromptOverride } from '@/utils/promptOverride'
import { ProgressToast } from '@/components/ui'
import AlertNotificationIconSimple from '@/components/ui/AlertNotificationIconSimple'

export default function NavigationTest() {
  const location = useLocation()
  const { isConnected } = useWebSocketContext()
  const { state: generationState } = useGeneration()
  const { currentWorkflow, validationResult } = useUploadStore()
  const { promptOverride } = usePromptStore()
  
  return (
    <header className="bg-comfy-bg-secondary border-b border-comfy-border p-4">
      <div className="text-white">
        Navigation Test Works - Tabs: {TAB_CONFIG.length} - Current: {location.pathname} - WS: {isConnected ? 'Connected' : 'Disconnected'} - Gen: {generationState.isGenerating ? 'Generating' : 'Idle'} - Workflow: {currentWorkflow ? 'Loaded' : 'None'}
      </div>
      <Link to="/" className="text-comfy-accent-orange">Home</Link>
      <AlertNotificationIconSimple
        hasErrors={true}
        hasWarnings={true}
        errorCount={1}
        warningCount={2}
        isOpen={false}
        onToggle={() => {}}
      />
      <ProgressToast
        isVisible={false}
        progress={0}
        maxProgress={100}
      />
    </header>
  )
}