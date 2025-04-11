// src/components/ReportPreview.tsx
import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Space, Empty, Spin } from 'antd';
import dayjs from 'dayjs'; 
import * as reportService from '../services/reportService';
const { Text } = Typography;

interface ReportPreviewProps {
  reportType: string;
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  clinicId?: string;
  visitTypes?: string[];
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ reportType, dateRange, clinicId, visitTypes }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch preview data if we have a date range
    if (reportType && dateRange[0] && dateRange[1]) {
      fetchPreviewData();
    } else {
      setPreviewData([]);
    }
  }, [reportType, dateRange, clinicId, visitTypes]);

  const fetchPreviewData = async () => {
    if (!dateRange[0] || !dateRange[1]) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = dateRange[0]?.format('YYYY-MM-DD');
      const endDate = dateRange[1]?.format('YYYY-MM-DD');
      const doctorId = localStorage.getItem('doctorId');

      const params = {
        doctor_id: doctorId || '',
        clinic_id: clinicId || '',
        start_date: startDate || '',
        end_date: endDate || '',
        limit: 10, // Only get a preview of 10 records
        visit_types: visitTypes
      };

      let response;
      switch (reportType) {
        case 'patients':
          response = await reportService.getPatientReportPreview(params);
          break;
        case 'visits':
          response = await reportService.getVisitsReportPreview(params);
          break;
        case 'prescriptions':
          response = await reportService.getPrescriptionsReportPreview(params);
          break;
        default:
          response = await reportService.getPatientReportPreview(params);
      }

      setPreviewData(response.data || []);
    } catch (error) {
      console.error('Error fetching report preview:', error);
      setError('Failed to load preview data');
      setPreviewData([]);
    } finally {
      setLoading(false);
    }
  };

  // Columns for Patients Report
  const patientColumns = [
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
    },
    {
      title: 'Phone',
      dataIndex: 'patient_phone',
      key: 'patient_phone',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => text || 'N/A'
    },
    {
      title: 'Registration Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : 'N/A'
    }
  ];

  // Columns for Visits Report
  const visitColumns = [
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
    },
    {
      title: 'Visit Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : 'N/A'
    },
    {
      title: 'Visit Type',
      dataIndex: 'visit_type',
      key: 'visit_type',
      render: (text: string) => text || 'Regular'
    },
    {
      title: 'Complaint',
      dataIndex: 'complaint',
      key: 'complaint',
      render: (text: string) => text || 'N/A'
    },
    {
      title: 'Diagnosis',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      render: (text: string) => text || 'N/A'
    }
  ];

  // Columns for Prescriptions Report
  const prescriptionColumns = [
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : 'N/A'
    },
    {
      title: 'Drug',
      dataIndex: 'drug',
      key: 'drug',
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
    },
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
    }
  ];

  const getColumns = () => {
    switch (reportType) {
      case 'patients':
        return patientColumns;
      case 'visits':
        return visitColumns;
      case 'prescriptions':
        return prescriptionColumns;
      default:
        return patientColumns;
    }
  };

  const getEmptyText = () => {
    if (!dateRange[0] || !dateRange[1]) {
      return 'Select a date range to see preview data';
    }
    return 'No data found for the selected criteria';
  };

  return (
    <Card title="Report Preview" style={{ marginTop: 16 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading preview data...</div>
        </div>
      ) : error ? (
        <Empty
          description={error}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : previewData.length > 0 ? (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Showing a preview of the first 10 records that will be included in your report.
          </Text>
          <Table
            columns={getColumns()}
            dataSource={previewData}
            rowKey={(record) => record._id || Math.random().toString(36).substr(2, 9)}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Text type="secondary">
              The full report will include all matching records.
            </Text>
          </div>
        </>
      ) : (
        <Empty
          description={getEmptyText()}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

export default ReportPreview;