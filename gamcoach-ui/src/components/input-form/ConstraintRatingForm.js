import { Constraints } from '../coach/Coach';
import d3 from '../../utils/d3-import';
import { round } from '../../utils/utils';

const formatter = d3.format(',.2~f');

/**
 * Get a list of user specified constraints
 * @param {Constraints} constraints
 */
export const getConstraintList = (constraints) => {
  const constraintList = [];
  if (constraints === null) return [];

  constraints.acceptableRanges.forEach((acceptableRange, featureName) => {
    if (!(featureName === 'earliest_cr_line')) {
      constraintList.push({
        featureName,
        acceptableRange
      });
    }
  });

  const existingFeatures = new Set(constraintList.map((d) => d.featureName));

  constraints.difficulties.forEach((difficulty, featureName) => {
    let skipCur = false;
    if (featureName === 'delinq_2yrs' && difficulty === 'very-hard') {
      skipCur = true;
    }
    if (featureName === 'pub_rec' && difficulty === 'very-hard') {
      skipCur = true;
    }
    if (featureName === 'pub_rec_bankruptcies' && difficulty === 'very-hard') {
      skipCur = true;
    }

    if (!skipCur) {
      // This feature is already added
      if (existingFeatures.has(featureName)) {
        constraintList.filter(
          (d) => d.featureName === featureName
        )[0].difficulty = difficulty;
      } else {
        constraintList.push({
          featureName,
          difficulty
        });
      }
    }
  });

  // Translate values to readable texts
  constraintList.forEach((c, i) => {
    // Translate feature name to display name
    constraintList[i].displayName =
      constraints.allFeatureDisplayNames[
        constraints.allFeatureNames.indexOf(c.featureName)
      ];

    // Translate the acceptable range of categorical features
    if (
      constraints.labelDecoder[c.featureName] !== undefined &&
      c.acceptableRange !== undefined
    ) {
      constraintList[i].acceptableRangeText = JSON.stringify(
        c.acceptableRange.map((d) => constraints.labelDecoder[c.featureName][d])
      );
    }

    // Translate the acceptable range of cont features that use transform
    if (
      constraints.labelDecoder[c.featureName] === undefined &&
      c.acceptableRange !== undefined &&
      constraints.allFeatureTransforms[
        constraints.allFeatureNames.indexOf(c.featureName)
      ] === 'log10'
    ) {
      constraintList[i].acceptableRangeText = `From ${
        formatter(round(Math.pow(10, c.acceptableRange[0]), 0))
      } to ${formatter(round(Math.pow(10, c.acceptableRange[1]), 0))}`;
    }

    // Translate the acceptable range of cont features that do not use transform
    if (
      constraints.labelDecoder[c.featureName] === undefined &&
      c.acceptableRange !== undefined &&
      constraints.allFeatureTransforms[
        constraints.allFeatureNames.indexOf(c.featureName)
      ] === null
    ) {
      constraintList[i].acceptableRangeText = `From ${formatter(
        c.acceptableRange[0]
      )} to ${formatter(c.acceptableRange[1])}`;
    }
  });

  return constraintList;
};
