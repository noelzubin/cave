import { Document } from "mongoose";

interface Entry extends Document {
    feedId: number;
    title: string;
    author?: string;
    pubDate?: Date;
    description?: string;
    content?: string;
    link?: string;
    readAt?: Date;
    createdAt?: Date;
    deletedAt?: Date;
}

interface Folder extends Document {
    name: string;
}

interface Feed extends Document {
    title: string;
    feedLink?: string;
    link?: string;
    refreshedAt?: Date;
    folderId: Folder
    createdAt?: Date;
    updatedAt?: Date;
    entry: Entry
}
