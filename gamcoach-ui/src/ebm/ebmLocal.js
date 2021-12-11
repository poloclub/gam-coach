/**
 * The EBM sub-class designed for one single sample point
 *
 * Author: Jay Wang (jayw@gatech.edu)
 * License: MIT
 */

import { EBM, sigmoid, searchSortedLowerIndex } from './ebm';

/**
 * A unique EBM class designed to predict only one fixed sample point. It can
 * efficiently update the prediction when a feature of this point is changed.
 */
export class EBMLocal extends EBM {
  sample;
  predScore;
  predProb;
  pred;

  /**
   * Initialize the EBMLocal object.
   * @param {object} model Trained EBM model in JSON format
   * @param {object[]} sample A single data point of interest
   */
  constructor(model, sample) {
    // Init the ancestor EBM class
    super(model);

    this.sample = sample.slice();

    // Make an initial prediction on this sample and record the predictions
    this.countedScores = this.countScore(sample);
    this.predScore =
      Object.values(this.countedScores).reduce((a, b) => a + b) +
      this.intercept;
    this.predProb = this.isClassifier
      ? sigmoid(this.predScore)
      : this.predScore;
    this.pred = this.isClassifier
      ? this.predProb >= 0.5
        ? 1
        : 0
      : this.predScore;
  }

  /**
   * Update a feature of `sample` and the its predictions
   * @param {string} name Feature name.
   * @param {object} value New feature value. For categorical features, it is a
   * string corresponding to the new level.
   */
  updateFeature(name, value) {
    const index = this.featureNames.indexOf(name);
    const curType = this.featureTypes[index];

    if (curType !== 'continuous' && curType !== 'categorical') {
      throw new Error(
        'Only continuous and categorical features can be updated'
      );
    }

    // Step 1: Update the value in the sample attribute (keep the original level
    // string)
    this.sample[index] = value;
    const encodedSample = this.sample.slice();

    // Step 2: Encode all categorical values
    for (let j = 0; j < encodedSample.length; j++) {
      if (this.featureTypes[j] === 'categorical') {
        const curEncoder = this.labelEncoder[this.featureNames[j]];

        if (curEncoder[encodedSample[j]] !== undefined) {
          encodedSample[j] = parseInt(curEncoder[encodedSample[j]], 10);
        } else {
          // Unseen level
          // Because level code starts at index 1, 0 would trigger a miss
          // during inference => 0 score
          encodedSample[j] = 0;
        }
      }
    }

    // Step 3: Look up the new value
    const curFeature = encodedSample[index];
    let binIndex = -1;
    let binScore = 0;

    if (curType === 'continuous') {
      binIndex = searchSortedLowerIndex(this.binEdges[index], curFeature);
      binScore = this.scores[index][binIndex];
    } else {
      binIndex = this.binEdges[index].indexOf(curFeature);

      if (binIndex < 0) {
        // Unseen level during training => use 0 as score instead
        console.log(
          `Unseen categorical level: ${name}, ${index}, ${curFeature}`
        );
        binScore = 0;
      } else {
        binScore = this.scores[index][binIndex];
      }
    }

    this.countedScores[name] = binScore;

    // Step 3: Trigger an interaction look up if necessary
    for (let j = 0; j < this.interactionIndexes.length; j++) {
      const curIndexes = this.interactionIndexes[j];

      // Look up the names and types
      const name1 = this.featureNames[curIndexes[0]];
      const name2 = this.featureNames[curIndexes[1]];

      if (name1 === name || name2 === name) {
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
        let interBinScore = 0;

        if (binIndex1 < 0 || binIndex2 < 0) {
          interBinScore = 0;
        } else {
          interBinScore = this.interactionScores[j][binIndex1][binIndex2];
        }

        // Record the current feature score
        this.countedScores[`${name1} x ${name2}`] = interBinScore;
      }
    }

    // Step 4: Update all predictions
    this.predScore =
      Object.values(this.countedScores).reduce((a, b) => a + b) +
      this.intercept;
    this.predProb = this.isClassifier
      ? sigmoid(this.predScore)
      : this.predScore;
    this.pred = this.isClassifier
      ? this.predProb >= 0.5
        ? 1
        : 0
      : this.predScore;
  }
}
