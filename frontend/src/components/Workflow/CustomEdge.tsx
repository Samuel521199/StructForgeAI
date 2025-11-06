/**
 * 自定义连线组件
 * 支持在连线点击时显示 Add 和 Delete 按钮
 */
import React, { useState, useCallback } from 'react'
import { BaseEdge, EdgeProps, getSmoothStepPath, useReactFlow } from 'reactflow'
import { Tooltip, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import './CustomEdge.css'

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target: _target, // 保留以符合 EdgeProps 接口，但未使用
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const { setEdges, getNode } = useReactFlow()

  // 计算连线路径
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // 计算连线中点坐标
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  // 计算连线方向（水平或垂直）
  const deltaX = Math.abs(targetX - sourceX)
  const deltaY = Math.abs(targetY - sourceY)
  const isHorizontal = deltaX > deltaY // 主要方向是水平还是垂直

  // 计算按钮偏移量（根据连线方向）
  // 水平连线：按钮显示在上下
  // 垂直连线：按钮显示在左右
  const buttonOffset = 25 // 偏移距离，不要太大

  // Add 按钮位置（在连线中点上方或左侧）
  const addButtonPosition = React.useMemo(() => {
    if (isHorizontal) {
      // 水平连线：显示在上方
      return { x: midX, y: midY - buttonOffset }
    } else {
      // 垂直连线：显示在左侧
      return { x: midX - buttonOffset, y: midY }
    }
  }, [midX, midY, isHorizontal, buttonOffset])

  // Delete 按钮位置（在连线中点下方或右侧）
  const deleteButtonPosition = React.useMemo(() => {
    if (isHorizontal) {
      // 水平连线：显示在下方
      return { x: midX, y: midY + buttonOffset }
    } else {
      // 垂直连线：显示在右侧
      return { x: midX + buttonOffset, y: midY }
    }
  }, [midX, midY, isHorizontal, buttonOffset])

  // 使用 useMemo 优化按钮渲染条件计算，避免频繁重新渲染
  // 只在鼠标悬停时显示按钮
  const shouldRenderButtons = React.useMemo(() => {
    const isValid = 
      isHovered &&
      sourceX !== undefined &&
      sourceY !== undefined &&
      targetX !== undefined &&
      targetY !== undefined &&
      Number.isFinite(sourceX) &&
      Number.isFinite(sourceY) &&
      Number.isFinite(targetX) &&
      Number.isFinite(targetY)
    
    if (isHovered && !isValid) {
      console.log(`[CustomEdge] ⚠️ 坐标无效，无法显示按钮 - Edge ID: ${id}`, {
        isHovered,
        sourceX,
        sourceY,
        targetX,
        targetY,
      })
    }
    
    return isValid
  }, [isHovered, sourceX, sourceY, targetX, targetY, id])

  // 处理鼠标进入
  const handleMouseEnter = useCallback((e?: React.MouseEvent) => {
    console.log(`[CustomEdge] ✅ Mouse ENTER on edge ${id}`)
    if (e) {
      e.stopPropagation()
    }
    setIsHovered(true)
  }, [id])

  // 处理鼠标离开
  const handleMouseLeave = useCallback((e?: React.MouseEvent) => {
    console.log(`[CustomEdge] ❌ Mouse LEAVE from edge ${id}`)
    if (e) {
      e.stopPropagation()
    }
    setIsHovered(false)
  }, [id])

  // 处理删除连线
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      setEdges((eds) => eds.filter((edge) => edge.id !== id))
      setIsHovered(false)
    },
    [id, setEdges]
  )

  // 处理添加连接
  // Add 功能：允许从源节点连接到多个目标节点
  // React Flow 已经支持一个源节点连接到多个目标节点
  // 这里我们提示用户可以从源节点的输出端口连接到其他节点
  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      // 获取当前连线的源节点
      const sourceNode = getNode(source)
      if (sourceNode) {
        // 提示用户可以从源节点连接到其他节点
        message.info({
          content: '您可以从源节点的输出端口连接到其他节点',
          duration: 2,
        })
      }
    },
    [source, getNode]
  )

  return (
    <g className="custom-edge-group">
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#ff4d4f' : style.stroke || '#8c8c8c',
          strokeWidth: selected ? 3 : style.strokeWidth || 2,
          cursor: 'pointer',
          pointerEvents: 'none', // BaseEdge 不处理鼠标事件，让透明路径处理
        }}
      />
      {/* 增加悬停区域 - 使用更宽的透明路径来捕获鼠标事件 */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={60} // 增加宽度，更容易捕获鼠标事件
        className="custom-edge-hover-path"
        onMouseEnter={(e) => {
          console.log(`[CustomEdge] 🖱️ Mouse ENTER on edge ${id}`)
          e.stopPropagation()
          handleMouseEnter(e)
        }}
        onMouseLeave={(e) => {
          console.log(`[CustomEdge] 🖱️ Mouse LEAVE from edge ${id}`)
          e.stopPropagation()
          handleMouseLeave(e)
        }}
        onClick={(e) => {
          console.log(`[CustomEdge] 🖱️ Mouse CLICK on edge ${id}`)
          e.stopPropagation()
        }}
      />
      
      {/* Add 按钮组 - 显示在连线中点附近 */}
      {shouldRenderButtons && (
        <g 
          transform={`translate(${addButtonPosition.x}, ${addButtonPosition.y})`}
          style={{ 
            pointerEvents: 'all',
            zIndex: 10000, // 确保在最上层
          }}
          onMouseEnter={(e) => {
            e.stopPropagation()
            setIsHovered(true)
          }}
          onMouseLeave={(e) => {
            e.stopPropagation()
            // 不立即设置为 false，避免鼠标快速移动时按钮闪烁
          }}
        >
          {/* Add 按钮 - 透明背景，带外框和图标 */}
          {/* 外框圆 */}
          <circle
            r="16"
            fill="transparent"
            stroke="#1890ff"
            strokeWidth="2"
            style={{ 
              pointerEvents: 'none',
            }}
          />
          <foreignObject 
            x="-16" 
            y="-16" 
            width="32" 
            height="32"
            style={{ 
              pointerEvents: 'auto',
              overflow: 'visible',
            }}
          >
            <div 
              className="edge-button-icon-wrapper edge-button-add-wrapper"
              style={{ 
                width: '100%', 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              onClick={handleAdd}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              <Tooltip title="添加连接">
                <PlusOutlined 
                  className="edge-icon edge-icon-add"
                  style={{
                    fontSize: '18px',
                    color: '#1890ff',
                  }}
                />
              </Tooltip>
            </div>
          </foreignObject>
        </g>
      )}

      {/* Delete 按钮组 - 显示在连线中点附近 */}
      {shouldRenderButtons && (
        <g 
          transform={`translate(${deleteButtonPosition.x}, ${deleteButtonPosition.y})`}
          style={{ 
            pointerEvents: 'all',
            zIndex: 10000, // 确保在最上层
          }}
          onMouseEnter={(e) => {
            e.stopPropagation()
            setIsHovered(true) // 保持显示状态
          }}
          onMouseLeave={(e) => {
            e.stopPropagation()
            // 不立即设置为 false，让透明路径的 onMouseLeave 处理
          }}
        >
          {/* Delete 按钮 - 透明背景，带外框和图标 */}
          {/* 外框圆 */}
          <circle
            r="16"
            fill="transparent"
            stroke="#ff4d4f"
            strokeWidth="2"
            style={{ 
              pointerEvents: 'none',
            }}
          />
          <foreignObject 
            x="-16" 
            y="-16" 
            width="32" 
            height="32"
            style={{ 
              pointerEvents: 'auto',
              overflow: 'visible',
            }}
          >
            <div 
              className="edge-button-icon-wrapper edge-button-delete-wrapper"
              style={{ 
                width: '100%', 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              onClick={handleDelete}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              <Tooltip title="删除连线">
                <DeleteOutlined 
                  className="edge-icon edge-icon-delete"
                  style={{
                    fontSize: '18px',
                    color: '#ff4d4f',
                  }}
                />
              </Tooltip>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  )
}

