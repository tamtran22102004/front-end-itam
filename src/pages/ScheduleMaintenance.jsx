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
  Empty,
  DatePicker,
  InputNumber,
  TimePicker,
  Switch,
  Dropdown,
  Tooltip,
} from "antd";
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  StopOutlined,
  EyeOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Option } = Select;
const { confirm } = Modal;

const API_URL = import.meta.env.VITE_BACKEND_URL;
const SCHEDULE_BASE = `${API_URL}/api/maintenance/schedules`;
const ASSETS_API = `${API_URL}/api/asset`;
const USERS_API = `${API_URL}/api/getuserinfo`;

const PRIORITY_COLOR = { LOW: "default", MEDIUM: "processing", HIGH: "error" };
const STATUS_COLOR = { ACTIVE: "green", OVERDUE: "gold", COMPLETED: "default", CANCELLED: "red" };
const statusTag = (st) => <Tag color={STATUS_COLOR[st] || "default"}>{st || "-"}</Tag>;
const priorityTag = (p) => <Tag color={PRIORITY_COLOR[p] || "default"}>{p || "-"}</Tag>;

const pickArray = (res) => {
  const d = res?.data;
  if (Array.isArray(res)) return res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};
const fmtDate = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "—");
const fmtTime = (t) => (t ? String(t).slice(0, 8) : "—");

const buildAssetLabel = (a) => {
  const name = a.Name || a.AssetName || "";
  const code = a.ManageCode || a.AssetCode || "";
  if (name && code) return `${name} (${code})`;
  return name || code || a.ID || a.AssetID || "Asset";
};

