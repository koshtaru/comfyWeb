// ============================================================================
// ComfyUI React - Queue Page
// ============================================================================

export default function QueuePage() {
  const queueItems = [
    {
      id: '1',
      prompt: 'A beautiful landscape with mountains...',
      status: 'running',
      progress: 75,
    },
    {
      id: '2',
      prompt: 'Portrait of a person in cyberpunk style...',
      status: 'pending',
      progress: 0,
    },
    {
      id: '3',
      prompt: 'Abstract art with vibrant colors...',
      status: 'pending',
      progress: 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="comfy-panel p-6">
        <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
          Generation Queue
        </h1>
        <p className="mb-6 text-comfy-text-secondary">
          Monitor and manage your generation queue.
        </p>

        {queueItems.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">⏳</div>
            <h3 className="mb-2 text-lg font-medium text-comfy-text-primary">
              Queue is empty
            </h3>
            <p className="text-comfy-text-secondary">
              Start a generation to see it appear in the queue.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {queueItems.map(item => (
              <div key={item.id} className="comfy-card">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="mr-4 flex-1 truncate font-medium text-comfy-text-primary">
                    {item.prompt}
                  </h3>
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      item.status === 'running'
                        ? 'bg-comfy-accent-orange bg-opacity-20 text-comfy-accent-orange'
                        : 'bg-comfy-text-secondary bg-opacity-20 text-comfy-text-secondary'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {item.status === 'running' && (
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-sm text-comfy-text-secondary">
                      <span>Progress</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-comfy-bg-tertiary">
                      <div
                        className="h-2 rounded-full bg-comfy-accent-orange transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  {item.status === 'running' && (
                    <button className="comfy-button-secondary px-3 py-1 text-sm">
                      Cancel
                    </button>
                  )}
                  <button className="comfy-button-secondary px-3 py-1 text-sm">
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <button className="comfy-button-secondary mr-3">Clear Queue</button>
          <button className="comfy-button">Refresh</button>
        </div>
      </div>
    </div>
  )
}
