<script>
  // @ts-check
  import FeatureCard from './feature-card/FeatureCard.svelte';
  import FeatureCardCat from './feature-card-cat/FeatureCardCat.svelte';
  import ListPanel from './list-panel/ListPanel.svelte';

  import d3 from '../utils/d3-import';
  import '../typedef';
  import { onMount, onDestroy, tick } from 'svelte';
  import { writable } from 'svelte/store';

  import { tooltipConfigStore } from '../store';

  export let data = null;
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

  /** @type {HTMLElement}*/
  let leftPanel = null;

  /** @type {HTMLElement}*/
  let rightPanel = null;

  /** @type {Feature[]} */
  let features = [];

  /** @type {Feature[]} */
  let displayFeatures = [];

  const curExample = [
    17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
    'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
    '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0
  ];

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
        const leftBBox = leftPanel.getBoundingClientRect();
        const rightBBox = rightPanel.getBoundingClientRect();

        f.display = leftBBox.height <= rightBBox.height ? 2 : 3;
        displayFeatures.push(f);
        displayFeatures = displayFeatures;
        await tick();
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
      featureUpdatedFromStore();
    })
  );

  // Set up the GAM Coach feature cards
  const initFeatureCards = () => {
    const tempFeatures = [];

    // Convert categorical label to level ID
    const labelDecoder = {};
    Object.keys(data.labelEncoder).forEach(f => {
      labelDecoder[f] = {};
      Object.keys(data.labelEncoder[f]).forEach(l => {
        labelDecoder[f][data.labelEncoder[f][l]] = +l;
      });
    });

    for (let i = 0; i < data.features.length; i++) {
      const curType = data.features[i].type;

      // Define the feature type
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
       * @property {number} difficulty 1-5: increasing levels of difficulty, 6
       *  means impossible
       * @property {number[] | null} acceptableRange acceptable
       *  ranges of values
       * @property {number} display 0: no display, 1: to display, 2: scheduled to
       *  display on the left panel, 3: scheduled to display on the right panel
      */

      if (curType !== 'interaction') {
        /** @type {Feature} */
        const curFeature = {
          data: data.features[i],
          featureID: i,
          isCont: true,
          requiresInt: false,
          labelEncoder: null,
          originalValue: curExample[i],
          coachValue: curExample[i],
          myValue: curExample[i],
          isChanged: 0,
          isConstrained: false,
          difficulty: 3,
          acceptableRange: null,
          display: 0
        };

        if (curType === 'categorical') {
          curFeature.isCont = false;
          curFeature.requiresInt = false;
          curFeature.labelEncoder = data.labelEncoder[data.features[i].name];
          curFeature.originalValue =
            labelDecoder[data.features[i].name][curExample[i]];
          curFeature.coachValue = curFeature.originalValue;
          curFeature.myValue = curFeature.originalValue;
        }

        tempFeatures.push(curFeature);
      }
    }

    // Sort the features based on the importance
    tempFeatures.sort((a, b) => b.data.importance - a.data.importance);

    features = tempFeatures;
    featuresStore.set(features);
    console.log(features);
  };

  onMount(() => {
    //
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

  $: windowLoaded && data && initFeatureCards();

</script>

<style lang='scss'>

  @import '../define';

  .feature-panel {
    flex: 1 0 auto;

    display: flex;
    flex-direction: row;

    width: 1000px;
    max-height: 600px;
    border-radius: $border-radius;
  }

  .card-panel {
    flex: 1 1 auto;
    display: flex;
    flex-direction: row;
    gap: 20px;
    padding: 20px 0px 10px 0px;
    justify-content: center;
    align-items: flex-start;

    box-sizing: border-box;
    border-bottom-right-radius: $border-radius;
    background: hsla(0, 0%, 99.5%, 1);
    overflow-y: scroll;
  }

  .sub-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

</style>

<div class='feature-panel' bind:this={component}>

  <ListPanel featuresStore={featuresStore} windowLoaded={windowLoaded}/>

  <div class='card-panel'>

    <div class='sub-panel left-panel' bind:this={leftPanel}>


      {#each displayFeatures as feature}
        {#if feature.display === 2}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/if}
      {/each}

      <!-- <div class='feature-card'>
        <FeatureCard feature={features[1]}>
        </FeatureCard>
      </div>

      <div class='feature-card'>
        <FeatureCard feature={features[1]}>
        </FeatureCard>
      </div> -->

    </div>

    <div class='sub-panel right-panel' bind:this={rightPanel}>

      {#each displayFeatures as feature}
        {#if feature.display === 3}
          {#if feature.isCont}
            <FeatureCard feature={feature}>
            </FeatureCard>
          {:else}
            <FeatureCardCat feature={feature}>
            </FeatureCardCat>
          {/if}
        {/if}
      {/each}

      <!-- <div class='feature-card'>
        <FeatureCardCat feature={features[15]}>
        </FeatureCardCat>
      </div> -->

    </div>

  </div>


  <!-- {#key features}
    {#each features as feature}
      {#if feature.isCont}
        <FeatureCard feature={feature}>
        </FeatureCard>
      {:else}
        <FeatureCardCat feature={feature}>
        </FeatureCardCat>
      {/if}
    {/each}
  {/key} -->

</div>