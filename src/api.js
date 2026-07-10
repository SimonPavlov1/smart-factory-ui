const TOKEN_KEY = "smart_factory_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function installAuthFetch() {
  if (window.__smartFactoryFetchInstalled) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const token = getToken();

    if (token && url.startsWith("/api") && !url.startsWith("/api/auth/login")) {
      const headers = new Headers(init.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      init = { ...init, headers };
    }

    return nativeFetch(input, init).then((response) => {
      if (response.status === 401 && url.startsWith("/api") && !url.startsWith("/api/auth/login")) {
        clearToken();
        window.dispatchEvent(new Event("auth:logout"));
      }
      return response;
    });
  };

  window.__smartFactoryFetchInstalled = true;
}
