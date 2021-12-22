import '../../typedef';
import { SavedPlan } from '../coach/Coach';
import d3 from '../../utils/d3-import';

const formatter = d3.format(',.2~f');

/**
 * Download the receipt as a text file
 * @param {BookmarkConfig} bookmarkConfig Bookmarks
 * @returns {Promise<string>}
 */
export const downloadReceipt = async (bookmarkConfig) => {
  // Create the text content
  let receipt = 'GAM Coach Receipt\n';

  const separator = '====\n';
  receipt = receipt.concat(separator);

  // Append the date info
  const date = new Date();
  receipt = receipt.concat(`Date: ${date.toDateString()}\n`);
  receipt = receipt.concat(`Time: ${date.toTimeString()}\n`);

  receipt = receipt.concat(separator);

  if (bookmarkConfig.plans.size === 0) {
    receipt = receipt.concat('No plan is saved\n');
    receipt = receipt.concat(separator);
  } else {
    /**@type {SavedPlan} */
    const curSavedPlan = bookmarkConfig.plans.get(
      [...bookmarkConfig.plans.keys()][0]
    );
    const ebmLocal = curSavedPlan.ebmLocal;
    const modelWeight = {
      binEdges: ebmLocal.binEdges,
      scores: ebmLocal.scores,
      interactionBinEdges: ebmLocal.interactionBinEdges,
      interactionScores: ebmLocal.interactionScores
    };

    // Hash the model weight
    const modelWeightJSON = JSON.stringify(modelWeight);
    const buff = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(modelWeightJSON)
    );
    const modelWeightHash = Array.from(new Uint8Array(buff))
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');

    receipt = receipt.concat(`Model: ${modelWeightHash}\n`);
    receipt = receipt.concat(separator);

    // Add the initial input as well
    const inputs = [];
    curSavedPlan.curExample.forEach((d, i) => {
      const curF = bookmarkConfig.features.filter((f) => f.featureID === i)[0];
      let originalValue = d;

      // Encode the values if it is a categorical variable
      // We need to first convert the string value to a number index, then
      // convert the number index to the level description string
      if (!curF.isCont) {
        const labelDecoder = new Map();

        Object.entries(curF.labelEncoder).forEach(([level, levelName]) => {
          labelDecoder.set(
            levelName,
            curF.description.levelDescription[level].displayName
          );
        });

        originalValue = labelDecoder.get(originalValue);
      } else {
        originalValue = formatter(originalValue);
      }

      inputs.push(`${curF.description.displayName}: ${originalValue}`);
    });

    receipt = receipt.concat('Input: ', JSON.stringify(inputs), '\n');
    receipt = receipt.concat(separator);

    // Add the goal for this session
    let goal = '';
    if (bookmarkConfig.plansInfo.isRegression) {
      // TODO
    } else {
      const targetIndex = bookmarkConfig.plansInfo.classTarget[0];
      const targetClass = bookmarkConfig.plansInfo.classes[targetIndex];
      let originalClass;
      for (let i = 0; i < bookmarkConfig.plansInfo.classes.length; i++) {
        if (i !== targetIndex) {
          originalClass = bookmarkConfig.plansInfo.classes[i];
          break;
        }
      }
      goal = `[${originalClass}] => [${targetClass}]`;
    }

    receipt = receipt.concat('Goal: ', goal, '\n');
    receipt = receipt.concat(separator);

    bookmarkConfig.plans.forEach(
      (/**@type{SavedPlan}*/ savedPlan, /**@type{number}*/ planIndex) => {
        receipt = receipt.concat(`Plan ${planIndex}\n`);
        const changeList = savedPlan.getChangeList(bookmarkConfig.features);
        changeList.forEach((item) => {
          receipt = receipt.concat(`  [${item.featureDisplayName}]\n`);
          receipt = receipt.concat(
            `    ${
              item.isCont ? formatter(item.originalValue) : item.originalValue
            } => ${item.isCont ? formatter(item.newValue) : item.newValue}\n`
          );
        });

        receipt = receipt.concat(separator);
      }
    );

    receipt = receipt.concat(
      'Once you have accomplished any one of the plans above, we will ',
      'guarantee your goal.\n'
    );
    receipt = receipt.concat(separator);
  }

  receipt = receipt.concat('Thanks for using GAM Coach!\n');

  return receipt;
};
