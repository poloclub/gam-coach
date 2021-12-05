<script>
  // @ts-check
  import '../../typedef';
  import { onMount, onDestroy } from 'svelte';
  import { tooltipConfigStore } from '../../store';
  import { ScorePanel } from './ScorePanel';

  export let windowLoaded = false;

  const unsubscribes = [];
  const inRange = true;

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

  onMount(() => {
    // Init the svg
    scorePanel = new ScorePanel(component);
    scorePanel.initSVG();
  });

  onDestroy(() => {
    unsubscribes.forEach((unsub) => unsub());
  });

  // $: windowLoaded;
</script>

<div class="score-panel" bind:this={component}>
  <div class="decision">
    <span class="decision-result"
      class:in-range={inRange}
      title='Current decision'
    >
      {inRange ? 'loan approval' : 'loan rejection'}
    </span>
  </div>

  <svg class="score-svg" />
</div>

<style lang="scss">
  @import './ScorePanel.scss';
</style>
