<script>
  import d3 from '../utils/d3-import';
  import { onMount, onDestroy } from 'svelte';

  import { tooltipConfigStore } from '../store';

  /**
   * @typedef Feature
   * @type {Object}
   * @property {Object} data
   * @property {number} featureID
   * @property {boolean} isCont
   * @property {boolean} requiresInt
   * @property {Object | null}  labelEncoder
   * @property {number | string} originalValue
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
    background: $grey-300;
  }

</style>

<div class='list-panel' bind:this={component}>

  <!-- We split the categories into four different divs in the list -->
  <div class='list-changed'>

    <div class='list-changed-coach'>

    </div>

    <div class='list-changed-me'>

    </div>

  </div>

  <div class='list-constrained'>

  </div>

  <div class='list-other'>

  </div>

</div>