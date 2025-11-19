// src/constants/requestapproval.js  (hoặc approval.js tuỳ project của bạn)
const API_URL = import.meta.env.VITE_BACKEND_URL;

export const STEP_ID_BY_ROLE = { IT: 1, MANAGER: 2 };

export const APPROVAL_CFG = {
  allocation: {
    key: "allocation",
    label: "Cấp phát",
    base: `${API_URL}/api/requestallocation`,
    listTitle: "Danh sách yêu cầu cấp phát",
    subTitle: "Chi tiết cấp phát",
    subCandidates: ["allocation", "alloc", "request_allocation", "Request_Allocation"],
    subFields: [
      { label: "AssetID", key: "AssetID" },
      { label: "Quantity", key: "Quantity" },
    ],
  },

  // 🔹 THÊM TRANSFER Ở ĐÂY
  transfer: {
    key: "transfer",
    label: "Chuyển giao",
    base: `${API_URL}/api/requesttransfer`,
    listTitle: "Danh sách yêu cầu chuyển giao",
    subTitle: "Chi tiết chuyển giao",
    subCandidates: ["transfer", "request_transfer", "Request_Transfer"],
    subFields: [
      { label: "AssetID", key: "AssetID" },
      { label: "Quantity", key: "Quantity" },
      // nếu sau này bạn thêm FromUser / ToUser / FromDept / ToDept vào bảng chi tiết
      // thì chỉ cần thêm key tương ứng ở đây là table hiển thị luôn
      // { label: "FromUserID", key: "FromUserID" },
      // { label: "ToUserID", key: "ToUserID" },
    ],
  },

  maintenance: {
    key: "maintenance",
    label: "Bảo trì",
    base: `${API_URL}/api/requestmaintenance`,
    listTitle: "Danh sách yêu cầu bảo trì",
    subTitle: "Chi tiết bảo trì",
    subCandidates: ["maintenance", "maint", "request_maintenance", "Request_Maintenance"],
    subFields: [
      { label: "AssetID", key: "AssetID" },
      { label: "Quantity", key: "Quantity" },
      { label: "Issue", key: "IssueDescription" },
    ],
  },
  warranty: {
    key: "warranty",
    label: "Bảo hành",
    base: `${API_URL}/api/requestwarranty`,
    listTitle: "Danh sách yêu cầu bảo hành",
    subTitle: "Chi tiết bảo hành",
    subCandidates: ["warranty", "Request_Warranty", "request_warranty"],
    subFields: [
      { label: "AssetID", key: "AssetID" },
      { label: "Quantity", key: "Quantity" },
      { label: "Warranty Provider", key: "WarrantyProvider" },
    ],
  },
  disposal: {
    key: "disposal",
    label: "Thanh lý",
    base: `${API_URL}/api/requestdisposal`,
    listTitle: "Danh sách yêu cầu thanh lý",
    subTitle: "Chi tiết thanh lý",
    subCandidates: ["disposal", "Request_Disposal", "request_disposal"],
    subFields: [
      { label: "AssetID", key: "AssetID" },
      { label: "Quantity", key: "Quantity" },
      { label: "Reason", key: "Reason" },
    ],
  },
};

export const APPROVAL_KIND_KEYS = Object.keys(APPROVAL_CFG);
export const DEFAULT_APPROVAL_KIND = "allocation";
