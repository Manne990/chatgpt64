const TRANSLITERATIONS = new Map([
  ["å", "a"],
  ["ä", "a"],
  ["ö", "o"],
  ["Å", "A"],
  ["Ä", "A"],
  ["Ö", "O"],
  ["é", "e"],
  ["è", "e"],
  ["ü", "u"],
  ["’", "'"],
  ["‘", "'"],
  ["“", "\""],
  ["”", "\""],
  ["–", "-"],
  ["—", "-"],
  ["…", "..."],
]);

export function toTerminalText(value, { asciiOnly = true } = {}) {
  let text = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (!asciiOnly) {
    return text;
  }

  let output = "";
  for (const char of text) {
    if (TRANSLITERATIONS.has(char)) {
      output += TRANSLITERATIONS.get(char);
      continue;
    }

    const code = char.codePointAt(0);
    if (code === 10 || code === 9 || (code >= 32 && code <= 126)) {
      output += char;
    }
  }

  return output;
}

export function wrapText(value, width = 40) {
  const safeWidth = Math.max(1, width);
  const text = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = [];

  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      if (word.length > safeWidth) {
        if (current) {
          lines.push(current);
          current = "";
        }

        for (let index = 0; index < word.length; index += safeWidth) {
          lines.push(word.slice(index, index + safeWidth));
        }
        continue;
      }

      const next = current ? `${current} ${word}` : word;
      if (next.length > safeWidth) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines.join("\r\n");
}

export function crlf(value = "") {
  return String(value).replace(/\r?\n/g, "\r\n");
}
