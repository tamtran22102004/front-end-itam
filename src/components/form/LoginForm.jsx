import React from "react";
import { Button, Checkbox, Form, Input } from "antd";
import "../../styles/LoginForm.css"; // import CSS riêng

const LoginForm = ({ onSubmit, loading }) => {
  return (
    <Form
      name="login"
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 16 }}
      className="login-form"  // thay vì inline style
      initialValues={{ remember: true }}
      onFinish={onSubmit}
      autoComplete="off"
    >
      {/* Email */}
      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: "Vui lòng nhập email!" },
          { type: "email", message: "Email không hợp lệ!" },
        ]}
      >
        <Input />
      </Form.Item>

      {/* Password */}
      <Form.Item
        label="Mật khẩu"
        name="password"
        rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
      >
        <Input.Password />
      </Form.Item>

      {/* Remember me */}
      <Form.Item
        name="remember"
        valuePropName="checked"
        wrapperCol={{ offset: 6, span: 16 }}
      >
        <Checkbox>Ghi nhớ đăng nhập</Checkbox>
      </Form.Item>

      {/* Submit */}
      <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
        <Button type="primary" htmlType="submit" loading={loading}>
          Đăng nhập
        </Button>
      </Form.Item>
    </Form>
  );
};

export default LoginForm;
