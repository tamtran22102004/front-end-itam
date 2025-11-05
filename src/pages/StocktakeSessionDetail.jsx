// src/pages/StocktakeSessionDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  InputNumber,
} from "antd";
import {
  ReloadOutlined,
  SaveOutlined,
  ExportOutlined,
  SearchOutlined,
  UndoOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL;
const withAuth = () => {
  const token = localStorage.getItem("token") || "";
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};
const fmt = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—");
const short = (id) =>
  id ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : "—";

export default function StocktakeSessionDetailPage() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  // ===== Server data =====
  const [session, setSession] = useState(null);
  const [lines, setLines] = useState([]); // nguyên bản từ server
  const [locs, setLocs] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== Edits / Selection / Saving =====
  // edits: { [LineID]: { Found?: 0|1, FoundLocationID?: number|null, Remarks?: string, MissingQty?: number } }
  const [edits, setEdits] = useState({});
  const [savingRow, setSavingRow] = useState({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [closing, setClosing] = useState(false);

  // ===== Simple search only =====
  const [q, setQ] = useState("");

  // ===== Fetch =====
  const readSession = async () => {
    try {
      setLoading(true);
      const [s, l, loc] = await Promise.all([
        axios.get(`${API}/api/stocktake/${sessionId}`, withAuth()),
        axios.get(`${API}/api/stocktake/${sessionId}/lines`, withAuth()),
        axios.get(`${API}/api/getlocation`, withAuth()),
      ]);

      const sData = Array.isArray(s?.data?.data)
        ? s.data.data?.[0]
        : s?.data?.data;
      const lData = Array.isArray(l?.data?.data)
        ? l.data.data
        : l?.data?.data || [];
      const locArr = Array.isArray(loc?.data?.data)
        ? loc.data.data
        : loc?.data || [];

      setSession(sData || null);
      setLines(lData || []);
      setLocs(
        (locArr || []).map((x) => ({
          value: x.LocationID ?? x.ID,
          label: x.LocationName ?? x.Name,
        }))
      );

      setEdits({});
      setSelectedKeys([]);
    } catch (e) {
      console.error(e);
      message.error("Không tải được dữ liệu phiên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    readSession();
  }, [sessionId]);

  const isClosed = session?.Status === "CLOSED";

  // ===== Merge original lines + staged edits =====
  const mergedLines = useMemo(() => {
    if (!lines?.length) return [];
    return lines.map((r) => {
      const e = edits[r.LineID] || {};
      return {
        ...r,
        Found: e.Found ?? r.Found,
        FoundLocationID: e.FoundLocationID ?? r.FoundLocationID,
        Remarks: e.Remarks ?? r.Remarks,
        MissingQty: e.MissingQty ?? r.MissingQty ?? 0,
      };
    });
  }, [lines, edits]);

  // ===== Only keep simple search by name/code/serial/remarks =====
  const filtered = useMemo(() => {
    const list = mergedLines || [];
    const qq = (q || "").trim().toLowerCase();
    if (!qq) return list;
    return list.filter((r) => {
      const name = (r.AssetName || "").toLowerCase();
      const code = (r.ManageCode || "").toLowerCase();
      const serial = (r.SerialNumber || "").toLowerCase();
      const note = (r.Remarks || "").toLowerCase();
      return (
        name.includes(qq) || code.includes(qq) || serial.includes(qq) || note.includes(qq)
      );
    });
  }, [mergedLines, q]);

  const stats = useMemo(() => {
    const total = mergedLines.length;
    const found = mergedLines.filter((x) => Number(x.Found) === 1).length;
    const missing = total - found;
    return { total, found, missing };
  }, [mergedLines]);

  const dirtyKeys = useMemo(
    () => Object.keys(edits).map((k) => Number(k)),
    [edits]
  );
  const dirtyCount = dirtyKeys.length;

  const rowSelection = isClosed
    ? undefined
    : {
        selectedRowKeys: selectedKeys,
        onChange: setSelectedKeys,
        preserveSelectedRowKeys: true,
      };

  // ===== Helpers =====
  const stageEdit = (lineId, patch) => {
    setEdits((prev) => {
      const cur = prev[lineId] || {};
      const next = { ...cur, ...patch };
      if ("Found" in patch && Number(patch.Found) === 1) {
        next.MissingQty = 0; // FOUND -> reset missing
      }
      if ("Found" in patch && Number(patch.Found) === 0) {
        next.FoundLocationID = null; // MISSING -> clear location
        if (typeof next.MissingQty === "undefined") next.MissingQty = 1;
      }
      return { ...prev, [lineId]: next };
    });
  };

  const buildPayload = (lineId) => {
    const e = edits[lineId];
    if (!e) return null;
    const payload = {};
    if (typeof e.Found !== "undefined") payload.Found = e.Found ? 1 : 0;
    if (typeof e.FoundLocationID !== "undefined")
      payload.FoundLocationID = e.FoundLocationID ?? null;
    if (typeof e.Remarks !== "undefined") payload.Remarks = e.Remarks || "";
    if (typeof e.MissingQty !== "undefined")
      payload.MissingQty = Math.max(0, Number(e.MissingQty || 0));

    if ("Found" in payload && payload.Found === 1) payload.MissingQty = 0;
    if ("Found" in payload && payload.Found === 0) {
      payload.FoundLocationID = null;
      if (typeof payload.MissingQty === "undefined") payload.MissingQty = 1;
    }
    return payload;
  };

  // ===== Save actions =====
  const saveOne = async (lineId) => {
    const payload = buildPayload(lineId);
    if (!payload) {
      message.info("Dòng này chưa có thay đổi.");
      return;
    }
    try {
      setSavingRow((m) => ({ ...m, [lineId]: true }));
      await axios.patch(
        `${API}/api/stocktake/${sessionId}/line/${lineId}`,
        payload,
        withAuth()
      );
      await readSession();
      message.success(`Đã lưu dòng #${lineId}`);
    } catch (e) {
      console.error(e);
      message.error(`Lưu dòng #${lineId} thất bại`);
    } finally {
      setSavingRow((m) => ({ ...m, [lineId]: false }));
    }
  };

  const saveBulkDirty = async (onlySelected = false) => {
    const targets = onlySelected
      ? dirtyKeys.filter((k) => selectedKeys.includes(k))
      : dirtyKeys;
    if (targets.length === 0) {
      message.info("Không có dòng nào cần lưu.");
      return;
    }
    try {
      setSavingBulk(true);
      const reqs = targets
        .map((lineId) => {
          const payload = buildPayload(lineId);
          return payload
            ? axios.patch(
                `${API}/api/stocktake/${sessionId}/line/${lineId}`,
                payload,
                withAuth()
              )
            : null;
        })
        .filter(Boolean);
      const rs = await Promise.allSettled(reqs);
      const ok = rs.filter((r) => r.status === "fulfilled").length;
      const fail = rs.length - ok;
      message.success(`Đã lưu ${ok} dòng${fail ? `, lỗi ${fail}` : ""}.`);
      await readSession();
    } catch (e) {
      console.error(e);
      message.error("Lưu hàng loạt thất bại");
    } finally {
      setSavingBulk(false);
    }
  };

  const revertSelected = () => {
    if (!selectedKeys.length) return;
    setEdits((prev) => {
      const cp = { ...prev };
      selectedKeys.forEach((id) => delete cp[id]);
      return cp;
    });
  };

  // ===== Close session =====
  const closeSession = async () => {
    try {
      setClosing(true);
      await axios.post(
        `${API}/api/stocktake/${sessionId}/close`,
        {},
        withAuth()
      );
      message.success("Đã đóng phiên");
      await readSession();
    } catch (e) {
      console.error(e);
      message.error("Đóng phiên thất bại");
    } finally {
      setClosing(false);
    }
  };

  // ===== Export (dùng merged để xuất cả thay đổi chưa lưu) =====
  const exportCSV = () => {
    const headers = [
      "LineID",
      "AssetID",
      "AssetName",
      "ManageCode",
      "SerialNumber",
      "Found",
      "MissingQty",
      "FoundLocationID",
      "Remarks",
      "CheckedAt",
      "Quantity",
      "RemainQuantity",
    ];
    const rows = mergedLines.map((r) => [
      r.LineID,
      r.AssetID,
      `"${(r.AssetName || "").replace(/"/g, '""')}"`,
      r.ManageCode || "",
      r.SerialNumber || "",
      Number(r.Found) ? "FOUND" : "MISSING",
      r.MissingQty ?? 0,
      r.FoundLocationID ?? "",
      `"${(r.Remarks || "").replace(/"/g, '""')}"`,
      fmt(r.CheckedAt),
      r.Quantity ?? "",
      r.RemainQuantity ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((arr) => arr.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stocktake_session_${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Hotkey: Ctrl/Cmd + S => Save all dirty
  useEffect(() => {
    const onKey = (e) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        if (!isClosed && dirtyCount > 0 && !savingBulk) {
          saveBulkDirty(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirtyCount, isClosed, savingBulk]);

  // ===== Columns =====
  const hasQtyCols =
    mergedLines.some((r) => typeof r.Quantity !== "undefined") ||
    mergedLines.some((r) => typeof r.RemainQuantity !== "undefined");

  // === COLUMNS (phong cách AssetTable, KHÔNG Quick Scan, chỉ search đơn giản) ===
  const columns = [
    {
      title: "Tài sản",
      key: "asset",
      width: 360,
      fixed: "left",
      ellipsis: { showTitle: false },
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, color: "#1f1f1f" }}>
            {r.AssetName || "—"}
          </div>
          <Space size={4}>
            {r.ManageCode ? <Tag color="blue">{r.ManageCode}</Tag> : null}
            {r.SerialNumber ? <Tag>{r.SerialNumber}</Tag> : null}
            <Tooltip title={r.AssetID}>
              <Tag color="default">{short(r.AssetID)}</Tag>
            </Tooltip>
          </Space>
        </div>
      ),
    },
    hasQtyCols && {
      title: "Số lượng",
      dataIndex: "Quantity",
      align: "center",
      width: 90,
      render: (v) => (typeof v === "number" ? v : "—"),
    },
    hasQtyCols && {
      title: "Còn lại",
      dataIndex: "RemainQuantity",
      align: "center",
      width: 100,
      render: (v) => (typeof v === "number" ? v : "—"),
    },
    {
      title: "FOUND",
      dataIndex: "Found",
      align: "center",
      width: 100,
      render: (v, r) => (
        <Checkbox
          checked={Number(v) === 1}
          disabled={isClosed}
          onChange={(e) =>
            stageEdit(r.LineID, { Found: e.target.checked ? 1 : 0 })
          }
        />
      ),
    },
    {
      title: "SL Mất",
      dataIndex: "MissingQty",
      align: "center",
      width: 120,
      render: (v, r) => {
        const isMissing = Number(r.Found) !== 1;
        const max =
          typeof r.RemainQuantity === "number"
            ? r.RemainQuantity
            : typeof r.Quantity === "number"
            ? r.Quantity
            : 9999;
        const min = r.Quantity === 1 ? 1 : 0;
        return (
          <InputNumber
            min={min}
            max={max}
            step={1}
            size="small"
            style={{ width: 100 }}
            disabled={isClosed || !isMissing}
            value={Number(v || 0)}
            onChange={(val) =>
              stageEdit(r.LineID, { MissingQty: Number(val || 0) })
            }
            onPressEnter={() => saveOne(r.LineID)}
          />
        );
      },
    },
    {
      title: "Vị trí",
      dataIndex: "FoundLocationID",
      width: 220,
      render: (v, r) => (
        <Select
          allowClear
          showSearch
          size="small"
          style={{ width: "100%" }}
          value={v ?? undefined}
          options={locs}
          optionFilterProp="label"
          disabled={isClosed || Number(r.Found) !== 1}
          placeholder={Number(r.Found) === 1 ? "Chọn vị trí" : "—"}
          onChange={(val) =>
            stageEdit(r.LineID, { FoundLocationID: val ?? null })
          }
        />
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "Remarks",
      ellipsis: { showTitle: false },
      render: (text, r) => (
        <Input
          size="small"
          placeholder="VD: Sai vị trí, đang mượn…"
          disabled={isClosed}
          value={text || ""}
          onChange={(e) => stageEdit(r.LineID, { Remarks: e.target.value })}
          onPressEnter={() => saveOne(r.LineID)}
        />
      ),
    },
    {
      title: "Cập nhật",
      dataIndex: "CheckedAt",
      align: "center",
      width: 160,
      sorter: (a, b) =>
        new Date(a.CheckedAt || 0).getTime() -
        new Date(b.CheckedAt || 0).getTime(),
      render: (v) => (
        <Tooltip title={fmt(v)}>
          <Space size={6} style={{ justifyContent: "center" }}>
            <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
            <span>{fmt(v)}</span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 180,
      fixed: "right",
      render: (_, r) => {
        const dirty = !!edits[r.LineID];
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={() => saveOne(r.LineID)}
              disabled={!dirty || isClosed}
              loading={!!savingRow[r.LineID]}
            >
              Lưu
            </Button>
            <Button
              size="small"
              icon={<UndoOutlined />}
              onClick={() => {
                setEdits((prev) => {
                  const cp = { ...prev };
                  delete cp[r.LineID];
                  return cp;
                });
              }}
              disabled={!dirty || isClosed}
            >
              Hoàn tác
            </Button>
          </Space>
        );
      },
    },
  ].filter(Boolean);

  // === TÍNH scroll.x giống AssetTable ===
  const scrollX = useMemo(
    () => columns.reduce((sum, c) => sum + (Number(c.width) || 120), 0),
    [] // columns là hằng trong render; tính 1 lần
  );

  // ===== Render =====
  return (
    <Card
      title={
        <Space>
          Phiên kiểm kê #{sessionId}
          <Badge count={filtered.length} style={{ backgroundColor: "#1677ff" }} />
          {isClosed ? <Tag color="red">CLOSED</Tag> : <Tag color="green">OPEN</Tag>}
        </Space>
      }
      extra={
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={readSession}>
            Làm mới
          </Button>
          <Button icon={<ExportOutlined />} onClick={exportCSV}>
            Xuất CSV
          </Button>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => saveBulkDirty(false)}
            disabled={isClosed || dirtyCount === 0}
            loading={savingBulk}
          >
            Lưu tất cả ({dirtyCount})
          </Button>
          <Button
            onClick={() => saveBulkDirty(true)}
            disabled={
              isClosed ||
              dirtyKeys.filter((k) => selectedKeys.includes(k)).length === 0
            }
          >
            Lưu dòng đã chọn
          </Button>
          <Button
            onClick={revertSelected}
            disabled={isClosed || selectedKeys.every((k) => !edits[k])}
          >
            Hoàn tác dòng đã chọn
          </Button>

          <Popconfirm
            title="Đóng phiên kiểm kê? Sau khi đóng sẽ không thể cập nhật."
            okText="Đóng phiên"
            cancelText="Hủy"
            onConfirm={closeSession}
            disabled={isClosed || dirtyCount > 0}
          >
            <Button danger loading={closing} disabled={isClosed || dirtyCount > 0}>
              Đóng phiên
            </Button>
          </Popconfirm>
        </Space>
      }
      bodyStyle={{ padding: 14 }}
      style={{ borderRadius: 10 }}
      loading={loading}
    >
      {session && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Card size="small">
            <Statistic title="Phòng ban" value={session.DepartmentName || "—"} />
          </Card>
          <Card size="small">
            <Statistic title="Người tạo" value={session.CreatedByName || "—"} />
          </Card>
          <Card size="small">
            <Statistic title="Bắt đầu" value={fmt(session.StartedAt)} />
          </Card>
          <Card size="small">
            <Statistic title="Kết thúc" value={fmt(session.EndedAt)} />
          </Card>
          <Card size="small">
            <Statistic title="Tổng" value={stats.total} />
          </Card>
          <Card size="small">
            <Statistic title="FOUND / MISSING" value={`${stats.found} / ${stats.missing}`} />
          </Card>
        </div>
      )}

      {/* Search bar — chỉ 1 ô tìm kiếm đơn giản */}
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên/mã/serial/ghi chú…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 360 }}
        />
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          Đã chỉnh {dirtyCount} dòng • Đang chọn {selectedKeys.length} • Hiển thị{" "}
          {filtered.length}/{mergedLines.length}
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filtered} // ✅ dùng danh sách đã lọc
        rowKey={(r) => r.LineID}
        loading={loading}
        pagination={{
          pageSize: 12,
          showSizeChanger: true,
          pageSizeOptions: [12, 24, 50],
        }}
        scroll={{ x: scrollX, y: 520 }}
        size="middle"
        tableLayout="fixed"
        bordered
        sticky
        rowSelection={rowSelection}
        onRow={(record) => ({
          onDoubleClick: () => {
            if (isClosed) return;
            const curr = Number(record.Found) === 1 ? 0 : 1;
            stageEdit(record.LineID, { Found: curr });
          },
        })}
      />

      <Space style={{ marginTop: 10 }}>
        <Button onClick={() => navigate("/stocktake")}>Về danh sách phiên</Button>
      </Space>
    </Card>
  );
}
