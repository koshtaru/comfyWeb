// Utility to reset API endpoint to localhost:3000
// Run this in browser console to clear cached old endpoint

export const resetEndpointToLocalhost = () => {
  // Clear localStorage keys related to API endpoint
  const keys = Object.keys(localStorage)
  const apiKeys = keys.filter(key => 
    key.includes('comfyui-api') || 
    key.includes('api-store') ||
    key.includes('endpoint')
  )
  
  console.log('Clearing localStorage keys:', apiKeys)
  apiKeys.forEach(key => localStorage.removeItem(key))
  
  // Force reload to use new default
  window.location.reload()
}

// Auto-run if old endpoint is detected
if (typeof window !== 'undefined') {
  const storedData = localStorage.getItem('comfyui-api-store-v2')
  if (storedData && storedData.includes('192.168.1.15')) {
    console.log('Detected old endpoint in localStorage, clearing...')
    resetEndpointToLocalhost()
  }
  
  // Also check all localStorage for any old endpoints
  const allKeys = Object.keys(localStorage)
  const hasOldEndpoint = allKeys.some(key => {
    const value = localStorage.getItem(key)
    return value && value.includes('192.168.1.15')
  })
  
  if (hasOldEndpoint) {
    console.log('Found old endpoint in localStorage, clearing all ComfyUI data...')
    allKeys.forEach(key => {
      if (key.includes('comfyui') || key.includes('api')) {
        localStorage.removeItem(key)
      }
    })
    window.location.reload()
  }
}