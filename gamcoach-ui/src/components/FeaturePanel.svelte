<script>
  // @ts-check
  import FeatureCard from './feature-card/FeatureCard.svelte';
  import FeatureCardCat from './feature-card-cat/FeatureCardCat.svelte';
  import ListPanel from './list-panel/ListPanel.svelte';

  import d3 from '../utils/d3-import';
  import { onMount, onDestroy } from 'svelte';
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
  let component = null;
  let features = [];

  // Bind features to a store
  const featuresStore = writable([]);
  unsubscribes.push(
    featuresStore.subscribe(value => {
      features = value;
    })
  );

  const curExample = [
    17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
    'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
    '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0
  ];

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
          acceptableRange: null
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
    flex: 1 0 auto;

    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: flex-start;
    align-items: center;

    padding: 20px 30px;
    box-sizing: border-box;
    border-top-right-radius: border-radius;
    border-bottom-right-radius: border-radius;

    overflow-y: scroll;
  }

</style>

<div class='feature-panel' bind:this={component}>

  <ListPanel featuresStore={featuresStore} windowLoaded={windowLoaded}/>

  <div class='card-panel'>

  </div>

  <!-- {#key features}
    {#each features as feature}
      {#if feature.isCont}
        <FeatureCard featureInfo={feature.data}
          featureID={feature.featureID}
          requiresInt={feature.requiresInt}
          originalValue={feature.originalValue}
        />
      {:else}
        <FeatureCardCat featureInfo={feature.data}
          featureID={feature.featureID}
          labelEncoder={feature.labelEncoder}
          originalValue={feature.originalValue}
        />
      {/if}
    {/each}
  {/key} -->

</div>