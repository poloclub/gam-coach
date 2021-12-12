<script>
  // @ts-check
  import '../../typedef';
  import d3 from '../../utils/d3-import';
  import { onMount, onDestroy, tick } from 'svelte';
  import { tooltipConfigStore } from '../../store';
  import { ScorePanel } from './ScorePanel';

  export let scoreWidth = 0;
  export let planLabel = null;
  export let planStore = null;

  const unsubscribes = [];
  let isInRange = true;
  let initialized = false;
  let mounted = false;
  let plan = null;

  // Set up tooltip
  let tooltipConfig = null;
  unsubscribes.push(
    tooltipConfigStore.subscribe((value) => {
      tooltipConfig = value;
    })
  );

  // Component variables
  /** @type {HTMLElement}*/
  let component = null;

  /** @type {HTMLElement}*/
  let decision = null;

  /** @type {ScorePanel}*/
  let scorePanel = null;

  /**
   * @param {boolean} newValue
   */
  const updateInRange = (newValue) => {
    isInRange = newValue;
  };

  const initScorePanel = async () => {
    initialized = true;

    // Subscribe the plan store
    unsubscribes.push(
      planStore.subscribe(value => {
        plan = value;
      })
    );

    await tick();

    scorePanel = new ScorePanel(component, scoreWidth, planLabel, planStore,
      tooltipConfigStore, updateInRange);

    d3.select(decision).style('width', `${planLabel.textWidth}px`);

    scorePanel.initSVG();
  };

  onMount(() => {
    mounted = true;
  });

  onDestroy(() => {
    unsubscribes.forEach((unsub) => unsub());
    scorePanel.destroy();
  });

  $: mounted && !initialized && scoreWidth > 0 && planStore && initScorePanel();
</script>

<div class="score-panel" bind:this={component}>
  <!-- <div class="decision">
    <span class="decision-result"
      class:in-range={inRange}
      title='Current decision'
    >
      {inRange ? 'loan approval' : 'loan rejection'}
    </span>
  </div> -->

  <svg class="score-svg" width="10" height="10"/>

  {#if plan}
    <span class='decision'
      class:regression={planLabel.isRegression}
      class:isInRange={isInRange}
      bind:this={decision}
    >
      {#if planLabel.isRegression}
        {planLabel.score}
      {:else}
        {#if isInRange}
          {planLabel.classes[planLabel.score]}
        {:else}
          {planLabel.classes[planLabel.failTarget]}
        {/if}
      {/if}
    </span>
  {/if}

</div>

<style lang="scss">
  @import './ScorePanel.scss';
</style>
