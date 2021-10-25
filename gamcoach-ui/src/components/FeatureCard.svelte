<script>
  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';
  import { tooltipConfigStore } from '../store';

  import {initSlider, initHist} from './FeatureCard';

  import rightArrowIcon from '../img/icon-right-arrow.svg';
  import rangeThumbLeftIcon from '../img/icon-range-thumb-left.svg';
  import rangeThumbRightIcon from '../img/icon-range-thumb-right.svg';
  import rangeThumbMiddleIcon from '../img/icon-range-thumb-middle.svg';
  import easyIcon from '../img/icon-easy.svg';
  import veryEasyIcon from '../img/icon-very-easy.svg';
  import neutralIcon from '../img/icon-neutral.svg';
  import hardIcon from '../img/icon-hard.svg';
  import veryHardIcon from '../img/icon-very-hard.svg';
  import infoIcon from '../img/icon-info.svg';

  export let featureInfo = null;
  export let requiresInt = false;
  export let originalValue = null;
  export let featureID = null;

  let state = {};

  // Constants
  state.tickHeights = {
    default: 6,
    original: 6 * 1.8,
    user: 6 * 1.8,
    coach: 6 * 1.8,
  };

  // Binding variables, which will be initialized after window is loaded
  let component = null;
  let windowLoaded = false;

  state.tickXScale = null;
  state.histSVG = null;
  state.densityClip = null;
  state.showingAnnotation = null;

  state.feature = {
    name: '',
    featureName: '',
    valueMin: 0,
    valueMax: 0,
    requiresInt: false,
    originalValue: 0,
    curValue: 0,
    coachValue: 0,
    curMin: 0,
    curMax: 0,
    histEdge: null,
    histCount: null,
    id: 0,
  };

  let tooltipConfig = null;
  tooltipConfigStore.subscribe(value => {
    tooltipConfig = value;
  });

  const preProcessSVG = (svgString) => {
    return svgString.replaceAll('black', 'currentcolor')
      .replaceAll('fill:none', 'fill:currentcolor')
      .replaceAll('stroke:none', 'fill:currentcolor');
  };

  /**
   * Dynamically bind SVG files as inline SVG strings in this component
   */
  export const bindInlineSVG = (component) => {
    const iconList = [
      { class: 'icon-right-arrow', svg: rightArrowIcon },
      { class: 'icon-range-thumb-left', svg: rangeThumbLeftIcon },
      { class: 'icon-range-thumb-right', svg: rangeThumbRightIcon },
      { class: 'icon-range-thumb-middle', svg: rangeThumbMiddleIcon },
      { class: 'icon-easy', svg: easyIcon },
      { class: 'icon-very-easy', svg: veryEasyIcon },
      { class: 'icon-neutral', svg: neutralIcon },
      { class: 'icon-hard', svg: hardIcon },
      { class: 'icon-very-hard', svg: veryHardIcon },
      { class: 'icon-info', svg: infoIcon },
    ];

    iconList.forEach(d => {
      d3.select(component)
        .selectAll(`.svg-icon.${d.class}`)
        .each((_, i, g) => {
          let ele = d3.select(g[i]);
          let html = ele.html();
          html = html.concat(' ', preProcessSVG(d.svg));
          ele.html(html);
        });
    });
  };

  /**
   * A workaround to listen to changes made in the js functions.
   */
  const stateUpdated = () => {
    // Trigger svelte interactivity
    state = state;
  };

  state.stateUpdated = stateUpdated;

  /**
   * Init the states of different elements. Some functions require bbox,
   * which is only accurate after content is loaded
   */
  const initFeatureCard = () => {
    // Initialize the feature data from the prop
    state.feature = {
      // TODO: Export a feature description name in the model extract function from
      // python
      name: 'FICO Score',
      featureName: featureInfo.name,
      valueMin: featureInfo.binEdge[0],
      valueMax: featureInfo.binEdge[featureInfo.binEdge.length - 1],
      requiresInt: requiresInt,
      originalValue: originalValue,
      curValue: originalValue,
      coachValue: 755,
      curMin: featureInfo.binEdge[0],
      curMax: featureInfo.binEdge[featureInfo.binEdge.length - 1],
      histEdge: featureInfo.histEdge,
      histCount: featureInfo.histCount,
      id: featureID,
      densityClip: null,
      stateUpdated: stateUpdated,
    };

    if (requiresInt) {
      state.feature.valueMin = Math.floor(state.feature.valueMin);
      state.feature.curMin = Math.floor(state.feature.curMin);
      state.feature.valueMax = Math.ceil(state.feature.valueMax);
      state.feature.curMax = Math.ceil(state.feature.curMax);
    }

    // Init the slider
    initSlider(component, state);

    // Init the density plot and ticks
    initHist(component, state);
  };

  onMount(() => {
    // Bind the SVG icons on mount
    bindInlineSVG(component);

    windowLoaded = true;
  });

  $: featureInfo && windowLoaded && initFeatureCard();

</script>

<style lang="scss">
  @import './FeatureCard.scss';
</style>

<div class='feature-card' bind:this={component}>

  <div class='feature-header'>
    <div class='feature-info'>
      <span class='feature-name'>
        FICO Score
      </span>
      <div class='feature-difficulty'>
        <div class='svg-icon icon-neutral'></div>
      </div>
    </div>

    <div class='values'>
      <span class='value-old'>
        {state.feature.originalValue}
      </span>

      <div class='feature-arrow'>
        <span class='value-change'>
          {`${(state.feature.curValue - state.feature.originalValue) < 0 ? '' :
            '+'}${state.feature.curValue - state.feature.originalValue}`}
        </span>

        <div class='arrow-right'></div>
      </div>

      <span class='value-new'>
        {state.feature.curValue}
      </span>
    </div>

  </div>

  <div class='feature-hist'>
    <svg class='svg-hist'></svg>

    <div class='feature-annotations'>
      <div class='annotation annotation-name show'>
        <div class='svg-icon icon-info'></div>
        <span>Value Distribution of All Users</span>
      </div>

      <div class='annotation annotation-user'>
        My Hypothetical Value
      </div>

      <div class='annotation annotation-original'>
        My Original Value
      </div>

      <div class='annotation annotation-coach'>
        GAM Coach Suggestion
      </div>

      <div class='annotation annotation-range'>
        My Actionable Range
      </div>

    </div>
  </div>

  <div class='feature-slider'>

    <div class='track'>
      <div class='range-track'></div>

      <div id='slider-left-thumb'
        tabindex='-1'
        class='svg-icon icon-range-thumb-left thumb'>
        <div class='thumb-label thumb-label-left'>
          <span class='thumb-label-span'>{state.feature.curMin}</span>
        </div>
      </div>

      <div id='slider-right-thumb'
        tabindex='-1'
        class='svg-icon icon-range-thumb-right thumb'>
        <div class='thumb-label thumb-label-right'>
          <span class='thumb-label-span'>{state.feature.curMax}</span>
        </div>
      </div>

      <div id='slider-middle-thumb'
        tabindex='-1'
        class='svg-icon icon-range-thumb-middle thumb'>
        <div class='thumb-label thumb-label-middle'>
          <span class='thumb-label-span'>{state.feature.curValue}</span>
        </div>
      </div>
    </div>

  </div>

</div>
