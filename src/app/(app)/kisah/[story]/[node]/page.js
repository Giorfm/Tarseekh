import { notFound } from 'next/navigation';
import { getKisahList, getKisah } from '@/lib/kisah/loader';
import { getSurah } from '@/lib/quran/loader';
import { KisahNodeView } from '@/components/kisah/KisahNodeView';

export async function generateStaticParams() {
  const list = await getKisahList();
  const params = [];
  for (const meta of list.filter((k) => k.status === 'available')) {
    const kisah = await getKisah(meta.slug);
    for (const node of kisah.nodes) {
      params.push({ story: meta.slug, node: node.id });
    }
  }
  return params;
}

async function loadNode(storySlug, nodeId) {
  try {
    const kisah = await getKisah(storySlug);
    const index = kisah.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) return null;
    return { kisah, index };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolved = await params;
  const found = await loadNode(resolved.story, resolved.node);
  if (!found) return { title: 'Kisah Tidak Ditemukan - Tarseekh' };
  const node = found.kisah.nodes[found.index];
  return {
    title: `${node.title} - Kisah ${found.kisah.title} - Tarseekh`,
    description: node.summary.text,
  };
}

export default async function KisahNodePage({ params }) {
  const resolved = await params;
  const found = await loadNode(resolved.story, resolved.node);
  if (!found) notFound();

  const { kisah, index } = found;
  const node = kisah.nodes[index];

  // Attach Arabic text & official translation for every referenced ayah
  const ayatGroups = [];
  for (const ref of node.ayat) {
    const surahData = await getSurah(ref.surah);
    const verses = surahData.verses
      .filter((v) => v.n >= ref.from && v.n <= ref.to)
      .map((v) => ({ key: v.key, n: v.n, text: v.text, translation: v.translation }));
    ayatGroups.push({ ref, surahName: surahData.surah.name_simple, verses });
  }

  return (
    <KisahNodeView
      kisah={{ slug: kisah.slug, title: kisah.title, total: kisah.nodes.length }}
      nodeIds={kisah.nodes.map((n) => n.id)}
      node={node}
      ayatGroups={ayatGroups}
      nextNodeId={kisah.nodes[index + 1]?.id || null}
    />
  );
}
