import { CheckCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, List, message } from "antd";
import { FC } from "react";
import { Entry } from "../../../../../server/usecase/feeds";
import { trpc } from "../../../App";
import { getRelDate } from "../../../utils/reldate";
import s from "./index.module.sass";
import { IEntriesInput } from "../../../pages/feed";

interface IFeedsProps {
  entries: Entry[];
  entiresInput: IEntriesInput;
  total: number;
  onPageChange: (page: number) => void;
}

const FeedsList: FC<IFeedsProps> = ({
  entries,
  entiresInput,
  onPageChange,
  total,
}) => {
  const utils = trpc.useContext();

  const [messageApi, contextHolder] = message.useMessage();

  const createBookmark = trpc.bookmark.addBookmark.useMutation();
  const setEntryRead = trpc.feed.setEntryRead.useMutation({
    onSuccess: (newEntry) => {
      utils.feed.listEntries.setData(entiresInput, (old) => {
        if (!old) return undefined;
        return {
          ...old,
          entries: old?.entries.map((e) =>
            e.id === newEntry.id ? newEntry : e
          ),
        };
      });
    },
  });

  const setRead = (item: Entry, read: boolean) => {
    setEntryRead.mutate({ id: item.id, read });
  };

  const addBookmark = async (item: Entry) => {
    try {
      await createBookmark.mutateAsync({ url: item.link, title: item.title });
      void messageApi.success("Bookmark added");
    } catch (e) {
      if ((e as Error).message?.includes("Unique constraint")) {
        void messageApi.error("Bookmark already exists");
        return;
      }
      throw e;
    }
  };

  return (
    <ConfigProvider componentSize="small">
      {/* for alert messages */}
      {contextHolder}
      <List
        pagination={{
          total,
          pageSize: 20,
          position: "bottom",
          current: entiresInput.page,
          onChange: onPageChange,
        }}
        size="small"
        renderItem={(item) => (
          <List.Item
            style={{
              color: item.read ? "#6c6c6c" : "#3c3c3c",
              fontWeight: item.read ? "normal" : "500",
            }}
            className={s.listItem}
            onClick={() => {
              void setRead(item, true);
              window.open(item.link, "_blank");
            }}
            key={item.id}
            actions={[
              <Button
                key="bookmark"
                type="link"
                icon={
                  <PlusCircleOutlined
                    onClick={(e) => {
                      e.stopPropagation();
                      void addBookmark(item);
                    }}
                  />
                }
              />,
              <Button
                key="read"
                type="link"
                icon={
                  <CheckCircleOutlined
                    onClick={(e) => {
                      e.stopPropagation();
                      void setRead(item, !item.read);
                    }}
                  />
                }
              />,
            ]}
          >
            <div className={s.entry}>
              <span className={s.title}>{item.title}</span>
              <span className={s.pubTime}>{getRelDate(item.pubTime)}</span>
            </div>
          </List.Item>
        )}
        dataSource={entries}
      />
    </ConfigProvider>
  );
};

export default FeedsList;
