import { useEffect, useState } from 'react'
import { getVideoStatus, type VideoStatus } from '../api/video'

const POLL_INTERVAL = 5000

export function useVideoPolling(videoId: string, initial?: Partial<VideoStatus>) {
  const [status, setStatus] = useState<VideoStatus>({
    status: (initial?.status as VideoStatus['status']) ?? 'pending',
    video_url: initial?.video_url ?? null,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 已到终态的历史任务无需轮询
    if (initial?.status === 'succeeded' || initial?.status === 'failed') return

    let stopped = false
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const result = await getVideoStatus(videoId)
        if (stopped) return
        setStatus(result)
        setError(null)
        if (result.status === 'succeeded' || result.status === 'failed') return
      } catch (e) {
        if (stopped) return
        setError((e as Error).message)
      }
      timer = setTimeout(poll, POLL_INTERVAL)
    }

    poll()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [videoId])

  return { ...status, error }
}
