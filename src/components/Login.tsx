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
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUsername } = useAuth();
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
      setUsername(extractedUsername);
      
      // Store the user's UID as the doctorId in localStorage
      // This assumes that the authenticated user is a doctor
      localStorage.setItem('doctorId', userCredential.user.uid);
      
      message.success('Login Successful');
      navigate('/dashboard');
    } catch (error: any) {
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