# Next.js App Router Example

Minimal App Router app for checking `react-render-recorder` in a Next.js project.

```sh
pnpm install --ignore-workspace
pnpm dev
```

Open `http://localhost:3000` and use the buttons to create React commits. The recorder script is loaded in `app/layout.jsx` with `next/script` and `strategy="beforeInteractive"`.
