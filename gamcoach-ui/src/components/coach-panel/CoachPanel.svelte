<script>
  //@ts-check
  import d3 from '../../utils/d3-import';
  import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
  import { tooltipConfigStore } from '../../store';

  import ScorePanel from '../score-panel/ScorePanel.svelte';
  import '../../typedef';
  import { Plan } from '../../Coach';

  import refreshIcon from '../../img/icon-refresh2.svg';
  import starIconSolid from '../../img/icon-star-solid.svg';
  import starIconOutline from '../../img/icon-star-outline.svg';

  export let featuresStore = null;
  export let windowLoaded = false;

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
    tooltipConfigStore.subscribe(value => {
      tooltipConfig = value;
    })
  );

  const preProcessSVG = (svgString) => {
    return svgString.replaceAll('black', 'currentcolor')
      .replaceAll('fill:none', 'fill:currentcolor')
      .replaceAll('stroke:none', 'stroke:currentcolor');
  };

  /**
   * Dynamically bind SVG files as inline SVG strings in this component
   */
  export const bindInlineSVG = (component) => {
    const iconList = [
      { class: 'icon-refresh', svg: refreshIcon },
      { class: 'icon-star-solid', svg: starIconSolid },
      { class: 'icon-star-outline', svg: starIconOutline },
    ];

    iconList.forEach(d => {
      d3.select(component)
        .selectAll(`.svg-icon.${d.class}`)
        .each((_, i, g) => {
          const ele = d3.select(g[i]);
          let html = ele.html();
          html = html.concat(' ', preProcessSVG(d.svg));
          ele.html(html);
        });
    });
  };

  const starClicked = (e, plan) => {
    e.preventDefault();
    e.stopPropagation();

    // Add the clicked plan to the saved set
    if (savedPlanIndex.has(plan.planIndex)) {
      savedPlanIndex.delete(plan.planIndex);
    } else {
      savedPlanIndex.add(plan.planIndex);
    }
    savedPlanIndex = savedPlanIndex;
  };

  /**
   * Handler for the transitionend event on tab element
   * @param e {TransitionEvent} Transition event
   * @param planIndex {number} Plan index
   */
  const tabTransitionEndHandler = (e, planIndex) => {
    // Listen to the flex-grow event
    if (e.propertyName === 'flex-grow' && planIndex === plans.activePlanIndex) {
      d3.select(e.target)
        .select('.tab-score')
        .classed('shown', true);
    }
  };

  /**
   * Handler for the mouse click event on tab element
   * @param e {MouseEvent} Mouse event
   * @param planIndex {number} Plan index
   */
  const tabClicked = (e, planIndex)  => {
    if (!plans.planStores.has(planIndex)) {
      return;
    }
    // First hide all the scores on tab
    d3.select(component)
      .selectAll('.tab-score')
      .classed('shown', false);

    plans.activePlanIndex = planIndex;
  };

  /**
   * Figure out the max width that the score panel can take on the tabs
   */
  const setScorePanelWidth = () => {
    // Set a fixed width to the tabs element so that its children do not
    // overflow the container. We have to do that because the overflow is set
    // to visible for the tab appearance
    const tabs = d3.select(component)
      .select('.tabs');
    tabs.style('width', `${tabs.node().getBoundingClientRect().width}px`);

    const tab = tabs.select(`.tab-${plans.activePlanIndex}`);

    // Figure out the max width that the score panel can take
    // The way to do that is to use tab width - max plan text width - star width
    const paddingL = parseInt(getComputedStyle(tab.node())
      .getPropertyValue('padding-left'));
    const paddingR = parseInt(getComputedStyle(tab.node())
      .getPropertyValue('padding-right'));

    const tabWidth = tab.node().getBoundingClientRect().width -
      paddingL - paddingR;

    const star = tab.select('.star-wrapper');
    const starWidth = star.node().getBoundingClientRect().width;

    let maxNameWidth = 0;

    planLabels.forEach(p => {
      const curTab = d3.select(component)
        .select(`.tab-${p.planIndex}`);
      const nameWidth = curTab.select('.tab-name')
        .node()
        .getBoundingClientRect().width;
      if (nameWidth > maxNameWidth) {
        maxNameWidth = nameWidth;
      }
    });

    scorePanelWidth = Math.floor(tabWidth - maxNameWidth - starWidth) - 4;

    // Compute the text width and pass it to all score panels
    let textWidth = 0;
    // For regression, we set the width to the initial score width
    if (plans.isRegression) {
      const tempText = d3.select(component)
        .select('.score-panel')
        .append('span')
        .classed('decision', true)
        .classed('regression', true)
        .style('visibility', 'hidden')
        .text(plans.score);

      textWidth = tempText.node().getBoundingClientRect().width;
      tempText.remove();
    } else {
      // For classification, we iterate through all classes to find the max width
      const tempText = d3.select(component)
        .select('.score-panel')
        .append('span')
        .classed('decision', true)
        .style('visibility', 'hidden')
        .text(plans.classes[0]);

      textWidth = tempText.node().getBoundingClientRect().width;

      for (let i = 1; i < plans.classes.length; i ++) {
        tempText.text(plans.classes[i]);
        const newWidth = tempText.node().getBoundingClientRect().width;
        textWidth = Math.max(textWidth, newWidth);
      }

      tempText.remove();
    }

    planLabels.forEach(p => {
      p.textWidth = textWidth;
    });
  };

  /**
   * Update the plan labels with the new plan information
   */
  const InitPlanLabels = () => {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    if (plans.isRegression &&
      vowels.includes(plans.regressionName.substring(0, 1))) {
      tabInputLabel = tabInputLabel.replace(' a', ' an');
    } else if (!plans.isRegression &&
      vowels.includes(plans.classes[0].substring(0, 1))) {
      tabInputLabel = tabInputLabel.replace(' a', ' an');
    }

    // Set up the plans
    const localPlanLabels = [];
    let curIndex = plans.nextPlanIndex;

    let failTarget = null;
    if (!plans.isRegression) {
      for (let i = 0; i < plans.classes.length; i++) {
        if (i !== plans.classTarget[0]) {
          failTarget = i;
          break;
        }
      }
    }

    for (let i = 0; i < 5; i++) {
      localPlanLabels.push({
        name: `Plan ${curIndex}`,
        planIndex: curIndex,
        isRegression: plans.isRegression,
        score: plans.isRegression ? plans.score : plans.classTarget[0],
        classes: plans.isRegression ? null : plans.classes,
        failTarget: failTarget
      });
      curIndex ++;
    }

    return localPlanLabels;
  };

  /**
   * Initialize the tab panel. This function should only be called after the
   * plan data is passed from the parent component.
   */
  const initPlanPanel = async () => {
    initialized = true;

    planLabels = InitPlanLabels();
    await tick();

    // Show the current active tab details
    const tab = d3.select(component)
      .select(`.tab-${plans.activePlanIndex}`);

    tab.select('.tab-score')
      .classed('shown', true);

    // Set up the width for score panels
    setScorePanelWidth();
  };

  /**
   * Handler when plan store is updated.
   * @param {Plan} value
   * @param {number} planIndex
   */
  const planStoreUpdated = (value, planIndex) => {
    localPlans.set(planIndex, value);
  };

  /**
   * Handler when a new store is added to the plans object.
   */
  const planStoreAdded = () => {
    plans.planStores.forEach((planStore, planIndex) => {
      // Add this plan index to a local array and subscribe the store
      if (!localPlans.has(planIndex)) {

        unsubscribes.push(planStore.subscribe(
          value => planStoreUpdated(value, planIndex)
        ));

        console.log('Adding to local plan', planIndex);
      }
    });
  };

  /**
   * Dispatch the regeneration click event to the parent.
   */
  const regenerateClicked = () => {
    plans.activePlanIndex = plans.nextPlanIndex;
    initialized = false;
    dispatch('regenerateClicked');
  };

  onMount(() => {
    bindInlineSVG(component);
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

  $: windowLoaded && plans && !initialized && initPlanPanel();
  $: plans && localPlans.size !== NUM_TOTAL_PAN && planStoreAdded();

</script>

<style lang='scss'>
  @import './CoachPanel.scss';
</style>

<div class='coach-panel' bind:this={component}>

  <div class='coach-header'>

    <div class='coach-logo'>
      <img src='/logo.svg' alt='GAM Coach' draggable='false'>
      <!-- <span class='coach-name'>GAM Coach</span> -->
      <span class='coach-tagline'>
        Personal coach to help you obtain desired AI decisions
      </span>
    </div>

    <div class='coach-controls'>
      <div class='icon-wrapper'
        title='Saved plans'
      >
        <div class='svg-icon icon-star-outline'></div>
        <span class='icon-label'>Bookmarks</span>
      </div>

      <div class='icon-wrapper'
        on:click={regenerateClicked}
        title='Generate new plans based on my configurations'
      >
        <div class='svg-icon icon-refresh'></div>
        <span class='icon-label'>Regenerate</span>
      </div>

    </div>

  </div>

  <div class='coach-tab-bar'>

    {#if plans !== null}

      <div class='tab-input'>
        <span>{tabInputLabel}</span>

        {#if plans.isRegression}
          <span class='tab-keyword'>{plans.regressionName}</span>
          <span>from</span>
          <input type='number' step='any' id='goal-from'>

          <span>to</span>
          <input type='number' step='any' id='goal-to'>
        {:else}
          <div class='select'>
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

      <div class='tabs'>
        {#each planLabels as planLabel}
          <div class={`tab tab-${planLabel.planIndex}`}
            class:selected={planLabel.planIndex === plans.activePlanIndex}
            class:regression={plans.isRegression}
            on:click={(e) => tabClicked(e, planLabel.planIndex)}
            on:transitionend={(e) => tabTransitionEndHandler(e, planLabel.planIndex)}
          >

            <div class='loading-container'
              class:no-display={plans.planStores.has(planLabel.planIndex)}
            >
              <div class='line'></div>
              <div class='line'></div>
              <div class='line'></div>
            </div>

            <span class='tab-name'
              class:hidden={!plans.planStores.has(planLabel.planIndex)}
              data-text={planLabel.name}
            >{planLabel.name}</span>

            <div class='star-wrapper'
              class:hidden={!plans.planStores.has(planLabel.planIndex)}
              on:click={e => starClicked(e, planLabel)}
              title='Click to save this plan'
            >
              <div class='svg-icon tab-icon icon-star-solid'
                class:no-display={!savedPlanIndex.has(planLabel.planIndex)}
              >
                {@html starIconSolid}
              </div>
              <div class='svg-icon tab-icon icon-star-outline'
                class:no-display={savedPlanIndex.has(planLabel.planIndex)}
              >
                {@html starIconOutline}
              </div>
            </div>

            <div class='tab-score'
              class:hidden={!plans.planStores.has(planLabel.planIndex)}
            >
              <div class='score-bar-wrapper'>
                <ScorePanel planLabel={planLabel}
                  planStore={plans.planStores.has(planLabel.planIndex) ?
                    plans.planStores.get(planLabel.planIndex) : null
                  }
                  scoreWidth={scorePanelWidth}
                />
              </div>
            </div>

          </div>
        {/each}

      </div>

    {/if}

  </div>

</div>