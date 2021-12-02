<script>
  // @ts-check
  import '../../typedef';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { tooltipConfigStore } from '../../store';
  import { ScorePanel } from './ScorePanel';

  export let windowLoaded = false;

  const unsubscribes = [];

  // Set up tooltip
  let tooltipConfig = null;
  unsubscribes.push(
    tooltipConfigStore.subscribe(value => {tooltipConfig = value;})
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
    unsubscribes.forEach(unsub => unsub());
  });

  // $: windowLoaded;

</script>

<style lang='scss'>
  @import './ScorePanel.scss';
</style>

<div class='score-panel' bind:this={component}>

  <div class='decision'>

    <span class='decision-label'>
      Decision
    </span>

    <span class='decision-result'>
      loan approval
    </span>

  </div>

  <svg class='score-svg'></svg>

</div>