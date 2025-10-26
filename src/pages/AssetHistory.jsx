import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Space,
  Input,
  Select,
  DatePicker,
  Button,
  Tag,
  Tooltip,
  Badge,
  Drawer,
  Timeline,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useNavigate } from "react-router-dom";

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

const API_URL = import.meta.env.VITE_BACKEND_URL;
const LIST_URL = `${API_URL}/api/asset/assethistory`;

const getToken = () => localStorage.getItem("token") || "";
const withAuth = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

// Màu sắc theo Type (có thể thêm nếu BE mở rộng)
const TYPE_MAP = {
  AVAILABLE: { text: "AVAILABLE", color: "green" },
  ALLOCATED: { text: "ALLOCATED", color: "blue" },
  MAINTENANCE: { text: "MAINTENANCE", color: "orange" },
  MAINTENANCE_OUT: { text: "MAINTENANCE_OUT", color: "orange" },
  WARRANTY: { text: "WARRANTY", color: "gold" },
  WARRANTY_OUT: { text: "WARRANTY_OUT", color: "gold" },
  DISPOSED: { text: "DISPOSED", color: "red" },
  TRANSFER: { text: "TRANSFER", color: "geekblue" },
};

const fmtDateTime = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm:ss") : "—");
const shortId = (id) =>
  id ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : "—";

