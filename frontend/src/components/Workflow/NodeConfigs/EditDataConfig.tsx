/**
 * 编辑数据节点配置组件
 */
import React from 'react'
import { Form, Input, Select } from 'antd'
import type { NodeConfigProps } from './index'

export const EditDataConfig: React.FC<NodeConfigProps> = ({ form }) => {
  return (
    <>
      <Form.Item 
        name="operation" 
        label="操作类型"
        rules={[{ required: true, message: '请选择操作类型' }]}
      >
        <Select placeholder="选择操作类型">
          <Select.Option value="create">创建新条目</Select.Option>
          <Select.Option value="update">更新条目</Select.Option>
          <Select.Option value="delete">删除条目</Select.Option>
          <Select.Option value="batch_create">批量创建</Select.Option>
          <Select.Option value="batch_update">批量更新</Select.Option>
          <Select.Option value="batch_delete">批量删除</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item 
        name="path" 
        label="数据路径"
        rules={[{ required: true, message: '请输入数据路径（例如: Items.Item）' }]}
        tooltip="指向要编辑的数据列表的路径，例如：Items.Item 表示 Items 下的 Item 列表"
      >
        <Input placeholder="例如: Items.Item" />
      </Form.Item>
      <Form.Item 
        name="item_data" 
        label="条目数据（JSON格式）"
        tooltip="创建或更新时需要的条目数据。单个操作：JSON对象；批量操作：JSON数组"
      >
        <Input.TextArea 
          rows={6} 
          placeholder='单个: {"@attributes": {"id": "new_item", "name": "新道具"}, "ItemComponent": {...}}\n批量: [{"@attributes": {...}}, {"@attributes": {...}}]'
        />
      </Form.Item>
      <Form.Item 
        name="filter_condition" 
        label="过滤条件（JSON格式）"
        tooltip='更新或删除时用于匹配条目的条件，例如：{"@attributes.id": "swordman_coat"}'
      >
        <Input.TextArea 
          rows={4} 
          placeholder='{"@attributes.id": "swordman_coat"} 或 {"id": "swordman_coat"}'
        />
      </Form.Item>
    </>
  )
}

