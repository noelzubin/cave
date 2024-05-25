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
  Table,
} from "antd";
import snarkdown from "snarkdown";
import { ItemType } from "antd/es/menu/hooks/useItems";
import React, { useEffect, useState } from "react";
import AppSider from "../components/AppSider";
import SearchHeader from "../components/SearchHeader";
import { useDebounce } from "../components/useDebounce";
import { trpc } from "../App";
import s from "./revise.module.sass";
import {
  Deck,
  DeckWithCount,
  FullCard,
  Card as RevCard,
} from "../../../server/src/usecase/revise";
import TextArea from "antd/es/input/TextArea";
import { convertToObject } from "typescript";
import { getDueFromNow } from "../utils/reldate";
import { unitless } from "antd/es/theme/useToken";

interface CardCreate {
  desc: string;
}
interface DeckCreate {
  name: string;
}

const columns = [
  {
    key: "Title",
    title: "Title",
    dataIndex: "desc",
    render: (desc: string) => (
      <div
        className={s.cardDesc}
        onClick={(e) => e.stopPropagation()}
        dangerouslySetInnerHTML={{ __html: snarkdown(desc) }}
      />
    ),
  },
  {
    key: "Due",
    title: "Due",
    dataIndex: "due",
    render: (due: Date) => <DueDate date={due} />,
  },
];

const Revise = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showAssignTagsModal, setShowAssignTagsModal] = useState(false);
  const [showCreateDeckForm, setShowCreateDeckForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [cardCreateForm] = Form.useForm<CardCreate>();
  const [createDeckForm] = Form.useForm<DeckCreate>();
  const [tgs, setTgs] = useState<number[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number>(1); // Notes is selected by default
  const [listCardsQuery, setListCardsQuery] = useState({});
  const [selectedCardId, setSelectedCardId] = useState<number | null>();

  const debQuery = useDebounce(query, 500);
  const utils = trpc.useUtils();
  const bulkUpdateBookmarks = trpc.bookmark.bulkUpdateBookmarks.useMutation({
    onSuccess: () => {
      void utils.bookmark.listBookmarks.refetch();
    },
  });

  const cards = trpc.revise.listCards.useQuery<RevCard[]>({
    deckId: selectedDeckId,
  });
  const addTag = trpc.revise.addDeck.useMutation({
    onSuccess: (data) => {
      void utils.revise.listDecks.refetch();
    },
  });
  const createCard = trpc.revise.addCard.useMutation({
    onSuccess: (data) => {
      void utils.revise.listCards.refetch();
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

  const decks = trpc.revise.listDecks.useQuery<DeckWithCount[]>();

  const buildOptions = () => {
    if (decks.data == undefined) return [];

    return decks.data.map((d) => ({
      key: d.id,
      className: s.menuItem,
      label: (
        <div className={s.feedMenuItem}>
          <div>{d.name}</div>
          <div>{d.count}</div>
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

  const onSelect: (params: { selectedKeys: string[] }) => void = ({
    selectedKeys,
  }) => {
    if (selectedKeys.length === 0) return;

    setSelectedDeckId(parseInt(selectedKeys[0]));
  };

  const [showPlaceholder, setShowPlaceholder] = useState(false);

  if (!decks.data) return <div>Loading...</div>;

  return (
    <>
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
            rules={[
              { required: true, message: "Please input the Description!" },
            ]}
          >
            <TextArea
              placeholder="Content"
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Layout>
        <AppSider
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          pageId="revise"
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
          <div style={{ margin: "1rem" }}>
            <Table
              columns={columns}
              dataSource={cards.data}
              onRow={(card) => {
                return {
                  onClick: (e) => {
                    setSelectedCardId(card.id);
                  },
                };
              }}
            />
            <Drawer
              title="Basic Drawer"
              width={500}
              onClose={() => {
                setSelectedCardId(undefined);
              }}
              open={selectedCardId != undefined}
              destroyOnClose
            >
              <CardDrawerContent
                cardId={selectedCardId!}
                onClose={() => setSelectedCardId(null)}
              />
            </Drawer>
          </div>
        </Layout>
      </Layout>
    </>
  );
};

interface IDueDate {
  date: Date;
}

const DueDate: React.FC<IDueDate> = ({ date }) => {
  let color = "green";
  if (date > new Date()) color = "purple";
  return <Tag color={color}>{getDueFromNow(date)}</Tag>;
};

interface ICardDrawerContent {
  cardId: number;
  onClose: VoidFunction;
}

interface CardUpdate {
  desc: string;
}

const CardDrawerContent: React.FC<ICardDrawerContent> = ({
  cardId,
  onClose,
}) => {
  const utils = trpc.useUtils();
  const card = trpc.revise.getCard.useQuery<FullCard>({ cardId });
  const descInputRef = React.useRef(null);
  const editCard = trpc.revise.editCard.useMutation({
    onSuccess: () => {
      utils.revise.listCards.refetch();
    },
  });
  const removeCard = trpc.revise.removeCard.useMutation({
    onSuccess: async () => {
      await utils.revise.listCards.refetch();
      onClose();
    },
  });

  const [updateCardForm] = Form.useForm<CardUpdate>();
  const onRespondMutation = trpc.revise.reviewCard.useMutation({
    onSuccess: () => {
      utils.revise.getCard.refetch({ cardId });
      utils.revise.listCards.refetch();
    },
  });
  const onRespond = (rating: number) => {
    onRespondMutation.mutate({ cardId, rating });
  };

  if (!card.data) return <div></div>;

  return (
    <Form
      form={updateCardForm}
      name="basic"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 20 }}
    >
      <Form.Item label="Desc" name="desc" required>
        <TextArea
          defaultValue={card.data.desc}
          onChange={(e) => {}}
          ref={descInputRef}
          placeholder="Content"
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </Form.Item>
      due: <Tag color="green">{getDueFromNow(card.data.due)}</Tag>
      <Flex gap="small" justify="end">
        <Button
          onClick={() => {
            removeCard.mutate({ cardId });
          }}
        >
          Delete
        </Button>
        <Button
          type="primary"
          onClick={() => {
            updateCardForm
              .validateFields()
              .then((values) => {
                editCard.mutate({
                  cardId,
                  desc: values.desc,
                });
              })
              .catch((e) => {
                console.error(e);
              });
          }}
        >
          Save
        </Button>
      </Flex>
      <Divider />
      <Flex gap="large" justify="center">
        <Button onClick={() => onRespond(1)} title="Again">
          1
        </Button>
        <Button onClick={() => onRespond(2)} title="Hard">
          2
        </Button>
        <Button onClick={() => onRespond(3)} title="Good">
          3
        </Button>
        <Button onClick={() => onRespond(4)} title="Easy">
          4
        </Button>
      </Flex>
      <List
        className={s.revLogs}
        header={<div>Revision Logs</div>}
        bordered
        dataSource={card.data.reviseRevlog}
        renderItem={(item) => (
          <List.Item>
            {`${item.review.toDateString()} - ${item.rating}`}
          </List.Item>
        )}
      />
    </Form>
  );
};

export default Revise;
