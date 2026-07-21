import { useCallback, useEffect, useState } from 'react'
import { Button, Popconfirm, Table, Upload, message, Tag } from 'antd'
import { DeleteOutlined, InboxOutlined } from '@ant-design/icons'
import { deleteDoc, listDocs, uploadDoc, type KbDoc } from '../api/knowledge'

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KbDoc[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { docs } = await listDocs()
      setDocs(docs)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 className="page-title">知识库管理</h2>
        <p className="page-subtitle">
          上传文档构建专属知识库 · bge-small-zh 向量化 · Chroma 存储 · 对话页开启「知识库增强」即可引用
        </p>
      </div>

      <Upload.Dragger
        accept=".txt,.md,.pdf,.docx"
        multiple
        showUploadList={false}
        customRequest={async ({ file, onSuccess, onError }) => {
          try {
            const record = await uploadDoc(file as File)
            message.success(`「${record.filename}」入库成功，共 ${record.chunks} 个分块`)
            refresh()
            onSuccess?.(null)
          } catch (e) {
            message.error((e as Error).message)
            onError?.(e as Error)
          }
        }}
        style={{ marginBottom: 20 }}
      >
        <p style={{ margin: '8px 0' }}>
          <InboxOutlined style={{ fontSize: 36, color: 'var(--cinnabar)' }} />
        </p>
        <p style={{ margin: '4px 0', fontSize: 14 }}>点击或拖拽文件到此处上传</p>
        <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--ink-soft)' }}>
          支持 .txt / .md / .pdf / .docx，上传后自动切分并向量化入库
        </p>
      </Upload.Dragger>

      <Table<KbDoc>
        rowKey="doc_id"
        dataSource={docs}
        loading={loading}
        pagination={false}
        size="middle"
        style={{ flex: 1, overflowY: 'auto' }}
        columns={[
          { title: '文档名称', dataIndex: 'filename', ellipsis: true },
          {
            title: '分块数',
            dataIndex: 'chunks',
            width: 100,
            render: (n: number) => <Tag color="orange">{n}</Tag>,
          },
          { title: '上传时间', dataIndex: 'created_at', width: 180 },
          {
            title: '操作',
            width: 100,
            render: (_, record) => (
              <Popconfirm
                title={`确定删除「${record.filename}」？`}
                description="删除后该文档的向量数据将一并移除"
                onConfirm={async () => {
                  try {
                    await deleteDoc(record.doc_id)
                    message.success('已删除')
                    refresh()
                  } catch (e) {
                    message.error((e as Error).message)
                  }
                }}
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
    </div>
  )
}
