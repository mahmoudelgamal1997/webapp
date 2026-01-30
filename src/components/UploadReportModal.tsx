import React, { useState, useRef } from 'react';
import { Modal, Button, Upload, message, Input, Select, Space } from 'antd';
import { CameraOutlined, FileImageOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import axios from 'axios';
import API from '../config/api';

const { TextArea } = Input;
const { Option } = Select;

interface UploadReportModalProps {
  visible: boolean;
  onCancel: () => void;
  patient: {
    _id?: string;
    patient_id?: string;
    patient_phone?: string;
    patient_name?: string;
    doctor_id?: string;
  };
  assistantId?: string;
  onSuccess?: () => void;
}

const UploadReportModal: React.FC<UploadReportModalProps> = ({
  visible,
  onCancel,
  patient,
  assistantId,
  onSuccess
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [reportType, setReportType] = useState<string>('examination');
  const [description, setDescription] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (info: any) => {
    let newFileList = [...info.fileList];
    
    // Limit to 10 files
    newFileList = newFileList.slice(-10);
    
    // Only show the last 10 files
    newFileList = newFileList.map((file) => {
      if (file.response) {
        file.url = file.response.url;
      }
      return file;
    });

    setFileList(newFileList);
  };

  const handleRemove = (file: UploadFile) => {
    const index = fileList.indexOf(file);
    const newFileList = fileList.slice();
    newFileList.splice(index, 1);
    setFileList(newFileList);
  };

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: UploadFile[] = Array.from(files).map((file, index) => {
        const uid = `-${Date.now()}-${index}`;
        // Convert File to RcFile by adding required properties
        const rcFile = file as RcFile;
        (rcFile as any).uid = uid;
        return {
          uid,
          name: file.name,
          status: 'done' as const,
          originFileObj: rcFile,
        };
      });
      setFileList([...fileList, ...newFiles]);
    }
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: UploadFile[] = Array.from(files).map((file, index) => {
        const uid = `-${Date.now()}-${index}`;
        // Convert File to RcFile by adding required properties
        const rcFile = file as RcFile;
        (rcFile as any).uid = uid;
        return {
          uid,
          name: file.name,
          status: 'done' as const,
          originFileObj: rcFile,
        };
      });
      setFileList([...fileList, ...newFiles]);
    }
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select at least one image to upload');
      return;
    }

    if (!patient.doctor_id) {
      message.error('Doctor ID is missing');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // Add all files
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('images', file.originFileObj);
        }
      });

      // Add patient information
      if (patient.patient_id) {
        formData.append('patient_id', patient.patient_id);
      }
      if (patient.patient_phone) {
        formData.append('patient_phone', patient.patient_phone);
      }
      formData.append('doctor_id', patient.doctor_id);
      formData.append('report_type', reportType);
      formData.append('description', description);
      if (assistantId) {
        formData.append('uploaded_by', assistantId);
      }

      const response = await axios.post(
        `${API.BASE_URL}/api/patients/reports/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        message.success(`Successfully uploaded ${response.data.reports.length} report(s)`);
        setFileList([]);
        setDescription('');
        setReportType('examination');
        if (onSuccess) {
          onSuccess();
        }
        onCancel();
      } else {
        message.error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(error.response?.data?.message || 'Failed to upload reports');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFileList([]);
    setDescription('');
    setReportType('examination');
    onCancel();
  };

  return (
    <Modal
      title={`Upload Reports - ${patient.patient_name || 'Patient'}`}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="upload"
          type="primary"
          loading={uploading}
          onClick={handleUpload}
          icon={<UploadOutlined />}
        >
          Upload {fileList.length > 0 ? `(${fileList.length})` : ''}
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Upload Buttons */}
        <Space>
          <Button
            icon={<CameraOutlined />}
            onClick={handleCameraClick}
            type="default"
          >
            Take Photo
          </Button>
          <Button
            icon={<FileImageOutlined />}
            onClick={handleFileSelect}
            type="default"
          >
            Choose Files
          </Button>
        </Space>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleCameraInputChange}
          multiple
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          multiple
        />

        {/* Report Type */}
        <div>
          <label>Report Type:</label>
          <Select
            value={reportType}
            onChange={setReportType}
            style={{ width: '100%', marginTop: 8 }}
          >
            <Option value="examination">Examination</Option>
            <Option value="report">Report</Option>
            <Option value="investigation">Investigation</Option>
          </Select>
        </div>

        {/* Description */}
        <div>
          <label>Description (Optional):</label>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for these reports..."
            rows={3}
            style={{ marginTop: 8 }}
          />
        </div>

        {/* File List */}
        {fileList.length > 0 && (
          <div>
            <label>Selected Images ({fileList.length}):</label>
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
              {fileList.map((file) => (
                <div
                  key={file.uid}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    marginBottom: '8px',
                  }}
                >
                  <span>{file.name}</span>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(file)}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default UploadReportModal;

