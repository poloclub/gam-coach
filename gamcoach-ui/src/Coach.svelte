<script>
  //@ts-check
  import FeaturePanel from './components/feature-panel/FeaturePanel.svelte';
  import DiffPicker from './components/DiffPicker.svelte';
  import Tooltip from './components/Tooltip.svelte';
  import CoachPanel from './components/coach-panel/CoachPanel.svelte';

  import { EBM } from './ebm/ebm';
  import { GAMCoach } from './ebm/gamcoach';
  import { Plan, Constraints } from './Coach';
  import './typedef';

  import d3 from './utils/d3-import';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { tooltipConfigStore } from './store';

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;
  tooltipConfigStore.subscribe(value => {tooltipConfig = value;});

  // Set up the GAM Coach object
  let modelData = null;
  let windowLoaded = false;

  /** @type {EBM} */
  let ebm = null;

  /** @type {Plans} */
  let plans = null;

  /** @type {Constraints} */
  let constraints = null;

  /** @type {any[]} */
  const curExample = [
    17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
    'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
    '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0
  ];

  /**
   * Populate the plans.
   */
  const initPlans = async () => {
    /**@type {Plans}*/
    const tempPlans = {
      isRegression: false,
      regressionName: 'interest rate',
      originalScore: 12.111,
      score: 12.342,
      classes: ['loan rejection', 'loan approval'],
      classTarget: [1],
      continuousIntegerFeatures: [],
      activePlanIndex: 1,
      nextPlanIndex: 1,
      planStores: new Map()
    };

    if (modelData.isClassifier) {
      tempPlans.isRegression = false;
      tempPlans.classes = modelData.modelInfo.classes;
    } else {
      tempPlans.isRegression = true;
      tempPlans.regressionName = modelData.modelInfo.regressionName;
    }

    // Initialize the original score
    tempPlans.originalScore = ebm.predict([curExample], true)[0];

    // Update the list of continuous features that require integer values
    modelData.features.forEach(f => {
      // Need to be careful about the features that have both transforms and
      // integer requirement. For them, the integer transformation is only
      // applied visually
      if (f.type === 'continuous' && f.config.usesTransform === null &&
        f.config.requiresInt
      ) {
        tempPlans.continuousIntegerFeatures.push(f.name);
      }
    });

    plans = tempPlans;

    // Initialize the Constraints based on the info provided by model developers
    // Creating the constraints object can change the modelData (setting
    // the acceptance range based on the curExample)
    constraints = new Constraints(modelData, curExample);

    /**
     * Generate the initial 5 plans. We can use topK = 5, but we will have to
     * wait for a long time. Instead, we progressively generate these top 5
     * plans.
     */
    const coach = new GAMCoach(modelData);

    const exampleBatch = [curExample];

    const cfData = [];

    console.time(`Plan ${tempPlans.nextPlanIndex} generated`);
    let cfs = await coach.generateCfs({
      curExample: exampleBatch,
      totalCfs: 1,
      continuousIntegerFeatures: plans.continuousIntegerFeatures,
      featuresToVary: constraints.featuresToVary,
      featureRanges: constraints.featureRanges,
      featureWeightMultipliers: constraints.featureWeightMultipliers
    });
    console.timeEnd(`Plan ${tempPlans.nextPlanIndex} generated`);
    cfData.push(cfs.data[0]);

    // Convert the plan into a plan object
    let curPlan = new Plan(modelData, curExample, plans, cfs.data[0]);

    // Record the plan as a store and attach it to plans with the planIndex as
    // a key
    let curPlanStore = writable(curPlan);
    plans.planStores.set(tempPlans.nextPlanIndex, curPlanStore);
    plans.planStores = plans.planStores;

    // Generate other plans
    const totalPlanNum = 5;
    for (let i = 1; i < totalPlanNum; i++) {
      if (!cfs.isSuccessful) {
        break;
      }

      // Run gam coach
      console.time(`Plan ${tempPlans.nextPlanIndex + i} generated`);
      cfs = await coach.generateSubCfs(cfs.nextCfConfig);
      cfData.push(cfs.data[0]);

      // Get the plan object
      curPlan = new Plan(modelData, curExample, plans, cfs.data[0]);
      curPlanStore = writable(curPlan);
      plans.planStores.set(tempPlans.nextPlanIndex + i, curPlanStore);
      plans.planStores = plans.planStores;

      console.timeEnd(`Plan ${tempPlans.nextPlanIndex + i} generated`);
    }

    setTimeout(() => {
      console.log('testing to change plans');
      plans.test = 'wahaha';
    }, 2000);

  };

  /**
   * Load the model and populate the plans.
   */
  const initModel = async () => {
    modelData = await d3.json('/data/lc-classifier.json');
    console.log(modelData);

    // Initialize an EBM model
    ebm = new EBM(modelData);

    const pred = ebm.predictProb([curExample]);

    // Initialize the plans
    await initPlans();
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
    // width: 990px;
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
        <CoachPanel bind:plans={plans} windowLoaded={windowLoaded}/>
      </div>

      <div class='feature-panel-wrapper'>
        <FeaturePanel
          planStore={plans && plans.planStores.has(plans.activePlanIndex) ?
            plans.planStores.get(plans.activePlanIndex) : null}
          windowLoaded={windowLoaded} />
      </div>

      <DiffPicker/>
    </div>

  </div>


</div>