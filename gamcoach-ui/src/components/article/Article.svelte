<script>
  //@ts-check
  import '../../typedef';
  import Coach from '../coach/Coach.svelte';
  import DiffPicker from '../DiffPicker.svelte';
  import ConfirmModal from '../confirm-modal/ConfirmModal.svelte';
  import InputForm from '../input-form/InputForm.svelte';
  import BookmarkPanel from '../bookmark-panel/BookmarkPanel.svelte';
  import Tooltip from '../Tooltip.svelte';
  import Youtube from './Youtube.svelte';

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

  import text from '../../config/article-text.yml';

  // Import samples
  import samplesLC from '../../config/data/lc-classifier-random-samples.json';
  import samplesAdult from '../../config/data/adult-classifier-random-samples.json';
  import samplesCredit from '../../config/data/credit-classifier-random-samples.json';
  import samplesGerman from '../../config/data/german-classifier-random-samples.json';
  import samplesCompas from '../../config/data/compas-classifier-random-samples.json';
  import samplesCrime from '../../config/data/crime-classifier-random-samples.json';
  import samplesCrimeMitigated from '../../config/data/crime-mitigated-classifier-random-samples.json';

  export let modelName = 'lc';

  let curSamples = samplesLC;
  let curIndex = 126;

  const datasetOptions = [
    { name: 'lc', display: 'Lending Club' },
    { name: 'crime-mitigated', display: 'Communities & Crime' },
    { name: 'adult', display: 'Adult Census Income' },
    { name: 'german', display: 'German Credit' },
    { name: 'compas', display: 'COMPAS' },
    { name: 'credit', display: 'Credit' }
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
      case 'crime': {
        curSamples = samplesCrime;
        curIndex = 347;
        break;
      }
      case 'crime-mitigated': {
        curSamples = samplesCrimeMitigated;
        curIndex = 165;
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

  const getAgencyName = (modelName) => {
    if (modelName === 'compas') {
      return 'court';
    } else if (modelName === 'crime-mitigated' || modelName === 'crime') {
      return 'funding agency';
    } else {
      return 'bank';
    }
  };

  const getApplicantName = (modelName) => {
    if (modelName === 'compas') {
      return 'bail applicant';
    } else if (modelName === 'crime-mitigated' || modelName === 'crime') {
      return 'funding applying county';
    } else {
      return 'loan applicant';
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
          You're {getApplicantName(modelName)}
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
            The {getAgencyName(modelName)} points you to
          </span>
          <span class="line">
            <strong>GAM Coach</strong> to help you
          </span>
          <span class="line"> succeed in next application </span>
        </div>
        {#if modelName === 'compas'}
          <div class="description">
            <span class="line" style="margin-top: 30px;">
              *We don't expect one to use COMPAS to evaluate GAM Coach; we use
              it to demonstrate the generalizability of GAM Coach.
            </span>
          </div>
        {:else if modelName === 'crime-mitigated'}
          <div class="description">
            <span class="line" style="margin-top: 30px;">
              *Before training this model, we removed sensitive features (e.g.,
              Black Population) and features with many missing values.
              <a
                href="javascript:"
                on:click={(e) =>
                  optionClicked(e, {
                    name: 'crime',
                    display: 'Communities & Crime'
                  })}>Try full model</a
              >
            </span>
          </div>
        {:else if modelName === 'crime'}
          <div class="description">
            <span class="line" style="margin-top: 30px;">
              *This model was trained on sensitive features (e.g., Black
              Population) and features with many missing values.
              <a
                href="javascript:"
                on:click={(e) =>
                  optionClicked(e, {
                    name: 'crime-mitigated',
                    display: 'Communities & Crime'
                  })}>Try sanitized model</a
              >
            </span>
          </div>
        {/if}
      </div>
    </div>

    <div class="coach-right">
      <div class="icon-container">
        <a target="_blank" href="https://github.com/anonchi/gam-coach/">
          <div class="svg-icon" title="Open-source code">
            {@html iconGithub}
          </div>
          <span>Code</span>
        </a>

        <a target="_blank" href="https://youtu.be/Z2vdqZFKNeg">
          <div class="svg-icon" title="Demo video">
            {@html iconVideo}
          </div>
          <span>Video</span>
        </a>
      </div>
      <div class="dataset-menu">
        <span class="dataset-description">Choose a dataset</span>
        {#each datasetOptions as option, i}
          <div
            class="dataset-option"
            class:selected={option.name === modelName ||
              (option.name === 'crime-mitigated' && modelName === 'crime')}
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
    <h2 id="tool">What is <span class="teal">GAM Coach</span>?</h2>
    {#each text.tool.pre as p}
      <p>{@html p}</p>
    {/each}

    <h2 id="tutorial">
      How to Use <span class="teal">GAM Coach</span> as an End-user?
    </h2>

    {#each text.video as item, i}
      {#if item.header !== null}
        <h4 id={`${item.video}`}>{item.header}</h4>
      {/if}

      <div class="video">
        <video autoplay loop muted playsinline class:wide-video={item.isWide}>
          <source src={`PUBLIC_URL/videos/demo-${item.video}.mp4`} />
          <track kind="captions" />
        </video>
        <div class="figure-caption">
          Figure {item.figureID}. {@html item.caption}
        </div>
      </div>

      {#each item.text as p}
        <p>{@html p}</p>
      {/each}
    {/each}

    <h2 id="tutorial-developer">
      Use <span class="teal">GAM Coach</span> as an ML Developer
    </h2>

    <p>{@html text.developer[0]}</p>

    <div class="article-table" id="datasets">
      <div class="figure-caption">
        Table 1. {@html text.table.caption}
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Dataset</th>
            <th>GAM Coach</th>
            <th>Size</th>
            <th>Prediction</th>
            <th>Country</th>
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
            <td>n=12,4026<br />d=20</td>
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
            <td>Communities & Crime</td>
            <td
              ><a
                href="#top"
                on:click={(e) => {
                  optionClicked(e, datasetOptions[1]);
                }}>Demo</a
              >
            </td>
            <td>n=1,994<br />d=120</td>
            <td>Low Crime Risk</td>
            <td>US, 1995</td>
            <td
              >[
              <a
                href="https://proceedings.neurips.cc/paper/2021/hash/009c434cab57de48a31f6b669e7ba266-Abstract.html"
                target="_blank">3</a
              > ]</td
            >
          </tr>

          <tr>
            <td>Adult</td>
            <td
              ><a
                href="#top"
                on:click={(e) => {
                  optionClicked(e, datasetOptions[2]);
                }}>Demo</a
              >
            </td>
            <td>n=45,222<br />d=12</td>
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
                target="_blank">4</a
              >,
              <a
                href="https://proceedings.mlr.press/v108/karimi20a.html"
                target="_blank">5</a
              >,
              <a
                href="https://dl.acm.org/doi/10.14778/3461535.3461555"
                target="_blank">6</a
              >,
              <a href="https://arxiv.org/abs/2106.02666" target="_blank">6</a>
              ]</td
            >
          </tr>

          <tr>
            <td>German Credit</td>
            <td
              ><a
                href="#top"
                on:click={(e) => {
                  optionClicked(e, datasetOptions[3]);
                }}>Demo</a
              >
            </td>
            <td>n=1,000<br />d=20</td>
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
                target="_blank">8</a
              >,
              <a
                href="https://dl.acm.org/doi/abs/10.1145/3442188.3445899"
                target="_blank">9</a
              >
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
            <td>n=5,278<br />d=5</td>
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
                target="_blank">5</a
              >,
              <a
                href="https://proceedings.neurips.cc/paper/2020/hash/8ee7730e97c67473a424ccfeff49ab20-Abstract.html"
                target="_blank">8</a
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
                  optionClicked(e, datasetOptions[5]);
                }}>Demo</a
              >
            </td>
            <td>n=29,623<br />d=14</td>
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
                target="_blank">4</a
              >,
              <a
                href="https://proceedings.mlr.press/v108/karimi20a.html"
                target="_blank">5</a
              >,
              <a
                href="https://dl.acm.org/doi/10.14778/3461535.3461555"
                target="_blank">6</a
              >
              ]</td
            >
          </tr>
        </tbody>
      </table>
    </div>

    <p>{@html text.developer[1]}</p>

    <h2 id="tutorial">Demo Video</h2>

    <ul class="video-list">
      {#each text.youtubeTimes as time, i}
        <li class="video-link" on:click={currentPlayer.play(time.startTime)}>
          {time.name}
          <small>{time.timestamp}</small>
        </li>
      {/each}
    </ul>

    <div class="youtube-video">
      <Youtube
        videoId="Z2vdqZFKNeg"
        playerId="demo_video"
        bind:this={currentPlayer}
      />
    </div>

    <h2 id="tutorial">How is <span class="teal">GAM Coach</span> Developed?</h2>

    {#each text.development as p}
      <p>{@html p}</p>
    {/each}
  </div>

  <div class="article-footer">
    <div class="footer-main">
      <div class="footer-cp">
        <div>CHI'23 Submission</div>
        <div>Thanks for reviewing the manuscript!</div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  @import './Article.scss';
</style>
