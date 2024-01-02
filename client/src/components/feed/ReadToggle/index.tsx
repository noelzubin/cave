import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Button } from "antd";

export interface ReadToggleProps {
  showRead: boolean;
  onClick: () => void;
}

const ReadToggle: React.FC<ReadToggleProps> = ({ showRead, onClick }) => {
  let icon = <EyeInvisibleOutlined />;
  if (showRead) icon = <EyeOutlined />;

  return (
    <Button
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      icon={icon}
      onClick={onClick}
    />
  );
};

export default ReadToggle;
