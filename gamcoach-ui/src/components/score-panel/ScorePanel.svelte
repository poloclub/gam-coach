<script>
  // @ts-check
  import '../../typedef';
  import d3 from '../../utils/d3-import';
  import { Logger } from '../../utils/logger';
  import { onMount, onDestroy, tick } from 'svelte';
  import { tooltipConfigStore } from '../../store';
  import { ScorePanel } from './ScorePanel';

  export let scoreWidth = 0;
  export let planLabel = null;
  export let planStore = null;
  export let isFailed = false;

  /** @type {Logger} */
  export let logger = null;

  const unsubscribes = [];
  let isInRange = false;
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

    if (isInRange !== newValue) {
      /** @type {HTMLElement} */
      let parentNode = d3.select(component).node();
      while (!parentNode.classList.contains('tab') && parentNode !== null) {
        parentNode = parentNode.parentElement;
      }
      d3.select(parentNode)
        .select('.star-wrapper')
        .classed('disabled', !newValue)
        .attr('title', newValue ?
          'Click to save this plan' :
          'You can only save plans that give you desired outcomes'
        );
    }

    isInRange = newValue;
  };

  const initScorePanel = async () => {
    initialized = true;
    isInRange = !isFailed;

    // Subscribe the plan store
    unsubscribes.push(
      planStore.subscribe(value => {
        plan = value;
      })
    );

    await tick();

    scorePanel = new ScorePanel(component, scoreWidth, planLabel, planStore,
      tooltipConfigStore, updateInRange, logger);

    d3.select(decision).style('width', `${planLabel.textWidth}px`);

    scorePanel.initSVG();
  };

  /**
   * Reset the component when the planLabels is updated
   */
  const planLabelUpdated = () => {
    scorePanel?.destroy();
    initialized = false;
  };

  onMount(() => {
    mounted = true;
  });

  onDestroy(() => {
    unsubscribes.forEach((unsub) => unsub());
    scorePanel?.destroy();
  });

  $: mounted && !initialized && scoreWidth > 0 && planLabel.textWidth > 0 &&
    planStore && initScorePanel();
  $: planLabel && planLabelUpdated();
</script>

<div class="score-panel" bind:this={component}>

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
