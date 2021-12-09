<script>
  // @ts-check
  import FeatureCard from '../feature-card/FeatureCard.svelte';
  import FeatureCardCat from '../feature-card-cat/FeatureCardCat.svelte';
  import { FeatureGrid, initFeatures } from './FeaturePanel';

  import d3 from '../../utils/d3-import';
  import '../../typedef';
  import { EBMLocal } from '../../ebm/ebmLocal';

  import { onMount, onDestroy, tick } from 'svelte';
  import { writable } from 'svelte/store';
  import { tooltipConfigStore } from '../../store';

  export let modelData = null;
  export let windowLoaded = false;

  const unsubscribes = [];

  // Set up tooltip
  let tooltipConfig = null;
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {tooltipConfig = value;})
  );

  // Component variables
  /** @type {HTMLElement}*/
  let component = null;

  let svg = null;

  /** @type {HTMLElement}*/
  let leftColumn = null;

  /** @type {HTMLElement}*/
  let midColumn = null;

  /** @type {HTMLElement}*/
  let rightColumn = null;

  /** @type {Feature[]} */
  let features = [];

  /** @type {Feature[]} */
  let displayFeatures = [];

  /** @type {EBMLocal} */
  let ebmLocal = null;

  /** @type {FeatureGrid} */
  let featureGrid = new FeatureGrid();

  const curExample = [
    17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
    'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
    '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0
  ];

  const preProcessSVG = (svgString) => {
    return svgString.replaceAll('black', 'currentcolor')
      .replaceAll('fill:none', 'fill:currentcolor')
      .replaceAll('stroke:none', 'stroke:currentcolor');
  };

  /**
   * Dynamically bind SVG files as inline SVG strings in this component
   */
  export const bindInlineSVG = (component) => {
    const iconList = [];

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
   * Run this function every time there is a new value of features form the store
   */
  const featureUpdatedFromStore = async () => {
    // Check if we should schedule card to be displayed
    let updateStoreAgain = false;
    for (let i = 0; i < features.length; i ++) {
      const f = features[i];
      if (f.display === 1) {
        // Push the feature card to the shorter panel
        // const leftBBox = leftPanel.getBoundingClientRect();
        // const rightBBox = rightPanel.getBoundingClientRect();

        // f.display = leftBBox.height <= rightBBox.height ? 2 : 3;
        // displayFeatures.push(f);
        // displayFeatures = displayFeatures;
        // await tick();
        updateStoreAgain = true;
      } else if (f.display === 0) {
        // Remove if from the display list
        const target = displayFeatures.indexOf(f);
        if (target !== -1) {
          displayFeatures.splice(target, 1);
          displayFeatures = displayFeatures;
        }
      }
    }

    if (updateStoreAgain) {
      featuresStore.set(features);
    }
  };

  // Bind features to a store
  const featuresStore = writable([]);
  unsubscribes.push(
    featuresStore.subscribe(value => {
      features = value;
      // featureUpdatedFromStore();
    })
  );

  /**
   * Temporarily assign some values to some features.
   */
  const tempInit = () => {

    console.log('received features!');
    console.log(features);

    // Randomly assign different groups to a few features
    features[0].isChanged = 1;
    features[0].coachValue = 2;
    features[2].isChanged = 1;
    features[2].coachValue = 5;
    features[2].isConstrained = true;
    features[2].acceptableRange = [5.28, 20.55];
    features[4].isChanged = 1;
    features[4].coachValue = 12445;
    features[4].isConstrained = true;
    features[4].difficulty = 'easy';
    features[5].isConstrained = true;
    features[5].difficulty = 'easy';
    features[5].acceptableRange = [1, 2, 3];
    features[7].isConstrained = true;
    features[7].acceptableRange = [2, 10];
    features[8].isConstrained = true;
    features[8].acceptableRange = [3.5, 5.5];
    features[15].isChanged = 1;
    features[15].coachValue = 6;

    // Tell feature panel to display features that are changed
    features.forEach(f => {
      if (f.isChanged === 1) {
        f.display = 1;
      }
    });
  };

  // Set up the GAM Coach feature cards
  const initFeatureCards = () => {
    // Initialize the features with model data
    features = initFeatures(modelData, curExample);

    // Initialize the local ebm
    ebmLocal = new EBMLocal(modelData, curExample);

    // Temp change the features
    tempInit();
    features = features;

    // Organize the features into corresponding sections
    featureGrid.loadFeatures(features);
    featureGrid = featureGrid;

    console.log(featureGrid);

    // Update the feature store
    featuresStore.set(features);
    console.log(features);
  };

  onMount(() => {
    // initScoreBar();
    bindInlineSVG(component);
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

  $: windowLoaded && modelData && initFeatureCards();

</script>

<style lang='scss'>
  @import './FeaturePanel.scss';
</style>

<div class='feature-panel' bind:this={component}>

  <!-- <div class='score-bar'>
    <svg class='score-bar-svg'></svg>
  </div> -->

  <div class='card-block'>
    <div class='row-header'>
      <span class='label'>Suggested Changes</span>
    </div>

    <div class='card-row'>

      <div class='card-column left-column' bind:this={leftColumn}>

        {#each featureGrid.changed.left as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column mid-column' bind:this={midColumn}>

        {#each featureGrid.changed.mid as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column right-column' bind:this={rightColumn}>

        {#each featureGrid.changed.right as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

    </div>
  </div>

  <div class='card-block'>
    <div class='row-header'>
      <span class='label'>Configured Features</span>
    </div>

    <div class='card-row'>

      <div class='card-column left-column' bind:this={leftColumn}>

        {#each featureGrid.configured.left as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column mid-column' bind:this={midColumn}>

        {#each featureGrid.configured.mid as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column right-column' bind:this={rightColumn}>

        {#each featureGrid.configured.right as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

    </div>
  </div>

  <div class='card-block'>
    <div class='row-header'>
      <span class='label'>Other Features</span>
    </div>

    <div class='card-row'>

      <div class='card-column left-column' bind:this={leftColumn}>

        {#each featureGrid.other.left as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column mid-column' bind:this={midColumn}>

        {#each featureGrid.other.mid as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column right-column' bind:this={rightColumn}>

        {#each featureGrid.other.right as feature}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

    </div>
  </div>


</div>