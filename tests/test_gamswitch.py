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


def test_compute_mad(gs):
    xs = np.array([0, 0, 1, 5, 10])

    assert(gs._compute_mad(xs) == 1)


def test_compute_frequency_distance(gs):
    xs = ['a', 'a', 'b', 'c']
    distance_dict = gs._compute_frequency_distance(xs)

    assert(distance_dict['a'] == 0.5)
    assert(distance_dict['b'] == 0.75)
    assert(distance_dict['c'] == 0.75)
