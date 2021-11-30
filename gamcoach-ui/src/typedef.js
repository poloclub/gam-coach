
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
 * @property {number} difficulty 1-5: increasing levels of difficulty, 6
 *  means impossible
 * @property {number[] | null} acceptableRange acceptable
 *  ranges of values
 * @property {number} display 0: no display, 1: to display, 2: scheduled to
 *  display on the left panel, 3: scheduled to display on the right panel
*/