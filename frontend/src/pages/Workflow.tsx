import { useState, useEffect } from 'react'
import {
  Card,
  Select,
  Button,
  Space,
  Typography,
  message,
  Table,
  Tag,
  Descriptions,
} from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import { workflowApi } from '@/services/api'
import type { WorkflowExecution } from '@/types'

const { Title } = Typography
const { Option } = Select

const Workflow = () => {
  const [workflows, setWorkflows] = useState<string[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>(
    []
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadWorkflows()
    loadHistory()
  }, [])

  const loadWorkflows = async () => {
    try {
      const res = await workflowApi.list()
      setWorkflows(res.workflows)
      if (res.workflows.length > 0) {
        setSelectedWorkflow(res.workflows[0])
      }
    } catch (error: any) {
      message.error(`加载工作流列表失败: ${error.message}`)
    }
  }

  const loadHistory = async () => {
    try {
      const res = await workflowApi.getHistory()
      setExecutionHistory(res.history)
    } catch (error: any) {
      console.error('加载历史记录失败:', error)
    }
  }

  const handleExecute = async () => {
    if (!selectedWorkflow) {
      message.warning('请选择工作流')
      return
    }

    try {
      setLoading(true)
      const result = await workflowApi.execute(selectedWorkflow, {
        file_path: '',
        use_ai: true,
      })
      message.success('工作流执行已启动')
      await loadHistory()
    } catch (error: any) {
      message.error(`执行失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
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

  const columns = [
    {
      title: '执行ID',
      dataIndex: 'execution_id',
      key: 'execution_id',
      ellipsis: true,
    },
    {
      title: '工作流',
      dataIndex: 'workflow_id',
      key: 'workflow_id',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
    },
  ]

  return (
    <div>
      <Title level={2}>工作流</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="执行工作流">
          <Space>
            <Select
              style={{ width: 200 }}
              value={selectedWorkflow}
              onChange={setSelectedWorkflow}
              placeholder="选择工作流"
            >
              {workflows.map((wf) => (
                <Option key={wf} value={wf}>
                  {wf}
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleExecute}
              loading={loading}
            >
              执行
            </Button>
          </Space>
        </Card>

        <Card title="执行历史">
          <Table
            columns={columns}
            dataSource={executionHistory}
            rowKey="execution_id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </div>
  )
}

export default Workflow

