/**
 * src/lib/kisah/progress.js
 * Tracks completed story nodes per kisah in localStorage
 * and derives node states (completed / current / locked).
 */

const PROGRESS_KEY = 'tarseekh_kisah_progress_v1';

function readAll() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(PROGRESS_KEY);
      if (raw) return JSON.parse(raw) || {};
    }
  } catch {
    // ignore
  }
  return {};
}

export function getCompletedNodes(slug) {
  const all = readAll();
  return Array.isArray(all[slug]) ? all[slug] : [];
}

export function markNodeCompleted(slug, nodeId) {
  const all = readAll();
  const completed = new Set(Array.isArray(all[slug]) ? all[slug] : []);
  completed.add(nodeId);
  all[slug] = [...completed];

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    }
  } catch (err) {
    console.warn('Failed to save kisah progress', err);
  }
  return all[slug];
}

/**
 * Derive node states. Nodes are unlocked strictly in order: every node before
 * the first incomplete one is "completed", that node is "current", the rest are "locked".
 *
 * @param {Array<{id: string}>} nodes sorted by order
 * @param {string[]} completedIds
 * @returns {Object<string, 'completed'|'current'|'locked'>}
 */
export function getNodeStates(nodes, completedIds = []) {
  const done = new Set(completedIds);
  const states = {};
  let currentAssigned = false;

  for (const node of nodes) {
    if (!currentAssigned && done.has(node.id)) {
      states[node.id] = 'completed';
    } else if (!currentAssigned) {
      states[node.id] = 'current';
      currentAssigned = true;
    } else {
      states[node.id] = 'locked';
    }
  }

  return states;
}
