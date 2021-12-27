import '../../typedef';
import { EBMLocal } from '../../ebm/ebmLocal';
import { EBM } from '../../ebm/ebm';
import { round } from '../../utils/utils';
import { GAMCoach } from '../../ebm/gamcoach';
import { writable } from 'svelte/store';
import { Logger } from '../../utils/logger';

const difficultyTextMap = {
  1: 'very-easy',
  2: 'easy',
  3: 'neutral',
  4: 'hard',
  5: 'very-hard',
  6: 'lock'
};

/**
 * Class that represents one plan to change the AI decisions
 */
export class Plan {
  /** @type{Feature[]} */
  features;

  /** @type{EBMLocal} */
  ebmLocal;

  /** @type{number} The raw score of the EBM output on the original sample */
  originalScore;

  /** @type{object[]} The sample generated by GAM Coach*/
  coachSample;

  /** @type{object[]} The initial sample */
  curExample;

  /** @type{number} */
  planIndex;

  /**
   * Initialize a Plan object
   * @param {object} modelData Loaded model data
   * @param {object[]} curExample Current sample values
   * @param {Plans} plans
   * @param {object[]} cfData The data of CFs returned from GAMCoach
   * @param {number} planIndex The index of this plan
   */
  constructor(modelData, curExample, plans, cfData, planIndex) {
    this.features = this.initFeatures(modelData, curExample, cfData);
    this.coachSample = cfData;
    this.curExample = curExample;
    this.planIndex = planIndex;

    // Initialize an EBM model associating with the plan
    this.ebmLocal = new EBMLocal(modelData, cfData);

    this.originalScore = plans.originalScore;
  }

  /**
   * Initialize the features
   * @param modelData
   * @param curExample
   * @param cfData
   */
  initFeatures(modelData, curExample, cfData) {
    /** @type{Feature[]} */
    const features = [];

    // Convert categorical label to level ID
    const labelDecoder = {};
    Object.keys(modelData.labelEncoder).forEach((f) => {
      labelDecoder[f] = {};
      Object.keys(modelData.labelEncoder[f]).forEach((l) => {
        labelDecoder[f][modelData.labelEncoder[f][l]] = +l;
      });
    });

    for (let i = 0; i < modelData.features.length; i++) {
      const curType = modelData.features[i].type;

      if (curType !== 'interaction') {
        const config = modelData.features[i].config;

        /** @type {Feature} */
        const curFeature = {
          data: modelData.features[i],
          featureID: i,
          isCont: true,
          requiresInt: config.requiresInt,
          labelEncoder: null,
          originalValue: curExample[i],
          coachValue: cfData[i],
          myValue: cfData[i],
          isChanged: cfData[i] === curExample[i] ? 0 : 1,
          difficulty: difficultyTextMap[config.difficulty],
          isConstrained: false,
          acceptableRange: config.acceptableRange,
          transform: config.usesTransform,
          description: modelData.features[i].description
        };

        if (curType === 'categorical') {
          curFeature.isCont = false;
          curFeature.requiresInt = false;
          curFeature.labelEncoder =
            modelData.labelEncoder[modelData.features[i].name];

          // Decode the category to number
          curFeature.originalValue =
            labelDecoder[modelData.features[i].name][curExample[i]];
          curFeature.coachValue =
            labelDecoder[modelData.features[i].name][cfData[i]];
          curFeature.myValue =
            labelDecoder[modelData.features[i].name][cfData[i]];
        }

        curFeature.isConstrained =
          curFeature.difficulty !== 'neutral' ||
          curFeature.acceptableRange !== null;

        features.push(curFeature);
      }
    }

    // Sort the features based on the importance
    features.sort((a, b) => b.data.importance - a.data.importance);

    return features;
  }

  /**
   * True if the current sample is changed by the user
   */
  get isChangedByUser() {
    // Compare the current sample with the saved coach sample
    let isChanged = false;
    this.ebmLocal.sample.forEach((d, i) => {
      if (this.coachSample[i] !== d) {
        isChanged = true;
        return isChanged;
      }
    });
    return isChanged;
  }

