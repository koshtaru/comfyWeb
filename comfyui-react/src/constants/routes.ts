// ============================================================================
// ComfyUI React - Route Constants
// ============================================================================

export const ROUTES = {
  GENERATE: '/',
  HISTORY: '/history',
  MODELS: '/models',
  SETTINGS: '/settings',
  QUEUE: '/queue',
} as const

export const ROUTE_NAMES = {
  GENERATE: 'txt2img',
  HISTORY: 'History',
  MODELS: 'Models',
  SETTINGS: 'Settings',
  QUEUE: 'Queue',
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
] as const

export type TabKey = (typeof TAB_CONFIG)[number]['key']
