import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API from '../config/api';
import { useClinicContext } from './ClinicContext';
import { useDoctorContext } from './DoctorContext';

interface InventoryItem {
    _id: string;
    clinic_id: string;
    doctor_id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    purchasePrice: number;
    supplier?: string;
    expirationDate?: string;
    minStockLevel: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface InventoryContextType {
    items: InventoryItem[];
    loading: boolean;
    fetchItems: () => Promise<void>;
    addItem: (item: Partial<InventoryItem>) => Promise<void>;
    updateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    recordUsage: (id: string, patientId: string, quantity: number, notes?: string) => Promise<void>;
    getLowStockItems: () => InventoryItem[];
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { selectedClinicId } = useClinicContext();
    const { doctorId } = useDoctorContext();

    const fetchItems = async () => {
        if (!selectedClinicId) return;

        try {
            setLoading(true);
            const response = await axios.get(`${API.BASE_URL}/api/inventory/${selectedClinicId}`);
            setItems(response.data.items || []);
        } catch (error) {
            console.error('Error fetching inventory items:', error);
        } finally {
            setLoading(false);
        }
    };

    const addItem = async (item: Partial<InventoryItem>) => {
        try {
            const response = await axios.post(`${API.BASE_URL}/api/inventory`, {
                ...item,
                clinic_id: selectedClinicId,
                doctor_id: doctorId
            });
            await fetchItems();
        } catch (error) {
            console.error('Error adding inventory item:', error);
            throw error;
        }
    };

    const updateItem = async (id: string, item: Partial<InventoryItem>) => {
        try {
            await axios.put(`${API.BASE_URL}/api/inventory/${id}`, item);
            await fetchItems();
        } catch (error) {
            console.error('Error updating inventory item:', error);
            throw error;
        }
    };

    const deleteItem = async (id: string) => {
        try {
            await axios.delete(`${API.BASE_URL}/api/inventory/${id}`);
            await fetchItems();
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            throw error;
        }
    };

    const recordUsage = async (id: string, patientId: string, quantity: number, notes?: string) => {
        try {
            await axios.post(`${API.BASE_URL}/api/inventory/${id}/use`, {
                patient_id: patientId,
                quantity,
                usedBy: doctorId,
                notes
            });
            await fetchItems();
        } catch (error) {
            console.error('Error recording usage:', error);
            throw error;
        }
    };

    const getLowStockItems = () => {
        return items.filter(item => item.quantity <= item.minStockLevel);
    };

    useEffect(() => {
        if (selectedClinicId) {
            fetchItems();
        }
    }, [selectedClinicId]);

    return (
        <InventoryContext.Provider
            value={{
                items,
                loading,
                fetchItems,
                addItem,
                updateItem,
                deleteItem,
                recordUsage,
                getLowStockItems
            }}
        >
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventoryContext = () => {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error('useInventoryContext must be used within InventoryProvider');
    }
    return context;
};
