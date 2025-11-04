import { useCallback, useRef, useState } from 'react'
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
} from 'react-flow-renderer'
import 'react-flow-renderer/dist/style.css'
import WorkflowNode from './WorkflowNode'
import WorkflowToolbar from './WorkflowToolbar'
import { message } from 'antd'
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
}

const WorkflowCanvasInner = ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: WorkflowCanvasProps) => {
  const [nodes, setNodes, onNodesStateChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesStateChange] = useEdgesState(initialEdges)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // 当内部状态变化时，通知父组件
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesStateChange(changes)
      if (onNodesChange) {
        onNodesChange(nodes)
      }
    },
    [nodes, onNodesChange, onNodesStateChange]
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesStateChange(changes)
      if (onEdgesChange) {
        onEdgesChange(edges)
      }
    },
    [edges, onEdgesChange, onEdgesStateChange]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(connection, edges)
      setEdges(newEdges)
      onConnect?.(connection)
    },
    [edges, setEdges, onConnect]
  )

  const handleZoomIn = useCallback(() => {
    // React Flow没有直接的zoomIn API，需要通过Controls组件
    message.info('使用右侧控制按钮进行缩放')
  }, [])

  const handleZoomOut = useCallback(() => {
    message.info('使用右侧控制按钮进行缩放')
  }, [])

  const handleZoomFit = useCallback(() => {
    message.info('使用右侧控制按钮进行缩放')
  }, [])

  const handleAddNode = useCallback(() => {
    message.info('点击画布空白处或从节点右侧+按钮添加节点')
  }, [])

  return (
    <div className="workflow-canvas-container" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#b1b1b7', strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: '#b1b1b7', strokeWidth: 2 }}
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
            return config[node.type || ''] || '#d9d9d9'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
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

