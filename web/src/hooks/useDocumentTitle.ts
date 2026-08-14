import { useEffect } from "react";
import { SITE_NAME, TITLE_SEPARATOR } from "../lib/site";

export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = title === null ? SITE_NAME : `${title}${TITLE_SEPARATOR}${SITE_NAME}`;
  }, [title]);
}
