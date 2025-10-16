import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Space,
  Card,
  Popconfirm,
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Option } = Select;

const AssetPage = () => {
  const [form] = Form.useForm();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [itemMasters, setItemMasters] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [detailAsset, setDetailAsset] = useState(null);

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // ✅ Fetch dữ liệu
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/items/asset`);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setAssets(data);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách tài sản");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category`);
      setCategories(res.data.data || []);
    } catch {
      message.error("Không thể tải danh mục");
    }
  };

  const fetchItemMasters = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/items`);
      setItemMasters(res.data.data || []);
    } catch {
      message.error("Không thể tải ItemMaster");
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vendor`);
      setVendors(res.data.data || []);
    } catch {
      message.error("Không thể tải nhà cung cấp");
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchCategories();
    fetchItemMasters();
    fetchVendors();
  }, []);

  // ✅ Submit form
  const onFinish = async (values) => {
    try {
      const payload = {
        ...values,
        PurchaseDate: values.PurchaseDate
          ? dayjs(values.PurchaseDate).format("YYYY-MM-DD")
          : null,
        WarrantyStartDate: values.WarrantyStartDate
          ? dayjs(values.WarrantyStartDate).format("YYYY-MM-DD")
          : null,
        WarrantyEndDate: values.WarrantyEndDate
          ? dayjs(values.WarrantyEndDate).format("YYYY-MM-DD")
          : null,
      };

      if (editingAsset) {
        await axios.post(
          `${API_URL}/api/items/asset/update/${editingAsset.ID}`,
          payload
        );
        message.success("Cập nhật Asset thành công!");
      } else {
        await axios.post(`${API_URL}/api/items/asset/add`, payload);
        message.success("Thêm Asset thành công!");
      }
      setOpenModal(false);
      form.resetFields();
      fetchAssets();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Lỗi khi lưu Asset");
    }
  };

  // ✅ Xóa asset
  const handleDelete = async (id) => {
    try {
      await axios.post(`${API_URL}/api/items/asset/delete/${id}`);
      message.success("Xóa tài sản thành công!");
      fetchAssets();
    } catch {
      message.error("Không thể xóa tài sản");
    }
  };

  // ✅ Cột bảng
  const columns = [
    { title: "ID", dataIndex: "ID", key: "ID", width: 200 },
    { title: "Tên thiết bị", dataIndex: "Name", key: "Name", width: 180 },
    { title: "Mã nội bộ", dataIndex: "ManageCode", key: "ManageCode" },
    { title: "Mã kế toán", dataIndex: "AssetCode", key: "AssetCode" },
    {
      title: "Danh mục",
      dataIndex: "CategoryID",
      key: "CategoryID",
      render: (id) => categories.find((c) => c.ID === id)?.Name || "—",
    },
    {
      title: "ItemMaster",
      dataIndex: "ItemMasterID",
      key: "ItemMasterID",
      render: (id) => itemMasters.find((i) => i.ID === id)?.Name || "—",
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "VendorID",
      key: "VendorID",
      render: (id) => vendors.find((v) => v.ID === id)?.Name || "—",
    },
    { title: "Ngày mua", dataIndex: "PurchaseDate", key: "PurchaseDate" },
    { title: "Giá mua", dataIndex: "PurchasePrice", key: "PurchasePrice" },
    { title: "Mã phiếu mua", dataIndex: "PurchaseId", key: "PurchaseId" },
    {
      title: "Bắt đầu BH",
      dataIndex: "WarrantyStartDate",
      key: "WarrantyStartDate",
    },
    {
      title: "Kết thúc BH",
      dataIndex: "WarrantyEndDate",
      key: "WarrantyEndDate",
    },
    { title: "Số tháng BH", dataIndex: "WarrantyMonth", key: "WarrantyMonth" },
    { title: "SerialNumber", dataIndex: "SerialNumber", key: "SerialNumber" },
    { title: "EmployeeID", dataIndex: "EmployeeID", key: "EmployeeID" },
    { title: "SectionID", dataIndex: "SectionID", key: "SectionID" },
    { title: "Số lượng", dataIndex: "Quantity", key: "Quantity" },
    { title: "QR Code", dataIndex: "QRCode", key: "QRCode" },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      key: "Status",
      render: (s) =>
        ({
          1: "Sẵn sàng",
          2: "Đang dùng",
          3: "Bảo hành",
          4: "Sửa chữa",
          5: "Hủy",
          6: "Thanh lý",
        }[s] || "Không rõ"),
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setDetailAsset(record)}
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              const recordWithDayjs = {
                ...record,
                PurchaseDate: record.PurchaseDate
                  ? dayjs(record.PurchaseDate)
                  : null,
                WarrantyStartDate: record.WarrantyStartDate
                  ? dayjs(record.WarrantyStartDate)
                  : null,
                WarrantyEndDate: record.WarrantyEndDate
                  ? dayjs(record.WarrantyEndDate)
                  : null,
              };
              setEditingAsset(record);
              form.setFieldsValue(recordWithDayjs);
              setOpenModal(true);
            }}
          />

          <Popconfirm
            title="Bạn có chắc muốn xóa tài sản này?"
            onConfirm={() => handleDelete(record.ID)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Quản lý Tài sản (Asset)"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAssets}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAsset(null);
              form.resetFields();
              setOpenModal(true);
            }}
          >
            Thêm mới
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={assets}
        rowKey={(r) => r.ID}
        loading={loading}
        pagination={{ pageSize: 8 }}
        scroll={{ x: "max-content" }} // ✅ co giãn theo nội dung, không cứng 1800px
        tableLayout="auto" // ✅ cho phép cột tự điều chỉnh
        bordered // ✅ có đường viền gọn
        size="middle" // ✅ chiều cao hàng hợp lý
      />

      {/* ✅ Modal thêm/sửa */}
      <Modal
        title={editingAsset ? "Cập nhật Asset" : "Thêm Asset mới"}
        open={openModal}
        onCancel={() => setOpenModal(false)}
        footer={null}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Tên thiết bị"
            name="Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Mã quản lý nội bộ"
            name="ManageCode"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Mã tài sản kế toán" name="AssetCode">
            <Input />
          </Form.Item>

          <Form.Item
            label="Danh mục"
            name="CategoryID"
            rules={[{ required: true }]}
          >
            <Select placeholder="Chọn danh mục">
              {categories.map((c) => (
                <Option key={c.ID} value={c.ID}>
                  {c.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Thuộc dòng ItemMaster" name="ItemMasterID">
            <Select placeholder="Chọn ItemMaster">
              {itemMasters.map((i) => (
                <Option key={i.ID} value={i.ID}>
                  {i.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Nhà cung cấp" name="VendorID">
            <Select placeholder="Chọn Vendor">
              {vendors.map((v) => (
                <Option key={v.ID} value={v.ID}>
                  {v.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Ngày mua" name="PurchaseDate">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="Giá mua" name="PurchasePrice">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Mã phiếu mua" name="PurchaseId">
            <Input />
          </Form.Item>

          <Form.Item label="Ngày bảo hành bắt đầu" name="WarrantyStartDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Ngày kết thúc bảo hành" name="WarrantyEndDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Tổng tháng bảo hành" name="WarrantyMonth">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="SerialNumber" name="SerialNumber">
            <Input />
          </Form.Item>
          <Form.Item label="EmployeeID (nếu có)" name="EmployeeID">
            <Input />
          </Form.Item>
          <Form.Item label="SectionID (nếu có)" name="SectionID">
            <Input />
          </Form.Item>
          <Form.Item label="Số lượng" name="Quantity" initialValue={1}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="QR Code" name="QRCode">
            <Input />
          </Form.Item>

          <Form.Item label="Trạng thái" name="Status" initialValue={1}>
            <Select>
              <Option value={1}>Sẵn sàng</Option>
              <Option value={2}>Đang dùng</Option>
              <Option value={3}>Bảo hành</Option>
              <Option value={4}>Sửa chữa</Option>
              <Option value={5}>Hủy</Option>
              <Option value={6}>Thanh lý</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ textAlign: "right" }}>
            <Button onClick={() => setOpenModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
              {editingAsset ? "Cập nhật" : "Lưu"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ✅ Modal xem chi tiết */}
      <Modal
        title="Chi tiết tài sản"
        open={!!detailAsset}
        onCancel={() => setDetailAsset(null)}
        footer={[
          <Button key="close" onClick={() => setDetailAsset(null)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {detailAsset && (
          <Descriptions bordered column={1}>
            {Object.entries(detailAsset).map(([k, v]) => (
              <Descriptions.Item key={k} label={k}>
                {v?.toString() || "—"}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default AssetPage;
