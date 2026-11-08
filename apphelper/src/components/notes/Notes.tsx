import React from "react";
import { Note } from "./Note";
import { AddNote } from "./AddNote";
import { DisplayBox, Loading } from "../";
import { DateHelper, Locale } from "../../helpers";
import { ConversationStore } from "../../helpers/ConversationStore";
import { SubscriptionManager } from "../../helpers/SubscriptionManager";
import { ConversationInterface, MessageInterface, UserContextInterface } from "@churchapps/helpers";
import { SubscriptionToggle, filterVisibleMessages } from "./SubscriptionToggle";
import { Box, Icon, Stack, Typography } from "@mui/material";

interface Props {
  conversationId: string;
  createConversation?: () => Promise<string>;
  noDisplayBox?: boolean;
  context: UserContextInterface;
  maxHeight?: any;
  refreshKey?: number;
  // Shown only to viewers who can open the audit log: links "(edited)" and deleted-note markers to the record's note history.
  historyLink?: string;
  deletedNotes?: DeletedNoteInterface[];
}

export interface DeletedNoteInterface {
  messageId?: string;
  displayName?: string;
  timeSent?: Date | string;
  deletedAt?: Date | string;
}

const formatTime = (value?: Date | string) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : DateHelper.prettyDateTime(d);
};

// Greyed placeholder where a note was deleted. The old text stays in the audit log, never inline.
const DeletedNote: React.FC<{ note: DeletedNoteInterface; historyLink?: string }> = ({ note, historyLink }) => {
  const caption = Locale.label("notes.deletedNoteBy", "Note by {name}, {posted} · deleted {deleted}")
    .replace("{name}", note.displayName || "")
    .replace("{posted}", formatTime(note.timeSent))
    .replace("{deleted}", formatTime(note.deletedAt));
  return (
    <Box
      data-testid="deleted-note"
      sx={{ display: "flex", gap: 2, mb: 2, p: 1, borderRadius: 1, opacity: 0.7, bgcolor: "action.hover", border: "1px dashed", borderColor: "divider" }}
    >
      <Icon sx={{ color: "text.secondary", width: 32, textAlign: "center" }}>delete_outline</Icon>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">{Locale.label("notes.deletedNote", "Deleted note")}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">{caption}</Typography>
          {historyLink && (
            <Typography variant="caption" component="a" href={historyLink} color="text.secondary" sx={{ textDecoration: "underline" }} data-testid="deleted-note-history-link">
              {Locale.label("notes.viewHistory", "View history")}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

const timeOf = (value?: Date | string) => {
  const t = value ? new Date(value).getTime() : NaN;
  return isNaN(t) ? 0 : t;
};

export function Notes(props: Props) {
  const [messages, setMessages] = React.useState<MessageInterface[] | null>(null);
  const [editMessageId, setEditMessageId] = React.useState<string | null>(null);
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
    const deleted = props.deletedNotes || [];
    if (visibleMessages.length === 0 && deleted.length === 0) return <></>;
    const rows = [
      ...visibleMessages.map(m => ({ time: timeOf(m.timeSent), el: <Note message={m} key={m.id} showEditNote={(id) => setEditMessageId(id ?? null)} context={props.context} historyLink={props.historyLink} /> })),
      ...deleted.map((d, i) => ({ time: timeOf(d.timeSent), el: <DeletedNote note={d} historyLink={props.historyLink} key={"deleted-" + (d.messageId || i)} /> }))
    ];
    return rows.sort((a, b) => a.time - b.time).map(r => r.el);
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
        <Box sx={(theme) => ({
          flexShrink: 0,
          borderTop: 1,
          borderColor: "divider",
          backgroundColor: theme.palette.mode === "dark" ? "background.default" : "#fafafa",
          padding: "12px",
          minHeight: "auto",
          maxHeight: "200px"
        })}>
          <AddNote
            context={props.context}
            conversationId={props.conversationId}
            onUpdate={onLocalUpdate}
            createConversation={props.createConversation!}
            messageId={editMessageId ?? undefined}
            onCancel={() => setEditMessageId(null)}
          />
        </Box>
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
          createConversation={props.createConversation!}
          messageId={editMessageId ?? undefined}
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
