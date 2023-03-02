"""
# What is GAM Coach?

GAM Coach is the first interactive system to generate customizable counterfactual (CF)
explanations for Generalized Additive Models (GAMs).

In many machine learning (ML) applications, people use CF examples to help end
users learn about model decisions.
Given a data point, a CF example is a similar example where the machine learning
model gives a different prediction.
Take loan applications as an example, one can explain why a borrower's application
is rejected with a CF example — *"if your annual income were $5k higher, your application would
be approved."*

GAM Coach is designed to generate CFs for [Explainable Boosting Machine
(EBM)](https://interpret.ml/docs/ebm.html), the state-of-the-art GAM trained with
boosting trees.
GAM Coach uses [mixed-integer linear programming](https://en.wikipedia.org/wiki/Integer_programming):
it can efficiently generate CFs that are guaranteed to be optimal (minimal changes)
and sparse (use minimal features).

GAM Coach is flexible. You can easily impose diverse constraints on your target CFs. For example, you can tell GAM Coach to generate CFs
that only **use certain features**, **within some ranges**, and **make at most
some number of changes**. Then, GAM Coach is guaranteed to find the best CFs
meet these conditions (if feasible). In addition to the classic binary
classification problems (e.g., *loan approval* prediction), GAM Coach also
supports regression problems (e.g., *loan interest rate* prediction).

# Get Started

## Use GAM Coach Algorithm without a UI

If you only want to use the GAM Coach algorithm to generate CFs for EBMs without a UI, you can simply use the accompanying Python library.

The two primary python functions you will use are `gamcoach.gamcoach.GAMCoach.__init__()` and `gamcoach.gamcoach.GAMCoach.generate_cfs()`.

1. Train an EBM classifier or regressor
2. Instantiate a `GAMCoach` object with the trained EBM model and your training data
3. Generate customizable CFs on the interested input sample

Below is a minimal example to generate CFs for EBMs:

```python
import gamcoach as coach

# First create a GAM Coach object
# It requires to provide the training data, so it can generate better CFs based
# on the data distribution
my_coach = coach.GAMCoach(ebm, x_train)

cfs = my_coach.generate_cfs(
    cur_example,
    total_cfs=3,
    # List of features that the CFs can change
    features_to_vary=['loan_amnt', 'term', 'emp_length', 'home_ownership',
                      'annual_inc', 'purpose', 'dti', 'open_acc', 'revol_bal',
                      'revol_util', 'total_acc', 'application_type', 'mort_acc',
                      'fico_score'],
    # Some continuous features need to have integer values in practice
    continuous_integer_features=['open_acc', 'total_acc', 'mort_acc', 'fico_score']
)
```

Read the documentation of `gamcoach.gamcoach.GAMCoach.generate_cfs` to learn how to set up constraints for the CFs. These constraints include the difficulty of changing a feature, the acceptable range of a feature, and the total number of features that a CF can change.

## Use GAM Coach UI with My Own EBM Model

<img width="100%" src="https://camo.githubusercontent.com/4ff93ffb5052a590d0c51a94f0df95ddf89098e75d7c560094ca9bf8870432bf/68747470733a2f2f692e696d6775722e636f6d2f794f6d45427a362e706e67">

GAM Coach also provides an easy-to-use interface that empowers end-users to easily specify their preferences and interactively fine-tune recourse plans. You can try out the GAM Coach UI on [the public demo website](https://poloclub.github.io/gam-coach/), or watch [a demo video](https://youtu.be/ubacP34H9XE).

<iframe width="560" height="315" src="https://www.youtube.com/embed/ubacP34H9XE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Steps to use GAM Coach UI on your own EBM model:

1. Train an EBM model
2. Call `gamcoach.gamcoach.get_model_data()` to extract model weights
3. Save the model weights into a `JSON` file in the `gamcoach-ui/public/data` folder
4. Launch the GAM Coach UI

Please read the documentation of `gamcoach.gamcoach.get_model_data()` to see what information you need to prepare to extract the model weights. You can configure the default difficulties of each features, whether to use log transformation on some continuous features, or if a continuous feature require integer values, etc.

To launch the GAM Coach UI:

```bash
# Install the dependencies
cd gamcoach-ui
npm install

# Start a localhost server
npm run dev
```

Navigate to [localhost:5005](https://localhost:5005). You should see GAM Coach running in your browser :)

## Use GAM Coach UI with Different ML Models

GAM Coach UI's design and implementation are model agnostic, which means it can be applied to any other ML model. The goal of GAM Coach UI is to empower end-users to easily specify their preferences and interactively fine-tune recourse plans. Therefore, GAM Coach UI assumes that the new models and their recourse generation algorithms have the following three properties:

1. One can specify the **difficulty** of changing a feature. Features that are deemed *difficult to change* should be least modified by the recourse generation algorithm.
2. One can control the **acceptable range** of a feature, and the recourse generation algorithm respects specified acceptable ranges. For example, the algorithm only generates recourse plans with `loan amount > $3k` and `home ownership is “rent”`.
3. Model inference is available.

Once these three assumptions are met, you can easily swap our integer linear programming code with new recourse algorithms and GAM inference code with new ML models.

The GAM Coach UI uses [Svelte framework](https://svelte.dev), where each view (e.g., header, tab bar, feature card) is a standalone and reusable component module. In our implementation, we follow a `Model-View-Controller` [(MVC](https://en.wikipedia.org/wiki/Model–view–controller)) software architectural pattern to separate the GUI (GAM Coach UI) and the computational model (ML and integer linear program). Therefore, to use GAM Coach UI with a different ML model, you only need to replace the `Model` code and reconfigure the `Controller` code, without modifying the `View` code.

### Replace the Model

Sorry for overloading the word "model"! In the MVC architecture, the `Model` means the underlying data logic of a software. In GAM Coach, the `Model` is the ML model and its recourse generation algorithm. Therefore, to use a different ML model, you need to replace our `Model` with your new ML model inference and its recourse generation algorithm.

1. The ML model is at [`ebm.js`](https://github.com/poloclub/gam-coach/blob/master/gamcoach-ui/src/ebm/ebm.js) and [`ebmLocal.js`](https://github.com/poloclub/gam-coach/blob/master/gamcoach-ui/src/ebm/ebmLocal.js).
    1. [`ebm.js`](https://github.com/poloclub/gam-coach/blob/master/gamcoach-ui/src/ebm/ebm.js) implements the EBM inference in JavsScript.
    2. [`ebmLocal.js`](https://github.com/poloclub/gam-coach/blob/master/gamcoach-ui/src/ebm/ebmLocal.js) extends the [`ebm.js`](https://github.com/poloclub/gam-coach/blob/master/gamcoach-ui/src/ebm/ebm.js) object to store a data sample where the users want to generate CFs
1. The recourse generation algorithm is at [`gamcoach.js`](https://github.com/poloclub/gam-coach/blob/master/gamcoach-ui/src/ebm/gamcoach.js).

We made the extra effort to create a lightweight [demo website](https://poloclub.github.io/gam-coach) for GAM Coach, which is serverless and runs entirely in the client’s browser. To do that, we **re-implemented** the GAM inference and integer programming optimization using JavaScript and [WebAssembly](https://webassembly.org). In contrast, to implement your own `Model`, you can replace our GAM and integer programming code with a backend server that directly calls your ML models and recourse algorithms in your favorite languages and packages (e.g., Python, R, C++, Scikit-learn).


### Reconfigure the Controller

In the MVC architecture, the `Controller` functions as a communicator between the `Model` and `View`. You can see two examples below:

1. When a user clicks and drags feature cards:
   1. `View` tells `Controller` that users has specified some preferences
   2. `Controller` tells the `Model` to update internal parameters
2. When a user clicks the `Regenerate` button:
   1. `View` tells `Controller` that users wants new recourse plans
   2. `Controller` tells `Model` to generate new recourse plans
   3. `Model` generates new recourse plans with the latest preference configurations
   4. `Model` passes the results to `Controller`
   5. `Controller` passes the results to `View` asks `View` to render them
   6. `View` visualizes the new results

Therefore, once you have updated your `Model`, you need to update a few lines in `Controller` to hook up the communication between `Controller` and the new `Model`. The `Controller` code is at [`Coach.js`](https://github.com/poloclub/gam-coach/blob/master/gamcoach-ui/src/components/coach/Coach.js). In this file, you only need to make 8 lines of changes:

1. Replace `EBM` and `EBMLocal` with your new ML model (2 lines)
2. Replace `GAMCoach` with your new recourse generation algorithm (1 line)
3. Replace `coach.generateCfs()` with your new method to generate counterfactual explanations (there are 5 calls in this file)

Voilà, without changing any code in `View`, you can use GAM Coach UI with your new ML models! 🎉

"""

__author__ = """Jay Wang"""
__email__ = "jay@zijie.wang"
__version__ = "0.1.4"

from gamcoach.gamcoach import *
from gamcoach.counterfactuals import *
