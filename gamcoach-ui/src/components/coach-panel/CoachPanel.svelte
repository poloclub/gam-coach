<script>
  //@ts-check
  import d3 from '../../utils/d3-import';
  import { onMount, onDestroy, tick } from 'svelte';
  import { tooltipConfigStore } from '../../store';

  import ScorePanel from '../score-panel/ScorePanel.svelte';
  import '../../typedef';

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

  // Set up the model goal labels
  let planLabels = [];
  let tabInputLabel = 'Strategies to get a';
  let savedPlanIndex = new Set();

  // Set up tooltip
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {
      console.log('store updated');
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
    if (!plans.readyPlanIndexes.includes(planIndex)) {
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
    const tempText = d3.select(component)
      .select('.score-panel')
      .append('span')
      .classed('decision', true)
      .classed('regression', plans.isRegression)
      .style('visibility', 'hidden')
      .text(plans.isRegression ?
        plans.score :
        plans.classes[plans.classTarget[0]]
      );
    const textWidth = tempText.node().getBoundingClientRect().width;
    tempText.remove();
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
    for (let i = 0; i < 5; i++) {
      localPlanLabels.push({
        name: `Plan ${curIndex}`,
        planIndex: curIndex,
        isRegression: plans.isRegression,
        score: plans.isRegression ? plans.score : plans.classTarget,
        classes: plans.isRegression ? null : plans.classes
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

    console.log(plans);

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

  onMount(() => {
    bindInlineSVG(component);
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

  $: windowLoaded && plans && !initialized && initPlanPanel();

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
        title='Generate new plans based on my configurations'
      >
        <div class='svg-icon icon-refresh'></div>
        <span class='icon-label'>Regenerate</span>
      </div>

    </div>

    <!-- <div class='coach-bar'>
      <svg class='coach-bar-svg'></svg>
    </div> -->

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
        {#each planLabels as plan}
          <div class={`tab tab-${plan.planIndex}`}
            class:selected={plan.planIndex === plans.activePlanIndex}
            class:regression={plans.isRegression}
            on:click={(e) => tabClicked(e, plan.planIndex)}
            on:transitionend={(e) => tabTransitionEndHandler(e, plan.planIndex)}
            title='Generated plan to achieve your desired outcome'
          >

            <div class='loading-container'
              class:no-display={plans.readyPlanIndexes.includes(plan.planIndex)}
            >
              <div class='line'></div>
              <div class='line'></div>
              <div class='line'></div>
            </div>

            <span class='tab-name'
              class:hidden={!plans.readyPlanIndexes.includes(plan.planIndex)}
              data-text={plan.name}
            >{plan.name}</span>

            <div class='star-wrapper'
              class:hidden={!plans.readyPlanIndexes.includes(plan.planIndex)}
              on:click={e => starClicked(e, plan)}
              title='Click to save this plan'
            >
              <div class='svg-icon tab-icon icon-star-solid'
                class:no-display={!savedPlanIndex.has(plan.planIndex)}
              >
              </div>
              <div class='svg-icon tab-icon icon-star-outline'
                class:no-display={savedPlanIndex.has(plan.planIndex)}
              >
              </div>
            </div>

            <div class='tab-score'
              class:hidden={!plans.readyPlanIndexes.includes(plan.planIndex)}
            >
              <div class='score-bar-wrapper'>
                <ScorePanel plan={plan}
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