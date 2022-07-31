<script>
  //@ts-check
  import '../../typedef';
  import Coach from '../coach/Coach.svelte';
  import DiffPicker from '../DiffPicker.svelte';
  import ConfirmModal from '../confirm-modal/ConfirmModal.svelte';
  import InputForm from '../input-form/InputForm.svelte';
  import BookmarkPanel from '../bookmark-panel/BookmarkPanel.svelte';
  import Tooltip from '../Tooltip.svelte';

  import d3 from '../../utils/d3-import';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { fade, fly } from 'svelte/transition';
  import {
    tooltipConfigStore,
    inputFormConfigStore,
    constraintsStore,
    bookmarkConfigStore,
    ebmStore
  } from '../../store';
  import { Constraints } from '../coach/Coach';
  import { random } from '../../utils/utils';

  import pointArrowSVG from '../../img/point-arrow.svg';
  import iconRefreshSVG from '../../img/icon-refresh3.svg';
  import iconEditSVG from '../../img/icon-edit.svg';
  import iconGithub from '../../img/icon-github.svg';
  import iconVideo from '../../img/icon-youtube.svg';
  import iconPdf from '../../img/icon-pdf.svg';

  import text from '../../config/appeal-text.yml';

  // Import samples
  import samplesLC from '../../config/data/lc-classifier-random-samples.json';
  import samplesAdult from '../../config/data/adult-classifier-random-samples.json';
  import samplesCredit from '../../config/data/credit-classifier-random-samples.json';
  import samplesGerman from '../../config/data/german-classifier-random-samples.json';
  import samplesCompas from '../../config/data/compas-classifier-random-samples.json';

  export let modelName = 'lc';

  let curSamples = samplesLC;
  let curIndex = 126;

  const datasetOptions = [
    { name: 'lc', display: 'Lending Club' },
    { name: 'credit', display: 'Credit' },
    { name: 'german', display: 'German Credit' },
    { name: 'adult', display: 'Adult Census Income' },
    { name: 'compas', display: 'COMPAS' }
  ];

  const initModelInfo = () => {
    switch (modelName) {
      case 'lc': {
        curSamples = samplesLC;
        curIndex = 126;
        break;
      }
      case 'adult': {
        curSamples = samplesAdult;
        curIndex = 322;
        break;
      }
      case 'credit': {
        curSamples = samplesCredit;
        curIndex = 333;
        break;
      }
      case 'german': {
        curSamples = samplesGerman;
        curIndex = 181;
        break;
      }
      case 'compas': {
        curSamples = samplesCompas;
        curIndex = 380;
        break;
      }
      default: {
        console.warn('Unknown model name');
        curSamples = samplesLC;
        modelName = 'lc';
        curIndex = 126;
      }
    }
  };

  // localhost:5005/?dataset=compas
  const urlParams = new URLSearchParams(window.location.search);
  const urlModelName = urlParams.get('dataset');
  const validModelNames = new Set([
    'lc',
    'adult',
    'credit',
    'german',
    'compas'
  ]);
  if (urlModelName !== null && validModelNames.has(urlModelName)) {
    modelName = urlModelName;
  }

  initModelInfo();

  const unsubscribes = [];
  let windowLoaded = false;
  let currentPlayer = null;

  const indexFormatter = d3.format('03d');

  let verificationCode = null;
  let buttonText = "I'm Done!";
  let updated = false;

  // Initialize the logger
  const logger = null;

  // curIndex = random(0, curSamples.length - 1);
  let curExample = curSamples[curIndex];

  const pointArrowSVGProcessed = pointArrowSVG.replaceAll(
    'white',
    'currentcolor'
  );

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;
  unsubscribes.push(
    tooltipConfigStore.subscribe((value) => {
      tooltipConfig = value;
    })
  );

  /** @type {Constraints} */
  let constraints = null;
  unsubscribes.push(
    constraintsStore.subscribe((value) => {
      constraints = value;
    })
  );

  /** @type {BookmarkConfig} */
  let bookmarkConfig = null;
  unsubscribes.push(
    bookmarkConfigStore.subscribe((value) => {
      bookmarkConfig = value;
    })
  );

  /** @type {InputFormConfig} */
  let inputFormConfig = null;
  unsubscribes.push(
    inputFormConfigStore.subscribe((value) => {
      inputFormConfig = value;

      // Update curExample if it is changed
      if (inputFormConfig.action === 'saved') {
        inputFormConfig.action = null;
        updated = true;
        curExample = inputFormConfig.curExample;
        inputFormConfigStore.set(inputFormConfig);
      }
    })
  );

  const refreshClicked = () => {
    // Resample the cur example
    curIndex = random(0, curSamples.length - 1);
    const newExample = curSamples[curIndex];

    updated = false;
    curExample = newExample;

    // console.log(logger?.toJSON());
  };

  const optionClicked = (e, option) => {
    if (option.name === modelName) return;

    ebmStore.set({});
    inputFormConfigStore.set({
      show: false,
      ebm: null,
      features: null,
      plansInfo: null,
      curExample: [],
      action: null
    });
    bookmarkConfigStore.set({
      show: false,
      features: null,
      plans: new Map(),
      focusOutTime: 0,
      plansInfo: null
    });
    updated = false;

    modelName = option.name;
    initModelInfo();
    curExample = curSamples[curIndex];
  };

  const editClicked = () => {
    inputFormConfig.show = true;
    inputFormConfig.curExample = curExample;
    inputFormConfig.action = null;
    inputFormConfigStore.set(inputFormConfig);
  };

  onMount(() => {
    // window.onload = () => { windowLoaded = true; };
    windowLoaded = true;
  });

  onDestroy(() => {
    unsubscribes.forEach((unsub) => unsub());
  });
