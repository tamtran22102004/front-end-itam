import React, { useEffect, useMemo, useState } from "react";
import { Space, Card, Row, Col, message, Tag, Typography } from "antd";
import { useSearchParams } from "react-router-dom";
import {
  APPROVAL_CFG,
  APPROVAL_KIND_KEYS,
  DEFAULT_APPROVAL_KIND,
  STEP_ID_BY_ROLE,
} from "../constants/requestapproval";
import {
  fetchAllRequests,
  fetchRequestDetail,
  postApproveAction,
  loadUsers,
  loadDepts,
} from "../services/requestapprovalApi";

import ApprovalFilterBar from "../components/requestapproval/ApprovalFilterBar";
import ApprovalTable from "../components/requestapproval/ApprovalTable";
import ApprovalRequestCard from "../components/requestapproval/ApprovalRequestCard";
import ApprovalSubCard from "../components/requestapproval/ApprovalSubCard";
import ApprovalTimeline from "../components/requestapproval/ApprovalTimeline";
import ApprovalActions from "../components/requestapproval/ApprovalAction";

const USERS_API = `${import.meta.env.VITE_BACKEND_URL}/api/getuserinfo`;
const DEPTS_API = `${import.meta.env.VITE_BACKEND_URL}/api/getdepartment`;

const { Text } = Typography;

const normalizeUser = (u) =>
  !u
    ? null
    : {
        UserID: Number(u.UserID ?? u.userID ?? u.id ?? 0),
        DepartmentID: u.DepartmentID ?? null,
        FullName: u.FullName ?? u.fullName ?? "",
        Role: String(u.Role ?? u.role ?? "").toUpperCase() || null,
      };

