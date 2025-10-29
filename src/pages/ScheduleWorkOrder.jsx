import React, { useEffect, useMemo, useState } from "react";
import {
  Card, Table, Tag, Button, Space, Popconfirm, message,
  Form, Input, DatePicker, Modal, Select, Tooltip, InputNumber
} from "antd";
import {
  PlusOutlined, ReloadOutlined, PlayCircleOutlined,
  CheckCircleOutlined, StopOutlined, UserSwitchOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;
const ASSETS_API = `${API_URL}/api/asset`;
const ME_API = `${API_URL}/api/getuserinfo`;      // có thể là list hoặc 1 object, xử lý linh hoạt
const USERS_API = `${API_URL}/api/users`;          // nếu không tồn tại, sẽ fallback sang ME_API

const STATUS_COLORS = { OPEN: "default", IN_PROGRESS: "processing", DONE: "success", CANCELLED: "error" };

// ===== Helpers =====
const pickArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};
const fmtDate = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : null);
const fmtDateTime = (d) => (d ? dayjs(d).format("YYYY-MM-DD HH:mm:ss") : null);

const getSavedUser = () => {
  try {
    const raw = localStorage.getItem("user");
    if (raw && raw !== "undefined") return JSON.parse(raw);
  } catch {}
  return null;
};
const normalizeUserRecord = (u) => ({
  id: u?.UserID ?? u?.userId ?? u?.id ?? null,
  fullname: u?.FullName ?? u?.fullName ?? u?.fullname ?? u?.name ?? "",
});
const pickUserMe = (res) => {
  // nếu API trả object đơn
  const d = res?.data || {};
  if (d && (d.UserID || d.id || d.userId)) return normalizeUserRecord(d);
  // nếu trả list, lấy phần tử đầu (hoặc null)
  const arr = pickArray(res);
  if (arr.length) return normalizeUserRecord(arr[0]);
  return { id: null, fullname: "Me" };
};
const pickUsersList = (res) => {
  const arr = pickArray(res);
  return (arr || []).map((u) => ({ value: Number(u.UserID ?? u.id), label: u.FullName ?? u.name ?? `User ${u.UserID}`, raw: u }));
};
const buildAssetLabel = (a) => {
  const name = a.Name || a.AssetName || "";
  const code = a.ManageCode || a.AssetCode || "";
  if (name && code) return `${name} (${code})`;
  return name || code || a.ID || a.Id || a.AssetID || "Asset";
};

// ===== Forms =====
const CreateWOForm = ({ onSubmit, assetOptions, usersOptions, me }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields();
    if (me?.id) form.setFieldValue("AssignedToUserID", Number(me.id));
  }, [me?.id]);

  const handleFinish = (values) => {
    const payload = {
      ...values,
      DueDate: fmtDate(values.DueDate),
      // ❗ Format DATETIME chuẩn cho MySQL, không dùng ISO
      PlannedStart: fmtDateTime(values.PlannedStart),
      PlannedEnd: fmtDateTime(values.PlannedEnd),
    };
    onSubmit(payload);
  };

  const setAssigneeToMe = () => me?.id && form.setFieldValue("AssignedToUserID", Number(me.id));

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item label="Asset" name="AssetID" rules={[{ required: true, message: "Chọn Asset" }]}>
        <Select showSearch allowClear placeholder="Chọn thiết bị" options={assetOptions} optionFilterProp="label" />
      </Form.Item>
      <Form.Item label="ScheduleID (optional)" name="ScheduleID">
        <InputNumber style={{ width: "100%" }} placeholder="101" />
      </Form.Item>
      <Form.Item label="AssignedToUserID" name="AssignedToUserID">
        <Select showSearch allowClear placeholder="Chọn người phụ trách" options={usersOptions} optionFilterProp="label" />
      </Form.Item>
      {me?.id && (
        <Button size="small" style={{ marginTop: -8 }} icon={<UserSwitchOutlined />} onClick={setAssigneeToMe}>
          Gán cho tôi ({me.fullname})
        </Button>
      )}
      <Form.Item label="DueDate" name="DueDate" rules={[{ required: true, message: "Chọn DueDate" }]}>
        <DatePicker style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="PlannedStart" name="PlannedStart">
        <DatePicker showTime style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="PlannedEnd" name="PlannedEnd">
        <DatePicker showTime style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Notes" name="Notes">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Create</Button>
      </Space>
    </Form>
  );
};

const StartWOForm = ({ onSubmit }) => {
  const [form] = Form.useForm();
  const handleFinish = (v) => onSubmit({ PlannedStart: fmtDateTime(v?.PlannedStart) });
  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item label="PlannedStart (optional)" name="PlannedStart">
        <DatePicker showTime style={{ width: "100%" }} />
      </Form.Item>
      <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />}>Start</Button>
    </Form>
  );
};

