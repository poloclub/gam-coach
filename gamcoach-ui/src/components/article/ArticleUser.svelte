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

  import text from '../../config/user-text.yml';
  import samples from '../../config/lc-classifier-random-samples.json';

  const unsubscribes = [];
  let windowLoaded = false;

  const indexFormatter = d3.format('03d');

  let verificationCode = null;
  let buttonText = "I'm Done!";
  let updated = false;

  // Initialize the logger
  const logger = new Logger();
  // const logger = null;

  let curIndex = 126;
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

  // Example that is closest to the median
  curExample = [
    15000.0,
    '36 months',
    '10+ years',
    'RENT',
    4.785329835010767,
    'Source Verified',
    'debt_consolidation',
    20.47,
    '0',
    16.0,
    '0',
    11.0,
    '0',
    4.041451902647006,
    57.7,
    21.0,
    'Individual',
    '0',
    '0',
    677.0
  ];

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
    ratingFormConfigStore.subscribe((value) => {
      ratingFormConfig = value;

      // If the users have reviewed all saved plans, we put it into the log and
      // submit the log
      if (ratingFormConfig.action === 'submit') {
        logger?.addRecord('ratings', ratingFormConfig.planRatings);

        ratingFormConfig.action = '';
        ratingFormConfigStore.set(ratingFormConfig);

        // Upload the log to dropbox
        buttonText = 'Uploading...';
        logger?.uploadToDropbox().then((value) => {
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
    constraintRatingFormConfigStore.subscribe((value) => {
      constraintRatingFormConfig = value;

      // If the users have reviewed all constraints, we put the review in the log
      // proceed to show the plan review
      if (constraintRatingFormConfig.action === 'proceed') {
        logger?.addRecord(
          'constraintRating',
          constraintRatingFormConfig.constraintRatings
        );

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
      alert(
        ''.concat(
          'You have set a new preference, but you have not ',
          'generate new plans with this new preference yet. Click "Regenerate"',
          'button ',
          'to generate new plans that meet your new preference.'
        )
      );
      return;
    }

    if (bookmarkConfig.plans.size === 0) {
      alert(
        ''.concat(
          'You need to save at least one plan to submit your task. ',
          'Keep exploring suggested strategies and click the star icon (next to ',
          'the plan name) to save ',
          'plans that you are satisfied with.'
        )
      );
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
      <div class="description">
        <span class="line">
          Please try your best to <strong>imagine</strong> being a real loan applicant
          using this tool.
        </span>
        <span class="line">
          Imagine what kinds of strategies would be <strong
            >most helpful in real life</strong
          >.
        </span>
        <span class="line">
          Once you are <strong>satisfied</strong> with any generated plan(s) and
          have <strong>bookmarked</strong>
          them, click the button below to finish.
        </span>

        <div class="button" on:click={() => submitClicked()}>{buttonText}</div>

        <div class="code" class:no-display={verificationCode === null}>
          <span class="title">Verification Code</span>
          <span class="code-number">{verificationCode}</span>
        </div>

        <div
          class="download-message"
          class:no-display={verificationCode !== 999999}
        >
          Please upload "strategy-data.json" to Google Survey
        </div>
      </div>
    </div>

    {#key curExample}
      <div class="coach-wrapper">
        <Coach {windowLoaded} {curExample} {logger} />
      </div>
    {/key}

    <DiffPicker {logger} />
    <ConfirmModal />
    <InputForm />
    <RatingForm />
    <ConstraintRatingForm />
    <BookmarkPanel {windowLoaded} {logger} />
  </div>

  <div class="article">
    <!-- <h2 id='introduction'>Introduction</h2>
    {#each text.introduction.main as p}
      <p>{@html p}</p>
    {/each} -->

    <h2 id="tool">What is GAM Coach?</h2>
    {#each text.tool.pre as p}
      <p>{@html p}</p>
    {/each}

    {#each text.tool.after as p}
      <p>{@html p}</p>
    {/each}

    <!-- <div class='important-note'>
      <p class='title'>Important Note</p>
      <p class='content'>{@html text.introduction.important}</p>
    </div> -->

    <h2 id="tutorial">What Can I Do with GAM Coach?</h2>
    <p>{@html text.feature.main}</p>

    <video class="wide-video" controls playsinline muted>
      <source src="PUBLIC_URL/videos/tutorial-overview.mp4" />
      <track kind="captions" />
    </video>

    <!-- <p>{@html text.overview}</p> -->

    <p>{@html text.feature.gap}</p>

    <ol>
      {#each text.feature.list as item}
        <li><a href={`#${item.id}`}>{item.name}</a></li>
      {/each}
    </ol>

    <h2 id="task">So, What is My Task?</h2>
    <p>{@html text.task.intro}</p>

    <h4>Task 1</h4>
    <p>{@html text.task.first}</p>

    <ol>
      {#each text.task.firstList as item}
        <li class="task-list">{@html item}</li>
      {/each}
    </ol>

    <h4>Task 2</h4>
    <p>{@html text.task.main}</p>
    <p>{@html text.task.gap}</p>

    <ol>
      {#each text.task.list as item}
        <li>{@html item.item}</li>
        {#if item.list !== null}
          <ol>
            {#each item.list as subItem}
              <li>{@html subItem}</li>
            {/each}
          </ol>
        {/if}
      {/each}
    </ol>

    <div class="important-note" id="acceptance">
      <p class="title">HIT Acceptance Criteria</p>
      <p class="content">{@html text.task.accept}</p>
    </div>

    <div class="important-note">
      <p class="title">Bonus Criteria</p>
      <div class="content">
        <p class="content">{@html text.task.bonus.intro}</p>
        <ol>
          {#each text.task.bonus.list as item}
            <li>{@html item}</li>
          {/each}
        </ol>
      </div>
    </div>

    <h2 id="detailed-tutorial">Detailed Tutorial Videos</h2>
    <p>{@html text.detail}</p>

    {#each text.video as item, i}
      <h4 id={`${item.video}`}>{i + 1}. {item.header}</h4>

      <video controls loop playsinline muted class:wide-video={item.isWide}>
        <source src={`PUBLIC_URL/videos/tutorial-${item.video}.mp4`} />
        <track kind="captions" />
      </video>

      <p>{@html item.text}</p>
    {/each}
  </div>
</div>

<style lang="scss">
  @import './Article.scss';
</style>
