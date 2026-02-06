import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Input, Select, Space, message, Divider, Modal, List, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import axios from 'axios';
import API from '../config/api';
import { useDoctorContext } from './DoctorContext';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

interface Field {
    field_id: string;
    label: string;
    type: string;
    options?: string[];
    required: boolean;
}

interface Section {
    section_id: string;
    title: string;
    fields: Field[];
}

const HistoryTemplateBuilder: React.FC = () => {
    const { doctorId } = useDoctorContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [template, setTemplate] = useState<any>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [editingSection, setEditingSection] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<{ sectionIdx: number; fieldIdx: number } | null>(null);

    useEffect(() => {
        if (doctorId) {
            loadTemplate();
        }
    }, [doctorId]);

    const loadTemplate = async () => {
        try {
            console.log('HistoryTemplateBuilder - doctorId:', doctorId);

            if (!doctorId) {
                message.error('Doctor ID not found. Please log in again.');
                console.error('Doctor ID is missing!');
                navigate('/login');
                return;
            }

            setLoading(true);
            const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.MEDICAL_HISTORY_TEMPLATE}`, {
                params: { doctor_id: doctorId }
            });

            if (response.data.success) {
                const templateData = response.data.data;
                setTemplate(templateData);
                setSections(templateData.sections || []);
            }
        } catch (error) {
            console.error('Error loading template:', error);
            message.error('Failed to load template');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        try {
            // Validate sections and fields before saving
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];

                // Check if section title is empty
                if (!section.title || section.title.trim() === '') {
                    message.error(`القسم رقم ${i + 1} يجب أن يحتوي على عنوان`);
                    return;
                }

                // Check if any field has empty label
                for (let j = 0; j < section.fields.length; j++) {
                    const field = section.fields[j];
                    if (!field.label || field.label.trim() === '') {
                        message.error(`الحقل رقم ${j + 1} في القسم "${section.title}" يجب أن يحتوي على تسمية`);
                        return;
                    }
                }
            }

            setLoading(true);
            await axios.post(`${API.BASE_URL}${API.ENDPOINTS.MEDICAL_HISTORY_TEMPLATE}`, {
                doctor_id: doctorId,
                template_name: template?.template_name || 'Medical History Template',
                sections
            });

            message.success('Template saved successfully');
        } catch (error) {
            console.error('Error saving template:', error);
            message.error('Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    const addSection = () => {
        const newSection: Section = {
            section_id: `section_${Date.now()}`,
            title: 'New Section',
            fields: []
        };
        setSections([...sections, newSection]);
    };

    const deleteSection = (index: number) => {
        const newSections = sections.filter((_, i) => i !== index);
        setSections(newSections);
    };

    const updateSectionTitle = (index: number, title: string) => {
        const newSections = [...sections];
        newSections[index].title = title;
        setSections(newSections);
    };

    const moveSectionUp = (index: number) => {
        if (index === 0) return;
        const newSections = [...sections];
        [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
        setSections(newSections);
    };

    const moveSectionDown = (index: number) => {
        if (index === sections.length - 1) return;
        const newSections = [...sections];
        [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        setSections(newSections);
    };

    const addField = (sectionIndex: number) => {
        const newField: Field = {
            field_id: `field_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            required: false
        };
        const newSections = [...sections];
        newSections[sectionIndex].fields.push(newField);
        setSections(newSections);
    };

    const deleteField = (sectionIndex: number, fieldIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].fields = newSections[sectionIndex].fields.filter((_, i) => i !== fieldIndex);
        setSections(newSections);
    };

    const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<Field>) => {
        const newSections = [...sections];
        newSections[sectionIndex].fields[fieldIndex] = {
            ...newSections[sectionIndex].fields[fieldIndex],
            ...updates
        };
        setSections(newSections);
    };

    if (loading && !template) {
        return (
            <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <Card
                title="تخصيص نموذج التاريخ الطبي"
                extra={
                    <Space>
                        <Button onClick={() => navigate('/settings')}>العودة للإعدادات</Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSaveTemplate}
                            loading={loading}
                        >
                            حفظ النموذج
                        </Button>
                    </Space>
                }
            >
                <div style={{ marginBottom: 16 }}>
                    <Button type="dashed" block icon={<PlusOutlined />} onClick={addSection}>
                        إضافة قسم جديد
                    </Button>
                </div>

                {sections.map((section, sectionIdx) => (
                    <Card
                        key={section.section_id}
                        style={{ marginBottom: 16 }}
                        size="small"
                        title={
                            <Input
                                value={section.title}
                                onChange={(e) => updateSectionTitle(sectionIdx, e.target.value)}
                                style={{ fontWeight: 'bold' }}
                            />
                        }
                        extra={
                            <Space>
                                <Button
                                    size="small"
                                    icon={<ArrowUpOutlined />}
                                    onClick={() => moveSectionUp(sectionIdx)}
                                    disabled={sectionIdx === 0}
                                />
                                <Button
                                    size="small"
                                    icon={<ArrowDownOutlined />}
                                    onClick={() => moveSectionDown(sectionIdx)}
                                    disabled={sectionIdx === sections.length - 1}
                                />
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => deleteSection(sectionIdx)}
                                />
                            </Space>
                        }
                    >
                        <List
                            dataSource={section.fields}
                            renderItem={(field, fieldIdx) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="delete"
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => deleteField(sectionIdx, fieldIdx)}
                                        />
                                    ]}
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Input
                                            value={field.label}
                                            onChange={(e) => updateField(sectionIdx, fieldIdx, { label: e.target.value })}
                                            placeholder="تسمية الحقل"
                                        />
                                        <Select
                                            value={field.type}
                                            onChange={(value) => updateField(sectionIdx, fieldIdx, { type: value })}
                                            style={{ width: 200 }}
                                        >
                                            <Option value="text">نص قصير</Option>
                                            <Option value="long-text">نص طويل</Option>
                                            <Option value="checkbox">خانة اختيار</Option>
                                            <Option value="radio">اختيار من متعدد</Option>
                                        </Select>
                                        {field.type === 'radio' && (
                                            <Input
                                                value={field.options?.join(', ')}
                                                onChange={(e) => updateField(sectionIdx, fieldIdx, {
                                                    options: e.target.value.split(',').map(s => s.trim())
                                                })}
                                                placeholder="الخيارات (مفصولة بفاصلة)"
                                            />
                                        )}
                                    </Space>
                                </List.Item>
                            )}
                        />
                        <Button
                            type="dashed"
                            block
                            icon={<PlusOutlined />}
                            onClick={() => addField(sectionIdx)}
                            style={{ marginTop: 8 }}
                        >
                            إضافة حقل
                        </Button>
                    </Card>
                ))}
            </Card>
        </div>
    );
};

export default HistoryTemplateBuilder;
