import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Spin,
  message,
  Input,
  Button,
  Popconfirm,
  Space,
  Modal,
  Form,
  Select,
  Row,
  Col,
  Badge,
  Empty,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  SettingOutlined,
  ReloadOutlined,
  SearchOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Option } = Select;

const STATUS_MAP = {
  1: ["green", "Sẵn sàng"],
  2: ["blue", "Đang sử dụng"],
  3: ["orange", "Bảo hành"],
  4: ["volcano", "Sửa chữa"],
  5: ["red", "Hủy"],
  6: ["purple", "Thanh lý"],
};
const statusTag = (status) => {
  const [color, text] = STATUS_MAP[status] || ["default", "Không xác định"];
  return <Tag color={color}>{text}</Tag>;
};

const AssetConfigPage = () => {
  const [loading, setLoading] = useState(true);
  const [assetData, setAssetData] = useState([]);

  // filters (chỉ ở danh sách)
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(undefined);

  // inline edit
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Modal cấu hình 1 Asset
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Modal thêm cấu hình
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();

  // Thuộc tính global
  const [attributes, setAttributes] = useState([]);
  const [attrLoading, setAttrLoading] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/asset/assetconfig`);
      if (res.data?.success) setAssetData(res.data.data || []);
      else message.error(res.data?.message || "Không thể lấy dữ liệu.");
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải dữ liệu cấu hình.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributes = async () => {
    setAttrLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/attribute/attributeDetail`);
      if (res.data?.success) setAttributes(res.data.data || []);
      else message.error("Không thể tải danh sách thuộc tính");
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải danh sách thuộc tính");
    } finally {
      setAttrLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAttributes();
  }, []);

  // sync modal khi list refresh
  useEffect(() => {
    if (!selectedAsset) return;
    const found = assetData.find((x) => x.Asset.ID === selectedAsset.Asset.ID);
    if (found) setSelectedAsset(found);
  }, [assetData]); // eslint-disable-line

  // CRUD
  const handleAdd = async (values) => {
    try {
      const res = await axios.post(`${API_URL}/api/asset/assetconfig/add`, {
        AssetID: selectedAsset.Asset.ID,
        AttributeID: values.AttributeID,
        Value: values.Value?.trim() || null,
      });
      if (res.data?.success) {
        message.success("Thêm cấu hình thành công!");
        addForm.resetFields();
        setIsAddModalOpen(false);
        await fetchData();
      } else {
        message.error(res.data?.message || "Thêm thất bại.");
      }
    } catch (err) {
      console.error(err);
      message.error("Không thể thêm cấu hình.");
    }
  };

  const handleUpdate = async (ID, value) => {
    if (!ID) return message.warning("Không tìm thấy ID để cập nhật.");
    try {
      const res = await axios.post(`${API_URL}/api/asset/assetconfig/update`, {
        ID,
        Value: value?.trim() || null,
      });
      if (res.data?.success) {
        message.success("Cập nhật thành công!");
        await fetchData();
      } else {
        message.error(res.data?.message || "Cập nhật thất bại.");
      }
    } catch (err) {
      console.error(err);
      message.error("Không thể cập nhật cấu hình.");
    } finally {
      setEditingKey(null);
      setEditValue("");
    }
  };

  const handleDelete = async (ID) => {
    if (!ID) return message.warning("Không tìm thấy ID để xóa.");
    try {
      const res = await axios.post(
        `${API_URL}/api/asset/assetconfig/delete/${ID}`
      );
      if (res.data?.success) {
        message.success("Xóa cấu hình thành công!");
        await fetchData();
      } else {
        message.error(res.data?.message || "Xóa thất bại.");
      }
    } catch (err) {
      console.error(err);
      message.error("Không thể xóa cấu hình.");
    }
  };

  // lọc ở danh sách (cards)
  const filteredAssets = useMemo(() => {
    let list = Array.isArray(assetData) ? [...assetData] : [];
    if (q.trim()) {
      const kw = q.trim().toLowerCase();
      list = list.filter((it) => {
        const a = it.Asset || {};
        return (
          (a.Name || "").toLowerCase().includes(kw) ||
          (a.ManageCode || "").toLowerCase().includes(kw) ||
          (a.AssetCode || "").toLowerCase().includes(kw) ||
          (a.SerialNumber || "").toLowerCase().includes(kw)
        );
      });
    }
    if (statusFilter !== undefined && statusFilter !== null) {
      list = list.filter(
        (it) => Number(it.Asset?.Status) === Number(statusFilter)
      );
    }
    list.sort((x, y) =>
      (x.Asset?.Name || "").localeCompare(y.Asset?.Name || "")
    );
    return list;
  }, [assetData, q, statusFilter]);

  const resetFilters = () => {
    setQ("");
    setStatusFilter(undefined);
  };

  const getStatusTag = (s) => statusTag(s);
  const countConfigured = (it) =>
    (it.Attributes || []).filter((x) => !!x.ID).length;

  // columns của bảng trong modal
  const columns = (assetItem) => [
    {
      title: "Thuộc tính",
      dataIndex: "Name",
      width: "26%",
      ellipsis: true,
      sorter: (a, b) => (a.Name || "").localeCompare(b.Name || ""),
    },
    {
      title: "Giá trị",
      dataIndex: "Value",
      render: (text, record) => {
        const rowKey =
          record.ID ?? `${assetItem.Asset.ID}-${record.AttributeID}`;
        const isEditing = editingKey === rowKey;
        return isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Nhập giá trị..."
            onPressEnter={() => handleUpdate(record.ID, editValue)}
            autoFocus
          />
        ) : text ? (
          text
        ) : (
          <Tag color="default" style={{ opacity: 0.7 }}>
            (Chưa cấu hình)
          </Tag>
        );
      },
    },
    {
      title: "Đơn vị đo",
      dataIndex: "Unit",
      align: "center",
      width: 120,
      render: (u) => u || "—",
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 160,
      render: (_, record) => {
        const rowKey =
          record.ID ?? `${assetItem.Asset.ID}-${record.AttributeID}`;
        const isEditing = editingKey === rowKey;
        const hasConfig = !!record.ID;

        return (
          <Space>
            {isEditing ? (
              <>
                <Button
                  type="link"
                  icon={<CheckOutlined />}
                  onClick={() => handleUpdate(record.ID, editValue)}
                />
                <Button
                  type="link"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setEditingKey(null);
                    setEditValue("");
                  }}
                />
              </>
            ) : (
              <>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingKey(rowKey);
                    setEditValue(record.Value || "");
                  }}
                  disabled={!hasConfig}
                />
                <Popconfirm
                  title="Xác nhận xóa cấu hình này?"
                  onConfirm={() => handleDelete(record.ID)}
                  okText="Xóa"
                  cancelText="Hủy"
                  disabled={!hasConfig}
                >
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!hasConfig}
                  />
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  return (
    <div className="p-4">
  <Card
    title="Cấu hình kỹ thuật theo tài sản"
    extra={
      <Space wrap>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm Tên / Mã nội bộ / Mã TS / Serial…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 320 }}
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 180 }}
        >
          <Option value={1}>Sẵn sàng</Option>
          <Option value={2}>Đang sử dụng</Option>
          <Option value={3}>Bảo hành</Option>
          <Option value={4}>Sửa chữa</Option>
          <Option value={5}>Hủy</Option>
          <Option value={6}>Thanh lý</Option>
        </Select>
        <Button icon={<CloseCircleOutlined />} onClick={resetFilters}>
          Xóa lọc
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>
          Làm mới
        </Button>
        <Tag style={{ marginLeft: 8 }}>
          Hiển thị {filteredAssets.length}/{assetData.length}
        </Tag>
      </Space>
    }
    style={{ marginBottom: 16, borderRadius: 12 }}
  >
    {/* 👇 Toàn bộ phần hiển thị asset đưa vào trong Card */}
    {filteredAssets?.length ? (
      <Row gutter={[16, 16]}>
        {filteredAssets.map((it) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={6} key={it.Asset.ID}>
            <Badge.Ribbon text={it.Asset.ManageCode} color="geekblue">
              <Card
                hoverable
                onClick={() => {
                  setSelectedAsset(it);
                  setIsConfigModalOpen(true);
                  setModalQ("");
                  setShowAllAttrs(false);
                  setEditingKey(null);
                  setEditValue("");
                }}
                actions={[
                  <Space key="cfg">
                    <SettingOutlined />
                    Cấu hình
                  </Space>,
                  <Space
                    key="add"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAsset(it);
                      setIsConfigModalOpen(true);
                      setIsAddModalOpen(true);
                    }}
                  >
                    <PlusOutlined />
                    Thêm
                  </Space>,
                ]}
                style={{ borderRadius: 12, minHeight: 160 }}
              >
                <div className="flex items-start justify-between">
                  <div
                    style={{
                      fontWeight: 600,
                      maxWidth: "75%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={it.Asset.Name}
                  >
                    {it.Asset.Name}
                  </div>
                  {getStatusTag(it.Asset.Status)}
                </div>

                <div style={{ marginTop: 8, opacity: 0.8 }}>
                  <div>Mã TS: {it.Asset.AssetCode || "—"}</div>
                  <div>Đã cấu hình: {countConfigured(it)} thuộc tính</div>
                </div>
              </Card>
            </Badge.Ribbon>
          </Col>
        ))}
      </Row>
    ) : (
      <Empty description="Không có thiết bị phù hợp" />
    )}
  </Card>

      {/* MODAL CHÍNH: chỉ hiển thị các cấu hình đã có (có ID) */}
      <Modal
        title={
          selectedAsset ? (
            <Space wrap>
              <b>{selectedAsset.Asset.Name}</b> — {selectedAsset.Asset.ManageCode}{" "}
              {statusTag(selectedAsset.Asset.Status)}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsAddModalOpen(true)}
              >
                Thêm cấu hình
              </Button>
            </Space>
          ) : (
            "Chi tiết cấu hình"
          )
        }
        open={isConfigModalOpen}
        onCancel={() => {
          setIsConfigModalOpen(false);
          setEditingKey(null);
          setEditValue("");
        }}
        footer={null}
        width={960}
        destroyOnClose
      >
        {selectedAsset && (
          <>
            <Descriptions bordered column={2} size="small" className="mb-4">
              <Descriptions.Item label="Mã tài sản">
                {selectedAsset.Asset.AssetCode || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Mã quản lý nội bộ">
                {selectedAsset.Asset.ManageCode || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Tên thiết bị" span={2}>
                {selectedAsset.Asset.Name}
              </Descriptions.Item>
            </Descriptions>

            <Table
              dataSource={(selectedAsset.Attributes || []).filter((r) => !!r.ID)}
              pagination={{ pageSize: 10 }}
              rowKey={(r) => r.ID} // chỉ dùng ID (đảm bảo đã có)
              columns={columns(selectedAsset)}
              size="middle"
              bordered
            />
          </>
        )}
      </Modal>

      {/* SUB-MODAL: Thêm cấu hình */}
      <Modal
        title="Thêm cấu hình mới"
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        onOk={() => addForm.submit()}
        okText="Thêm"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Form.Item
            label="Thuộc tính"
            name="AttributeID"
            rules={[{ required: true, message: "Chọn thuộc tính!" }]}
          >
            <Select
              showSearch
              allowClear
              loading={attrLoading}
              placeholder="Chọn thuộc tính (có thể chọn lại để thêm lần 2)"
              optionFilterProp="label"
              options={(attributes || []).map((a) => ({
                value: a.ID,
                label: a.MeasurementUnit
                  ? `${a.Name} (${a.MeasurementUnit})`
                  : a.Name,
              }))}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.AttributeID !== curr.AttributeID}
          >
            {({ getFieldValue }) => {
              const selId = getFieldValue("AttributeID");
              const meta = (attributes || []).find((x) => x.ID === selId) || {};
              const unit = meta?.MeasurementUnit || meta?.Unit || undefined;
              const placeholder = meta?.Name
                ? `Nhập ${meta.Name}${unit ? ` (${unit})` : ""}`
                : "Nhập giá trị cấu hình";
              return (
                <Form.Item
                  label="Giá trị"
                  name="Value"
                  rules={[{ required: true, message: "Nhập giá trị!" }]}
                >
                  <Input placeholder={placeholder} addonAfter={unit} />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AssetConfigPage;
