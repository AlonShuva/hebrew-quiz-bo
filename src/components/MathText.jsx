import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export default function MathText({ text }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const parts = text.split(/(\$[^$]+\$)/g);
    ref.current.innerHTML = parts.map(part => {
      if (part.startsWith("$") && part.endsWith("$")) {
        const math = part.slice(1, -1);
        try {
          return `<span style="display:inline-block; direction:ltr; unicode-bidi:embed;">
            ${katex.renderToString(math, { throwOnError: false })}
          </span>`;
        } catch {
          return part;
        }
      }
      return `<span style="direction:rtl; unicode-bidi:embed;">${part}</span>`;
    }).join("");
  }, [text]);

  return (
    <span
      ref={ref}
      style={{
        display: "inline",
        direction: "rtl",
        unicodeBidi: "embed",
        textAlign: "right",
      }}
    />
  );
}