// ============================================================================
// ComfyUI React - Route Constants
// ============================================================================

export const ROUTES = {
  GENERATE: '/',
  HISTORY: '/history',
  MODELS: '/models',
  PRESETS: '/presets',
  SETTINGS: '/settings',
  QUEUE: '/queue',
  WEBSOCKET_TEST: '/websocket-test',
} as const

export const ROUTE_NAMES = {
  GENERATE: 'txt2img',
  HISTORY: 'History',
  MODELS: 'Models',
  PRESETS: 'Presets',
  SETTINGS: 'Settings',
  QUEUE: 'Queue',
  WEBSOCKET_TEST: 'Connection Test',
} as const

// Tab configuration matching original ComfyUI interface
export const TAB_CONFIG = [
  {
    key: 'generate' as const,
    name: ROUTE_NAMES.GENERATE,
    path: ROUTES.GENERATE,
    icon: '🎨',
  },
  {
    key: 'history' as const,
    name: ROUTE_NAMES.HISTORY,
    path: ROUTES.HISTORY,
    icon: '📚',
  },
  {
    key: 'models' as const,
    name: ROUTE_NAMES.MODELS,
    path: ROUTES.MODELS,
    icon: '🤖',
  },
  {
    key: 'presets' as const,
    name: ROUTE_NAMES.PRESETS,
    path: ROUTES.PRESETS,
    icon: '💾',
  },
  {
    key: 'settings' as const,
    name: ROUTE_NAMES.SETTINGS,
    path: ROUTES.SETTINGS,
    icon: '⚙️',
  },
  {
    key: 'queue' as const,
    name: ROUTE_NAMES.QUEUE,
    path: ROUTES.QUEUE,
    icon: '⏳',
  },
  {
    key: 'websocket-test' as const,
    name: ROUTE_NAMES.WEBSOCKET_TEST,
    path: ROUTES.WEBSOCKET_TEST,
    icon: '🔌',
  },
] as const

export type TabKey = (typeof TAB_CONFIG)[number]['key']
