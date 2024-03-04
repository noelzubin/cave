import { DeleteOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Select,
  Switch,
  Tag,
} from "antd";
import { ItemType } from "antd/es/menu/hooks/useItems";
import { useEffect, useState } from "react";
import AppSider from "../components/AppSider";
import SearchHeader from "../components/SearchHeader";
import { useDebounce } from "../components/useDebounce";
import { Tag as BmTag, ListBookmarksResponse } from "../../../server/src/usecase/bookmark";
import { trpc } from "../App";
import s from "./bookmarks.module.sass";
import type { Bookmark } from "../../../server/src/usecase/bookmark";
import BookmarkComp from "../components/bookmark/Bookmark";
import { Deck } from "../../../server/src/usecase/revise";

interface BookmarkCreate {
  url: string;
}
interface DeckCreate {
  name: string;
}

interface AddTags {
  tags: number[];
}

interface BookmarkEdit {
  title: string;
  description: string;
  imageUrl: string;
  tags: number[];
}

interface ListBookmarkQuery {
  tags: number[];
  query: string;
  page: number;
}

const Bookmarks = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [showAddBookmarkForm, setShowAddBookmarkForm] = useState(false);
  const [showAssignTagsModal, setShowAssignTagsModal] = useState(false);
  const [showCreateDeckForm, setShowCreateDeckForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editBookmarkModal, setEditBookmarkModal] = useState<
    Bookmark | undefined
  >(undefined);
  const [bmCreateForm] = Form.useForm<BookmarkCreate>();
  const [bmEditForm] = Form.useForm<BookmarkEdit>();
  const [createDeckForm] = Form.useForm<DeckCreate>();
  const [addTagsForm] = Form.useForm<AddTags>();
  const [tgs, setTgs] = useState<number[]>([]);
  const [listBookmarkQuery, setListBookmarkQuery] = useState<ListBookmarkQuery>(
    {
      page: 1,
      query,
      tags: [],
    }
  );

  const debQuery = useDebounce(query, 500);
  const utils = trpc.useUtils();
  const bulkUpdateBookmarks = trpc.bookmark.bulkUpdateBookmarks.useMutation({
    onSuccess: () => {
      void utils.bookmark.listBookmarks.refetch();
    },
  });

  const addTag = trpc.revise.addDeck.useMutation({
    onSuccess: (data) => {
      void utils.revise.listDecks.refetch();
    },
  });
  const createBookmark = trpc.bookmark.addBookmark.useMutation({
    onSuccess: (data) => {
      void utils.bookmark.listBookmarks.refetch();
    },
  });
  const editBookmark = trpc.bookmark.editBookmark.useMutation({
    onSuccess: (data) => {
      void utils.bookmark.listBookmarks.refetch();
    },
  });
  const deleteBookmark = trpc.bookmark.deleteBookmark.useMutation({
    onSuccess: (data) => {
      void utils.bookmark.listBookmarks.refetch();
    },
  });


  useEffect(() => {
    setListBookmarkQuery((prev) => ({ ...prev, query: debQuery }));
  }, [debQuery]);

  const bookmarks =
    trpc.bookmark.listBookmarks.useQuery<ListBookmarksResponse>(
      listBookmarkQuery
    );
  const decks = trpc.revise.listDecks.useQuery<Deck[]>();
  console.log("DECKS " , decks)

  const onSelectBookmark = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const buildOptions = () => {
    const options: ItemType[] = [
      {
        key: "all",
        label: "All",
        className: s.menuItem
      },
      {
        key: "decks",
        label: "Decks",
        children: decks.data?.map((t) => ({
          key: t.id,
          className: s.menuItem,
          label: (
            <div className={s.feedMenuItem}>
              <div>{t.name}</div> 
              <div>{t.id.toString()}</div>
            </div>
          ),
        })),
      },
    ];

    return options;
  };

  const onBookmarkDelete = (id: number) => {
    deleteBookmark.mutate({ id });
  };

  const getOptions = () => {
    if (!decks.data) return [];

    return decks.data.map((t) => ({
      value: t.id,
      label: t.name,
    }));
  };

  const onBookmarkEdit = (id: number) => {
    if (!bookmarks.data) return;
    const bookmark: Bookmark = bookmarks.data.bookmarks.find(
      (b) => b.id === id
    )!;
    setEditBookmarkModal(bookmark);
    bmEditForm.setFieldsValue({
      title: bookmark.title,
      description: bookmark.description,
      imageUrl: bookmark.imageUrl,
      tags: bookmark.tags,
    });
  };

  const onSelect: (params: { selectedKeys: string[] }) => void = ({
    selectedKeys,
  }) => {
    if (selectedKeys[0] === "all") {
      setListBookmarkQuery((prev) => ({ ...prev, tags: [] }));
    } else {
      const newTagId = Number(selectedKeys[0]);
      const prev = listBookmarkQuery.tags.find((t) => t === newTagId);
      if (!prev)
        setListBookmarkQuery((prev) => ({
          ...prev,
          tags: prev.tags.concat([newTagId]),
        }));
    }
  };

  const [showPlaceholder, setShowPlaceholder] = useState(false);

  if(!decks.data) return <div>Loading...</div>

  return (
    <>
      <Modal
        title="Assign Tags"
        okText="Add"
        open={showAssignTagsModal}
        onCancel={() => setShowAssignTagsModal(false)}
        onOk={() => {
          addTagsForm
            .validateFields()
            .then((values) => {
              bulkUpdateBookmarks.mutate({
                ids: selectedIds,
                tagsIds: values.tags,
              });
              setShowAssignTagsModal(false);
              setSelectedIds([]);
            })
            .catch((e) => {
              console.error(e);
            });
        }}
      >
        <Form
          form={addTagsForm}
          name="basic"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
        >
          <Form.Item<AddTags> label="Tags" name="tags" required>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              options={getOptions()}
              filterOption={(input, option) => option!.label.startsWith(input)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        width={300}
        title="Add a new Deck"
        okText="Add"
        open={showCreateDeckForm}
        onCancel={() => setShowCreateDeckForm(false)}
        onOk={() => {
          createDeckForm
            .validateFields()
            .then((values) => {
              addTag.mutate({ name: values.name });
              setShowCreateDeckForm(false);
            })
            .catch((e) => {
              console.error(e);
            });
        }}
      >
        <Form
          form={createDeckForm}
          name="basic"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
        >
          <Form.Item<DeckCreate>
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please input the name!" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        width={300}
        title="Add a new Bookmark"
        okText="Add"
        open={showAddBookmarkForm}
        onCancel={() => setShowAddBookmarkForm(false)}
        onOk={() => {
          bmCreateForm
            .validateFields()
            .then((values) => {
              createBookmark.mutate({ url: values.url, title: values.url });
              setShowAddBookmarkForm(false);
            })
            .catch((e) => {
              console.error(e);
            });
        }}
      >
        <Form
          form={bmCreateForm}
          name="basic"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 20 }}
        >
          <Form.Item<BookmarkCreate>
            label="Url"
            name="url"
            rules={[{ required: true, message: "Please input the Url!" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Edit Bookmark"
        okText="Update"
        open={!!editBookmarkModal}
        onCancel={() => setEditBookmarkModal(undefined)}
        onOk={() => {
          bmEditForm
            .validateFields()
            .then((values) => {
              editBookmark.mutate({
                id: editBookmarkModal!.id,
                title: values.title,
                description: values.description,
                imageUrl: values.imageUrl,
                tags: values.tags,
              });
              setEditBookmarkModal(undefined);
            })
            .catch((e) => {
              console.error(e);
            });
        }}
      >
        <Form
          form={bmEditForm}
          name="basic"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Layout>
            {editBookmarkModal?.imageUrl && (
              <img src={editBookmarkModal.imageUrl} />
            )}
          </Layout>
          <Form.Item<BookmarkEdit>
            label="Title"
            name="title"
            rules={[{ required: true, message: "Please input the Title" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item<BookmarkEdit> label="Description" name="description">
            <Input />
          </Form.Item>
          <Form.Item<BookmarkEdit> label="Image Url" name="imageUrl">
            <Input />
          </Form.Item>
          <Form.Item<BookmarkEdit> label="Tags" name="tags">
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              options={getOptions()}
              filterOption={(input, option) => option!.label.startsWith(input)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Layout>
        <AppSider
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          pageId="bookmarks"
        >
          <Menu
            className={s.feedMenu}
            mode="inline"
            items={buildOptions()}
            onSelect={onSelect}
            style={{ marginTop: 8 }}
          />
          <Button
            className={s.createTagBtn}
            type="text"
            onClick={() => {
              setShowCreateDeckForm(true);
            }}
          >
            + Create Deck
          </Button>
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
                <Switch
                  checked={showPlaceholder}
                  onChange={() => setShowPlaceholder((prev) => !prev)}
                />
                <Button
                  type="primary"
                  onClick={() => {
                    setShowAddBookmarkForm(true);
                  }}
                >
                  Add Bookmark
                </Button>
              </>
            }
          />

          {selectedIds.length > 0 && (
            <Card className={s.tagSelect}>
              <div>
                <DeleteOutlined
                  className={s.delete}
                  onClick={() => setSelectedIds([])}
                />
                {selectedIds.length} Selected
                <Button
                  className={s.addTags}
                  size="small"
                  onClick={() => setShowAssignTagsModal(true)}
                >
                  Add Tags
                </Button>
              </div>
            </Card>
          )}

          {listBookmarkQuery.tags.length > 0 && (
            <div className={s.queryTags}>
              {listBookmarkQuery.tags.map((t) => {
                const tag = decks.data?.find((d) => d.id === t);
                return (
                  <Tag
                    key={t}
                    closable
                    onClose={() => {
                      setListBookmarkQuery((prev) => ({
                        ...prev,
                        tags: prev.tags.filter((tg) => tg !== t),
                      }));
                    }}
                  >
                    {tag?.name}
                  </Tag>
                );
              })}
            </div>
          )}

          <div style={{ margin: "1rem" }}>
            {/* <List
              className={s.bookmarksList}
              dataSource={bookmarks.data?.bookmarks}
              grid={{ gutter: 8 }}
              renderItem={(bm) => (
                <BookmarkComp
                  onSelect={onSelectBookmark}
                  selectedIds={selectedIds}
                  showPlaceholder={showPlaceholder}
                  onEdit={onBookmarkEdit}
                  onDelete={onBookmarkDelete}
                  key={bm.id}
                  bookmark={bm}
                  tags={decks.data ?? []}
                />
              )}
              pagination={{
                pageSize: 50,
                total: bookmarks.data?.total ?? 0,
                current: listBookmarkQuery.page,
                onChange: (page) =>
                  setListBookmarkQuery((prev) => ({ ...prev, page })),
              }}
            /> */}
          </div>
        </Layout>
      </Layout>
    </>
  );
};

export default Bookmarks;
