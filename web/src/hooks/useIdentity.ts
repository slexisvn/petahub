import { useCallback, useEffect, useState } from "react";
import { whoami } from "../api";
import type { Identity } from "../models";

export type IdentityState = {
  readonly identity: Identity | null;
  readonly loading: boolean;
  readonly refresh: () => void;
};

export function useIdentity(): IdentityState {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    whoami()
      .then((value) => {
        if (live) setIdentity(value);
      })
      .catch(() => {
        if (live) setIdentity(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [nonce]);

  return { identity, loading, refresh };
}
