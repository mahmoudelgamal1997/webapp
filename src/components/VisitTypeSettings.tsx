import React, { useState, useEffect } from 'react';
import { Card, Table, InputNumber, Input, Button, Space, message, Switch, Typography } from 'antd';
import { PlusOutlined, SaveOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import axios from 'axios';
import API from '../config/api';
import { useDoctorContext } from './DoctorContext';

const { Title, Text } = Typography;

interface VisitType {
    type_id: string;
    name: string;
    name_ar: string;
    normal_price: number;
    urgent_price: number;
    is_active: boolean;
    order: number;
}

const VisitTypeSettings: React.FC = () => {
    const { doctorId } = useDoctorContext();
    const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (doctorId) {
            loadVisitTypes();
        }
    }, [doctorId]);

    const loadVisitTypes = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.VISIT_TYPE_CONFIG(doctorId)}`);

            if (response.data.success) {
                setVisitTypes(response.data.data.visit_types || []);
            }
        } catch (error) {
            console.error('Error loading visit types:', error);
            message.error('Failed to load visit type configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            await axios.post(`${API.BASE_URL}${API.ENDPOINTS.VISIT_TYPE_CONFIG(doctorId)}`, {
                visit_types: visitTypes,
                default_type: 'visit'
            });

            message.success('Visit type configuration saved successfully');
        } catch (error) {
            console.error('Error saving visit types:', error);
            message.error('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const updateVisitType = (index: number, field: keyof VisitType, value: any) => {
        const updated = [...visitTypes];
        updated[index] = { ...updated[index], [field]: value };
        setVisitTypes(updated);
    };

    const addVisitType = () => {
        const newType: VisitType = {
            type_id: `type_${Date.now()}`,
            name: 'New Type',
            name_ar: 'نوع جديد',
            normal_price: 0,
            urgent_price: 0,
            is_active: true,
            order: visitTypes.length + 1
        };
        setVisitTypes([...visitTypes, newType]);
    };

    const deleteVisitType = (index: number) => {
        const updated = visitTypes.filter((_, i) => i !== index);
        setVisitTypes(updated);
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const updated = [...visitTypes];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        updated.forEach((vt, i) => vt.order = i + 1);
        setVisitTypes(updated);
    };

    const moveDown = (index: number) => {
        if (index === visitTypes.length - 1) return;
        const updated = [...visitTypes];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
        updated.forEach((vt, i) => vt.order = i + 1);
        setVisitTypes(updated);
    };

    const columns = [
        {
            title: 'Order',
            key: 'order',
            width: 100,
            render: (_: any, record: VisitType, index: number) => (
                <Space>
                    <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                    />
                    <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        onClick={() => moveDown(index)}
                        disabled={index === visitTypes.length - 1}
                    />
                </Space>
            )
        },
        {
            title: 'Name (English)',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: VisitType, index: number) => (
                <Input
                    value={text}
                    onChange={(e) => updateVisitType(index, 'name', e.target.value)}
                    placeholder="Visit name"
                />
            )
        },
        {
            title: 'Name (Arabic)',
            dataIndex: 'name_ar',
            key: 'name_ar',
            render: (text: string, record: VisitType, index: number) => (
                <Input
                    value={text}
                    onChange={(e) => updateVisitType(index, 'name_ar', e.target.value)}
                    placeholder="اسم النوع"
                />
            )
        },
        {
            title: 'Normal Price (EGP)',
            dataIndex: 'normal_price',
            key: 'normal_price',
            width: 150,
            render: (price: number, record: VisitType, index: number) => (
                <InputNumber
                    value={price}
                    min={0}
                    max={100000}
                    onChange={(val) => updateVisitType(index, 'normal_price', val || 0)}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Urgent Price (EGP)',
            dataIndex: 'urgent_price',
            key: 'urgent_price',
            width: 150,
            render: (price: number, record: VisitType, index: number) => (
                <InputNumber
                    value={price}
                    min={0}
                    max={100000}
                    onChange={(val) => updateVisitType(index, 'urgent_price', val || 0)}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Active',
            dataIndex: 'is_active',
            key: 'is_active',
            width: 80,
            render: (active: boolean, record: VisitType, index: number) => (
                <Switch
                    checked={active}
                    onChange={(checked) => updateVisitType(index, 'is_active', checked)}
                />
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 80,
            render: (_: any, record: VisitType, index: number) => (
                <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => deleteVisitType(index)}
                />
            )
        }
    ];

    return (
        <Card
            title={<Title level={4}>Visit Types & Pricing Configuration</Title>}
            extra={
                <Space>
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={addVisitType}
                    >
                        Add Visit Type
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        loading={saving}
                    >
                        Save Configuration
                    </Button>
                </Space>
            }
        >
            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                    Configure visit types and their prices for normal and urgent consultations.
                    These settings will be used by the assistant app when adding patients.
                </Text>
            </div>

            <Table
                dataSource={visitTypes}
                columns={columns}
                rowKey="type_id"
                loading={loading}
                pagination={false}
                size="small"
            />
        </Card>
    );
};

export default VisitTypeSettings;
