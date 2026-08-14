import "reflect-metadata";
import { AccountsService } from "./accounts/accounts.service";
import { loadConfig } from "./config/configuration";
import { PrismaService } from "./prisma/prisma.service";

const USAGE = `Usage: petahub-admin <command>

Commands:
  account <login>            create or update a local account (no GitHub needed)
  token <login> [label]      issue a token for an account and print it once
  scope <login> <scope>      give an account ownership of a scope
  scopes                     list every scope and its owner
`;

async function main(argv: readonly string[]): Promise<number> {
  const prisma = new PrismaService();
  const accounts = new AccountsService(prisma, loadConfig());
  try {
    const [command, ...args] = argv;
    switch (command) {
      case "account": {
        const login = args[0];
        if (login === undefined) throw new Error("account needs a login");
        const account = await prisma.account.upsert({
          where: { login },
          create: { login, githubId: `local:${login}` },
          update: {}
        });
        console.log(`account ${account.login} (${account.id})`);
        return 0;
      }
      case "token": {
        const login = args[0];
        if (login === undefined) throw new Error("token needs a login");
        const account = await prisma.account.findUnique({ where: { login } });
        if (account === null) throw new Error(`no account named '${login}'`);
        const issued = await accounts.issueToken(account.id, args[1] ?? "cli");
        console.log(issued.secret);
        console.error(`issued '${issued.label}' for ${login}; it is shown only once`);
        return 0;
      }
      case "scope": {
        const [login, name] = args;
        if (login === undefined || name === undefined) {
          throw new Error("scope needs a login and a scope name");
        }
        const account = await prisma.account.findUnique({ where: { login } });
        if (account === null) throw new Error(`no account named '${login}'`);
        const scope = await prisma.scope.upsert({
          where: { name },
          create: { name, ownerId: account.id },
          update: { ownerId: account.id }
        });
        console.log(`${scope.name} -> ${login}`);
        return 0;
      }
      case "scopes": {
        const scopes = await prisma.scope.findMany({
          include: { owner: true },
          orderBy: { name: "asc" }
        });
        for (const scope of scopes) console.log(`${scope.name} -> ${scope.owner.login}`);
        return 0;
      }
      default:
        console.log(USAGE);
        return command === undefined ? 0 : 2;
    }
  } catch (error) {
    console.error(`petahub-admin: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
