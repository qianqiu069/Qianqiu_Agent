import { useEffect, useState } from 'react'
import { Button, Input, Tabs, Upload, message, Empty, Spin } from 'antd'
import { PlayCircleOutlined, InboxOutlined } from '@ant-design/icons'
import VideoTaskCard from '../components/VideoTaskCard'
import { createVideo, listVideoTasks, uploadVideoImage, type VideoTask } from '../api/video'

export default function VideoPage() {
  const [mode, setMode] = useState<'t2v' | 'i2v'>('t2v')
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadedName, setUploadedName] = useState('')
  const [loading, setLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasks, setTasks] = useState<VideoTask[]>([])

  useEffect(() => {
    listVideoTasks()
      .then(({ tasks }) => setTasks(tasks))
      .catch(() => {})
      .finally(() => setTasksLoading(false))
  }, [])

  const handleCreate = async () => {
    const text = prompt.trim()
    if (!text) return
    if (mode === 'i2v' && !imageUrl) {
      message.warning('图生视频需要先提供图片（上传或填写 URL）')
      return
    }
    setLoading(true)
    try {
      const { video_id } = await createVideo({
        prompt: text,
        ...(mode === 'i2v' ? { image_url: imageUrl } : { height: 768, width: 1152 }),
      })
      setTasks((prev) => [
        {
          video_id,
          prompt: text,
          mode,
          status: 'pending',
          video_url: null,
          created_at: new Date().toLocaleString(),
        },
        ...prev,
      ])
      message.success('任务已创建，开始生成')
      setPrompt('')
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const i2vPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Upload.Dragger
        accept=".png,.jpg,.jpeg,.webp"
        maxCount={1}
        showUploadList={false}
        customRequest={async ({ file, onSuccess, onError }) => {
          try {
            const { data_url } = await uploadVideoImage(file as File)
            setImageUrl(data_url)
            setUploadedName((file as File).name)
            message.success('图片已上传')
            onSuccess?.(null)
          } catch (e) {
            message.error((e as Error).message)
            onError?.(e as Error)
          }
        }}
        style={{ padding: '4px 0' }}
      >
        <p style={{ margin: 4 }}>
          <InboxOutlined style={{ fontSize: 28, color: 'var(--cinnabar)' }} />
        </p>
        <p style={{ margin: 4, fontSize: 13 }}>
          {uploadedName ? `已选择：${uploadedName}` : '点击或拖拽上传参考图片'}
        </p>
      </Upload.Dragger>
      <Input
        value={imageUrl.startsWith('data:') ? '' : imageUrl}
        onChange={(e) => {
          setImageUrl(e.target.value)
          setUploadedName('')
        }}
        placeholder={uploadedName ? '（已使用上传图片，输入 URL 将覆盖）' : '或直接粘贴图片 URL'}
      />
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 className="page-title">AI 视频</h2>
        <p className="page-subtitle">基于 agnes-video-v2.0 · 异步生成约 18 秒视频</p>
      </div>

      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--hairline)',
          borderRadius: 12,
          padding: '4px 16px 16px',
          marginBottom: 20,
        }}
      >
        <Tabs
          activeKey={mode}
          onChange={(k) => setMode(k as 't2v' | 'i2v')}
          items={[
            { key: 't2v', label: '文生视频' },
            { key: 'i2v', label: '图生视频', children: i2vPanel },
          ]}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <Input.TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 't2v'
                ? '描述视频画面，例如：夕阳下海滩上漫步的猫，柔和的海浪，暖金色光线，电影质感'
                : '描述图片中的运动方式，例如：人物缓缓转身回望镜头，自然的表情，电影级运镜'
            }
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={loading}
            onClick={handleCreate}
            disabled={!prompt.trim()}
            style={{ height: 'auto', minWidth: 110 }}
          >
            生成视频
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tasksLoading ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <Spin />
          </div>
        ) : tasks.length === 0 ? (
          <Empty description="还没有视频任务" style={{ marginTop: 60 }} />
        ) : (
          tasks.map((t) => (
            <VideoTaskCard
              key={t.video_id}
              videoId={t.video_id}
              prompt={t.prompt}
              initialStatus={t.status}
              initialUrl={t.video_url}
            />
          ))
        )}
      </div>
    </div>
  )
}
