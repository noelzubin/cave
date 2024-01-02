import React, { useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../server/api/root";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import Feed from "./pages/feed";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Bookmarks from "./pages/bookmarks";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Feed />
  },
  {
    path: "bookmarks",
    element: <Bookmarks />
  },
]);


export const trpc = createTRPCReact<AppRouter>();

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: "http://localhost:8080/trpc",
          // You can pass any HTTP headers you wish here
          async headers() {
            return {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="App">
          <RouterProvider router={router} />
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