  /**
   * Create a cleaner copy (without features data) for the current plan
   */
  getCleanPlanCopy() {
    const planCopy = {};

    planCopy.ebmLocal = {
      pred: this.ebmLocal.pred,
      predScore: this.ebmLocal.predScore,
      predProb: this.ebmLocal.predProb,
      sample: this.ebmLocal.sample.slice()
    };

    planCopy.originalScore = this.originalScore;
    planCopy.coachSample = this.coachSample.slice();
    planCopy.curExample = this.curExample.slice();
    planCopy.planIndex = this.planIndex;

    return planCopy;
  }
}

export class SavedPlan {
  /**
   * @param {number} planIndex
   * @param {EBMLocal} ebmLocal
   * @param {object[]} curExample
   */
  constructor(planIndex, ebmLocal, curExample) {
    this.planIndex = planIndex;
    this.ebmLocal = ebmLocal;
    this.sample = ebmLocal.sample;
    this.score = ebmLocal.predScore;
    this.curExample = curExample;
  }

  /**
   * Get a list of changes that this plan suggest to make.
   * @param {Feature[]} features
   * @returns
   */
  getChangeList(features) {
    const changeList = [];

    // Iterate through the samples to register changes
    for (let i = 0; i < features.length; i++) {
      if (this.sample[i] !== this.curExample[i]) {
        const curFeature = features.filter(f => f.featureID === i)[0];
        let originalValue = this.curExample[i];
        let newValue = this.sample[i];
        let changeValue = null;

        // Encode the values if it is a categorical variable
        // We need to first convert the string value to a number index, then
        // convert the number index to the level description string
        if (!curFeature.isCont) {
          const labelDecoder = new Map();

          Object.entries(curFeature.labelEncoder).
            forEach(([level, levelName]) => {
              labelDecoder.set(levelName,
                curFeature.description.levelDescription[level].displayName);
            });

          originalValue = labelDecoder.get(originalValue);
          newValue = labelDecoder.get(newValue);
        } else {
          // For continuous values, we need to check if it has transformation
          if (curFeature.transform === 'log10') {
            if (curFeature.requiresInt) {
              originalValue = round(Math.pow(10, originalValue), 0);
              newValue = round(Math.pow(10, newValue), 0);
              changeValue = newValue - originalValue;
            } else {
              originalValue = Math.pow(10, originalValue);
              newValue = Math.pow(10, newValue);
              changeValue = newValue - originalValue;
            }
          } else {
            changeValue = newValue - originalValue;
          }
        }

        changeList.push({
          featureDisplayName: curFeature.description.displayName,
          originalValue,
          newValue,
          changeValue,
          isCont: curFeature.isCont
        });
      }
    }

    return changeList;
  }
}

export class Constraints {
  /** @type {Map<string, string>} A map from feature name to the difficulty
   * string (very easy, easy, neutral, hard, very hard, lock)
   */
  difficulties;

  /** @type {Map<string, number[]>} A map from feature name to the acceptable
   * range. For continuous features, the range is [min, max]; for categorical
   * features, the range is [level1, level2, ...] where each level is a number.
   */
  acceptableRanges;

  /** @type {string[]} */
  allFeatureNames = [];

  /** @type {string[]} */
  allFeatureDisplayNames = [];

  /** @type {string[]} */
  allFeatureTransforms = [];

  /** @type {object} */
  labelDecoder = {};

