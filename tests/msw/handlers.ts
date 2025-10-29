import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/llm', async ({ request }) => {
    const body = await request.json() as { prompt: string; lang?: string }

    const mockResponse = {
      text: '(Mock) Organized into 3 points: 1) Background 2) Issues 3) Next steps'
    }

    return HttpResponse.json(mockResponse)
  }),
]
