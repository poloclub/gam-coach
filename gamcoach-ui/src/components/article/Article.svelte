<script>
  //@ts-check
  import '../../typedef';
  import Coach from '../coach/Coach.svelte';
  import DiffPicker from '../DiffPicker.svelte';
  import ConfirmModal from '../confirm-modal/ConfirmModal.svelte';
  import InputForm from '../input-form/InputForm.svelte';
  import RatingForm from '../input-form/RatingForm.svelte';
  import BookmarkPanel from '../bookmark-panel/BookmarkPanel.svelte';
  import Tooltip from '../Tooltip.svelte';

  import d3 from '../../utils/d3-import';
  import { Logger } from '../../utils/logger';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { fade, fly } from 'svelte/transition';
  import { tooltipConfigStore, inputFormConfigStore,
    ratingFormConfigStore } from '../../store';

  import pointArrowSVG from '../../img/point-arrow.svg';
  import iconRefreshSVG from '../../img/icon-refresh3.svg';
  import iconEditSVG from '../../img/icon-edit.svg';

  import text from '../../config/text.yaml';

  const unsubscribes = [];
  let windowLoaded = false;

  const indexFormatter = d3.format('03d');

  let curIndex = 6;
  let verificationCode = null;
  let buttonText = 'I\'m Done!';
  let updated = false;

  // Initialize the logger
  const logger = new Logger();
  // const logger = null;

  /** @type {any[]} */
  let curExample = [
    17000.0, '36 months', '3 years', 'RENT', 4.831869774280501,
    'Source Verified', 'major_purchase', 10.09, '0', 11.0, '0', 5.0,
    '1', 1.7075701760979363, 0.4, 9.0, 'Individual', '0', '1', 712.0
  ];

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

  const refreshClicked = () => {
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

    ratingFormConfig.show = true;
    ratingFormConfigStore.set(ratingFormConfig);
  };

  onMount(() => {
    window.onload = () => { windowLoaded = true; };
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

  <div class='top' id='s-top'>

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
      <div class='description'>
        <span class='line'>
          Thank you so much for helping us improve GAM Coach!!
        </span>
        <span class='line'>
          Please try your best to <strong>imagine</strong> being a real loan applicant using this tool.
        </span>
        <span class='line'>
          Once you are <strong>satisfied</strong> with any generated plan(s) and have <strong>bookmarked</strong>
          them, click the button below to finish.
        </span>

        <div class='button' on:click={() => submitClicked()}>{buttonText}</div>

        <div class='code' class:no-display={verificationCode === null}>
          <span class='title'>Verification Code</span>
          <span class='code-number'>{verificationCode}</span>
        </div>

        <div class='download-message' class:no-display={verificationCode !== 999999}>
          Please upload "strategy-data.json" to Google Survey
        </div>

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
    <BookmarkPanel windowLoaded={windowLoaded} logger={logger}/>
  </div>

  <div class='article'>

    <h2 id='s-introduction'>Introduction</h2>
    {#each text.introduction.main as p}
      <p>{@html p}</p>
    {/each}

    <div class='important-note'>
      <p class='title'>Important Note</p>
      <p class='content'>{@html text.introduction.important}</p>
    </div>


    <h2 id='s-tool'>What is GAM Coach?</h2>
    {#each text.tool.pre as p}
      <p>{@html p}</p>
    {/each}

    {#each text.tool.after as p}
      <p>{@html p}</p>
    {/each}

    <h2 id='s-feature'>What Can I Do with GAM Coach?</h2>
    <p>{@html text.feature.main}</p>
    <p>{@html text.feature.gap}</p>

    <ol>
      {#each text.feature.list as item}
        <li><a href={`#${item.id}`}>{item.name}</a></li>
      {/each}
    </ol>

    <h2 id='s-task'>So, What is My Task?</h2>
    <p>{@html text.task.main}</p>
    <p>{@html text.task.gap}</p>

    <ol>
      {#each text.task.list as item}
        <li>{@html item}</li>
      {/each}
    </ol>

    <h2 id='s-tutorial'>Tutorial</h2>

    <h4 id='s-complete'>Overview</h4>

    <video class='wide-video' controls muted>
      <source src='/videos/tutorial-overview.mp4'>
      <track kind='captions'>
    </video>

    {#each text.video as item}
      <h4 id={`s-${item.video}`}>{item.header}</h4>

      <video autoplay loop playsinline muted class:wide-video={item.isWide}>
        <source src={`/videos/tutorial-${item.video}.mp4`}>
        <track kind='captions'>
      </video>

      <p>{@html item.text}</p>
    {/each}


    <!-- ![image](https://user-images.githubusercontent.com/15007159/147296366-aeaf84bb-ee06-451d-8fc2-9202f26a36fb.png) -->
  </div>


</div>