import { getPage } from '@/lib/pages/loader';
import { MushafPageView } from '@/components/reader/MushafPageView';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return Array.from({ length: 604 }, (_, i) => ({
    page: String(i + 1),
  }));
}

export async function generateMetadata({ params }) {
  const resolved = await params;
  const pageNum = parseInt(resolved.page, 10);
  try {
    const data = await getPage(pageNum);
    const surahNames = data.surahs.map((s) => s.name_simple).join(', ');
    return {
      title: `Halaman ${pageNum} (Juz ${data.juz}) - ${surahNames} - Tarseekh`,
      description: `Format mushaf Madinah 15 baris halaman ${pageNum}, Juz ${data.juz}.`,
    };
  } catch {
    return { title: 'Halaman Tidak Ditemukan - Tarseekh' };
  }
}

export default async function HalamanViewPage({ params }) {
  const resolved = await params;
  const pageNum = parseInt(resolved.page, 10);

  if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
    notFound();
  }

  let pageData;
  let facingPageData = null;

  try {
    pageData = await getPage(pageNum);

    // If odd page, facing page is pageNum + 1 (if <= 604)
    // If even page, facing page is pageNum - 1 (if >= 1)
    const facingNum = pageNum % 2 === 1 ? pageNum + 1 : pageNum - 1;
    if (facingNum >= 1 && facingNum <= 604) {
      facingPageData = await getPage(facingNum);
    }
  } catch (err) {
    console.error(`Error loading mushaf page ${pageNum}:`, err);
    notFound();
  }

  return (
    <main>
      <MushafPageView pageData={pageData} facingPageData={facingPageData} />
    </main>
  );
}
