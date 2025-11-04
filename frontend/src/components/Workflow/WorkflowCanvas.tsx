import { useCallback, useRef, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { message } from 'antd'
import WorkflowNode from './WorkflowNode'
import WorkflowToolbar from './WorkflowToolbar'
import './WorkflowCanvas.css'

const nodeTypes = {
  default: WorkflowNode,
}

interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onConnect?: (connection: Connection) => void
  onNodeDoubleClick?: (nodeId: string) => void
  onNodesDelete?: (nodes: Node[]) => void
  onInit?: (instance: any) => void
  onAddNodeRequest?: (position: { x: number; y: number }) => void
}

// 内部组件：用于访问ReactFlow的hook并暴露控制函数
const ZoomControls = ({
  onControlsReady,
}: {
  onControlsReady: (controls: {
    zoomIn: () => void
    zoomOut: () => void
    fitView: () => void
  }) => void
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  useEffect(() => {
    onControlsReady({
      zoomIn: () => zoomIn(),
      zoomOut: () => zoomOut(),
      fitView: () => fitView({ padding: 0.2, duration: 300 }),
    })
  }, [zoomIn, zoomOut, fitView, onControlsReady])

  return null
}

const WorkflowCanvasInner = ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDoubleClick,
  onNodesDelete,
  onInit,
  onAddNodeRequest,
}: WorkflowCanvasProps) => {
  const [nodes, setNodes, onNodesStateChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesStateChange] = useEdgesState(initialEdges)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useReactFlow()
  const zoomControlsRef = useRef<{
    zoomIn: () => void
    zoomOut: () => void
    fitView: () => void
  } | null>(null)
  
  // 初始化时传递ReactFlow实例给父组件
  useEffect(() => {
    if (onInit && reactFlowInstance) {
      onInit(reactFlowInstance)
    }
  }, [onInit, reactFlowInstance])
  
  // 使用ref跟踪上次的节点ID列表和数据哈希
  const prevNodeIdsRef = useRef<string>('')
  const prevNodeDataHashRef = useRef<string>('')
  const prevEdgeIdsRef = useRef<string>('')
  const isUpdatingRef = useRef(false)
  
  // 同步外部传入的nodes到内部状态（只在节点数量或数据变化时，避免拖动时冲突）
  useEffect(() => {
    // 如果正在更新，跳过（避免循环）
    if (isUpdatingRef.current) {
      return
    }
    
    // 如果初始节点为空，不更新
    if (!initialNodes || initialNodes.length === 0) {
      return
    }
    
    const currentNodeIds = JSON.stringify(initialNodes.map(n => n.id).sort())
    // 计算节点数据哈希（不包括position，因为position由内部状态管理）
    const nodeDataHash = JSON.stringify(
      initialNodes.map(n => ({ 
        id: n.id, 
        data: n.data,
        type: n.type
      })).sort((a, b) => a.id.localeCompare(b.id))
    )
    
    if (currentNodeIds !== prevNodeIdsRef.current) {
      // 节点添加或删除，需要智能合并
      isUpdatingRef.current = true
      setNodes((nds) => {
        // 合并策略：保留已存在节点的位置，新节点使用新位置
        const existingNodeMap = new Map(nds.map(n => [n.id, n]))
        return initialNodes.map((externalNode) => {
          const existingNode = existingNodeMap.get(externalNode.id)
          if (existingNode) {
            // 已存在的节点，保留其位置和选中状态
            return {
              ...externalNode,
              position: existingNode.position,
              selected: existingNode.selected,
            }
          }
          // 新节点，使用外部传入的位置
          return externalNode
        })
      })
      prevNodeIdsRef.current = currentNodeIds
      prevNodeDataHashRef.current = nodeDataHash
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 100)
    } else if (nodeDataHash !== prevNodeDataHashRef.current) {
      // 节点数据变化（如配置更新），但保留位置和选中状态
      isUpdatingRef.current = true
      setNodes((nds) => {
        return nds.map((node) => {
          const externalNode = initialNodes.find(n => n.id === node.id)
          if (externalNode) {
            // 保留内部的位置信息
            return {
              ...externalNode,
              position: node.position,
              selected: node.selected,
            }
          }
          return node
        })
      })
      prevNodeDataHashRef.current = nodeDataHash
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 100)
    }
  }, [initialNodes, setNodes])
  
  // 同步外部传入的edges到内部状态
  useEffect(() => {
    const currentEdgeIds = JSON.stringify(initialEdges.map(e => e.id).sort())
    if (currentEdgeIds !== prevEdgeIdsRef.current) {
      setEdges(initialEdges)
      prevEdgeIdsRef.current = currentEdgeIds
    }
  }, [initialEdges, setEdges])

  // 当内部状态变化时，通知父组件
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesStateChange(changes)
    },
    [onNodesStateChange]
  )

  // 同步nodes状态到父组件（使用防抖，避免拖动时频繁更新）
  const nodesUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const lastNodesSnapshotRef = useRef<string>('')
  
  useEffect(() => {
    // 如果正在从外部更新，不通知父组件
    if (isUpdatingRef.current) {
      return
    }
    
    // 创建节点快照（包括位置）
    const nodesSnapshot = JSON.stringify(
      nodes.map(n => ({ id: n.id, position: n.position, data: n.data }))
        .sort((a, b) => a.id.localeCompare(b.id))
    )
    
    // 只有当快照变化时才通知父组件
    if (nodesSnapshot !== lastNodesSnapshotRef.current && onNodesChange) {
      lastNodesSnapshotRef.current = nodesSnapshot
      
      // 清除之前的定时器
      if (nodesUpdateTimeoutRef.current) {
        clearTimeout(nodesUpdateTimeoutRef.current)
      }
      // 延迟更新，避免拖动时频繁触发
      nodesUpdateTimeoutRef.current = setTimeout(() => {
        onNodesChange(nodes)
      }, 300) // 增加到300ms，让拖动更流畅
    }
    
    return () => {
      if (nodesUpdateTimeoutRef.current) {
        clearTimeout(nodesUpdateTimeoutRef.current)
      }
    }
  }, [nodes, onNodesChange])

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesStateChange(changes)
    },
    [onEdgesStateChange]
  )

  // 同步edges状态到父组件
  useEffect(() => {
    if (onEdgesChange) {
      onEdgesChange(edges)
    }
  }, [edges, onEdgesChange])

  const handleConnect = useCallback(
    (connection: Connection) => {
      // 检查目标节点是否已配置
      const targetNode = nodes.find(n => n.id === connection.target)
      if (targetNode) {
        const nodeData = targetNode.data as any
        // 如果是解析文件节点，检查是否有文件路径
        if (nodeData.type === 'parse_file' && (!nodeData.config?.file_path || nodeData.config.file_path.trim() === '')) {
          message.warning('请先配置节点：需要设置文件路径')
          return
        }
        // 如果是导出文件节点，检查是否有输出路径
        if (nodeData.type === 'export_file' && (!nodeData.config?.output_path || nodeData.config.output_path.trim() === '')) {
          message.warning('请先配置节点：需要设置输出路径')
          return
        }
      }
      
      const newEdges = addEdge(connection, edges)
      setEdges(newEdges)
      onConnect?.(connection)
    },
    [nodes, edges, setEdges, onConnect]
  )

  const handleControlsReady = useCallback(
    (controls: {
      zoomIn: () => void
      zoomOut: () => void
      fitView: () => void
    }) => {
      zoomControlsRef.current = controls
    },
    []
  )

  const handleZoomIn = useCallback(() => {
    zoomControlsRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    zoomControlsRef.current?.zoomOut()
  }, [])

  const handleZoomFit = useCallback(() => {
    zoomControlsRef.current?.fitView()
  }, [])

  const handleAddNode = useCallback(() => {
    // 通过工具栏添加节点，在画布中心位置创建
    if (reactFlowInstance) {
      const { x, y, zoom } = reactFlowInstance.getViewport()
      const centerX = (window.innerWidth / 2 - x) / zoom
      const centerY = (window.innerHeight / 2 - y) / zoom
      
      // 调用父组件的添加节点请求回调
      onAddNodeRequest?.({ x: centerX, y: centerY })
    }
  }, [onAddNodeRequest, reactFlowInstance])

  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onNodeDoubleClick?.(node.id)
  }, [onNodeDoubleClick])

  const handleNodesDelete = useCallback((nodesToDelete: Node[]) => {
    onNodesDelete?.(nodesToDelete)
  }, [onNodesDelete])

  return (
    <div className="workflow-canvas-container" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodesDelete={handleNodesDelete}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8c8c8c', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
        connectionLineStyle={{ 
          stroke: '#8c8c8c', 
          strokeWidth: 2,
          strokeDasharray: '5,5',
        }}
      >
        <Background gap={16} size={1} color="#e8e8e8" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const config: Record<string, string> = {
              parse_file: '#1890ff',
              analyze_schema: '#52c41a',
              process_natural_language: '#722ed1',
              apply_operations: '#fa8c16',
              export_file: '#eb2f96',
            }
            return config[node.data?.type || ''] || '#d9d9d9'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <ZoomControls onControlsReady={handleControlsReady} />
      </ReactFlow>
      <WorkflowToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        onAddNode={handleAddNode}
      />
    </div>
  )
}

const WorkflowCanvas = (props: WorkflowCanvasProps) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

export default WorkflowCanvas

