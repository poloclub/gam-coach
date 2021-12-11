<script>
  // @ts-check
  import FeatureCard from '../feature-card/FeatureCard.svelte';
  import FeatureCardCat from '../feature-card-cat/FeatureCardCat.svelte';
  import { FeatureGrid } from './FeaturePanel';

  import d3 from '../../utils/d3-import';
  import '../../typedef';
  import { EBMLocal } from '../../ebm/ebmLocal';
  import { Plan } from '../../Coach';

  import { onMount, onDestroy, tick } from 'svelte';
  import { tooltipConfigStore } from '../../store';

  export let planStore = null;
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
  let initialized = false;

/** @type {Plan} */
  let plan = null;

  /** @type {HTMLElement}*/
  let leftColumn = null;

  /** @type {HTMLElement}*/
  let midColumn = null;

  /** @type {HTMLElement}*/
  let rightColumn = null;

  /** @type {FeatureGrid} */
  let featureGrid = new FeatureGrid();

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
   * Temporarily assign some values to some features.
   */
  const tempInit = () => {

    console.log('received features!');

    // Randomly assign different groups to a few features
    plan.features[2].isConstrained = true;
    plan.features[2].acceptableRange = [5.28, 20.55];
    plan.features[4].isConstrained = true;
    plan.features[4].difficulty = 'easy';
    plan.features[5].isConstrained = true;
    plan.features[5].difficulty = 'easy';
    plan.features[5].acceptableRange = [1, 2, 3];
    plan.features[7].isConstrained = true;
    plan.features[7].acceptableRange = [2, 10];
    plan.features[8].isConstrained = true;
    plan.features[8].acceptableRange = [3.5, 5.5];
  };

  // Set up the GAM Coach feature cards
  const initFeatureCards = () => {
    initialized = true;

    // Subscribe to the plan store and initialize features
    unsubscribes.push(
      planStore.subscribe(value => {
        plan = value;
      })
    );

    // Initialize the local ebm
    // ebmLocal = new EBMLocal(modelData, curExample);

    // Temp change the features
    tempInit();
    // plan = plan;

    // Organize the features into corresponding sections
    featureGrid.loadFeatures(plan.features);
    featureGrid = featureGrid;

    console.log(featureGrid);
  };

  onMount(() => {
    bindInlineSVG(component);
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

  $: windowLoaded && planStore && !initialized && initFeatureCards();

</script>

<style lang='scss'>
  @import './FeaturePanel.scss';
</style>

<div class='feature-panel' bind:this={component}>

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