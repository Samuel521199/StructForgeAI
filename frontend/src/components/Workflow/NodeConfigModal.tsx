import { Modal, Form, Input, Switch, Select } from 'antd'
import { useEffect } from 'react'
import type { NodeType } from './WorkflowNode'

interface NodeConfigModalProps {
  open: boolean
  nodeId: string | null
  nodeType: NodeType | null
  label: string
  description: string
  config: Record<string, any>
  onOk: (values: { label: string; description: string; config: Record<string, any> }) => void
  onCancel: () => void
}

const NodeConfigModal = ({
  open,
  nodeId,
  nodeType,
  label,
  description,
  config,
  onOk,
  onCancel,
}: NodeConfigModalProps) => {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open && nodeId) {
      form.setFieldsValue({
        label,
        description,
        ...config,
      })
    }
  }, [open, nodeId, label, description, config, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const { label, description, ...restConfig } = values
      onOk({
        label,
        description,
        config: restConfig,
      })
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const renderNodeSpecificConfig = () => {
    if (!nodeType) return null

    switch (nodeType) {
      case 'parse_file':
        return (
          <>
            <Form.Item
              name="file_path"
              label="文件路径"
              rules={[{ required: false, message: '请输入文件路径' }]}
            >
              <Input placeholder="例如: data/uploads/file.xml" />
            </Form.Item>
            <Form.Item name="auto_detect" label="自动检测格式" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </>
        )
      case 'analyze_schema':
        return (
          <>
            <Form.Item name="use_ai" label="使用AI分析" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="depth" label="分析深度">
              <Select>
                <Select.Option value="shallow">浅层</Select.Option>
                <Select.Option value="deep">深层</Select.Option>
              </Select>
            </Form.Item>
          </>
        )
      case 'process_natural_language':
        return (
          <>
            <Form.Item name="use_ai" label="使用AI" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="instruction" label="默认指令">
              <Input.TextArea rows={3} placeholder="例如: 将所有的剑的重量减少10%" />
            </Form.Item>
          </>
        )
      case 'apply_operations':
        return (
          <>
            <Form.Item name="validate_before_apply" label="应用前验证" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item name="rollback_on_error" label="错误时回滚" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </>
        )
      case 'export_file':
        return (
          <>
            <Form.Item name="output_format" label="导出格式">
              <Select defaultValue="json">
                <Select.Option value="json">JSON</Select.Option>
                <Select.Option value="xml">XML</Select.Option>
                <Select.Option value="yaml">YAML</Select.Option>
                <Select.Option value="csv">CSV</Select.Option>
                <Select.Option value="excel">Excel</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="output_path" label="输出路径">
              <Input placeholder="例如: data/exports/output" />
            </Form.Item>
          </>
        )
      default:
        return null
    }
  }

  return (
    <Modal
      title={`配置节点: ${label || nodeType || '未知节点'}`}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      width={600}
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="label"
          label="节点名称"
          rules={[{ required: true, message: '请输入节点名称' }]}
        >
          <Input placeholder="例如: 解析文件" />
        </Form.Item>
        <Form.Item name="description" label="节点描述">
          <Input.TextArea rows={2} placeholder="例如: 读取并解析配置文件" />
        </Form.Item>
        {renderNodeSpecificConfig()}
      </Form>
    </Modal>
  )
}

export default NodeConfigModal

