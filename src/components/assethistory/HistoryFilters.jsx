// src/components/history/HistoryFilters.jsx
import React from "react";
import { Button, DatePicker, Input, Select, Space } from "antd";
import { CloseCircleOutlined, SearchOutlined } from "@ant-design/icons";

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function HistoryFilters({
  filters, setFilters, TYPE_MAP, requestTypeOptions, rightExtra,
}) {
  return (
    <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
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
        <Button
          icon={<CloseCircleOutlined />}
          onClick={() => setFilters({ q: "", type: undefined, reqType: undefined, range: [] })}
        >
          Xóa lọc
        </Button>
      </Space>

      {rightExtra /* ví dụ: “hiển thị x/y” hoặc nút khác */}
    </div>
  );
}
