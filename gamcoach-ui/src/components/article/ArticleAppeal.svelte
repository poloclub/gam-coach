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
    bookmarkConfigStore
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
        <Coach {windowLoaded} {curExample} {logger} {modelName} />
      </div>
    {/key}

    <DiffPicker {logger} />
    <ConfirmModal />
    <InputForm />
    <BookmarkPanel {windowLoaded} {logger} />
  </div>

  <div class="article">
    <h2 id="summary">Appeal Summary</h2>
    <p>{@html text.summary.intro}</p>
    <ol>
      {#each text.summary.list as item}
        <li class="task-list"><span class="list-item">{@html item}</span></li>
      {/each}
    </ol>
    <p>{@html text.summary.conclusion}</p>

    <h2 id="support">Supporting Document</h2>

    <h4 id="mistake-1">M1: "{@html text.crash.title}"</h4>
    <blockquote><p>{@html text.crash.review}</p></blockquote>
    <p>{@html text.crash.response}</p>

    <h4 id="mistake-2">M2: "{@html text.development.title}"</h4>
    <blockquote><p>{@html text.development.review}</p></blockquote>
    <p>{@html text.development.response}</p>
    <blockquote class="response">
      <p>{@html text.development.quote}</p>
    </blockquote>

    <h4 id="mistake-3">M3: "{@html text.experience.title}"</h4>
    <blockquote><p>{@html text.experience.review}</p></blockquote>
    <p>{@html text.experience.response}</p>

    <h4 id="mistake-4">M4: "{@html text.evaluation.title}"</h4>
    <blockquote><p>{@html text.evaluation.review}</p></blockquote>
    <p>{@html text.evaluation.response}</p>
    <blockquote class="response">
      <p>{@html text.evaluation.quote}</p>
    </blockquote>
  </div>

  <div class="article-footer">
    <div class="footer-main">
      <div class="footer-cp">
        <div>FAccT'22 Submission</div>
        <div>Thanks again for reviewing this manuscript!</div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  @import './Article.scss';
  @import './ArticleAppeal.scss';
</style>
