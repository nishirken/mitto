export interface Route {
  name: string;
  params: Record<string, string>;
}

export type RouteChangeCallback = (route: Route) => void;

export function parseHash(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, '');
  if (path === 'dialogs') return { name: 'dialogs', params: {} };
  if (path === 'settings') return { name: 'settings', params: {} };
  const dialogMatch = path.match(/^dialog\/(.+)$/);
  if (dialogMatch) return { name: 'dialog', params: { id: dialogMatch[1] } };

  return null;
}

export function navigate(path: string) {
  window.location.hash = `#/${path}`;
}

export function onRouteChange(callback: RouteChangeCallback): () => void {
  const handler = () => {
    const route = parseHash(window.location.hash);
    if (route) callback(route);
  };
  window.addEventListener('hashchange', handler);

  return () => window.removeEventListener('hashchange', handler);
}

export function currentRoute(): Route {
  return parseHash(window.location.hash) ?? { name: 'dialogs', params: {} };
}
