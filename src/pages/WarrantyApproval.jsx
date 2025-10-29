// src/pages/WarrantyApprovalPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card, Space, Button, Table, Tag, Descriptions, Timeline, Typography, Input,
  message, Row, Col, Empty, Select
} from "antd";
import {
  ReloadOutlined, EyeOutlined, CheckOutlined, CloseOutlined, SearchOutlined
} from "@ant-design/icons";
import axios from "axios";

const { Text } = Typography;

const API_URL   = import.meta.env.VITE_BACKEND_URL;
const BASE      = `${API_URL}/api/requestwarranty`;
const USERS_API = `${API_URL}/api/getuserinfo`;
const DEPTS_API = `${API_URL}/api/getdepartment`;

const STEP_ID_BY_ROLE = { IT: 1, MANAGER: 2 };
const getToken = () => localStorage.getItem("token") || "";
const withAuth = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const normalizeUser = (u) =>
  !u ? null : {
    UserID: Number(u.UserID ?? u.userID ?? u.id ?? u.userId ?? 0),
    DepartmentID: u.DepartmentID ?? u.departmentID ?? u.deptId ?? null,
    FullName: u.FullName ?? u.fullname ?? u.fullName ?? u.name ?? "",
    Email: u.Email ?? u.email ?? "",
    Role: String(u.Role ?? u.role ?? "").toUpperCase() || null,
  };

const fmt = (v) => (v ? String(v).replace("T"," ").slice(0,19) : "");

const stateTag = (st) => {
  const color =
    st === "PENDING" ? "gold" :
    st?.startsWith("IN_PROGRESS") ? "blue" :
    st === "APPROVED" ? "green" :
    st === "REJECTED" ? "red" : "default";
  return <Tag color={color}>{st || "-"}</Tag>;
};

const canApproveByRole = (state, role) => {
  const r = String(role || "").toUpperCase();
  if ((state === "PENDING" || state === "IN_PROGRESS_STEP_1") && r === "IT") return true;
  if (state?.startsWith("IN_PROGRESS_STEP_2") && r === "MANAGER") return true;
  return false;
};

const extractRequests = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.requests)) return payload.data.requests;
  if (Array.isArray(payload?.requests)) return payload.requests;
  return [];
};

const normalizeDetail = (respData) => {
  const root = respData?.data ?? respData ?? {};
  const data = root?.data ?? root;
  const request = data.request || data.Request || null;
  let warranty =
    data.warranty ?? data.Request_Warranty ?? data.request_warranty ?? null;
  if (Array.isArray(warranty)) warranty = warranty[0] || null;
  const history = data.history || data.approvalHistory || data.ApprovalHistory || [];
  return { request, warranty, history };
};

