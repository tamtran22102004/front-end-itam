import React, { useEffect, useMemo, useState } from "react";
import { Space, Card, Row, Col, message } from "antd";
import { useSearchParams } from "react-router-dom";
import { APPROVAL_CFG, APPROVAL_KIND_KEYS, DEFAULT_APPROVAL_KIND, STEP_ID_BY_ROLE } from "../constants/requestapproval";
import { fetchAllRequests, fetchRequestDetail, postApproveAction, loadUsers, loadDepts } from "../services/requestapprovalApi";
import ApprovalFilterBar from "../components/requestapproval/ApprovalFilterBar";
import ApprovalTable from "../components/requestapproval/ApprovalTable";
import ApprovalRequestCard from "../components/requestapproval/ApprovalRequestCard";
import ApprovalSubCard from "../components/requestapproval/ApprovalSubCard";
import ApprovalTimeline from "../components/requestapproval/ApprovalTimeline";
import ApprovalActions from "../components/requestapproval/ApprovalAction";
const USERS_API = `${import.meta.env.VITE_BACKEND_URL}/api/getuserinfo`;
const DEPTS_API = `${import.meta.env.VITE_BACKEND_URL}/api/getdepartment`;

const normalizeUser = (u) => !u ? null : ({
  UserID: Number(u.UserID ?? u.userID ?? u.id ?? 0),
  DepartmentID: u.DepartmentID ?? null,
  FullName: u.FullName ?? u.fullName ?? "",
  Role: String(u.Role ?? u.role ?? "").toUpperCase() || null,
});

