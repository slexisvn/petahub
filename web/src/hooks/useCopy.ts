import { useEffect, useRef, useState } from "react";

const FEEDBACK_MS = 1600;

export type CopyState = {
  readonly copied: boolean;
  readonly copy: (text: string) => void;
};

export function useCopy(): CopyState {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), FEEDBACK_MS);
    });
  };

  return { copied, copy };
}
