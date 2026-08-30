"use client";

import { useSearchParams } from "next/navigation";
import ConversationList from "@/components/conversations/ConversationList";
import ConversationThread from "@/components/conversations/ConversationThread";

export default function ConversationInbox() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversa")?.trim();

  if (conversationId) {
    return <ConversationThread conversationId={conversationId} />;
  }

  return <ConversationList />;
}
