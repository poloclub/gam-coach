/**
 * The EBM module.
 *
 * Author: Jay Wang (jayw@gatech.edu)
 * License: MIT
 */

/**
 * Find the lower bound of a pair between where inserting `value` into `sorted`
 * would keep `sorted` in order.
 * @param sorted a sorted array (ascending order)
 * @param value a number to insert into `sorted`
 * @returns the lower bound index in the sorted array to insert
 */
export function searchSortedLowerIndex(sorted, value) {
  let left = 0;
  let right = sorted.length - 1;

  while (right - left > 1) {
    const i = left + Math.floor((right - left) / 2);

    if (value > sorted[i]) {
      left = i;
    } else if (value < sorted[i]) {
      right = i;
    } else {
      return i;
    }
  }

  // Handle out of bound issue
  if (value >= sorted[right]) {
    return right;
  }
  if (value < sorted[left]) {
    return left;
  }
  return right - 1;
}

export function round(num, decimal) {
  return Math.round((num + 2e-16) * 10 ** decimal) / 10 ** decimal;
}

export function sigmoid(logit) {
  const odd = Math.exp(logit);

  // Round the prob for more stable ROC AUC computation
  return round(odd / (1 + odd), 5);
}

export class EBM {
  /**
   * Initialize an EBM model from a trained EBM model.
   * @param {object} model Trained EBM model in JSON format
   */
  constructor(model) {
    /**
     * Pre-process the feature data
     *
     * Feature data includes the main effect and also the interaction effect,
     * and we want to split those two.
     */

    // Step 1: For the main effect, we only need bin edges and scores stored
    // with the same order of `featureNames` and `featureTypes`.

    // Create an index map from feature name to their index in featureData
    const featureDataNameMap = new Map();
    model.features.forEach((d, i) => featureDataNameMap.set(d.name, i));

    // Create two 2D arrays for binEdge ([feature, bin]) and score
    // ([feature, bin]) respectively. We mix continuous and categorical together
    // (assume the categorical features have been encoded)
    const binEdges = [];
    const scores = [];

    // This loop won't encounter interaction terms
    for (let i = 0; i < model.featureNames.length; i++) {
      const curName = model.featureNames[i];
      const curIndex = featureDataNameMap.get(curName);

      const curScore = model.features[curIndex].additive.slice();
      let curBinEdge;

      // Different formats for the categorical data
      if (model.featureTypes[i] === 'categorical') {
        curBinEdge = model.features[curIndex].binLabel.slice();
      } else {
        curBinEdge = model.features[curIndex].binEdge.slice(0, -1);
      }

      binEdges.push(curBinEdge);
      scores.push(curScore);

      console.assert((binEdges.length = scores.length));
    }

    /**
     * Step 2: For the interaction effect, we want to store the feature
     * indexes and the score.
     *
     * Here we store arrays of indexes(2D), edges(3D), and scores(3D)
     */
    const interactionIndexes = [];
    const interactionScores = [];
    const interactionBinEdges = [];

    model.features.forEach((d) => {
      if (d.type === 'interaction') {
        // Parse the feature name
        const index1 = model.featureNames.indexOf(d.name1);
        const index2 = model.featureNames.indexOf(d.name2);

        const curIndexes = [index1, index2];
        interactionIndexes.push(curIndexes);

        // Collect two bin edges
        let binEdge1 = [];
        let binEdge2 = [];

        // Have to skip the max edge if it is continuous
        if (model.featureTypes[index1] === 'categorical') {
          binEdge1 = d.binLabel1.slice();
        } else {
          binEdge1 = d.binLabel1.slice(0, -1);
        }

        if (model.featureTypes[index2] === 'categorical') {
          binEdge2 = d.binLabel2.slice();
        } else {
          binEdge2 = d.binLabel2.slice(0, -1);
        }

        const curBinEdges = [binEdge1, binEdge2];
        interactionBinEdges.push(curBinEdges);

        // Add the scores
        const curScore2D = d.additive;
        interactionScores.push(curScore2D);

        console.assert(binEdge1.length === curScore2D.length);
        console.assert(binEdge2.length === curScore2D[0].length);
      }
    });

    // Step 3: Deal with categorical encodings
    // int => string
    const labelDecoder = model.labelEncoder;

    const labelEncoder = {};
    Object.keys(labelDecoder).forEach((f) => {
      labelEncoder[f] = {};
      Object.keys(labelDecoder[f]).forEach((l) => {
        labelEncoder[f][labelDecoder[f][l]] = l;
      });
    });

    // Initialize attributes
    this.featureNames = model.featureNames;
    this.featureTypes = model.featureTypes;
    this.binEdges = binEdges;
    this.scores = scores;
    this.intercept = model.intercept;
    this.interactionIndexes = interactionIndexes;
    this.interactionBinEdges = interactionBinEdges;
    this.interactionScores = interactionScores;
    this.isClassifier = model.isClassifier;
    this.labelDecoder = labelDecoder;
    this.labelEncoder = labelEncoder;
  }

