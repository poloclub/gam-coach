<script>
  //@ts-check
  import d3 from '../../utils/d3-import';
  import { onMount, onDestroy } from 'svelte';
  import { tooltipConfigStore } from '../../store';

  import ScorePanel from '../score-panel/ScorePanel.svelte';

  import refreshIcon from '../../img/icon-refresh2.svg';
  import starIconSolid from '../../img/icon-star-solid.svg';
  import starIconOutline from '../../img/icon-star-outline.svg';

  export let featuresStore = null;
  export let windowLoaded = false;

  // Component variables
  let component = null;
  let svg = null;
  let tooltipConfig = null;
  let scorePanelWidth = 0;

  const unsubscribes = [];
  let initialized = false;

  // Set up the model goal labels
  const isRegression = true;
  const regressionName = 'interest rate';
  const classes = ['loan approval', 'loan rejection'];
  const classTarget = [0];

  let tabInputLabel = 'Strategies to get ';
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  if (isRegression && vowels.includes(regressionName.substring(0, 1))) {
    tabInputLabel = tabInputLabel.concat('an');
  } else if (!isRegression && vowels.includes(classes[0].substring(0, 1))) {
    tabInputLabel = tabInputLabel.concat('an');
  } else {
    tabInputLabel = tabInputLabel.concat('a');
  }

  // Set up the plans
  let nextPlanIndex = 1;
  let savedPlanIndex = new Set();
  const plans = [];
  for (let i = 0; i < 5; i++) {
    plans.push({
      name: `Plan ${nextPlanIndex}`,
      planIndex: nextPlanIndex,
      isRegression: isRegression,
      score: isRegression ? 12.23 : classTarget,
      classes: isRegression ? null : classes
    });
    nextPlanIndex ++;
  }
  const curPlans = plans.slice();
  let activePlanIndex = 1;

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
    if (e.propertyName === 'flex-grow' && planIndex === activePlanIndex) {
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
    // First hide all the scores on tab
    d3.select(component)
      .selectAll('.tab-score')
      .classed('shown', false);

    activePlanIndex = planIndex;
  };

  onMount(() => {
    // Pass
    // initPanel();
    bindInlineSVG(component);

    // Show the score for the first tab
    const tab = d3.select(component)
      .select(`.tab-${activePlanIndex}`);

    tab.select('.tab-score')
      .classed('shown', true);

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

    plans.forEach(p => {
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

    // Set all score bars to have the same width
    d3.select(component)
      .selectAll('.score-bar-wrapper')
      .style('width', `${scorePanelWidth}px`);

    // Compute the text width and pass it to all score panels
    const tempText = d3.select(component)
      .select('.score-panel')
      .append('span')
      .classed('decision', true)
      .classed('regression', isRegression)
      .style('visibility', 'hidden')
      .text(isRegression ?
        plans[0].score :
        classes[classTarget]
      );
    const textWidth = tempText.node().getBoundingClientRect().width;
    tempText.remove();
    plans.forEach(p => {
      p.textWidth = textWidth;
    });

    console.log(scorePanelWidth);
  });

  onDestroy(() => {
    unsubscribes.forEach(unsub => unsub());
  });

  // $: windowLoaded && features.length !== 0 && !initialized && initList();

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

    <div class='tab-input'>
      <span>{tabInputLabel}</span>

      {#if isRegression}
        <span class='tab-keyword'>{regressionName}</span>
        <span>from</span>
        <input type='number' step='any' id='goal-from'>

        <span>to</span>
        <input type='number' step='any' id='goal-to'>
      {:else}
        <div class='select'>
          <select>
            {#each classes as c, i}
              {#if classTarget.includes(i)}
                <option value={i}>{c}</option>
              {/if}
            {/each}
          </select>
        </div>
      {/if}

    </div>

    <div class='tabs'>

      {#each curPlans as plan}
        <div class={`tab tab-${plan.planIndex}`} class:selected={plan.planIndex === activePlanIndex}
          on:click={(e) => tabClicked(e, plan.planIndex)}
          on:transitionend={(e) => tabTransitionEndHandler(e, plan.planIndex)}
          title='Generated plan to achieve your desired outcome'
        >

          <span class='tab-name' data-text={plan.name}>{plan.name}</span>

          <div class='star-wrapper'
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

          <div class='tab-score'>
            <div class='score-bar-wrapper'>
              <ScorePanel plan={plan}
                scoreWidth={scorePanelWidth}
              />
            </div>
          </div>

        </div>
      {/each}

    </div>

  </div>

</div>