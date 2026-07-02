"use client";

import React, { useEffect, useRef, useState } from "react";
import { ElementInterface, SectionInterface } from "../../helpers";

interface Quote { text: string; author: string; role?: string; photoUrl?: string; }

interface Props {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const QuoteCard = ({ quote }: { quote: Quote }) => (
  <blockquote className="testimonial-quote" style={{ margin: 0, textAlign: "center" }}>
    <p className="testimonial-text">{quote.text}</p>
    <footer className="testimonial-author">
      {quote.photoUrl && <img src={quote.photoUrl} alt={quote.author || ""} className="testimonial-photo" loading="lazy" decoding="async" />}
      <cite className="testimonial-name">{quote.author}</cite>
      {quote.role && <span className="testimonial-role">{quote.role}</span>}
    </footer>
  </blockquote>
);

export const TestimonialElement = ({ element, onEdit }: Props) => {
  const quotes: Quote[] = Array.isArray(element.answers?.quotes) ? element.answers.quotes : [];
  const rotate = element.answers?.displayMode === "rotate" && quotes.length > 1;
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const reduce = useRef(false);

  useEffect(() => { reduce.current = prefersReducedMotion(); }, []);

  useEffect(() => {
    if (!rotate) return;
    const interval = setInterval(() => {
      if (reduce.current) { setIndex((i) => (i + 1) % quotes.length); return; }
      setFade(false);
      setTimeout(() => { setIndex((i) => (i + 1) % quotes.length); setFade(true); }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, [rotate, quotes.length]);

  if (quotes.length === 0) {
    if (onEdit) return <div className="testimonial-empty">Testimonial: add quotes to get started</div>;
    return null;
  }

  if (rotate) {
    return (
      <div id={"el-" + element.id} className="testimonial">
        <div style={{ opacity: fade ? 1 : 0, transition: "opacity 0.4s ease" }}>
          <QuoteCard quote={quotes[index]} />
        </div>
      </div>
    );
  }

  return (
    <div id={"el-" + element.id} className="testimonial">
      {quotes.map((quote, i) => <QuoteCard key={i} quote={quote} />)}
    </div>
  );
};
