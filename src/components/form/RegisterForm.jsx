import React from "react";
import { Button, Form, Input } from "antd";
import "../../styles/RegisterForm.css"; // import CSS riêng

const RegisterForm = ({ onSubmit }) => {
  return (
    <Form
      name="register"
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 16 }}
      className="register-form"   // thay inline style bằng class
      onFinish={onSubmit}
      autoComplete="off"
    >
      {/* Fullname */}
      <Form.Item
        label="Họ tên"
        name="fullname"
        rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
      >
        <Input />
      </Form.Item>

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

      {/* Phone */}
      <Form.Item
        label="Số điện thoại"
        name="phone"
        rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}
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

      {/* Confirm Password */}
      <Form.Item
        label="Xác nhận"
        name="confirmPassword"
        dependencies={["password"]}
        rules={[
          { required: true, message: "Vui lòng xác nhận mật khẩu!" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
                return Promise.resolve();
              }
              return Promise.reject(
                new Error("Mật khẩu xác nhận không khớp!")
              );
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>

      {/* Submit */}
      <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
        <Button type="primary" htmlType="submit">
          Đăng ký
        </Button>
      </Form.Item>
    </Form>
  );
};

export default RegisterForm;
