// SearchFilters.tsx
import React from 'react';
import { Row, Col, Input, Button, Space, Tag, DatePicker } from 'antd';
import { CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { usePatientContext } from './PatientContext';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const SearchFilters: React.FC = () => {
  const {
    filteredPatients,
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    isDateFilterVisible,
    setIsDateFilterVisible,
    clearFilters
  } = usePatientContext();

  // Handle date range change
  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates);
  };

  return (
    <>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={8}>
          <Input.Search 
            placeholder="Search by name, phone, email or address" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            enterButton={<SearchOutlined />}
          />
        </Col>
        <Col xs={24} md={13}>
          <Space>
            <Button 
              type={isDateFilterVisible ? "primary" : "default"}
              icon={<CalendarOutlined />} 
              onClick={() => setIsDateFilterVisible(!isDateFilterVisible)}
            >
              Date Filter
            </Button>
            
            {isDateFilterVisible && (
              <RangePicker 
                onChange={handleDateRangeChange}
                value={dateRange}
                allowClear
              />
            )}
            
            {(searchTerm || dateRange[0] || dateRange[1]) && (
              <Button onClick={clearFilters}>Clear Filters</Button>
            )}
          </Space>
        </Col>
        <Col xs={24} md={3} style={{ textAlign: 'right' }}>
          <Text type="secondary">
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </Text>
        </Col>
      </Row>
      
      {dateRange[0] && dateRange[1] && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <Tag color="blue">
            <CalendarOutlined /> Date range: {dateRange[0].format('YYYY-MM-DD')} to {dateRange[1].format('YYYY-MM-DD')}
          </Tag>
        </div>
      )}
      
      {searchTerm && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <Tag color="green">
            <SearchOutlined /> Searching for: "{searchTerm}"
          </Tag>
        </div>
      )}
    </>
  );
};

export default SearchFilters;