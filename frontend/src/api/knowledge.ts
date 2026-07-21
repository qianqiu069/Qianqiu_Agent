import { apiFetch } from './request'

export interface KbDoc {
  doc_id: string
  filename: string
  chunks: number
  created_at: string
}

export function listDocs() {
  return apiFetch<{ docs: KbDoc[] }>('/api/kb/docs')
}

export function uploadDoc(file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<KbDoc>('/api/kb/upload', { method: 'POST', body: form })
}

export function deleteDoc(docId: string) {
  return apiFetch<{ ok: boolean }>(`/api/kb/docs/${docId}`, { method: 'DELETE' })
}
