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
 * @property {number[] | null} acceptableRange acceptable ranges of values
 * @property {string | null} transform A string from ['log10'] or null
 * @property {object} description Description of the feature and its levels (
 *  if the feature has categorical values)
 */

/**
 * @typedef {Object} Plans
 * @property {boolean} isRegression If the model is a regression model
 * @property {number} originalScore The original score output of the EBM model
 * @property {number} score The current score output of the EBM model
 * @property {string} regressionName Name of the regression model
 * @property {string[]} classes Class names for the classification model
 * @property {number[]} classTarget A list of indexes of target classes
 * @property {string[]} continuousIntegerFeatures Names of continuous features
 *  that require integer values
 * @property {number} activePlanIndex The plan index of the currently active one
 * @property {number} nextPlanIndex The next plan index to count from
 * @property {Map<number, object>} planStores A map that maps plan
 *  index to the corresponding plan store
 * @property {Set<number>} failedPlans A set of planIndexes of failed plans
 */

/**
 * @typedef {Object} BookmarkConfig
 * @property {boolean} show True if the bookmark panel is shown
 * @property {Feature[]} features All features used for the current model
 * @property {Map<number, object>} plans A map from plan index to the saved plan
 * @property {number} focusOutTime Timestamp when the element loses focus
 * @property {Plans} plansInfo The information about all the plans
 * @property {string} [action] Value from ['addUnpicked', 'delete']
 * @property {Map<number, object>} [unpickedPlans] A map from plan index to some
 *  unpicked plans
 */

/**
 * @typedef {Object} InputFormConfig
 * @property {boolean} show True if the bookmark panel is shown
 * @property {Feature[]} features All features used for the current model
 * @property {Plans} plansInfo The information about all the plans
 * @property {object} ebm The EBM model
 * @property {object[]} curExample The current sample
 * @property {string} action A value of ['saved']
 */

/**
 * @typedef {Object} PlanRating
 * @property {number} planIndex The index of the rated plan
 * @property {string} rating The numerical score ('1' - '3') of the plan
 * @property {string} explanation A short sentence reviewing the plan
 * @property {boolean} isSaved True if this plan is saved by the user
 */

/**
 * @typedef {Object} ConstraintRating
 * @property {string} featureName The name of the constraint
 * @property {string} difficultyRating The numerical score ('1' - '3') of the
 * plan
 * @property {string} rangeRating The numerical score ('1' - '3') of the plan
 * @property {string} emptyReason The reason why there is no preference set
 */

/**
 * @typedef {Object} RatingFormConfig
 * @property {boolean} show True if the bookmark panel is shown
 * @property {PlanRating[]} planRatings A list of plan ratings
 * @property {string} action Value from ['submit']
 */

/**
 * @typedef {Object} ConstraintRatingFormConfig
 * @property {boolean} show True if the rating panel is shown
 * @property {ConstraintRating[]} constraintRatings A list of constraint ratings
 * @property {string} action Value from ['submit']
 */
