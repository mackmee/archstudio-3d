import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "ArchStudio 3D | 2D-to-3D Home Interior & Construction Estimator",
  description: "Professional architectural 2D floorplan editor and 3D interior design platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="h-full flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
