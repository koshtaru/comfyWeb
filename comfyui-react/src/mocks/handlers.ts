import { http, HttpResponse } from 'msw'

export const handlers = [
  // ComfyUI API mocks will be added here as needed
  http.get('/api/system_stats', () => {
    return HttpResponse.json({
      system: {
        ram: { total: 16000000000, free: 8000000000 },
        cpu: 50,
      },
    })
  }),
]
