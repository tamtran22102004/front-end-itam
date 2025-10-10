import React, { useState } from 'react';
import axios from 'axios';
import { message } from 'antd';
import RegisterForm from '../components/form/RegisterForm';
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
  const API_URL = import.meta.env.VITE_BACKEND_URL; 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (values) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/register`, {
        fullname: values.fullname,
        email: values.email,
        password: values.password,
        phone: values.phone,
      });

      message.success(res.data.message || 'Đăng ký thành công!');
    navigate("/login"); // 👉 điều hướng tại đây

    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng ký thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginTop: '20px' }}>Đăng Ký</h2>   
      <RegisterForm onSubmit={handleRegister} loading={loading} />
    </div>
  );
};

export default RegisterPage;
