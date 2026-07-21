import { apiFetch } from './request'

export interface VideoCreateParams {
  prompt: string
  image_url?: string
  height?: number
  width?: number
  num_frames?: number
  frame_rate?: number
}

export interface VideoStatus {
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  video_url: string | null
}

export interface VideoTask {
  video_id: string
  prompt: string
  mode: 't2v' | 'i2v'
  status: string
  video_url: string | null
  created_at: string
}

export function listVideoTasks() {
  return apiFetch<{ tasks: VideoTask[] }>('/api/video/tasks')
}

export function createVideo(params: VideoCreateParams) {
  return apiFetch<{ video_id: string }>('/api/video/create', {
    method: 'POST',
    body: JSON.stringify({ num_frames: 441, frame_rate: 24, ...params }),
  })
}

export function getVideoStatus(videoId: string) {
  return apiFetch<VideoStatus>(`/api/video/status/${encodeURIComponent(videoId)}`)
}

export function uploadVideoImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<{ image_url: string; data_url: string }>('/api/video/upload-image', {
    method: 'POST',
    body: form,
  })
}
