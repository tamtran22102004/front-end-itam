// components/assets/AssetFilters.jsx
import { Button, DatePicker, Input, Select, Space, Switch, Tooltip } from "antd";
import { CloseCircleOutlined, SearchOutlined } from "@ant-design/icons";
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function AssetFilters({
  filters, setFilters,
  categories, itemMasters, vendors, users, sectionsList,
}) {
  const resetFilters = () =>
    setFilters({
      q: "",
      category: undefined,
      itemMaster: undefined,
      vendor: undefined,
      status: undefined,
      purchaseRange: [],
      warrantyOnly: false,
      hasQROnly: false,
      manageType: undefined,
      employee: undefined,
      section: undefined,
    });

  return (
    <div style={{ marginBottom: 12 }}>
      <Space wrap>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo Tên / Mã nội bộ / Mã kế toán / Serial…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          style={{ width: 320 }}
        />

        <Select allowClear placeholder="Danh mục" value={filters.category}
          onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
          style={{ width: 200 }} optionFilterProp="children" showSearch>
          {categories.map((c) => <Option key={c.ID} value={c.ID}>{c.Name}</Option>)}
        </Select>

        <Select allowClear placeholder="ItemMaster" value={filters.itemMaster}
          onChange={(v) => setFilters((f) => ({ ...f, itemMaster: v }))}
          style={{ width: 220 }} optionFilterProp="children" showSearch>
          {itemMasters.map((i) => <Option key={i.ID} value={i.ID}>{i.Name}</Option>)}
        </Select>

        <Select allowClear placeholder="Vendor" value={filters.vendor}
          onChange={(v) => setFilters((f) => ({ ...f, vendor: v }))}
          style={{ width: 200 }} optionFilterProp="children" showSearch>
          {vendors.map((v) => <Option key={v.ID} value={v.ID}>{v.Name}</Option>)}
        </Select>

        <Select allowClear placeholder="Trạng thái" value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          style={{ width: 160 }}>
          <Option value={1}>Sẵn sàng</Option>
          <Option value={2}>Đang dùng</Option>
          <Option value={3}>Bảo hành</Option>
          <Option value={4}>Sửa chữa</Option>
          <Option value={5}>Hủy</Option>
          <Option value={6}>Thanh lý</Option>
        </Select>

        <Select allowClear placeholder="ManageType" value={filters.manageType}
          onChange={(v) => setFilters((f) => ({ ...f, manageType: v }))}
          style={{ width: 170 }}>
          <Option value="INDIVIDUAL">INDIVIDUAL</Option>
          <Option value="QUANTITY">QUANTITY</Option>
        </Select>

        <RangePicker
          value={filters.purchaseRange}
          onChange={(v) => setFilters((f) => ({ ...f, purchaseRange: v || [] }))}
          placeholder={["Ngày mua từ", "đến"]}
        />

        <Select allowClear placeholder="Nhân viên" value={filters.employee}
          onChange={(v) => setFilters((f) => ({ ...f, employee: v }))}
          style={{ width: 220 }} optionFilterProp="children" showSearch>
          {users.map((u) => <Option key={u.id} value={u.id}>{u.name}</Option>)}
        </Select>

        <Select allowClear placeholder="Bộ phận" value={filters.section}
          onChange={(v) => setFilters((f) => ({ ...f, section: v }))}
          style={{ width: 220 }} optionFilterProp="children" showSearch>
          {sectionsList.map((s) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
        </Select>

        <Space>
          <Tooltip title="Chỉ hiển thị đang trong bảo hành"><span style={{ color: "#555" }}>Đang BH</span></Tooltip>
          <Switch checked={filters.warrantyOnly} onChange={(v) => setFilters((f) => ({ ...f, warrantyOnly: v }))} />
        </Space>

        <Space>
          <Tooltip title="Chỉ hiển thị tài sản có QRCode"><span style={{ color: "#555" }}>Có QR</span></Tooltip>
          <Switch checked={filters.hasQROnly} onChange={(v) => setFilters((f) => ({ ...f, hasQROnly: v }))} />
        </Space>

        <Button icon={<CloseCircleOutlined />} onClick={resetFilters}>Xóa lọc</Button>
      </Space>
    </div>
  );
}
