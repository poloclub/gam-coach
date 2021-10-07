#!/usr/bin/env python

"""Tests for `gamswitch` package."""

import pytest
import pickle
import numpy as np

from gamswitch import gamswitch


@pytest.fixture
def gs():
    ebm = pickle.load(open('tests/data/lc-ebm-ca.pickle', 'rb'))
    data = np.load('tests/data/lending-club-data-5000.npz', allow_pickle=True)
    x_train = data['x_all']

    gs = gamswitch.GAMSwitch(ebm, x_train)
    return gs


@pytest.fixture
def cur_example():
    cur_example = np.array([[
        30000.0, '36 months', '10+ years', 'MORTGAGE', 4.929,
        'Source Verified', 'home_improvement', 0.85, 2002.0, 3.0, '0',
        2.6074550232146687, 1.6, 10.0, 'Individual', '1', '0', 732.0
    ]])

    return cur_example


def test_compute_mad(gs):
    xs = np.array([0, 0, 1, 5, 10])

    assert(gs._compute_mad(xs) == 1)


def test_compute_frequency_distance(gs):
    xs = ['a', 'a', 'b', 'c']
    distance_dict = gs._compute_frequency_distance(xs)

    assert(distance_dict['a'] == 0.5)
    assert(distance_dict['b'] == 0.75)
    assert(distance_dict['c'] == 0.75)


def test_generate_cfs_options(gs, cur_example):
    """Test generating options."""
    cfs = gs.generate_cfs(cur_example, 5)

    total = {}

    for key in cfs.options:
        total[key] = len(cfs.options[key])

    assert(total['loan_amnt'] == 36)
    assert(total['loan_amnt x revol_bal'] == 1296)


def test_generate_cfs_options_with_range(gs, cur_example):
    """Test generating options with feature_range constraints."""

    feature_ranges = {
        'loan_amnt': [3000, 10000],
        'emp_length': ['1 year', '7 years']
    }

    cfs = gs.generate_cfs(cur_example, 5, feature_ranges=feature_ranges)

    total = {}

    for key in cfs.options:
        total[key] = len(cfs.options[key])

    assert(total['loan_amnt'] == 13)
    assert(total['loan_amnt x revol_bal'] == 468)
    assert(total['home_ownership'] == 2)