</script>

<div class="page">
  <Tooltip bind:this={tooltip} />

  <div class="top" id="top">
    <div class="top-fill" />

    <div class="top-empty" />

    <div class="coach-left">
      <!-- <div class='help-arrow'>{@html pointArrowSVGProcessed}</div> -->
      <div class="help-note">
        <div class="arrow" />
        <div class="title-top">Imagine...</div>
        <div class="title">
          You're {modelName === 'compas' ? 'bail' : 'loan'} applicant
        </div>
        <div class="input-number">
          <div
            class="svg-icon"
            title="Edit the input values"
            on:click={() => editClicked()}
          >
            {@html iconEditSVG}
          </div>
          <div
            class="svg-icon"
            title="Try a random input sample"
            on:click={() => refreshClicked()}
          >
            {@html iconRefreshSVG}
          </div>
          <div class="number">
            #{indexFormatter(curIndex)}{updated ? '*' : ''}
          </div>
        </div>
        <div class="description">
          <span class="line"> Your application is rejected </span>
          <div class="help-arrow">{@html pointArrowSVGProcessed}</div>
          <span class="line">
            The {modelName === 'compas' ? 'court' : 'bank'} points you to
          </span>
          <span class="line">
            <strong>GAM Coach</strong> to help you
          </span>
          <span class="line"> succeed in next application </span>
        </div>
        {#if modelName === 'compas'}
          <div class="description">
            <span class="line" style="margin-top: 30px;">
              *We would not like to use COMPAS to evaluate GAM Coach, this demo
              is only for review appeal purpose.
            </span>
            <span class="line" style="margin-top: 10px;">
              See <a href="https://arxiv.org/abs/2106.05498" target="_blank"
                >this paper
              </a> to learn more about COMPAS.
            </span>
          </div>
        {/if}
      </div>
    </div>

    <div class="coach-right">
      <div class="icon-container">
        <a target="_blank" href="https://github.com/anonfacct/gam-coach/">
          <div class="svg-icon" title="Open-source code">
            {@html iconGithub}
          </div>
          <span>Code</span>
        </a>

        <a target="_blank" href="https://youtu.be/0q3aqwrSbTk">
          <div class="svg-icon" title="Demo video">
            {@html iconVideo}
          </div>
          <span>Video</span>
        </a>
      </div>
      <div class="dataset-menu">
        <!-- <span class="dataset-description">Choose a dataset</span> -->
        <span class="dataset-description"
          >Consistent user experience across datasets:</span
        >
        {#each datasetOptions as option, i}
          <div
            class="dataset-option"
            class:selected={option.name === modelName}
            on:click={(e) => optionClicked(e, option)}
          >
            <div class="dataset-place" />
            <span class="dataset-name">{option.display}</span>
          </div>
        {/each}
      </div>
    </div>

    {#key curExample}
      <div class="coach-wrapper">
        <Coach {windowLoaded} {curExample} {logger} {modelName} />
      </div>
    {/key}

    <DiffPicker {logger} />
    <ConfirmModal />

    {#key modelName}
      <InputForm />
    {/key}

    {#key modelName}
      <BookmarkPanel {windowLoaded} {logger} />
    {/key}
  </div>

  <div class="article appeal-article">
    <h2 id="summary" style="margin-top: 5px;">
      Appeal Submission 218: Summary
    </h2>
    <p>{@html text.summary.intro}</p>
    <ol>
      <li>
        <span class="list-item">{@html text.summary.list[0]}</span>
      </li>
      <li>
        <span class="list-item">{@html text.summary.list[1]}</span>
        <ol class="summary-list">
          <li>
            <span class="list-item">{@html text.summary.list[2]}</span>
          </li>
          <li>
            <span class="list-item">{@html text.summary.list[3]}</span>
          </li>
        </ol>
      </li>
    </ol>

    <h2 id="support">Appeal Supporting Document</h2>

    <h4 id="evidence-1">{@html text.crash.title}</h4>
    <blockquote><p>{@html text.crash.review}</p></blockquote>
    <p>{@html text.crash.response}</p>

    <div class="video wide-video" id="infeasible-video">
      <video
        controls
        playsinline
        muted
        poster="https://i.imgur.com/EiuL6If.png"
      >
        <source src="PUBLIC_URL/videos/appeal-infeasible.mp4" />
        <track kind="captions" />
      </video>
      <div class="figure-caption">
        Video 1. {@html text.crash.caption}
      </div>
    </div>

    <h4 id="evidence-2">{@html text.development.title}</h4>
    <blockquote><p>{@html text.development.review}</p></blockquote>
    <p>{@html text.development.response}</p>
    <blockquote class="response">
      <p>{@html text.development.quote}</p>
    </blockquote>

    <h4 id="evidence-3">{@html text.experience.title}</h4>
    <blockquote><p>{@html text.experience.review}</p></blockquote>
    <p>{@html text.experience.response}</p>

    <div class="article-table" id="dataset-table">
      <div class="figure-caption">
        Table 1. {@html text.experience.caption}
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Dataset</th>
            <th>GAM Coach</th>
            <th>Size</th>
            <th>Target Variable</th>
            <th>Country, Date</th>
            <th>Recourse Papers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Lending Club</td>
            <td
              ><a
                href="#top"
                on:click={(e) => {
                  optionClicked(e, datasetOptions[0]);
                }}>Demo</a
              >
            </td>
            <td>n = 124026, d = 20</td>
            <td>Loan Default</td>
            <td>US, 2007–2018</td>
            <td
              >[
              <a
                href="https://dl.acm.org/doi/abs/10.1145/3351095.3372850"
                target="_blank">1</a
              >,
              <a
                href="https://proceedings.neurips.cc/paper/2020/hash/c2ba1bc54b239208cb37b901c0d3b363-Abstract.html"
                target="_blank">2</a
              >
              ]</td
            >
          </tr>
          <tr>
            <td>Credit</td>
            <td
              ><a
                href="#top"
                on:click={(e) => {
                  optionClicked(e, datasetOptions[1]);
                }}>Demo</a
              >
            </td>
            <td>n = 29623, d = 14</td>
            <td>Loan Default</td>
            <td>Taiwan, 2005</td>
            <td
              >[
              <a
                href="https://proceedings.neurips.cc/paper/2020/hash/c2ba1bc54b239208cb37b901c0d3b363-Abstract.html"
                target="_blank">2</a
              >,
              <a
                href="https://dl.acm.org/doi/10.1145/3287560.3287566"
                target="_blank">3</a
              >,
              <a
                href="https://proceedings.mlr.press/v108/karimi20a.html"
                target="_blank">4</a
              >,
              <a
                href="https://dl.acm.org/doi/10.14778/3461535.3461555"
                target="_blank">5</a
              >
              ]</td
            >
          </tr>
          <tr>
            <td>German Credit</td>
            <td
              ><a
                href="#top"
                on:click={(e) => {
                  optionClicked(e, datasetOptions[2]);
                }}>Demo</a
              >
            </td>
            <td>n = 1000, d = 20</td>
            <td>Good Customer</td>
            <td>German, 1994</td>
            <td
              >[
              <a
                href="https://dl.acm.org/doi/abs/10.1145/3351095.3372850"
                target="_blank">1</a
              >,
              <a
                href="https://proceedings.neurips.cc/paper/2020/hash/c2ba1bc54b239208cb37b901c0d3b363-Abstract.html"
                target="_blank">2</a
              >,
              <a href="https://arxiv.org/abs/2106.02666" target="_blank">6</a>,
              <a
                href="https://proceedings.neurips.cc/paper/2020/hash/8ee7730e97c67473a424ccfeff49ab20-Abstract.html"
                target="_blank">7</a
              >,
              <a
                href="https://dl.acm.org/doi/abs/10.1145/3442188.3445899"
                target="_blank">8</a
              >
              ]</td
            >
          </tr>
          <tr>
            <td>Adult</td>
            <td
              ><a
                href="#top"
                on:click={(e) => {
                  optionClicked(e, datasetOptions[3]);
                }}>Demo</a
              >
            </td>
            <td>n = 45222, d = 12</td>
            <td>Income ≥ 50K</td>
            <td>US, 1996</td>
            <td
              >[
              <a
                href="https://dl.acm.org/doi/abs/10.1145/3351095.3372850"
                target="_blank">1</a
              >,
              <a
                href="https://dl.acm.org/doi/10.1145/3287560.3287566"
                target="_blank">3</a
              >,
              <a
                href="https://proceedings.mlr.press/v108/karimi20a.html"
                target="_blank">4</a
              >,
              <a
                href="https://dl.acm.org/doi/10.14778/3461535.3461555"
                target="_blank">5</a
              >,
              <a href="https://arxiv.org/abs/2106.02666" target="_blank">6</a>
              ]</td
            >
          </tr>
          <tr>
            <td>COMPAS</td>
            <td
              ><a
                href="#top"
                on:click={(e) => {
                  optionClicked(e, datasetOptions[4]);
                }}>Demo</a
              >
            </td>
            <td>n = 5278, d = 5</td>
            <td>Recidivism in two years</td>
            <td>US, 2016</td>
            <td
              >[
              <a
                href="https://dl.acm.org/doi/abs/10.1145/3351095.3372850"
                target="_blank">1</a
              >,
              <a
                href="https://proceedings.mlr.press/v108/karimi20a.html"
                target="_blank">4</a
              >,
              <a
                href="https://proceedings.neurips.cc/paper/2020/hash/8ee7730e97c67473a424ccfeff49ab20-Abstract.html"
                target="_blank">7</a
              >
              ]</td
            >
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="article-footer">
    <div class="footer-main">
      <div class="footer-cp">
        <div>FAccT'22 Appeal Submission #218</div>
        <div>We appreciate your consideration for our appeal!</div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  @import './Article.scss';
  @import './ArticleAppeal.scss';
</style>
