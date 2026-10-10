/** Keep keyboard navigation inside the active modal, including before choices appear. */
export function trapTab(root: HTMLElement, e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  const controls = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
    .filter(x => x.getClientRects().length > 0);
  const first = controls[0], last = controls[controls.length - 1];
  if (!first || !last) { e.preventDefault(); root.focus({ preventScroll: true }); }
  else if (!root.contains(document.activeElement) || document.activeElement === root) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  e.stopPropagation();
}
