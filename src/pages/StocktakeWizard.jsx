// src/pages/StocktakeWizard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Input,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  message,
  Statistic,
  Tabs,
  Tooltip,
  Popconfirm,
} from "antd";
import {
  ReloadOutlined,
  RocketOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

// ❗️YÊU CẦU services/stocktakeApi có đủ các hàm dưới đây
import {
  apiUsers,
  apiDepartments,
  apiLocations,
  apiAssets,
  apiCreateSession,
  apiSeedSession,
  apiListSessions, // GET /api/stocktake/sessions
  apiCloseSession, // PATCH /api/stocktake/session/:id/status {Status:'CLOSED'}
} from "../services/stocktakeApi";

const MODE = { DEPT: "DEPT", USER: "USER", LOC: "LOC" };
const STATUS_MAP = {
  1: { text: "Sẵn sàng", color: "green" },
  2: { text: "Đang dùng", color: "blue" },
  3: { text: "Bảo hành", color: "gold" },
  4: { text: "Sửa chữa", color: "orange" },
  5: { text: "Hủy", color: "red" },
  6: { text: "Thanh lý", color: "purple" },
};

export default function StocktakeWizard() {
  const nav = useNavigate();

  // ===== Tabs =====
  const [tab, setTab] = useState("create");

  // ===== Master data =====
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [users, setUsers] = useState([]);
  const [depts, setDepts] = useState([]);
  const [locs, setLocs] = useState([]);
  const [assets, setAssets] = useState([]);

  // ===== Wizard state =====
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(MODE.DEPT);
  const [deptId, setDeptId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [locId, setLocId] = useState(null);
  const [defaultFound, setDefaultFound] = useState(true);
  const [note, setNote] = useState("");

  // B2 preview-only filter
  const [kw, setKw] = useState("");
  const [status, setStatus] = useState();

  // B3 create
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  // ===== Sessions list =====
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessKw, setSessKw] = useState("");
  const [sessStatus, setSessStatus] = useState(""); // mặc định chỉ show OPEN

  // ===== Load master =====
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingMaster(true);
        const [u, d, l, a] = await Promise.all([
          apiUsers(),
          apiDepartments(),
          apiLocations(),
          apiAssets(),
        ]);
        setUsers(
          (u || []).map((x) => ({
            value: x.UserID ?? x.ID,
            label: x.FullName ?? x.Name,
          }))
        );
        setDepts(
          (d || []).map((x) => ({
            value: x.DepartmentID ?? x.ID,
            label: x.DepartmentName ?? x.Name,
          }))
        );
        setLocs(
          (l || []).map((x) => ({
            value: x.LocationID ?? x.ID,
            label: x.LocationName ?? x.Name,
          }))
        );
        setAssets(a || []);
      } catch (e) {
        console.error(e);
        message.error("Không tải được dữ liệu tham chiếu");
      } finally {
        setLoadingMaster(false);
      }
    };
    run();
  }, []);

  // ===== Helpers map id -> name =====
  const deptName = (id) =>
    depts.find((d) => String(d.value) === String(id))?.label || "—";
  const userName = (id) =>
    users.find((u) => String(u.value) === String(id))?.label || "—";
  const locName = (id) =>
    locs.find((l) => String(l.value) === String(id))?.label || "—";

  // ===== B2 filtered preview (READONLY) =====
  const filtered = useMemo(() => {
    let list = assets;

    if (mode === MODE.DEPT && deptId) {
      list = list.filter(
        (a) => String(a.SectionID ?? a.DepartmentID ?? "") === String(deptId)
      );
    }
    if (mode === MODE.USER && userId) {
      list = list.filter((a) => String(a.EmployeeID ?? "") === String(userId));
    }
    if (mode === MODE.LOC && locId) {
      // Bổ sung khi Asset có LocationID riêng
      list = list.filter(
        (a) =>
          String(a.LocationID ?? "") === String(locId) ||
          String(a.FoundLocationID ?? "") === String(locId)
      );
    }

    const q = kw.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.Name || "").toLowerCase().includes(q) ||
          (a.ManageCode || "").toLowerCase().includes(q) ||
          (a.SerialNumber || "").toLowerCase().includes(q) ||
          (deptName(a.SectionID ?? a.DepartmentID) || "")
            .toLowerCase()
            .includes(q) ||
          (userName(a.EmployeeID) || "").toLowerCase().includes(q)
      );
    }
    if (status !== undefined) {
      list = list.filter((a) => Number(a.Status) === Number(status));
    }
    return list;
  }, [assets, mode, deptId, userId, locId, kw, status, depts, users, locs]);

  const previewIds = useMemo(() => filtered.map((a) => a.ID), [filtered]);
  const stats = useMemo(() => {
    const total = filtered.length;
    const by = filtered.reduce((acc, x) => {
      const k = Number(x.Status) || 0;
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return { total, by };
  }, [filtered]);

  const canNextB1 = useMemo(() => {
    if (mode === MODE.DEPT) return !!deptId;
    if (mode === MODE.USER) return !!userId;
    if (mode === MODE.LOC) return !!locId;
    return false;
  }, [mode, deptId, userId, locId]);

  const handleCreate = async () => {
    if (!previewIds.length)
      return message.warning("Danh sách xem trước trống, không thể tạo phiên.");
    try {
      setCreating(true);
      const sessionId = await apiCreateSession({
        DepartmentID: mode === MODE.DEPT ? deptId : null,
        Note: note,
      });
      await apiSeedSession(sessionId, {
        assetIds: previewIds, // seed TOÀN BỘ preview
        foundLocationId: locId || null,
        defaultFound,
      });
      setCreated(sessionId);
      message.success("Đã tạo phiên và khởi tạo danh sách kiểm kê");
      // chuyển qua tab "sessions" và refresh list
      setTab("sessions");
      setStep(0);
      await refreshSessions();
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Tạo/seed thất bại");
    } finally {
      setCreating(false);
    }
  };

  // ===== Sessions table =====
  const refreshSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await apiListSessions(); // [{SessionID, DepartmentID, CreatedBy, StartedAt, EndedAt, Status, Note}]
      setSessions(res || []);
    } catch (e) {
      console.error(e);
      message.error("Không tải được danh sách phiên kiểm kê");
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (tab === "sessions") refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (sessStatus) list = list.filter((s) => s.Status === sessStatus);

    const q = sessKw.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const dept = deptName(s.DepartmentID);
        return (
          String(s.SessionID).toLowerCase().includes(q) ||
          (s.Note || "").toLowerCase().includes(q) ||
          (dept || "").toLowerCase().includes(q)
        );
      });
    }
    return list.sort(
      (a, b) => dayjs(b.StartedAt).valueOf() - dayjs(a.StartedAt).valueOf()
    );
  }, [sessions, sessStatus, sessKw, depts]);

  const closeSession = async (sid) => {
    try {
      await apiCloseSession(sid);
      message.success("Đã đóng phiên");
      refreshSessions();
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Đóng phiên thất bại");
    }
  };

  // ===== Columns =====
  const previewColumns = [
    { title: "Tên tài sản", dataIndex: "Name", key: "Name", ellipsis: true },
    {
      title: "Mã quản lý",
      dataIndex: "ManageCode",
      key: "ManageCode",
      width: 160,
      render: (v) => (v ? <Tag color="geekblue">{v}</Tag> : "—"),
    },
    {
      title: "Serial",
      dataIndex: "SerialNumber",
      key: "SerialNumber",
      width: 160,
      render: (v) => v || "—",
    },
    {
      title: "Đang ở",
      key: "At",
      width: 220,
      render: (r) => deptName(r.SectionID ?? r.DepartmentID),
    },
    {
      title: "Người giữ",
      key: "Holder",
      width: 200,
      render: (r) => (r.EmployeeID ? userName(r.EmployeeID) : "—"),
    },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      key: "Status",
      width: 140,
      render: (s) => {
        const m = STATUS_MAP[s] || { text: s, color: "default" };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
      filters: Object.entries(STATUS_MAP).map(([k, v]) => ({
        text: v.text,
        value: Number(k),
      })),
      onFilter: (v, r) => Number(r.Status) === Number(v),
    },
  ];

  const sessionColumns = [
    {
      title: "Phiên",
      dataIndex: "SessionID",
      key: "SessionID",
      width: 120,
      fixed: "left",
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Phòng ban",
      dataIndex: "DepartmentID",
      key: "DepartmentID",
      width: 220,
      fixed: "left",
      ellipsis: { showTitle: false },
      render: (v, r) => {
        const name = r?.DepartmentName || deptName?.(v) || v || "—";
        return (
          <Tooltip title={name} placement="topLeft">
            <span
              style={{
                display: "inline-block",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Bắt đầu",
      dataIndex: "StartedAt",
      key: "StartedAt",
      width: 170,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
      sorter: (a, b) =>
        dayjs(a.StartedAt || 0).valueOf() - dayjs(b.StartedAt || 0).valueOf(),
      defaultSortOrder: "descend",
    },
    {
      title: "Kết thúc",
      dataIndex: "EndedAt",
      key: "EndedAt",
      width: 170,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
      sorter: (a, b) =>
        dayjs(a.EndedAt || 0).valueOf() - dayjs(b.EndedAt || 0).valueOf(),
    },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      key: "Status",
      width: 120,
      filters: [
        { text: "OPEN", value: "OPEN" },
        { text: "CLOSED", value: "CLOSED" },
      ],
      onFilter: (v, r) => r.Status === v,
      sorter: (a, b) =>
        a.Status === b.Status ? 0 : a.Status === "OPEN" ? -1 : 1,
      render: (s) =>
        s === "OPEN" ? (
          <Tag color="green">OPEN</Tag>
        ) : (
          <Tag color="volcano">CLOSED</Tag>
        ),
    },
    {
      title: "Ghi chú",
      dataIndex: "Note",
      key: "Note",
      ellipsis: { showTitle: false },
      render: (v) =>
        v ? (
          <Tooltip title={v} placement="topLeft">
            <span
              style={{
                display: "inline-block",
                maxWidth: 360,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {v}
            </span>
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_, r) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => nav(`/stocktake/${r.SessionID}`)}
          >
            Vào phiên
          </Button>
          <Popconfirm
            title="Đóng phiên kiểm kê? Sau khi đóng sẽ không thể cập nhật."
            okText="Đóng"
            cancelText="Hủy"
            onConfirm={() => closeSession(r.SessionID)}
            disabled={r.Status !== "OPEN"}
          >
            <Button
              danger
              icon={<StopOutlined />}
              disabled={r.Status !== "OPEN"}
            >
              Đóng phiên
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const sessionScrollX = sessionColumns.reduce(
    (sum, c) => sum + (Number(c.width) || 160),
    0
  );

  // ===== Render =====
  return (
    <Tabs
      activeKey={tab}
      onChange={setTab}
      items={[
        {
          key: "create",
          label: "Tạo phiên kiểm kê",
          children: (
            <Card
              title={
                <Space>
                  Tạo phiên kiểm kê{" "}
                  <Badge count={step + 1} style={{ background: "#1677ff" }} />
                </Space>
              }
              extra={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => window.location.reload()}
                >
                  Làm mới
                </Button>
              }
              bodyStyle={{ padding: 14 }}
              style={{ borderRadius: 10 }}
              loading={loadingMaster}
            >
              <Steps
                current={step}
                items={[
                  { title: "Chọn phạm vi" },
                  { title: "Xem trước (readonly)" },
                  { title: "Tạo & seed" },
                ]}
              />
              <Divider style={{ margin: "12px 0" }} />

              {/* B1: chọn phạm vi */}
              {step === 0 && (
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size="large"
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        Chế độ kiểm kê
                      </div>
                      <Radio.Group
                        value={mode}
                        onChange={(e) => {
                          setMode(e.target.value);
                          setDeptId(null);
                          setUserId(null);
                          setLocId(null);
                        }}
                        optionType="button"
                      >
                        <Radio.Button value={MODE.DEPT}>
                          Theo phòng ban
                        </Radio.Button>
                        <Radio.Button value={MODE.USER}>
                          Theo người dùng
                        </Radio.Button>
                        <Radio.Button value={MODE.LOC}>
                          Theo vị trí
                        </Radio.Button>
                      </Radio.Group>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        Ghi chú
                      </div>
                      <Input
                        placeholder="VD: Kiểm kê kho quý IV…"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    {mode === MODE.DEPT && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                          Chọn phòng ban
                        </div>
                        <Select
                          showSearch
                          allowClear
                          options={depts}
                          value={deptId}
                          onChange={setDeptId}
                          style={{ width: "100%" }}
                          optionFilterProp="label"
                        />
                      </div>
                    )}
                    {mode === MODE.USER && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                          Chọn người dùng
                        </div>
                        <Select
                          showSearch
                          allowClear
                          options={users}
                          value={userId}
                          onChange={setUserId}
                          style={{ width: "100%" }}
                          optionFilterProp="label"
                        />
                      </div>
                    )}
                    {mode === MODE.LOC && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                          Chọn vị trí/kho
                        </div>
                        <Select
                          showSearch
                          allowClear
                          options={locs}
                          value={locId}
                          onChange={setLocId}
                          style={{ width: "100%" }}
                          optionFilterProp="label"
                        />
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        Đánh dấu mặc định
                      </div>
                      <Checkbox
                        checked={defaultFound}
                        onChange={(e) => setDefaultFound(e.target.checked)}
                      >
                        ĐÃ TÌM THẤY tất cả khi khởi tạo
                      </Checkbox>
                      <div style={{ color: "#888", marginTop: 6 }}>
                        * Đi kiểm kê xong chỉ cần sửa các mục thất lạc/sai vị
                        trí ở màn hình chi tiết phiên.
                      </div>
                    </div>
                  </div>

                  <Space>
                    <Button
                      type="primary"
                      onClick={() => setStep(1)}
                      disabled={!canNextB1}
                    >
                      Tiếp tục
                    </Button>
                  </Space>
                </Space>
              )}

              {/* B2: Xem trước (READONLY) */}
              {step === 1 && (
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size="middle"
                >
                  {/* Summary */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: 8,
                    }}
                  >
                    <Card size="small">
                      <Statistic
                        title="Tổng tài sản (preview)"
                        value={stats.total}
                      />
                    </Card>
                    <Card size="small">
                      <Statistic
                        title="Sẵn sàng / Đang dùng"
                        value={`${stats.by[1] || 0} / ${stats.by[2] || 0}`}
                      />
                    </Card>
                    <Card size="small">
                      <Statistic
                        title="Bảo hành / Sửa chữa"
                        value={`${stats.by[3] || 0} / ${stats.by[4] || 0}`}
                      />
                    </Card>
                  </div>

                  {/* Filters */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <Input
                      allowClear
                      placeholder="Tìm theo tên/mã/serial/người giữ/phòng ban…"
                      style={{ width: 360 }}
                      value={kw}
                      onChange={(e) => setKw(e.target.value)}
                    />
                    <Select
                      allowClear
                      placeholder="Lọc theo trạng thái"
                      style={{ width: 220 }}
                      value={status}
                      onChange={setStatus}
                      options={Object.entries(STATUS_MAP).map(([k, v]) => ({
                        value: Number(k),
                        label: v.text,
                      }))}
                    />
                    <div style={{ marginLeft: "auto", opacity: 0.7 }}>
                      Hiển thị {filtered.length}/{assets.length}
                    </div>
                  </div>

                  {/* TABLE: NO SELECTION */}
                  <Table
                    rowKey={(r) => r.ID}
                    columns={previewColumns}
                    dataSource={filtered}
                    pagination={{ pageSize: 10 }}
                    bordered
                    size="middle"
                  />

                  <Space>
                    <Button onClick={() => setStep(0)}>Quay lại</Button>
                    <Button
                      type="primary"
                      onClick={() => setStep(2)}
                      disabled={!filtered.length}
                    >
                      Tiếp tục
                    </Button>
                  </Space>
                </Space>
              )}

              {/* B3: Tạo & seed toàn bộ danh sách trong preview */}
              {step === 2 && (
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size="large"
                >
                  <Card size="small" title="Tóm tắt">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div>
                          <b>Chế độ:</b>{" "}
                          {mode === MODE.DEPT
                            ? "Phòng ban"
                            : mode === MODE.USER
                            ? "Người dùng"
                            : "Vị trí"}
                        </div>
                        {mode === MODE.DEPT && (
                          <div>
                            <b>Phòng ban:</b> {deptName(deptId)}
                          </div>
                        )}
                        {mode === MODE.USER && (
                          <div>
                            <b>Người dùng:</b> {userName(userId)}
                          </div>
                        )}
                        {mode === MODE.LOC && (
                          <div>
                            <b>Vị trí:</b> {locName(locId)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div>
                          <b>Ghi chú:</b> {note || "—"}
                        </div>
                        <div>
                          <b>Mặc định:</b>{" "}
                          {defaultFound ? "ĐÃ TÌM THẤY" : "CHƯA tìm thấy"}
                        </div>
                        <div>
                          <b>Số tài sản seed:</b> {previewIds.length}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Space>
                    <Button onClick={() => setStep(1)}>Quay lại</Button>
                    <Button
                      type="primary"
                      icon={<RocketOutlined />}
                      loading={creating}
                      onClick={handleCreate}
                    >
                      Tạo phiên & Seed
                    </Button>
                  </Space>

                  {created && (
                    <Card
                      size="small"
                      style={{ marginTop: 12 }}
                      title={
                        <Space>
                          <CheckCircleOutlined style={{ color: "#52c41a" }} />
                          Đã tạo phiên
                        </Space>
                      }
                    >
                      <div style={{ lineHeight: 1.8 }}>
                        <div>
                          Mã phiên: <Tag color="green">{created}</Tag>
                        </div>
                        <Space style={{ marginTop: 8 }}>
                          <Button
                            type="primary"
                            icon={<EyeOutlined />}
                            onClick={() => nav(`/stocktake/${created}`)}
                          >
                            Vào màn hình kiểm kê
                          </Button>
                          <Button onClick={() => setTab("sessions")}>
                            Xem danh sách phiên
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  )}
                </Space>
              )}
            </Card>
          ),
        },
        {
          key: "sessions",
          label: "Phiên kiểm kê",
          children: (
            <Card
              title="Danh sách phiên kiểm kê"
              extra={
                <Space>
                  <Input
                    allowClear
                    placeholder="Tìm phiên theo mã / phòng ban / ghi chú…"
                    style={{ width: 320 }}
                    value={sessKw}
                    onChange={(e) => setSessKw(e.target.value)}
                  />
                  <Select
                    value={sessStatus}
                    onChange={setSessStatus}
                    style={{ width: 160 }}
                    options={[
                      { value: "", label: "Tất cả" },
                      { value: "OPEN", label: "Chỉ OPEN" },
                      { value: "CLOSED", label: "Chỉ CLOSED" },
                    ]}
                  />
                  <Button icon={<ReloadOutlined />} onClick={refreshSessions}>
                    Làm mới
                  </Button>
                </Space>
              }
              bodyStyle={{ padding: 14 }}
              style={{ borderRadius: 10 }}
            >
              <Table
                rowKey={(r) => r.SessionID}
                columns={sessionColumns}
                dataSource={filteredSessions}
                loading={loadingSessions}
                pagination={{ pageSize: 10 }}
                bordered
                scroll={{ x: sessionScrollX, y: 520 }}
                tableLayout="fixed"
                sticky
                size="middle"
              />
            </Card>
          ),
        },
      ]}
    />
  );
}
