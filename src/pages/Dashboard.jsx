// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Grid,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ReloadOutlined,
  FilterOutlined,
  LaptopOutlined,
  PieChartOutlined,
  DollarOutlined,
  FundOutlined,
  AlertOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const { RangePicker } = DatePicker;
const { Text } = Typography;
const useBreakpoint = Grid.useBreakpoint;
const API_URL = import.meta.env.VITE_BACKEND_URL;

/* ================= Helpers ================= */
const withAuth = () => {
  const token = localStorage.getItem("token") || "";
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};
const nf = (n) => new Intl.NumberFormat().format(Number(n || 0));
const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
const pctText = (x) =>
  `${(Number(x || 0) * 100).toFixed(1).replace(/\.0$/, "")}%`;

const PALETTE = [
  "#1677ff",
  "#52c41a",
  "#faad14",
  "#eb2f96",
  "#722ed1",
  "#13c2c2",
  "#a0d911",
  "#2f54eb",
  "#fa8c16",
  "#ff4d4f",
];

// Gom nhóm theo field (dùng cho donut alert)
function groupByField(list, field, unknownLabel = "Khác") {
  if (!Array.isArray(list) || !list.length) return [];
  const map = {};
  list.forEach((r) => {
    const key = r?.[field] || unknownLabel;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

// Donut label bên ngoài
const renderLabelOutside = ({
  name,
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#333"
      fontSize={12}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${name}: ${pctText(percent)}`}
    </text>
  );
};

// Gom nhóm bảo hành theo bucket số ngày còn lại
function buildWarrantyBucketPie(list) {
  if (!Array.isArray(list) || !list.length) return [];
  const bucket = {};
  const inc = (k) => {
    bucket[k] = (bucket[k] || 0) + 1;
  };
  list.forEach((r) => {
    const raw = r?.DaysLeft;
    const d = Number(raw);
    if (!Number.isFinite(d)) {
      inc("Không rõ");
    } else if (d < 0) {
      inc("Đã hết hạn");
    } else if (d <= 7) {
      inc("≤ 7 ngày");
    } else if (d <= 30) {
      inc("8 – 30 ngày");
    } else {
      inc("> 30 ngày");
    }
  });
  return Object.entries(bucket).map(([name, value]) => ({ name, value }));
}

/* ================= KPI CARD STYLE (giống hình bạn gửi) ================= */
const KpiCard = ({
  title,
  value,
  description,
  trendText,
  trendType = "neutral", // "up" | "down" | "neutral"
  icon,
  pillColor = "#111827",
}) => {
  const trendColor =
    trendType === "up"
      ? "#16a34a"
      : trendType === "down"
      ? "#ef4444"
      : "#6b7280";

  return (
    <div
      style={{
        borderRadius: 16,
        background: "#ffffff",
        padding: "16px 18px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        height: "100%",
      }}
    >
      {/* Top: title + value + icon pill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              color: "#9ca3af",
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
        </div>

        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: pillColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          {icon}
        </div>
      </div>

      {/* Middle: mô tả */}
      {description && (
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
          {description}
        </div>
      )}

      {/* Bottom: trend */}
      {trendText && (
        <div
          style={{
            fontSize: 12,
            marginTop: 4,
            color: trendColor,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {trendType === "up" && <ArrowUpOutlined />}
          {trendType === "down" && <ArrowDownOutlined />}
          <span>{trendText}</span>
        </div>
      )}
    </div>
  );
};

/* ================= Page ================= */
export default function DashboardPage() {
  const screens = useBreakpoint();

  // Bộ lọc
  const defaultTo = dayjs();
  const defaultFrom = defaultTo.clone().subtract(11, "month").startOf("month");
  const [range, setRange] = useState([defaultFrom, defaultTo]);
  const [dept, setDept] = useState(null);
  const [cat, setCat] = useState(null);
  const [warrantyDays, setWarrantyDays] = useState(30);

  // Option filter
  const [deptOptions, setDeptOptions] = useState([]);
  const [catOptions, setCatOptions] = useState([]);

  // Dữ liệu dashboard
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState(null);
  const [alerts, setAlerts] = useState(null);

  /* ---------- Load options (danh mục, phòng ban) ---------- */
  const loadOptions = async () => {
    try {
      const r = await axios.get(`${API_URL}/api/category`, withAuth());
      const raw = Array.isArray(r?.data?.data)
        ? r.data.data
        : Object.values(r?.data?.data || r?.data || {});
      setCatOptions(
        (raw || []).map((c) => ({
          label: c.Name || c.name,
          value: c.ID || c.id,
        }))
      );
    } catch {}

    try {
      const r = await axios.get(`${API_URL}/api/getdepartment`, withAuth());
      const arr = Array.isArray(r?.data?.data)
        ? r.data.data
        : Object.values(r?.data?.data || r?.data || {});
      setDeptOptions(
        (arr || []).map((d) => ({
          label: d.DepartmentName || d.name,
          value: d.DepartmentID || d.id,
        }))
      );
    } catch {}
  };

  /* ---------- Build query string ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    if (range?.[0] && range?.[1]) {
      params.set("from", range[0].format("YYYY-MM-DD"));
      params.set("to", range[1].format("YYYY-MM-DD"));
    }
    if (dept) params.set("dept", String(dept));
    if (cat) params.set("cat", String(cat));
    if (warrantyDays != null) params.set("warrantyDays", String(warrantyDays));
    return params.toString();
  };

  /* ---------- Load dashboard data ---------- */
  const loadAll = async () => {
    setLoading(true);
    const qs = buildQuery();
    try {
      const [s, t, a] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/summary?${qs}`, withAuth()),
        axios.get(`${API_URL}/api/dashboard/series?${qs}`, withAuth()),
        axios.get(`${API_URL}/api/dashboard/alerts?limit=50&${qs}`, withAuth()),
      ]);

      setSummary(s?.data?.data || null);
      setSeries(t?.data?.data || null);
      setAlerts(a?.data?.data || null);
    } catch (e) {
      console.error(e);
      message.error(
        e?.response?.data?.message || "Không tải được dữ liệu Dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept, cat, warrantyDays, range?.[0], range?.[1]]);

  /* ================= Chuẩn hóa dữ liệu từ API ================= */

  // KPI tổng quan
  const totalAssets = Number(summary?.totals?.assets || 0);
  const totalValue = Number(summary?.totals?.purchaseValue || 0);
  const deptCount = Number(summary?.totals?.departments || 0);
  const catCount = Number(summary?.totals?.categories || 0);

  const utilization = Number(summary?.utilization ?? 0);
  const maintenanceTotal = Number(summary?.maintenance?.total || 0);
  const maintenanceOverdue = Number(summary?.maintenance?.overdue || 0);
  const maintenanceDone = Number(summary?.maintenance?.done || 0);

  const stocktakeSessions = Number(summary?.stocktake?.sessions || 0);
  const missingCount = Number(summary?.stocktake?.missingCount || 0);
  const missingRate = Number(summary?.stocktake?.missingRate || 0);

  const approvalPending = Number(summary?.approval?.pending || 0);
  const approvalBreach = Number(summary?.approval?.breach || 0);

  // Dòng vào / ra theo AssetHistory
  const inQty = Number(summary?.movement?.inQty || 0);
  const outQty = Number(summary?.movement?.outQty || 0);
  const netQty = Number(summary?.movement?.netQty || 0);
  const inValue = Number(summary?.movement?.inValue || 0);
  const outValue = Number(summary?.movement?.outValue || 0);
  const netValue = Number(summary?.movement?.netValue || 0);

  // Biểu đồ: giá trị tài sản theo phòng ban
  const valueByDept = useMemo(() => {
    if (Array.isArray(series?.valueByDept) && series.valueByDept.length) {
      return series.valueByDept.map((d, idx) => ({
        name: d.deptName || d.dept || d.DepartmentName || `Phòng ${idx + 1}`,
        value: Number(d.totalValue || d.value || 0),
      }));
    }
    return [];
  }, [series]);

  // Biểu đồ: số lượng tài sản theo asset (top 20)
  const quantityByAsset = useMemo(() => {
    if (
      Array.isArray(series?.quantityByAsset) &&
      series.quantityByAsset.length
    ) {
      return series.quantityByAsset.map((a, idx) => ({
        name: a.assetName || a.Name || `Tài sản ${idx + 1}`,
        value: Number(a.totalQty || a.qty || a.count || 0),
      }));
    }
    return [];
  }, [series]);

  // Biểu đồ: trạng thái tài sản
  const assetStatusData = useMemo(() => {
    if (Array.isArray(series?.assetStatus) && series.assetStatus.length) {
      return series.assetStatus.map((s) => ({
        name: s.statusName || s.StatusName || s.Status || s.status || "Khác",
        value: Number(s.count || s.total || 0),
      }));
    }
    return [];
  }, [series]);

  // Biểu đồ: bảo trì theo tháng
  const maintenanceByMonth = useMemo(() => {
    if (
      Array.isArray(series?.maintenanceByMonth) &&
      series.maintenanceByMonth.length
    ) {
      return series.maintenanceByMonth.map((m) => ({
        month: m.monthLabel || m.month || m.label,
        created: Number(m.created || 0),
        done: Number(m.done || 0),
        overdue: Number(m.overdue || 0),
      }));
    }
    return [];
  }, [series]);

  /* ========== Donut data cho KPI ========== */
  const utilizationPieData = useMemo(() => {
    if (!totalAssets || !utilization) return [];
    const used = Math.round(totalAssets * utilization);
    const idle = Math.max(totalAssets - used, 0);
    const data = [];
    if (used > 0) data.push({ name: "Đang sử dụng", value: used });
    if (idle > 0) data.push({ name: "Chưa sử dụng", value: idle });
    return data;
  }, [totalAssets, utilization]);

  const missingPieData = useMemo(() => {
    if (!totalAssets || !missingCount) return [];
    const ok = Math.max(totalAssets - missingCount, 0);
    const data = [{ name: "Mất / thiếu", value: missingCount }];
    if (ok > 0) data.push({ name: "Còn đủ", value: ok });
    return data;
  }, [totalAssets, missingCount]);

  const approvalPieData = useMemo(() => {
    const data = [];
    if (approvalPending > 0)
      data.push({ name: "Đang chờ duyệt", value: approvalPending });
    if (approvalBreach > 0)
      data.push({ name: "Trễ SLA", value: approvalBreach });
    return data;
  }, [approvalPending, approvalBreach]);

  /* ========== Donut data cho các cảnh báo ========== */
  const expiringWarrantyPie = useMemo(
    () => buildWarrantyBucketPie(alerts?.expiringWarranty || []),
    [alerts]
  );

  const overdueMaintenancePie = useMemo(
    () => groupByField(alerts?.overdueMaintenance || [], "Dept", "Khác"),
    [alerts]
  );

  const missingAssetPie = useMemo(
    () => groupByField(alerts?.stocktakeMissing || [], "Dept", "Khác"),
    [alerts]
  );

  const approvalSlaPie = useMemo(
    () => groupByField(alerts?.approvalSlaBreach || [], "Type", "Khác"),
    [alerts]
  );

  /* ================= Cột cho các bảng cảnh báo ================= */
  const colExpWarranty = [
    { title: "Tài sản", dataIndex: "Name", key: "Name", ellipsis: true },
    { title: "Phòng ban", dataIndex: "Dept", key: "Dept", width: 160 },
    {
      title: "Ngày hết BH",
      dataIndex: "WarrantyEndDate",
      key: "WarrantyEndDate",
      width: 140,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: "Còn (ngày)",
      dataIndex: "DaysLeft",
      key: "DaysLeft",
      width: 120,
    },
  ];

  const colOverdueMaint = [
    { title: "Tài sản", dataIndex: "Name", key: "Name", ellipsis: true },
    { title: "Phòng ban", dataIndex: "Dept", key: "Dept", width: 160 },
    {
      title: "Ngày kế hoạch",
      dataIndex: "PlannedDate",
      key: "PlannedDate",
      width: 140,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: "Quá hạn (ngày)",
      dataIndex: "DaysOverdue",
      key: "DaysOverdue",
      width: 140,
    },
  ];

  const colMissing = [
    { title: "Tài sản", dataIndex: "Name", key: "Name", ellipsis: true },
    { title: "Phòng ban", dataIndex: "Dept", key: "Dept", width: 160 },
    {
      title: "Phiên kiểm kê",
      dataIndex: "SessionID",
      key: "SessionID",
      width: 110,
    },
    {
      title: "Lần cuối thấy",
      dataIndex: "LastSeenAt",
      key: "LastSeenAt",
      width: 160,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      key: "Status",
      width: 120,
      render: (v) => (
        <Tag color={v === "MISSING" ? "error" : "success"}>{v}</Tag>
      ),
    },
  ];

  const colApprovalBreach = [
    {
      title: "Mã yêu cầu",
      dataIndex: "RequestID",
      key: "RequestID",
      width: 110,
    },
    { title: "Loại yêu cầu", dataIndex: "Type", key: "Type", width: 150 },
    {
      title: "Trạng thái hiện tại",
      dataIndex: "CurrentState",
      key: "CurrentState",
      width: 140,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Chờ (ngày)",
      dataIndex: "DaysWaiting",
      key: "DaysWaiting",
      width: 120,
    },
  ];

  /* ================= Render ================= */
  return (
    <div style={{ padding: 12 }}>
      {/* Header + Bộ lọc */}
      <Card
        size="small"
        style={{ marginBottom: 12, borderRadius: 10 }}
        bodyStyle={{ padding: 12 }}
        title={<b>Tổng quan tài sản CNTT</b>}
        extra={
          summary?.totals ? (
            <Text type="secondary">
              Tổng tài sản: <b>{nf(totalAssets)}</b>
            </Text>
          ) : null
        }
      >
        <Space wrap>
          <RangePicker
            allowClear={false}
            value={range}
            onChange={setRange}
            picker="month"
          />
          <Select
            allowClear
            showSearch
            placeholder="Lọc theo phòng ban"
            style={{ width: 220 }}
            value={dept}
            onChange={setDept}
            options={deptOptions}
            optionFilterProp="label"
          />
          <Select
            allowClear
            showSearch
            placeholder="Lọc theo danh mục"
            style={{ width: 240 }}
            value={cat}
            onChange={setCat}
            options={catOptions}
            optionFilterProp="label"
          />
          <InputNumber
            min={0}
            max={365}
            value={warrantyDays}
            onChange={setWarrantyDays}
            addonBefore={<FilterOutlined />}
            addonAfter={<span>ngày hết BH</span>}
            style={{ width: 200 }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {/* Hàng KPI tổng quan - STYLE MỚI */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} md={6}>
          <KpiCard
            title="Tổng số tài sản"
            value={nf(totalAssets)}
            description={
              deptCount > 0 && catCount > 0
                ? `Trong ${deptCount} phòng ban, ${catCount} danh mục`
                : "Theo dữ liệu hiện tại"
            }
            icon={<LaptopOutlined />}
            pillColor="#111827"
            trendText={totalAssets > 0 ? "Đã có dữ liệu tài sản" : ""}
            trendType={totalAssets > 0 ? "up" : "neutral"}
          />
        </Col>

        <Col xs={24} md={6}>
          <KpiCard
            title="Tổng nguyên giá (ước tính)"
            value={money(totalValue)}
            description="Tính theo PurchasePrice / PurchaseDate"
            icon={<DollarOutlined />}
            pillColor="#ec4899"
            trendText=""
            trendType="neutral"
          />
        </Col>

        <Col xs={24} md={6}>
          <KpiCard
            title="Tỷ lệ đang sử dụng"
            value={pctText(utilization)}
            description="Dựa trên Status / InUse"
            icon={<PieChartOutlined />}
            pillColor="#22c55e"
            trendText={
              utilization >= 0.7
                ? "Mức sử dụng tốt"
                : "Tỷ lệ sử dụng cần cải thiện"
            }
            trendType={utilization >= 0.7 ? "up" : "down"}
          />
        </Col>

        <Col xs={24} md={6}>
          <KpiCard
            title="Tài sản mất / thiếu"
            value={
              missingRate
                ? `${nf(missingCount)} (${pctText(missingRate)})`
                : nf(missingCount)
            }
            description="Theo phiên kiểm kê gần nhất"
            icon={<AlertOutlined />}
            pillColor="#3b82f6"
            trendText={
              missingCount > 0
                ? "Cần rà soát & xử lý sớm"
                : "Không có tài sản mất / thiếu"
            }
            trendType={missingCount > 0 ? "down" : "up"}
          />
        </Col>
      </Row>

      {/* Hàng KPI dòng vào / ra kho - STYLE MỚI */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} md={6}>
          <KpiCard
            title="SL nhập (AVAILABLE)"
            value={nf(inQty)}
            description="Theo lịch sử tài sản"
            icon={<FundOutlined />}
            pillColor="#06b6d4"
            trendText=""
            trendType="neutral"
          />
        </Col>

        <Col xs={24} md={6}>
          <KpiCard
            title="SL ra (mất / hủy)"
            value={nf(outQty)}
            description="DISPOSED + STOCKTAKE_MISSING"
            icon={<FundOutlined />}
            pillColor="#f97316"
            trendText={
              outQty > 0
                ? "Cần kiểm soát tổn thất tài sản"
                : "Không có tài sản bị hủy"
            }
            trendType={outQty > 0 ? "down" : "up"}
          />
        </Col>

        <Col xs={24} md={6}>
          <KpiCard
            title="Giá trị nhập (ước tính)"
            value={money(inValue)}
            description="Dựa trên PurchasePrice"
            icon={<DollarOutlined />}
            pillColor="#22c55e"
            trendText=""
            trendType="neutral"
          />
        </Col>

        <Col xs={24} md={6}>
          <KpiCard
            title="Tổn thất giá trị (mất / hủy)"
            value={money(outValue)}
            description="DISPOSED + STOCKTAKE_MISSING"
            icon={<DollarOutlined />}
            pillColor="#ef4444"
            trendText={
              outValue > 0 ? "Cần tối ưu quy trình sử dụng tài sản" : ""
            }
            trendType={outValue > 0 ? "down" : "neutral"}
          />
        </Col>
      </Row>

      {/* Phần dưới: giữ nguyên như bạn đang có */}

      {/* Biểu đồ donut cho KPI tổng quan */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} md={8}>
          <Card
            size="small"
            style={{ borderRadius: 10 }}
            title="Tỷ lệ tài sản đang sử dụng"
          >
            {utilizationPieData.length ? (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={utilizationPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      label={renderLabelOutside}
                      labelLine={true}
                    >
                      {utilizationPieData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RTooltip formatter={(v, name) => [nf(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Chưa có dữ liệu tỷ lệ sử dụng" />
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            size="small"
            style={{ borderRadius: 10 }}
            title="Tỷ lệ tài sản mất / thiếu"
          >
            {missingPieData.length ? (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={missingPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      label={renderLabelOutside}
                      labelLine={true}
                    >
                      {missingPieData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RTooltip formatter={(v, name) => [nf(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Chưa có dữ liệu mất / thiếu" />
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            size="small"
            style={{ borderRadius: 10 }}
            title="Tình trạng phê duyệt"
          >
            {approvalPieData.length ? (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={approvalPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      label={renderLabelOutside}
                      labelLine={true}
                    >
                      {approvalPieData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RTooltip formatter={(v, name) => [nf(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Chưa có dữ liệu phê duyệt" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ: Giá trị theo phòng ban + số lượng theo danh mục */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} md={14}>
          <Card
            size="small"
            title="Giá trị tài sản theo phòng ban"
            style={{ borderRadius: 10 }}
            extra={<Text type="secondary">Tính từ Asset + PurchasePrice</Text>}
          >
            {valueByDept.length ? (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={valueByDept}
                    margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tickFormatter={(v) => nf(v / 1_000_000) + "tr"} />
                    <RTooltip formatter={(v) => money(v)} />
                    <Legend />
                    <Bar dataKey="value" name="Giá trị" radius={[6, 6, 0, 0]}>
                      {valueByDept.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Chưa có dữ liệu theo phòng ban" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card
            size="small"
            title="Top tài sản theo số lượng"
            style={{ borderRadius: 10 }}
            extra={<Text type="secondary">Hiển thị tối đa 20 tài sản</Text>}
          >
            {quantityByAsset.length ? (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={quantityByAsset}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={renderLabelOutside}
                      labelLine={true}
                    >
                      {quantityByAsset.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RTooltip formatter={(v, name) => [nf(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Chưa có dữ liệu số lượng theo tài sản" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ: Trạng thái tài sản + Bảo trì theo tháng (line chart) */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} md={10}>
          <Card
            size="small"
            title="Trạng thái tài sản"
            style={{ borderRadius: 10 }}
          >
            {assetStatusData.length ? (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={assetStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      label={renderLabelOutside}
                      labelLine={true}
                    >
                      {assetStatusData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RTooltip formatter={(v, name) => [nf(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Chưa có dữ liệu trạng thái tài sản" />
            )}
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card
            size="small"
            title="Xu hướng bảo trì theo tháng"
            style={{ borderRadius: 10 }}
          >
            {maintenanceByMonth.length ? (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart
                    data={maintenanceByMonth}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Legend />
                    <RTooltip />
                    <Line
                      type="monotone"
                      dataKey="created"
                      name="Đã tạo"
                      stroke="#1677ff"
                    />
                    <Line
                      type="monotone"
                      dataKey="done"
                      name="Đã hoàn thành"
                      stroke="#52c41a"
                    />
                    <Line
                      type="monotone"
                      dataKey="overdue"
                      name="Quá hạn"
                      stroke="#ff4d4f"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Chưa có dữ liệu bảo trì theo tháng" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Hàng cảnh báo: Bảo hành + Bảo trì quá hạn */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} md={12}>
          <Card
            size="small"
            style={{ borderRadius: 10 }}
            title={
              <Space>
                Tài sản sắp hết / đã hết bảo hành
                <Badge
                  count={alerts?.expiringWarranty?.length || 0}
                  style={{ backgroundColor: "#faad14" }}
                />
              </Space>
            }
          >
            {alerts?.expiringWarranty?.length ? (
              <>
                <div style={{ width: "100%", height: 260, marginBottom: 16 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={expiringWarrantyPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        label={renderLabelOutside}
                        labelLine={true}
                      >
                        {expiringWarrantyPie.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RTooltip formatter={(v, name) => [nf(v), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <Table
                  rowKey={(r) => `${r.AssetID}-${r.WarrantyEndDate}`}
                  columns={colExpWarranty}
                  dataSource={alerts?.expiringWarranty || []}
                  pagination={{ pageSize: 5, showSizeChanger: false }}
                  size="small"
                  scroll={{ x: "max-content" }}
                />
              </>
            ) : (
              <Empty description="Không có tài sản sắp hết bảo hành" />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            size="small"
            style={{ borderRadius: 10 }}
            title={
              <Space>
                Bảo trì quá hạn
                <Badge
                  count={alerts?.overdueMaintenance?.length || 0}
                  style={{ backgroundColor: "#ff4d4f" }}
                />
              </Space>
            }
          >
            {alerts?.overdueMaintenance?.length ? (
              <>
                <div style={{ width: "100%", height: 260, marginBottom: 16 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={overdueMaintenancePie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        label={renderLabelOutside}
                        labelLine={true}
                      >
                        {overdueMaintenancePie.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RTooltip formatter={(v, name) => [nf(v), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <Table
                  rowKey={(r) => `${r.ScheduleID}-${r.AssetID}`}
                  columns={colOverdueMaint}
                  dataSource={alerts?.overdueMaintenance || []}
                  pagination={{ pageSize: 5, showSizeChanger: false }}
                  size="small"
                  scroll={{ x: "max-content" }}
                />
              </>
            ) : (
              <Empty description="Không có bảo trì quá hạn" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Hàng cảnh báo: Mất/thiếu + SLA phê duyệt */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {/* Card: Tài sản mất/thiếu */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            style={{ borderRadius: 10 }}
            title={
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                Tài sản mất / thiếu trong kiểm kê gần nhất
                <Badge count={alerts?.stocktakeMissing?.length || 0} />
              </div>
            }
          >
            {alerts?.stocktakeMissing?.length ? (
              <>
                <div style={{ width: "100%", height: 260, marginBottom: 16 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={missingAssetPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        label={renderLabelOutside}
                        labelLine={true}
                      >
                        {missingAssetPie.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RTooltip formatter={(v, name) => [nf(v), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <Table
                  rowKey={(r) => `${r.AssetID}-${r.SessionID}`}
                  columns={colMissing}
                  dataSource={alerts?.stocktakeMissing || []}
                  pagination={{ pageSize: 5, showSizeChanger: false }}
                  size="small"
                  scroll={{ x: "max-content" }}
                />
              </>
            ) : (
              <Empty description="Không có tài sản mất / thiếu" />
            )}
          </Card>
        </Col>

        {/* Card: Yêu cầu phê duyệt trễ SLA */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            style={{ borderRadius: 10 }}
            title={
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                Yêu cầu phê duyệt trễ SLA
                <Badge count={alerts?.approvalSlaBreach?.length || 0} />
              </div>
            }
          >
            {alerts?.approvalSlaBreach?.length ? (
              <>
                <div style={{ width: "100%", height: 260, marginBottom: 16 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={approvalSlaPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        label={renderLabelOutside}
                        labelLine={true}
                      >
                        {approvalSlaPie.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RTooltip formatter={(v, name) => [nf(v), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <Table
                  rowKey={(r) => r.RequestID}
                  columns={colApprovalBreach}
                  dataSource={alerts?.approvalSlaBreach || []}
                  pagination={{ pageSize: 5, showSizeChanger: false }}
                  size="small"
                  scroll={{ x: "max-content" }}
                />
              </>
            ) : (
              <Empty description="Không có yêu cầu trễ SLA" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