export default function RequestApprovalPage() {
  const [sp, setSp] = useSearchParams();
  const initialKind = APPROVAL_KIND_KEYS.includes(sp.get("kind")) ? sp.get("kind") : DEFAULT_APPROVAL_KIND;
  const [kind, setKind] = useState(initialKind);
  const K = APPROVAL_CFG[kind];

  // current user
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { try {
    const saved = localStorage.getItem("user");
    if (saved && saved !== "undefined") setCurrentUser(normalizeUser(JSON.parse(saved)));
  } catch {} }, []);

  // refs
  const [users, setUsers] = useState([]); const [usersMap, setUsersMap] = useState({});
  const [depts, setDepts] = useState([]); const [deptsMap, setDeptsMap] = useState({});
  const [loadingRefs, setLoadingRefs] = useState(false);

  const loadRefs = async () => {
    setLoadingRefs(true);
    try {
      const { opts: uopts, umap } = await loadUsers(USERS_API);
      const { opts: dopts, dmap } = await loadDepts(DEPTS_API);
      setUsers(uopts); setUsersMap(umap); setDepts(dopts); setDeptsMap(dmap);
    } catch { message.warning("Không tải được Users/Departments."); }
    finally { setLoadingRefs(false); }
  };

  // list
  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterTargetUser, setFilterTargetUser] = useState(null);
  const [filterTargetDept, setFilterTargetDept] = useState(null);

  const fetchAll = async () => {
    setLoadingList(true);
    try { setRows(await fetchAllRequests(K.base)); }
    catch { message.error("Không tải được danh sách yêu cầu."); }
    finally { setLoadingList(false); }
  };

  // detail
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState(null);
  const fetchDetailUI = async (id) => {
    setLoadingDetail(true);
    try { setDetail(await fetchRequestDetail(K.base, id, K.subCandidates)); }
    catch { message.error("Không tải được chi tiết."); setDetail(null); }
    finally { setLoadingDetail(false); }
  };

  // actions
  const doAction = async (recordOrDetail, isApprove) => {
    const req = recordOrDetail?.RequestID ? recordOrDetail : recordOrDetail?.request;
    if (!req) return;
    const stepId = STEP_ID_BY_ROLE[currentUser?.Role];
    const payload = {
      StepID: stepId, ApproverUserID: currentUser?.UserID,
      DepartmentID: currentUser?.DepartmentID ?? 1,
      Action: isApprove ? "APPROVED" : "REJECTED", Comment: "",
    };
    try {
      await postApproveAction(K.base, req.RequestID, payload);
      message.success(isApprove ? "Đã duyệt." : "Đã từ chối.");
      await fetchAll();
      if (detail?.request?.RequestID === req.RequestID) await fetchDetailUI(req.RequestID);
    } catch (e) { message.error(e?.response?.data?.message || "Xử lý duyệt thất bại."); }
  };

  // filter
  const userName = (id) => (id && usersMap[id]?.label) || (id ?? "-");
  const deptName = (id) => (id && deptsMap[id]) || (id ?? "-");

  const filteredRows = useMemo(() => {
    let data = rows;
    const s = (searchText || "").toLowerCase();
    if (s) {
      data = data.filter((r) => {
        const id = String(r.RequestID || "").toLowerCase();
        const note = String(r.Note || "").toLowerCase();
        const state = String(r.CurrentState || "").toLowerCase();
        const qty = String(r.TotalQuantity ?? "").toLowerCase();
        const tuName = String(userName(r.TargetUserID)).toLowerCase();
        const tdName = String(deptName(r.TargetDepartmentID)).toLowerCase();
        return id.includes(s) || note.includes(s) || state.includes(s) || qty.includes(s) || tuName.includes(s) || tdName.includes(s);
      });
    }
    if (filterTargetUser != null) data = data.filter((r) => Number(r.TargetUserID) === Number(filterTargetUser));
    if (filterTargetDept != null) data = data.filter((r) => Number(r.TargetDepartmentID) === Number(filterTargetDept));
    return data;
  }, [rows, searchText, filterTargetUser, filterTargetDept]);

  // mount + when kind changes
  useEffect(() => {
    setSearchText(""); setFilterTargetDept(null); setFilterTargetUser(null); setDetail(null);
    setSp({ kind }); loadRefs(); fetchAll();
  }, [kind]);

  const stepId = STEP_ID_BY_ROLE[currentUser?.Role];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <ApprovalFilterBar
        kind={kind}
        kindOptions={APPROVAL_KIND_KEYS.map((k) => ({ value: k, label: APPROVAL_CFG[k].label }))}
        onKindChange={setKind}
        searchText={searchText} setSearchText={setSearchText}
        users={users} depts={depts} loadingRefs={loadingRefs}
        filterTargetUser={filterTargetUser} setFilterTargetUser={setFilterTargetUser}
        filterTargetDept={filterTargetDept} setFilterTargetDept={setFilterTargetDept}
        role={currentUser?.Role} stepId={stepId}
        onRefresh={() => { fetchAll(); loadRefs(); }}
      />

      <Card size="small" bodyStyle={{ paddingTop: 0 }}>
        <ApprovalTable
          title={APPROVAL_CFG[kind].listTitle}
          data={filteredRows}
          loading={loadingList}
          currentUser={currentUser}
          usersMap={usersMap}
          deptsMap={deptsMap}
          onView={fetchDetailUI}
          onApprove={(r) => doAction(r, true)}
          onReject={(r) => doAction(r, false)}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <ApprovalRequestCard
            title="Thông tin yêu cầu"
            request={detail?.request}
            userName={userName}
            deptName={deptName}
            loading={loadingDetail}
          />
          <ApprovalSubCard
            title={APPROVAL_CFG[kind].subTitle}
            sub={detail?.sub}
            fields={APPROVAL_CFG[kind].subFields}
            emptyText={`Không có dữ liệu ${APPROVAL_CFG[kind].label.toLowerCase()}`}
            loading={loadingDetail}
          />
        </Col>
        <Col xs={24} md={8}>
          <ApprovalTimeline history={detail?.history || []} loading={loadingDetail} />
        </Col>
        <Col xs={24} md={8}>
          <ApprovalActions
            detail={detail}
            currentUser={currentUser}
            onApprove={() => doAction(detail, true)}
            onReject={() => doAction(detail, false)}
          />
        </Col>
      </Row>
    </Space>
  );
}
