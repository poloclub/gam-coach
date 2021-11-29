<script>
  import d3 from '../../utils/d3-import';
  import { onMount, tick } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import { tooltipConfigStore, diffPickerConfigStore } from '../../store';

  import { initHist } from './FeatureCardCat';

  import rightArrowIcon from '../../img/icon-right-arrow.svg';
  import levelThumbIcon from '../../img/icon-level-thumb.svg';
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

  state.tickXScale = null;
  state.histSVG = null;
  state.showingAnnotation = null;
  state.difficulty = 'neutral';
  state.xCenters = [];
  state.tickOpacityTimeout = null;
  state.helperMessageDefault = 'Value Distribution of All Users';
  state.helperMessage = state.helperMessageDefault;

  state.feature = {
    name: '',
    featureName: '',
    originalValue: 0,
    curValue: 0,
    coachValue: 0,
    histEdge: [0],
    histCount: null,
    id: 0,
    labelEncoder: {},
    searchValues: []
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
      { class: 'icon-level-thumb', svg: levelThumbIcon },
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
      originalValue: feature.originalValue,
      curValue: feature.originalValue,
      coachValue: 1,
      histEdge: featureInfo.histEdge,
      histCount: featureInfo.histCount,
      id: feature.featureID,
      stateUpdated: stateUpdated,
      labelEncoder: feature.labelEncoder,
      searchValues: new Set(featureInfo.histEdge)
    };

    // Draw the histogram
    // Record the x center values for each bar. The original return value is
    // at the global absolute coordinate. Convert it to local coordinate here.
    initHist(component, state);

    // Need to wait the view is updated so we can recenter labels
    await tick();
    fitFeatureName();

    initialized = true;
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

  onMount(() => {
    // Bind the SVG icons on mount
    bindInlineSVG(component);
    mounted = true;
  });

  $: feature && mounted && !initialized && initFeatureCard();

</script>

<style lang="scss">
  @import '../feature-card/FeatureCard.scss';
  @import './FeatureCardCat.scss';
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
          <div class='icon-label'>
            <span class='thumb-label-span'>Reset</span>
          </div>
        </div>

        <div class='svg-icon icon-close'>
          <div class='icon-label'>
            <span class='thumb-label-span'>Close</span>
          </div>
        </div>
      </div>

    </div>

    <div class='values'>
      {#if state.feature.originalValue === state.feature.curValue}

        <span class='value-label'>
          {state.feature.labelEncoder[state.feature.originalValue]}
        </span>

      {:else}

        <span class='value-label'>
          {state.feature.labelEncoder[state.feature.originalValue]}
        </span>

        <div class='feature-arrow'>
          <div class='arrow-right'></div>
        </div>

        <span class='value-label'>
          {state.feature.labelEncoder[state.feature.curValue]}
        </span>

      {/if}
    </div>

  </div>


<div class='feature-hist'>
    <svg class='svg-hist'></svg>

    <div class='feature-annotations'>
      <div class='annotation annotation-name show'>

        <div class='svg-icon icon-info'></div>

        {#key state.helperMessage}
          <span in:fade={{duration: 200, easing: cubicInOut}}>
            {@html state.helperMessage}
          </span>
        {/key}

        <div class='feature-difficulty'
          on:click={diffClickedHandler}
        >
          <div class={`svg-icon icon-${state.difficulty}`}></div>
        </div>

      </div>

    </div>
  </div>

</div>
