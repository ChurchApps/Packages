/** Clean HTML output from Lexical editor by removing editor-specific CSS classes and inline styles */
export function cleanHtml(html: string): string {
  if (!html) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function cleanNode(node: Element): void {
    if (node.classList) {
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

      if (node.classList.length === 0) {
        node.removeAttribute("class");
      }
    }

    const htmlElement = node as HTMLElement;
    if (htmlElement.style) {
      if (htmlElement.style.whiteSpace === "pre-wrap") {
        htmlElement.style.removeProperty("white-space");
      }

      if (htmlElement.style.length === 0) {
        htmlElement.removeAttribute("style");
      }
    }

    if (node.hasAttribute("dir") && node.getAttribute("dir") === "ltr") {
      node.removeAttribute("dir");
    }

    if (node.tagName === "LI" && node.hasAttribute("value")) {
      node.removeAttribute("value");
    }

    const children = Array.from(node.children);
    children.forEach(child => {
      cleanNode(child as Element);
    });
  }

  const body = doc.body;
  if (body) {
    const allElements = Array.from(body.getElementsByTagName("*"));
    allElements.forEach(element => {
      cleanNode(element);
    });

    return body.innerHTML;
  }

  return html;
}
