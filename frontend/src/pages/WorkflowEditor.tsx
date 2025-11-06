import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button, message, Modal, Select, Spin } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import type { Node, Edge, Connection, ReactFlowInstance } from 'reactflow'
import { MarkerType } from 'reactflow'
import WorkflowHeader from '@/components/Workflow/WorkflowHeader'
import WorkflowCanvas from '@/components/Workflow/WorkflowCanvas'
import NodeDetailPanel from '@/components/Workflow/NodeDetailPanel'
import NodeSelector from '@/components/Workflow/NodeSelector'
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
  edit_data: {
    label: '编辑数据',
    description: '创建、更新或删除数据条目',
  },
  filter_data: {
    label: '过滤数据',
    description: '根据条件过滤数据',
  },
  validate_data: {
    label: '验证数据',
    description: '验证数据是否符合Schema和规则',
  },
  analyze_xml_structure: {
    label: 'AI分析XML结构',
    description: '使用AI分析XML文件的完整结构',
  },
  generate_editor_config: {
    label: '生成编辑器配置',
    description: '根据XML结构生成编辑器配置',
  },
  smart_edit: {
    label: '智能编辑',
    description: '基于AI理解的智能数据编辑',
  },
  generate_workflow: {
    label: '生成工作流',
    description: '根据分析和配置生成完整工作流',
  },
  ai_agent: {
    label: 'AI Agent',
    description: '智能AI代理节点，支持多输入输出和工具集成',
  },
  chatgpt: {
    label: 'ChatGPT',
    description: 'OpenAI 的 ChatGPT 模型',
  },
  gemini: {
    label: 'Gemini',
    description: 'Google 的 Gemini 模型',
  },
  deepseek: {
    label: 'DeepSeek',
    description: 'DeepSeek 国产AI模型',
  },
  memory: {
    label: 'Memory',
    description: '工作流记忆节点，存储和检索上下文信息',
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
  const [searchParams, setSearchParams] = useSearchParams()
  const workflowId = searchParams.get('id') // 从URL参数获取工作流ID
  const nameFromUrl = searchParams.get('name') // 从URL参数获取工作流名称
  const descriptionFromUrl = searchParams.get('description') // 从URL参数获取工作流描述
  
  // 新建工作流应该从空节点开始，不是默认节点
  // 只有在加载已有工作流失败时才使用默认节点
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  // 如果URL中有名称，使用URL中的名称；否则使用默认名称
  const [workflowName, setWorkflowName] = useState(nameFromUrl ? decodeURIComponent(nameFromUrl) : '新建工作流')
  const [workflowDescription, setWorkflowDescription] = useState<string>(descriptionFromUrl ? decodeURIComponent(descriptionFromUrl) : '')
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [executeModalVisible, setExecuteModalVisible] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')
  // 如果没有workflowId，立即设置为已初始化，确保界面能显示
  const [initialized, setInitialized] = useState(!workflowId)
  
  // 节点详情面板相关状态
  const [nodeDetailVisible, setNodeDetailVisible] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null)
  // 节点执行结果映射：nodeId -> ParsedFile（全局执行上下文）
  const [nodeExecutionResults, setNodeExecutionResults] = useState<Map<string, any>>(new Map())
  
  // 节点选择器相关状态
  const [nodeSelectorVisible, setNodeSelectorVisible] = useState(false)
  const [addNodePosition, setAddNodePosition] = useState<{ x: number; y: number } | null>(null)
  
  // ReactFlow实例引用
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  
  // 用于跟踪是否刚刚保存了新工作流，避免URL更新后重新加载
  const justSavedRef = useRef<string | null>(null)
  
  // 执行状态相关（暂时未使用，保留用于后续功能）
  // const [executionStatus, setExecutionStatus] = useState<Record<string, 'pending' | 'running' | 'completed' | 'failed'>>({})
  
  useEffect(() => {
    console.log('WorkflowEditor useEffect triggered, workflowId:', workflowId)
    let mounted = true
    
    // 如果刚刚保存了这个工作流，跳过重新加载（数据已经是最新的）
    if (workflowId && justSavedRef.current === workflowId) {
      console.log('WorkflowEditor: 刚刚保存了该工作流，跳过重新加载')
      justSavedRef.current = null // 清除标记
      return
    }
    
    const initialize = async () => {
      try {
        if (workflowId) {
          // 如果有工作流ID，加载已有工作流
          console.log('Loading workflow with ID:', workflowId)
          await loadWorkflow(workflowId)
        } else {
          // 新建工作流，从空节点开始
          console.log('New workflow, starting with empty nodes')
          if (mounted) {
            setNodes([])
            setEdges([])
            // 如果URL中有名称和描述，使用它们
            if (nameFromUrl) {
              setWorkflowName(decodeURIComponent(nameFromUrl))
            } else {
              setWorkflowName('新建工作流')
            }
            if (descriptionFromUrl) {
              setWorkflowDescription(decodeURIComponent(descriptionFromUrl))
            }
            setInitialized(true)
            setLoading(false)
            console.log('WorkflowEditor: 新工作流初始化完成（空节点）')
          }
          // 异步加载工作流列表（不阻塞界面显示）
          if (mounted) {
            loadWorkflows().catch(err => {
              console.error('加载工作流列表失败（不影响界面显示）:', err)
            })
          }
        }
      } catch (error) {
        console.error('Initialization error:', error)
        if (mounted) {
          // 即使出错也设置为已初始化，显示空节点（新建工作流从空开始）
          setNodes([])
          setEdges([])
          setInitialized(true)
          setLoading(false)
        }
      }
    }
    
    // 如果没有workflowId，新建工作流应该从空节点开始
    if (!workflowId) {
      console.log('WorkflowEditor: 没有workflowId，新建工作流，从空节点开始')
      setNodes([])
      setEdges([])
      // 如果URL中有名称和描述，使用它们
      if (nameFromUrl) {
        setWorkflowName(decodeURIComponent(nameFromUrl))
      } else {
        setWorkflowName('新建工作流')
      }
      if (descriptionFromUrl) {
        setWorkflowDescription(decodeURIComponent(descriptionFromUrl))
      }
      setInitialized(true)
      setLoading(false)
      // 异步加载工作流列表
      loadWorkflows().catch(err => {
        console.error('加载工作流列表失败（不影响界面显示）:', err)
      })
    } else {
      // 有workflowId，异步加载已有工作流
      initialize()
    }
    
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, nameFromUrl, descriptionFromUrl]) // 当workflowId、nameFromUrl或descriptionFromUrl变化时重新初始化

  const loadWorkflow = async (id: string) => {
    try {
      setLoading(true)
      console.log('WorkflowEditor: 开始加载工作流:', id)
      
      const workflow = await workflowApi.load(id)
      
      console.log('WorkflowEditor: 加载工作流数据成功:', {
        id,
        nodesCount: workflow.nodes?.length || 0,
        edgesCount: workflow.edges?.length || 0,
        isDefault: (workflow as any).is_default
      })
      
      // 加载工作流数据，即使为空也使用空数组（不设置默认节点）
      if (workflow.nodes && Array.isArray(workflow.nodes) && workflow.nodes.length > 0) {
        setNodes(workflow.nodes as Node[])
      } else {
        // 如果是默认工作流，显示默认节点作为模板；否则显示空节点
        if ((workflow as any).is_default) {
          console.log('WorkflowEditor: 默认工作流，使用默认节点作为模板')
          setNodes(getInitialNodes())
          setEdges(getInitialEdges())
        } else {
          console.log('WorkflowEditor: 工作流没有节点，显示空节点')
          setNodes([])
          setEdges([])
        }
      }
      
      if (workflow.edges && Array.isArray(workflow.edges) && workflow.edges.length > 0) {
        // 确保所有连线都有 type: 'default'，使用 CustomEdge
        const edgesWithType = (workflow.edges as Edge[]).map(edge => ({
          ...edge,
          type: edge.type || 'default', // 如果没有 type，设置为 'default'
        }))
        setEdges(edgesWithType)
      } else if (!(workflow as any).is_default) {
        // 如果不是默认工作流且没有边，设置为空
        setEdges([])
      }
      
      if (workflow.name) {
        setWorkflowName(workflow.name)
      }
      
      if (workflow.description) {
        setWorkflowDescription(workflow.description)
      }
      
      if (workflow.is_active !== undefined) {
        setIsActive(workflow.is_active)
      }
      
      setInitialized(true)
      message.success('工作流加载成功')
    } catch (error: any) {
      console.error('WorkflowEditor: 加载工作流失败:', error)
      
      // 如果是404错误且刚刚保存了该工作流，可能是时序问题，不显示错误
      if (error.message?.includes('404') || error.message?.includes('不存在')) {
        if (justSavedRef.current === id) {
          console.log('WorkflowEditor: 工作流刚刚保存，可能是时序问题，稍后重试')
          // 清除标记，稍后重试
          justSavedRef.current = null
          // 延迟重试
          setTimeout(() => {
            loadWorkflow(id).catch(err => {
              console.error('WorkflowEditor: 重试加载工作流失败:', err)
              message.error(`加载工作流失败: ${err.message}`)
              setNodes([])
              setEdges([])
              setInitialized(true)
            })
          }, 500)
          return
        }
      }
      
      message.error(`加载工作流失败: ${error.message}`)
      // 加载失败时显示空节点，让用户可以重新创建
      setNodes([])
      setEdges([])
      setInitialized(true)
    } finally {
      setLoading(false)
    }
  }

  const loadWorkflows = async () => {
    try {
      const res = await workflowApi.list()
      if (res.workflows.length > 0) {
        setSelectedWorkflow(res.workflows[0].workflow_id)
      }
    } catch (error: any) {
      console.error('加载工作流列表失败:', error)
    }
  }

  const handleNodesChange = useCallback((newNodes: Node[]) => {
    // 使用函数式更新，只在位置确实变化时更新
    setNodes((prevNodes) => {
      // 如果节点数量相同，检查是否有位置变化
      if (prevNodes.length === newNodes.length) {
        let hasPositionChange = false
        const updatedNodes = prevNodes.map((prevNode) => {
          const newNode = newNodes.find(n => n.id === prevNode.id)
          if (newNode) {
            // 检查位置是否变化
            if (prevNode.position.x !== newNode.position.x || 
                prevNode.position.y !== newNode.position.y) {
              hasPositionChange = true
              // 位置变化，使用新位置
              return newNode
            }
            // 位置未变化，保留原节点（包括其他状态）
            return prevNode
          }
          return prevNode
        })
        // 如果有位置变化，更新所有节点
        if (hasPositionChange) {
          return updatedNodes
        }
        // 没有位置变化，保持原状态
        return prevNodes
      }
      // 节点数量变化，智能合并（保留已存在节点的位置）
      if (newNodes.length > prevNodes.length) {
        // 添加节点，保留已存在节点的位置
        const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]))
        return newNodes.map((newNode) => {
          const prevNode = prevNodeMap.get(newNode.id)
          if (prevNode) {
            // 已存在的节点，保留位置
            return {
              ...newNode,
              position: prevNode.position,
            }
          }
          // 新节点，使用新位置
          return newNode
        })
      }
      // 删除节点，完全更新
      return newNodes
    })
  }, [])

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges)
  }, [])

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) {
      return
    }
    const source = connection.source as string
    const target = connection.target as string
    
    // 生成唯一的 edge ID（避免重复连接时 ID 冲突）
    const edgeId = `e${source}-${target}-${Date.now()}`
    
    console.log('[WorkflowEditor] 创建新连线:', {
      edgeId,
      source,
      target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    })
    
    setEdges((eds) => {
      const newEdge: Edge = {
        ...connection,
        id: edgeId,
        source,
        target,
        type: 'default', // 确保使用 CustomEdge
        animated: true,
        style: { stroke: '#8c8c8c', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }
      console.log('[WorkflowEditor] 新连线已添加到 edges:', newEdge)
      return [...eds, newEdge]
    })
  }, [])

  const handleSave = useCallback(async () => {
    try {
      setLoading(true)
      // 如果有workflowId，更新现有工作流；否则创建新工作流
      const id = workflowId || `custom_${Date.now()}`
      console.log('WorkflowEditor: 保存工作流', { workflowId, newId: id, nodesCount: nodes.length })
      
      // 先标记保存操作，防止URL更新后立即加载
      if (!workflowId) {
        justSavedRef.current = id
      }
      
      await workflowApi.save(id, {
        nodes,
        edges,
        name: workflowName,
        description: workflowDescription || '自定义工作流',
        is_active: isActive,
      })
      
      console.log('WorkflowEditor: 工作流保存成功，ID:', id)
      message.success('工作流已保存')
      
      // 如果是新工作流，保存成功后再更新URL
      if (!workflowId) {
        console.log('WorkflowEditor: 新工作流保存成功，更新URL为:', id)
        // 确保保存完成后再更新URL，并保持标记
        setSearchParams({ id }, { replace: true })
      }
    } catch (error: any) {
      console.error('WorkflowEditor: 保存工作流失败', error)
      // 如果保存失败，清除标记
      if (!workflowId) {
        justSavedRef.current = null
      }
      message.error(`保存失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [nodes, edges, workflowName, workflowDescription, isActive, workflowId, setSearchParams])

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

      const result = await workflowApi.execute(selectedWorkflow, context)
      message.success('工作流执行已启动')
      setExecuteModalVisible(false)
      
      // 开始轮询执行状态
      if (result.execution_id) {
        pollExecutionStatus(result.execution_id)
      }
    } catch (error: any) {
      message.error(`执行失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 轮询执行状态
  const pollExecutionStatus = useCallback(async (executionId: string) => {
    const maxAttempts = 60
    let attempts = 0
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        return
      }
      
      try {
        const status = await workflowApi.getStatus(executionId)
        
        // 更新节点状态
        if (status.steps) {
          setNodes((nds) => {
            return nds.map((node) => {
              // 查找匹配的步骤
              const step = status.steps?.find((s: any) => s.step === node.data.type)
              if (step) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: step.status as 'pending' | 'running' | 'completed' | 'failed',
                  },
                }
              }
              return node
            })
          })
        }
        
        if (status.status === 'completed' || status.status === 'failed') {
          return
        }
        
        attempts++
        setTimeout(poll, 1000) // 每秒轮询一次
      } catch (error) {
        console.error('获取执行状态失败:', error)
      }
    }
    
    poll()
  }, [])
  
  // 处理节点双击 - 打开节点详情面板
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setSelectedNodeId(nodeId)
      setSelectedNodeData(node.data)
      setNodeDetailVisible(true)
    }
  }, [nodes])
  
  // 处理节点配置保存
  const handleNodeConfigSave = useCallback((values: { label: string; description: string; config: Record<string, any> }) => {
    if (!selectedNodeId) return
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              label: values.label,
              description: values.description,
              config: values.config,
            },
          }
        }
        return node
      })
    )
    
    // 更新当前选中的节点数据
    setSelectedNodeData((prev: any) => ({
      ...prev,
      label: values.label,
      description: values.description,
      config: values.config,
    }))
    
    message.success('节点配置已保存')
  }, [selectedNodeId])
  
  // 处理节点详情面板关闭
  const handleNodeDetailClose = useCallback(() => {
    setNodeDetailVisible(false)
    // 延迟清理，避免关闭动画闪烁
    setTimeout(() => {
      setSelectedNodeId(null)
      setSelectedNodeData(null)
    }, 300)
  }, [])
  
  // 更新节点执行结果
  const updateNodeExecutionResult = useCallback((nodeId: string, result: any) => {
    setNodeExecutionResults(prev => {
      const newMap = new Map(prev)
      newMap.set(nodeId, result)
      return newMap
    })
  }, [])
  
  // 处理节点执行（NodeDetailPanel 内部会调用执行器，这里只处理结果更新）
  const handleNodeExecute = useCallback(() => {
    // NodeDetailPanel 内部已经有执行逻辑，这里不需要额外处理
    // 但我们需要确保结果能够更新到全局映射中
  }, [])
  
  // 处理ReactFlow实例初始化
  const handleInit = useCallback((instance: any) => {
    reactFlowInstance.current = instance
  }, [])
  
  // 处理添加节点请求（通过工具栏按钮）
  const handleAddNodeRequest = useCallback((position: { x: number; y: number }) => {
    setAddNodePosition(position)
    setNodeSelectorVisible(true)
  }, [])
  
  // 处理节点选择
  const handleNodeSelect = useCallback((nodeType: NodeType) => {
    if (!addNodePosition) return
    
    const newNodeId = `node_${Date.now()}`
    // AI Agent 节点使用特殊的节点类型
    const reactFlowNodeType = nodeType === 'ai_agent' ? 'ai_agent' : 'default'
    const newNode: Node = {
      id: newNodeId,
      type: reactFlowNodeType,
      position: addNodePosition,
      data: {
        type: nodeType,
        ...defaultNodeConfigs[nodeType],
        config: {},
      },
    }
    
    setNodes((nds) => [...nds, newNode])
    setNodeSelectorVisible(false)
    setAddNodePosition(null)
    message.success('节点已添加')
  }, [addNodePosition])
  
  // 处理节点删除
  const handleNodesDelete = useCallback((nodesToDelete: Node[]) => {
    const nodeIds = nodesToDelete.map(n => n.id)
    
    // 删除节点
    setNodes((nds) => nds.filter(n => !nodeIds.includes(n.id)))
    
    // 删除相关连接
    setEdges((eds) =>
      eds.filter(
        (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
      )
    )
    
    message.success(`已删除 ${nodesToDelete.length} 个节点`)
  }, [])

  // 如果初始化失败，确保至少显示一些内容（使用useEffect避免在render中setState）
  // 注意：不要将 nodes.length 作为依赖项，避免循环
  useEffect(() => {
    // 如果没有workflowId且未初始化，立即初始化（新建工作流从空节点开始）
    if (!workflowId && !initialized) {
      setNodes([])
      setEdges([])
      // 如果URL中有名称和描述，使用它们
      if (nameFromUrl) {
        setWorkflowName(decodeURIComponent(nameFromUrl))
      } else {
        setWorkflowName('新建工作流')
      }
      if (descriptionFromUrl) {
        setWorkflowDescription(decodeURIComponent(descriptionFromUrl))
      }
      setInitialized(true)
      setLoading(false)
    }
    // 如果加载已有工作流失败且没有节点，保持空节点（不设置默认节点）
    else if (workflowId && !initialized && !loading) {
      // 只在真正失败时才设置，避免循环
      const timer = setTimeout(() => {
        if (nodes.length === 0) {
          setInitialized(true)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [workflowId, initialized, loading, nameFromUrl, descriptionFromUrl]) // 移除 nodes.length 依赖

  // 计算当前选中节点的上游结果（使用 useMemo 确保依赖更新时重新计算）
  // 直接在这里计算，而不是依赖 getUpstreamResult，避免频繁重新计算
  const currentUpstreamResult = useMemo(() => {
    if (!selectedNodeId) return null
    // 直接在这里查找上游节点，避免依赖 getUpstreamResult
    const incomingEdge = edges.find(e => e.target === selectedNodeId)
    if (!incomingEdge) return null
    const upstreamNodeId = incomingEdge.source
    return nodeExecutionResults.get(upstreamNodeId) || null
  }, [selectedNodeId, edges, nodeExecutionResults])

  return (
    <div className="workflow-editor" style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <WorkflowHeader
        workflowName={workflowName}
        isActive={isActive}
        onActiveChange={setIsActive}
        onNameChange={setWorkflowName}
        onSave={handleSave}
        onShare={handleShare}
      />

      <div className="workflow-editor-content" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fafafa' }}>
        {loading && !initialized ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '100%',
            height: '100%',
            minHeight: '600px',
            background: '#fff'
          }}>
            <Spin size="large" tip="加载工作流..." />
          </div>
        ) : (
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodesDelete={handleNodesDelete}
            onInit={handleInit}
            onAddNodeRequest={handleAddNodeRequest}
          />
        )}
      </div>
      
      {/* 节点详情面板 */}
      {selectedNodeId && selectedNodeData && (
        <NodeDetailPanel
          open={nodeDetailVisible}
          nodeId={selectedNodeId}
          nodeData={selectedNodeData}
          onClose={handleNodeDetailClose}
          onSave={handleNodeConfigSave}
          onExecute={handleNodeExecute}
          upstreamResult={currentUpstreamResult}
          onExecutionResult={selectedNodeId ? (result: any) => {
            updateNodeExecutionResult(selectedNodeId, result)
          } : undefined}
        />
      )}
      
      {/* 节点选择器 */}
      <NodeSelector
        open={nodeSelectorVisible}
        onSelect={handleNodeSelect}
        onCancel={() => {
          setNodeSelectorVisible(false)
          setAddNodePosition(null)
        }}
      />

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

