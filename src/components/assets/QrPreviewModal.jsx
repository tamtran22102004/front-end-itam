// components/assets/QrPreviewModal.jsx
import { Modal, Button, Space, Typography, Image, message } from "antd";

const { Text } = Typography;
const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function QrPreviewModal({
  open,
  onClose,
  token,
  title,
  size = 512,
  assetId,
}) {
  const imgSrc = assetId
    ? `${API_URL}/api/qr/${encodeURIComponent(assetId)}/qr.png`
    : ""; // fallback nếu chưa có assetId

  const copyLink = async () => {
    await navigator.clipboard.writeText(imgSrc);
    message.success("Đã copy link ảnh");
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={`QR – ${title || ""}`}
      width={size + 160}
    >
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        {assetId ? (
          <Image
            src={imgSrc}
            alt="QR code"
            width={size}
            height={size}
            preview={false}
          />
        ) : (
          <Text type="secondary">Chưa có dữ liệu</Text>
        )}
      </div>

      {assetId && (
        <>
          <div
            style={{
              wordBreak: "break-all",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            <Text type="secondary">Token:</Text>
            <br />
            <Text code>{token}</Text>
          </div>
          <Space
            wrap
            style={{ display: "flex", justifyContent: "center" }}
          >
            <Button onClick={copyLink}>📋 Copy link ảnh</Button>
            <a href={imgSrc} target="_blank" rel="noreferrer">
              <Button type="primary">🖼️ Mở PNG</Button>
            </a>
          </Space>
        </>
      )}
    </Modal>
  );
}
