import type { TextMatchTransformer } from "@lexical/markdown";
import { TextNode, $createTextNode, $isTextNode } from "lexical";

import {
  $isCustomLinkNode,
  CustomLinkNode,
  $createCustomLinkNode
} from "./CustomLinkNode";
import {
  EmojiNode,
  $createEmojiNode
} from "../emoji/EmojiNode";

import iconNamesList from "../../IconNamesList";

const CUSTOM_LINK_NODE_MARKDOWN_REGEX_QUERY = /(?:\[([^[]+?)\])(?:\(([^(]+)\))(?:({([^}]*)})?)(?:((.*)\)?))$/;

const CUSTOM_LINK_NODE_MARKDOWN_REGEX = new RegExp(CUSTOM_LINK_NODE_MARKDOWN_REGEX_QUERY);

const replaceCustomLinkNode = (textNode : TextNode, match : any) => {
  const linkUrl = match[2];
  let linkText = match[1];
  if (match.input.length > match.input.trim().length) {
    linkText = " ".repeat(match.input.length - match.input.trim().length) + linkText;
  }
  const otherText = match[5];


  const linkNode = $createCustomLinkNode(
    linkUrl,
    match[4] ? (match[4].includes("_self") || match[4].includes("\\_self") ? "_self" : "_blank") : "_blank",
    match[4]
      ? match[4]
        .split(" ")
        .filter((word: string) => word[0] === ".")
        .map((word: string) => word.replace(".", ""))
      : []
  );

  const linkTextNode = $createTextNode(linkText);
  linkTextNode.setFormat(textNode.getFormat());

  linkNode.append(linkTextNode);
  textNode.replace(linkNode);

  const emojiText = otherText.replace(CUSTOM_LINK_NODE_MARKDOWN_REGEX, "").trim();





  if (match[5]) {
    const otherTextNode = $createTextNode(match[5].replace(CUSTOM_LINK_NODE_MARKDOWN_REGEX, ""));

    linkNode.getParent()?.append(otherTextNode);
  }


  if (CUSTOM_LINK_NODE_MARKDOWN_REGEX.test(match[5])) {
    const blankNode = $createTextNode("");

    linkNode.getParent()?.append(blankNode);

    replaceCustomLinkNode(blankNode, match[5].match(CUSTOM_LINK_NODE_MARKDOWN_REGEX_QUERY));
  }

  if (emojiText) {
    if (!iconNamesList.includes(emojiText.replaceAll(":", ""))) return;

    linkNode.getParent()?.append($createEmojiNode(emojiText.replaceAll(":", "")));
  }
};

export const CUSTOM_LINK_NODE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [EmojiNode, CustomLinkNode],
  export: (node, _exportChildren, exportFormat) => {
    if (!$isCustomLinkNode(node)) {
      return null;
    }

    // Only include target attribute if it's not "_self" (which is the default)
    const targetAttr = node.__target && node.__target !== "_self" ? `target="${node.__target}"` : "";
    const classNames = node
      ?.__classNames
      ?.join(" ")
      .split(" ")
      .map((className: string) => "." + className.replaceAll(".", ""))
      .join(" ");

    // Build the attribute string, filtering out empty values
    const attributes = [targetAttr, classNames].filter(attr => attr.trim() !== "").join(" ");

    // For links with attributes, we need to handle the export differently to prevent underscore escaping
    if (attributes) {
      const linkText = node.getTextContent();
      const firstChild = node.getFirstChild();

      // Format the text content with markdown formatting (bold, italic, etc.)
      let formattedText = linkText;
      if (node.getChildrenSize() === 1 && $isTextNode(firstChild)) {
        // Get the formatted text by using the actual link content
        const linkContent = `[${linkText}](${node.__url})`;
        const formatted = exportFormat(firstChild, linkContent);
        // Extract just the text part from the formatted link markdown
        const linkMatch = formatted.match(/^\[([^\]]+)\]/);
        if (linkMatch) {
          formattedText = linkMatch[1];
        }
      }

      // Return the link with attributes - these won't go through exportFormat to avoid escaping
      return `[${formattedText}](${node.__url}){:${attributes}}`;
    }

    // For simple links without attributes, use the standard format
    const linkContent = `[${node.getTextContent()}](${node.__url})`;
    const firstChild = node.getFirstChild();

    if (node.getChildrenSize() === 1 && $isTextNode(firstChild)) {
      return exportFormat(firstChild, linkContent);
    } else {
      return linkContent;

    }
  },
  importRegExp: CUSTOM_LINK_NODE_MARKDOWN_REGEX,
  regExp: CUSTOM_LINK_NODE_MARKDOWN_REGEX,
  replace: replaceCustomLinkNode,
  trigger: "[",
  type: "text-match"
};
