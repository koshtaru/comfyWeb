# Preset Navigation Debug Session - 2025-07-26

## Current Issue
User clicks preset apply button (✓) → navigates to txt2img page → infinite loading spinner shows → cannot navigate to other tabs

## Root Cause Analysis
1. **Navigation flow**: PresetCard → PresetsPage.handleApplyAndNavigate → navigate() with state → GeneratePage useEffect
2. **Problem**: `pasteWorkflow()` in `handleLoadPreset()` triggers upload process → sets `isProcessing = true` → shows spinner
3. **Spinner condition**: `{(generationState.isGenerating || isProcessing) && (<spinner>)}`

## Attempted Solutions

### Solution 1: Fixed dependency issues in useEffect
- Added proper TypeScript types
- Fixed async handling with promises
- Added comprehensive logging
- **Result**: Still spinning

### Solution 2: Direct store manipulation
- Created `loadPresetDirect()` function that bypasses upload manager
- Directly sets `setCurrentWorkflow()` and `setExtractedParameters()`
- Calls `resetCurrentUpload()` to clear any loading state
- **Status**: Implemented but user reports issue persisting

## Code Changes Made

### 1. Enhanced logging in both pages:
```typescript
// PresetsPage.tsx
console.log('[PresetsPage] handleApplyAndNavigate called with preset:', preset)
console.log('[PresetsPage] Navigating to:', ROUTES.GENERATE, 'with state:', {...})

// GeneratePage.tsx  
console.log('[GeneratePage] Navigation state:', navigationState)
console.log('[GeneratePage] Loading preset from navigation:', navigationState.presetToLoad)
```

### 2. Created loadPresetDirect function:
```typescript
const loadPresetDirect = (preset: IPreset) => {
  resetCurrentUpload() // Clear any stuck loading state
  setCurrentWorkflow(preset.workflowData)
  setExtractedParameters(extractedParams) // Converted from preset metadata
  setShowPresetSelector(false)
  // Set prompt overrides if present
}
```

### 3. Updated navigation handling:
- Uses setTimeout(100ms) to ensure component mount
- Empty dependency array to run only once
- Direct function call instead of async/await

## Next Steps to Try

1. **Check if resetCurrentUpload is working**:
   - Add logging to verify it's being called
   - Check if there are other state variables causing the spinner

2. **Investigate other loading triggers**:
   - Search for other places that set loading/processing state
   - Check if WebSocket or other services are involved

3. **Alternative approach**:
   - Use activePreset from preset store instead of navigation state
   - Load preset in GeneratePage from store, not navigation

4. **Debug the actual spinner condition**:
   - Log values of `generationState.isGenerating` and `isProcessing`
   - Find what's setting these to true

## Key Files & Locations

- **Spinner location**: GeneratePage.tsx:713-730
- **Navigation handler**: PresetsPage.tsx:89-108  
- **Preset loading**: GeneratePage.tsx:84-164 (handleLoadPreset + loadPresetDirect)
- **Upload store**: src/store/uploadStore.ts (resetCurrentUpload method)
- **Navigation effect**: GeneratePage.tsx:167-186

## Technical Details

### ExtractedParameters Format
```typescript
{
  generation: { steps, cfg, sampler, scheduler, seed, nodeId },
  model: { name, architecture, hash },
  image: { width, height, batchSize },
  prompts: { positive, negative, positiveNodeId, negativeNodeId },
  metadata: { totalNodes, complexity, estimatedVRAM }
}
```

### IPreset Format  
```typescript
{
  id, name, workflowData, metadata: {
    model, generation, dimensions, prompts, timingEstimate
  },
  category, tags, compressed, size, createdAt, lastModified
}
```

## Console Logs to Check
1. Are navigation logs showing?
2. Is preset data complete when passed?
3. Any errors in console?
4. Check network tab for hanging requests

## Quick Test Tomorrow
1. Open console
2. Click apply button
3. Check for: `[GeneratePage] Navigation state:` log
4. Check for: `[GeneratePage] Direct preset loading:` log
5. Check if `isProcessing` is logged as true somewhere

## Possible Issue
The `useUploadManager` hook might be setting `isProcessing` based on some internal state that we're not clearing properly. May need to check the hook implementation more deeply.