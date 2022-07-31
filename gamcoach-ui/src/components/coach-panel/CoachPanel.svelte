<script>
  //@ts-check
  import d3 from '../../utils/d3-import';
  import { Logger } from '../../utils/logger';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
  import {
    tooltipConfigStore,
    confirmModalConfigStore,
    bookmarkConfigStore,
    inputFormConfigStore
  } from '../../store';

  import ScorePanel from '../score-panel/ScorePanel.svelte';
  import '../../typedef';
  import { Plan, SavedPlan } from '../coach/Coach';
  import { setScorePanelWidth, InitPlanLabels } from './CoachPanel';

  import refreshIcon from '../../img/icon-refresh2.svg';
  import starIconSolid from '../../img/icon-star-solid.svg';
  import starIconOutline from '../../img/icon-star-outline.svg';

  export let windowLoaded = false;
  /** @type {Logger} */
  export let logger = null;

  /** @type {Plans} */
  export let plans = null;

  // Component variables
  let component = null;
  let tooltipConfig = null;
  let scorePanelWidth = 0;

  const unsubscribes = [];
  let initialized = false;
  const NUM_TOTAL_PAN = 5;
  const dispatch = createEventDispatcher();

  // Set up the model goal labels
  let planLabels = [];
  let tabInputLabel = 'Strategies to get a';
  let savedPlanIndex = new Set();

  /** @type {Map<number, Plan>} */
  const localPlans = new Map();

  // Set up tooltip
  unsubscribes.push(
    tooltipConfigStore.subscribe((value) => {
      tooltipConfig = value;
    })
  );

  // Set up the regenerate confirm modal
  if (localStorage.getItem('needRegenerateConfirm') === null) {
    localStorage.setItem('needRegenerateConfirm', 'true');
  }

  if (localStorage.getItem('needSaveConfirm') === null) {
    localStorage.setItem('needSaveConfirm', 'true');
  }

  let confirmModalConfig = null;
  unsubscribes.push(
    confirmModalConfigStore.subscribe((value) => {
      confirmModalConfig = value;
    })
  );

  // Set up the bookmark store
  /** @type{BookmarkConfig} */
  let bookmarkConfig = null;
  unsubscribes.push(
    bookmarkConfigStore.subscribe((value) => {
      bookmarkConfig = value;

      if (bookmarkConfig.action === 'addUnpicked') {
        bookmarkConfig.unpickedPlans = new Map();
        const localIndexes = [...localPlans.keys()];
        for (let j = 0; j < localIndexes.length; j++) {
          const i = localIndexes[j];
          if (!bookmarkConfig.plans.has(i)) {
            const curPlan = localPlans.get(i);
            const savedPlan = new SavedPlan(
              curPlan.planIndex,
              curPlan.ebmLocal,
              curPlan.curExample
            );
            bookmarkConfig.unpickedPlans.set(i, savedPlan);
          }

          if (bookmarkConfig.unpickedPlans.size >= 2) {
            break;
          }
        }
        bookmarkConfig.action = undefined;
        bookmarkConfigStore.set(bookmarkConfig);
      }

      if (bookmarkConfig.action === 'delete') {
        // Sync up the bookmarked plans
        savedPlanIndex.forEach((planIndex) => {
          if (!bookmarkConfig.plans.has(planIndex)) {
            savedPlanIndex.delete(planIndex);
            savedPlanIndex = savedPlanIndex;
          }
        });
        bookmarkConfig.action = undefined;
        bookmarkConfigStore.set(bookmarkConfig);
      }
    })
  );

  // Set up the input form store
  /** @type {InputFormConfig}*/
  let inputFormConfig = null;
  unsubscribes.push(
    inputFormConfigStore.subscribe((value) => {
      inputFormConfig = value;
    })
  );

  const starClicked = (e, plan) => {
    e.preventDefault();
    e.stopPropagation();

    // Test if the plan is a success
    if (e.currentTarget.classList.contains('disabled')) {
      return;
    }

    // Log the interaction
    const oldValue = Array.from(savedPlanIndex);

    // Check if users have already saved this plan
    if (savedPlanIndex.has(plan.planIndex)) {
      // Remove the plan from the bookmarks
      bookmarkConfig.plans.delete(plan.planIndex);
      bookmarkConfigStore.set(bookmarkConfig);
      savedPlanIndex.delete(plan.planIndex);
    } else {
      // Warn the users that they are saving adjusted plans
      const curPlan = localPlans.get(plan.planIndex);

      if (curPlan.isChangedByUser) {
        const needSaveConfirm = localStorage.getItem('needSaveConfirm');
        if (needSaveConfirm === 'true') {
          confirmModalConfig = {
            title: `Plan ${plan.planIndex} Has Been Modified`,
            show: true,
            confirmed: true,
            contextLines: [
              `Plan ${plan.planIndex} has been modified by you. Bookmarking this
               plan will <b> only save these new changes </b> instead of GAM
               Coach's initial suggested changes.`,
              `If you want to restore the initial changes, you can click the
               reset buttons in the extended feature cards.`
            ],
            confirmText: 'Save',
            cancelText: 'Cancel',
            doNotShowAgain: false,
            confirmCallback: (doNotShowAgain, confirmed) => {
              if (confirmed) {
                localStorage.setItem(
                  'needSaveConfirm',
                  doNotShowAgain ? 'false' : 'true'
                );
                // Save the new plan to the bookmark
                const savedPlan = new SavedPlan(
                  plan.planIndex,
                  curPlan.ebmLocal,
                  curPlan.curExample
                );
                bookmarkConfig.plans.set(plan.planIndex, savedPlan);
                bookmarkConfigStore.set(bookmarkConfig);

                // Save the plan to the local record
                savedPlanIndex.add(plan.planIndex);
                savedPlanIndex = savedPlanIndex;
              }
            }
          };
          confirmModalConfigStore.set(confirmModalConfig);
          return;
        }
      }

      // Save the new plan to the bookmark
      const savedPlan = new SavedPlan(
        plan.planIndex,
        curPlan.ebmLocal,
        curPlan.curExample
      );
      bookmarkConfig.plans.set(plan.planIndex, savedPlan);
      bookmarkConfigStore.set(bookmarkConfig);

      // Save the plan to the local record
      savedPlanIndex.add(plan.planIndex);
    }
    savedPlanIndex = savedPlanIndex;

    logger?.addLog({
      eventName: 'plan starred',
      elementName: 'star',
      valueName: 'savedPlanIndex',
      oldValue: oldValue,
      newValue: Array.from(savedPlanIndex)
    });
  };

  /**
   * Handler for the transitionend event on tab element
   * @param e {TransitionEvent} Transition event
   * @param planIndex {number} Plan index
   */
  const tabTransitionEndHandler = (e, planIndex) => {
    // Listen to the flex-grow event
    if (e.propertyName === 'flex-grow' && planIndex === plans.activePlanIndex) {
      d3.select(e.target).select('.tab-score').classed('shown', true);
    }
  };

  /**
   * Handler for the mouse click event on tab element
   * @param e {MouseEvent} Mouse event
   * @param planIndex {number} Plan index
   */
  const tabClicked = (e, planIndex) => {
    if (!plans.planStores.has(planIndex)) {
      return;
    }

    if (plans.activePlanIndex === planIndex) {
      return;
    }

    // Log the interaction
    logger?.addLog({
      eventName: `plan${planIndex} clicked`,
      elementName: 'tab'
    });

    // First hide all the scores on tab
    d3.select(component).selectAll('.tab-score').classed('shown', false);

    plans.activePlanIndex = planIndex;
  };

  /**
   * Initialize the tab panel. This function should only be called after the
   * plan data is passed from the parent component.
   */
  const initPlanPanel = async () => {
    initialized = true;

    const returnObj = InitPlanLabels(plans, tabInputLabel);
    tabInputLabel = returnObj.tabInputLabel;
    planLabels = returnObj.localPlanLabels;

    await tick();

    // Show the current active tab details
    const tab = d3.select(component).select(`.tab-${plans.activePlanIndex}`);

    tab.select('.tab-score').classed('shown', true);

    // Set up the width for score panels
    // Need to set a timeout here to wait for the tab transition animation
    setTimeout(() => {
      scorePanelWidth = setScorePanelWidth(component, plans, planLabels);
    }, 300);
  };

  /**
   * Handler when plan store is updated.
   * @param {Plan} value
   * @param {number} planIndex
   */
  const planStoreUpdated = (value, planIndex) => {
    localPlans.set(planIndex, value);

    // Set up the bookmark config features property
    if (bookmarkConfig.features === null) {
      bookmarkConfig.features = value.features;
      bookmarkConfig.plansInfo = plans;
      bookmarkConfigStore.set(bookmarkConfig);
    }

    // Set up the input form config features property
    if (inputFormConfig.features === null) {
      inputFormConfig.features = value.features;
      inputFormConfig.plansInfo = plans;
      inputFormConfigStore.set(inputFormConfig);
    }
  };

  /**
   * Handler when a new store is added to the plans object.
   */
  const planStoreAdded = () => {
    plans.planStores.forEach((planStore, planIndex) => {
      // Add this plan index to a local array and subscribe the store
      if (!localPlans.has(planIndex)) {
        unsubscribes.push(
          planStore.subscribe((value) => planStoreUpdated(value, planIndex))
        );

        console.log('Adding to local plan', planIndex);
      }
    });
  };

  /**
   * Handler for regenerate click event.
   */
  const regenerateClicked = () => {
    // Let users wait the current batch to finish or fail before starting the
    // next batch
    if (plans.failedPlans.size === 0 && localPlans.size !== 5) {
      alert(
        ''.concat(
          'Please wait until all pending plans are generated ',
          'before regenerating any new plans.'
        )
      );
      return;
    }

    // Show the confirm modal if it is the first time
    const needRegenerateConfirm = localStorage.getItem('needRegenerateConfirm');
    if (needRegenerateConfirm === 'true') {
      confirmModalConfig = {
        title: 'Regenerate Plans',
        show: true,
        confirmed: true,
        contextLines: [
          `After regenerating plans, you will <b>lose access</b> to all current
          unsaved plans.`,
          'Make sure to click the star icons to save plans you like.'
        ],
        confirmText: 'Regenerate',
        cancelText: 'Cancel',
        doNotShowAgain: false,
        confirmCallback: (doNotShowAgain, confirmed) => {
          if (confirmed) {
            localStorage.setItem(
              'needRegenerateConfirm',
              doNotShowAgain ? 'false' : 'true'
            );
            dispatchRegenerateClicked();
          }
        }
      };
      confirmModalConfigStore.set(confirmModalConfig);
    } else {
      dispatchRegenerateClicked();
    }
  };

  /**
   * Dispatch the regeneration click event to the parent.
   */
  const dispatchRegenerateClicked = () => {
    // Save two un-pinked plans for review during user study
    if (logger && plans.nextPlanIndex === 6) {
      bookmarkConfig.unpickedPlans = new Map();
      for (let i = 1; i < 6; i++) {
        if (!bookmarkConfig.plans.has(i)) {
          const curPlan = localPlans.get(i);
          const savedPlan = new SavedPlan(
            curPlan.planIndex,
            curPlan.ebmLocal,
            curPlan.curExample
          );
          bookmarkConfig.unpickedPlans.set(i, savedPlan);
        }

        if (bookmarkConfig.unpickedPlans.size >= 2) {
          break;
        }
      }
      bookmarkConfigStore.set(bookmarkConfig);
    }

    plans.activePlanIndex = plans.nextPlanIndex;

    // Make this component ready to be initialized again with new plans
    initialized = false;

    // Make this component listen to new stores
    plans.planStores.clear();
    localPlans.clear();

    dispatch('regenerateClicked');
  };

  /**
   * Toggle the bookmark panel
   */
  const bookmarkClicked = () => {
    // If the the bookmark is already shown, we hide it
    if (Date.now() - bookmarkConfig.focusOutTime < 200) {
      bookmarkConfig.show = false;
      bookmarkConfigStore.set(bookmarkConfig);
    } else {
      bookmarkConfig.show = true;
      bookmarkConfigStore.set(bookmarkConfig);

      // Log the interaction
      logger?.addLog({
        eventName: 'bookmark opened',
        elementName: 'bookmark'
      });
    }
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-refresh', svg: refreshIcon },
      { class: 'icon-star-solid', svg: starIconSolid },
      { class: 'icon-star-outline', svg: starIconOutline }
    ];
    bindInlineSVG(component, iconList);
  });

  onDestroy(() => {
    unsubscribes.forEach((unsub) => unsub());
  });

  $: windowLoaded && plans && !initialized && initPlanPanel();
  $: plans && localPlans.size !== NUM_TOTAL_PAN && planStoreAdded();
