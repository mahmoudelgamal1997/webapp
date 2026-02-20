import React, { useState, useRef } from 'react';
import { Modal, Button, message, Input, Select, Space, Progress } from 'antd';
import { CameraOutlined, FileOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import axios from 'axios';
import API from '../config/api';

const { TextArea } = Input;
const { Option } = Select;

// Firebase config — same project as assistant portal & Android app
const firebaseConfig = {
  apiKey: 'AIzaSyDJ8HyRAm7z0RlgmYy3EjubVujy7E3ZBfA',
  authDomain: 'drwaiting-30f56.firebaseapp.com',
  projectId: 'drwaiting-30f56',
  storageBucket: 'drwaiting-30f56.firebasestorage.app',
  messagingSenderId: '937005545176',
  appId: '1:937005545176:web:f52c92800c4c6c109f49ad',
};

// Reuse existing Firebase app if already initialised
const firebaseApp = getApps().find(a => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

interface FileItem {
  id: string;
  file: File;
  name: string;
  preview: string | null; // object URL for images, null for PDFs
}

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
  onSuccess,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [reportType, setReportType] = useState<string>('examination');
  const [description, setDescription] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const mapped: FileItem[] = Array.from(incoming).map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleCancel = () => {
    files.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
    setDescription('');
    setReportType('examination');
    setProgress({});
    onCancel();
  };

  // Upload one file to Firebase Storage and return download URL
  const uploadToFirebase = (item: FileItem): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const doctorId = patient.doctor_id ?? 'unknown';
      const phone = (patient.patient_phone ?? 'unknown').replace(/\s/g, '');
      const storagePath = `patient_reports/${doctorId}/${phone}/${timestamp}_${safeName}`;

      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, item.file);

      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setProgress((prev) => ({ ...prev, [item.id]: pct }));
        },
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) { message.warning('Please select at least one file to upload'); return; }
    if (!patient.doctor_id) { message.error('Doctor ID is missing'); return; }

    setUploading(true);
    setProgress({});

    try {
      // 1. Upload all files to Firebase Storage
      const urls = await Promise.all(files.map((f) => uploadToFirebase(f)));

      // 2. Save URLs to backend (same endpoint used by Android app)
      const response = await axios.post(`${API.BASE_URL}/api/patients/reports/upload-urls`, {
        doctor_id: patient.doctor_id,
        patient_id: patient.patient_id ?? '',
        patient_phone: patient.patient_phone ?? '',
        image_urls: urls,
        report_type: reportType,
        description,
        uploaded_by: assistantId ?? 'doctor',
      });

      if (response.data.success) {
        message.success(`Successfully uploaded ${urls.length} file(s)`);
        handleCancel();
        if (onSuccess) onSuccess();
      } else {
        message.error(response.data.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      message.error(err?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const totalProgress = files.length > 0
    ? Math.round(Object.values(progress).reduce((a, b) => a + b, 0) / files.length)
    : 0;

  return (
    <Modal
      title={`Upload Reports — ${patient.patient_name || 'Patient'}`}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={uploading}>
          Cancel
        </Button>,
        <Button
          key="upload"
          type="primary"
          loading={uploading}
          onClick={handleUpload}
          icon={<UploadOutlined />}
          disabled={files.length === 0}
        >
          Upload {files.length > 0 ? `(${files.length})` : ''}
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Source buttons */}
        <Space>
          <Button icon={<CameraOutlined />} onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
            Take Photo
          </Button>
          <Button icon={<FileOutlined />} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            Choose Files (Images / PDF)
          </Button>
        </Space>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          multiple
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          multiple
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />

        {/* Report type */}
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Report Type:</label>
          <Select value={reportType} onChange={setReportType} style={{ width: '100%' }} disabled={uploading}>
            <Option value="examination">Examination</Option>
            <Option value="report">Report</Option>
            <Option value="investigation">Investigation / Lab</Option>
          </Select>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description (Optional):</label>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={2}
            disabled={uploading}
          />
        </div>

        {/* Selected files */}
        {files.length > 0 && (
          <div>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>
              Selected Files ({files.length}):
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map((f) => (
                <div
                  key={f.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fafafa' }}
                >
                  {/* Thumbnail */}
                  {f.preview ? (
                    <img src={f.preview} alt={f.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, background: '#ffe0e0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      📄
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{f.name}</div>
                    {uploading && progress[f.id] !== undefined && (
                      <Progress percent={progress[f.id]} size="small" style={{ marginBottom: 0 }} />
                    )}
                  </div>

                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => removeFile(f.id)}
                    disabled={uploading}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall progress */}
        {uploading && files.length > 0 && (
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: '#555' }}>Uploading to Firebase Storage...</div>
            <Progress percent={totalProgress} status="active" />
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default UploadReportModal;
