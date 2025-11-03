import React from "react";
import { Card, Empty, Timeline, Typography } from "antd";
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ClockCircleTwoTone,
  MinusCircleTwoTone,
} from "@ant-design/icons";
import { fmt } from "../../utils/approvalUi";
import "../../styles/approval-ui.css"; // ⬅️ nhớ import CSS

const { Text } = Typography;

const dotByAction = (act) => {
  const A = String(act || "").toUpperCase();
  if (A === "APPROVED") return <CheckCircleTwoTone twoToneColor="#52c41a" />;
  if (A === "REJECTED") return <CloseCircleTwoTone twoToneColor="#ff4d4f" />;
  if (A === "CONFIRMED") return <ClockCircleTwoTone twoToneColor="#1677ff" />;
  return <MinusCircleTwoTone twoToneColor="#bfbfbf" />; // CREATED/khác
};

export default function ApprovalTimeline({ history, loading }) {
  return (
    <Card title="Nhật ký phê duyệt" size="small" loading={loading} className="tl-card">
      {history?.length ? (
        <div className="tl-scroll">
          <Timeline
            mode="left"                 // ⬅️ có cột label bên trái
            className="tl"
            items={history.map((h) => {
              const act = h.Action || h.action;
              const time = fmt(h.ActionAt || h.actionAt);
              return {
                label: time ? <Text type="secondary">{time}</Text> : "",
                dot: dotByAction(act),
                children: (
                  <div className="tl-item">
                    <div className="tl-title">
                      <b>{act}</b>
                    </div>
                    <div className="tl-meta">
                      StepID: {h.StepID ?? "-"} &nbsp;|&nbsp; ApproverUserID: {h.ApproverUserID ?? "-"} &nbsp;|&nbsp; Dept: {h.DepartmentID ?? "-"}
                    </div>
                    {h.Comment ? <div className="tl-comment">💬 {h.Comment}</div> : null}
                  </div>
                ),
              };
            })}
          />
        </div>
      ) : (
        <Empty description="Chưa có lịch sử" />
      )}
    </Card>
  );
}
