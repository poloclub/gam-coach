"""Counterfactuals Class.

This module implements the Counterfactuals class. We use it to represent the
generated counterfactual explanations.
"""

import numpy as np
import pandas as pd
import re
import pulp

from tqdm import tqdm
from interpret.glassbox import (
    ExplainableBoostingClassifier,
    ExplainableBoostingRegressor,
)
from time import time
from collections import Counter
from typing import Union

SEED = 922


def _get_main_bin_labels(ebm, feature_index):
    """Returns main effect bin labels for a given feature index.

    Args:
        feature_index: An integer for feature index.

    Returns:
        List of labels for bins.
    """

    col_type = ebm.feature_types_in_[feature_index]
    if col_type == "continuous":
        min_val = ebm.feature_bounds_[feature_index][0]
        cuts = ebm.bins_[feature_index][0]
        max_val = ebm.feature_bounds_[feature_index][1]
        return list(np.concatenate(([min_val], cuts, [max_val])))
    elif col_type == "nominal":
        map = ebm.bins_[feature_index][0]
        return list(map.keys())
    else:  # pragma: no cover
        raise Exception("Unknown column type")


class Counterfactuals:
    """Class to represent GAM counterfactual explanations."""

    def __init__(
        self,
        solutions: list,
        model: pulp.LpProblem,
        variables: dict,
        ebm: Union[ExplainableBoostingClassifier, ExplainableBoostingRegressor],
        cur_example: np.ndarray,
        options: dict,
    ):
        """Initialize a Counterfactuals object.

        Args:
            solutions (list): List of generated `(active_variables, optimal value)`.
                If successful, it should have `total_cfs` items.
            model (LpProblem): Linear programming model
            variables (dict): Dictionary containing all MILP variables,
                `feature_name` -> [`variables`],
            ebm (Union[ExplainableBoostingClassifier, ExplainableBoostingRegressor]):
                The trained EBM model.
            cur_example (np.ndarray): The original data point.
            options (dict): Dictionary containing all eligible options for each
                selected features. `feature_name` -> `[[target, score_gain,
                distance, bin_id]]`
        """
        self.model = model
        """MILP program model."""

        self.variables = variables
        """MILP program variabels."""

        self.ebm = ebm
        """The trained EBM model."""

        self.cur_example = cur_example[0]
        """The original data point."""

        self.options = options
        """All possible options."""

        self.solutions = solutions
        """Solutions for MILP."""

        self.data: np.ndarray
        """Generated CFs in the original data dataformat."""

        self.target_bins: list
        """New bins used in each row of `data`."""

        self.values: list
        """Corresponding objective values (total distance) of each `data` row."""

        self.convert_cfs_to_data(solutions)

    def convert_cfs_to_data(self, solutions):
        """Convert optimal CF solutions to the original dataformat."""

        self.data = []
        self.values = []
        self.target_ranges = []

        for active_variables, value in solutions:
            cur_cf = self.cur_example.copy()
            cur_target_ranges = []

            for var in active_variables:
                # Skip interaction vars (included)
                # In EBM, interaction names are `f1 x f2`, pulp's variable name
                # is `f1_x_f2`
                if "_x_" not in var.name:
                    f_name = re.sub(r"(.+):\d+", r"\1", var.name)
                    bin_i = int(re.sub(r".+:(\d+)", r"\1", var.name))

                    # Find the original value
                    org_value = self.cur_example[self.ebm.feature_names.index(f_name)]

                    # Find the target bin
                    f_index = self.ebm.feature_names.index(f_name)
                    f_type = self.ebm.feature_types[f_index]

                    if f_type == "continuous":
                        bin_starts = _get_main_bin_labels(self.ebm, f_index)[:-1]

                        target_bin = "[{},".format(bin_starts[bin_i])

                        if bin_i + 1 < len(bin_starts):
                            target_bin += " {})".format(bin_starts[bin_i + 1])
                        else:
                            target_bin += " inf)"
                    else:
                        target_bin = ""
                        org_value = '"{}"'.format(org_value)

                    for option in self.options[f_name]:
                        if option[3] == bin_i:
                            target_value = option[0]
                            cur_cf[f_index] = target_value

                            if f_type == "continuous":
                                cur_target_ranges.append(target_bin)
                            else:
                                cur_target_ranges.append(option[0])
                            break

            self.data.append(cur_cf)
            self.values.append(value)
            self.target_ranges.append(cur_target_ranges)

        if len(self.data) > 0:
            self.data = np.vstack(self.data)

    def show(self):
        """
        Print the optimal solutions.
        """
        count = 0

        for active_variables, value in self.solutions:
            count += 1
            print("## Strategy {} ##".format(count))

            for var in active_variables:
                # Skip interaction vars (included)
                if "_x_" not in var.name:
                    f_name = re.sub(r"(.+):\d+", r"\1", var.name)
                    bin_i = int(re.sub(r".+:(\d+)", r"\1", var.name))

                    # Find the original value
                    org_value = self.cur_example[self.ebm.feature_names.index(f_name)]

                    # Find the target bin
                    f_index = self.ebm.feature_names.index(f_name)
                    f_type = self.ebm.feature_types[f_index]

                    if f_type == "continuous":
                        bin_starts = _get_main_bin_labels(self.ebm, f_index)[:-1]

                        target_bin = "[{},".format(bin_starts[bin_i])

                        if bin_i + 1 < len(bin_starts):
                            target_bin += " {})".format(bin_starts[bin_i + 1])
                        else:
                            target_bin += " inf)"
                    else:
                        target_bin = ""
                        org_value = '"{}"'.format(org_value)

                    for option in self.options[f_name]:
                        if option[3] == bin_i:
                            new_value = (
                                option[0]
                                if f_type == "continuous"
                                else '"{}"'.format(option[0])
                            )

                            print(
                                "Change <{}> from {} to {} {}".format(
                                    f_name, org_value, new_value, target_bin
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

                    for option in self.options[f_name]:
                        if option[3][0] == bin_0 and option[3][1] == bin_1:
                            print("Trigger interaction term: <{}>".format(f_name))
                            print(
                                "\t* score gain: {:.4f}\n\t* distance cost: {:.4f}".format(
                                    option[1], 0
                                )
                            )
                            break
            print()

    def model_summary(self, verbose=True):
        """Print out a summary of the MILP model."""

        if verbose:
            print(
                "Top {} solution to a MILP model with {} variables and {} constraints.".format(
                    self.data.shape[0],
                    self.model.numVariables(),
                    self.model.numConstraints(),
                )
            )

        if len(self.data) == 0:
            return pd.DataFrame()

        data_df = pd.DataFrame(self.data)
        data_df.columns = np.array(self.ebm.feature_names)[
            [
                i
                for i in range(len(self.ebm.feature_types))
                if self.ebm.feature_types[i] != "interaction"
            ]
        ]

        new_predictions = self.ebm.predict(self.data)
        data_df["new_prediction"] = new_predictions

        return data_df

    def __repr__(self) -> str:
        if len(self.data) == 0:
            return "The optimization is infeasible."

        summary = self.model_summary()
        return summary.to_string()

    def to_df(self):
        summary = self.model_summary(False)
        return summary