const MaintenanceSchedulePage = () => {
  // list & selection
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  // meta
  const [assets, setAssets] = useState([]); // {value,label}
  const [employees, setEmployees] = useState([]); // {value,label}
  const [userMap, setUserMap] = useState({}); // id -> name

  // modal form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // ===== FETCHERS =====
  const fetchAssets = async () => {
    try {
      const res = await axios.get(ASSETS_API);
      const data = pickArray(res) || [];
      setAssets(
        data.map((a) => ({
          value: a.ID || a.Id || a.AssetID,
          label: buildAssetLabel(a),
        }))
      );
    } catch (e) {
      console.error(e);
      message.warning("Không tải được danh sách tài sản.");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(USERS_API);
      const list = (res?.data?.data || []).map((u) => ({
        value: Number(u.UserID),
        label: u.FullName || `User ${u.UserID}`,
      }));
      setEmployees(list);
      const map = {};
      list.forEach((u) => (map[u.value] = u.label));
      setUserMap(map);
    } catch (e) {
      console.error(e);
      message.warning("Không tải được danh sách người dùng.");
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await axios.get(SCHEDULE_BASE);
      setRows(pickArray(res) || []);
    } catch (e) {
      console.error(e);
      message.error("Không tải được danh sách lịch bảo trì.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchUsers();
    fetchSchedules();
  }, []);

  // ===== ACTIONS =====
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    // set default trong modal
    form.setFieldsValue({
      Priority: "MEDIUM",
      ReminderDaysBefore: 7,
      AutoCreateWorkOrder: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      AssetID: record.AssetID,
      AssignedToUserID: record.AssignedToUserID != null ? Number(record.AssignedToUserID) : undefined,
      IntervalMonths: record.IntervalMonths ?? undefined,
      NextMaintenanceDate: record.NextMaintenanceDate ? dayjs(record.NextMaintenanceDate) : null,
      ReminderDaysBefore: record.ReminderDaysBefore ?? 7,
      WindowStart: record.WindowStart ? dayjs(record.WindowStart, "HH:mm:ss") : null,
      WindowEnd: record.WindowEnd ? dayjs(record.WindowEnd, "HH:mm:ss") : null,
      EstimatedHours: record.EstimatedHours ?? undefined,
      Priority: record.Priority || "MEDIUM",
      Notes: record.Notes || "",
      AutoCreateWorkOrder: Boolean(record.AutoCreateWorkOrder ?? true),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        AssetID: v.AssetID,
        AssignedToUserID: v.AssignedToUserID != null ? Number(v.AssignedToUserID) : null,
        IntervalMonths: v.IntervalMonths ?? null,
        NextMaintenanceDate: v.NextMaintenanceDate?.format("YYYY-MM-DD"),
        ReminderDaysBefore: v.ReminderDaysBefore ?? 7,
        WindowStart: v.WindowStart ? v.WindowStart.format("HH:mm:ss") : null,
        WindowEnd: v.WindowEnd ? v.WindowEnd.format("HH:mm:ss") : null,
        EstimatedHours: v.EstimatedHours ?? null,
        Priority: v.Priority || "MEDIUM",
        Notes: v.Notes || null,
        AutoCreateWorkOrder: Boolean(v.AutoCreateWorkOrder ?? true),
      };

      setSaving(true);
      if (editing?.ScheduleID) {
        await axios.patch(`${SCHEDULE_BASE}/${editing.ScheduleID}`, payload);
        message.success("Cập nhật lịch thành công.");
      } else {
        await axios.post(SCHEDULE_BASE, payload);
        message.success("Tạo lịch thành công.");
      }
      setIsModalOpen(false);
      setEditing(null);
      form.resetFields();
      await fetchSchedules();
    } catch (e) {
      if (e?.errorFields) return; // lỗi validate của Ant
      console.error(e);
      message.error("Lưu lịch thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSchedule = async (record) => {
    await axios.patch(`${SCHEDULE_BASE}/${record.ScheduleID}`, { Cancel: true });
  };
  const handleGenerateWO = async (record) => {
    await axios.post(`${SCHEDULE_BASE}/${record.ScheduleID}/generate-wo`);
  };

  // ===== HELPERS (confirm wrappers) =====
  const confirmGenerate = (record) => {
    confirm({
      title: "Tạo Work Order cho kỳ hiện tại?",
      icon: <ExclamationCircleOutlined />,
      okText: "Tạo",
      cancelText: "Hủy",
      async onOk() {
        try {
          await handleGenerateWO(record);
          message.success("Đã tạo Work Order.");
        } catch (e) {
          console.error(e);
          message.error("Tạo Work Order thất bại.");
        }
      },
    });
  };

  const confirmCancel = (record) => {
    confirm({
      title: "Hủy lịch bảo trì này?",
      icon: <ExclamationCircleOutlined />,
      okText: "Hủy lịch",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      async onOk() {
        try {
          await handleCancelSchedule(record);
          message.success("Đã hủy lịch.");
          if (selected?.ScheduleID === record.ScheduleID) setSelected(null);
          await fetchSchedules();
        } catch (e) {
          console.error(e);
          message.error("Hủy lịch thất bại.");
        }
      },
    });
  };

  // ===== DERIVED =====
  const filtered = useMemo(() => {
    if (!search?.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      const id = String(r.ScheduleID || "").toLowerCase();
      const asset = String(r.AssetID || "").toLowerCase();
      const st = String(r.Status || "").toLowerCase();
      const pr = String(r.Priority || "").toLowerCase();
      const ass = String(r.AssignedToUserID ?? "").toLowerCase();
      const note = String(r.Notes || "").toLowerCase();
      return id.includes(s) || asset.includes(s) || st.includes(s) || pr.includes(s) || ass.includes(s) || note.includes(s);
    });
  }, [rows, search]);

  const renderAsset = (assetId) => {
    const found = assets.find((o) => String(o.value) === String(assetId));
    return found ? found.label : assetId || "—";
  };
  const renderUser = (uid) => (uid ? userMap[Number(uid)] || uid : "—");

  const canGenerateWO = (r) => ["ACTIVE", "OVERDUE"].includes(String(r.Status).toUpperCase());
  const canCancel = (r) => !["CANCELLED", "COMPLETED"].includes(String(r.Status).toUpperCase());

  // ===== Actions (improved) =====
  const renderRowActions = (record) => {
    // Quick action chọn thông minh
    const quickIsGenerate = canGenerateWO(record);
    const quickButton = quickIsGenerate ? (
      <Tooltip title="Tạo Work Order cho kỳ hiện tại">
        <Button
          type="primary"
          icon={<CalendarOutlined />}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            confirmGenerate(record);
          }}
          disabled={!canGenerateWO(record)}
        >
          WO
        </Button>
      </Tooltip>
    ) : (
      <Tooltip title="Xem chi tiết">
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(record);
          }}
        >
          Xem
        </Button>
      </Tooltip>
    );

    const items = [
      {
        key: "view",
        icon: <EyeOutlined />,
        label: "Xem",
        onClick: () => setSelected(record),
      },
      {
        key: "edit",
        icon: <EditOutlined />,
        label: "Sửa",
        disabled: record.Status === "CANCELLED",
        onClick: () => openEdit(record),
      },
      {
        key: "gen",
        icon: <CalendarOutlined />,
        label: "Generate WO",
        disabled: !canGenerateWO(record),
        onClick: () => confirmGenerate(record),
      },
      {
        type: "divider",
      },
      {
        key: "cancel",
        icon: <StopOutlined />,
        label: "Hủy lịch",
        danger: true,
        disabled: !canCancel(record),
        onClick: () => confirmCancel(record),
      },
    ].filter(Boolean);

    return (
      <Space
        onClick={(e) => e.stopPropagation()}
        size={6}
        wrap
      >
        {quickButton}
        <Dropdown
          trigger={["click"]}
          menu={{
            items,
            onClick: ({ key, domEvent }) => {
              domEvent?.stopPropagation();
              const item = items.find((it) => it.key === key);
              if (item?.onClick && !item.disabled) item.onClick();
            },
          }}
        >
          <Button size="small" icon={<MoreOutlined />}>More</Button>
        </Dropdown>
      </Space>
    );
  };

  // ===== COLUMNS =====
  const columns = [
    { title: "ID", dataIndex: "ScheduleID", key: "ScheduleID", width: 90, fixed: "left" },
    { title: "Asset", dataIndex: "AssetID", key: "AssetID", ellipsis: true, render: renderAsset, width: 260 },
    {
      title: "Status / Priority",
      key: "sp",
      width: 200,
      render: (_, r) => (
        <Space size={6} wrap>
          {statusTag(r.Status)}
          {priorityTag(r.Priority)}
        </Space>
      ),
    },
    { title: "Next", dataIndex: "NextMaintenanceDate", key: "NextMaintenanceDate", width: 120, render: fmtDate },
    { title: "Last", dataIndex: "LastMaintenanceDate", key: "LastMaintenanceDate", width: 120, render: fmtDate },
    { title: "Assignee", dataIndex: "AssignedToUserID", key: "AssignedToUserID", width: 220, render: renderUser },
    { title: "Reminder(d)", dataIndex: "ReminderDaysBefore", key: "ReminderDaysBefore", width: 120 },
    {
      title: "Window",
      key: "Window",
      width: 160,
      render: (_, r) => (
        <span>
          {fmtTime(r.WindowStart)} - {fmtTime(r.WindowEnd)}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 150,
      render: (_, record) => renderRowActions(record),
    },
  ];

  // ===== UI LOADING =====
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Spin size="large" tip="Đang tải lịch bảo trì..." />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card
        title="Lịch bảo trì định kỳ"
        extra={
          <Space>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo ID/Asset/Status/Priority/Assignee/Notes"
              allowClear
              style={{ width: 360 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchSchedules}>
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo lịch
            </Button>
          </Space>
        }
        style={{ borderRadius: 12 }}
        bodyStyle={{ padding: 14 }}
      >
        <Table
          dataSource={filtered || []}
          rowKey={(r) => r.ScheduleID}
          columns={columns}
          pagination={{ pageSize: 10 }}
          bordered
          size="middle"
          sticky
          scroll={{ x: 1200 }}
          onRow={(record) => ({
            onClick: () => setSelected(record),
          })}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={36} lg={24}>
          <Card title="Thông tin lịch" size="small">
            {selected ? (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="ScheduleID">{selected.ScheduleID}</Descriptions.Item>
                <Descriptions.Item label="Asset">{renderAsset(selected.AssetID)}</Descriptions.Item>
                <Descriptions.Item label="Assignee">{renderUser(selected.AssignedToUserID)}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">{statusTag(selected.Status)}</Descriptions.Item>
                <Descriptions.Item label="Mức ưu tiên">{priorityTag(selected.Priority)}</Descriptions.Item>
                <Descriptions.Item label="Interval (tháng)">{selected.IntervalMonths ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="NextMaintenanceDate">{fmtDate(selected.NextMaintenanceDate)}</Descriptions.Item>
                <Descriptions.Item label="LastMaintenanceDate">{fmtDate(selected.LastMaintenanceDate)}</Descriptions.Item>
                <Descriptions.Item label="Window">
                  {fmtTime(selected.WindowStart)} - {fmtTime(selected.WindowEnd)}
                </Descriptions.Item>
                <Descriptions.Item label="EstimatedHours">{selected.EstimatedHours ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="ReminderDaysBefore">{selected.ReminderDaysBefore ?? 7}</Descriptions.Item>
                <Descriptions.Item label="AutoCreateWO">{String(selected.AutoCreateWorkOrder ?? true)}</Descriptions.Item>
                <Descriptions.Item label="Notes">{selected.Notes || "—"}</Descriptions.Item>
                <Descriptions.Item label="CreatedAt">
                  {selected.CreatedAt ? String(selected.CreatedAt).replace("T", " ").slice(0, 19) : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="UpdatedAt">
                  {selected.UpdatedAt ? String(selected.UpdatedAt).replace("T", " ").slice(0, 19) : "—"}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="Chọn một lịch ở bảng để xem chi tiết" />
            )}
          </Card>
        </Col>
      </Row>

      {/* ===== MODAL CREATE/EDIT ===== */}
      <Modal
        title={editing ? "Sửa lịch bảo trì" : "Tạo lịch bảo trì"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnClose
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            Priority: "MEDIUM",
            ReminderDaysBefore: 7,
            AutoCreateWorkOrder: true,
          }}
        >
          <Form.Item
            label="Asset"
            name="AssetID"
            rules={[{ required: true, message: "Chọn Asset" }]}
          >
            <Select showSearch allowClear placeholder="Chọn thiết bị" optionFilterProp="children">
              {assets.map((a) => (
                <Option key={a.value} value={a.value}>
                  {a.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Người phụ trách (AssignedToUserID)" name="AssignedToUserID">
            <Select showSearch allowClear placeholder="Chọn người phụ trách" optionFilterProp="children">
              {employees.map((u) => (
                <Option key={u.value} value={u.value}>
                  {u.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={8}>
            <Col span={8}>
              <Form.Item label="IntervalMonths" name="IntervalMonths">
                <InputNumber min={0} style={{ width: "100%" }} placeholder="6" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="NextMaintenanceDate"
                name="NextMaintenanceDate"
                rules={[{ required: true, message: "Chọn ngày" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ReminderDaysBefore" name="ReminderDaysBefore">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item label="WindowStart" name="WindowStart">
                <TimePicker style={{ width: "100%" }} format="HH:mm:ss" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="WindowEnd" name="WindowEnd">
                <TimePicker style={{ width: "100%" }} format="HH:mm:ss" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item label="EstimatedHours" name="EstimatedHours">
                <InputNumber min={0} step={0.5} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Priority" name="Priority">
                <Select>
                  <Option value="LOW">LOW</Option>
                  <Option value="MEDIUM">MEDIUM</Option>
                  <Option value="HIGH">HIGH</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                label="AutoCreateWorkOrder"
                name="AutoCreateWorkOrder"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes" name="Notes">
            <Input.TextArea rows={3} placeholder="Ghi chú..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaintenanceSchedulePage;
