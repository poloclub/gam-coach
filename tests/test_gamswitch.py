#!/usr/bin/env python

"""Tests for `gamcoach` package."""

import pytest
import pickle
import numpy as np
import gamcoach as coach
import pandas as pd

import urllib.request
import json

from interpret.glassbox import ExplainableBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn import metrics
from collections import Counter

SEED = 101221


def test_generate_cf():
    # Load a pre-processed lending club dataset
    ca_data_url = "https://gist.githubusercontent.com/xiaohk/06266553d43e591817914bfe52ec9b60/raw/c190b7cea837739797336d690fe44df9d8f9384c/lending-club-data-5000-ca.json"

    with urllib.request.urlopen(ca_data_url) as url:
        data = json.loads(url.read().decode())

    # Load the training data
    x_all = np.array(data["x_all"])
    y_all = np.array(data["y_all"])  # `y_all`: 1 if paid off, 0 if failed to pay off

    # Load some meta data
    feature_names = data["feature_names"]
    # feature_types = data['feature_types']
    feature_types = [
        "continuous" if t == "continuous" else "nominal" for t in data["feature_types"]
    ]

    cont_index = data["cont_index"]
    cat_index = data["cat_index"]

    # Use float to encode continuous features and string for categorical features
    for i, t in enumerate(feature_types):
        if t == "continuous":
            x_all[:, i] = x_all[:, i].astype(float)
        elif t == "categorical":
            x_all[:, i] = x_all[:, i].astype(str)

    # Create a dataFrame to validate that we load the correct data
    df = pd.DataFrame(x_all)
    df.columns = feature_names

    # Train a binary classifier
    x_train, x_test, y_train, y_test = train_test_split(
        x_all, y_all, test_size=0.2, random_state=SEED
    )

    # Use sample weight to combat class imbalance
    weight = np.bincount(y_train)[1] / np.bincount(y_train)[0]
    x_train_sample_weights = [
        weight if y_train[i] == 0 else 1 for i in range(len(y_train))
    ]

    ebm = ExplainableBoostingClassifier(feature_names, feature_types, random_state=SEED)

    ebm.fit(x_train, y_train, sample_weight=x_train_sample_weights)

    # Evaluate our model
    y_pred = ebm.predict(x_test)

    # Find an interesting data point
    # We can focus on test cases where our model rejcets the application (y_hat = 0)
    reject_index = y_pred == 0
    x_reject = x_test[reject_index, :]
    y_pred_reject = y_pred[reject_index]

    reject_df = pd.DataFrame(np.hstack((x_reject, y_pred_reject.reshape(-1, 1))))
    reject_df.columns = feature_names + ["prediction"]
    reject_df.head()

    # Find a random sample
    rs = np.random.RandomState(SEED)
    target_index = rs.choice(range(reject_df.shape[0]))
    cur_example = x_reject[target_index, :]

    print(cur_example)

    my_coach = coach.GAMCoach(ebm, x_train)

    # To generate good CF explantions, we need to consider what features are mutable
    # and they possible values

    cfs = my_coach.generate_cfs(
        cur_example,
        total_cfs=100,
        # List of features that the CFs can change
        features_to_vary=[
            "loan_amnt",
            "term",
            "emp_length",
            "home_ownership",
            "annual_inc",
            "purpose",
            "dti",
            "open_acc",
            "revol_bal",
            "revol_util",
            "total_acc",
            "application_type",
            "mort_acc",
            "fico_score",
        ],
        # Some continuous features need to have integer values in practice
        continuous_integer_features=["open_acc", "total_acc", "mort_acc", "fico_score"],
    )

    cf_df = cfs.to_df()
    assert np.sum(cf_df["new_prediction"] == 0) == 0


# Tests are out-dated because of interpret v0.3.0 update
# @pytest.fixture
# def gs():
#     ebm = pickle.load(open('tests/data/lc-ebm-ca.pickle', 'rb'))
#     data = np.load('tests/data/lending-club-data-5000.npz', allow_pickle=True)
#     x_train = data['x_all']

#     gs = gamcoach.GAMCoach(ebm, x_train)
#     return gs


