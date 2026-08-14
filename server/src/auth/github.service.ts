import { Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { CONFIG, type HubConfig } from "../config/configuration";
import type { GithubIdentity } from "../accounts/accounts.service";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

@Injectable()
export class GithubService {
  constructor(@Inject(CONFIG) private readonly config: HubConfig) {}

  get enabled(): boolean {
    return this.config.github !== null;
  }

  private require(): NonNullable<HubConfig["github"]> {
    if (this.config.github === null) {
      throw new ServiceUnavailableException(
        "GitHub sign-in is not configured; set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
      );
    }
    return this.config.github;
  }

  authorizeUrl(state: string): string {
    const github = this.require();
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", github.clientId);
    url.searchParams.set("redirect_uri", `${this.config.publicUrl}/api/v1/auth/github/callback`);
    url.searchParams.set("scope", "read:user");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async identityFor(code: string): Promise<GithubIdentity> {
    const github = this.require();
    const exchange = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: github.clientId,
        client_secret: github.clientSecret,
        code,
        redirect_uri: `${this.config.publicUrl}/api/v1/auth/github/callback`
      })
    });
    if (!exchange.ok) throw new UnauthorizedException("GitHub rejected the authorization code");
    const granted = (await exchange.json()) as { access_token?: string; error?: string };
    if (granted.access_token === undefined) {
      throw new UnauthorizedException(granted.error ?? "GitHub returned no access token");
    }
    const profile = await fetch(USER_URL, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${granted.access_token}`,
        "user-agent": "petahub"
      }
    });
    if (!profile.ok) throw new UnauthorizedException("could not read the GitHub profile");
    const user = (await profile.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string | null;
    };
    return {
      githubId: String(user.id),
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url
    };
  }
}
