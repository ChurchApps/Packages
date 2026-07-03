import React from "react";
import { Note } from "./Note";
import { AddNote } from "./AddNote";
import { DisplayBox, Loading } from "../";
import { Locale } from "../../helpers";
import { ConversationStore } from "../../helpers/ConversationStore";
import { SubscriptionManager } from "../../helpers/SubscriptionManager";
import { ConversationInterface, MessageInterface, UserContextInterface } from "@churchapps/helpers";
import { SubscriptionToggle, filterVisibleMessages } from "./SubscriptionToggle";

interface Props {
  conversationId: string;
  createConversation?: () => Promise<string>;
  noDisplayBox?: boolean;
  context: UserContextInterface;
  maxHeight?: any;
  refreshKey?: number;
}

export function Notes(props: Props) {
  const [messages, setMessages] = React.useState<MessageInterface[]>(null);
  const [editMessageId, setEditMessageId] = React.useState(null);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [previousMessageCount, setPreviousMessageCount] = React.useState(0);
  const churchId = props.context?.userChurch?.church?.id;
  const personId = props.context?.person?.id;

  React.useEffect(() => {
    const styleId = "notes-scrollbar-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .notes-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1);
        }
        .notes-scroll-container::-webkit-scrollbar {
          width: 12px;
          background: transparent;
        }
        .notes-scroll-container::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          margin: 4px;
        }
        .notes-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .notes-scroll-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.5);
          background-clip: content-box;
        }
        .notes-scroll-container::-webkit-scrollbar-corner {
          background: transparent;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let joined = false;

    const conversationId = props.conversationId;
    if (!conversationId) {
      setMessages([]);
      setIsInitialLoad(false);
      return;
    }

    (async () => {
      try {
        await ConversationStore.loadByConversationId(conversationId);
      } catch (err) {
        console.error("Notes.loadByConversationId failed:", err);
      }
      if (cancelled) return;

      unsubscribe = ConversationStore.subscribe(conversationId, (conv: ConversationInterface) => {
        if (cancelled) return;
        setMessages(conv?.messages ?? []);
        setEditMessageId(null);
        if (isInitialLoad) setIsInitialLoad(false);
      });

      if (churchId) {
        joined = true;
        SubscriptionManager.joinRoom(conversationId, churchId, personId).catch(() => { /* ignore */ });
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (joined && churchId) SubscriptionManager.leaveRoom(conversationId, churchId).catch(() => { /* ignore */ });
    };
  }, [props.conversationId, props.refreshKey, churchId, personId]);

  const visibleMessages = React.useMemo(() => filterVisibleMessages(messages), [messages]);

  const subscriptionToggle = (
    <SubscriptionToggle conversationId={props.conversationId} messages={messages} personId={personId} />
  );

  const getNotes = () => {
    if (!messages) return <Loading />;
    if (visibleMessages.length === 0) return <></>;
    return visibleMessages.map(m => (
      <Note message={m} key={m.id} showEditNote={setEditMessageId} context={props.context} />
    ));
  };

  const getNotesWrapper = () => {
    const notes = getNotes();
    if (props.maxHeight) {
      return (
        <div
          id="notesScroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "8px 12px",
            scrollBehavior: "smooth",
            height: "100%"
          }}
          className="notes-scroll-container"
          data-testid="message-scroll-area"
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minHeight: "min-content"
          }}>
            {notes}
          </div>
        </div>
      );
    } else return notes;
  };

  React.useEffect(() => {
    if (props.maxHeight && visibleMessages.length > 0 && !isInitialLoad) {
      const currentMessageCount = visibleMessages.length;
      if (currentMessageCount > previousMessageCount) {
        requestAnimationFrame(() => {
          const element = window?.document?.getElementById("notesScroll");
          if (element) element.scrollTop = element.scrollHeight;
        });
      }
      setPreviousMessageCount(currentMessageCount);
    } else if (visibleMessages.length > 0 && isInitialLoad) {
      setPreviousMessageCount(visibleMessages.length);
    }
  }, [visibleMessages, props.maxHeight, isInitialLoad, previousMessageCount]);

  const onLocalUpdate = () => {
    // Fallback when socket doesn't deliver; store applies broadcast, just clear edit mode.
    setEditMessageId(null);
  };

  const result = props.maxHeight ? (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minHeight: 0
    }}>
      <div style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {getNotesWrapper()}
      </div>
      {messages && (
        <div style={{
          flexShrink: 0,
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#fafafa",
          padding: "12px",
          minHeight: "auto",
          maxHeight: "200px"
        }}>
          <AddNote
            context={props.context}
            conversationId={props.conversationId}
            onUpdate={onLocalUpdate}
            createConversation={props.createConversation}
            messageId={editMessageId}
            onCancel={() => setEditMessageId(null)}
          />
        </div>
      )}
    </div>
  ) : (
    <>
      {getNotesWrapper()}
      {messages && (
        <AddNote
          context={props.context}
          conversationId={props.conversationId}
          onUpdate={onLocalUpdate}
          createConversation={props.createConversation}
          messageId={editMessageId}
          onCancel={() => setEditMessageId(null)}
        />
      )}
    </>
  );

  if (props.noDisplayBox) return result;
  return (
    <DisplayBox
      id="notesBox"
      data-testid="notes-box"
      headerIcon="sticky_note_2"
      headerText={Locale.label("notes.notes", "Notes")}
      editContent={subscriptionToggle}
    >
      {result}
    </DisplayBox>
  );
};
