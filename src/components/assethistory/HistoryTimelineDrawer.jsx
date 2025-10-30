// src/components/history/HistoryTimelineDrawer.jsx
import React from "react";
import { Drawer, Timeline, Typography, Tag } from "antd";
import { fmtDateTime } from "../../utils/format";

const { Text, Title } = Typography;

export default function HistoryTimelineDrawer({
  open,
  onClose,
  drawerAsset,
  histories,
  TYPE_MAP,
}) {
  const typeTag = (t) => {
    const m = TYPE_MAP[String(t).toUpperCase()] || {
      text: t || "UNKNOWN",
      color: "default",
    };
    return <Tag color={m.color}>{m.text}</Tag>;
  };

  const shortId = (id) =>
    id ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : "—";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={
        drawerAsset ? (
          <>
            <Title level={5} style={{ margin: 0 }}>
              {drawerAsset.AssetName}
            </Title>
            <Text type="secondary">
              Asset ID:&nbsp;
              <Text code copyable={{ text: drawerAsset.AssetID }}>
                {shortId(drawerAsset.AssetID)}
              </Text>
            </Text>
          </>
        ) : (
          "Timeline"
        )
      }
    >
      {histories.length === 0 ? (
        <div style={{ color: "#888" }}>Không có lịch sử.</div>
      ) : (
        <Timeline
          items={histories.map((h) => ({
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
                  {typeTag(h.Type)}
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
  );
}
