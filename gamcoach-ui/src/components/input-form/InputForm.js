import '../../typedef';

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
      contList.push({
        curValue: curExample[f.featureID],
        isCont: f.isCont,
        requiresInt: f.requiresInt,
        name: f.description.displayName,
        description: f.description.description
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
        levelDisplayName: f.description.levelDescription[curLevel].displayName,
        allValues: values
      });
    }
  });

  // Sort the input list alphabetically
  contList.sort((a, b) => a.name.localeCompare(b.name));
  catList.sort((a, b) => a.name.localeCompare(b.name));

  return {contList, catList};
};