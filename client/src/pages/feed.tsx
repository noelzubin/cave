"use client";

import {
  FolderAddOutlined,
  NodeExpandOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  Layout,
  Menu,
  MenuProps,
  Modal,
  Select,
  Space,
} from "antd";
import ReadToggle from "../components/feed/ReadToggle";
import { ItemType, SubMenuType } from "antd/es/menu/hooks/useItems";
import { useEffect, useState } from "react";
import AppSider from "../components/AppSider";
import SearchHeader from "../components/SearchHeader";
import FeedsList from "../components/feed/FeedsList";
import { useDebounce } from "../components/useDebounce";
import type {
  Feed,
  Folder,
  PaginatedEntries,
} from "../../../server/usecase/feeds";
import s from "./feed.module.sass";
import { trpc } from "../App";

export interface IEntriesInput {
  feedId?: number;
  page: number;
  query: string;
  showRead: boolean;
}

type FieldType = {
  url: string;
  folderId: number;
};

interface FolderType {
  name: string;
}

export default function Home() {
  const feeds = trpc.feed.listFeeds.useQuery<Feed[]>();
  const folders = trpc.feed.listFolders.useQuery<Folder[]>(undefined);

  const [selected, setSelected] = useState(["all"]);
  const [addFolderModalOpen, setAddFolderModalOpen] = useState(false);
  const [addFeedModalOpen, setAddFeedModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [entriesInput, setEntriesInput] = useState<IEntriesInput>({
    feedId: undefined,
    page: 1,
    query: "",
    showRead: false,
  });

  const entries =
    trpc.feed.listEntries.useQuery<PaginatedEntries>(entriesInput);

  const [folderForm] = Form.useForm<FolderType>();
  const [feedForm] = Form.useForm<FieldType>();
  const utils = trpc.useContext();

  const addFolder = trpc.feed.addFolder.useMutation<Folder>({
    onSuccess: (newFolder) => {
      utils.feed.listFeeds.getData();
      utils.feed.listFolders.setData(undefined, (old: Folder[]) => [
        ...old,
        newFolder,
      ]);
    },
  });

  const updateFeed = trpc.feed.updateFeed.useMutation<Feed>({
    onSuccess: async (newFeed) => {
      utils.feed.listFeeds.setData(undefined, (old: Feed[]) => {
        return old.map((oldFeed) =>
          oldFeed.id === newFeed.id ? newFeed : oldFeed
        );
      });
      await utils.feed.listEntries.invalidate(entriesInput);
    },
  });

  const onQueryChange = (value: string) => {
    setQuery(value);
  };

  const debQuery = useDebounce(query, 500);

  useEffect(() => {
    setEntriesInput((prev) => ({ ...prev, query: debQuery }));
  }, [debQuery]);

  const addFeed = trpc.feed.addFeed.useMutation<Feed>({
    onSuccess: async (_) => {
      await Promise.all([
        utils.feed.listFolders.fetch(),
        utils.feed.listFeeds.fetch(),
      ]);
    },
  });

  const buildOptions = () => {
    let options: ItemType[] = [
      {
        key: "all",
        label: "All",
      },
    ];

    if (folders.data) {
      const folderMap: Record<number, SubMenuType> = {};
      folders.data.map((f) => {
        folderMap[f.id] = { key: f.id.toString(), label: f.name, children: [] };
      });
      if (feeds.data) {
        feeds.data.forEach((f) => {
          folderMap[f.folderId]!.children.push({
            key: f.id.toString(),
            label: (
              <div className={s.feedMenuItem}>
                <div>{f.title}</div> <div>{f.unreadCount}</div>
              </div>
            ),
          });
        });
      }

      options = options.concat(Object.values(folderMap));
    }

    options.push({
      key: "add",
      label: "Add Folder",
      icon: <FolderAddOutlined />,
    });

    return options;
  };

  const onSelect: (params: { selectedKeys: string[] }) => void = ({
    selectedKeys,
  }) => {
    if (selectedKeys[0] === "add") {
      return setAddFolderModalOpen(true);
    }

    if (selectedKeys[0] === "all") {
      setQuery("");
      setEntriesInput({
        page: 1,
        feedId: undefined,
        query: "",
        showRead: entriesInput.showRead,
      });
      return;
    }

    setQuery("");
    setEntriesInput({
      feedId: parseInt(selectedKeys[0]!),
      page: 1,
      query: "",
      showRead: entriesInput.showRead,
    });
    setSelected(selectedKeys);
    return;
  };

  const changeFolder = (feedId: number, folderId: number) => {
    updateFeed.mutate({ id: feedId, folder: folderId });
  };

  const refreshFeed = (feedId: number) => {
    updateFeed.mutate({ id: feedId, refresh: true });
  };

  const getHeader = () => {
    if (entriesInput.feedId === undefined)
      return (
        <div className={s.feedHeader}>
          <h3>All</h3>
        </div>
      );

    const feed = feeds.data!.find((f) => f.id === entriesInput.feedId)!;

    const items: MenuProps["items"] = folders.data
      ?.filter((f) => f.id !== feed.folderId)
      .map((f) => ({
        key: f.id.toString(),
        label: f.name,
        onClick: () => changeFolder(feed.id, f.id),
      }));

    return (
      <div className={s.feedHeader}>
        <div className={s.feedHeaderLeft}>
          <h3>
            <a href={feed.link}>{feed.title}</a>
          </h3>
          <p style={{ wordBreak: "break-all" }}>
            <b>Feed link:</b> {feed.feedLink}
          </p>
        </div>
        <div className={s.feedHeaderRight}>
          <Space>
            <Button
              icon={<ReloadOutlined spin={updateFeed.isLoading} />}
              onClick={() => refreshFeed(feed.id)}
            />
            <Dropdown menu={{ items }} placement="bottomLeft">
              <Button icon={<NodeExpandOutlined />} />
            </Dropdown>
          </Space>
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <>
        <Modal
          width={300}
          title="Add a new folder"
          okText="Add"
          open={addFolderModalOpen}
          onCancel={() => setAddFolderModalOpen(false)}
          onOk={() => {
            folderForm
              .validateFields()
              .then((values) => {
                addFolder.mutate({ name: values.name });
                setAddFolderModalOpen(false);
              })
              .catch((e) => {
                console.error(e);
              });
          }}
        >
          <Form
            form={folderForm}
            name="basic"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
          >
            <Form.Item<FolderType>
              label="Name"
              name="name"
              rules={[{ required: true, message: "Please input the Name!" }]}
            >
              <Input />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          open={addFeedModalOpen}
          title="Add a new Feed"
          okText="Add"
          onCancel={() => setAddFeedModalOpen(false)}
          onOk={() => {
            feedForm
              .validateFields()
              .then((values) => {
                addFeed.mutate({ url: values.url, folderId: values.folderId });
                setAddFeedModalOpen(false);
              })
              .catch((e) => {
                console.log(e);
              });
          }}
        >
          <Form
            form={feedForm}
            name="basic"
            initialValues={{ folderId: 1 }}
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            style={{ maxWidth: 600 }}
          >
            <Form.Item<FieldType>
              label="Url"
              name="url"
              rules={[{ required: true, message: "Please input the URL!" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item<FieldType> label="Folder" name="folderId">
              <Select
                options={folders.data?.map((f) => ({
                  value: f.id,
                  label: f.name,
                }))}
              />
            </Form.Item>
          </Form>
        </Modal>
        <Layout>
          <AppSider
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            pageId="feeds"
          >
            <Menu
              className={s.feedMenu}
              mode="inline"
              items={buildOptions()}
              onSelect={onSelect}
              selectedKeys={selected}
              style={{ marginTop: 8 }}
            />
          </AppSider>
          <Layout
            style={{ display: "flex", overflow: "scroll" }}
            onClick={() => setCollapsed(true)}
          >
            <SearchHeader
              query={query}
              onQueryChange={setQuery}
              right={
                <>
                  <ReadToggle
                    showRead={entriesInput.showRead}
                    onClick={() => {
                      setEntriesInput((input) => ({
                        ...input,
                        showRead: !entriesInput.showRead,
                      }));
                    }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      setAddFeedModalOpen(true);
                    }}
                  >
                    Add Feed
                  </Button>
                </>
              }
            />

            <div style={{ margin: "1rem" }}>
              <Card style={{ width: "100%", overflow: "auto" }}>
                {getHeader()}
                {entries.data && feeds.data && (
                  <FeedsList
                    showFeedName={entriesInput.feedId === undefined}
                    total={entries.data.total}
                    entries={entries.data.entries}
                    entiresInput={entriesInput}
                    feeds={feeds.data}
                    onPageChange={(page) => {
                      setEntriesInput((prev) => ({ ...prev, page }));
                    }}
                  />
                )}
              </Card>
            </div>
          </Layout>
        </Layout>
      </>
    </Layout>
  );
}
