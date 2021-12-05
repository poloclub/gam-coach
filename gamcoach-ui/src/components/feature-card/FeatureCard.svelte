<script>
  import d3 from '../../utils/d3-import';
  import '../../typedef';
  import { onMount, tick } from 'svelte';
  import { tooltipConfigStore, diffPickerConfigStore } from '../../store';

  import {initSlider, initHist} from './FeatureCard';

  import rightArrowIcon from '../../img/icon-right-arrow.svg';
  import rangeThumbLeftIcon from '../../img/icon-range-thumb-left.svg';
  import rangeThumbRightIcon from '../../img/icon-range-thumb-right.svg';
  import rangeThumbMiddleIcon from '../../img/icon-range-thumb-middle.svg';
  import easyIcon from '../../img/icon-easy.svg';
  import veryEasyIcon from '../../img/icon-very-easy.svg';
  import neutralIcon from '../../img/icon-neutral.svg';
  import hardIcon from '../../img/icon-hard.svg';
  import veryHardIcon from '../../img/icon-very-hard.svg';
  import lockIcon from '../../img/icon-lock.svg';
  import infoIcon from '../../img/icon-info.svg';
  import closeIcon from '../../img/icon-close.svg';
  import refreshIcon from '../../img/icon-refresh.svg';


  export let feature = null;

  let mounted = false;
  let initialized = false;
  let isCollapsed = true;
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
  const formatter = d3.format(',.2~f');

  state.tickXScale = null;
  state.histSVG = null;
  state.densityClip = null;
  state.showingAnnotation = null;
  state.difficulty = 'neutral';

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

  const difficultyIconMap = {
    'neutral': neutralIcon,
    'easy': easyIcon,
    'very-easy': veryEasyIcon,
    'hard': hardIcon,
    'very-hard': veryHardIcon,
    'lock': lockIcon,
  };

  let diffPickerConfig = null;
  diffPickerConfigStore.subscribe(value => {

    // Listen to the picked event
    if (value.action === 'picked') {
      // Update the icon
      state.difficulty = value.difficulty;

      // Update the SVG
      d3.select(component)
        .select('.feature-difficulty')
        .select('.svg-icon')
        .html(difficultyIconMap[state.difficulty]);
    }

    diffPickerConfig = value;
  });

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
      { class: 'icon-close', svg: closeIcon },
      { class: 'icon-refresh', svg: refreshIcon },
    ];

    iconList.forEach(d => {
      d3.select(component)
        .selectAll(`.svg-icon.${d.class}`)
        .each((_, i, g) => {
          const ele = d3.select(g[i]);
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
   * Dynamically change the font size for the feature name to make it fit the
   * size of the header
   */
  const fitFeatureName = () => {
    const featureNameElem = d3.select(component)
      .select('.feature-name');

    let fontSize = parseFloat(
      window.getComputedStyle(featureNameElem.node()).fontSize
    );
    const nameHeight = featureNameElem.node().clientHeight;
    const parentHeight = featureNameElem.node().parentNode.clientHeight;

    if(nameHeight > parentHeight) {
      fontSize -= 0.5;
      featureNameElem.style('font-size', `${fontSize}px`);
      fitFeatureName();
    }
  };

  /**
   * Init the states of different elements. Some functions require bbox,
   * which is only accurate after content is loaded
   */
  const initFeatureCard = async () => {
    initialized = true;
    const featureInfo = feature.data;

    // Initialize the feature data from the prop
    state.feature = {
      name: featureInfo.description.displayName,
      featureName: featureInfo.name,
      valueMin: featureInfo.binEdge[0],
      valueMax: featureInfo.binEdge[featureInfo.binEdge.length - 1],
      requiresInt: feature.requiresInt,
      originalValue: feature.originalValue,
      curValue: feature.originalValue,
      coachValue: 755,
      curMin: featureInfo.binEdge[0],
      curMax: featureInfo.binEdge[featureInfo.binEdge.length - 1],
      histEdge: featureInfo.histEdge,
      histCount: featureInfo.histCount,
      id: feature.featureID,
      densityClip: null,
      stateUpdated: stateUpdated,
    };

    if (feature.requiresInt) {
      state.feature.valueMin = Math.floor(state.feature.valueMin);
      state.feature.curMin = Math.floor(state.feature.curMin);
      state.feature.valueMax = Math.ceil(state.feature.valueMax);
      state.feature.curMax = Math.ceil(state.feature.curMax);
    }

    // Init the slider
    initSlider(component, state);

    // Init the density plot and ticks
    initHist(component, state);

    // Wait until the view is updated then automatically resize the feature name
    await tick();
    fitFeatureName();
  };

  /**
   * Handler for clicking the difficulty picker
   * @param e Event
   */
  const diffClickedHandler = () => {
    // Trigger the difficulty picker
    // Figure out the location to put the picker
    const bbox = d3.select(component)
      .select('.feature-difficulty')
      .node()
      .getBoundingClientRect();

    const newX = bbox.x + bbox.width / 2 - diffPickerConfig.width / 4 - 2;
    const newY = bbox.y - diffPickerConfig.height - 8;

    diffPickerConfig.x = newX;
    diffPickerConfig.y = newY;
    diffPickerConfig.action = 'to-show';
    diffPickerConfig.feature = state.feature.name;

    diffPickerConfigStore.set(diffPickerConfig);
  };

  onMount(() => {
    // Bind the SVG icons on mount
    bindInlineSVG(component);
    mounted = true;
  });

  $: feature && mounted && !initialized && initFeatureCard();

</script>

<style lang="scss">
  @import './FeatureCard.scss';
</style>

<div class='feature-card' bind:this={component}>

  <div class='feature-header'>

    <div class='top-row'>
      <div class='feature-info'>
        <span class='feature-name'>
          {state.feature.name}
        </span>
      </div>

      <div class='card-icons'>
        <div class='svg-icon icon-refresh'>
          <div class='local-tooltip'>
            <span>Reset</span>
          </div>
        </div>
      </div>
    </div>

    <div class='values'>

        <span class='value-old'>
          {formatter(state.feature.originalValue)}
        </span>

        <div class='feature-arrow'
          class:hidden={state.feature.originalValue === state.feature.curValue}
        >
          <span class='value-change'>
            {`${(state.feature.curValue - state.feature.originalValue) < 0 ? '' :
              '+'}${formatter(
                state.feature.curValue - state.feature.originalValue
                )}`}
          </span>

          <div class='arrow-right'></div>
        </div>

        <span class='value-new'
          class:hidden={state.feature.originalValue === state.feature.curValue}
        >
          {formatter(state.feature.curValue)}
        </span>

    </div>

    <div class='feature-slider'>

      <div class='track'>
        <div class='range-track'></div>

        <div id='slider-left-thumb'
          tabindex='-1'
          class='svg-icon icon-range-thumb-left thumb'>
          <div class='thumb-label thumb-label-left'>
            <span class='thumb-label-span'>{formatter(state.feature.curMin)}</span>
          </div>
        </div>

        <div id='slider-right-thumb'
          tabindex='-1'
          class='svg-icon icon-range-thumb-right thumb'>
          <div class='thumb-label thumb-label-right'>
            <span class='thumb-label-span'>{formatter(state.feature.curMax)}</span>
          </div>
        </div>

        <div id='slider-middle-thumb'
          tabindex='-1'
          class='svg-icon icon-range-thumb-middle thumb'>
          <div class='thumb-label thumb-label-middle'>
            <span class='thumb-label-span'>{formatter(state.feature.curValue)}</span>
          </div>
        </div>
      </div>

    </div>

  </div>

  <div class='feature-hist'>
    <svg class='svg-hist'></svg>

    <div class='feature-annotations'>
      <div class='annotation annotation-name show'>
        <div class='svg-icon icon-info'></div>
        <span>Value Distribution of All Users</span>
        <div class='feature-difficulty' on:click={diffClickedHandler}>
          <div class={`svg-icon icon-${state.difficulty}`}></div>
        </div>
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

  <div class='configuration'>
    <span class='tag acceptable-tag'>
      Acceptable between 400 and 500
      <div class='local-tooltip'>
        <span>New strategies will only search within this range</span>
      </div>
    </span>

    <span class='tag difficulty-tag'>
      Easy to change
      <div class='local-tooltip'>
        <span>New strategies will prioritize features that are easy to change</span>
      </div>
    </span>

  </div>

</div>
