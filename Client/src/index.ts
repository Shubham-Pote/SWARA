import { serve } from "bun";
import index from "./index.html";

const apiOrigin = process.env.SWARA_API_ORIGIN || "http://127.0.0.1:5000";
const appApi = /^\/api\/(?:auth\/(?:login|register|profile|language)|character\/(?:spanish|japanese)\/(?:history|message|new-conversation)|dashboard\/(?:spanish|japanese))$/;
const readingApi = /^\/api\/reading\/(?:(?:articles|current|next|stats)\/(?:spanish|japanese)|(?:article|start|complete)\/[a-f\d]{24})$/i;
const notesApi = /^\/api\/notes(?:\/[a-f\d]{24}(?:\/star)?)?$/i;

const server = serve({
  routes: {
    "/Characters/Maria.vrm": () => new Response(Bun.file(new URL("../Characters/Maria.vrm", import.meta.url))),
    "/Characters/Akira.vrm": () => new Response(Bun.file(new URL("../Characters/Akira.vrm", import.meta.url))),
    "/api/*": async (req, server) => {
      const url = new URL(req.url);
      if (!appApi.test(url.pathname) && !readingApi.test(url.pathname) && !notesApi.test(url.pathname)) {
        return Response.json({ message: "API route not found." }, { status: 404 });
      }
      const target = new URL(apiOrigin);
      target.pathname = url.pathname;
      target.search = url.search;
      const headers = new Headers();
      for (const name of ["Authorization", "Content-Type", "Accept"]) {
        const value = req.headers.get(name);
        if (value) headers.set(name, value);
      }
      server.timeout(req, 90);
      try {
        const upstream = await fetch(target, {
          method: req.method, headers, body: req.body, signal: req.signal, redirect: "error"
        });
        const responseHeaders = new Headers();
        for (const name of ["Content-Type", "Cache-Control", "X-Accel-Buffering", "Retry-After"]) {
          const value = upstream.headers.get(name);
          if (value) responseHeaders.set(name, value);
        }
        return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
      } catch {
        return Response.json({ message: "Could not reach the SWARA backend. Try again." }, { status: 502 });
      }
    },
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
});

console.log(`SWARA at ${server.url}`);
