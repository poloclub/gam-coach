import './typedef';
import { EBMLocal } from './ebm/ebmLocal';

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

  /**
   * Initialize a Plan object
   * @param {object} modelData Loaded model data
   * @param {object[]} curExample Current sample values
   * @param {Plans} plans
   * @param {object[]} cfData The data of CFs returned from GAMCoach
   */
  constructor(modelData, curExample, plans, cfData) {
    this.features = this.initFeatures(modelData, curExample, cfData);

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
          transform: config.transform,
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

        curFeature.isConstrained = curFeature.difficulty !== 'neutral' ||
          curFeature.acceptableRange !== null;

        features.push(curFeature);
      }
    }

    // Sort the features based on the importance
    features.sort((a, b) => b.data.importance - a.data.importance);

    return features;
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

    // Iterate through the features to search for pre-defined constraints
    modelData.features.forEach((f, i) => {
      if (f.type === 'continuous' || f.type === 'categorical') {
        this.allFeatureNames.push(f.name);

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
      'very-easy': 0.25,
      'easy': 0.5,
      'neutral': 1,
      'hard': 2,
      'very-hard': 4
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
      this.allFeatureNames.forEach(d => {
        if (!this.difficulties.has(d) || this.difficulties.get(d) !== 'lock') {
          featureToVary.push(d);
        }
      });
      return featureToVary;
    } else {
      return null;
    }

  }
}
