# GAM Coach <a href="https://poloclub.github.io/gamcoach/"><img align="right" src="gamcoach-ui/src/img/icon-gamcoach.svg" height="35"></img></a>

An interactive tool to help everyday users discover actionable strategies to obtain desired AI decisions.

[![build](https://github.com/poloclub/gam-coach/workflows/build/badge.svg)](https://github.com/poloclub/gam-coach/actions)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/poloclub/gam-coach/blob/master/LICENSE)
![npm](https://img.shields.io/npm/v/gamcoach)
[![pypi](https://img.shields.io/pypi/v/gamcoach?color=blue)](https://pypi.python.org/pypi/gamcoach)


<table>
  <tr>
    <td colspan="4"><a href="https://poloclub.github.io/gamcoach"><img src='https://i.imgur.com/yOmEBz6.png'></a></td>
  </tr>
  <tr></tr>
  <tr>
    <td><a href="https://poloclub.github.io/timbertrek">🚀 Live Demo</a></td>
    <td><a href="https://youtu.be/ubacP34H9XE">📺 Demo Video</a></td>
    <!-- <td><a href="https://youtu.be/l1mr9z1TuAk">👨🏻‍🏫 Conference Talk</a></td> -->
    <!-- <td><a href="https://arxiv.org/abs/2209.09227">📖 Research Paper</a></td> -->
  </tr>
</table>

## Live Demo

For a live demo, visit: <https://poloclub.github.io/gam-coach/>

## Running Locally

Clone or download this repository:

```bash
git clone git@github.com:poloclub/gam-coach.git

# use --depth if you don't want to download the whole commit history
git clone --depth 1 poloclub/gam-coach.git
```

Install the dependencies:

```bash
cd gamcoach-ui
npm install
```

Then run GAM Coach:

```bash
npm run dev
```

Navigate to [localhost:5005](https://localhost:5005). You should see GAM Coach running in your browser :)

## Use the Python Library

You can also use GAM Coach as a Python library to generate customizable counterfactual examples for generalized additive models (GAMs). For a tutorial and examples, read the [documentation](https://anonchi.github.io/gam-coach/docs/gamcoach).

```bash
pip install gamcoach
```

## Set Up Your Own GAM Coach

In the [demo page](https://poloclub.github.io/gam-coach), we provide five demos with the most commonly used datasets in the algorithmic recourse literature. You can easily set up a GAM Coach for your own GAM model (with only one function call). See the [documentation](https://poloclub.github.io/gam-coach/docs/gamcoach/gamcoach.html#get_model_data) for details.

## Credits

GAM Coach is a result of a collaboration between ML and visualization researchers from Georgia Tech and Microsoft Research.
GAM Coach is created by <a href='https://zijie.wang/' target='_blank'>Jay Wang</a>, <a href='https://www.jennwv.com' target='_blank'>Jenn Wortman Vaughan</a>, <a href='https://www.microsoft.com/en-us/research/people/rcaruana/' target='_blank'>Rich Caruana</a>, and <a href='' target='_blank'>Polo Chau</a>.

<!-- ## Citation

To learn more about TimberTrek, please read our [research paper](https://arxiv.org/abs/2209.09227) (published at [CHI 2023](https://chi2023.acm.org)).

```bibTeX
@inproceedings{wangTimberTrekExploringCurating2022,
  title = {{{TimberTrek}}: {{Exploring}} and {{Curating Trustworthy Decision Trees}} with {{Interactive Visualization}}},
  booktitle = {2022 {{IEEE Visualization Conference}} ({{VIS}})},
  author = {Wang, Zijie J. and Zhong, Chudi and Xin, Rui and Takagi, Takuya and Chen, Zhi and Chau, Duen Horng and Rudin, Cynthia and Seltzer, Margo},
  year = {2022}
}
``` -->

## License

The software is available under the [MIT License](https://github.com/poloclub/gamcoach/blob/master/LICENSE).

## Contact

If you have any questions, feel free to [open an issue](https://github.com/poloclub/gamcoach/issues/new) or contact [Jay Wang](https://zijie.wang).
