
/**
 * @typedef {Object} Feature
 * @property {Object} data
 * @property {number} featureID
 * @property {boolean} isCont
 * @property {boolean} requiresInt
 * @property {Object | null}  labelEncoder
 * @property {number | string} originalValue
 * @property {number | string} coachValue
 * @property {number | string} myValue
 * @property {number} isChanged 0: no change, 1: changed by gam coach,
 *  3: changed by the user
 * @property {boolean} isConstrained
 * @property {number} difficulty 1-5: increasing levels of difficulty, 6
 *  means impossible
 * @property {number[] | null} acceptableRange acceptable
 *  ranges of values
 * @property {number} display 0: no display, 1: to display, 2: scheduled to
 *  display on the left panel, 3: scheduled to display on the right panel
*/