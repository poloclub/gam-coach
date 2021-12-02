<script>
  import FeaturePanel from './components/feature-panel/FeaturePanel.svelte';
  import DiffPicker from './components/DiffPicker.svelte';
  import Tooltip from './components/Tooltip.svelte';
  import CoachPanel from './components/coach-panel/CoachPanel.svelte';
  import ScorePanel from './components/score-panel/ScorePanel.svelte';

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

  .coach-panel-wrapper {
    position: relative;
    z-index: 2;
  }

  .feature-panel-wrapper {
    position: relative;
    z-index: 1;
  }

  .score-bar-wrapper {
    position: absolute;
    bottom: 0px;
    right: 0px;
    transform: translateY(100%);
  }

</style>

<div class='main-standalone'>

  <Tooltip bind:this={tooltip}/>

  <div class='content'>

    <div class='coach-wrapper'>

      <div class='coach-panel-wrapper'>
        <CoachPanel />
        <div class='score-bar-wrapper'>
          <ScorePanel windowLoaded={windowLoaded} />
        </div>
      </div>

      <div class='feature-panel-wrapper'>
        <FeaturePanel data={data} windowLoaded={windowLoaded} />
      </div>

      <DiffPicker/>
    </div>



  </div>


</div>