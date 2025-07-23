function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-comfy-bg-primary">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold text-comfy-accent-orange">
          ComfyUI React
        </h1>
        <p className="mb-8 text-xl text-comfy-text-secondary">
          React + TypeScript Migration Foundation
        </p>
        <div className="space-y-3">
          <p className="text-comfy-text-secondary">
            ✅ Task 27.1: Project Setup Complete
          </p>
          <p className="text-comfy-text-secondary">
            ✅ Task 27.2: Development Tooling Complete
          </p>
          <p className="font-semibold text-comfy-accent-orange">
            🎨 Task 27.3: Tailwind CSS Theme System
          </p>
        </div>

        {/* Sample component buttons to test theme */}
        <div className="mt-8 space-x-4">
          <button className="comfy-button">Primary Button</button>
          <button className="comfy-button-secondary">Secondary Button</button>
        </div>

        {/* Sample input to test theme */}
        <div className="mx-auto mt-6 max-w-xs">
          <input
            type="text"
            placeholder="Test Tailwind input..."
            className="comfy-input"
          />
        </div>

        {/* Sample card to test theme */}
        <div className="comfy-card mx-auto mt-6 max-w-sm">
          <h3 className="mb-2 text-lg font-semibold text-comfy-text-primary">
            Theme Preview
          </h3>
          <p className="text-sm text-comfy-text-secondary">
            This card demonstrates the ComfyUI dark theme with Tailwind CSS.
            Custom colors, spacing, and shadows are working perfectly.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
