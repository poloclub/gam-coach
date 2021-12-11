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
          isConstrained: false,
          difficulty: difficultyTextMap[config.difficulty],
          acceptableRange: null,
          transform: config.transform
        };

        if (curType === 'categorical') {
          curFeature.isCont = false;
          curFeature.requiresInt = false;
          curFeature.labelEncoder =
            modelData.labelEncoder[modelData.features[i].name];
        }

        features.push(curFeature);
      }
    }

    // Sort the features based on the importance
    features.sort((a, b) => b.data.importance - a.data.importance);

    return features;
  }
}
