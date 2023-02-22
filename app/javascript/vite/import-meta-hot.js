/**
 * Jest breaks on `import.meta.hot`, so only import this in dev env
 */
export default function importMetaHot() {
  return import.meta.hot
}
