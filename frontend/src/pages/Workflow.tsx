import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  message,
  Input,
  Select,
  Dropdown,
  Switch,
  Tag,
  Modal,
  Empty,
  Row,
  Col,
  Form,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  MoreOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { workflowApi } from '@/services/api'
import type { WorkflowInfo } from '@/types'
import type { MenuProps } from 'antd'

const { Title, Text } = Typography
const { Option } = Select

type SortOption = 'last_updated' | 'name' | 'created_at'
type ViewMode = 'grid' | 'list'

const Workflow = () => {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([])
  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('last_updated')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  
  // 删除确认
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowInfo | null>(null)
  
  // 创建工作流对话框
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createForm] = Form.useForm()

  useEffect(() => {
    loadWorkflows()
  }, [])

  useEffect(() => {
    filterAndSortWorkflows()
  }, [workflows, searchText, sortBy])

  const loadWorkflows = async () => {
    try {
      setLoading(true)
      const res = await workflowApi.list()
      setWorkflows(res.workflows)
    } catch (error: any) {
      message.error(`加载工作流列表失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortWorkflows = () => {
    let filtered = [...workflows]

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(
        (wf) =>
          wf.name.toLowerCase().includes(searchText.toLowerCase()) ||
          wf.description?.toLowerCase().includes(searchText.toLowerCase())
      )
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'last_updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

    setFilteredWorkflows(filtered)
  }

  const handleCreateWorkflow = () => {
    setCreateModalVisible(true)
    createForm.resetFields()
  }

  const handleCreateWorkflowConfirm = async () => {
    try {
      const values = await createForm.validateFields()
      const { name, description } = values
      
      // 跳转到编辑器，通过 URL 参数传递名称和描述
      const params = new URLSearchParams()
      if (name) params.set('name', encodeURIComponent(name))
      if (description) params.set('description', encodeURIComponent(description))
      
      const queryString = params.toString()
      navigate(`/workflow/editor${queryString ? `?${queryString}` : ''}`)
      setCreateModalVisible(false)
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const handleEditWorkflow = (workflowId: string) => {
    navigate(`/workflow/editor?id=${workflowId}`)
  }

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return

    try {
      setLoading(true)
      console.log('删除工作流:', {
        workflow_id: workflowToDelete.workflow_id,
        name: workflowToDelete.name,
        type: workflowToDelete.type
      })
      await workflowApi.delete(workflowToDelete.workflow_id)
      message.success('工作流已删除')
      setDeleteModalVisible(false)
      setWorkflowToDelete(null)
      await loadWorkflows()
    } catch (error: any) {
      console.error('删除工作流失败:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || '未知错误'
      message.error(`删除失败: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (workflow: WorkflowInfo, checked: boolean) => {
    // 默认工作流不支持状态切换（只能执行，不能修改状态）
    if (workflow.type === 'default') {
      message.warning('默认工作流无法修改激活状态，但可以直接执行')
      return
    }
    
    try {
      await workflowApi.toggleActive(workflow.workflow_id, checked)
      message.success(`工作流已${checked ? '激活' : '停用'}`)
      await loadWorkflows()
    } catch (error: any) {
      message.error(`操作失败: ${error.message}`)
    }
  }

  const handleDuplicateWorkflow = async (workflow: WorkflowInfo) => {
    try {
      const workflowData = await workflowApi.load(workflow.workflow_id)
      const newWorkflowId = `${workflow.workflow_id}_copy_${Date.now()}`
      
      // 如果是默认工作流且没有节点，创建一个新的空工作流
      if (workflow.type === 'default' && (!workflowData.nodes || workflowData.nodes.length === 0)) {
        await workflowApi.save(newWorkflowId, {
          nodes: [],
          edges: [],
          name: `${workflowData.name} (副本)`,
          description: `从 ${workflowData.name} 复制`,
          is_active: false,
        })
      } else {
        await workflowApi.save(newWorkflowId, {
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
          name: `${workflowData.name} (副本)`,
          description: workflowData.description || `从 ${workflowData.name} 复制`,
          is_active: false,
        })
      }
      
      message.success('工作流已复制')
      await loadWorkflows()
    } catch (error: any) {
      message.error(`复制失败: ${error.message}`)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getWorkflowMenuItems = (workflow: WorkflowInfo): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEditWorkflow(workflow.workflow_id),
      },
    ]
    
    // 复制功能对所有工作流都可用
    items.push({
      key: 'duplicate',
      label: '复制',
      icon: <CopyOutlined />,
      onClick: () => handleDuplicateWorkflow(workflow),
    })
    
    // 所有工作流都可以删除
    items.push({
      type: 'divider',
    })
    items.push({
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        setWorkflowToDelete(workflow)
        setDeleteModalVisible(true)
      },
    })
    
    return items
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部标题和操作栏 */}
      <Space style={{ marginBottom: 24, width: '100%', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>
          工作流
        </Title>
        <Button
          type="primary"
          danger
          icon={<PlusOutlined />}
          onClick={handleCreateWorkflow}
          size="large"
        >
          创建工作流
        </Button>
      </Space>

      {/* 搜索和筛选栏 */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: '16px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Input
            placeholder="搜索工作流..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Space>
            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 150 }}
            >
              <Option value="last_updated">按最后更新</Option>
              <Option value="name">按名称</Option>
              <Option value="created_at">按创建时间</Option>
            </Select>
            <Button
              icon={viewMode === 'grid' ? <UnorderedListOutlined /> : <AppstoreOutlined />}
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            />
          </Space>
        </Space>
      </Card>

      {/* 工作流列表 */}
      {loading && workflows.length === 0 ? (
        <Card>
          <Empty description="加载中..." />
        </Card>
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <Empty
            description={searchText ? '未找到匹配的工作流' : '暂无工作流'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {!searchText && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateWorkflow}>
                创建工作流
              </Button>
            )}
          </Empty>
        </Card>
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredWorkflows.map((workflow) => (
            <Col key={workflow.workflow_id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                style={{
                  height: '100%',
                  border: workflow.is_active ? '2px solid #52c41a' : '1px solid #d9d9d9',
                }}
                actions={[
                  <div key="switch" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={workflow.is_active}
                      onChange={(checked) => handleToggleActive(workflow, checked)}
                      disabled={workflow.type === 'default'}
                      title={workflow.type === 'default' ? '默认工作流无法修改状态' : ''}
                    />
                  </div>,
                  <div key="menu" onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      menu={{ items: getWorkflowMenuItems(workflow) }}
                      trigger={['click']}
                    >
                      <Button
                        type="text"
                        icon={<MoreOutlined />}
                      />
                    </Dropdown>
                  </div>,
                ]}
                onClick={() => handleEditWorkflow(workflow.workflow_id)}
              >
                <Card.Meta
                  title={
                    <Space>
                      <Text strong>{workflow.name}</Text>
                      {workflow.type === 'default' && (
                        <Tag color="blue">默认</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      {workflow.description && (
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                          {workflow.description}
                        </Text>
                      )}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        最后更新 {formatDate(workflow.updated_at)} · 创建于 {formatDate(workflow.created_at)}
                      </Text>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {filteredWorkflows.map((workflow) => (
              <Card
                key={workflow.workflow_id}
                hoverable
                style={{
                  border: workflow.is_active ? '2px solid #52c41a' : '1px solid #d9d9d9',
                }}
                onClick={() => handleEditWorkflow(workflow.workflow_id)}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space direction="vertical" style={{ flex: 1 }}>
                    <Space>
                      <Text strong style={{ fontSize: 16 }}>
                        {workflow.name}
                      </Text>
                      {workflow.type === 'default' && <Tag color="blue">默认</Tag>}
                      {workflow.is_active ? (
                        <Tag color="success">激活</Tag>
                      ) : (
                        <Tag>未激活</Tag>
                      )}
                    </Space>
                    {workflow.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {workflow.description}
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      最后更新 {formatDate(workflow.updated_at)} · 创建于 {formatDate(workflow.created_at)}
                    </Text>
                  </Space>
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={workflow.is_active}
                      onChange={(checked) => handleToggleActive(workflow, checked)}
                      disabled={workflow.type === 'default'}
                      title={workflow.type === 'default' ? '默认工作流无法修改状态' : ''}
                    />
                    <Dropdown
                      menu={{ items: getWorkflowMenuItems(workflow) }}
                      trigger={['click']}
                    >
                      <Button
                        type="text"
                        icon={<MoreOutlined />}
                      />
                    </Dropdown>
                  </Space>
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
      )}

      {/* 统计信息 */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Text type="secondary">
          共 {filteredWorkflows.length} 个工作流
        </Text>
      </div>

      {/* 创建工作流对话框 */}
      <Modal
        title="创建工作流"
        open={createModalVisible}
        onOk={handleCreateWorkflowConfirm}
        onCancel={() => {
          setCreateModalVisible(false)
          createForm.resetFields()
        }}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="工作流名称"
            rules={[
              { required: true, message: '请输入工作流名称' },
              { max: 50, message: '名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="例如：数据处理流程" />
          </Form.Item>
          <Form.Item
            name="description"
            label="工作流描述"
            rules={[
              { max: 200, message: '描述不能超过200个字符' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="描述这个工作流的作用和用途..."
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDeleteWorkflow}
        onCancel={() => {
          setDeleteModalVisible(false)
          setWorkflowToDelete(null)
        }}
        confirmLoading={loading}
        okText="删除"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要删除工作流 "{workflowToDelete?.name}" 吗？
          {workflowToDelete?.type === 'default' && (
            <span style={{ display: 'block', marginTop: 8, color: '#ff4d4f' }}>
              注意：这是默认工作流，删除后将从列表中隐藏，但重启服务后会恢复。
            </span>
          )}
          {workflowToDelete?.type === 'custom' && (
            <span style={{ display: 'block', marginTop: 8, color: '#ff4d4f' }}>
              此操作不可恢复。
            </span>
          )}
        </p>
      </Modal>
    </div>
  )
}

export default Workflow
