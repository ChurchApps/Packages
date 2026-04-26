"use client";

import React from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const DIGITS = 6;

export const VerificationCodeInput: React.FC<Props> = ({ value, onChange, onComplete, disabled, autoFocus }) => {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => {
    const padded = (value || "").slice(0, DIGITS);
    return Array.from({ length: DIGITS }, (_, i) => padded[i] ?? "");
  }, [value]);

  React.useEffect(() => {
    if (autoFocus && inputsRef.current[0]) inputsRef.current[0].focus();
  }, [autoFocus]);

  const emitChange = (nextDigits: string[]) => {
    const next = nextDigits.join("");
    onChange(next);
    if (next.length === DIGITS && nextDigits.every((d) => d !== "") && onComplete) onComplete(next);
  };

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      emitChange(next);
      return;
    }
    const next = [...digits];
    if (cleaned.length === 1) {
      next[index] = cleaned;
      emitChange(next);
      if (index < DIGITS - 1) inputsRef.current[index + 1]?.focus();
    } else {
      for (let i = 0; i < cleaned.length && index + i < DIGITS; i++) {
        next[index + i] = cleaned[i];
      }
      emitChange(next);
      const focusAt = Math.min(index + cleaned.length, DIGITS - 1);
      inputsRef.current[focusAt]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) return;
      if (index > 0) {
        e.preventDefault();
        const next = [...digits];
        next[index - 1] = "";
        emitChange(next);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < DIGITS - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const next = Array.from({ length: DIGITS }, (_, i) => text[i] ?? "");
    emitChange(next);
    const focusAt = Math.min(text.length, DIGITS - 1);
    inputsRef.current[focusAt]?.focus();
  };

  return (
    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={DIGITS}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{
            width: "44px",
            height: "52px",
            fontSize: "24px",
            fontFamily: "monospace",
            fontWeight: 600,
            textAlign: "center",
            color: "#111827",
            backgroundColor: "white",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            outline: "none"
          }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; }}
        />
      ))}
    </div>
  );
};
