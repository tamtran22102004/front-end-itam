import React, { useState } from "react";
import axios from "axios";
import { message } from "antd";
import LoginForm from "../components/form/LoginForm";

const LoginPage = () => {
  const API_URL = import.meta.env.VITE_BACKEND_URL;
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    try {
      setLoading(true);

      const res = await axios.post(
        `${API_URL}/api/login`,
        {
          email: values.email,
          password: values.password,
        },
        { withCredentials: true } // ✅ đây là object cấu hình, không phải ngoặc riêng
      );
      console.log("Login response:", res.data.data.user);
      message.success(res.data.message || "Đăng nhập thành công!");

      // ✅ lưu token (và user nếu backend trả về)
      if (res.data.data.token) {
        localStorage.setItem("token", res.data.data.token);
      }
      if (res.data.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
      }
      window.location.href = "/";
    } catch (err) {
      message.error(err.response?.data?.message || "Đăng nhập thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <LoginForm onSubmit={handleLogin} loading={loading} />
    </div>
  );
};

export default LoginPage;
