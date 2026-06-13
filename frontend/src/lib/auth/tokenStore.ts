/**
 * Guarda do access token (JWT curto) por tenant em localStorage — cada
 * subdomínio tem o seu, coerente com o modelo por-tenant do backend.
 * A sessão longa fica no cookie httpOnly; perder o access token só custa
 * um POST /auth/refresh.
 */

function key(slug: string): string {
  return `quilombo_access_${slug}`;
}

export function loadAccessToken(slug: string): string | null {
  try {
    return window.localStorage.getItem(key(slug));
  } catch {
    return null; // storage indisponível (ex.: cookies bloqueados)
  }
}

export function saveAccessToken(slug: string, token: string): void {
  try {
    window.localStorage.setItem(key(slug), token);
  } catch {
    // sem storage a sessão dura até o reload — o refresh cookie recupera
  }
}

export function clearAccessToken(slug: string): void {
  try {
    window.localStorage.removeItem(key(slug));
  } catch {
    // nada a limpar
  }
}
