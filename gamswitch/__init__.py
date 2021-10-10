"""#What is GAM Switch?

GAM Switch is a simple and flexible algorithm to generate counterfactual (CF)
explanations for Generalized Additive Models (GAMs).

In many machine learning (ML) applications, people use CF examples to help end
users learn about model decisions.
Given a data point, a CF example is a similar example where the machine learning
model gives a different prediction.
Take loan application as an example, one can explain why a borrower's application
is rejected with a CF example — *"if your annual income were $5k higher, your application would
be approved."*

GAM Switch is designed to generate CFs for [Explanable Boosting Machine
(EBM)](https://interpret.ml/docs/ebm.html), the state-of-the-art GAM trained with
boosting trees.
GAM Switch uses [mixed-integer linear programming](https://en.wikipedia.org/wiki/Integer_programming):
it can efficiently generates CFs are gauranteed to be optimal (minimal changes)
and sparse (use minimal features).

GAM Switch is flexible. You can easily impose diverse constraints
for your target CFs. For example, you can tell GAM Switch to generate CFs
that only **use certain features**, **within some ranges**, and **make at most
some number of changes**. Then, GAM Switch is gauranteed to find the best CFs
meet these conditions (if feasible). In addition to the classic binary
classification problems (e.g., *loan approval* prediction), GAM Switch also
supports regression problems (e.g., *loan interest rate* prediction).

# How to use GAM Switch?

To learn how to use GAM Switch, you can check out some example notebooks ([binary
classification](.), [regression](.)). The main functions you will use are
[`GAMSwitch()`](./gamswitch/gamswitch.html#GAMSwitch.__init__) and
[`generate_cfs()`](./gamswitch/gamswitch.html#GAMSwitch.generate_cfs)

```python
import numpy as np
#TODO
```
"""

__author__ = """Jay Wang"""
__email__ = 'jay@zijie.wang'
__version__ = '0.1.0'
