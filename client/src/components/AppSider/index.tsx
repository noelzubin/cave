import { Layout, Select, Avatar } from "antd";
import { WifiOutlined, TagOutlined,ClockCircleOutlined } from '@ant-design/icons'
import type { FC } from 'react';
import useIsMobile from '../../utils/ismobile';
import s from './index.module.sass'
import { useNavigate } from 'react-router-dom';

const { Sider } = Layout;

interface AppSiderProps {
    collapsed: boolean; // Show/Hide sidebar
    setCollapsed: (collapsed: boolean) => void; // set Hidebar collapsed
    pageId: 'feeds' | 'bookmarks' | 'revise' // Current page
    children: React.ReactNode; 
}

const AppSider: FC<AppSiderProps> = ({ collapsed, setCollapsed, children, pageId }) => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    return (<Sider
        theme="light"
        style={{
            height: "100vh",
            zIndex: "2",
            position: isMobile ? "fixed" : "relative",
        }}
        collapsible={isMobile}
        collapsedWidth={0}
        className={s.sider}
        collapsed={isMobile && collapsed}
        onCollapse={(collapsed) => setCollapsed(collapsed)}
    >
        <Select
            defaultValue="feeds"
            className={s.appSelect}
            size="large"
            onChange={(_, option) => {
                if (Array.isArray(option)) return;
                navigate(option.path);
            }}
            value={pageId}
            options={[
                { path: "/", value: 'feeds', label: <div> <Avatar icon={<WifiOutlined />} /> <span> Feeds </span> </div> },
                { path: "/bookmarks", value: 'bookmarks', label: <div> <Avatar icon={<TagOutlined />} /> <span> Bookmarks </span> </div> },
                { path: "/revise", value: 'revise', label: <div> <Avatar icon={<ClockCircleOutlined />} /> <span> Revise </span> </div> },
            ]}
        />
        {children}
    </Sider>);
}

export default AppSider;