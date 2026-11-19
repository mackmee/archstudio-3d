import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark h-full antialiased">
      <body className="h-full flex flex-col bg-[#090d16] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
