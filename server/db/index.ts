// import mongoose, { Schema, Document } from 'mongoose';


// const entrySchema = new Schema<Entry>({
//     feedId: { type: Number, required: true },
//     title: { type: String, required: true },
//     author: { type: String },
//     pubDate: { type: Date },
//     description: { type: String },
//     content: { type: String },
//     link: { type: String },
//     readAt: { type: Date },
//     createdAt: { type: Date, default: Date.now },
//     deletedAt: { type: Date, default: Date.now },
//     feed: { type: Schema.Types.ObjectId, ref: 'Feed', required: true },
// });

// const folderSchema = new Schema<Folder>({
//     name: { type: String, unique: true },
//     feed: [{ type: Schema.Types.ObjectId, ref: 'Feed' }],
// });

// const feedSchema = new Schema<Feed>({
//     title: { type: String, required: true },
//     feedLink: { type: String, unique: true },
//     link: { type: String },
//     refreshedAt: { type: Date },
//     folderId: { type: Schema.Types.ObjectId, ref: 'Folder', required: true },
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date, default: Date.now },
//     entry: [{ type: Schema.Types.ObjectId, ref: 'Entry' }],
// });

// const bookmarkSchema = new Schema<Bookmark>({
//     url: { type: String, unique: true },
//     title: { type: String, required: true },
//     imageUrl: { type: String },
//     description: { type: String },
//     faviconUrl: { type: String },
//     createdAt: { type: String, default: 'CURRENT_TIMESTAMP' },
//     bookmarkTag: [{ type: Schema.Types.ObjectId, ref: 'BookmarkTag' }],
// });

// const bookmarkTagSchema = new Schema<BookmarkTag>({
//     bookmarkId: { type: Schema.Types.ObjectId, ref: 'Bookmark', required: true },
//     tagId: { type: Schema.Types.ObjectId, ref: 'Tag', required: true },
// });

// const tagSchema = new Schema<Tag>({
//     name: { type: String, unique: true },
//     bookmarkTag: [{ type: Schema.Types.ObjectId, ref: 'BookmarkTag' }],
// });

// const EntryModel = mongoose.model<Entry>('Entry', entrySchema);
// const FolderModel = mongoose.model<Folder>('Folder', folderSchema);
// const FeedModel = mongoose.model<Feed>('Feed', feedSchema);
// const BookmarkModel = mongoose.model<Bookmark>('Bookmark', bookmarkSchema);
// const BookmarkTagModel = mongoose.model<BookmarkTag>('BookmarkTag', bookmarkTagSchema);
// const TagModel = mongoose.model<Tag>('Tag', tagSchema);

// export { EntryModel, FolderModel, FeedModel, BookmarkModel, BookmarkTagModel, TagModel };