  /**
   * Initialize the Constraints object. It might modify the modelData as some
   * features only allow increasing/decreasing features. The initializer would
   * create the acceptable range based on the curExample
   * @param {object} modelData
   * @param {object[]} curExample
   */
  constructor(modelData, curExample) {
    this.difficulties = new Map();
    this.acceptableRanges = new Map();
    this.labelDecoder = {};

    console.log(modelData);

    // Iterate through the features to search for pre-defined constraints
    modelData.features.forEach((f, i) => {
      if (f.type === 'continuous' || f.type === 'categorical') {
        this.allFeatureNames.push(f.name);
        this.allFeatureDisplayNames.push(f.description.displayName);
        this.allFeatureTransforms.push(f.config.usesTransform);

        if (f.type === 'categorical') {
          const labelDecoder = {};

          Object.entries(modelData.labelEncoder[f.name]).forEach(
            ([level, levelName]) => {
              labelDecoder[levelName] =
                f.description.levelDescription[level].displayName;
            }
          );

          this.labelDecoder[f.name] = labelDecoder;
        }

        if (f.config.difficulty !== 3) {
          this.difficulties.set(f.name, difficultyTextMap[f.config.difficulty]);
        }

        if (f.config.acceptableRange !== null) {
          this.acceptableRanges.set(f.name, f.config.acceptableRange);
        } else {
          if (f.config.requiresIncreasing) {
            // Impose acceptable range to be [cur value, max value]
            const featureMax = f.binEdge[f.binEdge.length - 1];
            f.config.acceptableRange = [curExample[i], featureMax];
            this.acceptableRanges.set(f.name, f.config.acceptableRange);
          } else if (f.config.requiresDecreasing) {
            // Impose acceptable range to be [min value, cur value]
            const featureMin = f.binEdge[0];
            f.config.acceptableRange = [featureMin, curExample[i]];
            this.acceptableRanges.set(f.name, f.config.acceptableRange);
          }
        }
      }
    });
  }

  /**
   * Compute feature ranges for generating CF based on this.acceptableRanges
   */
  get featureRanges() {
    return Object.fromEntries(this.acceptableRanges);
  }

  /**
   * Compute feature weight multipliers for generating CF based on
   * this.difficulties
   */
  get featureWeightMultipliers() {
    const multipliers = {};

    const scoreMap = {
      'very-easy': 0.1,
      easy: 0.5,
      neutral: 1,
      hard: 2,
      'very-hard': 10
    };

    this.difficulties.forEach((v, k) => {
      if (v !== 'lock' && v !== 'neutral') {
        multipliers[k] = scoreMap[v];
      }
    });

    return multipliers;
  }

  /**
   * Compute available features to change for generating CF based on this.
   * difficulties (features that are set to be locked)
   */
  get featuresToVary() {
    const featureToVary = [];
    const featureDiffs = new Set(this.difficulties.values());

    if (featureDiffs.has('lock')) {
      this.allFeatureNames.forEach((d) => {
        if (!this.difficulties.has(d) || this.difficulties.get(d) !== 'lock') {
          featureToVary.push(d);
        }
      });
      return featureToVary;
    } else {
      return null;
    }
  }

  /**
   * Return a clean serializable copy of the constraint object.
   */
  getCleanCopy() {
    return {
      difficulties: Array.from(this.difficulties.entries()),
      acceptableRanges: Array.from(this.acceptableRanges.entries()),
      allFeatureNames: this.allFeatureNames.slice()
    };
  }
}

/**
 * Iteratively populate the plans.
 * @param {object} modelData The loaded model data
 * @param {EBM} ebm Initialized EBM model
 * @param {object[]} curExample The current sample data
 * @param {Constraints} constraints Global constraint configurations
 * @param {(newPlans: Plans) => void} plansUpdated Workaround function to
 *  trigger an update on the plans variable
 * @param {Logger} [logger] Logger object
 */
