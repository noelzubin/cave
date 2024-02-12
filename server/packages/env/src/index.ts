import { z } from "zod";


// ENV VARS
const Env = z.object({
  DATABASE_URL: z.string().url(),
  // YOUTUBE_TOKEN is use to fetch all the videos from a channel/playlist.
  // The youtube rss only returns the last 15 videos.
  YOUTUBE_TOKEN: z.string(),
});

export const env = Env.parse(process.env);
export type Env = z.infer<typeof Env>
