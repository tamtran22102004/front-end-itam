// src/services/stocktakeApi.js
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;
const BASE = `${API_URL}/api/stocktake`;

// ===== helpers =====
const getAuth = () => {
  const token = localStorage.getItem("token") || "";
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};
const unwrap = (res) => res?.data?.data ?? res?.data;

// ===== master data (bạn nói sẽ dùng) =====
export async function apiUsers() {
  const res = await axios.get(`${API_URL}/api/getuserinfo`, getAuth());
  return unwrap(res) || [];
}
export async function apiDepartments() {
  const res = await axios.get(`${API_URL}/api/getdepartment`, getAuth());
  return unwrap(res) || [];
}
export async function apiLocations() {
  const res = await axios.get(`${API_URL}/api/getlocation`, getAuth());
  return unwrap(res) || [];
}
export async function apiAssets() {
  const res = await axios.get(`${API_URL}/api/asset`, getAuth());
  return unwrap(res) || [];
}

// ===============================
// Stocktake routes (khớp stocktake.js)
// ===============================

// GET "/" -> danh sách phiên
export async function apiListSessions() {
  const res = await axios.get(`${BASE}/`, getAuth());
  return unwrap(res) || [];
}

// GET "/:id" -> chi tiết phiên
export async function apiGetSession(sessionId) {
  const res = await axios.get(`${BASE}/${sessionId}`, getAuth());
  return unwrap(res);
}

// GET "/:id/lines" -> danh sách dòng kiểm kê
export async function apiGetLines(sessionId) {
  const res = await axios.get(`${BASE}/${sessionId}/lines`, getAuth());
  return unwrap(res) || [];
}

// POST "/add" -> tạo phiên
// payload: { DepartmentID?: number|null, CreatedBy?: number|null, Note?: string }
export async function apiCreateSession(payload) {
  const res = await axios.post(`${BASE}/add`, payload, getAuth());
  const data = unwrap(res);
  // Trả ra ID bất kể BE trả field gì
  return data?.SessionID ?? data?.sessionId ?? data?.id ?? data;
}

// POST "/seed/:id" -> seed danh sách asset vào dòng kiểm kê
// payload: { assetIds: string[], foundLocationId?: number|null, defaultFound?: boolean }
export async function apiSeedSession(sessionId, payload) {
  const res = await axios.post(`${BASE}/seed/${sessionId}`, payload, getAuth());
  return unwrap(res);
}

// POST "/:id/scan" -> quét nhanh 1 asset tạo/cập nhật line
// body ví dụ: { AssetID?: string, QRCode?: string, Found?: boolean, FoundLocationID?: number|null, Remarks?: string }
export async function apiScanAsset(sessionId, body) {
  const res = await axios.post(`${BASE}/${sessionId}/scan`, body, getAuth());
  return unwrap(res);
}

// PATCH "/:id/line/:lineId" -> cập nhật 1 dòng
// body: { Found?: boolean, FoundLocationID?: number|null, Remarks?: string }
export async function apiUpdateLine(sessionId, lineId, body) {
  const res = await axios.patch(`${BASE}/${sessionId}/line/${lineId}`, body, getAuth());
  return unwrap(res);
}

// POST "/:id/close" -> đóng phiên (sau khi kiểm kê xong)
export async function apiCloseSession(sessionId) {
  const res = await axios.post(`${BASE}/${sessionId}/close`, {}, getAuth());
  return unwrap(res);
}

// GET "/statistics/range" -> thống kê xuất/nhập/tồn theo khoảng thời gian
// params gợi ý: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', departmentId?, categoryId? }
export async function apiGetStatistics(params) {
  const res = await axios.get(`${BASE}/statistics/range`, {
    ...getAuth(),
    params,
  });
  return unwrap(res) || {};
}
