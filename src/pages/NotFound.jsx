// src/pages/NotFound.jsx
import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 16 }}>
      <Result
        status="404"
        title="404"
        subTitle="Trang bạn truy cập không tồn tại hoặc đã được di chuyển."
        extra={
          <>
            <Button type="primary" onClick={() => navigate("/")}>
              Về trang chủ
            </Button>
            <Button onClick={() => navigate(-1)} style={{ marginLeft: 8 }}>
              Quay lại
            </Button>
          </>
        }
      />
    </div>
  );
}
