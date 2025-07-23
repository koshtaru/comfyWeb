// ============================================================================
// ComfyUI React - Models Page
// ============================================================================

export default function ModelsPage() {
  const models = [
    { name: 'Stable Diffusion 1.5', type: 'checkpoint', size: '4.2 GB' },
    { name: 'Stable Diffusion XL', type: 'checkpoint', size: '6.9 GB' },
    { name: 'Flux.1 Dev', type: 'checkpoint', size: '11.9 GB' },
  ]

  return (
    <div className="space-y-6">
      <div className="comfy-panel p-6">
        <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
          Models Management
        </h1>
        <p className="mb-6 text-comfy-text-secondary">
          Manage your ComfyUI models, checkpoints, and other assets.
        </p>

        <div className="space-y-4">
          {models.map((model, index) => (
            <div key={index} className="comfy-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-comfy-text-primary">
                    {model.name}
                  </h3>
                  <p className="text-sm text-comfy-text-secondary">
                    {model.type} • {model.size}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="comfy-button-secondary px-3 py-1 text-sm">
                    Load
                  </button>
                  <button className="comfy-button-secondary px-3 py-1 text-sm">
                    Info
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="comfy-button">Refresh Models</button>
        </div>
      </div>
    </div>
  )
}
