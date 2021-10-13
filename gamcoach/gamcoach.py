"""Main module for GAM Coach.

GAM Coach implements a simple and flexible method to generate counterfactual
explanations for generalized additive models (GAMs).
"""

import numpy as np
import pandas as pd
import re
import pulp

from tqdm import tqdm
from interpret.glassbox import ExplainableBoostingClassifier, ExplainableBoostingRegressor
from collections import Counter
from typing import Union

from .counterfactuals import Counterfactuals

SEED = 922


class GAMCoach:
    """Main class for GAM Coach."""

    def __init__(self,
                 ebm: Union[ExplainableBoostingClassifier, ExplainableBoostingRegressor],
                 x_train: np.ndarray,
                 cont_mads=None,
                 cat_distances=None):
        """Initialize a GAMCoach object.

        Args:
            ebm (Union[ExplainableBoostingClassifier, ExplainableBoostingRegressor]):
                The trained EBM model. It can be either a classifier or a regressor.
            x_train (np.ndarray): The training data. It is used to compute the
                distance for different features.
            cont_mads (dict, optional): `feature_name` -> `median absolute
                deviation score`. If it is provided, it is used to overwrite the
                computed MADs for continuous variables. It is useful when you
                want to provide a custom normalization function to compute the
                distance between continuous features.
            cat_distances (dict, optional): `feature_name` -> {`level_name` -> `distance`}.
                Level distance of categorical variables. By default, the distance
                is computed by (1 - frequency(level)) for each level. It imples
                that it is easier to move to a more frequent. If `cat_distances`
                is provided, it will overwrite the default distance for
                categorical variables.
        """

        self.ebm: Union[ExplainableBoostingClassifier, ExplainableBoostingRegressor] = ebm
        """The trained EBM model."""

        self.x_train: np.ndarray = x_train

        self.cont_mads: dict = cont_mads
        """Median absolute deviation (MAD) of continuous variables."""

        self.cat_distances: dict = cat_distances
        """Level distance of categorical variables. By default, the distance is
        computed by $(1 - \\frac{\\text{count of} L_i}{\\text{count of all L}})$
        for one level $L_i$. It implies that it is easier to move to a more
        frequent level.
        """

        # If cont_mads is not given, we compute it from the training data
        if self.cont_mads is None:
            ebm_cont_indexes = np.array(
                [i for i in range(len(self.ebm.feature_names))
                    if self.ebm.feature_types[i] == 'continuous']
            )

            self.cont_mads = {}

            for i in ebm_cont_indexes:
                self.cont_mads[ebm.feature_names[i]] = self.compute_mad(self.x_train[:, i])

        # If cat_distance is not given, we compute it from the training data
        if self.cat_distances is None:
            ebm_cat_indexes = np.array(
                [i for i in range(len(self.ebm.feature_names))
                 if self.ebm.feature_types[i] == 'categorical']
            )

            self.cat_distances = {}

            for i in ebm_cat_indexes:
                self.cat_distances[self.ebm.feature_names[i]] = self.compute_frequency_distance(
                    self.x_train[:, i]
                )

        # Determine if the ebm is a classifier or a regressor
        self.is_classifier = isinstance(self.ebm.intercept_, np.ndarray)
        """True if the ebm model is a classifier, false if it is a regressor."""

    def generate_cfs(self,
                     cur_example: np.ndarray,
                     total_cfs: int = 1,
                     target_range: tuple = None,
                     sim_threshold_factor: float = 0.005,
                     sim_threshold: float = None,
                     categorical_weight: Union[float, str] = 'auto',
                     features_to_vary: list = None,
                     max_num_features_to_vary: int = None,
                     feature_ranges: dict = None,
                     continuous_integer_features: list = None,
                     verbose: bool = False) -> Counterfactuals:
        """Generate counterfactual examples.

        Use mixed-integer linear programming to generate optimal counterfactual
        examples for the given data point.

        Args:
            cur_example (np.ndarray): The data point of interest. This function
                aims to find similar examples that the model gives different
                predictions.
            total_cfs (int, optional): The total number of counterfactuals to,
                generate. Default to 1.
            target_range (tuple, optional): The targetted prediction range. This
                parameter is required if the EBM is a regressor.
            sim_threshold_factor (float, optional): A positive float to automatically
                generate a similarity threshold. This parameter has no effect if
                `sim_threshold` is provided. If `sim_threshold` is
                not provided, we compute `sim_threshold` as `sim_threshold_factor`
                * average additive score range of all continuous features. If
                `sim_threshold_factor` is too small, it takes longer time to
                generate CFs. If `sim_threshold_factor` is too large, the
                algorithm might miss some optimal CFs.
            sim_threshold (float, optional): A positive float to determine how we
                decide if two bins of a continuous feature have similar scores.
                Two bins $b_1$ and $b_2$ are similar (the distant one will be
                removed) if $|b_1 - b_2| \\leq$ `sim_threshold`.
            categorical_weight (Union[float, str], optional): A positive float
                to scale the distances of options for categorical variables. Since
                we have very different distance functions for continuous and
                categorical features, we need to scale them so they are at a
                comparable range. To do that, we multiply the categorical feature's
                distances by `categorical_weight`. By default ('auto'), we scale
                the distances of categorical features so that they have the mean
                distance as continuous features.
            features_to_vary ([str], optional): A list of feature names that
                the CFs can change. If it is `None`, this function will use all
                features.
            max_num_features_to_vary (int, optional): The max number of features
                that the CF can vary. Default is no maximum.
            feature_ranges (dict, optional): A dictionary to control the permitted
                ranges/values for continuous/categorical features. It maps
                `feature_name` -> [`min_value`, `max_value`] for continuous features,
                `feature_name` -> [`level1`, `level2`, ...] for categorical features.
            continuous_integer_features (list, optional): A list of names of
                continuous features that need to be integers (e.g., age, FICO score)
            verbose (bool): True if you want it to print out the optimization
                process from each iteration.

        Returns:
            Counterfactuals: The generated counterfactual examples with their
                associated distances and change information.
        """

        # Transforming some parameters
        if len(cur_example.shape) == 1:
            cur_example = cur_example.reshape(1, -1)

        if features_to_vary is None:
            features_to_vary = [
                self.ebm.feature_names[i] for i in range(len(self.ebm.feature_types))
                if self.ebm.feature_types[i] != 'interaction'
            ]

        # Step 1: Find the current score for each feature
        # This is done by ebm.explain_local()
        cur_scores = {}

        if self.is_classifier:
            cur_scores['intercept'] = self.ebm.intercept_[0]
        else:
            cur_scores['intercept'] = self.ebm.intercept_

        local_data = self.ebm.explain_local(cur_example)._internal_obj

        for i in range(len(self.ebm.feature_names)):
            cur_feature_name = self.ebm.feature_names[i]
            cur_feature_type = self.ebm.feature_types[i]

            cur_scores[cur_feature_name] = local_data['specific'][0]['scores'][i]

        # Find the CF direction

        # Binary classification
        # Predicted 0 => +1
        # Predicted 1 => -1
        if self.is_classifier:
            cf_direction = self.ebm.predict(cur_example)[0] * (-2) + 1
            total_score = np.sum([cur_scores[k] for k in cur_scores])
            needed_score_gain = -total_score
            score_gain_bound = None

        else:
            # Regression
            # Increase +1
            # Decrease -1
            if target_range is None:
                raise ValueError('target_range cannot be None when the model is a regressor')

            predicted_value = self.ebm.predict(cur_example)[0]
            if predicted_value >= target_range[0] and predicted_value <= target_range[1]:
                raise ValueError('The target_range cannot cover the current prediction')

            elif predicted_value < target_range[0]:
                cf_direction = 1
                needed_score_gain = target_range[0] - predicted_value
                score_gain_bound = target_range[1] - predicted_value
            else:
                cf_direction = -1
                needed_score_gain = target_range[1] - predicted_value
                score_gain_bound = target_range[0] - predicted_value

        # Step 2: Generate continuous and categorical options
        options = {}

        # Generate a similarity threshold if it is not provided
        if sim_threshold is None:
            additive_ranges = []

            for i in range(len(self.ebm.feature_names)):
                if self.ebm.feature_types[i] == 'continuous':
                    cur_values = self.ebm.additive_terms_[i]
                    additive_ranges.append(np.max(cur_values) - np.min(cur_values))

            sim_threshold = np.mean(additive_ranges) * sim_threshold_factor

        # To make it faster to solve the MILP problem, we can decrease the
        # number of variables by filtering out unhelpful and redundant options
        #
        # (1) Unhelpful options: options that move the score to an undesirable
        # direction. For example, if we want to flip 0 to 1, options that decrease
        # the score are unhelpful.
        #
        # (2) Redundant options: for a set of options that give similar score
        # gains (bounded by a parameter epsilon), we only need to incldue one
        # option that has the lowest distance. This is only relevant for
        # continuous variables. Users can set the parameter epsilon. The default
        # should be relatively small, otherwise we might miss the optimal solution.

        # Step 2.1: Find all good options from continuous and categorical features
        for cur_feature_id in range(len(self.ebm.feature_names)):

            cur_feature_name = self.ebm.feature_names[cur_feature_id]
            cur_feature_type = self.ebm.feature_types[cur_feature_id]
            cur_feature_index = self.ebm.feature_groups_[cur_feature_id][0]

            if cur_feature_type == 'interaction':
                continue

            elif cur_feature_type == 'continuous':
                # The parameter epsilon controls the threshold of how we determine
                # "similar" options for continuous variables
                epsilon = sim_threshold

                cur_feature_score = cur_scores[cur_feature_name]
                cur_feature_value = float(cur_example[0][cur_feature_id])

                # Users can require the continuous feature to have integer values
                # For example, age, FICO score, and number of accounts
                need_to_be_int = False
                if continuous_integer_features and cur_feature_name in continuous_integer_features:
                    need_to_be_int = True

                cur_cont_options = self.generate_cont_options(
                    cf_direction, cur_feature_index, cur_feature_name,
                    cur_feature_value, cur_feature_score, self.cont_mads,
                    score_gain_bound, epsilon, need_to_be_int
                )

                options[cur_feature_name] = cur_cont_options

            elif cur_feature_type == 'categorical':
                cur_feature_score = cur_scores[cur_feature_name]
                cur_feature_value = str(cur_example[0][cur_feature_id])
                cur_cat_distance = self.cat_distances[cur_feature_name]

                cur_cat_options = self.generate_cat_options(
                    cf_direction, cur_feature_index, cur_feature_value,
                    cur_feature_score, cur_cat_distance, score_gain_bound
                )

                options[cur_feature_name] = cur_cat_options

        # Step 2.2: Filter out undesired options (based on the feature_range)
        if feature_ranges is not None:
            for f_name in feature_ranges:
                cur_range = feature_ranges[f_name]
                f_index = self.ebm.feature_names.index(f_name)
                f_type = self.ebm.feature_types[f_index]

                if f_type == 'continuous':
                    # Delete options that use ineligible options
                    for o in range(len(options[f_name]) - 1, -1, -1):
                        cur_target = options[f_name][o][0]
                        if cur_target < cur_range[0] or cur_target > cur_range[1]:
                            options[f_name].pop(o)
                elif f_type == 'categorical':
                    for o in range(len(options[f_name]) - 1, -1, -1):
                        if options[f_name][o][0] not in cur_range:
                            options[f_name].pop(o)

        # Step 2.3: Compute the interaction offsets for all possible options
        for cur_feature_id in range(len(self.ebm.feature_names)):

            cur_feature_name = self.ebm.feature_names[cur_feature_id]
            cur_feature_type = self.ebm.feature_types[cur_feature_id]

            if cur_feature_type == 'interaction':

                cur_feature_index_1 = self.ebm.feature_groups_[cur_feature_id][0]
                cur_feature_index_2 = self.ebm.feature_groups_[cur_feature_id][1]

                cur_feature_score = cur_scores[cur_feature_name]
                cur_feature_value = [cur_example[0][cur_feature_index_1],
                                     cur_example[0][cur_feature_index_2]]

                options[cur_feature_name] = self.generate_inter_options(
                    cur_feature_id, cur_feature_index_1, cur_feature_index_2,
                    cur_feature_value, cur_feature_score, options
                )

        # Step 2.4: Rescale categorical distances so that they have the same mean
        # as continuous variables (default)
        if categorical_weight == 'auto':
            cont_distances = []
            cat_distances = []

            for f_name in options:
                f_index = self.ebm.feature_names.index(f_name)
                f_type = self.ebm.feature_types[f_index]

                if f_type == 'continuous':
                    for option in options[f_name]:
                        cont_distances.append(option[2])
                elif f_type == 'categorical':
                    for option in options[f_name]:
                        cat_distances.append(option[2])

            categorical_weight = np.mean(cont_distances) / np.mean(cat_distances)

        for f_name in options:
            f_index = self.ebm.feature_names.index(f_name)
            f_type = self.ebm.feature_types[f_index]

            if f_type == 'categorical':
                for option in options[f_name]:
                    option[2] = option[2] * categorical_weight

        # Step 3. Formulate the MILP model and solve it

        # Find diverse solutions by accumulatively muting the optimal solutions
        solutions = []
        muted_variables = []
        is_successful = True

        for _ in tqdm(range(total_cfs)):
            model, variables = self.create_milp(
                cf_direction,
                needed_score_gain,
                features_to_vary,
                max_num_features_to_vary,
                options,
                muted_variables=muted_variables
            )

            model.solve(pulp.apis.PULP_CBC_CMD(msg=verbose, warmStart=True))

            if model.status != 1:
                is_successful = False

            if verbose:
                print('solver runs for {:.2f} seconds'.format(model.solutionTime))
                print('status: {}'.format(pulp.LpStatus[model.status]))

            active_variables = []

            # Print the optimal solution
            for key in variables:
                for x in variables[key]:
                    if x.varValue > 0:
                        active_variables.append(x)

            if verbose:
                print('\nFound solutions:')
                self.print_solution(cur_example, active_variables, options)

            # Collect the current solution and mute the associated variables
            solutions.append([active_variables, pulp.value(model.objective)])

            for var in active_variables:
                if 'x' not in var.name:
                    muted_variables.append(var.name)

        cfs = Counterfactuals(solutions, is_successful, model, variables,
                              self.ebm, cur_example, options)

        return cfs

    def generate_cont_options(self, cf_direction, cur_feature_index,
                              cur_feature_name, cur_feature_value,
                              cur_feature_score, cont_mads, score_gain_bound=None,
                              epsilon=0.005, need_to_be_int=False):
        """
        Generage all alternative options for this continuous variable. This function
        would filter out all options that are:

        1. Not helpful for the counterfactual generation.
        2. Give similar score gain but requires larger distance.

        Args:
            cf_direction (int): Integer `+1` if 0 => 1, `-1` if 1 => 0
                (classification); `+1` if we need to incrase the prediction,
                `-1` if decrease (regression).
            cur_feature_index (int): The index of the current continuous feature.
            cur_feature_name (str): Name of the current feature.
            cur_feature_value (float): The current feature value.
            cur_feature_score (float): The score for the current feature value.
            cont_mads (dict): A map of feature_name => MAD score.
            score_gain_bound (float): Bound of the score gain. We do not collect
                options that give `score_gain` > `score_gain_bound` (when
                `cf_direction=1`), or `score_gain` < `score_gain_bound` (when
                `cf_direction=-1`)
            epsilon (float): The threshold to determine if two options give similar
                score gains. Score gains $s_1$ and $s_2$ are similar if
                $|s_1 - s_2| <$ epsilon. Smaller epsilon significantly increases
                the time to solve the MILP. Large epsilon might filter out the
                optimal CF. Defaults to 0.005.
            need_to_be_int (bool): True if the target values for this continuous
                variable need to have integer values.

        Returns:
            list: List of option tuples (target, score gain, distance, bin_index)
        """

        # For each continuous feature, each bin is a variable
        # For each bin, we need to compute (1) score gain, (2) distance
        # (1) score gain is the difference between new bin and current bin
        # (2) distance is L1 distance divided by median absolute deviation (MAD)

        # Get the additive scores of this feature
        additives = self.ebm.additive_terms_[cur_feature_index][1:]

        # Get the bin edges of this feature
        bin_starts = self.ebm.preprocessor_._get_bin_labels(cur_feature_index)[:-1]

        # Create "options", each option is a tuple (target, score_gain, distance,
        # bin_index)
        cont_options = []

        # Identify which bin this value falls into
        cur_bin_id = search_sorted_lower_index(bin_starts, cur_feature_value)
        assert(additives[cur_bin_id] == cur_feature_score)

        for i in range(len(additives)):
            # We only add options that are helpful for the goal
            score_gain = additives[i] - cur_feature_score

            if cf_direction * score_gain <= 0:
                continue

            # Filter out of bound options
            if score_gain_bound:
                if cf_direction == 1 and score_gain > score_gain_bound:
                    continue
                if cf_direction == -1 and score_gain < score_gain_bound:
                    continue

            # Because of the special binning structure of EBM, the distance of
            # bins on the left to the current value is different from the bins
            # that are on the right
            #
            # For bins on the left, the raw distance is abs(bin_start[i + 1] - x)
            # For bins on the right, the raw distance is abs(bin_start[i] - x)
            target = cur_feature_value
            distance = 0

            if i < cur_bin_id:
                # First need to consier if it is need to be an integer
                # If so, it would be the closest integer to the right point
                if need_to_be_int:
                    target = float(int(bin_starts[i + 1]))
                    if target == bin_starts[i + 1]:
                        target -= 1

                    # Skip this option if it is not possible to find an int value
                    if target < bin_starts[i]:
                        continue

                    distance = np.abs(target - cur_feature_value)

                else:
                    target = bin_starts[i + 1]
                    distance = np.abs(target - cur_feature_value)

                    # Subtract a very smaller value to make the target
                    # technically fall into the left bin
                    target -= 1e-4

            elif i > cur_bin_id:
                # First need to consier if it should be an integer value
                # If so, it would be the closest integer to the left point
                if need_to_be_int:
                    target = float(np.ceil(bin_starts[i]))
                    if target == bin_starts[i]:
                        target += 1

                    # Skip this option if it is not possible to find an int value
                    if i + 1 < len(additives) and target >= bin_starts[i + 1]:
                        continue

                    distance = np.abs(target - cur_feature_value)

                else:
                    target = bin_starts[i]
                    distance = np.abs(target - cur_feature_value)

            # Scale the distance based on the deviation of the feature (how changable it is)
            if cont_mads[cur_feature_name] > 0:
                distance /= cont_mads[cur_feature_name]

            cont_options.append([target, score_gain, distance, i])

        # Now we can apply the second round of filtering to remove redundant options
        # Redundant options refer to bins that give similar score gain with larger distance
        cont_options = sorted(cont_options, key=lambda x: x[2])

        start = 0
        while start < len(cont_options):
            for i in range(len(cont_options) - 1, start, -1):
                if np.abs(cont_options[i][1] - cont_options[start][1]) < epsilon:
                    cont_options.pop(i)

            start += 1

        return cont_options

    def generate_cat_options(self, cf_direction, cur_feature_index,
                             cur_feature_value, cur_feature_score,
                             cur_cat_distance, score_gain_bound=None):
        """
        Generage all alternative options for this categorical variable. This function
        would filter out all options that are not helpful for the counterfactual
        generation.

        Args:
            cf_direction (int): Integer `+1` if 0 => 1, `-1` if 1 => 0
                (classification); `+1` if we need to incrase the prediction,
                `-1` if decrease (regression).
            cur_feature_index (int): The index of the current continuous feature.
            cur_feature_value (float): The current feature value.
            cur_feature_score (float): The score for the current feature value.
            cur_cat_distance (dict): A map of feature_level => 1 - frequency.
            score_gain_bound (float): Bound of the score gain. We do not collect
                options that give `score_gain` > `score_gain_bound` (when
                `cf_direction=1`), or `score_gain` < `score_gain_bound` (when
                `cf_direction=-1`)

        Returns:
            list: List of option tuples (target, score_gain, distance, bin_index).
        """

        # Find other options for this categorical variable
        # For each option, we compute the (1) score gain, and (2) distance
        #
        # (1) Score gain is the same as continuous variables
        # (2) The distance is determined by 1 - the level frequency in the
        # training data. It implies that levels with high frequency are easier
        # to "move to"

        # Get the additive scores of this feature
        additives = self.ebm.additive_terms_[cur_feature_index][1:]

        # Get the bin edges of this feature
        levels = self.ebm.preprocessor_._get_bin_labels(cur_feature_index)

        # Create "options", each option is a tuple (target, score_gain, distance, bin_index)
        cat_options = []

        for i in range(len(additives)):
            if levels[i] != cur_feature_value:
                target = levels[i]
                score_gain = additives[i] - cur_feature_score

                # Skip unhelpful options
                if cf_direction * score_gain <= 0:
                    continue

                # Filter out of bound options
                if score_gain_bound:
                    if cf_direction == 1 and score_gain > score_gain_bound:
                        continue
                    if cf_direction == -1 and score_gain < score_gain_bound:
                        continue

                distance = cur_cat_distance[target]

                cat_options.append([target, score_gain, distance, i])

        return cat_options

    def generate_inter_options(self, cur_feature_id, cur_feature_index_1,
                               cur_feature_index_2, cur_feature_value,
                               cur_feature_score, options):
        """
        Generage all possible options for this interaction variable.

        Interaction terms are interesting in this MILP. Each option counts as a
        variable, but each variable only affects the score gain, not the distance.

        Note that in EBM, the bin definitions for interaction terms can be different
        from their defintiions for individual continuous variables.

        To model interaction terms, we can think it as a binary variable. The
        value is determined by the multiplication of two main effect variables.
        Each interaction variable describes a combination of two main effect
        variables. Therefore, say continuous variable A has $x$ probable options,
        and another continuous variable B has $y$ probable options, then we should
        add $x \\times y$ binary variables to offset their probable interaction
        effects.

        Args:
            cur_feature_id (int): The id of this interaction effect.
            cur_feature_index_1 (int): The index of the first main effect.
            cur_feature_index_2 (int): The index of the second main effect.
            cur_feature_value (float): The current feature value.
            cur_feature_score (float): The score for the current feature value.
            options (dict): The current option list, feature_name ->
                [`target`, `score_gain`, `distance`, `bin_id`].

        Returns:
            List of option tuples (target, score_gain, distance, bin_index)
        """

        # Get the sub-types for this interaction term
        cur_feature_type_1 = self.ebm.feature_types[cur_feature_index_1]
        cur_feature_type_2 = self.ebm.feature_types[cur_feature_index_2]

        # Get the sub-names for this interaction term
        cur_feature_name_1 = self.ebm.feature_names[cur_feature_index_1]
        cur_feature_name_2 = self.ebm.feature_names[cur_feature_index_2]

        # The first column and row are reserved for missing values (even with
        # categorical features)
        additives = self.ebm.additive_terms_[cur_feature_id][1:, 1:]

        bin_starts_1 = self.ebm.pair_preprocessor_._get_bin_labels(cur_feature_index_1)
        bin_starts_2 = self.ebm.pair_preprocessor_._get_bin_labels(cur_feature_index_2)

        # Four possibilities here: cont x cont, cont x cat, cat x cont, cat x cat.
        # Each has a different way to lookup the bin table.
        inter_options = []

        if cur_feature_type_1 == 'continuous':
            if cur_feature_type_2 == 'continuous':
                # cont x cont
                cur_feature_value = [
                    float(cur_feature_value[0]), float(cur_feature_value[1])]
                bin_starts_1 = bin_starts_1[:-1]
                bin_starts_2 = bin_starts_2[:-1]

                # Iterate through all possible combinations of options from these two
                # variables
                for opt_1 in options[cur_feature_name_1]:
                    for opt_2 in options[cur_feature_name_2]:

                        # locate the bin for each option value
                        bin_1 = search_sorted_lower_index(bin_starts_1, opt_1[0])
                        bin_2 = search_sorted_lower_index(bin_starts_2, opt_2[0])
                        new_score = additives[bin_1, bin_2]
                        score_gain = new_score - cur_feature_score

                        # Optimization: here we cannot comapre the score_gain with
                        # original interaction score to filter interaction options,
                        # because the choice of two individual main effects do not
                        # consier this interaction score
                        #
                        # Basically, the score gain of one interaction effect does
                        # not affect the way we choose options for the main
                        # variables. Only the solver can decide that :(

                        inter_options.append([
                            [opt_1[0], opt_2[0]],
                            score_gain,
                            0,
                            [opt_1[3], opt_2[3]]
                        ])

            else:
                # cont x cat
                cur_feature_value = [
                    float(cur_feature_value[0]), cur_feature_value[1]]
                bin_starts_1 = bin_starts_1[:-1]

                # Iterate through all possible combinations of options from these two
                # variables
                for opt_1 in options[cur_feature_name_1]:
                    for opt_2 in options[cur_feature_name_2]:

                        # locate the bin for each option value
                        bin_1 = search_sorted_lower_index(bin_starts_1, opt_1[0])
                        bin_2 = bin_starts_2.index(opt_2[0])
                        new_score = additives[bin_1, bin_2]
                        score_gain = new_score - cur_feature_score

                        inter_options.append([
                            [opt_1[0], opt_2[0]],
                            score_gain,
                            0,
                            [opt_1[3], opt_2[3]]
                        ])

        else:
            if cur_feature_type_2 == 'continuous':
                # cat x cont
                cur_feature_value = [cur_feature_value[0],
                                     float(cur_feature_value[1])]
                bin_starts_2 = bin_starts_2[:-1]

                # Iterate through all possible combinations of options from
                # these two variables
                for opt_1 in options[cur_feature_name_1]:
                    for opt_2 in options[cur_feature_name_2]:

                        # locate the bin for each option value
                        bin_1 = bin_starts_1.index(opt_1[0])
                        bin_2 = search_sorted_lower_index(bin_starts_2, opt_2[0])

                        new_score = additives[bin_1, bin_2]
                        score_gain = new_score - cur_feature_score

                        inter_options.append([
                            [opt_1[0], opt_2[0]],
                            score_gain,
                            0,
                            [opt_1[3], opt_2[3]]
                        ])
            else:
                # cat x cat

                # Iterate through all possible combinations of options from
                # these two variables
                for opt_1 in options[cur_feature_name_1]:
                    for opt_2 in options[cur_feature_name_2]:

                        # locate the bin for each option value
                        bin_1 = bin_starts_1.index(opt_1[0])
                        bin_2 = bin_starts_2.index(opt_2[0])

                        new_score = additives[bin_1, bin_2]
                        score_gain = new_score - cur_feature_score

                        inter_options.append([
                            [opt_1[0], opt_2[0]],
                            score_gain,
                            0,
                            [opt_1[3], opt_2[3]]
                        ])

        return inter_options

    @staticmethod
    def create_milp(cf_direction, needed_score_gain, features_to_vary,
                    max_num_features_to_vary, options, muted_variables=[]):
        """
        Create a MILP to find counterfactuals (CF) using PuLP.

        Args:
            cf_direction (int): Integer +1 if 0 => 1, -1 if 1 => 0 (classification),
                +1 if we need to incrase the prediction, -1 if decrease (regression).
            needed_score_gain (float): The score gain needed to achieve the CF goal.
            features_to_vary (list[str]): Feature names of features that the
                generated CF can change.
            max_num_features_to_vary (int): Max number of features that the
                generated CF can change. If the value is `None`, the CFs can
                change any number of features.
            options (dict): Possible options for each variable. Each option is a
                list [target, score_gain, distance, bin_index].
            muted_variables (list[str]): Variables that this MILP should not use.
                This is useful to mute optimal variables so we can explore diverse
                solutions. This list should not include interaction variables.

        Returns:
            A tuple (`model`, `variables`), where `model` is a pulp.LpProblem
            model that encodes the MILP problem, and `variables` is a dict of
            variables used in the `model`: `feature_name` => [`variables`].
        """

        # Create a model (minimizing the distance)
        model = pulp.LpProblem('ebmCounterfactual', pulp.LpMinimize)

        distance = 0
        score_gain = 0

        muted_variables_set = set(muted_variables)

        # Create variables
        variables = {}
        for f in features_to_vary:
            # Each variable encodes an option (0: not use this option,
            # 1: use this option)
            cur_variables = []

            for option in options[f]:
                var_name = '{}:{}'.format(f, option[3])

                # Skip the muted variables
                if var_name in muted_variables_set:
                    continue

                x = pulp.LpVariable(var_name,
                                    lowBound=0,
                                    upBound=1,
                                    cat='Binary')
                x.setInitialValue(0)

                score_gain += option[1] * x
                distance += option[2] * x

                cur_variables.append(x)

            variables[f] = cur_variables

            # A local constraint is that we can only at most selection one option from
            # one feature
            model += pulp.lpSum(cur_variables) <= 1

        # Users can also set `max_num_features_to_vary` to control the total
        # number of features to vary
        if max_num_features_to_vary is not None:
            main_variables = []
            for f in variables:
                main_variables.extend(variables[f])

            model += pulp.lpSum(main_variables) <= max_num_features_to_vary

        # Create variables for interaction effects
        for opt_name in options:
            if 'x' in opt_name:
                f1_name = re.sub(r'(.+)\sx\s.+', r'\1', opt_name)
                f2_name = re.sub(r'.+\sx\s(.+)', r'\1', opt_name)

                if f1_name in features_to_vary and f2_name in features_to_vary:

                    # We need to include this interaction effect
                    cur_variables = []

                    for option in options[opt_name]:
                        z = pulp.LpVariable('{}:{},{}'.format(opt_name,
                                                              option[3][0],
                                                              option[3][1]),
                                            lowBound=0,
                                            upBound=1,
                                            cat='Continuous')
                        z.setInitialValue(0)

                        # Need to iterate through existing variables for f1 and f2 to find
                        # the corresponding variables
                        x_f1 = None
                        x_f2 = None

                        # Skp if this interaction variable involves muted main variable
                        x_f1_name = '{}:{}'.format(f1_name, option[3][0])
                        x_f2_name = '{}:{}'.format(f2_name, option[3][1])

                        if x_f1_name in muted_variables_set or x_f2_name in muted_variables_set:
                            continue

                        for x in variables[f1_name]:
                            if x.name == x_f1_name:
                                x_f1 = x
                                break

                        for x in variables[f2_name]:
                            if x.name == x_f2_name:
                                x_f2 = x
                                break

                        assert(x_f1 is not None and x_f2 is not None)

                        # variable z is actually the product of x_f1 and x_f2
                        # We can linearize it by 3 constraints
                        model += z <= x_f1
                        model += z <= x_f2
                        model += z >= x_f1 + x_f2 - 1

                        cur_variables.append(z)

                    variables[opt_name] = cur_variables

        # Use constraint to express counterfactual
        if cf_direction == 1:
            model += score_gain >= needed_score_gain
        else:
            model += score_gain <= needed_score_gain

        # We want to minimize the distance
        model += distance

        return model, variables

    def print_solution(self, cur_example, active_variables, options):
        """
        Print the optimal solution.

        Args:
            cur_example (np.ndarray): the original data point.
            active_variables (list[variable]): binary variables with value 1.
            options (dict): all the possible options for all features.
        """

        for var in active_variables:
            # Skip interaction vars (included)
            if 'x' not in var.name:
                f_name = re.sub(r'(.+):\d+', r'\1', var.name)
                bin_i = int(re.sub(r'.+:(\d+)', r'\1', var.name))

                # Find the original value
                org_value = cur_example[0][self.ebm.feature_names.index(f_name)]

                # Find the target bin
                f_index = self.ebm.feature_names.index(f_name)
                f_type = self.ebm.feature_types[f_index]

                if f_type == 'continuous':
                    bin_starts = self.ebm.preprocessor_._get_bin_labels(f_index)[:-1]

                    target_bin = '[{},'.format(bin_starts[bin_i])

                    if bin_i + 1 < len(bin_starts):
                        target_bin += ' {})'.format(bin_starts[bin_i + 1])
                    else:
                        target_bin += ' inf)'
                else:
                    target_bin = ''
                    org_value = '"{}"'.format(org_value)

                for option in options[f_name]:
                    if option[3] == bin_i:
                        print('Change <{}> from {} to {} {}'.format(
                            f_name, org_value, option[0], target_bin
                        ))
                        print('\t* score gain: {:.4f}\n\t* distance cost: {:.4f}'.format(
                            option[1], option[2]
                        ))
                        break

            else:
                f_name = re.sub(r'(.+):.+', r'\1', var.name)
                f_name = f_name.replace('_x_', ' x ')
                bin_0 = int(re.sub(r'.+:(\d+),\d+', r'\1', var.name))
                bin_1 = int(re.sub(r'.+:\d+,(\d+)', r'\1', var.name))

                for option in options[f_name]:
                    if option[3][0] == bin_0 and option[3][1] == bin_1:
                        print('Trigger interaction term: <{}>'.format(
                            f_name
                        ))
                        print('\t* score gain: {:.4f}\n\t* distance cost: {:.4f}'.format(
                            option[1], 0
                        ))
                        break
        print()

    @staticmethod
    def compute_mad(xs):
        """
        Compute the median absolute deviation of a continuous feature.

        Args:
            xs (np.ndarray): A column of continuous values.

        Returns:
            float: MAD value of xs.
        """
        xs_median = np.median(xs.astype(float))
        mad = np.median(np.abs(xs.astype(float) - xs_median))
        return mad

    @staticmethod
    def compute_frequency_distance(xs):
        """
        For categorical variables, we compute 1 - frequency as their distance. It implies
        that switching to a frequent value takes less effort.

        Args:
            xs (np.ndarray): A column of categorical values.

        Returns:
            dict: category level -> 1 - frequency.
        """
        counter = Counter(xs)

        results = {}

        for key in counter:
            results[key] = 1 - (counter[key] / len(xs))

        return results


def search_sorted_lower_index(sorted_edges, value):
    """Binary search to locate the correct bin for continuous features."""
    left = 0
    right = len(sorted_edges) - 1

    while right - left > 1:
        i = left + int((right - left) / 2)

        if value > sorted_edges[i]:
            left = i
        elif value < sorted_edges[i]:
            right = i
        else:
            return i

    # Handle out of bound issues
    if value >= sorted_edges[right]:
        return right
    if value < sorted_edges[left]:
        return left

    return right - 1


def sigmoid(x):
    """Sigmoid function."""
    return 1 / (1 + np.exp(x))
