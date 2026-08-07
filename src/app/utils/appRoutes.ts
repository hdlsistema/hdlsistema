export const isMobileBuild = import.meta.env.VITE_HDL_APP_TARGET === 'mobile'

export function appPath(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (isMobileBuild) return normalized
  return normalized === '/' ? '/app' : `/app${normalized}`
}
