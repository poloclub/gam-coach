"""Main module for GAM Coach.

GAM Coach implements a simple and flexible method to generate counterfactual
explanations for generalized additive models (GAMs).
"""

import numpy as np
import pandas as pd
import re
import pulp
from tqdm import tqdm
from scipy.stats import gaussian_kde
from interpret.glassbox import (
    ExplainableBoostingClassifier,
    ExplainableBoostingRegressor,
)
from collections import Counter
from typing import Union

from .counterfactuals import Counterfactuals

SEED = 922


class GAMCoach:
    """Main class for GAM Coach."""

    def __init__(
        self,
        ebm: Union[ExplainableBoostingClassifier, ExplainableBoostingRegressor],
        x_train: np.ndarray,
        cont_mads=None,
        cat_distances=None,
        adjust_cat_distance=True,
    ):
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
            adjust_cat_distance (bool, optional): If true, we use (1 -
                frequency(level)) for each level. Otherwise, we give distance = 1
                for different levels and 0 for the same level.
        """

        self.ebm: Union[
            ExplainableBoostingClassifier, ExplainableBoostingRegressor
        ] = ebm
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

        self.adjust_cat_distance: bool = adjust_cat_distance

        # If cont_mads is not given, we compute it from the training data
        if self.cont_mads is None:
            ebm_cont_indexes = np.array(
                [
                    i
                    for i in range(len(self.ebm.feature_names))
                    if self.ebm.feature_types[i] == "continuous"
                ]
            )

            self.cont_mads = {}

            for i in ebm_cont_indexes:
                self.cont_mads[ebm.feature_names[i]] = self.compute_mad(
                    self.x_train[:, i]
                )

        # If cat_distance is not given, we compute it from the training data
        if self.cat_distances is None:
            ebm_cat_indexes = np.array(
                [
                    i
                    for i in range(len(self.ebm.feature_names))
                    if self.ebm.feature_types[i] == "categorical"
                ]
            )

            self.cat_distances = {}

            if self.adjust_cat_distance:
                for i in ebm_cat_indexes:
                    self.cat_distances[
                        self.ebm.feature_names[i]
                    ] = GAMCoach.compute_frequency_distance(self.x_train[:, i])
            else:
                for i in ebm_cat_indexes:
                    self.cat_distances[
                        self.ebm.feature_names[i]
                    ] = GAMCoach.compute_naive_cat_distance(self.x_train[:, i])

        # Determine if the ebm is a classifier or a regressor
        self.is_classifier = isinstance(self.ebm.intercept_, np.ndarray)
        """True if the ebm model is a classifier, false if it is a regressor."""

    def generate_cfs(
        self,
        cur_example: np.ndarray,
        total_cfs: int = 1,
        target_range: tuple = None,
        sim_threshold_factor: float = 0.005,
        sim_threshold: float = None,
        categorical_weight: Union[float, str] = "auto",
        features_to_vary: list = None,
        max_num_features_to_vary: int = None,
        feature_ranges: dict = None,
        continuous_integer_features: list = None,
        verbose: int = 1,
    ) -> Counterfactuals:
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
            verbose (int): 0: no any output, 1: show progress bar, 2: show internal
                optimization details

        Returns:
            Counterfactuals: The generated counterfactual examples with their
                associated distances and change information.
        """

        # Transforming some parameters
        if len(cur_example.shape) == 1:
            cur_example = cur_example.reshape(1, -1)

        if features_to_vary is None:
            features_to_vary = [
                self.ebm.feature_names[i]
                for i in range(len(self.ebm.feature_types))
                if self.ebm.feature_types[i] != "interaction"
            ]

        # Step 1: Find the current score for each feature
        # This is done by ebm.explain_local()
        cur_scores = {}

        if self.is_classifier:
            cur_scores["intercept"] = self.ebm.intercept_[0]
        else:
            cur_scores["intercept"] = self.ebm.intercept_

        local_data = self.ebm.explain_local(cur_example)._internal_obj

        for i in range(len(self.ebm.feature_names)):
            cur_feature_name = self.ebm.feature_names[i]
            cur_feature_type = self.ebm.feature_types[i]

            cur_scores[cur_feature_name] = local_data["specific"][0]["scores"][i]

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
                raise ValueError(
                    "target_range cannot be None when the model is a regressor"
                )

            predicted_value = self.ebm.predict(cur_example)[0]
            if (
                predicted_value >= target_range[0]
                and predicted_value <= target_range[1]
            ):
                raise ValueError("The target_range cannot cover the current prediction")

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
                if self.ebm.feature_types[i] == "continuous":
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

            if cur_feature_type == "interaction":
                continue

            elif cur_feature_type == "continuous":
                # The parameter epsilon controls the threshold of how we determine
                # "similar" options for continuous variables
                epsilon = sim_threshold

                cur_feature_score = cur_scores[cur_feature_name]
                cur_feature_value = float(cur_example[0][cur_feature_id])

                # Users can require the continuous feature to have integer values
                # For example, age, FICO score, and number of accounts
                need_to_be_int = False
                if (
                    continuous_integer_features
                    and cur_feature_name in continuous_integer_features
                ):
                    need_to_be_int = True

                cur_cont_options = self.generate_cont_options(
                    cf_direction,
                    cur_feature_index,
                    cur_feature_name,
                    cur_feature_value,
                    cur_feature_score,
                    self.cont_mads,
                    cur_example[0],
                    score_gain_bound,
                    epsilon,
                    need_to_be_int,
                )

                options[cur_feature_name] = cur_cont_options

            elif cur_feature_type == "categorical":
                cur_feature_score = cur_scores[cur_feature_name]
                cur_feature_value = str(cur_example[0][cur_feature_id])
                cur_cat_distance = self.cat_distances[cur_feature_name]

                cur_cat_options = self.generate_cat_options(
                    cf_direction,
                    cur_feature_index,
                    cur_feature_value,
                    cur_feature_score,
                    cur_cat_distance,
                    cur_example[0],
                    score_gain_bound,
                )

                options[cur_feature_name] = cur_cat_options

        # Step 2.2: Filter out undesired options (based on the feature_range)
        if feature_ranges is not None:
            for f_name in feature_ranges:
                cur_range = feature_ranges[f_name]
                f_index = self.ebm.feature_names.index(f_name)
                f_type = self.ebm.feature_types[f_index]

                if f_type == "continuous":
                    # Delete options that use out-of-range options
                    for o in range(len(options[f_name]) - 1, -1, -1):
                        cur_target = options[f_name][o][0]
                        if cur_target < cur_range[0] or cur_target > cur_range[1]:
                            options[f_name].pop(o)
                elif f_type == "categorical":
                    for o in range(len(options[f_name]) - 1, -1, -1):
                        if options[f_name][o][0] not in cur_range:
                            options[f_name].pop(o)

        # Step 2.3: Compute the interaction offsets for all possible options
        for cur_feature_id in range(len(self.ebm.feature_names)):

            cur_feature_name = self.ebm.feature_names[cur_feature_id]
            cur_feature_type = self.ebm.feature_types[cur_feature_id]

            if cur_feature_type == "interaction":

                cur_feature_index_1 = self.ebm.feature_groups_[cur_feature_id][0]
                cur_feature_index_2 = self.ebm.feature_groups_[cur_feature_id][1]

                cur_feature_score = cur_scores[cur_feature_name]
                options[cur_feature_name] = self.generate_inter_options(
                    cur_feature_id,
                    cur_feature_index_1,
                    cur_feature_index_2,
                    cur_feature_score,
                    options,
                )

        # Step 2.4: Rescale categorical distances so that they have the same mean
        # as continuous variables (default)
        if categorical_weight == "auto":
            cont_distances = []
            cat_distances = []

            for f_name in options:
                f_index = self.ebm.feature_names.index(f_name)
                f_type = self.ebm.feature_types[f_index]

                if f_type == "continuous":
                    for option in options[f_name]:
                        cont_distances.append(option[2])
                elif f_type == "categorical":
                    for option in options[f_name]:
                        cat_distances.append(option[2])

            categorical_weight = np.mean(cont_distances) / np.mean(cat_distances)

        for f_name in options:
            f_index = self.ebm.feature_names.index(f_name)
            f_type = self.ebm.feature_types[f_index]

            if f_type == "categorical":
                for option in options[f_name]:
                    option[2] = option[2] * categorical_weight

        # Step 3. Formulate the MILP model and solve it

        # Find diverse solutions by accumulatively muting the optimal solutions
        solutions = []
        muted_variables = []
        is_successful = True

        for _ in tqdm(range(total_cfs), disable=verbose == 0):
            model, variables = self.create_milp(
                cf_direction,
                needed_score_gain,
                features_to_vary,
                options,
                max_num_features_to_vary,
                muted_variables=muted_variables,
            )

            model.solve(pulp.apis.PULP_CBC_CMD(msg=verbose > 0, warmStart=True))

            if model.status != 1:
                is_successful = False

            if verbose == 2:
                print("solver runs for {:.2f} seconds".format(model.solutionTime))
                print("status: {}".format(pulp.LpStatus[model.status]))

            active_variables = []

            # Print the optimal solution
            for key in variables:
                for x in variables[key]:
                    if x.varValue > 0:
                        active_variables.append(x)

            if verbose == 2:
                print("\nFound solutions:")
                self.print_solution(cur_example, active_variables, options)

            # Collect the current solution and mute the associated variables
            solutions.append([active_variables, pulp.value(model.objective)])

            for var in active_variables:
                if " x " not in var.name:
                    muted_variables.append(var.name)

        cfs = Counterfactuals(
            solutions, is_successful, model, variables, self.ebm, cur_example, options
        )

        return cfs

    def generate_cont_options(
        self,
        cf_direction,
        cur_feature_index,
        cur_feature_name,
        cur_feature_value,
        cur_feature_score,
        cont_mads,
        cur_example,
        score_gain_bound=None,
        epsilon=0.005,
        need_to_be_int=False,
        skip_unhelpful=True,
    ):
        """
        Generate all alternative options for this continuous variable. This function
        would filter out all options that are:

        1. Not helpful for the counterfactual generation.
        2. Give similar score gain but requires larger distance.

        Args:
            cf_direction (int): Integer `+1` if 0 => 1, `-1` if 1 => 0
                (classification); `+1` if we need to increase the prediction,
                `-1` if decrease (regression).
            cur_feature_index (int): The index of the current continuous feature.
            cur_feature_name (str): Name of the current feature.
            cur_feature_value (float): The current feature value.
            cur_feature_score (float): The score for the current feature value.
            cont_mads (dict): A map of feature_name => MAD score.
            cur_example (list): Current sample values
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
            skip_unhelpful (bool): True if to skip options from main
                effects that give opposite score gain. It is rare that there is a
                positive score gain from pair-interaction that outweigh negative
                score gain from two main effects, and adjusting the distance penalty.

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
        assert additives[cur_bin_id] == cur_feature_score

        # Identify interaction terms that we need to consider
        associated_interactions = []

        for cur_feature_id in range(len(self.ebm.feature_names)):
            cur_feature_type = self.ebm.feature_types[cur_feature_id]
            if cur_feature_type == "interaction":

                indexes = self.ebm.feature_groups_[cur_feature_id]

                if cur_feature_index in indexes:
                    feature_position = 0 if indexes[0] == cur_feature_index else 1

                    other_position = 1 - feature_position
                    other_index = indexes[other_position]
                    other_type = self.ebm.feature_types[other_index]

                    # Get the current additive scores and bin edges
                    inter_additives = self.ebm.additive_terms_[cur_feature_id][1:, 1:]

                    # Have to skip the max edge if it is continuous
                    bin_starts_feature = self.ebm.pair_preprocessor_._get_bin_labels(
                        cur_feature_index
                    )[:-1]

                    bin_starts_other = self.ebm.pair_preprocessor_._get_bin_labels(
                        other_index
                    )
                    if other_type == "continuous":
                        bin_starts_other = bin_starts_other[:-1]

                    # Get the current interaction term score
                    other_bin = None
                    if other_type == "continuous":
                        other_bin = search_sorted_lower_index(
                            bin_starts_other, float(cur_example[other_index])
                        )
                    else:
                        other_bin = bin_starts_other.index(cur_example[other_index])

                    feature_bin = search_sorted_lower_index(
                        bin_starts_feature, cur_feature_value
                    )

                    feature_inter_score = 0

                    if feature_position == 0:
                        feature_inter_score = inter_additives[feature_bin, other_bin]
                    else:
                        feature_inter_score = inter_additives[other_bin, feature_bin]

                    # Extract the row or column where we fix the other feature and
                    # vary the current feature
                    feature_inter_bin_starts = bin_starts_feature
                    feature_inter_additives = []

                    if feature_position == 0:
                        for i in range(len(inter_additives)):
                            feature_inter_additives.append(
                                inter_additives[i, other_bin]
                            )
                    else:
                        for i in range(len(inter_additives[0])):
                            feature_inter_additives.append(
                                inter_additives[other_bin, i]
                            )

                    # Register this interaction term
                    associated_interactions.append(
                        {
                            "inter_index": indexes,
                            "cur_interaction_id": cur_feature_id,
                            "feature_inter_score": feature_inter_score,
                            "feature_inter_bin_starts": feature_inter_bin_starts,
                            "feature_inter_additives": feature_inter_additives,
                        }
                    )

        for i in range(len(additives)):
            # Because of the special binning structure of EBM, the distance of
            # bins on the left to the current value is different from the bins
            # that are on the right
            #
            # For bins on the left, the raw distance is abs(bin_start[i + 1] - x)
            # For bins on the right, the raw distance is abs(bin_start[i] - x)
            target = cur_feature_value
            distance = 0

            if i < cur_bin_id:
                # First need to consider if it is need to be an integer
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
                # First need to consider if it should be an integer value
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

            # Scale the distance based on the deviation of the feature (how changeable it is)
            if cont_mads[cur_feature_name] > 0:
                distance /= cont_mads[cur_feature_name]

            # Compute score gain which has two parts:
            # (1) gain from the change of main effect
            # (2) gain from the change of interaction effect

            # Main effect
            main_score_gain = additives[i] - cur_feature_score

            # Interaction terms
            # A list to track all interaction score gain offsets
            # [[interaction id, interaction score gain]]
            inter_score_gain = 0
            inter_score_gains = []

            for d in associated_interactions:
                inter_bin_id = search_sorted_lower_index(
                    d["feature_inter_bin_starts"], target
                )
                inter_score_gain += (
                    d["feature_inter_additives"][inter_bin_id]
                    - d["feature_inter_score"]
                )
                inter_score_gains.append(
                    [
                        d["cur_interaction_id"],
                        d["feature_inter_additives"][inter_bin_id]
                        - d["feature_inter_score"],
                    ]
                )

            score_gain = main_score_gain + inter_score_gain

            if cf_direction * score_gain <= 0 and skip_unhelpful:
                continue

            # Filter out of bound options
            if score_gain_bound and skip_unhelpful:
                if cf_direction == 1 and score_gain > score_gain_bound:
                    continue
                if cf_direction == -1 and score_gain < score_gain_bound:
                    continue

            cont_options.append([target, score_gain, distance, i, inter_score_gains])

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

    def generate_cat_options(
        self,
        cf_direction,
        cur_feature_index,
        cur_feature_value,
        cur_feature_score,
        cur_cat_distance,
        cur_example,
        score_gain_bound=None,
        skip_unhelpful=True,
    ):
        """
        Generate all alternative options for this categorical variable. This function
        would filter out all options that are not helpful for the counterfactual
        generation.

        Args:
            cf_direction (int): Integer `+1` if 0 => 1, `-1` if 1 => 0
                (classification); `+1` if we need to increase the prediction,
                `-1` if decrease (regression).
            cur_feature_index (int): The index of the current continuous feature.
            cur_feature_value (float): The current feature value.
            cur_feature_score (float): The score for the current feature value.
            cur_cat_distance (dict): A map of feature_level => 1 - frequency.
            cur_example (list): Current sample values.
            score_gain_bound (float): Bound of the score gain. We do not collect
                options that give `score_gain` > `score_gain_bound` (when
                `cf_direction=1`), or `score_gain` < `score_gain_bound` (when
                `cf_direction=-1`)
            skip_unhelpful (bool): True if to skip options from main
                effects that give opposite score gain. It is rare that there is a
                positive score gain from pair-interaction that outweigh negative
                score gain from two main effects, and adjusting the distance penalty.

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

        # Identify interaction terms that we need to consider
        associated_interactions = []

        for cur_feature_id in range(len(self.ebm.feature_names)):
            cur_feature_type = self.ebm.feature_types[cur_feature_id]
            if cur_feature_type == "interaction":

                indexes = self.ebm.feature_groups_[cur_feature_id]

                if cur_feature_index in indexes:
                    feature_position = 0 if indexes[0] == cur_feature_index else 1

                    other_position = 1 - feature_position
                    other_index = indexes[other_position]
                    other_type = self.ebm.feature_types[other_index]
                    other_name = self.ebm.feature_names[other_index]

                    # Get the current additive scores and bin edges
                    inter_additives = self.ebm.additive_terms_[cur_feature_id][1:, 1:]

                    bin_starts_feature = self.ebm.pair_preprocessor_._get_bin_labels(
                        cur_feature_index
                    )
                    bin_starts_other = self.ebm.pair_preprocessor_._get_bin_labels(
                        other_index
                    )

                    # Have to skip the max edge if it is continuous
                    if other_type == "continuous":
                        bin_starts_other = bin_starts_other[:-1]

                    # Get the current interaction term score
                    other_bin = None
                    if other_type == "continuous":
                        other_bin = search_sorted_lower_index(
                            bin_starts_other, float(cur_example[other_index])
                        )
                    else:
                        other_bin = bin_starts_other.index(cur_example[other_index])

                    feature_bin = bin_starts_feature.index(cur_feature_value)

                    feature_inter_score = 0

                    if feature_position == 0:
                        feature_inter_score = inter_additives[feature_bin, other_bin]
                    else:
                        feature_inter_score = inter_additives[other_bin, feature_bin]

                    # Extract the row or column where we fix the other features and
                    # vary the current feature
                    feature_inter_bin_starts = bin_starts_feature
                    feature_inter_additives = []

                    if feature_position == 0:
                        for i in range(len(inter_additives)):
                            feature_inter_additives.append(
                                inter_additives[i, other_bin]
                            )
                    else:
                        for i in range(len(inter_additives[0])):
                            feature_inter_additives.append(
                                inter_additives[other_bin, i]
                            )

                    # Register this interaction term
                    associated_interactions.append(
                        {
                            "inter_index": indexes,
                            "cur_interaction_id": cur_feature_id,
                            "feature_inter_score": feature_inter_score,
                            "feature_inter_bin_starts": feature_inter_bin_starts,
                            "feature_inter_additives": feature_inter_additives,
                        }
                    )

        for i in range(len(additives)):
            if levels[i] != cur_feature_value:
                target = levels[i]
                distance = cur_cat_distance[target]

                # Compute score gain which has two parts:
                # (1) gain from the change of main effect
                # (2) gain from the change of interaction effect

                # Main effect
                main_score_gain = additives[i] - cur_feature_score

                # Interaction terms
                # A list to track all interaction score gain offsets
                # [[interaction id, interaction score gain]]
                inter_score_gain = 0
                inter_score_gains = []

                for d in associated_interactions:
                    inter_bin_id = d["feature_inter_bin_starts"].index(target)
                    inter_score_gain += (
                        d["feature_inter_additives"][inter_bin_id]
                        - d["feature_inter_score"]
                    )
                    inter_score_gains.append(
                        [
                            d["cur_interaction_id"],
                            d["feature_inter_additives"][inter_bin_id]
                            - d["feature_inter_score"],
                        ]
                    )

                score_gain = main_score_gain + inter_score_gain

                # Skip unhelpful options
                if cf_direction * score_gain <= 0 and skip_unhelpful:
                    continue

                # Filter out of bound options
                if score_gain_bound and skip_unhelpful:
                    if cf_direction == 1 and score_gain > score_gain_bound:
                        continue
                    if cf_direction == -1 and score_gain < score_gain_bound:
                        continue

                cat_options.append([target, score_gain, distance, i, inter_score_gains])

        return cat_options

    def generate_inter_options(
        self,
        cur_feature_id,
        cur_feature_index_1,
        cur_feature_index_2,
        cur_feature_score,
        options,
    ):
        """
        Generate all possible options for this interaction variable.

        Interaction terms are interesting in this MILP. Each option counts as a
        variable, but each variable only affects the score gain, not the distance.

        Note that in EBM, the bin definitions for interaction terms can be different
        from their definitions for individual continuous variables.

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

        # Four possibilities here: cont x cont, cont x cat, cat x cont, cat x cat.
        # Each has a different way to lookup the bin table.
        inter_options = []

        # Iterate through all possible combinations of options from these two
        # variables
        for opt_1 in options[cur_feature_name_1]:
            for opt_2 in options[cur_feature_name_2]:

                bin_starts_1 = self.ebm.pair_preprocessor_._get_bin_labels(
                    cur_feature_index_1
                )
                bin_starts_2 = self.ebm.pair_preprocessor_._get_bin_labels(
                    cur_feature_index_2
                )

                bin_1 = None
                bin_2 = None

                if cur_feature_type_1 == "continuous":
                    if cur_feature_type_2 == "continuous":
                        # cont x cont
                        bin_starts_1 = bin_starts_1[:-1]
                        bin_starts_2 = bin_starts_2[:-1]

                        # locate the bin for each option value
                        bin_1 = search_sorted_lower_index(bin_starts_1, opt_1[0])
                        bin_2 = search_sorted_lower_index(bin_starts_2, opt_2[0])

                    else:
                        # cont x cat
                        bin_starts_1 = bin_starts_1[:-1]

                        # locate the bin for each option value
                        bin_1 = search_sorted_lower_index(bin_starts_1, opt_1[0])
                        bin_2 = bin_starts_2.index(opt_2[0])

                else:
                    if cur_feature_type_2 == "continuous":
                        # cat x cont
                        bin_starts_2 = bin_starts_2[:-1]

                        # locate the bin for each option value
                        bin_1 = bin_starts_1.index(opt_1[0])
                        bin_2 = search_sorted_lower_index(bin_starts_2, opt_2[0])

                    else:
                        # cat x cat

                        # locate the bin for each option value
                        bin_1 = bin_starts_1.index(opt_1[0])
                        bin_2 = bin_starts_2.index(opt_2[0])

                new_score = additives[bin_1, bin_2]
                score_gain = new_score - cur_feature_score

                # The score gain on the interaction term need to offset the interaction
                # score gain we have already counted on the main effect options. That
                # score is saved in the option tuple.

                # We first need to find the common interaction id
                common_index = [-1, -1]
                for m in range(len(opt_1[4])):
                    for n in range(len(opt_2[4])):
                        if opt_1[4][m][0] == opt_2[4][n][0]:
                            common_index = [m, n]
                            break

                    if common_index[0] != -1 and common_index[1] != -1:
                        break

                score_gain -= opt_1[4][common_index[0]][1]
                score_gain -= opt_2[4][common_index[1]][1]

                inter_options.append(
                    [[opt_1[0], opt_2[0]], score_gain, 0, [opt_1[3], opt_2[3]], 0]
                )

        return inter_options

    @staticmethod
    def create_milp(
        cf_direction,
        needed_score_gain,
        features_to_vary,
        options,
        max_num_features_to_vary=None,
        muted_variables=[],
    ):
        """
        Create a MILP to find counterfactuals (CF) using PuLP.

        Args:
            cf_direction (int): Integer +1 if 0 => 1, -1 if 1 => 0 (classification),
                +1 if we need to incrase the prediction, -1 if decrease (regression).
            needed_score_gain (float): The score gain needed to achieve the CF goal.
            features_to_vary (list[str]): Feature names of features that the
                generated CF can change.
            options (dict): Possible options for each variable. Each option is a
                list [target, score_gain, distance, bin_index].
            max_num_features_to_vary (int, optional): Max number of features that the
                generated CF can change. If the value is `None`, the CFs can
                change any number of features.
            muted_variables (list[str], optional): Variables that this MILP should
                not use. This is useful to mute optimal variables so we can explore
                diverse solutions. This list should not include interaction variables.

        Returns:
            A tuple (`model`, `variables`), where `model` is a pulp.LpProblem
            model that encodes the MILP problem, and `variables` is a dict of
            variables used in the `model`: `feature_name` => [`variables`].
        """

        # Create a model (minimizing the distance)
        model = pulp.LpProblem("ebmCounterfactual", pulp.LpMinimize)

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
                var_name = "{}:{}".format(f, option[3])

                # Skip the muted variables
                if var_name in muted_variables_set:
                    continue

                x = pulp.LpVariable(var_name, lowBound=0, upBound=1, cat="Binary")
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
            if " x " in opt_name:
                f1_name = re.sub(r"(.+)\sx\s.+", r"\1", opt_name)
                f2_name = re.sub(r".+\sx\s(.+)", r"\1", opt_name)

                if f1_name in features_to_vary and f2_name in features_to_vary:

                    # We need to include this interaction effect
                    cur_variables = []

                    for option in options[opt_name]:
                        z = pulp.LpVariable(
                            "{}:{},{}".format(opt_name, option[3][0], option[3][1]),
                            lowBound=0,
                            upBound=1,
                            cat="Continuous",
                        )
                        z.setInitialValue(0)

                        # Need to iterate through existing variables for f1 and f2 to find
                        # the corresponding variables
                        x_f1 = None
                        x_f2 = None

                        # Skp if this interaction variable involves muted main variable
                        x_f1_name = "{}:{}".format(f1_name, option[3][0])
                        x_f2_name = "{}:{}".format(f2_name, option[3][1])

                        if (
                            x_f1_name in muted_variables_set
                            or x_f2_name in muted_variables_set
                        ):
                            continue

                        for x in variables[f1_name]:
                            if x.name == x_f1_name:
                                x_f1 = x
                                break

                        for x in variables[f2_name]:
                            if x.name == x_f2_name:
                                x_f2 = x
                                break

                        assert x_f1 is not None and x_f2 is not None

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
            if "_x_" not in var.name:
                f_name = re.sub(r"(.+):\d+", r"\1", var.name)
                bin_i = int(re.sub(r".+:(\d+)", r"\1", var.name))

                # Find the original value
                org_value = cur_example[0][self.ebm.feature_names.index(f_name)]

                # Find the target bin
                f_index = self.ebm.feature_names.index(f_name)
                f_type = self.ebm.feature_types[f_index]

                if f_type == "continuous":
                    bin_starts = self.ebm.preprocessor_._get_bin_labels(f_index)[:-1]

                    target_bin = "[{},".format(bin_starts[bin_i])

                    if bin_i + 1 < len(bin_starts):
                        target_bin += " {})".format(bin_starts[bin_i + 1])
                    else:
                        target_bin += " inf)"
                else:
                    target_bin = ""
                    org_value = '"{}"'.format(org_value)

                for option in options[f_name]:
                    if option[3] == bin_i:
                        print(
                            "Change <{}> from {} to {} {}".format(
                                f_name, org_value, option[0], target_bin
                            )
                        )
                        print(
                            "\t* score gain: {:.4f}\n\t* distance cost: {:.4f}".format(
                                option[1], option[2]
                            )
                        )
                        break

            else:
                f_name = re.sub(r"(.+):.+", r"\1", var.name)
                f_name = f_name.replace("_x_", " x ")
                bin_0 = int(re.sub(r".+:(\d+),\d+", r"\1", var.name))
                bin_1 = int(re.sub(r".+:\d+,(\d+)", r"\1", var.name))

                for option in options[f_name]:
                    if option[3][0] == bin_0 and option[3][1] == bin_1:
                        print("Trigger interaction term: <{}>".format(f_name))
                        print(
                            "\t* score gain: {:.4f}\n\t* distance cost: {:.4f}".format(
                                option[1], 0
                            )
                        )
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

    @staticmethod
    def compute_naive_cat_distance(xs):
        """
        Alternative to compute_frequency_distance() to compute distance for
        categorical variables. The distance 1 for different levels and 0 for
        the same levels. Here we give them all score 1, because same-level
        options will be filtered out when we create categorical options for the
        optimization program.

        Args:
            xs (np.ndarray): A column of categorical values.

        Returns:
            dict: category level -> 1.
        """
        counter = Counter(xs)
        results = {}

        for key in counter:
            results[key] = 1

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


def _resort_categorical_level(col_mapping):
    """
    Resort the levels in the categorical encoders if all levels can be converted
    to numbers (integer or float).

    Args:
        col_mapping: the dictionary that maps level string to int

    Returns:
        New col_mapping if all levels can be converted to numbers, otherwise
        the original col_mapping
    """

    def is_number(string):
        try:
            float(string)
            return True
        except ValueError:
            return False

    if all(map(is_number, col_mapping.keys())):

        key_tuples = [(k, float(k)) for k in col_mapping.keys()]
        sorted_key_tuples = sorted(key_tuples, key=lambda x: x[1])

        new_mapping = {}
        value = 1

        for t in sorted_key_tuples:
            new_mapping[t[0]] = value
            value += 1

        return new_mapping

    else:
        return col_mapping


def _init_feature_descriptions(ebm, label_encoder):
    # Initialize the feature description dictionary
    feature_descriptions = {}

    for i in range(len(ebm.feature_names)):
        cur_name = ebm.feature_names[i]
        cur_type = ebm.feature_types[i]

        # Use the feature name as the default display name
        if cur_type == "continuous":
            feature_descriptions[cur_name] = {
                "displayName": cur_name,
                "description": "",
            }

        # For categorical features, we can also give display name and description
        # for different levels
        elif cur_type == "categorical":

            level_descriptions = {}

            for level in label_encoder[cur_name]:
                level_descriptions[level] = {
                    "displayName": label_encoder[cur_name][level],
                    "description": "",
                }

            feature_descriptions[cur_name] = {
                "displayName": cur_name,
                "description": "",
                "levelDescription": level_descriptions,
            }

        else:
            continue

    return feature_descriptions


def _init_feature_configuration(ebm):
    # Initialize the feature configuration dictionary
    feature_configuration = {}

    for i in range(len(ebm.feature_names)):
        cur_name = ebm.feature_names[i]
        cur_type = ebm.feature_types[i]

        # Use the feature name as the default display name
        if cur_type == "continuous" or cur_type == "categorical":
            feature_configuration[cur_name] = {
                "difficulty": 3,
                "requiresInt": False,
                "requiresIncreasing": False,
                "requiresDecreasing": False,
                "usesTransform": None,
                "acceptableRange": None,
            }
        else:
            continue

    return feature_configuration


def _get_kde_sample(xs, n_sample=200):
    """
    Compute kernel density estimation.
    """
    kernel = gaussian_kde(xs.astype(float))

    sample_x = np.linspace(np.min(xs), np.max(xs), n_sample)
    sample_y = kernel(sample_x)

    return sample_x, sample_y


def get_model_data(
    ebm,
    x_train,
    model_info,
    resort_categorical=False,
    feature_info=None,
    feature_level_info=None,
    feature_config=None,
):
    """
    Get the model data for GAM Coach.
    Args:
        ebm: Trained EBM model. ExplainableBoostingClassifier or
            ExplainableBoostingRegressor object.
        x_train: Training data. We use it to compute the mean absolute deviation
            score for continuous features, and frequency scores for categorical
            features.
        model_info: Information about the model (class names, regression target
            name). For classification, the order of classes matters. It should
            be consistent with the class encoding index. For example, the first
            element should be the name for class 0.
            It has format:
            `{'classes': ['loan rejection', 'loan approval']}` or
            `{'regressionName': 'interest rate'}`
        resort_categorical: Whether to sort the levels in categorical variable
            by increasing order if all levels can be converted to numbers.
        feature_info: You can provide a dictionary to give a separate display
            name and optional description for each feature. By default, the
            display name is the same as the feature name, and the description
            is an emtpy string. `feature_info` can be partial (only including
            some features). It has format:
            `{'feature_name': ['display_name', 'description']}`
        feature_level_info: You can provide a dictionary to give separate display
            name and optional description for each level of categorical features.
            By default, the display name is the same as the level name, and the
            description is an empty string. `feature_info` can be partial
            (e.g., only including some levels from some categorical features).
            It has format:
            `{'feature_name': {level_id: ['display_name', 'description']}}`
        feature_config: You can provide a dictionary to configure the difficulty,
            integer requirement, and acceptable range of individual features.
            The difficulty is an integer between 1 and 6: 1 (very easy to change),
            2 (easy), 3 (default), 4 (hard), 5 (very hard), 6 (impossible to change).
            By default, difficulty is set to 3 for all features, requiresInt is
            False for continuous variables, and acceptanceRange is None (search
            all range).
            The dictionary property has the following format:
            `{'difficulty': 3, 'requiresInt': True, 'acceptableRange': None}`
    Returns:
        A Python dictionary of model data
    """
    ROUND = 6

    # Main model info on each feature
    features = []

    # Track the encoding of categorical feature levels
    labelEncoder = {}

    # Track the score range
    score_range = [np.inf, -np.inf]

    for i in tqdm(range(len(ebm.feature_names))):
        cur_feature = {}
        cur_feature["name"] = ebm.feature_names[i]
        cur_feature["type"] = ebm.feature_types[i]
        cur_feature["importance"] = ebm.feature_importances_[i]

        # Handle interaction term differently from cont/cat
        if cur_feature["type"] == "interaction":
            cur_id = ebm.feature_groups_[i]
            cur_feature["id"] = list(cur_id)

            # Info for each individual feature
            cur_feature["name1"] = ebm.feature_names[cur_id[0]]
            cur_feature["name2"] = ebm.feature_names[cur_id[1]]

            cur_feature["type1"] = ebm.feature_types[cur_id[0]]
            cur_feature["type2"] = ebm.feature_types[cur_id[1]]

            # Skip the first item from both dimensions
            cur_feature["additive"] = np.round(ebm.additive_terms_[i], ROUND)[
                1:, 1:
            ].tolist()
            cur_feature["error"] = np.round(ebm.term_standard_deviations_[i], ROUND)[
                1:, 1:
            ].tolist()

            # Get the bin label info
            cur_feature["binLabel1"] = ebm.pair_preprocessor_._get_bin_labels(cur_id[0])
            cur_feature["binLabel2"] = ebm.pair_preprocessor_._get_bin_labels(cur_id[1])

            # Encode categorical levels as integers
            if cur_feature["type1"] == "categorical":
                level_str_to_int = ebm.pair_preprocessor_.col_mapping_[cur_id[0]]
                cur_feature["binLabel1"] = list(
                    map(lambda x: level_str_to_int[x], cur_feature["binLabel1"])
                )

            if cur_feature["type2"] == "categorical":
                level_str_to_int = ebm.pair_preprocessor_.col_mapping_[cur_id[1]]
                cur_feature["binLabel2"] = list(
                    map(lambda x: level_str_to_int[x], cur_feature["binLabel2"])
                )

            # Get density info
            if cur_feature["type1"] == "categorical":
                level_str_to_int = ebm.pair_preprocessor_.col_mapping_[cur_id[0]]
                cur_feature["histEdge1"] = ebm.preprocessor_._get_hist_edges(cur_id[0])
                cur_feature["histEdge1"] = list(
                    map(lambda x: level_str_to_int[x], cur_feature["histEdge1"])
                )
                cur_feature["histCount1"] = np.round(
                    ebm.preprocessor_._get_hist_counts(cur_id[0]), ROUND
                ).tolist()
            else:
                # Use KDE to draw density plots for cont features
                edges, counts = _get_kde_sample(x_train[:, cur_id[0]])
                cur_feature["histEdge1"] = edges.tolist()
                cur_feature["histCount1"] = counts.tolist()

            if cur_feature["type2"] == "categorical":
                level_str_to_int = ebm.pair_preprocessor_.col_mapping_[cur_id[1]]
                cur_feature["histEdge2"] = ebm.preprocessor_._get_hist_edges(cur_id[1])
                cur_feature["histEdge2"] = list(
                    map(lambda x: level_str_to_int[x], cur_feature["histEdge2"])
                )
                cur_feature["histCount2"] = np.round(
                    ebm.preprocessor_._get_hist_counts(cur_id[1]), ROUND
                ).tolist()
            else:
                # Use KDE to draw density plots for cont features
                edges, counts = _get_kde_sample(x_train[:, cur_id[1]])
                cur_feature["histEdge2"] = edges.tolist()
                cur_feature["histCount2"] = counts.tolist()

        else:
            # Skip the first item (reserved for missing value)
            cur_feature["additive"] = np.round(ebm.additive_terms_[i], ROUND).tolist()[
                1:
            ]
            cur_feature["error"] = np.round(
                ebm.term_standard_deviations_[i], ROUND
            ).tolist()[1:]
            cur_feature["id"] = ebm.feature_groups_[i]
            cur_id = ebm.feature_groups_[i][0]
            cur_feature["count"] = ebm.preprocessor_.col_bin_counts_[cur_id].tolist()[
                1:
            ]

            # Track the global score range
            score_range[0] = min(
                score_range[0],
                np.min(ebm.additive_terms_[i] - ebm.term_standard_deviations_[i]),
            )
            score_range[1] = max(
                score_range[1],
                np.max(ebm.additive_terms_[i] + ebm.term_standard_deviations_[i]),
            )

            # Add the binning information for continuous features
            if cur_feature["type"] == "continuous":
                # Add the bin information
                cur_feature["binEdge"] = ebm.preprocessor_._get_bin_labels(cur_id)

                # Use KDE to draw density plots for cont features
                edges, counts = _get_kde_sample(x_train[:, cur_id])

                cur_feature["histEdge"] = edges.tolist()
                cur_feature["histCount"] = counts.tolist()

            elif cur_feature["type"] == "categorical":
                # Get the level value mapping
                level_str_to_int = ebm.preprocessor_.col_mapping_[cur_id]

                if resort_categorical:
                    level_str_to_int = _resort_categorical_level(level_str_to_int)

                cur_feature["binLabel"] = list(
                    map(
                        lambda x: level_str_to_int[x],
                        ebm.preprocessor_._get_bin_labels(cur_id),
                    )
                )

                # Add the hist information
                # For categorical data, the edges are strings
                cur_feature["histEdge"] = list(
                    map(
                        lambda x: level_str_to_int[x],
                        ebm.preprocessor_._get_hist_edges(cur_id),
                    )
                )

                cur_feature["histCount"] = np.round(
                    ebm.preprocessor_._get_hist_counts(cur_id), ROUND
                ).tolist()

                if resort_categorical:
                    cur_bin_info = list(
                        zip(
                            cur_feature["binLabel"],
                            cur_feature["additive"],
                            cur_feature["error"],
                            cur_feature["count"],
                        )
                    )
                    cur_bin_info = sorted(cur_bin_info, key=lambda x: x[0])

                    cur_feature["binLabel"] = [k[0] for k in cur_bin_info]
                    cur_feature["additive"] = [k[1] for k in cur_bin_info]
                    cur_feature["error"] = [k[2] for k in cur_bin_info]
                    cur_feature["count"] = [k[3] for k in cur_bin_info]

                    cur_hist_info = list(
                        zip(cur_feature["histEdge"], cur_feature["histCount"])
                    )
                    cur_hist_info = sorted(cur_hist_info, key=lambda x: x[0])

                    cur_feature["histEdge"] = [k[0] for k in cur_hist_info]
                    cur_feature["histCount"] = [k[1] for k in cur_hist_info]

                # Add the label encoding information
                labelEncoder[cur_feature["name"]] = {
                    i: s for s, i in level_str_to_int.items()
                }

        features.append(cur_feature)

    score_range = list(map(lambda x: round(x, ROUND), score_range))

    feature_names = []
    feature_types = []

    # Sample data does not record interaction features
    for i in range(len(ebm.feature_names)):
        if ebm.feature_types[i] != "interaction":
            feature_names.append(ebm.feature_names[i])
            feature_types.append(ebm.feature_types[i])

    # Compute the MAD scores and frequencies
    ebm_cont_indexes = np.array(
        [i for i in range(len(feature_names)) if feature_types[i] == "continuous"]
    )

    contMads = {}

    for i in ebm_cont_indexes:
        contMads[ebm.feature_names[i]] = GAMCoach.compute_mad(x_train[:, i])

    ebm_cat_indexes = np.array(
        [i for i in range(len(feature_names)) if feature_types[i] == "categorical"]
    )

    catDistances = {}

    for i in ebm_cat_indexes:
        catDistances[feature_names[i]] = GAMCoach.compute_frequency_distance(
            x_train[:, i]
        )

    # Initialize a feature description dictionary (provide more information about
    # each feature in the UI)
    feature_descriptions = _init_feature_descriptions(ebm, labelEncoder)

    # Overwrite some entries in the default feature_descriptions
    if feature_info:
        for feature in feature_info:
            feature_descriptions[feature]["displayName"] = feature_info[feature][0]
            feature_descriptions[feature]["description"] = feature_info[feature][1]

    if feature_level_info:
        for feature in feature_level_info:
            for level in feature_level_info[feature]:
                display_name = feature_level_info[feature][level][0]
                description = feature_level_info[feature][level][1]
                feature_descriptions[feature]["levelDescription"][level][
                    "displayName"
                ] = display_name
                feature_descriptions[feature]["levelDescription"][level][
                    "description"
                ] = description

    # Put descriptions under the 'features' key
    for feature in features:
        if feature["name"] in feature_descriptions:
            feature["description"] = feature_descriptions[feature["name"]]

    # Set the feature configurations
    feature_configurations = _init_feature_configuration(ebm)

    if feature_config:
        for feature in feature_config:
            cur_config = feature_config[feature]
            for k in [
                "requiresInt",
                "difficulty",
                "acceptableRange",
                "requiresIncreasing",
                "requiresDecreasing",
                "usesTransform",
            ]:
                if k in cur_config:
                    feature_configurations[feature][k] = cur_config[k]

    # Attach the configuration to the feature field
    for feature in features:
        if feature["name"] in feature_configurations:
            feature["config"] = feature_configurations[feature["name"]]

    data = {
        "intercept": ebm.intercept_[0] if hasattr(ebm, "classes_") else ebm.intercept_,
        "isClassifier": hasattr(ebm, "classes_"),
        "modelInfo": model_info,
        "features": features,
        "labelEncoder": labelEncoder,
        "scoreRange": score_range,
        "featureNames": feature_names,
        "featureTypes": feature_types,
        "contMads": contMads,
        "catDistances": catDistances,
    }

    return data
