import '../../typedef';
import d3 from '../../utils/d3-import';
import { round } from '../../utils/utils';

const formatter = d3.format(',.2~f');

/**
 * Get a list of features to display
 * @param {Feature[]} features A list of all the features
 * @param {object[]} curExample A list of the current input values
 * @returns {object}
 */
export const getInputLists = (features, curExample) => {

  const contList = [];
  const catList = [];

  features.forEach(f => {
    if (f.isCont) {
      let curValue = parseFloat(curExample[f.featureID]);
      if (f.transform === 'log10') {
        curValue = Math.pow(10, curValue);
      }

      if (f.requiresInt) {
        curValue = round(curValue, 0);
      } else {
        curValue = round(curValue, 2);
      }

      contList.push({
        curValue,
        transform: f.transform,
        isCont: f.isCont,
        requiresInt: f.requiresInt,
        name: f.description.displayName,
        description: f.description.description,
        featureID: f.featureID
      });
    } else {
      const labelDecoder = new Map();

      Object.entries(f.labelEncoder).forEach(([level, levelName]) => {
        labelDecoder.set(
          levelName,
          level
        );
      });

      const curLevel = labelDecoder.get(curExample[f.featureID]);

      // Get all the options
      const values = [];
      labelDecoder.forEach((level, levelName) => {
        values.push({
          level: level,
          levelName: levelName,
          levelDisplayName: f.description.levelDescription[level].displayName
        });
      });

      catList.push({
        curValue: curLevel,
        isCont: f.isCont,
        name: f.description.displayName,
        description: f.description.description,
        levelName: curExample[f.featureID],
        levelDisplayName: f.description.levelDescription[curLevel]?.displayName,
        allValues: values,
        featureID: f.featureID,
        labelEncoder: f.labelEncoder
      });
    }
  });

  // Sort the input list alphabetically
  contList.sort((a, b) => a.name.localeCompare(b.name));
  catList.sort((a, b) => a.name.localeCompare(b.name));

  return {contList, catList};
};

/**
 * Convert the contList and catList to the curExample format
 * @param {object[]} contList
 * @param {object[]} catList
 */
export const getNewCurExample = (contList, catList) => {
  const newCurExample = [];
  const featureNum = contList.length + catList.length;
  for (let i = 0; i < featureNum; i ++) {
    newCurExample.push(0);
  }

  contList.forEach(f => {
    let curValue = f.curValue;

    // Transform the current value from user input
    if (f.requiresInt) {
      curValue = round(curValue, 0);
    }
    if (f.transform === 'log10') {
      curValue = Math.log(curValue + 1e-6) / Math.log(10);
    }
    newCurExample[f.featureID] = curValue;
  });

  // Encode the current value from user input
  catList.forEach(f => {
    let curValue = f.curValue;
    // Encode the level to the original encoding
    curValue = f.labelEncoder[curValue];
    newCurExample[f.featureID] = curValue;
  });

  return newCurExample;
};

/**
 * Return true if curExample is different from the newCurExample
 * @param {object[]} curExample
 * @param {object[]} newCurExample
 */
export const isCurExampleChanged = (curExample, newCurExample) => {
  if (curExample.length !== newCurExample.length) return true;

  for (let i = 0; i < curExample.length; i++) {
    if (!isNaN(curExample[i])) {
      if (Math.abs(curExample[i] - newCurExample[i]) > 1e-5) {
        return true;
      }
    } else {
      // String case
      if (curExample[i] !== newCurExample[i]) {
        return true;
      }
    }
  }

  return false;
};