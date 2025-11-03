// src/services/approvalService.js
import axios from "axios";

export const getToken = () => localStorage.getItem("token") || "";
export const withAuth = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

export const extractRequests = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.requests)) return payload.data.requests;
  if (Array.isArray(payload?.requests)) return payload.requests;
  return [];
};

export const normalizeDetail = (respData, subCandidates) => {
  const root = respData?.data ?? respData ?? {};
  const data = root?.data ?? root;

  const request = data.request || data.Request || null;

  let sub = null;
  for (const k of subCandidates) {
    if (data[k] != null) {
      sub = Array.isArray(data[k]) ? (data[k][0] || null) : data[k];
      break;
    }
  }
  const history = data.history || data.approvalHistory || data.ApprovalHistory || [];
  return { request, sub, history };
};

export const fetchAllRequests = async (base) => {
  const resp = await axios.get(`${base}/getallrequest`, withAuth());
  return extractRequests(resp.data).map((r) => ({
    ...r,
    TotalQuantity: r.TotalQuantity != null ? Number(r.TotalQuantity) : r.TotalQuantity,
  }));
};

export const fetchRequestDetail = async (base, id, subCandidates) => {
  const resp = await axios.get(`${base}/getrequestdetail/${id}`, withAuth());
  if (!resp?.data?.success) throw new Error("DETAIL_API_FAILED");
  return normalizeDetail(resp.data, subCandidates);
};

export const postApproveAction = async (base, requestId, payload) => {
  return axios.post(`${base}/approverequest/${requestId}`, payload, withAuth());
};

// reference data
export const loadUsers = async (api, map = true) => {
  const resp = await axios.get(api, withAuth());
  const arr = Array.isArray(resp?.data?.data) ? resp.data.data : Array.isArray(resp?.data) ? resp.data : [];
  if (!map) return arr;
  const opts = arr.map((u) => ({
    value: Number(u.UserID),
    label: u.FullName || `User ${u.UserID}`,
    DepartmentID: u.DepartmentID ?? null,
  }));
  const umap = {}; opts.forEach((o) => (umap[o.value] = o));
  return { opts, umap };
};

export const loadDepts = async (api, map = true) => {
  const resp = await axios.get(api, withAuth());
  const arr = Array.isArray(resp?.data?.data) ? resp.data.data : Array.isArray(resp?.data) ? resp.data : [];
  if (!map) return arr;
  const opts = arr.map((d) => ({ value: Number(d.DepartmentID), label: d.DepartmentName || `Dept ${d.DepartmentID}` }));
  const dmap = {}; opts.forEach((o) => (dmap[o.value] = o.label));
  return { opts, dmap };
};
