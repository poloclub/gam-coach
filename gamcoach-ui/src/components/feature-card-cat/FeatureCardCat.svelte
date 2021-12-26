<script>
  // @ts-check
  import d3 from '../../utils/d3-import';
  import { Logger } from '../../utils/logger';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import { tooltipConfigStore, diffPickerConfigStore } from '../../store';

  import { initHist, initHistSize, syncBars, titleMouseenterHandler,
    titleMouseleaveHandler } from './FeatureCardCat';

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

  /** @type {Logger} */
  export let logger = null;

  let mounted = false;
  let initialized = false;
  let histDrawn = false;
  let isCollapsed = true;
  let isExpanded = false;
  const unsubscribes = [];
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

  const dispatch = createEventDispatcher();

  state.tickXScale = null;
  state.histSVG = null;
  state.showingAnnotation = null;
  state.xCenters = [];
  state.tickOpacityTimeout = null;
  state.helperMessageDefault = 'Value Distribution of All Users';
  state.helperMessage = state.helperMessageDefault;

  /** @type {Feature}*/
  state.featurePtr = feature;

  /** @type {Logger}*/
  state.logger = logger;

  state.feature = {
    name: '',
    featureName: '',
    descriptionString: '',
    /** @type {string | number}*/
    originalValue: 0,
    /** @type {string | number}*/
    curValue: 0,
    /** @type {string | number}*/
    coachValue: 0,
    histEdge: [0],
    histCount: null,
    id: 0,
    labelEncoder: {},
    description: {},
    searchValues: new Set()
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
    'lock': 'New plans won\'t change it',
  };

  let diffPickerConfig = null;
  let unsub = diffPickerConfigStore.subscribe(value => {

    // Listen to the picked event
    if (value.action === 'picked' &&
      value.feature === state.feature.featureName
    ) {
      // Log the interaction
      logger?.addLog({
        eventName: `[${feature.data.name}] diff changed`,
        elementName: 'diff picker',
        valueName: 'diff',
        oldValue: feature.difficulty,
        newValue: value.difficulty
      });

      // Update the icon
      feature.difficulty = value.difficulty;

      // Change `isConstrained` if necessary
      if (feature.difficulty === 'neutral' && feature.acceptableRange === null) {
        feature.isConstrained = false;
      } else {
        feature.isConstrained = true;
      }

      // Propagate the change to FeaturePanel
      dispatch('constraintUpdated', {
        difficulty: feature.difficulty,
        acceptableRange: encodeAcceptableRange(feature.acceptableRange)
      });
    }

    diffPickerConfig = value;
  });
  unsubscribes.push(unsub);

  let tooltipConfig = null;
  unsub = tooltipConfigStore.subscribe(value => {
    tooltipConfig = value;
  });
  unsubscribes.push(unsub);

  /**
   * A workaround to listen to changes made in the js functions.
   * @param {string | null} [key] Type of the update, can be one of ['value',
   *  null]. It triggers corresponding callbacks to update the stores.
   */
  const stateUpdated = (key=null) => {
    // Trigger svelte interactivity
    state = state;

    if (key === 'value') {
      // Propagate the change to FeaturePanel
      dispatch('curValueUpdated', {
        newValue: state.feature.curValue
      });
    }
  };
  state.stateUpdated = stateUpdated;

  /**
   * A workaround to listen to change of feature in the js functions.
   * @param {string | null} [key] If key is 'constraint', then it triggers an
   * event to the feature panel to update the global constraints.
   */
  const featureUpdated = (key=null) => {
    feature = state.featurePtr;
    state = state;

    if (key === 'constraint') {
      // Propagate the change to FeaturePanel
      dispatch('constraintUpdated', {
        difficulty: feature.difficulty,
        acceptableRange: encodeAcceptableRange(feature.acceptableRange)
      });
    }
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
      descriptionString: featureInfo.description.description,
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

    state.logger = logger;

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
   */
  const diffClickedHandler = () => {

    // If the diff picker is shown for the current feature, we stop showing
    if (diffPickerConfig.feature === state.feature.featureName &&
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
    diffPickerConfig.feature = state.feature.featureName;

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

    logger?.addLog({
      eventName: `[${state.feature.featureName}] clicked`,
      elementName: 'feature card',
      valueName: 'isCollapsed',
      oldValue: isCollapsed ? 'collapsed' : 'extended',
      newValue: !isCollapsed ? 'collapsed' : 'extended',
    });

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

    if (acceptableRange !== null && acceptableRange.length === 0) {
      return 'New plans won\'t consider this feature';
    }

    let text = 'New plans consider ';
    const levelDescription = feature.description.levelDescription;

    let acceptableRangeAll = acceptableRange;
    if (acceptableRange === null) {
      acceptableRangeAll = Object.keys(feature.labelEncoder);
    }

    text = text.concat(`"${levelDescription[
      acceptableRangeAll[0]].displayName}"`);

    for (let i = 1; i < acceptableRangeAll.length - 1; i++) {
      text = text.concat(', ', `"${
        levelDescription[acceptableRangeAll[i]].displayName
      }"`);
    }

    if (acceptableRangeAll.length == 2) {
      text = text.concat(` and "${
        levelDescription[acceptableRangeAll[1]].displayName}"`);
    } else if (acceptableRangeAll.length > 2) {
      text = text.concat(`, and "${
        levelDescription[acceptableRangeAll[acceptableRangeAll.length - 1]]
          .displayName
      }"`);
    }

    return text;
  };

  const displayLevel = (state, value) => {
    if (state.feature.description.levelDescription === undefined) {
      return '';
    } else if (state.feature.description.levelDescription[value] === undefined) {
      return '';
    } else {
      return state.feature.description.levelDescription[value].displayName;
    }
  };

  /**
   * gamcoach.js uses edge names for acceptable range, we need to translate
   * edge id to edge names
   * @param {number[]} acceptableRange Edge ids
   */
  const encodeAcceptableRange = (acceptableRange) => {
    // Need to encode the edge labels (numbers) to edge names (string)
    // gamcoach.js uses edge names for the acceptable range
    if (acceptableRange === null) return null;
    return acceptableRange.map((id) => state.feature.labelEncoder[id]);
  };

  /**
   * Handler for the reset button click event.
   * @param {MouseEvent} e Mouse event
   */
  const resetClicked = (e) => {
    e.preventDefault();
    e.stopPropagation();

    logger?.addLog({
      eventName: `[${state.feature.featureName}] reset clicked`,
      elementName: 'reset'
    });

    // Restore the cur value
    state.feature.curValue = state.feature.coachValue;
    state.stateUpdated('value');

    d3.select(component)
      .select('.svg-hist')
      .select('.y-label-group')
      .selectAll('.y-label')
      .classed('user', false);

    // Make all bars in the acceptable range
    state.feature.searchValues = new Set(state.feature.histEdge);
    feature.acceptableRange = null;
    syncBars(component, state);

    // Change difficulty to default
    feature.difficulty = 'neutral';
    feature.isConstrained = false;

    // Propagate the change to FeaturePanel
    dispatch('constraintUpdated', {
      difficulty: feature.difficulty,
      acceptableRange: encodeAcceptableRange(feature.acceptableRange)
    });
  };

  onMount(() => {
    // Bind the SVG icons on mount
    const iconList = [
      { class: 'icon-right-arrow', svg: rightArrowIcon },
      { class: 'icon-level-thumb', svg: levelThumbIcon },
      { class: 'icon-info', svg: infoIcon },
      { class: 'icon-close', svg: closeIcon },
      { class: 'icon-refresh', svg: refreshIcon },
    ];
    bindInlineSVG(component, iconList);
    mounted = true;
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
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

      <div class='feature-info'
        on:mouseenter={(e) => titleMouseenterHandler(
          e, tooltipConfig, tooltipConfigStore, state.feature.descriptionString
        )}
        on:mouseleave={(e) => titleMouseleaveHandler(
          e, tooltipConfig, tooltipConfigStore
        )}
      >
        <span class='feature-name'>
          {state.feature.name}
        </span>
      </div>

      <div class='card-icons'
        class:collapsed={isCollapsed}
        on:click={resetClicked}
      >

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
            title='Specify how easy for you to change this feature'
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
      {displayAcceptableRange(feature.acceptableRange)}
      <div class='local-tooltip'>
        <span class='content'>New strategies will only consider options within this range</span>
      </div>
    </span>

    <span class='tag difficulty-tag'
      class:shown={feature.difficulty !== 'neutral'}
    >
      <div class={`icon icon-${feature.difficulty}`}>
        {@html difficultyIconMap[feature.difficulty]}
      </div>
      {difficultyTextMap[feature.difficulty]}
      <div class='local-tooltip'>
        <span class='content'>New strategies will prioritize features that are easy for you to change</span>
      </div>
    </span>

  </div>

</div>
