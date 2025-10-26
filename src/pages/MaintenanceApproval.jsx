import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Space,
  Button,
  Table,
  Tag,
  Descriptions,
  Timeline,
  Typography,
  Input,
  message,
  Row,
  Col,
  Empty,
} from "antd";
import {
  ReloadOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Text } = Typography;

const API_URL = import.meta.env.VITE_BACKEND_URL;
// ✅ dùng đúng base cho Maintenance
const BASE = `${API_URL}/api/requestmaintenance`;

// ===== Helpers =====
const STEP_ID_BY_ROLE = { IT: 1, MANAGER: 2 };
const getToken = () => localStorage.getItem("token") || "";
const withAuth = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const normalizeUser = (u) => {
  if (!u) return null;
  return {
    UserID: u.UserID ?? u.userID ?? u.userId ?? u.id ?? null,
    DepartmentID:
      u.DepartmentID ?? u.departmentID ?? u.departmentId ?? u.deptId ?? null,
    Role: String(u.Role ?? u.role ?? "").toUpperCase() || null,
    FullName: u.FullName ?? u.fullname ?? u.fullName ?? u.name ?? "",
    Email: u.Email ?? u.email ?? "",
  };
};

const fmt = (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "");

const stateTag = (st) => {
  const color =
    st === "PENDING"
      ? "gold"
      : st?.startsWith("IN_PROGRESS")
      ? "blue"
      : st === "APPROVED"
      ? "green"
      : st === "REJECTED"
      ? "red"
      : "default";
  return <Tag color={color}>{st || "-"}</Tag>;
};

const canApproveByRole = (state, role) => {
  if (!state || !role) return false;
  const r = String(role).toUpperCase();
  if ((state === "PENDING" || state === "IN_PROGRESS_STEP_1") && r === "IT")
    return true;
  if (state?.startsWith("IN_PROGRESS_STEP_2") && r === "MANAGER") return true;
  return false;
};

// List: đọc đúng shape { success, data: { requests: [...] } }
const extractRequests = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.requests)) return payload.data.requests;
  if (Array.isArray(payload?.requests)) return payload.requests;
  return [];
};

// Detail: dùng maintenance thay cho allocation
const normalizeDetail = (respData) => {
  const root = respData?.data ?? respData ?? {};
  const data = root?.data ?? root;

  const request = data.request || data.Request || null;

  let maintenance =
    data.maintenance ??
    data.maint ??
    data.request_maintenance ??
    data.Request_Maintenance ??
    null;
  if (Array.isArray(maintenance)) maintenance = maintenance[0] || null;

  const history =
    data.history || data.approvalHistory || data.ApprovalHistory || [];

  return { request, maintenance, history };
};

