<script>
  import d3 from '../utils/d3-import';
  import { onMount, afterUpdate } from 'svelte';
  import { tooltipConfigStore, diffPickerConfigStore } from '../store';

  import {initSlider, moveThumb, initHist} from './FeatureCardCat';

  import rightArrowIcon from '../img/icon-right-arrow.svg';
  import levelThumbIcon from '../img/icon-level-thumb.svg';
  import easyIcon from '../img/icon-easy.svg';
  import veryEasyIcon from '../img/icon-very-easy.svg';
  import neutralIcon from '../img/icon-neutral.svg';
  import hardIcon from '../img/icon-hard.svg';
  import veryHardIcon from '../img/icon-very-hard.svg';
  import lockIcon from '../img/icon-lock.svg';
  import infoIcon from '../img/icon-info.svg';

  export let featureInfo = null;
  export let labelEncoder = null;
  export let originalValue = null;
  export let featureID = null;
  export let windowLoaded = false;

  let toFitSize = false;
  let toCenterLabels = false;

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

  state.feature = {
    name: '',
    featureName: '',
    originalValue: 0,
    curValue: 0,
    coachValue: 0,
    histEdge: [0],
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

  // Translate category index to alphabetic
  const categoryLabels = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',  'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

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
   * Put labels to the right positions on the slider
   */
  const recenterSliderLabels = () => {
    // Get the label width
    const labelWidth = d3.select(component)
      .select('.track-label')
      .node()
      .getBoundingClientRect().width;

    // Re-position the track labels
    state.feature.histEdge.forEach((d) => {
      let curX = state.xCenters[d] - labelWidth / 2;

      d3.select(component)
        .select(`#track-label-${d}`)
        .style('left', `${curX}px`);

      d3.select(component)
        .select(`#track-point-${d}`)
        .style('left', `${state.xCenters[d] - 1}px`);
    });

    // Initialize the slider
    initSlider(component, state);
  };

  /**
   * Init the states of different elements. Some functions require bbox,
   * which is only accurate after content is loaded
   */
  const initFeatureCard = () => {
    console.log(featureInfo);

    // Initialize the feature data from the prop
    state.feature = {
      name: featureInfo.description.displayName,
      featureName: featureInfo.name,
      originalValue: originalValue,
      curValue: 1,
      coachValue: 755,
      histEdge: featureInfo.histEdge,
      histCount: featureInfo.histCount,
      id: featureID,
      stateUpdated: stateUpdated,
      labelEncoder: labelEncoder[featureInfo.name],
    };

    toFitSize = true;

    // Init the slider
    // initSlider(component, state);

    // Init the histogram
    // Record the x center values for each bar. The original return value is
    // at the global absolute coordinate. Convert it to local coordinate here.
    let tempXCenters = initHist(component, state);

    const trackX = d3.select(component).select('.track').node().getBoundingClientRect().x;

    // Level label starts from 1, we add a placeholder to index 0
    state.xCenters = [0];
    tempXCenters.forEach(x => {state.xCenters.push(x - trackX);});


    // Need to wait the view is updated so we can recenter labels
    toCenterLabels = true;
  };

  /**
   * Handler for clicking the difficulty picker
   * @param e Event
   */
  const diffClickedHandler = () => {
    // Trigger the difficulty picker
    // Figure out the location to put the picker
    let bbox = d3.select(component)
      .select('.feature-difficulty')
      .node()
      .getBoundingClientRect();

    let newX = bbox.x + bbox.width / 2 - diffPickerConfig.width / 4 - 2;
    let newY = bbox.y - diffPickerConfig.height - 8;

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
    let featureNameElem = d3.select(component)
      .select('.feature-name');

    let fontSize = parseFloat(window.getComputedStyle(featureNameElem.node()).fontSize);
    let nameHeight = featureNameElem.node().clientHeight;
    let parentHeight = featureNameElem.node().parentNode.clientHeight;

    if(nameHeight > parentHeight) {
      fontSize -= 0.5;
      featureNameElem.style('font-size', `${fontSize}px`);
      fitFeatureName();
    }
  };

  afterUpdate(() => {
    if (toFitSize) {
      fitFeatureName();
      toFitSize = false;
    }

    if (toCenterLabels) {
      recenterSliderLabels();
      toCenterLabels = false;
    }
  });

  onMount(() => {
    // Bind the SVG icons on mount
    bindInlineSVG(component);
  });

  $: featureInfo && labelEncoder && windowLoaded && initFeatureCard();

</script>

<style lang="scss">
  @import './FeatureCard.scss';
  @import './FeatureCardCat.scss';
</style>

<div class='feature-card' bind:this={component}>

  <div class='feature-header'>

    <div class='feature-info'>
      <span class='feature-name'>
        {state.feature.name}
      </span>

      <div class='feature-difficulty' on:click={diffClickedHandler}>
        <div class={`svg-icon icon-${state.difficulty}`}></div>
      </div>
    </div>

    {#if state.feature.originalValue === state.feature.curValue}

      <div class='values'>
        <span class='value-label'>
          {categoryLabels[state.feature.originalValue]}
        </span>
      </div>

    {:else}

      <div class='values'>
        <span class='value-label'>
          {categoryLabels[state.feature.originalValue]}
        </span>

        <div class='feature-arrow'>
          <div class='arrow-right'></div>
        </div>

        <span class='value-label'>
          {categoryLabels[state.feature.curValue]}
        </span>
      </div>

    {/if}

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

      {#each state.feature.histEdge as level}
        <div class='track-label' id={`track-label-${level}`}>
          <div class='value-label'>
            {categoryLabels[level]}
          </div>
        </div>

        <div class='track-point' id={`track-point-${level}`}>
        </div>
      {/each}

      <div id='slider-level-thumb'
        tabindex='-1'
        class='svg-icon icon-level-thumb thumb'>
        <div class='thumb-label thumb-label-middle'>
          <span class='thumb-label-span'>{state.feature.curValue}</span>
        </div>
      </div>

    </div>

  </div>


</div>
