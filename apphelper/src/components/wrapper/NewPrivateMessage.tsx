"use client";

import {
  Button,
  TextField,
  Paper,
  Box,
  Typography,
  Stack,
  IconButton,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  InputAdornment,
  Divider,
  Skeleton
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  PersonSearch as PersonSearchIcon
} from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { ApiHelper, Locale } from "../../helpers";
import { ConversationInterface, PersonInterface, PrivateMessageInterface, UserContextInterface } from "@churchapps/helpers";
import { AddNote } from "../notes/AddNote";
import { PersonAvatar } from "../PersonAvatar";

interface Props {
  context: UserContextInterface;
  onSelectMessage: (pm: PrivateMessageInterface) => void
  onBack: () => void
  selectedPerson?: PersonInterface
}

export const NewPrivateMessage: React.FC<Props> = (props) => {

  const [searchText, setSearchText] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [selectedPerson, setSelectedPerson] = React.useState<PersonInterface>(null);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.currentTarget.value);
  };

  /*
    const handleKeyDown = (e: React.KeyboardEvent<any>) => {
      //if (e.key === "Enter") { e.preventDefault(); handleSubmit(null); }
    }
  */

  const handlePersonSelected = async (person: PersonInterface) => {
    try {
      const existing: PrivateMessageInterface = await ApiHelper.get("/privateMessages/existing/" + person.id, "MessagingApi");
      if (existing?.id) {
        existing.person = person;
        props.onSelectMessage(existing);
        return;
      }
    } catch (error) {
      // No existing conversation found, continue to create new one
    }
    setSelectedPerson(person);
  };


  const handleNoteAdded = () => {
    handlePersonSelected(selectedPerson);
  };

  const createConversation = async () => {
    const conv: ConversationInterface = { allowAnonymousPosts: false, contentType: "privateMessage", contentId: props.context.person.id, title: props.context.person.name.display + " " + Locale.label("wrapper.privateMessage", "Private Message"), visibility: "hidden" };
    const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");

    const pm: PrivateMessageInterface = {
      fromPersonId: props.context.person.id,
      toPersonId: selectedPerson.id,
      conversationId: result[0].id
    };
    const privateMessages: PrivateMessageInterface[] = await ApiHelper.post("/privateMessages", [pm], "MessagingApi");
    return privateMessages[0].conversationId;
  };


  useEffect(() => {
    if (props.selectedPerson) handlePersonSelected(props.selectedPerson);
  }, [props.selectedPerson]);


  const [isSearching, setIsSearching] = useState(false);

  const handleSearchSubmit = async (e: React.MouseEvent) => {
    if (e !== null) e.preventDefault();
    if (!searchText.trim()) return;

    setIsSearching(true);
    const term = escape(searchText.trim());
    const data = await ApiHelper.get("/people/search?term=" + term, "MembershipApi");
    setSearchResults(data);
    setIsSearching(false);
  };

  if (!selectedPerson) {
    return (
      <Paper elevation={0} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={props.onBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="h2">
              {Locale.label("wrapper.newPrivateMessage", "New Private Message")}
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="body1" color="textSecondary" gutterBottom>
                {Locale.label("wrapper.searchForPerson", "Search for a person to message")}
              </Typography>
              <TextField
                fullWidth
                placeholder="Search by name..."
                id="searchText"
                data-testid="search-input"
                value={searchText}
                onChange={handleChange}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") handleSearchSubmit(null);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonSearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSearchSubmit}
                        disabled={!searchText.trim() || isSearching}
                      >
                        {Locale.label("common.search", "Search")}
                      </Button>
                    </InputAdornment>
                  )
                }}
                sx={{ mt: 1 }}
              />
            </Box>

            {isSearching && (
              <Box>
                {[...Array(3)].map((_, index) => (
                  <Box key={`skeleton-${index}`} sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                    <Skeleton variant="text" width="60%" height={24} />
                  </Box>
                ))}
              </Box>
            )}

            {!isSearching && searchResults.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  {searchResults.length} {searchResults.length === 1 ? "person" : "people"} found
                </Typography>
                <List sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
                  {searchResults.map((person, index) => (
                    <React.Fragment key={person.id}>
                      <ListItemButton
                        onClick={() => handlePersonSelected(person)}
                        sx={{ py: 2 }}
                      >
                        <ListItemAvatar>
                          <PersonAvatar person={person} size="small" />
                        </ListItemAvatar>
                        <ListItemText
                          primary={person.name.display}
                          secondary={person.contactInfo?.email || ""}
                        />
                      </ListItemButton>
                      {index < searchResults.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}

            {!isSearching && searchText && searchResults.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <PersonSearchIcon sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                No people found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                Try searching with a different name
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      </Paper>
    );
  } else {
    return (
      <Paper elevation={0} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={props.onBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="h2">
              {Locale.label("wrapper.newPrivateMessage", "New Private Message")}
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <PersonAvatar person={selectedPerson} size="medium" />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {selectedPerson.name.display}
              </Typography>
              {selectedPerson.contactInfo?.email && (
                <Typography variant="body2" color="textSecondary">
                  {selectedPerson.contactInfo.email}
                </Typography>
              )}
            </Box>
          </Stack>
          <Divider sx={{ mb: 3 }} />
          <AddNote
            context={props.context}
            conversationId={null}
            onUpdate={handleNoteAdded}
            createConversation={createConversation}
          />
        </Box>
      </Paper>
    );
  }
};
