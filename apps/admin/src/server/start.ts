// npm run start -w @umlab/admin: phục vụ bản build (dist/client) — sau `npm run build -w @umlab/admin`.
process.env.UMLAB_ADMIN_PROD = '1';
await import('./index');
export {};
