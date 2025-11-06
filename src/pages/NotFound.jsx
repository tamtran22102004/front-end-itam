import React from "react";
import { Result, Button } from "antd";
import {
  useNavigate,
  useRouteError,
  isRouteErrorResponse,
} from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  const err = useRouteError();

  let status = 404;
  let title = "404";
  let subTitle = "Trang bạn truy cập không tồn tại hoặc đã được di chuyển.";

  if (isRouteErrorResponse(err)) {
    status = err.status;
    if (status === 401) {
      title = "401";
      subTitle = "Bạn chưa được phép truy cập trang này.";
    } else if (status === 403) {
      title = "403";
      subTitle = "Bạn không có quyền truy cập trang này.";
    } else if (status !== 404) {
      title = String(status);
      subTitle = err.statusText || "Đã có lỗi xảy ra.";
    }
  }

  return (
    <Result
      status={String(status)}
      title={title}
      subTitle={subTitle}
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
  );
}
