import { AudioEngine } from './audio';
export const audio = new AudioEngine();
export function go(path: string) { if (location.hash !== '#' + path) location.hash = path; else dispatchEvent(new HashChangeEvent('hashchange')); }
