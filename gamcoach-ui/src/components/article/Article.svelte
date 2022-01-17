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
  import { tooltipConfigStore, inputFormConfigStore, constraintsStore,
    bookmarkConfigStore, ratingFormConfigStore,
    constraintRatingFormConfigStore } from '../../store';
  import { Constraints } from '../coach/Coach';
  import { random } from '../../utils/utils';

  import pointArrowSVG from '../../img/point-arrow.svg';
  import iconRefreshSVG from '../../img/icon-refresh3.svg';
  import iconEditSVG from '../../img/icon-edit.svg';
  import iconGithub from '../../img/icon-github.svg';
  import iconVideo from '../../img/icon-youtube.svg';
  import iconPdf from '../../img/icon-pdf.svg';

  import text from '../../config/article-text.yml';
  import samples from '../../config/lc-classifier-random-samples.json';

  const unsubscribes = [];
  let windowLoaded = false;
  let currentPlayer = null;

  const indexFormatter = d3.format('03d');

  let verificationCode = null;
  let buttonText = 'I\'m Done!';
  let updated = false;

  // Initialize the logger
  const logger = new Logger();
  // const logger = null;

  let curIndex = 126;
  /** @type {any[]} */
  let curExample = [
    17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
    'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
    '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0];

  // Example that is closest to the median
  curExample = [15000.0, '36 months', '10+ years', 'RENT', 4.785329835010767,
    'Source Verified', 'debt_consolidation', 20.47, '0', 16.0, '0', 11.0, '0',
    4.041451902647006, 57.7, 21.0, 'Individual', '0', '0', 677.0];

  // curIndex = 451;
  // curExample = samples[curIndex];

  // curIndex = 23;
  // curExample = samples[curIndex];

  // curIndex = random(0, samples.length - 1);
  // curExample = samples[curIndex];

  logger?.setInitialValues({
    curExample
  });
  logger?.addBrowserRecord();
  logger?.addOSRecord();

  const pointArrowSVGProcessed = pointArrowSVG
    .replaceAll('white', 'currentcolor');

  // Set up tooltip
  let tooltip = null;
  let tooltipConfig = null;
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {tooltipConfig = value;})
  );

  /** @type {Constraints} */
  let constraints = null;
  unsubscribes.push(constraintsStore.subscribe(value => {
    constraints = value;
  }));

  /** @type {BookmarkConfig} */
  let bookmarkConfig = null;
  unsubscribes.push(bookmarkConfigStore.subscribe(value => {
    bookmarkConfig = value;
  }));

  /** @type {InputFormConfig} */
  let inputFormConfig = null;
  unsubscribes.push(
    inputFormConfigStore.subscribe(value => {
      inputFormConfig = value;

      // Update curExample if it is changed
      if (inputFormConfig.action === 'saved') {
        // Log the interaction
        logger?.addLog({
          eventName: 'curExampleUpdated',
          elementName: 'input form',
          valueName: 'curExample',
          oldValue: curExample,
          newValue: inputFormConfig.curExample
        });

        inputFormConfig.action = null;
        updated = true;
        curExample = inputFormConfig.curExample;
        inputFormConfigStore.set(inputFormConfig);
      }
    })
  );

  /** @type {RatingFormConfig} */
  let ratingFormConfig = null;
  unsubscribes.push(
    ratingFormConfigStore.subscribe(value => {
      ratingFormConfig = value;

      // If the users have reviewed all saved plans, we put it into the log and
      // submit the log
      if (ratingFormConfig.action === 'submit') {

        logger?.addRecord('ratings', ratingFormConfig.planRatings);

        ratingFormConfig.action = '';
        ratingFormConfigStore.set(ratingFormConfig);

        // Upload the log to dropbox
        buttonText = 'Uploading...';
        logger?.uploadToDropbox()
          .then(value => {
            console.log(value);
            if (value > 0) {
              // Success show the number
              buttonText = 'Finished, thank you!';
              verificationCode = value;
            } else {
              // Failed, but the download should start
              buttonText = 'Failed to upload';
              verificationCode = 999999;
            }
          });
      }
    })
  );

  /** @type {ConstraintRatingFormConfig}*/
  let constraintRatingFormConfig = null;
  unsubscribes.push(
    constraintRatingFormConfigStore.subscribe(value => {
      constraintRatingFormConfig = value;

      // If the users have reviewed all constraints, we put the review in the log
      // proceed to show the plan review
      if (constraintRatingFormConfig.action === 'proceed') {

        logger?.addRecord('constraintRating',
          constraintRatingFormConfig.constraintRatings);

        constraintRatingFormConfig.action = '';
        constraintRatingFormConfigStore.set(constraintRatingFormConfig);

        // Show the plan review window
        ratingFormConfig.show = true;
        ratingFormConfigStore.set(ratingFormConfig);
      }
    })
  );

  const refreshClicked = () => {
    // Resample the cur example
    curIndex = random(0, samples.length - 1);
    const newExample = samples[curIndex];

    // Log the interaction
    logger?.addLog({
      eventName: 'curExampleUpdated',
      elementName: 'shuffle',
      valueName: 'curExample',
      oldValue: curExample,
      newValue: newExample
    });

    updated = false;
    curExample = newExample;

    console.log(logger?.toJSON());
  };

  const editClicked = () => {
    inputFormConfig.show = true;
    inputFormConfig.curExample = curExample;
    inputFormConfig.action = null;
    inputFormConfigStore.set(inputFormConfig);
  };

  const submitClicked = () => {
    if (verificationCode !== null) return;

    // Warn user that they have un-realized constraints
    if (constraints.hasNewConstraints) {
      alert(''.concat('You have set a new preference, but you have not ',
        'generate new plans with this new preference yet. Click "Regenerate"',
        'button ',
        'to generate new plans that meet your new preference.'
      ));
      return;
    }

    if (bookmarkConfig.plans.size === 0) {
      alert(''.concat('You need to save at least one plan to submit your task. ',
        'Keep exploring suggested strategies and click the star icon (next to ',
        'the plan name) to save ',
        'plans that you are satisfied with.'
      ));
      return;
    }

    // If there is no unpicked plans set up, add them
    if (bookmarkConfig.unpickedPlans === undefined) {
      bookmarkConfig.action = 'addUnpicked';
      bookmarkConfigStore.set(bookmarkConfig);
    }

    constraintRatingFormConfig.show = true;
    constraintRatingFormConfigStore.set(constraintRatingFormConfig);
  };

  onMount(() => {
    // window.onload = () => { windowLoaded = true; };
    windowLoaded = true;
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

</script>

<style lang='scss'>
  @import './Article.scss';
</style>

<div class='page'>

  <Tooltip bind:this={tooltip}/>

  <div class='top' id='top'>

    <div class='top-fill'></div>

    <div class='top-empty'></div>

    <div class='coach-left'>
      <!-- <div class='help-arrow'>{@html pointArrowSVGProcessed}</div> -->
      <div class='help-note'>
        <div class='arrow'></div>
        <div class='title-top'>Imagine...</div>
        <div class='title'>You're loan applicant</div>
        <div class='input-number'>
          <div class='svg-icon'
            title='Edit the input values'
            on:click={() => editClicked()}
          >
            {@html iconEditSVG}
          </div>
          <div class='svg-icon'
            title='Try a random input sample'
            on:click={() => refreshClicked()}
          >
            {@html iconRefreshSVG}
          </div>
          <div class='number'>#{indexFormatter(curIndex)}{updated ? '*' : ''}</div>
        </div>
        <div class='description'>
          <span class='line'>
            Your application is rejected
          </span>
          <div class='help-arrow'>{@html pointArrowSVGProcessed}</div>
          <span class='line'>
            The bank points you to
          </span>
          <span class='line'>
            <strong>GAM Coach</strong> to help you
          </span>
          <span class='line'>
            succeed in next application
          </span>
        </div>
      </div>
    </div>

    <div class='coach-right'>
      <div class='icon-container'>
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

        <!-- <a target="_blank" href="https://facctsubmission.com">
          <div class="svg-icon" title="Paper">
            {@html iconPdf}
          </div>
          <span>Paper</span>
        </a> -->

      </div>
    </div>

    {#key curExample}
      <div class='coach-wrapper'>
        <Coach windowLoaded={windowLoaded}
          curExample={curExample}
          logger={logger}
        />
      </div>
    {/key}

    <DiffPicker logger={logger}/>
    <ConfirmModal/>
    <InputForm />
    <RatingForm />
    <ConstraintRatingForm />
    <BookmarkPanel windowLoaded={windowLoaded} logger={logger}/>
  </div>

  <div class='article'>

    <h2 id='tool'>What is <span class='teal'>GAM Coach</span>?</h2>
    {#each text.tool.pre as p}
      <p>{@html p}</p>
    {/each}

    <h2 id='tutorial'>How to Use <span class='teal'>GAM Coach</span> as an End-user?</h2>

    {#each text.video as item, i}
      {#if item.header !== null}
        <h4 id={`${item.video}`}>{item.header}</h4>
      {/if}

      <div class='video'>
        <video autoplay loop muted playsinline class:wide-video={item.isWide}>
          <source src={`/videos/tutorial-${item.video}.mp4`}>
          <track kind='captions'>
        </video>
        <div class="figure-caption">
          Figure {item.figureID}. {@html item.caption}
        </div>
      </div>

      {#each item.text as p}
        <p>{@html p}</p>
      {/each}
    {/each}


    <h2 id='tutorial'>Use <span class='teal'>GAM Coach</span> as an ML Developer</h2>

    <h2 id='tutorial'>Demo Video</h2>

    <ul class='video-list'>
      <li class='video-link' on:click={currentPlayer.play(0)}>
        Introduction
        <small>(0:00-0:34)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(36)}>
        Feature Card Organization
        <small>(0:34-0:50)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(53)}>
        Plan Tabs
        <small>(0:50-1:00)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(60)}>
        Explore Hypothetical Values of a Continuous Feature
        <small>(1:00-1:15)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(76)}>
        Specify Feature Difficulty
        <small>(1:16-1:24)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(84)}>
        Specify Acceptable Range of a Continuous Feature
        <small>(1:24-1:34)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(94)}>
        Specify Max Number of Features a Plan Can Change
        <small>(1:34-1:49)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(109)}>
        Bookmark Satisfactory Plans
        <small>(1:49-2:00)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(120)}>
        Explore Hypothetical Values of a Categorical Feature
        <small>(2:00-2:08)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(128)}>
        Specify Acceptable Range of a Categorical Feature
        <small>(2:08-2:35)</small>
      </li>
      <li class='video-link' on:click={currentPlayer.play(155)}>
        Download a verifiable Recourse Receipt
        <small>(2:35-2:48)</small>
      </li>
    </ul>

    <div class="youtube-video">
      <Youtube videoId="0q3aqwrSbTk" playerId="demo_video" bind:this={currentPlayer}/>
    </div>

    <h2 id='tutorial'>How is <span class='teal'>GAM Coach</span> Developed?</h2>



  </div>

  <div class='article-footer'>
    <div class='footer-main'>

      <div class='footer-cp'>
        <div>FAccT'22 Submission</div>
        <div>Thanks for reviewing the manuscript!</div>
      </div>

    </div>
  </div>

</div>