import React, { useState } from 'react';
import { 
  Row, 
  Col, 
  Typography, 
  Form, 
  Input, 
  Checkbox, 
  Button, 
  message 
} from 'antd';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

interface LocationState {
  from?: {
    pathname?: string;
  };
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { login } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        values.email, 
        values.password
      );
      
      // Extract username from email or set a default
      const extractedUsername = values.email.split('@')[0];
      
      // Use the login function from context instead of just setUsername
      login(extractedUsername);
      
      // The Firebase UID is the assistant_id, not the doctor_id
      const assistantId = userCredential.user.uid.trim(); // Trim any whitespace
      console.log('Firebase UID (assistant_id):', assistantId);
      
      // Store assistant_id in localStorage
      localStorage.setItem('assistantId', assistantId);
      
      // Dispatch event to notify components that assistantId has changed
      window.dispatchEvent(new Event('assistantIdChanged'));
      
      // Fetch doctor_id from Firebase /doctor_clinic_assistant collection
      // The document ID might be the assistant_id, or we need to query by assistant_id field
      const db = getFirestore();
      
      // Try two approaches:
      // 1. Query by assistant_id field (trimmed and with trailing space for compatibility)
      const doctorClinicAssistantRef = collection(db, 'doctor_clinic_assistant');
      const assistantQuery = query(doctorClinicAssistantRef, where('assistant_id', '==', assistantId));
      const assistantSnapshot = await getDocs(assistantQuery);
      
      // Also try with trailing space (in case Firebase stores it with space)
      let assistantSnapshotWithSpace = null;
      if (assistantSnapshot.empty) {
        const assistantQueryWithSpace = query(doctorClinicAssistantRef, where('assistant_id', '==', assistantId + ' '));
        assistantSnapshotWithSpace = await getDocs(assistantQueryWithSpace);
      }
      
      console.log('Query results count:', assistantSnapshot.size);
      if (assistantSnapshotWithSpace) {
        console.log('Query results count (with space):', assistantSnapshotWithSpace.size);
      }
      
      let doctorId: string | null = null;
      let clinicId: string | null = null;
      
      // Use the snapshot that has results
      const finalSnapshot = !assistantSnapshot.empty ? assistantSnapshot : assistantSnapshotWithSpace;
      
      if (finalSnapshot && !finalSnapshot.empty) {
        // Get the first document (assistant should have one assignment)
        const assistantDoc = finalSnapshot.docs[0];
        const assistantData = assistantDoc.data();
        console.log('Assistant document data:', assistantData);
        
        // Extract doctor_id and clinic_id from the document (trim any whitespace)
        doctorId = assistantData.doctor_id?.trim() || assistantData.doctor_id;
        clinicId = assistantData.clinic_id?.trim() || assistantData.clinic_id;
      } else {
        // Try approach 2: The document ID might be the assistant_id itself
        console.log('Trying to get document by ID:', assistantId);
        const assistantDocRef = doc(db, 'doctor_clinic_assistant', assistantId);
        const assistantDocSnap = await getDoc(assistantDocRef);
        
        if (assistantDocSnap.exists()) {
          const assistantData = assistantDocSnap.data();
          console.log('Assistant document data (by ID):', assistantData);
          doctorId = assistantData.doctor_id;
          clinicId = assistantData.clinic_id;
        } else {
          console.error('No assistant document found with ID:', assistantId);
          // List all documents in the collection for debugging
          const allDocs = await getDocs(doctorClinicAssistantRef);
          console.log('All documents in doctor_clinic_assistant collection:');
          allDocs.forEach((docSnap) => {
            console.log('Document ID:', docSnap.id, 'Data:', docSnap.data());
          });
        }
      }
      
      if (doctorId) {
        // Store doctor_id in localStorage (this is what we need for API calls)
        localStorage.setItem('doctorId', doctorId);
        console.log('Successfully stored doctor_id:', doctorId);
        
        // Dispatch custom event to notify components that doctorId has changed
        window.dispatchEvent(new Event('doctorIdChanged'));
      } else {
        console.error('doctor_id not found in assistant document');
        message.error('Doctor ID not found. Please contact administrator.');
        setLoading(false);
        return;
      }
      
      // Optionally store clinic_id if not already set
      if (clinicId && !localStorage.getItem('clinicId')) {
        localStorage.setItem('clinicId', clinicId);
        console.log('Stored clinic_id:', clinicId);
      }
      
      message.success('Login Successful');
      
      // Navigate to the intended location or default to dashboard
      const from = state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.message || 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="min-h-screen">
      <Col 
        xs={0} 
        md={12} 
        className="bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.webp)',
          backgroundSize: 'cover'
        }}
      />
      <Col 
        xs={24} 
        md={12} 
        className="flex items-center justify-center p-8"
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Title level={3}>Welcome Back</Title>
            <Text type="secondary">Please enter your credentials</Text>
          </div>

          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
          >
            <Form.Item
              name="email"
              rules={[{ 
                required: true, 
                message: 'Please input your email!',
                type: 'email' 
              }]}
            >
              <Input 
                size="large" 
                placeholder="Email address" 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ 
                required: true, 
                message: 'Please input your password!' 
              }]}
            >
              <Input.Password 
                size="large" 
                placeholder="Password" 
              />
            </Form.Item>

            <div className="flex justify-between items-center mb-6">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Remember me</Checkbox>
              </Form.Item>
              <Link href="#">Forgot password?</Link>
            </div>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                size="large"
                loading={loading}
              >
                Login
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center">
            <Text>
              Don't have an account? <Link href="/register" type="danger">Register</Link>
            </Text>
          </div>
        </div>
      </Col>

      <Col span={24} className="bg-primary text-white py-4 text-center">
        <Text className="text-white">
          © {new Date().getFullYear()} All rights reserved.
        </Text>
      </Col>
    </Row>
  );
};

export default LoginPage;