// ===== Page =====
const MaintenanceApprovalPage = () => {
  // User từ localStorage("user")
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser && savedUser !== "undefined") {
        setCurrentUser(normalizeUser(JSON.parse(savedUser)));
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Lỗi parse user:", err);
      setCurrentUser(null);
    }
  }, []);

  // List
  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState("");

  // Detail
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState(null);

  // Approve
  const [approving, setApproving] = useState(false);
  const [comment, setComment] = useState("");

  // ===== API calls =====
  const fetchAll = async () => {
    setLoadingList(true);
    try {
      const resp = await axios.get(`${BASE}/getallrequest`, withAuth());
      const list = extractRequests(resp.data).map((r) => ({
        ...r,
        TotalQuantity:
          r.TotalQuantity != null ? Number(r.TotalQuantity) : r.TotalQuantity,
      }));
      setRows(list);
    } catch (e) {
      console.error(e);
      message.error("Không tải được danh sách yêu cầu.");
    } finally {
      setLoadingList(false);
    }
  };

  const fetchDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const resp = await axios.get(`${BASE}/getrequestdetail/${id}`, withAuth());
      if (!resp?.data?.success) throw new Error("API detail không thành công");
      setDetail(normalizeDetail(resp.data));
    } catch (e) {
      console.error(e);
      message.error("Không tải được chi tiết.");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const doAction = async (recordOrDetail, isApprove) => {
    const req =
      recordOrDetail?.RequestID
        ? recordOrDetail
        : recordOrDetail?.request?.RequestID
        ? recordOrDetail.request
        : null;
    if (!req) return message.warning("Không xác định được Request để duyệt.");

    const role = currentUser?.Role;
    const stepId = STEP_ID_BY_ROLE[role];
    if (!stepId) return message.error("Vai trò hiện tại không hợp lệ.");

    // Lấy state từ detail (nếu có) hoặc từ dòng list
    const currentState =
      detail?.request?.RequestID === req.RequestID
        ? detail.request.CurrentState
        : recordOrDetail.CurrentState;

    if (!canApproveByRole(currentState, role)) {
      return message.warning("Bạn không ở bước phù hợp để duyệt.");
    }

    const payload = {
      StepID: stepId,
      ApproverUserID: currentUser?.UserID,
      DepartmentID: currentUser?.DepartmentID ?? 1,
      Action: isApprove ? "APPROVED" : "REJECTED",
      Comment:
        comment?.trim() || (isApprove ? "Đồng ý duyệt" : "Từ chối yêu cầu"),
    };

    setApproving(true);
    try {
      await axios.post(
        `${BASE}/approverequest/${req.RequestID}`,
        payload,
        withAuth()
      );
      message.success(isApprove ? "Đã duyệt." : "Đã từ chối.");
      setComment("");
      await fetchAll();
      if (detail?.request?.RequestID === req.RequestID) {
        await fetchDetail(req.RequestID);
      }
    } catch (e) {
      console.error(e);
      message.error("Xử lý duyệt thất bại.");
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ===== Table =====
  const filteredRows = useMemo(() => {
    if (!searchText) return rows;
    const s = searchText.toLowerCase();
    return rows.filter((r) => {
      const id = String(r.RequestID || "").toLowerCase();
      const note = String(r.Note || "").toLowerCase();
      const state = String(r.CurrentState || "").toLowerCase();
      const qty = String(r.TotalQuantity ?? "").toLowerCase();
      return id.includes(s) || note.includes(s) || state.includes(s) || qty.includes(s);
    });
  }, [rows, searchText]);

  const columns = [
    { title: "ID", dataIndex: "RequestID", key: "RequestID", width: 90 },
    {
      title: "Requester",
      dataIndex: "RequesterUserID",
      key: "RequesterUserID",
      width: 110,
    },
    {
      title: "Trạng thái",
      dataIndex: "CurrentState",
      key: "CurrentState",
      width: 170,
      render: (st) => stateTag(st),
    },
    {
      title: "Số lượng (tổng)",
      dataIndex: "TotalQuantity",
      key: "TotalQuantity",
      width: 140,
      render: (v) => (v == null ? 0 : v),
    },
    {
      title: "CreatedAt",
      dataIndex: "CreatedAt",
      key: "CreatedAt",
      width: 180,
      render: (v) => fmt(v),
    },
    {
      title: "Note",
      dataIndex: "Note",
      key: "Note",
      ellipsis: true,
    },
    {
      title: "Actions",
      key: "actions",
      width: 260,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => fetchDetail(record.RequestID)}
          >
            Xem
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            loading={approving}
            disabled={
              !currentUser ||
              !canApproveByRole(record.CurrentState, currentUser.Role) ||
              record.CurrentState === "APPROVED" ||
              record.CurrentState === "REJECTED"
            }
            onClick={() => doAction(record, true)}
          >
            Duyệt
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            loading={approving}
            disabled={
              !currentUser ||
              !canApproveByRole(record.CurrentState, currentUser.Role) ||
              record.CurrentState === "APPROVED" ||
              record.CurrentState === "REJECTED"
            }
            onClick={() => doAction(record, false)}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  const request = detail?.request;
  const maintenance = detail?.maintenance; // ✅ maintenance
  const history = detail?.history || [];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* ====== TOP: Filter bar ====== */}
      <Card size="small">
        <Space wrap>
          <Input
            style={{ width: 320 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Tìm theo ID / Note / Trạng thái / Số lượng"
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchAll}>
            Refresh
          </Button>
          <Tag>
            Vai trò: <b>{currentUser?.Role || "-"}</b>
          </Tag>
          <Tag>
            StepID: <b>{STEP_ID_BY_ROLE[currentUser?.Role] ?? "-"}</b>
          </Tag>
        </Space>
      </Card>

      {/* ====== TOP: Danh sách yêu cầu (full width) ====== */}
      <Card title="Danh sách yêu cầu bảo trì" size="small" bodyStyle={{ paddingTop: 0 }}>
        <Table
          rowKey={(r, idx) => r?.RequestID ?? idx}
          loading={loadingList}
          dataSource={filteredRows}
          columns={columns}
          size="middle"
          sticky
          scroll={{ y: 420 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Card>

      {/* ====== BELOW: 3 CỘT chi tiết ====== */}
      <Row gutter={[16, 16]}>
        {/* CỘT 1: Thông tin yêu cầu */}
        <Col xs={24} md={8}>
          <Card title="Thông tin yêu cầu" size="small" loading={loadingDetail}>
            {request ? (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="RequestID">
                  {request.RequestID}
                </Descriptions.Item>
                <Descriptions.Item label="Loại">Maintenance (Bảo trì)</Descriptions.Item>
                <Descriptions.Item label="RequesterUserID">
                  {request.RequesterUserID}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  {stateTag(request.CurrentState)}
                </Descriptions.Item>
                <Descriptions.Item label="Note">
                  {request.Note || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="CreatedAt">
                  {fmt(request.CreatedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="UpdatedAt">
                  {fmt(request.UpdatedAt)}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="Chọn bản ghi ở danh sách phía trên để xem" />
            )}
          </Card>

          <Card title="Chi tiết bảo trì" size="small" loading={loadingDetail}>
            {maintenance ? (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="AssetID">
                  {maintenance.AssetID ?? maintenance.assetId ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Quantity">
                  {maintenance.Quantity ?? maintenance.quantity ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Issue">
                  {maintenance.IssueDescription || "-"}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="Không có dữ liệu bảo trì" />
            )}
          </Card>
        </Col>

        {/* CỘT 2: Nhật ký */}
        <Col xs={24} md={8}>
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Card title="Nhật ký phê duyệt" size="small" loading={loadingDetail}>
              {history?.length ? (
                <div style={{ maxHeight: 300, overflow: "auto", paddingRight: 6 }}>
                  <Timeline
                    items={history.map((h) => {
                      const act = h.Action || h.action;
                      const color =
                        act === "CREATED"
                          ? "gray"
                          : act === "APPROVED"
                          ? "green"
                          : act === "CONFIRMED"
                          ? "blue"
                          : "red";
                      return {
                        color,
                        children: (
                          <div>
                            <div>
                              <b>{act}</b>{" "}
                              <Text type="secondary">
                                {fmt(h.ActionAt || h.actionAt)
                                  ? `(${fmt(h.ActionAt || h.actionAt)})`
                                  : ""}
                              </Text>
                            </div>
                            <div>
                              StepID: {h.StepID ?? h.stepId ?? "-"} | ApproverUserID:{" "}
                              {h.ApproverUserID ?? h.approverUserId ?? "-"} | Dept:{" "}
                              {h.DepartmentID ?? h.departmentId ?? "-"}
                            </div>
                            {(h.Comment || h.comment) ? (
                              <div>💬 {h.Comment || h.comment}</div>
                            ) : null}
                          </div>
                        ),
                      };
                    })}
                  />
                </div>
              ) : (
                <Empty description="Chưa có lịch sử" />
              )}
            </Card>
          </Space>
        </Col>

        {/* CỘT 3: Duyệt */}
        <Col xs={24} md={8}>
          <Card title="Thao tác duyệt" size="small">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Input.TextArea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ghi chú khi duyệt / từ chối (tuỳ chọn)"
                rows={3}
                maxLength={500}
              />
              <Space wrap>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={approving}
                  disabled={
                    !request ||
                    !currentUser ||
                    !canApproveByRole(request?.CurrentState, currentUser?.Role) ||
                    request?.CurrentState === "APPROVED" ||
                    request?.CurrentState === "REJECTED"
                  }
                  onClick={() => doAction(detail, true)}
                >
                  Duyệt
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  loading={approving}
                  disabled={
                    !request ||
                    !currentUser ||
                    !canApproveByRole(request?.CurrentState, currentUser?.Role) ||
                    request?.CurrentState === "APPROVED" ||
                    request?.CurrentState === "REJECTED"
                  }
                  onClick={() => doAction(detail, false)}
                >
                  Từ chối
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default MaintenanceApprovalPage;
