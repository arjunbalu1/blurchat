'use client';

// A tiny shared counter so the chat's global Esc handler can stand down while a
// modal (e.g. the account sheet) is open — the modal owns Esc for its own
// close/cancel. Inspecting the DOM (role="dialog", focus, portals) proved
// unreliable; this is an explicit client-side signal modals opt into.
let openCount = 0;

export function openModal() {
  openCount += 1;
}

export function closeModal() {
  openCount = Math.max(0, openCount - 1);
}

export function anyModalOpen() {
  return openCount > 0;
}
