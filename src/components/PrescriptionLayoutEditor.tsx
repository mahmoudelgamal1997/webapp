import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Switch, Select, Upload, Button, Typography, Row, Col, Divider, Slider, Space } from 'antd';
import { UploadOutlined, FileImageOutlined } from '@ant-design/icons';
import { useDoctorContext } from './DoctorContext';

const { Title, Text } = Typography;
const { Option } = Select;

const PrescriptionLayoutEditor: React.FC = () => {
    const { settings, updateSettings } = useDoctorContext();
    const [backgroundObjectUrl, setBackgroundObjectUrl] = useState<string | null>(null);

    // Local state for preview
    const [previewSettings, setPreviewSettings] = useState({
        paperSize: settings.printSettings?.paperSize || 'a4',
        marginTop: settings.printSettings?.marginTop || 0,
        marginLeft: settings.printSettings?.marginLeft || 0,
        marginRight: settings.printSettings?.marginRight || 0,
        showHeader: settings.printSettings?.showHeader !== false,
        showFooter: settings.printSettings?.showFooter !== false,
        showPatientInfo: settings.printSettings?.showPatientInfo !== false,
    });

    useEffect(() => {
        setPreviewSettings({
            paperSize: settings.printSettings?.paperSize || 'a4',
            marginTop: settings.printSettings?.marginTop || 0,
            marginLeft: settings.printSettings?.marginLeft || 0,
            marginRight: settings.printSettings?.marginRight || 0,
            showHeader: settings.printSettings?.showHeader !== false,
            showFooter: settings.printSettings?.showFooter !== false,
            showPatientInfo: settings.printSettings?.showPatientInfo !== false,
        });
    }, [settings]);

    // Handle setting changes
    const handleSettingChange = (key: string, value: any) => {
        const newSettings = { ...previewSettings, [key]: value };
        setPreviewSettings(newSettings);

        // Auto-save debounce could go here, or manual save button
    };

    const handleSave = () => {
        updateSettings({
            ...settings,
            printSettings: {
                paperSize: previewSettings.paperSize as any,
                marginTop: previewSettings.marginTop,
                marginLeft: previewSettings.marginLeft,
                marginRight: previewSettings.marginRight,
                showHeader: previewSettings.showHeader,
                showFooter: previewSettings.showFooter,
                showPatientInfo: previewSettings.showPatientInfo,
            }
        });
    };

    const handleImageUpload = (file: File) => {
        const objectUrl = URL.createObjectURL(file);
        setBackgroundObjectUrl(objectUrl);
        return false; // Prevent auto upload
    };

    return (
        <Row gutter={[24, 24]}>
            {/* Controls Column */}
            <Col xs={24} md={10}>
                <Card title="Print Settings">
                    <Form layout="vertical">
                        <Form.Item label="Paper Size">
                            <Select
                                value={previewSettings.paperSize}
                                onChange={(val) => handleSettingChange('paperSize', val)}
                            >
                                <Option value="a4">A4 (Standard)</Option>
                                <Option value="a5">A5 (Half Letter)</Option>
                                <Option value="custom">Custom (Printer Default)</Option>
                            </Select>
                        </Form.Item>

                        <Divider>Margins & Visibility</Divider>

                        <Form.Item label={`Top Margin: ${previewSettings.marginTop}mm`}>
                            <Slider
                                min={0}
                                max={290}
                                value={previewSettings.marginTop}
                                onChange={(val) => handleSettingChange('marginTop', val)}
                            />
                            <Text type="secondary">Use this to push content down below your logo.</Text>
                        </Form.Item>

                        <Form.Item label={`Left Margin: ${previewSettings.marginLeft}mm`}>
                            <Slider
                                min={0}
                                max={150}
                                value={previewSettings.marginLeft}
                                onChange={(val) => handleSettingChange('marginLeft', val)}
                            />
                            <Text type="secondary">Use this to push content away from the left edge.</Text>
                        </Form.Item>

                        <Form.Item label={`Right Margin: ${previewSettings.marginRight}mm`}>
                            <Slider
                                min={0}
                                max={150}
                                value={previewSettings.marginRight}
                                onChange={(val) => handleSettingChange('marginRight', val)}
                            />
                            <Text type="secondary">Use this to push content away from the right edge.</Text>
                        </Form.Item>

                        <Form.Item label="Show System Header">
                            <Space>
                                <Switch
                                    checked={previewSettings.showHeader}
                                    onChange={(checked) => handleSettingChange('showHeader', checked)}
                                />
                                <Text>{previewSettings.showHeader ? 'Visible' : 'Hidden (Use Pre-printed)'}</Text>
                            </Space>
                        </Form.Item>

                        <Form.Item label="Show System Footer">
                            <Space>
                                <Switch
                                    checked={previewSettings.showFooter}
                                    onChange={(checked) => handleSettingChange('showFooter', checked)}
                                />
                                <Text>{previewSettings.showFooter ? 'Visible' : 'Hidden'}</Text>
                            </Space>
                        </Form.Item>

                        <Form.Item label="Print Patient Info (Name & Date)">
                            <Space>
                                <Switch
                                    checked={previewSettings.showPatientInfo}
                                    onChange={(checked) => handleSettingChange('showPatientInfo', checked)}
                                />
                                <Text>{previewSettings.showPatientInfo ? 'Auto (Printed)' : 'Manual (Clean)'}</Text>
                            </Space>
                        </Form.Item>

                        <Form.Item label="Preview Background (Not Printed)">
                            <Upload
                                beforeUpload={handleImageUpload}
                                maxCount={1}
                                accept="image/*"
                                showUploadList={false}
                            >
                                <Button icon={<UploadOutlined />}>Upload Prescription Paper Image</Button>
                            </Upload>
                        </Form.Item>

                        <Button type="primary" onClick={handleSave} block size="large" style={{ marginTop: 24 }}>
                            Save Print Settings
                        </Button>
                    </Form>
                </Card>
            </Col>

            {/* Preview Column */}
            <Col xs={24} md={14}>
                <Card title="Visual Preview" bodyStyle={{ padding: 0, overflow: 'hidden', background: '#e6f7ff' }}>
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '600px',
                        overflow: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        {/* Simulated Paper */}
                        <div style={{
                            width: previewSettings.paperSize === 'a5' ? '148mm' : '210mm',
                            height: previewSettings.paperSize === 'a5' ? '210mm' : '297mm',
                            background: 'white',
                            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                            position: 'relative',
                            backgroundImage: backgroundObjectUrl ? `url(${backgroundObjectUrl})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transform: 'scale(0.8)', // Scale down to fit
                            transformOrigin: 'top center',
                            transition: 'all 0.3s'
                        }}>

                            {/* Content Overlay */}
                            <div style={{
                                paddingTop: `${(previewSettings.marginTop || 0) + 20}px`,
                                paddingLeft: `${(previewSettings.marginLeft || 0) + 20}px`,
                                paddingRight: `${(previewSettings.marginRight || 0) + 20}px`,
                                paddingBottom: '20px',
                            }}>

                                {/* Simulated Header */}
                                {previewSettings.showHeader && (
                                    <div style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 20, background: 'rgba(255,255,255,0.8)' }}>
                                        <Title level={4} style={{ margin: 0 }}>{settings.clinicName || 'Clinic Name'}</Title>
                                        <Text>{settings.doctorTitle || 'Doctor Title'}</Text>
                                    </div>
                                )}

                                {/* Simulated Patient Info */}
                                {previewSettings.showPatientInfo && (
                                    <div style={{ background: 'rgba(240,240,240,0.7)', padding: 10, borderRadius: 4, marginBottom: 20 }}>
                                        <Text strong>Patient Name: </Text> <Text>Ahmed Mohamed</Text><br />
                                        <Text strong>Date: </Text> <Text>2023-10-25</Text>
                                    </div>
                                )}

                                {/* Simulated Drugs */}
                                <div>
                                    <Title level={5}>Rx</Title>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} style={{ borderBottom: '1px solid #eee', padding: '5px 0' }}>
                                            <Text strong>Drug Name {i}</Text><br />
                                            <Text type="secondary">1 قرص - 3 مرات يومياً - بعد الأكل</Text>
                                        </div>
                                    ))}
                                </div>

                                {/* Simulated Footer */}
                                {previewSettings.showFooter && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 20,
                                        left: 20,
                                        right: 20,
                                        textAlign: 'center',
                                        borderTop: '1px solid #eee',
                                        paddingTop: 10,
                                        background: 'rgba(255,255,255,0.8)'
                                    }}>
                                        <Text type="secondary">{settings.receiptFooter || 'Get well soon!'}</Text>
                                    </div>
                                )}

                            </div>

                            {/* Top guide line */}
                            <div style={{
                                position: 'absolute',
                                top: `${(previewSettings.marginTop / 297 * 100)}%`,
                                left: 0, right: 0,
                                borderTop: '2px dashed red',
                                pointerEvents: 'none',
                                opacity: 0.5
                            }}>
                                <span style={{ background: 'red', color: 'white', fontSize: 10, padding: 2 }}>Top</span>
                            </div>
                            {/* Left guide line */}
                            {previewSettings.marginLeft > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, bottom: 0,
                                    left: `${previewSettings.marginLeft}px`,
                                    borderLeft: '2px dashed blue',
                                    pointerEvents: 'none',
                                    opacity: 0.5
                                }}>
                                    <span style={{ background: 'blue', color: 'white', fontSize: 10, padding: 2 }}>L</span>
                                </div>
                            )}
                            {/* Right guide line */}
                            {previewSettings.marginRight > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, bottom: 0,
                                    right: `${previewSettings.marginRight}px`,
                                    borderRight: '2px dashed green',
                                    pointerEvents: 'none',
                                    opacity: 0.5
                                }}>
                                    <span style={{ background: 'green', color: 'white', fontSize: 10, padding: 2, position: 'absolute', right: 0 }}>R</span>
                                </div>
                            )}

                        </div>
                    </div>
                    <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                        <Text type="secondary"><FileImageOutlined /> The uploaded image is for preview only and will not be printed.</Text>
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default PrescriptionLayoutEditor;
