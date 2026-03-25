export interface Route {
  name: string;
  params: Record<string, string>;
}

export type RouteChangeCallback = (route: Route) => void;

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (path === 'chats') return { name: 'chats', params: {} };
  const chatMatch = path.match(/^chat\/(.+)$/);
  if (chatMatch) return { name: 'chat', params: { id: chatMatch[1] } };

  return { name: 'chats', params: {} };
}

export function navigate(path: string) {
  window.location.hash = `#/${path}`;
}

export function onRouteChange(callback: RouteChangeCallback): () => void {
  const handler = () => callback(parseHash(window.location.hash));
  window.addEventListener('hashchange', handler);

  return () => window.removeEventListener('hashchange', handler);
}

export function currentRoute(): Route {
  return parseHash(window.location.hash);
}
