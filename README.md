# Overview

`react-render-recorder` captures per-commit React hook value changes and formats them for AI-assisted analysis with models like GPT, Claude, and Gemini.

Suspense updates are not supported.

## How to use

Paste the recorder script into your app before the React app runs.

```html
<script
  crossorigin="anonymous"
  src="https://unpkg.com/react-render-recorder@0.0.2/dist/react-render-recorder.js"
></script>
```

## Examples

Examples live in the `example` directory.

### Vite + React

The Vite example loads the recorder script in `index.html`.

```html
<script
  crossorigin="anonymous"
  src="https://unpkg.com/react-render-recorder@0.0.2/dist/react-render-recorder.js"
></script>
```

### Next.js App Router

In the App Router, load the recorder from the root layout with `next/script`.

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script
          crossOrigin="anonymous"
          src="https://unpkg.com/react-render-recorder@0.0.2/dist/react-render-recorder.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
```

### Next.js Pages Router

In the Pages Router, load the recorder from the custom document with `next/script`.

```jsx
import { Head, Html, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <Script
          crossOrigin="anonymous"
          src="https://unpkg.com/react-render-recorder@0.0.2/dist/react-render-recorder.js"
          strategy="beforeInteractive"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

## Notes

- Record one suspicious interaction at a time so the captured hook changes are easier to analyze.
- If the commit count is higher than expected, first check whether the same component and hook changed repeatedly in `Hook history`.
- Use the component name filter when you only want to send one part of the render flow to an AI model.
- `react-render-recorder` captures hook value changes only. It does not directly capture other re-render causes such as prop changes, parent re-renders, context changes, or memoization misses.
- This is a development tool for render analysis and debugging. Avoid shipping it in production user-facing paths.

## Experimental

- Paint grouping only works when React yields through `MessageChannel`. If React does not use `MessageChannel` for the recorded flow, paint grouping may be missing or inaccurate.
