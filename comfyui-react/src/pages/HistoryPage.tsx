// ============================================================================
// ComfyUI React - History Page
// ============================================================================

import { useAppStore } from '@/store'

export default function HistoryPage() {
  const { generationHistory } = useAppStore()

  return (
    <div className="space-y-6">
      <div className="comfy-panel p-6">
        <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
          Generation History
        </h1>
        <p className="mb-6 text-comfy-text-secondary">
          View and manage your previous generations.
        </p>

        {generationHistory.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">📚</div>
            <h3 className="mb-2 text-lg font-medium text-comfy-text-primary">
              No history yet
            </h3>
            <p className="text-comfy-text-secondary">
              Your generated images will appear here once you start creating.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {generationHistory.map(item => (
              <div key={item.id} className="comfy-card">
                <div className="mb-3 flex aspect-square items-center justify-center rounded-md bg-comfy-bg-tertiary">
                  <span className="text-comfy-text-secondary">
                    Image Preview
                  </span>
                </div>
                <h4 className="truncate font-medium text-comfy-text-primary">
                  {item.metadata.prompts.positive.slice(0, 50)}...
                </h4>
                <p className="mt-1 text-sm text-comfy-text-secondary">
                  {new Date(item.timestamp).toLocaleDateString()}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      item.status === 'completed'
                        ? 'bg-comfy-success bg-opacity-20 text-comfy-success'
                        : item.status === 'failed'
                          ? 'bg-comfy-error bg-opacity-20 text-comfy-error'
                          : 'bg-comfy-accent-blue bg-opacity-20 text-comfy-accent-blue'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
