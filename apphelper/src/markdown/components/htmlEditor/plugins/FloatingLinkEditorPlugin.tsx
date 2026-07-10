import { useCallback, useEffect, useRef, useState } from "react";
import { $getSelection, $isRangeSelection, SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_LOW } from "lexical";
import { $isLinkNode, LinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { createPortal } from "react-dom";
import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Button, Checkbox, FormControlLabel, Typography, Divider } from "@mui/material";
import { Check, Link as LinkIcon } from "@mui/icons-material";
import { TOGGLE_CUSTOM_LINK_NODE_COMMAND } from "./customLink/CustomLinkNode";

interface Props {
  anchorElem: HTMLElement;
  isLinkEditMode: boolean;
  setIsLinkEditMode: (value: boolean) => void;
}

export default function FloatingLinkEditorPlugin({ anchorElem, isLinkEditMode, setIsLinkEditMode }: Props) {
  const [editor] = useLexicalComposerContext();
  const [linkUrl, setLinkUrl] = useState("https://");
  const [classNamesList, setClassNamesList] = useState<Array<string>>(["", "btn-primary", "btn-medium"]);
  const [targetAttribute, setTargetAttribute] = useState<string>("_self");
  const [isEditingLink, setIsEditingLink] = useState(false);
  const linkEditorRef = useRef<HTMLDivElement>(null);
  const currentLinkNodeKey = useRef<string | null>(null);

  const updateLinkEditor = useCallback(() => {
    // Don't update if we're already in link edit mode
    if (isLinkEditMode) {
      return;
    }

    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        setLinkUrl(parent.getURL());
        setIsEditingLink(true);
      } else if ($isLinkNode(node)) {
        setLinkUrl(node.getURL());
        setIsEditingLink(true);
      } else {
        setIsEditingLink(false);
        setLinkUrl("https://");
      }
    }
  }, [isLinkEditMode]);

  useEffect(() => {
    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "A" || target.closest("a")) {
        e.preventDefault();
        const linkElement = (target.tagName === "A" ? target : target.closest("a")) as HTMLAnchorElement;

        editor.update(() => {
          // Find the link node from the DOM element
          const linkNodes = editor._editorState._nodeMap;
          let foundLinkNode: LinkNode | null = null;

          linkNodes.forEach((node: any) => {
            if ($isLinkNode(node)) {
              const domElement = editor.getElementByKey(node.__key);
              if (domElement === linkElement) {
                foundLinkNode = node;
              }
            }
          });

          const resolvedLinkNode = foundLinkNode as LinkNode | null;
          if (resolvedLinkNode) {
            // Store the link node key for later use
            currentLinkNodeKey.current = resolvedLinkNode.__key;

            // Select the entire link node
            resolvedLinkNode.select();

            // Get link attributes
            const url = resolvedLinkNode.getURL();
            const target = resolvedLinkNode.getTarget();

            // Extract class names from the DOM element
            const classes = Array.from(linkElement.classList);

            // Determine the proper class list structure
            let newClassList = ["", "btn-primary", "btn-medium"];

            if (classes.length > 0) {
              // Check if it's a button by looking for btn class or btn-* classes
              const hasBtn = classes.includes("btn");
              const hasBtnBlock = classes.includes("btn-block");

              // Look for appearance class (first position)
              let appearanceClass = "";
              if (hasBtn && hasBtnBlock) {
                appearanceClass = "btn btn-block";
              } else if (hasBtn) {
                appearanceClass = "btn";
              }

              // Look for variant class (second position)
              const variantClass = classes.find(c =>
                c.startsWith("btn-") &&
                c !== "btn-block" &&
                !c.match(/btn-(small|medium|large|xl|2x|3x|4x)$/i)) || "btn-primary";

              // Look for size class (third position)
              const sizeClass = classes.find(c =>
                c.match(/btn-(small|medium|large|xl|2x|3x|4x)$/i)) || "btn-medium";

              newClassList = [
                appearanceClass,
                variantClass,
                sizeClass
              ];
            }

            setLinkUrl(url || "https://");
            setTargetAttribute(target || "_self");
            setClassNamesList(newClassList);
            setIsLinkEditMode(true);
          }
        });
      }
    };

    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener("dblclick", handleDoubleClick);
    }

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateLinkEditor();
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      () => {
        if (rootElement) {
          rootElement.removeEventListener("dblclick", handleDoubleClick);
        }
      }
    );
  }, [editor, updateLinkEditor, setIsLinkEditMode, setLinkUrl, setTargetAttribute, setClassNamesList]);

  const handleLinkSubmit = () => {
    const appearance = classNamesList[0];
    const classes = [] as string[];
    if (appearance && appearance.length > 0) {
      classes.push(appearance);
      classes.push(classNamesList[1]);
      classes.push(classNamesList[2]);
    }

    // Update the specific link node directly using its stored key
    if (currentLinkNodeKey.current) {
      editor.update(() => {
        const lexicalNode = editor._editorState._nodeMap.get(currentLinkNodeKey.current!);

        if (lexicalNode && $isLinkNode(lexicalNode)) {
          // Get a writable version of the node
          const writableNode = lexicalNode.getWritable() as any;

          // Update the node's properties using the writable node
          writableNode.__url = linkUrl;
          writableNode.__target = targetAttribute;
          writableNode.__classNames = classes;

          // Manually update the DOM element since updateDOM returns false
          const domElement = editor.getElementByKey(currentLinkNodeKey.current!);
          if (domElement && domElement instanceof HTMLAnchorElement) {
            domElement.href = linkUrl;
            domElement.target = targetAttribute;
            domElement.className = classes.join(" ");
          }
        }
      });
    } else {
      // Creating a new link - dispatch the command to wrap selected text
      editor.dispatchCommand(TOGGLE_CUSTOM_LINK_NODE_COMMAND, {
        url: linkUrl,
        classNames: classes,
        target: targetAttribute
      });
    }

    setIsLinkEditMode(false);
    setIsEditingLink(false);
    currentLinkNodeKey.current = null;
  };

  const handleCancel = () => {
    setIsLinkEditMode(false);
    setIsEditingLink(false);
    setLinkUrl("");
    currentLinkNodeKey.current = null;
  };

  if (!isLinkEditMode) return null;

  const variants = [
    "Light",
    "Light Accent",
    "Accent",
    "Dark Accent",
    "Dark",
    "Transparent Light",
    "Transparent Light Accent",
    "Transparent Accent",
    "Transparent Dark Accent",
    "Transparent Dark",
    "Primary",
    "Secondary",
    "Success",
    "Danger",
    "Warning",
    "Info"
  ];
  const sizes = ["Small", "Medium", "Large", "XL", "2X", "3X", "4X"];
  let appearance = "link";
  if (classNamesList[0]?.indexOf("btn") > -1) appearance = "btn";
  if (classNamesList[0]?.indexOf("btn-block") > -1) appearance = "btn btn-block";

  const getVariantKeyName = (variant: string) => {
    const keyNameParts = variant.split(" ");
    keyNameParts[0] = keyNameParts[0].toLowerCase();
    return keyNameParts.join("");
  };

  const getVariantItems = () => {
    const result: React.ReactElement[] = [];
    variants.forEach((variant: string, idx: number) => {
      result.push(
        <MenuItem key={appearance + " btn-" + getVariantKeyName(variant)} value={"btn-" + getVariantKeyName(variant)}>
          {variant}
        </MenuItem>
      );
      if (idx === 4 || idx === 9) result.push(<MenuItem disabled>──────────</MenuItem>);
    });
    return result;
  };

  return createPortal(
    <>
      <Box
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCancel();
          }
        }}
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1499
        }}
      />
      <Box
        ref={linkEditorRef}
        sx={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 2,
          boxShadow: "0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)",
          minWidth: 420,
          maxWidth: 500,
          zIndex: 1500
        }}
      >
        <Box sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <LinkIcon color="primary" />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Edit Link
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              size="small"
              fullWidth
              placeholder="https://example.com"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Appearance</InputLabel>
              <Select
                name="classNames"
                fullWidth
                label="Appearance"
                size="small"
                value={appearance}
                onChange={(e) => {
                  let className = "";
                  if (e.target.value.toString() !== "link") className = e.target.value.toString();
                  setClassNamesList([className, "btn-primary", "btn-medium"]);
                }}
                MenuProps={{
                  slotProps: {
                    paper: { sx: { zIndex: 9999 } },
                    root: { sx: { zIndex: 9999 } }
                  },
                  style: { zIndex: 9999 }
                }}
              >
                <MenuItem value="link">Standard Link</MenuItem>
                <MenuItem value="btn">Button</MenuItem>
                <MenuItem value="btn btn-block">Full Width Button</MenuItem>
              </Select>
            </FormControl>

            {appearance !== "link" && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Variant</InputLabel>
                  <Select
                    name="classNames"
                    fullWidth
                    label="Variant"
                    size="small"
                    value={classNamesList[1]}
                    onChange={(e) => {
                      const newArray = [...classNamesList];
                      let index = 0;
                      newArray.forEach((item, i) => {
                        variants.forEach((element) => {
                          if (item.includes(getVariantKeyName(element))) {
                            index = i;
                          }
                        });
                      });
                      newArray.splice(index, 1, e.target.value.toString());
                      setClassNamesList(newArray);
                    }}
                    MenuProps={{
                      slotProps: {
                        paper: { sx: { zIndex: 9999 } },
                        root: { sx: { zIndex: 9999 } }
                      },
                      style: { zIndex: 9999 }
                    }}
                  >
                    {getVariantItems()}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Size</InputLabel>
                  <Select
                    name="classNames"
                    fullWidth
                    label="Size"
                    size="small"
                    value={classNamesList[2]}
                    onChange={(e) => {
                      const newArray = [...classNamesList];
                      let index = 0;
                      newArray.forEach((item, i) => {
                        sizes.forEach((element) => {
                          if (item.includes(element.toLowerCase())) {
                            index = i;
                          }
                        });
                      });
                      newArray.splice(index, 1, e.target.value.toString());
                      setClassNamesList(newArray);
                    }}
                    MenuProps={{
                      slotProps: {
                        paper: { sx: { zIndex: 9999 } },
                        root: { sx: { zIndex: 9999 } }
                      },
                      style: { zIndex: 9999 }
                    }}
                  >
                    {sizes.map((optionValue: string) => (
                      <MenuItem key={appearance + " btn-" + optionValue.toLowerCase()} value={"btn-" + optionValue.toLowerCase()}>
                        {optionValue}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={targetAttribute === "_blank"}
                  onChange={() => setTargetAttribute((v) => (v === "_blank" ? "_self" : "_blank"))}
                  size="small"
                />
              }
              label="Open in new window"
              sx={{ mt: -0.5 }}
            />
          </Box>
        </Box>

        <Divider />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, p: 2 }}>
          <Button onClick={handleCancel} variant="outlined" size="medium">
            Cancel
          </Button>
          <Button onClick={handleLinkSubmit} variant="contained" color="primary" size="medium" startIcon={<Check />}>
            Save
          </Button>
        </Box>
      </Box>
    </>,
    document.body
  );
}
