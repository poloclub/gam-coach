/**
 * @typedef {Object} Feature
 * @property {Object} data The data associated with the feature
 * @property {number} featureID Feature ID
 * @property {boolean} isCont True if this is a continuous feature
 * @property {boolean} requiresInt True if this feature requires integer values
 * @property {Object | null}  labelEncoder  Label encoder for categorical
 *  features
 * @property {number | string} originalValue The original feature value
 * @property {number | string} coachValue The suggested feature value
 * @property {number | string} myValue User's hypothetical feature value
 * @property {number} isChanged 0: no change, 1: changed by gam coach,
 *  3: changed by the user
 * @property {boolean} isConstrained If user has configured this feature
 * @property {string} difficulty A string selected from ['very-easy', 'easy',
 *  'neutral', 'very-hard', 'hard']
 * @property {number[] | null} acceptableRange acceptable
 *  ranges of values
 * @property {string | null} transform A string from ['log10'] or null
*/

/**
 * @typedef {Object} Plans
 * @property {boolean} isRegression If the model is a regression model
 * @property {number} score The current score output of the EBM model
 * @property {string} regressionName Name of the regression model
 * @property {string[]} classes Class names for the classification model
 * @property {number[]} classTarget A list of indexes of target classes
 * @property {string[]} continuousIntegerFeatures Names of continuous features
 *  that require integer values
 * @property {number} activePlanIndex The plan index of the currently active one
 * @property {number} nextPlanIndex The next plan index to count from
 * @property {Set<number>} readyPlanIndexes A set of indexes of plans that have
 *  been initialized
 * @property {Map<number, object>} planStores A map that maps plan
 *  index to the corresponding plan store
 */