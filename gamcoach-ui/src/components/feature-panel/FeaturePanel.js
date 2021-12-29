import { Constraints } from '../coach/Coach';

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
   * Initialize the features to put into the grid.
   * @param {Feature[]} features The initial feature data initialized by the
   *  Plan object
   * @param {Constraints} constraints The global constraints object that
   *  contains the up-to-date constraint info about all the features
   */
  loadFeatures = (features, constraints) => {
    // First update the constraint information for all features
    for (let i = 0; i < features.length; i++) {
      const name = features[i].data.name;

      // Update the difficulty configuration
      if (constraints.difficulties.has(name)) {
        features[i].difficulty = constraints.difficulties.get(name);
      } else {
        features[i].difficulty = 'neutral';
      }

      // Update the acceptable range configuration
      if (constraints.acceptableRanges.has(name)) {
        features[i].acceptableRange = constraints.acceptableRanges.get(name);

        // If this feature is a categorical feature, we also need to encode the
        // acceptable range from edge names to edge ids
        if (features[i].data.type === 'categorical') {
          const labelDecoder = new Map();
          Object.entries(features[i].labelEncoder).forEach(
            ([level, levelName]) => {
              labelDecoder.set(levelName, parseInt(level));
            }
          );

          features[i].acceptableRange = features[i].acceptableRange.map((id) =>
            labelDecoder.get(id)
          );
        }
      } else {
        features[i].acceptableRange = null;
      }

      if (features[i].acceptableRange === null &&
        features[i].difficulty === 'neutral'
      ) {
        features[i].isConstrained = false;
      } else {
        features[i].isConstrained = true;
      }
    }

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