export default function AssetHistoryPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  // filters
  const [filters, setFilters] = useState({
    q: "",
    type: undefined,
    reqType: undefined,
    range: [],
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAsset, setDrawerAsset] = useState(null); // { AssetID, AssetName }

  // ---- fetch
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(LIST_URL, withAuth());
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setRows(data);
    } catch (e) {
      console.error(e);
      message.error(
        e?.response?.data?.message || "Không tải được Asset History"
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // RequestType options derive from data
  const requestTypeOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.RequestTypeName).filter(Boolean));
    return Array.from(set);
  }, [rows]);

  // distinct assets count
  const distinctAssetCount = useMemo(
    () => new Set(rows.map((r) => r.AssetID)).size,
    [rows]
  );

  // ---- filter
  const filtered = useMemo(() => {
    let list = rows.slice();

    const q = filters.q.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.AssetName || "").toLowerCase().includes(q) ||
          (r.AssetID || "").toLowerCase().includes(q) ||
          (r.FromEmployeeName || "").toLowerCase().includes(q) ||
          (r.FromDepartmentName || "").toLowerCase().includes(q) ||
          (r.ToEmployeeName || "").toLowerCase().includes(q) ||
          (r.ToDepartmentName || "").toLowerCase().includes(q) ||
          String(r.RequestID || "")
            .toLowerCase()
            .includes(q) ||
          (r.Note || "").toLowerCase().includes(q)
      );
    }

    if (filters.type) {
      list = list.filter(
        (r) =>
          String(r.Type).toUpperCase() === String(filters.type).toUpperCase()
      );
    }
    if (filters.reqType) {
      list = list.filter((r) => (r.RequestTypeName || "") === filters.reqType);
    }
    if (
      Array.isArray(filters.range) &&
      filters.range.length === 2 &&
      filters.range[0] &&
      filters.range[1]
    ) {
      const [start, end] = filters.range;
      list = list.filter((r) => {
        const d = dayjs(r.ActionAt);
        return (
          d.isValid() &&
          d.isBetween(start.startOf("day"), end.endOf("day"), null, "[]")
        );
      });
    }

    // Order mới nhất trên cùng
    list.sort(
      (a, b) => dayjs(b.ActionAt).valueOf() - dayjs(a.ActionAt).valueOf()
    );
    return list;
  }, [rows, filters]);

  const resetFilters = () =>
    setFilters({ q: "", type: undefined, reqType: undefined, range: [] });

  // ---- open drawer timeline cho 1 Asset
  const openTimeline = (asset) => {
    setDrawerAsset(asset);
    setDrawerOpen(true);
  };

  const typeTag = (t) => {
    const m = TYPE_MAP[String(t).toUpperCase()] || {
      text: t || "UNKNOWN",
      color: "default",
    };
    return <Tag color={m.color}>{m.text}</Tag>;
  };

  // Group các history theo AssetID cho Drawer
  const historiesOfAsset = useMemo(() => {
    if (!drawerAsset) return [];
    return rows
      .filter((r) => r.AssetID === drawerAsset.AssetID)
      .sort(
        (a, b) => dayjs(b.ActionAt).valueOf() - dayjs(a.ActionAt).valueOf()
      );
  }, [drawerAsset, rows]);

  // ---- columns
  const columns = [
    {
      title: "Thời gian",
      dataIndex: "ActionAt",
      key: "ActionAt",
      width: 170,
      render: (v) => fmtDateTime(v),
      sorter: (a, b) =>
        dayjs(a.ActionAt).valueOf() - dayjs(b.ActionAt).valueOf(),
      defaultSortOrder: "descend",
    },
    {
      title: "Asset",
      key: "asset",
      width: 260,
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>{r.AssetName || "—"}</span>
          <Space size={6}>
            <Tooltip title={r.AssetID}>
              <Text code copyable={{ text: r.AssetID }}>
                {shortId(r.AssetID)}
              </Text>
            </Tooltip>
            <Button
              size="small"
              type="link"
              style={{ padding: 0 }}
              onClick={() => navigate(`/assetdetail/${r.AssetID}`)}
            >
              Xem asset
            </Button>
          </Space>
        </div>
      ),
    },
    {
      title: "Loại sự kiện",
      dataIndex: "Type",
      key: "Type",
      width: 140,
      render: (t) => typeTag(t),
      filters: Object.keys(TYPE_MAP).map((k) => ({
        text: TYPE_MAP[k].text,
        value: k,
      })),
      onFilter: (v, r) =>
        String(r.Type).toUpperCase() === String(v).toUpperCase(),
    },
    
    {
      title: "Từ (From)",
      key: "from",
      width: 230,
      render: (r) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>
            <Text type="secondary">Nhân viên:&nbsp;</Text>
            {r.FromEmployeeName || "—"}
            {r.EmployeeID ? (
              <>
                {" "}
                (<Text code>{r.EmployeeID}</Text>)
              </>
            ) : null}
          </div>
          <div>
            <Text type="secondary">Phòng ban:&nbsp;</Text>
            {r.FromDepartmentName || "—"}
            {r.SectionID ? (
              <>
                {" "}
                (<Text code>{r.SectionID}</Text>)
              </>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: "",
      key: "arrow",
      width: 24,
      align: "center",
      render: () => <ArrowRightOutlined style={{ color: "#aaa" }} />,
    },
    {
      title: "Đến (To)",
      key: "to",
      width: 230,
      render: (r) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>
            <Text type="secondary">Nhân viên:&nbsp;</Text>
            {r.ToEmployeeName || "—"}
            {r.EmployeeReceiveID ? (
              <>
                {" "}
                (<Text code>{r.EmployeeReceiveID}</Text>)
              </>
            ) : null}
          </div>
          <div>
            <Text type="secondary">Phòng ban:&nbsp;</Text>
            {r.ToDepartmentName || "—"}
            {r.SectionReceiveID ? (
              <>
                {" "}
                (<Text code>{r.SectionReceiveID}</Text>)
              </>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: "SL",
      dataIndex: "Quantity",
      key: "Quantity",
      width: 70,
      align: "center",
      render: (v) => <Tag>{v ?? "—"}</Tag>,
    },
    {
      title: "Ghi chú",
      dataIndex: "Note",
      key: "Note",
      ellipsis: true,
    },
    {
      title: "Lịch sử",
      key: "timeline",
      fixed: "right",
      width: 90,
      render: (r) => (
        <Tooltip title="Xem timeline tài sản này">
          <Button
            icon={<EyeOutlined />}
            onClick={() =>
              openTimeline({ AssetID: r.AssetID, AssetName: r.AssetName })
            }
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Space>
            Lịch sử tài sản (Asset History)
            <Badge
              count={filtered.length}
              style={{ backgroundColor: "#1677ff" }}
            />
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
          </Space>
        }
        bodyStyle={{ padding: 14 }}
        style={{ borderRadius: 10 }}
      >
        {/* Filter bar */}
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm theo Asset / ID / From-To / RequestID / Ghi chú…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              style={{ width: 340 }}
            />
            <Select
              allowClear
              placeholder="Loại sự kiện"
              value={filters.type}
              onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
              style={{ width: 200 }}
              showSearch
              optionFilterProp="children"
            >
              {Object.entries(TYPE_MAP).map(([k, v]) => (
                <Option key={k} value={k}>
                  {v.text}
                </Option>
              ))}
            </Select>
            <Select
              allowClear
              placeholder="Loại yêu cầu"
              value={filters.reqType}
              onChange={(v) => setFilters((f) => ({ ...f, reqType: v }))}
              style={{ width: 220 }}
              showSearch
              optionFilterProp="children"
            >
              {requestTypeOptions.map((x) => (
                <Option key={x} value={x}>
                  {x}
                </Option>
              ))}
            </Select>
            <RangePicker
              value={filters.range}
              onChange={(v) => setFilters((f) => ({ ...f, range: v || [] }))}
              placeholder={["Từ ngày", "Đến ngày"]}
              showTime
            />
            <Button icon={<CloseCircleOutlined />} onClick={resetFilters}>
              Xóa lọc
            </Button>
            <span style={{ opacity: 0.7 }}>
              {distinctAssetCount} asset • {filtered.length} bản ghi
            </span>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey={(r) => r.HistoryID}
          loading={loading}
          pagination={{ pageSize: 12, showSizeChanger: false }}
          scroll={{ x: 1400 }}
          size="middle"
          bordered
        />
      </Card>

      {/* Drawer timeline per Asset */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        title={
          drawerAsset ? (
            <Space direction="vertical" size={2}>
              <Title level={5} style={{ margin: 0 }}>
                {drawerAsset.AssetName}
              </Title>
              <Text type="secondary">
                Asset ID:&nbsp;
                <Text code copyable={{ text: drawerAsset.AssetID }}>
                  {shortId(drawerAsset.AssetID)}
                </Text>
              </Text>
            </Space>
          ) : (
            "Timeline"
          )
        }
      >
        {historiesOfAsset.length === 0 ? (
          <div style={{ color: "#888" }}>Không có lịch sử.</div>
        ) : (
          <Timeline
            items={historiesOfAsset.map((h) => ({
              color: TYPE_MAP[h.Type?.toUpperCase()]?.color || "gray",
              children: (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {TYPE_MAP[h.Type?.toUpperCase()] ? (
                      typeTag(h.Type)
                    ) : (
                      <Tag>{h.Type || "—"}</Tag>
                    )}
                    <Text type="secondary">{fmtDateTime(h.ActionAt)}</Text>
                  </div>
                  <div style={{ marginTop: 6, lineHeight: 1.7 }}>
                    <div>
                      <Text type="secondary">Yêu cầu:&nbsp;</Text>
                      {h.RequestID ? (
                        <>
                          <Text code copyable={{ text: String(h.RequestID) }}>
                            {h.RequestID}
                          </Text>
                          {h.RequestTypeName ? (
                            <Tag style={{ marginLeft: 6 }}>
                              {h.RequestTypeName}
                            </Tag>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div>
                      <Text type="secondary">Từ:&nbsp;</Text>
                      {h.FromEmployeeName || "—"}{" "}
                      {h.EmployeeID ? (
                        <>
                          (<Text code>{h.EmployeeID}</Text>)
                        </>
                      ) : null}
                      {" • "}
                      {h.FromDepartmentName || "—"}{" "}
                      {h.SectionID ? (
                        <>
                          (<Text code>{h.SectionID}</Text>)
                        </>
                      ) : null}
                    </div>
                    <div>
                      <Text type="secondary">Đến:&nbsp;</Text>
                      {h.ToEmployeeName || "—"}{" "}
                      {h.EmployeeReceiveID ? (
                        <>
                          (<Text code>{h.EmployeeReceiveID}</Text>)
                        </>
                      ) : null}
                      {" • "}
                      {h.ToDepartmentName || "—"}{" "}
                      {h.SectionReceiveID ? (
                        <>
                          (<Text code>{h.SectionReceiveID}</Text>)
                        </>
                      ) : null}
                    </div>
                    <div>
                      <Text type="secondary">Số lượng:&nbsp;</Text>
                      <Tag>{h.Quantity ?? "—"}</Tag>
                    </div>
                    {h.Note ? (
                      <div>
                        <Text type="secondary">Ghi chú:&nbsp;</Text>
                        {h.Note}
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Drawer>
    </>
  );
}
