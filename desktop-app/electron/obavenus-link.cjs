function createObavenusDraftUrl(prompt) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2000) {
    throw new Error("Obavenus draft prompts must contain 1 to 2000 characters.");
  }
  const url = new URL("obavenus://open");
  url.searchParams.set("source", "nexus");
  url.searchParams.set("prompt", prompt.trim());
  return url.toString();
}

module.exports = { createObavenusDraftUrl };
