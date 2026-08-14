import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { MAX_ARCHIVE_BYTES } from "@slexisvn/peta";
import express from "express";
import { AppModule } from "./app.module";
import { CONFIG, type HubConfig } from "./config/configuration";

export async function createServer() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const config = app.get<HubConfig>(CONFIG);
  app.use(
    "/api/v1/publish",
    express.raw({ type: () => true, limit: MAX_ARCHIVE_BYTES })
  );
  app.enableCors({ origin: config.webUrl, credentials: true });
  return { app, config };
}

async function main(): Promise<void> {
  const { app, config } = await createServer();
  await app.listen(config.port);
  console.log(`petahub listening on ${config.publicUrl}`);
  console.log(`storage root ${config.storageRoot}`);
  if (config.github === null) {
    console.log("GitHub sign-in is not configured; only token auth will work");
  }
}

if (require.main === module) {
  void main();
}
