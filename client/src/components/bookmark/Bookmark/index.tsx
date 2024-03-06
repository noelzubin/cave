import { Avatar, Button, Card, Checkbox, Layout, Space, Tag } from "antd";
import { FC } from "react";
import cx from 'classnames';
import s from './index.module.sass';
import type {
    Bookmark,
    Tag as BmTag,
  } from "../../../../../server/src/usecase/bookmark";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
const { Header } = Layout;
const { Meta } = Card;


interface IBookmarkProps {
  bookmark: Bookmark;
  tags: BmTag[];
  onDelete: (n: number) => void;
  onEdit: (n: number) => void;
  showPlaceholder: boolean;
  selectedIds: number[];
  onSelect: (id: number) => void;
}

const BookmarkComp: FC<IBookmarkProps> = ({
  bookmark,
  tags,
  onDelete,
  onEdit,
  showPlaceholder,
  selectedIds,
  onSelect,
}) => {
  return (
    <Card
      className={cx(s.bmCard, {
        [s.selected!]: selectedIds.includes(bookmark.id),
      })}
      cover={
        bookmark.imageUrl &&
        showPlaceholder && <img alt="example" src={bookmark.imageUrl} />
      }
      hoverable
      size="small"
      onClick={() => {
        if (selectedIds.length > 0) onSelect(bookmark.id);
        else window.open(bookmark.url, "_blank");
      }}
    >
      <div className={s.bookmarkActions}>
        <Checkbox
          className={s.checkbox}
          checked={selectedIds.includes(bookmark.id)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onChange={(e) => {
            onSelect(bookmark.id);
          }}
        />
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(bookmark.id);
            }}
          />
          <Button
            size="small"
            icon={
              <DeleteOutlined
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(bookmark.id);
                }}
              />
            }
          />
        </Space>
      </div>
      <Meta
        avatar={<Avatar size="small" src={bookmark.faviconUrl} />}
        title={bookmark.title}
      />
      <div className={s.bmDesc}>{bookmark.description}</div>
      <div className={s.bmTags}>
        {bookmark.tags.map((tagId) => (
          <Tag key={tagId} color="success">
            {tags.find((t) => t.id === tagId)!.name}
          </Tag>
        ))}
      </div>
    </Card>
  );
};

export default BookmarkComp