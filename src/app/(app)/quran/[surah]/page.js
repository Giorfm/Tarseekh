import { getSurah } from '@/lib/quran/loader';
import { VerseListView } from '@/components/reader/VerseListView';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  const resolved = await params;
  const surahId = parseInt(resolved.surah, 10);
  try {
    const data = await getSurah(surahId);
    return {
      title: `${data.surah.name_simple} (${data.surah.name_arabic}) - Tarseekh`,
      description: `Baca Surah ${data.surah.name_simple} (${data.surah.translated_name}) dengan tadabbur makna dan mode interaktif di Tarseekh.`,
    };
  } catch {
    return { title: 'Surah Tidak Ditemukan - Tarseekh' };
  }
}

export default async function VerseViewPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedQuery = await searchParams;
  const surahId = parseInt(resolvedParams.surah, 10);
  const initialAyah = resolvedQuery?.ayah ? parseInt(resolvedQuery.ayah, 10) : null;

  let surahData;
  try {
    surahData = await getSurah(surahId);
  } catch (err) {
    notFound();
  }

  return (
    <main>
      <VerseListView surahData={surahData} initialAyah={initialAyah} />
    </main>
  );
}
