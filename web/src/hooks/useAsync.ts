import { useEffect, useState } from "react";

export type AsyncState<T> = {
  readonly data: T | null;
  readonly error: unknown;
  readonly loading: boolean;
};

export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    let live = true;
    setState((previous) => ({ ...previous, loading: true }));
    loader()
      .then((data) => {
        if (live) setState({ data, error: null, loading: false });
      })
      .catch((issue: unknown) => {
        if (live) setState({ data: null, error: issue, loading: false });
      });
    return () => {
      live = false;
    };
  }, deps);

  return state;
}
