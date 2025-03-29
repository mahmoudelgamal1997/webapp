// PatientsList.tsx
import React from 'react';
import { Table } from 'antd';
import { SortOrder } from 'antd/lib/table/interface';
import moment from 'moment';
import { Patient } from '../components/type';
import SearchFilters from './SearchFilters';
import { usePatientContext } from './PatientContext';

const PatientsList: React.FC = () => {
  const { filteredPatients, setSelectedPatient, forceRender } = usePatientContext();

  // Define columns for the patient table
  const columns = [
    {
      title: 'Name',
      dataIndex: 'patient_name',
      key: 'name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => (
        <span>{text ? moment(text).format('YYYY-MM-DD') : 'N/A'}</span>
      ),
      sorter: (a: Patient, b: Patient) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        // If dates are different, sort by date
        if (dateA !== dateB) {
          return dateB - dateA;
        }
        
        // If dates are the same, sort by _id
        if (a._id && b._id) {
          return b._id.localeCompare(a._id);
        }
        
        return 0;
      },
      defaultSortOrder: 'ascend' as SortOrder,
      sortDirections: ['ascend', 'ascend'] as SortOrder[]
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: string, record: Patient) => (
        <a 
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click from triggering
            setSelectedPatient(record);
          }}
        >
          View Details
        </a>
      ),
    }
  ];

  // Sorting function
  const sortByLatestDate = (data: Patient[]) => {
    return [...data].sort((a: Patient, b: Patient) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      
      if (a._id && b._id) {
        return b._id.localeCompare(a._id);
      }
      
      return 0;
    });
  };

  return (
    <>
      <SearchFilters />
      
      <Table 
        columns={columns} 
        dataSource={filteredPatients}
        rowKey="_id"
        pagination={{ defaultPageSize: 10 }}
        onChange={() => {
          // This is just to maintain consistent rendering with the original code
        }}
        style={{ marginTop: 16 }}
        onRow={(record) => ({
          onClick: () => {
            setSelectedPatient(record);
          },
          style: { cursor: 'pointer' }
        })}
      />
    </>
  );
};

export default PatientsList;