# @pytest.fixture
# def cur_example():
#     cur_example = np.array([[
#         30000.0, '36 months', '10+ years', 'MORTGAGE', 4.929,
#         'Source Verified', 'home_improvement', 0.85, 2002.0, 3.0, '0',
#         2.6074550232146687, 1.6, 10.0, 'Individual', '1', '0', 732.0
#     ]])

#     return cur_example


# @pytest.fixture
# def gs_regression():
#     ebm = pickle.load(open('tests/data/lc-ebm-ny.pickle', 'rb'))
#     data = np.load('tests/data/lending-club-data-ny-5000.npz', allow_pickle=True)
#     x_train = data['x_all']

#     gs = gamcoach.GAMCoach(ebm, x_train)
#     return gs


# @pytest.fixture
# def cur_example_regression():
#     cur_example = np.array([[
#         12000.0, '36 months', '1 year', 'RENT', 4.916,
#         'Source Verified', 'other', 9.25, 2002.0, 7.0, '0',
#         1.591, 0.2, 16.0, 'Individual', '0', '0', 732.0
#     ]])

#     return cur_example


# def test_compute_mad(gs):
#     xs = np.array([0, 0, 1, 5, 10])

#     assert(gs.compute_mad(xs) == 1)


# def test_compute_frequency_distance(gs):
#     xs = ['a', 'a', 'b', 'c']
#     distance_dict = gs.compute_frequency_distance(xs)

#     assert(distance_dict['a'] == 0.5)
#     assert(distance_dict['b'] == 0.75)
#     assert(distance_dict['c'] == 0.75)


# def test_generate_cfs_options(gs: gamcoach.GAMCoach, cur_example):
#     """Test generating options."""
#     cfs = gs.generate_cfs(cur_example, 1, verbose=True)

#     total = {}

#     for key in cfs.options:
#         total[key] = len(cfs.options[key])

#     assert(total['loan_amnt'] == 51)
#     assert(total['loan_amnt x revol_bal'] == 2805)


# def test_generate_cfs_options_with_range(gs: gamcoach.GAMCoach, cur_example):
#     """Test generating options with feature_range constraints."""

#     feature_ranges = {
#         'loan_amnt': [3000, 10000],
#         'emp_length': ['1 year', '7 years']
#     }

#     cfs = gs.generate_cfs(cur_example, 1, feature_ranges=feature_ranges,
#                           verbose=True)

#     total = {}

#     for key in cfs.options:
#         total[key] = len(cfs.options[key])

#     assert(total['loan_amnt'] == 16)
#     assert(total['loan_amnt x revol_bal'] == 880)
#     assert(total['home_ownership'] == 2)


# def test_generate_cfs_model(gs: gamcoach.GAMCoach, cur_example):
#     """Test formulating the problem into a MILP model."""

#     cfs = gs.generate_cfs(
#         cur_example,
#         1,
#         feature_ranges=None,
#         verbose=True,
#     )

#     total = 0

#     for key in cfs.variables:
#         total += len(cfs.variables[key])

#     assert(cfs.model.numVariables() == 4869)
#     assert(total == 4869)
#     assert(cfs.model.numConstraints() == 13927)

#     cfs.model_summary()


# def test_generate_cfs_diverse(gs: gamcoach.GAMCoach, cur_example):
#     """Test generating diverse solutions."""

#     cfs = gs.generate_cfs(
#         cur_example,
#         5,
#         feature_ranges=None,
#         verbose=True,
#     )

#     cfs.model_summary()
#     assert(len(cfs.data) == 5)


# def test_generate_cfs_regression(gs_regression: gamcoach.GAMCoach,
#                                  cur_example_regression):
#     """Test generating diverse solutions."""
#     print(gs_regression.is_classifier)
#     target_range = [3, 9]
#     max_num_features_to_vary = 3

#     cfs = gs_regression.generate_cfs(
#         cur_example_regression,
#         5,
#         feature_ranges=None,
#         max_num_features_to_vary=max_num_features_to_vary,
#         continuous_integer_features=[
#             'fico_score',
#             'open_acc',
#             'earliest_cr_line',
#             'total_acc'
#         ],
#         verbose=True,
#         target_range=target_range
#     )

#     new_preds = cfs.ebm.predict(cfs.data)

#     for r in new_preds:
#         assert(r >= target_range[0] and r <= target_range[1])

#     cfs.model_summary()
