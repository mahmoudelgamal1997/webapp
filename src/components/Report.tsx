// src/components/Report.tsx
import React, { useState } from 'react';
import { Card, DatePicker, Button, Typography, Space, Alert, Spin, Select, Tabs } from 'antd';
import { DownloadOutlined, FileTextOutlined, EyeOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs'; // Use dayjs instead of moment
import { useClinicContext } from './ClinicContext';
import reportService from '../services/reportService';
import ReportPreview from './ReportPreview';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

interface ReportProps {}

const Report: React.FC<ReportProps> = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reportType, setReportType] = useState<string>('patients');
  const [activeTab, setActiveTab] = useState<string>('options');
  const [exportFormat, setExportFormat] = useState<string>('pdf');

  const { selectedClinic } = useClinicContext();

  const handleDateChange = (dates: any) => {
    setDateRange(dates);
  };

  const handleReportTypeChange = (value: string) => {
    setReportType(value);
  };

  const generateReport = async (format: string = 'pdf') => {
    if (!dateRange[0] || !dateRange[1]) {
      setError('Please select a date range');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setExportFormat(format);

      const startDate = dateRange[0]?.format('YYYY-MM-DD');
      const endDate = dateRange[1]?.format('YYYY-MM-DD');
      
      const doctorId = localStorage.getItem('doctorId');
      const clinicId = selectedClinic?._id || '';

      const params = {
        doctor_id: doctorId || '',
        clinic_id: clinicId,
        start_date: startDate || '',
        end_date: endDate || '',
        format: format // Add format parameter
      };

      let blob: Blob;

      // Use the appropriate service function based on report type
      if (reportType === 'patients') {
        blob = await reportService.generatePatientsReport(params);
      } else if (reportType === 'visits') {
        blob = await reportService.generateVisitsReport(params);
      } else {
        blob = await reportService.generatePrescriptionsReport(params);
      }

      // Download the report
      const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `${reportType}_report_${startDate}_to_${endDate}.${fileExtension}`;
      reportService.downloadReport(blob, filename);
      
      setSuccess(`Report generated successfully as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Generate Reports">
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
      >
        <TabPane 
          tab={<span><SettingOutlined />Report Options</span>}
          key="options"
        >
          <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 16 }}>
            <div>
              <Title level={4}>Select Report Options</Title>
              <Text>Generate detailed reports for your clinic based on date range</Text>
            </div>

            <div>
              <Text strong>Report Type</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Select report type"
                value={reportType}
                onChange={handleReportTypeChange}
              >
                <Option value="patients">Patients Report</Option>
                <Option value="visits">Visits Report</Option>
                <Option value="prescriptions">Prescriptions Report</Option>
              </Select>
            </div>

            <div>
              <Text strong>Date Range</Text>
              <RangePicker 
                style={{ width: '100%', marginTop: 8 }}
                onChange={handleDateChange}
                format="YYYY-MM-DD"
                allowClear
                ranges={{
                  'Today': [dayjs(), dayjs()],
                  'This Week': [dayjs().startOf('week'), dayjs().endOf('week')],
                  'This Month': [dayjs().startOf('month'), dayjs().endOf('month')],
                  'Last Month': [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')],
                  'Last 3 Months': [dayjs().subtract(3, 'month'), dayjs()],
                  'This Year': [dayjs().startOf('year'), dayjs().endOf('year')]
                }}
              />
            </div>

            {reportType === 'visits' && (
              <div>
                <Text strong>Visit Type (Optional)</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="All visit types"
                  allowClear
                  mode="multiple"
                >
                  <Option value="regular">Regular</Option>
                  <Option value="emergency">Emergency</Option>
                  <Option value="follow_up">Follow-up</Option>
                  <Option value="checkup">Check-up</Option>
                  <Option value="consultation">Consultation</Option>
                </Select>
              </div>
            )}

            {error && (
              <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />
            )}

            {success && (
              <Alert message={success} type="success" showIcon closable onClose={() => setSuccess(null)} />
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />} 
                onClick={() => generateReport('pdf')}
                loading={loading && exportFormat === 'pdf'}
                disabled={!dateRange[0] || !dateRange[1]}
                style={{ flex: 1 }}
              >
                Download PDF
              </Button>
              
              <Button
                type="default"
                icon={<FileTextOutlined />}
                onClick={() => generateReport('excel')}
                loading={loading && exportFormat === 'excel'}
                disabled={!dateRange[0] || !dateRange[1]}
                style={{ flex: 1 }}
              >
                Export Excel
              </Button>
            </div>

            {loading && <Spin tip="Generating report..." />}
            
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => setActiveTab('preview')}
              disabled={!dateRange[0] || !dateRange[1]}
            >
              Preview Report Data
            </Button>
          </Space>
        </TabPane>
        
        <TabPane 
          tab={<span><EyeOutlined />Data Preview</span>}
          key="preview"
        >
          <ReportPreview 
            reportType={reportType}
            dateRange={dateRange}
            clinicId={selectedClinic?._id}
          />
          
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveTab('options')}>
              Back to Options
            </Button>
            
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => generateReport('pdf')}
              loading={loading && exportFormat === 'pdf'}
              disabled={!dateRange[0] || !dateRange[1]}
            >
              Generate Report
            </Button>
          </div>
        </TabPane>
      </Tabs>
      
      {activeTab === 'options' && (
        <Card size="small" title="Available Reports" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Patients Report</Text>
            <p>Includes patient registrations during the selected period with personal details.</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>Visits Report</Text>
            <p>Detailed report of all patient visits, including visit types, diagnoses, and complaints.</p>
          </div>

          <div>
            <Text strong>Prescriptions Report</Text>
            <p>Summary of all prescriptions issued during the selected period.</p>
          </div>
        </Card>
      )}
    </Card>
  );
};

export default Report;