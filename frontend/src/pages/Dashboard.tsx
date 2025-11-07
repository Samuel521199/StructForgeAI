import { Card, Row, Col, Statistic, Typography, List, Tag, Space } from 'antd'
import {
  FileOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fileApi, workflowApi } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import type { UploadedFile, WorkflowExecution } from '@/types'

const { Title, Paragraph } = Typography

const Dashboard = () => {
  const navigate = useNavigate()
  const [fileCount, setFileCount] = useState(0)
  const [schemaCount, setSchemaCount] = useState(0)
  const [workflowCount, setWorkflowCount] = useState(0)
  const [recentFiles, setRecentFiles] = useState<UploadedFile[]>([])
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowExecution[]>([])
  const { schemaResult } = useAppStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [filesRes, workflowsRes, historyRes] = await Promise.all([
        fileApi.list(10),
        workflowApi.list().catch(() => ({ workflows: [] })),
        workflowApi.getHistory(undefined, 5).catch(() => ({ history: [] })),
      ])

      setFileCount(filesRes.files.length)
      setRecentFiles(filesRes.files.slice(0, 5))
      setWorkflowCount(workflowsRes.workflows.length)
      setRecentWorkflows(historyRes.history || [])

      if (schemaResult) {
        setSchemaCount(1)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  const getStatusTag = (status: string) => {
    const colorMap: Record<string, string> = {
      completed: 'success',
      running: 'processing',
      failed: 'error',
      pending: 'default',
      cancelled: 'warning',
    }
    return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
  }

  const handleFileClick = (file: UploadedFile) => {
    // 跳转到文件管理页面
    navigate('/files')
  }

  const handleWorkflowClick = (workflow: WorkflowExecution) => {
    // 跳转到工作流编辑器
    if (workflow.workflow_id) {
      navigate(`/workflow/editor?id=${workflow.workflow_id}`)
    } else {
      // 如果没有 workflow_id，跳转到工作流列表页面
      navigate('/workflow')
    }
  }

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/files')}
          >
            <Statistic
              title="已上传文件"
              value={fileCount}
              prefix={<FileOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/schema')}
          >
            <Statistic
              title="Schema分析"
              value={schemaCount}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/workflow')}
          >
            <Statistic
              title="可用工作流"
              value={workflowCount}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="最近上传的文件" loading={loading}>
            {recentFiles.length > 0 ? (
              <List
                dataSource={recentFiles}
                renderItem={(file) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFileClick(file)}
                  >
                    <Space>
                      <FileOutlined />
                      <span>{file.filename}</span>
                      <Tag>{formatFileSize(file.size)}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Paragraph type="secondary">暂无文件</Paragraph>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近执行的工作流" loading={loading}>
            {recentWorkflows.length > 0 ? (
              <List
                dataSource={recentWorkflows}
                renderItem={(workflow) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleWorkflowClick(workflow)}
                  >
                    <Space>
                      {workflow.status === 'completed' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <ClockCircleOutlined style={{ color: '#1890ff' }} />
                      )}
                      <span>{workflow.workflow_id}</span>
                      {getStatusTag(workflow.status)}
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Paragraph type="secondary">暂无工作流执行记录</Paragraph>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard

