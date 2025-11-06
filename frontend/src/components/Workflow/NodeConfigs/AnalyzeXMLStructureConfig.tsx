/**
 * AI分析XML结构节点配置组件
 */
import React from 'react'
import { Form, Input, Switch } from 'antd'
import type { NodeConfigProps } from './index'

export const AnalyzeXMLStructureConfig: React.FC<NodeConfigProps> = ({ form }) => {
  return (
    <>
      <Form.Item 
        name="additional_context" 
        label="额外上下文（可选）"
        tooltip="提供额外的上下文信息，帮助AI更好地理解XML文件的用途"
      >
        <Input.TextArea 
          rows={4} 
          placeholder="例如: 这是骑马与砍杀2的身体护甲配置表，包含各种护甲的属性信息"
        />
      </Form.Item>
      <Form.Item name="include_sample" label="包含原始内容示例" valuePropName="checked">
        <Switch defaultChecked />
      </Form.Item>
    </>
  )
}

