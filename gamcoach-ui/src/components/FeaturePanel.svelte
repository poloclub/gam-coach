<script>
  import FeatureCard from './FeatureCard.svelte';
  import FeatureCardCat from './FeatureCardCat.svelte';

  import d3 from '../utils/d3-import';
  import { onMount } from 'svelte';

  import { tooltipConfigStore } from '../store';

  export let data = null;
  export let windowLoaded = false;

  // Set up tooltip
  let tooltipConfig = null;
  tooltipConfigStore.subscribe(value => {tooltipConfig = value;});

  // Component variables
  let component = null;
  let features = [];

  let curExample = [
    17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
    'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
    '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0
  ];

  // Set up the GAM Coach feature cards
  const initFeatureCards = () => {
    console.log(data);

    let tempFeatures = [];

    // Convert categorical label to level ID
    let labelDecoder = {};
    Object.keys(data.labelEncoder).forEach(f => {
      labelDecoder[f] = {};
      Object.keys(data.labelEncoder[f]).forEach(l => {
        labelDecoder[f][data.labelEncoder[f][l]] = +l;
      });
    });

    for (let i = 0; i < data.features.length; i++) {
      let curType = data.features[i].type;
      let curFeature;

      if (curType === 'continuous') {
        curFeature = {
          data: data.features[i],
          featureID: i,
          isCont: true,
          requiresInt: false,
          originalValue: curExample[i]
        };
      } else if (curType === 'categorical') {
        curFeature = {
          data: data.features[i],
          featureID: i,
          isCont: false,
          labelEncoder: data.labelEncoder[data.features[i].name],
          originalValue: labelDecoder[data.features[i].name][curExample[i]]
        };
      }

      tempFeatures.push(curFeature);
    }

    features = tempFeatures.slice(0, 12);
    console.log(features);
  };

  onMount(() => {
    //
  });

  $: windowLoaded && data && initFeatureCards();

</script>

<style lang='scss'>

  @import '../define';

  .main-standalone {
    display: flex;
    flex-direction: column;
  }

  .feature-panel {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: flex-start;
    align-items: center;

    padding: 20px 30px;
    box-sizing: border-box;
    border-radius: 10px;
    background: hsl(220, 13%, 88%);

    width: 1000px;
    max-height: 600px;

    overflow-y: scroll;
  }

</style>

<div class='feature-panel' bind:this={component}>

  {#key features}
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
  {/key}

</div>