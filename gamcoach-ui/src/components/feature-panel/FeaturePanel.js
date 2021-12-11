
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

