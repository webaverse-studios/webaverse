export const isProd = import.meta.env.MODE === 'production';
export const isWorker = !globalThis.window;
