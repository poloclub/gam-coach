<script>
  import d3 from '../../utils/d3-import';
  import { onMount, onDestroy } from 'svelte';
  import { tooltipConfigStore } from '../../store';

  export let featuresStore = null;
  export let windowLoaded = false;

  // Component variables
  let component = null;
  let svg = null;
  let tooltipConfig = null;

  const unsubscribes = [];
  let initialized = false;

  const DURATION = 800;

  // Set up tooltip
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {
      console.log('store updated');
      tooltipConfig = value;
    })
  );

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

    <div class='coach-labels'>

      <div class='coach-label name'>
        Original
      </div>

      <div class='coach-label value'>
        Rejection
      </div>

      <div class='coach-label name'>
        Goal
      </div>

      <div class='coach-label value'>
        <select>
          <option>Approval</option>
          <option>Rejection</option>
        </select>
      </div>

      <!-- <div class='coach-label value coach-input'>
        <span>From</span>
        <input type='number' id='goal-from'>

        <span>To</span>
        <input type='number' id='goal-to'>
      </div> -->

      <div class='coach-label name'>
        Current
      </div>

      <div class='coach-label value'>
        Approval
      </div>

    </div>

    <div class='coach-bar'>
      <svg class='coach-bar-svg'></svg>
    </div>

  </div>

  <div class='coach-nav-bar'>
  </div>

</div>