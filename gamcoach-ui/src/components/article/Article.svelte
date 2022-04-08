<script>
  //@ts-check
  import '../../typedef';
  import Coach from '../coach/Coach.svelte';
  import DiffPicker from '../DiffPicker.svelte';
  import ConfirmModal from '../confirm-modal/ConfirmModal.svelte';
  import InputForm from '../input-form/InputForm.svelte';
  import RatingForm from '../input-form/RatingForm.svelte';
  import ConstraintRatingForm from '../input-form/ConstraintRatingForm.svelte';
  import BookmarkPanel from '../bookmark-panel/BookmarkPanel.svelte';
  import Tooltip from '../Tooltip.svelte';
  import Youtube from './Youtube.svelte';

  import d3 from '../../utils/d3-import';
  import { Logger } from '../../utils/logger';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { fade, fly } from 'svelte/transition';
  import {
    tooltipConfigStore,
    inputFormConfigStore,
    constraintsStore,
    bookmarkConfigStore,
    ratingFormConfigStore,
    constraintRatingFormConfigStore
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

  // Import models
  import modelDataLC from '../../config/data/lc-classifier.json';
  import modelDataAdult from '../../config/data/adult-classifier.json';
  import modelDataCredit from '../../config/data/credit-classifier.json';
  import modelDataGerman from '../../config/data/german-classifier.json';
  import modelDataCompass from '../../config/data/compas-classifier.json';

  export let modelName = 'adult';

  let curModelData = modelDataLC;
  let curSamples = samplesLC;
  let curIndex = 126;

  switch (modelName) {
    case 'lc': {
      curModelData = modelDataLC;
      curSamples = samplesLC;
      curIndex = 126;
      break;
    }
    case 'adult': {
      curModelData = modelDataAdult;
      curSamples = samplesAdult;
      curIndex = 322;
      break;
    }
    case 'credit': {
      curModelData = modelDataCredit;
      curSamples = samplesCredit;
      curIndex = 333;
      break;
    }
    case 'german': {
      curModelData = modelDataGerman;
      curSamples = samplesGerman;
      curIndex = 181;
      break;
    }
    case 'compas': {
      curModelData = modelDataCompass;
      curSamples = samplesCompas;
      curIndex = 380;
      break;
    }
    default: {
      console.warn('Unknown model name');
      curModelData = modelDataLC;
      curSamples = samplesLC;
      modelName = 'lc';
      curIndex = 126;
    }
  }

  const unsubscribes = [];
  let windowLoaded = false;
  let currentPlayer = null;

  const indexFormatter = d3.format('03d');

  let verificationCode = null;
  let buttonText = "I'm Done!";
  let updated = false;

  // Initialize the logger
  const logger = null;

  /** @type {any[]} */
  let curExample = [
    17000.0,
    '36 months',
    '3 years',
    'RENT',
    4.831869774280501,
    'Source Verified',
    'major_purchase',
    10.09,
    '0',
    11.0,
    '0',
    5.0,
    '1',
    1.7075701760979363,
    0.4,
    9.0,
    'Individual',
    '0',
    '1',
    712.0
  ];

  // // Example that is closest to the median
  // curExample = [15000.0, '36 months', '10+ years', 'RENT', 4.785329835010767,
  //   'Source Verified', 'debt_consolidation', 20.47, '0', 16.0, '0', 11.0, '0',
  //   4.041451902647006, 57.7, 21.0, 'Individual', '0', '0', 677.0];

  // curIndex = 451;
  // curExample = samples[curIndex];

  // curIndex = 23;
  // curExample = samples[curIndex];

  // curIndex = random(0, curSamples.length - 1);
  curExample = curSamples[curIndex];

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
        <div class="title">You're loan applicant</div>
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
          <span class="line"> The bank points you to </span>
          <span class="line">
            <strong>GAM Coach</strong> to help you
          </span>
          <span class="line"> succeed in next application </span>
        </div>
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
    </div>

    {#key curExample}
      <div class="coach-wrapper">
        <Coach {windowLoaded} {curExample} {logger} {curModelData} />
      </div>
    {/key}

    <DiffPicker {logger} />
    <ConfirmModal />
    <InputForm />
    <BookmarkPanel {windowLoaded} {logger} />
  </div>

  <div class="article">
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
          <source src={`/videos/demo-${item.video}.mp4`} />
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

    <h2 id="tutorial">
      Use <span class="teal">GAM Coach</span> as an ML Developer
    </h2>

    {#each text.developer as p}
      <p>{@html p}</p>
    {/each}

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
        videoId="0q3aqwrSbTk"
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
        <div>FAccT'22 Submission</div>
        <div>Thanks for reviewing the manuscript!</div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  @import './Article.scss';
</style>
