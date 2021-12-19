<script>
  // @ts-check
  import FeatureCard from '../feature-card/FeatureCard.svelte';
  import FeatureCardCat from '../feature-card-cat/FeatureCardCat.svelte';
  import { FeatureGrid } from './FeaturePanel';

  import d3 from '../../utils/d3-import';
  import { bindInlineSVG } from '../../utils/utils';
  import '../../typedef';
  import { EBMLocal } from '../../ebm/ebmLocal';
  import { Plan, Constraints } from '../coach/Coach';

  import { onMount, onDestroy, tick } from 'svelte';
  import { tooltipConfigStore } from '../../store';

  export let planStore = null;
  export let constraintsStore = null;
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

  /** @type {Constraints} */
  let constraints = null;

  /** @type {HTMLElement}*/
  let leftColumn = null;

  /** @type {HTMLElement}*/
  let midColumn = null;

  /** @type {HTMLElement}*/
  let rightColumn = null;

  /** @type {FeatureGrid} */
  let featureGrid = new FeatureGrid();

  // Set up the GAM Coach feature cards
  const initFeatureCards = () => {
    initialized = true;

    // Subscribe to the plan store and initialize features
    unsubscribes.push(
      planStore.subscribe(value => {
        plan = value;
      })
    );

    unsubscribes.push(
      constraintsStore.subscribe(value => {
        constraints = value;
      })
    );

    // Organize the features into corresponding sections
    featureGrid.loadFeatures(plan.features, constraints);
    featureGrid = featureGrid;

    console.log(featureGrid);
  };

  /**
   * Handler when cur feature is updated by the user
   * @param {CustomEvent} e
   * @param {Feature} feature
   */
  const curValueUpdatedHandler = (e, feature) => {
    let newValue = e.detail.newValue;

    // Encode the level if it is a categorical feature
    if (feature.data.type === 'categorical') {
      newValue = feature.labelEncoder[newValue];
    }

    // Update the local EBM
    plan.ebmLocal.updateFeature(feature.data.name, newValue);

    // Update teh store
    planStore.set(plan);
  };

  /**
   * Return true if two sets are the same
   * @param {Set<object>} a
   * @param {Set<object>} b
   */
  const areSetsEqual = (a, b) => {
    return a.size === b.size && [...a].every(value => b.has(value));
  };

  /**
   * Handler when a feature constraint is updated by the user
   * @param {CustomEvent} e
   * @param {Feature} feature
   */
  const constraintUpdatedHandler = (e, feature) => {
    const curConstraint = e.detail;
    const difficulty = curConstraint.difficulty;
    const acceptableRange = curConstraint.acceptableRange;

    const name = feature.data.name;
    let needToUpdateStore = false;

    // Update existing difficulty
    if (constraints.difficulties.has(name) &&
      constraints.difficulties.get(name) !== difficulty
    ) {
      needToUpdateStore = true;

      if (difficulty !== 'neutral') {
        constraints.difficulties.set(name, difficulty);
      } else {
        constraints.difficulties.delete(name);
      }
    }

    // Add new difficulty
    if (!constraints.difficulties.has(name) && difficulty !== 'neutral') {
      needToUpdateStore = true;
      constraints.difficulties.set(name, difficulty);
    }

    // Update existing acceptable range
    if (constraints.acceptableRanges.has(name)) {

      // Remove existing acceptable range
      if (acceptableRange === null) {
        needToUpdateStore = true;
        constraints.acceptableRanges.delete(name);
      } else {
        const ranges = new Set(constraints.acceptableRanges.get(name).values());
        const newRanges = new Set(acceptableRange);
        if (!areSetsEqual(ranges, newRanges)) {
          needToUpdateStore = true;
          constraints.acceptableRanges.set(name, acceptableRange);
        }
      }
    }

    if (!constraints.acceptableRanges.has(name) && acceptableRange !== null) {
      needToUpdateStore = true;
      constraints.acceptableRanges.set(name, acceptableRange);
    }

    if (needToUpdateStore) {
      constraintsStore.set(constraints);
    }

  };

  onMount(() => {
    const iconList = [];
    bindInlineSVG(component, iconList);
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
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column mid-column' bind:this={midColumn}>

        {#each featureGrid.changed.mid as feature}
          {#if feature.isCont}
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column right-column' bind:this={rightColumn}>

        {#each featureGrid.changed.right as feature}
          {#if feature.isCont}
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
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
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column mid-column' bind:this={midColumn}>

        {#each featureGrid.configured.mid as feature}
          {#if feature.isCont}
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column right-column' bind:this={rightColumn}>

        {#each featureGrid.configured.right as feature}
          {#if feature.isCont}
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
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
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column mid-column' bind:this={midColumn}>

        {#each featureGrid.other.mid as feature}
          {#if feature.isCont}
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

      <div class='card-column right-column' bind:this={rightColumn}>

        {#each featureGrid.other.right as feature}
          {#if feature.isCont}
            <FeatureCard
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCardCat>
          {/if}
        {/each}

      </div>

    </div>
  </div>


</div>