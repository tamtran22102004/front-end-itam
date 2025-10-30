import { useState } from "react";
import { Button, Space, message, Tooltip, Image } from "antd";
import {
  QrcodeOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function AssetQrSection({ assetId }) {
  const [png, setPng] = useState(null);
  const [loading, setLoading] = useState(false);

  const mintQr = async (force = false) => {
    setLoading(true);
    try {
      const url = `${API_URL}/api/qr/${assetId}/mint-qr${
        force ? "?force=1" : ""
      }`;
      const resp = await axios.post(
        url,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      setPng(resp?.data?.data?.pngBase64 || null);
      message.success(
        force ? "Cấp lại QR thành công" : "Tạo/hiển thị QR thành công"
      );
    } catch (e) {
      message.error(e?.response?.data?.message || "Không tạo được QR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Space wrap>
        <Button
          icon={<QrcodeOutlined />}
          loading={loading}
          onClick={() => mintQr(false)}
        >
          Tạo/hiển thị QR
        </Button>
        <Tooltip title="Rotate token: vô hiệu mã cũ, cấp mã mới">
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => mintQr(true)}
          >
            Force re-mint
          </Button>
        </Tooltip>
        <a
          href={`${API_URL}/api/qr/${assetId}/qr.png`}
          target="_blank"
          rel="noreferrer"
        >
          <Button icon={<DownloadOutlined />}>Tải PNG</Button>
        </a>
      </Space>

      {png && (
        <div style={{ width: 220 }}>
          <Image src={png} alt="asset-qr" width="100%" />
        </div>
      )}
    </div>
  );
}
