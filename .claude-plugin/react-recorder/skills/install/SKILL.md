---
name: install
description: Add the react-render-recorder script to a React app so `window.__REACT_RENDER_RECORDER__` is available. Use when the recorder is missing from the page, or the user asks to install or set up react-render-recorder, e.g. "recorder 설치해줘".
---

# Install

Add the recorder script so it runs before the React app does, then reload and confirm `window.__REACT_RENDER_RECORDER__` exists. It is a development tool, so tell the user where you added it and keep it out of production paths.

```html
<script
  crossorigin="anonymous"
  src="https://unpkg.com/react-render-recorder@0.3.0/dist/react-render-recorder.js"
></script>
```

- Vite or plain HTML — in `index.html` `<head>`, above the app's module script.
- Next.js App Router — in `app/layout.jsx` `<body>`, as `<Script crossOrigin="anonymous" src="…" strategy="beforeInteractive" />` from `next/script`.
- Next.js Pages Router — the same `<Script>` inside `<Head>` in `pages/_document.jsx`.
