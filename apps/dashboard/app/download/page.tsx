import type { Metadata } from 'next';
import DownloadClient from './DownloadClient';

export const metadata: Metadata = {
  title: 'Download BSB Dashboard App — Beragam Sewa Bali',
  description: 'Download dan install aplikasi BSB Dashboard untuk Android, iOS, dan Desktop. Kelola rental & event production langsung dari home screen.',
  keywords: 'download, install, app, apk, bsb dashboard, beragam sewa bali, pwa',
  openGraph: {
    title: 'Download BSB Dashboard App',
    description: 'Install aplikasi manajemen rental & event production Beragam Sewa Bali.',
    type: 'website',
  },
};

export default function DownloadPage() {
  return <DownloadClient />;
}