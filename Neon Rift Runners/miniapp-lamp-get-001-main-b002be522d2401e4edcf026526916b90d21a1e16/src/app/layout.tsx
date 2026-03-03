import type { Metadata } from "next";
import localFont from "next/font/local";
import "@coinbase/onchainkit/styles.css";
import "./globals.css";
import { ResponseLogger } from "@/components/response-logger";
import { cookies } from "next/headers";
import { ReadyNotifier } from "@/components/ready-notifier";
import { Providers } from "./providers";
import FarcasterWrapper from "@/components/FarcasterWrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const requestId = cookieStore.get("x-request-id")?.value;

  return (
        <html lang="en">
          <head>
            {requestId && <meta name="x-request-id" content={requestId} />}
          </head>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            {/* Do not remove this component, we use it to notify the parent that the mini-app is ready */}
            <ReadyNotifier />
            <Providers>
      <FarcasterWrapper>
        {children}
      </FarcasterWrapper>
      </Providers>
            <ResponseLogger />
          </body>
        </html>
      );
}

export const metadata: Metadata = {
        title: "Neon Rift Runners",
        description: "Embark on a thrilling 2D endless runner. Navigate a glitch-filled, side-scrolling neon world with dynamic gravity. Control a cyber runner, overcome enemies, and compete on leaderboards.",
        other: { 
          "fc:frame": JSON.stringify({
            "version": "next",
            "imageUrl": "https://files.catbox.moe/rmnk96.jpg",
            "button": {
              "title": "Open with Ohara",
              "action": {
                "type": "launch_frame",
                "name": "Neon Rift Runners",
                "url": "https://lamp-get-001.app.ohara.ai",
                "splashImageUrl": "https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/farcaster/splash_images/splash_image1.svg",
                "splashBackgroundColor": "#ffffff"
              }
            }
          }),
          'base:app_id': '69623cb88a6eeb04b568dc1d',
        }
    };
