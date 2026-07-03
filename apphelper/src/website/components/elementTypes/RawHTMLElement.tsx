"use client";
import { useEffect } from "react";
import { ElementInterface, SectionInterface } from "../../helpers";

interface Props {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void
}

export const RawHTMLElement = ({ element, onEdit }: Props) => {

  const emptyStyle = { minHeight: 50 };

  const insertJavascript = () => {
    if (window && element.answers.javascript) {
      // Skip HTML markup start-tags to avoid SyntaxError in Sentry appendChild errors.
      if (element.answers.javascript.trim().startsWith("<")) return;
      try {
        const script = document.createElement("script");
        script.id = "script-" + element.id;
        script.innerHTML = element.answers.javascript;
        const existing = document.getElementById(script.id);
        if (existing) existing.innerHTML = script.innerHTML;
        else document.body.appendChild(script);
      } catch {
        /* swallow inline-script parse/insert failures from user-pasted content */
      }
    }
  };

  useEffect(insertJavascript, [element.answers.javascript]);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: element.answers.rawHTML || "" }} style={(!onEdit ? {} : emptyStyle)} />
    </>
  );
};
