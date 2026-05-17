const API_URL = "https://api.openai.com/v1/responses";

export class OpenAIChat {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async reply({ input, previousResponseId, mode = "short", signal }) {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is missing.");
    }

    const body = {
      model: this.model,
      instructions: buildInstructions(mode),
      input,
      store: true,
    };

    if (previousResponseId) {
      body.previous_response_id = previousResponseId;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || `OpenAI API returned ${response.status}`;
      throw new Error(message);
    }

    return {
      id: data.id,
      text: extractOutputText(data),
    };
  }
}

export function buildInstructions(mode) {
  const lengthHint = {
    short: "Keep replies very short: ideally 3-6 lines, max 8 short lines. If more is needed, ask whether the user wants more.",
    normal: "Keep replies concise: max 10-12 short lines unless the user explicitly asks for more.",
    long: "You may give a longer reply, but keep it terminal-friendly.",
  }[mode] || "Keep replies very short: ideally 3-6 lines, max 8 short lines.";

  return [
    "You are ChatGPT/64, an assistant talking to a C64, C128, Amiga, or plain terminal client.",
    "The terminal may have no scrollback, so long replies can disappear from the screen.",
    "Reply in the user's language.",
    "Use simple plain text without markdown tables.",
    "Avoid Unicode symbols, emoji, and typographic quotation marks.",
    "Avoid filler, repetition, and long introductions.",
    "Keep lines and paragraphs terminal-friendly.",
    lengthHint,
  ].join(" ");
}

export function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim() || "(empty response)";
}
