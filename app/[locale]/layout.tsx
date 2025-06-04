import "@/app/globals.css";
import { routing } from "@/app/i18n/routing";
import SessionProviderWrapper from "@/components/auth/session-provider-wrapper";
import { TokenRefreshHandler } from "@/components/token-refresh-handler";
import { ThemeProvider } from "@/components/ui/providers/theme-provider";
import { Providers } from "@/lib/providers/providers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Roboto, Roboto_Mono } from "next/font/google";
import { notFound } from "next/navigation";

const robotoSans = Roboto({
  variable: "--font-roboto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

interface RootLayoutProps {
  children: Readonly<React.ReactNode>;
  params: Promise<{ locale: string }>;
}

// Viewport configuration in a separate export
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020817" },
  ],
};

export async function generateMetadata({
  params,
}: Omit<RootLayoutProps, "children">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("title"),
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { locale } = await params;
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full">
      <body
        className={`${robotoSans.variable} ${robotoMono.variable} min-h-screen bg-background text-foreground antialiased overflow-x-hidden overscroll-none`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <SessionProviderWrapper>
              <Providers>
                <TokenRefreshHandler />
                <div className="flex flex-col min-h-screen max-h-screen">
                  <main className="flex-1">{children}</main>
                </div>
              </Providers>
            </SessionProviderWrapper>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
