/**
 * Utility function to clean HTML output from Lexical editor
 * Removes editor-specific CSS classes and inline styles to produce clean HTML
 */

export function cleanHtml(html: string): string {
  if (!html) return html;

  // Create a DOM parser to parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Function to recursively clean nodes
  function cleanNode(node: Element): void {
    // Remove all editor-specific CSS classes
    if (node.classList) {
      // Remove all classes that start with "editor-"
      const classesToRemove: string[] = [];
      for (let i = 0; i < node.classList.length; i++) {
        const className = node.classList[i];
        if (className.startsWith("editor-")) {
          classesToRemove.push(className);
        }
      }
      classesToRemove.forEach(className => {
        node.classList.remove(className);
      });

      // If no classes remain, remove the class attribute entirely
      if (node.classList.length === 0) {
        node.removeAttribute("class");
      }
    }

    // Remove specific inline styles that are commonly added by Lexical
    const htmlElement = node as HTMLElement;
    if (htmlElement.style) {
      // Remove white-space: pre-wrap which is commonly added
      if (htmlElement.style.whiteSpace === "pre-wrap") {
        htmlElement.style.removeProperty("white-space");
      }

      // If no style properties remain, remove the style attribute entirely
      if (htmlElement.style.length === 0) {
        htmlElement.removeAttribute("style");
      }
    }

    // Remove unnecessary attributes
    if (node.hasAttribute("dir") && node.getAttribute("dir") === "ltr") {
      node.removeAttribute("dir");
    }

    // Remove value attribute from list items (used by Lexical for ordering)
    if (node.tagName === "LI" && node.hasAttribute("value")) {
      node.removeAttribute("value");
    }

    // Process child elements
    const children = Array.from(node.children);
    children.forEach(child => {
      cleanNode(child as Element);
    });
  }

  // Clean all elements in the body
  const body = doc.body;
  if (body) {
    const allElements = Array.from(body.getElementsByTagName("*"));
    allElements.forEach(element => {
      cleanNode(element);
    });

    // Return only the innerHTML of the body
    return body.innerHTML;
  }

  return html;
}
