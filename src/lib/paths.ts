function basePrefix(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}

export function withBase(path = ""): string {
  const prefix = basePrefix();
  if (!path || path === "/") return prefix;
  const trimmed = path.replace(/^\//, "").replace(/\/$/, "");
  return `${prefix}${trimmed}/`;
}

export function withAsset(path: string): string {
  return `${basePrefix()}${path.replace(/^\//, "")}`;
}

export function facturaHref(id?: string): string {
  if (!id) return withBase("factura/nueva");
  return `${withBase("factura")}?id=${encodeURIComponent(id)}`;
}
