import React from "react";
import { Note } from "./Note";
import { AddNote } from "./AddNote";
import { DisplayBox, Loading } from "../";
import { ApiHelper, ArrayHelper, Locale } from "../../helpers";
import { MessageInterface, UserContextInterface } from "@churchapps/helpers";

interface Props {
  //showEditNote: (messageId?: string) => void;
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

  // Add CSS for custom scrollbar styling
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

  const loadNotes = async () => {
    try {
      const messages: MessageInterface[] = (props.conversationId) ? await ApiHelper.get("/messages/conversation/" + props.conversationId, "MessagingApi") : [];
      if (messages.length > 0) {
        const peopleIds = ArrayHelper.getIds(messages, "personId");
        const people = await ApiHelper.get("/people/basic?ids=" + peopleIds.join(","), "MembershipApi");
        messages.forEach(n => {
          n.person = ArrayHelper.getOne(people, "id", n.personId);
        });
      }
      setMessages(messages);
      setEditMessageId(null);

      // Mark as no longer initial load after first load
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error("❌ Failed to load messages for conversation:", props.conversationId, error);
      // Don't clear messages on error - keep showing existing messages
      // Only set isInitialLoad to false if this was the first load attempt
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  };

  const getNotes = () => {
    if (!messages) return <Loading />;
    if (messages.length === 0) return <></>;
    else {
      const noteArray: React.ReactNode[] = [];
      for (let i = 0; i < messages.length; i++) noteArray.push(<Note message={messages[i]} key={messages[i].id} showEditNote={setEditMessageId} context={props.context} />);
      return noteArray;
    }
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

  React.useEffect(() => { loadNotes() }, [props.conversationId, props.refreshKey]); //eslint-disable-line

  // Simply reload notes when refreshKey changes
  // This is triggered by the parent component when WebSocket messages arrive

  // Auto-scroll to bottom only when new messages are added (not on initial load)
  React.useEffect(() => {
    if (props.maxHeight && messages?.length > 0 && !isInitialLoad) {
      const currentMessageCount = messages.length;

      // Only auto-scroll if messages were added
      if (currentMessageCount > previousMessageCount) {
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
          const element = window?.document?.getElementById("notesScroll");
          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        });
      }

      setPreviousMessageCount(currentMessageCount);
    } else if (messages?.length > 0 && isInitialLoad) {
      // On initial load, just set the previous count without scrolling
      setPreviousMessageCount(messages.length);
    }
  }, [messages, props.maxHeight, isInitialLoad, previousMessageCount]);

  const result = props.maxHeight ? (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minHeight: 0
    }}>
      {/* Messages area - scrollable */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {getNotesWrapper()}
      </div>

      {/* Input area - always visible at bottom */}
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
            onUpdate={loadNotes}
            createConversation={props.createConversation}
            messageId={editMessageId}
          />
        </div>
      )}
    </div>
  ) : (
    <>
      {getNotesWrapper()}
      {messages && (<AddNote context={props.context} conversationId={props.conversationId} onUpdate={loadNotes} createConversation={props.createConversation} messageId={editMessageId} />)}
    </>
  );

  if (props.noDisplayBox) return result;
  else return (<DisplayBox id="notesBox" data-testid="notes-box" headerIcon="sticky_note_2" headerText={Locale.label("notes.notes", "Notes")}>{result}</DisplayBox>);
};
