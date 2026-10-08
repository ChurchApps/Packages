"use client";
import { useEffect, useRef } from "react";
import { ElementInterface, SectionInterface } from "../../helpers";

interface Props {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void
}

const recreatedScripts = new WeakSet<Node>();

// innerHTML-inserted scripts never execute; recreate them so they do.
// CSP script-src 'strict-dynamic' trusts these non-parser-inserted nodes.
const recreateScripts = (root: HTMLElement) => {
  root.querySelectorAll("script").forEach((old) => {
    if (recreatedScripts.has(old)) return;
    try {
      const script = document.createElement("script");
      Array.from(old.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
      script.text = old.text;
      recreatedScripts.add(script);
      old.replaceWith(script);
    } catch {
      /* swallow inline-script parse/insert failures from user-pasted content */
    }
  });
};

export const RawHTMLElement = ({ element, onEdit }: Props) => {

  const emptyStyle = { minHeight: 50 };
  const htmlRef = useRef<HTMLDivElement>(null);
  const jsRef = useRef<HTMLDivElement>(null);
  const javascript: string = element.answers.javascript || "";
  const isMarkup = javascript.trim().startsWith("<");

  const insertJavascript = () => {
    if (window && javascript) {
      // Vendor snippets come wrapped in <script> tags; parse them as markup instead of code.
      if (isMarkup) {
        if (!jsRef.current) return;
        const template = document.createElement("template");
        template.innerHTML = javascript;
        jsRef.current.replaceChildren(template.content);
        recreateScripts(jsRef.current);
        return;
      }
      try {
        const script = document.createElement("script");
        script.id = "script-" + element.id;
        script.innerHTML = javascript;
        const existing = document.getElementById(script.id);
        if (existing) existing.innerHTML = script.innerHTML;
        else document.body.appendChild(script);
      } catch {
        /* swallow inline-script parse/insert failures from user-pasted content */
      }
    }
  };

  useEffect(insertJavascript, [javascript]);

  useEffect(() => {
    if (htmlRef.current) recreateScripts(htmlRef.current);
  }, [element.answers.rawHTML]);

  return (
    <>
      <div ref={htmlRef} dangerouslySetInnerHTML={{ __html: element.answers.rawHTML || "" }} style={(!onEdit ? {} : emptyStyle)} />
      {isMarkup && <div ref={jsRef} id={"script-" + element.id} />}
    </>
  );
};
