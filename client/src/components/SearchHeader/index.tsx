import { SearchOutlined } from "@ant-design/icons";
import { Input, Layout } from "antd";
import s from "./index.module.sass";
const { Header } = Layout;

interface SearchHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  right?: React.ReactNode;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  query,
  onQueryChange,
  right,
}) => {
  return (
    <Header className={s.header}>
      <Input
        prefix={<SearchOutlined style={{ color: "rgba(0,0,0,0.2)" }} />}
        placeholder="Search"
        bordered={false}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <div className={s.right}>{right}</div>
    </Header>
  );
};

export default SearchHeader;
