export default async function globalTeardown() {
  await globalThis.__UMLAB_RS__?.stop();
}
