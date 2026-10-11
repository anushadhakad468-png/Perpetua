import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { WalletProvider } from '@/providers/WalletProvider';


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-app-bg text-text-primary antialiased">
        <AuthProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}