<script>
  // @ts-check
  import FeatureCard from '../feature-card/FeatureCard.svelte';
  import FeatureCardCat from '../feature-card-cat/FeatureCardCat.svelte';
  import { FeatureGrid } from './FeaturePanel';

  import d3 from '../../utils/d3-import';
  import { Logger } from '../../utils/logger';
  import { bindInlineSVG } from '../../utils/utils';
  import '../../typedef';
  import { EBMLocal } from '../../ebm/ebmLocal';
  import { Plan, Constraints } from '../coach/Coach';

  import { onMount, onDestroy, tick } from 'svelte';
  import { tooltipConfigStore } from '../../store';

  export let windowLoaded = false;
  export let planStore = null;
  export let constraintsStore = null;

  /** @type {Logger} */
  export let logger = null;

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
  let mounted = false;

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

  let maxFeatureNum = 'null';

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

    if (constraints.maxNumFeaturesToVary === null) {
      maxFeatureNum = 'null';
    } else {
      maxFeatureNum = `${constraints.maxNumFeaturesToVary}`;
    }

    // Organize the features into corresponding sections
    featureGrid.loadFeatures(plan.features, constraints);
    featureGrid = featureGrid;

    // console.log(featureGrid);
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

    // Update the store
    planStore.set(plan);
  };

  const maxFeatureNumChanged = () => {
    resizeFeatureSelect();

    if (constraints === null) return;

    const oldValue = constraints.maxNumFeaturesToVary;

    // Update the constraints
    if (maxFeatureNum === 'null') {
      constraints.maxNumFeaturesToVary = null;
    } else {
      constraints.maxNumFeaturesToVary = parseInt(maxFeatureNum);
    }
    constraintsStore.set(constraints);

    logger?.addLog({
      eventName: 'feature num changed',
      elementName: 'select',
      valueName: 'maxNumFeaturesToVary',
      oldValue,
      newValue: constraints.maxNumFeaturesToVary
    });
  };

  /**
   * Change the width of the select button so it fits the current content
   */
  const resizeFeatureSelect = () => {
    const optionMap = {
      'null': 'any number of',
      '1': 'at most one',
      '2': 'at most two',
      '3': 'at most three',
      '4': 'at most four',
    };

    const hiddenSelect = d3.select(component)
      .select('#hidden-select')
      .style('display', 'initial');

    hiddenSelect.select('#hidden-option')
      .text(optionMap[maxFeatureNum]);

    const selectWidth = hiddenSelect.node().clientWidth + 5 + 'px';
    hiddenSelect.style('display', 'none');

    d3.select(component)
      .select('#feature-num-select')
      .style('width', selectWidth);
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
      constraints.hasNewConstraints = true;
      constraintsStore.set(constraints);
    }

  };

  onMount(() => {
    mounted = true;
    const iconList = [];
    bindInlineSVG(component, iconList);
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

  $: windowLoaded && planStore && !initialized && initFeatureCards();
  $: mounted && maxFeatureNum && maxFeatureNumChanged();

</script>

<style lang='scss'>
  @import './FeaturePanel.scss';
</style>

<div class='feature-panel' bind:this={component}>

  <div class='card-block'>
    <div class='row-header'>
      <span class='label'>Suggested Changes</span>
      <span class='label'>New plans can change
        <div class='select' id='hidden-select'>
          <select>
            <option id='hidden-option'></option>
          </select>
        </div>
        <div class='select'>
          <select id='feature-num-select' bind:value={maxFeatureNum}>
            <option value='null'>any number of</option>
            <option value='1'>at most one</option>
            <option value='2'>at most two</option>
            <option value='3'>at most three</option>
            <option value='4'>at most four</option>
          </select>
        </div>
        {maxFeatureNum === '1' ? 'feature' : 'features'}
      </span>
    </div>

    <div class='card-row'>

      <div class='card-column left-column' bind:this={leftColumn}>

        {#each featureGrid.changed.left as feature}
          {#if feature.isCont}
            <FeatureCard
              feature={feature}
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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
              logger={logger}
              on:curValueUpdated={(e) => curValueUpdatedHandler(e, feature)}
              on:constraintUpdated={(e) => constraintUpdatedHandler(e, feature)}
            >
            </FeatureCard>
          {:else}
            <FeatureCardCat
              feature={feature}
              logger={logger}
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