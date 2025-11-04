import { useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { Relationship } from '@/types'

interface RelationshipGraphProps {
  relationships: Relationship[]
  height?: string
}

const RelationshipGraph = ({
  relationships,
  height = '500px',
}: RelationshipGraphProps) => {
  // 构建节点和边
  const { nodes, edges } = useMemo(() => {
    if (!relationships || relationships.length === 0) {
      return { nodes: [], edges: [] }
    }

    const nodeMap = new Map<string, Node>()
    const edgeSet = new Set<string>()
    const edgesList: Edge[] = []
    let xOffset = 0
    let yOffset = 0

    relationships.forEach((rel) => {
      // 创建from节点
      if (!nodeMap.has(rel.from)) {
        nodeMap.set(rel.from, {
          id: rel.from,
          data: { label: rel.from },
          position: {
            x: xOffset,
            y: yOffset,
          },
        })
        xOffset += 150
        if (xOffset > 600) {
          xOffset = 0
          yOffset += 100
        }
      }

      // 创建to节点
      if (!nodeMap.has(rel.to)) {
        nodeMap.set(rel.to, {
          id: rel.to,
          data: { label: rel.to },
          position: {
            x: xOffset,
            y: yOffset,
          },
        })
        xOffset += 150
        if (xOffset > 600) {
          xOffset = 0
          yOffset += 100
        }
      }

      // 创建边
      const edgeId = `${rel.from}-${rel.to}-${rel.type}`
      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId)
        edgesList.push({
          id: edgeId,
          source: rel.from,
          target: rel.to,
          label: rel.type,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        })
      }
    })

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgesList,
    }
  }, [relationships])

  if (nodes.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
        }}
      >
        <span style={{ color: '#999' }}>暂无关系数据</span>
      </div>
    )
  }

  return (
    <div style={{ height, width: '100%' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}

export default RelationshipGraph

