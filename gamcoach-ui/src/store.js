import { writable } from 'svelte/store';

export const tooltipConfigStore = writable({});

export const diffPickerConfigStore = writable({});

export const confirmModalConfigStore = writable({
  title: 'Confirmation',
  show: false,
  confirmed: false,
  contextLines: [''],
  confirmText: 'OK',
  cancelText: 'Cancel',
  doNotShowAgain: false,
  confirmCallback: () => null
});

export const bookmarkConfigStore = writable({
  show: false,
  features: null,
  plans: new Map(),
  focusOutTime: 0,
  plansInfo: null,
});

export const inputFormConfigStore = writable({
  show: false,
  ebm: null,
  features: null,
  plansInfo: null,
  curExample: [],
  action: null
});

export const ebmStore = writable();