export const initPlans = async (
  modelData,
  ebm,
  curExample,
  constraints,
  plansUpdated,
  logger=null
) => {
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
    planStores: new Map(),
    failedPlans: new Set()
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
  modelData.features.forEach((f) => {
    // Need to be careful about the features that have both transforms and
    // integer requirement. For them, the integer transformation is only
    // applied visually
    if (
      f.type === 'continuous' &&
      f.config.usesTransform === null &&
      f.config.requiresInt
    ) {
      tempPlans.continuousIntegerFeatures.push(f.name);
    }
  });

  const plans = tempPlans;
  plansUpdated(plans);

  /**
   * Generate the initial 5 plans. We can use topK = 5, but we will have to
   * wait for a long time. Instead, we progressively generate these top 5
   * plans.
   */
  const coach = new GAMCoach(modelData);
  const exampleBatch = [curExample];
  const singleFeatures = new Set();

  // Log the constraints before generating the first plan
  logger?.addRecord(
    `plan${tempPlans.nextPlanIndex}Constraint`,
    constraints.getCleanCopy()
  );

  console.time(`Plan ${tempPlans.nextPlanIndex} generated`);
  let cfs = await coach.generateCfs({
    curExample: exampleBatch,
    totalCfs: 1,
    continuousIntegerFeatures: plans.continuousIntegerFeatures,
    featuresToVary: constraints.featuresToVary,
    featureRanges: constraints.featureRanges,
    featureWeightMultipliers: constraints.featureWeightMultipliers,
    verbose: 0
  });
  console.timeEnd(`Plan ${tempPlans.nextPlanIndex} generated`);

  // If the plan only uses one feature, we store it to a set and avoid future
  // plans that only uses that feature
  if (cfs.activeVariables[0].length === 1) {
    const curFeature = cfs.activeVariables[0][0].replace(/(.*):.*/g, '$1');
    singleFeatures.add(curFeature);
  }

  // Convert the plan into a plan object
  let curPlan = new Plan(
    modelData,
    curExample,
    plans,
    cfs.isSuccessful ? cfs.data[0] : curExample,
    tempPlans.nextPlanIndex
  );

  // Log the current plan
  logger?.addRecord(
    `plan${tempPlans.nextPlanIndex}`,
    curPlan.getCleanPlanCopy()
  );

  // Record the plan as a store and attach it to plans with the planIndex as
  // a key
  let curPlanStore = writable(curPlan);
  plans.planStores.set(tempPlans.nextPlanIndex, curPlanStore);
  plansUpdated(plans);

  // Handle failure case
  if (!cfs.isSuccessful) {
    for (
      let i = tempPlans.nextPlanIndex;
      i < tempPlans.nextPlanIndex + 5;
      i++
    ) {
      plans.failedPlans.add(i);
      plansUpdated(plans);
    }

    plans.nextPlanIndex += 5;
    plansUpdated(plans);
    return;
  }

  // Generate other plans
  const totalPlanNum = 5;
  for (let i = 1; i < totalPlanNum; i++) {
    if (!cfs.isSuccessful) {
      break;
    }

    // Run gam coach
    console.time(`Plan ${tempPlans.nextPlanIndex + i} generated`);
    cfs = await coach.generateSubCfs(cfs.nextCfConfig);
    console.timeEnd(`Plan ${tempPlans.nextPlanIndex + i} generated`);

    // If the new plan uses only one feature, we mute it and repeat again
    if (cfs.activeVariables[0].length === 1) {
      const curFeature = cfs.activeVariables[0][0].replace(/(.*):.*/g, '$1');
      if (singleFeatures.has(curFeature)) {
        i--;
        continue;
      } else {
        singleFeatures.add(curFeature);
      }
    }

    // Get the plan object
    curPlan = new Plan(
      modelData,
      curExample,
      plans,
      cfs.isSuccessful ? cfs.data[0] : curExample,
      tempPlans.nextPlanIndex + i
    );
    curPlanStore = writable(curPlan);
    plans.planStores.set(tempPlans.nextPlanIndex + i, curPlanStore);
    plansUpdated(plans);

    // Log the current plan
    logger?.addRecord(
      `plan${tempPlans.nextPlanIndex + i}`,
      curPlan.getCleanPlanCopy()
    );

    // Handle failure case
    if (!cfs.isSuccessful) {
      for (
        let j = tempPlans.nextPlanIndex + i;
        j < tempPlans.nextPlanIndex + 5;
        j++
      ) {
        plans.failedPlans.add(j);
        plansUpdated(plans);
      }
      break;
    }
  }

  // Update the next plan index
  plans.nextPlanIndex += 5;
  plansUpdated(plans);
};

/**
 * Handler for the regenerate button click event. This function regenerates
 * five new plans to replace the existing plans with the latest constraints
 * information.
 * @param {Constraints} constraints Global constraint configurations
 * @param {object} modelData The loaded model data
 * @param {object[]} curExample The current sample data
 * @param {Plans} plans The current plans
 * @param {(newPlans: Plans) => void} plansUpdated Workaround function to
 *  trigger an update on the plans variable
 * @param {Logger} [logger] Logger object
 */
