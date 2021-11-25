<script>
  import d3 from '../utils/d3-import';
  import { onMount, onDestroy } from 'svelte';

  import { tooltipConfigStore } from '../store';

  /**
   * @typedef {Object} Feature
   * @property {Object} data
   * @property {number} featureID
   * @property {boolean} isCont
   * @property {boolean} requiresInt
   * @property {Object | null}  labelEncoder
   * @property {number | string} originalValue
   * @property {number | string} coachValue
   * @property {number | string} myValue
   * @property {number} isChanged 0: no change, 1: changed by gam coach,
   *  3: changed by the user
   * @property {boolean} isConstrained
  */

  export let featuresStore = null;
  export let windowLoaded = false;

  // Component variables
  let component = null;
  let tooltipConfig = null;
  let features = [];
  const unsubscribes = [];

  // Set up tooltip
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {tooltipConfig = value;})
  );

  /**
   * Bind the features variable when the store is passed to the child here
   */
  const initFeatures = () => {
    unsubscribes.push(
      featuresStore.subscribe(value => {
        features = value;
      })
    );
  };

  /**
   * Initialize the lists panel
   */
  const initList = () => {
    console.log('received features!');
    console.log(features);

    // Randomly assign different groups to a few features
    features[0].isChanged = 1;
    features[1].isChanged = 1;
    features[2].isChanged = 1;
    features[3].isChanged = 2;
    features[4].isChanged = 2;
    features[4].isConstrained = true;
    features[5].isConstrained = true;
    features[6].isConstrained = true;
    features[7].isConstrained = true;
    features[8].isConstrained = true;
  };

  onMount(() => {
    //
  });

  onDestroy(() => {
    unsubscribes(unsub => unsub());
  });

  $: windowLoaded && featuresStore && initFeatures();
  $: windowLoaded && features.length !== 0 && initList();

</script>

<style lang='scss'>

  @import '../define';

  .list-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 400px;

    box-sizing: border-box;
    border-radius: 10px;
    background: $grey-100;
    overflow-y: auto;
  }

  .list {
    padding: 10px;
    border-bottom: 1px solid $gray-border;

    display: flex;
    flex-direction: column;
  }

  .sub-list {
    display: flex;
    flex-direction: column;

    .list-title {
      font-size: 1.1rem;
      font-weight: 400;
      font-variant: small-caps;
      color: $grey-700;
      margin: 5px 0;
    }
  }

  .list-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 3px 0;

  }

  .list-subtitle {
    font-size: 0.9rem;
    color: $grey-700;
  }

  .no-margin {
    margin: 0;
  }

</style>

<div class='list-panel' bind:this={component}>

  <!-- We split the categories into four different divs in the list -->
  <div class='list list-changed'>
    <span class='list-title no-margin'>Changed Features</span>
    <!-- <span class='list-subtitle'>Features with a different value than the original</span> -->

    <div class='sub-list list-changed-coach'>
      <span class='list-title'>suggested changes</span>

      {#each features.filter(f => f.isChanged === 1) as f (f.featureID)}
        <div class='feature-item'>
          {f.data.name}
        </div>
      {/each}
    </div>

    <div class='sub-list list-changed-me'>
      <span class='list-title'>my changes</span>

      {#each features.filter(f => f.isChanged === 1) as f (f.featureID)}
        <div class='feature-item'>
          {f.data.name}
        </div>
      {/each}
    </div>

  </div>

  <div class='list list-constrained'>
    <span class='list-title'>Configured Features</span>

    {#each features.filter(f => f.isChanged === 0 && f.isConstrained) as f (f.featureID)}
      <div class='feature-item'>
        {f.data.name}
      </div>
    {/each}
  </div>

  <div class='list list-other'>
    <span class='list-title'>Other Features</span>

    {#each features.filter(f => f.isChanged === 0 && !f.isConstrained) as f (f.featureID)}
      <div class='feature-item'>
        {f.data.name}
      </div>
    {/each}
  </div>

</div>