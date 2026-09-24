export function initialFlashboltView(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const route = parts.slice(parts.indexOf("flashbolt") + 1);
  if (!route.length) return "home";
  const last = route.at(-1);
  if (last === "edit" || last === "create") return "create";
  if (last === "flashcards") return "set";
  if (last === "learn" || last === "test" || last === "helper") return last;
  if (route.length === 1 && (last === "home" || last === "review" || last === "folders" || last === "guide")) return last;
  return "library";
}
