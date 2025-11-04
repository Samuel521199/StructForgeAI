import { useState, useCallback, useEffect } from 'react'
import { Button, message, Modal, Select } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import type { Node, Edge, Connection } from 'react-flow-renderer'
import WorkflowHeader from '@/components/Workflow/WorkflowHeader'
import WorkflowCanvas from '@/components/Workflow/WorkflowCanvas'
import { workflowApi } from '@/services/api'
import type { NodeType } from '@/components/Workflow/WorkflowNode'
import './WorkflowEditor.css'

const { Option } = Select

// 默认节点配置
const defaultNodeConfigs: Record<
  NodeType,
  { label: string; description: string }
> = {
  parse_file: {
    label: '解析文件',
    description: '读取并解析配置文件',
  },
  analyze_schema: {
    label: '分析Schema',
    description: '深度分析数据结构',
  },
  process_natural_language: {
    label: '自然语言处理',
    description: '理解自然语言指令',
  },
  apply_operations: {
    label: '应用操作',
    description: '执行数据修改操作',
  },
  export_file: {
    label: '导出文件',
    description: '导出处理后的数据',
  },
}

// 初始化示例工作流
const getInitialNodes = (): Node[] => [
  {
    id: '1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: {
      type: 'parse_file' as NodeType,
      ...defaultNodeConfigs.parse_file,
    },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 400, y: 100 },
    data: {
      type: 'analyze_schema' as NodeType,
      ...defaultNodeConfigs.analyze_schema,
    },
  },
  {
    id: '3',
    type: 'default',
    position: { x: 700, y: 100 },
    data: {
      type: 'process_natural_language' as NodeType,
      ...defaultNodeConfigs.process_natural_language,
    },
  },
  {
    id: '4',
    type: 'default',
    position: { x: 1000, y: 100 },
    data: {
      type: 'apply_operations' as NodeType,
      ...defaultNodeConfigs.apply_operations,
    },
  },
  {
    id: '5',
    type: 'default',
    position: { x: 1300, y: 100 },
    data: {
      type: 'export_file' as NodeType,
      ...defaultNodeConfigs.export_file,
    },
  },
]

const getInitialEdges = (): Edge[] => [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
  },
  {
    id: 'e4-5',
    source: '4',
    target: '5',
  },
]

const WorkflowEditor = () => {
  const [nodes, setNodes] = useState<Node[]>(getInitialNodes())
  const [edges, setEdges] = useState<Edge[]>(getInitialEdges())
  const [workflowName, setWorkflowName] = useState('新建工作流')
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [executeModalVisible, setExecuteModalVisible] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      const res = await workflowApi.list()
      if (res.workflows.length > 0) {
        setSelectedWorkflow(res.workflows[0])
      }
    } catch (error: any) {
      console.error('加载工作流列表失败:', error)
    }
  }

  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setNodes(newNodes)
  }, [])

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges)
  }, [])

  const handleConnect = useCallback((connection: Connection) => {
    setEdges((eds) => {
      const newEdges = [...eds, { ...connection, id: `e${connection.source}-${connection.target}` }]
      return newEdges
    })
  }, [])

  const handleSave = useCallback(() => {
    // TODO: 保存工作流到后端
    message.success('工作流已保存')
  }, [nodes, edges])

  const handleShare = useCallback(() => {
    message.info('分享功能开发中')
  }, [])

  const handleExecute = async () => {
    setExecuteModalVisible(true)
  }

  const handleConfirmExecute = async () => {
    if (!selectedWorkflow) {
      message.warning('请选择工作流')
      return
    }

    try {
      setLoading(true)
      const context = {
        file_path: '',
        use_ai: true,
        instruction: '',
        output_format: 'json',
      }

      await workflowApi.execute(selectedWorkflow, context)
      message.success('工作流执行已启动')
      setExecuteModalVisible(false)
    } catch (error: any) {
      message.error(`执行失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="workflow-editor">
      <WorkflowHeader
        workflowName={workflowName}
        isActive={isActive}
        onActiveChange={setIsActive}
        onSave={handleSave}
        onShare={handleShare}
      />

      <div className="workflow-editor-content">
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
        />
      </div>

      <div className="workflow-editor-footer">
        <Button
          type="primary"
          size="large"
          icon={<PlayCircleOutlined />}
          onClick={handleExecute}
          loading={loading}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            height: 40,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          执行工作流
        </Button>
      </div>

      <Modal
        title="执行工作流"
        open={executeModalVisible}
        onOk={handleConfirmExecute}
        onCancel={() => setExecuteModalVisible(false)}
        confirmLoading={loading}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            选择工作流:
          </label>
          <Select
            style={{ width: '100%' }}
            value={selectedWorkflow}
            onChange={setSelectedWorkflow}
            placeholder="选择要执行的工作流"
          >
            <Option value="full_pipeline">完整流程</Option>
            <Option value="analyze_only">仅分析</Option>
            <Option value="batch_process">批量处理</Option>
          </Select>
        </div>
      </Modal>
    </div>
  )
}

export default WorkflowEditor

