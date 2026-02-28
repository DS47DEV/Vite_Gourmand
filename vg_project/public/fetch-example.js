// Exemple minimal d'appels asynchrones via Fetch (à intégrer dans ton front)

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || res.statusText);
  }
  return res.status === 204 ? null : res.json();
}

export async function loadMenus() {
  return api('/menus');
}
