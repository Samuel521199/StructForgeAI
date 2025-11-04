import { useState, useEffect } from 'react'
import {
  Card,
  Upload,
  Button,
  Table,
  Space,
  Typography,
  message,
  Tag,
} from 'antd'
import { UploadOutlined, FileOutlined } from '@ant-design/icons'
import type { UploadProps, UploadFile } from 'antd'
import { fileApi } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import type { UploadedFile } from '@/types'

const { Title } = Typography

const FileManagement = () => {
  const { uploadedFiles, setUploadedFiles, setCurrentFile } = useAppStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const res = await fileApi.list()
      setUploadedFiles(res.files)
    } catch (error: any) {
      message.error(`加载文件列表失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options

    try {
      setLoading(true)
      const result = await fileApi.upload(file as File)
      message.success(`文件上传成功: ${result.filename}`)
      await loadFiles()
      onSuccess?.(result)
    } catch (error: any) {
      message.error(`上传失败: ${error.message}`)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }

  const handleParse = async (file: UploadedFile) => {
    try {
      setLoading(true)
      const result = await fileApi.parse(file.path)
      setCurrentFile(result)
      message.success('文件解析成功')
    } catch (error: any) {
      message.error(`解析失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      xml: 'XML',
      json: 'JSON',
      yaml: 'YAML',
      yml: 'YAML',
      csv: 'CSV',
      tsv: 'TSV',
      xlsx: 'Excel',
      xls: 'Excel',
    }
    return typeMap[ext || ''] || 'Unknown'
  }

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string) => (
        <Space>
          <FileOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'filename',
      key: 'type',
      render: (filename: string) => (
        <Tag color="blue">{getFileType(filename)}</Tag>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
      sorter: (a: UploadedFile, b: UploadedFile) => a.size - b.size,
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: UploadedFile) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => handleParse(record)}
            loading={loading}
          >
            解析
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={2}>文件管理</Title>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Upload
            customRequest={handleUpload}
            showUploadList={false}
            disabled={loading}
          >
            <Button icon={<UploadOutlined />} type="primary" loading={loading}>
              上传文件
            </Button>
          </Upload>

          <Table
            columns={columns}
            dataSource={uploadedFiles}
            rowKey="filename"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Space>
      </Card>
    </div>
  )
}

export default FileManagement

