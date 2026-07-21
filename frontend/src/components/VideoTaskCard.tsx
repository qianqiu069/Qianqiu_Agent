import { Card, Tag, Spin, Alert, Typography } from 'antd'
import { useVideoPolling } from '../hooks/useVideoPolling'

interface Props {
  videoId: string
  prompt: string
  initialStatus?: string
  initialUrl?: string | null
}

const STATUS_META: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '排队中' },
  processing: { color: 'processing', text: '生成中' },
  succeeded: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' },
}

export default function VideoTaskCard({ videoId, prompt, initialStatus, initialUrl }: Props) {
  const { status, video_url, error } = useVideoPolling(videoId, {
    status: initialStatus as never,
    video_url: initialUrl ?? null,
  })
  const meta = STATUS_META[status] ?? STATUS_META.processing

  return (
    <Card
      className="rise-in"
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Typography.Text ellipsis={{ tooltip: prompt }} style={{ maxWidth: 420 }}>
          {prompt}
        </Typography.Text>
      }
      extra={<Tag color={meta.color}>{meta.text}</Tag>}
    >
      {status === 'succeeded' && video_url ? (
        <video controls src={video_url} style={{ width: '100%', borderRadius: 8, maxHeight: 400 }} />
      ) : status === 'failed' ? (
        <Alert type="error" message="视频生成失败，请调整提示词后重试" showIcon />
      ) : (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>
          <Spin />
          <div style={{ marginTop: 10, fontSize: 13 }}>
            视频生成约需数分钟（18 秒 · 441 帧 · 24 fps），每 5 秒自动刷新
          </div>
          {error && <div style={{ marginTop: 6, fontSize: 12, color: '#b26a00' }}>查询异常：{error}（将自动重试）</div>}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8 }}>任务 ID：{videoId}</div>
    </Card>
  )
}
