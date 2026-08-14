import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

const CONTENT_TYPES: ReadonlyMap<string, string> = new Map([
  [".json", "application/json; charset=utf-8"],
  [".tpkg", "application/octet-stream"]
]);

function joinSegments(value: string | readonly string[]): string {
  return (Array.isArray(value) ? value : [value as string]).join("/");
}

@Controller()
export class StaticController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService
  ) {}

  @Get("index/*path")
  index(@Param("path") path: string | string[], @Res() response: Response): void {
    this.send(`index/${joinSegments(path)}`, response);
  }

  @Get("pkg/*path")
  async archive(
    @Param("path") path: string | string[],
    @Res() response: Response
  ): Promise<void> {
    const location = `pkg/${joinSegments(path)}`;
    this.send(location, response);
    await this.prisma.release.updateMany({
      where: { archivePath: location },
      data: { downloads: { increment: 1 } }
    });
  }

  private send(location: string, response: Response): void {
    if (!this.storage.isServable(location)) throw new NotFoundException();
    const contents = this.storage.read(location);
    if (contents === null) throw new NotFoundException();
    const dot = location.lastIndexOf(".");
    const type = CONTENT_TYPES.get(dot < 0 ? "" : location.slice(dot));
    if (type !== undefined) response.setHeader("Content-Type", type);
    response.setHeader("Cache-Control", "public, max-age=60");
    response.send(contents);
  }
}
