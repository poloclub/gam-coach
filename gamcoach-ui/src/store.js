import { writable } from 'svelte/store';

export const tooltipConfigStore = writable({});
export const diffPickerConfigStore = writable({});
export const confirmModalConfigStore = writable({
  show: false,
  content: '',
  confirmed: false
});