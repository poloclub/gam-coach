<script>
  // @ts-check
  import '../../typedef';
  import { onMount, onDestroy } from 'svelte';
  import { tooltipConfigStore } from '../../store';
  import { ScorePanel } from './ScorePanel';

  export let scoreWidth = 0;
  export let plan = null;

  const unsubscribes = [];
  const inRange = true;
  let mounted = false;

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

  /** @type {ScorePanel}*/
  let scorePanel = null;

  const initScorePanel = () => {
    scorePanel = new ScorePanel(component, scoreWidth, plan);
    scorePanel.initSVG();
  };

  onMount(() => {
    mounted = true;
  });

  onDestroy(() => {
    unsubscribes.forEach((unsub) => unsub());
  });

  $: mounted && scoreWidth > 0 && initScorePanel();
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

  <span class='decision' class:regression={plan.isRegression}>
    {#if plan.isRegression}
      {plan.score}
    {:else}
      {plan.classes[plan.score]}
    {/if}
  </span>

</div>

<style lang="scss">
  @import './ScorePanel.scss';
</style>
