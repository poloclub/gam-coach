<script>
  import FeatureCard from './components/FeatureCard.svelte';
  import DiffPicker from './components/DiffPicker.svelte';
  import Tooltip from './components/Tooltip.svelte';
  import d3 from './utils/d3-import';

  import { tooltipConfigStore } from './store';

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;
  tooltipConfigStore.subscribe(value => {tooltipConfig = value;});

  // Set up the GAM Coach object
  let data = null;

  const initData = async() => {
    data = await d3.json('/data/lc-classifier.json');
    console.log(data);
  };

  initData();

</script>

<style lang='scss'>

  @import 'define';

  .main-standalone {
    display: flex;
    flex-direction: column;
  }

  .content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 50px;
    padding: 30px 0 30px 0;
    justify-content: center;
    align-items: center;
    height: calc(100vh - 50px);
    max-height: 800px;
    overflow-y: scroll;
    width: 100vw;
    box-sizing: border-box;
    border: 1px solid $gray-border;
    background: $coolGray-200;
  }


</style>

<div class='main-standalone'>
  <div class='header'>
    <!-- <Header /> -->
  </div>

  <Tooltip bind:this={tooltip}/>

  <div class='content'>

    <!-- <FeatureCard featureInfo={data == null ? null : data.features[17]}
      featureID={17}
      requiresInt={true}
      originalValue={728}
    /> -->

    <DiffPicker on:selected={(e) => {console.log(e.detail)}}/>

    <!-- <FeatureCard featureInfo={data == null ? null : data.features[17]}
      featureID={15}
      requiresInt={true}
      originalValue={728}
    /> -->

  </div>


</div>