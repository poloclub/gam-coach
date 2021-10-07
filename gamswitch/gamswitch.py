"""
This is the main module for GAM Switch. GAM Switch implements a simple and
flexible method to generate counterfactual explanations for generalized
additive models (GAMs).
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

class GAMSwitch:
    """Main class for GAM Switch."""

    def __init__(self, ebm, x_train, cont_mads=None, cat_distances=None):
        """Initialize a GAMSwitch object.

        Args:
        ebm (Union[ExplainableBoostingClassifier, ExplainableBoostingRegressor]):
            The trained EBM model. It can be either a classifier or a regressor.
        x_train (np.ndarray): The training data. It is used to compute the
            distance for different features.
        cont_mads (dict, optional): feature_name -> median absolute
            deviation score. If it is provided, it is used to overwrite the
            computed MADs for continuous variables. It is useful when you want to
            provide a custom normalization function to compute the distance between
            continuous features.
        cat_distances (dict, optional): feature_name -> {level_name -> distance}.
            Level distance of categorical variables. By default, the distance is
            computed by (1 - frequency(level)) for each level. It imples that it
            is easier to move to a more frequent. If cat_distance is provided,
            it will overwrite the default distance for categorical variables.
        """

        self.ebm: Union[ExplainableBoostingClassifier, ExplainableBoostingRegressor] = ebm
        """The trained EBM model."""

        self.x_train: np.ndarray = x_train

        self.cont_mads: dict = cont_mads
        """Median absolute deviation (MAD) of continuous variables."""

        self.cat_distances: dict = cat_distances
        """Level distance of categorical variables. By default, the distance is
        computed by (1 - frequency(level)) for each level. It implies that it is
        easier to move to a more frequent level.
        """

        # If cont_mads is not given, we compute it from the training data
        if self.cont_mads is None:
            ebm_cont_indexes = np.array(
                [i for i in range(len(self.ebm.feature_names))
                if self.ebm.feature_types[i] == 'continuous']
            )

            self.cont_mads = {}

            for i in ebm_cont_indexes:
                self.cont_mads[ebm.feature_names[i]] = self._compute_mad(self.x_train[:, i])

        # If cat_distance is not given, we compute it from the training data
        if self.cat_distances is None:
            ebm_cat_indexes = np.array(
                [i for i in range(len(self.ebm.feature_names))
                 if self.ebm.feature_types[i] == 'categorical']
            )

            self.cat_distances = {}

            for i in ebm_cat_indexes:
                self.cat_distances[self.ebm.feature_names[i]] = self._compute_frequency_distance(
                    self.x_train[:, i]
                )



    def generate_cfs(self):
        """Generate counterfactual examples.
        
        Use mixed-integer linear programming to generate optimal counterfactual
        examples for the given data point.

        Args:
        """
        pass


    @staticmethod
    def _compute_mad(xs):
        """
        Compute the median absolute deviation of a continuous feature.
        
        Args:
            xs (np.ndarray): a column of continuous values
            
        Return:
            float: MAD value of xs
        """
        xs_median = np.median(xs)
        mad = np.median(np.abs(xs - xs_median))
        return mad


    @staticmethod
    def _compute_frequency_distance(xs):
        """
        For categorical variables, we compute 1 - frequency as their distance. It implies
        that switching to a frequent value takes less effort.
        
        Args:
            xs (np.ndarray): a column of categorical values.
        
        Return:
            dict: category level -> 1 - frequency
        """
        counter = Counter(xs)

        results = {}

        for key in counter:
            results[key] = 1 - (counter[key] / len(xs))

        return results


def search_sorted_lower_index(sorted_edges, value):
    """
    Binary search function for locating the correct bin for continuous features.
    """
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
    return 1 / (1 + np.exp(x))
