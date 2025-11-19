// src/services/requestapprovalApi.js
import axios from "axios";

export const getToken = () => localStorage.getItem("token") || "";
export const withAuth = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
});

// Chuẩn hoá lấy list request từ nhiều kiểu payload khác nhau
export const extractRequests = (payload) => {
  // payload có thể là:
  // - [ ... ]
  // - { data: [ ... ] }
  // - { data: { requests: [ ... ] } }
  // - { requests: [ ... ] }
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.requests)) return payload.data.requests;
  if (Array.isArray(payload?.requests)) return payload.requests;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

// Chuẩn hoá detail theo kiểu backend của bạn
// resp.data hiện tại: { success, message, data: { request, allocation/..., approvalHistory } }
export const normalizeDetail = (respData, subCandidates = []) => {
  const root = respData?.data ?? respData ?? {};
  const data = root?.data ?? root;

  const request = data.request || data.Request || null;

  // Tìm "sub" theo các key cấu hình: allocation / maintenance / disposal / warranty / ...
  let sub = null;
  if (Array.isArray(subCandidates)) {
    for (const k of subCandidates) {
      if (data[k] != null) {
        sub = data[k];
        break;
      }
    }
  }
  if (sub == null && data.sub != null) {
    sub = data.sub;
  }

  // Đảm bảo sub luôn là mảng
  let subArr;
  if (Array.isArray(sub)) subArr = sub;
  else if (sub) subArr = [sub];
  else subArr = [];

  const history =
    data.history ||
    data.approvalHistory ||
    data.ApprovalHistory ||
    [];

  return { request, sub: subArr, history };
};

// ===== API LIST =====
// base = `${API_URL}/api/requestallocation` kiểu vậy
export const fetchAllRequests = async (base) => {
  const resp = await axios.get(`${base}/getallrequest`, withAuth());
  const list = extractRequests(resp.data);
  return list.map((r) => ({
    ...r,
    TotalQuantity:
      r.TotalQuantity != null ? Number(r.TotalQuantity) : r.TotalQuantity,
  }));
};

// ===== API DETAIL =====
export const fetchRequestDetail = async (base, id, subCandidates) => {
  const resp = await axios.get(`${base}/getrequestdetail/${id}`, withAuth());
  if (!resp?.data?.success) throw new Error("DETAIL_API_FAILED");
  return normalizeDetail(resp.data, subCandidates);
};

// ===== APPROVE / REJECT =====
export const postApproveAction = async (base, requestId, payload) => {
  return axios.post(
    `${base}/approverequest/${requestId}`,
    payload,
    withAuth()
  );
};

// ===== REFERENCE DATA =====
export const loadUsers = async (api, map = true) => {
  const resp = await axios.get(api, withAuth());
  const arr = Array.isArray(resp?.data?.data)
    ? resp.data.data
    : Array.isArray(resp?.data)
    ? resp.data
    : [];

  if (!map) return arr;

  const opts = arr.map((u) => ({
    value: Number(u.UserID),
    label: u.FullName || `User ${u.UserID}`,
    DepartmentID: u.DepartmentID ?? null,
  }));
  const umap = {};
  opts.forEach((o) => (umap[o.value] = o));
  return { opts, umap };
};

export const loadDepts = async (api, map = true) => {
  const resp = await axios.get(api, withAuth());
  const arr = Array.isArray(resp?.data?.data)
    ? resp.data.data
    : Array.isArray(resp?.data)
    ? resp.data
    : [];

  if (!map) return arr;

  const opts = arr.map((d) => ({
    value: Number(d.DepartmentID),
    label: d.DepartmentName || `Dept ${d.DepartmentID}`,
  }));
  const dmap = {};
  opts.forEach((o) => (dmap[o.value] = o.label));
  return { opts, dmap };
};
