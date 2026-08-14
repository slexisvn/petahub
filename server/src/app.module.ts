import { Module } from "@nestjs/common";
import { AccountsService } from "./accounts/accounts.service";
import { ScopesService } from "./accounts/scopes.service";
import { AuthController } from "./auth/auth.controller";
import { GithubService } from "./auth/github.service";
import { SessionOrTokenGuard, TokenGuard } from "./auth/auth.guard";
import { CONFIG, loadConfig } from "./config/configuration";
import { IndexWriter } from "./packages/index-writer.service";
import { PackagesController } from "./packages/packages.controller";
import { PublishService } from "./packages/publish.service";
import { StaticController } from "./packages/static.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageService } from "./storage/storage.service";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, PackagesController, StaticController],
  providers: [
    { provide: CONFIG, useFactory: () => loadConfig() },
    AccountsService,
    ScopesService,
    GithubService,
    StorageService,
    IndexWriter,
    PublishService,
    TokenGuard,
    SessionOrTokenGuard
  ]
})
export class AppModule {}
