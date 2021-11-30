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

  const isRegression = true;
  const regressionName = 'interest rate';
  const classes = ['loan approval'];

  let classesPairs = [];
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

  const initPanel = () => {
    // Set the SVG width and height to fit its container
    const coachBar = d3.select(component).select('.coach-bar');
    svg = coachBar.select('svg');

    const bbox = coachBar.node().getBoundingClientRect();
    console.log(bbox);
    svg.style('width', `${bbox.width}px`);
    svg.style('height', `${bbox.height}px`);
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

  <div class='coach-content'>

    <div class='coach-logo'>
      GAM Coach
    </div>

    <div class='coach-bar'>
      <svg class='coach-bar-svg'></svg>
    </div>

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

      <div class='tab'>
        <span class='tab-name' data-text={'Plan 1'}>Plan 1</span>
        <div class='svg-icon tab-icon icon-star-outline'></div>
      </div>


      <div class='tab'>
        <span class='tab-name' data-text={'Plan 2'}>Plan 2</span>
        <div class='svg-icon tab-icon icon-star-outline'></div>
      </div>


      <div class='tab selected'>
        <span class='tab-name' data-text={'Plan 3'}>Plan 3</span>
        <div class='svg-icon tab-icon icon-star-outline'></div>
      </div>


      <div class='tab'>
        <span class='tab-name' data-text={'Plan 4'}>Plan 4</span>
        <div class='svg-icon tab-icon icon-star-outline'></div>
      </div>


      <div class='tab'>
        <span class='tab-name' data-text={'Plan 5'}>Plan 5</span>
        <div class='svg-icon tab-icon icon-star-outline'></div>
      </div>

    </div>

    <div class='nav-controls'>
      <div class='svg-icon rect-icon icon-star-solid'></div>
      <div class='svg-icon rect-icon icon-refresh'></div>
    </div>
  </div>

</div>