<script>
  //@ts-check
  import FeaturePanel from './components/feature-panel/FeaturePanel.svelte';
  import DiffPicker from './components/DiffPicker.svelte';
  import Tooltip from './components/Tooltip.svelte';
  import CoachPanel from './components/coach-panel/CoachPanel.svelte';

  import { EBM } from './ebm/ebm';
  import d3 from './utils/d3-import';
  import { onMount } from 'svelte';
  import { tooltipConfigStore } from './store';

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;
  tooltipConfigStore.subscribe(value => {tooltipConfig = value;});

  // Set up the GAM Coach object
  let modelData = null;
  let windowLoaded = false;

  /** @type {Plans} */
  let plans = null;

  /**
   * Populate the plans.
   */
  const initPlans = () => {
    plans = {
      isRegression: false,
      regressionName: 'interest rate',
      score: 12.342,
      classes: ['loan approval', 'loan rejection'],
      classTarget: [0],
    };
  };

  /**
   * Load the model and populate the plans.
   */
  const initModel = async () => {
    modelData = await d3.json('/data/lc-classifier.json');
    console.log(modelData);

    // Initialize an EBM model
    const ebm = new EBM(modelData);
    console.log(ebm);

    const curExample = [
      17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
      'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
      '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0
    ];

    const pred = ebm.predictProb([curExample]);
    console.log(pred);

    // Initialize the plans
    initPlans();
  };

  initModel();

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
    // max-width: 990px;
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

<div class='main-standalone'>

  <Tooltip bind:this={tooltip}/>

  <div class='content'>

    <div class='coach-wrapper'>

      <div class='coach-panel-wrapper'>
        <CoachPanel plans={plans} windowLoaded={windowLoaded}/>
      </div>

      <div class='feature-panel-wrapper'>
        <FeaturePanel modelData={modelData} windowLoaded={windowLoaded} />
      </div>

      <DiffPicker/>
    </div>



  </div>


</div>