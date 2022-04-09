import { writable } from 'svelte/store';

export const tooltipConfigStore = writable({
  show: false,
  html: 'null',
  left: 0,
  top: 0,
  width: 80,
  maxWidth: 80,
  fontSize: '14px',
  orientation: 's',
  mouseoverTimeout: null
});

export const constraintsStore = writable(null);

export const diffPickerConfigStore = writable({
  feature: null,
  focusOutTime: 0,
  difficulty: 'neutral',
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  action: ''
});

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

export const ratingFormConfigStore = writable({
  show: false,
  planRatings: [],
  action: ''
});

export const constraintRatingFormConfigStore = writable({
  show: false,
  constraintRatings: [],
  action: ''
});

export const inputFormConfigStore = writable({
  show: false,
  ebm: null,
  features: null,
  plansInfo: null,
  curExample: [],
  action: null
});

export const getInputFormConfigStore = () => {
  return writable({
    show: false,
    ebm: null,
    features: null,
    plansInfo: null,
    curExample: [],
    action: null
  });
};

export const ebmStore = writable({});