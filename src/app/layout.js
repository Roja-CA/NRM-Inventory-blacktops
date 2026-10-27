import './globals.css';

export const metadata = {
  title: 'NRM Inventory',
  description: 'NRM Inventory Management for a stitching unit',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
