// ============================================================================
// ComfyUI React - Generate Page (txt2img)
// ============================================================================

import { useAppStore } from '@/store'

export default function GeneratePage() {
  const { isGenerating, setIsGenerating } = useAppStore()

  return (
    <div className="space-y-6">
      <div className="comfy-panel p-6">
        <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
          Generate Images
        </h1>
        <p className="mb-6 text-comfy-text-secondary">
          Create images using ComfyUI workflows. Upload a workflow JSON file or
          configure parameters manually.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-comfy-text-primary">
              Workflow Upload
            </label>
            <input
              type="file"
              accept=".json"
              className="comfy-input"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-comfy-text-primary">
              Prompt
            </label>
            <textarea
              className="comfy-input h-24"
              placeholder="Enter your prompt here..."
              disabled={isGenerating}
            />
          </div>

          <button
            className={`comfy-button w-full ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => setIsGenerating(!isGenerating)}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>

          {isGenerating && (
            <div className="mt-4 rounded-md bg-comfy-bg-tertiary p-4">
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-comfy-accent-orange border-t-transparent"></div>
                <span className="text-comfy-text-secondary">
                  Generation in progress...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
