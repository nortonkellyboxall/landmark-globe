/**
 * Whether focused control should keep Space (not fire Surprise).
 * Surprise is a page-level shortcut only when focus is on the document
 * background (body / html) or missing.
 *
 * @param {Element | null | undefined} el
 * @returns {boolean}
 */
export function focusStealsSpace(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "BODY" || tag === "HTML") return false;

  if (
    tag === "BUTTON" ||
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    tag === "A" ||
    tag === "SUMMARY"
  ) {
    return true;
  }
  if (el.isContentEditable) return true;

  const role = typeof el.getAttribute === "function" ? el.getAttribute("role") : null;
  if (
    role === "button" ||
    role === "tab" ||
    role === "switch" ||
    role === "checkbox" ||
    role === "menuitem" ||
    role === "link" ||
    role === "option" ||
    role === "radio"
  ) {
    return true;
  }
  return false;
}
