import "./globals.css";
import { TutorialProvider } from "../components/TutorialEngine";
import ErrorBoundary from "../components/ErrorBoundary";
import WelcomeSplash from "../components/WelcomeSplash";

export const metadata = {
  title: "HL Manager Pro",
  description: "Sistem Manajemen Keuangan Bisnis HL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="antialiased font-sans">
        <WelcomeSplash />
        <ErrorBoundary>
          <TutorialProvider>
            {children}
          </TutorialProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
