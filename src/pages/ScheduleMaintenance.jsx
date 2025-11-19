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
const DEPTS_API = `${API_URL}/api/getdepartment`;

const PRIORITY_COLOR = {
  LOW: "default",
  MEDIUM: "processing",
  HIGH: "error",
};
const STATUS_COLOR = {
  ACTIVE: "green",
  OVERDUE: "gold",
  COMPLETED: "default",
  CANCELLED: "red",
};

const statusTag = (st) => (
  <Tag color={STATUS_COLOR[st] || "default"}>{st || "-"}</Tag>
);
const priorityTag = (p) => (
  <Tag color={PRIORITY_COLOR[p] || "default"}>{p || "-"}</Tag>
);

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

  // master data
  const [assets, setAssets] = useState([]); // raw asset
  const [employees, setEmployees] = useState([]); // {value,label}
  const [departments, setDepartments] = useState([]); // {value,label}
  const [userMap, setUserMap] = useState({}); // id -> name

  // modal form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // record schedule
  const [form] = Form.useForm();

  // asset filter trong modal
  const [assetFilterDept, setAssetFilterDept] = useState();
  const [assetFilterHolder, setAssetFilterHolder] = useState();
  const [assetKw, setAssetKw] = useState("");

  // ===== FETCHERS =====
  const fetchAssets = async () => {
    try {
      const res = await axios.get(ASSETS_API);
      const data = pickArray(res) || [];
      setAssets(data);
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

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(DEPTS_API);
      const data = pickArray(res) || [];
      const list = data.map((d) => ({
        value: d.DepartmentID ?? d.ID,
        label: d.DepartmentName ?? d.Name,
      }));
      setDepartments(list);
    } catch (e) {
      console.error(e);
      message.warning("Không tải được danh sách phòng ban.");
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
    fetchDepartments();
    fetchSchedules();
  }, []);

  // ===== Helpers map id -> name =====
  const deptName = (id) =>
    departments.find((d) => String(d.value) === String(id))?.label || "";

  const userName = (id) =>
    employees.find((u) => String(u.value) === String(id))?.label || "";

  const renderUser = (uid) => (uid ? userMap[Number(uid)] || uid : "—");

  // ===== Asset options with filter (dept + holder + search) =====
  const assetSelectOptions = useMemo(() => {
    let list = assets || [];

    if (assetFilterDept) {
      list = list.filter(
        (a) =>
          String(a.SectionID ?? a.DepartmentID ?? "") ===
          String(assetFilterDept)
      );
    }

    if (assetFilterHolder) {
      list = list.filter(
        (a) =>
          String(
            a.EmployeeID ?? a.CurrentUserID ?? a.OwnerUserID ?? ""
          ) === String(assetFilterHolder)
      );
    }

    const q = assetKw.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const name = (a.Name || a.AssetName || "").toLowerCase();
        const code = (a.ManageCode || a.AssetCode || "").toLowerCase();
        const serial = (a.SerialNumber || "").toLowerCase();
        return name.includes(q) || code.includes(q) || serial.includes(q);
      });
    }

    return list.map((a) => {
      const id = a.ID ?? a.Id ?? a.AssetID;
      const dept = deptName(a.SectionID ?? a.DepartmentID);
      const holder = userName(
        a.EmployeeID ?? a.CurrentUserID ?? a.OwnerUserID
      );
      let extra = [];
      if (dept) extra.push(dept);
      if (holder) extra.push(holder);
      const extraStr = extra.length ? " • " + extra.join(" • ") : "";
      return {
        value: id,
        label: buildAssetLabel(a) + extraStr,
      };
    });
  }, [assets, assetFilterDept, assetFilterHolder, assetKw, departments, employees]);

  // ===== ACTIONS =====
  const openCreate = () => {
    setEditing(null);
    setAssetFilterDept(undefined);
    setAssetFilterHolder(undefined);
    setAssetKw("");

    form.resetFields();
    form.setFieldsValue({
      Priority: "MEDIUM",
      ReminderDaysBefore: 7,
      AutoCreateWorkOrder: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setAssetFilterDept(undefined);
    setAssetFilterHolder(undefined);
    setAssetKw("");

    form.resetFields();
    form.setFieldsValue({
      Title: record.Title || "",
      IntervalMonths: record.IntervalMonths ?? undefined,
      NextMaintenanceDate: record.NextMaintenanceDate
        ? dayjs(record.NextMaintenanceDate)
        : null,
      Priority: record.Priority || "MEDIUM",
      Notes: record.Notes || "",
      AutoCreateWorkOrder: Boolean(record.AutoCreateWorkOrder ?? true),
      ReminderDaysBefore: 7, // chỉ dùng khi tạo, edit header không dùng
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();

      const baseHeader = {
        Title: v.Title,
        IntervalMonths: v.IntervalMonths ?? null,
        NextMaintenanceDate: v.NextMaintenanceDate?.format("YYYY-MM-DD"),
        Priority: v.Priority || "MEDIUM",
        Notes: v.Notes || null,
        AutoCreateWorkOrder: Boolean(v.AutoCreateWorkOrder ?? true),
      };

      setSaving(true);

      if (editing?.ScheduleID) {
        // Update header schedule (KHÔNG sửa danh sách asset)
        await axios.patch(`${SCHEDULE_BASE}/${editing.ScheduleID}`, baseHeader);
        message.success("Cập nhật kế hoạch bảo trì thành công.");
      } else {
        // Create mới – multi assets
        const assetIds = v.AssetIDs || [];
        if (!assetIds.length) {
          message.error("Vui lòng chọn ít nhất một tài sản.");
          setSaving(false);
          return;
        }

        const assetsPayload = assetIds.map((id) => ({
          AssetID: id,
          AssignedToUserID:
            v.AssignedToUserID != null ? Number(v.AssignedToUserID) : null,
          ReminderDaysBefore: v.ReminderDaysBefore ?? 7,
          WindowStart: v.WindowStart ? v.WindowStart.format("HH:mm:ss") : null,
          WindowEnd: v.WindowEnd ? v.WindowEnd.format("HH:mm:ss") : null,
          EstimatedHours: v.EstimatedHours ?? null,
        }));

        const payload = {
          ...baseHeader,
          Assets: assetsPayload,
        };

        await axios.post(SCHEDULE_BASE, payload);

        message.success(
          `Tạo kế hoạch bảo trì thành công cho ${assetIds.length} tài sản.`
        );
      }

      setIsModalOpen(false);
      setEditing(null);
      form.resetFields();
      await fetchSchedules();
    } catch (e) {
      if (e?.errorFields) return; // lỗi validate của Ant
      console.error(e);
      message.error("Lưu kế hoạch bảo trì thất bại.");
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
      title: "Tạo Work Order cho tất cả tài sản trong kế hoạch này?",
      icon: <ExclamationCircleOutlined />,
      okText: "Tạo",
      cancelText: "Hủy",
      async onOk() {
        try {
          await handleGenerateWO(record);
          message.success("Đã tạo Work Order cho kế hoạch.");
        } catch (e) {
          console.error(e);
          message.error("Tạo Work Order thất bại.");
        }
      },
    });
  };

  const confirmCancel = (record) => {
    confirm({
      title: "Hủy kế hoạch bảo trì này?",
      icon: <ExclamationCircleOutlined />,
      okText: "Hủy kế hoạch",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      async onOk() {
        try {
          await handleCancelSchedule(record);
          message.success("Đã hủy kế hoạch.");
          if (selected?.ScheduleID === record.ScheduleID) setSelected(null);
          await fetchSchedules();
        } catch (e) {
          console.error(e);
          message.error("Hủy kế hoạch thất bại.");
        }
      },
    });
  };

  // ===== DERIVED (FILTER TABLE) =====
  const filtered = useMemo(() => {
    if (!search?.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      const id = String(r.ScheduleID || "").toLowerCase();
      const title = String(r.Title || "").toLowerCase();
      const st = String(r.Status || "").toLowerCase();
      const pr = String(r.Priority || "").toLowerCase();
      const note = String(r.Notes || "").toLowerCase();
      return (
        id.includes(s) ||
        title.includes(s) ||
        st.includes(s) ||
        pr.includes(s) ||
        note.includes(s)
      );
    });
  }, [rows, search]);

  const canGenerateWO = (r) =>
    ["ACTIVE", "OVERDUE"].includes(String(r.Status).toUpperCase());
  const canCancel = (r) =>
    !["CANCELLED", "COMPLETED"].includes(String(r.Status).toUpperCase());

  // ===== Actions (improved) =====
  const renderRowActions = (record) => {
    const quickIsGenerate = canGenerateWO(record);
    const quickButton = quickIsGenerate ? (
      <Tooltip title="Tạo Work Order cho tất cả tài sản trong kế hoạch">
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
        label: "Sửa header",
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
        label: "Hủy kế hoạch",
        danger: true,
        disabled: !canCancel(record),
        onClick: () => confirmCancel(record),
      },
    ].filter(Boolean);

    return (
      <Space onClick={(e) => e.stopPropagation()} size={6} wrap>
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
          <Button size="small" icon={<MoreOutlined />}>
            More
          </Button>
        </Dropdown>
      </Space>
    );
  };

  // ===== COLUMNS =====
  const columns = [
    {
      title: "ID",
      dataIndex: "ScheduleID",
      key: "ScheduleID",
      width: 90,
      fixed: "left",
    },
    {
      title: "Tiêu đề",
      dataIndex: "Title",
      key: "Title",
      ellipsis: true,
      width: 260,
    },
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
    {
      title: "Next",
      dataIndex: "NextMaintenanceDate",
      key: "NextMaintenanceDate",
      width: 120,
      render: fmtDate,
    },
    {
      title: "Interval (tháng)",
      dataIndex: "IntervalMonths",
      key: "IntervalMonths",
      width: 120,
    },
    {
      title: "Số tài sản",
      dataIndex: "AssetCount",
      key: "AssetCount",
      width: 120,
      render: (v) => v ?? 0,
    },
    {
      title: "Asset ACTIVE",
      dataIndex: "ActiveAssets",
      key: "ActiveAssets",
      width: 130,
      render: (v) => v ?? 0,
    },
    {
      title: "Auto WO",
      dataIndex: "AutoCreateWorkOrder",
      key: "AutoCreateWorkOrder",
      width: 100,
      render: (v) => String(v ?? true),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 170,
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
        title="Kế hoạch bảo trì định kỳ"
        extra={
          <Space>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo ID / tiêu đề / trạng thái / ưu tiên / ghi chú"
              allowClear
              style={{ width: 360 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchSchedules}>
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo kế hoạch
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
          scroll={{ x: 1100 }}
          onRow={(record) => ({
            onClick: () => setSelected(record),
          })}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={36} lg={24}>
          <Card title="Thông tin kế hoạch" size="small">
            {selected ? (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="ScheduleID">
                  {selected.ScheduleID}
                </Descriptions.Item>
                <Descriptions.Item label="Tiêu đề">
                  {selected.Title || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  {statusTag(selected.Status)}
                </Descriptions.Item>
                <Descriptions.Item label="Mức ưu tiên">
                  {priorityTag(selected.Priority)}
                </Descriptions.Item>
                <Descriptions.Item label="Interval (tháng)">
                  {selected.IntervalMonths ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="NextMaintenanceDate">
                  {fmtDate(selected.NextMaintenanceDate)}
                </Descriptions.Item>
                <Descriptions.Item label="Số tài sản">
                  {selected.AssetCount ?? 0}
                </Descriptions.Item>
                <Descriptions.Item label="Asset ACTIVE">
                  {selected.ActiveAssets ?? 0}
                </Descriptions.Item>
                <Descriptions.Item label="AutoCreateWO">
                  {String(selected.AutoCreateWorkOrder ?? true)}
                </Descriptions.Item>
                <Descriptions.Item label="CreatedByUserID">
                  {selected.CreatedByUserID || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Notes">
                  {selected.Notes || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="CreatedAt">
                  {selected.CreatedAt
                    ? String(selected.CreatedAt).replace("T", " ").slice(0, 19)
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="UpdatedAt">
                  {selected.UpdatedAt
                    ? String(selected.UpdatedAt).replace("T", " ").slice(0, 19)
                    : "—"}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="Chọn một kế hoạch ở bảng để xem chi tiết" />
            )}
          </Card>
        </Col>
      </Row>

      {/* ===== MODAL CREATE/EDIT ===== */}
      <Modal
        title={editing ? "Sửa kế hoạch bảo trì" : "Tạo kế hoạch bảo trì"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditing(null);
          form.resetFields();
          setAssetFilterDept(undefined);
          setAssetFilterHolder(undefined);
          setAssetKw("");
        }}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnClose
        width={780}
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
            label="Tiêu đề kế hoạch"
            name="Title"
            rules={[{ required: true, message: "Nhập tiêu đề kế hoạch" }]}
          >
            <Input placeholder="VD: Bảo trì quý I phòng IT" />
          </Form.Item>

          <Row gutter={8}>
            <Col span={8}>
              <Form.Item label="IntervalMonths" name="IntervalMonths">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="6"
                />
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
              <Form.Item label="Priority" name="Priority">
                <Select>
                  <Option value="LOW">LOW</Option>
                  <Option value="MEDIUM">MEDIUM</Option>
                  <Option value="HIGH">HIGH</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editing && (
            <>
              {/* Lọc asset giống StocktakeWizard */}
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item label="Lọc theo phòng đang giữ">
                    <Select
                      allowClear
                      showSearch
                      placeholder="Chọn phòng ban"
                      value={assetFilterDept}
                      onChange={setAssetFilterDept}
                      style={{ width: "100%" }}
                      options={departments}
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Lọc theo người đang giữ">
                    <Select
                      allowClear
                      showSearch
                      placeholder="Chọn người đang giữ"
                      value={assetFilterHolder}
                      onChange={setAssetFilterHolder}
                      style={{ width: "100%" }}
                      options={employees}
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Tìm tài sản">
                    <Input
                      allowClear
                      placeholder="Tìm theo tên/mã/serial…"
                      value={assetKw}
                      onChange={(e) => setAssetKw(e.target.value)}
                    />
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#999",
                      }}
                    >
                      Hiển thị {assetSelectOptions.length}/{assets.length} tài sản
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              {/* Chọn nhiều Asset */}
              <Form.Item
                label="Tài sản trong kế hoạch"
                name="AssetIDs"
                rules={[
                  {
                    required: true,
                    message: "Chọn ít nhất 1 tài sản",
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  placeholder="Chọn thiết bị"
                  optionFilterProp="label"
                  options={assetSelectOptions}
                  maxTagCount="responsive"
                />
              </Form.Item>
            </>
          )}

          <Form.Item
            label="Người phụ trách (AssignedToUserID – áp dụng chung cho tất cả asset)"
            name="AssignedToUserID"
          >
            <Select
              showSearch
              allowClear
              placeholder="Chọn người phụ trách"
              optionFilterProp="children"
            >
              {employees.map((u) => (
                <Option key={u.value} value={u.value}>
                  {u.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {!editing && (
            <>
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item
                    label="ReminderDaysBefore"
                    name="ReminderDaysBefore"
                  >
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="WindowStart" name="WindowStart">
                    <TimePicker
                      style={{ width: "100%" }}
                      format="HH:mm:ss"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="WindowEnd" name="WindowEnd">
                    <TimePicker
                      style={{ width: "100%" }}
                      format="HH:mm:ss"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item label="EstimatedHours" name="EstimatedHours">
                    <InputNumber
                      min={0}
                      step={0.5}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
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
            </>
          )}

          {editing && (
            <Form.Item
              label="AutoCreateWorkOrder"
              name="AutoCreateWorkOrder"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}

          <Form.Item label="Notes" name="Notes">
            <Input.TextArea rows={3} placeholder="Ghi chú..." />
          </Form.Item>

          {editing && (
            <div style={{ fontSize: 12, color: "#999" }}>
              * Màn hình này chỉ chỉnh sửa thông tin kế hoạch (header). Danh
              sách tài sản thuộc kế hoạch chỉnh ở màn hình chi tiết riêng nếu
              bạn xây thêm API.
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default MaintenanceSchedulePage;
