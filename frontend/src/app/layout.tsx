import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "LandGrab | Tactical Property Intelligence",
  description:
    "AI-powered real estate analysis. Know if a property is worth buying before you offer.",
  keywords: "real estate, property analysis, home buying, AI valuation, housing market",
  openGraph: {
    title: "LandGrab | Tactical Property Intelligence",
    description: "Know if a property is worth buying before you offer.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-text-primary min-h-screen font-body antialiased">
        <QueryProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
