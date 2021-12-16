import { writable } from 'svelte/store';

export const tooltipConfigStore = writable({});
export const diffPickerConfigStore = writable({});
export const confirmModalConfigStore = writable({
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
  plans: [],
  focusOutTime: 0
});