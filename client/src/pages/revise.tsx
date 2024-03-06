import { DeleteOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Divider,
  Drawer,
  Flex,
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
import {
  Tag as BmTag,
  ListBookmarksResponse,
} from "../../../server/src/usecase/bookmark";
import { trpc } from "../App";
import s from "./revise.module.sass";
import type { Bookmark } from "../../../server/src/usecase/bookmark";
import BookmarkComp from "../components/bookmark/Bookmark";
import { Deck, Card as RevCard } from "../../../server/src/usecase/revise";
import TextArea from "antd/es/input/TextArea";


interface CardCreate {
  desc: string;
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
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showAssignTagsModal, setShowAssignTagsModal] = useState(false);
  const [showCreateDeckForm, setShowCreateDeckForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editBookmarkModal, setEditBookmarkModal] = useState<
    Bookmark | undefined
  >(undefined);
  const [cardCreateForm] = Form.useForm<CardCreate>();
  const [bmEditForm] = Form.useForm<BookmarkEdit>();
  const [createDeckForm] = Form.useForm<DeckCreate>();
  const [addTagsForm] = Form.useForm<AddTags>();
  const [tgs, setTgs] = useState<number[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number>(1); // Notes is selected by default
  const [listCardsQuery, setListCardsQuery] = useState({});
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


  const cards = trpc.revise.listCards.useQuery<RevCard[]>({ deckId: selectedDeckId});
  const addTag = trpc.revise.addDeck.useMutation({
    onSuccess: (data) => {
      void utils.revise.listDecks.refetch();
    },
  });
  const createCard = trpc.revise.addCard.useMutation({
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
  console.log("DECKS ", decks);

  const onSelectBookmark = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const buildOptions = () => {
    if (decks.data == undefined) return [];

    return decks.data.map((t) => ({
      key: t.id,
      className: s.menuItem,
      label: (
        <div className={s.feedMenuItem}>
          <div>{t.name}</div>
          <div>{t.id.toString()}</div>
        </div>
      ),
    }));
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
    if (selectedKeys.length === 0) return

    setSelectedDeckId(parseInt(selectedKeys[0]))
  };

  const [showPlaceholder, setShowPlaceholder] = useState(false);

  if (!decks.data) return <div>Loading...</div>;

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
        width={500}
        title="Add a new Card"
        okText="Add"
        open={showAddCardForm}
        onCancel={() => setShowAddCardForm(false)}
        onOk={() => {
          cardCreateForm
            .validateFields()
            .then((values) => {
              createCard.mutate({ deckId: selectedDeckId, desc: values.desc });
              setShowAddCardForm(false);
            })
            .catch((e) => {
              console.error(e);
            });
        }}
      >
        <Form
          form={cardCreateForm}
          name="basic"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item<CardCreate>
            label="Desc "
            name="desc"
            rules={[{ required: true, message: "Please input the Description!" }]}
          >
            <TextArea
              placeholder="Content"
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
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
            selectedKeys={[selectedDeckId.toString()]}
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
              <Button
                type="primary"
                onClick={() => {
                  setShowAddCardForm(true);
                }}
              >
                Add Card
              </Button>
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
            <List
              header={<h2>Ready</h2>}
              className={s.reviseGrid}
              dataSource={cards.data}
              renderItem={(card) => (
                <Card size="small" style={{ width: 300 }}>
                  <div dangerouslySetInnerHTML={{ __html: card.desc }} />
                  <Divider />
                  <p>Due: {card.nextShowDate.toString()}</p>
                </Card>
              )}
            ></List>

            <Divider />
            <List
              header={<h2>Upcoming</h2>}
              className={s.reviseGrid}
              dataSource={Array(6).fill(0)}
              renderItem={(item) => (
                <Card size="small" style={{ width: 300 }}>
                  <p>Card content</p>
                  <a href="https://www.google.com">code</a>
                  <Divider />
                  <p>Due: Today</p>
                </Card>
              )}
            ></List>

            <Drawer title="Basic Drawer" onClose={() => {}} open={false}>
              <TextArea
                onChange={(e) => {}}
                placeholder="Content"
                autoSize={{ minRows: 3, maxRows: 5 }}
              />
              <p> Due: Today </p>
              <Flex gap="small" justify="end">
                <Button >Save</Button>
                <Button >Delete</Button>
              </Flex>

<Divider/>
              <Flex gap="large" justify="center">
                <Button>0</Button>
                <Button>1</Button>
                <Button>2</Button>
                <Button>3</Button>
                <Button>4</Button>
              </Flex>
            </Drawer>
          </div>
        </Layout>
      </Layout>
    </>
  );
};

export default Bookmarks;
