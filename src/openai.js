const API_URL = "https://api.openai.com/v1/responses";

export class OpenAIChat {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async reply({ input, previousResponseId, mode = "normal", signal }) {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY saknas pa servern.");
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
      const message = data?.error?.message || `OpenAI API svarade ${response.status}`;
      throw new Error(message);
    }

    return {
      id: data.id,
      text: extractOutputText(data),
    };
  }
}

function buildInstructions(mode) {
  const lengthHint = {
    short: "Svara mycket kort, helst under 6 rader.",
    normal: "Svara koncist men anvandbart.",
    long: "Du far ge ett langre svar nar det hjalper.",
  }[mode] || "Svara koncist men anvandbart.";

  return [
    "Du ar ChatGPT/64, en assistent som pratar med en C64 eller C128 via terminal.",
    "Svara pa svenska om anvandaren skriver svenska.",
    "Anvand enkel plain text utan markdown-tabeller.",
    "Undvik Unicode-symboler, emoji och typografiska citattecken.",
    "Hall rader och stycken terminalvanliga.",
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

  return parts.join("\n").trim() || "(tomt svar)";
}

