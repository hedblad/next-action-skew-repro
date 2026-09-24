import { LayoutWidget } from './layout-widget';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LayoutWidget />
        {children}
      </body>
    </html>
  );
}