const CompleteWOForm = ({ onSubmit }) => {
  const [form] = Form.useForm();
  const handleFinish = (v) => onSubmit({
    CompletedAt: fmtDateTime(v?.CompletedAt),
    ResultNotes: v?.ResultNotes || null,
    Cost: v?.Cost ?? null,
    UpdateScheduleNext: v?.UpdateScheduleNext ?? true,
  });
  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ UpdateScheduleNext: true }}>
      <Form.Item label="CompletedAt" name="CompletedAt" rules={[{ required: true, message: "Chọn thời điểm hoàn tất" }]}>
        <DatePicker showTime style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="ResultNotes" name="ResultNotes">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item label="Cost" name="Cost">
        <InputNumber min={0} step={1000} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="UpdateScheduleNext" name="UpdateScheduleNext">
        <Select options={[{ value: true, label: "true" }, { value: false, label: "false" }]} />
      </Form.Item>
      <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>Complete</Button>
    </Form>
  );
};

// ===== Page =====
const WorkOrderPage = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  // dynamic
  const [assetOptions, setAssetOptions] = useState([]);
  const [usersOptions, setUsersOptions] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [me, setMe] = useState(null);

  // filters
  const [status, setStatus] = useState();
  const [assetFilter, setAssetFilter] = useState();
  const [assignee, setAssignee] = useState();
  const [from, setFrom] = useState();
  const [to, setTo] = useState();

  // modals
  const [openCreate, setOpenCreate] = useState(false);
  const [startWOId, setStartWOId] = useState(null);
  const [completeWOId, setCompleteWOId] = useState(null);

  const fetchMeta = async () => {
    try {
      const [assetsRes] = await Promise.all([axios.get(ASSETS_API)]);
      const assets = pickArray(assetsRes);
      setAssetOptions(
        (assets || []).map((a) => ({
          value: a.ID || a.Id || a.AssetID,
          label: buildAssetLabel(a),
          raw: a,
        }))
      );
    } catch (e) {
      message.warning("Không load được danh sách assets");
    }

    // ----- users + me (linh hoạt endpoint) -----
    try {
      let users = [];
      // ưu tiên USERS_API nếu tồn tại
      try {
        const usersRes = await axios.get(USERS_API);
        users = pickUsersList(usersRes);
      } catch {
        // fallback: ME_API có thể trả list users
        const listRes = await axios.get(ME_API);
        users = pickUsersList(listRes);
      }
      setUsersOptions(users);

      const map = {};
      users.forEach((u) => { map[u.value] = u.label; });

      // me: ưu tiên localStorage, sau đó lấy từ ME_API
      let _me = normalizeUserRecord(getSavedUser());
      if (!_me?.id) {
        try {
          const meRes = await axios.get(ME_API);
          _me = pickUserMe(meRes);
        } catch {}
      }
      setMe(_me);
      if (_me?.id && !map[_me.id]) map[_me.id] = _me.fullname;
      setUserMap(map);
    } catch (e) {
      message.warning("Không load được users hoặc user info");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (assetFilter) params.asset = assetFilter;
      if (assignee) params.assignee = assignee;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await axios.get(`${API_URL}/api/maintenance/workorders`, { params });
      if (res.data?.success) setRows(res.data.data || []);
      else message.error("Không lấy được WorkOrders");
    } catch (e) {
      message.error(e?.response?.data?.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
    fetchData();
  }, []);

  const handleCreate = async (payload) => {
    try {
      const res = await axios.post(`${API_URL}/api/maintenance/workorders`, payload);
      if (res.data?.success) {
        message.success("Tạo WO thành công");
        setOpenCreate(false);
        fetchData();
      } else message.error("Tạo WO thất bại");
    } catch (e) {
      message.error(e?.response?.data?.message || "Lỗi tạo WO");
    }
  };

  const handleStart = async (workOrderId, payload) => {
    try {
      const res = await axios.patch(`${API_URL}/api/maintenance/workorders/${workOrderId}/start`, payload);
      if (res.data?.success) { message.success("Bắt đầu WO"); setStartWOId(null); fetchData(); }
    } catch (e) { message.error(e?.response?.data?.message || "Lỗi start WO"); }
  };

  const handleComplete = async (workOrderId, payload) => {
    try {
      const res = await axios.patch(`${API_URL}/api/maintenance/workorders/${workOrderId}/complete`, payload);
      if (res.data?.success) { message.success("Hoàn tất WO"); setCompleteWOId(null); fetchData(); }
    } catch (e) { message.error(e?.response?.data?.message || "Lỗi complete WO"); }
  };

  const handleCancel = async (workOrderId) => {
    try {
      const res = await axios.patch(`${API_URL}/api/maintenance/workorders/${workOrderId}/cancel`, { Reason: "User cancel" });
      if (res.data?.success) { message.success("Đã hủy WO"); fetchData(); }
    } catch (e) { message.error(e?.response?.data?.message || "Lỗi cancel WO"); }
  };

  const renderUser = (userId) => {
    if (!userId) return "-";
    const name = userMap[Number(userId)];
    if (me?.id && Number(userId) === Number(me.id)) return `Bạn – ${name || me.fullname}`;
    return name || String(userId);
  };
  const renderAsset = (assetId) => {
    const found = assetOptions.find((o) => String(o.value) === String(assetId));
    return found ? found.label : assetId;
  };

  const columns = useMemo(() => [
    { title: "WO#", dataIndex: "WorkOrderID", width: 90 },
    { title: "ScheduleID", dataIndex: "ScheduleID", width: 100 },
    { title: "Asset", dataIndex: "AssetID", ellipsis: true, render: renderAsset },
    { title: "Status", dataIndex: "Status", width: 120, render: v => <Tag color={STATUS_COLORS[v] || "default"}>{v}</Tag> },
    { title: "DueDate", dataIndex: "DueDate", width: 120, render: v => (v ? dayjs(v).format("YYYY-MM-DD") : "-") },
    { title: "PlannedStart", dataIndex: "PlannedStart", width: 165, render: v => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-") },
    { title: "PlannedEnd", dataIndex: "PlannedEnd", width: 165, render: v => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-") },
    { title: "CompletedAt", dataIndex: "CompletedAt", width: 165, render: v => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-") },
    { title: "Assignee", dataIndex: "AssignedToUserID", width: 220, render: renderUser },
    { title: "CreatedBy", dataIndex: "CreatedByUserID", width: 220, render: renderUser },
    { title: "Cost", dataIndex: "Cost", width: 110, render: v => (v != null ? Number(v).toLocaleString() : "-") },
    {
      title: "Actions", key: "actions", fixed: "right", width: 320,
      render: (_, r) => (
        <Space wrap onClick={(e)=>e.stopPropagation()}>
          <Tooltip title="Start (ghi MAINTENANCE_OUT)">
            <Button
              size="small"
              type="default"
              icon={<PlayCircleOutlined />}
              disabled={r.Status !== "OPEN"}
              onClick={() => setStartWOId(r.WorkOrderID)}
            >
              Start
            </Button>
          </Tooltip>
          <Tooltip title="Complete (ghi MAINTENANCE_IN + cập nhật Schedule)">
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={!(r.Status === "OPEN" || r.Status === "IN_PROGRESS")}
              onClick={() => setCompleteWOId(r.WorkOrderID)}
            >
              Complete
            </Button>
          </Tooltip>
          <Popconfirm
            title="Hủy work order này?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleCancel(r.WorkOrderID)}
            disabled={!(r.Status === "OPEN" || r.Status === "IN_PROGRESS")}
          >
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              disabled={!(r.Status === "OPEN" || r.Status === "IN_PROGRESS")}
            >
              Cancel
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [rows, assetOptions, userMap, me]);

  return (
    <Card
      title="Maintenance Work Orders"
      extra={
        <Space wrap>
          <Select
            showSearch allowClear placeholder="Filter Asset"
            value={assetFilter} onChange={setAssetFilter} style={{ width: 260 }}
            options={assetOptions} optionFilterProp="label"
          />
          <Select
            allowClear placeholder="Status" value={status} onChange={setStatus} style={{ width: 150 }}
            options={[
              { value: "OPEN", label: "OPEN" },
              { value: "IN_PROGRESS", label: "IN_PROGRESS" },
              { value: "DONE", label: "DONE" },
              { value: "CANCELLED", label: "CANCELLED" },
            ]}
          />
          <Select
            showSearch allowClear placeholder="Assignee"
            value={assignee} onChange={setAssignee} style={{ width: 220 }}
            options={usersOptions} optionFilterProp="label"
          />
          <DatePicker placeholder="From" onChange={(d) => setFrom(d ? d.format("YYYY-MM-DD") : undefined)} />
          <DatePicker placeholder="To" onChange={(d) => setTo(d ? d.format("YYYY-MM-DD") : undefined)} />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Reload</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpenCreate(true)}>New</Button>
        </Space>
      }
    >
      <Table
        rowKey="WorkOrderID"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 1320 }}
      />

      <Modal
        title="Create Work Order"
        open={openCreate}
        onCancel={() => setOpenCreate(false)}
        footer={null}
        destroyOnClose
      >
        <CreateWOForm
          onSubmit={handleCreate}
          assetOptions={assetOptions}
          usersOptions={usersOptions}
          me={me}
        />
      </Modal>

      <Modal
        title={`Start WO #${startWOId || ""}`}
        open={!!startWOId}
        onCancel={() => setStartWOId(null)}
        footer={null}
        destroyOnClose
      >
        <StartWOForm onSubmit={(payload) => handleStart(startWOId, payload)} />
      </Modal>

      <Modal
        title={`Complete WO #${completeWOId || ""}`}
        open={!!completeWOId}
        onCancel={() => setCompleteWOId(null)}
        footer={null}
        destroyOnClose
      >
        <CompleteWOForm onSubmit={(payload) => handleComplete(completeWOId, payload)} />
      </Modal>
    </Card>
  );
};

export default WorkOrderPage;
