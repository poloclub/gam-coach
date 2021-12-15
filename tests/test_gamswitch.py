#!/usr/bin/env python

"""Tests for `gamcoach` package."""

import pytest
import pickle
import numpy as np

from gamcoach import gamcoach, counterfactuals


@pytest.fixture
def gs():
    ebm = pickle.load(open('tests/data/lc-ebm-ca.pickle', 'rb'))
    data = np.load('tests/data/lending-club-data-5000.npz', allow_pickle=True)
    x_train = data['x_all']

    gs = gamcoach.GAMCoach(ebm, x_train)
    return gs


@pytest.fixture
def cur_example():
    cur_example = np.array([[
        30000.0, '36 months', '10+ years', 'MORTGAGE', 4.929,
        'Source Verified', 'home_improvement', 0.85, 2002.0, 3.0, '0',
        2.6074550232146687, 1.6, 10.0, 'Individual', '1', '0', 732.0
    ]])

    return cur_example


@pytest.fixture
def gs_regression():
    ebm = pickle.load(open('tests/data/lc-ebm-ny.pickle', 'rb'))
    data = np.load('tests/data/lending-club-data-ny-5000.npz', allow_pickle=True)
    x_train = data['x_all']

    gs = gamcoach.GAMCoach(ebm, x_train)
    return gs


@pytest.fixture
def cur_example_regression():
    cur_example = np.array([[
        12000.0, '36 months', '1 year', 'RENT', 4.916,
        'Source Verified', 'other', 9.25, 2002.0, 7.0, '0',
        1.591, 0.2, 16.0, 'Individual', '0', '0', 732.0
    ]])

    return cur_example


def test_compute_mad(gs):
    xs = np.array([0, 0, 1, 5, 10])

    assert(gs.compute_mad(xs) == 1)


def test_compute_frequency_distance(gs):
    xs = ['a', 'a', 'b', 'c']
    distance_dict = gs.compute_frequency_distance(xs)

    assert(distance_dict['a'] == 0.5)
    assert(distance_dict['b'] == 0.75)
    assert(distance_dict['c'] == 0.75)


def test_generate_cfs_options(gs: gamcoach.GAMCoach, cur_example):
    """Test generating options."""
    cfs = gs.generate_cfs(cur_example, 1, verbose=True)

    total = {}

    for key in cfs.options:
        total[key] = len(cfs.options[key])

    assert(total['loan_amnt'] == 51)
    assert(total['loan_amnt x revol_bal'] == 2805)


def test_generate_cfs_options_with_range(gs: gamcoach.GAMCoach, cur_example):
    """Test generating options with feature_range constraints."""

    feature_ranges = {
        'loan_amnt': [3000, 10000],
        'emp_length': ['1 year', '7 years']
    }

    cfs = gs.generate_cfs(cur_example, 1, feature_ranges=feature_ranges,
                          verbose=True)

    total = {}

    for key in cfs.options:
        total[key] = len(cfs.options[key])

    assert(total['loan_amnt'] == 16)
    assert(total['loan_amnt x revol_bal'] == 880)
    assert(total['home_ownership'] == 2)


def test_generate_cfs_model(gs: gamcoach.GAMCoach, cur_example):
    """Test formulating the problem into a MILP model."""

    cfs = gs.generate_cfs(
        cur_example,
        1,
        feature_ranges=None,
        verbose=True,
    )

    total = 0

    for key in cfs.variables:
        total += len(cfs.variables[key])

    assert(cfs.model.numVariables() == 4869)
    assert(total == 4869)
    assert(cfs.model.numConstraints() == 13927)

    cfs.model_summary()


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
