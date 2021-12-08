<script>
  import d3 from '../../utils/d3-import';
  import { onMount, tick } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import { tooltipConfigStore, diffPickerConfigStore } from '../../store';

  import { initHist, initHistSize } from './FeatureCardCat';

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

  /** @type {Feature}*/
  export let feature = null;

  let mounted = false;
  let initialized = false;
  let histDrawn = false;
  let isCollapsed = true;
  let isExpanded = false;
  let state = {};

  // Constants
  state.tickHeights = {
    default: 6,
    original: 6 * 1.8,
    user: 6 * 1.8,
    coach: 6 * 1.8,
  };

  // Binding variables, which will be initialized after window is loaded
  /** @type {HTMLElement} */
  let component = null;

  state.tickXScale = null;
  state.histSVG = null;
  state.showingAnnotation = null;
  state.xCenters = [];
  state.tickOpacityTimeout = null;
  state.helperMessageDefault = 'Value Distribution of All Users';
  state.helperMessage = state.helperMessageDefault;

  /** @type {Feature}*/
  state.featurePtr = feature;

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
    description: {},
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

  const difficultyTextMap = {
    'neutral': 'Default difficulty',
    'easy': 'Easy to change',
    'very-easy': 'Very easy to change',
    'hard': 'Hard to change',
    'very-hard': 'Very hard to change',
    'lock': 'Do not change this feature',
  };

  let diffPickerConfig = null;
  diffPickerConfigStore.subscribe(value => {

    // Listen to the picked event
    if (value.action === 'picked' && value.feature === state.feature.name) {
      // Update the icon
      feature.difficulty = value.difficulty;

      // Change `isConstrained` if necessary
      if(feature.difficulty === 'neutral' && feature.acceptableRange === null) {
        feature.isConstrained = false;
      } else {
        feature.isConstrained = true;
      }
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

  const featureUpdated = () => {
    feature = state.featurePtr;
    state = state;
  };
  state.featureUpdated = featureUpdated;

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
      curValue: feature.coachValue,
      coachValue: feature.coachValue,
      histEdge: featureInfo.histEdge,
      histCount: featureInfo.histCount,
      id: feature.featureID,
      description: featureInfo.description,
      labelEncoder: feature.labelEncoder,
      searchValues: feature.acceptableRange === null ?
        new Set(featureInfo.histEdge) :
        new Set(feature.acceptableRange)
    };

    // Draw the histogram
    // Record the x center values for each bar. The original return value is
    // at the global absolute coordinate. Convert it to local coordinate here.
    initHistSize(component, state);

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

    // If the diff picker is shown for the current feature, we stop showing
    if (diffPickerConfig.feature === state.feature.name &&
      (Date.now() - diffPickerConfig.focusOutTime) < 200
    ) {
      diffPickerConfig.x = 0;
      diffPickerConfig.y = 0;
      diffPickerConfig.action = 'to-hide';
      diffPickerConfig.feature = null;

      diffPickerConfigStore.set(diffPickerConfig);
      return;
    }

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

  /**
   * Handler when header is clicked
   * @param {MouseEvent} e Mouse event
   */
  export const headerClicked = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Register the initial size
    const initBBox = component.getBoundingClientRect();

    // Also animate the configuration bar if it is always shown
    /** @type {HTMLElement} */
    const configDIV = component.querySelector('.configuration');
    const initConfigBBox = configDIV.getBoundingClientRect();

    isCollapsed = !isCollapsed;
    await tick();

    // Register the final state
    const finalBBox = component.getBoundingClientRect();
    const finalConfigBBox = configDIV.getBoundingClientRect();

    const animation = component.animate(
      [
        { height: `${initBBox.height}px` },
        { height: `${finalBBox.height}px` }
      ],
      {
        duration: 250,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'none'
      }
    );

    animation.onfinish = () => {
      if (!histDrawn) {
        // Init the density plot and ticks
        initHist(component, state);

        histDrawn = true;
      }

      isExpanded = !isExpanded;
    };

    // Use FLIP to animate the configuration bar
    if (feature.isConstrained) {
      configDIV.animate(
        [
          { transform: `translate(0, ${initConfigBBox.y -
            finalConfigBBox.y}px)` },
          { transform: 'none' }
        ],
        {
          duration: 250,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both'
        }
      );
    }
  };

  /**
   * Convert acceptable range to readable text
   * @param acceptableRange
   */
  const displayAcceptableRange = (acceptableRange) => {
    let text = '';

    let acceptableRangeAll = acceptableRange;
    if (acceptableRange === null) {
      acceptableRangeAll = Object.keys(feature.labelEncoder);
    }

    text = `"${feature.labelEncoder[acceptableRangeAll[0]]}"`;

    for (let i = 1; i < acceptableRangeAll.length - 1; i++) {
      text = text.concat(', ', `"${
        feature.labelEncoder[acceptableRangeAll[i]]
      }"`);
    }

    if (acceptableRangeAll.length == 2) {
      text = text.concat(` and "${feature.labelEncoder[acceptableRangeAll[1]]}"`);
    } else if (acceptableRangeAll.length > 2) {
      text = text.concat(`, and "${
        feature.labelEncoder[acceptableRangeAll[acceptableRangeAll.length - 1]]
      }"`);
    }

    return text;
  };

  const displayLevel = (state, value) => {
    if (state.feature.description.levelDescription === undefined) {
      return '';
    }
    return state.feature.description.levelDescription[value].displayName;
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

<div class='feature-card' bind:this={component}
  class:collapsed={isCollapsed}
>

  <div class='feature-header'
    class:collapsed={isCollapsed}
    on:click={headerClicked}
  >

    <div class='top-row'>

      <div class='feature-info'>
        <span class='feature-name'>
          {state.feature.name}
        </span>
      </div>

      <div class='card-icons' class:collapsed={isCollapsed}>

        <div class='svg-icon icon-refresh'>
          <div class='local-tooltip'>
            <span class='content'>Reset</span>
          </div>
        </div>

      </div>

    </div>

    <div class='values'>
      {#if state.feature.originalValue === state.feature.curValue}

        <span class='value-label'>
          {displayLevel(state, state.feature.originalValue)}
        </span>

      {:else}

        <span class='value-label'>
          {displayLevel(state, state.feature.originalValue)}
        </span>

        <div class='feature-arrow'>
          <div class='arrow-right'></div>
        </div>

        <span class='value-label'>
          {displayLevel(state, state.feature.curValue)}
        </span>

      {/if}
    </div>

  </div>

  <div class='feature-hist'
    class:collapsed={isCollapsed}
    class:expanded={isExpanded}
  >
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
          <div class={`icon icon-${feature.difficulty}`}
            title='Specify the difficulty for me to change this feature'
          >
            {@html difficultyIconMap[feature.difficulty]}
          </div>
        </div>

      </div>

    </div>
  </div>

  <div class='configuration'
    class:constrained={feature === null ? false : feature.isConstrained}
    class:collapsed={isCollapsed}
    class:expanded={isExpanded}
    on:click={headerClicked}
  >
    <span class='tag acceptable-tag'
      class:shown={feature.acceptableRange !== null}
    >
      Acceptable among {displayAcceptableRange(feature.acceptableRange)}
      <div class='local-tooltip'>
        <span class='content'>New strategies will only search within this range</span>
      </div>
    </span>

    <span class='tag difficulty-tag'
      class:shown={feature.difficulty !== 'neutral'}
    >
      {difficultyTextMap[feature.difficulty]}
      <div class='local-tooltip'>
        <span class='content'>New strategies will prioritize features that are easy to change</span>
      </div>
    </span>

  </div>

</div>
