import React from "react";
import { Popover, Box, Typography } from "@mui/material";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: [
      "\u{1F600}",
      "\u{1F601}",
      "\u{1F602}",
      "\u{1F603}",
      "\u{1F604}",
      "\u{1F605}",
      "\u{1F606}",
      "\u{1F609}",
      "\u{1F60A}",
      "\u{1F607}",
      "\u{1F60D}",
      "\u{1F618}",
      "\u{1F61C}",
      "\u{1F61D}",
      "\u{1F60E}",
      "\u{1F917}",
      "\u{1F914}",
      "\u{1F644}",
      "\u{1F612}",
      "\u{1F62C}",
      "\u{1F625}",
      "\u{1F622}",
      "\u{1F62D}",
      "\u{1F631}",
      "\u{1F621}",
      "\u{1F92F}",
      "\u{1F632}",
      "\u{1F634}",
      "\u{1F637}",
      "\u{1F92B}"
    ]
  },
  {
    label: "Gestures",
    emojis: [
      "\u{1F44D}",
      "\u{1F44E}",
      "\u{1F44F}",
      "\u{1F64C}",
      "\u{1F64F}",
      "\u{1F4AA}",
      "\u{270B}",
      "\u{1F44B}",
      "\u{1F91E}",
      "\u{1F44A}",
      "\u{1F91D}",
      "\u{261D}\uFE0F",
      "\u{1F446}",
      "\u{1F447}"
    ]
  },
  {
    label: "Hearts & Symbols",
    emojis: [
      "\u{2764}\uFE0F",
      "\u{1F9E1}",
      "\u{1F49B}",
      "\u{1F49A}",
      "\u{1F499}",
      "\u{1F49C}",
      "\u{2B50}",
      "\u{1F525}",
      "\u{2705}",
      "\u{274C}",
      "\u{2753}",
      "\u{1F4AF}"
    ]
  },
  {
    label: "Objects",
    emojis: [
      "\u{1F389}",
      "\u{1F388}",
      "\u{1F381}",
      "\u{1F3B5}",
      "\u{1F4E3}",
      "\u{1F4F7}",
      "\u{2615}",
      "\u{1F37D}\uFE0F",
      "\u{1F4D6}",
      "\u{1F4A1}",
      "\u{26EA}",
      "\u{1F3B6}"
    ]
  }
];

interface Props {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export const EmojiPicker: React.FC<Props> = ({ anchorEl, open, onClose, onSelect }) => {

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Box sx={{ p: 1.5, maxWidth: 320, maxHeight: 350, overflowY: "auto" }}>
        {EMOJI_CATEGORIES.map((cat) => (
          <Box key={cat.label} sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>{cat.label}</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.25 }}>
              {cat.emojis.map((emoji, i) => (
                <Box
                  key={i}
                  onClick={() => handleSelect(emoji)}
                  sx={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" }
                  }}
                >
                  {emoji}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Popover>
  );
};