export default function RequestApprovalPage() {
  const [sp, setSp] = useSearchParams();

  // ===== KIND (ALLOCATION / MAINTENANCE / DISPOSAL / WARRANTY) =====
  const urlKind = sp.get("kind");
  const initialKind = APPROVAL_KIND_KEYS.includes(urlKind)
    ? urlKind
    : DEFAULT_APPROVAL_KIND;

  const [kind, setKind] = useState(initialKind);
  const cfg = APPROVAL_CFG[kind];

  // ===== CURRENT USER =====
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved && saved !== "undefined") {
        setCurrentUser(normalizeUser(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  const stepId = STEP_ID_BY_ROLE[currentUser?.Role];

  // ===== REFERENCE DATA: USERS / DEPARTMENTS =====
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [depts, setDepts] = useState([]);
  const [deptsMap, setDeptsMap] = useState({});
  const [loadingRefs, setLoadingRefs] = useState(false);

  const loadRefs = async () => {
    setLoadingRefs(true);
    try {
      const { opts: uopts, umap } = await loadUsers(USERS_API);
      const { opts: dopts, dmap } = await loadDepts(DEPTS_API);
      setUsers(uopts);
      setUsersMap(umap);
      setDepts(dopts);
      setDeptsMap(dmap);
    } catch (e) {
      console.error(e);
      message.warning("Không tải được Users/Departments.");
    } finally {
      setLoadingRefs(false);
    }
  };

  // ===== LIST REQUESTS =====
  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState([]);

  const fetchAll = async () => {
    if (!cfg?.base) return;
    setLoadingList(true);
    try {
      const list = await fetchAllRequests(cfg.base);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      message.error("Không tải được danh sách yêu cầu.");
    } finally {
      setLoadingList(false);
    }
  };

  // ===== DETAIL =====
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetchDetailUI = async (id) => {
    if (!id || !cfg?.base) return;
    setLoadingDetail(true);
    try {
      const d = await fetchRequestDetail(cfg.base, id, cfg.subCandidates);
      setDetail(d || null);
    } catch (e) {
      console.error(e);
      message.error("Không tải được chi tiết yêu cầu.");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ===== ACTION: APPROVE / REJECT =====
  const doAction = async (recordOrDetail, isApprove) => {
    const req =
      recordOrDetail?.RequestID ?? recordOrDetail?.request?.RequestID
        ? recordOrDetail.RequestID
          ? recordOrDetail
          : recordOrDetail.request
        : null;

    if (!req) {
      message.error("Không xác định được yêu cầu.");
      return;
    }

    if (!currentUser?.UserID) {
      message.error("Không xác định người duyệt.");
      return;
    }

    if (!stepId) {
      message.warning("Role hiện tại không có bước duyệt tương ứng.");
      return;
    }

    // Ngăn duyệt lại yêu cầu đã final
    const currState = String(req.CurrentState || "").toUpperCase();
    if (["APPROVED", "REJECTED", "CANCELLED"].includes(currState)) {
      message.info("Yêu cầu đã ở trạng thái cuối, không thể thao tác.");
      return;
    }

    const payload = {
      StepID: stepId,
      ApproverUserID: currentUser.UserID,
      DepartmentID: currentUser.DepartmentID ?? req.TargetDepartmentID ?? 1,
      Action: isApprove ? "APPROVED" : "REJECTED",
      Comment: "",
    };

    try {
      await postApproveAction(cfg.base, req.RequestID, payload);
      message.success(isApprove ? "Đã duyệt yêu cầu." : "Đã từ chối yêu cầu.");
      await fetchAll();
      if (detail?.request?.RequestID === req.RequestID) {
        await fetchDetailUI(req.RequestID);
      }
    } catch (e) {
      console.error(e);
      message.error(
        e?.response?.data?.message || "Xử lý duyệt yêu cầu thất bại."
      );
    }
  };

  // ===== FILTER LOGIC =====
  const [searchText, setSearchText] = useState("");
  const [filterTargetUser, setFilterTargetUser] = useState(null);
  const [filterTargetDept, setFilterTargetDept] = useState(null);

  const userName = (id) =>
    id && usersMap[id]?.label
      ? usersMap[id].label
      : id != null
      ? String(id)
      : "-";

  const deptName = (id) =>
    id && deptsMap[id] ? deptsMap[id] : id != null ? String(id) : "-";

  const filteredRows = useMemo(() => {
    let data = rows || [];
    const s = (searchText || "").toLowerCase().trim();

    if (s) {
      data = data.filter((r) => {
        const id = String(r.RequestID || "").toLowerCase();
        const note = String(r.Note || "").toLowerCase();
        const state = String(r.CurrentState || "").toLowerCase();
        const qty = String(r.TotalQuantity ?? "").toLowerCase();
        const tuName = String(userName(r.TargetUserID)).toLowerCase();
        const tdName = String(deptName(r.TargetDepartmentID)).toLowerCase();
        return (
          id.includes(s) ||
          note.includes(s) ||
          state.includes(s) ||
          qty.includes(s) ||
          tuName.includes(s) ||
          tdName.includes(s)
        );
      });
    }

    if (filterTargetUser != null) {
      data = data.filter(
        (r) => Number(r.TargetUserID) === Number(filterTargetUser)
      );
    }
    if (filterTargetDept != null) {
      data = data.filter(
        (r) => Number(r.TargetDepartmentID) === Number(filterTargetDept)
      );
    }
    return data;
  }, [
    rows,
    searchText,
    filterTargetUser,
    filterTargetDept,
    usersMap,
    deptsMap,
  ]);

  // ===== WHEN KIND CHANGES / FIRST MOUNT =====
  useEffect(() => {
    // reset filter & detail
    setSearchText("");
    setFilterTargetDept(null);
    setFilterTargetUser(null);
    setDetail(null);

    // sync URL
    setSp({ kind });

    // reload refs + list cho loại mới
    loadRefs();
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* HEADER + FILTER BAR */}
      {/* CARD 1: Thông tin chung */}
      <Card
        size="small"
        bodyStyle={{ padding: 10 }}
        style={{ borderRadius: 10 }}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Space wrap>
            <Tag color="blue">
              Loại phiếu:&nbsp;
              <b>{cfg.label}</b>
            </Tag>

            <Tag>
              Người đăng nhập:&nbsp;
              <b>{currentUser?.FullName || currentUser?.UserID || "—"}</b>
            </Tag>

            <Tag>
              Role:&nbsp;
              <b>{currentUser?.Role || "—"}</b>
            </Tag>

            <Tag color={stepId ? "green" : "default"}>
              Step duyệt:&nbsp;
              <b>{stepId || "N/A"}</b>
            </Tag>

            <Tag color="purple">
              Tổng yêu cầu:&nbsp;<b>{rows.length}</b>
            </Tag>

            <Tag color="geekblue">
              Sau lọc:&nbsp;<b>{filteredRows.length}</b>
            </Tag>
          </Space>
        </Space>
      </Card>

      {/* CARD 2: Filter Bar */}
      <Card
        size="small"
        bodyStyle={{ padding: 10 }}
        style={{ borderRadius: 10 }}
      >
        <ApprovalFilterBar
          kind={kind}
          kindOptions={APPROVAL_KIND_KEYS.map((k) => ({
            value: k,
            label: APPROVAL_CFG[k].label,
          }))}
          onKindChange={setKind}
          searchText={searchText}
          setSearchText={setSearchText}
          users={users}
          depts={depts}
          loadingRefs={loadingRefs}
          filterTargetUser={filterTargetUser}
          setFilterTargetUser={setFilterTargetUser}
          filterTargetDept={filterTargetDept}
          setFilterTargetDept={setFilterTargetDept}
          role={currentUser?.Role}
          stepId={stepId}
          onRefresh={() => {
            fetchAll();
            loadRefs();
          }}
        />
      </Card>

      {/* TABLE LIST */}
      <Card size="small" bodyStyle={{ paddingTop: 0 }}>
        <ApprovalTable
          title={cfg.listTitle}
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

      {/* DETAIL LAYOUT */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <ApprovalRequestCard
            title="Thông tin yêu cầu"
            request={detail?.request}
            sub={detail?.sub} // ✅ thêm sub: mảng allocation/maintenance/...
            userName={userName}
            deptName={deptName}
            loading={loadingDetail}
            kindLabel={cfg.label} // ✅ label loại phiếu (Cấp phát/Bảo trì/...)
            kindCode={kind} // ✅ code: allocation / maintenance / ...
          />
          <ApprovalSubCard
            title={cfg.subTitle}
            sub={detail?.sub}
            fields={cfg.subFields}
            emptyText={`Không có dữ liệu ${cfg.label.toLowerCase()}`}
            loading={loadingDetail}
          />
        </Col>

        <Col xs={24} md={8}>
          <ApprovalTimeline
            history={detail?.history || []}
            loading={loadingDetail}
          />
        </Col>

        <Col xs={24} md={8}>
          <ApprovalActions
            detail={detail}
            currentUser={currentUser}
            onApprove={() => doAction(detail, true)}
            onReject={() => doAction(detail, false)}
          />
          {!stepId && (
            <Card
              size="small"
              style={{ marginTop: 8 }}
              bodyStyle={{ padding: 10 }}
            >
              <Text type="secondary">
                Role hiện tại không map với bất kỳ StepID nào trong{" "}
                <code>STEP_ID_BY_ROLE</code>. Bạn vẫn xem được chi tiết nhưng
                không thể thao tác duyệt.
              </Text>
            </Card>
          )}
        </Col>
      </Row>
    </Space>
  );
}
