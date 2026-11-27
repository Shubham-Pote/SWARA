export const messageLimit = 2000;

export function appendToDraft(draft: string, suggestion: string) {
  const text = draft.trim() ? `${draft}\n\n${suggestion}` : suggestion;
  return text.length <= messageLimit ? text : null;
}
