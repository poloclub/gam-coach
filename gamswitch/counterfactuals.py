"""Counterfactuals Class.

This module implements the Counterfactuals class. We use it to represent the
generated counterfactual explanations.
"""

import numpy as np
import pandas as pd
import re
import pulp

from tqdm import tqdm
from interpret.glassbox import ExplainableBoostingClassifier, ExplainableBoostingRegressor
from time import time
from collections import Counter
from typing import Union

SEED = 922


class Counterfactuals:
    """Class to represent GAM counterfactual explanations."""

    def __init__(self, data: np.ndarray,
                 isSuccessful: bool,
                 model: pulp.LpProblem,
                 variables: dict,
                 options: dict):
        """Initialize a Counterfactuals object.

        Args:
        data (np.ndarray): Generated counterfactual examples stacked as a numpy
            array. If successful, it should have `total_cfs` rows.
        isSuccessful (bool): True if the mixed-integer linear problem has
            `total_cfs` number of solutions under all constraints.
        model (LpProblem): Linear programming model
        variables (dict): Dictionary containing all MILP variables, feature_name ->
            [variables]
        options (dict): Dictionary containing all eligible options for each
            selected features. Feature_name -> [[target, score_gain, distance, bin_id]]
        """
        self.data = data
        self.isSuccessful = isSuccessful
        self.model = model
        self.variables = variables
        self.options = options

    def model_summary(self):
        """Print out a summary of the MILP model."""
        print('MILP model with {} variables and {} constraints.'.format(
            self.model.numVariables(),
            self.model.numConstraints()
        ))
