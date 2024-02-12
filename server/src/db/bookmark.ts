import { Document } from 'mongoose';

interface Bookmark extends Document {
    url: string;
    title: string;
    imageUrl?: string;
    description?: string;
    faviconUrl?: string;
    createdAt?: string;
    bookmarks: string[];
}

interface Tag extends Document {
    name: string;
}