</script>

<div class="coach-panel" bind:this={component}>
  <div class="coach-header">
    <div class="coach-logo">
      <img src="PUBLIC_URL/logo.svg" alt="GAM Coach" draggable="false" />
      <!-- <span class='coach-name'>GAM Coach</span> -->
      <span class="coach-tagline">
        Personal coach to help you obtain desired AI decisions
      </span>
    </div>

    <div class="coach-controls">
      <div class="icon-wrapper" on:click={bookmarkClicked} title="Saved plans">
        <div class="svg-icon icon-star-outline" />
        <span class="icon-label">Bookmarks</span>
      </div>

      <div
        class="icon-wrapper"
        on:click={regenerateClicked}
        title="Generate new plans based on my configurations"
      >
        <div class="svg-icon icon-refresh" />
        <span class="icon-label">Regenerate</span>
      </div>
    </div>
  </div>

  <div class="coach-tab-bar">
    {#if plans !== null}
      <div class="tab-input">
        <span>{tabInputLabel}</span>

        {#if plans.isRegression}
          <span class="tab-keyword">{plans.regressionName}</span>
          <span>from</span>
          <input type="number" step="any" id="goal-from" />

          <span>to</span>
          <input type="number" step="any" id="goal-to" />
        {:else}
          <div class="select">
            <select>
              {#each plans.classes as c, i}
                {#if plans.classTarget.includes(i)}
                  <option value={i}>{c}</option>
                {/if}
              {/each}
            </select>
          </div>
        {/if}
      </div>

      <div class="tabs">
        {#each planLabels as planLabel}
          <div
            class={`tab tab-${planLabel.planIndex}`}
            class:selected={planLabel.planIndex === plans.activePlanIndex}
            class:regression={plans.isRegression}
            on:click={(e) => tabClicked(e, planLabel.planIndex)}
            on:transitionend={(e) =>
              tabTransitionEndHandler(e, planLabel.planIndex)}
          >
            <div
              class="loading-container"
              class:no-animation={plans.failedPlans.has(planLabel.planIndex)}
              class:no-display={plans.planStores.has(planLabel.planIndex)}
            >
              <div class="line" />
              <div class="line" />
              <div class="line" />
            </div>

            <span
              class="tab-name"
              class:hidden={!plans.planStores.has(planLabel.planIndex)}
              data-text={planLabel.name}>{planLabel.name}</span
            >

            <div
              class="star-wrapper"
              class:hidden={!plans.planStores.has(planLabel.planIndex)}
              on:click={(e) => starClicked(e, planLabel)}
              title="Click to save this plan"
            >
              <div
                class="svg-icon tab-icon"
                class:no-display={!savedPlanIndex.has(planLabel.planIndex)}
              >
                {@html starIconSolid}
              </div>
              <div
                class="svg-icon tab-icon"
                class:no-display={savedPlanIndex.has(planLabel.planIndex)}
              >
                {@html starIconOutline}
              </div>
            </div>

            <div
              class="tab-score"
              class:hidden={!plans.planStores.has(planLabel.planIndex)}
            >
              <div class="score-bar-wrapper">
                <ScorePanel
                  {planLabel}
                  isFailed={plans.failedPlans.has(planLabel.planIndex)}
                  planStore={plans.planStores.has(planLabel.planIndex)
                    ? plans.planStores.get(planLabel.planIndex)
                    : null}
                  scoreWidth={scorePanelWidth}
                  {logger}
                />
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  @import './CoachPanel.scss';
</style>
