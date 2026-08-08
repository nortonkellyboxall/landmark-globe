/** Chrome — settings panel helpers. */

/**
 * @param {{
 *   settingsPanel?: HTMLElement|null,
 *   settingsBtn?: HTMLElement|null,
 * }} els
 */
export function createChrome(els) {
  function setPanelOpen(panel, btn, open) {
    if (!panel || !btn) return;
    panel.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  function closeChromeMenus() {
    setPanelOpen(els.settingsPanel, els.settingsBtn, false);
  }

  return {
    setPanelOpen,
    closeChromeMenus,
  };
}
