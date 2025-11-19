import React from "react";
import { Card, Space, Input, Select, Button, Tag } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";

export default function ApprovalFilterBar({
  kind, kindOptions, onKindChange,
  searchText, setSearchText,
  users, depts, loadingRefs,
  filterTargetUser, setFilterTargetUser,
  filterTargetDept, setFilterTargetDept,
  role, stepId,
  onRefresh,
}) {
  return (
      <Space wrap>
        <Select
          style={{ width: 220 }}
          value={kind}
          onChange={onKindChange}
          options={kindOptions}
        />
        <Input
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Tìm ID / Note / Trạng thái / User / Phòng"
          allowClear
        />
        <Select
          style={{ width: 220 }}
          allowClear
          loading={loadingRefs}
          placeholder="Lọc theo Người nhận"
          options={users}
          value={filterTargetUser}
          onChange={setFilterTargetUser}
          showSearch
          optionFilterProp="label"
        />
        <Select
          style={{ width: 220 }}
          allowClear
          loading={loadingRefs}
          placeholder="Lọc theo Phòng nhận"
          options={depts}
          value={filterTargetDept}
          onChange={setFilterTargetDept}
          showSearch
          optionFilterProp="label"
        />
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          Làm mới
        </Button>
        
      </Space>
  );
}
