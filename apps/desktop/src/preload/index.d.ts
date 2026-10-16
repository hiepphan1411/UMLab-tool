import type { UmlabApi } from '../shared/api';

declare global {
  interface Window {
    umlab: UmlabApi;
  }
}

export {};
