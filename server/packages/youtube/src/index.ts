import Parser from 'rss-parser';
import axios from 'axios';
import { channel } from 'diagnostics_channel';

export interface FeedDetails {
    feedUrl: string
    type: 'channel' | 'playlist'
}

export interface IYoutube {
    // Get the RSS feed url from the given youtube channel/playlist url
    getFeedUrl(url: string): Promise<string>;
    // Get list of all videos from the channel/playlist using youtube API.
    getVideos(url: string): Promise<Video[]>;
}

export interface Video {
    title: string
    author: string
    content: string
    description: string
    link: string
    pubDate: Date,
}

interface YoutubeResponse {
    nextPageToken?: string
    items: YoutubeItem[]
}

interface YoutubePlaylistResponse {
    nextPageToken?: string
    items: YoutubePlaylistItem[]
}

interface YoutubeItem {
    id: {
        videoId: string
    },
    snippet: {
        title: string
        channelTitle: string
        publishedAt: string
        description: string
    }
}

interface YoutubePlaylistItem {
    snippet: {
        resourceId: {
            kind: string,
            videoId: string,
        }
        title: string
        channelTitle: string
        publishedAt: string
        description: string
    }
}

export class Youtube implements IYoutube {
    token: string;

    constructor(token: string) {
        this.token = token;
    }

    // Get id of a youtube channel from then youtube url using YOUTUBE API.
    async getChannelId(url: string): Promise<string> {
        const channelName = url.match(/youtube.com\/(@[^/]+)/)![1];

        const { data: res } = await axios.get('https://youtube.googleapis.com/youtube/v3/search', {
            params: {
                part: 'id',
                maxResults: 1,
                q: channelName,
                type: 'channel',
                key: this.token,
            }
        });

        return res.items[0].id.channelId!;
    }

    async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Return RSS url from a youtube url 
    async getFeedUrl(url: string): Promise<string> {
        // The channelId is already in url, might be the feedUrl itself.
        if (url.includes('channel_id=')) {
            const channelId = this.getChannelIdFromFeedUrl(url);
            return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        }

        // is a playlist. parse playlist id
        const isPlaylist = url.includes("list=");
        if (isPlaylist) {
            const playlistId = url.split("list=")[1]!.split("&")[0]
            return `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
        }

        // Is a channel. fetch channel id from name
        const channelId = await this.getChannelId(url);
        return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    }

    // Parse channelId from url
    getChannelIdFromFeedUrl(feedUrl: string): string {
        const channelId = feedUrl.match(/channel_id=([^&]+)/)![1];
        if (!channelId) throw new Error(`Invalid channel url : ${feedUrl}`);
        return channelId;
    }

    // parse playlistId from url
    getPlaylistIdFromFeedUrl(feedUrl: string): string {
        const playlistId = feedUrl.match(/playlist_id=([^&]+)/)![1];
        if (!playlistId) throw new Error(`Invalid playlist url : ${feedUrl}`);
        return playlistId;
    }

    // list all videos using YOUTUBE API 
    async getVideos(feedUrl: string): Promise<Video[]> {
        if (feedUrl.includes('channel_id=')) {
            const channelId = this.getChannelIdFromFeedUrl(feedUrl);
            return this.getVideosFromChannelId(channelId)
        }

        if (feedUrl.includes('playlist_id=')) {
            const playlistId = this.getPlaylistIdFromFeedUrl(feedUrl);
            return this.getVideosFromPlaylistId(playlistId)
        }

        throw new Error("Invalid feedUrl");
    }


    async getVideosFromChannelId(channelId: string): Promise<Video[]> {
        let pageToken: string | undefined = undefined;
        let allItems: Video[] = [];
        let hasNextPage = true;

        while (hasNextPage) {
            const { data: res } = await axios.get<YoutubeResponse>('https://youtube.googleapis.com/youtube/v3/search', {
                params: {
                    pageToken,
                    part: 'snippet,id',
                    channelId: channelId,
                    key: this.token,
                    maxResults: 50,
                    type: 'video',
                    order: 'date'
                }
            });


            const { nextPageToken, items } = res as YoutubeResponse;
            console.log(items.length, nextPageToken);
            pageToken = nextPageToken;
            hasNextPage = !!nextPageToken;
            allItems = allItems.concat(items.map(item => ({
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                description: item.snippet.description,
                pubDate: new Date(item.snippet.publishedAt),
                content: `https://www.youtube.com/v/${item.id.videoId}`,
                link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            })))

        }

        return allItems;
    }

    async getVideosFromPlaylistId(playlistId: string): Promise<Video[]> {
        let pageToken: string | undefined = undefined;
        let allItems: Video[] = [];
        let hasNextPage = true;

        while (hasNextPage) {
            const { data: res } = await axios.get<YoutubePlaylistResponse>('https://youtube.googleapis.com/youtube/v3/playlistItems', {
                params: {
                    maxResults: 50,
                    pageToken,
                    part: 'snippet',
                    playlistId: playlistId,
                    key: this.token,
                }
            });


            const { nextPageToken, items } = res as YoutubePlaylistResponse;
            console.log(items.length, nextPageToken);
            pageToken = nextPageToken;
            hasNextPage = !!nextPageToken;
            allItems = allItems.concat(items
                .filter(item => item.snippet.resourceId.kind === 'youtube#video')
                .map(item => ({
                    title: item.snippet.title,
                    author: item.snippet.channelTitle,
                    description: item.snippet.description,
                    pubDate: new Date(item.snippet.publishedAt),
                    content: `https://www.youtube.com/v/${item.snippet.resourceId.videoId}`,
                    link: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                }))
            );
        }

        return allItems;
    }
}