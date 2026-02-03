import React, { useState, useEffect } from 'react';
import {
    Card, Table, Button, Modal, Form, Input, Select, InputNumber,
    DatePicker, message, Space, Tag, Popconfirm, Badge, Tabs
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined,
    MedicineBoxOutlined, HistoryOutlined
} from '@ant-design/icons';
import { useInventoryContext } from './InventoryContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const InventoryManagement: React.FC = () => {
    const { items, loading, addItem, updateItem, deleteItem, getLowStockItems } = useInventoryContext();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [form] = Form.useForm();
    const [categoryFilter, setCategoryFilter] = useState('all');

    const categories = ['Medications', 'Consumables', 'Equipment', 'Supplies', 'Other'];

    const handleAdd = () => {
        setEditingItem(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        form.setFieldsValue({
            ...item,
            expirationDate: item.expirationDate ? dayjs(item.expirationDate) : null
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteItem(id);
            message.success('Item deleted successfully');
        } catch (error) {
            message.error('Failed to delete item');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            const itemData = {
                ...values,
                expirationDate: values.expirationDate ? values.expirationDate.toISOString() : null
            };

            if (editingItem) {
                await updateItem(editingItem._id, itemData);
                message.success('Item updated successfully');
            } else {
                await addItem(itemData);
                message.success('Item added successfully');
            }
            setIsModalVisible(false);
            form.resetFields();
        } catch (error) {
            message.error('Failed to save item');
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a: any, b: any) => a.name.localeCompare(b.name),
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (category: string) => <Tag color="blue">{category}</Tag>,
            filters: categories.map(cat => ({ text: cat, value: cat })),
            onFilter: (value: any, record: any) => record.category === value,
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (quantity: number, record: any) => {
                const isLow = quantity <= record.minStockLevel;
                return (
                    <span style={{ color: isLow ? 'red' : 'inherit', fontWeight: isLow ? 'bold' : 'normal' }}>
                        {quantity} {record.unit}
                        {isLow && <WarningOutlined style={{ marginLeft: 8, color: 'red' }} />}
                    </span>
                );
            },
            sorter: (a: any, b: any) => a.quantity - b.quantity,
        },
        {
            title: 'Price',
            dataIndex: 'purchasePrice',
            key: 'purchasePrice',
            render: (price: number) => `${price.toFixed(2)} EGP`,
        },
        {
            title: 'Supplier',
            dataIndex: 'supplier',
            key: 'supplier',
            render: (supplier: string) => supplier || '-',
        },
        {
            title: 'Expiration',
            dataIndex: 'expirationDate',
            key: 'expirationDate',
            render: (date: string) => {
                if (!date) return '-';
                const expDate = dayjs(date);
                const isExpired = expDate.isBefore(dayjs());
                const isExpiringSoon = expDate.diff(dayjs(), 'days') <= 30 && !isExpired;
                return (
                    <span style={{ color: isExpired ? 'red' : isExpiringSoon ? 'orange' : 'inherit' }}>
                        {expDate.format('YYYY-MM-DD')}
                        {isExpired && ' (Expired)'}
                        {isExpiringSoon && ' (Soon)'}
                    </span>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Are you sure you want to delete this item?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const lowStockItems = getLowStockItems();

    return (
        <div style={{ padding: '24px' }}>
            <Card
                title={
                    <Space>
                        <MedicineBoxOutlined />
                        <span>Inventory Management</span>
                        {lowStockItems.length > 0 && (
                            <Badge count={lowStockItems.length} style={{ backgroundColor: '#ff4d4f' }}>
                                <Tag color="red">Low Stock Alerts</Tag>
                            </Badge>
                        )}
                    </Space>
                }
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Add Item
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={items}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{
                        category: 'Other',
                        quantity: 0,
                        unit: 'pieces',
                        purchasePrice: 0,
                        minStockLevel: 0
                    }}
                >
                    <Form.Item
                        name="name"
                        label="Item Name"
                        rules={[{ required: true, message: 'Please enter item name' }]}
                    >
                        <Input placeholder="e.g., Paracetamol 500mg" />
                    </Form.Item>

                    <Form.Item
                        name="category"
                        label="Category"
                        rules={[{ required: true, message: 'Please select category' }]}
                    >
                        <Select>
                            {categories.map(cat => (
                                <Option key={cat} value={cat}>{cat}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Space style={{ width: '100%' }} size="large">
                        <Form.Item
                            name="quantity"
                            label="Quantity"
                            rules={[{ required: true, message: 'Please enter quantity' }]}
                        >
                            <InputNumber min={0} style={{ width: 120 }} />
                        </Form.Item>

                        <Form.Item
                            name="unit"
                            label="Unit"
                            rules={[{ required: true, message: 'Please enter unit' }]}
                        >
                            <Input placeholder="e.g., pieces, boxes, ml" style={{ width: 120 }} />
                        </Form.Item>
                    </Space>

                    <Space style={{ width: '100%' }} size="large">
                        <Form.Item
                            name="purchasePrice"
                            label="Purchase Price (EGP)"
                        >
                            <InputNumber min={0} step={0.01} style={{ width: 150 }} />
                        </Form.Item>

                        <Form.Item
                            name="minStockLevel"
                            label="Min Stock Level"
                        >
                            <InputNumber min={0} style={{ width: 120 }} />
                        </Form.Item>
                    </Space>

                    <Form.Item
                        name="supplier"
                        label="Supplier"
                    >
                        <Input placeholder="Supplier name" />
                    </Form.Item>

                    <Form.Item
                        name="expirationDate"
                        label="Expiration Date"
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="notes"
                        label="Notes"
                    >
                        <TextArea rows={3} placeholder="Additional notes" />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingItem ? 'Update' : 'Add'} Item
                            </Button>
                            <Button onClick={() => {
                                setIsModalVisible(false);
                                form.resetFields();
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default InventoryManagement;
