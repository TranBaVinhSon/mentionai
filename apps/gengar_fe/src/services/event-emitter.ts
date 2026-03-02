import mitt from "mitt";
import { useEffect } from "react";

export const emitter = mitt();

export enum EventTypes {
  NEW_CHAT = "new-chat",
  SET_EDITOR_CONTENT = "set-editor-content",
}

export function useEventListener(
  type: EventTypes,
  handler: (payload?: any) => void
) {
  useEffect(() => {
    emitter.on(type, handler);
    return () => {
      emitter.off(type, handler);
    };
  }, [type, handler]);
}
