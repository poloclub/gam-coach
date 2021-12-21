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
  import { Logger } from '../../utils/logger';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { fade, fly } from 'svelte/transition';
  import { tooltipConfigStore, inputFormConfigStore } from '../../store';

  import pointArrowSVG from '../../img/point-arrow.svg';
  import iconRefreshSVG from '../../img/icon-refresh3.svg';
  import iconEditSVG from '../../img/icon-edit.svg';

  const unsubscribes = [];
  let windowLoaded = false;

  const indexFormatter = d3.format('03d');

  let curIndex = 6;
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
        inputFormConfig.action = null;
        updated = true;
        curExample = inputFormConfig.curExample;
        inputFormConfigStore.set(inputFormConfig);
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

  <div class='top'>

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
        <div class='button'>Submit</div>
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
    <BookmarkPanel windowLoaded={windowLoaded}/>
  </div>


</div>