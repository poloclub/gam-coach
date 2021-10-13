"""#What is GAM Coach?

GAM Coach is a simple and flexible algorithm to generate counterfactual (CF)
explanations for Generalized Additive Models (GAMs).

In many machine learning (ML) applications, people use CF examples to help end
users learn about model decisions.
Given a data point, a CF example is a similar example where the machine learning
model gives a different prediction.
Take loan application as an example, one can explain why a borrower's application
is rejected with a CF example — *"if your annual income were $5k higher, your application would
be approved."*

GAM Coach is designed to generate CFs for [Explanable Boosting Machine
(EBM)](https://interpret.ml/docs/ebm.html), the state-of-the-art GAM trained with
boosting trees.
GAM Coach uses [mixed-integer linear programming](https://en.wikipedia.org/wiki/Integer_programming):
it can efficiently generates CFs are gauranteed to be optimal (minimal changes)
and sparse (use minimal features).

GAM Coach is flexible. You can easily impose diverse constraints
for your target CFs. For example, you can tell GAM Coach to generate CFs
that only **use certain features**, **within some ranges**, and **make at most
some number of changes**. Then, GAM Coach is gauranteed to find the best CFs
meet these conditions (if feasible). In addition to the classic binary
classification problems (e.g., *loan approval* prediction), GAM Coach also
supports regression problems (e.g., *loan interest rate* prediction).

# How to use GAM Coach?

To learn how to use GAM Coach, you can check out some example notebooks ([binary
classification](.), [regression](.)). The main functions you will use are
[`gamcoach()`](./gamcoach/gamcoach.html#gamcoach.__init__) and
[`generate_cfs()`](./gamcoach/gamcoach.html#gamcoach.generate_cfs)

```python
import numpy as np
#TODO
```
"""

__author__ = """Jay Wang"""
__email__ = 'jay@zijie.wang'
__version__ = '0.1.1'

from gamcoach.gamcoach import *
from gamcoach.counterfactuals import *