export default function WarrantyApprovalPage(){
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved && saved !== "undefined") setCurrentUser(normalizeUser(JSON.parse(saved)));
    } catch {}
  }, []);

  // refs
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [depts, setDepts] = useState([]);
  const [deptsMap, setDeptsMap] = useState({});
  const [loadingRefs, setLoadingRefs] = useState(false);

  const loadRefs = async () => {
    setLoadingRefs(true);
    try {
      const ures = await axios.get(USERS_API, withAuth());
      const uarr = Array.isArray(ures?.data?.data) ? ures.data.data : Array.isArray(ures?.data) ? ures.data : [];
      const uopts = uarr.map(u => {
        const id = Number(u.UserID);
        return { value:id, label: u.FullName || `User ${id}`, DepartmentID: u.DepartmentID ?? null };
      });
      const umap = {}; uopts.forEach(o => umap[o.value] = o);
      setUsers(uopts); setUsersMap(umap);

      const dres = await axios.get(DEPTS_API, withAuth());
      const darr = Array.isArray(dres?.data?.data) ? dres.data.data : Array.isArray(dres?.data) ? dres.data : [];
      const dopts = darr.map(d => ({ value:Number(d.DepartmentID), label: d.DepartmentName || `Dept ${d.DepartmentID}` }));
      const dmap = {}; dopts.forEach(o => dmap[o.value] = o.label);
      setDepts(dopts); setDeptsMap(dmap);
    } catch (e) {
      message.warning("Không tải được Users/Departments.");
    } finally {
      setLoadingRefs(false);
    }
  };

  // list
  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterTargetUser, setFilterTargetUser] = useState(null);
  const [filterTargetDept, setFilterTargetDept] = useState(null);

  const fetchAll = async () => {
    setLoadingList(true);
    try {
      const resp = await axios.get(`${BASE}/getallrequest`, withAuth());
      const list = extractRequests(resp.data).map(r => ({
        ...r, TotalQuantity: r.TotalQuantity != null ? Number(r.TotalQuantity) : r.TotalQuantity
      }));
      setRows(list);
    } catch (e) {
      message.error("Không tải được danh sách yêu cầu.");
    } finally {
      setLoadingList(false);
    }
  };

  // detail
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState(null);
  const fetchDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const resp = await axios.get(`${BASE}/getrequestdetail/${id}`, withAuth());
      if (!resp?.data?.success) throw new Error("API detail không thành công");
      setDetail(normalizeDetail(resp.data));
    } catch (e) {
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
    const stepId = { IT:1, MANAGER:2 }[role];
    if (!stepId) return message.error("Vai trò hiện tại không hợp lệ.");

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
      Comment: "",
    };

    try {
      await axios.post(`${BASE}/approverequest/${req.RequestID}`, payload, withAuth());
      message.success(isApprove ? "Đã duyệt." : "Đã từ chối.");
      await fetchAll();
      if (detail?.request?.RequestID === req.RequestID) await fetchDetail(req.RequestID);
    } catch (e) {
      message.error(e?.response?.data?.message || "Xử lý duyệt thất bại.");
    }
  };

  useEffect(() => { loadRefs(); fetchAll(); }, []);

  const userName = (id) => (id && usersMap[id]?.label) || (id ?? "-");
  const deptName = (id) => (id && deptsMap[id]) || (id ?? "-");

  const filteredRows = useMemo(() => {
    let data = rows;
    if (searchText) {
      const s = searchText.toLowerCase();
      data = data.filter(r => {
        const id = String(r.RequestID || "").toLowerCase();
        const note = String(r.Note || "").toLowerCase();
        const state = String(r.CurrentState || "").toLowerCase();
        const qty = String(r.TotalQuantity ?? "").toLowerCase();
        const tuName = String(userName(r.TargetUserID)).toLowerCase();
        const tdName = String(deptName(r.TargetDepartmentID)).toLowerCase();
        return id.includes(s) || note.includes(s) || state.includes(s) || qty.includes(s) || tuName.includes(s) || tdName.includes(s);
      });
    }
    if (filterTargetUser != null) {
      data = data.filter(r => Number(r.TargetUserID) === Number(filterTargetUser));
    }
    if (filterTargetDept != null) {
      data = data.filter(r => Number(r.TargetDepartmentID) === Number(filterTargetDept));
    }
    return data;
  }, [rows, searchText, filterTargetUser, filterTargetDept]);

  const columns = [
    { title: "ID", dataIndex: "RequestID", key: "RequestID", width: 90 },
    {
      title: "Requester",
      dataIndex: "RequesterUserID",
      key: "RequesterUserID",
      width: 180,
      render: (v) => (<span><b>{userName(v)}</b> <Tag style={{ marginLeft:6 }}>{v ?? "-"}</Tag></span>),
    },
    {
      title: "Người nhận",
      dataIndex: "TargetUserID",
      key: "TargetUserID",
      width: 220,
      render: (v) => (<span><b>{userName(v)}</b> <Tag style={{ marginLeft:6 }}>{v ?? "-"}</Tag></span>),
    },
    {
      title: "Phòng nhận",
      dataIndex: "TargetDepartmentID",
      key: "TargetDepartmentID",
      width: 200,
      render: (v) => (<span><b>{deptName(v)}</b> <Tag style={{ marginLeft:6 }}>{v ?? "-"}</Tag></span>),
    },
    {
      title: "Trạng thái",
      dataIndex: "CurrentState",
      key: "CurrentState",
      width: 160,
      render: (st) => stateTag(st),
    },
    {
      title: "Số lượng",
      dataIndex: "TotalQuantity",
      key: "TotalQuantity",
      width: 110,
      render: (v) => (v == null ? 0 : v),
    },
    { title: "CreatedAt", dataIndex: "CreatedAt", key: "CreatedAt", width: 170, render: (v) => fmt(v) },
    { title: "Note", dataIndex: "Note", key: "Note", ellipsis: true },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 260,
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => fetchDetail(record.RequestID)}>Xem</Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
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
  const warranty = detail?.warranty;
  const history = detail?.history || [];
  const stepId = STEP_ID_BY_ROLE[currentUser?.Role];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Filter bar */}
      <Card size="small">
        <Space wrap>
          <Input
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Tìm ID / Note / Trạng thái / User / Phòng"
            allowClear
          />
          <Select
            style={{ width: 220 }}
            allowClear
            loading={loadingRefs}
            placeholder="Lọc theo Người nhận"
            options={users}
            value={filterTargetUser}
            onChange={setFilterTargetUser}
            showSearch
            optionFilterProp="label"
          />
          <Select
            style={{ width: 220 }}
            allowClear
            loading={loadingRefs}
            placeholder="Lọc theo Phòng nhận"
            options={depts}
            value={filterTargetDept}
            onChange={setFilterTargetDept}
            showSearch
            optionFilterProp="label"
          />
          <Button icon={<ReloadOutlined />} onClick={() => { fetchAll(); loadRefs(); }}>
            Refresh
          </Button>
          <Tag>Vai trò: <b>{currentUser?.Role || "-"}</b></Tag>
          <Tag>StepID: <b>{stepId ?? "-"}</b></Tag>
        </Space>
      </Card>

      {/* Danh sách */}
      <Card title="Danh sách yêu cầu bảo hành" size="small" bodyStyle={{ paddingTop: 0 }}>
        <Table
          rowKey={(r, idx) => r?.RequestID ?? idx}
          loading={loadingList}
          dataSource={filteredRows}
          columns={columns}
          size="middle"
          sticky
          scroll={{ x: 1100, y: 420 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Card>

      {/* Chi tiết + duyệt */}
      <Row gutter={[16, 16]}>
        {/* Thông tin yêu cầu */}
        <Col xs={24} md={8}>
          <Card title="Thông tin yêu cầu" size="small" loading={loadingDetail}>
            {request ? (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="RequestID">{request.RequestID}</Descriptions.Item>
                <Descriptions.Item label="Loại">Warranty (Bảo hành)</Descriptions.Item>
                <Descriptions.Item label="Requester">
                  <b>{(request.RequesterUserID && usersMap[request.RequesterUserID]?.label) || request.RequesterUserID || "-"}</b>{" "}
                  <Tag style={{ marginLeft:6 }}>{request.RequesterUserID ?? "-"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Người nhận">
                  <b>{(request.TargetUserID && usersMap[request.TargetUserID]?.label) || request.TargetUserID || "-"}</b>{" "}
                  <Tag style={{ marginLeft:6 }}>{request.TargetUserID ?? "-"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Phòng nhận">
                  <b>{(request.TargetDepartmentID && deptsMap[request.TargetDepartmentID]) || request.TargetDepartmentID || "-"}</b>{" "}
                  <Tag style={{ marginLeft:6 }}>{request.TargetDepartmentID ?? "-"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">{stateTag(request.CurrentState)}</Descriptions.Item>
                <Descriptions.Item label="Note">{request.Note || "-"}</Descriptions.Item>
                <Descriptions.Item label="CreatedAt">{fmt(request.CreatedAt)}</Descriptions.Item>
                <Descriptions.Item label="UpdatedAt">{fmt(request.UpdatedAt)}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="Chọn bản ghi ở danh sách phía trên để xem" />
            )}
          </Card>

          <Card title="Chi tiết bảo hành" size="small" loading={loadingDetail}>
            {warranty ? (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="AssetID">{warranty.AssetID ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Quantity">{warranty.Quantity ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Warranty Provider">{warranty.WarrantyProvider || "-"}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="Không có dữ liệu bảo hành" />
            )}
          </Card>
        </Col>

        {/* Nhật ký */}
        <Col xs={24} md={8}>
          <Card title="Nhật ký phê duyệt" size="small" loading={loadingDetail}>
            {history?.length ? (
              <div style={{ maxHeight: 300, overflow: "auto", paddingRight: 6 }}>
                <Timeline
                  items={history.map((h) => {
                    const act = h.Action || h.action;
                    const color = act === "CREATED" ? "gray" : act === "APPROVED" ? "green" : act === "CONFIRMED" ? "blue" : "red";
                    return {
                      color,
                      children: (
                        <div>
                          <div>
                            <b>{act}</b>{" "}
                            <Text type="secondary">
                              {fmt(h.ActionAt || h.actionAt) ? `(${fmt(h.ActionAt || h.actionAt)})` : ""}
                            </Text>
                          </div>
                          <div>
                            StepID: {h.StepID ?? "-"} | ApproverUserID: {h.ApproverUserID ?? "-"} | Dept: {h.DepartmentID ?? "-"}
                          </div>
                          {h.Comment ? <div>💬 {h.Comment}</div> : null}
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
        </Col>

        {/* Thao tác duyệt */}
        <Col xs={24} md={8}>
          <Card title="Thao tác duyệt" size="small">
            <Space wrap>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                disabled={
                  !detail?.request ||
                  !currentUser ||
                  !canApproveByRole(detail?.request?.CurrentState, currentUser?.Role) ||
                  detail?.request?.CurrentState === "APPROVED" ||
                  detail?.request?.CurrentState === "REJECTED"
                }
                onClick={() => doAction(detail, true)}
              >
                Duyệt
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                disabled={
                  !detail?.request ||
                  !currentUser ||
                  !canApproveByRole(detail?.request?.CurrentState, currentUser?.Role) ||
                  detail?.request?.CurrentState === "APPROVED" ||
                  detail?.request?.CurrentState === "REJECTED"
                }
                onClick={() => doAction(detail, false)}
              >
                Từ chối
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