  /**
   * Count the score of all features for the given sample
   * @param {object[]} sample One data point to predict on
   */
  countScore(sample) {
    const binScores = {};

    // Step 1: Encode categorical level strings to integers
    const encodedSample = sample.slice();
    for (let j = 0; j < sample.length; j++) {
      if (this.featureTypes[j] === 'categorical') {
        const curEncoder = this.labelEncoder[this.featureNames[j]];

        if (curEncoder[sample[j]] !== undefined) {
          encodedSample[j] = parseInt(curEncoder[sample[j]], 10);
        } else {
          // Unseen level
          // Because level code starts at index 1, 0 would trigger a miss
          // during inference => 0 score
          encodedSample[j] = 0;
        }
      }
    }

    // Step 1: Iterate through all columns to count for main effect
    for (let j = 0; j < encodedSample.length; j++) {
      const curFeatureName = this.featureNames[j];
      const curFeatureType = this.featureTypes[j];
      const curFeature = encodedSample[j];

      // Use the feature value to find the corresponding bin
      let binIndex = -1;
      let binScore = 0;

      if (curFeatureType === 'continuous') {
        binIndex = searchSortedLowerIndex(this.binEdges[j], curFeature);
        binScore = this.scores[j][binIndex];
      } else {
        binIndex = this.binEdges[j].indexOf(curFeature);

        if (binIndex < 0) {
          // Unseen level during training => use 0 as score instead
          console.log(
            `Unseen categorical level: ${curFeatureName}, ${j}, [${this.binEdges[j]}], ${curFeature}`
          );
          binScore = 0;
        } else {
          binScore = this.scores[j][binIndex];
        }
      }

      // Record the current feature score
      binScores[curFeatureName] = binScore;
    }

    // Step 2: Add interaction effect scores
    for (let j = 0; j < this.interactionIndexes.length; j++) {
      const curIndexes = this.interactionIndexes[j];

      // Look up the names and types
      const name1 = this.featureNames[curIndexes[0]];
      const name2 = this.featureNames[curIndexes[1]];

      const type1 = this.featureTypes[curIndexes[0]];
      const type2 = this.featureTypes[curIndexes[1]];

      const value1 = encodedSample[curIndexes[0]];
      const value2 = encodedSample[curIndexes[1]];

      // Figure out which bin to query along two dimensions
      let binIndex1 = -1;
      let binIndex2 = -1;

      if (type1 === 'continuous') {
        binIndex1 = searchSortedLowerIndex(
          this.interactionBinEdges[j][0],
          value1
        );
      } else {
        binIndex1 = this.interactionBinEdges[j][0].indexOf(value1);
      }

      if (type2 === 'continuous') {
        binIndex2 = searchSortedLowerIndex(
          this.interactionBinEdges[j][1],
          value2
        );
      } else {
        binIndex2 = this.interactionBinEdges[j][1].indexOf(value2);
      }

      // Query the bin scores
      let binScore = 0;

      if (binIndex1 < 0 || binIndex2 < 0) {
        binScore = 0;
      } else {
        binScore = this.interactionScores[j][binIndex1][binIndex2];
      }

      // Record the current feature score
      binScores[`${name1} x ${name2}`] = binScore;
    }

    return binScores;
  }

  /**
   * Get the predictions on the given samples.
   * @param {object[][]} samples 2D array of samples (n_samples, n_features)
   * @param {boolean} rawScore True if you want to get the original score (log
   * odd for binary classification)
   */
  predict(samples, rawScore = false) {
    console.assert(samples.length > 0 && samples[0].length > 0);

    const predictions = [];

    for (let i = 0; i < samples.length; i++) {
      const curSample = samples[i];
      const binScores = this.countScore(curSample);

      // Get the additive prediction by summing up scores and intercept
      let predScore = Object.values(binScores).reduce((a, b) => a + b);
      predScore += this.intercept;

      // Convert the prediction to 1/0 if it is binary classification
      if (this.isClassifier && !rawScore) {
        predScore = sigmoid(predScore) >= 0.5 ? 1 : 0;
      }
      predictions.push(predScore);
    }

    return predictions;
  }

  /**
   * Get the predicted probabilities on the given samples.
   * @param {*} samples 2D array of samples (n_samples, n_features)
   */
  predictProb(samples) {
    console.assert(samples.length > 0 && samples[0].length > 0);

    const predictions = [];

    for (let i = 0; i < samples.length; i++) {
      const curSample = samples[i];
      const binScores = this.countScore(curSample);

      // Get the additive prediction by summing up scores and intercept
      let predScore = Object.values(binScores).reduce((a, b) => a + b);
      predScore += this.intercept;

      // Convert the prediction to 1/0 if it is binary classification
      if (this.isClassifier) {
        predScore = sigmoid(predScore);
      }
      predictions.push(predScore);
    }

    return predictions;
  }
}
