// src/pages/AssetHistoryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Space, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { TYPE_MAP } from "../constants/history";
import { apiGetAssetHistory } from "../services/assethistoryApi";
import useHistoryFilterMemo from "../hooks/useHistoryFilterMemo";
import HistorySummary from "../components/assethistory/HistorySummary";
import HistoryFilters from "../components/assethistory/HistoryFilters";
import HistoryTable from "../components/assethistory/HistoryTable";
import HistoryTimelineDrawer from "../components/assethistory/HistoryTimelineDrawer";

export default function AssetHistoryPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", type: undefined, reqType: undefined, range: [] });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAsset, setDrawerAsset] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setRows(await apiGetAssetHistory());
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Không tải được Asset History");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const { filtered, distinctAssetCount, requestTypeOptions, byType } =
    useHistoryFilterMemo(rows, filters, TYPE_MAP);

  const openTimeline = (asset) => {
    setDrawerAsset(asset);
    setDrawerOpen(true);
  };

  const rightExtra = (
    <span style={{ opacity: 0.7 }}>
      {distinctAssetCount} asset • {filtered.length} bản ghi
    </span>
  );

  return (
    <>
      <Card
        title={
          <Space>
            Lịch sử tài sản (Asset History)
            <Badge count={filtered.length} style={{ backgroundColor: "#1677ff" }} />
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
          </Space>
        }
        bodyStyle={{ padding: 14 }}
        style={{ borderRadius: 10 }}
      >
        {/* Summary giống AssetPage */}
        <HistorySummary
          total={filtered.length}
          distinctAssetCount={distinctAssetCount}
          byType={byType}
          TYPE_MAP={TYPE_MAP}
        />

        {/* Filters */}
        <HistoryFilters
          filters={filters}
          setFilters={setFilters}
          TYPE_MAP={TYPE_MAP}
          requestTypeOptions={requestTypeOptions}
          rightExtra={rightExtra}
        />

        {/* Table */}
        <HistoryTable
          data={filtered}
          loading={loading}
          TYPE_MAP={TYPE_MAP}
          onOpenTimeline={openTimeline}
        />
      </Card>

      {/* Drawer timeline */}
      <HistoryTimelineDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        drawerAsset={drawerAsset}
        histories={useMemo(
          () =>
            rows
              .filter((r) => r.AssetID === drawerAsset?.AssetID)
              .sort((a, b) => new Date(b.ActionAt) - new Date(a.ActionAt)),
          [rows, drawerAsset]
        )}
        TYPE_MAP={TYPE_MAP}
      />
    </>
  );
}
