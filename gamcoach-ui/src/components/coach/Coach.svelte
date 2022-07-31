<script>
  //@ts-check
  import FeaturePanel from '../feature-panel/FeaturePanel.svelte';
  import CoachPanel from '../coach-panel/CoachPanel.svelte';

  import { EBM } from '../../ebm/ebm';
  import {
    Plan,
    Constraints,
    initPlans,
    regeneratePlans
  } from '../coach/Coach';
  import '../../typedef';

  import d3 from '../../utils/d3-import';
  import { Logger } from '../../utils/logger';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { fade, fly } from 'svelte/transition';
  import {
    tooltipConfigStore,
    inputFormConfigStore,
    ebmStore,
    constraintsStore,
    bookmarkConfigStore
  } from '../../store';

  // import modelDataLC from '../../config/data/lc-classifier.json';

  export let modelName = 'lc';
  // export let curModelData = modelDataLC;
  export let windowLoaded = false;
  export let curExample = null;

  /** @type {Logger} */
  export let logger = null;

  let initialized = false;
  const unsubscribes = [];

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;
  unsubscribes.push(
    tooltipConfigStore.subscribe((value) => {
      tooltipConfig = value;
    })
  );

  // Set up the input form config store
  let inputFormConfig = null;
  unsubscribes.push(
    inputFormConfigStore.subscribe((value) => (inputFormConfig = value))
  );

  // Set up the GAM Coach object
  let curModelData = null;

  /** @type {EBM} */
  let ebm = null;

  /** @type {Plans} */
  let plans = null;

  /** @type {Constraints} */
  let constraints = null;

  /**
   * Workaround to trigger an update to the plans variable.
   * @param {Plans} newPlans
   */
  const plansUpdated = (newPlans) => {
    plans = newPlans;
  };

  /**
   * Load the model and populate the plans.
   */
  const initModel = async () => {
    initialized = true;

    // Load the model data
    curModelData = await d3.json(
      `PUBLIC_URL/data/${modelName}-classifier.json`
    );
    // console.log(modelData);

    // Initialize an ebm model
    ebm = new EBM(curModelData);
    ebmStore.set(ebm);

    // Re-initialize the bookmark config
    const bookmarkConfig = {
      show: false,
      features: null,
      plans: new Map(),
      focusOutTime: 0,
      plansInfo: null
    };
    bookmarkConfigStore.set(bookmarkConfig);

    // Initialize the Constraints based on the info provided by model developers
    // Creating the constraints object can change the modelData (setting
    // the acceptance range based on the curExample)
    constraints = new Constraints(curModelData, curExample);

    constraintsStore.set(constraints);
    unsubscribes.push(
      constraintsStore.subscribe((value) => {
        constraints = value;
      })
    );

    // Initialize the plans
    await initPlans(
      curModelData,
      ebm,
      curExample,
      constraints,
      plansUpdated,
      logger
    );

    // Initialize the input form
    // inputFormConfig.ebm = ebm;
    // inputFormConfig.curExample = curExample;
    // inputFormConfigStore.set(inputFormConfig);

    // Log the plans
    logger?.addRecord('plans', plans);
  };

  onMount(() => {});

  onDestroy(() => {
    unsubscribes.forEach((unsub) => unsub());
  });

  $: curExample && !initialized && initModel();
</script>

<div class="coach-panel-wrapper">
  <CoachPanel
    {windowLoaded}
    bind:plans
    {logger}
    on:regenerateClicked={() =>
      regeneratePlans(
        constraints,
        curModelData,
        curExample,
        plans,
        plansUpdated,
        logger
      )}
  />
</div>

{#if plans === null}
  <div class="feature-panel-wrapper">
    <FeaturePanel {logger} planStore={null} {constraintsStore} />
  </div>
{:else}
  {#key plans.activePlanIndex}
    <div class="feature-panel-wrapper">
      <FeaturePanel
        {windowLoaded}
        {logger}
        planStore={plans.planStores.has(plans.activePlanIndex)
          ? plans.planStores.get(plans.activePlanIndex)
          : null}
        {constraintsStore}
      />
    </div>
  {/key}
{/if}

<style lang="scss">
  @import '../../define';

  .main-standalone {
    display: flex;
    flex-direction: column;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 10px;

    padding: 20px 0 20px 0;
    justify-content: center;
    align-items: center;

    height: calc(100vh - 20px);
    max-height: 800px;
    overflow-y: scroll;
    width: 100vw;
    box-sizing: border-box;
  }

  .coach-wrapper {
    border: 1px solid $gray-light-border;
    background: $gray-50;
    border-radius: $border-radius;
    box-shadow: 0px 2px 15px hsla(0, 0%, 0%, 0.07),
      0px 0px 5px hsla(0, 0%, 0%, 0.12);
    overflow: hidden;
    // width: 990px;
  }

  .coach-panel-wrapper {
    position: relative;
    z-index: 2;
  }

  .feature-panel-wrapper {
    position: relative;
    z-index: 1;
  }
</style>