export const regeneratePlans = async (
  constraints,
  modelData,
  curExample,
  plans,
  plansUpdated,
  logger=null
) => {
  /**
   * To generate new plans, we need to complete the following steps:
   *
   * (1) Empty planStores to make tabs start loading animation
   * (2) Iteratively generate new plans and their stores
   * (3) Update the active plan index to the first tab when the first plan is
   *  updated => force an update on the feature panel
   * (4) Update the next plan index
   */

  // Step 1: Start tab loading animation
  plans.planStores = new Map();
  plansUpdated(plans);

  // Step 2: Iteratively generate new plans with the new constraints
  const coach = new GAMCoach(modelData);
  const exampleBatch = [curExample];
  const singleFeatures = new Set();

  // Log the constraints before generating the first plan
  logger?.addRecord(
    `plan${plans.nextPlanIndex}Constraint`,
    constraints.getCleanCopy()
  );

  console.time(`Plan ${plans.nextPlanIndex} generated`);
  let cfs = await coach.generateCfs({
    curExample: exampleBatch,
    totalCfs: 1,
    continuousIntegerFeatures: plans.continuousIntegerFeatures,
    featuresToVary: constraints.featuresToVary,
    featureRanges: constraints.featureRanges,
    featureWeightMultipliers: constraints.featureWeightMultipliers,
    verbose: 0
  });
  console.timeEnd(`Plan ${plans.nextPlanIndex} generated`);

  // If the plan only uses one feature, we store it to a set and avoid future
  // plans that only uses that feature
  if (cfs.activeVariables[0].length === 1) {
    const curFeature = cfs.activeVariables[0][0].replace(/(.*):.*/g, '$1');
    singleFeatures.add(curFeature);
  }

  // Step 3: Update the active plan index
  plans.activePlanIndex = plans.nextPlanIndex;

  // Convert the plan into a plan object
  let curPlan = new Plan(
    modelData,
    curExample,
    plans,
    cfs.isSuccessful ? cfs.data[0] : curExample,
    plans.nextPlanIndex
  );

  // Record the plan as a store and attach it to plans with the planIndex as
  // a key
  let curPlanStore = writable(curPlan);
  plans.planStores.set(plans.nextPlanIndex, curPlanStore);
  plansUpdated(plans);

  // Log the current plan
  logger?.addRecord(`plan${plans.nextPlanIndex}`, curPlan.getCleanPlanCopy());

  // Handle failure case
  if (!cfs.isSuccessful) {
    for (let j = plans.nextPlanIndex; j < plans.nextPlanIndex + 5; j++) {
      plans.failedPlans.add(j);
      plansUpdated(plans);
    }

    plans.nextPlanIndex += 5;
    plansUpdated(plans);
    return;
  }

  // Generate other plans
  const totalPlanNum = 5;
  for (let i = 1; i < totalPlanNum; i++) {
    if (!cfs.isSuccessful) {
      break;
    }

    // Run gam coach
    console.time(`Plan ${plans.nextPlanIndex + i} generated`);
    cfs = await coach.generateSubCfs(cfs.nextCfConfig);
    console.timeEnd(`Plan ${plans.nextPlanIndex + i} generated`);

    // If the new plan uses only one feature, we mute it and repeat again
    if (cfs.activeVariables[0].length === 1) {
      const curFeature = cfs.activeVariables[0][0].replace(/(.*):.*/g, '$1');
      if (singleFeatures.has(curFeature)) {
        i--;
        continue;
      } else {
        singleFeatures.add(curFeature);
      }
    }

    // Get the plan object
    curPlan = new Plan(
      modelData,
      curExample,
      plans,
      cfs.isSuccessful ? cfs.data[0] : curExample,
      plans.nextPlanIndex + i
    );

    curPlanStore = writable(curPlan);
    plans.planStores.set(plans.nextPlanIndex + i, curPlanStore);
    plansUpdated(plans);

    // Log the current plan
    logger?.addRecord(
      `plan${plans.nextPlanIndex + i}`,
      curPlan.getCleanPlanCopy()
    );

    // Handle failure case
    if (!cfs.isSuccessful) {
      for (let j = plans.nextPlanIndex + i; j < plans.nextPlanIndex + 5; j++) {
        plans.failedPlans.add(j);
        plansUpdated(plans);
      }
      break;
    }
  }

  // Update the next plan index
  plans.nextPlanIndex += 5;
  plansUpdated(plans);
};
