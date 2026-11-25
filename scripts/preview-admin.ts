// Isolated local acceptance fixture. Never used by the production server.
// All editorial data is ephemeral and authentication is synthetic test data.
import express from "express";
import { readFile } from "node:fs/promises";
import cors from "cors";
import { createApp } from "../../allexi_backend/src/app";
import {
  createContentFixture,
  editorId,
  editorToken,
  fixtureUser,
  readerId,
  readerToken,
} from "../../allexi_backend/tests/helpers/content-fixture";

async function main() {
  const fixture = await createContentFixture();
  // Keep editorial content empty for draft/publication acceptance, but apply
  // the production permissions and deletion behavior used by the live API.
  await fixture.database.exec(
    "alter table public.scripture_drafts alter column updated_by drop not null; alter table public.scripture_history alter column actor_id drop not null",
  );
  await fixture.database.exec(
    await readFile(
      new URL(
        "../../allexi_backend/supabase/migrations/202611130001_production_hardening.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const app = express();
  app.use(cors({ origin: ["http://localhost:8091", "http://127.0.0.1:8091"] }));
  app.use(express.json());
  const recoverySession = () => ({
    access_token: editorToken,
    refresh_token: "fixture-editor-refresh",
    token_type: "bearer",
    expires_in: 86400,
    user: fixtureUser(editorId),
  });
  app.post("/auth/v1/recover", (_req, res) => res.json({}));
  app.post("/auth/v1/verify", (req, res) => {
    if (
      req.body.email !== "editor@allexi.test" ||
      req.body.token !== "123456" ||
      req.body.type !== "recovery"
    ) {
      res.status(400).json({ message: "Invalid fixture recovery code" });
      return;
    }
    res.json(recoverySession());
  });
  app.put("/auth/v1/user", (_req, res) => res.json(fixtureUser(editorId)));
  app.post("/auth/v1/token", (req, res) => {
    const id =
      req.body.email === "editor@allexi.test" ||
      req.body.refresh_token === "fixture-editor-refresh"
        ? editorId
        : req.body.email === "reader@allexi.test"
          ? readerId
          : null;
    if (
      !id ||
      (req.body.password !== "fixture-password" && !req.body.refresh_token)
    ) {
      res.status(401).json({ message: "Use the documented fixture account." });
      return;
    }
    res.json({
      access_token: id === editorId ? editorToken : readerToken,
      refresh_token:
        id === editorId ? "fixture-editor-refresh" : "fixture-reader-refresh",
      token_type: "bearer",
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      user: fixtureUser(id),
    });
  });
  app.get("/auth/v1/user", (req, res) => {
    const id =
      req.headers.authorization === `Bearer ${editorToken}`
        ? editorId
        : req.headers.authorization === `Bearer ${readerToken}`
          ? readerId
          : null;
    if (!id) {
      res.status(401).json({ message: "Invalid session" });
      return;
    }
    res.json(fixtureUser(id));
  });
  app.post("/auth/v1/logout", (_req, res) => {
    res.status(204).end();
  });
  app.post("/rest/v1/rpc/sync_library", async (req, res) => {
    const id =
      req.headers.authorization === `Bearer ${editorToken}`
        ? editorId
        : req.headers.authorization === `Bearer ${readerToken}`
          ? readerId
          : null;
    if (!id) {
      res.status(401).json({ message: "Invalid session" });
      return;
    }
    try {
      res.json(await fixture.rpc("sync_library", req.body, id));
    } catch {
      res.status(400).json({ message: "Invalid library change" });
    }
  });
  app.use(
    createApp({
      url: "http://127.0.0.1:3101",
      key: "fixture-key",
      origins: ["http://localhost:8091", "http://127.0.0.1:8091"],
      clientFactory: fixture.factory,
      adminFactory: () => fixture.factory(),
    }),
  );
  const server = app.listen(3101, "127.0.0.1", () =>
    console.log(
      "Isolated admin fixture: http://127.0.0.1:3101 · editor@allexi.test / fixture-password · resets on exit",
    ),
  );
  const stop = () => {
    server.close(() => {
      void fixture.database.close().then(() => process.exit());
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
