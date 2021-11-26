<script>
  import FeatureCard from './components/feature-card/FeatureCard.svelte';
  import FeatureCardCat
    from './components/feature-card-cat/FeatureCardCat.svelte';
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
  }

  .coach-wrapper {
    border: 1px solid $gray-light-border;
    background: $gray-50;
    border-radius: $border-radius;
    box-shadow: 0px 2px 15px hsla(0, 0%, 0%, 0.07),
      0px 0px 5px hsla(0, 0%, 0%, 0.12);
  }

  .coach-panel {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    width: 1000px;
    height: 160px;
    flex: 1 0 auto;

    font-size: 2em;
    font-weight: 600;

    border-top-left-radius: $border-radius;
    border-top-right-radius: $border-radius;
    border-bottom: 1px solid $gray-light-border;
  }

</style>

<div class='main-standalone'>
  <div class='header'>
    <!-- <Header /> -->
  </div>

  <Tooltip bind:this={tooltip}/>

  <div class='content'>

    <div class='coach-wrapper'>
      <div class='coach-panel'>
        Coach Panel
      </div>

      <FeaturePanel data={data}
        windowLoaded={windowLoaded}
      />

      <DiffPicker/>
    </div>



  </div>


</div>