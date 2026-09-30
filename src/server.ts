// Local/Node entrypoint. Deployment adapters (Workers, Vercel) import `app`
// from app.ts directly; this file exists so `npm run dev` works anywhere.
import { serve } from "@hono/node-server";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => console.log(`UCP catalog reference listening on http://localhost:${info.port}`));
