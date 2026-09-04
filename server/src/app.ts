import express, { type Express } from "express";
import { api } from "./routes.js";

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", api);
  return app;
}
