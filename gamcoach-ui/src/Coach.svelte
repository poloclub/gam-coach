<script>
  import FeatureCard from './components/FeatureCard.svelte';
  import FeatureCardCat from './components/FeatureCardCat.svelte';
  import FeaturePanel from './components/FeaturePanel.svelte';
  import DiffPicker from './components/DiffPicker.svelte';
  import Tooltip from './components/Tooltip.svelte';

  import d3 from './utils/d3-import';
  import { onMount } from 'svelte';

  import { tooltipConfigStore } from './store';

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;
  tooltipConfigStore.subscribe(value => {tooltipConfig = value;});

  // Set up the GAM Coach object
  let data = null;
  let windowLoaded = false;

  const initData = async() => {
    data = await d3.json('/data/lc-classifier.json');
    console.log(data);
  };

  initData();

  onMount(() => {
    window.onload = () => { windowLoaded = true; };
  });

</script>

<style lang='scss'>

  @import 'define';

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
    border: 1px solid $gray-border;
    background: white;
  }

  .coach-panel {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    width: 1000px;
    height: 160px;
    flex-shrink: 0;
    border-radius: 10px;
    background-color: $gray-100;
    font-size: 2em;
    font-weight: 600;
    // border: 1px solid $gray-border;
  }

</style>

<div class='main-standalone'>
  <div class='header'>
    <!-- <Header /> -->
  </div>

  <Tooltip bind:this={tooltip}/>

  <div class='content'>

    <div class='coach-panel'>
      Coach Panel
    </div>

    <DiffPicker/>

    <FeaturePanel data={data}
      windowLoaded={windowLoaded}
    />

    <!-- <FeatureCard featureInfo={data == null ? null : data.features[19]}
      featureID={19}
      requiresInt={true}
      originalValue={728}
      windowLoaded={windowLoaded}
    />

    <FeatureCardCat featureInfo={data == null ? null : data.features[2]}
      featureID={2}
      labelEncoder={data == null ? null : data.labelEncoder}
      originalValue={2}
      windowLoaded={windowLoaded}
    />

    <FeatureCardCat featureInfo={data == null ? null : data.features[1]}
      featureID={1}
      labelEncoder={data == null ? null : data.labelEncoder}
      originalValue={2}
      windowLoaded={windowLoaded}
    /> -->

  </div>


</div>