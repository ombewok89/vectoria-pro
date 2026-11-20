// Original 24 × 24 icons shared by the converter and drawing editor.
const artwork = {
  vector: '<path d="M7 17 16 6l2 12H6"/><rect x="3" y="15" width="4" height="4" rx="1"/><rect x="14" y="3" width="4" height="4" rx="1"/><rect x="17" y="16" width="4" height="4" rx="1"/>',
  layers: '<rect x="4" y="4" width="13" height="13" rx="3"/><path d="M8 20h9a3 3 0 0 0 3-3V8M8 9h5m-5 4h3"/>',
  maximize: '<path d="M13 4h7v7m0-7-7 7"/><rect x="4" y="12" width="8" height="8" rx="2"/>',
  pattern: '<path d="M3.5 7.5 7.5 3.5l4 4-4 4zM12.5 7.5l4-4 4 4-4 4zM3.5 16.5l4-4 4 4-4 4zM12.5 16.5l4-4 4 4-4 4z"/>',
  gradient: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="m4 15 10-10M5.5 19.5l14-14M10.5 20l10-10"/><path d="M15 20h2.5a3 3 0 0 0 3-3v-2.5z" fill="currentColor" stroke="none"/>',
  contrast: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17h1a1.5 1.5 0 0 0 1.3-2.25 1.5 1.5 0 0 1 1.3-2.25h2.15A2.75 2.75 0 0 0 20.5 13.25 9 9 0 0 0 12 3.5Z"/><path d="M7.4 11.5h.1m2.6-3.6h.1m4.2.3h.1m3 3.1h.1" stroke-width="2.5"/>',
  pencil: '<path d="m4 16-.6 4.6 4.6-.6L19.7 8.3a1.7 1.7 0 0 0 0-2.4l-1.6-1.6a1.7 1.7 0 0 0-2.4 0ZM13.7 6.3l4 4M4 16l4 4"/>',
  pen: '<path d="m4 20 2-9 8-6 5 5-6 8-9 2Zm0 0 5-5m5-10 2-2 5 5-2 2"/><circle cx="10.2" cy="13.8" r="1.7"/>',
  outline: '<path d="M5.4 17.5C5 11 9 6.3 17.6 6.5M6.8 17c4-1.8 8.4-2.5 11-9.2" stroke-dasharray="2.9 2.9"/><rect x="3" y="16" width="4.5" height="4.5" rx="1.1"/><rect x="16.5" y="4" width="4.5" height="4.5" rx="1.1"/>',
  spark: '<path d="M10.5 4.5c.9 4.3 2.2 5.6 6.5 6.5-4.3.9-5.6 2.2-6.5 6.5-.9-4.3-2.2-5.6-6.5-6.5 4.3-.9 5.6-2.2 6.5-6.5ZM18.5 3v5m-2.5-2.5h5m-3 11v5m-2.5-2.5h5"/>',
  upload: '<path d="M12 14V4m-3.75 3.75L12 4l3.75 3.75M4.5 13.5v4A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5v-4"/>',
  download: '<path d="M12 3.5v10.75m-3.75-3.75L12 14.25l3.75-3.75M4.5 14v3.5A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5V14"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="8.5" cy="9.2" r="1.5"/><path d="m4 16 3-2.5 2.3 1.9 4.9-4.4 6 5.6"/>',
  sliders: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2" fill="var(--icon-control-fill, white)"/><circle cx="15" cy="12" r="2" fill="var(--icon-control-fill, white)"/><circle cx="10" cy="18" r="2" fill="var(--icon-control-fill, white)"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  right: '<path d="m10 7 5 5-5 5"/>',
  zoomIn: '<circle cx="10.2" cy="10.2" r="5.7"/><path d="m14.4 14.4 4.7 4.7m-11.2-8.9h4.6m-2.3-2.3v4.6"/>',
  zoomOut: '<circle cx="10.2" cy="10.2" r="5.7"/><path d="m14.4 14.4 4.7 4.7m-11.2-8.9h4.6"/>',
  compare: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M12 3v18M7.7 10.3 6 12l1.7 1.7m8.6-3.4L18 12l-1.7 1.7"/>',
  shield: '<path d="M12 3.5 19 6v5.2c0 4.2-2.5 7.1-7 9.3-4.5-2.2-7-5.1-7-9.3V6Z"/><path d="m8.8 11.8 2.1 2.2 4.3-4.4"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.2a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.1-1.5 2.1m0 3.2h.01" />',
  close: '<path d="m6.5 6.5 11 11m0-11-11 11"/>',
  folder: '<path d="M3.5 8V6.5A2 2 0 0 1 5.5 4.5h4l2 2h6a2 2 0 0 1 2 2v.75H6A2.5 2.5 0 0 0 3.5 11.75v5a2 2 0 0 0 2 2h12.75a2 2 0 0 0 1.97-1.68l.85-5a2.5 2.5 0 0 0-2.46-2.92"/>',
  select: '<path d="M5.5 3.5v15l4.15-3.5 2.85 5.5 3-1.55-2.85-5.45h5.8z"/>',
  rect: '<rect x="4" y="5.5" width="16" height="13" rx="2.4"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6.8"/>',
  undo: '<path d="m8 5-4.5 4.5L8 14M4 9.5h10a5 5 0 0 1 0 10h-2.5"/>',
  redo: '<path d="m16 5 4.5 4.5L16 14m4-4.5H10a5 5 0 0 0 0 10h2.5"/>',
  artboard: '<rect x="6.5" y="6.5" width="11" height="11" rx="1"/><path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m13-5v4a1 1 0 0 1-1 1h-4"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9.3 4v16m5.4-16v16M4 9.3h16M4 14.7h16"/>',
  fit: '<path d="M8.5 4H6a2 2 0 0 0-2 2v2.5M15.5 4H18a2 2 0 0 1 2 2v2.5m0 7V18a2 2 0 0 1-2 2h-2.5m-7 0H6a2 2 0 0 1-2-2v-2.5"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>',
  eye: '<path d="M3 12s3.4-5.5 9-5.5 9 5.5 9 5.5-3.4 5.5-9 5.5S3 12 3 12Z"/><circle cx="12" cy="12" r="2.3"/>',
  eyeOff: '<path d="m4 4 16 16m-4.1-4.1A8 8 0 0 1 12 17.5c-5.6 0-9-5.5-9-5.5a15 15 0 0 1 3-3.2m3-1.7a8 8 0 0 1 3-.6c5.6 0 9 5.5 9 5.5a13 13 0 0 1-2.7 3"/>',
  up: '<path d="M12 19.5v-15m-4.5 4.5L12 4.5 16.5 9"/>',
  down: '<path d="M12 4.5v15m-4.5-4.5 4.5 4.5 4.5-4.5"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M16 5.5a2 2 0 0 0-2-2H6A2.5 2.5 0 0 0 3.5 6v8a2 2 0 0 0 2 2m6.5-1.5h5m-2.5-2.5v5"/>',
  trash: '<path d="M4.5 6.5h15m-11-0.5V4.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V6m-9 1.5.7 10.65a2 2 0 0 0 2 1.85h5.6a2 2 0 0 0 2-1.85l.7-10.65M10 10v6m4-6v6"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="m8.4 12 2.3 2.4 4.9-4.9"/>',
  alert: '<path d="m10.4 5.2-6.8 12A1.5 1.5 0 0 0 4.9 19h14.2a1.5 1.5 0 0 0 1.3-1.8l-6.8-12a1.8 1.8 0 0 0-3.2 0ZM12 9v3.5m0 3h.01"/>',
};

export function icon(name) {
  const shape = artwork[name];
  if (!shape) throw new Error(`Ikon tidak tersedia: ${name}`);
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${shape}</svg>`;
}

export function mountIcons(root = document) {
  for (const element of root.querySelectorAll("[data-icon]")) {
    element.insertAdjacentHTML("afterbegin", icon(element.dataset.icon));
  }
}
