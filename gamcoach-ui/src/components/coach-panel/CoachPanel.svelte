<script>
  import d3 from '../../utils/d3-import';
  import { onMount, onDestroy } from 'svelte';
  import { tooltipConfigStore } from '../../store';

  import refreshIcon from '../../img/icon-refresh2.svg';
  import starIconSolid from '../../img/icon-star-solid.svg';
  import starIconOutline from '../../img/icon-star-outline.svg';

  export let featuresStore = null;
  export let windowLoaded = false;

  // Component variables
  let component = null;
  let svg = null;
  let tooltipConfig = null;

  const unsubscribes = [];
  let initialized = false;

  // Set up the model goal labels
  const isRegression = false;
  const regressionName = 'interest rate';
  const classes = ['loan approval'];

  const classesPairs = [];
  classes.forEach((d, i) => {
    classesPairs.push({
      name: d,
      value: i
    });
  });

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
      planIndex: nextPlanIndex
    });
    nextPlanIndex ++;
  }
  const curPlans = plans.slice();
  let activePlanIndex = 0;

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

    console.log(starIconSolid);

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

  const initPanel = () => {
    // Set the SVG width and height to fit its container
    const coachBar = d3.select(component).select('.coach-bar');
    svg = coachBar.select('svg');

    const bbox = coachBar.node().getBoundingClientRect();
    console.log(bbox);
    svg.style('width', `${bbox.width}px`);
    svg.style('height', `${bbox.height}px`);
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

  onMount(() => {
    // Pass
    // initPanel();
    bindInlineSVG(component);
  });

  onDestroy(() => {
    unsubscribes(unsub => unsub());
  });

  // $: windowLoaded && features.length !== 0 && !initialized && initList();

</script>

<style lang='scss'>
  @import './CoachPanel.scss';
</style>

<div class='coach-panel' bind:this={component}>

  <div class='coach-header'>

    <div class='coach-logo'>
      <span class='coach-name'>
        GAM Coach
      </span>
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
            {#each classesPairs as classesPair}
              <option value={classesPair.value}>{classesPair.name}</option>
            {/each}
          </select>
        </div>
      {/if}

    </div>

    <div class='tabs'>

      {#each curPlans as plan, i}
        <div class='tab' class:selected={i === activePlanIndex}
          on:click={() => {activePlanIndex = i;}}
          title='Generated plan to achieve your desired outcome'
        >
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

          <span class='tab-name' data-text={plan.name}>{plan.name}</span>
        </div>
      {/each}

    </div>

  </div>

</div>