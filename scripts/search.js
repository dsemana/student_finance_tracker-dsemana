export function compileRegex(input, flags = "i") {
  if (!input) return null;

  try {
    return new RegExp(input, flags);
  } catch (err) {
    return null;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function highlight(text, re) {
  const source = String(text ?? "");
  if (!re) return escapeHtml(source);

  try {
    const global = new RegExp(
      re.source,
      re.flags.includes("g") ? re.flags : re.flags + "g"
    );
    let result = "";
    let lastIndex = 0;
    let match = global.exec(source);

    while (match) {
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;
      result += escapeHtml(source.slice(lastIndex, start));
      result += `<mark>${escapeHtml(matchText)}</mark>`;
      if (matchText.length === 0) {
        global.lastIndex += 1;
      }
      lastIndex = end;
      match = global.exec(source);
    }

    result += escapeHtml(source.slice(lastIndex));
    return result;
  } catch {
    return escapeHtml(source);
  }
}
