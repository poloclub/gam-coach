
/**
 * Each row in the feature masonry grid
 */
class FeatureBox {
  /** @type {Feature[]} Features to put in the left column */
  left;
  /** @type {Feature[]} Features to put in the middle column */
  mid;
  /** @type {Feature[]} Features to put in the right column */
  right;

  constructor() {
    this.left = [];
    this.mid = [];
    this.right = [];
  }
}

/**
 * The masonry grid of features
 */
export class FeatureGrid {
  /** @type {FeatureBox} Features that are changed */
  changed;
  /** @type {FeatureBox} Features that are configured */
  configured;
  /** @type {FeatureBox} Other features */
  other;

  /**
   * Initialize the feature grid with empty arrays
   */
  constructor() {
    // Initialize three row blocks
    this.changed = new FeatureBox();
    this.configured = new FeatureBox();
    this.other = new FeatureBox();
  }

  /**
   *
   * @param {Feature[]} features
   */
  loadFeatures = (features) => {
    // Iterate through the features and put each feature into the correct
    // block and column
    const nextKey = {
      changed: 0,
      configured: 0,
      other: 0
    };

    const keys = ['left', 'mid', 'right'];

    features.forEach((f) => {
      if (f.isChanged > 0) {
        this.changed[keys[nextKey.changed]].push(f);
        nextKey.changed = (nextKey.changed + 1) % 3;
      } else {
        if (f.isConstrained) {
          this.configured[keys[nextKey.configured]].push(f);
          nextKey.configured = (nextKey.configured + 1) % 3;
        } else {
          this.other[keys[nextKey.other]].push(f);
          nextKey.other = (nextKey.other + 1) % 3;
        }
      }
    });
  };
}

/**
 * Initialize the features in a feature panel with the given model data
 * @param {any} modelData
 * @param {any} curExample
 */
export const initFeatures = (modelData, curExample) => {

  const tempFeatures = [];

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
      /** @type {Feature} */
      const curFeature = {
        data: modelData.features[i],
        featureID: i,
        isCont: true,
        requiresInt: false,
        labelEncoder: null,
        originalValue: curExample[i],
        coachValue: curExample[i],
        myValue: curExample[i],
        isChanged: 0,
        isConstrained: false,
        difficulty: 'neutral',
        acceptableRange: null,
        display: 0
      };

      if (curType === 'categorical') {
        curFeature.isCont = false;
        curFeature.requiresInt = false;
        curFeature.labelEncoder =
          modelData.labelEncoder[modelData.features[i].name];
        curFeature.originalValue =
          labelDecoder[modelData.features[i].name][curExample[i]];
        curFeature.coachValue = curFeature.originalValue;
        curFeature.myValue = curFeature.originalValue;
      }

      tempFeatures.push(curFeature);
    }
  }

  // Sort the features based on the importance
  tempFeatures.sort((a, b) => b.data.importance - a.data.importance);

  return tempFeatures;
};
