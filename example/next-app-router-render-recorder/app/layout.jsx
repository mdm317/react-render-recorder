import Script from "next/script";

import "./globals.css";

export const metadata = {
  title: "Next.js App Router Recorder Example",
  description: "App Router example for react-render-recorder",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script
          crossOrigin="anonymous"
          src="https://unpkg.com/react-render-recorder@0.0.4/dist/react-render-recorder.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
