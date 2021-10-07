"""Counterfactuals Class.

This module implements the Counterfactuals class. We use it to represent the
generated counterfactual explanations.
"""

import numpy as np
import pandas as pd
import re

from tqdm import tqdm
from interpret.glassbox import ExplainableBoostingClassifier, ExplainableBoostingRegressor
from time import time
from collections import Counter
from typing import Union
from pulp import *

SEED = 922


class Counterfactuals:
    """Class to represent GAM counterfactual explanations."""

    def __init__(self, data: np.ndarray,
                 isSuccessful: bool,
                 model: LpProblem,
                 options: dict):
        """Initialize a Counterfactuals object.

        Args:
        data (np.ndarray): Generated counterfactual examples stacked as a numpy
            array. If successful, it should have `total_cfs` rows.
        isSuccessful (bool): True if the mixed-integer linear problem has
            `total_cfs` number of solutions under all constraints.
        model (LpProblem): Linear programming model
        options (dict): Dictionary containing all eligible options for each
            selected features. Feature_name -> [[target, score_gain, distance, bin_id]]
        """
        self.data = data
        self.isSuccessful = isSuccessful
        self.model = model
        self.options = options
