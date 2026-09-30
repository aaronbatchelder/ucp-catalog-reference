// Vercel entrypoint: every path is rewritten here (vercel.json) and handed to
// the runtime-agnostic Hono app.
import { handle } from "hono/vercel";
import { app } from "../src/app.js";

export default handle(app);
